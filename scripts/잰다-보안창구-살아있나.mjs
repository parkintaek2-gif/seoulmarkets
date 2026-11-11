#!/usr/bin/env node
/**
 * 잰다-보안창구-살아있나.mjs — **404 가 「열쇠가 틀렸다」인지 「안 올라갔다」인지 가른다.**
 *
 * 🔴 [2026-11-11] `/api/admin/침입` 이 404 를 냈다. 그대로 「못 쟀다」로 두면
 *   **배포가 안 된 것인지 열쇠가 틀린 것인지 모른 채** 지나간다.
 *   ⛔ 「못 쟀다」를 적는 것까지는 옳지만, 거기서 멈추면 재는 일을 안 한 것이다.
 *
 * ⇒ 이미 도는 것이 확실한 관리자 창구를 함께 두드려 본다.
 *   그쪽이 되면 열쇠는 성한 것이고, 404 는 **그 길이 라이브에 없는 것**이다.
 *
 * ⛔ 열쇠 값을 찍지 않는다. 상태 숫자만 적는다.
 */
import { 열쇠찾기 } from './본다-보안경고.mjs';

const 볼것 = [
  { 이름: '침입(새로 만든 길)', 길: '/api/admin/' + encodeURIComponent('침입') },
  { 이름: 'traffic(오래된 길)', 길: '/api/admin/traffic' },
  { 이름: 'unique-visitors', 길: '/api/admin/unique-visitors' },
  { 이름: 'visitors', 길: '/api/admin/visitors' },
];

const 열쇠 = 열쇠찾기();
console.log('■ 관리자 창구가 라이브에 있나 — 404 의 뜻을 가른다');
console.log(열쇠 ? '   열쇠: 찾았다 (값은 찍지 않는다)\n' : '   열쇠: 🔴 못 찾았다\n');

for (const x of 볼것) {
  try {
    const r = await fetch('https://klifemap.ai' + x.길, { headers: { 'x-admin-key': 열쇠 } });
    const 뜻 = r.status === 200 ? '✅ 있다 · 열쇠도 맞다'
      : r.status === 401 || r.status === 403 ? '🔴 길은 있는데 열쇠가 안 맞다'
        : r.status === 404 ? '⚠ 이 길이 라이브에 없다 — 배포가 안 됐다'
          : '⬜ 모르겠다';
    console.log(`   ${String(r.status).padEnd(4)} ${x.이름.padEnd(22)} ${뜻}`);
  } catch (e) {
    console.log(`   ---  ${x.이름.padEnd(22)} 🔴 못 닿았다 — ${String(e?.message ?? e).slice(0, 50)}`);
  }
}
