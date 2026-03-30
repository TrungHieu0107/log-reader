# Project Context

## App Name
Log Reader

## Stack
- Runtime: Tauri 2
- Backend: Rust (stable, x86_64-pc-windows-msvc)
- Frontend: React 18 + TypeScript + Vite
- Styling: CSS modules hoặc inline styles (chưa quyết định)

## Project Root
`D:/projects/log-reader/` ← cập nhật đường dẫn thực tế

## Key Dependencies
| Package | Version | Purpose |
|---|---|---|
| tauri | 2.x | Desktop shell |
| @tauri-apps/api | 2.x | Frontend ↔ Rust bridge |
| @tauri-apps/plugin-dialog | 2.x | Native file open dialog |
| @tauri-apps/plugin-clipboard-manager | 2.x | Clipboard support |
| @tanstack/react-virtual | 3.x | Virtual scroll for log lines |
| notify (Rust) | 6.x | File watcher for tail mode |
| regex (Rust) | 1.x | Log line filtering |
| encoding_rs (Rust) | 0.8.x | Đọc file mã hóa Text đa ngôn ngữ |
| chardetng (Rust) | 0.1.x | Auto-detect File Encoding |

## Architecture Overview
```
React UI
  ├── FilterBar — file open, search input, tail toggle
  ├── LogViewer — virtualized list (@tanstack/react-virtual v3)
  └── StatusBar — line count, page, tail indicator

Rust Backend (Tauri commands)
  ├── cmd_read_page(path, page, page_size) → LogChunk
  ├── cmd_filter_log(path, pattern, max_results) → Vec<LogLine>
  ├── cmd_start_tail(path, window) → ()  [emits "log:new-lines"]
  └── cmd_stop_tail(state) → ()

Shared Structs
  ├── LogLine { index, content, offset }
  └── LogChunk { lines, total_lines, has_more }
```

## File Structure
```
log-reader/
├── src-tauri/
│   ├── src/
│   │   ├── main.rs        — entry point only
│   │   ├── lib.rs         — tauri builder + command registration
│   │   └── log_reader.rs  — all file I/O logic
│   ├── .cargo/
│   │   └── config.toml    — isolated target-dir configuration
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── types.ts
│   └── components/
│       ├── LogViewer.tsx
│       ├── FilterBar.tsx
│       └── StatusBar.tsx
├── index.html
├── vite.config.ts
├── package.json
├── build.bat
└── memory/               ← memory folder này
```