#!/usr/bin/env node
/**
 * check-내린지면에-301이-걸렸나.mjs
 * 내린 지면마다 server.mjs 의 「사라진 지면」 표에 301 이 걸려 있는지 본다.
 *
 * ── 왜 만드나 (2026-11-09) ──────────────────────────────────────────
 * 사장님이 서치콘솔 통지를 주셨다 — seoulmarkets.com 「찾을 수 없음(404)」 2장,
 * 10-26 에 올린 유효성 검사가 11-07 에 **실패**.
 *
 *   `/data/bank-loan-delinquency`          2026-10-11 에 5번이 내림 · 301 없음 · 404
 *   `/data/mortgage-balance-gender-gap`    같은 날 같이 내림 · 301 없음 · 404
 *
 * 내릴 때 카탈로그(`/data/index.astro`)와 사이트맵에서는 뺐는데 **301 표에만 안 넣었다.**
 *
 * ⭐ 사이트맵에서 빼는 것은 「구글에게 **새로** 알리지 않는 것」이지
 *   「구글이 **잊는** 것」이 아니다. 이미 찾아 둔 주소는 계속 긁으러 온다.
 *   그 주소가 404 를 돌려주면 그 자리의 검색 수요가 통째로 버려진다 —
 *   2026-09-03 에 KCW 에서 노출 5,010건의 9.4%가 우리 404 로 가고 있었다.
 *
 * ⛔ 같은 흠이 **세 번째**다 — 09-03(KCW 다섯 장) · 10-26(1번이 고친 무역 글) · 오늘.
 *   말로 적은 규칙은 세 번 다 지켜지지 않았다. 그래서 검사로 둔다.
 *
 * ── 내리는 일은 «세 자리»다 ──────────────────────────────────────────
 *   ① 카탈로그에서 뗀다            손님이 죽은 칸을 누르지 않게
 *   ② 사이트맵에서 뺀다            구글에게 새로 내밀지 않게
 *   ③ **301 표에 넣는다**          이미 아는 구글을 살아 있는 이웃으로 보내게
 *   이 검사는 ③ 만 본다. ①②는 각자의 검사가 따로 있다.
 *
 * 쓰는 법
 *   node scripts/check-내린지면에-301이-걸렸나.mjs
 *   node scripts/check-내린지면에-301이-걸렸나.mjs --자체검사
 *   node scripts/check-내린지면에-301이-걸렸나.mjs --라이브    (실제로 301 이 나오나)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 저장소루트 = fileURLToPath(new URL('..', import.meta.url));
export const 내린지면폴더 = path.join(저장소루트, 'docs/내린지면');
export const 서버파일 = path.join(저장소루트, 'server.mjs');
export const 설명서 = path.join(내린지면폴더, 'README.md');

/**
 * README 에 적힌 「어디서 내렸나」 줄을 읽는다.
 *   docs/내린지면/bank-loan-delinquency.astro   ← src/pages/data/
 * 를 { 'bank-loan-delinquency': '/data/bank-loan-delinquency' } 로 돌려준다.
 */
export function 왔던자리(글) {
  const 것 = {};
  const 줄들 = String(글 ?? '').split(/\r?\n/);
  for (const 줄 of 줄들) {
    const m = 줄.match(/docs\/내린지면\/([^\s/]+)\.astro\s*←\s*(src\/pages\/[^\s]*)/);
    if (!m) continue;
    const 이름 = m[1];
    /* src/pages/data/ → /data · src/pages/ → (뿌리) */
    const 안쪽 = m[2].replace(/^src\/pages\/?/, '').replace(/\/+$/, '');
    것[이름] = '/' + (안쪽 ? 안쪽 + '/' : '') + 이름;
  }
  return 것;
}

/** server.mjs 의 「사라진지면」 표에서 열쇠(옛 주소)를 모은다 */
export function 표의주소들(글) {
  const 본문 = String(글 ?? '');
  const 시작 = 본문.indexOf('const 사라진지면 = {');
  if (시작 < 0) return null;           /* 🔴 못 찾으면 null 이다. 빈 집합이 아니다 */
  const 끝 = 본문.indexOf('\n  };', 시작);
  if (끝 < 0) return null;
  const 토막 = 본문.slice(시작, 끝);
  const 것 = new Set();
  for (const m of 토막.matchAll(/^\s*'([^']+)'\s*:/gm)) 것.add(m[1]);
  return 것;
}

/** 내린 지면 파일 이름들 */
export function 내린지면들(폴더 = 내린지면폴더) {
  if (!fs.existsSync(폴더)) return [];
  return fs.readdirSync(폴더)
    .filter((x) => x.endsWith('.astro'))
    .map((x) => x.replace(/\.astro$/, ''))
    .sort();
}

/**
 * 이름들·README·표를 맞대 본다 — 파일을 안 읽는 순수한 자리다(자체검사가 여기를 찌른다).
 * @returns {{걸린것:{이름:string,주소:string}[], 못잰것:string[]}}
 */
export function 맞대본다(이름들, 설명서글, 표) {
  const 걸린것 = [];
  const 못잰것 = [];
  if (!표) { 못잰것.push('server.mjs 에서 «사라진지면» 표를 못 찾았다 — 이름이 바뀌었나'); return { 걸린것, 못잰것 }; }
  const 자리 = 왔던자리(설명서글);
  for (const 이름 of 이름들) {
    const 주소 = 자리[이름];
    if (!주소) {
      /* README 에 줄이 없으면 어디로 보낼지 알 수 없다 — 「통과」가 아니라 「측정하지 못했다」다 */
      못잰것.push(`${이름}.astro — README 에 «← src/pages/…» 줄이 없다`);
      continue;
    }
    if (!표.has(주소)) 걸린것.push({ 이름, 주소 });
  }
  return { 걸린것, 못잰것 };
}

/** 한 차례 검사한다 — { 걸린것, 못잰것 } */
export function 검사한다() {
  const 걸린것 = [];
  const 못잰것 = [];

  const 이름들 = 내린지면들();
  if (!이름들.length) return { 걸린것, 못잰것, 셈: 0 };

  let 설명서글;
  try { 설명서글 = fs.readFileSync(설명서, 'utf8'); }
  catch { 못잰것.push('docs/내린지면/README.md 를 못 읽었다'); return { 걸린것, 못잰것, 셈: 0 }; }

  let 서버글;
  try { 서버글 = fs.readFileSync(서버파일, 'utf8'); }
  catch { 못잰것.push('server.mjs 를 못 읽었다'); return { 걸린것, 못잰것, 셈: 0 }; }

  /* 🔴 표를 못 찾았는데 「걸린 것 없음」으로 끝내면 검사가 통째로 거짓말을 한다 */
  const 결과 = 맞대본다(이름들, 설명서글, 표의주소들(서버글));
  걸린것.push(...결과.걸린것);
  못잰것.push(...결과.못잰것);
  return { 걸린것, 못잰것, 셈: 이름들.length };
}

/** 라이브에서 실제로 301 이 나오나 */
export async function 라이브로잰다(뿌리주소 = 'https://seoulmarkets.com') {
  const 설명서글 = fs.readFileSync(설명서, 'utf8');
  const 자리 = 왔던자리(설명서글);
  const 것 = [];
  for (const 이름 of 내린지면들()) {
    const 주소 = 자리[이름];
    if (!주소) continue;
    try {
      const r = await fetch(뿌리주소 + 주소, { redirect: 'manual' });
      것.push({ 주소, 코드: r.status, 간곳: r.headers.get('location') ?? '' });
    } catch (e) {
      것.push({ 주소, 코드: 0, 간곳: String(e.message).slice(0, 60) });
    }
  }
  return 것;
}

/* ── 자체 검사 ──────────────────────────────────────────────────────── */
export function 자체검사() {
  const 항목 = [];
  const 검 = (이름, 결과) => 항목.push({ 이름, 결과: !!결과 });

  const 설명서본 = [
    '```',
    'docs/내린지면/bank-loan-delinquency.astro          ← src/pages/data/',
    'docs/내린지면/mortgage-balance-gender-gap.astro    ← src/pages/data/',
    '```',
  ].join('\n');
  const 자리 = 왔던자리(설명서본);
  검('README 줄에서 옛 주소를 읽는다',
    자리['bank-loan-delinquency'] === '/data/bank-loan-delinquency');
  검('두 줄이면 둘을 읽는다', Object.keys(자리).length === 2);
  검('뿌리에서 내린 것은 접두사가 안 붙는다',
    왔던자리('docs/내린지면/foo.astro ← src/pages/')['foo'] === '/foo');
  검('관계없는 줄은 안 읽는다', Object.keys(왔던자리('아무 글이나')).length === 0);

  const 서버본 = [
    "  const 사라진지면 = {",
    "    '/wikitip/esports': '/esports-nations',",
    "    /* 주석 안의 '/가짜': '/것' 은 세지 않는다 */",
    "    '/data/bank-loan-delinquency': '/data/fixed-variable-rate-share',",
    '  };',
  ].join('\n');
  const 표 = 표의주소들(서버본);
  검('표에서 옛 주소를 모은다', 표 instanceof Set && 표.has('/wikitip/esports'));
  검('표에 든 것을 찾는다', 표.has('/data/bank-loan-delinquency'));
  검('🔴 표를 못 찾으면 빈 집합이 아니라 null 이다 — 검사가 조용히 통과하면 안 된다',
    표의주소들('표가 없는 글') === null);

  검('실제 server.mjs 에서 표를 읽는다 — null 이면 못 읽은 것이다',
    표의주소들(fs.readFileSync(서버파일, 'utf8')) !== null);

  /* 🔴 「못 잡는 검사」를 막는다 — 표에서 빠진 것을 실제로 세우는지 찌른다.
     2026-11-09 에 걸린 것이 바로 이 꼴이었다: 페이지는 내렸는데 표에 줄이 없었다. */
  검('🔴 표에서 빠진 페이지를 세운다',
    맞대본다(['bank-loan-delinquency'], 설명서본, new Set(['/wikitip/esports'])).걸린것.length === 1);
  검('표에 있으면 안 세운다',
    맞대본다(['bank-loan-delinquency'], 설명서본,
      new Set(['/data/bank-loan-delinquency'])).걸린것.length === 0);
  검('README 에 줄이 없으면 «측정하지 못했다»로 센다 — 통과시키지 않는다',
    맞대본다(['이름없는것'], 설명서본, new Set()).못잰것.length === 1);
  검('표가 null 이면 통째로 «측정하지 못했다»다',
    맞대본다(['bank-loan-delinquency'], 설명서본, null).못잰것.length === 1);

  const r = 검사한다();
  검('돌려주는 꼴이 맞다', Array.isArray(r.걸린것) && Array.isArray(r.못잰것));
  검('🔴 실제 내린 페이지가 전부 표에 들어 있다',
    r.걸린것.length === 0 && r.못잰것.length === 0);
  검('잴 것이 하나라도 있다 — 0개면 폴더를 못 본 것이다', r.셈 > 0);

  const 실패 = 항목.filter((x) => !x.결과);
  console.log(`■ check-내린지면에-301이-걸렸나 자체 검사 ${항목.length - 실패.length}/${항목.length}`);
  for (const x of 항목) console.log(`  ${x.결과 ? '통과' : '실패'}  ${x.이름}`);
  return 실패.length === 0;
}

/* ── 실행부 ─────────────────────────────────────────────────────────── */
const 직접실행 = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (직접실행) {
  if (process.argv.includes('--자체검사')) process.exit(자체검사() ? 0 : 1);

  if (process.argv.includes('--라이브')) {
    const 것 = await 라이브로잰다();
    console.log('■ 라이브에서 내린 페이지를 눌러 본다');
    let 나쁨 = 0;
    for (const x of 것) {
      const 좋나 = x.코드 === 301 || x.코드 === 308;
      if (!좋나) 나쁨 += 1;
      console.log(`  ${좋나 ? '✅' : '🔴'} ${x.코드}  ${x.주소}${x.간곳 ? '  → ' + x.간곳 : ''}`);
    }
    process.exit(나쁨 ? 1 : 0);
  }

  const { 걸린것, 못잰것, 셈 } = 검사한다();
  if (못잰것.length) {
    console.log(`🔴 측정하지 못했다 ${못잰것.length}개 — 「걸린 것이 없다」가 아니다`);
    for (const x of 못잰것) console.log(`   ${x}`);
  }
  if (!걸린것.length && !못잰것.length) {
    console.log(`■ 내린 지면 ${셈}장 — 전부 301 이 걸려 있다`);
    process.exit(0);
  }
  if (걸린것.length) {
    console.log(`\n🔴 301 이 안 걸린 내린 지면 ${걸린것.length}장 — 구글이 여기서 404 를 받는다`);
    for (const x of 걸린것) console.log(`   ${x.주소}      (docs/내린지면/${x.이름}.astro)`);
    console.log('\n고치는 법 — server.mjs 의 «사라진지면» 표에 한 줄 넣는다.');
    console.log('   뜻이 «가까운» 살아 있는 지면으로만 보낸다. 홈으로 몰면 구글이 soft 404 로 깎는다.');
  }
  process.exit(1);
}
