#!/usr/bin/env node
/**
 * install-1116-fa-order.mjs — **11월 16일(월) 15시 회차에 프로야구 FA 결산 주문을 넣는다.**
 *
 * 사장님 (2026-11-14 밤) 「kbo리그 야구 결산은 16일 명단 나오면 해」
 *   FA 승인 선수 명단은 11월 16일(월)에 공시된다. 15일에 쓰면 짐작으로 메우게 된다.
 *
 * 왜 이 자가 따로 있나 —
 *   ⓿ 박스는 «그날 아침에» 갈아 끼워야 한다. 15일에 미리 넣으면 15일 회차가 그것을 읽는다.
 *   그런데 창 안에서만 사는 예약(session-only cron)은 창이 닫히면 같이 죽는다.
 *   그래서 **작업 스케줄러**에 걸고, 이 자가 그날 아침 혼자 넣는다.
 *
 * ⛔ 파일 이름을 ASCII 로 둔다 — 예약이 한글 인자를 CP949 로 읽어 깨뜨린 적이 있다.
 *   한글 경로는 이 파일 «안»에만 둔다. node 가 UTF-8 로 읽으므로 안전하다.
 *
 * 쓰는 법
 *   node scripts/install-1116-fa-order.mjs            넣는다
 *   node scripts/install-1116-fa-order.mjs --dry      넣지 않고 무엇을 할지만 본다
 *   node scripts/install-1116-fa-order.mjs --selftest 판정 규칙을 검산한다
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 주문 = path.join(뿌리, 'docs', '주문-20261116-15시-프로야구결산FA.txt');
const 회차 = '15';
const 넣는날 = '2026-11-16';
const 자국 = path.join(뿌리, 'docs', '고정업무-마커', 'FA결산-주문넣은자국.txt');

/** 오늘 KST 를 YYYY-MM-DD 로 — ⛔ toISOString() 을 쓰지 않는다 */
export function 오늘KST(이제 = new Date()) {
  return 이제.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
}

/**
 * **넣을 날인가** — 그날이 와야 넣는다.
 * ⛔ 하루라도 이르면 안 넣는다. 15일 회차가 16일 주문을 읽어 버린다.
 * ⭐ 늦게 도는 것은 받아 준다 — 15시 회차보다만 앞서면 된다.
 */
export function 넣을날인가(오늘, 그날 = 넣는날) {
  return String(오늘) === String(그날);
}

/** 이미 넣었나 — 두 번 넣지 않는다 */
export function 이미넣었나(자국글, 그날 = 넣는날) {
  return String(자국글 ?? '').includes(그날);
}

if (process.argv.includes('--selftest')) {
  const 본다 = [];
  const 잰다 = (이름, 참) => 본다.push([이름, !!참]);
  잰다('그날이면 넣는다', 넣을날인가('2026-11-16') === true);
  잰다('하루 일러도 안 넣는다', 넣을날인가('2026-11-15') === false);
  잰다('하루 늦으면 안 넣는다', 넣을날인가('2026-11-17') === false);
  잰다('빈 값은 안 넣는다', 넣을날인가('') === false);
  잰다('자국이 있으면 두 번 안 넣는다', 이미넣었나('2026-11-16 09:00 넣었다') === true);
  잰다('자국이 없으면 넣는다', 이미넣었나('') === false);
  잰다('다른 날 자국은 쳐 주지 않는다', 이미넣었나('2026-11-15 09:00 넣었다') === false);
  잰다('오늘KST 는 열 글자다', /^\d{4}-\d{2}-\d{2}$/.test(오늘KST()));
  잰다('주문 파일이 있다', fs.existsSync(주문));
  const 깨짐 = 본다.filter(([, ok]) => !ok);
  for (const [이름, ok] of 본다) console.log(`${ok ? '  ✅' : '  🔴'} ${이름}`);
  console.log(깨짐.length ? `🔴 ${깨짐.length}가지가 깨졌다` : `✅ ${본다.length}가지 다 통과`);
  process.exit(깨짐.length ? 1 : 0);
}

const 볼뿐 = process.argv.includes('--dry');
const 오늘 = 오늘KST();

if (!넣을날인가(오늘)) {
  console.log(`⬜ 오늘은 ${오늘} 이다 — 넣는 날(${넣는날})이 아니다. 아무것도 안 한다`);
  process.exit(0);
}
if (fs.existsSync(자국) && 이미넣었나(fs.readFileSync(자국, 'utf8'))) {
  console.log('⬜ 이미 넣었다 — 두 번 넣지 않는다');
  process.exit(0);
}
if (!fs.existsSync(주문)) {
  console.log(`🔴 주문 파일이 없다 — ${주문}`);
  process.exit(1);
}

/* ⭐ 넣기 전에 금지어를 잰다. 밖으로 나가는 글이다 */
execFileSync('node', [path.join(뿌리, 'scripts', '밖으로나가는말-관문.mjs'), 주문], { stdio: 'inherit' });

if (볼뿐) { console.log(`⬜ --dry — 여기서 멈춘다. 넣었다면 ${회차}시 회차였다`); process.exit(0); }

execFileSync('node', [path.join(뿌리, 'scripts', '시킨다-내일주문.mjs'),
  `--회차=${회차}`, `--글=${주문}`, '--적는다'], { stdio: 'inherit' });

fs.mkdirSync(path.dirname(자국), { recursive: true });
const 때 = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' });
fs.appendFileSync(자국, `${때}\t${넣는날}\t${회차}시\t${path.basename(주문)}\n`);
console.log(`✅ ${회차}시 회차에 넣었다 — ${때}`);
