/**
 * uae-company-page.mjs — **UAE 상장사 한 곳의 지면에 올릴 수를 만든다.** (5번, 2026-09-24)
 *
 * ── 🔴 왜 ────────────────────────────────────────────────────────────
 * 사장님 (2026-09-24): 「**에스마켓츠 나라별 작업을 빨리 끝내게 우선 서둘러.
 *   그래야 네가 많은 시간을 케이라이프맵에 쓸 수 있잖아**」
 *
 * 재 보니 일본 3,706장 · 대만 1,090장 · 한국 2,582장이 이미 서 있는데
 * **UAE 는 사이트맵에 한 장도 없었다.** 자료는 회사 111곳 · 재무 398줄이 쌓여 있었다.
 * ⇒ 자료가 있는데 지면이 없는 것은 「모으고 안 내는 것」이다(사장님: 모은 자료는 반드시 낸다).
 *
 * ── ⛔ 일본 지면에서 그대로 가져온 규율 ────────────────────────────────
 * ⛔ **** 없는 계정은 null 이고 지면은 「—」로 둔다.
 * ⛔ **바닥이 0 이면 나누지 않는다** — Infinity 를 「비율」이라 적지 않는다.
 * ⛔ **등수를 매기지 않는다.** 「우량」·「상위」를 만들지 않는다.
 * ⛔ **환율을 만들어 곱하지 않는다.** 디르함은 디르함(AED)으로 적는다.
 * ⛔ **투자 판단을 적지 않는다.**
 *
 * ── ⚠ UAE 만의 것 — 일본과 다른 자리 ──────────────────────────────────
 * ⚠ 이 자료는 **분기 공시**다(Q2 2026 처럼). 일본은 연 결산 한 줄이었다.
 *   ⇒ 「한 해 매출」이라 적지 않는다. 그 분기의 수다.
 * ⚠ `balance_sheet_reconciled` 가 false 인 줄이 있다 — 자산 = 부채 + 자본이 안 맞는다.
 *   ⛔ 그 줄의 재무상태표 수를 «맞는 것처럼» 내지 않는다. 안 맞는다고 적는다.
 * ⚠ `liabilities_derived` 가 true 면 부채를 «빼서 만든» 값이다 — 회사가 낸 수가 아니다.
 *   그 사실을 지면에 밝힌다.
 * ⚠ 거래소가 둘이다(ADX 아부다비 · DFM 두바이). 섞어 세지 않는다.
 */

/** 디르함 → 백만 디르함(AED mn). 못 재면 null */
export function 백만디르함(n) {
  if (n == null || !Number.isFinite(Number(n))) return null;
  return Number(n) / 1e6;
}

/** 바닥이 0 이거나 없으면 null — ⛔ Infinity 를 비율이라 적지 않는다 */
export function 나눔(위, 아래) {
  /* ⚠ Number(null) 은 0 이다 — 먼저 거르지 않으면 「못 잰 것」이 0 으로 둔갑한다 */
  if (위 == null || 아래 == null || 위 === '' || 아래 === '') return null;
  const a = Number(위); const b = Number(아래);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return null;
  return a / b;
}

/** 지면에 올릴 한 줄로 고친다 — 분기 공시 한 줄이다 */
export function 재무줄(행) {
  if (!행) return null;
  const 매출 = 백만디르함(행.revenue_aed);
  const 비용 = 백만디르함(행.expense_aed);
  const 순익 = 백만디르함(행.net_profit_aed);
  const 자산 = 백만디르함(행.total_assets_aed);
  const 부채 = 백만디르함(행.total_liabilities_aed);
  const 자본 = 백만디르함(행.total_equity_aed);
  const 현금 = 백만디르함(행.cash_and_equivalents_aed ?? 행.cash_aed);
  return {
    period: 행.period ?? null,
    priorPeriod: 행.prior_period ?? 행.priorPeriod ?? null,
    date: 행.date ?? null,
    revenue: 매출, expense: 비용, net: 순익,
    assets: 자산, liabilities: 부채, equity: 자본, cash: 현금,
    eps: 행.eps == null ? null : Number(행.eps),
    순이익률: 나눔(순익, 매출),
    자기자본비율: 나눔(자본, 자산),
    ROE: 나눔(순익, 자본),
    부채비율: 나눔(부채, 자본),
    /* ⚠ 이 둘은 «수»가 아니라 «그 수를 어떻게 봐야 하는가»다. 지면에 그대로 밝힌다 */
    재무상태표맞나: 행.balance_sheet_reconciled === false ? false
      : (행.balance_sheet_reconciled === true ? true : null),
    재무상태표까닭: 행.balance_sheet_reason ?? null,
    부채를빼서만들었나: 행.liabilities_derived === true,
    단위힌트: 행.unit_hint ?? null,
    원문PDF: 행.eng_pdf_url ?? null,
  };
}

/**
 * 낼 내용이 없으면 지면을 만들지 않는다 (백년지도 노하우).
 * 매출도 자산도 없는 줄은 표가 전부 「—」가 된다 — 손님에게 쓸모가 없고
 * 검색엔진에도 얇은 지면으로 읽힌다.
 */
export function 낼만한가(회사) {
  if (!회사) return false;
  if (!String(회사.symbol ?? '').trim()) return false;
  if (!String(회사.name ?? '').trim()) return false;
  const 최근 = 회사.최근 ?? 회사.latest ?? null;
  if (!최근) return false;
  return 최근.revenue_aed != null || 최근.total_assets_aed != null;
}

/**
 * 가운데값. ⛔ 빈 벌이면 null — 0 으로 메꾸지 않는다.
 * ⚠ Astro 의 getStaticPaths() 는 격리 실행이라 같은 파일 앞말의 함수를 못 본다.
 *   그 안에서 쓸 것은 반드시 모듈에 두고 import 한다(일본 지면에서 겪었다).
 */
export function 가운데값(수들) {
  const 것 = (수들 ?? []).filter((n) => n != null && Number.isFinite(n)).sort((a, b) => a - b);
  if (!것.length) return null;
  const m = Math.floor(것.length / 2);
  return 것.length % 2 ? 것[m] : (것[m - 1] + 것[m]) / 2;
}

/** 주소 조각 — 영문 이름에서 만든다. 겹치면 부르는 쪽에서 종목코드를 붙인다 */
export function 주소조각(이름) {
  return String(이름 ?? '')
    .toLowerCase()
    .replace(/\b(p\.?j\.?s\.?c|psc|plc|pjsc|llc|company|co|ltd|limited|group|holding|holdings)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || null;
}

/**
 * 111곳의 주소표를 만든다 — 겹치는 이름에만 종목코드를 붙인다(백년지도 노하우 ①).
 * ⛔ 모든 지면에 코드를 붙이지 않는다. 사람이 읽는 주소가 먼저다.
 */
export function 주소표만들기(회사들) {
  const 셈 = new Map();
  for (const c of 회사들 ?? []) {
    const s = 주소조각(c.name);
    if (!s) continue;
    셈.set(s, (셈.get(s) || 0) + 1);
  }
  const 표 = new Map();
  for (const c of 회사들 ?? []) {
    const s = 주소조각(c.name);
    if (!s) continue;
    표.set(c.symbol, 셈.get(s) > 1 ? `${s}-${String(c.symbol).toLowerCase()}` : s);
  }
  return 표;
}

/** 거래소 이름을 손님이 읽는 말로 */
export function 거래소이름(코드) {
  const t = String(코드 ?? '').toUpperCase();
  if (t === 'ADX') return 'Abu Dhabi Securities Exchange (ADX)';
  if (t === 'DFM') return 'Dubai Financial Market (DFM)';
  return null;
}
