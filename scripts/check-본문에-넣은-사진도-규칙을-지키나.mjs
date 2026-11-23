#!/usr/bin/env node
/**
 * check-본문에-넣은-사진도-규칙을-지키나.mjs
 *   — **대표 사진만 검사하고 본문 사진은 그냥 통과시키고 있었다.**
 *
 * ── 🔴🔴🔴 왜 (2026-10-29 · 5번) ──────────────────────────────────────
 * 사장님: 「**모레노는 축구협회, 손흥민은 소속팀에서 찾아서 하나라도 써**」
 *        「**엠블럼 말고 감독이나 선수 사진을 가급적 써**」
 *
 * 사진을 두 장 넣었다 — 대표(모레노)와 본문(손흥민). 그런데 사진 규칙은
 * `src/lib/리뷰사진규칙.mjs` 가 **프런트매터의 `image` 한 칸만** 본다.
 * 본문 마크다운에 `![](...)` 로 넣은 사진은 **아무도 안 본다** —
 * 제공처를 안 적어도, 바깥 서버를 그대로 가리켜도, 엠블럼을 걸어도 빌드가 통과한다.
 *
 * ⛔ 「이번에는 내가 잘 적었다」는 규칙이 아니다. 다음에 적는 사람은 잊는다.
 *   강령 ④ — 말로 하는 규칙은 잊힌다. 겪은 것은 **검사**로 굳힌다.
 *
 * ── 본문 사진이 지켜야 하는 것 ────────────────────────────────────────
 * ① 주소가 `/review/…` 다 — 내려받아 우리 서버에 둔다(바깥 서버에 부하를 떠넘기지 않는다)
 * ② 파일이 `public/wikitip/review/…` 에 실제로 있다 (세 사이트가 한 서버를 쓴다)
 * ③ 대체텍스트가 있다 — 안 보이는 분도 이 사진이 무엇인지 아셔야 한다
 * ④ **사진 바로 아래에 제공처가 적혀 있다** — 남의 사진을 출처 없이 싣지 않는다
 * ⑤ 스포츠 리뷰면 엠블럼·로고가 아니다 (사장님 2026-10-26)
 *
 * 쓰는 법
 *   node scripts/check-본문에-넣은-사진도-규칙을-지키나.mjs
 *   node scripts/check-본문에-넣은-사진도-규칙을-지키나.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const 뿌리 = fileURLToPath(new URL('..', import.meta.url));

/** 프런트매터를 떼고 본문만 돌려준다 */
export function 본문만(글) {
  const s = String(글 ?? '');
  if (!s.startsWith('---')) return s;
  const 끝 = s.indexOf('\n---', 3);
  return 끝 < 0 ? s : s.slice(끝 + 4);
}

/** 프런트매터에서 분류(category)를 읽는다 — ⛔ 못 읽으면 null 이다. 지어내지 않는다 */
export function 분류를읽는다(글) {
  const m = String(글 ?? '').match(/^category:\s*["']?([A-Za-z0-9_-]+)["']?\s*$/m);
  return m ? m[1] : null;
}

/**
 * 본문에서 마크다운 사진을 찾는다.
 * @returns {{대체텍스트:string, src:string, 뒤에오는글:string}[]}
 */
export function 본문사진들(본문) {
  const s = String(본문 ?? '');
  const 들 = [];
  const 자 = /!\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g;
  let m = 자.exec(s);
  while (m) {
    들.push({
      대체텍스트: m[1],
      src: m[2],
      /* 사진 바로 뒤 300자 — 제공처를 여기 적어야 한다 */
      뒤에오는글: s.slice(m.index + m[0].length, m.index + m[0].length + 300),
    });
    m = 자.exec(s);
  }
  return 들;
}

/** 제공처가 적혀 있나 — 「/ 어디어디」 꼴이나 「제공」·「… 제공처」를 본다 */
export function 제공처가적혔나(뒤에오는글) {
  const s = String(뒤에오는글 ?? '');
  /* 기울임 캡션 안의 「/ 로스앤젤레스 FC」 꼴 */
  if (/\/\s*\S/.test(s.split('\n').slice(0, 4).join('\n'))) return true;
  if (/제공|출처/.test(s.slice(0, 200))) return true;
  return false;
}

const 엠블럼어휘 = [
  'logo', 'emblem', 'crest', 'wordmark', 'isotype', 'symbolmark', 'lockup',
  '엠블럼', '엠블렘', '로고', '심벌', '심볼', '휘장',
];

/** 스포츠 계열 분류 — ⛔ 목록을 여기서 짓지 않는다. 정본에서 읽는다 */
async function 스포츠인가(분류) {
  try {
    const m = await import(pathToFileURL(path.join(뿌리, 'src', 'lib', '리뷰분류.mjs')).href);
    return !!(분류 && m.스포츠계열인가 && m.스포츠계열인가(분류));
  } catch (e) { return false; }
}

/**
 * 글 한 편의 본문 사진을 잰다.
 * @param 글 파일 전체(프런트매터 포함)
 * @param 있나 (파일경로) => boolean — 검사용으로 갈아끼울 수 있게 둔다
 */
export function 본문사진위반(글, 있나, 스포츠다 = false) {
  const 흠 = [];
  const 들 = 본문사진들(본문만(글));
  for (const 사진 of 들) {
    const 이름 = 사진.src.slice(0, 70);
    if (!사진.src.startsWith('/review/')) {
      흠.push(`본문 사진은 내려받아 우리 서버에 둔다 — /review/… 로 적는다 (지금: ${이름})`);
      continue;                         /* 바깥 주소면 아래 파일 검사가 뜻이 없다 */
    }
    if (typeof 있나 === 'function' && !있나(`public/wikitip${사진.src}`)) {
      흠.push(`본문 사진 파일이 없다 — public/wikitip${사진.src} 에 두어야 404 가 아니다`);
    }
    if (!사진.대체텍스트 || !사진.대체텍스트.trim()) {
      흠.push(`본문 사진에 대체텍스트가 없다 (${이름}) — 안 보이는 분이 이 사진을 못 아신다`);
    }
    if (!제공처가적혔나(사진.뒤에오는글)) {
      흠.push(`본문 사진 바로 아래에 제공처가 없다 (${이름}) — 「… / 로스앤젤레스 FC」처럼 적는다`);
    }
    if (스포츠다) {
      const 글자 = (사진.대체텍스트 + ' ' + 사진.src).toLowerCase();
      const 적출 = 엠블럼어휘.filter((w) => 글자.includes(w));
      if (적출.length) {
        흠.push(`스포츠 리뷰 본문에 엠블럼·로고를 넣었다 (적출: ${적출.join(', ')}) — `
          + '구단·협회가 낸 «사람이 나오는 사진»을 쓴다');
      }
    }
  }
  return 흠;
}

if (process.argv.includes('--자가시험')) {
  let 총 = 0; let 흠 = 0;
  const 본다 = (이름, 참) => { 총 += 1; if (참) console.log('  ✅ ' + 이름); else { 흠 += 1; console.log('  ❌ ' + 이름); } };
  const 있다 = () => true;
  const 머리 = '---\ncategory: football\n---\n';

  본다('사진이 없으면 흠도 없다', 본문사진위반(머리 + '그냥 글이다', 있다).length === 0);
  본다('성한 본문 사진은 통과한다',
    본문사진위반(머리 + '![손흥민](/review/a.png)\n\n*설명이다. / 로스앤젤레스 FC*', 있다).length === 0);
  본다('🔴 바깥 서버를 가리키면 막는다',
    본문사진위반(머리 + '![손흥민](https://남의곳/a.png)\n\n*글 / 어디*', 있다)
      .some((h) => h.includes('우리 서버')));
  본다('🔴 대체텍스트가 없으면 막는다',
    본문사진위반(머리 + '![](/review/a.png)\n\n*글 / 어디*', 있다)
      .some((h) => h.includes('대체텍스트')));
  본다('🔴 제공처가 없으면 막는다',
    본문사진위반(머리 + '![손흥민](/review/a.png)\n\n그냥 다음 문단이다.', 있다)
      .some((h) => h.includes('제공처')));
  본다('🔴 파일이 없으면 막는다',
    본문사진위반(머리 + '![손흥민](/review/a.png)\n\n*글 / 어디*', () => false)
      .some((h) => h.includes('파일이 없다')));
  본다('🔴 스포츠 본문에 엠블럼을 넣으면 막는다',
    본문사진위반(머리 + '![젠지 엠블럼](/review/geng_logo.png)\n\n*글 / 라이엇 게임즈*', 있다, true)
      .some((h) => h.includes('엠블럼')));
  본다('⛔ 스포츠가 아니면 엠블럼 금지를 안 건다',
    본문사진위반(머리 + '![어떤 로고](/review/a_logo.png)\n\n*글 / 어디*', 있다, false)
      .some((h) => h.includes('엠블럼')) === false);
  본다('사진이 둘이면 둘 다 본다',
    본문사진위반(머리 + '![a](/review/a.png)\n\n문단\n\n![b](/review/b.png)\n\n문단', 있다).length === 2);
  본다('프런트매터 안의 글자를 본문으로 읽지 않는다',
    본문사진들(본문만('---\nimage:\n  src: "/review/x.jpg"\n---\n본문이다')).length === 0);
  본다('분류를 읽는다', 분류를읽는다(머리) === 'football');
  본다('⛔ 분류를 못 읽으면 null 이다 — 지어내지 않는다', 분류를읽는다('아무 글') === null);

  console.log('\n  ' + (총 - 흠) + '/' + 총 + ' 통과');
  process.exit(흠 ? 1 : 0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const 방 = path.join(뿌리, 'content', 'kcw-reviews');
  /* [2026-11-23 · 1번] K Culture Wire 를 접으며 리뷰 폴더가 없어졌다. 폴더가 없으면 검사할 글이
     없으니 통과로 읽는다 — 이 검사가 폴더 없음으로 죽어 배포 관문 전체를 막고 있었다. */
  if (!fs.existsSync(방)) { console.log('✅ 리뷰 폴더가 없다 — 모두 규칙을 지킨다 — 접은 사이트라 검사할 글이 없다 (' + 방 + ')'); process.exit(0); }
  const 글들 = fs.readdirSync(방).filter((f) => f.endsWith('.md'));
  const 있나 = (상대) => fs.existsSync(path.join(뿌리, 상대));
  let 막을것 = 0; let 사진수 = 0;
  for (const 이름 of 글들) {
    const 글 = fs.readFileSync(path.join(방, 이름), 'utf8');
    const 분류 = 분류를읽는다(글);
    const 스포츠다 = await 스포츠인가(분류);
    사진수 += 본문사진들(본문만(글)).length;
    const 흠들 = 본문사진위반(글, 있나, 스포츠다);
    for (const h of 흠들) { console.log('🔴 ' + 이름 + ' — ' + h);막을것 += 1; }
  }
  if (막을것) {
    console.log('\n⛔ 본문 사진 ' + 막을것 + '가지가 규칙에 어긋난다 — 배포하지 않는다');
    process.exit(1);
  }
  console.log('✅ 본문에 넣은 사진 ' + 사진수 + '장이 모두 규칙을 지킨다 (리뷰 ' + 글들.length + '편)');
  process.exit(0);
}
