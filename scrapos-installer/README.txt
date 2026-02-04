╔═══════════════════════════════════════════════════════════╗
║           ScrapOS ERP - Installation Package              ║
║              For Ubuntu 22.04 / 24.04 LTS                 ║
╚═══════════════════════════════════════════════════════════╝

REQUIREMENTS:
- Ubuntu 22.04 or 24.04 LTS (fresh installation recommended)
- Minimum 2GB RAM, 20GB disk space
- User with sudo privileges
- Internet connection (for downloading dependencies)

═══════════════════════════════════════════════════════════
              INSTALLATION STEPS (3 EASY STEPS)
═══════════════════════════════════════════════════════════

STEP 1: Extract the package
─────────────────────────────
   tar -xzvf scrapos-erp-installer.tar.gz

STEP 2: Go into the folder
─────────────────────────────
   cd scrapos-installer

STEP 3: Run the installer
─────────────────────────────
   chmod +x install.sh
   ./install.sh

═══════════════════════════════════════════════════════════

The installer will:
✓ Install all system dependencies
✓ Install MongoDB database
✓ Install Node.js and Python
✓ Configure the application
✓ Start all services automatically
✓ Create an admin user for you

After installation completes, you will see:
- Web URL to access the application
- Login credentials

═══════════════════════════════════════════════════════════
                    DEFAULT LOGIN
═══════════════════════════════════════════════════════════
Email:     admin@scrapos.local
Password:  Admin@123

⚠️  Change your password after first login!

═══════════════════════════════════════════════════════════
                    USEFUL COMMANDS
═══════════════════════════════════════════════════════════
Check status:     pm2 status
View logs:        pm2 logs
Restart all:      pm2 restart all
Stop all:         pm2 stop all

═══════════════════════════════════════════════════════════
                      SUPPORT
═══════════════════════════════════════════════════════════
If you encounter any issues during installation, please
check the error message and ensure:
1. You are running Ubuntu 22.04 or 24.04
2. You have internet connection
3. You are NOT running as root (don't use sudo ./install.sh)

