# ScrapOS ERP - Complete Installation Guide
## For Ubuntu 24.04 LTS on VMware Workstation

---

**Document Version:** 1.1 (Updated)  
**Date:** February 2026  
**Target System:** Ubuntu 24.04.3 LTS on VMware Workstation 17  
**Access:** Local LAN + VPN  

---

# TABLE OF CONTENTS

1. Introduction
2. System Requirements
3. VMware Virtual Machine Setup
4. Ubuntu Server Installation
5. Initial Server Configuration
6. Installing Required Software
7. Installing MongoDB Database
8. Setting Up ScrapOS ERP
9. Configuring the Application
10. Starting the Services
11. Setting Up Auto-Start on Boot
12. Accessing from Other Computers
13. Firewall Configuration
14. Backup Procedures
15. Troubleshooting Guide
16. Quick Reference Commands

---

# 1. INTRODUCTION

This guide will help you install ScrapOS ERP (Scrap Metal Trading System) on your local Ubuntu server. The guide is written for non-IT persons with step-by-step instructions.

**What you will have after installation:**
- A fully working ERP system for scrap metal trading
- Accessible from any computer on your local network
- Accessible via VPN when outside the office
- Automatic daily backups

**Time Required:** Approximately 2-3 hours for complete setup

---

# 2. SYSTEM REQUIREMENTS

## Minimum Hardware (for VMware Virtual Machine):
| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU Cores | 2 cores | 4 cores |
| RAM | 4 GB | 8 GB |
| Disk Space | 40 GB | 100 GB |
| Network | Bridged Adapter | Bridged Adapter |

## Host Computer Requirements:
- Windows 10/11 with VMware Workstation 17 installed
- At least 16 GB RAM (to share with VM)
- At least 100 GB free disk space

---

# 3. VMWARE VIRTUAL MACHINE SETUP

## Step 3.1: Download Ubuntu Server ISO
1. Open your web browser
2. Go to: https://ubuntu.com/download/server
3. Click "Download Ubuntu Server 24.04.3 LTS"
4. Save the file (approximately 2 GB)

## Step 3.2: Create New Virtual Machine
1. Open VMware Workstation 17
2. Click "File" > "New Virtual Machine"
3. Select "Typical (recommended)" > Click "Next"
4. Select "Installer disc image file (iso)"
5. Click "Browse" and select the Ubuntu ISO you downloaded
6. Click "Next"

## Step 3.3: Configure Virtual Machine
1. **Full Name:** ScrapOS Server
2. **User name:** scrapos
3. **Password:** Choose a strong password (WRITE IT DOWN!)
4. Click "Next"

## Step 3.4: Name and Location
1. **Virtual machine name:** ScrapOS-ERP
2. **Location:** Leave default or choose your preferred folder
3. Click "Next"

## Step 3.5: Disk Configuration
1. **Maximum disk size:** 100 GB
2. Select "Store virtual disk as a single file"
3. Click "Next"

## Step 3.6: Customize Hardware (IMPORTANT)
1. Click "Customize Hardware"
2. **Memory:** Set to 8192 MB (8 GB)
3. **Processors:** Set to 4
4. **Network Adapter:** Select "Bridged" (this allows LAN access)
5. Click "Close"
6. Click "Finish"

## Step 3.7: Start Installation
1. Click "Power on this virtual machine"
2. Wait for Ubuntu installation to complete (15-30 minutes)
3. When prompted, press ENTER to reboot
4. Login with username "scrapos" and your password

---

# 4. UBUNTU SERVER INSTALLATION

The VMware easy install will handle most of the Ubuntu installation automatically. 

If you see a manual installation screen, follow these steps:

1. Select "English" as language
2. Select "Install Ubuntu Server"
3. Select your keyboard layout
4. For network, select "Use DHCP" (automatic IP)
5. Leave proxy blank
6. Use default mirror
7. Select "Use entire disk"
8. Confirm the installation
9. Create user account:
   - Your name: ScrapOS Admin
   - Server name: scrapos-server
   - Username: scrapos
   - Password: (choose strong password)
10. Skip Ubuntu Pro
11. Install OpenSSH server: YES (select with spacebar, then Enter)
12. Skip featured snaps
13. Wait for installation to complete
14. Select "Reboot Now"

---

# 5. INITIAL SERVER CONFIGURATION

After the server reboots, login with your username and password.

## Step 5.1: Update the System
Type these commands one by one, pressing Enter after each:

```bash
sudo apt update
```
(Enter your password when asked)

```bash
sudo apt upgrade -y
```
(Wait for this to complete - may take 5-10 minutes)

## Step 5.2: Find Your Server's IP Address
```bash
ip addr show
```

Look for a line like: `inet 192.168.1.XXX`
**WRITE DOWN THIS IP ADDRESS** - you will need it later!

Example: 192.168.1.100

## Step 5.3: Set a Static IP Address (Recommended)
This ensures your server always has the same IP address.

```bash
sudo nano /etc/netplan/50-cloud-init.yaml
```

Delete everything and paste this (change IP addresses to match your network):

```yaml
network:
  version: 2
  ethernets:
    ens33:
      dhcp4: no
      addresses:
        - 192.168.1.100/24
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses:
          - 8.8.8.8
          - 8.8.4.4
```

**IMPORTANT:** 
- Change `192.168.1.100` to your desired IP
- Change `192.168.1.1` to your router's IP (usually ends in .1)
- `ens33` might be different - check with `ip addr show`

Save the file:
- Press `Ctrl + X`
- Press `Y`
- Press `Enter`

Apply the changes:
```bash
sudo netplan apply
```

---

# 6. INSTALLING REQUIRED SOFTWARE

## Step 6.1: Install Basic Tools
```bash
sudo apt install -y curl wget git build-essential
```

## Step 6.2: Install Node.js 20 (for Frontend)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

Verify installation:
```bash
node --version
```
Should show: v20.x.x

```bash
npm --version
```
Should show: 10.x.x

## Step 6.3: Install Yarn (Package Manager)
```bash
sudo npm install -g yarn
```

Verify:
```bash
yarn --version
```

## Step 6.4: Install Python 3.11 (for Backend)
```bash
sudo apt install -y python3.11 python3.11-venv python3-pip
```

Verify:
```bash
python3.11 --version
```
Should show: Python 3.11.x

## Step 6.5: Install PM2 (Process Manager)
```bash
sudo npm install -g pm2
```

This will keep your application running even after restart.

---

# 7. INSTALLING MONGODB DATABASE

**IMPORTANT: MongoDB 8.0 for Ubuntu 24.04 (Noble)**

## Step 7.1: Import MongoDB 8.0 GPG Key
```bash
curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-8.0.gpg --dearmor
```

## Step 7.2: Add MongoDB 8.0 Repository for Ubuntu 24.04
```bash
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/8.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list
```

## Step 7.3: Update Package List
```bash
sudo apt update
```

## Step 7.4: Install MongoDB
```bash
sudo apt install -y mongodb-org
```

## Step 7.5: Start MongoDB Service
```bash
sudo systemctl start mongod
sudo systemctl enable mongod
```

## Step 7.6: Verify MongoDB is Running
```bash
sudo systemctl status mongod
```

You should see "active (running)" in green.

Press `q` to exit the status screen.

## Step 7.7: Test MongoDB Connection
```bash
mongosh
```

You should see the MongoDB shell. Type `exit` to close it.

## Troubleshooting MongoDB Installation

If you get "unable to locate package mongodb-org" error:

**Fix 1:** Remove any old repository files
```bash
sudo rm /etc/apt/sources.list.d/mongodb-org-7.0.list 2>/dev/null
sudo rm /etc/apt/sources.list.d/mongodb*.list 2>/dev/null
```

**Fix 2:** Re-run Steps 7.1 to 7.4

**Fix 3:** Clean apt cache
```bash
sudo apt clean
sudo apt update
```

---

# 8. SETTING UP SCRAPOS ERP

## Step 8.1: Create Application Directory
```bash
sudo mkdir -p /opt/scrapos
sudo chown scrapos:scrapos /opt/scrapos
cd /opt/scrapos
```

## Step 8.2: Get the Application Files

**Option A: If you have the ZIP file:**

First, install unzip:
```bash
sudo apt install -y unzip
```

Copy the ZIP file to server using SCP or WinSCP, then:
```bash
unzip scrapos-erp.zip -d /opt/scrapos
```

**Option B: If you saved to GitHub:**
```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git /opt/scrapos
```

## Step 8.3: Verify File Structure
```bash
ls -la /opt/scrapos
```

You should see:
- `backend/` folder
- `frontend/` folder
- Other files

---

# 9. CONFIGURING THE APPLICATION

## Step 9.1: Configure Backend
```bash
cd /opt/scrapos/backend
```

Create environment file:
```bash
nano .env
```

Paste the following content:
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=scrapos_erp
JWT_SECRET=your-super-secret-key-change-this-to-something-random-at-least-32-characters
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

**IMPORTANT:** Change the JWT_SECRET to a random string of letters and numbers (at least 32 characters). Example: `mY5up3rS3cr3tK3y2024Scr4p0sERP!@#`

Save and exit: `Ctrl+X`, then `Y`, then `Enter`

## Step 9.2: Install Backend Dependencies
```bash
cd /opt/scrapos/backend
python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

## Step 9.3: Configure Frontend
```bash
cd /opt/scrapos/frontend
```

Create environment file:
```bash
nano .env
```

Paste the following (replace IP with your server's IP):
```
REACT_APP_BACKEND_URL=http://192.168.1.100:8001
```

Save and exit: `Ctrl+X`, then `Y`, then `Enter`

## Step 9.4: Install Frontend Dependencies
```bash
cd /opt/scrapos/frontend
yarn install
```

(This may take 5-10 minutes)

## Step 9.5: Build Frontend for Production
```bash
yarn build
```

(This may take 2-5 minutes)

---

# 10. STARTING THE SERVICES

## Step 10.1: Install Serve (for Frontend)
```bash
cd /opt/scrapos/frontend
yarn add serve
```

## Step 10.2: Create PM2 Configuration
```bash
cd /opt/scrapos
nano ecosystem.config.js
```

Paste this content:
```javascript
module.exports = {
  apps: [
    {
      name: 'scrapos-backend',
      cwd: '/opt/scrapos/backend',
      script: 'venv/bin/uvicorn',
      args: 'server:app --host 0.0.0.0 --port 8001',
      interpreter: 'none',
      env: {
        PATH: '/opt/scrapos/backend/venv/bin:' + process.env.PATH
      }
    },
    {
      name: 'scrapos-frontend',
      cwd: '/opt/scrapos/frontend',
      script: 'node_modules/.bin/serve',
      args: '-s build -l 3000',
      interpreter: 'none'
    }
  ]
};
```

Save and exit: `Ctrl+X`, then `Y`, then `Enter`

## Step 10.3: Start All Services
```bash
cd /opt/scrapos
pm2 start ecosystem.config.js
```

## Step 10.4: Verify Services are Running
```bash
pm2 status
```

You should see both services showing "online" in green.

## Step 10.5: View Logs (if needed)
```bash
pm2 logs
```

Press `Ctrl+C` to stop viewing logs.

---

# 11. SETTING UP AUTO-START ON BOOT

## Step 11.1: Save PM2 Configuration
```bash
pm2 save
```

## Step 11.2: Generate Startup Script
```bash
pm2 startup
```

This will display a command. **COPY AND RUN** the exact command shown.

Example (yours may be different):
```bash
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u scrapos --hp /home/scrapos
```

## Step 11.3: Test Auto-Start
Reboot the server:
```bash
sudo reboot
```

After reboot, login and check:
```bash
pm2 status
```

Both services should be running.

---

# 12. ACCESSING FROM OTHER COMPUTERS

## Step 12.1: Test Local Access
On the server itself:
```bash
curl http://localhost:3000
curl http://localhost:8001/api/health
```

## Step 12.2: Access from Another Computer on LAN
On any computer connected to the same network:
1. Open a web browser (Chrome, Firefox, Edge)
2. Go to: `http://192.168.1.100:3000`
   (Replace with your server's IP address)

## Step 12.3: First Time Setup
1. Click "Register" to create your admin account
2. Fill in:
   - Full Name: Your Name
   - Email: admin@yourcompany.com
   - Password: (choose strong password)
   - Role: Admin
3. Click "Create Account"
4. You will be logged in automatically

## Step 12.4: VPN Access
If you have a VPN configured:
1. Connect to your VPN
2. Access using the server's internal IP: `http://192.168.1.100:3000`

---

# 13. FIREWALL CONFIGURATION

## Step 13.1: Enable UFW Firewall
```bash
sudo ufw enable
```
(Type `y` when asked)

## Step 13.2: Allow Required Ports
```bash
sudo ufw allow 22/tcp
sudo ufw allow 3000/tcp
sudo ufw allow 8001/tcp
```

## Step 13.3: Verify Firewall Rules
```bash
sudo ufw status
```

You should see:
```
22/tcp    ALLOW    Anywhere
3000/tcp  ALLOW    Anywhere
8001/tcp  ALLOW    Anywhere
```

---

# 14. BACKUP PROCEDURES

## Step 14.1: Create Backup Directory
```bash
sudo mkdir -p /opt/scrapos/backups
sudo chown scrapos:scrapos /opt/scrapos/backups
```

## Step 14.2: Create Backup Script
```bash
nano /opt/scrapos/backup.sh
```

Paste this content:
```bash
#!/bin/bash

# Configuration
BACKUP_DIR="/opt/scrapos/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="scrapos_erp"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup MongoDB
mongodump --db $DB_NAME --out $BACKUP_DIR/db_$DATE

# Compress backup
cd $BACKUP_DIR
tar -czf backup_$DATE.tar.gz db_$DATE
rm -rf db_$DATE

# Keep only last 30 days of backups
find $BACKUP_DIR -name "backup_*.tar.gz" -mtime +30 -delete

echo "Backup completed: backup_$DATE.tar.gz"
```

Save and exit: `Ctrl+X`, then `Y`, then `Enter`

## Step 14.3: Make Script Executable
```bash
chmod +x /opt/scrapos/backup.sh
```

## Step 14.4: Test Backup
```bash
/opt/scrapos/backup.sh
```

## Step 14.5: Schedule Daily Automatic Backup
```bash
crontab -e
```

If asked, choose nano (option 1).

Add this line at the end:
```
0 2 * * * /opt/scrapos/backup.sh >> /opt/scrapos/backups/backup.log 2>&1
```

This runs backup every day at 2:00 AM.

Save and exit: `Ctrl+X`, then `Y`, then `Enter`

## Step 14.6: Restore from Backup
If you need to restore:
```bash
cd /opt/scrapos/backups
tar -xzf backup_YYYYMMDD_HHMMSS.tar.gz
mongorestore --db scrapos_erp db_YYYYMMDD_HHMMSS/scrapos_erp
```

---

# 15. TROUBLESHOOTING GUIDE

## Problem: Cannot Access from Other Computers

**Check 1:** Verify services are running
```bash
pm2 status
```

**Check 2:** Verify firewall allows connections
```bash
sudo ufw status
```

**Check 3:** Verify IP address
```bash
ip addr show
```

**Check 4:** Test from server
```bash
curl http://localhost:3000
curl http://localhost:8001/api/health
```

## Problem: Services Won't Start

**Check logs:**
```bash
pm2 logs scrapos-backend
pm2 logs scrapos-frontend
```

**Restart services:**
```bash
pm2 restart all
```

## Problem: MongoDB Not Running

**Check status:**
```bash
sudo systemctl status mongod
```

**Restart MongoDB:**
```bash
sudo systemctl restart mongod
```

**Check MongoDB logs:**
```bash
sudo tail -100 /var/log/mongodb/mongod.log
```

## Problem: "Connection Refused" Error

1. Check if backend is running on correct port:
```bash
sudo netstat -tlnp | grep 8001
```

2. Check if frontend is running:
```bash
sudo netstat -tlnp | grep 3000
```

## Problem: Slow Performance

1. Check system resources:
```bash
htop
```
(Press `q` to exit. Install with: `sudo apt install htop`)

2. Check disk space:
```bash
df -h
```

3. Increase VM memory in VMware settings

## Problem: "unable to locate package mongodb-org"

This happens when wrong repository is configured.

**Solution:**
```bash
# Remove old repository
sudo rm /etc/apt/sources.list.d/mongodb*.list

# Add correct repository for Ubuntu 24.04
curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-8.0.gpg --dearmor

echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/8.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list

sudo apt update
sudo apt install -y mongodb-org
```

---

# 16. QUICK REFERENCE COMMANDS

## Service Management
| Action | Command |
|--------|---------|
| Start all services | `pm2 start all` |
| Stop all services | `pm2 stop all` |
| Restart all services | `pm2 restart all` |
| View status | `pm2 status` |
| View logs | `pm2 logs` |
| View specific log | `pm2 logs scrapos-backend` |

## System Commands
| Action | Command |
|--------|---------|
| Update system | `sudo apt update && sudo apt upgrade -y` |
| Reboot server | `sudo reboot` |
| Shutdown server | `sudo shutdown now` |
| Check disk space | `df -h` |
| Check memory | `free -h` |
| Check IP address | `ip addr show` |

## MongoDB Commands
| Action | Command |
|--------|---------|
| Start MongoDB | `sudo systemctl start mongod` |
| Stop MongoDB | `sudo systemctl stop mongod` |
| Restart MongoDB | `sudo systemctl restart mongod` |
| Check status | `sudo systemctl status mongod` |
| Open MongoDB shell | `mongosh` |

## Backup Commands
| Action | Command |
|--------|---------|
| Manual backup | `/opt/scrapos/backup.sh` |
| List backups | `ls -la /opt/scrapos/backups/` |
| View backup log | `cat /opt/scrapos/backups/backup.log` |

---

# APPENDIX A: SERVER INFORMATION (Fill In)

| Item | Value |
|------|-------|
| Server IP Address | _________________ |
| Server Username | scrapos |
| Server Password | _________________ |
| MongoDB Port | 27017 |
| Frontend URL | http://[IP]:3000 |
| Backend API URL | http://[IP]:8001 |

## Admin Account
| Item | Value |
|------|-------|
| Admin Email | _________________ |
| Admin Password | _________________ |

---

# APPENDIX B: NETWORK DIAGRAM

```
YOUR OFFICE NETWORK
===================

   Router (192.168.1.1)
          |
          |
   -------|-------
   |             |
   |             |
VMware Host   Other PCs
   |          (Access via browser)
   |          http://192.168.1.100:3000
   |
Ubuntu VM (ScrapOS)
IP: 192.168.1.100
   |
   |-- Frontend :3000
   |-- Backend  :8001
   |-- MongoDB  :27017


VPN Users: Connect to VPN, then access http://192.168.1.100:3000
```

---

# APPENDIX C: CHECKLIST

After installation, verify:

- [ ] Ubuntu 24.04 installed on VMware
- [ ] Static IP configured
- [ ] Node.js installed (v20.x)
- [ ] Python 3.11 installed
- [ ] MongoDB 8.0 installed and running
- [ ] Backend running on port 8001
- [ ] Frontend running on port 3000
- [ ] Firewall configured
- [ ] Auto-start on boot configured
- [ ] Backup schedule configured
- [ ] Can access from other computers on LAN
- [ ] Admin account created

---

**END OF INSTALLATION GUIDE**

Document Version: 1.1
Updated: February 2026
MongoDB Version: 8.0 for Ubuntu 24.04 (Noble)
