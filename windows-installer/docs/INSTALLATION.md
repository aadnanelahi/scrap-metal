# ScrapOS ERP - Complete Windows Installation Guide

## Table of Contents
1. [System Requirements](#system-requirements)
2. [Pre-Installation Checklist](#pre-installation-checklist)
3. [Automated Installation](#automated-installation)
4. [Manual Installation](#manual-installation)
5. [Post-Installation Configuration](#post-installation-configuration)
6. [Verification](#verification)
7. [Troubleshooting](#troubleshooting)

---

## System Requirements

### Minimum Requirements
| Component | Requirement |
|-----------|-------------|
| Operating System | Windows Server 2019/2022 or Windows 10/11 Pro |
| Processor | 2 GHz dual-core or better |
| RAM | 4 GB (8 GB recommended) |
| Disk Space | 10 GB free space |
| Network | Internet connection for initial setup |

### Required Software (Auto-installed)
- Python 3.11+
- Node.js 18+ LTS
- MongoDB 7.0
- IIS with URL Rewrite module

---

## Pre-Installation Checklist

- [ ] Windows is updated to latest version
- [ ] You have Administrator access
- [ ] Ports 80, 443, 8001, 27017 are available
- [ ] Windows Firewall allows the above ports
- [ ] Antivirus is configured to allow the installation

### Check Port Availability
Open PowerShell as Administrator and run:
```powershell
netstat -an | findstr "80 443 8001 27017"
```
If any ports are in use, you'll need to either:
- Stop the conflicting service, OR
- Configure ScrapOS to use different ports during installation

---

## Automated Installation

### Step 1: Download the Installer
Download `ScrapOS-Windows-Installer.zip` and extract to a folder.

### Step 2: Run the Installer
1. Right-click on PowerShell and select **"Run as Administrator"**
2. Navigate to the extracted folder:
   ```powershell
   cd C:\path\to\ScrapOS-Windows-Installer
   ```
3. Allow script execution:
   ```powershell
   Set-ExecutionPolicy Bypass -Scope Process -Force
   ```
4. Run the installer:
   ```powershell
   .\install.ps1
   ```

### Step 3: Follow the Wizard
The wizard will prompt you for:
- **Installation path** (default: C:\ScrapOS)
- **Company name** (your company name)
- **Admin email** (login email)
- **Admin password** (minimum 8 characters)
- **MongoDB configuration** (local or external)
- **IIS configuration** (recommended: Yes)
- **Port settings** (press Enter for defaults)

### Step 4: Wait for Installation
The installer will:
1. Install Chocolatey package manager
2. Install Python, Node.js, MongoDB
3. Install and configure IIS
4. Copy application files
5. Install dependencies
6. Build frontend
7. Configure services
8. Seed initial data
9. Create shortcuts

**Estimated time: 15-30 minutes** (depending on internet speed)

---

## Manual Installation

If the automated installer fails, follow these steps:

### Step 1: Install Chocolatey
Open PowerShell as Administrator:
```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
```

### Step 2: Install Dependencies
```powershell
# Install Python
choco install python311 -y

# Install Node.js
choco install nodejs-lts -y

# Install MongoDB
choco install mongodb -y

# Install NSSM (for Windows Services)
choco install nssm -y

# Refresh environment variables
refreshenv
```

### Step 3: Install IIS
```powershell
# Enable IIS features
Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole -All -NoRestart
Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServer -All -NoRestart
Enable-WindowsOptionalFeature -Online -FeatureName IIS-ManagementConsole -All -NoRestart

# Install URL Rewrite module
choco install urlrewrite -y

# Install ARR for reverse proxy
choco install iis-arr -y
```

### Step 4: Create Directory Structure
```powershell
# Create installation directories
New-Item -ItemType Directory -Path "C:\ScrapOS" -Force
New-Item -ItemType Directory -Path "C:\ScrapOS\backend" -Force
New-Item -ItemType Directory -Path "C:\ScrapOS\frontend" -Force
New-Item -ItemType Directory -Path "C:\ScrapOS\logs" -Force
```

### Step 5: Copy Application Files
Copy the `backend` and `frontend` folders to `C:\ScrapOS\`

### Step 6: Configure Backend
Create `C:\ScrapOS\backend\.env`:
```env
MONGO_URL=mongodb://localhost:27017/scrapos
DB_NAME=scrapos
JWT_SECRET=your-secret-key-here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
HOST=0.0.0.0
PORT=8001
```

### Step 7: Install Python Dependencies
```powershell
cd C:\ScrapOS\backend
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

### Step 8: Configure Frontend
Create `C:\ScrapOS\frontend\.env`:
```env
REACT_APP_BACKEND_URL=http://localhost
```

Build the frontend:
```powershell
cd C:\ScrapOS\frontend
npm install
npm run build
```

### Step 9: Create Windows Service for Backend
Create `C:\ScrapOS\start-backend.bat`:
```batch
@echo off
cd /d C:\ScrapOS\backend
python -m uvicorn server:app --host 0.0.0.0 --port 8001
```

Install as service:
```powershell
nssm install ScrapOSBackend "C:\ScrapOS\start-backend.bat"
nssm set ScrapOSBackend DisplayName "ScrapOS ERP Backend"
nssm set ScrapOSBackend Start SERVICE_AUTO_START
nssm start ScrapOSBackend
```

### Step 10: Configure IIS
See [IIS-SETUP.md](IIS-SETUP.md) for detailed IIS configuration.

---

## Post-Installation Configuration

### Start Services
```powershell
# Start MongoDB
Start-Service MongoDB

# Start ScrapOS Backend
Start-Service ScrapOSBackend

# Start IIS
Start-Service W3SVC
```

### Verify Services
```powershell
Get-Service MongoDB, ScrapOSBackend, W3SVC | Format-Table Name, Status
```

### Seed Database
Open browser and navigate to:
```
http://localhost/api/seed
```
Or use PowerShell:
```powershell
Invoke-RestMethod -Uri "http://localhost:8001/api/seed" -Method Post
```

### Configure Firewall
```powershell
# Allow HTTP
New-NetFirewallRule -DisplayName "ScrapOS HTTP" -Direction Inbound -Port 80 -Protocol TCP -Action Allow

# Allow HTTPS
New-NetFirewallRule -DisplayName "ScrapOS HTTPS" -Direction Inbound -Port 443 -Protocol TCP -Action Allow

# Allow Backend API (if external access needed)
New-NetFirewallRule -DisplayName "ScrapOS API" -Direction Inbound -Port 8001 -Protocol TCP -Action Allow
```

---

## Verification

### Test Backend API
```powershell
Invoke-RestMethod -Uri "http://localhost:8001/api/health"
```
Expected response: `{"status": "healthy"}`

### Test Frontend
Open browser: `http://localhost`

You should see the ScrapOS login page.

### Default Login Credentials
After seeding:
- **Admin Email**: admin@scrapos.ae
- **Admin Password**: Admin!234

---

## Troubleshooting

### Backend Service Won't Start
1. Check logs: `C:\ScrapOS\logs\backend-err.log`
2. Verify MongoDB is running: `Get-Service MongoDB`
3. Test manually:
   ```powershell
   cd C:\ScrapOS\backend
   python -m uvicorn server:app --host 0.0.0.0 --port 8001
   ```

### IIS Returns 500 Error
1. Check if backend is running
2. Verify URL Rewrite rules in IIS Manager
3. Enable ARR proxy:
   ```powershell
   Set-WebConfigurationProperty -PSPath 'MACHINE/WEBROOT/APPHOST' -Filter "system.webServer/proxy" -Name "enabled" -Value "True"
   ```

### MongoDB Connection Failed
1. Check MongoDB service: `Get-Service MongoDB`
2. Verify MongoDB is listening: `netstat -an | findstr 27017`
3. Check MongoDB logs: `C:\Program Files\MongoDB\Server\7.0\log\mongod.log`

### Port Already in Use
Find process using the port:
```powershell
netstat -ano | findstr :80
tasklist /fi "PID eq <PID>"
```

### Trial License Expired
Contact sales@scrapos.ae for a full license key.

---

## Uninstallation

To completely remove ScrapOS:
```powershell
# Stop and remove services
nssm stop ScrapOSBackend
nssm remove ScrapOSBackend confirm

# Remove IIS site
Remove-Website -Name "ScrapOS"
Remove-WebAppPool -Name "ScrapOSAppPool"

# Remove files
Remove-Item -Path "C:\ScrapOS" -Recurse -Force

# Remove shortcuts
Remove-Item "$env:PUBLIC\Desktop\ScrapOS ERP.lnk" -Force
Remove-Item "$env:ALLUSERSPROFILE\Microsoft\Windows\Start Menu\Programs\ScrapOS" -Recurse -Force
```

---

## Support

- **Documentation**: C:\ScrapOS\docs
- **Email**: support@scrapos.ae
- **Website**: https://scrapos.ae
