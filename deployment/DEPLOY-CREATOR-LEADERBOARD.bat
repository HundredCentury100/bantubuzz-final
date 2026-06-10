@echo off
setlocal EnableExtensions

set "ROOT=D:\Bantubuzz Platform"
set "SERVER_USER=root"
set "SERVER_HOST=173.212.245.22"
set "REMOTE_ROOT=/var/www/bantubuzz"
set "BUILD_DIR=%ROOT%\deployment\creator-leaderboard"
set "FRONTEND_TAR=%BUILD_DIR%\bantubuzz_frontend_creator_leaderboard.tar.gz"

cls
echo ========================================
echo   BantuBuzz Creator Leaderboard Deploy
echo ========================================
echo.
echo This deploys the public leaderboard, category/platform filters,
echo profile rank badges, and exportable Creator Cards.
echo.
echo Press Ctrl+C to cancel, or any key to continue.
pause >nul

echo.
echo [1/10] Preparing build folder...
if not exist "%BUILD_DIR%" mkdir "%BUILD_DIR%"
if errorlevel 1 goto fail
if exist "%FRONTEND_TAR%" del "%FRONTEND_TAR%"

echo.
echo [2/10] Building frontend...
cd /d "%ROOT%\frontend"
call npm run build
if errorlevel 1 goto fail

echo.
echo [3/10] Creating frontend tarball...
tar -czf "%FRONTEND_TAR%" -C "%ROOT%\frontend\dist" .
if errorlevel 1 goto fail

echo.
echo [4/10] Uploading frontend tarball...
scp "%FRONTEND_TAR%" %SERVER_USER%@%SERVER_HOST%:/tmp/bantubuzz_frontend_creator_leaderboard.tar.gz
if errorlevel 1 goto fail

echo.
echo [5/10] Backing up production files...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; cd %REMOTE_ROOT%; TS=$(date +%%Y%%m%%d_%%H%%M%%S); tar --ignore-failed-read -czf /root/bantubuzz_creator_leaderboard_backup_$TS.tar.gz backend/app/routes/creators.py backend/app/services/creator_score_formula.py backend/app/services/creator_score_service.py backend/recalculate_creator_scores.py frontend/index.html frontend/assets frontend/favicon.ico frontend/manifest.json; mkdir -p backend/app/routes backend/app/services frontend"
if errorlevel 1 goto fail

echo.
echo [6/10] Uploading changed backend files...
scp "%ROOT%\backend\app\routes\creators.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/routes/creators.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\services\creator_score_formula.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/services/creator_score_formula.py
if errorlevel 1 goto fail
scp "%ROOT%\backend\app\services\creator_score_service.py" %SERVER_USER%@%SERVER_HOST%:%REMOTE_ROOT%/backend/app/services/creator_score_service.py
if errorlevel 1 goto fail

echo.
echo [7/10] Extracting frontend and checking backend...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; cd %REMOTE_ROOT%; rm -rf frontend/assets frontend/index.html frontend/favicon.ico frontend/manifest.json; tar -xzf /tmp/bantubuzz_frontend_creator_leaderboard.tar.gz -C frontend; rm -f /tmp/bantubuzz_frontend_creator_leaderboard.tar.gz; cd backend; source venv/bin/activate; python -m py_compile app/routes/creators.py app/services/creator_score_formula.py app/services/creator_score_service.py; python -c \"from app import create_app; from sqlalchemy.orm import configure_mappers; app=create_app(); app.app_context().push(); configure_mappers(); print('mapper config ok')\""
if errorlevel 1 goto fail

echo.
echo [8/10] Rebuilding rankings with primary-platform rules...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; cd %REMOTE_ROOT%/backend; source venv/bin/activate; python recalculate_creator_scores.py"
if errorlevel 1 goto fail

echo.
echo [9/10] Restarting backend and checking services...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; cd %REMOTE_ROOT%/backend; source venv/bin/activate; pkill gunicorn || true; sleep 2; venv/bin/gunicorn -w 4 -b 0.0.0.0:8002 --timeout 120 --error-logfile gunicorn_error.log --access-logfile gunicorn_access.log 'app:create_app()' --daemon; systemctl restart celery-worker; systemctl restart celery-beat; systemctl restart apache2; HEALTH_OK=0; for i in $(seq 1 30); do if curl -fsS http://localhost:8002/api/health >/dev/null; then HEALTH_OK=1; break; fi; sleep 2; done; if [ \"$HEALTH_OK\" != \"1\" ]; then echo 'Backend failed health check'; tail -120 gunicorn_error.log; exit 1; fi; ps aux | grep '[g]unicorn'; systemctl is-active celery-worker celery-beat apache2"
if errorlevel 1 goto fail

echo.
echo [10/10] Checking public health...
ssh %SERVER_USER%@%SERVER_HOST% "set -e; curl -f -s -i http://localhost:8002/api/health; echo; curl -L -f -s -i https://bantubuzz.com/api/health"
if errorlevel 1 goto fail

echo.
echo ========================================
echo   Creator leaderboard deployed
echo ========================================
echo.
echo QA:
echo   - Open https://bantubuzz.com/leaderboard while logged out
echo   - Test Top 50 and Top 100
echo   - Combine category and platform filters
echo   - Open a creator and return to the same leaderboard position
echo   - Download and share a Creator Card
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
