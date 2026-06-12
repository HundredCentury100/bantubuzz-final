@echo off
setlocal EnableExtensions

set "SERVER=13.140.159.150"
set "SSH_USER=root"
set "ROOT=%~dp0.."
set "CMS_ROOT=D:\Bantubuzz-headless-CMS"
set "REMOTE_SCRIPT=%ROOT%\deployment\vps\update-headless-cms.sh"
set "REPORT_DIR=%ROOT%\deployment\vps\reports"
set "SOURCE_ARCHIVE=%TEMP%\bantubuzz-headless-cms-update.tar.gz"

if not exist "%CMS_ROOT%\package.json" (
    echo ERROR: CMS project not found:
    echo %CMS_ROOT%
    pause
    exit /b 1
)

if not exist "%REMOTE_SCRIPT%" (
    echo ERROR: CMS update script not found:
    echo %REMOTE_SCRIPT%
    pause
    exit /b 1
)

if not exist "%REPORT_DIR%" mkdir "%REPORT_DIR%"
for /f %%i in ('powershell.exe -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TIMESTAMP=%%i"
set "REPORT=%REPORT_DIR%\cms-metadata-bridge-update-%SERVER%-%TIMESTAMP%.txt"

echo ============================================================
echo Deploy CMS Metadata and Bridge Update
echo ============================================================
echo.
echo Source: %CMS_ROOT%
echo Server: %SSH_USER%@%SERVER%
echo.
echo This update will:
echo   - Upload the current CMS source
echo   - Back up the currently deployed CMS source
echo   - Preserve the CMS database, admin users, media, and secrets
echo   - Preserve Apache and existing SSL certificates
echo   - Reinstall locked dependencies, build, and restart the CMS
echo   - Verify CMS admin, content API, and signed platform bridge
echo.
echo It will NOT seed content, recreate migrations, or request SSL.
echo.
echo Report:
echo %REPORT%
echo.
pause

echo.
echo [1/5] Verifying CMS source...
pushd "%CMS_ROOT%"
call npm run typecheck
if errorlevel 1 goto :failed_popd
popd

echo.
echo [2/5] Creating CMS update archive...
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
echo [3/5] Uploading CMS update...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %SERVER%
echo ============================================================
scp "%SOURCE_ARCHIVE%" "%REMOTE_SCRIPT%" %SSH_USER%@%SERVER%:/tmp/
if errorlevel 1 goto :failed

echo.
echo [4/5] Installing and verifying CMS update...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %SERVER%
echo ============================================================
ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=15 -o ServerAliveCountMax=30 ^
    %SSH_USER%@%SERVER% "mv /tmp/update-headless-cms.sh /tmp/bantubuzz-update-headless-cms.sh; bash /tmp/bantubuzz-update-headless-cms.sh" 2>&1 | powershell.exe -NoProfile -Command ^
    "$input | Tee-Object -FilePath '%REPORT%'; if (Select-String -Quiet -SimpleMatch 'BANTUBUZZ_CMS_UPDATE_SUCCESS' '%REPORT%') { exit 0 } else { exit 1 }"
if errorlevel 1 goto :failed

echo.
echo [5/5] Cleaning local archive...
if exist "%SOURCE_ARCHIVE%" del /q "%SOURCE_ARCHIVE%"

echo.
echo ============================================================
echo CMS metadata and bridge update completed
echo ============================================================
echo.
echo Open:
echo https://app.bantubuzz.com/admin
echo https://bantubuzz.com/blog
echo.
echo Report:
echo %REPORT%
echo.
pause
exit /b 0

:failed_popd
popd

:failed
if exist "%SOURCE_ARCHIVE%" del /q "%SOURCE_ARCHIVE%"
echo.
echo ============================================================
echo CMS metadata and bridge update failed
echo ============================================================
echo.
echo Review:
echo %REPORT%
echo.
pause
exit /b 1
