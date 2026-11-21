/**
 * 오늘 한국 연예 데스크가 «이름을 쓴 사람»이 영어권에서 찾아지나 — 5번 · 2026-09-10
 *
 * 우리가 쥔 자료 둘을 처음으로 붙인다.
 *   ① archive/raw/newsdesk-korean-press/<날짜>.json  — 매일 받는 신문 제목 (소급 불가라 매일 받는다)
 *   ② 위키미디어 열람수 API (CC0)                    — 영어판에서 몇 사람이 그 문서를 열었나
 *
 * ⛔ 제목 «본문»을 옮기지 않는다. 라이선스가 없다. 우리가 쓰는 것은 「그 사람 이름이 오늘
 *    거기 있었다」는 사실 하나뿐이고, 세는 것은 전부 우리 자료·공개 자료다.
 *
 * 🔴 이 자에서 쓰는 규율 셋은 오늘 실측으로 얻은 것이다 —
 *   1 넘김을 먼저 푼다. 넘김 문서로 재면 수가 몇십 분의 일이 된다 (RM 27,156 대 711,190)
 *   2 풀린 문서가 «그 사람»인지 따로 묻는다. 수가 나온 것은 증거가 아니다 (Karina 3,493)
 *   3 못 받은 것을  「못 받았다」로 낸다
 *
 * 쓰는 법
 *   node scripts/collect-kcw-newsdesk-names-abroad.mjs --자가시험
 *   node scripts/collect-kcw-newsdesk-names-abroad.mjs [--날짜 20260910] [--적는다]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const 낼곳 = 'src/data/kcw-newsdesk-names-abroad.json';
export const 아카이브방 = 'archive/raw/newsdesk-korean-press';
export const 판 = 'en';
export const 창 = { 처음: '20250901', 끝: '20260831' };
export const 창말 = 'September 2025 to August 2026';

/** 연예 데스크로 보는 매체 — 아카이브의 「갈래」가 아니라 이름으로 못 박는다 */
export const 연예매체 = ['스타뉴스', '텐아시아'];

/**
 * 오늘 제목에 이름이 있던 사람들. 후보 문서 이름은 손으로 적고 «자가 검사»가 잡는다.
 * 갈래는 우리가 가른 것이다 — 그 사람의 직업이 아니라 «오늘 그 제목에서 무엇으로 나왔나»다.
 */
export const 이름들 = [
  { 이름: '장기하',        후보: 'Chang Kiha',            갈래: 'musician',  매체: '스타뉴스' },
  { 이름: '윤가이',        후보: 'Yoon Ga-i',             갈래: 'actor',     매체: '스타뉴스' },
  { 이름: '왕옌청',        후보: 'Wang Yen-cheng',        갈래: 'sport',     매체: '스타뉴스' },
  { 이름: '방탄소년단 진', 후보: 'Jin (singer)',          갈래: 'k-pop',     매체: '스타뉴스' },
  { 이름: '김현수',        후보: 'Kim Hyun-soo (baseball)', 갈래: 'sport',   매체: '스타뉴스' },
  { 이름: '제이켠',        후보: "J'Kyun",                갈래: 'musician',  매체: '스타뉴스' },
  { 이름: '뱀뱀',          후보: 'BamBam',     갈래: 'k-pop',     매체: '텐아시아' },
  { 이름: '장영란',        후보: 'Jang Young-ran',        갈래: 'tv',        매체: '텐아시아' },
  { 이름: '이상우',        후보: 'Lee Sang-woo',  갈래: 'actor',     매체: '텐아시아' },
  { 이름: '문근영',        후보: 'Moon Geun-young',       갈래: 'actor',     매체: '텐아시아' },
  { 이름: '황정음',        후보: 'Hwang Jung-eum',        갈래: 'actor',     매체: '텐아시아' },
  { 이름: '한채아',        후보: 'Han Chae-ah',           갈래: 'actor',     매체: '텐아시아' },
  { 이름: '강훈',          후보: 'Kang Hoon',             갈래: 'actor',     매체: '텐아시아' },
  { 이름: '손예진',        후보: 'Son Ye-jin',            갈래: 'actor',     매체: '텐아시아' },
  { 이름: '현빈',          후보: 'Hyun Bin',              갈래: 'actor',     매체: '텐아시아' },
  { 이름: '전소연',        후보: 'Soyeon',                갈래: 'k-pop',     매체: '텐아시아' },
  { 이름: '서인영',        후보: 'Seo In-young',          갈래: 'k-pop',     매체: '텐아시아' },
  { 이름: '차범근',        후보: 'Cha Bum-kun',           갈래: 'sport',     매체: '텐아시아' },
];

/**
 * ⬜ 일부러 뺀 사람 — 뺀 까닭을 지면에 적는다. 「없었다」로 적지 않는다.
 * 박지윤은 영어판에 «같은 이름 두 사람»(아나운서·가수)이 있어 오늘 제목의 사람을 가릴 수 없다.
 */
export const 못가른이름 = [
  { 이름: '박지윤', 왜: 'Two different people share this romanisation on English Wikipedia (a broadcaster and a singer) and the headline does not disambiguate.' },
];

/**
 * 「그 문서가 한국 연예·스포츠 자리의 사람인가」를 분류로 묻는다 — 넘김이 다른 사람에게 갈 수 있다.
 *
 * 🔴 처음에 이 자를 «한국 국적»으로 좁게 두었더니 «맞는 사람»을 걸러 냈다 —
 *    뱀뱀(BamBam)은 태국 사람이고 한국 그룹에서 활동한다. 우리 축은 국적이 아니라
 *    「오늘 한국 연예 데스크가 이름을 쓴 사람」이므로 K팝·KBO 도 함께 본다.
 * ⛔ 그래도 넓히지 «않는» 것이 있다 — 아무 분류도 안 걸리면 못 쟀다로 낸다. 통과시키지 않는다.
 */
export const 한국분류 = /(South Korean|Korean|Korea|K-pop|KBO)/i;

/** 우리 자료에서 «연예매체 제목 수»만 센다. 제목 글은 세지도 옮기지도 않는다 */
export function 제목수세기(아카이브, 볼매체 = 연예매체) {
  const m = 아카이브?.매체별;
  if (!m || typeof m !== 'object') return { 못셈: '아카이브에 매체별 칸이 없다' };
  const 줄 = [];
  for (const 이름 of 볼매체) {
    const 하나 = m[이름];
    if (!하나) { 줄.push({ 매체: 이름, 못셈: '그 매체가 그날 자료에 없다' }); continue; }
    줄.push({
      매체: 이름,
      받은수: Number(하나.받은수 ?? 0),
      쓸만한수: Number(하나.쓸만한수 ?? (하나.쓸만한?.length ?? 0)),
    });
  }
  return { 줄 };
}

/** 분류 목록에서 한국 사람인지 판정한다. ⛔ 「분류가 안 왔다」를 「한국인이 아니다」로 읽지 않는다 */
export function 한국사람인가(분류들) {
  if (!Array.isArray(분류들)) return { 맞나: null, 왜: '분류가 안 왔다' };
  if (분류들.length === 0) return { 맞나: null, 왜: '분류가 비어 왔다' };
  const 걸린것 = 분류들.filter((c) => 한국분류.test(String(c)));
  return 걸린것.length > 0
    ? { 맞나: true, 걸린분류: 걸린것.slice(0, 3) }
    : { 맞나: false, 왜: 'the article carries no Korea, K-pop or KBO category — it may be a different person with the same romanisation' };
}

/** 갈래별로 «찾아지는 사람 수»와 «열람수 합»을 낸다 */
export function 갈래별(줄들) {
  const 표 = new Map();
  for (const r of 줄들) {
    const k = r.갈래 ?? '기타';
    if (!표.has(k)) 표.set(k, { 갈래: k, 사람: 0, 문서있음: 0, 열람합: 0, 못쟀다: 0 });
    const t = 표.get(k);
    t.사람 += 1;
    if (typeof r.합 === 'number') { t.문서있음 += 1; t.열람합 += r.합; }
    else t.못쟀다 += 1;
  }
  return [...표.values()].sort((a, b) => b.열람합 - a.열람합);
}

/** 중간값 — 평균이 규범이 되지 않게 분포를 함께 낸다 */
export function 중간값(수들) {
  const s = 수들.filter((n) => typeof n === 'number' && Number.isFinite(n)).sort((a, b) => a - b);
  if (s.length === 0) return null;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

/** '10 September 2026, 14:05 KST' */
export function 영문시각(날 = new Date()) {
  const 달 = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const 두자 = (n) => String(n).padStart(2, '0');
  return `${날.getDate()} ${달[날.getMonth()]} ${날.getFullYear()}, ${두자(날.getHours())}:${두자(날.getMinutes())} KST`;
}

/**
 * 🔴 덮기 방지 — 2026-09-10 에 내 수집기가 «09-08부터 있던 남의 자료 파일»을 덮어
 * 여섯 유닛의 빌드를 다 세웠다. 그래서 내는 쪽에도 같은 관문을 건다.
 */
export function 덮어도되나(있던글, 낼것) {
  if (있던글 == null) return { 된다: true, 왜: '그 자리에 파일이 없다' };
  let 있던;
  try { 있던 = JSON.parse(있던글); } catch { return { 된다: false, 왜: '그 자리에 «내 것이 아닌» 글이 있다 — 열지도 못했다' }; }
  if (있던?.만든이 !== 낼것?.만든이) return { 된다: false, 왜: `만든이가 다르다 (${있던?.만든이 ?? '없음'}) — 남의 자료다` };
  if (있던?.무엇 !== 낼것?.무엇) return { 된다: false, 왜: `무엇을 담은 파일인지가 다르다 (${있던?.무엇 ?? '없음'})` };
  return { 된다: true, 왜: '만든이와 무엇이 같다 — 내 파일을 새로 낸다' };
}

/* ── 자가시험 ───────────────────────────────────────────────────── */

function 자가시험() {
  let 통과 = 0, 막힘 = 0;
  const 본다 = (무엇, 됐나, 덧 = '') => {
    if (됐나) { 통과 += 1; }
    else { 막힘 += 1; console.log(`  ✕ ${무엇}${덧 ? ' — ' + 덧 : ''}`); }
  };

  console.log('자가시험 — collect-kcw-newsdesk-names-abroad.mjs');

  // 1 이름표 자체
  본다('이름이 열여덟이다', 이름들.length === 18, String(이름들.length));
  본다('이름이 겹치지 않는다', new Set(이름들.map((x) => x.이름)).size === 이름들.length);
  본다('후보 문서도 겹치지 않는다', new Set(이름들.map((x) => x.후보)).size === 이름들.length);
  본다('갈래가 다섯 안에 있다',
    이름들.every((x) => ['k-pop', 'actor', 'musician', 'tv', 'sport'].includes(x.갈래)));
  본다('매체가 연예매체 둘 안에 있다', 이름들.every((x) => 연예매체.includes(x.매체)));
  본다('후보에 빈 것이 없다', 이름들.every((x) => x.후보 && x.후보.trim().length > 1));
  본다('못가른이름에는 왜가 반드시 있다', 못가른이름.every((x) => x.왜 && x.왜.length > 20));
  본다('못가른이름이 이름들에 섞이지 않았다',
    못가른이름.every((x) => !이름들.some((y) => y.이름 === x.이름)));

  // 2 제목수세기 — 우리 자료 쪽
  const 가짜 = { 매체별: { 스타뉴스: { 받은수: 78, 쓸만한수: 13 }, 텐아시아: { 받은수: 21, 쓸만한: [1, 2, 3] } } };
  const r1 = 제목수세기(가짜);
  본다('두 매체를 다 센다', r1.줄?.length === 2);
  본다('받은수를 그대로 읽는다', r1.줄?.[0].받은수 === 78);
  본다('쓸만한수가 없으면 배열 길이로 센다', r1.줄?.[1].쓸만한수 === 3, JSON.stringify(r1.줄?.[1]));
  본다('매체별 칸이 없으면 못셈으로 낸다', Boolean(제목수세기({}).못셈));
  본다('그 매체가 없으면 그 줄만 못셈이다', Boolean(제목수세기({ 매체별: { 스타뉴스: { 받은수: 1 } } }).줄[1].못셈));
  본다('⛔ 없는 매체를 ',
    제목수세기({ 매체별: {} }).줄.every((x) => x.받은수 === undefined && x.못셈));

  // 3 한국사람인가 — 오늘 실측한 Karina 사고의 자
  본다('한국 사람 분류가 있으면 맞다', 한국사람인가(['South Korean male actors', 'Living people']).맞나 === true);
  본다('Korean 로 시작하는 분류도 잡는다', 한국사람인가(['Korean male singers']).맞나 === true);
  본다('한국 분류가 없으면 아니다', 한국사람인가(['American film actors']).맞나 === false);
  본다('⛔ 분류가 안 오면 null 이다 — 아니다로 읽지 않는다', 한국사람인가(null).맞나 === null);
  본다('⛔ 분류가 비어 오면 null 이다', 한국사람인가([]).맞나 === null);
  본다('맞을 때 걸린 분류를 함께 낸다', 한국사람인가(['South Korean actresses']).걸린분류?.length === 1);
  본다('아닐 때 왜를 낸다', 한국사람인가(['Japanese idols']).왜?.includes('different person'));
  본다('⭐ 태국 사람이라도 K팝 분류면 통과한다 — 축이 국적이 아니다', 한국사람인가(['Thai K-pop singers','Got7 members']).맞나 === true);
  본다('KBO 분류도 통과한다', 한국사람인가(['KBO League pitchers']).맞나 === true);

  // 4 갈래별
  const 줄들 = [
    { 갈래: 'actor', 합: 100 }, { 갈래: 'actor', 합: 300 }, { 갈래: 'actor', 합: null },
    { 갈래: 'k-pop', 합: 1000 }, { 갈래: 'sport', 합: null },
  ];
  const g = 갈래별(줄들);
  본다('갈래가 셋이다', g.length === 3, String(g.length));
  본다('열람합이 큰 갈래가 먼저다', g[0].갈래 === 'k-pop');
  본다('사람 수는 못 쟀어도 센다', g.find((x) => x.갈래 === 'actor').사람 === 3);
  본다('문서있음은 수가 있는 것만 센다', g.find((x) => x.갈래 === 'actor').문서있음 === 2);
  본다('못쟀다를 따로 센다', g.find((x) => x.갈래 === 'actor').못쟀다 === 1);
  본다('열람합에 null 이 섞이지 않는다', g.find((x) => x.갈래 === 'actor').열람합 === 400);
  본다('갈래가 없으면 기타로 간다', 갈래별([{ 합: 5 }])[0].갈래 === '기타');

  // 5 중간값 — 평균만 내지 않는다
  본다('홀수 중간값', 중간값([1, 100, 5]) === 5);
  본다('짝수 중간값은 두 개의 평균', 중간값([1, 3, 5, 7]) === 4);
  본다('null 을 섞으면 빼고 센다', 중간값([10, null, 20, undefined]) === 15);
  본다('다 못 쟀으면 null 이다', 중간값([null, null]) === null);
  본다('빈 것도 null 이다', 중간값([]) === null);

  // 6 영문시각
  본다('영문시각 꼴', 영문시각(new Date(2026, 8, 10, 14, 5)) === '10 September 2026, 14:05 KST');
  본다('영문시각에 한국어가 없다', !/[가-힣]/.test(영문시각(new Date(2026, 0, 1, 9, 0))));

  // 7 🔴 덮기 방지 관문 — 오늘 사고 낸 자리
  const 낼것 = { 만든이: '5번', 무엇: 'kcw-newsdesk-names-abroad' };
  본다('자리가 비면 낸다', 덮어도되나(null, 낼것).된다 === true);
  본다('내 파일이면 낸다', 덮어도되나(JSON.stringify(낼것), 낼것).된다 === true);
  본다('🔴 만든이가 다르면 막는다', 덮어도되나(JSON.stringify({ 만든이: '4번', 무엇: 'kcw-newsdesk-names-abroad' }), 낼것).된다 === false);
  본다('🔴 무엇이 다르면 막는다', 덮어도되나(JSON.stringify({ 만든이: '5번', 무엇: 'kcw-member-vs-group' }), 낼것).된다 === false);
  본다('🔴 열지도 못하는 글이면 막는다', 덮어도되나('<html>남의 것</html>', 낼것).된다 === false);
  본다('막을 때 왜를 낸다', 덮어도되나(JSON.stringify({ 만든이: '3번' }), 낼것).왜?.length > 5);

  console.log(`\n통과 ${통과} · 막힘 ${막힘}`);
  return 막힘 === 0;
}

/* ── 실행 ───────────────────────────────────────────────────────── */

const 내가실행됐다 = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
const 앞 = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/${판}.wikipedia/all-access/user/`;
const 머리 = { 'User-Agent': 'KCultureWire/1.0 (data journalism; contact via kculturewire.com)' };

/** 여럿을 한 번에 — 넘김을 풀고 «분류»까지 같이 받는다 (사람마다 부르면 429) */
async function 무리한번에(후보들, 시도수 = 4) {
  const u = 'https://en.wikipedia.org/w/api.php?action=query' +
    '&titles=' + 후보들.map((t) => encodeURIComponent(t)).join('%7C') +
    '&redirects=1&prop=categories&cllimit=500&clshow=!hidden&format=json';
  for (let i = 1; i <= 시도수; i += 1) {
    const r = await fetch(u, { headers: 머리 });
    if (r.ok) {
      let j;
      try { j = JSON.parse(await r.text()); }
      catch { await new Promise((s) => setTimeout(s, 2000 * i)); continue; }
      const q = j.query ?? {};
      const 넘김표 = new Map((q.redirects ?? []).map((x) => [String(x.from), String(x.to)]));
      const 제목별 = new Map();
      for (const 페이지 of Object.values(q.pages ?? {})) {
        if ('missing' in 페이지) continue;
        제목별.set(String(페이지.title), {
          제목: String(페이지.title).replace(/ /g, '_'),
          분류: (페이지.categories ?? []).map((c) => String(c.title ?? '').replace(/^Category:/, '')),
        });
      }
      const 낸것 = new Map();
      for (const 후보 of 후보들) {
        const 풀린 = 넘김표.get(후보) ?? 후보;
        const 찾음 = 제목별.get(풀린);
        낸것.set(후보, 찾음
          ? { ...찾음, 넘김: 넘김표.has(후보) ? `${후보} → ${풀린}` : null }
          : { 제목: null, 왜: 'no article with that title on English Wikipedia' });
      }
      return 낸것;
    }
    await new Promise((s) => setTimeout(s, 2000 * i));
  }
  return null;   // ⛔ 못 물었으면 null. 「없다」로 넘기지 않는다
}

/** 🔴 429 는 다시 받는다. 못 받은 것을  */
async function 열람수(문서, 시도수 = 6) {
  for (let i = 1; i <= 시도수; i += 1) {
    const r = await fetch(`${앞}${encodeURIComponent(문서)}/monthly/${창.처음}/${창.끝}`, { headers: 머리 });
    if (r.ok) return { items: (await r.json())?.items ?? [] };
    if (r.status === 404) return { 못받음: 'the pageviews service has no rows for this article' };
    if (r.status !== 429) return { 못받음: `HTTP ${r.status}` };
    await new Promise((s) => setTimeout(s, 2500 * i));
  }
  return { 못받음: 'HTTP 429 (six retries with backoff)' };
}

async function 돌린다() {
  const 날짜인수 = process.argv.indexOf('--날짜');
  const 오늘 = new Date();
  const 두자 = (n) => String(n).padStart(2, '0');
  const 날짜 = 날짜인수 > -1
    ? process.argv[날짜인수 + 1]
    : `${오늘.getFullYear()}${두자(오늘.getMonth() + 1)}${두자(오늘.getDate())}`;
  const 아카이브길 = path.join(아카이브방, `${날짜}.json`);
  if (!fs.existsSync(아카이브길)) { console.error(`✕ 그날 아카이브가 없다: ${아카이브길}`); process.exit(1); }
  const 아카이브 = JSON.parse(fs.readFileSync(아카이브길, 'utf8'));
  const 제목수 = 제목수세기(아카이브);
  console.log(`아카이브 ${날짜} — ` + (제목수.줄 ?? []).map((x) => `${x.매체} 받은 ${x.받은수 ?? '?'}·쓸만한 ${x.쓸만한수 ?? '?'}`).join(' · '));

  const 푼것 = await 무리한번에(이름들.map((x) => x.후보));
  if (!푼것) { console.error('✕ 위키백과에 못 물었다. ⛔ 「문서가 없다」로 내지 않고 멈춘다'); process.exit(1); }

  const 줄들 = [];
  for (const 사람 of 이름들) {
    const p = 푼것.get(사람.후보);
    const 바탕 = { ...사람, 문서: p?.제목 ?? null, 넘김: p?.넘김 ?? null };
    if (!p?.제목) { 줄들.push({ ...바탕, 합: null, 못쟀다: p?.왜 ?? 'could not resolve the title' }); continue; }
    const 한국 = 한국사람인가(p.분류);
    바탕.한국사람확인 = 한국.맞나;
    바탕.걸린분류 = 한국.걸린분류 ?? null;
    if (한국.맞나 !== true) { 줄들.push({ ...바탕, 합: null, 못쟀다: 한국.왜 ?? 'could not verify the person' }); continue; }
    const v = await 열람수(p.제목);
    if (v.못받음) { 줄들.push({ ...바탕, 합: null, 못쟀다: v.못받음 }); continue; }
    const 달들 = v.items.map((x) => ({ 달: String(x.timestamp).slice(0, 6), 수: Number(x.views) }));
    줄들.push({ ...바탕, 합: 달들.reduce((a, b) => a + b.수, 0), 달수: 달들.length, 마지막달: 달들.at(-1)?.수 ?? null });
    await new Promise((s) => setTimeout(s, 500));
  }

  const 잰것 = 줄들.filter((r) => typeof r.합 === 'number');
  const 낼것 = {
    만든이: '5번',
    무엇: 'kcw-newsdesk-names-abroad',
    잰때: 영문시각(),
    아카이브날짜: 날짜,
    창: 창말,
    제목수, 줄들,
    못가른이름,
    갈래별: 갈래별(줄들),
    요약: {
      이름수: 줄들.length,
      문서있음: 잰것.length,
      못쟀다: 줄들.length - 잰것.length,
      열람합: 잰것.reduce((a, b) => a + b.합, 0),
      중간값: 중간값(잰것.map((r) => r.합)),
      제일큼: 잰것.slice().sort((a, b) => b.합 - a.합)[0] ?? null,
      제일작음: 잰것.slice().sort((a, b) => a.합 - b.합)[0] ?? null,
    },
  };

  console.log(`\n이름 ${낼것.요약.이름수} · 영어판에 있음 ${낼것.요약.문서있음} · 못 쟀다 ${낼것.요약.못쟀다}`);
  for (const r of 줄들.slice().sort((a, b) => (b.합 ?? -1) - (a.합 ?? -1))) {
    const 수 = typeof r.합 === 'number' ? r.합.toLocaleString() : '—';
    console.log(`  ${수}\t${r.갈래}\t${r.이름}\t${r.문서 ?? ''}\t${r.못쟀다 ?? ''}${r.넘김 ? ' (넘김 ' + r.넘김 + ')' : ''}`);
  }
  console.log(`\n중간값 ${낼것.요약.중간값?.toLocaleString()} · 갈래별:`);
  for (const g of 낼것.갈래별) console.log(`  ${g.갈래}\t사람 ${g.사람}\t문서 ${g.문서있음}\t열람합 ${g.열람합.toLocaleString()}`);

  if (!process.argv.includes('--적는다')) { console.log('\n(--적는다 를 주면 파일로 낸다)'); return; }
  const 있던 = fs.existsSync(낼곳) ? fs.readFileSync(낼곳, 'utf8') : null;
  const 관문 = 덮어도되나(있던, 낼것);
  if (!관문.된다) { console.error(`🔴 막았다 — ${관문.왜}`); process.exit(1); }
  fs.writeFileSync(낼곳, JSON.stringify(낼것, null, 2) + '\n', 'utf8');
  console.log(`✅ 적었다 ${낼곳} (${관문.왜})`);
}

if (내가실행됐다) {
  if (process.argv.includes('--자가시험')) process.exit(자가시험() ? 0 : 1);
  await 돌린다();
}
