#!/usr/bin/env node
/**
 * build-seoulmarkets-target-changes.mjs — **「누가 목표주가를 «바꿨나»」** (P5 무료 지면 자료)
 *
 *   node scripts/build-seoulmarkets-target-changes.mjs --자가시험
 *   node scripts/build-seoulmarkets-target-changes.mjs
 *
 * ── 왜 이 자료인가 (2026-09-09 · P5) ──────────────────────────────
 * 사장님이 서울마켓츠를 「데이터 가공·제공업」으로 못 박으셨고, 그 상품 넷 가운데
 * **Korea Consensus Tape** 의 «무료 깔때기» 지면이 이것이다.
 *
 * ⭐ 우리 몫은 «값»이 아니라 **«바뀐 것»**이다. FnGuide 는 컨센서스 값을 판다.
 *   우리는 「어느 증권사가 어느 종목의 목표주가를 언제 «올렸나 내렸나»」를 낸다.
 *   ⇒ 그리고 그것은 **매일 쌓아야만 생기는 자료**다. 한경 지면이 창을 한 달로 자르기 때문이다.
 *
 * ── 🔴 이 자가 지키는 것 ───────────────────────────────────────
 * 🔴 **624건 가운데 목표주가가 «아예 없는» 것이 425건(68%)이다.** 그래서 「105건이 바뀌었다」는
 *   624 의 105 가 아니라 **199 의 105** 다. 분모를 숨기면 그 문장이 거짓이 된다.
 * ⛔ 「올렸다 = 좋다」로 쓰지 않는다. 우리는 사실만 낸다 — 누가·언제·얼마로 바꿨나.
 * ⛔ 증권사 영문명을 **지어내지 않는다.** 사전에 없으면 「안 적혀 있다」로 내고 수는 그대로 센다.
 * ⛔ 종목명도 같다 — 영문명이 없으면 종목코드만 낸다.
 * ⛔ 지면에 한국어를 내지 않는다. 손님이 영어권이다.
 * ⚠ 이것은 «한경 지면이 그날 보여 준 목록»이고 시장 전체가 아니다. 그 문장을 지면에 적는다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describeInstitution } from '../src/lib/institutions.mjs';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 방 = path.join(뿌리, 'archive/raw/hankyung-consensus');
const 낼길 = path.join(뿌리, 'src/data/seoulmarkets-target-changes.json');

/** 목표주가 문자열을 수로 — ⛔ 0 이나 빈 것은 «없는 것»이다.  */
export function 값(v) {
  const s = String(v ?? '').replace(/[^0-9.]/g, '');
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * 한 건이 무엇인가 — 올림·내림·유지·신규·목표주가없음 다섯 가운데 하나.
 * ⛔ 「없음」을 「유지」로 세지 않는다. 목표주가를 안 낸 리포트가 68% 다.
 */
export function 갈래(줄) {
  const t = 값(줄?.목표주가);
  const p = 값(줄?.이전목표주가);
  if (t === null) return 'noTarget';
  if (p === null) return 'initiated';
  if (t > p) return 'raised';
  if (t < p) return 'cut';
  return 'unchanged';
}

/** 증권사 영문명 — ⛔ 없으면 지어내지 않는다 */
export function 증권사영문(이름) {
  const d = describeInstitution(이름);
  const en = d?.en ?? null;
  return { en, missing: !en };
}

/** 의견 칸이 한국어·영어·약어가 섞여 있다 — 영문 한 벌로 고른다 */
export const 의견표 = {
  Buy: 'Buy', 매수: 'Buy', Hold: 'Hold', 중립: 'Hold', Sell: 'Sell', 매도: 'Sell',
  'Not Rated': 'Not rated', nr: 'Not rated', 'N/A': 'Not rated', 투자의견없음: 'Not rated',
};
export function 의견영문(v) {
  const s = String(v ?? '').trim();
  if (!s) return 'Not rated';
  return 의견표[s] ?? null; /* ⛔ 모르는 값을 「Not rated」로 뭉개지 않는다 — null 로 드러낸다 */
}

/** 여러 날 파일을 합친다 — 같은 보고서번호는 한 번만. ⛔ 소급이 안 되니 지난 날을 버리지 않는다 */
export function 합치기(파일들) {
  const 통 = new Map();
  const 날들 = new Set();
  for (const { 줄들 } of 파일들) {
    for (const r of (줄들 ?? [])) {
      const 열쇠 = String(r.보고서번호 ?? '');
      if (!열쇠) continue;
      if (!통.has(열쇠)) 통.set(열쇠, r);
      const d = String(r.발표일 ?? '').slice(0, 10);
      if (d) 날들.add(d);
    }
  }
  return { 줄들: [...통.values()], 날수: 날들.size, 첫날: [...날들].sort()[0] ?? null, 끝날: [...날들].sort().at(-1) ?? null };
}

function 짓기() {
  const 파일들 = fs.readdirSync(방).filter((f) => /^consensus-\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .map((f) => JSON.parse(fs.readFileSync(path.join(방, f), 'utf8')));
  if (!파일들.length) throw new Error('consensus 파일이 없다 — 수집기를 먼저 돌린다');
  const { 줄들, 날수, 첫날, 끝날 } = 합치기(파일들);

  const 셈 = { raised: 0, cut: 0, unchanged: 0, initiated: 0, noTarget: 0 };
  const 증권사 = new Map();
  const 바뀐것 = [];
  const 모르는의견 = new Set();

  for (const r of 줄들) {
    const g = 갈래(r);
    셈[g] += 1;
    const b = String(r.증권사 ?? '').trim();
    if (b) {
      if (!증권사.has(b)) 증권사.set(b, { reports: 0, raised: 0, cut: 0, withTarget: 0 });
      const o = 증권사.get(b);
      o.reports += 1;
      if (g !== 'noTarget') o.withTarget += 1;
      if (g === 'raised') o.raised += 1;
      if (g === 'cut') o.cut += 1;
    }
    const 의 = 의견영문(r.의견);
    if (의 === null) 모르는의견.add(String(r.의견));
    if (g === 'raised' || g === 'cut') {
      const t = 값(r.목표주가); const p = 값(r.이전목표주가);
      const bi = 증권사영문(b);
      바뀐것.push({
        ticker: String(r.종목코드 ?? '') || null,
        broker_en: bi.en,
        broker_en_missing: bi.missing,
        published_on: String(r.발표일 ?? '').slice(0, 10) || null,
        direction: g === 'raised' ? 'Raised' : 'Cut',
        previous_krw: p,
        target_krw: t,
        change_pct: (p && t) ? Math.round(((t - p) / p) * 1000) / 10 : null,
        rating: 의,
      });
    }
  }

  const 증권사줄 = [...증권사.entries()].map(([k, v]) => {
    const bi = 증권사영문(k);
    return {
      broker_en: bi.en, broker_en_missing: bi.missing,
      reports: v.reports, withTarget: v.withTarget, raised: v.raised, cut: v.cut,
      /* ⛔ 목표주가를 낸 건이 0 이면 비율을 내지 않는다 — 0으로 나누지 않고 null */
      movedShareOfWithTarget: v.withTarget ? Math.round(((v.raised + v.cut) / v.withTarget) * 1000) / 10 : null,
    };
  }).sort((a, b) => b.reports - a.reports);

  const 작성자 = new Set();
  for (const r of 줄들) {
    for (const n of String(r.작성자 ?? '').split(/[,·/]/).map((s) => s.trim()).filter(Boolean)) 작성자.add(n);
  }

  const 낸것 = {
    builtOn: new Date().toLocaleDateString('sv-SE'),
    windowFirstDay: 첫날,
    windowLastDay: 끝날,
    publishingDays: 날수,
    source: 'Hankyung Consensus report list, collected daily by us. English broker names from our own institution dictionary.',
    whatThisIs: 'Every equity report on the Hankyung consensus list, sorted by whether the analyst moved the target price, kept it, opened coverage, or published no target at all.',
    whatThisIsNot: [
      'Not the whole market. This is the list one Korean site showed on the days we collected it.',
      'Not a recommendation. A raised target is a fact about what an analyst published, not a view of ours.',
      'Not a complete window. The source list is capped at roughly one month, so history exists only because we save it daily.',
      'Not an accuracy measure. Whether these targets were met is a different page.',
    ],
    reports: 줄들.length,
    counts: 셈,
    reportsWithATarget: 줄들.length - 셈.noTarget,
    movedCount: 셈.raised + 셈.cut,
    /* 🔴 분모를 반드시 함께 낸다 — 624 의 105 가 아니라 199 의 105 다 */
    movedShareOfWithTarget: (줄들.length - 셈.noTarget)
      ? Math.round(((셈.raised + 셈.cut) / (줄들.length - 셈.noTarget)) * 1000) / 10 : null,
    distinctAnalystNames: 작성자.size,
    distinctTickers: new Set(줄들.map((r) => r.종목코드).filter(Boolean)).size,
    brokers: 증권사줄,
    brokersWithNoEnglishName: 증권사줄.filter((x) => x.broker_en_missing).length,
    moves: 바뀐것.sort((a, b) => String(b.published_on).localeCompare(String(a.published_on))),
    unknownRatingValues: [...모르는의견],
  };
  fs.mkdirSync(path.dirname(낼길), { recursive: true });
  fs.writeFileSync(낼길, `${JSON.stringify(낸것, null, 1)}\n`, 'utf8');
  return 낸것;
}

/* ── 자가시험 ─────────────────────────────────────────────────────────────── */
export function 자가시험() {
  let 통 = 0; const 실 = [];
  const 검 = (n, ok) => { if (ok) 통 += 1; else 실.push(n); };

  검('값 — 쉼표 든 수를 읽는다', 값('123,000') === 123000);
  검('⛔ 값 — 0 은 «없는 것»이다', 값('0') === null);
  검('⛔ 값 — 빈 것도 null', 값('') === null && 값(null) === null && 값(undefined) === null);
  검('값 — 원 표시가 붙어도 읽는다', 값('123,000원') === 123000);

  검('갈래 — 올렸다', 갈래({ 목표주가: '12000', 이전목표주가: '10000' }) === 'raised');
  검('갈래 — 내렸다', 갈래({ 목표주가: '9000', 이전목표주가: '10000' }) === 'cut');
  검('갈래 — 그대로 뒀다', 갈래({ 목표주가: '10000', 이전목표주가: '10000' }) === 'unchanged');
  검('갈래 — 처음 냈다', 갈래({ 목표주가: '10000', 이전목표주가: '' }) === 'initiated');
  검('🔴 갈래 — 목표주가가 없는 것을 «유지»로 세지 않는다',
    갈래({ 목표주가: '', 이전목표주가: '10000' }) === 'noTarget');
  검('⛔ 갈래 — 빈 것도 견딘다', 갈래(null) === 'noTarget' && 갈래({}) === 'noTarget');

  검('의견 — 한국어를 영문으로 고른다', 의견영문('매수') === 'Buy' && 의견영문('투자의견없음') === 'Not rated');
  검('의견 — 영어는 그대로', 의견영문('Hold') === 'Hold' && 의견영문('Not Rated') === 'Not rated');
  검('의견 — 빈 것은 Not rated', 의견영문('') === 'Not rated' && 의견영문(null) === 'Not rated');
  검('⛔ 의견 — 모르는 값을 Not rated 로 뭉개지 않는다', 의견영문('강력매수') === null);

  검('증권사영문 — 사전에 있으면 영문', 증권사영문('SK증권').en === 'SK Securities');
  검('⛔ 증권사영문 — 없으면 지어내지 않고 missing 으로 드러낸다', (() => {
    const r = 증권사영문('없는증권사이름');
    return r.en === null && r.missing === true;
  })());

  검('합치기 — 같은 보고서번호를 한 번만 센다', (() => {
    const r = 합치기([
      { 줄들: [{ 보고서번호: 'a', 발표일: '2026-09-01' }, { 보고서번호: 'b', 발표일: '2026-09-02' }] },
      { 줄들: [{ 보고서번호: 'a', 발표일: '2026-09-01' }, { 보고서번호: 'c', 발표일: '2026-09-03' }] },
    ]);
    return r.줄들.length === 3 && r.날수 === 3 && r.첫날 === '2026-09-01' && r.끝날 === '2026-09-03';
  })());
  검('⛔ 합치기 — 번호가 없는 줄은 버린다 (열쇠가 없으면 겹침을 못 막는다)',
    합치기([{ 줄들: [{ 발표일: '2026-09-01' }] }]).줄들.length === 0);
  검('⛔ 합치기 — 빈 것도 견딘다', 합치기([]).줄들.length === 0 && 합치기([{}]).줄들.length === 0);

  console.log(`목표주가 변경 자료 — 자가시험 ${통}/${통 + 실.length}`);
  실.forEach((x) => console.log(`   X ${x}`));
  return 실.length;
}

const 나 = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (나) {
  const 흠 = 자가시험();
  if (process.argv.includes('--자가시험')) process.exit(흠 ? 1 : 0);
  if (흠) { console.log('🔴 자가시험이 깨졌다 — 멈춘다'); process.exit(1); }

  const d = 짓기();
  console.log(`\n■ 창 ${d.windowFirstDay} ~ ${d.windowLastDay} · 발표일 ${d.publishingDays}일`);
  console.log(`  보고서 ${d.reports}건 · 목표주가를 낸 것 ${d.reportsWithATarget}건`
    + ` (나머지 ${d.counts.noTarget}건은 목표주가가 «없다»)`);
  console.log(`  올림 ${d.counts.raised} · 내림 ${d.counts.cut} · 유지 ${d.counts.unchanged}`
    + ` · 처음 낸 것 ${d.counts.initiated}`);
  console.log(`  🔴 바꾼 것 ${d.movedCount}건 — 목표주가를 «낸» ${d.reportsWithATarget}건의 ${d.movedShareOfWithTarget}%`);
  console.log(`     ⛔ 이것을 「${d.reports}건 중 ${d.movedCount}건」이라 적지 않는다`);
  console.log(`  증권사 ${d.brokers.length}곳 · 작성자 이름 ${d.distinctAnalystNames}명 · 종목 ${d.distinctTickers}개`);
  if (d.brokersWithNoEnglishName) {
    console.log(`\n🔴 영문명이 사전에 없는 증권사 ${d.brokersWithNoEnglishName}곳 — 지어내지 않았다:`);
    d.brokers.filter((x) => x.broker_en_missing).forEach((x) => console.log(`   · (보고서 ${x.reports}건)`));
    console.log('   ⇒ 6번께: src/lib/institutions.mjs 에 «그 회사 자기 영문명»으로 넣어 주십시오');
  }
  if (d.unknownRatingValues.length) {
    console.log(`\n⚠ 사전에 없는 의견 값 ${d.unknownRatingValues.length}가지 — null 로 드러냈다`);
  }
  console.log(`\n냈다 — ${낼길}`);
}
