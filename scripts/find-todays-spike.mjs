#!/usr/bin/env node
/**
 * find-todays-spike.mjs — **오늘 이 순간 튀어 오른 한국 이름을 찾는다.**
 *
 * ── 왜 이 자가 생겼나 ───────────────────────────────────────────
 * 사장님 지시(2026-08-29):
 *   「**오늘 이순간 이슈되는 걸 찾아서 콘텐트로 만들어서 배포해.. 방문자 늘리는 가장 확실한 방법.
 *     하루에 6번 정도 하도록... 동남아 시간으로 9시~19시 사이에 콘텐트 배포**」
 *
 * 🔴 우리 자료는 **주간·월간**이다. 넷플릭스 주간 top 10, 위키백과 월간 읽힘.
 *   그것으로는 「이 순간」을 말할 수 없다. 창고에 있는 자료로 지난주 이야기를 만드는 것은
 *   이 지시가 아니다. **오늘 튀어 오른 것을 따로 찾아야 한다.**
 *
 * ── 무엇으로 재나 ──────────────────────────────────────────────
 * 위키미디어가 **하루치 가장 많이 열린 문서**를 낸다(top endpoint, 문서 1,000개).
 * 우리가 이미 쓰는 자와 같은 자료라 **한계도 그대로 물려받는다** — 그게 옳다.
 *
 * ```
 * 오늘(어제까지 확정) 열린 수  ÷  그 앞 이레의 하루 평균  =  튄 배수
 * ```
 *
 * ⛔ **「많이 읽힌 것」이 아니라 「튀어 오른 것」을 찾는다.** 늘 많이 읽히는 이름은
 *   오늘의 이슈가 아니다. 배수로 봐야 오늘 무슨 일이 있었는지가 보인다.
 * ⚠ 그래서 바닥을 둔다 — 원래 거의 안 읽히던 문서가 열 번 열리면 배수가 폭발한다.
 *   `최소읽힘` 아래는 세지 않는다. ⛔ 0 으로 나누지 않는다.
 *
 * ── ⛔ 이 자가 «말하지 않는» 것 ─────────────────────────────────
 * ⛔ **왜 튀었는지는 모른다.** 위키백과는 이유를 안 적는다. 사람이 확인해야 한다.
 *   그래서 이 자는 「후보」를 낼 뿐이고, 무엇을 만들지는 사람이 정한다.
 * ⛔ 읽힘은 시청도 인기도 아니다. 문서가 열린 횟수다.
 * ⚠ 위키미디어의 하루치는 보통 **하루 늦게** 확정된다. 「오늘」은 대개 어제다 —
 *   그것을 숨기지 않고 잰 날을 같이 낸다.
 *
 * 쓰는 법  node scripts/find-todays-spike.mjs [--판=id,vi,th,ms,en] [--몇개=12]
 *          node scripts/find-todays-spike.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** 우리가 보는 판 — 손님이 있는 네 나라 + 영문 */
export const 기본판 = ['id', 'vi', 'th', 'ms', 'en'];

/**
 * ⛔ 이 아래로 읽힌 문서는 배수를 안 낸다. 적은 수는 배수를 폭발시킨다.
 *
 * 🔴 [2026-08-29] 처음에 500 으로 손으로 박았더니 **동남아 판이 통째로 걸러졌다** —
 *   인도네시아판은 그날 100위가 510회, 1,000위가 128회다. 500 은 그 판에서
 *   「상위 100등 안」이라는 뜻이 되어, 한국 이름은 애초에 들어올 수가 없다.
 * ⭐ 그래서 바닥을 **그날 그 판의 자료에서 정한다** — 목록에 들어온 것 중 가장 적게
 *   읽힌 수. 「하루 top 1,000 에 들었다」가 이미 바닥 노릇을 한다.
 * ⚠ 손으로 박은 수는 판이 다르면 반드시 틀린다. 자료에서 뽑으면 판마다 알아서 맞는다.
 */
export const 최소읽힘 = 100;   /* 자료에서 못 뽑을 때만 쓰는 마지막 바닥 */

export function 바닥정하기(하루표, 마지막바닥 = 최소읽힘) {
  const 다 = [...(하루표?.values?.() ?? [])].filter(Number.isFinite);
  if (!다.length) return 마지막바닥;
  return Math.max(Math.min(...다), 1);
}

/** 위키백과의 «문서가 아닌» 것들 — 대문·특수문서는 이슈가 아니다 */
export const 문서아님 = /^(Main_Page|Special:|Halaman_Utama|Trang_Ch|หน้าหลัก|Laman_Utama|Portal:|Wikipedia:|Istimewa:|Đặc_biệt:|พิเศษ:)/i;

export function 문서인가(제목) {
  const t = String(제목 ?? '');
  return !!t && !문서아님.test(t) && !t.includes(':');
}

/**
 * 튄 배수. ⛔ 앞이레가 0 이면 **못 잰다**(null) — 0 으로 나누지 않고 큰 수로도 안 만든다.
 * ⚠ 바닥 아래면 역시 못 잰다 — 적게 읽히던 것이 몇 번 열린 것을 이슈로 내지 않는다.
 */
export function 튄배수(오늘, 앞이레평균, 바닥 = 최소읽힘) {
  const a = Number(오늘); const b = Number(앞이레평균);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  if (a < 바닥) return null;
  if (b <= 0) return null;
  return a / b;
}

/** 날짜를 위키미디어 꼴로. ⚠ UTC 로 센다 — 위키미디어가 UTC 다 */
export function 날쪼개기(때) {
  const d = new Date(때);
  return {
    y: String(d.getUTCFullYear()),
    m: String(d.getUTCMonth() + 1).padStart(2, '0'),
    d: String(d.getUTCDate()).padStart(2, '0'),
  };
}

export function 하루전(때, 며칠 = 1) {
  return new Date(new Date(때).getTime() - 며칠 * 86400000);
}

export function 탑주소(판, 때) {
  const { y, m, d } = 날쪼개기(때);
  return `https://wikimedia.org/api/rest_v1/metrics/pageviews/top/${판}.wikipedia/all-access/${y}/${m}/${d}`;
}

/**
 * 🔴🔴 [2026-08-29] **첫판에 「CAT」이 후보로 올라왔다.** 우리 작품 목록에 `Cat` 이 있고
 *   영문 위키백과의 `CAT` 문서가 그날 12,162번 열린 것이다. 그 문서는 우리 작품이 아니다.
 *
 * ⛔ 이름 하나로 맞추면 «짧고 흔한 이름»이 전부 헛매치가 된다. 그리고 헛매치 하나가
 *   그날 콘텐트를 통째로 틀린 것으로 만든다 — 카드 한 장보다 훨씬 비싸다.
 *
 * ⭐ 그래서 «까다롭게» 맞춘다. 못 맞추고 놓치는 쪽이, 틀린 것을 내는 쪽보다 낫다.
 *   ① 낱말이 둘 이상이면 대소문자를 넘겨서 맞춘다 (Lee You-mi · Squid Game)
 *   ② 낱말이 하나면 **대소문자까지 똑같아야** 맞춘다 (Cat ≠ CAT)
 *   ③ 아주 짧은 이름(세 글자 이하)은 아예 안 맞춘다 — 사람 이름이라도 헛매치가 더 많다
 */
export const 짧은이름 = 3;

export function 낱말수(이름) {
  return String(이름 ?? '').replace(/[_]+/g, ' ').trim().split(/\s+/).filter(Boolean).length;
}

export function 이름맞추개(명단) {
  const 느슨 = new Map();   /* 낱말 둘 이상 — 대소문자 넘김 */
  const 빡빡 = new Map();   /* 낱말 하나 — 대소문자까지 같아야 함 */
  for (const [이름, 것] of 명단) {
    const 원 = String(이름 ?? '').replace(/[_]+/g, ' ').trim();
    if (원.length <= 짧은이름) continue;              /* ③ */
    if (낱말수(원) >= 2) {                            /* ① */
      const k = 원.toLowerCase().replace(/\s+/g, ' ');
      if (!느슨.has(k)) 느슨.set(k, 것);
    } else if (!빡빡.has(원)) {                       /* ② */
      빡빡.set(원, 것);
    }
  }
  return (제목) => {
    const 원 = String(제목 ?? '').replace(/[_]+/g, ' ').trim();
    if (낱말수(원) >= 2) return 느슨.get(원.toLowerCase().replace(/\s+/g, ' ')) ?? null;
    return 빡빡.get(원) ?? null;
  };
}

/* ── 자가시험 ─────────────────────────────────────────── */
/* 🔴 [2026-09-06] 직접 실행일 때만 돈다 — find-todays-spike-deep.mjs 가 이 파일을 import 하는데,
   이 블록이 막지 않아 «부르는 쪽» 자가시험이 한 줄도 안 돌고 exit(0) 되고 있었다.
   실측: node scripts/find-todays-spike-deep.mjs --자가시험 → 이 파일 시험만 떴다. */
const 내가직접돌았나 = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (내가직접돌았나 && (process.argv.includes('--자가시험') || process.argv.includes('--selftest'))) {
  let 셈 = 0;
  const 본다 = (말, 참) => { 셈 += 1; console.log(참 ? '✅' : '🔴', 말); if (!참) process.exitCode = 1; };

  본다('① 배수를 낸다', 튄배수(3000, 1000) === 3);
  본다('② 🔴 앞이레가 0 이면 못 잰다 — 0 으로 안 나눈다', 튄배수(3000, 0) === null);
  본다('③ 🔴 바닥 아래는 못 잰다 — 적은 수가 배수를 폭발시킨다', 튄배수(10, 1) === null);
  본다('④ 바닥은 갈아 끼울 수 있다', 튄배수(10, 1, 5) === 10);
  본다('⑤ 수가 아니면 못 잰다', 튄배수('많이', 1) === null && 튄배수(100, null) === null);

  본다('⑥ 대문은 문서가 아니다', !문서인가('Main_Page') && !문서인가('Halaman_Utama'));
  본다('⑦ 특수·이름공간은 문서가 아니다', !문서인가('Special:Search') && !문서인가('Wikipedia:About'));
  본다('⑧ 사람 이름은 문서다', 문서인가('Lee_You-mi'));
  본다('⑨ 빈 것은 문서가 아니다', !문서인가('') && !문서인가(null));

  본다('⑩ 날을 UTC 로 쪼갠다', (() => {
    const r = 날쪼개기(Date.UTC(2026, 7, 29));
    return r.y === '2026' && r.m === '08' && r.d === '29';
  })());
  본다('⑪ 하루 전을 낸다', 날쪼개기(하루전(Date.UTC(2026, 7, 29))).d === '28');
  본다('⑫ 이레 전을 낸다', 날쪼개기(하루전(Date.UTC(2026, 7, 29), 7)).d === '22');
  본다('⑬ 주소를 만든다',
    탑주소('id', Date.UTC(2026, 7, 29))
    === 'https://wikimedia.org/api/rest_v1/metrics/pageviews/top/id.wikipedia/all-access/2026/08/29');

  const 맞 = 이름맞추개([['Lee You-mi', { 갈래: '사람' }], ['Squid Game', { 갈래: '작품' }]]);
  본다('⑭ 아는 이름을 맞춘다', 맞('Lee_You-mi')?.갈래 === '사람');
  /**
   * 🔴 첫판에 「CAT」이 후보로 올라왔다 — 우리 작품 `Cat` 과 영문 문서 `CAT` 은 다른 것이다.
   * ⭐ 그 이름은 **두 자로 막힌다**: 세 글자라 ③(짧은 이름)에서 이미 걸리고,
   *   설령 길었더라도 ②(대소문자)에서 걸린다. 둘 다 시험한다.
   */
  본다('⑭-1 🔴 「Cat」 같은 세 글자 이름은 아예 안 맞춘다 — 헛매치가 더 많다', (() => {
    const m = 이름맞추개([['Cat', { 갈래: '작품' }]]);
    return m('Cat') === null && m('CAT') === null;
  })());
  본다('⑭-1-2 🔴 길어도 낱말 하나면 대소문자까지 같아야 한다 — Parasite ≠ PARASITE', (() => {
    const m = 이름맞추개([['Parasite', { 갈래: '작품' }]]);
    return m('Parasite')?.갈래 === '작품' && m('PARASITE') === null;
  })());
  본다('⑭-2 낱말이 둘 이상이면 대소문자를 넘긴다', (() => {
    const m = 이름맞추개([['Squid Game', { 갈래: '작품' }]]);
    return m('SQUID_GAME')?.갈래 === '작품';
  })());
  본다('⑭-3 아주 짧은 이름은 아예 안 맞춘다', 이름맞추개([['IU', {}]])('IU') === null);
  본다('⑭-4 바닥을 그날 자료에서 뽑는다',
    바닥정하기(new Map([['a', 900], ['b', 128]])) === 128);
  본다('⑭-5 자료가 비면 마지막 바닥을 쓴다', 바닥정하기(new Map()) === 최소읽힘);
  본다('⑮ 밑줄과 대소문자를 넘겨서 맞춘다', 맞('squid_game')?.갈래 === '작품');
  본다('⑯ 모르는 이름은 null', 맞('Someone Else') === null);

  console.log(`\n${process.exitCode ? '❌' : '✅'} find-todays-spike 자가시험 (${셈})`);
  process.exit();
}

/* ── 몸 ───────────────────────────────────────────────── */
const 인자 = (이름, 기본) => {
  const a = process.argv.find((x) => x.startsWith(`--${이름}=`));
  return a ? a.split('=')[1] : 기본;
};
const 판들 = String(인자('판', 기본판.join(','))).split(',').map((s) => s.trim()).filter(Boolean);
const 몇개 = Number(인자('몇개', 12));

/* 우리가 아는 한국 이름을 모은다 — 사람·작품·그룹 */
function 우리명단() {
  const 것 = [];
  const 넣 = (파일, 열쇠, 이름칸, 갈래, 주소) => {
    try {
      const j = JSON.parse(fs.readFileSync(path.join(뿌리, 'src/data', 파일), 'utf8'));
      for (const r of (j[열쇠] ?? [])) {
        const 이름 = r[이름칸];
        if (이름) 것.push([이름, { 갈래, 이름, slug: r.slug, 주소: 주소(r) }]);
        /* ⚠ 위키백과 문서 이름이 따로 있으면 그것도 넣는다 — 문서 제목으로 매칭된다 */
        if (r.wikiPage && r.wikiPage !== 이름) 것.push([r.wikiPage, { 갈래, 이름, slug: r.slug, 주소: 주소(r) }]);
      }
    } catch { /* ⬜ 없으면 그만큼 못 맞춘다 */ }
  };
  넣('wikitip-people.json', 'people', 'name', '사람', (r) => `/person/${r.slug}`);
  넣('wikitip-title-pages.json', 'titles', 'title', '작품', (r) => (r.hasPage ? `/title/${r.slug}` : null));
  넣('wikitip-groups.json', 'groups', 'name', '그룹', (r) => `/group/${r.slug}`);
  return 것;
}

async function 하루읽기(판, 때) {
  try {
    const r = await fetch(탑주소(판, 때), { headers: { 'user-agent': 'KCultureWire/1.0 (kculturewire.com)' } });
    if (!r.ok) return null;
    const j = await r.json();
    const 다 = j?.items?.[0]?.articles ?? [];
    const 표 = new Map();
    for (const a of 다) if (문서인가(a.article)) 표.set(a.article, a.views);
    return 표;
  } catch { return null; }
}

const 맞추기 = 이름맞추개(우리명단());
/* ⚠ 위키미디어 하루치는 보통 하루 늦게 확정된다 — 어제를 「오늘」로 본다 */
const 오늘 = 하루전(Date.now(), 1);

console.log('\n■ 오늘 튀어 오른 한국 이름 — 위키백과 하루치\n');
console.log(`  잰 날 ${날쪼개기(오늘).y}-${날쪼개기(오늘).m}-${날쪼개기(오늘).d} (UTC)`
  + ` · 판 ${판들.join('·')} · 바닥 ${최소읽힘}회`);

const 후보 = [];
let 못잰판 = 0;

for (const 판 of 판들) {
  const 오 = await 하루읽기(판, 오늘);
  if (!오) { 못잰판 += 1; console.log(`  ⬜ ${판} — 못 쟀다`); continue; }

  /* 앞이레 — 하루씩 받아 평균을 낸다. ⚠ 하루라도 못 받으면 그 판은 못 잰 것으로 둔다 */
  const 앞 = [];
  for (let i = 2; i <= 8; i += 1) {
    const t = await 하루읽기(판, 하루전(Date.now(), i));
    if (t) 앞.push(t);
  }
  if (앞.length < 4) { 못잰판 += 1; console.log(`  ⬜ ${판} — 앞이레를 ${앞.length}일치만 받아 못 쟀다`); continue; }

  /* ⭐ 바닥은 그날 그 판의 자료에서 — 손으로 박으면 판이 다를 때 반드시 틀린다 */
  const 이판바닥 = 바닥정하기(오);
  console.log(`     (${판} 바닥 ${이판바닥}회 — 그날 top 목록에 든 가장 적은 수)`);

  for (const [문서, 오늘수] of 오) {
    const 것 = 맞추기(문서);
    if (!것) continue;
    const 앞수 = 앞.map((t) => t.get(문서) ?? 0);
    const 평균 = 앞수.reduce((a, b) => a + b, 0) / 앞수.length;
    const 배 = 튄배수(오늘수, 평균, 이판바닥);
    if (배 === null || 배 < 1.5) continue;
    후보.push({ 판, 문서, 이름: 것.이름, 갈래: 것.갈래, 주소: 것.주소, 오늘수, 평균: Math.round(평균), 배 });
  }
  console.log(`  ✅ ${판} — 우리가 아는 이름 중 튄 것 ${후보.filter((c) => c.판 === 판).length}개`);
}

후보.sort((a, b) => b.배 - a.배);

console.log(`\n  ${후보.length ? '⭐' : '⬜'} 후보 ${후보.length}개`
  + (못잰판 ? ` · ⬜ 못 잰 판 ${못잰판}개` : ''));
console.log('');

for (const c of 후보.slice(0, 몇개)) {
  console.log(`  ${c.배.toFixed(1)}배  ${c.이름}  (${c.갈래}·${c.판})`
    + `  오늘 ${c.오늘수.toLocaleString('en-US')} ← 앞이레 하루 ${c.평균.toLocaleString('en-US')}`
    + (c.주소 ? `  ${c.주소}` : '  ⚠ 우리 지면 없음'));
}

if (!후보.length) {
  console.log('  ⬜ 오늘은 우리가 아는 이름 중 튄 것이 없다.');
  console.log('     ⛔ 「없으니 아무거나 만든다」로 가지 않는다 — 없으면 없다고 적고 다른 축을 본다.');
}

console.log('\n## ⛔ 이 표가 «말하지 않는» 것');
console.log('   · **왜 튀었는지는 모른다.** 위키백과는 까닭을 안 적는다 — 사람이 확인하고 정한다');
console.log('   · 읽힘은 시청도 인기도 아니다. 문서가 열린 횟수다');
console.log('   · ⚠ 위키미디어 하루치는 하루 늦게 확정된다. 위의 「잰 날」이 실제로 잰 날이다');

process.exitCode = 후보.length ? 0 : 2;
