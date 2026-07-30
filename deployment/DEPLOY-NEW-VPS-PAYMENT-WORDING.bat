@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "VPS_HOST=13.140.159.150"
set "VPS_USER=root"
set "SCRIPT_DIR=%~dp0"
set "ROOT_DIR=%SCRIPT_DIR%.."
set "FRONTEND_DIR=%ROOT_DIR%\frontend"
set "REPORT_DIR=%ROOT_DIR%\deployment\vps\reports"
set "ARCHIVE=%TEMP%\bantubuzz-payment-wording-frontend.tar.gz"
set "REMOTE_ARCHIVE=/tmp/bantubuzz-payment-wording-frontend.tar.gz"
set "REMOTE_SCRIPT=/tmp/deploy-payment-wording.sh"
set "LOCAL_REMOTE_SCRIPT=%ROOT_DIR%\deployment\vps\deploy-payment-wording.sh"

for /f %%I in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "STAMP=%%I"
set "REPORT=%REPORT_DIR%\new-vps-payment-wording-%VPS_HOST%-%STAMP%.txt"

if not exist "%REPORT_DIR%" mkdir "%REPORT_DIR%" >nul 2>&1

echo ============================================================
echo BantuBuzz Payment Wording Deployment
echo ============================================================
echo.
echo Target: %VPS_USER%@%VPS_HOST%
echo.
echo This will:
echo   - Build the frontend locally
echo   - Upload only the frontend production build
echo   - Replace frontend files on the new VPS
echo   - Reload Apache
echo.
echo It will NOT modify the database, backend, CMS, or secrets.
echo Report: %REPORT%
echo.
pause

(
  echo ============================================================
  echo BantuBuzz Payment Wording Deployment
  echo ============================================================
  echo Target: %VPS_USER%@%VPS_HOST%
  echo Started: %DATE% %TIME%
  echo.
) > "%REPORT%"

echo [1/5] Building frontend...
pushd "%FRONTEND_DIR%" >nul
call npm run build >> "%REPORT%" 2>&1
if errorlevel 1 (
  popd >nul
  goto fail
)
popd >nul

echo [2/5] Packaging frontend dist...
if exist "%ARCHIVE%" del "%ARCHIVE%" >nul 2>&1
tar -czf "%ARCHIVE%" -C "%FRONTEND_DIR%\dist" . >> "%REPORT%" 2>&1
if errorlevel 1 goto fail

echo [3/5] Uploading archive and deploy script...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %VPS_HOST%
echo ============================================================
scp "%ARCHIVE%" "%VPS_USER%@%VPS_HOST%:%REMOTE_ARCHIVE%" >> "%REPORT%" 2>&1
if errorlevel 1 goto fail
scp "%LOCAL_REMOTE_SCRIPT%" "%VPS_USER%@%VPS_HOST%:%REMOTE_SCRIPT%" >> "%REPORT%" 2>&1
if errorlevel 1 goto fail

echo [4/5] Installing frontend update...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %VPS_HOST%
echo ============================================================
ssh "%VPS_USER%@%VPS_HOST%" "bash %REMOTE_SCRIPT%" >> "%REPORT%" 2>&1
if errorlevel 1 goto fail

echo [5/5] Cleaning local archive...
del "%ARCHIVE%" >nul 2>&1

echo.
echo ============================================================
echo Payment wording deployment completed
echo ============================================================
echo.
echo Report:
echo %REPORT%
echo.
pause
exit /b 0

:fail
del "%ARCHIVE%" >nul 2>&1
echo.
echo ============================================================
echo Payment wording deployment failed
echo ============================================================
echo.
echo Review:
echo %REPORT%
echo.
pause
exit /b 1
