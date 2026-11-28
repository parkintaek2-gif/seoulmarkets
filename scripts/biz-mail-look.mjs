#!/usr/bin/env node
// biz-mail-look.mjs — read-only look at the company mailbox (Chrome 9222, new tab, closed at the end).
// usage: node scripts/biz-mail-look.mjs "<gmail search>"   → prints the result rows (sender | subject | snippet | date)
//        node scripts/biz-mail-look.mjs "<gmail search>" --open N  → also opens the Nth row and prints the message text
import { 새탭에서, 자리잡기, 재기 } from './lib/cdp.mjs';
const q = process.argv[2] || 'newer_than:3d';
const openAt = process.argv.includes('--open') ? Number(process.argv[process.argv.indexOf('--open') + 1]) : 0;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await 새탭에서('https://mail.google.com/mail/u/0/#search/' + encodeURIComponent(q), async (c) => {
  await 자리잡기(c, { 최대: 60000 }); await wait(7000);
  const who = String(await 재기(c, `(() => { const a = document.querySelector('a[aria-label*="@"]'); return a ? a.getAttribute('aria-label').replace(/[\\w.+-]+@/g, '…@') : document.title.replace(/[\\w.+-]+@/g, '…@'); })()`, 20000));
  console.log('box ' + who);
  const rows = JSON.parse(String(await 재기(c, `JSON.stringify([...document.querySelectorAll('div[role=main] tr.zA')].filter((e) => e.offsetWidth).slice(0, 40).map((r) => ({ from: (r.querySelector('.yW') || {}).innerText || '', subj: (r.querySelector('.bog') || {}).innerText || '', snip: ((r.querySelector('.y2') || {}).innerText || '').slice(0, 160), date: (r.querySelector('.xW span') || {}).title || (r.querySelector('.xW') || {}).innerText || '', unread: r.classList.contains('zE') })))`, 20000)));
  console.log('rows ' + rows.length);
  rows.forEach((r, i) => console.log((i + 1) + ' | ' + (r.unread ? 'UNREAD ' : '') + r.from.replace(/\n/g, ' ') + ' | ' + r.subj + ' | ' + r.snip.replace(/\n/g, ' ') + ' | ' + r.date));
  if (openAt && rows[openAt - 1]) {
    const p = JSON.parse(String(await 재기(c, `(() => { const r = [...document.querySelectorAll('div[role=main] tr.zA')].filter((e) => e.offsetWidth)[${openAt - 1}]; const b = r.querySelector('.bog').getBoundingClientRect(); return JSON.stringify({ x: b.x + 20, y: b.y + b.height / 2 }); })()`, 20000)));
    for (const type of ['mousePressed', 'mouseReleased']) await c.보내기('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: 'left', clickCount: 1 });
    await wait(5000);
    const body = String(await 재기(c, `[...document.querySelectorAll('div[role=main] .a3s')].map((e) => e.innerText).join('\\n-----\\n').slice(0, 6000)`, 20000));
    console.log('---- message text ----\n' + body);
    if (process.argv.includes('--links')) console.log('---- links ----\n' + String(await 재기(c, `[...new Set([...document.querySelectorAll('div[role=main] .a3s a[href]')].map((a) => (a.innerText || '').trim().slice(0, 40) + ' => ' + a.href.split('?')[0]))].join('\\n')`, 20000)));
  }
});
