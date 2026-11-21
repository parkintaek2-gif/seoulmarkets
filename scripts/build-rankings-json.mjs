#!/usr/bin/env node
/**
 * 순위표를 **영문 웹 지면용 JSON** 으로 뽑는다.
 *
 *   npm run build:rankings        → src/data/rankings.json
 *
 * ── 왜 따로 만드나 ─────────────────────────────────────────────
 * `render-ranking.mjs` 는 **한국어 로컬 리포트**다(1,261KB · archive/report/).
 * 사장님께 보여 드리는 용도로는 그게 맞는데, **사이트에 그대로 못 올린다** —
 *   ① SeoulMarkets 는 영문 매체다. 한국어 지면이 섞이면 안 된다
 *   ② 1.26MB 를 첫 화면에서 내려받게 하면 모바일에서 못 쓴다
 *
 * 그래서 **계산은 그대로 재사용하고**(`가공`·`곁붙이기`·`한계`) 표현만 새로 만든다.
 * 계산을 복사하면 두 곳이 어긋난다 — 실제로 이 저장소에서 그 사고가 났었다.
 *
 * ── ⚠ 크기를 줄이는 방법 ──────────────────────────────────────
 * 객체 배열(`{근속:12.3, 급여:...}`)로 내면 키 이름이 2,900번 반복된다.
 * **열 순서를 정하고 값만 배열로** 낸다. 같은 자료가 1/3 로 준다.
 *   cols: ['tenure','pay',...]  rows: [['Samsung', 12.3, 1.2e8, ...], ...]
 *
 * ── ⚠ 없는 값은 0 이 아니라 null ──────────────────────────────
 * 「신고 안 함」과 「0」은 다르다. 0 으로 채우면 순위 맨 아래가 거짓으로 찬다.
 *
 * ── ⚠ 단위 오기는 거르되 고치지 않는다 ────────────────────────
 * `한계` 로 거른다. DART 는 신고자가 단위를 자유 기재해서 「개월↔년」·「천원↔원」이
 * 섞여 들어온다. **고치면 우리가 지어낸 값**이 된다. 거르고, 몇 건 걸렀는지 화면에 밝힌다.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { 읽기, 곁붙이기, 가공, 이상점검 } from './render-ranking.mjs';

/**
 * KSIC 중분류(2자리) 영문명.
 * ⚠ 한국어 `업종명` 을 그대로 내보내면 영문 지면에 한글이 섞인다.
 *   통계청 영문 표기를 따르되, 화면에 들어갈 길이로 줄였다.
 *   없는 코드는 `null` 로 두고 화면에서 「Other」로 묶는다 — **지어내지 않는다.**
 */
export const 업종영문 = {
  '01': 'Agriculture', '03': 'Fishing', '05': 'Coal mining', '06': 'Oil and gas extraction',
  '07': 'Metal ore mining', '08': 'Other mining', '10': 'Food products', '11': 'Beverages',
  '13': 'Textiles', '14': 'Apparel', '15': 'Leather and footwear', '16': 'Wood products',
  '17': 'Pulp and paper', '18': 'Printing and reproduction', '19': 'Coke and refined petroleum',
  '20': 'Chemicals', '21': 'Pharmaceuticals', '22': 'Rubber and plastics',
  '23': 'Non-metallic minerals', '24': 'Basic metals', '25': 'Fabricated metal products',
  '26': 'Electronics and telecom equipment', '27': 'Medical and optical instruments',
  '28': 'Electrical equipment', '29': 'Machinery and equipment', '30': 'Motor vehicles',
  '31': 'Other transport equipment', '32': 'Furniture', '33': 'Other manufacturing',
  '34': 'Industrial repair', '35': 'Electricity and gas', '36': 'Water supply',
  '37': 'Sewerage', '38': 'Waste management', '39': 'Remediation',
  '41': 'Building construction', '42': 'Civil engineering',
  '45': 'Motor vehicle trade', '46': 'Wholesale trade', '47': 'Retail trade',
  '49': 'Land transport', '50': 'Water transport', '51': 'Air transport',
  '52': 'Transport support services', '55': 'Accommodation', '56': 'Food and beverage services',
  '58': 'Publishing', '59': 'Film, video and audio production', '60': 'Broadcasting',
  '61': 'Telecommunications', '62': 'Computer programming', '63': 'Information services',
  '64': 'Financial services', '65': 'Insurance and pensions', '66': 'Financial support services',
  '68': 'Real estate', '69': 'Rental and leasing',
  '70': 'Research and development', '71': 'Professional services',
  '72': 'Architecture and engineering', '73': 'Other scientific and technical services',
  '74': 'Business support services', '75': 'Business facilities support',
  '76': 'Employment services', '84': 'Public administration', '85': 'Education',
  '86': 'Human health', '87': 'Residential care', '88': 'Social work',
  '90': 'Creative and performing arts', '91': 'Sports and recreation',
  '94': 'Membership organisations', '95': 'Repair services', '96': 'Personal services',
};

/** 시·도 영문. 로마자 표기는 정부 표준을 따른다 */
export const 지역영문 = {
  '서울': 'Seoul', '부산': 'Busan', '대구': 'Daegu', '인천': 'Incheon', '광주': 'Gwangju',
  '대전': 'Daejeon', '울산': 'Ulsan', '세종': 'Sejong', '경기': 'Gyeonggi', '강원': 'Gangwon',
  '충북': 'North Chungcheong', '충남': 'South Chungcheong', '전북': 'North Jeolla',
  '전남': 'South Jeolla', '경북': 'North Gyeongsang', '경남': 'South Gyeongsang', '제주': 'Jeju',
};

/**
 * 화면에 세울 축. `render-ranking.mjs` 의 축과 **일부러 같은 키**를 쓴다 —
 * 한쪽에 축이 늘면 다른 쪽에도 같은 이름으로 는다.
 *
 * `good` 은 「높을수록 좋은가」다. **거의 전부 null 이다.**
 * 근속이 길다고 좋은 회사가 아니고(이직이 막힌 것일 수도 있다), 급여가 높다고
 * 좋은 직장이 아니다(지주회사는 본사만 센다). **단정하지 않는 것이 기본값이다.**
 */
export const AXES = [
  { key: '근속',   id: 'tenure',     label: 'Average tenure',              unit: 'yr',  dir: 'desc',
    note: 'Company-reported average across all employees, weighted by male and female headcount.' },
  { key: '근속격차', id: 'tenureGap',  label: 'Tenure gap (M−F)',            unit: 'yr',  dir: 'desc',
    note: 'Positive means men stay longer. Negative means women do.' },
  { key: '급여',   id: 'pay',        label: 'Average pay per employee',    unit: 'KRW', dir: 'desc',
    note: 'As filed. Bonus and option treatment differs by company; holding companies count head office only.' },
  { key: '급여비', id: 'payRatio',   label: 'Female pay / male pay',       unit: '%',   dir: 'asc',
    note: '100% means equal. Lower means the female average is lower.' },
  { key: '인원',   id: 'headcount',  label: 'Employees',                   unit: 'n',   dir: 'desc' },
  { key: '여성비', id: 'femaleShare',label: 'Female share of workforce',   unit: '%',   dir: 'desc' },
  { key: '대표재직', id: 'ceoTenure', label: 'Longest-serving CEO',         unit: 'yr',  dir: 'desc',
    note: 'Where a company has several representative directors, the longest-serving one is used.' },
  { key: '임원수', id: 'officers',   label: 'Registered and unregistered officers', unit: 'n', dir: 'desc' },
  { key: '업력',   id: 'age',        label: 'Years since incorporation',   unit: 'yr',  dir: 'desc',
    note: 'From the incorporation date on file, not the listing date.' },
  { key: '1인당시총', id: 'mktCapPerHead', label: 'Market cap per employee', unit: 'KRW', dir: 'desc',
    note: 'Latest KRX market capitalisation divided by headcount as filed to DART. Joined on ticker; unlisted names or those with no traded close are left null, not zero.' },

  /**
   * 🔒 [2026-09-17 · 사장님 지시, 5번 전달] 「사람을 절대 주력으로 하지 마라 —
   *   우리는 영어판 FnGuide 로 승부를 봐야 하지 않니?」(2026-09-09·09-14 반복 지시).
   * 그런데 이 표는 축 열 개가 전부 사람 축이었다. 재무 축 다섯을 더한다.
   * 출처는 src/data/korea-valuation-tape.json(2,709곳, build-korea-valuation-tape.mjs 산출) —
   * DART 재무제표 원문에서 뽑은 값이라 render-ranking.mjs 의 사람 축 계산과는 별도다.
   * ⛔ 값이 없으면(총자본≤0·이자비용=0 등) null 로 둔다. 
   */
  { key: '시가총액', id: 'marketCap', label: 'Market capitalisation', unit: 'KRWtn', dir: 'desc',
    note: 'Latest KRX close × shares outstanding, as of the price date on the valuation tape.' },
  { key: '주가순자산배율', id: 'pbr', label: 'Price to book (PBR)', unit: 'x', dir: 'desc',
    note: 'Market cap ÷ total equity, most recent annual filing. Null where total equity is zero or negative.' },
  { key: '자기자본이익률', id: 'roe', label: 'Return on equity (ROE)', unit: '%', dir: 'desc',
    note: 'Net income ÷ total equity, most recent annual filing. Null where total equity is zero or negative.' },
  { key: '이자보상배율', id: 'interestCoverage', label: 'Interest coverage', unit: 'x', dir: 'desc',
    note: 'Operating income ÷ finance costs. A value under 1 means operating profit does not cover interest expense. Null where finance costs are zero or not filed.' },
  { key: '차입금자본비율', id: 'borrowToEquity', label: 'Borrowings / equity', unit: '%', dir: 'asc',
    note: 'Short-term + long-term borrowings + bonds, divided by total equity. This is interest-bearing debt only, not total liabilities. Null where none of the three borrowing lines were filed, or total equity is zero or negative.' },
];

function main() {
  const i = process.argv.indexOf('--year');
  const 연도 = i > -1 ? process.argv[i + 1] : '2025';
  const 원천 = path.resolve(`archive/raw/dart-employment/employment-${연도}.ndjson`);
  if (!existsSync(원천)) { console.error(`✕ ${원천} 이 없다. npm run collect:tenure 를 먼저.`); process.exit(1); }

  const 회사파일 = path.resolve('archive/raw/dart-company/company.ndjson');
  const 임원파일 = path.resolve(`archive/raw/dart-executives/executives-${연도}.ndjson`);
  const 회사표 = existsSync(회사파일) ? 읽기(회사파일) : [];
  const 임원표 = existsSync(임원파일) ? 읽기(임원파일) : [];

  const 행 = 곁붙이기(가공(읽기(원천)), 회사표, 임원표);

  /* 시가총액 — 최신 거래일 stocks 에서 종목코드로 잇는다(1인당 시총 축용).
     계산은 여기서만 한다: 시총/인원. 다른 축처럼 render-ranking 이 주는 값이 아니라
     시세(내 소관)와의 조인이라 이 빌더에서 붙인다. 없으면 null(0 아님). */
  const 시총맵 = new Map();
  let 시총일 = null;
  const stocksDir = path.resolve('archive/raw/stocks');
  if (existsSync(stocksDir)) {
    시총일 = readdirSync(stocksDir).filter((f) => /^\d{8}\.ndjson$/.test(f)).sort().pop() ?? null;
    if (시총일) for (const l of readFileSync(path.join(stocksDir, 시총일), 'utf8').split('\n')) {
      if (!l.trim()) continue;
      const s = JSON.parse(l);
      if (s.시가총액 > 0) 시총맵.set(String(s.코드).padStart(6, '0'), s.시가총액);
    }
  }

  /* 시세 이중화 — 수집기(collect-stock-prices)는 실패하면 파일을 아예 안 쓴다(0건도 안 쓴다).
     그래서 「옛 값」은 여기서만 샌다: 위 sort().pop() 이 새 파일이 없으면 오래된 파일을 조용히 재사용한다.
     지면은 「as of」로 빌드시각을 보여줘서 손님은 시세가 옛것인지 모른다 → 시세 기준일·지연을 따로 내보낸다.
     T+1 + 주말 + 명절 최장 휴장을 넉넉히 덮어 7일을 넘으면 「못 받은 것」으로 본다. */
  let mktCapLagDays = null;
  if (시총일) {
    const [oy, om, od] = new Date().toLocaleString('sv-SE').slice(0, 10).split('-').map(Number);
    const y = +시총일.slice(0, 4), m = +시총일.slice(4, 6), d = +시총일.slice(6, 8);
    mktCapLagDays = Math.round((new Date(oy, om - 1, od) - new Date(y, m - 1, d)) / 86400000);
  }
  const mktCapStale = 시총일 == null || (mktCapLagDays != null && mktCapLagDays > 7);

  /* 재무 축 다섯 — korea-valuation-tape.json(종목코드 유일) 을 종목코드로 잇는다.
     ⚠ 이 파일이 없어도 빌드를 멈추지 않는다 — 재무 축만 전부 null 로 빠진다(0 아님). */
  const 밸류경로 = path.resolve('src/data/korea-valuation-tape.json');
  const 밸류맵 = new Map();
  if (existsSync(밸류경로)) {
    const 밸류표 = JSON.parse(readFileSync(밸류경로, 'utf8')).rows ?? [];
    for (const v of 밸류표) 밸류맵.set(String(v.ticker).padStart(6, '0'), v);
  } else {
    console.warn('  ⚠ korea-valuation-tape.json 이 없다 — 재무 축 다섯은 전부 null 로 나간다.');
  }

  /* 영문명 붙이기 — corp 로 잇는다. ⚠ 이 열쇠를 빠뜨려 35,004행 읽고 0건 붙은 적이 있다 */
  const 영문맵 = new Map(회사표.map((r) => [r.corp, r]));

  let 거른수 = 0;
  const rows = [];
  for (const r of 행) {
    /* ⚠ 단위 오기를 거른다. 고치지 않는다 */
    if (이상점검(r)) { 거른수++; continue; }
    const c = 영문맵.get(r.corp);
    /* 영문명이 없으면 국문명을 그대로 쓴다 — **비우면 그 회사가 화면에서 사라진다** */
    const 이름 = (c?.영문 ?? '').trim() || r.이름;
    const 업종 = c?.업종 ? (업종영문[c.업종] ?? null) : null;
    /**
     * ⚠ **대표 재직기간이 회사 업력보다 긴 곳이 113군데 있다.** 논리적으로 불가능하다.
     *
     * 원인이 둘 다 그럴듯하다 —
     *   ① 신고자가 **전신·계열사 재직까지 합쳐** 적었다
     *   ② DART 의 `설립일` 이 합병·분할 뒤 **재설립일**이라 실제보다 짧다
     * 어느 쪽인지 자료 안에서 가릴 수 없다. **그래서 고르지 않는다.**
     *
     * 처리 — **빼지 않고 표시만 한다.**
     *   빼면 6.2% 가 사라지는데 하필 값이 큰 쪽이라 순위가 아래로 눌린다.
     *   즉 「거르기」가 이 축에서는 그 자체로 왜곡이다. 표시하고 뜻을 화면에 적는다.
     */
    const 업력 = r.업력;
    const 대표모순 = r.대표재직 != null && 업력 != null && r.대표재직 > 업력 + 0.5;

    /* 1인당 시가총액 — 최신 시총 ÷ 신고 인원. 상장·주가·인원 다 있어야 값이 산다 */
    const 시총 = c?.종목 ? 시총맵.get(String(c.종목).padStart(6, '0')) : null;
    r['1인당시총'] = (시총 > 0 && r['인원'] > 0) ? 시총 / r['인원'] : null;

    /* 재무 축 다섯 — 종목코드로 밸류 테이프와 잇는다. 못 찾으면 다섯 다 null */
    const 밸류 = c?.종목 ? 밸류맵.get(String(c.종목).padStart(6, '0')) : null;
    r['시가총액'] = (밸류?.marketCap > 0) ? 밸류.marketCap : null;
    r['주가순자산배율'] = Number.isFinite(밸류?.pbr) ? 밸류.pbr : null;
    r['자기자본이익률'] = Number.isFinite(밸류?.roe) ? 밸류.roe * 100 : null;
    r['이자보상배율'] = (밸류?.financeCosts > 0 && Number.isFinite(밸류?.operatingIncome))
      ? 밸류.operatingIncome / 밸류.financeCosts : null;
    {
      const 차입금항목 = [밸류?.shortTermBorrowings, 밸류?.longTermBorrowings, 밸류?.bonds]
        .filter((x) => x != null && Number.isFinite(x));
      const 차입금 = 차입금항목.length ? 차입금항목.reduce((a, b) => a + b, 0) : null;
      r['차입금자본비율'] = (차입금 != null && 밸류?.totalEquity > 0) ? (차입금 / 밸류.totalEquity) * 100 : null;
    }

    rows.push([
      이름,
      c?.종목 ?? null,
      업종,
      c?.시도 ? (지역영문[c.시도] ?? null) : null,
      대표모순 ? 1 : 0,
      /* ⚠ `a.키` 가 아니라 `a.key` 다. 한 번 틀렸더니 **모든 축이 조용히 null** 이 됐다.
       *   행 수도 파일 크기도 멀쩡해서 눈으로는 안 보인다 — 채움률을 찍어야 잡힌다. */
      ...AXES.map((a) => {
        const v = r[a.key];
        if (v == null || !Number.isFinite(v)) return null;
        /* 소수 둘째 자리까지. 파일 크기가 눈에 띄게 준다 */
        return a.unit === 'KRW' || a.unit === 'n' ? Math.round(v) : Math.round(v * 100) / 100;
      }),
    ]);
  }

  const 산출 = {
    year: Number(연도),
    generated: new Date().toLocaleString('sv-SE').replace('T', ' '),   /* ⚠ 이 PC 는 이미 KST 다 */
    cols: ['name', 'ticker', 'industry', 'region', 'ceoFlag', ...AXES.map((a) => a.id)],
    axes: AXES.map(({ id, label, unit, dir, note }) => ({ id, label, unit, dir, note: note ?? null })),
    filtered: 거른수,
    /** 1인당 시총 축이 조인한 시세 기준일(YYYYMMDD). 화면 「as of」에 쓴다 */
    mktCapAsOf: 시총일 ? `${시총일.slice(0, 4)}-${시총일.slice(4, 6)}-${시총일.slice(6, 8)}` : null,
    /** 시세 지연(일) 과 「너무 오래됐나」 플래그. 지면이 옛 값을 옛 값으로 말하게 하는 근거다 */
    mktCapLagDays,
    mktCapStale,
    /** 대표 재직 > 업력 인 곳. 뺀 게 아니라 **표시만** 한다 */
    ceoFlagged: rows.filter((x) => x[4] === 1).length,
    rows,
  };

  mkdirSync(path.resolve('src/data'), { recursive: true });
  const 파일 = path.resolve('src/data/rankings.json');
  writeFileSync(파일, JSON.stringify(산출));
  const 채움 = (n) => {
    const idx = 산출.cols.indexOf(n);
    return (rows.filter((x) => x[idx] != null).length / rows.length * 100).toFixed(1) + '%';
  };
  console.log(`회사 ${rows.length.toLocaleString()} · 축 ${AXES.length}개 · 단위오기로 거른 것 ${거른수}건`);
  console.log(`  채움률 — 업종 ${채움('industry')} · 지역 ${채움('region')} · 급여 ${채움('pay')} · 대표재직 ${채움('ceoTenure')} · 1인당시총 ${채움('mktCapPerHead')}(${산출.mktCapAsOf})`);
  console.log(`  ${(readFileSync(파일).length / 1024).toFixed(0)}KB  →  ${파일}`);
  if (mktCapStale) console.warn(`  ⚠ 시세가 오래됐다(${산출.mktCapAsOf ?? '파일 없음'}${mktCapLagDays != null ? `, ${mktCapLagDays}일 전` : ''}) — 1인당시총은 지면에서 「not received」로 나간다. collect:prices 를 확인하라.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
