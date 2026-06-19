@echo off
setlocal EnableExtensions

set "NEW_SERVER=13.140.159.150"
set "SSH_USER=root"
set "ROOT=%~dp0.."
set "BACKEND_ARCHIVE=%TEMP%\bantubuzz-thunzi-metric-normalization.tar.gz"
set "REPORT_DIR=%ROOT%\deployment\vps\reports"

where ssh >nul 2>&1 || goto :missing_tools
where scp >nul 2>&1 || goto :missing_tools
where tar >nul 2>&1 || goto :missing_tools

if not exist "%REPORT_DIR%" mkdir "%REPORT_DIR%"
for /f %%i in ('powershell.exe -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TIMESTAMP=%%i"
set "REPORT=%REPORT_DIR%\new-vps-thunzi-metric-normalization-%NEW_SERVER%-%TIMESTAMP%.txt"

echo ============================================================
echo BantuBuzz Thunzi Metric Normalization Hotfix
echo ============================================================
echo.
echo Target: %SSH_USER%@%NEW_SERVER%
echo.
echo This targeted deployment will:
echo   - Normalize ThunziAI engagement-rate scale handling
echo   - Normalize ThunziAI sentiment score display/storage handling
echo   - Fix post metric sync to use Thunzi sentimentScore/top-level sentiment
echo   - Normalize comment-level sentiment used in reports
echo   - Refresh stale local platform analytics from current Thunzi payloads
echo   - Normalize existing obvious fractional stored values
echo   - Recalculate creator scores
echo   - Restart backend, Celery worker, and Celery beat
echo.
echo It will NOT deploy frontend, CMS, DNS, or messaging changes.
echo.
echo Report:
echo %REPORT%
echo.
pause

echo.
echo [1/5] Local backend tests...
pushd "%ROOT%"
call "backend\venv\Scripts\python.exe" -m unittest backend.tests.test_thunzi_metrics backend.tests.test_creator_score_service
if not "%ERRORLEVEL%"=="0" goto :failed_popd
call "backend\venv\Scripts\python.exe" -m py_compile ^
    "backend\app\utils\thunzi_metrics.py" ^
    "backend\app\models\connected_platform.py" ^
    "backend\app\services\creator_analytics_service.py" ^
    "backend\app\services\post_metrics_service.py" ^
    "backend\app\tasks\platform_sync.py"
if not "%ERRORLEVEL%"=="0" goto :failed_popd
popd

echo.
echo [2/5] Packaging targeted backend files...
if exist "%BACKEND_ARCHIVE%" del /q "%BACKEND_ARCHIVE%"
tar -czf "%BACKEND_ARCHIVE%" -C "%ROOT%\backend" ^
    app/utils/thunzi_metrics.py ^
    app/models/connected_platform.py ^
    app/services/creator_analytics_service.py ^
    app/services/post_metrics_service.py ^
    app/tasks/platform_sync.py
if errorlevel 1 goto :failed

echo.
echo [3/5] Uploading hotfix release...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo ============================================================
scp "%BACKEND_ARCHIVE%" "%ROOT%\deployment\vps\deploy-thunzi-metric-normalization.sh" %SSH_USER%@%NEW_SERVER%:/tmp/
if errorlevel 1 goto :failed

echo.
echo [4/5] Installing files, normalizing data, and restarting services...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo ============================================================
ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=15 -o ServerAliveCountMax=20 ^
    %SSH_USER%@%NEW_SERVER% "sed -i 's/\r$//' /tmp/deploy-thunzi-metric-normalization.sh && bash /tmp/deploy-thunzi-metric-normalization.sh" 2>&1 | powershell.exe -NoProfile -Command ^
    "$input | Tee-Object -FilePath '%REPORT%'; if (Select-String -Quiet -SimpleMatch 'BANTUBUZZ_NEW_VPS_THUNZI_METRIC_NORMALIZATION_SUCCESS' '%REPORT%') { exit 0 } else { exit 1 }"
if errorlevel 1 goto :failed

echo.
echo [5/5] Cleaning local archive...
del /q "%BACKEND_ARCHIVE%" 2>nul

echo.
echo ============================================================
echo Thunzi metric normalization deployed
echo ============================================================
echo.
echo Report:
echo %REPORT%
echo.
pause
exit /b 0

:failed_popd
popd
goto :failed

:failed
if exist "%BACKEND_ARCHIVE%" del /q "%BACKEND_ARCHIVE%" 2>nul
echo.
echo ============================================================
echo Thunzi metric normalization deployment failed
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
