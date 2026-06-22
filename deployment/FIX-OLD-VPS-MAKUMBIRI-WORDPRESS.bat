@echo off
setlocal EnableExtensions

set "OLD_SERVER=173.212.245.22"
set "SSH_USER=root"
set "DOMAIN=makumbirigamepark.com"
set "ROOT=%~dp0.."
set "REPORT_DIR=%ROOT%\deployment\vps\reports"

where ssh >nul 2>&1 || goto :missing_tools

if not exist "%REPORT_DIR%" mkdir "%REPORT_DIR%"
for /f %%i in ('powershell.exe -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TIMESTAMP=%%i"
set "REPORT=%REPORT_DIR%\old-vps-makumbiri-wordpress-%OLD_SERVER%-%TIMESTAMP%.txt"

echo ============================================================
echo Makumbiri WordPress Recovery on OLD VPS
echo ============================================================
echo.
echo OLD VPS: %SSH_USER%@%OLD_SERVER%
echo Domain:  %DOMAIN%
echo.
echo This will:
echo   - Check Apache status and virtual hosts
echo   - Re-enable and start apache2
echo   - Test the Makumbiri site locally using the Host header
echo   - Test public HTTP/HTTPS from the old VPS
echo.
echo It will NOT:
echo   - Start old BantuBuzz backend, Celery, or messaging
echo   - Change DNS
echo   - Change WordPress files or database
echo   - Touch the new VPS
echo.
echo Report:
echo %REPORT%
echo.
pause

echo.
echo [1/1] Starting Apache and checking Makumbiri WordPress...
echo ============================================================
echo PASSWORD PROMPT: OLD VPS %OLD_SERVER%
echo ============================================================
ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=15 -o ServerAliveCountMax=20 ^
    %SSH_USER%@%OLD_SERVER% "set -e; echo '=== Host ==='; hostname; date; echo; echo '=== Before ==='; systemctl --no-pager --full status apache2 | sed -n '1,18p' || true; echo; echo '=== Apache config test ==='; apache2ctl configtest; echo; echo '=== Enabled sites ==='; ls -la /etc/apache2/sites-enabled || true; echo; echo '=== Starting Apache only ==='; systemctl enable apache2; systemctl restart apache2; sleep 2; echo; echo '=== After ==='; systemctl is-active apache2; systemctl --no-pager --full status apache2 | sed -n '1,18p'; echo; echo '=== Local Makumbiri HTTP ==='; curl -sS -I -H 'Host: makumbirigamepark.com' http://127.0.0.1/ | sed -n '1,20p'; echo; echo '=== Local Makumbiri HTTPS ==='; curl -k -sS -I --resolve makumbirigamepark.com:443:127.0.0.1 https://makumbirigamepark.com/ | sed -n '1,20p' || true; echo; echo '=== Public from old VPS ==='; curl -sS -I --max-time 15 http://makumbirigamepark.com/ | sed -n '1,20p' || true; curl -k -sS -I --max-time 15 https://makumbirigamepark.com/ | sed -n '1,20p' || true; echo; echo '=== Listening ports ==='; ss -ltnp | grep -E ':(80|443)\b' || true; echo MAKUMBIRI_OLD_VPS_WORDPRESS_CHECK_COMPLETE" 2>&1 | powershell.exe -NoProfile -Command ^
    "$input | Tee-Object -FilePath '%REPORT%'; if (Select-String -Quiet -SimpleMatch 'MAKUMBIRI_OLD_VPS_WORDPRESS_CHECK_COMPLETE' '%REPORT%') { exit 0 } else { exit 1 }"
if errorlevel 1 goto :failed

echo.
echo ============================================================
echo Makumbiri WordPress check complete
echo ============================================================
echo.
echo Now open:
echo   https://makumbirigamepark.com/
echo.
echo Report:
echo %REPORT%
echo.
pause
exit /b 0

:failed
echo.
echo ============================================================
echo Makumbiri WordPress recovery failed
echo ============================================================
echo.
echo If this fails before asking for a password, the OLD VPS is not reachable
echo on SSH from this machine/network.
echo.
echo Review:
echo %REPORT%
echo.
pause
exit /b 1

:missing_tools
echo ERROR: Windows OpenSSH is required.
pause
exit /b 1
