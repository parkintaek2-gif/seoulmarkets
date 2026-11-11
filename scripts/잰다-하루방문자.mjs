#!/usr/bin/env node
/**
 * 잰다-하루방문자.mjs — **사이트마다 «하루» 바깥 손님이 몇 명인가.**
 *
 * ── 🔴 왜 만드나 (2026-10-16 · 사장님 두 말씀) ──────────────────────────
 *
 *   ① 「**내가 말했다고 확인도 안하고 우리가 누른거라고 한거지? 제대로 확인해**」
 *      나는 GA4 의 Direct 를 통째로 「우리」로 버리고 있었다. 재 보니 반만 맞았다 —
 *      어제 하루 Direct 94명 가운데 **우리 28 · 봇 37 · 진짜 손님 32** 였다.
 *      채널 이름만 보고 버리면 **손님까지 버린다.**
 *
 *   ② 「**왜 자꾸 하루방문자가 아닌 28일치를 언급하나. 앞으론 절대 금지**」
 *      목표가 「유닛당 **하루** 1,000명」이다. 28일 합은 크게 보이지만 목표와 못 견준다.
 *      ⛔ 나눗셈 평균도 안 쓴다 — 사람은 소수점이 될 수 없다.
 *
 * ── ⭐ 가르는 자 셋 ─────────────────────────────────────────────────────
 * ```
 * 우리    도시 = Sejong-si (이 PC 가 놓인 곳. 사장님 확인)
 *         결정적 증거 — localhost · 127.0.0.1 이 «같은 도시»로 잡힌다. 손님은 열 수 없는 주소다
 *         98.5% 가 데스크톱 크롬 한 기기 · 언어 100% 한국어 · 날마다 평평하다
 *
 * 봇      도시가 데이터센터이고 «1인당 조회 1.0» — 한 장 열고 나간다
 *
 * 손님    위 둘을 뺀 나머지. 여러 도시로 흩어지고 휴대폰이 많으며 1인당 2~3장을 본다
 * ```
 *
 * ⚠ **도시 하나로만 가르지 않는다.** 이 PC 의 같은 IP 를 지오DB 가 제각각 읽는다 —
 *   구글 「세종시」 · ipinfo 「청주」 · ip-api 「공주」. 그래서 기기·1인당 조회수를 같이 본다.
 * ⚠ 청주는 사장님이 «원격으로 접속하시는» 곳이다. 다만 기기가 여덟 가지로 흩어져
 *   세종시(한 기기 98%)와 꼴이 전혀 달라 전부 우리로 보지 않는다. 못 가른 것은 못 갈랐다고 적는다.
 *
 * 쓰는 법
 *   node scripts/잰다-하루방문자.mjs --자가시험
 *   node scripts/잰다-하루방문자.mjs              어제 하루
 *   node scripts/잰다-하루방문자.mjs --날수 14    날마다 줄줄이
 */

/** 우리 PC 가 놓인 곳. ⛔ 여기 하나만 고친다 */
export const 우리도시 = 'Sejong-si';

/** 데이터센터가 있는 곳 — 사람이 사는 수보다 서버가 미는 수가 훨씬 많다 */
export const 봇도시 = [
  'Singapore', 'Amsterdam', 'Prague', 'The Dalles', 'Ashburn',
  'Council Bluffs', 'Dublin', 'Frankfurt am Main', 'Boardman', 'Columbus',
];

/**
 * 도시를 못 읽은 줄이 쓰는 표기 — 한 가지가 아니다.
 * 🔴🔴 [2026-11-11 · 사장님 「다이렉트 방문 중 우리 방문은 뺀 수치 아니니?」] **한쪽이 새고 있었다.**
 *   10-31 에 「도시를 못 읽은 Direct 는 봇으로 본다」를 넣을 때 `(not set)` «글자 하나»만 막았다.
 *   그런데 GA4 는 같은 것을 어떤 날은 `(not set)` 으로, 어떤 날은 **빈 칸**으로 돌려준다.
 *     11-08 — `(not set)` 이라 빠졌다      (케이컬처와이어 72명 · 에스마켓츠 44명)
 *     11-10 — **빈 칸**이라 손님으로 셌다  (케이컬처와이어 61명 · 에스마켓츠 38명)
 *   둘은 꼴이 똑같다 — 데스크톱 윈도 · 1인당 1.0장. 같은 것을 하루는 빼고 하루는 넣었다.
 *   그래서 11-10 하루 손님이 326명으로 부풀었다.
 *   ⛔ 「없는 값」을 글자 하나로 막지 않는다. 글자가 아니라 «비었나»로 막는다.
 */
export const 도시없음 = ['(not set)', '', '(other)'];
export const 도시를못읽었나 = (도시) => 도시 == null || 도시없음.includes(String(도시).trim());

/** 목표 — 사장님 2026-08-29 「유닛 당 하루 평균 방문자를 1,000명으로 한다」 */
export const 하루목표 = 1000;

/**
 * 한 줄이 「우리」인가.
 * ⛔ 도시만 보지 않는다 — 채널이 Direct 가 아니면(검색으로 들어왔으면) 우리가 아니다.
 */
export function 우리인가(줄) {
  if (!줄) return false;
  if (줄.채널 && 줄.채널 !== 'Direct') return false;
  return 줄.도시 === 우리도시;
}

/**
 * 한 줄이 「봇·클라우드」인가.
 * ⭐ 도시«와» 1인당 조회수를 같이 본다. 데이터센터에서 와도 여러 장을 보면 사람일 수 있다.
 */
export function 봇인가(줄, 봇목록 = 봇도시) {
  if (!줄) return false;
  if (줄.채널 && 줄.채널 !== 'Direct') return false;
  /* 🔴 도시를 못 읽은 Direct 는 데이터센터 목록에 없어도 봇으로 본다 (2026-10-31 · 11-11) */
  if (도시를못읽었나(줄.도시)) return true;
  if (!봇목록.includes(줄.도시)) return false;
  /* 1인당 조회를 못 재면 도시만으로 판정한다 — 「못 쟀다」를 「사람이다」로 읽지 않는다 */
  if (줄.명 == null || 줄.조회 == null || 줄.명 === 0) return true;
  return (줄.조회 / 줄.명) <= 1.2;
}

/** 바깥 손님인가 — 위 둘이 아니면 손님이다 */
export function 바깥손님인가(줄, 봇목록 = 봇도시) {
  return !우리인가(줄) && !봇인가(줄, 봇목록);
}

/** 줄들을 셋으로 가른다 */
export function 가른다(줄들, 봇목록 = 봇도시) {
  const 셋 = { 우리: [], 봇: [], 손님: [] };
  for (const 줄 of 줄들 ?? []) {
    if (우리인가(줄)) 셋.우리.push(줄);
    else if (봇인가(줄, 봇목록)) 셋.봇.push(줄);
    else 셋.손님.push(줄);
  }
  const 합 = (a) => a.reduce((s, x) => s + (x.명 ?? 0), 0);
  return { ...셋, 우리수: 합(셋.우리), 봇수: 합(셋.봇), 손님수: 합(셋.손님) };
}

/** 사이트마다 하루 바깥 손님 — 목표와 견줄 수 있는 «유일한» 수 */
export function 사이트별하루(줄들, 봇목록 = 봇도시) {
  const m = new Map();
  for (const 줄 of 줄들 ?? []) {
    if (!바깥손님인가(줄, 봇목록)) continue;
    const k = 줄.사이트 ?? '(모름)';
    if (!m.has(k)) m.set(k, { 사이트: k, 명: 0, 갈래: {} });
    const x = m.get(k);
    x.명 += 줄.명 ?? 0;
    const c = 줄.채널 ?? '(모름)';
    x.갈래[c] = (x.갈래[c] ?? 0) + (줄.명 ?? 0);
  }
  return [...m.values()].sort((a, b) => b.명 - a.명);
}

/** 목표까지 얼마나 왔나. ⛔ 나눗셈 «평균»이 아니라 «비율»이다 — 사람 수를 쪼개지 않는다 */
export function 목표대비(명, 목표 = 하루목표) {
  return Math.round((명 / 목표) * 1000) / 10;
}

/* ── 자가시험 ─────────────────────────────────────────────────────── */
export function 자가시험() {
  let 통과 = 0, 실패 = 0;
  const 참 = (이름, 됐나) => { if (됐나) 통과 += 1; else { 실패 += 1; console.error('  ⛔ ' + 이름); } };

  /* ① 우리 */
  참('세종시 Direct 는 우리다', 우리인가({ 도시: 'Sejong-si', 채널: 'Direct', 명: 28, 조회: 28 }));
  참('세종시라도 검색으로 왔으면 우리가 아니다',
    !우리인가({ 도시: 'Sejong-si', 채널: 'Organic Search', 명: 3, 조회: 5 }));

  /* ② 봇 — 도시«와» 1인당 조회수를 같이 본다 */
  참('싱가포르 1인당 1.0 은 봇이다', 봇인가({ 도시: 'Singapore', 채널: 'Direct', 명: 27, 조회: 27 }));
  참('데이터센터라도 1인당 3장을 보면 봇이 아니다',
    !봇인가({ 도시: 'Singapore', 채널: 'Direct', 명: 10, 조회: 30 }));
  참('1인당을 못 재면 도시로 판정한다 — 0 으로 읽지 않는다',
    봇인가({ 도시: 'Ashburn', 채널: 'Direct', 명: null, 조회: null }));

  /* 🔴 [2026-11-11] 11-10 에 99명이 새어 들어온 자리 — 도시가 «빈 칸»이었다 */
  참('도시가 (not set) 인 Direct 는 봇이다',
    봇인가({ 도시: '(not set)', 채널: 'Direct', 명: 72, 조회: 72 }));
  참('🔴 도시가 «빈 칸»인 Direct 도 봇이다 — 11-10 에 여기로 샜다',
    봇인가({ 도시: '', 채널: 'Direct', 명: 61, 조회: 61 }));
  참('도시 칸이 아예 없는 Direct 도 봇이다',
    봇인가({ 채널: 'Direct', 명: 38, 조회: 38 }));
  참('두 표기를 같은 것으로 읽는다', 도시를못읽었나('(not set)') && 도시를못읽었나('') && 도시를못읽었나(null));
  참('도시를 읽은 곳은 못 읽은 것이 아니다', !도시를못읽었나('Seoul') && !도시를못읽었나('Sejong-si'));
  참('도시가 비어도 검색으로 왔으면 봇이 아니다',
    !봇인가({ 도시: '', 채널: 'Organic Search', 명: 5, 조회: 9 }));
  참('🔴 GA4 거르개가 «빈 칸»을 막는 가지를 가지고 있다',
    JSON.stringify(거르개()).includes('emptyFilter'));

  /* ③ 손님 — ⬜ 대조군. 이것이 봇·우리로 잡히면 손님을 버리는 것이다 */
  참('서울 모바일 1인당 2.9 는 손님이다',
    바깥손님인가({ 도시: 'Seoul', 채널: 'Direct', 명: 143, 조회: 408 }));
  참('검색으로 온 것은 언제나 손님이다',
    바깥손님인가({ 도시: 'Seoul', 채널: 'Organic Search', 명: 13, 조회: 20 }));
  참('🔴 청주는 우리로 «자동 분류하지 않는다» — 기기가 흩어져 세종시와 꼴이 다르다',
    바깥손님인가({ 도시: 'Cheongju-si', 채널: 'Direct', 명: 12, 조회: 47 }));

  /* ④ 가르기 — 2026-10-15 실측과 맞아야 한다 */
  const 어제 = [
    { 도시: 'Sejong-si', 채널: 'Direct', 사이트: 'klifemap.ai', 명: 27, 조회: 27 },
    { 도시: 'Sejong-si', 채널: 'Direct', 사이트: 'seoulmarkets.com', 명: 1, 조회: 22 },
    { 도시: 'Singapore', 채널: 'Direct', 사이트: 'klifemap.ai', 명: 27, 조회: 27 },
    { 도시: 'Amsterdam', 채널: 'Direct', 사이트: 'klifemap.ai', 명: 6, 조회: 7 },
    { 도시: 'Seoul', 채널: 'Direct', 사이트: 'klifemap.ai', 명: 6, 조회: 8 },
    { 도시: 'Busan', 채널: 'Organic Search', 사이트: '100yearmap.com', 명: 13, 조회: 16 },
  ];
  const g = 가른다(어제);
  참('우리 28명', g.우리수 === 28);
  참('봇 33명', g.봇수 === 33);
  참('손님 19명', g.손님수 === 19);
  참('셋을 더하면 전체다', g.우리수 + g.봇수 + g.손님수 === 80);

  /* ⑤ 사이트별 */
  const 사 = 사이트별하루(어제);
  참('100yearmap 이 13명으로 맨 위', 사[0].사이트 === '100yearmap.com' && 사[0].명 === 13);
  참('klifemap 은 손님 6명만 센다', 사.find((x) => x.사이트 === 'klifemap.ai').명 === 6);
  참('seoulmarkets 는 손님이 없어 줄이 없다', !사.find((x) => x.사이트 === 'seoulmarkets.com'));
  참('갈래를 적어 둔다', 사[0].갈래['Organic Search'] === 13);

  /* ⑥ 목표 대비 */
  참('17명은 목표의 1.7%', 목표대비(17) === 1.7);
  참('1,000명이면 100%', 목표대비(1000) === 100);

  console.log(`하루 방문자 자 — 자가시험 ${통과} 통과 · ${실패} 실패`);
  return 실패 === 0;
}

/* ── 실제로 잰다 ──────────────────────────────────────────────────── */

/**
 * 🔴 [2026-10-16] **차원을 쪼갤수록 GA4 가 사람을 거듭 센다.**
 *   도시까지 넣어 재니 어제 손님이 60명, 도시를 빼니 53명이었다. 같은 날 같은 자료인데 다르다.
 *   `totalUsers` 는 «그 칸에 들어온 사람 수»라서, 칸을 잘게 쪼개면 한 사람이 여러 칸에 들어간다.
 *
 *   ⛔ 그러므로 도시로 «가른 뒤 더하지» 않는다.
 *   ⭐ 거르기를 **GA4 쪽으로 보내서** 구글이 중복 없이 세게 한다. 우리는 받은 수를 그대로 쓴다.
 */
export function 거르개(우리도시값 = 우리도시, 봇목록 = 봇도시) {
  const 같다 = (f, v) => ({ filter: { fieldName: f, stringFilter: { value: v } } });
  const 직접 = 같다('sessionDefaultChannelGroup', 'Direct');
  const 그리고 = (...들) => ({ andGroup: { expressions: 들 } });
  const 또는 = (...들) => ({ orGroup: { expressions: 들 } });
  const 아니다 = (e) => ({ notExpression: e });
  const 우리 = 그리고(직접, 같다('city', 우리도시값));
  /* 🔴🔴 [2026-10-31 · 사장님 「실측 결과치가 정말 맞나?」] **아니었다. 부풀려져 있었다.**
     ────────────────────────────────────────────────────────────────────
     10-30 「손님 333명」을 다시 확인했더니, 그 가운데 135명이
       · 도시가 (not set) — 어디서 왔는지 전혀 안 잡힌다
       · 경로가 Direct — 검색도 추천도 아니다
       · 1인당 조회 1.0장 — 딱 한 장 열고 나간다
     이 셋이 겹치는 것은 사람의 모습이 아니다. 자동 접속의 모습이다.
     seoulmarkets 74명 · kculturewire 61명이 전부 여기였다.
     ⇒ 「도시를 못 읽은 Direct」도 봇으로 본다. 손님 수는 333명이 아니라 202명이었다.
     ⚠ 도시를 못 읽은 진짜 손님도 있을 수 있다. 그래도 이쪽으로 센다 —
       없는 손님을 있다고 적는 것이 있는 손님을 빠뜨리는 것보다 나쁘다.
     ⛔ 「위쪽 어림이니 괜찮다」로 넘기지 않는다. 그 말로 넘겼다가 사장님이 잡아내셨다. */
  /* 🔴🔴 [2026-11-11] GA4 는 「못 읽은 도시」를 `(not set)` 으로도, **빈 칸**으로도 돌려준다.
     글자 하나만 막아 두어 11-10 에 99명이 손님으로 새어 들어갔다. 비어 있는 것 자체를 막는다. */
  const 비었다 = (f) => ({ filter: { fieldName: f, emptyFilter: {} } });
  const 도시모름 = 그리고(직접, 또는(...도시없음.filter((v) => v !== '').map((v) => 같다('city', v)), 비었다('city')));
  const 봇 = 또는(그리고(직접, 또는(...봇목록.map((c) => 같다('city', c)))), 도시모름);
  return { 우리, 봇, 손님만: 그리고(아니다(우리), 아니다(봇)) };
}

/* 보고서(report-unit-content-check.mjs)도 이 자를 쓴다 — 자가 둘이면 수가 갈린다 */
export async function 재온다(날수) {
  const { 토큰받기 } = await import('./lib/ga4.mjs');
  const t = await 토큰받기();
  if (t.못잼) { console.log('🔴 못 쟀다 — ' + t.못잼); return null; }
  const 묻기 = async (몸) => {
    const r = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${t.속성}:runReport`, {
      method: 'POST', headers: { Authorization: `Bearer ${t.토큰}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(몸),
    });
    return await r.json();
  };
  const 범위 = [{ startDate: `${날수}daysAgo`, endDate: 'yesterday' }];
  const 거 = 거르개();
  /** ⭐ 사이트×채널까지만 쪼갠다. 도시는 «거르는 데»만 쓰고 축으로 세우지 않는다 */
  const 한판 = async (거르기, 차원) => {
    const j = await 묻기({
      dateRanges: 범위, dimensions: 차원.map((n) => ({ name: n })),
      metrics: [{ name: 'totalUsers' }], dimensionFilter: 거르기, limit: 5000,
      orderBys: [{ dimension: { dimensionName: 'date' } }],
    });
    return (j.rows ?? []).map((r) => ({
      값: r.dimensionValues.map((x) => x.value), 명: Number(r.metricValues[0].value),
    }));
  };
  const 손님 = await 한판(거.손님만, ['date', 'hostName', 'sessionDefaultChannelGroup']);
  const 우리 = await 한판(거.우리, ['date']);
  const 봇 = await 한판(거.봇, ['date']);
  if (!손님.length && !우리.length && !봇.length) { console.log('🔴 줄이 안 왔다 — 못 쟀다'); return null; }
  return {
    손님: 손님.map((r) => ({ 날: r.값[0], 사이트: r.값[1], 채널: r.값[2], 명: r.명 })),
    우리: new Map(우리.map((r) => [r.값[0], r.명])),
    봇: new Map(봇.map((r) => [r.값[0], r.명])),
  };
}

const 인자 = (이름, 기본) => {
  const i = process.argv.indexOf(이름);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : 기본;
};

if (process.argv.includes('--자가시험')) {
  process.exit(자가시험() ? 0 : 1);
} else if (process.argv[1] && process.argv[1].endsWith('잰다-하루방문자.mjs')) {
  const 날수 = Number(인자('--날수', 1));
  const 것 = await 재온다(Math.max(1, 날수));
  if (!것) process.exit(1);
  const 날들 = [...new Set(것.손님.map((r) => r.날))].sort();
  console.log('■ 사이트마다 «하루» 바깥 손님 — 목표 ' + 하루목표 + '명');
  console.log('  ⛔ 28일 합도, 나눗셈 평균도 쓰지 않는다 (사장님 2026-10-16)');
  console.log('  ⛔ 도시는 «거르는 데»만 쓴다 — 축으로 세우면 구글이 사람을 거듭 센다\n');
  for (const 날 of 날들) {
    const 그날 = 것.손님.filter((r) => r.날 === 날)
      .map((r) => ({ ...r, 도시: '(안씀)' }));
    const 사 = 사이트별하루(그날);
    const 손님수 = 그날.reduce((s, x) => s + x.명, 0);
    const 글날 = `${날.slice(0, 4)}-${날.slice(4, 6)}-${날.slice(6, 8)}`;
    console.log(`── ${글날}   바깥 손님 ${손님수}명   (우리 ${것.우리.get(날) ?? '?'} · 봇 ${것.봇.get(날) ?? '?'})`);
    for (const x of 사) {
      const 막대 = '█'.repeat(Math.min(40, Math.round(x.명 / 2)));
      console.log(`   ${x.사이트.padEnd(22)} ${String(x.명).padStart(4)}명  목표의 ${String(목표대비(x.명)).padStart(5)}%  ${막대}`);
      console.log(`   ${' '.repeat(22)} ${Object.entries(x.갈래).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ' ' + v).join(' · ')}`);
    }
    console.log('');
  }
  console.log('⚠ 「우리」는 세종시 Direct 다 — 이 PC 가 놓인 곳(사장님 확인).');
  console.log('⚠ 「봇」은 ① 데이터센터 도시 ② 도시를 못 읽은 Direct — 둘 다 1인당 1.0장이다.');
  console.log('⛔ 도시를 못 읽은 Direct 는 손님에서 뺀다(2026-10-31 사장님 지적으로 고쳤다).');
  console.log('   그 전에는 손님 쪽에 남겨 두어 10-30 이 333명으로 부풀어 있었다 — 실제는 198명이다.');
}
