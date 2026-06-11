@echo off
setlocal EnableExtensions

set "SERVER=13.140.159.150"
set "SSH_USER=root"
set "ROOT=%~dp0.."
set "CMS_ROOT=D:\Bantubuzz-headless-CMS"
set "IMPORT_MAP=%CMS_ROOT%\apps\web\src\app\(payload)\admin\importMap.js"
set "WEB_PACKAGE=%CMS_ROOT%\apps\web\package.json"
set "NEXT_CONFIG=%CMS_ROOT%\apps\web\next.config.mjs"
set "REMOTE_SCRIPT=%ROOT%\deployment\vps\fix-cms-payload-importmap.sh"
set "BROWSER_CHECK=%ROOT%\deployment\vps\check-cms-admin.mjs"
set "REPORT_DIR=%ROOT%\deployment\vps\reports"

for %%F in ("%IMPORT_MAP%" "%WEB_PACKAGE%" "%NEXT_CONFIG%" "%REMOTE_SCRIPT%" "%BROWSER_CHECK%") do (
    if not exist "%%~F" (
        echo ERROR: Required repair file was not found:
        echo %%~F
        pause
        exit /b 1
    )
)

if not exist "%REPORT_DIR%" mkdir "%REPORT_DIR%"
for /f %%i in ('powershell.exe -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TIMESTAMP=%%i"
set "REPORT=%REPORT_DIR%\cms-payload-white-screen-%SERVER%-%TIMESTAMP%.txt"

echo ============================================================
echo Fix BantuBuzz CMS Payload White Screen
echo ============================================================
echo.
echo Root cause:
echo   Payload's generated admin import map omitted the S3 client
echo   component, so the admin React view never finished mounting.
echo.
echo This repair uploads only the corrected Payload files, rebuilds
echo the CMS, restarts it, and verifies the real form in clean Chrome.
echo.
pause

echo.
echo [1/5] Verifying the CMS source...
pushd "%CMS_ROOT%"
call npm run typecheck
if errorlevel 1 goto :failed_popd
findstr /C:"@payloadcms/storage-s3/client#S3ClientUploadHandler" "%IMPORT_MAP%" >nul
if errorlevel 1 (
    echo ERROR: The corrected Payload S3 import is missing.
    goto :failed_popd
)
popd

echo.
echo [2/5] Uploading the corrected Payload files...
scp "%IMPORT_MAP%" %SSH_USER%@%SERVER%:/tmp/bantubuzz-cms-importMap.js
if errorlevel 1 goto :failed
scp "%WEB_PACKAGE%" %SSH_USER%@%SERVER%:/tmp/bantubuzz-cms-web-package.json
if errorlevel 1 goto :failed
scp "%NEXT_CONFIG%" %SSH_USER%@%SERVER%:/tmp/bantubuzz-cms-next.config.mjs
if errorlevel 1 goto :failed

echo.
echo [3/5] Rebuilding and restarting the CMS...
ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=15 -o ServerAliveCountMax=12 ^
    %SSH_USER%@%SERVER% "bash -s" < "%REMOTE_SCRIPT%" 2>&1 | powershell.exe -NoProfile -Command ^
    "$input | Tee-Object -FilePath '%REPORT%'; if (Select-String -Quiet -SimpleMatch 'BANTUBUZZ_CMS_PAYLOAD_IMPORTMAP_FIX_SUCCESS' '%REPORT%') { exit 0 } else { exit 1 }"
if errorlevel 1 goto :failed

echo.
echo [4/5] Checking the first-administrator form in clean Chrome...
node "%BROWSER_CHECK%" https://app.bantubuzz.com/admin/create-first-user 2>&1 | powershell.exe -NoProfile -Command ^
    "$input | Tee-Object -FilePath '%REPORT%' -Append"
if errorlevel 1 goto :failed

echo.
echo [5/5] Repair verified.
echo.
echo ============================================================
echo CMS Payload white-screen repair completed
echo ============================================================
echo.
echo Open:
echo https://app.bantubuzz.com/admin/create-first-user
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
echo CMS Payload white-screen repair failed
echo ============================================================
echo.
echo Review:
echo %REPORT%
echo.
pause
exit /b 1
