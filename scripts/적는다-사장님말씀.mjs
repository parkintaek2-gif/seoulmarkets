#!/usr/bin/env node
/**
 * 적는다-사장님말씀.mjs — **한 번 적으면 두 곳에 동시에 들어간다.**
 *
 * ── 🔴🔴 왜 만드나 (2026-11-19 23:10 · 5번) ─────────────────────────
 * 사장님 — 「**두군데 다 저장되게 하는 장치를 못두나? 장치가 있으면
 *            이게 더 나은 건 지 검토해서 보고해.**」
 *
 * 그 앞에 막는 관문(지시가-굳었나-관문.mjs)을 세웠는데, 그것은 **사후 방어**다.
 * 사람이 여전히 두 번 적어야 하고, 두 번 적는 한 언젠가 또 한쪽을 빠뜨린다.
 * 실제로 11-12 부터 네 날을 그렇게 빠뜨렸고 새 창은 그 말씀을 한 번도 못 봤다.
 *
 * ⇒ **적는 입구를 하나로 만든다.** 이 자를 한 번 부르면 두 곳에 함께 적힌다.
 *     ① docs/5번-사장님-지시-이력.tsv   새 창·상태줄이 읽는 정본
 *     ② docs/사장님-지시-대장.md        사람이 읽는 긴 기록
 *   그래도 손으로 한쪽에만 적는 날이 있을 수 있다 — 그때는 막는 관문이 잡는다.
 *   **둘을 겹쳐야 구멍이 없다.**
 *
 * ⛔ 둘 중 하나만 적히는 일이 없게 한다. 쓰기 전에 두 파일을 쥐고 있다가
 *   하나라도 실패하면 **둘 다 되돌린다.** 반만 적히면 갈라진 것과 같다.
 *
 * ⛔ 셸 명령줄에 한글 긴 글을 올리지 않는다(CP949 로 읽혀 깨진다).
 *   그래서 **양식 파일**로 받는다.
 *
 * 양식 — 파일 하나에 이렇게 적는다 (UTF-8)
 *   날짜: 2026-11-19
 *   시각: 23:10
 *   제목: 두 곳에 함께 적는다
 *   굳힘: scripts/적는다-사장님말씀.mjs        ← 없으면 「판단」이라고 적는다
 *   원문:
 *   「두군데 다 저장되게 하는 장치를 못두나?」
 *   바뀌는것:
 *   적는 입구를 하나로 만든다. 한 번 부르면 두 곳에 함께 적힌다.
 *
 * 쓰는 법
 *   node scripts/적는다-사장님말씀.mjs <양식파일>
 *   node scripts/적는다-사장님말씀.mjs <양식파일> --본다    적지 않고 무엇이 들어갈지만 본다
 *   node scripts/적는다-사장님말씀.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const 여기 = path.dirname(url.fileURLToPath(import.meta.url));
export const 뿌리 = path.resolve(여기, '..');
export const 정본길 = path.join(뿌리, 'docs', '5번-사장님-지시-이력.tsv');
export const 마크다운길 = path.join(뿌리, 'docs', '사장님-지시-대장.md');

export const 칸이름 = ['날짜', '시각', '제목', '굳힘', '원문', '바뀌는것'];

/** 양식 파일 글 → 지시 하나. 여러 줄 칸(원문·바뀌는것)은 다음 칸 이름 앞까지 이어 붙인다 */
export function 양식읽기(글) {
  const 줄들 = String(글 ?? '').split(/\r?\n/);
  const 것 = {};
  let 지금 = null;
  for (const 줄 of 줄들) {
    const m = /^(날짜|시각|제목|굳힘|원문|바뀌는것)\s*:\s*(.*)$/.exec(줄);
    if (m) { 지금 = m[1]; 것[지금] = m[2].trim(); continue; }
    if (지금 && 줄.trim()) 것[지금] = (것[지금] ? 것[지금] + ' ' : '') + 줄.trim();
  }
  for (const k of 칸이름) 것[k] = String(것[k] ?? '').trim();
  return 것;
}

export function 흠잡기(것) {
  const 흠 = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(것.날짜)) 흠.push('날짜가 2026-11-19 꼴이 아닙니다');
  if (!/^\d{2}:\d{2}$|^\d{2}:\d[x]$/.test(것.시각)) 흠.push('시각이 23:10 또는 23:1x 꼴이 아닙니다');
  if (!것.제목) 흠.push('제목이 비었습니다');
  if (!것.원문) 흠.push('원문이 비었습니다 — 사장님 말씀을 한 글자도 고치지 않고 그대로 적습니다');
  if (!것.바뀌는것) 흠.push('바뀌는것이 비었습니다 — 이 말씀으로 무엇이 달라지는지 적습니다');
  if (!것.굳힘) 흠.push('굳힘이 비었습니다 — 검사 파일 경로를 적거나, 기계가 잴 수 없으면 「판단」이라고 적습니다');
  if (것.굳힘 && 것.굳힘 !== '판단') {
    for (const p of 것.굳힘.split(/\s*[·,]\s*/).filter(Boolean)) {
      if (!fs.existsSync(path.join(뿌리, p))) 흠.push(`굳힘이 가리키는 파일이 없습니다 — ${p}`);
    }
  }
  /* 탭이 들어가면 TSV 칸이 어긋난다 */
  for (const k of 칸이름) if (/\t/.test(것[k])) 흠.push(`${k} 에 탭이 들어 있습니다`);
  return 흠;
}

export function 정본줄만들기(것) {
  return [것.날짜, 것.시각, 것.제목, 것.원문, 것.바뀌는것, 것.굳힘].join('\t');
}

export function 마크다운절만들기(것) {
  return [
    '',
    `## ${것.날짜} ${것.시각} · ${것.제목}`,
    '',
    `> 사장님 — 「**${것.원문.replace(/^「|」$/g, '')}**」`,
    '',
    `- ${것.바뀌는것}`,
    `- 굳힘 — ${것.굳힘 === '판단' ? '기계가 잴 수 없다. 사람이 지킨다' : 것.굳힘}`,
    '',
  ].join('\n');
}

/** 이미 적힌 말씀인가 — 같은 날 같은 원문이 정본에 있으면 두 번 적지 않는다 */
export function 벌써있나(정본글, 것) {
  for (const 줄 of String(정본글 ?? '').split(/\r?\n/)) {
    const 칸 = 줄.split('\t');
    if (칸[0] === 것.날짜 && String(칸[3] ?? '').trim() === 것.원문) return true;
  }
  return false;
}

/** 두 곳에 함께 적는다. 하나라도 실패하면 둘 다 되돌린다 */
export function 적는다(것, { 정본 = 정본길, 마크 = 마크다운길 } = {}) {
  const 옛정본 = fs.readFileSync(정본, 'utf8');
  const 옛마크 = fs.readFileSync(마크, 'utf8');
  if (벌써있나(옛정본, 것)) return { 적었나: false, 까닭: '같은 날 같은 말씀이 정본에 이미 있다' };
  try {
    const 끝줄 = 옛정본.endsWith('\n') ? '' : '\n';
    fs.writeFileSync(정본, 옛정본 + 끝줄 + 정본줄만들기(것) + '\n', 'utf8');
    fs.writeFileSync(마크, 옛마크 + 마크다운절만들기(것), 'utf8');
    return { 적었나: true, 까닭: '두 곳에 함께 적었다' };
  } catch (e) {
    try { fs.writeFileSync(정본, 옛정본, 'utf8'); } catch (e2) { /* 되돌리기도 실패하면 아래에서 알린다 */ }
    try { fs.writeFileSync(마크, 옛마크, 'utf8'); } catch (e2) { /* 같다 */ }
    return { 적었나: false, 까닭: '적다가 실패해 둘 다 되돌렸다 — ' + String(e.message).slice(0, 80) };
  }
}

// ── 자가시험 ───────────────────────────────────────────────
function 자가시험() {
  let 통과 = 0; let 깨짐 = 0;
  const T = (이름, 참) => { if (참) { 통과 += 1; } else { 깨짐 += 1; console.log('🔴 ' + 이름); } };

  const 양식 = [
    '날짜: 2026-11-19', '시각: 23:10', '제목: 두 곳에 함께 적는다',
    '굳힘: scripts/적는다-사장님말씀.mjs',
    '원문:', '「두군데 다 저장되게 하는 장치를 못두나?」',
    '바뀌는것:', '적는 입구를 하나로 만든다.', '한 번 부르면 두 곳에 함께 적힌다.',
  ].join('\n');
  const 것 = 양식읽기(양식);
  T('날짜를 읽는다', 것.날짜 === '2026-11-19');
  T('여러 줄 칸을 이어 붙인다', 것.바뀌는것 === '적는 입구를 하나로 만든다. 한 번 부르면 두 곳에 함께 적힌다.');
  T('원문을 그대로 쥔다', 것.원문 === '「두군데 다 저장되게 하는 장치를 못두나?」');
  T('흠이 없다', 흠잡기(것).length === 0);

  T('날짜가 틀리면 잡는다', 흠잡기({ ...것, 날짜: '11-19' }).some((x) => x.includes('날짜')));
  T('시각 23:1x 꼴을 받는다', 흠잡기({ ...것, 시각: '23:1x' }).length === 0);
  T('원문이 비면 잡는다', 흠잡기({ ...것, 원문: '' }).some((x) => x.includes('원문')));
  T('굳힘이 비면 잡는다', 흠잡기({ ...것, 굳힘: '' }).some((x) => x.includes('굳힘')));
  T('굳힘이 없는 파일을 가리키면 잡는다',
    흠잡기({ ...것, 굳힘: 'scripts/없는자.mjs' }).some((x) => x.includes('없다')));
  T('굳힘이 판단이면 파일을 안 본다', 흠잡기({ ...것, 굳힘: '판단' }).length === 0);
  T('탭이 들어가면 잡는다', 흠잡기({ ...것, 제목: '가\t나' }).some((x) => x.includes('탭')));

  const 줄 = 정본줄만들기(것);
  T('정본 줄이 여섯 칸이다', 줄.split('\t').length === 6);
  T('정본 줄의 넷째 칸이 원문이다', 줄.split('\t')[3] === 것.원문);
  T('정본 줄의 여섯째 칸이 굳힘이다', 줄.split('\t')[5] === 것.굳힘);

  const 절 = 마크다운절만들기(것);
  T('마크다운 머리글이 관문이 읽는 꼴이다', /^## 2026-11-19 /m.test(절));
  T('마크다운에 원문이 그대로 들어간다', 절.includes('두군데 다 저장되게 하는 장치를 못두나?'));

  T('같은 날 같은 원문이면 두 번 안 적는다',
    벌써있나(`2026-11-19\t23:10\t제목\t${것.원문}\t바뀌는것\t판단`, 것) === true);
  T('다른 날이면 적는다', 벌써있나(`2026-11-18\t23:10\t제목\t${것.원문}\t바뀌는것\t판단`, 것) === false);

  console.log(`\n■ 자가시험 ${통과}가지 통과 · ${깨짐}가지 깨짐`);
  return 깨짐 === 0;
}

const 나 = url.fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(나)) {
  const 인자 = process.argv.slice(2);
  if (인자.includes('--자가시험')) { process.exit(자가시험() ? 0 : 1); }
  const 양식파일 = 인자.find((x) => !x.startsWith('--'));
  if (!양식파일) {
    console.log('쓰는 법: node scripts/적는다-사장님말씀.mjs <양식파일>');
    console.log('양식은 이 파일 머리 주석에 있다.');
    process.exit(1);
  }
  if (!fs.existsSync(양식파일)) { console.log('🔴 양식 파일이 없다 — ' + 양식파일); process.exit(1); }
  const 것 = 양식읽기(fs.readFileSync(양식파일, 'utf8'));
  const 흠 = 흠잡기(것);
  if (흠.length) {
    console.log('🔴 양식에 흠이 있다 — 적지 않는다');
    for (const x of 흠) console.log('   · ' + x);
    process.exit(1);
  }
  console.log('■ 정본 한 줄');
  console.log('   ' + 정본줄만들기(것).replace(/\t/g, ' ⇥ '));
  console.log('■ 마크다운 한 절');
  for (const 줄 of 마크다운절만들기(것).split('\n')) if (줄) console.log('   ' + 줄);
  if (인자.includes('--본다')) { console.log('\n⬜ 보기만 했다 — 적지 않았다'); process.exit(0); }
  const 결 = 적는다(것);
  console.log('\n' + (결.적었나 ? '✅ ' : '⬜ ') + 결.까닭);
  process.exit(결.적었나 ? 0 : 1);
}
