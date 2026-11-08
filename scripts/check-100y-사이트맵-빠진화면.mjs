#!/usr/bin/env node
/**
 * check-100y-사이트맵-빠진화면.mjs
 * 백년지도의 고정 화면이 사이트맵에 빠지지 않았는지 검사한다.
 *
 * ── 왜 만드나 (2026-11-09) ───────────────────────────────────────────
 * 구글 색인 대장에서 `/rankings` 가 「Google에는 아직 알려지지 않은 URL입니다」로
 * 찍혀 있었다. 다른 열네 곳은 「크롤링됨 - 현재 색인이 생성되지 않음」인데 이것만
 * 달랐다. 열어 보니 화면은 200 으로 살아 있고 첫 화면에서 링크도 걸려 있는데
 * 사이트맵에만 없었다.
 *
 * 고정 화면 235개를 사이트맵과 대조하니 62개가 빠져 있었다. 전부 200 이고
 * noindex 도 걸려 있지 않았다. 구글만 모르고 있던 것이다.
 *
 * `src/pages/100y/sitemap.xml.ts` 에는 「고정 화면을 만들면 여기 한 줄을 같이
 * 넣는다」는 경고가 `/after`·`/region`·`/video` 세 번의 사고를 겪으며 세 군데
 * 적혀 있다. 그런데도 62개가 샜다. 말로 적은 규칙은 잊힌다. 그래서 검사로 둔다.
 *
 * ── 판정 방법 ────────────────────────────────────────────────────────
 * `src/pages/100y` 아래의 `.astro` 가운데 대괄호가 없는 것이 고정 화면이다.
 * 그 주소가 `sitemap.xml.ts` 본문의 `path: '/...'` 목록에 있는지 본다.
 * 없으면 「검색에는 열려 있는데 사이트맵에 없는」 상태이므로 차단한다.
 *
 * 빼는 것
 *   · `/404`  — 오류 화면이다
 *   · 원본에 noindex 가 적힌 화면 — 색인을 막기로 정한 것이다
 *
 * ⛔ 반대 방향(사이트맵에는 있는데 원본이 없는 것)은 보지 않는다. 사이트맵에는
 *   동적 화면 주소가 함께 들어 있어 원본 파일과 하나씩 맞지 않는다.
 *
 * 사용법
 *   node scripts/check-100y-사이트맵-빠진화면.mjs
 *   node scripts/check-100y-사이트맵-빠진화면.mjs --자체검사
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const 저장소루트 = fileURLToPath(new URL('..', import.meta.url));
export const 화면폴더 = path.join(저장소루트, 'src', 'pages', '100y');
export const 사이트맵파일 = path.join(화면폴더, 'sitemap.xml.ts');

/** 검사에서 빼는 주소 */
export const 제외주소 = new Set(['/404']);

/** 사이트맵 원본에 적힌 고정 주소 목록 */
export function 사이트맵주소(본문) {
  const 것 = new Set();
  for (const m of String(본문 ?? '').matchAll(/path:\s*'([^']+)'/g)) 것.add(m[1]);
  return 것;
}

/** 파일 이름과 폴더로 주소를 만든다 */
export function 주소만들기(앞, 파일이름) {
  if (파일이름 === 'index.astro') return 앞 || '/';
  return (앞 || '') + '/' + 파일이름.replace(/\.astro$/, '');
}

/** 동적 화면인가 — 대괄호가 들어간 이름이나 폴더 */
export function 동적인가(앞, 파일이름) {
  return /[[\]]/.test(앞) || /[[\]]/.test(파일이름);
}

/** 고정 화면 목록 */
export function 고정화면(폴더 = 화면폴더) {
  const 것 = [];
  const 훑는다 = (현재폴더, 앞) => {
    let 목록;
    try { 목록 = fs.readdirSync(현재폴더); } catch { return; }
    for (const 이름 of 목록) {
      const 자식 = path.join(현재폴더, 이름);
      let 정보;
      try { 정보 = fs.statSync(자식); } catch { continue; }
      if (정보.isDirectory()) { 훑는다(자식, 앞 + '/' + 이름); continue; }
      if (!/\.astro$/.test(이름)) continue;
      if (동적인가(앞, 이름)) continue;
      것.push({ 주소: 주소만들기(앞, 이름), 파일: 자식 });
    }
  };
  훑는다(폴더, '');
  return 것;
}

/**
 * 깃이 들고 있는 파일 목록. 깃이 모르는 파일은 배포되지 않으므로 검사 대상이 아니다.
 * `/school-type` 이 그런 경우다 — .gitignore 에 올라 있어 라이브가 404 다.
 * ⛔ 목록을 못 받으면 빈 집합이 아니라 null 을 돌려준다. 빈 집합이면 모든 화면이
 *   「깃이 모른다」가 되어 검사가 통째로 침묵한다.
 */
export function 깃이든것(폴더 = 화면폴더) {
  try {
    const 글 = execFileSync('git', ['ls-files', '--', 폴더], {
      cwd: 저장소루트, encoding: 'utf8', maxBuffer: 1024 * 1024 * 32,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const 것 = new Set(글.split(/\r?\n/).map((x) => x.trim()).filter(Boolean)
      .map((x) => path.resolve(저장소루트, x)));
    return 것.size ? 것 : null;
  } catch { return null; }
}

/** 원본에 색인 금지가 적혀 있나 */
export function 색인막았나(파일) {
  try { return /noindex/.test(fs.readFileSync(파일, 'utf8')); } catch { return false; }
}

/** 한 차례 검사한다 */
export function 검사한다(폴더 = 화면폴더, 사이트맵 = 사이트맵파일) {
  let 본문 = '';
  try { 본문 = fs.readFileSync(사이트맵, 'utf8'); } catch {
    return { 측정불가: '사이트맵 원본을 읽지 못했다', 빠진것: [], 살핀수: 0 };
  }
  const 실린것 = 사이트맵주소(본문);
  const 깃목록 = 깃이든것(폴더);
  const 빠진것 = [];
  const 전부 = 고정화면(폴더);
  let 깃이모르는것 = 0;
  for (const x of 전부) {
    if (제외주소.has(x.주소)) continue;
    if (깃목록 && !깃목록.has(path.resolve(x.파일))) { 깃이모르는것 += 1; continue; }
    if (실린것.has(x.주소)) continue;
    if (색인막았나(x.파일)) continue;
    빠진것.push(x.주소);
  }
  return {
    빠진것, 살핀수: 전부.length, 실린수: 실린것.size, 깃이모르는것,
    깃목록못읽음: 깃목록 == null,
  };
}

/* ── 자체 검사 ──────────────────────────────────────────────────────── */
export function 자체검사() {
  const 항목 = [];
  const 검사 = (이름, 결과) => 항목.push({ 이름, 결과: !!결과 });

  const 본문 = "{ path: '/about', priority: '0.8' }, { path: '/rankings', priority: '0.9' },";
  const 주소 = 사이트맵주소(본문);
  검사('원본에서 주소를 뽑아낸다', 주소.has('/about') && 주소.has('/rankings'));
  검사('없는 주소를 있다고 하지 않는다', !주소.has('/없는것'));
  검사('빈 원본에서 오류가 나지 않는다', 사이트맵주소('').size === 0 && 사이트맵주소(null).size === 0);

  검사('index.astro 는 폴더 주소가 된다', 주소만들기('/rankings', 'index.astro') === '/rankings');
  검사('맨 위 index.astro 는 빗금 하나다', 주소만들기('', 'index.astro') === '/');
  검사('보통 파일은 파일 이름이 주소가 된다', 주소만들기('', 'death-causes.astro') === '/death-causes');

  검사('대괄호가 든 파일은 동적 화면이다', 동적인가('', '[code].astro') === true);
  검사('대괄호가 든 폴더도 동적 화면이다', 동적인가('/school/[code]', 'index.astro') === true);
  검사('보통 파일은 동적 화면이 아니다', 동적인가('/rankings', 'index.astro') === false);

  검사('404 는 검사에서 뺀다', 제외주소.has('/404'));

  const r = 검사한다();
  검사('실제 화면 폴더를 읽는다 — 0개면 못 읽은 것이다', r.살핀수 > 0);
  검사('사이트맵에서 주소를 읽는다 — 0개면 못 읽은 것이다', (r.실린수 ?? 0) > 0);
  검사('깃 목록을 읽는다 — 못 읽으면 그렇다고 적는다', r.깃목록못읽음 === false);
  검사('깃이 모르는 파일을 세어 둔다 — 조용히 버리지 않는다', typeof r.깃이모르는것 === 'number');

  const 실패 = 항목.filter((x) => !x.결과);
  console.log(`■ check-100y-사이트맵-빠진화면 자체 검사 ${항목.length - 실패.length}/${항목.length}`);
  for (const x of 항목) console.log(`  ${x.결과 ? '통과' : '실패'}  ${x.이름}`);
  return 실패.length === 0;
}

/* ── 실행부 ─────────────────────────────────────────────────────────── */
const 직접실행 = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (직접실행) {
  if (process.argv.includes('--자체검사')) process.exit(자체검사() ? 0 : 1);

  const r = 검사한다();
  if (r.측정불가) {
    console.log(`■ 백년지도 사이트맵 검사 — 측정하지 못했다: ${r.측정불가}`);
    process.exit(1);
  }
  console.log(`■ 백년지도 사이트맵 검사 — 고정 화면 ${r.살핀수}개 · 사이트맵 주소 ${r.실린수}개`);
  if (r.깃목록못읽음) console.log('   ⚠ 깃 목록을 읽지 못했다. 배포되지 않는 화면도 함께 세었다');
  else if (r.깃이모르는것) console.log(`   깃이 모르는 화면 ${r.깃이모르는것}개는 뺐다 — 배포되지 않는다`);
  if (!r.빠진것.length) { console.log('빠진 화면이 없다'); process.exit(0); }

  console.log(`\n경고: 검색에는 열려 있는데 사이트맵에 없는 화면 ${r.빠진것.length}개`);
  for (const 주소 of r.빠진것) console.log(`   · ${주소}`);
  console.log('\nsrc/pages/100y/sitemap.xml.ts 의 entries 목록에 한 줄씩 넣는다.');
  console.log('   색인을 막을 화면이라면 그 원본에 noindex 를 적는다 — 그러면 이 검사가 넘어간다.');
  process.exit(1);
}
