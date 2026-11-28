#!/usr/bin/env node
// rapi-look.mjs — read-only look at a RapidAPI page in Chrome 9222 (new tab, closed at the end).
// usage: node scripts/rapi-look.mjs <url> [--shot file.png] [--frame]   (--frame reads inside #studio-iframe)
import fs from 'node:fs';
import { 새탭에서, 자리잡기, 재기 } from './lib/cdp.mjs';
const url = process.argv[2];
const shotAt = process.argv.indexOf('--shot');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await 새탭에서(url, async (c) => {
  await 자리잡기(c, { 최대: 60000 }); await wait(9000);
  console.log('at ' + String(await 재기(c, 'location.href', 20000)));
  console.log('title ' + String(await 재기(c, 'document.title', 20000)));
  const inFrame = process.argv.includes('--frame');
  const doc = inFrame ? `(document.querySelector('#studio-iframe') || {}).contentDocument` : 'document';
  const text = String(await 재기(c, `(() => { const d = ${doc}; if (!d) return 'NO FRAME DOCUMENT'; return (d.body.innerText || '').replace(/\\n{2,}/g, '\\n').slice(0, 7000); })()`, 20000));
  console.log('---- text ----\n' + text);
  const links = String(await 재기(c, `(() => { const d = ${doc}; if (!d) return ''; return [...new Set([...d.querySelectorAll('a[href]')].map((a) => a.href).filter((h) => /studio|provider|hub|data_products/.test(h)))].slice(0, 40).join('\\n'); })()`, 20000));
  console.log('---- links ----\n' + links);
  if (shotAt > 0) {
    const r = await c.보내기('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(process.argv[shotAt + 1], Buffer.from(r.data, 'base64'));
    console.log('shot ' + process.argv[shotAt + 1]);
  }
});
