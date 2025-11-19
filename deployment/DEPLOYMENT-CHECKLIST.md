# BantuBuzz Platform - Deployment Checklist

## Pre-Deployment Checklist

- [ ] Verify you have the VPS credentials
  - IP: 173.212.245.22
  - Username: root
  - Password: P9MYrbtC61MA54t

- [ ] Ensure you have SSH access from your Windows machine
  - Test: Open Command Prompt and run `ssh root@173.212.245.22`
  - If SSH is not available, install it via Windows Settings > Apps > Optional Features > OpenSSH Client

- [ ] Backup your local database
  - Location: `D:\Bantubuzz Platform\backend\instance\bantubuzz.db`
  - Make a copy before deployment

## Deployment Steps

### 1. Scan Server (01-scan-server.bat)
- [ ] Run the script
- [ ] Enter password when prompted
- [ ] Review the output to understand current server state
- [ ] Note any conflicting services on ports 80, 5000, or 3001

### 2. Prepare Server (02-prepare-deployment.bat)
- [ ] Run the script
- [ ] Enter password when prompted
- [ ] Wait for all packages to install (may take 5-10 minutes)
- [ ] Verify success message at the end

### 3. Setup Environment (00-setup-environment.bat)
- [ ] Run the script
- [ ] Enter password when prompted
- [ ] Environment files will be created with defaults
- [ ] **IMPORTANT:** SSH into server and update these files:
  ```bash
  ssh root@173.212.245.22
  nano /var/www/bantubuzz/backend/.env
  ```
  Update:
  - `SECRET_KEY` - Generate a new random secret
  - `JWT_SECRET_KEY` - Generate a new random secret
  - `PAYNOW_INTEGRATION_ID` - Your Paynow ID
  - `PAYNOW_INTEGRATION_KEY` - Your Paynow Key

### 4. Deploy Platform (03-deploy-platform.bat)
- [ ] Run the script
- [ ] Enter password when prompted (may be asked multiple times for each upload)
- [ ] Wait for all files to upload (this may take 10-20 minutes)
- [ ] Wait for dependencies to install
- [ ] Wait for frontend to build
- [ ] Verify success message at the end

### 5. Configure Services (04-configure-services.bat)
- [ ] Run the script
- [ ] Enter password when prompted
- [ ] Verify PM2 ecosystem file is created
- [ ] Verify Nginx configuration is created
- [ ] Check for "nginx: configuration file test is successful" message

### 6. Start Services (05-start-services.bat)
- [ ] Run the script
- [ ] Enter password when prompted
- [ ] Verify both PM2 services start successfully
- [ ] Verify Nginx starts successfully
- [ ] Note the process IDs shown

### 7. Check Deployment (06-check-logs.bat)
- [ ] Run the script
- [ ] Enter password when prompted
- [ ] Review logs for any errors
- [ ] Verify services are running

### 8. Test Platform
- [ ] Open browser and go to: http://173.212.245.22
- [ ] Verify landing page loads
- [ ] Test user registration
- [ ] Test user login
- [ ] Test creating a campaign (as brand)
- [ ] Test creating a package (as creator)
- [ ] Test messaging service
- [ ] Test file uploads

## Post-Deployment Tasks

### Security Enhancements
- [ ] Change SSH password or setup SSH keys
- [ ] Configure firewall rules
  ```bash
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw allow 22/tcp
  ufw enable
  ```
- [ ] Install fail2ban for brute force protection
- [ ] Consider moving SSH to non-standard port

### SSL Certificate (HTTPS)
- [ ] Get a domain name (optional but recommended)
- [ ] Point domain to 173.212.245.22
- [ ] Install Let's Encrypt SSL certificate
  ```bash
  apt install certbot python3-certbot-nginx
  certbot --nginx -d yourdomain.com
  ```
- [ ] Update environment files to use HTTPS URLs

### Monitoring
- [ ] Set up uptime monitoring (e.g., UptimeRobot)
- [ ] Configure log rotation
  ```bash
  nano /etc/logrotate.d/bantubuzz
  ```
- [ ] Set up automated backups
- [ ] Monitor disk space usage

### Performance Optimization
- [ ] Enable Nginx gzip compression
- [ ] Configure browser caching
- [ ] Set up CDN for static assets (optional)
- [ ] Optimize database queries
- [ ] Consider Redis for caching (optional)

## Troubleshooting Guide

### Issue: Cannot connect to VPS
**Solution:**
1. Verify VPS is running (check Contabo panel)
2. Verify IP address is correct
3. Check your internet connection
4. Try pinging the server: `ping 173.212.245.22`

### Issue: SSH connection refused
**Solution:**
1. Verify SSH service is running on server
2. Check if firewall is blocking port 22
3. Contact Contabo support if issue persists

### Issue: Upload very slow
**Solution:**
1. This is normal for first deployment
2. Consider compressing files before upload
3. Use `rsync` instead of `scp` for future updates

### Issue: Frontend shows 404 errors
**Solution:**
1. Verify frontend build completed: `ls /var/www/bantubuzz/frontend/dist`
2. Check Nginx configuration: `nginx -t`
3. Check Nginx error logs: `tail -f /var/log/nginx/error.log`

### Issue: Backend API returns 500 errors
**Solution:**
1. Check backend logs: `pm2 logs bantubuzz-backend`
2. Verify Python dependencies installed correctly
3. Check database file exists and has correct permissions
4. Verify environment variables are set correctly

### Issue: WebSocket/Messaging not working
**Solution:**
1. Check messaging service logs: `pm2 logs bantubuzz-messaging`
2. Verify port 3001 is accessible internally
3. Check Nginx WebSocket proxy configuration
4. Verify CORS settings in messaging service

## Rollback Procedure

If deployment fails:

1. Stop services:
   ```bash
   pm2 stop all
   systemctl stop nginx
   ```

2. Remove deployment:
   ```bash
   rm -rf /var/www/bantubuzz
   ```

3. Restore previous configuration if any existed

4. Debug the issue locally before redeploying

## Quick Reference Commands

### SSH into server
```bash
ssh root@173.212.245.22
```

### View PM2 processes
```bash
pm2 status
pm2 logs
pm2 logs bantubuzz-backend
pm2 logs bantubuzz-messaging
```

### Restart services
```bash
pm2 restart all
systemctl restart nginx
```

### Check Nginx
```bash
nginx -t
systemctl status nginx
tail -f /var/log/nginx/error.log
```

### Database operations
```bash
cd /var/www/bantubuzz/backend
source venv/bin/activate
python
>>> from app import create_app, db
>>> app = create_app()
```

### View disk usage
```bash
df -h
du -sh /var/www/bantubuzz/*
```

## Support Contacts

- Contabo Support: support@contabo.com
- Server IP: 173.212.245.22
- Deployment Path: /var/www/bantubuzz

---

**Remember:** After any code changes, you need to:
1. Run `03-deploy-platform.bat` to upload changes
2. Run `07-restart-services.bat` to restart services
3. For frontend changes, rebuild is automatic during deploy
4. For backend changes, PM2 will reload automatically
