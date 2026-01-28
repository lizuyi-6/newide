@echo off
setlocal
echo ====================================================
echo      LogicCore Architect - Automated Builder
echo ====================================================

:: 1. Navigate to script directory (Project Root)
cd /d "%~dp0"
echo [1/5] Working Directory: %CD%

:: 2. Load Visual Studio 2022 Environment explicitly
echo [2/5] Loading VS 2022 C++ Environment...
call "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat"
if %errorlevel% neq 0 (
    echo [ERROR] Failed to load VS 2022 environment.
    echo Please make sure Visual Studio 2022 Community is installed.
    pause
    exit /b %errorlevel%
)

:: 3. Set Node.js Version
echo [3/5] Setting Node.js version...
call nvm use 22.21.1

:: 4. Clean Install (Optional safety step)
echo [4/5] Cleaning previous dependencies...
if exist node_modules (
    echo Removing old node_modules...
    rmdir /s /q node_modules
)
if exist package-lock.json (
    del package-lock.json
)

:: 5. Install and Build
echo [5/5] Installing dependencies and starting build...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] npm install failed.
    pause
    exit /b %errorlevel%
)

echo.
echo ====================================================
echo Build setup complete. Starting Watch Mode...
echo Keep this window open.
echo ====================================================
echo.
call npm run watch
pause
