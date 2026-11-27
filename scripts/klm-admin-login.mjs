#!/usr/bin/env node
// klm-admin-login.mjs — klifemap.ai login with the account Chrome has saved. Clicks the email field, picks the first
// saved entry with the keyboard, and presses the login button only when both fields were filled by Chrome.
// Never types, reads or prints an email, password or token (lengths and booleans only).
import { 새탭에서, 자리잡기, 재기 } from './lib/cdp.mjs';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const key = async (c, k, code, vk) => { for (const type of ['rawKeyDown', 'keyUp']) await c.보내기('Input.dispatchKeyEvent', { type, key: k, code, windowsVirtualKeyCode: vk }); };
const state = `(() => { const e = document.querySelector('#loginEmailInput'), p = document.querySelector('#loginPasswordInput'); return JSON.stringify({ e: e.value.length, p: p.value.length, token: !!localStorage.getItem('bj_auth_token'), url: location.pathname }); })()`;
const out = await 새탭에서('https://klifemap.ai/login.html', async (c) => {
  await 자리잡기(c, { 최대: 45000 });
  await wait(3000);
  await c.보내기('Page.bringToFront', {}).catch(() => {});
  const box = JSON.parse(String(await 재기(c, `(() => { const r = document.querySelector('#loginEmailInput').getBoundingClientRect(); return JSON.stringify({ x: r.x + r.width / 2, y: r.y + r.height / 2 }); })()`, 20000)));
  for (const type of ['mousePressed', 'mouseReleased']) await c.보내기('Input.dispatchMouseEvent', { type, x: box.x, y: box.y, button: 'left', clickCount: 1 });
  await wait(1500);
  const s0 = String(await 재기(c, state, 20000));
  await key(c, 'ArrowDown', 'ArrowDown', 40); await wait(700);
  await key(c, 'Enter', 'Enter', 13); await wait(2000);
  const s1 = JSON.parse(String(await 재기(c, state, 20000)));
  const log = ['after click ' + s0, 'after pick ' + JSON.stringify(s1)];
  if (!s1.token && s1.e > 0 && s1.p > 0) {
    await 재기(c, `document.querySelector('#emailLoginBtn').click()`, 20000);
    await wait(6000);
    const me = String(await 재기(c, `(async () => { const t = localStorage.getItem('bj_auth_token'); if (!t) return JSON.stringify({ token: false, url: location.pathname }); const r = await fetch('/api/auth/me', { headers: { Authorization: 'Bearer ' + t } }); const j = await r.json().catch(() => ({})); return JSON.stringify({ token: true, status: r.status, isAdmin: !!(j && j.user && j.user.isAdmin), url: location.pathname }); })()`, 30000));
    log.push('after login ' + me);
  } else log.push('login button not pressed');
  return log.join('\n');
});
console.log(out);
