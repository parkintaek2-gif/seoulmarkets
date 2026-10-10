#!/usr/bin/env node
/**
 * collect-twse-financials.mjs — **대만 상장사 재무제표를 받는다.** (5번, 2026-09-23)
 *
 * ── 왜 대만인가 ──────────────────────────────────────────────────────
 * 사장님: 「사우디, 상하이 외 할 곳은?」 → 재서 답했고 「응」을 받았다.
 * 대만이 1순위인 까닭 셋 —
 *   ① TWSE 가 OpenAPI 를 열쇠 없이 전면 개방했는데 **항목·회사명이 중국어**다.
 *     한국 DART 와 똑같은 「언어 장벽형 기회」이고, 우리는 그 일을 두 번 해 봤다
 *   ② 시장이 크다. 영문 수요가 큰데 전 종목 영문 파일은 얇다
 *   ③ 한계비용이 하루다 — 회사 지면·주소·업종 틀을 그대로 쓴다
 *
 * ── ⛔ 라이선스가 정한 것 (docs/대만-데이터-출처-라이선스.md) ──────────
 * ✅ openapi.twse.com.tw 만 부른다 — TWSE 가 「歡迎各位介接使用」로 연 API 다
 * ⛔ www.twse.com.tw 지면을 긁지 않는다 — 使用條款이 자동화 수집을 «그 사이트에» 금지한다
 * 🔴 출처표시가 «의무»다(OGDL 三(二)) — 빠뜨리면 허락 자체가 없던 것이 된다
 * ⛔ 원자료를 왜곡하지 않는다(不得任意增刪). 비율 계산은 파생물이라 허락된 개작이다
 *
 * ── ⛔ 이 자가 지키는 것 ─────────────────────────────────────────────
 * ⛔ 0 으로 채우지 않는다. 없는 계정은 null 이다
 * ⛔ 「대부분 받았다」로 적지 않는다 — «붙은 수 / 전체 수»를 적는다
 * ⛔ 업종 코드를 영문으로 «짐작해» 옮기지 않는다. 사전에 없으면 null 이다
 * ⚠ 손익·대차가 업종 갈래로 나뉘어 있다(일반·금융지주·증권선물·보험·이업종).
 *   다섯을 다 받아야 전량이 된다 — 하나만 받고 「다 받았다」고 하지 않는다
 *
 * 쓰는 법
 *   node scripts/collect-twse-financials.mjs --재본다      한 갈래만 불러 본다(안 적는다)
 *   node scripts/collect-twse-financials.mjs --적는다      전량을 받아 적는다
 *   node scripts/collect-twse-financials.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(fileURLToPath(import.meta.url), '..', '..');
export const 밑 = 'https://openapi.twse.com.tw/v1';

/** 손익·대차가 업종으로 갈려 있다. 다섯을 다 받아야 전량이다 */
export const 손익길 = [
  ['일반', '/opendata/t187ap06_L_ci'],
  ['금융지주', '/opendata/t187ap06_L_fh'],
  ['증권선물', '/opendata/t187ap06_L_bd'],
  ['보험', '/opendata/t187ap06_L_ins'],
  ['이업종', '/opendata/t187ap06_L_mim'],
];
export const 대차길 = [
  ['일반', '/opendata/t187ap07_L_ci'],
  ['금융지주', '/opendata/t187ap07_L_fh'],
  ['증권선물', '/opendata/t187ap07_L_bd'],
  ['보험', '/opendata/t187ap07_L_ins'],
  ['이업종', '/opendata/t187ap07_L_mim'],
];
export const 기본길 = '/opendata/t187ap03_L';

/**
 * 🔴 **업종 이름은 「없다」가 아니었다 — 내가 안 찾은 것이었다.** (2026-09-23 밤)
 *
 * 첫 판을 낼 때 기본정보의 `產業別` 이 「24」 같은 «코드»만이라, 업종 지면을 아예 안 만들고
 * 「거래소가 이름을 안 준다」고 적었다. 그 뒤 143 엔드포인트 목록을 다시 훑다가 찾았다 —
 * `t187ap14_L`(各產業EPS統計) 이 같은 회사에 **`產業別`을 「水泥工業」처럼 «이름»으로** 준다.
 *
 * ⭐ 강령 그대로다 — **「우리가 못 찾은 것을 그쪽 탓으로 적지 않는다.」**
 *   ADX 시가총액 때와 똑같은 일을 또 했다. 그때도 「아부다비가 시총을 안 낸다」고 적었었다.
 *   ⇒ 「그 출처가 안 준다」를 적기 전에 **그 출처의 엔드포인트 목록을 끝까지 읽는다.**
 */
export const 업종길 = '/opendata/t187ap14_L';

/** 시세·밸류에이션 — 이것이 붙어야 시가총액 축이 선다 */
export const 시세길 = '/exchangeReport/STOCK_DAY_ALL';
export const 밸류길 = '/exchangeReport/BWIBBU_ALL';

/** 숫자로 바꾼다. ⛔ 빈 칸·「-」를 0 으로 읽지 않는다 */
export function 수읽기(v) {
  if (v == null) return null;
  const s = String(v).replace(/[,\s]/g, '');
  if (!s || s === '-' || s === '－' || s === 'N/A') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * 민국 연호를 서기로. 「1150922」 = 민국 115년 9월 22일 = 2026-09-22.
 * ⛔ 앞 세 자리를 그냥 연도로 읽으면 115년이 된다 — 1911 을 더해야 한다.
 */
export function 민국날짜(s) {
  const t = String(s ?? '').trim();
  const m = t.match(/^(\d{3})(\d{2})(\d{2})$/);
  if (!m) return null;
  const 해 = Number(m[1]) + 1911;
  const 달 = Number(m[2]); const 날 = Number(m[3]);
  if (달 < 1 || 달 > 12 || 날 < 1 || 날 > 31) return null;
  return `${해}-${String(달).padStart(2, '0')}-${String(날).padStart(2, '0')}`;
}

/** 민국 연도만 — 「115」 → 2026 */
export function 민국해(v) {
  const n = Number(String(v ?? '').trim());
  if (!Number.isFinite(n) || n < 1 || n > 999) return null;
  return n + 1911;
}

/**
 * 🔴 **재무제표는 «천 TWD» 다. 기본정보는 «원» 이다.** 같은 API 안에서 단위가 다르다.
 *
 * 명세에는 단위가 한 줄도 안 적혀 있다. 그래서 **같은 출처 안의 두 값을 맞대어** 정했다 —
 * 기본정보의 實收資本額(원)과 대차대조표의 股本(같은 자본금)을 396곳에서 나눠 보니
 * **388곳이 정확히 1000.00** 이었다. 나머지 8곳은 그 사이 증자·감자가 있던 곳이다.
 * ⛔ 이것을 확인하지 않고 그대로 냈으면 대만 회사의 모든 수가 **1000배 작게** 나갔다.
 *   TSMC 총자산이 9.4조가 아니라 94억으로 보였을 것이다.
 *
 * ⇒ 여기서 **1000을 곱해 TWD 로 통일한다.** 한국(KRW)·일본(JPY) 테이프와 같은 꼴이 된다.
 * ⚠ 이것은 라이선스가 막는 「任意增刪」(원자료 왜곡)이 아니다 — 단위를 밝혀 적은 환산이고,
 *   OGDL 二(一)이 명시로 허락한 「改作」이다. 근거와 배수는 _meta 에 남긴다.
 */
export const 천배 = 1000;
const 천원을원으로 = (v) => (v == null ? null : v * 천배);

/** 손익 한 줄 → 우리 칸. 값은 «원(TWD)» 으로 통일해 담는다 */
export function 손익줄(r) {
  if (!r || !r.公司代號) return null;
  return {
    code: String(r.公司代號).trim(),
    name: String(r.公司名稱 ?? '').trim(),
    year: 민국해(r.年度),
    quarter: String(r.季別 ?? '').trim() || null,
    revenue_twd: 천원을원으로(수읽기(r.營業收入)),
    operating_profit_twd: 천원을원으로(수읽기(r['營業利益（損失）'])),
    pretax_profit_twd: 천원을원으로(수읽기(r['稅前淨利（淨損）'])),
    net_profit_twd: 천원을원으로(수읽기(r['本期淨利（淨損）'])),
  };
}

/**
 * 대차 한 줄 → 우리 칸. 값은 «원(TWD)» 으로 통일해 담는다.
 * ⚠ 每股參考淨值(주당 순자산)만은 «원» 그대로다 — 한 주에 몇 원인지를 적는 칸이라
 *   천 단위로 적을 까닭이 없다. 실제로 TSMC 가 150 원대로 나온다. 여기에 1000을 곱하면
 *   주당 순자산이 15만 원이 되어 주가보다 커진다. **칸마다 단위를 따로 본다.**
 */
export function 대차줄(r) {
  if (!r || !r.公司代號) return null;
  return {
    code: String(r.公司代號).trim(),
    year: 민국해(r.年度),
    quarter: String(r.季別 ?? '').trim() || null,
    assets_twd: 천원을원으로(수읽기(r.資產總計)),
    liabilities_twd: 천원을원으로(수읽기(r.負債總計)),
    equity_twd: 천원을원으로(수읽기(r.權益總計)),
    capital_stock_twd: 천원을원으로(수읽기(r.股本)),
    bps_twd: 수읽기(r.每股參考淨值),   /* ⛔ 이 칸은 곱하지 않는다 */
  };
}

/**
 * 업종 이름 한자 → 영문. **거래소가 낸 이름을 옮기는 것**이지 코드에 이름을 «붙이는» 것이 아니다.
 * ⛔ 사전에 없는 한자 이름은 null 로 둔다 — 지면은 한자를 그대로 내보인다. 지어내지 않는다.
 * ⚠ 한자 이름을 지면에 «함께» 남긴다. 옮긴 말이 틀렸을 때 손님이 원래 이름으로 확인할 수 있다.
 */
export const 업종사전 = {
  水泥工業: 'Cement',
  食品工業: 'Food',
  塑膠工業: 'Plastics',
  紡織纖維: 'Textiles',
  電機機械: 'Electrical machinery',
  電器電纜: 'Electrical appliances and cable',
  化學工業: 'Chemicals',
  生技醫療業: 'Biotechnology and healthcare',
  玻璃陶瓷: 'Glass and ceramics',
  造紙工業: 'Paper and pulp',
  鋼鐵工業: 'Iron and steel',
  橡膠工業: 'Rubber',
  汽車工業: 'Automobiles',
  半導體業: 'Semiconductors',
  電腦及週邊設備業: 'Computers and peripherals',
  光電業: 'Optoelectronics',
  通信網路業: 'Communications and networking',
  電子零組件業: 'Electronic components',
  電子通路業: 'Electronics distribution',
  資訊服務業: 'Information services',
  其他電子業: 'Other electronics',
  建材營造: 'Building materials and construction',
  航運業: 'Shipping and transport',
  觀光餐旅: 'Tourism, hotels and catering',
  金融保險業: 'Finance and insurance',
  貿易百貨: 'Trading and department stores',
  油電燃氣業: 'Oil, gas and electricity',
  綠能環保: 'Green energy and environmental services',
  數位雲端: 'Digital and cloud services',
  運動休閒: 'Sport and leisure',
  居家生活: 'Home and living',
  其他: 'Other',
};

/**
 * 원자료에 **글자가 깨진 이름이 섞여 온다** — 오늘 「���技醫療業」 한 줄이 왔다(1,084 중 1곳).
 * 깨진 앞머리를 빼고 뒤를 맞춰 본다. **꼭 하나만 걸릴 때에만** 그것으로 본다 —
 * 둘 이상 걸리면 못 쟀다고 적고 null 로 둔다. ⛔ 「비슷하니까」로 고르지 않는다.
 */
export function 업종이름고치기(이름, 사전 = 업종사전) {
  const s = String(이름 ?? '').trim();
  if (!s) return null;
  if (Object.prototype.hasOwnProperty.call(사전, s)) return s;
  const 성한꼬리 = s.replace(/^[^\p{Script=Han}]+/u, '');
  if (!성한꼬리 || 성한꼬리 === s) return null;
  const 맞는것 = Object.keys(사전).filter((k) => k.endsWith(성한꼬리));
  return 맞는것.length === 1 ? 맞는것[0] : null;
}

/** 업종 한 줄 → { code, industry_zh, industry_en } */
export function 업종줄(r, 사전 = 업종사전) {
  if (!r || !r.公司代號) return null;
  const 고친 = 업종이름고치기(r.產業別, 사전);
  return {
    code: String(r.公司代號).trim(),
    industry_zh: 고친,
    industry_en: 고친 ? (사전[고친] ?? null) : null,
  };
}

/** 시세 한 줄 → { code, close_twd, price_date, trade_value_twd } */
export function 시세줄(r) {
  if (!r || !r.Code) return null;
  return {
    code: String(r.Code).trim(),
    close_twd: 수읽기(r.ClosingPrice),
    price_date: 민국날짜(r.Date),
    trade_value_twd: 수읽기(r.TradeValue),
  };
}

/** 밸류에이션 한 줄 → { code, per, pbr, dividend_yield_pct } */
export function 밸류줄(r) {
  if (!r || !r.Code) return null;
  return {
    code: String(r.Code).trim(),
    per: 수읽기(r.PEratio),
    pbr: 수읽기(r.PBratio),
    dividend_yield_pct: 수읽기(r.DividendYield),
  };
}

/**
 * 시가총액 = 종가 × 발행주식수. ⛔ 둘 중 하나라도 없으면 null — 만들지 않는다.
 *
 * 🔴 그리고 **낸 값을 다른 길로 한 번 검산한다.** 주가는 PBR × 주당순자산으로도 서는데,
 *   두 길이 크게 어긋나면 어느 한쪽이 틀린 것이다(주식수가 옛것이거나 우선주가 섞였거나).
 *   실측 — TSMC 종가 2,460.00 · PBR 9.92 × 주당순자산 248.05 = 2,460.7. 0.03% 차이였다.
 *   ⇒ 어긋남이 큰 곳은 «수를 고치지 않고» 표시만 남긴다. 고치면 그것이 지어낸 수가 된다.
 */
export function 시가총액(종가, 주식수) {
  if (종가 == null || 주식수 == null) return null;
  if (!Number.isFinite(종가) || !Number.isFinite(주식수) || 종가 <= 0 || 주식수 <= 0) return null;
  return 종가 * 주식수;
}

/** 두 길로 잰 주가가 얼마나 어긋나나. 못 재면 null */
export function 주가어긋남(종가, pbr, bps) {
  if (종가 == null || pbr == null || bps == null) return null;
  const 딴길 = pbr * bps;
  if (!Number.isFinite(딴길) || 딴길 <= 0 || !Number.isFinite(종가) || 종가 <= 0) return null;
  return Math.abs(종가 - 딴길) / 딴길;
}

/** 회사 기본정보 한 줄 → 우리 칸. ⛔ 영문 이름이 없으면 null — 지어내지 않는다 */
export function 기본줄(r) {
  if (!r || !r.公司代號) return null;
  const 영문 = String(r.英文簡稱 ?? '').trim();
  return {
    code: String(r.公司代號).trim(),
    name: String(r.公司名稱 ?? '').trim(),
    name_en: 영문 || null,
    industry_code: String(r.產業別 ?? '').trim() || null,
    listed_on: 민국날짜(r.上市日期),
    founded_on: 민국날짜(r.成立日期),
    paid_in_capital_twd: 수읽기(r.實收資本額),
    shares: 수읽기(r.已發行普通股數或TDR原股發行股數),
    chairman: String(r.董事長 ?? '').trim() || null,
    /* 🔴 [2026-10-11 01:5x · 5번] **總經理를 버리고 있었다.**
     *   「who is the ceo of …」가 우리 회사 지면으로 이미 10.3위에 뜨는데,
     *   대만 지면에는 「Chair」 한 줄뿐이고 **CEO 라는 말이 없었다.**
     *   대만에서 CEO 자리에 가장 가까운 것은 **總經理**(President / General Manager)다.
     *   자료에 처음부터 있었다 — 받아 두고 안 담았을 뿐이다.
     * ⛔ 이름은 한자 그대로 담는다. 로마자를 지어내지 않는다 —
     *   중국어 이름은 병음·웨이드자일스·본인 표기가 다 다르다(일본과 같은 까닭). */
    president: String(r.總經理 ?? '').trim() || null,
    website: String(r.網址 ?? '').trim() || null,
  };
}

/**
 * 종목코드로 묶어 한 줄로 만든다.
 * ⚠ 뒤에 오는 벌은 «있는 칸만» 덮어쓴다 — null 로 앞의 값을 지우지 않는다.
 */
export function 합치기(기본들, 손익들, 대차들, 곁들 = []) {
  const 표 = new Map();
  for (const b of (기본들 ?? [])) { if (b?.code) 표.set(b.code, { ...b }); }
  for (const i of (손익들 ?? [])) {
    if (!i?.code) continue;
    const 것 = 표.get(i.code) ?? { code: i.code, name: i.name, name_en: null };
    표.set(i.code, { ...것, ...i, name: 것.name || i.name });
  }
  for (const b of (대차들 ?? [])) {
    if (!b?.code) continue;
    const 것 = 표.get(b.code);
    if (!것) { 표.set(b.code, { ...b }); continue; }
    표.set(b.code, { ...것, ...b, year: 것.year ?? b.year, quarter: 것.quarter ?? b.quarter });
  }
  /* 곁벌(업종 이름·시세·밸류) — ⛔ 상장만 하고 재무를 안 낸 종목은 «새로 만들지 않는다».
     시세 벌에는 ETF·수익증권까지 1,381 종목이 들어 있어, 새로 만들면 회사가 아닌 것이 섞인다. */
  for (const 벌 of (곁들 ?? [])) {
    for (const x of (벌 ?? [])) {
      if (!x?.code) continue;
      const 것 = 표.get(x.code);
      if (!것) continue;
      for (const [k, v] of Object.entries(x)) { if (k !== 'code' && v != null) 것[k] = v; }
    }
  }
  return [...표.values()].sort((a, b) => String(a.code).localeCompare(String(b.code)));
}

async function 받기(길) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 30000);
  try {
    const r = await fetch(밑 + 길, {
      signal: ac.signal,
      headers: { 'user-agent': 'SeoulMarkets/1.0 (data journalism; contact seoulmarkets.com)' },
    });
    clearTimeout(t);
    if (!r.ok) return null;
    const j = await r.json();
    return Array.isArray(j) ? j : null;
  } catch { clearTimeout(t); return null; }
}

/* ── 자가시험 ─────────────────────────────────────────────── */
if (process.argv.includes('--자가시험')) {
  const 잰다 = [];
  const 본다 = (이름, v) => 잰다.push([이름, !!v]);

  본다('쉼표를 뗀다', 수읽기('1,234,567') === 1234567);
  본다('음수도 읽는다', 수읽기('-1,234') === -1234);
  본다('🔴 ⛔ 빈 칸은 null — 0 으로 안 읽는다', 수읽기('') === null && 수읽기(null) === null);
  본다('⛔ 「-」도 null', 수읽기('-') === null && 수읽기('－') === null);
  본다('0 은 0 이다', 수읽기('0') === 0);

  본다('🔴 민국 연호를 서기로 — 1150922 = 2026-09-22', 민국날짜('1150922') === '2026-09-22');
  본다('민국 39년도 읽는다', 민국날짜('0391229') === '1950-12-29');
  본다('⛔ 꼴이 틀리면 null', 민국날짜('2026-09-22') === null && 민국날짜('') === null);
  본다('⛔ 없는 달은 null', 민국날짜('1151322') === null);
  본다('민국 해만도 읽는다', 민국해('115') === 2026 && 민국해(114) === 2025);
  본다('⛔ 빈 해는 null', 민국해('') === null && 민국해(null) === null);

  const 손 = 손익줄({ 公司代號: '1101', 公司名稱: '臺灣水泥股份有限公司', 年度: '115', 季別: '2',
    營業收入: '123,456', '營業利益（損失）': '-1,000', '本期淨利（淨損）': '2,000', '稅前淨利（淨損）': '' });
  본다('🔴 손익은 천 TWD 라 1000을 곱해 원으로 담는다', 손.revenue_twd === 123456000);
  본다('해·분기를 읽는다', 손.year === 2026 && 손.quarter === '2');
  본다('적자도 곱해서 음수로', 손.operating_profit_twd === -1000000);
  본다('🔴 ⛔ 빈 칸은 null 로 남는다 — 0 에 1000을 곱하지 않는다', 손.pretax_profit_twd === null);
  본다('⛔ 코드가 없으면 null', 손익줄({ 公司名稱: 'x' }) === null && 손익줄(null) === null);

  const 대 = 대차줄({ 公司代號: '1101', 年度: '115', 資產總計: '9,000', 權益總計: '4,000',
    負債總計: '5,000', 股本: '77,231,817', 每股參考淨值: '152.34' });
  본다('🔴 대차도 천 TWD 라 곱한다', 대.assets_twd === 9000000 && 대.equity_twd === 4000000);
  본다('자본금도 곱한다 — 기본정보의 實收資本額과 같은 값이 된다', 대.capital_stock_twd === 77231817000);
  본다('🔴 ⛔ 주당 순자산은 «곱하지 않는다» — 한 주에 몇 원인지를 적는 칸이다',
    대.bps_twd === 152.34);

  const 기 = 기본줄({ 公司代號: '1101', 公司名稱: '臺灣水泥股份有限公司', 英文簡稱: 'TCC',
    產業別: '01', 上市日期: '0510209', 實收資本額: '77231817420' });
  본다('기본을 읽는다', 기.name_en === 'TCC' && 기.industry_code === '01');
  본다('상장일을 서기로', 기.listed_on === '1962-02-09');
  본다('🔴 ⛔ 영문 이름이 없으면 null — 지어내지 않는다',
    기본줄({ 公司代號: 'x', 英文簡稱: '  ' }).name_en === null);

  const 합 = 합치기([기], [손], [대]);
  본다('셋을 한 줄로 묶는다', 합.length === 1 && 합[0].name_en === 'TCC'
    && 합[0].revenue_twd === 123456000 && 합[0].assets_twd === 9000000);
  본다('⛔ 빈 것에 안 터진다', 합치기(null, null, null).length === 0);
  본다('기본이 없어도 재무만으로 줄이 선다', 합치기([], [손], []).length === 1);
  본다('차례가 종목코드순이다', (() => {
    const x = 합치기([{ code: '2330' }, { code: '1101' }], [], []);
    return x[0].code === '1101';
  })());

  본다('🔴 손익 갈래가 다섯이다 — 하나만 받고 다 받았다고 하지 않는다', 손익길.length === 5);
  본다('🔴 대차 갈래도 다섯이다', 대차길.length === 5);
  본다('⛔ openapi 만 부른다 — www 를 긁지 않는다',
    밑.startsWith('https://openapi.twse.com.tw') && !/\/\/www\./.test(밑));

  /* ── 업종 이름 ── */
  본다('🔴 업종 이름을 한자로 받아 영문으로 옮긴다',
    업종줄({ 公司代號: '1101', 產業別: '水泥工業' }).industry_en === 'Cement');
  본다('한자 이름을 함께 남긴다',
    업종줄({ 公司代號: '1101', 產業別: '水泥工業' }).industry_zh === '水泥工業');
  본다('🔴 깨진 이름도 «꼭 하나»만 걸리면 살린다',
    업종이름고치기('���技醫療業') === '生技醫療業');
  본다('🔴 ⛔ 둘 이상 걸리면 못 쟀다 — 비슷하다고 고르지 않는다',
    업종이름고치기('�工業', { 水泥工業: 'A', 化學工業: 'B' }) === null);
  본다('⛔ 사전에 없는 이름은 null — 지어내지 않는다',
    업종줄({ 公司代號: 'x', 產業別: '없는업종' }).industry_en === null);
  본다('⛔ 빈 것에 안 터진다', 업종줄(null) === null && 업종이름고치기(null) === null);
  /* 오늘 원자료의 서로 다른 產業別 33 가지 가운데 하나는 «글자가 깨진» 生技醫療業이다.
     그래서 성한 이름은 32 가지이고 사전도 32 개다. ⛔ 33 으로 세지 않는다. */
  본다('사전이 성한 이름 32 갈래를 다 덮는다', Object.keys(업종사전).length === 32);

  /* ── 시세·밸류 ── */
  const 시 = 시세줄({ Code: '2330', ClosingPrice: '2460.00', Date: '1150922', TradeValue: '54678491997' });
  본다('🔴 종가를 읽는다', 시.close_twd === 2460 && 시.price_date === '2026-09-22');
  본다('⛔ 빈 종가는 null — 0 으로 안 읽는다', 시세줄({ Code: 'x', ClosingPrice: '' }).close_twd === null);
  const 밸 = 밸류줄({ Code: '2330', PEratio: '28.52', PBratio: '9.92', DividendYield: '1.23' });
  본다('PER·PBR·배당수익률을 읽는다', 밸.per === 28.52 && 밸.pbr === 9.92 && 밸.dividend_yield_pct === 1.23);
  본다('⛔ PER 이 빈 곳이 있다 — null 로 둔다', 밸류줄({ Code: 'x', PEratio: '' }).per === null);

  /* ── 시가총액과 그 검산 ── */
  본다('시가총액 = 종가 × 주식수', 시가총액(2460, 25932370067) === 2460 * 25932370067);
  본다('🔴 ⛔ 하나라도 없으면 null — 만들지 않는다',
    시가총액(null, 100) === null && 시가총액(2460, null) === null);
  본다('⛔ 0 이나 음수면 null', 시가총액(0, 100) === null && 시가총액(-1, 100) === null);
  본다('🔴 두 길로 잰 주가가 맞는지 본다 — TSMC 는 0.1% 안이었다',
    주가어긋남(2460, 9.92, 248.05) < 0.001);
  본다('많이 어긋나면 그 수가 나온다', 주가어긋남(100, 1, 200) === 0.5);
  본다('⛔ 못 재면 null', 주가어긋남(null, 1, 2) === null && 주가어긋남(100, null, 2) === null);

  /* ── 합치기 ── */
  const 곁합 = 합치기(
    [{ code: '1101', name_en: 'TCC' }],
    [{ code: '1101', revenue_twd: 1 }],
    [{ code: '1101', bps_twd: 30.86 }],
    [[{ code: '1101', industry_en: 'Cement' }], [{ code: '9999', close_twd: 1 }]],
  );
  본다('곁벌이 붙는다', 곁합.length === 1 && 곁합[0].industry_en === 'Cement');
  본다('🔴 ⛔ 재무가 없는 종목을 곁벌이 «새로 만들지» 않는다 (시세 벌엔 ETF 가 섞인다)',
    !곁합.some((r) => r.code === '9999'));
  본다('⛔ 곁벌의 null 이 앞의 값을 지우지 않는다',
    합치기([{ code: 'a', name_en: 'A' }], [], [], [[{ code: 'a', name_en: null }]])[0].name_en === 'A');

  const 진 = 잰다.filter(([, v]) => !v);
  for (const [이름, v] of 잰다) console.log(`${v ? '✅' : '🔴'} ${이름}`);
  console.log(진.length ? `\n🔴 ${진.length}/${잰다.length} 떨어졌다` : `\n✅ 자가시험 ${잰다.length} 통과`);
  process.exit(진.length ? 1 : 0);
}

/* ── 실제로 받는다 ────────────────────────────────────────── */
{
  const 적나 = process.argv.includes('--적는다');
  const 재보나 = process.argv.includes('--재본다');
  if (!적나 && !재보나) {
    console.log('⛔ --재본다 나 --적는다 를 붙인다.');
    process.exit(1);
  }

  console.log('■ 대만 TWSE OpenAPI — 상장사 재무제표');
  console.log('  ⛔ www.twse.com.tw 를 긁지 않는다. openapi 만 부른다 (使用條款)');

  if (재보나) {
    const 한갈래 = await 받기(손익길[0][1]);
    console.log(`\n■ 재보기 — ${손익길[0][0]} 손익 ${한갈래 ? `${한갈래.length}행 받았다` : '🔴 못 받았다'}`);
    if (한갈래?.length) {
      const 줄 = 손익줄(한갈래[0]);
      console.log(`   맨 앞: ${줄.code} ${줄.name} · ${줄.year}년 ${줄.quarter}분기 · 매출 ${줄.revenue_twd}`);
    }
    console.log('   ⇒ --적는다 를 붙이면 전량을 받는다.');
    process.exit(한갈래 ? 0 : 1);
  }

  const 기본원 = await 받기(기본길);
  if (!기본원) { console.log('🔴 회사 기본정보를 못 받았다 — 여기서 멈춘다'); process.exit(1); }
  console.log(`\n■ 회사 기본정보 ${기본원.length}곳`);

  const 손익원 = []; const 대차원 = [];
  for (const [이름, 길] of 손익길) {
    const j = await 받기(길);
    console.log(`  손익 ${이름.padEnd(6)} ${j ? String(j.length).padStart(5) + '행' : '🔴 못 받았다'}`);
    if (j) 손익원.push(...j);
  }
  for (const [이름, 길] of 대차길) {
    const j = await 받기(길);
    console.log(`  대차 ${이름.padEnd(6)} ${j ? String(j.length).padStart(5) + '행' : '🔴 못 받았다'}`);
    if (j) 대차원.push(...j);
  }

  const 업종원 = await 받기(업종길);
  console.log(`  업종 이름   ${업종원 ? String(업종원.length).padStart(5) + '행' : '🔴 못 받았다'}`);
  const 시세원 = await 받기(시세길);
  console.log(`  시세        ${시세원 ? String(시세원.length).padStart(5) + '행' : '🔴 못 받았다'}`);
  const 밸류원 = await 받기(밸류길);
  console.log(`  PER·PBR     ${밸류원 ? String(밸류원.length).padStart(5) + '행' : '🔴 못 받았다'}`);

  const 줄들 = 합치기(
    기본원.map(기본줄).filter(Boolean),
    손익원.map(손익줄).filter(Boolean),
    대차원.map(대차줄).filter(Boolean),
    [
      (업종원 ?? []).map((r) => 업종줄(r)).filter(Boolean),
      (시세원 ?? []).map(시세줄).filter(Boolean),
      (밸류원 ?? []).map(밸류줄).filter(Boolean),
    ],
  );

  /* 시가총액 — ⛔ 둘 중 하나라도 없으면 null. 그리고 다른 길로 검산해 어긋남을 «표시만» 남긴다 */
  let 많이어긋남 = 0;
  for (const r of 줄들) {
    r.market_cap_twd = 시가총액(r.close_twd ?? null, r.shares ?? null);
    const 어긋 = 주가어긋남(r.close_twd ?? null, r.pbr ?? null, r.bps_twd ?? null);
    r.price_cross_check = 어긋 == null ? null : Number(어긋.toFixed(4));
    if (어긋 != null && 어긋 > 0.05) 많이어긋남 += 1;
  }

  /* ⛔ 「대부분 받았다」로 적지 않는다 — 붙은 수 / 전체 수 */
  const 잰다 = (f) => 줄들.filter(f).length;
  const 매출있음 = 잰다((r) => r.revenue_twd != null);
  const 자산있음 = 잰다((r) => r.assets_twd != null);
  const 영문있음 = 잰다((r) => r.name_en);
  const 업종있음 = 잰다((r) => r.industry_zh);
  const 영문업종 = 잰다((r) => r.industry_en);
  const 종가있음 = 잰다((r) => r.close_twd != null);
  const 시총있음 = 잰다((r) => r.market_cap_twd != null);
  const PER있음 = 잰다((r) => r.per != null);
  const 검산한곳 = 잰다((r) => r.price_cross_check != null);
  console.log(`\n■ 합쳐서 ${줄들.length}곳`);
  console.log(`   매출 ${매출있음}/${줄들.length} · 자산 ${자산있음}/${줄들.length} · 영문 이름 ${영문있음}/${줄들.length}`);
  console.log(`   업종 이름 ${업종있음}/${줄들.length} (영문으로 옮긴 곳 ${영문업종})`);
  console.log(`   종가 ${종가있음}/${줄들.length} · 시가총액 ${시총있음}/${줄들.length} · PER ${PER있음}/${줄들.length}`);
  console.log(`   🔴 주가 검산 — ${검산한곳}곳을 «종가» 대 «PBR × 주당순자산» 두 길로 맞대어 봤다`);
  console.log(`      5% 넘게 어긋난 곳 ${많이어긋남}곳 — ⛔ 수를 고치지 않고 표시만 남긴다`);

  const 오늘 = new Date().toLocaleDateString('sv-SE');
  const 원본방 = path.join(뿌리, 'archive', 'raw', 'twse-financials');
  fs.mkdirSync(원본방, { recursive: true });
  fs.writeFileSync(path.join(원본방, `twse-${오늘.replace(/-/g, '')}.json`),
    JSON.stringify({ 기본: 기본원, 손익: 손익원, 대차: 대차원, 업종: 업종원, 시세: 시세원, 밸류: 밸류원 }), 'utf8');

  const 테이프 = {
    _meta: {
      출처: '臺灣證券交易所 (TWSE) OpenAPI',
      이용허락범위: '政府資料開放授權條款 第1版 (OGDL-Taiwan 1.0) — 상업적 이용 가능, 출처표시 의무',
      라이선스주소: 'https://data.gov.tw/license',
      지은때: new Date().toLocaleString('ko-KR'),
      단위: '신대만달러(TWD) — 원 단위',
      단위주석: '🔴 원자료의 손익·대차는 «천 TWD» 다(명세에 단위 표기가 없어 검산으로 정했다). '
        + '기본정보의 實收資本額(원)과 대차대조표의 股本(같은 자본금)을 396곳에서 나눠 보니 '
        + '388곳이 정확히 1000.00 이었다. 그래서 손익·대차에 1000을 곱해 원 단위로 통일했다. '
        + '⛔ 每股參考淨值(주당 순자산)는 원래 원 단위라 곱하지 않았다.',
      기간주석: '🔴 손익은 «그 분기»가 아니라 «연초부터의 누계»다. 季別=2 는 상반기 여섯 달이다. '
        + '대차는 그 분기 «말» 시점 값이다. 中華電信(연 매출 약 230bn)이 121.4bn 으로 나와 판정했다 — '
        + '한 분기라면 58bn 이어야 한다.',
      시가총액주석: '시가총액 = 종가 × 발행주식수. 둘 중 하나가 없으면 null 이고 만들지 않았다. '
        + '낸 값을 «PBR × 주당순자산»이라는 다른 길로 검산해 price_cross_check 에 어긋난 비율을 남겼다 — '
        + '⛔ 어긋나도 수를 고치지 않는다. 고치면 그것이 지어낸 수가 된다.',
      업종주석: '업종 이름은 t187ap14_L(各產業EPS統計)이 한자로 준다. 우리는 그 이름을 영문으로 옮겨 '
        + 'industry_en 에 담고, 원래 한자를 industry_zh 에 남겨 지면에 함께 낸다. '
        + '⛔ 사전에 없는 이름은 null 이다 — 코드에 업종명을 짐작해 붙이지 않는다.',
      메모: '회사마다 가장 최근 분기 한 줄. 빈 칸은 null 이고 0 으로 메꾸지 않았다. '
        + '손익·대차는 업종 갈래 다섯(일반·금융지주·증권선물·보험·이업종)을 모두 받아 합쳤다.',
    },
    rows: 줄들,
  };
  const 테이프길 = path.join(뿌리, 'src', 'data', 'taiwan-financials-tape.json');
  fs.writeFileSync(테이프길, JSON.stringify(테이프), 'utf8');
  console.log(`📁 적었다 — ${path.relative(뿌리, 테이프길)}`);
  console.log(`📁 원본 — archive/raw/twse-financials/twse-${오늘.replace(/-/g, '')}.json`);
}
