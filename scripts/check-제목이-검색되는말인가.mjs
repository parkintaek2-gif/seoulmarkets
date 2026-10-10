#!/usr/bin/env node
/**
 * check-제목이-검색되는말인가.mjs — **우리 지면 제목에 «사람이 찾는 말»이 들어 있나.**
 *
 * ── 🔴 왜 (2026-09-29 · 5번) ─────────────────────────────────────────
 * 사장님 최우선 지시(검색·AI 유입)에 따라 GSC 를 재 보니 —
 *   SeoulMarkets 에서 1페이지에 선 질의 12개를 «세 지면»이 다 가져갔고, 그중 하나가 8개였다.
 *   그 이기는 지면의 제목은 이랬다 —
 *     「Korea's 10 **largest listed companies** — and why most rankings double-count Samsung」
 *   **사람이 실제로 검색하는 말이 앞에 있고, 뒤에 우리만 아는 결론이 붙는다.**
 *
 *   그런데 내가 그날 낸 지면 제목은 「How Korean companies **split themselves**」였다.
 *   뜻은 맞지만 **아무도 그렇게 검색하지 않는다.** 찾아올 길이 없는 제목이다.
 *
 * ⭐ 그래서 이 자는 **GSC 가 알려 준 «실제 질의»**를 잣대로 삼는다.
 *   내 느낌이 아니라 «사람이 정말 친 말»과 맞대어 본다.
 *   ⛔ 「좋은 제목처럼 보인다」로 판정하지 않는다.
 *
 * 쓰는 법
 *   node scripts/check-제목이-검색되는말인가.mjs
 *   node scripts/check-제목이-검색되는말인가.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** 어느 말이든 제목에 있으면 «검색될 만하다»고 보지 않는다 — 이런 말은 누구나 쓴다 */
export const 흔한말 = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'in', 'on', 'for', 'to', 'is', 'are',
  'we', 'our', 'you', 'your', 'this', 'that', 'it', 'by', 'with', 'from', 'at', 'as', 'how', 'what',
  'why', 'when', 'who', 'not', 'but', 'more', 'most', 'all', 'one', 'two', 'do', 'does', 'did',
  'smarkets', 'seoulmarkets']);

export function 낱말로(s) {
  return String(s ?? '').toLowerCase()
    .replace(/[^a-z0-9가-힣\s]/g, ' ')
    .split(/\s+/).filter((w) => w.length > 1 && !흔한말.has(w));
}

/**
 * 제목이 «실제 질의»와 얼마나 겹치나.
 * ⚠ 한 낱말만 겹쳐도 세지 않는다 — 「companies」 하나로는 아무 데도 못 간다.
 *   ⇒ «두 낱말 이상» 이어서 겹치는 질의가 있어야 «찾아올 길이 있다»고 본다.
 */
/** 어간으로 견준다 — korea/korean, company/companies 를 같은 말로 본다.
 *  ⚠ 「길이에 따라 다르게 자르면」 korea(5자)는 그대로, korean(6자)은 kore 가 되어
 *    같은 말이 서로 다른 어간이 된다. 실제로 그 길로 자가시험이 떨어졌다.
 *  ⇒ **모두 같은 길이로 자른다.** 뭉개지는 쪽이 어긋나는 쪽보다 낫다. */
export function 어간(w) {
  const s = String(w ?? '').toLowerCase();
  return s.length > 4 ? s.slice(0, 4) : s;
}

export function 겹치나(제목, 질의들) {
  const 제 = new Set(낱말로(제목).map(어간));
  const 걸린것 = [];
  for (const q of 질의들 ?? []) {
    const 질 = 낱말로(q).map(어간);
    if (!질.length) continue;
    const 겹침 = 질.filter((w) => 제.has(w)).length;
    /* 🔴 [2026-09-29] 처음엔 «두 낱말만» 겹쳐도 「길 있다」고 했다. 그랬더니
       「How Korean companies split themselves」가 「largest korean companies」와
       korean·companies 둘이 겹쳐 통과해 버렸다 — 정작 핵심어 «largest» 가 빠졌는데도.
       ⇒ **질의 낱말이 «전부» 제목에 있어야** 그 질의로 찾아올 길이 있다고 본다.
         자가시험이 이 느슨함을 잡아 줬다. */
    if (겹침 === 질.length) 걸린것.push({ 질의: q, 겹침 });
  }
  return 걸린것.sort((a, b) => b.겹침 - a.겹침);
}

/**
 * 🔴 [2026-09-29] **제목은 «원본»이 아니라 «빌드된 HTML»에서 읽는다.**
 *
 * 처음엔 .astro 의 `const TITLE = '...'` 를 정규식으로 읽었다. 그런데 그 정규식은
 * 따옴표에서 끊긴다 — 그래서 이런 것들이 «잘린 제목»으로 잡혔다.
 *   mezzanine        → `Only ${수(p.public)} of ${수(data.rows)} Korean converti…`
 *   trading-partners → `South Korea`            (아포스트로피에서 끊겼다)
 *   korea-disclosures→ `… in English — `        (뒤가 통째로 날아갔다)
 * 라이브를 열어 보니 셋 다 «멀쩡했다». 잘린 것은 지면이 아니라 **내 자**였다.
 *
 * ⚠ 같은 병을 하루 전에도 앓았다 — 지면 설명이 잘렸다고 잘못 보고했는데
 *   그것도 내 정규식이 아포스트로피에서 끊은 것이었다. **두 번째다.**
 * ⇒ 짐작으로 읽지 않고 **손님이 실제로 보는 글자**(dist 의 <title>)를 읽는다.
 *   빌드가 없으면 「못 쟀다」고 적는다. 원본을 정규식으로 다시 읽지 않는다.
 */
export function 지은제목읽기(dist데) {
  const 글 = fs.readFileSync(dist데, 'utf8');
  const m = 글.match(/<title>([\s\S]*?)<\/title>/i);
  if (!m) return null;
  /* 「… | SMarkets」 꼬리는 모든 지면에 똑같이 붙는다 — 견줄 때 빼 준다 */
  return m[1].replace(/\s*\|\s*SMarkets\s*$/, '')
    .replace(/&#39;/g, '’').replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .trim() || null;
}

/**
 * 🔴🔴 [2026-10-04 05:5x · 5번] **`<title>` 만 고치고 H1 을 잊었다.**
 *
 *   `/data/largest-companies` 의 제목을 손님이 치는 말(`biggest … South Korea`)에
 *   맞췄는데, 화면의 큰 제목은 옛 말(`The largest companies in Korea`) 그대로였다.
 *   ```
 *   title  The biggest companies in South Korea, ranked four ways   ← 고쳤다
 *   h1     The largest companies in Korea                           ← 잊었다
 *   ```
 *   **검사는 다 통과했고, 실물을 띄워 보고서야 잡았다.**
 *   구글은 H1 도 보고, 손님이 «처음 읽는» 말이 그것이다. 둘이 다른 말을 하면 안 된다.
 *
 * ⚠ 둘이 «같아야» 한다는 뜻은 아니다 — title 은 보통 더 길고 꼬리가 붙는다.
 *   H1 의 알맹이 낱말이 title 에 들어 있는지만 본다.
 * ⛔ 0 으로 채우지 않는다 — H1 이 없거나 알맹이가 없으면 「못 쟀다」다.
 *
 * 🔴🔴 **그리고 이것을 «빨강»으로 내지 않는다.** 처음에 빨강으로 냈더니 14개가 걸렸는데
 *   열셋이 **의도된 차이**였다 — `broker-candour` 는 title 이 「Sell is 0.06%」이고
 *   h1 이 「the Sell rating that vanished」다. 둘 다 좋은 말이고 일부러 다르게 쓴 것이다.
 *   ⛔ 거짓 빨강이 열셋이면 진짜 하나가 묻힌다. 오늘 로그인 검사에서 겪은 그 자리다.
 *   ⇒ 자가 **판정하지 않고** 어긋난 자리를 보여 주기만 한다. 「고치다 한쪽을 잊었나」는
 *     사람이 눈으로 가른다. 그 하나를 찾으려고 열셋을 같이 띄우는 것은 값이 맞다.
 */
export function H1읽기(글) {
  const m = String(글 ?? '').match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!m) return null;
  return m[1].replace(/<[^>]+>/g, ' ')
    .replace(/&#39;/g, '’').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ').trim() || null;
}

export function 제목과H1이맞나(제목, h1) {
  if (!제목 || !h1) return { 갈래: '못쟀다', 말: 'title 이나 h1 을 못 읽었다' };
  /* 🔴 [2026-10-11 05:5x · 5번] **견주기는 어간으로, 보여 주기는 «원래 낱말»로.**
   *   여기서 어간만 들고 다니다가 「larg 가 빠졌다」고 말하고 있었다 — 사람이 못 알아듣는다.
   *   ⚠ 이 자가 npm test 에 안 물려 있어서 **자가시험이 깨진 채로 한 달을 갔다.**
   *     「어느 낱말이 빠졌는지 이름으로 댄다」가 줄곧 빨강이었는데 아무도 안 봤다.
   *   ⭐ 안 불리는 검사는 문장일 뿐이다 — 이 줄이 그 산 증거다. */
  const 알맹이낱말 = (s) => 낱말로(s).filter((w) => !흔한말.has(w));
  const t = new Set(알맹이낱말(제목).map(어간));
  const h = 알맹이낱말(h1);
  if (!h.length) return { 갈래: '못쟀다', 말: 'h1 에 견줄 알맹이 낱말이 없다' };
  const 빠진것 = [...new Set(h.filter((w) => !t.has(어간(w))))];
  if (빠진것.length) {
    return { 갈래: '어긋남', 말: `h1 의 낱말이 title 에 없다: ${빠진것.join(' · ')}`, 빠진것 };
  }
  return { 갈래: '맞음', 말: 'h1 의 알맹이가 title 에 다 들어 있다', 빠진것: [] };
}

/** 판정 — ⛔ 「없다」와 「못 쟀다」를 가른다 */
export function 판정(제목, 질의들) {
  if (!제목) return { 갈래: '못쟀다', 말: '제목을 못 읽었다' };
  if (!질의들 || !질의들.length) return { 갈래: '못쟀다', 말: '맞대어 볼 실제 질의가 없다' };
  const 걸린것 = 겹치나(제목, 질의들);
  if (!걸린것.length) {
    return { 갈래: '길없음', 말: '실제 질의와 두 낱말 이상 겹치는 것이 없다 — 찾아올 길이 없는 제목이다' };
  }
  return { 갈래: '길있음', 말: `${걸린것.length}개 질의와 겹친다 (${걸린것[0].질의})`, 걸린것 };
}

/* ── 자가시험 ─────────────────────────────────────────────────────── */
export function 자가시험() {
  const 것 = [];
  const 본다 = (이름, 참, 덧 = '') => 것.push({ 이름, 참: !!참, 덧 });

  const 질의 = ['largest korean companies', 'korean stock market biggest companies',
    'kospi index constituents weights', 'korea business segments'];

  본다('⛔ 흔한 말을 낱말로 세지 않는다',
    !낱말로('How and the What of it').includes('how'));
  본다('실제 낱말은 남긴다', 낱말로('Korean business segments').join(',') === 'korean,business,segments');

  /* 🔴 [2026-10-04] title 만 고치고 H1 을 잊던 자리 */
  본다('🔴 title 을 고치고 h1 을 안 고치면 잡는다',
    제목과H1이맞나('The biggest companies in South Korea, ranked four ways',
      'The largest companies in Korea').갈래 === '어긋남');
  본다('🔴 어느 낱말이 빠졌는지 이름으로 댄다',
    제목과H1이맞나('The biggest companies in South Korea',
      'The largest companies in Korea').빠진것.includes('largest'));
  본다('✅ 둘을 같이 고치면 통과한다',
    제목과H1이맞나('The biggest companies in South Korea, ranked four ways',
      'The biggest companies in South Korea').갈래 === '맞음');
  본다('⛔ title 이 더 길어도 통과한다 — 똑같을 필요는 없다',
    제목과H1이맞나('Korean target price changes — who moved a target price',
      'Korean target price changes').갈래 === '맞음');
  본다('⛔ h1 이 없으면 «못 쟀다»다 — 통과로 적지 않는다',
    제목과H1이맞나('제목만 있다', null).갈래 === '못쟀다');
  본다('⛔ 흔한 말만 다르면 어긋남이 아니다',
    제목과H1이맞나('Korean companies and the market', 'The Korean companies').갈래 === '맞음');
  본다('h1 을 지면에서 읽는다', H1읽기('<h1 class="x">Hello <b>World</b></h1>') === 'Hello World');
  본다('⛔ h1 이 없으면 null 이다', H1읽기('<p>없다</p>') === null && H1읽기(null) === null);

  const 이기는제목 = 'Korea\'s 10 largest listed companies — and why most rankings double-count Samsung';
  본다('🔴 이기는 제목은 실제 질의와 겹친다', 판정(이기는제목, 질의).갈래 === '길있음');

  const 못이기는제목 = 'How Korean companies split themselves';
  const p = 판정(못이기는제목, 질의);
  본다('🔴 「split themselves」는 찾아올 길이 없다고 잡는다', p.갈래 === '길없음', p.말.slice(0, 30));

  const 고친제목 = 'Korean companies’ business segments — half report only one';
  본다('✅ 고친 제목은 길이 생긴다', 판정(고친제목, 질의).갈래 === '길있음');

  본다('⛔ 한 낱말만 겹치면 «길 있다»고 하지 않는다',
    판정('Companies', ['largest korean companies']).갈래 === '길없음');
  본다('🔴 맞대어 볼 질의가 없으면 «못 쟀다»지 «없다»가 아니다',
    판정('아무 제목', []).갈래 === '못쟀다');
  본다('⛔ 빈 것에 안 터진다',
    판정(null, 질의).갈래 === '못쟀다' && 겹치나('x', null).length === 0);

  /* 🔴 [2026-09-29] 내 자가 두 번 속은 자리 — 아포스트로피·보간에서 끊겼다.
     지은 HTML 에서 읽으면 안 끊긴다. 그것을 여기서 잰다. */
  const 임시 = path.join(뿌리, 'archive', '.제목자가시험.html');
  fs.mkdirSync(path.dirname(임시), { recursive: true });
  fs.writeFileSync(임시,
    '<html><head><title>South Korea&#39;s largest trading partners — ranked | SMarkets</title></head></html>', 'utf8');
  const 읽은것 = 지은제목읽기(임시);
  본다('🔴 아포스트로피에서 안 끊긴다', /largest trading partners/.test(읽은것 ?? ''), 읽은것 ?? '');
  본다('⛔ 「| SMarkets」 꼬리는 뺀다', !/SMarkets/.test(읽은것 ?? ''));
  fs.writeFileSync(임시, '<html><head><title>Only 86 of 5,084 Korean convertible issues | SMarkets</title></head></html>', 'utf8');
  본다('🔴 수가 든 제목도 통째로 읽는다', /5,084 Korean convertible issues$/.test(지은제목읽기(임시) ?? ''));
  fs.writeFileSync(임시, '<html><head></head></html>', 'utf8');
  본다('⛔ 제목이 없으면 «없다»가 아니라 null 이다', 지은제목읽기(임시) === null);
  fs.rmSync(임시, { force: true });

  const 빨강 = 것.filter((x) => !x.참);
  console.log(`■ check-제목이-검색되는말인가 자가시험 ${것.length - 빨강.length}/${것.length}`);
  for (const x of 것) console.log(`  ${x.참 ? '✅' : '🔴'} ${x.이름}${x.덧 ? `  (${x.덧})` : ''}`);
  return 빨강.length === 0;
}

/* ── 진입점 ───────────────────────────────────────────────────────── */
const 내가진입점 = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (내가진입점) {
  if (process.argv.includes('--자가시험')) process.exit(자가시험() ? 0 : 1);

  /* GSC 가 알려 준 «실제 질의»를 잣대로 삼는다 */
  const 자료방 = path.join(뿌리, 'src', 'data');
  const 질의모음 = [];
  for (const f of fs.readdirSync(자료방).filter((x) => /^gsc-.*-qp-/.test(x))) {
    try {
      for (const r of (JSON.parse(fs.readFileSync(path.join(자료방, f), 'utf8')).rows) || []) {
        if (r.key) 질의모음.push(String(r.key));
      }
    } catch (e) { /* 못 읽은 것은 건너뛴다 */ }
  }
  const 질의들 = [...new Set(질의모음)];
  console.log(`■ 맞대어 볼 «실제 질의» ${질의들.length}개 (GSC 가 알려 준 것)`);
  if (!질의들.length) {
    console.log('⛔ 질의가 없다 — node scripts/fetch-gsc.mjs --모두 를 먼저 돌린다');
    process.exit(0);
  }

  /* 우리 지면의 제목을 읽는다 — ⛔ 원본이 아니라 «지어 놓은 HTML» 에서 (위 주석) */
  const 볼곳 = path.join(뿌리, 'src', 'pages', 'data');
  const 지은방 = path.join(뿌리, 'dist', 'data');
  if (!fs.existsSync(지은방)) {
    console.log('⛔ 못 쟀다 — dist/data 가 없다. node scripts/build-once.mjs 를 먼저 돌린다');
    process.exit(0);
  }
  const 결과 = []; const 못잰것 = [];
  for (const f of fs.readdirSync(볼곳).filter((x) => x.endsWith('.astro'))) {
    const 이름 = f.replace('.astro', '');
    /* Astro 는 foo.astro → dist/data/foo.html 또는 dist/data/foo/index.html 로 낸다 */
    const 후보 = [path.join(지은방, `${이름}.html`), path.join(지은방, 이름, 'index.html')];
    const 있는것 = 후보.find((p) => fs.existsSync(p));
    if (!있는것) { 못잰것.push(이름); continue; }
    const 제목 = 지은제목읽기(있는것);
    if (!제목) { 못잰것.push(이름); continue; }
    /* 🔴 [2026-10-04] title 만 고치고 H1 을 잊던 자리 — 둘을 같이 본다 */
    const h1 = H1읽기(fs.readFileSync(있는것, 'utf8'));
    결과.push({ f, 제목, h1, 짝: 제목과H1이맞나(제목, h1), ...판정(제목, 질의들) });
  }
  if (못잰것.length) console.log(`⬜ 못 쟀다 ${못잰것.length}개 — ${못잰것.join(' · ')}`);

  const 길없음 = 결과.filter((x) => x.갈래 === '길없음');
  console.log(`\n■ 지면 ${결과.length}개 가운데 «찾아올 길이 없는» 제목 ${길없음.length}개`);
  for (const x of 길없음) console.log(`  🔴 ${x.f.replace('.astro', '').padEnd(26)} ${x.제목.slice(0, 54)}`);

  const 길있음 = 결과.filter((x) => x.갈래 === '길있음');
  console.log(`\n  ✅ 길이 있는 제목 ${길있음.length}개 — 보기 셋`);
  for (const x of 길있음.slice(0, 3)) console.log(`     ${x.f.replace('.astro', '').padEnd(26)} ${x.말.slice(0, 60)}`);

  /* 🔴 [2026-10-04] title 과 h1 이 서로 다른 말을 하던 자리 */
  const 어긋남 = 결과.filter((x) => x.짝?.갈래 === '어긋남');
  const h1못잼 = 결과.filter((x) => x.짝?.갈래 === '못쟀다');
  console.log(`\n■ title 과 h1 이 다른 말을 하는 지면 ${어긋남.length}개 — ⚠ 판정이 아니라 «눈으로 볼 목록»이다`);
  console.log('  ⚠ 일부러 다르게 쓴 것이 대부분이다(title 은 검색용, h1 은 지면 제목).');
  console.log('    찾는 것은 «한쪽만 고치고 잊은» 것이다 — 뜻이 같은 다른 낱말이 보이면 그것이다.');
  console.log('    (2026-10-04 실례: title 을 biggest 로 고치고 h1 은 largest 인 채로 뒀다)');
  for (const x of 어긋남.slice(0, 20)) {
    console.log(`  ⚠ ${x.f.replace('.astro', '')}`);
    console.log(`     title ${x.제목.slice(0, 66)}`);
    console.log(`     h1    ${String(x.h1).slice(0, 66)}`);
  }
  if (어긋남.length > 20) console.log(`  … 그리고 ${어긋남.length - 20}개 더`);
  if (!어긋남.length) console.log('  ✅ 없다 — 손님이 처음 읽는 말과 검색에 뜨는 말이 같다');
  if (h1못잼.length) {
    console.log(`  ⬜ h1 을 못 읽은 지면 ${h1못잼.length}개 — ${h1못잼.map((x) => x.f.replace('.astro', '')).slice(0, 8).join(' · ')}`);
    console.log('     ⚠ 이것을 「맞다」로 읽지 않는다. 안 본 것은 안 본 것이다.');
  }

  console.log('\n⚠ 「길이 없다」가 「나쁜 제목」이라는 뜻은 아니다 —');
  console.log('  아직 그 말로 검색된 적이 없다는 뜻이다. 새 축이면 당연히 없다.');
  console.log('  ⇒ 사람이 찾을 만한 말을 «하나는» 제목에 넣었는지 눈으로 본다.');
}
