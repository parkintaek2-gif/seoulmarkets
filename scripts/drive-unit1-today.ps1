# ============================================================
#  drive-unit1-today.ps1 - keep unit 1 working through the day
#
#  WHY (2026-11-14, seat 5)
#    On 2026-11-13 the four sites published ZERO content. Two causes:
#      1. the 07:00 seat-opening task pointed at a .ps1 that no longer existed
#      2. even with the seat open, NOBODY TOLD UNIT 1 WHAT TO DO.
#    A unit session sits waiting for input. "Open" is not "working".
#
#    A single headless call (claude --resume ... -p "...") answers ONE turn and
#    exits. On the morning of 11-14 unit 1 wrote exactly one article that way and
#    stopped. So one nudge is not enough either - something has to keep nudging.
#
#  WHAT THIS DOES
#    Calls unit 1's own session over and over with the same follow-up order
#    (docs/지시/1번-이어서-내리는-말.txt) until it answers "오늘 몫 끝",
#    the round limit runs out, or unit 1's working day ends at 21:00.
#
#  ASCII ONLY in this file. The Korean order lives in the .txt (UTF-8), which is
#  read with -Encoding UTF8 - a .ps1 without a BOM is read as ANSI and mangled.
#
#  USAGE
#    powershell -File scripts\drive-unit1-today.ps1
#    powershell -File scripts\drive-unit1-today.ps1 -Rounds 4
#    powershell -File scripts\drive-unit1-today.ps1 -DryRun
# ============================================================
param(
  [int]$Rounds = 12,
  [int]$EndHour = 21,
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

$Repo    = 'C:\Users\User\Documents\GitHub\dataeconomics'
$SeatDir = 'C:\Users\User\OneDrive\Desktop\00_세션입구\_현재'
$IdFile  = Join-Path $SeatDir '1.id'
$LogFile = Join-Path $SeatDir 'unit1-drive.log'
$OrderFile = Join-Path $Repo 'docs\지시\1번-이어서-내리는-말.txt'

function Write-Line($text) {
  $stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
  Write-Output "$stamp  $text"
  try { Add-Content -Path $LogFile -Value "$stamp`t$text" -Encoding utf8 } catch { }
}

# -- the session id unit 1 wrote for itself is the only source of truth --
if (-not (Test-Path $IdFile)) {
  Write-Line "RED no session id for unit 1 - is the seat open? ($IdFile)"
  exit 1
}
$SessionId = (Get-Content -Path $IdFile -Raw).Trim()
if ($SessionId.Length -lt 30) {
  Write-Line "RED session id looks wrong: [$SessionId]"
  exit 1
}

if (-not (Test-Path $OrderFile)) {
  Write-Line "RED the follow-up order file is missing: $OrderFile"
  exit 1
}
$Order = Get-Content -Path $OrderFile -Raw -Encoding UTF8

Write-Line "=== driving unit 1 - session $SessionId - up to $Rounds rounds, until ${EndHour}:00"

if ($DryRun) {
  Write-Line "[dry run] would call: claude --resume $SessionId -p <order, $($Order.Length) chars>"
  exit 0
}

$env:CLAUDE_CONFIG_DIR = 'C:\Users\USER\.claude-u1'
$env:CLAUDE_SEAT = '1'
Set-Location 'C:\Users\User\OneDrive\Desktop'

for ($i = 1; $i -le $Rounds; $i++) {
  if ((Get-Date).Hour -ge $EndHour) {
    Write-Line "stopping - unit 1's working day ends at ${EndHour}:00"
    break
  }

  Write-Line "--- round $i of $Rounds"
  $reply = ''
  try {
    # RED [2026-11-14] The first version of this loop failed all 12 rounds without
    # ever reaching unit 1. Cause: $ErrorActionPreference = 'Stop' at the top plus
    # `2>&1` on a native .exe. Windows PowerShell 5.1 wraps every stderr line from a
    # native command in an ErrorRecord (NativeCommandError) - and claude.exe writes a
    # harmless sign-in warning to stderr on EVERY run. Under 'Stop' that warning is a
    # terminating error, so each round went straight to catch. The log said "RED round
    # N threw: Warning: this sign-in can end..." twelve times and nobody was driven.
    #
    # DO NOT set this back to Stop around a native command, and do not read a stderr
    # line as failure - check the exit code instead.
    $ErrorActionPreference = 'Continue'
    $reply = & claude --resume $SessionId -p $Order --permission-mode acceptEdits 2>&1 | Out-String
    $code = $LASTEXITCODE
    if ($code -ne 0) { Write-Line "RED round $i exited with $code" }
  } catch {
    Write-Line "RED round $i threw: $($_.Exception.Message)"
    Start-Sleep -Seconds 60
    continue
  } finally {
    $ErrorActionPreference = 'Stop'
  }

  $tail = ($reply -split "`n" | Where-Object { $_.Trim() -ne '' } | Select-Object -Last 3) -join ' | '
  Write-Line "round ${i} reply: $tail"

  if ($reply -match '오늘 몫 끝') {
    Write-Line "unit 1 says today's quota is done - stopping"
    break
  }

  # a short breath so two rounds never touch git at the same instant
  Start-Sleep -Seconds 20
}

Write-Line '=== done driving'
exit 0
