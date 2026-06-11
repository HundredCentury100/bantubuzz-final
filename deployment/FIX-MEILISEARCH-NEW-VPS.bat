@echo off
setlocal EnableExtensions

set "SERVER=13.140.159.150"
set "SSH_USER=root"
set "ROOT=%~dp0.."
set "REPAIR_SCRIPT=%ROOT%\deployment\vps\repair-meilisearch.sh"
set "REPORT_DIR=%ROOT%\deployment\vps\reports"

if not exist "%REPAIR_SCRIPT%" (
    echo ERROR: Repair script not found:
    echo %REPAIR_SCRIPT%
    pause
    exit /b 1
)

if not exist "%REPORT_DIR%" mkdir "%REPORT_DIR%"
for /f %%i in ('powershell.exe -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TIMESTAMP=%%i"
set "REPORT=%REPORT_DIR%\meilisearch-repair-%SERVER%-%TIMESTAMP%.txt"

echo ============================================================
echo BantuBuzz New VPS - Repair Meilisearch
echo ============================================================
echo.
echo This repairs only the localhost Meilisearch service.
echo It does not touch the old VPS, databases, DNS, or application code.
echo.
echo Report: %REPORT%
echo.
pause

ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=20 ^
    %SSH_USER%@%SERVER% "bash -s" < "%REPAIR_SCRIPT%" 2>&1 | powershell.exe -NoProfile -Command ^
    "$input | Tee-Object -FilePath '%REPORT%'; if (Select-String -Quiet -SimpleMatch 'BANTUBUZZ_MEILISEARCH_REPAIR_SUCCESS' '%REPORT%') { exit 0 } else { exit 1 }"

if errorlevel 1 (
    echo.
    echo Meilisearch repair failed. Send this report to Codex:
    echo %REPORT%
    pause
    exit /b 1
)

echo.
echo Meilisearch is healthy.
echo Now run VERIFY-NEW-VPS-READINESS.bat again.
echo.
pause
exit /b 0
