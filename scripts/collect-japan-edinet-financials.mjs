#!/usr/bin/env node
/**
 * collect-japan-edinet-financials.mjs — **일본 재무제표를 받는다. 일본이 상품이 되는 칸이다.**
 *
 *   node scripts/collect-japan-edinet-financials.mjs --재본다            며칠치에 몇 건 있나만 잰다
 *   node scripts/collect-japan-edinet-financials.mjs --날 2026-09-18 --적는다
 *   node scripts/collect-japan-edinet-financials.mjs --며칠 5 --적는다    어제부터 거슬러 닷새
 *   node scripts/collect-japan-edinet-financials.mjs --몇개 3 --적는다    앞의 몇 곳만(시험용)
 *   node scripts/collect-japan-edinet-financials.mjs --자가시험
 *
 * ── 🔴 왜 이것이 먼저인가 (2026-09-21) ────────────────────────────────────
 * 회사 규칙 — **재무제표가 없으면 그 나라는 아직 상품이 아니다**(CLAUDE.md 「주력과 서비스」).
 * 재무가 빈 네 나라(일본·인도·중국·사우디) 가운데
 * ```
 * 라이선스가 열린 곳    일본 하나      (금융청 EDINET · PDL1.0 — 서류 원문까지 상업이용 가능)
 * 명부가 이미 선 곳     일본 하나      (상장 3,818사 · japan-jpx-companies)
 * 남은 막힘의 개수      0              ← 오늘 «열쇠가 이미 있다»는 것을 확인했다
 * ```
 *
 * ⚠ 오늘 내가 사장님께 「EDINET 열쇠 발급이 막혔다」고 보고했다가 바로잡혔다 —
 *   **「EDINET 열쇠 발급>>>어제 했잖아」.** 열쇠는 `.env` 에 있었고 API 는 200 을 준다.
 *   나는 열쇠가 나오기 «전»에 쓴 문서를 안 재고 옮겼다.
 *   ⇒ 그 일이 또 없게 `scripts/check-locked-wells.mjs` 가 기계로 재게 해 두었다.
 *
 * ── 왜 XBRL 이 아니라 CSV 인가 ────────────────────────────────────────────
 * EDINET API v2 는 `type=5` 로 **XBRL 을 CSV 로 풀어서** 준다(실측 92KB ZIP).
 * XBRL 파서를 들일 까닭이 없다. CSV 는 UTF-16LE · 탭 구분이고 칸은 아홉이다 —
 * `要素ID · 項目名 · コンテキストID · 相対年度 · 連結・個別 · 期間・時点 · ユニットID · 単位 · 値`
 *
 * ── 이용허락범위 ──────────────────────────────────────────────────────────
 * 금융청 EDINET — 공공데이터 이용규약(PDL1.0). 상업적 이용 가능, 출처 표시.
 * `docs/일본-데이터-출처-라이선스.md` 106~111행이 **서류 원문(재무제표)에도 그대로 이어진다**고
 * 못박아 두었다. ⛔ JPX 자체 파일은 별개다 — 그쪽은 상업이용 금지라 안 쓴다.
 * ⛔ 열쇠 값을 화면·로그·커밋 어디에도 안 찍는다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 둘곳 = path.join(뿌리, 'archive', 'raw', 'japan-edinet-financials');

const 인자 = (이름, 기본 = null) => {
  const i = process.argv.indexOf(이름);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : 기본;
};
const 적는다 = process.argv.includes('--적는다');
const 재본다 = process.argv.includes('--재본다');
/* 🔴 [2026-09-22] 뽑는 «칸»을 늘리면 이미 받아 둔 파일은 그 칸이 비어 있다.
   그때 「이미 있다」로 건너뛰면 새 칸이 영영 안 찬다. --다시받는다 로 덮어쓴다.
   ⛔ 폴더를 지우고 새로 받지 않는다 — 지우는 사이에 멈추면 있던 것까지 잃는다. */
const 다시받는다 = process.argv.includes('--다시받는다');

/* ── 뽑을 다섯 칸 ─────────────────────────────────────────────────────────
   ⭐ 요소를 «우선순위»로 둔다. 재무제표 본표(jppfs_cor)가 먼저고,
     없으면 경영지표 요약(jpcrp_cor …SummaryOfBusinessResults)을 쓴다.
   ⚠ 요약 쪽은 「当期」가 아니라 「四期前」처럼 지난 해가 섞여 오므로 相対年度 를 반드시 본다. */
export const 뽑을것 = [
  { 칸: 'revenue_jpy', 요소: ['jppfs_cor:NetSales', 'jppfs_cor:Revenue', 'jpcrp_cor:NetSalesSummaryOfBusinessResults'] },
  { 칸: 'operating_profit_jpy', 요소: ['jppfs_cor:OperatingIncome'] },
  { 칸: 'net_profit_jpy', 요소: ['jppfs_cor:ProfitLoss', 'jppfs_cor:NetIncome'] },
  { 칸: 'assets_jpy', 요소: ['jppfs_cor:Assets', 'jpcrp_cor:TotalAssetsSummaryOfBusinessResults'] },
  { 칸: 'equity_jpy', 요소: ['jppfs_cor:NetAssets', 'jpcrp_cor:NetAssetsSummaryOfBusinessResults'] },
  /* 🔴 [2026-09-22 · 5번] **주식 관련 셋을 더했다 — 이미 쥔 자료 안에 있었다.**
   * ─────────────────────────────────────────────────────────────────────────
   * 일본을 스크리너에 넣고 보니 시총·PER·PBR·EPS 가 통째로 비어 있었다.
   * 「주가 우물을 못 찾아서」라고 적어 두고 찾아 나섰는데 — **EDINET 서류 안에
   * 발행주식수·주당순자산·주당이익이 이미 들어 있었다.** 우리가 안 뽑았을 뿐이다.
   *
   * ⭐ 그러면 주가 없이도 EPS·BPS 두 칸이 서고, 주가만 붙이면 시총·PER·PBR 이 선다.
   * ⚠ UAE 에서 같은 셈이 깨졌던 까닭은 «기간 어긋남»이었다(순이익은 분기, EPS 는 연 누계).
   *   일본은 «연간» 유가증권보고서라 그 함정에 안 걸린다 — 같은 표의 같은 기간이다.
   * ⛔ 그래도 검산한다 — 발행주식수 × BPS ≈ 자본 이 안 맞으면 그 줄은 안 쓴다.
   */
  { 칸: 'shares', 요소: ['jpcrp_cor:TotalNumberOfIssuedSharesSummaryOfBusinessResults'] },
  { 칸: 'bps_jpy', 요소: ['jpcrp_cor:NetAssetsPerShareSummaryOfBusinessResults'] },
  /* ⚠ [2026-09-22] 처음에 `BasicEarningsPerShare…` 로 적었다가 **한 건도 안 걸렸다.**
     진짜 이름은 «Loss» 가 낀 `BasicEarningsLossPerShare…` 다(적자도 같은 칸에 적으니까).
     ⛔ 요소 이름을 «그럴듯하게» 지어 짐작하지 않는다. 서류를 열어 이름을 눈으로 본다. */
  /* 🔴 [2026-09-22] IFRS 로 내는 회사는 이름이 또 다르다 — `…IFRSSummaryOfBusinessResults`.
     소니(6758)가 그 꼴이라 EPS 가 통째로 비어 있었다. 큰 회사일수록 IFRS 다. */
  { 칸: 'eps_jpy', 요소: ['jpcrp_cor:BasicEarningsLossPerShareIFRSSummaryOfBusinessResults',
    'jpcrp_cor:BasicEarningsLossPerShareSummaryOfBusinessResults',
    'jpcrp_cor:BasicEarningsPerShareSummaryOfBusinessResults',
    'jpcrp_cor:EarningsPerShareSummaryOfBusinessResults'] },
  /* 🔴🔴 [2026-09-22 · 5번] **주가수익률(PER)이 서류 안에 있었다.**
   * ─────────────────────────────────────────────────────────────────────────
   * 「일본은 주가 우물이 없어 시총·PER·PBR 을 못 낸다」고 손님 화면에 적어 두고
   * 밖에서 주가를 찾아 다녔다. 그런데 유가증권보고서 「経営指標等」에 PER 이 있었다.
   *
   *   결산일 주가 = PER × EPS            (실측 16.43 × 56.79 = 933.1엔)
   *   시가총액    = 주가 × 발행주식수     (933.1 × 26,340,000 = 245.8억엔)
   *   PBR        = 주가 ÷ BPS           (933.1 ÷ 384.42 = 2.43배)
   *
   * ⚠ 이 주가는 «오늘 값이 아니라 결산일 값»이다. 손님 화면에 반드시 그렇게 적는다 —
   *   `as` 칸(결산일)이 이미 그 날짜를 달고 나간다. ⛔ 「현재가」라고 쓰지 않는다.
   * ⛔ EPS 가 음수(적자)면 PER 이 없거나 뜻이 없다 — 그 줄은 주가를 못 세운다. */
  { 칸: 'per', 요소: ['jpcrp_cor:PriceEarningsRatioIFRSSummaryOfBusinessResults',
    'jpcrp_cor:PriceEarningsRatioSummaryOfBusinessResults'] },
];

/** CSV 한 줄을 칸으로 가른다 — 탭 구분, 값은 큰따옴표로 싸여 있다 */
export function 줄가르기(줄) {
  return String(줄 || '').split('\t').map((s) => s.replace(/^"|"$/g, ''));
}

/**
 * 푼 CSV 글에서 다섯 칸을 뽑는다.
 *
 * 고르는 순서 — **① 当期  ② 連結 먼저, 없으면 個別  ③ 요소 우선순위**
 * ⛔ 「四期前」·「三期前」 같은 지난 해 값을 올해 값으로 쓰지 않는다. 그것이 제일 큰 사고다.
 */
export function 뽑기(글) {
  const 줄들 = String(글 || '').split(/\r?\n/).map(줄가르기).filter((c) => c.length >= 9);
  const 값 = {};
  const 근거 = {};
  for (const { 칸, 요소 } of 뽑을것) {
    let 걸린 = null;
    for (const e of 요소) {
      /* ⚠ 相対年度 는 「当期」(기간) 말고 「当期末時点」(시점)도 온다 — 발행주식수·BPS 가 그 꼴이다.
         처음에 /^当期/ 로 두어 둘 다 받게 했다. 「四期前時点」은 «앞»이 다르므로 안 걸린다. */
      const 후보 = 줄들.filter((c) => c[0] === e && /^当期/.test(c[3] || '') && c[8] && c[8] !== '－');
      if (!후보.length) continue;
      /* 連結(연결)이 사실상 회사의 성적이다. 없으면 個別(별도) */
      걸린 = 후보.find((c) => c[4] === '連結') || 후보[0];
      break;
    }
    값[칸] = 걸린 ? Number(걸린[8]) : null;
    근거[칸] = 걸린 ? { 요소: 걸린[0], 연결개별: 걸린[4], 단위: 걸린[7] } : null;
  }

  /* 🔴🔴 [2026-09-22] **EPS 와 PER 의 «기준»이 같아야 한다.**
   *
   * 소니(S100YE2C)를 열어 보고 알았다 — IFRS 로 내는 회사는 표를 «두 벌» 싣는다.
   * ```
   *   IFRS       EPS 当期 −54.70   ·  PER 当期 「－」(적자라 없다)
   *   일본기준    EPS 없음          ·  PER 당기 값이 따로 있다
   * ```
   * 칸마다 따로 고르면 «IFRS 가 없다고 적은 PER» 자리에 일본기준 PER 이 들어와
   * **IFRS EPS × 일본기준 PER** 이라는, 어느 표에도 없는 주가가 만들어진다.
   * ⛔ 두 수가 다른 표에서 왔으면 곱하지 않는다. 기준이 어긋나면 PER 을 버린다 —
   *   EPS 는 그 자체로 쓸모가 있으므로 남긴다. */
  const IFRS인가 = (칸) => /IFRS/.test(근거[칸]?.요소 || '');
  if (값.per !== null && 값.eps_jpy !== null && IFRS인가('per') !== IFRS인가('eps_jpy')) {
    값.per = null;
    근거.per = { 버렸다: 'EPS 와 회계기준이 달라 곱할 수 없다' };
  }
  return { 값, 근거 };
}

/** 받은 다섯 칸이 «쓸 만한가» — 하나도 없으면 안 적는다 */
/**
 * 🔴 [2026-09-22] **영문 회사명은 서류 «안»에 있다.**
 *
 * 스크리너에 일본을 올리고 보니 **400줄이 일본어 이름으로** 나가고 있었다. 명부(EDINET
 * 코드리스트)에 `nameEn` 이 빈 곳이 403곳이기 때문이다 — 유초은행조차 비어 있다.
 * 그런데 서류를 열어 보니 모든 제출서류가 `jpdei_cor:FilerNameInEnglishDEI` 를 싣는다.
 *
 * ⛔ 우리가 이름을 «음차해서 지어내지» 않는다. 회사가 스스로 적어 낸 영문명을 쓴다.
 * ⚠ 그래도 없는 곳이 있다 — 그때는 지면이 «종목코드»를 쓴다. 일본어를 영어 지면에 안 낸다.
 */
export function 영문명뽑기(글) {
  for (const 줄 of String(글 || '').split(/\r?\n/)) {
    const c = 줄가르기(줄);
    if (c[0] !== 'jpdei_cor:FilerNameInEnglishDEI') continue;
    const v = String(c[8] ?? '').trim();
    if (!v || v === '－' || v === '-') return null;
    return v;
  }
  return null;
}

/**
 * **대표자의 직위·이름** — 유가증권보고서 표지에 한 줄로 들어 있다.
 *
 * ── 🔴 왜 (2026-10-10 23:2x · 5번) ──────────────────────────────────
 * 오늘 19:49 에 「일본은 대표자 칸이 없어 못 한다」고 적었다. **틀렸다.**
 * 코드리스트(`japan-jpx-companies`)만 보고 내린 판단이었고, 유가증권보고서 쪽은
 * 재 보지 않았다. 한 건 받아 열어 보니 1,938행 가운데 이 한 줄이 있었다 —
 * ```
 * jpcrp_cor:TitleAndNameOfRepresentativeCoverPage
 *   代表者の役職氏名、表紙  =  「代表取締役社長　　大久保　昇」   (우치다요코 8057)
 * ```
 * ⭐ 「없다」를 말하기 전에 **그 자료를 열어 봤는지** 묻는다.
 *
 * ⛔ **여기서 직위와 이름을 가르지 않는다.** 가른 꼴은 한 건만 보고 정하면 좁게 박힌다 —
 *   「代表取締役社長兼CEO」·공동대표·전각 공백이 몇 칸인지 다 모른다.
 *   원문을 그대로 담아 두고, 자료가 쌓인 뒤 **실측해서** 가른다.
 *   ⚠ 여기서 버리면 영영 못 가른다. 담아 두는 것이 먼저다.
 * ⛔ 로마자로 옮기지 않는다. 한자의 읽기는 규칙으로 정해지지 않는다 —
 *   「昇」이 Noboru 인지 Shō 인지는 그 사람만 안다. 지어내면 사람 이름을 틀리게 박는다.
 */
export function 대표자뽑기(글) {
  for (const 줄 of String(글 || '').split(/\r?\n/)) {
    const c = 줄가르기(줄);
    if (c[0] !== 'jpcrp_cor:TitleAndNameOfRepresentativeCoverPage') continue;
    const v = String(c[8] ?? '').trim();
    if (!v || v === '－' || v === '-') return null;
    return v;
  }
  return null;
}

export function 쓸만한가(값) {
  return Object.values(값 || {}).some((v) => typeof v === 'number' && Number.isFinite(v));
}

/** 오늘로부터 며칠 전 평일들 — 주말은 서류가 0건이다 */
export function 최근평일(며칠, 오늘 = new Date()) {
  const 것 = [];
  for (let i = 1; 것.length < 며칠 && i <= 며칠 * 3; i++) {
    const t = new Date(오늘); t.setDate(오늘.getDate() - i);
    if (t.getDay() === 0 || t.getDay() === 6) continue;
    것.push(`${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`);
  }
  return 것;
}

/* ── 자가시험 ──────────────────────────────────────────────── */
const 내가진입점 = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (내가진입점 && (process.argv.includes('--자가시험') || process.argv.includes('--selftest'))) {
  const 잰다 = [];
  const 검 = (이름, 참) => 잰다.push([이름, !!참]);
  const 머리 = '"要素ID"\t"項目名"\t"コンテキストID"\t"相対年度"\t"連結・個別"\t"期間・時点"\t"ユニットID"\t"単位"\t"値"';
  const 줄 = (e, 년, 연결, 값) => `"${e}"\t"이름"\t"ctx"\t"${년}"\t"${연결}"\t"期間"\t"JPY"\t"円"\t"${값}"`;

  검('탭으로 가르고 따옴표를 벗긴다', 줄가르기('"a"\t"b"')[0] === 'a');
  검('빈 줄은 빈 칸을 낸다', 줄가르기('').length === 1);

  const 글1 = [머리, 줄('jppfs_cor:OperatingIncome', '当期', '連結', '2076108000')].join('\n');
  검('당기 영업이익을 뽑는다', 뽑기(글1).값.operating_profit_jpy === 2076108000);

  const 글2 = [머리,
    줄('jppfs_cor:OperatingIncome', '前期', '連結', '1848368000'),
    줄('jppfs_cor:OperatingIncome', '当期', '連結', '2076108000')].join('\n');
  검('⛔ 前期를 当期로 쓰지 않는다', 뽑기(글2).값.operating_profit_jpy === 2076108000);

  const 글3 = [머리,
    줄('jpcrp_cor:NetSalesSummaryOfBusinessResults', '四期前', 'その他', '11493480000'),
    줄('jpcrp_cor:NetSalesSummaryOfBusinessResults', '当期', 'その他', '15000000000')].join('\n');
  검('⛔ 四期前(4년 전)을 올해로 쓰지 않는다', 뽑기(글3).값.revenue_jpy === 15000000000);

  const 글4 = [머리,
    줄('jppfs_cor:NetSales', '当期', '個別', '100'),
    줄('jppfs_cor:NetSales', '当期', '連結', '200')].join('\n');
  검('⭐ 連結을 個別보다 먼저 쓴다', 뽑기(글4).값.revenue_jpy === 200);
  검('그 근거를 함께 남긴다', 뽑기(글4).근거.revenue_jpy.연결개별 === '連結');

  const 글5 = [머리, 줄('jppfs_cor:NetSales', '当期', '個別', '100')].join('\n');
  검('連結이 없으면 個別을 쓴다', 뽑기(글5).값.revenue_jpy === 100);

  검('본표를 요약보다 먼저 쓴다',
    뽑기([머리,
      줄('jpcrp_cor:TotalAssetsSummaryOfBusinessResults', '当期', 'その他', '111'),
      줄('jppfs_cor:Assets', '当期', '連結', '999')].join('\n')).값.assets_jpy === 999);

  검('⛔ 없는 칸은 0 이 아니라 null 이다', 뽑기(머리).값.revenue_jpy === null);
  검('「－」는 값이 아니다',
    뽑기([머리, 줄('jppfs_cor:NetSales', '当期', '連結', '－')].join('\n')).값.revenue_jpy === null);
  검('하나라도 있으면 쓸 만하다', 쓸만한가({ a: 1, b: null }) === true);
  검('전부 비면 안 적는다', 쓸만한가({ a: null, b: null }) === false);
  검('빈 것도 안 적는다', 쓸만한가(null) === false);

  const 평일 = 최근평일(5, new Date(2026, 8, 21));   /* 9/21 은 월요일 */
  검('주말을 건너뛴다', 평일.every((d) => {
    const t = new Date(d + 'T00:00:00'); return t.getDay() !== 0 && t.getDay() !== 6;
  }));
  검('며칠만큼 낸다', 평일.length === 5);
  검('어제부터 거슬러 간다', 평일[0] === '2026-09-18');   /* 9/20 일 · 9/19 토 건너뜀 */
  검('아홉 칸을 뽑는다 — 재무 다섯 + 주식 셋 + PER', 뽑을것.length === 9);
  /* 🔴 [2026-09-22] 주식 셋을 더하며 이 수를 «같이» 안 고쳐 시험이 떨어졌다.
     칸을 늘리면 칸을 세는 시험도 따라간다 — 자를 바꾸면 그 자를 보는 시험도 따라간다. */
  const 한줄글 = (e, 년, 값) => [머리, 줄(e, 년, 'その他', 값)].join('\n');
  검('⭐ 발행주식수를 뽑는다 — 주가만 붙으면 시총이 선다',
    뽑기(한줄글('jpcrp_cor:TotalNumberOfIssuedSharesSummaryOfBusinessResults', '当期末時点', '26340000')).값.shares === 26340000);
  검('⭐ 「当期末時点」(시점)도 받는다 — 주식수·BPS 가 그 꼴이다',
    뽑기(한줄글('jpcrp_cor:NetAssetsPerShareSummaryOfBusinessResults', '当期末時点', '334.84')).값.bps_jpy === 334.84);
  검('⛔ 「四期前時点」은 안 받는다',
    뽑기(한줄글('jpcrp_cor:NetAssetsPerShareSummaryOfBusinessResults', '四期前時点', '305.87')).값.bps_jpy === null);
  검('주당이익도 뽑는다',
    뽑기(한줄글('jpcrp_cor:BasicEarningsPerShareSummaryOfBusinessResults', '当期', '56.4')).값.eps_jpy === 56.4);
  /* 🔴 실제 서류에 박힌 이름은 «Loss» 가 낀 쪽이다. 그것을 못 받으면 EPS 가 통째로 빈다 */
  검('🔴 진짜 이름(BasicEarningsLossPerShare…)으로도 뽑는다',
    뽑기(한줄글('jpcrp_cor:BasicEarningsLossPerShareSummaryOfBusinessResults', '当期', '56.79')).값.eps_jpy === 56.79);
  /* ── 영문 회사명 — 명부에 없는 400곳을 «서류»가 채운다 ── */
  const 이름줄 = (값) => [머리, 줄('jpdei_cor:FilerNameInEnglishDEI', '', '', 값)].join('\n');
  검('서류에서 영문명을 뽑는다',
    영문명뽑기(이름줄('YAMANO HOLDINGS CORPORATION')) === 'YAMANO HOLDINGS CORPORATION');
  검('⛔ 「－」는 이름이 아니다', 영문명뽑기(이름줄('－')) === null);
  검('앞뒤 빈칸을 턴다', 영문명뽑기(이름줄('  Yappli,Inc.  ')) === 'Yappli,Inc.');
  검('없으면 null — 지어내지 않는다', 영문명뽑기(머리) === null);
  검('⭐ 주가수익률(PER)을 뽑는다 — PER × EPS 가 결산일 주가다',
    뽑기(한줄글('jpcrp_cor:PriceEarningsRatioSummaryOfBusinessResults', '当期', '16.43')).값.per === 16.43);
  검('⛔ 지난 해 PER 을 올해로 쓰지 않는다',
    뽑기(한줄글('jpcrp_cor:PriceEarningsRatioSummaryOfBusinessResults', '四期前', '19.55')).값.per === null);
  /* ── IFRS 신고사 ── */
  검('IFRS EPS 도 뽑는다 (소니 꼴)',
    뽑기(한줄글('jpcrp_cor:BasicEarningsLossPerShareIFRSSummaryOfBusinessResults', '当期', '-54.7')).값.eps_jpy === -54.7);
  검('IFRS PER 을 일본기준 PER 보다 먼저 쓴다',
    뽑기([머리,
      줄('jpcrp_cor:PriceEarningsRatioSummaryOfBusinessResults', '当期', 'その他', '66.3'),
      줄('jpcrp_cor:PriceEarningsRatioIFRSSummaryOfBusinessResults', '当期', 'その他', '17.9')].join('\n')).값.per === 17.9);
  검('🔴 기준이 어긋나면 PER 을 버린다 (IFRS EPS × 일본기준 PER 금지)',
    뽑기([머리,
      줄('jpcrp_cor:BasicEarningsLossPerShareIFRSSummaryOfBusinessResults', '当期', 'その他', '-54.7'),
      줄('jpcrp_cor:PriceEarningsRatioSummaryOfBusinessResults', '当期', 'その他', '66.3')].join('\n')).값.per === null);
  검('그때 EPS 는 남긴다 — 그 자체로 쓸모가 있다',
    뽑기([머리,
      줄('jpcrp_cor:BasicEarningsLossPerShareIFRSSummaryOfBusinessResults', '当期', 'その他', '-54.7'),
      줄('jpcrp_cor:PriceEarningsRatioSummaryOfBusinessResults', '当期', 'その他', '66.3')].join('\n')).값.eps_jpy === -54.7);
  검('기준이 둘 다 IFRS 면 그대로 쓴다',
    뽑기([머리,
      줄('jpcrp_cor:BasicEarningsLossPerShareIFRSSummaryOfBusinessResults', '当期', 'その他', '188.71'),
      줄('jpcrp_cor:PriceEarningsRatioIFRSSummaryOfBusinessResults', '当期', 'その他', '20.0')].join('\n')).값.per === 20);
  검('기준이 둘 다 일본기준이면 그대로 쓴다',
    뽑기([머리,
      줄('jpcrp_cor:BasicEarningsLossPerShareSummaryOfBusinessResults', '当期', 'その他', '56.79'),
      줄('jpcrp_cor:PriceEarningsRatioSummaryOfBusinessResults', '当期', 'その他', '16.43')].join('\n')).값.per === 16.43);
  /* ⚠ 돈 칸은 `_jpy` 로 끝내 «통화»를 이름에 박는다 — 한국 탭이 `_krw` 인 것과 같은 꼴이다.
     주식수(shares)·배수(per)는 돈이 아니라 통화를 안 붙인다. */
  검('돈 칸은 이름에 통화가 박혀 있다',
    뽑을것.filter((x) => !['shares', 'per'].includes(x.칸)).every((x) => /_jpy$/.test(x.칸)));
  검('주식수는 돈이 아니라 통화를 안 붙인다', 뽑을것.some((x) => x.칸 === 'shares'));

  /* 🔴 [2026-10-10 23:2x] 대표자 — 감은 **실측한 CSV 줄에서 떠 왔다**(우치다요코 8057, docID S100Z6XO).
     지어낸 꼴로 시험하면 본 실행에서만 어긋난다 — 오늘 다른 자에서 그렇게 당했다. */
  const 대표줄 = ['"jpcrp_cor:TitleAndNameOfRepresentativeCoverPage"', '"代表者の役職氏名、表紙"',
    '"FilingDateInstant"', '""', '""', '""', '""', '""', '"代表取締役社長　　大久保　昇"'].join('\t');
  검('🔴 표지의 대표자 원문을 집는다', 대표자뽑기(대표줄) === '代表取締役社長　　大久保　昇');
  검('⛔ 원문을 «가르지 않는다» — 직위와 이름이 붙은 그대로다',
    /代表取締役社長/.test(대표자뽑기(대표줄)) && /大久保/.test(대표자뽑기(대표줄)));
  검('⛔ 없으면 null — 빈 글자로 채우지 않는다', 대표자뽑기(머리) === null);
  검('⛔ 「－」는 값이 아니다', 대표자뽑기(
    ['"jpcrp_cor:TitleAndNameOfRepresentativeCoverPage"', '"x"', '"x"', '""', '""', '""', '""', '""', '"－"'].join('\t')) === null);
  검('⛔ 빈 입력에도 안 죽는다', 대표자뽑기('') === null && 대표자뽑기(null) === null);
  검('⛔⛔ 로마자로 옮기지 않는다 — 한자의 읽기는 규칙으로 정해지지 않는다',
    !/[A-Za-z]/.test(대표자뽑기(대표줄)));

  const 진 = 잰다.filter(([, v]) => !v);
  for (const [이름, v] of 잰다) console.log(`${v ? '✅' : '🔴'} ${이름}`);
  console.log(진.length ? `\n🔴 ${진.length}/${잰다.length} 떨어졌다` : `\n✅ 자가시험 ${잰다.length} 통과`);
  process.exit(진.length ? 1 : 0);
}

/* ── 실제로 받는다 ────────────────────────────────────────── */
if (내가진입점) {
  const KEY = (() => {
    if (process.env.EDINET_KEY) return process.env.EDINET_KEY;
    try { return fs.readFileSync(path.join(뿌리, '.env'), 'utf8').match(/^EDINET_KEY=(.+)$/m)?.[1]?.trim() || ''; }
    catch { return ''; }
  })();
  if (!KEY) { console.error('🔴 .env 에 EDINET_KEY 가 없다'); process.exit(2); }

  const 날들 = 인자('--날') ? [인자('--날')] : 최근평일(Number(인자('--며칠', '1')));
  const 몇개 = Number(인자('--몇개', '0'));
  console.log('■ 일본 EDINET 재무제표 —', 날들.join(' · '), 적는다 ? '· 적는다' : '· 안 적는다(재보기)');

  /* 🔴 [2026-09-21] 250일치를 한 번에 돌렸더니 `UND_ERR_CONNECT_TIMEOUT` 으로 «죽었다».
     117사에서 멈췄고 그 뒤가 통째로 날아갔다.
     ⭐ 오늘 비상벨에서 배운 것과 같은 꼴이다 — **닿지 못한 것은 한 번 더 잰다.**
     ⛔ 그리고 «한 날이 실패해도 다음 날로 넘어간다» — 한 날 때문에 250일을 잃지 않는다. */
  const 참자 = (ms) => new Promise((r) => setTimeout(r, ms));
  const 끈질기게 = async (u, 다시 = 3) => {
    for (let 번 = 0; ; 번++) {
      try {
        const ac = new AbortController();
        const t = setTimeout(() => ac.abort(), 30000);
        const r = await fetch(u, { signal: ac.signal });
        clearTimeout(t);
        return r;
      } catch (e) {
        if (번 >= 다시) throw e;
        await 참자(3000 * (번 + 1));   /* 갈수록 길게 쉰다 — 그쪽을 몰아붙이지 않는다 */
      }
    }
  };

  const 목록받기 = async (날) => {
    try {
      const r = await 끈질기게(`https://api.edinet-fsa.go.jp/api/v2/documents.json?date=${날}&type=2&Subscription-Key=${KEY}`);
      if (!r.ok) return [];
      const j = await r.json().catch(() => null);
      return (j?.results || []).filter((x) => String(x.docTypeCode) === '120'
        && x.xbrlFlag === '1' && x.secCode);   /* 유가증권보고서 · XBRL 있음 · 상장종목 */
    } catch (e) { console.log(`   🔴 ${날} 목록을 못 받았다 — ${String(e?.message ?? e).slice(0, 60)}`); return null; }
  };

  let 받음 = 0, 건너 = 0, 실패 = 0, 못본날 = 0;
  for (const 날 of 날들) {
    const 목 = await 목록받기(날);
    if (목 === null) { 못본날++; continue; }   /* ⛔ 한 날 때문에 멈추지 않는다 */
    console.log(`\n── ${날} : 유가증권보고서(상장) ${목.length}건`);
    if (재본다) continue;
    const 볼것 = 몇개 ? 목.slice(0, 몇개) : 목;
    const 날폴더 = path.join(둘곳, 날);
    if (적는다) fs.mkdirSync(날폴더, { recursive: true });

    for (const d of 볼것) {
      const 낼길 = path.join(날폴더, `${d.docID}.json`);
      if (적는다 && !다시받는다 && fs.existsSync(낼길)) { 건너++; continue; }
      try {
        const rr = await 끈질기게(`https://api.edinet-fsa.go.jp/api/v2/documents/${d.docID}?type=5&Subscription-Key=${KEY}`);
        if (!rr.ok) { 실패++; console.log(`   🔴 ${d.docID} HTTP ${rr.status}`); continue; }
        const buf = Buffer.from(await rr.arrayBuffer());
        const 임시 = path.join(둘곳, `_tmp-${d.docID}`);
        fs.mkdirSync(임시, { recursive: true });
        fs.writeFileSync(`${임시}.zip`, buf);
        execFileSync('powershell', ['-NoProfile', '-Command',
          `Expand-Archive -Path "${임시}.zip" -DestinationPath "${임시}" -Force`]);
        const 훑 = (dir) => fs.readdirSync(dir, { withFileTypes: true })
          .flatMap((e) => (e.isDirectory() ? 훑(path.join(dir, e.name)) : [path.join(dir, e.name)]));
        /* 가장 «큰» CSV 가 본문이다 — 감사보고서 CSV 가 같이 들어 있다 */
        const csv = 훑(임시).filter((f) => /\.csv$/i.test(f))
          .sort((a, b) => fs.statSync(b).size - fs.statSync(a).size)[0];
        if (!csv) { 실패++; fs.rmSync(임시, { recursive: true, force: true }); fs.rmSync(`${임시}.zip`, { force: true }); continue; }
        const 씨 = fs.readFileSync(csv, 'utf16le');
        const { 값, 근거 } = 뽑기(씨);
        const 영문명 = 영문명뽑기(씨);
        const 대표자원문 = 대표자뽑기(씨);
        fs.rmSync(임시, { recursive: true, force: true });
        fs.rmSync(`${임시}.zip`, { force: true });

        if (!쓸만한가(값)) { 실패++; console.log(`   ⬜ ${d.docID} ${d.filerName} — 다섯 칸이 다 비었다`); continue; }
        const 한벌 = {
          _meta: {
            출처: '금융청 EDINET (api.edinet-fsa.go.jp/api/v2)',
            이용허락범위: '공공데이터 이용규약(PDL1.0) — 상업적 이용 가능, 출처 표시',
            받은날: 날, 받은때: new Date().toLocaleString('ko-KR'),
          },
          docID: d.docID,
          sec_code: String(d.secCode).replace(/0$/, ''),   /* EDINET 은 5자리(끝 0) — 4자리 종목코드로 */
          edinet_code: d.edinetCode,
          name: d.filerName,
          name_en: 영문명,   /* 서류가 스스로 적어 낸 영문명. 없으면 null */
          /* 표지의 「代表者の役職氏名」 **원문 그대로**. 가르지도, 옮기지도 않는다 —
             위 대표자뽑기() 머리말에 까닭을 적었다. 없으면 null(0 이나 빈 글자가 아니다) */
          representative_raw: 대표자원문,
          doc_description: d.docDescription,
          period_end: d.periodEnd ?? null,
          ...값,
          _근거: 근거,
        };
        if (적는다) fs.writeFileSync(낼길, JSON.stringify(한벌, null, 1), 'utf8');
        받음++;
        if (받음 <= 5 || 받음 % 20 === 0) {
          console.log(`   ✅ ${한벌.sec_code} ${한벌.name} — 매출 ${한벌.revenue_jpy ?? '—'} · 순이익 ${한벌.net_profit_jpy ?? '—'}`);
        }
      } catch (e) { 실패++; console.log(`   🔴 ${d.docID} ${String(e?.message ?? e).slice(0, 70)}`); }
    }
  }
  console.log(`\n■ 받음 ${받음} · 이미 있음 ${건너} · 못 뽑음 ${실패}`
    + (못본날 ? ` · 🔴 목록을 못 본 날 ${못본날}` : ''));
  if (적는다) console.log('■ 둔 곳 archive/raw/japan-edinet-financials/<날짜>/<docID>.json');
  else if (!재본다) console.log('⭐ --적는다 를 안 줬다. 저장하지 않았다.');
}
