@echo off
echo ========================================
echo BantuBuzz Platform - Edit Environment
echo ========================================
echo.
echo This script will open an SSH session to edit environment files
echo.
echo Available files to edit:
echo 1. Backend .env
echo 2. Messaging Service .env
echo 3. Frontend .env.production
echo 4. Exit
echo.
set /p choice="Enter your choice (1-4): "

if "%choice%"=="1" (
    echo.
    echo Opening backend .env file...
    echo.
    ssh root@173.212.245.22 "nano /var/www/bantubuzz/backend/.env"
) else if "%choice%"=="2" (
    echo.
    echo Opening messaging service .env file...
    echo.
    ssh root@173.212.245.22 "nano /var/www/bantubuzz/messaging-service/.env"
) else if "%choice%"=="3" (
    echo.
    echo Opening frontend .env.production file...
    echo.
    ssh root@173.212.245.22 "nano /var/www/bantubuzz/frontend/.env.production"
) else if "%choice%"=="4" (
    echo Exiting...
    exit /b
) else (
    echo Invalid choice!
    pause
    exit /b
)

echo.
echo.
echo File updated successfully!
echo.
echo IMPORTANT: After editing environment files, you need to:
echo 1. Rebuild frontend if you changed frontend .env: cd /var/www/bantubuzz/frontend && npm run build
echo 2. Restart services: Run 07-restart-services.bat
echo.
pause
