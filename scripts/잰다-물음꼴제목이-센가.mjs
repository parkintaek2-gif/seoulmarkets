#!/usr/bin/env node
/**
 * 잰다-물음꼴제목이-센가.mjs
 *   — **제목이 «물음»인 페이지가 «평서문»인 페이지보다 손님을 더 받나.**
 *
 * ── 🔴 왜 (2026-11-18 · 5번) ────────────────────────────────────────
 * 백년지도를 묶음별로 재니 「한 장이 버는 사람」이 이렇게 갈렸다 —
 * ```
 *   years-left     1장 →  67명    「지금 몇 살이면 앞으로 몇 해가 남았나」
 *   elementary     1장 →  49명    「초등학교는 몇 살인가요?」
 *   marriage-age   1장 →  20명    「결혼 평균 나이 — 30대 미혼 비율 67.4%」
 *   school       559장 → 1288명   2.3명/장
 * ```
 * 셋 다 **제목이 물음**이다. KCW 에서 「AI 가 인용하는 제목은 물음이고
 * 안 하는 것은 발견 문장」을 이미 재 두었다 — 같은 말이 네이버에서도 나오나.
 *
 * ── ⛔ 이 자가 스스로 막는 함정 ─────────────────────────────────────
 * 🔴 **「한 장짜리라 집중된 것」과 「물음꼴이라 든 것」은 다른 말이다.**
 *   위 셋은 전부 한 장짜리다. 장수를 안 맞추고 견주면 장수 효과를 물음 덕으로 읽는다.
 *   ⇒ **같은 장수끼리만 견준다.** 한 장짜리는 한 장짜리끼리.
 * 🔴 **대조군 — 한 장짜리인데 0명인 페이지가 있어야 한다.**
 *   한 장짜리가 전부 잘 되면 「물음」이 아니라 「한 장짜리」가 이유다.
 * ⛔ direct 는 세지 않는다 — 영어 두 사이트 직접 유입의 70~83%가 수집기다.
 *   검색·AI·링크로 «밖에서» 들어온 것만 센다.
 * ⛔ 중앙값을 함께 낸다. 평균은 67명짜리 하나에 끌려간다.
 *
 * 쓰는 법
 *   node scripts/잰다-물음꼴제목이-센가.mjs
 *   node scripts/잰다-물음꼴제목이-센가.mjs --호스트=klifemap.ai --일수=28
 *   node scripts/잰다-물음꼴제목이-센가.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function 인자(이름, 바탕) {
  const x = process.argv.find((v) => v.startsWith(이름 + '='));
  return x ? x.slice(이름.length + 1) : 바탕;
}

/**
 * 제목이 물음인가.
 * ⛔ 물음표 하나로 재지 않는다 — 한국어 제목은 물음표 없이도 묻는다
 *   (「지금 몇 살이면 앞으로 몇 해가 남았나」에 물음표가 없다).
 */
export function 물음인가(제목) {
  const t = String(제목 ?? '').trim();
  if (!t) return false;
  /* 사이트 이름 꼬리를 떼고 본다 — 「… — 백년지도」의 꼬리가 판정을 흐린다 */
  const 몸 = t.split(/\s[—|·]\s/)[0].trim() || t;
  if (/[?？]/.test(t)) return true;
  /* 한국어 의문 어미 — 낱말 끝에서만 본다 */
  if (/(나|가요|까|는가|은가|ㄹ까|을까|냐|니)\s*$/.test(몸)) return true;
  /* 의문사 — 몸통 어디에 있어도 묻는 꼴이다 */
  if (/(몇\s|몇살|몇 살|얼마|어디|언제|무엇|뭐가|왜\s|어떻게|어느)/.test(몸)) return true;
  /* 🔴 [2026-11-18] **영어 두 사이트를 한국어 규칙으로 재고 있었다.**
     KCW·SeoulMarkets 제목에 「Who is」·「How many」가 와도 한 장도 안 잡혔다.
     ⛔ 못 가르는 자로 「물음꼴이 약하다」를 결론 낼 뻔했다.
     ⚠ 머리에서만 본다 — 「the How of it」 같은 가운데 낱말을 묻는 꼴로 세지 않는다. */
  if (/^(who|what|when|where|why|how|which|whose|is|are|was|were|do|does|did|can|should|will)\b/i.test(몸)) return true;
  return false;
}

/** 가운뎃값. ⛔ 평균만 내면 큰 것 하나에 끌려간다 */
export function 가운데(수들) {
  const a = [...수들].filter((x) => Number.isFinite(x)).sort((x, z) => x - z);
  if (!a.length) return null;
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : Math.round(((a[m - 1] + a[m]) / 2) * 10) / 10;
}

/** 경로에서 묶음 이름을 뽑는다 — 장수를 세어 같은 장수끼리 견주기 위한 것 */
export function 묶음이름(경로) {
  const p = String(경로 ?? '').split('?')[0];
  const 도막 = p.split('/').filter(Boolean);
  if (!도막.length) return '(홈)';
  /* /100y/ 는 백년지도의 속뜰이라 한 겹 더 들어간다 */
  const i = 도막[0] === '100y' ? 1 : 0;
  return 도막[i] ?? '(홈)';
}

function 자가시험() {
  const 봄 = []; const 본다 = (이름, 참) => 봄.push({ 이름, 참 });
  본다('① 물음표가 있으면 물음이다', 물음인가('초등학교는 몇 살인가요?'));
  본다('② 물음표가 없어도 어미로 가른다', 물음인가('지금 몇 살이면 앞으로 몇 해가 남았나'));
  본다('③ 의문사가 있으면 물음이다', 물음인가('결혼 평균 나이는 얼마인가'));
  본다('④ 평서문은 물음이 아니다', !물음인가('2024년 생명표로 본 기대수명 분포'));
  본다('⑤ 사이트 이름 꼬리에 안 속는다 — 꼬리를 떼고 본다',
    !물음인가('전국 고등학교 진학률 자료 — 백년지도'));
  본다('⑥ 꼬리를 떼도 물음은 물음이다', 물음인가('초등학교는 몇 살인가요? — 백년지도'));
  /* 🔴 「…하나」로 끝나는 평서문이 걸리면 안 된다 */
  본다('⑦ 빈 값에 안 터진다', !물음인가('') && !물음인가(null) && !물음인가(undefined));
  본다('⑧ 가운뎃값 — 홀수', 가운데([1, 5, 100]) === 5);
  본다('⑨ 가운뎃값 — 짝수', 가운데([1, 3, 5, 7]) === 4);
  본다('⑩ 가운뎃값 — 빈 것은 null', 가운데([]) === null);
  본다('⑪ 가운뎃값이 평균에 안 끌려간다', 가운데([1, 1, 1, 1, 900]) === 1);
  본다('⑫ 묶음 이름 — 100y 속뜰은 한 겹 더 들어간다',
    묶음이름('/100y/report/area/x') === 'report');
  본다('⑬ 묶음 이름 — 보통 경로', 묶음이름('/unse/rabbit.html') === 'unse');
  본다('⑭ 묶음 이름 — 홈', 묶음이름('/') === '(홈)' && 묶음이름('') === '(홈)');
  본다('⑮ 묶음 이름 — 물음표 뒤는 버린다', 묶음이름('/age?x=1') === 'age');
  /* 🔴 영어 두 사이트 — 한국어 규칙만으로는 한 장도 안 잡혔다 */
  본다('⑯ 영어 의문사를 머리에서 가른다',
    물음인가('How many BTS albums charted in 2026') && 물음인가('Who tops the Korean box office'));
  본다('⑰ 영어 평서문은 물음이 아니다',
    !물음인가('Korean box office revenue by month'));
  본다('⑱ 가운데 낱말은 안 센다 — 머리에서만 본다',
    !물음인가('The how and why of Korean cinema'));
  본다('⑲ 대문자·소문자를 가리지 않는다', 물음인가('WHAT drives the won'));
  let 깨짐 = 0;
  for (const s of 봄) if (!s.참) { console.log('🔴 ' + s.이름); 깨짐 += 1; }
  console.log(깨짐 ? '🔴 ' + 깨짐 + '가지 깨졌다' : '✅ ' + 봄.length + '가지 다 통과');
  return 깨짐 === 0;
}

if (process.argv.includes('--자가시험') || process.argv.includes('--selftest')) {
  process.exit(자가시험() ? 0 : 1);
}

/* ── 여기서부터 실제 측정 ─────────────────────────────────────────── */
const 속성 = '549135289';
const 일수 = Number(인자('--일수', '28'));
const 호스트 = 인자('--호스트', '100yearmap.com');

/* ⚠ 열쇠 파일 이름이 저장소마다 다르다 — 옆 도구와 «같은» 차례로 찾는다.
   한 이름만 보고 「열쇠가 없다」로 서면 측정이 통째로 멈춘다. */
function 열쇠읽기() {
  for (const 이름 of ['gsc-sa.json', 'ga4-sa.json', 'search-console-sa.json']) {
    const p = path.join(뿌리, 'secrets', 이름);
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
  }
  const env = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (env && fs.existsSync(env)) return JSON.parse(fs.readFileSync(env, 'utf8'));
  throw new Error('열쇠가 없다 — secrets/gsc-sa.json 등을 못 찾았다');
}

async function 물어보다(토큰, 몸) {
  const r = await fetch('https://analyticsdata.googleapis.com/v1beta/properties/' + 속성 + ':runReport', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + 토큰, 'Content-Type': 'application/json' },
    body: JSON.stringify(몸),
  });
  if (!r.ok) throw new Error('GA4 ' + r.status + ' ' + (await r.text()).slice(0, 200));
  return r.json();
}

const { 토큰받기 } = await import('./ga4-report.mjs');
const 토큰 = await 토큰받기(열쇠읽기(), 'https://www.googleapis.com/auth/analytics.readonly');

console.log('\n📏 ' + 호스트 + ' — 제목이 물음인 페이지가 더 받나 · 최근 ' + 일수 + '일\n');

const 답 = await 물어보다(토큰, {
  dateRanges: [{ startDate: 일수 + 'daysAgo', endDate: 'yesterday' }],
  dimensions: [
    { name: 'landingPagePlusQueryString' },
    { name: 'pageTitle' },
    { name: 'sessionDefaultChannelGroup' },
  ],
  metrics: [{ name: 'totalUsers' }],
  dimensionFilter: { filter: { fieldName: 'hostName', stringFilter: { matchType: 'EXACT', value: 호스트 } } },
  orderBys: [{ metric: { metricName: 'totalUsers' }, desc: true }],
  limit: 2000,
});

/* 경로 하나로 모은다. ⛔ direct 는 더하지 않는다 — 수집기가 섞인다 */
const 표 = new Map();
for (const r of (답.rows || [])) {
  const 경로 = r.dimensionValues[0].value;
  const 제목 = r.dimensionValues[1].value;
  const 채널 = r.dimensionValues[2].value;
  const 사람 = Number(r.metricValues[0].value) || 0;
  if (/^direct$/i.test(채널)) continue;
  const 이제 = 표.get(경로) || { 경로, 제목, 밖에서온사람: 0 };
  if (!이제.제목 || 이제.제목 === '(not set)') 이제.제목 = 제목;
  이제.밖에서온사람 += 사람;
  표.set(경로, 이제);
}

const 줄들 = [...표.values()];
if (!줄들.length) {
  console.log('🔴 잴 것이 없다 — GA4 가 빈 것을 줬다. 「못 쟀다」지 「0명」이 아니다.\n');
  process.exit(1);
}

/* 🔴🔴 [2026-11-18 · 5번] **GA4 는 «방문이 있는» 페이지만 준다.**
   ─────────────────────────────────────────────────────────────
   첫 판은 GA4 가 준 목록만 보고 「0명인 것 — 물음꼴 0장 · 평서문 0장」을 찍었다.
   0명짜리가 없는 것이 아니라 **애초에 목록에 안 들어온 것**이다.
   ⛔ 이것이 바로 「자가 보는 범위를 자가 정하면 못 본 것이 없는 것이 된다」다.
   ⇒ 전체 목록은 **사이트맵에 물어서 받는다.** 내가 짐작해 채우지 않는다.
   ⚠ 못 받으면 못 받았다고 적고 0명 칸을 「못 쟀다」로 둔다 — 0 으로 메우지 않는다. */
/**
 * 사이트맵 하나를 읽는다. **인덱스 꼴이면 하위 사이트맵까지 따라간다.**
 * 🔴 [2026-11-18] 첫 판은 안 따라가서 seoulmarkets 가 「지면 9장」으로 나왔다 —
 *   잡힌 것이 전부 `sitemap-*.xml` 이라는 «사이트맵 파일 이름»이었다.
 *   ⛔ 내가 보는 범위를 내가 정하면 못 본 것이 없는 것이 된다.
 */
async function 사이트맵주소들(뿌리주소, 깊이 = 0) {
  if (깊이 > 2) return [];                     /* 서로 가리키는 사이트맵에 안 갇힌다 */
  const r = await fetch(뿌리주소);
  if (!r.ok) return [];
  const xml = await r.text();
  const 안 = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  /* <sitemapindex> 면 안의 것들이 또 사이트맵이다 */
  if (/<sitemapindex/i.test(xml)) {
    const 모은것 = [];
    for (const u of 안) 모은것.push(...await 사이트맵주소들(u, 깊이 + 1));
    return 모은것;
  }
  return 안;
}

let 사이트맵받았나 = false;
try {
  const 뿌리주소 = 'https://' + 호스트.replace(/^www\./, '') + '/sitemap.xml';
  const 주소들 = await 사이트맵주소들(뿌리주소);
  if (!주소들.length) throw new Error('사이트맵이 비었다');
  for (const u of 주소들) {
    let 경로 = null;
    try { 경로 = new URL(u).pathname; } catch (e) { continue; }
    if (표.has(경로)) continue;
    /* 제목을 모르는 0명 페이지다. ⛔ 제목을 지어내지 않는다 — 가름에서 뺀다 */
    표.set(경로, { 경로, 제목: null, 밖에서온사람: 0, 제목모름: true });
  }
  사이트맵받았나 = true;
  console.log('⬜ 사이트맵에서 ' + 주소들.length + '장을 받아 0명 페이지까지 넣었다.\n');
} catch (e) {
  console.log('⚠ 사이트맵을 못 받았다 (' + e.message.slice(0, 60) + ') — 0명 칸은 「못 쟀다」다.\n');
}
if (!사이트맵받았나) console.log('⚠ 사이트맵을 못 받았다 — 0명 칸은 「못 쟀다」지 「없다」가 아니다.\n');

/* 🔴 0명 페이지는 GA4 가 제목을 안 준다. 제목을 모르면 물음·평서로 못 가른다.
   ⇒ --0명도본다 를 주면 표본만 라이브에서 받아 온다. 전부 받으면 수백 번 두드린다.
   ⛔ 긁지 않을 때는 「못 쟀다」로 적는다 — 전부 평서문으로 몰면 거짓이 난다. */
if (process.argv.includes('--0명도본다')) {
  const 몰라 = [...표.values()].filter((x) => x.제목모름);
  const 뽑을수 = Math.min(Number(인자('--표본', '40')), 몰라.length);
  const 뽑은것 = [];
  const 걸음 = Math.max(1, Math.floor(몰라.length / 뽑을수));
  for (let i = 0; i < 몰라.length && 뽑은것.length < 뽑을수; i += 걸음) 뽑은것.push(몰라[i]);
  console.log('⬜ 0명 페이지 ' + 몰라.length + '장 가운데 ' + 뽑은것.length + '장의 제목을 받아 온다…');
  let 받음 = 0;
  for (const x of 뽑은것) {
    try {
      const r = await fetch('https://' + 호스트.replace(/^www\./, '') + x.경로);
      if (!r.ok) continue;
      const m = (await r.text()).match(/<title[^>]*>([^<]*)<\/title>/i);
      if (m && m[1].trim()) { x.제목 = m[1].trim(); x.제목모름 = false; 받음 += 1; }
    } catch (e) { /* 한 장을 못 받아도 나머지를 잰다 */ }
  }
  console.log('   ' + 받음 + '장의 제목을 받았다.\n');
}

줄들.length = 0;
줄들.push(...표.values());

/* 🔴 장수 효과를 지운다 — 같은 묶음 크기끼리만 견준다 */
const 묶음크기 = new Map();
for (const x of 줄들) {
  const b = 묶음이름(x.경로);
  묶음크기.set(b, (묶음크기.get(b) || 0) + 1);
}

const 칸 = [
  { 이름: '한 장짜리 묶음', 맞나: (n) => n === 1 },
  { 이름: '2~20장 묶음', 맞나: (n) => n >= 2 && n <= 20 },
  { 이름: '21장 이상 묶음', 맞나: (n) => n > 20 },
];

for (const c of 칸) {
  const 다 = 줄들.filter((x) => c.맞나(묶음크기.get(묶음이름(x.경로)) || 1));
  if (!다.length) continue;
  /* ⛔ 제목을 모르는 것은 가르지 않는다 — 0명짜리를 전부 「평서문」으로 몰면 거짓이 난다 */
  const 여기 = 다.filter((x) => !x.제목모름);
  const 제목모름 = 다.length - 여기.length;
  if (!여기.length) {
    console.log('■ ' + c.이름 + ' — 제목을 아는 것이 없다. 못 쟀다.\n');
    continue;
  }
  const 물음 = 여기.filter((x) => 물음인가(x.제목));
  const 평서 = 여기.filter((x) => !물음인가(x.제목));
  console.log('■ ' + c.이름 + ' — 제목을 아는 ' + 여기.length + '장'
    + (제목모름 ? ' (제목 모르는 ' + 제목모름 + '장은 뺐다 — 0명이라 GA4 가 제목을 안 준다)' : ''));
  for (const [이름, 무리] of [['물음꼴 제목', 물음], ['평서문 제목', 평서]]) {
    if (!무리.length) { console.log('   ' + 이름.padEnd(12) + '  (없다 — 견줄 수 없다)'); continue; }
    const 수들 = 무리.map((x) => x.밖에서온사람);
    const 합 = 수들.reduce((a, b) => a + b, 0);
    console.log('   ' + 이름.padEnd(12)
      + String(무리.length).padStart(4) + '장'
      + ' · 합 ' + String(합).padStart(5) + '명'
      + ' · 한 장 평균 ' + String(Math.round((합 / 무리.length) * 10) / 10).padStart(6)
      + ' · 가운뎃값 ' + String(가운데(수들)).padStart(5));
  }
  /* ⭐ 대조군 — 0명인 것이 양쪽에 다 있어야 측정이 산다 */
  const 영물음 = 물음.filter((x) => x.밖에서온사람 === 0).length;
  const 영평서 = 평서.filter((x) => x.밖에서온사람 === 0).length;
  console.log('   ⬜ 0명인 것 — 물음꼴 ' + 영물음 + '장 · 평서문 ' + 영평서 + '장');
  console.log('');
}

/* 🔴🔴 [2026-11-18 · 5번] **사이트맵 5,554장 중 4,960장(89%)이 28일 0명이었다.**
   물음꼴을 재다가 이것이 먼저 보였다 — 제목을 고치는 것보다 큰 물음이다.
   ⇒ 어느 묶음이 비었나를 함께 적는다. 「한 장이 버는 사람」으로 다음 할 일을 정한다.
   ⛔ 장수를 늘리는 것은 답이 아니다. 이미 네 번 증명됐다(born-on 366장 0명 · 초등 261장 0명). */
if (사이트맵받았나) {
  const 묶음표 = new Map();
  for (const x of 줄들) {
    const b = 묶음이름(x.경로);
    const v = 묶음표.get(b) || { 장수: 0, 받은장: 0, 사람: 0 };
    v.장수 += 1;
    if (x.밖에서온사람 > 0) { v.받은장 += 1; v.사람 += x.밖에서온사람; }
    묶음표.set(b, v);
  }
  const 묶음줄 = [...묶음표.entries()].map(([이름, v]) => ({ 이름, ...v, 빈장: v.장수 - v.받은장 }))
    .sort((a, z) => z.빈장 - a.빈장);
  console.log('■ 어느 묶음이 비었나 — 빈 장이 많은 차례');
  console.log('   묶음            전체   받은장   빈장   사람   한장당   빈 비율');
  console.log('   ' + '-'.repeat(62));
  for (const x of 묶음줄.slice(0, 14)) {
    console.log('   ' + x.이름.slice(0, 14).padEnd(15)
      + String(x.장수).padStart(5) + String(x.받은장).padStart(8) + String(x.빈장).padStart(7)
      + String(x.사람).padStart(7)
      + String(Math.round((x.사람 / Math.max(1, x.장수)) * 100) / 100).padStart(9)
      + String(Math.round((x.빈장 / x.장수) * 100) + '%').padStart(8));
  }
  const 다장 = 묶음줄.reduce((a, x) => a + x.장수, 0);
  const 다빈 = 묶음줄.reduce((a, x) => a + x.빈장, 0);
  console.log('   ' + '-'.repeat(62));
  console.log('   모두 ' + 다장 + '장 중 ' + 다빈 + '장(' + Math.round((다빈 / 다장) * 100) + '%)이 빈다\n');
}

console.log('■ 물음꼴 제목으로 가장 많이 받는 페이지');
for (const x of 줄들.filter((y) => 물음인가(y.제목)).sort((a, z) => z.밖에서온사람 - a.밖에서온사람).slice(0, 8)) {
  console.log('   ' + String(x.밖에서온사람).padStart(5) + '명  ' + x.경로.slice(0, 40).padEnd(42)
    + (x.제목 || '').split(/\s[—|·]\s/)[0].slice(0, 44));
}

console.log('\n  ⛔ 「한 장짜리라 집중된 것」과 「물음꼴이라 든 것」은 다른 말이다 — 칸을 갈라 보았다.');
console.log('  ⛔ direct 는 안 셌다. 밖에서 온 것(검색·AI·링크)만이다.');
console.log('  ⭐ 0명인 것이 양쪽에 다 있어야 이 측정이 산다. 한쪽만 0이면 그 칸은 못 믿는다.\n');
