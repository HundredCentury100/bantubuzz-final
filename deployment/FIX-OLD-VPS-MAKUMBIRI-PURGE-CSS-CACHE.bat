@echo off
setlocal EnableExtensions

set "OLD_SERVER=173.212.245.22"
set "SSH_USER=root"
set "ROOT=%~dp0.."
set "REMOTE_SCRIPT=%ROOT%\deployment\vps\fix-old-vps-makumbiri-purge-css-cache.sh"
set "REPORT_DIR=%ROOT%\deployment\vps\reports"

where ssh >nul 2>&1 || goto :missing_tools
where scp >nul 2>&1 || goto :missing_tools

if not exist "%REPORT_DIR%" mkdir "%REPORT_DIR%"
for /f %%i in ('powershell.exe -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TIMESTAMP=%%i"
set "REPORT=%REPORT_DIR%\old-vps-makumbiri-purge-css-cache-%OLD_SERVER%-%TIMESTAMP%.txt"

echo ============================================================
echo Makumbiri WordPress Public CSS Cache Purge
echo ============================================================
echo.
echo Target: %SSH_USER%@%OLD_SERVER%
echo.
echo This targeted fix will:
echo   - Back up Makumbiri LiteSpeed/cache generated files
echo   - Purge only Makumbiri public optimization cache
echo   - Keep WordPress uploads, theme files, database, and Zimquest untouched
echo   - Request the public homepage to trigger fresh CSS generation
echo   - Verify the fresh public CSS bundle is served as text/css
echo.
echo Report:
echo %REPORT%
echo.
pause

echo [1/2] Uploading remote cache purge script...
echo ============================================================
echo PASSWORD PROMPT: OLD VPS %OLD_SERVER%
echo ============================================================
scp "%REMOTE_SCRIPT%" %SSH_USER%@%OLD_SERVER%:/tmp/fix-old-vps-makumbiri-purge-css-cache.sh
if errorlevel 1 goto :failed

echo.
echo [2/2] Purging public CSS cache and verifying fresh bundle...
echo ============================================================
echo PASSWORD PROMPT: OLD VPS %OLD_SERVER%
echo ============================================================
ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=15 -o ServerAliveCountMax=12 ^
    %SSH_USER%@%OLD_SERVER% "bash /tmp/fix-old-vps-makumbiri-purge-css-cache.sh; rm -f /tmp/fix-old-vps-makumbiri-purge-css-cache.sh" 2>&1 | powershell.exe -NoProfile -Command ^
    "$input | Tee-Object -FilePath '%REPORT%'; if (Select-String -Quiet -SimpleMatch 'MAKUMBIRI_PUBLIC_CSS_CACHE_PURGE_SUCCESS' '%REPORT%') { exit 0 } else { exit 1 }"
if errorlevel 1 goto :failed

echo.
echo ============================================================
echo Makumbiri public CSS cache purge complete
echo ============================================================
echo.
echo Report:
echo %REPORT%
echo.
pause
exit /b 0

:failed
echo.
echo ============================================================
echo Makumbiri public CSS cache purge failed
echo ============================================================
echo.
echo Review:
echo %REPORT%
echo.
pause
exit /b 1

:missing_tools
echo ERROR: Windows OpenSSH and scp are required.
pause
exit /b 1
