/**
 * K Culture Wire — **한국 작품에 「철」이 있나.** (`/world-share` 에 붙는 표)
 *
 * 결과 → src/data/wikitip-season.json
 * 입력 → archive/raw/netflix-top10/countries.ndjson
 *
 * ── 왜 재나 ────────────────────────────────────────────────────────
 * 「K드라마 성수기」는 말로만 도는 것이다. 자리는 달마다 셀 수 있다.
 * 달마다 한국 작품이 세계 Top10 자리의 몇 %를 잡았나를 낸다.
 *
 * ── 🔴 스스로 놓는 대조군 ──────────────────────────────────────────
 * 달 사이에 차이가 보이면 첫 의심은 **한 편 탓**이다 —
 * 오징어 게임이 나온 달은 그 한 편이 그 달 한국 자리의 5분의 1이다.
 * ⭐ 그래서 **달마다 으뜸 한 편을 빼고 다시 잰다.** 폭이 줄면 그건 철이 아니라 한 편이다.
 * ⛔ 폭이 안 줄면 안 줄었다고 적는다. 바라던 답이 아니어도 그대로 낸다.
 *
 * ── ⚠ 못 말하는 것 ────────────────────────────────────────────────
 * ⛔ 시청량이 아니다. ⛔ 공개일이 아니다 — 차트에 걸린 주를 센 것이다.
 * ⛔ 러시아는 목록이 2022-02 에 끊겼다. 뺀다.
 * ⚠ 달마다 주 수가 다르다(7월이 다섯 주인 해가 있다). **비율로만 견준다.**
 */
import fs from 'node:fs';
import readline from 'node:readline';
import { koreanTitleFilter } from './lib/korean-netflix-titles.mjs';
/* 🔴 [2026-11-14] 영문 지면에 「오후」가 나갔다 — 잰 시각은 한 꼴로 적는다 */
import { 잰때문자 } from './lib/잰때.mjs';

const ko = koreanTitleFilter();
const 끊긴나라 = new Set(['RU']);
const 달이름 = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

const 달 = new Map();
const rl = readline.createInterface({
  input: fs.createReadStream('archive/raw/netflix-top10/countries.ndjson'),
  crlfDelay: Infinity,
});
for await (const line of rl) {
  if (!line.trim()) continue;
  let r; try { r = JSON.parse(line); } catch { continue; }
  if (끊긴나라.has(r.iso2)) continue;
  const m = +r.주.slice(5, 7);
  let a = 달.get(m);
  if (!a) { a = { rows: 0, korean: 0, titles: new Map(), weeks: new Set() }; 달.set(m, a); }
  a.rows++; a.weeks.add(r.주);
  if (ko.keepTitle(r.제목)) { a.korean++; a.titles.set(r.제목, (a.titles.get(r.제목) || 0) + 1); }
}

const 비율 = (x, n) => (n ? +((100 * x) / n).toFixed(1) : null);

const months = [];
for (let m = 1; m <= 12; m += 1) {
  const a = 달.get(m);
  const [이름, 자리] = [...a.titles.entries()].sort((x, y) => y[1] - x[1])[0];
  months.push({
    month: m,
    name: 달이름[m - 1],
    weeks: a.weeks.size,
    slots: a.rows,
    korean: a.korean,
    pc: 비율(a.korean, a.rows),
    /** 그 달의 으뜸 한 편을 뺀 값 — 「철이냐 한 편이냐」를 가르는 자다 */
    topTitle: 이름,
    topTitleSlots: 자리,
    topTitleShareOfKorean: 비율(자리, a.korean),
    pcWithoutTop: 비율(a.korean - 자리, a.rows - 자리),
  });
}

const 폭 = (v) => +(Math.max(...v) - Math.min(...v)).toFixed(1);
const 값 = months.map((x) => x.pc);
const 뺀값 = months.map((x) => x.pcWithoutTop);
const 높은달 = months.reduce((a, b) => (a.pc >= b.pc ? a : b));
const 낮은달 = months.reduce((a, b) => (a.pc <= b.pc ? a : b));

/** 주 단위 폭은 `/world-share` 가 이미 세어 두었다. 두 번 세지 않는다 */
const ws = JSON.parse(fs.readFileSync('src/data/wikitip-world-share.json', 'utf8'));
const 주폭 = +(ws.peakWeeks[0].pc - ws.troughWeeks[0].pc).toFixed(1);

/** 오징어 게임이 으뜸인 달이 몇이나 되나 — 쏠림을 한 수로 보인다 */
const 으뜸모음 = {};
for (const x of months) 으뜸모음[x.topTitle] = (으뜸모음[x.topTitle] || 0) + 1;
const [가장잦은제목, 가장잦은수] = Object.entries(으뜸모음).sort((a, b) => b[1] - a[1])[0];

const out = {
  generated: 잰때문자(),
  source: ws.source,
  sourceKo: '넷플릭스 Tudum 주간 나라별 Top10 — 달마다 묶어 센 것',
  question: 'Does the Korean share of the world\'s top-10 places have a season?',
  /* ⛔ 나라 수·기간을 여기 또 두지 않는다. `/world-share` 가 같은 판에서 이미 낸다 —
     같은 수를 두 파일에 두면 언젠가 갈라진다. 오늘 `band` 를 같은 까닭으로 지웠다. */
  months,
  monthRange: 폭(값),
  monthRangeWithoutTop: 폭(뺀값),
  highest: { name: 높은달.name, pc: 높은달.pc },
  lowest: { name: 낮은달.name, pc: 낮은달.pc },
  yearPc: ws.worldPc,
  /** 주 단위 폭 — 견줄 자리 */
  weekRange: 주폭,
  weekHigh: ws.peakWeeks[0],
  weekLow: ws.troughWeeks[0],
  timesWeekBeatsMonth: +(주폭 / 폭(값)).toFixed(1),
  /** 대조군 판정. ⛔ 「줄었다」가 아니라 **잰 결과**를 적는다 */
  verdict: 폭(뺀값) < 폭(값) ? 'the swing is partly one title' : 'the swing is not one title',
  mostFrequentTopTitle: { title: 가장잦은제목, months: 가장잦은수 },
};

/* ── 검산 ── */
if (months.length !== 12) throw new Error(`달이 ${months.length}개다`);
for (const x of months) {
  if (x.korean > x.slots) throw new Error(`${x.name}: 한국 자리가 전체보다 많다`);
  if (x.topTitleSlots > x.korean) throw new Error(`${x.name}: 으뜸 한 편이 그 달 한국 자리보다 많다`);
  for (const p of [x.pc, x.pcWithoutTop, x.topTitleShareOfKorean]) {
    if (p === null || p < 0 || p > 100) throw new Error(`${x.name}: 비율이 ${p} 다`);
  }
}
if (months.reduce((s, x) => s + x.korean, 0) !== ws.koreanSlots) {
  throw new Error(`달을 다 더한 한국 자리 ${months.reduce((s, x) => s + x.korean, 0)} ≠ /world-share 의 ${ws.koreanSlots}`);
}
if (out.weekRange <= out.monthRange) {
  throw new Error('주 폭이 달 폭보다 넓지 않다 — 이 자료의 요지가 뒤집혔으니 기사를 다시 쓴다');
}

fs.writeFileSync('src/data/wikitip-season.json', JSON.stringify(out, null, 2));

console.log(`달마다 ${out.lowest.pc}%(${out.lowest.name}) ~ ${out.highest.pc}%(${out.highest.name}) · 폭 ${out.monthRange}p · 해 평균 ${out.yearPc}%`);
console.log(`으뜸 한 편을 빼도 폭 ${out.monthRangeWithoutTop}p → ${out.verdict}`);
console.log(`주 단위 폭 ${out.weekRange}p (${out.weekLow.pc}% ~ ${out.weekHigh.pc}%) — 달 폭의 ${out.timesWeekBeatsMonth}배`);
console.log(`열두 달 중 ${out.mostFrequentTopTitle.months}달의 으뜸이 ${out.mostFrequentTopTitle.title} 이다`);
