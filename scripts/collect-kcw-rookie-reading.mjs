#!/usr/bin/env node
/**
 * collect-kcw-rookie-reading.mjs — **데뷔한 지 얼마 안 된 그룹을 영어권이 얼마나 읽나.**
 *
 * ── 왜 만드나 (2026-09-05) ──────────────────────────────────
 * 오늘 r/kpop 에 「CORTIS 의 FaSHioN 이 첫 1억 뷰 뮤비가 됐다」가 올라왔다(5시간 전).
 * 그 수는 **유튜브 것이고 우리 것이 아니다.** 우리가 쥔 축은 «영문 위키백과 열람수» 하나다.
 *
 * ⭐ 그래서 이 자는 남의 수를 옮겨 적지 않는다. **우리 축으로 다시 묻는다** —
 *   「그 이정표가 «영어권 독자»에게도 보이는가. 읽는 사람이 실제로 늘었는가.」
 *
 * ⛔ **오늘 것은 못 잰다.** 위키미디어 열람수는 하루쯤 늦게 채워진다.
 *   그러니 오늘 지면은 「재 보니 이랬다」가 아니라 **「지금까지 이랬고, 그날을 표시해 둔다」**다.
 *   못 잰 것을 잰 척하지 않는다 — 그것이 우리 강령 셋째다.
 *
 * 우물: 위키미디어 Pageviews API (열쇠 필요 없음 · 소급이 된다)
 *   https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/…
 *
 * 쓰는 법
 *   node scripts/collect-kcw-rookie-reading.mjs --자가시험
 *   node scripts/collect-kcw-rookie-reading.mjs --적는다
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const 뿌리 = path.join(__dirname, '..');
const 낼곳 = path.join(뿌리, 'src', 'data', 'wikitip-rookie-reading.json');

/**
 * 잴 대상 — **2025년에 데뷔한 그룹**과, 견줄 자리에 둘 «먼저 온 사람» 둘.
 * ⚠ 이 목록은 「누가 대단한가」가 아니라 **「같은 시기에 시작한 사람들」**이다.
 *   그래야 「데뷔 뒤 며칠째」로 줄을 세울 수 있다.
 */
export const 잴것 = [
  { title: 'Cortis',        label: 'Cortis',        debut: '2025-08-18', note: 'BigHit Music' },
  { title: 'Hearts2Hearts', label: 'Hearts2Hearts', debut: '2025-02-24', note: 'SM Entertainment' },
  { title: 'KickFlip',      label: 'KickFlip',      debut: '2025-01-20', note: 'JYP Entertainment' },
  { title: 'Idid_(group)',  label: 'Idid',          debut: '2025-09-15', note: 'Starship Entertainment' },
  { title: 'AHOF',          label: 'AHOF',          debut: '2025-07-01', note: 'F&F Entertainment' },
];
/* 🔴 [2026-09-05] 첫 판에서 이 목록의 «셋»이 틀렸다. 남기는 까닭은 다음 사람이 같은 데 빠지기 때문이다.
   · `Kickflip_(band)` → 404, `Kick_Flip` → **JYP Entertainment 회사 문서**로 넘어갔다.
     회사 문서의 열람수를 그룹 것으로 읽을 뻔했다. 맞는 이름은 `KickFlip` 이다
   · AHOF 데뷔를 2025-04-21 로 적었는데 실제는 **2025-07-01** 이다
   · Idid 데뷔를 2025-03-19 로 적었는데 실제는 **2025-09-15** 다
   ⇒ 데뷔날이 틀리면 「데뷔 뒤 며칠째」가 통째로 어긋나고, 그 위에 세운 문장이 다 틀린다.
   ✅ 그래서 아래 `같은것인가()` 로 **문서가 정말 그 그룹인지** 기계가 보고 넘어간다. */

/** 견주는 자리 — 이미 자리 잡은 그룹. ⛔ 「이만큼 되라」는 뜻이 아니라 «자의 눈금»이다 */
export const 눈금 = [
  { title: 'Tomorrow_X_Together', label: 'TXT',  debut: '2019-03-04', note: 'BigHit Music' },
  { title: 'Enhypen',             label: 'ENHYPEN', debut: '2020-11-30', note: 'BeLift Lab' },
];

const 하루 = 86400e3;

/** YYYYMMDD — ⛔ toISOString() 을 쓰지 않는다. 이 기계는 이미 KST 다 */
export function 여덟자리(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

/** 데뷔로부터 며칠째인가 — 데뷔한 날이 1일째 */
export function 데뷔뒤며칠(데뷔, 날) {
  const a = new Date(`${데뷔}T00:00:00`);
  const b = new Date(`${날.slice(0, 4)}-${날.slice(4, 6)}-${날.slice(6, 8)}T00:00:00`);
  return Math.round((b - a) / 하루) + 1;
}

/**
 * 열람수 줄에서 «중간값»을 낸다.
 * ⛔ 평균이 아니라 중간값이다 — 이정표가 있는 날 하루가 평균을 통째로 밀어 버린다.
 *   우리 강령 둘째 「」가 여기서 하는 일이 그것이다.
 */
export function 중간값(수들) {
  const s = [...수들].filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (!s.length) return null;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

/** 가장 높은 날 — 「언제 사람들이 몰렸나」를 이정표와 맞대 보려고 남긴다 */
export function 가장높은날(줄들) {
  let 최 = null;
  for (const r of 줄들) if (!최 || r.views > 최.views) 최 = r;
  return 최;
}

/**
 * 마지막 며칠이 «아직 안 채워졌는지» 가른다.
 * ⚠ 위키미디어는 하루쯤 늦다. 끝의 빈 날을 0 으로 읽으면 「독자가 사라졌다」가 된다.
 *   ⛔  — 아예 «없는 날»로 둔다.
 */
export function 아직안찬날(줄들, 오늘여덟자리) {
  const 있는날 = new Set(줄들.map((r) => r.date));
  const 없는날 = [];
  const 끝 = new Date(`${오늘여덟자리.slice(0, 4)}-${오늘여덟자리.slice(4, 6)}-${오늘여덟자리.slice(6, 8)}T00:00:00`);
  for (let i = 0; i < 3; i += 1) {
    const d = new Date(끝.getTime() - i * 하루);
    const s = 여덟자리(d);
    if (!있는날.has(s)) 없는날.push(s);
  }
  return 없는날.sort();
}

/**
 * 그 문서가 «정말 그 그룹»인가 — 회사·앨범 문서로 넘어간 것을 잡는다.
 * ⛔ 이름이 비슷하면 위키백과가 조용히 다른 문서로 넘긴다. 조용한 것이 제일 나쁘다.
 */
export function 같은것인가(요약) {
  const 설명 = String(요약?.description ?? '').toLowerCase();
  if (!설명) return { 맞다: false, 까닭: '설명이 비었다' };
  const 그룹인가 = /(band|group|duo|boy|girl)/.test(설명);
  if (!그룹인가) return { 맞다: false, 까닭: `그룹 문서가 아니다 — 「${요약.description}」` };
  return { 맞다: true, 까닭: 요약.description };
}

async function 요약받기(title) {
  const r = await fetch('https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(title),
    { headers: { 'User-Agent': 'KCultureWire/1.0 (u5@klifedesign.net)' } });
  if (!r.ok) return null;
  return r.json();
}

async function 받기(title, 처음, 끝) {
  const u = 'https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user/'
    + encodeURIComponent(title) + `/daily/${처음}/${끝}`;
  const r = await fetch(u, { headers: { 'User-Agent': 'KCultureWire/1.0 (u5@klifedesign.net)' } });
  if (r.status === 404) return { 없음: true, 줄: [] };
  if (!r.ok) throw new Error(`${title} — HTTP ${r.status}`);
  const j = await r.json();
  return { 없음: false, 줄: (j.items ?? []).map((x) => ({ date: String(x.timestamp).slice(0, 8), views: x.views })) };
}

/* ── 자가시험 ───────────────────────────────────────────────── */
const 내가실행됐다 = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (내가실행됐다 && process.argv.includes('--자가시험')) {
  const 실 = []; let 통 = 0;
  const 같나 = (이름, 본, 기대) => {
    const a = JSON.stringify(본); const b = JSON.stringify(기대);
    if (a === b) 통 += 1; else 실.push(`${이름}: ${a} ≠ ${b}`);
  };

  같나('여덟자리 — 한 자리 달·날을 채운다', 여덟자리(new Date('2026-01-05T13:00:00')), '20260105');
  같나('여덟자리 — 자정 직후에도 그날이다', 여덟자리(new Date('2026-09-05T00:10:00')), '20260905');

  같나('데뷔한 날이 1일째다', 데뷔뒤며칠('2025-08-18', '20250818'), 1);
  같나('그다음 날이 2일째다', 데뷔뒤며칠('2025-08-18', '20250819'), 2);
  같나('해를 넘겨도 센다', 데뷔뒤며칠('2025-08-18', '20260818'), 366);

  같나('중간값 — 홀수', 중간값([1, 100, 3]), 3);
  같나('중간값 — 짝수는 가운데 둘의 평균', 중간값([2, 4, 6, 8]), 5);
  같나('중간값 — 빈 것은 null 이지 0 이 아니다', 중간값([]), null);
  같나('중간값 — 숫자가 아닌 것은 뺀다', 중간값([1, null, 3, undefined]), 2);
  /* 🔴 이정표 하루가 평균을 미는 것을 시험으로 굳힌다 */
  const 이정표낀 = [10, 12, 11, 9, 50000];
  같나('중간값은 이정표 하루에 안 밀린다', 중간값(이정표낀), 11);
  같나('평균이었으면 크게 밀렸을 것이다', Math.round(이정표낀.reduce((a, b) => a + b, 0) / 5) > 100, true);

  같나('가장 높은 날을 찾는다',
    가장높은날([{ date: '20260101', views: 5 }, { date: '20260102', views: 9 }]).date, '20260102');
  같나('빈 줄이면 null 이다', 가장높은날([]), null);

  같나('끝의 빈 날을 집는다',
    아직안찬날([{ date: '20260903', views: 1 }], '20260905'), ['20260904', '20260905']);
  같나('다 차 있으면 빈 날이 없다',
    아직안찬날([{ date: '20260903', views: 1 }, { date: '20260904', views: 1 }, { date: '20260905', views: 1 }], '20260905'), []);

  /* 🔴 첫 판에서 실제로 당한 것 — 회사 문서로 넘어간 것을 잡는다 */
  같나('회사 문서는 그룹이 아니다',
    같은것인가({ description: 'South Korean entertainment conglomerate company' }).맞다, false);
  같나('보이그룹은 맞다', 같은것인가({ description: 'South Korean boy band' }).맞다, true);
  같나('걸그룹도 맞다', 같은것인가({ description: 'South Korean girl group' }).맞다, true);
  같나('설명이 없으면 안 맞다로 둔다', 같은것인가({}).맞다, false);

  같나('잴 것에 Cortis 가 있다', 잴것.some((x) => x.title === 'Cortis'), true);
  /* 🔴 첫 판에서 셋을 틀렸다 — 고친 값을 시험으로 굳힌다 */
  같나('KickFlip 이름은 대문자 F 다', 잴것.find((x) => x.label === 'KickFlip').title, 'KickFlip');
  같나('AHOF 데뷔는 2025-07-01 이다', 잴것.find((x) => x.label === 'AHOF').debut, '2025-07-01');
  같나('Idid 데뷔는 2025-09-15 다', 잴것.find((x) => x.label === 'Idid').debut, '2025-09-15');
  같나('데뷔날이 모두 적혀 있다', 잴것.every((x) => /^\d{4}-\d{2}-\d{2}$/.test(x.debut)), true);
  같나('눈금에도 데뷔날이 있다', 눈금.every((x) => /^\d{4}-\d{2}-\d{2}$/.test(x.debut)), true);

  if (실.length) { console.error(`❌ 자가시험 ${실.length}건 실패\n${실.map((s) => `   · ${s}`).join('\n')}`); process.exit(1); }
  console.log(`✅ 신인 그룹 열람수 자 — 자가시험 ${통}개 통과`);
  process.exit(0);
}

/* ── 실제로 받는다 ───────────────────────────────────────────── */
if (내가실행됐다) {
  const 오늘 = new Date();
  const 끝 = 여덟자리(오늘);
  const 처음 = '20250101';

  const 모두 = [];
  for (const 것 of [...잴것.map((x) => ({ ...x, 갈래: '2025년 데뷔' })), ...눈금.map((x) => ({ ...x, 갈래: '눈금' }))]) {
    /* 🔴 먼저 «그 문서가 그 그룹인지» 본다 — 회사 문서를 그룹 것으로 읽지 않으려고 */
    const 요약 = await 요약받기(것.title);
    if (!요약) { console.error(`⬜ ${것.label} — 그 이름의 문서가 없다 (${것.title}). `); continue; }
    const 같나 = 같은것인가(요약);
    if (!같나.맞다) { console.error(`🔴 ${것.label} — ${것.title} 이 다른 문서로 갔다: ${같나.까닭}. 안 센다`); continue; }
    것.wikiTitle = 요약.title;
    것.wikiDesc = 요약.description;

    let r;
    try { r = await 받기(것.title, 처음, 끝); } catch (e) { console.error(`⬜ ${것.label} — 못 받았다: ${e.message}`); continue; }
    if (r.없음 || !r.줄.length) { console.error(`⬜ ${것.label} — 그 이름의 문서가 없거나 줄이 비었다. `); continue; }

    const 데뷔뒤 = r.줄.filter((x) => 데뷔뒤며칠(것.debut, x.date) >= 1);
    const 첫90 = 데뷔뒤.filter((x) => 데뷔뒤며칠(것.debut, x.date) <= 90);
    const 최근30 = r.줄.slice(-30);
    const 최 = 가장높은날(데뷔뒤);

    모두.push({
      ...것,
      days: 데뷔뒤.length,
      medianFirst90: 중간값(첫90.map((x) => x.views)),
      medianLast30: 중간값(최근30.map((x) => x.views)),
      peak: 최 ? { date: 최.date, views: 최.views, dayAfterDebut: 데뷔뒤며칠(것.debut, 최.date) } : null,
      lastDate: r.줄.length ? r.줄[r.줄.length - 1].date : null,
      series: 데뷔뒤.map((x) => ({ d: 데뷔뒤며칠(것.debut, x.date), date: x.date, v: x.views })),
    });
    console.log(`✅ ${것.label} — ${데뷔뒤.length}일치 · 첫90일 중간값 ${중간값(첫90.map((x) => x.views))}`);
  }

  const cortis = 모두.find((x) => x.title === 'Cortis');
  const 안찬날 = cortis ? 아직안찬날(cortis.series.map((x) => ({ date: x.date })), 끝) : [];

  /**
   * 🔴 **열쇠 이름을 영어로 둔다.** 이 파일은 영문 지면이 그대로 읽는 자료다.
   *   ⛔ 처음엔 우리말 열쇠(`잰때`·`우물`·`못잰것`)로 적었다가 두 가지에 걸렸다 —
   *     ① 값이 우리말이면 영문 지면에 한국어가 샌다
   *     ② `check-data-keys-shown` 이 「지면이 이 열쇠를 안 보여 준다」로 선다
   *   ⭐ 자료가 지면으로 흐르면 그 자료는 이미 지면이다. 그러니 손님 말로 적는다.
   */
  const 낼것 = {
    measuredAt: 오늘.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
    source: 'Wikimedia Pageviews API — en.wikipedia, all-access, user agents only (bots excluded)',
    measures: 'Daily English Wikipedia pageviews, counted from each group\'s debut date',
    daysNotFilled: 안찬날,
    /**
     * 🔴 **이 줄들은 지면에 그대로 나간다 — 그래서 영어로 적는다.**
     *   처음에 우리말로 적었다가 알아챘다. 우리 손님은 영어권이고, 화면에 한국어를 안 낸다.
     *   ⛔ 「자료 파일이니 우리말이어도 된다」가 아니다. 자료가 지면으로 흐르는 순간 그것은 지면이다.
     *     `/surge-floor` 에 자료 파일의 우리말 메모가 그대로 나간 적이 실제로 있다.
     */
    notMeasured: [
      'YouTube view counts. We did not count them and do not restate other people\'s figures as ours',
      'Popularity inside Korea. English Wikipedia counts English-language readers only',
      'Today and yesterday. Wikimedia fills these in about a day late, so recent days are absent, not zero',
    ],
    rows: 모두,
  };
  fs.writeFileSync(낼곳, JSON.stringify(낼것, null, 2) + '\n', 'utf8');
  console.log(`\n📁 적었다 — ${path.relative(뿌리, 낼곳)} (${모두.length}팀)`);
  if (안찬날.length) console.log(`⬜ 아직 안 찬 날 ${안찬날.join(', ')} — 0 으로 채우지 않았다`);
}
