@echo off
setlocal EnableExtensions

set "NEW_SERVER=13.140.159.150"
set "SSH_USER=root"
set "ROOT=%~dp0.."
set "BACKEND_ARCHIVE=%TEMP%\bantubuzz-campaign-scenarios-backend.tar.gz"
set "FRONTEND_ARCHIVE=%TEMP%\bantubuzz-campaign-scenarios-frontend.tar.gz"
set "REPORT_DIR=%ROOT%\deployment\vps\reports"

where ssh >nul 2>&1 || goto :missing_tools
where scp >nul 2>&1 || goto :missing_tools
where tar >nul 2>&1 || goto :missing_tools

if not exist "%REPORT_DIR%" mkdir "%REPORT_DIR%"
for /f %%i in ('powershell.exe -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TIMESTAMP=%%i"
set "REPORT=%REPORT_DIR%\new-vps-campaign-scenario-analysis-%NEW_SERVER%-%TIMESTAMP%.txt"

echo ============================================================
echo BantuBuzz Campaign Scenario Analysis
echo ============================================================
echo.
echo Target: %SSH_USER%@%NEW_SERVER%
echo.
echo This targeted deployment will:
echo   - Deploy the campaign cart scenario prediction API
echo   - Deploy the cart scenario analysis frontend panel
echo   - Build and deploy frontend dist
echo   - Restart backend and reload Apache
echo.
echo It will NOT run database migrations or deploy CMS/messaging changes.
echo.
echo Report:
echo %REPORT%
echo.
pause

echo.
echo [1/6] Local backend syntax check...
pushd "%ROOT%"
backend\venv\Scripts\python.exe -m py_compile ^
    backend\app\services\campaign_scenario_service.py ^
    backend\app\routes\campaign_cart.py
if errorlevel 1 goto :failed_popd
popd

echo.
echo [2/6] Building frontend...
pushd "%ROOT%\frontend"
call npm.cmd run build
if errorlevel 1 goto :failed_popd
popd

echo.
echo [3/6] Packaging targeted backend files...
if exist "%BACKEND_ARCHIVE%" del /q "%BACKEND_ARCHIVE%"
tar -czf "%BACKEND_ARCHIVE%" -C "%ROOT%\backend" ^
    app/services/campaign_scenario_service.py ^
    app/routes/campaign_cart.py
if errorlevel 1 goto :failed

echo.
echo [4/6] Packaging frontend dist...
if exist "%FRONTEND_ARCHIVE%" del /q "%FRONTEND_ARCHIVE%"
tar -czf "%FRONTEND_ARCHIVE%" -C "%ROOT%\frontend\dist" .
if errorlevel 1 goto :failed

echo.
echo [5/6] Uploading and installing release files...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo ============================================================
scp "%BACKEND_ARCHIVE%" "%FRONTEND_ARCHIVE%" "%ROOT%\deployment\vps\deploy-campaign-scenario-analysis.sh" %SSH_USER%@%NEW_SERVER%:/tmp/
if errorlevel 1 goto :failed

ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=15 -o ServerAliveCountMax=20 ^
    %SSH_USER%@%NEW_SERVER% "bash /tmp/deploy-campaign-scenario-analysis.sh" 2>&1 | powershell.exe -NoProfile -Command ^
    "$input | Tee-Object -FilePath '%REPORT%'; if (Select-String -Quiet -SimpleMatch 'BANTUBUZZ_NEW_VPS_CAMPAIGN_SCENARIO_ANALYSIS_SUCCESS' '%REPORT%') { exit 0 } else { exit 1 }"
if errorlevel 1 goto :failed

echo.
echo [6/6] Cleaning local archives...
del /q "%BACKEND_ARCHIVE%" 2>nul
del /q "%FRONTEND_ARCHIVE%" 2>nul

echo.
echo ============================================================
echo Campaign scenario analysis deployed
echo ============================================================
echo.
echo QA checks:
echo   - Open an active campaign with cart items
echo   - Confirm the AI Scenario Analysis panel appears above cart payment
echo   - Add/remove a creator and confirm the panel refreshes
echo   - Confirm four scenarios show reach, engagement, CPM, and sentiment
echo.
echo Report:
echo %REPORT%
echo.
pause
exit /b 0

:failed_popd
popd

:failed
if exist "%BACKEND_ARCHIVE%" del /q "%BACKEND_ARCHIVE%" 2>nul
if exist "%FRONTEND_ARCHIVE%" del /q "%FRONTEND_ARCHIVE%" 2>nul
echo.
echo ============================================================
echo Campaign scenario analysis deployment failed
echo ============================================================
echo.
echo Review:
echo %REPORT%
echo.
pause
exit /b 1

:missing_tools
echo ERROR: Windows OpenSSH, scp, and tar are required.
pause
exit /b 1
