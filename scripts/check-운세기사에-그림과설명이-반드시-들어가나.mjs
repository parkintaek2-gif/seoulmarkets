/**
 * check-운세기사에-그림과설명이-반드시-들어가나.mjs
 *   — 운세 기사 등록 도구가 «대표 이미지»와 «사진 설명»을 반드시 넣게 돼 있나 잰다.
 *
 * 🔴🔴🔴 왜 이것이 있어야 하나 (2026-11-22 · 사장님)
 *   「**운세 예약 기사에 반드시 (1) 대표이미지 삽입 (2) 사진 설명 삽입해.
 *     이미 나간 기사는 냅둬**」
 *   「**내가 반드시 넣으라고 햇는데 왜 수정을 안 하나**」
 *
 *   [무엇이 있었나] 등록 도구에 대표 이미지 올리기와 사진 설명 넣기가 «있기는 했다».
 *   그런데 둘 다 이렇게 돼 있었다 —
 *       try { console.log(await 대표이미지올리기(붙음)); }
 *       catch (e) { console.log('⚠ 못 올렸다'); }
 *   실패해도 로그 한 줄 찍고 **그대로 등록을 이어 갔다.** 「반드시」가 아니라
 *   「되면 좋고」였다. 사장님이 11-18 에 못 박으신 것이 넉 달 뒤에도 그 상태였다.
 *
 *   ⇒ 말로 하는 규칙은 잊힌다. 검사로 굳힌다.
 *
 * 쓰는 법
 *   node scripts/check-운세기사에-그림과설명이-반드시-들어가나.mjs
 *   node scripts/check-운세기사에-그림과설명이-반드시-들어가나.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const 볼파일 = [
  'scripts/중부매일-띠별-등록.mjs',
  'scripts/중부매일-별자리-등록.mjs',
];

/** 그 호출이 «실패를 그냥 지나치는» 꼴인가 */
export function 조용히넘어가나(글, 부르는이름) {
  const s = String(글 ?? '');
  const 이름 = String(부르는이름 ?? '');
  if (!이름) return false;
  /* try { console.log(... await 부르는이름(...)) } 한 줄로 끝나는 꼴을 잡는다 */
  const 자 = new RegExp('try\\s*\\{\\s*console\\.log\\([^\\n]*await\\s+' + 이름 + '\\(', 'm');
  return 자.test(s);
}

/** 그 결과를 보고 «멈추거나 알리는» 자리가 있나 */
export function 막는자리가있나(글, 부르는이름) {
  const s = String(글 ?? '');
  const 이름 = String(부르는이름 ?? '');
  if (!이름 || !s.includes(이름)) return false;
  const i = s.indexOf('await ' + 이름 + '(');
  if (i < 0) return false;
  const 둘레 = s.slice(i, i + 1400);
  /* 결과를 변수로 받고, 그것을 보고 통보하거나 멈춘다 */
  return /등록실패통보\s*\(/.test(둘레)
    && (/process\.exit\(1\)/.test(둘레) || /종료코드\s*=\s*1/.test(둘레));
}

export function 잰다(읽기 = (p) => fs.readFileSync(path.join(뿌리, p), 'utf8')) {
  const 것 = [];
  for (const 파일 of 볼파일) {
    let 글 = '';
    try { 글 = 읽기(파일); } catch (e) { 것.push({ 파일, 이름: '파일을 읽었나', 참: false }); continue; }
    for (const 부름 of ['대표이미지올리기', '사진설명넣기']) {
      것.push({ 파일, 이름: 부름 + ' 가 조용히 넘어가지 않는다', 참: !조용히넘어가나(글, 부름) });
      것.push({ 파일, 이름: 부름 + ' 가 실패하면 멈추거나 알린다', 참: 막는자리가있나(글, 부름) });
    }
    것.push({ 파일, 이름: '사장님 2026-11-22 지시가 적혀 있다', 참: 글.includes('2026-11-22') && 글.includes('반드시') });
  }
  return 것;
}

if (process.argv.includes('--자가시험')) {
  let 통과 = 0; let 탈 = 0;
  const 본다 = (이름, 참) => { if (참) { 통과 += 1; } else { 탈 += 1; console.log('🔴 ' + 이름); } };
  const 옛꼴 = 'try { console.log("x" + (await 대표이미지올리기(붙음))); }\ncatch (e) { console.log("못 올렸다"); }';
  const 새꼴 = 'let r = "";\ntry { r = String(await 대표이미지올리기(붙음)); } catch (e) { r = "터졌다"; }\n'
    + 'if (!/올라갔다/.test(r)) { console.log(등록실패통보("날", "못 넣었다", "")); process.exit(1); }';
  본다('🔴 옛 꼴(조용히 넘어감)을 잡는다', 조용히넘어가나(옛꼴, '대표이미지올리기') === true);
  본다('🔴 새 꼴은 조용히 넘어가지 않는다', 조용히넘어가나(새꼴, '대표이미지올리기') === false);
  본다('🔴 새 꼴에는 막는 자리가 있다', 막는자리가있나(새꼴, '대표이미지올리기') === true);
  본다('🔴 옛 꼴에는 막는 자리가 없다', 막는자리가있나(옛꼴, '대표이미지올리기') === false);
  본다('⛔ 빈 글·빈 이름에 안 터진다',
    조용히넘어가나('', '') === false && 막는자리가있나('', '') === false
    && 조용히넘어가나(null, null) === false && 막는자리가있나(undefined, undefined) === false);
  본다('⛔ 없는 이름은 거짓으로 떨어진다', 막는자리가있나(새꼴, '없는함수') === false);
  본다('🔴 통보만 있고 멈추지 않으면 안 된다',
    막는자리가있나('let r = await 대표이미지올리기(x); console.log(등록실패통보("a","b","c"));', '대표이미지올리기') === false);
  본다('🔴 잰다() 가 두 파일을 다 본다', 볼파일.length === 2);
  console.log(탈 ? '🔴 자가시험 ' + 탈 + '건 탈' : '✅ 자가시험 ' + 통과 + '가지 통과');
  process.exit(탈 ? 1 : 0);
}

const 결과 = 잰다();
const 탈 = 결과.filter((x) => !x.참);
console.log('━━━ 운세 기사에 그림과 설명이 «반드시» 들어가나 ━━━');
let 앞파일 = '';
for (const r of 결과) {
  if (r.파일 !== 앞파일) { console.log('  [' + r.파일 + ']'); 앞파일 = r.파일; }
  console.log('   ' + (r.참 ? '✅' : '🔴') + ' ' + r.이름);
}
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
if (탈.length) {
  console.log('🔴 ' + 탈.length + '건이 「되면 좋고」로 돼 있다 — 사장님은 「반드시」라고 하셨다');
  process.exit(1);
}
console.log('🟢 성하다 — 그림과 설명이 빠지면 등록이 멈추거나 알린다');
