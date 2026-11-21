#!/usr/bin/env node
/**
 * build-screener-data.mjs — 스크리너가 브라우저에서 쓸 «추린 자료»를 만든다.
 *   **우리가 여는 시장을 다 담는다 — 한국(KOSPI·KOSDAQ·KONEX) + UAE(ADX·DFM).**
 *
 * 사장님(2026-09-15): 「스크리너를 정교하게 만들어. 원하는 자료를 쉽게 고객들이 찾을 수 있게」
 * 사장님(2026-09-15): **「한국시장 뿐만 아니라 우리가 서비스하는 시장 관련 데이터도
 *                        스크리너로 볼 수 있게 하는 거지?」**
 *
 * ── 🔴 이 자가 «안 내는» 것 — 낼 수 없어서가 아니라 «틀릴 수 있어서» 안 낸다 ──
 * UAE 자료에는 단위가 어긋나는 자리가 있다. 2026-09-15 에 손으로 재서 알았다 —
 *
 *   손익계산서(매출·순이익·EPS)   «실제 AED» 다. EPS × 주식수 ≈ 순이익 으로 검산된다
 *                                (FAB 1.39 × 약 110억주 ≈ 153억 vs 신고 161억 ✅)
 *   대차대조표(자산·부채·자본)     **배수를 모른다.** unit_hint 가 「AED'000」인 줄도 있고
 *                                비어 있는 줄도 있는데, 수집기가 곱하지 않고 날것으로 담았다
 *
 * ⇒ 그래서 이렇게 가른다.
 *   ✅ 부채비율 = 부채 ÷ 자본   «같은 표» 안의 두 수라 배수가 약분된다. 안전하다
 *   ✅ PBR     = 시총 ÷ 자본    🔴 [2026-09-17] **열었다.** 아래를 본다
 *   ⛔ ROE     = 순이익 ÷ 자본  손익계산서와 대차대조표를 섞는데, UAE 줄은 «분기»라
 *                              순이익을 연율로 볼 수 없다. **안 낸다**
 *   ⛔ PER     = 시총 ÷ 순이익  같은 분기 문제. **안 낸다**
 *
 * ── 🔴 [2026-09-17] PBR 을 연 까닭 — 전제가 바뀌었다 ─────────────────────
 * 위 「배수를 모른다」는 **그때는 맞았다.** 그 뒤에 이렇게 바뀌었다 —
 * ```
 *   단위가 적힌 줄   26 → 177 / 241
 *   🔴 통화도 갈린다  ADNOC 계열 등 아홉 곳은 **USD** 로 보고한다(칸 이름은 _aed 인데)
 * ```
 * ⭐ PBR 은 «시점 값»이라 분기·연간과 상관없다 — 시총도 자본도 그날의 값이다.
 *   그래서 ROE·PER 과 달리 분기 문제에 걸리지 않는다.
 * ⚠ 단위를 읽었다고 다 맞는 것은 아니라 «그럴듯함»으로 한 번 더 거른다 —
 *   PBR 이 0.05~50 밖이면 단위를 잘못 읽은 신호이니 **비운다.**
 * ⛔ 단위를 못 읽은 줄(64개)은 PBR 을 안 낸다. 짐작으로 배수를 정하지 않는다.
 *
 * ⛔ 「그럴듯해 보이니 일단 낸다」를 하지 않는다. 틀린 숫자 하나가 옳은 스물셋을
 *   같이 의심받게 한다(강령 3).
 *
 * ── 돈은 달러 한 가지로 맞춘다 ─────────────────────────────────────────────
 * 원과 디르함을 섞어 놓고 「시총 1,000 이상」을 받으면 그 수가 무슨 뜻인지 아무도 모른다.
 * UAE 중앙은행(CBUAE) 고시 환율로 달러로 맞추고, 쓴 환율과 날짜를 지면이 적는다.
 * 줄마다 «원래 통화와 원래 값»도 함께 실어 신고서와 맞대어 볼 수 있게 한다.
 *
 * ⛔ 값을 반올림하거나  없는 칸은 «없는 채로» 보낸다 —
 *   스크리너가 「값이 없어 빠진 곳」을 세려면 null 이 null 인 채로 와야 한다.
 *
 *   node scripts/build-screener-data.mjs
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const 한국탭 = 'src/data/korea-valuation-tape.json';
const UAE탭 = 'src/data/uae-financials-tape.json';
/* 🔴 [2026-09-22 · 5번] 일본 — EDINET 유가증권보고서에서 지은 탭(3,672사) */
const 일본탭 = 'src/data/japan-financials-tape.json';
/* 🔴 [2026-09-23 · 5번] 대만 — TWSE OpenAPI 로 지은 탭(1,057사). 시세·PER·PBR 까지 있다 */
const 대만탭 = 'src/data/taiwan-financials-tape.json';
const ADX사람 = 'archive/raw/uae-adx-people';
/* 🔴 [2026-09-16 · 5번] ADX «공식» 시가총액. 여기 오기 전에는 「아부다비가 안 낸다」고
   손님에게 적어 두었었다 — 사실이 아니었다. 우리가 «-delayed» 옆 문을 부르고 있었다.
   scripts/collect-uae-adx-marketwatch.mjs 가 날마다 쌓는다(소급 안 되는 자료다). */
const ADX시총 = 'archive/raw/uae-adx-marketwatch';

/**
 * 🔴 [2026-09-18 12:5x · 5번] **ADX 시총은 «쌓되 싣지 않는다».**
 *
 * 라이선스 대장을 채우면서 ADX 이용약관 원문을 브라우저로 직접 읽었다(curl 은 403).
 * `adx.ae/en/terms-of-use` 30~38절 원문 —
 * ```
 *   “…the user shall agree not to sell, license, rent, modify, distribute, copy,
 *    reproduce, transmit, publicly display, publicly perform, publish, adapt, edit,
 *    or create derivative works from such materials or content.”
 *   “Systematic retrieval of data or other content from this site to create or compile,
 *    directly or indirectly, a collection, compilation, database or directory without
 *    written permission from ADX is prohibited.”
 * ```
 * 우리가 날마다 받아 표로 쌓는 것이 바로 «systematic retrieval … to compile a database» 다.
 *
 * ⚠ 자매 자료(uae-adx-disclosures·financials·people)가 🟡 인 까닭은 그것이 **상장사가
 *   자기 이름으로 낸 법정 공시**라서 거래소 소유로 보기 어렵다는 업계 관행 판단이었다
 *   (docs/UAE-데이터-출처-라이선스.md, 2026-09-13 확정). **시세·시총은 그 예외에 안 든다** —
 *   그것은 거래소가 «자기가» 만들어 «Market Data Services» 로 파는 바로 그 물건이다.
 *
 * ✅ 그래서 받는 것은 그대로 둔다 — 내부 검산용이다(KRX 를 🔴 로 두고도 쌓는 것과 같은 자리).
 * ⛔ 손님 지면·파는 파일에는 넣지 않는다.
 * ⬜ 열린 우물을 찾으면 이 값을 true 로 되돌린다. 지금은 못 찾았다 —
 *   Bayanat.ae(CMA) 는 예산자료뿐이고 시장통계는 2019년에 멈춰 있다.
 */
export const ADX시총을_지면에_싣나 = false;

/* ── ⬜ [2026-09-18 16:4x · 5번] 열린 길을 찾아봤고 «재 보고 안 됐다» ────────
 *
 * 사장님 강령 — 「라이선스가 막으면 막힌다고 보고하지 말고 열린 출처를 찾는다」.
 * 그래서 ADX 76곳의 빈 칸(시총 0 · PBR 0)을 메울 길을 하나 찾아 끝까지 재 봤다.
 *
 * [생각한 길] 주가는 못 실어도 **주당순자산(BPS)** 은 낼 수 있지 않나 —
 * ```
 *   주식수 = 순이익 ÷ EPS        (09-16 에 단위 때문에 깨진 그 셈)
 *   BPS   = 자본 ÷ 주식수 = (자본 ÷ 순이익) × EPS
 *   ⇒ 자본과 순이익이 같은 단위면 «배수가 상쇄된다». 09-16 을 깨뜨린 단위 문제를 안 탄다
 * ```
 *   그러면 손님이 자기가 보는 주가를 나눠 PBR 을 스스로 구할 수 있다. 우리는 주가를
 *   안 싣고, 재무제표(🟡 상장사 법정공시)만 쓰므로 약관에도 안 걸린다.
 *
 * [재 봤다 — 답을 아는 자리로] DFM 은 주식수·시총을 자기 공시에 적어 내므로 거기서
 *   같은 셈을 해 «우리가 이미 내고 있는 PBR» 과 맞대 봤다(2026-09-18).
 * ```
 *   잰 회사 12곳 · 오차 5% 안 **1곳**
 *   DU 77.5% · MASQ 44.8% · ARMX 37.8% · AMLAK 35.2% · EMAAR 28.3%
 * ```
 * [왜 깨졌나] 순이익은 «그 분기», EPS 는 «연 누계»인 곳이 섞여 있다. 기간이 어긋나면
 *   주식수가 틀리고, 그러면 BPS 가 통째로 틀린다. 단위는 상쇄됐지만 «기간»이 남았다.
 *
 * ⛔ 그래서 **안 싣는다.** 그럴듯한 수를 검산 없이 실었으면 틀린 PBR 을 파는 것이다
 *   (09-16 에 시총으로 똑같은 일을 할 뻔했다).
 * ⭐ 「재 보고 안 된다고 적는 것도 결과다」 — 다음 사람이 이 길을 또 파지 않도록 적어 둔다.
 * ⬜ 아직 안 재 본 길 — 상장사 «연차보고서 PDF» 에 적힌 발행주식수를 그대로 읽는 것.
 *   그건 추정이 아니라 회사가 적어 낸 수라 기간 문제가 없다. 다만 주가는 여전히 없다. */
export const ADX시총못싣는까닭 =
  'Market capitalisation withheld — Abu Dhabi Securities Exchange publishes it, but the '
  + 'exchange’s terms of use bar systematic retrieval of its site content to compile a '
  + 'database, so we do not republish it. Dubai figures below come from DFM company filings.';
const DFM회사 = 'archive/raw/dubai-dfm-companies';
const 환율광 = 'archive/raw/uae-cbuae-fx';

/* 🔴 줄 뭉치는 «public» 으로 낸다 — 지면 HTML 안에 통째로 박지 않는다.
 *   박으면 첫 화면이 그만큼 늦고, 다시 와도 다시 받는다. 따로 두면 브라우저가 «캐시»한다.
 * ⭐ 지면이 «짓는 때» 알아야 하는 것(시장·업종 목록)만 작은 딴 파일로 낸다.
 * ⛔ 이름을 한 나라에 묶지 않는다 — screener-korea 로 지었다가 사장님께 바로잡혔다. */
const 나가는곳 = 'public/data/screener.json';
const 머리나가는곳 = 'src/data/screener-meta.json';

/** 값이 있으면 숫자로, 없으면 null 로. ⛔  */
export function 수(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

/** 곱한다 — 어느 한쪽이라도 없으면 null. ⛔ 없는 값을 0 으로 보고 곱하지 않는다 */
export function 곱(값, 배) {
  const n = 수(값);
  return n === null || !Number.isFinite(배) ? null : n * 배;
}

/** 나눈다 — 어느 한쪽이라도 없거나 아래가 0 이면 null. ⛔ 0 으로 나눈 Infinity 를 내보내지 않는다 */
export function 비(위, 아래) {
  const [a, b] = [수(위), 수(아래)];
  if (a === null || b === null || b === 0) return null;
  return a / b;
}

/** 뺀다 — 어느 한쪽이라도 없으면 null. ⛔ 없는 값을 0 으로 보고 빼지 않는다 */
export function 빼기(가, 나) {
  const [a, b] = [수(가), 수(나)];
  return a === null || b === null ? null : a - b;
}

/**
 * 자리를 줄인다. 환산한 달러를 소수점 끝까지 담으면(1151148514.8329806) 파일만 커진다.
 * ⛔ 「없음」을 0 으로 만들지 않는다 — null 은 null 로 나간다.
 * ⚠ 돈은 «한 달러» 단위까지면 넉넉하다. 어차피 우리가 환산한 수이고, 지면은 백만 단위로 그린다.
 */
export function 자름(v, 소수 = 0) {
  const n = 수(v);
  if (n === null) return null;
  const 배 = Math.pow(10, 소수);
  return Math.round(n * 배) / 배;
}

/**
 * CBUAE 고시에서 달러 환율을 읽는다.
 * 낸다 — { 날짜, AED당달러, KRW당달러, usdVsAed, krwVsAed }
 * ⛔ 고시가 없으면 지어내지 않고 던진다. 환율 없이 돈 칸을 내면 그 수가 거짓이 된다.
 */
export function 환율읽기(글들) {
  const 날 = {};
  for (const r of 글들 || []) {
    if (!r || !r.date) continue;
    (날[r.date] = 날[r.date] || []).push(r);
  }
  const 날짜들 = Object.keys(날).sort();
  for (let i = 날짜들.length - 1; i >= 0; i -= 1) {
    const 그날 = 날[날짜들[i]];
    const usd = 그날.find((x) => /^US Dollar$/i.test(String(x.currency).trim()));
    const krw = 그날.find((x) => /Korean Won/i.test(String(x.currency)));
    /* 🔴 [2026-09-22 · 5번] 엔을 더했다 — 일본 3,672사를 스크리너에 넣으면서.
       ⛔ 엔이 없으면 «일본만» 빠진다. 한국·UAE 는 그대로 나간다 — 아래에서 따로 본다. */
    const jpy = 그날.find((x) => /Japanese Yen/i.test(String(x.currency)));
    /* 🔴 [2026-09-23 · 5번] 대만달러를 더했다 — 대만 1,057사를 스크리너에 넣으면서.
       고시의 이름은 «Taiwan Dollar» 다(New Taiwan Dollar 가 아니다 — 고시 원문을 보고 맞췄다). */
    const twd = 그날.find((x) => /Taiwan Dollar/i.test(String(x.currency)));
    const u = usd && 수(usd.rateVsAed);
    const k = krw && 수(krw.rateVsAed);
    const j = jpy && 수(jpy.rateVsAed);
    const w = twd && 수(twd.rateVsAed);
    if (u && k && u > 0 && k > 0) {
      return {
        날짜: 날짜들[i],
        usdVsAed: u,
        krwVsAed: k,
        jpyVsAed: j && j > 0 ? j : null,
        AED당달러: 1 / u,          /* 1 AED = ? USD */
        KRW당달러: k / u,          /* 1 KRW = ? USD */
        /* ⛔ 고시에 엔이 없으면 null 이다. 지어내지 않는다 */
        JPY당달러: j && j > 0 ? j / u : null,
        twdVsAed: w && w > 0 ? w : null,
        TWD당달러: w && w > 0 ? w / u : null,
      };
    }
  }
  return null;
}

/** 폴더에서 _ 로 시작하지 않는 json 을 다 읽는다 */
function 폴더읽기(뿌리) {
  const p = path.resolve(뿌리);
  if (!existsSync(p)) return [];
  return readdirSync(p)
    .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
    .map((f) => {
      try { return JSON.parse(readFileSync(path.join(p, f), 'utf8')); } catch { return null; }
    })
    .filter(Boolean);
}

/**
 * 🔴 「못 쟀다」는 말도 손님이 읽는 말이다 — 손님이 영어권이라 «영문»으로 낸다.
 * ⛔ 원본의 한국어를 그대로 흘리지 않는다. 모르는 말이 오면 null 로 두고 화면에 안 낸다
 *   (짐작해서 옮기면 우리가 지어낸 말이 손님 화면에 선다).
 */
const 못잰까닭영문 = {
  '재무제표가 왔는데 자본총계·순이익이 비어 있다':
    'Financial statement filed, but equity and net income are blank in it',
  '시가총액이 없다 (시세에 그 종목이 없다)':
    'No market capitalisation — this ticker is not in the daily price file',
};

/* ── 한국 ──────────────────────────────────────────────────────────────── */

/**
 * 🔴 [2026-09-15 실측] roe·debtToEquity 는 원본에서 «비율»이다 — 삼성전자 roe 0.1036.
 *   머리에 「ROE %」라고 쓰고 0.1 을 내면 손님이 「ROE 0.1%」로 읽는다. 여기서 100을 곱한다.
 */
function 백분율(v) {
  const n = 수(v);
  return n === null ? null : n * 100;
}

export function 한국을추린다(줄들, KRW당달러) {
  return (줄들 || []).map((r) => ({
    t: r.ticker,
    n: r.nameEn || r.name,
    k: r.name,                          /* 찾기에만 쓴다 — 그리지 않는다 */
    m: r.market,
    i: r.industryEn || r.industry || null,
    /* ⛔ 통화는 줄마다 담지 않는다 — 시장 코드로 정해지므로(lib 의 시장들) 두 벌이 되면 어긋난다 */
    /* 기준이 되는 기간 — 한국은 «사업연도»다. UAE 는 분기라 섞어 보면 안 된다 */
    as: r.fiscalYear ? 'FY' + r.fiscalYear : null,
    c: 자름(곱(r.marketCap, KRW당달러)),
    v: 자름(곱(r.revenue, KRW당달러)),
    np: 자름(곱(r.netIncome, KRW당달러)),
    e: null,                            /* 한국 탭에 주당순이익 칸이 없다 — 지어내지 않는다 */
    p: 자름(r.per, 2),
    b: 자름(r.pbr, 2),
    r: 자름(백분율(r.roe), 2),
    d: 자름(백분율(r.debtToEquity), 2),
    /* 원래 신고한 값 — 손님이 신고서와 맞대어 본다 */
    nc: 자름(r.marketCap),
    nv: 자름(r.revenue),
    x: (r.notMeasured && 못잰까닭영문[r.notMeasured]) || null,
  }));
}

/* ── UAE ───────────────────────────────────────────────────────────────── */

/**
 * 회사마다 «가장 늦은» 신고 한 줄만 쓰려고 날짜를 견줄 수 있는 글자로 바꾼다.
 * 🔴 [2026-09-15 실측] **날짜 꼴이 거래소마다 다르다.**
 *     ADX  「2026-07-30 00:00:00.0」   ISO 라 앞 열 글자를 그냥 쓰면 된다
 *     DFM  「Aug 12, 2026 11:45:00」   ISO 가 아니다
 *   앞의 것만 보고 짰더니 DFM 은 전부 「2026-00-00」으로 같아져 **첫 줄이 이겼다** —
 *   회사마다 옛 분기가 뽑혔고 배수 검산까지 그 줄로 어긋났다.
 * ⛔ 한 우물의 꼴을 보고 「이 자료는 이렇다」고 정하지 않는다. 우물마다 재 본다.
 */
export function 기간점수(줄) {
  const 날 = String((줄 && 줄.date) || '').trim();
  const iso = 날.slice(0, 10);
  if (/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(iso)) return iso;
  const t = Date.parse(날);
  if (Number.isFinite(t)) return new Date(t).toISOString().slice(0, 10);
  const m = String((줄 && 줄.period) || '').match(/([0-9]{4})/);
  return m ? m[1] + '-00-00' : '0000-00-00';
}

export function 가장늦은줄만(줄들) {
  const 통 = new Map();
  for (const r of 줄들 || []) {
    const 열쇠 = r.exchange + ':' + r.symbol;
    const 이전 = 통.get(열쇠);
    if (!이전 || 기간점수(r) > 기간점수(이전)) 통.set(열쇠, r);
  }
  return [...통.values()];
}

/**
 * DFM 이 준 시가총액을 쓸 수 있나.
 * 🔴 [2026-09-15 실측] DFM 에는 쿠웨이트·미국·바레인 통화로 액면을 적은 상장이 섞여 있다
 *   (시총이 붙은 62곳 중 AED 가 아닌 곳이 10곳). 그것을 디르함으로 치면 그 줄이 거짓이 된다.
 * ⇒ 액면 통화가 디르함인 것만 쓴다. 나머지는 «안 낸다»고 적는다.
 */
export function DFM시총쓸수있나(회사) {
  const ps = String((회사 && 회사.perShareValue) || '');
  if (!수((회사 || {}).marketCap)) return { 쓴다: false, 까닭: null };
  if (/AED|UAE\s*Dirham/i.test(ps)) return { 쓴다: true, 까닭: null };
  const 통화 = (ps.replace(/[0-9.,\s]/g, '') || 'an unstated currency');
  return {
    쓴다: false,
    까닭: 'Market capitalisation withheld — this DFM listing quotes its par value in '
      + 통화 + ', so we could not confirm the currency of the exchange’s market-cap figure',
  };
}

/**
 * 🔴🔴 [2026-09-15 실측] **신고서마다 «배수»가 다르다.** 이것을 안 잡으면 1,000배 틀린
 *   수가 손님 화면에 선다. EPS × 주식수 ≈ 순이익 으로 잡아냈다 —
 *
 *     DFM:ALEC   순이익 ÷ EPS = 추정 주식수 5,010,087  vs  실제 5,000,000,000  → **1,000배**
 *     DFM:DEWA   추정 52,281,167                        vs  실제 50,000,000,000 → **1,000배**
 *     ADX:ADNOCGAS 추정 75,826,086,957                  vs  실제 약 768억        → 그대로 맞다
 *
 *   ⇒ 거래소마다 다르고, 한 거래소 안에서도 회사마다 다르다(DFM 은 ×1 과 ×1000 이 섞여 있다).
 *
 * 그래서 **검산되는 줄의 돈 칸만 낸다.**
 *   1. 주식수를 아는 곳(DFM)  — 추정 주식수가 실제와 ±25% 안에 드는 배수를 고른다
 *   2. 주식수를 모르는 곳(ADX) — 추정 주식수가 사람이 쓸 만한 폭(1천만~2천억주) 안에 드는 배수
 *   3. 둘 다 맞거나 둘 다 안 맞으면 «못 정했다». 그 줄은 돈 칸을 안 낸다
 *
 * ⛔ 「대충 맞아 보이니 낸다」를 하지 않는다. 배수를 틀리면 그냥 틀린 것이 아니라 «1,000배» 틀린다.
 * ⚠ 부채비율은 이 판정과 상관없다 — 같은 표 안의 두 수라 배수가 약분된다. 그래서 그것은 그대로 낸다.
 */
export const 후보배수 = [1, 1000];

export function 배수정하기(eps, 순이익, 주식수) {
  const e = 수(eps); const np = 수(순이익); const sh = 수(주식수);
  if (!e || !np) return { 배수: null, 까닭: 'no-eps' };
  const 맞는것 = [];
  for (const f of 후보배수) {
    const 추정 = (np * f) / e;
    /* ⚠ 우리가 가리는 것은 «열 배 단위»지 EPS 의 정확도가 아니다.
         신고서의 EPS 는 «지배주주 몫 이익 ÷ 가중평균 주식수»라 우리가 쥔 현재 발행주식수와
         본래 몇 할씩 어긋난다(EMAAR 1.28배 · DEWA 1.45배). ±25% 로 조이면 맞는 줄이 떨어져 나간다.
         ⇒ 세 배 안쪽이면 같은 자릿수로 본다. 다음 후보(×1000)와는 세 자릿수가 벌어져 섞이지 않는다. */
    if (sh) { const 비 = 추정 / sh; if (비 > 1 / 3 && 비 < 3) 맞는것.push(f); }
    else if (추정 >= 1e7 && 추정 <= 2e11) 맞는것.push(f);
  }
  if (맞는것.length === 1) return { 배수: 맞는것[0], 까닭: null };
  return { 배수: null, 까닭: 맞는것.length > 1 ? 'ambiguous' : 'no-fit' };
}

/**
 * 한 거래소가 «압도적으로» 한 배수면(9할 이상), 줄 혼자서는 못 가른 줄에 그 배수를 쓴다.
 * ⛔ 압도적이지 않으면 안 쓴다 — DFM 은 ×1 과 ×1000 이 섞여 있어 이 길을 안 탄다.
 * ⛔ 줄이 «다른» 배수라고 말하는데 다수와 어긋나면 그 줄은 버린다. 둘 중 하나가 틀린 것이고,
 *   어느 쪽인지 모르는 채로 내지 않는다.
 */
export function 거래소배수(판정들) {
  const 셈 = {};
  let 합 = 0;
  for (const f of 판정들) if (f) { 셈[f] = (셈[f] || 0) + 1; 합 += 1; }
  if (!합) return null;
  const [으뜸, 수효] = Object.entries(셈).sort((a, b) => b[1] - a[1])[0];
  return (수효 / 합) >= 0.9 ? Number(으뜸) : null;
}

/**
 * 🔴 [2026-09-17] **대차대조표 단위를 «읽어서» 알게 됐다.** 그래서 PBR 을 연다.
 *
 * 이 파일 머리글에 「대차대조표는 배수를 모른다 ⇒ ROE·PBR 안 낸다」라고 적혀 있었다.
 * **그때는 맞았다.** 그 뒤에 바뀐 것 —
 * ```
 *   단위가 적힌 줄   26 → 177 / 241     AED'000 · AED million · USD'000 · USD million
 *   🔴 통화가 갈린다  ADNOC 계열 등 아홉 곳은 **USD** 로 보고한다(칸 이름은 _aed 인데)
 * ```
 * ⛔ 그래도 ROE·PER 은 계속 안 낸다 — 그건 단위 문제가 아니라 **분기 문제**다.
 *   UAE 줄은 분기라 순이익을 연율로 볼 수 없다.
 * ✅ PBR 은 «시점 값»이라 분기·연간과 상관없다. 시총도 자본도 그날의 값이다.
 *
 * ⚠ 그리고 단위를 읽었다고 다 맞는 것은 아니다. 그래서 «그럴듯함»으로 한 번 더 거른다 —
 *   PBR 이 0.05~50 밖이면 단위를 잘못 읽었을 가능성이 크니 **비운다.**
 *   ⛔ 「그럴듯해 보이니 일단 낸다」의 반대다. 이상하면 안 낸다.
 */
export const 대차배수표 = { "AED'000": 1e3, 'AED million': 1e6, "USD'000": 1e3, 'USD million': 1e6 };

/** 그 줄의 자본을 «달러»로 낸다. 단위를 모르면 null — 짐작하지 않는다. */
export function 자본달러(unitHint, 자본, AED당달러) {
  const 배수 = 대차배수표[String(unitHint || '')];
  if (!배수 || 자본 === null || !Number.isFinite(자본) || 자본 <= 0) return null;
  const 달러통화 = /^USD/.test(String(unitHint));
  const 환 = 달러통화 ? 1 : Number(AED당달러);
  if (!Number.isFinite(환) || 환 <= 0) return null;
  return 자본 * 배수 * 환;
}

/** PBR — 그럴듯한 범위를 벗어나면 «못 냈다»로 둔다 */
export const PBR범위 = { 아래: 0.05, 위: 50 };
export function PBR내기(시총달러, 자본달러값) {
  if (시총달러 === null || 자본달러값 === null) return null;
  if (!(시총달러 > 0) || !(자본달러값 > 0)) return null;
  const b = 시총달러 / 자본달러값;
  return (b >= PBR범위.아래 && b <= PBR범위.위) ? b : null;
}

export function UAE를추린다(줄들, 이름표, AED당달러) {
  const 늦은것 = 가장늦은줄만(줄들);

  /* 1. 줄마다 «혼자서» 배수를 가려 본다 */
  const 혼자 = new Map();
  for (const r of 늦은것) {
    const 정보 = 이름표[r.exchange + ':' + r.symbol] || {};
    혼자.set(r, 배수정하기(r.eps, r.net_profit_aed, 정보.shares));
  }

  /* 2. 거래소가 압도적으로 한 배수면 못 가른 줄에 그것을 쓴다 (ADX 는 98%가 ×1 이다) */
  const 거래소별 = {};
  for (const r of 늦은것) {
    (거래소별[r.exchange] = 거래소별[r.exchange] || []).push(혼자.get(r).배수);
  }
  const 다수배수 = {};
  for (const [ex, 목록] of Object.entries(거래소별)) 다수배수[ex] = 거래소배수(목록);

  return 늦은것.map((r) => {
    const 정보 = 이름표[r.exchange + ':' + r.symbol] || {};
    const 시총 = 정보.시총쓸수있나 ? 곱(정보.marketCap, AED당달러) : null;
    const 판 = 혼자.get(r);
    const 다수 = 다수배수[r.exchange];

    /* 배수를 정한다 —
       · 줄이 스스로 말하면 그것을 쓴다. 단 다수와 «어긋나면» 버린다(어느 쪽이 틀린지 모른다)
       · 줄이 못 가르면 다수를 쓴다. 다수도 없으면 못 정한 것이다 */
    let 배수 = null;
    let 배수까닭 = null;
    if (판.배수 !== null) {
      if (다수 !== null && 판.배수 !== 다수) {
        배수까닭 = 'Figures withheld — this filing’s stated earnings per share does not agree with '
          + 'the scale the rest of this exchange files in, so we could not tell which of the two is wrong';
      } else 배수 = 판.배수;
    } else if (다수 !== null && 판.까닭 === 'ambiguous') {
      배수 = 다수;
    } else {
      배수까닭 = 판.까닭 === 'no-eps'
        ? 'Revenue and profit withheld — the filing states no earnings per share, so we could not '
          + 'check whether its figures are in dirhams or in thousands of dirhams'
        : 'Revenue and profit withheld — earnings per share times shares in issue does not match the '
          + 'stated profit at any scale we could verify';
    }

    /* 🔴 부채비율은 이 판정과 «상관없다» — 같은 표 안의 두 수라 배수가 약분된다.
       ROE·PBR 은 손익계산서와 대차대조표를 섞으므로 안 낸다.
       PER 은 배수가 맞더라도 이 줄이 «분기»라 연간 배수가 아니므로 안 낸다. */
    const 부채 = 수(r.total_liabilities_aed);
    const 자본 = 수(r.total_equity_aed);
    const 부채비율 = (부채 !== null && 자본 !== null && 자본 > 0 && r.balance_sheet_reconciled)
      ? (부채 / 자본) * 100
      : null;

    /* 🔴 PBR — 대차대조표 «단위»를 읽은 줄에서만 낸다. 못 읽었으면 안 낸다.
       ⚠ 검산을 통과한 줄(balance_sheet_reconciled)만 쓴다 — 자산 = 부채 + 자본 이 맞은 것. */
    const 자본USD = r.balance_sheet_reconciled ? 자본달러(r.unit_hint, 자본, AED당달러) : null;
    const PBR = PBR내기(시총, 자본USD);

    const 까닭들 = [];
    if (배수까닭) 까닭들.push(배수까닭);
    if (정보.시총까닭) 까닭들.push(정보.시총까닭);

    const 돈 = (값) => (배수 === null ? null : 곱(값, AED당달러 * 배수));

    return {
      t: r.symbol,
      n: 정보.name || r.symbol,
      k: null,
      m: r.exchange,
      i: 정보.sector || null,
      as: r.period || null,           /* 「Q2 2026」 — 한국의 「FY2025」와 섞어 보면 안 된다 */
      c: 자름(시총),
      v: 자름(돈(r.revenue_aed)),
      np: 자름(돈(r.net_profit_aed)),
      e: 자름(배수 === null ? null : 곱(r.eps, AED당달러), 4),
      p: null,                        /* PER — 이 줄은 «분기»라 연간 배수가 아니다. 안 낸다 */
      b: 자름(PBR, 2),                /* PBR — 시점 값이라 분기와 상관없다. 단위를 읽은 줄만 */
      r: null,                        /* ROE — PER 과 같은 분기 문제. 안 낸다 */
      d: 자름(부채비율, 2),
      nc: 정보.시총쓸수있나 ? 자름(정보.marketCap) : null,
      nv: 자름(배수 === null ? null : 수(r.revenue_aed) * 배수),
      x: 까닭들.length ? 까닭들.join(' · ') : null,
    };
  });
}

/**
 * 날짜별로 쌓인 ADX marketwatch 가운데 «가장 최근» 한 장을 읽어 종목→시총 표로 만든다.
 * ⛔ 여러 날을 섞지 않는다 — 시총은 그날의 값이라 섞으면 어느 날 것인지 아무도 모른다.
 */
export function ADX시총표만들기(파일들) {
  /* 파일들 = [{날짜, rows}] — 최근 것 하나만 쓴다 */
  const 날 = (x) => String(x?.날짜 || x?.rows?.[0]?.date || '');
  const 산것 = 파일들.filter((x) => x && Array.isArray(x.rows) && x.rows.length)
    .sort((a, b) => 날(b).localeCompare(날(a)));
  if (!산것.length) return { 날짜: null, 표: {} };
  const 첫 = 산것[0];
  const 표 = {};
  for (const r of 첫.rows) {
    if (!r || !r.symbol) continue;
    const mc = 수(r.marketCap);
    if (mc === null || mc <= 0) continue;   /* ⛔ 0 을 시총으로 세지 않는다 */
    표[r.symbol] = { marketCap: mc, 날짜: r.date || 날(첫) };
  }
  return { 날짜: 날(첫) || null, 표 };
}

/** ADX·DFM 회사 이름표(이름·업종·시총)를 모은다 */
export function 이름표만들기(ADX들, DFM들, ADX시총표 = {}) {
  const 표 = {};
  for (const j of ADX들) {
    const c = j.company || {};
    if (!c.symbol) continue;
    /* 🔴 [2026-09-16] 여기 「ADX 는 발행주식수를 주는 우물을 아직 못 찾았다」고 적혀 있었고,
       그 한 줄 때문에 지면이 손님에게 「아부다비가 시총을 안 낸다」고 말하고 있었다.
       ⛔ 우리가 못 찾은 것을 그쪽 탓으로 적지 않는다. 우물은 찾았다 —
          /adx/marketwatch/1.1/securityBoard/marketwatch (128/128 에 시총이 들어 있다).
       ⚠ 주식수는 여전히 없다. 그래서 시총은 «받아서» 쓰고 «계산해서» 만들지 않는다 —
          계산판은 두바이로 검산했더니 오차 가운데값 99.9% 였다. */
    /* 🔴 [2026-09-18] 약관을 읽고 «싣지 않는» 쪽으로 돌렸다 — 위 ADX시총을_지면에_싣나 참조 */
    const 시총 = ADX시총을_지면에_싣나 ? ADX시총표[c.symbol] : null;
    표['ADX:' + c.symbol] = {
      name: c.engName || c.symbol, sector: null,
      marketCap: 시총 ? 시총.marketCap : null,
      시총쓸수있나: Boolean(시총),
      시총까닭: 시총 ? null
        : (ADX시총을_지면에_싣나
          ? 'Market capitalisation withheld — this ticker was not in the exchange’s market-watch feed '
            + 'on the day we last collected it'
          : ADX시총못싣는까닭),
      shares: null,   /* ⛔ 주식수는 아직 없다. 시총을 주식수로 되돌려 쓰지 않는다 */
    };
  }
  for (const j of DFM들) {
    const c = j.company || {};
    if (!c.symbol) continue;
    const 판정 = DFM시총쓸수있나(c);
    표['DFM:' + c.symbol] = {
      name: c.fullName || c.symbol,
      sector: c.sector || null,
      marketCap: 수(c.marketCap),
      시총쓸수있나: 판정.쓴다,
      시총까닭: 판정.까닭,
      /* 🔴 배수를 검산하는 잣대다 — EPS × 주식수 ≈ 순이익 이어야 한다 */
      shares: 수(c.issuedShares),
    };
  }
  return 표;
}

/* ── 본일 ──────────────────────────────────────────────────────────────── */

async function 본일() {
  /* 1. 환율 — 이것이 없으면 돈 칸을 낼 수 없다. 지어내지 않는다 */
  const 환율글 = 폴더읽기(환율광).flatMap((j) => j.rows || Object.values(j).find(Array.isArray) || []);
  const 환 = 환율읽기(환율글);
  if (!환) {
    console.error('🔴 CBUAE 고시에서 USD·KRW 환율을 못 찾았다 — 돈 칸을 지어내지 않는다. 멈춘다');
    process.exit(1);
  }

  /* 2. 한국 */
  const 한국원본 = JSON.parse(readFileSync(path.resolve(한국탭), 'utf8'));
  const 한국줄 = Array.isArray(한국원본) ? 한국원본 : (한국원본.rows || []);
  const 한국 = 한국을추린다(한국줄, 환.KRW당달러);

  /* 3. UAE */
  const UAE원본 = JSON.parse(readFileSync(path.resolve(UAE탭), 'utf8'));
  const ADX시총것 = ADX시총표만들기(폴더읽기(ADX시총));
  console.log(`   ADX 공식 시가총액 — ${Object.keys(ADX시총것.표).length}종목 (${ADX시총것.날짜 || '못 받음'})`);
  const 이름표 = 이름표만들기(폴더읽기(ADX사람), 폴더읽기(DFM회사), ADX시총것.표);
  const UAE = UAE를추린다(UAE원본.rows || [], 이름표, 환.AED당달러);

  /* 4. 일본 — 🔴 [2026-09-22 · 5번] 그날 재무제표 3,672사를 열어 스크리너에 넣었다.
   * ⚠ **시가총액·PER·PBR·EPS 는 아직 없다.** 일본 주가 우물을 안 열었다.
   *   ⛔ 0 으로 메꾸지 않는다 — 0 은 「없다」가 아니라 「영이다」다(강령 ③).
   *   ⇒ 그 칸으로 거르면 일본이 통째로 빠진다. 지면이 「빈 칸으로 빠진 수」를 따로 보인다.
   * ⚠ 엔은 달러로 바꿔 담는다 — 원·디르함·엔을 섞어 두면 「1,000 이상」이 무슨 뜻인지 모른다. */
  const 일본 = (() => {
    let 원본;
    try { 원본 = JSON.parse(readFileSync(path.resolve(일본탭), 'utf8')); }
    catch { console.log('   ⚠ 일본 탭이 없다 — 일본 없이 짓는다'); return []; }
    const JPY당달러 = 환.JPY당달러 ?? null;
    if (!JPY당달러) { console.log('   ⚠ 엔 환율이 없다 — 일본을 안 싣는다(0 으로 메꾸지 않는다)'); return []; }
    return (원본.rows || []).map((r) => ({
      m: 'TSE',
      t: r.code,
      n: r.name_en || null,          /* ⛔ 손님 화면은 영문이다. 일본어 이름은 k 로만 둔다 */
      k: r.name || null,
      i: r.sector || null,
      /* 🔴 [2026-09-22] 다섯 칸이 «주가를 밖에서 사 오지 않고» 섰다.
         유가증권보고서가 주당이익·주당순자산·발행주식수·주가수익률을 함께 싣는다 —
         PER × EPS 가 결산일 주가이고, 거기서 시총과 PBR 이 나온다.
         ⛔ 「현재가」가 아니라 «결산일» 값이다. as 칸(결산일)을 함께 낸다. */
      c: 자름(곱(r.market_cap_jpy, JPY당달러)),
      p: 자름(r.per, 2),
      b: 자름(r.pbr, 2),
      e: 자름(곱(r.eps_jpy, JPY당달러), 4),
      v: 자름(곱(r.revenue_jpy, JPY당달러)),
      np: 자름(곱(r.net_profit_jpy, JPY당달러)),
      /* 자기자본이익률·부채비율은 «같은 표»에서 나온다 — 환율도 안 탄다(비율이라 약분된다) */
      r: 자름(백분율(비(r.net_profit_jpy, r.equity_jpy)), 2),
      d: 자름(백분율(비(빼기(r.assets_jpy, r.equity_jpy), r.equity_jpy)), 2),
      nc: 자름(r.market_cap_jpy),
      nv: 자름(r.revenue_jpy),
      as: r.period_end || null,
    })).filter((r) => r.t);
  })();
  console.log(`   일본 ${일본.length}곳 — 시가총액·PER·PBR 은 «결산일» 값이다`
    + ' (유가증권보고서의 주가수익률 × 주당이익으로 되짚었다. ⛔ 현재가가 아니다)');

  /* 5. 대만 — 🔴 [2026-09-23 · 5번] TWSE OpenAPI 로 1,057사를 열었다.
   * ⭐ 일본과 달리 **시가총액·PER·PBR 이 «진짜 시세»에서 온다.** 거래소가 일별 종가를
   *   그대로 내준다(exchangeReport/STOCK_DAY_ALL). 일본은 유가증권보고서의 결산일 값을
   *   되짚은 것이라 성격이 다르다 — as 칸(기준일)이 그 차이를 말한다.
   * 🔴 **손익은 «연초부터 누계»다.** 季別=2 는 상반기 여섯 달이다(中華電信으로 검산했다).
   *   ⇒ 한국·일본의 «열두 달»과 기간이 다르므로 매출·순이익을 나란히 읽으면 안 된다.
   *     x 칸에 그 사실을 실어 지면이 손님에게 말한다.
   * ⛔ ROE 는 «반년 누계 ÷ 시점 자본»이라 연율이 아니다. 그대로 담되 뜻을 밝힌다.
   * ⛔ 0 으로 메꾸지 않는다. 환율이 없으면 대만을 «안 싣는다». */
  const 대만 = (() => {
    let 원본;
    try { 원본 = JSON.parse(readFileSync(path.resolve(대만탭), 'utf8')); }
    catch { console.log('   ⚠ 대만 탭이 없다 — 대만 없이 짓는다'); return []; }
    const TWD당달러 = 환.TWD당달러 ?? null;
    if (!TWD당달러) { console.log('   ⚠ 대만달러 환율이 없다 — 대만을 안 싣는다(0 으로 메꾸지 않는다)'); return []; }
    return (원본.rows || []).map((r) => ({
      m: 'TWSE',
      t: String(r.code),
      n: r.name_en || null,        /* ⛔ 손님 화면은 영문이다. 한자 이름은 k 로만 둔다 */
      k: r.name || null,
      i: r.industry_en || null,    /* ⛔ 옮긴 이름이 없으면 null — 한자를 화면에 안 낸다 */
      c: 자름(곱(r.market_cap_twd, TWD당달러)),
      p: 자름(r.per, 2),
      b: 자름(r.pbr, 2),
      v: 자름(곱(r.revenue_twd, TWD당달러)),
      np: 자름(곱(r.net_profit_twd, TWD당달러)),
      r: 자름(백분율(비(r.net_profit_twd, r.equity_twd)), 2),
      d: 자름(백분율(비(빼기(r.assets_twd, r.equity_twd), r.equity_twd)), 2),
      nc: 자름(r.market_cap_twd),
      nv: 자름(r.revenue_twd),
      as: r.price_date || null,
      /* 🔴 기간이 다르다는 사실을 줄마다 싣는다 — 지면이 이것을 그대로 보인다 */
      x: r.year && r.quarter ? `Income statement covers ${r.year} Q1-Q${r.quarter} cumulative` : null,
    })).filter((r) => r.t);
  })();
  console.log(`   대만 ${대만.length}곳 — 시가총액·PER·PBR 은 «거래소 일별 종가»에서 왔다`
    + ' (⚠ 손익은 연초부터 누계다 — 한국·일본의 열두 달과 기간이 다르다)');

  const 추린것 = [...한국, ...UAE, ...일본, ...대만];

  /* 🔴 관문 — 손님 화면에 나가는 칸(n·i·x·as)에 한국어가 «한 글자라도» 있으면 멈춘다.
   *   사장님 지시: 「화면에 한국어를 안 낸다」(손님이 영어권이다).
   *   ⚠ k(한국어 이름)는 «찾기»에만 쓰고 그리지 않으므로 여기서 안 본다.
   *   ⛔ 이것을 「조심하겠다」로 두지 않는다. 검사로 굳힌다. */
  const 한글샌줄 = 추린것.filter((r) => /[가-힣]/.test((r.n || '') + (r.i || '') + (r.x || '') + (r.as || '')));
  if (한글샌줄.length) {
    console.error(`🔴 손님 화면 칸에 한국어가 ${한글샌줄.length}줄 있다 — 안 낸다`);
    for (const r of 한글샌줄.slice(0, 5)) console.error(`   ${r.m} ${r.t} · n=${r.n} · i=${r.i} · x=${r.x}`);
    process.exit(1);
  }

  /* 🔴 관문 둘 — 시장 코드가 lib 의 목록에 없으면 멈춘다. 지면이 그 줄을 그릴 수 없다 */
  const { 시장들 } = await import(pathToFileURL(path.resolve('src/lib/screener.mjs')).href);
  const 아는코드 = new Set(시장들.map((m) => m.code));
  const 모르는 = [...new Set(추린것.map((r) => r.m).filter((m) => !아는코드.has(m)))];
  if (모르는.length) {
    console.error('🔴 src/lib/screener.mjs 의 시장들 에 없는 코드 — ' + 모르는.join(', '));
    process.exit(1);
  }

  const 업종 = [...new Set(추린것.map((r) => r.i).filter(Boolean))].sort();

  /* 시장마다 «그 시장에서» 칸이 몇 곳 차 있나 — 지면이 이것을 먼저 보인다 */
  const 칸들 = ['c', 'v', 'np', 'e', 'p', 'b', 'r', 'd'];
  const 시장별 = 시장들.map((m) => {
    const 줄 = 추린것.filter((r) => r.m === m.code);
    const 채움 = {};
    for (const k of 칸들) 채움[k] = 줄.filter((x) => x[k] !== null && x[k] !== undefined).length;
    채움.i = 줄.filter((x) => x.i).length;
    return { ...m, rows: 줄.length, filled: 채움 };
  }).filter((m) => m.rows > 0);

  const 냄 = {
    _meta: {
      product: 'SMarkets screener — Asian and Gulf listed companies, the fields a screen actually uses',
      builtAt: new Date().toISOString(),
      sources: [
        'Korea: src/data/korea-valuation-tape.json (KRX closing price via the Korean public data portal + DART filings)',
        'UAE: src/data/uae-financials-tape.json (ADX disclosure feed + ADX/DFM filed PDFs), DFM company profiles',
        'FX: Central Bank of the UAE published rates',
      ],
      rows: 추린것.length,
      fx: {
        asOf: 환.날짜,
        note: 'Money columns are converted to US dollars at these Central Bank of the UAE rates.',
        usdPerAed: 환.AED당달러,
        usdPerKrw: 환.KRW당달러,
        aedPerUsd: 환.usdVsAed,
        krwPerUsd: 환.usdVsAed / 환.krwVsAed,
      },
      notThis: [
        'Empty fields are sent as null, never as zero — the screener counts how many companies a filter silently drops.',
        'Korea figures are a full financial year; UAE figures are the filing period shown on each row. Do not read them as the same thing.',
        'UAE PER, PBR and ROE are deliberately absent: the filed balance sheets do not state a consistent scale, so any ratio mixing them with the income statement could be wrong by a factor of 1,000.',
        'No ranking, no score, no recommendation. These are filed figures and a price.',
        'Not investment advice.',
      ],
    },
    markets: 시장별,
    industries: 업종,
    rows: 추린것,
  };

  writeFileSync(path.resolve(나가는곳), JSON.stringify(냄), 'utf8');
  writeFileSync(
    path.resolve(머리나가는곳),
    JSON.stringify({
      _meta: 냄._meta, markets: 시장별, industries: 업종, dataUrl: '/data/screener.json',
    }, null, 2) + '\n',
    'utf8',
  );

  const 전 = Math.round((statSync(path.resolve(한국탭)).size + statSync(path.resolve(UAE탭)).size) / 1024);
  const 후 = Math.round(statSync(path.resolve(나가는곳)).size / 1024);
  console.log(`✅ ${나가는곳} — ${추린것.length}줄 · 시장 ${시장별.length}개 · 업종 ${업종.length}개`);
  console.log(`   ${머리나가는곳} — 지면이 짓는 때 읽는 머리`);
  console.log(`   ${전}KB → ${후}KB`);
  console.log(`   환율(CBUAE ${환.날짜}) — 1 USD = ${환.usdVsAed} AED = ${(환.usdVsAed / 환.krwVsAed).toFixed(1)} KRW`);
  console.log('   시장마다 칸이 «있는» 곳 —');
  for (const m of 시장별) {
    const 몫 = 칸들.map((k) => `${k} ${m.filled[k]}`).join(' · ');
    console.log(`     ${m.code.padEnd(4)} ${String(m.rows).padStart(5)}줄  ${몫}`);
  }
  console.log('   ⭐ 0 인 칸으로 거르면 그 시장이 «통째로» 빠진다 — 지면이 그 수를 손님에게 보인다');
}

/* ── 자가시험 ──────────────────────────────────────────────────────────── */
export function 자가시험() {
  const 것 = [];
  const 재다 = (이름, 됐나) => 것.push({ 이름, 됐나 });

  재다('수: 쉼표가 든 글자도 읽는다', 수('23,006,831,000') === 23006831000);
  재다('수: 빈 것은 null', 수('') === null && 수(null) === null);
  재다('⛔ 수: 0 은 살린다', 수(0) === 0);
  재다('곱: 한쪽이 없으면 null', 곱(null, 2) === null);
  재다('자름: 소수를 정리한다', 자름(1151148514.8329806) === 1151148515);
  재다('⛔ 자름: null 을 0 으로 만들지 않는다', 자름(null) === null);

  /* 🔴 날짜 꼴이 거래소마다 다르다 — 이것을 놓쳐서 DFM 이 옛 분기로 뽑혔다 */
  재다('기간점수: ADX 의 ISO 꼴', 기간점수({ date: '2026-07-30 00:00:00.0' }) === '2026-07-30');
  재다('🔴 기간점수: DFM 의 「Aug 12, 2026」 꼴', 기간점수({ date: 'Aug 12, 2026 11:45:00' }) === '2026-08-12');
  재다('기간점수: 날짜가 없으면 해로 떨어진다', 기간점수({ period: 'Q2 2026' }) === '2026-00-00');
  재다('🔴 가장늦은줄만: 회사마다 늦은 것 하나', 가장늦은줄만([
    { exchange: 'DFM', symbol: 'A', date: 'Aug 12, 2026 11:45:00', v: 2 },
    { exchange: 'DFM', symbol: 'A', date: 'May 03, 2026 09:00:00', v: 1 },
  ]).length === 1);
  재다('가장늦은줄만: 늦은 쪽이 남는다', 가장늦은줄만([
    { exchange: 'DFM', symbol: 'A', date: 'May 03, 2026 09:00:00', v: 1 },
    { exchange: 'DFM', symbol: 'A', date: 'Aug 12, 2026 11:45:00', v: 2 },
  ])[0].v === 2);

  /* 🔴🔴 배수 — 이것을 틀리면 1,000배 틀린 수가 손님 화면에 선다 */
  재다('🔴 배수: 주식수를 알면 ×1000 을 잡아낸다 (DEWA 꼴)',
    배수정하기(0.046, 3328285, 50000000000).배수 === 1000);
  재다('🔴 배수: 그대로 맞는 곳은 ×1 (ADNOCGAS 꼴)',
    배수정하기(0.052, 3993000000, 76800000000).배수 === 1);
  재다('🔴 배수: EPS 가 없으면 못 정한다', 배수정하기(null, 100, 1e9).배수 === null);
  재다('배수: 못 정하면 까닭을 남긴다', 배수정하기(null, 100, 1e9).까닭 === 'no-eps');
  재다('🔴 배수: 어느 배수로도 안 맞으면 버린다',
    배수정하기(1000, 5, 1e9).배수 === null);
  재다('배수: 주식수를 모르면 사람이 쓸 만한 폭으로 가른다 (ADX)',
    배수정하기(0.052, 3993000000, null).배수 === 1);

  /* 🔴🔴 대차대조표 단위 — 여기를 틀리면 PBR 이 «천 배» 틀린 채 손님 화면에 선다.
     ⚠ 그리고 통화가 갈린다 — ADNOC 계열 등 아홉 곳은 AED 가 아니라 USD 로 보고한다.
       칸 이름이 `total_assets_aed` 라 AED 처럼 보이는 것이 함정이다. */
  const 달러당 = 1 / 3.6725;                     /* 1 AED ≈ 0.2723 USD */
  재다("🔴 AED'000 자본을 달러로 바꾼다",
    Math.round(자본달러("AED'000", 1000, 달러당)) === Math.round(1000 * 1000 / 3.6725));
  재다('🔴 AED million 도 같은 자리에서 바뀐다',
    Math.round(자본달러('AED million', 1, 달러당)) === Math.round(1e6 / 3.6725));
  재다("🔴 USD'000 은 «환율을 곱하지 않는다» — 이미 달러다",
    자본달러("USD'000", 1000, 달러당) === 1e6);
  재다('🔴 단위를 모르면 null — 짐작해서 채우지 않는다',
    자본달러(null, 1000, 달러당) === null && 자본달러('', 1000, 달러당) === null);
  재다('모르는 단위 글자도 null', 자본달러('KRW thousand', 1000, 달러당) === null);
  재다('자본이 0·음수면 null', 자본달러("AED'000", 0, 달러당) === null && 자본달러("AED'000", -5, 달러당) === null);
  재다('환율이 없으면 null', 자본달러("AED'000", 1000, null) === null);

  재다('PBR 을 낸다', PBR내기(1000, 500) === 2);
  재다('🔴 PBR 이 터무니없이 크면 «비운다» — 단위를 잘못 읽은 신호다',
    PBR내기(1e9, 1000) === null);
  재다('🔴 PBR 이 터무니없이 작아도 비운다', PBR내기(1000, 1e9) === null);
  재다('경계는 받는다', PBR내기(50, 1) === 50 && PBR내기(0.05, 1) === 0.05);
  재다('시총이나 자본이 없으면 null', PBR내기(null, 500) === null && PBR내기(1000, null) === null);

  재다('거래소배수: 9할이 넘으면 그 배수를 쓴다', 거래소배수([1, 1, 1, 1, 1, 1, 1, 1, 1, 1000]) === 1);
  재다('🔴 거래소배수: 섞여 있으면 안 쓴다 (DFM 꼴)', 거래소배수([1, 1, 1000, 1000, 1000]) === null);
  재다('거래소배수: 빈 것은 null', 거래소배수([null, null]) === null);

  /* 🔴 DFM 에는 디르함이 아닌 통화로 액면을 적은 상장이 섞여 있다 */
  재다('🔴 DFM 시총: 액면이 AED 면 쓴다',
    DFM시총쓸수있나({ marketCap: '23,006,831,000', perShareValue: '1.00 AED' }).쓴다 === true);
  재다('🔴 DFM 시총: 액면이 쿠웨이트 디나르면 «안 쓴다»',
    DFM시총쓸수있나({ marketCap: '1,000', perShareValue: '0.10 K.D' }).쓴다 === false);
  재다('DFM 시총: 안 쓸 때는 까닭을 손님 말로 남긴다',
    /withheld/.test(DFM시총쓸수있나({ marketCap: '1,000', perShareValue: '0.10 K.D' }).까닭 || ''));
  재다('DFM 시총: 시총 자체가 없으면 까닭도 없다',
    DFM시총쓸수있나({ marketCap: null }).까닭 === null);

  /* 환율 — 없으면 지어내지 않는다 */
  const 환 = 환율읽기([
    { date: '2026-08-30', currency: 'US Dollar', rateVsAed: 3.6725 },
    { date: '2026-08-30', currency: 'Korean Won', rateVsAed: 0.002683 },
    { date: '2026-08-31', currency: 'US Dollar', rateVsAed: 3.6725 },
    { date: '2026-08-31', currency: 'Korean Won', rateVsAed: 0.002683 },
  ]);
  재다('환율: 가장 늦은 고시를 쓴다', 환 && 환.날짜 === '2026-08-31');
  재다('환율: 1 AED 는 약 0.272 달러', 환 && Math.abs(환.AED당달러 - 0.2723) < 0.001);
  재다('환율: 1 USD 는 약 1,369 원', 환 && Math.abs(환.usdVsAed / 환.krwVsAed - 1368.8) < 1);
  재다('🔴 환율: 한쪽만 있으면 안 쓴다',
    환율읽기([{ date: '2026-08-31', currency: 'US Dollar', rateVsAed: 3.6725 }]) === null);

  /* 한국 — 비율을 백분율로 */
  const 한 = 한국을추린다([{ ticker: 'A', nameEn: 'A', market: 'Y', roe: 0.1036, debtToEquity: 0.2994, marketCap: 1368800000000, fiscalYear: 2025 }], 1 / 1368.8);
  재다('🔴 한국: ROE 비율을 백분율로 (0.1036 → 10.36)', 한[0].r === 10.36);
  재다('한국: 시총을 달러로', 한[0].c === 1000000000);
  재다('한국: 기간은 사업연도로 적는다', 한[0].as === 'FY2025');
  재다('⛔ 한국: 없는 EPS 를 지어내지 않는다', 한[0].e === null);

  /* 나눗셈·뺄셈 — 일본의 ROE·부채비율이 이 둘 위에 선다 */
  재다('비: 나눈다', 비(10, 4) === 2.5);
  재다('⛔ 비: 0 으로 나누지 않는다 (Infinity 를 안 내보낸다)', 비(10, 0) === null);
  재다('⛔ 비: 한쪽이 없으면 null', 비(10, null) === null);
  재다('빼기: 뺀다', 빼기(10, 4) === 6);
  재다('⛔ 빼기: 없는 값을 0 으로 보지 않는다', 빼기(10, null) === null);

  const 실패 = 것.filter((x) => !x.됐나);
  console.log(`■ 자가시험 ${것.length - 실패.length}/${것.length}`);
  for (const x of 실패) console.log(`  🔴 ${x.이름}`);
  return 실패.length === 0;
}

if (process.argv.includes('--시험')) process.exit(자가시험() ? 0 : 1);
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) await 본일();
