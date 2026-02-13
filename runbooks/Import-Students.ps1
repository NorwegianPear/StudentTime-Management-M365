<#
.SYNOPSIS
    Imports students from a CSV file (blob storage or local) into Entra ID and class groups.

.DESCRIPTION
    This runbook enables bulk student onboarding for start of school year or mid-year intake:
    1. Reads a CSV file from Azure Blob Storage (or Automation Variable)
    2. Creates user accounts in Entra ID
    3. Adds each student to their designated class group
    4. Adds all students to the main student group
    5. Outputs a report with temp passwords

    CSV Format:
    FirstName,LastName,Class,Department
    Emma,Hansen,Demo-Students-8A,Class 8A
    Noah,Johansen,Demo-Students-9B,Class 9B

    The "Class" column must match a security group DisplayName in Entra ID.

.PARAMETER CsvBlobUrl
    URL to the CSV file in Azure Blob Storage (with SAS token).

.PARAMETER CsvContent
    CSV content as a string (alternative to blob URL — for testing or Automation Variable input).

.PARAMETER DefaultPassword
    Default password for new accounts. Default: "Welcome2026!Student"

.PARAMETER StudentGroupId
    The main "all students" group ID. Loaded from Automation Variable if not provided.

.PARAMETER WhatIf
    Show what would happen without making changes.

.NOTES
    Author: Uy Le Phan (Atea AS)
    Version: 1.0
    Required Modules: Microsoft.Graph.Authentication, Microsoft.Graph.Users, Microsoft.Graph.Groups
    Required Permissions: User.ReadWrite.All, Group.ReadWrite.All
#>

[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter()]
    [string]$CsvBlobUrl = "",

    [Parameter()]
    [string]$CsvContent = "",

    [Parameter()]
    [string]$DefaultPassword = "Welcome2026!Student",

    [Parameter()]
    [string]$StudentGroupId = ""
)

# ═══════════════════════════════════════════════════════════════════════════
# CONNECT
# ═══════════════════════════════════════════════════════════════════════════

$Domain = Get-AutomationVariable -Name 'TenantDomain' -ErrorAction SilentlyContinue
if (-not $Domain) { $Domain = "ateara.onmicrosoft.com" }
if (-not $StudentGroupId) {
    $StudentGroupId = Get-AutomationVariable -Name 'StudentGroupId' -ErrorAction SilentlyContinue
}

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
# LOAD CSV DATA
# ═══════════════════════════════════════════════════════════════════════════

$students = @()

if ($CsvBlobUrl) {
    Write-Output "📥 Downloading CSV from blob storage..."
    try {
        $csvText = (Invoke-WebRequest -Uri $CsvBlobUrl -UseBasicParsing).Content
        $students = $csvText | ConvertFrom-Csv
    }
    catch {
        Write-Error "❌ Failed to download CSV: $_"
        throw
    }
}
elseif ($CsvContent) {
    Write-Output "📋 Parsing inline CSV content..."
    $students = $CsvContent | ConvertFrom-Csv
}
else {
    # Try loading from Automation Variable
    try {
        $csvVar = Get-AutomationVariable -Name 'StudentImportCsv'
        if ($csvVar) {
            $students = $csvVar | ConvertFrom-Csv
            Write-Output "📋 Loaded CSV from Automation Variable 'StudentImportCsv'"
        }
    }
    catch { }

    if ($students.Count -eq 0) {
        Write-Error "❌ No CSV data provided. Use -CsvBlobUrl, -CsvContent, or set 'StudentImportCsv' Automation Variable."
        throw "No CSV data"
    }
}

Write-Output "📊 Found $($students.Count) student(s) to import"

# ═══════════════════════════════════════════════════════════════════════════
# RESOLVE GROUP NAMES TO IDs
# ═══════════════════════════════════════════════════════════════════════════

$groupCache = @{}

function Get-GroupIdByName {
    param([string]$GroupName)

    if ($groupCache.ContainsKey($GroupName)) {
        return $groupCache[$GroupName]
    }

    $group = Get-MgGroup -Filter "displayName eq '$GroupName'" -Top 1
    if ($group) {
        $groupCache[$GroupName] = $group.Id
        return $group.Id
    }

    Write-Warning "⚠️  Group not found: $GroupName"
    return $null
}

# ═══════════════════════════════════════════════════════════════════════════
# IMPORT STUDENTS
# ═══════════════════════════════════════════════════════════════════════════

$created   = 0
$skipped   = 0
$errors    = 0
$report    = @()

Write-Output ""
Write-Output "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

foreach ($student in $students) {
    $firstName  = $student.FirstName.Trim()
    $lastName   = $student.LastName.Trim()
    $className  = $student.Class.Trim()
    $department = if ($student.Department) { $student.Department.Trim() } else { $className }

    $displayName = "$firstName $lastName"
    $upn = "$($firstName.ToLower()).$($lastName.ToLower())@$Domain" -replace '[^a-z0-9.@_-]', ''

    Write-Output ""
    Write-Output "👤 $displayName ($upn) → $className"

    # Check if user already exists
    $existingUser = $null
    try {
        $existingUser = Get-MgUser -Filter "userPrincipalName eq '$upn'" -Top 1 -ErrorAction SilentlyContinue
    }
    catch { }

    if ($existingUser) {
        Write-Output "   ⏭️  User already exists (ID: $($existingUser.Id))"
        $skipped++

        # Still try to add to group
        $groupId = Get-GroupIdByName -GroupName $className
        if ($groupId) {
            try {
                New-MgGroupMember -GroupId $groupId -DirectoryObjectId $existingUser.Id -ErrorAction SilentlyContinue
                Write-Output "   ✅ Added to group: $className"
            }
            catch {
                Write-Output "   ℹ️  Already in group or failed: $($_.Exception.Message)"
            }
        }
        continue
    }

    # Create user
    if ($PSCmdlet.ShouldProcess($displayName, "Create user and add to $className")) {
        try {
            $newUser = New-MgUser `
                -AccountEnabled:$true `
                -DisplayName $displayName `
                -GivenName $firstName `
                -Surname $lastName `
                -UserPrincipalName $upn `
                -MailNickname ($upn -replace '@.*$', '') `
                -PasswordProfile @{
                    ForceChangePasswordNextSignIn = $true
                    Password                     = $DefaultPassword
                } `
                -Department $department `
                -JobTitle "Student" `
                -UsageLocation "NO"

            Write-Output "   ✅ Created (ID: $($newUser.Id))"

            # Add to class group
            $groupId = Get-GroupIdByName -GroupName $className
            if ($groupId) {
                try {
                    New-MgGroupMember -GroupId $groupId -DirectoryObjectId $newUser.Id
                    Write-Output "   ✅ Added to: $className"
                }
                catch {
                    Write-Warning "   ⚠️  Failed to add to $className : $_"
                }
            }

            # Add to main student group
            if ($StudentGroupId) {
                try {
                    New-MgGroupMember -GroupId $StudentGroupId -DirectoryObjectId $newUser.Id
                    Write-Output "   ✅ Added to main student group"
                }
                catch {
                    Write-Output "   ℹ️  Already in main group or failed"
                }
            }

            $report += [PSCustomObject]@{
                Name     = $displayName
                UPN      = $upn
                Class    = $className
                Password = $DefaultPassword
                Status   = "Created"
            }
            $created++
        }
        catch {
            Write-Warning "   ❌ Failed to create: $_"
            $report += [PSCustomObject]@{
                Name     = $displayName
                UPN      = $upn
                Class    = $className
                Password = "N/A"
                Status   = "FAILED: $_"
            }
            $errors++
        }
    }
}

# ═══════════════════════════════════════════════════════════════════════════
# REPORT
# ═══════════════════════════════════════════════════════════════════════════

Write-Output ""
Write-Output "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Output "📊 Import Summary:"
Write-Output "   Created: $created"
Write-Output "   Skipped (existing): $skipped"
Write-Output "   Errors: $errors"
Write-Output ""

if ($report.Count -gt 0) {
    Write-Output "📋 New Student Report:"
    $report | Format-Table -AutoSize | Out-String | Write-Output
}

Write-Output "Completed at: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

# ── Email Notification ────────────────────────────────────────────────────
try {
    . $PSScriptRoot\Send-Notification.ps1

    $summaryData = [ordered]@{
        "Students Created"  = $created
        "Skipped (existing)" = $skipped
        "Errors"            = $errors
        "Total in CSV"      = $students.Count
    }
    # Filter out passwords from email report for security
    $emailReport = $report | Select-Object Name, UPN, Class, Status
    $statusLevel = if ($errors -gt 0) { "Warning" } else { "Success" }
    $htmlBody = New-HtmlReport -Title "👤 Student Import Completed" -Summary $summaryData -DetailRows $emailReport -Status $statusLevel

    $subject = if ($errors -gt 0) {
        "⚠️ Student Import: $created created, $errors errors"
    } else {
        "👤 Student Import: $created new students created"
    }

    Send-NotificationEmail -To @() -Subject $subject -Body $htmlBody -Priority "High"

    Write-AuditRecord -Action 'student_created' -Details "Imported $created students, skipped $skipped, errors $errors"
}
catch {
    Write-Warning "⚠️  Notification failed: $($_.Exception.Message)"
}

try { Disconnect-MgGraph -ErrorAction SilentlyContinue } catch { }
