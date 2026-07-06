@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "VPS_HOST=13.140.159.150"
set "VPS_USER=root"
set "SCRIPT_DIR=%~dp0"
set "ROOT_DIR=%SCRIPT_DIR%.."
set "REPORT_DIR=%ROOT_DIR%\deployment\vps\reports"
set "REMOTE_SCRIPT=/tmp/check-bantubuzz-recaptcha-status.sh"

for /f %%I in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "STAMP=%%I"
set "REPORT=%REPORT_DIR%\new-vps-recaptcha-status-%VPS_HOST%-%STAMP%.txt"

if not exist "%REPORT_DIR%" mkdir "%REPORT_DIR%" >nul 2>&1

echo ============================================================
echo BantuBuzz reCAPTCHA Status Check
echo ============================================================
echo.
echo Target: %VPS_USER%@%VPS_HOST%
echo.
echo This will:
echo   - Confirm reCAPTCHA env vars are present without printing secrets
echo   - Confirm the frontend loads the reCAPTCHA Enterprise script
echo   - Confirm the Google assessment API accepts the configured project/key
echo   - Check backend health
echo.
echo Report: %REPORT%
echo.
pause

(
  echo ============================================================
  echo BantuBuzz reCAPTCHA Status Check
  echo ============================================================
  echo Target: %VPS_USER%@%VPS_HOST%
  echo Started: %DATE% %TIME%
  echo.
) > "%REPORT%"

echo [1/2] Uploading status script...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %VPS_HOST%
echo ============================================================
scp "%ROOT_DIR%\deployment\vps\check_recaptcha_status.sh" "%VPS_USER%@%VPS_HOST%:%REMOTE_SCRIPT%" >> "%REPORT%" 2>&1
if errorlevel 1 goto fail

echo [2/2] Checking production reCAPTCHA status...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %VPS_HOST%
echo ============================================================
ssh "%VPS_USER%@%VPS_HOST%" "bash %REMOTE_SCRIPT%" >> "%REPORT%" 2>&1
if errorlevel 1 goto fail

echo.
echo ============================================================
echo reCAPTCHA status check completed
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
echo reCAPTCHA status check failed
echo ============================================================
echo.
echo Review:
echo %REPORT%
echo.
pause
exit /b 1
