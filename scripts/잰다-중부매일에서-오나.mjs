/**
 * 잰다-중부매일에서-오나.mjs — **중부매일 운세 박스가 사람을 보내고 있나.**
 *
 * ── 왜 이 도구가 생겼나 ─────────────────────────────────────────
 * 2026-11-24 19:31 에 사장님이 중부매일 모바일·PC 「오늘의 운세」 박스에
 * 「도움말: KLifeMap.AI →」 배너를 넣으셨다. 그리고 물으셨다 —
 * 「**내일부터 조금이라도 방문자. 페이지뷰 변화를 체크해.
 *   중부매일에서 유입되는 지 파악못하지?**」
 *
 * 파악된다. GA4 는 `sessionSource` 에 레퍼러 호스트를 그대로 적는다 —
 * 중부매일에서 눌러서 오면 `www.jbnews.com` / `m.jbnews.com` 으로 찍힌다.
 * UTM 매개변수가 붙어 있지 않아도 찍힌다. 이 도구는 그것을 **날짜별로** 가른다.
 *
 * ── 이 도구가 내는 것 ────────────────────────────────────────────
 * ① 날짜별 중부매일 유입 — 세션 · 사용자 · 페이지뷰
 * ② 날짜별 KLifeMap 전체 — 세션 · 사용자 · 페이지뷰 (변화를 견주는 바탕)
 * ③ 중부매일에서 온 사람이 **어느 지면에 떨어지나**
 *
 * ── 말하지 않는 것 ──────────────────────────────────────────────
 * ⛔ 0 을 「못 쟀다」로 읽지 않는다. 0 이면 0 이라고 적는다
 * ⛔ GA4 는 광고차단·쿠키거부로 덜 센다 — 바닥값이다
 * ⛔ 배너를 넣은 날 이전의 줄은 바탕이지 성과가 아니다
 *
 * 쓰는 법  node scripts/잰다-중부매일에서-오나.mjs --자가시험
 *          node scripts/잰다-중부매일에서-오나.mjs --잰다
 *          node scripts/잰다-중부매일에서-오나.mjs --잰다 --날수=14
 */
import { readFileSync, existsSync } from 'node:fs';
import { createSign } from 'node:crypto';
import path from 'node:path';

const 속성 = '549135289';
const 우리집 = 'klifemap.ai';
const 보내는곳 = 'jbnews';   /* www.jbnews.com · m.jbnews.com 둘 다 걸린다 */

const 인자 = (이름, 기본) => {
  const 머리 = `--${이름}=`;
  const a = process.argv.find((x) => x.startsWith(머리));
  return a ? a.slice(머리.length) : 기본;
};

/** `.env` 에서 열쇠 자리를 읽는다. 값은 찍지 않는다 */
function 열쇠자리() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) return process.env.GOOGLE_APPLICATION_CREDENTIALS;
  try {
    const 본문 = readFileSync(path.resolve('.env'), 'utf8');
    const m = 본문.match(/^GOOGLE_APPLICATION_CREDENTIALS[ \t]*=[ \t]*(.+)$/m);
    return m ? m[1].trim().replace(/^["']|["']$/g, '') : null;
  } catch { return null; }
}

/** GA4 가 주는 20261124 를 2026-11-24 로 */
export function 날짜꼴(s) {
  const t = String(s ?? '');
  if (!/^[0-9]{8}$/.test(t)) return t || '(모름)';
  return `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)}`;
}

/** 중부매일에서 온 것인가 — 모바일 주소와 PC 주소를 둘 다 받는다 */
export function 중부매일인가(출처) {
  return /jbnews/i.test(String(출처 ?? ''));
}

/**
 * 검색엔진 갈래 — 사장님 2026-11-26 「네이버 사용자, 구글 사용자, 기타 검색엔진」
 *   네이버·구글은 출처 이름으로 가른다(검색 말고 블로그·카페에서 온 것도 네이버에 든다).
 *   기타 검색엔진은 이름이 알려진 곳이거나 매체가 organic 인 나머지다.
 *   ⛔ 중부매일(jbnews)은 여기에 넣지 않는다 — 따로 세는 칸이 있다.
 */
export function 검색엔진갈래(출처, 매체) {
  const s = String(출처 ?? '').toLowerCase();
  const m = String(매체 ?? '').toLowerCase();
  if (!s || 중부매일인가(s)) return null;
  if (AI갈래(s)) return null;   /* gemini.google.com 은 구글 검색이 아니다 — AI 칸에서 센다 */
  if (s.includes('naver')) return '네이버';
  if (s.includes('google')) return '구글';
  if (/(^|\.)(daum|bing|yahoo|duckduckgo|zum|yandex|baidu|ecosia|brave|nate)(\.|$)/.test(s)) return '기타';
  if (m === 'organic') return '기타';
  return null;
}

/**
 * AI 갈래 — 사장님 2026-11-27 「항목 추가: AI (1) 챗gpt (2) 구글gemini (3) 클로드 (4) 기타」
 *   출처 이름으로 가른다. 검색엔진 칸보다 먼저 판정한다(gemini.google.com 이 구글로 새지 않게).
 *   ⚠ AI 서비스가 레퍼러를 안 넘기면 GA4 에는 direct 로 잡힌다 — 이 칸은 바닥값이다.
 */
export function AI갈래(출처) {
  const s = String(출처 ?? '').toLowerCase();
  if (!s) return null;
  if (/chatgpt|openai/.test(s)) return '챗GPT';
  if (/gemini|bard\.google/.test(s)) return '제미나이';
  if (/claude|anthropic/.test(s)) return '클로드';
  if (/perplexity|copilot|deepseek|grok|(^|\.)x\.ai$|(^|\.)you\.com$|phind|(^|\.)poe\.com$|mistral|meta\.ai|wrtn|kagi|felo|genspark|doubao|kimi|qwen|clova-x|(^|\.)liner\./.test(s)) return 'AI기타';
  return null;
}

/** 날짜별 AI 사용자 — [날짜, {챗GPT, 제미나이, 클로드, AI기타}] */
export function AI별로(줄들) {
  const 통 = new Map();
  for (const r of 줄들 ?? []) {
    const 날 = 날짜꼴(r?.dimensionValues?.[0]?.value);
    const 갈래 = AI갈래(r?.dimensionValues?.[1]?.value);
    const 앞 = 통.get(날) ?? { 챗GPT: 0, 제미나이: 0, 클로드: 0, AI기타: 0 };
    if (갈래) 앞[갈래] += Number(r?.metricValues?.[0]?.value ?? 0);
    통.set(날, 앞);
  }
  return 통;
}

/** 날짜별 검색엔진 사용자 — [날짜, {네이버, 구글, 기타}] */
export function 검색엔진별로(줄들) {
  const 통 = new Map();
  for (const r of 줄들 ?? []) {
    const 날 = 날짜꼴(r?.dimensionValues?.[0]?.value);
    const 갈래 = 검색엔진갈래(r?.dimensionValues?.[1]?.value, r?.dimensionValues?.[2]?.value);
    const 앞 = 통.get(날) ?? { 네이버: 0, 구글: 0, 기타: 0 };
    if (갈래) 앞[갈래] += Number(r?.metricValues?.[0]?.value ?? 0);
    통.set(날, 앞);
  }
  return 통;
}

/** 날짜별로 접는다 — [날짜, {세션, 사람, 지면수}] */
export function 날짜별로(줄들) {
  const 통 = new Map();
  for (const r of 줄들 ?? []) {
    const 날 = 날짜꼴(r?.dimensionValues?.[0]?.value);
    const 앞 = 통.get(날) ?? { 세션: 0, 사람: 0, 지면수: 0 };
    통.set(날, {
      세션: 앞.세션 + Number(r?.metricValues?.[0]?.value ?? 0),
      사람: 앞.사람 + Number(r?.metricValues?.[1]?.value ?? 0),
      지면수: 앞.지면수 + Number(r?.metricValues?.[2]?.value ?? 0),
    });
  }
  return 통;
}

/* ────────────────────────── 자가시험 ────────────────────────── */
function 자가시험() {
  const 시험 = [];
  const T = (이름, 참) => 시험.push([이름, !!참]);

  T('날짜꼴 — 20261124 를 2026-11-24 로', 날짜꼴('20261124') === '2026-11-24');
  T('날짜꼴 — 빈 값에 안 터진다', 날짜꼴(undefined) === '(모름)');
  T('날짜꼴 — 모르는 꼴은 그대로 둔다', 날짜꼴('today') === 'today');

  /* 🔴 모바일 주소를 빠뜨리면 유입의 대부분을 놓친다 —
     2026-11-15 실측에서 네이버 유입의 80%가 m. 로 들어왔다. 같은 자리다 */
  T('중부매일 — PC 주소를 알아본다', 중부매일인가('www.jbnews.com'));
  T('중부매일 — 모바일 주소를 알아본다', 중부매일인가('m.jbnews.com'));
  T('중부매일 — 대문자도 알아본다', 중부매일인가('WWW.JBNEWS.COM'));
  T('중부매일 — 네이버는 아니다', !중부매일인가('m.search.naver.com'));
  T('중부매일 — 빈 값에 안 터진다', !중부매일인가(undefined));

  const 줄 = [
    { dimensionValues: [{ value: '20261124' }], metricValues: [{ value: '3' }, { value: '3' }, { value: '7' }] },
    { dimensionValues: [{ value: '20261124' }], metricValues: [{ value: '2' }, { value: '2' }, { value: '4' }] },
    { dimensionValues: [{ value: '20261123' }], metricValues: [{ value: '0' }, { value: '0' }, { value: '0' }] },
  ];
  const t = 날짜별로(줄);
  T('날짜별 — 같은 날 두 줄을 한 날로 모은다', t.get('2026-11-24').세션 === 5);
  T('날짜별 — 페이지뷰도 모은다', t.get('2026-11-24').지면수 === 11);
  T('날짜별 — 0 인 날을 «버리지 않는다»', t.has('2026-11-23') && t.get('2026-11-23').세션 === 0);
  T('날짜별 — 빈 입력에 안 터진다', 날짜별로(undefined).size === 0);

  T('검색엔진 — 네이버 모바일 검색', 검색엔진갈래('m.search.naver.com', 'referral') === '네이버');
  T('검색엔진 — 구글 자연검색', 검색엔진갈래('google', 'organic') === '구글');
  T('검색엔진 — 다음·빙은 기타', 검색엔진갈래('search.daum.net', 'referral') === '기타' && 검색엔진갈래('bing', 'organic') === '기타');
  T('검색엔진 — 직접 유입은 어디에도 안 든다', 검색엔진갈래('(direct)', '(none)') === null);
  T('검색엔진 — ChatGPT 는 검색엔진으로 안 센다', 검색엔진갈래('chatgpt.com', 'referral') === null);
  T('🔴 검색엔진 — 중부매일은 넣지 않는다', 검색엔진갈래('m.jbnews.com', 'referral') === null);
  const 검 = 검색엔진별로([
    { dimensionValues: [{ value: '20261125' }, { value: 'naver' }, { value: 'organic' }], metricValues: [{ value: '4' }] },
    { dimensionValues: [{ value: '20261125' }, { value: 'm.search.naver.com' }, { value: 'referral' }], metricValues: [{ value: '3' }] },
    { dimensionValues: [{ value: '20261125' }, { value: '(direct)' }, { value: '(none)' }], metricValues: [{ value: '9' }] },
  ]);
  T('검색엔진별 — 같은 날 네이버 두 줄을 모은다', 검.get('2026-11-25').네이버 === 7);
  T('검색엔진별 — 없는 갈래는 0 이다', 검.get('2026-11-25').구글 === 0 && 검.get('2026-11-25').기타 === 0);

  T('AI — 챗GPT 두 주소', AI갈래('chatgpt.com') === '챗GPT' && AI갈래('chat.openai.com') === '챗GPT');
  T('AI — 제미나이', AI갈래('gemini.google.com') === '제미나이');
  T('🔴 AI — 제미나이는 구글 검색 칸에 안 든다', 검색엔진갈래('gemini.google.com', 'referral') === null);
  T('AI — 클로드', AI갈래('claude.ai') === '클로드');
  T('AI — 퍼플렉시티·코파일럿은 기타', AI갈래('perplexity.ai') === 'AI기타' && AI갈래('copilot.microsoft.com') === 'AI기타');
  T('🔴 AI — 퍼플렉시티는 기타 검색엔진 칸에 안 든다', 검색엔진갈래('perplexity', 'organic') === null);
  T('AI — 네이버·구글·직접 유입은 AI 가 아니다', AI갈래('m.search.naver.com') === null && AI갈래('google') === null && AI갈래('(direct)') === null);
  const 에 = AI별로([
    { dimensionValues: [{ value: '20261126' }, { value: 'chatgpt.com' }, { value: 'referral' }], metricValues: [{ value: '2' }] },
    { dimensionValues: [{ value: '20261126' }, { value: 'chatgpt.com' }, { value: '(not set)' }], metricValues: [{ value: '1' }] },
    { dimensionValues: [{ value: '20261126' }, { value: 'naver' }, { value: 'organic' }], metricValues: [{ value: '9' }] },
  ]);
  T('AI별 — 같은 날 챗GPT 두 줄을 모은다', 에.get('2026-11-26').챗GPT === 3);
  T('AI별 — 없는 갈래는 0 이다', 에.get('2026-11-26').클로드 === 0 && 에.get('2026-11-26').AI기타 === 0);

  T('열쇠자리 — 없으면 null 이다', 열쇠자리() === null || typeof 열쇠자리() === 'string');

  const 진 = 시험.filter(([, ok]) => !ok);
  for (const [이름] of 진) console.error(`❌ ${이름}`);
  if (진.length) { console.error(`⛔ 자가시험 ${진.length}개 실패`); process.exit(1); }
  console.log(`✅ 잰다-중부매일에서-오나 자가시험 통과 (${시험.length})`);
}

/* ────────────────────────── 실행 ────────────────────────── */
if (process.argv.includes('--자가시험')) { 자가시험(); process.exit(0); }
if (!process.argv.includes('--잰다')) {
  console.error('⛔ --잰다 나 --자가시험 을 준다');
  process.exit(1);
}

const 키길 = 열쇠자리();
if (!키길 || !existsSync(키길)) {
  console.error('⛔ 서비스 계정 열쇠가 없다 — **측정하지 못했다**. 0 으로 적지 않는다');
  process.exit(1);
}
const 키 = JSON.parse(readFileSync(키길, 'utf8'));
const now = Math.floor(Date.now() / 1000);
const h = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
const b = Buffer.from(JSON.stringify({
  iss: 키.client_email, scope: 'https://www.googleapis.com/auth/analytics.readonly',
  aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
})).toString('base64url');
const sg = createSign('RSA-SHA256').update(`${h}.${b}`).sign(키.private_key, 'base64url');
const tr = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: `${h}.${b}.${sg}`,
  }),
});
if (!tr.ok) { console.error(`⛔ 토큰을 받지 못했다 — HTTP ${tr.status}. 측정하지 못했다`); process.exit(1); }
const { access_token } = await tr.json();

const 날수 = Number(인자('날수', '10'));
const 집필터 = { filter: { fieldName: 'hostName', stringFilter: { matchType: 'CONTAINS', value: 우리집 } } };
const 중부필터 = { filter: { fieldName: 'sessionSource', stringFilter: { matchType: 'CONTAINS', value: 보내는곳 } } };

async function 묻는다(몸통) {
  const r = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${속성}:runReport`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(몸통),
  });
  if (!r.ok) return { 못쟀다: `HTTP ${r.status}` };
  return r.json();
}

const 셋 = [{ name: 'sessions' }, { name: 'totalUsers' }, { name: 'screenPageViews' }];

const 중부 = await 묻는다({
  dateRanges: [{ startDate: `${날수}daysAgo`, endDate: 'today' }],
  dimensions: [{ name: 'date' }],
  metrics: 셋,
  dimensionFilter: { andGroup: { expressions: [집필터, 중부필터] } },
  limit: 400,
});
const 전체 = await 묻는다({
  dateRanges: [{ startDate: `${날수}daysAgo`, endDate: 'today' }],
  dimensions: [{ name: 'date' }],
  metrics: 셋,
  dimensionFilter: 집필터,
  limit: 400,
});

const 검색 = await 묻는다({
  dateRanges: [{ startDate: `${날수}daysAgo`, endDate: 'today' }],
  dimensions: [{ name: 'date' }, { name: 'sessionSource' }, { name: 'sessionMedium' }],
  metrics: [{ name: 'totalUsers' }],
  dimensionFilter: 집필터,
  limit: 5000,
});

if (중부.못쟀다 || 전체.못쟀다 || 검색.못쟀다) {
  console.error(`⛔ 측정하지 못했다 — ${중부.못쟀다 || 전체.못쟀다 || 검색.못쟀다}`);
  process.exit(1);
}

const 중부표 = 날짜별로(중부.rows);
const 전체표 = 날짜별로(전체.rows);
const 검색표 = 검색엔진별로(검색.rows);
const 날들 = [...new Set([...중부표.keys(), ...전체표.keys()])].sort();

/* 사장님 2026-11-26 — 항목을 이 순서로 바꾼다 */
/* 사장님 2026-11-27 — AI 네 칸을 더한다(챗GPT · 구글 Gemini · 클로드 · 기타) */
const AI표 = AI별로(검색.rows);
const 머리 = ['날짜', '중부매일 세션', '중부매일 사용자', '네이버 사용자', '구글 사용자', '기타 검색엔진',
  'AI 챗GPT', 'AI 구글 Gemini', 'AI 클로드', 'AI 기타', '전체 세션', '전체 사용자', '전체 페이지뷰'];
const 표 = 날들.map((d) => {
  const a = 중부표.get(d) ?? { 세션: 0, 사람: 0, 지면수: 0 };
  const z = 전체표.get(d) ?? { 세션: 0, 사람: 0, 지면수: 0 };
  const g = 검색표.get(d) ?? { 네이버: 0, 구글: 0, 기타: 0 };
  const i = AI표.get(d) ?? { 챗GPT: 0, 제미나이: 0, 클로드: 0, AI기타: 0 };
  return [d, a.세션, a.사람, g.네이버, g.구글, g.기타, i.챗GPT, i.제미나이, i.클로드, i.AI기타, z.세션, z.사람, z.지면수];
});

console.log(`■ 중부매일 → KLifeMap 유입 — 최근 ${날수}일 · 속성 ${속성}`);
console.log('   배너를 넣은 날: 2026-11-24 19:31 (사장님) — 그 앞줄은 바탕이지 성과가 아니다\n');
console.log(머리.join(' | '));
for (const 줄 of 표) console.log(줄.join(' | '));

const 자료길 = 인자('자료', '');
if (자료길) {
  const { writeFileSync } = await import('node:fs');
  writeFileSync(자료길, JSON.stringify({ head: 머리, rows: 표 }), 'utf8');
  console.log(`\n자료를 적었다 — ${자료길}`);
}

const 중부합 = [...중부표.values()].reduce((s, x) => s + x.세션, 0);
console.log(`\n중부매일에서 온 세션 합계: ${중부합}`);
if (중부합 === 0) {
  console.log('⬜ 중부매일에서 온 세션이 «0» 이다. 측정하지 못한 것이 아니라 0 이다.');
} else {
  const 어디 = await 묻는다({
    dateRanges: [{ startDate: `${날수}daysAgo`, endDate: 'today' }],
    dimensions: [{ name: 'landingPage' }],
    metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
    dimensionFilter: { andGroup: { expressions: [집필터, 중부필터] } },
    limit: 50,
  });
  if (!어디.못쟀다) {
    console.log('\n■ 중부매일에서 온 사람이 떨어진 지면');
    for (const r of (어디.rows ?? [])) {
      const p = r?.dimensionValues?.[0]?.value ?? '(모름)';
      console.log(`   ${String(p).slice(0, 56).padEnd(58)} 세션 ${r?.metricValues?.[0]?.value} · 사람 ${r?.metricValues?.[1]?.value}`);
    }
  }
}
console.log('\n⚠ GA4 는 광고차단·쿠키거부로 덜 센다 — 바닥값으로 읽는다.');
console.log('⚠ 오늘 줄은 하루가 안 끝났으므로 다음 날 다시 읽는다.');
