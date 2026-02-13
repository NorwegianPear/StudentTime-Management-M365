<#
.SYNOPSIS
    Reports on current student account sign-in status.

.DESCRIPTION
    This Azure Automation runbook generates a report of all student accounts
    showing their current sign-in enabled/disabled status.

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
    Write-Output "Student Access Status Report"
    Write-Output "============================================"
    Write-Output "Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    Write-Output "Student Group ID: $StudentGroupId"
    Write-Output "============================================"

    # Get all members of the student group
    $students = Get-MgGroupMember -GroupId $StudentGroupId -All

    if ($students.Count -eq 0) {
        Write-Output "WARNING: No members found in the student group."
        exit 0
    }

    $enabledUsers = @()
    $disabledUsers = @()
    $errorCount = 0

    foreach ($student in $students) {
        try {
            $user = Get-MgUser -UserId $student.Id -Property "displayName,accountEnabled,userPrincipalName,lastSignInDateTime" -ErrorAction Stop
            
            $userInfo = [PSCustomObject]@{
                DisplayName = $user.DisplayName
                UserPrincipalName = $user.UserPrincipalName
                AccountEnabled = $user.AccountEnabled
            }

            if ($user.AccountEnabled) {
                $enabledUsers += $userInfo
            }
            else {
                $disabledUsers += $userInfo
            }
        }
        catch {
            Write-Output "[ERROR] Could not retrieve user $($student.Id): $($_.Exception.Message)"
            $errorCount++
        }
    }

    Write-Output ""
    Write-Output "ENABLED ACCOUNTS ($($enabledUsers.Count)):"
    Write-Output "--------------------------------------------"
    foreach ($user in $enabledUsers) {
        Write-Output "  [✓] $($user.DisplayName) - $($user.UserPrincipalName)"
    }

    Write-Output ""
    Write-Output "DISABLED ACCOUNTS ($($disabledUsers.Count)):"
    Write-Output "--------------------------------------------"
    foreach ($user in $disabledUsers) {
        Write-Output "  [✗] $($user.DisplayName) - $($user.UserPrincipalName)"
    }

    Write-Output ""
    Write-Output "============================================"
    Write-Output "SUMMARY"
    Write-Output "============================================"
    Write-Output "Total students:    $($students.Count)"
    Write-Output "Enabled:           $($enabledUsers.Count)"
    Write-Output "Disabled:          $($disabledUsers.Count)"
    Write-Output "Errors:            $errorCount"
    Write-Output "============================================"
}
catch {
    Write-Error "Fatal error: $($_.Exception.Message)"
    throw
}
finally {
    # Disconnect from Microsoft Graph
    Disconnect-MgGraph -ErrorAction SilentlyContinue
}
