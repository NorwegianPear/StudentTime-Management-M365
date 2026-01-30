<#
.SYNOPSIS
    Tests student access runbooks locally before deploying to Azure.

.DESCRIPTION
    This script allows you to test the enable/disable functionality locally
    using your own credentials or app credentials.

.PARAMETER Action
    The action to perform: Enable, Disable, or Status

.PARAMETER ConfigPath
    Path to the configuration JSON file.

.PARAMETER WhatIf
    Shows what would happen without making changes.

.EXAMPLE
    .\Test-StudentAccess.ps1 -Action Status -ConfigPath "..\config\config.json"
    .\Test-StudentAccess.ps1 -Action Disable -ConfigPath "..\config\config.json" -WhatIf

.NOTES
    Author: IT Admin
    Version: 1.0
#>

[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('Enable', 'Disable', 'Status')]
    [string]$Action,

    [Parameter(Mandatory = $true)]
    [string]$ConfigPath
)

# Import required modules
$requiredModules = @('Microsoft.Graph.Authentication', 'Microsoft.Graph.Users', 'Microsoft.Graph.Groups')
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
Write-Host "Student Access Test - $Action" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "WhatIf Mode: $WhatIfPreference" -ForegroundColor $(if ($WhatIfPreference) { 'Yellow' } else { 'Gray' })
Write-Host ""

try {
    # Connect using app credentials
    $SecureSecret = ConvertTo-SecureString -String $config.ClientSecret -AsPlainText -Force
    $ClientSecretCredential = New-Object System.Management.Automation.PSCredential($config.ClientId, $SecureSecret)

    Connect-MgGraph -TenantId $config.TenantId -ClientSecretCredential $ClientSecretCredential -NoWelcome
    Write-Host "Connected to Microsoft Graph" -ForegroundColor Green
    Write-Host ""

    # Get group members
    $students = Get-MgGroupMember -GroupId $config.StudentGroupId -All
    Write-Host "Found $($students.Count) members in student group" -ForegroundColor Yellow
    Write-Host ""

    foreach ($student in $students) {
        $user = Get-MgUser -UserId $student.Id -Property "displayName,accountEnabled,userPrincipalName"
        
        switch ($Action) {
            'Enable' {
                if ($user.AccountEnabled -eq $false) {
                    if ($PSCmdlet.ShouldProcess($user.DisplayName, "Enable account")) {
                        Update-MgUser -UserId $student.Id -AccountEnabled:$true
                        Write-Host "[ENABLED] $($user.DisplayName)" -ForegroundColor Green
                    }
                }
                else {
                    Write-Host "[ALREADY ENABLED] $($user.DisplayName)" -ForegroundColor Gray
                }
            }
            'Disable' {
                if ($user.AccountEnabled -eq $true) {
                    if ($PSCmdlet.ShouldProcess($user.DisplayName, "Disable account")) {
                        Update-MgUser -UserId $student.Id -AccountEnabled:$false
                        if ($config.RevokeTokens) {
                            Revoke-MgUserSignInSession -UserId $student.Id
                        }
                        Write-Host "[DISABLED] $($user.DisplayName)" -ForegroundColor Red
                    }
                }
                else {
                    Write-Host "[ALREADY DISABLED] $($user.DisplayName)" -ForegroundColor Gray
                }
            }
            'Status' {
                $status = if ($user.AccountEnabled) { "[ENABLED]" } else { "[DISABLED]" }
                $color = if ($user.AccountEnabled) { "Green" } else { "Red" }
                Write-Host "$status $($user.DisplayName) - $($user.UserPrincipalName)" -ForegroundColor $color
            }
        }
    }
}
catch {
    Write-Error "Error: $($_.Exception.Message)"
}
finally {
    Disconnect-MgGraph -ErrorAction SilentlyContinue
}
