// SAM Portal - Azure Static Web Apps (Recommended)
// Cheaper, serverless, built-in CDN + SSL + GitHub CI/CD

@description('Location for all resources')
param location string = resourceGroup().location

@description('Name of the Static Web App')
param staticWebAppName string = 'app-atea-sam-portal'

@description('SKU for the Static Web App')
@allowed(['Free', 'Standard'])
param sku string = 'Free'

@description('GitHub repository URL')
param repositoryUrl string = 'https://github.com/NorwegianPear/StudentTime-Management-M365'

@description('GitHub branch to deploy from')
param repositoryBranch string = 'main'

@description('GitHub token for deployment (optional - can be set later)')
@secure()
param repositoryToken string = ''

// Static Web App
resource staticWebApp 'Microsoft.Web/staticSites@2023-12-01' = {
  name: staticWebAppName
  location: location
  sku: {
    name: sku
    tier: sku
  }
  properties: {
    repositoryUrl: repositoryToken != '' ? repositoryUrl : null
    branch: repositoryToken != '' ? repositoryBranch : null
    repositoryToken: repositoryToken != '' ? repositoryToken : null
    buildProperties: {
      appLocation: '/portal'
      apiLocation: ''
      outputLocation: '.next'
      appBuildCommand: 'npm run build'
    }
    stagingEnvironmentPolicy: 'Enabled'
    allowConfigFileUpdates: true
  }
}

// Outputs
output staticWebAppName string = staticWebApp.name
output staticWebAppUrl string = 'https://${staticWebApp.properties.defaultHostname}'
output staticWebAppId string = staticWebApp.id
output defaultHostname string = staticWebApp.properties.defaultHostname
