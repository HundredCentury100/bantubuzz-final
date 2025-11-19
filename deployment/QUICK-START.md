# BantuBuzz Platform - Quick Start Deployment Guide

## 🚀 Fast Track Deployment (Recommended)

If you want to deploy everything in one go:

1. **Run the master deployment script:**
   ```
   DEPLOY-ALL.bat
   ```

2. **Enter password when prompted:**
   ```
   P9MYrbtC61MA54t
   ```

3. **Wait for completion** (approximately 20-30 minutes)

4. **Test your platform:**
   Open browser: `http://173.212.245.22`

That's it! Your platform will be live.

---

## 📋 Step-by-Step Deployment (For More Control)

### Prerequisites
- Windows machine with SSH client installed
- VPS credentials (already provided)
- Stable internet connection

### Deployment Steps

Run these scripts in order, entering the password when prompted:

1. **`01-scan-server.bat`** - See what's on the server (1 min)
2. **`02-prepare-deployment.bat`** - Install prerequisites (5-10 min)
3. **`00-setup-environment.bat`** - Create environment files (1 min)
4. **`03-deploy-platform.bat`** - Upload all files (10-20 min)
5. **`04-configure-services.bat`** - Configure PM2 and Nginx (2 min)
6. **`05-start-services.bat`** - Start everything (2 min)
7. **`06-check-logs.bat`** - Verify it's working (1 min)

**Total time:** Approximately 20-40 minutes

---

## 🔑 Important Credentials

**VPS Server:**
- IP: `173.212.245.22`
- Username: `root`
- Password: `P9MYrbtC61MA54t`

**After Deployment:**
- Platform URL: `http://173.212.245.22`
- Backend API: `http://173.212.245.22/api`
- WebSocket: `http://173.212.245.22/socket.io`

---

## 🛠️ Management Scripts

After deployment, use these scripts to manage your platform:

- **`06-check-logs.bat`** - View logs from all services
- **`07-restart-services.bat`** - Restart all services
- **`08-stop-services.bat`** - Stop all services
- **`09-edit-environment.bat`** - Edit environment variables

---

## ✅ Post-Deployment Checklist

After deployment is complete:

1. **Test the platform:**
   - [ ] Landing page loads
   - [ ] User registration works
   - [ ] User login works
   - [ ] Dashboard accessible

2. **Security updates (IMPORTANT):**
   - [ ] Change SSH password or add SSH keys
   - [ ] Update `SECRET_KEY` in backend .env
   - [ ] Update `JWT_SECRET_KEY` in backend .env
   - [ ] Add your Paynow credentials

3. **Optional enhancements:**
   - [ ] Get a domain name
   - [ ] Set up SSL certificate (HTTPS)
   - [ ] Configure automated backups
   - [ ] Set up monitoring

---

## 🐛 Troubleshooting

### Platform not loading?
1. Run `06-check-logs.bat`
2. Look for errors in the output
3. Run `07-restart-services.bat`

### Need to update code?
1. Make changes locally
2. Run `03-deploy-platform.bat`
3. Run `07-restart-services.bat`

### Want to stop everything?
1. Run `08-stop-services.bat`

### Need to check what's running?
1. SSH into server: `ssh root@173.212.245.22`
2. Check PM2: `pm2 status`
3. Check Nginx: `systemctl status nginx`

---

## 📞 Getting Help

1. **Check logs:** `06-check-logs.bat`
2. **Review checklist:** `DEPLOYMENT-CHECKLIST.md`
3. **Full documentation:** `README.md`

---

## 🎯 Common Tasks

### Update environment variables:
```
09-edit-environment.bat
```
Then restart: `07-restart-services.bat`

### View real-time logs:
```bash
ssh root@173.212.245.22
pm2 logs
```

### Access database:
```bash
ssh root@173.212.245.22
cd /var/www/bantubuzz/backend
source venv/bin/activate
python
>>> from app import create_app, db
>>> app = create_app()
```

### Check disk space:
```bash
ssh root@173.212.245.22
df -h
```

---

## 🔒 Security Recommendations

**Before going live with real users:**

1. **Change default passwords**
2. **Set up firewall:**
   ```bash
   ufw allow 80/tcp
   ufw allow 443/tcp
   ufw allow 22/tcp
   ufw enable
   ```
3. **Install SSL certificate**
4. **Set strong SECRET_KEY values**
5. **Enable automatic security updates**

---

## 💡 Pro Tips

- Password will be asked multiple times during deployment (this is normal)
- Keep a backup of your database before any major changes
- Test changes locally before deploying to production
- Monitor server resources regularly
- Set up automated backups from day one

---

**Ready to deploy? Run `DEPLOY-ALL.bat` and get started!** 🚀
