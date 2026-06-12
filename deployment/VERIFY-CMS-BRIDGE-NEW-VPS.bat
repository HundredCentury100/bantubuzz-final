@echo off
setlocal EnableExtensions

set "ROOT=%~dp0.."
set "REPORT_DIR=%ROOT%\deployment\vps\reports"

if not exist "%REPORT_DIR%" mkdir "%REPORT_DIR%"
for /f %%i in ('powershell.exe -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TIMESTAMP=%%i"
set "REPORT=%REPORT_DIR%\cms-bridge-verify-13.140.159.150-%TIMESTAMP%.txt"

echo ============================================================
echo Verify BantuBuzz CMS Bridge
echo ============================================================
echo.
echo This will check:
echo   - Main platform signed CMS health bridge
echo   - Public CMS content API under bantubuzz.com/content-api
echo   - Public blog route on bantubuzz.com
echo   - Payload admin route on app.bantubuzz.com
echo.
echo Report:
echo %REPORT%
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference = 'Stop';" ^
  "$checks = @(" ^
  "  @{ Name = 'Platform signed CMS health'; Url = 'https://bantubuzz.com/api/internal/cms/content-health'; Expect = 'healthy' }," ^
  "  @{ Name = 'Public content API'; Url = 'https://bantubuzz.com/content-api/posts?limit=1'; Expect = 'docs' }," ^
  "  @{ Name = 'Public blog route'; Url = 'https://bantubuzz.com/blog'; Expect = 'Articles' }," ^
  "  @{ Name = 'Payload admin route'; Url = 'https://app.bantubuzz.com/admin'; Expect = 'BantuBuzz' }" ^
  ");" ^
  "$lines = New-Object System.Collections.Generic.List[string];" ^
  "$ok = $true;" ^
  "foreach ($check in $checks) {" ^
  "  $lines.Add('=== ' + $check.Name + ' ===');" ^
  "  $lines.Add($check.Url);" ^
  "  try {" ^
  "    $response = Invoke-WebRequest -Uri $check.Url -UseBasicParsing -MaximumRedirection 5 -TimeoutSec 30;" ^
  "    $body = [string]$response.Content;" ^
  "    $lines.Add('Status: ' + [int]$response.StatusCode);" ^
  "    $lines.Add(($body.Substring(0, [Math]::Min(800, $body.Length))));" ^
  "    if ($body -notmatch [Regex]::Escape($check.Expect)) {" ^
  "      $lines.Add('FAILED: expected marker not found: ' + $check.Expect);" ^
  "      $ok = $false;" ^
  "    } else {" ^
  "      $lines.Add('OK');" ^
  "    }" ^
  "  } catch {" ^
  "    $lines.Add('FAILED: ' + $_.Exception.Message);" ^
  "    $ok = $false;" ^
  "  }" ^
  "  $lines.Add('');" ^
  "}" ^
  "if ($ok) { $lines.Add('BANTUBUZZ_CMS_BRIDGE_VERIFY_SUCCESS') } else { $lines.Add('BANTUBUZZ_CMS_BRIDGE_VERIFY_FAILED') }" ^
  "$lines | Tee-Object -FilePath '%REPORT%';" ^
  "if ($ok) { exit 0 } else { exit 1 }"

if errorlevel 1 goto :failed

echo.
echo ============================================================
echo CMS bridge verification passed
echo ============================================================
echo.
echo Report:
echo %REPORT%
echo.
pause
exit /b 0

:failed
echo.
echo ============================================================
echo CMS bridge verification failed
echo ============================================================
echo.
echo Review:
echo %REPORT%
echo.
pause
exit /b 1
