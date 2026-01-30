<#
.SYNOPSIS
    Deploys the Student Access Automation solution to Azure.

.DESCRIPTION
    This script creates all required Azure resources for the Student Access
    Automation solution including:
    - Resource Group
    - Automation Account
    - Runbooks
    - Schedules
    - Variables

.PARAMETER ConfigPath
    Path to the configuration JSON file.

.EXAMPLE
    .\Deploy-StudentAccessAutomation.ps1 -ConfigPath "..\config\config.json"

.NOTES
    Author: IT Admin
    Version: 1.0
    Requires: Az.Accounts, Az.Automation, Az.Resources modules
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$ConfigPath
)

# Import required modules
$requiredModules = @('Az.Accounts', 'Az.Automation', 'Az.Resources')
foreach ($module in $requiredModules) {
    if (-not (Get-Module -ListAvailable -Name $module)) {
        Write-Host "Installing module: $module" -ForegroundColor Yellow
        Install-Module -Name $module -Force -AllowClobber -Scope CurrentUser
    }
    Import-Module $module
}

# Load configuration
if (-not (Test-Path $ConfigPath)) {
    Write-Error "Configuration file not found: $ConfigPath"
    exit 1
}

$config = Get-Content $ConfigPath | ConvertFrom-Json

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Student Access Automation - Deployment" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Connect to Azure
Write-Host "Connecting to Azure..." -ForegroundColor Yellow
Connect-AzAccount -TenantId $config.TenantId

# Create Resource Group
Write-Host "Creating Resource Group: $($config.ResourceGroupName)" -ForegroundColor Yellow
New-AzResourceGroup -Name $config.ResourceGroupName -Location $config.Location -Force

# Create Automation Account
Write-Host "Creating Automation Account: $($config.AutomationAccountName)" -ForegroundColor Yellow
$automationAccount = New-AzAutomationAccount `
    -ResourceGroupName $config.ResourceGroupName `
    -Name $config.AutomationAccountName `
    -Location $config.Location `
    -Plan Basic

# Add required PowerShell modules to Automation Account
$graphModules = @(
    'Microsoft.Graph.Authentication',
    'Microsoft.Graph.Users', 
    'Microsoft.Graph.Groups'
)

foreach ($moduleName in $graphModules) {
    Write-Host "Adding module: $moduleName" -ForegroundColor Yellow
    
    # Get the module from PowerShell Gallery
    $moduleUri = "https://www.powershellgallery.com/api/v2/package/$moduleName"
    
    New-AzAutomationModule `
        -ResourceGroupName $config.ResourceGroupName `
        -AutomationAccountName $config.AutomationAccountName `
        -Name $moduleName `
        -ContentLinkUri $moduleUri
}

# Create encrypted variables
Write-Host "Creating Automation Variables..." -ForegroundColor Yellow

$variables = @{
    'TenantId' = @{ Value = $config.TenantId; Encrypted = $false }
    'ClientId' = @{ Value = $config.ClientId; Encrypted = $false }
    'ClientSecret' = @{ Value = $config.ClientSecret; Encrypted = $true }
    'StudentGroupId' = @{ Value = $config.StudentGroupId; Encrypted = $false }
    'RevokeTokens' = @{ Value = $config.RevokeTokens.ToString(); Encrypted = $false }
}

foreach ($varName in $variables.Keys) {
    $var = $variables[$varName]
    Write-Host "  Creating variable: $varName (Encrypted: $($var.Encrypted))"
    
    New-AzAutomationVariable `
        -ResourceGroupName $config.ResourceGroupName `
        -AutomationAccountName $config.AutomationAccountName `
        -Name $varName `
        -Value $var.Value `
        -Encrypted $var.Encrypted
}

# Import Runbooks
Write-Host "Importing Runbooks..." -ForegroundColor Yellow

$runbooksPath = Join-Path (Split-Path $PSScriptRoot -Parent) "runbooks"
$runbooks = @(
    @{ Name = 'Enable-StudentAccess'; File = 'Enable-StudentAccess.ps1' },
    @{ Name = 'Disable-StudentAccess'; File = 'Disable-StudentAccess.ps1' },
    @{ Name = 'Get-StudentAccessStatus'; File = 'Get-StudentAccessStatus.ps1' }
)

foreach ($runbook in $runbooks) {
    $runbookPath = Join-Path $runbooksPath $runbook.File
    Write-Host "  Importing: $($runbook.Name)"
    
    Import-AzAutomationRunbook `
        -ResourceGroupName $config.ResourceGroupName `
        -AutomationAccountName $config.AutomationAccountName `
        -Name $runbook.Name `
        -Path $runbookPath `
        -Type PowerShell `
        -Published `
        -Force
}

# Create Schedules
Write-Host "Creating Schedules..." -ForegroundColor Yellow

# Enable Schedule (Morning)
$enableStartTime = (Get-Date).Date.AddDays(1).AddHours([int]$config.Schedules.EnableTime.Split(':')[0]).AddMinutes([int]$config.Schedules.EnableTime.Split(':')[1])

Write-Host "  Creating Enable schedule: $($config.Schedules.EnableTime) $($config.Schedules.DaysOfWeek -join ', ')"
New-AzAutomationSchedule `
    -ResourceGroupName $config.ResourceGroupName `
    -AutomationAccountName $config.AutomationAccountName `
    -Name "Enable-Students-Morning" `
    -StartTime $enableStartTime `
    -WeekInterval 1 `
    -DaysOfWeek $config.Schedules.DaysOfWeek `
    -TimeZone $config.Schedules.TimeZone

# Disable Schedule (Afternoon)
$disableStartTime = (Get-Date).Date.AddDays(1).AddHours([int]$config.Schedules.DisableTime.Split(':')[0]).AddMinutes([int]$config.Schedules.DisableTime.Split(':')[1])

Write-Host "  Creating Disable schedule: $($config.Schedules.DisableTime) $($config.Schedules.DaysOfWeek -join ', ')"
New-AzAutomationSchedule `
    -ResourceGroupName $config.ResourceGroupName `
    -AutomationAccountName $config.AutomationAccountName `
    -Name "Disable-Students-Afternoon" `
    -StartTime $disableStartTime `
    -WeekInterval 1 `
    -DaysOfWeek $config.Schedules.DaysOfWeek `
    -TimeZone $config.Schedules.TimeZone

# Link Runbooks to Schedules
Write-Host "Linking Runbooks to Schedules..." -ForegroundColor Yellow

Register-AzAutomationScheduledRunbook `
    -ResourceGroupName $config.ResourceGroupName `
    -AutomationAccountName $config.AutomationAccountName `
    -RunbookName "Enable-StudentAccess" `
    -ScheduleName "Enable-Students-Morning"

Register-AzAutomationScheduledRunbook `
    -ResourceGroupName $config.ResourceGroupName `
    -AutomationAccountName $config.AutomationAccountName `
    -RunbookName "Disable-StudentAccess" `
    -ScheduleName "Disable-Students-Afternoon"

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Wait for PowerShell modules to finish importing (5-10 minutes)"
Write-Host "2. Test runbooks manually in Azure Portal"
Write-Host "3. Verify schedules are correct for your timezone"
Write-Host ""
Write-Host "Azure Portal: https://portal.azure.com/#@$($config.TenantId)/resource/subscriptions/*/resourceGroups/$($config.ResourceGroupName)/providers/Microsoft.Automation/automationAccounts/$($config.AutomationAccountName)"
