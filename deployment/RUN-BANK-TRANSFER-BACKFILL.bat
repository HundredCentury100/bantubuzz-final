@echo off
setlocal EnableExtensions

set "ROOT=D:\Bantubuzz Platform"
set "SERVER_USER=root"
set "SERVER_HOST=173.212.245.22"
set "REMOTE_ROOT=/var/www/bantubuzz"

cls
echo ========================================
echo   BantuBuzz Bank Transfer Backfill
echo ========================================
echo.
echo This uploads the fixed backfill script and runs only that script.
echo You will be asked for the SSH password for scp and ssh.
echo.
echo Press Ctrl+C to cancel, or any key to continue.
pause >nul

echo.
echo [1/2] Uploading fixed backfill script...
scp "%ROOT%\backend\scripts\backfill_verified_bank_transfer_collaborations.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/scripts/backfill_verified_bank_transfer_collaborations.py
if errorlevel 1 goto fail

echo.
echo [2/2] Running backfill on production...
ssh %SERVER_USER%@%SERVER_HOST% "cd %REMOTE_ROOT%/backend && source venv/bin/activate && python scripts/backfill_verified_bank_transfer_collaborations.py"
if errorlevel 1 goto fail

echo.
echo ========================================
echo   Backfill finished
echo ========================================
pause
exit /b 0

:fail
echo.
echo ========================================
echo   Backfill stopped because a step failed
echo ========================================
pause
exit /b 1
