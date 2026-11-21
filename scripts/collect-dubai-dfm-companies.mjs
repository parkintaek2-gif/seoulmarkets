#!/usr/bin/env node
/**
 * collect-dubai-dfm-companies.mjs — **DFM(두바이금융시장) 확장 1호.** 상장사 «회사 팩트»
 * (재무제표 축) — ISIN·업종·설립일·감사인·회계연도·수권자본·발행주식 + 재무제표 제출이력
 * (PDF 목록, 아직 수치는 못 뽑는다). 사람(이사회) 축이 아니라 사장님 지침(CLAUDE.md
 * 「주력과 서비스」)대로 **재무·공시를 먼저** 다룬다.
 *
 *   node scripts/collect-dubai-dfm-companies.mjs --자가시험
 *   node scripts/collect-dubai-dfm-companies.mjs                전 종목 새로 받는다(멱등)
 *   node scripts/collect-dubai-dfm-companies.mjs --종목 EMAAR,DIB   특정 종목만
 *
 * ── 🔴 [2026-09-14] 정정 — DFM 은 「0개사」가 아니었다 ──────────────────────────
 * 어제 메모에 「두바이는 회사 목록조차 없다」로 적혀 있었다. 직접 dfm.ae 회사 지면을
 * 열어 보니 정상적으로 뜨고, 뒤에서 부르는 API 도 그대로 curl 이 된다(docs/세션간-메모.md
 * 2026-09-14 09:18 정정 참고). **인증·API키·특수헤더 없이도 된다** — ADX 보다도 열려 있다.
 *
 * ── 실측한 API (api2.dfm.ae, POST, Command= 파라미터로 기능을 나눈다) ─────────────
 *   Command=LiteSecuritiesLists&securitytype=equities   상장 «131개사» 전체 목록
 *   Command=companyprofile&symbol=<종목>                 ISIN·업종·설립일·감사인 등 회사 팩트
 *
 * ⚠ 「FINANCIAL REPORTS」탭은 있지만 **수치(자산·자본·매출)가 아니라 PDF 목록**만 준다
 *   (예: "Financial statements for the 2nd QTR of 2026 · 1 File(s)"). 「GetFinancials」
 *   류 명령을 여럿 시도했으나 전부 빈 응답이었다 — **구조화된 재무제표 수치는 아직 못 쟀다.**
 *   ⛔ 이 수집기는 회사 팩트 + 제출이력(날짜·기간·PDF 링크)까지다. 수치 추출(PDF 파싱)은
 *   다음 단계다 — 「못 했다」가 아니라 「아직 여기까지만 됐다」로 남긴다.
 * ⚠ ADX 와 달리 Cloudflare/특수헤더 벽이 «없다» — node fetch 로도 curl 로도 다 200 이다.
 *
 * 저장: archive/raw/dubai-dfm-companies/<종목>.json (종목마다 한 파일, 멱등)
 */
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { put } from '../src/lib/store.mjs';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const WIDGET_URL = 'https://api2.dfm.ae/web/widgets/v1/data';

async function widget(command, extra = {}) {
  const body = new URLSearchParams({ Command: command, Language: 'en', lang: 'en', ...extra });
  const r = await fetch(WIDGET_URL, {
    method: 'POST',
    headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  return r.json();
}

/** companyprofile 원본 → 중요한 칸만(잡음: 색상 클래스·로고 경로 등 화면용 칸은 뺀다). */
export function 회사팩트골라내기(raw) {
  if (!raw || typeof raw !== 'object') return null;
  return {
    symbol: raw.Symbol ?? null,
    fullName: raw.FullName ?? null,
    isin: raw.ISIN ?? null,
    sector: raw.Sector ?? null,
    instrumentType: raw.InstrumentTypeCaption ?? null,
    establishedDate: raw.EstablishedDate ?? null,
    dateOfListing: raw.DateOfListing ?? null,
    auditor: raw.Auditor ?? null,
    fiscalYearEnd: raw.FiscalYearEnd ?? null,
    registrar: raw.Registrar ?? null,
    authorizedCapital: raw.AuthorizedCapital ?? null,
    issuedShares: Number.isFinite(raw.IssuedShares) ? raw.IssuedShares : null,
    perShareValue: raw.PerShareValue ?? null,
    marketCap: raw.MarketCap ?? null,
  };
}

/**
 * 회사 지면의 「FINANCIAL REPORTS」탭 — 지금은 PDF 목록만 온다(수치 아님).
 * 🔴 [2026-09-14 실측] efsah 는 `labels=` 로 걸러 주지 않는다 — 전부 announcement_type
 *   "Disclosure" 로 한 통에 온다. 「Financial statements for …」로 시작하는 제목만
 *   골라야 재무제표 제출이다(그 밖엔 Press Release·Earnings Call 등이 섞여 있다).
 * ⛔  — 못 뽑은 수치는 그냥 없는 채로 둔다.
 */
export function 재무제출이력골라내기(rows) {
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((r) => /^financial statements? for/i.test(String(r.headline ?? r.Headline ?? '').trim()))
    .map((r) => ({
      date: r.publication_date ?? r.PublicationDate ?? null,
      headline: r.headline ?? r.Headline ?? null,
      period: r.report_interval ?? r.integrated_period ?? null,
      pdfPath: r.resources?.[0]?.r_path ?? null,
    }));
}

/* ── 자가시험 ───────────────────────────────────────────────────────── */
function 자가시험() {
  const 것 = []; const 재다 = (이름, 됐나) => 것.push({ 이름, 됐나 });

  const 가짜 = {
    Symbol: 'EMAAR', FullName: 'Emaar Properties PJSC', ISIN: 'AEE000301011',
    Sector: 'Real Estate', InstrumentTypeCaption: 'Equities', EstablishedDate: 'Jun 23, 1997',
    DateOfListing: '2000-03-25', Auditor: 'Ernst & Young Middle East', FiscalYearEnd: 'DECEMBER',
    Registrar: 'Union National Bank', AuthorizedCapital: '8,838,789,849 AED',
    IssuedShares: 8838789849, PerShareValue: '1.00 AED', MarketCap: '96,342,809,354',
    LogoUrl: '/images/x.jpg', ArrowClass: 'down', CurrentTrendClass: 'decrease',
  };
  const 골라낸것 = 회사팩트골라내기(가짜);
  재다('회사팩트골라내기: ISIN·업종·감사인 등이 남는다',
    골라낸것.isin === 'AEE000301011' && 골라낸것.auditor === 'Ernst & Young Middle East' && 골라낸것.sector === 'Real Estate');
  재다('⛔ 회사팩트골라내기: 화면용 잡음(LogoUrl·ArrowClass)은 안 남는다',
    !('LogoUrl' in 골라낸것) && !('ArrowClass' in 골라낸것));
  재다('회사팩트골라내기: 빈 값은 null', 회사팩트골라내기(null) === null);

  const 가짜제출 = [
    { publication_date: 'Aug 07, 2026', headline: 'Financial statements for the 2nd QTR of 2026', report_interval: 'Q2', resources: [{ r_path: '/x.pdf' }] },
    { publication_date: 'Aug 05, 2026', headline: 'Earnings Call', resources: [] },
    { publication_date: 'Aug 07, 2026', headline: 'Press Release regarding financial results', resources: [] },
    { publication_date: '', headline: '', resources: [] },
  ];
  const 골라낸제출 = 재무제출이력골라내기(가짜제출);
  재다('🔴 재무제출이력골라내기: 「Financial statements for」만 남긴다(Earnings Call·Press Release는 아니다)',
    골라낸제출.length === 1);
  재다('재무제출이력골라내기: pdf 경로가 남는다', 골라낸제출[0].pdfPath === '/x.pdf');

  const 실패 = 것.filter((x) => !x.됐나);
  console.log(`■ 자가시험 ${것.length - 실패.length}/${것.length}`);
  for (const x of 실패) console.log(`  🔴 ${x.이름}`);
  return 실패.length === 0;
}

if (process.argv.includes('--자가시험')) process.exit(자가시험() ? 0 : 1);
if (!자가시험()) { console.log('🔴 자가시험이 깨졌다 — 돌리지 않는다.'); process.exit(1); }
console.log('');

const 대기 = (ms) => new Promise((r) => setTimeout(r, ms));

async function 종목목록받기() {
  const rows = await widget('LiteSecuritiesLists', { securitytype: 'equities' });
  if (!Array.isArray(rows) || !rows.length) throw new Error('LiteSecuritiesLists 가 빈 배열 — API 형식이 바뀌었을 수 있다');
  return rows.map((r) => r.SecuritySymbol).filter(Boolean);
}

async function main() {
  const 인자i = process.argv.indexOf('--종목');
  let 종목들;
  if (인자i !== -1) {
    종목들 = (process.argv[인자i + 1] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  } else {
    console.log('종목 목록을 받는다 — LiteSecuritiesLists');
    종목들 = await 종목목록받기();
    console.log(`${종목들.length}개 종목 (DFM 상장 전체)`);
  }

  let 성공 = 0; let 실패 = 0;
  /*
   * 🔴 [2026-09-14 · 항목1 — 5번 지침] "없어서 빈 것"과 "못 받아서 빈 것"을 구분한다.
   * 예전엔 efsah 가 실패하든(네트워크 오류) 진짜로 제출 이력이 없든 똑같이 «빈 배열»
   * 이었다 — 손님이 구분을 못 했다. 이제 실패 사유를 남기고, 전체 실행 요약을
   * _coverage.json 에 적는다(강령 ③ "못 잰 것은 못 쟀다고 적는다").
   */
  const 커버리지 = { attempted: 0, withData: 0, empty: 0, emptyReason: {} };
  for (const 종목 of 종목들) {
    커버리지.attempted += 1;
    try {
      const profile = await widget('companyprofile', { symbol: 종목 });
      const 팩트 = 회사팩트골라내기(profile);
      await 대기(150);

      let 제출이력 = [];
      let efsah상태 = 'ok';
      try {
        const r = await fetch(
          `https://api2.dfm.ae/efsah/v1/prototype_efsah?lang=en&h7_datetime_format=MMM+dd%2C+yyyy+HH%3Amm%3Ass&take=40&skip=0&symbol=${encodeURIComponent(종목)}&cms_resources=true`,
          { headers: { 'User-Agent': UA } },
        );
        const 글자 = (await r.text()).replace(/^﻿/, ''); // efsah 가 BOM 을 앞에 붙여 온다
        const j = JSON.parse(글자);
        제출이력 = 재무제출이력골라내기(j.root);
      } catch (e) {
        efsah상태 = `fetch-failed: ${e.message}`; // 진짜 실패 — 「없다」가 아니라 「못 받았다」
      }
      await 대기(150);

      if (!팩트) {
        console.log(`  – ${종목}  회사 팩트 없음(상장폐지·상품군 다를 수 있다)`);
        커버리지.empty += 1;
        커버리지.emptyReason['company-profile-not-found'] = (커버리지.emptyReason['company-profile-not-found'] ?? 0) + 1;
        continue;
      }

      const 이유 = 제출이력.length
        ? null
        : (efsah상태 === 'ok' ? 'no-financial-statement-filings-in-feed' : efsah상태);
      if (제출이력.length) 커버리지.withData += 1;
      else {
        커버리지.empty += 1;
        커버리지.emptyReason[이유] = (커버리지.emptyReason[이유] ?? 0) + 1;
      }

      const 결과 = await put(`raw/dubai-dfm-companies/${종목}.json`, JSON.stringify({
        _meta: {
          product: 'DFM listed company facts — profile + financial-statement filing list (not parsed figures yet)',
          symbol: 종목,
          builtAt: new Date().toISOString(),
          source: 'Dubai Financial Market (DFM) public widget API (api2.dfm.ae) — no login, no key',
          sourceUrl: `https://www.dfm.ae/en/the-exchange/market-information/company/${종목}`,
          coverage: { attempted: true, withData: 제출이력.length > 0, empty: 제출이력.length === 0, emptyReason: 이유 },
          notThis: [
            'Financial statement figures (assets/equity/revenue) are not yet extracted — only filing dates/PDF links.',
            'Not price/trading data.',
            'Not investment advice.',
          ],
        },
        company: 팩트,
        financialStatementFilings: 제출이력,
      }, null, 1), 'application/json');
      console.log(`  ✅ ${종목}  ${팩트.fullName ?? ''} · 제출이력 ${제출이력.length}건 → ${결과.local}`);
      성공 += 1;
    } catch (e) {
      console.error(`  ✕ ${종목}  ${e.message}`);
      실패 += 1;
      커버리지.empty += 1;
      커버리지.emptyReason[`fetch-failed: ${e.message}`] = (커버리지.emptyReason[`fetch-failed: ${e.message}`] ?? 0) + 1;
    }
  }
  await put('raw/dubai-dfm-companies/_coverage.json', JSON.stringify({
    _meta: { product: 'DFM companies collector run coverage — attempted/withData/empty + why', builtAt: new Date().toISOString() },
    ...커버리지,
  }, null, 1), 'application/json');
  console.log(`\n합계 성공 ${성공} · 실패 ${실패} · 커버리지: 시도 ${커버리지.attempted} · 데이터있음 ${커버리지.withData} · 빔 ${커버리지.empty} · archive/raw/dubai-dfm-companies/`);
}

if (pathToFileURL(process.argv[1]).href === import.meta.url) await main();
