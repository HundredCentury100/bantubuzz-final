@echo off
setlocal EnableExtensions

set "OLD_SERVER=173.212.245.22"
set "SSH_USER=root"
set "ROOT=%~dp0.."
set "REMOTE_SCRIPT=%ROOT%\deployment\vps\diagnose-old-vps-makumbiri-slider-runtime.sh"
set "REPORT_DIR=%ROOT%\deployment\vps\reports"

where ssh >nul 2>&1 || goto :missing_tools
where scp >nul 2>&1 || goto :missing_tools

if not exist "%REPORT_DIR%" mkdir "%REPORT_DIR%"
for /f %%i in ('powershell.exe -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TIMESTAMP=%%i"
set "REPORT=%REPORT_DIR%\old-vps-makumbiri-slider-runtime-%OLD_SERVER%-%TIMESTAMP%.txt"

echo ============================================================
echo Makumbiri Slider Revolution Runtime Diagnostic
echo ============================================================
echo.
echo Target: %SSH_USER%@%OLD_SERVER%
echo.
echo This read-only diagnostic will:
echo   - Fetch the public Makumbiri homepage with a cache-busting URL
echo   - Check Slider Revolution CSS/JS asset status and MIME types
echo   - Check key Elementor/theme assets used on the homepage
echo   - Inspect public HTML for Slider Revolution initialization markers
echo   - Print recent Apache/PHP errors for Makumbiri
echo.
echo It will NOT change WordPress, Apache, plugins, files, or databases.
echo.
echo Report:
echo %REPORT%
echo.
pause

echo [1/2] Uploading remote diagnostic script...
echo ============================================================
echo PASSWORD PROMPT: OLD VPS %OLD_SERVER%
echo ============================================================
scp "%REMOTE_SCRIPT%" %SSH_USER%@%OLD_SERVER%:/tmp/diagnose-old-vps-makumbiri-slider-runtime.sh
if errorlevel 1 goto :failed

echo.
echo [2/2] Running Slider Revolution runtime diagnostic...
echo ============================================================
echo PASSWORD PROMPT: OLD VPS %OLD_SERVER%
echo ============================================================
ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=15 -o ServerAliveCountMax=12 ^
    %SSH_USER%@%OLD_SERVER% "bash /tmp/diagnose-old-vps-makumbiri-slider-runtime.sh; rm -f /tmp/diagnose-old-vps-makumbiri-slider-runtime.sh" 2>&1 | powershell.exe -NoProfile -Command ^
    "$input | Tee-Object -FilePath '%REPORT%'; if (Select-String -Quiet -SimpleMatch 'MAKUMBIRI_SLIDER_RUNTIME_DIAGNOSTIC_COMPLETE' '%REPORT%') { exit 0 } else { exit 1 }"
if errorlevel 1 goto :failed

echo.
echo ============================================================
echo Makumbiri Slider Revolution diagnostic complete
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
echo Makumbiri Slider Revolution diagnostic failed
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
