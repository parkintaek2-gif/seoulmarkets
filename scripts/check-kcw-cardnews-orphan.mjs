#!/usr/bin/env node
/**
 * check-kcw-cardnews-orphan.mjs — **구운 카드가 어느 지면에도 안 걸려 있나.**
 * ────────────────────────────────────────────────────────────────────────────
 * [🔴 왜 만드나 — 같은 결함이 «두 번째»다]
 *
 *   2026-08-14  카드 15장이 서버에 있는데 사이트맵에도 어느 지면에도 안 걸려 있었다.
 *               `KcwCardnews.astro` 머리글에 그때 적어 두었다 — 「**만든 값이 0이었다**」.
 *   2026-09-03  또 그랬다. 벌 셋(counter · daystem · school) 15장이 떠 있었다.
 *               ⛔ 더 나쁜 것은, 그날 08:56 에 내가 그 가운데 한 벌을 구우면서
 *                  커밋 제목을 **「오늘 하루 몫을 채웠다」**로 달았다는 점이다.
 *                  «구운 것»을 «낸 것»이라고 부른 것이다.
 *
 *   ⭐ 사장님 지시(2026-08-13): 「이건 **외부유입용** 콘텐트 역할도 하고, 우리를 알리는 거니까」
 *      → 그러면 사람이 **집어 갈 수 있어야** 한다. **서버에 있는 것과 걸린 것은 다르다.**
 *   ⭐ 우리 강령: 「규칙은 문장이 아니라 **검사**로 둔다」. 8/14 에 문장으로 뒀더니 9/3 에 또 났다.
 *
 * [무엇을 재나 — 세 방향을 다 본다]
 *   1. 벌은 있는데 부르는 지면이 없다      «고아» — 만든 값이 0이다
 *   2. 지면은 부르는데 벌이 없다            «깨짐» — 빈 상자가 뜬다
 *   3. 지면이 말한 장수와 파일 수가 다르다   «어긋남» — 없는 그림을 가리킨다
 *
 * [⛔ 헛경보를 막으려고 둔 것]
 *   · 기사 카드는 **꼴이 다르다**(`<벌>-sq-1.png` 평평하게). 그것은
 *     `build-kcw-cardnews-index.mjs` 가 파일을 세어 색인을 만들고 기사 템플릿이 자동으로 싣는다.
 *     ⛔ 그러니 이 자는 **폴더 꼴만** 본다. 평평한 것을 고아라고 부르지 않는다
 *   · `public/wikitip/cardnews/` 자체가 없으면 「없다」가 아니라 **「못 쟀다」**로 적고 멈춘다
 *   ⭐ 잘못 잡는 자는 꺼진다. 꺼진 자는 없는 자다
 *
 * [쓰는 법]
 *   node scripts/check-kcw-cardnews-orphan.mjs
 *   node scripts/check-kcw-cardnews-orphan.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 카드방 = path.join(뿌리, 'public', 'wikitip', 'cardnews');
const 지면방 = path.join(뿌리, 'src', 'pages', 'wikitip');

/**
 * 지면 글에서 `<KcwCardnews set="X" count={N} />` 를 뜯는다.
 * ⚠ 인자가 «줄을 넘어» 적힌 곳이 있다(person/index.astro). 그래서 줄 단위로 찾지 않는다.
 * ⛔ 장수를 안 적은 곳은 부품 기본값 5 다 — 부품과 같은 값을 쓴다. 딴 값을 지어내지 않는다.
 */
export function 부르는벌찾기(글, 기본장수 = 5) {
  const s = String(글 ?? '');
  const 것들 = [];
  const 재 = /<KcwCardnews\b([\s\S]*?)\/>/g;
  let m;
  while ((m = 재.exec(s)) !== null) {
    const 속 = m[1];
    const 벌 = /set\s*=\s*"([^"]+)"/.exec(속) ?? /set\s*=\s*'([^']+)'/.exec(속);
    if (!벌) continue;
    const 장 = /count\s*=\s*\{\s*(\d+)\s*\}/.exec(속);
    것들.push({ 벌: 벌[1], 장수: 장 ? Number(장[1]) : 기본장수 });
  }
  return 것들;
}

/** 폴더 꼴 카드가 몇 장인가 — `01.png` 꼴만 센다 */
export function 벌장수(방) {
  if (!fs.existsSync(방)) return 0;
  return fs.readdirSync(방).filter((f) => /^\d{2}\.png$/i.test(f)).length;
}

/** 폴더 꼴 벌 이름만 — 평평한 기사 카드(`x-sq-1.png`)는 파일이라 자동으로 걸러진다 */
export function 있는벌찾기(방 = 카드방) {
  if (!fs.existsSync(방)) return null; /* ⬜ 못 쟀다 */
  return fs.readdirSync(방, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

/**
 * 🔴 [2026-09-03] **걸어 놓고도 대체글이 떨어져 있었다.**
 *   `/weeks-counter` 의 카드 대체글이 「counter — card 1 of 5」였다. 부품은 지면 머리글을
 *   `wikitip-headlines.json` 에서 찾는데 그 표가 지면 97장에서 멈춰 있어 못 찾은 것이다.
 *   ⛔ 부품 머리글이 스스로 적어 둔 말 — 「대체글이 없는 것보다 나쁜 것은
 *      «아무 뜻 없는 대체글»이다」. 구글 이미지가 읽는 글자가 바로 그것이다.
 *   ⚠ 그러니 «걸렸나»만 재면 절반이다. **집어 갈 수 있나 + 검색에 걸리나**를 같이 잰다.
 *
 *   ⛔ 주소가 한 꼴이 아니다 — 부품과 «같은 후보 목록»을 쓴다. 딴 목록을 지어내면
 *      자와 부품이 서로 다른 것을 보고 자는 초록을 낸다.
 */
export function 머리글후보(지면길) {
  /* src/pages/wikitip/school/index.astro → /school · …/day-pillar.astro → /day-pillar */
  let p = String(지면길 ?? '')
    .replace(/^.*src\/pages\/wikitip/, '')
    .replace(/\.astro$/, '')
    .replace(/\/index$/, '');
  if (!p) p = '/';
  return [p, '/wikitip' + p, p.split('/').filter(Boolean).length ? '/' + p.split('/').filter(Boolean).pop() : p];
}

/** 세 방향을 한 번에 판정한다 */
export function 판정(있는벌, 부른것) {
  const 부른벌 = new Map();
  for (const c of 부른것) 부른벌.set(c.벌, c);
  const 고아 = 있는벌.filter((b) => !부른벌.has(b));
  const 깨짐 = [...부른벌.keys()].filter((b) => !있는벌.includes(b));
  /* ⚠ 장수 «어긋남»은 여기서 재지 않는다 — 파일을 세어야 하고, 그것은 main 이 한다.
     ⛔ 여기에 빈 고리를 남겨 두면 다음 사람이 「이 함수가 잰다」고 읽는다. */
  return { 고아, 깨짐 };
}

function 자가시험() {
  let 흠 = 0; let 잰수 = 0;
  const 본다 = (이름, 참) => { 잰수 += 1; if (참) console.log(`  ✅ ${이름}`); else { console.log(`  🔴 ${이름}`); 흠 += 1; } };

  본다('부르는 벌을 뜯는다',
    부르는벌찾기('<KcwCardnews set="actors" count={5} />')[0]?.벌 === 'actors');
  본다('장수를 뜯는다',
    부르는벌찾기('<KcwCardnews set="actors" count={7} />')[0]?.장수 === 7);
  /* 🔴 실제로 이렇게 적힌 지면이 있다 — 줄 단위로 찾으면 놓친다 */
  본다('⭐ 인자가 줄을 넘어가도 뜯는다',
    부르는벌찾기('<KcwCardnews set="people"\n    count={5}\n  />')[0]?.벌 === 'people');
  본다('장수를 안 적으면 부품 기본값 5 로 본다',
    부르는벌찾기('<KcwCardnews set="x" />')[0]?.장수 === 5);
  본다('한 지면에 두 벌이 있으면 둘 다 뜯는다',
    부르는벌찾기('<KcwCardnews set="outside" count={5} />\n<KcwCardnews set="places" count={5} />').length === 2);
  본다('부르는 것이 없으면 빈 것을 낸다', 부르는벌찾기('아무것도 없다').length === 0);
  /* ⛔ 부품 «정의» 파일 자신은 부르는 것이 아니다 — 거기엔 <KcwCardnews …/> 꼴이 없다 */
  본다('set 이 없는 꼴은 세지 않는다', 부르는벌찾기('<KcwCardnews count={5} />').length === 0);

  본다('고아를 잡는다',
    판정(['a', 'b'], [{ 벌: 'a', 장수: 5 }]).고아.join() === 'b');
  본다('깨짐을 잡는다',
    판정(['a'], [{ 벌: 'a', 장수: 5 }, { 벌: 'z', 장수: 5 }]).깨짐.join() === 'z');
  본다('다 걸려 있으면 아무것도 안 낸다', (() => {
    const r = 판정(['a'], [{ 벌: 'a', 장수: 5 }]);
    return r.고아.length === 0 && r.깨짐.length === 0;
  })());

  /* 🔴 2026-09-03 에 실제로 있던 꼴 — 벌 셋이 고아였다 */
  본다('⭐ 9/3 의 그 꼴을 잡는다 (고아 셋)',
    판정(['counter', 'daystem', 'school', 'actors'], [{ 벌: 'actors', 장수: 5 }]).고아.length === 3);

  본다('지면 길에서 주소를 뜯는다',
    머리글후보('src/pages/wikitip/day-pillar.astro')[0] === '/day-pillar');
  본다('index.astro 는 폴더 이름이 주소다',
    머리글후보('src/pages/wikitip/school/index.astro')[0] === '/school');
  본다('/wikitip 붙은 꼴도 후보에 넣는다 — 지어질 때 주소가 그것이다',
    머리글후보('src/pages/wikitip/school/index.astro').includes('/wikitip/school'));

  본다('없는 방은 0장이다', 벌장수(path.join(뿌리, '없는-방-입니다')) === 0);
  본다('있는벌찾기 는 방이 없으면 null 을 낸다 — 「없다」가 아니라 「못 쟀다」',
    있는벌찾기(path.join(뿌리, '없는-방-입니다')) === null);

  console.log(흠 ? `\n🔴 자가시험 ${잰수}가지 중 ${흠}가지 틀렸다` : `\n✅ 자가시험 ${잰수}가지 다 맞다`);
  return 흠;
}

function main() {
  const 인자 = process.argv.slice(2);
  console.log('# 구운 카드가 지면에 걸려 있나 (K Culture Wire)\n');
  const 흠 = 자가시험();
  if (인자.includes('--자가시험')) process.exit(흠 ? 1 : 0);
  if (흠) { console.log('\n⛔ 자가시험이 틀렸다. 재지 않는다.'); process.exit(1); }

  const 있는벌 = 있는벌찾기();
  if (있는벌 === null) {
    console.log('\n⬜ **못 쟀다** — public/wikitip/cardnews/ 가 없다.');
    console.log('   ⛔ 이것은 「통과」가 아니다.');
    process.exit(1);
  }

  /* 지면을 훑어 부르는 것을 모은다 */
  const 부른것 = [];
  const 어디서 = new Map();
  const 훑기 = (방) => {
    for (const d of fs.readdirSync(방, { withFileTypes: true })) {
      const p = path.join(방, d.name);
      if (d.isDirectory()) { 훑기(p); continue; }
      if (!d.name.endsWith('.astro')) continue;
      for (const c of 부르는벌찾기(fs.readFileSync(p, 'utf8'))) {
        부른것.push(c);
        어디서.set(c.벌, path.relative(뿌리, p).split(path.sep).join('/'));
      }
    }
  };
  훑기(지면방);

  const { 고아, 깨짐 } = 판정(있는벌, 부른것);

  /* 장수 어긋남은 파일을 세어 본다 */
  const 어긋남 = [];
  for (const c of 부른것) {
    if (!있는벌.includes(c.벌)) continue;
    const 실제 = 벌장수(path.join(카드방, c.벌));
    if (실제 !== c.장수) 어긋남.push({ ...c, 실제, 곳: 어디서.get(c.벌) });
  }

  const 걸린장 = 있는벌.filter((b) => !고아.includes(b))
    .reduce((a, b) => a + 벌장수(path.join(카드방, b)), 0);
  const 고아장 = 고아.reduce((a, b) => a + 벌장수(path.join(카드방, b)), 0);

  console.log(`\n폴더 꼴 카드 벌 ${있는벌.length}벌 · ✅ 지면에 걸린 것 ${있는벌.length - 고아.length}벌(${걸린장}장) · 🔴 고아 ${고아.length}벌(${고아장}장)`);
  console.log('⚠ 기사 카드(`<벌>-sq-1.png` 평평한 꼴)는 여기서 세지 않는다 — 기사 템플릿이 색인으로 자동 싣는다.');

  if (고아.length) {
    console.log('\n■ 🔴 **고아** — 서버에 있는데 «어느 지면도 부르지 않는다». 만든 값이 0이다.');
    for (const b of 고아) console.log(`     ${b}  (${벌장수(path.join(카드방, b))}장)  public/wikitip/cardnews/${b}/`);
    console.log('   ✅ 고치는 법 — 그 자료를 이미 쓰는 지면에 한 줄 넣는다. 새 지면을 짓지 않아도 된다.');
    console.log('     <KcwCardnews set="<벌>" count={5} />');
    console.log('   ⛔ 「구웠다」를 「냈다」라고 부르지 않는다. 사장님 지시: 카드는 «외부유입용»이다 —');
    console.log('      사람이 집어 갈 수 있어야 값이 생긴다.');
  }
  if (깨짐.length) {
    console.log('\n■ 🔴 **깨짐** — 지면은 부르는데 벌이 없다. 빈 상자가 뜬다.');
    for (const b of 깨짐) console.log(`     ${b}  ← ${어디서.get(b)}`);
  }
  if (어긋남.length) {
    console.log('\n■ 🔴 **어긋남** — 지면이 말한 장수와 파일 수가 다르다. 없는 그림을 가리킨다.');
    for (const x of 어긋남) console.log(`     ${x.벌}  지면 count={${x.장수}} · 파일 ${x.실제}장  ← ${x.곳}`);
  }

  /*
   * 🔴 걸려 있어도 대체글이 «벌 이름»으로 떨어지면 구글 이미지에 아무 말로도 안 걸린다.
   * ⚠ 표가 없으면 「떨어진다」가 아니라 **「못 쟀다」**다 — 
   */
  const 떨어진것 = [];
  const 표길 = path.join(뿌리, 'src', 'data', 'wikitip-headlines.json');
  let 머리표 = null;
  try { 머리표 = JSON.parse(fs.readFileSync(표길, 'utf8')).headlines ?? null; } catch { 머리표 = null; }
  if (머리표 === null) {
    console.log('\n⬜ **못 쟀다** — src/data/wikitip-headlines.json 을 못 읽었다.');
    console.log('   대체글이 떨어지는지는 판정하지 않는다. ⛔ 「통과」가 아니다.');
  } else {
    for (const [벌, 곳] of 어디서) {
      if (고아.includes(벌) || 깨짐.includes(벌)) continue;
      const 있나 = 머리글후보(곳).some((k) => 머리표[k]);
      if (!있나) 떨어진것.push({ 벌, 곳 });
    }
    if (떨어진것.length) {
      console.log('\n■ 🔴 **대체글이 벌 이름으로 떨어진다** — 걸려 있어도 구글 이미지에 안 걸린다.');
      for (const x of 떨어진것) console.log(`     ${x.벌}  ← ${x.곳}`);
      console.log('   ✅ 고치는 법 — 빌드 뒤에 `node scripts/build-kcw-headlines.mjs` 를 돌리고 «다시» 빌드한다.');
      console.log('      (build-once.mjs 가 이제 빌드 뒤에 스스로 돌린다. 새 지면은 한 걸음 늦게 실린다.)');
    }
  }

  const 총 = 고아.length + 깨짐.length + 어긋남.length + 떨어진것.length;
  if (!총) { console.log('\n✅ 구운 카드가 모두 지면에 걸려 있다'); process.exit(0); }
  console.log(`\n🔴 흠 ${총}건`);
  process.exit(1);
}

if (process.argv[1] && process.argv[1].endsWith('check-kcw-cardnews-orphan.mjs')) main();
