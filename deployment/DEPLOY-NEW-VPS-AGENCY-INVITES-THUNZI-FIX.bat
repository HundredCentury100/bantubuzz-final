@echo off
setlocal EnableExtensions

set "NEW_SERVER=13.140.159.150"
set "SSH_USER=root"
set "ROOT=%~dp0.."
set "BACKEND_ARCHIVE=%TEMP%\bantubuzz-agency-invites-thunzi-backend.tar.gz"
set "REPORT_DIR=%ROOT%\deployment\vps\reports"

where ssh >nul 2>&1 || goto :missing_tools
where scp >nul 2>&1 || goto :missing_tools
where tar >nul 2>&1 || goto :missing_tools

if not exist "%REPORT_DIR%" mkdir "%REPORT_DIR%"
for /f %%i in ('powershell.exe -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TIMESTAMP=%%i"
set "REPORT=%REPORT_DIR%\new-vps-agency-invites-thunzi-fix-%NEW_SERVER%-%TIMESTAMP%.txt"

echo ============================================================
echo BantuBuzz Agency Invites and ThunziAI Fix
echo ============================================================
echo.
echo Target: %SSH_USER%@%NEW_SERVER%
echo.
echo This targeted deployment will:
echo   - Restore Agency workspace invite availability
echo   - Ensure Agency plans have at least 10 team invite seats
echo   - Stop the owner seat from consuming an invite slot
echo   - Update ThunziAI creator setup to use the documented register endpoint first
echo   - Send the full documented company payload required by ThunziAI
echo   - Restart backend and Celery worker
echo.
echo It will NOT deploy frontend, run migrations, or change CMS/DNS/messaging.
echo.
echo Report:
echo %REPORT%
echo.
pause

echo.
echo [1/4] Local backend syntax check...
pushd "%ROOT%\backend"
venv\Scripts\python.exe -m py_compile app\services\workspace_service.py app\services\thunzi_service.py
if errorlevel 1 goto :failed_popd
popd

echo.
echo [2/4] Packaging targeted backend files...
if exist "%BACKEND_ARCHIVE%" del /q "%BACKEND_ARCHIVE%"
tar -czf "%BACKEND_ARCHIVE%" -C "%ROOT%\backend" ^
  app/services/workspace_service.py ^
  app/services/thunzi_service.py
if errorlevel 1 goto :failed

echo.
echo [3/4] Uploading release files...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo ============================================================
scp "%BACKEND_ARCHIVE%" "%ROOT%\deployment\vps\deploy-agency-invites-thunzi-fix.sh" %SSH_USER%@%NEW_SERVER%:/tmp/
if errorlevel 1 goto :failed

echo.
echo [4/4] Installing files and restarting services...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo ============================================================
ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=15 -o ServerAliveCountMax=20 ^
  %SSH_USER%@%NEW_SERVER% "bash /tmp/deploy-agency-invites-thunzi-fix.sh" 2>&1 | powershell.exe -NoProfile -Command ^
  "$input | Tee-Object -FilePath '%REPORT%'; if (Select-String -Quiet -SimpleMatch 'BANTUBUZZ_NEW_VPS_AGENCY_INVITES_THUNZI_FIX_SUCCESS' '%REPORT%') { exit 0 } else { exit 1 }"
if errorlevel 1 goto :failed

echo.
del /q "%BACKEND_ARCHIVE%" 2>nul

echo ============================================================
echo Agency invites and ThunziAI fix deployed
echo ============================================================
echo.
echo QA:
echo   - Open /brand/agency, open a client workspace, confirm Invite Member is enabled.
echo   - Try a new creator TikTok connection again.
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
echo.
echo ============================================================
echo Agency invites and ThunziAI fix failed
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
