# BantuBuzz Platform - Deployment Scripts Index

## 📁 Deployment Directory Contents

This directory contains all the scripts and documentation needed to deploy your BantuBuzz Platform to a VPS server.

---

## 🎯 Quick Start

**For first-time deployment, run:**
```
DEPLOY-ALL.bat
```
This master script will run all deployment steps in the correct order.

**Or read:** `QUICK-START.md` for a quick overview.

---

## 📜 Deployment Scripts

### Main Deployment Scripts (Run in Order)

| Script | Purpose | Time | Notes |
|--------|---------|------|-------|
| `00-setup-environment.bat` | Create environment files | 1 min | Creates .env files with defaults |
| `01-scan-server.bat` | Scan VPS server | 1 min | Shows current server state |
| `02-prepare-deployment.bat` | Install prerequisites | 5-10 min | Installs Node.js, Python, Nginx, PM2 |
| `03-deploy-platform.bat` | Upload all files | 10-20 min | Uploads backend, frontend, messaging |
| `04-configure-services.bat` | Configure PM2 & Nginx | 2 min | Sets up process manager and web server |
| `05-start-services.bat` | Start all services | 2 min | Starts backend, frontend, messaging |
| `06-check-logs.bat` | View logs | 1 min | Shows recent logs from all services |

### Management Scripts

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `07-restart-services.bat` | Restart all services | After code updates or config changes |
| `08-stop-services.bat` | Stop all services | When you need to stop the platform |
| `09-edit-environment.bat` | Edit environment variables | To update API keys, secrets, etc. |

### Master Script

| Script | Purpose | Description |
|--------|---------|-------------|
| `DEPLOY-ALL.bat` | Complete deployment | Runs all deployment scripts in sequence |

---

## 📚 Documentation Files

| Document | Purpose | Read When |
|----------|---------|-----------|
| `QUICK-START.md` | Quick deployment guide | You want to deploy quickly |
| `README.md` | Comprehensive guide | You want detailed information |
| `DEPLOYMENT-CHECKLIST.md` | Step-by-step checklist | You want to track your progress |
| `INDEX.md` | This file | You want an overview |

---

## 🚀 Deployment Workflow

### First Time Deployment

```
1. Read QUICK-START.md
2. Run DEPLOY-ALL.bat (or run scripts 00-06 individually)
3. Enter password: P9MYrbtC61MA54t when prompted
4. Wait for completion (~20-30 minutes)
5. Test platform at http://173.212.245.22
6. Follow DEPLOYMENT-CHECKLIST.md for post-deployment tasks
```

### Updating After Code Changes

```
1. Make changes locally
2. Run 03-deploy-platform.bat
3. Run 07-restart-services.bat
4. Test changes
```

### Checking Platform Status

```
1. Run 06-check-logs.bat
   OR
2. SSH into server: ssh root@173.212.245.22
3. Run: pm2 status
```

---

## 🔧 Server Details

| Setting | Value |
|---------|-------|
| **IP Address** | 173.212.245.22 |
| **Username** | root |
| **Password** | P9MYrbtC61MA54t |
| **Deployment Path** | /var/www/bantubuzz |
| **Platform URL** | http://173.212.245.22 |
| **Backend Port** | 5000 (internal) |
| **Messaging Port** | 3001 (internal) |
| **Public Port** | 80 (HTTP) |

---

## 📋 Directory Structure After Deployment

```
/var/www/bantubuzz/
├── backend/
│   ├── app/
│   ├── migrations/
│   ├── instance/
│   │   └── bantubuzz.db (database)
│   ├── uploads/
│   ├── venv/
│   ├── run.py
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   ├── dist/ (built files)
│   ├── package.json
│   └── .env.production
├── messaging-service/
│   ├── server.js
│   ├── package.json
│   └── .env
├── logs/
│   ├── backend-out.log
│   ├── backend-error.log
│   ├── messaging-out.log
│   └── messaging-error.log
└── ecosystem.config.js (PM2 config)
```

---

## 🔄 Common Tasks Reference

### View Logs
```bash
# Real-time logs
ssh root@173.212.245.22
pm2 logs

# Specific service
pm2 logs bantubuzz-backend
pm2 logs bantubuzz-messaging
```

### Restart Services
```bash
# Via script
07-restart-services.bat

# Via SSH
ssh root@173.212.245.22
pm2 restart all
```

### Check Service Status
```bash
ssh root@173.212.245.22
pm2 status
systemctl status nginx
```

### Update Environment Variables
```bash
# Via script
09-edit-environment.bat

# Via SSH
ssh root@173.212.245.22
nano /var/www/bantubuzz/backend/.env
```

### Database Access
```bash
ssh root@173.212.245.22
cd /var/www/bantubuzz/backend
source venv/bin/activate
python
>>> from app import create_app, db
>>> app = create_app()
```

---

## ⚠️ Important Notes

1. **Password Required:** You'll be prompted for the password multiple times during deployment. This is normal.

2. **Time Required:** Full deployment takes 20-40 minutes depending on your internet speed.

3. **Environment Files:** After deployment, update these files with your actual credentials:
   - `/var/www/bantubuzz/backend/.env`
   - `/var/www/bantubuzz/messaging-service/.env`
   - `/var/www/bantubuzz/frontend/.env.production`

4. **Security:** Change default passwords and secret keys before going live with real users.

5. **SSL/HTTPS:** Current deployment uses HTTP. For production, set up SSL certificate using Let's Encrypt.

---

## 🆘 Getting Help

1. **Check logs first:** Run `06-check-logs.bat`
2. **Review checklist:** See `DEPLOYMENT-CHECKLIST.md`
3. **Read full docs:** See `README.md`
4. **Troubleshooting:** Check the Troubleshooting section in `README.md`

---

## 📞 Support Resources

- **Server Provider:** Contabo (support@contabo.com)
- **Deployment Path:** /var/www/bantubuzz
- **Platform URL:** http://173.212.245.22

---

## ✅ Pre-Flight Checklist

Before running any deployment scripts:

- [ ] You have SSH installed on your Windows machine
- [ ] You can access the VPS: `ssh root@173.212.245.22`
- [ ] You have the password ready: `P9MYrbtC61MA54t`
- [ ] You have a stable internet connection
- [ ] You have backed up your local database
- [ ] You have read at least `QUICK-START.md`

---

**Ready to deploy? Start with `DEPLOY-ALL.bat` or follow `QUICK-START.md`!** 🚀
