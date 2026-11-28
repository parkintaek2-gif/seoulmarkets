#!/usr/bin/env node
// gs-sort-desc.mjs — boss 2026-11-28: re-order the <기사-보도자료> sheet by reporter name, descending, moving each reporter's
// two rows (A:E — number, name, kind, month counts, with their formats) together. Method: copy the whole block to a scratch
// area below (row 80+), paste each reporter's pair back in the new order, verify by re-reading, then delete the scratch rows.
//   node scripts/gs-sort-desc.mjs --plan    (read only: print the new order)
//   node scripts/gs-sort-desc.mjs --do
import fs from 'node:fs';
import { 새탭에서, 자리잡기, 재기 } from './lib/cdp.mjs';
const id = '18rEcErHG_PyVPy94ycAqSFLwXcXxtl-FXCoJkQ9tWpA', gid = '1747466165', sheet = '기사-보도자료';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const read = () => 새탭에서('https://docs.google.com/spreadsheets/d/' + id + '/gviz/tq?tqx=out:html&headers=0&sheet=' + encodeURIComponent(sheet), async (c) => {
  await 자리잡기(c, { 최대: 60000 }); await wait(3000);
  return JSON.parse(String(await 재기(c, `(() => JSON.stringify([...document.querySelectorAll('table tr')].map((tr) => [...tr.children].map((td) => td.textContent.trim()))))()`, 60000)));
});
const nowSheet = await read();
const before = process.argv.includes('--resume') ? JSON.parse(fs.readFileSync('docs/자국/gs-sort-before-20261128.json', 'utf8')) : nowSheet;
if (!process.argv.includes('--resume')) fs.writeFileSync('docs/자국/gs-sort-before-20261128.json', JSON.stringify(before));
const head = before.findIndex((r) => r[1] === '기자명' && r[2] === '구분');
const pairs = [];
for (let r = head + 1; r < before.length - 1 && before[r][1] !== '합계'; r += 1) if (before[r][2] === '전체' && before[r][1] && before[r + 1][2] === '보도자료') pairs.push({ name: before[r][1], row: r - head + 1, a: before[r], b: before[r + 1] });
const first = pairs[0].row, last = pairs[pairs.length - 1].row + 1;
const contiguous = pairs.every((p, i) => p.row === first + 2 * i);
const asc = process.argv.includes('--asc');   // boss 2026-11-28 later: ga-na-da (ascending) order
const order = [...pairs].sort((x, y) => (asc ? x.name.localeCompare(y.name, 'ko') : y.name.localeCompare(x.name, 'ko')));
console.log('pairs ' + pairs.length + ' · rows ' + first + '..' + last + ' · contiguous ' + contiguous + ' · cols ' + before[head].length);
console.log(order.map((p) => p.name).join(' '));
if (!contiguous || new Set(pairs.map((p) => p.name)).size !== pairs.length) { console.log('STOP: rows are not contiguous pairs or a name repeats'); process.exit(1); }
if (!process.argv.includes('--do')) process.exit(0);

const S = 80;                                   // scratch start row
const lastCol = 'E';   // A:E only (number, name, kind, two month columns)
if (!process.argv.includes('--resume') && before.length > S - 5) { console.log('STOP: the sheet has data near the scratch area'); process.exit(1); }
const where = `(() => { const n = document.querySelector('#t-name-box'); const f = document.querySelector('#t-formula-bar-input .cell-input'); const tab = document.querySelector('.docs-sheet-active-tab .docs-sheet-tab-name'); return JSON.stringify({ box: n ? n.value : null, bar: f ? f.textContent : null, tab: tab ? tab.textContent : null }); })()`;
const log = [];
await 새탭에서('https://docs.google.com/spreadsheets/d/' + id + '/edit#gid=' + gid, async (c) => {
  const key = async (k, code, vk, mod = 0, extra = {}) => { await c.보내기('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers: mod, ...extra }); await c.보내기('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers: mod }); };
  const enter = async () => { await c.보내기('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13, text: '\r', unmodifiedText: '\r' }); await c.보내기('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 }); };
  const go = async (cell) => {
    const b = JSON.parse(String(await 재기(c, `(() => { const r = document.querySelector('#t-name-box').getBoundingClientRect(); return JSON.stringify({ x: r.x + r.width / 2, y: r.y + r.height / 2 }); })()`, 20000)));
    for (const type of ['mousePressed', 'mouseReleased']) await c.보내기('Input.dispatchMouseEvent', { type, x: b.x, y: b.y, button: 'left', clickCount: 1 });
    await wait(350); await key('a', 'KeyA', 65, 2); await c.보내기('Input.insertText', { text: cell }); await wait(250); await enter(); await wait(800);
    const w = JSON.parse(String(await 재기(c, where, 20000)));
    if (w.tab !== sheet || (w.box !== cell && !String(w.box).startsWith(cell + ':'))) throw new Error('could not go to ' + cell + ' — ' + JSON.stringify(w));
    return w;
  };
  const copy = async () => { await key('c', 'KeyC', 67, 2, { commands: ['copy'] }); await wait(700); };
  const paste = async () => { await key('v', 'KeyV', 86, 2, { commands: ['paste'] }); await wait(1300); };
  await 자리잡기(c, { 최대: 60000 }); await wait(7000);
  await c.보내기('Page.bringToFront', {}).catch(() => {});
  // 1. whole block -> scratch
  if (!process.argv.includes('--resume')) { await go('A' + first + ':' + lastCol + last); await copy(); await go('A' + S); await paste(); }

  const chk = await go('B' + S);
  log.push('scratch B' + S + ' = ' + chk.bar);
  if (chk.bar !== pairs[0].name) throw new Error('scratch copy did not land — B' + S + ' is ' + chk.bar);
  // 2. each pair back in the new order
  for (let k = 0; k < order.length; k += 1) {
    const src = S + (order[k].row - first); const dst = first + 2 * k;
    if (order[k].row === dst) continue;
    if (process.argv.includes('--resume') && JSON.stringify(nowSheet[head + dst - 1]) === JSON.stringify(order[k].a) && JSON.stringify(nowSheet[head + dst]) === JSON.stringify(order[k].b)) continue;
    await go('A' + src + ':' + lastCol + (src + 1)); await copy();
    await go('A' + dst); await paste();
    const w = await go('B' + dst);
    log.push('row ' + dst + ' <- ' + order[k].name + (w.bar === order[k].name ? '' : ' !! shows ' + w.bar));
    if (w.bar !== order[k].name) throw new Error('paste mismatch at row ' + dst);
  }
  await key('Escape', 'Escape', 27); await wait(4000);
}).catch((e) => { log.push('ERROR ' + e.message); });
for (const l of log) console.log(l);

// 3. verify by re-reading
await wait(5000);
const after = await read();
fs.writeFileSync('docs/자국/gs-sort-after-20261128.json', JSON.stringify(after));
let bad = 0;
for (let k = 0; k < order.length; k += 1) {
  const r = head + (first - 1) + 2 * k;
  if (JSON.stringify(after[r]) !== JSON.stringify(order[k].a) || JSON.stringify(after[r + 1]) !== JSON.stringify(order[k].b)) { bad += 1; console.log('MISMATCH row ' + (first + 2 * k) + ' expected ' + order[k].name + ' ' + JSON.stringify(order[k].a) + ' got ' + JSON.stringify(after[r])); }
}
const tailBefore = JSON.stringify(before[head + last]); const tailAfter = JSON.stringify(after[head + last]);
console.log('verify: mismatched pairs ' + bad + ' · header same ' + (JSON.stringify(before[head]) === JSON.stringify(after[head])) + ' · total row same ' + (tailBefore === tailAfter) + ' · rows now ' + after.length);
process.exit(bad || log.some((l) => l.startsWith('ERROR')) ? 1 : 0);
