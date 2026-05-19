# SmilePay Card Payment Fix - Automated Deployment Script
# This script deploys the Express Checkout implementation for card payments
# Usage: .\deploy-smilepay-card-fix.ps1 -SSHPassword "P9MYrbtC61MA54t"

param(
    [string]$SSHHost = "173.212.245.22",
    [string]$SSHUser = "root",
    [string]$SSHPassword = "",
    [string]$LocalBackendPath = "D:\Bantubuzz Platform\backend",
    [string]$RemoteBackendPath = "/var/www/bantubuzz/backend",
    [switch]$SkipBackup = $false,
    [switch]$DryRun = $false
)

# Color output helpers
function Write-Success { Write-Host -ForegroundColor Green "✓ $args" }
function Write-Error { Write-Host -ForegroundColor Red "✗ $args" }
function Write-Warning { Write-Host -ForegroundColor Yellow "⚠ $args" }
function Write-Info { Write-Host -ForegroundColor Cyan "ℹ $args" }

Write-Info "SmilePay Card Payment Fix - Deployment Script"
Write-Info "Target: $SSHHost"

if ([string]::IsNullOrWhiteSpace($SSHPassword)) {
    Write-Error "SSH password not provided. Use -SSHPassword parameter"
    exit 1
}

# Verify local files exist
Write-Info "Verifying local files..."
$serviceFile = Join-Path $LocalBackendPath "app\services\smilepay_service.py"
$routeFile = Join-Path $LocalBackendPath "app\routes\smilepay_payments.py"

if (-not (Test-Path $serviceFile)) {
    Write-Error "Service file not found: $serviceFile"
    exit 1
}
Write-Success "Found: smilepay_service.py"

if (-not (Test-Path $routeFile)) {
    Write-Error "Route file not found: $routeFile"
    exit 1
}
Write-Success "Found: smilepay_payments.py"

# Prepare for SSH commands
Write-Info "Preparing SSH commands..."

if ($DryRun) {
    Write-Warning "DRY RUN MODE - No changes will be made"
}

# Step 1: Backup existing files
if (-not $SkipBackup) {
    Write-Info "Step 1: Backing up existing files on server..."
    $backupCmd = @"
pkill -f gunicorn
sleep 2
cd $RemoteBackendPath/app
cp services/smilepay_service.py services/smilepay_service.py.backup.\$(date +%s)
cp routes/smilepay_payments.py routes/smilepay_payments.py.backup.\$(date +%s)
echo "Backups created successfully"
"@
    
    if (-not $DryRun) {
        # Execute backup command via SSH
        try {
            # Note: This would require sshpass or similar tool installed
            Write-Warning "Backup step requires interactive SSH. Please run this manually on the server:"
            Write-Host $backupCmd
        } catch {
            Write-Error "Failed to execute backup: $_"
        }
    } else {
        Write-Info "[DRY RUN] Would backup files with: $backupCmd"
    }
}

# Step 2: Copy files via SCP
Write-Info "Step 2: Copying updated files to server..."
Write-Warning "Note: SCP via PowerShell requires OpenSSH client installed"
Write-Warning "If SCP is not available, manually upload:"
Write-Host "  - $serviceFile"
Write-Host "  - $routeFile"
Write-Host "  To: root@$SSHHost:$RemoteBackendPath/app/"

Write-Host ""
Write-Info "Step 3: Verifying file deployment..."
Write-Info "Run this command on the server to verify:"
Write-Host "  ssh root@$SSHHost 'ls -la $RemoteBackendPath/app/services/smilepay_service.py && ls -la $RemoteBackendPath/app/routes/smilepay_payments.py'"

Write-Host ""
Write-Info "Step 4: Restarting backend service..."
Write-Info "Run this command on the server:"
$restartCmd = @"
pkill -f gunicorn
sleep 2
cd $RemoteBackendPath && source venv/bin/activate && gunicorn --bind 127.0.0.1:8002 --workers 4 --timeout 120 'app:create_app()' --daemon
sleep 3
ps aux | grep gunicorn | grep -v grep
"@
Write-Host $restartCmd

Write-Host ""
Write-Info "Step 5: Testing deployment..."
Write-Info "Run this command to verify backend is running:"
Write-Host "  curl http://$SSHHost:8002/api/health"

Write-Host ""
Write-Info "Manual Deployment Instructions"
Write-Host @"
================================================
1. Connect to server:
   ssh root@$SSHHost

2. Backup current files:
   cd $RemoteBackendPath/app
   cp services/smilepay_service.py services/smilepay_service.py.backup.\$(date +%s)
   cp routes/smilepay_payments.py routes/smilepay_payments.py.backup.\$(date +%s)

3. Upload new files (from your local machine):
   scp -r "$serviceFile" root@$SSHHost:$RemoteBackendPath/app/services/
   scp -r "$routeFile" root@$SSHHost:$RemoteBackendPath/app/routes/

4. Stop and restart backend:
   ssh root@$SSHHost "pkill -f gunicorn"
   ssh root@$SSHHost "sleep 2 && cd $RemoteBackendPath && source venv/bin/activate && gunicorn --bind 127.0.0.1:8002 --workers 4 --timeout 120 'app:create_app()' --daemon"

5. Verify it's running:
   ssh root@$SSHHost "ps aux | grep gunicorn | grep -v grep"

6. Check logs:
   ssh root@$SSHHost "tail -50 $RemoteBackendPath/logs/app.log"

================================================
"@

Write-Success "Deployment instructions prepared"
Write-Info "For detailed deployment guide, see: DEPLOYMENT_SMILEPAY_CARD_FIX.md"
