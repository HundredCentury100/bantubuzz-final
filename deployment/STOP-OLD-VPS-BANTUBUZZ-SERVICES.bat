@echo off
setlocal EnableExtensions

set "OLD_SERVER=173.212.245.22"
set "SSH_USER=root"
set "ROOT=%~dp0.."
set "REPORT_DIR=%ROOT%\deployment\vps\reports"

where ssh >nul 2>&1 || goto :missing_tools

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
echo [1/1] Stopping old VPS BantuBuzz services...
echo ============================================================
echo PASSWORD PROMPT: OLD VPS %OLD_SERVER%
echo ============================================================
ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=15 -o ServerAliveCountMax=20 ^
    %SSH_USER%@%OLD_SERVER% "set -e; echo '=== OLD VPS before stop ==='; hostname; date; echo; echo 'Systemd services before:'; systemctl list-units --type=service --all | grep -Ei 'bantubuzz|celery|gunicorn|apache2|messaging' || true; echo; echo 'Processes before:'; ps aux | grep -Ei '[b]antubuzz|[c]elery|[g]unicorn|[m]essaging-service|[n]ode.*messaging|[a]pache2' || true; echo; for svc in bantubuzz-celery-beat.service bantubuzz-celery-worker.service celery-beat.service celery-worker.service bantubuzz-backend.service bantubuzz-messaging.service apache2.service; do if systemctl list-unit-files \"$svc\" >/dev/null 2>&1 || systemctl list-units --all \"$svc\" >/dev/null 2>&1; then echo 'Stopping/disabling' $svc; systemctl disable --now \"$svc\" || true; fi; done; echo; echo 'Stopping leftover BantuBuzz runtime processes'; pkill -f '/var/www/bantubuzz/backend/venv/bin/celery' || true; pkill -f '/var/www/bantubuzz/backend/venv/bin/gunicorn' || true; pkill -f '/var/www/bantubuzz/.*messaging' || true; pkill -f 'messaging-service.*server' || true; sleep 3; echo; echo '=== OLD VPS after stop ==='; echo 'Systemd services after:'; systemctl list-units --type=service --all | grep -Ei 'bantubuzz|celery|gunicorn|apache2|messaging' || true; echo; echo 'Processes after:'; ps aux | grep -Ei '[b]antubuzz|[c]elery|[g]unicorn|[m]essaging-service|[n]ode.*messaging|[a]pache2' || true; echo; echo 'PostgreSQL and Redis intentionally left alone:'; systemctl is-active postgresql 2>/dev/null || true; systemctl is-active redis-server 2>/dev/null || true; echo BANTUBUZZ_OLD_VPS_SERVICES_STOPPED" 2>&1 | powershell.exe -NoProfile -Command ^
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
echo ERROR: Windows OpenSSH is required.
pause
exit /b 1
