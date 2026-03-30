use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::{BufRead, BufReader, Seek, SeekFrom};
use regex::Regex;
use notify::{Watcher, RecursiveMode, RecommendedWatcher, Config, EventKind};
use tauri::{Window, Emitter, Manager};
use std::sync::Mutex;

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

pub fn read_page(path: &str, page: usize, page_size: usize) -> Result<LogChunk, String> {
    let file = File::open(path).map_err(|e| e.to_string())?;
    let mut reader = BufReader::with_capacity(256 * 1024, file);

    let mut lines = Vec::new();
    let mut current_line = 0;
    let start_line = page * page_size;
    let end_line = (page + 1) * page_size;
    let mut current_offset = 0;

    // First pass to count total lines (we could optimize this by storing indices, but requirement says read on demand)
    // Actually, we can do it in one pass if we are careful or just re-read for pagination
    // For large files, counting total lines every time might be slow.
    // Let's count them once or just return a large number if not known.
    // User requirement: "Return total line count and has_more flag"
    
    // Count lines first
    let total_lines = BufReader::new(File::open(path).map_err(|e| e.to_string())?)
        .lines()
        .count();

    // Reset reader for actual reading
    reader.seek(SeekFrom::Start(0)).map_err(|e| e.to_string())?;
    
    let mut line_buf = String::new();
    while reader.read_line(&mut line_buf).map_err(|e| e.to_string())? > 0 {
        if current_line >= start_line && current_line < end_line {
            lines.push(LogLine {
                index: current_line,
                content: line_buf.trim_end().to_string(),
                offset: current_offset,
            });
        }
        current_offset += line_buf.len() as u64;
        current_line += 1;
        line_buf.clear();
        
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

pub fn filter_log(path: &str, pattern: &str, max_results: usize) -> Result<Vec<LogLine>, String> {
    let file = File::open(path).map_err(|e| e.to_string())?;
    let reader = BufReader::new(file);
    let re = Regex::new(pattern).map_err(|e| e.to_string())?;

    let mut results = Vec::new();
    let mut current_offset = 0;
    
    for (index, line_result) in reader.lines().enumerate() {
        let line = line_result.map_err(|e| e.to_string())?;
        let line_len = line.len() as u64 + 1; // +1 for newline
        if re.is_match(&line) {
            results.push(LogLine {
                index,
                content: line,
                offset: current_offset,
            });
        }
        current_offset += line_len;
        if results.len() >= max_results {
            break;
        }
    }

    Ok(results)
}

pub fn tail_log(path: String, window: Window) -> Result<(), String> {
    let state = window.state::<TailState>();
    let mut watcher_lock = state.0.lock().map_err(|_| "Failed to lock watcher state")?;
    
    // Stop any existing watcher
    *watcher_lock = None;

    let path_clone = path.clone();
    let window_clone = window.clone();
    
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
                                let reader = BufReader::new(file);
                                let mut new_lines = Vec::new();
                                let mut temp_offset = read_offset;
                                
                                for line_res in reader.lines() {
                                    if let Ok(line) = line_res {
                                        let line_len = line.len() as u64 + 1;
                                        new_lines.push(LogLine {
                                            index: 0, // In tail mode, index might not be strictly accurate without full scan
                                            content: line,
                                            offset: temp_offset,
                                        });
                                        temp_offset += line_len;
                                    }
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
