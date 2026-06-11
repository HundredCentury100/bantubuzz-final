@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "SERVER=13.140.159.150"
set "SSH_USER=root"
set "ROOT=%~dp0.."
set "CMS_ROOT=D:\Bantubuzz-headless-CMS"
set "REMOTE_SCRIPT=%ROOT%\deployment\vps\deploy-headless-cms.sh"
set "REPORT_DIR=%ROOT%\deployment\vps\reports"
set "SOURCE_ARCHIVE=%TEMP%\bantubuzz-headless-cms.tar.gz"
set "MIGRATION_ARCHIVE=%TEMP%\bantubuzz-cms-postgres-migrations.tar.gz"

if not exist "%CMS_ROOT%\package.json" (
    echo ERROR: CMS project not found at:
    echo %CMS_ROOT%
    pause
    exit /b 1
)

if not exist "%REMOTE_SCRIPT%" (
    echo ERROR: Remote deployment script not found:
    echo %REMOTE_SCRIPT%
    pause
    exit /b 1
)

set /p "CERTBOT_EMAIL=Enter the email address for Let's Encrypt notices: "
if "%CERTBOT_EMAIL%"=="" (
    echo ERROR: An email address is required.
    pause
    exit /b 1
)
powershell.exe -NoProfile -Command ^
    "$value = $env:CERTBOT_EMAIL; if ($value -match '^[A-Za-z0-9._+%%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$') { exit 0 } else { exit 1 }"
if errorlevel 1 (
    echo ERROR: Enter a valid email address using standard email characters.
    pause
    exit /b 1
)
for /f "usebackq delims=" %%i in (`powershell.exe -NoProfile -Command ^
    "[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($env:CERTBOT_EMAIL))"`) do set "CERTBOT_EMAIL_B64=%%i"

if not exist "%REPORT_DIR%" mkdir "%REPORT_DIR%"
for /f %%i in ('powershell.exe -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TIMESTAMP=%%i"
set "REPORT=%REPORT_DIR%\cms-deploy-%SERVER%-%TIMESTAMP%.txt"

echo ============================================================
echo Deploy BantuBuzz Headless CMS
echo ============================================================
echo.
echo Source: %CMS_ROOT%
echo Server: %SSH_USER%@%SERVER%
echo Public admin: https://app.bantubuzz.com/admin
echo.
echo This deployment will:
echo   - Upload the CMS source without local secrets or databases
echo   - Generate and apply the first PostgreSQL migration
echo   - Seed baseline authority content
echo   - Build and start the CMS web service on port 3010
echo   - Configure Apache and Let's Encrypt for app.bantubuzz.com
echo   - Download the generated PostgreSQL migration locally
echo.
echo The main platform and old production VPS will not be changed.
echo The CMS content worker will remain disabled until provider
echo credentials are configured.
echo.
pause

echo.
echo [1/7] Verifying CMS source...
pushd "%CMS_ROOT%"
call npm run typecheck
if errorlevel 1 goto :failed
popd

echo.
echo [2/7] Creating CMS source archive...
if exist "%SOURCE_ARCHIVE%" del /q "%SOURCE_ARCHIVE%"
tar -czf "%SOURCE_ARCHIVE%" ^
    --exclude=.git ^
    --exclude=node_modules ^
    --exclude=.next ^
    --exclude=apps/web/.next ^
    --exclude=.env ^
    --exclude=.env.local ^
    --exclude=apps/web/.env.local ^
    --exclude=storage ^
    --exclude=apps/web/storage ^
    --exclude=apps/web/media ^
    -C "%CMS_ROOT%" .
if errorlevel 1 goto :failed

echo.
echo [3/7] Uploading CMS source...
scp "%SOURCE_ARCHIVE%" %SSH_USER%@%SERVER%:/tmp/bantubuzz-headless-cms.tar.gz
if errorlevel 1 goto :failed

echo.
echo [4/7] Deploying, migrating, building, and configuring TLS...
ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=15 -o ServerAliveCountMax=12 ^
    %SSH_USER%@%SERVER% "CERTBOT_EMAIL=$(printf '%%s' '%CERTBOT_EMAIL_B64%' | base64 -d) bash -s" < "%REMOTE_SCRIPT%" 2>&1 | powershell.exe -NoProfile -Command ^
    "$input | Tee-Object -FilePath '%REPORT%'; if (Select-String -Quiet -SimpleMatch 'BANTUBUZZ_CMS_DEPLOY_SUCCESS' '%REPORT%') { exit 0 } else { exit 1 }"
if errorlevel 1 goto :failed

echo.
echo [5/7] Downloading generated PostgreSQL migration...
if exist "%MIGRATION_ARCHIVE%" del /q "%MIGRATION_ARCHIVE%"
scp %SSH_USER%@%SERVER%:/tmp/bantubuzz-cms-postgres-migrations.tar.gz "%MIGRATION_ARCHIVE%"
if errorlevel 1 goto :failed

echo.
echo [6/7] Updating local PostgreSQL migration directory...
if not exist "%CMS_ROOT%\apps\web\src\migrations-postgres" mkdir "%CMS_ROOT%\apps\web\src\migrations-postgres"
tar -xzf "%MIGRATION_ARCHIVE%" -C "%CMS_ROOT%\apps\web\src\migrations-postgres"
if errorlevel 1 goto :failed

echo.
echo [7/7] Final local verification...
pushd "%CMS_ROOT%"
call npm run typecheck
if errorlevel 1 goto :failed_popd
git status --short
popd

del /q "%SOURCE_ARCHIVE%" 2>nul
del /q "%MIGRATION_ARCHIVE%" 2>nul

echo.
echo ============================================================
echo CMS deployment completed
echo ============================================================
echo.
echo Open: https://app.bantubuzz.com/admin
echo.
echo Create the first administrator account there. The first user
echo is automatically assigned the super_admin role.
echo.
echo Send this report to Codex:
echo %REPORT%
echo.
pause
exit /b 0

:failed_popd
popd

:failed
echo.
echo ============================================================
echo CMS deployment failed
echo ============================================================
echo.
echo Review the output above and this report if it was created:
echo %REPORT%
echo.
pause
exit /b 1
