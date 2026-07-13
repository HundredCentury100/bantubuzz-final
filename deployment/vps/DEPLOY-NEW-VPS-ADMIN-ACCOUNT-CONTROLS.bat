@echo off
setlocal EnableExtensions

set "NEW_SERVER=13.140.159.150"
set "SSH_USER=root"
set "ROOT=%~dp0..\.."
set "FRONTEND_DIR=%ROOT%\frontend"
set "BACKEND_DIR=%ROOT%\backend"
set "REPORT_DIR=%ROOT%\deployment\vps\reports"
set "REMOTE_SCRIPT=/tmp/deploy-admin-account-controls.sh"
set "LOCAL_SCRIPT=%ROOT%\deployment\vps\deploy-admin-account-controls.sh"
set "BACKEND_ARCHIVE=%TEMP%\bantubuzz-admin-account-controls-backend.tar.gz"
set "FRONTEND_ARCHIVE=%TEMP%\bantubuzz-admin-account-controls-frontend.tar.gz"
set "REMOTE_BACKEND_ARCHIVE=/tmp/bantubuzz-admin-account-controls-backend.tar.gz"
set "REMOTE_FRONTEND_ARCHIVE=/tmp/bantubuzz-admin-account-controls-frontend.tar.gz"
set "NORMALIZED_SCRIPT=%TEMP%\deploy-admin-account-controls.sh"

where ssh >nul 2>&1 || goto :missing_tools
where scp >nul 2>&1 || goto :missing_tools
where tar >nul 2>&1 || goto :missing_tools

if not exist "%REPORT_DIR%" mkdir "%REPORT_DIR%"
for /f %%i in ('powershell.exe -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TIMESTAMP=%%i"
set "REPORT=%REPORT_DIR%\new-vps-admin-account-controls-%NEW_SERVER%-%TIMESTAMP%.txt"

echo ============================================================
echo BantuBuzz Admin Account Controls Deployment
echo ============================================================
echo.
echo NEW VPS: %SSH_USER%@%NEW_SERVER%
echo.
echo This deployment will:
echo   - Build the frontend locally
echo   - Upload rebuilt frontend dist
echo   - Upload targeted backend admin/account-control files
echo   - Run the admin account controls migration
echo   - Restart backend, Celery if present, and Apache
echo.
echo This deployment will NOT:
echo   - Touch CMS, DNS, or old VPS services
echo.
echo Report:
echo %REPORT%
echo.
pause

(
  echo ============================================================
  echo BantuBuzz Admin Account Controls Deployment
  echo ============================================================
  echo Started: %DATE% %TIME%
  echo Target: %SSH_USER%@%NEW_SERVER%
  echo.
) > "%REPORT%"

echo [1/6] Building frontend...
pushd "%FRONTEND_DIR%" >nul
call npm run build >> "%REPORT%" 2>&1
if errorlevel 1 (
    popd >nul
    goto :failed
)
popd >nul

echo.
echo [2/6] Compiling targeted backend files locally...
pushd "%ROOT%" >nul
set "PYTHON_EXE=python"
if exist "%BACKEND_DIR%\venv\Scripts\python.exe" set "PYTHON_EXE=%BACKEND_DIR%\venv\Scripts\python.exe"
"%PYTHON_EXE%" -m py_compile ^
  backend\app\models\account_fee_override.py ^
  backend\app\services\account_fee_override_service.py ^
  backend\app\utils\subscription_helper.py ^
  backend\app\services\payment_service.py ^
  backend\app\routes\admin\users.py ^
  backend\migrations\versions\202607131500_add_admin_account_controls.py >> "%REPORT%" 2>&1
if errorlevel 1 (
    popd >nul
    goto :failed
)

echo.
echo [3/6] Packaging targeted files...
if exist "%BACKEND_ARCHIVE%" del /q "%BACKEND_ARCHIVE%"
if exist "%FRONTEND_ARCHIVE%" del /q "%FRONTEND_ARCHIVE%"
if exist "%NORMALIZED_SCRIPT%" del /q "%NORMALIZED_SCRIPT%"

tar -czf "%BACKEND_ARCHIVE%" -C "%BACKEND_DIR%" ^
  app/models/__init__.py ^
  app/models/subscription_plan.py ^
  app/models/account_fee_override.py ^
  app/routes/admin/users.py ^
  app/services/payment_service.py ^
  app/services/subscription_enforcement_service.py ^
  app/services/account_fee_override_service.py ^
  app/utils/subscription_helper.py ^
  insert_new_plans.py ^
  migrate_subscription_plans.py ^
  migrations/add_subscription_restrictions.sql ^
  migrations/add_subscriptions.py ^
  migrations/versions/202607131500_add_admin_account_controls.py
if errorlevel 1 (
    popd >nul
    goto :failed
)

tar -czf "%FRONTEND_ARCHIVE%" -C "%FRONTEND_DIR%\dist" .
if errorlevel 1 (
    popd >nul
    goto :failed
)
popd >nul

powershell -NoProfile -ExecutionPolicy Bypass -Command "$src='%LOCAL_SCRIPT%'; $dst='%NORMALIZED_SCRIPT%'; $text=[IO.File]::ReadAllText($src) -replace \"`r`n\",\"`n\"; [IO.File]::WriteAllText($dst,$text,(New-Object Text.UTF8Encoding($false)))" >> "%REPORT%" 2>&1
if errorlevel 1 goto :failed

echo.
echo [4/6] Uploading archives and deployment script...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo ============================================================
scp "%BACKEND_ARCHIVE%" %SSH_USER%@%NEW_SERVER%:%REMOTE_BACKEND_ARCHIVE% >> "%REPORT%" 2>&1
if errorlevel 1 goto :failed
scp "%FRONTEND_ARCHIVE%" %SSH_USER%@%NEW_SERVER%:%REMOTE_FRONTEND_ARCHIVE% >> "%REPORT%" 2>&1
if errorlevel 1 goto :failed
scp "%NORMALIZED_SCRIPT%" %SSH_USER%@%NEW_SERVER%:%REMOTE_SCRIPT% >> "%REPORT%" 2>&1
if errorlevel 1 goto :failed

echo.
echo [5/6] Installing on new VPS...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo ============================================================
ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=15 -o ServerAliveCountMax=20 ^
    %SSH_USER%@%NEW_SERVER% "bash %REMOTE_SCRIPT%" >> "%REPORT%" 2>&1
if errorlevel 1 goto :failed

echo.
echo [6/6] Cleaning local archives...
if exist "%BACKEND_ARCHIVE%" del /q "%BACKEND_ARCHIVE%"
if exist "%FRONTEND_ARCHIVE%" del /q "%FRONTEND_ARCHIVE%"
if exist "%NORMALIZED_SCRIPT%" del /q "%NORMALIZED_SCRIPT%"

echo.
echo ============================================================
echo Admin account controls deployed
echo ============================================================
echo.
echo QA:
echo   https://bantubuzz.com/admin/users
echo   https://bantubuzz.com/browse/creators
echo.
echo Report:
echo %REPORT%
echo.
pause
exit /b 0

:failed
echo.
echo ============================================================
echo Admin account controls deployment failed
echo ============================================================
echo.
echo Review:
echo %REPORT%
echo.
if exist "%BACKEND_ARCHIVE%" del /q "%BACKEND_ARCHIVE%"
if exist "%FRONTEND_ARCHIVE%" del /q "%FRONTEND_ARCHIVE%"
if exist "%NORMALIZED_SCRIPT%" del /q "%NORMALIZED_SCRIPT%"
pause
exit /b 1

:missing_tools
echo ERROR: Windows OpenSSH client and tar are required.
pause
exit /b 1
