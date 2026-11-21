#!/usr/bin/env node
/**
 * collect-kcw-fictional-vs-real.mjs — **실재하지 않는 K팝 대상이 얼마나 읽히나.**
 *
 *   node scripts/collect-kcw-fictional-vs-real.mjs --자가시험
 *   node scripts/collect-kcw-fictional-vs-real.mjs --적는다
 *
 * ── 🔴 왜 (2026-09-10) ──────────────────────────────────────────────────
 *
 * 오늘 아침 우리 수집(943건)에서 같은 이야기가 다섯 번 걸렸다 —
 * Eggo 와플 · McDonald's 세트 · Mattel 인형 · 굿즈 프랜차이즈 · 시구.
 * 전부 **실재하지 않는 K팝 그룹**을 두고 맺은 계약이다.
 *
 * ⭐ 그러면 잴 것이 하나 있다 — **그 가상 대상이 실재 그룹보다 읽히나.**
 *   이것은 우리가 이미 쥔 우물(위키미디어 열람수, CC0)로 잴 수 있고,
 *   내가 아는 한 아무도 이 견줌을 내지 않는다.
 *
 * ── ⛔ 이 자가 지키는 것 — 오늘 아침에 한 번 틀린 자리다 ────────────────
 * ```
 * 🔴 «창을 하나만» 보고 내지 않는다. 12개월 합과 «마지막 달»을 둘 다 낸다 —
 *   실측: 12개월로는 영화가 실재 여섯을 합친 것보다 많은데(10.5M 대 8.5M),
 *        마지막 달로는 BTS «하나»에도 진다(199,579 대 375,577).
 *   ⛔ 유리한 창을 골라 내는 것은 오늘 아침 기술 갈래 배수를 부풀린 것과 같은 잘못이다
 * 🔴 영화 문서와 «그 안의 그룹» 문서를 갈라 센다 — 브랜드가 계약한 것이 어느 쪽인지
 *   이 두 수가 말해 준다. 실측: 영화 10,533,615 · 그룹 59,429 (177배)
 * ⛔ 「영화 문서를 읽은 것」을 「그룹을 좋아하는 것」으로 읽지 않는다. 줄거리·배우·노래를
 *   찾다가 읽힌다. 그 한계를 자료에 담아 지면이 그대로 싣게 한다
 * ⛔ 못 받은 문서를  — null 로 두고 이름을 적는다
 * ```
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
export const 낼곳 = 'src/data/kcw-fictional-vs-real.json';
export const 판 = 'en';
export const 창 = { 처음: '20250801', 끝: '20260731' };
export const 창말 = 'August 2025 to July 2026';

/** ⚠ 문서 이름은 «실측으로» 확인한 것만 넣는다. 짐작한 이름은 404 로 온다 */
export const 볼것 = [
  { 이름: 'KPop Demon Hunters', 문서: 'KPop_Demon_Hunters', 갈래: '가상', 무엇: 'the film' },
  { 이름: 'Huntr/x', 문서: 'Huntr/x', 갈래: '가상', 무엇: 'the group inside the film' },
  { 이름: 'Saja Boys', 문서: 'Saja_Boys', 갈래: '가상', 무엇: 'the rival group inside the film' },
  { 이름: 'BTS', 문서: 'BTS', 갈래: '실재', 무엇: 'group' },
  { 이름: 'BLACKPINK', 문서: 'Blackpink', 갈래: '실재', 무엇: 'group' },
  { 이름: 'TWICE', 문서: 'Twice', 갈래: '실재', 무엇: 'group' },
  { 이름: 'Stray Kids', 문서: 'Stray_Kids', 갈래: '실재', 무엇: 'group' },
  { 이름: 'NewJeans', 문서: 'NewJeans', 갈래: '실재', 무엇: 'group' },
  { 이름: 'aespa', 문서: 'Aespa', 갈래: '실재', 무엇: 'group' },
];

/* ── 재는 함수들 ───────────────────────────────────────────────────── */

/** 달별 목록을 합·첫달·마지막달로 접는다. ⛔ 빈 것은 null (0 이 아니다) */
export function 접기(items) {
  if (!Array.isArray(items) || !items.length) return null;
  const 것 = items
    .filter((x) => Number.isFinite(Number(x?.views)))
    .map((x) => ({ 달: String(x.timestamp ?? '').slice(0, 6), 수: Number(x.views) }));
  if (!것.length) return null;
  const 합 = 것.reduce((a, x) => a + x.수, 0);
  const 봉 = 것.reduce((m, x) => (!m || x.수 > m.수 ? x : m), null);
  return {
    합, 달수: 것.length,
    첫달: 것[0].달, 첫: 것[0].수,
    끝달: 것[것.length - 1].달, 끝: 것[것.length - 1].수,
    봉달: 봉.달, 봉: 봉.수,
    달별: 것,
  };
}

/** 얼마나 내려앉았나 (%). ⛔ 첫달이 0 이하면 뜻이 없다 — null */
export function 내려앉음(첫, 끝) {
  if (!Number.isFinite(첫) || !Number.isFinite(끝) || 첫 <= 0) return null;
  return +(((1 - (끝 / 첫)) * 100).toFixed(1));
}

/** 몇 배인가. ⛔ 분모가 0 이하면 null — 「무한배」를 내지 않는다 */
export function 배수(위, 아래) {
  if (!Number.isFinite(위) || !Number.isFinite(아래) || 아래 <= 0) return null;
  return +(위 / 아래).toFixed(1);
}

/**
 * 🔴 두 창으로 «둘 다» 견준다. 하나만 내면 유리한 창을 고른 것이 된다.
 * @returns {{십이개월:{가상:number,실재:number,배수:number|null,이겼나:boolean},
 *            마지막달:{가상:number,실재:number,배수:number|null,이겼나:boolean}}}
 */
export function 두창견줌(줄들) {
  const 가상 = 줄들.filter((r) => r.갈래 === '가상' && r.합 !== null);
  const 실재 = 줄들.filter((r) => r.갈래 === '실재' && r.합 !== null);
  /* 가상 쪽 대표는 «제일 큰 하나»다 — 셋을 합치면 갈래 합으로 부풀린 오늘 아침 잘못이 된다 */
  const 으뜸가상 = 가상.reduce((m, r) => (!m || r.합 > m.합 ? r : m), null);
  const 재기 = (칸) => {
    const g = 으뜸가상 ? 으뜸가상[칸] : null;
    const s = 실재.reduce((a, r) => a + (r[칸] ?? 0), 0);
    return { 가상: g, 실재: s, 배수: 배수(g, s), 이겼나: Number.isFinite(g) && g > s };
  };
  return { 십이개월: 재기('합'), 마지막달: 재기('끝'), 으뜸가상: 으뜸가상?.이름 ?? null };
}

/* ── 자가시험 ───────────────────────────────────────────────────────── */
function 자가시험() {
  const 것 = []; const 재다 = (이름, 됐나) => 것.push({ 이름, 됐나 });

  재다('볼것: 가상 셋 · 실재 여섯', (() => {
    const g = 볼것.filter((x) => x.갈래 === '가상').length;
    const s = 볼것.filter((x) => x.갈래 === '실재').length;
    return g === 3 && s === 6;
  })());
  재다('볼것: 문서 이름이 겹치지 않는다', new Set(볼것.map((x) => x.문서)).size === 볼것.length);

  const items = [
    { timestamp: '2025080100', views: 100 },
    { timestamp: '2025090100', views: 300 },
    { timestamp: '2025100100', views: 50 },
  ];
  재다('접기: 합·첫달·마지막달·봉우리', (() => {
    const r = 접기(items);
    return r.합 === 450 && r.첫 === 100 && r.끝 === 50 && r.봉 === 300 && r.봉달 === '202509' && r.달수 === 3;
  })());
  재다('🔴 접기: 빈 것은 null — 0 이 아니다', 접기([]) === null && 접기(null) === null);
  재다('⛔ 접기: 수가 아닌 것은 건너뛴다', (() => {
    const r = 접기([{ timestamp: '2025080100', views: 'x' }, { timestamp: '2025090100', views: 7 }]);
    return r.합 === 7 && r.달수 === 1;
  })());

  재다('내려앉음: 100 → 50 은 50%', 내려앉음(100, 50) === 50);
  재다('내려앉음: 늘면 음수', 내려앉음(50, 100) === -100);
  재다('🔴 내려앉음: 첫달이 0 이하면 null', 내려앉음(0, 5) === null && 내려앉음(-1, 5) === null);
  재다('⛔ 내려앉음: 못 재면 null', 내려앉음(null, 5) === null);

  재다('배수: 10 대 4 는 2.5배', 배수(10, 4) === 2.5);
  재다('🔴 배수: 분모가 0 이하면 null — 무한배를 내지 않는다',
    배수(10, 0) === null && 배수(10, -1) === null);
  재다('⛔ 배수: 못 재면 null', 배수(null, 4) === null);

  const 줄들 = [
    { 이름: 'Film', 갈래: '가상', 합: 1000, 끝: 10 },
    { 이름: 'InFilmGroup', 갈래: '가상', 합: 50, 끝: 1 },
    { 이름: 'A', 갈래: '실재', 합: 400, 끝: 40 },
    { 이름: 'B', 갈래: '실재', 합: 300, 끝: 30 },
  ];
  재다('🔴 두창견줌: 창이 «둘» 다 나온다 — 하나만 내면 유리한 창을 고른 것이다', (() => {
    const r = 두창견줌(줄들);
    return r.십이개월 && r.마지막달;
  })());
  재다('🔴 두창견줌: 12개월로는 이기고 마지막달로는 진다 — 그것이 이 자료의 요점이다', (() => {
    const r = 두창견줌(줄들);
    return r.십이개월.이겼나 === true && r.마지막달.이겼나 === false;
  })());
  재다('🔴 두창견줌: 가상 대표는 «제일 큰 하나»다 — 셋을 합치지 않는다', (() => {
    const r = 두창견줌(줄들);
    return r.십이개월.가상 === 1000 && r.으뜸가상 === 'Film';
  })());
  재다('두창견줌: 실재 쪽은 «합»이다', 두창견줌(줄들).십이개월.실재 === 700);
  재다('⛔ 두창견줌: 못 잰 줄(합이 null)은 안 센다', (() => {
    const r = 두창견줌([...줄들, { 이름: 'C', 갈래: '실재', 합: null, 끝: null }]);
    return r.십이개월.실재 === 700;
  })());

  const 실패 = 것.filter((x) => !x.됐나);
  console.log(`■ 자가시험 ${것.length - 실패.length}/${것.length}`);
  for (const x of 실패) console.log(`  🔴 ${x.이름}`);
  return 실패.length === 0;
}

/* ── 돌리기 ─────────────────────────────────────────────────────────── */
if (process.argv.includes('--자가시험')) process.exit(자가시험() ? 0 : 1);
if (!자가시험()) { console.log('🔴 자가시험이 깨졌다 — 받지 않는다.'); process.exit(1); }
console.log('');

const 앞 = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/${판}.wikipedia/all-access/user/`;
const 머리 = { 'User-Agent': 'KCultureWire/1.0 (u5@klifedesign.net)' };

const 줄들 = [];
const 못받은것 = [];
for (const b of 볼것) {
  const u = `${앞}${encodeURIComponent(b.문서)}/monthly/${창.처음}/${창.끝}`;
  let it = null;
  try {
    const r = await fetch(u, { headers: 머리 });
    if (r.ok) it = (await r.json()).items ?? null;
    else 못받은것.push(`${b.이름} (HTTP ${r.status})`);
  } catch (e) { 못받은것.push(`${b.이름} (${String(e.message).slice(0, 40)})`); }
  const 접힌 = 접기(it);
  줄들.push({
    이름: b.이름, 문서: b.문서, 갈래: b.갈래, 무엇: b.무엇,
    합: 접힌?.합 ?? null, 달수: 접힌?.달수 ?? null,
    첫달: 접힌?.첫달 ?? null, 첫: 접힌?.첫 ?? null,
    끝달: 접힌?.끝달 ?? null, 끝: 접힌?.끝 ?? null,
    봉달: 접힌?.봉달 ?? null, 봉: 접힌?.봉 ?? null,
    내려앉음: 내려앉음(접힌?.첫 ?? null, 접힌?.끝 ?? null),
    달별: 접힌?.달별 ?? null,
  });
  await new Promise((r) => setTimeout(r, 130));
}

const 견줌 = 두창견줌(줄들);
const 영화 = 줄들.find((r) => r.문서 === 'KPop_Demon_Hunters');
const 안그룹 = 줄들.find((r) => r.문서 === 'Huntr/x');

console.log(`■ 창 ${창말} · 영문 위키백과 · 사람 조회만`);
for (const r of [...줄들].sort((a, b) => (b.합 ?? -1) - (a.합 ?? -1))) {
  console.log(`   ${r.갈래 === '가상' ? '◐' : '○'} ${r.이름.padEnd(20)}`
    + ` ${(r.합 ?? 0).toLocaleString('en-GB').padStart(11)}`
    + ` · 마지막달 ${(r.끝 ?? 0).toLocaleString('en-GB').padStart(8)}`
    + `${r.내려앉음 === null ? '' : ` · ${r.내려앉음}% 내려앉음`}`);
}
console.log('');
console.log(`■ 12개월  가상 ${견줌.십이개월.가상?.toLocaleString('en-GB')}`
  + ` 대 실재 여섯 합 ${견줌.십이개월.실재.toLocaleString('en-GB')}`
  + ` → ${견줌.십이개월.이겼나 ? '가상이 이긴다' : '실재가 이긴다'} (${견줌.십이개월.배수}배)`);
console.log(`■ 마지막달 가상 ${견줌.마지막달.가상?.toLocaleString('en-GB')}`
  + ` 대 실재 여섯 합 ${견줌.마지막달.실재.toLocaleString('en-GB')}`
  + ` → ${견줌.마지막달.이겼나 ? '가상이 이긴다' : '실재가 이긴다'} (${견줌.마지막달.배수}배)`);
if (영화 && 안그룹) {
  console.log(`■ 영화 대 «영화 안의 그룹» — ${배수(영화.합, 안그룹.합)}배`
    + ` (${영화.합?.toLocaleString('en-GB')} 대 ${안그룹.합?.toLocaleString('en-GB')})`);
}
if (못받은것.length) console.log(`⬜ 못 받은 것 ${못받은것.length} — ${못받은것.join(' · ')}`);

if (!process.argv.includes('--적는다')) { console.log('\n⭐ 아직 안 적었다. --적는다 를 붙인다.'); process.exit(0); }

const 이제 = new Date();
const 달이름 = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'][이제.getMonth()];
fs.writeFileSync(path.join(ROOT, 낼곳), `${JSON.stringify({
  _meta: {
    page: 'A K-pop act that does not exist',
    builtAt: `${이제.getDate()} ${달이름} ${이제.getFullYear()}, `
      + `${String(이제.getHours()).padStart(2, '0')}:${String(이제.getMinutes()).padStart(2, '0')} KST`,
    window: 창말,
    edition: `${판}.wikipedia`,
    traffic: 'user (human) only',
    source: 'Wikimedia Pageviews API. Wikimedia releases its analytics datasets under the '
      + 'Creative Commons Zero public domain dedication; we read that page on 10 September 2026.',
    howToRead: 'Two windows are published side by side on purpose. Over the twelve months the film '
      + 'page was read more than the six biggest real acts put together. In the final month of that '
      + 'same window it was read less than one of them. Choosing only the window that favours the '
      + 'story would be a way of lying with a true number.',
    limits: [
      'A film article is opened by people looking up a plot, a cast list or a song. That is not '
        + 'the same curiosity as looking up a group, and this measure cannot separate them.',
      'Reads are not sales, streams, or affection.',
      'One edition only, English. The four Southeast Asian editions our readers use are measured '
        + 'separately on our brand pages.',
    ],
    notMeasured: 못받은것,
  },
  compare: 견줌,
  rows: 줄들,
}, null, 1)}\n`, 'utf8');
console.log(`\n📁 적었다 — ${낼곳}`);
