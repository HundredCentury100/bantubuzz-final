@echo off
setlocal EnableExtensions

set "ROOT=D:\Bantubuzz Platform"
set "SERVER_USER=root"
set "SERVER_HOST=173.212.245.22"
set "REMOTE_ROOT=/var/www/bantubuzz"

cls
echo ========================================
echo   BantuBuzz Campaign Escrow Deploy
echo ========================================
echo.
echo Server: %SERVER_USER%@%SERVER_HOST%
echo Remote: %REMOTE_ROOT%
echo.
echo This deploys only the campaign escrow and payouts backend work:
echo   - creator-tier payout commission on escrow release
echo   - 7-day auto-release after final/live delivery submission
echo   - dispute mediation money movement for release, partial release, and refund
echo   - payment escrow release/refund audit timestamps
echo   - scheduled wallet pending-clearance cleanup
echo.
echo This deployment runs flask db upgrade.
echo.
echo You will be asked for the SSH password on each ssh/scp step.
echo Press Ctrl+C to cancel, or any key to continue.
pause >nul

echo.
echo [1/5] Backing up current production files...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; cd %REMOTE_ROOT%; TS=$(date +%%Y%%m%%d_%%H%%M%%S); echo 'Creating backup at /root/bantubuzz_campaign_escrow_backup_'$TS'.tar.gz'; tar --ignore-failed-read -czf /root/bantubuzz_campaign_escrow_backup_$TS.tar.gz backend/app/celery_app.py backend/app/models/collaboration.py backend/app/models/payment.py backend/app/routes/admin/disputes.py backend/app/routes/collaborations.py backend/app/routes/disputes.py backend/app/services/payment_service.py backend/app/services/wallet_service.py backend/app/tasks/collaboration_tasks.py backend/migrations/versions/202606051430_add_escrow_release_audit_fields.py; mkdir -p backend/app/models backend/app/routes/admin backend/app/services backend/app/tasks backend/migrations/versions"
if errorlevel 1 goto fail

echo.
echo [2/5] Uploading changed backend files...
scp "%ROOT%\backend\app\celery_app.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/celery_app.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\models\collaboration.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/models/collaboration.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\models\payment.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/models/payment.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\routes\admin\disputes.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/routes/admin/disputes.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\routes\collaborations.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/routes/collaborations.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\routes\disputes.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/routes/disputes.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\services\payment_service.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/services/payment_service.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\services\wallet_service.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/services/wallet_service.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\tasks\collaboration_tasks.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/tasks/collaboration_tasks.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\migrations\versions\202606051430_add_escrow_release_audit_fields.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/migrations/versions/202606051430_add_escrow_release_audit_fields.py
if errorlevel 1 goto fail

echo.
echo [3/5] Compiling backend, migrating, and restarting services...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; cd %REMOTE_ROOT%/backend; source venv/bin/activate; python -m py_compile app/celery_app.py app/models/collaboration.py app/models/payment.py app/routes/admin/disputes.py app/routes/collaborations.py app/routes/disputes.py app/services/payment_service.py app/services/wallet_service.py app/tasks/collaboration_tasks.py migrations/versions/202606051430_add_escrow_release_audit_fields.py; flask db upgrade; python -c \"from app import create_app; from sqlalchemy.orm import configure_mappers; app=create_app(); app.app_context().push(); configure_mappers(); print('mapper config ok')\"; pkill gunicorn || true; sleep 2; venv/bin/gunicorn -w 4 -b 0.0.0.0:8002 --timeout 120 --error-logfile gunicorn_error.log --access-logfile gunicorn_access.log 'app:create_app()' --daemon; (systemctl restart celery-worker 2>/dev/null || true); (systemctl restart celery-beat 2>/dev/null || true); systemctl restart apache2; sleep 3; echo 'Gunicorn processes:'; ps aux | grep '[g]unicorn'; echo 'Port 8002:'; (ss -tlnp | grep 8002 || netstat -tlnp | grep 8002)"
if errorlevel 1 goto fail

echo.
echo [4/5] Checking health endpoints...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; echo 'Server-side health:'; curl -f -s -i http://localhost:8002/api/health; echo; echo 'Public health:'; curl -L -f -s -i https://bantubuzz.com/api/health"
if errorlevel 1 goto fail

echo.
echo [5/5] Deployment checks complete.
echo.
echo Manual checks:
echo   - Brand completes a paid campaign collaboration and creator wallet gets net payout
echo   - Creator commission matches creator subscription tier
echo   - Live URL submission shows a 7-day release date
echo   - Open dispute pauses auto-release
echo   - Admin dispute release/refund/partial release creates wallet transactions
echo.
pause
exit /b 0

:fail
echo.
echo ========================================
echo   Deployment stopped because a step failed
echo ========================================
echo.
echo Read the error above. No later steps were run after the failure.
pause
exit /b 1
