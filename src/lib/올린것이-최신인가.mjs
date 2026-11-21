/**
 * 올린것이-최신인가.mjs — **R2 에 올린 지면 묶음이 지금 커밋의 것인가**를 판정한다.
 *
 * ── 🔴🔴 왜 이것이 따로 있어야 하나 (2026-11-22 03:3x · 5번) ───────────────
 * 2026-11-17 부터 컨테이너는 **짓지 않고 받아서 편다.** 그래서 지면을 바꾸려면
 * `scripts/올린다-지어진지면.mjs` 로 R2 에 올려야 하고, 그것을 안 부르면
 * 배포 단추를 몇 번을 눌러도 컨테이너는 **옛 묶음**을 받아서 편다.
 *
 * 이 함정에 2026-11-17 에 한 번, **2026-11-22 에 또** 빠졌다. 11-18 에 만든
 * `될때까지-배포한다-서울마켓츠.mjs` 는 이 검사를 품고 있어서 멈춰 세웠는데,
 * 내가 그 자를 안 거치고 `배포단추-누른다-서울마켓츠.mjs` 를 바로 불렀다.
 * ⇒ 검사가 **한 길에만** 있으면 다른 길로 가면 그만이다. 길마다 두려면
 *   판정을 «아무것도 하지 않는 자리»에 두고 양쪽이 들여와 써야 한다.
 *
 * ⛔ 이 파일은 아무것도 하지 않는다 — 들여와도 배포가 눌리지 않는다.
 *   (`될때까지-배포한다…` 를 들여오면 그 순간 배포 단추가 눌린다. 11-18 에 두 번 그랬다.)
 *
 * 쓰는 법
 *   import { 올린것이최신인가 } from '../src/lib/올린것이-최신인가.mjs';
 *   const 판정 = 올린것이최신인가(뿌리);
 *   if (!판정.최신인가) { 판정.까닭 … process.exit(1); }
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { 지면에닿는것 } from './지면에-닿는가.mjs';

/** dist/deploy-stamp.txt 에서 «올린 커밋»을 읽는다. 못 읽으면 null */
export function 올린커밋(뿌리) {
  try {
    const 글 = fs.readFileSync(path.join(뿌리, 'dist', 'deploy-stamp.txt'), 'utf8');
    return (글.match(/^커밋=(\S+)/m) ?? [])[1] ?? null;
  } catch (e) { return null; }
}

/** 두 커밋이 같은 것을 가리키나 — 짧은 것과 긴 것이 섞여 온다 */
export function 같은커밋인가(a, b) {
  if (!a || !b) return false;
  const x = String(a); const y = String(b);
  return x.startsWith(y) || y.startsWith(x);
}

/**
 * 올린 묶음이 지금 커밋의 지면과 같은가.
 *
 * ⚠ 커밋이 다르다고 다 옛 판인 것은 아니다 — 이 저장소는 매시 예약이 기록 파일을
 *   저절로 커밋한다. **지면에 닿는 것이 바뀌었나**로 가른다.
 * ⛔ 못 가려내면 옛 판으로 친다. 모르는 것을 통과로 읽지 않는다.
 *
 * @param {string} 뿌리 저장소 뿌리
 * @param {{HEAD?: string, 바뀐것뽑기?: (a: string) => string[] | null}} 설정 — 시험에서 갈아 끼운다
 * @returns {{최신인가: boolean, 올린커밋: string|null, HEAD: string|null,
 *            지면이바뀐것: string[], 까닭: string}}
 */
export function 올린것이최신인가(뿌리, 설정 = {}) {
  const 올린것 = 설정.올린커밋 !== undefined ? 설정.올린커밋 : 올린커밋(뿌리);
  let 머리 = 설정.HEAD ?? null;
  if (!머리) {
    try { 머리 = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: 뿌리, encoding: 'utf8' }).trim(); }
    catch (e) { 머리 = null; }
  }
  if (!올린것) {
    return { 최신인가: false, 올린커밋: null, HEAD: 머리, 지면이바뀐것: [],
      까닭: 'dist/deploy-stamp.txt 가 없다 — 아직 한 번도 올리지 않았다' };
  }
  if (같은커밋인가(올린것, 머리)) {
    return { 최신인가: true, 올린커밋: 올린것, HEAD: 머리, 지면이바뀐것: [],
      까닭: '올린 커밋이 HEAD 와 같다' };
  }
  const 뽑기 = 설정.바뀐것뽑기 || ((기준) => {
    try {
      return execFileSync('git', ['diff', '--name-only', 기준 + '..HEAD'],
        { cwd: 뿌리, encoding: 'utf8' }).split('\n').map((s) => s.trim()).filter(Boolean);
    } catch (e) { return null; }
  });
  const 바뀐것 = 뽑기(올린것);
  if (바뀐것 === null) {
    return { 최신인가: false, 올린커밋: 올린것, HEAD: 머리, 지면이바뀐것: [],
      까닭: '무엇이 바뀌었는지 못 가렸다 — 옛 판으로 친다' };
  }
  const 닿는것 = 지면에닿는것(바뀐것);
  if (닿는것.length) {
    return { 최신인가: false, 올린커밋: 올린것, HEAD: 머리, 지면이바뀐것: 닿는것,
      까닭: '올린 뒤에 지면에 닿는 파일이 ' + 닿는것.length + '개 바뀌었다' };
  }
  return { 최신인가: true, 올린커밋: 올린것, HEAD: 머리, 지면이바뀐것: [],
    까닭: 'HEAD 가 앞서지만 그 사이 ' + 바뀐것.length + '개는 지면에 안 닿는다' };
}

/** 배포하는 자가 공통으로 쓰는 안내 — 어느 길로 가도 같은 말이 나오게 한다 */
export const 먼저할것 = '먼저 이것을 돌린다 —  node scripts/올린다-지어진지면.mjs';

/* ── 자가시험 ────────────────────────────────────────────────────────── */
if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('올린것이-최신인가.mjs')) {
  let 통과 = 0; let 깨짐 = 0;
  const 본다 = (이름, 참) => {
    if (참) { 통과 += 1; console.log('  ✅ ' + 이름); }
    else { 깨짐 += 1; console.log('  🔴 ' + 이름); }
  };
  본다('① 같은 커밋이면 최신이다',
    올린것이최신인가('.', { 올린커밋: 'abc1234', HEAD: 'abc1234def' }).최신인가 === true);
  본다('② 짧은 쪽과 긴 쪽이 섞여도 같다고 본다',
    같은커밋인가('abc1234', 'abc1234def5678') && 같은커밋인가('abc1234def5678', 'abc1234'));
  본다('🔴 ③ 올린 것이 없으면 최신이 아니다 — 한 번도 안 올린 것이다',
    올린것이최신인가('.', { 올린커밋: null, HEAD: 'abc' }).최신인가 === false);
  본다('🔴 ④ 무엇이 바뀌었는지 못 가리면 옛 판으로 친다',
    올린것이최신인가('.', { 올린커밋: 'aaa', HEAD: 'bbb', 바뀐것뽑기: () => null }).최신인가 === false);
  본다('⑤ 그 사이 바뀐 것이 기록뿐이면 최신이다',
    올린것이최신인가('.', { 올린커밋: 'aaa', HEAD: 'bbb',
      바뀐것뽑기: () => ['docs/보낸메일.tsv', 'docs/indexnow-보낸기록.tsv'] }).최신인가 === true);
  본다('🔴 ⑥ 지면에 닿는 것이 바뀌었으면 옛 판이다',
    올린것이최신인가('.', { 올린커밋: 'aaa', HEAD: 'bbb',
      바뀐것뽑기: () => ['content/articles/a.md'] }).최신인가 === false);
  본다('⑦ 옛 판일 때 무엇이 바뀌었는지 알려 준다',
    올린것이최신인가('.', { 올린커밋: 'aaa', HEAD: 'bbb',
      바뀐것뽑기: () => ['content/articles/a.md'] }).지면이바뀐것.length === 1);
  본다('🔴 ⑧ 빈 커밋 글자를 「같다」로 읽지 않는다',
    !같은커밋인가('', 'abc') && !같은커밋인가('abc', '') && !같은커밋인가(null, null));
  본다('⑨ 어느 길로 가도 같은 안내가 나온다',
    먼저할것.includes('올린다-지어진지면.mjs'));
  console.log('\n통과 ' + 통과 + ' · 깨짐 ' + 깨짐);
  process.exit(깨짐 ? 1 : 0);
}
