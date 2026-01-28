@echo off
setlocal
echo ====================================================
echo      LogicCore Architect - Localization Setup
echo ====================================================

cd /d "%~dp0\.."
if not exist "extensions" mkdir "extensions"

echo [1/3] Downloading Chinese Language Pack...
powershell -Command "Invoke-WebRequest -Uri 'https://marketplace.visualstudio.com/_apis/public/gallery/publishers/MS-CEINTL/vsextensions/vscode-language-pack-zh-hans/1.96.2/vspackage' -OutFile 'langpack.zip'"

echo [2/3] Extracting Language Pack...
if exist "extensions\vscode-language-pack-zh-hans" rmdir /s /q "extensions\vscode-language-pack-zh-hans"
powershell -Command "Expand-Archive -Path 'langpack.zip' -DestinationPath 'temp_lang'"
move "temp_lang\extension" "extensions\vscode-language-pack-zh-hans"

echo [3/3] Cleaning up...
del "langpack.zip"
rmdir /s /q "temp_lang"

echo.
echo Localization pack installed successfully.
pause
