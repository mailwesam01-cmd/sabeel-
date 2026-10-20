@echo off
title Sabeel Web Dashboard
echo ========================================================
echo   Starting Sabeel Web Dashboard...
echo   URL: http://localhost:4200
echo ========================================================
cd /d "%~dp0apps\dashboard"
call npm start
pause
