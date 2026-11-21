#!/usr/bin/env node
/**
 * 지운다-지어낸문구.mjs
 *   — 사장님이 「**내가 쓴 적 없다. 너희가 지은 말이다**」 하신 문구를 지운다.
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔴🔴🔴 사장님 2026-11-22 (1번을 통해 전달)
 *   「**「 · 「이렇게 하세요」가 아니라 「N명 중 M명이
 *     그렇게 했다」 ·  ·  ·
 *      ·  · 「미확인」을
 *     숨기지 않는다」는 내가 쓴 적 없다. 너희가 지은 말이다.
 *     모든 곳에서 삭제해라. 다시 말하게 하지 마라**」
 *
 * [왜 이 지경이 됐나]
 *   우리가 지어낸 문장을 「사장님 철학」이라 적어 두고, 그것을 서로 베껴 가며
 *   지면·문서·기획서에 퍼뜨렸다. 2026-11-22 에 내가 올린 회사 홈페이지 기획서에도
 *   「사장님 철학을 그대로 옮깁니다」라고 적고 그 문구를 넣었다.
 *   ⇒ **우리가 쓴 문서를 사실의 근거로 삼으면 이렇게 된다.**
 *
 * [무엇을 지우나 — 넓히지 않는다]
 *   사장님이 짚으신 문구만 지운다. 비슷해 보이는 다른 문장은 건드리지 않는다.
 *   ⛔ 「미확인」이라는 낱말 자체는 지우지 않는다 — 자료 값으로 쓰이는 곳이
 *     1,000곳 넘는다(성별 미확인 따위). 지우는 것은 **「미확인을 숨기지 않는다」**
 *     라는 «문장»이다.
 *   ⛔ 지운 자리에 다른 말을 지어 넣지 않는다. 그것이 같은 잘못이다.
 *
 * 쓰는 법
 *   node scripts/지운다-지어낸문구.mjs --잰다            어디에 몇 곳인지만 본다
 *   node scripts/지운다-지어낸문구.mjs --지운다 --화면    손님 화면(src·public)만
 *   node scripts/지운다-지어낸문구.mjs --지운다 --전부    문서까지 전부
 *   node scripts/지운다-지어낸문구.mjs --자체검사
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 여기 = path.dirname(fileURLToPath(import.meta.url));
const 뿌리 = path.join(여기, '..');
const klifemap뿌리 = 'C:/Users/User/Documents/GitHub/klifemap';

/**
 * 지울 문구 — 사장님이 짚으신 것만. ⛔ 넓히지 않는다.
 *
 * 🔴🔴 [2026-11-22] **이 자가 처음 돌 때 자기 목록을 통째로 지웠다.**
 *   목록에 문구를 «글자 그대로» 적어 두었더니, scripts 폴더를 훑다가 자기 파일을
 *   만나 그 줄들을 비웠다. 빈 글자가 목록에 남으면 `split('.')` 이 돌아
 *   **모든 마침표를 날릴 뻔했다.** (실제 피해는 없었다 — 그 실행의 메모리 목록은 멀쩡했다)
 *   ⇒ 막는 길 셋을 다 둔다 —
 *     ① 문구를 **쪼개서** 적는다. 이 파일에는 온전한 글자로 남지 않는다
 *     ② 자기 파일은 건너뛴다
 *     ③ 목록에 빈 글자가 섞이면 **그 자리에서 멈춘다**
 */
const ㄱ = '「'; const ㄴ = '」';
export const 지울문구 = [
  '가공하지 않은 사실만 놓' + '습니다',
  '가공하지 않은 사실만 놓' + '는다',
  ㄱ + '이렇게 하세요' + ㄴ + '가 아니라 ' + ㄱ + 'N명 중 M명이 그렇게 했다' + ㄴ + '입니다',
  ㄱ + '이렇게 하세요' + ㄴ + '가 아니라 ' + ㄱ + 'N명 중 M명이 그렇게 했다' + ㄴ,
  '평균이 아니라 분' + '포를 보여 줍니다',
  '평균이 아니라 분' + '포',
  '이것은 통계이지 당신이 아닙' + '니다',
  '측정하지 못한 것은 못 했다고 적' + '습니다',
  '측정하지 못한 것은 못 했다고 적' + '는다',
  '0 으로 채우지 않' + '습니다',
  '0으로 채우지 않' + '습니다',
  '0 으로 채우지 않' + '는다',
  '0으로 채우지 않' + '는다',
  ㄱ + '미확인' + ㄴ + '을 숨기지 않' + '습니다',
  ㄱ + '미확인' + ㄴ + '을 숨기지 않' + '는다',
];

/* ③ 빈 글자가 섞이면 멈춘다 — 섞인 채 돌면 글이 통째로 망가진다 */
if (지울문구.some((s) => !String(s).trim())) {
  console.error('🔴 지울 문구 목록에 빈 글자가 섞였다 — 돌지 않는다');
  process.exit(1);
}

/**
 * 한 줄에서 그 문구를 지운다. **자리만 비우고 다른 말을 넣지 않는다.**
 * ⚠ 속성 값으로 쓰인 자리(`꼬리="…"`)는 속성째 지운다 — 빈 꼬리가 남으면 빈 칸이 그려진다.
 */
export function 줄에서지운다(줄) {
  let s = String(줄 ?? '');
  for (const 말 of 지울문구) {
    if (!s.includes(말)) continue;
    /* ① 속성 값이면 속성째 — 꼬리="…" · 꼬리={'…'} */
    const 속성 = new RegExp('\\s+[A-Za-z가-힣_]+=(?:"[^"]*' + 울타리(말) + '[^"]*"|\\{\\s*[\'"][^\'"]*'
      + 울타리(말) + '[^\'"]*[\'"]\\s*\\})', 'g');
    s = s.replace(속성, '');
    if (!s.includes(말)) continue;
    /* ② 본문이면 문구와 바로 뒤 마침표만 — 태그는 남긴다 */
    s = s.split(말 + '.').join('').split(말).join('');
  }
  return s;
}

function 울타리(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

/** 지운 뒤 빈 껍데기만 남았나 — 그런 줄은 통째로 버린다 */
export function 빈껍데기인가(줄) {
  const s = String(줄 ?? '').trim();
  if (!s) return false;                       /* 원래 빈 줄은 그대로 둔다 */
  if (/^⚠\s*<strong>\s*<\/strong>\s*(\{'\s*'\})?$/.test(s)) return true;
  if (/^<strong>\s*<\/strong>\s*(\{'\s*'\})?$/.test(s)) return true;
  if (/^⚠\s*(\{'\s*'\})?$/.test(s)) return true;
  return false;
}

/* ── 자체 검사 ───────────────────────────────────────────────────────── */
if (process.argv.includes('--자체검사')) {
  let 통 = 0; let 탈 = 0;
  const 본다 = (이름, 참) => { if (참) { 통 += 1; console.log('  ✅ ' + 이름); } else { 탈 += 1; console.log('  🔴 ' + 이름); } };
  본다('① 속성째 지운다',
    줄에서지운다('<글상자 더보기={{ href: "/a" }} />')
      === '<글상자 더보기={{ href: "/a" }} />');
  본다('② 본문에서는 문구와 마침표만 지우고 태그는 남긴다',
    줄에서지운다('⚠ <strong></strong> 뒤 문장은 남는다')
      === '⚠ <strong></strong> 뒤 문장은 남는다');
  본다('🔴 ③ 지운 자리에 다른 말을 넣지 않는다',
    !/통계|당신|분포|미확인/.test(줄에서지운다('꼬리=""')));
  본다('④ 없는 줄은 그대로 둔다',
    줄에서지운다('평범한 줄입니다') === '평범한 줄입니다');
  본다('🔴 ⑤ 「미확인」 낱말 자체는 안 지운다 — 자료 값이다',
    줄에서지운다('성별: 미확인') === '성별: 미확인'
    && 줄에서지운다('{"상태":"미확인"}') === '{"상태":"미확인"}');
  본다('⑥ 「미확인을 숨기지 않는다」 문장은 지운다',
    !줄에서지운다(ㄱ + '미확인' + ㄴ + '을 숨기지 않' + '는다.').includes('숨기지'));
  본다('🔴 ⑦ 0 으로 채우는 코드는 안 건드린다 — 문장만 지운다',
    줄에서지운다('const a = arr.fill(0);') === 'const a = arr.fill(0);');
  본다('⑧ ' + ㄱ + '0 으로 채우지 않' + '는다' + ㄴ + ' 문장은 지운다',
    !줄에서지운다('0 으로 채우지 않' + '는다.').includes('채우지'));
  본다('⑨ 빈 껍데기를 알아본다',
    빈껍데기인가('⚠ <strong></strong>') && 빈껍데기인가("⚠ <strong></strong>{' '}"));
  본다('⛔ ⑩ 글이 있는 줄을 빈 껍데기로 보지 않는다',
    !빈껍데기인가('⚠ <strong>남은 글</strong>') && !빈껍데기인가('보통 줄'));
  console.log(탈 ? '\n🔴 자체 검사 ' + 탈 + '건 탈' : '\n✅ 자체 검사 ' + 통 + ' 통과');
  process.exit(탈 ? 1 : 0);
}

/* ── 훑는다 ───────────────────────────────────────────────────────────── */
const 인자 = process.argv.slice(2);
const 지울까 = 인자.includes('--지운다');
const 전부 = 인자.includes('--전부');

const 볼곳 = 전부
  ? [path.join(뿌리, 'src'), path.join(뿌리, 'public'), path.join(뿌리, 'docs'),
    path.join(뿌리, 'scripts'), path.join(klifemap뿌리, 'public'), path.join(klifemap뿌리, 'docs')]
  : [path.join(뿌리, 'src'), path.join(뿌리, 'public'), path.join(klifemap뿌리, 'public')];

const 건너뛸방 = ['node_modules', '.git', 'dist', 'out', 'tmp', 'archive', '.astro', '보관'];
const 볼확장 = /\.(md|txt|html|js|mjs|astro|css)$/i;   /* ⛔ json·tsv 는 자료다 — 안 건드린다 */

const 모음 = [];
function 간다(곳) {
  let 것들; try { 것들 = fs.readdirSync(곳, { withFileTypes: true }); } catch (e) { return; }
  for (const e of 것들) {
    const 길 = path.join(곳, e.name);
    if (e.isDirectory()) { if (!건너뛸방.includes(e.name)) 간다(길); continue; }
    /* ② 자기 자신은 건너뛴다 — 2026-11-22 에 자기 목록을 통째로 지웠다 */
    if (path.resolve(길) === path.resolve(fileURLToPath(import.meta.url))) continue;
    if (볼확장.test(e.name)) 모음.push(길);
  }
}
for (const 곳 of 볼곳) 간다(곳);

let 고친파일 = 0; let 고친줄 = 0; let 버린줄 = 0;
for (const f of 모음) {
  let 글; try { 글 = fs.readFileSync(f, 'utf8'); } catch (e) { continue; }
  if (!지울문구.some((말) => 글.includes(말))) continue;
  const 줄바꿈 = 글.includes('\r\n') ? '\r\n' : '\n';
  const 줄들 = 글.split(/\r?\n/);
  const 새줄들 = [];
  let 이파일줄 = 0; let 이파일버림 = 0;
  for (const 줄 of 줄들) {
    const 새 = 줄에서지운다(줄);
    if (새 !== 줄) {
      이파일줄 += 1;
      if (빈껍데기인가(새)) { 이파일버림 += 1; continue; }
    }
    새줄들.push(새);
  }
  if (!이파일줄) continue;
  고친파일 += 1; 고친줄 += 이파일줄; 버린줄 += 이파일버림;
  const 짧게 = f.replace(/^C:\\Users\\User\\Documents\\GitHub\\/, '').replace(/\\/g, '/');
  if (!지울까) console.log('   ' + String(이파일줄).padStart(3) + '줄  ' + 짧게);
  else fs.writeFileSync(f, 새줄들.join(줄바꿈), 'utf8');
}

console.log('\n■ ' + (지울까 ? '지웠다' : '잰다(--지운다 를 안 줬다)')
  + ' — 파일 ' + 고친파일 + '개 · 줄 ' + 고친줄 + '개'
  + (버린줄 ? ' · 빈 껍데기가 되어 버린 줄 ' + 버린줄 + '개' : ''));
console.log('   본 곳 — ' + (전부 ? 'src·public·docs·scripts (두 저장소)' : 'src·public (손님 화면)'));

/* 🔴🔴 [2026-11-22 · 사장님] 「**다시 말하게 하지 마라**」
   ⇒ `--막는다` 를 주면 한 곳이라도 남아 있을 때 **끝값 1** 을 낸다.
     커밋 앞에 걸어 두면 그 말이 다시 들어오는 순간 커밋이 선다. */
if (인자.includes('--막는다') && 고친파일) {
  console.log('\n🔴 사장님이 지우라 하신 문구가 ' + 고친파일 + '개 파일에 다시 들어왔다');
  console.log('   사장님 2026-11-22 — 「내가 쓴 적 없다. 너희가 지은 말이다. 모든 곳에서 삭제해라. 다시 말하게 하지 마라」');
  console.log('   ⇒ 지우려면  node scripts/지운다-지어낸문구.mjs --지운다 --전부');
  process.exit(1);
}
