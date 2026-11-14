/**
 * K Culture Wire — **차트에 들어온 뒤에 오르나, 들어온 주가 꼭대기인가.** (`/climb`)
 *
 * 결과 → src/data/wikitip-climb.json
 * 입력 → archive/raw/netflix-top10/countries.ndjson
 *
 * ── 왜 재나 ────────────────────────────────────────────────────────
 * 「입소문」은 말로만 도는 것이다. 넷플릭스 나라별 목록에는 **주마다 순위**가 있으니
 * 한 작품이 한 나라에서 달린 자취를 그대로 볼 수 있다.
 * 물음은 하나다 — **처음 든 주가 그 작품의 꼭대기였나.**
 *
 * ── 세는 단위 ──────────────────────────────────────────────────────
 * **달리기 = 제목 × 나라 × 목록(Films/TV).** 한 작품이 여섯 나라에 들면 달리기가 여섯이다.
 * ⛔ 제목만으로 묶지 않는다. 8/8 에 그 병을 기사로 냈다(한 주 Top10 은 열 편이 아니다).
 * ⛔ 한 주만 든 달리기는 뺀다. 오를 자리가 없는 것을 「안 올랐다」로 세면 안 된다.
 *
 * ── 🔴 스스로 놓는 대조군 ──────────────────────────────────────────
 * 「오래 머물면 오를 기회도 많다」 — 한국 작품이 더 오래 머무니 이 반박이 옳을 수 있다.
 * ⭐ 그래서 **머문 주 수를 묶어 놓고 띠 안에서만 견준다.** 띠마다 다 남으면 길이 탓이 아니다.
 * ⛔ 한 띠라도 뒤집히면 그 띠를 그대로 낸다. 고르지 않는다.
 *
 * ── ⚠ 못 말하는 것 ────────────────────────────────────────────────
 * ⛔ 시청량이 아니다. 순위는 그 나라 안의 겨룸이지 사람 수가 아니다.
 * ⛔ 까닭이 아니다. 「입소문」이라 부르지 않는다 — 우리가 본 것은 **순위가 올랐다**는 것뿐이다.
 * ⛔ 러시아는 목록이 2022-02 에 끊겼다. 뺀다.
 */
import fs from 'node:fs';
import readline from 'node:readline';
import { koreanTitleFilter } from './lib/korean-netflix-titles.mjs';
/* 🔴 [2026-11-14] 영문 지면에 「오후」가 나갔다 — 잰 시각은 한 꼴로 적는다 */
import { 잰때문자 } from './lib/잰때.mjs';

const ko = koreanTitleFilter();
const 끊긴나라 = new Set(['RU']);
/** 머문 주 수 띠 — 길이를 묶어 놓고 견주려고 가른다 */
const 띠들 = [[2, 2, '2 weeks'], [3, 3, '3 weeks'], [4, 5, '4–5 weeks'], [6, 10, '6–10 weeks'], [11, Infinity, '11 weeks or more']];

const 달리기 = new Map();
const rl = readline.createInterface({
  input: fs.createReadStream('archive/raw/netflix-top10/countries.ndjson'),
  crlfDelay: Infinity,
});
for await (const line of rl) {
  if (!line.trim()) continue;
  let r; try { r = JSON.parse(line); } catch { continue; }
  if (끊긴나라.has(r.iso2)) continue;
  if (typeof r.순위 !== 'number') continue;
  const k = `${r.제목}|${r.iso2}|${r.구분}`;
  let a = 달리기.get(k);
  if (!a) { a = { korean: ko.keepTitle(r.제목), type: r.구분, weeks: [] }; 달리기.set(k, a); }
  a.weeks.push({ week: r.주, rank: r.순위 });
}

/** 한 주만 든 것은 뺀다 — 오를 자리가 없다 */
const 준비 = [...달리기.values()].filter((a) => a.weeks.length >= 2);
for (const a of 준비) a.weeks.sort((x, y) => (x.week < y.week ? -1 : 1));

/** 들어온 주보다 높이 오른 적이 있나. ⛔ 순위는 작을수록 높다 */
export function 올랐나(주들) {
  if (!Array.isArray(주들) || 주들.length < 2) return null;
  const 첫 = 주들[0].rank;
  return 주들.some((p) => p.rank < 첫);
}

const 비율 = (x, n) => (n ? +((100 * x) / n).toFixed(1) : null);
const 셈 = (g) => {
  if (!g.length) return null;
  const 오른것 = g.filter((a) => 올랐나(a.weeks)).length;
  const 첫주꼭대기 = g.filter((a) => a.weeks[0].rank === Math.min(...a.weeks.map((p) => p.rank))).length;
  return {
    runs: g.length,
    climbed: 오른것,
    climbedPc: 비율(오른것, g.length),
    peakedFirstWeek: 첫주꼭대기,
    peakedFirstWeekPc: 비율(첫주꼭대기, g.length),
    meanWeeks: +(g.reduce((s, a) => s + a.weeks.length, 0) / g.length).toFixed(1),
  };
};

const 한 = 준비.filter((a) => a.korean);
const 밖 = 준비.filter((a) => !a.korean);

const bands = 띠들.map(([lo, hi, label]) => {
  const 안 = 준비.filter((a) => a.weeks.length >= lo && a.weeks.length <= hi);
  const k = 셈(안.filter((a) => a.korean));
  const r = 셈(안.filter((a) => !a.korean));
  return {
    label,
    korean: k,
    other: r,
    gap: k && r ? +(k.climbedPc - r.climbedPc).toFixed(1) : null,
  };
});

const formats = ['TV', 'Films'].map((t) => {
  const 안 = 준비.filter((a) => a.type === t);
  const k = 셈(안.filter((a) => a.korean));
  const r = 셈(안.filter((a) => !a.korean));
  return {
    format: t === 'TV' ? 'Series' : 'Films',
    korean: k,
    other: r,
    gap: k && r ? +(k.climbedPc - r.climbedPc).toFixed(1) : null,
  };
});

const out = {
  generated: 잰때문자(),
  source: 'Netflix Top 10 (Tudum) weekly country lists for every country Netflix publishes; Korean titles identified via Wikidata country of origin (P495 = Q884), with titles Netflix classes on its English-language global charts excluded',
  sourceKo: '넷플릭스 Tudum 주간 나라별 Top10 — 한 작품이 한 나라에서 달린 자취',
  question: 'When a title enters a country\'s top 10, is that week its highest rank — or does it climb afterwards?',
  unit: 'One run is one title in one country on one list (Films or TV). A title charting in six countries is six runs.',
  minWeeks: 2,
  minWeeksWhy: 'A run of a single week cannot climb, so counting it as "did not climb" would be counting the calendar rather than the title.',
  runs: 준비.length,
  korean: 셈(한),
  other: 셈(밖),
  gap: +(셈(한).climbedPc - 셈(밖).climbedPc).toFixed(1),
  bands,
  formats,
  /** 띠 안에서도 다 남았나 — 이 자료의 결론은 수가 아니라 **이 판정**이다 */
  survivesLengthControl: bands.every((b) => b.gap !== null && b.gap > 0),
  survivesFormatControl: formats.every((f) => f.gap !== null && f.gap > 0),
  excludedCountry: {
    name: 'Russia',
    why: 'Netflix stopped publishing a list for this market in 2022, so its runs cover a different window from every other market.',
  },
};

/* ── 검산 ── */
if (out.korean.runs + out.other.runs !== out.runs) throw new Error('한국 + 그 밖이 전체와 다르다');
for (const g of [out.korean, out.other, ...bands.flatMap((b) => [b.korean, b.other]),
  ...formats.flatMap((f) => [f.korean, f.other])]) {
  if (!g) continue;
  if (g.climbed > g.runs) throw new Error('오른 달리기가 전체보다 많다');
  if (g.climbedPc < 0 || g.climbedPc > 100) throw new Error(`비율이 ${g.climbedPc}% 다`);
  /* 오른 것과 첫 주가 꼭대기인 것은 **서로의 뒷면**이다. 어긋나면 세는 법이 틀렸다 */
  if (g.climbed + g.peakedFirstWeek !== g.runs) {
    throw new Error(`오름 ${g.climbed} + 첫주꼭대기 ${g.peakedFirstWeek} ≠ ${g.runs}`);
  }
}
if (bands.reduce((s, b) => s + b.korean.runs, 0) !== out.korean.runs) throw new Error('띠 합이 한국 달리기와 다르다');

fs.writeFileSync('src/data/wikitip-climb.json', JSON.stringify(out, null, 2));

console.log(`달리기 ${out.runs.toLocaleString()}개 (한 주짜리는 뺐다) · 한국 ${out.korean.runs.toLocaleString()} · 그 밖 ${out.other.runs.toLocaleString()}`);
console.log(`오른 비율  한국 ${out.korean.climbedPc}% · 그 밖 ${out.other.climbedPc}% · 차이 ${out.gap}p`);
console.log(`머문 주   한국 ${out.korean.meanWeeks} · 그 밖 ${out.other.meanWeeks}  ← 이것 때문에 띠로 묶는다`);
for (const b of bands) console.log(`  ${b.label.padEnd(18)} 한국 ${b.korean.climbedPc}% (n=${b.korean.runs}) · 그 밖 ${b.other.climbedPc}% (n=${b.other.runs}) · ${b.gap > 0 ? '+' : ''}${b.gap}p`);
for (const f of formats) console.log(`  ${f.format.padEnd(18)} 한국 ${f.korean.climbedPc}% · 그 밖 ${f.other.climbedPc}% · ${f.gap > 0 ? '+' : ''}${f.gap}p`);
console.log(`길이를 묶어도 남나: ${out.survivesLengthControl ? '그렇다' : '아니다'} · 갈래로 갈라도 남나: ${out.survivesFormatControl ? '그렇다' : '아니다'}`);
