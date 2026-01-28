@echo off
setlocal

echo [LogicCore] STEP 1: Killing processes...
taskkill /F /IM electron.exe /T 2>nul
taskkill /F /IM "LogicCore Architect.exe" /T 2>nul
taskkill /F /IM code-oss.exe /T 2>nul
taskkill /F /IM node.exe /T 2>nul
:: Note: Killing node.exe might be aggressive if you have other node projects running,
:: but it ensures the build server is stopped.

echo.
echo [LogicCore] STEP 2: Cleaning output directory...
if exist "out" rmdir /s /q "out"
:: Deleting out directory forces a full recompilation of product.ts changes.

echo.
echo [LogicCore] STEP 3: Compiling (This checks everything)...
:: 'npm run compile' executes gulp compile
call npm run compile

echo.
echo [LogicCore] STEP 4: Launching...
call .\scripts\code.bat --locale=zh-cn

endlocal
