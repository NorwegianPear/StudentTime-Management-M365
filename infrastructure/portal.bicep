// SAM Portal - Infrastructure Orchestrator
// Deploys the portal using either Static Web Apps (recommended) or App Service
//
// Usage:
//   Static Web Apps (default):  az deployment group create -g rg-sam -f portal.bicep
//   App Service:                az deployment group create -g rg-sam -f portal.bicep --parameters deploymentTarget='AppService'

@description('Location for all resources')
param location string = resourceGroup().location

@description('Deployment target: StaticWebApp (recommended) or AppService')
@allowed(['StaticWebApp', 'AppService'])
param deploymentTarget string = 'StaticWebApp'

@description('Name of the portal app')
param appName string = 'app-atea-sam-portal'

// --- Static Web App parameters ---
@description('Static Web App SKU (Free or Standard)')
@allowed(['Free', 'Standard'])
param swaSku string = 'Free'

@description('GitHub repository URL')
param repositoryUrl string = 'https://github.com/NorwegianPear/StudentTime-Management-M365'

@description('GitHub branch')
param repositoryBranch string = 'main'

@description('GitHub token (optional)')
@secure()
param repositoryToken string = ''

// --- App Service parameters ---
@description('App Service Plan SKU')
@allowed(['F1', 'B1', 'B2', 'S1'])
param appServiceSku string = 'B1'

@description('Entra ID Client ID')
param azureAdClientId string = ''

@description('Entra ID Client Secret')
@secure()
param azureAdClientSecret string = ''

@description('Entra ID Tenant ID')
param azureAdTenantId string = ''

@description('NextAuth secret')
@secure()
param nextAuthSecret string = ''

@description('Student Group ID')
param studentGroupId string = ''

// --- Deploy Static Web App ---
module swa 'portal-swa.bicep' = if (deploymentTarget == 'StaticWebApp') {
  name: 'deploy-portal-swa'
  params: {
    location: location
    staticWebAppName: appName
    sku: swaSku
    repositoryUrl: repositoryUrl
    repositoryBranch: repositoryBranch
    repositoryToken: repositoryToken
  }
}

// --- Deploy App Service ---
module appService 'portal-appservice.bicep' = if (deploymentTarget == 'AppService') {
  name: 'deploy-portal-appservice'
  params: {
    location: location
    appServiceName: appName
    appServicePlanName: 'asp-${appName}'
    sku: appServiceSku
    azureAdClientId: azureAdClientId
    azureAdClientSecret: azureAdClientSecret
    azureAdTenantId: azureAdTenantId
    nextAuthSecret: nextAuthSecret
    studentGroupId: studentGroupId
  }
}

// --- Outputs ---
output deploymentTarget string = deploymentTarget
#disable-next-line BCP318
output portalUrl string = deploymentTarget == 'StaticWebApp' ? swa.outputs.staticWebAppUrl : appService.outputs.appServiceUrl
output portalName string = appName
#disable-next-line BCP318
output hostName string = deploymentTarget == 'StaticWebApp' ? swa.outputs.defaultHostname : appService.outputs.defaultHostName
