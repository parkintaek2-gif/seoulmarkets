#!/usr/bin/env node
/**
 * check-빈-강조가-있나.mjs — **속이 빈 강조 태그를 소스에서 막는다.**
 *
 * ── 🔴🔴 왜 (2026-11-25 · 5번) ──────────────────────────────────────────
 * 2026-11-22 커밋 7d2702327 「우리가 지어낸 문구를 모든 곳에서 지운다」가
 * 문구만 지우고 **껍데기를 남겼다.**
 * ```
 *   지우기 전   <li><strong>(지운 문구)</strong> 한 해 동안 …</li>
 *   지운 뒤     <li><strong></strong> 한 해 동안 …</li>      ← 206곳
 * ```
 * 손님 화면에는 **빈 글머리표**가 그대로 나갔다. 사흘 동안 아무도 못 봤다.
 * `check-지면에-빈자리가-나가나.mjs` 가 dist 에서 129장을 잡고 있었지만
 * 배포를 막지 않아 **아무도 안 봤다**(메모리 — 「검사가 로그에만 적으면 아무도 안 본다」).
 *
 * ⇒ 이 검사는 **소스**를 본다. 지면을 짓기 전에 잡아야 고치는 값이 싸다.
 * ⛔ 「문구를 되살린다」가 아니다 — 지운 것은 지운 대로 두고 껍데기만 없앤다.
 *
 * 쓰는 법
 *   node scripts/check-빈-강조가-있나.mjs
 *   node scripts/check-빈-강조가-있나.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 볼확장 = /\.(astro|ts|tsx|mjs|js|md|mdx|html)$/;
/* ⛔ td·th 는 기본에서 뺀다 — 표 왼쪽 위 «빈 모서리 칸»은 옳은 꼴이다.
   거짓 빨강은 소음이 아니라 멈춤이다(메모리 — 「막는 검사가 거짓이면 일이 통째로 선다」).
   표 안의 빈 칸은 dist 를 보는 check-지면에-빈자리가-나가나.mjs 가 따로 본다.
   그래도 보고 싶으면 --표도본다 를 준다. */
const 글태그 = ['strong', 'b', 'em', 'i', 'mark', 'h1', 'h2', 'h3', 'h4', 'li', 'dt', 'dd', 'figcaption', 'caption'];
const 표태그 = ['td', 'th'];
const 볼태그 = process.argv.includes('--표도본다') ? [...글태그, ...표태그] : 글태그;

/** 속이 빈 태그를 찾는다. ⛔ 못 읽으면 null — 「없다」가 아니다 */
export function 빈강조찾기(글, 태그들 = 볼태그) {
  if (typeof 글 !== 'string') return null;
  const 것 = [];
  const 줄들 = 글.split(/\r?\n/);
  for (let i = 0; i < 줄들.length; i += 1) {
    for (const t of 태그들) {
      /* 여는 태그에 속성이 있어도 잡는다. 속은 공백·줄바꿈만 있어도 「비었다」 */
      const re = new RegExp(`<${t}(\\s[^>]*)?>\\s*</${t}>`, 'gi');
      const m = 줄들[i].match(re);
      if (m) for (const x of m) 것.push({ 줄번호: i + 1, 태그: t, 글자: x, 줄: 줄들[i].trim().slice(0, 80) });
    }
  }
  return 것;
}

/** 스스로 닫는 것·속이 있는 것은 빈 것이 아니다 */
export function 비었나(한조각) {
  const 것 = 빈강조찾기(String(한조각 ?? ''));
  return Array.isArray(것) && 것.length > 0;
}

function 훑는다(디렉터리, 모은다) {
  for (const e of fs.readdirSync(디렉터리, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === 'dist' || e.name.startsWith('.')) continue;
    const p = path.join(디렉터리, e.name);
    if (e.isDirectory()) { 훑는다(p, 모은다); continue; }
    if (!볼확장.test(e.name)) continue;
    let 글;
    try { 글 = fs.readFileSync(p, 'utf8'); } catch { continue; }
    const 것 = 빈강조찾기(글);
    if (것 && 것.length) 모은다.push({ 파일: path.relative(뿌리, p), 것 });
  }
}

if (process.argv.includes('--자가시험') || process.argv.includes('--selftest')) {
  const r = [];
  const 본다 = (이름, 참) => r.push({ 이름, 참: !!참 });
  본다('빈 strong 을 잡는다', 비었나('<li><strong></strong> 글</li>'));
  본다('속성이 붙어도 잡는다', 비었나('<strong class="x"></strong>'));
  본다('공백만 있어도 잡는다', 비었나('<em>   </em>'));
  본다('빈 li 도 잡는다', 비었나('<ul><li></li></ul>'));
  본다('⛔ 빈 td 는 기본에서 안 잡는다 — 표 모서리 칸은 옳은 꼴이다', !비었나('<tr><td></td></tr>'));
  본다('⚠ 표도본다 를 주면 빈 td 도 잡는다', 빈강조찾기('<tr><td></td></tr>', 표태그).length === 1);
  본다('⛔ 속이 있으면 안 잡는다', !비었나('<strong>이것은 값이다</strong>'));
  본다('⛔ 스스로 닫는 태그는 안 잡는다', !비었나('<br /><img src="x" />'));
  본다('⛔ 다른 태그 이름에 안 걸린다', !비었나('<strongbox></strongbox>'));
  본다('⛔ 빈 것에 안 터진다', !비었나('') && 빈강조찾기(null) === null);
  본다('줄 번호를 준다', (빈강조찾기('첫 줄\n<b></b>') || [{}])[0].줄번호 === 2);
  본다('여러 개를 다 준다', (빈강조찾기('<b></b><i></i>') || []).length === 2);
  본다('태그 이름을 적는다', (빈강조찾기('<mark></mark>') || [{}])[0].태그 === 'mark');
  let 빨강 = 0;
  console.log('■ 빈 강조 검사 — 자가시험');
  for (const x of r) { if (!x.참) 빨강 += 1; console.log(`  ${x.참 ? '✅' : '🔴'} ${x.이름}`); }
  console.log(빨강 ? `🔴 실패 ${빨강}개` : `✅ ${r.length}가지 다 통과`);
  process.exit(빨강 ? 1 : 0);
}

const 모은다 = [];
for (const d of ['src', 'public']) {
  const p = path.join(뿌리, d);
  if (fs.existsSync(p)) 훑는다(p, 모은다);
}

if (!모은다.length) {
  console.log('✅ 속이 빈 강조·글머리표가 한 곳도 없다 — src·public 을 다 봤다');
  process.exit(0);
}

const 곳 = 모은다.reduce((a, x) => a + x.것.length, 0);
console.log(`🔴 속이 빈 태그 ${곳}곳 · 파일 ${모은다.length}개 — 손님 화면에 빈 자리가 나간다`);
for (const x of 모은다.slice(0, 30)) {
  console.log(`   ⛔ ${x.파일}`);
  for (const y of x.것.slice(0, 3)) console.log(`      ${y.줄번호}줄  ${y.글자}   ${y.줄}`);
}
if (모은다.length > 30) console.log(`   … 그 밖에 파일 ${모은다.length - 30}개`);
console.log('   ✅ 고치는 법 — 껍데기를 지운다. ⛔ 지워진 문구를 되살리는 것이 아니다.');
process.exit(1);
