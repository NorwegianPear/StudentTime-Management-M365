<#
.SYNOPSIS
    Enables student account sign-in for Microsoft 365/Entra ID.

.DESCRIPTION
    This Azure Automation runbook enables sign-in for all student accounts
    in a specified security group. Designed to run at 8:00 AM Monday-Friday.

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

# Validate required variables
if (-not $StudentGroupId) {
    Write-Error "Missing required automation variable 'StudentGroupId'."
    exit 1
}

try {
    # Connect to Microsoft Graph using Managed Identity (no secrets needed)
    Connect-MgGraph -Identity -NoWelcome
    
    Write-Output "============================================"
    Write-Output "Student Access Automation - ENABLE"
    Write-Output "============================================"
    Write-Output "Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    Write-Output "Connected to Microsoft Graph"
    Write-Output "Processing student group: $StudentGroupId"
    Write-Output "============================================"

    # Get all members of the student group
    $students = Get-MgGroupMember -GroupId $StudentGroupId -All

    if ($students.Count -eq 0) {
        Write-Output "WARNING: No members found in the student group."
        exit 0
    }

    Write-Output "Found $($students.Count) members in student group"
    Write-Output "--------------------------------------------"

    $enabledCount = 0
    $alreadyEnabledCount = 0
    $errorCount = 0

    foreach ($student in $students) {
        try {
            # Get current user status
            $user = Get-MgUser -UserId $student.Id -Property "displayName,accountEnabled,userPrincipalName" -ErrorAction Stop
            
            if ($user.AccountEnabled -eq $false) {
                # Enable the account
                Update-MgUser -UserId $student.Id -AccountEnabled:$true
                
                Write-Output "[ENABLED] $($user.DisplayName) ($($user.UserPrincipalName))"
                $enabledCount++
            }
            else {
                Write-Output "[ALREADY ENABLED] $($user.DisplayName)"
                $alreadyEnabledCount++
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
    Write-Output "Accounts enabled:         $enabledCount"
    Write-Output "Already enabled:          $alreadyEnabledCount"
    Write-Output "Errors:                   $errorCount"
    Write-Output "Total processed:          $($students.Count)"
    Write-Output "============================================"
    Write-Output "Completed at: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

    # ── Email Notification ────────────────────────────────────────────────
    try {
        . $PSScriptRoot\Send-Notification.ps1

        $summaryData = [ordered]@{
            "Accounts Enabled"   = $enabledCount
            "Already Enabled"    = $alreadyEnabledCount
            "Errors"             = $errorCount
            "Total Processed"    = $students.Count
        }
        $statusLevel = if ($errorCount -gt 0) { "Warning" } else { "Success" }
        $htmlBody = New-HtmlReport -Title "Student Access Enabled" -Summary $summaryData -Status $statusLevel

        $subject = if ($errorCount -gt 0) {
            "⚠️ Student Enable: $enabledCount enabled, $errorCount errors"
        } else {
            "✅ Student Enable: $enabledCount accounts enabled"
        }

        Send-NotificationEmail -To @() -Subject $subject -Body $htmlBody

        Write-AuditRecord -Action 'enable' -Details "Enabled $enabledCount, errors $errorCount (total $($students.Count))"
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
