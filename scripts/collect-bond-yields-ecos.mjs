#!/usr/bin/env node
/**
 * collect-bond-yields-ecos.mjs — 국고채 수익률 곡선, 한국은행 ECOS 원천으로.
 *
 * ── 왜 만드나 (2026-09-06, FSC 제4유형 9/9 원천교체) ─────────────────────
 * collect-bonds.mjs(data.go.kr getBondPriceInfo)는 9/9부터 상업이용 제한(FSC 공지).
 * 그 자료의 쓰임은 둘로 갈린다 — ①국고채 수익률곡선(build-bond-yield-curve.mjs)
 * ②채권 거래집중 CSV(build-bond-trading-concentration.mjs, 개별종목 수백 개 필요).
 * ECOS는 **①만** 대체 가능하다 — 표 817Y002(시장금리·일별)가 국고채 만기별
 * «벤치마크» 수익률(1·2·3·5·10·20·30·50년)을 직접 준다. 개별종목 거래량은 없어
 * ②는 여전히 못 고친다(따로 KRX 유료전환/대안 필요, 이 자 범위 밖).
 *
 * ⭐ ECOS 것이 오히려 더 정직하다 — 옛 자료(상장 국고채 «종가»)는 한국은행 공식
 *   기준금리와 다를 수 있어 지면에 그 차이를 매번 적었다. ECOS 것은 한국은행이
 *   직접 내는 **그 공식 자료 자체**다.
 *
 * ── 무엇을 하나 ────────────────────────────────────────────────
 *   1) ECOS StatisticSearch(817Y002, 일별)로 만기별 최근 값을 받는다(며칠 창 — T+1~3 지연 대비).
 *   2) 만기마다 「가장 최근 날짜」를 쓰되, 여럿이 어긋나면 **공통으로 가장 많은 만기가
 *      찍힌 날짜**를 그 날로 정한다( — 못 찍은 만기는 뺀다).
 *   3) archive/raw/bond-yields-ecos/<날짜>.json 으로 원본 저장(put, R2 백업).
 *   4) src/data/bond-yield-curve.json + public/charts/bond-yield-curve.svg 를 덮어 쓴다
 *      (build-bond-yield-curve.mjs 와 같은 자리 — 이제 이 자가 그 자리의 주인이다).
 *
 * 쓰는 법
 *   node scripts/collect-bond-yields-ecos.mjs
 *   node scripts/collect-bond-yields-ecos.mjs --self-test
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { put } from '../src/lib/store.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_JSON = path.join(ROOT, 'src', 'data', 'bond-yield-curve.json');
const CHART = path.join(ROOT, 'public', 'charts', 'bond-yield-curve.svg');

/** 만기(년) → ECOS 817Y002 항목코드. 국고채(5년)만 다른 계열번호(0201)라 그대로 둔다. */
export const 만기코드 = {
  1: '010190000',
  2: '010195000',
  3: '010200000',
  5: '010200001',
  10: '010210000',
  20: '010220000',
  30: '010230000',
  50: '010240000',
};

function 키읽기() {
  const p = path.join(ROOT, '.env');
  if (existsSync(p)) for (const l of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = l.match(/^\s*ECOS_KEY\s*=\s*(.*)$/);
    if (m) return m[1].trim().replace(/^["']|["']$/g, '');
  }
  return process.env.ECOS_KEY ?? '';
}

/** ⚠ KST. toISOString 안 씀(자정~9시 어긋남). */
function 날짜문자(d) { return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`; }

export async function 만기하나받기(key, code, from, to) {
  const u = `https://ecos.bok.or.kr/api/StatisticSearch/${key}/json/kr/1/30/817Y002/D/${from}/${to}/${code}`;
  const r = await fetch(u);
  const j = await r.json();
  const rows = j?.StatisticSearch?.row;
  if (!Array.isArray(rows)) return [];
  return rows.map((x) => ({ time: x.TIME, value: Number(x.DATA_VALUE) })).filter((x) => Number.isFinite(x.value));
}

/** 만기별 최근 30일치를 모아, «가장 많은 만기가 찍힌 날»을 기준일로 고른다. */
export function 기준일고르기(만기별시계열) {
  const 날짜별개수 = new Map();
  for (const rows of Object.values(만기별시계열)) {
    for (const r of rows) 날짜별개수.set(r.time, (날짜별개수.get(r.time) ?? 0) + 1);
  }
  let 최선 = null;
  for (const [날짜, 개수] of 날짜별개수) {
    if (!최선 || 개수 > 최선.개수 || (개수 === 최선.개수 && 날짜 > 최선.날짜)) 최선 = { 날짜, 개수 };
  }
  return 최선?.날짜 ?? null;
}

function writeChart(out) {
  const W = 720, H = 420, ML = 60, MR = 24, MT = 40, MB = 56;
  const curve = out.curve;
  if (!curve.length) return;
  const xMax = Math.max(30, ...curve.map((c) => c.tenor));
  const yMin = Math.floor(Math.min(...curve.map((c) => c.yield)) * 2) / 2 - 0.5;
  const yMax = Math.ceil(Math.max(...curve.map((c) => c.yield)) * 2) / 2 + 0.5;
  const px = (x) => ML + (x / xMax) * (W - ML - MR);
  const py = (y) => MT + (1 - (y - yMin) / (yMax - yMin || 1)) * (H - MT - MB);

  const yTicks = [];
  for (let v = yMin; v <= yMax + 1e-9; v += 0.5) yTicks.push(+v.toFixed(2));
  const xTicks = [0, 5, 10, 15, 20, 25, 30, 50].filter((t) => t <= xMax);

  const grid = yTicks.map((v) =>
    `<line x1="${ML}" y1="${py(v).toFixed(1)}" x2="${W - MR}" y2="${py(v).toFixed(1)}" stroke="#e6e6e3" stroke-width="1"/>` +
    `<text x="${ML - 8}" y="${(py(v) + 4).toFixed(1)}" text-anchor="end" font-size="12" fill="#666">${v.toFixed(1)}%</text>`
  ).join('');
  const xlab = xTicks.map((t) =>
    `<text x="${px(t).toFixed(1)}" y="${H - MB + 20}" text-anchor="middle" font-size="12" fill="#666">${t}y</text>`
  ).join('');

  const sorted = [...curve].sort((a, b) => a.tenor - b.tenor);
  const line = sorted.map((c, i) => `${i ? 'L' : 'M'}${px(c.tenor).toFixed(1)},${py(c.yield).toFixed(1)}`).join(' ');
  const marks = sorted.map((c) =>
    `<circle cx="${px(c.tenor).toFixed(1)}" cy="${py(c.yield).toFixed(1)}" r="4.5" fill="#0f4c81"/>` +
    `<text x="${px(c.tenor).toFixed(1)}" y="${(py(c.yield) - 10).toFixed(1)}" text-anchor="middle" font-size="11" fill="#0f4c81" font-weight="700">${c.yield.toFixed(2)}</text>`
  ).join('');

  const svg =
`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Georgia, 'Times New Roman', serif">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
  <text x="${ML}" y="24" font-size="15" font-weight="700" fill="#111">Korea government bond yields by maturity — ${out.asOf}</text>
  ${grid}
  ${xlab}
  <line x1="${ML}" y1="${MT}" x2="${ML}" y2="${H - MB}" stroke="#333" stroke-width="1"/>
  <line x1="${ML}" y1="${H - MB}" x2="${W - MR}" y2="${H - MB}" stroke="#333" stroke-width="1"/>
  <path d="${line}" fill="none" stroke="#0f4c81" stroke-width="2"/>
  ${marks}
  <text x="${W - MR}" y="${H - 8}" text-anchor="end" font-size="10" fill="#999">Bank of Korea ECOS, official reference rates · one day · not advice</text>
</svg>
`;
  mkdirSync(path.dirname(CHART), { recursive: true });
  writeFileSync(CHART, svg);
}

function selfTest() {
  const 시계열 = {
    3: [{ time: '20260901', value: 3.5 }, { time: '20260902', value: 3.6 }],
    10: [{ time: '20260901', value: 4.1 }, { time: '20260902', value: 4.2 }],
    30: [{ time: '20260901', value: 4.5 }],
  };
  const 기준일 = 기준일고르기(시계열);
  let ok = true;
  if (기준일 !== '20260901') { ok = false; console.error(`❌ 기준일 = ${기준일} (기대 20260901, 셋 다 찍힌 날)`); }
  if (!ok) { console.error('자가시험 실패'); process.exit(1); }
  console.log('✅ 자가시험 통과 — 기준일 고르기 정상');
}

async function main() {
  if (process.argv.includes('--self-test')) { selfTest(); return; }

  const key = 키읽기();
  if (!key) { console.error('⛔ .env에 ECOS_KEY 없음'); process.exit(1); }

  const 오늘 = new Date();
  const to = 날짜문자(오늘);
  const from = 날짜문자(new Date(오늘.getTime() - 20 * 86400000));

  const 만기별시계열 = {};
  for (const [만기, 코드] of Object.entries(만기코드)) {
    만기별시계열[만기] = await 만기하나받기(key, 코드, from, to);
  }

  const 기준일 = 기준일고르기(만기별시계열);
  if (!기준일) { console.log('«못 쟀다» — ECOS에서 받은 것이 없다. exit 0'); return; }

  const curve = [];
  const notMatchedTenors = [];
  for (const [만기, 시계열] of Object.entries(만기별시계열)) {
    const row = 시계열.find((r) => r.time === 기준일);
    if (row) curve.push({ tenor: +만기, yield: row.value });
    else notMatchedTenors.push(+만기);
  }
  curve.sort((a, b) => a.tenor - b.tenor);

  const asOf = `${기준일.slice(0, 4)}-${기준일.slice(4, 6)}-${기준일.slice(6, 8)}`;
  const out = {
    asOf,
    source: 'Bank of Korea ECOS, table 817Y002 (market interest rates, daily) — official KTB reference yields by maturity',
    note: 'These are the Bank of Korea\'s own official benchmark yields, not a listed-bond closing price. One day, not a trend.',
    curve,
    notMatchedTenors,
  };

  mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  writeFileSync(OUT_JSON, JSON.stringify(out, null, 2) + '\n');
  writeChart(out);

  await put(`raw/bond-yields-ecos/${기준일}.json`, JSON.stringify({ 만기별시계열, 기준일, curve }, null, 2), 'application/json');

  const head = curve.map((c) => `${c.tenor}y ${c.yield.toFixed(2)}%`).join(' · ');
  console.log(`✅ bond-yield-curve(ECOS) · ${asOf} · ${head}`);
  if (notMatchedTenors.length) console.log(`   ⚠ 못 맞춘 만기(0으로 안 채움): ${notMatchedTenors.join(', ')}년`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main();
}
