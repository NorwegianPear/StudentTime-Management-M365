// Student Access Automation - Infrastructure as Code
// This Bicep template deploys the complete Azure Automation solution

@description('Location for all resources')
param location string = resourceGroup().location

@description('Name of the Automation Account')
param automationAccountName string = 'StudentAccessAutomation'

@description('Azure AD Tenant ID')
param tenantId string

@description('Student Security Group Object ID')
param studentGroupId string

@description('Time to enable student accounts (HH:mm)')
param enableTime string = '07:55'

@description('Time to disable student accounts (HH:mm)')
param disableTime string = '16:05'

@description('Time zone for schedules')
param timeZone string = 'W. Europe Standard Time'

@description('Whether to revoke tokens when disabling accounts')
param revokeTokens bool = true

@description('Base time for schedule calculation (defaults to now)')
param baseTime string = utcNow()

// Automation Account
resource automationAccount 'Microsoft.Automation/automationAccounts@2023-11-01' = {
  name: automationAccountName
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    sku: {
      name: 'Basic'
    }
    encryption: {
      keySource: 'Microsoft.Automation'
    }
  }
}

// Variables (non-encrypted)
resource varTenantId 'Microsoft.Automation/automationAccounts/variables@2023-11-01' = {
  parent: automationAccount
  name: 'TenantId'
  properties: {
    value: '"${tenantId}"'
    isEncrypted: false
    description: 'Azure AD Tenant ID'
  }
}

resource varStudentGroupId 'Microsoft.Automation/automationAccounts/variables@2023-11-01' = {
  parent: automationAccount
  name: 'StudentGroupId'
  properties: {
    value: '"${studentGroupId}"'
    isEncrypted: false
    description: 'Student Security Group Object ID'
  }
}

resource varRevokeTokens 'Microsoft.Automation/automationAccounts/variables@2023-11-01' = {
  parent: automationAccount
  name: 'RevokeTokens'
  properties: {
    value: '"${string(revokeTokens)}"'
    isEncrypted: false
    description: 'Whether to revoke tokens when disabling'
  }
}

// PowerShell Modules
resource moduleGraphAuth 'Microsoft.Automation/automationAccounts/modules@2023-11-01' = {
  parent: automationAccount
  name: 'Microsoft.Graph.Authentication'
  properties: {
    contentLink: {
      uri: 'https://www.powershellgallery.com/api/v2/package/Microsoft.Graph.Authentication'
    }
  }
}

resource moduleGraphUsers 'Microsoft.Automation/automationAccounts/modules@2023-11-01' = {
  parent: automationAccount
  name: 'Microsoft.Graph.Users'
  dependsOn: [moduleGraphAuth]
  properties: {
    contentLink: {
      uri: 'https://www.powershellgallery.com/api/v2/package/Microsoft.Graph.Users'
    }
  }
}

resource moduleGraphGroups 'Microsoft.Automation/automationAccounts/modules@2023-11-01' = {
  parent: automationAccount
  name: 'Microsoft.Graph.Groups'
  dependsOn: [moduleGraphAuth]
  properties: {
    contentLink: {
      uri: 'https://www.powershellgallery.com/api/v2/package/Microsoft.Graph.Groups'
    }
  }
}

// Runbooks (empty - content uploaded via GitHub Actions)
resource runbookEnable 'Microsoft.Automation/automationAccounts/runbooks@2023-11-01' = {
  parent: automationAccount
  name: 'Enable-StudentAccess'
  location: location
  properties: {
    runbookType: 'PowerShell'
    logProgress: true
    logVerbose: false
    description: 'Enables student account sign-in'
  }
}

resource runbookDisable 'Microsoft.Automation/automationAccounts/runbooks@2023-11-01' = {
  parent: automationAccount
  name: 'Disable-StudentAccess'
  location: location
  properties: {
    runbookType: 'PowerShell'
    logProgress: true
    logVerbose: false
    description: 'Disables student account sign-in and revokes tokens'
  }
}

resource runbookStatus 'Microsoft.Automation/automationAccounts/runbooks@2023-11-01' = {
  parent: automationAccount
  name: 'Get-StudentAccessStatus'
  location: location
  properties: {
    runbookType: 'PowerShell'
    logProgress: true
    logVerbose: false
    description: 'Reports on student account sign-in status'
  }
}

// Calculate schedule start times (tomorrow)
var enableHour = int(split(enableTime, ':')[0])
var enableMinute = int(split(enableTime, ':')[1])
var disableHour = int(split(disableTime, ':')[0])
var disableMinute = int(split(disableTime, ':')[1])

// Schedules
resource scheduleEnable 'Microsoft.Automation/automationAccounts/schedules@2023-11-01' = {
  parent: automationAccount
  name: 'Enable-Students-Morning'
  properties: {
    frequency: 'Week'
    interval: 1
    timeZone: timeZone
    startTime: dateTimeAdd(baseTime, 'P1D', 'yyyy-MM-ddT${padLeft(string(enableHour), 2, '0')}:${padLeft(string(enableMinute), 2, '0')}:00Z')
    advancedSchedule: {
      weekDays: [
        'Monday'
        'Tuesday'
        'Wednesday'
        'Thursday'
        'Friday'
      ]
    }
    description: 'Enables student accounts at ${enableTime} on weekdays'
  }
}

resource scheduleDisable 'Microsoft.Automation/automationAccounts/schedules@2023-11-01' = {
  parent: automationAccount
  name: 'Disable-Students-Afternoon'
  properties: {
    frequency: 'Week'
    interval: 1
    timeZone: timeZone
    startTime: dateTimeAdd(baseTime, 'P1D', 'yyyy-MM-ddT${padLeft(string(disableHour), 2, '0')}:${padLeft(string(disableMinute), 2, '0')}:00Z')
    advancedSchedule: {
      weekDays: [
        'Monday'
        'Tuesday'
        'Wednesday'
        'Thursday'
        'Friday'
      ]
    }
    description: 'Disables student accounts at ${disableTime} on weekdays'
  }
}

// Link runbooks to schedules
resource jobScheduleEnable 'Microsoft.Automation/automationAccounts/jobSchedules@2023-11-01' = {
  parent: automationAccount
  name: guid(automationAccount.id, runbookEnable.name, scheduleEnable.name)
  properties: {
    runbook: {
      name: runbookEnable.name
    }
    schedule: {
      name: scheduleEnable.name
    }
  }
}

resource jobScheduleDisable 'Microsoft.Automation/automationAccounts/jobSchedules@2023-11-01' = {
  parent: automationAccount
  name: guid(automationAccount.id, runbookDisable.name, scheduleDisable.name)
  properties: {
    runbook: {
      name: runbookDisable.name
    }
    schedule: {
      name: scheduleDisable.name
    }
  }
}

// Outputs
output automationAccountName string = automationAccount.name
output automationAccountId string = automationAccount.id
output principalId string = automationAccount.identity.principalId
output enableSchedule string = scheduleEnable.name
output disableSchedule string = scheduleDisable.name
