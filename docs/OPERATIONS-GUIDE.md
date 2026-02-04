# Operations Guide

This guide provides instructions for operating and maintaining the Student Time Management solution after deployment.

---

## 📋 Table of Contents

1. [Daily Operations Overview](#daily-operations-overview)
2. [Monitoring Jobs](#monitoring-jobs)
3. [Manual Operations](#manual-operations)
4. [Schedule Management](#schedule-management)
5. [Student Group Management](#student-group-management)
6. [Troubleshooting](#troubleshooting)
7. [Maintenance Tasks](#maintenance-tasks)
8. [Emergency Procedures](#emergency-procedures)

---

## 🔄 Daily Operations Overview

### How the Solution Works

The solution runs automatically with no daily intervention required:

| Time | Action | Runbook |
|------|--------|---------|
| **07:55 AM** (Mon-Fri) | Enable student accounts | `Enable-StudentAccess` |
| **04:05 PM** (Mon-Fri) | Disable student accounts + revoke sessions | `Disable-StudentAccess` |
| **Weekends** | Students remain disabled | No action |

### Automatic Behavior

```
Monday-Friday:
├── 00:00 - 07:54  → Students DISABLED
├── 07:55          → [ENABLE RUNBOOK RUNS]
├── 07:55 - 16:04  → Students ENABLED
├── 16:05          → [DISABLE RUNBOOK RUNS]
└── 16:05 - 23:59  → Students DISABLED

Saturday-Sunday:
└── All day        → Students DISABLED (no scheduled runs)
```

---

## 📊 Monitoring Jobs

### Azure Portal - View Job History

1. Navigate to [Azure Portal](https://portal.azure.com)
2. Go to **Automation Accounts** → Select your automation account
3. Click **Jobs** in the left menu
4. View recent job executions

### Job Status Meanings

| Status | Icon | Meaning |
|--------|------|---------|
| Completed | ✅ | Job finished successfully |
| Running | 🔄 | Job is currently executing |
| Failed | ❌ | Job encountered an error |
| Suspended | ⏸️ | Job was paused |
| Queued | ⏳ | Job waiting to start |

### View Job Output

1. Click on a specific job in the Jobs list
2. Select **Output** tab to see detailed logs
3. Look for summary statistics:
   - Number of students processed
   - Accounts enabled/disabled
   - Any errors encountered

### Sample Job Output (Enable)

```
============================================
Student Access Automation - ENABLE
============================================
Timestamp: 2026-02-04 07:55:02
Connected to Microsoft Graph
Processing student group: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
============================================
Found 1013 members in student group
--------------------------------------------
[ENABLED] Student Name 1 (student1@school.no)
[ALREADY ENABLED] Student Name 2
[ENABLED] Student Name 3 (student3@school.no)
...
============================================
SUMMARY
============================================
Total students processed: 1013
Accounts enabled: 856
Already enabled: 157
Errors: 0
============================================
```

### Set Up Email Alerts (Recommended)

1. In Azure Portal, go to your Automation Account
2. Click **Alerts** → **Create** → **Alert rule**
3. Configure:
   - **Condition:** Whenever a job fails
   - **Actions:** Email notification to IT team
   - **Alert rule name:** "Student Access Job Failed"

---

## 🔧 Manual Operations

### Run a Runbook Manually

Use this when you need to enable/disable students outside the normal schedule.

#### Via Azure Portal

1. Go to **Automation Account** → **Runbooks**
2. Select the runbook (`Enable-StudentAccess` or `Disable-StudentAccess`)
3. Click **Start**
4. Confirm and monitor the job

#### Via PowerShell

```powershell
# Connect to Azure
Connect-AzAccount

# Start the Enable runbook
Start-AzAutomationRunbook `
    -ResourceGroupName "StudentAccess-RG" `
    -AutomationAccountName "StudentAccessAutomation" `
    -Name "Enable-StudentAccess"

# Start the Disable runbook
Start-AzAutomationRunbook `
    -ResourceGroupName "StudentAccess-RG" `
    -AutomationAccountName "StudentAccessAutomation" `
    -Name "Disable-StudentAccess"
```

### Check Current Student Status

Run the status report runbook to see current account states:

1. Go to **Runbooks** → `Get-StudentAccessStatus`
2. Click **Start**
3. View the output for a complete status report

---

## 📅 Schedule Management

### View Current Schedules

1. Go to **Automation Account** → **Schedules**
2. Review the configured schedules:
   - `Enable-Students-Morning` (07:55 AM, Mon-Fri)
   - `Disable-Students-Afternoon` (04:05 PM, Mon-Fri)

### Modify Schedule Times

1. Go to **Schedules** → Click on the schedule name
2. Update the **Start time**
3. Click **Save**

> ⚠️ **Note:** Changes take effect from the next scheduled run

### Disable a Schedule Temporarily

1. Go to **Schedules** → Click on the schedule
2. Toggle **Enabled** to **No**
3. Click **Save**

### Create a Holiday Schedule Exception

For school holidays when students should remain disabled:

**Option 1: Disable the Enable schedule**
1. Before the holiday, disable the `Enable-Students-Morning` schedule
2. After the holiday, re-enable it

**Option 2: Create one-time manual disable**
1. If students were enabled before holiday starts, run `Disable-StudentAccess` manually

### Common Schedule Adjustments

| Scenario | Action |
|----------|--------|
| Earlier school start | Update Enable schedule to earlier time |
| Later school end | Update Disable schedule to later time |
| Half-day Friday | Create additional Disable schedule for Friday noon |
| Holiday closure | Disable the Enable schedule temporarily |

---

## 👥 Student Group Management

### Locate the Student Group

1. Go to [Entra Admin Center](https://entra.microsoft.com)
2. Navigate to **Groups** → **All groups**
3. Search for your student group name
4. Note the **Object ID** (this is the `StudentGroupId`)

### Add Students to the Group

#### Manual Addition
1. Open the student group
2. Click **Members** → **Add members**
3. Search and select students
4. Click **Select**

#### Bulk Addition (CSV)
```powershell
# Connect to Microsoft Graph
Connect-MgGraph -Scopes "Group.ReadWrite.All"

# Import students from CSV
$students = Import-Csv "new-students.csv"
$groupId = "your-student-group-id"

foreach ($student in $students) {
    $user = Get-MgUser -Filter "userPrincipalName eq '$($student.Email)'"
    if ($user) {
        New-MgGroupMember -GroupId $groupId -DirectoryObjectId $user.Id
        Write-Host "Added: $($student.Email)"
    }
}
```

### Remove Students from the Group

1. Open the student group → **Members**
2. Select students to remove
3. Click **Remove**

> **Note:** Removed students will no longer be affected by the automation. Their account state will remain as-is until manually changed.

### Using Dynamic Groups (Advanced)

If you have Entra ID P1/P2, you can use dynamic membership rules:

```
(user.department -eq "Student") or (user.jobTitle -eq "Student")
```

This automatically adds/removes users based on their attributes.

---

## 🔍 Troubleshooting

### Common Issues and Solutions

#### Issue: Job Fails with "Access Denied"

**Symptoms:** Job fails immediately with permission error

**Solutions:**
1. Verify App Registration permissions are granted admin consent
2. Check if client secret has expired
3. Verify the App Registration still exists

```powershell
# Check app registration
Connect-MgGraph -Scopes "Application.Read.All"
Get-MgApplication -Filter "displayName eq 'Student-Access-Automation'"
```

#### Issue: Job Completes but No Users Affected

**Symptoms:** Job shows "0 members found"

**Solutions:**
1. Verify `StudentGroupId` variable is correct
2. Check the student group has members
3. Verify the group type is "Security" (not M365 Group)

```powershell
# Verify group membership count
Connect-MgGraph -Scopes "Group.Read.All"
$group = Get-MgGroup -GroupId "your-student-group-id"
$members = Get-MgGroupMember -GroupId $group.Id -All
Write-Host "Members in group: $($members.Count)"
```

#### Issue: Some Students Not Processed

**Symptoms:** Job completes but some students show errors

**Solutions:**
1. Check job output for specific error messages
2. Common causes:
   - Deleted users still in group
   - Guest accounts (not supported)
   - Synchronized accounts with on-prem restrictions

#### Issue: Schedule Not Running

**Symptoms:** Jobs don't start at scheduled time

**Solutions:**
1. Verify schedule is **Enabled**
2. Check the schedule is **linked** to the runbook
3. Verify timezone is correct
4. Check schedule hasn't **expired**

```powershell
# Check schedule status
Get-AzAutomationSchedule `
    -ResourceGroupName "StudentAccess-RG" `
    -AutomationAccountName "StudentAccessAutomation"
```

#### Issue: Students Can Still Login After Disable

**Symptoms:** Account shows disabled but student can still access services

**Solutions:**
1. Verify `RevokeTokens` variable is set to `true`
2. Token revocation can take up to 1 hour to propagate
3. Some cached sessions may persist briefly
4. Check Conditional Access policies for conflicts

### View Detailed Error Logs

1. Go to **Automation Account** → **Jobs**
2. Click the failed job
3. Select **All Logs** tab
4. Filter by **Error** stream
5. Review the detailed error message

### Test Connectivity

Run this test to verify the automation can connect:

```powershell
# Test from local machine with same credentials
$TenantId = "your-tenant-id"
$ClientId = "your-client-id"
$ClientSecret = "your-client-secret"

$SecureSecret = ConvertTo-SecureString -String $ClientSecret -AsPlainText -Force
$Credential = New-Object System.Management.Automation.PSCredential($ClientId, $SecureSecret)

Connect-MgGraph -TenantId $TenantId -ClientSecretCredential $Credential -NoWelcome
Get-MgUser -Top 1 | Select-Object DisplayName
```

---

## 🔧 Maintenance Tasks

### Weekly Tasks

| Task | How | Purpose |
|------|-----|---------|
| Review job history | Azure Portal → Jobs | Ensure jobs complete successfully |
| Check for errors | Filter jobs by "Failed" | Identify issues early |

### Monthly Tasks

| Task | How | Purpose |
|------|-----|---------|
| Review student group | Entra Admin Center | Ensure membership is current |
| Check Azure costs | Azure Portal → Cost Analysis | Monitor spending |
| Review sign-in logs | Entra Admin Center → Sign-in logs | Security monitoring |

### Annual Tasks

| Task | How | Purpose |
|------|-----|---------|
| Rotate client secret | Entra → App registrations | Security best practice |
| Review permissions | Verify API permissions | Ensure least privilege |
| Update documentation | Review this guide | Keep procedures current |

### Rotate Client Secret (Annual)

1. **Create new secret:**
   ```
   Entra Admin Center → App registrations → Your app → 
   Certificates & secrets → New client secret
   ```

2. **Update Automation variable:**
   ```
   Azure Portal → Automation Account → Variables → 
   ClientSecret → Edit → Update value
   ```

3. **Test the runbook:**
   - Run `Get-StudentAccessStatus` manually
   - Verify it completes successfully

4. **Delete old secret:**
   - Return to App registrations
   - Delete the old/expired secret

---

## 🚨 Emergency Procedures

### Emergency: Enable All Students Immediately

**Scenario:** School needs all students enabled outside normal hours

```powershell
# Quick enable via Azure Portal
# 1. Go to Automation Account → Runbooks
# 2. Select "Enable-StudentAccess"
# 3. Click "Start"
```

Or via PowerShell:
```powershell
Start-AzAutomationRunbook `
    -ResourceGroupName "StudentAccess-RG" `
    -AutomationAccountName "StudentAccessAutomation" `
    -Name "Enable-StudentAccess" `
    -Wait
```

### Emergency: Disable All Students Immediately

**Scenario:** Security incident requires immediate lockout

```powershell
Start-AzAutomationRunbook `
    -ResourceGroupName "StudentAccess-RG" `
    -AutomationAccountName "StudentAccessAutomation" `
    -Name "Disable-StudentAccess" `
    -Wait
```

### Emergency: Stop All Automation

**Scenario:** Need to completely stop the automation

1. Go to **Automation Account** → **Schedules**
2. Disable both schedules:
   - `Enable-Students-Morning` → Set Enabled = No
   - `Disable-Students-Afternoon` → Set Enabled = No

### Emergency: Enable/Disable Single Student

**Scenario:** Exception for one student

Via Entra Admin Center:
1. Go to **Users** → Find the student
2. Click **Edit properties**
3. Under **Account**, toggle **Account enabled**
4. Click **Save**

Via PowerShell:
```powershell
# Enable single student
Update-MgUser -UserId "student@school.no" -AccountEnabled:$true

# Disable single student
Update-MgUser -UserId "student@school.no" -AccountEnabled:$false
```

---

## 📞 Support Contacts

| Issue Type | Contact | Notes |
|------------|---------|-------|
| Job failures | Internal IT | Check this guide first |
| Azure issues | Microsoft Support | Via Azure Portal |
| Permission issues | Entra ID Admin | May need Global Admin |
| Cost concerns | Azure Cost Management | Review spending alerts |

---

## 📚 Quick Reference

### Important URLs

| Resource | URL |
|----------|-----|
| Azure Portal | https://portal.azure.com |
| Entra Admin Center | https://entra.microsoft.com |
| GitHub Repository | https://github.com/NorwegianPear/StudentTime-Management-M365 |

### Important IDs (Fill in after deployment)

| Variable | Value |
|----------|-------|
| Tenant ID | `________________________________` |
| Client ID | `________________________________` |
| Student Group ID | `________________________________` |
| Resource Group | `________________________________` |
| Automation Account | `________________________________` |

### Key PowerShell Commands

```powershell
# Connect to Azure
Connect-AzAccount

# View recent jobs
Get-AzAutomationJob -ResourceGroupName "StudentAccess-RG" `
    -AutomationAccountName "StudentAccessAutomation" | 
    Select-Object -First 10

# Check schedule status
Get-AzAutomationSchedule -ResourceGroupName "StudentAccess-RG" `
    -AutomationAccountName "StudentAccessAutomation"

# Start runbook manually
Start-AzAutomationRunbook -ResourceGroupName "StudentAccess-RG" `
    -AutomationAccountName "StudentAccessAutomation" `
    -Name "Enable-StudentAccess"
```
