# VPS Exploration Script for Windows PowerShell
# Usage: .\explore-vps.ps1
# This script will show you the VPS directory structure and help understand the deployment

# Configuration
$RemoteHost = "173.212.245.22"
$RemoteUser = "root"

# Helper functions for colored output
function Write-Header {
    param([string]$Title)
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host $Title -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
}

function Write-Section {
    param([string]$Title)
    Write-Host ""
    Write-Host "───────────────────────────────────────────────────────────────" -ForegroundColor Yellow
    Write-Host $Title -ForegroundColor Yellow
    Write-Host "───────────────────────────────────────────────────────────────" -ForegroundColor Yellow
}

function Run-SSHCommand {
    param([string]$Command, [string]$Description)
    Write-Host ""
    Write-Host "→ $Description" -ForegroundColor Green
    Write-Host ""
    ssh "$RemoteUser@$RemoteHost" "$Command"
    Write-Host ""
}

# Main exploration
Write-Header "BANTUBUZZ VPS STRUCTURE EXPLORATION"
Write-Host "Server: $RemoteHost" -ForegroundColor White
Write-Host "User: $RemoteUser" -ForegroundColor White
Write-Host "(You will be prompted for password)" -ForegroundColor Gray
Write-Host ""

Write-Section "1. ROOT DIRECTORY STRUCTURE (/var/www/)"
Run-SSHCommand "ls -la /var/www/" "Listing /var/www/ contents"

Write-Section "2. BANTUBUZZ DIRECTORY (/var/www/bantubuzz/)"
Run-SSHCommand "ls -la /var/www/bantubuzz/" "Listing bantubuzz directory"

Write-Section "3. BACKEND DIRECTORY (/var/www/bantubuzz/backend/)"
Run-SSHCommand "ls -la /var/www/bantubuzz/backend/" "Listing backend directory"

Write-Section "4. APP DIRECTORY (/var/www/bantubuzz/backend/app/)"
Run-SSHCommand "ls -la /var/www/bantubuzz/backend/app/" "Listing app directory"

Write-Section "5. SERVICES DIRECTORY (smilepay_service.py location)"
Run-SSHCommand "ls -lah /var/www/bantubuzz/backend/app/services/ | grep smilepay" "Listing smilepay services"

Write-Section "6. ROUTES DIRECTORY (smilepay_payments.py location)"
Run-SSHCommand "ls -lah /var/www/bantubuzz/backend/app/routes/ | grep smilepay" "Listing smilepay routes"

Write-Section "7. PYTHON VIRTUAL ENVIRONMENT"
Run-SSHCommand "ls -la /var/www/bantubuzz/backend/venv/bin/ | head -20" "Listing venv binaries"

Write-Section "8. LOGS DIRECTORY"
Run-SSHCommand "ls -la /var/www/bantubuzz/backend/logs/ 2>/dev/null || echo 'Logs directory check'" "Listing logs"

Write-Section "9. GUNICORN LOG FILES"
Run-SSHCommand "ls -la /var/www/bantubuzz/backend/*.log 2>/dev/null || echo 'No log files found'" "Listing gunicorn logs"

Write-Section "10. RUNNING PROCESSES"
Run-SSHCommand "ps aux | grep -E 'gunicorn|node|python' | grep -v grep" "Checking running processes"

Write-Section "11. LISTENING PORTS"
Run-SSHCommand "netstat -tuln 2>/dev/null | grep -E 'LISTEN|Proto' || ss -tuln 2>/dev/null | grep LISTEN" "Checking listening ports"

Write-Section "12. CURRENT SMILEPAY FILE INFORMATION"
Run-SSHCommand "echo '=== smilepay_service.py ===' && ls -lah /var/www/bantubuzz/backend/app/services/smilepay_service.py && echo '' && echo 'MD5 Hash:' && md5sum /var/www/bantubuzz/backend/app/services/smilepay_service.py" "Getting service file details"

Run-SSHCommand "echo '=== smilepay_payments.py ===' && ls -lah /var/www/bantubuzz/backend/app/routes/smilepay_payments.py && echo '' && echo 'MD5 Hash:' && md5sum /var/www/bantubuzz/backend/app/routes/smilepay_payments.py" "Getting routes file details"

Write-Section "13. FILE MODIFICATION TIMES"
Run-SSHCommand "stat /var/www/bantubuzz/backend/app/services/smilepay_service.py 2>/dev/null | grep -E 'Modify|Access|Change' || echo 'Using ls for modification time' && ls -la /var/www/bantubuzz/backend/app/services/smilepay_service.py" "Checking service file modification time"

Run-SSHCommand "stat /var/www/bantubuzz/backend/app/routes/smilepay_payments.py 2>/dev/null | grep -E 'Modify|Access|Change' || echo 'Using ls for modification time' && ls -la /var/www/bantubuzz/backend/app/routes/smilepay_payments.py" "Checking routes file modification time"

Write-Section "14. DISK USAGE"
Run-SSHCommand "du -sh /var/www/bantubuzz/* 2>/dev/null" "Checking disk usage"

Write-Section "15. ENVIRONMENT VARIABLES (First 30 lines of .env)"
Run-SSHCommand "head -30 /var/www/bantubuzz/backend/.env 2>/dev/null | grep -E '^[A-Z_]' | head -15 || echo 'Cannot access .env file'" "Checking environment configuration"

Write-Header "EXPLORATION COMPLETE"
Write-Host "Information gathered. You can now share this output with Claude for deployment assistance." -ForegroundColor Green
Write-Host ""
