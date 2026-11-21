#!/usr/bin/env node
/**
 * measure-kcw-newjeans-two-years.mjs — 「잃어버린 2년」을 **영문 열람수로 잰다.**
 *
 * ── 왜 (2026-09-11 00:4x · 5번) ──────────────────────────────────────────────
 * 오늘(9/11) 우리가 받은 신문 제목에 이것이 있었다 —
 *   스타뉴스 「'잃어버린 2년' 뉴진스, 과거 영광 되찾을 수 있을까 [★창간22]⑤」
 *   스타뉴스 「단독 "어도어에 10억 배상" 뉴진스 뮤비 제작사 항소심, 10월 결론」
 *
 * ⭐ 회사 표준 작업틀 그대로다 — 「이미 돌고 있는 이슈 + 남들은 못 내는 우리 축」.
 *   한국 지면은 「잃어버린 2년」이라 쓴다. 그런데 **밖에서도 잊었는지는 아무도 안 셌다.**
 *   우리는 영문 위키백과 열람수를 달마다 받을 수 있다 — 그것이 우리 축이다.
 *
 * ── ⚠ 정직 규칙 ─────────────────────────────────────────────────────────────
 * ```
 * ⚠ 열람수는 «인기»가 아니라 «관심»이다. 좋은 일로도 나쁜 일로도 오른다.
 *   그래서 지면에 「인기가 떨어졌다」로 쓰지 않는다. 「찾아본 사람이 줄었다」로 쓴다
 * ⛔ 견줄 상대를 우리가 «고르지» 않는다 — 고르면 우리 취향이 결론이 된다.
 *   같은 세대(4세대) 걸그룹 가운데 «영문 문서가 있고 이 창 전체가 잡히는» 것을 다 넣는다
 * ⛔ 자료가 없는 달을  — 그 달은 ⬜ 로 둔다
 * ⛔ user 접근만 센다(all-agents 는 봇이 섞인다)
 * ⛔ 한 편의 기사로 「법정 다툼이 원인이다」라고 말하지 않는다 — 우리는 원인을 못 쟀다.
 *   같은 창에서 다른 그룹은 어땠나를 나란히 놓는 것까지가 우리 몫이다
 * ```
 *
 * 쓰는 법
 *   node scripts/measure-kcw-newjeans-two-years.mjs --자가시험
 *   node scripts/measure-kcw-newjeans-two-years.mjs --잰다
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const 낼곳 = path.join(뿌리, 'src', 'data', 'kcw-newjeans-two-years.json');

export const 밑 = 'https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user';

/**
 * 견줄 명단 — 4세대 걸그룹 가운데 영문 위키 문서가 있는 것.
 * ⛔ 「좋아하는 그룹」을 넣지 않는다. 데뷔 연도(2018~2022)로 끊었다.
 * ⚠ 뉴진스는 2026-09 에 이름 다툼이 있었다. 문서 이름이 바뀌면 열람수가 갈리므로
 *   두 이름을 다 받아 «합쳐» 센다 — 한쪽만 세면 조용히 반이 사라진다.
 */
export const 볼것들 = [
  { 이름: 'NewJeans', 문서들: ['NewJeans', 'NJZ'], 데뷔: 2022, 주인공: true },
  { 이름: 'IVE', 문서들: ['Ive_(group)'], 데뷔: 2021 },
  { 이름: 'LE SSERAFIM', 문서들: ['Le_Sserafim'], 데뷔: 2022 },
  { 이름: 'aespa', 문서들: ['Aespa'], 데뷔: 2020 },
  { 이름: 'ITZY', 문서들: ['Itzy'], 데뷔: 2019 },
  /* 🔴 이름이 바뀐 그룹 — 두 이름을 다 받아 «합쳐» 센다. 뉴진스와 같은 처지다.
     2026-09-11 실측: 새 이름 I-dle 은 석 달 57,585 인데 옛 창에는 자료가 «없다».
     처음에 새 이름만 넣어 이 그룹을 통째로 못 쟀다 — 내 규칙을 한 곳에만 적용한 탓이다. */
  { 이름: '(G)I-DLE', 문서들: ['I-dle', '(G)I-dle'], 데뷔: 2018, 이름바뀜: true },
  /* ⚠ 영문 위키 문서 이름이 «전부 대문자»다. 낙타꼴(StayC)로 적으면 다른 문서를 센다 —
     실측 STAYC 15,550 대 StayC 138. 처음에 그렇게 적어 월 25회가 나왔다. */
  { 이름: 'STAYC', 문서들: ['STAYC'], 데뷔: 2020 },
  { 이름: 'NMIXX', 문서들: ['Nmixx'], 데뷔: 2022 },
];

/**
 * 🔴 창에 «받는 끝 달»이 들어 있나 — 들어 있으면 그 달은 하루치만 잡힌다.
 *
 * [2026-09-11 01:0x · 5번] 뉴진스 2026-08 이 1,343회로 나왔다(7월은 69,473).
 * 이름이 또 바뀐 줄 알고 여섯 이름을 두들겼는데, 실은 내가 창의 끝을 2026-08-01 로 준
 * 탓이었다 — 달 단위 API 는 그 경계에서 8월을 하루치로 준다. end=2026-09-01 로 주면 42,818 이다.
 * ⇒ 받는 끝은 «세려는 마지막 달의 다음 달»이어야 한다.
 */
export function 경계에걸렸나(창, 받는끝달) {
  if (!Array.isArray(창) || !받는끝달) return null;
  return 창.includes(String(받는끝달));
}

/** yyyymm → API 가 쓰는 yyyymmdd00 */
export function 달꼴(yyyymm, 끝인가 = false) {
  const s = String(yyyymm ?? '');
  if (!/^\d{6}$/.test(s)) return null;
  return s + (끝인가 ? '01' : '01') + '00';
}

/** 창을 만든다 — 첫 달부터 끝 달까지 yyyymm 목록 */
export function 달목록(첫, 끝) {
  if (!/^\d{6}$/.test(String(첫)) || !/^\d{6}$/.test(String(끝))) return null;
  const 것들 = [];
  let y = +String(첫).slice(0, 4), m = +String(첫).slice(4, 6);
  const ey = +String(끝).slice(0, 4), em = +String(끝).slice(4, 6);
  while (y < ey || (y === ey && m <= em)) {
    것들.push(String(y) + String(m).padStart(2, '0'));
    m += 1; if (m > 12) { m = 1; y += 1; }
  }
  return 것들;
}

/**
 * 같은 그룹의 문서 여럿을 달마다 «합친다».
 * ⛔ 어느 문서도 값이 없는 달은 null 로 둔다 — 
 */
export function 달마다합치기(문서별, 달들) {
  if (!문서별 || !Array.isArray(달들)) return null;
  const 낸것 = {};
  for (const 달 of 달들) {
    let 합 = null;
    for (const 값들 of Object.values(문서별)) {
      const v = 값들 ? 값들[달] : undefined;
      if (Number.isFinite(v)) 합 = (합 ?? 0) + v;
    }
    낸것[달] = 합;
  }
  return 낸것;
}

/** 두 창의 평균을 견준다. ⛔ 한쪽이라도 잰 달이 없으면 null */
export function 창견주기(달값, 앞창, 뒤창) {
  if (!달값 || !Array.isArray(앞창) || !Array.isArray(뒤창)) return null;
  const 평균 = (달들) => {
    const v = 달들.map((m) => 달값[m]).filter((x) => Number.isFinite(x));
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };
  const 앞 = 평균(앞창), 뒤 = 평균(뒤창);
  if (앞 == null || 뒤 == null || 앞 === 0) return null;
  return { 앞: Math.round(앞), 뒤: Math.round(뒤), 배: Number((뒤 / 앞).toFixed(3)),
    잰달: { 앞: 앞창.filter((m) => Number.isFinite(달값[m])).length, 뒤: 뒤창.filter((m) => Number.isFinite(달값[m])).length } };
}

async function 문서받기(문서, 첫, 끝) {
  const url = `${밑}/${encodeURIComponent(문서)}/monthly/${달꼴(첫)}/${달꼴(끝)}`;
  const r = await fetch(url, { headers: { 'User-Agent': 'KCultureWire/1.0 (data@kculturewire.com)' }, signal: AbortSignal.timeout(25000) });
  if (!r.ok) return null;                       /* 못 받으면 null — 0 으로 만들지 않는다 */
  const j = await r.json();
  if (!j || !Array.isArray(j.items)) return null;
  const 낸것 = {};
  for (const it of j.items) 낸것[String(it.timestamp).slice(0, 6)] = it.views;
  return 낸것;
}

/* ── 자가시험 ─────────────────────────────────────────────── */
export function 자가시험() {
  let 통 = 0; const 막 = [];
  const 검 = (n, ok) => { if (ok) 통++; else 막.push(n); };

  검('달꼴을 만든다', 달꼴('202409') === '2024090100');
  검('⛔ 여섯 자리가 아니면 null', 달꼴('2024') === null && 달꼴(null) === null);

  const 달들 = 달목록('202408', '202411');
  검('달 목록을 만든다', 달들.join(',') === '202408,202409,202410,202411');
  검('해를 넘긴다', 달목록('202411', '202502').join(',') === '202411,202412,202501,202502');
  검('한 달만도 된다', 달목록('202409', '202409').length === 1);
  검('⛔ 꼴이 틀리면 null', 달목록('20249', '202411') === null);

  const 문서별 = {
    NewJeans: { 202408: 100, 202409: 200, 202410: undefined },
    NJZ: { 202409: 50, 202410: 30, 202411: 10 },
  };
  const 합 = 달마다합치기(문서별, 달들);
  검('🔴 문서 여럿을 «합친다» — 이름이 바뀌면 한쪽만 세면 반이 사라진다', 합['202409'] === 250);
  검('한쪽만 있는 달도 센다', 합['202408'] === 100 && 합['202410'] === 30);
  검('⛔ 어느 쪽도 없는 달은 null — ',
    달마다합치기({ a: {} }, ['202408'])['202408'] === null);
  검('⛔ 문서별이 없으면 null', 달마다합치기(null, 달들) === null);

  const 달값 = { 202301: 1000, 202302: 1200, 202401: 400, 202402: 600 };
  const c = 창견주기(달값, ['202301', '202302'], ['202401', '202402']);
  검('두 창의 평균을 견준다', c.앞 === 1100 && c.뒤 === 500);
  검('배수를 낸다', c.배 === 0.455);
  검('🔴 몇 달을 실제로 쟀는지 함께 낸다 — 표본을 숨기지 않는다',
    c.잰달.앞 === 2 && c.잰달.뒤 === 2);
  검('⛔ 잰 달이 없으면 null', 창견주기(달값, ['209901'], ['202401']) === null);
  검('⛔ 앞창이 0 이면 null — 배수를 못 낸다', 창견주기({ 202301: 0, 202401: 5 }, ['202301'], ['202401']) === null);
  검('⛔ 달값이 없으면 null', 창견주기(null, [], []) === null);

  /* 🔴 [01:0x] 경계 — 이 시험이 없어서 마지막 달이 하루치로 잡힌 것을 자가시험이 못 잡았다.
     실제로 잡은 것은 «한 달 값이 이상해 보여 직접 두들겨 본 눈»이었다. 그것을 자로 굳힌다. */
  검('🔴 창에 받는 끝 달이 들어 있으면 잡아낸다',
    경계에걸렸나(달목록('202509', '202608'), '202608') === true);
  검('받는 끝 달이 창 밖이면 괜찮다',
    경계에걸렸나(달목록('202509', '202608'), '202609') === false);
  검('⛔ 창이 아니면 null', 경계에걸렸나(null, '202609') === null);
  검('⛔ 받는 끝 달이 없으면 null', 경계에걸렸나(['202608'], null) === null);

  검('견줄 것이 여덟이다', 볼것들.length === 8);
  검('주인공이 하나다', 볼것들.filter((x) => x.주인공).length === 1);
  검('🔴 뉴진스는 두 이름을 다 받는다 — 2026-09 에 이름 다툼이 있었다',
    볼것들.find((x) => x.주인공).문서들.length === 2);
  검('🔴 이름이 바뀐 그룹은 «모두» 두 이름을 받는다 — 한 곳에만 규칙을 적용하지 않는다',
    볼것들.filter((x) => x.이름바뀜 || x.주인공).every((x) => x.문서들.length >= 2));
  검('STAYC 는 전부 대문자다 — 낙타꼴로 적으면 다른 문서를 센다(15,550 대 138)',
    볼것들.find((x) => x.이름 === 'STAYC').문서들[0] === 'STAYC');
  검('⛔ 명단을 데뷔 연도로 끊었다 — 취향으로 고르지 않았다',
    볼것들.every((x) => x.데뷔 >= 2018 && x.데뷔 <= 2022));
  검('user 접근만 센다 — all-agents 는 봇이 섞인다', 밑.includes('/user'));
  검('영문 위키를 본다 — 우리 손님이 영어권이다', 밑.includes('en.wikipedia'));

  console.log('자가시험 — measure-kcw-newjeans-two-years.mjs\n');
  막.forEach((m) => console.log('  MAK ' + m));
  console.log(`\n통과 ${통} · 막힘 ${막.length}`);
  return 막.length === 0;
}

const 나 = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(나)) {
  if (process.argv.includes('--자가시험')) process.exit(자가시험() ? 0 : 1);
  if (!process.argv.includes('--잰다')) { console.log('⛔ --잰다 나 --자가시험 을 준다'); process.exit(1); }
  if (!자가시험()) { console.error('🔴 자가시험이 막혔다 — 값을 내지 않는다'); process.exit(1); }
  console.log('');

  /* 창 — 데뷔 전부터 지금까지. 「잃어버린 2년」이 2024-09 부터라 그 앞뒤를 다 담는다 */
  /* 🔴 받는 끝은 «세려는 마지막 달의 다음 달»이다 — 그러지 않으면 마지막 달이 하루치로 잡힌다.
     오늘이 2026-09-11 이므로 «온전한 마지막 달»은 2026-08 이고, 받는 끝은 202609 다. */
  const 첫달 = '202208', 받는끝달 = '202609';
  const 셀마지막달 = '202608';
  const 달들 = 달목록(첫달, 받는끝달);
  const 앞창 = 달목록('202309', '202408');   /* 다툼 전 열두 달 */
  const 뒤창 = 달목록('202509', 셀마지막달);  /* 「잃어버린 2년」의 뒤쪽 열두 달 */
  for (const [이름, 창] of [["앞창", 앞창], ["뒤창", 뒤창]]) {
    if (경계에걸렸나(창, 받는끝달)) {
      console.error(`🔴 ${이름}에 받는 끝 달(${받는끝달})이 들어 있다 — 그 달은 하루치만 잡힌다. 값을 내지 않는다`);
      process.exit(1);
    }
  }

  const 결과 = [];
  for (const 것 of 볼것들) {
    const 문서별 = {};
    for (const 문서 of 것.문서들) {
      문서별[문서] = await 문서받기(문서, 첫달, 받는끝달);
      /* ⚠ 250ms 로는 429(너무 자주 부름)가 났다. 남의 우물이니 넉넉히 쉰다 */
      await new Promise((s) => setTimeout(s, 700));
    }
    const 달값 = 달마다합치기(문서별, 달들);
    const 견줌 = 창견주기(달값, 앞창, 뒤창);
    결과.push({ ...것, 달값, 견줌, 못받은문서: 것.문서들.filter((d) => !문서별[d]) });
  }

  const 쓸것 = 결과.filter((r) => r.견줌);
  쓸것.sort((a, b) => a.견줌.배 - b.견줌.배);

  console.log('■ 영문 위키백과에서 «찾아본 사람» — 다툼 전 열두 달(2023-09~2024-08) 대 최근 열두 달(2025-09~2026-08)');
  console.log('  그룹            전 달평균    최근 달평균     배수');
  for (const r of 쓸것) {
    const 표 = r.주인공 ? '🔴' : '  ';
    console.log(`  ${표} ${r.이름.padEnd(12)} ${r.견줌.앞.toLocaleString('ko-KR').padStart(9)}  ${r.견줌.뒤.toLocaleString('ko-KR').padStart(10)}     ${r.견줌.배.toFixed(2)}배`);
  }
  const 못쟌 = 결과.filter((r) => !r.견줌);
  if (못쟌.length) {
    console.log('\n⬜ 못 쟨 것 ' + 못쟌.length + '개 — ' + 못쟌.map((r) => r.이름 + (r.못받은문서.length ? '(문서 못 받음: ' + r.못받은문서.join(',') + ')' : '')).join(' · '));
    console.log('  ⛔ 0 으로 채우지 않았다. 못 쟀으면 못 쟀다고 적는다');
  }

  const 주 = 결과.find((r) => r.주인공);
  if (주 && 주.견줌) {
    const 남 = 쓸것.filter((r) => !r.주인공).map((r) => r.견줌.배).sort((a, b) => a - b);
    const 가운데 = 남.length % 2 ? 남[(남.length - 1) / 2] : (남[남.length / 2 - 1] + 남[남.length / 2]) / 2;
    console.log(`\n⭐ 주인공 ${주.이름} ${주.견줌.배.toFixed(2)}배 · 나머지 ${남.length}팀의 가운뎃값 ${가운데.toFixed(2)}배`);
    console.log('  ⚠ 열람수는 «인기»가 아니라 «관심»이다. 좋은 일로도 나쁜 일로도 오른다.');
    console.log('  ⛔ 이 수로 「법정 다툼이 원인이다」라고 말하지 않는다 — 우리는 원인을 못 쟀다.');
  }

  fs.mkdirSync(path.dirname(낼곳), { recursive: true });
  fs.writeFileSync(낼곳, JSON.stringify({
    잰때: new Date().toISOString(), 창: { 첫달, 받는끝달, 셀마지막달 }, 앞창, 뒤창,
    우물: '영문 위키백과 열람수(Wikimedia REST · all-access · user)',
    조심할것: ['열람수는 인기가 아니라 관심이다', '원인을 재지 않았다', '이름이 바뀐 문서는 합쳐 셌다'],
    것들: 결과,
  }, null, 2), 'utf8');
  console.log('\n  → ' + 낼곳);
  process.exit(0);
}
