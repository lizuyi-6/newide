@echo off
setlocal
echo ====================================================
echo      LogicCore Architect - Launcher
echo ====================================================

cd /d "%~dp0"
echo [1/2] Working Directory: %CD%

:: Ensure Electron environment is ready
echo [2/2] Launching LogicCore Architect...
call .\scripts\code.bat

echo.
if %errorlevel% neq 0 (
    echo [ERROR] LogicCore failed to start.
    echo Please make sure the build window (setup_and_build.bat) is still open and finished building.
    pause
)
