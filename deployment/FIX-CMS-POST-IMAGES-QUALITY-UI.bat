@echo off
setlocal EnableExtensions

echo ============================================================
echo BantuBuzz CMS Post Images and Quality UI Fix
echo ============================================================
echo.
echo This deploys the reviewed CMS fix for public post images,
echo readable quality findings, and article CTA brand colors.
echo.
call "%~dp0DEPLOY-CMS-METADATA-BRIDGE-UPDATE.bat"
exit /b %errorlevel%
