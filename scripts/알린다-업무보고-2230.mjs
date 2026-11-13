#!/usr/bin/env node
/**
 * 알린다-업무보고-2230.mjs — **보고 30분 전에 5번(나)을 부른다.**
 *
 * ── 🔴🔴 왜 (2026-11-12 23:0x · 사장님) ──────────────────────────────
 * 「**보고할 시간이 되면 자동으로 나한테 한일만 오게 하지마.**
 *   **자동으로 너한테 보고하라고 10시30분에 알림이 오게 해.**
 *   이게 업무보고를 아주 인하려고 작정을 했구먼. 똑바로 해.
 *   **업무보고. 네가 직접. 양식에 맞춰서**」
 *
 * [무엇이 잘못이었나]
 *   원고가 없으면 기계가 **커밋 목록을 긁어 스스로 지어 보냈다.** 사장님이 받으신 것은
 *   업무보고가 아니라 「한 일 목록」이었다 — 판단도, 계획도, 수치도 없었다.
 *   기계가 대신 내 주니 내가 안 썼고, 안 써도 아무 일이 없으니 날마다 그랬다.
 *
 * ⇒ 기계가 짓는 길은 끊었다(auto-1600 · auto-2300 둘 다).
 *   대신 **보고 30분 전에 나를 부른다.** 그 뒤는 내 손으로 쓴다.
 *
 * ── 🔴 [2026-11-13 · 5번] 16시 몫을 뒤늦게 붙인다 ─────────────────────
 *   11-12 에 23시 몫만 걸어 두었다. 그래서 11-13 **16시 보고가 통째로 빠졌다** —
 *   기계는 지시대로 짓지 않고 멈췄는데 **나를 부르는 쪽을 안 만들어 둔 것**이 원인이다.
 *   ⛔ 「짓지 못하게 막는 것」과 「내가 쓰게 만드는 것」은 다른 일이다. 둘 다 해야 끝이다.
 *
 * ⛔ 사장님 화면에 아무것도 안 띄운다 — 창도, 소리도 없다(2026-09-01 지시).
 *   이 알림은 **나한테** 오는 것이지 사장님께 가는 것이 아니다.
 *
 * 쓰는 법
 *   node scripts/알린다-업무보고-2230.mjs                 지금 23시 몫 알림을 남긴다
 *   node scripts/알린다-업무보고-2230.mjs --16시          16시 몫
 *   node scripts/알린다-업무보고-2230.mjs --예약등록       둘 다 예약작업으로 건다(15:30 · 22:30)
 *   node scripts/알린다-업무보고-2230.mjs --예약해제
 *   node scripts/알린다-업무보고-2230.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 알림길 = path.join(뿌리, 'docs', '업무보고-알림.txt');
const 보낸메일 = path.join(뿌리, 'docs', '보낸메일.tsv');

/**
 * 회차표 — 「언제 부르나 · 무엇을 찾아 이미 냈는지 보나」
 * 하한시: 그 시각 이후에 나간 것만 그날 보고로 센다(새벽에 나간 것을 그날 몫으로 세지 않는다)
 */
export const 회차표 = {
  '23시': { 마감: '23:00', 알림시각: '22:30', 작업이름: '업무보고-알림-2230', 하한시: 20, 보내는법: 'scripts/send-mail.mjs' },
  '16시': { 마감: '16:00', 알림시각: '15:30', 작업이름: '업무보고-알림-1530', 하한시: 12, 보내는법: 'scripts/send-1600-report.mjs' },
};

/** 오늘 — 이 PC 는 이미 한국시간이다. ⛔ toISOString() 금지 */
export function 오늘날짜(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 그 회차 업무보고가 오늘 이미 나갔나 — 하한시 이후에 나간 것만 센다 */
export function 이미냈나(줄들, 날 = 오늘날짜(), 회차 = '23시') {
  const 몫 = 회차표[회차];
  if (!몫) throw new Error(`모르는 회차 — ${회차}`);
  for (const 줄 of 줄들 ?? []) {
    const t = String(줄);
    if (!t.startsWith(날)) continue;
    const 시 = Number(t.slice(11, 13));
    if (!Number.isFinite(시) || 시 < 몫.하한시) continue;
    if (new RegExp(`${회차}\\s*업무보고`).test(t.split('\t')[3] ?? t)) return true;
  }
  return false;
}

export function 알림글(날, 때 = new Date(), 회차 = '23시') {
  const 몫 = 회차표[회차];
  const 시각 = `${String(때.getHours()).padStart(2, '0')}:${String(때.getMinutes()).padStart(2, '0')}`;
  return [
    `${날} ${시각}\t🔔 ${회차} 업무보고 — 지금 쓴다. 30분 남았다(마감 ${몫.마감}).`,
    '  ⛔ 기계는 짓지 않는다. 내가 쓴다. 양식 그대로 쓴다 —',
    '     ① 제목 「실적 보고 — 5번 〈SeoulMarkets · 총괄〉 · 날짜」',
    '     ② 표 하나 — 순방문자수 · 매출(B2B) · 매출(B2C) · 회원가입',
    '     ③ 표 둘 — 구분(콘텐트 · 데이터상품 · 개발 · 기타) × 한 일 · 할 일',
    '     ④ 특이사항',
    '  · 수치는 node scripts/잰다-보고재료.mjs 로 «재서» 적는다. 어림하지 않는다',
    '  · 금지어 검사를 먼저 돌린다 — node scripts/순한글-금지어.mjs <그 파일>',
    '  · 워드로 바꿔 보낸다 — 마크다운은 표가 깨진다',
    `  · 보내는 법 ${몫.보내는법}`,
    '  · 받는곳 parkintaek2@gmail.com  (⛔ 네이버 주소로 보내지 않는다)',
    '',
  ].join('\n');
}

function 예약등록() {
  let 다됐나 = true;
  for (const [회차, 몫] of Object.entries(회차표)) {
    const 꼬리 = 회차 === '23시' ? '' : ' --16시';
    const 치는것 = `cmd.exe /c cd /d "${뿌리}" && "C:\\Program Files\\nodejs\\node.exe" scripts/알린다-업무보고-2230.mjs${꼬리} >> "${path.join(뿌리, 'docs', '업무보고-알림-돌린기록.log')}" 2>&1`;
    const r = spawnSync('schtasks', ['/Create', '/F', '/SC', 'DAILY', '/ST', 몫.알림시각,
      '/TN', 몫.작업이름, '/TR', 치는것], { encoding: 'utf8' });
    console.log(`[${회차} · ${몫.알림시각}] ` + (r.stdout || '') + (r.stderr || ''));
    if (r.status !== 0) 다됐나 = false;
  }
  return 다됐나;
}

function 예약해제() {
  let 다됐나 = true;
  for (const 몫 of Object.values(회차표)) {
    const r = spawnSync('schtasks', ['/Delete', '/F', '/TN', 몫.작업이름], { encoding: 'utf8' });
    console.log((r.stdout || '') + (r.stderr || ''));
    if (r.status !== 0) 다됐나 = false;
  }
  return 다됐나;
}

function 자가시험() {
  let 탈 = 0;
  const 본다 = (무엇, 참인가) => { console.log((참인가 ? '  ✅ ' : '  🔴 ') + 무엇); if (!참인가) 탈++; };
  console.log('■ 자가시험');
  본다('20시 이후에 나간 23시 보고를 「냈다」로 센다',
    이미냈나(['2026-11-12\t23:04\tx\t[23시 업무보고] 2026-11-12 · 5번(총괄)'], '2026-11-12'));
  본다('새벽에 나간 것은 그날 보고로 세지 않는다',
    !이미냈나(['2026-11-12\t03:04\tx\t[23시 업무보고] 2026-11-12'], '2026-11-12'));
  본다('다른 날 것은 세지 않는다',
    !이미냈나(['2026-11-11\t23:04\tx\t[23시 업무보고] 2026-11-11'], '2026-11-12'));
  본다('알림글에 양식 네 가지가 다 적힌다',
    ['실적 보고', '순방문자수', '한 일', '특이사항'].every((w) => 알림글('2026-11-12').includes(w)));
  본다('알림글이 받는곳을 지메일로 적는다', 알림글('2026-11-12').includes('parkintaek2@gmail.com'));
  /* 🔴 [2026-11-13] 16시 몫 — 11-13 에 이것이 없어서 16시 보고가 통째로 빠졌다 */
  본다('16시 보고가 12시 이후에 나갔으면 「냈다」로 센다',
    이미냈나(['2026-11-13\t15:50\tx\t[16시 업무보고] 2026-11-13'], '2026-11-13', '16시'));
  본다('16시 몫은 아침에 나간 것을 그날 보고로 세지 않는다',
    !이미냈나(['2026-11-13\t08:44\tx\t[16시 업무보고] 2026-11-13'], '2026-11-13', '16시'));
  본다('23시 보고가 나갔다고 16시 몫이 꺼지지 않는다',
    !이미냈나(['2026-11-13\t22:31\tx\t[23시 업무보고] 2026-11-13'], '2026-11-13', '16시'));
  본다('16시 알림글이 16시 보내는 법을 적는다', 알림글('2026-11-13', new Date(), '16시').includes('send-1600-report.mjs'));
  본다('두 회차의 예약작업 이름이 서로 다르다', 회차표['23시'].작업이름 !== 회차표['16시'].작업이름);
  console.log(탈 ? `🔴 ${탈}가지 틀렸다` : '🟢 다 맞다');
  return 탈 === 0;
}

const 내가진입점 = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (내가진입점) {
  if (process.argv.includes('--자가시험')) process.exit(자가시험() ? 0 : 1);
  if (process.argv.includes('--예약등록')) process.exit(예약등록() ? 0 : 1);
  if (process.argv.includes('--예약해제')) process.exit(예약해제() ? 0 : 1);

  const 회차 = process.argv.includes('--16시') ? '16시' : '23시';
  const 날 = 오늘날짜();
  let 대장 = [];
  try { 대장 = fs.readFileSync(보낸메일, 'utf8').split(/\r?\n/); } catch { 대장 = []; }
  if (이미냈나(대장, 날, 회차)) {
    console.log(`✅ ${날} ${회차} 업무보고는 이미 나갔다 — 부르지 않는다`);
    process.exit(0);
  }
  fs.mkdirSync(path.dirname(알림길), { recursive: true });
  fs.appendFileSync(알림길, 알림글(날, new Date(), 회차), 'utf8');
  console.log(알림글(날, new Date(), 회차));
  console.log(`🔔 5번을 불렀다 — docs/업무보고-알림.txt (${회차} 몫)`);
}
