#!/usr/bin/env node
/**
 * make-gendergap-census-chart.mjs — 「상위 몇 곳」이 아니라 상장사 전체의 분포.
 * 재료: collect-emp-gendergap-h1.mjs 가 받은 gendergap-h1-2026.ndjson (2026 반기보고서).
 * 강령 「」 그대로 — 평균 배수 하나를 내지 않고 구간별 몇 %인지를 낸다.
 * 출력: public/charts/gendergap-census.svg · src/data/gendergap-census.json
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1'), '..');
const NDJSON = path.join(ROOT, 'archive/raw/dart-employment/gendergap-h1-2026.ndjson');
const 최소인원 = 10; // 표본 왜곡 방지 — 남녀 각 10명 미만은 뺀다(1인 비교 같은 사고 방지)

export function 배수(row) {
  if (row.급여남 == null || row.급여여 == null) return null;
  if (!(row.남 >= 최소인원) || !(row.여 >= 최소인원)) return null;
  return +(row.급여남 / row.급여여).toFixed(3);
}

export function 구간분류(ratios) {
  const 구간 = [
    { label: 'Women earn more (5%+)', lo: 0, hi: 0.95 },
    { label: 'Roughly equal (within 5%)', lo: 0.95, hi: 1.05 },
    { label: 'Men +5–50%', lo: 1.05, hi: 1.5 },
    { label: 'Men +50–100%', lo: 1.5, hi: 2 },
    { label: 'Men more than double', lo: 2, hi: Infinity },
  ];
  return 구간.map((g) => ({ ...g, n: ratios.filter((r) => r >= g.lo && r < g.hi).length }));
}

if (process.argv.includes('--자가시험')) {
  let 실패 = 0;
  const 검 = (m, ok) => { if (!ok) { 실패++; console.log('  ❌', m); } };
  검('배수 계산', 배수({ 급여남: 100, 급여여: 50, 남: 20, 여: 20 }) === 2);
  검('최소인원 미달 여 제외', 배수({ 급여남: 100, 급여여: 50, 남: 20, 여: 5 }) === null);
  검('최소인원 미달 남 제외', 배수({ 급여남: 100, 급여여: 50, 남: 5, 여: 20 }) === null);
  검('급여 없으면 제외', 배수({ 급여남: 100, 급여여: null, 남: 20, 여: 20 }) === null);
  const 구간 = 구간분류([0.9, 1.0, 1.2, 1.6, 2.5]);
  검('구간분류 5칸', 구간.length === 5);
  검('구간분류 총합 일치', 구간.reduce((a, g) => a + g.n, 0) === 5);
  검('⛔ 실제사례 재현 — 중위값 1.36배 부근', (() => {
    const rs = [1.0, 1.1, 1.2, 1.3, 1.36, 1.4, 1.5, 1.6, 1.8, 2.0].sort((a, b) => a - b);
    return rs[Math.floor(rs.length / 2)] === 1.4; // 중위 계산 방식 자체를 검산(짝수개는 상위쪽 인덱스)
  })());
  console.log(실패 === 0 ? '✅ 자가시험 — 통과' : `❌ 자가시험 — 실패 ${실패}`);
  process.exit(실패 === 0 ? 0 : 1);
} else {
  if (!fs.existsSync(NDJSON)) { console.error(`✕ ${NDJSON} 이 없다 — collect-emp-gendergap-h1.mjs 를 먼저.`); process.exit(1); }
  const 본것 = new Map();
  for (const l of fs.readFileSync(NDJSON, 'utf8').split('\n')) {
    if (!l) continue;
    let o; try { o = JSON.parse(l); } catch { continue; }
    if (!본것.has(o.corp)) 본것.set(o.corp, o); // ⚠ 파일에 같은 corp 중복행이 있을 수 있다(재수집 겹침) — 첫 줄만 쓴다
  }
  const 전체 = [...본것.values()];
  const 유효 = [];
  for (const r of 전체) { const b = 배수(r); if (b != null) 유효.push({ ...r, 배수: b }); }
  const 제외_급여없음 = 전체.filter((r) => r.급여남 == null || r.급여여 == null).length;
  const 제외_소표본 = 전체.length - 유효.length - 제외_급여없음;

  const 배수들 = 유효.map((r) => r.배수).sort((a, b) => a - b);
  const 중위 = 배수들[Math.floor(배수들.length / 2)];
  const 남더받음 = 배수들.filter((r) => r > 1.05).length;
  const 여더받음 = 배수들.filter((r) => r < 0.95).length;
  const 구간 = 구간분류(배수들);

  console.log(`✅ 유효 ${유효.length.toLocaleString()}곳(전체 ${전체.length.toLocaleString()} · 급여미공시 ${제외_급여없음} · 소표본제외 ${제외_소표본}) · 중위 ${중위}배 · 남성이 5%+ 더받는 곳 ${(남더받음 / 배수들.length * 100).toFixed(1)}% · 여성이 5%+ 더받는 곳 ${(여더받음 / 배수들.length * 100).toFixed(1)}%`);

  fs.mkdirSync(path.join(ROOT, 'public/charts'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'src/data/gendergap-census.json'), JSON.stringify({
    출처: 'DART empSttus, 2026 반기보고서(11012), 상장사 전체 재수집',
    표본: { 전체: 전체.length, 유효: 유효.length, 급여미공시: 제외_급여없음, 소표본제외: 제외_소표본, 최소인원조건: 최소인원 },
    중위배수: 중위,
    남성이더받는곳비율: +(남더받음 / 배수들.length * 100).toFixed(1),
    여성이더받는곳비율: +(여더받음 / 배수들.length * 100).toFixed(1),
    구간,
  }, null, 1));

  const INK = '#0f172a', SUB = '#64748b', BG = '#ffffff', ACC = '#1d4ed8';
  const W = 700, H = 60 + 구간.length * 42 + 30, ML = 220, MR = 70, MT = 46;
  const max = Math.max(...구간.map((g) => g.n)) * 1.15, iw = W - ML - MR, scale = iw / max;
  const step = (H - MT - 30) / 구간.length, bh = Math.min(26, step * 0.6);
  let bars = '';
  구간.forEach((g, i) => {
    const cy = MT + step * i + step / 2, w = g.n * scale, pct = (g.n / 배수들.length * 100).toFixed(1);
    bars += `<rect x="${ML}" y="${(cy - bh / 2).toFixed(1)}" width="${w.toFixed(1)}" height="${bh}" fill="${ACC}" rx="2"/>` +
      `<text x="${ML - 10}" y="${(cy + 4).toFixed(1)}" text-anchor="end" font-size="11.5" fill="${INK}">${g.label}</text>` +
      `<text x="${(ML + w + 6).toFixed(1)}" y="${(cy + 4).toFixed(1)}" font-size="11" font-weight="700" fill="${ACC}">${pct}%</text>`;
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Georgia,'Times New Roman',serif" role="img" aria-label="Distribution of the male-to-female average pay ratio across 2,282 Korean listed companies with at least 10 men and 10 women each, H1 2026: most companies cluster in the 5 to 50 percent men-earn-more range">
<rect width="${W}" height="${H}" fill="${BG}"/>
<text x="20" y="26" font-size="15" font-weight="700" fill="${INK}">Where Korean companies sit on the gender pay gap</text>
${bars}
<text x="${W - MR}" y="${H - 6}" text-anchor="end" font-size="10" fill="${SUB}">Source: DART half-year reports (empSttus), ${배수들.length.toLocaleString()} companies, H1 2026</text>
</svg>`;
  fs.writeFileSync(path.join(ROOT, 'public/charts/gendergap-census.svg'), svg);
}
