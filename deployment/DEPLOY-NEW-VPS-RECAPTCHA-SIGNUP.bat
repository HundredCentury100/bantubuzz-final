@echo off
setlocal EnableExtensions

set "NEW_SERVER=13.140.159.150"
set "SSH_USER=root"
set "ROOT=%~dp0.."
set "FRONTEND_DIR=%ROOT%\frontend"
set "BACKEND_DIR=%ROOT%\backend"
set "REPORT_DIR=%ROOT%\deployment\vps\reports"
set "REMOTE_SCRIPT=/tmp/deploy-recaptcha-signup.sh"
set "LOCAL_SCRIPT=%ROOT%\deployment\vps\deploy-recaptcha-signup.sh"
set "BACKEND_ARCHIVE=%TEMP%\bantubuzz-recaptcha-backend.tar.gz"
set "FRONTEND_ARCHIVE=%TEMP%\bantubuzz-recaptcha-frontend.tar.gz"
set "REMOTE_BACKEND_ARCHIVE=/tmp/bantubuzz-recaptcha-backend.tar.gz"
set "REMOTE_FRONTEND_ARCHIVE=/tmp/bantubuzz-recaptcha-frontend.tar.gz"

where ssh >nul 2>&1 || goto :missing_tools
where scp >nul 2>&1 || goto :missing_tools
where tar >nul 2>&1 || goto :missing_tools

if not exist "%REPORT_DIR%" mkdir "%REPORT_DIR%"
for /f %%i in ('powershell.exe -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TIMESTAMP=%%i"
set "REPORT=%REPORT_DIR%\new-vps-recaptcha-signup-%NEW_SERVER%-%TIMESTAMP%.txt"

echo ============================================================
echo BantuBuzz reCAPTCHA Enterprise Signup Deployment
echo ============================================================
echo.
echo NEW VPS: %SSH_USER%@%NEW_SERVER%
echo.
echo This deployment will:
echo   - Build the frontend locally
echo   - Upload only the compiled frontend dist
echo   - Upload targeted backend files for signup verification
echo   - Restart backend and Celery services
echo   - Reload Apache and verify signup routes
echo.
echo This deployment will NOT:
echo   - Run database migrations
echo   - Touch CMS or messaging services
echo   - Edit production environment secrets
echo.
echo Important:
echo   Add RECAPTCHA_ENTERPRISE_API_KEY to /etc/bantubuzz/platform.env
echo   for production enforcement. Without it, the backend will warn and
echo   temporarily allow signups so QA/users are not blocked.
echo.
echo Report:
echo %REPORT%
echo.
pause

echo [1/6] Building frontend...
pushd "%FRONTEND_DIR%" >nul
call npm run build > "%REPORT%" 2>&1
if errorlevel 1 (
    popd >nul
    goto :failed
)
popd >nul

echo.
echo [2/6] Compiling targeted backend files locally...
pushd "%ROOT%" >nul
python -m py_compile backend\app\config.py backend\app\routes\auth.py backend\app\utils\recaptcha_enterprise.py >> "%REPORT%" 2>&1
if errorlevel 1 (
    popd >nul
    goto :failed
)

echo.
echo [3/6] Packaging targeted files...
if exist "%BACKEND_ARCHIVE%" del /q "%BACKEND_ARCHIVE%"
if exist "%FRONTEND_ARCHIVE%" del /q "%FRONTEND_ARCHIVE%"
tar -czf "%BACKEND_ARCHIVE%" -C "%BACKEND_DIR%" app/config.py app/routes/auth.py app/utils/recaptcha_enterprise.py
if errorlevel 1 (
    popd >nul
    goto :failed
)
tar -czf "%FRONTEND_ARCHIVE%" -C "%FRONTEND_DIR%\dist" .
if errorlevel 1 (
    popd >nul
    goto :failed
)
popd >nul

echo.
echo [4/6] Uploading archives and deployment script...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo ============================================================
scp "%BACKEND_ARCHIVE%" %SSH_USER%@%NEW_SERVER%:%REMOTE_BACKEND_ARCHIVE% >> "%REPORT%" 2>&1
if errorlevel 1 goto :failed
scp "%FRONTEND_ARCHIVE%" %SSH_USER%@%NEW_SERVER%:%REMOTE_FRONTEND_ARCHIVE% >> "%REPORT%" 2>&1
if errorlevel 1 goto :failed
scp "%LOCAL_SCRIPT%" %SSH_USER%@%NEW_SERVER%:%REMOTE_SCRIPT% >> "%REPORT%" 2>&1
if errorlevel 1 goto :failed

echo.
echo [5/6] Installing on new VPS...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo ============================================================
ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=15 -o ServerAliveCountMax=20 ^
    %SSH_USER%@%NEW_SERVER% "bash %REMOTE_SCRIPT%" >> "%REPORT%" 2>&1
if errorlevel 1 goto :failed

echo.
echo [6/6] Cleaning local archives...
if exist "%BACKEND_ARCHIVE%" del /q "%BACKEND_ARCHIVE%"
if exist "%FRONTEND_ARCHIVE%" del /q "%FRONTEND_ARCHIVE%"

echo.
echo ============================================================
echo reCAPTCHA signup deployment completed
echo ============================================================
echo.
echo QA:
echo   https://bantubuzz.com/register/creator
echo   https://bantubuzz.com/register/brand
echo.
echo Report:
echo %REPORT%
echo.
pause
exit /b 0

:failed
echo.
echo ============================================================
echo reCAPTCHA signup deployment failed
echo ============================================================
echo.
echo Review:
echo %REPORT%
echo.
if exist "%BACKEND_ARCHIVE%" del /q "%BACKEND_ARCHIVE%"
if exist "%FRONTEND_ARCHIVE%" del /q "%FRONTEND_ARCHIVE%"
pause
exit /b 1

:missing_tools
echo ERROR: Windows OpenSSH client and tar are required.
pause
exit /b 1
