<#
.SYNOPSIS
    Interactive menu for Student Access Automation — full management console.

.DESCRIPTION
    Provides a comprehensive menu-driven interface to:
    - Deploy infrastructure to Azure (directly, GitHub Actions, or Bicep)
    - Manage credentials securely
    - Manage students (transfer, suspend, create, view status)
    - Manage schedule policies (CRUD)
    - Manage special groups (override schedules)
    - Promote students year-end (bulk class moves)
    - View and process pending group changes
    - Full configuration management

    This script is designed so that customers who do NOT use the web portal
    can still manage everything from PowerShell alone.

.EXAMPLE
    .\Start-StudentAccessMenu.ps1

.NOTES
    Author: Uy Le Phan (Atea AS)
    Version: 3.0
#>

[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$script:ProjectRoot = Split-Path $PSScriptRoot -Parent
$script:GraphConnected = $false
$script:AutomationAccountName = "StudentAccessAutomation"
$script:ResourceGroupName = "rg-student-access-automation"

# Import credential manager
$credManagerPath = Join-Path $PSScriptRoot "SecureCredentialManager.psm1"
if (Test-Path $credManagerPath) {
    Import-Module $credManagerPath -Force
}

# ═══════════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

function Show-Banner {
    Clear-Host
    Write-Host ""
    Write-Host "  ╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "  ║                                                               ║" -ForegroundColor Cyan
    Write-Host "  ║   " -ForegroundColor Cyan -NoNewline
    Write-Host "STUDENT ACCESS MANAGEMENT — FULL CONSOLE" -ForegroundColor White -NoNewline
    Write-Host "                 ║" -ForegroundColor Cyan
    Write-Host "  ║                                                               ║" -ForegroundColor Cyan
    Write-Host "  ║   " -ForegroundColor Cyan -NoNewline
    Write-Host "Azure Automation | Entra ID | Microsoft Graph" -ForegroundColor Gray -NoNewline
    Write-Host "           ║" -ForegroundColor Cyan
    Write-Host "  ║   " -ForegroundColor Cyan -NoNewline
    Write-Host "v3.0 — Atea AS" -ForegroundColor DarkGray -NoNewline
    Write-Host "                                             ║" -ForegroundColor Cyan
    Write-Host "  ╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

function Show-SectionHeader {
    param([string]$Title, [ConsoleColor]$Color = [ConsoleColor]::Cyan)
    Write-Host "  ═══════════════════════════════════════════════════════════════" -ForegroundColor $Color
    Write-Host "    $Title" -ForegroundColor White
    Write-Host "  ═══════════════════════════════════════════════════════════════" -ForegroundColor $Color
    Write-Host ""
}

function Wait-ForKey {
    param([string]$Message = "  Press Enter to continue")
    Read-Host $Message
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

function Connect-GraphInteractive {
    <#
    .SYNOPSIS
        Connects to Microsoft Graph interactively for local script execution.
    #>
    if ($script:GraphConnected) {
        Write-Host "  [✓] Already connected to Microsoft Graph" -ForegroundColor Green
        return $true
    }

    Write-Host "  Connecting to Microsoft Graph..." -ForegroundColor Yellow
    Write-Host "  (Interactive sign-in — use an admin account)" -ForegroundColor Gray
    Write-Host ""

    try {
        Connect-MgGraph -Scopes "User.ReadWrite.All","Group.ReadWrite.All","GroupMember.ReadWrite.All" -NoWelcome
        $ctx = Get-MgContext
        Write-Host "  [✓] Connected as $($ctx.Account) to tenant $($ctx.TenantId)" -ForegroundColor Green
        $script:GraphConnected = $true
        return $true
    }
    catch {
        Write-Host "  [ERROR] Failed to connect: $_" -ForegroundColor Red
        return $false
    }
}

function Disconnect-GraphSafely {
    if ($script:GraphConnected) {
        try { Disconnect-MgGraph -ErrorAction SilentlyContinue } catch { }
        $script:GraphConnected = $false
    }
}

function Get-AutomationVariableValue {
    <#
    .SYNOPSIS
        Reads an Azure Automation variable via Az module.
    #>
    param([string]$VariableName)

    try {
        $var = Get-AzAutomationVariable `
            -ResourceGroupName $script:ResourceGroupName `
            -AutomationAccountName $script:AutomationAccountName `
            -Name $VariableName -ErrorAction Stop
        return $var.Value
    }
    catch {
        Write-Host "  [WARNING] Could not read variable '$VariableName': $_" -ForegroundColor Yellow
        return $null
    }
}

function Set-AutomationVariableValue {
    <#
    .SYNOPSIS
        Writes an Azure Automation variable via Az module.
    #>
    param([string]$VariableName, [string]$Value, [bool]$Encrypted = $false)

    try {
        # Try update first
        Set-AzAutomationVariable `
            -ResourceGroupName $script:ResourceGroupName `
            -AutomationAccountName $script:AutomationAccountName `
            -Name $VariableName `
            -Value $Value `
            -Encrypted $Encrypted -ErrorAction Stop
        Write-Host "  [✓] Updated variable '$VariableName'" -ForegroundColor Green
    }
    catch {
        # Create if not exists
        try {
            New-AzAutomationVariable `
                -ResourceGroupName $script:ResourceGroupName `
                -AutomationAccountName $script:AutomationAccountName `
                -Name $VariableName `
                -Value $Value `
                -Encrypted $Encrypted -ErrorAction Stop
            Write-Host "  [✓] Created variable '$VariableName'" -ForegroundColor Green
        }
        catch {
            Write-Host "  [ERROR] Failed to set variable '$VariableName': $_" -ForegroundColor Red
        }
    }
}

function Get-GroupNameById {
    param([string]$GroupId)
    try {
        $g = Get-MgGroup -GroupId $GroupId -Property "displayName" -ErrorAction Stop
        return $g.DisplayName
    }
    catch { return $GroupId }
}

# ═══════════════════════════════════════════════════════════════════════════════
# MAIN MENU
# ═══════════════════════════════════════════════════════════════════════════════

function Show-MainMenu {
    Write-Host "  ┌───────────────────────────────────────────────────────────────┐" -ForegroundColor DarkGray
    Write-Host "  │                         MAIN MENU                             │" -ForegroundColor DarkGray
    Write-Host "  ├───────────────────────────────────────────────────────────────┤" -ForegroundColor DarkGray
    Write-Host "  │                                                               │" -ForegroundColor DarkGray
    Write-Host "  │  " -ForegroundColor DarkGray -NoNewline
    Write-Host "── SETUP & DEPLOY ─────────────────────────────────────────" -ForegroundColor DarkCyan -NoNewline
    Write-Host "│" -ForegroundColor DarkGray
    Write-Host "  │   " -ForegroundColor DarkGray -NoNewline
    Write-Host "[1]" -ForegroundColor Yellow -NoNewline
    Write-Host "  Create App Registration (Entra ID)" -ForegroundColor White -NoNewline
    Write-Host "                  │" -ForegroundColor DarkGray
    Write-Host "  │   " -ForegroundColor DarkGray -NoNewline
    Write-Host "[2]" -ForegroundColor Yellow -NoNewline
    Write-Host "  Manage Secure Credentials" -ForegroundColor White -NoNewline
    Write-Host "                            │" -ForegroundColor DarkGray
    Write-Host "  │   " -ForegroundColor DarkGray -NoNewline
    Write-Host "[3]" -ForegroundColor Green -NoNewline
    Write-Host "  Deploy to Azure" -ForegroundColor White -NoNewline
    Write-Host "                                    │" -ForegroundColor DarkGray
    Write-Host "  │                                                               │" -ForegroundColor DarkGray
    Write-Host "  │  " -ForegroundColor DarkGray -NoNewline
    Write-Host "── STUDENT MANAGEMENT ─────────────────────────────────────" -ForegroundColor DarkCyan -NoNewline
    Write-Host "│" -ForegroundColor DarkGray
    Write-Host "  │   " -ForegroundColor DarkGray -NoNewline
    Write-Host "[4]" -ForegroundColor Cyan -NoNewline
    Write-Host "  View Student Access Status" -ForegroundColor White -NoNewline
    Write-Host "                           │" -ForegroundColor DarkGray
    Write-Host "  │   " -ForegroundColor DarkGray -NoNewline
    Write-Host "[5]" -ForegroundColor Cyan -NoNewline
    Write-Host "  Transfer Student Between Classes" -ForegroundColor White -NoNewline
    Write-Host "                      │" -ForegroundColor DarkGray
    Write-Host "  │   " -ForegroundColor DarkGray -NoNewline
    Write-Host "[6]" -ForegroundColor Cyan -NoNewline
    Write-Host "  Suspend / Unsuspend Student" -ForegroundColor White -NoNewline
    Write-Host "                          │" -ForegroundColor DarkGray
    Write-Host "  │   " -ForegroundColor DarkGray -NoNewline
    Write-Host "[7]" -ForegroundColor Cyan -NoNewline
    Write-Host "  Create New Student" -ForegroundColor White -NoNewline
    Write-Host "                                  │" -ForegroundColor DarkGray
    Write-Host "  │   " -ForegroundColor DarkGray -NoNewline
    Write-Host "[8]" -ForegroundColor Cyan -NoNewline
    Write-Host "  Enable / Disable All Students" -ForegroundColor White -NoNewline
    Write-Host "                        │" -ForegroundColor DarkGray
    Write-Host "  │                                                               │" -ForegroundColor DarkGray
    Write-Host "  │  " -ForegroundColor DarkGray -NoNewline
    Write-Host "── SCHEDULE & POLICY ──────────────────────────────────────" -ForegroundColor DarkCyan -NoNewline
    Write-Host "│" -ForegroundColor DarkGray
    Write-Host "  │   " -ForegroundColor DarkGray -NoNewline
    Write-Host "[9]" -ForegroundColor Magenta -NoNewline
    Write-Host "  Manage Schedule Policies (CRUD)" -ForegroundColor White -NoNewline
    Write-Host "                      │" -ForegroundColor DarkGray
    Write-Host "  │   " -ForegroundColor DarkGray -NoNewline
    Write-Host "[10]" -ForegroundColor Magenta -NoNewline
    Write-Host " Manage Special Groups (Overrides)" -ForegroundColor White -NoNewline
    Write-Host "                    │" -ForegroundColor DarkGray
    Write-Host "  │                                                               │" -ForegroundColor DarkGray
    Write-Host "  │  " -ForegroundColor DarkGray -NoNewline
    Write-Host "── YEAR-END & BULK ────────────────────────────────────────" -ForegroundColor DarkCyan -NoNewline
    Write-Host "│" -ForegroundColor DarkGray
    Write-Host "  │   " -ForegroundColor DarkGray -NoNewline
    Write-Host "[11]" -ForegroundColor DarkYellow -NoNewline
    Write-Host " Promote Students (Year-End)" -ForegroundColor White -NoNewline
    Write-Host "                          │" -ForegroundColor DarkGray
    Write-Host "  │   " -ForegroundColor DarkGray -NoNewline
    Write-Host "[12]" -ForegroundColor DarkYellow -NoNewline
    Write-Host " Import Students from CSV" -ForegroundColor White -NoNewline
    Write-Host "                             │" -ForegroundColor DarkGray
    Write-Host "  │                                                               │" -ForegroundColor DarkGray
    Write-Host "  │  " -ForegroundColor DarkGray -NoNewline
    Write-Host "── CONFIGURATION ──────────────────────────────────────────" -ForegroundColor DarkCyan -NoNewline
    Write-Host "│" -ForegroundColor DarkGray
    Write-Host "  │   " -ForegroundColor DarkGray -NoNewline
    Write-Host "[C]" -ForegroundColor DarkGray -NoNewline
    Write-Host "  View Current Configuration" -ForegroundColor White -NoNewline
    Write-Host "                           │" -ForegroundColor DarkGray
    Write-Host "  │   " -ForegroundColor DarkGray -NoNewline
    Write-Host "[T]" -ForegroundColor DarkGray -NoNewline
    Write-Host "  Setup Test Environment" -ForegroundColor White -NoNewline
    Write-Host "                               │" -ForegroundColor DarkGray
    Write-Host "  │                                                               │" -ForegroundColor DarkGray
    Write-Host "  │   " -ForegroundColor DarkGray -NoNewline
    Write-Host "[Q]" -ForegroundColor DarkRed -NoNewline
    Write-Host "  Quit" -ForegroundColor White -NoNewline
    Write-Host "                                                  │" -ForegroundColor DarkGray
    Write-Host "  │                                                               │" -ForegroundColor DarkGray
    Write-Host "  └───────────────────────────────────────────────────────────────┘" -ForegroundColor DarkGray
    Write-Host ""
    if ($script:GraphConnected) {
        $ctx = Get-MgContext
        Write-Host "  Connected: $($ctx.Account)" -ForegroundColor DarkGreen
        Write-Host ""
    }
}

# ═══════════════════════════════════════════════════════════════════════════════
# 1 — CREATE APP REGISTRATION
# ═══════════════════════════════════════════════════════════════════════════════

function Invoke-CreateAppRegistration {
    Show-Banner
    Show-SectionHeader "CREATE APP REGISTRATION"

    Write-Host "  This will create an App Registration in Entra ID with the" -ForegroundColor Yellow
    Write-Host "  required Microsoft Graph API permissions:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "    • User.ReadWrite.All        - Enable/disable accounts" -ForegroundColor White
    Write-Host "    • Group.Read.All            - Read student groups" -ForegroundColor White
    Write-Host "    • GroupMember.ReadWrite.All  - Manage group membership" -ForegroundColor White
    Write-Host ""

    $confirm = Read-Host "  Create App Registration now? (Y/N)"
    if ($confirm -eq 'Y' -or $confirm -eq 'y') {
        $appScript = Join-Path $script:ProjectRoot "scripts\New-AppRegistration.ps1"
        & $appScript

        Write-Host ""
        Write-Host "  [!] IMPORTANT: Copy the values above!" -ForegroundColor Red
        Write-Host ""
        $saveSecure = Read-Host "  Save to secure local storage? (Y/N)"
        if ($saveSecure -eq 'Y' -or $saveSecure -eq 'y') {
            Invoke-ManageCredentials
        }
    }
    Wait-ForKey
}

# ═══════════════════════════════════════════════════════════════════════════════
# 2 — MANAGE CREDENTIALS
# ═══════════════════════════════════════════════════════════════════════════════

function Invoke-ManageCredentials {
    Show-Banner
    Show-SectionHeader "SECURE CREDENTIAL MANAGEMENT"

    Write-Host "  Credentials stored in Windows Credential Manager." -ForegroundColor Gray
    Write-Host ""

    Write-Host "  Current Status:" -ForegroundColor Cyan
    Write-Host "  ─────────────────────────────────────────────" -ForegroundColor DarkGray
    if (Get-Command -Name Get-AllSecureCredentials -ErrorAction SilentlyContinue) {
        $creds = Get-AllSecureCredentials
        if ($creds.Count -gt 0) {
            foreach ($cred in $creds) { Write-Host "    [✓] $($cred.Name)" -ForegroundColor Green }
        }
        else {
            Write-Host "    [!] No credentials stored yet" -ForegroundColor Yellow
        }
    }
    else {
        Write-Host "    [!] SecretManagement not initialized" -ForegroundColor Yellow
    }

    Write-Host ""
    Write-Host "    [1] Set/Update all credentials" -ForegroundColor White
    Write-Host "    [2] View stored credential names" -ForegroundColor White
    Write-Host "    [3] Clear all credentials" -ForegroundColor White
    Write-Host "    [B] Back" -ForegroundColor White
    Write-Host ""

    $choice = Read-Host "  Select option"
    switch ($choice) {
        '1' {
            if (Get-Command -Name Set-AllCredentials -ErrorAction SilentlyContinue) { Set-AllCredentials }
            else { Write-Host "  [ERROR] Credential manager not loaded" -ForegroundColor Red }
        }
        '2' {
            if (Get-Command -Name Get-AllSecureCredentials -ErrorAction SilentlyContinue) {
                $creds = Get-AllSecureCredentials
                foreach ($cred in $creds) { Write-Host "    • $($cred.Name)" -ForegroundColor White }
            }
        }
        '3' {
            if (Get-Command -Name Clear-AllCredentials -ErrorAction SilentlyContinue) { Clear-AllCredentials }
        }
    }
    if ($choice -ne 'B' -and $choice -ne 'b') { Wait-ForKey }
}

# ═══════════════════════════════════════════════════════════════════════════════
# 3 — DEPLOY TO AZURE (sub-menu: direct / GitHub / Bicep)
# ═══════════════════════════════════════════════════════════════════════════════

function Invoke-DeployMenu {
    Show-Banner
    Show-SectionHeader "DEPLOY TO AZURE" Green

    Write-Host "    [1] Deploy Direct (Az PowerShell — no GitHub)" -ForegroundColor White
    Write-Host "    [2] Deploy via GitHub Actions (OIDC)" -ForegroundColor White
    Write-Host "    [3] Deploy via Bicep Template (az CLI)" -ForegroundColor White
    Write-Host "    [B] Back" -ForegroundColor White
    Write-Host ""

    $choice = Read-Host "  Select option"
    switch ($choice) {
        '1' { Invoke-DeployAzureDirect }
        '2' { Invoke-GitHubActionsSetup }
        '3' { Invoke-DeployBicep }
    }
}

function Invoke-DeployAzureDirect {
    Write-Host ""
    Write-Host "  Choose credential source:" -ForegroundColor Cyan
    Write-Host "    [1] Secure local storage (recommended)" -ForegroundColor White
    Write-Host "    [2] Config file (config.json)" -ForegroundColor White
    Write-Host ""
    $source = Read-Host "  Select option"

    switch ($source) {
        '1' {
            if (-not (Test-SecureCredentialsExist)) {
                Write-Host "  [!] No secure credentials found." -ForegroundColor Yellow
                Wait-ForKey; return
            }
            $confirm = Read-Host "  Proceed with deployment? (Y/N)"
            if ($confirm -eq 'Y' -or $confirm -eq 'y') {
                $deployScript = Join-Path $script:ProjectRoot "scripts\Deploy-ToAzureDirect.ps1"
                & $deployScript -UseSecureCredentials
            }
        }
        '2' {
            if (-not (Test-ConfigExists)) { Wait-ForKey; return }
            $configPath = Get-ConfigPath
            $deployScript = Join-Path $script:ProjectRoot "scripts\Deploy-StudentAccessAutomation.ps1"
            & $deployScript -ConfigPath $configPath
        }
    }
    Wait-ForKey
}

function Invoke-GitHubActionsSetup {
    Write-Host ""
    Write-Host "  This sets up Azure-GitHub OIDC federation." -ForegroundColor Yellow
    Write-Host ""

    $setupFederation = Read-Host "  Set up federation now? (Y/N)"
    if ($setupFederation -eq 'Y' -or $setupFederation -eq 'y') {
        $federationScript = Join-Path $script:ProjectRoot "scripts\New-GitHubFederation.ps1"
        if (Test-Path $federationScript) {
            $repoName = Read-Host "  Enter GitHub repo (format: owner/repo)"
            & $federationScript -GitHubRepo $repoName
        }
        else { Write-Host "  [ERROR] Federation script not found." -ForegroundColor Red }
    }

    Write-Host ""
    Write-Host "  Required GitHub Secrets:" -ForegroundColor Cyan
    Write-Host "    AZURE_CLIENT_ID, AZURE_TENANT_ID, AZURE_SUBSCRIPTION_ID" -ForegroundColor White
    Write-Host "    STUDENT_GROUP_ID" -ForegroundColor White
    Wait-ForKey
}

function Invoke-DeployBicep {
    $azCli = Get-Command az -ErrorAction SilentlyContinue
    if (-not $azCli) {
        Write-Host "  [ERROR] Azure CLI not found." -ForegroundColor Red
        Wait-ForKey; return
    }

    Write-Host ""
    Write-Host "    [1] Secure local storage" -ForegroundColor White
    Write-Host "    [2] Enter manually" -ForegroundColor White
    Write-Host ""
    $source = Read-Host "  Select option"

    if ($source -eq '1') {
        if (-not (Test-SecureCredentialsExist)) { Write-Host "  [!] No credentials." -ForegroundColor Yellow; Wait-ForKey; return }
        $creds = Get-CredentialsAsHashtable
        $TenantId = $creds.TenantId; $StudentGroupId = $creds.StudentGroupId
    }
    elseif ($source -eq '2') {
        $TenantId = Read-Host "  Enter TenantId"
        $StudentGroupId = Read-Host "  Enter StudentGroupId"
    }
    else { return }

    $ResourceGroup = "rg-student-access-automation"
    Write-Host "  Logging in to Azure..." -ForegroundColor Yellow
    az login --tenant $TenantId
    az group create --name $ResourceGroup --location westeurope
    $bicepPath = Join-Path $script:ProjectRoot "infrastructure\main.bicep"
    az deployment group create --resource-group $ResourceGroup --template-file $bicepPath `
        --parameters tenantId=$TenantId studentGroupId=$StudentGroupId enableTime="07:55" disableTime="16:05"
    Write-Host "  [✓] Bicep deployment complete!" -ForegroundColor Green
    Wait-ForKey
}

# ═══════════════════════════════════════════════════════════════════════════════
# 4 — VIEW STUDENT ACCESS STATUS
# ═══════════════════════════════════════════════════════════════════════════════

function Invoke-ViewStudentStatus {
    Show-Banner
    Show-SectionHeader "STUDENT ACCESS STATUS"

    if (-not (Connect-GraphInteractive)) { Wait-ForKey; return }

    # Get StudentGroupId from config or prompt
    $groupId = $null
    $configPath = Get-ConfigPath
    if (Test-Path $configPath) {
        $cfg = Get-Content $configPath | ConvertFrom-Json
        if ($cfg.StudentGroupId -and $cfg.StudentGroupId -notlike "*<*") {
            $groupId = $cfg.StudentGroupId
        }
    }
    if (-not $groupId) { $groupId = Read-Host "  Enter Student Group ID" }

    Write-Host ""
    Write-Host "  Loading students from group..." -ForegroundColor Yellow
    $members = Get-MgGroupMember -GroupId $groupId -All

    $enabled = 0; $disabled = 0; $total = 0
    $studentList = @()

    foreach ($m in $members) {
        $user = Get-MgUser -UserId $m.Id -Property "displayName,accountEnabled,userPrincipalName,department" -ErrorAction SilentlyContinue
        if ($user) {
            $total++
            if ($user.AccountEnabled) { $enabled++ } else { $disabled++ }
            $studentList += [PSCustomObject]@{
                DisplayName = $user.DisplayName
                UPN         = $user.UserPrincipalName
                Department  = $user.Department
                Enabled     = $user.AccountEnabled
            }
        }
    }

    Write-Host ""
    Write-Host "  ┌─────────────────────────────────────────────────────────────┐" -ForegroundColor DarkGray
    Write-Host "  │  Total: $total   Enabled: " -ForegroundColor DarkGray -NoNewline
    Write-Host "$enabled" -ForegroundColor Green -NoNewline
    Write-Host "   Disabled: " -ForegroundColor DarkGray -NoNewline
    Write-Host "$disabled" -ForegroundColor Red -NoNewline
    Write-Host "                         │" -ForegroundColor DarkGray
    Write-Host "  └─────────────────────────────────────────────────────────────┘" -ForegroundColor DarkGray
    Write-Host ""

    # Filter options
    Write-Host "    [A] Show all students" -ForegroundColor White
    Write-Host "    [E] Show enabled only" -ForegroundColor White
    Write-Host "    [D] Show disabled only" -ForegroundColor White
    Write-Host "    [S] Search by name" -ForegroundColor White
    Write-Host "    [B] Back" -ForegroundColor White
    Write-Host ""

    $filter = Read-Host "  Select view"
    $filtered = $studentList

    switch ($filter.ToUpper()) {
        'E' { $filtered = $studentList | Where-Object { $_.Enabled } }
        'D' { $filtered = $studentList | Where-Object { -not $_.Enabled } }
        'S' {
            $search = Read-Host "  Enter search term"
            $filtered = $studentList | Where-Object { $_.DisplayName -like "*$search*" -or $_.UPN -like "*$search*" }
        }
        'B' { return }
    }

    Write-Host ""
    $filtered | Format-Table -Property @(
        @{Label="Name"; Expression={$_.DisplayName}; Width=30},
        @{Label="UPN"; Expression={$_.UPN}; Width=35},
        @{Label="Class"; Expression={$_.Department}; Width=10},
        @{Label="Status"; Expression={ if($_.Enabled){"Enabled"}else{"Disabled"} }; Width=10}
    ) -AutoSize

    Wait-ForKey
}

# ═══════════════════════════════════════════════════════════════════════════════
# 5 — TRANSFER STUDENT BETWEEN CLASSES
# ═══════════════════════════════════════════════════════════════════════════════

function Invoke-TransferStudent {
    Show-Banner
    Show-SectionHeader "TRANSFER STUDENT BETWEEN CLASSES"

    if (-not (Connect-GraphInteractive)) { Wait-ForKey; return }

    $searchTerm = Read-Host "  Search student by name or email"
    Write-Host "  Searching..." -ForegroundColor Yellow

    $users = Get-MgUser -Filter "startswith(displayName,'$searchTerm') or startswith(userPrincipalName,'$searchTerm')" `
        -Property "id,displayName,userPrincipalName,department" -Top 10

    if ($users.Count -eq 0) {
        Write-Host "  No students found." -ForegroundColor Yellow
        Wait-ForKey; return
    }

    Write-Host ""
    $i = 1
    foreach ($u in $users) {
        Write-Host "    [$i] $($u.DisplayName) ($($u.UserPrincipalName)) — Class: $($u.Department)" -ForegroundColor White
        $i++
    }
    Write-Host ""

    $sel = Read-Host "  Select student number"
    $student = $users[[int]$sel - 1]

    if (-not $student) { Write-Host "  Invalid selection." -ForegroundColor Red; Wait-ForKey; return }

    Write-Host ""
    Write-Host "  Selected: $($student.DisplayName)" -ForegroundColor Green
    Write-Host "  Current class: $($student.Department)" -ForegroundColor White
    Write-Host ""

    # List available class groups
    Write-Host "  Available class groups:" -ForegroundColor Cyan
    $configPath = Get-ConfigPath
    $groupId = $null
    if (Test-Path $configPath) {
        $cfg = Get-Content $configPath | ConvertFrom-Json
        if ($cfg.StudentGroupId) { $groupId = $cfg.StudentGroupId }
    }

    # Get all groups that look like class groups
    $allGroups = Get-MgGroup -Filter "startswith(displayName,'Demo-Students') or startswith(displayName,'Students-')" `
        -Property "id,displayName" -Top 50

    if ($allGroups.Count -eq 0) {
        $allGroups = Get-MgGroup -Search "displayName:Students" -Header @{ ConsistencyLevel = 'eventual' } `
            -Property "id,displayName" -Top 50
    }

    $i = 1
    foreach ($g in $allGroups) {
        Write-Host "    [$i] $($g.DisplayName) ($($g.Id))" -ForegroundColor White
        $i++
    }
    Write-Host ""

    $fromSel = Read-Host "  Select current group number (to remove from)"
    $toSel = Read-Host "  Select new group number (to add to)"
    $reason = Read-Host "  Reason for transfer"

    $fromGroup = $allGroups[[int]$fromSel - 1]
    $toGroup = $allGroups[[int]$toSel - 1]

    Write-Host ""
    Write-Host "  Transfer: $($student.DisplayName)" -ForegroundColor Yellow
    Write-Host "    From: $($fromGroup.DisplayName)" -ForegroundColor Red
    Write-Host "    To:   $($toGroup.DisplayName)" -ForegroundColor Green
    Write-Host "    Reason: $reason" -ForegroundColor White
    Write-Host ""

    $confirm = Read-Host "  Confirm transfer? (Y/N)"
    if ($confirm -eq 'Y' -or $confirm -eq 'y') {
        try {
            # Remove from old group
            Remove-MgGroupMemberByRef -GroupId $fromGroup.Id -DirectoryObjectId $student.Id -ErrorAction Stop
            Write-Host "  [✓] Removed from $($fromGroup.DisplayName)" -ForegroundColor Green
        }
        catch {
            Write-Host "  [WARNING] Could not remove from old group: $_" -ForegroundColor Yellow
        }

        try {
            # Add to new group
            $body = @{ "@odata.id" = "https://graph.microsoft.com/v1.0/directoryObjects/$($student.Id)" }
            New-MgGroupMemberByRef -GroupId $toGroup.Id -BodyParameter $body -ErrorAction Stop
            Write-Host "  [✓] Added to $($toGroup.DisplayName)" -ForegroundColor Green
        }
        catch {
            if ($_ -like "*already exist*") {
                Write-Host "  [✓] Already a member of $($toGroup.DisplayName)" -ForegroundColor Yellow
            }
            else {
                Write-Host "  [ERROR] Could not add to new group: $_" -ForegroundColor Red
            }
        }

        # Update department
        try {
            # Extract class name from group display name (e.g. "Demo-Students-8A" → "8A")
            $className = ($toGroup.DisplayName -split '-')[-1]
            Update-MgUser -UserId $student.Id -Department $className -ErrorAction Stop
            Write-Host "  [✓] Updated department to '$className'" -ForegroundColor Green
        }
        catch {
            Write-Host "  [WARNING] Could not update department: $_" -ForegroundColor Yellow
        }

        Write-Host ""
        Write-Host "  [✓] Transfer complete!" -ForegroundColor Green
    }
    Wait-ForKey
}

# ═══════════════════════════════════════════════════════════════════════════════
# 6 — SUSPEND / UNSUSPEND STUDENT
# ═══════════════════════════════════════════════════════════════════════════════

function Invoke-ManageSuspension {
    Show-Banner
    Show-SectionHeader "SUSPEND / UNSUSPEND STUDENT" Red

    if (-not (Connect-GraphInteractive)) { Wait-ForKey; return }

    Write-Host "    [1] Suspend a student (disable + set end date)" -ForegroundColor White
    Write-Host "    [2] Unsuspend a student (re-enable immediately)" -ForegroundColor White
    Write-Host "    [3] View all current suspensions" -ForegroundColor White
    Write-Host "    [B] Back" -ForegroundColor White
    Write-Host ""

    $choice = Read-Host "  Select option"

    switch ($choice) {
        '1' {
            $searchTerm = Read-Host "  Search student by name"
            $users = Get-MgUser -Filter "startswith(displayName,'$searchTerm')" `
                -Property "id,displayName,userPrincipalName,accountEnabled" -Top 10

            if ($users.Count -eq 0) { Write-Host "  No students found." -ForegroundColor Yellow; Wait-ForKey; return }

            $i = 1
            foreach ($u in $users) {
                $status = if ($u.AccountEnabled) { "Enabled" } else { "Disabled" }
                Write-Host "    [$i] $($u.DisplayName) ($($u.UserPrincipalName)) — $status" -ForegroundColor White
                $i++
            }
            Write-Host ""

            $sel = Read-Host "  Select student number"
            $student = $users[[int]$sel - 1]
            if (-not $student) { Write-Host "  Invalid." -ForegroundColor Red; Wait-ForKey; return }

            $endDate = Read-Host "  Suspension end date (yyyy-MM-dd)"
            $reason = Read-Host "  Reason"

            Write-Host ""
            Write-Host "  Suspending: $($student.DisplayName)" -ForegroundColor Red
            Write-Host "  Until:      $endDate" -ForegroundColor White
            Write-Host "  Reason:     $reason" -ForegroundColor White
            Write-Host ""

            $confirm = Read-Host "  Confirm? (Y/N)"
            if ($confirm -eq 'Y' -or $confirm -eq 'y') {
                # Disable account
                Update-MgUser -UserId $student.Id -AccountEnabled:$false
                Write-Host "  [✓] Account disabled" -ForegroundColor Green

                # Add to SuspendedStudents automation variable
                try {
                    $varValue = Get-AutomationVariableValue -VariableName 'SuspendedStudents'
                    $suspensions = @()
                    if ($varValue) {
                        $suspensions = @($varValue | ConvertFrom-Json)
                    }

                    $suspensions += @{
                        userId      = $student.Id
                        displayName = $student.DisplayName
                        upn         = $student.UserPrincipalName
                        reason      = $reason
                        startDate   = (Get-Date).ToString("yyyy-MM-dd")
                        endDate     = $endDate
                        suspendedBy = (Get-MgContext).Account
                    }

                    Set-AutomationVariableValue -VariableName 'SuspendedStudents' -Value ($suspensions | ConvertTo-Json -Depth 5 -Compress)
                    Write-Host "  [✓] Suspension recorded in Azure Automation" -ForegroundColor Green
                }
                catch {
                    Write-Host "  [WARNING] Could not update Automation variable: $_" -ForegroundColor Yellow
                    Write-Host "  Account is disabled but suspension record not saved to cloud." -ForegroundColor Yellow
                }
            }
        }
        '2' {
            # View current suspensions and unsuspend
            try {
                $varValue = Get-AutomationVariableValue -VariableName 'SuspendedStudents'
                if (-not $varValue -or $varValue -eq '[]') {
                    Write-Host "  No suspended students found." -ForegroundColor Yellow
                    Wait-ForKey; return
                }
                $suspensions = @($varValue | ConvertFrom-Json)
            }
            catch {
                Write-Host "  Could not load suspensions: $_" -ForegroundColor Yellow
                Wait-ForKey; return
            }

            $i = 1
            foreach ($s in $suspensions) {
                Write-Host "    [$i] $($s.displayName) — Until: $($s.endDate) — Reason: $($s.reason)" -ForegroundColor White
                $i++
            }
            Write-Host ""

            $sel = Read-Host "  Select student to unsuspend"
            $suspension = $suspensions[[int]$sel - 1]
            if (-not $suspension) { Write-Host "  Invalid." -ForegroundColor Red; Wait-ForKey; return }

            $confirm = Read-Host "  Re-enable $($suspension.displayName)? (Y/N)"
            if ($confirm -eq 'Y' -or $confirm -eq 'y') {
                Update-MgUser -UserId $suspension.userId -AccountEnabled:$true
                Write-Host "  [✓] Account re-enabled" -ForegroundColor Green

                # Remove from suspension list
                $remaining = $suspensions | Where-Object { $_.userId -ne $suspension.userId }
                Set-AutomationVariableValue -VariableName 'SuspendedStudents' -Value (@($remaining) | ConvertTo-Json -Depth 5 -Compress)
                Write-Host "  [✓] Suspension record removed" -ForegroundColor Green
            }
        }
        '3' {
            try {
                $varValue = Get-AutomationVariableValue -VariableName 'SuspendedStudents'
                if (-not $varValue -or $varValue -eq '[]') {
                    Write-Host "  No suspended students." -ForegroundColor Yellow
                    Wait-ForKey; return
                }
                $suspensions = @($varValue | ConvertFrom-Json)
                Write-Host ""
                Write-Host "  Currently Suspended Students:" -ForegroundColor Red
                Write-Host "  ─────────────────────────────────────────────" -ForegroundColor DarkGray
                foreach ($s in $suspensions) {
                    $daysLeft = ([datetime]::Parse($s.endDate) - (Get-Date)).Days
                    $color = if ($daysLeft -le 1) { "Yellow" } else { "White" }
                    Write-Host "    $($s.displayName)" -ForegroundColor $color -NoNewline
                    Write-Host " — Until: $($s.endDate) ($daysLeft days left)" -ForegroundColor Gray -NoNewline
                    Write-Host " — $($s.reason)" -ForegroundColor DarkGray
                }
            }
            catch {
                Write-Host "  Could not load suspensions." -ForegroundColor Yellow
            }
        }
    }
    Wait-ForKey
}

# ═══════════════════════════════════════════════════════════════════════════════
# 7 — CREATE NEW STUDENT
# ═══════════════════════════════════════════════════════════════════════════════

function Invoke-CreateStudent {
    Show-Banner
    Show-SectionHeader "CREATE NEW STUDENT"

    if (-not (Connect-GraphInteractive)) { Wait-ForKey; return }

    Write-Host "  Enter student details:" -ForegroundColor Cyan
    Write-Host ""

    $firstName = Read-Host "  First name"
    $lastName = Read-Host "  Last name"
    $displayName = "$firstName $lastName"

    $configPath = Get-ConfigPath
    $domain = "yourschool.onmicrosoft.com"
    if (Test-Path $configPath) {
        $cfg = Get-Content $configPath | ConvertFrom-Json
        if ($cfg.TenantId) {
            # Try to get domain from context
            $ctx = Get-MgContext
            if ($ctx.Account -match '@(.+)$') { $domain = $Matches[1] }
        }
    }

    $upnSuggestion = "$($firstName.ToLower()).$($lastName.ToLower())@$domain"
    $upn = Read-Host "  UPN [$upnSuggestion]"
    if (-not $upn) { $upn = $upnSuggestion }

    $className = Read-Host "  Class / Department (e.g. 8A)"
    $tempPassword = Read-Host "  Temporary password"

    # Select group
    Write-Host ""
    Write-Host "  Select class group to add student to:" -ForegroundColor Cyan
    $allGroups = Get-MgGroup -Filter "startswith(displayName,'Demo-Students') or startswith(displayName,'Students-')" `
        -Property "id,displayName" -Top 50
    
    if ($allGroups.Count -eq 0) {
        $allGroups = Get-MgGroup -Search "displayName:Students" -Header @{ ConsistencyLevel = 'eventual' } `
            -Property "id,displayName" -Top 50
    }

    $i = 1
    foreach ($g in $allGroups) {
        Write-Host "    [$i] $($g.DisplayName)" -ForegroundColor White
        $i++
    }
    Write-Host ""
    $groupSel = Read-Host "  Select group number"
    $selectedGroup = $allGroups[[int]$groupSel - 1]

    Write-Host ""
    Write-Host "  Summary:" -ForegroundColor Yellow
    Write-Host "    Name:     $displayName" -ForegroundColor White
    Write-Host "    UPN:      $upn" -ForegroundColor White
    Write-Host "    Class:    $className" -ForegroundColor White
    Write-Host "    Group:    $($selectedGroup.DisplayName)" -ForegroundColor White
    Write-Host "    Password: $tempPassword" -ForegroundColor White
    Write-Host ""

    $confirm = Read-Host "  Create student? (Y/N)"
    if ($confirm -eq 'Y' -or $confirm -eq 'y') {
        try {
            $passwordProfile = @{
                Password                      = $tempPassword
                ForceChangePasswordNextSignIn = $true
            }

            $newUser = New-MgUser `
                -DisplayName $displayName `
                -UserPrincipalName $upn `
                -MailNickname ($upn -split '@')[0] `
                -Department $className `
                -AccountEnabled:$true `
                -PasswordProfile $passwordProfile `
                -UsageLocation "NO"

            Write-Host "  [✓] User created: $($newUser.Id)" -ForegroundColor Green

            # Add to class group
            $body = @{ "@odata.id" = "https://graph.microsoft.com/v1.0/directoryObjects/$($newUser.Id)" }
            New-MgGroupMemberByRef -GroupId $selectedGroup.Id -BodyParameter $body
            Write-Host "  [✓] Added to $($selectedGroup.DisplayName)" -ForegroundColor Green

            # Add to main student group
            $mainGroupId = $null
            if (Test-Path $configPath) {
                $cfg = Get-Content $configPath | ConvertFrom-Json
                if ($cfg.StudentGroupId -and $cfg.StudentGroupId -notlike "*<*") {
                    $mainGroupId = $cfg.StudentGroupId
                }
            }
            if ($mainGroupId) {
                try {
                    New-MgGroupMemberByRef -GroupId $mainGroupId -BodyParameter $body -ErrorAction Stop
                    $mainGroupName = Get-GroupNameById -GroupId $mainGroupId
                    Write-Host "  [✓] Added to main student group ($mainGroupName)" -ForegroundColor Green
                }
                catch {
                    if ($_ -like "*already exist*") {
                        Write-Host "  [✓] Already in main student group" -ForegroundColor Yellow
                    }
                }
            }

            Write-Host ""
            Write-Host "  [✓] Student created successfully!" -ForegroundColor Green
        }
        catch {
            Write-Host "  [ERROR] Failed to create student: $_" -ForegroundColor Red
        }
    }
    Wait-ForKey
}

# ═══════════════════════════════════════════════════════════════════════════════
# 8 — ENABLE / DISABLE ALL STUDENTS
# ═══════════════════════════════════════════════════════════════════════════════

function Invoke-EnableDisableAll {
    Show-Banner
    Show-SectionHeader "ENABLE / DISABLE ALL STUDENTS"

    Write-Host "    [1] Enable all students (morning)" -ForegroundColor Green
    Write-Host "    [2] Disable all students (afternoon)" -ForegroundColor Red
    Write-Host "    [B] Back" -ForegroundColor White
    Write-Host ""

    $choice = Read-Host "  Select option"
    if ($choice -eq 'B' -or $choice -eq 'b') { return }

    $whatIf = Read-Host "  Run in WhatIf mode (no changes)? (Y/N)"

    $testScript = Join-Path $script:ProjectRoot "scripts\Test-StudentAccess.ps1"
    $action = if ($choice -eq '1') { "Enable" } else { "Disable" }

    # Get config
    $configPath = $null
    if (Test-SecureCredentialsExist) {
        $creds = Get-CredentialsAsHashtable
        $tempConfig = @{
            TenantId       = $creds.TenantId
            ClientId       = $creds.ClientId
            ClientSecret   = $creds.ClientSecret
            StudentGroupId = $creds.StudentGroupId
            RevokeTokens   = $true
        }
        $tempPath = Join-Path $env:TEMP "student-access-temp.json"
        $tempConfig | ConvertTo-Json | Set-Content $tempPath
        $configPath = $tempPath
    }
    else {
        if (-not (Test-ConfigExists)) { Wait-ForKey; return }
        $configPath = Get-ConfigPath
    }

    if ($choice -eq '2' -and ($whatIf -ne 'Y' -and $whatIf -ne 'y')) {
        $confirm = Read-Host "  [!] Are you sure you want to DISABLE all accounts? (type YES)"
        if ($confirm -ne 'YES') { Wait-ForKey; return }
    }

    if ($whatIf -eq 'Y' -or $whatIf -eq 'y') {
        & $testScript -Action $action -ConfigPath $configPath -WhatIf
    }
    else {
        & $testScript -Action $action -ConfigPath $configPath
    }

    # Cleanup temp file
    if ($configPath -like "*student-access-temp*") {
        Remove-Item $configPath -Force -ErrorAction SilentlyContinue
    }
    Wait-ForKey
}

# ═══════════════════════════════════════════════════════════════════════════════
# 9 — MANAGE SCHEDULE POLICIES (CRUD)
# ═══════════════════════════════════════════════════════════════════════════════

function Invoke-ManageSchedulePolicies {
    Show-Banner
    Show-SectionHeader "MANAGE SCHEDULE POLICIES" Magenta

    Write-Host "  Schedule policies control WHEN student accounts are enabled" -ForegroundColor Gray
    Write-Host "  and disabled each day. They are stored as an Azure Automation" -ForegroundColor Gray
    Write-Host "  variable and processed by Apply-SchedulePolicies runbook." -ForegroundColor Gray
    Write-Host ""

    # Try to load existing policies
    $policies = @()
    try {
        $varValue = Get-AutomationVariableValue -VariableName 'SchedulePolicies'
        if ($varValue) { $policies = @($varValue | ConvertFrom-Json) }
    }
    catch { }

    if ($policies.Count -gt 0) {
        Write-Host "  Current Policies:" -ForegroundColor Cyan
        Write-Host "  ─────────────────────────────────────────────" -ForegroundColor DarkGray
        $i = 1
        foreach ($p in $policies) {
            $status = if ($p.isActive) { "[ACTIVE]" } else { "[INACTIVE]" }
            $statusColor = if ($p.isActive) { "Green" } else { "DarkGray" }
            Write-Host "    [$i] " -ForegroundColor White -NoNewline
            Write-Host $status -ForegroundColor $statusColor -NoNewline
            Write-Host " $($p.name) — Enable: $($p.enableTime), Disable: $($p.disableTime)" -ForegroundColor White
            Write-Host "        Days: $($p.daysOfWeek -join ', ')" -ForegroundColor Gray
            Write-Host "        Groups: $($p.groupIds -join ', ')" -ForegroundColor Gray
            $i++
        }
    }
    else {
        Write-Host "  No policies configured yet." -ForegroundColor Yellow
    }

    Write-Host ""
    Write-Host "    [1] Create new policy" -ForegroundColor White
    Write-Host "    [2] Edit existing policy" -ForegroundColor White
    Write-Host "    [3] Toggle policy active/inactive" -ForegroundColor White
    Write-Host "    [4] Delete policy" -ForegroundColor White
    Write-Host "    [5] Reset to default (07:55—16:05 Mon-Fri)" -ForegroundColor White
    Write-Host "    [B] Back" -ForegroundColor White
    Write-Host ""

    $choice = Read-Host "  Select option"

    switch ($choice) {
        '1' {
            Write-Host ""
            $name = Read-Host "  Policy name (e.g. 'Standard School Hours')"
            $enableTime = Read-Host "  Enable time (HH:mm, e.g. 07:55)"
            $disableTime = Read-Host "  Disable time (HH:mm, e.g. 16:05)"
            $daysInput = Read-Host "  Days (comma-separated, e.g. Monday,Tuesday,Wednesday,Thursday,Friday)"
            $days = $daysInput -split ',' | ForEach-Object { $_.Trim() }

            Write-Host ""
            Write-Host "  Select groups this policy applies to:" -ForegroundColor Cyan

            if (-not (Connect-GraphInteractive)) { Wait-ForKey; return }
            $allGroups = Get-MgGroup -Filter "startswith(displayName,'Demo-Students') or startswith(displayName,'Students-')" `
                -Property "id,displayName" -Top 50
            $i = 1
            foreach ($g in $allGroups) {
                Write-Host "    [$i] $($g.DisplayName) ($($g.Id))" -ForegroundColor White
                $i++
            }
            Write-Host ""
            $groupSels = Read-Host "  Select group numbers (comma-separated, e.g. 1,2,3)"
            $selectedGroupIds = @()
            foreach ($s in ($groupSels -split ',')) {
                $idx = [int]$s.Trim() - 1
                if ($idx -ge 0 -and $idx -lt $allGroups.Count) {
                    $selectedGroupIds += $allGroups[$idx].Id
                }
            }

            $newPolicy = @{
                id          = [guid]::NewGuid().ToString()
                name        = $name
                enableTime  = $enableTime
                disableTime = $disableTime
                daysOfWeek  = $days
                groupIds    = $selectedGroupIds
                isActive    = $true
                createdAt   = (Get-Date).ToString("o")
            }

            $policies += $newPolicy
            Set-AutomationVariableValue -VariableName 'SchedulePolicies' -Value ($policies | ConvertTo-Json -Depth 5 -Compress)
            Write-Host "  [✓] Policy '$name' created!" -ForegroundColor Green
        }
        '2' {
            if ($policies.Count -eq 0) { Write-Host "  No policies to edit." -ForegroundColor Yellow; Wait-ForKey; return }
            $sel = Read-Host "  Select policy number to edit"
            $idx = [int]$sel - 1
            if ($idx -lt 0 -or $idx -ge $policies.Count) { Write-Host "  Invalid." -ForegroundColor Red; Wait-ForKey; return }

            $p = $policies[$idx]
            Write-Host ""
            Write-Host "  Editing: $($p.name)" -ForegroundColor Yellow
            Write-Host "  (Press Enter to keep current value)" -ForegroundColor Gray
            Write-Host ""

            $newName = Read-Host "  Name [$($p.name)]"
            if ($newName) { $p.name = $newName }

            $newEnable = Read-Host "  Enable time [$($p.enableTime)]"
            if ($newEnable) { $p.enableTime = $newEnable }

            $newDisable = Read-Host "  Disable time [$($p.disableTime)]"
            if ($newDisable) { $p.disableTime = $newDisable }

            $newDays = Read-Host "  Days [$($p.daysOfWeek -join ',')]"
            if ($newDays) { $p.daysOfWeek = $newDays -split ',' | ForEach-Object { $_.Trim() } }

            $policies[$idx] = $p
            Set-AutomationVariableValue -VariableName 'SchedulePolicies' -Value ($policies | ConvertTo-Json -Depth 5 -Compress)
            Write-Host "  [✓] Policy updated!" -ForegroundColor Green
        }
        '3' {
            if ($policies.Count -eq 0) { Write-Host "  No policies." -ForegroundColor Yellow; Wait-ForKey; return }
            $sel = Read-Host "  Select policy number to toggle"
            $idx = [int]$sel - 1
            if ($idx -lt 0 -or $idx -ge $policies.Count) { Write-Host "  Invalid." -ForegroundColor Red; Wait-ForKey; return }

            $policies[$idx].isActive = -not $policies[$idx].isActive
            $state = if ($policies[$idx].isActive) { "ACTIVE" } else { "INACTIVE" }
            Set-AutomationVariableValue -VariableName 'SchedulePolicies' -Value ($policies | ConvertTo-Json -Depth 5 -Compress)
            Write-Host "  [✓] Policy '$($policies[$idx].name)' is now $state" -ForegroundColor Green
        }
        '4' {
            if ($policies.Count -eq 0) { Write-Host "  No policies." -ForegroundColor Yellow; Wait-ForKey; return }
            $sel = Read-Host "  Select policy number to delete"
            $idx = [int]$sel - 1
            if ($idx -lt 0 -or $idx -ge $policies.Count) { Write-Host "  Invalid." -ForegroundColor Red; Wait-ForKey; return }

            $pName = $policies[$idx].name
            $confirm = Read-Host "  Delete policy '$pName'? (Y/N)"
            if ($confirm -eq 'Y' -or $confirm -eq 'y') {
                $policies = @($policies | Where-Object { $_.id -ne $policies[$idx].id })
                Set-AutomationVariableValue -VariableName 'SchedulePolicies' -Value ($policies | ConvertTo-Json -Depth 5 -Compress)
                Write-Host "  [✓] Policy deleted" -ForegroundColor Green
            }
        }
        '5' {
            $confirm = Read-Host "  Reset to default policy? This removes all custom policies. (Y/N)"
            if ($confirm -eq 'Y' -or $confirm -eq 'y') {
                $groupId = $null
                if (Test-Path (Get-ConfigPath)) {
                    $cfg = Get-Content (Get-ConfigPath) | ConvertFrom-Json
                    if ($cfg.StudentGroupId -and $cfg.StudentGroupId -notlike "*<*") { $groupId = $cfg.StudentGroupId }
                }
                if (-not $groupId) { $groupId = Read-Host "  Enter main StudentGroupId" }

                $defaultPolicy = @(@{
                    id          = [guid]::NewGuid().ToString()
                    name        = "Standard School Hours"
                    enableTime  = "07:55"
                    disableTime = "16:05"
                    daysOfWeek  = @("Monday","Tuesday","Wednesday","Thursday","Friday")
                    groupIds    = @($groupId)
                    isActive    = $true
                    createdAt   = (Get-Date).ToString("o")
                })
                Set-AutomationVariableValue -VariableName 'SchedulePolicies' -Value ($defaultPolicy | ConvertTo-Json -Depth 5 -Compress)
                Write-Host "  [✓] Reset to default policy (07:55—16:05 Mon-Fri)" -ForegroundColor Green
            }
        }
    }
    Wait-ForKey
}

# ═══════════════════════════════════════════════════════════════════════════════
# 10 — MANAGE SPECIAL GROUPS (OVERRIDE SCHEDULES)
# ═══════════════════════════════════════════════════════════════════════════════

function Invoke-ManageSpecialGroups {
    Show-Banner
    Show-SectionHeader "MANAGE SPECIAL GROUPS (OVERRIDES)" Magenta

    Write-Host "  Special groups override normal schedule policies for their" -ForegroundColor Gray
    Write-Host "  members. E.g., 'After-School Program' students get extended" -ForegroundColor Gray
    Write-Host "  hours. Higher priority wins if a student is in multiple." -ForegroundColor Gray
    Write-Host ""

    # Load existing special groups
    $specialGroups = @()
    try {
        $varValue = Get-AutomationVariableValue -VariableName 'SpecialGroups'
        if ($varValue) { $specialGroups = @($varValue | ConvertFrom-Json) }
    }
    catch { }

    if ($specialGroups.Count -gt 0) {
        Write-Host "  Current Special Groups:" -ForegroundColor Cyan
        Write-Host "  ─────────────────────────────────────────────" -ForegroundColor DarkGray
        $i = 1
        foreach ($sg in $specialGroups) {
            $policyName = $sg.policyName
            if (-not $policyName) { $policyName = $sg.policyId }
            Write-Host "    [$i] $($sg.name) — Policy: $policyName — Priority: $($sg.priority)" -ForegroundColor White
            Write-Host "        Group: $($sg.groupId)" -ForegroundColor Gray
            $i++
        }
    }
    else {
        Write-Host "  No special groups configured." -ForegroundColor Yellow
    }

    Write-Host ""
    Write-Host "    [1] Create special group" -ForegroundColor White
    Write-Host "    [2] Delete special group" -ForegroundColor White
    Write-Host "    [3] Add student to special group" -ForegroundColor White
    Write-Host "    [4] Remove student from special group" -ForegroundColor White
    Write-Host "    [B] Back" -ForegroundColor White
    Write-Host ""

    $choice = Read-Host "  Select option"

    switch ($choice) {
        '1' {
            if (-not (Connect-GraphInteractive)) { Wait-ForKey; return }

            $name = Read-Host "  Special group name (e.g. 'After-School Program')"

            # Select Entra ID group
            Write-Host "  Select the Entra ID group:" -ForegroundColor Cyan
            $allGroups = Get-MgGroup -Search "displayName:$name" -Header @{ ConsistencyLevel = 'eventual' } `
                -Property "id,displayName" -Top 20
            if ($allGroups.Count -eq 0) {
                $allGroups = Get-MgGroup -Top 20 -Property "id,displayName"
            }
            $i = 1
            foreach ($g in $allGroups) {
                Write-Host "    [$i] $($g.DisplayName) ($($g.Id))" -ForegroundColor White
                $i++
            }
            Write-Host "    [N] Create new group in Entra ID" -ForegroundColor White
            Write-Host ""
            $gSel = Read-Host "  Select group"

            $groupId = $null
            if ($gSel -eq 'N' -or $gSel -eq 'n') {
                $newGroup = New-MgGroup -DisplayName $name -MailEnabled:$false -MailNickname ($name -replace '\s','') -SecurityEnabled:$true
                $groupId = $newGroup.Id
                Write-Host "  [✓] Created group: $($newGroup.Id)" -ForegroundColor Green
            }
            else {
                $groupId = $allGroups[[int]$gSel - 1].Id
            }

            # Select policy
            Write-Host ""
            Write-Host "  Select override policy:" -ForegroundColor Cyan
            $policies = @()
            try {
                $pVar = Get-AutomationVariableValue -VariableName 'SchedulePolicies'
                if ($pVar) { $policies = @($pVar | ConvertFrom-Json) }
            }
            catch { }

            if ($policies.Count -gt 0) {
                $i = 1
                foreach ($p in $policies) {
                    Write-Host "    [$i] $($p.name) ($($p.enableTime)—$($p.disableTime))" -ForegroundColor White
                    $i++
                }
            }
            else {
                Write-Host "  No policies exist — create one first in option [9]." -ForegroundColor Yellow
                Wait-ForKey; return
            }
            Write-Host ""
            $pSel = Read-Host "  Select policy number"
            $selectedPolicy = $policies[[int]$pSel - 1]

            $priority = Read-Host "  Priority (higher number = higher priority, e.g. 10)"

            $newSG = @{
                id         = [guid]::NewGuid().ToString()
                name       = $name
                groupId    = $groupId
                policyId   = $selectedPolicy.id
                policyName = $selectedPolicy.name
                priority   = [int]$priority
                createdAt  = (Get-Date).ToString("o")
            }

            $specialGroups += $newSG
            Set-AutomationVariableValue -VariableName 'SpecialGroups' -Value ($specialGroups | ConvertTo-Json -Depth 5 -Compress)
            Write-Host "  [✓] Special group '$name' created!" -ForegroundColor Green
        }
        '2' {
            if ($specialGroups.Count -eq 0) { Write-Host "  Nothing to delete." -ForegroundColor Yellow; Wait-ForKey; return }
            $sel = Read-Host "  Select special group number to delete"
            $idx = [int]$sel - 1
            if ($idx -lt 0 -or $idx -ge $specialGroups.Count) { Write-Host "  Invalid." -ForegroundColor Red; Wait-ForKey; return }

            $sgName = $specialGroups[$idx].name
            $confirm = Read-Host "  Delete '$sgName'? (Y/N)"
            if ($confirm -eq 'Y' -or $confirm -eq 'y') {
                $specialGroups = @($specialGroups | Where-Object { $_.id -ne $specialGroups[$idx].id })
                Set-AutomationVariableValue -VariableName 'SpecialGroups' -Value ($specialGroups | ConvertTo-Json -Depth 5 -Compress)
                Write-Host "  [✓] Deleted" -ForegroundColor Green
            }
        }
        '3' {
            if ($specialGroups.Count -eq 0) { Write-Host "  No special groups. Create one first." -ForegroundColor Yellow; Wait-ForKey; return }
            if (-not (Connect-GraphInteractive)) { Wait-ForKey; return }

            $sgSel = Read-Host "  Select special group number"
            $sg = $specialGroups[[int]$sgSel - 1]
            if (-not $sg) { Write-Host "  Invalid." -ForegroundColor Red; Wait-ForKey; return }

            $search = Read-Host "  Search student to add"
            $users = Get-MgUser -Filter "startswith(displayName,'$search')" -Property "id,displayName,userPrincipalName" -Top 10
            $i = 1
            foreach ($u in $users) {
                Write-Host "    [$i] $($u.DisplayName) ($($u.UserPrincipalName))" -ForegroundColor White
                $i++
            }
            Write-Host ""
            $uSel = Read-Host "  Select student number"
            $student = $users[[int]$uSel - 1]

            try {
                $body = @{ "@odata.id" = "https://graph.microsoft.com/v1.0/directoryObjects/$($student.Id)" }
                New-MgGroupMemberByRef -GroupId $sg.groupId -BodyParameter $body -ErrorAction Stop
                Write-Host "  [✓] $($student.DisplayName) added to $($sg.name)" -ForegroundColor Green
            }
            catch {
                if ($_ -like "*already exist*") {
                    Write-Host "  [✓] Already a member" -ForegroundColor Yellow
                }
                else { Write-Host "  [ERROR] $_" -ForegroundColor Red }
            }
        }
        '4' {
            if ($specialGroups.Count -eq 0) { Write-Host "  No special groups." -ForegroundColor Yellow; Wait-ForKey; return }
            if (-not (Connect-GraphInteractive)) { Wait-ForKey; return }

            $sgSel = Read-Host "  Select special group number"
            $sg = $specialGroups[[int]$sgSel - 1]
            if (-not $sg) { Write-Host "  Invalid." -ForegroundColor Red; Wait-ForKey; return }

            # List current members
            $members = Get-MgGroupMember -GroupId $sg.groupId -All
            if ($members.Count -eq 0) { Write-Host "  No members." -ForegroundColor Yellow; Wait-ForKey; return }

            $i = 1
            foreach ($m in $members) {
                $u = Get-MgUser -UserId $m.Id -Property "displayName,userPrincipalName" -ErrorAction SilentlyContinue
                if ($u) {
                    Write-Host "    [$i] $($u.DisplayName) ($($u.UserPrincipalName))" -ForegroundColor White
                }
                $i++
            }
            Write-Host ""
            $mSel = Read-Host "  Select member to remove"
            $member = $members[[int]$mSel - 1]
            try {
                Remove-MgGroupMemberByRef -GroupId $sg.groupId -DirectoryObjectId $member.Id -ErrorAction Stop
                Write-Host "  [✓] Removed from $($sg.name)" -ForegroundColor Green
            }
            catch { Write-Host "  [ERROR] $_" -ForegroundColor Red }
        }
    }
    Wait-ForKey
}

# ═══════════════════════════════════════════════════════════════════════════════
# 11 — PROMOTE STUDENTS (YEAR-END)
# ═══════════════════════════════════════════════════════════════════════════════

function Invoke-PromoteStudents {
    Show-Banner
    Show-SectionHeader "PROMOTE STUDENTS — YEAR-END" DarkYellow

    Write-Host "  This moves students between class groups for the new school" -ForegroundColor Gray
    Write-Host "  year. E.g., all students in '8A' move to '9A', etc." -ForegroundColor Gray
    Write-Host "  Graduated students (final year) can be disabled." -ForegroundColor Gray
    Write-Host ""
    Write-Host "  [!] This is a BULK operation. Review carefully!" -ForegroundColor Red
    Write-Host ""

    if (-not (Connect-GraphInteractive)) { Wait-ForKey; return }

    # List available groups
    $allGroups = Get-MgGroup -Filter "startswith(displayName,'Demo-Students') or startswith(displayName,'Students-')" `
        -Property "id,displayName" -Top 50
    if ($allGroups.Count -eq 0) {
        $allGroups = Get-MgGroup -Search "displayName:Students" -Header @{ ConsistencyLevel = 'eventual' } `
            -Property "id,displayName" -Top 50
    }

    Write-Host "  Available groups:" -ForegroundColor Cyan
    $i = 1
    foreach ($g in $allGroups) {
        $memberCount = (Get-MgGroupMember -GroupId $g.Id -All).Count
        Write-Host "    [$i] $($g.DisplayName) — $memberCount members" -ForegroundColor White
        $i++
    }
    Write-Host ""

    # Build promotion mappings
    $mappings = @()
    Write-Host "  Define promotion mappings (enter 'done' when finished):" -ForegroundColor Yellow
    Write-Host "  For each mapping, specify source group -> destination group" -ForegroundColor Gray
    Write-Host "  Leave destination blank for graduated students (will be disabled)" -ForegroundColor Gray
    Write-Host ""

    while ($true) {
        $fromSel = Read-Host "  Source group number (or 'done')"
        if ($fromSel -eq 'done') { break }

        $fromIdx = [int]$fromSel - 1
        if ($fromIdx -lt 0 -or $fromIdx -ge $allGroups.Count) {
            Write-Host "  Invalid group number." -ForegroundColor Red
            continue
        }

        $toSel = Read-Host "  Destination group number (blank = graduated/disabled)"
        $toGroupId = ""
        $toGroupName = "(Graduated — account disabled)"
        if ($toSel) {
            $toIdx = [int]$toSel - 1
            if ($toIdx -ge 0 -and $toIdx -lt $allGroups.Count) {
                $toGroupId = $allGroups[$toIdx].Id
                $toGroupName = $allGroups[$toIdx].DisplayName
            }
        }

        $mappings += @{
            fromGroupId   = $allGroups[$fromIdx].Id
            fromGroupName = $allGroups[$fromIdx].DisplayName
            toGroupId     = $toGroupId
            toGroupName   = $toGroupName
        }

        Write-Host "    Mapped: $($allGroups[$fromIdx].DisplayName) → $toGroupName" -ForegroundColor Green
        Write-Host ""
    }

    if ($mappings.Count -eq 0) {
        Write-Host "  No mappings defined." -ForegroundColor Yellow
        Wait-ForKey; return
    }

    # Summary
    Write-Host ""
    Write-Host "  ═══ PROMOTION SUMMARY ═══" -ForegroundColor Yellow
    foreach ($m in $mappings) {
        Write-Host "    $($m.fromGroupName) → $($m.toGroupName)" -ForegroundColor White
    }

    $disableGrads = Read-Host "  Disable graduated students? (Y/N)"
    Write-Host ""

    $confirm = Read-Host "  Execute promotion? This cannot be easily undone! (type YES)"
    if ($confirm -ne 'YES') { Write-Host "  Cancelled." -ForegroundColor Yellow; Wait-ForKey; return }

    # Execute: two-pass approach — collect all members first, then move
    $allMoves = @()
    foreach ($m in $mappings) {
        $members = Get-MgGroupMember -GroupId $m.fromGroupId -All
        foreach ($member in $members) {
            $allMoves += @{
                userId      = $member.Id
                fromGroupId = $m.fromGroupId
                toGroupId   = $m.toGroupId
                fromName    = $m.fromGroupName
                toName      = $m.toGroupName
            }
        }
    }

    Write-Host "  Processing $($allMoves.Count) student moves..." -ForegroundColor Yellow
    $success = 0; $failed = 0

    foreach ($move in $allMoves) {
        $user = Get-MgUser -UserId $move.userId -Property "displayName" -ErrorAction SilentlyContinue
        $userName = if ($user) { $user.DisplayName } else { $move.userId }

        try {
            # Remove from old group
            Remove-MgGroupMemberByRef -GroupId $move.fromGroupId -DirectoryObjectId $move.userId -ErrorAction Stop

            if ($move.toGroupId) {
                # Add to new group
                $body = @{ "@odata.id" = "https://graph.microsoft.com/v1.0/directoryObjects/$($move.userId)" }
                New-MgGroupMemberByRef -GroupId $move.toGroupId -BodyParameter $body -ErrorAction Stop

                # Update department
                $className = ($move.toName -split '-')[-1]
                Update-MgUser -UserId $move.userId -Department $className -ErrorAction SilentlyContinue

                Write-Host "    [✓] $userName: $($move.fromName) → $($move.toName)" -ForegroundColor Green
            }
            else {
                # Graduated
                if ($disableGrads -eq 'Y' -or $disableGrads -eq 'y') {
                    Update-MgUser -UserId $move.userId -AccountEnabled:$false -ErrorAction SilentlyContinue
                    Write-Host "    [✓] $userName: $($move.fromName) → GRADUATED (disabled)" -ForegroundColor Yellow
                }
                else {
                    Write-Host "    [✓] $userName: $($move.fromName) → GRADUATED (still enabled)" -ForegroundColor Yellow
                }
            }
            $success++
        }
        catch {
            Write-Host "    [✗] $userName: FAILED — $_" -ForegroundColor Red
            $failed++
        }
    }

    Write-Host ""
    Write-Host "  ═══ RESULTS ═══" -ForegroundColor Yellow
    Write-Host "    Success: $success" -ForegroundColor Green
    Write-Host "    Failed:  $failed" -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "Green" })
    Wait-ForKey
}

# ═══════════════════════════════════════════════════════════════════════════════
# 12 — IMPORT STUDENTS FROM CSV
# ═══════════════════════════════════════════════════════════════════════════════

function Invoke-ImportStudents {
    Show-Banner
    Show-SectionHeader "IMPORT STUDENTS FROM CSV"

    Write-Host "  CSV format required:" -ForegroundColor Cyan
    Write-Host "    FirstName,LastName,Class,Email (optional)" -ForegroundColor White
    Write-Host ""
    Write-Host "  Example:" -ForegroundColor Gray
    Write-Host "    John,Doe,8A,john.doe@school.no" -ForegroundColor Gray
    Write-Host "    Jane,Smith,9B," -ForegroundColor Gray
    Write-Host ""

    $csvPath = Read-Host "  Enter CSV file path"
    if (-not (Test-Path $csvPath)) {
        Write-Host "  [ERROR] File not found: $csvPath" -ForegroundColor Red
        Wait-ForKey; return
    }

    $students = Import-Csv $csvPath
    Write-Host "  Found $($students.Count) students in CSV" -ForegroundColor Yellow
    Write-Host ""

    # Preview
    $students | Select-Object -First 5 | Format-Table -AutoSize
    if ($students.Count -gt 5) { Write-Host "  ... and $($students.Count - 5) more" -ForegroundColor Gray }
    Write-Host ""

    $confirm = Read-Host "  Import these students? (Y/N)"
    if ($confirm -ne 'Y' -and $confirm -ne 'y') { Wait-ForKey; return }

    if (-not (Connect-GraphInteractive)) { Wait-ForKey; return }

    $configPath = Get-ConfigPath
    $domain = "yourschool.onmicrosoft.com"
    $ctx = Get-MgContext
    if ($ctx.Account -match '@(.+)$') { $domain = $Matches[1] }

    $mainGroupId = $null
    if (Test-Path $configPath) {
        $cfg = Get-Content $configPath | ConvertFrom-Json
        if ($cfg.StudentGroupId -and $cfg.StudentGroupId -notlike "*<*") { $mainGroupId = $cfg.StudentGroupId }
    }

    $success = 0; $failed = 0
    foreach ($s in $students) {
        $fn = $s.FirstName.Trim()
        $ln = $s.LastName.Trim()
        $cls = $s.Class.Trim()
        $email = if ($s.Email) { $s.Email.Trim() } else { "$($fn.ToLower()).$($ln.ToLower())@$domain" }

        try {
            $passwordProfile = @{
                Password                      = "Student-$(Get-Random -Minimum 1000 -Maximum 9999)!"
                ForceChangePasswordNextSignIn = $true
            }

            $newUser = New-MgUser `
                -DisplayName "$fn $ln" `
                -UserPrincipalName $email `
                -MailNickname ($email -split '@')[0] `
                -Department $cls `
                -AccountEnabled:$true `
                -PasswordProfile $passwordProfile `
                -UsageLocation "NO"

            # Add to main group
            if ($mainGroupId) {
                $body = @{ "@odata.id" = "https://graph.microsoft.com/v1.0/directoryObjects/$($newUser.Id)" }
                try { New-MgGroupMemberByRef -GroupId $mainGroupId -BodyParameter $body -ErrorAction Stop } catch { }
            }

            Write-Host "    [✓] $fn $ln ($email) — Class $cls" -ForegroundColor Green
            $success++
        }
        catch {
            Write-Host "    [✗] $fn $ln: $_" -ForegroundColor Red
            $failed++
        }
    }

    Write-Host ""
    Write-Host "  Import complete: $success created, $failed failed" -ForegroundColor $(if ($failed -gt 0) { "Yellow" } else { "Green" })
    Wait-ForKey
}

# ═══════════════════════════════════════════════════════════════════════════════
# C — VIEW CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

function Invoke-ViewConfig {
    Show-Banner
    Show-SectionHeader "CURRENT CONFIGURATION" Magenta

    # Secure credentials
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

    # Config file
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
    }
    else {
        Write-Host "  [!] Config file not found" -ForegroundColor Yellow
    }

    Write-Host ""

    # Graph connection status
    Write-Host "  Graph Connection:" -ForegroundColor Cyan
    Write-Host "  ─────────────────────────────────────────────" -ForegroundColor DarkGray
    if ($script:GraphConnected) {
        $ctx = Get-MgContext
        Write-Host "  Connected as: $($ctx.Account)" -ForegroundColor Green
        Write-Host "  Tenant:       $($ctx.TenantId)" -ForegroundColor White
    }
    else {
        Write-Host "  [!] Not connected" -ForegroundColor Yellow
    }

    Wait-ForKey
}

# ═══════════════════════════════════════════════════════════════════════════════
# T — SETUP TEST ENVIRONMENT
# ═══════════════════════════════════════════════════════════════════════════════

function Invoke-SetupTestEnvironment {
    Show-Banner
    Show-SectionHeader "SETUP TEST ENVIRONMENT" Yellow

    Write-Host "  This creates a TEST security group for safe testing." -ForegroundColor Cyan
    Write-Host "  Only members of this group will be affected." -ForegroundColor Cyan
    Write-Host ""

    Write-Host "    [1] Create test group only" -ForegroundColor White
    Write-Host "    [2] Create test group + 3 test user accounts" -ForegroundColor White
    Write-Host "    [B] Back" -ForegroundColor White
    Write-Host ""

    $choice = Read-Host "  Select option"
    $testScript = Join-Path $script:ProjectRoot "scripts\Setup-TestEnvironment.ps1"

    switch ($choice) {
        '1' { & $testScript }
        '2' { & $testScript -CreateTestUsers -TestUserCount 3 }
        'B' { return }
        'b' { return }
    }

    Write-Host ""
    Write-Host "  Next: Use the Group ID shown above when deploying." -ForegroundColor Green
    Wait-ForKey
}

# ═══════════════════════════════════════════════════════════════════════════════
# MAIN LOOP
# ═══════════════════════════════════════════════════════════════════════════════

do {
    Show-Banner
    Show-MainMenu

    $choice = Read-Host "  Select option"

    switch ($choice.ToUpper()) {
        '1'  { Invoke-CreateAppRegistration }
        '2'  { Invoke-ManageCredentials }
        '3'  { Invoke-DeployMenu }
        '4'  { Invoke-ViewStudentStatus }
        '5'  { Invoke-TransferStudent }
        '6'  { Invoke-ManageSuspension }
        '7'  { Invoke-CreateStudent }
        '8'  { Invoke-EnableDisableAll }
        '9'  { Invoke-ManageSchedulePolicies }
        '10' { Invoke-ManageSpecialGroups }
        '11' { Invoke-PromoteStudents }
        '12' { Invoke-ImportStudents }
        'C'  { Invoke-ViewConfig }
        'T'  { Invoke-SetupTestEnvironment }
        'Q'  {
            Disconnect-GraphSafely
            Write-Host ""
            Write-Host "  Goodbye!" -ForegroundColor Cyan
            break
        }
        default {
            Write-Host "  Invalid option." -ForegroundColor Red
            Start-Sleep -Seconds 1
        }
    }
} while ($choice.ToUpper() -ne 'Q')
