@echo off
setlocal EnableExtensions

set "NEW_SERVER=13.140.159.150"
set "SSH_USER=root"
set "ROOT=%~dp0.."
set "BACKEND_ARCHIVE=%TEMP%\bantubuzz-creator-badges-backend.tar.gz"
set "FRONTEND_ARCHIVE=%TEMP%\bantubuzz-creator-badges-frontend.tar.gz"
set "REPORT_DIR=%ROOT%\deployment\vps\reports"

where ssh >nul 2>&1 || goto :missing_tools
where scp >nul 2>&1 || goto :missing_tools
where tar >nul 2>&1 || goto :missing_tools

if not exist "%REPORT_DIR%" mkdir "%REPORT_DIR%"
for /f %%i in ('powershell.exe -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TIMESTAMP=%%i"
set "REPORT=%REPORT_DIR%\new-vps-creator-badges-%NEW_SERVER%-%TIMESTAMP%.txt"

echo ============================================================
echo BantuBuzz Creator Badge Artwork Deployment
echo ============================================================
echo.
echo Target: %SSH_USER%@%NEW_SERVER%
echo.
echo This targeted deployment will:
echo   - Build and deploy the frontend with real creator badge artwork
echo   - Deploy backend badge naming/profile payload updates
echo   - Restart backend, Celery worker, and Celery beat
echo   - Check local and public health endpoints
echo.
echo It will NOT run database migrations, change CMS, DNS, or messaging.
echo.
echo Report:
echo %REPORT%
echo.
pause

echo.
echo [1/6] Building frontend...
pushd "%ROOT%\frontend"
call npm run build
if errorlevel 1 goto :failed_popd
popd

echo.
echo [2/6] Packaging frontend dist...
if exist "%FRONTEND_ARCHIVE%" del /q "%FRONTEND_ARCHIVE%"
tar -czf "%FRONTEND_ARCHIVE%" -C "%ROOT%\frontend\dist" .
if errorlevel 1 goto :failed

echo.
echo [3/6] Packaging targeted backend files...
if exist "%BACKEND_ARCHIVE%" del /q "%BACKEND_ARCHIVE%"
tar -czf "%BACKEND_ARCHIVE%" -C "%ROOT%\backend" ^
    app/services/creator_score_service.py ^
    app/models/creator_profile.py ^
    app/routes/creators.py
if errorlevel 1 goto :failed

echo.
echo [4/6] Uploading archives...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo ============================================================
scp "%BACKEND_ARCHIVE%" "%FRONTEND_ARCHIVE%" "%ROOT%\deployment\vps\deploy-creator-badges.sh" %SSH_USER%@%NEW_SERVER%:/tmp/
if errorlevel 1 goto :failed

echo.
echo [5/6] Installing files and restarting services...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo ============================================================
ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=15 -o ServerAliveCountMax=20 ^
    %SSH_USER%@%NEW_SERVER% "sed -i 's/\r$//' /tmp/deploy-creator-badges.sh && bash /tmp/deploy-creator-badges.sh" 2>&1 | powershell.exe -NoProfile -Command ^
    "$input | Tee-Object -FilePath '%REPORT%'; if (Select-String -Quiet -SimpleMatch 'BANTUBUZZ_NEW_VPS_CREATOR_BADGES_SUCCESS' '%REPORT%') { exit 0 } else { exit 1 }"
if errorlevel 1 goto :failed

echo.
echo [6/6] Cleaning local archives...
del /q "%BACKEND_ARCHIVE%" 2>nul
del /q "%FRONTEND_ARCHIVE%" 2>nul

echo.
echo ============================================================
echo Creator badge artwork deployed
echo ============================================================
echo.
echo Verify:
echo   https://bantubuzz.com/leaderboard
echo   A public creator profile with badges
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
echo Creator badge artwork deployment failed
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
