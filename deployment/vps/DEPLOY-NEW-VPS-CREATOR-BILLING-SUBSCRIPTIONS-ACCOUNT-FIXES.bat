@echo off
setlocal EnableExtensions

set "NEW_SERVER=13.140.159.150"
set "SSH_USER=root"
set "ROOT=%~dp0..\.."
set "FRONTEND_DIR=%ROOT%\frontend"
set "FRONTEND_DIST=%FRONTEND_DIR%\dist"
set "BACKEND_DIR=%ROOT%\backend"
set "REPORT_DIR=%ROOT%\deployment\vps\reports"
set "LOCAL_SCRIPT=%ROOT%\deployment\vps\deploy-creator-billing-subscriptions-account-fixes.sh"
set "REMOTE_SCRIPT=/tmp/deploy-creator-billing-subscriptions-account-fixes.sh"
set "FRONTEND_ARCHIVE=%TEMP%\bantubuzz-creator-billing-subscriptions-frontend.tar.gz"
set "BACKEND_ARCHIVE=%TEMP%\bantubuzz-creator-billing-subscriptions-backend.tar.gz"
set "REMOTE_FRONTEND_ARCHIVE=/tmp/bantubuzz-creator-billing-subscriptions-frontend.tar.gz"
set "REMOTE_BACKEND_ARCHIVE=/tmp/bantubuzz-creator-billing-subscriptions-backend.tar.gz"
set "NORMALIZED_SCRIPT=%TEMP%\deploy-creator-billing-subscriptions-account-fixes.sh"

where ssh >nul 2>&1 || goto :missing_tools
where scp >nul 2>&1 || goto :missing_tools
where tar >nul 2>&1 || goto :missing_tools
where npm >nul 2>&1 || goto :missing_tools

if not exist "%REPORT_DIR%" mkdir "%REPORT_DIR%"
for /f %%i in ('powershell.exe -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TIMESTAMP=%%i"
set "REPORT=%REPORT_DIR%\new-vps-creator-billing-subscriptions-account-fixes-%NEW_SERVER%-%TIMESTAMP%.txt"

echo ============================================================
echo BantuBuzz Creator Billing, Subscriptions, and Account Fixes
echo ============================================================
echo.
echo NEW VPS: %SSH_USER%@%NEW_SERVER%
echo.
echo This targeted deployment will:
echo   - Fix creator billing workspace authorization errors
echo   - Route paid creator plan changes through subscription payment
echo   - Enable creator spotlight boost purchase attempts with clear errors
echo   - Redirect creator Bookings and Proposals to current creator flows
echo   - Fix downloadable creator card rank to use current leaderboard rank
echo   - Add guarded account deletion on creator and brand profile pages
echo.
echo It will NOT touch CMS, DNS, old VPS services, or database schema.
echo.
echo Report:
echo %REPORT%
echo.
pause

(
  echo ============================================================
  echo BantuBuzz Creator Billing, Subscriptions, and Account Fixes
  echo ============================================================
  echo Started: %DATE% %TIME%
  echo Target: %SSH_USER%@%NEW_SERVER%
  echo.
) > "%REPORT%"

echo [1/5] Building frontend...
pushd "%FRONTEND_DIR%" >nul
call npm run build >> "%REPORT%" 2>&1
if errorlevel 1 (
  popd >nul
  goto :failed
)
popd >nul

echo.
echo [2/5] Compiling targeted backend files locally...
pushd "%ROOT%" >nul
set "PYTHON_EXE=python"
if exist "%BACKEND_DIR%\venv\Scripts\python.exe" set "PYTHON_EXE=%BACKEND_DIR%\venv\Scripts\python.exe"
"%PYTHON_EXE%" -m py_compile ^
  backend\app\routes\auth.py ^
  backend\app\routes\billing.py >> "%REPORT%" 2>&1
if errorlevel 1 (
  popd >nul
  goto :failed
)
popd >nul

echo.
echo [3/5] Packaging frontend and backend files...
if exist "%FRONTEND_ARCHIVE%" del /q "%FRONTEND_ARCHIVE%"
if exist "%BACKEND_ARCHIVE%" del /q "%BACKEND_ARCHIVE%"
if exist "%NORMALIZED_SCRIPT%" del /q "%NORMALIZED_SCRIPT%"

pushd "%FRONTEND_DIST%" >nul
tar -czf "%FRONTEND_ARCHIVE%" . >> "%REPORT%" 2>&1
set "TAR_FRONTEND_STATUS=%ERRORLEVEL%"
popd >nul
if not "%TAR_FRONTEND_STATUS%"=="0" goto :failed

tar -czf "%BACKEND_ARCHIVE%" -C "%BACKEND_DIR%" ^
  app/routes/auth.py ^
  app/routes/billing.py >> "%REPORT%" 2>&1
if errorlevel 1 goto :failed

powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$src='%LOCAL_SCRIPT%'; $dst='%NORMALIZED_SCRIPT%'; $text=[IO.File]::ReadAllText($src) -replace \"`r`n\",\"`n\"; [IO.File]::WriteAllText($dst,$text,(New-Object Text.UTF8Encoding($false)))" >> "%REPORT%" 2>&1
if errorlevel 1 goto :failed

echo.
echo [4/5] Uploading archives and deploy script...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo ============================================================
scp "%FRONTEND_ARCHIVE%" %SSH_USER%@%NEW_SERVER%:%REMOTE_FRONTEND_ARCHIVE% >> "%REPORT%" 2>&1
if errorlevel 1 goto :failed
scp "%BACKEND_ARCHIVE%" %SSH_USER%@%NEW_SERVER%:%REMOTE_BACKEND_ARCHIVE% >> "%REPORT%" 2>&1
if errorlevel 1 goto :failed
scp "%NORMALIZED_SCRIPT%" %SSH_USER%@%NEW_SERVER%:%REMOTE_SCRIPT% >> "%REPORT%" 2>&1
if errorlevel 1 goto :failed

echo.
echo [5/5] Installing on new VPS...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo ============================================================
ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=15 -o ServerAliveCountMax=20 ^
  %SSH_USER%@%NEW_SERVER% "bash %REMOTE_SCRIPT%" >> "%REPORT%" 2>&1
if errorlevel 1 goto :failed

if exist "%FRONTEND_ARCHIVE%" del /q "%FRONTEND_ARCHIVE%"
if exist "%BACKEND_ARCHIVE%" del /q "%BACKEND_ARCHIVE%"
if exist "%NORMALIZED_SCRIPT%" del /q "%NORMALIZED_SCRIPT%"

echo.
echo ============================================================
echo Creator billing, subscriptions, and account fixes deployed
echo ============================================================
echo.
echo QA:
echo   - https://bantubuzz.com/billing
echo   - https://bantubuzz.com/creator/subscriptions
echo   - https://bantubuzz.com/leaderboard?limit=50
echo   - https://bantubuzz.com/creator/profile/edit
echo   - https://bantubuzz.com/brand/profile/edit
echo.
echo Report:
echo %REPORT%
echo.
pause
exit /b 0

:missing_tools
echo Missing required tool: ssh, scp, tar, or npm.
pause
exit /b 1

:failed
echo.
echo ============================================================
echo Creator billing, subscriptions, and account fixes failed
echo ============================================================
echo.
echo Review:
echo %REPORT%
echo.
pause
exit /b 1
