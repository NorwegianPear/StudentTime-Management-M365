# Student Time Management for M365 - Copilot Instructions

## Project Overview
This is a PowerShell-based Azure Automation solution that restricts student login times in Microsoft 365/Entra ID by enabling/disabling accounts on a schedule.

## Key Technologies
- PowerShell 7+
- Microsoft Graph API
- Azure Automation
- Entra ID (Azure AD)

## Code Style Guidelines
- Use approved PowerShell verbs (Get-, Set-, New-, Remove-, etc.)
- Include comprehensive comment-based help for all functions
- Use `[CmdletBinding()]` for advanced function features
- Prefer `Write-Output` over `Write-Host` in runbooks (for job output)
- Use `try/catch/finally` for error handling
- Always disconnect from Microsoft Graph in `finally` blocks

## File Conventions
- Runbooks: `runbooks/*.ps1` - These run in Azure Automation
- Scripts: `scripts/*.ps1` - These run locally for setup/testing
- Config: `config/*.json` - Configuration files (never commit secrets)

## Important Patterns

### Connecting to Microsoft Graph (Runbooks)
```powershell
$SecureSecret = ConvertTo-SecureString -String $ClientSecret -AsPlainText -Force
$ClientSecretCredential = New-Object System.Management.Automation.PSCredential($ClientId, $SecureSecret)
Connect-MgGraph -TenantId $TenantId -ClientSecretCredential $ClientSecretCredential -NoWelcome
```

### Getting Automation Variables
```powershell
$TenantId = Get-AutomationVariable -Name 'TenantId'
$ClientSecret = Get-AutomationVariable -Name 'ClientSecret'  # Encrypted
```

### Processing Group Members
```powershell
$students = Get-MgGroupMember -GroupId $StudentGroupId -All
foreach ($student in $students) {
    $user = Get-MgUser -UserId $student.Id -Property "displayName,accountEnabled,userPrincipalName"
    # Process user...
}
```

## Security Considerations
- Never commit `config.json` with real secrets
- Use encrypted variables in Azure Automation
- Client secrets should be rotated annually
- Use least-privilege permissions

## Testing
- Always test with `-WhatIf` parameter first
- Use `Test-StudentAccess.ps1` for local testing
- Check job output in Azure Portal after deployment
