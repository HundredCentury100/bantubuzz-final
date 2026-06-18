@echo off
setlocal EnableExtensions

set "OLD_SERVER=173.212.245.22"
set "SSH_USER=root"
set "ROOT=%~dp0.."
set "REMOTE_SCRIPT=%ROOT%\deployment\vps\stop-old-vps-bantubuzz-services.sh"
set "REPORT_DIR=%ROOT%\deployment\vps\reports"

where ssh >nul 2>&1 || goto :missing_tools
where scp >nul 2>&1 || goto :missing_tools

if not exist "%REMOTE_SCRIPT%" (
    echo ERROR: Old VPS stop helper not found.
    pause
    exit /b 1
)

if not exist "%REPORT_DIR%" mkdir "%REPORT_DIR%"
for /f %%i in ('powershell.exe -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TIMESTAMP=%%i"
set "REPORT=%REPORT_DIR%\old-vps-stop-bantubuzz-services-%OLD_SERVER%-%TIMESTAMP%.txt"

echo ============================================================
echo Stop OLD BantuBuzz VPS Services
echo ============================================================
echo.
echo OLD production VPS: %SSH_USER%@%OLD_SERVER%
echo.
echo This will stop and disable old BantuBuzz runtime services so
echo the migrated platform on the NEW VPS is the only active sender.
echo.
echo It will stop/disable if present:
echo   - bantubuzz-celery-beat.service
echo   - bantubuzz-celery-worker.service
echo   - celery-beat.service
echo   - celery-worker.service
echo   - bantubuzz-backend.service
echo   - bantubuzz-messaging.service
echo   - apache2.service
echo.
echo It will also kill old leftover BantuBuzz gunicorn/celery/node
echo runtime processes if they are still running.
echo.
echo It will NOT stop PostgreSQL, Redis, delete files, delete data,
echo change DNS, or modify the NEW VPS.
echo.
echo Report:
echo %REPORT%
echo.
pause

echo.
echo [1/2] Uploading old VPS stop helper...
echo ============================================================
echo PASSWORD PROMPT: OLD VPS %OLD_SERVER%
echo ============================================================
scp "%REMOTE_SCRIPT%" %SSH_USER%@%OLD_SERVER%:/tmp/stop-old-vps-bantubuzz-services.sh
if errorlevel 1 goto :failed

echo.
echo [2/2] Stopping old VPS BantuBuzz services...
echo ============================================================
echo PASSWORD PROMPT: OLD VPS %OLD_SERVER%
echo ============================================================
ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=15 -o ServerAliveCountMax=20 ^
    %SSH_USER%@%OLD_SERVER% "bash /tmp/stop-old-vps-bantubuzz-services.sh; rm -f /tmp/stop-old-vps-bantubuzz-services.sh" 2>&1 | powershell.exe -NoProfile -Command ^
    "$input | Tee-Object -FilePath '%REPORT%'; if (Select-String -Quiet -SimpleMatch 'BANTUBUZZ_OLD_VPS_SERVICES_STOPPED' '%REPORT%') { exit 0 } else { exit 1 }"
if errorlevel 1 goto :failed

echo.
echo ============================================================
echo OLD VPS BantuBuzz services stopped
echo ============================================================
echo.
echo This should stop the old daily 9 AM Celery Beat sender if it
echo was still running from the old VPS.
echo.
echo Report:
echo %REPORT%
echo.
pause
exit /b 0

:failed
echo.
echo ============================================================
echo Failed to stop OLD VPS services
echo ============================================================
echo.
echo Review:
echo %REPORT%
echo.
pause
exit /b 1

:missing_tools
echo ERROR: Windows OpenSSH and scp are required.
pause
exit /b 1
