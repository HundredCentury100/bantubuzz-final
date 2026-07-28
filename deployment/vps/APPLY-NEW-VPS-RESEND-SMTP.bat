@echo off
setlocal EnableExtensions

set "NEW_SERVER=13.140.159.150"
set "SSH_USER=root"
set "ROOT=%~dp0..\.."
set "REPORT_DIR=%ROOT%\deployment\vps\reports"
set "LOCAL_SCRIPT=%ROOT%\deployment\vps\apply-resend-smtp.sh"
set "REMOTE_SCRIPT=/tmp/apply-resend-smtp.sh"
set "API_KEY_FILE=%ROOT%\Resend BB API Key.txt"
set "REMOTE_API_KEY_FILE=/tmp/bantubuzz-resend-api-key.txt"
set "NORMALIZED_SCRIPT=%TEMP%\apply-resend-smtp.sh"

where ssh >nul 2>&1 || goto :missing_tools
where scp >nul 2>&1 || goto :missing_tools

if not exist "%API_KEY_FILE%" (
  echo Missing Resend API key file:
  echo %API_KEY_FILE%
  pause
  exit /b 1
)

if not exist "%REPORT_DIR%" mkdir "%REPORT_DIR%"
for /f %%i in ('powershell.exe -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TIMESTAMP=%%i"
set "REPORT=%REPORT_DIR%\new-vps-resend-smtp-%NEW_SERVER%-%TIMESTAMP%.txt"

echo ============================================================
echo BantuBuzz Resend SMTP Configuration
echo ============================================================
echo.
echo Target: %SSH_USER%@%NEW_SERVER%
echo.
echo This will:
echo   - Configure all BantuBuzz email paths to use Resend SMTP
echo   - Set MAIL_* and SMTP_* environment variables
echo   - Restart backend and Celery services
echo   - Verify SMTP login without printing the API key
echo.
echo It will NOT touch the frontend, CMS, database, or DNS.
echo.
echo Report:
echo %REPORT%
echo.
pause

(
  echo ============================================================
  echo BantuBuzz Resend SMTP Configuration
  echo ============================================================
  echo Started: %DATE% %TIME%
  echo Target: %SSH_USER%@%NEW_SERVER%
  echo API key file present: yes
  echo.
) > "%REPORT%"

echo [1/3] Preparing deploy script...
if exist "%NORMALIZED_SCRIPT%" del /q "%NORMALIZED_SCRIPT%"
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$src='%LOCAL_SCRIPT%'; $dst='%NORMALIZED_SCRIPT%'; $text=[IO.File]::ReadAllText($src) -replace \"`r`n\",\"`n\"; [IO.File]::WriteAllText($dst,$text,(New-Object Text.UTF8Encoding($false)))" >> "%REPORT%" 2>&1
if errorlevel 1 goto :failed

echo [2/3] Uploading script and API key...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo ============================================================
scp "%NORMALIZED_SCRIPT%" %SSH_USER%@%NEW_SERVER%:%REMOTE_SCRIPT% >> "%REPORT%" 2>&1
if errorlevel 1 goto :failed
scp "%API_KEY_FILE%" %SSH_USER%@%NEW_SERVER%:%REMOTE_API_KEY_FILE% >> "%REPORT%" 2>&1
if errorlevel 1 goto :failed

echo [3/3] Applying Resend SMTP settings...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo ============================================================
ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=15 -o ServerAliveCountMax=20 ^
  %SSH_USER%@%NEW_SERVER% "bash %REMOTE_SCRIPT%" >> "%REPORT%" 2>&1
if errorlevel 1 goto :failed

if exist "%NORMALIZED_SCRIPT%" del /q "%NORMALIZED_SCRIPT%"

echo.
echo ============================================================
echo Resend SMTP configured successfully
echo ============================================================
echo.
echo QA:
echo   - Register a test user and confirm OTP email arrives
echo   - Send a workspace/team invite and confirm email arrives
echo   - Trigger a wallet/payment email and confirm email arrives
echo.
echo Report:
echo %REPORT%
echo.
pause
exit /b 0

:missing_tools
echo Missing required tool. Ensure ssh and scp are available in PATH.
pause
exit /b 1

:failed
echo.
echo ============================================================
echo Resend SMTP configuration failed
echo ============================================================
echo.
echo Review:
echo %REPORT%
echo.
if exist "%NORMALIZED_SCRIPT%" del /q "%NORMALIZED_SCRIPT%"
pause
exit /b 1
