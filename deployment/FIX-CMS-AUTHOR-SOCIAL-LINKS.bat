@echo off
setlocal EnableExtensions

echo ============================================================
echo BantuBuzz CMS Author Social Links Fix
echo ============================================================
echo.
echo This deploys the reviewed author-profile editor update.
echo The CMS database, users, media, secrets, and SSL are preserved.
echo.
call "%~dp0DEPLOY-CMS-METADATA-BRIDGE-UPDATE.bat"
exit /b %errorlevel%
