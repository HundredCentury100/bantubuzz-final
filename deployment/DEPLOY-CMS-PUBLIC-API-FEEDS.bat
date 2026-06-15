@echo off
setlocal EnableExtensions

set "SERVER=13.140.159.150"
set "SSH_USER=root"
set "ROOT=%~dp0.."
set "CMS_ROOT=D:\Bantubuzz-headless-CMS"
set "REMOTE_SCRIPT=%ROOT%\deployment\vps\deploy-cms-public-api-feeds.sh"
set "ARCHIVE=%TEMP%\bantubuzz-cms-public-api-feeds.tar.gz"
set "REPORT_DIR=%ROOT%\deployment\vps\reports"

if not exist "%CMS_ROOT%\package.json" (
    echo ERROR: CMS project not found at %CMS_ROOT%
    pause
    exit /b 1
)

if not exist "%REMOTE_SCRIPT%" (
    echo ERROR: Public API deployment script not found.
    pause
    exit /b 1
)

if not exist "%REPORT_DIR%" mkdir "%REPORT_DIR%"
for /f %%i in ('powershell.exe -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TIMESTAMP=%%i"
set "REPORT=%REPORT_DIR%\cms-public-api-feeds-%SERVER%-%TIMESTAMP%.txt"

echo ============================================================
echo Deploy BantuBuzz CMS Public APIs and Feeds
echo ============================================================
echo.
echo This deploys only public content API, feed, and documentation files.
echo.
echo It will:
echo   - Upload 16 targeted CMS files
echo   - Typecheck and rebuild the CMS
echo   - Restart only the CMS web service
echo   - Verify posts, authors, taxonomy, feeds, and API docs
echo.
echo It will NOT:
echo   - Replace the whole CMS source
echo   - Install dependencies or run migrations
echo   - Change PostgreSQL, Redis, Apache, SSL, users, media, or content
echo.
echo Report:
echo %REPORT%
echo.
pause

echo.
echo [1/4] Verifying local CMS API changes...
pushd "%CMS_ROOT%"
call npm.cmd run typecheck
if errorlevel 1 goto :failed_popd
popd

echo.
echo [2/4] Packaging only required files...
if exist "%ARCHIVE%" del /q "%ARCHIVE%"
tar -czf "%ARCHIVE%" -C "%CMS_ROOT%" ^
    "apps/web/src/app/(frontend)/api/authors/route.ts" ^
    "apps/web/src/app/(frontend)/api/authors/[slug]/route.ts" ^
    "apps/web/src/app/(frontend)/api/categories/route.ts" ^
    "apps/web/src/app/(frontend)/api/categories/[slug]/route.ts" ^
    "apps/web/src/app/(frontend)/api/feed.json/route.ts" ^
    "apps/web/src/app/(frontend)/api/openapi.json/route.ts" ^
    "apps/web/src/app/(frontend)/api/tags/route.ts" ^
    "apps/web/src/app/(frontend)/api/tags/[slug]/route.ts" ^
    "apps/web/src/app/(frontend)/developers/page.tsx" ^
    "apps/web/src/app/(frontend)/feed.json/route.ts" ^
    "apps/web/src/app/(frontend)/rss.xml/route.ts" ^
    "apps/web/src/app/(frontend)/rss/[...segments]/route.ts" ^
    "apps/web/src/lib/content-repository.ts" ^
    "apps/web/src/lib/public-feeds.ts" ^
    "docs/implementation-status.md" ^
    "packages/seo/src/feeds.ts"
if errorlevel 1 goto :failed

echo.
echo [3/4] Uploading targeted public API release...
echo PASSWORD PROMPT: NEW VPS %SERVER%
scp "%ARCHIVE%" "%REMOTE_SCRIPT%" %SSH_USER%@%SERVER%:/tmp/
if errorlevel 1 goto :failed

echo.
echo [4/4] Installing release, rebuilding, and verifying...
echo PASSWORD PROMPT: NEW VPS %SERVER%
ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=15 -o ServerAliveCountMax=30 ^
    %SSH_USER%@%SERVER% "bash /tmp/deploy-cms-public-api-feeds.sh" 2>&1 | powershell.exe -NoProfile -Command ^
    "$input | Tee-Object -FilePath '%REPORT%'; if (Select-String -Quiet -SimpleMatch 'BANTUBUZZ_CMS_PUBLIC_API_DEPLOY_SUCCESS' '%REPORT%') { exit 0 } else { exit 1 }"
if errorlevel 1 goto :failed

del /q "%ARCHIVE%" 2>nul

echo.
echo ============================================================
echo CMS public APIs and feeds deployed successfully
echo ============================================================
echo.
echo Developer docs:
echo https://bantubuzz.com/developers
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
echo CMS public API deployment failed
echo ============================================================
echo.
echo Review:
echo %REPORT%
echo.
pause
exit /b 1
