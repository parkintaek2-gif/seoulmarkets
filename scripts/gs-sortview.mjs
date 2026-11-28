#!/usr/bin/env node
// gs-sortview.mjs — add a second tab to the sheet: one row per reporter (number, name, month totals, month press counts)
// that follows the first tab by formula, with header filter buttons so any column can be sorted. The first tab is not touched.
//   node scripts/gs-sortview.mjs --step1   (insert the new tab and rename it; prints the tab list)
//   node scripts/gs-sortview.mjs --step2   (fill the new tab and create the filter)
import fs from 'node:fs';
import { 새탭에서, 자리잡기, 재기 } from './lib/cdp.mjs';
const id = '18rEcErHG_PyVPy94ycAqSFLwXcXxtl-FXCoJkQ9tWpA', gid = '1747466165', src = '기사-보도자료', view = '정렬용';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const where = `(() => { const n = document.querySelector('#t-name-box'); const f = document.querySelector('#t-formula-bar-input .cell-input'); const tab = document.querySelector('.docs-sheet-active-tab .docs-sheet-tab-name'); return JSON.stringify({ box: n ? n.value : null, bar: f ? f.textContent : null, tab: tab ? tab.textContent : null, tabs: [...document.querySelectorAll('.docs-sheet-tab .docs-sheet-tab-name')].map((e) => e.textContent) }); })()`;
const names = JSON.parse(fs.readFileSync('docs/자국/gs-sort-before-20261128.json', 'utf8')).filter((r) => r[2] === '전체' && r[1]).map((r) => r[1]).sort((a, b) => a.localeCompare(b, 'ko'));
await 새탭에서('https://docs.google.com/spreadsheets/d/' + id + '/edit#gid=' + gid, async (c) => {
  const key = async (k, code, vk, mod = 0, extra = {}) => { await c.보내기('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers: mod, ...extra }); await c.보내기('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers: mod }); };
  const enter = async () => { await c.보내기('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13, text: '\r', unmodifiedText: '\r' }); await c.보내기('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 }); };
  const st = async () => JSON.parse(String(await 재기(c, where, 20000)));
  const go = async (cell) => {
    const b = JSON.parse(String(await 재기(c, `(() => { const r = document.querySelector('#t-name-box').getBoundingClientRect(); return JSON.stringify({ x: r.x + r.width / 2, y: r.y + r.height / 2 }); })()`, 20000)));
    for (const type of ['mousePressed', 'mouseReleased']) await c.보내기('Input.dispatchMouseEvent', { type, x: b.x, y: b.y, button: 'left', clickCount: 1 });
    await wait(350); await key('a', 'KeyA', 65, 2); await c.보내기('Input.insertText', { text: cell }); await wait(250); await enter(); await wait(800);
    return st();
  };
  const clickTab = async (name, count = 1) => {
    const p = JSON.parse(String(await 재기(c, `(() => { const e = [...document.querySelectorAll('.docs-sheet-tab .docs-sheet-tab-name')].find((x) => x.textContent === ${JSON.stringify(name)}); if (!e) return JSON.stringify({ none: true }); const r = e.getBoundingClientRect(); return JSON.stringify({ x: r.x + r.width / 2, y: r.y + r.height / 2 }); })()`, 20000)));
    if (p.none) return false;
    for (let i = 1; i <= count; i += 1) for (const type of ['mousePressed', 'mouseReleased']) await c.보내기('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: 'left', clickCount: i });
    await wait(900); return true;
  };
  await 자리잡기(c, { 최대: 60000 }); await wait(7000);
  await c.보내기('Page.bringToFront', {}).catch(() => {});
  let s = await st(); console.log('start ' + JSON.stringify(s.tabs) + ' active ' + s.tab);

  if (process.argv.includes('--step1')) {
    if (s.tabs.includes(view)) { console.log('the view tab already exists'); return; }
    await go('A1');
    await key('F11', 'F11', 122, 8); await wait(3500);
    s = await st(); console.log('after insert ' + JSON.stringify(s.tabs) + ' active ' + s.tab);
    const fresh = s.tab;
    if (fresh === src || ['26.11', '사내계정', '인수 내용'].includes(fresh)) { console.log('STOP: no new tab became active'); return; }
    await clickTab(fresh, 2); await wait(600);
    await key('a', 'KeyA', 65, 2); await c.보내기('Input.insertText', { text: view }); await wait(300); await enter(); await wait(1500);
    s = await st(); console.log('after rename ' + JSON.stringify(s.tabs) + ' active ' + s.tab);
    await wait(3000);
    return;
  }

  if (process.argv.includes('--step2')) {
    if (!(await clickTab(view))) { console.log('STOP: no view tab'); return; }
    s = await st(); if (s.tab !== view) { console.log('STOP: view tab is not active — ' + s.tab); return; }
    const q = "'" + src + "'!";
    const f = (col, off) => (r) => '=INDEX(' + q + '$' + col + ':$' + col + ',MATCH($B' + r + ',' + q + '$B:$B,0)' + (off ? '+1' : '') + ')';
    const cols = [
      ['A', '번호', f('A', 0)], ['B', '기자명', (r) => names[r - 2]],
      ['C', '11월 전체', f('D', 0)], ['D', '11월 보도자료', f('D', 1)], ['E', '12월 전체', f('E', 0)], ['F', '12월 보도자료', f('E', 1)],
    ];
    for (const [col, head, cell] of [cols[1], cols[0], ...cols.slice(2)]) {
      let w = await go(col + '1');
      if (w.tab !== view || w.box !== col + '1') { console.log('STOP: could not go to ' + col + '1 on the view tab — ' + JSON.stringify(w)); return; }
      await c.보내기('Input.insertText', { text: head }); await wait(150); await enter(); await wait(250);
      for (let r = 2; r < 2 + names.length; r += 1) { await c.보내기('Input.insertText', { text: cell(r) }); await wait(180); await enter(); await wait(260); }
      w = await st(); console.log(col + ' done, now at ' + w.box + ' on ' + w.tab);
      if (w.tab !== view) { console.log('STOP: left the view tab'); return; }
    }
    let w = await go('A1:F1'); await key('b', 'KeyB', 66, 2); await wait(500);
    w = await go('A1:F' + (1 + names.length)); console.log('selected ' + w.box + ' on ' + w.tab);
    if (w.tab === view) { await key('L', 'KeyL', 76, 10); await wait(2000); }
    console.log('C2 ' + JSON.stringify(await go('C2')) .slice(0, 160));
    await wait(4000);
  }
});
