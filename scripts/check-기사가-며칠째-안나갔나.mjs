#!/usr/bin/env node
/**
 * check-기사가-며칠째-안나갔나.mjs — **마지막으로 «손님에게 나간» 기사가 언제인가.**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔴🔴 [2026-11-12 · 5번] **닷새 동안 기사가 한 편도 안 나갔는데 모든 자가 초록이었다.**
 * ───────────────────────────────────────────────────────────────────────────
 * [무슨 일이] 마지막으로 나간 중부매일 스포츠 기사는 **2026-11-06 15시**였다.
 *   그 뒤로 11-07 한 건을 빼면 한 편도 안 나갔다. 오늘은 11-12 다.
 * [왜 아무도 안 울었나] 자마다 저마다 «다른 것»을 재고 있었다 —
 *   · ⑬ 거두기      「거두는 자가 밀렸나」  → 안 밀렸다. 날마다 돌았다. ✅
 *   · ⑬-2 막힌 기사  「막힌 채 버려졌나」   → 그날 것만 본다(사흘). ✅ 인 날이 많다
 *   · 예약 작업      「돌았나」            → 돌았다. 돌면서 아무것도 못 보냈다. ✅
 *   **셋 다 맞는 말을 했고, 그 사이에 닷새가 지났다.**
 * ⭐ 아무도 **「그래서 기사가 나갔나」**를 묻지 않았다. 그것이 유일하게 밖에서 난 결과다.
 * ⛔ 「돌았다」·「안 밀렸다」·「막힌 것이 없다」를 **「나갔다」로 읽지 않는다.**
 *
 * 재는 자리 — 보낸메일 대장(docs/보낸메일.tsv). 메일이 실제로 나갈 때만 한 줄이 는다.
 *   ⛔ 거둠 로그로 재지 않는다. 거둠 로그는 «우리가 한 말»이고 대장은 «밖에서 난 일»이다.
 *
 * 쓰는 법
 *   node scripts/check-기사가-며칠째-안나갔나.mjs
 *   node scripts/check-기사가-며칠째-안나갔나.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const 대장길 = path.join(뿌리, 'docs', '보낸메일.tsv');

/** 기사 메일인가 — 제목 머리에 갈래가 붙는다. ⛔ 보고·정정은 기사가 아니다 */
export const 기사머리 = ['[스포츠]', '[날씨]', '[로또]'];
export function 기사인가(제목) {
  const s = String(제목 ?? '').trim();
  return 기사머리.some((h) => s.startsWith(h));
}

/** 평일인가 — 회차는 평일에만 돈다. 주말에 안 나간 것은 흠이 아니다 */
export function 평일인가(날글) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(날글 ?? ''));
  if (!m) return false;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getDay();
  return d >= 1 && d <= 5;
}

/** 두 날 사이의 «평일» 수 — 뒤는 세고 앞은 안 센다 */
export function 사이평일수(앞글, 뒤글) {
  const 집 = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s ?? '')); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
  const a = 집(앞글); const b = 집(뒤글);
  if (!a || !b) return null;
  let n = 0;
  for (const d = new Date(a); d < b;) {
    d.setDate(d.getDate() + 1);
    const w = d.getDay();
    if (w >= 1 && w <= 5) n += 1;
  }
  return n;
}

/** 대장에서 마지막으로 나간 기사를 찾는다. ⛔ 못 읽으면 null — 0 이 아니다 */
export function 마지막기사(글) {
  if (글 === null || 글 === undefined) return null;
  let 찾은것 = null;
  for (const 줄 of String(글).split(/\r?\n/)) {
    if (!줄.trim() || 줄.startsWith('#')) continue;
    const 칸 = 줄.split('\t');
    const 때 = 칸[0]; const 제목 = 칸[3] ?? '';
    if (!/^\d{4}-\d{2}-\d{2}/.test(때)) continue;
    if (!기사인가(제목)) continue;
    if (!찾은것 || 때 > 찾은것.때) 찾은것 = { 때, 제목: 제목.trim() };
  }
  return 찾은것;
}

/** 며칠(평일)이면 빨강인가 — 하루는 그럴 수 있다. 이틀부터는 사고다 */
export const 빨강바닥 = 2;

function 주다() {
  if (process.argv.includes('--자가시험')) return 자가시험();
  let 글 = null;
  try { 글 = fs.readFileSync(대장길, 'utf8'); } catch { 글 = null; }
  if (글 === null) {
    console.log('⬜ 보낸메일 대장을 못 읽었다 — 「안 나갔다」가 아니라 «못 쟀다»다');
    process.exit(2);
  }
  const 끝 = 마지막기사(글);
  if (!끝) {
    console.log('🔴 대장에 기사 메일이 한 줄도 없다 — 한 편도 안 나간 것이다');
    process.exit(1);
  }
  const 오늘 = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
  const 빈평일 = 사이평일수(끝.때.slice(0, 10), 오늘);
  console.log(`■ 마지막으로 «나간» 기사  ${끝.때}  ${끝.제목.slice(0, 60)}`);
  console.log(`   그 뒤로 지난 평일 ${빈평일}일 (오늘 ${오늘}${평일인가(오늘) ? '' : ' · 주말이라 안 센다'})`);
  if (빈평일 >= 빨강바닥) {
    console.log(`🔴 평일 ${빈평일}일째 기사가 한 편도 안 나갔다`);
    console.log('   ⛔ 「거두기가 안 밀렸다」·「예약이 돌았다」를 «나갔다»로 읽지 않는다.');
    console.log('   ✅ 볼 곳 — docs/고정업무-마커/중부매일-스포츠-거둠.log 의 「되돌리지 못했다」 아랫줄');
    process.exit(1);
  }
  console.log('✅ 기사가 돌고 있다');
  process.exit(0);
}

function 자가시험() {
  let 통 = 0; const 진 = [];
  const 본다 = (이름, 참) => { if (참) 통 += 1; else 진.push(이름); };

  본다('🔴 기사 머리를 가린다', 기사인가('[스포츠] 2026-11-06 15시 — 제목') === true);
  본다('⛔ 보고는 기사가 아니다', 기사인가('[업무보고] 11월 6일') === false);
  본다('⛔ 정정은 기사가 아니다', 기사인가('[정정] 11월 6일 중부매일 스포츠 기사') === false);
  본다('⛔ 빈 것에 안 터진다', 기사인가(null) === false);

  본다('🔴 평일을 가린다', 평일인가('2026-11-12') === true);
  본다('⛔ 토요일은 평일이 아니다', 평일인가('2026-11-07') === false);
  본다('⛔ 일요일도 아니다', 평일인가('2026-11-08') === false);

  /* 11-06(금) → 11-12(목) 사이 평일: 09·10·11·12 네 날 */
  본다('🔴 사이 평일을 센다 — 주말은 빼고', 사이평일수('2026-11-06', '2026-11-12') === 4);
  본다('⛔ 같은 날이면 0', 사이평일수('2026-11-12', '2026-11-12') === 0);
  본다('⛔ 꼴이 틀리면 null — 0 이 아니다', 사이평일수('아무거나', '2026-11-12') === null);

  const 대장 = ['# 머리말',
    ['2026-11-06 15:14', 'id1', 'a@b.c', '[스포츠] 2026-11-06 15시 — 여자배구'].join('\t'),
    ['2026-11-11 10:03', 'id2', 'a@b.c', '[업무보고] 어제치'].join('\t'),
    ['2026-11-04 13:28', 'id3', 'a@b.c', '[스포츠] 2026-11-04 11시 — 농구'].join('\t'),
  ].join('\n');
  const 끝 = 마지막기사(대장);
  본다('🔴 마지막 «기사»를 집는다 — 보고를 집지 않는다', 끝 && 끝.때 === '2026-11-06 15:14');
  본다('🔴 제목을 그대로 들고 온다', 끝 && 끝.제목.includes('여자배구'));
  본다('⛔ 못 읽으면 null — 「없다」가 아니다', 마지막기사(null) === null);
  본다('⬜ 기사가 한 줄도 없으면 null', 마지막기사('# 머리말\n2026-11-11 10:03\tid\ta@b.c\t[업무보고] x') === null);

  const 나 = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8');
  본다('⛔ 거둠 로그로 재지 않는다고 적었다', 나.includes('거둠 로그로 재지 않는다'));
  본다('⛔ 돌았다를 나갔다로 읽지 않는다고 적었다', 나.includes('「나갔다」로 읽지 않는다'));
  본다('⛔ 못 쟀다와 안 나갔다를 가른다', 나.includes('「안 나갔다」가 아니라 «못 쟀다»다'));
  본다('🔴 이틀부터 빨강이다', 빨강바닥 === 2);

  console.log(진.length ? `🔴 ${진.length} 떨어졌다 —\n  ${진.join('\n  ')}` : `✅ 자가시험 ${통} 통과`);
  process.exit(진.length ? 1 : 0);
}

if (String(process.argv[1] ?? '').endsWith('check-기사가-며칠째-안나갔나.mjs')) 주다();
