#!/usr/bin/env node
/**
 * build-kcw-birthday-pages.mjs — **「같은 생일인 한국 스타」 지면.** (`/born-on/<mm-dd>`)
 *
 * ── 왜 이 축인가 (짐작이 아니라 재서 골랐다) ──────────────────
 * 사장님: 「스타 이름, 아이돌 그룹이름이 제일 많이 검색하지 않나? … 온 사람들한테는
 * **잊지 못할 콘텐트와 커뮤니티**를 주면 계속 재방문하겠지?」 · 「**키워드 검색량을 재서 해.**」
 *
 * 자동완성으로 잰 것(2026-08-22) —
 * ```
 * iu birthday        10줄      jungkook birthday  10줄
 * kpop birthdays     10줄      bts birthdays       9줄
 * byeong day stem     0줄  ←  내가 그 전날 지면 열 장의 이름으로 쓴 말
 * ```
 * 그리고 상위 100명에 붙일 수 있는 축을 세 보니 —
 * 동남아 읽힘 49/100 · 배우 작품 41/100 · **같은 날 태어난 사람 100/100(평균 26.1명)**.
 * ⇒ 한 사람 한 장을 지금 100장 만들면 절반이 빈 장이 된다. **모두에게 있는 축**으로 간다.
 *
 * ── 머물게 하는 구조 ─────────────────────────────────────────
 * ① 제목에 **가장 많이 읽힌 사람의 이름**을 세운다 — 손님이 치는 말이 이름이다
 * ② 한 장에 그 날 태어난 사람이 다 있다 — **이름에서 이름으로** 걷는다
 * ③ 어제·내일로 이어진다 — 자기 생일을 찾아 들어온 사람이 옆으로 걷는다
 * ④ 읽힌 수를 같이 적는다 — 그 수는 달마다 움직인다(다시 올 까닭)
 *
 * ⛔ 점을 치지 않는다. 「같은 날 태어났다」는 같은 날 태어난 것 말고 아무 뜻이 없다고 적는다.
 * ⛔ 화면에 우리말을 쓰지 않는다. 한글 이름만 있는 사람은 **셈에는 넣고 목록에서 뺀다**(그 수를 적는다).
 * ⚠ 이름은 위키데이터에서 캔 것만 쓴다. 읽힌 수는 위키백과 실측이지 검색량이 아니다.
 *
 * 쓰는 법  node scripts/build-kcw-birthday-pages.mjs --자가시험
 *          node scripts/build-kcw-birthday-pages.mjs
 */
import fs from 'node:fs';
import { 꼬리말 } from './kcw-static-footer.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
/* 잡음 시험은 «한 벌»만 둔다 — 두 벌이 되면 씨앗이 갈려 같은 수가 두 값으로 나온다 */
import { 난수기, 분위, 씨앗 as 잡음씨앗 } from './lib/noise-test.mjs';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 원자료 = path.join(뿌리, 'archive/raw/wikidata/korean-entertainers-birth.json');
const 수요길 = path.join(뿌리, 'src/data/wikitip-star-demand.json');
const 낼방 = path.join(뿌리, 'public/wikitip/born-on');
/* 태어난 해 지면이 «있는» 해만 링크로 건다. ⛔ 없는 해에 걸면 죽은 링크가 된다.
   ⚠ 파일이 없으면 «빈 집합»으로 둔다 — 그러면 링크를 안 걸 뿐 이 빌더가 서지는 않는다.
     빌더 하나가 다른 빌더의 산출물에 목숨을 걸면, 순서가 바뀔 때 둘 다 못 돈다. */
const 해지면길 = path.join(뿌리, 'src/data/kcw-birth-year-pages.json');
const 해지면있나 = new Set(
  fs.existsSync(해지면길)
    ? (JSON.parse(fs.readFileSync(해지면길, 'utf8')).years ?? []).map((y) => String(y.year))
    : [],
);
const 낼자료 = path.join(뿌리, 'src/data/wikitip-birthday-pages.json');

/* 🔴 [2026-08-27 15:2x · 5번] **이 지면들이 「kpop」으로 찾으면 6페이지에 있었다.**
   GSC 로 28일 재 보니 이 지면에 오는 검색어가 일곱인데 갈림이 뚜렷했다 —
     「kpop」이 «있는» 다섯 개  → 순위 54 · 55 · 56 · 63 · 63
     「kpop」이 «없는» 두 개   → 순위 **9 · 12**
   지면에 「K-pop」이라는 낱말이 **한 번도 없었기** 때문이다.

   ⛔ 그렇다고 제목에 그냥 적을 수 없었다 — **누가 가수인지 우리가 몰랐다.**
     원자료 칸은 q·name·born·sitelinks 넷뿐이다. 모르는 것을 적는 것은 강령 ① 위반이다.
   ⭐ 그래서 «캤다» — `scripts/fetch-kcw-entertainer-roles.mjs` 가 위키데이터에서
     P463(소속 음악 그룹)을 9,249명치 받아 왔다. 1,900명(20.5%)이 그룹 소속이다.
     이제 「K-pop 그룹 소속 N명」은 **지어낸 말이 아니라 잰 사실**이다.
   ⚠ 파일이 없으면 빈 집합으로 둔다 — 그러면 제목이 예전 꼴로 돌아갈 뿐 빌더는 선다. */
const 역할길 = path.join(뿌리, 'archive/raw/wikidata/korean-entertainers-roles.json');
const 그룹소속 = new Set(
  fs.existsSync(역할길)
    ? Object.entries(JSON.parse(fs.readFileSync(역할길, 'utf8')).사람 ?? {})
      .filter(([, v]) => v && v.grp).map(([q]) => q)
    : [],
);

/* 🔴 [2026-10-04] 같은 파일의 «갈래» 칸은 한 번도 안 쓰고 있었다 — 그 날만의 수에 쓴다.
   ⛔ 파일이 없으면 빈 지도로 둔다. 그러면 그 줄만 안 나올 뿐 빌더는 선다.
   ⛔⛔ 자료의 갈래는 한국어다(연기·노래·둘다). **여기는 영문 사이트다** —
     한국어를 그대로 내보내면 손님 화면에 한글이 샌다. 영어로 옮겨서 쓴다.
     ⚠ 「미확인」은 아예 안 센다 — 모르는 것을 세면 수가 거짓이 된다(강령 ③). */
export const 갈래영문 = {
  연기: 'actors', 노래: 'singers', 둘다: 'both', 기타: 'other',
};
export const 갈래보기 = new Map(
  fs.existsSync(역할길)
    ? Object.entries(JSON.parse(fs.readFileSync(역할길, 'utf8')).사람 ?? {})
      .filter(([, v]) => v && 갈래영문[v.갈래])
      .map(([q, v]) => [q, 갈래영문[v.갈래]])
    : [],
);

export const 달이름 = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

export const 라틴이름 = (이름) => /^[A-Za-z0-9À-ɏḀ-ỿ' .,\-()&+/]+$/.test(String(이름));

/** 괄호 설명을 뗀 영문 문서 제목 — 위키백과가 쓰는 이름이다(지어낸 것이 아니다) */
export const 영문이름 = (p) => (라틴이름(p.name) ? p.name
  : (p.enTitle && 라틴이름(p.enTitle) ? String(p.enTitle).replace(/\s*\([^)]*\)\s*$/, '') : null));

export const 날쓰기 = (mmdd) => {
  const [m, d] = mmdd.split('-').map(Number);
  return `${d} ${달이름[m - 1]}`;
};

/** 하루 옆으로 — 윤달 2월 29일도 자리를 둔다(그 날 태어난 사람이 실재한다) */
export function 옆날(mmdd, 걸음) {
  const 날수 = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let [m, d] = mmdd.split('-').map(Number);
  d += 걸음;
  while (d < 1) { m = m === 1 ? 12 : m - 1; d += 날수[m - 1]; }
  while (d > 날수[m - 1]) { d -= 날수[m - 1]; m = m === 12 ? 1 : m + 1; }
  return `${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/**
 * 사람들을 생일(월-일)로 나눈다. 읽힌 수가 있으면 붙이고, 많이 읽힌 순으로 세운다.
 * @param {{name:string,born:string,sitelinks:number,q:string}[]} 사람들
 * @param {Map<string,{reads:number,enTitle:string}>} 수요 q → 읽힌 수
 */
export function 날별로(사람들, 수요 = new Map()) {
  const 날 = new Map();
  for (const p of 사람들) {
    const k = String(p.born).slice(5);
    if (!/^\d{2}-\d{2}$/.test(k)) continue;
    const 잰것 = 수요.get(p.q);
    const 줄 = { ...p, reads: 잰것?.reads ?? null, enTitle: 잰것?.enTitle ?? null };
    (날.get(k) ?? 날.set(k, []).get(k)).push(줄);
  }
  for (const [, v] of 날) {
    v.sort((a, b) => (b.reads ?? -1) - (a.reads ?? -1) || b.sitelinks - a.sitelinks
      || String(a.name).localeCompare(String(b.name)));
  }
  return 날;
}

const 벗 = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/**
 * 🔴🔴 [2026-10-04 04:1x] **그 날에만 있는 수를 센다 — 겹침을 줄이려고.**
 *
 *   KCW 표본 8장 중 5장이 「Crawled - currently not indexed」였다. 구글이 보고도 안 넣었다.
 *   본문은 3,500자로 얇지 않았다. `check-page-sameness.mjs` 로 재 보니 —
 *
 *   ```
 *   /born-on 세 장이 서로 74~79% 겹친다
 *   그 지면에만 있는 낱말  266개 중 16개 (6%)
 *   ```
 *
 *   겹치는 몫은 **설명 글**이다(「이것은 세는 것이지 판정이 아니다」 따위).
 *   ⛔ 그것은 우리 강령이라 지울 수 없다. 그러면 «그 날만의 것»을 늘리는 수밖에 없다.
 *
 * ⭐ 지어내지 않는다. **쥔 자료의 안 쓰던 축**을 센다 — 사장님 강령 그대로.
 *   원자료에 이미 있는데 지면이 한 번도 안 쓴 것 셋 —
 *     ① sitelinks   그 사람이 몇 개 언어판에 있나 — 「세계에 얼마나 닿았나」
 *     ② 갈래        노래냐 연기냐 — 그날의 «결»
 *     ③ born 의 해   가장 이른 해와 늦은 해 — 그날이 걸친 «세대 폭»
 *
 * ⛔ 못 센 것은 null 로 둔다. (강령 ③).
 */
export function 그날만의수(사람들, 갈래보기 = null) {
  const 들 = (사람들 || []).filter(Boolean);
  if (!들.length) return null;

  const 해들 = 들.map((p) => Number(String(p.born ?? '').slice(0, 4)))
    .filter((y) => Number.isFinite(y) && y > 1800 && y < 2200);
  const 링크 = 들.map((p) => Number(p.sitelinks)).filter((n) => Number.isFinite(n) && n >= 0);

  const 갈래셈 = new Map();
  for (const p of 들) {
    const g = 갈래보기 ? 갈래보기(p.q) : null;
    if (!g) continue;
    갈래셈.set(g, (갈래셈.get(g) ?? 0) + 1);
  }

  return {
    사람수: 들.length,
    이른해: 해들.length ? Math.min(...해들) : null,
    늦은해: 해들.length ? Math.max(...해들) : null,
    세대폭: 해들.length ? Math.max(...해들) - Math.min(...해들) : null,
    해를아는사람: 해들.length,
    언어판합: 링크.length ? 링크.reduce((a, b) => a + b, 0) : null,
    가장널리: 링크.length ? Math.max(...링크) : null,
    갈래: [...갈래셈.entries()].sort((a, b) => b[1] - a[1]),
    갈래아는사람: [...갈래셈.values()].reduce((a, b) => a + b, 0),
  };
}

/** 그 날만의 수를 글로. ⛔ 못 센 칸은 «적지 않는다» —  */
export function 그날만의칸(수, 날글) {
  if (!수 || 수.사람수 < 2) return '';
  const 줄 = [];

  if (수.세대폭 !== null && 수.해를아는사람 >= 2) {
    줄.push(`<li><strong>${수.세대폭} years apart.</strong> The earliest was born in `
      + `${수.이른해} and the latest in ${수.늦은해}`
      + (수.해를아는사람 < 수.사람수 ? `, counting the ${수.해를아는사람} whose birth year we hold` : '')
      + '.</li>');
  }
  if (수.언어판합 !== null) {
    줄.push(`<li><strong>${수.언어판합} Wikipedia editions</strong> carry these people between them`
      + (수.가장널리 !== null ? `, and the most widely carried one appears in ${수.가장널리}` : '')
      + '. That is reach, not fame — an edition either exists or it does not.</li>');
  }
  if (수.갈래.length) {
    const 쓴것 = 수.갈래.slice(0, 4).map(([g, n]) => `${n} ${벗(g)}`).join(' &middot; ');
    줄.push(`<li><strong>What they do:</strong> ${쓴것}`
      + (수.갈래아는사람 < 수.사람수
        ? ` — of the ${수.갈래아는사람} we hold an occupation for` : '')
      + '.</li>');
  }
  if (!줄.length) return '';

  return `<section class="only-today">
    <h2>What only ${벗(날글)} has</h2>
    <ul>${줄.join('')}</ul>
    <p class="fine">These come from the same Wikidata record as the list above. Where we do not
    hold a figure we leave the line out rather than print a zero.</p>
  </section>`;
}

/**
 * 🔴🔴 [2026-08-26 · 5번이 재서 고침] **생일 지면 366장이 이름을 «글자로만» 싣고 있었다.**
 * ─────────────────────────────────────────────────────────────────────────────
 * [무엇이 있었나] 갈래마다 「다음 걸음이 어디 있나」를 전수로 재 보니 born-on 이
 *   **지면당 안쪽 링크 1개**로 나왔다. 극단값이라 자를 먼저 의심하고 열어 봤더니 —
 *   그 한 개는 본문 링크 하나뿐이었고, **표에 실린 사람 이름 스무 남짓이 전부 글자**였다.
 *
 * ⛔ 어제 사람 지면 636장을 냈는데 그리로 가는 링크가 **여기서 0개**였다.
 *   그 636장은 지금 구글에서 「발견만」에 머물러 있다. 안쪽 링크가 색인을 끌어오는
 *   가장 큰 힘인데, 가장 자연스러운 문(같은 날 태어난 사람 목록)이 닫혀 있었다.
 *   366장 × 스무 이름 = 수천 개의 문이 닫혀 있던 셈이다.
 *
 * ⛔ **없는 지면으로 링크를 걸지 않는다.** 사람 지면은 「최소편수 2」를 넘긴 사람만
 *   있다. 표에 있다고 다 있는 것이 아니다 — 있는 것만 건다.
 * ⛔ **같은 이름이 둘이면 걸지 않는다.** 로마자 이름이 겹치는 사람이 실제로 있다
 *   (그래서 person 쪽에 sameNameAs 가 있다). 하나를 골라 걸면 손님을 «다른 사람»에게
 *   보낸다. 안 거는 것이 낫다 — 틀린 문은 없는 문보다 나쁘다.
 * ⚠ 이름은 두 자리에서 온다 — people.name 과 people.wikiPage 가 다를 수 있다
 *   (「Lee You-mi」 / 「Lee Yoo-mi」). 둘 다로 찾는다.
 */
/**
 * 🔴 [2026-09-04 · 사장님 지시로 붙임] **「366일 가운데 몇째로 붐비는 날인가」.**
 *
 * ── 왜 이 층이 생겼나 ────────────────────────────────────────
 * 사장님: **「내가 2번에게 하라고 한 일 적극적으로 참여해」**
 * 2번이 올려 사장님이 승인하신 셋 가운데 첫째가 이것이다 —
 *   「숫자 하나 넣으면 **내 위치가 상위 몇 %인지** 보여주는 결과물 — 캡처해서 SNS에
 *    올리고 싶어지는 형태로. **판단을 얹지 않고 사실(통계 위치)만** 보여준다」
 *
 * 이 366장은 「이 날 태어난 스타 N명」까지만 말하고 **그 N 이 많은 것인지 적은 것인지를
 * 말하지 않았다.** 손님이 자기 생일을 찾아 들어와도 가져갈 «한 줄»이 없었다.
 *
 * ── ⛔ 이 층이 지키는 것 ─────────────────────────────────────
 * ⛔ **「특별한 날」이라고 하지 않는다.** 순위는 사실이고 뜻은 우리가 붙이지 않는다.
 * ⛔ 🔴 **순위만 말하면 거짓말이 된다.** 하루 평균이 서른몇 명이니 두세 명 차이는 우연이다.
 *   그래서 «우연히 나올 수 있는 폭»(잡음 띠)을 같이 내고, 그 안이면 **「잡음 안」**이라고 적는다.
 *   ⭐ 이것이 회사의 셋째 자리(리스크관리)가 이 지면에서 하는 일이다 —
 *     자기 생일이 300등이라고 서운해할 사람에게 «그 등수가 우연이다»를 같은 줄에서 말해 준다.
 * ⛔ 동률을 숨기지 않는다. 같은 수인 날이 열둘이면 열둘이 같은 등수다(경쟁식 순위).
 * ⛔ 평균만 앞세우지 않는다 — 중간값·가장 붐빈 날·가장 한산한 날을 함께 싣는다.
 */
/**
 * 🔴 **기록 관행이 만든 날.** 여기 적힌 날은 「많이 태어난 날」이 아니다.
 *
 * ⭐ 이것을 잰 것은 오늘 아침이다(`build-kcw-kpop-birthday-months.mjs`) —
 *   K팝 멤버 1,295명 가운데 **1월 1일에 13명**이 몰려 있었고 그것은 하루평균의 **3.67배**였다.
 *   여기 9,249명 명단에서도 1월 1일이 **48명**으로 366일 가운데 1등이고, 중간값은 25명이다.
 *
 * ⛔ **생년만 아는 사람을 1월 1일로 채워 넣는 것이 널리 쓰이는 관행이다.** 그러니 이 날의
 *   1등은 사람이 아니라 서류다. 알면서 「가장 붐비는 날」이라고 내보내는 것은 거짓이다.
 * ⛔ **그렇다고 지우지 않는다.** 지우면 왜 그 날이 비는지 아무도 모른다.
 *   ✅ 대신 그 날 지면에 «까닭»을 적고, 다른 날 지면에서 그 날을 가리킬 때 표식을 붙인다.
 * ⚠ 2월 28일도 48명으로 같이 1등이다. **그 까닭은 못 쟀다** — 그러니 아무 말도 붙이지 않는다.
 *   짐작으로 표식을 붙이면 그 표식 자체가 못 믿을 것이 된다.
 */
export const 채운날 = new Map([
  ['01-01', 'the date records fall back on when only a birth year is known, '
    + 'so this count includes people whose real birthday is unknown'],
]);

export function 자리매기기(날들) {
  const 목 = (Array.isArray(날들) ? 날들 : [])
    .filter((x) => x && typeof x.day === 'string' && Number.isFinite(Number(x.people)))
    .map((x) => ({ day: x.day, people: Number(x.people) }));
  const 전체 = 목.length;
  const 표 = new Map();
  if (!전체) return { 표, 전체: 0, 중간: null, 가장많음: null, 가장적음: null };

  const 내림 = [...목].sort((a, b) => b.people - a.people);
  /* 경쟁식 순위 — 같은 수는 같은 등수를 받고, 그다음 등수는 그만큼 건너뛴다 */
  let 앞수 = null; let 앞순위 = 0;
  const 수마다 = new Map();
  for (const x of 내림) 수마다.set(x.people, (수마다.get(x.people) ?? 0) + 1);
  for (let i = 0; i < 내림.length; i += 1) {
    const x = 내림[i];
    if (x.people !== 앞수) { 앞순위 = i + 1; 앞수 = x.people; }
    /* 「N일보다 붐빈다」 — 등수보다 읽기 쉽고 오해가 적다 */
    const 밑에있는날 = 목.filter((y) => y.people < x.people).length;
    표.set(x.day, {
      순위: 앞순위,
      전체,
      동률: 수마다.get(x.people) ?? 1,
      사람: x.people,
      밑에있는날,
      몫: Math.round((밑에있는날 / (전체 - 1)) * 1000) / 10,
    });
  }
  const 값 = 목.map((x) => x.people).sort((a, b) => a - b);
  return {
    표,
    전체,
    중간: 값[Math.floor(값.length / 2)],
    가장많음: 내림[0],
    가장적음: 내림[내림.length - 1],
  };
}

/**
 * **우연히 나올 수 있는 하루 인원의 폭.**
 * 같은 총인원을 366일에 «고르게» 흩뿌리기를 여러 번 하고, 하루 인원의 5~95% 구간을 낸다.
 * ⚠ 2월 29일은 4년에 한 번이라 다른 날보다 4분의 1로 적게 나온다 — 그래서 «날 가중»을 준다.
 *   그러지 않으면 2월 29일이 늘 「가장 한산한 날」로 뽑히고 그것은 자료가 아니라 달력이다.
 */
export function 잡음띠(총사람, 날수 = 366, 횟수 = 400, 씨 = 잡음씨앗) {
  const n = Number(총사람);
  if (!Number.isFinite(n) || n <= 0 || !(날수 > 0)) return null;
  const 난수 = 난수기(씨);
  const 모은것 = [];
  for (let r = 0; r < 횟수; r += 1) {
    const 통 = new Array(날수).fill(0);
    for (let i = 0; i < n; i += 1)통[Math.floor(난수() * 날수)] += 1;
    모은것.push(...통);
  }
  return {
    아래: 분위(모은것, 0.05),
    위: 분위(모은것, 0.95),
    횟수,
    씨앗: 씨,
    날수,
  };
}

/** 이 날이 잡음 안인가 밖인가. ⛔ 「특별하다」고 하지 않는다 — 세 마디뿐이다 */
export function 잡음판정(사람, 띠) {
  if (!띠 || !Number.isFinite(Number(사람))) return '못 쟀다';
  const v = Number(사람);
  if (v > 띠.위) return '붐빈다';
  if (v < 띠.아래) return '한산하다';
  return '잡음 안';
}

/**
 * 🔴🔴 [2026-10-04 04:5x] **사람 지면 634장으로 가는 문이 거의 닫혀 있었다.**
 *
 *   12월 7일 지면은 「15 Korean stars born on 7 December」라 적어 놓고
 *   이름 열다섯을 다 실었는데 **`/person/` 링크는 한 개**뿐이었다.
 *   (이 파일 2026-08-26 주석이 「636장이 발견만에 머물러 있다」고 적은 바로 그 문제다.
 *    그때 문을 열었다고 적었는데, 재 보니 한 명밖에 안 열려 있었다.)
 *
 *   까닭 — 이름표를 **이름 글자**로 맞췄다. 표기가 조금만 달라도 못 맞춘다:
 *   `Lee You-mi`(생일 자료) ↔ `Lee Yoo-mi`(사람 지면). 사람 이름 로마자는 늘 흔들린다.
 *
 * ⭐ 그런데 **두 자료가 둘 다 위키데이터 ID(`q`)를 들고 있다.** 그것으로 맞추면
 *   글자가 어떻게 흔들려도 정확히 맞는다. 이름은 «못 맞췄을 때의 뒷길»로 남긴다.
 *
 * ⛔ 겹친 이름은 여전히 뺀다 — 틀린 사람에게 보내느니 안 건다.
 *   ⚠ q 는 겹치지 않는다(위키데이터가 하나씩 준다). 뺄 까닭이 없다.
 */
export function 이름표만들기(사람들 = []) {
  const 표 = new Map();
  const q표 = new Map();
  const 겹친것 = new Set();
  const 키 = (s) => String(s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
  for (const p of 사람들) {
    if (!p?.slug) continue;
    if (p.q) q표.set(String(p.q), p.slug);
    for (const 이름 of [p.name, p.wikiPage]) {
      const k = 키(이름);
      if (!k) continue;
      const 있던 = 표.get(k);
      if (있던 && 있던 !== p.slug) { 겹친것.add(k); continue; }
      표.set(k, p.slug);
    }
  }
  /* 겹친 이름은 «빼» 버린다 — 틀린 사람에게 보내느니 안 건다 */
  for (const k of 겹친것) 표.delete(k);
  return { 표, q표, 겹친수: 겹친것.size };
}

/**
 * 이름 하나를 링크로 감싼다. 없으면 글자 그대로 — ⛔ 지어내지 않는다.
 * ⭐ q 를 먼저 본다(정확하다). 없을 때만 이름 글자로 뒷길을 간다.
 */
/**
 * 🔴🔴 [2026-10-04 · 5번] **이 366장이 작품 지면으로 가는 문을 하나도 안 내고 있었다.**
 *
 * 사장님: 「검색 관련 색인, seo 업무, AI geo … 유입에 가장 치중해라」
 *
 * 재 보니 —
 * ```
 *   /born-on   366장 중 142장이 구글에 떴다 · 가운데 자리  9위
 *   /title     546장 중  28장만 떴다        · 가운데 자리  3위   ← 뜨기만 하면 이긴다
 * ```
 * ⛔ 뜬 지면에서 안 뜬 지면으로 **링크가 없으면 구글은 가지 않는다.** 사이트맵은
 *   「있다」는 말이지 「가 보라」는 말이 아니다.
 * ⭐ 이 칸이 가장 정직한 문이다 — 그 사람이 실제로 그 작품에 나왔기 때문에 여기 적힌다.
 *
 * ⛔ 「대표작」이라고 쓰지 않는다. 우리가 고른 것은 **차트에 오래 머문 차례**일 뿐이다.
 * ⛔ 작품이 없으면 「—」. 
 */
export function 작품칸(사람, 몇 = 2) {
  const 것들 = Array.isArray(사람?.titles) ? 사람.titles : [];
  const 쓸것 = 것들
    .filter((t) => t && t.slug && t.title)
    .slice()
    .sort((a, b) => (Number(b.weeks) || 0) - (Number(a.weeks) || 0))
    .slice(0, 몇);
  if (!쓸것.length) return '—';
  const 글 = 쓸것.map((t) => `<a href="/title/${t.slug}">${t.title}</a>`).join(', ');
  const 남은 = 것들.length - 쓸것.length;
  return 남은 > 0 ? `${글} +${남은}` : 글;
}

export function 이름칸(보일, 표, q = null, q표 = null) {
  const qslug = q && q표 ? q표.get(String(q)) : null;
  const slug = qslug
    ?? 표?.get(String(보일 ?? '').toLowerCase().replace(/\s+/g, ' ').trim());
  return slug ? `<a href="/person/${slug}">${벗(보일)}</a>` : 벗(보일);
}

/**
 * 「이 날이 366일 가운데 어디에 있나」 칸을 짓는다.
 *
 * ⛔ 자리가 없으면 **칸을 안 낸다.** 빈 표를 내거나  —
 *   자료가 아직 없는 것을 「0등」으로 보이게 하는 것이 제일 나쁘다.
 * ⛔ 「특별한 날」·「행운의 날」을 쓰지 않는다. 등수와 인원과 «우연일 수 있음»만 적는다.
 */
export function 자리칸(mmdd, 날글, 자리, 띠) {
  if (!자리 || !자리.표 || !자리.표.has(mmdd)) return '';
  const r = 자리.표.get(mmdd);
  const 판정 = 잡음판정(r.사람, 띠);
  const 등수글 = r.동률 > 1
    ? `joint ${서수(r.순위)} busiest`
    : `${서수(r.순위)} busiest`;
  const 판정글 = 채운날.has(mmdd)
    /* 🔴 아는 거짓을 싣지 않는다 — 위 「채운날」 주석을 읽는다 */
    ? `<strong>No — and this day in particular should not be read as a birth pattern.</strong> `
      + `${날글} is ${채운날.get(mmdd)}. Its rank says more about how records are kept than about when people were born.`
    : {
      붐빈다: 'Above what an even scattering produces — this day really is crowded.',
      한산하다: 'Below what an even scattering produces — this day really is thin.',
      '잡음 안': 'Inside what an even scattering produces on its own. '
        + 'The rank is real, but the gap that made it is not: a day or two either way would move it a long way.',
      '못 쟀다': 'We did not measure whether that gap is bigger than chance.',
    }[판정];

  /* 다른 날 지면에서 그 날을 가리킬 때도 표식을 붙인다 — 한 지면에만 적으면 나머지가 거짓이 된다 */
  const 표식 = (mm) => (채운날.has(mm) ? ' <span class="fine">(a records artefact — see below)</span>' : '');
  const 채운날설명 = [자리.가장많음.day, 자리.가장적음.day].filter((d) => 채운날.has(d) && d !== mmdd);

  return `
  <h2>Where ${날글} sits among all 366 days</h2>
  <p><strong>${날글} is the ${등수글} of ${자리.전체} days</strong> for Korean star birthdays,
  with ${r.사람} ${r.사람 === 1 ? 'person' : 'people'}. It is busier than
  ${r.밑에있는날} of the other ${자리.전체 - 1} days${r.동률 > 1 ? `, and ties with ${r.동률 - 1} other ${r.동률 - 1 === 1 ? 'day' : 'days'}` : ''}.</p>
  <div class="scroll-x">
  <table>
    <thead><tr><th>Day</th><th>People born</th></tr></thead>
    <tbody>
      <tr><th scope="row">${날글} — this day</th><td>${r.사람}</td></tr>
      <tr><th scope="row">The middle day of the year</th><td>${자리.중간}</td></tr>
      <tr><th scope="row">Busiest day (${날쓰기(자리.가장많음.day)})${표식(자리.가장많음.day)}</th><td>${자리.가장많음.people}</td></tr>
      <tr><th scope="row">Thinnest day (${날쓰기(자리.가장적음.day)})${표식(자리.가장적음.day)}</th><td>${자리.가장적음.people}</td></tr>
    </tbody>
  </table>
  </div>
  <div class="warn">
    <p><strong>Is that rank meaningful?</strong> ${판정글}</p>
    ${채운날설명.map((d) => `<p class="fine"><strong>${날쓰기(d)} is not a real peak.</strong> It is `
    + `${채운날.get(d)}. We leave it in the table rather than quietly dropping it, but it should not be `
    + `compared with the other 365 days.</p>`).join('')}
    ${띠 ? `<p class="fine">We scattered the same number of birthdays evenly across ${띠.날수} days
    ${띠.횟수} times, with a fixed seed (${띠.씨앗}) so the figure can be reproduced. On that footing a
    single day lands between <strong>${띠.아래}</strong> and <strong>${띠.위}</strong> people
    90% of the time. A count inside that band tells you about the calendar, not about the day.</p>` : ''}
    <p class="fine"><strong>This is a count, not a verdict.</strong> A crowded birthday does not make
    anyone more likely to become a star, and a thin one does not make anyone less likely. We hold
    birth dates only for people who already have a Wikidata entry — who reaches an
    encyclopaedia at all is its own filter, and we did not measure it.</p>
  </div>`;
}

/**
 * 🔴 [2026-09-04] 자리 칸을 붙이면서 밟은 덫 셋을 여기 적어 둔다 — **CSS 안에 적을 수 없다.**
 *
 * ① `.scroll-x` 딱지를 썼는데 **이 지면 CSS 가 그것을 몰랐다.** 좁은 화면에서 표가
 *   지면 밖으로 넘친다 — 손님 절반이 손전화다. 그래서 CSS 에 `.scroll-x` 와 `h2` 를 더했고,
 *   **「쓴 딱지를 CSS 가 아는가」를 자가시험으로 굳혔다.** 딱지와 CSS 가 같은 파일에 있으니
 *   따로 잴 까닭이 없다.
 *
 * ② CSS 는 **템플릿 문자열 «안»**이다. 주석에 백틱을 쓰면 문자열이 닫혀 빌더가 죽는다.
 *   실제로 그렇게 한 번 죽였다 — `ReferenceError: x is not defined`.
 *
 * ③ 🔴 그리고 그 주석을 우리말로 적었더니 **이 파일에 이미 있던 자가시험이 잡았다** —
 *   「화면에 우리말이 없다」. **CSS 주석도 브라우저까지 그대로 간다.** HTML 주석과 같다.
 *   ⭐ 이 파일 위쪽에 2026-08-28 자로 똑같은 교훈이 적혀 있었다. 같은 덫을 또 밟은 것이다.
 *   ✅ 그러니 우리말 판단은 **여기(자바스크립트 주석)**에만 적는다. 여기는 안 나간다.
 */

/** 1 → 1st · 2 → 2nd · 3 → 3rd · 11~13 은 th. ⚠ 11th·12th·13th 를 틀리는 것이 가장 흔한 실수다 */
export function 서수(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return String(n);
  const 끝두자리 = Math.abs(v) % 100;
  if (끝두자리 >= 11 && 끝두자리 <= 13) return `${v}th`;
  const 끝 = Math.abs(v) % 10;
  return `${v}${끝 === 1 ? 'st' : 끝 === 2 ? 'nd' : 끝 === 3 ? 'rd' : 'th'}`;
}

export function 지면짓기(mmdd, 사람들, 이름표 = null, 자리 = null, 띠 = null, q표 = null) {
  const 실을것 = 사람들.map((p) => ({ ...p, 보일: 영문이름(p) })).filter((p) => p.보일);
  const 안실은수 = 사람들.length - 실을것.length;
  const 으뜸 = 실을것[0];
  const 날 = 날쓰기(mmdd);
  const 어제 = 옆날(mmdd, -1);
  const 내일 = 옆날(mmdd, 1);
  /* 🔴 [2026-08-27 15:2x] 제목이 **손님이 치는 말**을 하나 빠뜨리고 있었다 — 「K-pop」.
     위 그룹소속 주석에 잰 값이 있다. 여기서는 그것을 «세어» 적는다.
     ⛔ 그룹 소속이 0명인 날이 366일 중 «하루» 있다. 그날 제목에 K-pop 을 쓰면 거짓이다 —
       그래서 0명이면 예전 꼴을 그대로 쓴다. 못 잰 날에 수를 지어내지 않는다.
     ⚠ 이름을 제목에서 뺀 것이 «이름 검색을 버린 것»은 아니다 — 이름은 366장 전부
       본문 표에 «전원» 실려 있다. 제목이 나르던 것은 으뜸 한 명뿐이었다.
     ⚠ 366일을 다 재서 가장 긴 것이 57자다(9월 14일). 60자 한계 안이다. */
  const 케이팝수 = 실을것.filter((p) => 그룹소속.has(p.q)).length;

  /**
   * 🔴🔴 [2026-08-28 04:2x · 5번] **「idols」 한 낱말이 이 366장에서 통째로 빠져 있었다.**
   *   ────────────────────────────────────────────────────────────────
   *   GSC 28일치를 이 갈래만 뽑아 보니 **순위가 두 무리로 딱 갈렸다** —
   *   ```
   *     kpop idols born on february 20      66위    kpop idols march birthdays    56위
   *     kpop birthdays in january           63위    august 1 kpop birthday        63위
   *     kpop idols with january birthdays   62위    kdrama actors born in august  62위
   *     ────────────────────────────────────────────────────────────
   *     korean stars with birthday on 4yh august  10위
   *     korean actors born in september           12위
   *     which kpop idol birthday is on 26 august  12위
   *   ```
   *   윗무리는 6~7쪽, 아랫무리는 1쪽이다. **윗무리에는 다 「idols」가 있고, 우리 366장에는
   *   「idol」이라는 글자가 «한 번도» 안 나온다.** 우리는 「K-pop groups」라고만 적었다.
   *
   * ⛔ **없는 말을 지어내는 것이 아니다.** 우리가 잰 것은 위키데이터 P463(그룹 소속)이고,
   *   영어권에서 「K-pop idol」이 가리키는 것이 바로 그것 — «케이팝 그룹에 속한 사람»이다.
   *   ⚠ 예전에 「아이돌」을 안 쓰기로 한 적이 있다. 그것은 위키데이터에 «직업»이 「아이돌」인
   *     사람이 0명이라 **직업을 지어낼 수 없어서**였다. 여기서는 직업이 아니라 이미 잰
   *     «그룹 소속»을 손님 말로 옮기는 것이라 그 판단과 어긋나지 않는다.
   *
   * ⭐⭐ 그런데 이 갈래는 내가 오늘 03:4x 에 **9/25 까지 잠가 뒀다**(제목 길이 쓸이 실험).
   *   지금 통째로 바꾸면 「길이 때문인지 낱말 때문인지」를 영영 못 가른다.
   *   ⇒ 그래서 **366장을 반으로 갈라 낸다.** 홀숫날은 새 낱말, 짝숫날은 그대로.
   *     같은 사이트·같은 기간·같은 권위에서 두 판이 나란히 서므로, 9/25 에 둘을 견주면
   *     **낱말 하나의 효과만** 떨어져 나온다. 기다리는 것도 아니고 눈감고 바꾸는 것도 아니다.
   *   ⚠ 홀짝은 «날짜»로 가른다 — 무작위로 가르면 다음에 다시 잴 때 어느 쪽이 어느 쪽이었는지
   *     모른다. 날짜는 다시 셈해도 늘 같다.
   */
  const 홀숫날 = Number(String(mmdd).slice(-2)) % 2 === 1;
  const 케이팝말 = 홀숫날 ? 'K-pop idols' : 'in K-pop groups';
  const 제목 = 케이팝수 > 0
    ? `${실을것.length} Korean stars born on ${날} — ${케이팝수} ${케이팝말}`
    : (으뜸
      ? `${벗(으뜸.보일)} and ${실을것.length - 1} other Korean stars born on ${날}`
      : `Korean stars born on ${날}`);
  /* 🔴 [2026-08-26 · 5번] 「Born」 칸이 «글자»로만 있었다. 그날 태어난 해 지면 78장을 냈는데,
     재 보니 그 지면들로 «밖에서 들어오는 문이 0개»였다 — 자기들끼리만 이어져 있었다.
     구글이 사이트맵으로만 아는 지면은 「발견만 하고 안 넣음」이 되기 쉽다(8/22 에 작품
     지면에서 겪었다: 528장 중 519장이 들어오는 링크 하나뿐이었다).
     ⭐ 이 칸이 가장 정직한 문이다 — 그 사람이 «실제로» 그 해에 났기 때문에 여기 적혀 있다.
     ⛔ 지면이 «있는» 해에만 건다. 여덟 명 미만인 35개 해는 지면이 없다 — 죽은 링크가 된다. */
  const 줄 = 실을것.map((p) => {
    const 해 = p.born.slice(0, 4);
    const 해칸 = 해지면있나.has(해) ? `<a href="/born-year/${해}">${해}</a>` : 해;
    return `<tr><td>${이름칸(p.보일, 이름표, p.q, q표)}</td><td class="fine">${해칸}</td>`
      + `<td class="fine">${작품칸(p)}</td>`
      + `<td class="fine">${!Number.isFinite(p.reads) ? '—' : p.reads.toLocaleString('en-US')}</td></tr>`;
  }).join('\n');
  /* 🔴🔴 [2026-08-27 15:3x · 5번] **아래 지면 글자 안에 우리말 주석을 넣지 않는다.**
     오늘 05:3x 에 누군가(나다) 「왜 설명을 줄였는지」를 `<!-- … -->` 로 적어 넣었다.
     HTML 주석은 **브라우저까지 그대로 간다.** 366장의 지면 소스에 우리 내부 판단이
     우리말로 실려 나가고 있었다 — 영문 사이트다. `dist` 를 재 보니 366장 전부였다.
     ⛔ 자가시험에 「화면에 우리말이 없다」가 이미 있었는데, 주석을 넣고 시험을 안 돌렸다.
       **자를 만들어 놓고 안 돌리면 자가 아니다.**
     ✅ 그래서 그 판단을 여기(자바스크립트 주석)로 옮겼다 — 여기는 안 나간다.

     ── 옮겨 온 판단 둘 ──────────────────────────────────────────────
     ① 설명(meta) — 예전에 159자여서 구글이 잘라 냈다(155자쯤에서 자른다). 잘리기 전
        부분에도 «손님이 누를 까닭»이 없었다(뒤쪽이 전부 출처와 고지였다). 무엇이 실려
        있는지를 앞으로 당겼다. 출처(Wikidata·English Wikipedia)는 본문에 이미 두 번 있다.
     ② 「This is not a horoscope」 — 이 말이 여태 «설명에만» 있었다. 설명을 줄이면서 재 보니
        본문에 horoscope 가 0회였다. 그래서 낱말을 본문 warn 상자로 옮겼다.
        생일로 묶은 지면이라 점으로 오해되기 가장 쉬운 자리이고, 그 오해를 가장 경계한다.
        ⛔ 설명에서 뺀 말은 «반드시» 본문 어딘가에 있어야 한다. */
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="canonical" href="https://www.kculturewire.com/born-on/${mmdd}">
<title>${제목} | K Culture Wire</title>
<meta name="description" content="${실을것.length} Korean actors and singers were born on ${날}${으뜸 ? `, including ${벗(으뜸.보일)}` : ''}. ${케이팝수 === 0 ? 'None of them are in a music group' : 케이팝수 === 1 ? (홀숫날 ? 'One of them is a K-pop idol' : 'One of them is in a K-pop group') : (홀숫날 ? `${케이팝수} of them are K-pop idols` : `${케이팝수} of them are in K-pop groups`)}. Every name is listed.">
<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 제목,
    description: `${실을것.length} Korean actors and singers born on ${날}, counted from Wikidata birth dates.`,
    url: `https://www.kculturewire.com/born-on/${mmdd}`,
    isPartOf: { '@type': 'WebSite', name: 'K Culture Wire', url: 'https://www.kculturewire.com' },
    creator: { '@type': 'Organization', name: 'K Culture Wire' },
    isBasedOn: ['https://www.wikidata.org', 'https://wikimedia.org/api/rest_v1/'],
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: 실을것.length,
      itemListElement: 실을것.slice(0, 10).map((p, i) => ({
        '@type': 'ListItem', position: i + 1, name: p.보일,
      })),
    },
  }).replace(/</g, '\\u003c')}</script>
<style>
  :root{ --ink:#14161a; --ink-2:#5b6270; --line:#e6e8ec; --bg:#fbfbfc; --accent:#b4472a; --accent-soft:#fdf3f0; }
  @media (prefers-color-scheme: dark){ :root:not([data-theme="light"]){
    --ink:#eceef2; --ink-2:#9aa2b1; --line:#2a2e37; --bg:#101216; --accent:#e8825f; --accent-soft:#261915; } }
  *{box-sizing:border-box} body{margin:0;background:var(--bg);color:var(--ink);
    font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif}
  .wrap{max-width:800px;margin:0 auto;padding:2rem 1.1rem 4rem}
  h1{font-size:1.45rem;line-height:1.3;margin:.2rem 0 .6rem;letter-spacing:-.01em}
  .kicker{color:var(--accent);font-weight:700;font-size:.8rem;letter-spacing:.08em;text-transform:uppercase;margin:0}
  .warn{border:1px solid var(--accent);border-radius:6px;padding:.7rem 1rem;background:var(--accent-soft);margin:1.1rem 0}
  .warn p{margin:.3rem 0;font-size:.9rem}
  table{border-collapse:collapse;width:100%;font-size:.95rem}
  th,td{text-align:left;padding:.42rem .5rem;border-bottom:1px solid var(--line)}
  th{font-size:.78rem;color:var(--ink-2);text-transform:uppercase;letter-spacing:.05em}
  .fine{color:var(--ink-2);font-size:.87rem}
  .scroll-x{overflow-x:auto;-webkit-overflow-scrolling:touch;margin:.9rem 0}
  h2{font-size:1.12rem;margin:1.8rem 0 .5rem;letter-spacing:-.01em}
  nav{margin:1.4rem 0;display:flex;gap:1rem;flex-wrap:wrap}
  nav a,footer a{color:var(--accent);font-weight:600}
  footer{margin-top:2.2rem;padding-top:1rem;border-top:1px solid var(--line);color:var(--ink-2);font-size:.85rem}
</style>
</head>
<body>
<div class="wrap">
  <p class="kicker">K Culture Wire &middot; birthdays</p>
  <h1>${제목}</h1>
  <p>${실을것.length} Korean actors, singers and songwriters share this birthday. Ordered by how many
  people opened their English Wikipedia article in the last 30 days, so the name you are most likely
  to know is first.</p>
  ${안실은수 ? `<p class="fine"><strong>${안실은수} more people born on this day are counted but not listed</strong> — Wikidata holds no English name for them, only a Korean one, and this is an English-language site. They are inside the ${사람들.length} total.</p>` : ''}
${자리칸(mmdd, 날, 자리, 띠)}
${그날만의칸(그날만의수(사람들, (q) => 갈래보기.get(q)), 날)}

  <div class="warn">
    <p><strong>Sharing a birthday means sharing a birthday.</strong> Nothing on this page says it means anything else. We counted whether a birth year predicts who reaches a chart, and it does not — <a href="/star-signs">that test is here</a>.</p>
    <p><strong>This is not a horoscope.</strong> We do not read birth charts and we do not say what a
      date means about a person. Birth dates come from Wikidata; how widely each name is read is
      counted from English Wikipedia.</p>
  </div>

  <table>
    <thead><tr><th>Name</th><th>Born</th><th>On Netflix top-10 charts</th><th>Readers, 30 days</th></tr></thead>
    <tbody>
${줄 || '<tr><td colspan="4" class="fine">Nobody in our roster was born on this day.</td></tr>'}
    </tbody>
  </table>

  <nav>
    <a href="/born-on/${어제}">&larr; ${날쓰기(어제)}</a>
    <a href="/born-on/${내일}">${날쓰기(내일)} &rarr;</a>
    <a href="/born-in/${달이름[Number(mmdd.slice(0, 2)) - 1].toLowerCase()}">All of ${달이름[Number(mmdd.slice(0, 2)) - 1]}</a>
    <a href="/born-on">All 366 days</a>
  </nav>

  ${꼬리말([
    '<a href="/most-read">The 100 most-read Korean stars this month</a> &middot; '
      + '<a href="/community">The twelve birth-year rooms</a> &middot; '
      + '<a href="/day-pillar">The birth-day count</a>',
    /* 🔴 [2026-08-26 · 5번] KLifeMap 입구. 2번 확인 — 「KCW 에 이름은 있는데 링크가 없다」.
       재 보니 정말로 <a href> 로 걸린 것이 «0개» 였다(글자만 애널리틱스 안에 있었다).
       ⛔ 배너가 아니라 «다음 물음»으로 낸다(2번 지시). 다른 사이트라는 것을 밝힌다.
       ⚠ 이 주소는 src/lib/klifemap-en.ts 에도 있다. .mjs 는 .ts 를 못 불러서 나뉘었다 —
         **둘을 같이 고친다.** 도착지가 로그인 화면이 되면 두 곳 다 내린다. */
    /* ⛔ 2026-08-26 에 여기서 한 번 조용히 사라졌다 — 쉼표 뒤를 `+ '…'` 로 시작했더니
       **단항 플러스**로 읽혀 NaN 이 되고, 꼬리말() 의 `typeof x === 'string'` 필터가
       말없이 버렸다. 오류도 경고도 없었다. 자가시험이 없었으면 「넣었다」로 끝났을 것이다. */
    '<a href="https://klifemap.ai/saju.html?lang=en&from=kcw&at=born-on" rel="noopener">What does a birth date say in the Korean four-pillars system?</a>'
      + ' <span class="fine">&mdash; free chart, no sign-up. Opens KLifeMap.AI, a separate site we also run.</span>',
  ])}
  <footer>
    <p>Birth dates: Wikidata (best-ranked, day precision; South Korean citizenship; entertainment occupation), CC0.
       Readers: Wikimedia Pageviews, human traffic only. Readers are not searches.</p>
  </footer>
</div>
</body>
</html>
`;
}

if (process.argv.includes('--자가시험')) {
  const 실패 = [];
  /* ⚠ 2026-09-01 — 수를 «재서» 적는다. 손으로 적으면 검사가 빠져도 수가 안 움직인다 */
  let 센것 = 0;
  const 검 = (이름, 참) => { 센것 += 1; if (!참) 실패.push(이름); };

  검('날을 사람 말로 쓴다', 날쓰기('05-16') === '16 May' && 날쓰기('12-01') === '1 December');
  검('하루 뒤로', 옆날('05-16', 1) === '05-17');
  검('달을 넘어간다', 옆날('01-31', 1) === '02-01' && 옆날('03-01', -1) === '02-29');
  검('해를 넘어간다', 옆날('12-31', 1) === '01-01' && 옆날('01-01', -1) === '12-31');
  검('윤날 자리를 둔다', 옆날('02-28', 1) === '02-29');

  /* ── 🔴 [2026-09-04] 자리 층 — 「366일 가운데 몇째」 ────────────── */
  검('서수 1·2·3', 서수(1) === '1st' && 서수(2) === '2nd' && 서수(3) === '3rd');
  검('⭐ 11·12·13 은 th 다 (가장 흔한 실수)',
    서수(11) === '11th' && 서수(12) === '12th' && 서수(13) === '13th');
  검('21·22·23 은 다시 st·nd·rd',
    서수(21) === '21st' && 서수(22) === '22nd' && 서수(23) === '23rd');
  검('111·112 도 th', 서수(111) === '111th' && 서수(112) === '112th');
  검('101 은 st', 서수(101) === '101st');
  검('수가 아니면 그대로', 서수('x') === 'x');

  const 자리시험 = 자리매기기([
    { day: '01-01', people: 40 }, { day: '01-02', people: 30 },
    { day: '01-03', people: 30 }, { day: '01-04', people: 10 },
  ]);
  검('가장 많은 날이 1등', 자리시험.표.get('01-01').순위 === 1);
  검('⭐ 동률은 같은 등수', 자리시험.표.get('01-02').순위 === 2 && 자리시험.표.get('01-03').순위 === 2);
  검('⭐ 동률 뒤는 등수를 건너뛴다 (3등이 아니라 4등)', 자리시험.표.get('01-04').순위 === 4);
  검('동률 수를 적는다', 자리시험.표.get('01-02').동률 === 2 && 자리시험.표.get('01-01').동률 === 1);
  검('밑에 있는 날을 센다 — 동률은 «밑»이 아니다',
    자리시험.표.get('01-02').밑에있는날 === 1 && 자리시험.표.get('01-01').밑에있는날 === 3);
  검('중간값을 낸다', 자리시험.중간 === 30);
  검('가장 붐빈 날·한산한 날', 자리시험.가장많음.day === '01-01' && 자리시험.가장적음.day === '01-04');
  검('⛔ 빈 목록에서 등수를 지어내지 않는다', 자리매기기([]).전체 === 0);
  검('⛔ 사람 수가 수가 아닌 줄은 버린다', 자리매기기([{ day: '01-01', people: 'x' }]).전체 === 0);

  const 띠시험 = 잡음띠(366 * 30, 366);
  검('잡음 띠가 아래<위 다', 띠시험.아래 < 띠시험.위);
  검('잡음 띠가 30 을 감싼다', 띠시험.아래 <= 30 && 30 <= 띠시험.위);
  검('씨앗을 결과에 실어 보낸다', 띠시험.씨앗 === 잡음씨앗);
  검('⭐ 같은 씨앗이면 같은 값이다 (다시 잴 수 있다)',
    JSON.stringify(잡음띠(366 * 30, 366)) === JSON.stringify(띠시험));
  검('⛔ 총인원이 없으면 못 쟀다고 한다', 잡음띠(0, 366) === null && 잡음띠(null, 366) === null);
  검('띠보다 크면 붐빈다', 잡음판정(띠시험.위 + 20, 띠시험) === '붐빈다');
  검('띠보다 작으면 한산하다', 잡음판정(Math.max(0, 띠시험.아래 - 20), 띠시험) === '한산하다');
  검('띠 안이면 잡음 안이다', 잡음판정(30, 띠시험) === '잡음 안');
  검('⛔ 띠가 없으면 못 쟀다고 한다', 잡음판정(30, null) === '못 쟀다');

  /* ⛔ 자리가 없으면 칸을 «안 낸다» — 빈 표나 0등을 내보내지 않는다 */
  검('자리가 없으면 칸을 안 낸다', 자리칸('01-01', '1 January', null, 띠시험) === '');
  검('모르는 날이면 칸을 안 낸다', 자리칸('99-99', '무엇', 자리시험, 띠시험) === '');
  {
    const 칸 = 자리칸('01-02', '2 January', 자리시험, 띠시험);
    검('칸에 등수가 실린다', 칸.includes('joint 2nd busiest'));
    검('칸에 사람 수가 실린다', /30 people/.test(칸));
    검('칸에 중간값이 실린다', 칸.includes('The middle day of the year'));
    검('⛔ 칸이 「특별한 날」이라고 하지 않는다', !/special|lucky|blessed|destin/i.test(칸));
    검('⭐ 칸이 «판정이 아니라 셈»임을 적는다', 칸.includes('This is a count, not a verdict'));
    검('칸에 씨앗이 실려 다시 잴 수 있다', 칸.includes(String(띠시험.씨앗)));
    검('⛔ 칸에 우리말이 없다', !/[가-힣]/.test(칸));
  }

  /* 🔴 1월 1일 — 아는 거짓을 싣지 않는다 */
  {
    const 채운자리 = 자리매기기([
      { day: '01-01', people: 48 }, { day: '01-02', people: 25 }, { day: '01-03', people: 11 },
    ]);
    const 그날 = 자리칸('01-01', '1 January', 채운자리, 띠시험);
    검('⭐ 1월 1일 지면은 「붐빈다」고 하지 않는다', !/really is crowded/.test(그날));
    검('⭐ 1월 1일 지면이 까닭을 적는다', /records fall back on/.test(그날));
    검('1월 1일 지면이 「birth pattern 으로 읽지 말라」고 한다',
      /should not be read as a birth pattern/.test(그날));

    const 남의날 = 자리칸('01-02', '2 January', 채운자리, 띠시험);
    검('⭐ 다른 날 지면에서도 1월 1일에 표식이 붙는다', /records artefact/.test(남의날));
    검('다른 날 지면이 1월 1일이 진짜 봉우리가 아니라고 적는다',
      /1 January is not a real peak/.test(남의날));
    검('⛔ 1월 1일을 표에서 «지우지» 않는다 — 48 이 그대로 있다', /48/.test(남의날));
    검('⛔ 표식이 든 칸에도 우리말이 없다', !/[가-힣]/.test(남의날));

    /* ⚠ 2월 28일도 48명이지만 까닭을 못 쟀다 — 짐작으로 표식을 붙이지 않는다 */
    const 못쟀날 = 자리칸('02-28', '28 February', 자리매기기([
      { day: '02-28', people: 48 }, { day: '01-02', people: 25 },
    ]), 띠시험);
    검('⛔ 못 잰 날에 표식을 지어 붙이지 않는다', !/records artefact/.test(못쟀날));
  }

  /* 🔴 [2026-09-04] 붙인 딱지를 CSS 가 모르면 좁은 화면에서 표가 넘친다.
     ⛔ 「기능을 붙이고 됐다고 하지 않는다」 — 딱지와 CSS 가 «같은 파일»에 있으니 함께 잰다 */
  {
    const 한장 = 지면짓기('05-03', [{ q: 'Q1', name: 'Someone', born: '1990-05-03', sitelinks: 3 }],
      null, 자리매기기([{ day: '05-03', people: 1 }]), 잡음띠(366, 366));
    for (const 딱지 of ['scroll-x', 'warn', 'fine']) {
      검(`쓴 딱지 .${딱지} 를 CSS 가 안다`,
        한장.includes(`class="${딱지}"`) ? new RegExp(`\\.${딱지}\\s*\\{`).test(한장) : true);
    }
    검('쓴 h2 를 CSS 가 안다', 한장.includes('<h2>') ? /h2\s*\{/.test(한장) : true);
  }

  const 사람 = [
    { q: 'Q1', name: 'IU', born: '1993-05-16', sitelinks: 90 },
    { q: 'Q2', name: '홍길동', born: '1980-05-16', sitelinks: 5 },
    { q: 'Q3', name: 'Someone', born: '1975-05-16', sitelinks: 3 },
  ];
  const 수요 = new Map([['Q1', { reads: 59582, enTitle: 'IU (entertainer)' }]]);
  const 날 = 날별로(사람, 수요);
  검('생일로 나눈다', 날.get('05-16').length === 3);
  검('많이 읽힌 순으로 세운다', 날.get('05-16')[0].name === 'IU');
  검('읽힌 수를 붙인다', 날.get('05-16')[0].reads === 59582);
  검('못 잰 사람은 null 이다 — 0 이 아니다', 날.get('05-16')[1].reads === null);

  /* 🔴 [2026-08-26] **이름에 문을 다는 것** — born-on 366장이 사람 지면으로 가는
     링크를 0개 갖고 있었다. 여기서 지키는 것은 셋이다:
       ① 지면이 있는 이름만 건다        ⛔ 없는 지면으로 걸면 손님이 404 를 본다
       ② 이름이 겹치면 «안 건다»        ⛔ 틀린 사람에게 보내느니 글자로 둔다
       ③ 이름은 두 자리에서 온다        people.name 과 people.wikiPage 가 다를 수 있다 */
  const 명단 = [
    { name: 'IU', wikiPage: 'IU (singer)', slug: 'iu' },
    { name: 'Lee You-mi', wikiPage: 'Lee Yoo-mi', slug: 'lee-you-mi' },
    /* 아래 둘은 로마자 이름이 같다 — 겹친 이름이다 */
    { name: 'Kim Min-ju', wikiPage: 'Kim Min-ju (actress)', slug: 'kim-min-ju' },
    { name: 'Kim Min-ju', wikiPage: 'Kim Min-ju (singer)', slug: 'kim-min-ju-2' },
  ];
  const { 표: 이름표시험, 겹친수 } = 이름표만들기(명단);
  검('이름으로 문을 찾는다', 이름표시험.get('iu') === 'iu');
  검('위키 문서 이름으로도 찾는다', 이름표시험.get('lee yoo-mi') === 'lee-you-mi');
  검('⭐ 겹친 이름은 «빼» 버린다', !이름표시험.has('kim min-ju') && 겹친수 === 1);
  검('겹치지 않은 쪽은 남는다', 이름표시험.get('kim min-ju (actress)') === 'kim-min-ju');
  검('있는 이름은 문이 된다', 이름칸('IU', 이름표시험) === '<a href="/person/iu">IU</a>');
  검('⛔ 없는 이름은 글자 그대로다', 이름칸('Nobody Here', 이름표시험) === 'Nobody Here');
  검('⛔ 겹친 이름은 글자 그대로다', 이름칸('Kim Min-ju', 이름표시험) === 'Kim Min-ju');
  검('표가 아예 없어도 안 죽는다', 이름칸('IU', null) === 'IU');

  /* 🔴 [2026-10-04 · 5번] 작품 칸 — /title 546장으로 가는 문. 시험이 없으면 다음 사람이 뺀다 */
  const 작품시험 = { titles: [
    { title: 'A', slug: 'a', weeks: 3 }, { title: 'B', slug: 'b', weeks: 9 },
    { title: 'C', slug: 'c', weeks: 1 },
  ] };
  검('🔴 작품이 문이 된다', 작품칸(작품시험).includes('<a href="/title/b">B</a>'));
  검('🔴 오래 머문 차례로 둘만 싣는다',
    작품칸(작품시험).startsWith('<a href="/title/b">B</a>, <a href="/title/a">A</a>'));
  검('남은 수를 적는다', 작품칸(작품시험).endsWith('+1'));
  검('⛔ 작품이 없으면 「—」 — 0 으로 안 채운다',
    작품칸({ titles: [] }) === '—' && 작품칸({}) === '—' && 작품칸(null) === '—');
  검('⛔ slug 없는 줄은 안 건다 — 죽은 링크가 된다',
    작품칸({ titles: [{ title: 'X', weeks: 9 }] }) === '—');
  검('이름에 든 꺾쇠를 막는다', 이름칸('<b>x', null) === '&lt;b&gt;x');
  /* 🔴 [2026-10-04] 이름 글자로만 맞추다 보니 생일 지면 «15명 중 한 명»만 문이 열려 있었다.
     로마자 표기가 흔들려도(Lee You-mi ↔ Lee Yoo-mi) q 로는 정확히 맞는다. */
  {
    const { 표: 이름만, q표: q만 } = 이름표만들기([{ name: 'Lee Yoo-mi', slug: 'lee-you-mi', q: 'Q19359987' }]);
    검('🔴 이름 표기가 달라도 q 로 문을 연다',
      이름칸('Lee You-mi', 이름만, 'Q19359987', q만) === '<a href="/person/lee-you-mi">Lee You-mi</a>');
    검('⛔ q 가 없으면 이름으로 뒷길을 간다',
      이름칸('Lee Yoo-mi', 이름만, null, q만) === '<a href="/person/lee-you-mi">Lee Yoo-mi</a>');
    검('⛔ 모르는 q 는 지어내지 않는다', 이름칸('Nobody', 이름만, 'Q-없는것', q만) === 'Nobody');
    검('⛔ q표가 없어도 안 죽는다', 이름칸('Lee Yoo-mi', 이름만, 'Q19359987', null).includes('lee-you-mi'));
  }

  const h링크 = 지면짓기('05-16', 날.get('05-16'), 이름표시험);
  검('⭐ 표의 이름이 사람 지면으로 간다', h링크.includes('<td><a href="/person/iu">IU</a></td>'));
  검('지면이 없는 사람은 글자다', h링크.includes('<td>Someone</td>'));

  const h = 지면짓기('05-16', 날.get('05-16'));
  검('표를 안 주면 예전과 같다 — 글자로 낸다', h.includes('<td>IU</td>'));
  /* 🔴 [2026-08-27] 이 시험이 «옛 제목»을 지키고 있었다 — 고친 것은 시험이 아니라 규칙이다.
     시험 자료에는 그룹 소속이 없으므로(가짜 Q번호다) 제목이 예전 꼴로 떨어져야 한다.
     ⭐ 그것 자체가 재는 값이다 — **K-pop 이 0명인 날은 K-pop 을 안 쓴다.** */
  검('그룹 소속이 0명이면 예전 제목으로 떨어진다', h.includes('<h1>IU and 1 other'));
  검('⛔ 0명인 날 제목에 K-pop 을 안 쓴다', !/<h1>[^<]*K-pop/.test(h));
  /* 그룹 소속이 있는 날은 K-pop 수를 세운다 — 가짜 자료로 직접 재 본다 */
  {
    const 원래 = new Set(그룹소속);
    그룹소속.add('Q-시험-아이유');
    const k = 지면짓기('05-16', (날.get('05-16') ?? []).map((p, i) => (i === 0 ? { ...p, q: 'Q-시험-아이유' } : p)));
    /* 🔴 [2026-08-28] 홀짝 가름을 넣었으므로 시험도 «두 판»을 다 본다. 05-16 은 짝숫날이다 */
    검('⭐ 짝숫날은 예전 낱말(K-pop groups)을 그대로 쓴다', /K-pop group/.test(k));
    검('⭐ 짝숫날 설명도 예전 낱말이다', /in a K-pop group|in K-pop groups/.test(k));
    검('⛔ 짝숫날에는 idol 이라 안 쓴다', !/K-pop idol/.test(k));
    {
      /* ⚠ 시험 자료에는 05-16 하루뿐이라, «같은 사람 목록»을 홀숫날 자리에 넣어 짓는다.
         날짜만 홀수로 바꾸면 낱말이 갈리는지 그것만 본다 — 자료를 새로 지어내지 않는다. */
      const 홀 = 지면짓기('05-17', (날.get('05-16') ?? []).map((p, i) => (i === 0 ? { ...p, q: 'Q-시험-아이유' } : p)));
      검('⭐ 홀숫날 제목은 «K-pop idols» 를 말한다 — 잰 검색어의 낱말이다', /K-pop idol/.test(홀));
      검('⛔ 홀숫날에는 예전 낱말을 안 쓴다', !/in K-pop groups/.test(홀));
    }
    검('한 명이면 «One of them is» 로 쓴다 — 「1 of them are」 가 아니다',
      !/1 of them are/.test(k));
    그룹소속.clear(); 원래.forEach((q) => 그룹소속.add(q));
  }
  검('⛔ 한글 이름을 목록에 안 싣는다', !h.includes('홍길동'));
  검('안 실은 수를 적는다', h.includes('1 more people born on this day are counted but not listed'));
  검('canonical 이 있다', h.includes('rel="canonical" href="https://www.kculturewire.com/born-on/05-16"'));
  /* 🔴 2026-08-22 — check-search-readiness 가 이 366장을 「구조화 데이터가 없다」고 잡았다.
     손으로 짓는 자리는 Astro 지면이 저절로 넣어 주던 것이 다 빠진다 — 그게 손으로 짓는 값이다 */
  검('⭐ 구조화 데이터가 있다', h.includes('application/ld+json'));
  /* ⚠ 자(정규식)로 뜯지 않는다 — 셸을 거쳐 이 파일을 쓸 때 백슬래시가 먹혀 자가 깨졌다.
     여는 표와 닫는 표를 문자열로 찾는다. 뜻은 같고 깨질 자리가 없다 */
  검('구조화 데이터가 깨지지 않았다', (() => {
    const 여는 = '<script type="application/ld+json">';
    const i = h.indexOf(여는);
    if (i < 0) return false;
    const j = h.indexOf('</' + 'script>', i);
    if (j < 0) return false;
    try {
      const o = JSON.parse(h.slice(i + 여는.length, j).split(String.fromCharCode(92) + 'u003c').join('<'));
      return o['@type'] === 'CollectionPage' && o.mainEntity.numberOfItems > 0;
    } catch { return false; }
  })());
  /* ⚠ 「글자가 있다」가 아니라 「<a href> 로 걸렸다」를 잰다. 2026-08-26 에 라이브를
     재 보니 'klifemap.ai' 라는 글자는 1곳 있는데 누를 수 있는 링크는 «0개» 였다 —
     애널리틱스 스크립트 안의 도메인 목록이었다. 세는 자가 넓으면 없는 것을 있다고 센다. */
  검('⭐ KLifeMap 입구가 «누를 수 있게» 걸려 있다 — 글자만 있는 것은 링크가 아니다',
    h.includes('<a href="https://klifemap.ai/saju.html?lang=en&from=kcw&at=born-on" rel="noopener">'));
  검('⭐ 다른 사이트로 넘어간다는 것을 밝힌다', h.includes('a separate site we also run'));
  검('어제·내일로 걷는다', h.includes('/born-on/05-15') && h.includes('/born-on/05-17'));
  /* 🔴 2026-08-24 — 「in may」로 묻는 손님을 위해 달 지면 12장을 냈다. 날 지면에 떨어진
     손님이 달로 올라갈 길이 없으면 한 걸음에서 끝난다 — 걸음 수가 곧 체류시간이다.
     ⛔ 「문이 있나」가 아니라 «맞는 달로 가나»를 본다. 5월 지면이 6월로 가면 통과해선 안 된다 */
  검('⭐ 자기 달 지면으로 올라간다', h.includes('/born-in/may') && !h.includes('/born-in/june'));
  검('⛔ 점을 안 친다는 말을 싣는다', h.includes('Sharing a birthday means sharing a birthday'));
  /**
   * ⛔ 화면에 우리말이 없다 — 영어 손님은 한국어 줄에서 읽기를 멈춘다.
   *
   * ⚠ [2026-08-28] **딱 하나 예외를 두었다 — 통신판매업 신고번호(`2026-세종-0591`).**
   *   그 안의 「세종」은 번호의 «이름»이라 못 바꾼다. 로마자로 적으면 조회가 안 되는
   *   거짓 번호가 된다. 기관 이름은 영문(`Sejong`)으로 바꿨고, 번호만 그대로 둔다.
   *
   * ⭐ 예외를 «이름 붙여» 둔다. 이 검사가 막으려는 것은 «영어 손님이 읽다 멈추는 한국어
   *   문장»이고, 법정 식별자는 문장이 아니다. 이름 없이 정규식만 느슨하게 하면
   *   다음 사람이 한국어 «문장»을 넣어도 안 걸린다.
   */
  /* 🔴 [2026-10-04 04:3x] 예외가 «번호»에만 걸려 있어, 그 뒤에 붙은 **신고기관 이름**을
     한국어 문장으로 읽고 떨어졌다 — `2026-세종-0591 (세종특별자치시)`.
     기관 이름은 번호의 «일부»다(영문판도 `2026-Sejong-0591 (Sejong)` 로 같이 적는다).
     ⇒ 예외를 「번호 + 괄호 속 기관 이름」 한 덩이로 넓힌다.
     ⛔ 괄호 안을 아무 한국어나 받지 않는다 — 「세종」으로 시작하는 것만 받는다.
       느슨하게 열면 다음 사람이 한국어 «문장»을 넣어도 안 걸린다. */
  const 법정번호 = /2026-세종-\d+(\s*\(세종[가-힣]*\))?/g;
  검('⛔ 화면에 우리말이 없다 (법정 신고번호만 예외)',
    !/[가-힣]/.test(h.replace(/홍길동/g, '').replace(법정번호, '')));
  /* ⚠ 예외가 «번호에만» 걸리는지 본다 — 넓어지면 한국어 문장이 새 나간다 */
  검('예외가 한국어 문장까지 봐주지 않는다',
    /[가-힣]/.test('사람이 온다'.replace(법정번호, '')));
  검('⛔ 예외가 괄호 속 «아무» 한국어나 봐주지 않는다',
    /[가-힣]/.test('2026-세종-0591 (사람이 온다)'.replace(법정번호, '')));
  검('신고기관 이름까지는 봐준다',
    !/[가-힣]/.test('2026-세종-0591 (세종특별자치시)'.replace(법정번호, '')));
  검('영문 문서 제목으로 떨어진다', 영문이름({ name: '카리나', enTitle: 'Karina (South Korean singer)' }) === 'Karina');
  검('영문 이름이 아예 없으면 안 싣는다', 영문이름({ name: '홍길동', enTitle: null }) === null);

  if (실패.length) { console.error('❌ 자가시험 실패\n' + 실패.map((s) => `   · ${s}`).join('\n')); process.exit(1); }
  console.log(`✅ build-kcw-birthday-pages 자가시험 통과 (${센것})`);
  process.exit(0);
}

if (!fs.existsSync(원자료)) {
  console.error(`❌ 명단이 없다 — ${path.relative(뿌리, 원자료)}. 먼저 collect-star-daypillar.mjs 를 돌린다`);
  process.exit(1);
}
const 사람들 = JSON.parse(fs.readFileSync(원자료, 'utf8')).사람;
const 수요 = new Map();
if (fs.existsSync(수요길)) {
  for (const p of JSON.parse(fs.readFileSync(수요길, 'utf8')).people ?? []) 수요.set(p.q, { reads: p.reads, enTitle: p.enTitle });
}
const 날 = 날별로(사람들, 수요);

/* 🔴 [2026-08-26] 사람 지면 명단을 읽어 이름에 문을 단다.
   ⚠ 명단이 없으면 «걸지 않는다» — 예전과 똑같이 글자로 나간다. 빌드가 죽지 않게. */
const 사람지면길 = path.resolve(뿌리, 'src/data/wikitip-people.json');
let 이름표 = null; let q표 = null; let 겹친수 = 0;
if (fs.existsSync(사람지면길)) {
  const j = JSON.parse(fs.readFileSync(사람지면길, 'utf8'));
  const r = 이름표만들기(j.people ?? []);
  이름표 = r.표; q표 = r.q표; 겹친수 = r.겹친수;
  /* 🔴🔴 [2026-10-04 · 5번] **작품 칸이 빈 채로 나갔다 — 자가시험 99가지는 다 통과했는데.**
     까닭: 이 자의 `사람들` 은 collect-star-daypillar 가 낸 명단이고 거기엔 titles 가 없다.
     titles 는 wikitip-people.json 에만 있다. 둘을 q(위키데이터 번호)로 이어 붙인다.
     ⚠ 「검사가 통과해도 한 번은 실물을 본다」 — 지어 놓고 눈으로 봐서 잡았다.
     ⛔ 이름으로 잇지 않는다. 같은 이름이 둘 있을 수 있다 — q 는 하나뿐이다. */
  const 작품표 = new Map();
  for (const p of (j.people ?? [])) if (p?.q && Array.isArray(p.titles)) 작품표.set(p.q, p.titles);
  let 작품붙은수 = 0;
  for (const [, 줄들] of 날) {
    for (const 줄 of 줄들) {
      const t = 작품표.get(줄.q);
      if (t && t.length) { 줄.titles = t; 작품붙은수 += 1; }
    }
  }
  console.log(`   ⭐ 작품 칸을 붙인 사람 ${작품붙은수}명 — /title 546장으로 가는 문이다`);
  /* 🔴 [2026-10-04] q 로 맞추는 길이 생겼다 — 둘을 따로 적는다. 몇으로 맞췄는지 보이게 */
  console.log(`사람 지면 ${(j.people ?? []).length}장 → q ${q표.size}개 · 이름 ${이름표.size}개에 문을 단다` +
    (겹친수 ? ` (이름이 겹쳐 «안 거는» 것 ${겹친수}개 — 틀린 사람에게 보내지 않는다)` : ''));
} else {
  console.log('⚠ 사람 지면 명단이 없다 — 이름을 글자로만 낸다(예전과 같다)');
}

fs.mkdirSync(낼방, { recursive: true });
let 낸장 = 0; let 실은사람 = 0; let 걸린문 = 0;
const 목록 = [];

/**
 * 🔴 [2026-09-04] **두 바퀴로 돈다.** 등수는 366일을 «다 센 뒤»에야 알 수 있다.
 *   한 바퀴로 돌면서 등수를 적으려 하면 앞쪽 날은 뒤쪽 날을 모른 채 적게 된다 —
 *   1월 1일이 「1등」으로 나가고 12월 31일만 맞는다. 그것이 조용히 틀리는 꼴이다.
 */
const 날칸들 = [];
for (let m = 1; m <= 12; m++) {
  const 날수 = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
  for (let d = 1; d <= 날수; d++) {
    const k = `${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    날칸들.push({ day: k, people: (날.get(k) ?? []).length });
  }
}
const 자리 = 자리매기기(날칸들);
const 총사람 = 날칸들.reduce((a, b) => a + b.people, 0);
const 띠 = 잡음띠(총사람, 날칸들.length);
console.log(`자리 — ${자리.전체}일 · 중간 ${자리.중간}명 · 가장 붐빈 날 ${자리.가장많음.people}명 · 가장 한산한 날 ${자리.가장적음.people}명`);
console.log(`잡음 띠 — 고르게 흩뿌리면 하루 ${띠.아래}~${띠.위}명 (씨앗 ${띠.씨앗} · ${띠.횟수}번)`);
{
  const 셈 = new Map();
  for (const x of 날칸들) {
    const j = 잡음판정(x.people, 띠);
    셈.set(j, (셈.get(j) ?? 0) + 1);
  }
  for (const [k, v] of [...셈].sort((a, b) => b[1] - a[1])) console.log(`   ${String(v).padStart(3)}일  ${k}`);
}

for (let m = 1; m <= 12; m++) {
  const 날수 = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
  for (let d = 1; d <= 날수; d++) {
    const k = `${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const v = 날.get(k) ?? [];
        const 글 = 지면짓기(k, v, 이름표, 자리, 띠, q표);
    걸린문 += (글.match(/href="\/person\//g) ?? []).length;
    fs.writeFileSync(path.join(낼방, `${k}.html`), 글);
    const 보일 = v.map(영문이름).filter(Boolean);
    실은사람 += 보일.length;
    /* 🔴 [2026-08-27 · 5번] `kpop` 수를 여기 «같이» 적는다 — 달 지면 12장이 이 파일만
       읽기 때문이다. 달 지면도 「kpop birthdays in january」로 순위 63위였다.
       ⛔ 달 지면이 사람 자료를 «따로» 읽게 하지 않는다 — 두 벌이 되면 한쪽만 고치는 날이 온다. */
    const 케이팝 = v.filter((p) => 그룹소속.has(p.q)).length;
    목록.push({ day: k, url: `/born-on/${k}`, people: v.length, listed: 보일.length, kpop: 케이팝, top: 보일.slice(0, 3) });
    낸장++;
  }
}
fs.writeFileSync(낼자료, JSON.stringify({
  generated: new Date().toISOString(),
  whatThisIs: 'One page per calendar day: the Korean actors and singers born on it, ordered by how many people opened their English Wikipedia article in the last 30 days.',
  whatThisIsNot: 'A horoscope, and not search volume. Sharing a birthday means sharing a birthday.',
  pages: 낸장, peopleListed: 실은사람, peopleTotal: 사람들.length,
  days: 목록,
}, null, 1));

const 붐비는날 = [...목록].sort((a, b) => b.people - a.people).slice(0, 5);
console.log(`지면 ${낸장}장 · 실은 사람 ${실은사람}명 / 명단 ${사람들.length}명`);
console.log('가장 붐비는 날:');
for (const x of 붐비는날) console.log(`   ${날쓰기(x.day).padEnd(14)} ${String(x.people).padStart(3)}명  ${x.top.join(', ')}`);
console.log(`\n냈다 — ${path.relative(뿌리, 낼방)} · ${path.relative(뿌리, 낼자료)}`);
console.log('✅ 들어오는 문 — /born-on 첫 장 · /most-read · 달 지면 12장(/born-in/*). 나가는 문 — 자기 달 지면으로 올라간다');
