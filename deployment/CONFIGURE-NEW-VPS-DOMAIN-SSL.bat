@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "NEW_SERVER=13.140.159.150"
set "SSH_USER=root"
set "ROOT=%~dp0.."
set "REMOTE_SCRIPT=%ROOT%\deployment\vps\configure-domain-ssl.sh"
set "APACHE_CONF=%ROOT%\deployment\vps\bantubuzz-platform.conf"
set "REPORT_DIR=%ROOT%\deployment\vps\reports"

if not exist "%REMOTE_SCRIPT%" (
    echo ERROR: Remote SSL script not found:
    echo %REMOTE_SCRIPT%
    pause
    exit /b 1
)

if not exist "%APACHE_CONF%" (
    echo ERROR: Apache platform config not found:
    echo %APACHE_CONF%
    pause
    exit /b 1
)

set "CERTBOT_EMAIL=hundred@bantubuzz.com"
set /p "EMAIL_INPUT=Enter Let's Encrypt email [hundred@bantubuzz.com]: "
if not "%EMAIL_INPUT%"=="" set "CERTBOT_EMAIL=%EMAIL_INPUT%"

where ssh >nul 2>&1 || goto :missing_tools
where scp >nul 2>&1 || goto :missing_tools

if not exist "%REPORT_DIR%" mkdir "%REPORT_DIR%"
for /f %%i in ('powershell.exe -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TIMESTAMP=%%i"
set "REPORT=%REPORT_DIR%\new-vps-domain-ssl-%NEW_SERVER%-%TIMESTAMP%.txt"

for /f "usebackq delims=" %%i in (`powershell.exe -NoProfile -Command "[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($env:CERTBOT_EMAIL))"`) do set "CERTBOT_EMAIL_B64=%%i"

echo ============================================================
echo Configure BantuBuzz Domain and SSL on New VPS
echo ============================================================
echo.
echo New VPS: %SSH_USER%@%NEW_SERVER%
echo Domains:
echo   - https://bantubuzz.com
echo   - https://www.bantubuzz.com
echo Existing CMS:
echo   - https://app.bantubuzz.com
echo.
echo This will:
echo   - Verify DNS points to %NEW_SERVER%
echo   - Request/renew Let's Encrypt SSL for bantubuzz.com and www
echo   - Install the final Apache platform config
echo   - Reload Apache
echo   - Verify public HTTPS API, frontend, and CMS admin
echo.
echo It will NOT change the database or CMS content.
echo.
echo Report:
echo %REPORT%
echo.
pause

echo.
echo [1/3] Uploading SSL/domain scripts and Apache config...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo ============================================================
scp "%REMOTE_SCRIPT%" "%APACHE_CONF%" %SSH_USER%@%NEW_SERVER%:/tmp/
if errorlevel 1 goto :failed

echo.
echo [2/3] Configuring domain and SSL...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo ============================================================
ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=15 -o ServerAliveCountMax=30 ^
    %SSH_USER%@%NEW_SERVER% "CERTBOT_EMAIL=$(printf '%%s' '%CERTBOT_EMAIL_B64%' | base64 -d) bash /tmp/configure-domain-ssl.sh" 2>&1 | powershell.exe -NoProfile -Command ^
    "$input | Tee-Object -FilePath '%REPORT%'; if (Select-String -Quiet -SimpleMatch 'BANTUBUZZ_DOMAIN_SSL_SUCCESS' '%REPORT%') { exit 0 } else { exit 1 }"
if errorlevel 1 goto :failed

echo.
echo [3/3] Cleaning temporary files...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo ============================================================
ssh %SSH_USER%@%NEW_SERVER% "rm -f /tmp/configure-domain-ssl.sh /tmp/bantubuzz-platform.conf"
if errorlevel 1 goto :failed

echo.
echo ============================================================
echo Domain and SSL configured successfully
echo ============================================================
echo.
echo Open:
echo https://bantubuzz.com
echo https://bantubuzz.com/api/health
echo https://app.bantubuzz.com/admin
echo.
echo Report:
echo %REPORT%
echo.
pause
exit /b 0

:failed
echo.
echo ============================================================
echo Domain/SSL configuration failed
echo ============================================================
echo.
echo Review:
echo %REPORT%
echo.
pause
exit /b 1

:missing_tools
echo ERROR: Windows OpenSSH client is required.
pause
exit /b 1
