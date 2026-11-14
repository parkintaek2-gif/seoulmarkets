/**
 * K Culture Wire — **한 달 관심 중 가장 큰 하루가 몇 %인가.** (`/kpop-attention` 에 붙는 표)
 *
 * 결과 → src/data/wikitip-peak-day.json
 * 입력 → archive/raw/star-pageviews/actors-*.json · kpop-*.json (이미 받아 둔 것)
 *
 * ── 왜 재나 ────────────────────────────────────────────────────────
 * 「아이돌 팬덤은 사건으로 움직이고 배우 관심은 잔잔하다」는 말이 있다. 잴 수 있다 —
 * 서른 날 중 **가장 큰 하루가 그달 전체의 몇 %**인가. 크면 사건, 작으면 잔잔한 것이다.
 *
 * ── 🔴 스스로 놓는 대조군 ──────────────────────────────────────────
 * ⛔ 이름별 크기를 안 맞추고 견주면 **작은 이름이 답을 만든다.**
 *    서른 날 합이 100 인 사람은 한 날에 20 만 몰려도 20% 다. 그건 사건이 아니라 **작은 수**다.
 *    ⭐ 그래서 **합 크기 띠 안에서만** 배우와 K팝을 견준다.
 *
 * ── ⚠ 못 말하는 것 ────────────────────────────────────────────────
 * ⛔ 두 파일의 서른 날이 **사흘 어긋난다**(배우 7/5~8/3 · K팝 7/8~8/6).
 *    한쪽에만 든 사건이 있을 수 있다. 그래서 **한 사람씩 견주지 않고 무리로만** 본다.
 * ⛔ 인기가 아니다. 영어 위키백과를 몇 번 열었나이지 좋아하는 정도가 아니다.
 * ⛔ 영어 문서가 없는 사람은 아예 안 잡힌다. 그 수도 같이 낸다.
 */
import fs from 'node:fs';
/* 🔴 [2026-11-14] 영문 지면에 「오후」가 나갔다 — 잰 시각은 한 꼴로 적는다 */
import { 잰때문자 } from './lib/잰때.mjs';

const 칸 = 'archive/raw/star-pageviews';
/**
 * ⚠ `startsWith('kpop-')` 로 골랐다가 **`kpop-members-…` 를 집었다.**
 *   그 파일에는 `사람` 이 없어 바로 죽었다 — 죽어서 다행이었다. 조용히 다른 명단을
 *   K팝 명단이라 부르며 셌으면 기사 전체가 틀린 채로 나갔다.
 * ⛔ 이름 꼴을 **날짜까지 못박아** 고른다.
 */
const 고르기 = (앞) => {
  const 꼴 = new RegExp(`^${앞}-\\d{8}\\.json$`);
  const 것 = fs.readdirSync(칸).filter((f) => 꼴.test(f)).sort();
  if (!것.length) throw new Error(`${앞}-YYYYMMDD.json 이 ${칸} 에 없다 — 없는 것을 0 으로 세지 않는다`);
  return `${칸}/${것[것.length - 1]}`;
};

const 배우길 = 고르기('actors');
const 케이팝길 = 고르기('kpop');
const A = JSON.parse(fs.readFileSync(배우길, 'utf8'));
const K = JSON.parse(fs.readFileSync(케이팝길, 'utf8'));

/** 가장 큰 하루가 그달의 몇 %인가. ⛔ 합이 0 이면 **null** — 0% 가 아니다 */
export function 봉우리몫(사람) {
  if (!사람 || typeof 사람.합 !== 'number' || typeof 사람.최고조회 !== 'number') return null;
  if (사람.합 <= 0) return null;
  return +((100 * 사람.최고조회) / 사람.합).toFixed(1);
}

export function 중앙(값들) {
  const s = 값들.filter((v) => v !== null && Number.isFinite(v)).sort((a, b) => a - b);
  return s.length ? +s[Math.floor(s.length / 2)].toFixed(1) : null;
}

/** 크기 띠 — 작은 쪽이 답을 만드는 것을 막는다 */
const 띠들 = [
  [0, 300, 'under 300'],
  [300, 1000, '300–999'],
  [1000, 5000, '1,000–4,999'],
  [5000, 30000, '5,000–29,999'],
  [30000, Infinity, '30,000 or more'],
];
/** 견줌은 이 문턱 위에서만 한다 — 아래는 수가 작아 몫이 저절로 커진다 */
const 견줌문턱 = 5000;

const 셈 = (사람들) => ({
  n: 사람들.length,
  medianPeakPc: 중앙(사람들.map(봉우리몫)),
  medianTotal: 중앙(사람들.map((p) => p.합)),
});

const bands = 띠들.map(([lo, hi, label]) => ({
  label,
  from: lo,
  to: Number.isFinite(hi) ? hi : null,
  actors: 셈(A.사람.filter((p) => p.합 >= lo && p.합 < hi)),
  kpop: 셈(K.사람.filter((p) => p.합 >= lo && p.합 < hi)),
}));

const 큰배우 = A.사람.filter((p) => p.합 >= 견줌문턱);
const 큰케이팝 = K.사람.filter((p) => p.합 >= 견줌문턱);

const out = {
  generated: 잰때문자(),
  source: 'Wikimedia REST pageviews for English Wikipedia articles, 30 days per roster',
  sourceKo: '영어 위키백과 문서의 하루 조회수 — 로스터마다 서른 날',
  question: 'Of a month of lookups, how much lands on the single biggest day — and is that different for actors and for K-pop acts?',
  actorPeriod: A.기간,
  kpopPeriod: K.기간,
  /** 🔴 두 창이 어긋난 날 수. 지면이 이 수를 그대로 적는다 */
  periodOffsetDays: (() => {
    const d = (s) => new Date(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T00:00:00+09:00`);
    return Math.round((d(K.기간.slice(0, 8)) - d(A.기간.slice(0, 8))) / 86400000);
  })(),
  actorsMeasured: A.사람.length,
  kpopMeasured: K.사람.length,
  actorsNoArticle: A.문서없음,
  kpopNoArticle: K.문서없음,
  /** 크기를 안 맞춘 값 — **이것만 내면 안 된다.** 아래 맞춘 값과 나란히 놓는다 */
  rawActors: 셈(A.사람),
  rawKpop: 셈(K.사람),
  bands,
  compareFrom: 견줌문턱,
  matchedActors: 셈(큰배우),
  matchedKpop: 셈(큰케이팝),
  /** 갈래를 갈라도 같은가 — K팝 명단에는 그룹과 사람이 섞여 있다 */
  kpopGroups: 셈(큰케이팝.filter((p) => p.갈래 === 'group')),
  kpopPeople: 셈(큰케이팝.filter((p) => p.갈래 !== 'group')),
  /** 판정. ⛔ 「같다」가 아니라 **얼마나 다른가**를 수로 적는다 */
  matchedGap: null,
  verdict: null,
};
out.matchedGap = +(out.matchedActors.medianPeakPc - out.matchedKpop.medianPeakPc).toFixed(1);
out.rawGap = +(out.rawActors.medianPeakPc - out.rawKpop.medianPeakPc).toFixed(1);
out.verdict = Math.abs(out.matchedGap) < 1
  ? 'the two groups are the same shape once size is held fixed'
  : 'a gap survives holding size fixed';

/* ── 검산 ── */
for (const b of bands) {
  for (const g of [b.actors, b.kpop]) {
    if (g.medianPeakPc !== null && (g.medianPeakPc <= 0 || g.medianPeakPc > 100)) {
      throw new Error(`${b.label}: 몫이 ${g.medianPeakPc}% 다`);
    }
  }
}
if (bands.reduce((s, b) => s + b.actors.n, 0) !== A.사람.length) throw new Error('배우 띠 합이 안 맞는다');
if (bands.reduce((s, b) => s + b.kpop.n, 0) !== K.사람.length) throw new Error('K팝 띠 합이 안 맞는다');
if (out.matchedActors.n < 100 || out.matchedKpop.n < 100) {
  throw new Error(`견줌 표본이 얇다 — 배우 ${out.matchedActors.n} · K팝 ${out.matchedKpop.n}`);
}
if (Math.abs(out.periodOffsetDays) > 10) throw new Error(`두 창이 ${out.periodOffsetDays}일 어긋난다 — 무리로도 견주기 어렵다`);

fs.writeFileSync('src/data/wikitip-peak-day.json', JSON.stringify(out, null, 2));

console.log(`배우 ${out.actorsMeasured}명 (${out.actorPeriod}) · K팝 ${out.kpopMeasured}명 (${out.kpopPeriod}) · 창이 ${out.periodOffsetDays}일 어긋난다`);
console.log(`크기 안 맞춘 값  배우 ${out.rawActors.medianPeakPc}% · K팝 ${out.rawKpop.medianPeakPc}% · 차이 ${out.rawGap}p`);
for (const b of bands) console.log(`  ${b.label.padEnd(16)} 배우 ${b.actors.medianPeakPc}% (n=${b.actors.n}) · K팝 ${b.kpop.medianPeakPc}% (n=${b.kpop.n})`);
console.log(`${out.compareFrom.toLocaleString()} 이상만  배우 ${out.matchedActors.medianPeakPc}% (n=${out.matchedActors.n}) · K팝 ${out.matchedKpop.medianPeakPc}% (n=${out.matchedKpop.n}) · 차이 ${out.matchedGap}p`);
console.log(`판정: ${out.verdict}`);
