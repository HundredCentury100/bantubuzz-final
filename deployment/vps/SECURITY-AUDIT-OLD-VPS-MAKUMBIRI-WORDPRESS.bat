@echo off
setlocal EnableExtensions

set "OLD_SERVER=173.212.245.22"
set "SSH_USER=root"
set "SCRIPT_DIR=%~dp0"
set "ROOT=%SCRIPT_DIR%..\.."
set "REPORT_DIR=%SCRIPT_DIR%reports"
set "LOCAL_SCRIPT=%SCRIPT_DIR%security-audit-old-vps-makumbiri-wordpress.sh"
set "REMOTE_SCRIPT=/tmp/security-audit-old-vps-makumbiri-wordpress.sh"

where ssh >nul 2>&1 || goto :missing_tools
where scp >nul 2>&1 || goto :missing_tools

if not exist "%REPORT_DIR%" mkdir "%REPORT_DIR%"
for /f %%i in ('powershell.exe -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TIMESTAMP=%%i"
set "REPORT=%REPORT_DIR%\old-vps-makumbiri-security-audit-%OLD_SERVER%-%TIMESTAMP%.txt"

echo ============================================================
echo Makumbiri WordPress Security Audit - OLD VPS
echo ============================================================
echo.
echo Target: %SSH_USER%@%OLD_SERVER%
echo Site:   makumbirigamepark.com
echo.
echo This is READ-ONLY. It will:
echo   - Check DNS, HTTP/HTTPS responses, and public HTML
echo   - Inspect Apache vhosts and WordPress configuration
echo   - Run WP-CLI checks if available
echo   - Scan for suspicious PHP/backdoor patterns
echo   - List recently modified files, executable uploads, cron jobs, logs
echo   - Produce a local report for review
echo.
echo This will NOT:
echo   - Delete files
echo   - Disable plugins
echo   - Change WordPress, Apache, DNS, SSL, or database settings
echo.
echo Report:
echo %REPORT%
echo.
pause

(
  echo ============================================================
  echo Makumbiri WordPress Security Audit - OLD VPS
  echo ============================================================
  echo Started: %DATE% %TIME%
  echo Target: %SSH_USER%@%OLD_SERVER%
  echo Site: makumbirigamepark.com
  echo Mode: READ ONLY
  echo.
) > "%REPORT%"

echo [1/2] Uploading read-only audit script...
echo ============================================================
echo PASSWORD PROMPT: OLD VPS %OLD_SERVER%
echo ============================================================
scp "%LOCAL_SCRIPT%" %SSH_USER%@%OLD_SERVER%:%REMOTE_SCRIPT% >> "%REPORT%" 2>&1
if errorlevel 1 goto :failed

echo.
echo [2/2] Running audit on old VPS...
echo ============================================================
echo PASSWORD PROMPT: OLD VPS %OLD_SERVER%
echo ============================================================
ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=15 -o ServerAliveCountMax=20 ^
  %SSH_USER%@%OLD_SERVER% "bash %REMOTE_SCRIPT%" >> "%REPORT%" 2>&1
if errorlevel 1 goto :failed

echo.
echo ============================================================
echo Makumbiri security audit complete
echo ============================================================
echo.
echo Send this report to Codex:
echo %REPORT%
echo.
pause
exit /b 0

:failed
echo.
echo ============================================================
echo Makumbiri security audit failed
echo ============================================================
echo.
echo Review:
echo %REPORT%
echo.
pause
exit /b 1

:missing_tools
echo ERROR: Windows OpenSSH client and scp are required.
pause
exit /b 1
