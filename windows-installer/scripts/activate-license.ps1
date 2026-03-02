<#
.SYNOPSIS
    ScrapOS License Activation Script
.DESCRIPTION
    Activates a full ScrapOS license
.PARAMETER Key
    The license key to activate
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$Key
)

$ErrorActionPreference = "Stop"
$LicensePath = "C:\ScrapOS\license.json"

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "  ScrapOS License Activation" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Validate key format
if ($Key -notmatch "^SCRAP-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$") {
    Write-Host "ERROR: Invalid license key format!" -ForegroundColor Red
    Write-Host "Expected format: SCRAP-XXXX-XXXX-XXXX-XXXX" -ForegroundColor Yellow
    exit 1
}

Write-Host "License Key: $Key" -ForegroundColor White
Write-Host ""

# Get machine ID
$machineGuid = (Get-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Cryptography" -Name "MachineGuid").MachineGuid
Write-Host "Machine ID: $machineGuid" -ForegroundColor Gray

# Read existing license
$existingLicense = $null
if (Test-Path $LicensePath) {
    $existingLicense = Get-Content $LicensePath | ConvertFrom-Json
}

# Create new license
$activationDate = Get-Date
$expiryDate = $activationDate.AddYears(1)

$license = @{
    type = "full"
    licenseKey = $Key
    activatedDate = $activationDate.ToString("yyyy-MM-dd")
    expiryDate = $expiryDate.ToString("yyyy-MM-dd")
    machineId = $machineGuid
    companyName = if ($existingLicense) { $existingLicense.companyName } else { "Licensed User" }
    features = @("full", "support", "updates")
    users = "unlimited"
}

# Online validation (if available)
Write-Host ""
Write-Host "Validating license..." -ForegroundColor Yellow

try {
    # In production, this would validate against a license server
    # For now, we'll do basic validation
    $isValid = $Key.StartsWith("SCRAP-")
    
    if ($isValid) {
        Write-Host "License validated successfully!" -ForegroundColor Green
    } else {
        Write-Host "License validation failed!" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Warning: Could not connect to license server. Proceeding with offline activation." -ForegroundColor Yellow
}

# Save license file
$license | ConvertTo-Json | Set-Content -Path $LicensePath

Write-Host ""
Write-Host "================================" -ForegroundColor Green
Write-Host "  License Activated!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""
Write-Host "Company: $($license.companyName)" -ForegroundColor White
Write-Host "Valid until: $($license.expiryDate)" -ForegroundColor White
Write-Host "Features: $($license.features -join ', ')" -ForegroundColor White
Write-Host ""

# Restart services to apply
$restart = Read-Host "Restart ScrapOS services now? (Y/n)"
if ($restart -ne "n" -and $restart -ne "N") {
    Write-Host "Restarting services..."
    Restart-Service ScrapOSBackend -ErrorAction SilentlyContinue
    iisreset /restart
    Write-Host "Services restarted!" -ForegroundColor Green
}

Write-Host ""
Write-Host "Thank you for purchasing ScrapOS!" -ForegroundColor Cyan
