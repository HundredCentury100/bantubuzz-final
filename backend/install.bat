@echo off
echo ========================================
echo BantuBuzz Backend Installation
echo ========================================
echo.

echo [1/4] Creating virtual environment...
python -m venv venv
if %errorlevel% neq 0 (
    echo ERROR: Failed to create virtual environment
    pause
    exit /b 1
)
echo ✓ Virtual environment created
echo.

echo [2/4] Activating virtual environment...
call venv\Scripts\activate
echo ✓ Virtual environment activated
echo.

echo [3/4] Installing dependencies...
pip install --upgrade pip
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)
echo ✓ Dependencies installed
echo.

echo [4/4] Initializing database...
set FLASK_APP=run.py
flask db init
flask db migrate -m "Initial migration"
flask db upgrade
if %errorlevel% neq 0 (
    echo WARNING: Database migration had issues
    echo This is normal if migrations already exist
)
echo ✓ Database initialized
echo.

echo ========================================
echo Installation Complete!
echo ========================================
echo.
echo To start the backend server:
echo   1. Activate virtual environment: venv\Scripts\activate
echo   2. Run server: python run.py
echo.
echo Optional: Seed the database with test data
echo   flask seed_db
echo.
pause
