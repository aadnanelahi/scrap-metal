#Requires -RunAsAdministrator
<#
.SYNOPSIS
    ScrapOS ERP Windows Installer
.DESCRIPTION
    Complete installation script for ScrapOS ERP on Windows Server/Windows 11
.NOTES
    Run this script as Administrator
#>

param(
    [switch]$Silent,
    [switch]$SkipDependencies,
    [string]$InstallPath = "C:\ScrapOS"
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# ASCII Banner
$banner = @"
 ____                        ___  ____  
/ ___|  ___ _ __ __ _ _ __  / _ \/ ___| 
\___ \ / __| '__/ _` | '_ \| | | \___ \ 
 ___) | (__| | | (_| | |_) | |_| |___) |
|____/ \___|_|  \__,_| .__/ \___/|____/ 
                     |_|    ERP System
         Windows Installation Wizard
"@

Write-Host $banner -ForegroundColor Cyan
Write-Host ""
Write-Host "============================================" -ForegroundColor Yellow
Write-Host "  ScrapOS ERP - Windows Installer v1.0" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Yellow
Write-Host ""

# Check if running as Administrator
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

# Global variables
$Script:Config = @{
    InstallPath = $InstallPath
    MongoDBPath = "C:\Program Files\MongoDB\Server\7.0"
    NodeJSPath = "C:\Program Files\nodejs"
    PythonPath = "C:\Python311"
    BackendPort = 8001
    FrontendPort = 80
    MongoDBPort = 27017
    CompanyName = ""
    AdminEmail = ""
    AdminPassword = ""
    MongoDBUri = ""
    UseIIS = $true
    InstallMongoDB = $true
}

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host ">>> $Message" -ForegroundColor Green
    Write-Host ("-" * 50) -ForegroundColor DarkGray
}

function Write-Info {
    param([string]$Message)
    Write-Host "    $Message" -ForegroundColor White
}

function Write-Warning {
    param([string]$Message)
    Write-Host "    WARNING: $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "    ERROR: $Message" -ForegroundColor Red
}

function Test-CommandExists {
    param([string]$Command)
    $null -ne (Get-Command $Command -ErrorAction SilentlyContinue)
}

# =============================================================================
# STEP 1: Configuration Wizard
# =============================================================================
function Show-ConfigurationWizard {
    Write-Step "Configuration Wizard"
    
    if (-not $Silent) {
        # Installation Path
        $defaultPath = $Script:Config.InstallPath
        $input = Read-Host "Installation path [$defaultPath]"
        if ($input) { $Script:Config.InstallPath = $input }
        
        # Company Name
        do {
            $Script:Config.CompanyName = Read-Host "Company Name (required)"
        } while ([string]::IsNullOrWhiteSpace($Script:Config.CompanyName))
        
        # Admin Email
        do {
            $Script:Config.AdminEmail = Read-Host "Admin Email (required)"
        } while ([string]::IsNullOrWhiteSpace($Script:Config.AdminEmail))
        
        # Admin Password
        do {
            $securePass = Read-Host "Admin Password (min 8 chars)" -AsSecureString
            $Script:Config.AdminPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
                [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePass)
            )
        } while ($Script:Config.AdminPassword.Length -lt 8)
        
        # MongoDB Configuration
        Write-Host ""
        Write-Host "MongoDB Configuration:" -ForegroundColor Cyan
        Write-Host "  1. Install MongoDB locally (recommended for single server)"
        Write-Host "  2. Use existing MongoDB server"
        $mongoChoice = Read-Host "Select option [1]"
        
        if ($mongoChoice -eq "2") {
            $Script:Config.InstallMongoDB = $false
            $Script:Config.MongoDBUri = Read-Host "MongoDB Connection URI"
        } else {
            $Script:Config.InstallMongoDB = $true
            $Script:Config.MongoDBUri = "mongodb://localhost:27017/scrapos"
        }
        
        # IIS Configuration
        Write-Host ""
        $useIIS = Read-Host "Configure IIS as web server? (Y/n)"
        $Script:Config.UseIIS = ($useIIS -ne "n" -and $useIIS -ne "N")
        
        # Port Configuration
        Write-Host ""
        Write-Host "Port Configuration (press Enter for defaults):" -ForegroundColor Cyan
        $backendPort = Read-Host "Backend API port [8001]"
        if ($backendPort) { $Script:Config.BackendPort = [int]$backendPort }
        
        if (-not $Script:Config.UseIIS) {
            $frontendPort = Read-Host "Frontend port [3000]"
            if ($frontendPort) { $Script:Config.FrontendPort = [int]$frontendPort }
        }
    }
    
    # Display configuration summary
    Write-Host ""
    Write-Host "Configuration Summary:" -ForegroundColor Cyan
    Write-Host "  Install Path:    $($Script:Config.InstallPath)"
    Write-Host "  Company Name:    $($Script:Config.CompanyName)"
    Write-Host "  Admin Email:     $($Script:Config.AdminEmail)"
    Write-Host "  MongoDB:         $(if($Script:Config.InstallMongoDB){'Local Install'}else{'External'})"
    Write-Host "  IIS:             $(if($Script:Config.UseIIS){'Yes'}else{'No'})"
    Write-Host "  Backend Port:    $($Script:Config.BackendPort)"
    Write-Host ""
    
    if (-not $Silent) {
        $confirm = Read-Host "Proceed with installation? (Y/n)"
        if ($confirm -eq "n" -or $confirm -eq "N") {
            Write-Host "Installation cancelled." -ForegroundColor Yellow
            exit 0
        }
    }
}

# =============================================================================
# STEP 2: Install Dependencies
# =============================================================================
function Install-Dependencies {
    Write-Step "Installing Dependencies"
    
    # Create installation directory
    Write-Info "Creating installation directory..."
    New-Item -ItemType Directory -Path $Script:Config.InstallPath -Force | Out-Null
    
    # Install Chocolatey if not present
    if (-not (Test-CommandExists "choco")) {
        Write-Info "Installing Chocolatey package manager..."
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
        Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    }
    
    # Install Python
    if (-not (Test-CommandExists "python")) {
        Write-Info "Installing Python 3.11..."
        choco install python311 -y --no-progress
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    } else {
        Write-Info "Python already installed: $(python --version)"
    }
    
    # Install Node.js
    if (-not (Test-CommandExists "node")) {
        Write-Info "Installing Node.js LTS..."
        choco install nodejs-lts -y --no-progress
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    } else {
        Write-Info "Node.js already installed: $(node --version)"
    }
    
    # Install MongoDB
    if ($Script:Config.InstallMongoDB) {
        $mongoService = Get-Service -Name "MongoDB" -ErrorAction SilentlyContinue
        if (-not $mongoService) {
            Write-Info "Installing MongoDB 7.0..."
            choco install mongodb -y --no-progress
            
            # Start MongoDB service
            Start-Service MongoDB -ErrorAction SilentlyContinue
            Set-Service MongoDB -StartupType Automatic
        } else {
            Write-Info "MongoDB already installed"
        }
    }
    
    # Install NSSM for Windows Services
    if (-not (Test-CommandExists "nssm")) {
        Write-Info "Installing NSSM (service manager)..."
        choco install nssm -y --no-progress
    }
    
    # Install IIS if selected
    if ($Script:Config.UseIIS) {
        Write-Info "Installing IIS features..."
        
        # Install IIS
        Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole -All -NoRestart -ErrorAction SilentlyContinue
        Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServer -All -NoRestart -ErrorAction SilentlyContinue
        Enable-WindowsOptionalFeature -Online -FeatureName IIS-ManagementConsole -All -NoRestart -ErrorAction SilentlyContinue
        Enable-WindowsOptionalFeature -Online -FeatureName IIS-HttpRedirect -All -NoRestart -ErrorAction SilentlyContinue
        
        # Check if URL Rewrite is already installed
        $urlRewriteInstalled = Test-Path "C:\Program Files\IIS\Url Rewrite Module 2\rewrite.dll" -ErrorAction SilentlyContinue
        if (-not $urlRewriteInstalled) {
            $urlRewriteInstalled = Test-Path "C:\Windows\System32\inetsrv\rewrite.dll" -ErrorAction SilentlyContinue
        }
        
        if (-not $urlRewriteInstalled) {
            Write-Info "Installing URL Rewrite module..."
            try {
                choco install urlrewrite -y --no-progress --ignore-checksums -ErrorAction SilentlyContinue
            } catch {
                Write-Warning "URL Rewrite installation via Chocolatey failed. Trying direct download..."
                $urlRewriteInstaller = "$env:TEMP\urlrewrite.msi"
                Invoke-WebRequest -Uri "https://download.microsoft.com/download/1/2/8/128E2E22-C1B9-44A4-BE2A-5859ED1D4592/rewrite_amd64_en-US.msi" -OutFile $urlRewriteInstaller -ErrorAction SilentlyContinue
                Start-Process msiexec.exe -Wait -ArgumentList "/i `"$urlRewriteInstaller`" /quiet" -ErrorAction SilentlyContinue
            }
        } else {
            Write-Info "URL Rewrite module already installed"
        }
        
        # Install ARR (Application Request Routing) for reverse proxy - optional
        Write-Info "Checking ARR (Application Request Routing)..."
        try {
            choco install iis-arr -y --no-progress -ErrorAction SilentlyContinue
        } catch {
            Write-Warning "ARR installation skipped. You may need to configure reverse proxy manually."
        }
    }
}

# =============================================================================
# STEP 3: Copy Application Files
# =============================================================================
function Copy-ApplicationFiles {
    Write-Step "Copying Application Files"
    
    $backendDest = Join-Path $Script:Config.InstallPath "backend"
    $frontendDest = Join-Path $Script:Config.InstallPath "frontend"
    
    # Get the script's directory
    $scriptDir = $PSScriptRoot
    if (-not $scriptDir) {
        $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    }
    if (-not $scriptDir) {
        $scriptDir = Get-Location
    }
    
    Write-Info "Script directory: $scriptDir"
    
    # Look for app folder in script directory
    $sourceBackend = Join-Path $scriptDir "app\backend"
    $sourceFrontend = Join-Path $scriptDir "app\frontend"
    
    # Copy backend
    Write-Info "Looking for backend at: $sourceBackend"
    if (Test-Path $sourceBackend) {
        Write-Info "Copying backend files..."
        Copy-Item -Path $sourceBackend -Destination $backendDest -Recurse -Force
        Write-Info "Backend copied to: $backendDest"
    } else {
        Write-Error "Backend source not found at: $sourceBackend"
        Write-Info "Please ensure the 'app\backend' folder exists in the installer directory"
        throw "Backend source not found"
    }
    
    # Copy frontend
    Write-Info "Looking for frontend at: $sourceFrontend"
    if (Test-Path $sourceFrontend) {
        Write-Info "Copying frontend files..."
        Copy-Item -Path $sourceFrontend -Destination $frontendDest -Recurse -Force
        Write-Info "Frontend copied to: $frontendDest"
    } else {
        Write-Error "Frontend source not found at: $sourceFrontend"
        Write-Info "Please ensure the 'app\frontend' folder exists in the installer directory"
        throw "Frontend source not found"
    }
    
    Write-Info "Application files copied successfully"
}

# =============================================================================
# STEP 4: Configure Application
# =============================================================================
function Set-ApplicationConfiguration {
    Write-Step "Configuring Application"
    
    $backendPath = Join-Path $Script:Config.InstallPath "backend"
    $frontendPath = Join-Path $Script:Config.InstallPath "frontend"
    
    # Create backend .env file
    Write-Info "Creating backend configuration..."
    $backendEnv = @"
# ScrapOS Backend Configuration
# Generated by Windows Installer

MONGO_URL=$($Script:Config.MongoDBUri)
DB_NAME=scrapos
JWT_SECRET=$(New-Guid)
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Company Settings
COMPANY_NAME=$($Script:Config.CompanyName)
DEFAULT_CURRENCY=AED

# Server Settings  
HOST=0.0.0.0
PORT=$($Script:Config.BackendPort)

# Trial License
INSTALL_DATE=$(Get-Date -Format "yyyy-MM-dd")
TRIAL_DAYS=30
"@
    Set-Content -Path (Join-Path $backendPath ".env") -Value $backendEnv
    
    # Create frontend .env file
    Write-Info "Creating frontend configuration..."
    $apiUrl = if ($Script:Config.UseIIS) { "http://localhost" } else { "http://localhost:$($Script:Config.FrontendPort)" }
    $frontendEnv = @"
REACT_APP_BACKEND_URL=$apiUrl
REACT_APP_COMPANY_NAME=$($Script:Config.CompanyName)
"@
    Set-Content -Path (Join-Path $frontendPath ".env") -Value $frontendEnv
    
    # Install Python dependencies
    Write-Info "Installing Python dependencies..."
    $requirementsPath = Join-Path $backendPath "requirements.txt"
    if (Test-Path $requirementsPath) {
        & python -m pip install --upgrade pip
        & python -m pip install -r $requirementsPath
    }
    
    # Install Node dependencies and build frontend
    Write-Info "Installing Node.js dependencies..."
    Push-Location $frontendPath
    & npm install
    Write-Info "Building frontend for production..."
    & npm run build
    Pop-Location
}

# =============================================================================
# STEP 5: Setup Windows Services
# =============================================================================
function Install-WindowsServices {
    Write-Step "Setting Up Windows Services"
    
    $backendPath = Join-Path $Script:Config.InstallPath "backend"
    
    # Create batch file to run backend
    $startScript = @"
@echo off
cd /d "$backendPath"
python -m uvicorn server:app --host 0.0.0.0 --port $($Script:Config.BackendPort)
"@
    $batchPath = Join-Path $Script:Config.InstallPath "start-backend.bat"
    Set-Content -Path $batchPath -Value $startScript
    
    # Remove existing service if exists
    $existingService = Get-Service -Name "ScrapOSBackend" -ErrorAction SilentlyContinue
    if ($existingService) {
        Write-Info "Removing existing ScrapOS Backend service..."
        & nssm stop ScrapOSBackend
        & nssm remove ScrapOSBackend confirm
    }
    
    # Install backend as Windows Service using NSSM
    Write-Info "Installing ScrapOS Backend as Windows Service..."
    & nssm install ScrapOSBackend $batchPath
    & nssm set ScrapOSBackend DisplayName "ScrapOS ERP Backend"
    & nssm set ScrapOSBackend Description "ScrapOS ERP Backend API Service"
    & nssm set ScrapOSBackend Start SERVICE_AUTO_START
    & nssm set ScrapOSBackend AppDirectory $backendPath
    & nssm set ScrapOSBackend AppStdout (Join-Path $Script:Config.InstallPath "logs\backend-out.log")
    & nssm set ScrapOSBackend AppStderr (Join-Path $Script:Config.InstallPath "logs\backend-err.log")
    
    # Create logs directory
    New-Item -ItemType Directory -Path (Join-Path $Script:Config.InstallPath "logs") -Force | Out-Null
    
    # Start the service
    Write-Info "Starting ScrapOS Backend service..."
    Start-Service ScrapOSBackend
}

# =============================================================================
# STEP 6: Configure IIS
# =============================================================================
function Set-IISConfiguration {
    if (-not $Script:Config.UseIIS) { return }
    
    Write-Step "Configuring IIS"
    
    Import-Module WebAdministration -ErrorAction SilentlyContinue
    
    $siteName = "ScrapOS"
    $frontendBuildPath = Join-Path $Script:Config.InstallPath "frontend\build"
    $appPoolName = "ScrapOSAppPool"
    
    # Create Application Pool
    Write-Info "Creating IIS Application Pool..."
    if (-not (Test-Path "IIS:\AppPools\$appPoolName")) {
        New-WebAppPool -Name $appPoolName
    }
    Set-ItemProperty "IIS:\AppPools\$appPoolName" -Name "managedRuntimeVersion" -Value ""
    
    # Remove default website binding on port 80 if exists
    $defaultSite = Get-Website -Name "Default Web Site" -ErrorAction SilentlyContinue
    if ($defaultSite) {
        Remove-WebBinding -Name "Default Web Site" -Port 80 -ErrorAction SilentlyContinue
    }
    
    # Create Website
    Write-Info "Creating IIS Website..."
    $existingSite = Get-Website -Name $siteName -ErrorAction SilentlyContinue
    if ($existingSite) {
        Remove-Website -Name $siteName
    }
    
    New-Website -Name $siteName `
        -PhysicalPath $frontendBuildPath `
        -ApplicationPool $appPoolName `
        -Port 80 `
        -Force
    
    # Configure URL Rewrite for API proxy
    Write-Info "Configuring reverse proxy for API..."
    
    $webConfigPath = Join-Path $frontendBuildPath "web.config"
    $webConfigContent = @"
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <system.webServer>
        <rewrite>
            <rules>
                <!-- API Reverse Proxy -->
                <rule name="API Proxy" stopProcessing="true">
                    <match url="^api/(.*)" />
                    <action type="Rewrite" url="http://localhost:$($Script:Config.BackendPort)/api/{R:1}" />
                </rule>
                
                <!-- React Router Support -->
                <rule name="React Routes" stopProcessing="true">
                    <match url=".*" />
                    <conditions logicalGrouping="MatchAll">
                        <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
                        <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
                    </conditions>
                    <action type="Rewrite" url="/index.html" />
                </rule>
            </rules>
        </rewrite>
        
        <staticContent>
            <mimeMap fileExtension=".json" mimeType="application/json" />
            <mimeMap fileExtension=".woff" mimeType="font/woff" />
            <mimeMap fileExtension=".woff2" mimeType="font/woff2" />
        </staticContent>
        
        <httpErrors errorMode="Custom" existingResponse="Replace">
            <remove statusCode="404" />
            <error statusCode="404" path="/index.html" responseMode="ExecuteURL" />
        </httpErrors>
    </system.webServer>
</configuration>
"@
    Set-Content -Path $webConfigPath -Value $webConfigContent
    
    # Enable ARR Proxy
    Write-Info "Enabling Application Request Routing..."
    Set-WebConfigurationProperty -PSPath 'MACHINE/WEBROOT/APPHOST' -Filter "system.webServer/proxy" -Name "enabled" -Value "True" -ErrorAction SilentlyContinue
    
    # Start the website
    Start-Website -Name $siteName
    
    Write-Info "IIS configured successfully"
}

# =============================================================================
# STEP 7: Seed Database
# =============================================================================
function Initialize-Database {
    Write-Step "Initializing Database"
    
    # Wait for backend to be ready
    Write-Info "Waiting for backend service to start..."
    $maxAttempts = 30
    $attempt = 0
    $backendUrl = "http://localhost:$($Script:Config.BackendPort)/api/health"
    
    do {
        $attempt++
        try {
            $response = Invoke-WebRequest -Uri $backendUrl -UseBasicParsing -TimeoutSec 5
            if ($response.StatusCode -eq 200) { break }
        } catch {
            Start-Sleep -Seconds 2
        }
    } while ($attempt -lt $maxAttempts)
    
    if ($attempt -ge $maxAttempts) {
        Write-Warning "Backend service not responding. You may need to seed the database manually."
        return
    }
    
    # Seed the database
    Write-Info "Seeding database with initial data..."
    try {
        $seedUrl = "http://localhost:$($Script:Config.BackendPort)/api/seed"
        Invoke-RestMethod -Uri $seedUrl -Method Post -TimeoutSec 60
        Write-Info "Database seeded successfully"
    } catch {
        Write-Warning "Could not seed database automatically: $_"
    }
}

# =============================================================================
# STEP 8: Create Shortcuts
# =============================================================================
function New-Shortcuts {
    Write-Step "Creating Shortcuts"
    
    $desktopPath = [Environment]::GetFolderPath("CommonDesktopDirectory")
    $startMenuPath = [Environment]::GetFolderPath("CommonStartMenu")
    
    # Create WScript Shell
    $shell = New-Object -ComObject WScript.Shell
    
    # Desktop shortcut to open app
    $shortcut = $shell.CreateShortcut("$desktopPath\ScrapOS ERP.lnk")
    $shortcut.TargetPath = "http://localhost"
    $shortcut.Description = "Open ScrapOS ERP"
    $shortcut.IconLocation = "shell32.dll,13"
    $shortcut.Save()
    
    # Start Menu folder
    $startMenuFolder = "$startMenuPath\Programs\ScrapOS"
    New-Item -ItemType Directory -Path $startMenuFolder -Force | Out-Null
    
    # Start Menu shortcuts
    $shortcut = $shell.CreateShortcut("$startMenuFolder\ScrapOS ERP.lnk")
    $shortcut.TargetPath = "http://localhost"
    $shortcut.Save()
    
    $shortcut = $shell.CreateShortcut("$startMenuFolder\ScrapOS Logs.lnk")
    $shortcut.TargetPath = Join-Path $Script:Config.InstallPath "logs"
    $shortcut.Save()
    
    Write-Info "Shortcuts created on Desktop and Start Menu"
}

# =============================================================================
# STEP 9: Generate Trial License
# =============================================================================
function New-TrialLicense {
    Write-Step "Generating Trial License"
    
    $licensePath = Join-Path $Script:Config.InstallPath "license.json"
    $installDate = Get-Date
    $expiryDate = $installDate.AddDays(30)
    
    # Get hardware ID (based on machine GUID)
    $machineGuid = (Get-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Cryptography" -Name "MachineGuid").MachineGuid
    
    $license = @{
        type = "trial"
        installDate = $installDate.ToString("yyyy-MM-dd")
        expiryDate = $expiryDate.ToString("yyyy-MM-dd")
        daysRemaining = 30
        machineId = $machineGuid
        companyName = $Script:Config.CompanyName
        features = @("full")
    }
    
    $license | ConvertTo-Json | Set-Content -Path $licensePath
    
    Write-Info "Trial license generated (valid for 30 days)"
    Write-Info "Expires: $($expiryDate.ToString('MMMM dd, yyyy'))"
}

# =============================================================================
# STEP 10: Display Summary
# =============================================================================
function Show-InstallationSummary {
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Green
    Write-Host "  Installation Complete!" -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Access your ScrapOS ERP at:" -ForegroundColor Cyan
    Write-Host "  URL: http://localhost" -ForegroundColor White
    Write-Host ""
    Write-Host "Login Credentials:" -ForegroundColor Cyan
    Write-Host "  Email: $($Script:Config.AdminEmail)" -ForegroundColor White
    Write-Host "  Password: (as configured)" -ForegroundColor White
    Write-Host ""
    Write-Host "Installation Details:" -ForegroundColor Cyan
    Write-Host "  Install Path: $($Script:Config.InstallPath)" -ForegroundColor White
    Write-Host "  Backend Port: $($Script:Config.BackendPort)" -ForegroundColor White
    Write-Host "  MongoDB: $($Script:Config.MongoDBUri)" -ForegroundColor White
    Write-Host ""
    Write-Host "Services:" -ForegroundColor Cyan
    Write-Host "  - ScrapOSBackend (Windows Service)" -ForegroundColor White
    Write-Host "  - ScrapOS (IIS Website)" -ForegroundColor White
    Write-Host "  - MongoDB (Windows Service)" -ForegroundColor White
    Write-Host ""
    Write-Host "Trial License:" -ForegroundColor Yellow
    Write-Host "  30 days remaining" -ForegroundColor White
    Write-Host "  Contact sales@scrapos.ae to purchase full license" -ForegroundColor White
    Write-Host ""
    Write-Host "Documentation: $($Script:Config.InstallPath)\docs" -ForegroundColor Cyan
    Write-Host ""
    
    # Open browser
    $openBrowser = Read-Host "Open ScrapOS in browser now? (Y/n)"
    if ($openBrowser -ne "n" -and $openBrowser -ne "N") {
        Start-Process "http://localhost"
    }
}

# =============================================================================
# MAIN INSTALLATION FLOW
# =============================================================================
try {
    Show-ConfigurationWizard
    
    if (-not $SkipDependencies) {
        Install-Dependencies
    }
    
    Copy-ApplicationFiles
    Set-ApplicationConfiguration
    Install-WindowsServices
    Set-IISConfiguration
    Initialize-Database
    New-Shortcuts
    New-TrialLicense
    Show-InstallationSummary
    
} catch {
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Red
    Write-Host "  Installation Failed!" -ForegroundColor Red
    Write-Host "============================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please check the logs and try again." -ForegroundColor Yellow
    Write-Host "For support, contact: support@scrapos.ae" -ForegroundColor Yellow
    exit 1
}
