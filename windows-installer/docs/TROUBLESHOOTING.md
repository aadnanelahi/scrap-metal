# ScrapOS ERP - Troubleshooting Guide

## Quick Diagnostics

Run this PowerShell script to check system health:

```powershell
Write-Host "=== ScrapOS Health Check ===" -ForegroundColor Cyan

# Check Services
Write-Host "`nServices:" -ForegroundColor Yellow
@("MongoDB", "ScrapOSBackend", "W3SVC") | ForEach-Object {
    $svc = Get-Service $_ -ErrorAction SilentlyContinue
    $status = if ($svc) { $svc.Status } else { "Not Found" }
    $color = if ($status -eq "Running") { "Green" } else { "Red" }
    Write-Host "  $_: $status" -ForegroundColor $color
}

# Check Ports
Write-Host "`nPorts:" -ForegroundColor Yellow
@(80, 443, 8001, 27017) | ForEach-Object {
    $conn = Test-NetConnection -ComputerName localhost -Port $_ -WarningAction SilentlyContinue
    $status = if ($conn.TcpTestSucceeded) { "Open" } else { "Closed" }
    $color = if ($conn.TcpTestSucceeded) { "Green" } else { "Red" }
    Write-Host "  Port $_`: $status" -ForegroundColor $color
}

# Check API
Write-Host "`nAPI Health:" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8001/api/health" -TimeoutSec 5
    Write-Host "  Backend: OK" -ForegroundColor Green
} catch {
    Write-Host "  Backend: FAILED" -ForegroundColor Red
}

# Check Frontend
try {
    $response = Invoke-WebRequest -Uri "http://localhost" -TimeoutSec 5
    Write-Host "  Frontend: OK" -ForegroundColor Green
} catch {
    Write-Host "  Frontend: FAILED" -ForegroundColor Red
}
```

---

## Common Issues

### 1. Installation Fails

#### Error: "Script cannot be loaded because running scripts is disabled"

**Solution:**
```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force
```

#### Error: "Access denied" or "Must run as Administrator"

**Solution:**
Right-click PowerShell → "Run as Administrator"

#### Error: "Chocolatey installation failed"

**Solution:**
1. Check internet connection
2. Temporarily disable antivirus
3. Try manual install: https://chocolatey.org/install

---

### 2. Backend Service Issues

#### Service Won't Start

**Check logs:**
```powershell
Get-Content "C:\ScrapOS\logs\backend-err.log" -Tail 50
```

**Common causes:**

1. **Port 8001 in use:**
   ```powershell
   netstat -ano | findstr :8001
   # Kill the process using PID
   taskkill /PID <pid> /F
   ```

2. **Python dependencies missing:**
   ```powershell
   cd C:\ScrapOS\backend
   python -m pip install -r requirements.txt
   ```

3. **MongoDB not running:**
   ```powershell
   Start-Service MongoDB
   ```

4. **Invalid .env configuration:**
   ```powershell
   notepad C:\ScrapOS\backend\.env
   # Verify MONGO_URL and other settings
   ```

#### Test Backend Manually

```powershell
cd C:\ScrapOS\backend
python -m uvicorn server:app --host 0.0.0.0 --port 8001
```

Watch for error messages.

---

### 3. Frontend/IIS Issues

#### 404 Error on All Pages

**Cause:** URL Rewrite not working

**Solution:**
1. Verify URL Rewrite module installed:
   ```powershell
   Get-WebGlobalModule | Where-Object { $_.Name -like "*rewrite*" }
   ```

2. Check web.config exists:
   ```powershell
   Test-Path "C:\ScrapOS\frontend\build\web.config"
   ```

3. Reset IIS:
   ```powershell
   iisreset
   ```

#### 500 Internal Server Error

**Check IIS logs:**
```powershell
Get-Content "C:\inetpub\logs\LogFiles\W3SVC*\*.log" -Tail 50
```

**Enable detailed errors:**
```xml
<!-- Add to web.config -->
<system.webServer>
    <httpErrors errorMode="Detailed" />
</system.webServer>
```

#### 502 Bad Gateway (API calls fail)

**Cause:** Backend not reachable or ARR proxy disabled

**Solution:**
1. Check backend is running:
   ```powershell
   Invoke-RestMethod http://localhost:8001/api/health
   ```

2. Enable ARR proxy:
   ```powershell
   Set-WebConfigurationProperty -PSPath 'MACHINE/WEBROOT/APPHOST' -Filter "system.webServer/proxy" -Name "enabled" -Value "True"
   iisreset
   ```

#### Static Files Not Loading (CSS/JS)

**Cause:** Missing MIME types

**Solution:** Add to web.config:
```xml
<staticContent>
    <mimeMap fileExtension=".json" mimeType="application/json" />
    <mimeMap fileExtension=".woff2" mimeType="font/woff2" />
</staticContent>
```

---

### 4. MongoDB Issues

#### Cannot Connect to MongoDB

**Check service:**
```powershell
Get-Service MongoDB
Start-Service MongoDB
```

**Check port:**
```powershell
Test-NetConnection -ComputerName localhost -Port 27017
```

**Check logs:**
```powershell
Get-Content "C:\Program Files\MongoDB\Server\7.0\log\mongod.log" -Tail 50
```

#### Database Corrupted

**Repair:**
```powershell
Stop-Service MongoDB
mongod --repair --dbpath "C:\Program Files\MongoDB\Server\7.0\data"
Start-Service MongoDB
```

#### Authentication Failed

**Reset user password:**
```javascript
// Connect without auth first (edit mongod.cfg, disable security temporarily)
mongosh
use admin
db.changeUserPassword("admin", "newpassword")
```

---

### 5. Login Issues

#### "Invalid credentials" Error

1. **Verify user exists:**
   ```javascript
   // In mongosh
   use scrapos
   db.users.findOne({email: "admin@scrapos.ae"})
   ```

2. **Reset admin password:**
   ```javascript
   use scrapos
   // Password hash for "Admin!234"
   db.users.updateOne(
     {email: "admin@scrapos.ae"},
     {$set: {password_hash: "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.3VLpWjhQmKPxOe"}}
   )
   ```

3. **Re-seed database:**
   ```powershell
   Invoke-RestMethod -Uri "http://localhost:8001/api/seed" -Method Post
   ```

#### Session Expires Too Quickly

Edit `C:\ScrapOS\backend\.env`:
```
ACCESS_TOKEN_EXPIRE_MINUTES=1440  # 24 hours
```

Restart backend service.

---

### 6. Performance Issues

#### Slow Page Load

1. **Check available RAM:**
   ```powershell
   Get-Process | Sort-Object WorkingSet64 -Descending | Select-Object -First 10 Name, @{N='RAM(MB)';E={[math]::Round($_.WorkingSet64/1MB,2)}}
   ```

2. **Check disk space:**
   ```powershell
   Get-PSDrive C | Select-Object Used, Free
   ```

3. **Enable IIS compression:**
   ```powershell
   Enable-WindowsOptionalFeature -Online -FeatureName IIS-HttpCompressionStatic
   Enable-WindowsOptionalFeature -Online -FeatureName IIS-HttpCompressionDynamic
   ```

#### High CPU Usage

1. **Identify process:**
   ```powershell
   Get-Process | Sort-Object CPU -Descending | Select-Object -First 5
   ```

2. **Check MongoDB indexes:**
   ```javascript
   use scrapos
   db.local_purchases.getIndexes()
   // Add missing indexes
   ```

---

### 7. Trial License Issues

#### "Trial Expired" Message

**Check license file:**
```powershell
Get-Content "C:\ScrapOS\license.json" | ConvertFrom-Json
```

**Options:**
1. Contact sales@scrapos.ae for full license
2. Reinstall for new trial (data will be preserved)

#### License Not Recognized After Move

**Cause:** License is bound to machine ID

**Solution:** Contact support for license transfer

---

### 8. Backup/Restore Issues

#### Backup Fails

**Check MongoDB service:**
```powershell
Get-Service MongoDB
```

**Manual backup:**
```powershell
mongodump --db scrapos --out "C:\Backups\manual"
```

#### Restore Fails

**Clear existing data first:**
```javascript
use scrapos
db.dropDatabase()
```

**Then restore:**
```powershell
mongorestore --db scrapos "C:\Backups\manual\scrapos"
```

---

## Log Locations

| Component | Log Path |
|-----------|----------|
| Backend | C:\ScrapOS\logs\backend-out.log |
| Backend Errors | C:\ScrapOS\logs\backend-err.log |
| IIS | C:\inetpub\logs\LogFiles\W3SVC1\ |
| MongoDB | C:\Program Files\MongoDB\Server\7.0\log\mongod.log |
| Windows Events | Event Viewer → Windows Logs → Application |

## Getting Help

1. **Check logs** (see table above)
2. **Run health check** script
3. **Contact support:** support@scrapos.ae

Include in support request:
- Error message (screenshot or text)
- Relevant log entries
- Steps to reproduce
- Windows version
- ScrapOS version (from license.json)
