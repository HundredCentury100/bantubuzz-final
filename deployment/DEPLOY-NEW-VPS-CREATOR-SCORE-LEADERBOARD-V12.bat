@echo off
setlocal EnableExtensions

set "NEW_SERVER=13.140.159.150"
set "SSH_USER=root"
set "ROOT=%~dp0.."
set "BACKEND_ARCHIVE=%TEMP%\bantubuzz-creator-score-v12-backend.tar.gz"
set "FRONTEND_ARCHIVE=%TEMP%\bantubuzz-creator-score-v12-frontend.tar.gz"
set "REPORT_DIR=%ROOT%\deployment\vps\reports"

where ssh >nul 2>&1 || goto :missing_tools
where scp >nul 2>&1 || goto :missing_tools
where tar >nul 2>&1 || goto :missing_tools

if not exist "%REPORT_DIR%" mkdir "%REPORT_DIR%"
for /f %%i in ('powershell.exe -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TIMESTAMP=%%i"
set "REPORT=%REPORT_DIR%\new-vps-creator-score-leaderboard-v12-%NEW_SERVER%-%TIMESTAMP%.txt"

echo ============================================================
echo BantuBuzz Creator Score v1.2 Deployment
echo ============================================================
echo.
echo Target: %SSH_USER%@%NEW_SERVER%
echo.
echo This targeted deployment will:
echo   - Build the current frontend
echo   - Deploy Creator Score formula, badge, leaderboard, and dashboard updates
echo   - Add creator leaderboard display preference and featured creator columns
echo   - Run flask db upgrade to 202606181300
echo   - Restart backend, Celery worker, and Celery beat
echo   - Recalculate all creator scores and rankings
echo   - Check local and public health endpoints
echo.
echo It will NOT change the CMS, DNS, messaging service, or unrelated data.
echo.
echo Report:
echo %REPORT%
echo.
pause

echo.
echo [1/7] Building frontend...
pushd "%ROOT%\frontend"
call npm run build
if errorlevel 1 goto :failed_popd
popd

echo.
echo [2/7] Packaging frontend dist...
if exist "%FRONTEND_ARCHIVE%" del /q "%FRONTEND_ARCHIVE%"
tar -czf "%FRONTEND_ARCHIVE%" -C "%ROOT%\frontend\dist" .
if errorlevel 1 goto :failed

echo.
echo [3/7] Packaging targeted backend files...
if exist "%BACKEND_ARCHIVE%" del /q "%BACKEND_ARCHIVE%"
tar -czf "%BACKEND_ARCHIVE%" -C "%ROOT%\backend" ^
    app/services/creator_score_formula.py ^
    app/services/creator_score_service.py ^
    app/models/creator_profile.py ^
    app/routes/creators.py ^
    migrations/versions/202606181000_add_inactive_reminder_sent_at.py ^
    migrations/versions/202606181200_add_creator_leaderboard_preferences.py ^
    migrations/versions/202606181300_ensure_creator_featured_fields.py
if errorlevel 1 goto :failed

echo.
echo [4/7] Uploading archives...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo ============================================================
scp "%BACKEND_ARCHIVE%" "%FRONTEND_ARCHIVE%" "%ROOT%\deployment\vps\deploy-creator-score-v12.sh" %SSH_USER%@%NEW_SERVER%:/tmp/
if errorlevel 1 goto :failed

echo.
echo [5/7] Installing files, migrating, restarting, and recalculating scores...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo ============================================================
ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=15 -o ServerAliveCountMax=20 ^
    %SSH_USER%@%NEW_SERVER% "bash /tmp/deploy-creator-score-v12.sh" 2>&1 | powershell.exe -NoProfile -Command ^
    "$input | Tee-Object -FilePath '%REPORT%'; if (Select-String -Quiet -SimpleMatch 'BANTUBUZZ_NEW_VPS_CREATOR_SCORE_V12_SUCCESS' '%REPORT%') { exit 0 } else { exit 1 }"
if errorlevel 1 goto :failed

echo.
echo [6/7] Cleaning local archives...
del /q "%BACKEND_ARCHIVE%" 2>nul
del /q "%FRONTEND_ARCHIVE%" 2>nul

echo.
echo [7/7] Deployment complete.
echo.
echo ============================================================
echo Creator Score v1.2 deployed
echo ============================================================
echo.
echo Verify:
echo   https://bantubuzz.com/leaderboard
echo   https://bantubuzz.com/creator/dashboard
echo.
echo Report:
echo %REPORT%
echo.
pause
exit /b 0

:failed_popd
popd

:failed
echo.
echo ============================================================
echo Creator Score v1.2 deployment failed
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
