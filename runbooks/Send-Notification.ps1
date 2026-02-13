<#
.SYNOPSIS
    Shared helper functions for Student Access Management runbooks.

.DESCRIPTION
    Provides reusable functions used across multiple runbooks:
    - Send-NotificationEmail: Send formatted email via Microsoft Graph
    - Write-AuditRecord: Write audit entries to Automation Variable
    - Get-FormattedTimestamp: Consistent timestamp formatting

.NOTES
    Author: Uy Le Phan (Atea AS)
    Version: 1.0
    Usage: Import at the top of runbooks:
      . .\Send-Notification.ps1   (dot-source in Azure Automation)
    Required: Microsoft.Graph.Users.Actions module
#>

function Send-NotificationEmail {
    <#
    .SYNOPSIS
        Sends a formatted notification email via Microsoft Graph.

    .DESCRIPTION
        Uses the Microsoft Graph sendMail API to send HTML-formatted
        notification emails about student access management events.
        Requires an active Microsoft Graph connection and Mail.Send permission.

    .PARAMETER To
        Array of email addresses to send the notification to.

    .PARAMETER Subject
        Email subject line.

    .PARAMETER Body
        HTML body content for the email.

    .PARAMETER Priority
        Email priority: Normal, High, Low. Default: Normal.

    .PARAMETER SendFrom
        The UPN of the user/mailbox to send from. Uses Automation Variable
        'NotificationSender' if not specified.
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string[]]$To,

        [Parameter(Mandatory)]
        [string]$Subject,

        [Parameter(Mandatory)]
        [string]$Body,

        [Parameter()]
        [ValidateSet("Normal", "High", "Low")]
        [string]$Priority = "Normal",

        [Parameter()]
        [string]$SendFrom = ""
    )

    # Resolve sender
    if (-not $SendFrom) {
        $SendFrom = Get-AutomationVariable -Name 'NotificationSender' -ErrorAction SilentlyContinue
    }
    if (-not $SendFrom) {
        Write-Warning "⚠️  No notification sender configured. Set 'NotificationSender' Automation Variable."
        Write-Warning "   Email: $Subject — not sent."
        return $false
    }

    # Resolve recipients
    if ($To.Count -eq 0) {
        $recipientsVar = Get-AutomationVariable -Name 'NotificationRecipients' -ErrorAction SilentlyContinue
        if ($recipientsVar) {
            $To = ($recipientsVar -split '[,;]').Trim() | Where-Object { $_ }
        }
    }
    if ($To.Count -eq 0) {
        Write-Warning "⚠️  No notification recipients configured."
        return $false
    }

    $recipients = $To | ForEach-Object {
        @{ emailAddress = @{ address = $_ } }
    }

    $message = @{
        message = @{
            subject      = $Subject
            body         = @{
                contentType = "HTML"
                content     = $Body
            }
            toRecipients = @($recipients)
            importance   = $Priority
        }
        saveToSentItems = $false
    }

    try {
        $jsonBody = $message | ConvertTo-Json -Depth 10
        Invoke-MgGraphRequest -Method POST -Uri "https://graph.microsoft.com/v1.0/users/$SendFrom/sendMail" -Body $jsonBody -ContentType "application/json"
        Write-Output "📧 Email sent: $Subject → $($To -join ', ')"
        return $true
    }
    catch {
        Write-Warning "⚠️  Failed to send email: $($_.Exception.Message)"
        return $false
    }
}

function New-HtmlReport {
    <#
    .SYNOPSIS
        Generates a formatted HTML email body for notifications.

    .PARAMETER Title
        Report title heading.

    .PARAMETER Summary
        Hashtable of key-value summary stats.

    .PARAMETER DetailRows
        Array of PSCustomObjects to render as a table.

    .PARAMETER Status
        Overall status: Success, Warning, Error. Affects header color.
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Title,

        [Parameter()]
        [hashtable]$Summary = @{},

        [Parameter()]
        [array]$DetailRows = @(),

        [Parameter()]
        [ValidateSet("Success", "Warning", "Error")]
        [string]$Status = "Success"
    )

    $colors = @{
        Success = "#22c55e"
        Warning = "#f59e0b"
        Error   = "#ef4444"
    }
    $headerColor = $colors[$Status]

    $html = @"
<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 20px; background: #f8fafc; }
  .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  .header { background: ${headerColor}; color: white; padding: 24px; }
  .header h1 { margin: 0; font-size: 20px; }
  .header p { margin: 8px 0 0; opacity: 0.9; font-size: 14px; }
  .content { padding: 24px; }
  .summary { margin-bottom: 20px; }
  .summary-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
  .summary-label { color: #64748b; font-size: 14px; }
  .summary-value { font-weight: 600; color: #1e293b; font-size: 14px; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th { background: #f1f5f9; text-align: left; padding: 10px 12px; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
  td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #334155; }
  tr:hover td { background: #f8fafc; }
  .footer { padding: 16px 24px; background: #f1f5f9; font-size: 12px; color: #94a3b8; text-align: center; }
  .badge-success { background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 12px; font-size: 12px; }
  .badge-error { background: #fef2f2; color: #991b1b; padding: 2px 8px; border-radius: 12px; font-size: 12px; }
  .badge-warning { background: #fefce8; color: #854d0e; padding: 2px 8px; border-radius: 12px; font-size: 12px; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>$Title</h1>
    <p>Student Access Management — $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')</p>
  </div>
  <div class="content">
"@

    # Summary section
    if ($Summary.Count -gt 0) {
        $html += '<div class="summary">'
        foreach ($key in $Summary.Keys | Sort-Object) {
            $html += @"
    <div class="summary-row">
      <span class="summary-label">$key</span>
      <span class="summary-value">$($Summary[$key])</span>
    </div>
"@
        }
        $html += '</div>'
    }

    # Detail table
    if ($DetailRows.Count -gt 0) {
        $columns = $DetailRows[0].PSObject.Properties.Name
        $html += '<table><thead><tr>'
        foreach ($col in $columns) {
            $html += "<th>$col</th>"
        }
        $html += '</tr></thead><tbody>'

        foreach ($row in $DetailRows) {
            $html += '<tr>'
            foreach ($col in $columns) {
                $val = $row.$col
                # Color-code status columns
                if ($col -eq 'Status' -or $col -eq 'Action') {
                    if ($val -match 'Enabled|Promoted|Created|Completed|Success') {
                        $val = "<span class='badge-success'>$val</span>"
                    }
                    elseif ($val -match 'Error|Failed|Disabled') {
                        $val = "<span class='badge-error'>$val</span>"
                    }
                    elseif ($val -match 'Warning|Skipped|Graduated') {
                        $val = "<span class='badge-warning'>$val</span>"
                    }
                }
                $html += "<td>$val</td>"
            }
            $html += '</tr>'
        }
        $html += '</tbody></table>'
    }

    $html += @"
  </div>
  <div class="footer">
    Student Time Management for M365 — Automated notification<br/>
    Azure Automation · $(Get-Date -Format 'yyyy-MM-dd HH:mm')
  </div>
</div>
</body>
</html>
"@

    return $html
}

function Write-AuditRecord {
    <#
    .SYNOPSIS
        Appends an audit record to the AuditLog Automation Variable.

    .PARAMETER Action
        The action type (e.g., enable, disable, bulk_promote).

    .PARAMETER PerformedBy
        Who performed the action (e.g., "SYSTEM (Azure Automation)").

    .PARAMETER TargetUser
        Optional user affected.

    .PARAMETER TargetGroup
        Optional group affected.

    .PARAMETER Details
        Optional details string.
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Action,

        [Parameter()]
        [string]$PerformedBy = "SYSTEM (Azure Automation)",

        [Parameter()]
        [string]$TargetUser = "",

        [Parameter()]
        [string]$TargetGroup = "",

        [Parameter()]
        [string]$Details = ""
    )

    try {
        $existingJson = Get-AutomationVariable -Name 'AuditLog' -ErrorAction SilentlyContinue
        if ($existingJson) {
            $existing = $existingJson | ConvertFrom-Json
        }
        else {
            $existing = @()
        }

        $entry = [PSCustomObject]@{
            id          = "audit-$(Get-Date -Format 'yyyyMMddHHmmss')-$(Get-Random -Maximum 9999)"
            action      = $Action
            targetUser  = $TargetUser
            targetGroup = $TargetGroup
            performedBy = $PerformedBy
            timestamp   = (Get-Date).ToUniversalTime().ToString("o")
            details     = $Details
        }

        # Prepend new entry, keep last 500
        $all = @($entry) + @($existing) | Select-Object -First 500
        $json = $all | ConvertTo-Json -Depth 5 -Compress
        Set-AutomationVariable -Name 'AuditLog' -Value $json
    }
    catch {
        Write-Warning "⚠️  Failed to write audit record: $($_.Exception.Message)"
    }
}
