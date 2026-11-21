#!/usr/bin/env node
/**
 * check-만세력손님-안으로-가나.mjs — **유일하게 도는 문으로 들어온 손님이 안으로 걸어가나.**
 *
 * ── 🔴 왜 (2026-10-05 20:4x · 5번) ───────────────────────────────────
 *   사장님: 「**언제까지 검색에 우리 것이 잘 노출되는 걸 기다려야 하냐?**」
 *
 *   실측 — KLifeMap 28일 «진짜 손님» 60명 가운데 **37명(62%)이 다음 카페**에서
 *   오고, 그중 **36명이 /mansecalendar.html 한 장**으로 들어온다. 구글은 1명이다.
 *
 *   🔴 **내가 처음에 틀리게 짚었다 — 지우지 않고 남긴다.**
 *     그 지면 본문에 안으로 가는 링크가 넷뿐이고 셋은 새 탭으로 열리며,
 *     사장님 최우선 키워드 「오늘의 운세」(/ilzin.html)로 가는 길은 본문에
 *     하나도 없다 — 그래서 **「문 안쪽이 막혔다」고 보고 이 자를 만들었다.**
 *
 *     재 보니 **아니었다.** 세션당 2.44장 · 참여율 71.1% · 머문 시간 218초,
 *     38명 중 29명이 /saju.html 로 걸어간다. 차림표만으로도 손님은 움직인다.
 *
 *   ⭐ 막힌 것은 문 안쪽이 아니라 **문이 하나뿐**이라는 것이다.
 *     들어오는 수가 38명이고, 그 38명은 잘 돌아다닌다.
 *     ⛔ 링크를 더 다는 쪽으로 힘을 쓰면 안 되는 자리였다.
 *
 * ── ⛔ 이 자가 지키는 것 ─────────────────────────────────────────────
 *   「링크를 달았다」를 「손님이 걸어간다」로 세지 않는다. **GA4 로 실제 걸음을 센다.**
 *   ⚠ Direct 는 우리가 라이브를 확인한 것이다(사장님 판정). **걷어내고 센다.**
 *
 * ── 이 자가 내는 것 ──────────────────────────────────────────────────
 *   ① 만세력에 떨어진 세션이 **몇 장**을 보나 · 얼마나 머무나
 *   ② 그 세션이 **두 번째로 어느 지면**에 가나
 *   ③ 못 박은 수 — 세션당 지면 수가 이보다 낮으면 🔴
 *
 * 쓰는 법
 *   node scripts/check-만세력손님-안으로-가나.mjs
 *   node scripts/check-만세력손님-안으로-가나.mjs --날수 90
 *   node scripts/check-만세력손님-안으로-가나.mjs --자가시험
 *   node scripts/check-만세력손님-안으로-가나.mjs --체크리스트
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 여기 = path.dirname(fileURLToPath(import.meta.url));
const 뿌리 = path.join(여기, '..');
const 속성 = '549135289';

/* ── 못 박은 수 ────────────────────────────────────────────────────────
 * 🔴 2026-10-05 실측 — **내 짐작이 틀렸다.**
 *   「본문 링크가 넷뿐이니 막혔을 것」이라 보고 이 자를 만들었는데, 재 보니
 *   세션 45 · 사람 38 · **세션당 2.44장** · 참여율 71.1% · 머문 시간 218초였다.
 *   38명 중 29명이 /saju.html 로 걸어간다. **문 안쪽은 안 막혀 있었다.**
 *
 *   ⭐ 막힌 것은 문 안쪽이 아니라 **문이 하나뿐**이라는 것이다. 들어오는 수가
 *     38명이고, 그 38명은 잘 돌아다닌다. 늘려야 할 것은 걸음이 아니라 «문»이다.
 *
 * ⚠ 그래서 이 수는 「늘려야 할 목표」가 아니라 «줄면 막는» 기준선이다.
 *   실측 2.44 에서 재는 흔들림을 보고 2.00 으로 둔다. */
export const 못박은_세션당지면 = 2.00;

export function 판정(세션당지면) {
  if (세션당지면 === null || 세션당지면 === undefined || !Number.isFinite(세션당지면)) {
    return { 빛: '⬜', 말: '못 쟀다 — 카페에서 온 줄이 없다' };
  }
  if (세션당지면 < 못박은_세션당지면) {
    return { 빛: '🔴', 말: `만세력 손님이 ${세션당지면.toFixed(2)}장만 본다 (못 박은 수 ${못박은_세션당지면.toFixed(2)})` };
  }
  return { 빛: '✅', 말: `만세력 손님이 세션당 ${세션당지면.toFixed(2)}장을 본다` };
}

/* ⚠ .env 를 먼저 읽는다 — 열쇠 경로가 거기 있다 */
function 환경읽기() {
  try {
    const 본문 = fs.readFileSync(path.join(뿌리, '.env'), 'utf8');
    for (const 줄 of 본문.split(/\r?\n/)) {
      const m = 줄.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
      if (m && process.env[m[1]] === undefined) {
        process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
      }
    }
  } catch { /* 없으면 그만 */ }
}

function 열쇠읽기() {
  환경읽기();
  for (const 이름 of ['gsc-sa.json', 'ga4-sa.json', 'search-console-sa.json']) {
    const p = path.join(뿌리, 'secrets', 이름);
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
  }
  const env = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (env && fs.existsSync(env)) return JSON.parse(fs.readFileSync(env, 'utf8'));
  throw new Error('서비스 계정 열쇠를 못 찾았다 (secrets/gsc-sa.json)');
}

/** ⛔ toISOString() 금지 — UTC 라 새벽에 하루가 어긋난다 */
export function 날글(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/* ── 자가시험 ─────────────────────────────────────────────────────── */
if (process.argv.includes('--자가시험')) {
  let 깨짐 = 0;
  const 본다 = (말, 참) => { console.log((참 ? '  ✅ ' : '  🔴 ') + 말); if (!참) 깨짐++; };

  본다('1. 못 쟀을 때 ⬜ 다 ()', 판정(null).빛 === '⬜');
  본다('2. undefined 도 ⬜ 다', 판정(undefined).빛 === '⬜');
  본다('3. NaN 도 ⬜ 다 — 나눗셈이 깨진 자리를 0 으로 읽지 않는다', 판정(NaN).빛 === '⬜');
  본다('4. 못 박은 수보다 낮으면 🔴', 판정(1.9).빛 === '🔴');
  본다('5. 못 박은 수와 같으면 ✅', 판정(2.00).빛 === '✅');
  본다('6. 못 박은 수보다 높으면 ✅', 판정(2.4).빛 === '✅');
  본다('7. 🔴 말에 잰 수가 들어 있다', 판정(1.9).말.includes('1.90'));
  본다('8. ✅ 말에도 잰 수가 들어 있다', 판정(2.4).말.includes('2.40'));
  본다('9. 날글이 KST 그대로다 — UTC 로 밀리지 않는다',
    날글(new Date(2026, 0, 1, 0, 30)) === '2026-01-01');
  본다('10. 날글이 한 자리 달·날을 0 으로 채운다',
    날글(new Date(2026, 8, 7)) === '2026-09-07');
  본다('11. 못 박은 수가 2.00 이다 — 실측 2.44 에서 흔들림을 본 자리다',
    못박은_세션당지면 === 2.00);
  본다('12. 0 도 🔴 다 — 0 을 「못 쟀다」로 섞지 않는다', 판정(0).빛 === '🔴');

  console.log(`\n  깨짐 ${깨짐}`);
  process.exit(깨짐 ? 1 : 0);
}

/* ── 실제로 잰다 ───────────────────────────────────────────────────── */
const 날수 = (() => {
  const i = process.argv.indexOf('--날수');
  return i >= 0 && process.argv[i + 1] ? Number(process.argv[i + 1]) : 28;
})();
const 체크리스트 = process.argv.includes('--체크리스트');

const 열쇠 = 열쇠읽기();

/* ⚠ google-auth-library 가 이 저장소에 없다 — JWT 를 직접 만든다.
   ⛔ GA4 의 scope 는 서치콘솔과 다르다. analytics.readonly 다. */
async function 토큰받기() {
  const { createSign } = await import('node:crypto');
  const 지금초 = Math.floor(Date.now() / 1000);
  const 머리 = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const 몸 = Buffer.from(JSON.stringify({
    iss: 열쇠.client_email,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: 지금초, exp: 지금초 + 3600,
  })).toString('base64url');
  const 서명 = createSign('RSA-SHA256').update(머리 + '.' + 몸).sign(열쇠.private_key, 'base64url');
  const 답 = await (await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: 머리 + '.' + 몸 + '.' + 서명,
    }),
  })).json();
  if (!답.access_token) throw new Error('토큰 실패 — ' + JSON.stringify(답).slice(0, 160));
  return 답.access_token;
}
const 토큰 = await 토큰받기();

async function 물어보다(몸) {
  const r = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${속성}:runReport`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${토큰}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(몸),
  });
  if (!r.ok) throw new Error(`GA4 ${r.status} ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

const 끝 = new Date();
const 시작 = new Date(끝.getTime() - (날수 - 1) * 86400000);
const 기간 = [{ startDate: 날글(시작), endDate: 날글(끝) }];

/* ⚠ Direct 는 우리가 누른 것이다 — 걷어낸다.
   ⛔ 그냥 「만세력 세션」을 세면 385명이 우리 발자국이라 수가 거짓이 된다. */
const 진짜손님만 = {
  andGroup: {
    expressions: [
      { filter: { fieldName: 'landingPagePlusQueryString', stringFilter: { matchType: 'CONTAINS', value: 'mansecalendar' } } },
      { notExpression: { filter: { fieldName: 'sessionSource', stringFilter: { matchType: 'EXACT', value: '(direct)' } } } },
    ],
  },
};

if (!체크리스트) {
  console.log(`■ 만세력으로 들어온 손님이 «안으로» 걸어가나 — ${날글(시작)} ~ ${날글(끝)}`);
  console.log('   이 지면 한 장이 28일 진짜 손님 60명 중 36명을 데려온다. 그 다음이 문제다');
  console.log('   ⚠ Direct(우리가 누른 것)를 걷어내고 셌다\n');
}

/* ① 세션당 지면 수 */
const 한눈 = await 물어보다({
  dateRanges: 기간,
  metrics: [
    { name: 'sessions' },
    { name: 'totalUsers' },
    { name: 'screenPageViewsPerSession' },
    { name: 'averageSessionDuration' },
    { name: 'engagementRate' },
  ],
  dimensionFilter: 진짜손님만,
});

const m = 한눈.rows?.[0]?.metricValues ?? null;
const 세션 = m ? Number(m[0].value) : 0;
const 사람 = m ? Number(m[1].value) : 0;
const 세션당지면 = (m && 세션 > 0) ? Number(m[2].value) : null;
const 머문초 = m ? Math.round(Number(m[3].value)) : null;
const 참여율 = m ? Number(m[4].value) : null;

const 판 = 판정(세션당지면);

if (체크리스트) {
  console.log(`${판.빛} ${판.말} (세션 ${세션} · 사람 ${사람})`);
  process.exit(판.빛 === '🔴' ? 1 : 0);
}

console.log('── ① 만세력에 떨어진 세션 (Direct 뺀 것) ──');
console.log(`   세션 ${세션} · 사람 ${사람}`);
console.log(`   세션당 지면 ${세션당지면 === null ? '못 쟀다' : 세션당지면.toFixed(2) + '장'}`);
console.log(`   머문 시간 ${머문초 === null ? '못 쟀다' : 머문초 + '초'}`);
console.log(`   참여율 ${참여율 === null ? '못 쟀다' : (참여율 * 100).toFixed(1) + '%'}`);
console.log(`   ${판.빛} ${판.말}\n`);

/* ② 그 세션이 본 지면 목록 — 만세력 말고 어디에 갔나 */
const 간곳 = await 물어보다({
  dateRanges: 기간,
  dimensions: [{ name: 'pagePath' }],
  metrics: [{ name: 'screenPageViews' }, { name: 'totalUsers' }],
  dimensionFilter: 진짜손님만,
  orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
  limit: 25,
});

console.log('── ② 그 손님이 «본» 지면 (만세력에 떨어진 세션 안에서) ──');
const 줄들 = 간곳.rows ?? [];
if (!줄들.length) {
  console.log('   ⬜ 못 쟀다 — 줄이 없다\n');
} else {
  console.log('   조회  사람   지면');
  let 안쪽 = 0; let 전체 = 0;
  for (const r of 줄들) {
    const 길 = r.dimensionValues[0].value;
    const 조회 = Number(r.metricValues[0].value);
    const 봄 = Number(r.metricValues[1].value);
    전체 += 조회;
    if (!/mansecalendar/.test(길)) 안쪽 += 조회;
    console.log(`   ${String(조회).padStart(4)}  ${String(봄).padStart(4)}   ${길.slice(0, 60)}`);
  }
  const 비율 = 전체 > 0 ? (안쪽 / 전체 * 100) : null;
  console.log(`\n   만세력 말고 다른 지면을 본 조회 ${안쪽} / ${전체}` +
    (비율 === null ? '' : ` (${비율.toFixed(1)}%)`));
  if (안쪽 === 0) {
    console.log('   🔴 **한 사람도 안으로 안 들어갔다** — 문 안쪽이 막혀 있다');
  }
}

console.log('\n⭐ 이 자는 «줄면 막는» 자다 — 걸음은 이미 되고 있다(실측 2.44장).');
console.log('   늘려야 할 것은 걸음이 아니라 «문»이다. 들어오는 사람이 38명뿐이다');
console.log('⛔ 「링크를 더 단다」로 이 수를 올리려 하지 않는다 — 올릴 자리가 아니다');
