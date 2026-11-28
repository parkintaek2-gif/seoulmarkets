#!/usr/bin/env node
// klm-admin-login-os.mjs — klifemap.ai login with the account Chrome has saved, using a REAL mouse click on the email field
// (boss 2026-11-28: clicking the id field brings up the saved account). CDP clicks do not open Chrome's saved-account list.
// Steps: open login page in a new tab, bring it to front, real click on the email field twice, Down + Enter on the list,
// then press the login button only if Chrome filled both fields. Never types, reads or prints an email, password or token.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { 새탭에서, 자리잡기, 재기 } from './lib/cdp.mjs';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const state = `(() => { const e = document.querySelector('#loginEmailInput'), p = document.querySelector('#loginPasswordInput'); return JSON.stringify({ e: e ? e.value.length : -1, p: p ? p.value.length : -1, token: !!localStorage.getItem('bj_auth_token'), url: location.pathname, focus: document.hasFocus(), active: document.activeElement ? document.activeElement.id : '' }); })()`;
const ps = (script) => execFileSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', script], { encoding: 'utf8', timeout: 30000 });
const mouseLib = `Add-Type -Namespace W -Name M -MemberDefinition '[DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y); [DllImport("user32.dll")] public static extern void mouse_event(uint f, uint dx, uint dy, uint d, System.UIntPtr e);'; Add-Type -AssemblyName System.Windows.Forms;`;
const realClick = (x, y) => ps(`${mouseLib} [W.M]::SetCursorPos(${Math.round(x)}, ${Math.round(y)}) | Out-Null; Start-Sleep -Milliseconds 250; [W.M]::mouse_event(2,0,0,0,[UIntPtr]::Zero); [W.M]::mouse_event(4,0,0,0,[UIntPtr]::Zero);`);
const realKeys = (keys) => ps(`Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${keys}');`);

const out = await 새탭에서('https://klifemap.ai/login.html', async (c) => {
  const log = [];
  await 자리잡기(c, { 최대: 45000 }); await wait(3000);
  await c.보내기('Page.bringToFront', {}).catch(() => {});
  await wait(800);
  /* screen position of the email field: window origin + browser chrome height + element position, times the display scale */
  const g = JSON.parse(String(await 재기(c, `(() => { const r = document.querySelector('#loginEmailInput').getBoundingClientRect(); return JSON.stringify({ sx: window.screenX, sy: window.screenY, ow: window.outerWidth, oh: window.outerHeight, iw: window.innerWidth, ih: window.innerHeight, dpr: window.devicePixelRatio, x: r.x + r.width / 2, y: r.y + r.height / 2, vis: document.visibilityState }); })()`, 20000)));
  log.push('geometry ' + JSON.stringify(g));
  if (g.vis !== 'visible' || g.sx < -10000) { log.push('STOP window is not visible (minimised?)'); return log.join('\n'); }
  const side = (g.ow - g.iw) / 2; const top = g.oh - g.ih - side;
  const X = (g.sx + side + g.x) * g.dpr; const Y = (g.sy + top + g.y) * g.dpr;
  realClick(X, Y); await wait(1200);
  const s0 = JSON.parse(String(await 재기(c, state, 20000))); log.push('after click 1 ' + JSON.stringify(s0));
  if (s0.active !== 'loginEmailInput') { log.push('STOP the real click did not land on the email field'); return log.join('\n'); }
  if (!(s0.e > 0 && s0.p > 0)) {
    realClick(X, Y); await wait(1500);
    realKeys('{DOWN}'); await wait(600); realKeys('{ENTER}'); await wait(2000);
  }
  let s1 = JSON.parse(String(await 재기(c, state, 20000))); log.push('after pick ' + JSON.stringify(s1));
  if (s1.e > 0 && s1.p === 0) {
    /* the email came from form history only: ask the password field for its saved entry the same way */
    const py = Number(await 재기(c, `(() => { const r = document.querySelector('#loginPasswordInput').getBoundingClientRect(); return r.y + r.height / 2; })()`, 20000));
    const PY = (g.sy + top + py) * g.dpr;
    realClick(X, PY); await wait(1200); realClick(X, PY); await wait(1500);
    realKeys('{DOWN}'); await wait(600); realKeys('{ENTER}'); await wait(2000);
    s1 = JSON.parse(String(await 재기(c, state, 20000))); log.push('after password pick ' + JSON.stringify(s1));
  }
  if (!s1.token && s1.e > 0 && s1.p > 0) {
    await 재기(c, `document.querySelector('#emailLoginBtn').click()`, 20000);
    await wait(6000);
    const me = String(await 재기(c, `(async () => { const t = localStorage.getItem('bj_auth_token'); if (!t) return JSON.stringify({ token: false, url: location.pathname, msg: ((document.querySelector('.error, .err, #loginError, [role=alert]') || {}).innerText || '').slice(0, 80) }); const r = await fetch('/api/auth/me', { headers: { Authorization: 'Bearer ' + t } }); const j = await r.json().catch(() => ({})); return JSON.stringify({ token: true, status: r.status, isAdmin: !!(j && j.user && j.user.isAdmin), url: location.pathname }); })()`, 30000));
    log.push('after login ' + me);
  } else log.push('login button not pressed');
  return log.join('\n');
});
console.log(out);
