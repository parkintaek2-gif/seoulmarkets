#!/usr/bin/env node
/**
 * 잰다-매출.mjs — **KLifeMap 결제(B2C 매출)를 날마다 셉니다.**
 *
 * ── 왜 만드나 (2026-11-19 23:50 · 5번) ───────────────────────────
 * 사장님 — 「**매출 B2C는 케이라이프맵이잖아. 광고는 B2B**」
 * 실적 보고에서 광고 수입을 B2C 칸에 적었습니다. 틀렸습니다.
 *   B2C = 케이라이프맵에서 손님이 내는 돈 (사주·궁합·별자리)
 *   B2B = 광고 (애드센스)
 * B2C 를 재는 도구가 아예 없어서 만듭니다.
 *
 * ⛔ 손님 이름·메일 주소를 한 글자도 찍지 않습니다. 날짜와 건수와 금액만 봅니다.
 * ⛔ 못 읽으면 0 이라 적지 않습니다. 「측정하지 못했다」와 그 이유를 적습니다.
 * ⛔ 승인(capture)을 부르지 않습니다. 읽기만 합니다.
 *
 * 쓰는 법
 *   node scripts/잰다-매출.mjs
 *   node scripts/잰다-매출.mjs 30        며칠치를 볼지
 *   node scripts/잰다-매출.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const 여기 = path.dirname(url.fileURLToPath(import.meta.url));
export const 장부있는곳 = 'C:/Users/User/Documents/GitHub/klifemap';

export function 열쇠를읽는다(env, 이름) {
  const m = new RegExp('^' + 이름 + '\\s*=\\s*(.+)$', 'm').exec(String(env ?? ''));
  if (!m) return null;
  return m[1].trim().replace(/^['"]|['"]$/g, '') || null;
}

/** 돈이 실제로 들어온 것만 셉니다. 대기·취소·실패는 매출이 아닙니다 */
export function 치러졌나(줄) {
  const s = String(줄?.status ?? 줄?.상태 ?? '').toLowerCase();
  return /paid|done|approved|success|완료|승인/.test(s) && !/cancel|refund|fail|취소|환불|실패/.test(s);
}

/** 우리 점검 주문은 매출이 아닙니다 */
export function 우리것인가(줄) {
  const s = JSON.stringify(줄 ?? {}).toLowerCase();
  return /paycheck|test|점검|선생/.test(s);
}

export function 금액(줄) {
  const v = Number(줄?.amount ?? 줄?.finalAmount ?? 줄?.금액 ?? 줄?.paidAmount);
  return Number.isFinite(v) ? v : 0;
}

export function 날(줄) {
  const s = String(줄?.paidAt ?? 줄?.createdAt ?? 줄?.날 ?? 줄?.date ?? '');
  const m = /(\d{4}-\d{2}-\d{2})/.exec(s);
  return m ? m[1] : null;
}

/** 줄 목록을 「날 → {건수, 금액}」으로 모읍니다. ⛔ 못 읽으면 null 입니다 */
export function 날별로고른다(받은것) {
  const 속 = 받은것?.payments ?? 받은것?.결제 ?? 받은것;
  const 들 = Array.isArray(속) ? 속
    : (Array.isArray(속?.목록) ? 속.목록 : (Array.isArray(속?.list) ? 속.list : null));
  if (!Array.isArray(들)) return null;
  const 표 = new Map();
  for (const x of 들) {
    if (!x || !치러졌나(x) || 우리것인가(x)) continue;
    const d = 날(x);
    if (!d) continue;
    const 앞 = 표.get(d) || { 건수: 0, 금액: 0 };
    표.set(d, { 건수: 앞.건수 + 1, 금액: 앞.금액 + 금액(x) });
  }
  return 표;
}

export function 오늘날짜() { return new Date().toLocaleDateString('sv-SE'); }
export function 어제날짜() {
  const d = new Date(); d.setDate(d.getDate() - 1);
  return d.toLocaleDateString('sv-SE');
}

// ── 자가시험 ───────────────────────────────────────────────
function 자가시험() {
  let 통과 = 0; let 깨짐 = 0;
  const T = (이름, 참) => { if (참) { 통과 += 1; } else { 깨짐 += 1; console.log('🔴 ' + 이름); } };

  T('완료된 것은 셉니다', 치러졌나({ status: 'paid' }) === true);
  T('대기는 안 셉니다', 치러졌나({ status: 'pending' }) === false);
  T('취소는 안 셉니다', 치러졌나({ status: 'cancelled' }) === false);
  T('환불은 안 셉니다', 치러졌나({ status: 'paid_refunded' }) === false);
  T('한글 상태도 읽습니다', 치러졌나({ 상태: '승인' }) === true);
  T('상태가 없으면 안 셉니다', 치러졌나({}) === false);

  T('점검 주문은 매출이 아닙니다', 우리것인가({ email: 'paycheck1@x.com' }) === true);
  T('손님 주문은 셉니다', 우리것인가({ merchantUid: 'ORD-20261119-1' }) === false);

  T('금액을 읽습니다', 금액({ amount: 19000 }) === 19000);
  T('금액 칸이 없으면 0 입니다', 금액({}) === 0);
  T('날짜를 읽습니다', 날({ paidAt: '2026-11-19T10:00:00+09:00' }) === '2026-11-19');
  T('날짜가 없으면 null 입니다', 날({}) === null);

  const 받은것 = { payments: [
    { status: 'paid', amount: 19000, paidAt: '2026-11-19T10:00:00+09:00' },
    { status: 'paid', amount: 39000, paidAt: '2026-11-19T11:00:00+09:00' },
    { status: 'pending', amount: 19000, paidAt: '2026-11-19T12:00:00+09:00' },
    { status: 'paid', amount: 29000, paidAt: '2026-11-18T10:00:00+09:00', email: 'paycheck9@x.com' },
  ] };
  const 표 = 날별로고른다(받은것);
  T('완료된 두 건만 셉니다', 표.get('2026-11-19')?.건수 === 2);
  T('금액을 더합니다', 표.get('2026-11-19')?.금액 === 58000);
  T('점검 주문이 든 날은 빠집니다', 표.has('2026-11-18') === false);
  T('모양이 다르면 null 입니다', 날별로고른다({ 엉뚱: 1 }) === null);
  T('빈 목록은 빈 표입니다', 날별로고른다({ payments: [] }) instanceof Map);

  console.log(`\n■ 자가시험 ${통과}가지 통과 · ${깨짐}가지 깨짐`);
  return 깨짐 === 0;
}

const 나 = url.fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(나)) {
  const 인자 = process.argv.slice(2);
  if (인자.includes('--자가시험')) process.exit(자가시험() ? 0 : 1);
  const 날수 = Math.max(2, Math.min(90, Number(인자.find((x) => !x.startsWith('--'))) || 7));

  let env = '';
  try { env = fs.readFileSync(path.join(장부있는곳, '.env'), 'utf8'); } catch (e) { /* 아래에서 막습니다 */ }
  const 열쇠 = 열쇠를읽는다(env, 'SAJU_ADMIN_KEY');
  if (!열쇠) {
    console.log('⬜ 관리자 열쇠를 읽지 못했습니다 — 「매출 0원」이 아니라 «측정하지 못했다»입니다');
    process.exit(1);
  }

  let 받은것 = null;
  try {
    const r = await fetch('https://klifemap.ai/api/admin/payments?days=' + 날수, {
      headers: { 'x-admin-key': 열쇠 }, signal: AbortSignal.timeout(25000),
    });
    if (!r.ok) {
      console.log('⬜ 서버가 안 열렸습니다 (' + r.status + ') — «측정하지 못했다»입니다. 0 으로 치지 않습니다');
      process.exit(1);
    }
    받은것 = await r.json();
  } catch (e) {
    console.log('⬜ 서버에 닿지 못했습니다 — ' + String(e.message).slice(0, 70) + '. «측정하지 못했다»입니다');
    process.exit(1);
  }

  const 표 = 날별로고른다(받은것);
  if (!표) {
    console.log('⬜ 서버가 준 것을 읽지 못했습니다 — 모양이 바뀌었을 수 있습니다');
    try {
      const 키들 = 받은것 && typeof 받은것 === 'object' ? Object.keys(받은것) : [];
      console.log('   받은 것의 칸 이름 — ' + (키들.length ? 키들.join(' · ') : '(객체가 아닙니다)'));
      for (const k of 키들) {
        const v = 받은것[k];
        if (Array.isArray(v)) {
          console.log(`   · ${k} — 배열 ${v.length}개` +
            (v[0] && typeof v[0] === 'object' ? ', 한 칸의 이름들: ' + Object.keys(v[0]).join(',') : ''));
        } else if (v && typeof v === 'object') {
          console.log(`   · ${k} — 객체, 칸 이름들: ${Object.keys(v).slice(0, 12).join(',')}`);
        } else { console.log(`   · ${k} — ${typeof v}`); }
      }
    } catch (e) { console.log('   (무엇이 왔는지도 읽지 못했습니다)'); }
    process.exit(1);
  }

  const 오늘 = 오늘날짜(); const 어제 = 어제날짜();
  const o = 표.get(오늘) || { 건수: 0, 금액: 0 };
  const y = 표.get(어제) || { 건수: 0, 금액: 0 };
  console.log('■ KLifeMap 결제 — 보고 양식의 「매출(B2C)」 칸에 넣는 수');
  console.log(`   오늘 ${오늘}   ${o.건수}건 · ${o.금액.toLocaleString()}원`);
  console.log(`   어제 ${어제}   ${y.건수}건 · ${y.금액.toLocaleString()}원`);
  const 날들 = [...표.entries()].sort();
  if (날들.length) {
    console.log(`\n── 최근 ${날수}일 ──`);
    let 합건 = 0; let 합원 = 0;
    for (const [d, v] of 날들) { 합건 += v.건수; 합원 += v.금액; console.log(`   ${d}   ${v.건수}건 · ${v.금액.toLocaleString()}원`); }
    console.log(`   합계   ${합건}건 · ${합원.toLocaleString()}원`);
  } else {
    console.log(`\n   최근 ${날수}일 동안 손님 결제가 0건입니다 (서버가 답했으므로 «0 건»이 맞습니다)`);
  }
  process.exit(0);
}
