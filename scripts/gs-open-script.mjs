#!/usr/bin/env node
// gs-open-script.mjs — open the sheet, press Extensions > Apps Script, and print the script editor tab that opens.
// The script editor tab is left open for the next step (gs-install-script.mjs closes it).
import { 새탭에서, 자리잡기, 재기, 탭들 } from './lib/cdp.mjs';
const id = '18rEcErHG_PyVPy94ycAqSFLwXcXxtl-FXCoJkQ9tWpA', gid = '1747466165';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const had = new Set((await 탭들()).map((t) => t.id));
await 새탭에서('https://docs.google.com/spreadsheets/d/' + id + '/edit#gid=' + gid, async (c) => {
  await 자리잡기(c, { 최대: 60000 }); await wait(7000);
  await c.보내기('Page.bringToFront', {}).catch(() => {});
  const click = async (sel, textRe) => {
    const p = JSON.parse(String(await 재기(c, `(() => { const re = new RegExp(${JSON.stringify(textRe)}); const els = [...document.querySelectorAll(${JSON.stringify(sel)})].filter((e) => e.offsetWidth && re.test((e.textContent || '').trim())); if (!els.length) return JSON.stringify({ none: true }); const r = els[0].getBoundingClientRect(); return JSON.stringify({ x: r.x + r.width / 2, y: r.y + r.height / 2, text: els[0].textContent.trim().slice(0, 40), n: els.length }); })()`, 20000)));
    if (p.none) return null;
    for (const type of ['mousePressed', 'mouseReleased']) await c.보내기('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: 'left', clickCount: 1 });
    return p;
  };
  console.log('menu ' + JSON.stringify(await click('#docs-extensions-menu, .menu-button', '^확장 프로그램$')));
  await wait(1500);
  console.log('items ' + String(await 재기(c, `JSON.stringify([...document.querySelectorAll('.goog-menuitem')].filter((e) => e.offsetWidth).map((e) => e.textContent.trim().slice(0, 30)))`, 20000)));
  console.log('item ' + JSON.stringify(await click('.goog-menuitem', '^Apps Script')));
  await wait(12000);
});
for (const t of await 탭들()) if (!had.has(t.id)) console.log('NEW TAB ' + t.id + ' | ' + t.url.slice(0, 140) + ' | ' + t.title);
