@echo off
echo ==========================================
echo HMX FPV Tours - Firebase Backend Starter
echo ==========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    exit /b 1
)

REM Navigate to backend directory
cd /d "%~dp0backend"

REM Check if virtual environment exists, if not create it
if not exist .venv (
    echo Creating virtual environment...
    python -m venv .venv
)

REM Activate virtual environment
call .venv\Scripts\activate.bat

REM Install requirements if needed
echo Installing dependencies...
pip install -q -r requirements-firebase.txt

REM Check if .env file exists
if not exist .env (
    echo.
    echo WARNING: .env file not found!
    echo Copy .env.firebase.example to .env and configure your Firebase credentials.
    echo Running in MOCK MODE with demo data...
    echo.
)

REM Start the Flask server
echo Starting Firebase backend server on http://localhost:5001
python firebase_app.py
