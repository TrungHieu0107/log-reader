use serde::Serialize;
use std::fs::File;
use std::io::{Read, Seek, SeekFrom};
use encoding_rs::*;
use chardetng::{EncodingDetector, Iso2022JpDetection, Utf8Detection};

const MAX_FILE_SIZE: u64 = 100 * 1024 * 1024; // 100MB

#[derive(Serialize)]
pub struct FileReadResponse {
    content: Option<String>,
    is_binary: bool,
    detected_encoding: Option<String>,
    error: Option<String>,
}

fn is_binary(bytes: &[u8]) -> bool {
    // UTF-16 BOM check — not binary
    if bytes.starts_with(&[0xFF, 0xFE]) || bytes.starts_with(&[0xFE, 0xFF]) {
        return false;
    }
    // Check first 8KB for null bytes
    let check_len = bytes.len().min(8192);
    bytes[..check_len].contains(&0)
}

#[tauri::command]
pub fn read_file_encoded(path: String, encoding: String) -> Result<FileReadResponse, String> {
    // 1.1 Path Normalization (Win11 fix)
    // Handle both `\\?\` prefix and standard absolute paths
    let clean_path = path
        .trim_start_matches(r"\\?\")
        .replace('\\', "/");

    // 1.4 Large File Guard
    let metadata = match std::fs::metadata(&clean_path) {
        Ok(m) => m,
        Err(e) => return Ok(FileReadResponse {
            content: None,
            is_binary: false,
            detected_encoding: None,
            error: Some(format!("Could not access file: {}", e)),
        }),
    };

    if metadata.len() > MAX_FILE_SIZE {
        return Ok(FileReadResponse {
            content: None,
            is_binary: false,
            detected_encoding: None,
            error: Some(format!(
                "File too large ({:.1} MB). Maximum supported size is 100 MB.",
                metadata.len() as f64 / 1_048_576.0
            )),
        });
    }

    let mut file = match File::open(&clean_path) {
        Ok(f) => f,
        Err(e) => return Ok(FileReadResponse {
            content: None,
            is_binary: false,
            detected_encoding: None,
            error: Some(format!("Failed to open file: {}", e)),
        }),
    };

    let mut buffer = [0; 8192];
    let bytes_read = match file.read(&mut buffer) {
        Ok(n) => n,
        Err(e) => return Ok(FileReadResponse {
            content: None,
            is_binary: false,
            detected_encoding: None,
            error: Some(e.to_string()),
        }),
    };

    // 1.3 Binary Detection Improvement
    if is_binary(&buffer[..bytes_read]) {
        return Ok(FileReadResponse {
            content: None,
            is_binary: true,
            detected_encoding: None,
            error: None,
        });
    }

    if let Err(e) = file.seek(SeekFrom::Start(0)) {
        return Ok(FileReadResponse {
            content: None,
            is_binary: false,
            detected_encoding: None,
            error: Some(e.to_string()),
        });
    }

    let mut all_bytes = Vec::new();
    if let Err(e) = file.read_to_end(&mut all_bytes) {
        return Ok(FileReadResponse {
            content: None,
            is_binary: false,
            detected_encoding: None,
            error: Some(e.to_string()),
        });
    }

    // 1.2 Encoding Aliases
    let (encoder, detected_name): (&'static Encoding, Option<String>) = if encoding == "Auto" {
        let mut detector = EncodingDetector::new(Iso2022JpDetection::Allow);
        detector.feed(&buffer[..bytes_read], bytes_read < 8192);
        let top_encoding = detector.guess(None, Utf8Detection::Allow);
        (top_encoding, Some(top_encoding.name().to_string()))
    } else {
        let enc = match encoding.to_uppercase().as_str() {
            "UTF-8" | "UTF8" => UTF_8,
            "SHIFT_JIS" | "SHIFT-JIS" | "SJIS" | "MS932" | "CP932" | "WINDOWS-31J" => SHIFT_JIS,
            "EUC-JP" | "EUCJP" => EUC_JP,
            "UTF-16LE" | "UTF16LE" => UTF_16LE,
            "UTF-16BE" | "UTF16BE" => UTF_16BE,
            "WINDOWS-1252" | "CP1252" => WINDOWS_1252,
            _ => return Ok(FileReadResponse {
                content: None,
                is_binary: false,
                detected_encoding: None,
                error: Some(format!("Unsupported encoding: {}", encoding)),
            })
        };
        (enc, None)
    };

    let (cow, _, _) = encoder.decode(&all_bytes);
    let decoded_string = cow.into_owned();

    Ok(FileReadResponse {
        content: Some(decoded_string),
        is_binary: false,
        detected_encoding: detected_name,
        error: None,
    })
}
#[tauri::command]
pub fn clear_file_content(path: String) -> Result<(), String> {
    let clean_path = path
        .trim_start_matches(r"\\?\")
        .replace('\\', "/");

    match std::fs::write(&clean_path, "") {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("Failed to clear file {}: {}", clean_path, e)),
    }
}
