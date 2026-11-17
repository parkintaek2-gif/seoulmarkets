/**
 * 잰다-걷어낸뒤-사람수.mjs — 수집기와 우리 점검을 걷어낸 **사람 수**는 얼마인가.
 *
 * 🔴 사장님 목표는 「사이트마다 하루 순방문자 1,000명」이다. 그 분모가 부풀어
 *   있으면 목표까지의 거리를 잘못 읽는다.
 * ⛔ 깎는 것이 목적이 아니다. **가린 것을 적고 둘 다 보인다.**
 *
 * 걷어내는 것
 *   ① 싱가포르에서 오는 직접유입 — 영어 두 사이트를 전수 순회하는 수집기
 *   ② KLifeMap 의 /checkout·/login·/dashboard — 우리 결제 점검
 */
import { 토큰받기, 재기, 우리것인가, 사이트이름 } from './lib/ga4.mjs';

const t = await 토큰받기();
if (t.못잼) { console.log('🔴', t.못잼); process.exit(0); }

const 일 = 28;

/* 사이트 × 나라 × 유입원 */
const 줄들 = await 재기(t.토큰, t.속성, ['hostName', 'country', 'sessionSource'],
  { 시작: `${일}daysAgo`, 끝: 'yesterday' });

const 표 = {};
for (const r of 줄들 || []) {
  const [h, 나라, 원] = r.값;
  if (!우리것인가(h)) continue;
  const s = 사이트이름(h);
  const c = (표[s] ??= { 전체: 0, 싱가포르직접: 0, 한국: 0 });
  c.전체 += r.수;
  if (나라 === 'Singapore' && /^\(direct\)$/i.test(원)) c.싱가포르직접 += r.수;
  if (나라 === 'South Korea') c.한국 += r.수;
}

/* KLifeMap 우리 점검 */
const 지면줄 = await 재기(t.토큰, t.속성, ['hostName', 'pagePath'], { 시작: `${일}daysAgo`, 끝: 'yesterday' });
let 점검 = 0;
for (const r of 지면줄 || []) {
  const [h, p] = r.값;
  if (!/klifemap/i.test(h)) continue;
  if (/^\/(checkout|login|dashboard)\.html/i.test(p)) 점검 += r.수;
}

console.log(`\n📏 걷어낸 뒤의 사람 수 — ${일}일 · 하루 평균\n`);
console.log('  사이트              전체/일   걷어낸 것/일   사람/일   목표 1,000명 대비');
console.log('  ' + '─'.repeat(74));

let 합전체 = 0, 합사람 = 0;
for (const [s, c] of Object.entries(표).sort((a, b) => b[1].전체 - a[1].전체)) {
  const 걷을것 = c.싱가포르직접 + (/klifemap/i.test(s) ? 점검 : 0);
  const 사람 = Math.max(0, c.전체 - 걷을것);
  합전체 += c.전체; 합사람 += 사람;
  console.log('  ' + s.padEnd(20)
    + (c.전체 / 일).toFixed(1).padStart(8)
    + (걷을것 / 일).toFixed(1).padStart(14)
    + (사람 / 일).toFixed(1).padStart(10)
    + (Math.round((사람 / 일) / 10) + '%').padStart(14));
}
console.log('  ' + '─'.repeat(74));
console.log('  ' + '합 (네 사이트)'.padEnd(20)
  + (합전체 / 일).toFixed(1).padStart(8)
  + ((합전체 - 합사람) / 일).toFixed(1).padStart(14)
  + (합사람 / 일).toFixed(1).padStart(10)
  + (Math.round((합사람 / 일) / 40) + '%').padStart(14) + '  (목표 4,000명)');

console.log('\n  ⬜ 걷어낸 것 — 싱가포르 직접유입(수집기) + KLifeMap 우리 결제 점검');
console.log('  ⛔ 이 수도 «가린 것»이지 확정이 아니다. 가린 방법을 함께 적는다.');
console.log('  ⛔ 사이트별이 먼저고 합은 끝에 한 줄이다.\n');
