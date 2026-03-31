# Personal Preferences & Coding Style

## Communication
- Ngôn ngữ: **Tiếng Việt** cho giải thích, **English** cho code và technical terms
- Độ dài response: ngắn gọn, đúng trọng tâm — không giải thích dài dòng khi không cần
- Format: dùng bảng và code block, hạn chế prose dài

## Code Style — Rust
- Không dùng `unwrap()` hoặc `expect()` trong production path — luôn dùng `?` hoặc `map_err`
- Không viết `unsafe` block
- Đặt tên hàm theo `snake_case`, struct theo `PascalCase`
- Tauri command tên dạng `cmd_` prefix (vd: `cmd_read_page`)
- Ưu tiên `BufReader` cho file I/O — không load toàn bộ vào memory

## Code Style — TypeScript/React
- Dùng functional components + hooks, không dùng class components
- Props interface đặt ngay trên component, không tách file riêng trừ khi share
- Tên invoke argument dùng `camelCase` (Tauri tự convert sang snake_case)
- Import Tauri API từ `@tauri-apps/api/core` (Tauri 2) — không dùng `@tauri-apps/api/tauri`
- Không dùng `any` type — luôn type rõ ràng

## Code Style — General
- Mỗi file chỉ làm một việc (single responsibility)
- Không commit dead code — xóa hẳn nếu không dùng
- Comment tiếng Anh, ngắn gọn, chỉ khi logic không tự giải thích được

## Project Preferences
- Build target: **Windows x64** là primary
- Output: ưu tiên NSIS installer (`.exe`) hơn MSI
- Không cần cross-platform (macOS/Linux) ở giai đoạn này
- Portable `.exe` (không cần install) là nice-to-have
- **Persistence**: Tất cả cấu hình (Encoding, Trim SQL, Chế độ xem) phải được lưu lại sau khi tắt app.
- **File Opening**: Hỗ trợ cả chọn file qua Dialog và nhập đường dẫn tuyệt đối (Manual Path).

## Tool Preferences
- IDE: đang dùng cả Eclipse (legacy Java) và VSCode/Cursor (new projects)
- Terminal: Windows CMD hoặc PowerShell — không dùng bash/zsh trên Windows
- Build script: `.bat` file, không dùng Makefile hay shell script

---
<!-- Antigravity: update this file nếu user thể hiện preference mới trong session -->