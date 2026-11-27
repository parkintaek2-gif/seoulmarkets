#!/usr/bin/env node
// klm-admin-who.mjs — READ ONLY. New tab on klifemap.ai/login.html: is the stored session an admin? What does the login form look like?
// Never prints the token, the email or any field value (lengths only).
import { 새탭에서, 자리잡기, 재기 } from './lib/cdp.mjs';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const js = `(async () => {
  const t = localStorage.getItem('bj_auth_token');
  let me = { token: !!t };
  if (t) { try { const r = await fetch('/api/auth/me', { headers: { Authorization: 'Bearer ' + t } }); const j = await r.json().catch(() => ({})); me.status = r.status; me.isAdmin = !!(j && j.user && j.user.isAdmin); } catch (e) { me.err = String(e.message).slice(0, 60); } }
  const inputs = [...document.querySelectorAll('input')].map((i) => ({ id: i.id, name: i.name, type: i.type, len: (i.value || '').length, auto: i.matches(':-webkit-autofill'), vis: !!(i.offsetWidth || i.offsetHeight) }));
  const buttons = [...document.querySelectorAll('button, a.btn, [role=button]')].filter((b) => b.offsetWidth).map((b) => ({ id: b.id, text: (b.innerText || '').trim().slice(0, 30), type: b.type || '' })).slice(0, 20);
  return JSON.stringify({ url: location.href, me, inputs, buttons });
})()`;
const out = await 새탭에서('https://klifemap.ai/login.html', async (c) => {
  await 자리잡기(c, { 최대: 45000 });
  await wait(4000);
  return String(await 재기(c, js, 30000));
});
console.log(out);
