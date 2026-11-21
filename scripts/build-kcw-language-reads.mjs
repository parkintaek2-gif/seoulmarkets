/**
 * build-kcw-language-reads.mjs — **어느 «언어판»에서 읽히나.** (`/read-in`)
 *
 * ── 🔴 왜 이 지면인가 (2026-09-09 11:2x · 5번) ──────────────────────────────
 * 사장님: 「**케이컬쳐스 판의 니케이**」 · 「빌보드 같은 서비스를 해보고 싶다」 ·
 *         「B2B 가 주된 사업으로 할 수 있는 무엇이 케이컬쳐스에도 있을 것 같다」
 *
 * B2B 손님이 실제로 묻는 것은 하나다 — **「우리 나라에서 누가 통하나」.**
 * 그 답을 우리는 못 갖고 있었다. 오늘 받았다(`collect-kcw-language-reads.mjs`).
 *
 * ── 🔴 재서 알아낸 것 — 통설과 다르다 ──────────────────────────────────────
 * ```
 * 478명 × 15판 · 창 2026-06-01 ~ 08-31 · 막힌 응답 0
 * en 을 뺀 «1위 언어판» —
 *   zh 306명 (64.0%) · ja 142명 (29.7%) · es 15 · fr 5 · de 5 · ru 4 · th 1
 * ⇒ **일본어가 1위가 아니다. 중국어다.** 셋 중 둘이 그렇다
 * ```
 *
 * ── ⛔ 이 지면이 반드시 지키는 것 ──────────────────────────────────────────
 * ```
 * ⛔ 「중국이 본다」로 쓰지 않는다 — zh.wikipedia 는 **중국 본토에서 막혀 있다.**
 *    대만·홍콩·싱가포르·말레이시아·화교 독자다. 이 한 줄을 빼면 지면이 거짓이 된다
 * ⛔ 「언어판 = 나라」가 아니다. es 는 스페인과 중남미가 함께 읽는다
 * ⛔ 「인기」라 쓰지 않는다. 열람은 좋은 일로도 나쁜 일로도 는다
 * ⛔ en 을 1위 다툼에서 뺀다 — 우리 지면의 언어라 늘 1위여서 아무 말도 못 하게 된다.
 *    빼는 것을 지면에 «적는다». 숨기고 빼면 그것이 속임이다
 * ⛔ 왜 그런지 말하지 않는다 — 화교 인구인지 위키백과 편집 습관인지 우리 자료로 못 가른다
 * ⛔ 문서가 «없는» 판과 «0회 읽힌» 판을 섞지 않는다
 * ⚠ 전수가 아니다 — sitelinks 20판 이상인 478명만이다. 문턱을 지면에 적는다
 * ```
 *
 * 쓰는 법
 *   node scripts/build-kcw-language-reads.mjs
 *   node scripts/build-kcw-language-reads.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { 잰수인가 } from './lib/live-code.mjs';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 방 = path.join(뿌리, 'archive/raw/star-pageviews');
const 낼길 = path.join(뿌리, 'src/data/kcw-language-reads.json');

/** 판 코드 → 영문 이름. ⛔ 여기 없는 코드는 코드를 그대로 쓴다 — 지어내지 않는다 */
export const 판이름 = {
  en: 'English', ja: 'Japanese', zh: 'Chinese', es: 'Spanish', pt: 'Portuguese',
  id: 'Indonesian', th: 'Thai', vi: 'Vietnamese', ms: 'Malay', tl: 'Tagalog',
  ar: 'Arabic', hi: 'Hindi', fr: 'French', de: 'German', ru: 'Russian',
};
export const 이름내기 = (p) => 판이름[p] ?? String(p ?? '');

/** 가장 최근 수집 파일. ⛔ 없으면 «없다»고 한다 */
export function 최근파일(파일들) {
  const 것 = (파일들 ?? []).filter((f) => /^language-reads-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
  return 것.length ? 것[것.length - 1] : null;
}

/**
 *  을 **손님이 읽을 수 있는 꼴**로 바꾼다.
 * ⛔ 사장님 지시 — 「그릇이 내용물을 결정한다」. 기계가 쓰는 꼴을 지면에 그대로 내지 않는다.
 *   2026-09-09 에 지면을 띄워 보고 「over 20260601 ~ 20260831」로 나가는 것을 발견해 고쳤다.
 * ⛔ 못 읽으면 원문을 그대로 돌려준다 — 지어내지 않는다.
 */
export function 읽는창(창) {
  const 달 = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const m = String(창 ?? '').match(/^(\d{4})(\d{2})\d{2}\s*~\s*(\d{4})(\d{2})\d{2}$/);
  if (!m) return String(창 ?? '');
  const [, y1, m1, y2, m2] = m;
  const 앞 = 달[Number(m1) - 1]; const 뒤 = 달[Number(m2) - 1];
  if (!앞 || !뒤) return String(창);
  if (y1 === y2 && m1 === m2) return `${앞} ${y1}`;
  if (y1 === y2) return `${앞} to ${뒤} ${y1}`;
  return `${앞} ${y1} to ${뒤} ${y2}`;
}

/** 판별로 「1위인 사람 수」를 센다 */
export function 으뜸셈(사람들) {
  const 셈 = {};
  for (const p of 사람들 ?? []) {
    const k = p?.으뜸?.판;
    if (k) 셈[k] = (셈[k] ?? 0) + 1;
  }
  return 셈;
}

/**
 * 「한 판이 다른 판의 몇 배인가」 — ⛔ 둘 다 잰 값일 때만 낸다.
 * 나눗셈에서 0 을 분모로 쓰지 않는다.
 */
export function 배수(위, 아래) {
  /* 🔴 Number(null) === 0 이다. 2026-09-09 하루에 이 함정에 «세 번» 걸렸다 —
     해나이·격차·여기. 매번 다시 쓰다가 매번 걸린 것이다.
     ⇒ 그래서 «다시 쓰지 않고» 공용 자를 쓴다: lib/live-code.mjs 의 잰수인가.
     그 자는 typeof 가 number 인지부터 본다. null·''·'5' 는 다 걸러진다. */
  if (!잰수인가(위) || !잰수인가(아래) || 아래 <= 0) return null;
  return Math.round((위 / 아래) * 10) / 10;
}

/**
 * 손님 화면에 나갈 출처 한 줄 — **영어로만** 쓴다.
 *
 * 🔴 왜 함수로 두나 — 아카이브의 `우물` 필드를 그대로 흘려 보내다 한국어가 지면에 나갔다.
 *   문장을 여기 한 곳에 두면 아래 자가시험이 «한글이 섞였나»를 잴 수 있다.
 * ⛔ 여기에 한글을 넣지 않는다. 자가시험이 막는다.
 */
export function 지면에낼우물() {
  return 'Wikimedia REST — pageviews/per-article, all-access, user traffic only (bots excluded). '
    + 'Each edition\'s article title resolved from Wikidata sitelinks.';
}

/** 한글이 섞였나 — 손님 화면에 나가는 글을 재는 자 */
export function 한글있나(글) {
  return /[ㄱ-ㆎ가-힣]/.test(String(글 ?? ''));
}

/**
 * 한 사람의 «줄» — 1위 판·2위 판·영어. 478명 전부를 이 꼴로 낸다.
 *
 * ⭐ [2026-09-09] 왜 전부 내나 — 앞서는 판마다 위 열두 명만 냈다. 그래서 어떤 사람의 줄을
 *   지면에서 보이려면 «그 사람을 고르는» 코드를 새로 넣어야 했다. 고르면 그 고름이 결과가 된다.
 *   ⛔ 「BTS 일곱만 담자」 같은 생각이 그것이다. 담을 이유가 이번 기사이므로, 다음 기사에서는
 *     다른 일곱을 담게 되고, 지면은 기사를 따라 흔들린다.
 *   ⇒ 478명을 다 낸다. 고를 일이 없어진다.
 * ⛔ en 은 «1위 다툼»에서 빼지만 줄에는 싣는다 — 숨기고 빼면 속임이다.
 * ⛔ 수가 아닌 칸은 null 로 둔다. 0 으로 채우면 「아무도 안 열었다」가 되어 버린다.
 */
/**
 * 지면에 낼 «이름» — 영문으로만.
 *
 * 🔴 [2026-09-09] 478명 표를 낸 뒤에 영어 지면 검사가 잡았다 — 카리나·윈터·카이 세 사람의
 *   Wikidata 이름표가 한국어였다. 그대로 실으면 영어권 손님 화면에 한국어가 뜬다.
 * ⇒ `src/data/kcw-english-names.json` 의 영문 이름표(labels.en)나 영문 위키 문서 제목을 쓴다.
 * ⛔ 내가 로마자로 «옮겨 적지» 않는다 — 이름 표기는 지어낼 것이 아니다.
 * ⛔ 영문 이름이 없으면 그 사람을 «조용히 빼지» 않는다. 못 쟀다고 표시해 그대로 싣는다 —
 *   빼면 478명이 아닌 표가 되고, 그 사실이 아무 데도 안 남는다.
 */
export function 낼이름(사람, 이름지도 = {}) {
  const 원 = String(사람?.name ?? '');
  const 한글 = /[ㄱ-ㆎ가-힣]/.test(원);
  if (!한글) return { name: 원, nameIsEnglish: true };
  const 것 = 이름지도[사람?.q];
  const 영 = 것?.label || 것?.enwiki || null;
  if (영 && !/[ㄱ-ㆎ가-힣]/.test(영)) return { name: 영, nameIsEnglish: true };
  /* ⬜ 못 쟀다 — 이름을 지어내지 않고, 있는 것을 숨기지도 않는다 */
  return { name: 사람?.q ?? '—', nameIsEnglish: false };
}

export function 사람줄(사람, { 뺄판 = 'en', 이름지도 = {} } = {}) {
  if (!사람 || !사람.수들) return null;
  const 수들 = 사람.수들;
  const 정 = Object.entries(수들)
    .filter(([판, v]) => 판 !== 뺄판 && Number.isFinite(v))
    .sort((a, b) => b[1] - a[1]);
  const 첫 = 정[0]; const 둘 = 정[1];
  return {
    ...낼이름(사람, 이름지도),
    topCode: 첫 ? 첫[0] : null,
    top: 첫 ? 이름내기(첫[0]) : null,
    topReads: 첫 ? 첫[1] : null,
    secondCode: 둘 ? 둘[0] : null,
    second: 둘 ? 이름내기(둘[0]) : null,
    secondReads: 둘 ? 둘[1] : null,
    english: Number.isFinite(수들[뺄판]) ? 수들[뺄판] : null,
    /* 1위가 2위를 얼마나 앞서나 — 「이겼다」만 내고 «차»를 감추지 않는다 */
    margin: (첫 && 둘) ? 첫[1] - 둘[1] : null,
    editions: 정.length,
  };
}

function 짓기() {
  const f = 최근파일(fs.readdirSync(방));
  if (!f) throw new Error('language-reads 파일이 없다 — collect-kcw-language-reads.mjs 를 먼저 돌린다');
  const o = JSON.parse(fs.readFileSync(path.join(방, f), 'utf8'));
  const 사 = (o.사람 ?? []).filter((x) => x.수들);
  /* 영문 이름표 — 없으면 빈 지도로 두고, 한국어 이름은 낼이름() 이 「못 쟀다」로 표시한다 */
  const 이름길 = path.join(뿌리, 'src/data/kcw-english-names.json');
  const 이름지도 = fs.existsSync(이름길)
    ? (JSON.parse(fs.readFileSync(이름길, 'utf8')).지도 ?? {}) : {};

  const 셈 = 으뜸셈(사);
  const 판순 = Object.entries(셈).sort((a, b) => b[1] - a[1])
    .map(([판, 수]) => ({ code: 판, name: 이름내기(판), leads: 수, share: Math.round((수 / 사.length) * 1000) / 10 }));

  /* 판마다 「그 판이 1위인 사람」을 그 판 열람수 순으로 — 이야기가 여기 있다 */
  const 판별사람 = {};
  for (const { code } of 판순) {
    판별사람[code] = 사.filter((x) => x.으뜸?.판 === code)
      .sort((a, b) => (b.으뜸.수 ?? 0) - (a.으뜸.수 ?? 0))
      .slice(0, 12)
      .map((x) => ({
        name: x.name, top: x.으뜸.수, second: x.으뜸.다음판 ? 이름내기(x.으뜸.다음판) : null,
        secondReads: x.으뜸.다음수 ?? null, english: x.수들.en ?? null,
      }));
  }

  /* 중국어가 일본어를 크게 앞서는 사람 — 「중국어가 1위」를 수로 보이는 자리 */
  const 중일 = 사.filter((x) => Number.isFinite(x.수들.zh) && Number.isFinite(x.수들.ja) && x.수들.ja > 0)
    .map((x) => ({ name: x.name, zh: x.수들.zh, ja: x.수들.ja, times: 배수(x.수들.zh, x.수들.ja), english: x.수들.en ?? null }))
    .filter((x) => x.times != null);
  const 셋배넘 = 중일.filter((x) => x.times >= 3).sort((a, b) => b.zh - a.zh);

  const 답 = {
    builtOn: o.잰때 ? String(o.잰때).slice(0, 10) : null,
    window: 읽는창(o.창),
    windowRaw: o.창,
    /* 🔴 [2026-09-09 고침] 여기에 `o.우물` 을 그대로 넣었더니 «지면에 한국어가 나갔다».
     *   /read-in 이 라이브에서 「(봇 제외) · 판별 제목은 …」을 띄우고 있었다.
     *   ⛔ 아카이브 안쪽 글(한국어)과 «손님 화면에 나가는 글»(영어)은 다른 것이다.
     *     안쪽 필드를 지면으로 흘려 보내면, 우리끼리 쓰던 말이 영어권 손님 화면에 뜬다.
     *   ⭐ 그래서 아카이브의 `우물` 은 한국어로 그대로 두고, 여기서 영어 문장을 «따로» 쓴다. */
    source: 지면에낼우물(),
    threshold: o.문턱,
    people: 사.length,
    editions: (o.판들 ?? []).length,
    cellsWithNoArticle: o.문서없는칸 ?? null,
    blockedResponses: o.막힌응답 ?? null,
    whatThisIs: `For ${사.length} Korean entertainers with articles in at least ${o.문턱} Wikipedia editions, how many people opened each article in each of ${(o.판들 ?? []).length} language editions.`,
    whatThisIsNot: [
      'Not popularity. A page climbs for good news and bad; we report the count and never the reason.',
      'Not a country count. Chinese Wikipedia is blocked in mainland China, and Spanish is read across Spain and Latin America. These are language editions, not nations.',
      'Not an explanation. Nothing here says whether a language leads because of population, diaspora, or editing habits.',
      'Not the full roster. Only people with articles in many editions are measured, and the threshold is printed.',
    ],
    leadTable: 판순,
    leadersByEdition: 판별사람,
    zhOverJa: { count: 셋배넘.length, rule: 'Chinese reads at least 3x Japanese reads', top: 셋배넘.slice(0, 12) },
    /* ⭐ 478명 «전부». 위 leadersByEdition 은 판마다 열두 명만 담아서, 어떤 사람의 줄을
       지면에서 보이려면 그 사람을 고르는 코드가 필요했다. 전부 담아 고를 일을 없앤다. */
    allRows: 사.map((x) => 사람줄(x, { 이름지도 })).filter(Boolean)
      .sort((a, b) => (b.english ?? 0) - (a.english ?? 0)),
  };

  fs.mkdirSync(path.dirname(낼길), { recursive: true });
  fs.writeFileSync(낼길, JSON.stringify(답, null, 1), 'utf8');
  console.log(`✅ ${낼길}`);
  console.log(`   사람 ${사.length} · 판 ${답.editions} · 창 ${답.window}`);
  console.log(`   1위 판: ${판순.slice(0, 5).map((x) => `${x.name} ${x.leads}`).join(' · ')}`);
  console.log(`   중국어가 일본어의 3배 넘는 사람 ${셋배넘.length}명`);
}

const 나 = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (나 && process.argv.includes('--자가시험')) {
  let 통 = 0; const 실 = [];
  const 검 = (n, ok) => { if (ok) 통 += 1; else 실.push(n); };

  검('이름내기 — 아는 코드는 영문 이름으로', 이름내기('zh') === 'Chinese');
  검('⛔ 이름내기 — 모르는 코드는 코드를 그대로 (지어내지 않는다)', 이름내기('xx') === 'xx');
  검('⛔ 이름내기 — null 도 견딘다', 이름내기(null) === '');
  검('판이름에 열다섯이 다 있다', Object.keys(판이름).length === 15);

  /* 🔴 [2026-09-09] 지면에 한국어가 나갔다 — 그 결함을 검사로 굳힌다.
   *   ⛔ 「조심하자」로 남기지 않는다. 자가시험이 울려야 다음에도 막힌다. */
  검('한글있나 — 한글을 잡는다', 한글있나('user (봇 제외)') === true);
  검('한글있나 — 영어만이면 안 잡는다', 한글있나('bots excluded') === false);
  검('한글있나 — null 도 견딘다', 한글있나(null) === false);
  검('🔴 지면에 낼 출처에 한글이 없다', 한글있나(지면에낼우물()) === false);
  /* ⭐ 사람줄 — 478명을 다 내는 꼴. 고르지 않으려고 만든 자다 */
  const 줄 = 사람줄({ name: 'X', 수들: { en: 900, es: 500, ja: 400, zh: 100 } });
  검('사람줄 — 1위와 2위를 낸다', 줄.topCode === 'es' && 줄.secondCode === 'ja');
  검('사람줄 — 1위 다툼에서 en 을 뺀다', 줄.topCode !== 'en');
  검('사람줄 — 그래도 en 을 줄에 싣는다 (숨기지 않는다)', 줄.english === 900);
  검('사람줄 — 1위와 2위의 «차»를 낸다', 줄.margin === 100);
  검('사람줄 — 판 이름을 영문으로 낸다', 줄.top === 'Spanish' && 줄.second === 'Japanese');
  검('⛔ 사람줄 — 수 아닌 칸을 ', (() => {
    const r = 사람줄({ name: 'Y', 수들: { en: null, ja: 5 } });
    return r.english === null && r.topCode === 'ja';
  })());
  검('⛔ 사람줄 — 판이 하나면 2위는 null (지어내지 않는다)', (() => {
    const r = 사람줄({ name: 'Z', 수들: { ja: 5 } });
    return r.secondCode === null && r.margin === null;
  })());
  검('⛔ 사람줄 — 빈 것도 견딘다', 사람줄(null) === null && 사람줄({ name: 'A' }) === null);

  /* 🔴 [2026-09-09] 지면에 한국어 이름이 나갔다 — 그 결함을 검사로 굳힌다 */
  검('낼이름 — 영문 이름은 그대로', 낼이름({ name: 'Jimin' }).name === 'Jimin');
  검('🔴 낼이름 — 한국어 이름을 영문 이름표로 바꾼다',
    낼이름({ q: 'Q1', name: '카이' }, { Q1: { label: 'Kai', enwiki: 'Kai (singer)' } }).name === 'Kai');
  검('낼이름 — 이름표가 없으면 영문 문서 제목을 쓴다',
    낼이름({ q: 'Q1', name: '윈터' }, { Q1: { label: null, enwiki: 'Winter (singer)' } }).name === 'Winter (singer)');
  검('⛔ 낼이름 — 영문 이름이 없으면 «못 쟀다»로 표시하고 빼지 않는다', (() => {
    const r = 낼이름({ q: 'Q9', name: '카리나' }, {});
    return r.name === 'Q9' && r.nameIsEnglish === false;
  })());
  검('⛔ 낼이름 — 영문이라던 이름표에 한글이 섞였으면 안 믿는다',
    낼이름({ q: 'Q1', name: '카이' }, { Q1: { label: '카이 Kai' } }).nameIsEnglish === false);
  검('낼이름 — 영문이면 참으로 표시한다', 낼이름({ name: 'V' }).nameIsEnglish === true);
  검('🔴 사람줄이 낸 이름에 한글이 없다', (() => {
    const r = 사람줄({ q: 'Q1', name: '카이', 수들: { en: 9, zh: 5 } }, { 이름지도: { Q1: { label: 'Kai' } } });
    return r.name === 'Kai' && !한글있나(r.name);
  })());

  검('지면에 낼 출처가 무엇을 셌는지 밝힌다',
    /pageviews/.test(지면에낼우물()) && /bots excluded/.test(지면에낼우물()) && /sitelinks/.test(지면에낼우물()));

  검('최근파일 — 가장 늦은 날짜를 고른다',
    최근파일(['language-reads-2026-09-01.json', 'language-reads-2026-09-09.json', 'kpop-20260806.json']) === 'language-reads-2026-09-09.json');
  검('⛔ 최근파일 — 없으면 null', 최근파일(['kpop-20260806.json']) === null);
  검('⛔ 최근파일 — 빈 목록도 견딘다', 최근파일([]) === null);
  검('⛔ 최근파일 — null 도 견딘다', 최근파일(null) === null);

  const s = 으뜸셈([{ 으뜸: { 판: 'zh' } }, { 으뜸: { 판: 'zh' } }, { 으뜸: { 판: 'ja' } }, { 으뜸: { 판: null } }, {}]);
  검('으뜸셈 — 판마다 센다', s.zh === 2 && s.ja === 1);
  검('⛔ 으뜸셈 — 판이 없는 사람은 안 센다', Object.keys(s).length === 2);
  검('⛔ 으뜸셈 — null 도 견딘다', Object.keys(으뜸셈(null)).length === 0);

  검('배수 — 3.4배', 배수(340, 100) === 3.4);
  검('⛔ 배수 — 분모가 0 이면 null', 배수(10, 0) === null);
  검('⛔ 배수 — 못 재면 null', 배수(null, 100) === null);
  검('⛔ 배수 — 분모가 음수면 null', 배수(10, -5) === null);

  검('읽는창 — 같은 해 두 달은 「June to August 2026」', 읽는창('20260601 ~ 20260831') === 'June to August 2026');
  검('읽는창 — 한 달이면 달 하나만', 읽는창('20260601 ~ 20260630') === 'June 2026');
  검('읽는창 — 해가 넘어가면 해를 둘 다', 읽는창('20251201 ~ 20260131') === 'December 2025 to January 2026');
  검('⛔ 읽는창 — 못 읽으면 원문 그대로 (지어내지 않는다)', 읽는창('알수없음') === '알수없음');
  검('⛔ 읽는창 — null 도 견딘다', 읽는창(null) === '');
  검('🔴 「중국 본토에서 막혀 있다」가 코드에 살아 있다',
    fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').includes('중국 본토에서 막혀 있다'));
  검('🔴 「en 을 빼는 것을 지면에 적는다」가 코드에 살아 있다',
    fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').includes('빼는 것을 지면에 «적는다»'));

  if (실.length) {
    console.error(`❌ 자가시험 실패 ${실.length}\n${실.map((x) => `   · ${x}`).join('\n')}`);
    process.exit(1);
  }
  console.log(`✅ 언어판 지면 자료 짓는 자 — 자가시험 ${통}개 통과`);
  process.exit(0);
}

if (나) 짓기();
