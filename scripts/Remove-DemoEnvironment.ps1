<#
.SYNOPSIS
    Removes all demo environment objects from Entra ID and Azure.

.DESCRIPTION
    Cleans up all resources created by Setup-DemoEnvironment.ps1:
    - Administrative Unit (SAM-Demo-Students) and all its members
    - Demo student user accounts
    - Demo teacher user accounts
    - Demo IT staff user accounts
    - All demo security groups
    - App Registrations (automation + portal, optional)
    - Azure Resource Group (optional)

.PARAMETER RemoveAppRegistration
    Also remove the App Registrations. Default: $false (keeps them for re-use).

.PARAMETER RemoveAzureResources
    Also remove the Azure Resource Group. Default: $false.

.PARAMETER Force
    Skip confirmation prompts.

.EXAMPLE
    .\Remove-DemoEnvironment.ps1
    Removes demo users, groups, and Administrative Unit.

.EXAMPLE
    .\Remove-DemoEnvironment.ps1 -RemoveAppRegistration -RemoveAzureResources -Force
    Full cleanup without prompts.

.NOTES
    Author: Uy Le Phan (Atea AS)
    Tenant: ateara.onmicrosoft.com
#>

[CmdletBinding()]
param(
    [switch]$RemoveAppRegistration,
    [switch]$RemoveAzureResources,
    [switch]$Force,
    [string]$ResourceGroupName = "rg-studentaccess-demo"
)

$Domain = "ateara.onmicrosoft.com"

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════════════╗" -ForegroundColor Red
Write-Host "║   🗑️  Student Time Management - Demo Environment CLEANUP         ║" -ForegroundColor Red
Write-Host "║   Tenant: $Domain                          ║" -ForegroundColor Red
Write-Host "╚═══════════════════════════════════════════════════════════════════╝" -ForegroundColor Red
Write-Host ""

if (-not $Force) {
    $confirm = Read-Host "⚠️  This will DELETE all demo users, groups, AU, and data. Continue? (y/N)"
    if ($confirm -ne 'y') {
        Write-Host "Cancelled." -ForegroundColor Yellow
        return
    }
}

# Connect
$context = Get-MgContext
if (-not $context) {
    Connect-MgGraph -Scopes "User.ReadWrite.All", "Group.ReadWrite.All", "Application.ReadWrite.All", "AdministrativeUnit.ReadWrite.All" -NoWelcome
}

# Groups to remove
$groupNames = @(
    "Demo-Students-8A",
    "Demo-Students-9B",
    "Demo-Students-10A",
    "Demo-Students-10B",
    "Demo-AllStudents",
    "Demo-AfterSchool-Program",
    "Demo-Exam-Extended",
    "Demo-Portal-Staff"
)

# Remove groups
Write-Host "━━━ Removing Demo Groups ━━━" -ForegroundColor Red
foreach ($name in $groupNames) {
    $group = Get-MgGroup -Filter "displayName eq '$name'" -ErrorAction SilentlyContinue
    if ($group) {
        Remove-MgGroup -GroupId $group.Id -ErrorAction SilentlyContinue
        Write-Host "   🗑️  Removed group: $name" -ForegroundColor Yellow
    }
}
Write-Host ""

# Remove demo users (by department or job title)
Write-Host "━━━ Removing Demo Users ━━━" -ForegroundColor Red

# Students
$students = Get-MgUser -Filter "companyName eq 'Bergan International School (Demo)' and jobTitle eq 'Student'" -All -ErrorAction SilentlyContinue
foreach ($user in $students) {
    Remove-MgUser -UserId $user.Id -ErrorAction SilentlyContinue
    Write-Host "   🗑️  Removed student: $($user.DisplayName) ($($user.UserPrincipalName))" -ForegroundColor Yellow
}

# Teachers
$teachers = Get-MgUser -Filter "companyName eq 'Bergan International School (Demo)' and department eq 'Faculty'" -All -ErrorAction SilentlyContinue
foreach ($user in $teachers) {
    Remove-MgUser -UserId $user.Id -ErrorAction SilentlyContinue
    Write-Host "   🗑️  Removed teacher: $($user.DisplayName) ($($user.UserPrincipalName))" -ForegroundColor Yellow
}

# IT Staff
$itstaff = Get-MgUser -Filter "companyName eq 'Bergan International School (Demo)' and department eq 'IT'" -All -ErrorAction SilentlyContinue
foreach ($user in $itstaff) {
    Remove-MgUser -UserId $user.Id -ErrorAction SilentlyContinue
    Write-Host "   🗑️  Removed IT staff: $($user.DisplayName) ($($user.UserPrincipalName))" -ForegroundColor Yellow
}
Write-Host ""

# Remove App Registration
if ($RemoveAppRegistration) {
    Write-Host "━━━ Removing App Registrations ━━━" -ForegroundColor Red
    $app = Get-MgApplication -Filter "displayName eq 'StudentAccess-Demo-Automation'" -ErrorAction SilentlyContinue
    if ($app) {
        Remove-MgApplication -ApplicationId $app.Id -ErrorAction SilentlyContinue
        Write-Host "   🗑️  Removed App Registration: StudentAccess-Demo-Automation" -ForegroundColor Yellow
    }
    $portalApp = Get-MgApplication -Filter "displayName eq 'SAM-Portal'" -ErrorAction SilentlyContinue
    if ($portalApp) {
        Remove-MgApplication -ApplicationId $portalApp.Id -ErrorAction SilentlyContinue
        Write-Host "   🗑️  Removed App Registration: SAM-Portal" -ForegroundColor Yellow
    }
    Write-Host ""
}

# Remove Administrative Unit
Write-Host "━━━ Removing Administrative Unit ━━━" -ForegroundColor Red
$au = Get-MgDirectoryAdministrativeUnit -Filter "displayName eq 'SAM-Demo-Students'" -ErrorAction SilentlyContinue
if ($au) {
    Remove-MgDirectoryAdministrativeUnit -AdministrativeUnitId $au.Id -ErrorAction SilentlyContinue
    Write-Host "   🗑️  Removed Administrative Unit: SAM-Demo-Students ($($au.Id))" -ForegroundColor Yellow
} else {
    Write-Host "   ⏭️  No Administrative Unit found" -ForegroundColor Gray
}
Write-Host ""

# Remove Azure resources
if ($RemoveAzureResources) {
    Write-Host "━━━ Removing Azure Resources ━━━" -ForegroundColor Red
    try {
        $azContext = Get-AzContext -ErrorAction SilentlyContinue
        if (-not $azContext) {
            Connect-AzAccount
        }
        Remove-AzResourceGroup -Name $ResourceGroupName -Force -ErrorAction SilentlyContinue
        Write-Host "   🗑️  Removed Resource Group: $ResourceGroupName" -ForegroundColor Yellow
    }
    catch {
        Write-Host "   ⚠️  Could not remove Azure resources: $($_.Exception.Message)" -ForegroundColor Yellow
    }
    Write-Host ""
}

Write-Host ""
Write-Host "✅ Demo environment cleanup complete!" -ForegroundColor Green
Write-Host ""
