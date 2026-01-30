<#
.SYNOPSIS
    Interactive menu for Student Access Automation deployment and management.

.DESCRIPTION
    Provides a menu-driven interface to:
    - Deploy infrastructure to Azure (directly or via GitHub)
    - Manage credentials securely
    - Create App Registration
    - Test the solution locally
    - View status reports
    - Manage schedules

.EXAMPLE
    .\Start-StudentAccessMenu.ps1

.NOTES
    Author: IT Admin
    Version: 2.0
#>

[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$script:ProjectRoot = Split-Path $PSScriptRoot -Parent

# Import credential manager
$credManagerPath = Join-Path $PSScriptRoot "SecureCredentialManager.psm1"
if (Test-Path $credManagerPath) {
    Import-Module $credManagerPath -Force
}

function Show-Banner {
    Clear-Host
    Write-Host ""
    Write-Host "  ╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "  ║                                                               ║" -ForegroundColor Cyan
    Write-Host "  ║   " -ForegroundColor Cyan -NoNewline
    Write-Host "STUDENT TIME MANAGEMENT FOR MICROSOFT 365" -ForegroundColor White -NoNewline
    Write-Host "                ║" -ForegroundColor Cyan
    Write-Host "  ║                                                               ║" -ForegroundColor Cyan
    Write-Host "  ║   " -ForegroundColor Cyan -NoNewline
    Write-Host "Azure Automation | Entra ID | Microsoft Graph" -ForegroundColor Gray -NoNewline
    Write-Host "           ║" -ForegroundColor Cyan
    Write-Host "  ║                                                               ║" -ForegroundColor Cyan
    Write-Host "  ╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

function Show-MainMenu {
    Write-Host "  ┌───────────────────────────────────────────────────────────────┐" -ForegroundColor DarkGray
    Write-Host "  │                        MAIN MENU                              │" -ForegroundColor DarkGray
    Write-Host "  ├───────────────────────────────────────────────────────────────┤" -ForegroundColor DarkGray
    Write-Host "  │                                                               │" -ForegroundColor DarkGray
    Write-Host "  │  " -ForegroundColor DarkGray -NoNewline
    Write-Host "── SETUP ──────────────────────────────────────────────────" -ForegroundColor DarkCyan -NoNewline
    Write-Host "│" -ForegroundColor DarkGray
    Write-Host "  │   " -ForegroundColor DarkGray -NoNewline
    Write-Host "[1]" -ForegroundColor Yellow -NoNewline
    Write-Host "  Create App Registration (Entra ID)" -ForegroundColor White -NoNewline
    Write-Host "                  │" -ForegroundColor DarkGray
    Write-Host "  │   " -ForegroundColor DarkGray -NoNewline
    Write-Host "[2]" -ForegroundColor Yellow -NoNewline
    Write-Host "  Manage Secure Credentials (Local PC)" -ForegroundColor White -NoNewline
    Write-Host "                │" -ForegroundColor DarkGray
    Write-Host "  │                                                               │" -ForegroundColor DarkGray
    Write-Host "  │  " -ForegroundColor DarkGray -NoNewline
    Write-Host "── DEPLOYMENT ─────────────────────────────────────────────" -ForegroundColor DarkCyan -NoNewline
    Write-Host "│" -ForegroundColor DarkGray
    Write-Host "  │   " -ForegroundColor DarkGray -NoNewline
    Write-Host "[3]" -ForegroundColor Green -NoNewline
    Write-Host "  Deploy to Azure (Direct - No GitHub)" -ForegroundColor White -NoNewline
    Write-Host "                 │" -ForegroundColor DarkGray
    Write-Host "  │   " -ForegroundColor DarkGray -NoNewline
    Write-Host "[4]" -ForegroundColor Green -NoNewline
    Write-Host "  Deploy via GitHub Actions (IaC)" -ForegroundColor White -NoNewline
    Write-Host "                     │" -ForegroundColor DarkGray
    Write-Host "  │   " -ForegroundColor DarkGray -NoNewline
    Write-Host "[5]" -ForegroundColor Green -NoNewline
    Write-Host "  Deploy using Bicep Template" -ForegroundColor White -NoNewline
    Write-Host "                         │" -ForegroundColor DarkGray
    Write-Host "  │                                                               │" -ForegroundColor DarkGray
    Write-Host "  │  " -ForegroundColor DarkGray -NoNewline
    Write-Host "── TESTING ────────────────────────────────────────────────" -ForegroundColor DarkCyan -NoNewline
    Write-Host "│" -ForegroundColor DarkGray
    Write-Host "  │   " -ForegroundColor DarkGray -NoNewline
    Write-Host "[6]" -ForegroundColor Cyan -NoNewline
    Write-Host "  Test: Enable Student Access" -ForegroundColor White -NoNewline
    Write-Host "                          │" -ForegroundColor DarkGray
    Write-Host "  │   " -ForegroundColor DarkGray -NoNewline
    Write-Host "[7]" -ForegroundColor Cyan -NoNewline
    Write-Host "  Test: Disable Student Access" -ForegroundColor White -NoNewline
    Write-Host "                         │" -ForegroundColor DarkGray
    Write-Host "  │   " -ForegroundColor DarkGray -NoNewline
    Write-Host "[8]" -ForegroundColor Cyan -NoNewline
    Write-Host "  View: Student Access Status" -ForegroundColor White -NoNewline
    Write-Host "                          │" -ForegroundColor DarkGray
    Write-Host "  │                                                               │" -ForegroundColor DarkGray
    Write-Host "  │  " -ForegroundColor DarkGray -NoNewline
    Write-Host "── CONFIGURATION ──────────────────────────────────────────" -ForegroundColor DarkCyan -NoNewline
    Write-Host "│" -ForegroundColor DarkGray
    Write-Host "  │   " -ForegroundColor DarkGray -NoNewline
    Write-Host "[9]" -ForegroundColor Magenta -NoNewline
    Write-Host "  View Current Configuration" -ForegroundColor White -NoNewline
    Write-Host "                           │" -ForegroundColor DarkGray
    Write-Host "  │   " -ForegroundColor DarkGray -NoNewline
    Write-Host "[0]" -ForegroundColor Magenta -NoNewline
    Write-Host "  Edit Configuration File" -ForegroundColor White -NoNewline
    Write-Host "                              │" -ForegroundColor DarkGray
    Write-Host "  │                                                               │" -ForegroundColor DarkGray
    Write-Host "  │   " -ForegroundColor DarkGray -NoNewline
    Write-Host "[Q]" -ForegroundColor DarkRed -NoNewline
    Write-Host "  Quit" -ForegroundColor White -NoNewline
    Write-Host "                                                  │" -ForegroundColor DarkGray
    Write-Host "  │                                                               │" -ForegroundColor DarkGray
    Write-Host "  └───────────────────────────────────────────────────────────────┘" -ForegroundColor DarkGray
    Write-Host ""
}

function Get-ConfigPath {
    $configPath = Join-Path $script:ProjectRoot "config\config.json"
    if (-not (Test-Path $configPath)) {
        $templatePath = Join-Path $script:ProjectRoot "config\config.template.json"
        if (Test-Path $templatePath) {
            Write-Host "  Creating config.json from template..." -ForegroundColor Yellow
            Copy-Item $templatePath $configPath
        }
    }
    return $configPath
}

function Test-ConfigExists {
    $configPath = Get-ConfigPath
    if (-not (Test-Path $configPath)) {
        Write-Host "  [ERROR] Configuration file not found!" -ForegroundColor Red
        Write-Host "  Please run Initial Setup first (Option 1)" -ForegroundColor Yellow
        return $false
    }
    
    $config = Get-Content $configPath | ConvertFrom-Json
    if ($config.TenantId -like "*<*" -or $config.ClientId -like "*<*") {
        Write-Host "  [WARNING] Configuration contains placeholder values!" -ForegroundColor Yellow
        Write-Host "  Please run Initial Setup first (Option 1)" -ForegroundColor Yellow
        return $false
    }
    return $true
}

function Test-SecureCredentialsExist {
    if (Get-Command -Name Test-CredentialsExist -ErrorAction SilentlyContinue) {
        return Test-CredentialsExist
    }
    return $false
}

function Invoke-CreateAppRegistration {
    Show-Banner
    Write-Host "  ═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "                   CREATE APP REGISTRATION" -ForegroundColor White
    Write-Host "  ═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "  This will create an App Registration in Entra ID with the" -ForegroundColor Yellow
    Write-Host "  required Microsoft Graph API permissions." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Required permissions:" -ForegroundColor Cyan
    Write-Host "    • User.ReadWrite.All   - Enable/disable accounts" -ForegroundColor White
    Write-Host "    • Group.Read.All       - Read student group" -ForegroundColor White
    Write-Host "    • Directory.Read.All   - Read user info" -ForegroundColor White
    Write-Host ""
    
    $confirm = Read-Host "  Create App Registration now? (Y/N)"
    if ($confirm -eq 'Y' -or $confirm -eq 'y') {
        $appScript = Join-Path $script:ProjectRoot "scripts\New-AppRegistration.ps1"
        & $appScript
        
        Write-Host ""
        Write-Host "  ─────────────────────────────────────────────────────────────────" -ForegroundColor DarkGray
        Write-Host "  [!] IMPORTANT: Copy the values above!" -ForegroundColor Red
        Write-Host ""
        Write-Host "  Would you like to save these credentials securely now?" -ForegroundColor Yellow
        $saveSecure = Read-Host "  Save to secure local storage? (Y/N)"
        if ($saveSecure -eq 'Y' -or $saveSecure -eq 'y') {
            Invoke-ManageCredentials
        }
    }
    
    Read-Host "  Press Enter to continue"
}

function Invoke-ManageCredentials {
    Show-Banner
    Write-Host "  ═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "               SECURE CREDENTIAL MANAGEMENT" -ForegroundColor White
    Write-Host "  ═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Credentials are stored securely in Windows Credential Manager" -ForegroundColor Gray
    Write-Host "  using PowerShell SecretManagement module." -ForegroundColor Gray
    Write-Host ""
    
    # Check current status
    Write-Host "  Current Status:" -ForegroundColor Cyan
    Write-Host "  ─────────────────────────────────────────────" -ForegroundColor DarkGray
    
    if (Get-Command -Name Get-AllSecureCredentials -ErrorAction SilentlyContinue) {
        $creds = Get-AllSecureCredentials
        if ($creds.Count -gt 0) {
            foreach ($cred in $creds) {
                Write-Host "    [✓] $($cred.Name)" -ForegroundColor Green
            }
        }
        else {
            Write-Host "    [!] No credentials stored yet" -ForegroundColor Yellow
        }
    }
    else {
        Write-Host "    [!] SecretManagement not initialized" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "  Options:" -ForegroundColor Cyan
    Write-Host "    [1] Set/Update all credentials" -ForegroundColor White
    Write-Host "    [2] View stored credential names" -ForegroundColor White
    Write-Host "    [3] Clear all credentials" -ForegroundColor White
    Write-Host "    [B] Back to main menu" -ForegroundColor White
    Write-Host ""
    
    $choice = Read-Host "  Select option"
    
    switch ($choice) {
        '1' {
            if (Get-Command -Name Set-AllCredentials -ErrorAction SilentlyContinue) {
                Set-AllCredentials
            }
            else {
                Write-Host "  [ERROR] Credential manager not loaded" -ForegroundColor Red
            }
        }
        '2' {
            Write-Host ""
            if (Get-Command -Name Get-AllSecureCredentials -ErrorAction SilentlyContinue) {
                $creds = Get-AllSecureCredentials
                Write-Host "  Stored Credentials:" -ForegroundColor Cyan
                foreach ($cred in $creds) {
                    Write-Host "    • $($cred.Name)" -ForegroundColor White
                }
            }
        }
        '3' {
            if (Get-Command -Name Clear-AllCredentials -ErrorAction SilentlyContinue) {
                Clear-AllCredentials
            }
        }
    }
    
    if ($choice -ne 'B' -and $choice -ne 'b') {
        Read-Host "  Press Enter to continue"
    }
}

function Invoke-DeployAzureDirect {
    Show-Banner
    Write-Host "  ═══════════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host "            DEPLOY TO AZURE (Direct - No GitHub)" -ForegroundColor White
    Write-Host "  ═══════════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "  This will deploy directly to Azure using:" -ForegroundColor Yellow
    Write-Host "    • Azure PowerShell modules" -ForegroundColor White
    Write-Host "    • Your Azure credentials (interactive login)" -ForegroundColor White
    Write-Host ""
    
    Write-Host "  Choose credential source:" -ForegroundColor Cyan
    Write-Host "    [1] Secure local storage (recommended)" -ForegroundColor White
    Write-Host "    [2] Config file (config.json)" -ForegroundColor White
    Write-Host "    [B] Back to menu" -ForegroundColor White
    Write-Host ""
    
    $source = Read-Host "  Select option"
    
    switch ($source) {
        '1' {
            if (-not (Test-SecureCredentialsExist)) {
                Write-Host ""
                Write-Host "  [!] Secure credentials not found. Set them up first? (Y/N)" -ForegroundColor Yellow
                $setup = Read-Host
                if ($setup -eq 'Y' -or $setup -eq 'y') {
                    Invoke-ManageCredentials
                }
                return
            }
            
            Write-Host ""
            Write-Host "  This will create:" -ForegroundColor Yellow
            Write-Host "    • Resource Group: rg-student-access-automation" -ForegroundColor White
            Write-Host "    • Automation Account with runbooks" -ForegroundColor White
            Write-Host "    • Schedules (07:55 enable, 16:05 disable)" -ForegroundColor White
            Write-Host ""
            
            $confirm = Read-Host "  Proceed with deployment? (Y/N)"
            if ($confirm -eq 'Y' -or $confirm -eq 'y') {
                $deployScript = Join-Path $script:ProjectRoot "scripts\Deploy-ToAzureDirect.ps1"
                & $deployScript -UseSecureCredentials
            }
        }
        '2' {
            if (-not (Test-ConfigExists)) {
                Read-Host "  Press Enter to return to menu"
                return
            }
            
            $configPath = Get-ConfigPath
            $deployScript = Join-Path $script:ProjectRoot "scripts\Deploy-StudentAccessAutomation.ps1"
            & $deployScript -ConfigPath $configPath
        }
    }
    
    Read-Host "  Press Enter to continue"
}

function Invoke-GitHubActionsSetup {
    Show-Banner
    Write-Host "  ═══════════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host "                GITHUB ACTIONS (IaC) SETUP" -ForegroundColor White
    Write-Host "  ═══════════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "  This option deploys infrastructure using GitHub Actions with" -ForegroundColor Yellow
    Write-Host "  Azure Workload Identity Federation (OIDC - no secrets needed)." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Prerequisites:" -ForegroundColor Cyan
    Write-Host "  ─────────────────────────────────────────────" -ForegroundColor DarkGray
    Write-Host "  1. GitHub repository with this code pushed" -ForegroundColor White
    Write-Host "  2. Azure subscription" -ForegroundColor White
    Write-Host "  3. Permissions to create App Registration" -ForegroundColor White
    Write-Host ""
    
    $setupFederation = Read-Host "  Set up Azure-GitHub federation now? (Y/N)"
    if ($setupFederation -eq 'Y' -or $setupFederation -eq 'y') {
        $federationScript = Join-Path $script:ProjectRoot "scripts\New-GitHubFederation.ps1"
        if (Test-Path $federationScript) {
            $repoName = Read-Host "  Enter GitHub repo (format: owner/repo)"
            & $federationScript -GitHubRepo $repoName
        }
        else {
            Write-Host "  [ERROR] Federation script not found." -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "  GitHub Actions workflows are located in:" -ForegroundColor Cyan
    Write-Host "  .github/workflows/deploy-infrastructure.yml" -ForegroundColor White
    Write-Host ""
    Write-Host "  Required GitHub Secrets:" -ForegroundColor Cyan
    Write-Host "  • AZURE_CLIENT_ID" -ForegroundColor White
    Write-Host "  • AZURE_TENANT_ID" -ForegroundColor White
    Write-Host "  • AZURE_SUBSCRIPTION_ID" -ForegroundColor White
    Write-Host "  • STUDENT_GROUP_ID" -ForegroundColor White
    Write-Host "  • GRAPH_CLIENT_SECRET" -ForegroundColor White
    Write-Host ""
    
    Read-Host "  Press Enter to continue"
}

function Invoke-DeployBicep {
    Show-Banner
    Write-Host "  ═══════════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host "                  DEPLOY USING BICEP TEMPLATE" -ForegroundColor White
    Write-Host "  ═══════════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "  This will deploy using the Bicep IaC template with Azure CLI." -ForegroundColor Yellow
    Write-Host ""
    
    # Check for Azure CLI
    $azCli = Get-Command az -ErrorAction SilentlyContinue
    if (-not $azCli) {
        Write-Host "  [ERROR] Azure CLI not found. Please install Azure CLI first." -ForegroundColor Red
        Write-Host "  https://docs.microsoft.com/cli/azure/install-azure-cli" -ForegroundColor Gray
        Read-Host "  Press Enter to continue"
        return
    }
    
    Write-Host "  Choose credential source:" -ForegroundColor Cyan
    Write-Host "    [1] Secure local storage" -ForegroundColor White
    Write-Host "    [2] Enter manually" -ForegroundColor White
    Write-Host "    [B] Back to menu" -ForegroundColor White
    Write-Host ""
    
    $source = Read-Host "  Select option"
    
    if ($source -eq '1') {
        if (-not (Test-SecureCredentialsExist)) {
            Write-Host "  [!] Secure credentials not found." -ForegroundColor Yellow
            Read-Host "  Press Enter to continue"
            return
        }
        $creds = Get-CredentialsAsHashtable
        $TenantId = $creds.TenantId
        $ClientId = $creds.ClientId
        $ClientSecret = $creds.ClientSecret
        $StudentGroupId = $creds.StudentGroupId
    }
    elseif ($source -eq '2') {
        $TenantId = Read-Host "  Enter TenantId"
        $ClientId = Read-Host "  Enter Graph API ClientId"
        $ClientSecret = Read-Host "  Enter Graph API ClientSecret"
        $StudentGroupId = Read-Host "  Enter StudentGroupId"
    }
    else {
        return
    }
    
    $ResourceGroup = "rg-student-access-automation"
    $Location = "westeurope"
    
    Write-Host ""
    Write-Host "  Logging in to Azure..." -ForegroundColor Yellow
    az login --tenant $TenantId
    
    Write-Host "  Creating resource group..." -ForegroundColor Yellow
    az group create --name $ResourceGroup --location $Location
    
    Write-Host "  Deploying Bicep template..." -ForegroundColor Yellow
    $bicepPath = Join-Path $script:ProjectRoot "infrastructure\main.bicep"
    
    az deployment group create `
        --resource-group $ResourceGroup `
        --template-file $bicepPath `
        --parameters `
            tenantId=$TenantId `
            graphClientId=$ClientId `
            graphClientSecret=$ClientSecret `
            studentGroupId=$StudentGroupId `
            enableTime="07:55" `
            disableTime="16:05"
    
    Write-Host ""
    Write-Host "  [✓] Bicep deployment complete!" -ForegroundColor Green
    Read-Host "  Press Enter to continue"
}

function Invoke-TestEnable {
    Show-Banner
    Write-Host "  ═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "                    TEST: ENABLE STUDENTS" -ForegroundColor White
    Write-Host "  ═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "  Choose credential source:" -ForegroundColor Cyan
    Write-Host "    [1] Secure local storage" -ForegroundColor White
    Write-Host "    [2] Config file" -ForegroundColor White
    Write-Host ""
    
    $source = Read-Host "  Select option"
    $whatIf = Read-Host "  Run in WhatIf mode (no changes)? (Y/N)"
    
    $testScript = Join-Path $script:ProjectRoot "scripts\Test-StudentAccess.ps1"
    
    if ($source -eq '1' -and (Test-SecureCredentialsExist)) {
        # Create temp config from secure credentials
        $creds = Get-CredentialsAsHashtable
        $tempConfig = @{
            TenantId = $creds.TenantId
            ClientId = $creds.ClientId
            ClientSecret = $creds.ClientSecret
            StudentGroupId = $creds.StudentGroupId
            RevokeTokens = $true
        }
        $tempPath = Join-Path $env:TEMP "student-access-temp.json"
        $tempConfig | ConvertTo-Json | Set-Content $tempPath
        
        if ($whatIf -eq 'Y' -or $whatIf -eq 'y') {
            & $testScript -Action Enable -ConfigPath $tempPath -WhatIf
        }
        else {
            & $testScript -Action Enable -ConfigPath $tempPath
        }
        
        Remove-Item $tempPath -Force -ErrorAction SilentlyContinue
    }
    else {
        if (-not (Test-ConfigExists)) {
            Read-Host "  Press Enter to return to menu"
            return
        }
        $configPath = Get-ConfigPath
        if ($whatIf -eq 'Y' -or $whatIf -eq 'y') {
            & $testScript -Action Enable -ConfigPath $configPath -WhatIf
        }
        else {
            & $testScript -Action Enable -ConfigPath $configPath
        }
    }
    
    Read-Host "  Press Enter to continue"
}

function Invoke-TestDisable {
    Show-Banner
    Write-Host "  ═══════════════════════════════════════════════════════════════" -ForegroundColor Red
    Write-Host "                   TEST: DISABLE STUDENTS" -ForegroundColor White
    Write-Host "  ═══════════════════════════════════════════════════════════════" -ForegroundColor Red
    Write-Host ""
    Write-Host "  [!] WARNING: This will disable student accounts!" -ForegroundColor Red
    Write-Host ""
    
    Write-Host "  Choose credential source:" -ForegroundColor Cyan
    Write-Host "    [1] Secure local storage" -ForegroundColor White
    Write-Host "    [2] Config file" -ForegroundColor White
    Write-Host ""
    
    $source = Read-Host "  Select option"
    $whatIf = Read-Host "  Run in WhatIf mode (no changes)? (Y/N)"
    
    $testScript = Join-Path $script:ProjectRoot "scripts\Test-StudentAccess.ps1"
    
    if ($source -eq '1' -and (Test-SecureCredentialsExist)) {
        $creds = Get-CredentialsAsHashtable
        $tempConfig = @{
            TenantId = $creds.TenantId
            ClientId = $creds.ClientId
            ClientSecret = $creds.ClientSecret
            StudentGroupId = $creds.StudentGroupId
            RevokeTokens = $true
        }
        $tempPath = Join-Path $env:TEMP "student-access-temp.json"
        $tempConfig | ConvertTo-Json | Set-Content $tempPath
        $configPath = $tempPath
    }
    else {
        if (-not (Test-ConfigExists)) {
            Read-Host "  Press Enter to return to menu"
            return
        }
        $configPath = Get-ConfigPath
    }
    
    if ($whatIf -eq 'Y' -or $whatIf -eq 'y') {
        & $testScript -Action Disable -ConfigPath $configPath -WhatIf
    }
    else {
        $confirm = Read-Host "  Are you sure you want to disable accounts? (type YES)"
        if ($confirm -eq 'YES') {
            & $testScript -Action Disable -ConfigPath $configPath
        }
    }
    
    if ($source -eq '1') {
        Remove-Item $tempPath -Force -ErrorAction SilentlyContinue
    }
    
    Read-Host "  Press Enter to continue"
}

function Invoke-ViewStatus {
    Show-Banner
    Write-Host "  ═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "                  STUDENT ACCESS STATUS" -ForegroundColor White
    Write-Host "  ═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "  Choose credential source:" -ForegroundColor Cyan
    Write-Host "    [1] Secure local storage" -ForegroundColor White
    Write-Host "    [2] Config file" -ForegroundColor White
    Write-Host ""
    
    $source = Read-Host "  Select option"
    $testScript = Join-Path $script:ProjectRoot "scripts\Test-StudentAccess.ps1"
    
    if ($source -eq '1' -and (Test-SecureCredentialsExist)) {
        $creds = Get-CredentialsAsHashtable
        $tempConfig = @{
            TenantId = $creds.TenantId
            ClientId = $creds.ClientId
            ClientSecret = $creds.ClientSecret
            StudentGroupId = $creds.StudentGroupId
            RevokeTokens = $true
        }
        $tempPath = Join-Path $env:TEMP "student-access-temp.json"
        $tempConfig | ConvertTo-Json | Set-Content $tempPath
        
        & $testScript -Action Status -ConfigPath $tempPath
        
        Remove-Item $tempPath -Force -ErrorAction SilentlyContinue
    }
    else {
        if (-not (Test-ConfigExists)) {
            Read-Host "  Press Enter to return to menu"
            return
        }
        $configPath = Get-ConfigPath
        & $testScript -Action Status -ConfigPath $configPath
    }
    
    Read-Host "  Press Enter to continue"
}

function Invoke-ViewConfig {
    Show-Banner
    Write-Host "  ═══════════════════════════════════════════════════════════════" -ForegroundColor Magenta
    Write-Host "                  CURRENT CONFIGURATION" -ForegroundColor White
    Write-Host "  ═══════════════════════════════════════════════════════════════" -ForegroundColor Magenta
    Write-Host ""
    
    # Show secure credentials status
    Write-Host "  Secure Local Storage:" -ForegroundColor Cyan
    Write-Host "  ─────────────────────────────────────────────" -ForegroundColor DarkGray
    if (Test-SecureCredentialsExist) {
        $creds = Get-CredentialsAsHashtable
        Write-Host "  TenantId:        $($creds.TenantId.Substring(0, [Math]::Min(8, $creds.TenantId.Length)))..." -ForegroundColor Green
        Write-Host "  ClientId:        $($creds.ClientId.Substring(0, [Math]::Min(8, $creds.ClientId.Length)))..." -ForegroundColor Green
        Write-Host "  ClientSecret:    ********" -ForegroundColor Green
        Write-Host "  StudentGroupId:  $($creds.StudentGroupId.Substring(0, [Math]::Min(8, $creds.StudentGroupId.Length)))..." -ForegroundColor Green
        if ($creds.SubscriptionId) {
            Write-Host "  SubscriptionId:  $($creds.SubscriptionId.Substring(0, [Math]::Min(8, $creds.SubscriptionId.Length)))..." -ForegroundColor Green
        }
    }
    else {
        Write-Host "  [!] No secure credentials stored" -ForegroundColor Yellow
    }
    
    Write-Host ""
    
    # Show config file
    Write-Host "  Config File (config.json):" -ForegroundColor Cyan
    Write-Host "  ─────────────────────────────────────────────" -ForegroundColor DarkGray
    
    $configPath = Get-ConfigPath
    if (Test-Path $configPath) {
        $config = Get-Content $configPath | ConvertFrom-Json
        
        if ($config.TenantId -like "*<*") {
            Write-Host "  [!] Config file contains placeholders" -ForegroundColor Yellow
        }
        else {
            Write-Host "  Tenant ID:        $($config.TenantId)" -ForegroundColor White
            Write-Host "  Client ID:        $($config.ClientId)" -ForegroundColor White
            Write-Host "  Student Group:    $($config.StudentGroupId)" -ForegroundColor White
            Write-Host "  Resource Group:   $($config.ResourceGroupName)" -ForegroundColor White
            Write-Host "  Location:         $($config.Location)" -ForegroundColor White
        }
        Write-Host ""
        Write-Host "  Schedule Settings:" -ForegroundColor Cyan
        Write-Host "  ─────────────────────────────────────────────" -ForegroundColor DarkGray
        Write-Host "  Enable Time:      $($config.Schedules.EnableTime)" -ForegroundColor Green
        Write-Host "  Disable Time:     $($config.Schedules.DisableTime)" -ForegroundColor Red
        Write-Host "  Time Zone:        $($config.Schedules.TimeZone)" -ForegroundColor White
        Write-Host "  Days:             $($config.Schedules.DaysOfWeek -join ', ')" -ForegroundColor White
        Write-Host "  Revoke Tokens:    $($config.RevokeTokens)" -ForegroundColor White
    }
    else {
        Write-Host "  [!] Config file not found" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Read-Host "  Press Enter to continue"
}

function Invoke-EditConfig {
    $configPath = Get-ConfigPath
    if (Test-Path $configPath) {
        code $configPath
    }
    else {
        Write-Host "  [ERROR] Configuration file not found!" -ForegroundColor Red
        Read-Host "  Press Enter to continue"
    }
}

# Main Loop
do {
    Show-Banner
    Show-MainMenu
    
    $choice = Read-Host "  Select option"
    
    switch ($choice.ToUpper()) {
        '1' { Invoke-CreateAppRegistration }
        '2' { Invoke-ManageCredentials }
        '3' { Invoke-DeployAzureDirect }
        '4' { Invoke-GitHubActionsSetup }
        '5' { Invoke-DeployBicep }
        '6' { Invoke-TestEnable }
        '7' { Invoke-TestDisable }
        '8' { Invoke-ViewStatus }
        '9' { Invoke-ViewConfig }
        '0' { Invoke-EditConfig }
        'Q' { 
            Write-Host ""
            Write-Host "  Goodbye!" -ForegroundColor Cyan
            break 
        }
        default {
            Write-Host "  Invalid option. Please try again." -ForegroundColor Red
            Start-Sleep -Seconds 1
        }
    }
} while ($choice.ToUpper() -ne 'Q')
