@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "VPS_HOST=13.140.159.150"
set "VPS_USER=root"
set "SCRIPT_DIR=%~dp0"
set "ROOT_DIR=%SCRIPT_DIR%.."
set "REPORT_DIR=%ROOT_DIR%\deployment\vps\reports"
set "REMOTE_SCRIPT=/tmp/delete_unverified_users.py"
set "REMOTE_PYTHON=cd /var/www/bantubuzz/backend && source venv/bin/activate && python %REMOTE_SCRIPT%"

for /f %%I in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "STAMP=%%I"
set "REPORT=%REPORT_DIR%\execute-delete-unverified-users-%VPS_HOST%-%STAMP%.txt"

if not exist "%REPORT_DIR%" mkdir "%REPORT_DIR%" >nul 2>&1

echo ============================================================
echo BantuBuzz EXECUTE Unverified User Cleanup
echo ============================================================
echo.
echo Target: %VPS_USER%@%VPS_HOST%
echo.
echo WARNING:
echo   This will permanently delete ALL unverified non-admin
echo   creator and brand users from production.
echo.
echo   It will not delete verified users or admin users.
echo.
echo Report: %REPORT%
echo.
set /p "CONFIRM=Type DELETE NOW to continue, or press Enter to cancel: "
if /I not "%CONFIRM%"=="DELETE NOW" (
  echo Cancelled. No users were deleted.
  pause
  exit /b 0
)

(
  echo ============================================================
  echo BantuBuzz EXECUTE Unverified User Cleanup
  echo ============================================================
  echo Target: %VPS_USER%@%VPS_HOST%
  echo Started: %DATE% %TIME%
  echo.
) > "%REPORT%"

echo [1/3] Uploading latest cleanup script...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %VPS_HOST%
echo ============================================================
scp "%ROOT_DIR%\deployment\vps\delete_unverified_users.py" "%VPS_USER%@%VPS_HOST%:%REMOTE_SCRIPT%" >> "%REPORT%" 2>&1
if errorlevel 1 goto fail

echo [2/3] Deleting unverified users...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %VPS_HOST%
echo ============================================================
ssh "%VPS_USER%@%VPS_HOST%" "%REMOTE_PYTHON% --execute" >> "%REPORT%" 2>&1
if errorlevel 1 goto fail

echo [3/3] Verifying cleanup result...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %VPS_HOST%
echo ============================================================
ssh "%VPS_USER%@%VPS_HOST%" "%REMOTE_PYTHON% --sample 20" >> "%REPORT%" 2>&1
if errorlevel 1 goto fail

echo.
echo ============================================================
echo Unverified user cleanup executed
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
echo Execute unverified user cleanup failed
echo ============================================================
echo.
echo Review:
echo %REPORT%
echo.
pause
exit /b 1
