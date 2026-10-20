@echo off
title Sabeel Mobile App
echo ========================================================
echo   Cleaning any previous sessions...
echo ========================================================
taskkill /F /IM dart.exe >nul 2>&1
timeout /t 1 /nobreak >nul

echo ========================================================
echo   Starting Sabeel Mobile App on Chrome...
echo   Fixed URL: http://localhost:5000
echo ========================================================
cd /d "%~dp0apps\mobile"
call flutter run -d chrome --web-port=5000
pause
