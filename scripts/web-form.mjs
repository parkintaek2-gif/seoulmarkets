#!/usr/bin/env node
// web-form.mjs — generic form helper for provider consoles (Chrome 9222, new tab, closed at the end).
// usage: node scripts/web-form.mjs --probe <url>                     list visible form controls with their labels (read-only)
//        node scripts/web-form.mjs --fill <url> <plan.json> [--save "<button text regex>"]
// plan.json: [{ "sel": "<css selector>", "text": "<value>" } | { "sel": "...", "click": true } | { "sel": "...", "check": true|false } | { "sel": "...", "select": "<option text>" } | { "sel": "...", "file": "<path>" }]
// Text is entered with real key events (select all, insertText) so framework-controlled inputs keep the value.
// Never use this for passwords or payment details.
import fs from 'node:fs';
import { 새탭에서, 자리잡기, 재기 } from './lib/cdp.mjs';
const arg = (n) => process.argv.includes(n);
const after = (n, k = 1) => process.argv[process.argv.indexOf(n) + k];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const shotDir = process.env.SHOTS || '.';
const url = arg('--probe') ? after('--probe') : after('--fill');
const probeJs = `JSON.stringify([...document.querySelectorAll('input, textarea, select, [contenteditable=true], button, [role=combobox], [role=checkbox], [role=switch]')].filter((e) => (e.offsetWidth || e.type === 'file') && e.type !== 'hidden').map((e) => { const lab = (e.labels && e.labels[0] ? e.labels[0].innerText : '') || e.getAttribute('aria-label') || ((e.closest('label, .form-group, .field, fieldset') || {}).innerText || '').split('\\n')[0]; return { tag: e.tagName.toLowerCase(), type: e.type || e.getAttribute('role') || '', id: e.id || '', name: e.name || '', label: (lab || '').trim().slice(0, 70), ph: (e.placeholder || '').slice(0, 40), val: e.tagName === 'BUTTON' ? (e.innerText || '').trim().slice(0, 40) : (e.type === 'checkbox' || e.type === 'radio' ? String(e.checked) + (e.value ? ' =' + e.value.slice(0, 30) : '') : String(e.value !== undefined ? e.value : e.innerText).slice(0, 80)), max: e.maxLength > 0 ? e.maxLength : undefined, opts: e.tagName === 'SELECT' ? [...e.options].map((o) => o.text.trim()).slice(0, 40) : undefined }; }))`;

await 새탭에서(url, async (c) => {
  await 자리잡기(c, { 최대: 60000 }); await wait(5000);
  await c.보내기('Page.bringToFront', {}).catch(() => {});
  const shot = async (name) => { const r = await c.보내기('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }); fs.writeFileSync(shotDir + '/' + name, Buffer.from(r.data, 'base64')); console.log('shot ' + name); };
  const key = async (k, code, vk, mod = 0) => { for (const type of ['rawKeyDown', 'keyUp']) await c.보내기('Input.dispatchKeyEvent', { type, key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers: mod }); };
  const clickAt = async (x, y) => { for (const type of ['mousePressed', 'mouseReleased']) await c.보내기('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 }); };
  const centre = async (sel) => JSON.parse(String(await 재기(c, `(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return JSON.stringify({ none: true }); e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return JSON.stringify({ x: r.x + Math.min(30, r.width / 2), y: r.y + Math.min(14, r.height / 2) }); })()`, 20000)));
  console.log('at ' + String(await 재기(c, 'location.href', 20000)));
  if (arg('--probe')) {
    const heads = String(await 재기(c, `[...document.querySelectorAll('h1, h2, h3, legend')].filter((e) => e.offsetWidth).map((e) => e.innerText.trim().slice(0, 80)).join(' | ')`, 20000));
    console.log('headings ' + heads);
    for (const k of JSON.parse(String(await 재기(c, probeJs, 20000)))) console.log(JSON.stringify(k));
    await shot('form-probe.png');
    return;
  }
  const plan = JSON.parse(fs.readFileSync(after('--fill', 2), 'utf8'));
  for (const step of plan) {
    if (step.file) {
      const { root } = await c.보내기('DOM.getDocument', { depth: 0 });
      const { nodeId } = await c.보내기('DOM.querySelector', { nodeId: root.nodeId, selector: step.sel });
      if (!nodeId) { console.log('MISS ' + step.sel); continue; }
      await c.보내기('DOM.setFileInputFiles', { nodeId, files: [step.file] }); await wait(3000);
      console.log('file ' + step.sel); continue;
    }
    if (step.select !== undefined) {
      const r = String(await 재기(c, `(() => { const e = document.querySelector(${JSON.stringify(step.sel)}); if (!e) return 'MISS'; const o = [...e.options].find((x) => x.text.trim() === ${JSON.stringify(step.select)}); if (!o) return 'NO OPTION'; e.value = o.value; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); return 'ok ' + o.text.trim(); })()`, 20000));
      console.log('select ' + step.sel + ' ' + r); continue;
    }
    const p = await centre(step.sel);
    if (p.none) { console.log('MISS ' + step.sel); continue; }
    await wait(300);
    if (step.check !== undefined) {
      const now = String(await 재기(c, `String(document.querySelector(${JSON.stringify(step.sel)}).checked)`, 20000));
      if (now !== String(step.check)) { await clickAt(p.x, p.y); await wait(400); }
      console.log('check ' + step.sel + ' ' + String(await 재기(c, `String(document.querySelector(${JSON.stringify(step.sel)}).checked)`, 20000))); continue;
    }
    await clickAt(p.x, p.y); await wait(350);
    if (step.click) { await wait(step.wait || 1500); console.log('click ' + step.sel); continue; }
    await key('a', 'KeyA', 65, 2); await wait(120);
    if (step.text === '') await key('Delete', 'Delete', 46); else await c.보내기('Input.insertText', { text: step.text });
    await wait(500);
    if (step.enter) { await c.보내기('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13, text: '\r' }); await c.보내기('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 }); await wait(800); }
    const now = String(await 재기(c, `(() => { const e = document.querySelector(${JSON.stringify(step.sel)}); return e ? (e.value !== undefined ? e.value : e.innerText) : ''; })()`, 20000));
    console.log('text ' + step.sel + ' ' + (now.replace(/\s+/g, ' ').trim() === step.text.replace(/\s+/g, ' ').trim() ? 'ok' : 'DIFF') + ' len ' + now.length + '/' + step.text.length);
  }
  await shot('form-filled.png');
  if (arg('--save')) {
    const re = after('--save');
    const b = JSON.parse(String(await 재기(c, `(() => { const re = new RegExp(${JSON.stringify(re)}); const e = [...document.querySelectorAll('button, input[type=submit], a.btn')].filter((x) => x.offsetWidth && !x.disabled && re.test(((x.innerText || x.value) || '').trim()))[0]; if (!e) return JSON.stringify({ none: true }); e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return JSON.stringify({ x: r.x + r.width / 2, y: r.y + r.height / 2, text: ((e.innerText || e.value) || '').trim() }); })()`, 20000)));
    console.log('save ' + JSON.stringify(b));
    if (!b.none) { await wait(300); const p2 = JSON.parse(String(await 재기(c, `(() => { const re = new RegExp(${JSON.stringify(re)}); const e = [...document.querySelectorAll('button, input[type=submit], a.btn')].filter((x) => x.offsetWidth && !x.disabled && re.test(((x.innerText || x.value) || '').trim()))[0]; const r = e.getBoundingClientRect(); return JSON.stringify({ x: r.x + r.width / 2, y: r.y + r.height / 2 }); })()`, 20000))); await clickAt(p2.x, p2.y); await wait(6000); }
    console.log('after save at ' + String(await 재기(c, 'location.href', 20000)));
    console.log('messages ' + String(await 재기(c, `[...document.querySelectorAll('[role=alert], .alert, .flash, .error, .invalid-feedback, .toast, .notice')].filter((e) => e.offsetWidth).map((e) => e.innerText.trim().slice(0, 160)).join(' || ')`, 20000)));
    await shot('form-saved.png');
  }
});
