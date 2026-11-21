#!/usr/bin/env node
/**
 * collect-kcw-culture-data-market.mjs — **한국이 내놓은 «문화 데이터» 1,344건을 센다.**
 *
 * ── 🔴 왜 만드나 (2026-09-06) ────────────────────────────────
 * 우리 아카이브를 훑다가 `archive/raw/bigdata-culture` 를 찾았다. 1,344건이 받아져 있는데
 * **어느 지면도 이것을 안 쓰고 있었다**(grep 0곳). 사장님 「쥔 자료의 안 쓰던 축부터 찾아 낸다」.
 *
 * ⭐ 영어권 독자에게 이것은 새 이야기다 — 「한국은 문화 데이터를 공개하나? 얼마나? 공짜인가?」
 *   그 물음에 답하는 영문 지면이 없다. 우리가 세면 우리가 처음이다.
 *
 * ── ⛔ 이 자가 지키는 것 ────────────────────────────────────
 * ⛔ **공짜라는 것을 「쓸 수 있다」로 읽지 않는다.** 값이 0이어도 갱신이 멈췄으면 죽은 자료다.
 *   그래서 «갱신일»을 함께 센다. 그 둘을 갈라 놓는 것이 이 자의 값어치다.
 * ⛔ **원본을 다시 배포하지 않는다.** 우리가 내는 것은 «세어서 얻은 수»다.
 *   제목 몇 개를 «보기»로 싣는 것까지가 끝이고, 자료 자체를 올리지 않는다.
 * ⛔ 날짜를 못 읽은 건을 「오래된 것」으로 세지 않는다 — 못 읽었다고 따로 센다.
 * ⛔ 꼬리표가 없는 건을 
 *
 * 쓰는 법
 *   node scripts/collect-kcw-culture-data-market.mjs --자가시험
 *   node scripts/collect-kcw-culture-data-market.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { 오늘 as 케이에스티오늘 } from './_kst.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const 뿌리 = path.join(__dirname, '..');
const 자료방 = path.join(뿌리, 'archive', 'raw', 'bigdata-culture');
const 낼곳 = path.join(뿌리, 'src', 'data', 'wikitip-culture-data-market.json');

/** `2026.01.08` → `2026-01-08`. ⛔ 못 읽으면 null 이다. 오늘로 채우지 않는다 */
export function 날읽기(글) {
  const m = String(글 ?? '').match(/(20\d{2})[.\-/](\d{1,2})[.\-/](\d{1,2})/);
  if (!m) return null;
  const [, y, mo, d] = m;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** 두 날 사이 몇 달인가 — 어림이다. ⛔ 한쪽이 없으면 0 이 아니라 null */
export function 몇달전(날, 오늘날) {
  if (!날 || !오늘날) return null;
  const a = new Date(`${날}T00:00:00`); const b = new Date(`${오늘날}T00:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  return Math.round(((b - a) / (1000 * 60 * 60 * 24 * 30.44)) * 10) / 10;
}

/**
 * 🔴 이 자의 심장 — **공짜와 «살아 있음»은 다른 것이다.**
 * 값이 0원이어도 두 해째 갱신이 없으면 손님에게는 죽은 자료다.
 * 「무료 80%」만 내면 그것이 좋은 소식처럼 읽힌다. 갈라서 낸다.
 */
export function 살아있나(갱신일, 오늘날, 달수 = 12) {
  const 달 = 몇달전(갱신일, 오늘날);
  if (달 === null) return null;              /* ⛔ 못 읽은 것은 「죽음」이 아니다 */
  return 달 <= 달수;
}

/** 값 갈래를 우리 말로 — ⛔ 모르는 값을 「무료」로 넘기지 않는다 */
export function 값갈래(글) {
  const s = String(글 ?? '').trim();
  if (s === '무료') return 'free';
  if (s === '유료') return 'paid';
  if (s === '협의') return 'negotiable';
  return 'unknown';
}

/** 파일 꼴을 쉼표로 가른다 — `JSON,CSV` → ['JSON','CSV'] */
export function 꼴들(글) {
  return String(글 ?? '').split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
}

/* ── 자가시험 ───────────────────────────────────────────────── */
const 내가실행됐다 = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (내가실행됐다 && process.argv.includes('--자가시험')) {
  const 실 = []; let 통 = 0;
  const 같나 = (이름, 본, 기대) => {
    const a = JSON.stringify(본); const b = JSON.stringify(기대);
    if (a === b) 통 += 1; else 실.push(`${이름}: ${a} ≠ ${b}`);
  };

  같나('점으로 쓴 날을 읽는다', 날읽기('2026.01.08'), '2026-01-08');
  같나('한 자리 달·날을 채운다', 날읽기('2026.1.8'), '2026-01-08');
  같나('빗금도 읽는다', 날읽기('2026/01/08'), '2026-01-08');
  같나('붙임표도 읽는다', 날읽기('2026-01-08'), '2026-01-08');
  같나('⛔ 날이 없으면 null — 오늘로 안 채운다', 날읽기('갱신 안 함'), null);
  같나('⛔ 빈 글도 null', 날읽기(''), null);
  같나('긴 글 속에서도 찾는다', 날읽기('업데이트 2026.01.08 기준'), '2026-01-08');

  같나('한 달 차이를 잰다', 몇달전('2026-08-06', '2026-09-06'), 1);
  같나('한 해 차이를 잰다', 몇달전('2025-09-06', '2026-09-06'), 12);
  같나('⛔ 한쪽이 없으면 null', 몇달전(null, '2026-09-06'), null);

  /* 🔴 이 자의 심장 — 공짜와 살아 있음은 다르다 */
  같나('열두 달 안이면 살아 있다', 살아있나('2026-08-06', '2026-09-06'), true);
  같나('두 해 전이면 안 살아 있다', 살아있나('2024-09-06', '2026-09-06'), false);
  같나('⛔ 날을 못 읽으면 «죽음»이 아니라 null', 살아있나(null, '2026-09-06'), null);
  같나('경계는 열두 달이다', 살아있나('2025-09-06', '2026-09-06'), true);

  같나('무료를 가른다', 값갈래('무료'), 'free');
  같나('유료를 가른다', 값갈래('유료'), 'paid');
  같나('협의를 가른다', 값갈래('협의'), 'negotiable');
  /* ⛔ 모르는 값을 무료로 넘기면 「80%가 공짜」가 거짓이 된다 */
  같나('⛔ 모르는 값은 unknown 이다', 값갈래('무료체험'), 'unknown');
  같나('⛔ 빈 값도 unknown', 값갈래(''), 'unknown');

  같나('쉼표로 가른다', 꼴들('JSON,CSV'), ['JSON', 'CSV']);
  같나('공백을 턴다', 꼴들('JSON, CSV '), ['JSON', 'CSV']);
  같나('빈 것은 빈 목록', 꼴들(''), []);
  같나('소문자를 올린다', 꼴들('json'), ['JSON']);

  if (실.length) { console.error(`❌ 자가시험 ${실.length}건 실패\n${실.map((s) => `   · ${s}`).join('\n')}`); process.exit(1); }
  console.log(`✅ 문화 데이터 장터 자 — 자가시험 ${통}개 통과`);
  process.exit(0);
}

/* ── 실제로 잰다 ─────────────────────────────────────────────── */
if (내가실행됐다) {
  if (!fs.existsSync(자료방)) { console.error(`⛔ 자료방이 없다: ${자료방} — 못 쟀다`); process.exit(1); }
  const 날들 = fs.readdirSync(자료방).filter((f) => /^\d{4}-\d{2}-\d{2}$/.test(f)).sort();
  if (!날들.length) { console.error('⛔ 받아 둔 날이 없다 — 못 쟀다'); process.exit(1); }
  const 받은날 = 날들[날들.length - 1];
  const 길 = path.join(자료방, 받은날, 'dataset.json');
  const d = JSON.parse(fs.readFileSync(길, 'utf8'));
  const 항 = d.항목 ?? [];
  const 오늘날 = 케이에스티오늘();

  const 값수 = { free: 0, paid: 0, negotiable: 0, unknown: 0 };
  const 꼴수 = new Map(); const 꼬리표수 = new Map(); const 주기수 = new Map();
  let 날못읽음 = 0; let 살아있음 = 0; let 멈춤 = 0;
  const 가장오래된 = []; const 꼬리표없음 = [];

  for (const x of 항) {
    값수[값갈래(x.가격)] += 1;
    for (const f of 꼴들(x.유형)) 꼴수.set(f, (꼴수.get(f) ?? 0) + 1);
    const 태 = Array.isArray(x.꼬리표) ? x.꼬리표 : [];
    if (!태.length) 꼬리표없음.push(x.제목);
    for (const t of 태) 꼬리표수.set(t, (꼬리표수.get(t) ?? 0) + 1);
    const 주 = String(x.갱신주기 ?? '').trim() || '(none given)';
    주기수.set(주, (주기수.get(주) ?? 0) + 1);

    const 날 = 날읽기(x.갱신일);
    const 산다 = 살아있나(날, 오늘날);
    if (산다 === null) 날못읽음 += 1;
    else if (산다) 살아있음 += 1;
    else { 멈춤 += 1; 가장오래된.push({ title: x.제목, updated: 날, monthsAgo: 몇달전(날, 오늘날), price: 값갈래(x.가격) }); }
  }
  가장오래된.sort((a, b) => (b.monthsAgo ?? 0) - (a.monthsAgo ?? 0));

  const 줄세우기 = (m, n) => [...m].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => ({ key: k, count: v }));

  const 낼것 = {
    measuredAt: 오늘날,
    archivedOn: 받은날,
    total: 항.length,
    statedTotal: d.총건수 ?? null,
    whatThisIs: 'A count of every dataset listed on Korea\'s culture big-data platform: what it costs, '
      + 'what format it comes in, what it is about, and when it was last updated.',
    licence: 'We do not republish any dataset. Everything here is a count we made from the listing, and '
      + 'a few titles are quoted as examples only.',
    price: 값수,
    freshness: {
      windowMonths: 12,
      live: 살아있음,
      stale: 멈춤,
      dateUnreadable: 날못읽음,
      '⛔': 'A dataset whose update date we could not read is counted separately, never as stale.',
    },
    formats: 줄세우기(꼴수, 12),
    topics: 줄세우기(꼬리표수, 20),
    updateCycles: 줄세우기(주기수, 12),
    noTopicTag: 꼬리표없음.length,
    oldestExamples: 가장오래된.slice(0, 8),
    notMeasured: [
      'Whether any dataset is any good. We count what the listing says about it, not what is inside',
      'Whether a paid dataset is worth its price. No price figures are published in the listing we read',
      'Datasets that exist in Korea but are not on this platform. This is one shelf, not the whole library',
    ],
  };
  fs.writeFileSync(낼곳, JSON.stringify(낼것, null, 2) + '\n', 'utf8');

  console.log(`받은날 ${받은날} · 자료 ${항.length}건 (플랫폼이 말하는 총건수 ${d.총건수})`);
  console.log(`값   무료 ${값수.free} · 유료 ${값수.paid} · 협의 ${값수.negotiable} · 모름 ${값수.unknown}`);
  console.log(`갱신 살아있음(12달 안) ${살아있음} · 멈춤 ${멈춤} · 날 못 읽음 ${날못읽음}`);
  console.log(`꼴   ${줄세우기(꼴수, 6).map((x) => `${x.key} ${x.count}`).join(' · ')}`);
  console.log(`갈래 ${줄세우기(꼬리표수, 8).map((x) => `${x.key} ${x.count}`).join(' · ')}`);
  console.log(`주기 ${줄세우기(주기수, 6).map((x) => `${x.key} ${x.count}`).join(' · ')}`);
  console.log(`\n가장 오래 멈춘 것 셋:`);
  for (const x of 가장오래된.slice(0, 3)) console.log(`   ${x.updated} (${x.monthsAgo}달 전) ${x.title}`);
  console.log(`\n📁 적었다 — ${path.relative(뿌리, 낼곳)}`);
}
