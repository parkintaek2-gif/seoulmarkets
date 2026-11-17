#!/usr/bin/env node
/**
 * 잰다-지역페이지-성과.mjs — 「지역 이름이 제목에 든 지면」이 실제로 손님을 벌어 오나.
 *
 * ── 왜 ───────────────────────────────────────────────────────
 * 2026-11-15 측정에서 백년지도만 네이버에서 통하는 까닭을 찾았다 —
 * `/report/area/시·군·구` 258장. 지역 이름이 제목에 든 공공데이터 지면이다.
 * 그 구조를 초등학교로 한 세트 더 냈다(`/elementary/area/` 261장, 11-15 배포).
 *
 * ⛔ **더 찍기 전에 먼저 잰다.** 통하지 않는 구조를 열 벌 더 찍으면 열 배 헛일이다.
 * ⛔ 「올렸다」를 「벌어 온다」로 읽지 않는다.
 *
 * ── 무엇을 재나 ──────────────────────────────────────────────
 * 묶음마다  ① 순방문자  ② 지면 수  ③ 지면 한 장이 버는 사람  ④ 유입 갈래
 * ③ 이 핵심이다 — 「몇 장 찍었나」가 아니라 「한 장이 얼마를 버나」가 다음에
 * 무엇을 찍을지 정한다.
 *
 * 쓰는 법
 *   node scripts/잰다-지역페이지-성과.mjs            28일
 *   node scripts/잰다-지역페이지-성과.mjs --일=7
 *   node scripts/잰다-지역페이지-성과.mjs --selftest
 */
import { 토큰받기, 재기, 우리것인가, 사이트이름 } from './lib/ga4.mjs';

/* ── 묶음 표 ──────────────────────────────────────────────────
   ⛔ 경로를 두 곳에 적지 않는다. 지면 묶음이 늘면 여기만 고친다. */
const 묶음표 = [
  { 이름: '백년지도 · 고등학교 지역', 호스트: /100yearmap/i, 경로: /^\/report\/area\// },
  { 이름: '백년지도 · 초등학교 지역', 호스트: /100yearmap/i, 경로: /^\/elementary\/area\// },
  { 이름: '백년지도 · 나이 축', 호스트: /100yearmap/i, 경로: /^\/age(\/|$)/ },
  { 이름: '백년지도 · 그 밖', 호스트: /100yearmap/i, 경로: /./ },
  /* 🔴 [2026-11-18 실측] KLifeMap 28일 2,667명 가운데 1,219명(46%)이 /checkout.html 이다.
     우리 결제 점검이 매시 여는 화면이지 손님이 아니다 — 네이버 유입에는 한 건도 없다.
     ⛔ 빼 버리지 않고 «갈라» 적는다. 빼면 다음 사람이 그만큼이 있었다는 것을 모른다.
     ⚠ 차례가 중요하다 — 사주/운세보다 «위»에 둬야 걸린다. */
  { 이름: 'KLifeMap · 우리점검(결제·로그인)', 호스트: /klifemap/i, 경로: /^\/(checkout|login|dashboard)\.html/i },
  { 이름: 'KLifeMap · 사주/운세', 호스트: /klifemap/i, 경로: /^\/(saju|horoscope|astro|fortune)/i },
  { 이름: 'KLifeMap · 그 밖', 호스트: /klifemap/i, 경로: /./ },
  { 이름: 'K Culture Wire', 호스트: /kculturewire/i, 경로: /./ },
  { 이름: 'SeoulMarkets', 호스트: /seoulmarkets/i, 경로: /./ },
];

function 묶음찾기(호스트, 경로) {
  for (const m of 묶음표) {
    if (m.호스트.test(호스트) && m.경로.test(경로)) return m.이름;
  }
  return null;
}

/* ── 자가시험 ────────────────────────────────────────────────── */
function 자가시험() {
  const 봄 = [];
  const 본다 = (이름, 참) => 봄.push({ 이름, 참 });

  /* ⚠ 차례가 중요하다 — 「그 밖」이 먼저 걸리면 지역 지면이 거기로 샌다 */
  본다('고등학교 지역이 제 묶음으로 간다',
    묶음찾기('www.100yearmap.com', '/report/area/의정부시') === '백년지도 · 고등학교 지역');
  본다('초등학교 지역이 제 묶음으로 간다',
    묶음찾기('www.100yearmap.com', '/elementary/area/수원시') === '백년지도 · 초등학교 지역');
  본다('나이 축이 제 묶음으로 간다',
    묶음찾기('www.100yearmap.com', '/age/32') === '백년지도 · 나이 축');
  본다('그 밖이 그 밖으로 간다',
    묶음찾기('www.100yearmap.com', '/about') === '백년지도 · 그 밖');
  본다('홈도 그 밖으로 간다',
    묶음찾기('www.100yearmap.com', '/') === '백년지도 · 그 밖');
  본다('사주가 제 묶음으로 간다',
    묶음찾기('klifemap.ai', '/saju') === 'KLifeMap · 사주/운세');
  /* 🔴 우리 점검이 사주/운세보다 먼저 걸려야 한다 — 뒤에 두면 손님 수에 섞인다 */
  본다('결제 점검이 우리점검으로 간다',
    묶음찾기('klifemap.ai', '/checkout.html') === 'KLifeMap · 우리점검(결제·로그인)');
  본다('로그인도 우리점검이다',
    묶음찾기('klifemap.ai', '/login.html') === 'KLifeMap · 우리점검(결제·로그인)');
  본다('사주는 그대로 사주다',
    묶음찾기('klifemap.ai', '/saju.html') === 'KLifeMap · 사주/운세');
  본다('모르는 호스트는 null 이다',
    묶음찾기('example.com', '/') === null);
  /* 🔴 /report/area 와 /report 를 가른다 — 「area」가 든 것만 지역 지면이다 */
  본다('지역이 아닌 report 는 그 밖이다',
    묶음찾기('www.100yearmap.com', '/report/summary') === '백년지도 · 그 밖');

  let 깨짐 = 0;
  for (const s of 봄) { if (!s.참) { console.log('🔴 ' + s.이름); 깨짐 += 1; } }
  console.log(깨짐 ? `🔴 ${깨짐}가지 깨졌다 (전체 ${봄.length})` : `✅ ${봄.length}가지 다 통과`);
  return 깨짐 === 0;
}

/* ── 본 일 ───────────────────────────────────────────────────── */
async function 돈다(일) {
  const t = await 토큰받기();
  if (t.못잼) { console.log('🔴 못 쟀다 —', t.못잼); return; }

  /* ① 묶음별 순방문자 · 지면 수 */
  const 줄들 = await 재기(t.토큰, t.속성, ['hostName', 'pagePath'],
    { 시작: `${일}daysAgo`, 끝: 'yesterday' });
  if (!줄들) { console.log('🔴 GA4 가 줄을 안 줬다'); return; }

  const 모음 = {};
  for (const r of 줄들) {
    const [h, p] = r.값;
    if (!우리것인가(h)) continue;
    const 이름 = 묶음찾기(h, p);
    if (!이름) continue;
    (모음[이름] ??= { 사람: 0, 지면: new Set(), 윗장: [] });
    모음[이름].사람 += r.수;
    모음[이름].지면.add(p);
    모음[이름].윗장.push({ 경로: p, 수: r.수 });
  }

  console.log(`\n📏 지역 지면이 손님을 버나 — 최근 ${일}일 (어제까지)\n`);
  console.log('  ⬜ 「지면요청으로 센 사람」이 아니라 GA4 순방문자다');
  console.log('  ⬜ 한 사람이 여러 묶음을 보면 양쪽에 센다 — 합이 전체와 다르다\n');
  console.log('  묶음                          사람      지면      한 장이 버는 사람');
  console.log('  ' + '─'.repeat(72));

  const 줄정리 = [];
  for (const m of 묶음표) {
    const v = 모음[m.이름];
    if (!v) { 줄정리.push({ 이름: m.이름, 사람: 0, 장: 0, 장당: null }); continue; }
    const 장 = v.지면.size;
    줄정리.push({ 이름: m.이름, 사람: v.사람, 장, 장당: 장 ? v.사람 / 장 : null, 윗장: v.윗장 });
  }
  for (const r of 줄정리) {
    const 장당 = r.장당 === null ? '  못 쟀음' : r.장당.toFixed(2).padStart(8);
    console.log('  ' + r.이름.padEnd(28) + String(r.사람).padStart(6) +
      String(r.장).padStart(10) + 장당);
  }

  /* ② 유입 갈래 — 어디서 오나 */
  const 갈래줄 = await 재기(t.토큰, t.속성, ['hostName', 'sessionSource'],
    { 시작: `${일}daysAgo`, 끝: 'yesterday' });
  if (갈래줄) {
    const 갈래 = {};
    for (const r of 갈래줄) {
      const [h, s] = r.값;
      if (!우리것인가(h)) continue;
      const 이름 = 사이트이름(h);
      ((갈래[이름] ??= {})[s] = (갈래[이름][s] || 0) + r.수);
    }
    console.log('\n  어디서 오나 (사이트마다 위 다섯)\n');
    for (const [사이트, 표] of Object.entries(갈래)) {
      const 위 = Object.entries(표).sort((a, b) => b[1] - a[1]).slice(0, 5);
      const 합 = Object.values(표).reduce((a, b) => a + b, 0);
      console.log('  ' + 사이트 + '  (합 ' + 합 + '명)');
      for (const [곳, 수] of 위) {
        console.log('     ' + String(수).padStart(6) + '  ' + 곳);
      }
    }
  }

  /* ③ 지역 지면 가운데 실제로 벌어 오는 장 — 다음에 무엇을 더 찍을지의 단서 */
  for (const 이름 of ['백년지도 · 고등학교 지역', '백년지도 · 초등학교 지역']) {
    const v = 모음[이름];
    if (!v) { console.log('\n  ' + 이름 + ' : 자국이 없다'); continue; }
    const 위 = v.윗장.sort((a, b) => b.수 - a.수).slice(0, 10);
    const 번것 = v.윗장.filter((x) => x.수 >= 2).length;
    console.log('\n  ' + 이름 + ' — 두 명 이상이 본 장 : ' + 번것 + ' / ' + v.지면.size);
    for (const x of 위) console.log('     ' + String(x.수).padStart(5) + '  ' + x.경로);
  }
  console.log('');
}

const 인자 = process.argv.slice(2);
if (인자.includes('--selftest')) { process.exit(자가시험() ? 0 : 1); }
const 일 = Number((인자.find((a) => a.startsWith('--일=')) || '--일=28').split('=')[1]);
await 돈다(일);
