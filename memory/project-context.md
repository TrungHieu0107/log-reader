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
| Package | Version | Purpose |
|---|---|---|
| tauri | 2.x | Desktop shell |
| @tauri-apps/api | 2.x | Frontend ↔ Rust bridge |
| @tauri-apps/plugin-dialog | 2.x | Native file open dialog |
| @tauri-apps/plugin-store | 2.x | Zustand persistence |
| zustand | 5.x | App state management |
| @monaco-editor/react | 4.x | SQL syntax highlighting editor |
| @tanstack/react-virtual | 3.x | Virtual scroll for log lines |
| sql-formatter | 15.x | SQL formatting |
| lucide-react | 0.x | Icon set |
| encoding_rs (Rust) | 0.8.x | Đọc file mã hóa Text đa ngôn ngữ |
| chardetng (Rust) | 0.1.x | Auto-detect File Encoding |

## Architecture Overview
```
React UI
  ├── Sidebar — File list, clear all
  ├── Toolbar — Open, Refresh, Encoding, Filter, Sort
  ├── Logs Table — Virtualized representation of SQL Logs
  ├── StatusBar — Active file, Encoding info
  └── Modals — AliasModal, FilterModal, SqlFormatterModal

Rust Backend (Tauri commands)
  └── read_file_encoded(path, encoding) → Result<FileReadResponse, String>

Shared Zustand Stores
  ├── useSqlLogStore — Persistent files, parsing, filtering state
  └── useConfigStore — Global app state (encoding)

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
│           ├── FilterModal.tsx
│           ├── AliasModal.tsx
│           └── SqlFormatterModal.tsx
├── package.json
└── build.bat
```