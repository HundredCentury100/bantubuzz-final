@echo off
setlocal EnableExtensions

set "NEW_SERVER=13.140.159.150"
set "SSH_USER=root"
set "ROOT=%~dp0.."
set "REMOTE_FRONTEND=/var/www/bantubuzz/frontend"
set "FRONTEND_ARCHIVE=%TEMP%\bantubuzz-new-vps-frontend-only.tar.gz"
set "REPORT_DIR=%ROOT%\deployment\vps\reports"

where ssh >nul 2>&1 || goto :missing_tools
where scp >nul 2>&1 || goto :missing_tools
where tar >nul 2>&1 || goto :missing_tools

if not exist "%REPORT_DIR%" mkdir "%REPORT_DIR%"
for /f %%i in ('powershell.exe -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TIMESTAMP=%%i"
set "REPORT=%REPORT_DIR%\new-vps-frontend-only-%NEW_SERVER%-%TIMESTAMP%.txt"

echo ============================================================
echo BantuBuzz New VPS Frontend Only Deployment
echo ============================================================
echo.
echo Target: %SSH_USER%@%NEW_SERVER%
echo.
echo This deployment will:
echo   - Build the current frontend
echo   - Upload only the frontend dist archive
echo   - Replace %REMOTE_FRONTEND% contents
echo   - Reload Apache and check public health
echo.
echo It will NOT change backend code, database, CMS, messaging, DNS, or Apache configs.
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
    %SSH_USER%@%NEW_SERVER% "set -e; TS=$(date +%%Y%%m%%d_%%H%%M%%S); BACKUP=/var/backups/bantubuzz/frontend-only-before-$TS; echo Creating frontend backup at $BACKUP; mkdir -p $BACKUP; tar --ignore-failed-read -czf $BACKUP/frontend-current.tar.gz -C %REMOTE_FRONTEND% .; rm -rf %REMOTE_FRONTEND%/assets %REMOTE_FRONTEND%/index.html %REMOTE_FRONTEND%/favicon.ico %REMOTE_FRONTEND%/manifest.json %REMOTE_FRONTEND%/message-push-sw.js; tar -xzf /tmp/bantubuzz-new-vps-frontend-only.tar.gz -C %REMOTE_FRONTEND%; chown -R bantubuzz:www-data %REMOTE_FRONTEND%; systemctl reload apache2; echo Public health:; curl -fsS https://bantubuzz.com/api/health; echo; rm -f /tmp/bantubuzz-new-vps-frontend-only.tar.gz; echo BANTUBUZZ_NEW_VPS_FRONTEND_ONLY_SUCCESS" 2>&1 | powershell.exe -NoProfile -Command ^
    "$input | Tee-Object -FilePath '%REPORT%'; if (Select-String -Quiet -SimpleMatch 'BANTUBUZZ_NEW_VPS_FRONTEND_ONLY_SUCCESS' '%REPORT%') { exit 0 } else { exit 1 }"
if errorlevel 1 goto :failed

echo.
echo [5/5] Cleaning local archive...
del /q "%FRONTEND_ARCHIVE%" 2>nul

echo.
echo ============================================================
echo Frontend-only deployment complete
echo ============================================================
echo.
echo Open:
echo   https://bantubuzz.com/creator/profile/edit
echo   https://bantubuzz.com/browse/creators
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
echo Frontend-only deployment failed
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
