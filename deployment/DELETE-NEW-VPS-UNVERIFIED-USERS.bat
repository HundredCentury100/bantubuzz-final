@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "VPS_HOST=13.140.159.150"
set "VPS_USER=root"
set "SCRIPT_DIR=%~dp0"
set "ROOT_DIR=%SCRIPT_DIR%.."
set "REPORT_DIR=%ROOT_DIR%\deployment\vps\reports"
set "REMOTE_SCRIPT=/tmp/delete_unverified_users.py"

for /f %%I in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "STAMP=%%I"
set "REPORT=%REPORT_DIR%\delete-unverified-users-%VPS_HOST%-%STAMP%.txt"

if not exist "%REPORT_DIR%" mkdir "%REPORT_DIR%" >nul 2>&1

echo ============================================================
echo BantuBuzz Unverified User Cleanup
echo ============================================================
echo.
echo Target: %VPS_USER%@%VPS_HOST%
echo.
echo This tool will:
echo   - Upload a cleanup script to the new VPS
echo   - Show a DRY RUN count and sample of unverified creator/brand users
echo   - Delete only if you type DELETE after reviewing the preview
echo.
echo It will NOT delete admins or already verified users.
echo Report: %REPORT%
echo.
pause

(
  echo ============================================================
  echo BantuBuzz Unverified User Cleanup
  echo ============================================================
  echo Target: %VPS_USER%@%VPS_HOST%
  echo Started: %DATE% %TIME%
  echo.
) > "%REPORT%"

echo [1/4] Uploading cleanup script...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %VPS_HOST%
echo ============================================================
scp "%ROOT_DIR%\deployment\vps\delete_unverified_users.py" "%VPS_USER%@%VPS_HOST%:%REMOTE_SCRIPT%" >> "%REPORT%" 2>&1
if errorlevel 1 goto fail

echo [2/4] Running dry run preview...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %VPS_HOST%
echo ============================================================
ssh "%VPS_USER%@%VPS_HOST%" "cd /var/www/bantubuzz/backend && source venv/bin/activate && python %REMOTE_SCRIPT% --sample 30" >> "%REPORT%" 2>&1
if errorlevel 1 goto fail

echo.
echo Dry run completed. Opening the report so you can review the exact counts/sample.
notepad "%REPORT%"
echo.
set /p "CONFIRM=Type DELETE to permanently delete all unverified creator/brand users shown by the dry run, or press Enter to cancel: "
if /I not "%CONFIRM%"=="DELETE" (
  echo Cleanup cancelled by user. >> "%REPORT%"
  echo.
  echo Cancelled. No users were deleted.
  pause
  exit /b 0
)

echo [3/4] Deleting unverified users...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %VPS_HOST%
echo ============================================================
ssh "%VPS_USER%@%VPS_HOST%" "cd /var/www/bantubuzz/backend && source venv/bin/activate && python %REMOTE_SCRIPT% --execute" >> "%REPORT%" 2>&1
if errorlevel 1 goto fail

echo [4/4] Final dry run verification...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %VPS_HOST%
echo ============================================================
ssh "%VPS_USER%@%VPS_HOST%" "cd /var/www/bantubuzz/backend && source venv/bin/activate && python %REMOTE_SCRIPT% --sample 10" >> "%REPORT%" 2>&1
if errorlevel 1 goto fail

echo.
echo ============================================================
echo Unverified user cleanup completed
echo ============================================================
echo.
echo Report:
echo %REPORT%
echo.
pause
exit /b 0

:fail
echo.
echo ============================================================
echo Unverified user cleanup failed
echo ============================================================
echo.
echo Review:
echo %REPORT%
echo.
pause
exit /b 1
