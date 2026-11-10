#!/usr/bin/env node
/**
 * 색인요청-날마다.mjs — **구글이 안 가는 「문」을 날마다 줄 세워 색인 요청한다.**
 *
 * ── 🔴🔴 왜 (2026-10-17 · 5번) ─────────────────────────────────────────
 * 사장님 — 「**2/3 업무량을 쓰라고 한 일을 하고 있나? 해라**」(방문자 늘리기)
 *
 * 그날 재서 나온 수다. 짐작이 아니다 —
 * ```
 *   사이트맵에 낸 것 15,903장  ·  28일 동안 구글이 한 번이라도 내보인 것 2,074장 (13%)
 *   표본 30장에 물으니 16장이 「구글이 한 번도 안 왔다」
 * ```
 * ⇒ 병목은 «지면 수»가 아니라 «발견»이다. 지면을 더 찍어도 같은 자리에 쌓인다.
 *
 * ⭐ 그리고 **문이 닫혀 있으면 그 아래가 통째로 잠긴다** —
 * ```
 *   /school (백년지도)   2026-08-05 에 마지막으로 왔고, 그때 noindex 였다.
 *                        지금은 noindex 가 없다. 그런데 구글은 두 달 넘게 안 왔다.
 *                        그 아래 학교 지면이 2,525장이다.
 *   /taiwan/companies    「발견됨 - 현재 색인이 생성되지 않음」 — 아래 1,057장
 *   /uae/companies       같음 — 아래 104장
 * ```
 *
 * ⛔ 이것을 내 기억에 맡기지 않는다. 하루 할당량이 있어서 **여러 날에 걸쳐** 해야 하는 일이고,
 *   여러 날에 걸친 일을 사람이 기억해서 하면 반드시 끊긴다. 자가 날마다 한다.
 *
 * ── 이 자가 «안» 하는 것 ────────────────────────────────────────────────
 * ⛔ 색인을 «보장»하지 않는다. 구글에게 다시 와 달라고 줄을 세우는 것뿐이다.
 * ⛔ 「요청했다」를 「색인됐다」로 적지 않는다. 사흘 뒤에 다시 재서 적는다.
 * ⛔ 낱장 수천 장을 밀어 넣지 않는다 — **문만** 한다. 문이 열리면 아래는 링크로 간다.
 *
 * 쓰는 법
 *   node scripts/auto-index-request.mjs --잰다      어느 문이 닫혔나만 본다(안 누른다)
 *   node scripts/auto-index-request.mjs             닫힌 문에 요청한다(할당량까지)
 *   node scripts/auto-index-request.mjs --자가시험
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const 이력길 = 'docs/색인요청-이력.tsv';
export const 수요지면길 = 'docs/수요지면.tsv';   /* demand-pages.mjs 가 적는다 */
export const 되는화면길 = 'docs/되는화면.tsv';   /* GA4 로 잰 착지 화면 — 네 사이트 모두 */

/** 누른 그 자리에서 이력 한 줄을 적는다. ⛔ 끝에 몰아 적지 않는다 — 위 자물쇠 주석을 보라 */
export function 그자리에적는다(줄, 길 = path.join(뿌리, 이력길)) {
  try {
    const 머리 = fs.existsSync(길) ? '' : '# 날\t주소\t구글이 한 말 (그대로)\n';
    fs.appendFileSync(길, 머리 + 줄 + '\n', 'utf8');
    return true;
  } catch (e) {
    /* ⛔ 적지 못한 것을 조용히 넘기지 않는다 — 다음 사람이 또 누르게 된다 */
    console.log(`🔴 이력을 못 적었다 — ${String(e.message).slice(0, 60)}`);
    return false;
  }
}

/**
 * 「문」 — 그 아래 지면이 여럿 달린 목록 지면.
 * `아래` 는 그 문이 열리면 발견될 수 있는 지면 수다. 급한 차례를 이것으로 정한다.
 * ⛔ 낱장을 여기에 넣지 않는다. 문만 넣는다.
 */
export const 문들 = [
  { 자원: 'sc-domain:100yearmap.com', 주소: 'https://100yearmap.com/school', 아래: 2525 },
  { 자원: 'sc-domain:seoulmarkets.com', 주소: 'https://seoulmarkets.com/taiwan/companies', 아래: 1057 },
  { 자원: 'sc-domain:100yearmap.com', 주소: 'https://100yearmap.com/university', 아래: 420 },
  { 자원: 'sc-domain:100yearmap.com', 주소: 'https://100yearmap.com/major', 아래: 300 },
  { 자원: 'sc-domain:100yearmap.com', 주소: 'https://100yearmap.com/region', 아래: 250 },
  { 자원: 'sc-domain:100yearmap.com', 주소: 'https://100yearmap.com/age', 아래: 101 },
  { 자원: 'sc-domain:seoulmarkets.com', 주소: 'https://seoulmarkets.com/uae/companies', 아래: 104 },
  { 자원: 'sc-domain:100yearmap.com', 주소: 'https://100yearmap.com/work', 아래: 100 },
  { 자원: 'sc-domain:100yearmap.com', 주소: 'https://100yearmap.com/rankings', 아래: 60 },
  { 자원: 'sc-domain:100yearmap.com', 주소: 'https://100yearmap.com/all', 아래: 50 },
  { 자원: 'sc-domain:100yearmap.com', 주소: 'https://100yearmap.com/research', 아래: 40 },
  /* 🔴 [2026-10-17] K Culture Wire — 기사 문이 2026-08-24 에 와서 보고 안 실렸다 */
  { 자원: 'sc-domain:kculturewire.com', 주소: 'https://www.kculturewire.com/articles', 아래: 900 },
  { 자원: 'sc-domain:kculturewire.com', 주소: 'https://www.kculturewire.com/person', 아래: 800 },
  { 자원: 'sc-domain:kculturewire.com', 주소: 'https://www.kculturewire.com/actors', 아래: 300 },
  { 자원: 'sc-domain:kculturewire.com', 주소: 'https://www.kculturewire.com/data', 아래: 120 },
  { 자원: 'sc-domain:kculturewire.com', 주소: 'https://www.kculturewire.com/all-ten', 아래: 60 },
  /* 🔴 [2026-10-18] klifemap — /all 자체가 "URL is unknown to Google", 아래 1,295개 전부 잠김(2번, 10-17 13:19 제안) */
  { 자원: 'sc-domain:klifemap.ai', 주소: 'https://klifemap.ai/all', 아래: 1295 },
];

/**
 * 오늘 요청할 것을 고른다.
 * ⛔ 이미 색인된 문은 안 누른다 — 할당량이 아깝다.
 * ⛔ 요 며칠 안에 이미 요청한 문도 안 누른다 — 구글이 아직 일하는 중이다.
 * ⭐ 「아래가 많은 문」부터. 같은 한 번이면 2,525장을 여는 쪽이 낫다.
 *
 * @param 진단  [{ 주소, 색인됨 }]
 * @param 이력  [{ 날, 주소 }]
 * @param 쉴날  다시 요청하기까지 비우는 날 수
 */
export function 오늘할것(진단, 이력 = [], 이제 = new Date(), 쉴날 = 14) {
  const 최근 = new Set(
    (이력 ?? []).filter((x) => {
      const t = Date.parse(String(x.날));
      if (!Number.isFinite(t)) return false;
      if ((이제.getTime() - t) >= 쉴날 * 86400000) return false;
      /* 🔴 [2026-11-09] 할당량에 막힌 줄은 «요청한 것»이 아니다.
         구글이 받아 주지 않았으므로 줄에 서지도 못했다. 그런데 이 자는
         이력에 줄이 있다는 것만 보고 열나흘을 건너뛰었다.
         그 탓에 /rankings 가 10-17 과 11-02 에 둘 다 할당량에 막혔는데도
         「요 보름 안에 이미 요청했다」로 읽혀 한 번도 다시 누르지 못했다.
         ⇒ 할당량에 막힌 줄은 쉬는 날 셈에서 뺀다. */
      if (할당량끝났나(x.말 ?? x.결과 ?? '')) return false;
      return true;
    }).map((x) => x.주소),
  );
  return (진단 ?? [])
    .filter((x) => x && x.주소 && !x.색인됨 && !최근.has(x.주소))
    .map((x) => ({ ...x, 아래: Number(x.아래 ?? 0) }))
    .sort((a, b) => b.아래 - a.아래);
}

/**
 * 🔴🔴 [2026-11-10 · 5번] **같은 주소를 하루에 두 번 눌렀다. 귀한 할당량을 거기에 버렸다.**
 *
 * 오늘 이력을 세어 보니 14줄인데 **같은 다섯 주소가 두 번씩** 들어 있었다 —
 * 성북구 · equities · 유성구 · kospi-weights · 안양시 동안구.
 * 예약 작업이 먼저 돌고 있는 동안 내가 손으로 한 번 더 돌렸는데, 둘이 **같은 목록**을 집었다.
 *
 * 까닭은 하나다 — **이력을 맨 끝에 한꺼번에 적는다.**
 * 앞 사람이 다 끝내기 전에는 파일에 아무것도 없으니, 뒷사람이 읽어도 「오늘 한 것이 없다」로 보인다.
 *
 * ⭐ 이 문은 하루에 열 번 남짓밖에 못 연다. 다섯을 겹쳐 쓰면 **그날 절반을 버린 것**이다.
 * ⭐ 끝에 몰아 적으면 중간에 창이 죽었을 때 **누른 기록이 통째로 사라진다.** 그럼 내일 또 누른다.
 *
 * ⇒ 고친 것 둘 — ① 한 번 누를 때마다 그 자리에서 적는다 ② 자물쇠로 두 자가 겹치지 않게 한다.
 */
export const 자물쇠길 = 'docs/고정업무-마커/.색인요청-도는중';

/** 자물쇠가 아직 살아 있나 — 묵은 것(기본 두 시간)은 죽은 것으로 본다 */
export function 자물쇠살았나(적힌시각, 이제 = new Date(), 숨넘는분 = 120) {
  const t = Date.parse(String(적힌시각 ?? ''));
  if (!Number.isFinite(t)) return false;       /* 깨진 자물쇠는 막지 않는다 */
  const 지난분 = (이제.getTime() - t) / 60000;
  if (지난분 < 0) return false;                /* 미래 시각도 막지 않는다 */
  return 지난분 < 숨넘는분;
}

/** 구글이 한 말이 「오늘은 그만」인가 */
export function 할당량끝났나(말) {
  const g = String(말 ?? '');
  return /할당량|quota|내일 다시/.test(g);
}

/** 구글이 한 말이 「받았다」인가 */
export function 받아들였나(말) {
  const g = String(말 ?? '');
  if (할당량끝났나(g)) return false;
  return /크롤링 대기열에 추가|색인 생성이 요청됨|색인 생성을 요청했습니다/.test(g);
}

/** 이력 한 줄 — 날·주소·구글이 한 말 그대로 */
export function 이력줄(주소, 말, 이제 = new Date()) {
  const 날 = 이제.toLocaleDateString('sv-SE');
  const 깨끗 = String(말 ?? '').replace(/[\t\n\r]+/g, ' ').trim() || '(구글이 아무 말도 안 했다)';
  return `${날}\t${주소}\t${깨끗}`;
}

/**
 * 🔴 [2026-10-17] 수요가 이미 잰 낱장을 색인 줄 «뒤»에 세운다.
 *   문 하나가 수천 장을 열고 낱장 하나는 한 장이다 — 그래서 뒤다.
 *   ⚠ 노출이 많은 낱장이 그 안에서 먼저다. 「아래」 자리에 노출을 넣어 차례를 맞춘다.
 *   ⛔ 「아래 1,000장」처럼 보이면 안 되므로 1 을 넘지 않게 눌러 둔다.
 */
export function 수요지면읽기(글, 자원 = "sc-domain:seoulmarkets.com") {
  return String(글 ?? "").split("\n")
    .map((x) => x.trim()).filter((x) => x && !x.startsWith("#"))
    .map((x) => x.split("\t"))
    .filter((x) => x.length >= 4 && x[3].startsWith("/"))
    .map((x) => ({
      자원,
      주소: "https://seoulmarkets.com" + x[3],
      아래: Math.min(1, Number(x[1]) / 10000),   /* 문보다 «항상» 뒤 */
      수요: Number(x[1]) || 0,
    }))
    .sort((a, b) => b.수요 - a.수요);
}
/** 자원 이름에서 손님이 여는 주소를 만든다 */
export function 자원의주소(자원) {
  const d = String(자원 ?? '').replace(/^sc-domain:/, '').trim();
  if (!d) return null;
  /* ⚠ 케이컬처와이어는 www 가 정본이다(server.mjs 가 비www 를 301 로 보낸다).
     301 나는 주소를 색인 요청에 넣으면 구글이 「리디렉션」으로 세고 끝난다 */
  return 'https://' + (d === 'kculturewire.com' ? 'www.' + d : d);
}

/**
 * 「되는 화면」을 읽는다 — docs/되는화면.tsv
 *
 * 🔴 [2026-11-09 · 사장님 「1명이라도 오는 통로가 되면 다 해」]
 *   오늘 이 자를 돌렸더니 「오늘 요청할 것 0개」가 나왔다. 문 15개가 전부 쉬는 중이고
 *   수요지면.tsv 는 **서울마켓츠 전용으로 박혀 있어** 다른 사이트를 못 넣는다.
 *   그 사이 하루 할당량은 한 번도 안 쓰이고, 서울마켓츠는 3,435장이 크롤조차 안 됐다.
 *   ⇒ GA4 로 재서 «손님이 실제로 내려앉는» 화면을 네 사이트 모두에서 받는다.
 *
 * ⚠ 「세션」은 구글 노출이 아니라 모든 통로를 합쳐 내려앉은 세션이다. 차례를 정하는 데만 쓴다.
 * ⛔ 수요지면보다도 «뒤»에 세운다 — 저쪽은 구글이 이미 노출시키는 곳이라 더 가깝다.
 */
export function 되는화면읽기(글) {
  return String(글 ?? '').split('\n')
    .map((x) => x.trim()).filter((x) => x && !x.startsWith('#'))
    .map((x) => x.split('\t'))
    .filter((x) => x.length >= 4 && x[0].startsWith('sc-domain:') && x[3].startsWith('/'))
    .map((x) => {
      const 집 = 자원의주소(x[0]);
      return 집 ? {
        자원: x[0].trim(),
        주소: 집 + x[3].trim(),
        아래: Math.min(0.5, (Number(x[1]) || 0) / 10000),   /* 문·수요지면보다 «항상» 뒤 */
        세션: Number(x[1]) || 0,
        통로: x[2].trim(),
      } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.세션 - a.세션);
}

/** 이력 파일을 읽어 [{ 날, 주소, 말 }] 로 */
export function 이력읽기(글) {
  return String(글 ?? '').split('\n')
    .map((x) => x.trim()).filter((x) => x && !x.startsWith('#'))
    .map((x) => { const [날, 주소, 말] = x.split('\t'); return { 날, 주소, 말 }; })
    .filter((x) => x.날 && x.주소);
}

/* ── 자가시험 ─────────────────────────────────────────────────────────── */
export function 자가시험() {
  const 것 = [];
  const 검 = (이름, 참) => 것.push({ 이름, 참: !!참 });
  const 이제 = new Date(2026, 9, 17);

  const 진단 = [
    { 주소: 'a', 색인됨: false, 아래: 100 },
    { 주소: 'b', 색인됨: true, 아래: 9000 },
    { 주소: 'c', 색인됨: false, 아래: 2525 },
  ];
  const r = 오늘할것(진단, [], 이제);
  검('⛔ 이미 색인된 문은 안 누른다 — 할당량이 아깝다', !r.some((x) => x.주소 === 'b'));
  검('⭐ 아래가 많은 문이 먼저다', r[0].주소 === 'c' && r[1].주소 === 'a');
  검('닫힌 문만 남는다', r.length === 2);

  const 이력 = [{ 날: '2026-10-15', 주소: 'c' }];
  검('⛔ 이레 전에 요청한 문은 다시 안 누른다',
    !오늘할것(진단, 이력, 이제).some((x) => x.주소 === 'c'));
  검('⭐ 한 달 전 것은 다시 누른다',
    오늘할것(진단, [{ 날: '2026-09-01', 주소: 'c' }], 이제).some((x) => x.주소 === 'c'));
  검('⛔ 날짜가 깨진 이력에 안 터진다',
    오늘할것(진단, [{ 날: '언젠가', 주소: 'c' }], 이제).length === 2);
  검('⛔ 빈 것에 안 터진다', 오늘할것(null, null, 이제).length === 0);

  /* 🔴 [2026-11-09] 할당량에 막힌 줄은 요청한 것이 아니다 — 쉬는 날 셈에서 빠져야 한다 */
  검('🔴 할당량에 막힌 줄은 다시 누른다 — 구글이 받아 주지 않았다',
    오늘할것(진단, [{ 날: '2026-10-15', 주소: 'c', 말: '할당량을 초과하여 이 요청을 처리할 수 없습니다.' }], 이제)
      .some((x) => x.주소 === 'c'));
  검('⬜ 대조군 — 받아들여진 줄은 그대로 쉰다',
    !오늘할것(진단, [{ 날: '2026-10-15', 주소: 'c', 말: '우선순위 크롤링 대기열에 추가' }], 이제)
      .some((x) => x.주소 === 'c'));
  검('⛔ 말이 비어 있으면 요청한 것으로 본다 — 모르는 것을 유리하게 읽지 않는다',
    !오늘할것(진단, [{ 날: '2026-10-15', 주소: 'c' }], 이제).some((x) => x.주소 === 'c'));

  검('🔴 할당량 말을 알아본다',
    할당량끝났나('할당량을 초과하여 이 요청을 처리할 수 없습니다. 내일 다시 제출해 주세요.'));
  검('⬜ 대조군 — 받아들인 말은 할당량이 아니다', !할당량끝났나('우선순위 크롤링 대기열에 추가'));
  검('✅ 받아들인 말을 알아본다', 받아들였나('우선순위 크롤링 대기열에 추가'));
  검('✅ 다른 꼴도 알아본다', 받아들였나('색인 생성이 요청됨'));
  검('⛔ 할당량 말을 「받았다」로 읽지 않는다', !받아들였나('하루 할당량을 초과했습니다'));
  검('⛔ 빈 말을 「받았다」로 읽지 않는다', !받아들였나('') && !받아들였나(null));

  const 줄 = 이력줄('https://a.com/x', '우선순위 크롤링\n대기열에 추가', 이제);
  검('이력 줄에 탭이 셋이 아니다 — 줄바꿈을 지운다', 줄.split('\t').length === 3);
  검('이력 줄에 날이 들어간다', 줄.startsWith('2026-10-17'));
  검('⛔ 말이 없어도 줄이 선다 — 「못 읽었다」를 적는다',
    이력줄('u', '', 이제).includes('아무 말도 안 했다'));

  const 읽 = 이력읽기('# 주석\n2026-10-17\thttps://a\t받았다\n\n깨진줄\n');
  검('이력을 읽는다', 읽.length === 1 && 읽[0].주소 === 'https://a');

  /* 🔴 [2026-11-10] 같은 주소를 하루에 두 번 누른 흠 — 자물쇠와 그자리에적기 */
  {
    const 지금 = new Date('2026-11-10T11:00:00+09:00');
    검('방금 쥔 자물쇠는 살아 있다',
      자물쇠살았나('2026-11-10T10:55:00+09:00', 지금) === true);
    검('🔴 두 시간이 지난 자물쇠는 죽은 것으로 본다 — 창이 죽으면 자물쇠만 남는다',
      자물쇠살았나('2026-11-10T08:30:00+09:00', 지금) === false);
    검('경계 — 두 시간에서 1분 모자라면 아직 살아 있다',
      자물쇠살았나('2026-11-10T09:01:00+09:00', 지금) === true);
    검('⛔ 깨진 시각은 막지 않는다 — 자물쇠가 일을 세우면 안 된다',
      자물쇠살았나('언젠가', 지금) === false);
    검('⛔ 빈 자물쇠도 막지 않는다', 자물쇠살았나('', 지금) === false && 자물쇠살았나(null, 지금) === false);
    검('⛔ 미래 시각도 막지 않는다 — 시계가 어긋나도 일이 서면 안 된다',
      자물쇠살았나('2026-11-10T23:00:00+09:00', 지금) === false);
  }
  {
    const 임시 = path.join(os.tmpdir(), `색인이력-시험-${process.pid}.tsv`);
    try { fs.unlinkSync(임시); } catch { /* 없으면 그만 */ }
    그자리에적는다('2026-11-10\thttps://a\t받았다', 임시);
    그자리에적는다('2026-11-10\thttps://b\t받았다', 임시);
    const 글 = fs.readFileSync(임시, 'utf8');
    검('그자리에적는다 — 머리글을 한 번만 적는다', (글.match(/^# 날/gm) ?? []).length === 1);
    검('그자리에적는다 — 두 줄이 다 남는다', 이력읽기(글).length === 2);
    검('🔴 바로 적으므로 다음 사람이 그 자리에서 읽는다 — 끝에 몰아 적던 것이 흠이었다',
      이력읽기(글).some((x) => x.주소 === 'https://a'));
    try { fs.unlinkSync(임시); } catch { /* 지워졌으면 그만 */ }
  }
  검('⛔ 못 적으면 조용히 참이라고 하지 않는다',
    그자리에적는다('x', path.join(os.tmpdir(), '없는폴더-' + process.pid, 'a.tsv')) === false);

  {
    const t = "# 머리\ndaoudata\t45\t6.2\t/company/daou-data\ngemvax\t13\t3.6\t/company/gemvax-and-kael\n";
    const d = 수요지면읽기(t);
    검('수요 지면을 읽는다', d.length === 2);
    검('노출 많은 것이 먼저다', d[0].주소.endsWith('/company/daou-data'));
    검('🔴 수요 지면은 «문보다 뒤»에 선다 — 문 하나가 수천 장을 연다',
      d.every((x) => x.아래 <= 1) && 문들.every((x) => x.아래 > 1));
    검('⛔ 깨진 줄에 안 터진다', 수요지면읽기('아무거나\n\n').length === 0);
    검('⛔ 빈 것에 안 터진다', 수요지면읽기(null).length === 0);
  }

  /* 🔴 [2026-11-09] 되는 화면 — 네 사이트 모두에서 받는다 */
  {
    const t = ['# 자원\t세션\t통로\t주소',
      'sc-domain:100yearmap.com\t48\t네이버모바일\t/report/area/경기도-의정부시',
      'sc-domain:kculturewire.com\t9\tChatGPT\t/born-in/november',
      '망가진 줄'].join('\n');
    const r = 되는화면읽기(t);
    검('되는 화면을 읽는다', r.length === 2);
    검('세션이 많은 것이 먼저다', r[0].주소.endsWith('/report/area/경기도-의정부시'));
    검('🔴 케이컬처와이어는 www 로 적는다 — 비www 는 301 이라 색인 요청이 헛돈다',
      r[1].주소 === 'https://www.kculturewire.com/born-in/november');
    검('백년지도는 www 를 안 붙인다',
      r[0].주소 === 'https://100yearmap.com/report/area/경기도-의정부시');
    검('🔴 되는 화면은 문보다 «뒤»에 선다',
      r.every((x) => x.아래 <= 0.5) && 문들.every((x) => x.아래 > 1));
    검('⛔ 깨진 줄에 안 터진다', 되는화면읽기('아무거나\n\n').length === 0);
    검('⛔ 빈 것에 안 터진다', 되는화면읽기(null).length === 0);
    검('자원 이름이 없는 줄은 안 받는다',
      되는화면읽기('100yearmap.com\t5\tx\t/a').length === 0);

    /* 실제 파일이 읽히나 — 0줄이면 못 읽은 것이다 */
    const 실물 = fs.existsSync(path.join(뿌리, 되는화면길))
      ? 되는화면읽기(fs.readFileSync(path.join(뿌리, 되는화면길), 'utf8')) : [];
    검('🔴 실제 되는화면.tsv 를 읽는다 — 0줄이면 못 읽은 것이다', 실물.length > 10);
    검('🔴 네 사이트가 다 들어 있다 — 한 곳만 있으면 한 곳만 보고 있는 것이다',
      new Set(실물.map((x) => x.자원)).size === 4);
  }
  검('🔴 문 목록에 /school 이 들어 있다 — 아래가 가장 많다',
    문들.some((x) => x.주소.endsWith('/school') && x.아래 > 2000));
  검('⛔ 문 목록이 낱장을 물고 있지 않다',
    !문들.some((x) => /\/company\/|\/school\/\d|\/article\//.test(x.주소)));
  검('문마다 자원이 달려 있다', 문들.every((x) => /^sc-domain:/.test(x.자원)));

  for (const x of 것) console.log(`${x.참 ? '✅' : '🔴'} ${x.이름}`);
  const 탈 = 것.filter((x) => !x.참).length;
  console.log(탈 ? `\n🔴 자가시험 ${탈}건 탈` : `\n✅ 자가시험 ${것.length} 통과`);
  return 탈 === 0;
}

/* ── 손으로 돌릴 때 ───────────────────────────────────────────────────── */
const 나인가 = process.argv[1] && process.argv[1].includes('auto-index-request');
if (나인가 && process.argv.includes('--자가시험')) process.exit(자가시험() ? 0 : 1);

if (나인가) {
  const { 토큰받기 } = await import('./ga4-report.mjs');
  (function 환경파일읽기() {
    try {
      const 본문 = fs.readFileSync(path.join(뿌리, '.env'), 'utf8');
      for (const 줄 of 본문.split(/\r?\n/)) {
        const m = 줄.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
        if (!m) continue;
        if (process.env[m[1]] === undefined) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
      }
    } catch { /* 없으면 정상 */ }
  })();

  const 키길 = process.env.GOOGLE_APPLICATION_CREDENTIALS
    || process.env.SEARCH_CONSOLE_KEY_FILE || process.env.GA4_KEY_FILE;
  const 키 = JSON.parse(fs.readFileSync(키길, 'utf8'));
  const 토 = await 토큰받기(키, 'https://www.googleapis.com/auth/webmasters');

  /* ① 구글에게 문마다 묻는다 — 짐작하지 않는다 */
  const 진단 = [];
  for (const 문 of 문들) {
    const r = await fetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
      method: 'POST',
      headers: { Authorization: `Bearer ${토}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ inspectionUrl: 문.주소, siteUrl: 문.자원, languageCode: 'ko' }),
    });
    const j = await r.json();
    if (j.error) {
      console.log(`⬜ 못 물었다 — ${문.주소} (${String(j.error.message).slice(0, 70)})`);
      continue;   /* ⛔ 「못 물었다」를 「색인됐다」로도 「안 됐다」로도 읽지 않는다 */
    }
    const i = j.inspectionResult?.indexStatusResult ?? {};
    const 색인됨 = i.verdict === 'PASS';
    진단.push({ ...문, 색인됨, 까닭: i.coverageState ?? '' });
    console.log(`${색인됨 ? '✅ 열렸다  ' : '🔴 닫혔다  '}${문.주소.replace(/^https?:\/\/[^/]+/, '')}`
      + `  아래 ${문.아래.toLocaleString('ko-KR')}장  ${색인됨 ? '' : '— ' + i.coverageState}`);
  }

  const 이력 = fs.existsSync(path.join(뿌리, 이력길))
    ? 이력읽기(fs.readFileSync(path.join(뿌리, 이력길), 'utf8')) : [];
  /* 🔴 [2026-10-17] 문을 다 연 날에는 수요가 이미 잰 낱장이 다음 차례다.
     ⛔ 여기 있는 주소는 demand-pages.mjs 가 «실물로 200 을 보고» 적은 것이다. */
  let 수요 = [];
  try {
    const q = path.join(뿌리, 수요지면길);
    if (fs.existsSync(q)) 수요 = 수요지면읽기(fs.readFileSync(q, "utf8"));
  } catch { /* 없으면 그냥 문만 한다 */ }
  /* 🔴 [2026-11-09] 문과 수요지면이 전부 쉬는 날에도 할당량을 놀리지 않는다.
     GA4 로 재서 «손님이 내려앉는» 화면을 네 사이트 모두에서 받아 뒤에 세운다. */
  let 되는것 = [];
  try {
    const q = path.join(뿌리, 되는화면길);
    if (fs.existsSync(q)) 되는것 = 되는화면읽기(fs.readFileSync(q, 'utf8'));
  } catch { /* 없으면 그냥 넘어간다 */ }
  const 할것 = 오늘할것([
    ...진단,
    ...수요.map((x) => ({ ...x, 색인됨: false })),
    ...되는것.map((x) => ({ ...x, 색인됨: false })),
  ], 이력);

  console.log(`\n■ 닫힌 문 ${진단.filter((x) => !x.색인됨).length}개 · 오늘 요청할 것 ${할것.length}개`);
  if (!할것.length) { console.log('⬜ 오늘 할 것이 없다 — 다 열렸거나 요 보름 안에 이미 요청했다'); process.exit(0); }
  for (const x of 할것) console.log(`   ${x.주소.replace(/^https?:\/\/[^/]+/, '')}  (아래 ${x.아래.toLocaleString('ko-KR')}장)`);

  if (process.argv.includes('--잰다')) {
    console.log('\n⭐ 재기만 했다. 한 번도 안 눌렀다.');
    process.exit(0);
  }

  /* 🔴 [2026-11-10] **자물쇠.** 예약 작업과 손으로 돌린 것이 겹쳐 같은 다섯 주소를
     두 번씩 눌렀다. 이 문은 하루에 열 번 남짓밖에 못 여는데 그날 절반을 버린 셈이다.
     ⚠ 두 시간이 지난 자물쇠는 죽은 것으로 보고 넘어간다 — 창이 죽으면 자물쇠만 남는다.
     ⛔ 「자물쇠가 있다」를 깨진 것으로 세지 않는다. 그냥 안 하고 나간다(exit 0). */
  const 자물쇠 = path.join(뿌리, 자물쇠길);
  try {
    if (fs.existsSync(자물쇠) && 자물쇠살았나(fs.readFileSync(자물쇠, 'utf8').trim())) {
      console.log('⬜ 다른 자가 지금 색인 요청을 돌고 있다 — 겹쳐 누르지 않는다.');
      console.log(`   (자물쇠 ${자물쇠길} · 두 시간이 지나면 저절로 풀린다)`);
      process.exit(0);
    }
    fs.writeFileSync(자물쇠, new Date().toISOString(), 'utf8');
  } catch { /* 자물쇠를 못 써도 일은 한다 — 막는 것이 목적이지 세우는 것이 아니다 */ }
  const 자물쇠푼다 = () => { try { fs.unlinkSync(자물쇠); } catch { /* 이미 없다 */ } };
  process.on('exit', 자물쇠푼다);
  process.on('SIGINT', () => { 자물쇠푼다(); process.exit(130); });

  /* ② 서치콘솔 화면에서 누른다 — API 로는 못 한다 */
  const { createRequire } = await import('node:module');
  const require2 = createRequire('file:///C:/Users/User/Documents/GitHub/klifemap/package.json');
  const puppeteer = require2('puppeteer-core');
  const 쉼 = (ms) => new Promise((r) => setTimeout(r, ms));

  const b = await puppeteer.connect({ browserURL: (process.env.KLM_CHROME_PORT ? 'http://127.0.0.1:' + process.env.KLM_CHROME_PORT : 'http://127.0.0.1:9222'), defaultViewport: null });
  const 적을것 = [];
  try {
    /* ⛔ 자원마다 창이 다르다 — 자원이 바뀌면 다시 연다 */
    let 지금자원 = null;
    let 탭 = await b.newPage();
    for (const x of 할것) {
      if (x.자원 !== 지금자원) {
        await 탭.goto(`https://search.google.com/search-console?resource_id=${encodeURIComponent(x.자원)}`,
          { waitUntil: 'domcontentloaded', timeout: 60000 });
        await 쉼(7000);
        지금자원 = x.자원;
      }
      const 칸 = await 탭.$('input[aria-label*="URL 검사"]');
      if (!칸) { console.log('🔴 검사 칸을 못 찾았다 — 화면이 바뀌었다'); break; }
      await 칸.click({ clickCount: 3 });
      await 탭.keyboard.press('Backspace');
      await 탭.keyboard.type(x.주소, { delay: 12 });
      await 탭.keyboard.press('Enter');
      await 쉼(13000);

      const 눌렀나 = await 탭.evaluate(() => {
        const e = [...document.querySelectorAll('[role="button"], button')]
          .find((y) => (y.innerText || '').trim() === '색인 생성 요청');
        if (!e) return false;
        e.click(); return true;
      });
      if (!눌렀나) { console.log(`⬜ 단추가 없다 — ${x.주소}`); continue; }

      let 말 = null;
      for (let i = 0; i < 25 && !말; i += 1) {
        await 쉼(3000);
        말 = await 탭.evaluate(() => {
          const g = (document.body.innerText || '');
          const m = g.match(/(색인 생성이 요청됨|색인 생성을 요청했습니다|우선순위 크롤링 대기열에 추가|하루 할당량[^\n]*|할당량을 초과[^\n]*)/);
          return m ? m[0] : null;
        });
      }
      console.log(`${받아들였나(말) ? '✅' : 할당량끝났나(말) ? '⛔' : '⚠'} ${x.주소.replace(/^https?:\/\/[^/]+/, '')} — ${말 ?? '구글이 아무 말도 안 했다'}`);
      /* 🔴 [2026-11-10] **누른 그 자리에서 적는다.** 끝에 몰아 적던 탓에 같은 주소를
         하루에 두 번 눌렀다(위 자물쇠 주석). 중간에 창이 죽어도 누른 기록은 남는다. */
      적을것.push(이력줄(x.주소, 말));
      그자리에적는다(이력줄(x.주소, 말));

      await 탭.evaluate(() => {
        const e = [...document.querySelectorAll('[role="button"], button')]
          .find((y) => /^(확인|OK|닫기)$/.test((y.innerText || '').trim()));
        if (e) e.click();
      });
      await 쉼(3000);
      if (할당량끝났나(말)) { console.log('⛔ 하루 한도다. 나머지는 내일 이 자가 다시 한다.'); break; }
    }
    await 탭.close();
  } finally { await b.disconnect(); }

  /* 🔴 [2026-11-10] 이력은 «누를 때마다» 그자리에적는다() 가 이미 적었다.
     여기서 또 적으면 한 번 누른 것이 두 줄이 되어, 다음 사람이 두 번 누른 줄로 읽는다. */
  if (적을것.length) console.log(`\n📈 이력에 ${적을것.length}줄 쌓았다 — ${이력길}`);
  try { fs.unlinkSync(path.join(뿌리, 자물쇠길)); } catch { /* 없으면 그만 */ }
  console.log('⛔ 「요청했다」는 우리가 한 일이다. 색인됐는지는 사흘 뒤에 다시 잰다.');
}
