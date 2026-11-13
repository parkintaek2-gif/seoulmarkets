#!/usr/bin/env node
/**
 * 잰다-저절로-도는-일이-실패했나.mjs
 *   — **작업 스케줄러에 걸어 둔 우리 일들이 «조용히» 실패하고 있는지 센다.**
 *
 * ── 🔴🔴 왜 (2026-10-22 · 5번) ──────────────────────────────────────
 * 하루 동안 셋을 따로 찾았는데 **뿌리가 하나**였다 —
 * ```
 *   결제 세 징검다리 점검이 이틀 비었다   ← KLifeMap-결제-두시간 이 결과 1 로 실패 중
 *   오늘 색인 요청이 0건이었다            ← SeoulMarkets-IndexRequest 가 결과 3 으로 실패 중
 *   띠별 오늘의 운세가 이틀 묵었다         ← KLifeMap-DailyZodiac 이 결과 1 로 실패 중
 * ```
 * ⇒ 걸어 둔 일이 실패해도 **아무도 모른다.** 사람이 우연히 찾을 때까지 비어 있다.
 *   「걸어 뒀다」를 「돌고 있다」로 읽지 않는다.
 *
 * ⛔ 0 이 아닌 결과를 모두 「고장」으로 적지 않는다 — 「할 것이 없다」로 1 을 내는 자가 있다.
 *   그래서 **결과 값과 마지막 시각을 같이** 적고, 판정은 사람이 한다.
 * ⛔ 마지막 실행이 오래됐으면 결과가 0 이어도 적는다 — 「성공한 채로 멈춘 것」이 더 위험하다.
 *
 * 쓰는 법
 *   node scripts/잰다-저절로-도는-일이-실패했나.mjs
 *   node scripts/잰다-저절로-도는-일이-실패했나.mjs --며칠 3
 *   node scripts/잰다-저절로-도는-일이-실패했나.mjs --자가시험
 */
import { execFileSync } from 'node:child_process';

/**
 * 작업 스케줄러가 돌려주는 「실패가 아닌」 값들.
 * 🔴 [2026-10-22] 이것을 안 가렸더니 «지금 돌고 있는 일»과 «방금 걸어 아직 안 돈 일»을
 *   실패로 적었다. 그러면 사람이 목록을 믿지 않게 되고, 믿지 않는 목록은 없느니만 못하다.
 */
export const 실패아닌것 = new Map([
  [267009, '지금 돌고 있다'],
  [267011, '한 번도 안 돌았다 — 방금 걸었나'],
  [267014, '사람이 멈췄다'],
]);

/** 0 이 아니면 실패로 본다. ⚠ 「할 것이 없다」로 1 을 내는 자가 있어 판정은 사람이 한다 */
export function 실패인가(결과) {
  const n = Number(결과);
  if (!Number.isFinite(n) || n === 0) return false;
  return !실패아닌것.has(n);
}

/** 마지막 실행이 너무 오래됐나 — 성공한 채로 «멈춘» 것이 더 위험하다 */
export function 멈췄나(마지막, 이제 = new Date(), 며칠 = 2) {
  if (!마지막) return true;
  const t = new Date(마지막);
  if (Number.isNaN(t.getTime())) return true;
  if (t.getFullYear() < 2000) return true;           /* 「한 번도 안 돎」 자리표 */
  return (이제 - t) > 며칠 * 24 * 60 * 60 * 1000;
}

/**
 * 우리가 건 일인가 — 윈도 제 것까지 세면 읽을 수가 없다
 *
 * 🔴🔴 [2026-11-13 · 5번] **이 그물이 「KLD-아침7시-자리열기」를 안 세고 있었다.**
 *   그 일은 11-13 07:00 에 돌아 **결과 -196608 로 실패**했다(가리키던 .ps1 이 없다).
 *   그래서 유닛 자리가 안 열렸고, 네 사이트 콘텐트가 **그날 한 편도 안 나갔다.**
 *   이 자는 33개를 세고 「6개 실패」라고 또렷이 적고 있었는데, 정작 그날을 망친 그 일만
 *   이름이 `KLD-` 로 시작해 **그물 밖에 있었다.**
 *   ⛔ 재는 쪽이 제 범위를 스스로 정하면 **못 본 것이 없는 것이 된다.**
 *   ⇒ 우리가 쓰는 이름표를 다 넣는다. 새 이름표를 만들면 여기도 같이 넣는다.
 */
export function 우리일인가(이름) {
  return /KLifeDesign|KLifeMap|klifemap|SeoulMarkets|KLD-|정기업무|보고재료|업무보고|자리열기|백년지도|100yearmap|케이컬처|kculturewire/i
    .test(String(이름 ?? ''));
}

if (process.argv.includes('--자가시험')) {
  let 통 = 0; const 탈 = [];
  const 본다 = (이름, 참) => { if (참) 통 += 1; else { 탈.push(이름); console.log('🔴 ' + 이름); } };

  본다('0 은 성공', 실패인가(0) === false);
  본다('0 이 아니면 실패로 본다', 실패인가(1) && 실패인가(3) && 실패인가(9009));
  /* 🔴 [2026-10-22] 이것을 안 가려 「지금 돌고 있는 일」과 「방금 건 일」을 실패로 적었다 */
  본다('🔴 지금 돌고 있는 것(267009)은 실패가 아니다', 실패인가(267009) === false);
  본다('🔴 한 번도 안 돈 것(267011)도 실패가 아니다', 실패인가(267011) === false);
  본다('🔴 사람이 멈춘 것(267014)도', 실패인가(267014) === false);
  본다('⛔ 대조군 — 비슷한 수라고 봐주지 않는다', 실패인가(267010) === true);
  본다('⛔ 수가 아니면 실패로 안 본다 — 못 읽은 것과 실패는 다르다',
    실패인가(null) === false && 실패인가('') === false && 실패인가('abc') === false);

  const 이제 = new Date('2026-10-22T13:00:00+09:00');
  본다('🔴 이틀 넘게 안 돌았으면 멈춘 것이다',
    멈췄나('2026-10-19T00:20:00+09:00', 이제) === true);
  본다('⛔ 오늘 돌았으면 안 멈췄다', 멈췄나('2026-10-22T00:20:00+09:00', 이제) === false);
  본다('🔴 1999 년 자리표는 «한 번도 안 돎»이다', 멈췄나('1999-11-30T00:00:00', 이제) === true);
  본다('🔴 비어 있으면 멈춘 것으로 본다 — 모르는 것을 「괜찮다」로 읽지 않는다',
    멈췄나(null, 이제) === true && 멈췄나('', 이제) === true);
  본다('⛔ 날짜가 아니면 멈춘 것으로 본다', 멈췄나('어제', 이제) === true);
  /* 🔴 [2026-10-22] .NET JSON 날짜(`/Date(…)/`)를 못 읽어 26개 중 16개를 거짓으로
     「멈췄다」고 적었다. 이제는 PowerShell 쪽에서 ISO 로 바꿔 넘긴다.
     ⛔ 그래도 혹시 그 꼴이 오면 «멈춘 것»으로 본다 — 못 읽은 것을 「괜찮다」로 읽지 않는다. */
  본다('🔴 .NET 날짜 꼴이 오면 못 읽은 것으로 본다', 멈췄나('/Date(1792598401000)/', 이제) === true);
  본다('🔴 ISO 꼴은 제대로 읽는다',
    멈췄나('2026-10-22T00:20:00+09:00', 이제) === false
    && 멈췄나('2026-10-18T00:20:00+09:00', 이제) === true);
  본다('며칠을 바꿀 수 있다',
    멈췄나('2026-10-20T00:00:00+09:00', 이제, 5) === false
    && 멈췄나('2026-10-20T00:00:00+09:00', 이제, 1) === true);

  본다('우리 일을 가린다',
    우리일인가('KLifeMap-DailyZodiac') && 우리일인가('SeoulMarkets-IndexRequest')
    && 우리일인가('KLifeDesign-비상벨'));
  본다('⛔ 윈도 제 것은 안 센다',
    우리일인가('IndexerAutomaticMaintenance') === false
    && 우리일인가('OneDrive Reporting Task') === false);
  본다('⛔ 빈 것에 안 터진다', 우리일인가(null) === false);

  console.log(탈.length ? `\n🔴 자가시험 ${탈.length}건 탈` : `\n✅ 자가시험 ${통} 통과`);
  process.exit(탈.length ? 1 : 0);
}

/* ── 실제로 재기 ─────────────────────────────────────────────────── */
const 며칠 = Number(process.argv[process.argv.indexOf('--며칠') + 1] || 2) || 2;
/* 🔴 [2026-10-22] 처음에는 날짜를 그대로 내보냈더니 `/Date(1792598401000)/` 꼴이 와서
   `new Date()` 가 못 읽었고, **스물여섯 중 열여섯을 「멈췄다」로 거짓 보고**했다.
   ⛔ 그리고 한글 이름이 깨져 나왔다 — 콘솔 인코딩을 UTF-8 로 세운다.
   ⇒ 날짜는 PowerShell 쪽에서 ISO 글로 바꿔 넘긴다. 받는 쪽이 짐작하지 않게 한다. */
const 명령 = '[Console]::OutputEncoding=[Text.Encoding]::UTF8; '
  + '$ISO = { param($d) if ($null -eq $d) { $null } else { $d.ToString("yyyy-MM-ddTHH:mm:ssK") } }; '
  + 'Get-ScheduledTask | ForEach-Object { $t=$_; try { $i=Get-ScheduledTaskInfo -TaskName $t.TaskName -TaskPath $t.TaskPath -ErrorAction Stop } catch { return }; '
  + '[pscustomobject]@{ n=$t.TaskName; s=$t.State.ToString(); last=(& $ISO $i.LastRunTime); code=$i.LastTaskResult; next=(& $ISO $i.NextRunTime) } } '
  + '| ConvertTo-Json -Compress';

let 목록;
try {
  const 글 = execFileSync('powershell.exe', ['-NoProfile', '-Command', 명령],
    { encoding: 'utf8', timeout: 120000, maxBuffer: 20 * 1024 * 1024 });
  목록 = JSON.parse(글);
} catch (e) { console.error(`🔴 작업 목록을 못 읽었다 — ${String(e.message).slice(0, 120)}`); process.exit(1); }

const 우리것 = (Array.isArray(목록) ? 목록 : [목록]).filter((x) => x && 우리일인가(x.n));
const 이제 = new Date();
const 꺼짐 = 우리것.filter((x) => x.s === 'Disabled');
const 도는것 = 우리것.filter((x) => x.s !== 'Disabled');
const 실패 = 도는것.filter((x) => 실패인가(x.code));
/* 🔴 [2026-11-13] 방금 건 일(267011 = 한 번도 안 돌았다)을 「멈췄다」로 적지 않는다 —
   오늘 건 알림 둘이 바로 노란불로 떴다. 걸자마자 거짓 경보가 나면 목록을 안 믿게 된다. */
const 멈춤 = 도는것.filter((x) => !실패인가(x.code) && Number(x.code) !== 267011
  && 멈췄나(x.last, 이제, 며칠));

console.log(`\n■ 저절로 도는 우리 일 ${우리것.length}개 (꺼 둔 것 ${꺼짐.length}개는 따로 센다)\n`);

const 적는다 = (제목, 줄들) => {
  if (!줄들.length) return;
  console.log(제목);
  for (const x of 줄들.sort((a, b) => String(a.n).localeCompare(String(b.n)))) {
    const 때 = x.last ? String(x.last).replace('T', ' ').slice(0, 16) : '(없음)';
    console.log(`   ${String(x.n).padEnd(36)} 결과 ${String(x.code).padEnd(6)} 마지막 ${때}`);
  }
  console.log('');
};

적는다(`🔴 결과가 0 이 아니다 — ${실패.length}개`, 실패);
적는다(`🟡 ${며칠}일 넘게 안 돌았다 — ${멈춤.length}개`, 멈춤);

if (!실패.length && !멈춤.length) console.log('✅ 걸어 둔 일이 모두 제대로 돌고 있다\n');

console.log('⛔ 0 이 아닌 결과를 모두 「고장」으로 읽지 않는다 — 「할 것이 없다」로 1 을 내는 자가 있다.');
console.log('⛔ 그래도 «보이게» 둔다. 2026-10-22 에 셋이 조용히 실패해 결제 점검·색인 요청·');
console.log('   띠별 운세가 이틀씩 비어 있었다. 「걸어 뒀다」를 「돌고 있다」로 읽지 않는다.');
process.exitCode = 실패.length || 멈춤.length ? 1 : 0;
