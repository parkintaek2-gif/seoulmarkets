/**
 * K Culture Wire — **한국 차트가 먼저였나.** (`/watched` 옆에 붙는 자료)
 *
 * 결과 → src/data/wikitip-home-first.json
 * 입력 → archive/raw/netflix-top10/countries.ndjson   (넷플릭스 Tudum 나라별 주간 Top10)
 *        archive/raw/netflix-top10/korean-titles-keyed.json (제목 → Q, 방송사 물음에만 쓴다)
 *        src/data/wikitip-titles.json                 (검산용 — 편수가 여기와 같아야 한다)
 *
 * ── 왜 재나 ────────────────────────────────────────────────────────
 * 해외 손님이 자주 하는 물음이 있다. 「한국 Top10 을 보면 다음에 뭐가 올지 알 수 있나?」
 * 그 물음은 **앞을 보는 물음**이라 우리가 팔지 않는 것이다(/terms).
 * 그러나 **뒤를 보는 물음**은 잴 수 있다 — 「지금까지, 한국이 먼저 걸린 적이 몇 번인가.」
 * 그 수를 내면 앞의 물음은 손님이 스스로 접는다. 우리가 예측을 대신 말할 필요가 없다.
 *
 * ── ⛔ 이 자료가 **말하지 못하는 것** ───────────────────────────────
 * ⛔ 「같은 주」는 「같은 날」이 아니다. 넷플릭스는 주 단위로만 낸다.
 *    **엿새 이하의 앞섬은 이 자료에 보이지 않는다.** 없는 것이 아니라 못 보는 것이다.
 * ⛔ 차트에 걸린 것은 공개일이 아니다. 극장에서 먼저 돈 영화는 한국에서 한참 뒤에 걸린다.
 * ⛔ 판 왼쪽이 잘려 있다. 2021-07-04 이 판의 첫 주다. 그 주에 처음 걸린 작품은
 *    **더 앞이 있었을 수 있다.** 지워 없애지 않고 따로 세어 같이 낸다.
 *
 * ── ⚠ 이 견줌이 성립하는 까닭 ──────────────────────────────────────
 * 한국 목록과 싱가포르 목록은 **자리 수가 같다**(각 나라 5,300줄 · 265주 × 10칸 × 2갈래).
 * 「한국은 자리가 적어서 못 걸렸다」가 성립하지 않는다. 아래에서 **직접 재고, 다르면 던진다** —
 * 이 전제가 깨지면 이 자료의 모든 수가 뜻을 잃는다.
 */
import fs from 'node:fs';
import readline from 'node:readline';
import { koreanTitleFilter } from './lib/korean-netflix-titles.mjs';
/* 🔴 [2026-11-14] 영문 지면에 「오후」가 나갔다 — 잰 시각은 한 꼴로 적는다 */
import { 잰때문자 } from './lib/잰때.mjs';

const SEA = { SG: 'Singapore', MY: 'Malaysia', PH: 'the Philippines', TH: 'Thailand', ID: 'Indonesia', VN: 'Vietnam' };
const HOME = 'KR';
/** 판의 첫 주. 여기 걸린 작품은 왼쪽이 잘렸다 — 아래에서 갈라 센다. */
let 첫주 = null;

/* 판정은 한 곳에서 온다. 여기 복사하면 /titles 와 이 자료가 다른 편수를 말하게 된다. */
const ko = koreanTitleFilter();

const agg = new Map();
/** 나라별 주 수 — 견줌의 전제를 직접 잰다 */
const 나라주 = new Map();

const rl = readline.createInterface({
  input: fs.createReadStream('archive/raw/netflix-top10/countries.ndjson'),
  crlfDelay: Infinity,
});
for await (const line of rl) {
  if (!line.trim()) continue;
  let r; try { r = JSON.parse(line); } catch { continue; }
  if (r.iso2 !== HOME && !SEA[r.iso2]) continue;
  if (!나라주.has(r.iso2)) 나라주.set(r.iso2, { 주: new Set(), 줄: 0 });
  const c = 나라주.get(r.iso2);
  c.주.add(r.주); c.줄++;
  if (첫주 === null || r.주 < 첫주) 첫주 = r.주;
  if (!ko.keepTitle(r.제목)) continue;

  let a = agg.get(r.제목);
  if (!a) a = { title: r.제목, type: r.구분, home: null, away: null, awayCountries: new Set(), types: new Set() };
  if (r.iso2 === HOME) { if (!a.home || r.주 < a.home) a.home = r.주; }
  else {
    if (!a.away || r.주 < a.away) a.away = r.주;
    a.awayCountries.add(r.iso2);
  }
  if (r.구분) { a.type = r.구분; a.types.add(r.구분); }
  agg.set(r.제목, a);
}

/* ⚠ 전제 검사 — 자리 수가 다르면 이 자료는 낼 수 없다. 조용히 진행하지 않는다. */
const 줄수들 = [...나라주.entries()].map(([k, v]) => `${k} ${v.줄}줄/${v.주.size}주`);
const 줄집합 = new Set([...나라주.values()].map((v) => `${v.줄}|${v.주.size}`));
if (줄집합.size !== 1) {
  throw new Error(`나라마다 자리 수가 다르다 — 「한국이 못 걸렸다」를 자리 탓과 가를 수 없다: ${줄수들.join(' · ')}`);
}

/** 동남아에 한 번이라도 걸린 한국 작품만이 이 물음의 대상이다 */
const rows = [...agg.values()].filter((a) => a.away);
const 주차 = (a, b) => Math.round((new Date(b) - new Date(a)) / 604800000);
const isTv = (a) => /^TV/i.test(a.type);

const 잘림 = (a) => a.away === 첫주 || a.home === 첫주;
const 둘다 = rows.filter((a) => a.home);
const 없음 = rows.filter((a) => !a.home);
const 안전 = 둘다.filter((a) => !잘림(a));

const 가르기 = (g) => ({
  n: g.length,
  homeFirst: g.filter((a) => a.home < a.away).length,
  sameWeek: g.filter((a) => a.home === a.away).length,
  awayFirst: g.filter((a) => a.home > a.away).length,
});
const 비율 = (x, n) => (n ? +((100 * x) / n).toFixed(1) : null);
const 살 = (g) => {
  const s = 가르기(g);
  return {
    ...s,
    homeFirstPc: 비율(s.homeFirst, s.n),
    sameWeekPc: 비율(s.sameWeek, s.n),
    awayFirstPc: 비율(s.awayFirst, s.n),
  };
};

/**
 * 🔴 **제목 하나가 작품 하나가 아니다.** 판은 제목으로만 묶여 있다(/titles 도 그렇다).
 *
 * 처음에 「Start-Up 이 동남아에 229주 먼저 걸렸다」를 예로 쓰려다 멈췄다 —
 * 그 제목은 2019년 영화와 2020년 드라마가 **같이 쓰고 있다.** 앞선 것은 한 작품이 아니라
 * **두 작품이 한 칸에 겹쳐 앉은 것**이다. 우리는 이미 이 병을 한 번 기사로 냈다
 * (「세 편 중 셋은 이름을 나눠 쓴다」). 그걸 알면서 여기서 또 밟을 뻔했다.
 *
 * 가려내는 법 — **한 제목이 Films 와 TV 두 목록에 다 나오면** 작품이 둘일 가능성이 크다.
 * ⛔ 지우지 않는다. 따로 세어 내고, **앞뒤 주차를 잴 때만 뺀다.**
 *    갈린 갈래는 세 갈래(먼저·같이·나중) 셈에는 그대로 둔다 — 거기서는 첫 주만 쓰기 때문이다.
 *    ⚠ 그래도 겹친 제목은 「먼저/나중」을 부풀린다. 아래에서 겹친 것만 뺀 값도 같이 낸다.
 */
const 겹침 = (a) => a.types.size > 1;
const 겹친것 = rows.filter(겹침);

const 중앙 = (v) => (v.length ? v.slice().sort((x, y) => x - y)[Math.floor(v.length / 2)] : null);
const 맑음 = 안전.filter((a) => !겹침(a));
const 앞선주 = 맑음.filter((a) => a.home < a.away).map((a) => 주차(a.home, a.away));
const 뒤진주 = 맑음.filter((a) => a.home > a.away).map((a) => 주차(a.away, a.home));

/**
 * 세운 뒤 넘어진 설명 — **그대로 낸다.**
 * 「한국에서 안 걸린 것은 한국에서 TV 로 봤기 때문」이라고 짐작했다. P449(방송사)로 쟀더니
 * **반대로 나왔다.** 짐작을 지우지 않고 수와 함께 남긴다 — 지운 짐작은 다음 사람이 또 한다.
 *
 * ⚠ 갈래를 섞어 세면 이 짐작이 **맞는 것처럼 보인다**(37.9% 대 65.4%). 영화는 방송사 칸이
 *   원래 비어 있어서다. 그래서 **드라마 안에서만** 견준다.
 */
const keyed = JSON.parse(fs.readFileSync('archive/raw/netflix-top10/korean-titles-keyed.json', 'utf8'));
const 이름q = {};
for (const q of Object.keys(keyed.작품)) {
  const w = keyed.작품[q];
  if (w.넷플릭스제목) 이름q[w.넷플릭스제목] = q;
}
const 곳간 = 'archive/raw/netflix-top10/broadcaster-p449.json';
let 방송사 = null;
if (fs.existsSync(곳간)) {
  방송사 = new Set(JSON.parse(fs.readFileSync(곳간, 'utf8')).qs);
} else if (process.env.KCW_FETCH === '1') {
  const qs = [...new Set(rows.map((a) => 이름q[a.title]).filter(Boolean))];
  const 있음 = new Set();
  for (let i = 0; i < qs.length; i += 80) {
    const 값 = qs.slice(i, i + 80).map((q) => `wd:${q}`).join(' ');
    const 질의 = `SELECT ?x WHERE { VALUES ?x { ${값} } ?x wdt:P449 ?b . }`;
    const res = await fetch('https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(질의), {
      headers: { 'user-agent': 'KCultureWire/1.0 (parkintaek2@gmail.com)' },
    });
    if (!res.ok) throw new Error(`Wikidata ${res.status} — 묶음 ${i}. 반쯤 받은 것으로 수를 내지 않는다`);
    for (const b of (await res.json()).results.bindings) 있음.add(b.x.value.split('/').pop());
  }
  fs.writeFileSync(곳간, JSON.stringify({ 받은날: 잰때문자(), 속성: 'P449', qs: [...있음] }, null, 1));
  방송사 = 있음;
}
/** ⛔ 못 받았으면 0 이 아니라 **null** 이다. 0 은 「없다」고, null 은 「모른다」다 */
const 방송사비율 = (g) => {
  if (!방송사) return null;
  const q붙은 = g.filter((a) => 이름q[a.title]);
  if (!q붙은.length) return null;
  const 있 = q붙은.filter((a) => 방송사.has(이름q[a.title])).length;
  return { n: q붙은.length, withBroadcaster: 있, pc: 비율(있, q붙은.length) };
};

const out = {
  generated: 잰때문자(),
  source: 'Netflix Top 10 (Tudum) weekly country lists for Korea and the six Southeast Asian markets; Korean titles identified via Wikidata country of origin (P495 = Q884)',
  sourceKo: '넷플릭스 Tudum 주간 나라별 Top10 — 한국과 동남아 여섯 나라',
  question: 'For Korean titles that charted in Southeast Asia, did Korea\'s own chart get there first?',
  home: 'Korea',
  region: Object.values(SEA).join(', '),
  weekFrom: 첫주,
  weekTo: [...나라주.get(HOME).주].sort().pop(),
  weekCount: 나라주.get(HOME).주.size,
  /** 견줌의 전제. 지면이 이 수를 그대로 적는다 — 「자리가 적어서」를 손님이 직접 지울 수 있게 */
  slotsPerCountry: 나라주.get(HOME).줄,
  titleCount: rows.length,
  neverAtHome: 없음.length,
  neverAtHomePc: 비율(없음.length, rows.length),
  bothCharted: 둘다.length,
  /** 왼쪽 잘린 것을 넣은 값과 뺀 값을 **둘 다** 낸다. 하나만 내면 고른 것이 된다 */
  all: 살(둘다),
  censoredExcluded: 살(안전),
  censoredCount: 둘다.length - 안전.length,
  /** 제목이 겹친 것 — 지우지 않고 센다 */
  sharedNameCount: 겹친것.length,
  sharedNameInBoth: 둘다.filter(겹침).length,
  sharedNameTitles: 겹친것.map((a) => a.title).sort(),
  /** 왼쪽 잘림과 겹친 제목을 **둘 다** 뺀 값. 가장 좁고 가장 안전한 셈 */
  cleanest: 살(맑음),
  byFormat: [
    { format: 'Series', ...살(안전.filter(isTv)) },
    { format: 'Films', ...살(안전.filter((a) => !isTv(a))) },
  ],
  leadWeeks: {
    homeFirstMedian: 중앙(앞선주),
    homeFirstMax: 앞선주.length ? Math.max(...앞선주) : null,
    homeFirstOneWeek: 앞선주.filter((w) => w === 1).length,
    awayFirstMedian: 중앙(뒤진주),
    awayFirstMax: 뒤진주.length ? Math.max(...뒤진주) : null,
    awayFirstOneWeek: 뒤진주.filter((w) => w === 1).length,
  },
  /** 여섯 나라 전부에 걸리고 한국에는 한 번도 안 걸린 것 */
  allSixNeverHome: 없음
    .filter((a) => a.awayCountries.size === Object.keys(SEA).length)
    .map((a) => ({ title: a.title, type: a.type, firstAway: a.away }))
    .sort((x, y) => x.firstAway.localeCompare(y.firstAway)),
  neverAtHomeByFormat: {
    series: 없음.filter(isTv).length,
    films: 없음.filter((a) => !isTv(a)).length,
  },
  /** 넘어진 설명 — 갈래를 섞은 값과 드라마 안에서만 본 값을 같이 낸다 */
  broadcasterTest: 방송사
    ? {
      property: 'Wikidata P449 (original broadcaster)',
      mixedNever: 방송사비율(없음),
      mixedCharted: 방송사비율(둘다),
      seriesNever: 방송사비율(없음.filter(isTv)),
      seriesCharted: 방송사비율(둘다.filter(isTv)),
      verdict: 'not supported',
    }
    : null,
  /** ⛔ 보기는 **겹친 제목을 뺀 것에서만** 고른다. 겹친 것을 예로 들면 기사가 거짓말이 된다 */
  examples: {
    homeFirst: 맑음.filter((a) => a.home < a.away)
      .sort((x, y) => 주차(y.home, y.away) - 주차(x.home, x.away))
      .slice(0, 5).map((a) => ({ title: a.title, type: a.type, weeks: 주차(a.home, a.away) })),
    awayFirst: 맑음.filter((a) => a.home > a.away)
      .sort((x, y) => 주차(y.away, y.home) - 주차(x.away, x.home))
      .slice(0, 5).map((a) => ({ title: a.title, type: a.type, weeks: 주차(a.away, a.home) })),
  },
};

/* ── 검산 ── 하나라도 어긋나면 내지 않는다 ───────────────────────── */
const t = JSON.parse(fs.readFileSync('src/data/wikitip-titles.json', 'utf8'));
if (out.titleCount !== t.titleCount) {
  throw new Error(`편수 ${out.titleCount} ≠ /titles 의 ${t.titleCount} — 같은 판정을 쓰는데 다르면 한쪽이 샌다`);
}
if (out.bothCharted + out.neverAtHome !== out.titleCount) {
  throw new Error(`${out.bothCharted} + ${out.neverAtHome} ≠ ${out.titleCount}`);
}
for (const g of [out.all, out.censoredExcluded, out.cleanest, ...out.byFormat]) {
  if (g.homeFirst + g.sameWeek + g.awayFirst !== g.n) {
    throw new Error(`세 갈래 합 ${g.homeFirst + g.sameWeek + g.awayFirst} ≠ ${g.n}`);
  }
  for (const p of [g.homeFirstPc, g.sameWeekPc, g.awayFirstPc]) {
    if (p !== null && (p < 0 || p > 100)) throw new Error(`비율이 ${p}% 다 — 0~100 밖이다`);
  }
}
if (out.byFormat[0].n + out.byFormat[1].n !== out.censoredExcluded.n) {
  throw new Error(`갈래 합 ${out.byFormat[0].n + out.byFormat[1].n} ≠ ${out.censoredExcluded.n}`);
}
if (out.neverAtHomeByFormat.series + out.neverAtHomeByFormat.films !== out.neverAtHome) {
  throw new Error('한국 기록 없음의 갈래 합이 안 맞는다');
}

/**
 * ⛔ 이미 방송사 시험이 든 자료를 **시험 없는 것으로 덮지 않는다.**
 *
 * 곳간(archive/…/broadcaster-p449.json)은 git 밖이다. 다른 자리에서 이 수집기를 그냥 돌리면
 * 곳간이 없어 `broadcasterTest` 가 null 이 되고, **좋은 자료가 빈 자료로 덮인다.**
 * 그러면 기사 검사가 서고, 선 까닭이 「기사가 틀렸다」로 읽힌다 — 틀린 것은 자료 쪽이다.
 * 덮지 말고 멈추고, 어떻게 해야 하는지 말한다.
 */
const 낼길 = 'src/data/wikitip-home-first.json';
if (!out.broadcasterTest && fs.existsSync(낼길)) {
  const 옛 = JSON.parse(fs.readFileSync(낼길, 'utf8'));
  if (옛.broadcasterTest) {
    throw new Error(
      '이미 있는 자료에는 방송사 시험이 들어 있는데 이번 판에는 없다 — 덮지 않는다.\n'
      + '  KCW_FETCH=1 node scripts/build-wikitip-home-first.mjs 로 한 번 받으면 된다\n'
      + '  (Wikidata P449, 397편 중 Q 붙은 것만. 곳간은 archive 라 git 에 없다)',
    );
  }
}

fs.writeFileSync(낼길, JSON.stringify(out, null, 2));

console.log(`나라별 자리 ${out.slotsPerCountry}줄 · ${out.weekCount}주 — 일곱 나라 모두 같다 ✅`);
console.log(`동남아에 걸린 한국 작품 ${out.titleCount}편 · 한국 기록 없음 ${out.neverAtHome} (${out.neverAtHomePc}%)`);
console.log(`둘 다 걸린 ${out.all.n}편 → 한국 먼저 ${out.all.homeFirst} · 같은 주 ${out.all.sameWeek} · 동남아 먼저 ${out.all.awayFirst}`);
console.log(`왼쪽 잘린 ${out.censoredCount}편 빼면 → ${out.censoredExcluded.homeFirst} / ${out.censoredExcluded.sameWeek} / ${out.censoredExcluded.awayFirst}`);
console.log(`제목이 겹친 ${out.sharedNameCount}편(둘 다 걸린 것 중 ${out.sharedNameInBoth}편)까지 빼면 → ${out.cleanest.homeFirst} / ${out.cleanest.sameWeek} / ${out.cleanest.awayFirst} (n=${out.cleanest.n})`);
for (const f of out.byFormat) console.log(`  ${f.format} ${f.n}편 · 같은 주 ${f.sameWeek} (${f.sameWeekPc}%)`);
console.log(`여섯 나라 전부 + 한국 0 : ${out.allSixNeverHome.length}편`);
console.log(out.broadcasterTest
  ? `방송사 짐작: 드라마 안에서 없음 ${out.broadcasterTest.seriesNever.pc}% 대 걸린 것 ${out.broadcasterTest.seriesCharted.pc}% → ${out.broadcasterTest.verdict}`
  : '방송사 짐작: ⬜ 못 쟀다 (KCW_FETCH=1 로 한 번 받아야 한다)');
