@echo off
setlocal EnableExtensions

set "NEW_SERVER=13.140.159.150"
set "SSH_USER=root"
set "ROOT=%~dp0.."
set "BACKEND_ARCHIVE=%TEMP%\bantubuzz-biq-productization-backend.tar.gz"
set "FRONTEND_ARCHIVE=%TEMP%\bantubuzz-biq-productization-frontend.tar.gz"
set "REPORT_DIR=%ROOT%\deployment\vps\reports"

where ssh >nul 2>&1 || goto :missing_tools
where scp >nul 2>&1 || goto :missing_tools
where tar >nul 2>&1 || goto :missing_tools

if not exist "%REPORT_DIR%" mkdir "%REPORT_DIR%"
for /f %%i in ('powershell.exe -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TIMESTAMP=%%i"
set "REPORT=%REPORT_DIR%\new-vps-biq-productization-%NEW_SERVER%-%TIMESTAMP%.txt"

echo ============================================================
echo BantuBuzz BIQ Productization Deployment
echo ============================================================
echo.
echo Target: %SSH_USER%@%NEW_SERVER%
echo.
echo This targeted deployment will:
echo   - Deploy owner-facing BIQ insights from the creator score service
echo   - Build and deploy frontend BIQ dashboard/profile/leaderboard labels
echo   - Restart backend and reload Apache
echo   - Check local and public health endpoints
echo.
echo It will NOT run database migrations, deploy CMS, or change messaging.
echo.
echo Report:
echo %REPORT%
echo.
pause

echo.
echo [1/6] Local backend syntax check...
pushd "%ROOT%"
backend\venv\Scripts\python.exe -m py_compile backend\app\services\creator_score_service.py
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
tar -czf "%BACKEND_ARCHIVE%" -C "%ROOT%\backend" app/services/creator_score_service.py
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
scp "%BACKEND_ARCHIVE%" "%FRONTEND_ARCHIVE%" "%ROOT%\deployment\vps\deploy-biq-productization.sh" %SSH_USER%@%NEW_SERVER%:/tmp/
if errorlevel 1 goto :failed

ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=15 -o ServerAliveCountMax=20 ^
    %SSH_USER%@%NEW_SERVER% "bash /tmp/deploy-biq-productization.sh" 2>&1 | powershell.exe -NoProfile -Command ^
    "$input | Tee-Object -FilePath '%REPORT%'; if (Select-String -Quiet -SimpleMatch 'BANTUBUZZ_NEW_VPS_BIQ_PRODUCTIZATION_SUCCESS' '%REPORT%') { exit 0 } else { exit 1 }"
if errorlevel 1 goto :failed

echo.
echo [6/6] Cleaning local archives...
del /q "%BACKEND_ARCHIVE%" 2>nul
del /q "%FRONTEND_ARCHIVE%" 2>nul

echo.
echo ============================================================
echo BIQ productization deployed
echo ============================================================
echo.
echo Verify:
echo   https://bantubuzz.com/creator/dashboard
echo   https://bantubuzz.com/leaderboard
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
echo BIQ productization deployment failed
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
