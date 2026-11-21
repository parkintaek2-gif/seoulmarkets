#!/usr/bin/env node
/**
 * check-period-labels.mjs — **지면이 「이 수가 덮는 기간」을 틀리게 말하고 있나.**
 * (5번, 2026-09-23)
 *
 * ── 🔴 왜 ────────────────────────────────────────────────────────────
 * 대만 지면 1,057장을 내고 라이브를 눈으로 보다가 잡았다. 지면이 이렇게 적고 있었다 —
 * **「These are quarterly figures.」** 틀린 말이었다.
 *
 * TWSE 손익표의 `季別=2` 는 「2분기 석 달」이 아니라 **1~2분기 누계(반년)**다.
 * 어떻게 알았나 — **안 자랄 수 없는 회사**로 검산했다.
 * ```
 * 2412 中華電信  우리 수 121.4bn   연 매출 ≈ 230bn ⇒ 한 분기면 ≈ 58bn
 *                                  ⇒ 통신사가 한 해에 두 배로 크지 않는다. «누계»다
 * 1301 台塑 89.2bn · 2454 聯發科 301.3bn · 2317 鴻海 4,645bn — 전부 반년치와 맞는다
 * ```
 *
 * ⭐ 배운 것은 대만 하나가 아니다. **나라마다 「한 줄이 덮는 기간」이 다르고,
 *   그것을 틀리면 그 지면의 모든 수가 한꺼번에 틀린다.** 단위(천 배)와 똑같은 종류의
 *   함정인데, 단위는 배포 «전»에 잡았고 기간은 배포 «뒤»에 잡았다. 그 차이를 이 자가 메운다.
 *
 * ── ⛔ 이 자가 지키는 것 ──────────────────────────────────────────────
 * ⛔ 누계 자료를 「quarterly」·「three months」라고 부르지 않는다.
 * ⛔ 누계 분자로 낸 ROE 를 「this quarter」라고 적지 않는다.
 * ⛔ 못 읽은 파일을 「통과」로 세지 않는다 — 못 읽었으면 그렇게 적는다.
 * ⚠ 나라를 하나 열면 아래 «기간표»에 한 줄을 더한다. 안 더하면 이 자는 그 나라를 «안 본다».
 * ⚠ 이 자는 «말»만 본다. 수가 실제로 누계인지는 사람이 위 검산처럼 재서 정한다 —
 *   재고 나서 기간표에 적으면, 그 뒤로는 이 자가 말이 어긋나는 것을 잡는다.
 *
 * 쓰는 법
 *   node scripts/check-period-labels.mjs --자가시험
 *   node scripts/check-period-labels.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(fileURLToPath(import.meta.url), '..', '..');

/**
 * 기간표 — 「이 폴더의 지면이 내는 손익 수는 이런 기간을 덮는다」.
 *   덮는기간 'ytd'  연초부터 누계 (대만 TWSE)
 *   덮는기간 'year' 한 해 (한국 DART · 일본 EDINET)
 * `쓰면안되는말` 은 그 기간에 대해 «거짓»이 되는 말이다.
 */
export const 기간표 = [
  {
    나라: 'Taiwan',
    지면폴더: 'src/pages/taiwan',
    덮는기간: 'ytd',
    쓰면안되는말: [
      'quarterly figures',
      'quarterly accounts',
      'quarterly income statement',
      'this quarter, not annualised',
    ],
  },
  {
    나라: 'Japan',
    지면폴더: 'src/pages/japan',
    덮는기간: 'year',
    쓰면안되는말: ['quarterly figures', 'quarterly accounts'],
  },
];

/** 그 밖에 나라를 가리지 않고 어디서도 쓰면 안 되는 말 */
export const 어디서도안되는말 = [];

/** 한 글에서 걸리는 말을 집는다. 대소문자를 가리지 않는다. */
export function 걸린말(글, 말들) {
  if (typeof 글 !== 'string' || !Array.isArray(말들)) return [];
  const 밑 = 글.toLowerCase();
  return 말들.filter((w) => 밑.includes(String(w).toLowerCase()));
}

/** 폴더 아래 지면 파일을 모은다. 없으면 «없다»를 그대로 돌려준다 () */
export function 지면들(밑, 있나 = fs.existsSync, 읽기 = fs.readdirSync) {
  if (!있나(밑)) return null;
  const 벌 = [];
  const 훑 = (d) => {
    for (const e of 읽기(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) 훑(p);
      else if (/\.(astro|ts|tsx|mjs|js)$/.test(e.name)) 벌.push(p);
    }
  };
  훑(밑);
  return 벌;
}

/** 한 나라를 잰다 → { 나라, 폴더있나, 본장수, 걸린것: [{파일, 말들}] } */
export function 나라를잰다(줄, 읽는다) {
  const 밑 = path.join(뿌리, 줄.지면폴더);
  const 파일들 = 지면들(밑);
  if (파일들 === null) return { 나라: 줄.나라, 폴더있나: false, 본장수: 0, 걸린것: [] };
  const 걸린것 = [];
  let 본장수 = 0;
  for (const f of 파일들) {
    let 글 = null;
    try { 글 = 읽는다 ? 읽는다(f) : fs.readFileSync(f, 'utf8'); } catch { 글 = null; }
    if (글 === null) { 걸린것.push({ 파일: f, 말들: ['⚠ 못 읽었다'] }); continue; }
    본장수 += 1;
    const 말들 = 걸린말(글, [...줄.쓰면안되는말, ...어디서도안되는말]);
    if (말들.length) 걸린것.push({ 파일: f, 말들 });
  }
  return { 나라: 줄.나라, 폴더있나: true, 본장수, 걸린것 };
}

/* ── 자가시험 ─────────────────────────────────────────────── */
if (process.argv.includes('--자가시험')) {
  const 잰다 = [];
  const 본다 = (이름, v) => 잰다.push([이름, !!v]);

  본다('걸리는 말을 집는다', 걸린말('These are quarterly figures.', ['quarterly figures']).length === 1);
  본다('대소문자를 가리지 않는다', 걸린말('QUARTERLY FIGURES', ['quarterly figures']).length === 1);
  본다('⛔ 없으면 빈 벌', 걸린말('year to date, cumulative', ['quarterly figures']).length === 0);
  본다('⛔ 빈 것에 안 터진다', 걸린말(null, ['x']).length === 0 && 걸린말('x', null).length === 0);

  본다('🔴 폴더가 없으면 «없다»다 — 0장 통과로 세지 않는다', 지면들(path.join(뿌리, '없는폴더')) === null);

  const 가짜 = { 나라: 'T', 지면폴더: 'src/pages/taiwan', 덮는기간: 'ytd', 쓰면안되는말: ['quarterly figures'] };
  const 잰것 = 나라를잰다(가짜, () => 'this page says quarterly figures');
  본다('🔴 걸리는 말이 있으면 잡는다', 잰것.걸린것.length > 0 && 잰것.폴더있나 === true);
  const 맑음 = 나라를잰다(가짜, () => 'year to date (cumulative, Q1–Q2)');
  본다('맑으면 안 잡는다', 맑음.걸린것.length === 0 && 맑음.본장수 > 0);
  const 못읽음 = 나라를잰다(가짜, () => { throw new Error('못 읽는다'); });
  본다('🔴 ⛔ 못 읽은 것을 통과로 세지 않는다', 못읽음.걸린것.length > 0 && 못읽음.본장수 === 0);

  본다('기간표에 대만이 있다', 기간표.some((r) => r.나라 === 'Taiwan' && r.덮는기간 === 'ytd'));

  const 진 = 잰다.filter(([, v]) => !v);
  for (const [이름, v] of 잰다) console.log(`${v ? '✅' : '🔴'} ${이름}`);
  console.log(진.length ? `\n🔴 ${진.length}/${잰다.length} 떨어졌다` : `\n✅ 자가시험 ${잰다.length} 통과`);
  process.exit(진.length ? 1 : 0);
}

/* ── 본 검사 ──────────────────────────────────────────────── */
if (!process.argv.includes('--자가시험')) {
  let 빨강 = 0;
  for (const 줄 of 기간표) {
    const r = 나라를잰다(줄);
    if (!r.폴더있나) { console.log(`⬜ ${r.나라} — 지면 폴더가 아직 없다`); continue; }
    if (!r.걸린것.length) { console.log(`✅ ${r.나라} — ${r.본장수}장, 기간을 틀리게 말한 곳 0`); continue; }
    빨강 += r.걸린것.length;
    console.log(`🔴 ${r.나라} — ${r.걸린것.length}곳이 기간을 틀리게 말한다 (덮는기간: ${줄.덮는기간})`);
    for (const c of r.걸린것) {
      console.log(`   ${path.relative(뿌리, c.파일)} → ${c.말들.join(' · ')}`);
    }
  }
  if (빨강) {
    console.log('\n⛔ 누계 자료를 「분기」라고 부르면 그 지면의 모든 수가 한꺼번에 틀린다.');
    console.log('   기간표의 덮는기간을 먼저 확인하고, 말을 그 기간에 맞춘다.');
  }
  process.exit(빨강 ? 1 : 0);
}
