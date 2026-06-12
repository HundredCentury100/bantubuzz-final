@echo off
setlocal EnableExtensions

echo ============================================================
echo BantuBuzz CMS Media Upload and Audit Fix
echo ============================================================
echo.
echo This deploys the current reviewed CMS update to the new VPS.
echo It preserves the CMS database, users, media, secrets, and SSL.
echo.
call "%~dp0DEPLOY-CMS-METADATA-BRIDGE-UPDATE.bat"
exit /b %errorlevel%
