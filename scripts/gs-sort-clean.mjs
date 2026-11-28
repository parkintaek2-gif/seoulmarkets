#!/usr/bin/env node
// gs-sort-clean.mjs — remove the scratch copy (rows 80..147) made by gs-sort-desc.mjs. Deletes those whole rows.
// Refuses unless B80 still shows the first name of the saved original order (so it can only remove the scratch copy).
import fs from 'node:fs';
import { 새탭에서, 자리잡기, 재기 } from './lib/cdp.mjs';
const id = '18rEcErHG_PyVPy94ycAqSFLwXcXxtl-FXCoJkQ9tWpA', gid = '1747466165', sheet = '기사-보도자료';
const before = JSON.parse(fs.readFileSync('docs/자국/gs-sort-before-20261128.json', 'utf8'));
const firstName = before[2][1];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const where = `(() => { const n = document.querySelector('#t-name-box'); const f = document.querySelector('#t-formula-bar-input .cell-input'); const tab = document.querySelector('.docs-sheet-active-tab .docs-sheet-tab-name'); return JSON.stringify({ box: n ? n.value : null, bar: f ? f.textContent : null, tab: tab ? tab.textContent : null }); })()`;
await 새탭에서('https://docs.google.com/spreadsheets/d/' + id + '/edit#gid=' + gid, async (c) => {
  const key = async (k, code, vk, mod = 0) => { await c.보내기('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers: mod }); await c.보내기('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers: mod }); };
  const enter = async () => { await c.보내기('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13, text: '\r', unmodifiedText: '\r' }); await c.보내기('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 }); };
  const go = async (cell) => {
    const b = JSON.parse(String(await 재기(c, `(() => { const r = document.querySelector('#t-name-box').getBoundingClientRect(); return JSON.stringify({ x: r.x + r.width / 2, y: r.y + r.height / 2 }); })()`, 20000)));
    for (const type of ['mousePressed', 'mouseReleased']) await c.보내기('Input.dispatchMouseEvent', { type, x: b.x, y: b.y, button: 'left', clickCount: 1 });
    await wait(350); await key('a', 'KeyA', 65, 2); await c.보내기('Input.insertText', { text: cell }); await wait(250); await enter(); await wait(900);
    return JSON.parse(String(await 재기(c, where, 20000)));
  };
  await 자리잡기(c, { 최대: 60000 }); await wait(7000);
  await c.보내기('Page.bringToFront', {}).catch(() => {});
  const a = await go('B80'); console.log('B80 ' + JSON.stringify(a));
  if (a.tab !== sheet || a.bar !== firstName) { console.log('STOP: B80 is not the scratch copy'); return; }
  const sel = await go('80:147'); console.log('selected ' + JSON.stringify(sel));
  if (sel.box !== '80:147') { console.log('STOP: rows not selected'); return; }
  await key('-', 'Minus', 189, 3); await wait(2500);
  console.log('after delete B80 ' + JSON.stringify(await go('B80')) + ' · H80 ' + JSON.stringify(await go('H80')) + ' · B68 ' + JSON.stringify(await go('B68')) + ' · B70 ' + JSON.stringify(await go('B70')));
  await wait(4000);
});
