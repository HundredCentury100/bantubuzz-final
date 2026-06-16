@echo off
setlocal EnableExtensions

set "NEW_SERVER=13.140.159.150"
set "SSH_USER=root"
set "ROOT=%~dp0.."
set "REMOTE_ROOT=/var/www/bantubuzz"
set "FRONTEND_ARCHIVE=%TEMP%\bantubuzz-new-vps-qa-analytics-brand-profile-frontend.tar.gz"
set "REPORT_DIR=%ROOT%\deployment\vps\reports"

where ssh >nul 2>&1 || goto :missing_tools
where scp >nul 2>&1 || goto :missing_tools
where tar >nul 2>&1 || goto :missing_tools

if not exist "%REPORT_DIR%" mkdir "%REPORT_DIR%"
for /f %%i in ('powershell.exe -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TIMESTAMP=%%i"
set "REPORT=%REPORT_DIR%\new-vps-qa-analytics-brand-profile-fixes-%NEW_SERVER%-%TIMESTAMP%.txt"

echo ============================================================
echo BantuBuzz New VPS QA Fix Deployment
echo ============================================================
echo.
echo Target: %SSH_USER%@%NEW_SERVER%
echo.
echo This targeted deployment will:
echo   - Build the current frontend
echo   - Deploy the frontend build to %REMOTE_ROOT%/frontend
echo   - Deploy backend/app/models/brand_profile.py
echo   - Compile the backend model
echo   - Restart bantubuzz-backend and reload Apache
echo   - Check public and local health endpoints
echo.
echo It will NOT change the database, CMS, messaging service, or DNS.
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
echo [3/6] Uploading frontend archive and backend model...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo ============================================================
scp ^
    "%FRONTEND_ARCHIVE%" ^
    "%ROOT%\backend\app\models\brand_profile.py" ^
    %SSH_USER%@%NEW_SERVER%:/tmp/
if errorlevel 1 goto :failed

echo.
echo [4/6] Installing files, compiling backend, and restarting services...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo ============================================================
ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=15 -o ServerAliveCountMax=20 ^
    %SSH_USER%@%NEW_SERVER% "set -e; cd %REMOTE_ROOT%; TS=$(date +%%Y%%m%%d_%%H%%M%%S); echo 'Creating targeted backup at /var/backups/bantubuzz/qa-analytics-brand-profile-before-'$TS; mkdir -p /var/backups/bantubuzz/qa-analytics-brand-profile-before-$TS; cp -a backend/app/models/brand_profile.py /var/backups/bantubuzz/qa-analytics-brand-profile-before-$TS/brand_profile.py; tar --ignore-failed-read -czf /var/backups/bantubuzz/qa-analytics-brand-profile-before-$TS/frontend-current.tar.gz -C frontend .; install -m 0644 /tmp/brand_profile.py backend/app/models/brand_profile.py; rm -rf frontend/assets frontend/index.html frontend/favicon.ico frontend/manifest.json frontend/message-push-sw.js; tar -xzf /tmp/bantubuzz-new-vps-qa-analytics-brand-profile-frontend.tar.gz -C frontend; chown -R bantubuzz:www-data frontend backend/app/models/brand_profile.py; cd backend; venv/bin/python -c \"import py_compile; py_compile.compile('app/models/brand_profile.py', cfile='/tmp/brand_profile.pyc', doraise=True)\"; rm -f /tmp/brand_profile.pyc; systemctl restart bantubuzz-backend.service; systemctl reload apache2; sleep 4; systemctl --no-pager --full status bantubuzz-backend.service | sed -n '1,18p'; echo 'Local health:'; curl -fsS http://127.0.0.1:8002/api/health; echo; echo 'Public health:'; curl -fsS https://bantubuzz.com/api/health; echo; rm -f /tmp/bantubuzz-new-vps-qa-analytics-brand-profile-frontend.tar.gz /tmp/brand_profile.py; echo BANTUBUZZ_NEW_VPS_QA_ANALYTICS_BRAND_PROFILE_FIXES_SUCCESS" 2>&1 | powershell.exe -NoProfile -Command ^
    "$input | Tee-Object -FilePath '%REPORT%'; if (Select-String -Quiet -SimpleMatch 'BANTUBUZZ_NEW_VPS_QA_ANALYTICS_BRAND_PROFILE_FIXES_SUCCESS' '%REPORT%') { exit 0 } else { exit 1 }"
if errorlevel 1 goto :failed

echo.
echo [5/6] Cleaning local archive...
del /q "%FRONTEND_ARCHIVE%" 2>nul

echo.
echo [6/6] Deployment complete.
echo.
echo ============================================================
echo New VPS QA fixes deployed
echo ============================================================
echo.
echo Open:
echo   https://bantubuzz.com/brand/analytics
echo   https://bantubuzz.com/brand/profile/edit
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
echo New VPS QA fix deployment failed
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
