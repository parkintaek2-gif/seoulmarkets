#!/usr/bin/env node
/**
 * build-segments-data.mjs — 사업부문 원자료를 «지면이 읽을 수 있는 수»로 갠다.
 *
 * ── 🔴 왜 (2026-09-28 · 5번) ─────────────────────────────────────────
 * 회사 강령: **「모은 자료는 반드시 지면이나 콘텐트로 낸다」.**
 * `collect-dart-segments.mjs` 가 731곳을 받았다. 쌓아 두면 없는 것과 같다.
 *
 * ── ⭐ 무엇을 내나 — «남이 안 센 것» ────────────────────────────────
 * 부문 «이름»을 파는 것이 아니다. 이름은 회사마다 제멋대로고 우리말이다.
 * 우리가 내는 것은 **회사가 스스로를 몇 갈래로 쪼개 보고하는가**라는 구조다.
 *
 *   ① 보고부문이 «하나»인 회사가 몇 %인가  — 한국 상장시장의 기본 모습
 *   ② 큰 회사일수록 잘게 쪼개나            — 시가총액 구간별로 가른다
 *   ③ 가장 잘게 쪼개는 회사는 어디인가
 *
 * ⛔ 화면에 한국어를 내지 않는다(사장님 지시). 그래서 «이름»이 아니라 «수»를 낸다.
 *   회사 이름은 DART 가 주는 영문명을 쓰고, 영문명이 없으면 그 회사는 표에서 뺀다.
 * ⛔ 못 뽑은 것을  「못 뽑았다」를 그대로 세어 화면에 적는다.
 *
 * 쓰는 법
 *   node scripts/build-segments-data.mjs            src/data/segments.json 을 쓴다
 *   node scripts/build-segments-data.mjs --자가시험
 */
import { 시가총액표 } from './시가총액읽기.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** 시가총액 구간 — 손님이 읽는 말로 가른다 (조 원이 아니라 미국 달러 감각으로) */
export const 구간들 = [
  { 이름: 'Mega ($10bn+)', 아래: 14e12 },
  { 이름: 'Large ($1–10bn)', 아래: 1.4e12 },
  { 이름: 'Mid ($300m–1bn)', 아래: 4.2e11 },
  { 이름: 'Small (under $300m)', 아래: 0 },
];
export function 구간고르기(시총) {
  if (!Number.isFinite(시총) || 시총 <= 0) return null;   /* ⛔ 못 쟀으면 아무 구간에도 안 넣는다 */
  for (const g of 구간들) if (시총 >= g.아래) return g.이름;
  return null;
}

/** 가운데값. ⛔ 빈 배열에 0 을 돌려주지 않는다 — null 이다(「없다」와 「0이다」는 다르다) */
export function 가운데값(수들) {
  const a = (수들 ?? []).filter((n) => Number.isFinite(n)).sort((x, y) => x - y);
  if (!a.length) return null;
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : Math.round(((a[m - 1] + a[m]) / 2) * 10) / 10;
}

/**
 * 한 줄을 「몇 갈래인가」로 읽는다.
 * ⭐ 셋을 «가른다» — 섞으면 그 수는 거짓이 된다.
 *   하나다   회사가 「보고부문이 하나」라고 스스로 적었다  → 갈래 수 1
 *   여럿이다 부문 이름을 뽑았다                          → 갈래 수 = 뽑힌 개수
 *   못 쟀다  부문이 있다는데 이름을 못 뽑았다             → null. 0 으로 세지 않는다
 */
export function 갈래수(줄) {
  if (!줄 || 줄.받았나 === false) return { 갈래: null, 왜: '원문을 못 받았다' };
  if (!줄.부문있나) return { 갈래: 1, 왜: '부문을 나눠 적지 않는다' };
  if (줄.단일보고부문이라적었나) return { 갈래: 1, 왜: '보고부문이 하나라고 스스로 적었다' };
  const n = (줄.부문들 ?? []).length;
  if (!n) return { 갈래: null, 왜: '부문이 있다는데 이름을 못 뽑았다' };
  return { 갈래: n, 왜: null };
}

/* ── 자가시험 ─────────────────────────────────────────────────────── */
export function 자가시험() {
  const 것 = [];
  const 본다 = (이름, 참, 덧 = '') => 것.push({ 이름, 참: !!참, 덧 });

  본다('가장 큰 구간을 고른다', 구간고르기(2e13) === 'Mega ($10bn+)');
  본다('가장 작은 구간을 고른다', 구간고르기(1e10) === 'Small (under $300m)');
  본다('🔴 시총을 못 쟀으면 어느 구간에도 안 넣는다',
    구간고르기(0) === null && 구간고르기(NaN) === null && 구간고르기(null) === null);

  본다('가운데값 — 홀수', 가운데값([1, 5, 3]) === 3);
  본다('가운데값 — 짝수', 가운데값([2, 4]) === 3);
  본다('🔴 빈 것에 0 을 돌려주지 않는다 — null 이다', 가운데값([]) === null);

  본다('부문을 안 나눈 회사는 한 갈래다',
    갈래수({ 받았나: true, 부문있나: false }).갈래 === 1);
  본다('🔴 「보고부문이 하나」라고 적은 회사도 한 갈래다',
    갈래수({ 받았나: true, 부문있나: true, 단일보고부문이라적었나: true }).갈래 === 1);
  본다('부문 이름이 넷이면 네 갈래다',
    갈래수({ 받았나: true, 부문있나: true, 부문들: [1, 2, 3, 4] }).갈래 === 4);
  본다('🔴 이름을 못 뽑았으면 «못 쟀다»(null)지 0 이 아니다',
    갈래수({ 받았나: true, 부문있나: true, 부문들: [] }).갈래 === null);
  본다('🔴 원문을 못 받은 회사를 «한 갈래»로 세지 않는다',
    갈래수({ 받았나: false }).갈래 === null);
  본다('⛔ 빈 것에 안 터진다', 갈래수(null).갈래 === null);

  /* 🔴 실측으로 터진 자리 — `argv[indexOf(…)+1]` 은 인자가 «없을 때»
     -1+1=0 이라 노드 실행파일 경로를 집는다. 그 길로 파일 이름이 통째로 깨졌다. */
  const 인자값 = (argv, 이름, 기본) => {
    const i = argv.indexOf(이름);
    return (i >= 0 ? argv[i + 1] : null) || 기본;
  };
  본다('🔴 인자가 없으면 argv[0](노드 경로)을 집지 않는다',
    인자값(['C:/node.exe', 'x.mjs'], '--해', '2025') === '2025');
  본다('인자가 있으면 그 값을 쓴다',
    인자값(['C:/node.exe', 'x.mjs', '--해', '2024'], '--해', '2025') === '2024');

  const 빨강 = 것.filter((x) => !x.참);
  console.log(`■ build-segments-data 자가시험 ${것.length - 빨강.length}/${것.length}`);
  for (const x of 것) console.log(`  ${x.참 ? '✅' : '🔴'} ${x.이름}${x.덧 ? `  (${x.덧})` : ''}`);
  return 빨강.length === 0;
}

/* ── 진입점 ───────────────────────────────────────────────────────── */
const 내가진입점 = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (내가진입점) {
  if (process.argv.includes('--자가시험')) process.exit(자가시험() ? 0 : 1);

  /* ⛔ `argv[indexOf(…) + 1]` 을 그냥 쓰면, 인자가 «없을 때» -1+1=0 이라
     * argv[0](노드 실행파일 경로)을 집는다. 실제로 그 길로 한 번 터졌다.
     ⇒ 자리를 먼저 보고, 없으면 기본값으로 간다. */
  const 해자리 = process.argv.indexOf('--해');
  const 해 = (해자리 >= 0 ? process.argv[해자리 + 1] : null) || '2025';
  const 자료길 = path.join(뿌리, 'archive', 'raw', 'dart-segments', `segments-${해}.ndjson`);
  if (!fs.existsSync(자료길)) {
    console.error(`🔴 ${path.relative(뿌리, 자료길)} 가 없다 — collect-dart-segments.mjs --적는다 먼저`);
    process.exit(1);
  }
  const 줄들 = fs.readFileSync(자료길, 'utf8').split('\n').filter(Boolean)
    .map((l) => { try { return JSON.parse(l); } catch (e) { return null; } }).filter(Boolean);

  /* 🔴🔴 [2026-10-06 · 사장님] 「KRX 시세 >>> 다른 데서 우회적으로 받지 않았나?」
     * 여기가 그 자리였다 — archive/raw/krx(직접 수집분)에서 시가총액을 꺼내 쓰고 있었고,
     * 그 결과가 src/data/segments.json 을 거쳐 /data/segment-reporting 과 /trial 로 나갔다.
     * 우리 대장에 내가 적어 둔 금칙 — 「⛔ 팔 파일·광고 지면에 넣지 않는다」 — 을 내가 어겼다.
     * ⇒ 포털 판(archive/raw/stocks)에 시가총액 칸이 «이미» 있다. 굳이 KRX 를 둘 까닭이 없었다.
     * ⚠ 포털 판도 2026-09-07 부터 공공누리 제4유형이다. 그것은 사장님이 정하실 일이고,
       이 고침은 «적어도 우리 규칙은 지키게» 하는 것이다. */
  const { 표: 시총, 날: 시총날, 못읽음: 시총못읽음 } = 시가총액표();
  if (시총못읽음) console.log(`   ⚠ 시가총액을 못 읽었다 — ${시총못읽음}. 구간을 못 가른다`);
  else console.log(`   시가총액 ${시총.size}곳 — 포털 판 ${시총날}`);

  const 통 = new Map(구간들.map((g) => [g.이름, { 이름: g.이름, 회사: 0, 하나: 0, 갈래들: [] }]));
  let 원문못받음 = 0, 이름못뽑음 = 0, 시총못붙음 = 0;
  const 잘게쪼갠곳 = [];

  for (const 줄 of 줄들) {
    const { 갈래 } = 갈래수(줄);
    if (줄.받았나 === false) { 원문못받음 += 1; continue; }
    if (갈래 === null) { 이름못뽑음 += 1; continue; }

    const 구간 = 구간고르기(시총.get(줄.종목));
    if (!구간) { 시총못붙음 += 1; continue; }
    const t = 통.get(구간);
    t.회사 += 1;
    t.갈래들.push(갈래);
    if (갈래 === 1) t.하나 += 1;

    /* ⛔ 영문 이름이 없는 회사는 영문 지면의 표에 올리지 않는다 */
    /* ⛔ 우리 자가 상한에서 잘랐으면 그 수는 «그 회사의 수»가 아니다 —
       지면이 「40+」로 적을 수 있게 그대로 실어 보낸다 */
    if (갈래 >= 6 && 줄.영문) {
      잘게쪼갠곳.push({
        이름: 줄.영문, 종목: 줄.종목, 갈래,
        잘렸나: !!줄.이름잘렸나, 시총: 시총.get(줄.종목) ?? 0,
      });
    }
  }

  const 구간표 = 구간들.map((g) => {
    const t = 통.get(g.이름);
    return {
      이름: g.이름, 회사: t.회사,
      하나비율: t.회사 ? Math.round((t.하나 / t.회사) * 100) : null,   /* ⛔ 0곳이면 null */
      갈래가운데값: 가운데값(t.갈래들),
    };
  }).filter((r) => r.회사 > 0);

  잘게쪼갠곳.sort((a, b) => b.갈래 - a.갈래 || b.시총 - a.시총);

  const 센회사 = 구간표.reduce((s, r) => s + r.회사, 0);
  const 하나총 = [...통.values()].reduce((s, t) => s + t.하나, 0);

  const 결과 = {
    해,
    만든때: new Date().toLocaleString('ko-KR'),
    받은줄: 줄들.length,
    센회사,
    하나인회사: 하나총,
    하나비율: 센회사 ? Math.round((하나총 / 센회사) * 100) : null,
    /* ⭐ 못 잰 것을 «지면에 적을 수 있게» 함께 낸다 — 숨기지 않는다 */
    못잰것: { 원문못받음, 이름못뽑음, 시총못붙음 },
    구간: 구간표,
    잘게쪼갠곳: 잘게쪼갠곳.slice(0, 12),
    /* 🔴 [2026-09-28] 여기를 우리말로 적었더니 **영문 지면에 그대로 나갔다.**
       * 사장님 지시: 화면에 한국어를 내지 않는다. 손님은 영어권이다.
       ⛔ 지면이 그대로 찍는 칸에 우리말을 넣지 않는다 — 코드 주석은 우리말이어도 된다. */
    출처: 'DART annual reports (Financial Supervisory Service electronic disclosure system); '
      + 'market capitalisation from KRX daily quotations',
  };

  const 낼길 = path.join(뿌리, 'src', 'data', 'segments.json');
  fs.mkdirSync(path.dirname(낼길), { recursive: true });
  fs.writeFileSync(낼길, JSON.stringify(결과, null, 2));
  console.log(`■ 사업부문 통계 — 받은 줄 ${줄들.length} · 센 회사 ${센회사}곳`);
  console.log(`   보고부문이 하나인 회사 ${하나총}곳 (${결과.하나비율}%)`);
  for (const r of 구간표) console.log(`   ${r.이름.padEnd(22)} ${String(r.회사).padStart(4)}곳 · 하나 ${r.하나비율}% · 갈래 가운데값 ${r.갈래가운데값}`);
  console.log(`   ⚠ 못 잰 것 — 원문 ${원문못받음} · 이름 ${이름못뽑음} · 시총 ${시총못붙음}`);
  console.log(`   ${path.relative(뿌리, 낼길)}`);
}
