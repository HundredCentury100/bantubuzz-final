# BantuBuzz Platform - VPS Deployment Guide

## Server Details
- **IP Address:** 173.212.245.22
- **Username:** root
- **Password:** P9MYrbtC61MA54t
- **Deployment Path:** /var/www/bantubuzz

## Deployment Architecture

The platform will be deployed with the following architecture:

```
Internet (Port 80)
       ↓
    Nginx (Reverse Proxy)
       ↓
       ├── Frontend (Static Files from /var/www/bantubuzz/frontend/dist)
       ├── Backend API (Port 5000 - Gunicorn + Flask)
       └── Messaging Service (Port 3001 - Node.js + Socket.IO)
```

## Deployment Steps

### Step 1: Scan the Server
Run this script to understand what's currently on the server:
```
01-scan-server.bat
```
Enter the password when prompted: `P9MYrbtC61MA54t`

This will show:
- Current directory structure
- Running processes
- Open ports
- Existing web configurations

### Step 2: Prepare the Server
Run this script to install prerequisites and create deployment directory:
```
02-prepare-deployment.bat
```
This will:
- Create `/var/www/bantubuzz` directory
- Install Node.js, Python3, pip, Nginx
- Install PM2 (process manager)
- Update system packages

### Step 3: Deploy the Platform
Run this script to upload all files to the VPS:
```
03-deploy-platform.bat
```
This will:
- Upload backend, frontend, and messaging service
- Install Python dependencies
- Install Node.js dependencies
- Build the frontend for production

**Note:** This may take 5-10 minutes depending on your internet connection.

### Step 4: Configure Services
Run this script to configure PM2 and Nginx:
```
04-configure-services.bat
```
This will:
- Create PM2 ecosystem configuration
- Install Gunicorn for production Flask server
- Configure Nginx reverse proxy
- Set up log files

### Step 5: Start Services
Run this script to start all services:
```
05-start-services.bat
```
This will:
- Start backend with PM2
- Start messaging service with PM2
- Start Nginx
- Enable services to start on boot

### Step 6: Verify Deployment
After starting services, your platform should be accessible at:
```
http://173.212.245.22
```

Run this script to check if everything is working:
```
06-check-logs.bat
```

## Management Scripts

### Check Logs
```
06-check-logs.bat
```
View recent logs from all services

### Restart Services
```
07-restart-services.bat
```
Restart all platform services (useful after updates)

### Stop Services
```
08-stop-services.bat
```
Stop all platform services

## Updating the Deployment

To update your platform after making changes:

1. Make your changes locally
2. Run `03-deploy-platform.bat` to upload changes
3. Run `07-restart-services.bat` to restart services

## Troubleshooting

### Platform not accessible
1. Check if services are running: `06-check-logs.bat`
2. Check Nginx status: SSH into server and run `systemctl status nginx`
3. Check PM2 status: SSH into server and run `pm2 status`

### Backend errors
1. Check backend logs: `06-check-logs.bat`
2. SSH into server: `ssh root@173.212.245.22`
3. View detailed logs: `pm2 logs bantubuzz-backend`

### Frontend not loading
1. Verify frontend was built: SSH into server and check `/var/www/bantubuzz/frontend/dist` exists
2. Check Nginx configuration: `nginx -t`
3. Check Nginx error logs: `tail -f /var/log/nginx/error.log`

### Database issues
The SQLite database will be located at:
```
/var/www/bantubuzz/backend/instance/bantubuzz.db
```

To access it:
```bash
ssh root@173.212.245.22
cd /var/www/bantubuzz/backend
source venv/bin/activate
python
>>> from app import create_app, db
>>> app = create_app()
>>> with app.app_context():
>>>     # Your database commands here
```

## Important Notes

1. **SSH Key Setup (Optional but Recommended):**
   - For security, consider setting up SSH key authentication instead of password
   - This will make deployments faster and more secure

2. **Environment Variables:**
   - Make sure to set production environment variables on the server
   - Update `FLASK_ENV=production` in ecosystem.config.js
   - Set secure `SECRET_KEY` in your Flask app

3. **SSL Certificate (HTTPS):**
   - Currently deployed on HTTP (port 80)
   - For production, you should install SSL certificate using Let's Encrypt
   - Run: `certbot --nginx -d yourdomain.com`

4. **Firewall:**
   - Make sure ports 80, 443 (if using SSL) are open
   - Close unnecessary ports for security

5. **Backups:**
   - Regular backups of the database are recommended
   - Consider setting up automated backups

## Port Usage

- **80** - Nginx (public HTTP access)
- **5000** - Backend (internal, proxied by Nginx)
- **3001** - Messaging Service (internal, proxied by Nginx)

## File Locations on Server

- **Platform Root:** `/var/www/bantubuzz/`
- **Backend:** `/var/www/bantubuzz/backend/`
- **Frontend:** `/var/www/bantubuzz/frontend/`
- **Messaging:** `/var/www/bantubuzz/messaging-service/`
- **Logs:** `/var/www/bantubuzz/logs/`
- **Database:** `/var/www/bantubuzz/backend/instance/bantubuzz.db`
- **Uploads:** `/var/www/bantubuzz/backend/uploads/`

## Support

If you encounter any issues during deployment:
1. Check the logs using `06-check-logs.bat`
2. Review the error messages
3. Ensure all prerequisites are installed
4. Verify network connectivity to the VPS
