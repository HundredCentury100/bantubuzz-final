@echo off
echo ========================================
echo Starting BantuBuzz Backend Server
echo ========================================
echo.

REM Check if virtual environment exists
if not exist "venv\Scripts\activate.bat" (
    echo ERROR: Virtual environment not found!
    echo Please run install.bat first
    echo.
    pause
    exit /b 1
)

REM Activate virtual environment
call venv\Scripts\activate

REM Set Flask app
set FLASK_APP=run.py

echo Starting server on http://localhost:5000
echo Press Ctrl+C to stop the server
echo.

REM Run the application
python run.py
