#!/usr/bin/env node
// rapi-edit.mjs — edit the SeoulMarkets RapidAPI listing in Studio (Chrome 9222, new tab, closed at the end).
// usage: node scripts/rapi-edit.mjs --probe <path>            list form controls on a Studio page (read-only)
//        node scripts/rapi-edit.mjs --general [--save]        fill short/long description, website; --save presses Save
//        node scripts/rapi-edit.mjs --readme [--save]         fill the Docs README
// Copy comes from docs/rapidapi-listing-20261128.md (blocks split by @@NAME / @@SHORT / @@LONG / @@README).
import fs from 'node:fs';
import { 새탭에서, 자리잡기, 재기 } from './lib/cdp.mjs';
const BASE = 'https://rapidapi.com/_studio/api_d6a7e86d-6af3-4ca9-9139-f0c20b2c5148/';
const arg = (n) => process.argv.includes(n);
const after = (n) => process.argv[process.argv.indexOf(n) + 1];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const copy = {};
{
  const raw = fs.readFileSync('docs/rapidapi-listing-20261128.md', 'utf8').replace(/\r\n/g, '\n');
  const parts = raw.split(/^@@([A-Z]+)\n/m);
  for (let i = 1; i < parts.length; i += 2) copy[parts[i]] = parts[i + 1].trim();
}
const shotDir = process.env.SHOTS || '.';
const controlsJs = `JSON.stringify([...document.querySelectorAll('input, textarea, [contenteditable=true], button, [role=combobox], [role=tab]')].filter((e) => e.offsetWidth).map((e, i) => { const r = e.getBoundingClientRect(); return { i, tag: e.tagName, type: e.type || '', name: e.name || '', id: e.id || '', ph: e.placeholder || '', aria: e.getAttribute('aria-label') || '', text: (e.tagName === 'BUTTON' || e.getAttribute('role')) ? (e.innerText || '').trim().slice(0, 40) : '', val: (e.value !== undefined ? String(e.value) : (e.innerText || '')).slice(0, 70), dis: !!e.disabled, y: Math.round(r.y + window.scrollY) }; }))`;

const path = arg('--probe') ? after('--probe') : arg('--readme') ? 'publish/docs' : 'publish/general';
await 새탭에서(BASE + path, async (c) => {
  await 자리잡기(c, { 최대: 60000 }); await wait(4000);
  await c.보내기('Page.bringToFront', {}).catch(() => {});
  for (let i = 0; i < 40; i += 1) { if (Number(await 재기(c, `document.querySelectorAll('textarea, [contenteditable=true], .monaco-editor, .CodeMirror, table, input[type=file]').length`, 20000)) > 0) break; await wait(1000); }
  await wait(2500);
  const shot = async (name) => { const r = await c.보내기('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(shotDir + '/' + name, Buffer.from(r.data, 'base64')); console.log('shot ' + name); };
  const key = async (k, code, vk, mod = 0) => { for (const type of ['rawKeyDown', 'keyUp']) await c.보내기('Input.dispatchKeyEvent', { type, key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers: mod }); };
  const clickAt = async (x, y) => { for (const type of ['mousePressed', 'mouseReleased']) await c.보내기('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 }); };
  /* focus the element picked by a JS expression, select everything in it, replace with text; returns what the element holds afterwards */
  const fill = async (pickJs, text) => {
    const p = JSON.parse(String(await 재기(c, `(() => { const e = ${pickJs}; if (!e) return JSON.stringify({ none: true }); e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return JSON.stringify({ x: r.x + Math.min(40, r.width / 2), y: r.y + Math.min(14, r.height / 2) }); })()`, 20000)));
    if (p.none) return { ok: false, why: 'not found' };
    await wait(400); await clickAt(p.x, p.y); await wait(300);
    await key('a', 'KeyA', 65, 2); await wait(150);
    await c.보내기('Input.insertText', { text }); await wait(600);
    const now = String(await 재기(c, `(() => { const e = ${pickJs}; return e ? (e.value !== undefined ? e.value : e.innerText) : ''; })()`, 20000));
    return { ok: now.replace(/\s+/g, ' ').trim() === text.replace(/\s+/g, ' ').trim(), len: now.length, want: text.length, head: now.slice(0, 60) };
  };
  const press = async (re) => {
    const p = JSON.parse(String(await 재기(c, `(() => { const re = new RegExp(${JSON.stringify(re)}); const b = [...document.querySelectorAll('button')].filter((e) => e.offsetWidth && re.test((e.innerText || '').trim()))[0]; if (!b) return JSON.stringify({ none: true }); const r = b.getBoundingClientRect(); return JSON.stringify({ x: r.x + r.width / 2, y: r.y + r.height / 2, dis: !!b.disabled }); })()`, 20000)));
    if (p.none || p.dis) return p;
    await clickAt(p.x, p.y); await wait(3500); return p;
  };

  if (arg('--probe')) {
    for (const k of JSON.parse(String(await 재기(c, controlsJs, 20000)))) console.log(JSON.stringify(k));
    await shot('rapi-probe.png');
    return;
  }
  if (arg('--general')) {
    /* the two description boxes are the first two textareas on the page: short, then long */
    console.log('short ' + JSON.stringify(await fill(`document.querySelector('#shortDescription-input')`, copy.SHORT)));
    console.log('long ' + JSON.stringify(await fill(`document.querySelector('#longDescription-input')`, copy.LONG)));
    await shot('rapi-general-filled.png');
    if (arg('--save')) { console.log('save ' + JSON.stringify(await press('^Save$'))); await wait(3000); await shot('rapi-general-saved.png'); }
  }
  if (arg('--readme')) {
    console.log('readme ' + JSON.stringify(await fill(`[...document.querySelectorAll('textarea, [contenteditable=true]')].filter((e) => e.offsetWidth)[0]`, copy.README)));
    await shot('rapi-readme-filled.png');
    if (arg('--save')) { console.log('save ' + JSON.stringify(await press('^Save$'))); await wait(3000); await shot('rapi-readme-saved.png'); }
  }
});
