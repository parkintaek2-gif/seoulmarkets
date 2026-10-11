/**
 * **SeoulMarkets(영어 지면)에 한국어가 뜻 없이 나가는 것을 막는다.**
 *
 * 🔴 2026-09-04 · 5번이 K Culture Wire에서 이 결함을 두 번 겪었다(누출 + «전부 빨강»으로
 *   꺼진 검사) — 그리고 전 유닛에 "6번의 증권사 자료도 위험하다"고 콕 짚었다.
 * ⭐ SeoulMarkets엔 이 검사 자체가 없었다. 판정 로직은 검증된 것을 그대로 가져다 쓴다
 *   (scripts/check-kcw-korean-leak.mjs — 뜻이있나·맨몸한국어·손님지면인가) — 새로 안 만든다.
 *   같은 로직을 두 벌 두면 한쪽만 고치고 잊는 사고가 난다.
 *
 * ⛔ 한국어를 금지하는 검사가 아니다 — 뜻(영문 대응)이 괄호·줄표로 바로 옆에 있으면 정당하다:
 *     ✅ 신용융자_코스닥 (KOSDAQ margin loan balance)   원문이 앞, 뜻이 괄호
 *     ✅ Mail-order licence 2026-세종-0591 (Sejong)      법정 등록번호, 숫자 사이 낀 관청명
 *     🔴 (본문에 그대로 남은 우리끼리 쓰는 한국어 메모)   뜻이 어디에도 없다 ← 이것만 잡는다
 *
 *   node scripts/check-seoulmarkets-korean-leak.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { 맨몸한국어 as 원본맨몸한국어, 손님지면인가, 스크립트속한국어 } from './check-kcw-korean-leak.mjs';
import { 못재면멈춘다 } from './lib/dist-ready.mjs';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * ⭐ SeoulMarkets 몫의 실측 차이 — KCW에는 없던 무늬다.
 *   `신용융자_코스닥 (KOSDAQ margin loan balance)` 처럼 원문 필드명을 **밑줄로 이은 것**이
 *   6번 기사에 실제로 있다(오늘 낸 margin-debt 기사). 원본 판정(뜻이있나)은 한글 조각을
 *   공백·괄호 기준으로만 가르므로, 밑줄 뒤에 이어지는 한글까지가 «한 낱말」로 안 보여
 *   `신용융자` 만 따로 뽑혀 뜻(괄호)을 못 찾고 빨강으로 잡힌다(실측 — 자가시험 통과 전 확인).
 *   ⛔ 원본 파일(check-kcw-korean-leak.mjs)은 5번 소유·자가시험 22개로 막 고친 것이라
 *     여기서 규칙을 넓히지 않는다 — 밑줄만 공백으로 미리 펴서 넘긴다(내 몫 안에서 처리).
 */
/**
 * 🔴🔴 [2026-09-09 06:3x · 5번] **네 장이 사흘째 빨갰는데 «누출이 하나도 없었다».**
 *
 * 걸린 자리를 전부 꺼내 봤다(dist 에서 태그를 벗겨 앞뒤 46자와 함께).
 * ```
 *   …three-year Treasury benchmark, 【국고】03500-2906(26-5) — was 36.6%…
 *   …Korea Treasury Bonds (【국고】) were 95.1%…
 *   …free text such as '15【년】 8월', which we parse to decimal years…
 *   …the company’s own words for “total” (【전사】, 전체, 합계, 총계, 성별합계, 계, 소계)…
 * ```
 * ⇒ 전부 **출처가 그렇게 적어 놓은 글자**다. 번역하면 기사가 거짓이 된다 —
 *   `국고03500-2906` 은 채권의 «공식 종목명»이고, `'15년 8월'` 은 공시 자유기입 칸의 «실제 예»이며,
 *   마지막 것은 「어느 한국어 낱말을 총계로 볼 것인가」가 그 기사의 «주제»다.
 *
 * ⛔ 그렇다고 자를 무르게 하지 않는다. 「영어가 앞에 있으면 봐준다」로 넓히면
 *   영문 기사 속 «어떤» 한국어도 다 통과한다 — 그것은 검사를 끄는 것이다.
 * ✅ 그래서 «기계로 가릴 수 있는 것»만 규칙으로 두고, 나머지는 면제표에 까닭을 적는다.
 *
 * ⚠ 이 두 규칙은 **SeoulMarkets 에만** 둔다. 공용 판정기(check-kcw-korean-leak)에 넣으면
 *   KCW 지면에서도 따옴표 안 한국어가 통과한다 — KCW 는 한국어를 아예 안 내는 지면이다.
 */

/** 한국어에 숫자·부호가 붙어 «식별자»가 된 것 — 종목코드·계정코드 따위. 번역할 수 없다 */
export const 식별자꼴 = /[가-힣]+[0-9][0-9A-Za-z가-힣().-]*/g;

/**
 * 따옴표 안에 든 «원문 그대로»의 짧은 한국어.
 * ⛔ 길이를 12자로 묶는다 — 문단을 통째로 따옴표에 넣어 통과시키지 못하게.
 * ⛔ 겹따옴표(“ ”)는 넣지 않는다 — 영문 기사에서 그것은 «인용»이 아니라 강조로도 쓰인다.
 */
export const 따온짧은말꼴 = /['‘’][^'‘’]{0,12}?[가-힣][^'‘’]{0,12}?['‘’]/g;

/**
 * 「원문을 그대로 보여 준다」고 «영어로» 밝히고 따옴표에 넣은 인용.
 *
 * 🔴 [2026-09-09 06:5x · 5번] 실측으로 나온 자리 —
 * ```
 *   …'participation, the interest rate … are not yet finalized'
 *     (Korean original: '참여 여부와 이자율, 선납 규모 및 기간 등 구체적인 세부 조건은 …')
 * ```
 * ⭐ 영어 번역을 «먼저» 주고 원문을 보여 주는 것은 우리 방식에 맞다 — 손님이 검산할 수 있다.
 *
 * ⛔ 그런데 그 딱지가 원래 「(원문: …)」이었다. **딱지 자체가 한국어면 영어권 손님은 못 읽는다.**
 *   그래서 기사를 「(Korean original: …)」로 고치고, 이 규칙은 «영어 딱지만» 인정한다.
 *   ⇒ 한국어 딱지로는 통과할 수 없다. 규칙이 지면을 영어로 끌어당긴다.
 * ⚠ 길이를 200자로 묶는다 — 문단을 통째로 넣어 통과시키지 못하게.
 */
export const 원문인용꼴 = /\((?:Korean )?original:\s*['‘"“][^'’"”]{0,200}?['’"”]\s*\)/gi;

/** 원문 그대로 옮긴 자리를 지운 글 — 무엇을 지웠는지 세어 함께 낸다 */
export function 원문그대로지우기(글) {
  const 지운것 = [];
  /**
   * 🔴 HTML 은 따옴표를 «숫자 엔티티»로 적는다 — `&#39;` 를 안 풀면 따온 말을 못 본다.
   *   실측: dist 에 「free text such as &#39;15년 8월&#39;, which we parse to decimal years」로 적혀 있었다.
   *   ⚠ 공용 판정기는 `&[a-z]+;` 만 지운다 — 숫자 엔티티(`&#39;`)는 그 무늬에 안 걸린다.
   */
  let s = String(글 ?? '')
    .replace(/&#0*39;|&#x0*27;/gi, "'")
    .replace(/&#0*34;|&#x0*22;|&quot;/gi, '"');
  /* ⚠ 원문인용꼴을 «먼저» 지운다 — 그 안에 식별자·따온말이 들어 있을 수 있다 */
  for (const 꼴 of [원문인용꼴, 식별자꼴, 따온짧은말꼴]) {
    s = s.replace(new RegExp(꼴.source, 'g'), (m) => { 지운것.push(m); return ' '; });
  }
  return { 글: s, 지운것 };
}

function 맨몸한국어(글) {
  const { 글: 원문뺀글 } = 원문그대로지우기(String(글).replace(/_/g, ' '));
  return 원본맨몸한국어(원문뺀글);
}

if (!process.argv.includes('--자가시험')) 못재면멈춘다(뿌리, 'check-seoulmarkets-korean-leak');

/**
 * 면제 — **무엇이 왜 한국어라도 되는가**를 같이 적는다. 파일 하나·낱말 하나 단위로 좁게 둔다.
 * ⛔ 지면을 통째로 면제하지 않는다 — 그 지면의 다른 새 누출은 계속 잡혀야 한다.
 */
/**
 * 🔴 [2026-10-04 05:2x] **인라인 스크립트 속 한국어 — 아직 안 고친 지면 열다섯.**
 *
 *   「못 쟀다」가 아니라 **「알고 있는데 아직 안 고쳤다」**다. 이름으로 적어 두는 까닭은
 *   둘이다 — ① 여기 없는 지면에서 새로 생기면 «빨강이 난다» ② 이 목록이 곧 일감이다.
 *
 *   ⛔ 이 목록을 늘려서 빨강을 끄지 않는다. 고치고 «지우는» 것이 끝이다.
 *   ⚠ `100y/*` 여덟 장은 **한국어 지면**이라 UI 문구(「…로 찾은 대학이 없습니다」)는
 *     그대로 둔다. 거기서 고칠 것은 «주석»뿐이다.
 *   ⚠ `rankings.html` 의 「비엔케이제」·「호스팩」은 회사 이름이다 — 자료 값이지 주석이 아니다.
 */
export const 스크립트면제 = [
  /* 한국어 지면 — UI 문구는 정당하다. 주석만 치우면 된다 */
  '100y/elementary.html', '100y/kindergarten.html', '100y/major.html', '100y/pension.html',
  '100y/polytech.html', '100y/school.html', '100y/university.html', '100y/years-left.html',
  /* 🔴 영문 지면 — 여기는 «고쳐야» 한다. 1번·2번에게 나눈다 */
  'account.html', 'data.html', 'data/screener.html', 'data/pension-wage-panel.html',
  'rankings.html', 'recover.html', 'wikitip/subscribe.html',
];

export const 면제 = [
  {
    파일: 'article/korea-headcount-disclosure-has-no-total-row.html',
    낱말: ['성별합계', '전사', '전체', '합계', '총계', '계', '소계', '회사', '성별',
      /* 🔴 이 여섯은 기사가 「우리 `/계$/` 무늬가 «잘못» 총계로 올린 것들」이라며 나열한 이름이다.
         실측: 「suffix test: /계$/ promotes 기계, 농기계, 건설기계, 설계, 반도체설계 and 광주신세계 to totals」
         ⇒ 그 글자를 지우면 「무엇이 잘못 잡혔나」라는 문장이 성립하지 않는다. */
      '기계', '농기계', '건설기계', '설계', '반도체설계', '광주신세계'],
    잰다: '이 기사의 «주제»가 바로 그 낱말들이다 — 「공시가 총계 행에 어떤 한국어 이름을 쓰나」. '
      + '실측: 「company’s own words for “total” or “company-wide” (전사, 전체, 합계, 총계, 성별합계, 계, 소계)」 · '
      + '「its total row is labelled 성별 총계 — with a space, and 총계 rather than 합계」 · '
      + '「treated any label ending in 계 as a total, which silently swallowed 기계 — the Korean word for machinery」. '
      + '⇒ 낱말마다 바로 옆에 영어 설명이 붙어 있고, 번역하면 「어느 글자로 적혀 있나」라는 기사가 거짓이 된다. '
      + '⛔ 지면을 통째로 면제하지 않았다 — 이 열 낱말만이다. 이 지면의 다른 한국어는 계속 잡힌다.',
  },
  /* 🔴🔴 [2026-10-11 11:1x · 5번] **한국 회사의 «한국인이 아닌» 대표 열 사람.**
   *
   *   공시(dart-executives)에 **한글 음차로만** 적혀 있고 로마자 표기가 어디에도 없다.
   *   한국식 로마자 규칙으로 옮기면 「후이만킷」이 `Hu Imankit` 이 되어 **그 사람의 이름이 아니다.**
   *   ⇒ 재 보고 안 되면 안 된다고 적는다. 지어내지 않는다.
   *
   * ✅ 지면이 손님에게 그 사실을 영어로 밝히고 있다(실측 — src/pages/company/[slug].astro) —
   *   「Some names are shown in Korean only. Those are filed for non-Korean directors, and
   *    converting them to Roman letters through Korean spelling rules would give the wrong name.」
   *   ⇒ 영어권 손님이 **못 읽는 채로 버려지는** 것이 아니다. 왜 한글인지까지 읽는다.
   *
   * ⛔ 이것은 «수를 올려 빨강을 끄는 것»이 아니다. 열 사람을 **이름으로** 적는다 —
   *   열한 번째가 생기면 빨강이 난다. 영영 빨간 검사는 꺼진 검사와 같아서 그때 아무도 못 본다.
   * ⚠ 이 목록은 «일감»이 아니다. 고칠 길이 없다 — 공시에 다른 표기가 없기 때문이다.
   *   단, 회사가 나중에 영문 표기를 공시하면 `korean-name-roman.mjs` 가 그것을 받아
   *   로마자가 붙고 이 줄이 남아돌게 된다. 그때는 지운다.
   * ⛔ 「국적 괄호를 떼고 앞부분을 옮기면 되지 않나」로 넓히지 않는다 —
   *   「다이중치우(중국)」의 앞부분은 중국 이름의 한글 음차지 한국 이름이 아니다. */
  ...[
    ['china-crystal-new-material-holdings-co', '다이중치우', '공시에 「다이중치우(중국)」 — 국적을 중국으로 함께 적어 냈다'],
    ['coloray-international-investment-co', '줘중비아오', '공시에 「줘중비아오(도니미카)」 — 국적을 함께 적어 냈다'],
    ['great-rich-technologies', '주영남', '공시에 「주영남(도미니카연방)」 — 국적을 함께 적어 냈다. 이름은 한국식이나 로마자 표기는 안 냈다'],
    ['heng-sheng-holding-group', '후이만킷', '공시에 「후이만킷(홍콩)」 — 국적을 홍콩으로 함께 적어 냈다'],
    ['hyundai-motor-co', '무뇨스 바르셀로 호세 안토니오', '스페인식 이름 넉 자리를 한글로 음차해 적었다. 한국식으로 옮기면 Mu Nyo-seu… 가 되어 거짓이다'],
    ['i-robotics', '김데이비드형', '공시에 「김데이비드형(김형모)」 — 괄호 안이 또 다른 한글 이름이라 어느 쪽이 그 사람의 이름인지 우리가 정할 자격이 없다'],
    ['jtc', '야마모토 후미야', '일본 이름의 한글 음차다. 한국식 로마자로 옮기면 그 사람의 이름이 아니다'],
    ['organic-tea-cosmetics-holdings', '차이정왕', '공시에 「차이정왕(통가)」 — 국적을 함께 적어 냈다'],
    ['s-1', '하나오카 타쿠로', '일본 이름의 한글 음차다'],
    ['saeronautomotive-corporration', '쿠마카와 테츠야', '일본 이름의 한글 음차다'],
  ].map(([쪽, 이름, 까닭]) => ({
    파일: `company/${쪽}.html`,
    /* 공백으로 갈린 이름은 판정기가 조각으로 떼어 보므로 조각도 함께 적는다 — 통째로만 적으면 안 맞는다 */
    낱말: [이름, ...이름.split(/\s+/)],
    잰다: `${까닭}. 로마자 표기가 공시 어디에도 없어 우리가 옮기면 «그 사람의 이름이 아닌» 글자가 된다. `
      + '지면이 그 까닭을 영어로 밝힌다 — 「Some names are shown in Korean only … would give the wrong name」. '
      + '⛔ 이 한 사람만 면제다. 이 지면의 다른 한국어는 계속 잡힌다.',
  })),
  {
    파일: 'data/krx-open-api-fields.html',
    낱말: ['재배포', '이용허락범위', '제한 없음', '제한', '없음'],
    잰다: '이 셋은 손님이 «KRX 약관 지면을 열고 Ctrl+F 에 붙여 넣을 글자»다 — 그것이 그 절의 요점이다. '
      + '실측(지면 본문): 「redistribution, 재배포. It is not in them.」 · '
      + '「marked 이용허락범위 "제한 없음" — no restriction on scope of use」. '
      + '⇒ 낱말마다 바로 옆에 영어 뜻이 붙어 있다. 번역하면 「약관에 그 낱말이 없다」라는 문장이 거짓이 된다. '
      + '⭐ 이 지면이 KRX 문서보다 나은 단 하나의 까닭이 바로 이 글자들이다 — 칸 이름은 저쪽에도 있다. '
      + '⛔ 지면을 통째로 면제하지 않았다 — 이 다섯 낱말만이다. 이 지면의 다른 한국어는 계속 잡힌다. '
      + '✅ 「영어 뜻이 반드시 옆에 붙는다」를 글로만 두지 않는다 — '
      + 'tests/krx-지면-한국어는-영어와-짝인가.test.mjs 가 그것을 잰다(npm test 의 node --test tests/*.test.mjs 에 물려 돈다). '
      + '⚠ 그 시험이 깨지면 이 면제는 근거를 잃는다 — 면제를 지우는 것이 아니라 지면을 고친다.',
  },
  {
    파일: 'api.html', 낱말: ['미래에셋증권', '해성디에스', '매수'],
    잰다: '`/v1/research` 실제 응답을 그대로 뜬 코드 샘플이다(주석: "손으로 예쁘게 고치지 않는다"). '
      + '두 줄 아래 brokerEn "Mirae Asset Securities"·subjectEn "Haesung DS"·ratingNormalised.code "buy" 가 '
      + '같은 JSON 블록 안에 이미 있다 — 판정기의 26자 앞뒤 창이 줄 바꿈 너머까지 안 볼 뿐이다',
  },
];

/** SeoulMarkets 몫만 본다 — 같은 dist 아래 100yearmap·K Culture Wire 지면은 뺀다(각자 제 검사가 있다/생긴다) */
export function 내지면인가(상대경로) {
  const p = 상대경로.replace(/\\/g, '/');
  /* dist 뿌리 자체에 다른 두 사이트의 홈이 파일로 하나씩 있다(100y.html·wikitip.html) — 폴더뿐 아니라 이 둘도 뺀다 */
  if (p.startsWith('wikitip/') || p === 'wikitip.html') return false;
  if (p.startsWith('100y/') || p === '100y.html') return false;
  return true;
}

const 직접불렸나 = process.argv[1]
  && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (process.argv.includes('--자가시험')) {
  let 통 = 0; let 실 = 0;
  const 재본다 = (이름, 실제, 바람) => {
    if (JSON.stringify(실제) === JSON.stringify(바람)) 통 += 1;
    else { 실 += 1; console.error(`  ⛔ ${이름}\n     받은 것: ${JSON.stringify(실제)}\n     바란 것: ${JSON.stringify(바람)}`); }
  };
  재본다('KCW 지면은 안 본다', 내지면인가('wikitip/article/x.html'), false);
  재본다('100yearmap 지면은 안 본다', 내지면인가('100y/college-major/x.html'), false);
  재본다('SeoulMarkets 지면은 본다', 내지면인가('article/korea-margin-debt-record-moved-to-kospi.html'), true);
  재본다('루트 지면도 본다', 내지면인가('index.html'), true);
  재본다('100yearmap 홈(파일) 은 안 본다', 내지면인가('100y.html'), false);
  재본다('KCW 홈(파일) 은 안 본다', 내지면인가('wikitip.html'), false);
  /* 판정 로직 자체는 check-kcw-korean-leak.mjs 가 이미 22개로 잰다 — 여기서 또 재지 않는다(중복 시험 금지) */
  재본다('맨몸한국어 — 뜻 있는 한국어(오늘 낸 기사 실제 문구)는 안 잡는다',
    맨몸한국어('<p>KOSDAQ share = 신용융자_코스닥 (KOSDAQ margin loan balance)</p>'), []);
  재본다('맨몸한국어 — 등록번호 옆 관청명은 안 잡는다',
    맨몸한국어('<p>Mail-order licence 2026-세종-0591 (Sejong)</p>'), []);
  /**
   * 🔴 [2026-09-09 07:0x · 5번] **이 단정이 낡아 `npm test` 를 막고 있었다.**
   *
   * 옛 단정은 `['왜 튀었나', '사건이 이 자료에 없다']` 둘을 바랐다.
   * 2026-09-07 에 공용 판정기가 「토막이 아니라 «이름 끝»에서 뜻을 찾는다」로 바뀌었고,
   * 그 뒤 «줄표(—)를 이름 안으로 넘어가는» 규칙(check-kcw-korean-leak.mjs:85 · 열두 자까지)
   * 때문에 이 두 토막이 **한 이름으로 묶여 한 번만** 나온다.
   *
   * ⭐ 재 보니 **구멍은 아니다.** 지면은 그대로 빨강이 되고, 무엇보다 —
   * ```
   *   신용융자 (margin loan balance) — 우리끼리 쓰는 메모   →  ["우리끼리 쓰는 메모"]
   * ```
   *   **앞의 뜻이 뒤의 맨몸을 보증하지 못한다.** 그것이 이 검사에서 지켜야 할 성질이고,
   *   아래 두 줄이 그 성질을 못박는다. ⛔ 단정을 무르게 하는 것이 아니라 «옮기는» 것이다.
   */
  재본다('맨몸한국어 — 뜻 없이 흘린 한국어는 잡는다 (줄표로 이은 것은 «한 이름»으로 묶인다)',
    맨몸한국어('<p>왜 튀었나 — 사건이 이 자료에 없다</p>'), ['왜 튀었나']);
  재본다('🔴 앞의 «뜻»이 줄표 뒤의 맨몸을 보증하지 못한다 — 이것이 지켜야 할 성질이다',
    맨몸한국어('<p>신용융자 (margin loan balance) — 우리끼리 쓰는 메모</p>'), ['우리끼리 쓰는 메모']);
  재본다('🔴 줄표 뒤가 길어도 잡는다',
    맨몸한국어('<p>신용융자 (margin loan balance) — 이 자료에는 그 사건이 없다</p>'),
    ['이 자료에는 그 사건이 없다']);
  /* 🔴 [2026-09-09 · 5번] 「원문 그대로 옮긴 것」을 가리는 세 규칙 — 다 실측 자리로 시험한다 */
  재본다('식별자 — 채권 종목명은 안 잡는다 (국고03500-2906)',
    맨몸한국어('<p>the three-year Treasury benchmark, 국고03500-2906(26-5) — was 36.6%</p>'), []);
  재본다('따온 짧은 말 — 공시 자유기입 칸의 실제 예는 안 잡는다',
    맨몸한국어("<p>free text such as '15년 8월', which we parse to decimal years</p>"), []);
  재본다('🔴 숫자 엔티티 따옴표(&#39;)도 푼다 — dist 는 그렇게 적는다',
    맨몸한국어('<p>free text such as &#39;15년 8월&#39;, which we parse</p>'), []);
  재본다('원문 인용 — 영어 딱지가 붙으면 안 잡는다',
    맨몸한국어("<p>'not yet finalized' (Korean original: '참여 여부와 이자율, 선납 규모 및 기간 등 구체적인 세부 조건은 아직 확정되지 않았다')</p>"), []);
  재본다('🔴 원문 인용 — 딱지가 «한국어»면 잡는다 (영어권 손님이 못 읽는다)',
    맨몸한국어("<p>'not yet finalized' (원문: '참여 여부와 이자율은 확정되지 않았다')</p>").length > 0, true);

  /* ⛔ 자를 무르게 하지 않았는지 반대쪽에서도 잰다 — 이것이 통과하면 검사가 꺼진 것이다 */
  재본다('⛔ 따옴표에 문단을 통째로 넣어도 통과하지 못한다 (12자 넘김)',
    맨몸한국어("<p>'우리끼리 쓰는 긴 메모를 따옴표에 넣어서 통과시키려 해도 안 된다'</p>").length > 0, true);
  재본다('⛔ 숫자를 붙여도 «문장»은 통과하지 못한다',
    맨몸한국어('<p>왜 튀었나2 — 사건이 이 자료에 없다</p>').length > 0, true);
  재본다('⛔ original: 딱지만 붙이고 따옴표를 안 쓰면 통과하지 못한다',
    맨몸한국어('<p>(original: 참여 여부와 이자율은 확정되지 않았다)</p>').length > 0, true);

  재본다('원문그대로지우기 — 무엇을 지웠는지 세어 낸다',
    원문그대로지우기("국고03500-2906 and '15년 8월'").지운것.length, 2);
  재본다('⛔ 원문그대로지우기 — 지울 것이 없으면 빈 목록',
    원문그대로지우기('nothing here').지운것.length, 0);
  재본다('⛔ 원문그대로지우기 — 빈 글도 견딘다', 원문그대로지우기(null).지운것.length, 0);
  재본다('면제표에 까닭이 다 있다', 면제.every((x) => x.잰다 && x.잰다.length > 10), true);
  console.log(`자가시험 ${통}/${통 + 실}`);
  process.exit(실 ? 1 : 0);
}

if (직접불렸나) {
  const 방 = path.join(뿌리, 'dist');
  if (!fs.existsSync(방)) { console.log('⚠ dist 가 없다. 먼저 짓는다'); process.exit(0); }

  const 지면들 = [];
  (function 걷기(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) 걷기(p);
      else if (e.name.endsWith('.html') && 내지면인가(path.relative(방, p))) 지면들.push(p);
    }
  }(방));

  const 빨강 = [];
  let 건너뛴것 = 0;
  for (const f of 지면들) {
    const 글 = fs.readFileSync(f, 'utf8');
    if (!손님지면인가(글)) { 건너뛴것 += 1; continue; }
    const 상대 = path.relative(방, f).replace(/\\/g, '/');
    const 이면제 = 면제.find((x) => x.파일 === 상대);
    let 맨몸 = 맨몸한국어(글);
    if (이면제) 맨몸 = 맨몸.filter((w) => !이면제.낱말.includes(w));
    /* 🔴 [2026-10-04] 인라인 스크립트 안도 본다 — 주석까지 손님 브라우저로 간다.
       이 자는 «태그를 벗겨» 본문만 보았고, script 안은 통째로 밖이었다.
       첫 실측: 지면 16,096장 가운데 **15,330장**이 걸렸다. 거의 다 두 곳에서 왔다 —
         선호출처.astro (모든 기사 레이아웃)  ·  HundredYear.astro (백년지도 모든 지면)
       둘을 ASCII 로 고치니 **15장**으로 줄었다.
       ⚠ 남은 15장은 아래 `스크립트면제` 에 이름으로 적어 둔다 — 「모르는 것」이 아니라
         「아는데 아직 안 고친 것」이다. 늘면 빨강이 난다. */
    const 조각속 = 스크립트면제.includes(상대) ? [] : 스크립트속한국어(글);
    if (조각속.length) 맨몸 = [...맨몸, ...조각속.map((w) => `[script] ${w}`)];
    if (맨몸.length) 빨강.push([path.relative(방, f), 맨몸]);
  }

  console.log(`SeoulMarkets 지면 ${지면들.length}장에서 **뜻 없는 한국어**를 찾는다`);
  if (건너뛴것) {
    console.log(`⬜ 안 본 것 ${건너뛴것}장 — noindex 를 단 «내부» 지면이다(손님이 받지 않는다).`);
    console.log('   ⚠ 이것을 「깨끗하다」로 읽지 않는다. 안 본 것은 안 본 것이다.');
  }
  if (지면들.length < 50) {
    console.log(`🔴 지면이 ${지면들.length}장뿐이다 — 빌드가 덜 됐다. **아무것도 안 보고 통과시키지 않는다**`);
    process.exit(1);
  }
  if (!빨강.length) { console.log('✅ 빨강 0건'); process.exit(0); }
  console.log(`🔴 빨강 ${빨강.length}장`);
  for (const [f, 낱] of 빨강.slice(0, 25)) console.log(`   ${f.padEnd(46)} ${낱.slice(0, 4).join(' / ')}`);
  if (빨강.length > 25) console.log(`   … 그리고 ${빨강.length - 25}장 더`);
  process.exit(1);
}
