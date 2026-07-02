@echo off
setlocal EnableExtensions

set "NEW_SERVER=13.140.159.150"
set "SSH_USER=root"
set "ROOT=%~dp0.."
set "BACKEND_ARCHIVE=%TEMP%\bantubuzz-ai-creator-matching-backend.tar.gz"
set "FRONTEND_ARCHIVE=%TEMP%\bantubuzz-ai-creator-matching-frontend.tar.gz"
set "REPORT_DIR=%ROOT%\deployment\vps\reports"

where ssh >nul 2>&1 || goto :missing_tools
where scp >nul 2>&1 || goto :missing_tools
where tar >nul 2>&1 || goto :missing_tools

if not exist "%REPORT_DIR%" mkdir "%REPORT_DIR%"
for /f %%i in ('powershell.exe -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TIMESTAMP=%%i"
set "REPORT=%REPORT_DIR%\new-vps-ai-creator-matching-%NEW_SERVER%-%TIMESTAMP%.txt"

echo ============================================================
echo BantuBuzz AI Creator Matching
echo ============================================================
echo.
echo Target: %SSH_USER%@%NEW_SERVER%
echo.
echo This targeted deployment will:
echo   - Deploy the AI creator matching backend service and endpoints
echo   - Deploy the creator match feedback table migration
echo   - Build and deploy the frontend AI Matches campaign tab
echo   - Run flask db upgrade on the new VPS
echo   - Restart backend and reload Apache
echo.
echo It will NOT deploy CMS, DNS, messaging, or unrelated backend files.
echo.
echo Report:
echo %REPORT%
echo.
pause

echo.
echo [1/7] Local backend syntax check...
pushd "%ROOT%"
python -m py_compile ^
    backend\app\models\creator_match_feedback.py ^
    backend\app\services\creator_matching_service.py ^
    backend\app\routes\campaigns.py
if errorlevel 1 goto :failed_popd
popd

echo.
echo [2/7] Building frontend...
pushd "%ROOT%\frontend"
call npm run build
if errorlevel 1 goto :failed_popd
popd

echo.
echo [3/7] Packaging targeted backend files...
if exist "%BACKEND_ARCHIVE%" del /q "%BACKEND_ARCHIVE%"
tar -czf "%BACKEND_ARCHIVE%" -C "%ROOT%\backend" ^
    app/models/__init__.py ^
    app/models/creator_match_feedback.py ^
    app/services/creator_matching_service.py ^
    app/routes/campaigns.py ^
    migrations/versions/202606241000_add_creator_match_feedback.py
if errorlevel 1 goto :failed

echo.
echo [4/7] Packaging frontend dist...
if exist "%FRONTEND_ARCHIVE%" del /q "%FRONTEND_ARCHIVE%"
tar -czf "%FRONTEND_ARCHIVE%" -C "%ROOT%\frontend\dist" .
if errorlevel 1 goto :failed

echo.
echo [5/7] Uploading release files...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo ============================================================
scp "%BACKEND_ARCHIVE%" "%FRONTEND_ARCHIVE%" "%ROOT%\deployment\vps\deploy-ai-creator-matching.sh" %SSH_USER%@%NEW_SERVER%:/tmp/
if errorlevel 1 goto :failed

echo.
echo [6/7] Installing files, migrating DB, and restarting services...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo ============================================================
ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=15 -o ServerAliveCountMax=20 ^
    %SSH_USER%@%NEW_SERVER% "bash /tmp/deploy-ai-creator-matching.sh" 2>&1 | powershell.exe -NoProfile -Command ^
    "$input | Tee-Object -FilePath '%REPORT%'; if (Select-String -Quiet -SimpleMatch 'BANTUBUZZ_NEW_VPS_AI_CREATOR_MATCHING_SUCCESS' '%REPORT%') { exit 0 } else { exit 1 }"
if errorlevel 1 goto :failed

echo.
echo [7/7] Cleaning local archives...
del /q "%BACKEND_ARCHIVE%" 2>nul
del /q "%FRONTEND_ARCHIVE%" 2>nul

echo.
echo ============================================================
echo AI creator matching deployed
echo ============================================================
echo.
echo Verify as a Pro+ brand:
echo   https://bantubuzz.com/brand/campaigns
echo   Open a campaign, then use the AI Matches tab.
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
echo AI creator matching deployment failed
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
