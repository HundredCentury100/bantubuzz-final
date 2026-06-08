@echo off
setlocal EnableExtensions

set "ROOT=D:\Bantubuzz Platform"
set "SERVER_USER=root"
set "SERVER_HOST=173.212.245.22"
set "REMOTE_ROOT=/var/www/bantubuzz"
set "BUILD_DIR=%ROOT%\deployment\spotlight-boosts"
set "FRONTEND_TAR=%BUILD_DIR%\bantubuzz_frontend_spotlight_boosts.tar.gz"

cls
echo ========================================
echo   BantuBuzz Spotlight Boosts Deploy
echo ========================================
echo.
echo Server: %SERVER_USER%@%SERVER_HOST%
echo Remote: %REMOTE_ROOT%
echo.
echo This deploys only the Spotlight Boost purchase release:
echo   - 3-day, 7-day, and 30-day wallet purchases
echo   - profile and campaign boosts activate immediately
echo   - boosted profile/campaign badges in discovery views
echo   - boost receipts in account billing history
echo   - frontend build files into /var/www/bantubuzz/frontend
echo.
echo This deployment runs flask db upgrade and SQLAlchemy mapper checks.
echo.
echo You will be asked for the SSH password on each ssh/scp step.
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
echo [3/8] Creating frontend tarball from dist contents...
tar -czf "%FRONTEND_TAR%" -C "%ROOT%\frontend\dist" .
if errorlevel 1 goto fail

echo.
echo [4/8] Uploading frontend tarball...
scp "%FRONTEND_TAR%" %SERVER_USER%@%SERVER_HOST%:/tmp/bantubuzz_frontend_spotlight_boosts.tar.gz
if errorlevel 1 goto fail

echo.
echo [5/8] Backing up current production files...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; cd %REMOTE_ROOT%; TS=$(date +%%Y%%m%%d_%%H%%M%%S); echo 'Creating backup at /root/bantubuzz_spotlight_boosts_backup_'$TS'.tar.gz'; tar --ignore-failed-read -czf /root/bantubuzz_spotlight_boosts_backup_$TS.tar.gz backend/app/__init__.py backend/app/models/__init__.py backend/app/models/campaign.py backend/app/models/creator_profile.py backend/app/models/spotlight_boost.py backend/app/routes/billing.py backend/app/routes/campaigns.py backend/app/routes/creators.py backend/app/routes/spotlight_boosts.py backend/app/services/spotlight_boost_service.py backend/migrations/versions/202606051530_add_spotlight_boosts.py frontend/index.html frontend/assets frontend/favicon.ico frontend/manifest.json; mkdir -p backend/app/models backend/app/routes backend/app/services backend/migrations/versions frontend"
if errorlevel 1 goto fail

echo.
echo [6/8] Uploading changed backend files...
scp "%ROOT%\backend\app\__init__.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/__init__.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\models\__init__.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/models/__init__.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\models\campaign.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/models/campaign.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\models\creator_profile.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/models/creator_profile.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\models\spotlight_boost.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/models/spotlight_boost.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\routes\billing.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/routes/billing.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\routes\campaigns.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/routes/campaigns.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\routes\creators.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/routes/creators.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\routes\spotlight_boosts.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/routes/spotlight_boosts.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\services\spotlight_boost_service.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/services/spotlight_boost_service.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\migrations\versions\202606051530_add_spotlight_boosts.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/migrations/versions/202606051530_add_spotlight_boosts.py
if errorlevel 1 goto fail

echo.
echo [7/8] Extracting frontend, compiling backend, migrating, and restarting services...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; cd %REMOTE_ROOT%; rm -rf frontend/assets frontend/index.html frontend/favicon.ico frontend/manifest.json; tar -xzf /tmp/bantubuzz_frontend_spotlight_boosts.tar.gz -C frontend; rm -f /tmp/bantubuzz_frontend_spotlight_boosts.tar.gz; cd backend; source venv/bin/activate; python -m py_compile app/__init__.py app/models/__init__.py app/models/campaign.py app/models/creator_profile.py app/models/spotlight_boost.py app/routes/billing.py app/routes/campaigns.py app/routes/creators.py app/routes/spotlight_boosts.py app/services/spotlight_boost_service.py migrations/versions/202606051530_add_spotlight_boosts.py; flask db upgrade; python -c \"from app import create_app; from sqlalchemy.orm import configure_mappers; app=create_app(); app.app_context().push(); configure_mappers(); print('mapper config ok')\"; pkill gunicorn || true; sleep 2; venv/bin/gunicorn -w 4 -b 0.0.0.0:8002 --timeout 120 --error-logfile gunicorn_error.log --access-logfile gunicorn_access.log 'app:create_app()' --daemon; systemctl restart apache2; sleep 3; echo 'Gunicorn processes:'; ps aux | grep '[g]unicorn'; echo 'Port 8002:'; (ss -tlnp | grep 8002 || netstat -tlnp | grep 8002)"
if errorlevel 1 goto fail

echo.
echo [8/8] Checking health endpoints...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; echo 'Server-side health:'; curl -f -s -i http://localhost:8002/api/health; echo; echo 'Public health:'; curl -L -f -s -i https://bantubuzz.com/api/health"
if errorlevel 1 goto fail

echo.
echo ========================================
echo   Spotlight Boosts deployed
echo ========================================
echo.
echo Manual checks:
echo   - Creator buys 3, 7, and 30-day profile boost from /creator/subscriptions
echo   - Brand buys campaign boost from campaign details
echo   - Boosted badge appears on creator and campaign discovery cards
echo   - Active boost appears in creator profile and campaign details
echo   - Creator/brand billing history shows the boost receipt
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
