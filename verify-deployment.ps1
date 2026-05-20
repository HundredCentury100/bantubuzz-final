# SmilePay Card Payment Fix - Deployment Verification Script
# This script verifies that the files are properly deployed and working

$RemoteHost = "173.212.245.22"
$RemoteUser = "root"
$LocalBackendPath = "D:\Bantubuzz Platform\backend"

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     SMILEPAY CARD PAYMENT FIX - DEPLOYMENT VERIFICATION        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# === STEP 1: Calculate local file hashes ===
Write-Host "Step 1: Calculating local file hashes..." -ForegroundColor Yellow
Write-Host ""

$serviceLocalPath = "$LocalBackendPath\app\services\smilepay_service.py"
$routesLocalPath = "$LocalBackendPath\app\routes\smilepay_payments.py"

if (Test-Path $serviceLocalPath) {
    $serviceLocalHash = (Get-FileHash -Path $serviceLocalPath -Algorithm MD5).Hash.ToLower()
    Write-Host "✓ Local smilepay_service.py MD5: $serviceLocalHash" -ForegroundColor Green
} else {
    Write-Host "✗ Local smilepay_service.py not found" -ForegroundColor Red
    $serviceLocalHash = "NOT_FOUND"
}

if (Test-Path $routesLocalPath) {
    $routesLocalHash = (Get-FileHash -Path $routesLocalPath -Algorithm MD5).Hash.ToLower()
    Write-Host "✓ Local smilepay_payments.py MD5: $routesLocalHash" -ForegroundColor Green
} else {
    Write-Host "✗ Local smilepay_payments.py not found" -ForegroundColor Red
    $routesLocalHash = "NOT_FOUND"
}

Write-Host ""

# === STEP 2: Get remote file hashes ===
Write-Host "Step 2: Getting remote file hashes from server..." -ForegroundColor Yellow
Write-Host ""

$remoteServiceHash = ssh "$RemoteUser@$RemoteHost" "md5sum /var/www/bantubuzz/backend/app/services/smilepay_service.py 2>/dev/null | awk '{print `$1}'" 
$remoteRoutesHash = ssh "$RemoteUser@$RemoteHost" "md5sum /var/www/bantubuzz/backend/app/routes/smilepay_payments.py 2>/dev/null | awk '{print `$1}'"

if ($remoteServiceHash) {
    Write-Host "✓ Remote smilepay_service.py MD5: $remoteServiceHash" -ForegroundColor Green
} else {
    Write-Host "✗ Could not get remote smilepay_service.py hash" -ForegroundColor Red
    $remoteServiceHash = "ERROR"
}

if ($remoteRoutesHash) {
    Write-Host "✓ Remote smilepay_payments.py MD5: $remoteRoutesHash" -ForegroundColor Green
} else {
    Write-Host "✗ Could not get remote smilepay_payments.py hash" -ForegroundColor Red
    $remoteRoutesHash = "ERROR"
}

Write-Host ""

# === STEP 3: Compare hashes ===
Write-Host "Step 3: Comparing hashes..." -ForegroundColor Yellow
Write-Host ""

$serviceMatch = ($serviceLocalHash -eq $remoteServiceHash)
$routesMatch = ($routesLocalHash -eq $remoteRoutesHash)

if ($serviceMatch) {
    Write-Host "✓ smilepay_service.py hashes MATCH (files are identical)" -ForegroundColor Green
} else {
    Write-Host "⚠ smilepay_service.py hashes DO NOT MATCH" -ForegroundColor Yellow
    Write-Host "  Local:  $serviceLocalHash" -ForegroundColor Yellow
    Write-Host "  Remote: $remoteServiceHash" -ForegroundColor Yellow
}

if ($routesMatch) {
    Write-Host "✓ smilepay_payments.py hashes MATCH (files are identical)" -ForegroundColor Green
} else {
    Write-Host "⚠ smilepay_payments.py hashes DO NOT MATCH" -ForegroundColor Yellow
    Write-Host "  Local:  $routesLocalHash" -ForegroundColor Yellow
    Write-Host "  Remote: $remoteRoutesHash" -ForegroundColor Yellow
}

Write-Host ""

# === STEP 4: Check if gunicorn is running ===
Write-Host "Step 4: Checking if backend is running..." -ForegroundColor Yellow
Write-Host ""

$gunicornStatus = ssh "$RemoteUser@$RemoteHost" "ps aux | grep gunicorn | grep -v grep | wc -l"

if ($gunicornStatus -gt 0) {
    Write-Host "✓ Gunicorn is running ($gunicornStatus worker processes found)" -ForegroundColor Green
    
    # Get more details
    $gunicornDetails = ssh "$RemoteUser@$RemoteHost" "ps aux | grep gunicorn | grep -v grep | head -1"
    Write-Host "  Details: $gunicornDetails" -ForegroundColor Gray
} else {
    Write-Host "✗ Gunicorn is NOT running" -ForegroundColor Red
}

Write-Host ""

# === STEP 5: Test health endpoint ===
Write-Host "Step 5: Testing health endpoint..." -ForegroundColor Yellow
Write-Host ""

try {
    $healthResponse = curl -s http://173.212.245.22:8002/api/health
    if ($?) {
        Write-Host "✓ Health endpoint responded" -ForegroundColor Green
        Write-Host "  Response: $healthResponse" -ForegroundColor Gray
    } else {
        Write-Host "⚠ Health endpoint check returned a status code" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠ Could not connect to health endpoint: $_" -ForegroundColor Yellow
}

Write-Host ""

# === STEP 6: Check recent logs ===
Write-Host "Step 6: Checking recent error logs..." -ForegroundColor Yellow
Write-Host ""

$recentErrors = ssh "$RemoteUser@$RemoteHost" "tail -20 /var/www/bantubuzz/backend/gunicorn_error.log 2>/dev/null | grep -i 'error\|exception' | head -5"

if ($recentErrors) {
    Write-Host "⚠ Recent errors found in gunicorn logs:" -ForegroundColor Yellow
    Write-Host $recentErrors -ForegroundColor Yellow
} else {
    Write-Host "✓ No recent errors found in gunicorn logs" -ForegroundColor Green
}

Write-Host ""

# === STEP 7: Check if smilepay files have been imported ===
Write-Host "Step 7: Checking if SmilePay module was imported correctly..." -ForegroundColor Yellow
Write-Host ""

$smilePayLogs = ssh "$RemoteUser@$RemoteHost" "grep -i 'smilepay\|card payment' /var/www/bantubuzz/backend/logs/app.log 2>/dev/null | tail -10"

if ($smilePayLogs) {
    Write-Host "✓ SmilePay activity found in logs:" -ForegroundColor Green
    Write-Host $smilePayLogs -ForegroundColor Gray
} else {
    Write-Host "ℹ No recent SmilePay activity in logs (may not have received requests yet)" -ForegroundColor Cyan
}

Write-Host ""

# === SUMMARY ===
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                    VERIFICATION SUMMARY                        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$allGood = $serviceMatch -and $routesMatch -and ($gunicornStatus -gt 0)

if ($allGood) {
    Write-Host "✓ All checks passed!" -ForegroundColor Green
    Write-Host "  - Files are deployed and match local versions"
    Write-Host "  - Backend (Gunicorn) is running"
    Write-Host "  - Ready for testing"
} else {
    Write-Host "⚠ Some issues detected:" -ForegroundColor Yellow
    if (-not $serviceMatch) { Write-Host "  - smilepay_service.py hashes don't match" }
    if (-not $routesMatch) { Write-Host "  - smilepay_payments.py hashes don't match" }
    if ($gunicornStatus -le 0) { Write-Host "  - Gunicorn not running" }
}

Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. If hashes don't match, you need to re-upload the files"
Write-Host "2. If Gunicorn is not running, restart it with deploy.sh"
Write-Host "3. Test the card payment endpoint with a valid JWT token"
Write-Host "4. Monitor logs for errors: tail -f /var/www/bantubuzz/backend/logs/app.log"
Write-Host ""
