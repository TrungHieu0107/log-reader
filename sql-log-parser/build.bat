@echo off
echo ========================================
echo  Log Reader - One Click Build
echo ========================================

echo [CHECK] Rust...
rustc --version >nul 2>&1
if %errorlevel% neq 0 ( echo ERROR: Install Rust from https://rustup.rs & pause & exit /b 1 )

echo [CHECK] Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 ( echo ERROR: Install Node.js from https://nodejs.org & pause & exit /b 1 )

echo [1/2] npm install...
call npm install
if %errorlevel% neq 0 ( echo ERROR: npm install failed & pause & exit /b 1 )

echo [2/2] tauri build...
call npm run tauri build
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Build failed. Common causes:
    echo   - MSVC Build Tools missing: install "Desktop development with C++"
    echo   - WebView2 missing: https://developer.microsoft.com/en-us/microsoft-edge/webview2/
    echo   - Wrong Rust target: rustup target add x86_64-pc-windows-msvc
    pause & exit /b 1
)

echo.
echo BUILD COMPLETE
echo Output: src-tauri\target\release\bundle\nsis\
start "" "src-tauri\target\release\bundle\nsis\"
pause
