@echo off
setlocal EnableExtensions

set "ROOT=D:\Bantubuzz Platform"
set "SERVER_USER=root"
set "SERVER_HOST=173.212.245.22"
set "REMOTE_ROOT=/var/www/bantubuzz"
set "BUILD_DIR=%ROOT%\deployment\creator-scoring"
set "FRONTEND_TAR=%BUILD_DIR%\bantubuzz_frontend_creator_scoring.tar.gz"

cls
echo ========================================
echo   BantuBuzz Creator Scoring Deploy
echo ========================================
echo.
echo This deploys the private 0-100 creator score, rankings,
echo login activity tracking, sync triggers, and initial backfill.
echo.
echo Press Ctrl+C to cancel, or any key to continue.
pause >nul

echo.
echo [1/11] Preparing frontend build folder...
if not exist "%BUILD_DIR%" mkdir "%BUILD_DIR%"
if errorlevel 1 goto fail
if exist "%FRONTEND_TAR%" del "%FRONTEND_TAR%"

echo.
echo [2/11] Building frontend...
cd /d "%ROOT%\frontend"
call npm run build
if errorlevel 1 goto fail

echo.
echo [3/11] Creating frontend tarball...
tar -czf "%FRONTEND_TAR%" -C "%ROOT%\frontend\dist" .
if errorlevel 1 goto fail

echo.
echo [4/11] Uploading frontend tarball...
scp "%FRONTEND_TAR%" %SERVER_USER%@%SERVER_HOST%:/tmp/bantubuzz_frontend_creator_scoring.tar.gz
if errorlevel 1 goto fail

echo.
echo [5/11] Backing up production files...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; cd %REMOTE_ROOT%; TS=$(date +%%Y%%m%%d_%%H%%M%%S); tar --ignore-failed-read -czf /root/bantubuzz_creator_scoring_backup_$TS.tar.gz backend/app/celery_app.py backend/app/models/__init__.py backend/app/models/connected_platform.py backend/app/routes/admin_extended.py backend/app/routes/auth.py backend/app/routes/creators.py backend/app/routes/packages.py backend/app/routes/platforms.py backend/app/routes/portfolio.py backend/app/services/post_metrics_service.py backend/app/tasks/platform_sync.py frontend/index.html frontend/assets frontend/favicon.ico frontend/manifest.json; mkdir -p backend/app/models backend/app/routes backend/app/services backend/app/tasks backend/migrations/versions frontend"
if errorlevel 1 goto fail

echo.
echo [6/11] Uploading models, services, and migration...
scp "%ROOT%\backend\app\models\__init__.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/models/__init__.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\models\connected_platform.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/models/connected_platform.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\models\creator_score.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/models/creator_score.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\services\creator_score_formula.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/services/creator_score_formula.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\services\creator_score_service.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/services/creator_score_service.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\services\post_metrics_service.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/services/post_metrics_service.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\migrations\versions\202606101700_add_creator_scoring.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/migrations/versions/202606101700_add_creator_scoring.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\recalculate_creator_scores.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/recalculate_creator_scores.py
if errorlevel 1 goto fail

echo.
echo [7/11] Uploading routes and background tasks...
scp "%ROOT%\backend\app\celery_app.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/celery_app.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\routes\admin_extended.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/routes/admin_extended.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\routes\auth.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/routes/auth.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\routes\creators.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/routes/creators.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\routes\packages.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/routes/packages.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\routes\platforms.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/routes/platforms.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\routes\portfolio.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/routes/portfolio.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\tasks\creator_score_tasks.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/tasks/creator_score_tasks.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\tasks\platform_sync.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/tasks/platform_sync.py
if errorlevel 1 goto fail

echo.
echo [8/11] Extracting frontend, migrating, and checking SQLAlchemy mappings...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; cd %REMOTE_ROOT%; rm -rf frontend/assets frontend/index.html frontend/favicon.ico frontend/manifest.json; tar -xzf /tmp/bantubuzz_frontend_creator_scoring.tar.gz -C frontend; rm -f /tmp/bantubuzz_frontend_creator_scoring.tar.gz; cd backend; source venv/bin/activate; python -m py_compile app/celery_app.py app/models/__init__.py app/models/connected_platform.py app/models/creator_score.py app/routes/admin_extended.py app/routes/auth.py app/routes/creators.py app/routes/packages.py app/routes/platforms.py app/routes/portfolio.py app/services/creator_score_formula.py app/services/creator_score_service.py app/services/post_metrics_service.py app/tasks/creator_score_tasks.py app/tasks/platform_sync.py migrations/versions/202606101700_add_creator_scoring.py recalculate_creator_scores.py; flask db upgrade; python -c \"from app import create_app; from sqlalchemy.orm import configure_mappers; app=create_app(); app.app_context().push(); configure_mappers(); print('mapper config ok')\""
if errorlevel 1 goto fail

echo.
echo [9/11] Backfilling existing creator scores and rankings...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; cd %REMOTE_ROOT%/backend; source venv/bin/activate; python recalculate_creator_scores.py"
if errorlevel 1 goto fail

echo.
echo [10/11] Restarting backend and Celery services...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; cd %REMOTE_ROOT%/backend; source venv/bin/activate; pkill gunicorn || true; sleep 2; venv/bin/gunicorn -w 4 -b 0.0.0.0:8002 --timeout 120 --error-logfile gunicorn_error.log --access-logfile gunicorn_access.log 'app:create_app()' --daemon; systemctl restart celery-worker; systemctl restart celery-beat; systemctl restart apache2; HEALTH_OK=0; for i in $(seq 1 30); do if curl -fsS http://localhost:8002/api/health >/dev/null; then HEALTH_OK=1; break; fi; sleep 2; done; if [ \"$HEALTH_OK\" != \"1\" ]; then echo 'Backend failed health check'; tail -120 gunicorn_error.log; exit 1; fi; ps aux | grep '[g]unicorn'; systemctl is-active celery-worker celery-beat apache2"
if errorlevel 1 goto fail

echo.
echo [11/11] Checking public health...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; curl -f -s -i http://localhost:8002/api/health; echo; curl -L -f -s -i https://bantubuzz.com/api/health"
if errorlevel 1 goto fail

echo.
echo ========================================
echo   Creator scoring deployed successfully
echo ========================================
echo.
echo QA:
echo   - GET /api/creators/rankings?type=overall^&limit=50
echo   - Confirm public responses contain rank but never score values
echo   - Sync a creator platform and confirm rank recalculates
echo   - Admin-only diagnostics: GET /api/admin/creator-scores
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
