#!/usr/bin/env node
/**
 * **콘텐트사가 사람을 짧게 붙드는 것이 「회사가 어려서」인가.** → src/data/wikitip-firm-age.json
 *
 *   node scripts/build-wikitip-firm-age.mjs
 *   입력 → src/data/rankings.json (이미 세워 둔 상장사 표. 새로 안 받는다)
 *
 * ── 왜 ─────────────────────────────────────────────────────────
 * 우리는 이미 「콘텐트사는 6.18년, 상장시장은 11.29년」을 냈다. 그런데 같은 파일에
 * **회사 나이(age)** 칸이 있는데 한 번도 안 썼다. 콘텐트사는 평균 23.9년, 시장은 43.5년이다.
 *
 * ⛔ **스무 살 회사에서 11년 근속은 애초에 어렵다.** 그러니 「짧다」의 얼마가 젊음이고
 *    얼마가 업종인지 가르지 않으면, 우리는 나이를 업종이라고 부르는 것이다.
 *    오늘 아침에 같은 잘못을 한 번 했다 — 봉우리를 길이라고 불렀다. 두 번은 안 한다.
 *
 * ⚠ 인원으로 가중한다. 그래야 「이 업종에서 **일하는 사람**의 평균 근속」이 된다.
 * ⛔ 회사 이름을 안 담는다. 줄세우기가 된다.
 */
import fs from 'node:fs';
/* 🔴 [2026-11-14] 영문 지면에 「오후」가 나갔다 — 잰 시각은 한 꼴로 적는다 */
import { 잰때문자 } from './lib/잰때.mjs';

const 길 = 'src/data/rankings.json';
/** 콘텐트로 보는 업종 코드. `build-wikitip-content-industry.mjs` 와 **같은 것**을 쓴다 */
export const 콘텐트업종 = ['Broadcasting', 'Film, video and audio production', 'Publishing'];

/** 회사 나이 띠. 젊음을 묶어 놓고 업종을 견주려는 것이다 */
export const 띠 = [
  { label: 'under 15 years', lo: 0, hi: 15 },
  { label: '15 to 30 years', lo: 15, hi: 30 },
  { label: '30 to 50 years', lo: 30, hi: 50 },
  { label: '50 years or more', lo: 50, hi: Infinity },
];

/** 인원 가중평균. 인원이 없는 줄은 **빼고 센다** — 0으로 넣으면 조용히 끌어내린다 */
export function 가중(rows, 값칸, 인원칸) {
  const 쓸것 = rows.filter((r) => r[값칸] != null && r[인원칸] != null && r[인원칸] > 0);
  if (!쓸것.length) return null;
  const 인원 = 쓸것.reduce((s, r) => s + r[인원칸], 0);
  return { value: +(쓸것.reduce((s, r) => s + r[값칸] * r[인원칸], 0) / 인원).toFixed(2), firms: 쓸것.length, staff: 인원 };
}

/** 얇은 칸은 읽지 않는다. 몇 회사뿐인 칸에서 배수를 읽으면 한 회사를 읽는 것이다 */
export const 얇음문턱 = 5;

if (process.argv[1] && process.argv[1].endsWith('build-wikitip-firm-age.mjs')) {
  let 시험 = 0; let 통과 = 0;
  const 자가 = (이름, 참) => { 시험++; if (참) 통과++; else console.log(`  ⛔ 자가시험 실패 — ${이름}`); };
  자가('인원으로 가중한다', 가중([[10, 1], [20, 9]], 0, 1).value === 19);
  자가('회사 수를 센다', 가중([[10, 1], [20, 9]], 0, 1).firms === 2);
  자가('값이 없으면 뺀다', 가중([[null, 100], [20, 1]], 0, 1).value === 20);
  자가('인원이 0이면 뺀다', 가중([[10, 0], [20, 5]], 0, 1).value === 20);
  자가('쓸 줄이 없으면 null', 가중([[null, 1]], 0, 1) === null);
  자가('띠가 안 겹친다', 띠.every((b, i) => i === 0 || b.lo === 띠[i - 1].hi));
  console.log(`회사 나이 자 — 자가시험 ${시험}건 중 ${통과}건 통과`);
  if (통과 !== 시험) process.exit(1);

  const R = JSON.parse(fs.readFileSync(길, 'utf8'));
  const C = Object.fromEntries(R.cols.map((c, i) => [c, i]));
  for (const need of ['industry', 'tenure', 'headcount', 'age']) {
    if (C[need] === undefined) throw new Error(`rankings.json 에 '${need}' 칸이 없다`);
  }

  const 콘텐트인가 = (r) => 콘텐트업종.some((g) => String(r[C.industry] ?? '').startsWith(g));
  /* 근속·인원·나이가 다 있는 줄만. 하나라도 없으면 이 물음에 못 쓴다 */
  const 쓸것 = R.rows.filter((r) => r[C.tenure] != null && r[C.headcount] != null && r[C.headcount] > 0 && r[C.age] != null);
  const 콘텐트 = 쓸것.filter(콘텐트인가);
  const 시장 = 쓸것.filter((r) => !콘텐트인가(r));

  const 재기 = (rows) => ({
    tenure: 가중(rows, C.tenure, C.headcount),
    age: 가중(rows, C.age, C.headcount),
  });

  const 전체 = { content: 재기(콘텐트), rest: 재기(시장) };

  const bands = 띠.map((b) => {
    const c = 콘텐트.filter((r) => r[C.age] >= b.lo && r[C.age] < b.hi);
    const m = 시장.filter((r) => r[C.age] >= b.lo && r[C.age] < b.hi);
    const ct = 가중(c, C.tenure, C.headcount);
    const mt = 가중(m, C.tenure, C.headcount);
    /* ⛔ 얇은 칸에서는 배수를 안 낸다. null 은 「안 쟀다」이고 0 과 다르다 */
    const 얇나 = !ct || !mt || ct.firms < 얇음문턱 || mt.firms < 얇음문턱;
    return {
      label: b.label,
      contentTenure: ct?.value ?? null,
      contentFirms: ct?.firms ?? 0,
      contentStaff: ct?.staff ?? 0,
      restTenure: mt?.value ?? null,
      restFirms: mt?.firms ?? 0,
      restStaff: mt?.staff ?? 0,
      ratio: 얇나 ? null : +(mt.value / ct.value).toFixed(2),
      thin: 얇나,
    };
  });

  const 쟨띠 = bands.filter((b) => b.ratio !== null);
  const out = {
    generated: 잰때문자(),
    source: 'Financial Supervisory Service (Korea), DART annual report employee disclosures — tenure, headcount and years since incorporation, for every listed company that discloses them',
    sourceKo: '금융감독원 전자공시(DART) — 근속·인원·설립 후 연수',
    method: 'Tenure is weighted by headcount, so each figure is the average tenure of a person working in that group rather than of a company. Companies are then banded by their own age, so the comparison holds firm age roughly fixed.',
    limit: 'Listed companies only. Much of Korean content production is unlisted and files none of this, so nothing here describes those firms.',
    thinThreshold: 얇음문턱,
    thinNote: `A band with fewer than ${얇음문턱} companies on either side reports no ratio, because a ratio over four companies is a reading of four companies.`,
    firmsUsed: 쓸것.length,
    overall: {
      contentTenure: 전체.content.tenure.value,
      contentAge: 전체.content.age.value,
      contentFirms: 전체.content.tenure.firms,
      restTenure: 전체.rest.tenure.value,
      restAge: 전체.rest.age.value,
      restFirms: 전체.rest.tenure.firms,
      ratio: +(전체.rest.tenure.value / 전체.content.tenure.value).toFixed(2),
      ageGap: +(전체.rest.age.value - 전체.content.age.value).toFixed(1),
    },
    bands,
    /** 나이를 묶어도 남는 것. 이게 「업종 몫」에 가장 가까운 수다 */
    withinBand: {
      note: 'Ratios inside each age band, where firm age is roughly held fixed.',
      min: 쟨띠.length ? Math.min(...쟨띠.map((b) => b.ratio)) : null,
      max: 쟨띠.length ? Math.max(...쟨띠.map((b) => b.ratio)) : null,
      measuredBands: 쟨띠.length,
      totalBands: bands.length,
    },
  };
  fs.writeFileSync('src/data/wikitip-firm-age.json', JSON.stringify(out, null, 2));

  const o = out.overall;
  console.log(`쓸 줄 ${out.firmsUsed} · 콘텐트 ${o.contentFirms}곳 · 나머지 ${o.restFirms}곳`);
  console.log(`전체 — 근속 ${o.contentTenure} 대 ${o.restTenure} (${o.ratio}배) · 회사 나이 ${o.contentAge} 대 ${o.restAge} (${o.ageGap}년 차)`);
  for (const b of bands) {
    console.log(`  ${b.label.padEnd(18)} 콘텐트 ${String(b.contentTenure).padStart(5)} (${b.contentFirms}곳) · 나머지 ${String(b.restTenure).padStart(5)} (${b.restFirms}곳) → ${b.ratio ?? '얇아서 안 읽음'}`);
  }
  console.log(`나이를 묶어도 남는 배수: ${out.withinBand.min} ~ ${out.withinBand.max} (잰 띠 ${out.withinBand.measuredBands}/${out.withinBand.totalBands})`);
}
