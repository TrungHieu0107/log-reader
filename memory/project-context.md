# Project Context

## App Name
SQL Log Parser

## Stack
- Runtime: Tauri 2
- Backend: Rust (stable, x86_64-pc-windows-msvc)
- Frontend: React 18 + TypeScript + Vite
- Styling: TailwindCSS (v4)

## Project Root
`d:\linh_ta_linh_tinh\log-reader\sql-log-parser`

## Key Dependencies
| encoding_rs (Rust) | 0.8.x | Reading multi-encoding text |
| chardetng (Rust) | 1.0.0 | Auto-detect File Encoding (Iso2022JpDetect::Allow) |
| @tauri-apps/plugin-store | 2.x | Native JSON KV persistence |
| web-worker | native | Background Log Parsing |


## Architecture Overview
```
React UI
  ├── Sidebar — File list, clear all
  ├── Toolbar — Open, Refresh, Encoding, Filter, Sort
  ├── Logs Table — Paginated direct rendering (Max 1000 items)
  ├── StatusBar — Active file, Encoding info
  └── Modals — AliasModal, FilterModal, SqlFormatterModal, SettingsModal, PathModal


Rust Backend (Tauri commands)
  └── read_file_encoded(path, encoding) → Result<FileReadResponse, String>

Shared Zustand Stores
  ├── useSqlLogStore — Persistent files list (`sql_log_files.json`)
  └── useConfigStore — App settings (`config_settings.json`), Auto encoding


Shared Types
  ├── LogEntry { logIndex, timestamp, type, rawLine, reconstructedSql, daoName }
  └── DaoSession { daoName, logs:[] }
```

## File Structure
```
sql-log-parser/
├── src-tauri/
│   ├── src/
│   │   ├── main.rs
│   │   ├── lib.rs
│   │   └── file_reader.rs  — multi-encoding IO logic
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── components/
│   │   ├── StatusBar.tsx
│   │   └── configStore.ts
│   └── features/
│       └── sql-log-parser/
│           ├── index.ts
│           ├── SqlLogParser.tsx
│           ├── store.ts
│           ├── parser.ts
│           ├── parser.worker.ts — Background parsing logic
│           ├── FilterModal.tsx
│           ├── AliasModal.tsx
│           ├── SqlFormatterModal.tsx
│           ├── SettingsModal.tsx
│           └── PathModal.tsx

├── package.json
└── build.bat
```