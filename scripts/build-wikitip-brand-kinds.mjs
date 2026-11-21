/**
 * 88편 — **브랜드는 한 덩어리가 아니다.** 같은 나라가 갈래마다 순서를 바꾼다.
 *
 * ── 왜 ─────────────────────────────────────────────────────────
 * 사장님 지시: 「패션 브랜드, 명품 엠베서더 등도 먹히는 콘텐트인지 분석하고」
 *              「자동차까지 스타들의 일거수일투족이 모두 팬들은 궁금해할 테니까」
 *
 * 82편이 이미 답한 것 — 「BMW 66.76, 제일 읽히는 한국 가수보다 5.7배 적다」.
 * ⛔ 그것을 되풀이하지 않는다. 여기서 묻는 것은 **다른 물음**이다:
 *    브랜드를 한 덩어리로 놓으면 안 보이는 것이 있나.
 *
 * ── 답 ─────────────────────────────────────────────────────────
 * 있다. **인도네시아는 차에서 제일 앞, 명품에서 제일 뒤다. 말레이시아는 그 반대다.**
 * 「어느 나라가 관심이 많나」가 아니라 **「무엇에 관심 있나가 나라마다 다르다」**.
 *
 * ── ⛔ 이 지면이 지키는 것 ────────────────────────────────────
 * ⛔ **줄세우지 않는다.** 갈래를 나란히 놓고 **왜 다른지**를 같이 적는다.
 * ⛔ **읽힘은 팔림이 아니다.** 한국 차가 독일 차보다 적게 읽힌다고 적게 팔린다고 하지 않는다 —
 *    판매 자료를 우리는 갖고 있지 않다. 화면에 못 박는다.
 * ⛔ **엠베서더 관계는 못 잰다.** 위키데이터에 그 관계가 없다. 있다고 흉내내지 않는다.
 * ⛔ 못 잰 것을 0 으로 세지 않는다 — 네 판에 글이 다 있는 브랜드만 갈래 합에 넣는다.
 * ⚠ 갈래가 둘뿐인 것(패션)은 **갈래라 부르기엔 얇다.** 화면에 적는다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { 오늘 } from './_kst.mjs';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const 판들 = ['id', 'vi', 'th', 'ms'];
export const 판이름 = { id: 'Indonesia', vi: 'Vietnam', th: 'Thailand', ms: 'Malaysia' };
/** 갈래 이름은 손님 말로 적는다. 자료의 영문 키를 그대로 내보내지 않는다 */
export const 갈래이름 = {
  luxury: 'Luxury houses',
  car: 'German car makers',
  'car-korean': 'Korean car makers',
  jewellery: 'Jewellers and watchmakers',
  fashion: 'Everyday fashion labels',
  /* 🔴 [2026-09-10] 오늘 돌고 있는 이슈가 이 두 갈래인데 축에 없었다 —
   *   BLACKPINK ROSÉ 가 Apple iPhone 18 앰버서더가 되고 G-DRAGON 이 McDonald's 것이 됐다.
   *   축에 없는 갈래로 이슈가 돌면 우리는 그 이슈에 아무 말도 못 한다. */
  tech: 'Technology makers',
  fastfood: 'Fast food and coffee chains',
};
/** ⚠ 이보다 적으면 갈래라 부르지 않고 화면에 「얇다」고 적는다 */
export const 얇음문턱 = 3;

/** 갈래 하나를 판별로 더한다. ⛔ 네 판에 글이 다 있는 것만 — 못 잰 것이 0으로 섞이면 안 된다 */
export function 갈래합(줄들) {
  const 온전 = 줄들.filter((r) => r.seaEditionsWithArticle === 판들.length);
  const 판별 = {};
  for (const p of 판들) 판별[p] = +온전.reduce((a, r) => a + (r.perMillion[p] ?? 0), 0).toFixed(2);
  const 합 = +판들.reduce((a, p) => a + 판별[p], 0).toFixed(2);
  return { 판별, 합, 온전수: 온전.length, 뺀것: 줄들.length - 온전.length };
}

/** 1st · 2nd · 3rd · 4th. ⛔ 「1th」 가 나가면 그 한 글자에 지면 전체가 미덥지 않아진다 */
export function 차례말(n) {
  const 꼬리 = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th');
  return `${n}${꼬리}`;
}

/** 한 갈래 안에서 판을 **큰 순서**로 놓는다 — 줄세우기가 아니라 「어느 나라가 이 갈래를 읽나」다 */
export function 판차례(판별) {
  return [...판들].sort((a, b) => 판별[b] - 판별[a]);
}

/**
 * ⭐ 이 기사의 뼈대 — **같은 나라가 갈래마다 자리를 바꾸는가.**
 * 바꾸지 않으면 기사가 없다. 그러면 그렇게 적고 낸다.
 */
export function 자리바꿈(갈래들) {
  const 자리 = {};
  for (const g of 갈래들) {
    if (g.얇은가) continue;                       // 얇은 갈래는 자리 다툼에 안 넣는다
    판차례(g.판별).forEach((p, i) => { (자리[p] = 자리[p] ?? []).push(i + 1); });
  }
  const 폭 = {};
  for (const p of 판들) 폭[p] = 자리[p] ? Math.max(...자리[p]) - Math.min(...자리[p]) : 0;
  const 제일 = 판들.reduce((a, p) => (폭[p] > 폭[a] ? p : a), 판들[0]);
  return { 자리, 폭, 제일, 바뀌나: 폭[제일] > 0 };
}

const 원 = JSON.parse(fs.readFileSync(path.join(뿌리, 'archive/raw/wikipedia/sea-brands.json'), 'utf8'));
/* ⚠ 이 자료는 브랜드 줄을 `people` 키에 담고 있다. 키 이름이 어긋났지만 자료는 맞다.
     ⛔ 이름이 예쁘라고 원본을 고치지 않는다 — 받은 그대로 읽고 여기서 이름을 바로잡는다 */
const 줄들 = 원.people;

const 갈래별 = {};
for (const r of 줄들) (갈래별[r.kind] = 갈래별[r.kind] ?? []).push(r);

const 갈래들 = Object.entries(갈래별).map(([k, 줄]) => {
  const { 판별, 합, 온전수, 뺀것 } = 갈래합(줄);
  return {
    key: k,
    label: 갈래이름[k] ?? k,
    브랜드수: 줄.length,
    온전수,
    뺀것,
    얇은가: 온전수 < 얇음문턱,
    판별,
    합,
    차례: 판차례(판별),
    이름들: 줄.map((r) => r.name).sort(),
    /*
     * 🔴 [2026-09-10] 갈래 «안»에서 제일 큰 한 곳의 몫을 같이 담는다.
     *   까닭: 기술 갈래 1,382.54 가운데 Google 하나가 1,038.59 — 75.1% 였다.
     *   그런데 Google 은 앰버서더를 쓰는 브랜드가 아니다. 그 한 곳을 빼면 배수가
     *   5.2배에서 1.30배로 내려앉는다.
     * ⛔ 갈래 «합»만 내면 「기술이 명품을 압도한다」로 읽힌다 — 자료가 그것을 받쳐 주지 않는다.
     * ⇒ 배수를 낼 자리에서는 늘 이 칸을 함께 본다. 한 곳이 갈래를 만들고 있으면 그렇게 적는다.
     */
    으뜸: (() => {
      const 온전 = 줄.filter((r) => r.seaEditionsWithArticle === 판들.length
        && Number.isFinite(r.seaPerMillionTotal))
        .sort((a, b) => b.seaPerMillionTotal - a.seaPerMillionTotal);
      if (!온전.length || !(합 > 0)) return null;      /* ⛔ 못 재면 null.  */
      const 첫 = 온전[0];
      return {
        name: 첫.name,
        value: +첫.seaPerMillionTotal.toFixed(2),
        share: +((첫.seaPerMillionTotal / 합) * 100).toFixed(1),
      };
    })(),
  };
}).sort((a, b) => b.합 - a.합);

const 바뀜 = 자리바꿈(갈래들);

/* 한국 차와 독일 차를 나란히 — 사장님 「자동차까지」 지시에 대한 곧은 답 */
const 독 = 갈래들.find((g) => g.key === 'car');
const 한 = 갈래들.find((g) => g.key === 'car-korean');
/**
 * 🔴 2026-08-14 — 여기서 **크게 틀릴 뻔했다.** 처음에 「독일 차가 한국 차보다 7.1배」라고 냈다.
 *   그런데 한국 차 셋 중 네 판에 글이 다 있는 것은 **기아 하나뿐**이다.
 *   현대는 태국판에 글이 없고, 제네시스는 인도네시아판에만 있다.
 *   ⛔ 그러면 그 7.1배는 「기아 하나 대 독일 셋」이다. 갈래끼리의 견줌이 아니다.
 *
 *   ⭐ 85편에서 이스포츠로 배운 것과 **똑같은 모양**이다 — 낮은 수가 관심의 크기가 아니라
 *     **백과사전의 빈칸**이었다. 그때 그것을 기사로 냈다. 여기서도 그렇게 한다.
 */
const 견줄수있나 = 독 && 한 && 한.온전수 >= 얇음문턱 && 독.온전수 >= 얇음문턱;
const 차견줌 = 독 && 한 ? {
  comparable: 견줄수있나,
  german: 독.합, germanFull: 독.온전수, germanNames: 독.이름들,
  korean: 한.합, koreanFull: 한.온전수, koreanNames: 한.이름들,
  /* ⛔ 견줄 수 없으면 배수를 **내지 않는다.** 수를 내놓고 「조심하세요」라 적는 것으로는 못 막는다 */
  ratio: 견줄수있나 ? +(독.합 / 한.합).toFixed(1) : null,
  whyNotComparable: 견줄수있나 ? null
    : `Only ${한.온전수} of the ${한.브랜드수} Korean marques has an article in all four editions. `
      + 'Hyundai has none in the Thai Wikipedia, and Genesis has one only in Indonesian. '
      + 'Putting a one-marque total against a three-marque total would not be a comparison between '
      + 'kinds; it would be a comparison between how many articles happen to exist. So no multiple is '
      + 'given here.',
  /** ⭐ 못 견준 것이 이 지면의 **발견**이다. 빈칸을 결과로 적는다 */
  finding: 'The gap that stopped the comparison is itself the thing worth reporting: the Thai '
    + 'Wikipedia has an article on BMW, Mercedes-Benz and Porsche, and none on Hyundai.',
  /* ⛔ 여기가 이 기사에서 제일 미끄러지기 쉬운 자리다 */
  notSales: 'This is how often an encyclopaedia article is opened, not how many cars are sold. '
    + 'We hold no sales figures here, so this page says nothing about who buys what, and a missing '
    + 'article is not a missing market. A marque with a century of motorsport carries model-by-model '
    + 'articles that a reader falls into; that alone can move reading without moving a single sale.',
} : null;

const 나감 = {
  generated: 오늘(),
  source: 'Wikimedia Pageviews API, human traffic only; brand identity from Wikidata',
  window: 원.window,
  unit: 'reads per million reads of that edition (백만분율)',
  editionsSea: 판들,
  editionTotals: 원.editionTotals,
  question: 'Does it change anything to split brands by kind instead of ranking them together?',
  /**
   * 🔴 2026-08-14 — 처음에 「4th in one kind and 4th in another」가 나갔다.
   *   첫 원소와 **최댓값**을 견줬기 때문이다. 자리가 [4,1,4] 인데 1 을 놓쳤다.
   *   ⛔ 셈은 맞았고 **뜻이 틀렸다.** 견줄 것은 첫 원소가 아니라 **가장 높은 자리**다.
   */
  answer: 바뀜.바뀌나
    ? `Yes. ${판이름[바뀜.제일]} sits ${차례말(Math.min(...바뀜.자리[바뀜.제일]))} in one kind and `
      + `${차례말(Math.max(...바뀜.자리[바뀜.제일]))} in another. Read as one lump, that disappears.`
    : 'No. The four countries keep the same order in every kind, so the split adds nothing.',
  kinds: 갈래들,
  countryNames: 판이름,
  positionSwing: 바뀜,
  carsCompared: 차견줌,
  brandsMeasured: 원.brandsMeasured,
  brandsNotMeasured: 원.brandsNotMeasured,
  /* ⛔ 이 지면이 **못 하는 것**. 82편에서 쓴 문장을 그대로 이어 쓴다 — 그때도 지금도 참이다 */
  cannotAnswer: 원.cannotAnswer,
  thinKinds: 갈래들.filter((g) => g.얇은가).map((g) => g.label),
  thinNote: `A kind holding fewer than ${얇음문턱} brands is too thin to call a pattern. `
    + 'It is shown so the panel is complete, and marked so it is not read as one.',
};

const 길 = path.join(뿌리, 'src/data/wikitip-brand-kinds.json');
fs.writeFileSync(길, `${JSON.stringify(나감, null, 2)}\n`);
console.log(`✅ ${path.relative(뿌리, 길)}`);
console.log(`   갈래 ${갈래들.length} · 브랜드 ${원.brandsMeasured} · 얇은 갈래 ${나감.thinKinds.length}`);
for (const g of 갈래들) {
  console.log(`   ${g.label.padEnd(26)} ${String(g.합).padStart(7)}  ${g.차례.map((p) => 판이름[p]).join(' > ')}`
    + `${g.얇은가 ? '  ⚠ 얇다' : ''}${g.뺀것 ? `  (${g.뺀것}개는 네 판에 글이 없어 뺐다)` : ''}`);
}
console.log(`   자리 폭이 제일 큰 나라: ${판이름[바뀜.제일]} — ${JSON.stringify(바뀜.자리[바뀜.제일])}`);
if (차견줌) console.log(`   독일 차 ${차견줌.german} vs 한국 차 ${차견줌.korean} = ${차견줌.ratio}배`);

/**
 * 🔴 **`--selftest` 만 보고 돌면 안 된다.** 이 자가 import 되면 부르는 쪽의 argv 를
 *   제 것으로 알고 제 자가시험을 돌린 뒤 `process.exit` 한다 — **남의 시험이 통째로
 *   안 돈다.** 8/15 에 세 빌더가 하루 종일 그랬고, 화면엔 초록이 떴다.
 */
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
  && process.argv.includes('--selftest')) {
  const 잼 = []; const 참 = (n, v) => 잼.push([n, !!v]);
  참('네 판에 글 없는 브랜드는 갈래 합에서 뺀다',
    갈래합([{ seaEditionsWithArticle: 3, perMillion: { id: 9, vi: 9, th: 9, ms: 9 } }]).합 === 0);
  참('뺀 개수를 센다',
    갈래합([{ seaEditionsWithArticle: 3, perMillion: {} }]).뺀것 === 1);
  참('온전한 줄은 더한다',
    갈래합([{ seaEditionsWithArticle: 4, perMillion: { id: 1, vi: 2, th: 3, ms: 4 } }]).합 === 10);
  참('판차례는 큰 것부터', 판차례({ id: 1, vi: 4, th: 3, ms: 2 })[0] === 'vi');
  참('자리가 안 바뀌면 바뀌나=false',
    자리바꿈([{ 판별: { id: 4, vi: 3, th: 2, ms: 1 } }, { 판별: { id: 8, vi: 6, th: 4, ms: 2 } }]).바뀌나 === false);
  참('자리가 바뀌면 잡는다',
    자리바꿈([{ 판별: { id: 4, vi: 3, th: 2, ms: 1 } }, { 판별: { id: 1, vi: 2, th: 3, ms: 4 } }]).바뀌나 === true);
  참('얇은 갈래는 자리 다툼에서 뺀다',
    자리바꿈([{ 판별: { id: 4, vi: 3, th: 2, ms: 1 } }, { 얇은가: true, 판별: { id: 1, vi: 2, th: 3, ms: 4 } }]).바뀌나 === false);
  참('갈래 이름이 자료 키로 새지 않는다', 갈래들.every((g) => !/-/.test(g.label)));
  참('얇은 갈래를 표시한다', 갈래들.every((g) => g.얇은가 === (g.온전수 < 얇음문턱)));
  참('차 견줌은 읽힘이 팔림이 아님을 적는다', /not how many cars are sold/.test(차견줌.notSales));
  /* 🔴 8/14 여기서 「7.1배」를 낼 뻔했다. 기아 하나 대 독일 셋이었다 */
  참('견줄 수 없으면 배수를 아예 안 낸다', 차견줌.comparable === false && 차견줌.ratio === null);
  참('왜 못 견주는지를 적는다', /Hyundai has none in the Thai Wikipedia/.test(차견줌.whyNotComparable));
  참('빈칸 자체를 발견으로 적는다', /none on Hyundai/.test(차견줌.finding));
  참('빠진 개수가 자료에 남는다', 차견줌.koreanFull < 차견줌.germanFull);
  /* 🔴 8/14 「4th in one kind and 4th in another」가 나갈 뻔했다 — 셈은 맞고 뜻이 틀렸다 */
  참('자리 문장이 최고와 최저를 견준다', !/(\d+)(st|nd|rd|th) in one kind and \1\2/.test(나감.answer));
  참('차례말이 1st', 차례말(1) === '1st');
  참('차례말이 2nd·3rd', 차례말(2) === '2nd' && 차례말(3) === '3rd');
  참('차례말이 4th·11th', 차례말(4) === '4th' && 차례말(11) === '11th');
  참('못 재는 것을 그대로 들고 온다', String(나감.cannotAnswer).length > 80);
  참('밑값을 자료에 남긴다', 판들.every((p) => 나감.editionTotals[p] > 0));
  const 진 = 잼.filter(([, ok]) => !ok);
  console.log(`\n자가시험 ${잼.length}개 · ${진.length ? `🔴 ${진.length}개 실패` : '✅ 전부 통과'}`);
  for (const [n] of 진) console.log(`   🔴 ${n}`);
  process.exit(진.length ? 1 : 0);
}
