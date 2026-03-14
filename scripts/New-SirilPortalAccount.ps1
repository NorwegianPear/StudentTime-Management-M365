<#
.SYNOPSIS
    Creates a portal account for Siril Aasheim in ateara.onmicrosoft.com and sends 
    login credentials to her primary email (siril.aasheim@atea.no).

.NOTES
    Requires: Connect-MgGraph -Scopes "User.ReadWrite.All","Mail.Send"
    Run as: Global Admin on ateara.onmicrosoft.com
#>

#Requires -Modules Microsoft.Graph.Users, Microsoft.Graph.Mail

# ─── Configuration ────────────────────────────────────────────────────────────
$NewUPN        = "siril.aasheim@ateara.onmicrosoft.com"
$DisplayName   = "Siril Aasheim"
$GivenName     = "Siril"
$Surname       = "Aasheim"
$PrimaryMail   = "siril.aasheim@atea.no"
$MailNickname  = "siril.aasheim"
$SenderUPN     = "uy.le.thai.phan@ateara.onmicrosoft.com"
# ──────────────────────────────────────────────────────────────────────────────

# 1. Check if user already exists
Write-Host "`n[1/4] Checking if account $NewUPN already exists..." -ForegroundColor Cyan
$existing = Get-MgUser -Filter "userPrincipalName eq '$NewUPN'" -ErrorAction SilentlyContinue

if ($existing) {
    Write-Host "      ✅ User already exists: $($existing.DisplayName) ($($existing.UserPrincipalName))" -ForegroundColor Yellow
    Write-Host "      No new account created. Skipping to send a password reset link instead." -ForegroundColor Yellow
    $UserId = $existing.Id
    $TempPassword = $null
} else {
    # 2. Generate a secure temporary password
    Write-Host "[2/4] Generating temporary password..." -ForegroundColor Cyan
    $chars   = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%"
    $TempPassword = -join ((1..14) | ForEach-Object { $chars[(Get-Random -Maximum $chars.Length)] })
    # Ensure complexity: uppercase, lowercase, digit, special
    $TempPassword = "P@" + $TempPassword  

    # 3. Create the user
    Write-Host "[3/4] Creating user account..." -ForegroundColor Cyan
    $PasswordProfile = @{
        ForceChangePasswordNextSignIn = $true
        Password                      = $TempPassword
    }

    $NewUser = New-MgUser -DisplayName $DisplayName `
                          -GivenName $GivenName `
                          -Surname $Surname `
                          -UserPrincipalName $NewUPN `
                          -MailNickname $MailNickname `
                          -AccountEnabled `
                          -PasswordProfile $PasswordProfile `
                          -UsageLocation "NO"

    $UserId = $NewUser.Id
    Write-Host "      ✅ Account created: $NewUPN (ID: $UserId)" -ForegroundColor Green
}

# 4. Send credentials email to primary mail
Write-Host "[4/4] Sending credentials to $PrimaryMail ..." -ForegroundColor Cyan

$EmailBody = if ($TempPassword) {
@"
<html><body style="font-family: Segoe UI, Arial, sans-serif; color: #333; max-width: 600px;">
<div style="background: #0078D4; padding: 20px 30px; border-radius: 8px 8px 0 0;">
  <h2 style="color: white; margin: 0;">🎓 Student Time Management Portal — Tilgang opprettet</h2>
</div>
<div style="padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
  <p>Hei Siril,</p>
  <p>Din administrator-konto for <strong>Student Time Management Portal</strong> er nå opprettet.</p>

  <table style="background: #f5f5f5; border-radius: 8px; padding: 20px; width: 100%; border-collapse: collapse;">
    <tr><td style="padding: 8px 12px; font-weight: bold; width: 180px;">🌐 Portal URL:</td>
        <td style="padding: 8px 12px;"><a href="https://ateara-student-portal.azurewebsites.net">ateara-student-portal.azurewebsites.net</a></td></tr>
    <tr><td style="padding: 8px 12px; font-weight: bold;">📧 Brukernavn:</td>
        <td style="padding: 8px 12px; font-family: monospace; background: #fff; border-radius: 4px;">$NewUPN</td></tr>
    <tr><td style="padding: 8px 12px; font-weight: bold;">🔑 Midlertidig passord:</td>
        <td style="padding: 8px 12px; font-family: monospace; font-size: 16px; background: #fff; border-radius: 4px; letter-spacing: 2px;">$TempPassword</td></tr>
    <tr><td style="padding: 8px 12px; font-weight: bold;">👑 Rolle:</td>
        <td style="padding: 8px 12px;"><strong style="color: #107C10;">Administrator</strong> — full tilgang</td></tr>
  </table>

  <div style="margin-top: 20px; padding: 15px; background: #fff4ce; border-left: 4px solid #FFA500; border-radius: 4px;">
    <strong>⚠️ Viktig:</strong> Du vil bli bedt om å endre passordet ved første innlogging.
  </div>

  <h3 style="margin-top: 25px;">Slik logger du inn:</h3>
  <ol>
    <li>Gå til <a href="https://ateara-student-portal.azurewebsites.net">portalen</a></li>
    <li>Klikk <strong>Logg inn</strong></li>
    <li>Bruk e-posten <strong>$NewUPN</strong> og det midlertidige passordet ovenfor</li>
    <li>Sett ditt nye passord og logg inn med det</li>
  </ol>

  <p style="color: #666; font-size: 13px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px;">
    Denne meldingen ble sendt automatisk. Ta kontakt med Uy Le Thai Phan 
    (<a href="mailto:uy.le.thai.phan@atea.no">uy.le.thai.phan@atea.no</a>) ved spørsmål.
  </p>
</div>
</body></html>
"@
} else {
@"
<html><body style="font-family: Segoe UI, Arial, sans-serif; color: #333; max-width: 600px;">
<div style="background: #0078D4; padding: 20px 30px; border-radius: 8px 8px 0 0;">
  <h2 style="color: white; margin: 0;">🎓 Student Time Management Portal — Tilgang klar</h2>
</div>
<div style="padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
  <p>Hei Siril,</p>
  <p>Din eksisterende konto <strong>$NewUPN</strong> har nå blitt gitt <strong style="color: #107C10;">Administrator</strong>-tilgang til Student Time Management Portal.</p>

  <table style="background: #f5f5f5; border-radius: 8px; padding: 20px; width: 100%; border-collapse: collapse;">
    <tr><td style="padding: 8px 12px; font-weight: bold; width: 180px;">🌐 Portal URL:</td>
        <td style="padding: 8px 12px;"><a href="https://ateara-student-portal.azurewebsites.net">ateara-student-portal.azurewebsites.net</a></td></tr>
    <tr><td style="padding: 8px 12px; font-weight: bold;">📧 Brukernavn:</td>
        <td style="padding: 8px 12px; font-family: monospace; background: #fff; border-radius: 4px;">$NewUPN</td></tr>
    <tr><td style="padding: 8px 12px; font-weight: bold;">👑 Rolle:</td>
        <td style="padding: 8px 12px;"><strong style="color: #107C10;">Administrator</strong> — full tilgang</td></tr>
  </table>

  <p style="color: #666; font-size: 13px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px;">
    Bruk ditt vanlige passord for $NewUPN. Kontakt Uy Le Thai Phan 
    (<a href="mailto:uy.le.thai.phan@atea.no">uy.le.thai.phan@atea.no</a>) ved spørsmål.
  </p>
</div>
</body></html>
"@
}

$Message = @{
    subject      = "🎓 Student Time Management Portal — Din tilgang som Administrator"
    body         = @{
        contentType = "HTML"
        content     = $EmailBody
    }
    toRecipients = @(
        @{ emailAddress = @{ address = $PrimaryMail } }
    )
}

Send-MgUserMail -UserId $SenderUPN -Message $Message
Write-Host "      ✅ Email sent to $PrimaryMail" -ForegroundColor Green

Write-Host "`n✅ Done! Summary:" -ForegroundColor Green
Write-Host "   Account : $NewUPN" -ForegroundColor White
Write-Host "   Role    : Administrator (portal)" -ForegroundColor White
Write-Host "   Email   : Credentials sent to $PrimaryMail" -ForegroundColor White
