<#
.SYNOPSIS
    Deploys Student Access Automation directly to Azure without GitHub.

.DESCRIPTION
    This script deploys the complete solution to Azure using credentials
    stored securely in the local Windows Credential Manager.

.PARAMETER UseSecureCredentials
    Use credentials from local secure storage instead of config file.

.EXAMPLE
    .\Deploy-ToAzureDirect.ps1 -UseSecureCredentials

.NOTES
    Author: IT Admin
    Version: 1.0
#>

[CmdletBinding()]
param(
    [switch]$UseSecureCredentials
)

$ErrorActionPreference = "Stop"
$script:ProjectRoot = Split-Path $PSScriptRoot -Parent

# Import credential manager
Import-Module (Join-Path $PSScriptRoot "SecureCredentialManager.psm1") -Force

Write-Host ""
Write-Host "  ╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "  ║        DEPLOY TO AZURE (Direct - No GitHub Required)          ║" -ForegroundColor Cyan
Write-Host "  ╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Get credentials
if ($UseSecureCredentials) {
    Write-Host "  Loading credentials from secure local storage..." -ForegroundColor Yellow
    
    if (-not (Test-CredentialsExist)) {
        Write-Host "  [ERROR] Missing required credentials. Please run credential setup first." -ForegroundColor Red
        exit 1
    }
    
    $creds = Get-CredentialsAsHashtable
    $TenantId = $creds.TenantId
    $ClientId = $creds.ClientId
    $ClientSecret = $creds.ClientSecret
    $StudentGroupId = $creds.StudentGroupId
    $SubscriptionId = $creds.SubscriptionId
}
else {
    # Fall back to config file
    $configPath = Join-Path $script:ProjectRoot "config\config.json"
    if (-not (Test-Path $configPath)) {
        Write-Host "  [ERROR] Configuration file not found and -UseSecureCredentials not specified." -ForegroundColor Red
        exit 1
    }
    $config = Get-Content $configPath | ConvertFrom-Json
    $TenantId = $config.TenantId
    $ClientId = $config.ClientId
    $ClientSecret = $config.ClientSecret
    $StudentGroupId = $config.StudentGroupId
}

# Configuration
$ResourceGroupName = "rg-student-access-automation"
$Location = "westeurope"
$AutomationAccountName = "StudentAccessAutomation"
$EnableTime = "07:55"
$DisableTime = "16:05"
$TimeZone = "W. Europe Standard Time"

Write-Host "  [✓] Credentials loaded" -ForegroundColor Green
Write-Host ""

# Import Azure modules
Write-Host "  Checking Azure modules..." -ForegroundColor Yellow
$azModules = @('Az.Accounts', 'Az.Automation', 'Az.Resources')
foreach ($module in $azModules) {
    if (-not (Get-Module -ListAvailable -Name $module)) {
        Write-Host "    Installing $module..." -ForegroundColor Gray
        Install-Module -Name $module -Force -AllowClobber -Scope CurrentUser
    }
    Import-Module $module -ErrorAction SilentlyContinue
}
Write-Host "  [✓] Azure modules ready" -ForegroundColor Green
Write-Host ""

# Connect to Azure
Write-Host "  Connecting to Azure..." -ForegroundColor Yellow
if ($SubscriptionId) {
    Connect-AzAccount -TenantId $TenantId -Subscription $SubscriptionId
}
else {
    Connect-AzAccount -TenantId $TenantId
}

$context = Get-AzContext
Write-Host "  [✓] Connected to: $($context.Subscription.Name)" -ForegroundColor Green
Write-Host ""

# Create Resource Group
Write-Host "  Creating Resource Group: $ResourceGroupName" -ForegroundColor Yellow
New-AzResourceGroup -Name $ResourceGroupName -Location $Location -Force | Out-Null
Write-Host "  [✓] Resource Group created" -ForegroundColor Green

# Create Automation Account
Write-Host "  Creating Automation Account: $AutomationAccountName" -ForegroundColor Yellow
$automationAccount = Get-AzAutomationAccount -ResourceGroupName $ResourceGroupName -Name $AutomationAccountName -ErrorAction SilentlyContinue
if (-not $automationAccount) {
    New-AzAutomationAccount -ResourceGroupName $ResourceGroupName -Name $AutomationAccountName -Location $Location -Plan Basic | Out-Null
}
Write-Host "  [✓] Automation Account created" -ForegroundColor Green

# Add PowerShell Modules
Write-Host "  Adding PowerShell modules (this may take 5-10 minutes)..." -ForegroundColor Yellow
$graphModules = @(
    'Microsoft.Graph.Authentication',
    'Microsoft.Graph.Users',
    'Microsoft.Graph.Groups'
)

foreach ($moduleName in $graphModules) {
    Write-Host "    Adding: $moduleName" -ForegroundColor Gray
    $existingModule = Get-AzAutomationModule -ResourceGroupName $ResourceGroupName -AutomationAccountName $AutomationAccountName -Name $moduleName -ErrorAction SilentlyContinue
    if (-not $existingModule) {
        $moduleUri = "https://www.powershellgallery.com/api/v2/package/$moduleName"
        New-AzAutomationModule -ResourceGroupName $ResourceGroupName -AutomationAccountName $AutomationAccountName -Name $moduleName -ContentLinkUri $moduleUri | Out-Null
    }
}
Write-Host "  [✓] Modules added (importing in background)" -ForegroundColor Green

# Create Variables
Write-Host "  Creating Automation Variables..." -ForegroundColor Yellow

$variables = @{
    'TenantId' = @{ Value = $TenantId; Encrypted = $false }
    'ClientId' = @{ Value = $ClientId; Encrypted = $false }
    'ClientSecret' = @{ Value = $ClientSecret; Encrypted = $true }
    'StudentGroupId' = @{ Value = $StudentGroupId; Encrypted = $false }
    'RevokeTokens' = @{ Value = 'true'; Encrypted = $false }
}

foreach ($varName in $variables.Keys) {
    $var = $variables[$varName]
    $existingVar = Get-AzAutomationVariable -ResourceGroupName $ResourceGroupName -AutomationAccountName $AutomationAccountName -Name $varName -ErrorAction SilentlyContinue
    if ($existingVar) {
        Set-AzAutomationVariable -ResourceGroupName $ResourceGroupName -AutomationAccountName $AutomationAccountName -Name $varName -Value $var.Value -Encrypted $var.Encrypted | Out-Null
    }
    else {
        New-AzAutomationVariable -ResourceGroupName $ResourceGroupName -AutomationAccountName $AutomationAccountName -Name $varName -Value $var.Value -Encrypted $var.Encrypted | Out-Null
    }
    $encryptedText = if ($var.Encrypted) { "(encrypted)" } else { "" }
    Write-Host "    [✓] $varName $encryptedText" -ForegroundColor Gray
}
Write-Host "  [✓] Variables created" -ForegroundColor Green

# Import Runbooks
Write-Host "  Importing Runbooks..." -ForegroundColor Yellow
$runbooksPath = Join-Path $script:ProjectRoot "runbooks"
$runbooks = @(
    @{ Name = 'Enable-StudentAccess'; File = 'Enable-StudentAccess.ps1' },
    @{ Name = 'Disable-StudentAccess'; File = 'Disable-StudentAccess.ps1' },
    @{ Name = 'Get-StudentAccessStatus'; File = 'Get-StudentAccessStatus.ps1' }
)

foreach ($runbook in $runbooks) {
    $runbookPath = Join-Path $runbooksPath $runbook.File
    Write-Host "    Importing: $($runbook.Name)" -ForegroundColor Gray
    
    Import-AzAutomationRunbook -ResourceGroupName $ResourceGroupName -AutomationAccountName $AutomationAccountName -Name $runbook.Name -Path $runbookPath -Type PowerShell -Force | Out-Null
    Publish-AzAutomationRunbook -ResourceGroupName $ResourceGroupName -AutomationAccountName $AutomationAccountName -Name $runbook.Name | Out-Null
}
Write-Host "  [✓] Runbooks imported and published" -ForegroundColor Green

# Create Schedules
Write-Host "  Creating Schedules..." -ForegroundColor Yellow

# Parse times
$enableHour = [int]$EnableTime.Split(':')[0]
$enableMinute = [int]$EnableTime.Split(':')[1]
$disableHour = [int]$DisableTime.Split(':')[0]
$disableMinute = [int]$DisableTime.Split(':')[1]

# Enable Schedule
$enableStartTime = (Get-Date).Date.AddDays(1).AddHours($enableHour).AddMinutes($enableMinute)
$existingSchedule = Get-AzAutomationSchedule -ResourceGroupName $ResourceGroupName -AutomationAccountName $AutomationAccountName -Name "Enable-Students-Morning" -ErrorAction SilentlyContinue
if ($existingSchedule) {
    Remove-AzAutomationSchedule -ResourceGroupName $ResourceGroupName -AutomationAccountName $AutomationAccountName -Name "Enable-Students-Morning" -Force
}
New-AzAutomationSchedule -ResourceGroupName $ResourceGroupName -AutomationAccountName $AutomationAccountName -Name "Enable-Students-Morning" -StartTime $enableStartTime -WeekInterval 1 -DaysOfWeek @('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday') -TimeZone $TimeZone | Out-Null
Write-Host "    [✓] Enable schedule: $EnableTime Mon-Fri" -ForegroundColor Gray

# Disable Schedule
$disableStartTime = (Get-Date).Date.AddDays(1).AddHours($disableHour).AddMinutes($disableMinute)
$existingSchedule = Get-AzAutomationSchedule -ResourceGroupName $ResourceGroupName -AutomationAccountName $AutomationAccountName -Name "Disable-Students-Afternoon" -ErrorAction SilentlyContinue
if ($existingSchedule) {
    Remove-AzAutomationSchedule -ResourceGroupName $ResourceGroupName -AutomationAccountName $AutomationAccountName -Name "Disable-Students-Afternoon" -Force
}
New-AzAutomationSchedule -ResourceGroupName $ResourceGroupName -AutomationAccountName $AutomationAccountName -Name "Disable-Students-Afternoon" -StartTime $disableStartTime -WeekInterval 1 -DaysOfWeek @('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday') -TimeZone $TimeZone | Out-Null
Write-Host "    [✓] Disable schedule: $DisableTime Mon-Fri" -ForegroundColor Gray

Write-Host "  [✓] Schedules created" -ForegroundColor Green

# Link Runbooks to Schedules
Write-Host "  Linking Runbooks to Schedules..." -ForegroundColor Yellow

# Remove existing job schedules if they exist
$jobSchedules = Get-AzAutomationScheduledRunbook -ResourceGroupName $ResourceGroupName -AutomationAccountName $AutomationAccountName -ErrorAction SilentlyContinue
foreach ($js in $jobSchedules) {
    Unregister-AzAutomationScheduledRunbook -ResourceGroupName $ResourceGroupName -AutomationAccountName $AutomationAccountName -RunbookName $js.RunbookName -ScheduleName $js.ScheduleName -Force -ErrorAction SilentlyContinue
}

Register-AzAutomationScheduledRunbook -ResourceGroupName $ResourceGroupName -AutomationAccountName $AutomationAccountName -RunbookName "Enable-StudentAccess" -ScheduleName "Enable-Students-Morning" | Out-Null
Register-AzAutomationScheduledRunbook -ResourceGroupName $ResourceGroupName -AutomationAccountName $AutomationAccountName -RunbookName "Disable-StudentAccess" -ScheduleName "Disable-Students-Afternoon" | Out-Null

Write-Host "  [✓] Runbooks linked to schedules" -ForegroundColor Green

# Summary
Write-Host ""
Write-Host "  ╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "  ║                    DEPLOYMENT COMPLETE!                       ║" -ForegroundColor Green
Write-Host "  ╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "  Resource Group:      $ResourceGroupName" -ForegroundColor White
Write-Host "  Automation Account:  $AutomationAccountName" -ForegroundColor White
Write-Host "  Location:            $Location" -ForegroundColor White
Write-Host ""
Write-Host "  Schedules:" -ForegroundColor Cyan
Write-Host "    Enable:   $EnableTime Mon-Fri" -ForegroundColor Green
Write-Host "    Disable:  $DisableTime Mon-Fri" -ForegroundColor Red
Write-Host ""
Write-Host "  Azure Portal:" -ForegroundColor Cyan
Write-Host "  https://portal.azure.com/#@$TenantId/resource/subscriptions/$($context.Subscription.Id)/resourceGroups/$ResourceGroupName/providers/Microsoft.Automation/automationAccounts/$AutomationAccountName/overview" -ForegroundColor Gray
Write-Host ""
Write-Host "  [!] Note: PowerShell modules may take 5-10 minutes to fully import." -ForegroundColor Yellow
Write-Host "      Wait before testing runbooks manually." -ForegroundColor Yellow
Write-Host ""
