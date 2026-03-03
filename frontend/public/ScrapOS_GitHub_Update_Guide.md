# ScrapOS ERP - Complete GitHub Update Guide for Ubuntu Server

## Document Information
- **Version:** 1.0
- **Last Updated:** March 2026
- **Platform:** Ubuntu 22.04/24.04 LTS

---

## Table of Contents
1. Prerequisites
2. Initial Setup (One-Time)
3. Quick Update Command
4. Detailed Update Process
5. Update Script Reference
6. Manual Update Steps
7. Rollback Procedure
8. Troubleshooting
9. Automated Updates (Cron)
10. Best Practices

---

## 1. Prerequisites

Before updating, ensure you have:

| Requirement | Check Command |
|-------------|---------------|
| Root/sudo access | `sudo whoami` (should return "root") |
| Git installed | `git --version` |
| Internet connection | `ping github.com` |
| Sufficient disk space | `df -h` (need at least 2GB free) |

### Required Software
```bash
# Install Git if not present
sudo apt-get update
sudo apt-get install -y git

# Verify installation
git --version
```

---

## 2. Initial Setup (One-Time)

### Step 1: Create GitHub Repository

If you haven't already, push your ScrapOS code to GitHub:

```bash
# Navigate to your app directory
cd /app

# Initialize Git repository (if not already)
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial ScrapOS ERP commit"

# Add GitHub remote
git remote add origin https://github.com/YOUR-USERNAME/scrapos-erp.git

# Push to GitHub
git push -u origin main
```

### Step 2: Configure Git Credentials

**Option A: HTTPS with Personal Access Token (Recommended)**

```bash
# Store credentials
git config --global credential.helper store

# Set your identity
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# First pull will ask for username and token
# Use your GitHub username
# Use Personal Access Token as password (not your GitHub password)
```

To create a Personal Access Token:
1. Go to GitHub → Settings → Developer Settings
2. Click "Personal access tokens" → "Tokens (classic)"
3. Generate new token with "repo" scope
4. Copy and save the token securely

**Option B: SSH Key**

```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "your.email@example.com"

# Start SSH agent
eval "$(ssh-agent -s)"

# Add key to agent
ssh-add ~/.ssh/id_ed25519

# Copy public key
cat ~/.ssh/id_ed25519.pub
```

Add the public key to GitHub → Settings → SSH and GPG keys → New SSH key

### Step 3: Clone Repository (Fresh Install)

If setting up a new server:

```bash
# Clone repository
git clone https://github.com/YOUR-USERNAME/scrapos-erp.git /app

# Or with SSH
git clone git@github.com:YOUR-USERNAME/scrapos-erp.git /app
```

### Step 4: Install Update Script

```bash
# Download the update script
cd /app

# Make it executable
chmod +x update-from-github.sh

# Edit configuration (update these values)
nano update-from-github.sh
```

Update these lines in the script:
```bash
GITHUB_REPO="your-username/scrapos-erp"     # Your GitHub repository
GITHUB_BRANCH="main"                         # Your branch name
```

---

## 3. Quick Update Command

For a quick update, run:

```bash
# Navigate to app directory
cd /app

# Run update script
sudo ./update-from-github.sh
```

Or as a one-liner:
```bash
cd /app && sudo ./update-from-github.sh
```

---

## 4. Detailed Update Process

### What the Update Script Does:

1. **Creates Backup**
   - Backs up MongoDB database
   - Backs up .env configuration files
   - Creates timestamped archive

2. **Checks Git Status**
   - Verifies it's a Git repository
   - Checks for uncommitted changes
   - Offers to stash local changes

3. **Pulls Latest Code**
   - Fetches from GitHub
   - Pulls changes from specified branch
   - Shows recent commits

4. **Updates Backend**
   - Installs Python dependencies
   - Updates pip packages

5. **Updates Frontend**
   - Installs Node.js dependencies
   - Rebuilds production build

6. **Restarts Services**
   - Stops all services
   - Starts all services
   - Shows service status

7. **Verifies Update**
   - Checks backend health
   - Checks frontend response
   - Reports any issues

---

## 5. Update Script Reference

### Script Location
```
/app/update-from-github.sh
```

### Configuration Variables

| Variable | Description | Default |
|----------|-------------|---------|
| APP_DIR | Installation directory | /app |
| GITHUB_REPO | GitHub repository path | your-username/scrapos-erp |
| GITHUB_BRANCH | Branch to pull | main |
| BACKUP_DIR | Backup storage location | /app/backups |
| LOG_FILE | Update log file | /var/log/scrapos-update.log |

### Script Options

```bash
# Run update
sudo ./update-from-github.sh

# View update log
cat /var/log/scrapos-update.log

# View last update
tail -50 /var/log/scrapos-update.log
```

---

## 6. Manual Update Steps

If you prefer to update manually:

### Step 1: Create Backup
```bash
# Create backup directory
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p /app/backups/manual_$TIMESTAMP

# Backup database
mongodump --db scrapos --out /app/backups/manual_$TIMESTAMP/db

# Backup config files
cp /app/backend/.env /app/backups/manual_$TIMESTAMP/
cp /app/frontend/.env /app/backups/manual_$TIMESTAMP/
```

### Step 2: Stop Services
```bash
sudo supervisorctl stop all
```

### Step 3: Pull Latest Code
```bash
cd /app
git fetch origin
git pull origin main
```

### Step 4: Update Backend
```bash
cd /app/backend
pip install -r requirements.txt
```

### Step 5: Update Frontend
```bash
cd /app/frontend
yarn install
yarn build
```

### Step 6: Start Services
```bash
sudo supervisorctl start all
```

### Step 7: Verify
```bash
# Check services
sudo supervisorctl status

# Check backend
curl http://localhost:8001/api/health

# Check logs
tail -f /var/log/supervisor/backend.out.log
```

---

## 7. Rollback Procedure

If something goes wrong after an update:

### Quick Rollback

```bash
# 1. Stop services
sudo supervisorctl stop all

# 2. Find your backup
ls -la /app/backups/

# 3. Revert to previous commit
cd /app
git log --oneline -10  # Find the commit to revert to
git checkout <commit-hash>

# 4. Restore dependencies
cd /app/backend && pip install -r requirements.txt
cd /app/frontend && yarn install && yarn build

# 5. Restore database (if needed)
mongorestore --drop --db scrapos /app/backups/pre_update_TIMESTAMP/db/scrapos

# 6. Start services
sudo supervisorctl start all
```

### Full Rollback from Backup

```bash
# 1. Stop services
sudo supervisorctl stop all

# 2. Extract backup
cd /app/backups
tar -xzf pre_update_YYYYMMDD_HHMMSS.tar.gz

# 3. Restore .env files
cp pre_update_YYYYMMDD_HHMMSS/config/backend.env /app/backend/.env
cp pre_update_YYYYMMDD_HHMMSS/config/frontend.env /app/frontend/.env

# 4. Restore database
mongosh scrapos --eval "db.dropDatabase()"
mongorestore --db scrapos pre_update_YYYYMMDD_HHMMSS/db/scrapos

# 5. Rebuild frontend
cd /app/frontend && yarn build

# 6. Start services
sudo supervisorctl start all
```

---

## 8. Troubleshooting

### Error: "Permission denied"
```bash
# Fix ownership
sudo chown -R $USER:$USER /app

# Fix permissions
sudo chmod -R 755 /app
```

### Error: "Git pull failed - uncommitted changes"
```bash
# Option 1: Stash changes
git stash
git pull origin main
git stash pop  # Restore your changes

# Option 2: Discard local changes (careful!)
git checkout -- .
git pull origin main
```

### Error: "Merge conflict"
```bash
# View conflicts
git status

# Option 1: Accept remote changes
git checkout --theirs .
git add .
git commit -m "Resolved conflicts - accepted remote"

# Option 2: Accept local changes
git checkout --ours .
git add .
git commit -m "Resolved conflicts - kept local"
```

### Error: "pip install failed"
```bash
# Upgrade pip first
pip install --upgrade pip

# Install with verbose output
pip install -r requirements.txt -v

# If specific package fails, install separately
pip install <package-name>
```

### Error: "yarn build failed"
```bash
# Clear cache and reinstall
cd /app/frontend
rm -rf node_modules
rm yarn.lock
yarn install
yarn build
```

### Error: "Services won't start"
```bash
# Check error logs
tail -100 /var/log/supervisor/backend.err.log

# Try running manually
cd /app/backend
python -m uvicorn server:app --host 0.0.0.0 --port 8001
```

---

## 9. Automated Updates (Cron)

To set up automatic updates:

### Create Cron Job

```bash
# Edit crontab
sudo crontab -e

# Add this line for daily updates at 3 AM
0 3 * * * /app/update-from-github.sh >> /var/log/scrapos-auto-update.log 2>&1

# Or weekly updates on Sunday at 3 AM
0 3 * * 0 /app/update-from-github.sh >> /var/log/scrapos-auto-update.log 2>&1
```

### Notification on Update (Optional)

Add to end of update script:
```bash
# Send email notification
echo "ScrapOS update completed at $(date)" | mail -s "ScrapOS Update" your@email.com
```

---

## 10. Best Practices

### Before Updating
- [ ] Check GitHub for any breaking changes in release notes
- [ ] Ensure you have recent backup
- [ ] Plan update during low-traffic hours
- [ ] Have rollback plan ready

### During Update
- [ ] Monitor the update process
- [ ] Watch for any error messages
- [ ] Keep terminal session active

### After Update
- [ ] Verify all services are running
- [ ] Test critical functionality (login, create PO, etc.)
- [ ] Check error logs for any issues
- [ ] Confirm backup was created

### Security Best Practices
- Use SSH keys instead of HTTPS tokens when possible
- Rotate Personal Access Tokens regularly
- Don't commit .env files to GitHub
- Keep .env files in .gitignore

---

## Quick Reference Commands

| Task | Command |
|------|---------|
| Update from GitHub | `sudo ./update-from-github.sh` |
| Check Git status | `git status` |
| View recent commits | `git log --oneline -10` |
| Pull latest code | `git pull origin main` |
| Create backup | `mongodump --db scrapos --out /app/backups/$(date +%Y%m%d)` |
| Restart services | `sudo supervisorctl restart all` |
| View update log | `tail -100 /var/log/scrapos-update.log` |
| Check service status | `sudo supervisorctl status` |

---

## Support

For issues with updates:
1. Check the update log: `/var/log/scrapos-update.log`
2. Check service logs: `/var/log/supervisor/backend.err.log`
3. Review GitHub repository issues page
4. Contact: support@scrapos.ae

---

**Document End**
