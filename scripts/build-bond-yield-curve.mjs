#!/usr/bin/env node
/**
 * build-bond-yield-curve.mjs — Korea government-bond (국고채/KTB) yield curve, from one day's close.
 *
 * ── 왜 ─────────────────────────────────────────────────────────
 * rates 축이 얇다. 그런데 검색 실수요는 크다 — "korea bond yield" · "korea 10 year bond yield"
 * 는 자동완성 10줄(2026-08-24 실측). 우리는 이미 채권 종가수익률(clprBnfRt)을 받고 있다
 * (collect-bonds.mjs · data.go.kr getBondPriceInfo). 그 자료로 곡선 한 장을 굽는다.
 *
 * ── 무엇을 하나 ────────────────────────────────────────────────
 *  1) 최신 archive/raw/bonds/*.jsonl 을 읽는다(한 줄=한 종목, 한글 키).
 *  2) 국고채만 고른다. 이름 "국고CCCCC-YYMM(...)" 에서 **만기 YYMM 을 뽑아** 잔존연수를 잰다.
 *  3) 벤치마크 만기(1·2·3·5·10·20·30년)마다 잔존이 가장 가까운 종목을 하나씩 고른다.
 *  4) src/data/bond-yield-curve.json + public/charts/bond-yield-curve.svg (라이브러리 0줄) 로 떨군다.
 *
 * ── ⚠ 정직 규칙 ───────────────────────────────────────────────
 * · 이것은 **상장 국고채 종가수익률**이다. 한국은행 공식 「국고채 금리」(장외 최종호가)와 다를 수 있다.
 *   그래서 지면에도 "listed KTB close, not the official reference rate" 라고 적는다.
 * · 하루치다(T+1). 시계열이 아니다. 「어제 이랬다」이지 추세가 아니다.
 * · 못 채운 만기 버킷은 **** — 그 점은 빼고 "not matched" 로 센다.
 * · 수익률 이상치(<0.3% 또는 >8%, 비유동 호가)는 곡선에서 빼되 몇 개 뺐는지 적는다.
 *
 * ── 자가시험 ───────────────────────────────────────────────────
 *   node scripts/build-bond-yield-curve.mjs --self-test
 *   (만기 파서를 알려진 이름 몇 개로 검사한다. 통과 못 하면 비정상 종료.)
 *
 * archive 없거나 국고채 0이면 «못 쟀다»로 조용히 exit 0 (서버이동 대비, 크론 흐름 안 끊음).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW_DIR = path.join(ROOT, 'archive', 'raw', 'bonds');
const OUT_JSON = path.join(ROOT, 'src', 'data', 'bond-yield-curve.json');
const CHART = path.join(ROOT, 'public', 'charts', 'bond-yield-curve.svg');

const BENCHMARKS = [1, 2, 3, 5, 10, 20, 30]; // years
const DATA_DATE_FALLBACK = null;

/** 이름 "국고03000-4212(12-5)" → 만기 YYYY-MM. 못 읽으면 null. */
export function parseMaturity(name) {
  if (!name) return null;
  const m = String(name).match(/국고[0-9]{4,6}-(\d{2})(\d{2})/);
  if (!m) return null;
  const yy = +m[1];
  const mm = +m[2];
  if (mm < 1 || mm > 12) return null;
  return { year: 2000 + yy, month: mm };
}

/** 잔존연수 = (만기 - 기준일) 를 연 단위로. */
function residualYears(maturity, asOf) {
  if (!maturity) return null;
  const mMonths = maturity.year * 12 + (maturity.month - 1);
  const aMonths = asOf.year * 12 + (asOf.month - 1);
  return (mMonths - aMonths) / 12;
}

function selfTest() {
  const cases = [
    ['국고03000-4212(12-5)', 2042, 12],
    ['국고03125-2709(22-8)', 2027, 9],
    ['국고03500-5603(26-2)', 2056, 3],
    ['국고03500-2906(26-5)', 2029, 6],
    ['국고04750-3012(10-7)', 2030, 12],
  ];
  let ok = true;
  for (const [nm, y, mo] of cases) {
    const r = parseMaturity(nm);
    const pass = r && r.year === y && r.month === mo;
    if (!pass) { ok = false; console.error(`❌ ${nm} → ${JSON.stringify(r)} (기대 ${y}-${mo})`); }
  }
  // 잔존 검증: 5603 만기, 2026-08 기준 → ~29.6년 (반올림 30) ; 2906 → ~2.8년 (반올림 3)
  const r30 = residualYears(parseMaturity('국고03500-5603(26-2)'), { year: 2026, month: 8 });
  const r3 = residualYears(parseMaturity('국고03500-2906(26-5)'), { year: 2026, month: 8 });
  if (Math.round(r30) !== 30) { ok = false; console.error(`❌ 잔존 5603 = ${r30} (기대 ~30)`); }
  if (Math.round(r3) !== 3) { ok = false; console.error(`❌ 잔존 2906 = ${r3} (기대 ~3)`); }
  if (!ok) { console.error('자가시험 실패'); process.exit(1); }
  console.log('✅ 자가시험 통과 — 만기 파서·잔존 계산 정상');
}

function latestRawFile() {
  if (!fs.existsSync(RAW_DIR)) return null;
  const files = fs.readdirSync(RAW_DIR).filter((f) => /\.jsonl?$/.test(f) || /bonds.*\.json$/.test(f) || /\d{8}/.test(f));
  if (!files.length) return null;
  files.sort(); // 파일명에 날짜(YYYYMMDD)가 들어 사전순=시간순
  return path.join(RAW_DIR, files[files.length - 1]);
}

function readRows(file) {
  const text = fs.readFileSync(file, 'utf8').trim();
  if (!text) return [];
  // JSONL 우선, 아니면 배열
  if (text[0] === '[') { try { return JSON.parse(text); } catch { /* fall through */ } }
  return text.split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
}

function main() {
  if (process.argv.includes('--self-test')) { selfTest(); return; }

  const file = latestRawFile();
  if (!file) { console.log('«못 쟀다» — archive/raw/bonds 없음(서버이동일 수 있음). exit 0'); return; }
  const rows = readRows(file);
  if (!rows.length) { console.log('«못 쟀다» — 채권 raw 비어 있음. exit 0'); return; }

  const dataDate = String(rows[0].일자 || rows[0].basDt || '').replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3') || DATA_DATE_FALLBACK;
  const asOf = { year: +dataDate.slice(0, 4), month: +dataDate.slice(5, 7) };

  // 국고채만, 코드로 중복 제거(같은 종목 여러 호가 → 첫 것)
  const seen = new Set();
  const ktb = [];
  for (const r of rows) {
    const name = r.이름 || r.itmsNm || '';
    if (!/^국고/.test(name)) continue;
    const code = r.코드 || r.isin || name;
    if (seen.has(code)) continue;
    seen.add(code);
    const yld = Number(r.수익률 ?? r.clprBnfRt);
    const mat = parseMaturity(name);
    const ry = residualYears(mat, asOf);
    if (!mat || ry == null || ry <= 0) continue;
    ktb.push({ name, code, yield: yld, maturity: `${mat.year}-${String(mat.month).padStart(2, '0')}`, residualYears: +ry.toFixed(2) });
  }
  if (!ktb.length) { console.log('«못 쟀다» — 국고채 0종. exit 0'); return; }

  // 수익률 이상치 제거(비유동 호가). 몇 개 뺐는지 센다.
  const clean = ktb.filter((b) => Number.isFinite(b.yield) && b.yield >= 0.3 && b.yield <= 8);
  const dropped = ktb.length - clean.length;

  // 벤치마크 만기마다 잔존이 가장 가까운 종목(±25% 이내). 못 맞추면 그 점은 뺀다.
  const curve = [];
  const notMatched = [];
  for (const t of BENCHMARKS) {
    let best = null;
    for (const b of clean) {
      const d = Math.abs(b.residualYears - t);
      if (d <= t * 0.25 && (!best || d < best.d)) best = { ...b, d, tenor: t };
    }
    if (best) curve.push({ tenor: t, yield: best.yield, residualYears: best.residualYears, maturity: best.maturity, bond: best.name });
    else notMatched.push(t);
  }

  const out = {
    asOf: dataDate,
    source: 'Korea government bonds (KTB), listed close yields — data.go.kr getBondPriceInfo via KRX/공공데이터, T+1',
    note: 'These are listed-KTB closing yields, not the Bank of Korea official reference (over-the-counter) rates; they can differ. One day, not a trend.',
    ktbCount: ktb.length,
    usedCount: clean.length,
    droppedOutliers: dropped,
    notMatchedTenors: notMatched,
    curve,
    allPoints: clean
      .map((b) => ({ residualYears: b.residualYears, yield: b.yield, maturity: b.maturity }))
      .sort((a, b) => a.residualYears - b.residualYears),
  };
  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(out, null, 2) + '\n');

  // ── SVG 곡선 (라이브러리 0줄, 집안 방식) ──
  writeChart(out);

  const head = curve.length
    ? curve.map((c) => `${c.tenor}y ${c.yield.toFixed(2)}%`).join(' · ')
    : '(벤치마크 매칭 0)';
  console.log(`✅ bond-yield-curve · ${dataDate} · 국고 ${ktb.length}종(사용 ${clean.length}, 이상치 ${dropped}) · ${head}`);
  if (notMatched.length) console.log(`   ⚠ 못 맞춘 만기(0으로 안 채움): ${notMatched.join(', ')}년`);
}

function writeChart(out) {
  const W = 720, H = 420, ML = 60, MR = 24, MT = 40, MB = 56;
  const pts = out.allPoints;
  const curve = out.curve;
  const xs = pts.map((p) => p.residualYears);
  const ys = pts.map((p) => p.yield);
  const xMax = Math.ceil(Math.max(30, ...xs));
  const yMin = Math.floor(Math.min(...ys, ...curve.map((c) => c.yield)) * 2) / 2;
  const yMax = Math.ceil(Math.max(...ys, ...curve.map((c) => c.yield)) * 2) / 2;
  const px = (x) => ML + (x / xMax) * (W - ML - MR);
  const py = (y) => MT + (1 - (y - yMin) / (yMax - yMin || 1)) * (H - MT - MB);

  const yTicks = [];
  for (let v = yMin; v <= yMax + 1e-9; v += 0.5) yTicks.push(+v.toFixed(2));
  const xTicks = [0, 5, 10, 15, 20, 25, 30].filter((t) => t <= xMax);

  const grid = yTicks.map((v) =>
    `<line x1="${ML}" y1="${py(v).toFixed(1)}" x2="${W - MR}" y2="${py(v).toFixed(1)}" stroke="#e6e6e3" stroke-width="1"/>` +
    `<text x="${ML - 8}" y="${(py(v) + 4).toFixed(1)}" text-anchor="end" font-size="12" fill="#666">${v.toFixed(1)}%</text>`
  ).join('');
  const xlab = xTicks.map((t) =>
    `<text x="${px(t).toFixed(1)}" y="${H - MB + 20}" text-anchor="middle" font-size="12" fill="#666">${t}y</text>`
  ).join('');

  const scatter = pts.map((p) =>
    `<circle cx="${px(p.residualYears).toFixed(1)}" cy="${py(p.yield).toFixed(1)}" r="2.6" fill="#9aa7b4"/>`
  ).join('');

  const curveSorted = [...curve].sort((a, b) => a.tenor - b.tenor);
  const line = curveSorted.map((c, i) =>
    `${i ? 'L' : 'M'}${px(c.residualYears).toFixed(1)},${py(c.yield).toFixed(1)}`
  ).join(' ');
  const marks = curveSorted.map((c) =>
    `<circle cx="${px(c.residualYears).toFixed(1)}" cy="${py(c.yield).toFixed(1)}" r="4.5" fill="#0f4c81"/>` +
    `<text x="${px(c.residualYears).toFixed(1)}" y="${(py(c.yield) - 10).toFixed(1)}" text-anchor="middle" font-size="11" fill="#0f4c81" font-weight="700">${c.yield.toFixed(2)}</text>`
  ).join('');

  const svg =
`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Georgia, 'Times New Roman', serif">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
  <text x="${ML}" y="24" font-size="15" font-weight="700" fill="#111">Korea government bond yields by remaining maturity — ${out.asOf}</text>
  ${grid}
  ${xlab}
  <line x1="${ML}" y1="${MT}" x2="${ML}" y2="${H - MB}" stroke="#333" stroke-width="1"/>
  <line x1="${ML}" y1="${H - MB}" x2="${W - MR}" y2="${H - MB}" stroke="#333" stroke-width="1"/>
  ${scatter}
  <path d="${line}" fill="none" stroke="#0f4c81" stroke-width="2"/>
  ${marks}
  <text x="${W - MR}" y="${H - 8}" text-anchor="end" font-size="10" fill="#999">Listed KTB close (data.go.kr), not the official reference rate · one day · not advice</text>
</svg>
`;
  fs.mkdirSync(path.dirname(CHART), { recursive: true });
  fs.writeFileSync(CHART, svg);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
