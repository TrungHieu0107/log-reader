use serde::Serialize;
use std::fs::File;
use std::io::{Read, Seek, SeekFrom};
use encoding_rs::*;

#[derive(Serialize)]
pub struct FileReadResponse {
    content: Option<String>,
    is_binary: bool,
    error: Option<String>,
}

#[tauri::command]
pub fn read_file_encoded(path: String, encoding: String) -> Result<FileReadResponse, String> {
    let mut file = match File::open(&path) {
        Ok(f) => f,
        Err(e) => return Ok(FileReadResponse {
            content: None,
            is_binary: false,
            error: Some(e.to_string()),
        }),
    };

    let mut buffer = [0; 8192];
    let bytes_read = match file.read(&mut buffer) {
        Ok(n) => n,
        Err(e) => return Ok(FileReadResponse {
            content: None,
            is_binary: false,
            error: Some(e.to_string()),
        }),
    };

    if buffer[..bytes_read].contains(&0) {
        return Ok(FileReadResponse {
            content: None,
            is_binary: true,
            error: None,
        });
    }

    if let Err(e) = file.seek(SeekFrom::Start(0)) {
        return Ok(FileReadResponse {
            content: None,
            is_binary: false,
            error: Some(e.to_string()),
        });
    }

    let mut all_bytes = Vec::new();
    if let Err(e) = file.read_to_end(&mut all_bytes) {
        return Ok(FileReadResponse {
            content: None,
            is_binary: false,
            error: Some(e.to_string()),
        });
    }

    let encoder = match encoding.as_str() {
        "Shift_JIS" | "SJIS" | "MS932" => SHIFT_JIS,
        "EUC-JP" => EUC_JP,
        "UTF-16LE" => UTF_16LE,
        "Windows-1252" => WINDOWS_1252,
        "UTF-8" => UTF_8,
        _ => return Ok(FileReadResponse {
            content: None,
            is_binary: false,
            error: Some(format!("Unknown encoding: {}", encoding)),
        })
    };

    let (cow, _, _) = encoder.decode(&all_bytes);
    let decoded_string = cow.into_owned();

    Ok(FileReadResponse {
        content: Some(decoded_string),
        is_binary: false,
        error: None,
    })
}
