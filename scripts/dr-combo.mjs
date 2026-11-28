#!/usr/bin/env node
// dr-combo.mjs — fill searchable drop-downs (react-select style) on a Datarade Provider Studio form.
// usage: node scripts/dr-combo.mjs <url> <json array of search words> [--save]   (--look only lists the options found for each word, picks nothing)
// For each word: focus the next empty drop-down, type the word, print the options offered, pick the first option whose text starts with the word.
import fs from 'node:fs';
import { 새탭에서, 자리잡기, 재기 } from './lib/cdp.mjs';
const url = process.argv[2]; const words = JSON.parse(process.argv[3]);
const look = process.argv.includes('--look');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const shotDir = process.env.SHOTS || '.';
await 새탭에서(url, async (c) => {
  await 자리잡기(c, { 최대: 60000 }); for (let i = 0; i < 30; i += 1) { if (Number(await 재기(c, "document.querySelectorAll(\"input[type=text]\").length", 20000)) > 0) break; await wait(1000); } await wait(3000);
  await c.보내기('Page.bringToFront', {}).catch(() => {});
  const key = async (k, code, vk, text) => { await c.보내기('Input.dispatchKeyEvent', { type: text ? 'keyDown' : 'rawKeyDown', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, ...(text ? { text } : {}) }); await c.보내기('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk }); };
  const clickAt = async (x, y) => { for (const type of ['mousePressed', 'mouseReleased']) await c.보내기('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 }); };
  /* a drop-down is "empty" when its control still shows the placeholder */
  /* Semantic UI drop-downs: div.ui.dropdown > input.search + div.text(.default when nothing chosen) + div.menu > div.item */
  const emptyJs = `(() => { const boxes = [...document.querySelectorAll('.ui.dropdown')].filter((d) => d.offsetWidth && d.querySelector('input.search')); const pick = boxes.filter((d) => { const t = d.querySelector(':scope > .text'); return !t || t.classList.contains('default') || !t.innerText.trim(); }).filter((d) => !d.classList.contains('multiple') || true); if (!pick.length) return JSON.stringify({ none: true, total: boxes.length }); pick[0].scrollIntoView({ block: 'center' }); const r = pick[0].getBoundingClientRect(); return JSON.stringify({ x: r.x + 60, y: r.y + r.height / 2, left: pick.length, total: boxes.length }); })()`;
  const optsJs = `JSON.stringify([...document.querySelectorAll('.ui.dropdown.active .menu .item, .ui.dropdown.visible .menu .item')].filter((e) => e.offsetWidth && !e.classList.contains('filtered')).map((e) => e.innerText.trim().slice(0, 60)).slice(0, 12))`;
  for (const w of words) {
    const p = JSON.parse(String(await 재기(c, emptyJs, 20000)));
    if (p.none) { console.log('no empty drop-down left (' + p.total + ')'); break; }
    await wait(400); const p2 = JSON.parse(String(await 재기(c, emptyJs, 20000)));
    await clickAt(p2.x, p2.y); await wait(500);
    await c.보내기('Input.insertText', { text: w }); await wait(2500);
    const opts = JSON.parse(String(await 재기(c, optsJs, 20000)));
    console.log(w + ' -> ' + JSON.stringify(opts));
    const hit = opts.findIndex((o) => o.toLowerCase().startsWith(w.toLowerCase()));
    if (look || hit < 0) { await key('Escape', 'Escape', 27); await wait(300); for (let i = 0; i < w.length; i += 1) await key('Backspace', 'Backspace', 8); await wait(300); if (!look) console.log('  skipped (no option starts with the word)'); continue; }
    for (let i = 0; i < hit; i += 1) { await key('ArrowDown', 'ArrowDown', 40); await wait(150); }
    await key('Enter', 'Enter', 13, '\r'); await wait(800);
    console.log('  picked ' + opts[hit]);
  }
  const r = await c.보내기('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  fs.writeFileSync(shotDir + '/dr-combo.png', Buffer.from(r.data, 'base64'));
  if (process.argv.includes('--save') && !look) {
    const b = JSON.parse(String(await 재기(c, `(() => { const e = [...document.querySelectorAll('button')].filter((x) => x.offsetWidth && !x.disabled && /^Save$/.test((x.innerText || '').trim()))[0]; if (!e) return JSON.stringify({ none: true }); e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return JSON.stringify({ x: r.x + r.width / 2, y: r.y + r.height / 2 }); })()`, 20000)));
    if (!b.none) { await wait(300); await clickAt(b.x, b.y); await wait(6000); }
    console.log('messages ' + String(await 재기(c, `[...document.querySelectorAll('[role=alert], .alert, .flash, .error, .toast, .notice')].filter((e) => e.offsetWidth).map((e) => e.innerText.trim().slice(0, 160)).join(' || ')`, 20000)));
  }
});
