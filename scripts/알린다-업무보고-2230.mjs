#!/usr/bin/env node
/**
 * 알린다-업무보고-2230.mjs — **22시 30분에 5번(나)을 부른다.**
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
 *   대신 **이 자가 22:30 에 나를 부른다.** 그 뒤는 내 손으로 쓴다.
 *
 * ⛔ 사장님 화면에 아무것도 안 띄운다 — 창도, 소리도 없다(2026-09-01 지시).
 *   이 알림은 **나한테** 오는 것이지 사장님께 가는 것이 아니다.
 *
 * 쓰는 법
 *   node scripts/알린다-업무보고-2230.mjs           지금 알림을 남긴다
 *   node scripts/알린다-업무보고-2230.mjs --예약등록   윈도 예약작업으로 건다(날마다 22:30)
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
const 작업이름 = '업무보고-알림-2230';

/** 오늘 — 이 PC 는 이미 한국시간이다. ⛔ toISOString() 금지 */
export function 오늘날짜(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 오늘 23시 업무보고가 이미 나갔나 — 그날 20시 이후에 나간 것만 센다 */
export function 이미냈나(줄들, 날 = 오늘날짜()) {
  for (const 줄 of 줄들 ?? []) {
    const t = String(줄);
    if (!t.startsWith(날)) continue;
    const 시 = Number(t.slice(11, 13));
    if (!Number.isFinite(시) || 시 < 20) continue;
    if (/23시\s*업무보고/.test(t.split('\t')[3] ?? t)) return true;
  }
  return false;
}

export function 알림글(날, 때 = new Date()) {
  const 시각 = `${String(때.getHours()).padStart(2, '0')}:${String(때.getMinutes()).padStart(2, '0')}`;
  return [
    `${날} ${시각}\t🔔 23시 업무보고 — 지금 쓴다. 30분 남았다.`,
    '  ⛔ 기계는 짓지 않는다. 내가 쓴다. 양식 그대로 쓴다 —',
    '     ① 제목 「실적 보고 — 5번 〈SeoulMarkets · 총괄〉 · 날짜」',
    '     ② 표 하나 — 순방문자수 · 매출(B2B) · 매출(B2C) · 회원가입',
    '     ③ 표 둘 — 구분(콘텐트 · 데이터상품 · 개발 · 기타) × 한 일 · 할 일',
    '     ④ 특이사항',
    '  · 수치는 node scripts/잰다-보고재료.mjs 로 «재서» 적는다. 어림하지 않는다',
    '  · 워드로 바꿔 보낸다 — 마크다운은 표가 깨진다',
    '  · 받는곳 parkintaek2@gmail.com  (⛔ 네이버 주소로 보내지 않는다)',
    '',
  ].join('\n');
}

function 예약등록() {
  const 치는것 = `cmd.exe /c cd /d "${뿌리}" && "C:\\Program Files\\nodejs\\node.exe" scripts/알린다-업무보고-2230.mjs >> "${path.join(뿌리, 'docs', '업무보고-알림-돌린기록.log')}" 2>&1`;
  const r = spawnSync('schtasks', ['/Create', '/F', '/SC', 'DAILY', '/ST', '22:30',
    '/TN', 작업이름, '/TR', 치는것], { encoding: 'utf8' });
  console.log((r.stdout || '') + (r.stderr || ''));
  return r.status === 0;
}

function 예약해제() {
  const r = spawnSync('schtasks', ['/Delete', '/F', '/TN', 작업이름], { encoding: 'utf8' });
  console.log((r.stdout || '') + (r.stderr || ''));
  return r.status === 0;
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
  console.log(탈 ? `🔴 ${탈}가지 틀렸다` : '🟢 다 맞다');
  return 탈 === 0;
}

const 내가진입점 = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (내가진입점) {
  if (process.argv.includes('--자가시험')) process.exit(자가시험() ? 0 : 1);
  if (process.argv.includes('--예약등록')) process.exit(예약등록() ? 0 : 1);
  if (process.argv.includes('--예약해제')) process.exit(예약해제() ? 0 : 1);

  const 날 = 오늘날짜();
  let 대장 = [];
  try { 대장 = fs.readFileSync(보낸메일, 'utf8').split(/\r?\n/); } catch { 대장 = []; }
  if (이미냈나(대장, 날)) {
    console.log(`✅ ${날} 23시 업무보고는 이미 나갔다 — 부르지 않는다`);
    process.exit(0);
  }
  fs.mkdirSync(path.dirname(알림길), { recursive: true });
  fs.appendFileSync(알림길, 알림글(날), 'utf8');
  console.log(알림글(날));
  console.log('🔔 5번을 불렀다 — docs/업무보고-알림.txt');
}
