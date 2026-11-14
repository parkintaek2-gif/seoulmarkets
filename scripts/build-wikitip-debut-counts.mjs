/**
 * K Culture Wire — **해마다 새 그룹이 몇이나 생겼나 … 를 재려다 실패한 기록.**
 *
 * 결과 → src/data/wikitip-debut-counts.json
 * 입력 → Wikidata SPARQL (P31/P279* Q215380 음악 그룹 · P495 나라 · P571 결성 · P576 해체)
 *        곳간 archive/raw/wikidata/group-inception.json (git 밖. KCW_FETCH=1 로 한 번 받는다)
 *
 * ── 왜 남기나 ──────────────────────────────────────────────────────
 * 「해마다 새 K팝 그룹이 몇이나 나오나」는 손님이 정말 궁금해하는 물음이고,
 * 위키데이터로 한 번에 나온다. 나온 그림은 **깨끗하게 줄어드는 선**이었다.
 * 그대로 냈으면 「K팝 데뷔가 3분의 1로 줄었다」는 기사가 됐을 것이다.
 *
 * ⛔ 그런데 그 선이 **자료의 성질인지 세상의 성질인지**를 안 봤다. 그래서 대조군을 놓았다 —
 *    **일본·미국·영국 그룹을 똑같은 질의로 세어 본다.**
 *    네 나라가 같은 해에 같은 폭으로 줄면, 줄어든 것은 음악이 아니라 **위키데이터의 기록 속도**다.
 *
 * ⭐ 결과: 네 나라가 다 줄었다. 그래서 이 자료는 **「K팝 데뷔 추이」로 쓰면 안 된다.**
 *    지우지 않고 남긴다 — 다음 사람이 같은 질의를 하고 같은 착각을 한다.
 *
 * ── ⚠ 못 말하는 것 ────────────────────────────────────────────────
 * ⛔ 실제 데뷔 수가 아니다. **위키데이터에 실린 수**다. 둘은 다른 물건이다.
 * ⛔ 「위키데이터가 느리다」도 증명은 아니다. 우리가 아는 것은 **네 나라가 같이 움직였다**는 것뿐이다.
 * ⛔ 해체일은 801곳 중 83곳에만 있다. 수명 이야기를 이 자료로 하면 안 된다.
 */
import fs from 'node:fs';
/* 🔴 [2026-11-14] 영문 지면에 「오후」가 나갔다 — 잰 시각은 한 꼴로 적는다 */
import { 잰때문자 } from './lib/잰때.mjs';

const 곳간 = 'archive/raw/wikidata/group-inception.json';
/** 견줄 나라 — 한국 하나만 보면 그 선이 자료 탓인지 세상 탓인지 영영 모른다 */
const 나라들 = [
  { key: 'KR', qid: 'Q884', name: 'South Korea' },
  { key: 'JP', qid: 'Q17', name: 'Japan' },
  { key: 'US', qid: 'Q30', name: 'the United States' },
  { key: 'GB', qid: 'Q145', name: 'the United Kingdom' },
];
/** 견줄 두 창. 최근 창은 기록이 아직 안 따라온 구간이라는 것이 이 자료의 요지다 */
const 예전창 = [2015, 2016, 2017];
const 최근창 = [2023, 2024, 2025];

const 받기 = async () => {
  const 모음 = {};
  for (const c of 나라들) {
    const q = `SELECT ?g ?start ?end WHERE {
      ?g wdt:P31/wdt:P279* wd:Q215380 ; wdt:P495 wd:${c.qid} ; wdt:P571 ?start .
      OPTIONAL { ?g wdt:P576 ?end }
    }`;
    const res = await fetch(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(q)}`, {
      headers: { 'user-agent': 'KCultureWire/1.0 (parkintaek2@gmail.com)' },
    });
    if (!res.ok) throw new Error(`Wikidata ${res.status} — ${c.name}. 반쯤 받은 것으로 수를 내지 않는다`);
    const m = {};
    for (const b of (await res.json()).results.bindings) {
      m[b.g.value] = { start: b.start.value.slice(0, 4), end: b.end ? b.end.value.slice(0, 4) : null };
    }
    모음[c.key] = m;
  }
  return 모음;
};

let 원자료;
if (fs.existsSync(곳간)) {
  원자료 = JSON.parse(fs.readFileSync(곳간, 'utf8')).byCountry;
} else if (process.env.KCW_FETCH === '1') {
  원자료 = await 받기();
  fs.mkdirSync('archive/raw/wikidata', { recursive: true });
  fs.writeFileSync(곳간, JSON.stringify({ 받은날: 잰때문자(), byCountry: 원자료 }, null, 1));
} else {
  throw new Error('곳간이 없다 — KCW_FETCH=1 node scripts/build-wikitip-debut-counts.mjs 로 한 번 받는다');
}

const 해셈 = (m) => {
  const 해 = {};
  for (const v of Object.values(m)) {
    const y = +v.start;
    if (y >= 1990 && y <= 2026) 해[y] = (해[y] || 0) + 1;
  }
  return 해;
};
const 평균 = (해, 창) => +(창.reduce((s, y) => s + (해[y] || 0), 0) / 창.length).toFixed(1);

const rows = 나라들.map((c) => {
  const m = 원자료[c.key];
  const 해 = 해셈(m);
  const 예전 = 평균(해, 예전창);
  const 최근 = 평균(해, 최근창);
  const 봉값 = Math.max(...Object.values(해));
  return {
    key: c.key,
    name: c.name,
    groups: Object.keys(m).length,
    earlier: 예전,
    recent: 최근,
    /** 남은 비율. ⛔ 「몇 % 줄었다」로 안 적는다 — 줄어든 것이 무엇인지 아직 모른다 */
    remainingPc: 예전 ? +((100 * 최근) / 예전).toFixed(0) : null,
    peakYear: +Object.keys(해).find((y) => 해[y] === 봉값),
    peakCount: 봉값,
    byYear: Object.keys(해).map(Number).sort((a, b) => a - b)
      .filter((y) => y >= 2005).map((y) => ({ year: y, n: 해[y] })),
  };
});

const 한국 = rows.find((r) => r.key === 'KR');
const 남은들 = rows.map((r) => r.remainingPc);

/** 해체일이 있는 곳은 얼마나 되나 — 수명 이야기를 못 하는 까닭 */
const kr = 원자료.KR;
const 끝있음 = Object.values(kr).filter((v) => v.end).length;
const 수명 = Object.values(kr).filter((v) => v.end)
  .map((v) => +v.end - +v.start).filter((y) => y >= 0 && y < 60).sort((a, b) => a - b);
const 일곱 = 수명.filter((y) => y === 7).length;
const 여섯 = 수명.filter((y) => y === 6).length;

const out = {
  generated: 잰때문자(),
  source: 'Wikidata — musical groups (P31/P279* = Q215380) by country of origin (P495), with inception (P571) and dissolution (P576)',
  sourceKo: '위키데이터 — 나라별 음악 그룹의 결성일·해체일',
  question: 'How many new Korean groups are formed each year — and is that question answerable from this source?',
  earlierWindow: 예전창,
  recentWindow: 최근창,
  rows,
  /** 🔴 이 자료의 결론. 수가 아니라 **판정**이다 */
  verdict: 남은들.every((p) => p !== null && p < 60) ? 'not usable as a trend' : 'inconclusive',
  verdictWhy:
    'Every country in the comparison falls by a similar amount over the same years. Four unrelated music industries do not decline together on that schedule; what fell is how quickly this source records new groups.',
  koreaRemainingPc: 한국.remainingPc,
  koreaFallPc: 한국.remainingPc === null ? null : 100 - 한국.remainingPc,
  /** 수명 — 낼 수 없는 까닭을 **수로** 적는다 */
  lifespan: {
    withStart: Object.keys(kr).length,
    withEnd: 끝있음,
    coveragePc: +((100 * 끝있음) / Object.keys(kr).length).toFixed(1),
    medianYears: 수명.length ? 수명[Math.floor(수명.length / 2)] : null,
    atSeven: 일곱,
    atSix: 여섯,
    note: 'Too few groups carry a dissolution date to describe how long Korean groups last, and the ones that do are not a random sample of them.',
  },
};

/* ── 검산 ── */
if (rows.length !== 나라들.length) throw new Error('나라 수가 안 맞는다');
for (const r of rows) {
  if (r.remainingPc === null) throw new Error(`${r.name}: 예전 창이 비었다 — 견줄 수 없다`);
  if (r.byYear.reduce((s, y) => s + y.n, 0) > r.groups) throw new Error(`${r.name}: 해마다 합이 그룹 수보다 많다`);
}
if (out.lifespan.withEnd > out.lifespan.withStart) throw new Error('해체일이 결성일보다 많다');
if (out.verdict === 'not usable as a trend' && 남은들.some((p) => p >= 60)) {
  throw new Error('판정과 수가 어긋난다');
}

fs.writeFileSync('src/data/wikitip-debut-counts.json', JSON.stringify(out, null, 2));

console.log(`판정: ${out.verdict}`);
for (const r of rows) {
  console.log(`  ${r.name.padEnd(20)} 그룹 ${String(r.groups).padStart(5)} · ${예전창[0]}~${예전창[2]} 평균 ${r.earlier} → ${최근창[0]}~${최근창[2]} 평균 ${r.recent} · 남은 ${r.remainingPc}% · 봉우리 ${r.peakYear}년`);
}
console.log(`한국만 보면 ${out.koreaFallPc}% 줄어든 것처럼 보인다 — 네 나라가 다 그렇다`);
console.log(`수명: 결성일 ${out.lifespan.withStart}곳 중 해체일 ${out.lifespan.withEnd}곳(${out.lifespan.coveragePc}%) · 중앙 ${out.lifespan.medianYears}년 · 7년 ${out.lifespan.atSeven}곳 대 6년 ${out.lifespan.atSix}곳`);
