@echo off
echo ====================================================
echo Starting ISHDAMAN Client Web-App (React + Vite)
echo Port: 3000
echo ====================================================
cd /d "%~dp0"
npm run dev -- --port 3000 --host
pause
