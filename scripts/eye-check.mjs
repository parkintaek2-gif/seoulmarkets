#!/usr/bin/env node
/**
 * eye-check.mjs — **영문 이름의 입구.** 하는 일은 `눈으로본다-로그인결제.mjs` 를 부르는 것뿐이다.
 *
 * ── 🔴 왜 이것이 따로 있나 ───────────────────────────────────────────
 * 예약작업의 `.cmd` 가 **한글 파일 이름을 못 읽는다.** 콘솔 코드페이지로 읽히면서
 * 이름이 깨져 node 가 파일을 못 찾는다. 2026-11-07 16:46 에 색인 작업이 그렇게 터졌고
 * **result=1, 로그는 한 글자도 안 생겼다.** 같은 흠으로 색인 요청이 9일 죽어 있었다.
 * ⇒ `.cmd` 안에는 영문 글자만 둔다. 한글 이름은 이 `.mjs` 안에서만 쓴다.
 *
 * 쓰는 법
 *   node scripts/eye-check.mjs            두 시간마다 (예약작업이 부른다)
 *   node scripts/eye-check.mjs --자가시험
 */
import path from 'node:path';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const 여기 = path.dirname(fileURLToPath(import.meta.url));
export const 진짜자 = path.join(여기, '눈으로본다-로그인결제.mjs');

/** 부를 자가 실제로 거기 있나 — 없으면 «돌았다»고 적지 않는다 */
export function 있나(길 = 진짜자) {
  try { return fs.existsSync(길); } catch (e) { return false; }
}

if (process.argv.includes('--자가시험')) {
  let 깨짐 = 0;
  const 검 = (이름, 참) => { console.log((참 ? '  ✅ ' : '  ❌ ') + 이름); if (!참) 깨짐 += 1; };
  검('🔴 부를 자가 실제로 있다 — 이름이 깨지면 여기서 걸린다', 있나());
  검('⛔ 없는 길이면 없다고 한다', !있나(path.join(여기, '없는자-xyz.mjs')));
  검('⭐ 이 파일 이름에는 한글이 없다 — .cmd 가 읽을 수 있어야 한다',
    !/[가-힣]/.test(path.basename(fileURLToPath(import.meta.url))));
  console.log(깨짐 ? ('\n■ 자가시험 ' + 깨짐 + '건 깨짐') : '\n■ 자가시험 모두 통과');
  process.exit(깨짐);
}

if (!있나()) {
  console.error('🔴 부를 자를 못 찾았다 — ' + 진짜자);
  console.error('   ⛔ 못 찾은 것을 「할 일이 없었다」로 적지 않는다.');
  process.exit(2);
}

const r = spawnSync(process.execPath, [진짜자, ...process.argv.slice(2)], { stdio: 'inherit' });
process.exit(r.status === null ? 3 : r.status);
