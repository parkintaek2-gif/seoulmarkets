#!/usr/bin/env node
/**
 * check-kcw-page-identity.mjs — **있는 지면이 «딴 지면»으로 바뀐 것을 잡는다**
 * ─────────────────────────────────────────────────────────────────────────────
 * [왜 있나 · 2026-09-08 5번]
 *   어젯밤 나는 새 자료를 만들고 «주소를 짐작해서» 지면을 새로 썼다.
 *   `/member-vs-group` 은 **2026-08-20 부터 있던 지면**이었고, Write 는 덮어쓴다.
 *   ⇒ 253줄이 날아갔다 (223 insertions / 187 deletions).
 *
 *   🔴 **그것을 잡은 것은 자가 아니었다.** 빌드가 쓴 `wikitip-headlines.json` 의 diff 를
 *     눈으로 보다가, 옛 값에 그 주소가 «다른 제목»으로 있는 것을 우연히 봤다.
 *   ⭐ 우연히 잡힌 것은 다음에는 안 잡힌다. 그래서 그 우연을 **자로 만든다.**
 *     사장님 강령: 「규칙은 문장이 아니라 «검사»로 둔다. 사람이 기억해서 지키는 구조를
 *     만들지 않는다」
 *
 * [무엇을 견주나]
 *   `src/data/wikitip-headlines.json` 은 **지면마다 첫 머리글(h1)** 을 담는다(132장).
 *   그 파일의 «git 에 커밋된 판»과 «방금 빌드가 쓴 판»을 나란히 놓는다.
 *   ```
 *   같은 주소인데 머리글이 통째로 달라졌다  → 🔴 딴 지면이 됐다. 의도한 것인가
 *   있던 주소가 사라졌다                  → 🔴 지면을 지웠거나 주소를 바꿨다
 *   새 주소가 생겼다                      → ⬜ 알림만. 새 지면을 낸 것이면 맞다
 *   ```
 *
 * ⛔ 이 자는 «막지» 않는다. 지면을 통째로 다시 쓰는 것이 옳은 날도 있다.
 *   자가 할 일은 **「네가 지금 딴 지면을 만들었다」고 눈앞에 대는 것**까지다.
 * ⛔ 빌드를 안 돌렸으면 「깨끗하다」가 아니라 «못 쟀다»고 낸다 — 두 판이 같은 판이면
 *   견줄 것이 없다. 
 *
 * [쓰는 법]
 *   node scripts/check-kcw-page-identity.mjs --시험만   판정 논리만
 *   npm run build && node scripts/check-kcw-page-identity.mjs
 */

const 아는깃발 = new Set(['--시험만']);
{
  const 모르는것 = process.argv.slice(2).filter((a) => a.startsWith('--') && !아는깃발.has(a));
  if (모르는것.length) {
    console.error(`⛔ 모르는 깃발입니다: ${모르는것.join(' ')} · 아는 것: ${[...아는깃발].join(' · ')}`);
    process.exit(2);
  }
}

/** 견주기 좋게 다듬는다 — 대소문자·기호·잔말을 떼고 낱말만 남긴다 */
export function 낱말들(글) {
  if (typeof 글 !== 'string') return null;
  const 씻김 = 글.toLowerCase()
    .replace(/[‘’“”]/g, "'")
    .replace(/[^a-z0-9가-힣']+/g, ' ')
    .trim();
  if (!씻김) return [];
  const 잔말 = new Set(['a', 'an', 'the', 'of', 'in', 'on', 'at', 'to', 'and', 'or', 'is', 'are',
    'was', 'were', 'it', 'its', 'do', 'does', 'did', 'not', 'for', 'by', 'with', 'that', 'this']);
  return 씻김.split(' ').filter((w) => w && !잔말.has(w));
}

/**
 * 두 머리글이 얼마나 닮았나 (0~1).
 * ⚠ 자캬드(교집합/합집합)로 센다 — 낱말 순서가 바뀐 것을 「딴 지면」으로 안 본다.
 * ⛔ 한쪽이라도 글이 아니면 null 이다. 0 으로 안 채운다 — 0 은 「전혀 안 닮았다」는 뜻이라
 *   「못 읽었다」와 섞이면 안 된다.
 */
export function 닮음(앞, 뒤) {
  const a = 낱말들(앞); const b = 낱말들(뒤);
  if (a === null || b === null) return null;
  if (!a.length && !b.length) return 1;
  if (!a.length || !b.length) return 0;
  const A = new Set(a); const B = new Set(b);
  let 겹침 = 0;
  for (const w of A) if (B.has(w)) 겹침++;
  return 겹침 / (A.size + B.size - 겹침);
}

/**
 * 옛 표와 새 표를 견준다.
 * @param 선 이 아래로 닮으면 「딴 지면이 됐다」로 본다. 0.4 로 둔다 —
 *   같은 지면을 고쳐 쓰면 낱말 절반쯤은 남는다. 어젯밤 실제 값은 0 이었다.
 */
export function 견주기(옛, 새, 선 = 0.4) {
  if (!옛 || !새 || typeof 옛 !== 'object' || typeof 새 !== 'object') {
    return { 못쟀다: '견줄 표가 없다' };
  }
  const 바뀜 = []; const 사라짐 = []; const 새로 = [];
  for (const [길, 옛글] of Object.entries(옛)) {
    if (!(길 in 새)) { 사라짐.push({ 길, 옛글 }); continue; }
    const d = 닮음(옛글, 새[길]);
    if (d === null) continue;                       // 못 읽은 것은 넘긴다. 0 으로 안 센다
    if (d < 선) 바뀜.push({ 길, 옛글, 새글: 새[길], 닮음: Number(d.toFixed(3)) });
  }
  for (const 길 of Object.keys(새)) if (!(길 in 옛)) 새로.push({ 길, 새글: 새[길] });
  바뀜.sort((a, b) => a.닮음 - b.닮음);
  return { 바뀜, 사라짐, 새로 };
}

/* ── 자가시험 ─────────────────────────────────────────────────────────── */
function 시험() {
  const 것 = [];
  const 본다 = (이름, 실제, 기대) => 것.push([이름, JSON.stringify(실제), JSON.stringify(기대)]);

  본다('같은 글은 1', 닮음('Hello world', 'Hello world'), 1);
  본다('대소문자·기호를 무시한다', 닮음('Hello, World!', 'hello world'), 1);
  본다('잔말을 떼고 본다', 닮음('The cat in the hat', 'cat hat'), 1);
  본다('낱말 순서가 바뀐 것은 같은 것으로 본다', 닮음('cat hat', 'hat cat'), 1);
  본다('아예 다르면 0', 닮음('cat hat', 'dog shoe'), 0);
  본다('⛔ 글이 아니면 null — 0 으로 안 채운다', 닮음(null, 'cat'), null);
  본다('둘 다 빈 글이면 1', 닮음('', ''), 1);
  본다('한쪽만 비면 0', 닮음('', 'cat'), 0);
  본다('우리말도 센다', 닮음('문의 지면', '문의 지면'), 1);

  /* ⭐ 어젯밤 실제로 일어난 것 — 이 자가 그것을 잡나 */
  const 옛 = {
    '/member-vs-group': "V and Jungkook are read less than BTS. Jay Park and Lee Hye-ri are read more than 2PM and Girl's Day",
    '/peak-month': 'January is when a K-pop act is read most. September is when it is not',
    '/about': 'About & methodology',
  };
  const 새 = {
    '/member-vs-group': 'For most Korean acts, fans read the members — not the band',
    '/peak-month': 'January is when a K-pop act is read most. September is when it is not',
    '/about': 'About & methodology',
    '/new-page': 'Something brand new',
  };
  const r = 견주기(옛, 새);
  본다('⭐ 어젯밤의 덮어쓰기를 잡는다', r.바뀜.length, 1);
  본다('⭐ 잡은 것이 그 주소다', r.바뀜[0].길, '/member-vs-group');
  본다('안 바뀐 지면은 안 잡는다', r.바뀜.some((x) => x.길 === '/peak-month'), false);
  본다('새 주소는 «바뀜»이 아니라 «새로»다', r.새로.map((x) => x.길), ['/new-page']);
  본다('사라진 것은 없다', r.사라짐.length, 0);

  const r2 = 견주기({ '/gone': 'Was here' }, {});
  본다('사라진 주소를 잡는다', r2.사라짐.map((x) => x.길), ['/gone']);

  /* 같은 지면을 «고쳐 쓴» 것은 안 잡아야 한다 — 낱말이 많이 남는다 */
  const r3 = 견주기(
    { '/x': 'Three months sit more than two standard deviations from expectation' },
    { '/x': 'Five of the twelve months sit more than two standard deviations from expectation' },
  );
  본다('⭐ 수만 고친 것은 «딴 지면»으로 안 본다', r3.바뀜.length, 0);

  본다('⛔ 표가 없으면 못쟀다', !!견주기(null, {}).못쟀다, true);
  본다('⛔ 표가 아니면 못쟀다', !!견주기('글자', {}).못쟀다, true);

  let 흠 = 0;
  for (const [이름, 실제, 기대] of 것) {
    if (실제 !== 기대) { 흠++; console.log(`  ⛔ ${이름} — 나온 것 ${실제} · 기대 ${기대}`); }
  }
  console.log(흠 ? `⛔ 자가시험 ${것.length}개 중 ${흠}개 실패` : `✅ 자가시험 ${것.length}개 통과`);
  return 흠;
}

/* ── 실제로 견준다 ─────────────────────────────────────────────────────── */
async function 주된일() {
  if (시험()) process.exit(1);
  if (process.argv.includes('--시험만')) return;

  const fs = await import('node:fs');
  const { execFileSync } = await import('node:child_process');
  const 길 = 'src/data/wikitip-headlines.json';

  let 새판;
  try { 새판 = JSON.parse(fs.readFileSync(길, 'utf8')); }
  catch (e) { console.log('⛔ 지금 판을 못 읽었다 —', String(e.message).slice(0, 60)); process.exit(1); }

  let 옛판;
  try { 옛판 = JSON.parse(execFileSync('git', ['show', `HEAD:${길}`], { encoding: 'utf8', timeout: 60000 })); }
  catch (e) { console.log('⛔ git 에 커밋된 판을 못 읽었다 — 못 쟀다'); process.exit(1); }

  console.log(`커밋된 판 ${옛판.generated} · 지금 판 ${새판.generated}`);
  if (옛판.generated === 새판.generated) {
    console.log('⬜ **못 쟀다** — 두 판이 같은 판이다. `npm run build` 를 먼저 돌린 뒤 다시 재십시오.');
    console.log('   ⛔ 이것을 「깨끗하다」로 읽지 않는다. 견줄 것이 없었을 뿐이다.');
    process.exit(0);
  }

  const r = 견주기(옛판.headlines, 새판.headlines);
  if (r.못쟀다) { console.log('⛔ 못 쟀다 —', r.못쟀다); process.exit(1); }

  if (r.바뀜.length) {
    console.log(`\n🔴 **같은 주소인데 머리글이 통째로 달라진 지면 ${r.바뀜.length}장**`);
    console.log('   ⚠ 있는 지면을 덮어쓴 것이 아닌지 보십시오 — 2026-09-08 에 그 일이 있었습니다.');
    for (const x of r.바뀜) {
      console.log(`\n   ${x.길}   (닮음 ${x.닮음})`);
      console.log(`     옛: ${x.옛글}`);
      console.log(`     새: ${x.새글}`);
      console.log(`     ⇒ 확인:  git log --oneline -3 -- src/pages/wikitip${x.길}.astro`);
    }
  }
  if (r.사라짐.length) {
    console.log(`\n🔴 **있던 주소가 사라진 것 ${r.사라짐.length}장** — 지웠거나 주소를 바꿨습니다`);
    for (const x of r.사라짐) console.log(`   ${x.길}   (옛 머리글: ${x.옛글})`);
  }
  if (r.새로.length) {
    console.log(`\n⬜ 새로 생긴 주소 ${r.새로.length}장 — 새 지면을 낸 것이면 맞습니다`);
    for (const x of r.새로) console.log(`   ${x.길}   ${x.새글}`);
  }
  if (!r.바뀜.length && !r.사라짐.length) {
    console.log(`\n✅ 통째로 바뀐 지면 0장 · 사라진 지면 0장 (견준 지면 ${Object.keys(옛판.headlines).length}장)`);
  }
  console.log('\n⛔ 이 자는 막지 않습니다. 지면을 통째로 다시 쓰는 것이 옳은 날도 있습니다 —');
  console.log('   자가 할 일은 「네가 지금 딴 지면을 만들었다」를 눈앞에 대는 것까지입니다.');
}

/* 🔴 [2026-09-08] 처음엔 이 줄이 그냥 `await 주된일()` 이었다. 그러면 **다른 자가 이 파일의
   순수 함수를 import 하는 순간 시험이 돌고 process.exit 가 불린다** — 부르는 쪽이 통째로 죽는다.
   오늘 실제로 그렇게 한 번 막혔다. 이 저장소의 다른 자들이 쓰는 본을 따른다. */
const 내가직접 = import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`
  || import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop() ?? '');
if (내가직접) await 주된일();
