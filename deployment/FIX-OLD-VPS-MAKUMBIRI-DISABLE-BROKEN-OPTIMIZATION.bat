@echo off
setlocal EnableExtensions

set "OLD_SERVER=173.212.245.22"
set "SSH_USER=root"
set "ROOT=%~dp0.."
set "REMOTE_SCRIPT=%ROOT%\deployment\vps\fix-old-vps-makumbiri-disable-broken-optimization.sh"
set "REPORT_DIR=%ROOT%\deployment\vps\reports"

where ssh >nul 2>&1 || goto :missing_tools
where scp >nul 2>&1 || goto :missing_tools

if not exist "%REPORT_DIR%" mkdir "%REPORT_DIR%"
for /f %%i in ('powershell.exe -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TIMESTAMP=%%i"
set "REPORT=%REPORT_DIR%\old-vps-makumbiri-disable-broken-optimization-%OLD_SERVER%-%TIMESTAMP%.txt"

echo ============================================================
echo Makumbiri Disable Broken Public CSS Optimization
echo ============================================================
echo.
echo Target: %SSH_USER%@%OLD_SERVER%
echo.
echo This targeted fix will:
echo   - Back up Makumbiri LiteSpeed optimization options and generated cache
echo   - Disable only CSS/JS/UCSS/critical-CSS optimization for Makumbiri
echo   - Purge Makumbiri generated LiteSpeed bundles
echo   - Keep WordPress content, uploads, theme files, database rows for other sites,
echo     Apache vhosts, and Zimquest untouched
echo   - Verify the public page falls back to normal WordPress/theme stylesheets
echo.
echo Use this when wp-admin/editor looks correct but public pages look broken
echo even after MIME headers and public CSS cache were fixed.
echo.
echo Report:
echo %REPORT%
echo.
pause

echo [1/2] Uploading remote optimization fix script...
echo ============================================================
echo PASSWORD PROMPT: OLD VPS %OLD_SERVER%
echo ============================================================
scp "%REMOTE_SCRIPT%" %SSH_USER%@%OLD_SERVER%:/tmp/fix-old-vps-makumbiri-disable-broken-optimization.sh
if errorlevel 1 goto :failed

echo.
echo [2/2] Disabling broken optimization and verifying public styles...
echo ============================================================
echo PASSWORD PROMPT: OLD VPS %OLD_SERVER%
echo ============================================================
ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=15 -o ServerAliveCountMax=12 ^
    %SSH_USER%@%OLD_SERVER% "bash /tmp/fix-old-vps-makumbiri-disable-broken-optimization.sh; rm -f /tmp/fix-old-vps-makumbiri-disable-broken-optimization.sh" 2>&1 | powershell.exe -NoProfile -Command ^
    "$input | Tee-Object -FilePath '%REPORT%'; if (Select-String -Quiet -SimpleMatch 'MAKUMBIRI_DISABLE_BROKEN_OPTIMIZATION_SUCCESS' '%REPORT%') { exit 0 } else { exit 1 }"
if errorlevel 1 goto :failed

echo.
echo ============================================================
echo Makumbiri optimization fix complete
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
echo Makumbiri optimization fix failed
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
