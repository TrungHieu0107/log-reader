mod log_reader;

use log_reader::{LogChunk, LogLine, TailState, read_page, filter_log, tail_log, stop_tail};
use tauri::Window;
use std::sync::Mutex;

#[tauri::command]
fn cmd_read_page(path: String, page: usize, page_size: usize) -> Result<LogChunk, String> {
    read_page(&path, page, page_size)
}

#[tauri::command]
fn cmd_filter_log(path: String, pattern: String, max_results: usize) -> Result<Vec<LogLine>, String> {
    filter_log(&path, &pattern, max_results)
}

#[tauri::command]
fn cmd_start_tail(path: String, window: Window) -> Result<(), String> {
    tail_log(path, window)
}

#[tauri::command]
fn cmd_stop_tail(window: Window) -> Result<(), String> {
    stop_tail(window)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .manage(TailState(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![
            cmd_read_page,
            cmd_filter_log,
            cmd_start_tail,
            cmd_stop_tail
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
