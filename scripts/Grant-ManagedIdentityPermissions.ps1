<#
.SYNOPSIS
    Grants Microsoft Graph API permissions to the App Service Managed Identity.

.DESCRIPTION
    After enabling System Assigned Managed Identity on the App Service,
    this script grants the required Microsoft Graph application permissions.
    
    This eliminates the need for client secrets for Graph API calls — the
    App Service authenticates using its Managed Identity automatically.

.PARAMETER AppServiceName
    The name of the Azure App Service (e.g., app-atea-sam-portal).

.PARAMETER ResourceGroupName
    The resource group containing the App Service.

.EXAMPLE
    .\Grant-ManagedIdentityPermissions.ps1 -AppServiceName "app-atea-sam-portal" -ResourceGroupName "rg-student-access-automation"

.NOTES
    Requires: Microsoft.Graph PowerShell module
    Permissions: Global Administrator or Privileged Role Administrator
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [string]$AppServiceName = "app-atea-sam-portal",

    [Parameter(Mandatory = $false)]
    [string]$ResourceGroupName = "rg-student-access-automation"
)

$ErrorActionPreference = "Stop"

# ═══════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════

# Microsoft Graph API permissions needed by the portal
# These are Application permissions (not delegated)
$RequiredPermissions = @(
    "User.ReadWrite.All",      # Read/write users (enable/disable accounts, create users)
    "Group.ReadWrite.All",     # Read/write groups (manage memberships)
    "Directory.Read.All",      # Read directory data (list users, groups, licenses)
    "Organization.Read.All",   # Read organization info (subscribed SKUs/licenses)
    "Mail.Send"                # Send mail (optional: email forwarding notifications)
)

# Microsoft Graph service principal well-known App ID
$GraphAppId = "00000003-0000-0000-c000-000000000000"

# ═══════════════════════════════════════════════════════════════════════════
# EXECUTION
# ═══════════════════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Grant Managed Identity Permissions - Microsoft Graph     ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Step 1: Connect to Microsoft Graph
Write-Host "📡 Connecting to Microsoft Graph..." -ForegroundColor Yellow
try {
    $context = Get-MgContext
    if (-not $context) {
        Connect-MgGraph -Scopes "Application.ReadWrite.All", "AppRoleAssignment.ReadWrite.All" -NoWelcome
    }
    $context = Get-MgContext
    Write-Host "   ✅ Connected as: $($context.Account)" -ForegroundColor Green
}
catch {
    Write-Error "Failed to connect to Microsoft Graph: $_"
    exit 1
}

# Step 2: Get the Managed Identity service principal
Write-Host ""
Write-Host "🔍 Looking up Managed Identity for '$AppServiceName'..." -ForegroundColor Yellow

# Get the App Service's Managed Identity principal ID via Azure CLI
try {
    $miPrincipalId = az webapp identity show `
        --resource-group $ResourceGroupName `
        --name $AppServiceName `
        --query principalId -o tsv 2>$null

    if (-not $miPrincipalId) {
        Write-Error "App Service '$AppServiceName' does not have a System Assigned Managed Identity enabled."
        Write-Host "   Enable it first: az webapp identity assign --resource-group $ResourceGroupName --name $AppServiceName" -ForegroundColor Yellow
        exit 1
    }
    Write-Host "   ✅ Managed Identity Principal ID: $miPrincipalId" -ForegroundColor Green
}
catch {
    Write-Error "Failed to get Managed Identity: $_"
    exit 1
}

# Step 3: Get the Microsoft Graph service principal
Write-Host ""
Write-Host "🔍 Looking up Microsoft Graph service principal..." -ForegroundColor Yellow
$graphSp = Get-MgServicePrincipal -Filter "appId eq '$GraphAppId'"
if (-not $graphSp) {
    Write-Error "Microsoft Graph service principal not found in tenant."
    exit 1
}
Write-Host "   ✅ Graph SP ID: $($graphSp.Id)" -ForegroundColor Green

# Step 4: Get the Managed Identity service principal
$miSp = Get-MgServicePrincipal -Filter "id eq '$miPrincipalId'" -ErrorAction SilentlyContinue
if (-not $miSp) {
    # Try by displayName
    $miSp = Get-MgServicePrincipal -Filter "displayName eq '$AppServiceName'" | Where-Object { $_.ServicePrincipalType -eq "ManagedIdentity" }
}
if (-not $miSp) {
    Write-Error "Could not find service principal for Managed Identity ($miPrincipalId)"
    exit 1
}
Write-Host "   ✅ MI Service Principal: $($miSp.DisplayName) ($($miSp.Id))" -ForegroundColor Green

# Step 5: Get existing role assignments
Write-Host ""
Write-Host "📋 Checking existing role assignments..." -ForegroundColor Yellow
$existingAssignments = Get-MgServicePrincipalAppRoleAssignment -ServicePrincipalId $miSp.Id
$existingRoleIds = $existingAssignments | ForEach-Object { $_.AppRoleId }

# Step 6: Grant each required permission
Write-Host ""
Write-Host "🔐 Granting Graph API permissions..." -ForegroundColor Yellow
$granted = 0
$skipped = 0

foreach ($permName in $RequiredPermissions) {
    # Find the app role in Microsoft Graph
    $appRole = $graphSp.AppRoles | Where-Object { $_.Value -eq $permName -and $_.AllowedMemberTypes -contains "Application" }
    
    if (-not $appRole) {
        Write-Host "   ⚠️  Permission '$permName' not found in Graph API" -ForegroundColor Yellow
        continue
    }

    if ($existingRoleIds -contains $appRole.Id) {
        Write-Host "   ⏭️  $permName — already granted" -ForegroundColor DarkGray
        $skipped++
        continue
    }

    try {
        $body = @{
            principalId = $miSp.Id
            resourceId  = $graphSp.Id
            appRoleId   = $appRole.Id
        }
        New-MgServicePrincipalAppRoleAssignment -ServicePrincipalId $miSp.Id -BodyParameter $body | Out-Null
        Write-Host "   ✅ $permName — granted" -ForegroundColor Green
        $granted++
    }
    catch {
        Write-Host "   ❌ $permName — failed: $_" -ForegroundColor Red
    }
}

# Step 7: Summary
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Summary:" -ForegroundColor Cyan
Write-Host "    Granted: $granted new permission(s)" -ForegroundColor Green
Write-Host "    Skipped: $skipped already assigned" -ForegroundColor DarkGray
Write-Host "    App Service: $AppServiceName" -ForegroundColor White
Write-Host "    MI Principal: $miPrincipalId" -ForegroundColor White
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

if ($granted -gt 0) {
    Write-Host "⚡ Permissions granted! The Managed Identity can now call Microsoft Graph." -ForegroundColor Green
    Write-Host "   Set USE_MANAGED_IDENTITY=true on the App Service to activate." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   To set it now:" -ForegroundColor White
    Write-Host "   az webapp config appsettings set --resource-group $ResourceGroupName --name $AppServiceName --settings USE_MANAGED_IDENTITY=true GROUP_NAME_PREFIX=Demo-" -ForegroundColor DarkGray
}
else {
    Write-Host "✅ All permissions were already in place." -ForegroundColor Green
}
Write-Host ""
