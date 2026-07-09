@echo off
title KHANGCAT - Cai dat email
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup-mail.ps1"
echo.
echo Nhan phim bat ky de dong cua so.
pause >nul
