<#
.SYNOPSIS
    Generates and sends a comprehensive Student Access Management monitoring report.

.DESCRIPTION
    This runbook collects data from Microsoft Graph and Automation Variables to produce
    a summary report of the current state and recent activity. It can be scheduled
    daily or weekly to give IT admins visibility into:

    1. Current account status (enabled/disabled/suspended counts)
    2. Recent automation activity (enables, disables, errors)
    3. Group membership overview per class
    4. Policy status (active policies and schedules)
    5. Pending changes awaiting processing
    6. Special group memberships with override schedules
    7. Recent audit trail of administrative actions

    The report is sent via email and also saved to an Automation Variable for portal display.

.PARAMETER ReportType
    Type of report: "daily" (brief), "weekly" (detailed), or "full" (everything).
    Default: "daily"

.PARAMETER WhatIf
    Show what the report would contain without sending.

.NOTES
    Author: Uy Le Phan (Atea AS)
    Version: 1.0
    Schedule: Daily at 07:00 AM (before Enable runbook) or Weekly on Monday
    Required Modules: Microsoft.Graph.Authentication, Microsoft.Graph.Users, Microsoft.Graph.Groups
    Required Permissions: User.Read.All, Group.Read.All, AuditLog.Read.All, Mail.Send
#>

[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter()]
    [ValidateSet("daily", "weekly", "full")]
    [string]$ReportType = "daily"
)

# ═══════════════════════════════════════════════════════════════════════════
# CONNECT & LOAD HELPERS
# ═══════════════════════════════════════════════════════════════════════════

try {
    Connect-MgGraph -Identity -NoWelcome
    Write-Output "✅ Connected to Microsoft Graph via Managed Identity"
}
catch {
    Write-Error "❌ Failed to connect: $_"
    throw
}

# Load notification helpers
try {
    . $PSScriptRoot\Send-Notification.ps1
    Write-Output "📧 Notification helpers loaded"
}
catch {
    Write-Warning "⚠️  Could not load Send-Notification.ps1 — report will be output-only"
}

# ═══════════════════════════════════════════════════════════════════════════
# COLLECT DATA
# ═══════════════════════════════════════════════════════════════════════════

Write-Output ""
Write-Output "📊 Generating $ReportType monitoring report..."
Write-Output "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ─── 1. Student Account Status ────────────────────────────────────────────

$studentGroupId = Get-AutomationVariable -Name 'StudentGroupId' -ErrorAction SilentlyContinue
$studentStats = @{
    Total    = 0
    Enabled  = 0
    Disabled = 0
}
$groupBreakdown = @()

if ($studentGroupId) {
    try {
        $members = Get-MgGroupMember -GroupId $studentGroupId -All -Property "id"
        $studentStats.Total = $members.Count

        foreach ($member in $members) {
            try {
                $user = Get-MgUser -UserId $member.Id -Property "id,accountEnabled" -ErrorAction SilentlyContinue
                if ($user.AccountEnabled) { $studentStats.Enabled++ } else { $studentStats.Disabled++ }
            }
            catch { }
        }
        Write-Output "👥 Students: $($studentStats.Total) total ($($studentStats.Enabled) enabled, $($studentStats.Disabled) disabled)"
    }
    catch {
        Write-Warning "⚠️  Could not fetch student group: $_"
    }
}

# ─── 2. Per-Class Group Breakdown ────────────────────────────────────────

if ($ReportType -in @("weekly", "full")) {
    try {
        $policiesJson = Get-AutomationVariable -Name 'SchedulePolicies' -ErrorAction SilentlyContinue
        if ($policiesJson) {
            $policies = $policiesJson | ConvertFrom-Json
            $allGroupIds = $policies | ForEach-Object {
                if ($_.groupIds) { $_.groupIds } else { $_.assignedGroupIds }
            } | ForEach-Object { $_ } | Sort-Object -Unique

            foreach ($gid in $allGroupIds) {
                try {
                    $group = Get-MgGroup -GroupId $gid -Property "id,displayName"
                    $gMembers = Get-MgGroupMember -GroupId $gid -All -Property "id"
                    $gEnabled = 0; $gDisabled = 0
                    foreach ($gm in $gMembers) {
                        try {
                            $u = Get-MgUser -UserId $gm.Id -Property "accountEnabled"
                            if ($u.AccountEnabled) { $gEnabled++ } else { $gDisabled++ }
                        }
                        catch { }
                    }
                    $groupBreakdown += [PSCustomObject]@{
                        Group    = $group.DisplayName
                        Total    = $gMembers.Count
                        Enabled  = $gEnabled
                        Disabled = $gDisabled
                    }
                }
                catch {
                    Write-Warning "   ⚠️  Could not process group $gid"
                }
            }
        }

        if ($groupBreakdown.Count -gt 0) {
            Write-Output ""
            Write-Output "📁 Class Group Breakdown:"
            $groupBreakdown | Format-Table -AutoSize | Out-String | Write-Output
        }
    }
    catch {
        Write-Warning "⚠️  Could not generate group breakdown: $_"
    }
}

# ─── 3. Policy Status ────────────────────────────────────────────────────

$policyReport = @()
try {
    $policiesJson = Get-AutomationVariable -Name 'SchedulePolicies' -ErrorAction SilentlyContinue
    if ($policiesJson) {
        $policies = $policiesJson | ConvertFrom-Json
        foreach ($p in $policies) {
            $policyReport += [PSCustomObject]@{
                Policy  = $p.name
                Status  = if ($p.isActive) { "Active" } else { "Inactive" }
                Hours   = "$($p.enableTime) – $($p.disableTime)"
                Days    = ($p.daysOfWeek -join ", ")
                Groups  = if ($p.groupIds) { $p.groupIds.Count } else { $p.assignedGroupIds.Count }
            }
        }
        Write-Output "🕒 Policies: $($policyReport.Count) configured ($(@($policies | Where-Object { $_.isActive }).Count) active)"
    }
}
catch {
    Write-Warning "⚠️  Could not load policies"
}

# ─── 4. Suspensions ──────────────────────────────────────────────────────

$suspensionReport = @()
$activeSuspensions = 0
try {
    $suspJson = Get-AutomationVariable -Name 'SuspendedStudents' -ErrorAction SilentlyContinue
    if ($suspJson) {
        $suspensions = $suspJson | ConvertFrom-Json
        $now = Get-Date
        $active = $suspensions | Where-Object { $_.isActive -eq $true -and [datetime]$_.endDate -gt $now }
        $activeSuspensions = @($active).Count

        foreach ($s in $active) {
            $suspensionReport += [PSCustomObject]@{
                Student = $s.studentName
                Reason  = $s.reason
                Until   = ([datetime]$s.endDate).ToString("yyyy-MM-dd")
            }
        }
        Write-Output "⏸️  Active suspensions: $activeSuspensions"
    }
}
catch {
    Write-Warning "⚠️  Could not load suspensions"
}

# ─── 5. Pending Changes ──────────────────────────────────────────────────

$pendingCount = 0
try {
    $pendingJson = Get-AutomationVariable -Name 'PendingGroupChanges' -ErrorAction SilentlyContinue
    if ($pendingJson) {
        $pending = ($pendingJson | ConvertFrom-Json) | Where-Object { $_.status -eq 'pending' }
        $pendingCount = @($pending).Count
        Write-Output "🔄 Pending changes: $pendingCount"
    }
}
catch { }

# ─── 6. Special Groups ───────────────────────────────────────────────────

$specialGroupReport = @()
if ($ReportType -in @("weekly", "full")) {
    try {
        $sgJson = Get-AutomationVariable -Name 'SpecialGroups' -ErrorAction SilentlyContinue
        if ($sgJson) {
            $specialGroups = $sgJson | ConvertFrom-Json
            foreach ($sg in $specialGroups) {
                $specialGroupReport += [PSCustomObject]@{
                    Group    = $sg.groupName
                    Policy   = $sg.policyName
                    Priority = $sg.priority
                    Members  = $sg.memberCount
                }
            }
            Write-Output "⭐ Special groups: $($specialGroupReport.Count)"
        }
    }
    catch { }
}

# ─── 7. Recent Entra ID Audit Events (last 24h or 7d) ────────────────────

$recentEvents = @()
if ($ReportType -in @("weekly", "full")) {
    try {
        $lookbackDays = if ($ReportType -eq "weekly") { 7 } else { 1 }
        $since = (Get-Date).AddDays(-$lookbackDays).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")

        $auditLogs = Get-MgAuditLogDirectoryAudit `
            -Filter "activityDateTime ge $since" `
            -Top 200 `
            -Sort "activityDateTime desc" `
            -ErrorAction SilentlyContinue

        if ($auditLogs) {
            $relevant = $auditLogs | Where-Object {
                $_.Category -in @('GroupManagement', 'UserManagement') -and
                $_.ActivityDisplayName -match 'member|user|account|enable|disable'
            }
            foreach ($event in ($relevant | Select-Object -First 50)) {
                $target = if ($event.TargetResources -and $event.TargetResources.Count -gt 0) {
                    $event.TargetResources[0].DisplayName
                } else { "—" }

                $recentEvents += [PSCustomObject]@{
                    Time     = $event.ActivityDateTime.ToString("MMM dd HH:mm")
                    Activity = $event.ActivityDisplayName
                    Target   = $target
                    Status   = $event.Result
                }
            }
            Write-Output "📋 Recent audit events: $($recentEvents.Count) (last $lookbackDays day(s))"
        }
    }
    catch {
        Write-Warning "⚠️  Could not fetch Entra audit logs: $_"
    }
}

# ═══════════════════════════════════════════════════════════════════════════
# GENERATE REPORT
# ═══════════════════════════════════════════════════════════════════════════

Write-Output ""
Write-Output "📧 Generating email report..."

$summaryData = [ordered]@{
    "Report Type"           = $ReportType.ToUpper()
    "Total Students"        = $studentStats.Total
    "Currently Enabled"     = $studentStats.Enabled
    "Currently Disabled"    = $studentStats.Disabled
    "Active Suspensions"    = $activeSuspensions
    "Pending Changes"       = $pendingCount
    "Active Policies"       = @($policyReport | Where-Object { $_.Status -eq "Active" }).Count
}

# Combine all detail rows for the report
$allDetailRows = @()

if ($policyReport.Count -gt 0) {
    $allDetailRows += [PSCustomObject]@{
        Section = "── Policy Overview ──"
        Detail  = ""
        Status  = ""
    }
    $allDetailRows += $policyReport | ForEach-Object {
        [PSCustomObject]@{
            Section = $_.Policy
            Detail  = "$($_.Hours) on $($_.Days) ($($_.Groups) group(s))"
            Status  = $_.Status
        }
    }
}

if ($suspensionReport.Count -gt 0) {
    $allDetailRows += [PSCustomObject]@{
        Section = "── Active Suspensions ──"
        Detail  = ""
        Status  = ""
    }
    $allDetailRows += $suspensionReport | ForEach-Object {
        [PSCustomObject]@{
            Section = $_.Student
            Detail  = "$($_.Reason) — until $($_.Until)"
            Status  = "Suspended"
        }
    }
}

if ($groupBreakdown.Count -gt 0) {
    $allDetailRows += [PSCustomObject]@{
        Section = "── Class Groups ──"
        Detail  = ""
        Status  = ""
    }
    $allDetailRows += $groupBreakdown | ForEach-Object {
        [PSCustomObject]@{
            Section = $_.Group
            Detail  = "$($_.Total) students ($($_.Enabled) enabled, $($_.Disabled) disabled)"
            Status  = if ($_.Disabled -eq $_.Total) { "All Disabled" } elseif ($_.Enabled -eq $_.Total) { "All Enabled" } else { "Mixed" }
        }
    }
}

if ($specialGroupReport.Count -gt 0) {
    $allDetailRows += [PSCustomObject]@{
        Section = "── Special Groups ──"
        Detail  = ""
        Status  = ""
    }
    $allDetailRows += $specialGroupReport | ForEach-Object {
        [PSCustomObject]@{
            Section = $_.Group
            Detail  = "Policy: $($_.Policy), Priority: $($_.Priority), Members: $($_.Members)"
            Status  = "Active"
        }
    }
}

$overallStatus = if ($studentStats.Total -eq 0) {
    "Warning"
} elseif ($pendingCount -gt 5 -or $activeSuspensions -gt 10) {
    "Warning"
} else {
    "Success"
}

$reportTitle = switch ($ReportType) {
    "daily"  { "📊 Daily Monitoring Report" }
    "weekly" { "📊 Weekly Monitoring Report" }
    "full"   { "📊 Full System Report" }
}

if (Get-Command New-HtmlReport -ErrorAction SilentlyContinue) {
    $htmlBody = New-HtmlReport `
        -Title $reportTitle `
        -Summary $summaryData `
        -DetailRows $allDetailRows `
        -Status $overallStatus

    $subject = "📊 Student Access $($ReportType.ToUpper()) Report — $($studentStats.Enabled)/$($studentStats.Total) enabled"

    if ($PSCmdlet.ShouldProcess("Email Report", "Send $ReportType report")) {
        Send-NotificationEmail -To @() -Subject $subject -Body $htmlBody
    }
}

# ═══════════════════════════════════════════════════════════════════════════
# SAVE REPORT SNAPSHOT FOR PORTAL
# ═══════════════════════════════════════════════════════════════════════════

try {
    $snapshot = @{
        generatedAt     = (Get-Date).ToUniversalTime().ToString("o")
        reportType      = $ReportType
        studentStats    = $studentStats
        activePolicies  = @($policyReport | Where-Object { $_.Status -eq "Active" }).Count
        pendingChanges  = $pendingCount
        suspensions     = $activeSuspensions
        groupBreakdown  = $groupBreakdown
        specialGroups   = $specialGroupReport
    }
    $snapshotJson = $snapshot | ConvertTo-Json -Depth 5 -Compress
    Set-AutomationVariable -Name 'MonitoringSnapshot' -Value $snapshotJson
    Write-Output "💾 Monitoring snapshot saved to Automation Variable"
}
catch {
    Write-Warning "⚠️  Failed to save snapshot: $_"
}

# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════════════════

Write-Output ""
Write-Output "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Output "✅ $ReportType monitoring report completed"
Write-Output "   Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

try { Disconnect-MgGraph -ErrorAction SilentlyContinue } catch { }
