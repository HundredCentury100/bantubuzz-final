@echo off
setlocal EnableExtensions

set "NEW_SERVER=13.140.159.150"
set "SSH_USER=root"
set "ROOT=%~dp0.."
set "FRONTEND_ARCHIVE=%TEMP%\bantubuzz-new-vps-frontend-staging-fix.tar.gz"
set "REPORT_DIR=%ROOT%\deployment\vps\reports"

where ssh >nul 2>&1 || goto :missing_tools
where scp >nul 2>&1 || goto :missing_tools
where tar >nul 2>&1 || goto :missing_tools

if not exist "%REPORT_DIR%" mkdir "%REPORT_DIR%"
for /f %%i in ('powershell.exe -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TIMESTAMP=%%i"
set "REPORT=%REPORT_DIR%\new-vps-frontend-staging-fix-%NEW_SERVER%-%TIMESTAMP%.txt"

echo ============================================================
echo Deploy New VPS Frontend Staging Fix
echo ============================================================
echo.
echo This rebuilds the frontend with same-origin API URLs and updates
echo Apache messaging proxy rules on the new VPS only.
echo.
echo It does not change the database, backend code, CMS, or DNS.
echo.
pause

echo.
echo [1/5] Building frontend...
pushd "%ROOT%\frontend"
call npm run build
if errorlevel 1 goto :failed_popd
popd

echo.
echo [2/5] Packaging frontend dist...
if exist "%FRONTEND_ARCHIVE%" del /q "%FRONTEND_ARCHIVE%"
tar -czf "%FRONTEND_ARCHIVE%" -C "%ROOT%\frontend\dist" .
if errorlevel 1 goto :failed

echo.
echo [3/5] Uploading frontend and Apache configs...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo ============================================================
scp ^
    "%FRONTEND_ARCHIVE%" ^
    "%ROOT%\deployment\vps\bantubuzz-platform-staging.conf" ^
    "%ROOT%\deployment\vps\bantubuzz-platform.conf" ^
    %SSH_USER%@%NEW_SERVER%:/tmp/
if errorlevel 1 goto :failed

echo.
echo [4/5] Extracting frontend and reloading Apache...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo ============================================================
ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=15 -o ServerAliveCountMax=20 ^
    %SSH_USER%@%NEW_SERVER% "set -e; install -m 0644 /tmp/bantubuzz-platform-staging.conf /etc/apache2/sites-available/bantubuzz-platform-staging.conf; if [ -f /etc/apache2/sites-available/bantubuzz-platform.conf ]; then install -m 0644 /tmp/bantubuzz-platform.conf /etc/apache2/sites-available/bantubuzz-platform.conf; fi; rm -rf /var/www/bantubuzz/frontend/assets /var/www/bantubuzz/frontend/index.html /var/www/bantubuzz/frontend/favicon.ico /var/www/bantubuzz/frontend/manifest.json /var/www/bantubuzz/frontend/message-push-sw.js; tar -xzf /tmp/bantubuzz-new-vps-frontend-staging-fix.tar.gz -C /var/www/bantubuzz/frontend; chown -R bantubuzz:www-data /var/www/bantubuzz/frontend; apache2ctl configtest; systemctl reload apache2; curl -fsS -H 'Host: 13.140.159.150' http://127.0.0.1/api/health; echo; curl -fsS http://127.0.0.1:8002/api/creators/leaderboard?limit=2 | head -c 600; echo; rm -f /tmp/bantubuzz-new-vps-frontend-staging-fix.tar.gz /tmp/bantubuzz-platform-staging.conf /tmp/bantubuzz-platform.conf; echo BANTUBUZZ_NEW_VPS_FRONTEND_STAGING_FIX_SUCCESS" 2>&1 | powershell.exe -NoProfile -Command ^
    "$input | Tee-Object -FilePath '%REPORT%'; if (Select-String -Quiet -SimpleMatch 'BANTUBUZZ_NEW_VPS_FRONTEND_STAGING_FIX_SUCCESS' '%REPORT%') { exit 0 } else { exit 1 }"
if errorlevel 1 goto :failed

echo.
echo [5/5] Done.
del /q "%FRONTEND_ARCHIVE%" 2>nul

echo.
echo ============================================================
echo Frontend staging fix deployed
echo ============================================================
echo.
echo Open: http://%NEW_SERVER%/leaderboard
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
echo Frontend staging fix failed
echo ============================================================
echo.
echo Review:
echo %REPORT%
echo.
pause
exit /b 1

:missing_tools
echo ERROR: Windows OpenSSH and tar are required.
pause
exit /b 1
