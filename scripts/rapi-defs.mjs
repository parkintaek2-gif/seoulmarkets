#!/usr/bin/env node
// rapi-defs.mjs — Studio Definitions page of the SeoulMarkets RapidAPI listing (Chrome 9222, new tab, closed at the end).
// usage: node scripts/rapi-defs.mjs --look                 print page text, file inputs and spec-related buttons (read-only)
//        node scripts/rapi-defs.mjs --click "<regex>"      click the first visible button/label/link whose text matches, then print the page again
import fs from 'node:fs';
import { 새탭에서, 자리잡기, 재기 } from './lib/cdp.mjs';
const BASE = 'https://rapidapi.com/_studio/api_d6a7e86d-6af3-4ca9-9139-f0c20b2c5148/publish/definitions';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const shotDir = process.env.SHOTS || '.';
const clickRe = process.argv.includes('--click') ? process.argv[process.argv.indexOf('--click') + 1] : '';
await 새탭에서(BASE, async (c) => {
  await 자리잡기(c, { 최대: 60000 }); await wait(4000);
  /* the Studio content pane sometimes stays blank: wait for the CI/CD tab button, reload up to twice if it never shows */
  const ready = async () => { for (let i = 0; i < 30; i += 1) { if (String(await 재기(c, `[...document.querySelectorAll('button')].some((e) => e.offsetWidth && (e.innerText || '').trim() === 'CI/CD')`, 20000)) === 'true') return true; await wait(1000); } return false; };
  let up = await ready();
  for (let n = 0; n < 2 && !up; n += 1) { console.log('blank pane, reloading'); await c.보내기('Page.reload', {}); await wait(5000); up = await ready(); }
  if (!up) { console.log('STOP content pane never loaded'); return; }
  await wait(3000);
  const show = async () => {
    const text = String(await 재기(c, `document.body ? document.body.innerText : ''`, 20000)).split(/\n+/).join('\n');
    const i0 = Math.max(0, text.indexOf('Version Specific'));
    console.log(text.slice(i0, i0 + 3500));
    console.log('file inputs ' + String(await 재기(c, `JSON.stringify([...document.querySelectorAll('input[type=file]')].map((e) => ({ accept: e.accept, id: e.id, name: e.name })))`, 20000)));
    console.log('spec buttons ' + String(await 재기(c, `JSON.stringify([...document.querySelectorAll('button, a, label, [role=radio], [role=tab]')].filter((e) => e.offsetWidth && /spec|openapi|upload|import|update|file/i.test(e.innerText || '')).map((e) => e.tagName + ':' + e.innerText.trim().slice(0, 60)))`, 20000)));
    console.log('radios ' + String(await 재기(c, `JSON.stringify([...document.querySelectorAll('input[type=radio]')].map((e) => ({ checked: e.checked, label: ((e.closest('label') || e.parentElement.parentElement || {}).innerText || '').trim().slice(0, 80) })))`, 20000)));
  };
  await show();
  if (clickRe) {
    const p = JSON.parse(String(await 재기(c, `(() => { const re = new RegExp(${JSON.stringify(clickRe)}, 'i'); const e = [...document.querySelectorAll('button, label, a, [role=radio], [role=tab]')].filter((x) => x.offsetWidth && re.test((x.innerText || '').trim()))[0]; if (!e) return JSON.stringify({ none: true }); e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return JSON.stringify({ x: r.x + r.width / 2, y: r.y + r.height / 2, text: e.innerText.trim().slice(0, 50) }); })()`, 20000)));
    console.log('click ' + JSON.stringify(p));
    if (!p.none) { for (const type of ['mousePressed', 'mouseReleased']) await c.보내기('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: 'left', clickCount: 1 }); await wait(4000); await show(); }
  }
  /* --upload <file>: (use together with --click '^CI/CD$') put the spec file on the file input, then --save presses Save */
  if (process.argv.includes('--upload')) {
    const file = process.argv[process.argv.indexOf('--upload') + 1];
    const { root } = await c.보내기('DOM.getDocument', { depth: 0 });
    const { nodeId } = await c.보내기('DOM.querySelector', { nodeId: root.nodeId, selector: 'input[type=file]' });
    if (!nodeId) { console.log('STOP no file input'); return; }
    await c.보내기('DOM.setFileInputFiles', { nodeId, files: [file] });
    await wait(8000);
    await show();
    const shot1 = await c.보내기('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(shotDir + '/rapi-defs-uploaded.png', Buffer.from(shot1.data, 'base64'));
    if (process.argv.includes('--save')) {
      const b = JSON.parse(String(await 재기(c, `(() => { const e = [...document.querySelectorAll('button')].filter((x) => x.offsetWidth && /^(Save|Update|Import|Confirm)$/.test((x.innerText || '').trim()) && !x.disabled)[0]; if (!e) return JSON.stringify({ none: true }); e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return JSON.stringify({ x: r.x + r.width / 2, y: r.y + r.height / 2, text: e.innerText.trim() }); })()`, 20000)));
      console.log('save ' + JSON.stringify(b));
      if (!b.none) { for (const type of ['mousePressed', 'mouseReleased']) await c.보내기('Input.dispatchMouseEvent', { type, x: b.x, y: b.y, button: 'left', clickCount: 1 }); await wait(12000); await show(); }
    }
  }
  const r = await c.보내기('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(shotDir + '/rapi-defs.png', Buffer.from(r.data, 'base64'));
});
