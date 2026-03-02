# MongoDB Setup Guide for ScrapOS ERP

## Overview

ScrapOS uses MongoDB as its database. This guide covers installation, configuration, and management of MongoDB on Windows.

## Installation Options

### Option 1: Local Installation (Recommended for Single Server)

#### Using Chocolatey (Automated)
```powershell
choco install mongodb -y
```

#### Manual Installation
1. Download MongoDB Community Server from:
   https://www.mongodb.com/try/download/community

2. Run the installer and select:
   - "Complete" installation
   - Install as Windows Service
   - Install MongoDB Compass (optional GUI)

3. Default installation path: `C:\Program Files\MongoDB\Server\7.0\`

### Option 2: MongoDB Atlas (Cloud - Recommended for Production)

1. Create account at https://www.mongodb.com/cloud/atlas
2. Create a free cluster
3. Get connection string
4. Update ScrapOS configuration with Atlas URI

## Configuration

### Default Paths

| Item | Path |
|------|------|
| Installation | C:\Program Files\MongoDB\Server\7.0\ |
| Data | C:\Program Files\MongoDB\Server\7.0\data\ |
| Logs | C:\Program Files\MongoDB\Server\7.0\log\ |
| Config | C:\Program Files\MongoDB\Server\7.0\bin\mongod.cfg |

### Configuration File (mongod.cfg)

```yaml
# MongoDB Configuration File

# Where to store data
storage:
  dbPath: C:\Program Files\MongoDB\Server\7.0\data
  journal:
    enabled: true

# Network settings
net:
  port: 27017
  bindIp: 127.0.0.1  # Change to 0.0.0.0 for remote access

# Security (enable for production)
#security:
#  authorization: enabled

# Logging
systemLog:
  destination: file
  path: C:\Program Files\MongoDB\Server\7.0\log\mongod.log
  logAppend: true
```

### Enable Authentication (Production)

1. Connect to MongoDB:
```powershell
mongosh
```

2. Create admin user:
```javascript
use admin
db.createUser({
  user: "admin",
  pwd: "YourSecurePassword",
  roles: [ { role: "userAdminAnyDatabase", db: "admin" } ]
})
```

3. Create ScrapOS database user:
```javascript
use scrapos
db.createUser({
  user: "scrapos_user",
  pwd: "YourAppPassword",
  roles: [ { role: "readWrite", db: "scrapos" } ]
})
```

4. Enable authorization in mongod.cfg:
```yaml
security:
  authorization: enabled
```

5. Restart MongoDB service:
```powershell
Restart-Service MongoDB
```

6. Update ScrapOS connection string:
```
MONGO_URL=mongodb://scrapos_user:YourAppPassword@localhost:27017/scrapos
```

## Service Management

### Start/Stop/Restart
```powershell
# Start
Start-Service MongoDB

# Stop  
Stop-Service MongoDB

# Restart
Restart-Service MongoDB

# Check status
Get-Service MongoDB
```

### Set to Auto-Start
```powershell
Set-Service MongoDB -StartupType Automatic
```

### View Logs
```powershell
Get-Content "C:\Program Files\MongoDB\Server\7.0\log\mongod.log" -Tail 50
```

## Backup & Restore

### Backup Database
```powershell
# Create backup directory
New-Item -ItemType Directory -Path "C:\MongoBackups" -Force

# Backup
mongodump --db scrapos --out "C:\MongoBackups\$(Get-Date -Format 'yyyy-MM-dd')"
```

### Restore Database
```powershell
mongorestore --db scrapos "C:\MongoBackups\2024-01-15\scrapos"
```

### Automated Daily Backup

Create `C:\Scripts\backup-mongodb.ps1`:
```powershell
$backupPath = "C:\MongoBackups\$(Get-Date -Format 'yyyy-MM-dd')"
mongodump --db scrapos --out $backupPath

# Keep only last 7 days
Get-ChildItem "C:\MongoBackups" -Directory | 
    Sort-Object CreationTime -Descending | 
    Select-Object -Skip 7 | 
    Remove-Item -Recurse -Force
```

Schedule with Task Scheduler:
```powershell
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-File C:\Scripts\backup-mongodb.ps1"
$trigger = New-ScheduledTaskTrigger -Daily -At "2:00AM"
Register-ScheduledTask -TaskName "MongoDBBackup" -Action $action -Trigger $trigger -RunLevel Highest
```

## Remote Access Configuration

### Enable Remote Connections

1. Edit mongod.cfg:
```yaml
net:
  port: 27017
  bindIp: 0.0.0.0  # Allow all IPs
```

2. Configure Windows Firewall:
```powershell
New-NetFirewallRule -DisplayName "MongoDB" -Direction Inbound -Port 27017 -Protocol TCP -Action Allow
```

3. Restart MongoDB:
```powershell
Restart-Service MongoDB
```

**⚠️ Security Warning:** Always enable authentication before allowing remote access!

## MongoDB Compass (GUI)

MongoDB Compass is a graphical interface for managing MongoDB.

### Installation
```powershell
choco install mongodb-compass -y
```

### Connection String Examples

Local:
```
mongodb://localhost:27017/scrapos
```

With authentication:
```
mongodb://scrapos_user:password@localhost:27017/scrapos
```

MongoDB Atlas:
```
mongodb+srv://username:password@cluster.mongodb.net/scrapos
```

## Performance Tuning

### Index Creation for ScrapOS

Connect to MongoDB and run:
```javascript
use scrapos

// Users collection
db.users.createIndex({ "email": 1 }, { unique: true })

// Companies collection  
db.companies.createIndex({ "code": 1 }, { unique: true })

// Purchase orders
db.local_purchases.createIndex({ "company_id": 1, "created_at": -1 })
db.local_purchases.createIndex({ "order_number": 1 }, { unique: true })

// Sales orders
db.local_sales.createIndex({ "company_id": 1, "created_at": -1 })
db.local_sales.createIndex({ "order_number": 1 }, { unique: true })

// Inventory
db.inventory_transactions.createIndex({ "company_id": 1, "item_id": 1, "created_at": -1 })

// Chart of Accounts
db.chart_of_accounts.createIndex({ "company_id": 1, "account_code": 1 }, { unique: true })

// Journal Entries
db.accounting_journal_entries.createIndex({ "company_id": 1, "entry_date": -1 })
```

### Memory Settings

For servers with 8GB+ RAM, edit mongod.cfg:
```yaml
storage:
  wiredTiger:
    engineConfig:
      cacheSizeGB: 2  # Adjust based on available RAM
```

## Troubleshooting

### MongoDB Won't Start

1. Check logs:
```powershell
Get-Content "C:\Program Files\MongoDB\Server\7.0\log\mongod.log" -Tail 100
```

2. Common causes:
   - Port 27017 in use
   - Corrupt data files
   - Insufficient disk space

3. Repair database (if corrupt):
```powershell
mongod --repair --dbpath "C:\Program Files\MongoDB\Server\7.0\data"
```

### Connection Refused

1. Check service status:
```powershell
Get-Service MongoDB
```

2. Check port:
```powershell
netstat -an | findstr 27017
```

3. Check firewall:
```powershell
Get-NetFirewallRule -DisplayName "*Mongo*"
```

### High Memory Usage

MongoDB uses available memory for caching. This is normal.

To limit:
```yaml
storage:
  wiredTiger:
    engineConfig:
      cacheSizeGB: 1
```

## Useful Commands

```powershell
# Connect to MongoDB shell
mongosh

# Show databases
show dbs

# Use ScrapOS database
use scrapos

# Show collections
show collections

# Count documents
db.users.countDocuments()

# Find all users
db.users.find().pretty()

# Server status
db.serverStatus()

# Database stats
db.stats()
```
