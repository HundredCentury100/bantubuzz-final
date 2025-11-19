@echo off
color 0A
echo ========================================
echo BantuBuzz Platform - Complete Deployment
echo ========================================
echo.
echo Server: 173.212.245.22
echo Username: root
echo.
echo This script will run the complete deployment process.
echo You will be prompted for the password multiple times.
echo Password: P9MYrbtC61MA54t
echo.
echo IMPORTANT: Make sure you have reviewed DEPLOYMENT-CHECKLIST.md
echo.
echo Press any key to continue or Ctrl+C to cancel...
pause > nul

echo.
echo.
echo ==========================================
echo STEP 1/7: Scanning Server
echo ==========================================
call 01-scan-server.bat

echo.
echo.
echo ==========================================
echo STEP 2/7: Preparing Server
echo ==========================================
call 02-prepare-deployment.bat

echo.
echo.
echo ==========================================
echo STEP 3/7: Setting Up Environment
echo ==========================================
call 00-setup-environment.bat

echo.
echo.
echo IMPORTANT: Before continuing, you should update the environment files on the server.
echo SSH into the server and edit:
echo   - /var/www/bantubuzz/backend/.env
echo   - /var/www/bantubuzz/messaging-service/.env
echo   - /var/www/bantubuzz/frontend/.env.production
echo.
echo If you want to do this now, press Ctrl+C to exit, update the files, and run this script again.
echo Otherwise, you can update them later and restart services.
echo.
echo Press any key to continue with deployment...
pause > nul

echo.
echo.
echo ==========================================
echo STEP 4/7: Deploying Platform Files
echo ==========================================
echo This may take 10-20 minutes...
call 03-deploy-platform.bat

echo.
echo.
echo ==========================================
echo STEP 5/7: Configuring Services
echo ==========================================
call 04-configure-services.bat

echo.
echo.
echo ==========================================
echo STEP 6/7: Starting Services
echo ==========================================
call 05-start-services.bat

echo.
echo.
echo ==========================================
echo STEP 7/7: Checking Deployment
echo ==========================================
call 06-check-logs.bat

echo.
echo.
echo ========================================
echo DEPLOYMENT COMPLETE!
echo ========================================
echo.
echo Your platform should now be accessible at:
echo http://173.212.245.22
echo.
echo Next steps:
echo 1. Test the platform in your browser
echo 2. Update environment variables for production
echo 3. Set up SSL certificate for HTTPS
echo 4. Configure backups
echo.
echo For more information, see DEPLOYMENT-CHECKLIST.md
echo.
pause
