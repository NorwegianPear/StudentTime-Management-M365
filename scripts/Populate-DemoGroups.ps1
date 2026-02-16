<#
.SYNOPSIS
    Populates demo security groups with their intended members.

.DESCRIPTION
    Adds demo students to their class groups and the master "Demo-AllStudents" group,
    and adds teachers/staff to the "Demo-Portal-Staff" group.
    Also adds relevant students to special groups (AfterSchool, Exam-Extended).

    Run this after Setup-DemoEnvironment.ps1 if groups show 0 members.

.EXAMPLE
    .\Populate-DemoGroups.ps1
#>

[CmdletBinding()]
param()

$Domain = "ateara.onmicrosoft.com"
$TargetTenantId = "973a580f-021f-4dc0-88de-48b060e43df1"

# ── Class → Student mapping ──────────────────────────────────────────────
$ClassMembers = @{
    "Demo-Students-8A" = @(
        "emma.hansen", "noah.johansen", "olivia.olsen", "william.larsen", "sophia.andersen"
    )
    "Demo-Students-9B" = @(
        "liam.pedersen", "mia.nilsen", "lucas.kristiansen", "ella.jensen", "oscar.karlsen"
    )
    "Demo-Students-10A" = @(
        "jakob.berg", "nora.haugen", "filip.hagen", "ingrid.eriksen", "erik.bakken"
    )
    "Demo-Students-10B" = @(
        "sara.lie", "magnus.dahl", "amalie.lund", "henrik.moen", "thea.holm"
    )
}

# Special groups
$SpecialGroupMembers = @{
    "Demo-AfterSchool-Program" = @("emma.hansen", "liam.pedersen", "jakob.berg")
    "Demo-Exam-Extended"       = @("noah.johansen", "nora.haugen")
}

# Staff/Portal access group
$StaffUPNs = @(
    "veronica@ateara.onmicrosoft.com",
    "paul.johnny.klock@ateara.onmicrosoft.com",
    "uy.le.thai.phan@ateara.onmicrosoft.com"
)

# Teachers (also get added to their class groups as owners, and to portal staff)
$Teachers = @(
    @{ UPN = "kari.nordmann@$Domain"; Groups = @("Demo-Students-8A", "Demo-Students-9B") }
    @{ UPN = "per.svendsen@$Domain"; Groups = @("Demo-Students-10A", "Demo-Students-10B") }
    @{ UPN = "anne.bakke@$Domain"; Groups = @("Demo-Students-8A", "Demo-Students-10A") }
)

# IT Staff
$ITStaff = @(
    "lars.it-admin@$Domain",
    "marit.support@$Domain"
)

# ═══════════════════════════════════════════════════════════════════════════
Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   📋 Populate Demo Groups with Members                       ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ── Connect ──────────────────────────────────────────────────────────────
$context = Get-MgContext
if (-not $context -or $context.TenantId -ne $TargetTenantId) {
    Write-Host "Connecting to Microsoft Graph..." -ForegroundColor Yellow
    Connect-MgGraph -TenantId $TargetTenantId -Scopes @(
        "User.Read.All", "Group.ReadWrite.All", "GroupMember.ReadWrite.All"
    ) -NoWelcome
    $context = Get-MgContext
}
Write-Host "✅ Connected as: $($context.Account)" -ForegroundColor Green
Write-Host ""

# ── Helper: Add user to group ────────────────────────────────────────────
function Add-MemberSafe {
    param([string]$GroupId, [string]$UserId, [string]$Label)
    try {
        New-MgGroupMemberByRef -GroupId $GroupId -BodyParameter @{
            "@odata.id" = "https://graph.microsoft.com/v1.0/directoryObjects/$UserId"
        } -ErrorAction Stop
        Write-Host "   ✅ Added: $Label" -ForegroundColor Green
    }
    catch {
        if ($_.Exception.Message -like "*already exist*" -or $_.Exception.Message -like "*added*") {
            Write-Host "   ⏭️  Already member: $Label" -ForegroundColor Yellow
        } else {
            Write-Host "   ❌ Failed: $Label — $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

function Add-OwnerSafe {
    param([string]$GroupId, [string]$UserId, [string]$Label)
    try {
        New-MgGroupOwnerByRef -GroupId $GroupId -BodyParameter @{
            "@odata.id" = "https://graph.microsoft.com/v1.0/directoryObjects/$UserId"
        } -ErrorAction Stop
        Write-Host "   ✅ Owner added: $Label" -ForegroundColor Green
    }
    catch {
        if ($_.Exception.Message -like "*already exist*" -or $_.Exception.Message -like "*added*") {
            Write-Host "   ⏭️  Already owner: $Label" -ForegroundColor Yellow
        } else {
            Write-Host "   ❌ Owner failed: $Label — $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

# ── Resolve group IDs ────────────────────────────────────────────────────
Write-Host "━━━ Resolving groups ━━━" -ForegroundColor Magenta
$groupCache = @{}
$allGroupNames = @($ClassMembers.Keys) + @($SpecialGroupMembers.Keys) + @("Demo-AllStudents", "Demo-Portal-Staff")

foreach ($gName in ($allGroupNames | Sort-Object -Unique)) {
    $g = Get-MgGroup -Filter "displayName eq '$gName'" -ErrorAction SilentlyContinue
    if ($g) {
        $groupCache[$gName] = $g.Id
        Write-Host "   📁 $gName → $($g.Id)" -ForegroundColor Gray
    } else {
        Write-Host "   ⚠️  Group not found: $gName (skipping)" -ForegroundColor Yellow
    }
}
Write-Host ""

# ── Populate class groups + master group ─────────────────────────────────
$allStudentIds = @()

foreach ($className in $ClassMembers.Keys | Sort-Object) {
    $groupId = $groupCache[$className]
    if (-not $groupId) { continue }

    Write-Host "━━━ $className ━━━" -ForegroundColor Magenta
    foreach ($mailNick in $ClassMembers[$className]) {
        $upn = "$mailNick@$Domain"
        $user = Get-MgUser -Filter "userPrincipalName eq '$upn'" -ErrorAction SilentlyContinue
        if ($user) {
            Add-MemberSafe -GroupId $groupId -UserId $user.Id -Label "$($user.DisplayName) → $className"
            $allStudentIds += $user.Id
        } else {
            Write-Host "   ⚠️  User not found: $upn" -ForegroundColor Yellow
        }
    }
    Write-Host ""
}

# Add all students to master group
$masterGroupId = $groupCache["Demo-AllStudents"]
if ($masterGroupId -and $allStudentIds.Count -gt 0) {
    Write-Host "━━━ Demo-AllStudents (master group) ━━━" -ForegroundColor Magenta
    $uniqueIds = $allStudentIds | Sort-Object -Unique
    foreach ($sid in $uniqueIds) {
        $user = Get-MgUser -UserId $sid -Property "displayName" -ErrorAction SilentlyContinue
        Add-MemberSafe -GroupId $masterGroupId -UserId $sid -Label "$($user.DisplayName) → Demo-AllStudents"
    }
    Write-Host ""
}

# ── Special groups ───────────────────────────────────────────────────────
foreach ($sgName in $SpecialGroupMembers.Keys | Sort-Object) {
    $groupId = $groupCache[$sgName]
    if (-not $groupId) { continue }

    Write-Host "━━━ $sgName ━━━" -ForegroundColor Magenta
    foreach ($mailNick in $SpecialGroupMembers[$sgName]) {
        $upn = "$mailNick@$Domain"
        $user = Get-MgUser -Filter "userPrincipalName eq '$upn'" -ErrorAction SilentlyContinue
        if ($user) {
            Add-MemberSafe -GroupId $groupId -UserId $user.Id -Label "$($user.DisplayName) → $sgName"
        } else {
            Write-Host "   ⚠️  User not found: $upn" -ForegroundColor Yellow
        }
    }
    Write-Host ""
}

# ── Teachers → class groups (as owners) + portal staff ────────────────────
$staffGroupId = $groupCache["Demo-Portal-Staff"]

Write-Host "━━━ Teachers ━━━" -ForegroundColor Magenta
foreach ($teacher in $Teachers) {
    $user = Get-MgUser -Filter "userPrincipalName eq '$($teacher.UPN)'" -ErrorAction SilentlyContinue
    if (-not $user) {
        Write-Host "   ⚠️  Teacher not found: $($teacher.UPN)" -ForegroundColor Yellow
        continue
    }
    # Add as owner to class groups
    foreach ($gName in $teacher.Groups) {
        $gid = $groupCache[$gName]
        if ($gid) {
            Add-OwnerSafe -GroupId $gid -UserId $user.Id -Label "$($user.DisplayName) → $gName"
        }
    }
    # Add to staff group
    if ($staffGroupId) {
        Add-MemberSafe -GroupId $staffGroupId -UserId $user.Id -Label "$($user.DisplayName) → Demo-Portal-Staff"
    }
}
Write-Host ""

# ── IT Staff → portal staff group ────────────────────────────────────────
Write-Host "━━━ IT Staff ━━━" -ForegroundColor Magenta
foreach ($upn in $ITStaff) {
    $user = Get-MgUser -Filter "userPrincipalName eq '$upn'" -ErrorAction SilentlyContinue
    if ($user -and $staffGroupId) {
        Add-MemberSafe -GroupId $staffGroupId -UserId $user.Id -Label "$($user.DisplayName) → Demo-Portal-Staff"
    } elseif (-not $user) {
        Write-Host "   ⚠️  Not found: $upn" -ForegroundColor Yellow
    }
}
Write-Host ""

# ── Existing staff UPNs → portal staff group ─────────────────────────────
Write-Host "━━━ Existing Staff ━━━" -ForegroundColor Magenta
foreach ($upn in $StaffUPNs) {
    $user = Get-MgUser -Filter "userPrincipalName eq '$upn'" -ErrorAction SilentlyContinue
    if ($user -and $staffGroupId) {
        Add-MemberSafe -GroupId $staffGroupId -UserId $user.Id -Label "$($user.DisplayName) → Demo-Portal-Staff"
    } elseif (-not $user) {
        Write-Host "   ⚠️  Not found: $upn" -ForegroundColor Yellow
    }
}
Write-Host ""

# ── Summary ──────────────────────────────────────────────────────────────
Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║   ✅ Demo group population complete!                         ║" -ForegroundColor Green
Write-Host "║                                                              ║" -ForegroundColor Green
Write-Host "║   Class groups: 4 groups × 5 students each                   ║" -ForegroundColor Green
Write-Host "║   Master group: Demo-AllStudents (all 20 students)           ║" -ForegroundColor Green
Write-Host "║   Special groups: AfterSchool (3), Exam-Extended (2)         ║" -ForegroundColor Green
Write-Host "║   Staff group: Teachers + IT + existing staff                ║" -ForegroundColor Green
Write-Host "║                                                              ║" -ForegroundColor Green
Write-Host "║   Refresh the portal to see updated member counts.           ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
