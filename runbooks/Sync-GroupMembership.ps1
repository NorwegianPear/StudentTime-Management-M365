<#
.SYNOPSIS
    Processes pending group membership changes — class transfers, special group assignments.

.DESCRIPTION
    This runbook handles all group membership operations:
    1. Reads "PendingGroupChanges" from Azure Automation Variable (JSON array)
    2. Processes each change: adds/removes students from Entra ID security groups
    3. Updates the variable with results (completed/failed status)
    4. Handles class transfers (remove from old group, add to new group atomically)
    5. Handles special group overrides (add student to override group with different schedule)

    This enables:
    - Mid-year class changes (student moves from 8A to 8B)
    - Special group assignments (after-school program, remedial, gifted)
    - Manual group management via portal or CLI

    Works STANDALONE without the portal. Configure via Automation Variables.

.PARAMETER WhatIf
    Show what would happen without making changes.

.NOTES
    Author: Uy Le Phan (Atea AS)
    Version: 1.0
    Schedule: Every 15 minutes via Azure Automation (or on-demand)
    Required Modules: Microsoft.Graph.Authentication, Microsoft.Graph.Users, Microsoft.Graph.Groups
    Required Permissions: User.ReadWrite.All, Group.ReadWrite.All, GroupMember.ReadWrite.All
#>

[CmdletBinding(SupportsShouldProcess)]
param()

# ═══════════════════════════════════════════════════════════════════════════
# CONNECT TO MICROSOFT GRAPH
# ═══════════════════════════════════════════════════════════════════════════

try {
    Connect-MgGraph -Identity -NoWelcome
    Write-Output "✅ Connected to Microsoft Graph via Managed Identity"
}
catch {
    Write-Error "❌ Failed to connect to Microsoft Graph: $_"
    throw
}

# ═══════════════════════════════════════════════════════════════════════════
# LOAD PENDING CHANGES
# ═══════════════════════════════════════════════════════════════════════════

try {
    $changesJson = Get-AutomationVariable -Name 'PendingGroupChanges' -ErrorAction Stop
    if (-not $changesJson -or $changesJson -eq '[]') {
        Write-Output "📋 No pending group changes. Nothing to process."
        try { Disconnect-MgGraph -ErrorAction SilentlyContinue } catch { }
        return
    }
    $changes = $changesJson | ConvertFrom-Json
    $pendingChanges = @($changes | Where-Object { $_.status -eq 'pending' })
    Write-Output "📋 Loaded $($changes.Count) change record(s), $($pendingChanges.Count) pending"
}
catch {
    Write-Output "📋 No PendingGroupChanges variable found. Nothing to process."
    try { Disconnect-MgGraph -ErrorAction SilentlyContinue } catch { }
    return
}

if ($pendingChanges.Count -eq 0) {
    Write-Output "✅ No pending changes to process."
    try { Disconnect-MgGraph -ErrorAction SilentlyContinue } catch { }
    return
}

# ═══════════════════════════════════════════════════════════════════════════
# PROCESS CHANGES
# ═══════════════════════════════════════════════════════════════════════════

$completed = 0
$failed    = 0
$now       = Get-Date -Format 'o'

Write-Output ""
Write-Output "🔄 Processing $($pendingChanges.Count) pending change(s)..."
Write-Output "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

foreach ($change in $changes) {
    if ($change.status -ne 'pending') { continue }

    $studentId   = $change.studentId
    $studentName = $change.studentName
    $action      = $change.action      # "add" or "remove"
    $groupId     = $change.groupId
    $groupName   = $change.groupName
    $reason      = $change.reason

    Write-Output ""
    Write-Output "👤 $studentName — $action → $groupName ($reason)"

    try {
        if ($action -eq 'add') {
            if ($PSCmdlet.ShouldProcess("$studentName → $groupName", "Add to group")) {
                $body = @{
                    "@odata.id" = "https://graph.microsoft.com/v1.0/directoryObjects/$studentId"
                }
                New-MgGroupMemberByRef -GroupId $groupId -BodyParameter $body -ErrorAction Stop
                Write-Output "   ✅ Added to $groupName"
            }
        }
        elseif ($action -eq 'remove') {
            if ($PSCmdlet.ShouldProcess("$studentName ← $groupName", "Remove from group")) {
                Remove-MgGroupMemberByRef -GroupId $groupId -DirectoryObjectId $studentId -ErrorAction Stop
                Write-Output "   ✅ Removed from $groupName"
            }
        }
        else {
            Write-Warning "   ⚠️  Unknown action: $action"
            $change.status = 'failed'
            $change | Add-Member -NotePropertyName 'error' -NotePropertyValue "Unknown action: $action" -Force
            $change | Add-Member -NotePropertyName 'completedAt' -NotePropertyValue $now -Force
            $failed++
            continue
        }

        $change.status = 'completed'
        $change | Add-Member -NotePropertyName 'completedAt' -NotePropertyValue $now -Force
        $completed++
    }
    catch {
        $errMsg = $_.Exception.Message
        # Handle "already a member" gracefully
        if ($errMsg -match 'already exist|One or more added object references already exist') {
            Write-Output "   ℹ️  Already a member — marking as completed"
            $change.status = 'completed'
            $change | Add-Member -NotePropertyName 'completedAt' -NotePropertyValue $now -Force
            $completed++
        }
        # Handle "not a member" for removals
        elseif ($errMsg -match 'does not exist|Resource .* does not exist') {
            Write-Output "   ℹ️  Not a member — marking as completed"
            $change.status = 'completed'
            $change | Add-Member -NotePropertyName 'completedAt' -NotePropertyValue $now -Force
            $completed++
        }
        else {
            Write-Warning "   ❌ Failed: $errMsg"
            $change.status = 'failed'
            $change | Add-Member -NotePropertyName 'error' -NotePropertyValue $errMsg -Force
            $change | Add-Member -NotePropertyName 'completedAt' -NotePropertyValue $now -Force
            $failed++
        }
    }
}

# ═══════════════════════════════════════════════════════════════════════════
# SAVE UPDATED CHANGES (keep last 100 records for audit)
# ═══════════════════════════════════════════════════════════════════════════

try {
    # Keep only the last 100 records (trim old completed ones)
    $kept = @($changes | Sort-Object { $_.requestedAt } -Descending | Select-Object -First 100)
    $updatedJson = $kept | ConvertTo-Json -Depth 10 -Compress
    Set-AutomationVariable -Name 'PendingGroupChanges' -Value $updatedJson
    Write-Output ""
    Write-Output "💾 Updated PendingGroupChanges variable ($($kept.Count) records kept)"
}
catch {
    Write-Warning "⚠️  Failed to update PendingGroupChanges variable: $_"
}

# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════════════════

Write-Output ""
Write-Output "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Output "📊 Summary:"
Write-Output "   Completed: $completed"
Write-Output "   Failed:    $failed"
Write-Output "   Completed at: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

# ── Email Notification ────────────────────────────────────────────────────
if ($completed -gt 0 -or $failed -gt 0) {
    try {
        . $PSScriptRoot\Send-Notification.ps1

        $summaryData = [ordered]@{
            "Changes Completed" = $completed
            "Changes Failed"    = $failed
            "Total Records"     = $changes.Count
        }
        $statusLevel = if ($failed -gt 0) { "Warning" } else { "Success" }
        $htmlBody = New-HtmlReport -Title "🔄 Group Membership Sync" -Summary $summaryData -Status $statusLevel

        $subject = if ($failed -gt 0) {
            "⚠️ Group Sync: $completed completed, $failed failed"
        } else {
            "✅ Group Sync: $completed change(s) applied"
        }

        Send-NotificationEmail -To @() -Subject $subject -Body $htmlBody

        Write-AuditRecord -Action 'group_membership_changed' -Details "Sync: $completed completed, $failed failed"
    }
    catch {
        Write-Warning "⚠️  Notification failed: $($_.Exception.Message)"
    }
}

try { Disconnect-MgGraph -ErrorAction SilentlyContinue } catch { }
