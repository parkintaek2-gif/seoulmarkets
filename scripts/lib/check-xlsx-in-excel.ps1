# check-xlsx-in-excel.ps1 -- open a generated .xlsx in real Excel and report.
#
# WHY
#   Our own re-read check is written by us, so it can share our mistakes.
#   On 2026-11-24 the owner pointed out that MS Office was installed -- it was.
#   The first attempt stalled at Workbooks.Open because the path contained Korean:
#   Excel COM will not take a Korean path. So we copy to an ASCII temp path first.
#
#   The window is never shown (Visible = false) -- it must not appear on the
#   owner's screen. DisplayAlerts is off, but a corrupt file still throws on Open,
#   which is how we tell a broken file from a sound one.
#
#   ASCII ONLY, including variable names: Windows PowerShell 5.1 reads a UTF-8 .ps1
#   as ANSI and Korean identifiers come out as mojibake, which is a parse error.
#
# Usage:  powershell -ExecutionPolicy Bypass -File scripts/lib/check-xlsx-in-excel.ps1 -Path "<file>"
# Exit:   0 = opens cleanly / 1 = will not open, or has formula errors
param([Parameter(Mandatory=$true)][string]$Path)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $Path)) {
  Write-Output "FAIL no such file -- $Path"
  exit 1
}

# Copy to an ASCII temp path: Excel COM cannot take a Korean path.
$tmp = Join-Path $env:TEMP ("xlsxcheck_" + [guid]::NewGuid().ToString("N").Substring(0,8) + ".xlsx")
Copy-Item -LiteralPath $Path -Destination $tmp -Force

$xl = $null
$code = 1
try {
  $xl = New-Object -ComObject Excel.Application
  $xl.Visible = $false
  $xl.DisplayAlerts = $false
  $wb = $xl.Workbooks.Open($tmp)
  $xl.Calculate()
  $count = $wb.Worksheets.Count
  $names = @()
  $formulas = 0
  $errs = 0
  $where = @()
  foreach ($i in 1..$count) {
    $ws = $wb.Worksheets.Item($i)
    $names += $ws.Name
    $used = $ws.UsedRange
    try {
      $fcells = $used.SpecialCells(-4123)        # xlCellTypeFormulas
      if ($fcells) { $formulas += $fcells.Count }
    } catch { }
    try {
      $ecells = $used.SpecialCells(-4123, 16)    # formulas returning errors
      if ($ecells) {
        $errs += $ecells.Count
        foreach ($c in $ecells) {
          if ($where.Count -lt 10) { $where += ($ws.Name + "!" + $c.Address(0,0) + "=" + $c.Text) }
        }
      }
    } catch { }
  }
  Write-Output ("SHEETS " + $count + " -- " + ($names -join " | "))
  Write-Output ("FORMULAS " + $formulas)
  if ($errs -gt 0) {
    Write-Output ("ERRORS " + $errs + " -- " + ($where -join " , "))
    Write-Output "FAIL formula errors present"
  } else {
    Write-Output "ERRORS 0"
    Write-Output "OK Excel opened it and no formula returns an error"
    $code = 0
  }
  $wb.Close($false)
} catch {
  Write-Output ("FAIL Excel could not open it -- " + $_.Exception.Message)
  $code = 1
} finally {
  if ($xl) {
    try { $xl.Quit() } catch { }
    try { [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($xl) } catch { }
  }
  try { Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue } catch { }
}
exit $code
