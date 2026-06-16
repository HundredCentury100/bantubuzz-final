@echo off
setlocal EnableExtensions

set "SERVER=13.140.159.150"
set "SSH_USER=root"
set "ROOT=%~dp0.."
set "CMS_ROOT=D:\Bantubuzz-headless-CMS"
set "REMOTE_SCRIPT=%ROOT%\deployment\vps\deploy-cms-editorial-polish.sh"
set "ARCHIVE=%TEMP%\bantubuzz-cms-editorial-polish.tar.gz"
set "REPORT_DIR=%ROOT%\deployment\vps\reports"

if not exist "%CMS_ROOT%\package.json" (
    echo ERROR: CMS project not found at %CMS_ROOT%
    pause
    exit /b 1
)

if not exist "%REMOTE_SCRIPT%" (
    echo ERROR: Editorial polish deployment script not found.
    pause
    exit /b 1
)

if not exist "%REPORT_DIR%" mkdir "%REPORT_DIR%"
for /f %%i in ('powershell.exe -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TIMESTAMP=%%i"
set "REPORT=%REPORT_DIR%\cms-editorial-polish-%SERVER%-%TIMESTAMP%.txt"

echo ============================================================
echo Deploy BantuBuzz CMS Editorial Polish
echo ============================================================
echo.
echo This deploys only the public article, author, navigation,
echo social-icon, preview, and stylesheet changes.
echo.
echo It will:
echo   - Move Listen to Article above article metadata and image
echo   - Show social icons on author profiles and article author cards
echo   - Add green Join as Creator and navy Join as Brand buttons
echo   - Rebuild and restart only the CMS web service
echo.
echo It will NOT run migrations, install dependencies, change
echo PostgreSQL, Apache, SSL, CMS users, media, or article content.
echo.
echo Report:
echo %REPORT%
echo.
pause

echo.
echo [1/4] Verifying local CMS editorial changes...
pushd "%CMS_ROOT%"
call npm.cmd run typecheck
if errorlevel 1 goto :failed_popd
popd

echo.
echo [2/4] Packaging only required CMS files...
if exist "%ARCHIVE%" del /q "%ARCHIVE%"
tar -czf "%ARCHIVE%" -C "%CMS_ROOT%" ^
    "apps/web/src/app/(frontend)/authors/[slug]/page.tsx" ^
    "apps/web/src/app/(frontend)/blog/[slug]/page.tsx" ^
    "apps/web/src/app/(frontend)/preview/posts/[slug]/page.tsx" ^
    "apps/web/src/app/globals.css" ^
    "apps/web/src/components/editorial-shell.tsx" ^
    "apps/web/src/components/social-icons.tsx" ^
    "apps/web/src/lib/site-metadata.ts"
if errorlevel 1 goto :failed

echo.
echo [3/4] Uploading targeted editorial release...
echo PASSWORD PROMPT: NEW VPS %SERVER%
scp "%ARCHIVE%" "%REMOTE_SCRIPT%" %SSH_USER%@%SERVER%:/tmp/
if errorlevel 1 goto :failed

echo.
echo [4/4] Installing, rebuilding, restarting, and verifying...
echo PASSWORD PROMPT: NEW VPS %SERVER%
ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=15 -o ServerAliveCountMax=60 ^
    %SSH_USER%@%SERVER% "bash /tmp/deploy-cms-editorial-polish.sh" 2>&1 | powershell.exe -NoProfile -Command ^
    "$input | Tee-Object -FilePath '%REPORT%'; if (Select-String -Quiet -SimpleMatch 'BANTUBUZZ_CMS_EDITORIAL_POLISH_SUCCESS' '%REPORT%') { exit 0 } else { exit 1 }"
if errorlevel 1 goto :failed

del /q "%ARCHIVE%" 2>nul

echo.
echo ============================================================
echo CMS editorial polish deployed successfully
echo ============================================================
echo.
echo Article:
echo https://bantubuzz.com/blog/how-to-turn-your-influence-into-income
echo.
echo Report:
echo %REPORT%
echo.
pause
exit /b 0

:failed_popd
popd

:failed
if exist "%ARCHIVE%" del /q "%ARCHIVE%"
echo.
echo ============================================================
echo CMS editorial polish deployment failed
echo ============================================================
echo.
echo Review:
echo %REPORT%
echo.
pause
exit /b 1
