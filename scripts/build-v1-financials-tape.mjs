/**
 * build-v1-financials-tape.mjs — `/v1/financials` 가 내줄 표를 짓는다.
 * ─────────────────────────────────────────────────────────────────────────
 * 사장님 지시 (2026-09-13): 「마무리 해」 — 내가 「구멍」으로 보고한 셋 가운데 하나다.
 *   `/v1/financials` 가 404 였고 `/v1` 색인에도 없었다. 설계 문서
 *   (docs/사업전략-데이터제공업.md 303줄)에는 2026-08 부터 적혀 있었는데 «지은 적이 없다».
 *
 * 우물: archive/raw/dart-financials/financials-<해>-<받은날>.json
 *   DART fnlttSinglAcntAll (reprt_code=11011 사업보고서) 를 회사별로 훑어 놓은 것.
 *
 * 🔴 못 쟨 것은 못 쟀다고 적는다 (강령 ③)
 *   DART 에 재무가 «안 올라온» 회사가 2,709 중 132곳이다. 그 줄을  —
 *   `measured:false` 로 내고, coverage 에 몇 곳인지 적는다.
 *
 * ⚠ CFS(연결) 가 없으면 OFS(별도) 를 쓴다. 어느 것을 썼는지 `basis` 로 밝힌다 —
 *   둘을 말없이 섞으면 회사끼리 비교가 안 되는 표가 된다.
 */
import fs from 'node:fs';
import path from 'node:path';

const 뿌리 = path.resolve(import.meta.dirname, '..');
const 우물 = path.join(뿌리, 'archive/raw/dart-financials');
const 낼곳 = path.join(뿌리, 'src/data/korea-financials-tape.json');

/** 해마다 «가장 최근에 받은» 파일 하나만 쓴다 — 같은 해를 두 번 받은 것이 있다 */
export function 해마다최신(이름들) {
  const 표 = new Map();
  for (const 이름 of 이름들) {
    const m = String(이름).match(/^financials-(\d{4})-(\d{8})\.json$/);
    if (!m) continue;
    const [, 해, 받은날] = m;
    const 앞 = 표.get(해);
    if (!앞 || 앞.받은날 < 받은날) 표.set(해, { 해: Number(해), 받은날, 이름 });
  }
  return [...표.values()].sort((a, b) => b.해 - a.해);
}

/** ⛔ 0 을 「쟀다」로 세지 않는다. null·undefined 와 「안 올라옴」을 가른다 */
export function 값(v) {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function 한줄(r, 해) {
  const 연결쟀나 = r.CFS_쟀나 === true;
  const 별도쟀나 = r.OFS_쟀나 === true;
  const 기준 = 연결쟀나 ? 'CFS' : (별도쟀나 ? 'OFS' : null);
  const 앞 = 기준 ? 기준 + '_' : null;
  return {
    code: String(r.종목 ?? '').trim() || null,
    corp_code: String(r.corp ?? '').trim() || null,
    name: r.이름 ?? null,
    name_en: r.영문이름 ?? null,
    market: r.시장 ?? null,
    sector: r.업종명 ?? null,
    year: Number(r.해 ?? 해),
    measured: Boolean(기준),
    basis: 기준,
    assets_krw: 앞 ? 값(r[앞 + '자산총계']) : null,
    equity_krw: 앞 ? 값(r[앞 + '자본총계']) : null,
    revenue_krw: 앞 ? 값(r[앞 + '매출액']) : null,
    operating_profit_krw: 앞 ? 값(r[앞 + '영업이익']) : null,
    net_profit_krw: 앞 ? 값(r[앞 + '당기순이익']) : null,
    source_line_count: 앞 ? 값(r[앞 + '행수']) : null,
  };
}

export function 짓기(파일들, 읽기 = (p) => JSON.parse(fs.readFileSync(p, 'utf8'))) {
  const 줄들 = [];
  const 해별 = [];
  for (const it of 파일들) {
    const j = 읽기(path.join(우물, it.이름));
    const 원줄 = Array.isArray(j.줄들) ? j.줄들 : [];
    const 낸것 = 원줄.map((r) => 한줄(r, it.해));
    줄들.push(...낸것);
    해별.push({
      year: it.해,
      pulled_on: it.받은날,
      report: j.보고서 ?? null,
      companies: 원줄.length,
      measured: 낸것.filter((x) => x.measured).length,
      not_on_file: 낸것.filter((x) => !x.measured).length,
      consolidated: 낸것.filter((x) => x.basis === 'CFS').length,
      separate_only: 낸것.filter((x) => x.basis === 'OFS').length,
    });
  }
  줄들.sort((a, b) => (b.year - a.year) || String(a.code).localeCompare(String(b.code)));
  return {
    _meta: {
      product: 'Korea Financials Tape',
      source: 'DART Open API — fnlttSinglAcntAll, annual report (reprt_code 11011)',
      builtAt: new Date().toLocaleString('ko-KR'),
      rows: 줄들.length,
      years: 해별,
      basisNote: 'basis says which statement the figures came from: CFS = consolidated, OFS = separate-only. '
        + 'Companies that file no consolidated statement appear as OFS. We never mix the two silently.',
      notMeasuredNote: 'measured:false means DART had no annual statement on file for that company and year. '
        + 'Those rows carry nulls, never zeros — an unfiled figure is not a figure of zero.',
      notThis: 'This is what companies filed. It is not our estimate, not a forecast, and not advice.',
    },
    rows: 줄들,
  };
}

/* ── 자가시험 — 사장님: 「규칙은 문장이 아니라 검사로 둔다」 ───────────────── */
export function 자가시험() {
  const 흠 = [];
  const 재다 = (이름, 참) => { if (!참) 흠.push(이름); };

  재다('해마다 최신 하나만', 해마다최신([
    'financials-2025-20260910.json', 'financials-2025-20260911.json', 'financials-2024-20260911.json',
  ]).length === 2);
  재다('최신은 더 늦게 받은 것', 해마다최신([
    'financials-2025-20260910.json', 'financials-2025-20260911.json',
  ])[0].받은날 === '20260911');
  재다('이름이 안 맞으면 버린다', 해마다최신(['엉뚱한.json']).length === 0);
  재다('최신 해가 앞에 온다', 해마다최신([
    'financials-2024-20260911.json', 'financials-2025-20260911.json',
  ])[0].해 === 2025);

  재다('0 은 0 이다', 값(0) === 0);
  재다('null 은 null', 값(null) === null);
  재다('빈칸은 null', 값(undefined) === null);
  재다('글자는 null', 값('없음') === null);
  재다('숫자글자는 숫자', 값('123') === 123);

  const 연결 = 한줄({ 종목: '005930', 해: 2025, CFS_쟀나: true, CFS_매출액: 100, OFS_쟀나: true, OFS_매출액: 9 }, 2025);
  재다('연결이 있으면 연결', 연결.basis === 'CFS' && 연결.revenue_krw === 100);
  const 별도 = 한줄({ 종목: '000020', 해: 2025, OFS_쟀나: true, OFS_매출액: 9 }, 2025);
  재다('연결이 없으면 별도', 별도.basis === 'OFS' && 별도.revenue_krw === 9);
  const 없음 = 한줄({ 종목: '000030', 해: 2025 }, 2025);
  재다('아무것도 없으면 못 쟀다', 없음.measured === false && 없음.basis === null);
  재다('못 쟀으면 값이 null 이지 0 이 아니다', 없음.revenue_krw === null && 없음.assets_krw === null);

  const 지은것 = 짓기([{ 해: 2025, 받은날: '20260911', 이름: 'x.json' }], () => ({
    보고서: '11011 사업보고서',
    줄들: [
      { 종목: '1', 해: 2025, CFS_쟀나: true, CFS_매출액: 5 },
      { 종목: '2', 해: 2025, OFS_쟀나: true, OFS_매출액: 3 },
      { 종목: '3', 해: 2025 },
    ],
  }));
  재다('줄 수가 맞는다', 지은것.rows.length === 3);
  재다('쟀다 둘', 지은것._meta.years[0].measured === 2);
  재다('못 쟀다 하나', 지은것._meta.years[0].not_on_file === 1);
  재다('연결 하나 · 별도 하나', 지은것._meta.years[0].consolidated === 1 && 지은것._meta.years[0].separate_only === 1);
  재다('못 잰 줄에 0 이 없다', 지은것.rows.every((r) => r.measured || r.revenue_krw === null));

  return 흠;
}

if (process.argv[1] && process.argv[1].endsWith('build-v1-financials-tape.mjs')) {
  const 흠 = 자가시험();
  if (흠.length) { console.log('🔴 자가시험 실패:\n  - ' + 흠.join('\n  - ')); process.exit(1); }
  console.log('✅ 자가시험 ' + (18 - 흠.length) + '/18');

  const 파일들 = 해마다최신(fs.readdirSync(우물));
  if (!파일들.length) { console.log('🔴 우물이 비었다: ' + 우물); process.exit(1); }
  const 표 = 짓기(파일들);
  fs.writeFileSync(낼곳, JSON.stringify(표), 'utf8');
  console.log('✅ ' + 낼곳);
  console.log('   줄 ' + 표.rows.length + ' · 해 ' + 표._meta.years.map((y) => y.year + '(' + y.measured + '/' + y.companies + ')').join(' · '));
}
