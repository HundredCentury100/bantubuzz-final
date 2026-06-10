@echo off
setlocal EnableExtensions

set "ROOT=D:\Bantubuzz Platform"
set "SERVER_USER=root"
set "SERVER_HOST=173.212.245.22"
set "REMOTE_ROOT=/var/www/bantubuzz"
set "BUILD_DIR=%ROOT%\deployment\campaign-reports"
set "FRONTEND_TAR=%BUILD_DIR%\bantubuzz_frontend_campaign_reports.tar.gz"

cls
echo ========================================
echo   BantuBuzz Campaign Reports Deploy
echo ========================================
echo.
echo This deploys:
echo   - Pro+ campaign PDF and CSV exports
echo   - Premium+ custom date ranges and view-only share links
echo   - Premium/Agency white-label campaign PDFs
echo   - weekly/monthly report email schedules
echo   - report schedule/share database migration
echo.
echo Press Ctrl+C to cancel, or any key to continue.
pause >nul

echo.
echo [1/8] Preparing build folder...
if not exist "%BUILD_DIR%" mkdir "%BUILD_DIR%"
if errorlevel 1 goto fail
if exist "%FRONTEND_TAR%" del "%FRONTEND_TAR%"

echo.
echo [2/8] Building frontend...
cd /d "%ROOT%\frontend"
call npm run build
if errorlevel 1 goto fail

echo.
echo [3/8] Creating frontend tarball...
tar -czf "%FRONTEND_TAR%" -C "%ROOT%\frontend\dist" .
if errorlevel 1 goto fail

echo.
echo [4/8] Uploading frontend tarball...
scp "%FRONTEND_TAR%" %SERVER_USER%@%SERVER_HOST%:/tmp/bantubuzz_frontend_campaign_reports.tar.gz
if errorlevel 1 goto fail

echo.
echo [5/8] Backing up production files...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; cd %REMOTE_ROOT%; TS=$(date +%%Y%%m%%d_%%H%%M%%S); tar --ignore-failed-read -czf /root/bantubuzz_campaign_reports_backup_$TS.tar.gz backend/app/__init__.py backend/app/celery_app.py backend/app/models/__init__.py backend/app/models/campaign_report.py backend/app/routes/brands.py backend/app/routes/campaign_reports.py backend/app/services/campaign_report_service.py backend/app/services/white_label_report_service.py backend/app/tasks/report_tasks.py backend/app/utils/subscription_helper.py backend/migrations/versions/202606101000_add_campaign_report_exports.py backend/requirements.txt frontend/index.html frontend/assets frontend/favicon.ico frontend/manifest.json; mkdir -p backend/app/models backend/app/routes backend/app/services backend/app/tasks backend/app/utils backend/migrations/versions frontend"
if errorlevel 1 goto fail

echo.
echo [6/8] Uploading changed backend files...
scp "%ROOT%\backend\app\__init__.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/__init__.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\celery_app.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/celery_app.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\models\__init__.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/models/__init__.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\models\campaign_report.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/models/campaign_report.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\routes\brands.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/routes/brands.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\routes\campaign_reports.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/routes/campaign_reports.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\services\campaign_report_service.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/services/campaign_report_service.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\services\white_label_report_service.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/services/white_label_report_service.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\tasks\report_tasks.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/tasks/report_tasks.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\utils\subscription_helper.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/utils/subscription_helper.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\migrations\versions\202606101000_add_campaign_report_exports.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/migrations/versions/202606101000_add_campaign_report_exports.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\requirements.txt" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/requirements.txt
if errorlevel 1 goto fail

echo.
echo [7/8] Migrating and restarting production services...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; cd %REMOTE_ROOT%; rm -rf frontend/assets frontend/index.html frontend/favicon.ico frontend/manifest.json; tar -xzf /tmp/bantubuzz_frontend_campaign_reports.tar.gz -C frontend; rm -f /tmp/bantubuzz_frontend_campaign_reports.tar.gz; cd backend; source venv/bin/activate; pip install python-dateutil==2.9.0.post0; python -m py_compile app/__init__.py app/celery_app.py app/models/__init__.py app/models/campaign_report.py app/routes/brands.py app/routes/campaign_reports.py app/services/campaign_report_service.py app/services/white_label_report_service.py app/tasks/report_tasks.py app/utils/subscription_helper.py migrations/versions/202606101000_add_campaign_report_exports.py; flask db upgrade; python -c \"from app import create_app; from sqlalchemy.orm import configure_mappers; app=create_app(); app.app_context().push(); configure_mappers(); print('mapper config ok')\"; pkill gunicorn || true; sleep 2; venv/bin/gunicorn -w 4 -b 0.0.0.0:8002 --timeout 120 --error-logfile gunicorn_error.log --access-logfile gunicorn_access.log 'app:create_app()' --daemon; systemctl restart celery-worker; systemctl restart celery-beat; systemctl restart apache2; HEALTH_OK=0; for i in $(seq 1 30); do if curl -fsS http://localhost:8002/api/health >/dev/null; then HEALTH_OK=1; break; fi; sleep 2; done; if [ \"$HEALTH_OK\" != \"1\" ]; then echo 'Backend failed health check'; tail -120 gunicorn_error.log; exit 1; fi; ps aux | grep '[g]unicorn'; (ss -tlnp | grep 8002 || netstat -tlnp | grep 8002); systemctl is-active celery-worker celery-beat apache2"
if errorlevel 1 goto fail

echo.
echo [8/8] Checking public health...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; echo 'Local health:'; curl -f -s -i http://localhost:8002/api/health; echo; echo 'Public health:'; curl -L -f -s -i https://bantubuzz.com/api/health"
if errorlevel 1 goto fail

echo.
echo ========================================
echo   Campaign reports deployed
echo ========================================
echo.
echo QA:
echo   - Pro downloads BantuBuzz PDF and raw CSV
echo   - Premium sets a custom range and downloads white-label PDF
echo   - Premium creates and opens a view-only report link while logged out
echo   - Pro/Premium creates weekly and monthly email schedules
echo   - Revoked and expired links are rejected
echo.
pause
exit /b 0

:fail
echo.
echo ========================================
echo   Deployment stopped because a step failed
echo ========================================
echo.
echo Read the error above. No later steps were run.
pause
exit /b 1
