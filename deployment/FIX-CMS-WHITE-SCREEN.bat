@echo off
setlocal EnableExtensions

set "SERVER=13.140.159.150"
set "SSH_USER=root"
set "ROOT=%~dp0.."
set "CMS_ROOT=D:\Bantubuzz-headless-CMS"
set "LAYOUT=%CMS_ROOT%\apps\web\src\app\(payload)\layout.tsx"
set "REMOTE_SCRIPT=%ROOT%\deployment\vps\fix-cms-white-screen.sh"
set "BROWSER_CHECK=%ROOT%\deployment\vps\check-cms-admin.mjs"
set "REPORT_DIR=%ROOT%\deployment\vps\reports"

if not exist "%LAYOUT%" (
    echo ERROR: Updated CMS layout was not found:
    echo %LAYOUT%
    pause
    exit /b 1
)

if not exist "%REMOTE_SCRIPT%" (
    echo ERROR: CMS repair script was not found:
    echo %REMOTE_SCRIPT%
    pause
    exit /b 1
)

if not exist "%BROWSER_CHECK%" (
    echo ERROR: Clean-browser verification script was not found:
    echo %BROWSER_CHECK%
    pause
    exit /b 1
)

if not exist "%REPORT_DIR%" mkdir "%REPORT_DIR%"
for /f %%i in ('powershell.exe -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TIMESTAMP=%%i"
set "REPORT=%REPORT_DIR%\cms-white-screen-fix-%SERVER%-%TIMESTAMP%.txt"

echo ============================================================
echo Fix BantuBuzz CMS White Screen
echo ============================================================
echo.
echo This repair removes the custom pre-hydration paint guard,
echo rebuilds only the headless CMS, restarts its service, and
echo verifies the public first-administrator page.
echo.
pause

echo.
echo [1/4] Verifying the CMS source...
pushd "%CMS_ROOT%"
call npm run typecheck
if errorlevel 1 goto :failed_popd
popd

echo.
echo [2/4] Uploading the corrected Payload layout...
scp "%LAYOUT%" %SSH_USER%@%SERVER%:/tmp/bantubuzz-cms-layout.tsx
if errorlevel 1 goto :failed

echo.
echo [3/4] Rebuilding and restarting the CMS...
ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=15 -o ServerAliveCountMax=12 ^
    %SSH_USER%@%SERVER% "bash -s" < "%REMOTE_SCRIPT%" 2>&1 | powershell.exe -NoProfile -Command ^
    "$input | Tee-Object -FilePath '%REPORT%'; if (Select-String -Quiet -SimpleMatch 'BANTUBUZZ_CMS_WHITE_SCREEN_FIX_SUCCESS' '%REPORT%') { exit 0 } else { exit 1 }"
if errorlevel 1 goto :failed

echo.
echo [4/4] Checking the first-administrator page in clean Chrome...
powershell.exe -NoProfile -Command ^
    "$output = & node '%BROWSER_CHECK%' 2>&1; $code = $LASTEXITCODE; $output | Tee-Object -FilePath '%REPORT%' -Append; exit $code"
if errorlevel 1 goto :failed

echo.
echo ============================================================
echo CMS white-screen repair completed
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
echo CMS white-screen repair failed
echo ============================================================
echo.
echo Review:
echo %REPORT%
echo.
pause
exit /b 1
