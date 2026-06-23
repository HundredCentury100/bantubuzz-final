@echo off
setlocal EnableExtensions

set "NEW_SERVER=13.140.159.150"
set "SSH_USER=root"
set "ROOT=%~dp0.."
set "BACKEND_ARCHIVE=%TEMP%\bantubuzz-payment-services-audit-fixes-backend.tar.gz"
set "FRONTEND_ARCHIVE=%TEMP%\bantubuzz-payment-services-audit-fixes-frontend.tar.gz"
set "REPORT_DIR=%ROOT%\deployment\vps\reports"

where ssh >nul 2>&1 || goto :missing_tools
where scp >nul 2>&1 || goto :missing_tools
where tar >nul 2>&1 || goto :missing_tools

if not exist "%REPORT_DIR%" mkdir "%REPORT_DIR%"
for /f %%i in ('powershell.exe -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TIMESTAMP=%%i"
set "REPORT=%REPORT_DIR%\new-vps-payment-services-audit-fixes-%NEW_SERVER%-%TIMESTAMP%.txt"

echo ============================================================
echo BantuBuzz Payment Services Audit Fixes
echo ============================================================
echo.
echo Target: %SSH_USER%@%NEW_SERVER%
echo.
echo This targeted deployment will:
echo   - Deploy campaign payment wallet-schema fixes
echo   - Deploy admin escrow/cancellation wallet fixes
echo   - Deploy creator subscription wallet transaction normalization
echo   - Deploy SmilePay creator-subscription activation support
echo   - Build and deploy the frontend payment page update
echo   - Restart backend, Celery, and reload Apache
echo.
echo It will NOT run database migrations or change CMS/DNS/messaging.
echo.
echo Report:
echo %REPORT%
echo.
pause

echo.
echo [1/7] Local backend syntax check...
pushd "%ROOT%\backend"
venv\Scripts\python.exe -m py_compile ^
    app\models\campaign_payment.py ^
    app\routes\campaign_payments.py ^
    app\routes\creator_subscriptions.py ^
    app\routes\admin\collaborations.py ^
    app\services\smilepay_service.py
if errorlevel 1 goto :failed_popd
popd

echo.
echo [2/7] Building frontend...
pushd "%ROOT%\frontend"
call npm run build
if errorlevel 1 goto :failed_popd
popd

echo.
echo [3/7] Packaging targeted backend files...
if exist "%BACKEND_ARCHIVE%" del /q "%BACKEND_ARCHIVE%"
tar -czf "%BACKEND_ARCHIVE%" -C "%ROOT%\backend" ^
    app/models/campaign_payment.py ^
    app/routes/campaign_payments.py ^
    app/routes/creator_subscriptions.py ^
    app/routes/admin/collaborations.py ^
    app/services/smilepay_service.py
if errorlevel 1 goto :failed

echo.
echo [4/7] Packaging frontend dist...
if exist "%FRONTEND_ARCHIVE%" del /q "%FRONTEND_ARCHIVE%"
tar -czf "%FRONTEND_ARCHIVE%" -C "%ROOT%\frontend\dist" .
if errorlevel 1 goto :failed

echo.
echo [5/7] Uploading release files...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo ============================================================
scp "%BACKEND_ARCHIVE%" "%FRONTEND_ARCHIVE%" "%ROOT%\deployment\vps\deploy-payment-services-audit-fixes.sh" %SSH_USER%@%NEW_SERVER%:/tmp/
if errorlevel 1 goto :failed

echo.
echo [6/7] Installing files and restarting services...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo ============================================================
ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=15 -o ServerAliveCountMax=20 ^
    %SSH_USER%@%NEW_SERVER% "bash /tmp/deploy-payment-services-audit-fixes.sh" 2>&1 | powershell.exe -NoProfile -Command ^
    "$input | Tee-Object -FilePath '%REPORT%'; if (Select-String -Quiet -SimpleMatch 'BANTUBUZZ_NEW_VPS_PAYMENT_SERVICES_AUDIT_FIXES_SUCCESS' '%REPORT%') { exit 0 } else { exit 1 }"
if errorlevel 1 goto :failed

echo.
echo [7/7] Cleaning local archives...
del /q "%BACKEND_ARCHIVE%" 2>nul
del /q "%FRONTEND_ARCHIVE%" 2>nul

echo.
echo ============================================================
echo Payment services audit fixes deployed
echo ============================================================
echo.
echo Verify:
echo   https://bantubuzz.com/subscription/manage
echo   https://bantubuzz.com/billing
echo   https://bantubuzz.com/brand/campaigns
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
echo Payment services audit fixes deployment failed
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
