@echo off
setlocal EnableExtensions

set "NEW_SERVER=13.140.159.150"
set "SSH_USER=root"
set "ROOT=%~dp0.."
set "BACKEND_ARCHIVE=%TEMP%\bantubuzz-creator-browse-featured-hotfix.tar.gz"
set "REPORT_DIR=%ROOT%\deployment\vps\reports"

where ssh >nul 2>&1 || goto :missing_tools
where scp >nul 2>&1 || goto :missing_tools
where tar >nul 2>&1 || goto :missing_tools

if not exist "%REPORT_DIR%" mkdir "%REPORT_DIR%"
for /f %%i in ('powershell.exe -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TIMESTAMP=%%i"
set "REPORT=%REPORT_DIR%\new-vps-creator-browse-featured-hotfix-%NEW_SERVER%-%TIMESTAMP%.txt"

echo ============================================================
echo BantuBuzz Creator Browse and Featured Admin Hotfix
echo ============================================================
echo.
echo Target: %SSH_USER%@%NEW_SERVER%
echo.
echo This targeted deployment will:
echo   - Deploy the creator browse route timezone fix
echo   - Deploy the required migration chain through 202606181300
echo   - Ensure creator featured columns exist for admin featuring
echo   - Restart backend, Celery worker, and Celery beat
echo   - Check local and public health endpoints
echo.
echo It will NOT rebuild or deploy the frontend, CMS, DNS, or messaging service.
echo.
echo Report:
echo %REPORT%
echo.
pause

echo.
echo [1/5] Local backend syntax check...
pushd "%ROOT%\backend"
venv\Scripts\python.exe -m py_compile ^
    app\routes\creators.py ^
    migrations\versions\202606181000_add_inactive_reminder_sent_at.py ^
    migrations\versions\202606181200_add_creator_leaderboard_preferences.py ^
    migrations\versions\202606181300_ensure_creator_featured_fields.py
if errorlevel 1 goto :failed_popd
popd

echo.
echo [2/5] Packaging targeted backend files...
if exist "%BACKEND_ARCHIVE%" del /q "%BACKEND_ARCHIVE%"
tar -czf "%BACKEND_ARCHIVE%" -C "%ROOT%\backend" ^
    app/routes/creators.py ^
    migrations/versions/202606181000_add_inactive_reminder_sent_at.py ^
    migrations/versions/202606181200_add_creator_leaderboard_preferences.py ^
    migrations/versions/202606181300_ensure_creator_featured_fields.py
if errorlevel 1 goto :failed

echo.
echo [3/5] Uploading hotfix release...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo ============================================================
scp "%BACKEND_ARCHIVE%" "%ROOT%\deployment\vps\deploy-creator-browse-featured-hotfix.sh" %SSH_USER%@%NEW_SERVER%:/tmp/
if errorlevel 1 goto :failed

echo.
echo [4/5] Installing files, migrating, and restarting services...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo ============================================================
ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=15 -o ServerAliveCountMax=20 ^
    %SSH_USER%@%NEW_SERVER% "bash /tmp/deploy-creator-browse-featured-hotfix.sh" 2>&1 | powershell.exe -NoProfile -Command ^
    "$input | Tee-Object -FilePath '%REPORT%'; if (Select-String -Quiet -SimpleMatch 'BANTUBUZZ_NEW_VPS_CREATOR_BROWSE_FEATURED_HOTFIX_SUCCESS' '%REPORT%') { exit 0 } else { exit 1 }"
if errorlevel 1 goto :failed

echo.
echo [5/5] Cleaning local archive...
del /q "%BACKEND_ARCHIVE%" 2>nul

echo.
echo ============================================================
echo Creator browse and featured admin hotfix deployed
echo ============================================================
echo.
echo Verify:
echo   https://bantubuzz.com/browse/creators
echo   https://bantubuzz.com/admin/featured
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
echo Creator browse and featured admin hotfix failed
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
