#!/usr/bin/env node
/**
 * build-japan-financials-tape.mjs — 일본 재무제표를 **한 장의 탭**으로 묶는다.
 *
 *   node scripts/build-japan-financials-tape.mjs            재기만 한다
 *   node scripts/build-japan-financials-tape.mjs --적는다
 *   node scripts/build-japan-financials-tape.mjs --자가시험
 *
 * ── 왜 «탭»인가 ───────────────────────────────────────────────────────────
 * 한국은 `src/data/korea-financials-tape.json` 한 장(8,127행)으로 지면·API·스크리너가
 * 전부 돈다. 일본도 **같은 꼴**이어야 한 화면에서 나란히 놓고 견줄 수 있다.
 * ⛔ 나라마다 다른 꼴로 쌓으면 「아시아 마켓츠」라고 말할 수 없다 — 견주지를 못한다.
 *
 * ── 2026-09-21 실측 ──────────────────────────────────────────────────────
 * ```
 * 받은 서류        3,681건 (250 영업일)
 * 고유 종목코드    3,672  ← 상장 3,818사의 96.2%
 * 채움률           순이익 100% · 자산 100% · 자본 100% · 영업이익 98.4% · 매출 91.8%
 * ```
 * ⛔ 매출이 91.8% 인 것은 «은행·보험»이 NetSales 대신 경상수익을 쓰기 때문이다.
 *   빈 것을 0 으로 메꾸지 않는다 — null 로 두고 몇 곳이 비었는지 적는다.
 *
 * 출처 — 금융청 EDINET. 공공데이터 이용규약(PDL1.0), 상업적 이용 가능, 출처 표시.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { 대표자가르기 } from '../src/lib/japan-exec-title.mjs';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 자료방 = path.join(뿌리, 'archive', 'raw', 'japan-edinet-financials');
const 낼곳 = path.join(뿌리, 'src', 'data', 'japan-financials-tape.json');
const 적는다 = process.argv.includes('--적는다');

/**
 * 🔴 [2026-09-22] **서류가 적어 낸 영문명에 HTML 기호가 그대로 들어 있다.**
 *
 * 라이브 화면에 「MITSUI &amp;amp; CO., LTD.」로 나갔다. 원자료를 보니 EDINET CSV 가
 * 이미 `&amp;` 로 적어 보낸다 — 75곳이 그렇다(K&O·AKIKAWA FOODS & FARMS …).
 * 그걸 그대로 두고 지면이 한 번 더 감싸니 손님 눈에 `&amp;` 가 보인다.
 *
 * ⛔ 지면 쪽 감싸기를 끄지 않는다 — 그것을 끄면 다른 이름으로 태그를 심을 수 있다.
 * ✅ **들어올 때 푼다.** 자료에는 사람이 읽는 글자를 담고, 감싸기는 지면이 한 번만 한다.
 */
export function 엔티티풀기(s) {
  if (s == null) return null;
  const 표 = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  let 글 = String(s);
  /* 두 겹(`&amp;amp;`)도 있으므로 더 안 바뀔 때까지 푼다. ⛔ 무한히 돌지 않게 횟수를 묶는다 */
  for (let n = 0; n < 4; n++) {
    const 전 = 글;
    글 = 글.replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (_, k) => 표[k])
      .replace(/&#(\d{1,6});/g, (_, d) => String.fromCodePoint(Number(d)))
      .replace(/&#x([0-9a-fA-F]{1,6});/g, (_, h) => String.fromCodePoint(parseInt(h, 16)));
    if (글 === 전) break;
  }
  return 글.trim() || null;
}

/** 결산 연도 — period_end 의 앞 네 자리 */
export function 결산해(period_end) {
  const m = /^(\d{4})-/.exec(String(period_end || ''));
  return m ? Number(m[1]) : null;
}

/**
 * 같은 회사가 여러 번 나오면 **가장 최근 결산**을 쓴다.
 * ⚠ 250일치를 받으면 3월 결산 회사가 2025·2026 두 해로 들어온다.
 *   ⛔ 둘 다 남기면 스크리너에서 한 회사가 두 줄이 된다.
 */
export function 최신만(줄들) {
  const 집 = new Map();
  for (const r of 줄들 || []) {
    if (!r?.code) continue;
    const 전 = 집.get(r.code);
    if (!전 || (r.period_end || '') > (전.period_end || '')) 집.set(r.code, r);
  }
  return [...집.values()].sort((a, b) => String(a.code).localeCompare(String(b.code)));
}

/**
 * 🔴 [2026-09-22] **검산 — 두 수를 곱해 셋째 수와 맞는지 본다.**
 *
 * 발행주식수 × 주당순자산(BPS) 은 «자본»이 되어야 한다. 주당이익(EPS) × 주식수는 «순이익»이다.
 * 어긋나면 그 회사의 그 칸은 «쓰지 않는다» — 0 으로 메꾸지도, 그냥 싣지도 않는다.
 *
 * ⚠ UAE 에서 이 셈이 깨졌던 까닭은 «기간 어긋남»이었다(순이익은 분기, EPS 는 연 누계).
 *   일본은 연간 유가증권보고서라 같은 표의 같은 기간이지만, 그래도 잰다.
 * ⚠ 자기주식·우선주·기중 증자 때문에 완전히 딱 맞지는 않는다 — 그래서 선을 10% 로 둔다.
 *   실측(S100Z2KC)은 어긋남 0.6% 였다.
 */
/**
 * 🔴🔴 [2026-09-22 · 고침] **선을 10% 로 두었더니 도요타·혼다가 통째로 빠졌다.**
 *
 * 실측 — 도요타(7203) 발행주식수 15,794,987,000 × 주당순자산 1,815.72 = **28.68조엔**,
 * 그런데 우리가 든 자본은 **23.66조엔**. 21% 어긋난다. 어느 쪽도 «틀리지» 않았다 —
 * ```
 *   자본 23.66조   jppfs_cor:NetAssets · 連結이 아니라 «個別»(모회사 단독) 값이다
 *   BPS 1,815.72  경영지표 요약의 «연결» 주당순자산
 * ```
 * 곧 **회계기준이 달라서 생긴 차이**이지 자료가 깨진 것이 아니다. 큰 그룹일수록 벌어진다.
 *
 * ⛔ 이 자가 막아야 하는 것은 «단위 사고»다 — 천 원 단위를 원 단위로 읽는 따위.
 *   그런 사고는 1,000배로 어긋난다. 21% 로는 안 어긋난다.
 * ⇒ 선을 «배수»로 다시 잡는다. 3배 넘게 벌어지면 버리고, 그 안이면 싣는다.
 * ⚠ 그 대신 지면이 「결산일 값이고 기준이 섞일 수 있다」를 말한다 — 감추지 않는다.
 */
export const 검산배수 = 3;
export function 검산맞나(가, 나, 맞을것, 배수 = 검산배수) {
  const 수 = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  const [a, b, c] = [수(가), 수(나), 수(맞을것)];
  if (a === null || b === null || c === null) return null;   /* ⛔ 못 쟀으면 «모른다» — 거짓이 아니다 */
  if (c === 0) return null;
  /* 부호가 다르면(적자 vs 흑자) 견줄 수 없다 — «모른다»로 둔다 */
  const 곱 = a * b;
  if (곱 === 0) return null;
  if ((곱 > 0) !== (c > 0)) return null;
  const 비 = Math.abs(곱 / c);
  return 비 <= 배수 && 비 >= 1 / 배수;
}

/**
 * 🔴 [2026-09-22] **결산일 주가를 세운다 — PER × EPS.**
 *
 * 유가증권보고서 「経営指標等」이 주가수익률(PER)을 싣는다. PER 은 «주가 ÷ 주당이익»이므로
 * 거꾸로 곱하면 그 회사가 스스로 적어 낸 **결산일 주가**가 나온다. 밖에서 시세를 사 올 필요가 없다.
 *
 * ⛔ 「현재가」가 아니다. 결산일(period_end) 값이다 — 지면에 그 날짜를 함께 낸다.
 * ⛔ EPS 가 0 이거나 음수(적자)면 PER 이 뜻을 잃는다. 그 줄은 주가를 «안» 세운다.
 * ⛔ PER 이 음수로 적혀 온 것도 안 쓴다.
 */
export function 결산일주가(per, eps) {
  const 수 = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  const [p, e] = [수(per), 수(eps)];
  if (p === null || e === null) return null;
  if (p <= 0 || e <= 0) return null;
  return p * e;
}

/** 한 서류를 탭 한 줄로 */
export function 한줄(d, 명부 = new Map()) {
  if (!d?.sec_code) return null;
  const 딸림 = 명부.get(String(d.sec_code)) || {};
  const 바탕 = d._근거?.net_profit_jpy?.연결개별 || d._근거?.assets_jpy?.연결개별 || null;
  /* 검산이 «거짓»일 때만 버린다. null(못 쟀다)이면 그대로 싣는다 */
  const 자본검산 = 검산맞나(d.shares, d.bps_jpy, d.equity_jpy);
  const 이익검산 = 검산맞나(d.shares, d.eps_jpy, d.net_profit_jpy);
  const 주식수 = 자본검산 === false ? null : (d.shares ?? null);
  const bps = 자본검산 === false ? null : (d.bps_jpy ?? null);
  const eps = 이익검산 === false ? null : (d.eps_jpy ?? null);
  const 주가 = 결산일주가(d.per, eps);
  return {
    code: String(d.sec_code),
    edinet_code: d.edinet_code ?? null,
    name: d.name ?? null,
    /* 🔴 [2026-09-22] **서류가 적어 낸 영문명을 명부보다 먼저 쓴다.**
       명부(EDINET 코드리스트)는 403곳이 영문명 빈칸이다 — 유초은행조차 비어 있다.
       그래서 스크리너 400줄이 일본어 이름으로 나가고 있었다(영어권 손님 지면인데).
       서류 안 `jpdei_cor:FilerNameInEnglishDEI` 가 그 자리를 메운다.
       ⛔ 그래도 없으면 null 로 둔다 — 지면이 종목코드를 쓴다. 우리가 음차해 짓지 않는다. */
    name_en: 엔티티풀기(d.name_en) || 엔티티풀기(딸림.name_en) || null,
    market: 딸림.market ?? null,
    sector: 딸림.sector ?? null,
    year: 결산해(d.period_end),
    period_end: d.period_end ?? null,
    basis: 바탕 === '連結' ? 'consolidated' : 바탕 === '個別' ? 'standalone' : null,
    assets_jpy: d.assets_jpy ?? null,
    equity_jpy: d.equity_jpy ?? null,
    revenue_jpy: d.revenue_jpy ?? null,
    operating_profit_jpy: d.operating_profit_jpy ?? null,
    net_profit_jpy: d.net_profit_jpy ?? null,
    shares: 주식수,
    bps_jpy: bps,
    eps_jpy: eps,
    per: 주가 === null ? null : (d.per ?? null),
    price_jpy: 주가,
    market_cap_jpy: 주가 !== null && 주식수 !== null ? 주가 * 주식수 : null,
    /* 🔴🔴 [2026-09-22] **PBR 은 내지 않는다 — 기준을 확인할 수 없다.**
     *
     * 주가는 IFRS 주당이익 × IFRS 주가수익률로 세운 «연결» 값이다. 그런데 주당순자산은
     * 요약표에 `NetAssetsPerShareSummaryOfBusinessResults` 하나뿐이고, 회사마다 그것이
     * 연결인지 개별인지 다르다. 실측 —
     * ```
     *   도요타 7203   BPS 1,815.72 × 15.79억주 = 28.68조   (연결로 보인다)
     *   이토추 8001   BPS   281.19 ×  79.2억주 =  2.23조   (개별이다 — 연결자본은 그 몇 배다)
     * ```
     * 그대로 나누면 이토추 PBR 이 7.02 로 찍힌다. 그 회사의 실제 PBR 자리가 아니다.
     * ⛔ 요소 이름으로는 못 가른다 — 둘이 «같은 이름»을 쓴다. 그래서 못 쟀다고 적는다.
     * ⬜ 여는 길 — 연결 주당순자산을 주는 요소를 찾거나, 연결 자본 ÷ 발행주식수로 세운다.
     *   후자는 「계산해서 메꾸는」 것이라 UAE 에서 한 번 깨졌다. 재 보고 나서 연다.
     */
    pbr: null,
    pbr_못낸까닭: 주가 !== null && bps
      ? 'BPS basis (consolidated or parent-only) is not stated in the filing'
      : null,
    /* 🔴 [2026-10-10 23:5x · 5번] 유가증권보고서 표지의 **대표자**.
     *   「who is the ceo of …」가 일본 회사로 이미 10.3위에 뜬다 — 그 답이 여기 있었는데
     *   재무 아홉 칸만 뽑고 버리고 있었다.
     * ⛔ **세 가지를 구별한다** — 받았는데 있다 / 받았는데 서류에 없다 / 아직 안 받았다.
     *   셋을 다 null 로 뭉개면 커버리지를 못 센다. `_meta.대표자` 가 셋을 따로 적는다.
     * ⛔ 이름을 로마자로 옮기지 않는다 — 한자의 읽기는 규칙으로 정해지지 않는다. */
    ...대표자칸(d),
  };
}

/**
 * 대표자 네 칸. ⛔ 「아직 안 받았다」와 「서류에 없다」를 섞지 않는다 —
 * `rep_상태` 가 그것을 적는다(`있다`·`서류에없다`·`안받음`).
 */
export function 대표자칸(d) {
  if (!d || !('representative_raw' in d)) {
    return { rep_상태: '안받음', rep_raw: null, rep_name: null, rep_title: null, rep_title_en: null };
  }
  if (!d.representative_raw) {
    return { rep_상태: '서류에없다', rep_raw: null, rep_name: null, rep_title: null, rep_title_en: null };
  }
  const r = 대표자가르기(d.representative_raw);
  return {
    rep_상태: '있다',
    rep_raw: r.원문,
    rep_name: r.이름,
    rep_title: r.직위,
    rep_title_en: r.직위영문,
  };
}

/* ── 자가시험 ──────────────────────────────────────────────── */
const 내가진입점 = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (내가진입점 && (process.argv.includes('--자가시험') || process.argv.includes('--selftest'))) {
  const 잰다 = [];
  const 검 = (이름, 참) => 잰다.push([이름, !!참]);

  /* 🔴 [2026-10-10] 대표자 — 세 갈래를 섞지 않는다 */
  검('🔴 받았고 있으면 «있다»이고 이름까지 갈린다',
    대표자칸({ representative_raw: '代表取締役社長　　大久保　昇' }).rep_상태 === '있다'
    && 대표자칸({ representative_raw: '代表取締役社長　　大久保　昇' }).rep_name === '大久保 昇');
  검('🔴🔴 칸이 «없는» 것은 «안받음» — 「그 회사에 대표자가 없다」가 아니다',
    대표자칸({ sec_code: '1' }).rep_상태 === '안받음');
  검('🔴 칸이 있는데 null 이면 «서류에없다» — 되받기가 다시 집지 않게',
    대표자칸({ representative_raw: null }).rep_상태 === '서류에없다');
  검('⛔ 셋 다 rep_name 은 null 로 두되 상태로 구별한다',
    대표자칸({ sec_code: '1' }).rep_name === null
    && 대표자칸({ representative_raw: null }).rep_name === null);
  검('⛔ 빈 입력에도 안 죽는다', 대표자칸(null).rep_상태 === '안받음');
  검('⛔ 로마자로 옮기지 않는다',
    !/[A-Za-z]/.test(대표자칸({ representative_raw: '代表取締役社長　大久保　昇' }).rep_name));

  /* 🔴 HTML 기호가 든 이름 — 라이브에 「MITSUI &amp;amp; CO.」로 나갔던 자리 */
  검('&amp; 를 & 로 푼다', 엔티티풀기('MITSUI &amp; CO., LTD.') === 'MITSUI & CO., LTD.');
  검('두 겹으로 싸인 것도 푼다', 엔티티풀기('K&amp;amp;O Energy') === 'K&O Energy');
  검('숫자 기호도 푼다', 엔티티풀기('A&#38;B') === 'A&B');
  검('평범한 이름은 그대로', 엔티티풀기('TOYOTA MOTOR CORPORATION') === 'TOYOTA MOTOR CORPORATION');
  검('앞뒤 빈칸을 턴다', 엔티티풀기('  Yappli,Inc.  ') === 'Yappli,Inc.');
  검('⛔ 빈 것은 null', 엔티티풀기('') === null && 엔티티풀기(null) === null);
  검('⛔ 태그를 만들어 내지 않는다 — 푼 뒤에도 지면이 한 번 감싼다',
    엔티티풀기('&lt;script&gt;') === '<script>');

  검('결산 해를 뽑는다', 결산해('2026-06-30') === 2026);
  검('⛔ 없으면 null — 0 으로 메꾸지 않는다', 결산해(null) === null);
  검('엉뚱한 글도 null', 결산해('작년') === null);

  const a = { code: '7203', period_end: '2025-03-31' };
  const b = { code: '7203', period_end: '2026-03-31' };
  검('⭐ 같은 회사면 가장 최근 결산만 남는다', 최신만([a, b]).length === 1);
  검('그때 남는 것이 최신이다', 최신만([a, b])[0].period_end === '2026-03-31');
  검('순서가 거꾸로여도 최신이 남는다', 최신만([b, a])[0].period_end === '2026-03-31');
  검('다른 회사는 둘 다 남는다', 최신만([a, { code: '6758', period_end: '2026-03-31' }]).length === 2);
  검('코드 없는 줄은 버린다', 최신만([{ period_end: '2026-03-31' }]).length === 0);
  검('빈 목록도 견딘다', 최신만([]).length === 0);
  검('코드 차례로 늘어놓는다',
    최신만([{ code: '9999', period_end: '2026-01-01' }, { code: '1111', period_end: '2026-01-01' }])[0].code === '1111');

  const d = {
    sec_code: '4847', edinet_code: 'E05191', name: '会社', period_end: '2026-06-30',
    revenue_jpy: 100, operating_profit_jpy: 20, net_profit_jpy: 10, assets_jpy: 500, equity_jpy: 300,
    _근거: { net_profit_jpy: { 연결개별: '連結' } },
  };
  검('한 줄로 옮긴다', 한줄(d).code === '4847');
  검('連結을 consolidated 로 적는다', 한줄(d).basis === 'consolidated');
  검('個別은 standalone 이다',
    한줄({ ...d, _근거: { net_profit_jpy: { 연결개별: '個別' } } }).basis === 'standalone');
  검('근거가 없으면 basis 도 null', 한줄({ ...d, _근거: {} }).basis === null);
  검('종목코드가 없으면 줄을 안 만든다', 한줄({ name: 'x' }) === null);
  검('⛔ 빈 값을 0 으로 메꾸지 않는다', 한줄({ sec_code: '1', _근거: {} }).revenue_jpy === null);
  검('명부에서 영문명·업종을 이어 붙인다',
    한줄(d, new Map([['4847', { name_en: 'IWI', sector: 'IT' }]])).name_en === 'IWI');
  검('명부에 없어도 줄은 선다', 한줄(d, new Map()).name_en === null);
  검('⭐ 서류가 적어 낸 영문명을 명부보다 먼저 쓴다',
    한줄({ ...d, name_en: 'YAMANO HOLDINGS CORPORATION' }, new Map([['4847', { name_en: '명부이름' }]])).name_en === 'YAMANO HOLDINGS CORPORATION');
  검('서류에 없으면 명부를 쓴다',
    한줄(d, new Map([['4847', { name_en: '명부이름' }]])).name_en === '명부이름');
  검('⛔ 둘 다 없으면 null — 음차해 짓지 않는다',
    한줄({ ...d, name_en: '' }, new Map()).name_en === null);
  /* ── 검산 ── */
  검('주식수 × BPS 가 자본과 맞으면 참', 검산맞나(100, 3, 300) === true);
  검('0.6% 어긋남은 통과한다 (실측 S100Z2KC)', 검산맞나(26340000, 384.42, 10065667000) === true);
  /* 🔴 도요타 — 個別 자본 vs 連結 BPS 의 21% 차이. 이것을 버리면 제일 큰 회사가 빠진다 */
  검('🔴 21% 어긋남(기준 차이)은 «버리지 않는다» — 도요타 7203 실측',
    검산맞나(15794987000, 1815.72, 23664924000000) === true);
  검('두 배 어긋나도 싣는다 — 기준 차이 범위다', 검산맞나(100, 3, 150) === true);
  검('⛔ 천 배 어긋나면 단위 사고다 — 버린다', 검산맞나(100, 3, 300000) === false);
  검('⛔ 거꾸로 천 배도 버린다', 검산맞나(100000, 3000, 300) === false);
  검('⛔ 부호가 다르면 견줄 수 없다 — «모른다»', 검산맞나(100, 3, -300) === null);
  검('⛔ 하나라도 없으면 «모른다»(null) — 거짓이 아니다', 검산맞나(100, null, 300) === null);
  검('자본이 0 이면 나눌 수 없다 — null', 검산맞나(100, 3, 0) === null);
  const 검d = { ...d, shares: 30, bps_jpy: 10, eps_jpy: 0.3333 };
  검('검산에 맞으면 주식수·BPS 를 싣는다', 한줄(검d).shares === 30 && 한줄(검d).bps_jpy === 10);
  검('⛔ 검산이 깨지면 그 칸을 안 싣는다',
    한줄({ ...검d, bps_jpy: 100 }).bps_jpy === null && 한줄({ ...검d, bps_jpy: 100 }).shares === null);
  검('EPS 는 순이익으로 따로 잰다', 한줄({ ...검d, eps_jpy: 99 }).eps_jpy === null);
  검('EPS 가 깨져도 BPS 는 남는다', 한줄({ ...검d, eps_jpy: 99 }).bps_jpy === 10);
  검('못 쟀으면(null) 그대로 싣는다', 한줄({ ...d, shares: 30 }).shares === 30);

  /* ── 결산일 주가 ── */
  검('⭐ PER × EPS 가 결산일 주가다 (실측 16.43 × 56.79)',
    Math.round(결산일주가(16.43, 56.79) * 10) / 10 === 933.1);
  검('⛔ 적자(EPS 음수)면 주가를 안 세운다', 결산일주가(16.43, -5) === null);
  검('⛔ EPS 가 0 이면 안 세운다', 결산일주가(16.43, 0) === null);
  검('⛔ PER 이 없으면 안 세운다', 결산일주가(null, 56.79) === null);
  const 주d = { ...d, shares: 30, bps_jpy: 10, eps_jpy: 0.3333, per: 30 };
  검('주가에서 시가총액이 선다', 한줄(주d).market_cap_jpy === 한줄(주d).price_jpy * 30);
  /* 🔴 PBR 은 «내지 않는다» — 주당순자산이 연결인지 개별인지 서류가 말해 주지 않는다 */
  검('🔴 PBR 은 비워 둔다 — 기준을 확인할 수 없다', 한줄(주d).pbr === null);
  검('그 까닭을 줄에 적어 둔다', /basis/.test(한줄(주d).pbr_못낸까닭 || ''));
  검('⛔ BPS 가 없으면 까닭도 없다 — 없는 것을 있다고 적지 않는다',
    한줄({ ...주d, bps_jpy: null }).pbr_못낸까닭 === null);
  검('⛔ 주가를 못 세우면 PER 도 안 싣는다 — 셋이 한 벌이다',
    한줄({ ...주d, eps_jpy: -1, _근거: 주d._근거 }).per === null);
  검('⛔ 시가총액을 0 으로 메꾸지 않는다', 한줄({ ...d }).market_cap_jpy === null);

  검('한국 탭과 칸 이름 꼴이 같다',
    ['code', 'name', 'year', 'assets_jpy', 'equity_jpy', 'revenue_jpy', 'operating_profit_jpy', 'net_profit_jpy']
      .every((k) => k in 한줄(d)));

  const 진 = 잰다.filter(([, v]) => !v);
  for (const [이름, v] of 잰다) console.log(`${v ? '✅' : '🔴'} ${이름}`);
  console.log(진.length ? `\n🔴 ${진.length}/${잰다.length} 떨어졌다` : `\n✅ 자가시험 ${잰다.length} 통과`);
  process.exit(진.length ? 1 : 0);
}

if (내가진입점) {
  /* 명부에서 영문명·업종을 가져온다 — 없으면 없는 대로 간다.
     ⚠ 이 명부는 바깥 칸이 «한국어»다(`회사들`) — 영어 이름으로 찾다가 0곳이 붙었다.
       ⛔ 「영문명 0곳」을 「명부에 없다」로 읽지 않는다. 자기 파일의 «실제 칸 이름»을 본다.
     ⚠ 종목코드는 EDINET 쪽이 다섯 자리(끝에 0)라 네 자리로 줄여 맞춘다. */
  const 명부 = new Map();
  try {
    const j = JSON.parse(fs.readFileSync(path.join(뿌리, 'src', 'data', 'japan-listed-companies.json'), 'utf8'));
    const 회사들 = j.회사들 ?? j.companies ?? j.rows ?? (Array.isArray(j) ? j : []);
    for (const c of 회사들) {
      const raw = String(c.securitiesCode ?? c.code ?? c.sec_code ?? '');
      const k = raw.length === 5 ? raw.slice(0, 4) : raw;
      if (!k) continue;
      명부.set(k, {
        name_en: c.nameEn || c.name_en || null,
        market: c.market ?? null,
        sector: c.industry || c.sector || c.industryJa || null,
      });
    }
    console.log(`   명부 ${명부.size}곳을 읽었다`);
  } catch (e) { console.log('⚠ 명부를 못 읽었다 — 영문명·업종 없이 간다:', String(e?.message ?? e).slice(0, 60)); }

  const 모 = [];
  for (const d of fs.readdirSync(자료방)) {
    /* ⚠ [2026-09-22] 수집기가 «받는 중»에 남기는 `_tmp-<docID>` 폴더가 있다.
       읽는 사이에 사라지므로 statSync 가 ENOENT 로 던져 탭 짓기가 통째로 죽었다.
       ⛔ 한 폴더 때문에 3,681건이 안 실리게 두지 않는다. 날짜 폴더만 본다. */
    if (d.startsWith('_')) continue;
    let 폴더인가 = false;
    try { 폴더인가 = fs.statSync(path.join(자료방, d)).isDirectory(); } catch { continue; }
    if (!폴더인가) continue;
    const p = path.join(자료방, d);
    for (const f of fs.readdirSync(p)) {
      if (!f.endsWith('.json')) continue;
      try { 모.push(JSON.parse(fs.readFileSync(path.join(p, f), 'utf8'))); } catch { /* 넘어간다 */ }
    }
  }
  const 줄들 = 최신만(모.map((d) => 한줄(d, 명부)).filter(Boolean));

  const 셈 = (k) => 줄들.filter((r) => typeof r[k] === 'number').length;
  console.log('■ 일본 재무제표 탭');
  console.log(`   서류 ${모.length}건 → 회사 ${줄들.length}곳 (상장 3,818사의 ${(줄들.length / 3818 * 100).toFixed(1)}%)`);
  for (const k of ['assets_jpy', 'equity_jpy', 'revenue_jpy', 'operating_profit_jpy', 'net_profit_jpy',
    /* [2026-09-22] 주가에서 나오는 넷도 함께 센다 — 안 세면 「섰다」를 눈으로 못 본다 */
    'shares', 'bps_jpy', 'eps_jpy', 'per', 'price_jpy', 'market_cap_jpy', 'pbr']) {
    console.log(`   ${k.padEnd(22)} ${셈(k)} (${(셈(k) / 줄들.length * 100).toFixed(1)}%)`);
  }
  console.log(`   영문명 붙은 곳 ${줄들.filter((r) => r.name_en).length} · 업종 붙은 곳 ${줄들.filter((r) => r.sector).length}`);
  const 해 = {};
  for (const r of 줄들) if (r.year) 해[r.year] = (해[r.year] || 0) + 1;
  console.log('   결산 해 ' + Object.entries(해).sort().map(([k, v]) => `${k}:${v}`).join(' · '));

  if (!적는다) { console.log('\n⬜ 재기만 했다. 적으려면 --적는다'); process.exit(0); }
  fs.writeFileSync(낼곳, JSON.stringify({
    _meta: {
      출처: '금융청 EDINET (유가증권보고서)',
      이용허락범위: 'PDL1.0 — 상업적 이용 가능, 출처 표시',
      지은때: new Date().toLocaleString('ko-KR'),
      단위: '엔(JPY)',
      메모: '같은 회사는 가장 최근 결산 한 줄만 둔다. 빈 칸은 null 이고 0 으로 메꾸지 않았다.',
      /* ⛔ 「대표자가 몇 줄에 있나」를 세 갈래로 적는다. 하나로 뭉치면
         「아직 안 받았다」가 「그 회사는 대표자가 없다」로 읽힌다 */
      대표자: {
        있다: 줄들.filter((r) => r.rep_상태 === '있다').length,
        서류에없다: 줄들.filter((r) => r.rep_상태 === '서류에없다').length,
        안받음: 줄들.filter((r) => r.rep_상태 === '안받음').length,
        이름까지가름: 줄들.filter((r) => r.rep_name).length,
        메모: '«안받음»은 되받기가 아직 그 서류를 안 집은 것이다 — 그 회사에 대표자가 없다는 뜻이 아니다',
      },
    },
    rows: 줄들,
  }, null, 1), 'utf8');
  console.log(`\n✅ 적었다 — src/data/japan-financials-tape.json (${(fs.statSync(낼곳).size / 1024 / 1024).toFixed(1)}MB)`);
}
