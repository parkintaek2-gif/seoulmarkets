#!/usr/bin/env node
/**
 * 커밋 전 관문 — «담긴(staged) 기사»의 앞말 한도를 커밋 «전»에 잡는다
 *
 * ── 왜 (2026-09-10 · 5번) ─────────────────────────────────────────
 * 3번이 15:2x 에 적었다 — 「오늘 dek 초과로 빌드가 막힌 것이 세 번째입니다」
 *
 * 세 번 다 «내» 기사였다. 그리고 세 번 다 같은 꼴이었다 —
 *   기사를 쓴다 → 커밋한다 → 검사를 돌린다 → 걸린다 → 그 사이 «여섯이 다» 빌드를 못 한다
 *
 * ⛔ 내가 더 조심하는 것으로는 안 고쳐진다. 오늘 세 번 조심했다.
 * ✅ 순서를 바꾼다 — 검사를 «커밋 앞»에 둔다. 그러면 깨진 것이 트리에 들어오지 못한다.
 *
 * ── ⚠ 남을 막지 않으려고 좁혀 둔 것 ──────────────────────────────
 * 여섯 자리가 «한 .git» 을 같이 쓴다. 그래서 훅은 남의 커밋에도 돈다.
 * 그러므로 이 관문은 «헛것을 잡을 수 없는 것»만 본다 —
 *   담긴 content/kculturewire/*.md 의 title·dek 글자 수. 스키마에서 한도를 «읽어» 쓴다.
 *   ⛔ 어림·짐작·경고성 규칙을 넣지 않는다. 넣으면 남이 훅을 끈다.
 * ⭐ 그리고 끄는 법을 스스로 적어 낸다 — 막힌 사람이 5분 안에 빠져나갈 수 있어야 한다.
 *
 * 쓰는 법
 *   node tools/커밋전관문.mjs --자가시험
 *   node tools/커밋전관문.mjs --건다        .git/hooks/pre-commit 을 만든다
 *   node tools/커밋전관문.mjs --뗀다        훅을 뗀다
 *   node tools/커밋전관문.mjs               지금 담긴 것을 검사한다 (훅이 이것을 부른다)
 *   node tools/커밋전관문.mjs --전부        커밋 여부와 상관없이 content 전체를 본다
 *
 * ── 🔴 왜 --전부 를 더했나 (2026-11-16 · 5번) ──────────────────────
 *   오늘 아침 빌드가 통째로 죽었다 — 한 기사의 title 이 123자(한도 120)였다.
 *   그 파일은 **커밋되지 않은 채** 작업 중이었고, 이 관문은 «담긴 것»만 보므로
 *   한 번도 보지 않았다. 빌드는 파일이 거기 있기만 하면 읽는다.
 *   ⇒ 커밋 앞에 두는 것만으로는 모자라다. **빌드 앞**에도 둘 수 있어야 한다.
 *   어제는 리뷰 한 편의 category 값이 같은 일을 했다(check-리뷰분류.mjs 로 막았다).
 *   ⛔ 한 사람이 조심하는 것으로는 안 고쳐진다 — 4분짜리 빌드로 알아내지 않는다.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/**
 * 🔴 [2026-09-22] **`content/articles/` 를 안 보고 있었다.** 오늘 그 자리에서 두 번 막혔다 —
 * 새벽에 내가(5번) SeoulMarkets 기사 dek 을 250자로 적어 빌드가 죽었고, 아침에 1번의
 * KCW 기사가 또 죽었다. 스키마 한도(240)는 두 갈래에 «똑같이» 걸려 있는데
 * 이 관문은 한 갈래만 보고 있었다. 여섯 자리가 한 작업트리를 쓰므로 한쪽이 막히면 모두 막힌다.
 * ⛔ 「조심하겠다」로 두지 않는다 — 관문이 본다.
 */
export const 볼갈래 = /^content\/(kculturewire|articles)\/.+\.md$/;
/** ⚠ 짐작하지 않고 찾았다 — `src/content.config.ts` 다(`src/content/config.ts` 가 아니다) */
export const 스키마길 = 'src/content.config.ts';

/** 스키마에서 한도를 읽는다. ⛔ 240 을 여기 적어 두지 않는다 — 스키마가 바뀌면 어긋난다 */
export function 한도읽기(글) {
  const 나온것 = {};
  for (const [, 이름, 수] of String(글 ?? '').matchAll(/(\w+):\s*z\.string\(\)[^,\n]*?\.max\((\d+)\)/g)) {
    나온것[이름] = Number(수);
  }
  return 나온것;
}

/** 앞말에서 한 값을 뽑는다. 여러 줄 값은 다루지 않는다 — 한도가 걸린 것은 한 줄이다 */
export function 앞말값(앞말, 이름) {
  const m = String(앞말 ?? '').match(new RegExp(`^${이름}:\\s*(.*)$`, 'm'));
  if (!m) return null;
  return m[1].trim().replace(/^["']|["']$/g, '');
}

export function 앞말떼기(원문) {
  const m = String(원문 ?? '').match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return m ? m[1] : null;
}

/**
 * 한 파일을 재서 넘친 것을 낸다.
 * @returns {{이름:string, 길이:number, 한도:number, 넘침:number}[]}
 */
export function 넘친것(원문, 한도표) {
  const 앞말 = 앞말떼기(원문);
  if (앞말 == null) return [];   // 앞말이 없는 것은 이 관문이 다루지 않는다
  const 낸것 = [];
  for (const [이름, 한도] of Object.entries(한도표 ?? {})) {
    const v = 앞말값(앞말, 이름);
    if (v == null) continue;
    if (v.length > 한도) 낸것.push({ 이름, 길이: v.length, 한도, 넘침: v.length - 한도 });
  }
  return 낸것;
}

/** 몇 자를 줄여야 하나를 «사람이 바로 쓸 수 있게» 적는다 */
export function 고칠말(파일, 넘침들) {
  return 넘침들.map((n) =>
    `   🔴 ${path.basename(파일)}  ${n.이름} ${n.길이}자 (한도 ${n.한도}) — ${n.넘침}자 줄이십시오`);
}

export const 끄는법 = [
  '   ▶ 급해서 그냥 커밋해야 하면:  git commit --no-verify',
  '   ▶ 훅을 아예 떼려면:          node tools/커밋전관문.mjs --뗀다',
  '   ⭐ 이 관문은 «담긴 기사»의 title·dek 글자 수만 봅니다. 스키마에서 한도를 읽습니다.',
];

/* ── 자가시험 ───────────────────────────────────────────────────── */

function 자가시험() {
  let 통과 = 0, 실패 = 0;
  const 자가 = (이름, 참) => { if (참) { 통과 += 1; console.log('  ✅ ' + 이름); } else { 실패 += 1; console.log('  ⛔ ' + 이름); } };
  console.log('자가시험 — tools/커밋전관문.mjs');

  // 한도 읽기 — 숫자를 여기 적지 않는다
  const 표 = 한도읽기('title: z.string().max(120),\n    dek: z.string().max(240),');
  자가('스키마에서 title 한도를 읽는다', 표.title === 120);
  자가('스키마에서 dek 한도를 읽는다', 표.dek === 240);
  자가('⛔ 240 을 코드에 박아 두지 않았다', !/240/.test(String(한도읽기)));
  자가('없는 글에서는 빈 표', Object.keys(한도읽기('')).length === 0);
  자가('null 도 견딘다', Object.keys(한도읽기(null)).length === 0);

  // 앞말
  자가('앞말을 뗀다', 앞말떼기('---\ndek: "a"\n---\n본문') === 'dek: "a"');
  자가('⛔ 앞말이 없으면 null', 앞말떼기('본문만') === null);
  자가('앞말값을 뽑는다', 앞말값('dek: "abc"', 'dek') === 'abc');
  자가('따옴표를 뗀다', 앞말값("dek: 'abc'", 'dek') === 'abc');
  자가('없는 칸은 null', 앞말값('title: "x"', 'dek') === null);
  자가('다른 줄을 잘못 집지 않는다', 앞말값('mydek: "zzz"\ndek: "abc"', 'dek') === 'abc');

  // 넘침
  const 한도 = { title: 120, dek: 240 };
  자가('한도 안이면 안 잡는다', 넘친것(`---\ndek: "${'a'.repeat(240)}"\n---`, 한도).length === 0);
  자가('🔴 한 자만 넘어도 잡는다', 넘친것(`---\ndek: "${'a'.repeat(241)}"\n---`, 한도).length === 1);
  자가('몇 자 넘었는지 센다', 넘친것(`---\ndek: "${'a'.repeat(253)}"\n---`, 한도)[0].넘침 === 13);
  자가('title 도 본다', 넘친것(`---\ntitle: "${'a'.repeat(121)}"\n---`, 한도)[0].이름 === 'title');
  자가('둘 다 넘치면 둘 다 잡는다',
    넘친것(`---\ntitle: "${'a'.repeat(121)}"\ndek: "${'a'.repeat(241)}"\n---`, 한도).length === 2);
  자가('⛔ 앞말이 없으면 아무것도 잡지 않는다', 넘친것('본문만', 한도).length === 0);
  자가('⛔ 한도표가 비면 아무것도 잡지 않는다', 넘친것(`---\ndek: "${'a'.repeat(999)}"\n---`, {}).length === 0);

  // 고칠 말 — 사람이 바로 쓸 수 있어야 한다
  const 말 = 고칠말('content/kculturewire/x.md', 넘친것(`---\ndek: "${'a'.repeat(241)}"\n---`, 한도));
  자가('몇 자 줄이라고 적는다', /1자 줄이십시오/.test(말[0]));
  자가('파일 이름을 적는다', /x\.md/.test(말[0]));

  // 갈래 — 남의 파일을 안 본다
  자가('KCW 기사를 본다', 볼갈래.test('content/kculturewire/a.md'));
  자가('⛔ 남의 갈래는 안 본다', 볼갈래.test('src/pages/100y/x.astro') === false);
  /* 🔴 [2026-09-22] 여기 「⛔ 다른 콘텐트도 안 본다」로 적혀 있었다. 그 한 줄 때문에
     SeoulMarkets 기사 dek 이 그대로 지나가 공용 빌드가 죽었다. 스키마 한도는 두 갈래에
     똑같이 걸려 있으므로 관문도 두 갈래를 본다. */
  자가('⭐ SeoulMarkets 기사도 본다 — 같은 한도가 걸려 있다', 볼갈래.test('content/articles/a.md'));
  자가('⛔ 100y 마크다운은 안 본다 — 그쪽은 스키마가 다르다', 볼갈래.test('content/100y/a.md') === false);

  // 🔴 git 이 «감싸서» 낸 경로 — -z 를 안 쓰면 이 꼴로 온다. 그래서 조용히 통과했다
  자가('⛔ 따옴표로 감싸인 경로는 안 맞는다 (그래서 -z 로 받는다)',
    볼갈래.test('"content/kculturewire/zz-\\355\\233\\205.md"') === false);
  자가('한글 이름도 -z 로 받으면 맞는다', 볼갈래.test('content/kculturewire/훅시험.md') === true);
  자가('영문 이름은 물론 맞는다', 볼갈래.test('content/kculturewire/a-b-c.md') === true);

  // 끄는 법을 스스로 낸다
  자가('끄는 법에 --no-verify 가 있다', 끄는법.some((x) => /--no-verify/.test(x)));
  자가('훅을 떼는 법도 있다', 끄는법.some((x) => /--뗀다/.test(x)));

  console.log(`\n통과 ${통과} · 실패 ${실패}`);
  return 실패 === 0;
}

/* ── 실행 ───────────────────────────────────────────────────────── */

const 내가실행됐다 = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
const 훅길 = '.git/hooks/pre-commit';

if (내가실행됐다) {
  if (process.argv.includes('--자가시험')) process.exit(자가시험() ? 0 : 1);

  if (process.argv.includes('--뗀다')) {
    if (fs.existsSync(훅길)) { fs.unlinkSync(훅길); console.log('✅ 훅을 뗐다 — ' + 훅길); }
    else console.log('⬜ 훅이 없다');
    process.exit(0);
  }

  if (process.argv.includes('--건다')) {
    if (fs.existsSync(훅길)) {
      // ⛔ 남이 걸어 둔 훅을 덮지 않는다
      console.error('⛔ 이미 pre-commit 훅이 있다 — 덮지 않는다. 열어 보고 손으로 합치십시오: ' + 훅길);
      process.exit(1);
    }
    fs.mkdirSync(path.dirname(훅길), { recursive: true });
    fs.writeFileSync(훅길,
      '#!/bin/sh\n' +
      '# 커밋 전 관문 — 담긴 KCW 기사의 title·dek 글자 수만 본다 (5번, 2026-09-10)\n' +
      '# 오늘 dek 초과로 «공용 빌드»가 세 번 막혔다. 그래서 검사를 커밋 앞에 둔다.\n' +
      '# 빠져나가려면: git commit --no-verify   ·  떼려면: node tools/커밋전관문.mjs --뗀다\n' +
      'node "scripts/직전판.mjs" --찍는다 --조용히 || true\n' +
      'node "tools/커밋전관문.mjs" || exit 1\n' +
      '#\n' +
      '# 🔴 [2026-11-19 · 사장님] 「제 때 보고하면 배포 막힐 일 없잖아」\n' +
      '#   업무보고를 안 내면 커밋을 막는다. 5번 자리(CLAUDE_SEAT=5)만 막는다.\n' +
      'node "scripts/보고안내면-커밋막는다.mjs" || exit 1\n' +
      '#\n' +
      '# 🔴 [2026-11-19 · 사장님] 「지시 대장에 맨날 넣고 안따르잖아. 무조건 따르게끔 조치하라고」\n' +
      '#   마크다운에만 적고 정본(docs/5번-사장님-지시-이력.tsv)에 안 넣은 날이 있으면 막는다.\n' +
      'node "scripts/지시가-굳었나-관문.mjs" --막는다 || exit 1\n', 'utf8');
    try { fs.chmodSync(훅길, 0o755); } catch { /* 윈도에서는 없어도 돈다 */ }
    console.log('✅ 훅을 걸었다 — ' + 훅길);
    for (const 줄 of 끄는법) console.log(줄);
    process.exit(0);
  }

  // 검사 — 훅이 부르는 자리
  const 전부보기 = process.argv.includes('--전부');
  let 담긴것 = [];
  if (전부보기) {
    /* 🔴 [2026-11-16] 커밋 안 된 작업 중 파일도 빌드를 죽인다 — 그래서 트리를 직접 훑는다 */
    const 훑기 = (자리) => {
      let 나온것 = [];
      let 들 = [];
      try { 들 = fs.readdirSync(자리, { withFileTypes: true }); } catch { return 나온것; }
      for (const d of 들) {
        const q = path.join(자리, d.name).split(path.sep).join('/');
        if (d.isDirectory()) 나온것 = 나온것.concat(훑기(q));
        else if (볼갈래.test(q)) 나온것.push(q);
      }
      return 나온것;
    };
    담긴것 = 훑기('content');
    console.log('■ content 전체를 본다 — ' + 담긴것.length + '편');
  } else try {
    // 🔴 `-z` 로 받는다. 없으면 git 이 «한글 경로를 따옴표와 8진 escape 로» 감싸서 낸다 —
    //   "content/kculturewire/zz-\355\233\205....md" 꼴이 되어 정규식이 못 맞추고 «조용히 통과»한다.
    //   2026-09-10 에 실제로 그렇게 통과했다(시험 커밋이 두 개 들어갔다).
    //   ⭐ 한글 이름으로 시험한 덕에 잡혔다 — 영문 이름으로만 시험하면 못 잡는 결함이었다.
    담긴것 = execFileSync('git', ['diff', '--cached', '--name-only', '-z', '--diff-filter=ACM'], { encoding: 'utf8' })
      .split('\0').map((s) => s.trim()).filter((s) => 볼갈래.test(s));
  } catch {
    // ⛔ git 을 못 부르면 «막지 않는다». 관문이 커밋을 못 하게 만드는 것이 더 나쁘다
    process.exit(0);
  }
  if (담긴것.length === 0) {
    if (전부보기) console.log('⬜ 볼 글이 없다 — content 아래에 해당 갈래가 없다');
    process.exit(0);
  }

  let 한도표 = {};
  try { 한도표 = 한도읽기(fs.readFileSync(스키마길, 'utf8')); } catch { 한도표 = {}; }
  if (Object.keys(한도표).length === 0) {
    console.log('⬜ 스키마에서 한도를 못 읽었다 — 막지 않는다 (' + 스키마길 + ')');
    process.exit(0);
  }

  const 걸린것 = [];
  for (const f of 담긴것) {
    let 원문;
    try { 원문 = fs.readFileSync(f, 'utf8'); } catch { continue; }
    const 넘침 = 넘친것(원문, 한도표);
    if (넘침.length) 걸린것.push(...고칠말(f, 넘침));
  }
  if (걸린것.length === 0) process.exit(0);

  console.error('\n⛔ 커밋 전 관문에 막혔다 — 이대로 커밋하면 «여섯이 다» 빌드를 못 한다\n');
  for (const 줄 of 걸린것) console.error(줄);
  console.error('');
  for (const 줄 of 끄는법) console.error(줄);
  console.error('');
  process.exit(1);
}
