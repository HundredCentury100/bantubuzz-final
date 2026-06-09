@echo off
setlocal EnableExtensions

set "ROOT=D:\Bantubuzz Platform"
set "SERVER_USER=root"
set "SERVER_HOST=173.212.245.22"
set "REMOTE_ROOT=/var/www/bantubuzz"
set "BUILD_DIR=%ROOT%\deployment\live-campaign-analytics"
set "FRONTEND_TAR=%BUILD_DIR%\bantubuzz_frontend_live_campaign_analytics.tar.gz"

cls
echo ========================================
echo   BantuBuzz Live Campaign Analytics Deploy
echo ========================================
echo.
echo Server: %SERVER_USER%@%SERVER_HOST%
echo Remote: %REMOTE_ROOT%
echo.
echo This deploys:
echo   - Pro+ campaign analytics with 7, 30, and 90-day trends
echo   - reach, impressions, engagement, clicks, and conversions
echo   - per-creator and platform performance
echo   - Premium sentiment comments, themes, languages, and PDF export
echo   - historical four-hour metric snapshots
echo   - updated campaign analytics frontend
echo.
echo Press Ctrl+C to cancel, or any key to continue.
pause >nul

echo.
echo [1/8] Preparing local package folder...
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
scp "%FRONTEND_TAR%" %SERVER_USER%@%SERVER_HOST%:/tmp/bantubuzz_frontend_live_campaign_analytics.tar.gz
if errorlevel 1 goto fail

echo.
echo [5/8] Backing up production files...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; cd %REMOTE_ROOT%; TS=$(date +%%Y%%m%%d_%%H%%M%%S); tar --ignore-failed-read -czf /root/bantubuzz_live_analytics_backup_$TS.tar.gz backend/app/models/__init__.py backend/app/models/post_metrics.py backend/app/models/post_metrics_snapshot.py backend/app/models/post_sentiment_comment.py backend/app/routes/campaigns.py backend/app/services/campaign_analytics_service.py backend/app/services/post_metrics_service.py backend/app/services/white_label_report_service.py backend/app/utils/subscription_helper.py backend/migrations/versions/202606091000_add_live_campaign_analytics.py frontend/index.html frontend/assets frontend/favicon.ico frontend/manifest.json; mkdir -p backend/app/models backend/app/routes backend/app/services backend/app/utils backend/migrations/versions frontend"
if errorlevel 1 goto fail

echo.
echo [6/8] Uploading backend files...
scp "%ROOT%\backend\app\models\__init__.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/models/__init__.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\models\post_metrics.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/models/post_metrics.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\models\post_metrics_snapshot.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/models/post_metrics_snapshot.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\models\post_sentiment_comment.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/models/post_sentiment_comment.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\routes\campaigns.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/routes/campaigns.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\services\campaign_analytics_service.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/services/campaign_analytics_service.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\services\post_metrics_service.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/services/post_metrics_service.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\services\white_label_report_service.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/services/white_label_report_service.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\utils\subscription_helper.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/utils/subscription_helper.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\migrations\versions\202606091000_add_live_campaign_analytics.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/migrations/versions/202606091000_add_live_campaign_analytics.py
if errorlevel 1 goto fail

echo.
echo [7/8] Extracting frontend, migrating, and restarting services...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; cd %REMOTE_ROOT%; rm -rf frontend/assets frontend/index.html frontend/favicon.ico frontend/manifest.json; tar -xzf /tmp/bantubuzz_frontend_live_campaign_analytics.tar.gz -C frontend; rm -f /tmp/bantubuzz_frontend_live_campaign_analytics.tar.gz; cd backend; source venv/bin/activate; python -m py_compile app/models/__init__.py app/models/post_metrics.py app/models/post_metrics_snapshot.py app/models/post_sentiment_comment.py app/routes/campaigns.py app/services/campaign_analytics_service.py app/services/post_metrics_service.py app/services/white_label_report_service.py app/utils/subscription_helper.py migrations/versions/202606091000_add_live_campaign_analytics.py; flask db upgrade; python -c \"from app import create_app; from sqlalchemy.orm import configure_mappers; app=create_app(); app.app_context().push(); configure_mappers(); print('mapper config ok')\"; pkill gunicorn || true; sleep 2; venv/bin/gunicorn -w 4 -b 0.0.0.0:8002 --timeout 120 --error-logfile gunicorn_error.log --access-logfile gunicorn_access.log 'app:create_app()' --daemon; (systemctl restart celery-worker 2>/dev/null || true); (systemctl restart celery-beat 2>/dev/null || true); systemctl restart apache2; sleep 3; ps aux | grep '[g]unicorn'; (ss -tlnp | grep 8002 || netstat -tlnp | grep 8002)"
if errorlevel 1 goto fail

echo.
echo [8/8] Checking health endpoints...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; curl -f -s -i http://localhost:8002/api/health; echo; curl -L -f -s -i https://bantubuzz.com/api/health; echo; systemctl status celery-worker celery-beat --no-pager -l | head -80"
if errorlevel 1 goto fail

echo.
echo ========================================
echo   Live Campaign Analytics deployed
echo ========================================
echo.
echo Manual checks:
echo   - Pro brand opens campaign Performance and switches 7D, 30D, and 90D
echo   - Metrics show reach, impressions, engagement, clicks, and conversions
echo   - Premium brand sees drivers, languages, and top comments
echo   - Premium PDF downloads successfully
echo   - Celery worker and beat are active
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
