@echo off
setlocal EnableExtensions

set "SERVER=13.140.159.150"
set "SSH_USER=root"
set "ROOT=%~dp0.."
set "CMS_ROOT=D:\Bantubuzz-headless-CMS"
set "REMOTE_SCRIPT=%ROOT%\deployment\vps\deploy-cms-footer-nav.sh"
set "ARCHIVE=%TEMP%\bantubuzz-cms-footer-nav.tar.gz"
set "REPORT_DIR=%ROOT%\deployment\vps\reports"

if not exist "%CMS_ROOT%\package.json" (
    echo ERROR: CMS project not found at %CMS_ROOT%
    pause
    exit /b 1
)

if not exist "%REMOTE_SCRIPT%" (
    echo ERROR: CMS footer deployment script not found.
    pause
    exit /b 1
)

where ssh >nul 2>&1 || goto :missing_tools
where scp >nul 2>&1 || goto :missing_tools
where tar >nul 2>&1 || goto :missing_tools

if not exist "%REPORT_DIR%" mkdir "%REPORT_DIR%"
for /f %%i in ('powershell.exe -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TIMESTAMP=%%i"
set "REPORT=%REPORT_DIR%\cms-footer-nav-%SERVER%-%TIMESTAMP%.txt"

echo ============================================================
echo Deploy BantuBuzz CMS Footer Navigation
echo ============================================================
echo.
echo Target: %SSH_USER%@%SERVER%
echo.
echo This deployment will:
echo   - Verify the local CMS build/typecheck
echo   - Upload only the CMS footer shell and stylesheet files
echo   - Rebuild and restart only the CMS web service
echo   - Verify the public blog footer links
echo.
echo It will NOT run migrations, install dependencies, change
echo PostgreSQL, Apache, SSL, CMS users, media, or article content.
echo.
echo Report:
echo %REPORT%
echo.
pause

echo.
echo [1/4] Verifying local CMS changes...
pushd "%CMS_ROOT%"
call npm.cmd --workspace apps/web run typecheck
if errorlevel 1 goto :failed_popd
popd

echo.
echo [2/4] Packaging only required CMS files...
if exist "%ARCHIVE%" del /q "%ARCHIVE%"
tar -czf "%ARCHIVE%" -C "%CMS_ROOT%" ^
    "apps/web/src/app/globals.css" ^
    "apps/web/src/components/editorial-shell.tsx"
if errorlevel 1 goto :failed

echo.
echo [3/4] Uploading targeted CMS footer release...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %SERVER%
echo ============================================================
scp "%ARCHIVE%" "%REMOTE_SCRIPT%" %SSH_USER%@%SERVER%:/tmp/
if errorlevel 1 goto :failed

echo.
echo [4/4] Installing, rebuilding, restarting, and verifying...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %SERVER%
echo ============================================================
ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=15 -o ServerAliveCountMax=60 ^
    %SSH_USER%@%SERVER% "bash /tmp/deploy-cms-footer-nav.sh" 2>&1 | powershell.exe -NoProfile -Command ^
    "$input | Tee-Object -FilePath '%REPORT%'; if (Select-String -Quiet -SimpleMatch 'BANTUBUZZ_CMS_FOOTER_NAV_SUCCESS' '%REPORT%') { exit 0 } else { exit 1 }"
if errorlevel 1 goto :failed

del /q "%ARCHIVE%" 2>nul

echo.
echo ============================================================
echo CMS footer navigation deployed successfully
echo ============================================================
echo.
echo Verify:
echo   https://bantubuzz.com/blog
echo.
echo Report:
echo %REPORT%
echo.
pause
exit /b 0

:failed_popd
popd

:failed
if exist "%ARCHIVE%" del /q "%ARCHIVE%" 2>nul
echo.
echo ============================================================
echo CMS footer navigation deployment failed
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
