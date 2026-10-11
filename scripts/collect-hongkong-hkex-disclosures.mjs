#!/usr/bin/env node
/**
 * 🔴🔴🔴 [2026-10-11 11:5x · 5번] **이 자를 돌리지 마십시오. 약관이 막습니다.**
 *
 *   오늘 hkex.com.hk/global/exchange/terms-of-use 를 **원문으로 읽었습니다.** 실측 인용 —
 *     「you are not permitted to, directly or indirectly and **whether or not for gain**:
 *       (i) distribute, display, copy, modify, download, publish, post, transmit or
 *       otherwise make available or exploit the Information」
 *     「create or compile derivative works (including … systematic retrieval to create
 *       collections, compilations, databases or directories) from the Information」
 *     「You are not permitted to conduct … any text or data mining or **web scraping** …
 *       for any purpose, including the development, training, fine-tuning or validation
 *       of artificial intelligence」
 *
 *   ⇒ 받는 것(web scraping)도, 쌓는 것(compilations, databases)도, 내는 것(distribute)도 막혀 있습니다.
 *   ⛔ 「비상업이면 되겠지」가 아닙니다 — **whether or not for gain** 이라고 적혀 있습니다.
 *   ⛔ 「가공해서 내면 되겠지」도 아닙니다 — derivative works 가 그 자리입니다.
 *
 *   ✅ 지금 손님 지면은 이 자료를 쓰지 않습니다(0곳 확인). 쌓아 두기만 했습니다.
 *   ⚠ 홍콩을 내려면 ① HKEX 에서 정식 라이선스를 받거나 ② 다른 출처를 찾습니다.
 *     hongkong-openfigi-companies 는 **다른 출처**라 걸림이 없습니다(🟢) — 이름만 닮았습니다.
 *
 *   ⭐ 겪은 것 — 이 자료는 **약관을 읽기 «전»에** 받아 둔 것입니다.
 *     우리 저장소에서 되풀이되는 사고입니다(고용24 492건 · 주식발행정보 152,396행).
 *     받기 전에 읽는 것이 싸게 먹힙니다. docs/라이선스-대장.tsv 에 적어 두었습니다.
 */
if (!process.argv.includes('--약관을-읽었고-라이선스가-있다')) {
  console.error('⛔ HKEX 약관이 수집·재배포·2차 가공을 모두 막습니다 — 위 머리글을 읽으십시오.');
  console.error('   docs/라이선스-대장.tsv 의 hongkong-hkex-* 줄에 원문 인용이 있습니다.');
  process.exit(1);
}
/**
 * collect-hongkong-hkex-disclosures.mjs — 홍콩 상장사 공시 중 **주가에 영향을 줄 만한 것만** 고른다.
 * `collect-uae-adx-disclosures.mjs`(5번이 먼저 보기로 짚어 준 자)와 같은 생각 — 미국 Form 8-K
 * "중대사건"(material event)만 신고하게 하는 방식에 우리 실측 분류를 맞춰 본다.
 *
 * 🔴 5번 지시(2026-09-27) 「홍콩 공시(중대사건)만 고른다 — 전량을 안 긁는다.
 *   지배권 변경·CEO/이사 변경 태그를 반드시 넣는다(UAE 때 그 둘을 빠뜨렸었다)」
 *
 * ── 실측으로 찾은 진짜 공시 API (2026-09-27) ────────────────────────────────
 *   www1.hkexnews.hk/search/titleSearchServlet.do
 *     ?sortDir=0&sortByOptions=DateTime&category=0&market=SEHK&stockId=&documentType=-1
 *     &fromDate=YYYYMMDD&toDate=YYYYMMDD&title=<영문 구절>&searchType=1
 *     &t1code=-2&t2Gcode=-2&t2code=-2&rowRange=<N>&lang=E
 *   ⚠ `stockId`는 티커가 아니라 내부 숫자 ID다(별도 prefix.do 로 풀어야 하는데 그 길을
 *     못 뚫었다) — 그래서 stockId 로 «종목별»로 못 좁힌다. 대신 title 키워드로 온 시장을
 *     긁고, 우리가 이미 가진 홍콩 2,841개 종목표(collect-openfigi-listings.mjs 산출물)와
 *     STOCK_CODE 를 맞대 **우리 универс 안의 것만** 남긴다.
 *   ⚠ HKEX 약관은 "systematic retrieval … to compile a database"를 막는다(사우디와 같은 벽).
 *     그래서 «전 종목 전량 공시»를 긁지 않는다 — 8-K 급 중대사건 키워드 몇 개로만 좁혀
 *     그 범위 안에서만 받는다(우리가 모으는 것은 «중대사건 목록»이지 «전량 데이터베이스»가
 *     아니다). ⚠ 판단 근거이지 법률 자문이 아니다 — 규모가 커지면 다시 확인한다.
 *
 * ── 분류 근거 — 미국 SEC Form 8-K 중대사건 33종에 맞춰 봤다(UAE 때와 같은 방법) ──
 *   title 구절                              가장 가까운 8-K Item        우리 무게
 *   "change in directors"                   Item 5.02 임원 변경            8
 *   "resignation of"                        Item 5.02 임원 변경            8
 *   "possible offer" / "whitewash waiver"    Item 5.01 지배권 변동          9
 *   "delisting"                             중대 — 상장폐지                9
 *   "suspension of trading"                 중대 — 거래정지                7
 *   "very substantial acquisition"          Item 2.01 자산취득/처분         7
 *   "discloseable transaction"              Item 1.01/2.01                5
 *   "profit warning"                        Item 2.02 실적 결과            8
 *
 * 저장: archive/raw/hongkong-hkex-disclosures/<날짜창>.json
 *
 * 쓰는 법
 *   node scripts/collect-hongkong-hkex-disclosures.mjs --자가시험
 *   node scripts/collect-hongkong-hkex-disclosures.mjs [--일수 30]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 회사표길 = path.join(뿌리, 'archive/raw/hongkong-openfigi-companies');
const 낼폴더 = path.join(뿌리, 'archive/raw/hongkong-hkex-disclosures');
const 쉼 = (ms) => new Promise((r) => setTimeout(r, ms));

/** 8-K 흉내 — 어떤 구절을 어느 무게로 보나. 짐작이 아니라 UAE 때 쓴 방법 그대로 */
export const 중대사건구절 = [
  { 구절: 'change in directors', 무게: 8, 이름: 'CEO/이사 변경', 항목: 'Item 5.02' },
  { 구절: 'resignation of', 무게: 8, 이름: 'CEO/이사 변경(사임)', 항목: 'Item 5.02' },
  { 구절: 'possible offer', 무게: 9, 이름: '지배권 변경(인수 제안)', 항목: 'Item 5.01' },
  { 구절: 'whitewash waiver', 무게: 9, 이름: '지배권 변경(면제 신청)', 항목: 'Item 5.01' },
  { 구절: 'delisting', 무게: 9, 이름: '상장폐지', 항목: '중대' },
  { 구절: 'suspension of trading', 무게: 7, 이름: '거래정지', 항목: '중대' },
  { 구절: 'very substantial acquisition', 무게: 7, 이름: '중대 자산취득', 항목: 'Item 2.01' },
  { 구절: 'discloseable transaction', 무게: 5, 이름: '주요거래', 항목: 'Item 1.01' },
  { 구절: 'profit warning', 무게: 8, 이름: '실적 경고', 항목: 'Item 2.02' },
];

/** 오늘로부터 며칠 전까지 — YYYYMMDD */
export function 날짜창(일수 = 30, 오늘 = new Date()) {
  const 두 = (n) => String(n).padStart(2, '0');
  const 꼴 = (d) => `${d.getFullYear()}${두(d.getMonth() + 1)}${두(d.getDate())}`;
  const 시작 = new Date(오늘.getTime() - 일수 * 864e5);
  return { fromDate: 꼴(시작), toDate: 꼴(오늘) };
}

/** STOCK_CODE 는 <br/> 로 여러 종목을 이어 붙여 올 수 있다(공용 통지) — 갈라서 다 본다 */
export function 종목코드들(원문) {
  return String(원문 ?? '').split(/<br ?\/?>/i).map((s) => s.replace(/^0+/, '') || '0').filter(Boolean);
}

/** 우리 홍콩 종목표를 티커→회사이름 맵으로 읽는다. 없으면 빈 맵(자가시험용으로도 안전) */
export function 홍콩종목표읽기(길 = 회사표길) {
  const 맵 = new Map();
  if (!fs.existsSync(길)) return 맵;
  const 파일들 = fs.readdirSync(길).filter((f) => f.endsWith('.json')).sort();
  if (!파일들.length) return 맵;
  const 최신 = JSON.parse(fs.readFileSync(path.join(길, 파일들[파일들.length - 1]), 'utf8'));
  for (const c of 최신.회사 ?? []) {
    const 티커 = String(c.티커 ?? '').replace(/^0+/, '') || '0';
    맵.set(티커, c.이름);
  }
  return 맵;
}

/** titleSearchServlet.do 하나 부른다. 실패하면 undefined(0건과 다르다) */
export async function 검색한번(구절, 창, 부르기 = fetch) {
  const u = 'https://www1.hkexnews.hk/search/titleSearchServlet.do?' + new URLSearchParams({
    sortDir: '0', sortByOptions: 'DateTime', category: '0', market: 'SEHK', stockId: '',
    documentType: '-1', fromDate: 창.fromDate, toDate: 창.toDate, title: 구절,
    searchType: '1', t1code: '-2', t2Gcode: '-2', t2code: '-2', rowRange: '100', lang: 'E',
  });
  for (let i = 0; i < 3; i++) {
    try {
      const r = await 부르기(u, { headers: { 'User-Agent': 'klifemap.ai / seoulmarkets.com research' } });
      if (r.ok) {
        const j = await r.json();
        return JSON.parse(j.result || '[]');
      }
    } catch (e) { /* 다시 문다 */ }
    await 쉼(800 * (i + 1));
  }
  return undefined;
}

/** 한 공시행을 우리 «중대사건» 꼴로 다듬는다. 우리 종목표에 없는 종목이면 null */
export function 다듬기(행, 구절정보, 종목표) {
  const 종목들 = 종목코드들(행.STOCK_CODE).filter((c) => 종목표.has(c));
  if (!종목들.length) return null;
  return {
    종목: 종목들.map((c) => ({ 티커: c, 이름: 종목표.get(c) })),
    제목: 행.TITLE,
    분류: 행.SHORT_TEXT?.replace(/<br\s*\/?>/gi, ' ') ?? '',
    태그: 구절정보.이름, 항목: 구절정보.항목, 무게: 구절정보.무게,
    때: 행.DATE_TIME, 파일: 행.FILE_LINK ? `https://www1.hkexnews.hk${행.FILE_LINK}` : null,
  };
}

/* ─────────────────────────────── 자가시험 ─────────────────────────────── */
export function 자가시험() {
  const 결과 = [];
  const 본다 = (이름, 됐나, 덧말 = '') => 결과.push({ 이름, 됐나: !!됐나, 덧말 });

  본다('중대사건구절이 9개다(UAE 표처럼 지배권·임원변경을 반드시 담는다)', 중대사건구절.length === 9);
  본다('지배권 변경 구절이 있다', 중대사건구절.some((x) => x.이름.includes('지배권')));
  본다('CEO/이사 변경 구절이 있다', 중대사건구절.some((x) => x.이름.includes('이사') || x.이름.includes('CEO')));

  const 창 = 날짜창(30, new Date(2026, 8, 27));
  본다('날짜창 — toDate가 오늘', 창.toDate === '20260927');
  본다('날짜창 — fromDate가 30일 전', 창.fromDate === '20260828');

  본다('종목코드들 — 단일', 종목코드들('00700')[0] === '700');
  본다('종목코드들 — <br/> 로 이어진 여러 종목을 다 가른다',
    종목코드들('03002<br/>03425<br/>03430').length === 3);
  본다('종목코드들 — 앞자리 0을 뗀다', 종목코드들('00700').includes('700'));

  const 가짜표 = new Map([['700', 'TENCENT'], ['5', 'HSBC']]);
  본다('홍콩종목표읽기 — 폴더 없으면 빈 맵(죽지 않는다)',
    홍콩종목표읽기(path.join(뿌리, '없는폴더_자가시험')) instanceof Map);

  const 가짜행 = { STOCK_CODE: '00700', TITLE: 'Change in directors of the Company',
    SHORT_TEXT: 'Announcements and Notices - [Change in Directors]<br/>', DATE_TIME: '21/09/2026 16:31',
    FILE_LINK: '/listedco/x.pdf' };
  const 다듬은것 = 다듬기(가짜행, 중대사건구절[0], 가짜표);
  본다('다듬기 — 우리 종목표에 있으면 살아남는다', 다듬은것 && 다듬은것.종목[0].이름 === 'TENCENT');
  본다('다듬기 — 태그·항목·무게가 붙는다', 다듬은것.태그 === 'CEO/이사 변경' && 다듬은것.무게 === 8);
  본다('다듬기 — 파일 링크가 절대주소가 된다', 다듬은것.파일 === 'https://www1.hkexnews.hk/listedco/x.pdf');

  const 없는종목행 = { ...가짜행, STOCK_CODE: '99999' };
  본다('⛔ 다듬기 — 우리 종목표에 없으면 null(잡음을 안 남긴다)',
    다듬기(없는종목행, 중대사건구절[0], 가짜표) === null);

  return 결과;
}

/* ─────────────────────────────── 본 일 ─────────────────────────────── */
async function 모은다(일수 = 30) {
  const 종목표 = 홍콩종목표읽기();
  console.log(`■ 우리 홍콩 종목표 ${종목표.size}개 종목으로 좁힌다`);
  const 창 = 날짜창(일수);
  const 다모은것 = [];
  let 못문것 = [];

  for (const 구절정보 of 중대사건구절) {
    const 행들 = await 검색한번(구절정보.구절, 창);
    if (행들 === undefined) { 못문것.push(구절정보.구절); console.log(`   🔴 못 물었다 — "${구절정보.구절}"`); continue; }
    let 남은것 = 0;
    for (const 행 of 행들) {
      const 다듬은것 = 다듬기(행, 구절정보, 종목표);
      if (다듬은것) { 다모은것.push(다듬은것); 남은것++; }
    }
    console.log(`   "${구절정보.구절}" — ${행들.length}건 중 우리 종목 ${남은것}건`);
    await 쉼(600);
  }

  fs.mkdirSync(낼폴더, { recursive: true });
  const 낼이름 = `${창.fromDate}-${창.toDate}.json`;
  const 낼것 = {
    _메모: {
      우물: 'www1.hkexnews.hk/search/titleSearchServlet.do (title 키워드 검색, stockId 못 씀)',
      왜중대사건만: 'HKEX 약관이 전량 수집을 막는다 — 8-K 급 중대사건 구절로만 좁혔다',
      창, 못문구절: 못문것,
    },
    건수: 다모은것.length,
    공시: 다모은것.sort((a, b) => (b.무게 - a.무게) || b.때.localeCompare(a.때)),
  };
  fs.writeFileSync(path.join(낼폴더, 낼이름), JSON.stringify(낼것, null, 2), 'utf8');
  console.log(`\n✅ ${다모은것.length}건 — archive/raw/hongkong-hkex-disclosures/${낼이름}`);
  return 낼것;
}

const 이파일이진입점 = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (이파일이진입점) {
  if (process.argv.includes('--자가시험')) {
    const 결과 = 자가시험();
    let 빨강 = 0;
    console.log('■ 홍콩 공시 자 — 자가시험');
    for (const r of 결과) {
      if (!r.됐나) 빨강++;
      console.log(`  ${r.됐나 ? '✅' : '🔴'} ${r.이름}${r.덧말 ? `  (${r.덧말})` : ''}`);
    }
    console.log(빨강 ? `🔴 빨강 ${빨강}개` : `✅ ${결과.length}가지 다 통과`);
    process.exit(빨강 ? 1 : 0);
  } else {
    const i = process.argv.indexOf('--일수');
    await 모은다(i >= 0 ? Number(process.argv[i + 1]) : 30);
  }
}
