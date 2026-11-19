#!/usr/bin/env node
/**
 * 지시가-굳었나-관문.mjs — **적어 놓고 안 따르는 길을 막는다.**
 *
 * ── 🔴🔴 왜 만드나 (2026-11-19 22:55 · 5번) ─────────────────────────
 * 사장님 — 「**지시 대장에 맨날 넣고 안따르잖아. 그걸 무조건 따르게끔 조치하라고.
 *            그게 그리 어렵나**」
 *
 * 재 보니 「적어 놓고 안 따른」 것이 아니었다. **적은 자리가 달랐다.**
 *
 *   docs/사장님-지시-대장.md          내가 적는 자리 (마크다운)
 *   docs/5번-사장님-지시-이력.tsv      ⭐ 새 창이 읽는 자리 (정본)
 *
 *   정본의 마지막 줄이 2026-11-11 이었다. 11-12 부터 11-19 까지 여드레 동안
 *   사장님 말씀을 마크다운에만 적고 **정본에는 한 줄도 안 넣었다.**
 *   ⇒ 그 여드레치 말씀을 **새 창은 한 번도 본 적이 없다.**
 *
 * ⛔ 「적었다」는 「전해졌다」가 아니다. 적는 자리가 둘이면 반드시 갈라진다.
 *
 * ── 이 자가 막는 것 ──────────────────────────────────────────────
 *   ① 마크다운에는 있는데 정본에 없는 날 — **커밋을 막는다**
 *   ② 정본에 있으나 「굳힘」 칸이 빈 지시 — 세어서 눈앞에 띄운다
 *      굳힘 칸은 여섯째 칸이다. 그 지시를 강제하는 검사 파일 경로를 적거나,
 *      기계가 잴 수 없는 것이면 `판단` 이라고 적는다. 빈 칸은 「아직 안 굳었다」다
 *
 * ⛔ 굳힘 칸이 가리키는 파일이 «없으면» 굳은 것으로 세지 않는다.
 *   적어 놓은 것과 도는 것은 다르다 — 그 차이가 이 사고의 뿌리였다.
 *
 * 쓰는 법
 *   node scripts/지시가-굳었나-관문.mjs            본다 (끝값 0)
 *   node scripts/지시가-굳었나-관문.mjs --막는다    안 옮긴 날이 있으면 끝값 1
 *   node scripts/지시가-굳었나-관문.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const 여기 = path.dirname(url.fileURLToPath(import.meta.url));
export const 뿌리 = path.resolve(여기, '..');
export const 정본길 = path.join(뿌리, 'docs', '5번-사장님-지시-이력.tsv');
export const 마크다운길 = path.join(뿌리, 'docs', '사장님-지시-대장.md');

/** 정본에 적기 시작한 날 — 그 앞은 꼴이 달라 대조하지 않는다 */
export const 대조시작일 = '2026-10-23';

/** 마크다운 머리글에서 날짜를 뽑는다. `## 2026-11-19 …` 과 `## 11-19` 둘 다 받는다 */
export function 마크다운날짜들(글) {
  const 것 = new Set();
  for (const 줄 of String(글 ?? '').split(/\r?\n/)) {
    const m = /^##+\s+(?:🔴\s*)?(\d{4})-(\d{2})-(\d{2})/.exec(줄);
    if (m) { 것.add(`${m[1]}-${m[2]}-${m[3]}`); continue; }
    const m2 = /^##+\s+(\d{2})-(\d{2})\s*$/.exec(줄.trim());
    if (m2) 것.add(`2026-${m2[1]}-${m2[2]}`);
  }
  return 것;
}

/** 정본 TSV 한 줄 → {날짜, 원문, 굳힘} · 주석·머리줄은 null */
export function 정본줄읽기(줄) {
  const s = String(줄 ?? '');
  if (!s.trim() || s.startsWith('#')) return null;
  const 칸 = s.split('\t');
  if (칸.length < 4) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(칸[0])) return null;
  return {
    날짜: 칸[0],
    제목: String(칸[2] ?? '').trim(),
    원문: String(칸[3] ?? '').trim(),
    굳힘: String(칸[5] ?? '').trim(),
  };
}

export function 정본읽기(글) {
  return String(글 ?? '').split(/\r?\n/).map(정본줄읽기).filter(Boolean);
}

/** 마크다운에는 있는데 정본에 없는 날 */
export function 안옮긴날들(마크글, 정본글, 시작 = 대조시작일) {
  const 정본날 = new Set(정본읽기(정본글).map((x) => x.날짜));
  const 것 = [];
  for (const d of [...마크다운날짜들(마크글)].sort()) {
    if (d < 시작) continue;
    if (!정본날.has(d)) 것.push(d);
  }
  return 것;
}

/**
 * 굳힘 칸을 센다.
 * @returns {{전체:number, 굳음:number, 판단:number, 빔:number, 거짓:Array}}
 *   거짓 — 굳힘 칸에 파일을 적어 놨는데 그 파일이 실제로 없는 것
 */
export function 굳힘세기(정본글, 있나 = (p) => fs.existsSync(path.join(뿌리, p))) {
  const 줄들 = 정본읽기(정본글);
  let 굳음 = 0; let 판단 = 0; let 빔 = 0; const 거짓 = [];
  for (const x of 줄들) {
    if (!x.굳힘) { 빔 += 1; continue; }
    if (x.굳힘 === '판단') { 판단 += 1; continue; }
    const 길들 = x.굳힘.split(/\s*[·,]\s*/).filter(Boolean);
    const 없는것 = 길들.filter((p) => !있나(p));
    if (없는것.length) { 거짓.push({ 날짜: x.날짜, 제목: x.제목, 없는것 }); 빔 += 1; }
    else 굳음 += 1;
  }
  return { 전체: 줄들.length, 굳음, 판단, 빔, 거짓 };
}

export function 재본다() {
  const 없음 = { 잴수있나: false };
  if (!fs.existsSync(정본길) || !fs.existsSync(마크다운길)) return 없음;
  const 정본글 = fs.readFileSync(정본길, 'utf8');
  const 마크글 = fs.readFileSync(마크다운길, 'utf8');
  return {
    잴수있나: true,
    안옮긴날: 안옮긴날들(마크글, 정본글),
    굳힘: 굳힘세기(정본글),
  };
}

function 알린다(결과) {
  const g = 결과.굳힘;
  console.log('');
  console.log(`■ 사장님 지시가 굳었나 — 정본 ${g.전체}건`);
  console.log(`   검사로 굳은 것 ${g.굳음}건 · 기계가 못 재는 것(판단) ${g.판단}건 · 아직 안 굳은 것 ${g.빔}건`);
  for (const x of g.거짓.slice(0, 5)) {
    console.log(`   🔴 ${x.날짜} ${x.제목} — 굳힘 칸이 가리키는 파일이 없다: ${x.없는것.join(' · ')}`);
  }
  if (결과.안옮긴날.length) {
    console.log('');
    console.log(`🔒 **마크다운에만 적고 정본에 안 넣은 날 ${결과.안옮긴날.length}일**`);
    console.log(`   ${결과.안옮긴날.join(' · ')}`);
    console.log('');
    console.log('   사장님 2026-11-19 — 「지시 대장에 맨날 넣고 안따르잖아. 그걸 무조건 따르게끔 조치하라고」');
    console.log('   ⚠ 새 창이 읽는 것은 정본(docs/5번-사장님-지시-이력.tsv) 쪽이다.');
    console.log('     마크다운에만 적으면 다음 창은 그 말씀을 영영 못 본다.');
    console.log('');
    console.log('   푸는 법 — 그 날 말씀을 정본에 한 줄씩 넣는다. 칸은 여섯이다:');
    console.log('     날짜 ⇥ 시각 ⇥ 제목 ⇥ 「원문 그대로」 ⇥ 무엇이 바뀌나 ⇥ 굳힘');
    console.log('     굳힘 칸에는 그 지시를 강제하는 검사 파일 경로를 적는다.');
    console.log('     기계가 잴 수 없는 것이면 「판단」이라고 적는다. 빈 칸으로 두지 않는다.');
  }
}

// ── 자가시험 ───────────────────────────────────────────────
function 자가시험() {
  let 통과 = 0; let 깨짐 = 0;
  const T = (이름, 참) => { if (참) { 통과 += 1; } else { 깨짐 += 1; console.log('🔴 ' + 이름); } };

  T('마크다운 긴 날짜 머리글을 읽는다',
    마크다운날짜들('## 2026-11-19 22:40 — 선입선출').has('2026-11-19'));
  T('붉은 동그라미가 앞에 붙어도 읽는다',
    마크다운날짜들('## 🔴 2026-11-12 무엇').has('2026-11-12'));
  T('짧은 날짜 머리글도 읽는다', 마크다운날짜들('## 07-29').has('2026-07-29'));
  T('머리글이 아니면 안 읽는다', 마크다운날짜들('2026-11-19 그냥 글').size === 0);

  const 정본 = [
    '# 주석은 건너뛴다',
    '2026-11-11\t21:0x\t제목\t「원문」\t바뀌는것\tscripts/지시가-굳었나-관문.mjs',
    '2026-11-12\t10:00\t제목2\t「원문2」\t바뀌는것2\t판단',
    '2026-11-13\t10:00\t제목3\t「원문3」\t바뀌는것3',
    '2026-11-14\t10:00\t제목4\t「원문4」\t바뀌는것4\tscripts/없는자.mjs',
  ].join('\n');

  T('주석과 머리줄을 세지 않는다', 정본읽기(정본).length === 4);
  const g = 굳힘세기(정본);
  T('검사가 붙은 것을 굳은 것으로 센다', g.굳음 === 1);
  T('판단은 따로 센다', g.판단 === 1);
  T('빈 칸과 거짓을 합쳐 안 굳은 것으로 센다', g.빔 === 2);
  T('굳힘 칸이 가리키는 파일이 없으면 거짓으로 잡는다',
    g.거짓.length === 1 && g.거짓[0].없는것[0] === 'scripts/없는자.mjs');

  const 마크 = '## 2026-11-12 무엇\n## 2026-11-13 무엇\n## 2026-11-20 새 말씀\n';
  const 안옮김 = 안옮긴날들(마크, 정본);
  T('마크다운에만 있는 날을 잡는다', 안옮김.length === 1 && 안옮김[0] === '2026-11-20');
  T('정본에 있는 날은 안 잡는다', !안옮김.includes('2026-11-12'));
  T('대조 시작일 앞은 안 본다', 안옮긴날들('## 2026-09-01 옛 말씀\n', 정본).length === 0);

  console.log(`\n■ 자가시험 ${통과}가지 통과 · ${깨짐}가지 깨짐`);
  return 깨짐 === 0;
}

const 나 = url.fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(나)) {
  const 인자 = process.argv.slice(2);
  if (인자.includes('--자가시험')) { process.exit(자가시험() ? 0 : 1); }
  const 결과 = 재본다();
  if (!결과.잴수있나) {
    console.log('⬜ 지시 대장을 못 읽었다 — 0 으로 치지 않는다');
    process.exit(0);
  }
  알린다(결과);
  if (인자.includes('--막는다') && 결과.안옮긴날.length) process.exit(1);
  process.exit(0);
}
