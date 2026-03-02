# IIS Configuration Guide for ScrapOS ERP

## Overview

ScrapOS uses IIS (Internet Information Services) as the web server for:
- Serving the React frontend
- Reverse proxying API requests to the Python backend

## Architecture

```
                    ┌─────────────────────────────────────────┐
                    │              IIS Server                 │
                    │                                         │
  User Request      │  ┌─────────────────────────────────┐   │
  ──────────────────┼─>│         URL Rewrite             │   │
       :80/:443     │  └─────────────────────────────────┘   │
                    │           │              │              │
                    │           ▼              ▼              │
                    │    ┌──────────┐    ┌──────────┐        │
                    │    │ /api/*   │    │   /*     │        │
                    │    └────┬─────┘    └────┬─────┘        │
                    │         │               │               │
                    └─────────┼───────────────┼───────────────┘
                              │               │
                              ▼               ▼
                    ┌─────────────────┐  ┌──────────────────┐
                    │  Backend API    │  │  Static Files    │
                    │  (Python/       │  │  (React Build)   │
                    │   Uvicorn)      │  │                  │
                    │  localhost:8001 │  │  C:\ScrapOS\     │
                    │                 │  │  frontend\build  │
                    └─────────────────┘  └──────────────────┘
```

## Prerequisites

1. **IIS Installed** with the following features:
   - Web Server (IIS)
   - IIS Management Console
   - HTTP Redirection

2. **URL Rewrite Module** installed

3. **Application Request Routing (ARR)** installed and enabled

## Installation Steps

### Step 1: Install Required IIS Features

Open PowerShell as Administrator:

```powershell
# Install IIS core features
Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole -All
Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServer -All
Enable-WindowsOptionalFeature -Online -FeatureName IIS-CommonHttpFeatures -All
Enable-WindowsOptionalFeature -Online -FeatureName IIS-HttpErrors -All
Enable-WindowsOptionalFeature -Online -FeatureName IIS-HttpRedirect -All
Enable-WindowsOptionalFeature -Online -FeatureName IIS-ApplicationDevelopment -All
Enable-WindowsOptionalFeature -Online -FeatureName IIS-NetFxExtensibility45 -All
Enable-WindowsOptionalFeature -Online -FeatureName IIS-HealthAndDiagnostics -All
Enable-WindowsOptionalFeature -Online -FeatureName IIS-HttpLogging -All
Enable-WindowsOptionalFeature -Online -FeatureName IIS-Security -All
Enable-WindowsOptionalFeature -Online -FeatureName IIS-RequestFiltering -All
Enable-WindowsOptionalFeature -Online -FeatureName IIS-Performance -All
Enable-WindowsOptionalFeature -Online -FeatureName IIS-HttpCompressionStatic -All
Enable-WindowsOptionalFeature -Online -FeatureName IIS-ManagementConsole -All
```

### Step 2: Install URL Rewrite Module

Download and install from Microsoft:
https://www.iis.net/downloads/microsoft/url-rewrite

Or via Chocolatey:
```powershell
choco install urlrewrite -y
```

### Step 3: Install Application Request Routing (ARR)

Download from Microsoft:
https://www.iis.net/downloads/microsoft/application-request-routing

Or via Chocolatey:
```powershell
choco install iis-arr -y
```

### Step 4: Enable ARR Proxy

**Via PowerShell:**
```powershell
Set-WebConfigurationProperty -PSPath 'MACHINE/WEBROOT/APPHOST' -Filter "system.webServer/proxy" -Name "enabled" -Value "True"
```

**Via IIS Manager:**
1. Open IIS Manager
2. Click on server name (root level)
3. Double-click "Application Request Routing Cache"
4. Click "Server Proxy Settings" in Actions panel
5. Check "Enable proxy"
6. Click Apply

### Step 5: Create Application Pool

```powershell
Import-Module WebAdministration

# Create Application Pool
New-WebAppPool -Name "ScrapOSAppPool"

# Configure as "No Managed Code" (since we're serving static files + proxying)
Set-ItemProperty -Path "IIS:\AppPools\ScrapOSAppPool" -Name "managedRuntimeVersion" -Value ""

# Set identity (optional - use specific account for production)
# Set-ItemProperty -Path "IIS:\AppPools\ScrapOSAppPool" -Name "processModel.identityType" -Value "NetworkService"
```

### Step 6: Create Website

```powershell
# Remove default website binding on port 80 (optional)
Remove-WebBinding -Name "Default Web Site" -Port 80 -ErrorAction SilentlyContinue

# Create new website
New-Website -Name "ScrapOS" `
    -PhysicalPath "C:\ScrapOS\frontend\build" `
    -ApplicationPool "ScrapOSAppPool" `
    -Port 80
```

### Step 7: Configure web.config

Create/edit `C:\ScrapOS\frontend\build\web.config`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <system.webServer>
        <!-- URL Rewrite Rules -->
        <rewrite>
            <rules>
                <!-- Rule 1: Proxy API requests to backend -->
                <rule name="API Proxy" stopProcessing="true">
                    <match url="^api/(.*)" />
                    <conditions>
                        <add input="{CACHE_URL}" pattern="^(https?)://" />
                    </conditions>
                    <action type="Rewrite" url="http://localhost:8001/api/{R:1}" />
                </rule>
                
                <!-- Rule 2: Handle React Router (SPA) -->
                <rule name="React Routes" stopProcessing="true">
                    <match url=".*" />
                    <conditions logicalGrouping="MatchAll">
                        <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
                        <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
                        <add input="{REQUEST_URI}" pattern="^/api" negate="true" />
                    </conditions>
                    <action type="Rewrite" url="/index.html" />
                </rule>
            </rules>
        </rewrite>
        
        <!-- MIME Types for modern web assets -->
        <staticContent>
            <remove fileExtension=".json" />
            <mimeMap fileExtension=".json" mimeType="application/json" />
            <remove fileExtension=".woff" />
            <mimeMap fileExtension=".woff" mimeType="font/woff" />
            <remove fileExtension=".woff2" />
            <mimeMap fileExtension=".woff2" mimeType="font/woff2" />
            <remove fileExtension=".webp" />
            <mimeMap fileExtension=".webp" mimeType="image/webp" />
        </staticContent>
        
        <!-- Custom error handling for SPA -->
        <httpErrors errorMode="Custom" existingResponse="Replace">
            <remove statusCode="404" />
            <error statusCode="404" path="/index.html" responseMode="ExecuteURL" />
        </httpErrors>
        
        <!-- Enable compression -->
        <httpCompression>
            <dynamicTypes>
                <add mimeType="application/json" enabled="true" />
                <add mimeType="application/javascript" enabled="true" />
            </dynamicTypes>
            <staticTypes>
                <add mimeType="application/javascript" enabled="true" />
                <add mimeType="text/css" enabled="true" />
            </staticTypes>
        </httpCompression>
        
        <!-- Security headers -->
        <httpProtocol>
            <customHeaders>
                <add name="X-Content-Type-Options" value="nosniff" />
                <add name="X-Frame-Options" value="SAMEORIGIN" />
                <add name="X-XSS-Protection" value="1; mode=block" />
            </customHeaders>
        </httpProtocol>
    </system.webServer>
</configuration>
```

### Step 8: Set Folder Permissions

```powershell
$acl = Get-Acl "C:\ScrapOS\frontend\build"
$rule = New-Object System.Security.AccessControl.FileSystemAccessRule("IIS_IUSRS", "ReadAndExecute", "ContainerInherit,ObjectInherit", "None", "Allow")
$acl.SetAccessRule($rule)
Set-Acl "C:\ScrapOS\frontend\build" $acl
```

## HTTPS Configuration

### Option 1: Self-Signed Certificate (Development/Testing)

```powershell
# Create self-signed certificate
$cert = New-SelfSignedCertificate -DnsName "localhost", "scrapos.local" `
    -CertStoreLocation "cert:\LocalMachine\My" `
    -FriendlyName "ScrapOS SSL" `
    -NotAfter (Get-Date).AddYears(5)

# Add HTTPS binding
New-WebBinding -Name "ScrapOS" -Protocol "https" -Port 443 -SslFlags 0

# Assign certificate
$binding = Get-WebBinding -Name "ScrapOS" -Protocol "https"
$binding.AddSslCertificate($cert.Thumbprint, "my")
```

### Option 2: Let's Encrypt (Production)

1. Install win-acme: https://www.win-acme.com/
2. Run: `wacs.exe --target iis --siteid <site-id> --installation iis`

### Option 3: Commercial Certificate

1. Purchase certificate from CA (DigiCert, Comodo, etc.)
2. Import certificate:
   ```powershell
   Import-PfxCertificate -FilePath "C:\certs\scrapos.pfx" -CertStoreLocation "Cert:\LocalMachine\My" -Password (ConvertTo-SecureString -String "password" -AsPlainText -Force)
   ```
3. Bind to website via IIS Manager

## Troubleshooting

### Issue: 502 Bad Gateway

**Cause:** Backend is not running or ARR proxy is not enabled.

**Solution:**
1. Verify backend is running: `Get-Service ScrapOSBackend`
2. Test backend directly: `curl http://localhost:8001/api/health`
3. Enable ARR proxy (see Step 4)

### Issue: 404 for React Routes

**Cause:** URL Rewrite not configured for SPA.

**Solution:** Ensure web.config has the React Routes rule and httpErrors configuration.

### Issue: API Requests Not Proxied

**Cause:** ARR not installed or enabled.

**Solution:**
```powershell
# Check if ARR is installed
Get-WebGlobalModule | Where-Object { $_.Name -like "*arr*" }

# Enable proxy
Set-WebConfigurationProperty -PSPath 'MACHINE/WEBROOT/APPHOST' -Filter "system.webServer/proxy" -Name "enabled" -Value "True"
```

### Issue: Static Files Not Loading

**Cause:** Missing MIME types.

**Solution:** Add MIME types in web.config (see Step 7).

### Issue: Permission Denied

**Cause:** IIS user doesn't have access to files.

**Solution:**
```powershell
icacls "C:\ScrapOS\frontend\build" /grant "IIS_IUSRS:(OI)(CI)RX" /T
```

## Performance Optimization

### Enable Output Caching

```xml
<system.webServer>
    <caching>
        <profiles>
            <add extension=".js" policy="CacheUntilChange" kernelCachePolicy="CacheUntilChange" />
            <add extension=".css" policy="CacheUntilChange" kernelCachePolicy="CacheUntilChange" />
            <add extension=".png" policy="CacheUntilChange" kernelCachePolicy="CacheUntilChange" />
            <add extension=".jpg" policy="CacheUntilChange" kernelCachePolicy="CacheUntilChange" />
        </profiles>
    </caching>
</system.webServer>
```

### Enable HTTP/2

Requires HTTPS. Enabled by default on Windows Server 2016+.

## Useful Commands

```powershell
# Restart IIS
iisreset

# Restart specific site
Restart-WebItem "IIS:\Sites\ScrapOS"

# View IIS logs
Get-Content "C:\inetpub\logs\LogFiles\W3SVC1\*.log" -Tail 50

# Check site status
Get-Website -Name "ScrapOS" | Select-Object Name, State, PhysicalPath

# List all bindings
Get-WebBinding -Name "ScrapOS"
```
