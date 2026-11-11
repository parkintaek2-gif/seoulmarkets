#!/usr/bin/env node
/**
 * 검사한다-내가-쓴-말.mjs — **사장님께 쓴 터미널 글에 금지어가 있나.**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔴🔴🔴 [2026-11-11 · 사장님] 제가 터미널에 쓴 문장을 그대로 되돌려 보내시며 —
 *   「**모든 곳에서 순한글쓰지말라고. 이해못한다고**」
 *
 * [무엇이 비어 있었나]
 *   금지어 검사는 **메일과 문서**에만 걸려 있었다.
 *   `send-mail.mjs` 가 본문과 첨부를 재고, `순한글-금지어.mjs` 가 파일을 잰다.
 *   ⛔ 그런데 **사장님이 가장 많이 읽으시는 것은 터미널 화면**이다.
 *     그 글은 한 번도 검사한 적이 없다. 「모든 곳」에 그 자리가 빠져 있었다.
 *
 * [어떻게 거나]
 *   Claude Code 의 Stop 갈고리에 건다. 제가 말을 마칠 때마다 이 프로그램이
 *   **방금 제가 쓴 글**을 읽어 금지어를 찾고, 있으면 화면에 띄운다.
 *   ⛔ 막지는 못한다 — 이미 쓴 글이다. 그러나 **그 자리에서 보이게** 한다.
 *     보이면 제가 바로 고쳐 말씀드릴 수 있다. 안 보이면 영영 모른다.
 *
 * ⚠ 코드 블록 안은 보지 않는다 — 파일 이름과 명령에는 그 말이 들어갈 수밖에 없다.
 *   (`scripts/보내는자.mjs` 를 쓴다고 금지어를 쓴 것이 아니다)
 *
 * 쓰는 법
 *   echo '{"transcript_path":"..."}' | node scripts/검사한다-내가-쓴-말.mjs
 *   node scripts/검사한다-내가-쓴-말.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';

/**
 * 검사에서 빼는 자리 — 코드 블록·따옴표 안.
 * ⛔ 파일 이름과 명령까지 걸면 날마다 헛울리고, 그러면 내가 이 검사를 끈다.
 * ⚠ 사장님 말씀을 그대로 옮긴 인용도 뺀다 — 사장님 말씀을 내가 고치면 안 된다.
 */
export function 검사할글만(글) {
  let s = String(글 ?? '');
  s = s.replace(/```[\s\S]*?```/g, ' ');        /* 코드 블록 */
  s = s.replace(/`[^`\n]*`/g, ' ');             /* 한 줄 코드 */
  s = s.replace(/「[^」]*」/g, ' ');              /* 사장님 말씀 인용 */
  s = s.replace(/^\s*[>|].*$/gm, ' ');          /* 인용 줄 */
  return s;
}

/** 대화 기록에서 **마지막으로 내가 쓴 글**을 꺼낸다 */
export function 마지막내글(줄들) {
  const 것 = [];
  for (const 줄 of 줄들 ?? []) {
    let j;
    try { j = JSON.parse(줄); } catch { continue; }
    if (!j || j.type !== 'assistant') continue;
    const 내용 = j?.message?.content;
    if (!Array.isArray(내용)) continue;
    const 글 = 내용.filter((c) => c && c.type === 'text').map((c) => c.text).join('\n');
    if (글.trim()) 것.push(글);
  }
  return 것.length ? 것[것.length - 1] : null;
}

async function 주다() {
  if (process.argv.includes('--자가시험')) return 자가시험();

  let 들어온것 = '';
  for await (const 토막 of process.stdin) 들어온것 += 토막;
  let 입력 = {};
  try { 입력 = JSON.parse(들어온것 || '{}'); } catch { 입력 = {}; }

  const 기록길 = 입력.transcript_path;
  if (!기록길 || !fs.existsSync(기록길)) { process.exit(0); }   /* 못 읽으면 조용히 넘어간다 */

  let 줄들;
  try { 줄들 = fs.readFileSync(기록길, 'utf8').split(/\r?\n/).filter(Boolean); }
  catch { process.exit(0); }

  const 글 = 마지막내글(줄들);
  if (!글) process.exit(0);

  let 걸린것 = [];
  try {
    const { 재기 } = await import('./순한글-금지어.mjs');
    걸린것 = 재기(검사할글만(글));
  } catch { process.exit(0); }

  if (!걸린것.length) process.exit(0);

  const 말 = '🔴 방금 사장님께 쓴 글에 금지어가 있습니다 — '
    + 걸린것.map((x) => `「${x.말}」→「${x.대신}」`).join(' · ')
    + ' · 사장님 2026-11-11 「모든 곳에서 순한글쓰지말라고. 이해못한다고」';
  console.log(JSON.stringify({ systemMessage: 말, suppressOutput: true }));
  process.exit(0);
}

function 자가시험() {
  let 통 = 0; let 탈 = 0;
  const 검 = (이름, 참) => { if (참) { 통++; console.log('✅', 이름); } else { 탈++; console.log('🔴', 이름); } };

  검('🔴 코드 블록 안은 안 본다',
    !검사할글만('앞말\n```\n읽는 자\n```\n뒷말').includes('읽는 자'));
  검('🔴 한 줄 코드도 안 본다', !검사할글만('이 `읽는 자` 를 고쳤다').includes('읽는 자'));
  검('🔴 사장님 말씀 인용은 안 본다',
    !검사할글만('사장님 「읽는 자를 고쳐라」').includes('읽는 자'));
  검('⛔ 보통 글은 그대로 남는다', 검사할글만('읽는 자를 고쳤습니다').includes('읽는 자'));
  검('⛔ 빈 것·null 에 안 터진다',
    검사할글만(null) === '' && 검사할글만('') === '');

  const 줄 = (t, 글) => JSON.stringify({ type: t, message: { content: [{ type: 'text', text: 글 }] } });
  검('🔴 마지막으로 내가 쓴 글을 집는다',
    마지막내글([줄('assistant', '첫째'), 줄('user', '사장님 말씀'), 줄('assistant', '둘째')]) === '둘째');
  검('⛔ 사장님 글을 내 글로 집지 않는다',
    마지막내글([줄('user', '사장님 말씀')]) === null);
  검('⛔ 빈 것·망가진 줄에 안 터진다',
    마지막내글(null) === null && 마지막내글(['{망가진', '']) === null);

  console.log(탈 ? `\n🔴 자가시험 ${탈}건 탈` : `\n✅ 자가시험 ${통} 통과`);
  process.exit(탈 ? 1 : 0);
}

const 나를직접돌렸나 = (process.argv[1] || '').replace(/\\/g, '/').endsWith('검사한다-내가-쓴-말.mjs');
if (나를직접돌렸나) await 주다();
