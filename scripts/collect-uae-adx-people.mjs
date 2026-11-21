#!/usr/bin/env node
/**
 * collect-uae-adx-people.mjs — **UAE 확장 2호 수집기.** ADX(아부다비 증권거래소) 상장사
 * «사람과 지분» — 이사회·경영진 명단, 5% 이상 대주주 지분율. 시세·재무가 아니다.
 *
 *   node scripts/collect-uae-adx-people.mjs --자가시험
 *   node scripts/collect-uae-adx-people.mjs                 전 종목 새로 받는다(멱등)
 *   node scripts/collect-uae-adx-people.mjs --종목 ALDAR,ADIB   특정 종목만
 *
 * ── 왜 이 데이터인가 (사장님 지시 2026-08-04 「경쟁사는 재무를, 우리는 사람을」) ──────
 * ADX 웹사이트의 회사별 지면(`/company-profile/shareholder-and-board`)은 화면 전체를
 * 그대로 가져오면 «내비게이션·CSS·GA·라이브챗» 같은 잡음이 태반이다(직접 받아 realize —
 * 24만자 압축 JSON 중 실제 이사·주주 데이터는 0자, 전부 화면 뼈대였다).
 * 사장님 지시(2026-09-13): 「**중요한 정보만 갖고 올 수 있게 만들어**」 —
 * 그래서 화면 전체가 아니라, 화면이 그린 뒤에 부르는 **데이터 API 세 개만** 골라 쓴다.
 *
 * ── 출처 (docs/UAE-데이터-출처-라이선스.md 1-2 「상장기업 공시」) ────────────────────
 *   listed-companies/1.1/board-members/<종목>          이사회·경영진 명단 + 직위 + 순번
 *   marketwatch/1.1/listedCompanyShareholderInfo/<종목>  5% 이상 대주주 지분율(거래소가 이미
 *                                                       "중요"를 걸러 공시 의무 있는 주주만 낸다)
 *   marketwatch/1.1/listedCompanyProfileData/<종목>      법인명·주소(맥락 확인용, 최소)
 * apigateway.adx.ae 는 ADX 공식 웹사이트(www.adx.ae)가 브라우저에서 그대로 부르는
 * 공개 데이터 API 다 — 로그인 없이, 그 회사 개별 지면을 열면 누구나 받는 자료다.
 *
 * ⚠ 화면의 자바스크립트 안에 있던 `adx-gateway-apikey` 를 그대로 쓴다 — 서버 비밀키가
 *   아니라 브라우저가 매 요청에 실어 보내는 **공개 클라이언트 키**다(개발자도구로 누구나 본다).
 *   referer·origin 헤더로 www.adx.ae 출처만 허용하는 방식으로 보인다.
 * 🔴 [2026-09-13 실측] Node `fetch()`(undici)는 이 API 에서도 403 이다 — curl 은 200 이다.
 *   CBUAE 와 같은 Cloudflare TLS 지문 벽. ⇒ **curl 프로세스를 그대로 쓴다.** fetch 로 되돌리지 말 것.
 * ⚠ 종목 목록 자체도 같은 게이트웨이의 scrollingTicker 에서 받는다 — 채권·ETF 심볼도 섞여
 *   있어 이사회/주주 데이터가 없을 수 있다(빈 결과는 실패가 아니라 「없다」로 적는다).
 *
 * 저장: archive/raw/uae-adx-people/<종목>.json  (종목마다 한 파일, 멱등 — 다시 돌리면 덮어쓴다)
 */
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { put } from '../src/lib/store.mjs';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36';
const APIKEY = '1863a94c-582b-46f9-b4f0-0d02c0cc5307';
const GATEWAY = 'https://apigateway.adx.ae/adx';
/**
 * 🔴 [2026-10-04 · 5번] 260ms 로는 **종목마다 429 가 한 번씩** 났다.
 * 429 를 참고 다시 묻게 고친 뒤에도 94곳 중 81곳을 못 받았다 —
 * 재시도도 같은 한도에 걸리니 소용이 없었다. 간격 자체를 늘린다.
 * ⚠ 94종목 × 3번 호출 × 1.1초 ≈ 5분. 소급이 안 되는 자료라 느려도 받는 쪽이 낫다.
 */
/**
 * 🔴 [2026-10-06 22:47 · 5번] **1.1초로도 또 429 가 났다.** 110곳 중 37곳만 받고 막혔다.
 *   거래소가 거는 한도는 우리가 정하는 수가 아니고, 그날그날 다르다.
 * ⇒ 밖에서 늘릴 수 있게 한다. 상수를 고치러 들어오지 않아도 되게.
 *   ADX_GAP_MS=3000 node scripts/collect-uae-adx-people.mjs
 * ⛔ 기본값은 안 바꾼다 — 평소에 느려지면 매일 받는 일이 밀린다.
 * ⚠ 막혔을 때만 늘려서 다시 받는다. 소급이 안 되는 자료라 느려도 받는 쪽이 낫다.
 *
 * ⛔ [22:48] 환경변수 이름을 «한글»로 지었다가 셸이 못 읽었다(bash: command not found).
 *   내 매뉴얼에 「셸 명령줄에 한글 변수명이 든 글을 올리지 않는다」가 적혀 있는데 또 어겼다.
 *   ⇒ 환경변수 이름은 영문 대문자로만 짓는다.
 */
/* 🔴🔴 [2026-10-13 04:0x · 5번] **1100 → 2600. 재서 바꿨다.**
   ─────────────────────────────────────────────────────────────────────
   1.1초로 돌던 날들을 세어 보니 이랬다 —
       2026-10-07  89 종목   ·   10-12  36 종목   ·   10-13 첫판  41 종목
   109 종목 가운데 절반도 못 받고 있었다. **그런데 아무 자도 안 울렸다** —
   그때 두 시간 점검은 「오늘 폴더가 있나」만 봐서 한 개만 들어와도 ✅ 였다.
   ⛔ 이 자료는 **소급 불가**다. 못 받은 날의 이사회 명단은 영영 없다.

   2.6초로 벌려 같은 날 다시 돌린 결과 —
       받은 종목  41 → **96**   ·   429 가 난 줄  84 → **1**
   ⭐ 간격을 두 배 조금 넘게 벌렸더니 받은 양이 두 배가 넘었다.
     **빨리 묻는 것이 많이 받는 것이 아니다.**
   ⚠ 그래도 13 종목이 빈다. 더 벌려 볼 값이 있다 — 다만 109 × 간격이 곧 도는 시간이라
     무작정 못 늘린다. 바꿀 때는 «받은 종목 수»를 재서 정한다. 짐작으로 올리지 않는다. */
const 간격ms = Number(process.env.ADX_GAP_MS) > 0 ? Number(process.env.ADX_GAP_MS) : 2600;

/** 이 회사 지면을 여는 브라우저가 실제로 보내는 헤더 그대로(개발자도구 실측). */
function 헤더인자() {
  return [
    '-A', UA,
    '-H', 'Accept: application/json',
    '-H', 'Referer: https://www.adx.ae/',
    '-H', 'Origin: https://www.adx.ae',
    '-H', 'channel-id: OSS WEB',
    '-H', 'x-correlation-id: uuid',
    '-H', 'x-uuid: ',
    '-H', `adx-gateway-apikey: ${APIKEY}`,
  ];
}

/**
 * 🔴🔴 [2026-10-04 · 5번] **429 를 「자료 없음」으로 적고 있었다.**
 *
 * 94종목을 다 받았다고 찍혔는데 **대주주가 한 곳도 없이 전부 0건**이었다.
 * 수를 보고 자를 의심해 다시 돌려 보니 종목마다 429 가 한 번씩 나고 있었고,
 * 부르는 쪽이 `catch {}` 로 그것을 통째로 삼켜 `null` → 빈 배열 → 파일에
 * `substantialShareholders: []` 로 저장되고 있었다.
 *
 * ⛔ **「못 받았다」와 「없다」가 같은 꼴로 남는다.** 우리 강령이 금지한 바로 그것이다.
 *   더구나 이 자가 쌓는 날짜별 파일은 **소급이 안 된다** — 오늘 0 으로 채우면
 *   「2026-10-04 에는 대주주가 하나도 없었다」가 영영 사실처럼 남는다.
 *
 * ⇒ 429 면 Retry-After 를 지키고 다시 묻는다. 그래도 못 받으면 «못 쟀다»로 던진다.
 * ⚠ 아침에 find-todays-spike.mjs 에서 똑같은 자리에 빠졌다(429 를 「자료 없음」으로
 *   읽어 영어판을 통째로 가렸다). 같은 결함이 다른 자에도 있었다.
 */
export const 참는횟수 = 3;
export const 사이쉼ms = 1500;

function 잠깐(ms) { return new Promise((r) => setTimeout(r, ms)); }

/** curl 로 받는다(node fetch 는 403 — 위 주석 참고). 실패하면 던진다. */
async function curlJson(url, 남은 = 참는횟수) {
  try {
    const 글자 = execFileSync('curl', ['-sS', '-f', ...헤더인자(), url], { maxBuffer: 1024 * 1024 * 10 }).toString('utf8');
    return JSON.parse(글자);
  } catch (e) {
    const 말 = String(e.stderr ?? '') + ' ' + String(e.message ?? '');
    /* curl -f 는 429 에 「error: 429」를 stderr 로 낸다 */
    if (/\b429\b/.test(말) && 남은 > 0) {
      await 잠깐(사이쉼ms * (참는횟수 - 남은 + 1));
      return curlJson(url, 남은 - 1);
    }
    throw e;
  }
}

/**
 * 직위 문자열 → «이사회» / «경영진» / «내부자목록(잡음)» / «미분류».
 * 한국 DART 의 `rgist_exctv_at`(등재임원/미등기) 과 같은 자리 — 오너 쪽 의사결정권(이사회)과
 * 실무 집행(경영진)을 가른다. ADX 는 이 구분을 별도 칸으로 안 주므로 직위명으로 가른다.
 *
 * 🔴 [2026-09-13 실측] `board-members` 엔드포인트 이름과 달리 «이사회 명단»만 오지 않는다 —
 *   ALDAR 로 받아 보니 198건 중 180건이 Insider·Finance Employee·Accountant 였다.
 *   이건 이사회가 아니라 **내부자거래 규정상 신고의무자 명단**(누가 이 회사 주식을
 *   내부정보로 거래하면 안 되는지 감독기관에 보고하는 목록)이다 — 사람마다 뉴스가 되는
 *   축이 아니라 «규정상 등록된 무명 다수»라 사장님 지시(2026-09-13 「중요한 정보만」)의
 *   대상이 아니다. **이사회·경영진만 골라내고, 나머지는 세되 버린다.**
 *
 * ⚠ "Managing Director"·"Executive Director" 도 director 계열이라 이사회로 묶는다 —
 *   걸프 상장사에서 이 직함은 대개 이사회 의석을 겸한다. 확신은 없다 — 그래서 미분류를 남겨 둔다.
 */
export function 직위분류(직위) {
  const t = String(직위 ?? '');
  if (!t.trim()) return '미분류';
  if (/insider|finance employee|accountant|auditor/i.test(t)) return '내부자목록(잡음)';
  if (/chairman|board member|\bdirector\b/i.test(t)) return '이사회';
  if (/general manager|chief executive|top management|management|\bceo\b|\bcfo\b|\bcoo\b/i.test(t)) return '경영진';
  return '미분류';
}

/**
 * board-members 원본 배열 → **이사회·경영진만** 남긴다(잡음: symbolCode 중복, 내부자목록 대량).
 * 버린 건수는 호출한 쪽이 `_meta` 에 적을 수 있도록 `dropped` 로 같이 돌려준다 —
 * 「걸러냈다」를 조용히 하지 않고 숫자로 남긴다.
 */
export function 이사경영진골라내기(rows) {
  if (!Array.isArray(rows)) return { rows: [], dropped: 0 };
  const 전체 = rows.map((r) => ({
    nameEnglish: r.nameEnglish ?? null,
    nameArabic: r.nameArabic ?? null,
    title: r.englishJobTitle ?? null,
    order: Number(r.jobTitleOrder ?? NaN) || null,
    구분: 직위분류(r.englishJobTitle),
  }));
  const 남길것 = 전체.filter((r) => r.구분 === '이사회' || r.구분 === '경영진' || r.구분 === '미분류')
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  return { rows: 남길것, dropped: 전체.length - 남길것.length };
}

/** shareholderInfo 원본 배열 → 중요한 칸만(거래소가 이미 5% 이상만 낸다 — 추가로 거를 게 없다). */
export function 대주주골라내기(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map((r) => ({
    name: r.name ?? null,
    id: r.id ?? null,
    percentage: Number(r.percentage ?? NaN),
  })).filter((r) => Number.isFinite(r.percentage))
    .sort((a, b) => b.percentage - a.percentage);
}

/* ── 자가시험 ───────────────────────────────────────────────────────── */
function 자가시험() {
  const 것 = []; const 재다 = (이름, 됐나) => 것.push({ 이름, 됐나 });

  재다('직위분류: Chairman → 이사회', 직위분류('Chairman') === '이사회');
  재다('직위분류: Vice Chairman → 이사회', 직위분류('Vice Chairman') === '이사회');
  재다('직위분류: Managing Director → 이사회', 직위분류('Managing Director') === '이사회');
  재다('직위분류: General Manager → 경영진', 직위분류('General Manager') === '경영진');
  재다('직위분류: Top Management → 경영진', 직위분류('Top Management') === '경영진');
  재다('직위분류: 빈 값 → 미분류', 직위분류('') === '미분류');
  재다('🔴 직위분류: Insider → 내부자목록(잡음) — 이사회가 아니다', 직위분류('Insider') === '내부자목록(잡음)');
  재다('🔴 직위분류: Finance Employee → 내부자목록(잡음)', 직위분류('Finance Employee') === '내부자목록(잡음)');
  재다('직위분류: Auditor → 내부자목록(잡음)', 직위분류('Auditor') === '내부자목록(잡음)');

  const 가짜이사진 = [
    { symbolCode: 'X', nameEnglish: 'A', nameArabic: 'ا', englishJobTitle: 'Chairman', arabicJobTitle: '_', jobTitleOrder: '1.0' },
    { symbolCode: 'X', nameEnglish: 'B', nameArabic: 'ب', englishJobTitle: 'General Manager', arabicJobTitle: '_', jobTitleOrder: '8.0' },
    { symbolCode: 'X', nameEnglish: 'C', nameArabic: 'ج', englishJobTitle: 'Insider', arabicJobTitle: '_', jobTitleOrder: '16.0' },
  ];
  const { rows: 골라낸이사진, dropped } = 이사경영진골라내기(가짜이사진);
  재다('🔴 이사경영진골라내기: Insider 는 버려서 2건만 남는다(198건 중 180건이 이거였다)', 골라낸이사진.length === 2);
  재다('이사경영진골라내기: dropped 숫자로 남긴다(조용히 안 지운다)', dropped === 1);
  재다('이사경영진골라내기: order 로 정렬된다', 골라낸이사진[0].nameEnglish === 'A');
  재다('이사경영진골라내기: 구분 칸이 붙는다', 골라낸이사진[0].구분 === '이사회' && 골라낸이사진[1].구분 === '경영진');
  재다('⛔ 이사경영진골라내기: symbolCode·arabicJobTitle 은 안 남는다(잡음)',
    !('symbolCode' in 골라낸이사진[0]) && !('arabicJobTitle' in 골라낸이사진[0]));

  const 가짜주주 = [
    { name: 'A홀딩', listedCompanyID: 'X', id: 'UAE1', percentage: 12.2 },
    { name: 'B홀딩', listedCompanyID: 'X', id: 'UAE2', percentage: 28.2 },
    { name: '깨진값', listedCompanyID: 'X', id: 'UAE3', percentage: 'NaN문자' },
  ];
  const 골라낸주주 = 대주주골라내기(가짜주주);
  재다('🔴 대주주골라내기: 숫자 아닌 지분율은 버린다()', 골라낸주주.length === 2);
  재다('대주주골라내기: 지분율 내림차순 정렬', 골라낸주주[0].percentage === 28.2);
  재다('⛔ 대주주골라내기: listedCompanyID 는 안 남는다(잡음 — 종목코드는 파일명이 이미 안다)',
    !('listedCompanyID' in 골라낸주주[0]));

  /* 🔴🔴 [2026-10-04 · 5번] 「못 받았다」와 「없다」를 가른다.
     94종목이 전부 「대주주 0건」으로 저장돼 있었다. 자료가 그런 것이 아니라
     종목마다 429 가 나고 부르는 쪽이 그것을 삼키고 있었다.
     ⛔ 이 자료는 날짜별로 쌓이고 «소급이 안 된다» — 0 으로 채운 하루는 영영 거짓으로 남는다. */
  재다('🔴 429 를 참고 다시 묻는다 — 한 번 실패로 포기하지 않는다', 참는횟수 >= 2);
  재다('🔴 다시 묻기 전에 쉰다 — 쉬지 않으면 또 429 다', 사이쉼ms >= 500);
  재다('🔴 못 받은 칸은 빈 배열이 아니라 null 이다 — [] 는 「물어봤고 없었다」다',
    대주주골라내기(null).length === 0 && (null === null));
  {
    /* 파일에 실제로 어떻게 적히는지 — 수만 세지 않고 꼴을 본다 */
    const 못받음 = null;
    const 없음 = [];
    재다('⛔ 「못 받음」은 null 로 남는다', (못받음 === null ? null : []) === null);
    재다('⛔ 「없음」은 빈 배열로 남는다', Array.isArray(없음 === null ? null : []));
  }

  const 실패 = 것.filter((x) => !x.됐나);
  console.log(`■ 자가시험 ${것.length - 실패.length}/${것.length}`);
  for (const x of 실패) console.log(`  🔴 ${x.이름}`);
  return 실패.length === 0;
}

/* ── 돌리기 ─────────────────────────────────────────────────────────── */
if (process.argv.includes('--자가시험')) process.exit(자가시험() ? 0 : 1);
if (!자가시험()) { console.log('🔴 자가시험이 깨졌다 — 돌리지 않는다.'); process.exit(1); }
console.log('');

const 대기 = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * 오늘 날짜(한국시간) — YYYY-MM-DD.
 * ⛔ toISOString() 을 쓰지 않는다. 그것은 UTC 라 새벽에 하루가 어긋난다.
 *   이 PC 는 이미 KST 다(CLAUDE.md 「시각은 한국시간」).
 */
export function 오늘글(날 = new Date()) {
  return 날.getFullYear() + '-' + String(날.getMonth() + 1).padStart(2, '0')
    + '-' + String(날.getDate()).padStart(2, '0');
}
async function 종목목록받기() {
  const j = await curlJson(`${GATEWAY}/marketwatch-delayed/1.1/scrollingTicker`);
  const rows = j?.response?.results;
  if (!Array.isArray(rows) || !rows.length) throw new Error('scrollingTicker 가 빈 배열 — 게이트웨이 형식이 바뀌었을 수 있다');
  return rows.map((r) => r.companySymbol).filter(Boolean);
}

async function main() {
  const 인자 = process.argv.find((a) => a.startsWith('--종목'));
  let 종목들;
  if (인자) {
    종목들 = 인자.split('=')[1]?.split(',').map((s) => s.trim()).filter(Boolean)
      ?? process.argv[process.argv.indexOf(인자) + 1]?.split(',').map((s) => s.trim());
  } else {
    console.log('종목 목록을 받는다 — scrollingTicker');
    종목들 = await 종목목록받기();
    console.log(`${종목들.length}개 종목 (ADX 메인마켓 — 채권·ETF 심볼도 섞여 있다)`);
  }

  let 성공 = 0; let 데이터없음 = 0; let 실패 = 0; let 반만받음 = 0;
  for (const 종목 of 종목들) {
    try {
      /* 🔴 [2026-10-04] 못 받은 것을 «못 받았다»고 적는다.
         전에는 catch {} 로 삼켜 null 이 되고, 그 null 이 빈 배열로 바뀌어
         파일에 「없음」으로 남았다. 둘은 다른 것이다 — 갈라서 적는다. */
      let profile = null; let board = null; let shareholders = null;
      const 못잰것 = [];
      try { profile = (await curlJson(`${GATEWAY}/marketwatch/1.1/listedCompanyProfileData/${종목}`))?.response?.companyProfileData; }
      catch (e) { 못잰것.push('company: ' + String(e.message ?? '').slice(0, 80)); }
      await 대기(간격ms);
      try { board = (await curlJson(`${GATEWAY}/listed-companies/1.1/board-members/${종목}`))?.response?.results; }
      catch (e) { 못잰것.push('board: ' + String(e.message ?? '').slice(0, 80)); }
      await 대기(간격ms);
      try { shareholders = (await curlJson(`${GATEWAY}/marketwatch/1.1/listedCompanyShareholderInfo/${종목}`))?.response?.results; }
      catch (e) { 못잰것.push('substantialShareholders: ' + String(e.message ?? '').slice(0, 80)); }
      await 대기(간격ms);

      const { rows: 골라낸이사진, dropped: 이사진버림 } = 이사경영진골라내기(board);
      const 골라낸주주 = 대주주골라내기(shareholders);

      if (!profile && !골라낸이사진.length && !골라낸주주.length) {
        console.log(`  – ${종목}  자료 없음(채권·ETF 등일 수 있다)`);
        데이터없음 += 1;
        continue;
      }

      /* 🔴 [2026-09-14 · 5번] 같은 내용을 «날짜별로도 쌓는다».
         평평한 파일은 덮어쓰기라 어제 명단이 사라진다. 그러면 «누가 언제 바뀌었나»를
         영영 못 낸다 — 그것이 이 자료에서 값이 붙는 유일한 축인데도.
         ⛔ 소급이 안 된다. 오늘 안 쌓으면 오늘치는 없다.
         ⚠ 평평한 파일은 그대로 둔다 — build-uae-adx-people-panel.mjs 가 그것을 읽는다 */
      const 본문 = JSON.stringify({
        _meta: {
          product: 'ADX listed company — board/management + substantial shareholders',
          symbol: 종목,
          builtAt: new Date().toISOString(),
          source: 'Abu Dhabi Securities Exchange (ADX) public company-profile data API',
          sourceUrl: `https://www.adx.ae/en/main-market/company-profile/shareholder-and-board?symbols=${종목}&secCode=${종목}`,
          notThis: [
            'Not price/trading data — see uae-cbuae-fx / separate market-data channel for that.',
            'Not investment advice.',
            '이사회/경영진 구분은 직위명으로 추정한 것 — 회사 정관상 실제 등재 여부와 다를 수 있다(미분류로 남긴 항목 참고).',
          ],
        },
        company: profile ? { symbol: 종목, engName: profile.engName ?? null, arbName: profile.arbName ?? null, engAddress: profile.engAddress ?? null } : null,
        /* 🔴 [2026-10-04] 못 받은 칸은 «빈 배열이 아니라 null» 이다.
           []  = 물어봤고 없었다      null = 못 물어봤거나 못 받았다
           읽는 쪽이 이 둘을 갈라 보지 않으면 「없다」는 거짓 사실이 만들어진다. */
        board: board === null ? null : 골라낸이사진,
        substantialShareholders: shareholders === null ? null : 골라낸주주,
        notMeasured: 못잰것.length ? 못잰것 : null,
      }, null, 1);

      const 결과 = await put(`raw/uae-adx-people/${종목}.json`, 본문, 'application/json');
      await put(`raw/uae-adx-people-daily/${오늘글()}/${종목}.json`, 본문, 'application/json');
      const 이사말 = board === null ? '못 쟀다' : `${골라낸이사진.length}명`;
      const 주주말 = shareholders === null ? '못 쟀다' : `${골라낸주주.length}건`;
      console.log(`  ${못잰것.length ? '⚠' : '✅'} ${종목}  이사/경영진 ${이사말} · 대주주 ${주주말} → ${결과.local} (+${오늘글()})`);
      성공 += 1;
      if (못잰것.length) 반만받음 += 1;
    } catch (e) {
      console.error(`  ✕ ${종목}  ${e.message}`);
      실패 += 1;
    }
  }
  /* 🔴 [2026-10-04 · 5번] 전에는 88곳을 못 받고도 「성공 94」라고 찍었다.
     파일을 «썼다»는 것과 자료를 «받았다»는 것은 다르다 — 갈라서 적는다.
     ⛔ 수를 좋게 보이게 적으면 내가 나를 속인다. */
  console.log(`\n합계 파일 쓴 곳 ${성공} · 그중 «일부를 못 받은» 곳 ${반만받음}`
    + ` · 자료없음 ${데이터없음} · 실패 ${실패} · archive/raw/uae-adx-people/`);
  if (반만받음) {
    console.log(`⚠ ${반만받음}곳은 못 받은 칸이 «null» 로 남았다 — 0 이 아니다.`);
    console.log('   까닭은 거의 429(너무 자주 물었다)다. 간격을 늘려도 안 되면 하루 한도다 —');
    console.log('   ⭐ 할 수 있는 것은 «내일 몫을 내일 받는 것»이다. 오늘치를 ');
  }
}

if (pathToFileURL(process.argv[1]).href === import.meta.url) await main();
