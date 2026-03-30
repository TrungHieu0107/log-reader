@echo off
echo ========================================
echo  Log Reader - One Click Build
echo ========================================
echo.

echo [1/3] Installing frontend dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: npm install failed
    pause
    exit /b 1
)

echo [2/3] Building Tauri app...
call npm run tauri build
if %errorlevel% neq 0 (
    echo ERROR: Tauri build failed
    pause
    exit /b 1
)

echo [3/3] Done!
echo.
echo Output location:
echo   C:\Users\Administrator\appdata\local\temp\log-reader-target\release\bundle\nsis\
echo   C:\Users\Administrator\appdata\local\temp\log-reader-target\release\bundle\msi\
echo.
pause
