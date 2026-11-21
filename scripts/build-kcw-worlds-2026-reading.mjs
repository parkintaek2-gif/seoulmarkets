#!/usr/bin/env node
/**
 * build-kcw-worlds-2026-reading.mjs — **롤드컵 2026, 공식 기록 + 언어별 위키백과 열람.** (1번, 2026-10-26)
 *   지면 `/worlds-2026` 의 자료(src/data/wikitip-worlds-2026.json)를 만든다.
 *
 * ── 왜 ─────────────────────────────────────────────────────────
 * 10/26 이슈 4편(디플러스 기아 첫 8강 · 젠지-리옹 · 한화생명 1-2 · 언어별 열람)이 한 축에 선다.
 * 남들은 결과만 쓴다. 우리는 (1) Riot 공식 일정으로 2024·2025 스위스 «8강 진출 순서»를 세고
 * (2) 16팀 문서가 «어느 언어로» 읽히는지를 센다.
 *
 * ── ⛔ 지키는 것 ───────────────────────────────────────────────
 * ⛔ 예측하지 않는다. 지난 두 해의 «분포»를 놓을 뿐이다 — 이것은 통계이지 올해 팀이 아니다.
 * ⛔ 문서가 없는 팀(LYON·LOS)은  — `article: null` 로 두고 «못 쟀다»로 낸다.
 * ⛔ Team Secret 문서는 여러 게임을 아우르는 단체 문서라 롤 팀 열람으로 쓰지 않는다(뺀 까닭 기록).
 * ⛔ 2023 스위스는 공식 일정 첫 쪽이 대회 도중(10/22)부터라 셀 수 없다 — 못 쟀다고 적는다.
 *
 * 쓰는 법
 *   node scripts/build-kcw-worlds-2026-reading.mjs
 *   node scripts/build-kcw-worlds-2026-reading.mjs --selftest
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const 낼곳 = path.join(ROOT, 'src', 'data', 'wikitip-worlds-2026.json');
const UA = { 'User-Agent': 'KCultureWire/1.0 (https://www.kculturewire.com; u5@klifedesign.net)' };
/* Riot 이 lolesports.com 화면에 싣는 공개 웹 키 — scripts/collect-lol-vod-transcript.mjs 와 같다 */
const RIOT = { 'x-api-key': '0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z' };
const WORLDS = '98767975604431411';

export const 팀문서 = {
  GEN: 'Gen.G', DK: 'Dplus KIA', T1: 'T1 (esports)', HLE: 'Hanwha Life Esports',
  BLG: 'Bilibili Gaming', TES: 'Top Esports', IG: 'Invictus Gaming', AL: "Anyone's Legend",
  G2: 'G2 Esports', KC: 'Karmine Corp', MKOI: 'Movistar KOI', CFO: 'CTBC Flying Oyster',
  TLAW: 'Team Liquid', LYON: null, LOS: null, TSW: null,
};
export const 뺀까닭 = {
  LYON: 'No English Wikipedia article found on 26 October 2026.',
  LOS: 'No English Wikipedia article found on 26 October 2026.',
  TSW: 'The Team Secret article covers an organisation in many games; its reading is not a League of Legends signal.',
  TLAW: 'Counted with the Team Liquid article, which covers the whole organisation; read with care.',
};
export const 대회문서 = '2026 League of Legends World Championship';
/* [10/27] 선수 문서 — 언어마다 제목이 다르다(독일어 Lee Sang-hyeok 등). 영어 문서의 언어 연결로 찾는다 */
export const 선수문서 = { Faker: 'Faker (gamer)' };
export const 평소 = ['20261001', '20261013']; /* 대회 전(플레이인 10/16 KST 시작) */

export function 가운데(xs) {
  const s = xs.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!s.length) return null;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * [2026-10-27 · 1번] 스위스에서 «어떤 전적을 거친 팀»이 끝에 어디로 갔나.
 *   거친전적('2-1') → [{ team, final: '3-1', qualified: true }] — 그 전적에 한 번이라도 선 팀 전부.
 *   ⛔ 끝나지 않은 해(2026)에서는 쓰지 않는다 — 아직 끝이 없다.
 */
export function 거친전적(경기들, 전적) {
  const 승 = {}; const 패 = {}; const 선 = new Set();
  const 적 = (c) => `${승[c] ?? 0}-${패[c] ?? 0}`;
  for (const e of 경기들) {
    const [a, b] = e.match.teams;
    const 이긴 = a.result.outcome === 'win' || (b.result.outcome !== 'win' && a.result.gameWins > b.result.gameWins) ? a : b;
    const 진 = 이긴 === a ? b : a;
    승[이긴.code] = (승[이긴.code] ?? 0) + 1;
    패[진.code] = (패[진.code] ?? 0) + 1;
    for (const c of [이긴.code, 진.code]) if (적(c) === 전적) 선.add(c);
  }
  return [...선].map((c) => ({ team: c, final: 적(c), qualified: (승[c] ?? 0) >= 3 }));
}

/** 스위스 경기 목록에서 «3승 도달 순서»를 센다 */
export function 진출순서(경기들) {
  const 승 = {}; const 패 = {}; const 순서 = [];
  for (const e of 경기들) {
    const [a, b] = e.match.teams;
    const 이긴 = a.result.outcome === 'win' || (b.result.outcome !== 'win' && a.result.gameWins > b.result.gameWins) ? a : b;
    const 진 = 이긴 === a ? b : a;
    승[이긴.code] = (승[이긴.code] ?? 0) + 1;
    패[진.code] = (패[진.code] ?? 0) + 1;
    if (승[이긴.code] === 3) 순서.push({ team: 이긴.code, name: 이긴.name, record: `3-${패[이긴.code] ?? 0}` });
  }
  return { 순서, 승, 패 };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function 받기(url, headers) {
  for (let i = 0; i < 4; i += 1) {
    const r = await fetch(url, { headers });
    if (r.status === 200) return r.json();
    if (r.status === 404) return null;
    await sleep(3000 * (i + 1));
  }
  throw new Error(`받지 못함 ${url}`);
}

async function 일정전부() {
  const 쪽들 = [];
  let 토큰 = null;
  for (;;) {
    const d = await 받기(`https://esports-api.lolesports.com/persisted/gw/getSchedule?hl=en-US&leagueId=${WORLDS}${토큰 ? `&pageToken=${토큰}` : ''}`, RIOT);
    쪽들.push(...d.data.schedule.events);
    토큰 = d.data.schedule.pages.older;
    if (!토큰) break;
  }
  const 본 = new Set();
  return 쪽들.filter((e) => e.match && !본.has(e.match.id) && 본.add(e.match.id))
    .sort((a, b) => (a.startTime < b.startTime ? -1 : 1));
}

async function 언어들(제목) {
  const d = await 받기(`https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=langlinks&lllimit=500&titles=${encodeURIComponent(제목)}`, UA);
  const p = Object.values(d.query.pages)[0];
  return [{ lang: 'en', title: p.title }, ...(p.langlinks ?? []).map((l) => ({ lang: l.lang, title: l['*'] }))];
}

async function 날별(lang, 제목, 끝) {
  const t = encodeURIComponent(제목.replace(/ /g, '_'));
  const d = await 받기(`https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/${lang}.wikipedia/all-access/user/${t}/daily/${평소[0]}/${끝}`, UA);
  const o = {};
  for (const it of d?.items ?? []) o[it.timestamp.slice(0, 8)] = it.views;
  return o;
}

if (process.argv.includes('--selftest')) {
  let 실패 = 0;
  const 재 = (n, ok) => { if (!ok) { 실패 += 1; console.log('⛔', n); } };
  재('가운데 홀수', 가운데([3, 1, 2]) === 2);
  재('가운데 짝수', 가운데([1, 2, 3, 4]) === 2.5);
  재('빈 것은 null(0 아님)', 가운데([]) === null);
  const 팀 = (code, w, o) => ({ code, name: code, result: { gameWins: w, outcome: o } });
  const 경기 = (a, b) => ({ match: { teams: [팀(a, 1, 'win'), 팀(b, 0, 'loss')] } });
  const r = 진출순서([경기('A', 'B'), 경기('A', 'C'), 경기('B', 'C'), 경기('A', 'D')]);
  재('3-0 이 먼저 잡힌다', r.순서.length === 1 && r.순서[0].team === 'A' && r.순서[0].record === '3-0');
  재('문서 없는 팀은 null', 팀문서.LYON === null && 팀문서.LOS === null);
  const 거 = 거친전적([경기('A', 'B'), 경기('C', 'D'), 경기('A', 'C'), 경기('B', 'D'), 경기('D', 'A'), 경기('A', 'B')], '2-1');
  재('2-1 을 거친 팀과 끝 전적', 거.length === 1 && 거[0].team === 'A' && 거[0].final === '3-1' && 거[0].qualified === true);
  재('0-2 를 거친 팀', 거친전적([경기('A', 'B'), 경기('A', 'B')], '0-2')[0]?.team === 'B');
  console.log(실패 ? `⛔ ${실패}개 틀림` : '✅ 자가시험 통과');
  process.exit(실패 ? 1 : 0);
}

/* ⚠ 마지막 판이 끝나도 일정의 state 는 한동안 inProgress 로 남는다(10/26 젠지-리옹에서 봤다).
   승패(outcome)가 양쪽에 찍혔으면 끝난 것으로 본다 */
function 끝났나(e) {
  return e.state === 'completed'
    || (e.match?.teams ?? []).every((t) => t.result?.outcome === 'win' || t.result?.outcome === 'loss');
}

const 경기들 = await 일정전부();
const 해별 = {};
for (const 해 of ['2023', '2024', '2025', '2026']) {
  const 스위스 = 경기들.filter((e) => e.startTime.startsWith(해) && e.blockName === 'Swiss' && 끝났나(e));
  const 녹아웃 = 경기들.filter((e) => e.startTime.startsWith(해) && /Quarter|Semi|Final/.test(e.blockName) && 끝났나(e));
  const 끝자리 = {};
  for (const e of 녹아웃) for (const t of e.match.teams) {
    끝자리[t.code] = t.result.outcome === 'win' && e.blockName === 'Finals' ? 'Champion' : `${e.blockName.replace(/s$/, '')}`;
  }
  const { 순서, 승, 패 } = 진출순서(스위스);
  /* [10/27] 끝난 해만 — 2-1·1-2·0-2 를 거친 팀이 끝에 어디로 갔나 */
  const 끝난해 = 해 === '2024' || 해 === '2025';
  /* [10/31] 2-2(마지막 판)도 센다 — 11/1 결정전 여섯 팀의 자리 */
  const 거친 = 끝난해 ? Object.fromEntries(['2-1', '1-2', '0-2', '2-2'].map((r) => [r, 거친전적(스위스, r)
    .map((x) => ({ ...x, name: 스위스.flatMap((e) => e.match.teams).find((t) => t.code === x.team)?.name ?? x.team, finish: 끝자리[x.team] ?? null }))])) : null;
  /* [10/31] 스위스 끝 전적(3-0·3-1·3-2)별로 녹아웃에서 어디까지 갔나 — 끝난 해만 */
  const 끝전적별 = 끝난해 ? Object.fromEntries(['3-0', '3-1', '3-2'].map((r) => [r, 순서.filter((q) => q.record === r)
    .map((q) => ({ team: q.team, name: q.name, finish: 끝자리[q.team] ?? null }))])) : null;
  해별[해] = {
    fromRecord: 거친,
    finishBySwissRecord: 끝전적별,
    swissMatchesCompleted: 스위스.length,
    firstSwissMatch: 스위스[0]?.startTime ?? null,
    qualifiedInOrder: 순서.map((q, i) => ({ ...q, place: i + 1, finish: 끝자리[q.team] ?? null })),
    records: Object.fromEntries([...new Set([...Object.keys(승), ...Object.keys(패)])].map((c) => [c, `${승[c] ?? 0}-${패[c] ?? 0}`])),
  };
}
/* 2023 은 첫 쪽이 대회 도중부터다 — 세지 않는다 */
해별['2023'].note = 'The official schedule feed starts part-way through the 2023 Swiss Stage (first match it returns: 22 October 2023), so 2023 is not counted.';
해별['2023'].qualifiedInOrder = null;

const 어제 = new Date(Date.now() - 86400000);
const 끝 = `${어제.getFullYear()}${String(어제.getMonth() + 1).padStart(2, '0')}${String(어제.getDate()).padStart(2, '0')}`;

const 팀들 = {};
const 이름 = Object.fromEntries(경기들.filter((e) => e.startTime.startsWith('2026')).flatMap((e) => e.match.teams.map((t) => [t.code, t.name])));
for (const [code, 제목] of Object.entries(팀문서)) {
  if (!제목) { 팀들[code] = { name: 이름[code] ?? code, article: null, excludedBecause: 뺀까닭[code] }; continue; }
  const 판들 = await 언어들(제목);
  const 줄 = [];
  for (const { lang, title } of 판들) {
    const 날 = await 날별(lang, title, 끝);
    const 평소값 = 가운데(Object.entries(날).filter(([k]) => k <= 평소[1]).map(([, v]) => v));
    줄.push({ lang, title, usual: 평소값, daily: 날 });
    await sleep(120);
  }
  팀들[code] = { name: 이름[code] ?? code, article: 제목, note: 뺀까닭[code] ?? null, editions: 줄 };
  console.log(`  ${code} ${판들.length}개 언어`);
}

/* [10/27] 2026 팀의 소속 리그 — Riot getTeams 의 homeLeague (지금 값이라 2026 팀에만 쓴다) */
const 리그 = {};
{
  const 팀목록 = (await 받기('https://esports-api.lolesports.com/persisted/gw/getTeams?hl=en-US', RIOT)).data.teams;
  for (const code of Object.keys(해별['2026'].records)) {
    const 후보 = 팀목록.filter((t) => t.code === code);
    const 맞 = 후보.find((t) => t.name === 이름[code]) ?? 후보.find((t) => t.status === 'active') ?? null;
    리그[code] = 맞?.homeLeague?.name ?? null;
  }
}

/* [10/27] 선수 문서 — 페이커. 대회 기간 언어별 열람 */
const 선수들 = {};
for (const [키, 제목] of Object.entries(선수문서)) {
  const 판 = [];
  for (const { lang, title } of await 언어들(제목)) {
    판.push({ lang, title, daily: await 날별(lang, title, 끝) });
    await sleep(120);
  }
  선수들[키] = { article: 제목, team: 'T1', editions: 판 };
}

const 대회판 = [];
for (const { lang, title } of await 언어들(대회문서)) {
  대회판.push({ lang, title, daily: await 날별(lang, title, 끝) });
  await sleep(120);
}

/* ⛔ 요청한 끝날이 아니라 «실제로 받은» 마지막 날을 적는다 — Wikimedia 는 하루 늦게 낸다 */
const 받은날들 = [...Object.values(팀들).flatMap((t) => (t.editions ?? []).flatMap((e) => Object.keys(e.daily))),
  ...대회판.flatMap((e) => Object.keys(e.daily)),
  ...Object.values(선수들).flatMap((p) => p.editions.flatMap((e) => Object.keys(e.daily)))];
const 받은끝 = 받은날들.sort().at(-1) ?? null;

const 나감 = {
  generated: new Date().toLocaleString('sv-SE').replace(' ', 'T').slice(0, 16) + '+09:00',
  whatThisIs: 'Worlds 2026 counted two ways: the Swiss Stage order of qualification from Riot\'s official schedule (2024, 2025 and 2026), and Wikipedia reading of each team\'s article by language edition.',
  whatThisIsNot: 'Not a prediction. Past years show how earlier fields went, not how this one will. Wikipedia reads count look-ups, not viewers or fans.',
  sources: {
    riot: 'https://esports-api.lolesports.com/persisted/gw/getSchedule (league 98767975604431411)',
    wikimedia: 'https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article (user agent type, daily)',
  },
  usualDays: 평소,
  lastDay: 받은끝,
  lastDayRequested: 끝,
  years: 해별,
  teams: 팀들,
  leagues2026: 리그,
  leaguesNote: 'League is the team\'s home league in Riot\'s team list (getTeams) when this page was built.',
  players: 선수들,
  tournamentArticle: { title: 대회문서, editions: 대회판 },
};
fs.writeFileSync(낼곳, `${JSON.stringify(나감, null, 1)}\n`);
console.log(`✅ ${path.relative(ROOT, 낼곳)} — 받은 마지막 날 ${받은끝} (요청 ${끝})`);
