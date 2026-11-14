/**
 * K Culture Wire — **세계의 Top10 자리 중 한국 작품이 몇 %인가.** (`/world-share`)
 *
 * 결과 → src/data/wikitip-world-share.json
 * 입력 → archive/raw/netflix-top10/countries.ndjson (넷플릭스가 목록을 내는 나라 전부)
 *
 * ── 왜 재나 ────────────────────────────────────────────────────────
 * 「한류가 커지고 있다」는 어디에나 있다. 그런데 **자리로 재면 어떤가**는 아무도 안 낸다.
 * 넷플릭스는 나라마다 주마다 딱 스무 자리(영화 10 · 드라마 10)를 낸다.
 * 그 자리는 **고정된 파이**라, 한국 작품이 몇 자리를 잡았나는 그대로 견줄 수 있는 수다.
 *
 * ── ⚠ 이 자료가 **말하지 못하는 것** ───────────────────────────────
 * ⛔ 시청량이 아니다. 나라별 목록에는 시간이 없다. 자리를 잡았나만 있다.
 * ⛔ 「한국 작품」은 **우리가 판정한 것**이다(Wikidata P495=Q884 + 제목 맞춤).
 *    절대 수준에는 그 판정의 오차가 그대로 실려 있다.
 *    ⭐ 다만 **자는 93개국에 똑같이 댄다.** 나라끼리 견주는 데는 그 오차가 같은 방향으로 실린다.
 * ⛔ 러시아는 2022-02-27 에 목록이 끊겼다(700줄). 해마다 견줌에서 **뺀다** —
 *    넣으면 2022년만 낮아져 「줄었다」가 자료가 아니라 나라 목록에서 나온다.
 *
 * ── 🔴 스스로 놓는 대조군 ──────────────────────────────────────────
 * 「해가 갈수록 한국 작품 판정이 나빠져서(위키데이터가 새 작품을 늦게 담아서) 준 것처럼 보인다」
 * — 이 의심을 반드시 눌러야 한다. 누르는 방법이 자료 안에 있다:
 * **한국 자신의 차트**를 같은 자로 재면 된다. 자가 낡고 있으면 거기서도 비율이 내려간다.
 * 안 내려가면 자는 멀쩡하고 움직인 것은 세상이다. 아래 `home` 줄이 그 대조군이다.
 */
import fs from 'node:fs';
import readline from 'node:readline';
import { koreanTitleFilter } from './lib/korean-netflix-titles.mjs';
/* ⭐ 근거 칸의 표준 문구 — 자료 고유의 한계는 위에서 덧붙인다 */
import { 근거, 중앙값 as 중앙값자, 백만분율 as 백만분율자 } from './_evidence-kcw.mjs';
/* 🔴 [2026-11-14] 영문 지면에 「오후」가 나갔다 — 잰 시각은 한 꼴로 적는다 */
import { 잰때문자 } from './lib/잰때.mjs';

const ko = koreanTitleFilter();

/** 목록이 끊긴 나라. 이름으로 적어 두고 해마다 견줌에서 뺀다 */
const 끊긴나라 = new Set(['RU']);
/** 온전한 해만 쓴다. 2021 은 반 해(26주), 2026 은 아직 안 끝났다 */
const 온해 = ['2022', '2023', '2024', '2025'];

/**
 * 무리 — **줄세우려고 가른 것이 아니다.**
 * ⛔ 93개국을 1위부터 늘어놓지 않는다. 그건 나라 자랑이지 우리가 낼 것이 아니다.
 *    가르는 기준은 하나다 — 「한국 작품이 다섯 자리 중 한 자리를 넘었던 곳」과 그 밖.
 */
const 아시아아홉 = ['VN', 'ID', 'MY', 'TW', 'TH', 'HK', 'PH', 'SG', 'JP'];
const 영어권 = ['US', 'GB', 'CA', 'AU', 'IE'];
const HOME = 'KR';

const 나라 = new Map();
const 해전체 = new Map();
const 주전체 = new Map();
/** 무엇이 줄었나를 가르려면 **편수**와 **편당 자리**를 따로 세야 한다 */
const 아홉해 = new Map();

/**
 * ⛔ **조용히 들어온 것**을 센다 (2026-08-09).
 *   규칙 ②는 「영어 차트로 확인된 제목을 뺀다」인데, 글로벌 Top10 에 한 번도 안 뜬 제목에는
 *   **언어 딱지가 없다.** 그런 제목은 거를 근거가 없어 **남긴다** — 확인해서 남기는 것이 아니다.
 *   ⚠ 그 몫을 **작품 수가 아니라 자리 수**로 센다. 편수로는 작아 보이고 자리로는 안 작다.
 */
/** ⛔ 나라마다 따로 센다. 아래에서 **온전한 나라만** 더한다 —
 *  처음엔 전부 세었다가 자가 「합이 다르다」고 울었다. 자가 옳았다 */
const 확인나라 = new Map();
/**
 * ⛔ **두 번째 축** — 위키데이터 Q번호(열쇠)가 붙었나. 언어 딱지와 **서로 다른 것**을 본다.
 *   딱지는 「영어 작품이 아닌가」를 보고, 열쇠는 「이 작품이 무엇인가」를 본다.
 *   둘 다 없는 자리가 우리가 제일 모르는 자리다.
 */
const 열쇠집합 = (() => {
  const 길 = 'archive/raw/netflix-top10/korean-titles-keyed.json';
  if (!fs.existsSync(길)) return null; // ⛔ 없으면 「0」이 아니라 **못 쟀다**
  const k = JSON.parse(fs.readFileSync(길, 'utf8'));
  return new Set(Object.values(k.작품).map((x) => x.넷플릭스제목));
})();
const 열쇠나라 = new Map();

const rl = readline.createInterface({
  input: fs.createReadStream('archive/raw/netflix-top10/countries.ndjson'),
  crlfDelay: Infinity,
});
for await (const line of rl) {
  if (!line.trim()) continue;
  let r; try { r = JSON.parse(line); } catch { continue; }
  const 한 = ko.keepTitle(r.제목);
  const y = r.주.slice(0, 4);

  let a = 나라.get(r.iso2);
  if (!a) { a = { iso2: r.iso2, name: r.국가, rows: 0, korean: 0, weeks: new Set(), byYear: new Map() }; 나라.set(r.iso2, a); }
  a.rows++; a.weeks.add(r.주); if (한) a.korean++;
  if (한) {
    let c = 확인나라.get(r.iso2);
    if (!c) { c = { labelled: 0, unlabelled: 0, both: 0 }; 확인나라.set(r.iso2, c); }
    const 딱지 = ko.lang.get(r.제목);
    if (딱지 === undefined) c.unlabelled += 1;
    else if (딱지 === 'both') c.both += 1;
    else c.labelled += 1;
    if (열쇠집합) {
      let q = 열쇠나라.get(r.iso2);
      if (!q) { q = { keyed: 0, unkeyed: 0 }; 열쇠나라.set(r.iso2, q); }
      if (열쇠집합.has(r.제목)) q.keyed += 1; else q.unkeyed += 1;
    }
  }
  let ay = a.byYear.get(y);
  if (!ay) { ay = { rows: 0, korean: 0 }; a.byYear.set(y, ay); }
  ay.rows++; if (한) ay.korean++;

  if (끊긴나라.has(r.iso2)) continue;

  let h = 해전체.get(y);
  if (!h) { h = { rows: 0, korean: 0, weeks: new Set() }; 해전체.set(y, h); }
  h.rows++; h.weeks.add(r.주); if (한) h.korean++;

  let w = 주전체.get(r.주);
  if (!w) { w = { rows: 0, korean: 0, titles: new Map() }; 주전체.set(r.주, w); }
  w.rows++;
  if (한) { w.korean++; w.titles.set(r.제목, (w.titles.get(r.제목) || 0) + 1); }

  if (아시아아홉.includes(r.iso2) && 온해.includes(y)) {
    let g = 아홉해.get(y);
    if (!g) { g = { rows: 0, korean: 0, titles: new Set(), koreanTitles: new Set() }; 아홉해.set(y, g); }
    g.rows++; g.titles.add(r.제목);
    if (한) { g.korean++; g.koreanTitles.add(r.제목); }
  }
}

const 비율 = (x, n) => (n ? +((100 * x) / n).toFixed(1) : null);
const 온전 = [...나라.values()].filter((a) => !끊긴나라.has(a.iso2));

/* ⚠ 전제 검사 — 온전한 나라는 줄 수와 주 수가 하나여야 한다.
   다르면 「어느 나라가 더 낮다」가 자료가 아니라 목록 길이에서 나온다. */
const 꼴 = new Set(온전.map((a) => `${a.rows}|${a.weeks.size}`));
if (꼴.size !== 1) {
  const 별난 = 온전.filter((a) => `${a.rows}|${a.weeks.size}` !== [...꼴][0]);
  throw new Error(
    `온전하다고 본 나라들의 자리 수가 다르다 — 견줄 수 없다: ${별난.map((a) => `${a.name} ${a.rows}줄/${a.weeks.size}주`).join(' · ')}`,
  );
}

const 무리비 = (ks, y) => {
  let a = 0; let b = 0;
  for (const k of ks) {
    const v = 나라.get(k)?.byYear.get(y);
    if (!v) return null;   // ⛔ 한 나라라도 없으면 그 해는 **모른다**. 있는 것만 더하지 않는다
    a += v.korean; b += v.rows;
  }
  return 비율(a, b);
};

const 띠들 = [[20, 101], [10, 20], [5, 10], [3, 5], [2, 3], [0, 2]];
const bands = 띠들.map(([lo, hi]) => {
  const g = 온전.filter((a) => 비율(a.korean, a.rows) >= lo && 비율(a.korean, a.rows) < hi);
  return {
    from: lo,
    to: hi === 101 ? null : hi,
    countries: g.length,
    names: g.sort((x, y) => 비율(y.korean, y.rows) - 비율(x.korean, x.rows)).map((a) => a.name),
  };
});

const 주목록 = [...주전체.entries()].map(([w, v]) => ({ week: w, pc: 비율(v.korean, v.rows) }))
  .sort((a, b) => b.pc - a.pc);

/** 한 주를 열어 본다 — 한국 자리가 몇이고, 그중 한 작품이 몇을 잡았나 */
const 주작 = (x) => {
  const v = 주전체.get(x.week);
  const [이름, 자리] = [...v.titles.entries()].sort((a, b) => b[1] - a[1])[0];
  return {
    week: x.week,
    pc: x.pc,
    koreanSlots: v.korean,
    topTitle: 이름,
    topTitleSlots: 자리,
    topTitleShare: 비율(자리, v.korean),
  };
};

const 전체줄 = 온전.reduce((s, a) => s + a.rows, 0);
const 전체한 = 온전.reduce((s, a) => s + a.korean, 0);
/** 확인 갈래도 **같은 범위**(온전한 나라)로 더한다 */
const 확인 = 온전.reduce((s, a) => {
  const c = 확인나라.get(a.iso2) ?? { labelled: 0, unlabelled: 0, both: 0 };
  return { labelled: s.labelled + c.labelled, unlabelled: s.unlabelled + c.unlabelled, both: s.both + c.both };
}, { labelled: 0, unlabelled: 0, both: 0 });
const 열쇠셈 = 열쇠집합 ? 온전.reduce((s, a) => {
  const q = 열쇠나라.get(a.iso2) ?? { keyed: 0, unkeyed: 0 };
  return { keyed: s.keyed + q.keyed, unkeyed: s.unkeyed + q.unkeyed };
}, { keyed: 0, unkeyed: 0 }) : null;
const 비들 = 온전.map((a) => 비율(a.korean, a.rows)).sort((a, b) => a - b);

const out = {
  /**
   * ⭐⭐ **근거 칸** — 사장님 지시(8/15). 표준 문구에 **이 자료 고유의 한계**를 덧붙인다.
   * ⛔ 고유 한계를 안 주면 `근거()` 가 던진다 — 붙여넣기만 있는 칸은 찬 척하는 것이다.
   */
  ...근거([중앙값자, 백만분율자], {
    방법: "A country's share is its reads divided by the reads of all countries counted, so the shares sum to a hundred and a large country cannot dominate by population.",
    한계: "A share moves when any country moves, so a rise here can mean one country grew or that every other country shrank — the two are indistinguishable in a share. Only editions large enough to measure are in the denominator, so the hundred per cent is a hundred per cent of what we could count, not of the world.",
  }),
  generated: 잰때문자(),
  source: 'Netflix Top 10 (Tudum) weekly country lists for every country Netflix publishes; Korean titles identified via Wikidata country of origin (P495 = Q884), with titles Netflix classes on its English-language global charts excluded',
  sourceKo: '넷플릭스 Tudum 주간 나라별 Top10 — 넷플릭스가 목록을 내는 나라 전부',
  question: 'Of the top-10 places Netflix publishes around the world, how many hold a Korean title — and is that share growing?',
  weekFrom: [...주전체.keys()].sort()[0],
  weekTo: [...주전체.keys()].sort().pop(),
  weekCount: 주전체.size,
  countryCount: 온전.length,
  slotsPerCountry: 온전[0].rows,
  totalSlots: 전체줄,
  koreanSlots: 전체한,
  worldPc: 비율(전체한, 전체줄),
  /**
   * ⛔ 위 한국 자리 가운데 **무엇으로 확인된 것인가.** 8번이 13:30 에 짚어 준 자리다 —
   *   조용히 버리는 것만 세고 조용히 **들이는** 것은 안 세고 있었다.
   */
  confirmation: {
    labelledSlots: 확인.labelled,
    labelledPc: 비율(확인.labelled, 전체한),
    unlabelledSlots: 확인.unlabelled,
    unlabelledPc: 비율(확인.unlabelled, 전체한),
    bothSlots: 확인.both,
    bothPc: 비율(확인.both, 전체한),
    /** ⛔ 못 쟀으면 0 이 아니라 null. archive 는 git 이 안 담는다 */
    keyedSlots: 열쇠셈 ? 열쇠셈.keyed : null,
    keyedPc: 열쇠셈 ? 비율(열쇠셈.keyed, 전체한) : null,
    unkeyedSlots: 열쇠셈 ? 열쇠셈.unkeyed : null,
    unkeyedPc: 열쇠셈 ? 비율(열쇠셈.unkeyed, 전체한) : null,
    note: 'Netflix labels a title Non-English on its global charts, and that is the label we use to '
      + 'exclude English-language works with the same name. Country charts carry no such label, so a '
      + 'title that never reached a global top 10 has nothing to check against. We keep those rather '
      + 'than drop them, and this is how much of the total rests on them.',
  },
  medianCountryPc: 비들[Math.floor(비들.length / 2)],
  /** 한국 자신 — 위 주석의 대조군이다 */
  home: {
    name: 나라.get(HOME).name,
    pc: 비율(나라.get(HOME).korean, 나라.get(HOME).rows),
    byYear: 온해.map((y) => ({ year: y, pc: 무리비([HOME], y) })),
  },
  bands,
  /** ⛔ 목록이 끊긴 나라를 **지우지 않고** 이름으로 적는다 */
  excludedCountry: {
    name: 나라.get('RU').name,
    rows: 나라.get('RU').rows,
    weeks: 나라.get('RU').weeks.size,
    lastWeek: [...나라.get('RU').weeks].sort().pop(),
    pc: 비율(나라.get('RU').korean, 나라.get('RU').rows),
    why: 'Netflix stopped publishing a list for this market in 2022. Including it would make the earliest year look different for a reason that is not about Korean titles.',
  },
  /** 해마다 — 온전한 해만. 반 해를 섞으면 흐름이 아니라 달력이 보인다 */
  byYear: 온해.map((y) => ({
    year: y,
    weeks: 해전체.get(y).weeks.size,
    pc: 비율(해전체.get(y).korean, 해전체.get(y).rows),
  })),
  partialYears: [...해전체.keys()].sort().filter((y) => !온해.includes(y))
    .map((y) => ({ year: y, weeks: 해전체.get(y).weeks.size, pc: 비율(해전체.get(y).korean, 해전체.get(y).rows) })),
  /** 무리마다 해마다 — 세계 평균이 가리고 있는 것을 드러낸다 */
  groups: [
    { group: 'South Korea', countries: 1, byYear: 온해.map((y) => ({ year: y, pc: 무리비([HOME], y) })) },
    { group: 'The nine Asian markets that were once above 20%', countries: 아시아아홉.length, byYear: 온해.map((y) => ({ year: y, pc: 무리비(아시아아홉, y) })) },
    { group: 'The five largest English-speaking markets', countries: 영어권.length, byYear: 온해.map((y) => ({ year: y, pc: 무리비(영어권, y) })) },
  ],
  /** 아홉 나라를 **하나하나** 낸다 — 요지는 순서가 아니라 **아홉이 모두 같은 쪽으로 갔다**는 것 */
  ninesByCountry: 아시아아홉.map((k) => {
    const a = 나라.get(k);
    const 처음 = 비율(a.byYear.get('2022').korean, a.byYear.get('2022').rows);
    const 마지막 = 비율(a.byYear.get('2025').korean, a.byYear.get('2025').rows);
    return { name: a.name, first: 처음, last: 마지막, change: +(마지막 - 처음).toFixed(1) };
  }),
  /** 줄어든 것이 **편수인가 자리인가.** 가르지 않으면 까닭을 지어내게 된다 */
  ninesDecomposed: 온해.map((y) => {
    const g = 아홉해.get(y);
    return {
      year: y,
      pc: 비율(g.korean, g.rows),
      koreanTitles: g.koreanTitles.size,
      allTitles: g.titles.size,
      slotsPerKoreanTitle: +(g.korean / g.koreanTitles.size).toFixed(1),
    };
  }),
  /**
   * 가장 높은 주가 **무엇으로 높았나.** 「크리스마스에 오징어 게임이 나왔으니까」는 짐작이다.
   * ⛔ 짐작을 적지 않는다 — 그 주의 한국 자리를 제목별로 세어, 으뜸이 몇 자리인지 낸다.
   */
  peakWeeks: 주목록.slice(0, 4).map((x) => 주작(x)),
  troughWeeks: 주목록.slice(-3).reverse().map((x) => 주작(x)),
};

/* ── 검산 ── 하나라도 어긋나면 내지 않는다 ───────────────────────── */
if (bands.reduce((s, b) => s + b.countries, 0) !== out.countryCount) {
  throw new Error(`띠 합 ${bands.reduce((s, b) => s + b.countries, 0)} ≠ 나라 ${out.countryCount}`);
}
for (const p of [out.worldPc, out.medianCountryPc, out.home.pc,
  ...out.byYear.map((r) => r.pc), ...out.groups.flatMap((g) => g.byYear.map((r) => r.pc))]) {
  if (p === null || p < 0 || p > 100) throw new Error(`비율이 ${p} 다 — 0~100 밖이거나 못 쟀다`);
}
if (out.ninesByCountry.some((r) => r.first === null || r.last === null)) {
  throw new Error('아홉 나라 중 2022 나 2025 가 빈 곳이 있다 — 반쯤 받은 것으로 흐름을 말하지 않는다');
}
for (const y of out.byYear) {
  if (y.weeks < 52) throw new Error(`${y.year} 이 ${y.weeks}주뿐이다 — 온전한 해가 아니면 흐름에 못 넣는다`);
}

fs.writeFileSync('src/data/wikitip-world-share.json', JSON.stringify(out, null, 2));

console.log(`${out.countryCount}개국 × ${out.weekCount}주 · 나라마다 ${out.slotsPerCountry}줄로 같다 ✅`);
if (확인.labelled + 확인.unlabelled + 확인.both !== 전체한) {
  throw new Error('확인 갈래 셋의 합이 한국 자리 수와 다르다');
}
console.log(`  확인 갈래 — 딱지로 확인 ${out.confirmation.labelledPc}% · 딱지 없음 ${out.confirmation.unlabelledPc}%(자리 ${out.confirmation.unlabelledSlots.toLocaleString()}) · both ${out.confirmation.bothPc}%`);
console.log(`세계의 Top10 자리 중 한국 작품 ${out.worldPc}% (${out.koreanSlots.toLocaleString()}/${out.totalSlots.toLocaleString()}) · 나라 중앙값 ${out.medianCountryPc}%`);
console.log(`해마다  ${out.byYear.map((y) => `${y.year} ${y.pc}%`).join(' · ')}`);
for (const g of out.groups) console.log(`  ${g.group.slice(0, 46).padEnd(48)} ${g.byYear.map((y) => `${y.pc}%`).join(' → ')}`);
console.log(`아홉 나라 모두 내렸나: ${out.ninesByCountry.every((r) => r.change < 0) ? '그렇다' : '아니다'} — ${out.ninesByCountry.map((r) => `${r.name} ${r.change}p`).join(' · ')}`);
console.log(`가른 것: 한국 작품 ${out.ninesDecomposed[0].koreanTitles}편 → ${out.ninesDecomposed[3].koreanTitles}편 · 편당 자리 ${out.ninesDecomposed[0].slotsPerKoreanTitle} → ${out.ninesDecomposed[3].slotsPerKoreanTitle}`);
console.log(`대조군(한국 자신): ${out.home.byYear.map((y) => `${y.pc}%`).join(' → ')}`);
