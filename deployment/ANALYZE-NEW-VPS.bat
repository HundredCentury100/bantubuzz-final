@echo off
setlocal EnableExtensions

set "SERVER=13.140.159.150"
set "SSH_USER=root"
set "ROOT=%~dp0.."
set "AUDIT_SCRIPT=%ROOT%\deployment\vps\audit-new-vps.sh"
set "REPORT_DIR=%ROOT%\deployment\vps\reports"

if not exist "%AUDIT_SCRIPT%" (
    echo ERROR: Audit script not found:
    echo %AUDIT_SCRIPT%
    pause
    exit /b 1
)

where ssh >nul 2>&1
if errorlevel 1 (
    echo ERROR: Windows OpenSSH client was not found.
    echo Install OpenSSH Client from Windows Optional Features and try again.
    pause
    exit /b 1
)

if not exist "%REPORT_DIR%" mkdir "%REPORT_DIR%"

for /f %%i in ('powershell.exe -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TIMESTAMP=%%i"
set "REPORT=%REPORT_DIR%\vps-audit-%SERVER%-%TIMESTAMP%.txt"

echo ============================================================
echo BantuBuzz New VPS Read-Only Audit
echo ============================================================
echo.
echo Server: %SERVER%
echo User:   %SSH_USER%
echo Report: %REPORT%
echo.
echo This audit does not install, delete, restart, or modify anything.
echo You will be prompted for the root password once.
echo.
pause

echo.
echo Connecting and collecting server information...
echo.

ssh -o ConnectTimeout=15 -o ServerAliveInterval=15 -o ServerAliveCountMax=3 ^
    %SSH_USER%@%SERVER% "bash -s" < "%AUDIT_SCRIPT%" > "%REPORT%" 2>&1

if errorlevel 1 (
    echo.
    echo ============================================================
    echo Audit failed
    echo ============================================================
    echo.
    echo Review the connection output in:
    echo %REPORT%
    echo.
    type "%REPORT%"
    pause
    exit /b 1
)

echo.
echo ============================================================
echo Audit completed successfully
echo ============================================================
echo.
echo The full report is here:
echo %REPORT%
echo.
echo Opening the report now...
start "" notepad.exe "%REPORT%"
echo.
echo Send the report back to Codex so the migration plan can be
echo based on the actual VPS configuration.
echo.
pause
exit /b 0
