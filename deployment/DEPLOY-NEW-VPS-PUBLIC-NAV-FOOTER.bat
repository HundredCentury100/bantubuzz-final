@echo off
setlocal EnableExtensions

set "NEW_SERVER=13.140.159.150"
set "SSH_USER=root"
set "ROOT=%~dp0.."
set "FRONTEND_ARCHIVE=%TEMP%\bantubuzz-public-nav-footer-frontend.tar.gz"
set "REPORT_DIR=%ROOT%\deployment\vps\reports"

where ssh >nul 2>&1 || goto :missing_tools
where scp >nul 2>&1 || goto :missing_tools
where tar >nul 2>&1 || goto :missing_tools

if not exist "%REPORT_DIR%" mkdir "%REPORT_DIR%"
for /f %%i in ('powershell.exe -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TIMESTAMP=%%i"
set "REPORT=%REPORT_DIR%\new-vps-public-nav-footer-%NEW_SERVER%-%TIMESTAMP%.txt"

echo ============================================================
echo BantuBuzz Public Nav/Footer Frontend Deployment
echo ============================================================
echo.
echo Target: %SSH_USER%@%NEW_SERVER%
echo.
echo This deployment will:
echo   - Build the current frontend
echo   - Upload only the compiled frontend dist
echo   - Replace /var/www/bantubuzz/frontend on the new VPS
echo   - Reload Apache
echo   - Check public API health
echo.
echo It will NOT change backend code, database, CMS, DNS, or services.
echo.
echo Report:
echo %REPORT%
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
echo [3/5] Uploading frontend archive...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo ============================================================
scp "%FRONTEND_ARCHIVE%" %SSH_USER%@%NEW_SERVER%:/tmp/
if errorlevel 1 goto :failed

echo.
echo [4/5] Extracting frontend and reloading Apache...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo ============================================================
ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=15 -o ServerAliveCountMax=20 ^
  %SSH_USER%@%NEW_SERVER% "set -e; TS=$(date +%%Y%%m%%d_%%H%%M%%S); BACKUP=/var/backups/bantubuzz/public-nav-footer-before-$TS; mkdir -p $BACKUP; tar --ignore-failed-read -czf $BACKUP/frontend-current.tar.gz -C /var/www/bantubuzz/frontend .; rm -rf /var/www/bantubuzz/frontend/assets /var/www/bantubuzz/frontend/index.html /var/www/bantubuzz/frontend/favicon.ico /var/www/bantubuzz/frontend/manifest.json /var/www/bantubuzz/frontend/message-push-sw.js; tar -xzf /tmp/bantubuzz-public-nav-footer-frontend.tar.gz -C /var/www/bantubuzz/frontend; chown -R bantubuzz:www-data /var/www/bantubuzz/frontend; apache2ctl configtest; systemctl reload apache2; curl -fsS https://bantubuzz.com/api/health; echo; rm -f /tmp/bantubuzz-public-nav-footer-frontend.tar.gz; echo BANTUBUZZ_PUBLIC_NAV_FOOTER_DEPLOY_SUCCESS" 2>&1 | powershell.exe -NoProfile -Command ^
  "$input | Tee-Object -FilePath '%REPORT%'; if (Select-String -Quiet -SimpleMatch 'BANTUBUZZ_PUBLIC_NAV_FOOTER_DEPLOY_SUCCESS' '%REPORT%') { exit 0 } else { exit 1 }"
if errorlevel 1 goto :failed

echo.
echo [5/5] Cleaning local archive...
del /q "%FRONTEND_ARCHIVE%" 2>nul

echo.
echo ============================================================
echo Public nav/footer deployed
echo ============================================================
echo.
echo Verify:
echo   https://bantubuzz.com/
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
echo Public nav/footer deployment failed
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
