#!/usr/bin/env node
/**
 * check-selftest-hijack.mjs — **남의 자가시험을 «삼키는» 자를 찾는다.**
 *
 * ── 🔴 왜 만드나 (2026-09-06, 겪고 나서) ────────────────────
 * `build-kcw-people.mjs` 에 별자리 시험 10개를 붙였는데 **하나도 안 돌았다.**
 * 그런데 화면은 초록불이었다. 까닭은 이랬다 —
 * ```
 *   build-kcw-people.mjs  →  import { 별자리찾기 } from './build-kcw-star-signs.mjs'
 *   build-kcw-star-signs.mjs 맨 아래:
 *       if (process.argv.includes('--자가시험')) { …시험… process.exit(0); }
 * ```
 * import 는 «불러온 파일을 통째로 실행»한다. 그래서 부르는 쪽 시험이 시작되기도 «전»에
 * 불려온 파일의 시험이 돌고 `process.exit(0)` 해 버린다.
 * ⇒ **부르는 쪽 시험이 한 줄도 안 돌고, 화면에는 「통과」만 뜬다.**
 *
 * ⛔ 이것이 이 저장소가 제일 싫어하는 꼴이다 — **조용히 성공한 척하기.**
 *   `ctype undeploy` 가 종료코드 0 으로 아무 일도 안 하던 것과 같은 병이다.
 *
 * ⚠ 더 고약한 것 — `build-kcw-star-signs.mjs` 는 자기 머리글에 이 함정을 «경고까지»
 *   적어 두었다. 그런데 막아 둔 것은 `--selftest` 뿐이고 정작 쓰는 깃발은 `--자가시험` 이었다.
 *   **경고를 적는 것과 검사를 두는 것은 다르다.** 그래서 이 자를 만든다.
 *
 * ── 무엇을 흠으로 보나 ──────────────────────────────────────
 * ```
 * 🔴 흠   시험 블록이 「내가 직접 돌았나」를 안 보고, 그 파일을 «남이 import 한다»
 * ⬜ 아님  시험 블록은 있으나 아무도 import 하지 않는다 (혼자 도는 자)
 * ✅ 좋음  import.meta.url 과 process.argv[1] 을 견주어 직접 실행일 때만 돈다
 * ```
 * ⛔ import 되지 않는 파일은 흠으로 세지 않는다 — 지금 아무 해도 없다.
 *   대신 «언젠가 import 되면 터진다»고 따로 세어 알려 준다.
 *
 * 쓰는 법
 *   node scripts/check-selftest-hijack.mjs
 *   node scripts/check-selftest-hijack.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** 시험 블록이 있나 — `process.argv` 에서 시험 깃발을 보는 줄 */
export function 시험블록있나(글) {
  return /process\.argv[\s\S]{0,40}(--자가시험|--selftest|--셀프테스트)/.test(String(글 ?? ''));
}

/**
 * 「내가 직접 돌았나」를 보고 있나.
 *
 * 🔴 [2026-09-06] **첫 판이 하나를 헛으로 잡았다.** `import.meta.url` 이 있는 꼴만 인정했는데,
 *   `unit-hosts.mjs` 는 이렇게 막고 있었다 —
 * ```js
 *   if (process.argv[1] && process.argv[1].endsWith('unit-hosts.mjs') && …)
 * ```
 *   **막는 방법이 다를 뿐 제대로 막고 있었다.** 그런데 내 자는 「안 막았다」고 냈다.
 * ⛔ 오늘 이 자리에서만 다섯 번째다 — 겉모양(쓰는 꼴) 하나로 갈랐다.
 * ✅ 그래서 «막는 뜻»으로 넓힌다: `process.argv[1]` 을 자기 파일 이름과 견주기만 하면 인정한다.
 */
export function 직접실행을보나(글) {
  const s = String(글 ?? '');
  if (!/process\.argv\[1\]/.test(s)) return false;
  /* 꼴 하나 — import.meta.url 과 견준다 */
  if (/import\.meta\.url/.test(s)) return true;
  /* 꼴 둘 — 파일 이름으로 끝나는지 본다 (unit-hosts.mjs 가 쓰는 꼴).
     ⚠ 재는 말이 argv 뒤에 올 수도(`argv[1].endsWith(…)`) 앞에 올 수도(`basename(argv[1])`) 있다.
     첫 판은 «뒤»만 봐서 basename 꼴을 놓쳤다 — 자가시험이 그 자리에서 잡아 줬다. */
  if (/process\.argv\[1\][\s\S]{0,80}(endsWith|includes|basename)\s*\(/.test(s)) return true;
  if (/(endsWith|includes|basename)\s*\([\s\S]{0,40}process\.argv\[1\]/.test(s)) return true;
  return false;
}

/** 이 파일을 남이 import 하나 — 파일 이름으로 찾는다 */
export function 남이부르나(이름, 모든글) {
  const 벗 = 이름.replace(/\.mjs$/, '');
  const 재 = new RegExp(`from\\s+['"][^'"]*${벗.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\.mjs)?['"]`);
  return [...모든글].filter(([f, 글]) => f !== 이름 && 재.test(글)).map(([f]) => f);
}

/* ── 자가시험 ─────────────────────────────────────────────────
   ⚠ 이 자 스스로도 그 함정에 빠지면 안 된다. 직접 실행일 때만 돈다 — 자기가 재는 규칙이다 */
const 내가직접돌았나 = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (내가직접돌았나 && process.argv.includes('--자가시험')) {
  const 실 = []; let 통 = 0;
  const 같나 = (이름, 본, 기대) => {
    const a = JSON.stringify(본); const b = JSON.stringify(기대);
    if (a === b) 통 += 1; else 실.push(`${이름}: ${a} ≠ ${b}`);
  };

  같나('시험 블록을 찾는다', 시험블록있나("if (process.argv.includes('--자가시험')) {"), true);
  같나('영어 깃발도 찾는다', 시험블록있나("if (process.argv.includes('--selftest')) {"), true);
  같나('⛔ 시험 블록이 없으면 없다', 시험블록있나('const a = 1;'), false);

  /* 🔴 이것이 이 자의 심장 — 막아 둔 것과 안 막은 것을 가른다 */
  같나('⛔ 직접실행을 안 보면 거짓',
    직접실행을보나("if (process.argv.includes('--자가시험')) {}"), false);
  같나('✅ 변수에 담아 견주는 꼴을 인정한다',
    직접실행을보나("const 나 = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);"), true);
  같나('✅ 그 자리에서 견주는 꼴도 인정한다',
    직접실행을보나("if (process.argv[1] === fileURLToPath(import.meta.url)) {}"), true);
  /* ⛔ import.meta.url 만 있고 argv 를 안 보면 못 막는다 */
  같나('⛔ import.meta.url 만으로는 못 막는다',
    직접실행을보나('const __dirname = path.dirname(fileURLToPath(import.meta.url));'), false);

  /* 🔴 첫 판이 «헛으로 잡은» 꼴 — 막는 방법이 다를 뿐 제대로 막고 있었다 */
  같나('✅ 파일 이름으로 견주는 꼴도 인정한다 (unit-hosts.mjs)',
    직접실행을보나("if (process.argv[1] && process.argv[1].endsWith('unit-hosts.mjs')) {}"), true);
  같나('✅ basename 으로 견주는 꼴도 인정한다',
    직접실행을보나("if (path.basename(process.argv[1]) === 'x.mjs') {}"), true);
  같나('⛔ argv[1] 을 아예 안 보면 못 막는다',
    직접실행을보나("if (process.argv.includes('--자가시험')) {}"), false);

  const 글들 = new Map([
    ['a.mjs', "import { x } from './b.mjs';"],
    ['b.mjs', 'export const x = 1;'],
    ['c.mjs', 'nothing here'],
  ]);
  같나('남이 부르는 것을 찾는다', 남이부르나('b.mjs', 글들), ['a.mjs']);
  같나('아무도 안 부르면 빈 목록', 남이부르나('c.mjs', 글들), []);
  같나('⛔ 자기 자신은 안 센다', 남이부르나('a.mjs', 글들), []);
  /* ⚠ 확장자 없이 부르는 꼴도 있다 */
  같나('확장자 없이 불러도 찾는다',
    남이부르나('b.mjs', new Map([['a.mjs', "import x from './b';"], ['b.mjs', '']])), ['a.mjs']);

  if (실.length) { console.error(`❌ 자가시험 ${실.length}건 실패\n${실.map((s) => `   · ${s}`).join('\n')}`); process.exit(1); }
  console.log(`✅ 자가시험 삼킴 검사 — 자가시험 ${통}개 통과`);
  process.exit(0);
}

/* ── 실제로 잰다 ─────────────────────────────────────────────── */
if (내가직접돌았나) {
  const 방들 = ['scripts', 'tools'];
  const 글들 = new Map();
  for (const 방 of 방들) {
    const 자리 = path.join(뿌리, 방);
    if (!fs.existsSync(자리)) continue;
    for (const f of fs.readdirSync(자리)) {
      if (!/\.mjs$/.test(f)) continue;
      글들.set(f, fs.readFileSync(path.join(자리, f), 'utf8'));
    }
  }

  const 흠 = []; const 아직안전 = [];
  for (const [f, 글] of 글들) {
    if (!시험블록있나(글)) continue;
    if (직접실행을보나(글)) continue;
    const 부르는이 = 남이부르나(f, 글들);
    if (부르는이.length) 흠.push({ f, 부르는이 });
    else 아직안전.push(f);
  }

  console.log('# 남의 자가시험을 «삼키는» 자가 있나\n');
  console.log(`훑은 파일 ${글들.size}개 · 시험 블록이 있는 파일 중 직접실행을 «안 보는» 것을 찾는다\n`);

  if (흠.length === 0) {
    console.log('✅ 지금 남의 시험을 삼키는 자는 없다.');
  } else {
    console.log(`🔴 **${흠.length}개** — import 되는데 직접실행을 안 본다. 부르는 쪽 시험이 «안 돈다»\n`);
    for (const x of 흠) console.log(`   ${x.f}\n      ← ${x.부르는이.join(', ')} 가 부른다`);
    console.log('\n✅ 고치는 법 — 시험 블록 앞에 이 두 줄을 두고 `내가직접돌았나 &&` 를 붙인다:');
    console.log("   const 내가직접돌았나 = process.argv[1]");
    console.log("     && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);");
  }

  console.log(`\n⬜ 아직 아무도 안 부르는 것 ${아직안전.length}개 — 지금은 해가 없다.`);
  console.log('   ⚠ 다만 «언젠가 import 되면» 그날 조용히 터진다. 새로 import 할 때 이 자를 한 번 돌린다.');
  if (아직안전.length && process.argv.includes('--다찍기')) {
    for (const f of 아직안전) console.log(`   · ${f}`);
  } else if (아직안전.length) {
    console.log('   (다 보려면 --다찍기)');
  }

  console.log('\n## ⛔ 이 자가 못 재는 것');
  console.log('   · 시험 블록을 «함수 안»에 둔 것은 못 본다. 줄 꼴로만 찾는다');
  console.log('   · import 를 변수로 만들어 부르는 것(동적 import)은 못 찾는다');
  console.log('   · 그러니 이 자가 초록이어도 「자가시험이 다 돈다」는 뜻은 아니다 —');
  console.log('     시험을 붙였으면 **그 시험 이름이 화면에 실제로 뜨는지** 눈으로 본다');

  process.exit(흠.length ? 1 : 0);
}
