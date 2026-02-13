<#
.SYNOPSIS
    Sets up a complete demo school environment in Atea Azure Lab for Student Time Management.

.DESCRIPTION
    Creates a realistic school simulation in Entra ID with:
    - Demo students organized by class (8A, 9B, 10A, etc.)
    - Demo teachers assigned to classes
    - Demo IT admin and support staff
    - Security groups for classes and special groups
    - App Registration with Graph permissions
    - GitHub-Azure OIDC federation
    - Azure Automation infrastructure deployment

    All users are created under the ateara.onmicrosoft.com tenant.

.PARAMETER AdminUPN
    The admin user UPN for the demo. Default: "uy.le.thai.phan@ateara.onmicrosoft.com"

.PARAMETER GitHubRepo
    GitHub repo for federation. Default: "NorwegianPear/StudentTime-Management-M365"

.PARAMETER Location
    Azure region for resources. Default: "westeurope"

.PARAMETER SkipInfrastructure
    Skip Azure resource deployment (only create Entra ID objects).

.PARAMETER SkipFederation
    Skip GitHub-Azure federation setup.

.EXAMPLE
    .\Setup-DemoEnvironment.ps1
    Full demo environment setup.

.EXAMPLE
    .\Setup-DemoEnvironment.ps1 -SkipInfrastructure
    Only create Entra ID demo users and groups (no Azure resources).

.NOTES
    Author: Uy Le Phan (Atea AS)
    Version: 1.0
    Tenant: ateara.onmicrosoft.com (Atea Lab)
    Date: February 2026
#>

[CmdletBinding()]
param(
    [Parameter()]
    [string]$AdminUPN = "uy.le.thai.phan@ateara.onmicrosoft.com",

    [Parameter()]
    [string]$GitHubRepo = "NorwegianPear/StudentTime-Management-M365",

    [Parameter()]
    [string]$Location = "westeurope",

    [Parameter()]
    [string]$ResourceGroupName = "rg-studentaccess-demo",

    [Parameter()]
    [string]$AutomationAccountName = "StudentAccessDemo",

    [Parameter()]
    [switch]$SkipInfrastructure,

    [Parameter()]
    [switch]$SkipFederation,

    [Parameter()]
    [switch]$SkipUsers
)

# ═══════════════════════════════════════════════════════════════════════════
# CONFIGURATION - Demo School "Bergan International School (Demo)"
# ═══════════════════════════════════════════════════════════════════════════

$Domain = "ateara.onmicrosoft.com"
$SchoolName = "Bergan International School (Demo)"
$DefaultPassword = "Demo2026!Student"
$TeacherPassword = "Demo2026!Teacher"

# Administrative Unit for isolation (Entra ID equivalent of OU)
# All demo objects live inside this AU — prevents affecting real tenant users
$AdminUnitName = "SAM-Demo-Students"
$AdminUnitDescription = "Isolated Administrative Unit for Student Access Management demo. Contains only mock student/teacher accounts and groups. Safe to delete entirely."

# Classes and students
$DemoClasses = @(
    @{
        Name        = "Class 8A"
        GroupName   = "Demo-Students-8A"
        Schedule    = @{ Enable = "08:00"; Disable = "14:30" }
        Students    = @(
            @{ First = "Emma"; Last = "Hansen" },
            @{ First = "Noah"; Last = "Johansen" },
            @{ First = "Olivia"; Last = "Olsen" },
            @{ First = "William"; Last = "Larsen" },
            @{ First = "Sophia"; Last = "Andersen" }
        )
    },
    @{
        Name        = "Class 9B"
        GroupName   = "Demo-Students-9B"
        Schedule    = @{ Enable = "08:15"; Disable = "15:00" }
        Students    = @(
            @{ First = "Liam"; Last = "Pedersen" },
            @{ First = "Mia"; Last = "Nilsen" },
            @{ First = "Lucas"; Last = "Kristiansen" },
            @{ First = "Ella"; Last = "Jensen" },
            @{ First = "Oscar"; Last = "Karlsen" }
        )
    },
    @{
        Name        = "Class 10A"
        GroupName   = "Demo-Students-10A"
        Schedule    = @{ Enable = "07:55"; Disable = "15:30" }
        Students    = @(
            @{ First = "Jakob"; Last = "Berg" },
            @{ First = "Nora"; Last = "Haugen" },
            @{ First = "Filip"; Last = "Hagen" },
            @{ First = "Ingrid"; Last = "Eriksen" },
            @{ First = "Erik"; Last = "Bakken" }
        )
    },
    @{
        Name        = "Class 10B"
        GroupName   = "Demo-Students-10B"
        Schedule    = @{ Enable = "07:55"; Disable = "15:30" }
        Students    = @(
            @{ First = "Sara"; Last = "Lie" },
            @{ First = "Magnus"; Last = "Dahl" },
            @{ First = "Amalie"; Last = "Lund" },
            @{ First = "Henrik"; Last = "Moen" },
            @{ First = "Thea"; Last = "Holm" }
        )
    }
)

# Teachers (each assigned to classes)
$DemoTeachers = @(
    @{ First = "Kari"; Last = "Nordmann"; Title = "Teacher"; Classes = @("Demo-Students-8A", "Demo-Students-9B") },
    @{ First = "Per"; Last = "Svendsen"; Title = "Teacher"; Classes = @("Demo-Students-10A", "Demo-Students-10B") },
    @{ First = "Anne"; Last = "Bakke"; Title = "Coordinator"; Classes = @("Demo-Students-8A", "Demo-Students-10A") }
)

# IT/Support staff
$DemoStaff = @(
    @{ First = "Lars"; Last = "IT-Admin"; Title = "IT Administrator"; Role = "Admin" },
    @{ First = "Marit"; Last = "Support"; Title = "IT Support"; Role = "Admin" }
)

# Existing tenant users to add to the portal staff group (NOT created, just granted access)
# These are real users already in ateara.onmicrosoft.com
$ExistingStaffUPNs = @(
    "veronica@ateara.onmicrosoft.com",
    "paul.johnny.klock@ateara.onmicrosoft.com",
    "uy.le.thai.phan@ateara.onmicrosoft.com"
)

# Special groups
$SpecialGroups = @(
    @{ Name = "Demo-AfterSchool-Program"; Description = "Students in after-school program (extended hours until 18:00)"; Members = @("emma.hansen", "liam.pedersen", "jakob.berg") },
    @{ Name = "Demo-Exam-Extended"; Description = "Students with extended exam access (always enabled during exam period)"; Members = @("noah.johansen", "nora.haugen") }
)

# Master group containing ALL demo students
$MasterGroupName = "Demo-AllStudents"

# ═══════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════

function New-DemoUser {
    param(
        [string]$FirstName,
        [string]$LastName,
        [string]$Domain,
        [string]$Password,
        [string]$Department,
        [string]$JobTitle,
        [string]$CompanyName
    )

    $mailNick = "$($FirstName.ToLower()).$($LastName.ToLower())" -replace '[^a-z0-9.]', ''
    $upn = "$mailNick@$Domain"

    # Check if exists
    $existing = Get-MgUser -Filter "userPrincipalName eq '$upn'" -ErrorAction SilentlyContinue
    if ($existing) {
        Write-Host "   ⏭️  Already exists: $upn" -ForegroundColor Yellow
        return $existing
    }

    $params = @{
        DisplayName       = "$FirstName $LastName"
        UserPrincipalName = $upn
        MailNickname      = $mailNick
        AccountEnabled    = $true
        PasswordProfile   = @{
            Password                      = $Password
            ForceChangePasswordNextSignIn = $false
        }
        UsageLocation     = "NO"
        Department        = $Department
        JobTitle          = $JobTitle
        CompanyName       = $CompanyName
        GivenName         = $FirstName
        Surname           = $LastName
    }

    try {
        $user = New-MgUser @params
        Write-Host "   ✅ Created: $($user.DisplayName) ($upn)" -ForegroundColor Green
        return $user
    }
    catch {
        Write-Host "   ❌ Failed: $upn - $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

function Get-OrCreateGroup {
    param(
        [string]$Name,
        [string]$Description
    )

    $existing = Get-MgGroup -Filter "displayName eq '$Name'" -ErrorAction SilentlyContinue
    if ($existing) {
        Write-Host "   ⏭️  Group exists: $Name ($($existing.Id))" -ForegroundColor Yellow
        return $existing
    }

    $params = @{
        DisplayName     = $Name
        Description     = $Description
        MailEnabled     = $false
        MailNickname    = ($Name -replace '[^a-zA-Z0-9]', '')
        SecurityEnabled = $true
        GroupTypes      = @()
    }

    $group = New-MgGroup @params
    Write-Host "   ✅ Created group: $Name ($($group.Id))" -ForegroundColor Green
    return $group
}

function Add-UserToGroup {
    param(
        [string]$UserId,
        [string]$GroupId,
        [string]$UserName
    )

    try {
        # Check if already member
        $members = Get-MgGroupMember -GroupId $GroupId -All
        if ($members.Id -contains $UserId) {
            return
        }

        New-MgGroupMemberByRef -GroupId $GroupId -BodyParameter @{
            "@odata.id" = "https://graph.microsoft.com/v1.0/directoryObjects/$UserId"
        }
    }
    catch {
        # Silently skip if already a member
        if ($_.Exception.Message -notlike "*already exist*") {
            Write-Host "   ⚠️  Could not add $UserName to group: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }
}

# ═══════════════════════════════════════════════════════════════════════════
# MAIN SCRIPT
# ═══════════════════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   🏫 Student Time Management - Demo Environment Setup            ║" -ForegroundColor Cyan
Write-Host "║   Simulating: $SchoolName                  ║" -ForegroundColor Cyan
Write-Host "║   Tenant: $Domain                          ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ─── Step 1: Connect to Microsoft Graph ───────────────────────────────────
Write-Host "━━━ Step 1: Connect to Microsoft Graph ━━━" -ForegroundColor Magenta

# Always specify TenantId to ensure we connect to the correct tenant
$TargetTenantId = "973a580f-021f-4dc0-88de-48b060e43df1"

$context = Get-MgContext
if (-not $context -or $context.TenantId -ne $TargetTenantId) {
    Write-Host "Connecting to Microsoft Graph (Tenant: $TargetTenantId)..." -ForegroundColor Yellow
    Connect-MgGraph -TenantId $TargetTenantId -Scopes @(
        "User.ReadWrite.All",
        "Group.ReadWrite.All",
        "Application.ReadWrite.All",
        "AppRoleAssignment.ReadWrite.All",
        "Directory.ReadWrite.All",
        "AdministrativeUnit.ReadWrite.All"
    ) -NoWelcome
    $context = Get-MgContext
}
Write-Host "✅ Connected as: $($context.Account)" -ForegroundColor Green
Write-Host "   Tenant ID: $($context.TenantId)" -ForegroundColor Gray
$TenantId = $context.TenantId
Write-Host ""

# ─── Step 1.5: Create Administrative Unit for Isolation ───────────────────
Write-Host "━━━ Step 1.5: Create Administrative Unit (Tenant Isolation) ━━━" -ForegroundColor Magenta
Write-Host ""

$existingAU = Get-MgDirectoryAdministrativeUnit -Filter "displayName eq '$AdminUnitName'" -ErrorAction SilentlyContinue
if ($existingAU) {
    Write-Host "   ⏭️  Administrative Unit already exists: $AdminUnitName ($($existingAU.Id))" -ForegroundColor Yellow
    $adminUnit = $existingAU
} else {
    Write-Host "   🔒 Creating Administrative Unit: $AdminUnitName" -ForegroundColor Cyan
    Write-Host "   This isolates ALL demo objects from the rest of the tenant." -ForegroundColor Gray
    $adminUnit = New-MgDirectoryAdministrativeUnit -DisplayName $AdminUnitName -Description $AdminUnitDescription
    Write-Host "   ✅ Administrative Unit created: $($adminUnit.Id)" -ForegroundColor Green
}
Write-Host ""

# Helper: Add object (user/group) to Administrative Unit
function Add-ToAdminUnit {
    param(
        [string]$ObjectId,
        [string]$ObjectName,
        [string]$AdminUnitId
    )
    try {
        $existingMembers = Get-MgDirectoryAdministrativeUnitMember -AdministrativeUnitId $AdminUnitId -All
        if ($existingMembers.Id -contains $ObjectId) {
            return
        }
        New-MgDirectoryAdministrativeUnitMemberByRef -AdministrativeUnitId $AdminUnitId -BodyParameter @{
            "@odata.id" = "https://graph.microsoft.com/v1.0/directoryObjects/$ObjectId"
        }
        Write-Host "      🔒 Added to AU: $ObjectName" -ForegroundColor DarkGray
    }
    catch {
        if ($_.Exception.Message -notlike "*already exist*") {
            Write-Host "      ⚠️  AU membership failed for $ObjectName : $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }
}

if (-not $SkipUsers) {
    # ─── Step 2: Create Security Groups ───────────────────────────────────────
    Write-Host "━━━ Step 2: Create Security Groups ━━━" -ForegroundColor Magenta
    Write-Host ""

    # Master student group
    Write-Host "📁 Master Student Group:" -ForegroundColor Cyan
    $masterGroup = Get-OrCreateGroup -Name $MasterGroupName -Description "All demo students - master group for $SchoolName"
    Add-ToAdminUnit -ObjectId $masterGroup.Id -ObjectName $MasterGroupName -AdminUnitId $adminUnit.Id
    Write-Host ""

    # Class groups
    Write-Host "📁 Class Groups:" -ForegroundColor Cyan
    $classGroups = @{}
    foreach ($class in $DemoClasses) {
        $group = Get-OrCreateGroup -Name $class.GroupName -Description "$($class.Name) students - Schedule: $($class.Schedule.Enable)-$($class.Schedule.Disable)"
        $classGroups[$class.GroupName] = $group
        Add-ToAdminUnit -ObjectId $group.Id -ObjectName $class.GroupName -AdminUnitId $adminUnit.Id
    }
    Write-Host ""

    # Special groups
    Write-Host "📁 Special Groups:" -ForegroundColor Cyan
    $specialGroupObjects = @{}
    foreach ($sg in $SpecialGroups) {
        $group = Get-OrCreateGroup -Name $sg.Name -Description $sg.Description
        $specialGroupObjects[$sg.Name] = $group
        Add-ToAdminUnit -ObjectId $group.Id -ObjectName $sg.Name -AdminUnitId $adminUnit.Id
    }
    Write-Host ""

    # Staff group (for portal access)
    Write-Host "📁 Staff Portal Access Group:" -ForegroundColor Cyan
    $staffGroup = Get-OrCreateGroup -Name "Demo-Portal-Staff" -Description "Staff members who can access the management portal"
    Add-ToAdminUnit -ObjectId $staffGroup.Id -ObjectName "Demo-Portal-Staff" -AdminUnitId $adminUnit.Id
    Write-Host ""

    # ─── Step 3: Create Demo Students ─────────────────────────────────────────
    Write-Host "━━━ Step 3: Create Demo Students ━━━" -ForegroundColor Magenta
    Write-Host ""

    $allStudentUsers = @{}
    foreach ($class in $DemoClasses) {
        Write-Host "📚 $($class.Name):" -ForegroundColor Cyan
        foreach ($student in $class.Students) {
            $user = New-DemoUser `
                -FirstName $student.First `
                -LastName $student.Last `
                -Domain $Domain `
                -Password $DefaultPassword `
                -Department $class.Name `
                -JobTitle "Student" `
                -CompanyName $SchoolName

            if ($user) {
                $mailNick = "$($student.First.ToLower()).$($student.Last.ToLower())" -replace '[^a-z0-9.]', ''
                $allStudentUsers[$mailNick] = $user

                # Add to Administrative Unit
                Add-ToAdminUnit -ObjectId $user.Id -ObjectName $user.DisplayName -AdminUnitId $adminUnit.Id

                # Add to class group
                Add-UserToGroup -UserId $user.Id -GroupId $classGroups[$class.GroupName].Id -UserName $user.DisplayName

                # Add to master student group
                Add-UserToGroup -UserId $user.Id -GroupId $masterGroup.Id -UserName $user.DisplayName
            }
        }
        Write-Host ""
    }

    # ─── Step 4: Create Demo Teachers ─────────────────────────────────────────
    Write-Host "━━━ Step 4: Create Demo Teachers ━━━" -ForegroundColor Magenta
    Write-Host ""

    Write-Host "👩‍🏫 Teachers:" -ForegroundColor Cyan
    foreach ($teacher in $DemoTeachers) {
        $user = New-DemoUser `
            -FirstName $teacher.First `
            -LastName $teacher.Last `
            -Domain $Domain `
            -Password $TeacherPassword `
            -Department "Faculty" `
            -JobTitle $teacher.Title `
            -CompanyName $SchoolName

        if ($user) {
            # Add to Administrative Unit
            Add-ToAdminUnit -ObjectId $user.Id -ObjectName $user.DisplayName -AdminUnitId $adminUnit.Id
            # Add to staff portal group
            Add-UserToGroup -UserId $user.Id -GroupId $staffGroup.Id -UserName $user.DisplayName
        }
    }
    Write-Host ""

    # ─── Step 5: Create Demo IT Staff ─────────────────────────────────────────
    Write-Host "━━━ Step 5: Create Demo IT Staff ━━━" -ForegroundColor Magenta
    Write-Host ""

    Write-Host "🔧 IT Staff:" -ForegroundColor Cyan
    foreach ($staff in $DemoStaff) {
        $user = New-DemoUser `
            -FirstName $staff.First `
            -LastName $staff.Last `
            -Domain $Domain `
            -Password $TeacherPassword `
            -Department "IT" `
            -JobTitle $staff.Title `
            -CompanyName $SchoolName

        if ($user) {
            # Add to Administrative Unit
            Add-ToAdminUnit -ObjectId $user.Id -ObjectName $user.DisplayName -AdminUnitId $adminUnit.Id
            Add-UserToGroup -UserId $user.Id -GroupId $staffGroup.Id -UserName $user.DisplayName
        }
    }
    Write-Host ""

    # ─── Step 5b: Add Existing Tenant Staff to Portal Group ──────────────────
    Write-Host "━━━ Step 5b: Add Existing Tenant Staff to Portal Group ━━━" -ForegroundColor Magenta
    Write-Host ""

    Write-Host "👥 Existing tenant users (admin access):" -ForegroundColor Cyan
    foreach ($upn in $ExistingStaffUPNs) {
        try {
            $existingUser = Get-MgUser -UserId $upn -Property "displayName,id" -ErrorAction Stop
            Add-UserToGroup -UserId $existingUser.Id -GroupId $staffGroup.Id -UserName $existingUser.DisplayName
            Write-Host "   ✅ Added: $($existingUser.DisplayName) ($upn)" -ForegroundColor Green
        }
        catch {
            Write-Host "   ⚠️  Could not find: $upn - $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }
    Write-Host ""

    # ─── Step 6: Populate Special Groups ──────────────────────────────────────
    Write-Host "━━━ Step 6: Populate Special Groups ━━━" -ForegroundColor Magenta
    Write-Host ""

    foreach ($sg in $SpecialGroups) {
        Write-Host "⭐ $($sg.Name):" -ForegroundColor Cyan
        foreach ($memberNick in $sg.Members) {
            if ($allStudentUsers.ContainsKey($memberNick)) {
                $user = $allStudentUsers[$memberNick]
                Add-UserToGroup -UserId $user.Id -GroupId $specialGroupObjects[$sg.Name].Id -UserName $user.DisplayName
                Write-Host "   ➕ Added $($user.DisplayName)" -ForegroundColor Gray
            }
            else {
                Write-Host "   ⚠️  Student '$memberNick' not found in created users" -ForegroundColor Yellow
            }
        }
        Write-Host ""
    }
}

# ─── Step 7: Create Automation App Registration (OIDC, no client secret) ──
Write-Host "━━━ Step 7: Create Automation App Registration (OIDC) ━━━" -ForegroundColor Magenta
Write-Host ""

$AppName = "StudentAccess-Demo-Automation"

# Get Graph SP for permission IDs (needed for both create and consent)
$graphSP = Get-MgServicePrincipal -Filter "displayName eq 'Microsoft Graph'" | Select-Object -First 1

# Full CRUD permissions — the app itself manages users/groups server-side
$automationPermissions = @(
    "User.ReadWrite.All",
    "Group.ReadWrite.All",
    "Directory.ReadWrite.All",
    "GroupMember.ReadWrite.All",
    "User.ManageIdentities.All",
    "AuditLog.Read.All"
)
$resourceAccess = @()
foreach ($perm in $automationPermissions) {
    $appRole = $graphSP.AppRoles | Where-Object { $_.Value -eq $perm }
    if ($appRole) {
        $resourceAccess += @{ Id = $appRole.Id; Type = "Role" }
    }
}

$existingApp = Get-MgApplication -Filter "displayName eq '$AppName'" -ErrorAction SilentlyContinue
if ($existingApp) {
    Write-Host "⏭️  App Registration already exists: $($existingApp.AppId)" -ForegroundColor Yellow
    $app = $existingApp
    $appSP = Get-MgServicePrincipal -Filter "appId eq '$($app.AppId)'" -ErrorAction SilentlyContinue

    # Update permissions on existing app to ensure they match current requirements
    Write-Host "   🔄 Updating API permissions on existing app..." -ForegroundColor Cyan
    Update-MgApplication -ApplicationId $app.Id -RequiredResourceAccess @(
        @{
            ResourceAppId  = "00000003-0000-0000-c000-000000000000"
            ResourceAccess = $resourceAccess
        }
    )
} else {
    Write-Host "📱 Creating App Registration: $AppName" -ForegroundColor Cyan
    Write-Host "   🔑 Using OIDC federation only — NO client secret needed" -ForegroundColor Gray

    $app = New-MgApplication -DisplayName $AppName -SignInAudience "AzureADMyOrg" -RequiredResourceAccess @(
        @{
            ResourceAppId  = "00000003-0000-0000-c000-000000000000"
            ResourceAccess = $resourceAccess
        }
    )
    Write-Host "   ✅ App ID: $($app.AppId)" -ForegroundColor Green

    # Create Service Principal
    $appSP = New-MgServicePrincipal -AppId $app.AppId
    Write-Host "   ✅ Service Principal created" -ForegroundColor Green
}

# Always ensure admin consent is granted for all permissions
Write-Host "   🔐 Ensuring admin consent for all permissions..." -ForegroundColor Cyan
$existingGrants = Get-MgServicePrincipalAppRoleAssignment -ServicePrincipalId $appSP.Id -ErrorAction SilentlyContinue
foreach ($perm in $automationPermissions) {
    $appRole = $graphSP.AppRoles | Where-Object { $_.Value -eq $perm }
    if ($appRole) {
        $alreadyGranted = $existingGrants | Where-Object { $_.AppRoleId -eq $appRole.Id }
        if ($alreadyGranted) {
            Write-Host "   ✅ Already granted: $perm" -ForegroundColor DarkGreen
        } else {
            try {
                New-MgServicePrincipalAppRoleAssignment `
                    -ServicePrincipalId $appSP.Id `
                    -PrincipalId $appSP.Id `
                    -ResourceId $graphSP.Id `
                    -AppRoleId $appRole.Id | Out-Null
                Write-Host "   ✅ Granted: $perm" -ForegroundColor Green
            }
            catch {
                Write-Host "   ⚠️  $perm : $($_.Exception.Message)" -ForegroundColor Yellow
            }
        }
    }
}
Write-Host "   ✅ No client secret — federated credentials only (OIDC)" -ForegroundColor Green
Write-Host ""

# ─── Step 7b: Create SAM Portal App Registration ─────────────────────────
Write-Host "━━━ Step 7b: Create SAM Portal App Registration (SSO + API) ━━━" -ForegroundColor Magenta
Write-Host ""

$PortalAppName = "SAM-Portal"

# Delegated permissions (user SSO login only)
$delegatedPerms = @("User.Read", "openid", "profile", "email")
$delegatedAccess = @()
foreach ($perm in $delegatedPerms) {
    $scope = $graphSP.Oauth2PermissionScopes | Where-Object { $_.Value -eq $perm }
    if ($scope) {
        $delegatedAccess += @{ Id = $scope.Id; Type = "Scope" }
    }
}

# Application permissions (server-side — the app manages users/groups, not the logged-in user)
$portalAppPerms = @(
    "User.ReadWrite.All",
    "Group.ReadWrite.All",
    "Directory.ReadWrite.All",
    "GroupMember.ReadWrite.All",
    "AuditLog.Read.All"
)
$portalAppAccess = @()
foreach ($perm in $portalAppPerms) {
    $appRole = $graphSP.AppRoles | Where-Object { $_.Value -eq $perm }
    if ($appRole) {
        $portalAppAccess += @{ Id = $appRole.Id; Type = "Role" }
    }
}

# Redirect URIs for localhost, SWA, and App Service
$redirectUris = @(
    "http://localhost:3000/api/auth/callback/microsoft-entra-id",
    "https://app-atea-sam-portal.azurestaticapps.net/api/auth/callback/microsoft-entra-id",
    "https://app-atea-sam-portal.azurewebsites.net/api/auth/callback/microsoft-entra-id"
)

$portalRequiredAccess = @(
    @{
        ResourceAppId  = "00000003-0000-0000-c000-000000000000"
        ResourceAccess = $delegatedAccess + $portalAppAccess
    }
)

$existingPortalApp = Get-MgApplication -Filter "displayName eq '$PortalAppName'" -ErrorAction SilentlyContinue
if ($existingPortalApp) {
    Write-Host "⏭️  Portal App already exists: $($existingPortalApp.AppId)" -ForegroundColor Yellow
    $portalApp = $existingPortalApp
    $portalSP = Get-MgServicePrincipal -Filter "appId eq '$($portalApp.AppId)'" -ErrorAction SilentlyContinue

    # Update permissions and redirect URIs on existing app
    Write-Host "   🔄 Updating API permissions and redirect URIs..." -ForegroundColor Cyan
    Update-MgApplication -ApplicationId $portalApp.Id `
        -RequiredResourceAccess $portalRequiredAccess `
        -Web @{
            RedirectUris          = $redirectUris
            ImplicitGrantSettings = @{
                EnableAccessTokenIssuance = $false
                EnableIdTokenIssuance     = $true
            }
        }
} else {
    Write-Host "📱 Creating Portal App Registration: $PortalAppName" -ForegroundColor Cyan

    $portalApp = New-MgApplication -DisplayName $PortalAppName `
        -SignInAudience "AzureADMyOrg" `
        -Web @{
            RedirectUris          = $redirectUris
            ImplicitGrantSettings = @{
                EnableAccessTokenIssuance = $false
                EnableIdTokenIssuance     = $true
            }
        } `
        -RequiredResourceAccess $portalRequiredAccess

    Write-Host "   ✅ Portal App ID: $($portalApp.AppId)" -ForegroundColor Green

    # Create Service Principal
    $portalSP = New-MgServicePrincipal -AppId $portalApp.AppId
    Write-Host "   ✅ Portal Service Principal created" -ForegroundColor Green

    # Create client secret (NextAuth needs this for server-side OAuth token exchange)
    $portalSecret = Add-MgApplicationPassword -ApplicationId $portalApp.Id -BodyParameter @{
        PasswordCredential = @{
            DisplayName = "SAM-Portal-Secret"
            EndDateTime = (Get-Date).AddYears(1)
        }
    }
    Write-Host "   ✅ Portal client secret created (for NextAuth login flow)" -ForegroundColor Green
}

Write-Host "   📍 Redirect URIs:" -ForegroundColor Gray
foreach ($uri in $redirectUris) {
    Write-Host "      $uri" -ForegroundColor DarkGray
}

# Always ensure admin consent is granted for all application permissions
Write-Host "   🔐 Ensuring admin consent for portal app permissions..." -ForegroundColor Cyan
$existingPortalGrants = Get-MgServicePrincipalAppRoleAssignment -ServicePrincipalId $portalSP.Id -ErrorAction SilentlyContinue
foreach ($perm in $portalAppPerms) {
    $appRole = $graphSP.AppRoles | Where-Object { $_.Value -eq $perm }
    if ($appRole) {
        $alreadyGranted = $existingPortalGrants | Where-Object { $_.AppRoleId -eq $appRole.Id }
        if ($alreadyGranted) {
            Write-Host "   ✅ Already granted: $perm" -ForegroundColor DarkGreen
        } else {
            try {
                New-MgServicePrincipalAppRoleAssignment `
                    -ServicePrincipalId $portalSP.Id `
                    -PrincipalId $portalSP.Id `
                    -ResourceId $graphSP.Id `
                    -AppRoleId $appRole.Id | Out-Null
                Write-Host "   ✅ Granted: $perm" -ForegroundColor Green
            }
            catch {
                Write-Host "   ⚠️  $perm : $($_.Exception.Message)" -ForegroundColor Yellow
            }
        }
    }
}
Write-Host ""

# ─── Step 8: GitHub-Azure Federation ─────────────────────────────────────
if (-not $SkipFederation) {
    Write-Host "━━━ Step 8: GitHub-Azure Federation (OIDC) ━━━" -ForegroundColor Magenta
    Write-Host ""

    # Check for existing federated credentials
    $existingCreds = Get-MgApplicationFederatedIdentityCredential -ApplicationId $app.Id -ErrorAction SilentlyContinue

    $federatedCredentials = @(
        @{
            Name      = "github-main-branch"
            Issuer    = "https://token.actions.githubusercontent.com"
            Subject   = "repo:${GitHubRepo}:ref:refs/heads/main"
            Audiences = @("api://AzureADTokenExchange")
        },
        @{
            Name      = "github-pull-request"
            Issuer    = "https://token.actions.githubusercontent.com"
            Subject   = "repo:${GitHubRepo}:pull_request"
            Audiences = @("api://AzureADTokenExchange")
        },
        @{
            Name      = "github-environment-demo"
            Issuer    = "https://token.actions.githubusercontent.com"
            Subject   = "repo:${GitHubRepo}:environment:demo"
            Audiences = @("api://AzureADTokenExchange")
        }
    )

    foreach ($cred in $federatedCredentials) {
        $existing = $existingCreds | Where-Object { $_.Name -eq $cred.Name }
        if ($existing) {
            Write-Host "   ⏭️  Federation exists: $($cred.Name)" -ForegroundColor Yellow
        }
        else {
            try {
                New-MgApplicationFederatedIdentityCredential -ApplicationId $app.Id -BodyParameter $cred | Out-Null
                Write-Host "   ✅ Created: $($cred.Name)" -ForegroundColor Green
            }
            catch {
                Write-Host "   ❌ Failed: $($cred.Name) - $($_.Exception.Message)" -ForegroundColor Red
            }
        }
    }

    Write-Host ""
    Write-Host "   🔑 Add these GitHub Secrets:" -ForegroundColor Cyan
    Write-Host "      AZURE_CLIENT_ID:       $($app.AppId)" -ForegroundColor White
    Write-Host "      AZURE_TENANT_ID:       $TenantId" -ForegroundColor White
    Write-Host ""
}

# ─── Step 9: Azure Infrastructure ────────────────────────────────────────
if (-not $SkipInfrastructure) {
    Write-Host "━━━ Step 9: Azure Infrastructure Deployment ━━━" -ForegroundColor Magenta
    Write-Host ""

    # Connect to Azure if not already
    $azContext = Get-AzContext -ErrorAction SilentlyContinue
    if (-not $azContext) {
        Write-Host "Connecting to Azure..." -ForegroundColor Yellow
        Connect-AzAccount -TenantId $TenantId
        $azContext = Get-AzContext
    }

    $SubscriptionId = $azContext.Subscription.Id
    Write-Host "   Subscription: $($azContext.Subscription.Name) ($SubscriptionId)" -ForegroundColor Gray

    # Assign Contributor role to the federation app
    Write-Host "   🔐 Assigning Contributor role to federation app..." -ForegroundColor Cyan
    try {
        New-AzRoleAssignment `
            -ObjectId $appSP.Id `
            -RoleDefinitionName "Contributor" `
            -Scope "/subscriptions/$SubscriptionId" `
            -ErrorAction SilentlyContinue | Out-Null
        Write-Host "   ✅ Contributor role assigned" -ForegroundColor Green
    }
    catch {
        if ($_.Exception.Message -like "*already exists*") {
            Write-Host "   ⏭️  Contributor role already assigned" -ForegroundColor Yellow
        }
        else {
            Write-Host "   ⚠️  Role assignment: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }

    # Create Resource Group
    Write-Host "   📦 Creating Resource Group: $ResourceGroupName" -ForegroundColor Cyan
    New-AzResourceGroup -Name $ResourceGroupName -Location $Location -Force | Out-Null
    Write-Host "   ✅ Resource Group ready" -ForegroundColor Green

    # Get the master group ID for deployment
    if (-not $SkipUsers) {
        $masterGroupId = $masterGroup.Id
    }
    else {
        $mg = Get-MgGroup -Filter "displayName eq '$MasterGroupName'" -ErrorAction SilentlyContinue
        $masterGroupId = if ($mg) { $mg.Id } else { "00000000-0000-0000-0000-000000000000" }
    }

    # Deploy Bicep template
    Write-Host "   🚀 Deploying Azure Automation infrastructure..." -ForegroundColor Cyan
    $bicepPath = Join-Path $PSScriptRoot "..\infrastructure\main.bicep"

    if (Test-Path $bicepPath) {
        $deploymentParams = @{
            tenantId           = $TenantId
            graphClientId      = $app.AppId
            graphClientSecret  = "OIDC-FEDERATED-NO-SECRET"
            studentGroupId     = $masterGroupId
            automationAccountName = $AutomationAccountName
            enableTime         = "07:55"
            disableTime        = "16:05"
        }

        try {
            $deployment = New-AzResourceGroupDeployment `
                -ResourceGroupName $ResourceGroupName `
                -TemplateFile $bicepPath `
                -TemplateParameterObject $deploymentParams `
                -Name "demo-deployment-$(Get-Date -Format 'yyyyMMddHHmm')" `
                -ErrorAction Stop

            Write-Host "   ✅ Infrastructure deployed!" -ForegroundColor Green
            Write-Host "      Automation Account: $($deployment.Outputs.automationAccountName.Value)" -ForegroundColor Gray
        }
        catch {
            Write-Host "   ❌ Deployment failed: $($_.Exception.Message)" -ForegroundColor Red
            Write-Host "   💡 You can deploy manually: az deployment group create -g $ResourceGroupName -f infrastructure/main.bicep" -ForegroundColor Yellow
        }
    }
    else {
        Write-Host "   ⚠️  Bicep template not found at: $bicepPath" -ForegroundColor Yellow
        Write-Host "   💡 Deploy manually from the infrastructure/ directory" -ForegroundColor Yellow
    }
    Write-Host ""
}

# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║   🎉 Demo Environment Setup Complete!                             ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

Write-Host "━━━ 🏫 School: $SchoolName ━━━" -ForegroundColor Cyan
Write-Host ""

Write-Host "� ADMINISTRATIVE UNIT (Isolation):" -ForegroundColor Green
Write-Host "─────────────────────────────────────────────────" -ForegroundColor Gray
Write-Host "   Name:  $AdminUnitName" -ForegroundColor White
Write-Host "   ID:    $($adminUnit.Id)" -ForegroundColor Yellow
Write-Host "   All demo users and groups are scoped inside this AU." -ForegroundColor Gray
Write-Host "   Existing tenant users are NOT affected." -ForegroundColor Gray
Write-Host ""

Write-Host "�📚 DEMO CLASSES:" -ForegroundColor Green
Write-Host "─────────────────────────────────────────────────" -ForegroundColor Gray
foreach ($class in $DemoClasses) {
    $grp = Get-MgGroup -Filter "displayName eq '$($class.GroupName)'" -ErrorAction SilentlyContinue
    $memberCount = if ($grp) { (Get-MgGroupMember -GroupId $grp.Id -All).Count } else { "?" }
    Write-Host "   $($class.Name) | Group: $($class.GroupName) | Students: $memberCount | Schedule: $($class.Schedule.Enable)-$($class.Schedule.Disable)" -ForegroundColor White
}
Write-Host ""

Write-Host "⭐ SPECIAL GROUPS:" -ForegroundColor Green
Write-Host "─────────────────────────────────────────────────" -ForegroundColor Gray
foreach ($sg in $SpecialGroups) {
    $grp = Get-MgGroup -Filter "displayName eq '$($sg.Name)'" -ErrorAction SilentlyContinue
    $memberCount = if ($grp) { (Get-MgGroupMember -GroupId $grp.Id -All).Count } else { "?" }
    Write-Host "   $($sg.Name) | Members: $memberCount | $($sg.Description)" -ForegroundColor White
}
Write-Host ""

Write-Host "👤 DEMO CREDENTIALS:" -ForegroundColor Green
Write-Host "─────────────────────────────────────────────────" -ForegroundColor Gray
Write-Host "   Students:  *@$Domain / $DefaultPassword" -ForegroundColor White
Write-Host "   Teachers:  *@$Domain / $TeacherPassword" -ForegroundColor White
Write-Host "   IT Staff:  *@$Domain / $TeacherPassword" -ForegroundColor White
Write-Host ""

$masterGrp = Get-MgGroup -Filter "displayName eq '$MasterGroupName'" -ErrorAction SilentlyContinue
Write-Host "🎯 MASTER STUDENT GROUP:" -ForegroundColor Green
Write-Host "─────────────────────────────────────────────────" -ForegroundColor Gray
Write-Host "   Name:  $MasterGroupName" -ForegroundColor White
Write-Host "   ID:    $($masterGrp.Id)" -ForegroundColor Yellow
Write-Host ""

Write-Host "📱 AUTOMATION APP REGISTRATION (OIDC, no secret):" -ForegroundColor Green
Write-Host "─────────────────────────────────────────────────" -ForegroundColor Gray
Write-Host "   Name:           $AppName" -ForegroundColor White
Write-Host "   Client ID:      $($app.AppId)" -ForegroundColor White
Write-Host "   Tenant ID:      $TenantId" -ForegroundColor White
Write-Host "   Auth:           Federated (OIDC) — no client secret" -ForegroundColor Green
Write-Host ""

Write-Host "🌐 SAM PORTAL APP REGISTRATION:" -ForegroundColor Green
Write-Host "─────────────────────────────────────────────────" -ForegroundColor Gray
Write-Host "   Name:           $PortalAppName" -ForegroundColor White
Write-Host "   Client ID:      $($portalApp.AppId)" -ForegroundColor White
Write-Host "   Tenant ID:      $TenantId" -ForegroundColor White
if ($portalSecret) {
    Write-Host "   Client Secret:  $($portalSecret.SecretText)" -ForegroundColor Red
    Write-Host "   ⚠️  SAVE THIS SECRET — needed for portal .env.local (AZURE_AD_CLIENT_SECRET)" -ForegroundColor Red
}
Write-Host "   Redirect URIs:  localhost:3000, SWA, App Service" -ForegroundColor Gray
Write-Host ""

if (-not $SkipFederation) {
    Write-Host "🔗 GITHUB FEDERATION:" -ForegroundColor Green
    Write-Host "─────────────────────────────────────────────────" -ForegroundColor Gray
    Write-Host "   Repository:     $GitHubRepo" -ForegroundColor White
    Write-Host "   Credentials:    main branch, pull_request, demo environment" -ForegroundColor White
    Write-Host ""
    Write-Host "   Add these GitHub Secrets (Settings → Secrets → Actions):" -ForegroundColor Yellow
    Write-Host "   ┌─────────────────────────────────────────────────────────┐" -ForegroundColor Gray
    Write-Host "   │ AZURE_CLIENT_ID:         $($app.AppId)  │" -ForegroundColor Cyan
    Write-Host "   │ AZURE_TENANT_ID:         $TenantId  │" -ForegroundColor Cyan
    if ($azContext) {
        Write-Host "   │ AZURE_SUBSCRIPTION_ID:   $($azContext.Subscription.Id)  │" -ForegroundColor Cyan
    }
    Write-Host "   │ STUDENT_GROUP_ID:        $($masterGrp.Id)  │" -ForegroundColor Cyan
    Write-Host "   │ PORTAL_CLIENT_ID:        $($portalApp.AppId)  │" -ForegroundColor Cyan
    if ($portalSecret) {
        Write-Host "   │ PORTAL_CLIENT_SECRET:    $($portalSecret.SecretText)  │" -ForegroundColor Cyan
    }
    Write-Host "   └─────────────────────────────────────────────────────────┘" -ForegroundColor Gray
    Write-Host ""
}

if (-not $SkipInfrastructure) {
    Write-Host "☁️  AZURE RESOURCES:" -ForegroundColor Green
    Write-Host "─────────────────────────────────────────────────" -ForegroundColor Gray
    Write-Host "   Resource Group:      $ResourceGroupName" -ForegroundColor White
    Write-Host "   Automation Account:  $AutomationAccountName" -ForegroundColor White
    Write-Host "   Location:            $Location" -ForegroundColor White
    Write-Host ""
}

Write-Host "🚀 NEXT STEPS:" -ForegroundColor Green
Write-Host "─────────────────────────────────────────────────" -ForegroundColor Gray
Write-Host "   1. Add GitHub Secrets to $GitHubRepo" -ForegroundColor White
Write-Host "   2. Test automation: .\Test-StudentAccess.ps1" -ForegroundColor White
Write-Host "   3. Try manual enable/disable from Azure Portal" -ForegroundColor White
Write-Host "   4. Build the management portal (Phase 1)" -ForegroundColor White
Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Demo environment ready! 🎉" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
