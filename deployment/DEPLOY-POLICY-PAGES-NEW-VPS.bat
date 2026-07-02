@echo off
setlocal EnableExtensions

set "NEW_SERVER=13.140.159.150"
set "SSH_USER=root"
set "ROOT=%~dp0.."
set "FRONTEND_DIR=%ROOT%\frontend"
set "DIST_DIR=%FRONTEND_DIR%\dist"
set "ARCHIVE=%TEMP%\bantubuzz-policy-pages-frontend.tar.gz"
set "REMOTE_ARCHIVE=/tmp/bantubuzz-policy-pages-frontend.tar.gz"
set "REPORT_DIR=%ROOT%\deployment\vps\reports"

if not exist "%FRONTEND_DIR%\package.json" (
    echo ERROR: Frontend package.json not found:
    echo %FRONTEND_DIR%\package.json
    pause
    exit /b 1
)

where ssh >nul 2>&1 || goto :missing_tools
where scp >nul 2>&1 || goto :missing_tools
where tar >nul 2>&1 || goto :missing_tools

if not exist "%REPORT_DIR%" mkdir "%REPORT_DIR%"
for /f %%i in ('powershell.exe -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TIMESTAMP=%%i"
set "REPORT=%REPORT_DIR%\new-vps-policy-pages-%NEW_SERVER%-%TIMESTAMP%.txt"

echo ============================================================
echo BantuBuzz Policy Pages Frontend Deployment
echo ============================================================
echo.
echo NEW VPS: %SSH_USER%@%NEW_SERVER%
echo.
echo This deployment will:
echo   - Build the frontend locally
echo   - Upload only the compiled frontend dist
echo   - Back up the current frontend on the new VPS
echo   - Replace /var/www/bantubuzz/frontend
echo   - Reload Apache and verify the new policy routes
echo.
echo This deployment will NOT:
echo   - Touch backend code
echo   - Run database migrations
echo   - Restart backend, Celery, messaging, or CMS services
echo.
echo Report:
echo %REPORT%
echo.
pause

pushd "%FRONTEND_DIR%" >nul
if errorlevel 1 goto :failed

echo [1/5] Building frontend...
call npm run build > "%REPORT%" 2>&1
if errorlevel 1 (
    popd >nul
    goto :failed
)

echo.
echo [2/5] Packaging frontend dist...
if exist "%ARCHIVE%" del /q "%ARCHIVE%"
tar -czf "%ARCHIVE%" -C "%DIST_DIR%" .
if errorlevel 1 (
    popd >nul
    goto :failed
)
popd >nul

echo.
echo [3/5] Uploading frontend archive...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo ============================================================
scp "%ARCHIVE%" %SSH_USER%@%NEW_SERVER%:%REMOTE_ARCHIVE% >> "%REPORT%" 2>&1
if errorlevel 1 goto :failed

echo.
echo [4/5] Installing frontend and reloading Apache...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo ============================================================
ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=15 -o ServerAliveCountMax=20 ^
    %SSH_USER%@%NEW_SERVER% "set -e; TS=$(date +%%Y%%m%%d_%%H%%M%%S); mkdir -p /var/backups/bantubuzz; if [ -d /var/www/bantubuzz/frontend ]; then tar -czf /var/backups/bantubuzz/frontend-before-policy-pages-$TS.tar.gz -C /var/www/bantubuzz frontend; fi; rm -rf /var/www/bantubuzz/frontend; mkdir -p /var/www/bantubuzz/frontend; tar -xzf %REMOTE_ARCHIVE% -C /var/www/bantubuzz/frontend; chown -R www-data:www-data /var/www/bantubuzz/frontend; systemctl reload apache2; rm -f %REMOTE_ARCHIVE%; echo BANTUBUZZ_POLICY_PAGES_FRONTEND_DEPLOY_SUCCESS" >> "%REPORT%" 2>&1
if errorlevel 1 goto :failed

echo.
echo [5/5] Verifying public routes...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo ============================================================
ssh %SSH_USER%@%NEW_SERVER% "set -e; for path in /terms /policies/support /policies/harassment-abuse /policies/spam-solicitation; do echo Checking $path; curl -L -fsS -o /dev/null -w '%%{http_code}\n' https://bantubuzz.com$path; done" >> "%REPORT%" 2>&1
if errorlevel 1 goto :failed

if exist "%ARCHIVE%" del /q "%ARCHIVE%"

echo.
echo ============================================================
echo Policy pages frontend deployment completed
echo ============================================================
echo.
echo URLs:
echo   https://bantubuzz.com/terms
echo   https://bantubuzz.com/policies/support
echo   https://bantubuzz.com/policies/harassment-abuse
echo   https://bantubuzz.com/policies/spam-solicitation
echo.
echo Report:
echo %REPORT%
echo.
pause
exit /b 0

:failed
echo.
echo ============================================================
echo Policy pages deployment failed
echo ============================================================
echo.
echo Review:
echo %REPORT%
echo.
if exist "%ARCHIVE%" del /q "%ARCHIVE%"
pause
exit /b 1

:missing_tools
echo ERROR: Windows OpenSSH client and tar are required.
pause
exit /b 1
