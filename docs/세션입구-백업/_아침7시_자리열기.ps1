# ============================================================
#  _아침7시_자리열기.ps1 — 아침 7시에 유닛 자리를 연다
#
#  🔴🔴 [2026-11-13 · 5번] **이 파일이 없었다.**
#    예약작업 `KLD-아침7시-자리열기` 는 07:00 에 꼬박꼬박 돌았지만
#    가리키는 이 파일이 없어 **결과 -196608 로 실패**하고 있었다.
#    ⇒ 1번 자리가 안 열렸고, 네 사이트 콘텐트가 2026-11-13 하루 «한 편도» 안 나갔다.
#    (저장소에 쌓인 10건이 전부 기계 기록이었다. 앞날은 83건)
#
#  ⛔ 「걸어 뒀다」를 「돌고 있다」로 읽지 않는다. 결과 값을 봐야 안다.
#  ⛔ 사장님 손을 쓰지 않는다 — 아침에 사람이 눌러 주는 구조로 만들지 않는다.
#  ⚠ claude 는 창이 있어야 도는 대화형이다. 숨은 창으로 띄우면 아무 일도 안 한다.
#    그래서 «보이는» 창으로 연다. 이 창이 곧 그 유닛의 자리다.
#
#  쓰는 법
#    powershell -File _아침7시_자리열기.ps1            자리를 연다
#    powershell -File _아침7시_자리열기.ps1 -진단       열지 않고 무엇을 열지만 찍는다
# ============================================================
param([switch]$진단)

$ErrorActionPreference = 'Stop'
$여기 = Split-Path -Parent $MyInvocation.MyCommand.Path
$기록 = Join-Path $여기 '_현재\아침7시-자리열기.log'
$이제 = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'

function 적는다($줄) {
  Write-Output $줄
  try { Add-Content -Path $기록 -Value "$이제`t$줄" -Encoding utf8 } catch { }
}

# -- 열 자리 -------------------------------------------------
#    1번은 모든 사이트 콘텐트를 만든다 — 하루 24편이 여기서 나온다.
#    5번(총괄)은 24시간 도는 자리라 여기서 열지 않는다. 이미 떠 있다.
$열것 = @(
  @{ 번호 = '1'; 이름 = '1번 모든 사이트 콘텐트'; 파일 = '1번_KLifeMap.cmd' }
)

적는다 "■ 아침 7시 자리열기 — 열 자리 $($열것.Count)개"

foreach ($자리 in $열것) {
  $길 = Join-Path $여기 $자리.파일
  if (-not (Test-Path $길)) { 적는다 "🔴 $($자리.이름) — 여는 파일이 없다: $($자리.파일)"; continue }

  # 이미 그 자리가 떠 있나 — 창 제목으로 본다. 두 벌이 뜨면 같은 일을 두 번 한다.
  $떠있나 = $false
  try {
    $떠있나 = [bool](Get-Process -Name 'WindowsTerminal', 'cmd', 'node' -ErrorAction SilentlyContinue |
      Where-Object { $_.MainWindowTitle -like "*$($자리.번호)번*" })
  } catch { }

  if ($떠있나) { 적는다 "⬜ $($자리.이름) — 이미 떠 있다. 그대로 둔다"; continue }
  if ($진단)   { 적는다 "[진단] $($자리.이름) — 열 것: $길"; continue }

  try {
    Start-Process -FilePath $길 -WorkingDirectory $여기
    적는다 "✅ $($자리.이름) — 열었다"
  } catch {
    적는다 "🔴 $($자리.이름) — 못 열었다: $($_.Exception.Message)"
  }
  Start-Sleep -Seconds 3   # 동시에 git 을 건드리지 않게 띄운다
}

적는다 "■ 끝"
exit 0
