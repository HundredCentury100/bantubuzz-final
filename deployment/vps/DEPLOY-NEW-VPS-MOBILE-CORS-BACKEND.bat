@echo off
setlocal EnableExtensions

set "NEW_SERVER=13.140.159.150"
set "SSH_USER=root"
set "ROOT=%~dp0..\.."
set "BACKEND_DIR=%ROOT%\backend"
set "REPORT_DIR=%ROOT%\deployment\vps\reports"
set "REMOTE_SCRIPT=/tmp/deploy-mobile-cors-backend.sh"
set "LOCAL_SCRIPT=%ROOT%\deployment\vps\deploy-mobile-cors-backend.sh"
set "BACKEND_ARCHIVE=%TEMP%\bantubuzz-mobile-cors-backend.tar.gz"
set "REMOTE_BACKEND_ARCHIVE=/tmp/bantubuzz-mobile-cors-backend.tar.gz"
set "NORMALIZED_SCRIPT=%TEMP%\deploy-mobile-cors-backend.sh"

where ssh >nul 2>&1 || goto :missing_tools
where scp >nul 2>&1 || goto :missing_tools
where tar >nul 2>&1 || goto :missing_tools

if not exist "%REPORT_DIR%" mkdir "%REPORT_DIR%"
for /f %%i in ('powershell.exe -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TIMESTAMP=%%i"
set "REPORT=%REPORT_DIR%\new-vps-mobile-cors-backend-%NEW_SERVER%-%TIMESTAMP%.txt"

echo ============================================================
echo BantuBuzz Mobile CORS Backend Deployment
echo ============================================================
echo.
echo NEW VPS: %SSH_USER%@%NEW_SERVER%
echo.
echo This targeted deployment will:
echo   - Upload backend/app/config.py only
echo   - Allow Capacitor mobile app origins in backend CORS
echo   - Restart backend and Apache
echo   - Check local and public API health
echo.
echo It will NOT touch frontend, CMS, database schema, DNS, or old VPS services.
echo.
echo Report:
echo %REPORT%
echo.
pause

(
  echo ============================================================
  echo BantuBuzz Mobile CORS Backend Deployment
  echo ============================================================
  echo Started: %DATE% %TIME%
  echo Target: %SSH_USER%@%NEW_SERVER%
  echo.
) > "%REPORT%"

echo [1/5] Compiling backend config locally...
pushd "%ROOT%" >nul
set "PYTHON_EXE=python"
if exist "%BACKEND_DIR%\venv\Scripts\python.exe" set "PYTHON_EXE=%BACKEND_DIR%\venv\Scripts\python.exe"
"%PYTHON_EXE%" -m py_compile backend\app\config.py >> "%REPORT%" 2>&1
if errorlevel 1 (
    popd >nul
    goto :failed
)

echo.
echo [2/5] Packaging backend config...
if exist "%BACKEND_ARCHIVE%" del /q "%BACKEND_ARCHIVE%"
if exist "%NORMALIZED_SCRIPT%" del /q "%NORMALIZED_SCRIPT%"

tar -czf "%BACKEND_ARCHIVE%" -C "%BACKEND_DIR%" app/config.py >> "%REPORT%" 2>&1
if errorlevel 1 (
    popd >nul
    goto :failed
)
popd >nul

powershell -NoProfile -ExecutionPolicy Bypass -Command "$src='%LOCAL_SCRIPT%'; $dst='%NORMALIZED_SCRIPT%'; $text=[IO.File]::ReadAllText($src) -replace \"`r`n\",\"`n\"; [IO.File]::WriteAllText($dst,$text,(New-Object Text.UTF8Encoding($false)))" >> "%REPORT%" 2>&1
if errorlevel 1 goto :failed

echo.
echo [3/5] Uploading archive and deployment script...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo ============================================================
scp "%BACKEND_ARCHIVE%" %SSH_USER%@%NEW_SERVER%:%REMOTE_BACKEND_ARCHIVE% >> "%REPORT%" 2>&1
if errorlevel 1 goto :failed
scp "%NORMALIZED_SCRIPT%" %SSH_USER%@%NEW_SERVER%:%REMOTE_SCRIPT% >> "%REPORT%" 2>&1
if errorlevel 1 goto :failed

echo.
echo [4/5] Installing on new VPS...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo ============================================================
ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=15 -o ServerAliveCountMax=20 ^
    %SSH_USER%@%NEW_SERVER% "bash %REMOTE_SCRIPT%" >> "%REPORT%" 2>&1
if errorlevel 1 goto :failed

echo.
echo [5/5] Cleaning local archives...
if exist "%BACKEND_ARCHIVE%" del /q "%BACKEND_ARCHIVE%"
if exist "%NORMALIZED_SCRIPT%" del /q "%NORMALIZED_SCRIPT%"

echo.
echo ============================================================
echo Mobile CORS backend deployment completed
echo ============================================================
echo.
echo QA:
echo   - Re-run the Android app
echo   - Home page creators should load
echo   - Browse creators should load/search
echo.
echo Report:
echo %REPORT%
echo.
pause
exit /b 0

:failed
echo.
echo ============================================================
echo Mobile CORS backend deployment failed
echo ============================================================
echo.
echo Review:
echo %REPORT%
echo.
if exist "%BACKEND_ARCHIVE%" del /q "%BACKEND_ARCHIVE%"
if exist "%NORMALIZED_SCRIPT%" del /q "%NORMALIZED_SCRIPT%"
pause
exit /b 1

:missing_tools
echo ERROR: Windows OpenSSH client and tar are required.
pause
exit /b 1
