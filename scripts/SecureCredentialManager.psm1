<#
.SYNOPSIS
    Manages credentials securely using Windows Credential Manager or SecretManagement.

.DESCRIPTION
    Provides functions to securely store, retrieve, and manage credentials locally
    without storing them in plain text files.

.NOTES
    Author: IT Admin
    Version: 1.0
#>

#Requires -Version 5.1

$script:CredentialPrefix = "StudentAccessAutomation"

function Initialize-SecretManagement {
    <#
    .SYNOPSIS
        Initializes the SecretManagement module and vault.
    #>
    
    # Check if SecretManagement is available
    if (-not (Get-Module -ListAvailable -Name Microsoft.PowerShell.SecretManagement)) {
        Write-Host "Installing Microsoft.PowerShell.SecretManagement..." -ForegroundColor Yellow
        Install-Module -Name Microsoft.PowerShell.SecretManagement -Force -Scope CurrentUser
    }
    
    if (-not (Get-Module -ListAvailable -Name Microsoft.PowerShell.SecretStore)) {
        Write-Host "Installing Microsoft.PowerShell.SecretStore..." -ForegroundColor Yellow
        Install-Module -Name Microsoft.PowerShell.SecretStore -Force -Scope CurrentUser
    }
    
    Import-Module Microsoft.PowerShell.SecretManagement
    Import-Module Microsoft.PowerShell.SecretStore
    
    # Check if vault exists
    $vault = Get-SecretVault -Name "StudentAccessVault" -ErrorAction SilentlyContinue
    if (-not $vault) {
        Write-Host "Creating secure vault 'StudentAccessVault'..." -ForegroundColor Yellow
        
        # Configure SecretStore to not require password for automation
        Set-SecretStoreConfiguration -Scope CurrentUser -Authentication None -Interaction None -Confirm:$false
        
        Register-SecretVault -Name "StudentAccessVault" -ModuleName Microsoft.PowerShell.SecretStore -DefaultVault
        Write-Host "Secure vault created successfully." -ForegroundColor Green
    }
}

function Set-SecureCredential {
    <#
    .SYNOPSIS
        Stores a credential securely in the local vault.
    
    .PARAMETER Name
        Name of the credential (e.g., TenantId, ClientId, ClientSecret)
    
    .PARAMETER Value
        The value to store (will be stored securely)
    #>
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name,
        
        [Parameter(Mandatory = $true)]
        [string]$Value
    )
    
    Initialize-SecretManagement
    
    $secretName = "$script:CredentialPrefix-$Name"
    
    # Remove existing if present
    $existing = Get-Secret -Name $secretName -Vault "StudentAccessVault" -ErrorAction SilentlyContinue
    if ($existing) {
        Remove-Secret -Name $secretName -Vault "StudentAccessVault"
    }
    
    # Store new secret
    Set-Secret -Name $secretName -Secret $Value -Vault "StudentAccessVault"
    Write-Host "  [✓] Stored: $Name" -ForegroundColor Green
}

function Get-SecureCredential {
    <#
    .SYNOPSIS
        Retrieves a credential from the local vault.
    
    .PARAMETER Name
        Name of the credential to retrieve
    
    .PARAMETER AsPlainText
        Return as plain text instead of SecureString
    #>
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name,
        
        [switch]$AsPlainText
    )
    
    Initialize-SecretManagement
    
    $secretName = "$script:CredentialPrefix-$Name"
    
    try {
        $secret = Get-Secret -Name $secretName -Vault "StudentAccessVault" -AsPlainText:$AsPlainText -ErrorAction Stop
        return $secret
    }
    catch {
        return $null
    }
}

function Remove-SecureCredential {
    <#
    .SYNOPSIS
        Removes a credential from the local vault.
    #>
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name
    )
    
    Initialize-SecretManagement
    
    $secretName = "$script:CredentialPrefix-$Name"
    
    try {
        Remove-Secret -Name $secretName -Vault "StudentAccessVault" -ErrorAction Stop
        Write-Host "  [✓] Removed: $Name" -ForegroundColor Green
    }
    catch {
        Write-Host "  [!] Not found: $Name" -ForegroundColor Yellow
    }
}

function Get-AllSecureCredentials {
    <#
    .SYNOPSIS
        Lists all stored credentials (names only, not values).
    #>
    
    Initialize-SecretManagement
    
    $secrets = Get-SecretInfo -Vault "StudentAccessVault" | 
               Where-Object { $_.Name -like "$script:CredentialPrefix-*" }
    
    $credentials = @()
    foreach ($secret in $secrets) {
        $name = $secret.Name -replace "^$script:CredentialPrefix-", ""
        $credentials += [PSCustomObject]@{
            Name = $name
            Type = $secret.Type
            VaultName = $secret.VaultName
        }
    }
    
    return $credentials
}

function Test-CredentialsExist {
    <#
    .SYNOPSIS
        Tests if all required credentials are stored.
    #>
    
    $required = @('TenantId', 'ClientId', 'ClientSecret', 'StudentGroupId')
    $missing = @()
    
    foreach ($cred in $required) {
        $value = Get-SecureCredential -Name $cred -AsPlainText
        if (-not $value) {
            $missing += $cred
        }
    }
    
    if ($missing.Count -eq 0) {
        return $true
    }
    else {
        Write-Host "  [!] Missing credentials: $($missing -join ', ')" -ForegroundColor Yellow
        return $false
    }
}

function Set-AllCredentials {
    <#
    .SYNOPSIS
        Interactive prompt to set all required credentials.
    #>
    
    Write-Host ""
    Write-Host "  Enter your credentials (stored securely in Windows Credential Manager)" -ForegroundColor Cyan
    Write-Host "  ─────────────────────────────────────────────────────────────────────" -ForegroundColor DarkGray
    Write-Host ""
    
    # TenantId
    $existing = Get-SecureCredential -Name "TenantId" -AsPlainText
    if ($existing) {
        Write-Host "  Current TenantId: $($existing.Substring(0,8))..." -ForegroundColor Gray
        $input = Read-Host "  Enter new TenantId (or press Enter to keep current)"
        if ($input) { Set-SecureCredential -Name "TenantId" -Value $input }
    }
    else {
        $input = Read-Host "  Enter TenantId"
        if ($input) { Set-SecureCredential -Name "TenantId" -Value $input }
    }
    
    # ClientId
    $existing = Get-SecureCredential -Name "ClientId" -AsPlainText
    if ($existing) {
        Write-Host "  Current ClientId: $($existing.Substring(0,8))..." -ForegroundColor Gray
        $input = Read-Host "  Enter new ClientId (or press Enter to keep current)"
        if ($input) { Set-SecureCredential -Name "ClientId" -Value $input }
    }
    else {
        $input = Read-Host "  Enter ClientId"
        if ($input) { Set-SecureCredential -Name "ClientId" -Value $input }
    }
    
    # ClientSecret
    $existing = Get-SecureCredential -Name "ClientSecret" -AsPlainText
    if ($existing) {
        Write-Host "  Current ClientSecret: ********" -ForegroundColor Gray
        $input = Read-Host "  Enter new ClientSecret (or press Enter to keep current)"
        if ($input) { Set-SecureCredential -Name "ClientSecret" -Value $input }
    }
    else {
        $input = Read-Host "  Enter ClientSecret"
        if ($input) { Set-SecureCredential -Name "ClientSecret" -Value $input }
    }
    
    # StudentGroupId
    $existing = Get-SecureCredential -Name "StudentGroupId" -AsPlainText
    if ($existing) {
        Write-Host "  Current StudentGroupId: $($existing.Substring(0,8))..." -ForegroundColor Gray
        $input = Read-Host "  Enter new StudentGroupId (or press Enter to keep current)"
        if ($input) { Set-SecureCredential -Name "StudentGroupId" -Value $input }
    }
    else {
        $input = Read-Host "  Enter StudentGroupId"
        if ($input) { Set-SecureCredential -Name "StudentGroupId" -Value $input }
    }
    
    # Optional: Azure Subscription
    $existing = Get-SecureCredential -Name "SubscriptionId" -AsPlainText
    Write-Host ""
    Write-Host "  Optional - Azure Deployment Settings:" -ForegroundColor Cyan
    if ($existing) {
        Write-Host "  Current SubscriptionId: $($existing.Substring(0,8))..." -ForegroundColor Gray
        $input = Read-Host "  Enter new SubscriptionId (or press Enter to keep current)"
        if ($input) { Set-SecureCredential -Name "SubscriptionId" -Value $input }
    }
    else {
        $input = Read-Host "  Enter Azure SubscriptionId (optional, press Enter to skip)"
        if ($input) { Set-SecureCredential -Name "SubscriptionId" -Value $input }
    }
    
    Write-Host ""
    Write-Host "  [✓] Credentials saved securely!" -ForegroundColor Green
}

function Get-CredentialsAsHashtable {
    <#
    .SYNOPSIS
        Returns all credentials as a hashtable for use in scripts.
    #>
    
    return @{
        TenantId = Get-SecureCredential -Name "TenantId" -AsPlainText
        ClientId = Get-SecureCredential -Name "ClientId" -AsPlainText
        ClientSecret = Get-SecureCredential -Name "ClientSecret" -AsPlainText
        StudentGroupId = Get-SecureCredential -Name "StudentGroupId" -AsPlainText
        SubscriptionId = Get-SecureCredential -Name "SubscriptionId" -AsPlainText
    }
}

function Clear-AllCredentials {
    <#
    .SYNOPSIS
        Removes all stored credentials.
    #>
    
    $confirm = Read-Host "  Are you sure you want to remove all stored credentials? (type YES)"
    if ($confirm -eq 'YES') {
        $creds = @('TenantId', 'ClientId', 'ClientSecret', 'StudentGroupId', 'SubscriptionId')
        foreach ($cred in $creds) {
            Remove-SecureCredential -Name $cred
        }
        Write-Host "  [✓] All credentials removed." -ForegroundColor Green
    }
}

# Export functions
Export-ModuleMember -Function @(
    'Set-SecureCredential',
    'Get-SecureCredential',
    'Remove-SecureCredential',
    'Get-AllSecureCredentials',
    'Test-CredentialsExist',
    'Set-AllCredentials',
    'Get-CredentialsAsHashtable',
    'Clear-AllCredentials',
    'Initialize-SecretManagement'
)
