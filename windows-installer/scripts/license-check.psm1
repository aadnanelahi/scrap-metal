<#
.SYNOPSIS
    ScrapOS License Check Module
.DESCRIPTION
    Functions to check and validate ScrapOS license
#>

function Get-ScrapOSLicense {
    $LicensePath = "C:\ScrapOS\license.json"
    
    if (-not (Test-Path $LicensePath)) {
        return @{
            valid = $false
            message = "License file not found"
        }
    }
    
    try {
        $license = Get-Content $LicensePath | ConvertFrom-Json
        
        # Check machine ID
        $machineGuid = (Get-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Cryptography" -Name "MachineGuid").MachineGuid
        if ($license.machineId -ne $machineGuid) {
            return @{
                valid = $false
                message = "License not valid for this machine"
            }
        }
        
        # Check expiry
        $expiryDate = [DateTime]::ParseExact($license.expiryDate, "yyyy-MM-dd", $null)
        $today = Get-Date
        
        if ($today -gt $expiryDate) {
            $daysPast = ($today - $expiryDate).Days
            return @{
                valid = $false
                expired = $true
                daysPast = $daysPast
                message = "License expired $daysPast days ago"
                license = $license
            }
        }
        
        $daysRemaining = ($expiryDate - $today).Days
        
        return @{
            valid = $true
            type = $license.type
            daysRemaining = $daysRemaining
            expiryDate = $license.expiryDate
            companyName = $license.companyName
            features = $license.features
            message = "License valid"
            license = $license
        }
        
    } catch {
        return @{
            valid = $false
            message = "Error reading license: $_"
        }
    }
}

function Test-ScrapOSLicense {
    $result = Get-ScrapOSLicense
    
    if ($result.valid) {
        Write-Host "License Status: VALID" -ForegroundColor Green
        Write-Host "Type: $($result.type)"
        Write-Host "Company: $($result.companyName)"
        Write-Host "Days Remaining: $($result.daysRemaining)"
        Write-Host "Expires: $($result.expiryDate)"
        
        if ($result.daysRemaining -le 30) {
            Write-Host ""
            Write-Host "WARNING: License expires in $($result.daysRemaining) days!" -ForegroundColor Yellow
        }
    } else {
        Write-Host "License Status: INVALID" -ForegroundColor Red
        Write-Host "Reason: $($result.message)"
        
        if ($result.expired) {
            Write-Host ""
            Write-Host "Your license has expired. Please renew at:" -ForegroundColor Yellow
            Write-Host "https://scrapos.ae/renew" -ForegroundColor Cyan
        }
    }
    
    return $result.valid
}

# Export functions
Export-ModuleMember -Function Get-ScrapOSLicense, Test-ScrapOSLicense
