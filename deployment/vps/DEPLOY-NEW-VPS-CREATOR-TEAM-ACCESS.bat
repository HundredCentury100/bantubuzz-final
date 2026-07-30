@echo off
setlocal EnableExtensions

set "NEW_SERVER=13.140.159.150"
set "SSH_USER=root"
set "ROOT=%~dp0..\.."
set "FRONTEND_DIR=%ROOT%\frontend"
set "BACKEND_DIR=%ROOT%\backend"
set "REPORT_DIR=%ROOT%\deployment\vps\reports"
set "REMOTE_SCRIPT=/tmp/deploy-creator-team-access.sh"
set "LOCAL_SCRIPT=%ROOT%\deployment\vps\deploy-creator-team-access.sh"
set "BACKEND_ARCHIVE=%TEMP%\bantubuzz-creator-team-access-backend.tar.gz"
set "FRONTEND_ARCHIVE=%TEMP%\bantubuzz-creator-team-access-frontend.tar.gz"
set "REMOTE_BACKEND_ARCHIVE=/tmp/bantubuzz-creator-team-access-backend.tar.gz"
set "REMOTE_FRONTEND_ARCHIVE=/tmp/bantubuzz-creator-team-access-frontend.tar.gz"
set "NORMALIZED_SCRIPT=%TEMP%\deploy-creator-team-access.sh"

where ssh >nul 2>&1 || goto :missing_tools
where scp >nul 2>&1 || goto :missing_tools
where tar >nul 2>&1 || goto :missing_tools

if not exist "%REPORT_DIR%" mkdir "%REPORT_DIR%"
for /f %%i in ('powershell.exe -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TIMESTAMP=%%i"
set "REPORT=%REPORT_DIR%\new-vps-creator-team-access-%NEW_SERVER%-%TIMESTAMP%.txt"

echo ============================================================
echo BantuBuzz Creator Team Access Deployment
echo ============================================================
echo.
echo NEW VPS: %SSH_USER%@%NEW_SERVER%
echo.
echo This deployment will:
echo   - Build the frontend locally
echo   - Upload creator team backend files
echo   - Upload the rebuilt frontend dist
echo   - Run the creator team migration
echo   - Restart backend, Celery if present, and Apache
echo.
echo This deployment will NOT touch CMS, DNS, or old VPS services.
echo.
echo Report:
echo %REPORT%
echo.
pause

(
  echo ============================================================
  echo BantuBuzz Creator Team Access Deployment
  echo ============================================================
  echo Started: %DATE% %TIME%
  echo Target: %SSH_USER%@%NEW_SERVER%
  echo.
) > "%REPORT%"

echo [1/6] Building frontend...
pushd "%FRONTEND_DIR%" >nul
call npm run build >> "%REPORT%" 2>&1
if errorlevel 1 (
    popd >nul
    goto :failed
)
popd >nul

echo.
echo [2/6] Compiling backend files locally...
pushd "%ROOT%" >nul
set "PYTHON_EXE=python"
if exist "%BACKEND_DIR%\venv\Scripts\python.exe" set "PYTHON_EXE=%BACKEND_DIR%\venv\Scripts\python.exe"
"%PYTHON_EXE%" -m py_compile ^
  backend\app\__init__.py ^
  backend\app\models\__init__.py ^
  backend\app\models\creator_team.py ^
  backend\app\services\creator_team_service.py ^
  backend\app\routes\creator_team.py ^
  backend\migrations\versions\202607151000_add_creator_team_access.py >> "%REPORT%" 2>&1
if errorlevel 1 (
    popd >nul
    goto :failed
)

echo.
echo [3/6] Packaging files...
if exist "%BACKEND_ARCHIVE%" del /q "%BACKEND_ARCHIVE%"
if exist "%FRONTEND_ARCHIVE%" del /q "%FRONTEND_ARCHIVE%"
if exist "%NORMALIZED_SCRIPT%" del /q "%NORMALIZED_SCRIPT%"

tar -czf "%BACKEND_ARCHIVE%" -C "%BACKEND_DIR%" ^
  app/__init__.py ^
  app/models/__init__.py ^
  app/models/creator_team.py ^
  app/services/creator_team_service.py ^
  app/routes/creator_team.py ^
  migrations/versions/202607151000_add_creator_team_access.py >> "%REPORT%" 2>&1
if errorlevel 1 (
    popd >nul
    goto :failed
)

tar -czf "%FRONTEND_ARCHIVE%" -C "%FRONTEND_DIR%\dist" . >> "%REPORT%" 2>&1
if errorlevel 1 (
    popd >nul
    goto :failed
)
popd >nul

powershell -NoProfile -ExecutionPolicy Bypass -Command "$src='%LOCAL_SCRIPT%'; $dst='%NORMALIZED_SCRIPT%'; $text=[IO.File]::ReadAllText($src) -replace \"`r`n\",\"`n\"; [IO.File]::WriteAllText($dst,$text,(New-Object Text.UTF8Encoding($false)))" >> "%REPORT%" 2>&1
if errorlevel 1 goto :failed

echo.
echo [4/6] Uploading archives and deployment script...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo ============================================================
scp "%BACKEND_ARCHIVE%" %SSH_USER%@%NEW_SERVER%:%REMOTE_BACKEND_ARCHIVE% >> "%REPORT%" 2>&1
if errorlevel 1 goto :failed
scp "%FRONTEND_ARCHIVE%" %SSH_USER%@%NEW_SERVER%:%REMOTE_FRONTEND_ARCHIVE% >> "%REPORT%" 2>&1
if errorlevel 1 goto :failed
scp "%NORMALIZED_SCRIPT%" %SSH_USER%@%NEW_SERVER%:%REMOTE_SCRIPT% >> "%REPORT%" 2>&1
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
if exist "%NORMALIZED_SCRIPT%" del /q "%NORMALIZED_SCRIPT%"

echo.
echo ============================================================
echo Creator team access deployed
echo ============================================================
echo.
echo QA:
echo   https://bantubuzz.com/creator/team
echo   Invite a manager or agent from a Rising or Creator Pro account.
echo.
echo Report:
echo %REPORT%
echo.
pause
exit /b 0

:failed
echo.
echo ============================================================
echo Creator team access deployment failed
echo ============================================================
echo.
echo Review:
echo %REPORT%
echo.
if exist "%BACKEND_ARCHIVE%" del /q "%BACKEND_ARCHIVE%"
if exist "%FRONTEND_ARCHIVE%" del /q "%FRONTEND_ARCHIVE%"
if exist "%NORMALIZED_SCRIPT%" del /q "%NORMALIZED_SCRIPT%"
pause
exit /b 1

:missing_tools
echo ERROR: Windows OpenSSH client and tar are required.
pause
exit /b 1
