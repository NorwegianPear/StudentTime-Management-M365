<#
.SYNOPSIS
    Deploys the SAM Portal to Azure (Static Web Apps or App Service).
.DESCRIPTION
    Provisions Azure infrastructure and deploys the Next.js portal.
    Supports both Static Web Apps (recommended, cheaper) and App Service.
.PARAMETER Target
    Deployment target: 'StaticWebApp' (default) or 'AppService'
.PARAMETER ResourceGroupName
    Azure Resource Group name
.PARAMETER Location
    Azure region (default: westeurope)
.PARAMETER AppName
    Portal app name (default: app-atea-sam-portal)
.PARAMETER SkipInfra
    Skip infrastructure deployment (only deploy code)
.EXAMPLE
    .\Deploy-Portal.ps1 -Target StaticWebApp
    .\Deploy-Portal.ps1 -Target AppService -ResourceGroupName rg-sam-prod
#>

[CmdletBinding()]
param(
    [ValidateSet('StaticWebApp', 'AppService')]
    [string]$Target = 'StaticWebApp',

    [string]$ResourceGroupName = 'rg-studentaccess-demo',

    [string]$Location = 'westeurope',

    [string]$AppName = 'app-atea-sam-portal',

    [switch]$SkipInfra
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$portalDir = Join-Path $repoRoot 'portal'
$infraDir = Join-Path $repoRoot 'infrastructure'

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  SAM Portal Deployment" -ForegroundColor Cyan
Write-Host "  Target: $Target" -ForegroundColor Cyan
Write-Host "  App:    $AppName" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# --- Verify prerequisites ---
Write-Host "[1/5] Checking prerequisites..." -ForegroundColor Yellow

if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
    throw "Azure CLI (az) is not installed. Install from https://aka.ms/installazurecli"
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "Node.js is not installed. Install from https://nodejs.org"
}

$azAccount = az account show 2>&1 | ConvertFrom-Json -ErrorAction SilentlyContinue
if (-not $azAccount) {
    Write-Host "Not logged in to Azure. Launching interactive login..." -ForegroundColor Yellow
    az login
    $azAccount = az account show | ConvertFrom-Json
}
Write-Host "  Subscription: $($azAccount.name)" -ForegroundColor Gray
Write-Host "  Tenant:       $($azAccount.tenantId)" -ForegroundColor Gray

# --- Create Resource Group ---
Write-Host "`n[2/5] Ensuring resource group '$ResourceGroupName'..." -ForegroundColor Yellow
az group create --name $ResourceGroupName --location $Location --output none 2>$null
Write-Host "  Resource group ready" -ForegroundColor Gray

# --- Deploy Infrastructure ---
if (-not $SkipInfra) {
    Write-Host "`n[3/5] Deploying $Target infrastructure (Bicep)..." -ForegroundColor Yellow

    $deployParams = @(
        '--resource-group', $ResourceGroupName
        '--template-file', (Join-Path $infraDir 'portal.bicep')
        '--parameters', "deploymentTarget=$Target"
        '--parameters', "appName=$AppName"
        '--parameters', "location=$Location"
    )

    if ($Target -eq 'AppService') {
        # Prompt for secrets if not set
        $clientId = Read-Host "Entra ID Client ID"
        $clientSecret = Read-Host "Entra ID Client Secret" -AsSecureString
        $tenantId = $azAccount.tenantId
        $nextAuthSecret = [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
        $groupId = Read-Host "Student Group ID"

        $clientSecretPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
            [Runtime.InteropServices.Marshal]::SecureStringToBSTR($clientSecret)
        )

        $deployParams += @(
            '--parameters', "azureAdClientId=$clientId"
            '--parameters', "azureAdClientSecret=$clientSecretPlain"
            '--parameters', "azureAdTenantId=$tenantId"
            '--parameters', "nextAuthSecret=$nextAuthSecret"
            '--parameters', "studentGroupId=$groupId"
            '--parameters', "appServiceSku=B1"
        )
    }

    $result = az deployment group create @deployParams --output json | ConvertFrom-Json

    if ($LASTEXITCODE -ne 0) {
        throw "Infrastructure deployment failed"
    }

    $portalUrl = $result.properties.outputs.portalUrl.value
    Write-Host "  Infrastructure deployed: $portalUrl" -ForegroundColor Green
} else {
    Write-Host "`n[3/5] Skipping infrastructure (--SkipInfra)" -ForegroundColor Gray
}

# --- Build Portal ---
Write-Host "`n[4/5] Building portal..." -ForegroundColor Yellow
Push-Location $portalDir
try {
    if (-not (Test-Path 'node_modules')) {
        Write-Host "  Installing dependencies..." -ForegroundColor Gray
        npm ci --silent
    }
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "Build failed" }
    Write-Host "  Build complete" -ForegroundColor Green
} finally {
    Pop-Location
}

# --- Deploy Code ---
Write-Host "`n[5/5] Deploying code to $Target..." -ForegroundColor Yellow

if ($Target -eq 'StaticWebApp') {
    # For SWA, code is deployed via GitHub Actions (auto-generated)
    # Or manually via SWA CLI
    if (Get-Command swa -ErrorAction SilentlyContinue) {
        Push-Location $portalDir
        try {
            swa deploy .next --deployment-token (az staticwebapp secrets list --name $AppName --query "properties.apiKey" -o tsv)
        } finally {
            Pop-Location
        }
    } else {
        Write-Host "  Install SWA CLI for manual deploy: npm install -g @azure/static-web-apps-cli" -ForegroundColor Yellow
        Write-Host "  Or push to GitHub — the Actions workflow will deploy automatically." -ForegroundColor Yellow
    }
} else {
    # App Service: deploy via zip
    Push-Location $portalDir
    try {
        $zipPath = Join-Path $env:TEMP "sam-portal-deploy.zip"
        Write-Host "  Creating deployment package..." -ForegroundColor Gray

        # Create zip of built app
        $filesToZip = @('.next', 'node_modules', 'package.json', 'public', 'next.config.ts')
        Compress-Archive -Path $filesToZip -DestinationPath $zipPath -Force

        Write-Host "  Deploying to App Service..." -ForegroundColor Gray
        az webapp deployment source config-zip --resource-group $ResourceGroupName --name $AppName --src $zipPath

        Remove-Item $zipPath -Force
    } finally {
        Pop-Location
    }
}

# --- Summary ---
Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

if ($Target -eq 'StaticWebApp') {
    $url = az staticwebapp show --name $AppName --query "defaultHostname" -o tsv 2>$null
    if ($url) { Write-Host "  URL: https://$url" -ForegroundColor Cyan }
} else {
    Write-Host "  URL: https://${AppName}.azurewebsites.net" -ForegroundColor Cyan
}

Write-Host "`n  Next steps:" -ForegroundColor Yellow
Write-Host "  1. Create Entra ID app registration (see portal/README.md)" -ForegroundColor Gray
Write-Host "  2. Configure environment variables / app settings" -ForegroundColor Gray
Write-Host "  3. Grant admin consent for Graph API permissions" -ForegroundColor Gray
Write-Host "  4. Add custom domain (optional)" -ForegroundColor Gray
