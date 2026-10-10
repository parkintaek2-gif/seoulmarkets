#!/usr/bin/env node
/**
 * ga4-report.mjs — **GA4 에서 순방문자수를 읽는다.** (5번, 2026-08-23)
 *
 * ── 왜 ───────────────────────────────────────────────────────
 * 방문자수를 오늘까지 「⚠ 못 잼」으로 보고했다. 그런데 GA4 태그는 이미 붙어 있고
 * 살아 있다(`src/components/Analytics.astro`) — **수는 구글 쪽에 쌓이고 있었고**,
 * 없던 것은 그것을 코드로 읽어 오는 창구였다. 그 창구가 GA4 Data API 다.
 *
 * ⭐ **속성 ID 를 사장님께 여쭙지 않는다.** Admin API 의 `accountSummaries` 가
 *   「이 계정이 볼 수 있는 속성」을 돌려주므로 **스스로 찾는다.** 사람 손을 한 번 덜 쓴다.
 *
 * ── ⛔ 이 자가 지키는 것 ─────────────────────────────────────
 * ⛔ **열쇠를 화면에 안 찍는다.** 계정 주소(공개 식별자)까지만 적는다.
 * ⛔ **막힌 곳을 「0」으로 적지 않는다.** 권한이 없으면 「못 쟀다」와 **무엇을 켜야 하는지**를
 *   적는다. 짐작한 방문자수를 내보내는 것이 못 재는 것보다 나쁘다.
 * ⛔ 쿠키·IP 를 우리가 따로 남기지 않는다(2026-08-05 결정). 이 자는 **읽기만** 한다.
 *
 * 쓰는 법
 *   node scripts/ga4-report.mjs --찾는다          볼 수 있는 속성을 찾는다
 *   node scripts/ga4-report.mjs --days 28         순방문자수를 잰다
 *   node scripts/ga4-report.mjs --속성=123456789 --days 7
 *   node scripts/ga4-report.mjs --selftest
 */
import { readFileSync, existsSync } from 'node:fs';
import { createSign } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
/* ⛔ 호스트→유닛 표를 여기에 «복사하지» 않는다. 두 곳에 두면 사이트가 하나 늘 때
   한쪽만 고쳐지고, 그때부터 두 자가 다른 수를 낸다. 한 곳에서 불러다 쓴다. */
import { 유닛찾기, 우리것, 유닛차례 } from './unit-hosts.mjs';

/* ⚠ Node 가 .env 를 자동으로 안 읽는다. search-console-report.mjs 와 같은 방식이다 */
(function 환경파일읽기() {
  try {
    const 본문 = readFileSync(path.resolve('.env'), 'utf8');
    for (const 줄 of 본문.split(/\r?\n/)) {
      const m = 줄.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
      if (!m) continue;
      const 값 = m[2].trim().replace(/^["']|["']$/g, '');
      if (process.env[m[1]] === undefined) process.env[m[1]] = 값;
    }
  } catch { /* .env 없으면 정상 */ }
})();

export const 갈래 = 'https://www.googleapis.com/auth/analytics.readonly';

/**
 * ⭐ 호스트 → 유닛. 사장님이 물으셨다(2026-08-23 21:4x) — 「다른 유닛도 측정해야 하는 거 아냐?」
 *   속성 하나가 네 사이트를 다 담으므로 **한 번 재면 여섯 자리 것이 같이 나온다.**
 *   각 유닛이 따로 붙일 것이 없다. 이름을 붙여 한 줄씩 낸다.
 * ⛔ `www.` 붙은 줄과 안 붙은 줄을 **따로 세지 않는다** — 같은 사이트다. 더해서 한 줄로 낸다.
 *   처음엔 따로 찍혀서 kculturewire 가 60·42 두 줄로 나뉘어 있었다. 그러면 작아 보인다.
 * ⛔ 우리가 띄운 개발 서버(localhost·127.0.0.1)는 **손님이 아니다.** 갈라 내고 합계에서 뺀다.
 */
/**
 * 🔴🔴 [2026-10-10 21:2x · 5번] **같은 이름표가 «네 곳»에 흩어져 있었다.**
 *
 * 22시 방문자 방송이 담당을 뒤바꿔 내고 있었다 — 「6번 SeoulMarkets」·「5번 K Culture Wire」.
 * 지금 분장과 반대다(5번이 SeoulMarkets 개발·감수, 2번이 분담, 콘텐트는 1번).
 * 3·4·6번은 사장님이 2026-10-04 에 「원래 안쓰잖아」라고 하신 자리다.
 *
 * ⛔ 고치려고 보니 같은 표가 **네 곳**에 있었다 — `broadcast-visitors-dwell.mjs` ·
 *   `유닛별-방문자.mjs` · 여기 · 그리고 그 결과가 `src/data/real-readers.json` 에 굳어
 *   방송에 다시 찍혔다. 두 곳을 고치고 돌렸더니 **둘째 표가 그대로 옛 이름**이었다.
 * ⭐ 흩어진 표는 반드시 어긋난다. 한 곳만 고쳐지고 나머지는 조용히 거짓이 된다.
 * ⇒ 정본은 `src/lib/유닛자리표.mjs` 하나다. 까닭도 거기 적었다.
 *
 * ⚠ 여기는 «정규식»으로 호스트를 가리므로 자리표의 호스트 목록을 식으로 바꿔 쓴다.
 *   klifemap 은 .ai 와 .net 둘 다 받아 왔다 — 그 꼬리를 잃지 않게 함께 적는다.
 */
import { 자리표 } from '../src/lib/유닛자리표.mjs';

const 식으로 = (호스트들, 덧꼬리 = []) => {
  const 뿌리 = [...new Set(호스트들.map((h) => h.replace(/^www\./, '')))];
  const 다 = [...뿌리, ...덧꼬리].map((h) => h.replace(/\./g, '\\.'));
  return new RegExp(`(^|\\.)(${다.join('|')})$`, 'i');
};
/* ⚠ 덧꼬리도 «날글»로 준다 — 식으로() 가 안에서 점을 피한다.
   처음에 미리 피해서 줬다가 두 번 피해져 klifemap.net 이 안 잡혔다 */
export const 유닛 = 자리표.map((x) => ({
  이름: `${x.유닛} ${x.이름}`,
  자: 식으로(x.호스트, x.이름 === 'KLifeMap' ? ['klifemap.net'] : []),
}));
export const 손님아님 = /^(localhost|127\.0\.0\.1|\[?::1\]?|.*\.github\.io)$/i;

/**
 * ⭐ 2026-08-24 — **토큰 뽑는 것을 내준다.** 체류시간을 재는 자(measure-kcw-dwell.mjs)가
 *   같은 서비스 계정으로 GA4 를 읽어야 한다. 이것은 판단이 아니라 배관이므로 베끼면
 *   두 자가 어긋날 일은 없지만, 열쇠 다루는 곳이 두 군데가 되는 것이 싫다. 한 군데로 둔다.
 * ⛔ 열쇠를 돌려주지 않는다 — access_token 만 준다.
 */
export async function 토큰받기(키, 갈래이름 = 갈래) {
  const 지금 = Math.floor(Date.now() / 1000);
  const 헤더 = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const 몸 = Buffer.from(JSON.stringify({
    iss: 키.client_email, scope: 갈래이름, aud: 'https://oauth2.googleapis.com/token',
    iat: 지금, exp: 지금 + 3600,
  })).toString('base64url');
  const 대상 = `${헤더}.${몸}`;
  const assertion = `${대상}.${createSign('RSA-SHA256').update(대상).sign(키.private_key, 'base64url')}`;
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion,
    }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error(`토큰 실패: ${JSON.stringify(j)}`);
  return j.access_token;
}

/**
 * 여러 날치 사람 수를 「하루 몇 명꼴」로 옮긴다.
 *
 * 🔴 2026-08-28, 사장님 — 「**사람이 소숫점인게 이해가 안돼**」.
 *    9월 목표가 「하루 1,000명」이라 나눈 값을 안 쓸 수는 없다. 다만
 *    ⛔ 나눈 값에 「명」을 붙이면 사람이 0.46명이 된다.
 *    ✅ 그래서 나눈 값은 «통째 수 + 명꼴»로 적어 «비율»임을 말에 드러낸다.
 *
 * ⚠ 하루 한 명이 안 되는 자리를 「0명꼴」로 적으면 아무도 안 온 것처럼 읽힌다.
 *    그 자리는 「N일에 M명」이라고 «센 수 그대로» 적는다.
 */
export function 하루꼴(사람, 날수) {
  if (사람 === null || 사람 === undefined || 사람 === '') return '못 쟀다';
  const n = Number(사람);
  const d = Number(날수);
  if (!Number.isFinite(n) || n < 0 || !Number.isFinite(d) || d <= 0) return '못 쟀다';
  const 하루 = n / d;
  if (하루 < 1) return `${d}일에 ${Math.round(n)}명`;
  return `${Math.round(하루).toLocaleString('en-US')}명꼴`;
}

/** 호스트 줄들을 유닛별로 합친다. ⛔ 어디에도 안 붙는 호스트를 **버리지 않는다** */
export function 유닛별로(줄들) {
  const 표 = 유닛.map((u) => ({ 이름: u.이름, 순방문: 0, 열림: 0, 호스트: [] }));
  const 남은것 = []; const 개발 = [];
  for (const r of 줄들 ?? []) {
    const h = String(r.호스트 ?? '');
    if (손님아님.test(h)) { 개발.push(r); continue; }
    const i = 유닛.findIndex((u) => u.자.test(h));
    if (i < 0) { 남은것.push(r); continue; }
    표[i].순방문 += r.순방문 ?? 0;
    표[i].열림 += r.열림 ?? 0;
    표[i].호스트.push(h);
  }
  return { 표: 표.sort((a, b) => b.순방문 - a.순방문), 남은것, 개발 };
}

/**
 * ⭐ 2026-09-10 — `pagePath` 가 홈인지 · `/data` 계열인지를 가른다.
 *   5번의 09-09 지시(사이트개편 1단계)가 이 둘을 갈라서 세라고 못 박았다.
 * ⛔ 짐작으로 문자열 비교하지 않는다 — 물음표(쿼리스트링)가 붙은 홈("/?utm=…")도 홈이다.
 */
export function 홈경로인가(경로) {
  const p = String(경로 ?? '').split('?')[0].split('#')[0];
  return p === '' || p === '/';
}
export function 데이터지면인가(경로) {
  const p = String(경로 ?? '').split('?')[0].split('#')[0];
  return p === '/data' || p.startsWith('/data/');
}

/** 어떤 오류인지 **갈라** 적는다. ⛔ 「실패」 한 마디로 뭉개면 무엇을 켤지 알 수 없다 */
export function 무엇이막혔나(오류글) {
  const s = String(오류글 ?? '');
  if (/analyticsadmin\.googleapis\.com|Google Analytics Admin API has not been used/i.test(s)) {
    return { 무엇: 'admin-api-꺼짐',
      할것: 'Google Cloud 에서 「Google Analytics Admin API」를 사용 설정한다',
      주소: 'https://console.cloud.google.com/apis/library/analyticsadmin.googleapis.com' };
  }
  if (/analyticsdata\.googleapis\.com|Google Analytics Data API has not been used/i.test(s)) {
    return { 무엇: 'data-api-꺼짐',
      할것: 'Google Cloud 에서 「Google Analytics Data API」를 사용 설정한다',
      주소: 'https://console.cloud.google.com/apis/library/analyticsdata.googleapis.com' };
  }
  if (/PERMISSION_DENIED|403|does not have sufficient permissions|User does not have/i.test(s)) {
    return { 무엇: '권한없음',
      할것: 'GA4 → 관리 → 속성 액세스 관리에서 서비스 계정을 「뷰어」로 더한다',
      주소: 'https://analytics.google.com/' };
  }
  return { 무엇: '모름', 할것: '오류 글을 그대로 읽는다', 주소: null };
}

/** 속성 목록에서 우리 사이트 것을 고른다. ⛔ 하나뿐이면 그것을 쓰되 **어느 것인지 적는다** */
export function 우리속성(요약들, 찾는말 = 'culture') {
  const 것들 = [];
  for (const a of 요약들 ?? []) {
    for (const p of a.propertySummaries ?? []) {
      것들.push({
        속성: String(p.property ?? '').replace('properties/', ''),
        이름: p.displayName ?? '',
        계정: a.displayName ?? '',
      });
    }
  }
  const 맞는것 = 것들.filter((x) => x.이름.toLowerCase().includes(찾는말.toLowerCase()));
  return { 전부: 것들, 고른것: 맞는것.length === 1 ? 맞는것[0] : null, 맞는것 };
}

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 내가실행됐다 = process.argv[1]
  && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (내가실행됐다 && process.argv.includes('--selftest')) {
  let 통 = 0; let 실 = 0;
  const 참 = (n, v) => { if (v) 통 += 1; else { 실 += 1; console.error(`  ⛔ ${n}`); } };

  /* 🔴 사장님 지적 — 「사람이 소숫점인게 이해가 안돼」 */
  참('하루꼴에 소수점이 없다', 하루꼴(623, 28) === '22명꼴');
  참('나눈 값 어디에도 소수점이 없다', !/\d\.\d/.test(하루꼴(355, 28)));
  참('하루 한 명이 안 되면 센 수 그대로', 하루꼴(20, 28) === '28일에 20명');
  참('아무도 안 왔으면 0명', 하루꼴(0, 28) === '28일에 0명');
  참('못 잰 것은 0 이 아니다', 하루꼴(null, 28) === '못 쟀다');
  참('날수가 0이면 못 쟀다', 하루꼴(10, 0) === '못 쟀다');
  참('천 단위에 쉼표가 붙는다', 하루꼴(280000, 28) === '10,000명꼴');
  /* ⛔ 「/ 일수 … toFixed」 모양이 돌아오면 여기서 걸린다 — 말이 아니라 검사로 굳힌다 */
  참('소스에 나눗셈 뒤 toFixed 가 없다',
    !/(순방문|n)\s*\/\s*(일수|m\.일)\s*\)?\s*\.toFixed\(/.test(
      readFileSync(fileURLToPath(import.meta.url), 'utf8')));

  /* 🔴 막힌 곳을 갈라 적어야 사람이 «무엇을 켤지» 안다. 「실패」 한 마디는 쓸모가 없다 */
  참('Admin API 꺼짐을 알아본다',
    무엇이막혔나('Google Analytics Admin API has not been used in project 123').무엇 === 'admin-api-꺼짐');
  참('Data API 꺼짐을 알아본다',
    무엇이막혔나('analyticsdata.googleapis.com is disabled').무엇 === 'data-api-꺼짐');
  참('권한 없음을 알아본다', 무엇이막혔나('PERMISSION_DENIED').무엇 === '권한없음');
  참('모르는 것은 모른다고 한다', 무엇이막혔나('something else').무엇 === '모름');
  참('켤 주소를 함께 준다',
    무엇이막혔나('analyticsdata.googleapis.com is disabled').주소.includes('analyticsdata'));

  const 요약 = [{
    displayName: 'KLifeDesign',
    propertySummaries: [
      { property: 'properties/111111111', displayName: 'K Culture Wire' },
      { property: 'properties/222222222', displayName: 'SeoulMarkets' },
    ],
  }];
  const r = 우리속성(요약);
  참('속성 목록을 편다', r.전부.length === 2);
  참('이름으로 우리 것을 고른다', r.고른것.속성 === '111111111');
  /* ⛔ 둘 이상 맞으면 **고르지 않는다.** 짐작으로 남의 속성을 읽으면 안 된다 */
  참('둘 이상 맞으면 고르지 않는다', 우리속성([{
    displayName: 'x',
    propertySummaries: [
      { property: 'properties/1', displayName: 'Culture A' },
      { property: 'properties/2', displayName: 'Culture B' },
    ],
  }]).고른것 === null);
  참('하나도 안 맞으면 고르지 않는다', 우리속성(요약, '없는말').고른것 === null);
  참('빈 목록도 안 죽는다', 우리속성(null).전부.length === 0);
  참('읽기 갈래만 청한다', 갈래.endsWith('analytics.readonly'));

  /* 🔴 [2026-09-10 · 4번] 09-09 5번 지시(SeoulMarkets 사이트개편 1단계 실측)용 헬퍼 */
  참('홈경로인가: 「/」는 홈', 홈경로인가('/'));
  참('홈경로인가: 빈 문자열도 홈(루트 리다이렉트 흔적)', 홈경로인가(''));
  참('홈경로인가: 물음표 붙은 홈도 홈', 홈경로인가('/?utm=abc'));
  참('⛔ 홈경로인가: /data 는 홈이 아니다', !홈경로인가('/data'));
  참('데이터지면인가: /data 자체', 데이터지면인가('/data'));
  참('데이터지면인가: /data/target-changes', 데이터지면인가('/data/target-changes'));
  참('⛔ 데이터지면인가: /database 는 /data 계열이 아니다(접두어만 보면 오탐)',
    !데이터지면인가('/database'));
  참('⛔ 데이터지면인가: 홈은 /data 계열이 아니다', !데이터지면인가('/'));
  참('데이터지면인가: 물음표 붙어도 가른다', 데이터지면인가('/data/valuation?x=1'));

  console.log(`GA4 를 읽는 자 — 자가시험 ${통} 통과 · ${실} 실패`);
  process.exit(실 ? 1 : 0);
}

if (내가실행됐다) {
  const 키파일 = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!키파일 || !existsSync(키파일)) {
    console.log('⚠ 서비스 계정 키파일이 없다 — **못 쟀다.** (.env 의 GOOGLE_APPLICATION_CREDENTIALS)');
    process.exit(0);
  }
  const 키 = JSON.parse(readFileSync(키파일, 'utf8'));

  const jwt만들기 = () => {
    const 지금 = Math.floor(Date.now() / 1000);
    const 헤더 = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const 몸 = Buffer.from(JSON.stringify({
      iss: 키.client_email, scope: 갈래, aud: 'https://oauth2.googleapis.com/token',
      iat: 지금, exp: 지금 + 3600,
    })).toString('base64url');
    const 대상 = `${헤더}.${몸}`;
    return `${대상}.${createSign('RSA-SHA256').update(대상).sign(키.private_key, 'base64url')}`;
  };

  const 토큰받기 = async () => {
    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt만들기(),
      }),
    });
    const j = await r.json();
    if (!j.access_token) throw new Error(`토큰 실패: ${JSON.stringify(j)}`);
    return j.access_token;
  };

  /* ⛔ 계정 주소는 공개 식별자다 — 그것까지만 적는다. 열쇠는 절대 안 찍는다 */
  console.log(`GA4 를 읽는다 — 서비스 계정 ${키.client_email}\n`);

  const 막혔다 = (제목, 글) => {
    const m = 무엇이막혔나(글);
    console.log(`🔴 ${제목} — **못 쟀다.**`);
    console.log(`   막힌 것: ${m.무엇}`);
    console.log(`   할 것  : ${m.할것}`);
    if (m.주소) console.log(`   주소   : ${m.주소}`);
    console.log(`   구글이 준 말: ${String(글).slice(0, 300)}`);
    console.log('\n⛔ 이것은 「방문자 0명」이 아니다. **재지 못한 것**이다.');
  };

  let 토큰;
  try { 토큰 = await 토큰받기(); } catch (e) { 막혔다('토큰을 못 받았다', e.message); process.exit(0); }
  console.log('✅ 토큰 받았다 — 서비스 계정 자체는 산다\n');

  /* ── ① 볼 수 있는 속성 찾기 ─────────────────────────────── */
  let 속성 = process.argv.find((a) => a.startsWith('--속성='))?.split('=')[1]
    ?? process.env.GA4_PROPERTY_ID ?? null;
  if (!속성) {
    const r = await fetch('https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=200',
      { headers: { Authorization: `Bearer ${토큰}` } });
    const j = await r.json();
    if (j.error) { 막혔다('볼 수 있는 속성을 못 물었다', j.error.message); process.exit(0); }
    const 찾음 = 우리속성(j.accountSummaries);
    if (!찾음.전부.length) {
      console.log('🔴 이 계정이 볼 수 있는 GA4 속성이 **하나도 없다** — 아직 뷰어로 안 들어갔다.');
      console.log('   할 것: GA4 → 관리 → 속성 액세스 관리 → 아래 주소를 「뷰어」로 더한다');
      console.log(`          ${키.client_email}`);
      console.log('\n⛔ 이것은 「방문자 0명」이 아니다. **재지 못한 것**이다.');
      process.exit(0);
    }
    console.log('볼 수 있는 속성:');
    for (const x of 찾음.전부) console.log(`   ${x.속성}  ${x.이름}  (계정 ${x.계정})`);
    if (process.argv.includes('--찾는다')) {
      console.log('\n⭐ 쓰려면 .env 에 적는다 —  GA4_PROPERTY_ID=<위 번호>');
      process.exit(0);
    }
    if (!찾음.고른것) {
      console.log('\n⚠ 어느 것이 우리 것인지 **자로 못 가른다**(이름에 culture 가 하나가 아니다).');
      console.log('   --속성=<번호> 로 주거나 .env 에 GA4_PROPERTY_ID 를 적는다.');
      console.log('⛔ 짐작으로 남의 속성을 읽지 않는다.');
      process.exit(0);
    }
    속성 = 찾음.고른것.속성;
    console.log(`\n⭐ 이름으로 골랐다 — ${속성} (${찾음.고른것.이름})`);
  }

  /**
   * ⭐ `--지면적는다=<파일>` — **어느 지면에 사람이 실제로 들어왔나**를 자료로 남긴다.
   *
   * 🔴 왜 (2026-08-23 23:2x) — 나는 지면을 1,537장 냈다. 그런데 **그중 몇 장에 사람이
   *   실제로 들어왔는지 모른다.** 노출(검색에 보인 것)은 재고 있었지만 방문은 못 쟀다.
   *   ⛔ 이것을 모르면 「지면을 더 내야 하나」와 「있는 지면을 고쳐야 하나」를 못 가른다.
   *     1,537장 중 50장에만 사람이 온다면 더 내는 것은 답이 아니다.
   * ⚠ 내 사이트만 걸러 잰다 — 속성이 공용이라 안 걸면 남의 지면이 섞인다.
   */
  const 지면적을곳 = process.argv.find((a) => a.startsWith('--지면적는다='))?.split('=')[1];
  if (지면적을곳) {
    const 일 = Number(process.argv[process.argv.indexOf('--days') + 1]) || 28;
    /**
     * ⭐ 2026-08-23 23:3x 사장님 지시 — 「다들 하라고 해」.
     *   말로 「하라」고 하면 안 한다. **호스트를 인자로 받아 여섯 자리가 다 쓰게** 한다.
     *   ⛔ 기본값은 내 것이지만, 남의 유닛이 --호스트= 하나만 바꾸면 그대로 쓴다.
     */
    const 호스트 = process.argv.find((a) => a.startsWith('--호스트='))?.split('=')[1] ?? 'kculturewire';
    const 모은것 = [];
    let 시작줄 = 0;
    /* ⚠ GA4 는 한 번에 최대 10만 줄이지만, 우리는 넉넉히 나눠 받는다 */
    for (let 회 = 0; 회 < 20; 회 += 1) {
      const r = await fetch(
        `https://analyticsdata.googleapis.com/v1beta/properties/${속성}:runReport`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${토큰}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dateRanges: [{ startDate: `${일}daysAgo`, endDate: 'yesterday' }],
            dimensions: [{ name: 'pagePath' }],
            metrics: [{ name: 'totalUsers' }, { name: 'screenPageViews' }],
            /* ⛔ 내 호스트만. 안 걸면 남의 유닛 지면이 섞인다 */
            dimensionFilter: {
              filter: {
                fieldName: 'hostName',
                stringFilter: { matchType: 'CONTAINS', value: 호스트 },
              },
            },
            orderBys: [{ desc: true, metric: { metricName: 'totalUsers' } }],
            limit: 5000,
            offset: 시작줄,
          }),
        },
      );
      const j = await r.json();
      if (j.error) {
        console.log(`🔴 지면별로 **못 쟀다** — ${String(j.error.message).slice(0, 160)}`);
        process.exit(0);
      }
      const 줄 = (j.rows ?? []).map((x) => ({
        path: x.dimensionValues?.[0]?.value ?? '',
        users: Number(x.metricValues?.[0]?.value ?? 0),
        views: Number(x.metricValues?.[1]?.value ?? 0),
      }));
      모은것.push(...줄);
      if (줄.length < 5000) break;
      시작줄 += 5000;
    }
    const { writeFileSync, mkdirSync } = await import('node:fs');
    mkdirSync(path.dirname(지면적을곳), { recursive: true });
    writeFileSync(지면적을곳, `${JSON.stringify({
      site: 호스트, property: 속성, days: 일,
      /* ⚠ 「어제까지」다. 오늘은 안 들었다 — 하루가 안 끝났다 */
      note: `GA4 totalUsers by pagePath, host contains ${호스트}, to yesterday`,
      rows: 모은것,
    }, null, 2)}\n`);
    console.log(`✅ 지면별 방문을 적었다 — ${지면적을곳} (${모은것.length}줄)`);
    console.log(`   사람이 한 명이라도 들어온 지면 ${모은것.filter((x) => x.users > 0).length}장`);
    process.exit(0);
  }

  /**
   * ⭐ `--유닛` — 유닛별로 한 줄씩. 사장님 물음(「다른 유닛도 측정해야 하는 거 아냐?」)에
   *   답하는 자리다. 창을 여럿 놓고 한 번에 낸다 — 하루치만 보면 흔들린다.
   */
  if (process.argv.includes('--유닛')) {
    const 창들 = [['어제', 'yesterday', 'yesterday', 1], ['7일', '7daysAgo', 'yesterday', 7],
      ['28일', '28daysAgo', 'yesterday', 28]];
    const 모음 = new Map();
    let 남은것 = []; let 개발 = [];
    for (const [이름, 시작, 끝, 일] of 창들) {
      const r = await fetch(
        `https://analyticsdata.googleapis.com/v1beta/properties/${속성}:runReport`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${토큰}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dateRanges: [{ startDate: 시작, endDate: 끝 }],
            dimensions: [{ name: 'hostName' }],
            metrics: [{ name: 'totalUsers' }, { name: 'screenPageViews' }],
            limit: 100,
          }),
        },
      );
      const j = await r.json();
      if (j.error) { 모음.set(이름, { 못쟀다: String(j.error.message).slice(0, 90), 일 }); continue; }
      const 줄 = (j.rows ?? []).map((x) => ({
        호스트: x.dimensionValues?.[0]?.value ?? '(모름)',
        순방문: Number(x.metricValues?.[0]?.value ?? 0),
        열림: Number(x.metricValues?.[1]?.value ?? 0),
      }));
      const 갈름 = 유닛별로(줄);
      모음.set(이름, { ...갈름, 일 });
      남은것 = 갈름.남은것; 개발 = 갈름.개발;
    }

    console.log(`유닛별 순방문자 — 속성 ${속성} (네 사이트 공용)\n`);
    console.log('   유닛                   어제    7일(하루몇명꼴)    28일(하루몇명꼴)');
    for (const u of 유닛.map((x) => x.이름)) {
      const 값 = (이름) => {
        const m = 모음.get(이름);
        if (!m || m.못쟀다) return '못 쟀다';
        const row = m.표.find((x) => x.이름 === u);
        const n = row ? row.순방문 : 0;
        return m.일 === 1 ? `${n}` : `${n} (${하루꼴(n, m.일)})`;
      };
      console.log(`   ${u.padEnd(22)}${값('어제').padStart(5)}`
        + `${값('7일').padStart(16)}${값('28일').padStart(18)}`);
    }
    const 합 = (이름) => {
      const m = 모음.get(이름);
      if (!m || m.못쟀다) return '못 쟀다';
      const n = m.표.reduce((s, x) => s + x.순방문, 0);
      return m.일 === 1 ? `${n}` : `${n} (${하루꼴(n, m.일)})`;
    };
    console.log(`   ${'회사 네 사이트 합'.padEnd(20)}${합('어제').padStart(5)}`
      + `${합('7일').padStart(16)}${합('28일').padStart(18)}`);
    console.log('\n   ⭐ 9월 목표는 **유닛마다 하루 1,000명**이다. 위 하루평균과 견준다.');
    if (남은것.length) {
      console.log('\n   ⚠ 어느 유닛에도 안 붙는 호스트 — **버리지 않고 적는다**:');
      for (const x of 남은것) console.log(`      ${x.호스트}  순방문 ${x.순방문}`);
    }
    if (개발.length) {
      console.log('\n   ⛔ 손님이 아니라 뺀 것(우리가 띄운 서버):');
      for (const x of 개발) console.log(`      ${x.호스트}  순방문 ${x.순방문}`);
    }
    console.log('\n⚠ GA4 는 광고차단·쿠키거부로 **덜 센다.** 바닥값이다 —');
    console.log('   「이보다 적을 수는 없다」가 우리가 말할 수 있는 것이다.');
    process.exit(0);
  }

  /**
   * ⭐ `--하루` — 어제와 오늘을 사이트별로 한 줄씩. 매일 보고에 적을 수를 여기서 뽑는다.
   * ⚠ **오늘 수는 집계 중**이다. 하루가 안 끝났으니 어제와 나란히 놓고 비교하면 안 된다 —
   *   화면에 「집계 중」이라고 박아 둔다. 그 말이 없으면 오늘 수가 낮다고 잘못 읽는다.
   */
  if (process.argv.includes('--하루')) {
    const 하루재기 = async (이름, 범위) => {
      const r = await fetch(
        `https://analyticsdata.googleapis.com/v1beta/properties/${속성}:runReport`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${토큰}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dateRanges: [범위],
            dimensions: [{ name: 'hostName' }],
            metrics: [{ name: 'totalUsers' }, { name: 'screenPageViews' }],
            limit: 50,
          }),
        },
      );
      const j = await r.json();
      if (j.error) { console.log(`   ${이름}: **못 쟀다** — ${String(j.error.message).slice(0, 90)}`); return; }
      const 줄 = (j.rows ?? []).map((x) => ({
        호스트: x.dimensionValues?.[0]?.value ?? '(모름)',
        순방문: Number(x.metricValues?.[0]?.value ?? 0),
        열림: Number(x.metricValues?.[1]?.value ?? 0),
      }));
      const 내것 = 줄.filter((x) => /kculturewire/i.test(x.호스트));
      const 회사 = 줄.reduce((s, x) => s + x.순방문, 0);
      if (!내것.length) {
        console.log(`   ${이름}: kculturewire 줄이 없다 — **내 수는 못 쟀다**`
          + ` (회사 전체 ${회사}명)`);
        return;
      }
      console.log(`   ${이름}: K Culture Wire 순방문 **${내것.reduce((s, x) => s + x.순방문, 0)}명**`
        + ` · 지면열림 ${내것.reduce((s, x) => s + x.열림, 0)}`
        + `  (회사 전체 ${회사}명)`);
    };
    /* 🔴 [2026-08-26 · 5번] 이 자가 «이틀»만 보여 주고 있었다. 그래서 사장님이
       「방문자가 어제보다 적다」고 하셨을 때 **우리가 그것을 되재지 못했다.**
       ⛔ 이틀로는 「적다」를 판정할 수 없다 — 어제가 낮은 것인지, 그 주가 낮은 것인지,
         늘 그만큼 흔들리는 것인지 가르려면 «줄»이 있어야 한다.
       ⭐ 그래서 날마다 한 줄씩, 유닛을 갈라 낸다. 사장님이 보시는 것을 우리도 본다. */
    const 날별 = async (일수) => {
      const r = await fetch(
        `https://analyticsdata.googleapis.com/v1beta/properties/${속성}:runReport`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${토큰}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dateRanges: [{ startDate: `${일수}daysAgo`, endDate: 'today' }],
            dimensions: [{ name: 'date' }, { name: 'hostName' }],
            metrics: [{ name: 'totalUsers' }],
            limit: 2000,
          }),
        },
      );
      const j = await r.json();
      if (j.error) { console.log(`   **못 쟀다** — ${String(j.error.message).slice(0, 120)}`); return; }
      const 표 = new Map();
      for (const x of (j.rows ?? [])) {
        const 날 = x.dimensionValues?.[0]?.value ?? '';
        const 호스트 = x.dimensionValues?.[1]?.value ?? '';
        const 수 = Number(x.metricValues?.[0]?.value ?? 0);
        /* ⛔ 우리가 띄운 서버는 손님이 아니다 — 빼고, 뺐다고 아래에 적는다.
           ⚠ 목록도 «불러다» 쓴다. 여기에 다시 적으면 한쪽만 늘어난다. */
        if (우리것.includes(String(호스트).toLowerCase())) continue;
        const u = 유닛찾기(호스트);
        if (!표.has(날)) 표.set(날, new Map());
        표.get(날).set(u, (표.get(날).get(u) ?? 0) + 수);
      }
      const 날들 = [...표.keys()].sort();
      const 자리 = 유닛차례;
      console.log('   날짜          3번   5번  1·4번   6번  │   합');
      console.log('   ──────────────────────────────────────┼──────');
      const 합들 = [];
      for (const 날 of 날들) {
        const m = 표.get(날);
        const 값 = 자리.map((u) => m.get(u) ?? 0);
        /* ⚠ 모르는 자리도 «합»에는 넣는다 — 버리면 합이 조용히 줄고 아무도 모른다 */
        const 합 = [...m.values()].reduce((a, b) => a + b, 0);
        합들.push(합);
        const 오늘인가 = 날 === 날들[날들.length - 1];
        console.log(`   ${날.slice(0, 4)}-${날.slice(4, 6)}-${날.slice(6)}${오늘인가 ? '★' : ' '} `
          + 값.map((v) => String(v).padStart(5)).join(' ') + `  │ ${String(합).padStart(5)}`);
      }
      /* ⛔ 오늘은 하루가 안 끝났으니 평균에서 «뺀다». 넣으면 평균이 조용히 낮아진다 */
      const 끝난날 = 합들.slice(0, -1);
      if (끝난날.length >= 2) {
        const 평균 = 끝난날.reduce((a, b) => a + b, 0) / 끝난날.length;
        /* 🔴 평균만 내면 «봉우리 하루»에 휘둘린다. 2026-08-26 에 재 보니 14일 중
           8/13 하루가 171명이었고, 그 하루가 평균을 38.5 로 끌어올려 나머지 열셋을
           전부 「평균 아래」로 만들었다. ⭐ 그래서 가운데값을 같이 낸다 —
           봉우리가 있어도 «보통 날이 어디인지»를 가운데값이 알려 준다. */
        const 정렬 = [...끝난날].sort((a, b) => a - b);
        const 가운데 = 정렬.length % 2
          ? 정렬[(정렬.length - 1) / 2]
          : (정렬[정렬.length / 2 - 1] + 정렬[정렬.length / 2]) / 2;
        const 어제 = 끝난날[끝난날.length - 1];
        console.log();
        /* 🔴 2026-08-28, 사장님 — 「사람이 소숫점인게 이해가 안돼」.
           평균·가운데값은 나눗셈이라 소수가 나오지만 「명」을 붙이면 사람이 소수가 된다.
           ⛔ 그래서 여기서는 통째 수로 적고, 나눈 값에는 «명꼴»을 붙여 «비율»임을 밝힌다.
           ✅ 「어제 N명」만 실제로 센 사람 수라서 그대로 「명」이다. */
        console.log(`   끝난 날 ${끝난날.length}일 — 하루 ${Math.round(평균)}명꼴 ·`
          + ` 가운데 날 ${Math.round(가운데)}명 · 어제 ${어제}명`);
        if (평균 > 가운데 * 1.3) {
          const 봉우리 = Math.max(...끝난날);
          console.log(`   ⚠ 평균(하루 ${Math.round(평균)}명꼴)이 가운데 날(${Math.round(가운데)}명)보다 훨씬 크다 —`
            + ` 하루 ${봉우리}명짜리 봉우리가 끌어올린 것이다. **가운데 날로 읽는다**`);
        }
        const 차 = 어제 - 가운데;
        const 큰가 = 가운데 > 0 && Math.abs(차) > 가운데 * 0.3;
        console.log(큰가
          ? `   ⚠ 어제는 가운데값에서 ${Math.abs(차 / 가운데 * 100).toFixed(0)}% ${차 < 0 ? '아래' : '위'}다`
            + ' — 흔들림으로 보기엔 크다'
          : '   ⭐ 어제는 가운데값과 30% 안쪽이다 — 이 정도는 날마다 흔들린다.'
            + ' 「줄었다」로 읽지 않는다');
        /* ⚠ 하루 수가 열 명대면 한두 명 차이로 몇십 %가 움직인다. 그것을 적어 둔다 */
        if (가운데 < 30) {
          console.log('   ⛔ 하루 수가 작아 %가 크게 흔들린다 — 한 사람이 늘고 줄어도 몇 %가 된다.'
            + ' 하루끼리 견주기보다 «주 단위»로 보는 것이 낫다');
        }
      }
    };

    /* 🔴 [2026-08-26 · 5번] 「봉우리 하루」에 무엇이 열렸는지 묻는 자.
       재 보니 8/13 하루가 171명(3번 149명)이었다. 그 하루가 무엇이었는지 모르면
       **우연을 실력으로 착각하거나, 실력을 우연으로 버린다.** 둘 다 손해다.
       ⭐ 「무엇을 하면 사람이 오는가」는 봉우리에서 배우는 것이 가장 싸다. */
    const 그날파기 = async (날) => {
      const q = async (dims, metrics, limit) => {
        const r = await fetch(
          `https://analyticsdata.googleapis.com/v1beta/properties/${속성}:runReport`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${토큰}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              dateRanges: [{ startDate: 날, endDate: 날 }],
              dimensions: dims.map((name) => ({ name })),
              metrics: metrics.map((name) => ({ name })),
              limit,
            }),
          },
        );
        const j = await r.json();
        if (j.error) { console.log(`   **못 쟀다** — ${String(j.error.message).slice(0, 120)}`); return []; }
        return (j.rows ?? []).map((x) => ({
          키: (x.dimensionValues ?? []).map((d) => d.value).join(' │ '),
          값: Number(x.metricValues?.[0]?.value ?? 0),
        }));
      };
      const 날쓰기 = 날;
      console.log(`\n   ── ${날쓰기} 에 무엇이 있었나 ──\n`);

      console.log('   어디서 왔나 (순방문)');
      for (const r of (await q(['sessionSource', 'sessionMedium'], ['totalUsers'], 12))) {
        console.log(`     ${String(r.값).padStart(5)}  ${r.키}`);
      }
      /**
       * ⭐ [2026-09-03] 사장님이 「이슈메이킹」의 기준에 **「방문자 수가 평균보다 많은지」**를
       *   넣으셨다. 그러려면 «지면 하나하나»의 수가 필요하다. 열다섯 줄로는 못 잰다.
       * ⛔ 화면 출력은 그대로 열다섯 줄만 낸다 — 보던 사람이 놀라지 않게.
       *   `--지면전부` 를 주면 전부를 한 덩어리로 더 낸다(다른 자가 읽어 간다).
       */
      const 지면들 = await q(['hostName', 'pagePath'], ['screenPageViews'], 400);
      console.log('\n   어느 지면이 열렸나 (지면열림)');
      for (const r of 지면들.slice(0, 15)) {
        console.log(`     ${String(r.값).padStart(5)}  ${r.키}`);
      }
      if (process.argv.includes('--지면전부')) {
        console.log('\n   ▼ 지면 전부 (지면열림) — 자가 읽어 가는 자리다');
        for (const r of 지면들) console.log(`     ${String(r.값).padStart(6)}  ${r.키}`);
        console.log('   ▲ 지면 전부 끝');
      }
      console.log('\n   어느 나라에서 (순방문)');
      for (const r of (await q(['country'], ['totalUsers'], 10))) {
        console.log(`     ${String(r.값).padStart(5)}  ${r.키}`);
      }
      /* 🔴 [2026-08-26] 8/13 봉우리(171명)를 이 자로 파 보니 이랬다 —
           162명이 Direct · 나라는 인도 38 · 베트남 30 · 이란 11 · 방글라데시 10 …
           그런데 «지면열림이 순방문보다 적었다». 한 사람이 한 장도 안 본 셈이다.
         ⭐ 사람이면 최소 한 장은 연다. 열림이 사람 수보다 «적으면» 사람으로 보기 어렵다.
         ⛔ 「봇이다」라고 단정하지는 않는다 — 우리는 그것을 가릴 자가 없다.
           다만 «성과로 읽지 말라»고는 적는다. 봉우리를 성과로 착각하면 그 방향으로 일한다. */
      const 순합 = (await q(['hostName'], ['totalUsers'], 50)).reduce((a, b) => a + b.값, 0);
      const 열림합 = (await q(['hostName'], ['screenPageViews'], 50)).reduce((a, b) => a + b.값, 0);
      console.log(`\n   그날 순방문 ${순합}명 · 지면열림 ${열림합}`
        + `  →  한 사람당 ${순합 ? (열림합 / 순합).toFixed(2) : '못 잼'}장`);
      /* ⚠ 기준 1.1장은 `measure-real-readers.mjs` 가 「읽은 흔적 없음」을 가르는 기준과
         **같은 값**이다. 자마다 다른 선을 쓰면 두 자가 다른 말을 한다.
         ⛔ 처음엔 「1장 미만」으로 뒀다가 고쳤다 — 화면 «상위 15줄»만 눈으로 더해 보고
           「열림이 사람보다 적다」고 잘못 읽었기 때문이다. 전부 세니 1.03장이었다.
           ⭐ 눈으로 더하지 않는다. 세는 것은 자가 한다. */
      if (순합 > 0 && 열림합 / 순합 < 1.1) {
        console.log('   🔴 **한 사람당 1.1장이 안 된다.** 들어와 한 장 보고 나간 꼴이다.');
        console.log('      ⛔ 이 봉우리를 «성과»로 읽지 않는다. 무엇을 잘해서 온 것으로 보기 어렵다.');
        console.log('      ⛔ 그렇다고 「봇이다」라고 단정하지도 않는다 — 그것을 가릴 자가 우리에게 없다.');
        console.log('      ⭐ 읽은 흔적으로 가르려면 — node scripts/measure-real-readers.mjs --잰다');
      }

      console.log('\n   ⛔ 이 표는 «무엇이 있었나»만 말한다. «왜 왔나»는 말하지 않는다 —');
      console.log('      한 곳에서 몰려온 것과, 우리가 낸 것이 걸린 것은 여기서 갈리지 않는다.');
    };

    const 그날 = process.argv.find((a) => a.startsWith('--그날='))?.split('=')[1];
    if (그날) {
      /* ⚠ GA4 는 `YYYY-MM-DD` 만 받는다. 그런데 «날별 표»는 `YYYYMMDD` 로 찍힌다 —
         화면에서 본 그대로 붙여 넣으면 「Invalid startDate」로 막힌다(2026-08-26에 막혔다).
         ⭐ 그래서 둘 다 받아 여기서 맞춘다. 사람이 형식을 외우게 두지 않는다. */
      const 숫자 = 그날.replace(/[^0-9]/g, '');
      if (숫자.length !== 8) {
        console.error(`⛔ 날짜가 여덟 자리가 아니다 — ${그날}. 20260813 이나 2026-08-13 으로 준다`);
        process.exit(1);
      }
      await 그날파기(`${숫자.slice(0, 4)}-${숫자.slice(4, 6)}-${숫자.slice(6)}`);
      process.exit(0);
    }

    console.log('하루씩 — ⚠ 오늘 수는 **집계 중**이다. 어제와 나란히 비교하지 않는다\n');
    const 날수 = Number(process.argv.find((a) => a.startsWith('--날수='))?.split('=')[1]) || 14;
    await 날별(날수);
    console.log('\n   ★ 오늘은 하루가 안 끝났다. 「낮다」고 읽으면 안 된다.');
    console.log('   ⚠ GA4 는 광고차단·쿠키거부로 덜 센다. 바닥값이다.');
    console.log('   ⛔ 우리가 띄운 서버(127.0.0.1·localhost·github.io)는 뺐다.');
    process.exit(0);
  }

  /* ── ② 순방문자수 재기 ──────────────────────────────────── */
  const 일수 = Number(process.argv[process.argv.indexOf('--days') + 1]) || 28;
  const r2 = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${속성}:runReport`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${토큰}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dateRanges: [{ startDate: `${일수}daysAgo`, endDate: 'yesterday' }],
        metrics: [{ name: 'totalUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }],
      }),
    },
  );
  const j2 = await r2.json();
  if (j2.error) { 막혔다('수를 못 읽었다', j2.error.message); process.exit(0); }

  const 값 = (j2.rows?.[0]?.metricValues ?? []).map((x) => Number(x.value));
  const [순방문, 세션, 지면열림] = 값;
  console.log(`\n📊 최근 ${일수}일 (어제까지) — 속성 ${속성} · **네 사이트 합계**`);
  console.log(`   순방문자수(totalUsers)  ${Number.isFinite(순방문) ? 순방문.toLocaleString('en-US') : '못 쟀다'}`);
  console.log(`   세션(sessions)          ${Number.isFinite(세션) ? 세션.toLocaleString('en-US') : '못 쟀다'}`);
  console.log(`   지면 열림(pageViews)    ${Number.isFinite(지면열림) ? 지면열림.toLocaleString('en-US') : '못 쟀다'}`);
  if (Number.isFinite(순방문)) {
    /* ⛔ 나눈 값에 「명」을 붙이지 않는다 — 「명꼴」이라 적어 비율임을 밝힌다 (사장님 지적) */
    console.log(`   ⭐ ${일수}일 동안 ${순방문.toLocaleString('en-US')}명 — 하루 ${Math.round(순방문 / 일수).toLocaleString('en-US')}명꼴`
      + `  (9월 목표 하루 1,000명)`);
  }
  /**
   * 🔴 2026-08-23 21:0x — 속성이 **네 사이트 공용**이었다(「케이라이프디자인 — 네 사이트」).
   *   합계 536명을 그대로 「내 방문자수」로 적으면 **남의 유닛 손님을 내 것으로 세는 것**이다.
   *   ⭐ 그래서 `hostName` 으로 갈라 잰다. 갈라 놓으면 여섯 자리가 다 이 자를 쓸 수 있다.
   *   ⛔ 갈라 재지 못하면 「합계뿐」이라고 적는다. 합계를 내 수로 적지 않는다.
   */
  const r3 = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${속성}:runReport`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${토큰}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dateRanges: [{ startDate: `${일수}daysAgo`, endDate: 'yesterday' }],
        dimensions: [{ name: 'hostName' }],
        metrics: [{ name: 'totalUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }],
        orderBys: [{ desc: true, metric: { metricName: 'totalUsers' } }],
        limit: 50,
      }),
    },
  );
  const j3 = await r3.json();
  if (j3.error) {
    console.log(`\n⚠ 사이트별로 **못 갈랐다** — ${String(j3.error.message).slice(0, 160)}`);
    console.log('   ⛔ 위 합계는 네 사이트 것이다. 내 수로 적지 않는다.');
  } else {
    const 줄 = (j3.rows ?? []).map((r) => ({
      호스트: r.dimensionValues?.[0]?.value ?? '(모름)',
      순방문: Number(r.metricValues?.[0]?.value ?? 0),
      세션: Number(r.metricValues?.[1]?.value ?? 0),
      열림: Number(r.metricValues?.[2]?.value ?? 0),
    }));
    console.log('\n📊 사이트별로 갈라 잰 것 — ⭐ **이 줄이 유닛별 방문자수다**');
    console.log('   호스트                          순방문  세션  지면열림  하루몇명꼴');
    for (const x of 줄) {
      console.log(`   ${x.호스트.padEnd(30)}${String(x.순방문).padStart(6)}`
        + `${String(x.세션).padStart(6)}${String(x.열림).padStart(9)}`
        + `${하루꼴(x.순방문, 일수).padStart(12)}`);
    }
    const 내것 = 줄.filter((x) => /kculturewire/i.test(x.호스트));
    const 내순방문 = 내것.reduce((s, x) => s + x.순방문, 0);
    if (!내것.length) {
      console.log('\n🔴 kculturewire 줄이 **없다** — 이 창에서는 내 방문자수를 **못 쟀다.**');
      console.log('   ⛔ 합계를 내 수로 적지 않는다.');
    } else {
      console.log(`\n⭐ K Culture Wire — ${일수}일 동안 ${내순방문}명 · 하루`
        + ` **${Math.round(내순방문 / 일수)}명꼴** (9월 목표 하루 1,000명)`);
      console.log(`   전체 ${순방문}명 가운데 ${((100 * 내순방문) / (순방문 || 1)).toFixed(0)}% 다.`);
      /* ⛔ 합계와 갈라 낸 합이 어긋나면 그것을 적는다 — GA4 는 표본·기수 처리로 어긋날 수 있다 */
      const 갈라낸합 = 줄.reduce((s, x) => s + x.순방문, 0);
      if (갈라낸합 !== 순방문) {
        console.log(`   ⚠ 갈라 낸 합 ${갈라낸합} 이 전체 ${순방문} 과 다르다 —`
          + ' GA4 가 차원을 붙일 때 사람을 중복 없이 다시 세기 때문이다(정상). 비율은 대략으로 읽는다.');
      }
    }
  }

  /**
   * 🔴 [2026-09-06 · 5번] **`--지면전부` 가 여기에 없었다.**
   *
   * 그 깃발은 `그날파기(날)` 안에만 있었다. 그런데 그 자는 «하루»를 파는 자라
   * `--날=` 을 함께 줘야만 돌고, 내는 수도 그 하루치다.
   * ⇒ 전 유닛 점검 보고가 `--지면전부` 만 주고 불렀더니 덩어리가 아예 안 나왔고,
   *   보고서 1-5 표의 「지면열림」 칸이 **20편 전부 ⬜ 못 쟀다**로 나갔다.
   *   그러면서 4절에는 「해결했습니다」라고 적혀 있었다.
   *
   * ⛔ **「해결했다」고 적힌 칸이 매번 비어 있으면 그 문장이 보고 전체를 못 믿게 만든다.**
   *   0 으로 채우지 않는 것은 맞지만, «잴 수 있는 것을 안 재고» 못 쟀다고 적는 것은 다른 문제다.
   * ⭐ 그래서 위 표와 «같은 창»(28일)으로 지면 전부를 여기서 낸다. 화면 기본 출력은
   *   안 바꾼다 — 깃발을 준 사람에게만 덩어리를 더 준다.
   */
  if (process.argv.includes('--지면전부')) {
    const r4 = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${속성}:runReport`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${토큰}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dateRanges: [{ startDate: `${일수}daysAgo`, endDate: 'yesterday' }],
          dimensions: [{ name: 'hostName' }, { name: 'pagePath' }],
          metrics: [{ name: 'screenPageViews' }],
          orderBys: [{ desc: true, metric: { metricName: 'screenPageViews' } }],
          limit: 2000,
        }),
      },
    );
    const j4 = await r4.json();
    if (j4.error) {
      console.log(`\n   ⛔ 지면 전부를 **못 받았다** — ${String(j4.error.message).slice(0, 140)}`);
    } else {
      const 줄들 = (j4.rows ?? []).map((r) => ({
        자리: (r.dimensionValues ?? []).map((d) => d.value).join(' │ '),
        열림: Number(r.metricValues?.[0]?.value ?? 0),
      }));
      console.log(`\n   ▼ 지면 전부 (지면열림 · ${일수}일) — 자가 읽어 가는 자리다`);
      for (const r of 줄들) console.log(`     ${String(r.열림).padStart(6)}  ${r.자리}`);
      console.log('   ▲ 지면 전부 끝');
      if (!줄들.length) console.log('   ⬜ 줄이 하나도 없다 — 못 쟀다. 0 으로 채우지 않는다.');
    }
  }

  /**
   * ⭐ `--서울마켓개편` — [2026-09-10 · 4번] 5번 09-09 지시(목표 09-12) —
   *   「SeoulMarkets 사이트개편 1단계」. 지면별 열린 횟수(28일)·유입 경로·
   *   홈에서 다음 클릭·이탈 지면 **넷을 한 번에 낸다.**
   *   5번 원문: 「이 수가 없으면 «홈에 무엇을 낼까»는 취향 싸움이 된다」.
   * ⚠ --호스트= 로 다른 유닛도 그대로 쓸 수 있다. 기본은 seoulmarkets.com.
   */
  if (process.argv.includes('--서울마켓개편')) {
    const 호스트 = process.argv.find((a) => a.startsWith('--호스트='))?.split('=')[1] ?? 'seoulmarkets.com';
    const q2 = async (dims, metrics, extra = {}) => {
      const r = await fetch(
        `https://analyticsdata.googleapis.com/v1beta/properties/${속성}:runReport`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${토큰}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dateRanges: [{ startDate: `${일수}daysAgo`, endDate: 'yesterday' }],
            dimensions: dims.map((name) => ({ name })),
            metrics: metrics.map((name) => ({ name })),
            limit: 2000,
            ...extra,
          }),
        },
      );
      const j = await r.json();
      if (j.error) return { 오류: String(j.error.message) };
      return {
        줄: (j.rows ?? []).map((x) => ({
          키: (x.dimensionValues ?? []).map((d) => d.value ?? '').join(' │ '),
          값: (x.metricValues ?? []).map((m) => Number(m.value ?? 0)),
        })),
      };
    };
    const 호스트필터 = {
      filter: { fieldName: 'hostName', stringFilter: { matchType: 'CONTAINS', value: 호스트 } },
    };

    console.log(`\n═══ SeoulMarkets 사이트개편 1단계 실측 — 호스트 ${호스트} · 최근 ${일수}일(어제까지) ═══`);
    console.log('   (5번 09-09 지시: 이 수 없이는 「홈 노출 여부」에 답하지 않는다)');

    /* ① 지면별 열린 횟수 — 홈 · /data 계열 · 그 밖으로 가른다 */
    console.log('\n■ 1. 지면별 열린 횟수 (screenPageViews)');
    const 지면 = await q2(['pagePath'], ['screenPageViews'], {
      dimensionFilter: 호스트필터,
      orderBys: [{ desc: true, metric: { metricName: 'screenPageViews' } }],
    });
    if (지면.오류) {
      console.log(`   ⛔ 못 쟀다 — ${지면.오류.slice(0, 160)}`);
    } else if (!지면.줄.length) {
      console.log('   ⬜ 줄이 없다 — 못 쟀다 (0 으로 채우지 않는다)');
    } else {
      const 홈줄 = 지면.줄.filter((r) => 홈경로인가(r.키));
      const 데이터줄 = 지면.줄.filter((r) => 데이터지면인가(r.키));
      const 그밖 = 지면.줄.filter((r) => !홈경로인가(r.키) && !데이터지면인가(r.키));
      const 홈합 = 홈줄.reduce((s, r) => s + r.값[0], 0);
      const 데이터합 = 데이터줄.reduce((s, r) => s + r.값[0], 0);
      const 전체합 = 지면.줄.reduce((s, r) => s + r.값[0], 0);
      console.log(`   홈(/) ${홈합} · /data 계열 합 ${데이터합} · 그 밖 ${전체합 - 홈합 - 데이터합} · 전체 ${전체합}`);
      console.log('   /data 계열 지면별:');
      for (const r of 데이터줄) console.log(`     ${String(r.값[0]).padStart(6)}  ${r.키}`);
      if (!데이터줄.length) console.log('     ⬜ /data 계열에 열림이 하나도 없다');
      console.log(`   ⚠ 표에 없는 그 밖 지면(${그밖.length}장)은 요약만 냈다 — 전부는 --지면전부 로 본다`);
    }

    /* ② 유입 경로 — 어디로 들어와서(landingPage), 어디서 왔나(source/medium) */
    console.log('\n■ 2. 유입 경로 — 검색이 «어디로» 바로 들어오나');
    const 착지 = await q2(['landingPage'], ['sessions'], {
      dimensionFilter: 호스트필터,
      orderBys: [{ desc: true, metric: { metricName: 'sessions' } }],
    });
    if (착지.오류) {
      console.log(`   ⛔ 착지 지면을 못 쟀다 — ${착지.오류.slice(0, 160)}`);
    } else if (!착지.줄.length) {
      console.log('   ⬜ 세션이 없다 — 못 쟀다');
    } else {
      const 홈착지 = 착지.줄.filter((r) => 홈경로인가(r.키)).reduce((s, r) => s + r.값[0], 0);
      const 데이터착지 = 착지.줄.filter((r) => 데이터지면인가(r.키)).reduce((s, r) => s + r.값[0], 0);
      const 전체세션 = 착지.줄.reduce((s, r) => s + r.값[0], 0);
      console.log(`   홈으로 착지 ${홈착지}세션 · /data 로 «바로» 착지 ${데이터착지}세션`
        + ` · 그 밖 ${전체세션 - 홈착지 - 데이터착지} · 전체 ${전체세션}`);
      if (전체세션 > 0) {
        console.log(`   ⇒ 세션의 ${((100 * 데이터착지) / 전체세션).toFixed(0)}% 가 홈을 «거치지 않고» /data 로 바로 들어온다`);
      }
      console.log('   /data 로 바로 착지한 지면 상위 10:');
      for (const r of 착지.줄.filter((r) => 데이터지면인가(r.키)).slice(0, 10)) {
        console.log(`     ${String(r.값[0]).padStart(6)}  ${r.키}`);
      }
    }
    const 출처 = await q2(['sessionSource', 'sessionMedium'], ['sessions'], {
      dimensionFilter: 호스트필터,
      orderBys: [{ desc: true, metric: { metricName: 'sessions' } }],
    });
    if (출처.오류) {
      console.log(`   ⛔ 유입 출처를 못 쟀다 — ${출처.오류.slice(0, 160)}`);
    } else {
      console.log('   전체 세션의 유입 출처 상위 8:');
      for (const r of 출처.줄.slice(0, 8)) console.log(`     ${String(r.값[0]).padStart(6)}  ${r.키}`);
    }

    /* ③ 홈에서 다음 클릭 — GA4 Data API 엔 「다음 페이지」 차원이 없다.
       ⭐ pageReferrer(=바로 앞 화면의 URL)가 홈 URL 과 «정확히 같은» 페이지뷰를 모으면
       그것이 «홈 다음에 연 지면»의 근사치다. ⛔ 근사치라고 그대로 밝힌다 — 확정으로 안 읽는다. */
    console.log('\n■ 3. 홈에서 다음 클릭 — «근사치»다 (GA4 엔 다음-페이지 차원이 없다)');
    const 벗은호스트 = 호스트.replace(/^www\./, '');
    const 홈URL후보 = [벗은호스트, `www.${벗은호스트}`]
      .flatMap((h) => [`https://${h}/`, `https://${h}`]);
    const 다음클릭 = await q2(['pagePath'], ['screenPageViews'], {
      dimensionFilter: {
        andGroup: {
          expressions: [
            호스트필터,
            { filter: { fieldName: 'pageReferrer', inListFilter: { values: 홈URL후보 } } },
          ],
        },
      },
      orderBys: [{ desc: true, metric: { metricName: 'screenPageViews' } }],
    });
    if (다음클릭.오류) {
      console.log(`   ⛔ 못 쟀다 — ${다음클릭.오류.slice(0, 160)}`);
    } else if (!다음클릭.줄.length) {
      console.log('   ⬜ 「바로 앞 화면 = 홈」인 페이지뷰가 하나도 없다 — 못 쟀다.');
      console.log('      (referrer 가 안 남는 경로거나, 표본이 이 창에서 너무 적을 수 있다)');
    } else {
      console.log('   홈 바로 다음에 연 지면 상위 10 (screenPageViews):');
      for (const r of 다음클릭.줄.slice(0, 10)) console.log(`     ${String(r.값[0]).padStart(6)}  ${r.키}`);
    }

    /* ④ 이탈 지면 — 🔴 [2026-09-10] 처음엔 `exits` 지표로 짰다가 «못 쟀다»만 냈다.
       ⭐ metadata 엔드포인트(properties/{id}/metadata)로 직접 확인했다 —
       이 속성이 가진 지표에 exits·entrances 는 **아예 없다**(bounceRate·engagementRate
       계열뿐). GA4 표준 Data API 에 진짜 「퇴장 지면」 지표는 없다 — 지어내지 않는다.
       ⇒ 그나마 «착지 지면별 이탈률(bounceRate)» 이 «여기서 들어와 그대로 나갔다»에
       가장 가까운 공식 지표다. **이탈 지면(exit page)과는 다른 개념**임을 그대로 밝힌다. */
    console.log('\n■ 4. 이탈 — GA4 엔 «퇴장 지면(exit page)» 지표가 없다 (metadata 로 확인)');
    console.log('   ⛔ exits·entrances 지표 자체가 이 속성에 없다. bounceRate·engagementRate 뿐이다.');
    console.log('   ⭐ 대신 «착지 지면별 이탈률(bounceRate)» — 여기로 들어와 그대로 나갔을 가능성 —을 낸다.');
    console.log('   ⚠ 이것은 «퇴장 지면»이 아니라 «시작하자마자 끝난 지면»이다. 다른 개념이다.');
    const 이탈근사 = await q2(['landingPage'], ['sessions', 'bounceRate'], {
      dimensionFilter: 호스트필터,
      orderBys: [{ desc: true, metric: { metricName: 'sessions' } }],
    });
    if (이탈근사.오류) {
      console.log(`   ⛔ 이것도 못 쟀다 — ${이탈근사.오류.slice(0, 160)}`);
    } else if (!이탈근사.줄.length) {
      console.log('   ⬜ 줄이 없다 — 못 쟀다');
    } else {
      console.log('   착지 지면별 세션·이탈률:');
      for (const r of 이탈근사.줄.slice(0, 10)) {
        console.log(`     세션 ${String(r.값[0]).padStart(4)}  이탈률 ${(r.값[1] * 100).toFixed(0)}%  ${r.키}`);
      }
      const 홈행 = 이탈근사.줄.find((r) => 홈경로인가(r.키));
      if (홈행) console.log(`   홈(/) 착지 이탈률 ${(홈행.값[1] * 100).toFixed(0)}% (세션 ${홈행.값[0]})`);
    }

    console.log('\n⛔ 이 표는 «있었던 일»만 말한다 — 「홈에 무엇을 낼까」의 판정은 사람(5번·2번)이 한다.');
    process.exit(0);
  }

  console.log('\n⚠ GA4 는 광고차단·쿠키거부로 **덜 세는 쪽**이다. 바닥값으로 읽는다 —');
  console.log('   실제 방문자는 이보다 많을 수 있다. 「이보다 적을 수는 없다」가 우리가 말할 수 있는 것이다.');
}
