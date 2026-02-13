<#
.SYNOPSIS
    Processes expired student suspensions — automatically re-enables accounts.

.DESCRIPTION
    This runbook runs daily (e.g., 06:00 before school) and:
    1. Reads the suspended students list from Automation Variable "SuspendedStudents"
    2. Checks each suspension's endDate against current date
    3. Re-enables accounts whose suspension has expired
    4. Updates the suspended students list (removes expired entries)

    Works STANDALONE without the portal.

.NOTES
    Author: Uy Le Phan (Atea AS)
    Version: 1.0
    Schedule: Daily at 06:00 via Azure Automation
    Required Modules: Microsoft.Graph.Authentication, Microsoft.Graph.Users
    Required Permissions: User.ReadWrite.All
#>

[CmdletBinding(SupportsShouldProcess)]
param()

# ═══════════════════════════════════════════════════════════════════════════
# CONNECT TO MICROSOFT GRAPH
# ═══════════════════════════════════════════════════════════════════════════

try {
    # Connect using Managed Identity (no secrets needed — federated via Azure)
    Connect-MgGraph -Identity -NoWelcome
    Write-Output "✅ Connected to Microsoft Graph via Managed Identity"
}
catch {
    Write-Error "❌ Failed to connect: $_"
    throw
}

# ═══════════════════════════════════════════════════════════════════════════
# LOAD SUSPENSIONS
# ═══════════════════════════════════════════════════════════════════════════

try {
    $suspensionsJson = Get-AutomationVariable -Name 'SuspendedStudents'
    if (-not $suspensionsJson -or $suspensionsJson -eq '[]') {
        Write-Output "📋 No suspended students found. Nothing to process."
        Disconnect-MgGraph -ErrorAction SilentlyContinue
        return
    }
    $suspensions = $suspensionsJson | ConvertFrom-Json
    Write-Output "📋 Loaded $($suspensions.Count) suspension record(s)"
}
catch {
    Write-Output "📋 No SuspendedStudents variable found or empty. Nothing to process."
    try { Disconnect-MgGraph -ErrorAction SilentlyContinue } catch { }
    return
}

# ═══════════════════════════════════════════════════════════════════════════
# PROCESS EXPIRED SUSPENSIONS
# ═══════════════════════════════════════════════════════════════════════════

$now         = Get-Date
$reEnabled   = 0
$stillActive = 0
$errors      = 0
$updated     = @()

Write-Output ""
Write-Output "🕐 Current date/time: $($now.ToString('yyyy-MM-dd HH:mm'))"
Write-Output "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

foreach ($suspension in $suspensions) {
    if (-not $suspension.isActive) {
        continue  # Already processed
    }

    $endDate = [datetime]$suspension.endDate
    $studentId = $suspension.studentId
    $studentName = $suspension.studentName

    if ($endDate -le $now) {
        # Suspension expired — re-enable the student
        Write-Output ""
        Write-Output "⏰ Suspension expired for: $studentName"
        Write-Output "   Reason: $($suspension.reason)"
        Write-Output "   End date: $($endDate.ToString('yyyy-MM-dd'))"

        if ($PSCmdlet.ShouldProcess($studentName, "Re-enable account (suspension expired)")) {
            try {
                Update-MgUser -UserId $studentId -AccountEnabled:$true
                Write-Output "   ✅ Account re-enabled"
                $suspension.isActive = $false
                $reEnabled++
            }
            catch {
                Write-Warning "   ⚠️  Failed to re-enable: $_"
                $errors++
            }
        }
    }
    else {
        $daysLeft = ($endDate - $now).Days
        Write-Output "⏸️  Still suspended: $studentName ($daysLeft day(s) remaining)"
        $stillActive++
    }

    $updated += $suspension
}

# ═══════════════════════════════════════════════════════════════════════════
# UPDATE AUTOMATION VARIABLE
# ═══════════════════════════════════════════════════════════════════════════

try {
    $updatedJson = $updated | ConvertTo-Json -Depth 5 -Compress
    if ($updated.Count -eq 0) { $updatedJson = "[]" }
    Set-AutomationVariable -Name 'SuspendedStudents' -Value $updatedJson
    Write-Output ""
    Write-Output "💾 Updated SuspendedStudents variable"
}
catch {
    Write-Warning "⚠️  Failed to update SuspendedStudents variable: $_"
}

# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════════════════

Write-Output ""
Write-Output "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Output "📊 Summary:"
Write-Output "   Re-enabled (suspension expired): $reEnabled"
Write-Output "   Still suspended:                 $stillActive"
Write-Output "   Errors:                          $errors"
Write-Output "   Completed at: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

try { Disconnect-MgGraph -ErrorAction SilentlyContinue } catch { }
