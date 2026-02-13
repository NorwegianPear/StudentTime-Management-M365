<#
.SYNOPSIS
    Promotes students to the next class/grade — bulk group membership migration.

.DESCRIPTION
    This runbook handles year-end (or mid-year) class promotions:
    1. Reads promotion mappings from parameter or Automation Variable "PromotionMappings"
    2. For each mapping: moves ALL members from source group to destination group
    3. Optionally removes graduated students (highest grade → no destination)
    4. Outputs a detailed report of all changes

    Promotion Mapping JSON format:
    [
      { "fromGroupId": "<8A-group-id>", "toGroupId": "<9A-group-id>", "label": "8A → 9A" },
      { "fromGroupId": "<9A-group-id>", "toGroupId": "<10A-group-id>", "label": "9A → 10A" },
      { "fromGroupId": "<10A-group-id>", "toGroupId": "", "label": "10A → Graduated (remove)" }
    ]

    When toGroupId is empty, students are removed from the source group and optionally
    disabled (graduated / left school).

.PARAMETER PromotionMappingsJson
    JSON string with promotion mappings. If empty, reads from Automation Variable.

.PARAMETER DisableGraduated
    If true, disable accounts for students who graduated (no destination group).

.PARAMETER WhatIf
    Show what would happen without making changes.

.NOTES
    Author: Uy Le Phan (Atea AS)
    Version: 1.0
    Schedule: Run on-demand (typically once per year, June/August)
    Required Modules: Microsoft.Graph.Authentication, Microsoft.Graph.Users, Microsoft.Graph.Groups
    Required Permissions: User.ReadWrite.All, Group.ReadWrite.All, GroupMember.ReadWrite.All
#>

[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter()]
    [string]$PromotionMappingsJson = "",

    [Parameter()]
    [bool]$DisableGraduated = $false
)

# ═══════════════════════════════════════════════════════════════════════════
# CONNECT
# ═══════════════════════════════════════════════════════════════════════════

try {
    Connect-MgGraph -Identity -NoWelcome
    Write-Output "✅ Connected to Microsoft Graph via Managed Identity"
}
catch {
    Write-Error "❌ Failed to connect: $_"
    throw
}

# ═══════════════════════════════════════════════════════════════════════════
# LOAD PROMOTION MAPPINGS
# ═══════════════════════════════════════════════════════════════════════════

try {
    if ($PromotionMappingsJson) {
        $mappingsJson = $PromotionMappingsJson
        Write-Output "📋 Using parameter-provided promotion mappings"
    }
    else {
        $mappingsJson = Get-AutomationVariable -Name 'PromotionMappings' -ErrorAction Stop
        Write-Output "📋 Loaded promotion mappings from Automation Variable"
    }

    $mappings = $mappingsJson | ConvertFrom-Json
    Write-Output "   Found $($mappings.Count) promotion mapping(s)"
}
catch {
    Write-Error "❌ Failed to load promotion mappings: $_"
    Write-Output "💡 Set the 'PromotionMappings' Automation Variable or pass -PromotionMappingsJson"
    Write-Output '   Format: [{"fromGroupId":"<id>","toGroupId":"<id>","label":"8A → 9A"}]'
    throw
}

if ($mappings.Count -eq 0) {
    Write-Output "⚠️  No promotion mappings found. Nothing to do."
    try { Disconnect-MgGraph -ErrorAction SilentlyContinue } catch { }
    return
}

# ═══════════════════════════════════════════════════════════════════════════
# PROCESS PROMOTIONS (two-pass: collect first, then move)
# ═══════════════════════════════════════════════════════════════════════════

$totalMoved     = 0
$totalGraduated = 0
$totalErrors    = 0
$report         = @()

Write-Output ""
Write-Output "🎓 Starting class promotions..."
Write-Output "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# PASS 1: Collect all members from source groups BEFORE moving anyone
# (prevents double-moves when chains like 8A→9A→10A exist)
$memberCache = @{}

foreach ($mapping in $mappings) {
    $fromId = $mapping.fromGroupId
    $label  = if ($mapping.label) { $mapping.label } else { "$fromId → $($mapping.toGroupId)" }

    try {
        $members = Get-MgGroupMember -GroupId $fromId -All -Property "id"
        $memberCache[$fromId] = $members
        Write-Output "📁 $label : $($members.Count) student(s) to move"
    }
    catch {
        Write-Warning "⚠️  Failed to get members from $label : $_"
        $memberCache[$fromId] = @()
    }
}

# PASS 2: Execute the promotions
foreach ($mapping in $mappings) {
    $fromId = $mapping.fromGroupId
    $toId   = $mapping.toGroupId
    $label  = if ($mapping.label) { $mapping.label } else { "$fromId → $toId" }
    $members = $memberCache[$fromId]

    Write-Output ""
    Write-Output "🔄 Processing: $label ($($members.Count) students)"

    foreach ($member in $members) {
        $userId = $member.Id

        try {
            $user = Get-MgUser -UserId $userId -Property "id,displayName,userPrincipalName" -ErrorAction Stop
            $displayName = $user.DisplayName
            $upn = $user.UserPrincipalName
        }
        catch {
            Write-Warning "   ⚠️  Could not get user $userId : $_"
            $totalErrors++
            continue
        }

        try {
            if ($toId -and $toId -ne '') {
                # Move to new group
                if ($PSCmdlet.ShouldProcess($displayName, "Promote: $label")) {
                    # Add to destination group
                    $body = @{ "@odata.id" = "https://graph.microsoft.com/v1.0/directoryObjects/$userId" }
                    try {
                        New-MgGroupMemberByRef -GroupId $toId -BodyParameter $body -ErrorAction Stop
                    }
                    catch {
                        if ($_.Exception.Message -match 'already exist') {
                            Write-Output "   ℹ️  $displayName already in destination"
                        }
                        else { throw }
                    }

                    # Remove from source group
                    Remove-MgGroupMemberByRef -GroupId $fromId -DirectoryObjectId $userId -ErrorAction Stop

                    Write-Output "   ✅ $displayName → promoted"
                    $totalMoved++
                    $report += [PSCustomObject]@{
                        Student = $displayName
                        UPN     = $upn
                        Action  = "Promoted"
                        Detail  = $label
                    }
                }
            }
            else {
                # Graduated — no destination group
                if ($PSCmdlet.ShouldProcess($displayName, "Graduate (remove from $fromId)")) {
                    Remove-MgGroupMemberByRef -GroupId $fromId -DirectoryObjectId $userId -ErrorAction Stop

                    if ($DisableGraduated) {
                        Update-MgUser -UserId $userId -AccountEnabled:$false
                        Write-Output "   🎓 $displayName → graduated + disabled"
                    }
                    else {
                        Write-Output "   🎓 $displayName → graduated (removed from group)"
                    }

                    $totalGraduated++
                    $report += [PSCustomObject]@{
                        Student = $displayName
                        UPN     = $upn
                        Action  = "Graduated"
                        Detail  = if ($DisableGraduated) { "Removed + Disabled" } else { "Removed from group" }
                    }
                }
            }
        }
        catch {
            Write-Warning "   ❌ Failed for $displayName : $_"
            $totalErrors++
            $report += [PSCustomObject]@{
                Student = $displayName
                UPN     = $upn
                Action  = "ERROR"
                Detail  = $_.Exception.Message
            }
        }
    }
}

# ═══════════════════════════════════════════════════════════════════════════
# REPORT
# ═══════════════════════════════════════════════════════════════════════════

Write-Output ""
Write-Output "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Output "📊 Promotion Summary:"
Write-Output "   Promoted:  $totalMoved"
Write-Output "   Graduated: $totalGraduated"
Write-Output "   Errors:    $totalErrors"
Write-Output "   Completed: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

if ($report.Count -gt 0) {
    Write-Output ""
    Write-Output "📋 Detailed Report:"
    $report | Format-Table -AutoSize | Out-String | Write-Output
}

# ── Email Notification ────────────────────────────────────────────────────
try {
    . $PSScriptRoot\Send-Notification.ps1

    $summaryData = [ordered]@{
        "Students Promoted"  = $totalMoved
        "Students Graduated" = $totalGraduated
        "Errors"             = $totalErrors
        "Mappings Processed" = $mappings.Count
    }
    $statusLevel = if ($totalErrors -gt 0) { "Warning" } else { "Success" }
    $htmlBody = New-HtmlReport -Title "🎓 Class Promotions Completed" -Summary $summaryData -DetailRows $report -Status $statusLevel

    $subject = if ($totalErrors -gt 0) {
        "⚠️ Promotions: $totalMoved promoted, $totalErrors errors"
    } else {
        "🎓 Promotions: $totalMoved promoted, $totalGraduated graduated"
    }

    Send-NotificationEmail -To @() -Subject $subject -Body $htmlBody -Priority "High"

    Write-AuditRecord -Action 'bulk_promote' -Details "Promoted $totalMoved, graduated $totalGraduated, errors $totalErrors"
}
catch {
    Write-Warning "⚠️  Notification failed: $($_.Exception.Message)"
}

try { Disconnect-MgGraph -ErrorAction SilentlyContinue } catch { }
