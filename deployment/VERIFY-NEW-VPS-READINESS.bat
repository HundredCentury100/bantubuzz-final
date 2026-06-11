@echo off
setlocal EnableExtensions

set "SERVER=13.140.159.150"
set "SSH_USER=root"
set "ROOT=%~dp0.."
set "VERIFY_SCRIPT=%ROOT%\deployment\vps\verify-migration-readiness.sh"
set "REPORT_DIR=%ROOT%\deployment\vps\reports"

if not exist "%VERIFY_SCRIPT%" (
    echo ERROR: Verification script not found:
    echo %VERIFY_SCRIPT%
    pause
    exit /b 1
)

if not exist "%REPORT_DIR%" mkdir "%REPORT_DIR%"
for /f %%i in ('powershell.exe -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TIMESTAMP=%%i"
set "REPORT=%REPORT_DIR%\migration-readiness-%SERVER%-%TIMESTAMP%.txt"

echo ============================================================
echo BantuBuzz New VPS Migration Readiness
echo ============================================================
echo.
echo This is a short read-only verification of the infrastructure
echo needed to deploy the main platform and headless CMS.
echo.
echo Report: %REPORT%
echo.
pause

ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=20 ^
    %SSH_USER%@%SERVER% "bash -s" < "%VERIFY_SCRIPT%" > "%REPORT%" 2>&1

type "%REPORT%"
findstr /C:"BANTUBUZZ_MIGRATION_READINESS_PASS" "%REPORT%" >nul 2>&1
if errorlevel 1 (
    echo.
    echo Readiness verification found one or more failures.
    echo Send this report to Codex:
    echo %REPORT%
    pause
    exit /b 1
)

echo.
echo The VPS passed the infrastructure migration gate.
echo Send this report to Codex:
echo %REPORT%
echo.
pause
exit /b 0
