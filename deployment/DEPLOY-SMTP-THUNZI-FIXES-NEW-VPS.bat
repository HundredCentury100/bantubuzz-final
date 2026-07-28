@echo off
setlocal EnableExtensions

set "NEW_SERVER=13.140.159.150"
set "SSH_USER=root"
set "ROOT=%~dp0.."
set "BACKEND_ARCHIVE=%TEMP%\bantubuzz-smtp-thunzi-fixes-backend.tar.gz"
set "REPORT_DIR=%ROOT%\deployment\vps\reports"

where ssh >nul 2>&1 || goto :missing_tools
where scp >nul 2>&1 || goto :missing_tools
where tar >nul 2>&1 || goto :missing_tools

if not exist "%REPORT_DIR%" mkdir "%REPORT_DIR%"
for /f %%i in ('powershell.exe -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TIMESTAMP=%%i"
set "REPORT=%REPORT_DIR%\new-vps-smtp-thunzi-fixes-%NEW_SERVER%-%TIMESTAMP%.txt"

echo ============================================================
echo BantuBuzz SMTP and ThunziAI Fix Deployment
echo ============================================================
echo.
echo Target: %SSH_USER%@%NEW_SERVER%
echo.
echo This targeted deployment will:
echo   - Deploy only SMTP/OTP and ThunziAI backend fixes
echo   - Deploy the Celery analytics task fix found in production logs
echo   - Restart backend and Celery services
echo   - Check local and public health endpoints
echo   - Test SMTP login without sending an email
echo   - Print masked recent OTP/SMTP/Thunzi log lines
echo.
echo It will NOT change frontend, CMS, DNS, database schema, or user data.
echo.
echo Report:
echo %REPORT%
echo.
pause

pushd "%ROOT%"
if errorlevel 1 goto :failed

echo.
echo [1/5] Compiling targeted backend files locally...
backend\venv\Scripts\python.exe -m py_compile ^
  "%ROOT%\backend\app\config.py" ^
  "%ROOT%\backend\app\services\email_service.py" ^
  "%ROOT%\backend\app\services\thunzi_service.py" ^
  "%ROOT%\backend\app\routes\auth.py" ^
  "%ROOT%\backend\app\routes\platforms.py" ^
  "%ROOT%\backend\app\tasks\platform_sync.py" ^
  "%ROOT%\backend\app\tasks\analytics_tasks.py"
if errorlevel 1 goto :failed

echo.
echo [2/5] Packaging targeted backend files...
if exist "%BACKEND_ARCHIVE%" del /q "%BACKEND_ARCHIVE%"
tar -czf "%BACKEND_ARCHIVE%" -C "%ROOT%\backend" ^
  app/config.py ^
  app/services/email_service.py ^
  app/services/thunzi_service.py ^
  app/routes/auth.py ^
  app/routes/platforms.py ^
  app/tasks/platform_sync.py ^
  app/tasks/analytics_tasks.py
if errorlevel 1 goto :failed

echo.
echo [3/5] Uploading files...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo ============================================================
scp "%BACKEND_ARCHIVE%" "%ROOT%\deployment\vps\deploy-smtp-thunzi-fixes.sh" %SSH_USER%@%NEW_SERVER%:/tmp/
if errorlevel 1 goto :failed

echo.
echo [4/5] Installing, restarting, and running SMTP/Thunzi diagnostics...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo ============================================================
ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=15 -o ServerAliveCountMax=20 ^
  %SSH_USER%@%NEW_SERVER% "tr -d '\r' < /tmp/deploy-smtp-thunzi-fixes.sh > /tmp/deploy-smtp-thunzi-fixes.lf.sh && bash /tmp/deploy-smtp-thunzi-fixes.lf.sh" 2>&1 | powershell.exe -NoProfile -Command ^
  "$input | Tee-Object -FilePath '%REPORT%'; if (Select-String -Quiet -SimpleMatch 'BANTUBUZZ_SMTP_THUNZI_FIXES_SUCCESS' '%REPORT%') { exit 0 } else { exit 1 }"
if errorlevel 1 goto :failed

echo.
echo [5/5] Cleaning local archive...
del /q "%BACKEND_ARCHIVE%" 2>nul
popd

echo.
echo ============================================================
echo SMTP and ThunziAI fixes deployed
echo ============================================================
echo.
echo Next QA checks:
echo   - Register a brand/creator and confirm OTP arrives
echo   - Connect a creator or brand platform/account again
echo.
echo Report:
echo %REPORT%
echo.
pause
exit /b 0

:failed
popd 2>nul
echo.
echo ============================================================
echo SMTP and ThunziAI fix deployment failed
echo ============================================================
echo.
echo Review:
echo %REPORT%
echo.
pause
exit /b 1

:missing_tools
echo ERROR: Windows OpenSSH, scp, and tar are required.
pause
exit /b 1
