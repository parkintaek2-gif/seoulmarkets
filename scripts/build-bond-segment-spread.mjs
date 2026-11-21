#!/usr/bin/env node
/**
 * build-bond-segment-spread.mjs — 상장 채권을 **시장 갈래**와 **발행 주체**로 갈라
 * 수익률 중앙값과 그 스프레드를 매일 낸다.
 *
 * ── 왜 (2026-09-11 00:4x · 5번) ──────────────────────────────────────────────
 * 6번이 금리(Rates) 갈래를 키우기로 했고(23:56), 내가 「남들이 안 센 축」을 찾기로 했다.
 * 이미 있는 자 셋이 커브·시계열·거래집중도를 낸다. **없는 것이 이 둘이다** —
 *   ㉠ 시장 갈래(국채전문유통 KTS / 일반채권 / 소액채권) 사이의 «금리 차»
 *   ㉡ 발행 주체(국채·국민주택채·공공기관·금융·회사) 갈래별 «금리 분포»
 *
 * ⭐ 왜 이것이 남들이 안 센 축인가
 *   국고채 금리는 어디서나 말한다. 그런데 **소액채권**을 세는 곳이 없다 —
 *   하루 40종목 안쪽이지만 «개인이 사는 시장»이다. 그리고 발행 주체별 분포를
 *   영문으로 매일 내는 곳이 없다. 2026-09-09 실측으로 금융채가 국채보다 0.62%p 높았다.
 *
 * ── ⚠ 정직 규칙 ─────────────────────────────────────────────────────────────
 * ```
 * ⛔ 평균을 쓰지 않는다. **중앙값**을 쓴다 — 회사채에 117%대 값이 실제로 들어온다
 *   (만기 직전 채권의 계산 왜곡으로 보이지만 우리가 판정할 자리가 아니다)
 * ⛔ 이상해 보이는 행을 «지우지 않는다». 원자료가 그렇게 왔다는 것이 기록이다.
 *   대신 «몇 행이 이상 범위인가»를 함께 세어 낸다 — 숨기지 않고 적는다
 * ⛔ 시가·고가·저가 수익률 칸을 쓰지 않는다 — 음수 22행, 일중 변동폭 1위가 23,602%p 다.
 *   종가 수익률만 쓴다(100% 찼다)
 * ⛔ `잔존연수`·`분류` 칸을 쓰지 않는다 — 2.8%만 찼다.
 *   ⚠ 다만 그것이 「커브를 못 그린다」는 뜻은 아니다. build-bond-yield-curve.mjs 는
 *     이름에서 만기를 뽑아 잘 그린다. 내가 이 칸만 보고 「안 된다」고 잘못 알렸다(00:28 → 00:30 정정)
 * ⛔ 갈래에 종목이 셋 미만이면 중앙값을 내지 않는다(null) — 「못 쟀다」로 적는다
 * ```
 *
 * 쓰는 법
 *   node scripts/build-bond-segment-spread.mjs
 *   node scripts/build-bond-segment-spread.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const 밑감방 = path.join(뿌리, 'archive', 'raw', 'bonds');
export const 낼곳 = path.join(뿌리, 'src', 'data', 'bond-segment-spread.json');

/** 갈래에 이만큼은 있어야 중앙값을 낸다. 적으면 «못 쟀다» */
export const 적어도종목 = 3;
/** 이 범위를 벗어난 수익률은 «이상 범위»로 세어 낸다. ⛔ 지우지 않는다 */
export const 정상범위 = { 아래: 0.1, 위: 20 };

/** 중앙값. ⛔ 비면 null —  */
export function 가운뎃값(수들) {
  if (!Array.isArray(수들)) return null;
  const a = 수들.filter((x) => Number.isFinite(x)).sort((x, y) => x - y);
  if (!a.length) return null;
  return a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2;
}

/**
 * 이름으로 «발행 주체»를 가른다.
 * ⚠ 이름만으로 가르는 것이라 완전하지 않다. 그래서 못 가른 것은 «회사»로 몰지 않고
 *   그대로 「그밖」으로 둔다 — 짐작으로 채우면 갈래별 수가 조용히 틀린다.
 */
export function 발행주체(이름) {
  const n = String(이름 ?? '').trim();
  if (!n) return null;
  if (/^국고|^물가/.test(n)) return '국채';
  if (/^국민주택/.test(n)) return '국민주택채';
  if (/금융채|캐피탈|카드|은행|증권|보험|생명|손해/.test(n)) return '금융';
  if (/공사|공단|전력|가스|철도|수출입|주택도시|도로|토지/.test(n)) return '공공기관';
  if (/^서울|^부산|^대구|^인천|^광주|^대전|^울산|^경기|^강원|^충|^전|^경|^제주/.test(n)) return '지방채';
  return '그밖';
}

/** 한 날의 자료를 읽는다. 못 읽으면 null */
export function 하루읽기(길, { 읽기 = (p) => fs.readFileSync(p, 'utf8') } = {}) {
  let 글; try { 글 = 읽기(길); } catch { return null; }
  const 것들 = [];
  for (const 줄 of String(글).split(/\r?\n/)) {
    if (!줄.trim()) continue;
    try { 것들.push(JSON.parse(줄)); } catch { /* 깨진 줄은 세지 않는다 */ }
  }
  return 것들.length ? 것들 : null;
}

/**
 * 한 날을 잰다.
 * @returns {{시장:object, 주체:object, 이상범위행:number, 종목수:number}|null}
 */
export function 하루재기(것들) {
  if (!Array.isArray(것들) || !것들.length) return null;
  const 쓸것 = 것들.filter((o) => Number.isFinite(o.수익률));
  if (!쓸것.length) return null;

  /* ⛔ 이상 범위 행을 «세어 두되 빼지 않는다» — 중앙값은 이상치에 흔들리지 않는다 */
  const 이상범위행 = 쓸것.filter((o) => o.수익률 < 정상범위.아래 || o.수익률 > 정상범위.위).length;

  const 묶기 = (키내기) => {
    const m = new Map();
    for (const o of 쓸것) {
      const k = 키내기(o);
      if (k == null) continue;
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(o.수익률);
    }
    const 낸것 = {};
    for (const [k, v] of m) {
      낸것[k] = v.length >= 적어도종목
        ? { 종목수: v.length, 중앙값: Number(가운뎃값(v).toFixed(3)) }
        : { 종목수: v.length, 중앙값: null };   /* ⛔ 셋 미만이면 못 쟀다 */
    }
    return 낸것;
  };

  return {
    종목수: 쓸것.length,
    이상범위행,
    시장: 묶기((o) => (o.시장 ? String(o.시장) : null)),
    주체: 묶기((o) => 발행주체(o.이름)),
  };
}

/** 국채 대비 스프레드. ⛔ 둘 중 하나라도 못 쟀으면 null */
export function 스프레드(잰것, { 기준 = 'KTS' } = {}) {
  if (!잰것 || !잰것.시장) return null;
  const 밑 = 잰것.시장[기준];
  if (!밑 || 밑.중앙값 == null) return null;
  const 낸것 = {};
  for (const [k, v] of Object.entries(잰것.시장)) {
    if (k === 기준) continue;
    낸것[k] = v.중앙값 == null ? null : Number((v.중앙값 - 밑.중앙값).toFixed(3));
  }
  return { 기준, 기준중앙값: 밑.중앙값, 차: 낸것 };
}

/* ── 자가시험 ─────────────────────────────────────────────── */
export function 자가시험() {
  let 통 = 0; const 막 = [];
  const 검 = (n, ok) => { if (ok) 통++; else 막.push(n); };

  검('중앙값 — 홀수', 가운뎃값([3, 1, 2]) === 2);
  검('중앙값 — 짝수', 가운뎃값([1, 2, 3, 4]) === 2.5);
  검('🔴 중앙값은 이상치에 안 흔들린다 — 회사채에 117% 가 실제로 온다',
    가운뎃값([4.1, 4.3, 4.5, 117.082]) === 4.4);
  검('⛔ 비면 null — ', 가운뎃값([]) === null);
  검('⛔ 배열이 아니면 null', 가운뎃값(null) === null);
  검('⛔ 수가 아닌 것은 세지 않는다', 가운뎃값([1, null, 3, 'x']) === 2);

  검('국고를 국채로 가른다', 발행주체('국고03500-2906(26-5)') === '국채');
  검('물가연동도 국채다', 발행주체('물가01125-3606(26-4)') === '국채');
  검('국민주택채를 가른다', 발행주체('국민주택1종21-08') === '국민주택채');
  검('공공기관을 가른다', 발행주체('한국전력1061') === '공공기관');
  검('수출입을 공공기관으로 가른다', 발행주체('한국수출입금융2408자-이표-2') === '공공기관');
  검('캐피탈을 금융으로 가른다', 발행주체('한국투자캐피탈119-3') === '금융');
  검('🔴 못 가른 것을 «회사»로 몰지 않는다 — 그밖으로 둔다',
    발행주체('한화오션11-2') === '그밖');
  검('⛔ 이름이 없으면 null', 발행주체('') === null && 발행주체(null) === null);

  const 견본 = [
    { 이름: '국고03500-2906(26-5)', 시장: 'KTS', 수익률: 3.9, 거래대금: 100 },
    { 이름: '국고04250-3606(26-6)', 시장: 'KTS', 수익률: 4.3, 거래대금: 90 },
    { 이름: '국고03000-2803(26-1)', 시장: 'KTS', 수익률: 3.7, 거래대금: 80 },
    { 이름: '국민주택1종21-08', 시장: '소액채권', 수익률: 4.4, 거래대금: 50 },
    { 이름: '국민주택1종22-01', 시장: '소액채권', 수익률: 4.5, 거래대금: 40 },
    { 이름: '국민주택1종22-05', 시장: '소액채권', 수익률: 4.6, 거래대금: 30 },
    { 이름: '한국투자캐피탈119-3', 시장: '일반채권', 수익률: 5.0, 거래대금: 20 },
    { 이름: '한국전력1061', 시장: '일반채권', 수익률: 4.5, 거래대금: 10 },
    { 이름: '한화오션11-2', 시장: '일반채권', 수익률: 117.082, 거래대금: 5 },
  ];
  const 잰것 = 하루재기(견본);
  검('한 날을 잰다', 잰것 && 잰것.종목수 === 9);
  검('시장 갈래를 셋 낸다', Object.keys(잰것.시장).length === 3);
  검('KTS 중앙값을 낸다', 잰것.시장.KTS.중앙값 === 3.9);
  검('🔴 이상 범위 행을 «세어» 낸다 — 지우지 않는다', 잰것.이상범위행 === 1);
  검('🔴 이상치가 있어도 중앙값은 멀쩡하다', 잰것.시장['일반채권'].중앙값 === 5);
  검('⛔ 종목이 셋 미만인 갈래는 중앙값을 null 로 둔다',
    잰것.주체['그밖'].종목수 === 1 && 잰것.주체['그밖'].중앙값 === null);
  검('⛔ 자료가 없으면 null', 하루재기([]) === null && 하루재기(null) === null);
  검('⛔ 수익률이 다 없으면 null', 하루재기([{ 이름: 'x', 시장: 'y', 수익률: null }]) === null);

  const sp = 스프레드(잰것);
  검('국채를 기준으로 스프레드를 낸다', sp.기준중앙값 === 3.9);
  검('소액채권 스프레드', sp.차['소액채권'] === 0.6);
  검('일반채권 스프레드', sp.차['일반채권'] === 1.1);
  검('⛔ 기준에 자기 자신을 넣지 않는다', sp.차.KTS === undefined);
  검('⛔ 기준이 없으면 null', 스프레드(잰것, { 기준: '없는시장' }) === null);
  검('⛔ 잰 것이 없으면 null', 스프레드(null) === null);

  검('⛔ 못 읽으면 null — 「없다」로 만들지 않는다',
    하루읽기('x', { 읽기: () => { throw new Error('없다'); } }) === null);
  검('깨진 줄은 세지 않는다',
    하루읽기('x', { 읽기: () => '{"수익률":1}\n깨진줄\n{"수익률":2}\n' }).length === 2);
  검('⛔ 빈 파일이면 null', 하루읽기('x', { 읽기: () => '\n\n' }) === null);

  console.log('자가시험 — build-bond-segment-spread.mjs\n');
  막.forEach((m) => console.log('  MAK ' + m));
  console.log(`\n통과 ${통} · 막힘 ${막.length}`);
  return 막.length === 0;
}

const 나 = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(나)) {
  if (process.argv.includes('--자가시험')) process.exit(자가시험() ? 0 : 1);
  if (!자가시험()) { console.error('🔴 자가시험이 막혔다 — 값을 내지 않는다'); process.exit(1); }
  console.log('');

  let 파일들 = [];
  try { 파일들 = fs.readdirSync(밑감방).filter((f) => /^\d{8}\.ndjson$/.test(f)).sort(); }
  catch (e) { console.error('🔴 밑감방을 못 읽었다 — ' + 밑감방); process.exit(1); }
  if (!파일들.length) { console.error('🔴 채권 자료가 없다. node scripts/collect-bonds.mjs 를 먼저 돌린다'); process.exit(1); }

  const 날들 = [];
  for (const f of 파일들) {
    const 것들 = 하루읽기(path.join(밑감방, f));
    const 잰것 = 하루재기(것들);
    if (!잰것) continue;
    const 날 = f.slice(0, 4) + '-' + f.slice(4, 6) + '-' + f.slice(6, 8);
    날들.push({ 날, ...잰것, 스프레드: 스프레드(잰것) });
  }
  if (!날들.length) { console.error('🔴 잴 수 있는 날이 없다'); process.exit(1); }

  console.log('■ 시장 갈래별 금리 중앙값과 국채 대비 스프레드 (최근 여덟 날)');
  console.log('  날짜         국채(KTS)  일반채권   소액채권   일반−국채  소액−국채  이상범위행');
  for (const d of 날들.slice(-8)) {
    const v = (k) => (d.시장[k] && d.시장[k].중앙값 != null ? d.시장[k].중앙값.toFixed(3) + '%' : '   ⬜  ');
    const s = (k) => (d.스프레드 && d.스프레드.차[k] != null ? (d.스프레드.차[k] >= 0 ? '+' : '') + d.스프레드.차[k].toFixed(3) + '%p' : '  ⬜  ');
    console.log(`  ${d.날}   ${v('KTS')}  ${v('일반채권')}  ${v('소액채권')}   ${s('일반채권')}  ${s('소액채권')}     ${d.이상범위행}`);
  }

  const 끝 = 날들[날들.length - 1];
  console.log('\n■ 발행 주체별 금리 분포 — ' + 끝.날);
  console.log('  갈래           종목수   중앙값');
  Object.entries(끝.주체).sort((a, b) => b[1].종목수 - a[1].종목수).forEach(([k, v]) => {
    console.log('  ' + k.padEnd(12) + String(v.종목수).padStart(5) + '   '
      + (v.중앙값 == null ? '⬜ 종목이 세 개 미만이라 안 낸다' : v.중앙값.toFixed(3) + '%'));
  });

  if (끝.이상범위행) {
    console.log(`\n⚠ ${끝.날} 에 정상 범위(${정상범위.아래}~${정상범위.위}%) 밖 수익률이 ${끝.이상범위행}행 있다.`);
    console.log('  ⛔ 지우지 않았다 — 원자료가 그렇게 왔다는 기록이다. 중앙값은 이것에 흔들리지 않는다.');
    console.log('  ⚠ 「가장 높음/낮음」을 지면에 낼 때는 그 종목을 열어 확인한 뒤에 낸다.');
  }

  fs.mkdirSync(path.dirname(낼곳), { recursive: true });
  fs.writeFileSync(낼곳, JSON.stringify({
    잰때: new Date().toISOString(),
    쓴칸: ['수익률(종가)', '시장', '이름'],
    안쓴칸: ['시가/고가/저가 수익률(오류 섞임 — 음수 22행·변동폭 1위 23,602%p)', '잔존연수·분류(2.8%만 찼다)'],
    잰법: '갈래마다 종가 수익률의 «중앙값». 평균을 쓰지 않는다 — 회사채에 117%대 값이 실제로 온다',
    날수: 날들.length, 날들,
  }, null, 2), 'utf8');
  console.log('\n  → ' + 낼곳 + '  (' + 날들.length + '일)');
  process.exit(0);
}
