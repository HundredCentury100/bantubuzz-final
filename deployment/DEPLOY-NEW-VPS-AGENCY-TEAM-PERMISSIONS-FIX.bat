@echo off
setlocal EnableExtensions

set "NEW_SERVER=13.140.159.150"
set "SSH_USER=root"
set "ROOT=%~dp0.."
set "FRONTEND_DIR=%ROOT%\frontend"
set "REPORT_DIR=%ROOT%\deployment\vps\reports"
set "REMOTE_SCRIPT=/tmp/deploy-agency-team-permissions-fix.sh"
set "LOCAL_SCRIPT=%ROOT%\deployment\vps\deploy-agency-team-permissions-fix.sh"
set "FRONTEND_ARCHIVE=%TEMP%\bantubuzz-agency-team-permissions-frontend.tar.gz"
set "REMOTE_FRONTEND_ARCHIVE=/tmp/bantubuzz-agency-team-permissions-frontend.tar.gz"

where ssh >nul 2>&1 || goto :missing_tools
where scp >nul 2>&1 || goto :missing_tools
where tar >nul 2>&1 || goto :missing_tools

if not exist "%REPORT_DIR%" mkdir "%REPORT_DIR%"
for /f %%i in ('powershell.exe -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TIMESTAMP=%%i"
set "REPORT=%REPORT_DIR%\new-vps-agency-team-permissions-fix-%NEW_SERVER%-%TIMESTAMP%.txt"

echo ============================================================
echo BantuBuzz Agency Team Permissions UI Fix
echo ============================================================
echo.
echo NEW VPS: %SSH_USER%@%NEW_SERVER%
echo.
echo This deployment will:
echo   - Build the frontend locally
echo   - Upload rebuilt frontend dist
echo   - Reload Apache
echo.
echo This deployment will NOT:
echo   - Upload backend files
echo   - Restart backend services
echo   - Run database migrations
echo   - Touch CMS, DNS, messaging, or payment services
echo.
echo Report:
echo %REPORT%
echo.
pause

(
  echo ============================================================
  echo BantuBuzz Agency Team Permissions UI Fix
  echo ============================================================
  echo Started: %DATE% %TIME%
  echo Target: %SSH_USER%@%NEW_SERVER%
  echo.
) > "%REPORT%"

echo [1/4] Building frontend...
pushd "%FRONTEND_DIR%" >nul
call npm run build >> "%REPORT%" 2>&1
if errorlevel 1 (
    popd >nul
    goto :failed
)

echo.
echo [2/4] Packaging frontend dist...
if exist "%FRONTEND_ARCHIVE%" del /q "%FRONTEND_ARCHIVE%"
tar -czf "%FRONTEND_ARCHIVE%" -C "%FRONTEND_DIR%\dist" .
if errorlevel 1 (
    popd >nul
    goto :failed
)
popd >nul

echo.
echo [3/4] Uploading archive and deployment script...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo ============================================================
scp "%FRONTEND_ARCHIVE%" %SSH_USER%@%NEW_SERVER%:%REMOTE_FRONTEND_ARCHIVE% >> "%REPORT%" 2>&1
if errorlevel 1 goto :failed
scp "%LOCAL_SCRIPT%" %SSH_USER%@%NEW_SERVER%:%REMOTE_SCRIPT% >> "%REPORT%" 2>&1
if errorlevel 1 goto :failed

echo.
echo [4/4] Installing on new VPS...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo ============================================================
ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=15 -o ServerAliveCountMax=20 ^
    %SSH_USER%@%NEW_SERVER% "bash %REMOTE_SCRIPT%" >> "%REPORT%" 2>&1
if errorlevel 1 goto :failed

if exist "%FRONTEND_ARCHIVE%" del /q "%FRONTEND_ARCHIVE%"

echo.
echo ============================================================
echo Agency team permissions UI fix deployed
echo ============================================================
echo.
echo QA:
echo   https://bantubuzz.com/brand/agency
echo.
echo Report:
echo %REPORT%
echo.
pause
exit /b 0

:failed
echo.
echo ============================================================
echo Agency team permissions UI fix failed
echo ============================================================
echo.
echo Review:
echo %REPORT%
echo.
if exist "%FRONTEND_ARCHIVE%" del /q "%FRONTEND_ARCHIVE%"
pause
exit /b 1

:missing_tools
echo ERROR: Windows OpenSSH client and tar are required.
pause
exit /b 1
