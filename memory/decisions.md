
# Decisions & Rationale

## Format
Mỗi decision ghi theo format:
```
### [DATE] — DECISION TITLE
- **Decision**: Chọn gì
- **Reason**: Tại sao
- **Alternatives considered**: Đã xem xét gì khác
- **Status**: Active | Superseded by [link]
```

---

### [2026-03-30] — Dùng BufReader thay vì load toàn bộ file
- **Decision**: Đọc log file bằng `BufReader::with_capacity(256 * 1024)`, không dùng `fs::read_to_string()`
- **Reason**: Hỗ trợ file lên đến 1GB mà không OOM
- **Alternatives considered**: `read_to_string` (nhanh hơn cho file nhỏ nhưng không scale)
- **Status**: Active

### [2026-03-30] — Tail đọc từ end-of-file
- **Decision**: Khi start tail, `read_offset` bắt đầu từ `file.metadata().len()`, không phải 0
- **Reason**: Chỉ hiển thị dòng mới, không replay toàn bộ file cũ
- **Alternatives considered**: Đọc từ đầu (không phù hợp với live tail UX)
- **Status**: Active

### [2026-03-30] — Watcher lưu trong Tauri managed state
- **Decision**: `RecommendedWatcher` được bọc trong `Mutex<Option<>>` và đăng ký vào Tauri state
- **Reason**: Cần stoppable — drop watcher = stop watching. Tauri state sống suốt app lifecycle
- **Alternatives considered**: Global static (unsafe), thread channel (phức tạp hơn)
- **Status**: Active

### [2026-03-30] — Virtual scroll bắt buộc với @tanstack/react-virtual v3
- **Decision**: Dùng `useVirtualizer` từ `@tanstack/react-virtual` v3, không render raw list
- **Reason**: Log file có thể có 100k+ dòng — render toàn bộ sẽ freeze UI
- **Alternatives considered**: `react-window` (ít maintained hơn), `react-virtuoso` (overhead lớn hơn)
- **Status**: Active

### [2026-03-30] — Cấu hình thư mục build (target) hoàn toàn tách biệt
- **Decision**: Cập nhật file `src-tauri/.cargo/config.toml` set `target-dir = "C:/Users/Administrator/appdata/local/temp/log-reader-target"` (Đường dẫn tuyệt đối bên ngoài).
- **Reason**: Khắc phục dứt điểm `os error 32` (file being used by another process). Nếu dùng đường dẫn tương đối để di chuyển thư mục build nhưng thư mục đó vẫn nằm *trong* workspace, các tiến trình ngầm (Windows Defender, Indexer) vẫn tiếp tục quét và khóa file. Đưa lên `%TEMP%` đã giải quyết hoàn toàn.
- **Alternatives considered**: Thêm thư mục vào Exclude list của Antivirus.
- **Status**: Active

### [2026-03-30] — Cấu hình plugin trong tauri.conf.json
- **Decision**: Không khai báo các plugin không cần config (như `dialog`, `clipboard-manager`) thành `{}` trong phần `plugins` của `tauri.conf.json`.
- **Reason**: Tránh lỗi hoảng sợ (panic) của Tauri v2: `Error deserializing 'plugins.dialog'... expected unit`. Plugin được khởi tạo bằng code Rust trong `lib.rs` là đủ.
- **Alternatives considered**: Thêm giá trị `null` hoặc xoá. Xoá khỏi file json là cách sạch và an toàn nhất.
- **Status**: Active

### [2026-03-30] — Phân quyền Plugin (Capabilities)
- **Decision**: Tạo file `src-tauri/capabilities/default.json` chứa cấu hình quy định các quyền `dialog:default`, `clipboard-manager:default`.
- **Reason**: Trong Tauri v2, tất cả API gọi từ frontend (như `dialog.open`) sẽ bị khoá mặc định vì lý do bảo mật. Cần phải cấp quyền tường minh thông qua file capabilities, nếu không sẽ không có phản hồi khi click các chức năng này.
- **Alternatives considered**: None, đây là chuẩn bắt buộc của Tauri v2.
- **Status**: Active

### [2026-03-30] — Đọc file với Custom Encoding & Auto-Detect
- **Decision**: Sử dụng `encoding_rs` phối hợp `chardetng` để Auto-Detect và thay thế `reader.read_line()` bằng `reader.read_until(b'\n')`.
- **Reason**: Đọc file theo dạng byte thô rồi mới giải mã, giúp App xem được các file log cổ (như tiếng Nhật Shift-JIS, tiếng Việt Windows-1258).
- **Alternatives considered**: Chỉ nhận UTF-8 và bỏ qua các lỗi kí tự (không giải quyết triệt để).
- **Status**: Active

---
<!-- Antigravity: append new decisions below this line -->

### [2026-03-31] — Major Refactor & Performance Optimization
- **Decision**: Implemented `@tanstack/react-virtual` v3 for SQL Table, refactored logic into `useSqlLogs` and `useFileOpen` hooks.
- **Reason**: To handle 10k+ queries at 60 FPS and improve code maintainability for Win11 compatibility.
- **Alternatives considered**: Pagination only (not enough for UX), monlithic component (too complex).
- **Status**: Active

### [2026-03-31] — Backend Guardrails (100MB limit)
- **Decision**: Added `MAX_FILE_SIZE = 100MB` in `file_reader.rs`.
- **Reason**: Prevent the app from hanging or crashing when accidentally opening huge non-relavant files (e.g., binaries).
- **Alternatives considered**: 500MB (too much for frontend string parsing).
- **Status**: Active

### [2026-03-31] — UI State Persistence
- **Decision**: Persist `sidebarWidth`, `isSidebarOpen`, and `sortOrder` to `localStorage`.
- **Reason**: Standard desktop app UX — users expect their layout to be remembered.
- **Alternatives considered**: Tauri Store (overhead for simple UI bits).
- **Status**: Active

### [2026-03-31] — Advanced Filtering (Regex & Time Range)
- **Decision**: Added `isRegex` for Query types and a dedicated `time_range` filter type using dual `input type="time"`.
- **Reason**: Users need flexible pattern matching (Regex) and precise time-slice analysis (Time Range) for deep troubleshooting.
- **Alternatives considered**: Backend-only regex (too slow for real-time validation), manual time string entry (error-prone).
- **Status**: Active

### [2026-03-31] — Three-Pass Orphan Detection
- **Decision**: Updated `parser.ts` to implement a "third pass" that marks params-only logs without SQL as `orphan_params`.
- **Reason**: Identifies incomplete log captures or log rotations, which are critical for debugging missing queries.
- **Alternatives considered**: Discard orphans (hides data), merge with 'sql' type (misleading).
- **Status**: Active

### [2026-03-31] — Client-Side Regex Validation
- **Decision**: Added real-time `new RegExp()` validation in `FilterModal.tsx`.
- **Reason**: Prevents application crashes and provides immediate feedback if the user types an invalid regex pattern.
- **Alternatives considered**: Only validating on 'Add' (worse UX).
- **Status**: Active