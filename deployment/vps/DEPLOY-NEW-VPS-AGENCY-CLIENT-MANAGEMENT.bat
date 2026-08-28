@echo off
setlocal EnableExtensions DisableDelayedExpansion

set "NEW_SERVER=13.140.159.150"
set "SSH_USER=root"
set "ROOT=%~dp0..\.."
set "FRONTEND_DIR=%ROOT%\frontend"
set "FRONTEND_DIST=%FRONTEND_DIR%\dist"
set "BACKEND_DIR=%ROOT%\backend"
set "REPORT_DIR=%ROOT%\deployment\vps\reports"
set "LOCAL_SCRIPT=%ROOT%\deployment\vps\deploy-agency-client-management.sh"
set "NORMALIZED_SCRIPT=%TEMP%\deploy-agency-client-management.sh"
set "FRONTEND_ARCHIVE=%TEMP%\bantubuzz-agency-client-management-frontend.tar.gz"
set "BACKEND_ARCHIVE=%TEMP%\bantubuzz-agency-client-management-backend.tar.gz"
set "REMOTE_FRONTEND_ARCHIVE=/tmp/bantubuzz-agency-client-management-frontend.tar.gz"
set "REMOTE_BACKEND_ARCHIVE=/tmp/bantubuzz-agency-client-management-backend.tar.gz"
set "REMOTE_SCRIPT=/tmp/deploy-agency-client-management.sh"

where ssh >nul 2>&1 || goto :missing_tools
where scp >nul 2>&1 || goto :missing_tools
where tar >nul 2>&1 || goto :missing_tools
where npm >nul 2>&1 || goto :missing_tools

if not exist "%REPORT_DIR%" mkdir "%REPORT_DIR%"
for /f %%i in ('powershell.exe -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TIMESTAMP=%%i"
set "REPORT=%REPORT_DIR%\new-vps-agency-client-management-%NEW_SERVER%-%TIMESTAMP%.txt"

echo ============================================================
echo BantuBuzz Agency Client Management Deployment
echo ============================================================
echo.
echo Target: %SSH_USER%@%NEW_SERVER%
echo.
echo This deployment will:
echo   - Deploy the Agency Dashboard and dedicated Agency Analytics page
echo   - Deploy explicit existing-brand connection approval flow
echo   - Apply the workspace connection request database migration
echo   - Preserve existing clients, campaigns, billing, and collaboration data
echo   - Install the frontend into the live Apache path
echo.
echo It will NOT touch the CMS, DNS, old VPS, or delete user data.
echo Report: %REPORT%
echo.
pause

(
  echo BantuBuzz Agency Client Management Deployment
  echo Started: %DATE% %TIME%
  echo Target: %SSH_USER%@%NEW_SERVER%
) > "%REPORT%"

echo [1/5] Building frontend...
pushd "%FRONTEND_DIR%" >nul || goto :failed
call npm run build >> "%REPORT%" 2>&1
set "BUILD_RESULT=%ERRORLEVEL%"
popd >nul
if not "%BUILD_RESULT%"=="0" goto :failed

echo [2/5] Compiling agency backend files...
pushd "%ROOT%" >nul || goto :failed
set "PYTHON_EXE=python"
if exist "%BACKEND_DIR%\venv\Scripts\python.exe" set "PYTHON_EXE=%BACKEND_DIR%\venv\Scripts\python.exe"
"%PYTHON_EXE%" -m py_compile backend\app\models\__init__.py backend\app\models\client_workspace.py backend\app\routes\workspaces.py backend\app\routes\campaigns.py backend\app\routes\brands.py backend\app\routes\subscriptions.py backend\app\services\workspace_service.py backend\app\services\white_label_report_service.py backend\app\utils\brand_identity.py backend\migrations\versions\202608261000_add_client_brand_link_to_workspaces.py backend\migrations\versions\202608281200_add_workspace_connection_requests.py >> "%REPORT%" 2>&1
set "COMPILE_RESULT=%ERRORLEVEL%"
popd >nul
if not "%COMPILE_RESULT%"=="0" goto :failed

echo [3/5] Packaging focused deployment files...
del /q "%FRONTEND_ARCHIVE%" "%BACKEND_ARCHIVE%" "%NORMALIZED_SCRIPT%" >nul 2>&1
pushd "%FRONTEND_DIST%" >nul || goto :failed
tar -czf "%FRONTEND_ARCHIVE%" . >> "%REPORT%" 2>&1
set "FRONTEND_ARCHIVE_RESULT=%ERRORLEVEL%"
popd >nul
if not "%FRONTEND_ARCHIVE_RESULT%"=="0" goto :failed
tar -czf "%BACKEND_ARCHIVE%" -C "%BACKEND_DIR%" app/models/__init__.py app/models/client_workspace.py app/routes/workspaces.py app/routes/campaigns.py app/routes/brands.py app/routes/subscriptions.py app/services/workspace_service.py app/services/white_label_report_service.py app/utils/brand_identity.py migrations/versions/202608261000_add_client_brand_link_to_workspaces.py migrations/versions/202608281200_add_workspace_connection_requests.py >> "%REPORT%" 2>&1
if errorlevel 1 goto :failed
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$src='%LOCAL_SCRIPT%'; $dst='%NORMALIZED_SCRIPT%'; $text=[IO.File]::ReadAllText($src) -replace \"`r`n\",\"`n\"; [IO.File]::WriteAllText($dst,$text,(New-Object Text.UTF8Encoding($false)))" >> "%REPORT%" 2>&1
if errorlevel 1 goto :failed

echo [4/5] Uploading deployment files...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo ============================================================
scp "%FRONTEND_ARCHIVE%" "%SSH_USER%@%NEW_SERVER%:%REMOTE_FRONTEND_ARCHIVE%" >> "%REPORT%" 2>&1 || goto :failed
scp "%BACKEND_ARCHIVE%" "%SSH_USER%@%NEW_SERVER%:%REMOTE_BACKEND_ARCHIVE%" >> "%REPORT%" 2>&1 || goto :failed
scp "%NORMALIZED_SCRIPT%" "%SSH_USER%@%NEW_SERVER%:%REMOTE_SCRIPT%" >> "%REPORT%" 2>&1 || goto :failed

echo [5/5] Installing on new VPS...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo ============================================================
ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=15 -o ServerAliveCountMax=20 "%SSH_USER%@%NEW_SERVER%" "bash %REMOTE_SCRIPT%" >> "%REPORT%" 2>&1 || goto :failed

del /q "%FRONTEND_ARCHIVE%" "%BACKEND_ARCHIVE%" "%NORMALIZED_SCRIPT%" >nul 2>&1
echo.
echo ============================================================
echo Agency client management deployed
echo ============================================================
echo.
echo QA:
echo   - Open https://bantubuzz.com/brand/agency
echo   - Add a new client and open Work In Client in a new tab
echo   - Use Connect Existing Brand and approve from the target brand login
echo   - Open Analytics and Reports, filter a client, and export a PDF
echo.
echo Report: %REPORT%
pause
exit /b 0

:missing_tools
echo Missing required tool: ssh, scp, tar, or npm.
pause
exit /b 1

:failed
echo.
echo ============================================================
echo Agency client management deployment failed
echo ============================================================
echo Review: %REPORT%
pause
exit /b 1
