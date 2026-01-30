<#
.SYNOPSIS
    Sets up Azure-GitHub federation for OIDC authentication.

.DESCRIPTION
    Creates an App Registration with federated credentials for GitHub Actions
    to deploy infrastructure without storing secrets.

.PARAMETER GitHubRepo
    The GitHub repository in format "owner/repo"

.PARAMETER AppName
    Name for the App Registration. Default: "GitHub-StudentAccess-Deploy"

.EXAMPLE
    .\New-GitHubFederation.ps1 -GitHubRepo "myorg/StudentTime-Management-M365"

.NOTES
    Author: IT Admin
    Version: 1.0
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$GitHubRepo,

    [Parameter(Mandatory = $false)]
    [string]$AppName = "GitHub-StudentAccess-Deploy"
)

# Import required modules
$requiredModules = @('Az.Accounts', 'Az.Resources', 'Microsoft.Graph.Applications', 'Microsoft.Graph.Authentication')
foreach ($module in $requiredModules) {
    if (-not (Get-Module -ListAvailable -Name $module)) {
        Write-Host "Installing module: $module" -ForegroundColor Yellow
        Install-Module -Name $module -Force -AllowClobber -Scope CurrentUser
    }
    Import-Module $module
}

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "GitHub-Azure Federation Setup" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Connect to Azure
Write-Host "Connecting to Azure..." -ForegroundColor Yellow
Connect-AzAccount

$context = Get-AzContext
$tenantId = $context.Tenant.Id
$subscriptionId = $context.Subscription.Id

Write-Host "Tenant ID: $tenantId" -ForegroundColor Gray
Write-Host "Subscription ID: $subscriptionId" -ForegroundColor Gray
Write-Host ""

# Connect to Microsoft Graph
Write-Host "Connecting to Microsoft Graph..." -ForegroundColor Yellow
Connect-MgGraph -Scopes "Application.ReadWrite.All" -TenantId $tenantId -NoWelcome

# Create App Registration
Write-Host "Creating App Registration: $AppName" -ForegroundColor Yellow

$app = New-MgApplication -DisplayName $AppName -SignInAudience "AzureADMyOrg"

Write-Host "  Application ID: $($app.AppId)" -ForegroundColor Green

# Create Service Principal
Write-Host "Creating Service Principal..." -ForegroundColor Yellow
$sp = New-MgServicePrincipal -AppId $app.AppId

# Add federated credentials for GitHub Actions
Write-Host "Adding Federated Credentials..." -ForegroundColor Yellow

$federatedCredentials = @(
    @{
        Name = "github-main-branch"
        Issuer = "https://token.actions.githubusercontent.com"
        Subject = "repo:${GitHubRepo}:ref:refs/heads/main"
        Audiences = @("api://AzureADTokenExchange")
    },
    @{
        Name = "github-pull-request"
        Issuer = "https://token.actions.githubusercontent.com"
        Subject = "repo:${GitHubRepo}:pull_request"
        Audiences = @("api://AzureADTokenExchange")
    }
)

foreach ($cred in $federatedCredentials) {
    $params = @{
        Name = $cred.Name
        Issuer = $cred.Issuer
        Subject = $cred.Subject
        Audiences = $cred.Audiences
    }
    
    New-MgApplicationFederatedIdentityCredential -ApplicationId $app.Id -BodyParameter $params
    Write-Host "  Created: $($cred.Name)" -ForegroundColor Green
}

# Assign Contributor role to subscription
Write-Host "Assigning Contributor role to subscription..." -ForegroundColor Yellow

New-AzRoleAssignment `
    -ObjectId $sp.Id `
    -RoleDefinitionName "Contributor" `
    -Scope "/subscriptions/$subscriptionId"

Write-Host "  Contributor role assigned" -ForegroundColor Green

# Output GitHub secrets
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "Federation Setup Complete!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Add these secrets to your GitHub repository:" -ForegroundColor Yellow
Write-Host "(Settings → Secrets and variables → Actions → New repository secret)" -ForegroundColor Gray
Write-Host ""
Write-Host "  AZURE_CLIENT_ID:        $($app.AppId)" -ForegroundColor Cyan
Write-Host "  AZURE_TENANT_ID:        $tenantId" -ForegroundColor Cyan
Write-Host "  AZURE_SUBSCRIPTION_ID:  $subscriptionId" -ForegroundColor Cyan
Write-Host ""
Write-Host "Also add these secrets for the Graph API App Registration:" -ForegroundColor Yellow
Write-Host "  STUDENT_GROUP_ID:       <Your student security group object ID>" -ForegroundColor Cyan
Write-Host "  GRAPH_CLIENT_ID:        <Client ID from New-AppRegistration.ps1>" -ForegroundColor Cyan
Write-Host "  GRAPH_CLIENT_SECRET:    <Client Secret from New-AppRegistration.ps1>" -ForegroundColor Cyan
Write-Host ""

# Disconnect
Disconnect-MgGraph -ErrorAction SilentlyContinue
