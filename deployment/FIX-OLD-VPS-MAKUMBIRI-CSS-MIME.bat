@echo off
setlocal EnableExtensions

set "OLD_SERVER=173.212.245.22"
set "SSH_USER=root"
set "ROOT=%~dp0.."
set "REMOTE_SCRIPT=%ROOT%\deployment\vps\fix-old-vps-makumbiri-css-mime.sh"
set "REPORT_DIR=%ROOT%\deployment\vps\reports"

where ssh >nul 2>&1 || goto :missing_tools
where scp >nul 2>&1 || goto :missing_tools

if not exist "%REPORT_DIR%" mkdir "%REPORT_DIR%"
for /f %%i in ('powershell.exe -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TIMESTAMP=%%i"
set "REPORT=%REPORT_DIR%\old-vps-makumbiri-css-mime-fix-%OLD_SERVER%-%TIMESTAMP%.txt"

echo ============================================================
echo Makumbiri WordPress CSS MIME Fix
echo ============================================================
echo.
echo Target: %SSH_USER%@%OLD_SERVER%
echo.
echo This targeted fix will:
echo   - Back up Apache config snippets
echo   - Enable Apache MIME handling if needed
echo   - Add explicit CSS/JS/SVG MIME types for Makumbiri public assets
echo   - Reload Apache only after configtest passes
echo   - Verify the LiteSpeed optimized CSS/JS content types
echo.
echo It will NOT edit WordPress content, database, theme files, or Zimquest.
echo.
echo Report:
echo %REPORT%
echo.
pause

echo [1/2] Uploading remote fix script...
echo ============================================================
echo PASSWORD PROMPT: OLD VPS %OLD_SERVER%
echo ============================================================
scp "%REMOTE_SCRIPT%" %SSH_USER%@%OLD_SERVER%:/tmp/fix-old-vps-makumbiri-css-mime.sh
if errorlevel 1 goto :failed

echo.
echo [2/2] Applying MIME fix and verifying Makumbiri assets...
echo ============================================================
echo PASSWORD PROMPT: OLD VPS %OLD_SERVER%
echo ============================================================
ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=15 -o ServerAliveCountMax=12 ^
    %SSH_USER%@%OLD_SERVER% "bash /tmp/fix-old-vps-makumbiri-css-mime.sh; rm -f /tmp/fix-old-vps-makumbiri-css-mime.sh" 2>&1 | powershell.exe -NoProfile -Command ^
    "$input | Tee-Object -FilePath '%REPORT%'; if (Select-String -Quiet -SimpleMatch 'MAKUMBIRI_CSS_MIME_FIX_SUCCESS' '%REPORT%') { exit 0 } else { exit 1 }"
if errorlevel 1 goto :failed

echo.
echo ============================================================
echo Makumbiri CSS MIME fix complete
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
echo Makumbiri CSS MIME fix failed
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
