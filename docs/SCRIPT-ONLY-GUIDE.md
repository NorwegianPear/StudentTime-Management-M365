# Script-Only Operations Guide

> For schools using **only PowerShell scripts and Azure Automation** — no portal required.

This guide covers everything you need to manage student access using only the command line and Azure Portal.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Daily Operations (Automated)](#daily-operations-automated)
3. [New Students](#new-students)
4. [Class Transfers](#class-transfers)
5. [Special Groups & Override Schedules](#special-groups--override-schedules)
6. [Suspending Students](#suspending-students)
7. [Year-End Promotions](#year-end-promotions)
8. [Schedule Policy Management](#schedule-policy-management)
9. [Monitoring & Notifications](#monitoring--notifications)
10. [Emergency Procedures](#emergency-procedures)
11. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites

```powershell
# 1. Install required modules
Install-Module Microsoft.Graph.Authentication -Force
Install-Module Microsoft.Graph.Users -Force
Install-Module Microsoft.Graph.Groups -Force
Install-Module Az.Accounts -Force
Install-Module Az.Automation -Force

# 2. Set your environment variables
$ResourceGroup = "rg-student-access-automation"
$AutomationAccount = "StudentAccessAutomation"
```

### Connect to Azure & Graph

```powershell
# Connect to Azure (for managing Automation)
Connect-AzAccount

# Connect to Microsoft Graph (for direct user/group management)
Connect-MgGraph -Scopes "User.ReadWrite.All", "Group.ReadWrite.All"
```

### Verify Setup

```powershell
# Check runbooks are published
Get-AzAutomationRunbook -ResourceGroupName $ResourceGroup `
    -AutomationAccountName $AutomationAccount |
    Select-Object Name, State, LastModifiedTime |
    Format-Table -AutoSize

# Check schedules are active
Get-AzAutomationSchedule -ResourceGroupName $ResourceGroup `
    -AutomationAccountName $AutomationAccount |
    Select-Object Name, IsEnabled, NextRun, Frequency |
    Format-Table -AutoSize

# Check student group
$groupId = (Get-AzAutomationVariable -ResourceGroupName $ResourceGroup `
    -AutomationAccountName $AutomationAccount -Name 'StudentGroupId').Value
$members = Get-MgGroupMember -GroupId $groupId -All
Write-Host "Student group has $($members.Count) members"
```

---

## Daily Operations (Automated)

Once deployed, the system runs **completely unattended**:

```
┌─────────────────────────────────────────────────────────┐
│                  AUTOMATED DAILY SCHEDULE                │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  07:00  📧 Send-MonitoringReport (daily summary email)  │
│  07:55  ✅ Enable-StudentAccess (accounts enabled)      │
│  Every 15 min:                                           │
│         🕒 Apply-SchedulePolicies (per-group schedules) │
│         🔄 Sync-GroupMembership (pending changes)       │
│         ⏸️  Process-Suspensions (auto-lift expired)      │
│  16:05  🚫 Disable-StudentAccess (accounts disabled)   │
│                                                          │
│  Saturday & Sunday: No enables — students stay disabled  │
└─────────────────────────────────────────────────────────┘
```

### View Recent Job History

```powershell
# Last 10 jobs
Get-AzAutomationJob -ResourceGroupName $ResourceGroup `
    -AutomationAccountName $AutomationAccount |
    Sort-Object StartTime -Descending |
    Select-Object -First 10 RunbookName, Status, StartTime, EndTime |
    Format-Table -AutoSize

# View output of a specific job
$job = Get-AzAutomationJob -ResourceGroupName $ResourceGroup `
    -AutomationAccountName $AutomationAccount |
    Sort-Object StartTime -Descending | Select-Object -First 1

Get-AzAutomationJobOutput -ResourceGroupName $ResourceGroup `
    -AutomationAccountName $AutomationAccount `
    -Id $job.JobId -Stream Output
```

### Check Failed Jobs

```powershell
# Jobs that failed in the last 7 days
$since = (Get-Date).AddDays(-7)
Get-AzAutomationJob -ResourceGroupName $ResourceGroup `
    -AutomationAccountName $AutomationAccount |
    Where-Object { $_.Status -eq 'Failed' -and $_.StartTime -gt $since } |
    Select-Object RunbookName, Status, StartTime, Exception |
    Format-Table -AutoSize
```

---

## New Students

### Option A: Single Student (Direct)

```powershell
# Connect to Graph
Connect-MgGraph -Scopes "User.ReadWrite.All", "Group.ReadWrite.All"

# Create the user
$password = ConvertTo-SecureString "Welcome2026!Student" -AsPlainText -Force
$newUser = New-MgUser `
    -AccountEnabled:$true `
    -DisplayName "Emma Hansen" `
    -GivenName "Emma" `
    -Surname "Hansen" `
    -UserPrincipalName "emma.hansen@school.no" `
    -MailNickname "emma.hansen" `
    -PasswordProfile @{
        ForceChangePasswordNextSignIn = $true
        Password = "Welcome2026!Student"
    } `
    -Department "Class 8A" `
    -JobTitle "Student" `
    -UsageLocation "NO"

Write-Host "Created: $($newUser.DisplayName) (ID: $($newUser.Id))"

# Add to class group
$classGroupId = "<8A-group-id>"
New-MgGroupMember -GroupId $classGroupId -DirectoryObjectId $newUser.Id

# Add to main student group
$studentGroupId = "<main-student-group-id>"
New-MgGroupMember -GroupId $studentGroupId -DirectoryObjectId $newUser.Id

Write-Host "✅ Student created and added to groups"
```

### Option B: Bulk Import (CSV via Runbook)

**Prepare CSV:**
```csv
FirstName,LastName,Class,Department
Emma,Hansen,Demo-Students-8A,Class 8A
Noah,Johansen,Demo-Students-9B,Class 9B
Olivia,Berg,Demo-Students-8A,Class 8A
Liam,Larsen,Demo-Students-10A,Class 10A
```

**Run import:**
```powershell
# Upload CSV to blob storage and run
Start-AzAutomationRunbook `
    -ResourceGroupName $ResourceGroup `
    -AutomationAccountName $AutomationAccount `
    -Name "Import-Students" `
    -Parameters @{
        CsvBlobUrl = "https://storage.blob.core.windows.net/imports/students.csv?sv=2024&sig=..."
    }

# Or set CSV as an Automation Variable (for small batches)
$csv = Get-Content "new-students.csv" -Raw
Set-AzAutomationVariable -ResourceGroupName $ResourceGroup `
    -AutomationAccountName $AutomationAccount `
    -Name "StudentImportCsv" -Value $csv -Encrypted $false

Start-AzAutomationRunbook `
    -ResourceGroupName $ResourceGroup `
    -AutomationAccountName $AutomationAccount `
    -Name "Import-Students"
```

An **email notification** with a detailed report is sent automatically after import.

---

## Class Transfers

### Option A: Direct (Immediate)

```powershell
Connect-MgGraph -Scopes "Group.ReadWrite.All"

$studentId = "<student-object-id>"
$fromGroupId = "<8A-group-id>"
$toGroupId = "<8B-group-id>"

# Remove from old class
Remove-MgGroupMemberByRef -GroupId $fromGroupId -DirectoryObjectId $studentId

# Add to new class
$body = @{ "@odata.id" = "https://graph.microsoft.com/v1.0/directoryObjects/$studentId" }
New-MgGroupMemberByRef -GroupId $toGroupId -BodyParameter $body

Write-Host "✅ Student transferred from 8A to 8B"
```

### Option B: Via Pending Changes (Queued)

Set the `PendingGroupChanges` Automation Variable — the `Sync-GroupMembership` runbook processes them every 15 minutes:

```powershell
$changes = @(
    @{
        studentId   = "<student-object-id>"
        studentName = "Emma Hansen"
        action      = "remove"
        groupId     = "<8A-group-id>"
        groupName   = "Class 8A"
        reason      = "class_transfer"
        requestedBy = "admin@school.no"
        requestedAt = (Get-Date -Format "o")
        status      = "pending"
    },
    @{
        studentId   = "<student-object-id>"
        studentName = "Emma Hansen"
        action      = "add"
        groupId     = "<8B-group-id>"
        groupName   = "Class 8B"
        reason      = "class_transfer"
        requestedBy = "admin@school.no"
        requestedAt = (Get-Date -Format "o")
        status      = "pending"
    }
) | ConvertTo-Json -Depth 5

Set-AzAutomationVariable -ResourceGroupName $ResourceGroup `
    -AutomationAccountName $AutomationAccount `
    -Name "PendingGroupChanges" -Value $changes -Encrypted $false

Write-Host "✅ Transfer queued — will be processed within 15 minutes"
```

---

## Special Groups & Override Schedules

Special groups allow different logon schedules for specific students (e.g., after-school programs, gifted classes, remedial support).

### How It Works

1. Create an Entra ID security group for the program
2. Add students to the group
3. Create a schedule policy for the group with different hours
4. The `Apply-SchedulePolicies` runbook checks all groups and applies the correct schedule

### Step-by-Step

```powershell
# 1. Create the special group
Connect-MgGraph -Scopes "Group.ReadWrite.All"

$specialGroup = New-MgGroup `
    -DisplayName "After-School-Program" `
    -Description "Students in the after-school program get extended hours" `
    -SecurityEnabled:$true `
    -MailEnabled:$false `
    -MailNickname "afterschool"

Write-Host "Group created: $($specialGroup.Id)"

# 2. Add students to the group
$studentIds = @("<student-1-id>", "<student-2-id>", "<student-3-id>")
foreach ($sid in $studentIds) {
    New-MgGroupMember -GroupId $specialGroup.Id -DirectoryObjectId $sid
}
Write-Host "✅ Added $($studentIds.Count) students to After-School Program"

# 3. Add the group to SchedulePolicies with extended hours
$policiesJson = (Get-AzAutomationVariable -ResourceGroupName $ResourceGroup `
    -AutomationAccountName $AutomationAccount -Name 'SchedulePolicies').Value
$policies = $policiesJson | ConvertFrom-Json

# Add new policy for special group
$policies += @{
    name         = "After-School Program"
    enableTime   = "07:00"
    disableTime  = "18:00"
    daysOfWeek   = @("Monday", "Tuesday", "Wednesday", "Thursday", "Friday")
    isActive     = $true
    groupIds     = @($specialGroup.Id)
}

$updatedJson = $policies | ConvertTo-Json -Depth 5
Set-AzAutomationVariable -ResourceGroupName $ResourceGroup `
    -AutomationAccountName $AutomationAccount `
    -Name "SchedulePolicies" -Value $updatedJson -Encrypted $false

Write-Host "✅ Extended hours policy applied — students in After-School Program get 07:00-18:00"
```

### Important Notes

- Students can be in **multiple groups** — the schedule policy that runs last "wins"
- Run `Apply-SchedulePolicies` more frequently than your shortest enable/disable window
- To remove a student from a special group, simply remove them from the Entra ID group:

```powershell
Remove-MgGroupMemberByRef -GroupId "<special-group-id>" -DirectoryObjectId "<student-id>"
```

---

## Suspending Students

### Suspend a Student

```powershell
# 1. Immediately disable the account
Connect-MgGraph -Scopes "User.ReadWrite.All"
Update-MgUser -UserId "<student-id>" -AccountEnabled:$false

# 2. Add to suspension list (so scheduled enables skip them)
$suspJson = (Get-AzAutomationVariable -ResourceGroupName $ResourceGroup `
    -AutomationAccountName $AutomationAccount -Name 'SuspendedStudents' `
    -ErrorAction SilentlyContinue).Value

$suspensions = if ($suspJson) { $suspJson | ConvertFrom-Json } else { @() }

$suspensions += @{
    studentId   = "<student-object-id>"
    studentName = "Noah Johansen"
    studentUPN  = "noah.johansen@school.no"
    reason      = "Disciplinary action"
    startDate   = (Get-Date -Format "o")
    endDate     = (Get-Date).AddDays(7).ToString("o")  # 7-day suspension
    createdBy   = "admin@school.no"
    isActive    = $true
}

$updatedJson = $suspensions | ConvertTo-Json -Depth 5
Set-AzAutomationVariable -ResourceGroupName $ResourceGroup `
    -AutomationAccountName $AutomationAccount `
    -Name "SuspendedStudents" -Value $updatedJson -Encrypted $false

Write-Host "✅ Student suspended — will auto-lift in 7 days"
```

### Lift a Suspension Early

```powershell
# 1. Re-enable the account
Update-MgUser -UserId "<student-id>" -AccountEnabled:$true

# 2. Mark suspension as inactive
$suspJson = (Get-AzAutomationVariable -ResourceGroupName $ResourceGroup `
    -AutomationAccountName $AutomationAccount -Name 'SuspendedStudents').Value
$suspensions = $suspJson | ConvertFrom-Json

foreach ($s in $suspensions) {
    if ($s.studentId -eq "<student-id>" -and $s.isActive) {
        $s.isActive = $false
    }
}

$updatedJson = $suspensions | ConvertTo-Json -Depth 5
Set-AzAutomationVariable -ResourceGroupName $ResourceGroup `
    -AutomationAccountName $AutomationAccount `
    -Name "SuspendedStudents" -Value $updatedJson -Encrypted $false

Write-Host "✅ Suspension lifted — student re-enabled"
```

---

## Year-End Promotions

### Preparation

1. Map current classes to next year's classes
2. Decide what happens to graduating students
3. **Always test with `-WhatIf` first!**

### Run Promotions

```powershell
# 1. Set promotion mappings
$mappings = @(
    @{ fromGroupId = "<8A-id>"; toGroupId = "<9A-id>"; label = "8A → 9A" }
    @{ fromGroupId = "<8B-id>"; toGroupId = "<9B-id>"; label = "8B → 9B" }
    @{ fromGroupId = "<9A-id>"; toGroupId = "<10A-id>"; label = "9A → 10A" }
    @{ fromGroupId = "<9B-id>"; toGroupId = "<10B-id>"; label = "9B → 10B" }
    @{ fromGroupId = "<10A-id>"; toGroupId = ""; label = "10A → Graduated" }
    @{ fromGroupId = "<10B-id>"; toGroupId = ""; label = "10B → Graduated" }
) | ConvertTo-Json -Depth 3

Set-AzAutomationVariable -ResourceGroupName $ResourceGroup `
    -AutomationAccountName $AutomationAccount `
    -Name "PromotionMappings" -Value $mappings -Encrypted $false

# 2. DRY RUN (WhatIf) — see what would happen
Start-AzAutomationRunbook `
    -ResourceGroupName $ResourceGroup `
    -AutomationAccountName $AutomationAccount `
    -Name "Promote-Students" `
    -Parameters @{ DisableGraduated = $true } `
    -Wait

# 3. Review the job output, then run for real (remove -WhatIf from runbook or run without)
```

An **email notification** is sent automatically with a detailed promotion report.

---

## Schedule Policy Management

### View Current Policies

```powershell
$policiesJson = (Get-AzAutomationVariable -ResourceGroupName $ResourceGroup `
    -AutomationAccountName $AutomationAccount -Name 'SchedulePolicies').Value
$policies = $policiesJson | ConvertFrom-Json
$policies | Format-Table name, enableTime, disableTime, isActive, @{
    N='Groups'; E={$_.groupIds.Count}
}
```

### Add a New Policy

```powershell
$policies += @{
    name       = "Friday Early"
    enableTime = "08:00"
    disableTime = "13:00"
    daysOfWeek = @("Friday")
    isActive   = $true
    groupIds   = @("<all-students-group-id>")
}

$json = $policies | ConvertTo-Json -Depth 5
Set-AzAutomationVariable -ResourceGroupName $ResourceGroup `
    -AutomationAccountName $AutomationAccount `
    -Name "SchedulePolicies" -Value $json -Encrypted $false
```

### Disable a Policy

```powershell
$target = $policies | Where-Object { $_.name -eq "Friday Early" }
$target.isActive = $false

$json = $policies | ConvertTo-Json -Depth 5
Set-AzAutomationVariable -ResourceGroupName $ResourceGroup `
    -AutomationAccountName $AutomationAccount `
    -Name "SchedulePolicies" -Value $json -Encrypted $false
```

---

## Monitoring & Notifications

### Setup Email Notifications

```powershell
# Set the sender mailbox (must have a mailbox in your tenant)
Set-AzAutomationVariable -ResourceGroupName $ResourceGroup `
    -AutomationAccountName $AutomationAccount `
    -Name "NotificationSender" -Value "noreply@school.no" -Encrypted $false

# Set recipients (comma-separated)
Set-AzAutomationVariable -ResourceGroupName $ResourceGroup `
    -AutomationAccountName $AutomationAccount `
    -Name "NotificationRecipients" -Value "it-admin@school.no,principal@school.no" -Encrypted $false
```

### Schedule the Monitoring Report

```powershell
# Daily report at 07:00 (before school starts)
New-AzAutomationSchedule `
    -ResourceGroupName $ResourceGroup `
    -AutomationAccountName $AutomationAccount `
    -Name "Daily-Monitoring-Report" `
    -StartTime (Get-Date "07:00").AddDays(1) `
    -TimeZone "W. Europe Standard Time" `
    -DayInterval 1

Register-AzAutomationScheduledRunbook `
    -ResourceGroupName $ResourceGroup `
    -AutomationAccountName $AutomationAccount `
    -RunbookName "Send-MonitoringReport" `
    -ScheduleName "Daily-Monitoring-Report" `
    -Parameters @{ ReportType = "daily" }
```

### Run an On-Demand Report

```powershell
# Generate a full report now
Start-AzAutomationRunbook `
    -ResourceGroupName $ResourceGroup `
    -AutomationAccountName $AutomationAccount `
    -Name "Send-MonitoringReport" `
    -Parameters @{ ReportType = "full" } `
    -Wait
```

---

## Emergency Procedures

### Enable All Students NOW

```powershell
Start-AzAutomationRunbook -ResourceGroupName $ResourceGroup `
    -AutomationAccountName $AutomationAccount `
    -Name "Enable-StudentAccess" -Wait
```

### Disable All Students NOW

```powershell
Start-AzAutomationRunbook -ResourceGroupName $ResourceGroup `
    -AutomationAccountName $AutomationAccount `
    -Name "Disable-StudentAccess" -Wait
```

### Stop All Automation

```powershell
# Disable all schedules
Get-AzAutomationSchedule -ResourceGroupName $ResourceGroup `
    -AutomationAccountName $AutomationAccount |
    Where-Object { $_.IsEnabled } |
    ForEach-Object {
        Set-AzAutomationSchedule -ResourceGroupName $ResourceGroup `
            -AutomationAccountName $AutomationAccount `
            -Name $_.Name -IsEnabled $false
        Write-Host "Disabled: $($_.Name)"
    }
```

### Enable/Disable Single Student

```powershell
Connect-MgGraph -Scopes "User.ReadWrite.All"

# Enable
Update-MgUser -UserId "student@school.no" -AccountEnabled:$true

# Disable
Update-MgUser -UserId "student@school.no" -AccountEnabled:$false
```

---

## Troubleshooting

### "No members found in student group"

```powershell
# Verify the StudentGroupId is correct
$groupId = (Get-AzAutomationVariable -ResourceGroupName $ResourceGroup `
    -AutomationAccountName $AutomationAccount -Name 'StudentGroupId').Value
Write-Host "StudentGroupId: $groupId"

# Check the group exists and has members
$group = Get-MgGroup -GroupId $groupId
Write-Host "Group: $($group.DisplayName)"
$members = Get-MgGroupMember -GroupId $groupId -All
Write-Host "Members: $($members.Count)"
```

### "Failed to connect to Microsoft Graph"

```powershell
# Check Managed Identity is enabled
# Azure Portal → Automation Account → Identity → System assigned → Status: On

# Verify permissions
# Azure Portal → Entra ID → Enterprise Applications → {Automation Account name}
# → Permissions → Should show User.ReadWrite.All, Group.Read.All, etc.
```

### "Notifications not being sent"

```powershell
# Verify variables are set
$sender = (Get-AzAutomationVariable -ResourceGroupName $ResourceGroup `
    -AutomationAccountName $AutomationAccount -Name 'NotificationSender' -ErrorAction SilentlyContinue).Value
$recipients = (Get-AzAutomationVariable -ResourceGroupName $ResourceGroup `
    -AutomationAccountName $AutomationAccount -Name 'NotificationRecipients' -ErrorAction SilentlyContinue).Value

Write-Host "Sender: $sender"
Write-Host "Recipients: $recipients"

# Verify Mail.Send permission is granted
# Entra ID → App Registrations → Your App → API Permissions → Mail.Send (Application)
```

### View Detailed Error Logs

```powershell
$failedJob = Get-AzAutomationJob -ResourceGroupName $ResourceGroup `
    -AutomationAccountName $AutomationAccount |
    Where-Object { $_.Status -eq 'Failed' } |
    Sort-Object StartTime -Descending | Select-Object -First 1

# Get all streams (output, error, warning)
Get-AzAutomationJobOutput -ResourceGroupName $ResourceGroup `
    -AutomationAccountName $AutomationAccount `
    -Id $failedJob.JobId -Stream Any
```

---

*Version: 2.0 — February 2026*
*Author: Uy Le Phan (Atea AS)*
