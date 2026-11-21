/**
 * ga4.mjs — GA4 에서 «순방문자»를 받아 오는 한 자리.
 * ────────────────────────────────────────────────────────────────────────────
 * [왜 따로 뽑았나 — 2026-09-17]
 *   우리는 방문자 수를 «두 곳»에서 재고 있었고, 그 둘이 무엇을 세는지가 달랐다.
 *
 *   ```
 *   우리 계수기(src/lib/traffic.mjs → R2)   쿠키·IP 를 «일부러» 안 남긴다
 *                                          ⇒ 셀 수 있는 것은 «지면 요청 건수»뿐이다
 *   GA4                                     브라우저에 쿠키를 심는다
 *                                          ⇒ «같은 사람 여러 번»을 한 명으로 묶는다
 *   ```
 *
 *   그런데 `유닛별-방문자.mjs` 는 앞의 것(요청 건수)을 읽어 «순방문자»라고 적고,
 *   사장님의 「하루 1,000명」 목표에 대고 백분율까지 냈다. 실측으로 300배쯤 부풀었다.
 *   ⇒ **순방문자는 순방문자를 셀 수 있는 자에게 묻는다.** 그 길을 여기 한 곳에 둔다.
 *
 * [⛔ 이 자가 «하지 않는» 것]
 *   · GA4 가 덜 세는 것을 보정하지 않는다 — 광고차단·쿠키거부로 늘 «바닥값»이다
 *   · 오늘치를 기본으로 넣지 않는다. 하루가 안 끝나 늘 낮게 나오고 「떨어졌다」로 오독된다
 *   · 열쇠가 없으면 0 을 내지 않는다. **null 을 낸다** — 「손님이 없다」와 「못 쟀다」는 다르다
 */
import { readFileSync, existsSync } from 'node:fs';
import { createSign } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const 갈래 = 'https://www.googleapis.com/auth/analytics.readonly';

/** 우리 사이트인가 — 시험서버·백업·localhost 는 손님이 아니다 */
export function 우리것인가(호스트) {
  const h = String(호스트 ?? '').toLowerCase();
  if (!h) return false;
  if (/^(localhost|127\.0\.0\.1)/.test(h)) return false;
  if (h.includes('cloudtype.app')) return false;      /* 배포 확인용 주소 */
  if (h.includes('github.io')) return false;          /* 백업 경로 */
  return /(100yearmap|klifemap|kculturewire|seoulmarkets)\./.test(h);
}

/** www 를 떼어 한 사이트로 묶는다 — www 와 민얼굴이 갈리면 수가 반으로 쪼개져 보인다 */
export function 사이트이름(호스트) {
  return String(호스트 ?? '').toLowerCase().replace(/^www\./, '');
}

/** `20260917` → `2026-09-17` */
export function 날짜풀기(s) {
  const t = String(s ?? '');
  return /^\d{8}$/.test(t) ? `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6)}` : t;
}

/** 저장소 뿌리 */
const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/** `.env` 를 읽어 없는 것만 채운다 — 다른 자와 같은 길 */
export function 환경읽기() {
  const env = path.join(뿌리, '.env');
  if (!existsSync(env)) return;
  for (const 줄 of readFileSync(env, 'utf8').split(/\r?\n/)) {
    const m = 줄.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

/**
 * 서비스 계정으로 토큰을 받는다.
 * @returns {Promise<{토큰:string, 속성:string}|{못잼:string}>}  ⛔ 못 받으면 «못잼»이지 0 이 아니다
 */
export async function 토큰받기() {
  환경읽기();
  const 키파일 = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const 속성 = process.env.GA4_PROPERTY_ID;
  if (!키파일 || !existsSync(키파일)) return { 못잼: '서비스 계정 키가 없다' };
  if (!속성) return { 못잼: 'GA4_PROPERTY_ID 가 없다' };

  const 키 = JSON.parse(readFileSync(키파일, 'utf8'));
  const 지금 = Math.floor(Date.now() / 1000);
  const 헤더 = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const 몸 = Buffer.from(JSON.stringify({
    iss: 키.client_email, scope: 갈래, aud: 'https://oauth2.googleapis.com/token',
    iat: 지금, exp: 지금 + 3600,
  })).toString('base64url');
  const 대상 = `${헤더}.${몸}`;
  const jwt = `${대상}.${createSign('RSA-SHA256').update(대상).sign(키.private_key, 'base64url')}`;
  const tr = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  });
  const tj = await tr.json();
  if (!tj.access_token) return { 못잼: '토큰을 못 받았다' };
  return { 토큰: tj.access_token, 속성 };
}

/**
 * runReport 한 번. 차원 이름 배열을 주면 `{값:[…], 수}` 줄들을 돌려준다.
 * ⛔ 줄이 안 오면 빈 배열이 아니라 null 이다 — 「0명」과 「못 쟀다」를 가른다.
 */
export async function 재기(토큰, 속성, 차원들, { 시작 = '30daysAgo', 끝 = 'yesterday', 지표 = 'totalUsers' } = {}) {
  const r = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${속성}:runReport`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${토큰}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dateRanges: [{ startDate: 시작, endDate: 끝 }],
      dimensions: 차원들.map((n) => ({ name: n })),
      metrics: [{ name: 지표 }],
      limit: 100000,
    }),
  });
  const j = await r.json();
  if (!j.rows) return null;
  return j.rows.map((x) => ({ 값: x.dimensionValues.map((v) => v.value), 수: Number(x.metricValues[0].value) }));
}

/**
 * 「사이트별 · 날짜별 순방문자」 한 판. 다른 자가 가장 많이 쓰는 꼴이라 여기 둔다.
 * @returns {Promise<{사이트날짜별:Object, 날짜별:Object, 날들:string[]}|{못잼:string}>}
 */
export async function 사이트날짜별방문자({ 일 = 30, 끝 = 'yesterday' } = {}) {
  const t = await 토큰받기();
  if (t.못잼) return t;
  const 줄들 = await 재기(t.토큰, t.속성, ['date', 'hostName'], { 시작: `${일}daysAgo`, 끝 });
  if (줄들 === null) return { 못잼: 'GA4 가 줄을 안 줬다' };

  const 날짜별 = {};
  const 사이트날짜별 = {};
  for (const r of 줄들) {
    const [d, h] = r.값;
    if (!우리것인가(h)) continue;
    const 날 = 날짜풀기(d);
    const s = 사이트이름(h);
    날짜별[날] = (날짜별[날] || 0) + r.수;
    (사이트날짜별[s] ??= {})[날] = (사이트날짜별[s][날] || 0) + r.수;
  }
  return { 사이트날짜별, 날짜별, 날들: Object.keys(날짜별).sort() };
}

/**
 * 「사이트 → 하루 평균 순방문자」. 유닛별 보고가 쓰는 한 줄.
 * ⚠ 평균을 내는 분모는 «GA4 가 준 날 수»다. 안 준 날을 
 */
export function 하루평균(사이트날짜별) {
  const 표 = new Map();
  for (const [s, 날들] of Object.entries(사이트날짜별 ?? {})) {
    const 값 = Object.values(날들);
    if (!값.length) continue;
    표.set(s, { 평균: 값.reduce((a, b) => a + b, 0) / 값.length, 날수: 값.length });
  }
  return 표;
}

/**
 * 🔴 [2026-10-17] 이 날 수가 「집계가 덜 된 것」으로 보이나.
 *
 *   그날 잰 것 — 10-15 118명 · 10-16 **11명** · 10-17 줄조차 없음.
 *   그런데 실시간 창구에는 세 사람이 우리 지면을 보고 있었고 태그도 다섯 곳 다 쏘고 있었다.
 *   ⇒ 11명은 「열한 명이 왔다」가 아니라 «아직 다 안 세어졌다»다.
 *
 * ⛔ 「적게 왔다」와 「덜 세어졌다」는 다른 일이다. 가를 수 없으면 «못 쟀다»고 적는다.
 * ⚠ 단정하지 않는다 — 가운데값의 1/4 아래로 내려간 날만 의심한다.
 *   진짜로 줄어든 날까지 가려 버리면 그것도 고장이다.
 */
export function 집계덜됐나(수, 다른날들) {
  const 짝 = (다른날들 ?? []).filter((x) => Number.isFinite(x) && x > 0);
  if (짝.length < 3) return false;                /* 견줄 것이 없으면 의심하지 않는다 */
  const 정 = [...짝].sort((a, b) => a - b);
  const 가 = 정.length % 2 ? 정[(정.length - 1) / 2]
    : (정[정.length / 2 - 1] + 정[정.length / 2]) / 2;
  if (가 < 20) return false;                      /* 원래 수가 작으면 흔들림과 못 가른다 */
  return Number(수) < 가 * 0.25;
}

/** 날짜별 표에서 «집계가 덜 된 것으로 보이는 날»의 날짜를 뽑는다 */
export function 집계덜된날들(날짜별) {
  const 날들 = Object.keys(날짜별 ?? {}).sort();
  return 날들.filter((d) =>
    집계덜됐나(날짜별[d], 날들.filter((x) => x !== d).map((x) => 날짜별[x])));
}
