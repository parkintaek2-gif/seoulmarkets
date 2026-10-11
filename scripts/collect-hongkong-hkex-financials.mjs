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
 * collect-hongkong-hkex-financials.mjs — 홍콩 상장사 **연차·반기 보고서**를 집는다.
 * `collect-hongkong-hkex-disclosures.mjs`(공시/중대사건)와 같은 우물 —
 * www1.hkexnews.hk/search/titleSearchServlet.do 를 title 키워드로 온 시장에 돌리고
 * collect-openfigi-listings.mjs 로 확보한 홍콩 2,841개 종목표로 「우리 것만」 남긴다.
 *
 * 🔴 5번 지시(2026-09-27) 「① 공시에서 길이 뚫리면 같은 우물에서 연차·반기 보고서를 집는다」
 *
 * 쓰는 법
 *   node scripts/collect-hongkong-hkex-financials.mjs --자가시험
 *   node scripts/collect-hongkong-hkex-financials.mjs [--일수 30]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 회사표길 = path.join(뿌리, 'archive/raw/hongkong-openfigi-companies');
const 낼폴더 = path.join(뿌리, 'archive/raw/hongkong-hkex-financials');
const 쉼 = (ms) => new Promise((r) => setTimeout(r, ms));

/** 재무 보고서 갈래 — 연차·반기가 핵심, 실적경고는 disclosures 쪽과 겹치므로 여기선 뺀다 */
export const 보고서구절 = [
  { 구절: 'annual report', 이름: '연차보고서' },
  { 구절: 'interim report', 이름: '반기보고서' },
  { 구절: 'quarterly results', 이름: '분기실적' },
];

export function 날짜창(일수 = 30, 오늘 = new Date()) {
  const 두 = (n) => String(n).padStart(2, '0');
  const 꼴 = (d) => `${d.getFullYear()}${두(d.getMonth() + 1)}${두(d.getDate())}`;
  const 시작 = new Date(오늘.getTime() - 일수 * 864e5);
  return { fromDate: 꼴(시작), toDate: 꼴(오늘) };
}

export function 종목코드들(원문) {
  return String(원문 ?? '').split(/<br ?\/?>/i).map((s) => s.replace(/^0+/, '') || '0').filter(Boolean);
}

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

export function 다듬기(행, 구절정보, 종목표) {
  const 종목들 = 종목코드들(행.STOCK_CODE).filter((c) => 종목표.has(c));
  if (!종목들.length) return null;
  return {
    종목: 종목들.map((c) => ({ 티커: c, 이름: 종목표.get(c) })),
    제목: 행.TITLE, 분류: 행.SHORT_TEXT?.replace(/<br\s*\/?>/gi, ' ') ?? '',
    갈래: 구절정보.이름, 때: 행.DATE_TIME,
    파일: 행.FILE_LINK ? `https://www1.hkexnews.hk${행.FILE_LINK}` : null,
    크기: 행.FILE_INFO ?? null,
  };
}

/* ─────────────────────────────── 자가시험 ─────────────────────────────── */
export function 자가시험() {
  const 결과 = [];
  const 본다 = (이름, 됐나, 덧말 = '') => 결과.push({ 이름, 됐나: !!됐나, 덧말 });

  본다('보고서구절 3갈래(연차·반기·분기)', 보고서구절.length === 3);
  본다('연차보고서 구절이 있다', 보고서구절.some((x) => x.구절 === 'annual report'));
  본다('반기보고서 구절이 있다', 보고서구절.some((x) => x.구절 === 'interim report'));

  const 창 = 날짜창(30, new Date(2026, 8, 28));
  본다('날짜창 — toDate가 오늘', 창.toDate === '20260928');
  본다('날짜창 — fromDate가 30일 전', 창.fromDate === '20260829');

  본다('종목코드들 — 단일', 종목코드들('00700')[0] === '700');
  본다('종목코드들 — <br/> 로 이어진 여러 종목을 다 가른다', 종목코드들('03002<br/>03425').length === 2);

  const 가짜표 = new Map([['700', 'TENCENT']]);
  const 가짜행 = {
    STOCK_CODE: '00700', TITLE: 'Annual Report 2026',
    SHORT_TEXT: 'Financial Statements/ESG - [Annual Report]<br/>', DATE_TIME: '25/09/2026 21:24',
    FILE_LINK: '/listedco/x.pdf', FILE_INFO: '4MB',
  };
  const 다듬은것 = 다듬기(가짜행, 보고서구절[0], 가짜표);
  본다('다듬기 — 우리 종목표에 있으면 살아남는다', 다듬은것 && 다듬은것.종목[0].이름 === 'TENCENT');
  본다('다듬기 — 갈래·크기가 붙는다', 다듬은것.갈래 === '연차보고서' && 다듬은것.크기 === '4MB');
  본다('⛔ 다듬기 — 우리 종목표에 없으면 null',
    다듬기({ ...가짜행, STOCK_CODE: '99999' }, 보고서구절[0], 가짜표) === null);
  본다('홍콩종목표읽기 — 폴더 없으면 빈 맵(죽지 않는다)',
    홍콩종목표읽기(path.join(뿌리, '없는폴더_자가시험')) instanceof Map);

  return 결과;
}

/* ─────────────────────────────── 본 일 ─────────────────────────────── */
async function 모은다(일수 = 30) {
  const 종목표 = 홍콩종목표읽기();
  console.log(`■ 우리 홍콩 종목표 ${종목표.size}개 종목으로 좁힌다`);
  const 창 = 날짜창(일수);
  const 다모은것 = [];
  let 못문것 = [];

  for (const 구절정보 of 보고서구절) {
    const 행들 = await 검색한번(구절정보.구절, 창);
    if (행들 === undefined) { 못문것.push(구절정보.구절); console.log(`   🔴 못 물었다 — "${구절정보.구절}"`); continue; }
    let 남은것 = 0;
    for (const 행 of 행들) {
      const 다듬은것 = 다듬기(행, 구절정보, 종목표);
      if (다듬은것) { 다모은것.push(다듬은것); 남은것++; }
    }
    console.log(`   "${구절정보.구절}" — ${행들.length}건 중 우리 종목 ${남은것}건 (전체 ${행들.length >= 100 ? '100+ 있음, rowRange 한도' : 행들.length}건)`);
    await 쉼(600);
  }

  fs.mkdirSync(낼폴더, { recursive: true });
  const 낼이름 = `${창.fromDate}-${창.toDate}.json`;
  const 낼것 = {
    _메모: {
      우물: 'www1.hkexnews.hk/search/titleSearchServlet.do (title 키워드 검색, stockId 못 씀)',
      창, 못문구절: 못문것,
      한도: 'rowRange=100 — 그 갈래에 100건 넘게 있으면 더 있을 수 있다(페이지 넘기기 미구현)',
    },
    건수: 다모은것.length,
    보고서: 다모은것.sort((a, b) => b.때.localeCompare(a.때)),
  };
  fs.writeFileSync(path.join(낼폴더, 낼이름), JSON.stringify(낼것, null, 2), 'utf8');
  console.log(`\n✅ ${다모은것.length}건 — archive/raw/hongkong-hkex-financials/${낼이름}`);
  return 낼것;
}

const 이파일이진입점 = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (이파일이진입점) {
  if (process.argv.includes('--자가시험')) {
    const 결과 = 자가시험();
    let 빨강 = 0;
    console.log('■ 홍콩 재무보고서 자 — 자가시험');
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
