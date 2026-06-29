@echo off
setlocal EnableExtensions

set "OLD_SERVER=173.212.245.22"
set "SSH_USER=root"
set "ROOT=%~dp0.."
set "REMOTE_SCRIPT=%ROOT%\deployment\vps\fix-old-vps-makumbiri-disable-autoptimize.sh"
set "REPORT_DIR=%ROOT%\deployment\vps\reports"

where ssh >nul 2>&1 || goto :missing_tools
where scp >nul 2>&1 || goto :missing_tools

if not exist "%REPORT_DIR%" mkdir "%REPORT_DIR%"
for /f %%i in ('powershell.exe -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TIMESTAMP=%%i"
set "REPORT=%REPORT_DIR%\old-vps-makumbiri-disable-autoptimize-%OLD_SERVER%-%TIMESTAMP%.txt"

echo ============================================================
echo Makumbiri Disable Autoptimize Public Rewriter
echo ============================================================
echo.
echo Target: %SSH_USER%@%OLD_SERVER%
echo.
echo This targeted fix will:
echo   - Back up Makumbiri active plugins and Autoptimize options/cache
echo   - Deactivate Autoptimize for Makumbiri only
echo   - Purge Makumbiri Autoptimize generated CSS/JS files
echo   - Keep Zimquest, WordPress content, uploads, theme files, and database
echo     content untouched
echo   - Verify public HTML no longer references /wp-content/cache/autoptimize
echo.
echo Use this when Slider Revolution/fonts work in Elementor but public pages
echo still load broken optimized assets after LiteSpeed was disabled.
echo.
echo Report:
echo %REPORT%
echo.
pause

echo [1/2] Uploading remote fix script...
echo ============================================================
echo PASSWORD PROMPT: OLD VPS %OLD_SERVER%
echo ============================================================
scp "%REMOTE_SCRIPT%" %SSH_USER%@%OLD_SERVER%:/tmp/fix-old-vps-makumbiri-disable-autoptimize.sh
if errorlevel 1 goto :failed

echo.
echo [2/2] Disabling Makumbiri Autoptimize and verifying public page...
echo ============================================================
echo PASSWORD PROMPT: OLD VPS %OLD_SERVER%
echo ============================================================
ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=15 -o ServerAliveCountMax=12 ^
    %SSH_USER%@%OLD_SERVER% "bash /tmp/fix-old-vps-makumbiri-disable-autoptimize.sh; rm -f /tmp/fix-old-vps-makumbiri-disable-autoptimize.sh" 2>&1 | powershell.exe -NoProfile -Command ^
    "$input | Tee-Object -FilePath '%REPORT%'; if (Select-String -Quiet -SimpleMatch 'MAKUMBIRI_DISABLE_AUTOPTIMIZE_SUCCESS' '%REPORT%') { exit 0 } else { exit 1 }"
if errorlevel 1 goto :failed

echo.
echo ============================================================
echo Makumbiri Autoptimize disabled
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
echo Makumbiri Autoptimize disable failed
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
