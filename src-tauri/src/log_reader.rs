use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::{BufRead, BufReader, Read, Seek, SeekFrom};
use regex::Regex;
use notify::{Watcher, RecursiveMode, RecommendedWatcher, Config, EventKind};
use tauri::{Window, Emitter, Manager};
use std::sync::Mutex;
use encoding_rs::Encoding;

#[derive(Serialize, Deserialize, Clone)]
pub struct LogLine {
    pub index: usize,
    pub content: String,
    pub offset: u64,
}

#[derive(Serialize, Deserialize)]
pub struct LogChunk {
    pub lines: Vec<LogLine>,
    pub total_lines: usize,
    pub has_more: bool,
}

pub struct TailState(pub Mutex<Option<RecommendedWatcher>>);

fn detect_file_encoding(path: &str) -> Result<&'static Encoding, String> {
    let mut file = File::open(path).map_err(|e| e.to_string())?;
    let mut buf = vec![0u8; 8192];
    let n = file.read(&mut buf).map_err(|e| e.to_string())?;
    let mut det = chardetng::EncodingDetector::new();
    det.feed(&buf[..n], true);
    Ok(det.guess(None, true))
}

fn get_encoding(path: &str, enc_opt: Option<&str>) -> Result<&'static Encoding, String> {
    match enc_opt {
        Some("auto") | None => detect_file_encoding(path),
        Some(label) => {
            Ok(Encoding::for_label(label.as_bytes()).unwrap_or(encoding_rs::UTF_8))
        }
    }
}

pub fn read_page(path: &str, page: usize, page_size: usize, encoding: Option<&str>) -> Result<LogChunk, String> {
    let enc = get_encoding(path, encoding)?;
    let file = File::open(path).map_err(|e| e.to_string())?;
    let mut count_reader = BufReader::with_capacity(256 * 1024, file);
    
    // Count total lines using byte scanning
    let mut total_lines = 0;
    let mut dummy = Vec::new();
    while count_reader.read_until(b'\n', &mut dummy).map_err(|e| e.to_string())? > 0 {
        total_lines += 1;
        dummy.clear();
    }

    let file = File::open(path).map_err(|e| e.to_string())?;
    let mut reader = BufReader::with_capacity(256 * 1024, file);

    let mut lines = Vec::new();
    let mut current_line = 0;
    let start_line = page * page_size;
    let end_line = (page + 1) * page_size;
    let mut current_offset = 0;
    
    let mut byte_buf = Vec::new();
    while reader.read_until(b'\n', &mut byte_buf).map_err(|e| e.to_string())? > 0 {
        if current_line >= start_line && current_line < end_line {
            // Drop \r\n or \n for correct content display
            let mut slice = byte_buf.as_slice();
            if slice.ends_with(b"\n") { slice = &slice[..slice.len() - 1]; }
            if slice.ends_with(b"\r") { slice = &slice[..slice.len() - 1]; }
            
            let (cow, _, _) = enc.decode(slice);
            
            lines.push(LogLine {
                index: current_line,
                content: cow.into_owned(),
                offset: current_offset,
            });
        }
        current_offset += byte_buf.len() as u64;
        current_line += 1;
        byte_buf.clear();
        
        if current_line >= end_line {
            break;
        }
    }

    Ok(LogChunk {
        lines,
        total_lines,
        has_more: current_line < total_lines,
    })
}

pub fn filter_log(path: &str, pattern: &str, max_results: usize, encoding: Option<&str>) -> Result<Vec<LogLine>, String> {
    let enc = get_encoding(path, encoding)?;
    let file = File::open(path).map_err(|e| e.to_string())?;
    let mut reader = BufReader::new(file);
    let re = Regex::new(pattern).map_err(|e| e.to_string())?;

    let mut results = Vec::new();
    let mut current_offset = 0;
    let mut current_line = 0;
    
    let mut byte_buf = Vec::new();
    while reader.read_until(b'\n', &mut byte_buf).map_err(|e| e.to_string())? > 0 {
        let mut slice = byte_buf.as_slice();
        if slice.ends_with(b"\n") { slice = &slice[..slice.len() - 1]; }
        if slice.ends_with(b"\r") { slice = &slice[..slice.len() - 1]; }
        
        let (cow, _, _) = enc.decode(slice);
        let content = cow.into_owned();
        let line_len = byte_buf.len() as u64;

        if re.is_match(&content) {
            results.push(LogLine {
                index: current_line,
                content,
                offset: current_offset,
            });
            if results.len() >= max_results {
                break;
            }
        }
        
        current_offset += line_len;
        current_line += 1;
        byte_buf.clear();
    }

    Ok(results)
}

pub fn tail_log(path: String, window: Window, encoding: Option<String>) -> Result<(), String> {
    let state = window.state::<TailState>();
    let mut watcher_lock = state.0.lock().map_err(|_| "Failed to lock watcher state")?;
    
    *watcher_lock = None;

    let path_clone = path.clone();
    let window_clone = window.clone();
    
    let enc = get_encoding(&path, encoding.as_deref())?;
    let file = File::open(&path).map_err(|e| e.to_string())?;
    let mut read_offset = file.metadata().map_err(|e| e.to_string())?.len();

    let (tx, rx) = std::sync::mpsc::channel();
    let mut watcher = RecommendedWatcher::new(tx, Config::default()).map_err(|e| e.to_string())?;
    watcher.watch(std::path::Path::new(&path), RecursiveMode::NonRecursive).map_err(|e| e.to_string())?;

    std::thread::spawn(move || {
        for res in rx {
            match res {
                Ok(event) => {
                    if let EventKind::Modify(_) = event.kind {
                        if let Ok(mut file) = File::open(&path_clone) {
                            if let Ok(_) = file.seek(SeekFrom::Start(read_offset)) {
                                let mut reader = BufReader::new(file);
                                let mut new_lines = Vec::new();
                                let mut temp_offset = read_offset;
                                
                                let mut byte_buf = Vec::new();
                                while let Ok(n) = reader.read_until(b'\n', &mut byte_buf) {
                                    if n == 0 { break; }
                                    
                                    let mut slice = byte_buf.as_slice();
                                    if slice.ends_with(b"\n") { slice = &slice[..slice.len() - 1]; }
                                    if slice.ends_with(b"\r") { slice = &slice[..slice.len() - 1]; }
                                    
                                    let (cow, _, _) = enc.decode(slice);
                                    
                                    new_lines.push(LogLine {
                                        index: 0,
                                        content: cow.into_owned(),
                                        offset: temp_offset,
                                    });
                                    
                                    temp_offset += n as u64;
                                    byte_buf.clear();
                                }
                                
                                if !new_lines.is_empty() {
                                    read_offset = temp_offset;
                                    let _ = window_clone.emit("log:new-lines", &new_lines);
                                }
                            }
                        }
                    }
                }
                Err(e) => eprintln!("watch error: {:?}", e),
            }
        }
    });

    *watcher_lock = Some(watcher);
    Ok(())
}

pub fn stop_tail(window: Window) -> Result<(), String> {
    let state = window.state::<TailState>();
    let mut watcher_lock = state.0.lock().map_err(|_| "Failed to lock watcher state")?;
    *watcher_lock = None;
    Ok(())
}
