#!/usr/bin/env node
/**
 * 정기업무-예약.mjs — 손으로 치던 정기 업무를 «윈도 작업 스케줄러»에 맡긴다
 * ─────────────────────────────────────────────────────────────────────────────
 * 사장님 지시(2026-09-20): 「**손으로 치는 나머지 정기업무도 다 자동화해**」
 *
 * ⭐ 앞선 두 건에서 배운 선을 그대로 지킨다 —
 *   **기계가 할 몫만 기계에 준다. 판단하는 몫은 세션에 남긴다.**
 *   잰 것(수)을 내는 일은 기계가 하고, 그 수를 읽고 무엇을 할지 정하는 일은 사람이 한다.
 *
 * [왜 CronCreate 가 아닌가] 그 예약은 «세션 메모리»에만 있다 — 세션이 바뀌면 사라지고,
 *   7일 뒤 만료되며, 세션이 바쁘면 그 시각에 안 뜬다. 2026-09-20 에 결제 점검이
 *   토스 4시각·페이팔 7시각 빠진 것이 바로 그래서였다. 작업 스케줄러는 PC 가 켜져
 *   있으면 세션과 무관하게 돈다.
 *
 * [⛔ 자동으로 «보내지» 않는다] 사장님께 가는 메일은 사람이 내용을 보고 보낸다.
 *   기계는 «재료»까지만 만든다. 내용을 안 본 보고가 저절로 나가는 것이 제일 나쁘다.
 *
 * 쓰는 법
 *   node scripts/정기업무-예약.mjs              무엇이 걸렸고 무엇이 빠졌나 잰다
 *   node scripts/정기업무-예약.mjs --설치        빠진 것을 건다 (있는 것은 새로 덮는다)
 *   node scripts/정기업무-예약.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const 여기 = path.dirname(fileURLToPath(import.meta.url));
const 뿌리 = path.join(여기, '..');
export const 로그길 = path.join(뿌리, '.정기업무.log');

/**
 * 일과표 — **여기가 정본이다.** 문서에 적어 두고 사람이 맞추게 하지 않는다.
 *   갈래 '기계' : 예약이 돌린다
 *   갈래 '세션' : 예약을 «일부러» 안 건다. 까닭을 함께 적는다 — 빠뜨린 것과 구별되게
 */
export const 일과 = [
  /* ── 매시 ─────────────────────────────────────────────────────────── */
  { 이름: '결제점검-둘다', 갈래: '기계', 주기: '매시', 분: 5,
    명령: ['scripts/check-결제-둘다.mjs'],
    까닭: '손님이 살 수 있나 — 토스·페이팔. 매출이 두 판 잇따라 0 일 때만 알린다' },
  { 이름: '소통-매시-모으기', 갈래: '기계', 주기: '매시', 분: 12,
    명령: ['scripts/소통-매시-자동.mjs'],
    까닭: '두 채널의 새 글을 모아 차린다. 읽고 도장 찍는 것은 세션 몫' },
  { 이름: 'klifemap-건강', 갈래: '기계', 주기: '매시', 분: 25,
    명령: ['scripts/check-klifemap-health.mjs'],
    까닭: '매출이 나는 서비스다. degraded 를 늦게 알면 그만큼 손님을 잃는다' },

  /* ── 아카이빙 — 🔴 소급이 안 되는 것들. 오늘 안 받으면 그날치는 영영 없다 ──
     ⚠ [2026-09-20] 여기에 「아카이빙-신문제목」을 넣으려다 뺐다.
       **이미 걸려 있었다** — `KLifeDesign-신문제목수집-0530`. 앞선 세션이 걸어 둔 것이다.
       같은 일을 두 번 걸면 같은 자료를 두 번 받아 출처에 부담을 주고, 어느 쪽이 도는지도
       모르게 된다. ⇒ 걸기 전에 «이미 걸린 것»을 이름이 아니라 «부르는 자»로 맞춰 본다
       (아래 남이건것·겹치는것). 같은 까닭으로 KRX시세·지수·채권·증권사·커뮤니티·백업도 안 넣는다. */
  { 이름: '아카이빙-일반상품', 갈래: '기계', 주기: '매일', 시: 19, 분: 30,
    명령: ['scripts/collect-commodities.mjs'], 까닭: '거래일+1. 한 번도 안 돌려 49거래일을 잃을 뻔했다' },
  /* 🔴 [2026-09-20] 「아카이빙-ADX시총」을 걸었다가 **바로 뺐다.**
       CLAUDE.md 아카이빙 목록에 「매일 한 번 ADX 시가총액·시세」가 적혀 있어서 걸었는데,
       정작 그 자는 **일부러 멈춰 세운 자**였다 — ADX 이용약관이 «systematic retrieval …
       to compile a database» 를 금지해서 앞선 판단으로 세워 둔 것이다.
       예약이 돌아도 자는 「멈춰 세운 수집기다」만 찍고 끝난다(그래서 끝값 0 이었다).
       ⛔ 앞선 세션이 «세워 둔» 것을 목록만 보고 되살리지 않는다. 세운 데는 까닭이 있다.
       ⛔ 그리고 끝값 0 을 「자료가 들어왔다」로 세지 않는다 — 이 건이 바로 그 함정이었다.
       ⇒ 열린 출처를 찾는 일은 따로 한다. 그 전에는 예약에 걸지 않는다. */
  { 이름: '아카이빙-일본국채', 갈래: '기계', 주기: '매일', 시: 20, 분: 20,
    명령: ['scripts/collect-jgb-yields.mjs'], 까닭: '소급 불가' },
  /* 🔴🔴 [2026-11-11 · 5번] **소급이 안 되는 것이 하나 더 있었다 — 그날 아침 날씨다.**
       11/12자 날씨를 데스킹하며 「전날인 11일 아침 최저기온」을 넣으려는데 다시 잴 길이
       없었다. 동네예보 RSS 의 day0 은 시간이 갈수록 앞쪽 시각이 떨어져 나가, 오전 10시에
       받으면 10시부터 시작한다. 날씨누리 「오늘의 최저기온」 칸은 11시 발표 뒤에도
       가로줄(-)이었다. ⇒ **그날 아침에 받아 두지 않으면 그날치는 영영 없다.**
       ⛔ 사람에게 「원고에 받은 시각을 같이 적어 달라」고 부탁해서 풀지 않는다 —
         기억해서 지키는 구조는 반드시 한 번은 빠진다. 기계가 매일 02:40 에 적어 둔다.
       ⚠ 02시 발표 «뒤»에 둔다. 그리고 자는 새벽 시각이 이미 빠진 자료면 «적지 않는다» —
         남은 시각으로 낸 수를 아침 최저로 적어 두면 내일 데스크가 그것을 믿는다. */
  { 이름: '날씨-그날아침수치', 갈래: '기계', 주기: '매일', 시: 2, 분: 40,
    명령: ['scripts/적어둔다-그날수치.mjs'],
    까닭: '소급 불가. 전날 비교를 쓰려면 그날 아침에 받아 둔 것밖에 없다' },
  /* 🔴 [2026-09-20] 날마다 도는 수집기는 «어제 하루»만 받는다. 어제치가 그날 안 와 있으면
       그 날짜는 영영 다시 안 묻는다 — 출처가 이틀 뒤에 내놓아도 우리는 모른다.
       ⇒ 지난 이레를 통째로 다시 묻는 자를 둔다. 이미 있는 날은 수집기가 스스로 건너뛴다. */
  { 이름: '아카이빙-되받기', 갈래: '기계', 주기: '매일', 시: 21, 분: 10,
    명령: ['scripts/아카이빙-되받기.mjs'], 까닭: '출처가 늦게 낸 날을 주워 온다. 빠짐검사(21:40) 보다 먼저 돈다' },
  /* 🔴🔴 [2026-10-11 15:3x · 5번] **F4 지수 테이프가 23일 멎어 있었다.**
   *   `check-f7-data-quality` 가 「가장 최근이 2026-09-17 — 23일 지남(참는 선 10)」으로 울었다.
   *   ⭐ 곳간(`archive/raw/indices`)은 2026-10-07 까지 멀쩡했다 — **받는 것은 되는데
   *     그것으로 «상품 테이프»를 짓는 자를 아무도 안 불렀다.**
   *   ⚠ 자가시험만 `run-all-checks` 에 물려 있었다. 자가시험이 도는 것과
   *     본 실행이 도는 것은 «다른 일»이다 — 그 틈으로 23일이 갔다.
   *   ⛔ 받는 것(collect-indices)은 2번 몫이라 여기 안 건다. 짓는 것만 내 몫이다.
   *   ⚠ 되받기(21:10) «뒤»에 둔다 — 늦게 온 날을 주워 온 다음에 지어야 그 날이 들어간다. */
  { 이름: 'F4 지수테이프 짓기', 갈래: '기계', 주기: '매일', 시: 21, 분: 25,
    명령: ['scripts/build-korea-index-tape.mjs', '--적는다'],
    까닭: '곳간은 2번이 채우고 상품 테이프는 우리가 짓는다. 안 지으면 /data/indices 가 조용히 낡는다 — 23일을 그렇게 잃었다' },
  { 이름: '아카이빙-빠짐검사', 갈래: '기계', 주기: '매일', 시: 21, 분: 40,
    명령: ['scripts/check-archive-freshness.mjs'], 까닭: '빠뜨린 날을 그날 안에 잡는다' },

  /* ── 살림 ─────────────────────────────────────────────────────────── */
  { 이름: '도메인-여섯', 갈래: '기계', 주기: '매일', 시: 8, 분: 40,
    명령: ['scripts/check-domains.mjs'], 까닭: 'www 하나가 조용히 404 였던 적이 있다' },
  { 이름: '검사묶음', 갈래: '기계', 주기: '매일', 시: 6, 분: 40,
    명령: ['scripts/check-all-selftests.mjs'], 까닭: '자가시험이 깨진 채로 하루가 가지 않게' },

  /* ── 보고의 «재료» — 보내는 것은 사람이 한다 ──────────────────────── */
  { 이름: '보고재료-16시', 갈래: '기계', 주기: '매일', 시: 15, 분: 30,
    명령: ['scripts/collect-1600-report.mjs'], 까닭: '두 채널에서 유닛 보고를 모아 둔다' },
  /* 🔴 [2026-09-29 · 사장님] 「23시 업무보고를 22시로 조정할 것」 — 보고가 22시로 왔으므로
     재료 만들기도 한 시간 당긴다. 재료가 보고보다 늦게 만들어지면 보고가 빈손으로 나간다. */
  { 이름: '보고재료-22시', 갈래: '기계', 주기: '매일', 시: 21, 분: 50,
    명령: ['scripts/report-unit-content-check.mjs'], 까닭: '공격형·SEO/GEO 점검 재료. ⛔ --보낸다 를 안 준다' },
  { 이름: '방문자-재료', 갈래: '기계', 주기: '매일', 시: 20, 분: 0,
    명령: ['scripts/broadcast-visitors-dwell.mjs', '--잰다'], 까닭: '방문자·체류를 재 둔다' },

  /* ── 🔴 일부러 안 거는 것 — 사람이 판단해야 하는 몫 ────────────────── */
  { 이름: '16시 업무보고 «발송»', 갈래: '세션',
    까닭: '내용을 읽고 네 칸(한 것·못한 것·공격형·외부반응)을 채우는 일이다. 안 읽은 보고가 저절로 나가면 그것이 제일 나쁘다' },
  { 이름: '22시 전 유닛 점검 «보고»', 갈래: '세션',
    까닭: '재료는 21:50 에 기계가 만든다. 읽고 판단해 보내는 것은 세션이 한다' },
  { 이름: '소통 «읽음 도장»', 갈래: '세션',
    까닭: '사장님 전제가 「소통 내용까지 다 확인」이다. 도장을 기계가 찍으면 대장이 거짓말을 한다' },
  { 이름: '콘텐트 생산·감수', 갈래: '세션',
    까닭: '만드는 일이다. 자로 셀 수는 있어도 대신 쓸 수는 없다' },
  /* 🔴🔴 [2026-10-11 15:2x · 5번] **이 줄이 여기 «없어서» 뉴스판독이 26일 멎었다.**
   *   `scripts/invest-ai/판독지침.md` 첫 줄이 「크론이 세션을 깨우면 이 절차를 따른다」인데
   *   그 크론이 **아예 안 걸려 있었다.** 지침만 있고 깨우는 자가 없었다.
   *   ⇒ `check-invest-ai-claims` 가 「마지막 뉴스 신호 20260915(26일 전)」로 빨강이었다.
   *   ⚠ 그 말은 **중기부 공고(제2026-511호)에 우리가 적어 낸 말**이다 —
   *     「무인 뉴스판독 장치(신호 저장소+일일 판독)」. 일일 판독이 멎으면 그 말이 사실이 아니게 된다.
   *     ⭐ 다만 같은 문서가 「현재는 **세션 판독**이라 처리량 한계」라고 솔직히 적어 두었다.
   *       거짓을 적은 것이 아니라 **우리가 일을 안 한 것**이다. 고칠 것은 문서가 아니라 일이다.
   *   ⛔ 기계로 걸지 «않는다» — 판독 주체가 세션이다. 읽지 않고 쌓는 신호는 짐작이고,
   *     그것은 「근거 없는 신호 안 쌓는다」는 지침을 정면으로 어긴다.
   *   ✅ 대신 안 하면 울게 둔다 — `check-invest-ai-claims` 가 사흘 넘으면 빨강이고
   *     그 자는 `npm test` 에 물려 있다. 멎으면 배포 관문에서 걸린다. */
  { 이름: '투자AI 뉴스판독 (매일 1회)', 갈래: '세션',
    까닭: '읽고 판단하는 일이라 기계가 대신 못 한다. 안 하면 check-invest-ai-claims 가 사흘 뒤 빨강으로 운다 — 그 자가 곧 이 일의 자물쇠다. 절차는 scripts/invest-ai/판독지침.md' },
];

export const 기계몫 = () => 일과.filter((x) => x.갈래 === '기계');
export const 세션몫 = () => 일과.filter((x) => x.갈래 === '세션');

/** 작업 이름은 겹치면 안 된다 — 겹치면 뒤엣것이 앞엣것을 덮어 하나가 조용히 사라진다 */
export function 이름겹치나(목록 = 일과) {
  const 본것 = new Set(); const 겹친것 = [];
  for (const x of 목록) { if (본것.has(x.이름)) 겹친것.push(x.이름); 본것.add(x.이름); }
  return 겹친것;
}

/** 같은 «분»에 여럿이 몰리면 서로 느려진다. 매시 것끼리만 본다 */
export function 같은분에몰렸나(목록 = 일과) {
  const 칸 = {};
  for (const x of 목록.filter((y) => y.갈래 === '기계' && y.주기 === '매시')) {
    칸[x.분] = (칸[x.분] ?? 0) + 1;
  }
  return Object.entries(칸).filter(([, n]) => n > 1).map(([m]) => Number(m));
}

/** 매일 것이 업무시간 밖이어도 된다 — 사람이 아니라 기계가 도는 것이므로. 다만 0~23 이어야 한다 */
export function 시각이말이되나(x) {
  if (x.갈래 !== '기계') return true;
  if (!Number.isInteger(x.분) || x.분 < 0 || x.분 > 59) return false;
  if (x.주기 === '매시') return true;
  return Number.isInteger(x.시) && x.시 >= 0 && x.시 <= 23;
}

/**
 * 걸 명령 한 줄 — cmd 로 감싸 저장소에 서서 돌리고 로그를 남긴다.
 *
 * 🔴 [2026-09-20] 처음엔 열두 자가 «한 로그 파일»에 같이 적게 했다. 두 자를 같은 초에
 *   돌려 보니 하나가 끝값 1 로 떨어졌다 — 윈도에서는 두 프로세스가 같은 파일에 >> 로
 *   붙을 때 하나가 파일을 못 연다. 예약이 겹치는 순간 «있지도 않은 빨간불»이 켜진다.
 *   ⇒ 자마다 제 로그를 쓴다. ⛔ 한 파일로 되돌리지 말 것.
 */
export function 로그이름(이름) {
  return '.정기업무-' + String(이름).replace(/[^\w가-힣-]/g, '_') + '.log';
}
export function 명령줄(x, node = 'node', repo = 뿌리) {
  return '/c cd /d "' + repo + '" && "' + node + '" ' + x.명령.join(' ')
    + ' >> "' + path.join(repo, 로그이름(x.이름)) + '" 2>&1';
}

/**
 * 예약에서 «부르는 자»의 파일 이름을 뽑는다 — 같은 일이 두 번 걸리는 것을 막는 열쇠다.
 * ⚠ 이름으로 맞추면 못 잡는다. 앞선 세션은 「KLifeDesign-신문제목수집-0530」이라 지었고
 *   내가 지으려던 이름은 「아카이빙-신문제목」이었다. 겹치는 것은 이름이 아니라 «자»다.
 */
export function 부르는자(명령글) {
  const 것 = String(명령글 ?? '').match(/[\w가-힣-]+\.(mjs|ps1|js)/g);
  return 것 ? [...new Set(것.map((x) => x.toLowerCase()))] : [];
}

/** 내가 걸려는 자를 «이미 누가» 걸어 두었나 */
export function 겹치는것(일과항목, 걸린표) {
  if (!일과항목.명령) return null;
  const 내자 = 부르는자(일과항목.명령.join(' '))[0];
  if (!내자) return null;
  for (const [이름, x] of Object.entries(걸린표)) {
    if (이름 === 일과항목.이름) continue;              // 내가 건 그것은 겹침이 아니다
    if ((x.자들 ?? []).includes(내자)) return 이름;
  }
  return null;
}

/* ── 지금 걸린 것 보기 ──────────────────────────────────────────────
   ⛔ [2026-09-20] 한글 작업 이름이 «깨져서» 「안 걸렸다」로 잘못 읽혔다.
     파이프로 내보낼 때 PowerShell 이 시스템 코드페이지로 떨어뜨린다.
     ⇒ OutputEncoding 을 UTF8 로 박는다. 이 줄을 지우지 말 것. */
function 걸린것() {
  try {
    const 글 = execFileSync('powershell', ['-NoProfile', '-Command',
      '[Console]::OutputEncoding=[System.Text.Encoding]::UTF8; '
      + 'Get-ScheduledTask | Where-Object {$_.TaskPath -eq "\\"} | ForEach-Object { '
      + '$i = Get-ScheduledTaskInfo -TaskName $_.TaskName; '
      + '$a = ($_.Actions | Select-Object -First 1); '
      + '"{0}`t{1}`t{2}`t{3}" -f $_.TaskName, $i.LastTaskResult, $i.NextRunTime, '
      + '(($a.Execute) + " " + ($a.Arguments)) }'],
    { encoding: 'utf8', timeout: 90000 });
    const 표 = {};
    for (const l of 글.split(/\r?\n/)) {
      const [이름, 끝값, 다음, 명령] = l.split('\t');
      if (!이름 || !이름.trim()) continue;
      표[이름.trim()] = {
        끝값: (끝값 ?? '').trim(), 다음: (다음 ?? '').trim(), 자들: 부르는자(명령),
      };
    }
    return 표;
  } catch (e) { return null; }
}

function 잰다() {
  console.log('■ 정기 업무 — 무엇이 걸렸나 · ' + new Date().toLocaleString('ko-KR'));
  const 표 = 걸린것();
  if (표 === null) { console.log('   🔴 작업 스케줄러를 못 읽었다'); return 1; }
  let 빠진 = 0; let 겹침 = 0;
  console.log('\n   ── 기계 몫 ──');
  for (const x of 기계몫()) {
    const 있 = 표[x.이름];
    const 언제 = x.주기 === '매시' ? '매시 :' + String(x.분).padStart(2, '0')
      : '매일 ' + String(x.시).padStart(2, '0') + ':' + String(x.분).padStart(2, '0');
    const 남 = 겹치는것(x, 표);
    if (남) { 겹침 += 1; console.log('   ⚠ ' + x.이름.padEnd(18) + 언제 + '   이미 「' + 남 + '」가 같은 자를 부른다'); continue; }
    if (!있) { 빠진 += 1; console.log('   🔴 ' + x.이름.padEnd(18) + 언제 + '   안 걸렸다'); } else {
      console.log('   ✅ ' + x.이름.padEnd(18) + 언제 + '   끝값 ' + 있.끝값 + ' · 다음 ' + 있.다음);
    }
  }
  if (겹침) console.log('   ⇒ 겹치는 ' + 겹침 + '개는 «안 건다». 같은 자료를 두 번 받지 않는다');
  console.log('\n   ── 세션 몫 (일부러 안 건다) ──');
  for (const x of 세션몫()) console.log('   ⬜ ' + x.이름 + ' — ' + x.까닭);
  if (빠진) {
    console.log('\n   ⇒ 빠진 ' + 빠진 + '개를 걸려면 — node scripts/정기업무-예약.mjs --설치');
    return 1;
  }
  console.log('\n   ✅ 기계 몫 ' + 기계몫().length + '개가 다 걸려 있다');
  return 0;
}

function 설치() {
  const node = process.execPath;
  const 표 = 걸린것() ?? {};
  const 걸것 = 기계몫().filter((x) => {
    const 남 = 겹치는것(x, 표);
    if (남) console.log('⚠ 건너뛴다 — ' + x.이름 + ' : 이미 「' + 남 + '」가 같은 자를 부른다');
    return !남;
  });
  const 줄 = ['$ErrorActionPreference = "Stop"'];
  for (const x of 걸것) {
    const 인자 = 명령줄(x, node).replace(/"/g, '""');
    줄.push('$act = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "' + 인자 + '"');
    if (x.주기 === '매시') {
      줄.push('$trg = New-ScheduledTaskTrigger -Once -At (Get-Date -Hour 0 -Minute ' + x.분
        + ' -Second 0) -RepetitionInterval (New-TimeSpan -Minutes 60)');
    } else {
      줄.push('$trg = New-ScheduledTaskTrigger -Daily -At (Get-Date -Hour ' + x.시
        + ' -Minute ' + x.분 + ' -Second 0)');
    }
    줄.push('$set = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries '
      + '-DontStopIfGoingOnBatteries -StartWhenAvailable '
      + '-ExecutionTimeLimit (New-TimeSpan -Minutes 20) -MultipleInstances IgnoreNew');
    줄.push('Register-ScheduledTask -TaskName "' + x.이름 + '" -Action $act -Trigger $trg '
      + '-Settings $set -Description "' + String(x.까닭).replace(/"/g, "'") + '" -Force | Out-Null');
    줄.push('Write-Output "걸었다 ' + x.이름 + '"');
  }
  const ps = path.join(뿌리, '.정기업무-설치.ps1');
  fs.writeFileSync(ps, '\uFEFF' + 줄.join('\n'), 'utf8');
  try {
    const 글 = execFileSync('powershell',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ps],
      { encoding: 'utf8', timeout: 180000 });
    console.log(글.trim());
  } catch (e) {
    console.log('🔴 설치 중 멈췄다 — ' + String(e.stdout ?? '') + String(e.stderr ?? '').slice(0, 400));
    return 1;
  } finally { try { fs.unlinkSync(ps); } catch (e2) { /* 지워졌다 */ } }
  console.log('');
  return 잰다();
}

/* ── 자가시험 ─────────────────────────────────────────────────────── */
function 자가시험() {
  let 산 = 0; let 죽 = 0;
  const 재다 = (말, 참) => { if (참) { 산 += 1; } else { 죽 += 1; console.log('   ✕ ' + 말); } };

  재다('일과가 비어 있지 않다', 일과.length >= 10);
  재다('갈래는 기계 아니면 세션뿐', 일과.every((x) => x.갈래 === '기계' || x.갈래 === '세션'));
  재다('작업 이름이 겹치지 않는다', 이름겹치나().length === 0);
  재다('겹침 검사가 실제로 잡는다',
    이름겹치나([{ 이름: 'ㄱ' }, { 이름: 'ㄱ' }]).length === 1);

  재다('기계 몫은 다 명령을 가진다',
    기계몫().every((x) => Array.isArray(x.명령) && x.명령.length >= 1));
  재다('기계 몫의 자가 실제로 있다',
    기계몫().every((x) => fs.existsSync(path.join(뿌리, x.명령[0]))));
  재다('세션 몫은 명령을 «안» 가진다 — 실수로 걸리지 않게',
    세션몫().every((x) => !x.명령));
  재다('세션 몫은 까닭을 반드시 적는다',
    세션몫().every((x) => String(x.까닭 ?? '').length >= 10));

  재다('시각이 다 말이 된다', 일과.every(시각이말이되나));
  재다('시각 검사가 실제로 잡는다',
    !시각이말이되나({ 갈래: '기계', 주기: '매일', 시: 25, 분: 0 }));
  재다('분이 60 이면 잡는다', !시각이말이되나({ 갈래: '기계', 주기: '매시', 분: 60 }));

  재다('매시 것이 같은 분에 안 몰린다', 같은분에몰렸나().length === 0);
  재다('몰림 검사가 실제로 잡는다',
    같은분에몰렸나([{ 갈래: '기계', 주기: '매시', 분: 5, 이름: 'ㄱ' },
      { 갈래: '기계', 주기: '매시', 분: 5, 이름: 'ㄴ' }]).length === 1);

  const 줄 = 명령줄(기계몫()[0], 'C:/node.exe', 'C:/repo');
  재다('명령줄이 저장소에 서서 돈다', 줄.includes('cd /d "C:/repo"'));
  재다('명령줄이 로그를 남긴다', />> "/.test(줄) && 줄.includes('.log'));
  재다('🔴 자마다 «제» 로그를 쓴다 — 한 파일에 몰리면 같은 초에 겹쳐 거짓 빨간불이 켜진다',
    new Set(기계몫().map((x) => 로그이름(x.이름))).size === 기계몫().length);
  재다('명령줄이 stderr 도 담는다', 줄.includes('2>&1'));

  /* ⛔ 사장님께 저절로 메일이 나가면 안 된다 */
  재다('⛔ 어떤 기계 몫도 --보낸다 를 들고 있지 않다',
    기계몫().every((x) => !x.명령.some((a) => /--보낸다|--send/.test(a))));
  재다('⛔ 어떤 기계 몫도 배포 명령이 아니다',
    기계몫().every((x) => !x.명령.some((a) => /ctype|deploy|apply/.test(a))));

  /* 🔴 «멈춰 세운 자»를 예약에 걸지 않는다 — 2026-09-20 에 ADX 를 그렇게 걸었다가 뺐다.
     예약은 돌지만 자는 「멈춰 세운 수집기다」만 찍고 끝난다. 끝값은 0 이라 초록불로 보인다. */
  /* ⚠ «받아 쌓는 자»(collect-*)만 본다. 우리 살림 자(되받기·예약)는 그 글귀를 «검사하려고»
     제 안에 들고 있어서, 통째로 훑으면 제가 저를 막는다 — 2026-09-20 에 실제로 그랬다. */
  for (const x of 기계몫().filter((y) => path.basename(y.명령[0]).startsWith('collect-'))) {
    const 글 = fs.readFileSync(path.join(뿌리, x.명령[0]), "utf8");
    재다("⛔ 멈춰 세운 자가 아니다 — " + x.이름, !/멈춰 세운 수집기/.test(글));
  }

  /* 아카이빙은 소급이 안 되므로 반드시 기계 몫이어야 한다 */
  const 아카 = 일과.filter((x) => x.이름.startsWith('아카이빙-'));
  재다('아카이빙이 셋 이상이고 다 기계 몫이다',
    아카.length >= 3 && 아카.every((x) => x.갈래 === '기계'));

  /* 겹침 잡기 — 이름이 달라도 «같은 자»를 부르면 겹친 것이다 */
  재다('명령글에서 자 이름을 뽑는다',
    부르는자('cmd /c node scripts/collect-news-desk.mjs --적는다')[0] === 'collect-news-desk.mjs');
  재다('ps1 도 뽑는다', 부르는자('powershell -File C:/a/backup-archive-onedrive.ps1')[0] === 'backup-archive-onedrive.ps1');
  재다('자가 없으면 빈 배열', 부르는자('cmd /c echo 안녕').length === 0);
  재다('이름이 달라도 같은 자면 겹친 것으로 잡는다',
    겹치는것({ 이름: '아카이빙-신문제목', 명령: ['scripts/collect-news-desk.mjs','--적는다'] },
      { 'KLifeDesign-신문제목수집-0530': { 자들: ['collect-news-desk.mjs'] } }) === 'KLifeDesign-신문제목수집-0530');
  재다('내가 건 그것은 겹침이 아니다',
    겹치는것({ 이름: 'ㄱ', 명령: ['scripts/a.mjs'] }, { 'ㄱ': { 자들: ['a.mjs'] } }) === null);
  재다('다른 자면 안 겹친다',
    겹치는것({ 이름: 'ㄱ', 명령: ['scripts/a.mjs'] }, { 'ㄴ': { 자들: ['b.mjs'] } }) === null);

  console.log('   자가시험 ' + 산 + '개 통과' + (죽 ? ' · ' + 죽 + '개 실패' : ''));
  return 죽 === 0;
}

const 인자 = process.argv.slice(2);
if (인자.includes('--자가시험')) process.exit(자가시험() ? 0 : 1);
else if (인자.includes('--설치')) process.exit(설치());
else process.exit(잰다());
