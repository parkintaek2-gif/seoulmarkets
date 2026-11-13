#!/usr/bin/env node
/**
 * build-session-entry.mjs — **바탕화면 세션입구(단추)를 «자리 목록에서» 짓는다.**
 *
 * 🔴 사장님 지시 (2026-09-27, 원문)
 *   「**현재 없는 3, 4, 6번은 빼라**」
 *   「**세션입구도 같이 수정해..세션입구가 제대로 작동하는 지 꼭 테스트해봐**」
 *
 * ── 왜 손으로 안 쓰나 ────────────────────────────────────────────
 * 단추가 자리마다 한 파일씩 있고, 자리 정의는 또 다른 곳에 있었다. 자리가 바뀌면
 * 두 곳을 다 고쳐야 하는데 한쪽을 잊으면 «단추는 3번을 열려 하는데 3번은 없는» 상태가 된다.
 * 실제로 2026-09-27 아침에 지킴이가 없는 3·4번을 두고 「단추가 없다」를 되풀이했다.
 * ⇒ 단추는 `scripts/lib/seats.mjs` 하나에서 «지어 낸다».
 *
 * ── 🔴 이번에 고친 진짜 결함 ─────────────────────────────────────
 * 옛 단추에 **`CLAUDE_CONFIG_DIR` 이 없었다.** 그런데 자리들은 `.claude-u1/u2/u5` 를 쓴다.
 * 그대로 두면 단추를 눌렀을 때 기본 `.claude` 가 열려 **그 자리의 대화가 없는 빈 창**이 뜬다.
 * 2026-08 에 그 병으로 나흘치 대화를 잃었다. 이제 단추가 설정폴더를 «심는다».
 *
 * ── 🔴 박아 둔 세션 ID 를 없앴다 ──────────────────────────────────
 * 옛 단추는 8월에 박아 둔 ID 를 둘째 수단으로 썼다. 한 달이 지나 그 ID 는 죽었고,
 * 죽은 ID 로 resume 하면 오류만 난다. ⇒ `_현재\N.id`(창이 스스로 적는 것)가 정본이고,
 * 없으면 실물을 «찾는다». 낡은 값을 파일에 굳혀 두지 않는다.
 *
 * 쓰는 법
 *   node scripts/build-session-entry.mjs --시험      무엇을 쓸지만 본다 (영문 --check)
 *   node scripts/build-session-entry.mjs --짓는다    바탕화면에 쓰고 백업까지 뜬다 (--build)
 *   node scripts/build-session-entry.mjs --자가시험  (--selftest)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { 도는자리, 쉬는자리, 자리번호, 설정폴더 } from './lib/seats.mjs';

export const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const 입구 = 'C:\\Users\\USER\\Desktop\\00_세션입구';
export const 백업방 = path.join(뿌리, 'docs', '세션입구-백업');

/** 창 제목에 쓸 한 줄 — 「지금 무엇을 하는 자리인가」 */
export const 자리설명 = {
  1: '모든 사이트 콘텐트',
  2: 'SeoulMarkets 개발 분담 · 조율',
  5: '총괄 — SeoulMarkets 개발 · 감수 · 손님길 자물쇠',
};

/**
 * 단추 한 장을 짓는다.
 *
 * ⚠ `.cmd` 는 **UTF-8 · CRLF** 라야 한다. 백업 README 가 겪고 적어 둔 것이다 —
 *   다른 인코딩이면 한글 경로(`_현재`)를 못 읽고, LF 면 goto·라벨이 깨진다. 둘 다 겪었다.
 */
export function 단추글(번호, { 설명 = 자리설명[번호] ?? '' } = {}) {
  const n = String(번호);
  const 줄 = [
    '@echo off',
    'chcp 65001 >nul',
    `title ${n}번 ${설명}`,
    'REM ============================================================',
    `REM  ${n}번 ${설명}`,
    'REM',
    'REM  더블클릭하면 **새 세션이 아니라 그 대화를 다시 연다** (--resume).',
    'REM  PC 재시작 / 정전 / 창 닫힘 뒤 여기로 돌아온다.',
    'REM',
    'REM  이 파일은 손으로 고치지 않는다. 자리가 바뀌면 이렇게 다시 짓는다 —',
    'REM    node scripts\\build-session-entry.mjs --짓는다',
    'REM  자리 목록의 정본은 scripts\\lib\\seats.mjs 하나다.',
    'REM',
    'REM  시험하려면 인자를 하나 준다. 창을 열지 않고 무엇을 열지만 찍는다 —',
    `REM    ${n}번_*.cmd 진단`,
    'REM ============================================================',
    '',
    'REM -- 자리 번호를 심는다 --------------------------------------',
    'REM  창이 열리면 SessionStart 훅이 이 값을 읽어 역할 카드를 띄운다.',
    'REM  그래서 사장님이 「너는 N번이다」라고 말해 줄 필요가 없다.',
    `set CLAUDE_SEAT=${n}`,
    '',
    'REM -- 🔴 설정폴더를 심는다 ------------------------------------',
    'REM  이 줄이 없으면 기본 .claude 가 열려 **그 자리의 대화가 없는 빈 창**이 뜬다.',
    'REM  2026-08 에 그 병으로 나흘치 대화를 잃었다. 지우지 않는다.',
    `set CLAUDE_CONFIG_DIR=${설정폴더(번호)}`,
    '',
    'cd /d C:\\Users\\USER\\Desktop',
    '',
    'REM -- 창이 스스로 적어 둔 ID 가 정본이다 ----------------------',
    'REM  창이 열릴 때마다 훅이 _현재\\N.id 에 자기 ID 한 줄을 적는다.',
    'REM  ⛔ 여기에 ID 를 박아 두지 않는다. 박아 두면 한 달 뒤 죽은 ID 로 열려 한다.',
    'set LIVEID=',
    'if exist "%~dp0_현재\\%CLAUDE_SEAT%.id" set /p LIVEID=<"%~dp0_현재\\%CLAUDE_SEAT%.id"',
    '',
    'REM -- 진단 모드: 열지 않고 무엇을 열지만 찍는다 ----------------',
    'if /i "%~1"=="진단" goto :diag',
    'if /i "%~1"=="--diag" goto :diag',
    '',
    'if defined LIVEID (',
    '  claude --resume %LIVEID%',
    '  if not errorlevel 1 goto :eof',
    ')',
    '',
    'REM -- 못 열렸다. 실물 세션을 찾아 한 번 더 --------------------',
    'REM  ⚠ 여기서 이 .cmd 를 고치지 않는다. 실행 중인 배치 파일을 고치면',
    'REM     cmd.exe 가 바이트 위치로 다음 줄을 읽어 엉뚱한 줄이 돈다.',
    'echo.',
    'echo  [.] 이어서 열지 못했습니다. 실물 세션을 찾는 중입니다...',
    'set SID=',
    'for /f "usebackq delims=" %%i in (`node "%~dp0_세션ID-찾기.mjs" --id %CLAUDE_SEAT%`) do set SID=%%i',
    'if not defined SID goto :fresh',
    'echo  [+] 찾았습니다. 다시 엽니다: %SID%',
    'claude --resume %SID%',
    'if not errorlevel 1 goto :eof',
    '',
    ':fresh',
    'echo.',
    `echo  [!] ${n}번 세션이 없어졌습니다. 새 대화를 엽니다.`,
    `echo      붙여 넣을 것은 없습니다. 창이 열리면 스스로 ${n}번인 것을 압니다.`,
    'echo.',
    'REM  ⛔ pause 를 두지 않는다. 리부팅 뒤 창마다 키를 기다리면 그게 사장님 일이 된다',
    'claude',
    'goto :eof',
    '',
    ':diag',
    'echo.',
    `echo  [진단] ${n}번 ${설명}`,
    'echo   CLAUDE_SEAT       = %CLAUDE_SEAT%',
    'echo   CLAUDE_CONFIG_DIR = %CLAUDE_CONFIG_DIR%',
    'if defined LIVEID (echo   이어서 열 ID       = %LIVEID%) else (echo   이어서 열 ID       = 없음 - 실물을 찾는다)',
    'if exist "%CLAUDE_CONFIG_DIR%\\projects" (echo   설정폴더           = 있다) else (echo   설정폴더           = 🔴 없다)',
    'echo.',
    'goto :eof',
    '',
  ];
  return 줄.join('\r\n');
}

/** 한 번에 여는 단추 */
export function 한번에글(번호들 = 자리번호) {
  const 줄 = [
    '@echo off',
    'chcp 65001 >nul',
    `title ${번호들.length}개 창 한 번에 열기`,
    'REM ============================================================',
    'REM  리부팅 뒤 **이것 하나만 누르십시오.**',
    'REM  각 창은 열리면서 자기 번호와 설정폴더를 알고 그 대화를 이어 엽니다.',
    'REM  ⚠ 한 번에 열면 동시에 git 을 건드립니다. 3초씩 띄웁니다.',
    'REM ============================================================',
    'echo.',
    `echo   ${번호들.length}개 창을 엽니다. 창마다 번호가 자동으로 붙습니다.`,
    'echo.',
    '',
  ];
  번호들.forEach((n, i) => {
    if (i) 줄.push('timeout /t 3 /nobreak >nul');
    줄.push(`start "" "%~dp0${도는자리[n]}"`);
  });
  줄.push('', 'echo.', 'echo   다 열었습니다. 이 창은 닫아도 됩니다.',
    'timeout /t 5 /nobreak >nul', '');
  return 줄.join('\r\n');
}

/** 먼저 읽어 보기 — 사장님이 여시는 글 */
export function 안내글(번호들 = 자리번호) {
  const 줄 = [
    '세션 입구 — 여기서 창을 엽니다',
    '='.repeat(60),
    '',
    `지금 도는 자리는 ${번호들.length}개입니다 — ${번호들.join('·')}번.`,
    `쉬는 자리: ${Object.keys(쉬는자리).join('·')}번 (2026-09-27 사장님 「현재 없는 3, 4, 6번은 빼라」)`,
    '',
    '[리부팅 뒤]',
    '  0_한번에.cmd 를 누르십시오. 그것 하나면 됩니다.',
    '',
    '[한 창만 다시 열 때]',
    번호들.map((n) => `  ${도는자리[n]}   ${n}번 ${자리설명[n] ?? ''}`).join('\r\n'),
    '',
    '[창이 제대로 열리는지 보고 싶을 때]',
    '  단추 뒤에 「진단」을 붙여 부르면 창을 열지 않고 무엇을 열지만 찍습니다.',
    `  보기:  ${도는자리[번호들[0]]} 진단`,
    '',
    '[자리가 바뀌었을 때]',
    '  이 폴더의 파일을 손으로 고치지 마십시오. 저장소에서 다시 짓습니다 —',
    '    node scripts\\build-session-entry.mjs --짓는다',
    '  자리 목록의 정본은 scripts\\lib\\seats.mjs 하나입니다.',
    '',
  ];
  return 줄.join('\r\n');
}

/* ── 자가시험 ─────────────────────────────────────────────────────── */
function 자가시험() {
  let 통과 = 0; const 실패 = [];
  const 본다 = (이름, 참) => { if (참) { 통과 += 1; console.log('✅ ' + 이름); } else { 실패.push(이름); console.log('❌ ' + 이름); } };

  const 다섯 = 단추글(5);
  본다('🔴 설정폴더를 심는다 — 이것이 없으면 빈 창이 열린다',
    다섯.includes('set CLAUDE_CONFIG_DIR=C:\\Users\\USER\\.claude-u5'));
  본다('자리 번호를 심는다', 다섯.includes('set CLAUDE_SEAT=5'));
  본다('⛔ 세션 ID 를 파일에 박지 않는다 — 한 달 뒤 죽은 ID 가 된다',
    !/--resume\s+[0-9a-f]{8}-/.test(다섯));
  본다('_현재\\N.id 를 먼저 읽는다', 다섯.includes('_현재\\%CLAUDE_SEAT%.id'));
  본다('못 열면 실물을 찾는다', 다섯.includes('_세션ID-찾기.mjs'));
  본다('그래도 없으면 새 대화를 연다', 다섯.includes(':fresh'));
  본다('⛔ pause 를 두지 않는다 — 창마다 키를 기다리면 사장님 일이 된다', !/^pause/m.test(다섯));
  본다('🔴 진단 모드가 있다 — 열지 않고 잴 수 있어야 시험이 된다', 다섯.includes(':diag'));
  본다('진단은 두 이름으로 부른다', 다섯.includes('"진단"') && 다섯.includes('"--diag"'));

  /* ⚠ CRLF 가 아니면 goto·라벨이 깨진다. 백업 README 가 겪고 적어 둔 것이다 */
  본다('🔴 줄끝이 CRLF 다', 다섯.includes('\r\n') && !/[^\r]\n/.test(다섯));
  본다('⛔ 벌거벗은 LF 가 하나도 없다', 다섯.split('\n').every((s, i, a) => i === a.length - 1 || s.endsWith('\r')));

  /* 🔴 사장님이 빼라고 하신 자리가 단추로 살아나면 안 된다 */
  const 한번에 = 한번에글();
  for (const n of Object.keys(쉬는자리)) {
    본다(`⛔ 쉬는 자리 ${n}번이 한 번에 열기에 없다`, !한번에.includes(`${n}번_`));
  }
  for (const n of 자리번호) {
    본다(`도는 자리 ${n}번이 한 번에 열기에 있다`, 한번에.includes(도는자리[n]));
  }
  본다('한 번에 열기도 CRLF 다', 한번에.includes('\r\n'));

  const 안내 = 안내글();
  본다('안내가 지금 자리 수를 말한다', 안내.includes(`${자리번호.length}개`));
  본다('안내가 쉬는 자리를 밝힌다', 안내.includes('쉬는 자리'));
  본다('안내가 다시 짓는 법을 적는다', 안내.includes('build-session-entry.mjs'));

  console.log(`\n${실패.length ? '❌' : '✅'} 자가시험 ${통과}${실패.length ? ' · 실패 ' + 실패.length : ' 통과'}`);
  return !실패.length;
}

/* ── 진입점 ───────────────────────────────────────────────────────── */
const 내가진입점 = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (내가진입점 && (process.argv.includes('--자가시험') || process.argv.includes('--selftest'))) {
  process.exit(자가시험() ? 0 : 1);
} else if (내가진입점) {
  const 짓는다 = process.argv.includes('--짓는다') || process.argv.includes('--build');
  const 낼것 = [
    ...자리번호.map((n) => [도는자리[n], 단추글(n)]),
    ['0_한번에.cmd', 한번에글()],
    ['00_먼저 읽어보기.txt', 안내글()],
  ];

  console.log(`■ 세션입구 — 도는 자리 ${자리번호.join('·')}번 · 쉬는 자리 ${Object.keys(쉬는자리).join('·')}번`);
  for (const [이름, 글] of 낼것) {
    const 길 = path.join(입구, 이름);
    const 옛 = fs.existsSync(길) ? fs.readFileSync(길, 'utf8') : null;
    const 바뀌나 = 옛 !== 글;
    console.log(`  ${옛 === null ? '🆕' : 바뀌나 ? '🟡' : '⬜'} ${이름}${옛 === null ? ' — 없다' : 바뀌나 ? ' — 바뀐다' : ' — 그대로'}`);
    if (짓는다 && 바뀌나) { fs.mkdirSync(입구, { recursive: true }); fs.writeFileSync(길, 글, 'utf8'); }
  }

  /* 🔴 쉬는 자리의 단추가 바탕화면에 남아 있으면 사장님이 그것을 누르신다 */
  for (const 이름 of Object.values(쉬는자리)) {
    const 길 = path.join(입구, 이름);
    if (!fs.existsSync(길)) continue;
    console.log(`  🔴 쉬는 자리 단추가 남아 있다 — ${이름}`);
    if (짓는다) { fs.rmSync(길); console.log('     ⇒ 치웠다'); }
  }
  /* 옛 이름의 한 번에 열기도 치운다 — 여섯을 열려 든다 */
  const 옛한번에 = path.join(입구, '0_여섯창_한번에.cmd');
  if (fs.existsSync(옛한번에)) {
    console.log('  🔴 옛 「여섯창 한 번에」가 남아 있다 — 없는 자리를 열려 든다');
    if (짓는다) { fs.rmSync(옛한번에); console.log('     ⇒ 치웠다'); }
  }

  if (!짓는다) { console.log('\n⬜ 보기만 했다 — 쓰려면 --짓는다'); process.exit(0); }

  /**
   * 곁딸린 파일들도 함께 둔다 — 단추와 예약작업이 이것들을 부른다.
   *
   * 🔴🔴 [2026-11-13 · 5번] `_아침7시_자리열기.ps1` 이 **없어져 있었다.**
   *   예약작업 `KLD-아침7시-자리열기` 는 07:00 에 꼬박 돌았지만 가리킬 파일이 없어
   *   **결과 -196608 로 실패**했고, 1번 자리가 안 열려 그날 네 사이트 콘텐트가 0편이었다.
   *   ⛔ 바탕화면은 저장소가 아니다. 지워지면 끝이고, 아무도 안 본다.
   *   ⇒ 백업에 두고 **없으면 되살린다.** 새 곁딸린 파일은 이 목록에 넣는다.
   */
  for (const 이름 of ['_세션ID-찾기.mjs', '_아침7시_자리열기.ps1']) {
    const 원본 = path.join(백업방, 이름);
    const 낼곳 = path.join(입구, 이름);
    if (fs.existsSync(원본) && !fs.existsSync(낼곳)) {
      fs.copyFileSync(원본, 낼곳);
      console.log(`  🆕 ${이름} — 백업에서 되살렸다`);
    }
  }

  /* ⭐ 백업까지가 한 작업이다. 바탕화면은 저장소가 아니라 지워지면 끝이다 */
  fs.mkdirSync(백업방, { recursive: true });
  for (const [이름, 글] of 낼것) fs.writeFileSync(path.join(백업방, 이름), 글, 'utf8');
  for (const 이름 of Object.values(쉬는자리)) {
    const 길 = path.join(백업방, 이름);
    if (fs.existsSync(길)) fs.rmSync(길);
  }
  const 옛백업 = path.join(백업방, '0_여섯창_한번에.cmd');
  if (fs.existsSync(옛백업)) fs.rmSync(옛백업);
  console.log(`\n✅ 냈다 — ${입구}`);
  console.log(`   백업도 맞췄다 — docs/세션입구-백업`);
  console.log('   ⛔ 「냈다」는 증거가 아니다 — 진단으로 열어 본다:');
  console.log(`      cmd /c "${path.join(입구, 도는자리[자리번호[0]])}" 진단`);
}
