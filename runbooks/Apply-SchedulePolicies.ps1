<#
.SYNOPSIS
    Applies schedule policies to student groups — enables/disables accounts based on time.

.DESCRIPTION
    This is the CORE automation runbook. It runs on a schedule (every 15 minutes)
    and performs the following:
    1. Reads schedule policies from Azure Automation Variable "SchedulePolicies"
    2. For each active policy, checks if current time is within the enable/disable window
    3. Enables or disables student accounts in the assigned groups accordingly
    4. Respects suspended students — never re-enables a suspended student

    This runbook works STANDALONE without the portal. Configure policies using
    Azure Automation Variables (JSON format).

.PARAMETER PolicyOverride
    Optional JSON string to override the stored policies (for testing).

.PARAMETER WhatIf
    Show what would happen without making changes.

.NOTES
    Author: Uy Le Phan (Atea AS)
    Version: 1.0
    Schedule: Every 15 minutes via Azure Automation
    Required Modules: Microsoft.Graph.Authentication, Microsoft.Graph.Users, Microsoft.Graph.Groups
    Required Permissions: User.ReadWrite.All, Group.Read.All
#>

[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter()]
    [string]$PolicyOverride = ""
)

# ═══════════════════════════════════════════════════════════════════════════
# CONNECT TO MICROSOFT GRAPH
# ═══════════════════════════════════════════════════════════════════════════

try {
    # Connect using Managed Identity (no secrets needed — federated via Azure)
    Connect-MgGraph -Identity -NoWelcome
    Write-Output "✅ Connected to Microsoft Graph via Managed Identity"
}
catch {
    Write-Error "❌ Failed to connect to Microsoft Graph: $_"
    throw
}

# ═══════════════════════════════════════════════════════════════════════════
# LOAD SCHEDULE POLICIES
# ═══════════════════════════════════════════════════════════════════════════

try {
    if ($PolicyOverride) {
        $policiesJson = $PolicyOverride
        Write-Output "📋 Using policy override (testing mode)"
    }
    else {
        $policiesJson = Get-AutomationVariable -Name 'SchedulePolicies'
        Write-Output "📋 Loaded policies from Automation Variable"
    }

    $policies = $policiesJson | ConvertFrom-Json
    Write-Output "   Found $($policies.Count) policy/policies"
}
catch {
    Write-Error "❌ Failed to load schedule policies: $_"
    Write-Output "💡 Set the 'SchedulePolicies' Automation Variable with JSON like:"
    Write-Output '   [{"name":"School Hours","enableTime":"08:00","disableTime":"15:30","daysOfWeek":["Monday","Tuesday","Wednesday","Thursday","Friday"],"isActive":true,"groupIds":["<group-id>"]}]'
    throw
}

# ═══════════════════════════════════════════════════════════════════════════
# LOAD SUSPENDED STUDENTS (skip them)
# ═══════════════════════════════════════════════════════════════════════════

$suspendedStudentIds = @()
try {
    $suspensionsJson = Get-AutomationVariable -Name 'SuspendedStudents' -ErrorAction SilentlyContinue
    if ($suspensionsJson) {
        $suspensions = $suspensionsJson | ConvertFrom-Json
        $now = Get-Date
        # Only active suspensions whose endDate hasn't passed
        $suspendedStudentIds = $suspensions |
            Where-Object { $_.isActive -eq $true -and [datetime]$_.endDate -gt $now } |
            ForEach-Object { $_.studentId }
        Write-Output "⏸️  $($suspendedStudentIds.Count) student(s) currently suspended (will be skipped)"
    }
}
catch {
    Write-Output "⚠️  Could not load suspensions variable — proceeding without suspension checks"
}

# ═══════════════════════════════════════════════════════════════════════════
# APPLY POLICIES
# ═══════════════════════════════════════════════════════════════════════════

$now      = Get-Date
$today    = $now.ToString("dddd")  # e.g., "Monday"
$nowTime  = $now.ToString("HH:mm")
$totalEnabled  = 0
$totalDisabled = 0
$totalSkipped  = 0

Write-Output ""
Write-Output "🕐 Current time: $nowTime ($today)"
Write-Output "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

foreach ($policy in $policies) {
    if (-not $policy.isActive) {
        Write-Output "⏭️  Skipping inactive policy: $($policy.name)"
        continue
    }

    $policyName  = $policy.name
    $enableTime  = $policy.enableTime   # "HH:mm"
    $disableTime = $policy.disableTime  # "HH:mm"
    $daysOfWeek  = $policy.daysOfWeek   # array of day names
    $groupIds    = if ($policy.groupIds) { $policy.groupIds } else { $policy.assignedGroupIds }

    Write-Output ""
    Write-Output "📌 Policy: $policyName ($enableTime – $disableTime)"
    Write-Output "   Days: $($daysOfWeek -join ', ')"
    Write-Output "   Groups: $($groupIds.Count)"

    # Check if today is a scheduled day
    if ($today -notin $daysOfWeek) {
        Write-Output "   ⏭️  Not a scheduled day — disabling students"
        $shouldEnable = $false
    }
    else {
        # Determine if we should enable or disable based on current time
        if ($nowTime -ge $enableTime -and $nowTime -lt $disableTime) {
            $shouldEnable = $true
            Write-Output "   ✅ Within access window — enabling students"
        }
        else {
            $shouldEnable = $false
            Write-Output "   🚫 Outside access window — disabling students"
        }
    }

    foreach ($groupId in $groupIds) {
        try {
            $members = Get-MgGroupMember -GroupId $groupId -All -Property "id"
            Write-Output "   Group $groupId : $($members.Count) member(s)"

            foreach ($member in $members) {
                $userId = $member.Id

                # Skip suspended students
                if ($userId -in $suspendedStudentIds) {
                    $totalSkipped++
                    continue
                }

                try {
                    $user = Get-MgUser -UserId $userId -Property "id,displayName,accountEnabled"

                    if ($shouldEnable -and -not $user.AccountEnabled) {
                        if ($PSCmdlet.ShouldProcess($user.DisplayName, "Enable account")) {
                            Update-MgUser -UserId $userId -AccountEnabled:$true
                            Write-Output "      ✅ Enabled: $($user.DisplayName)"
                            $totalEnabled++
                        }
                    }
                    elseif (-not $shouldEnable -and $user.AccountEnabled) {
                        if ($PSCmdlet.ShouldProcess($user.DisplayName, "Disable account")) {
                            Update-MgUser -UserId $userId -AccountEnabled:$false
                            Write-Output "      🚫 Disabled: $($user.DisplayName)"
                            $totalDisabled++
                        }
                    }
                    # else: already in desired state, no action needed
                }
                catch {
                    Write-Warning "      ⚠️  Failed to process user $userId : $_"
                }
            }
        }
        catch {
            Write-Warning "   ⚠️  Failed to get members for group $groupId : $_"
        }
    }
}

# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════════════════

Write-Output ""
Write-Output "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Output "📊 Summary:"
Write-Output "   Enabled:  $totalEnabled"
Write-Output "   Disabled: $totalDisabled"
Write-Output "   Skipped (suspended): $totalSkipped"
Write-Output "   Completed at: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

# ── Email Notification (only when changes were made or errors) ─────────
# Policies run frequently (every 15 min) — only notify when there are changes
if ($totalEnabled -gt 0 -or $totalDisabled -gt 0) {
    try {
        . $PSScriptRoot\Send-Notification.ps1

        Write-AuditRecord -Action $(if ($totalEnabled -gt 0) { 'enable' } else { 'disable' }) `
            -Details "Policy run: enabled $totalEnabled, disabled $totalDisabled, skipped $totalSkipped"
    }
    catch {
        Write-Warning "⚠️  Audit/notification failed: $($_.Exception.Message)"
    }
}

# ═══════════════════════════════════════════════════════════════════════════
# DISCONNECT
# ═══════════════════════════════════════════════════════════════════════════

try { Disconnect-MgGraph -ErrorAction SilentlyContinue } catch { }
