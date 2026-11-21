/**
 * **한국 음악 팀이 «어느 달»에 가장 많이 읽히나** — `src/data/kcw-peak-month.json` 을 짓는다.
 *
 * ── 무엇을 세나 ───────────────────────────────────────────────────────
 * `kcw-group-afterlife.json` 에 774팀의 «봉우리달»(영문 위키에서 가장 많이 읽힌 달)이 있다.
 * 그 달을 달력의 1~12월로 모아 센다. **새로 우물을 길어 오지 않는다** — 있는 자료를 다시 센다.
 *
 * ── 🔴 이 자가 반드시 하는 보정 하나 ─────────────────────────────────
 * ⛔ 달마다 «날수»가 다르다. 2월은 28일이라 열람이 덜 쌓이고, 그러면 그 달이 «봉우리»가
 *   될 확률도 그만큼 낮다. 그냥 12로 나눈 기대치에 대면 **2월이 저절로 낮게 나온다.**
 * ✅ 그래서 창(2015-07 ~ 2026-08) 안에 «실제로 든 날수»로 기대치를 만든다.
 *   보정 전 2월은 기대치의 59%, 보정 뒤 64% 다 — 낮은 것은 여전하지만 그 5%p 는 달력 탓이었다.
 *   ⭐ 7월도 그렇다. 보정 전 135% 였는데 창에 372일이 들어 있어 보정하면 123% 다.
 *
 * ── ⛔ 이 자가 하지 않는 것 ──────────────────────────────────────────
 * ⛔ 「1월에 컴백하면 잘 된다」로 읽히게 쓰지 않는다. 우리가 잰 것은 «읽힌 달»이고,
 *   컴백 달은 우리 자료에 없다. 둘을 이어 붙이면 그건 우리가 안 잰 이야기다.
 * ⛔ 「봉우리 열람」을 인기로 바꿔 쓰지 않는다. 찾아본 것이지 들은 것이 아니다.
 * ⛔ 못 잰 팀을  — 몇 팀을 못 쟀는지 자료에 적는다.
 *
 * 쓰는 법
 *   node scripts/build-kcw-peak-month.mjs --자가시험
 *   node scripts/build-kcw-peak-month.mjs --낸다
 */
import fs from 'node:fs';
import path from 'node:path';
import { 오늘 } from './_kst.mjs';

const 뿌리 = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const 들어올곳 = path.join(뿌리, 'src', 'data', 'kcw-group-afterlife.json');
const 낼곳 = path.join(뿌리, 'src', 'data', 'kcw-peak-month.json');

export const 달이름 = ['', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

/** `2026-08` → 8. ⛔ 꼴이 아니면 null 이다 — 0 이 아니다 */
export function 달뽑기(달글) {
  const m = String(달글 ?? '').match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  const n = Number(m[2]);
  return n >= 1 && n <= 12 ? n : null;
}

/**
 * 창 안에 «실제로 든» 날수를 달마다 센다.
 *
 * 🔴 이것이 이 자의 핵심이다. 2월은 28일이고 7월은 31일인데, 창이 2015-07 에 시작해
 *   2026-08 에 끝나므로 7·8월은 열두 번 들어오고 나머지는 열한 번 들어온다.
 *   그 둘을 같이 보정해야 「어느 달이 진짜 많은가」를 말할 수 있다.
 */
export function 창안날수(첫달, 끝달) {
  const 날수 = Array(13).fill(0);
  const a = String(첫달 ?? ''); const b = String(끝달 ?? '');
  if (!/^\d{4}-\d{2}$/.test(a) || !/^\d{4}-\d{2}$/.test(b) || a > b) return 날수;
  const [y1, m1] = a.split('-').map(Number);
  const [y2, m2] = b.split('-').map(Number);
  for (let y = y1; y <= y2; y++) {
    for (let m = 1; m <= 12; m++) {
      if (y === y1 && m < m1) continue;
      if (y === y2 && m > m2) continue;
      날수[m] += new Date(y, m, 0).getDate();   /* 그 해 그 달의 마지막 날 */
    }
  }
  return 날수;
}

/**
 * 달별로 센 것과 «날수로 본 기대치»를 함께 낸다.
 * ⛔ 표준편차(z)는 팀이 서른 미만이면 내지 않는다 — 작은 수에 z 를 붙이면 없는 확신이 생긴다.
 */
export function 달별셈(팀들, 첫달, 끝달) {
  const 목 = Array.isArray(팀들) ? 팀들 : [];
  const 잰것 = 목.filter((t) => 달뽑기(t?.봉우리달) !== null);
  const 셈 = Array(13).fill(0);
  for (const t of 잰것) 셈[달뽑기(t.봉우리달)] += 1;
  const 날수 = 창안날수(첫달, 끝달);
  const 날합 = 날수.slice(1).reduce((a, b) => a + b, 0);
  const 합 = 잰것.length;
  const 줄 = [];
  for (let m = 1; m <= 12; m++) {
    const 기대 = 날합 ? (합 * 날수[m]) / 날합 : 0;
    줄.push({
      달: m,
      이름: 달이름[m],
      팀수: 셈[m],
      창안날수: 날수[m],
      기대치: 기대 ? +기대.toFixed(1) : 0,
      기대대비몫: 기대 ? +((셈[m] / 기대) * 100).toFixed(0) : null,
      /* ⛔ 작은 표본에 z 를 붙이지 않는다 */
      표준편차: 합 >= 30 && 기대 > 0 ? +((셈[m] - 기대) / Math.sqrt(기대)).toFixed(2) : null,
    });
  }
  return { 잰팀: 합, 못잰팀: 목.length - 합, 줄 };
}

/* ── 자가시험 ─────────────────────────────────────────────────────────── */
export function 자가시험() {
  let 통 = 0; let 흠 = 0;
  const 봐 = (이름, 참) => { if (참) { 통++; console.log(`  ✅ ${이름}`); } else { 흠++; console.log(`  🔴 ${이름}`); } };

  봐('달을 뽑는다', 달뽑기('2026-08') === 8);
  봐('한 자리 달도 읽는다', 달뽑기('2026-01') === 1);
  봐('⛔ 꼴이 아니면 null 이다 — 0 이 아니다',
    달뽑기('2026-8') === null && 달뽑기('') === null && 달뽑기(null) === null);
  봐('⛔ 13월은 없다', 달뽑기('2026-13') === null);

  const 날 = 창안날수('2026-01', '2026-12');
  봐('한 해면 1월은 31일', 날[1] === 31);
  봐('🔴 2월은 28일이다 — 이 보정이 이 자의 핵심이다', 날[2] === 28);
  봐('윤년 2월은 29일', 창안날수('2024-01', '2024-12')[2] === 29);
  봐('두 해면 1월이 62일', 창안날수('2025-01', '2026-12')[1] === 62);
  봐('⭐ 창이 7월에 시작하면 앞달은 한 번 덜 들어온다',
    창안날수('2025-07', '2026-08')[7] === 62 && 창안날수('2025-07', '2026-08')[1] === 31);
  봐('⛔ 거꾸로 준 창은 빈 것', 창안날수('2026-12', '2026-01').every((x) => x === 0));
  봐('⛔ 못 읽는 창도 빈 것', 창안날수('아무말', '2026-01').every((x) => x === 0));

  const 팀 = [
    ...Array.from({ length: 40 }, () => ({ 봉우리달: '2026-01' })),
    ...Array.from({ length: 10 }, () => ({ 봉우리달: '2026-02' })),
    { 봉우리달: null },
  ];
  const r = 달별셈(팀, '2026-01', '2026-12');
  봐('봉우리달을 아는 팀만 센다', r.잰팀 === 50);
  봐('⛔ 못 잰 팀을 0 으로 안 채운다 — 따로 센다', r.못잰팀 === 1);
  봐('1월을 40으로 센다', r.줄[0].팀수 === 40);
  봐('2월을 10으로 센다', r.줄[1].팀수 === 10);
  봐('🔴 2월 기대치가 1월보다 «낮다» (28일 대 31일)', r.줄[1].기대치 < r.줄[0].기대치);
  봐('기대치 합이 잰 팀 수와 맞는다',
    Math.abs(r.줄.reduce((a, b) => a + b.기대치, 0) - 50) < 0.5);
  봐('표준편차를 낸다 (팀이 서른 넘음)', typeof r.줄[0].표준편차 === 'number');
  봐('⛔ 팀이 서른 미만이면 표준편차를 안 낸다',
    달별셈([{ 봉우리달: '2026-01' }], '2026-01', '2026-12').줄[0].표준편차 === null);
  봐('⛔ 빈 목록에도 안 터진다', 달별셈([], '2026-01', '2026-12').잰팀 === 0);
  봐('⛔ 목록이 아니어도 안 터진다', 달별셈(null, '2026-01', '2026-12').잰팀 === 0);
  봐('열두 달을 다 낸다', r.줄.length === 12);
  봐('달 이름을 함께 낸다', r.줄[0].이름 === 'January' && r.줄[11].이름 === 'December');

  console.log(`\n봉우리 달을 세는 자 — 자가시험 ${통}가지 통과 · ${흠}가지 실패`);
  if (흠) process.exit(1);
  return 통;
}

/* ⛔ 모르는 깃발을 조용히 버리지 않는다 — 「시험」이 「실행」이 되면 자료가 덮인다 */
const 아는깃발 = ['--자가시험', '--시험만', '--selftest', '--낸다'];
const 모르는깃발 = process.argv.slice(2)
  .filter((a) => a.startsWith('--') && !아는깃발.some((k) => a === k || a.startsWith(`${k}=`)));
if (모르는깃발.length) {
  console.error(`⛔ 모르는 깃발 — ${모르는깃발.join(' ')}`);
  console.error(`   아는 것은 ${아는깃발.join(' · ')} 뿐이다.`);
  process.exit(1);
}

const 나인가 = process.argv[1]
  && path.resolve(process.argv[1]).replace(/\\/g, '/').endsWith('build-kcw-peak-month.mjs');

if (나인가 && ['--자가시험', '--시험만', '--selftest'].some((k) => process.argv.includes(k))) {
  자가시험();
} else if (나인가 && process.argv.includes('--낸다')) {
  자가시험();
  const 안 = JSON.parse(fs.readFileSync(들어올곳, 'utf8'));
  const 창 = String(안.창 ?? '');
  const m = 창.match(/(\d{4}-\d{2})\s*~\s*(\d{4}-\d{2})/);
  if (!m) { console.error(`🔴 창을 못 읽었다 — 「${창}」`); process.exit(1); }
  const [, 첫달, 끝달] = m;

  const 전체 = 달별셈(안.팀, 첫달, 끝달);
  /* ⭐ 큰 팀만 따로 — 작은 팀 쪽에서만 나는 무늬인지 갈라 보려고 */
  const 큰팀 = (안.팀 ?? []).filter((t) => Number(t.봉우리열람) >= 50000);
  const 큰 = 달별셈(큰팀, 첫달, 끝달);

  const 낼것 = {
    잰때: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      + ', ' + new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }) + ' KST',
    지은날: 오늘(),
    창: `${첫달} ~ ${끝달}`,
    우물: 'Wikimedia Pageviews REST API (English Wikipedia, all-access, agent=user, monthly), '
      + 'acts from Wikidata SPARQL. Re-counted from kcw-group-afterlife.json — no new collection.',
    이것이무엇인가: 'For each Korean act we know its single best-read month on English Wikipedia. '
      + 'This counts those months by calendar month, against an expectation built from the '
      + 'actual number of days each calendar month contributes to the window.',
    이것이아닌것: [
      'This is not about when comebacks happen. We measured the month an act was read most, and we do not hold release dates.',
      'This is looking something up, not listening to it.',
      'Acts whose best month we could not determine are counted separately, never filled in as zero.',
      'A calendar month with more days in the window collects more reads, so it is more likely to hold an act’s peak. The expectation below corrects for that.',
    ],
    전체,
    큰팀: { 문턱: 50000, ...큰 },
  };

  /* 🔴 내보내기 전에 지면이 읽을 칸을 세운다 */
  for (const k of ['전체', '큰팀', '창', '우물']) {
    if (낼것[k] === undefined || 낼것[k] === null) {
      console.error(`🔴 지면이 읽는 칸이 빠졌다 — ${k}. 있는 자료를 덮지 않고 멈춘다.`);
      process.exit(1);
    }
  }
  if (!낼것.전체.줄?.length) { console.error('🔴 달별 줄이 비었다. 멈춘다.'); process.exit(1); }

  fs.writeFileSync(낼곳, `${JSON.stringify(낼것, null, 1)}\n`, 'utf8');
  console.log(`\n✅ 냈다 — ${path.relative(뿌리, 낼곳)}`);
  console.log(`   잰 팀 ${전체.잰팀} · 못 잰 팀 ${전체.못잰팀} · 창 ${첫달}~${끝달}`);
  const 높 = [...전체.줄].sort((a, b) => (b.표준편차 ?? 0) - (a.표준편차 ?? 0));
  console.log(`   가장 높은 달 ${높[0].이름} ${높[0].팀수}팀 (기대치의 ${높[0].기대대비몫}% · z ${높[0].표준편차})`);
  console.log(`   가장 낮은 달 ${높[11].이름} ${높[11].팀수}팀 (기대치의 ${높[11].기대대비몫}% · z ${높[11].표준편차})`);
  console.log('⛔ 「그 달에 컴백하면 잘 된다」로 읽지 않는다 — 컴백 달은 우리 자료에 없다.');
} else if (나인가) {
  console.log('쓰는 법 — node scripts/build-kcw-peak-month.mjs --자가시험 | --낸다');
}
