/**
 * measure-visitors-daily.mjs — 방문자를 «날마다» 재서 쌓는다 (5번 · 2026-09-10)
 *
 * 🔴 왜 만들었나 — 사장님 지시 (원문)
 *   > 「순방문자(28일)>>>>1일 평균말고 **당일 순방문자를 추가해라**, 보고할때」
 *   > 🔴 「**순방문자 28일이 관심이 없다. 하루 평균, 당일 방문자가 궁금할 뿐**」
 *   > ⭐ 「**그래야 내가 추세를 볼 수 있다**」
 *
 *   내가 22시 방송에 28일 총합만 냈다. 사장님이 보시려는 것은 «추세»였다.
 *   ⇒ 28일 총합을 보고의 머리에 세우지 않는다. **당일 · 어제 · 이레 흐름 · 하루 평균**을 낸다.
 *
 * ⚠ 앞선 지시와 겹치는 자리 — 사장님(2026-08-28) 「사람이 소숫점인게 이해가 안돼」
 *   그때 내가 28일치를 28로 나눠 「하루평균 0.46명」이라 적어 걸렸다.
 *   ⇒ 두 말씀을 함께 지킨다: **당일은 «센 정수»로, 평균은 «명꼴»(비율)로** 적는다.
 *     하루 한 명이 안 되는 자리는 「N일에 M명」으로 센 수 그대로 적는다(ga4-report.하루꼴).
 *
 * ⚠ 그리고 이것은 «쌓아야» 뜻이 있다. 하루치를 재고 버리면 다음 날 견줄 것이 없다.
 *   ⇒ 잰 것을 src/data/visitors-daily.tsv 에 «합쳐» 적는다. 같은 날은 새 값으로 갈아 끼운다.
 *
 * ⛔ 총 순방문자를 날짜별로 더하지 않는다 — 같은 사람이 이틀 오면 두 번 세어진다.
 *   그래서 이 자는 «28일 총 순방문자»를 아예 내지 않는다. 낼 수 있는 것은
 *   ① 그날의 순방문자 ② 날마다의 평균 뿐이다. 그 둘만 말한다.
 *
 * 쓰는 법
 *   node scripts/measure-visitors-daily.mjs --자가시험
 *   node scripts/measure-visitors-daily.mjs --잰다
 *   node scripts/measure-visitors-daily.mjs --잰다 --적는다
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { 유닛, 손님아님, 토큰받기, 무엇이막혔나, 우리속성, 하루꼴 } from './ga4-report.mjs';
import { 손님갈래, 손님인가 } from './measure-real-readers.mjs';

const 여기 = path.dirname(fileURLToPath(import.meta.url));
const 뿌리 = path.join(여기, '..');
export const 쌓을곳 = path.join(뿌리, 'src', 'data', 'visitors-daily.tsv');
export const 볼날수 = 30;      /* GA4 에 물을 창 — 오늘까지 */
export const 평균날수 = 28;    /* 「하루 평균」을 낼 창 */
export const 흐름날수 = 7;

/** GA4 의 yyyymmdd 를 yyyy-mm-dd 로. 꼴이 아니면 null (짐작하지 않는다) */
export function 날짜꼴(값) {
  const t = String(값 ?? '');
  if (!/^\d{8}$/.test(t)) return null;
  return `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)}`;
}

/** 호스트를 유닛 이름으로. 어디에도 안 붙으면 null — 버리지 않고 따로 센다 */
export function 유닛이름(host) {
  const h = String(host ?? '');
  return 유닛.find((u) => u.자.test(h))?.이름 ?? null;
}

/**
 * GA4 줄들을 «날짜 × 유닛»으로 모은다.
 * 줄 꼴: dimensions [date, hostName, sessionDefaultChannelGroup]
 *        metrics    [totalUsers, screenPageViews, sessions]
 */
export function 날짜별로(줄들, { 손님만 = true } = {}) {
  const 표 = new Map();     /* '날짜\t유닛' → { 순방문, 열림, 세션 } */
  const 못붙인호스트 = new Set();
  for (const r of 줄들 ?? []) {
    const d = 날짜꼴(r?.dimensionValues?.[0]?.value);
    const host = r?.dimensionValues?.[1]?.value ?? '';
    const 채널 = r?.dimensionValues?.[2]?.value ?? '';
    if (!d) continue;
    if (손님아님.test(host)) continue;
    if (손님만 && !손님인가(채널)) continue;
    const 이름 = 유닛이름(host);
    if (!이름) { 못붙인호스트.add(host); continue; }
    const 키 = d + '\t' + 이름;
    const 것 = 표.get(키) ?? { 순방문: 0, 열림: 0, 세션: 0 };
    것.순방문 += Number(r?.metricValues?.[0]?.value ?? 0);
    것.열림 += Number(r?.metricValues?.[1]?.value ?? 0);
    것.세션 += Number(r?.metricValues?.[2]?.value ?? 0);
    표.set(키, 것);
  }
  return { 표, 못붙인호스트: [...못붙인호스트] };
}

/** 한 유닛의 날짜별 수를 날짜 오름차순 배열로 */
export function 유닛흐름(표, 이름) {
  const 것들 = [];
  for (const [키, v] of 표) {
    const [d, u] = 키.split('\t');
    if (u === 이름) 것들.push({ 날짜: d, ...v });
  }
  return 것들.sort((a, b) => (a.날짜 < b.날짜 ? -1 : 1));
}

/**
 * 하루 평균을 낸다 — «날마다의 순방문자»를 평균한다.
 * ⛔ 28일 총 순방문자를 28로 나누는 것이 아니다. 그 총합은 같은 사람을 여러 번 센다.
 * ⚠ 자료가 없는 날은 0 으로 세지 않는다 — 날수에서 뺀다(못 잰 날과 0명인 날은 다르다).
 */
export function 하루평균(흐름, 날수 = 평균날수) {
  const 것들 = (흐름 ?? []).slice(-날수);
  if (!것들.length) return null;
  const 합 = 것들.reduce((a, x) => a + Number(x.순방문 || 0), 0);
  return { 합, 잰날수: 것들.length, 말: 하루꼴(합, 것들.length) };
}

/** 1인당 지면 — 1.5장 미만이면 그 수를 「순방문자」라 부르지 않는다 */
export function 걸음(것) {
  const 사람 = Number(것?.순방문 ?? 0);
  const 열림 = Number(것?.열림 ?? 0);
  if (!(사람 > 0)) return null;
  return Math.round((열림 / 사람) * 100) / 100;
}

/**
 * 🔴 GA4 는 «오늘치»를 아직 집계하는 중이다. 그 표시를 읽는다.
 *   실측(2026-09-10 21:4x): 100yearmap 오늘 순방문 1명인데 페이지뷰 0 · SeoulMarkets 도 1명/0.
 *   사람이 와서 지면을 0장 보고 갈 수는 없다 — 세션·사람은 먼저 들어오고 page_view 가 늦게 붙는다.
 *   ⛔ 그것을 「1인당 0장」으로 내면 거짓이다. 「집계중」이라고 적는다.
 *   ⚠ 그리고 «당일 수 자체»도 아직 오를 수 있다 — 확정된 수처럼 말하지 않는다.
 */
export function 집계중인가(것) {
  if (!것) return null;                                  /* 자료가 없다 — 못 쟀다 */
  const 사람 = Number(것.순방문 ?? 0);
  const 열림 = Number(것.열림 ?? 0);
  if (사람 > 0 && 열림 === 0) return true;
  return false;
}

/** 쌓아 둔 것을 읽는다 */
export function 쌓인것읽기(글) {
  const 표 = new Map();
  for (const 줄 of String(글 ?? '').split(/\r?\n/)) {
    if (!줄.trim() || 줄.startsWith('#')) continue;
    const [날짜, 유닛이름값, 순방문, 열림, 세션] = 줄.split('\t');
    if (!날짜 || !유닛이름값) continue;
    표.set(날짜 + '\t' + 유닛이름값, {
      순방문: Number(순방문 || 0), 열림: Number(열림 || 0), 세션: Number(세션 || 0),
    });
  }
  return 표;
}

/** 쌓아 적는다 — 같은 날은 새 값으로 갈아 끼우고, 옛 날짜는 «지우지 않는다» */
export function 쌓기(옛표, 새표) {
  const 합침 = new Map(옛표);
  for (const [k, v] of 새표) 합침.set(k, v);
  const 줄들 = [...합침.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([k, v]) => `${k}\t${v.순방문}\t${v.열림}\t${v.세션}`);
  return ['# 방문자 날마다 — 진짜 손님(Organic Search · AI Assistant · Organic Social)만',
    '# 만든 자: scripts/measure-visitors-daily.mjs   ⛔ 손으로 고치지 않는다',
    '# 날짜\t유닛\t순방문자\t페이지뷰\t세션',
    ...줄들, ''].join('\n');
}

/* ── 자가시험 ─────────────────────────────────────────────── */
export function 자가시험() {
  let 통과 = 0; const 막힘 = [];
  const 본다 = (이름, 참) => { if (참) 통과++; else 막힘.push(이름); };

  본다('날짜 꼴을 바꾼다', 날짜꼴('20260910') === '2026-09-10');
  본다('꼴이 아니면 null', 날짜꼴('2026-09-10') === null);
  본다('빈 것도 null', 날짜꼴('') === null);
  본다('없는 것도 null', 날짜꼴(undefined) === null);

  본다('호스트를 유닛으로', 유닛이름('www.kculturewire.com').includes('K Culture Wire'));
  본다('모르는 호스트는 null', 유닛이름('example.com') === null);

  const 줄 = (d, h, ch, u, pv, se) => ({
    dimensionValues: [{ value: d }, { value: h }, { value: ch }],
    metricValues: [{ value: String(u) }, { value: String(pv) }, { value: String(se) }],
  });
  const r1 = 날짜별로([
    줄('20260909', 'www.kculturewire.com', 'Organic Search', 3, 5, 4),
    줄('20260909', 'www.kculturewire.com', 'AI Assistant', 2, 2, 2),
    줄('20260909', 'www.kculturewire.com', 'Direct', 9, 9, 9),
    줄('20260910', 'www.kculturewire.com', 'Organic Search', 4, 7, 5),
    줄('20260910', 'localhost', 'Organic Search', 99, 99, 99),
    줄('20260910', 'nowhere.example', 'Organic Search', 7, 7, 7),
  ]);
  /* 🔴 [2026-10-26 · 5번] 여기에 「5번 K Culture Wire」를 손으로 박아 두었다가,
     KCW 담당이 1번으로 바뀌자 자가시험이 undefined 를 읽고 터졌다. 그리고 이 자가시험은
     `--잰다` 보다 «먼저» 도는 자리라, 재는 일 자체가 통째로 막혀 있었다.
     ⇒ 이름을 박지 않고 `유닛이름()` 이 지금 돌려주는 값을 그대로 쓴다. 담당이 또 바뀌어도 돈다. */
  const 케이 = 유닛이름('www.kculturewire.com');
  본다('날짜×유닛으로 모은다', r1.표.get(`2026-09-09\t${케이}`).순방문 === 5);
  본다('⛔ Direct 는 손님으로 안 센다', r1.표.get(`2026-09-09\t${케이}`).순방문 !== 14);
  본다('우리 개발 호스트는 뺀다', ![...r1.표.keys()].some((k) => k.includes('localhost')));
  본다('⛔ 못 붙인 호스트를 버리지 않는다', r1.못붙인호스트.includes('nowhere.example'));
  본다('날짜가 이상한 줄은 건너뛴다', 날짜별로([줄('엉망', 'www.kculturewire.com', 'Organic Search', 1, 1, 1)]).표.size === 0);
  본다('줄이 안 와도 막지 않는다', 날짜별로(undefined).표.size === 0);
  본다('손님만 끄면 다 센다', 날짜별로([줄('20260909', 'www.kculturewire.com', 'Direct', 9, 9, 9)], { 손님만: false }).표.size === 1);

  const 흐름 = 유닛흐름(r1.표, 케이);
  본다('흐름을 날짜순으로 준다', 흐름.length === 2 && 흐름[0].날짜 === '2026-09-09');

  /* 하루 평균 — 사장님이 원하신 수 */
  본다('하루 평균을 낸다', 하루평균([{ 순방문: 4 }, { 순방문: 6 }]).말 === '5명꼴');
  본다('⛔ 사람에 소수점을 안 붙인다', !/\d\.\d/.test(하루평균([{ 순방문: 4 }, { 순방문: 5 }]).말));
  본다('하루 한 명이 안 되면 센 수 그대로', 하루평균([{ 순방문: 0 }, { 순방문: 1 }]).말 === '2일에 1명');
  본다('⬜ 자료가 없으면 null', 하루평균([]) === null);
  본다('⚠ 못 잰 날을 0 으로 세지 않는다 (잰 날수를 함께 낸다)', 하루평균([{ 순방문: 3 }]).잰날수 === 1);
  본다('창을 넘으면 최근 것만 본다', 하루평균([{ 순방문: 100 }, { 순방문: 2 }, { 순방문: 4 }], 2).합 === 6);

  본다('1인당 지면을 낸다', 걸음({ 순방문: 4, 열림: 6 }) === 1.5);
  본다('⬜ 사람이 0이면 null', 걸음({ 순방문: 0, 열림: 3 }) === null);
  본다('것이 안 와도 막지 않는다', 걸음(undefined) === null);

  /* 🔴 [2026-09-10] GA4 오늘치는 집계 중이다 — 사람 1명에 페이지뷰 0 이 실제로 왔다 */
  본다('사람은 있는데 페이지뷰가 0이면 집계중', 집계중인가({ 순방문: 1, 열림: 0 }) === true);
  본다('둘 다 있으면 집계중이 아니다', 집계중인가({ 순방문: 2, 열림: 6 }) === false);
  본다('아무도 안 왔으면 집계중이 아니다', 집계중인가({ 순방문: 0, 열림: 0 }) === false);
  본다('⬜ 자료가 없으면 null', 집계중인가(null) === null);

  /* 쌓기 */
  const 옛 = 쌓인것읽기('# 머리\n2026-09-01\t5번 K Culture Wire\t2\t3\t2\n');
  본다('쌓인 것을 읽는다', 옛.get('2026-09-01\t5번 K Culture Wire').순방문 === 2);
  본다('주석 줄은 건너뛴다', 옛.size === 1);
  const 새글 = 쌓기(옛, new Map([['2026-09-02\t5번 K Culture Wire', { 순방문: 5, 열림: 8, 세션: 6 }]]));
  본다('옛 날짜를 지우지 않는다', 새글.includes('2026-09-01'));
  본다('새 날짜를 더한다', 새글.includes('2026-09-02'));
  const 갈아낀글 = 쌓기(옛, new Map([['2026-09-01\t5번 K Culture Wire', { 순방문: 9, 열림: 9, 세션: 9 }]]));
  본다('같은 날은 새 값으로 갈아 끼운다', 갈아낀글.includes('2026-09-01\t5번 K Culture Wire\t9'));
  본다('머리글을 붙인다', 새글.startsWith('#'));

  /* 🔴 이 자가 «28일 총합»을 내지 않는다는 것을 소스로 못 박는다 */
  const 내소스 = readFileSync(fileURLToPath(import.meta.url), 'utf8');
  본다('소스에 「28일 총 순방문자」를 만드는 자리가 없다',
    !/28일\s*총\s*순방문자\s*=/.test(내소스));

  console.log('자가시험 — measure-visitors-daily.mjs\n');
  막힘.forEach((m) => console.log('  MAK ' + m));
  console.log(`\n통과 ${통과} · 막힘 ${막힘.length}`);
  return 막힘.length === 0;
}

/* ── 잰다 ─────────────────────────────────────────────────── */
async function 잰다({ 적는다 = false } = {}) {
  const 키파일 = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!키파일 || !existsSync(키파일)) { console.log('⚠ 서비스 계정 키파일이 없다 — **못 쟀다.**'); return false; }
  const 키 = JSON.parse(readFileSync(키파일, 'utf8'));
  let 토큰;
  try { 토큰 = await 토큰받기(키); } catch (e) {
    const m = 무엇이막혔나(e.message);
    console.log(`🔴 토큰을 못 받았다 — **못 쟀다.** ${m.무엇} / ${m.할것}`);
    return false;
  }

  let 속성 = process.argv.find((a) => a.startsWith('--속성='))?.split('=')[1];
  if (!속성) {
    const r = await fetch('https://analyticsadmin.googleapis.com/v1beta/accountSummaries',
      { headers: { Authorization: `Bearer ${토큰}` } });
    const j = await r.json();
    const 골라 = 우리속성(j.accountSummaries);
    속성 = 골라.고른것?.속성 ?? 골라.전부[0]?.속성 ?? null;
  }
  if (!속성) { console.log('🔴 속성을 못 찾았다 — **못 쟀다**'); return false; }

  const r = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${속성}:runReport`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${토큰}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dateRanges: [{ startDate: `${볼날수}daysAgo`, endDate: 'today' }],
      dimensions: [{ name: 'date' }, { name: 'hostName' }, { name: 'sessionDefaultChannelGroup' }],
      metrics: [{ name: 'totalUsers' }, { name: 'screenPageViews' }, { name: 'sessions' }],
      limit: 20000,
    }),
  });
  const j = await r.json();
  if (j.error) { console.log(`🔴 GA4 가 거절했다 — **못 쟀다.** ${JSON.stringify(j.error).slice(0, 200)}`); return false; }

  const { 표, 못붙인호스트 } = 날짜별로(j.rows ?? []);
  const 오늘 = new Date().toLocaleDateString('sv-SE');       /* KST 그대로 */
  const 어제 = new Date(Date.now() - 86400000).toLocaleDateString('sv-SE');

  console.log(`■ 방문자 — 진짜 손님만 (${손님갈래.join(' · ')})`);
  console.log(`  잰 창 ${볼날수}일(오늘 포함) · 속성 ${속성} · 오늘 ${오늘}\n`);
  console.log('유닛                     당일   어제   하루평균(28일)   이레 흐름            1인당 지면');
  for (const u of 유닛) {
    const 흐름 = 유닛흐름(표, u.이름);
    const 오늘것 = 흐름.find((x) => x.날짜 === 오늘);
    const 어제것 = 흐름.find((x) => x.날짜 === 어제);
    const 평 = 하루평균(흐름);
    const 이레 = 흐름.slice(-흐름날수).map((x) => x.순방문);
    const 오늘집계중 = 집계중인가(오늘것);
    const 걸 = 걸음(오늘집계중 ? 어제것 : (오늘것 ?? 어제것));
    console.log(
      u.이름.padEnd(22)
      + String(오늘것 ? 오늘것.순방문 + '명' + (오늘집계중 ? '*' : '') : '⬜').padStart(7)
      + String(어제것 ? 어제것.순방문 + '명' : '⬜').padStart(7)
      + String(평 ? 평.말 : '못 쟀다').padStart(15)
      + '   ' + (이레.length ? 이레.join(' ') : '⬜').padEnd(20)
      + (걸 === null ? '⬜' : 걸 + '장'),
    );
  }
  if (못붙인호스트.length) console.log(`\n  ⬜ 어디에도 안 붙은 호스트 ${못붙인호스트.length}개: ${못붙인호스트.slice(0, 4).join(' · ')}`);
  console.log('\n⚠ 당일에 별표(*)가 붙은 것은 «GA4 집계중»이다 — 페이지뷰가 아직 안 붙었다.');
  console.log('  그 수는 더 오를 수 있다. 확정된 수처럼 말하지 않는다.');
  console.log('⚠ 「하루평균」은 «날마다의 순방문자»를 평균한 값이다 — 28일 총합을 나눈 것이 아니다.');
  console.log('⛔ 날짜별 순방문자를 더해 「28일에 몇 명」이라고 말하지 않는다 — 같은 사람이 여러 번 세어진다.');

  if (적는다) {
    const 옛 = existsSync(쌓을곳) ? 쌓인것읽기(readFileSync(쌓을곳, 'utf8')) : new Map();
    writeFileSync(쌓을곳, 쌓기(옛, 표), 'utf8');
    console.log(`\n✔ 쌓았다 — src/data/visitors-daily.tsv (줄 ${표.size}개를 합쳤다)`);
    console.log('  ⭐ 날마다 쌓이면 추세가 보인다. 사장님: 「그래야 내가 추세를 볼 수 있다」');
  } else {
    console.log('\n(--적는다 를 주면 src/data/visitors-daily.tsv 에 쌓는다)');
  }
  return true;
}

const 나 = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(나)) {
  if (process.argv.includes('--자가시험')) process.exit(자가시험() ? 0 : 1);
  /* 🔴 [2026-11-09] 깃발 이름에 한자어 이름을 «더했다». 「잰다」는 순한글이라
     문서나 보고서에 이 명령을 적으면 밖으로 나가는 글 검사에 걸린다(오늘 실제로 걸렸다).
     ⛔ 옛 이름을 지우지 않는다 — 예약 작업과 다른 자리가 이미 그 이름으로 부른다. */
  if (!process.argv.includes('--측정한다') && !process.argv.includes('--잰다')) {
    console.log('⛔ --측정한다(옛 이름 --잰다 도 받는다) 나 --자가시험 을 준다');
    process.exit(1);
  }
  const 됐나 = 자가시험();
  console.log('');
  잰다({ 적는다: process.argv.includes('--적는다') })
    .then((ok) => process.exit(됐나 && ok ? 0 : 1))
    .catch((e) => { console.error('⛔ ' + e.message); process.exit(1); });
}
