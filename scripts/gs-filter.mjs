#!/usr/bin/env node
// gs-filter.mjs — create the header filter on <기사-보도자료> through the Data menu, and (with --drop-view) delete the scratch tab 정렬용.
import { 새탭에서, 자리잡기, 재기 } from './lib/cdp.mjs';
import { 시트손 } from './lib/gs-type.mjs';
const id = '18rEcErHG_PyVPy94ycAqSFLwXcXxtl-FXCoJkQ9tWpA', gid = '1747466165', sheet = '기사-보도자료', view = '정렬용';
await 새탭에서('https://docs.google.com/spreadsheets/d/' + id + '/edit#gid=' + gid, async (c) => {
  const h = 시트손(c);
  c.듣기('Page.javascriptDialogOpening', () => { c.보내기('Page.handleJavaScriptDialog', { accept: true }).catch(() => {}); });
  await 자리잡기(c, { 최대: 60000 }); await h.wait(7000);
  await c.보내기('Page.bringToFront', {}).catch(() => {});
  const click = async (sel, re, button = 'left') => {
    const p = JSON.parse(String(await 재기(c, `(() => { const re = new RegExp(${JSON.stringify(re)}); const els = [...document.querySelectorAll(${JSON.stringify(sel)})].filter((e) => e.offsetWidth && re.test((e.textContent || '').trim())); if (!els.length) return JSON.stringify({ none: true }); const r = els[0].getBoundingClientRect(); return JSON.stringify({ x: r.x + r.width / 2, y: r.y + r.height / 2, text: els[0].textContent.trim().slice(0, 40) }); })()`, 20000)));
    if (p.none) return null;
    for (const type of ['mousePressed', 'mouseReleased']) await c.보내기('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button, clickCount: 1 });
    await h.wait(1200); return p;
  };
  const items = async () => String(await 재기(c, `JSON.stringify([...document.querySelectorAll('.goog-menuitem')].filter((e) => e.offsetWidth).map((e) => e.textContent.trim().slice(0, 24)))`, 20000));
  if (process.argv.includes('--filter')) {
    const s = await h.go('A1:H35'); if (s.tab !== sheet || s.box !== 'A1:H35') { console.log('STOP ' + JSON.stringify(s)); return; }
    console.log('menu ' + JSON.stringify(await click('.menu-button', '^데이터$')));
    let list = await items();
    if (list === '[]') { await h.wait(800); console.log('menu again ' + JSON.stringify(await click('.menu-button', '^데이터$'))); list = await items(); }
    console.log('items ' + list);
    console.log('item ' + JSON.stringify(await click('.goog-menuitem', '필터 만들기')));
    await h.wait(2000); await h.go('A1');
  }
  if (process.argv.includes('--drop-view')) {
    const s = await h.state(); if (!s.tabs.includes(view)) { console.log('no scratch tab'); return; }
    console.log('tab ' + JSON.stringify(await click('.docs-sheet-tab .docs-sheet-tab-name', '^' + view + '$', 'right')));
    console.log('items ' + await items());
    console.log('item ' + JSON.stringify(await click('.goog-menuitem', '^삭제')));
    await h.wait(1500);
    console.log('dialog buttons ' + String(await 재기(c, `JSON.stringify([...document.querySelectorAll('.modal-dialog button, .docs-dialog button, [role=dialog] button')].filter((e) => e.offsetWidth).map((e) => e.textContent.trim()))`, 20000)));
    console.log('ok ' + JSON.stringify(await click('.modal-dialog button, .docs-dialog button, [role=dialog] button', '^확인$')));
    await h.wait(2500);
    console.log('tabs now ' + JSON.stringify((await h.state()).tabs));
  }
  await h.wait(3000);
});
