@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "VPS_HOST=13.140.159.150"
set "VPS_USER=root"
set "SITE_KEY=6LfxaEItAAAAAPQZBzfWSIUV0yyFGz88OFZJE3KE"
set "PROJECT_ID=bantubuzz"
set "SCRIPT_DIR=%~dp0"
set "ROOT_DIR=%SCRIPT_DIR%.."
set "REMOTE_SCRIPT=/tmp/apply-bantubuzz-recaptcha-env.sh"
set "REMOTE_ENV=/tmp/bantubuzz-recaptcha.env"
set "REPORT_DIR=%ROOT_DIR%\deployment\vps\reports"

for /f %%I in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "STAMP=%%I"
set "REPORT=%REPORT_DIR%\new-vps-recaptcha-env-%VPS_HOST%-%STAMP%.txt"

if not exist "%REPORT_DIR%" mkdir "%REPORT_DIR%" >nul 2>&1

echo ============================================================
echo BantuBuzz reCAPTCHA Enterprise Environment Update
echo ============================================================
echo.
echo Target: %VPS_USER%@%VPS_HOST%
echo.
echo This will:
echo   - Set RECAPTCHA_ENTERPRISE_* values in /etc/bantubuzz/platform.env
echo   - Restart backend and Celery services
echo   - Check the public API health endpoint
echo.
echo It will NOT:
echo   - Commit or print the API key
echo   - Deploy frontend/backend source files
echo   - Change DNS, Apache, CMS, or messaging services
echo.
echo Paste the Google Cloud API key when prompted.
echo Report: %REPORT%
echo.
pause

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference='Stop';" ^
  "$key = Read-Host 'Google Cloud reCAPTCHA Enterprise API key' -AsSecureString;" ^
  "$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($key);" ^
  "try { $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) };" ^
  "if ([string]::IsNullOrWhiteSpace($plain)) { throw 'API key is required' };" ^
  "$tmp = Join-Path $env:TEMP ('bantubuzz-recaptcha-' + [guid]::NewGuid().ToString('N') + '.env');" ^
  "$lines = @('RECAPTCHA_ENTERPRISE_SITE_KEY=%SITE_KEY%','RECAPTCHA_ENTERPRISE_PROJECT_ID=%PROJECT_ID%','RECAPTCHA_ENTERPRISE_API_KEY=' + $plain,'RECAPTCHA_ENTERPRISE_MIN_SCORE=0.5','RECAPTCHA_ENTERPRISE_ALLOWED_HOSTNAMES=bantubuzz.com,www.bantubuzz.com');" ^
  "[IO.File]::WriteAllLines($tmp, $lines, [Text.UTF8Encoding]::new($false));" ^
  "Set-Content -Path (Join-Path $env:TEMP 'bantubuzz-recaptcha-env-path.txt') -Value $tmp -NoNewline;"

if errorlevel 1 goto fail

set /p LOCAL_ENV=<"%TEMP%\bantubuzz-recaptcha-env-path.txt"

(
  echo ============================================================
  echo BantuBuzz reCAPTCHA Enterprise Environment Update
  echo ============================================================
  echo Target: %VPS_USER%@%VPS_HOST%
  echo Started: %DATE% %TIME%
  echo.
) > "%REPORT%"

echo [1/3] Uploading environment updater...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %VPS_HOST%
echo ============================================================
scp "%ROOT_DIR%\deployment\vps\apply-recaptcha-env.sh" "%VPS_USER%@%VPS_HOST%:%REMOTE_SCRIPT%" >> "%REPORT%" 2>&1
if errorlevel 1 goto fail

echo [2/3] Uploading secret environment file...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %VPS_HOST%
echo ============================================================
scp "%LOCAL_ENV%" "%VPS_USER%@%VPS_HOST%:%REMOTE_ENV%" >> "%REPORT%" 2>&1
if errorlevel 1 goto fail

del "%LOCAL_ENV%" >nul 2>&1
del "%TEMP%\bantubuzz-recaptcha-env-path.txt" >nul 2>&1

echo [3/3] Applying env and restarting services...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %VPS_HOST%
echo ============================================================
ssh "%VPS_USER%@%VPS_HOST%" "bash %REMOTE_SCRIPT%" >> "%REPORT%" 2>&1
if errorlevel 1 goto fail

echo.
echo ============================================================
echo reCAPTCHA environment updated
echo ============================================================
echo.
echo Next QA check:
echo   - Register a brand/creator and confirm bot protection still allows real users
echo.
echo Report:
echo %REPORT%
echo.
pause
exit /b 0

:fail
del "%LOCAL_ENV%" >nul 2>&1
del "%TEMP%\bantubuzz-recaptcha-env-path.txt" >nul 2>&1
echo.
echo ============================================================
echo reCAPTCHA environment update failed
echo ============================================================
echo.
echo Review:
echo %REPORT%
echo.
pause
exit /b 1
