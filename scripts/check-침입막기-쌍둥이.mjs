#!/usr/bin/env node
/**
 * check-침입막기-쌍둥이.mjs — **두 저장소의 막는 규칙이 같은가.**
 *
 * ── 🔴 왜 (2026-11-05) ────────────────────────────────────────────────
 * 막는 자가 두 벌이다 — 케이라이프맵(`server/침입막기.js`)과
 * 세 사이트(`src/lib/침입막기.mjs`). 서버가 다르니 어쩔 수 없다.
 *
 * ⛔ 그런데 **한쪽만 고치면 네 사이트가 서로 다른 것을 막게 된다.**
 *   새 공격 수법을 한쪽에만 넣어 두면, 나머지 쪽은 그 수법에 그대로 열려 있다.
 *   그리고 아무도 모른다 — 두 벌 다 자가시험은 초록이기 때문이다.
 *
 * ⭐ 우리 강령 — 「하나를 고치면 인용한 곳까지 따라간다」.
 *   그것을 사람의 기억이 아니라 **이 검사**가 하게 한다.
 *
 * 무엇을 보나 — 두 파일의 「규칙 시작」~「규칙 끝」 토막을 글자까지 맞춰 본다.
 *   (케이라이프맵 쪽은 주석이 더 많으므로 규칙 줄만 뽑아서 견준다)
 *
 * 쓰는 법   node scripts/check-침입막기-쌍둥이.mjs [--자가시험]
 */
import fs from 'node:fs';
import path from 'node:path';

const 여기 = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const 뿌리 = path.join(여기, '..');
const 형제 = path.join(뿌리, '..', 'klifemap');

export const 둘 = [
  { 이름: '세 사이트', 길: path.join(뿌리, 'src', 'lib', '침입막기.mjs') },
  { 이름: '케이라이프맵', 길: path.join(형제, 'server', '침입막기.js') },
];

/**
 * 규칙 줄만 뽑는다 — 빈 줄·주석·export 는 떼고, 글자만 남긴다.
 *
 * ⚠ **`AI겨냥` 토막은 일부러 견주지 않는다.** AI 창구는 케이라이프맵에만 있다.
 *   세 사이트에 그 규칙을 넣으면 **후기·댓글에 그 말을 쓴 손님이 끊긴다** —
 *   「ignore previous instructions」는 AI 이야기를 하는 사람이면 쓸 수 있는 말이다.
 *   ⇒ 창구가 없는 곳에 막이만 넣으면 지키는 것은 없고 손님만 잃는다.
 */
export function 규칙뽑기(글) {
  const 줄들 = String(글 || '').split('\n');
  const 것 = [];
  let 안쪽 = false;
  let AI토막 = false;
  for (const 줄 of 줄들) {
    const t = 줄.trim();
    /* 케이라이프맵 쪽에는 「규칙 시작/끝」 표가 없다 — 규칙 줄을 이름으로 찾는다 */
    if (/^\/\* 규칙 시작/.test(t)) { 안쪽 = true; continue; }
    if (/^\/\* 규칙 끝/.test(t)) { 안쪽 = false; continue; }
    if (/^(export\s+)?const\s+AI겨냥\s*=/.test(t)) { AI토막 = true; continue; }
    if (AI토막) { if (/^\];$/.test(t)) AI토막 = false; continue; }
    것.push({ t, 안쪽 });
  }
  /* 두 벌 모두에서 «규칙을 담은 줄»만 고른다 */
  const 담았나 = (t) => /^(export\s+)?const\s+(창분|끊는점수|끊는시간분|탐침|공격글자|세지않는이름)\s*=/.test(t)
    || /^\/[^/*]/.test(t)                        /* 정규식으로 시작하는 줄 */
    || /^\{\s*이름:/.test(t)                     /* 공격글자 한 줄 */
    || /^'[a-z-]+',/.test(t) || /^'[a-z-]+'(,\s*'[a-z-]+',?)*/.test(t)  /* 이름 목록 줄 */
    || /^\];$/.test(t);
  return 것.filter(({ t }) => t && !t.startsWith('*') && !t.startsWith('//') && 담았나(t))
    .map(({ t }) => t.replace(/\s*\/\*.*?\*\/\s*/g, ' ').replace(/\s+/g, ' ').replace(/^export\s+/, '').trim())
    .filter((t) => t);
}

export function 견준다(글A, 글B) {
  const A = 규칙뽑기(글A);
  const B = 규칙뽑기(글B);
  const 모자란것 = A.filter((x) => !B.includes(x));
  const 남는것 = B.filter((x) => !A.includes(x));
  return { 같나: 모자란것.length === 0 && 남는것.length === 0, 모자란것, 남는것, 센것: A.length };
}

/* ── 자가시험 ──────────────────────────────────────────────────────── */
export function 자가시험() {
  const 것 = [];
  const 본다 = (이름, 참) => 것.push({ 이름, 참: !!참 });
  const 바탕 = '/* 규칙 시작 */\nexport const 끊는점수 = 10;\n/\\/\\.env/i,\n/* 규칙 끝 */';
  const 같은것 = 'const 끊는점수 = 10;\n/\\/\\.env/i,';
  본다('같으면 같다고 한다', 견준다(바탕, 같은것).같나);
  본다('🔴 한쪽에만 새 규칙이 들어가면 잡는다',
    !견준다(바탕 + '\n/\\/wp-admin/i,', 같은것).같나);
  본다('🔴 한쪽에서 규칙이 빠져도 잡는다',
    !견준다(바탕, 'const 끊는점수 = 10;').같나);
  본다('🔴 점수를 한쪽만 바꾸면 잡는다',
    !견준다(바탕, 'const 끊는점수 = 5;\n/\\/\\.env/i,').같나);
  본다('⛔ 주석과 빈 줄은 견주지 않는다',
    견준다(바탕, '/* 다른 설명 */\nconst 끊는점수 = 10;\n\n/\\/\\.env/i,').같나);
  본다('⛔ 빈 것에 안 터진다', 규칙뽑기(null).length === 0 && 규칙뽑기().length === 0);
  본다('🔴 AI겨냥 토막은 견주지 않는다 — 창구가 케이라이프맵에만 있다',
    견준다(바탕, 같은것 + "\nconst AI겨냥 = [\n{ 이름: 'x', 자: /y/i, 점: 10 },\n];").같나);
  본다('🔴 그래도 AI 토막 «뒤»의 규칙은 다시 견준다 — 거기서 멈추면 안 된다',
    !견준다(바탕 + '\n/\\/wp-admin/i,',
      같은것 + "\nconst AI겨냥 = [\n{ 이름: 'x', 자: /y/i, 점: 10 },\n];").같나);

  const 빨강 = 것.filter((x) => !x.참);
  console.log(`■ 침입막기 쌍둥이 자가시험 ${것.length - 빨강.length}/${것.length}`);
  for (const x of 것) console.log(`  ${x.참 ? '✅' : '🔴'} ${x.이름}`);
  return 빨강.length === 0;
}

/* ── 진입점 ───────────────────────────────────────────────────────── */
if (process.argv[1] && process.argv[1].endsWith('check-침입막기-쌍둥이.mjs')) {
  if (process.argv.includes('--자가시험')) process.exit(자가시험() ? 0 : 1);

  const 글들 = [];
  for (const x of 둘) {
    if (!fs.existsSync(x.길)) {
      /* ⛔ 못 읽은 것을 「같다」로 적지 않는다 */
      console.log(`⬜ 못 쟀다 — ${x.이름} 쪽 파일이 없다 (${x.길})`);
      process.exit(0);
    }
    글들.push(fs.readFileSync(x.길, 'utf8'));
  }
  const 난것 = 견준다(글들[0], 글들[1]);
  if (난것.같나) {
    console.log(`✅ 침입막기 규칙 ${난것.센것}줄이 두 저장소에서 같다`);
    process.exit(0);
  }
  console.log('🔴 침입막기 규칙이 두 저장소에서 어긋났다 — 한쪽만 고쳤다');
  for (const x of 난것.모자란것) console.log(`   케이라이프맵에 없다 — ${x.slice(0, 90)}`);
  for (const x of 난것.남는것) console.log(`   세 사이트에 없다 — ${x.slice(0, 90)}`);
  console.log('   ✅ 두 파일의 규칙 토막을 같게 맞춘다');
  process.exit(1);
}
