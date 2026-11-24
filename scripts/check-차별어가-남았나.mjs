#!/usr/bin/env node
/**
 * check-차별어가-남았나.mjs — **사람을 가리키는 말을 사물에 갖다 쓴 자리를 날마다 찾는다.**
 *
 * ── 🔴🔴 왜 (2026-11-25 · 5번) ──────────────────────────────────────────
 * 2026-11-22 에 사장님이 못 박으셨다 —
 *   「미쳤나. 고아는? 이런말을 써. 어디서 이런 폭언을 쓰나」
 *   「사람에게도 고아라고 하지마. 차별적 단어야」
 * 그날 저장소 287곳을 고치고 금지어 목록에 「차별어」 갈래를 세웠다.
 * 그런데 **사흘 뒤 2026-11-25 에 사장님이 다시 짚으셨다** — 「고아에>>고아 쓰지말라니꺼」.
 *
 * ```
 *   어디에 남아 있었나                     몇 곳
 *   docs/세션간-메모.md                      2    ← 내가 11-25 새벽에 또 적었다
 *   docs/소통-요약/.본자리.json              1    ← 메모를 베껴 간 곳
 *   tmp/답.md                                1
 *   메모리 파일 5개                          7
 * ```
 * [왜 또 났나] 금지어 목록도 검사도 멀쩡했다. **돌린 자리가 없었을 뿐이다** —
 *   기사·메일·지면에는 돌리면서 **내가 쓰는 문서와 메모**에는 한 번도 안 돌렸다.
 *   2026-11-15 의 「사장님이 읽으시는 답에는 한 번도 안 돌렸다」와 같은 자리의 재발이다.
 * [고친 꼴] 하나를 고치면 인용해 간 곳까지 따라간다(회사 철학 ⑤) —
 *   메모를 고쳤으면 그 메모를 베껴 간 소통 요약까지 간다. 오늘 실제로 그랬다.
 *
 * ⇒ 이 검사를 두 시간 점검에 세운다. 말로 된 규칙은 잊히고, 검사는 안 잊는다.
 *
 * ⛔ 거짓 빨강을 만들지 않는다 — 걸러 내는 자리가 셋이다
 *   ① 사장님 말씀 원문 인용 (낫표 안) — `재기` 가 애초에 세지 않는다
 *   ② 지명·사람 이름 (고아읍·고아성·고아리) — 금지어 목록의 문맥빼기가 거른다
 *   ③ 바깥에서 받은 자료 원문 (archive/raw) — 우리가 쓴 말이 아니다
 *
 * 쓰는 법
 *   node scripts/check-차별어가-남았나.mjs
 *   node scripts/check-차별어가-남았나.mjs --메모리도본다
 *   node scripts/check-차별어가-남았나.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 금지어모듈 = path.join(뿌리, 'scripts', '순한글-금지어.mjs');
const 메모리방 = 'C:/Users/USER/.claude-u5/projects/C--Users-User-OneDrive-Desktop/memory';

const 볼확장 = /\.(astro|ts|tsx|mjs|js|md|mdx|html|txt|json|xml)$/;
/* ⛔ 안 보는 곳 — 전부 「우리가 쓴 말이 아닌 것」이다
   · archive/raw  바깥에서 받은 자료 원문. 고칠 수 없고 고쳐서도 안 된다
   · 순한글-금지어.mjs  금지어의 «정의»가 들어 있다. 여기서 잡으면 목록이 제 발에 걸린다
   · 이 파일 자신   같은 까닭 */
const 안볼것 = [
  /* ⚠ 맨 앞에 와도 잡는다 — `dist/index.html` 은 앞에 구분자가 없다.
     처음에 /[\\/]dist[\\/]/ 로 적어 자가시험이 바로 잡아냈다 */
  /node_modules/, /(^|[\\/])dist[\\/]/, /(^|[\\/])\.git[\\/]/,
  /archive[\\/]raw[\\/]/,
  /순한글-금지어\.mjs$/,
  /check-차별어가-남았나\.mjs$/,
];

/** 이 길을 보나 */
export function 보나(상대경로) {
  if (typeof 상대경로 !== 'string' || !상대경로) return false;
  if (!볼확장.test(상대경로)) return false;
  return !안볼것.some((re) => re.test(상대경로));
}

/** 한 글에서 차별어 자리를 찾는다. ⛔ 못 읽으면 null — 「없다」가 아니다 */
export function 차별어찾기(글, 재기) {
  if (typeof 글 !== 'string') return null;
  if (typeof 재기 !== 'function') return null;
  let 걸린것;
  try { 걸린것 = 재기(글, { 주석도본다: true, 샵은주석이아니다: true }); } catch { return null; }
  if (!Array.isArray(걸린것)) return null;
  return 걸린것.filter((x) => x && x.갈래 === '차별어');
}

/** 어느 줄에 있나 — 사람이 바로 열어 고칠 수 있게 줄 번호를 준다.
 *
 * 🔴 [2026-11-25 · 5번] **보여 주는 줄이 실제 걸린 자리와 어긋났다.**
 *   `재기` 는 낫표 안과 지명을 세지 않는데, 이 함수는 그냥 문자열로 찾아
 *   「2곳」이라 세어 놓고 **고칠 수 없는 줄 세 개를 보여 줬다.**
 *   ⛔ 엉뚱한 줄을 보여 주면 사람이 거기를 고치고, 진짜 자리는 그대로 남는다.
 *   ⇒ 여기도 같은 거르기를 한다 — 낫표 안과 문맥빼기에 걸리는 자리는 안 보여 준다. */
export function 걸린줄찾기(글, 말, 문맥빼기) {
  if (typeof 글 !== 'string' || typeof 말 !== 'string' || !말) return [];
  const 줄들 = 글.split(/\r?\n/);
  const 것 = [];
  for (let i = 0; i < 줄들.length; i += 1) {
    /* 낫표 안은 같은 길이로 덮는다 — 자리가 어긋나지 않게(재기와 같은 꼴) */
    const 덮은줄 = 줄들[i].replace(/[「『][^」』\n]{0,200}[」』]/g, (m) => '\u0001'.repeat(m.length));
    let j = -1; let 산자리 = false;
    while ((j = 덮은줄.indexOf(말, j + 1)) !== -1) {
      if (문맥빼기 instanceof RegExp
        && 문맥빼기.test(덮은줄.slice(Math.max(0, j - 60), j + 20))) continue;
      산자리 = true;
      break;
    }
    if (산자리) 것.push({ 줄번호: i + 1, 줄: 줄들[i].trim().slice(0, 100) });
  }
  return 것;
}

function 훑는다(디렉터리, 모은다, 재기, 기준) {
  let 것들;
  try { 것들 = fs.readdirSync(디렉터리, { withFileTypes: true }); } catch { return; }
  for (const e of 것들) {
    if (e.name === 'node_modules' || e.name === 'dist' || e.name.startsWith('.git')) continue;
    const p = path.join(디렉터리, e.name);
    const 상대 = path.relative(기준, p);
    if (e.isDirectory()) { 훑는다(p, 모은다, 재기, 기준); continue; }
    if (!보나(상대)) continue;
    let 글;
    try { 글 = fs.readFileSync(p, 'utf8'); } catch { continue; }
    const 것 = 차별어찾기(글, 재기);
    if (것 && 것.length) 모은다.push({ 파일: 상대, 것, 글 });
  }
}

/* ── 자가시험 ────────────────────────────────────────────────── */
if (process.argv.includes('--자가시험') || process.argv.includes('--selftest')) {
  const r = [];
  const 본다 = (이름, 참) => r.push({ 이름, 참: !!참 });

  본다('볼 확장자를 본다', 보나('docs/메모.md') && 보나('src/x.astro') && 보나('a/b.json'));
  본다('⛔ 다른 확장자는 안 본다', !보나('x.png') && !보나('x.lock'));
  본다('⛔ 바깥 자료 원문은 안 본다 — 고칠 수 없고 고쳐서도 안 된다',
    !보나('archive/raw/neis/school-info.json')
    && !보나('archive\\raw\\neis\\school-info.json'));
  본다('⛔ 금지어 목록 자신은 안 본다 — 제 발에 걸린다',
    !보나('scripts/순한글-금지어.mjs'));
  본다('⛔ 이 검사 자신도 안 본다', !보나('scripts/check-차별어가-남았나.mjs'));
  본다('⛔ dist 는 안 본다', !보나('dist/index.html'));
  본다('⛔ 빈 것에 안 터진다', !보나('') && !보나(null));
  본다('줄 번호를 준다',
    걸린줄찾기('첫 줄\n여기 있다\n셋째', '여기')[0].줄번호 === 2);
  본다('여러 줄을 다 준다', 걸린줄찾기('가\n가\n나', '가').length === 2);
  본다('⛔ 빈 것에 안 터진다 (줄찾기)',
    걸린줄찾기(null, '가').length === 0 && 걸린줄찾기('가', '').length === 0);
  본다('🔴 보여 주는 줄에서 낫표 안은 뺀다 — 고칠 수 없는 줄을 가리키면 진짜가 남는다',
    걸린줄찾기('사장님 — 「고아라고 하지마」\n우리 글에 고아가 있다', '고아').length === 1
    && 걸린줄찾기('사장님 — 「고아라고 하지마」\n우리 글에 고아가 있다', '고아')[0].줄번호 === 2);
  본다('🔴 보여 주는 줄에서 지명도 뺀다',
    걸린줄찾기('구미시 고아읍 학교', '고아', /고아읍/).length === 0);
  본다('⛔ 문맥빼기를 안 줘도 돈다', 걸린줄찾기('고아', '고아').length === 1);
  본다('⛔ 재기가 없으면 null — 「없다」가 아니다',
    차별어찾기('글', null) === null && 차별어찾기(null, () => []) === null);

  if (fs.existsSync(금지어모듈)) {
    const { 재기 } = await import(pathToFileURL(금지어모듈).href);
    본다('🔴 11-25 에 내가 적은 바로 그 줄을 잡는다',
      (차별어찾기('self-saju 31장은 전부 고아', 재기) || []).length === 1);
    본다('✅ 고친 말은 통과시킨다',
      (차별어찾기('self-saju 31장은 전부 고립', 재기) || []).length === 0);
    본다('✅ 사장님 말씀 원문 인용은 통과시킨다',
      (차별어찾기('사장님 — 「사람에게도 고아라고 하지마」', 재기) || []).length === 0);
    본다('✅ 지명·사람 이름은 통과시킨다 — 자료이지 우리 말이 아니다',
      (차별어찾기('구미시 고아읍', 재기) || []).length === 0
      && (차별어찾기('배우 고아성', 재기) || []).length === 0);
    본다('✅ 코드 주석도 본다 — public/ 은 주석까지 브라우저로 간다',
      (차별어찾기('  /* 고아 지면을 센다 */', 재기) || []).length === 1);
    본다('✅ 샵으로 시작하는 제목줄도 본다 — 가장 먼저 읽히는 줄이다',
      (차별어찾기('# 고아 지면 보고서', 재기) || []).length === 1);
    본다('⛔ 다른 갈래는 섞어 내지 않는다 — 거짓 빨강은 멈춤이다',
      (차별어찾기('단추를 눌러 값 없이 쓰는 법', 재기) || []).length === 0);
  } else {
    본다('⚠ 금지어 목록을 못 찾았다 — 그 시험은 건너뛴다', true);
  }

  let 빨강 = 0;
  console.log('■ 차별어가 남았나 — 자가시험');
  for (const x of r) { if (!x.참) 빨강 += 1; console.log(`  ${x.참 ? '✅' : '🔴'} ${x.이름}`); }
  console.log(빨강 ? `🔴 실패 ${빨강}개` : `✅ ${r.length}가지 다 통과`);
  process.exit(빨강 ? 1 : 0);
}

/* ── 실제로 훑는다 ──────────────────────────────────────────── */
if (!fs.existsSync(금지어모듈)) {
  /* ⛔ 「못 쟀다」와 「없다」를 가른다(메모리 — 「검사묶음은 끝까지 돌려야 검사다」) */
  console.log('⚠ 금지어 목록을 못 찾았다 — 재지 못했다. 「없다」가 아니다');
  process.exit(1);
}
const { 재기 } = await import(pathToFileURL(금지어모듈).href);

const 모은다 = [];
for (const d of ['src', 'public', 'scripts', 'docs', 'tmp']) {
  const p = path.join(뿌리, d);
  if (fs.existsSync(p)) 훑는다(p, 모은다, 재기, 뿌리);
}
/* 🔴 메모리는 매 세션 내 맥락에 올라온다 — 거기 남으면 내가 그 말을 다시 배운다.
   오늘 실제로 메모리 파일 5개에 7곳이 남아 있었다. */
const 메모리본다 = process.argv.includes('--메모리도본다') || !process.argv.includes('--저장소만');
if (메모리본다 && fs.existsSync(메모리방)) 훑는다(메모리방, 모은다, 재기, 메모리방);

if (!모은다.length) {
  console.log('✅ 차별어가 한 곳도 없다 — src·public·scripts·docs·tmp 와 메모리를 다 봤다');
  process.exit(0);
}

const 곳 = 모은다.reduce((a, x) => a + x.것.reduce((b, y) => b + y.수, 0), 0);
console.log(`🔴 차별어 ${곳}곳 · 파일 ${모은다.length}개 — 사람을 가리키는 말을 사물에 쓰고 있다`);
console.log('   사장님 2026-11-22 — 「사람에게도 고아라고 하지마. 차별적 단어야」');
for (const x of 모은다.slice(0, 20)) {
  console.log(`   ⛔ ${x.파일}`);
  for (const y of x.것) {
    console.log(`      「${y.말}」 ${y.수}곳 → 「${y.대신}」`);
    for (const z of 걸린줄찾기(x.글, y.말, y.문맥빼기).slice(0, 3)) {
      console.log(`         ${z.줄번호}줄  ${z.줄}`);
    }
  }
}
if (모은다.length > 20) console.log(`   … 그 밖에 파일 ${모은다.length - 20}개`);
console.log('   ✅ 고치는 법 — 대체어로 바꾸고, «그것을 베껴 간 곳»까지 따라간다(회사 철학 ⑤)');
process.exit(1);
