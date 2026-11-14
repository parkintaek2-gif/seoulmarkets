#!/usr/bin/env node
/**
 * 올린다-저장소에.mjs — 커밋한 것을 origin/main 에 «끼이지 않고» 올린다
 * ─────────────────────────────────────────────────────────────────────────────
 * [왜 만들었나 — 2026-11-14 · 5번]
 *   `git pull --rebase --autostash` 가 이 저장소에서 **세 번째로 끼었다**
 *   (2026-10-27 두 번, 2026-11-14 한 번). 끼는 자리는 늘 같다:
 *
 *     error: unable to unlink old 'docs/고정업무-마커/날씨기사.log': Invalid argument
 *     fatal: could not reset --hard
 *
 *   ⇒ 날마다 도는 일들이 그 로그를 «쥐고 있는 채로» 다시 쓴다. 윈도우는 쥐고 있는
 *     파일을 못 지운다. autostash 는 치워 놓고 되돌리려다 실패하고, 리베이스가
 *     반쯤 선 채로 남는다. 그 사이 **커밋 안 된 작업이 스태시에 갇힌다** —
 *     오늘은 보안 점검기의 9일 묵은 수정이 그렇게 사라질 뻔했다.
 *
 * [어떻게 고치나]
 *   치우지 않는다. **커밋하고 간다.**
 *   ① 저절로 다시 쓰이는 파일(아래 목록)만 「자동 갱신 파일 정리」로 커밋한다
 *   ② 그래도 더러운 것이 남으면 «멈춘다» — 남의 유닛 작업일 수 있다. 치우지 않는다
 *   ③ 깨끗해진 뒤에 fetch + rebase 한다. 실패하면 **반드시 abort 하고** 알린다
 *
 * ⛔ 이 자는 `git stash` 를 쓰지 않는다. 스태시는 일을 숨기고, 숨은 일은 잊힌다.
 *
 * [쓰는 법]
 *   node scripts/올린다-저장소에.mjs
 *   node scripts/올린다-저장소에.mjs --본다      # 무엇을 할지만 적고 아무것도 안 한다
 *   node scripts/올린다-저장소에.mjs --자가시험
 */
import { execFileSync } from 'node:child_process';

/** 저절로 다시 쓰이는 파일 — 사람이 손으로 고치는 것이 아니라 도는 일이 적는 것 */
export const 저절로쓰이는것 = [
  /^docs\/고정업무-마커\//,
  /^docs\/.*\.log$/,
  /^\.?[^/]*\.log$/,
  /^docs\/(매시소통|손님길점검|회차-뜬시각-잰기록|indexnow-보낸기록|indexnow-보낸기록-주소|날마다-색인SEO지오-대장|보낸메일)\.tsv$/,
  /^src\/data\/invest-ai\//,
  /^src\/data\/(korea-index-tape|korea-valuation-tape|research-stats)\.json$/,
  /^src\/data\/100yearmap\/lastmod\.json$/,
  /^public\/deploy-stamp\.txt$/,
];

export function 저절로쓰이나(길) {
  return 저절로쓰이는것.some((r) => r.test(길));
}

/** `git status --porcelain -z` 한 줄에서 길을 뽑는다 (이름이 바뀐 것은 뒤쪽이 지금 이름) */
export function 길뽑기(줄) {
  const s = 줄.slice(3);
  const i = s.indexOf(' -> ');
  return i === -1 ? s : s.slice(i + 4);
}

/** 더러운 것들을 «저절로 쓰이는 것»과 «사람이 손댄 것»으로 가른다 */
export function 가른다(길들) {
  const 저절로 = [], 사람 = [];
  for (const g of 길들) (저절로쓰이나(g) ? 저절로 : 사람).push(g);
  return { 저절로, 사람 };
}

const 깃 = (...a) => execFileSync('git', a, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

function 더러운것() {
  /* -z 는 한글 길을 따옴표 없이 그대로 준다 — core.quotepath 에 안 흔들린다 */
  const out = execFileSync('git', ['status', '--porcelain', '-z', '--untracked-files=no'],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return out.split('\0').filter(Boolean).map(길뽑기);
}

async function 간다({ 본다 }) {
  const 더럽 = 더러운것();
  const { 저절로, 사람 } = 가른다(더럽);

  if (사람.length) {
    console.log('🔴 손으로 고친 것이 남아 있다 — 치우지 않는다. 먼저 커밋하거나 되돌려라:');
    for (const g of 사람) console.log('   ' + g);
    console.log('\n⛔ 이 자는 남의 유닛 작업을 숨기지 않는다. 스태시로 치우면 그대로 잊힌다.');
    return 1;
  }

  if (저절로.length) {
    console.log(`저절로 다시 쓰이는 파일 ${저절로.length}개를 먼저 커밋한다`);
    for (const g of 저절로) console.log('   ' + g);
    if (!본다) {
      깃('add', '--', ...저절로);
      /* add 하고도 비어 있을 수 있다 — 내용이 되돌아온 경우 */
      const 있나 = 깃('diff', '--cached', '--name-only').trim();
      if (있나) 깃('commit', '-m', '자동 갱신 파일 정리 (배포 관문)');
    }
  }

  if (본다) { console.log('[본다] 여기서 fetch + rebase + push 를 했을 것이다'); return 0; }

  깃('fetch', 'origin', 'main');
  try {
    깃('rebase', 'origin/main');
  } catch (e) {
    console.log('🔴 리베이스가 실패했다 — 반쯤 선 채로 두지 않는다. 되돌린다.');
    try { 깃('rebase', '--abort'); } catch { /* 이미 끝난 리베이스 */ }
    console.log(String(e.stdout || '') + String(e.stderr || ''));
    return 1;
  }
  깃('push', 'origin', 'main');
  console.log('✅ 올렸다 — ' + 깃('log', '--oneline', '-1').trim());
  return 0;
}

function 자가시험() {
  let 통과 = 0, 깨짐 = 0;
  const 참 = (이름, 값) => { if (값) { 통과 += 1; } else { 깨짐 += 1; console.log('🔴 ' + 이름); } };

  참('고정업무-마커 아래는 저절로 쓰이는 것이다', 저절로쓰이나('docs/고정업무-마커/날씨기사.log'));
  참('docs 아래 .log 는 저절로 쓰이는 것이다', 저절로쓰이나('docs/4번-대화록백업.log'));
  참('뿌리의 .log 도 저절로 쓰이는 것이다', 저절로쓰이나('.auto-2300-report.log'));
  참('매시소통.tsv 는 저절로 쓰이는 것이다', 저절로쓰이나('docs/매시소통.tsv'));
  참('invest-ai 자료는 저절로 쓰이는 것이다', 저절로쓰이나('src/data/invest-ai/state-latest.jsonl'));
  참('배포 도장은 저절로 쓰이는 것이다', 저절로쓰이나('public/deploy-stamp.txt'));

  참('🔴 글은 저절로 쓰이는 것이 «아니다»', !저절로쓰이나('content/articles/a.md'));
  참('🔴 검사기는 저절로 쓰이는 것이 «아니다»', !저절로쓰이나('scripts/check-네사이트-보안-라이브.mjs'));
  참('🔴 세션간 메모는 저절로 쓰이는 것이 «아니다» — 사람이 적는다',
    !저절로쓰이나('docs/세션간-메모.md'));
  참('🔴 지면은 저절로 쓰이는 것이 «아니다»', !저절로쓰이나('src/pages/100y/x/index.astro'));
  참('🔴 보낸메일.tsv 말고 다른 tsv 는 안 집는다', !저절로쓰이나('docs/사장님-지시-대장.tsv'));

  참('길뽑기 — 보통 줄', 길뽑기(' M docs/매시소통.tsv') === 'docs/매시소통.tsv');
  참('길뽑기 — 이름이 바뀐 줄은 «지금» 이름을 준다',
    길뽑기('R  옛것.md -> 새것.md') === '새것.md');
  참('길뽑기 — 한글 길이 그대로 온다', 길뽑기('M  docs/세션간-메모.md') === 'docs/세션간-메모.md');

  const g = 가른다(['docs/고정업무-마커/a.log', 'scripts/b.mjs', 'src/data/invest-ai/c.jsonl']);
  참('가른다 — 저절로 둘', g.저절로.length === 2);
  참('가른다 — 사람 하나', g.사람.length === 1 && g.사람[0] === 'scripts/b.mjs');

  /* 🔴 [2026-11-14] 끼인 자리의 핵심 — 스태시를 쓰면 일이 숨는다 */
  참('⛔ 이 자는 stash 라는 말을 쓰지 않는다',
    !/['"`]stash['"`]/.test(간다.toString()));

  console.log(깨짐 ? `🔴 자가시험 ${깨짐}개 깨졌다 (통과 ${통과})` : `✅ 자가시험 ${통과} 통과`);
  return 깨짐 ? 1 : 0;
}

if (process.argv.includes('--자가시험')) process.exit(자가시험());
else process.exit(await 간다({ 본다: process.argv.includes('--본다') }));
