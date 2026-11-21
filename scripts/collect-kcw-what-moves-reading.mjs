#!/usr/bin/env node
/**
 * collect-kcw-what-moves-reading.mjs — **무엇이 영어권 «읽기»를 실제로 움직이나.**
 *
 * ── 🔴 왜 만드나 (2026-09-06, 오늘 신문에서 왔다) ──────────
 * 스타뉴스 하루치에 방탄소년단 진이 «네 꼭지» 붙었다. 그중 하나가 —
 *   「구찌 캠페인 **전 세계 구글 최다 검색 인물**」
 *
 * ⛔ 구글 검색량은 우리가 못 잰다. 그 주장을 옮겨 적는 것은 우리 일이 아니다.
 * ⭐ 우리가 잴 수 있는 것은 하나다 — **그 주에 영어 위키백과 열람이 실제로 움직였나.**
 *   그리고 «같은 그룹의 다른 멤버»를 나란히 놓으면, 움직인 것이 그 사람 때문인지
 *   아니면 그룹 전체가 같이 오르내린 것인지 갈린다. 그 대조가 이 자의 심장이다.
 *
 * ── ⛔ 이 자가 지키는 것 ────────────────────────────────────
 * ⛔ **인과를 말하지 않는다.** 같은 날 다른 일이 얼마든지 있다. 우리는 「움직였나」만 잰다.
 * ⛔ **대조군 없이 한 사람만 재지 않는다.** 혼자 재면 계절 흐름을 사건으로 읽는다.
 * ⛔ 「기사가 소용없다」로 부풀리지 않는다. 잰 것은 영문 위키백과 열람 하나다.
 * ⛔ 창이 덜 찬 사건을 다 찬 것과 같이 세지 않는다 — 따로 적고 며칠 뒤 다시 잰다.
 * ⛔ 사건 날짜를 짐작으로 넣지 않는다. 출처를 사건마다 적는다.
 *
 * 쓰는 법
 *   node scripts/collect-kcw-what-moves-reading.mjs --자가시험
 *   node scripts/collect-kcw-what-moves-reading.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { 오늘 as 케이에스티오늘 } from './_kst.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const 뿌리 = path.join(__dirname, '..');
const 낼곳 = path.join(뿌리, 'src', 'data', 'wikitip-what-moves-reading.json');
const 머리 = { 'User-Agent': 'KCultureWire/1.0 (u5@klifedesign.net)' };

/**
 * 🔴 사건은 손으로 적는다. 그리고 **출처를 사건마다 적는다.**
 *   ⛔ 자동으로 긁어 오면 「무엇이 사건인가」를 자가 정하게 되고, 그때부터 우리가 못 고른다.
 *   ⭐ 대조군(`controls`)은 «같은 그룹의 다른 멤버»다. 그들이 같이 내렸으면
 *     그 주에 그 사람에게 일어난 일이 아니라 그룹 전체의 흐름이다.
 */
export const 사건들 = [
  {
    key: 'jin-gucci-primavera',
    person: 'Jin', title: 'Jin (singer)',
    kind: 'Brand campaign',
    date: '2026-08-25',
    what: 'Gucci unveiled its Primavera campaign with Jin in it. Korean coverage called him the '
      + 'most-searched person in the world that week.',
    sourceNote: 'Campaign date from Gucci Primavera coverage, 25 August 2026. The most-searched claim '
      + 'is a Korean press line we quote, not a figure we measured — Google search volume is not '
      + 'something we can count.',
    controls: [
      { person: 'RM', title: 'RM (musician)' }, { person: 'Suga', title: 'Suga' },
      { person: 'J-Hope', title: 'J-Hope' }, { person: 'Jimin', title: 'Jimin' },
      { person: 'V', title: 'V (singer)' }, { person: 'Jung Kook', title: 'Jung Kook' },
    ],
  },
  {
    key: 'jungkook-birthday-sofi',
    person: 'Jung Kook', title: 'Jung Kook',
    kind: 'Birthday and concert',
    date: '2026-09-01',
    what: 'Jung Kook turned 29 on the night BTS opened four shows at SoFi Stadium; the band sang '
      + 'happy birthday on stage.',
    sourceNote: 'Date is his birth date on record, and the SoFi Stadium show that night is in the '
      + 'tour schedule. We take the date as the reason for asking, not as something we measured.',
    controls: [
      { person: 'Jin', title: 'Jin (singer)' }, { person: 'RM', title: 'RM (musician)' },
      { person: 'Suga', title: 'Suga' }, { person: 'J-Hope', title: 'J-Hope' },
      { person: 'Jimin', title: 'Jimin' }, { person: 'V', title: 'V (singer)' },
    ],
  },
];

/** 날짜를 며칠 옮긴다 — `2026-08-25` 꼴로 주고받는다 */
export function 날더하기(날, 며칠) {
  const [y, m, d] = String(날).split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  t.setUTCDate(t.getUTCDate() + 며칠);
  return t.toISOString().slice(0, 10);
}

/** 열람수 API 가 쓰는 꼴 */
export function 붙인날(날) { return String(날).replace(/-/g, ''); }

/**
 * 🔴 [2026-09-06] **대조군이 오염될 수 있다.** 첫 판에서 실제로 그랬다 —
 * 진의 창(8/25~9/1) «안»에 정국 생일(9/1)이 들어 있어, 정국이 1.34배로 오른 것이
 * 대조군 평균을 0.91 에서 0.98 로 끌어올렸다. 그러면 진이 「동료보다 더 내렸다」로 보인다.
 * ⛔ 자기 사건이 남의 창 안에 있는 사람은 **대조군이 아니다.** 그 사람은 흔들리는 자다.
 * ✅ 그래서 «우리가 사건으로 적어 둔 사람»이 그 창 안에 걸리면 대조군에서 뺀다.
 *   ⚠ 우리가 안 적은 사건은 못 거른다 — 그 한계를 자료에 적는다. 
 */
export function 대조군쓸수있나(대조제목, 창처음, 창끝, 사건목록 = 사건들) {
  for (const e of 사건목록) {
    if (e.title !== 대조제목) continue;
    if (e.date >= 창처음 && e.date <= 창끝) return false;
  }
  return true;
}

/** 움직였나 — ⛔ 5% 안쪽은 「그대로」다. 잡음을 사건으로 읽지 않는다 */
export function 움직임(앞, 뒤, 문턱 = 0.05) {
  if (앞 === null || 뒤 === null || !Number.isFinite(앞) || !Number.isFinite(뒤) || 앞 <= 0) return null;
  const 배 = 뒤 / 앞;
  if (배 >= 1 + 문턱) return 'up';
  if (배 <= 1 - 문턱) return 'down';
  return 'flat';
}

/**
 * 대조군과 견준 «남는 움직임».
 * ⭐ 본인이 0.91배인데 동료들도 0.90배면 «남는 것이 없다» — 그 주에 다 같이 내린 것이다.
 */
export function 남는배수(본인배, 대조배) {
  if (!Number.isFinite(본인배) || !Number.isFinite(대조배) || 대조배 <= 0) return null;
  return Math.round((본인배 / 대조배) * 100) / 100;
}

/* ── 자가시험 ───────────────────────────────────────────────── */
const 내가실행됐다 = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (내가실행됐다 && process.argv.includes('--자가시험')) {
  const 실 = []; let 통 = 0;
  const 같나 = (이름, 본, 기대) => {
    const a = JSON.stringify(본); const b = JSON.stringify(기대);
    if (a === b) 통 += 1; else 실.push(`${이름}: ${a} ≠ ${b}`);
  };

  같나('날을 더한다', 날더하기('2026-08-25', 7), '2026-09-01');
  같나('날을 뺀다', 날더하기('2026-08-25', -7), '2026-08-18');
  같나('달을 넘는다', 날더하기('2026-08-31', 1), '2026-09-01');
  같나('해를 넘는다', 날더하기('2026-12-31', 1), '2027-01-01');
  같나('윤달을 안다', 날더하기('2028-02-28', 1), '2028-02-29');
  같나('붙인 꼴로 바꾼다', 붙인날('2026-08-25'), '20260825');

  같나('오르면 up', 움직임(100, 120), 'up');
  같나('내리면 down', 움직임(100, 80), 'down');
  같나('⛔ 5% 안쪽은 그대로다', 움직임(100, 103), 'flat');
  같나('⛔ 아래로도 5% 안쪽은 그대로다', 움직임(100, 97), 'flat');
  같나('딱 5% 는 움직인 것으로 본다', 움직임(100, 105), 'up');
  같나('⛔ 못 쟀으면 flat 이 아니라 null', 움직임(null, 120), null);
  같나('⛔ 앞이 0 이면 배수를 못 낸다', 움직임(0, 120), null);

  /* 🔴 이것이 이 자의 심장 — 대조군이 같이 움직였으면 남는 것이 없다 */
  같나('동료도 같이 내렸으면 남는 것이 1 이다', 남는배수(0.9, 0.9), 1);
  같나('본인만 올랐으면 1 보다 크다', 남는배수(1.5, 1.0), 1.5);
  같나('본인만 내렸으면 1 보다 작다', 남는배수(0.8, 1.0), 0.8);
  같나('⛔ 대조군을 못 쟀으면 null', 남는배수(0.9, null), null);

  같나('사건마다 출처가 적혀 있다', 사건들.every((e) => (e.sourceNote ?? '').length > 20), true);
  같나('사건마다 대조군이 있다', 사건들.every((e) => (e.controls ?? []).length >= 3), true);
  /* ⛔ 대조군에 본인이 섞이면 자기와 자기를 견주게 된다 */
  /* 🔴 첫 판에서 실제로 겪은 오염 — 진의 창 안에 정국 생일이 들어 있었다 */
  같나('⛔ 자기 사건이 창 안에 있는 사람은 대조군이 아니다',
    대조군쓸수있나('Jung Kook', '2026-08-17', '2026-09-01'), false);
  같나('창 밖이면 대조군으로 쓴다',
    대조군쓸수있나('Jung Kook', '2026-07-01', '2026-07-15'), true);
  같나('사건에 없는 사람은 언제나 대조군으로 쓴다',
    대조군쓸수있나('V (singer)', '2026-08-17', '2026-09-01'), true);
  같나('사건 날이 창 첫날이어도 뺀다',
    대조군쓸수있나('Jung Kook', '2026-09-01', '2026-09-08'), false);

  같나('⛔ 대조군에 본인이 안 들어 있다',
    사건들.every((e) => !(e.controls ?? []).some((c) => c.title === e.title)), true);

  if (실.length) { console.error(`❌ 자가시험 ${실.length}건 실패\n${실.map((s) => `   · ${s}`).join('\n')}`); process.exit(1); }
  console.log(`✅ 무엇이 읽기를 움직이나 자 — 자가시험 ${통}개 통과`);
  process.exit(0);
}

/* ── 실제로 잰다 ─────────────────────────────────────────────── */
async function 일별(제목, 처음, 끝) {
  const u = 'https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia'
    + `/all-access/user/${encodeURIComponent(제목.replace(/ /g, '_'))}/daily/${붙인날(처음)}/${붙인날(끝)}`;
  const r = await fetch(u, { headers: 머리 });
  if (!r.ok) return null;
  const j = await r.json();
  const 것 = (j.items ?? []).map((x) => ({ 날: `${x.timestamp.slice(0, 4)}-${x.timestamp.slice(4, 6)}-${x.timestamp.slice(6, 8)}`, 수: x.views }));
  return 것.length ? 것 : null;
}

const 평 = (것) => (것.length ? Math.round(것.reduce((s, x) => s + x.수, 0) / 것.length) : null);

async function 한사람(제목, 사건날, 창 = 7) {
  const 처음 = 날더하기(사건날, -창 - 1);
  const 끝 = 날더하기(사건날, 창);
  const 것 = await 일별(제목, 처음, 끝);
  if (!것) return null;
  const 앞 = 것.filter((x) => x.날 >= 처음 && x.날 <= 날더하기(사건날, -1));
  const 뒤 = 것.filter((x) => x.날 >= 사건날 && x.날 <= 끝);
  const 그날 = 것.find((x) => x.날 === 사건날)?.수 ?? null;
  return {
    before: 평(앞), after: 평(뒤), beforeDays: 앞.length, afterDays: 뒤.length,
    onTheDay: 그날, peak: 것.reduce((a, x) => (x.수 > (a?.수 ?? -1) ? x : a), null),
  };
}

if (내가실행됐다) {
  const 창 = 7;
  const 낸것 = [];
  for (const e of 사건들) {
    const 본인 = await 한사람(e.title, e.date, 창);
    const 창처음 = 날더하기(e.date, -창 - 1);
    const 창끝 = 날더하기(e.date, 창);
    const 대조 = []; const 뺀대조 = [];
    for (const c of e.controls) {
      /* 🔴 자기 사건이 이 창 안에 있는 사람은 대조군이 아니다 — 흔들리는 자다 */
      if (!대조군쓸수있나(c.title, 창처음, 창끝)) {
        const 걸린것 = 사건들.find((x) => x.title === c.title && x.date >= 창처음 && x.date <= 창끝);
        뺀대조.push({ ...c, why: `their own recorded event (${걸린것?.kind}, ${걸린것?.date}) falls inside this window` });
        continue;
      }
      const v = await 한사람(c.title, e.date, 창);
      if (v && v.before && v.after) 대조.push({ ...c, ...v, ratio: Math.round((v.after / v.before) * 100) / 100 });
    }
    const 본인배 = 본인 && 본인.before ? Math.round((본인.after / 본인.before) * 100) / 100 : null;
    const 대조배 = 대조.length
      ? Math.round((대조.reduce((s, x) => s + x.ratio, 0) / 대조.length) * 100) / 100 : null;
    const 다찼나 = !!본인 && 본인.afterDays >= 창 + 1;
    낸것.push({
      ...e,
      windowDays: 창,
      windowComplete: 다찼나,
      before: 본인?.before ?? null, after: 본인?.after ?? null,
      onTheDay: 본인?.onTheDay ?? null,
      peakDay: 본인?.peak?.날 ?? null, peakViews: 본인?.peak?.수 ?? null,
      ratio: 본인배,
      controlRatio: 대조배,
      netRatio: 남는배수(본인배, 대조배),
      moved: 움직임(본인?.before ?? null, 본인?.after ?? null),
      controls: 대조,
      controlsDropped: 뺀대조,
    });
    console.log(`■ ${e.person} — ${e.kind} (${e.date})`);
    console.log(`   본인 ${본인?.before} → ${본인?.after}  ${본인배}배 · 그날 ${본인?.onTheDay}`
      + ` · 최고 ${본인?.peak?.날} ${본인?.peak?.수}`);
    console.log(`   동료 ${대조.length}명 평균 ${대조배}배  ⇒ 남는 움직임 ${남는배수(본인배, 대조배)}배`);
    console.log(`   ${대조.map((c) => `${c.person} ${c.ratio}`).join(' · ')}`);
    for (const x of 뺀대조) console.log(`   ⛔ 대조군에서 뺌 — ${x.person}: ${x.why}`);
    console.log('');
  }

  const 낼것 = {
    measuredAt: 케이에스티오늘(),
    windowDays: 창,
    whatThisIs: 'For a dated event, English Wikipedia views of the person in the seven days from the '
      + 'event against the seven days before, with the other members of their group measured the same '
      + 'way as a control.',
    whyControls: 'Measuring one person alone turns an ordinary seasonal drift into an event. If the '
      + 'whole group moved together, nothing happened to that one person.',
    notMeasured: [
      'Google search volume. We cannot count it, so we never repeat a most-searched claim as though we had',
      'Cause. Other things happen on the same day, and a rise here is not proof the event caused it',
      'Anything outside English Wikipedia. This is one well, and a shallow one',
    ],
    events: 낸것,
  };
  fs.writeFileSync(낼곳, JSON.stringify(낼것, null, 2) + '\n', 'utf8');
  console.log(`📁 적었다 — ${path.relative(뿌리, 낼곳)}`);
}
