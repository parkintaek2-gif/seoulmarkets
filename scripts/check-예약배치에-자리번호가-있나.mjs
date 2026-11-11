#!/usr/bin/env node
/**
 * check-예약배치에-자리번호가-있나.mjs — **예약 배치 파일이 «자리 번호»를 걸고 도나.**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔴🔴 [2026-11-11 · 5번] **기사 스무 편이 이것 하나 때문에 안 나갔다.**
 *
 * [무슨 일이]
 *   `run-jbnews-sports-collect.cmd` 에 `set "CLAUDE_SEAT=5"` 가 없었다.
 *   그러면 `send-mail.mjs` 가 보내는 주소를 **cs@klifedesign.net** 으로 떨어뜨린다.
 *   그 주소에는 위임이 걸려 있지 않아 구글이 토큰을 안 준다 —
 *     「🔴 위임 토큰을 못 받았다 — **못 보냈다.**」
 *   거둠 로그에 그 줄이 **520번** 쌓여 있었고, 평일 닷새에 기사 스무 편이 안 나갔다.
 *   ⛔ 예약은 돌고 있었다. 기사도 써졌다. 데스킹도 통과했다. **마지막 한 걸음에서 샜다.**
 *
 * [실측으로 확인한 것]
 *   ```
 *   CLAUDE_SEAT=5  → 보내는 주소 admin@klifedesign.net · ✅ 위임 토큰 받았다
 *   CLAUDE_SEAT 없음 → 보내는 주소 cs@klifedesign.net   · 🔴 위임 토큰을 못 받았다
 *   ```
 *
 * [왜 이 검사인가]
 *   ⛔ 「앞으로 조심한다」로는 안 끝난다. 배치 파일은 새로 생기고, 생길 때마다 잊는다.
 *   ⭐ 자리 번호를 안 거는 것은 **공짜로 얻을 것이 없는 손해**다 — 메일을 안 보내는
 *     배치라도 걸어 두면 나중에 메일을 붙일 때 안 샌다. 그래서 **전부** 요구한다.
 *
 * 쓰는 법
 *   node scripts/check-예약배치에-자리번호가-있나.mjs
 *   node scripts/check-예약배치에-자리번호가-있나.mjs --고친다
 *   node scripts/check-예약배치에-자리번호가-있나.mjs --자가시험
 *
 * 끝났다고 보는 기준 — 「자리 번호가 빠진 배치 0개」. 빠지면 1 로 끝난다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 배치방 = path.join(뿌리, 'scripts');

/** 이 자리의 번호 — ⛔ 다른 자리에서 돌리면 이 수를 고친다 */
export const 내자리 = '5';

/** node 를 부르는 배치인가 — 안 부르면 이 검사와 상관없다 */
export function 노드를부르나(글) {
  return /^\s*(?:call\s+)?node[\s"]/im.test(String(글 ?? ''));
}

/** 자리 번호를 걸었나 */
export function 자리를걸었나(글) {
  return /^\s*set\s+"?CLAUDE_SEAT\s*=/im.test(String(글 ?? ''));
}

/**
 * 🔴 [2026-11-11] **줄바꿈이 LF 면 cmd.exe 가 읽다 어긋난다.**
 *   2026-09 에 자동 작업 여섯이 이것 하나로 조용히 죽어 있었다.
 *   오늘 `auto-2300-report.cmd` 와 `확인한다-밤보고.cmd` 가 LF 로 저장돼 있었다 —
 *   둘 다 오늘 밤에 도는 자다. ⇒ 자리 번호와 «같은 자»가 함께 잰다.
 */
export function 줄바꿈이성한가(글) {
  const s = String(글 ?? '');
  if (!s.includes('\n')) return true;
  /* CR 없는 LF 가 하나라도 있으면 어긋난다 */
  return !/(^|[^\r])\n/.test(s);
}

/** 넣을 줄 — chcp 줄 바로 뒤에 둔다. ⚠ 배치는 CRLF 다 */
export function 넣을줄(자리 = 내자리) {
  return 'rem  🔴 [2026-11-11] 자리 번호가 없으면 send-mail 이 cs@ 로 떨어져 못 보낸다\r\n'
    + `set "CLAUDE_SEAT=${자리}"\r\n`;
}

/** 글에 자리 줄을 끼운다 → 바뀐 글 (이미 있으면 그대로) */
export function 끼운다(글, 자리 = 내자리) {
  const s = String(글 ?? '');
  if (자리를걸었나(s)) return s;
  const m = s.match(/^.*chcp\s+65001[^\r\n]*\r?\n/im);
  if (m) {
    const 끝 = (m.index ?? 0) + m[0].length;
    return s.slice(0, 끝) + 넣을줄(자리) + s.slice(끝);
  }
  /* chcp 줄이 없으면 @echo off 뒤에, 그것도 없으면 맨 앞에 */
  const e = s.match(/^@echo off[^\r\n]*\r?\n/im);
  if (e) {
    const 끝 = (e.index ?? 0) + e[0].length;
    return s.slice(0, 끝) + 넣을줄(자리) + s.slice(끝);
  }
  return 넣을줄(자리) + s;
}

export function 모은다(방 = 배치방) {
  if (!fs.existsSync(방)) return [];
  return fs.readdirSync(방).filter((n) => n.toLowerCase().endsWith('.cmd'))
    .map((n) => path.join(방, n));
}

async function 주다() {
  if (process.argv.includes('--자가시험')) return 자가시험();
  const 고친다 = process.argv.includes('--고친다');

  const 것들 = 모은다();
  const 빠진것 = [];
  const 줄바꿈깨진것 = [];
  let 본것 = 0;
  for (const 길 of 것들) {
    let 글 = fs.readFileSync(길, 'utf8');
    if (!노드를부르나(글)) continue;
    본것 += 1;
    let 고쳤나 = false;
    if (!자리를걸었나(글)) { 빠진것.push(길); 글 = 끼운다(글); 고쳤나 = true; }
    if (!줄바꿈이성한가(글)) {
      줄바꿈깨진것.push(길);
      글 = 글.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
      고쳤나 = true;
    }
    if (고친다 && 고쳤나) fs.writeFileSync(길, 글, 'utf8');
  }

  console.log(`■ node 를 부르는 예약 배치 ${본것}개를 쟀다`);
  if (!빠진것.length && !줄바꿈깨진것.length) {
    console.log('✅ 자리 번호가 빠진 배치 0개 · 줄바꿈이 어긋난 배치 0개');
    process.exit(0);
  }
  for (const 길 of 빠진것) console.log(`   🔴 자리 번호 없음 — ${path.relative(뿌리, 길).replace(/\\/g, '/')}`);
  for (const 길 of 줄바꿈깨진것) console.log(`   🔴 줄바꿈이 LF 다 — ${path.relative(뿌리, 길).replace(/\\/g, '/')}`);
  if (고친다) {
    console.log(`\n✅ 자리 번호 ${빠진것.length}개 · 줄바꿈 ${줄바꿈깨진것.length}개를 고쳤다`);
    process.exit(0);
  }
  console.log('\n⛔ 그대로 두면 — 자리 번호가 없으면 메일이 cs@ 로 떨어져 «못 보내고»,');
  console.log('   줄바꿈이 LF 면 cmd.exe 가 읽다 어긋나 «조용히 건너뛴다»(종료코드는 0 이다)');
  console.log('   고치려면 — node scripts/check-예약배치에-자리번호가-있나.mjs --고친다');
  process.exit(1);
}

function 자가시험() {
  let 통 = 0; let 탈 = 0;
  const 검 = (이름, 참) => { if (참) { 통++; console.log('✅', 이름); } else { 탈++; console.log('🔴', 이름); } };
  const 줄 = (x) => x.join('\r\n') + '\r\n';

  검('🔴 node 를 부르는 배치를 집는다', 노드를부르나(줄(['@echo off', 'node "scripts/a.mjs"'])));
  검('🔴 call node 도 집는다', 노드를부르나(줄(['call node a.mjs'])));
  검('⛔ node 를 안 부르면 안 집는다', !노드를부르나(줄(['@echo off', 'echo 안녕'])));
  검('🔴 자리 줄을 알아본다', 자리를걸었나(줄(['set "CLAUDE_SEAT=5"'])));
  검('🔴 따옴표가 없어도 알아본다', 자리를걸었나(줄(['set CLAUDE_SEAT=1'])));
  검('⛔ 비슷한 이름에 속지 않는다', !자리를걸었나(줄(['set "CLAUDE_SEATS_TOTAL=3"'])));

  const 원 = 줄(['@echo off', 'chcp 65001 >nul', 'node "scripts/a.mjs"']);
  const 뒤 = 끼운다(원);
  검('🔴 chcp 바로 뒤에 넣는다',
    뒤.indexOf('CLAUDE_SEAT') > 뒤.indexOf('chcp 65001') && 뒤.indexOf('CLAUDE_SEAT') < 뒤.indexOf('node '));
  검('⛔ 줄바꿈을 CRLF 로 넣는다 — LF 면 cmd 가 못 읽는다',
    /set "CLAUDE_SEAT=5"\r\n/.test(뒤));
  검('⛔ 이미 걸려 있으면 두 번 안 넣는다',
    끼운다(줄(['@echo off', 'set "CLAUDE_SEAT=5"', 'node a.mjs'])).match(/CLAUDE_SEAT/g).length === 1);
  검('🔴 chcp 가 없으면 @echo off 뒤에 넣는다',
    끼운다(줄(['@echo off', 'node a.mjs'])).indexOf('CLAUDE_SEAT') < 끼운다(줄(['@echo off', 'node a.mjs'])).indexOf('node '));
  검('⛔ 본문을 지우지 않는다', 뒤.includes('node "scripts/a.mjs"'));
  검('🔴 저장소의 배치를 실제로 모은다', 모은다().length > 0);
  /* 🔴 [2026-11-11] 줄바꿈 */
  검('🔴 CRLF 는 성하다고 본다', 줄바꿈이성한가('@echo off\r\nnode a.mjs\r\n'));
  검('🔴 LF 하나만 섞여도 어긋났다고 본다', !줄바꿈이성한가('@echo off\r\nnode a.mjs\n'));
  검('⛔ 줄바꿈이 아예 없으면 성한 것이다', 줄바꿈이성한가('@echo off'));
  검('⛔ 빈 것에 안 터진다', 줄바꿈이성한가('') && 줄바꿈이성한가(null));

  console.log(탈 ? `\n🔴 자가시험 ${탈}건 탈` : `\n✅ 자가시험 ${통} 통과`);
  process.exit(탈 ? 1 : 0);
}

const 나를직접돌렸나 = (process.argv[1] || '').replace(/\\/g, '/').endsWith('check-예약배치에-자리번호가-있나.mjs');
if (나를직접돌렸나) await 주다();
