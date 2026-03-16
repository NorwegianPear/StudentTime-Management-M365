<#
.SYNOPSIS
    Computes Norwegian public holidays for one or more years.

.DESCRIPTION
    Uses the Anonymous Gregorian algorithm to calculate Easter Sunday, then
    derives all Easter-dependent Norwegian public holidays. Fixed holidays
    (1 Jan, 1 May, 17 May, 25 Dec, 26 Dec) are added automatically.

    Output is an array of objects suitable for serialising into the
    HolidayCalendar Automation Variable, or for piping to Out-GridView / Export-Csv.

    The function is year-agnostic — call it with any future year and it will
    compute the correct fluctuating holidays automatically.

.PARAMETER Year
    One or more years to compute. Defaults to current + next 4 years.

.PARAMETER AsJson
    Switch — output as a compact flat JSON array of { date, name, nameEn } objects
    instead of PowerShell objects. Use this when preparing the Automation Variable value.

.EXAMPLE
    # Get 2026 holidays as PowerShell objects
    .\Get-NorwegianHolidays.ps1 -Year 2026

.EXAMPLE
    # Get 2026-2030 as flat JSON (ready for Automation Variable)
    .\Get-NorwegianHolidays.ps1 -Year 2026,2027,2028,2029,2030 -AsJson

.EXAMPLE
    # Get current + next 4 years and display in a grid
    .\Get-NorwegianHolidays.ps1 | Out-GridView

.NOTES
    Author : Uy Le Phan (Atea AS)
    Version: 1.0
    Reference: https://en.wikipedia.org/wiki/Date_of_Easter#Anonymous_Gregorian_algorithm
#>

[CmdletBinding()]
param(
    [int[]]$Year = @( (Get-Date).Year .. ((Get-Date).Year + 4) ),
    [switch]$AsJson
)

# ─── Easter calculation (Anonymous Gregorian algorithm) ───────────────────────
function Get-EasterDate {
    param([int]$Y)

    $a = $Y % 19
    $b = [Math]::Floor($Y / 100)
    $c = $Y % 100
    $d = [Math]::Floor($b / 4)
    $e = $b % 4
    $f = [Math]::Floor(($b + 8) / 25)
    $g = [Math]::Floor(($b - $f + 1) / 3)
    $h = (19 * $a + $b - $d - $g + 15) % 30
    $i = [Math]::Floor($c / 4)
    $k = $c % 4
    $l = (32 + 2 * $e + 2 * $i - $h - $k) % 7
    $m = [Math]::Floor((11 * $h + 22 * $l + 114) / 451)

    $month = [Math]::Floor(($h + $l - 7 * $m + 114) / 31)
    $day   = (($h + $l - 7 * $m + 114) % 31) + 1

    return [datetime]::new($Y, $month, $day)
}

# ─── Build holiday list for each year ─────────────────────────────────────────
$allHolidays = foreach ($Y in $Year) {

    $easter = Get-EasterDate -Y $Y

    $movable = @(
        @{ Offset = -3; Name = "Skjærtorsdag";          NameEn = "Maundy Thursday"  }
        @{ Offset = -2; Name = "Langfredag";             NameEn = "Good Friday"      }
        @{ Offset =  0; Name = "1. påskedag";            NameEn = "Easter Sunday"    }
        @{ Offset =  1; Name = "2. påskedag";            NameEn = "Easter Monday"    }
        @{ Offset = 39; Name = "Kristi Himmelfartsdag";  NameEn = "Ascension Day"    }
        @{ Offset = 49; Name = "1. pinsedag";            NameEn = "Whit Sunday"      }
        @{ Offset = 50; Name = "2. pinsedag";            NameEn = "Whit Monday"      }
    )

    $fixed = @(
        @{ Date = [datetime]::new($Y,  1,  1); Name = "Nyttårsdag";     NameEn = "New Year's Day"   }
        @{ Date = [datetime]::new($Y,  5,  1); Name = "Arbeidernes dag"; NameEn = "Labour Day"       }
        @{ Date = [datetime]::new($Y,  5, 17); Name = "Grunnlovsdag";   NameEn = "Constitution Day" }
        @{ Date = [datetime]::new($Y, 12, 25); Name = "1. juledag";     NameEn = "Christmas Day"    }
        @{ Date = [datetime]::new($Y, 12, 26); Name = "2. juledag";     NameEn = "Boxing Day"       }
    )

    # Combine and deduplicate (e.g. 2. pinsedag can fall on 17 May)
    $seen = [System.Collections.Generic.HashSet[string]]::new()
    $list = [System.Collections.Generic.List[PSObject]]::new()

    foreach ($h in $fixed) {
        $key = $h.Date.ToString("yyyy-MM-dd")
        if ($seen.Add($key)) {
            # Check if a movable holiday lands on same date
            $clash = $movable | Where-Object { $easter.AddDays($_.Offset).ToString("yyyy-MM-dd") -eq $key }
            $displayName = if ($clash) { "$($h.Name) / $($clash.Name)" } else { $h.Name }
            $displayEn   = if ($clash) { "$($h.NameEn) / $($clash.NameEn)" } else { $h.NameEn }
            $list.Add([PSCustomObject]@{
                Date   = $key
                Year   = $Y
                Name   = $displayName
                NameEn = $displayEn
                Type   = "public"
            })
        }
    }

    foreach ($m in $movable) {
        $d   = $easter.AddDays($m.Offset)
        $key = $d.ToString("yyyy-MM-dd")
        if ($seen.Add($key)) {
            $list.Add([PSCustomObject]@{
                Date   = $key
                Year   = $Y
                Name   = $m.Name
                NameEn = $m.NameEn
                Type   = "public"
            })
        }
    }

    $list | Sort-Object Date
}

# ─── Output ────────────────────────────────────────────────────────────────────
if ($AsJson) {
    # Flat array — ready to drop into HolidayCalendar Automation Variable
    $allHolidays | Select-Object Date, Name, NameEn, Type | ConvertTo-Json -Compress
} else {
    $allHolidays
}
