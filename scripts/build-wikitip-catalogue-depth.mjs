/**
 * K Culture Wire — **나라마다 한국 작품을 몇 편이나 겪었나.** (`/catalogue-depth`)
 *
 * 결과 → src/data/wikitip-catalogue-depth.json
 * 입력 → archive/raw/netflix-top10/countries.ndjson
 *
 * ── 왜 재나 ────────────────────────────────────────────────────────
 * `/world-share` 는 「자리를 몇 % 잡았나」를 낸다. 그것만으로는 안 보이는 것이 있다 —
 * **같은 5%라도 스무 편이 돌아가며 잡은 5%와 한 편이 잡은 5%는 다른 물건이다.**
 * 여기서는 **깊이**를 잰다. 몇 편이나 들어와 봤나, 그중 몇 편이 절반을 채우나.
 *
 * ── 🔴 스스로 놓는 대조군 ──────────────────────────────────────────
 * 「한국 자리가 적은 나라는 **당연히** 편수도 적고 쏠려 보인다」 — 이 반박이 옳을 수 있다.
 * 그러면 이 자료는 「자리가 적다」를 두 번 말하는 것일 뿐이다.
 * ⭐ 그래서 **한국 자리 수가 비슷한 나라끼리만 따로 견준다**(matched band).
 *    거기서도 차이가 남으면 그만큼은 자리 수로 설명되지 않는 것이다.
 *    ⛔ 차이가 사라지면 사라졌다고 적는다. 살아남은 만큼만 말한다.
 *
 * ── ⚠ 못 말하는 것 ────────────────────────────────────────────────
 * ⛔ 시청량이 아니다. 나라별 목록에는 시간이 없다.
 * ⛔ 취향이 아니다. Top10 에 들었나만 보인다. 조용히 많이 본 것은 여기 없다.
 * ⛔ 러시아는 목록이 2022-02 에 끊겼다(700줄). 뺀다. 이름으로 적는다.
 * ⛔ 나라를 1위부터 늘어놓지 않는다. 두 무리와 **양 끝**만 내고 왜 다른지를 적는다.
 */
import fs from 'node:fs';
import readline from 'node:readline';
import { koreanTitleFilter } from './lib/korean-netflix-titles.mjs';
/* 🔴 [2026-11-14] 영문 지면에 「오후」가 나갔다 — 잰 시각은 한 꼴로 적는다 */
import { 잰때문자 } from './lib/잰때.mjs';

const ko = koreanTitleFilter();
const 끊긴나라 = new Set(['RU']);
/** 「아시아 열」 = `/world-share` 에서 한국 자리가 20% 를 넘던 곳. 새로 고르지 않는다 */
const 아시아열 = new Set(['KR', 'VN', 'ID', 'MY', 'TW', 'TH', 'HK', 'PH', 'SG', 'JP']);
/** 대조군 띠 — 한국 자리 수가 이 사이인 나라끼리만 견준다 */
const 띠 = [600, 1200];

const 나라 = new Map();
const rl = readline.createInterface({
  input: fs.createReadStream('archive/raw/netflix-top10/countries.ndjson'),
  crlfDelay: Infinity,
});
for await (const line of rl) {
  if (!line.trim()) continue;
  let r; try { r = JSON.parse(line); } catch { continue; }
  if (끊긴나라.has(r.iso2)) continue;
  let a = 나라.get(r.iso2);
  if (!a) { a = { iso2: r.iso2, name: r.국가, rows: 0, korean: 0, weeks: new Set(), titles: new Map() }; 나라.set(r.iso2, a); }
  a.rows++; a.weeks.add(r.주);
  if (!ko.keepTitle(r.제목)) continue;
  a.korean++;
  a.titles.set(r.제목, (a.titles.get(r.제목) || 0) + 1);
}

/* ⚠ 전제 — 나라마다 자리 수가 같아야 견줄 수 있다. 다르면 던진다 */
const 꼴 = new Set([...나라.values()].map((a) => `${a.rows}|${a.weeks.size}`));
if (꼴.size !== 1) throw new Error(`나라마다 자리 수가 다르다 — 견줄 수 없다: ${[...꼴].join(' · ')}`);

const 비율 = (x, n) => (n ? +((100 * x) / n).toFixed(1) : null);
/** 절반을 채우는 데 몇 편이 드나. **자리가 없으면 null** — 0 은 「한 편도 안 든다」는 뜻이 된다 */
const 깊이 = (a) => {
  if (!a.korean) return null;
  const v = [...a.titles.values()].sort((x, y) => y - x);
  let s = 0;
  for (let i = 0; i < v.length; i++) {
    s += v[i];
    if (s >= a.korean / 2) return i + 1;
  }
  return v.length;
};

const 잰것 = [...나라.values()].map((a) => ({
  iso2: a.iso2,
  name: a.name,
  koreanSlots: a.korean,
  koreanPc: 비율(a.korean, a.rows),
  distinctTitles: a.titles.size,
  halfTakes: 깊이(a),
  topTitle: a.titles.size ? [...a.titles.entries()].sort((x, y) => y[1] - x[1])[0][0] : null,
  topTitlePc: a.titles.size ? 비율(Math.max(...a.titles.values()), a.korean) : null,
  slotsPerTitle: a.titles.size ? +(a.korean / a.titles.size).toFixed(2) : null,
  inAsianTen: 아시아열.has(a.iso2),
}));

const 중앙 = (v) => {
  const s = v.filter((x) => x !== null).sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : null;
};
const 무리셈 = (g) => ({
  countries: g.length,
  medianKoreanSlots: 중앙(g.map((x) => x.koreanSlots)),
  medianDistinctTitles: 중앙(g.map((x) => x.distinctTitles)),
  medianHalfTakes: 중앙(g.map((x) => x.halfTakes)),
  medianTopTitlePc: 중앙(g.map((x) => x.topTitlePc)),
  medianSlotsPerTitle: 중앙(g.map((x) => x.slotsPerTitle)),
});

const 안 = 잰것.filter((x) => x.inAsianTen);
const 밖 = 잰것.filter((x) => !x.inAsianTen);
const 띠안 = 안.filter((x) => x.koreanSlots >= 띠[0] && x.koreanSlots <= 띠[1]);
const 띠밖 = 밖.filter((x) => x.koreanSlots >= 띠[0] && x.koreanSlots <= 띠[1]);

/**
 * 대조군이 얼마나 갉아먹었나 — **살아남은 몫만 말한다.**
 * 날것 차이에서 띠 안 차이를 빼면, 그만큼이 「자리 수 탓」이었다는 뜻이다.
 */
const 날것차 = 무리셈(안).medianHalfTakes - 무리셈(밖).medianHalfTakes;
const 띠차 = 무리셈(띠안).medianHalfTakes - 무리셈(띠밖).medianHalfTakes;

const out = {
  generated: 잰때문자(),
  source: 'Netflix Top 10 (Tudum) weekly country lists for every country Netflix publishes; Korean titles identified via Wikidata country of origin (P495 = Q884), with titles Netflix classes on its English-language global charts excluded',
  sourceKo: '넷플릭스 Tudum 주간 나라별 Top10 — 넷플릭스가 목록을 내는 나라 전부',
  question: 'How many different Korean titles has each market actually seen in its top 10, and how many of them carry half of it?',
  weekFrom: [...나라.values()][0] && [...[...나라.values()][0].weeks].sort()[0],
  weekTo: [...[...나라.values()][0].weeks].sort().pop(),
  weekCount: [...나라.values()][0].weeks.size,
  countryCount: 잰것.length,
  slotsPerCountry: [...나라.values()][0].rows,
  /* ⛔ 띠 범위를 여기 따로 안 둔다. `matched.from/to` 와 같은 수를 두 곳에 두면 갈라진다 —
     오늘 아침에 한 벌 크기를 두 지면이 각자 세다가 다른 수를 말한 것과 같은 병이다 */
  groups: [
    { group: 'The ten Asian markets', ...무리셈(안) },
    { group: 'The other markets', ...무리셈(밖) },
  ],
  /** 자리 수를 맞춰 놓고 다시 견준 것 */
  matched: {
    from: 띠[0],
    to: 띠[1],
    asian: { ...무리셈(띠안), names: 띠안.map((x) => x.name) },
    other: { ...무리셈(띠밖), names: 띠밖.map((x) => x.name) },
  },
  gapRaw: 날것차,
  gapMatched: 띠차,
  /** 자리 수로 설명되는 몫. ⛔ 반올림해서 100% 를 넘기지 않는다 */
  explainedByVolumePc: 날것차 ? Math.min(100, +(100 * (날것차 - 띠차) / 날것차).toFixed(1)) : null,
  /** 양 끝 — 줄세우기가 아니라 **폭을 보이려고** 낸다 */
  widest: 잰것.slice().sort((a, b) => b.distinctTitles - a.distinctTitles).slice(0, 5),
  narrowest: 잰것.slice().sort((a, b) => a.distinctTitles - b.distinctTitles).slice(0, 5),
  /**
   * 아시아 열 안에서 가장 얕은 곳.
   * ⛔ 「예외」를 문턱으로 가르지 않는다. 처음엔 「바깥 중앙값의 두 배 미만」으로 골랐는데
   *    일본이 33, 문턱이 34 였다 — **한 칸 차이로 예외가 됐다 안 됐다 하는 딱지**다.
   *    그런 딱지는 다음 주에 자료가 조금만 움직여도 뒤집힌다. 문턱을 버리고
   *    **가장 얕은 곳 하나와 열 곳의 폭**을 그대로 낸다. 읽는 사람이 스스로 본다.
   */
  asianShallowest: (() => {
    const s = 안.filter((x) => x.halfTakes !== null).sort((a, b) => a.halfTakes - b.halfTakes)[0];
    return s && { name: s.name, distinctTitles: s.distinctTitles, halfTakes: s.halfTakes, topTitlePc: s.topTitlePc };
  })(),
  asianHalfRange: {
    min: Math.min(...안.map((x) => x.halfTakes)),
    max: Math.max(...안.map((x) => x.halfTakes)),
  },
  excludedCountry: {
    name: 'Russia',
    why: 'Netflix stopped publishing a list for this market in 2022, so it has 700 rows against every other market\'s full record.',
  },
  countries: 잰것.sort((a, b) => b.distinctTitles - a.distinctTitles),
};

/* ── 검산 ── */
if (out.groups[0].countries + out.groups[1].countries !== out.countryCount) {
  throw new Error('두 무리 합이 나라 수와 다르다');
}
for (const x of 잰것) {
  if (x.halfTakes !== null && x.halfTakes > x.distinctTitles) {
    throw new Error(`${x.name}: 절반을 채우는 편수 ${x.halfTakes} 가 전체 편수 ${x.distinctTitles} 보다 많다`);
  }
  if (x.topTitlePc !== null && (x.topTitlePc < 0 || x.topTitlePc > 100)) {
    throw new Error(`${x.name}: 으뜸 몫이 ${x.topTitlePc}% 다`);
  }
}
if (!out.matched.asian.countries || !out.matched.other.countries) {
  throw new Error(`띠(${띠[0]}~${띠[1]}) 안에 한쪽이 비었다 — 대조군이 성립하지 않는다`);
}
if (out.explainedByVolumePc !== null && (out.explainedByVolumePc < 0 || out.explainedByVolumePc > 100)) {
  throw new Error(`자리 수가 설명하는 몫이 ${out.explainedByVolumePc}% 다`);
}

fs.writeFileSync('src/data/wikitip-catalogue-depth.json', JSON.stringify(out, null, 2));

console.log(`${out.countryCount}개국 × ${out.weekCount}주 · 나라마다 ${out.slotsPerCountry}줄로 같다 ✅`);
for (const g of out.groups) {
  console.log(`  ${g.group.padEnd(24)} 편수 중앙값 ${g.medianDistinctTitles} · 절반을 채우는 편수 ${g.medianHalfTakes} · 으뜸 한 편 ${g.medianTopTitlePc}%`);
}
console.log(`대조군(한국 자리 ${띠[0]}~${띠[1]}): 아시아 ${out.matched.asian.countries}곳 절반 ${out.matched.asian.medianHalfTakes} · 바깥 ${out.matched.other.countries}곳 절반 ${out.matched.other.medianHalfTakes}`);
console.log(`차이 ${out.gapRaw} → ${out.gapMatched} · 자리 수가 설명하는 몫 ${out.explainedByVolumePc}%`);
console.log(`가장 넓은 곳: ${out.widest.map((x) => `${x.name} ${x.distinctTitles}편`).join(' · ')}`);
console.log(`가장 좁은 곳: ${out.narrowest.map((x) => `${x.name} ${x.distinctTitles}편(절반 ${x.halfTakes})`).join(' · ')}`);
console.log(`아시아 열의 폭: 절반을 채우는 편수 ${out.asianHalfRange.min}~${out.asianHalfRange.max} · 가장 얕은 곳 ${out.asianShallowest.name}(${out.asianShallowest.halfTakes}편 · 으뜸 ${out.asianShallowest.topTitlePc}%)`);
