#!/usr/bin/env node
/**
 * 잰다-묶음별-사람인가.mjs — 묶음마다 «사람이 온 것»과 «수집기가 긁은 것»을 갈라 낸다.
 *
 * ── 🔴 왜 만들었나 (2026-11-18 04시 · 5번) ─────────────────────
 * 묶음별 「한 장이 버는 사람」을 세다가 이렇게 읽었다 —
 *
 *     SeoulMarkets 최대 유입은 taiwan 1,439장 · 1,708명
 *
 * **거짓이었다.** 1,708 가운데 1,707이 direct 이고, 그 direct 의 70%가 싱가포르다.
 * 머문 시간 12초 · 사람당 지면 1.0 — 수집기다.
 * 덩달아 「japan 3,736장이 20세션뿐이니 고장났다」는 엉뚱한 물음까지 세웠다.
 * 고장난 것이 아니라 **수집기가 대만만 긁었을 뿐**이다.
 *
 * ⇒ 묶음별 수를 유입원 없이 읽으면 열 배 부풀어 오른다. 그래서 이 자를 둔다.
 *
 * ── ⛔ 이 자가 지키는 것 ──────────────────────────────────────
 * ⛔ direct 를 «버리지» 않는다. 케이라이프맵 direct 1,920은 252초 머물고 11.2장을 본다 —
 *   진짜 사람이다. 버리면 가장 깊게 쓰이는 자리가 0 이 된다.
 * ⛔ 「수집기다」라고 «확정»하지 않는다. 넷을 함께 보여 주고 판단은 사람이 한다.
 * ⛔ 합계만 적지 않는다 — 사이트별이 먼저고 합은 끝에 한 줄이다(사장님 2026-11-15).
 *
 * 쓰는 법
 *   node scripts/잰다-묶음별-사람인가.mjs
 *   node scripts/잰다-묶음별-사람인가.mjs --사이트 seoulmarkets
 *   node scripts/잰다-묶음별-사람인가.mjs --selftest
 */
import { 토큰받기, 재기, 우리것인가, 사이트이름 } from './lib/ga4.mjs';

/** 유입원을 세 갈래로 가른다. ⛔ 모르는 것을 direct 로 밀어 넣지 않는다 */
export function 유입갈래(유입원) {
  const s = String(유입원 ?? '').trim().toLowerCase();
  if (!s) return '못 쟀다';
  if (s === '(direct)' || s === 'direct' || s === '(not set)') return '직접';
  if (/^(chatgpt\.com|chat\.openai\.com|perplexity\.ai|www\.perplexity\.ai|copilot\.microsoft\.com|gemini\.google\.com|claude\.ai)$/.test(s)) return 'AI';
  return '검색·링크';
}

/** 주소에서 묶음 이름을 뽑는다. 첫 칸이 묶음이다 */
export function 묶음이름(경로) {
  const p = String(경로 ?? '').replace(/^\//, '');
  if (!p) return '(홈)';
  const 첫 = p.split('/')[0];
  return 첫 || '(홈)';
}

/**
 * 「사람일 가능성이 낮다」를 가린다. ⛔ 확정이 아니다 — 넷 가운데 셋이 걸릴 때만 말한다.
 * 머문 시간이 짧고 · 사람당 지면이 1.0 이고 · 한 나라에 쏠리면 수집기에 가깝다.
 */
export function 수집기에가까운가({ 머문초, 사람당지면, 한나라몫 }) {
  let 표 = 0;
  if (Number(머문초) <= 20) 표 += 1;
  if (Number(사람당지면) <= 1.1) 표 += 1;
  if (Number(한나라몫) >= 0.6) 표 += 1;
  return 표 >= 3;
}

function 자가시험() {
  const 봄 = []; const 본다 = (이름, 참) => 봄.push({ 이름, 참 });
  본다('① 직접 유입을 가른다', 유입갈래('(direct)') === '직접' && 유입갈래('(not set)') === '직접');
  본다('② AI 를 가른다', 유입갈래('chatgpt.com') === 'AI' && 유입갈래('perplexity.ai') === 'AI');
  /* 🔴 klifemap.ai 는 우리 사이트지 AI 엔진이 아니다 */
  본다('③ klifemap.ai 는 AI 가 아니다', 유입갈래('klifemap.ai') === '검색·링크');
  본다('④ 네이버는 검색이다', 유입갈래('m.search.naver.com') === '검색·링크');
  본다('⑤ 빈 값은 「못 쟀다」', 유입갈래('') === '못 쟀다' && 유입갈래(null) === '못 쟀다');
  본다('⑥ 묶음 이름을 뽑는다', 묶음이름('/taiwan/company/x') === 'taiwan');
  본다('⑦ 홈은 홈이다', 묶음이름('/') === '(홈)' && 묶음이름('') === '(홈)');
  /* 🔴 세 가지가 다 걸려야 수집기라 부른다 — 둘이면 아니다 */
  본다('⑧ 셋 다 걸리면 수집기에 가깝다',
    수집기에가까운가({ 머문초: 12, 사람당지면: 1.0, 한나라몫: 0.7 }) === true);
  본다('⑨ 오래 머물면 아니다',
    수집기에가까운가({ 머문초: 252, 사람당지면: 11.2, 한나라몫: 0.94 }) === false);
  본다('⑩ 둘만 걸리면 아니다',
    수집기에가까운가({ 머문초: 12, 사람당지면: 1.0, 한나라몫: 0.2 }) === false);
  본다('⑪ 여러 장을 보면 아니다',
    수집기에가까운가({ 머문초: 5, 사람당지면: 6, 한나라몫: 0.9 }) === false);
  let 깨짐 = 0;
  for (const s of 봄) if (!s.참) { console.log('🔴 ' + s.이름); 깨짐 += 1; }
  console.log(깨짐 ? '🔴 ' + 깨짐 + '가지 깨졌다' : '✅ ' + 봄.length + '가지 다 통과');
  return 깨짐 === 0;
}

if (process.argv.includes('--selftest') || process.argv.includes('--자가시험')) {
  process.exit(자가시험() ? 0 : 1);
}

const 고른사이트 = (() => {
  const i = process.argv.indexOf('--사이트');
  return i >= 0 && i + 1 < process.argv.length ? String(process.argv[i + 1]).toLowerCase() : null;
})();

const t = await 토큰받기();
if (t.못잼) { console.log('🔴 못 쟀다 —', t.못잼); process.exit(0); }

/* ① 묶음 × 유입갈래 — 몇 세션인가 */
const 줄들 = await 재기(t.토큰, t.속성, ['hostName', 'landingPage', 'sessionSource'],
  { 시작: '28daysAgo', 끝: 'yesterday', 지표: 'sessions' });

/* ② 사이트 × 유입갈래의 «결» — 머문 시간·사람당 지면·나라 */
const 결줄들 = await 재기(t.토큰, t.속성, ['hostName', 'sessionSource', 'country'],
  { 시작: '28daysAgo', 끝: 'yesterday', 지표: 'sessions' });
const 결2 = await 재기(t.토큰, t.속성, ['hostName', 'sessionSource'],
  { 시작: '28daysAgo', 끝: 'yesterday', 지표: 'averageSessionDuration' });
const 결3 = await 재기(t.토큰, t.속성, ['hostName', 'sessionSource'],
  { 시작: '28daysAgo', 끝: 'yesterday', 지표: 'screenPageViewsPerSession' });

const 결 = {};
for (const r of 결2 || []) {
  const [h, s] = r.값;
  if (!우리것인가(h)) continue;
  ((결[사이트이름(h)] ??= {})[유입갈래(s)] ??= {}).머문초 = Math.round(r.수);
}
for (const r of 결3 || []) {
  const [h, s] = r.값;
  if (!우리것인가(h)) continue;
  ((결[사이트이름(h)] ??= {})[유입갈래(s)] ??= {}).사람당지면 = Math.round(r.수 * 10) / 10;
}
const 나라 = {};
for (const r of 결줄들 || []) {
  const [h, s, c] = r.값;
  if (!우리것인가(h)) continue;
  const 칸 = ((나라[사이트이름(h)] ??= {})[유입갈래(s)] ??= {});
  칸[c] = (칸[c] || 0) + r.수;
}

const 묶음 = {};
for (const r of 줄들 || []) {
  const [h, p, s] = r.값;
  if (!우리것인가(h)) continue;
  const 사이트 = 사이트이름(h);
  if (고른사이트 && !String(h).toLowerCase().includes(고른사이트)) continue;
  const 칸 = ((묶음[사이트] ??= {})[묶음이름(p)] ??= { 직접: 0, AI: 0, '검색·링크': 0, '못 쟀다': 0, 장: new Set() });
  칸[유입갈래(s)] += r.수;
  칸.장.add(p);
}

console.log('\n📏 묶음마다 «사람이 온 것»과 «수집기가 긁은 것»을 가른다 — 28일\n');

for (const [사이트, 표] of Object.entries(묶음)) {
  /* 이 사이트의 direct 가 사람인지 먼저 가린다 */
  const 결칸 = (결[사이트] || {})['직접'] || {};
  const 나라칸 = (나라[사이트] || {})['직접'] || {};
  const 나라합 = Object.values(나라칸).reduce((a, b) => a + b, 0);
  const 으뜸나라 = Object.entries(나라칸).sort((a, b) => b[1] - a[1])[0] || ['(못 쟀다)', 0];
  const 한나라몫 = 나라합 ? 으뜸나라[1] / 나라합 : 0;
  const 의심 = 수집기에가까운가({
    머문초: 결칸.머문초 ?? 999, 사람당지면: 결칸.사람당지면 ?? 99, 한나라몫,
  });

  console.log('■ ' + 사이트);
  console.log('   직접 유입의 결 — 머문 ' + (결칸.머문초 ?? '?') + '초 · 사람당 지면 '
    + (결칸.사람당지면 ?? '?') + ' · ' + 으뜸나라[0] + ' ' + Math.round(한나라몫 * 100) + '%'
    + (의심 ? '   🔴 수집기에 가깝다 — 아래 「직접」 칸을 사람으로 세지 않는다'
      : '   ✅ 사람으로 보인다'));
  console.log('   묶음'.padEnd(20) + '장수   직접   AI  검색·링크    사람으로 볼 것');
  console.log('   ' + '─'.repeat(64));
  const 줄 = Object.entries(표).sort((a, b) =>
    (b[1].AI + b[1]['검색·링크'] + (의심 ? 0 : b[1].직접))
    - (a[1].AI + a[1]['검색·링크'] + (의심 ? 0 : a[1].직접)));
  for (const [이름, v] of 줄.slice(0, 10)) {
    const 사람 = v.AI + v['검색·링크'] + (의심 ? 0 : v.직접);
    console.log('   ' + 이름.padEnd(18) + String(v.장.size).padStart(5)
      + String(v.직접).padStart(7) + String(v.AI).padStart(5)
      + String(v['검색·링크']).padStart(10) + String(사람).padStart(16));
  }
  console.log('');
}

console.log('  ⛔ 「직접」 칸은 수집기일 수 있다. 머문 시간·사람당 지면·나라 쏠림 셋을 함께 본다.');
console.log('  ⛔ 그렇다고 direct 를 버리지 않는다 — 케이라이프맵 direct 는 252초 머무는 진짜 사람이다.\n');
