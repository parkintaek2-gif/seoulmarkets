#!/usr/bin/env node
/**
 * make-tenure-census-chart.mjs — 근속연수, 순위가 아니라 «상장사 전체의 분포».
 * 재료: collect-tenure.mjs 가 받은 archive/raw/dart-employment/employment-YYYY.ndjson (사업보고서, 11011).
 * korea-how-long-industries-keep-workers(업종별 순위)와 다르다 — 이건 «회사 하나하나가 어디에 있나»다.
 * 강령 「」 — 평균 하나를 내지 않고 구간별 몇 %인지를 낸다.
 * 출력: public/charts/tenure-census.svg · src/data/tenure-census.json
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1'), '..');

export function 구간분류(값들) {
  const 구간 = [
    { label: 'Under 3 years', lo: 0, hi: 3 },
    { label: '3–6 years', lo: 3, hi: 6 },
    { label: '6–10 years', lo: 6, hi: 10 },
    { label: '10–15 years', lo: 10, hi: 15 },
    { label: '15+ years', lo: 15, hi: Infinity },
  ];
  return 구간.map((g) => ({ ...g, n: 값들.filter((x) => x >= g.lo && x < g.hi).length }));
}

if (process.argv.includes('--자가시험')) {
  let 실패 = 0;
  const 검 = (m, ok) => { if (!ok) { 실패++; console.log('  ❌', m); } };
  const 구간 = 구간분류([1, 2, 4, 7, 12, 18, 20]);
  검('구간분류 5칸', 구간.length === 5);
  검('구간분류 총합 일치', 구간.reduce((a, g) => a + g.n, 0) === 7);
  검('Under 3 버킷', 구간[0].n === 2);
  검('15+ 버킷', 구간[4].n === 2);
  검('⛔ 실제사례 재현 — 6.19년은 6~10년대에 든다', 구간분류([6.19])[2].n === 1);
  console.log(실패 === 0 ? '✅ 자가시험 — 통과' : `❌ 자가시험 — 실패 ${실패}`);
  process.exit(실패 === 0 ? 0 : 1);
} else {
  const 연도 = process.argv.find((a) => /^--year=/.test(a))?.split('=')[1] ?? '2025';
  const NDJSON = path.join(ROOT, `archive/raw/dart-employment/employment-${연도}.ndjson`);
  if (!fs.existsSync(NDJSON)) { console.error(`✕ ${NDJSON} 이 없다 — collect-tenure.mjs 를 먼저.`); process.exit(1); }

  const 본것 = new Map();
  for (const l of fs.readFileSync(NDJSON, 'utf8').split('\n')) {
    if (!l) continue;
    let o; try { o = JSON.parse(l); } catch { continue; }
    if (!본것.has(o.corp)) 본것.set(o.corp, o);
  }
  const 전체 = [...본것.values()];
  const 유효 = 전체.filter((r) => r.근속 != null && r.인원 > 0);
  const 근속값 = 유효.map((r) => r.근속).sort((a, b) => a - b);
  const 중위 = 근속값[Math.floor(근속값.length / 2)];
  const 구간 = 구간분류(근속값);
  const 총인원 = 유효.reduce((a, r) => a + r.인원, 0);

  console.log(`✅ 유효 ${유효.length.toLocaleString()}곳(전체 ${전체.length.toLocaleString()} · 근속미공시 ${전체.length - 유효.length}) · 중위 ${중위}년 · 총 재적인원 ${총인원.toLocaleString()}명`);

  fs.mkdirSync(path.join(ROOT, 'public/charts'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'src/data/tenure-census.json'), JSON.stringify({
    출처: `DART empSttus, ${연도}년 사업보고서(11011), 상장사 전체 재수집`,
    표본: { 전체: 전체.length, 유효: 유효.length, 근속미공시: 전체.length - 유효.length },
    중위근속: 중위,
    총재적인원: 총인원,
    구간,
  }, null, 1));

  const INK = '#0f172a', SUB = '#64748b', BG = '#ffffff', ACC = '#1d4ed8';
  const W = 700, H = 60 + 구간.length * 42 + 30, ML = 170, MR = 70, MT = 46;
  const max = Math.max(...구간.map((g) => g.n)) * 1.15, iw = W - ML - MR, scale = iw / max;
  const step = (H - MT - 30) / 구간.length, bh = Math.min(26, step * 0.6);
  let bars = '';
  구간.forEach((g, i) => {
    const cy = MT + step * i + step / 2, w = g.n * scale, pct = (g.n / 근속값.length * 100).toFixed(1);
    bars += `<rect x="${ML}" y="${(cy - bh / 2).toFixed(1)}" width="${w.toFixed(1)}" height="${bh}" fill="${ACC}" rx="2"/>` +
      `<text x="${ML - 10}" y="${(cy + 4).toFixed(1)}" text-anchor="end" font-size="12" fill="${INK}">${g.label}</text>` +
      `<text x="${(ML + w + 6).toFixed(1)}" y="${(cy + 4).toFixed(1)}" font-size="11" font-weight="700" fill="${ACC}">${pct}%</text>`;
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Georgia,'Times New Roman',serif" role="img" aria-label="Distribution of average employee tenure across ${근속값.length.toLocaleString()} Korean listed companies, FY${연도}: most companies cluster between 3 and 10 years, a small tail holds workers 15 years or more">
<rect width="${W}" height="${H}" fill="${BG}"/>
<text x="20" y="26" font-size="15" font-weight="700" fill="${INK}">Where Korean listed firms sit on staff tenure</text>
${bars}
<text x="${W - MR}" y="${H - 6}" text-anchor="end" font-size="10" fill="${SUB}">Source: DART annual reports (empSttus), ${근속값.length.toLocaleString()} companies, FY${연도}</text>
</svg>`;
  fs.writeFileSync(path.join(ROOT, 'public/charts/tenure-census.svg'), svg);
}
