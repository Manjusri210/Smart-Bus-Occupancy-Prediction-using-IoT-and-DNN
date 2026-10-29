@echo off
title SmartBus AI Launcher
echo ======================================================================
echo           SmartBus AI - Intelligent Occupancy System
echo ======================================================================
echo.

:: Check for virtual environment
if not exist "venv\Scripts\python.exe" (
    echo [!] Python virtual environment not found. Creating venv with Python 3.11...
    py -3.11 -m venv venv
    if errorlevel 1 (
        echo [!] Failed to create venv. Please ensure Python 3.11 is installed.
        pause
        exit /b 1
    )
    echo [*] Installing backend dependencies...
    venv\Scripts\pip.exe install -r backend\requirements.txt
)

:: Check for frontend node_modules
if not exist "frontend\node_modules" (
    echo [*] Installing frontend packages...
    cd frontend
    call npm.cmd install
    cd ..
)

echo [*] Initializing database and verifying ML model status...
venv\Scripts\python.exe -c "from backend.app.database import init_db; init_db(); print('[+] Database initialized.')"

echo [*] Launching Python Flask Backend on http://127.0.0.1:5000 ...
start "SmartBus AI - Backend Server" cmd /k "venv\Scripts\python.exe backend\run.py"

echo [*] Launching React Vite Frontend on http://localhost:5173 ...
cd frontend
call npm.cmd run dev

pause
