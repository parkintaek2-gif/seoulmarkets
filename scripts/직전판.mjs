#!/usr/bin/env node
/**
 * 직전판.mjs — **무엇을 고치든, 고치기 직전 판으로 언제든 되돌릴 수 있게 한다.**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔴🔴 [2026-11-11 · 사장님] **「수정시 (1) 언제든지 수정 직전 버전으로 원복가능케 함」**
 *   「**새 규칙, 수정한 규칙이 아니잖아. 만들라고 조심하라고 늘 강조하는 거잖아.
 *     왜 아직도 이걸 비워놓나. 이러니 계속 결제가 틀어지고, 로그인이 안되고 했던거 아닌가.
 *     과거 버전이 다시 올라오고**」
 *
 * [무엇이 비어 있었나]
 *   git 이 있으니 원복은 «된다»고 여기고 아무 장치도 안 뒀다. 그런데 git 이 쥐고 있는 것은
 *   **커밋한 것뿐**이다. 고치다 만 판, 커밋 전에 뒤엎은 판은 git 에 한 줄도 없다.
 *   그 사이에 결제가 깨지면 돌아갈 자리가 없어서 «기억을 더듬어 되짚는» 수밖에 없었다.
 *   그렇게 되짚다가 옛 판을 집어 올린 것이 사장님이 말씀하신 「과거 버전이 다시 올라오고」다.
 *
 * [어떻게 막나 — 사람 기억에 안 기댄다]
 *   ```
 *   ① 작업 트리를 통째로 찍어 둔다 — git stash create 로 «커밋 객체»만 만든다
 *      ⭐ 작업 트리를 한 글자도 안 건드린다. 하던 일이 멈추지 않는다
 *   ② 그 객체를 refs/직전판/<때> 에 매단다 — ref 에 매달면 git 이 안 지운다
 *   ③ 찍는 일을 예약에 건다(10분마다) + 커밋·배포 앞에서도 찍는다
 *   ④ 되돌릴 때는 «무엇이 달라지는지 먼저 찍어 보이고» --정말 을 받아야 움직인다
 *   ```
 * ⛔ 되돌리기가 사람 손 하나로 조용히 트리를 엎으면 그것이 더 큰 사고다.
 *   그래서 두 걸음으로 나눈다 — 보여 주기 / 정말 하기.
 * ⚠ 추적 안 하는 새 파일은 «지우지 않는다». 되돌린다는 말로 남의 새 파일을 지우면 안 된다.
 *   대신 목록으로 찍어 보인다 — 지울지는 사람이 정한다.
 *
 * 쓰는 법
 *   node scripts/직전판.mjs --찍는다                  지금 판을 찍어 둔다
 *   node scripts/직전판.mjs --목록                    찍어 둔 판들
 *   node scripts/직전판.mjs --되돌린다                 가장 최근 판으로 되돌리면 무엇이 달라지나
 *   node scripts/직전판.mjs --되돌린다 --정말          실제로 되돌린다
 *   node scripts/직전판.mjs --되돌린다=<이름> --정말
 *   node scripts/직전판.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

/** ref 를 매다는 가지. ⛔ refs/heads 아래에 두지 않는다 — 가지 목록이 더러워진다 */
export const 가지 = 'refs/직전판';

/** 몇 판까지 남기나. 10분마다 찍으면 이레치쯤 된다 */
export const 남길판 = 1000;

/** 이 PC 는 이미 KST 다 — toISOString() 을 쓰지 않는다 */
export function 판이름(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function 깃(뿌리, 말들, 봐줄까 = false) {
  try {
    return execFileSync('git', 말들, { cwd: 뿌리, encoding: 'utf8' }).trim();
  } catch (e) {
    if (봐줄까) return null;
    throw e;
  }
}

/** 지금 서 있는 저장소의 뿌리. ⛔ 저장소 밖이면 null — 「없다」가 아니라 「여기가 아니다」 */
export function 저장소뿌리(어디 = process.cwd()) {
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'],
      { cwd: 어디, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch { return null; }
}

/**
 * 고친 것이 있나 — 추적 중인 파일 기준.
 * ⚠ 「없다」와 「못 쟀다」를 가른다. git 을 못 부르면 null 이다.
 */
export function 고친것있나(뿌리) {
  const 글 = 깃(뿌리, ['status', '--porcelain', '--untracked-files=no'], true);
  if (글 === null) return null;
  return 글.length > 0;
}

/** 추적 안 하는 새 파일들 — 되돌릴 때 «안 지우고» 목록으로만 보여 준다 */
export function 새파일들(뿌리) {
  const 글 = 깃(뿌리, ['ls-files', '--others', '--exclude-standard'], true);
  if (!글) return [];
  return 글.split(/\r?\n/).filter(Boolean);
}

/**
 * 지금 판을 찍는다.
 * @returns { 찍었나, 이름, 해시, 까닭 }
 *
 * ⭐ git stash create 는 **작업 트리를 건드리지 않는다.** 커밋 객체만 만들어 해시를 준다.
 *   (git stash push 와 다르다 — push 는 트리를 되돌려 버려서 하던 일이 날아간다. 쓰면 안 된다)
 */
export function 찍는다(뿌리, 이제 = new Date()) {
  const 고쳤나 = 고친것있나(뿌리);
  if (고쳤나 === null) return { 찍었나: false, 까닭: '못 쟀다 — git 을 못 불렀다' };

  let 해시;
  if (고쳤나) {
    해시 = 깃(뿌리, ['stash', 'create'], true);
    /* ⚠ 빈 답이 올 수 있다 — 그때는 HEAD 가 곧 지금 판이다 */
    if (!해시) 해시 = 깃(뿌리, ['rev-parse', 'HEAD'], true);
  } else {
    해시 = 깃(뿌리, ['rev-parse', 'HEAD'], true);
  }
  if (!해시) return { 찍었나: false, 까닭: '못 쟀다 — 가리킬 해시가 없다' };

  /* 바로 앞 판과 같은 해시면 또 찍지 않는다 — 10분마다 도는데 안 고쳤으면 같은 것이 쌓인다 */
  const 앞선것 = 판목록(뿌리)[0];
  if (앞선것 && 앞선것.해시 === 해시) {
    return { 찍었나: false, 이름: 앞선것.이름, 해시, 까닭: '바뀐 것이 없다 — 앞 판과 같다' };
  }

  const 이름 = 판이름(이제);
  깃(뿌리, ['update-ref', `${가지}/${이름}`, 해시]);
  치운다(뿌리);
  return { 찍었나: true, 이름, 해시, 고친것있었나: 고쳤나 };
}

/** 찍어 둔 판들 — 새것이 앞 */
export function 판목록(뿌리) {
  const 글 = 깃(뿌리, ['for-each-ref', '--format=%(refname:short)\u0001%(objectname)', 가지], true);
  if (!글) return [];
  return 글.split(/\r?\n/).filter(Boolean).map((줄) => {
    const [긴이름, 해시] = 줄.split('\u0001');
    return { 이름: String(긴이름).split('/').pop(), 해시, 긴이름 };
  }).sort((a, b) => (a.이름 < b.이름 ? 1 : -1));
}

/** 오래된 판을 치운다 — ⛔ 최근 것부터 남길판 개는 손대지 않는다 */
export function 치운다(뿌리, 얼마 = 남길판) {
  const 것들 = 판목록(뿌리);
  for (const x of 것들.slice(얼마)) 깃(뿌리, ['update-ref', '-d', `${가지}/${x.이름}`], true);
  return 것들.length - Math.min(것들.length, 얼마);
}

/** 그 판으로 되돌리면 무엇이 달라지나 — 되돌리기 «전»에 반드시 찍어 보인다 */
export function 무엇이달라지나(뿌리, 해시) {
  const 글 = 깃(뿌리, ['diff', '--stat', 해시], true);
  return 글 === null ? null : 글;
}

/**
 * 되돌린다. ⛔ --정말 없이는 안 움직인다(여기서는 정말 인자로 받는다).
 * ⚠ 되돌리기 «직전 판»도 먼저 찍어 둔다 — 되돌린 것이 잘못이어도 돌아올 자리가 있어야 한다.
 */
export function 되돌린다(뿌리, 해시) {
  const 되돌리기전 = 찍는다(뿌리);
  깃(뿌리, ['restore', '--source', 해시, '--worktree', '--', '.']);
  return { 되돌리기전 };
}

/* ───────────────────────── 화면 ───────────────────────── */

function 주다() {
  const 인자 = process.argv.slice(2);
  if (인자.includes('--자가시험')) return 자가시험();

  const 뿌리 = 저장소뿌리();
  if (!뿌리) {
    console.log('🔴 git 저장소 안에서 돌려야 한다 — 지금 자리:', process.cwd());
    process.exit(1);
  }
  const 조용히 = 인자.includes('--조용히');

  if (인자.includes('--목록')) {
    const 것들 = 판목록(뿌리);
    if (!것들.length) { console.log('⬜ 찍어 둔 판이 없다 — 먼저 --찍는다'); return; }
    console.log(`■ 찍어 둔 판 ${것들.length}개 (새것부터)\n`);
    for (const x of 것들.slice(0, 30)) console.log(`   ${x.이름}  ${x.해시.slice(0, 10)}`);
    if (것들.length > 30) console.log(`   … 그 밖에 ${것들.length - 30}개`);
    return;
  }

  const 되돌림 = 인자.find((x) => x === '--되돌린다' || x.startsWith('--되돌린다='));
  if (되돌림) {
    const 것들 = 판목록(뿌리);
    if (!것들.length) { console.log('🔴 찍어 둔 판이 없다 — 되돌릴 자리가 없다'); process.exit(1); }
    const 고른이름 = 되돌림.includes('=') ? 되돌림.split('=')[1] : 것들[0].이름;
    const 고른것 = 것들.find((x) => x.이름 === 고른이름);
    if (!고른것) {
      console.log(`🔴 그런 판이 없다 — ${고른이름}`);
      console.log('   --목록 으로 이름을 본다');
      process.exit(1);
    }

    console.log(`■ 되돌릴 판 — ${고른것.이름} (${고른것.해시.slice(0, 10)})\n`);
    const 달라짐 = 무엇이달라지나(뿌리, 고른것.해시);
    console.log(달라짐 && 달라짐.trim() ? 달라짐 : '   (지금과 똑같다 — 되돌려도 바뀌는 것이 없다)');

    const 새것 = 새파일들(뿌리);
    if (새것.length) {
      console.log(`\n⚠ 추적 안 하는 새 파일 ${새것.length}개는 «그대로 둔다» — 지울지는 사람이 정한다`);
      for (const f of 새것.slice(0, 10)) console.log('   ·', f);
      if (새것.length > 10) console.log(`   … 그 밖에 ${새것.length - 10}개`);
    }

    if (!인자.includes('--정말')) {
      console.log('\n⬜ 아직 안 움직였다. 정말 되돌리려면 --정말 을 같이 준다');
      console.log(`   node scripts/직전판.mjs --되돌린다=${고른것.이름} --정말`);
      return;
    }
    const r = 되돌린다(뿌리, 고른것.해시);
    console.log(`\n✅ 되돌렸다 — ${고른것.이름}`);
    if (r.되돌리기전.찍었나) {
      console.log(`   ⭐ 되돌리기 «직전» 판도 찍어 뒀다 — ${r.되돌리기전.이름}`);
      console.log('      이 되돌리기가 잘못이면 그 이름으로 다시 돌아온다');
    }
    return;
  }

  /* 기본은 찍는 것 */
  const r = 찍는다(뿌리);
  if (조용히) { if (r.찍었나) console.log(`직전판 ${r.이름}`); return; }
  if (r.찍었나) {
    console.log(`✅ 찍었다 — ${r.이름} (${r.해시.slice(0, 10)})`);
    console.log(`   되돌리려면: node scripts/직전판.mjs --되돌린다=${r.이름} --정말`);
  } else {
    console.log(`⬜ 안 찍었다 — ${r.까닭}`);
  }
}

function 자가시험() {
  let 통 = 0; let 탈 = 0;
  const 검 = (이름, 참) => { if (참) { 통++; console.log('✅', 이름); } else { 탈++; console.log('🔴', 이름); } };

  검('판 이름이 때 순으로 늘어선다',
    판이름(new Date('2026-11-11T09:05:03')) < 판이름(new Date('2026-11-11T09:05:04')));
  검('판 이름에 한글·빈칸이 없다 — ref 이름으로 쓴다',
    /^[0-9-]+$/.test(판이름(new Date('2026-11-11T09:05:03'))));
  검('ref 가지가 refs/heads 아래가 아니다', !가지.startsWith('refs/heads'));

  /* 🔴 git stash push 를 쓰면 작업 트리가 되돌려져 하던 일이 날아간다. create 여야 한다 */
  const 나 = fs.readFileSync(new URL(import.meta.url), 'utf8');
  검('🔴 stash create 를 쓴다 — push 를 쓰지 않는다',
    나.includes("'stash', 'create'") && !/'stash',\s*'push'/.test(나));
  검('🔴 되돌리기 전에 그 판도 찍는다 — 되돌린 것이 잘못이어도 돌아올 자리가 있다',
    /export function 되돌린다[\s\S]{0,200}찍는다\(뿌리\)/.test(나));
  검('🔴 --정말 없이는 안 움직인다', 나.includes("인자.includes('--정말')"));
  검('⛔ 추적 안 하는 새 파일을 지우지 않는다 — clean 을 부르지 않는다',
    !나.includes("'" + "clean'"));

  /* 진짜 저장소에서 재 본다 — 자가시험만 돌고 본 실행이 안 도는 것을 막는다 */
  const 뿌리 = 저장소뿌리();
  검('지금 자리가 git 저장소다', !!뿌리);
  if (뿌리) {
    검('고친 것이 있나를 «못 쟀다»와 가른다', typeof 고친것있나(뿌리) === 'boolean');
    검('판 목록을 읽는다 — 비어 있어도 안 터진다', Array.isArray(판목록(뿌리)));
    검('새 파일 목록을 읽는다', Array.isArray(새파일들(뿌리)));
    검('⛔ 저장소 밖이면 null 이다 — 「없다」가 아니다',
      저장소뿌리(path.parse(process.cwd()).root) === null
      || 저장소뿌리(path.parse(process.cwd()).root) !== 뿌리);
  }

  console.log(탈 ? `\n🔴 자가시험 ${탈}건 탈` : `\n✅ 자가시험 ${통} 통과`);
  process.exit(탈 ? 1 : 0);
}

/* ⚠ 윈도에서 URL 길과 argv 길을 맞대면 어긋난다 — 이웃 자들이 쓰는 꼴을 그대로 쓴다 */
const 나를직접돌렸나 = (process.argv[1] || '').replace(/\\/g, '/').endsWith('직전판.mjs');
if (나를직접돌렸나) 주다();
