<#
.SYNOPSIS
    Quick Start Script for ScrapOS Windows Installer
.DESCRIPTION
    This is the entry point script. Double-click to start installation.
#>

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ScrapOS ERP Installer requires Administrator privileges." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please right-click and select 'Run as Administrator'" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Or run this command in an elevated PowerShell:" -ForegroundColor Gray
    Write-Host "  Set-ExecutionPolicy Bypass -Scope Process -Force; .\install.ps1" -ForegroundColor White
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit
}

# Set execution policy for this session
Set-ExecutionPolicy Bypass -Scope Process -Force

# Run the main installer
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
& "$scriptPath\install.ps1"
