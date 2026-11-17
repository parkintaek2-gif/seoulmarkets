#!/usr/bin/env node
/**
 * sports-20261118.mjs — **11월 18일 아침 스포츠 기사 세 건을 시킨다.**
 *
 * ── 🔴🔴 사장님 2026-11-17 밤 ─────────────────────────────────────
 * 「**내일 아침에만 날씨기사 쓰지마**」
 * 「**농구, 배구. 축구대표팀과 카타르의 평가전 등 기사가 필요해.
 *    중부매일1 토큰 리셋되면 작성, 데스킹. 이메일 전송 다 하게 해**」
 *
 * ⚠ 중부매일1 계정의 주간 한도가 11월 18일 05시에 풀린다. 그 전에는 시켜도
 *   한 글자도 안 써진다 — 「✅ 시켰다」만 찍히고 받는 쪽은 못 본다(2026-11-17 에 겪었다).
 *   ⇒ 이 자는 05:00 «정각»에 돈다. 사장님 「중부매일 토큰 리셋되는 시간에 작성 시작해」
 *     잠겨 있으면 5분 간격으로 여섯 번까지 다시 친다(05:00~05:25).
 *
 * ⛔ 이름을 영문으로 둔다 — 예약 배치(.cmd)는 CP949 로 읽히므로 한글 경로가 깨진다.
 * ⛔ 인자를 받지 않는다. 윈도 예약을 거치면 한글 인자가 CP949 로 깨져
 *   「모르는 인자」가 되고, 그러면 아무 일도 안 하면서 exit 0 을 낸다.
 *   조용히 성공한 척하는 것이 제일 나쁘다. ⇒ 회차와 글 경로를 여기 박아 둔다.
 *
 * ⛔ 내가 기사를 쓰지 않는다. 쓰는 것은 중부매일 계정이다(사장님 2026-09-29).
 *
 * 하는 일
 *   ① 09시 회차 대화에 지시문을 넣는다 (시킨다-중부매일-기사.mjs)
 *   ② 거두기·데스킹·발송은 그 뒤 예약들이 한다 —
 *      05:50 데스킹 → 06:10 발송. 08:00 거두기와 12:40 「기사 다 갔나」는 그물로 남긴다
 *   🔴 사장님 「뭔 시간 간격을 오래 두나」 — 작성이 끝나면 끌지 않고 바로 본다
 *
 * 쓰는 법
 *   node scripts/sports-20261118.mjs
 *   node scripts/sports-20261118.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const 회차 = '09';
export const 글길 = 'docs/지시-중부매일-20261118-스포츠셋.txt';
export const 한도풀리는시각 = '2026-11-18 05:00';

/** 지금이 한도가 풀린 뒤인가 — 그 전에는 시켜도 안 써진다 */
export function 풀렸나(이제 = new Date()) {
  const [날, 때] = 한도풀리는시각.split(' ');
  const [y, m, d] = 날.split('-').map(Number);
  const [h, mi] = 때.split(':').map(Number);
  return 이제.getTime() >= new Date(y, m - 1, d, h, mi, 0).getTime();
}

export function 자가시험() {
  let 탈 = 0;
  const 본다 = (이름, 참) => { if (!참) { 탈 += 1; console.log('🔴 ' + 이름); } else console.log('✅ ' + 이름); };
  본다('지시문이 있다', fs.existsSync(path.join(뿌리, 글길)));
  const 글 = fs.existsSync(path.join(뿌리, 글길)) ? fs.readFileSync(path.join(뿌리, 글길), 'utf8') : '';
  본다('🔴 축구 카타르 평가전을 시킨다', /카타르/.test(글));
  본다('🔴 농구를 시킨다', /농구/.test(글) && /KBL/.test(글));
  본다('🔴 배구는 여자부라고 못박는다', /여자부/.test(글) && /남자부는 쓰지 않습니다/.test(글));
  본다('🔴 공식 사이트에서 확인하라고 적었다', /kfa\.or\.kr/.test(글) && /kbl\.or\.kr/.test(글) && /kovo\.co\.kr/.test(글));
  본다('🔴 확인 안 된 수치를 적지 말라고 했다', /확인되지 않은 수치는 적지 않습니다/.test(글));
  본다('🔴 바이라인을 못박는다', /중부매일 박인택 기자/.test(글));
  본다('🔴 경기가 없으면 지어내지 말라고 했다', /지어내지 않습니다/.test(글));
  본다('한도 풀린 뒤에만 참이다 (05:00 전)', !풀렸나(new Date(2026, 10, 18, 4, 59)));
  본다('한도 풀린 뒤에는 참이다 (05:20)', 풀렸나(new Date(2026, 10, 18, 5, 20)));
  본다('시키는 자가 있다', fs.existsSync(path.join(뿌리, 'scripts', '시킨다-중부매일-기사.mjs')));
  console.log(탈 ? '\n🔴 자가시험 ' + 탈 + '건 탈' : '\n✅ 자가시험 통과');
  return 탈 === 0;
}

const 나인가 = process.argv[1] && process.argv[1].includes('sports-20261118');
if (나인가) {
  if (process.argv.includes('--자가시험')) process.exit(자가시험() ? 0 : 1);

  const 이제 = new Date();
  const 두자리 = (v) => String(v).padStart(2, '0');
  const 때 = 두자리(이제.getHours()) + ':' + 두자리(이제.getMinutes());
  console.log('■ ' + 때 + ' 11월 18일 스포츠 기사 세 건을 ' + 회차 + '시 회차에 시킨다');

  if (!풀렸나(이제)) {
    console.log('🔴 아직 한도가 안 풀렸다 — ' + 한도풀리는시각 + ' 뒤에 돌아야 한다.');
    console.log('   ⛔ 지금 시키면 「시켰다」만 찍히고 한 글자도 안 써진다.');
    process.exit(3);
  }

  const 글전체 = path.join(뿌리, 글길);
  if (!fs.existsSync(글전체)) {
    console.log('🔴 지시문이 없다 — ' + 글길);
    process.exit(2);
  }

  /* 🔴🔴 [2026-11-17 밤 · 사장님] 「**중부매일 토큰 리셋되는 시간에 작성 시작해**」
     ─────────────────────────────────────────────────────────────────
     05시 정각에 친다. 다만 한도가 그 «초»에 꼭 풀린다는 보장이 없다 —
     잠겨 있으면 5분 뒤 다시 치고 여섯 번까지 해 본다(05:00 ~ 05:25).
     ⛔ 한 번 막혔다고 물러나지 않는다. 물러나면 그날 기사가 통째로 빈다.
     ⛔ 끝없이 치지도 않는다 — 여섯 번에 안 되면 기록을 남기고 선다.
       그때는 05:50 데스킹 자리에서 사람이 보고 판단한다. */
  const 다시칠틈 = 5 * 60 * 1000;
  const 끝까지 = 6;
  let 됐나 = false;
  for (let 번 = 1; 번 <= 끝까지 && !됐나; 번 += 1) {
    if (번 > 1) {
      console.log('   ⏳ 5분 뒤에 다시 친다 (' + 번 + '/' + 끝까지 + ')');
      spawnSync(process.execPath, ['-e', 'setTimeout(function(){}, ' + 다시칠틈 + ')']);
    }
    const 답 = spawnSync(process.execPath,
      [path.join(뿌리, 'scripts', '시킨다-중부매일-기사.mjs'), '--회차', 회차, '--글', 글전체],
      { cwd: 뿌리, encoding: 'utf8', timeout: 12 * 60 * 1000, env: { ...process.env, CLAUDE_SEAT: '5' } });
    const 나온글 = String(답.stdout ?? '').trim();
    console.log(나온글);
    if (답.stderr) console.log(String(답.stderr).trim());
    /* 한도가 아직 잠겨 있으면 그 말이 화면에 나온다 — 그때만 다시 친다 */
    const 아직잠겼나 = /한도|quota|limit|보내기 단추|꺼져 있/i.test(나온글);
    if (답.status === 0 && !아직잠겼나) { 됐나 = true; break; }
    console.log('   ⚠ ' + 번 + '번째가 안 됐다 — 끝값 ' + 답.status + (아직잠겼나 ? ' · 아직 잠겨 있다' : ''));
  }

  if (!됐나) {
    console.log('🔴 ' + 끝까지 + '번 쳐도 안 됐다 — 기사를 못 시켰다.');
    console.log('   ⚠ 05:50 데스킹 자리에서 사람이 보고 판단한다.');
    process.exit(1);
  }
  console.log('✅ 시켰다. 05:50 에 데스킹하고 06:10 에 보낸다.');
  console.log('   ⚠ 「시켰다」는 「받았다」가 아니다 — 12:40 「기사 다 갔나」가 다시 본다.');
}
