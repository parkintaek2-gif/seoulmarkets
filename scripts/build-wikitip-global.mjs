/**
 * K Culture Wire — 한국 작품의 **글로벌 넷플릭스 총 시청시간** 카탈로그.
 *
 * /titles 는 동남아 도달·지속(reach)이다. 이 지면은 **전 세계 hours viewed** — 다른 축이다.
 * 첫 화면은 상위 10만. 여기는 상위 50 + 총계.
 * 결과 → src/data/wikitip-global.json (지면 watched.astro)
 *        src/data/wikitip-screen-split.json (지면 screen-split.astro — 드라마 대 영화)
 *
 * 입력(이미 있는 것): archive/raw/netflix-top10/global.ndjson {주,구분,순위,제목,시청시간,…}
 *   구분: Films/TV × (English)/(Non-English). 한국작품은 korean-titles.json(P495=Q884)로 매칭.
 * 라이선스: 넷플릭스 Tudum 글로벌 주간 순위. 원본 표 재배포 없이 **집계(합)**만.
 * 시각: KST.
 *
 * ── 🔴 2026-08-07 정정 ────────────────────────────────────────────────
 * 이 스크립트는 **제목 글자만 맞춰** 한국 작품을 골랐다. 위키데이터 한국 작품 1,005편의
 * 영어 제목 중에는 다른 나라 작품과 **같은 이름**이 흔하다. 그래서 넷플릭스가
 * **영어 차트**로 분류한 작품까지 한국 것으로 세고 있었다.
 *
 *   The Perfect Couple(미국) 331m · Suits(미국) 95m · The Circle(미국) 89m
 *   Hit Man(미국) 56m · Devil May Cry(일본) 71m …  52편 · 26.2억 시간
 *
 * 넷플릭스는 **작품의 주 언어**로 English / Non-English 를 가른다. 한국 작품이
 * 영어 차트에 오르는 일은 사실상 없다. 그래서 이제 **Non-English 차트만** 센다.
 * 그것만으로 277억 → 251억 시간(-9.5%)이 된다. 지면과 기사에 정정을 붙였다.
 *
 * ⚠ Non-English 안에도 같은 이름 충돌이 남는다. 기계로는 못 걸러서 **시간 상위를 손으로 봤다**
 *   (드라마 상위 30편 = 시간의 65.3% · 영화 상위 20편 = 61.6%). 확인해 뺀 것이 아래 목록이다.
 *   그 아래 줄은 **손으로 안 봤다.** 지면에 그렇게 적는다. 없는 확인을 있다고 하지 않는다.
 */
import fs from 'node:fs';
import readline from 'node:readline';
import { koreanTitleFilter, NOT_KOREAN, AUDITED as SHARED_AUDITED } from './lib/korean-netflix-titles.mjs';
/* 🔴 [2026-11-14] 영문 지면에 「오후」가 나갔다 — 잰 시각은 한 꼴로 적는다 */
import { 잰때문자 } from './lib/잰때.mjs';

const ko = koreanTitleFilter();
const korean = ko.korean;

/* NOT_KOREAN(손으로 확인해 뺀 목록)과 AUDITED(손으로 본 깊이)는 lib 에서 온다.
   여기 다시 적어 두면 두 곳이 갈라진다 — 갈라져서 /staying-power 가 틀린 채 살아 있었다. */
const AUDITED = SHARED_AUDITED;

const agg = new Map();
const weeksAll = new Set();
let scanned = 0, hit = 0;
const droppedEn = new Map();   // 영어 차트로 분류돼 뺀 것
const droppedHand = new Map(); // 손으로 확인해 뺀 것
const beforeTitles = new Set(); // 고치기 전 편수
let beforeHours = 0;            // 고치기 전 시간

const rl = readline.createInterface({ input: fs.createReadStream('archive/raw/netflix-top10/global.ndjson'), crlfDelay: Infinity });
for await (const line of rl) {
  if (!line.trim()) continue;
  let r; try { r = JSON.parse(line); } catch { continue; }
  scanned++;
  if (!korean.has(r.제목)) continue;
  const h = r.시청시간 || 0;
  /* 고치기 전에 이 지면이 내보내던 수 — **더해서 되짚지 않는다.** 한 작품이 두 차트에
     걸치면 셋을 더한 값과 어긋난다(실제로 2편 어긋났다). 거르기 전에 그대로 센다. */
  beforeTitles.add(r.제목);
  beforeHours += h;
  if (!/Non-English/i.test(r.구분 || '')) {
    droppedEn.set(r.제목, (droppedEn.get(r.제목) || 0) + h);
    continue;
  }
  if (NOT_KOREAN.has(r.제목)) {
    droppedHand.set(r.제목, (droppedHand.get(r.제목) || 0) + h);
    continue;
  }
  hit++;
  weeksAll.add(r.주);
  let a = agg.get(r.제목);
  if (!a) { a = { title: r.제목, type: r.구분, hours: 0, peak: 99, weeks: new Set() }; agg.set(r.제목, a); }
  a.hours += h;
  a.weeks.add(r.주);
  if (typeof r.순위 === 'number' && r.순위 < a.peak) a.peak = r.순위;
  if (r.구분) a.type = r.구분;
}

const all = [...agg.values()].map((a) => ({
  title: a.title,
  kind: /^TV/i.test(a.type) ? 'series' : 'film',
  hours: a.hours,
  peak: a.peak,
  weeks: a.weeks.size,
})).sort((x, y) => y.hours - x.hours);

const rows = all.slice(0, 50);
const weeks = [...weeksAll].sort();
const totalHours = all.reduce((s, a) => s + a.hours, 0);
const sumEn = [...droppedEn.values()].reduce((s, v) => s + v, 0);
const sumHand = [...droppedHand.values()].reduce((s, v) => s + v, 0);

/* ⛔ 2026-08-08. `before - 뺀것 = 남은것` 이 **편수에서 2 만큼 안 맞는다.**
   원인은 영어·비영어 차트에 **둘 다** 오른 작품이다 — 영어 칸의 시간은 빠지고
   비영어 칸의 시간은 남으니 그 편은 「뺀 목록」과 「남은 목록」에 같이 있다.
   ⚠ 지면이 이 폭을 말하려면 **어느 편인지**를 알아야 한다. 이름을 여기서 낸다 —
     지면에 이름을 손으로 적으면 자료가 움직여도 지면은 안 움직인다. */
const bothCharts = [...agg.keys()].filter((t) => droppedEn.has(t)).sort();

const out = {
  generated: 잰때문자(),
  source: 'Netflix Top 10 (Tudum) global weekly hours viewed; Korean titles identified via Wikidata country of origin (P495 = Q884), restricted to the Non-English charts',
  weekFrom: weeks[0],
  weekTo: weeks[weeks.length - 1],
  weekCount: weeks.length,
  titleCount: agg.size,
  totalHours,
  before: { titles: beforeTitles.size, hours: beforeHours },
  excludedEnglishChart: { titles: droppedEn.size, hours: sumEn },
  excludedByHand: { titles: droppedHand.size, hours: sumHand, list: [...droppedHand.keys()] },
  /** 영어·비영어 양쪽에 오른 편 — 뺄셈이 안 맞는 폭이 곧 이 편수다. */
  bothCharts: { titles: bothCharts.length, list: bothCharts },
  rows,
};
fs.writeFileSync('src/data/wikitip-global.json', JSON.stringify(out, null, 2));

/* ── 드라마 대 영화 ── 같은 자료의 안 쓰던 축. kind 는 표에 찍히기만 했지 합해진 적이 없다. */
const side = (kind) => {
  const g = all.filter((r) => r.kind === kind);
  const h = g.reduce((s, r) => s + r.hours, 0);
  const w = g.reduce((s, r) => s + r.weeks, 0);
  return {
    kind,
    titles: g.length,
    hours: h,
    weeks: w,
    hoursPerTitle: Math.round(h / g.length),
    weeksPerTitle: +(w / g.length).toFixed(2),
    hoursPerWeek: Math.round(h / w),
    numberOnes: g.filter((r) => r.peak === 1).length,
    top: g.slice(0, 10).map((r) => ({ title: r.title, hours: r.hours, weeks: r.weeks, peak: r.peak })),
  };
};
const series = side('series');
const film = side('film');
/** 오징어게임 하나가 드라마 쪽을 혼자 끌어올리는지 — 빼고도 결론이 서는지 본다. */
const noSquid = all.filter((r) => r.kind === 'series' && r.title !== 'Squid Game');
const nsHours = noSquid.reduce((s, r) => s + r.hours, 0);

fs.writeFileSync('src/data/wikitip-screen-split.json', JSON.stringify({
  generated: 잰때문자(),
  source: out.source,
  sourceKo: '넷플릭스 Tudum 글로벌 주간 Top 10 · 한국 작품 판정은 위키데이터 P495=Q884',
  weekFrom: out.weekFrom, weekTo: out.weekTo, weekCount: out.weekCount,
  series, film,
  /** 가장 큰 영화보다 큰 드라마가 몇 편인가 — 상위 10편만 든 top 배열로는 못 센다. 전수로 센다. */
  seriesAboveTopFilm: all.filter((r) => r.kind === 'series' && r.hours > film.top[0].hours).length,
  ratioHours: +(series.hours / film.hours).toFixed(1),
  ratioTitles: +(series.titles / film.titles).toFixed(2),
  ratioPerTitle: +(series.hoursPerTitle / film.hoursPerTitle).toFixed(1),
  withoutSquidGame: {
    titles: noSquid.length,
    hours: nsHours,
    hoursPerTitle: Math.round(nsHours / noSquid.length),
    ratioPerTitle: +((nsHours / noSquid.length) / film.hoursPerTitle).toFixed(1),
  },
  before: out.before,
  audited: AUDITED,
  excludedByHand: out.excludedByHand,
  excludedEnglishChart: out.excludedEnglishChart,
  bothCharts: out.bothCharts,
}, null, 2));

console.log(`scanned ${scanned.toLocaleString()} · kept ${hit.toLocaleString()} rows · distinct ${agg.size} · totalHours ${totalHours.toLocaleString()}`);
console.log(`뺀 것 — 영어차트 ${droppedEn.size}편 ${(sumEn / 1e9).toFixed(2)}bn h · 손으로 ${droppedHand.size}편 ${(sumHand / 1e9).toFixed(2)}bn h`);
console.log(`드라마 ${series.titles}편 ${(series.hours / 1e9).toFixed(2)}bn · 영화 ${film.titles}편 ${(film.hours / 1e9).toFixed(2)}bn · 편당 ${(series.hoursPerTitle / film.hoursPerTitle).toFixed(1)}배`);
console.log('top 6:', rows.slice(0, 6).map((r) => `${r.title} (${(r.hours / 1e9).toFixed(2)}bn h, ${r.weeks}w)`).join(' · '));
