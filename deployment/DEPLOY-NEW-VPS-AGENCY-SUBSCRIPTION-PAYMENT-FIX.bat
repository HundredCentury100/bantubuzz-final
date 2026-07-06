@echo off
setlocal EnableExtensions

set "NEW_SERVER=13.140.159.150"
set "SSH_USER=root"
set "ROOT=%~dp0.."
set "BACKEND_ARCHIVE=%TEMP%\bantubuzz-agency-subscription-payment-backend.tar.gz"
set "FRONTEND_ARCHIVE=%TEMP%\bantubuzz-agency-subscription-payment-frontend.tar.gz"
set "REPORT_DIR=%ROOT%\deployment\vps\reports"

where ssh >nul 2>&1 || goto :missing_tools
where scp >nul 2>&1 || goto :missing_tools
where tar >nul 2>&1 || goto :missing_tools

if not exist "%REPORT_DIR%" mkdir "%REPORT_DIR%"
for /f %%i in ('powershell.exe -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TIMESTAMP=%%i"
set "REPORT=%REPORT_DIR%\new-vps-agency-subscription-payment-fix-%NEW_SERVER%-%TIMESTAMP%.txt"

echo ============================================================
echo BantuBuzz Agency Subscription Payment Fix
echo ============================================================
echo.
echo Target: %SSH_USER%@%NEW_SERVER%
echo.
echo This targeted deployment will:
echo   - Stop Agency upgrades from using the old Paynow initiation path
echo   - Send paid subscriptions/upgrades to the unified payment page
echo   - Keep wallet, Smile^&Pay, and bank-transfer activation intact
echo   - Fix brand profile subscription/security metadata loading
echo   - Build and deploy the frontend subscription page
echo   - Restart backend and reload Apache
echo.
echo It will NOT run database migrations or change CMS/DNS/messaging.
echo.
echo Report:
echo %REPORT%
echo.
pause

echo.
echo [1/6] Local backend syntax check...
pushd "%ROOT%\backend"
venv\Scripts\python.exe -m py_compile app\routes\subscriptions.py app\routes\auth.py
if errorlevel 1 goto :failed_popd
popd

echo.
echo [2/6] Building frontend...
pushd "%ROOT%\frontend"
call npm run build
if errorlevel 1 goto :failed_popd
popd

echo.
echo [3/6] Packaging targeted backend file...
if exist "%BACKEND_ARCHIVE%" del /q "%BACKEND_ARCHIVE%"
tar -czf "%BACKEND_ARCHIVE%" -C "%ROOT%\backend" app/routes/subscriptions.py app/routes/auth.py
if errorlevel 1 goto :failed

echo.
echo [4/6] Packaging frontend dist...
if exist "%FRONTEND_ARCHIVE%" del /q "%FRONTEND_ARCHIVE%"
tar -czf "%FRONTEND_ARCHIVE%" -C "%ROOT%\frontend\dist" .
if errorlevel 1 goto :failed

echo.
echo [5/6] Uploading release files...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo ============================================================
scp "%BACKEND_ARCHIVE%" "%FRONTEND_ARCHIVE%" "%ROOT%\deployment\vps\deploy-agency-subscription-payment-fix.sh" %SSH_USER%@%NEW_SERVER%:/tmp/
if errorlevel 1 goto :failed

echo.
echo [6/6] Installing files and restarting services...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo ============================================================
ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=15 -o ServerAliveCountMax=20 ^
    %SSH_USER%@%NEW_SERVER% "bash /tmp/deploy-agency-subscription-payment-fix.sh" 2>&1 | powershell.exe -NoProfile -Command ^
    "$input | Tee-Object -FilePath '%REPORT%'; if (Select-String -Quiet -SimpleMatch 'BANTUBUZZ_NEW_VPS_AGENCY_SUBSCRIPTION_PAYMENT_FIX_SUCCESS' '%REPORT%') { exit 0 } else { exit 1 }"
if errorlevel 1 goto :failed

echo.
del /q "%BACKEND_ARCHIVE%" 2>nul
del /q "%FRONTEND_ARCHIVE%" 2>nul

echo ============================================================
echo Agency subscription payment fix deployed
echo ============================================================
echo.
echo QA:
echo   https://bantubuzz.com/subscription/manage
echo   Upgrade to Agency, then test Wallet, Smile^&Pay, and Bank Transfer.
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
if exist "%FRONTEND_ARCHIVE%" del /q "%FRONTEND_ARCHIVE%" 2>nul
echo.
echo ============================================================
echo Agency subscription payment fix deployment failed
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
