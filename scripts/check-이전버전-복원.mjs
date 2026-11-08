#!/usr/bin/env node
/**
 * check-이전버전-복원.mjs — 현재 상태 위에서만 수정하도록 강제한다.
 *
 * ── 지시 (2026-11-08 · 사장님) ───────────────────────────────────────
 * 「어떤 작업을 할 때, 작업 시점에 있는 현재 상태를 기준으로 업그레이드만 해.
 *   작업 시점 이전 걸 불러 오지 않게 하는 강제 장치를 만들어」
 *
 * 과거에 발생한 사고
 *   · `git checkout -- <파일>` 로 일괄 되돌려 같은 파일의 최신 수정이 소멸했다
 *   · 이전 판본을 붙여 넣어 이미 수정한 내용이 되살아났다
 *   · 「원본과의 일관성」을 이유로 앞선 판본을 근거로 삼았다
 * 세 경우 모두 겉보기에는 평범한 커밋이다. 그래서 검사 도구가 필요하다.
 *
 * ── 판정 방법 ────────────────────────────────────────────────────────
 * 스테이징한 파일마다 내용 해시를 구한다. 그 해시가 HEAD 가 아니라
 * HEAD 보다 앞선 커밋의 동일 파일과 일치하면 이전 버전을 그대로 복원한 것이다.
 *   스테이징 == 이전 커밋의 그 파일  →  이전 버전 복원 (차단)
 *   스테이징 == HEAD 의 그 파일      →  변경 없음 (대상 아님)
 *   둘 다 아니다                     →  현재 상태 위에서 수정 (정상)
 *
 * 되돌리는 것이 타당한 경우도 있다(정상 동작하던 판본으로 복구). 그때는
 * `--복원사유 "사유"` 로 명시한다. 사유 없이는 통과시키지 않는다.
 *
 * 사용법
 *   node scripts/check-이전버전-복원.mjs
 *   node scripts/check-이전버전-복원.mjs --복원사유 "결제 정상 판본으로 복구"
 *   node scripts/check-이전버전-복원.mjs --자체검사
 */
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const 저장소루트 = fileURLToPath(new URL('..', import.meta.url));

/**
 * git 을 실행한다. 표준 오류는 버린다 — 없는 경로를 조회할 때 git 이
 * 터미널에 fatal 메시지를 직접 찍는데, 우리는 그것을 예외로 받아 처리하므로
 * 화면에 두 번 나올 이유가 없다.
 */
function 깃실행(인수들, 경로 = 저장소루트) {
  return execFileSync('git', 인수들, {
    cwd: 경로, encoding: 'utf8', maxBuffer: 1024 * 1024 * 64,
    stdio: ['ignore', 'pipe', 'ignore'],
  });
}

/** 스테이징한 수정 파일 목록 */
export function 스테이징파일(경로 = 저장소루트) {
  try {
    return 깃실행(['diff', '--cached', '--name-only', '--diff-filter=M'], 경로)
      .split('\n').map((s) => s.trim()).filter(Boolean);
  } catch { return []; }
}

/** 스테이징한 내용의 해시 */
export function 스테이징해시(파일, 경로 = 저장소루트) {
  try {
    const 줄 = 깃실행(['ls-files', '--stage', '--', 파일], 경로).trim();
    return 줄 ? 줄.split(/\s+/)[1] : null;
  } catch { return null; }
}

/** HEAD 의 해당 파일 해시 */
export function HEAD해시(파일, 경로 = 저장소루트) {
  try { return 깃실행(['rev-parse', `HEAD:${파일}`], 경로).trim(); } catch { return null; }
}

/**
 * 이 해시가 HEAD 보다 앞선 커밋의 동일 파일과 일치하는가.
 * @returns {{이전커밋:string, 날짜:string}|null}
 */
export function 이전버전인가(파일, 해시, 경로 = 저장소루트, 조회커밋수 = 80) {
  if (!해시) return null;
  let 커밋목록;
  try {
    커밋목록 = 깃실행(['log', '--format=%H%x09%ad', '--date=short', '-n', String(조회커밋수), 'HEAD', '--', 파일], 경로)
      .split('\n').map((s) => s.trim()).filter(Boolean);
  } catch { return null; }
  /* 첫 줄은 해당 파일을 마지막으로 수정한 커밋이므로 그 다음부터가 이전 버전이다 */
  for (const 줄 of 커밋목록.slice(1)) {
    const [커밋, 날짜] = 줄.split('\t');
    let 이전해시 = null;
    try { 이전해시 = 깃실행(['rev-parse', `${커밋}:${파일}`], 경로).trim(); } catch { continue; }
    if (이전해시 === 해시) return { 이전커밋: 커밋, 날짜 };
  }
  return null;
}

/** 한 차례 검사한다 */
export function 검사한다(경로 = 저장소루트) {
  const 위반 = [];
  const 검사대상 = [];
  for (const f of 스테이징파일(경로)) {
    const 해시 = 스테이징해시(f, 경로);
    if (!해시) { 검사대상.push({ 파일: f, 측정불가: '해시를 읽지 못했다' }); continue; }
    if (해시 === HEAD해시(f, 경로)) { 검사대상.push({ 파일: f, 동일: 'HEAD 와 같다' }); continue; }
    const 이전 = 이전버전인가(f, 해시, 경로);
    if (이전) 위반.push({ 파일: f, ...이전 });
    검사대상.push({ 파일: f, 이전버전: !!이전 });
  }
  return { 위반, 검사대상 };
}

/* ── 자체 검사 ──────────────────────────────────────────────────────── */
export function 자체검사() {
  const 항목 = [];
  const 검사 = (이름, 결과) => 항목.push({ 이름, 결과: !!결과 });

  검사('해시가 없으면 이전 버전이라고 판정하지 않는다', 이전버전인가('임의파일', null) === null);
  검사('존재하지 않는 파일에서 오류가 발생하지 않는다',
    이전버전인가('존재하지않는파일.txt', 'deadbeef') === null);
  검사('존재하지 않는 파일의 HEAD 해시는 null 이다 — 0 이나 빈 문자열이 아니다',
    HEAD해시('존재하지않는파일.txt') === null);
  검사('스테이징 파일 목록은 배열이다', Array.isArray(스테이징파일()));

  /* 실제 커밋 이력으로 확인한다. 이전 버전 해시를 주면 반드시 검출해야 한다 */
  let 실측가능 = false; let 실측결과 = false;
  try {
    const 커밋들 = 깃실행(['log', '--format=%H', '-n', '12', 'HEAD', '--', 'docs/세션간-메모.md'])
      .split('\n').map((s) => s.trim()).filter(Boolean);
    if (커밋들.length >= 3) {
      const 이전해시 = 깃실행(['rev-parse', `${커밋들[2]}:docs/세션간-메모.md`]).trim();
      실측가능 = true;
      실측결과 = !!이전버전인가('docs/세션간-메모.md', 이전해시);
    }
  } catch { /* 이력이 부족하면 측정하지 못한다 */ }
  if (실측가능) 검사('실제 이력에서 이전 버전 해시를 검출한다', 실측결과);
  else console.log('  측정불가  실제 이력이 3개 미만이다. 통과로 처리하지 않는다');

  let 둘째가능 = false; let 둘째결과 = false;
  try {
    const head해시 = 깃실행(['rev-parse', 'HEAD:docs/세션간-메모.md']).trim();
    둘째가능 = true;
    둘째결과 = 이전버전인가('docs/세션간-메모.md', head해시) === null;
  } catch { /* 측정하지 못하면 넘어간다 */ }
  if (둘째가능) 검사('HEAD 와 같은 내용을 이전 버전이라고 판정하지 않는다 — 허위 경고를 만들지 않는다', 둘째결과);

  const 실패 = 항목.filter((x) => !x.결과);
  console.log(`■ check-이전버전-복원 자체 검사 ${항목.length - 실패.length}/${항목.length}`);
  for (const x of 항목) console.log(`  ${x.결과 ? '통과' : '실패'}  ${x.이름}`);
  return 실패.length === 0;
}

/* ── 실행부 ─────────────────────────────────────────────────────────── */
const 직접실행 = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (직접실행) {
  const 인수 = process.argv.slice(2);
  if (인수.includes('--자체검사')) process.exit(자체검사() ? 0 : 1);

  const i = 인수.indexOf('--복원사유');
  const 복원사유 = i >= 0 ? 인수[i + 1] : null;

  const { 위반, 검사대상 } = 검사한다();
  console.log(`■ 이전 버전 복원 검사 — 스테이징 파일 ${검사대상.length}개를 확인했다`);
  if (!위반.length) { console.log('전부 현재 상태 위에서 수정했다'); process.exit(0); }

  console.log(`\n경고: 이전 버전을 그대로 복원한 파일 ${위반.length}개`);
  for (const x of 위반) {
    console.log(`   · ${x.파일}`);
    console.log(`     스테이징한 내용이 ${x.날짜} 커밋(${x.이전커밋.slice(0, 9)})의 동일 파일과 완전히 같다`);
    console.log(`     그 이후 이 파일에 반영된 수정이 소멸한다`);
  }
  if (복원사유) {
    console.log(`\n복원으로 명시했다 — 「${복원사유}」`);
    console.log('   통과시킨다. 복원 사유를 커밋 메시지에도 기록한다.');
    process.exit(0);
  }
  console.log('\n커밋하지 않는다. 현재 파일을 열어 그 위에서 수정한다.');
  console.log('   의도한 복원이라면 사유를 명시한다 —');
  console.log('   node scripts/check-이전버전-복원.mjs --복원사유 "복원 사유"');
  process.exit(1);
}
