@echo off
setlocal EnableExtensions

echo ============================================================
echo BantuBuzz CMS Post Preview and Editorial Status Fix
echo ============================================================
echo.
echo This deploys the reviewed CMS fix for post previews,
echo public post listing, and editorial status saves.
echo.
call "%~dp0DEPLOY-CMS-METADATA-BRIDGE-UPDATE.bat"
exit /b %errorlevel%
