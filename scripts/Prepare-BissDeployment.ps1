<#
.SYNOPSIS
    Prepares all Azure Automation Variables for the BISS Student Access Management
    solution locally — outputs JSON files ready for deployment. Does NOT touch
    the customer tenant until you explicitly run Deploy-StudentAccessAutomation.ps1.

.DESCRIPTION
    Reads config/biss.config.json and config/biss-holidays.json, then generates:

      output/biss-automation-variables.json   — all Automation Variables as key/value pairs
      output/biss-schedule-policies.json      — SchedulePolicies variable content (for review)
      output/biss-holiday-calendar.json       — HolidayCalendar variable content (for review)

    NOTHING IS DEPLOYED. Inspect the output files, then hand them to the deployment
    runbook or use Deploy-StudentAccessAutomation.ps1 when ready.

    The SchedulePolicies variable is the shared source of truth used by BOTH
    the portal AND the runbooks. Any change to the timing, groups, or active state
    flows through this single variable — whichever side writes it last wins, and
    the Automation schedule immediately picks it up on the next run.

.PARAMETER ConfigPath
    Path to the BISS config file. Defaults to config/biss.config.json.

.PARAMETER HolidayPath
    Path to the BISS holiday file. Defaults to config/biss-holidays.json.

.PARAMETER ExtendHolidaysYears
    Auto-compute and append Norwegian holidays for this many future years beyond
    what is already in the holiday file. Default 3. Set to 0 to skip.

.EXAMPLE
    # Prepare output (no deployment)
    .\scripts\Prepare-BissDeployment.ps1

.EXAMPLE
    # Compute + append holidays through 2035
    .\scripts\Prepare-BissDeployment.ps1 -ExtendHolidaysYears 9

.NOTES
    Author : Uy Le Phan (Atea AS)
    Version: 1.0
    Safe   : Read-only — never writes to Azure, only writes to local output/ folder
#>

[CmdletBinding()]
param(
    [string]$ConfigPath  = "$PSScriptRoot\..\config\biss.config.json",
    [string]$HolidayPath = "$PSScriptRoot\..\config\biss-holidays.json",
    [int]$ExtendHolidaysYears = 3
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RootDir   = Resolve-Path "$PSScriptRoot\.."
$OutputDir = Join-Path $RootDir "output"

Write-Host ""
Write-Host "══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  BISS Student Access — Prepare Deployment Artifacts  " -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  ⚠  READ-ONLY — nothing is deployed to Azure        " -ForegroundColor Yellow
Write-Host ""

# ─── Load config ──────────────────────────────────────────────────────────────
Write-Host "📄 Loading config: $ConfigPath" -ForegroundColor Gray
$config   = Get-Content $ConfigPath -Raw | ConvertFrom-Json

Write-Host "📄 Loading holidays: $HolidayPath" -ForegroundColor Gray
$holidays = Get-Content $HolidayPath -Raw | ConvertFrom-Json

# ─── Build flat holiday list ───────────────────────────────────────────────────
Write-Host ""
Write-Host "📅 Building holiday calendar..." -ForegroundColor Cyan

$flatHolidays = [System.Collections.Generic.List[PSObject]]::new()

# Add pre-computed years from the JSON file
foreach ($year in ($holidays.PSObject.Properties | Where-Object { $_.Name -match '^\d{4}$' })) {
    foreach ($h in $year.Value.holidays) {
        $flatHolidays.Add([PSCustomObject]@{
            date   = $h.date
            name   = $h.name
            nameEn = $h.nameEn
            type   = $h.type
        })
    }
    Write-Host "  ✅ $($year.Name): $($year.Value.holidays.Count) holidays loaded" -ForegroundColor Gray
}

# Optionally compute future years algorithmically
if ($ExtendHolidaysYears -gt 0) {
    $lastYear = ($holidays.PSObject.Properties | Where-Object { $_.Name -match '^\d{4}$' } | 
                 Sort-Object Name | Select-Object -Last 1).Name -as [int]
    $futureYears = ($lastYear + 1) .. ($lastYear + $ExtendHolidaysYears)

    Write-Host "  🔭 Computing future years: $($futureYears -join ', ')" -ForegroundColor Gray

    $holidayScript = Join-Path $PSScriptRoot "Get-NorwegianHolidays.ps1"
    if (Test-Path $holidayScript) {
        $computed = & $holidayScript -Year $futureYears
        foreach ($h in $computed) {
            $flatHolidays.Add([PSCustomObject]@{
                date   = $h.Date
                name   = $h.Name
                nameEn = $h.NameEn
                type   = $h.Type
            })
            Write-Host "  ✅ $($h.Date): $($h.NameEn) (computed)" -ForegroundColor DarkGray
        }
    } else {
        Write-Warning "  ⚠  Get-NorwegianHolidays.ps1 not found — skipping future year computation"
    }
}

$flatHolidays = $flatHolidays | Sort-Object date
Write-Host "  Total holidays: $($flatHolidays.Count) across $( ($flatHolidays | Select-Object -ExpandProperty date | ForEach-Object { $_.Substring(0,4) } | Sort-Object -Unique).Count ) years" -ForegroundColor Green

# ─── Build SchedulePolicies variable ─────────────────────────────────────────
Write-Host ""
Write-Host "📋 Building SchedulePolicies..." -ForegroundColor Cyan

$schedulePolicies = $config.schedulePolicies | ForEach-Object {
    # Rename groupIds → assignedGroupIds (match runbook schema)
    [PSCustomObject]@{
        id              = $_.id
        name            = $_.name
        description     = $_.description
        enableTime      = $_.enableTime
        disableTime     = $_.disableTime
        daysOfWeek      = $_.daysOfWeek
        timezone        = $_.timezone
        isActive        = $_.isActive
        respectHolidays = if ($null -ne $_.respectHolidays) { $_.respectHolidays } else { $true }
        groupIds        = if ($_.groupIds) { $_.groupIds } else { @() }
        assignedGroupIds = if ($_.groupIds) { $_.groupIds } else { @() }
    }
}

foreach ($p in $schedulePolicies) {
    $status = if ($p.isActive) { "✅ ACTIVE" } else { "⏸  inactive" }
    Write-Host "  $status  $($p.name)  [$($p.enableTime)–$($p.disableTime)]  groups: $($p.groupIds.Count)" -ForegroundColor $(if ($p.isActive) { "Green" } else { "Gray" })
}

# ─── Assemble all Automation Variables ───────────────────────────────────────
Write-Host ""
Write-Host "🔧 Assembling Automation Variables..." -ForegroundColor Cyan

$mainGroupId = $config._activePolicyGroups[0]   # first active group used for legacy runbooks

$automationVariables = [ordered]@{

    # ── Identity ──────────────────────────────────────────────────────────
    "TenantId"            = $config.tenant.tenantId
    "SubscriptionId"      = $config.tenant.subscriptionId

    # ── Legacy compatibility (Enable/Disable-StudentAccess.ps1) ──────────
    # These older runbooks read a single group — point to the first active group.
    # The preferred path is Apply-SchedulePolicies.ps1 which reads SchedulePolicies.
    "StudentGroupId"      = $mainGroupId
    "RevokeTokens"        = $true

    # ── Schedule + Holiday (shared source of truth) ───────────────────────
    "SchedulePolicies"    = ($schedulePolicies | ConvertTo-Json -Depth 10 -Compress)
    "HolidayCalendar"     = ($flatHolidays     | ConvertTo-Json -Depth 5  -Compress)

    # ── Suspensions (starts empty — portal and Process-Suspensions write here) ──
    "SuspendedStudents"   = "[]"

    # ── Notification ─────────────────────────────────────────────────────
    "NotificationEmail"   = $config.tenant.adminUPN
    "SchoolName"          = $config.tenant.schoolName
}

Write-Host "  Variables prepared: $($automationVariables.Keys.Count)" -ForegroundColor Green
foreach ($k in $automationVariables.Keys) {
    $preview = $automationVariables[$k].ToString()
    if ($preview.Length -gt 80) { $preview = $preview.Substring(0, 77) + "..." }
    Write-Host "    $k = $preview" -ForegroundColor DarkGray
}

# ─── Write output files ───────────────────────────────────────────────────────
Write-Host ""
Write-Host "💾 Writing output files to: $OutputDir" -ForegroundColor Cyan
New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null

$varFile      = Join-Path $OutputDir "biss-automation-variables.json"
$policiesFile = Join-Path $OutputDir "biss-schedule-policies.json"
$holidayFile  = Join-Path $OutputDir "biss-holiday-calendar.json"

$automationVariables | ConvertTo-Json -Depth 3 | Set-Content $varFile -Encoding UTF8
Write-Host "  ✅ $varFile" -ForegroundColor Green

$schedulePolicies | ConvertTo-Json -Depth 10 | Set-Content $policiesFile -Encoding UTF8
Write-Host "  ✅ $policiesFile" -ForegroundColor Green

$flatHolidays | ConvertTo-Json -Depth 5 | Set-Content $holidayFile -Encoding UTF8
Write-Host "  ✅ $holidayFile" -ForegroundColor Green

# ─── Print next steps ─────────────────────────────────────────────────────────
Write-Host ""
Write-Host "══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  NEXT STEPS (when ready to deploy)                   " -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "  1. Review the generated files in output/" -ForegroundColor White
Write-Host "     - biss-automation-variables.json" -ForegroundColor Gray
Write-Host "     - biss-schedule-policies.json" -ForegroundColor Gray
Write-Host "     - biss-holiday-calendar.json" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. To change timing later — edit config/biss.config.json:" -ForegroundColor White
Write-Host "     defaultSchedule.enableTime  = '07:00'  ← change this" -ForegroundColor Gray
Write-Host "     defaultSchedule.disableTime = '18:00'  ← change this" -ForegroundColor Gray
Write-Host "     Then re-run this script and redeploy the variable." -ForegroundColor Gray
Write-Host "     OR: change directly in the portal UI → Policies page" -ForegroundColor Gray
Write-Host "     (portal writes back to the Automation Variable immediately)" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. Run Deploy-StudentAccessAutomation.ps1 to push to Azure:" -ForegroundColor White
Write-Host "     .\scripts\Deploy-StudentAccessAutomation.ps1 -ConfigPath config\biss.config.json" -ForegroundColor Gray
Write-Host ""
Write-Host "  ⚠  Add years to holidays by running:" -ForegroundColor Yellow
Write-Host "     .\scripts\Get-NorwegianHolidays.ps1 -Year 2031 -AsJson" -ForegroundColor Gray
Write-Host "     Then paste into config/biss-holidays.json OR update via portal UI" -ForegroundColor Gray
Write-Host ""

Write-Host "Done. Nothing was deployed to the customer tenant." -ForegroundColor Green
