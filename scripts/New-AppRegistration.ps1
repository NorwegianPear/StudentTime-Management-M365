<#
.SYNOPSIS
    Creates an App Registration in Entra ID for Student Access Automation.

.DESCRIPTION
    This script creates an App Registration with the required Microsoft Graph
    API permissions for managing student accounts.

.PARAMETER AppName
    Name for the App Registration. Default: "Student-Access-Automation"

.EXAMPLE
    .\New-AppRegistration.ps1 -AppName "Student-Access-Automation"

.NOTES
    Author: IT Admin
    Version: 1.0
    Requires: Microsoft.Graph.Applications module
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [string]$AppName = "Student-Access-Automation"
)

# Import required modules
$requiredModules = @('Microsoft.Graph.Applications', 'Microsoft.Graph.Authentication')
foreach ($module in $requiredModules) {
    if (-not (Get-Module -ListAvailable -Name $module)) {
        Write-Host "Installing module: $module" -ForegroundColor Yellow
        Install-Module -Name $module -Force -AllowClobber -Scope CurrentUser
    }
    Import-Module $module
}

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "App Registration Setup" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Connect to Microsoft Graph with required scopes
Write-Host "Connecting to Microsoft Graph..." -ForegroundColor Yellow
Connect-MgGraph -Scopes "Application.ReadWrite.All", "AppRoleAssignment.ReadWrite.All" -NoWelcome

# Get Microsoft Graph Service Principal for permission IDs
$graphSP = Get-MgServicePrincipal -Filter "displayName eq 'Microsoft Graph'" | Select-Object -First 1

if (-not $graphSP) {
    Write-Error "Could not find Microsoft Graph Service Principal"
    exit 1
}

# Define required permissions (Application permissions)
$requiredPermissions = @(
    "User.ReadWrite.All",      # Enable/disable accounts
    "Group.Read.All",          # Read group membership
    "Directory.Read.All"       # Read directory data
)

# Get permission IDs
$resourceAccess = @()
foreach ($permission in $requiredPermissions) {
    $appRole = $graphSP.AppRoles | Where-Object { $_.Value -eq $permission }
    if ($appRole) {
        $resourceAccess += @{
            Id = $appRole.Id
            Type = "Role"  # Application permission
        }
        Write-Host "  Found permission: $permission ($($appRole.Id))" -ForegroundColor Gray
    }
    else {
        Write-Warning "Could not find permission: $permission"
    }
}

# Create the App Registration
Write-Host ""
Write-Host "Creating App Registration: $AppName" -ForegroundColor Yellow

$appParams = @{
    DisplayName = $AppName
    SignInAudience = "AzureADMyOrg"
    RequiredResourceAccess = @(
        @{
            ResourceAppId = "00000003-0000-0000-c000-000000000000"  # Microsoft Graph
            ResourceAccess = $resourceAccess
        }
    )
}

$app = New-MgApplication @appParams

Write-Host "  Application ID: $($app.AppId)" -ForegroundColor Green
Write-Host "  Object ID: $($app.Id)" -ForegroundColor Green

# Create a client secret
Write-Host ""
Write-Host "Creating Client Secret..." -ForegroundColor Yellow

$secretParams = @{
    PasswordCredential = @{
        DisplayName = "Automation-Secret"
        EndDateTime = (Get-Date).AddYears(2)
    }
}

$secret = Add-MgApplicationPassword -ApplicationId $app.Id -BodyParameter $secretParams

Write-Host "  Secret created (expires: $($secret.EndDateTime))" -ForegroundColor Green

# Create Service Principal for the app
Write-Host ""
Write-Host "Creating Service Principal..." -ForegroundColor Yellow

$sp = New-MgServicePrincipal -AppId $app.AppId

# Grant admin consent for permissions
Write-Host ""
Write-Host "Granting Admin Consent for Permissions..." -ForegroundColor Yellow

foreach ($permission in $requiredPermissions) {
    $appRole = $graphSP.AppRoles | Where-Object { $_.Value -eq $permission }
    if ($appRole) {
        try {
            New-MgServicePrincipalAppRoleAssignment `
                -ServicePrincipalId $sp.Id `
                -PrincipalId $sp.Id `
                -ResourceId $graphSP.Id `
                -AppRoleId $appRole.Id | Out-Null
            Write-Host "  Granted: $permission" -ForegroundColor Green
        }
        catch {
            Write-Warning "  Could not grant $permission : $($_.Exception.Message)"
        }
    }
}

# Output configuration
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "App Registration Complete!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Copy these values to your config.json:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  TenantId:     $((Get-MgContext).TenantId)" -ForegroundColor Cyan
Write-Host "  ClientId:     $($app.AppId)" -ForegroundColor Cyan
Write-Host "  ClientSecret: $($secret.SecretText)" -ForegroundColor Cyan
Write-Host ""
Write-Host "IMPORTANT: Save the ClientSecret now! It will not be shown again." -ForegroundColor Red
Write-Host ""

# Disconnect
Disconnect-MgGraph

# Return values for automation
return @{
    TenantId = (Get-MgContext).TenantId
    ClientId = $app.AppId
    ClientSecret = $secret.SecretText
    ObjectId = $app.Id
}
