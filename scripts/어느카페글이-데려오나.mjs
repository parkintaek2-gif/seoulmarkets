#!/usr/bin/env node
/**
 * 어느카페글이-데려오나.mjs — **우리를 데려온 카페 글 «그 자체»를 찾아낸다.**
 *
 * ── 🔴 왜 (2026-10-05 20:5x · 5번) ───────────────────────────────────
 *   사장님: 「**언제까지 검색에 우리 것이 잘 노출되는 걸 기다려야 하냐?**」
 *
 *   28일 실측이 말하는 것은 이것이다 —
 *   ```
 *   KLifeMap 진짜 손님        60명
 *     다음 카페                37명 (62%)   ← 글 «몇 개»가 이걸 냈다
 *     네이버                   12명
 *     구글                      1명
 *   ```
 *   ⭐ **카페 글 하나가 우리 사이트 전체 유입의 절반을 넘긴다.**
 *     우리는 지면을 3,000장 냈다. 그 3,000장이 구글에서 1명을 데려왔다.
 *     남이 쓴 카페 글 하나가 36명을 데려왔다. **자릿수가 다르다.**
 *
 *   ⛔ 「카페가 62%다」로 끝내면 아무것도 못 한다. 그 글을 찾아야
 *     ① 어느 카페인지 ② 무슨 말로 썼는지 ③ 우리가 그 자리에 더 낼 수 있는지
 *     를 안다. **되는 것을 찾았으면 그것을 복제한다.**
 *
 * ── 🔴 hostName 으로 가르지 않으면 수가 거짓이 된다 ─────────────────
 *   GA4 속성 549135289 **하나에 네 사이트가 다 들어 있다.** 필터를 안 걸고
 *   재면 KLifeMap 수에 SeoulMarkets·백년지도·K Culture Wire 가 섞여 들어온다.
 *   이 자를 처음 돌렸을 때 바깥 유입이 550명으로 나왔는데, 같은 날 KLifeMap만
 *   재서 올린 보고는 60명이었다. **이미 아는 함정에 또 빠진 것이다.**
 *   ⇒ 이제 hostName 을 차원에 넣어 «사이트별로» 가른다.
 *
 * ── ⚠ pageReferrer 는 «지면 범위» 차원이다 ───────────────────────────
 *   sessionSource 는 「cafe.daum.net」까지만 알려 준다. 어느 «글»인지는
 *   pageReferrer 에 full URL 로 들어온다. 둘은 같은 것이 아니다.
 *   ⛔ 못 받아 오면 「없다」가 아니라 «못 쟀다»로 적는다. 
 *
 * 쓰는 법
 *   node scripts/어느카페글이-데려오나.mjs
 *   node scripts/어느카페글이-데려오나.mjs --날수 90
 *   node scripts/어느카페글이-데려오나.mjs --모두      (카페 말고 전부)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 여기 = path.dirname(fileURLToPath(import.meta.url));
const 뿌리 = path.join(여기, '..');
const 속성 = '549135289';

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

/** ⛔ toISOString() 금지 */
function 날글(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const 날수 = (() => {
  const i = process.argv.indexOf('--날수');
  return i >= 0 && process.argv[i + 1] ? Number(process.argv[i + 1]) : 28;
})();
const 모두 = process.argv.includes('--모두');

const 열쇠 = 열쇠읽기();

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

/** 못 받아 오면 던지지 않고 «까닭»을 돌려준다 — 「없다」와 「못 쟀다」를 가른다 */
async function 물어보다(몸) {
  const r = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${속성}:runReport`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${토큰}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(몸),
  });
  if (!r.ok) return { 못쟀다: `GA4 ${r.status} ${(await r.text()).slice(0, 160)}` };
  return r.json();
}

const 끝 = new Date();
const 시작 = new Date(끝.getTime() - (날수 - 1) * 86400000);
const 기간 = [{ startDate: 날글(시작), endDate: 날글(끝) }];

console.log(`■ 우리를 데려온 «글 그 자체»를 찾는다 — ${날글(시작)} ~ ${날글(끝)}`);
console.log('   남이 쓴 카페 글 하나가 36명을 데려왔다. 우리 지면 3,000장은 구글에서 1명이다\n');

/* ── ① pageReferrer 로 글 주소까지 ───────────────────────────────── */
const 거른다 = 모두 ? undefined : {
  filter: { fieldName: 'pageReferrer', stringFilter: { matchType: 'CONTAINS', value: 'cafe.daum.net' } },
};

const j = await 물어보다({
  dateRanges: 기간,
  dimensions: [{ name: 'pageReferrer' }, { name: 'landingPagePlusQueryString' }, { name: 'hostName' }],
  metrics: [{ name: 'totalUsers' }, { name: 'sessions' }],
  ...(거른다 ? { dimensionFilter: 거른다 } : {}),
  orderBys: [{ metric: { metricName: 'totalUsers' }, desc: true }],
  limit: 40,
});

if (j.못쟀다) {
  console.log('   ⬜ **못 쟀다** — ' + j.못쟀다);
  console.log('   ⚠ pageReferrer 를 이 속성에서 못 쓰면 다른 길을 찾는다 (아래 ②)');
} else {
  const 줄들 = (j.rows ?? []).filter((r) => {
    const v = r.dimensionValues[0].value;
    return v && v !== '(not set)';
  });
  if (!줄들.length) {
    console.log('   ⬜ 글 주소가 안 잡혔다 — pageReferrer 가 (not set) 뿐이다');
    console.log('   ⚠ 「카페에서 안 왔다」가 아니다. 주소를 «못 쟀다»는 것이다');
  } else {
    console.log('   사람  세션   데려온 글 → 떨어진 지면');
    for (const r of 줄들) {
      const 글 = r.dimensionValues[0].value;
      const 떨 = r.dimensionValues[1].value;
      const 집 = r.dimensionValues[2].value;
      const 사람 = Number(r.metricValues[0].value);
      const 세션 = Number(r.metricValues[1].value);
      console.log(`   ${String(사람).padStart(4)}  ${String(세션).padStart(4)}   ${글}`);
      console.log(`                 → ${집}${떨.slice(0, 60)}`);
    }
  }
}

/* ── ② 바깥에서 온 모든 출처 — 어디가 도는 문인가 ─────────────────── */
console.log('\n── ② 바깥에서 오는 모든 문 — «사이트별로» 가른다 (Direct 뺀 것) ──');
console.log('   🔴 hostName 으로 안 가르면 네 사이트가 섞여 수가 거짓이 된다\n');
const j2 = await 물어보다({
  dateRanges: 기간,
  dimensions: [{ name: 'hostName' }, { name: 'sessionSource' }],
  metrics: [{ name: 'totalUsers' }, { name: 'sessions' }, { name: 'averageSessionDuration' }],
  dimensionFilter: {
    notExpression: {
      filter: { fieldName: 'sessionSource', stringFilter: { matchType: 'EXACT', value: '(direct)' } },
    },
  },
  orderBys: [{ metric: { metricName: 'totalUsers' }, desc: true }],
  limit: 250,
});

if (j2.못쟀다) {
  console.log('   ⬜ 못 쟀다 — ' + j2.못쟀다);
} else {
  const 줄들 = j2.rows ?? [];
  if (!줄들.length) {
    console.log('   ⬜ 줄이 없다');
  } else {
    /* 사이트별로 모은다 */
    const 집마다 = new Map();
    for (const r of 줄들) {
      const 집 = r.dimensionValues[0].value;
      if (!집마다.has(집)) 집마다.set(집, []);
      집마다.get(집).push({
        출처: r.dimensionValues[1].value,
        사람: Number(r.metricValues[0].value),
        세션: Number(r.metricValues[1].value),
        초: Math.round(Number(r.metricValues[2].value)),
      });
    }
    const 차례 = [...집마다.entries()]
      .map(([집, 줄]) => ({ 집, 줄, 합: 줄.reduce((a, b) => a + b.사람, 0) }))
      .sort((a, b) => b.합 - a.합);
    for (const { 집, 줄, 합 } of 차례) {
      if (합 < 3) continue;
      console.log(`   ■ ${집} — 바깥에서 ${합}명`);
      for (const l of 줄.sort((a, b) => b.사람 - a.사람).slice(0, 10)) {
        console.log(`      ${String(l.사람).padStart(4)}명 ${String(l.세션).padStart(4)}세션 ${String(l.초 + '초').padStart(7)}  ${l.출처}`);
      }
      console.log('');
    }
  }
}

console.log('\n⭐ 찾았으면 할 것 — 그 카페에 우리가 «직접» 올린다. 구글을 기다리지 않는 길이다');
console.log('⛔ 「카페가 62%다」로 끝내지 않는다. 글을 찾아야 복제할 수 있다');
