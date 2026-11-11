#!/usr/bin/env node
/**
 * check-자리목록-한곳.mjs — **「지금 도는 자리」를 두 곳에 적지 못하게 막는다.**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔴 [2026-09-19 · 사장님] **「언제 세션을 정리했는데 아직도 헤매나?」**
 *
 * 자리를 1·2·5 셋으로 줄인 것은 9/18 이다. 그런데 하루 뒤에도 —
 *   · klifemap 감수 고리가 접힌 6번을 기다려 **9/16 이후 배포가 통째로 막혀 있었다**
 *   · 유닛 좌석 자가 허락된 자리를 6·7번으로 들고 매시 빨간불을 켰다
 *   · 16시 보고 모으는 자와 매시 소통 자물쇠가 목록을 «각자» 들고 있었다
 *
 * ⛔ 되풀이된 까닭은 「고치는 것을 잊었다」가 아니다. **답이 여러 곳에 있었기 때문**이다.
 *   다섯 곳에 적힌 답은 자리를 한 번 옮길 때마다 다섯 번 고쳐야 하고, 한 곳만 빠뜨리면
 *   그 한 곳이 조용히 일을 막는다. 사람의 꼼꼼함으로 막을 수 있는 종류가 아니다.
 *
 * ⇒ 답은 scripts/lib/도는자리.mjs 한 곳. 이 자는 «또 적은 곳»을 찾아 막는다.
 *
 *   node scripts/check-자리목록-한곳.mjs
 *   node scripts/check-자리목록-한곳.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { 도는자리, 접힌자리 } from './lib/도는자리.mjs';

const 뿌리 = path.resolve(import.meta.dirname, '..');
export const 정본길 = 'scripts/lib/도는자리.mjs';

/** 훑는 곳 — 자(script)와 도구만 본다. 문서는 사람이 읽는 글이라 «기록»으로 남겨 둔다. */
export const 훑을곳 = ['scripts', 'tools'];

/* ⚠ 여기 적힌 파일은 목록을 손으로 들고 있어도 봐준다. 봐주는 까닭을 반드시 함께 적는다 —
   까닭 없이 늘어나면 이 자는 장식이 된다. */
export const 봐주는곳 = {
  'scripts/lib/도는자리.mjs': '정본이다. 여기에 적혀 있어야 한다',
  'scripts/check-자리목록-한곳.mjs': '이 자다. 무엇을 찾는지 적혀 있어야 한다',
};

/**
 * 주석과 글자열을 지운다 — 줄 수는 그대로 둔다.
 * 🔴 왜 지우나: 「예전에는 ['5번','6번',…] 이었다」고 «설명해 둔 주석»을 흠으로 잡으면
 *   이 자가 헛짖는다. 옛 모습을 주석에 남기는 것은 좋은 버릇이라 자가 피해 가야 한다.
 *   (같은 함정을 2026-08-14 report-layout 자가 이미 겪었다)
 */
export function 주석지우기(글) {
  return String(글 ?? '')
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/^([ \t]*)\/\/[^\n]*/gm, (m, 앞) => 앞 + ' '.repeat(m.length - 앞.length));
}

/**
 * 한 파일에서 «자리 목록을 손으로 든 자리»를 찾는다.
 * 찾는 꼴 — 배열이나 Set 안에 자리 이름/번호가 둘 이상 늘어선 것.
 *   ['1번','2번','5번']  ·  new Set([1, 2, 5])  ·  ['5번','6번','1번','2번','3번']
 * ⛔ 「'5번'」 하나만 있는 것은 안 잡는다 — 그것은 목록이 아니라 그 자리를 가리키는 말이다.
 */
export function 목록찾기(글) {
  const 벗긴것 = 주석지우기(글);
  const 찾음 = [];
  const 자리말 = '(?:[1-9]번|[1-9])';
  const 자 = new RegExp(`(?:new\\s+Set\\s*\\(\\s*)?\\[\\s*(['"]?${자리말}['"]?\\s*,\\s*){1,}['"]?${자리말}['"]?\\s*,?\\s*\\]`, 'g');
  let m;
  while ((m = 자.exec(벗긴것))) {
    const 줄번호 = 벗긴것.slice(0, m.index).split('\n').length;
    /* 자리 이름이 「N번」 꼴로 하나라도 들어 있거나, 숫자만이라도 도는/접힌 자리와 겹치면 본다.
       ⚠ 숫자만 든 배열은 [1,2,5] 같은 «띠 나누기»일 수 있다 — 그래서 겹침을 함께 본다. */
    const 안쪽 = m[0];
    const 번호들 = (안쪽.match(/[1-9]/g) || []).map(Number);
    const 자리꼴 = /[1-9]번/.test(안쪽);
    const 도는번호 = 도는자리.map((x) => Number(String(x).replace('번', '')));
    const 같나 = 도는번호.length === 번호들.length && 도는번호.every((n) => 번호들.includes(n));
    if (자리꼴 || 같나) 찾음.push({ 줄: 줄번호, 글: 안쪽.replace(/\s+/g, ' ').slice(0, 60) });
  }
  return 찾음;
}

export function 훑기(뿌리길 = 뿌리) {
  const 걸린것 = [];
  for (const 칸 of 훑을곳) {
    const 칸길 = path.join(뿌리길, 칸);
    if (!fs.existsSync(칸길)) continue;
    for (const 이름 of fs.readdirSync(칸길)) {
      if (!/\.(mjs|js)$/.test(이름)) continue;
      const 상대 = (칸 + '/' + 이름).replace(/\\/g, '/');
      if (봐주는곳[상대]) continue;
      let 글;
      try { 글 = fs.readFileSync(path.join(칸길, 이름), 'utf8'); }
      catch { continue; }                      /* 못 읽은 것은 통과로도 흠으로도 안 센다 */
      const 찾음 = 목록찾기(글);
      if (찾음.length) 걸린것.push({ 파일: 상대, 자리들: 찾음 });
    }
  }
  return 걸린것;
}

function 낸다() {
  const 걸린것 = 훑기();
  console.log(`■ 자리 목록이 한 곳에 있나 — ${new Date().toLocaleString('ko-KR')}`);
  console.log(`   정본: ${정본길}   도는 자리 ${도는자리.join('·')}   접힌 자리 ${접힌자리.join('·')}`);
  console.log('');
  if (!걸린것.length) {
    console.log('✅ 자리 목록을 손으로 든 곳 0 — 자리가 바뀌면 정본 한 곳만 고치면 된다');
    return 0;
  }
  for (const x of 걸린것) {
    console.log(`🔴 ${x.파일}`);
    for (const y of x.자리들) console.log(`     ${y.줄}줄  ${y.글}`);
  }
  console.log('');
  console.log(`⛔ 자리 목록이 ${걸린것.length}곳에 또 적혀 있다. 자리를 옮기는 날 여기가 빠진다.`);
  console.log(`   ⇒ import { 도는자리 } from './lib/도는자리.mjs' 로 읽으십시오.`);
  console.log('   ⚠ 정말 따로 들어야 하는 목록이면 이 자의 「봐주는곳」에 «까닭과 함께» 적으십시오.');
  return 걸린것.length;
}

/* ── 자가시험 ─────────────────────────────────────────────────────────────
   ⭐ 이 자가 «물기는 하는가»를 먼저 잰다. 0곳을 초록으로 찍는 자가 제일 나쁘다. */
function 자가시험() {
  let 통과 = 0, 실패 = 0;
  const 본다 = (말, 참인가) => { if (참인가) { 통과 += 1; console.log('  ✅ ' + 말); } else { 실패 += 1; console.log('  ✕ ' + 말); } };

  본다('🔴 자리 이름 목록을 잡는다', 목록찾기(`const a = ['1번', '2번', '5번'];`).length === 1);
  본다('🔴 옛 고리 꼴도 잡는다', 목록찾기(`const 고리 = ['5번','6번','1번','2번','3번'];`).length === 1);
  /* 🔴 [2026-11-11] 여기에 «[1, 2, 5]» 를 박아 두었더니, 사장님이 2번 자리를 접으시자
     자가시험이 깨졌다. **자리 목록을 한 곳에 두자고 만든 자가 제 시험에는 자리를 박아 둔** 것이다.
     ⇒ 보기도 도는자리에서 지어 쓴다. */
  const 숫자띠 = 도는자리.map((x) => String(x).replace('번', '')).join(', ');
  본다('🔴 Set 꼴도 잡는다', 목록찾기(`const s = new Set([${숫자띠}]);`).length === 1);
  본다('⛔ 자리 하나만 가리키는 것은 안 잡는다', 목록찾기(`if (누구 === '5번') {}`).length === 0);
  본다('⛔ 자리와 무관한 숫자 띠는 안 잡는다', 목록찾기(`띠나누기(표본, [1, 2, 5, 10, 25])`).length === 0);
  본다('⛔ 주석 안의 옛 모습은 안 잡는다 — 기록을 남기는 것은 좋은 버릇이다',
    목록찾기(`/* 예전에는 ['5번','6번','1번'] 이었다 */\nconst x = 1;`).length === 0);
  본다('⛔ // 주석도 피해 간다', 목록찾기(`// 옛 고리 ['5번','6번']\nconst x = 1;`).length === 0);
  본다('주석을 지워도 줄 수가 그대로다',
    주석지우기('앞\n/* 속\n속 */\n뒤').split('\n').length === 4);
  본다('봐주는 곳에는 까닭이 적혀 있다',
    Object.values(봐주는곳).every((까닭) => String(까닭).trim().length >= 5));
  본다('정본이 봐주는 곳에 들어 있다', !!봐주는곳[정본길]);
  본다('도는 자리와 접힌 자리가 겹치지 않는다', !도는자리.some((x) => 접힌자리.includes(x)));
  본다('도는 자리가 비어 있지 않다', 도는자리.length >= 1);

  console.log(`\n══ 자가시험 통과 ${통과} · 실패 ${실패} ══ ` + (실패 ? '🔴' : '✅'));
  return 실패 === 0;
}

const 내가실행됐다 = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (내가실행됐다) {
  if (process.argv.includes('--자가시험')) process.exit(자가시험() ? 0 : 1);
  process.exit(낸다() ? 1 : 0);
}
