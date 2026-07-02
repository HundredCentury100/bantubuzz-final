@echo off
setlocal EnableExtensions

set "OLD_SERVER=173.212.245.22"
set "SSH_USER=root"
set "ROOT=%~dp0.."
set "REMOTE_SCRIPT=%ROOT%\deployment\vps\investigate-old-vps-makumbiri-wordpress.sh"
set "REPORT_DIR=%ROOT%\deployment\vps\reports"

where ssh >nul 2>&1 || goto :missing_tools
where scp >nul 2>&1 || goto :missing_tools

if not exist "%REPORT_DIR%" mkdir "%REPORT_DIR%"
for /f %%i in ('powershell.exe -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TIMESTAMP=%%i"
set "REPORT=%REPORT_DIR%\old-vps-makumbiri-investigation-%OLD_SERVER%-%TIMESTAMP%.txt"

echo ============================================================
echo Makumbiri WordPress Investigation on OLD VPS
echo ============================================================
echo.
echo Target: %SSH_USER%@%OLD_SERVER%
echo.
echo This read-only diagnostic will:
echo   - Check local DNS and network reachability to the old VPS
echo   - Upload a read-only investigation script if SSH is reachable
echo   - Inspect Apache, vhosts, WordPress paths, PHP, logs, SSL, and HTTP responses
echo.
echo It will NOT restart, stop, install, delete, or modify services.
echo.
echo Report:
echo %REPORT%
echo.
pause

(
echo ============================================================
echo Local network and DNS checks
echo ============================================================
echo Timestamp: %DATE% %TIME%
echo.
echo --- nslookup makumbirigamepark.com ---
nslookup makumbirigamepark.com 2^>^&1
echo.
echo --- nslookup www.makumbirigamepark.com ---
nslookup www.makumbirigamepark.com 2^>^&1
echo.
echo --- Test-NetConnection SSH old VPS ---
powershell.exe -NoProfile -Command "Test-NetConnection %OLD_SERVER% -Port 22 | Format-List"
echo.
echo --- Test-NetConnection HTTP old VPS ---
powershell.exe -NoProfile -Command "Test-NetConnection %OLD_SERVER% -Port 80 | Format-List"
echo.
echo --- Test-NetConnection HTTPS old VPS ---
powershell.exe -NoProfile -Command "Test-NetConnection %OLD_SERVER% -Port 443 | Format-List"
echo.
echo --- Public HTTP HEAD by domain ---
powershell.exe -NoProfile -Command "try { (Invoke-WebRequest -Uri 'http://makumbirigamepark.com/' -Method Head -TimeoutSec 15 -MaximumRedirection 0).StatusCode } catch { $_.Exception.Message }"
echo.
echo --- Public HTTPS HEAD by domain ---
powershell.exe -NoProfile -Command "try { (Invoke-WebRequest -Uri 'https://makumbirigamepark.com/' -Method Head -TimeoutSec 15 -MaximumRedirection 0).StatusCode } catch { $_.Exception.Message }"
echo.
) > "%REPORT%" 2>&1

echo.
echo [1/3] Local checks complete.
echo Report so far:
echo %REPORT%
echo.

echo [2/3] Uploading remote read-only investigation script...
echo ============================================================
echo PASSWORD PROMPT: OLD VPS %OLD_SERVER%
echo ============================================================
scp "%REMOTE_SCRIPT%" %SSH_USER%@%OLD_SERVER%:/tmp/investigate-old-vps-makumbiri-wordpress.sh >> "%REPORT%" 2>&1
if errorlevel 1 goto :ssh_failed

echo.
echo [3/3] Running remote read-only investigation...
echo ============================================================
echo PASSWORD PROMPT: OLD VPS %OLD_SERVER%
echo ============================================================
ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=15 -o ServerAliveCountMax=12 ^
    %SSH_USER%@%OLD_SERVER% "bash /tmp/investigate-old-vps-makumbiri-wordpress.sh; rm -f /tmp/investigate-old-vps-makumbiri-wordpress.sh" 2>&1 | powershell.exe -NoProfile -Command ^
    "$input | Tee-Object -FilePath '%REPORT%' -Append; if (Select-String -Quiet -SimpleMatch 'MAKUMBIRI_OLD_VPS_INVESTIGATION_COMPLETE' '%REPORT%') { exit 0 } else { exit 1 }"
if errorlevel 1 goto :failed

echo.
echo ============================================================
echo Makumbiri WordPress investigation complete
echo ============================================================
echo.
echo Report:
echo %REPORT%
echo.
pause
exit /b 0

:ssh_failed
echo.
echo ============================================================ >> "%REPORT%"
echo SSH upload failed. The old VPS may be offline, firewalled, or unreachable on port 22. >> "%REPORT%"
echo ============================================================ >> "%REPORT%"
echo.
echo Could not SSH into the old VPS. Local network checks are in:
echo %REPORT%
echo.
pause
exit /b 1

:failed
echo.
echo ============================================================
echo Makumbiri WordPress investigation failed
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
