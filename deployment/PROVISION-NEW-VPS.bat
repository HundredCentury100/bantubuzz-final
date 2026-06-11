@echo off
setlocal EnableExtensions

set "SERVER=13.140.159.150"
set "SSH_USER=root"
set "ROOT=%~dp0.."
set "PROVISION_SCRIPT=%ROOT%\deployment\vps\provision-new-vps.sh"
set "REPORT_DIR=%ROOT%\deployment\vps\reports"

if not exist "%PROVISION_SCRIPT%" (
    echo ERROR: Provisioning script not found:
    echo %PROVISION_SCRIPT%
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
set "REPORT=%REPORT_DIR%\vps-provision-%SERVER%-%TIMESTAMP%.txt"

echo ============================================================
echo BantuBuzz New VPS Provisioning
echo ============================================================
echo.
echo Server: %SERVER%
echo User:   %SSH_USER%
echo Report: %REPORT%
echo.
echo This will install and configure:
echo   - Apache and Certbot
echo   - PostgreSQL and two isolated databases
echo   - Redis
echo   - Meilisearch bound to localhost
echo   - Node.js 22 and Python build tooling
echo   - 4 GB swap
echo   - UFW and Fail2ban
echo   - BantuBuzz directories, environment skeletons, and services
echo.
echo It WILL NOT:
echo   - Contact or change the existing production VPS
echo   - Copy the production database or uploaded files
echo   - Change bantubuzz.com DNS
echo   - Start the BantuBuzz application services
echo.
echo You will enter the new VPS root password once.
echo Provisioning may take several minutes.
echo.
pause

ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=20 -o ServerAliveInterval=15 -o ServerAliveCountMax=6 ^
    %SSH_USER%@%SERVER% "bash -s" < "%PROVISION_SCRIPT%" 2>&1 | powershell.exe -NoProfile -Command ^
    "$input | Tee-Object -FilePath '%REPORT%'; if (Select-String -Quiet -SimpleMatch 'BANTUBUZZ_PROVISIONING_SUCCESS' '%REPORT%') { exit 0 } else { exit 1 }"

if errorlevel 1 (
    echo.
    echo ============================================================
    echo Provisioning failed
    echo ============================================================
    echo.
    echo Review:
    echo %REPORT%
    pause
    exit /b 1
)

echo.
echo ============================================================
echo Provisioning completed
echo ============================================================
echo.
echo Report:
echo %REPORT%
echo.
echo Run ANALYZE-NEW-VPS.bat again and send the new audit report
echo to Codex before starting the production migration.
echo.
pause
exit /b 0
