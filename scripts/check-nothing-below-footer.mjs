#!/usr/bin/env node
// check-nothing-below-footer.mjs — boss 2026-11-28: nothing may be shown below the footer on klifemap.ai.
// Opens each page in a new Chrome tab, waits for the footer to render, and lists every visible element whose top edge
// is below the bottom edge of the footer (floating/fixed elements are ignored). Also reports the order of the
// paid-entry box, the link block and the footer.
// usage: node scripts/check-nothing-below-footer.mjs [url ...]    exit code 1 when anything is below a footer
import { 새탭에서, 자리잡기, 재기 } from './lib/cdp.mjs';
const urls = process.argv.slice(2).length ? process.argv.slice(2) : [
  'https://klifemap.ai/', 'https://klifemap.ai/astro.html', 'https://klifemap.ai/horoscope.html', 'https://klifemap.ai/horoscope-week.html',
  'https://klifemap.ai/saju.html', 'https://klifemap.ai/ilzin.html', 'https://klifemap.ai/mingli-gunghap.html', 'https://klifemap.ai/tarot.html',
  'https://klifemap.ai/rising-sign.html', 'https://klifemap.ai/content', 'https://klifemap.ai/all', 'https://klifemap.ai/pricing.html',
  'https://klifemap.ai/ireum-puri.html', 'https://klifemap.ai/astro.html?lang=en',
];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const js = `(() => {
  const f = document.querySelector('#klmFooter') || document.querySelector('#siteFooter');
  if (!f || !f.offsetHeight) return JSON.stringify({ footer: false });
  const bottom = f.getBoundingClientRect().bottom + window.scrollY;
  const below = [];
  for (const e of document.body.querySelectorAll('*')) {
    if (f.contains(e) || e.contains(f)) continue;
    if (!e.offsetHeight || !e.offsetWidth) continue;
    const cs = getComputedStyle(e);
    if (cs.position === 'fixed' || cs.position === 'sticky' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) continue;
    let p = e.parentElement, floating = false;
    while (p && p !== document.body) { const ps = getComputedStyle(p).position; if (ps === 'fixed' || ps === 'sticky') { floating = true; break; } p = p.parentElement; }
    if (floating) continue;
    const top = e.getBoundingClientRect().top + window.scrollY;
    if (top >= bottom - 1) { if (!below.some((b) => b.el.contains(e))) below.push({ el: e, tag: e.tagName.toLowerCase(), id: e.id, cls: String(e.className || '').slice(0, 40), text: (e.innerText || '').trim().slice(0, 40) }); }
  }
  const pos = (sel) => { const e = document.querySelector(sel); return e && e.offsetHeight ? Math.round(e.getBoundingClientRect().top + window.scrollY) : null; };
  return JSON.stringify({ footer: true, footerTop: Math.round(bottom - f.offsetHeight), paid: pos('.paid-entry') ?? pos('.free-entry'), nav: pos('.klm-static-nav'), below: below.map(({ el, ...r }) => r).slice(0, 8), pageBottom: document.documentElement.scrollHeight, footerBottom: Math.round(bottom) });
})()`;
let bad = 0;
for (const url of urls) {
  const r = await 새탭에서(url, async (c) => {
    await 자리잡기(c, { 최대: 45000 }); await wait(5000);
    return JSON.parse(String(await 재기(c, js, 20000)));
  });
  if (!r.footer) { console.log('NOFOOT ' + url); continue; }
  const orderOk = (r.paid === null || r.paid < r.footerTop) && (r.nav === null || r.nav < r.footerTop) && (r.paid === null || r.nav === null || r.paid < r.nav);
  const ok = r.below.length === 0 && orderOk;
  if (!ok) bad += 1;
  console.log((ok ? 'OK  ' : 'BAD ') + url + ' paid=' + r.paid + ' nav=' + r.nav + ' footerTop=' + r.footerTop + ' gapAfterFooter=' + (r.pageBottom - r.footerBottom) + (r.below.length ? ' below=' + JSON.stringify(r.below) : ''));
}
console.log(bad ? 'FAILED ' + bad : 'nothing below any footer');
process.exit(bad ? 1 : 0);
