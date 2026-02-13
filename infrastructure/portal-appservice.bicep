// SAM Portal - Azure App Service (Alternative)
// Full Node.js server, WebSockets, no cold starts, deployment slots

@description('Location for all resources')
param location string = resourceGroup().location

@description('Name of the App Service')
param appServiceName string = 'app-atea-sam-portal'

@description('Name of the App Service Plan')
param appServicePlanName string = 'asp-atea-sam-portal'

@description('App Service Plan SKU')
@allowed(['F1', 'B1', 'B2', 'S1'])
param sku string = 'B1'

@description('Node.js version')
param nodeVersion string = '20-lts'

@description('Entra ID Client ID for the portal')
param azureAdClientId string

@description('Entra ID Client Secret for the portal')
@secure()
param azureAdClientSecret string

@description('Entra ID Tenant ID')
param azureAdTenantId string

@description('NextAuth secret for session encryption')
@secure()
param nextAuthSecret string

@description('Student Security Group ID')
param studentGroupId string

@description('Group name prefix to filter relevant groups (e.g. Demo-, School-)')
param groupNamePrefix string = ''

// App Service Plan (Linux)
resource appServicePlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: appServicePlanName
  location: location
  kind: 'linux'
  sku: {
    name: sku
  }
  properties: {
    reserved: true // Required for Linux
  }
}

// App Service
resource appService 'Microsoft.Web/sites@2023-12-01' = {
  name: appServiceName
  location: location
  kind: 'app,linux'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|${nodeVersion}'
      appCommandLine: 'npm run start'
      alwaysOn: sku != 'F1' // Free tier doesn't support Always On
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      http20Enabled: true
      appSettings: [
        {
          name: 'AZURE_AD_CLIENT_ID'
          value: azureAdClientId
        }
        {
          name: 'AZURE_AD_CLIENT_SECRET'
          value: azureAdClientSecret
        }
        {
          name: 'AZURE_AD_TENANT_ID'
          value: azureAdTenantId
        }
        {
          name: 'NEXTAUTH_URL'
          value: 'https://${appServiceName}.azurewebsites.net'
        }
        {
          name: 'NEXTAUTH_SECRET'
          value: nextAuthSecret
        }
        {
          name: 'STUDENT_GROUP_ID'
          value: studentGroupId
        }
        {
          name: 'GROUP_NAME_PREFIX'
          value: groupNamePrefix
        }
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~20'
        }
      ]
    }
  }
}

// Staging slot (for zero-downtime deployments, requires B1+)
resource stagingSlot 'Microsoft.Web/sites/slots@2023-12-01' = if (sku != 'F1') {
  parent: appService
  name: 'staging'
  location: location
  kind: 'app,linux'
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|${nodeVersion}'
      appCommandLine: 'npm run start'
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
    }
  }
}

// Outputs
output appServiceName string = appService.name
output appServiceUrl string = 'https://${appService.properties.defaultHostName}'
output appServicePlanName string = appServicePlan.name
output principalId string = appService.identity.principalId
output defaultHostName string = appService.properties.defaultHostName
