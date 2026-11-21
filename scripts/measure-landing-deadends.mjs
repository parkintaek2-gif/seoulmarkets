/**
 * 들어온 «문»이 막다른 길인가를 잰다 — 유닛 누구나 --호스트=·--접두= 만 바꿔 쓴다.
 *
 * 왜 만들었나 (2026-08-26 22:4x · 5번)
 *   28일을 재니 K Culture Wire 는 걸음이 1.73장이었다 — 사람이 한 장 보고 나간다.
 *   「어느 지면으로 들어오나」는 이미 잴 수 있었는데, **그 지면이 다음 장을 내주는가**는
 *   아무도 안 쟀다. 들어온 문이 막다른 길이면 장수를 아무리 늘려도 걸음은 안 는다.
 *
 * ⛔ 이 자는 «판정»하지 않는다. 「이 문으로 N명이 들어왔고, 그 문에 우리 지면으로 가는
 *    링크가 M갈래 있다」까지만 말한다. 갈래가 많아도 안 눌릴 수 있다 —
 *    닿는 것과 걷는 것은 다른 말이다.
 * ⛔ 못 잰 것은 「못잼」으로 적는다. 
 *
 * 쓰기
 *   node scripts/measure-landing-deadends.mjs                        (기본: kculturewire)
 *   node scripts/measure-landing-deadends.mjs --호스트=100yearmap --접두=
 *   node scripts/measure-landing-deadends.mjs --자가시험
 */
import { readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { 토큰받기 } from './ga4-report.mjs';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 속성 = '549135289';

/** 지면 글자에서 «우리 지면으로 가는» 링크를 센다. 밖으로 나가는 것은 안 센다. */
export function 안쪽링크세기(글자) {
  if (typeof 글자 !== 'string') return null;          /* 못 읽었으면 못잼 */
  const 모두 = [...글자.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]);
  const 안쪽 = 모두.filter((h) => h.startsWith('/') && !h.startsWith('//'));
  /* 같은 곳으로 여러 번 가는 것은 «한 갈래»로 센다 — 목록이 길다고 갈래가 많은 게 아니다 */
  return new Set(안쪽.map((h) => h.split('#')[0].split('?')[0])).size;
}

/**
 * 주소 → 우리가 만든 파일 자리.
 *
 * 🔴 2026-08-26 22:3x — **여기서 한 번 틀렸다.** 처음엔 접두를 안 붙였더니 25개 문 가운데
 *   22개가 「못잼」으로 나왔다. 88% 가 못잼이면 그건 발견이 아니라 «자가 부러진 것»이다.
 *   K Culture Wire 지면은 `dist/wikitip/` 아래에 서고 손님에게는 `/` 로 보인다.
 *   더 나쁜 것은, 접두 없이 찾으니 `/about` 이 «다른 사이트의» about 을 집어
 *   「갈래 17」이라는 **틀린 숫자**를 냈다는 것이다. 못잼보다 틀린 숫자가 더 나쁘다.
 *
 * 그래서 접두 밑을 «먼저» 보되, 접두 없는 자리도 버리지 않는다.
 */
export function 파일자리들(주소, 뿌리경로, 접두 = '') {
  const 깨끗 = (주소 || '/').split('?')[0].split('#')[0];
  const 이름 = 깨끗.replace(/\/$/, '').replace(/^\//, '');
  const 자리 = [];
  const 붙임 = (밑) => {
    if (이름 === '') {
      /* 뿌리 — Astro 의 file 포맷에서는 `<접두>.html` 이 될 수 있다 */
      if (밑 !== 뿌리경로) 자리.push(`${밑}.html`);
      자리.push(path.join(밑, 'index.html'));
      return;
    }
    자리.push(path.join(밑, `${이름}.html`));
    자리.push(path.join(밑, 이름, 'index.html'));
  };
  if (접두) 붙임(path.join(뿌리경로, 접두));
  붙임(뿌리경로);
  return 자리;
}

export function 글자읽기(주소, 뿌리경로, 접두 = '') {
  for (const 자리 of 파일자리들(주소, 뿌리경로, 접두)) {
    if (existsSync(자리) && statSync(자리).isFile()) return readFileSync(자리, 'utf8');
  }
  return null;                                        /* 못 찾았으면 못잼 */
}

/* ── 자가시험 ─────────────────────────────────────────── */
if (process.argv.includes('--자가시험')) {
  let 깨짐 = 0;
  const 본다 = (이름, 참) => { if (참) console.log(`  ✅ ${이름}`); else { console.log(`  ❌ ${이름}`); 깨짐 += 1; } };
  console.log('자가시험 — measure-landing-deadends');
  본다('밖으로 나가는 링크는 안 센다',
    안쪽링크세기('<a href="https://x.com/a">a</a><a href="/b">b</a>') === 1);
  본다('같은 곳 두 번은 한 갈래로 센다', 안쪽링크세기('<a href="/b">1</a><a href="/b">2</a>') === 1);
  본다('물음표·닻은 같은 곳으로 본다', 안쪽링크세기('<a href="/b?x=1">1</a><a href="/b#c">2</a>') === 1);
  본다('//로 시작하는 것은 밖이다', 안쪽링크세기('<a href="//x.com/a">a</a>') === 0);
  본다('작은따옴표도 읽는다', 안쪽링크세기("<a href='/b'>b</a>") === 1);
  본다('대문자 A 도 읽는다', 안쪽링크세기('<A HREF="/b">b</A>') === 1);
  본다('글자가 아니면 못잼(null)', 안쪽링크세기(null) === null);
  본다('링크가 없으면 0 이다 — 못잼이 아니다', 안쪽링크세기('<p>없다</p>') === 0);
  본다('/ 는 index 로 본다', 파일자리들('/', 'D').some((x) => x.endsWith(`${path.sep}index.html`)));
  본다('꼬리 빗금을 벗긴다', 파일자리들('/a/', 'D')[0] === 파일자리들('/a', 'D')[0]);
  본다('접두 없으면 두 꼴을 본다', 파일자리들('/a', 'D').length === 2);
  /* 🔴 아래 넷이 22:3x 의 «자가 부러진 것»을 다시 못 일어나게 막는다 */
  본다('접두를 주면 접두 밑을 «먼저» 본다',
    파일자리들('/a', 'D', 'w')[0] === path.join('D', 'w', 'a.html'));
  본다('접두를 줘도 접두 없는 자리를 «버리지» 않는다',
    파일자리들('/a', 'D', 'w').includes(path.join('D', 'a.html')));
  본다('접두 + 뿌리(/)는 `접두.html` 도 본다',
    파일자리들('/', 'D', 'w').includes(path.join('D', 'w.html')));
  본다('접두를 주면 자리가 네 곳 이상이다', 파일자리들('/a', 'D', 'w').length >= 4);
  console.log(깨짐 === 0 ? `\n✅ 15개 다 통과` : `\n❌ ${깨짐}개 깨짐`);
  process.exit(깨짐 === 0 ? 0 : 1);
}

/* ── 본짓 ─────────────────────────────────────────────── */
/**
 * 🔴 직접 부를 때만 아래를 돈다.
 *   2026-08-24 에 `broadcast-visitors-dwell.mjs` 가 이 관문이 없어서, 그 자를 import 한
 *   쪽 프로세스가 «그냥 끝나» 버렸다. 같은 함정을 두 번 밟지 않는다 —
 *   위 세 함수(안쪽링크세기·파일자리들·글자읽기)는 다른 자가 갖다 쓸 것이기 때문이다.
 */
const 직접부름 = process.argv[1]
  && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (!직접부름) {
  /* 갖다 쓰는 쪽에는 함수만 내주고 조용히 나간다 */
} else {
const 호스트 = process.argv.find((a) => a.startsWith('--호스트='))?.split('=')[1] ?? 'kculturewire';
const 뿌리이름 = process.argv.find((a) => a.startsWith('--뿌리='))?.split('=')[1] ?? 'dist';
const 일 = Number(process.argv.find((a) => a.startsWith('--날수='))?.split('=')[1]) || 28;
const 몇줄 = Number(process.argv.find((a) => a.startsWith('--줄='))?.split('=')[1]) || 25;
/* ⭐ 유닛마다 빌드 결과에서 서는 자리가 다르다 — 5번은 dist/wikitip 이 손님에게 `/` 다 */
const 접두인자 = process.argv.find((a) => a.startsWith('--접두='));
const 접두 = 접두인자 ? 접두인자.split('=')[1] : (호스트.includes('kculturewire') ? 'wikitip' : '');
const 뿌리경로 = path.join(뿌리, 뿌리이름);

const 키자리 = process.env.GOOGLE_APPLICATION_CREDENTIALS
  || 'C:\\Users\\USER\\secrets\\search-console-sa.json';
if (!existsSync(키자리)) { console.log('❌ 서비스 계정 열쇠를 못 찾았다 — 못 잰다'); process.exit(1); }
const 토큰 = await 토큰받기(JSON.parse(readFileSync(키자리, 'utf8')));

const r = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${속성}:runReport`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${토큰}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    dateRanges: [{ startDate: `${일}daysAgo`, endDate: 'yesterday' }],
    dimensions: [{ name: 'landingPage' }],
    metrics: [{ name: 'sessions' }, { name: 'screenPageViews' }, { name: 'userEngagementDuration' }],
    dimensionFilter: { filter: { fieldName: 'hostName', stringFilter: { matchType: 'CONTAINS', value: 호스트 } } },
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: 200,
  }),
});
const 몸 = await r.json();
if (!몸.rows) { console.log(`❌ 못 읽었다 — ${JSON.stringify(몸).slice(0, 300)}`); process.exit(1); }

console.log(`# 들어온 문이 막다른 길인가 — ${호스트} · 최근 ${일}일(어제까지)\n`);
if (접두) console.log(`⚠ 빌드 결과에서 \`${뿌리이름}/${접두}/\` 밑을 먼저 본다 — 다른 유닛은 \`--접두=\` 로 바꾼다.`);
if (!existsSync(뿌리경로)) console.log(`⚠ \`${뿌리이름}/\` 이 없다 — 갈래가 «전부 못잼»이 된다. 먼저 빌드하십시오.`);
console.log('');
console.log('  문(들어온 지면)                              세션  열림  세션당초  갈래');
console.log(`  ${'─'.repeat(74)}`);

let 막다른세션 = 0; let 전체세션 = 0; let 못잰문 = 0;
const 막다른것 = [];
const 볼것 = 몸.rows.slice(0, 몇줄);
for (const 줄 of 볼것) {
  const 주소 = 줄.dimensionValues[0].value;
  const 세션 = Number(줄.metricValues[0].value);
  const 열림 = Number(줄.metricValues[1].value);
  const 초 = Number(줄.metricValues[2].value);
  const 갈래 = 안쪽링크세기(글자읽기(주소, 뿌리경로, 접두));
  전체세션 += 세션;
  if (갈래 === null) 못잰문 += 1;
  else if (갈래 <= 5) { 막다른세션 += 세션; 막다른것.push({ 주소, 세션, 갈래 }); }
  const 칸 = (주소.length > 42 ? `${주소.slice(0, 39)}…` : 주소).padEnd(42);
  const 갈래칸 = 갈래 === null ? '못잼' : String(갈래);
  console.log(`  ${칸} ${String(세션).padStart(5)} ${String(열림).padStart(5)} ${(세션 ? (초 / 세션).toFixed(1) : '0.0').padStart(8)} ${갈래칸.padStart(5)}`);
}
console.log('');
console.log(`⭐ 위 ${볼것.length}개 문에 세션 ${전체세션}건. 문은 모두 ${몸.rows.length}개다.`);
if (못잰문 > 볼것.length / 2) {
  console.log('\n🔴 «못잼»이 절반을 넘는다 — 이건 발견이 아니라 **자가 부러진 것**이다.');
  console.log('   빌드가 오래됐거나 `--접두=` 가 틀렸다. 숫자를 읽기 전에 그것부터 고친다.');
}
if (못잰문) console.log(`⚠ 그중 ${못잰문}개는 «못잼» — 빌드 결과에서 그 파일을 못 찾았다. 0 이 아니다.`);
if (막다른것.length) {
  console.log(`\n🔴 갈래가 5개 이하인 문 ${막다른것.length}개 — 세션 ${막다른세션}건이 여기로 들어온다`);
  for (const m of 막다른것.slice(0, 12)) console.log(`   · ${m.주소}  세션 ${m.세션} · 갈래 ${m.갈래}`);
  console.log('\n   ⭐ 여기에 «다음 장»을 붙이는 것이 새 지면 100장보다 걸음을 먼저 올린다.');
}
console.log('\n⛔ 이것은 판정이 아니다. 갈래가 많아도 «눌린다»는 뜻은 아니다 —');
console.log('   닿는 것과 걷는 것은 다른 말이다. 눌리는지는 GA4 에서 따로 재야 한다.');
}
