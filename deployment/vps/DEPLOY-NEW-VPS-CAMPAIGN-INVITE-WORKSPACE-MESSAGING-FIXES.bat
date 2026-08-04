@echo off
setlocal EnableExtensions

set "NEW_SERVER=13.140.159.150"
set "SSH_USER=root"
set "ROOT=%~dp0..\.."
set "FRONTEND_DIR=%ROOT%\frontend"
set "FRONTEND_DIST=%FRONTEND_DIR%\dist"
set "BACKEND_DIR=%ROOT%\backend"
set "MESSAGING_DIR=%ROOT%\messaging-service"
set "REPORT_DIR=%ROOT%\deployment\vps\reports"
set "LOCAL_SCRIPT=%ROOT%\deployment\vps\deploy-campaign-invite-workspace-messaging-fixes.sh"
set "REMOTE_SCRIPT=/tmp/deploy-campaign-invite-workspace-messaging-fixes.sh"
set "FRONTEND_ARCHIVE=%TEMP%\bantubuzz-campaign-message-frontend.tar.gz"
set "BACKEND_ARCHIVE=%TEMP%\bantubuzz-campaign-message-backend.tar.gz"
set "NODE_ARCHIVE=%TEMP%\bantubuzz-campaign-message-node.tar.gz"
set "REMOTE_FRONTEND_ARCHIVE=/tmp/bantubuzz-campaign-message-frontend.tar.gz"
set "REMOTE_BACKEND_ARCHIVE=/tmp/bantubuzz-campaign-message-backend.tar.gz"
set "REMOTE_NODE_ARCHIVE=/tmp/bantubuzz-campaign-message-node.tar.gz"
set "NORMALIZED_SCRIPT=%TEMP%\deploy-campaign-invite-workspace-messaging-fixes.sh"

where ssh >nul 2>&1 || goto :missing_tools
where scp >nul 2>&1 || goto :missing_tools
where tar >nul 2>&1 || goto :missing_tools
where npm >nul 2>&1 || goto :missing_tools
where node >nul 2>&1 || goto :missing_tools

if not exist "%REPORT_DIR%" mkdir "%REPORT_DIR%"
for /f %%i in ('powershell.exe -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TIMESTAMP=%%i"
set "REPORT=%REPORT_DIR%\new-vps-campaign-invite-workspace-messaging-fixes-%NEW_SERVER%-%TIMESTAMP%.txt"

echo ============================================================
echo BantuBuzz Campaign Invite and Workspace Messaging Fixes
echo ============================================================
echo.
echo NEW VPS: %SSH_USER%@%NEW_SERVER%
echo.
echo This targeted deployment will:
echo   - Fix campaign direct creator invites so retries repair/add cart items
echo   - Send creator in-app notifications for campaign invitations
echo   - Add nullable workspace_id to messages without deleting data
echo   - Scope new agency messages/conversations by selected client workspace
echo   - Deploy the frontend build and restart backend/messaging services
echo.
echo It will NOT touch CMS, DNS, old VPS services, or existing user data.
echo.
echo Report:
echo %REPORT%
echo.
pause

(
  echo ============================================================
  echo BantuBuzz Campaign Invite and Workspace Messaging Fixes
  echo ============================================================
  echo Started: %DATE% %TIME%
  echo Target: %SSH_USER%@%NEW_SERVER%
  echo.
) > "%REPORT%"

echo [1/6] Building frontend...
pushd "%FRONTEND_DIR%" >nul
call npm run build >> "%REPORT%" 2>&1
if errorlevel 1 (
  popd >nul
  goto :failed
)
popd >nul

echo.
echo [2/6] Compiling backend and checking messaging service locally...
pushd "%ROOT%" >nul
set "PYTHON_EXE=python"
if exist "%BACKEND_DIR%\venv\Scripts\python.exe" set "PYTHON_EXE=%BACKEND_DIR%\venv\Scripts\python.exe"
"%PYTHON_EXE%" -m py_compile ^
  backend\app\utils\brand_identity.py ^
  backend\app\models\booking.py ^
  backend\app\models\brief.py ^
  backend\app\models\campaign.py ^
  backend\app\models\campaign_chat.py ^
  backend\app\models\campaign_invitation.py ^
  backend\app\models\collaboration.py ^
  backend\app\models\message.py ^
  backend\app\models\review.py ^
  backend\app\routes\admin\collaborations.py ^
  backend\app\routes\bookings.py ^
  backend\app\routes\campaign_cart.py ^
  backend\app\routes\campaign_chats.py ^
  backend\app\routes\campaign_invitations.py ^
  backend\app\routes\custom_packages.py ^
  backend\app\routes\milestones.py ^
  backend\app\routes\messages.py ^
  backend\app\routes\portfolio.py ^
  backend\app\routes\reviews.py ^
  backend\app\services\campaign_cart_payment_service.py ^
  backend\app\services\payment_service.py ^
  backend\app\services\product_notifications.py ^
  backend\app\services\wallet_service.py ^
  backend\app\utils\campaign_helpers.py ^
  backend\migrations\versions\202607291000_add_workspace_id_to_messages.py >> "%REPORT%" 2>&1
if errorlevel 1 (
  popd >nul
  goto :failed
)
node --check messaging-service\server.js >> "%REPORT%" 2>&1
if errorlevel 1 (
  popd >nul
  goto :failed
)
popd >nul

echo.
echo [3/6] Packaging targeted files...
if exist "%FRONTEND_ARCHIVE%" del /q "%FRONTEND_ARCHIVE%"
if exist "%BACKEND_ARCHIVE%" del /q "%BACKEND_ARCHIVE%"
if exist "%NODE_ARCHIVE%" del /q "%NODE_ARCHIVE%"
if exist "%NORMALIZED_SCRIPT%" del /q "%NORMALIZED_SCRIPT%"

pushd "%FRONTEND_DIST%" >nul
tar -czf "%FRONTEND_ARCHIVE%" . >> "%REPORT%" 2>&1
set "TAR_FRONTEND_STATUS=%ERRORLEVEL%"
popd >nul
if not "%TAR_FRONTEND_STATUS%"=="0" goto :failed

tar -czf "%BACKEND_ARCHIVE%" -C "%BACKEND_DIR%" ^
  app/utils/brand_identity.py ^
  app/models/booking.py ^
  app/models/brief.py ^
  app/models/campaign.py ^
  app/models/campaign_chat.py ^
  app/models/campaign_invitation.py ^
  app/models/collaboration.py ^
  app/models/message.py ^
  app/models/review.py ^
  app/routes/admin/collaborations.py ^
  app/routes/bookings.py ^
  app/routes/campaign_cart.py ^
  app/routes/campaign_chats.py ^
  app/routes/campaign_invitations.py ^
  app/routes/custom_packages.py ^
  app/routes/milestones.py ^
  app/routes/messages.py ^
  app/routes/portfolio.py ^
  app/routes/reviews.py ^
  app/services/campaign_cart_payment_service.py ^
  app/services/payment_service.py ^
  app/services/product_notifications.py ^
  app/services/wallet_service.py ^
  app/utils/campaign_helpers.py ^
  migrations/versions/202607291000_add_workspace_id_to_messages.py >> "%REPORT%" 2>&1
if errorlevel 1 goto :failed

tar -czf "%NODE_ARCHIVE%" -C "%MESSAGING_DIR%" server.js package.json package-lock.json >> "%REPORT%" 2>&1
if errorlevel 1 goto :failed

powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$src='%LOCAL_SCRIPT%'; $dst='%NORMALIZED_SCRIPT%'; $text=[IO.File]::ReadAllText($src) -replace \"`r`n\",\"`n\"; [IO.File]::WriteAllText($dst,$text,(New-Object Text.UTF8Encoding($false)))" >> "%REPORT%" 2>&1
if errorlevel 1 goto :failed

echo.
echo [4/6] Uploading archives and deploy script...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo ============================================================
scp "%FRONTEND_ARCHIVE%" %SSH_USER%@%NEW_SERVER%:%REMOTE_FRONTEND_ARCHIVE% >> "%REPORT%" 2>&1
if errorlevel 1 goto :failed
scp "%BACKEND_ARCHIVE%" %SSH_USER%@%NEW_SERVER%:%REMOTE_BACKEND_ARCHIVE% >> "%REPORT%" 2>&1
if errorlevel 1 goto :failed
scp "%NODE_ARCHIVE%" %SSH_USER%@%NEW_SERVER%:%REMOTE_NODE_ARCHIVE% >> "%REPORT%" 2>&1
if errorlevel 1 goto :failed
scp "%NORMALIZED_SCRIPT%" %SSH_USER%@%NEW_SERVER%:%REMOTE_SCRIPT% >> "%REPORT%" 2>&1
if errorlevel 1 goto :failed

echo.
echo [5/6] Installing on new VPS...
echo ============================================================
echo PASSWORD PROMPT: NEW VPS %NEW_SERVER%
echo ============================================================
ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=15 -o ServerAliveCountMax=20 ^
  %SSH_USER%@%NEW_SERVER% "bash %REMOTE_SCRIPT%" >> "%REPORT%" 2>&1
if errorlevel 1 goto :failed

echo.
echo [6/6] Cleaning local archives...
if exist "%FRONTEND_ARCHIVE%" del /q "%FRONTEND_ARCHIVE%"
if exist "%BACKEND_ARCHIVE%" del /q "%BACKEND_ARCHIVE%"
if exist "%NODE_ARCHIVE%" del /q "%NODE_ARCHIVE%"
if exist "%NORMALIZED_SCRIPT%" del /q "%NORMALIZED_SCRIPT%"

echo.
echo ============================================================
echo Campaign invite and workspace messaging fixes deployed
echo ============================================================
echo.
echo QA:
echo   - Open campaign: Yum Yum Bhora Bhora Awareness
echo   - Invite a creator directly and confirm they appear in the campaign cart
echo   - Confirm the creator receives an in-app notification
echo   - Switch agency workspaces and confirm conversations are isolated
echo.
echo Report:
echo %REPORT%
echo.
pause
exit /b 0

:missing_tools
echo Missing required tool: ssh, scp, tar, npm, or node.
pause
exit /b 1

:failed
echo.
echo ============================================================
echo Campaign invite and workspace messaging deployment failed
echo ============================================================
echo.
echo Review:
echo %REPORT%
echo.
if exist "%FRONTEND_ARCHIVE%" del /q "%FRONTEND_ARCHIVE%"
if exist "%BACKEND_ARCHIVE%" del /q "%BACKEND_ARCHIVE%"
if exist "%NODE_ARCHIVE%" del /q "%NODE_ARCHIVE%"
if exist "%NORMALIZED_SCRIPT%" del /q "%NORMALIZED_SCRIPT%"
pause
exit /b 1
