@echo off
setlocal EnableExtensions

set "NEW_SERVER=13.140.159.150"
set "SSH_USER=root"
set "ROOT=%~dp0.."
set "FRONTEND_DIR=%ROOT%\frontend"
set "BACKEND_DIR=%ROOT%\backend"
set "REPORT_DIR=%ROOT%\deployment\vps\reports"
set "REMOTE_SCRIPT=/tmp/deploy-featured-creators-search-fix.sh"
set "LOCAL_SCRIPT=%ROOT%\deployment\vps\deploy-featured-creators-search-fix.sh"
set "BACKEND_ARCHIVE=%TEMP%\bantubuzz-featured-search-backend.tar.gz"
set "FRONTEND_ARCHIVE=%TEMP%\bantubuzz-featured-search-frontend.tar.gz"
set "REMOTE_BACKEND_ARCHIVE=/tmp/bantubuzz-featured-search-backend.tar.gz"
set "REMOTE_FRONTEND_ARCHIVE=/tmp/bantubuzz-featured-search-frontend.tar.gz"

where ssh >nul 2>&1 || goto :missing_tools
where scp >nul 2>&1 || goto :missing_tools
where tar >nul 2>&1 || goto :missing_tools

if not exist "%REPORT_DIR%" mkdir "%REPORT_DIR%"
for /f %%i in ('powershell.exe -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TIMESTAMP=%%i"
set "REPORT=%REPORT_DIR%\new-vps-featured-creators-search-fix-%NEW_SERVER%-%TIMESTAMP%.txt"

echo ============================================================
echo BantuBuzz Featured Creators + Browse Search Fix
echo ============================================================
echo.
echo NEW VPS: %SSH_USER%@%NEW_SERVER%
echo.
echo This deployment will:
echo   - Build the frontend locally
echo   - Upload rebuilt frontend dist
echo   - Upload targeted backend creator/admin featured routes
echo   - Restart backend and reload Apache
echo.
echo This deployment will NOT:
echo   - Run database migrations
echo   - Touch CMS, DNS, messaging, or payment services
echo.
echo Report:
echo %REPORT%
echo.
pause

(
  echo ============================================================
  echo BantuBuzz Featured Creators + Browse Search Fix
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
echo [2/6] Compiling targeted backend files locally...
pushd "%ROOT%" >nul
set "PYTHON_EXE=python"
if exist "%BACKEND_DIR%\venv\Scripts\python.exe" set "PYTHON_EXE=%BACKEND_DIR%\venv\Scripts\python.exe"
"%PYTHON_EXE%" -m py_compile backend\app\routes\admin\featured.py backend\app\routes\creators.py >> "%REPORT%" 2>&1
if errorlevel 1 (
    popd >nul
    goto :failed
)

echo.
echo [3/6] Packaging targeted files...
if exist "%BACKEND_ARCHIVE%" del /q "%BACKEND_ARCHIVE%"
if exist "%FRONTEND_ARCHIVE%" del /q "%FRONTEND_ARCHIVE%"
tar -czf "%BACKEND_ARCHIVE%" -C "%BACKEND_DIR%" app/routes/admin/featured.py app/routes/creators.py
if errorlevel 1 (
    popd >nul
    goto :failed
)
tar -czf "%FRONTEND_ARCHIVE%" -C "%FRONTEND_DIR%\dist" .
if errorlevel 1 (
    popd >nul
    goto :failed
)
popd >nul

echo.
echo [4/6] Uploading archives and deployment script...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo ============================================================
scp "%BACKEND_ARCHIVE%" %SSH_USER%@%NEW_SERVER%:%REMOTE_BACKEND_ARCHIVE% >> "%REPORT%" 2>&1
if errorlevel 1 goto :failed
scp "%FRONTEND_ARCHIVE%" %SSH_USER%@%NEW_SERVER%:%REMOTE_FRONTEND_ARCHIVE% >> "%REPORT%" 2>&1
if errorlevel 1 goto :failed
scp "%LOCAL_SCRIPT%" %SSH_USER%@%NEW_SERVER%:%REMOTE_SCRIPT% >> "%REPORT%" 2>&1
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

echo.
echo ============================================================
echo Featured creators and browse search fix deployed
echo ============================================================
echo.
echo QA:
echo   https://bantubuzz.com/admin/featured
echo   https://bantubuzz.com/browse/creators
echo.
echo Report:
echo %REPORT%
echo.
pause
exit /b 0

:failed
echo.
echo ============================================================
echo Featured creators and browse search fix failed
echo ============================================================
echo.
echo Review:
echo %REPORT%
echo.
if exist "%BACKEND_ARCHIVE%" del /q "%BACKEND_ARCHIVE%"
if exist "%FRONTEND_ARCHIVE%" del /q "%FRONTEND_ARCHIVE%"
pause
exit /b 1

:missing_tools
echo ERROR: Windows OpenSSH client and tar are required.
pause
exit /b 1
