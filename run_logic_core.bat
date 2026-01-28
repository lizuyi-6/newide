@echo off
setlocal

echo [LogicCore] Stopping any running instances...
taskkill /F /IM electron.exe /T 2>nul
taskkill /F /IM "LogicCore Architect.exe" /T 2>nul
taskkill /F /IM code-oss.exe /T 2>nul

echo.
echo [LogicCore] Compiling main process...
call npm run compile

echo.
echo [LogicCore] Launching LogicCore Architect...
call .\scripts\code.bat --locale=zh-cn

endlocal
