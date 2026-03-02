# ScrapOS ERP - Windows Installation Package

## Complete Windows Server / Windows 11 Installation Guide

This package contains everything needed to install ScrapOS ERP on Windows.

## Package Contents

```
windows-installer/
├── install.ps1              # Main PowerShell installer (Run as Admin)
├── setup-wizard.ps1         # Interactive configuration wizard
├── scripts/
│   ├── install-mongodb.ps1  # MongoDB installation
│   ├── install-nodejs.ps1   # Node.js installation
│   ├── install-python.ps1   # Python installation
│   ├── setup-iis.ps1        # IIS configuration
│   ├── setup-services.ps1   # Windows Services setup
│   └── create-shortcuts.ps1 # Desktop shortcuts
├── config/
│   ├── backend.env.template # Backend environment template
│   ├── frontend.env.template# Frontend environment template
│   ├── iis-config.xml       # IIS Application Pool config
│   └── mongodb.conf         # MongoDB configuration
├── docs/
│   ├── INSTALLATION.md      # Step-by-step installation guide
│   ├── IIS-SETUP.md         # Detailed IIS configuration
│   ├── MONGODB-SETUP.md     # MongoDB setup guide
│   ├── TROUBLESHOOTING.md   # Common issues and solutions
│   └── LICENSING.md         # Trial license information
├── dependencies/
│   └── download-deps.ps1    # Downloads all dependencies
└── app/
    ├── backend/             # Python backend code
    └── frontend/            # React frontend (built)
```

## Quick Start

### Option 1: Automated Installation (Recommended)
```powershell
# Run PowerShell as Administrator
Set-ExecutionPolicy Bypass -Scope Process -Force
.\install.ps1
```

### Option 2: Step-by-Step Manual Installation
See `docs/INSTALLATION.md` for detailed instructions.

## System Requirements

- **OS**: Windows Server 2019/2022 or Windows 10/11 Pro
- **RAM**: Minimum 4GB (8GB recommended)
- **Disk**: Minimum 10GB free space
- **CPU**: 2+ cores recommended

## Default Ports

| Service | Port |
|---------|------|
| Frontend (IIS) | 80/443 |
| Backend API | 8001 |
| MongoDB | 27017 |

## Support

For issues, contact: support@scrapos.ae
