<#
.SYNOPSIS
    Disables student account sign-in for Microsoft 365/Entra ID.

.DESCRIPTION
    This Azure Automation runbook disables sign-in for all student accounts
    in a specified security group and revokes their active sessions.
    Designed to run at 4:00 PM Monday-Friday.

.NOTES
    Author: IT Admin
    Version: 1.0
    Requires: Microsoft.Graph.Authentication, Microsoft.Graph.Users, Microsoft.Graph.Groups modules
#>

param()

# Import required modules
Import-Module Microsoft.Graph.Authentication
Import-Module Microsoft.Graph.Users
Import-Module Microsoft.Graph.Groups

# Get automation variables
$StudentGroupId = Get-AutomationVariable -Name 'StudentGroupId'
$RevokeTokens = Get-AutomationVariable -Name 'RevokeTokens' -ErrorAction SilentlyContinue

# Default to true if not set
if ($null -eq $RevokeTokens) {
    $RevokeTokens = $true
}

# Validate required variables
if (-not $StudentGroupId) {
    Write-Error "Missing required automation variable 'StudentGroupId'."
    exit 1
}

try {
    # Connect to Microsoft Graph using Managed Identity (no secrets needed)
    Connect-MgGraph -Identity -NoWelcome
    
    Write-Output "============================================"
    Write-Output "Student Access Automation - DISABLE"
    Write-Output "============================================"
    Write-Output "Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    Write-Output "Connected to Microsoft Graph"
    Write-Output "Processing student group: $StudentGroupId"
    Write-Output "Revoke tokens: $RevokeTokens"
    Write-Output "============================================"

    # Get all members of the student group
    $students = Get-MgGroupMember -GroupId $StudentGroupId -All

    if ($students.Count -eq 0) {
        Write-Output "WARNING: No members found in the student group."
        exit 0
    }

    Write-Output "Found $($students.Count) members in student group"
    Write-Output "--------------------------------------------"

    $disabledCount = 0
    $alreadyDisabledCount = 0
    $tokensRevokedCount = 0
    $errorCount = 0

    foreach ($student in $students) {
        try {
            # Get current user status
            $user = Get-MgUser -UserId $student.Id -Property "displayName,accountEnabled,userPrincipalName" -ErrorAction Stop
            
            if ($user.AccountEnabled -eq $true) {
                # Disable the account
                Update-MgUser -UserId $student.Id -AccountEnabled:$false
                
                Write-Output "[DISABLED] $($user.DisplayName) ($($user.UserPrincipalName))"
                $disabledCount++

                # Revoke all refresh tokens to force immediate sign-out
                if ($RevokeTokens) {
                    try {
                        Revoke-MgUserSignInSession -UserId $student.Id -ErrorAction Stop
                        Write-Output "  └─ Tokens revoked"
                        $tokensRevokedCount++
                    }
                    catch {
                        Write-Output "  └─ Warning: Could not revoke tokens: $($_.Exception.Message)"
                    }
                }
            }
            else {
                Write-Output "[ALREADY DISABLED] $($user.DisplayName)"
                $alreadyDisabledCount++
            }
        }
        catch {
            Write-Output "[ERROR] Processing $($student.Id): $($_.Exception.Message)"
            $errorCount++
        }
    }

    Write-Output "============================================"
    Write-Output "SUMMARY"
    Write-Output "============================================"
    Write-Output "Accounts disabled:        $disabledCount"
    Write-Output "Already disabled:         $alreadyDisabledCount"
    Write-Output "Tokens revoked:           $tokensRevokedCount"
    Write-Output "Errors:                   $errorCount"
    Write-Output "Total processed:          $($students.Count)"
    Write-Output "============================================"
    Write-Output "Completed at: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

    # ── Email Notification ────────────────────────────────────────────────
    try {
        . $PSScriptRoot\Send-Notification.ps1

        $summaryData = [ordered]@{
            "Accounts Disabled"  = $disabledCount
            "Already Disabled"   = $alreadyDisabledCount
            "Tokens Revoked"     = $tokensRevokedCount
            "Errors"             = $errorCount
            "Total Processed"    = $students.Count
        }
        $statusLevel = if ($errorCount -gt 0) { "Warning" } else { "Success" }
        $htmlBody = New-HtmlReport -Title "Student Access Disabled" -Summary $summaryData -Status $statusLevel

        $subject = if ($errorCount -gt 0) {
            "⚠️ Student Disable: $disabledCount disabled, $errorCount errors"
        } else {
            "✅ Student Disable: $disabledCount accounts disabled"
        }

        Send-NotificationEmail -To @() -Subject $subject -Body $htmlBody

        Write-AuditRecord -Action 'disable' -Details "Disabled $disabledCount, tokens revoked $tokensRevokedCount, errors $errorCount"
    }
    catch {
        Write-Warning "⚠️  Notification failed: $($_.Exception.Message)"
    }
}
catch {
    Write-Error "Fatal error: $($_.Exception.Message)"
    throw
}
finally {
    # Disconnect from Microsoft Graph
    Disconnect-MgGraph -ErrorAction SilentlyContinue
}
