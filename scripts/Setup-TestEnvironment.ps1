<#
.SYNOPSIS
    Sets up a test environment for Student Time Management solution.

.DESCRIPTION
    Creates a test security group and optionally test user accounts for safely
    testing the Student Access solution before production deployment.

.PARAMETER TestGroupName
    Name for the test security group. Default: "StudentAccess-TestGroup"

.PARAMETER CreateTestUsers
    If specified, creates test user accounts in the test group.

.PARAMETER TestUserCount
    Number of test users to create. Default: 3

.PARAMETER TestUserPassword
    Password for test users. If not specified, a random password is generated.

.EXAMPLE
    .\Setup-TestEnvironment.ps1
    Creates only the test group (you add existing users manually)

.EXAMPLE
    .\Setup-TestEnvironment.ps1 -CreateTestUsers -TestUserCount 3
    Creates test group and 3 test user accounts

.NOTES
    Author: Atea AS
    Requires: Microsoft.Graph PowerShell module
    Permissions: Group.ReadWrite.All, User.ReadWrite.All (if creating users)
#>

[CmdletBinding()]
param(
    [Parameter()]
    [string]$TestGroupName = "StudentAccess-TestGroup",

    [Parameter()]
    [switch]$CreateTestUsers,

    [Parameter()]
    [ValidateRange(1, 10)]
    [int]$TestUserCount = 3,

    [Parameter()]
    [string]$TestUserPassword,

    [Parameter()]
    [string]$TestUserDomain
)

#Requires -Modules Microsoft.Graph.Groups, Microsoft.Graph.Users

# Banner
Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     Student Time Management - Test Environment Setup          ║" -ForegroundColor Cyan
Write-Host "║                        v1.0.0                                 ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check connection
$context = Get-MgContext
if (-not $context) {
    Write-Host "⚠️  Not connected to Microsoft Graph. Connecting..." -ForegroundColor Yellow
    Connect-MgGraph -Scopes "Group.ReadWrite.All", "User.ReadWrite.All" -NoWelcome
    $context = Get-MgContext
}

Write-Host "✅ Connected as: $($context.Account)" -ForegroundColor Green
Write-Host "   Tenant: $($context.TenantId)" -ForegroundColor Gray
Write-Host ""

# Get domain if not specified
if (-not $TestUserDomain -and $CreateTestUsers) {
    $org = Get-MgOrganization
    $TestUserDomain = ($org.VerifiedDomains | Where-Object { $_.IsDefault }).Name
    Write-Host "📧 Using domain: $TestUserDomain" -ForegroundColor Cyan
}

# Check if test group exists
Write-Host "🔍 Checking for existing test group..." -ForegroundColor Cyan
$existingGroup = Get-MgGroup -Filter "displayName eq '$TestGroupName'" -ErrorAction SilentlyContinue

if ($existingGroup) {
    Write-Host "✅ Test group already exists:" -ForegroundColor Green
    Write-Host "   Name: $($existingGroup.DisplayName)" -ForegroundColor Gray
    Write-Host "   ID:   $($existingGroup.Id)" -ForegroundColor Gray
    $testGroup = $existingGroup
} else {
    Write-Host "📝 Creating test security group: $TestGroupName" -ForegroundColor Yellow
    
    $groupParams = @{
        DisplayName        = $TestGroupName
        Description        = "Test group for Student Time Management solution. Members will have login times restricted during testing."
        MailEnabled        = $false
        MailNickname       = $TestGroupName.Replace(" ", "").Replace("-", "")
        SecurityEnabled    = $true
        GroupTypes         = @()
    }
    
    $testGroup = New-MgGroup @groupParams
    Write-Host "✅ Test group created successfully!" -ForegroundColor Green
    Write-Host "   ID: $($testGroup.Id)" -ForegroundColor Gray
}

Write-Host ""

# Create test users if requested
$testUsers = @()
if ($CreateTestUsers) {
    Write-Host "👤 Creating $TestUserCount test user(s)..." -ForegroundColor Cyan
    
    # Generate password if not provided
    if (-not $TestUserPassword) {
        $TestUserPassword = "Test" + (Get-Random -Minimum 1000 -Maximum 9999) + "!" + [char](Get-Random -Minimum 65 -Maximum 90)
        Write-Host "   Generated password: $TestUserPassword" -ForegroundColor Yellow
    }
    
    $passwordProfile = @{
        Password                      = $TestUserPassword
        ForceChangePasswordNextSignIn = $false
    }
    
    for ($i = 1; $i -le $TestUserCount; $i++) {
        $timestamp = Get-Date -Format "MMddHHmm"
        $userName = "teststudent$i.$timestamp"
        $upn = "$userName@$TestUserDomain"
        
        # Check if user exists
        $existingUser = Get-MgUser -Filter "userPrincipalName eq '$upn'" -ErrorAction SilentlyContinue
        
        if ($existingUser) {
            Write-Host "   ⚠️  User $upn already exists, skipping..." -ForegroundColor Yellow
            $testUsers += $existingUser
        } else {
            $userParams = @{
                DisplayName       = "Test Student $i"
                UserPrincipalName = $upn
                MailNickname      = $userName
                AccountEnabled    = $true
                PasswordProfile   = $passwordProfile
                UsageLocation     = "NO"
                Department        = "Test Students"
                JobTitle          = "Test Account"
            }
            
            try {
                $newUser = New-MgUser @userParams
                Write-Host "   ✅ Created: $upn" -ForegroundColor Green
                $testUsers += $newUser
                
                # Add to test group
                $memberParams = @{
                    "@odata.id" = "https://graph.microsoft.com/v1.0/directoryObjects/$($newUser.Id)"
                }
                New-MgGroupMemberByRef -GroupId $testGroup.Id -BodyParameter $memberParams
                Write-Host "      Added to test group" -ForegroundColor Gray
            }
            catch {
                Write-Host "   ❌ Failed to create $upn : $_" -ForegroundColor Red
            }
        }
    }
    Write-Host ""
}

# Show current group members
Write-Host "👥 Current test group members:" -ForegroundColor Cyan
$members = Get-MgGroupMember -GroupId $testGroup.Id -All
if ($members.Count -eq 0) {
    Write-Host "   (No members yet - add test accounts manually)" -ForegroundColor Yellow
} else {
    foreach ($member in $members) {
        $user = Get-MgUser -UserId $member.Id -Property "displayName,userPrincipalName,accountEnabled"
        $status = if ($user.AccountEnabled) { "✅ Enabled" } else { "🔴 Disabled" }
        Write-Host "   • $($user.DisplayName) ($($user.UserPrincipalName)) - $status" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 TEST GROUP DETAILS" -ForegroundColor Green
Write-Host "─────────────────────────────────────────────────────────────────" -ForegroundColor Gray
Write-Host "   Group Name:    $($testGroup.DisplayName)" -ForegroundColor White
Write-Host "   Group ID:      $($testGroup.Id)" -ForegroundColor Yellow -BackgroundColor DarkGray
Write-Host "   Member Count:  $($members.Count)" -ForegroundColor White
Write-Host ""

if ($CreateTestUsers -and $testUsers.Count -gt 0) {
    Write-Host "📋 TEST USER CREDENTIALS" -ForegroundColor Green
    Write-Host "─────────────────────────────────────────────────────────────────" -ForegroundColor Gray
    Write-Host "   Password: $TestUserPassword" -ForegroundColor Yellow
    Write-Host "   Users:" -ForegroundColor White
    foreach ($user in $testUsers) {
        Write-Host "      • $($user.UserPrincipalName)" -ForegroundColor Gray
    }
    Write-Host ""
}

Write-Host "🚀 NEXT STEPS" -ForegroundColor Green
Write-Host "─────────────────────────────────────────────────────────────────" -ForegroundColor Gray
Write-Host "   1. Copy the Group ID above" -ForegroundColor White
Write-Host "   2. Run the deployment script: .\Start-StudentAccessMenu.ps1" -ForegroundColor White
Write-Host "   3. Use the Test Group ID when prompted for 'StudentGroupId'" -ForegroundColor White
Write-Host "   4. Monitor the test accounts for a few days" -ForegroundColor White
Write-Host "   5. When ready, update StudentGroupId to production group" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  REMINDER: Only accounts in this group will be affected!" -ForegroundColor Yellow
Write-Host "   Teachers, admins, and other staff are NOT impacted." -ForegroundColor Yellow
Write-Host ""

# Copy to clipboard
$testGroup.Id | Set-Clipboard
Write-Host "📋 Group ID copied to clipboard!" -ForegroundColor Cyan
Write-Host ""
