@echo off
setlocal EnableExtensions

set "NEW_SERVER=13.140.159.150"
set "SSH_USER=root"
set "ROOT=%~dp0.."
set "BACKEND_ARCHIVE=%TEMP%\bantubuzz-direct-messaging-backend.tar.gz"
set "NODE_ARCHIVE=%TEMP%\bantubuzz-direct-messaging-node.tar.gz"
set "FRONTEND_ARCHIVE=%TEMP%\bantubuzz-direct-messaging-frontend.tar.gz"
set "REPORT_DIR=%ROOT%\deployment\vps\reports"

where ssh >nul 2>&1 || goto :missing_tools
where scp >nul 2>&1 || goto :missing_tools
where tar >nul 2>&1 || goto :missing_tools

if not exist "%REPORT_DIR%" mkdir "%REPORT_DIR%"
for /f %%i in ('powershell.exe -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TIMESTAMP=%%i"
set "REPORT=%REPORT_DIR%\new-vps-direct-messaging-safety-%NEW_SERVER%-%TIMESTAMP%.txt"

echo ============================================================
echo BantuBuzz Direct Messaging Safety Update
echo ============================================================
echo.
echo Target: %SSH_USER%@%NEW_SERVER%
echo.
echo This targeted deployment will:
echo   - Deploy Flask direct-message block enforcement
echo   - Deploy Socket.IO direct-message block enforcement
echo   - Deploy the frontend composer block-state handling
echo   - Restart backend, messaging, and reload Apache
echo.
echo It will NOT run database migrations or deploy CMS/DNS changes.
echo.
echo Report:
echo %REPORT%
echo.
pause

echo.
echo [1/8] Local backend and messaging syntax checks...
pushd "%ROOT%"
python -m py_compile backend\app\routes\messages.py
if errorlevel 1 goto :failed_popd
node --check messaging-service\server.js
if errorlevel 1 goto :failed_popd
popd

echo.
echo [2/8] Building frontend...
pushd "%ROOT%\frontend"
call npm run build
if errorlevel 1 goto :failed_popd
popd

echo.
echo [3/8] Packaging targeted backend files...
if exist "%BACKEND_ARCHIVE%" del /q "%BACKEND_ARCHIVE%"
tar -czf "%BACKEND_ARCHIVE%" -C "%ROOT%\backend" app/routes/messages.py
if errorlevel 1 goto :failed

echo.
echo [4/8] Packaging targeted messaging service files...
if exist "%NODE_ARCHIVE%" del /q "%NODE_ARCHIVE%"
tar -czf "%NODE_ARCHIVE%" -C "%ROOT%\messaging-service" server.js
if errorlevel 1 goto :failed

echo.
echo [5/8] Packaging frontend dist...
if exist "%FRONTEND_ARCHIVE%" del /q "%FRONTEND_ARCHIVE%"
tar -czf "%FRONTEND_ARCHIVE%" -C "%ROOT%\frontend\dist" .
if errorlevel 1 goto :failed

echo.
echo [6/8] Uploading release files...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo ============================================================
scp "%BACKEND_ARCHIVE%" "%NODE_ARCHIVE%" "%FRONTEND_ARCHIVE%" "%ROOT%\deployment\vps\deploy-direct-messaging-safety.sh" %SSH_USER%@%NEW_SERVER%:/tmp/
if errorlevel 1 goto :failed

echo.
echo [7/8] Installing files and restarting services...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo ============================================================
ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=15 -o ServerAliveCountMax=20 ^
    %SSH_USER%@%NEW_SERVER% "bash /tmp/deploy-direct-messaging-safety.sh" 2>&1 | powershell.exe -NoProfile -Command ^
    "$input | Tee-Object -FilePath '%REPORT%'; if (Select-String -Quiet -SimpleMatch 'BANTUBUZZ_NEW_VPS_DIRECT_MESSAGING_SAFETY_SUCCESS' '%REPORT%') { exit 0 } else { exit 1 }"
if errorlevel 1 goto :failed

echo.
echo [8/8] Cleaning local archives...
del /q "%BACKEND_ARCHIVE%" 2>nul
del /q "%NODE_ARCHIVE%" 2>nul
del /q "%FRONTEND_ARCHIVE%" 2>nul

echo.
echo ============================================================
echo Direct messaging safety update deployed
echo ============================================================
echo.
echo QA checks:
echo   - Send a normal message
echo   - Send an image/file attachment
echo   - Open receiver conversation and confirm read receipt updates
echo   - Block a user and confirm neither socket nor fallback sends work
echo.
echo Report:
echo %REPORT%
echo.
pause
exit /b 0

:failed_popd
popd

:failed
if exist "%BACKEND_ARCHIVE%" del /q "%BACKEND_ARCHIVE%" 2>nul
if exist "%NODE_ARCHIVE%" del /q "%NODE_ARCHIVE%" 2>nul
if exist "%FRONTEND_ARCHIVE%" del /q "%FRONTEND_ARCHIVE%" 2>nul
echo.
echo ============================================================
echo Direct messaging safety deployment failed
echo ============================================================
echo.
echo Review:
echo %REPORT%
echo.
pause
exit /b 1

:missing_tools
echo ERROR: Windows OpenSSH, scp, tar, node, and python are required.
pause
exit /b 1
