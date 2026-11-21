#!/usr/bin/env node
/**
 * measure-kcw-name-days.mjs — **이름 몇 개의 «하루치 읽힘»을 여러 언어판에서 나란히 잰다.**
 *
 * ── 왜 이 자가 생겼나 (2026-10-04 11:4x · 5번) ─────────────────────────────
 * `find-todays-spike.mjs` 는 「무엇이 튀었나」를 찾아 준다. 그런데 거기서 끝나면
 * 기사를 못 쓴다 — 기사에 들어갈 것은 «날짜별 수»이지 배수 하나가 아니다.
 * 그동안은 이름이 튈 때마다 일회용 스크립트를 새로 썼다. 그러지 않게 한 자리에 둔다.
 *
 * ⭐ 이 자는 **판정하지 않는다.** 날짜와 수만 낸다. 왜 튀었는지는 사람이 밖에서
 *   확인해 기사에 출처로 단다. 위키백과는 까닭을 안 적는다.
 *
 * ── ⛔ 이 자가 «말하지 않는» 것 ────────────────────────────────────────────
 * ⛔ 읽힘은 인기도 시청도 호감도 아니다. **문서가 열린 횟수**다.
 *    좋은 일로도 늘고 나쁜 일로도 는다.
 * ⛔ 「언어판 = 나라」가 아니다. en 은 세계가 읽고, es 는 스페인과 중남미가 같이 읽는다.
 * ⛔ 두 이름의 수를 견주는 것은 «그 날 어느 문서가 더 열렸나»일 뿐이다.
 *    누가 더 유명한지, 누구 때문에 열렸는지는 이 수로 말할 수 없다.
 * ⚠ 위키미디어 하루치는 보통 하루 늦게 확정된다 — 끝날을 어제로 둔다.
 * ⚠ 봇은 빠진다(agent=user). 그래도 사람 수는 아니다 — 같은 사람이 여러 번 연다.
 *
 * 🔴 429 는 「자료가 없다」가 아니라 「잠깐 기다려라」다. 2026-10-04 에 옆 자
 *   (`find-todays-spike.mjs`)가 429 를 「못 쟀다」로 읽어 **영어판을 통째로**
 *   가리고 있었다. 여기서는 처음부터 기다렸다 다시 묻는다.
 *
 * 쓰는 법
 *   node scripts/measure-kcw-name-days.mjs --이름=top,nana --날수=14
 *   node scripts/measure-kcw-name-days.mjs --이름=top --판=en,id,vi --날수=10
 *   node scripts/measure-kcw-name-days.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const 명단길 = path.join(뿌리, 'src', 'data', 'wikitip-people.json');
export const 낼방 = path.join(뿌리, 'archive', 'raw', 'kcw-name-days');

/** 우리가 보는 판 — 손님이 있는 네 나라 + 영문 */
export const 기본판 = ['en', 'id', 'vi', 'th', 'ms'];
export const 기본날수 = 14;

export function 쉬기(ms) { return new Promise((r) => setTimeout(r, ms)); }
export const 참는횟수 = 4;
export const 사이쉼 = 120;
/* ⚠ action API(langlinks)는 하루치 자와 허들이 따로다 — 거기서 429 를 먼저 맞았다 */
export const 판제목쉼 = 5000;

/** 하루 전 — ⛔ toISOString 을 쓰지 않는다(이 PC 는 KST 다) */
export function 날글(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
}
export function 하루전(밀리, 몇) { return new Date(밀리 - 몇 * 86400000); }

/** 위키미디어가 받는 꼴 — 2026-10-03 → 20261003 */
export function 붙인날(글) { return String(글 ?? '').replace(/-/g, ''); }

export function 주소(판, 제목, 첫, 끝) {
  return 'https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/'
    + `${판}.wikipedia/all-access/user/${encodeURIComponent(제목.replace(/ /g, '_'))}`
    + `/daily/${붙인날(첫)}/${붙인날(끝)}`;
}

/**
 * 🔴🔴 [2026-10-04 11:5x · 5번] **이 자가 처음에 거짓말을 할 뻔했다.**
 *   영문 제목을 다섯 판에 «그대로» 던져 놓고, 404 가 오면 「그 판에 이 문서가 없다」고
 *   적고 있었다. 그 말을 믿고 기사를 쓰려다 밖에서 한 번 더 확인했더니 —
 *   ```
 *   Nana (entertainer)  →  id「Nana (penyanyi)」 vi「Nana (ca sĩ)」
 *                          th「นานา (นักร้อง)」  ms「Nana (penyanyi)」  ← 넷 다 «있다»
 *   ```
 *   **문서가 없는 것이 아니라 제목이 다른 것이었다.** 그대로 냈으면 기사의 뼈대가
 *   통째로 거짓이 될 뻔했다(「동남아에는 읽을 지면이 없었다」로 쓰려던 참이었다).
 * ⭐ 강령③ 과 짝이 되는 자리 — 「없다」는 «재서» 나와야 한다. 내가 던진 열쇠가
 *   안 맞은 것을 「없다」로 적으면 그것은 못 잰 것을 0 으로 채운 것과 같다.
 * ⇒ 판마다 «그 판의 제목»을 위키백과에게 물어서 쓴다. 그래도 없다고 하면 그때 없다.
 * ⚠ action API 는 하루치 자와 «다른» 허들이 있다 — 더 느리게 묻는다.
 */
/**
 * 🔴🔴 [2026-10-04 12:4x · 5번] **리디렉트를 안 풀어 거짓 수를 내고 있었다.**
 *   e스포츠 선수를 재니 「Keria 하루 10회」·「Canyon (gamer) 하루 1회」가 나왔다.
 *   세계대회를 뛰는 선수가 하루 한 번 읽힌다는 것은 말이 안 된다 —
 *   그 제목들이 «리디렉트»였고, 하루치 API 는 리디렉트를 따라가지 않는다.
 *   리디렉트 제목으로 들어온 몇 번만 세고 본문서의 수는 통째로 빠진다.
 * ⛔ 이 수로 기사를 썼으면 「결승 뛴 선수가 하루 10번 읽힌다」는 거짓이 나갈 뻔했다.
 * ⇒ redirects=1 로 본문서 이름을 받아 «그 이름»으로 잰다.
 * ⭐ 이 자리에서만 두 번째다 — 앞서는 「판마다 제목이 다르다」를 놓쳤다.
 *   둘 다 「내가 던진 열쇠가 안 맞은 것」을 「자료가 없다」로 읽은 것이다.
 */
export function 판제목주소(영문문서) {
  return 'https://en.wikipedia.org/w/api.php?action=query&prop=langlinks&lllimit=500'
    + `&redirects=1&format=json&titles=${encodeURIComponent(영문문서)}`;
}

/** 리디렉트를 따라간 «본문서» 이름. 리디렉트가 아니면 null */
export function 본문서이름(묶음, 준이름) {
  const 쪽들 = 묶음?.query?.pages;
  if (!쪽들) return null;
  const 쪽 = Object.values(쪽들)[0];
  if (!쪽 || 쪽.missing !== undefined || !쪽.title) return null;
  return 쪽.title !== String(준이름) ? 쪽.title : null;
}

/** langlinks 답 → {판: 그 판의 제목}. ⛔ 못 읽으면 null — 빈 표로 내지 않는다 */
export function 판제목읽기(묶음) {
  const 쪽들 = 묶음?.query?.pages;
  if (!쪽들) return null;
  const 쪽 = Object.values(쪽들)[0];
  if (!쪽 || 쪽.missing !== undefined) return null;
  const 표 = new Map();
  for (const l of 쪽.langlinks ?? []) if (l?.lang && l['*']) 표.set(l.lang, l['*']);
  return 표;
}

/** 자료 묶음 → {날: 수} 표. ⛔ 없는 날은  — 아예 안 넣는다 */
export function 날표만들기(묶음) {
  const 표 = new Map();
  for (const it of 묶음?.items ?? []) {
    const t = String(it?.timestamp ?? '');
    const m = /^(\d{4})(\d{2})(\d{2})/.exec(t);
    if (!m || !Number.isFinite(Number(it?.views))) continue;
    표.set(`${m[1]}-${m[2]}-${m[3]}`, Number(it.views));
  }
  return 표;
}

/** 어느 날이 가장 많이 열렸나. ⛔ 비어 있으면 null — 0 으로 답하지 않는다 */
export function 가장많은날(표) {
  let 답 = null;
  for (const [날, 수] of 표 ?? []) if (답 === null || 수 > 답.수) 답 = { 날, 수 };
  return 답;
}

/** 그 날을 뺀 나머지의 하루 평균. ⛔ 나머지가 없으면 null */
export function 그날빼고평균(표, 뺄날) {
  const 다 = [...(표 ?? [])].filter(([날]) => 날 !== 뺄날).map(([, 수]) => 수);
  if (!다.length) return null;
  return 다.reduce((a, b) => a + b, 0) / 다.length;
}

/** 몇 배. ⛔ 바닥이 0 이면 못 잰다(null) — 0 으로 나누지 않는다 */
export function 배수(큰값, 바닥) {
  const a = Number(큰값); const b = Number(바닥);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= 0) return null;
  return a / b;
}

export function 명단읽기(길 = 명단길) {
  const 날것 = JSON.parse(fs.readFileSync(길, 'utf8'));
  const 목록 = Array.isArray(날것) ? 날것
    : (날것.people ?? Object.values(날것).find(Array.isArray) ?? []);
  const 표 = new Map();
  for (const p of 목록) if (p?.slug) 표.set(p.slug, { 이름: p.name, 영문문서: p.wikiPage ?? p.name });
  return 표;
}

async function 받기(u, 남은 = 참는횟수) {
  try {
    const r = await fetch(u, { headers: { 'user-agent': 'KCultureWire/1.0 (kculturewire.com)' } });
    if (r.status === 429 && 남은 > 0) {
      const 기다림 = Math.min(Number(r.headers.get('retry-after')) || 5, 60);
      await 쉬기((기다림 + 1) * 1000);
      return 받기(u, 남은 - 1);
    }
    if (r.status === 404) return { 없다: true };      /* 그 판에 문서가 없다 — 못 잰 것이 아니다 */
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

/* ── 자가시험 ─────────────────────────────────────────────────────────── */
export function 자가시험() {
  const 결과 = [];
  const 본다 = (이름, 참, 덧 = '') => 결과.push({ 이름, 참: !!참, 덧 });

  본다('날을 UTC 로 적는다', 날글(new Date(Date.UTC(2026, 9, 3))) === '2026-10-03');
  본다('한 자리에 0 을 채운다', 날글(new Date(Date.UTC(2026, 0, 3))) === '2026-01-03');
  본다('빗금을 뗀 꼴을 만든다', 붙인날('2026-10-03') === '20261003');
  본다('주소에 user 트래픽이 든다 — 봇을 뺀다',
    주소('en', 'T.O.P', '2026-10-01', '2026-10-03').includes('/all-access/user/'));
  본다('빈칸을 밑줄로 바꾼다',
    주소('en', 'Nana (entertainer)', '2026-10-01', '2026-10-03').includes('Nana_(entertainer)')
    || 주소('en', 'Nana (entertainer)', '2026-10-01', '2026-10-03').includes('Nana_%28entertainer%29'));

  {
    const 표 = 날표만들기({ items: [
      { timestamp: '2026100100', views: 100 },
      { timestamp: '2026100200', views: 300 },
      { timestamp: '2026100300', views: 200 },
      { timestamp: '2026100400', views: 'x' },        /* ⛔ 수가 아니면 안 넣는다 */
    ] });
    본다('날짜를 빗금 꼴로 읽는다', 표.get('2026-10-02') === 300);
    본다('⛔ 수가 아닌 것은 안 넣는다 — ', !표.has('2026-10-04'));
    본다('가장 많은 날을 집는다', 가장많은날(표)?.날 === '2026-10-02');
    본다('⛔ 빈 표면 null — 0 으로 답하지 않는다', 가장많은날(new Map()) === null);
    본다('그날을 뺀 평균을 낸다', 그날빼고평균(표, '2026-10-02') === 150);
    본다('⛔ 나머지가 없으면 null', 그날빼고평균(new Map([['a', 1]]), 'a') === null);
    본다('배수를 낸다', 배수(300, 150) === 2);
    본다('⛔ 바닥이 0 이면 못 잰다', 배수(300, 0) === null);
    본다('⛔ 바닥이 null 이면 못 잰다', 배수(300, null) === null);
  }

  {
    /* 🔴 거짓 「없다」를 막는 자리 — 2026-10-04 에 실제로 틀렸던 그 자리다 */
    const 답 = { query: { pages: { 123: { title: 'Nana (entertainer)', langlinks: [
      { lang: 'id', '*': 'Nana (penyanyi)' }, { lang: 'vi', '*': 'Nana (ca sĩ)' },
    ] } } } };
    const 표 = 판제목읽기(답);
    본다('🔴 판마다 다른 제목을 읽는다', 표.get('id') === 'Nana (penyanyi)');
    본다('🔴 비라틴 제목도 그대로 쓴다', 판제목읽기({ query: { pages: { 1: { langlinks: [
      { lang: 'th', '*': 'นานา (นักร้อง)' }] } } } }).get('th') === 'นานา (นักร้อง)');
    본다('⛔ 없는 판은 표에 안 넣는다', !표.has('th'));
    본다('⛔ 문서 자체가 없으면 null', 판제목읽기({ query: { pages: { '-1': { missing: '' } } } }) === null);
    본다('⛔ 답을 못 읽으면 null — 빈 표로 내지 않는다', 판제목읽기(null) === null);
    본다('langlinks 가 없으면 빈 표 — 그 이름은 영문판에만 있다',
      판제목읽기({ query: { pages: { 1: { title: 'x' } } } }).size === 0);
    본다('제목 묻는 주소가 langlinks 를 부른다',
      판제목주소('T.O.P').includes('prop=langlinks'));
    /* 🔴 [2026-10-04] 리디렉트를 안 풀어 「Keria 하루 10회」 같은 거짓 수가 나왔다 */
    본다('🔴 제목 묻는 주소가 리디렉트를 따라간다',
      판제목주소('Keria').includes('redirects=1'));
    본다('🔴 리디렉트면 본문서 이름을 낸다',
      본문서이름({ query: { pages: { 1: { title: 'Ryu Min-seok' } } } }, 'Keria') === 'Ryu Min-seok');
    본다('⛔ 리디렉트가 아니면 null — 괜히 갈아타지 않는다',
      본문서이름({ query: { pages: { 1: { title: 'T.O.P' } } } }, 'T.O.P') === null);
    본다('⛔ 문서가 없으면 null',
      본문서이름({ query: { pages: { '-1': { missing: '' } } } }, 'x') === null);
    본다('⛔ 답을 못 읽으면 null', 본문서이름(null, 'x') === null);
  }

  본다('명단에서 이름을 찾는다', 명단읽기().get('top')?.영문문서 === 'T.O.P');
  본다('괄호가 든 문서 이름도 그대로 쓴다',
    명단읽기().get('nana')?.영문문서 === 'Nana (entertainer)');

  const 빨강 = 결과.filter((r) => !r.참).length;
  console.log('■ 이름 하루치 읽힘 — 자가시험');
  for (const r of 결과) console.log(`  ${r.참 ? '✅' : '🔴'} ${r.이름}${r.덧 ? `  (${r.덧})` : ''}`);
  console.log(빨강 ? `🔴 빨강 ${빨강}개` : `✅ ${결과.length}가지 다 통과`);
  return 빨강 === 0;
}

/* ── 혼자 돌 때 ───────────────────────────────────────────────────────── */
const 내가실행됐다 = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (내가실행됐다) {
  if (process.argv.includes('--selftest') || process.argv.includes('--자가시험')) {
    process.exit(자가시험() ? 0 : 1);
  }
  const 값 = (이름, 기본) => {
    const x = process.argv.find((a) => a.startsWith(`--${이름}=`));
    return x ? x.split('=').slice(1).join('=') : 기본;
  };
  const 슬러그들 = String(값('이름', '')).split(',').map((s) => s.trim()).filter(Boolean);
  /* ⚠ [2026-10-04] e스포츠 선수들(Faker·Knee·Zeka)이 우리 사람 명단에 없었다.
     명단은 넷플릭스·차트에서 온 이름들이라 e스포츠가 빠져 있다.
     ⛔ 그렇다고 일회용 스크립트를 또 쓰면 이 자를 만든 뜻이 없어진다.
     ⇒ 영문 문서 이름을 «곧바로» 줄 수 있게 연다. 세미콜론으로 여럿. */
  const 바로문서 = String(값('문서', '')).split(';').map((s) => s.trim()).filter(Boolean);
  const 판들 = String(값('판', 기본판.join(','))).split(',').map((s) => s.trim()).filter(Boolean);
  const 날수 = Math.max(2, Number(값('날수', 기본날수)) || 기본날수);
  if (!슬러그들.length && !바로문서.length) {
    console.log('⛔ 쓰는 법: node scripts/measure-kcw-name-days.mjs --이름=top,nana [--판=en,id] [--날수=14]');
    console.log('           node scripts/measure-kcw-name-days.mjs --문서="Faker (gamer);Knee (gamer)"');
    process.exit(1);
  }

  const 명단 = 명단읽기();
  /* ⚠ 위키미디어 하루치는 하루 늦게 확정된다 — 끝날을 어제로 둔다 */
  const 끝 = 날글(하루전(Date.now(), 1));
  const 첫 = 날글(하루전(Date.now(), 날수));

  console.log(`\n■ 이름 하루치 읽힘 — ${첫} ~ ${끝} (UTC) · 판 ${판들.join('·')}`);
  console.log('   ⛔ 읽힘은 인기가 아니다. 문서가 열린 횟수다 (봇 제외)\n');

  const 모은것 = { 잰때: new Date().toString(), 첫, 끝, 판들, 것들: [] };
  /* 명단에서 온 것과 손으로 준 문서를 한 줄로 세운다 — 아래 고리는 하나다 */
  const 잴것들 = [
    ...슬러그들.map((s) => ({ 키: s, 사람: 명단.get(s) ?? null })),
    ...바로문서.map((t) => ({ 키: t, 사람: { 이름: t.replace(/\s*\(.*\)$/, ''), 영문문서: t } })),
  ];
  for (const { 키: s, 사람 } of 잴것들) {
    if (!사람) { console.log(`  ⬜ ${s} — 우리 명단에 없다 (--문서= 로 바로 줄 수 있다)`); continue; }
    console.log(`  ${사람.이름}  (${사람.영문문서})`);
    /* 🔴 판마다 «그 판의 제목»을 먼저 묻는다 — 영문 제목을 그대로 던지면 거짓 「없다」가 난다 */
    const 답 = await 받기(판제목주소(사람.영문문서));
    const 판제목 = 판제목읽기(답);
    /* 🔴 리디렉트면 본문서로 갈아탄다 — 안 갈아타면 거짓으로 «적은» 수가 나온다 */
    const 본이름 = 본문서이름(답, 사람.영문문서);
    const 영문 = 본이름 ?? 사람.영문문서;
    if (본이름) console.log(`     ↪ 리디렉트다 — 본문서 「${본이름}」 로 잰다`);
    await 쉬기(판제목쉼);
    if (판제목 === null) console.log('     ⚠ 판별 제목을 못 받았다 — 영문 제목으로 재 본다');
    for (const 판 of 판들) {
      const 제목 = 판 === 'en' ? 영문
        : (판제목 ? 판제목.get(판) : 영문);
      if (판제목 && !제목) { console.log(`     ⬜ ${판} — 그 판에 이 문서가 «정말로» 없다 (위키백과가 그렇게 답했다)`); continue; }
      const j = await 받기(주소(판, 제목, 첫, 끝));
      await 쉬기(사이쉼);
      if (j?.없다) { console.log(`     ⬜ ${판} — 「${제목}」 하루치가 없다`); continue; }
      if (!j) { console.log(`     ⬜ ${판} — 못 쟀다`); continue; }
      const 표 = 날표만들기(j);
      const 꼭대기 = 가장많은날(표);
      if (!꼭대기) { console.log(`     ⬜ ${판} — 받은 날이 없다`); continue; }
      const 바닥 = 그날빼고평균(표, 꼭대기.날);
      const 몇배 = 배수(꼭대기.수, 바닥);
      console.log(`     ${판}  ${판 === 'en' ? '' : `「${제목}」  `}`
        + `꼭대기 ${꼭대기.날} ${꼭대기.수.toLocaleString('en-US')}회`
        + `  ·  그날 빼고 하루 ${바닥 === null ? '못 쟀다' : Math.round(바닥).toLocaleString('en-US')}`
        + `  ·  ${몇배 === null ? '배수 못 잼' : `${몇배.toFixed(1)}배`}`);
      모은것.것들.push({ 슬러그: s, 이름: 사람.이름, 문서: 사람.영문문서, 판, 판제목: 제목,
        날별: Object.fromEntries(표), 꼭대기, 그날빼고하루: 바닥, 배수: 몇배 });
    }
  }

  fs.mkdirSync(낼방, { recursive: true });
  /* 파일 이름에 못 쓰는 글자를 걷는다 — 「Faker (gamer)」 같은 문서 이름이 들어온다 */
  const 이름조각 = 잴것들.map((x) => String(x.키).replace(/[^A-Za-z0-9가-힣]+/g, '-')
    .replace(/^-|-$/g, '').toLowerCase()).filter(Boolean).join('-').slice(0, 80);
  const 낼곳 = path.join(낼방, `${끝}-${이름조각 || '잰것'}.json`);
  fs.writeFileSync(낼곳, JSON.stringify(모은것, null, 2) + '\n', 'utf8');
  console.log(`\n■ 적었다 — ${path.relative(뿌리, 낼곳)}`);
  console.log('⛔ 왜 튀었는지는 이 자가 모른다. 밖에서 확인해 기사에 출처로 단다.');
}
