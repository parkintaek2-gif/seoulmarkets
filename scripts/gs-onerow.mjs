#!/usr/bin/env node
// gs-onerow.mjs — boss 2026-11-28: turn the <기사-보도자료> tab into one row per reporter so the header filter buttons can sort it.
//   before: A number | B name (merged over 2 rows) | C kind (전체/보도자료) | D Nov | E Dec      (2 rows per reporter)
//   after : A number | B name | C Nov total | D Nov press | E Dec total | F Dec press           (1 row per reporter)
// Cells are moved by block copy/paste so their formats (red figures etc.) travel with the values.
//   --step1  block pastes + header text, then verify by re-reading (no row is deleted)
//   --step2  delete the press rows (bottom-up; a row is deleted only when its A cell is empty), verify
//   --step3  make the header filter
import fs from 'node:fs';
import { 새탭에서, 자리잡기, 재기 } from './lib/cdp.mjs';
import { 시트손 } from './lib/gs-type.mjs';
const id = '18rEcErHG_PyVPy94ycAqSFLwXcXxtl-FXCoJkQ9tWpA', gid = '1747466165', sheet = '기사-보도자료';
const snapFile = 'docs/자국/gs-onerow-before-20261128.json';
const read = () => 새탭에서('https://docs.google.com/spreadsheets/d/' + id + '/gviz/tq?tqx=out:html&headers=0&sheet=' + encodeURIComponent(sheet), async (c) => {
  await 자리잡기(c, { 최대: 60000 }); await new Promise((r) => setTimeout(r, 3000));
  return JSON.parse(String(await 재기(c, `(() => JSON.stringify([...document.querySelectorAll('table tr')].map((tr) => [...tr.children].map((td) => td.textContent.trim()))))()`, 60000)));
});
const open = (fn) => 새탭에서('https://docs.google.com/spreadsheets/d/' + id + '/edit#gid=' + gid, async (c) => {
  const h = 시트손(c);
  await 자리잡기(c, { 최대: 60000 }); await h.wait(7000);
  await c.보내기('Page.bringToFront', {}).catch(() => {});
  const s = await h.state(); if (s.tab !== sheet) { console.log('STOP: active tab is ' + s.tab); return; }
  h.copy = async () => { await h.key('c', 'KeyC', 67, 2, { commands: ['copy'] }); await h.wait(800); };
  h.paste = async () => { await h.key('v', 'KeyV', 86, 2, { commands: ['paste'] }); await h.wait(1800); };
  h.at = async (cell) => { const w = await h.go(cell); if (w.tab !== sheet || !(w.box === cell || String(w.box).startsWith(cell + ':'))) throw new Error('could not go to ' + cell + ' — ' + w.tab + ' ' + w.box); return w; };
  try { await fn(h, c); } catch (e) { console.log('ERROR ' + e.message); }
  await h.wait(4000);
});

if (process.argv.includes('--step1')) {
  const before = await read();
  if (before[1][2] !== '구분' || before.length !== 71) { console.log('STOP: the sheet is not in the two-row layout (rows ' + before.length + ', C1 ' + before[1][2] + ')'); process.exit(1); }
  fs.writeFileSync(snapFile, JSON.stringify(before));
  await open(async (h) => {
    // after: C Nov total | D Nov press | E Nov general | F Dec total | G Dec press | H Dec general
    // F <- E (Dec, both rows) ; G <- E shifted up one row ; C <- D (Nov, both rows) ; D <- D shifted up one row
    for (const [from, to, probe] of [['E2:E69', 'F2', 'F2'], ['E3:E70', 'G2', 'G2'], ['D2:D69', 'C2', 'C2'], ['D3:D70', 'D2', 'D2']]) {
      await h.at(from); await h.copy();
      await h.at(to); await h.paste();
      const w = await h.at(probe);
      console.log(from + ' -> ' + to + ' · ' + probe + ' now ' + JSON.stringify(w.bar));
    }
  });
  await new Promise((r) => setTimeout(r, 5000));
  const mid = await read(); fs.writeFileSync('docs/자국/gs-onerow-mid-20261128.json', JSON.stringify(mid));
  let bad = 0;
  console.log('header now ' + JSON.stringify(mid[1]) + ' rows ' + mid.length);
  for (let r = 2; r < 70; r += 2) {
    const want = [before[r][0], before[r][1], before[r][3], before[r + 1][3], before[r][4], before[r + 1][4]];
    const got = [mid[r][0], mid[r][1], mid[r][2], mid[r][3], mid[r][5], mid[r][6]];
    if (JSON.stringify(want) !== JSON.stringify(got)) { bad += 1; console.log('MISMATCH row ' + r + ' want ' + JSON.stringify(want) + ' got ' + JSON.stringify(got)); }
  }
  console.log('step1 verify: mismatched reporters ' + bad + ' / 34');
  process.exit(bad ? 1 : 0);
}

if (process.argv.includes('--step2')) {
  const before = JSON.parse(fs.readFileSync(snapFile, 'utf8'));
  await open(async (h) => {
    let deleted = 0;
    for (let n = 69; n >= 2; n -= 1) {
      const w = await h.at('A' + n);
      if (w.bar !== '') continue;                       // a reporter (total) row has its number in A
      const b = await h.go('B' + n);                    // never delete the total line or a row with a name of its own
      if (b.box === 'B' + n && b.bar !== '') { console.log('skip row ' + n + ' (B has ' + b.bar + ')'); continue; }
      const sel = await h.go(n + ':' + n);
      if (sel.box !== n + ':' + n) { console.log('STOP: row ' + n + ' not selected — ' + sel.box); return; }
      await h.key('-', 'Minus', 189, 3); await h.wait(1300);
      deleted += 1;
    }
    console.log('deleted rows ' + deleted);
    console.log('B36 ' + JSON.stringify((await h.go('B36')).bar) + ' · A35 ' + JSON.stringify((await h.go('A35')).bar) + ' · A2 ' + JSON.stringify((await h.go('A2')).bar));
  });
  await new Promise((r) => setTimeout(r, 5000));
  const after = await read(); fs.writeFileSync('docs/자국/gs-onerow-after-20261128.json', JSON.stringify(after));
  const want = new Map(); for (let r = 2; r < 70; r += 2) want.set(before[r][1], JSON.stringify([before[r][0], before[r][1], before[r][3], before[r + 1][3], before[r][4], before[r + 1][4]]));
  let ok = 0; const seen = [];
  for (let r = 2; r < after.length; r += 1) { const row = after[r]; if (row[1] === '합계') break; seen.push(row[1]); if (want.get(row[1]) === JSON.stringify([row[0], row[1], row[2], row[3], row[5], row[6]])) ok += 1; else console.log('MISMATCH ' + JSON.stringify(row)); }
  console.log('step2 verify: rows ' + after.length + ' · reporters ' + seen.length + ' · matching ' + ok + ' / 34 · header ' + JSON.stringify(after[1]));
  process.exit(ok === 34 && seen.length === 34 ? 0 : 1);
}

if (process.argv.includes('--step3')) {
  await open(async (h, c) => {
    const last = 35;
    if ((await h.at('B36')).bar !== '합계' || (await h.at('A35')).bar === '') { console.log('STOP: the sheet is not 34 one-row reporters'); return; }
    // header cells F1:H1 take the header format from E1, then all six texts are typed
    await h.at('E1'); await h.copy(); await h.at('F1:H1'); await h.paste();
    // the general columns take their cell format from the total columns before the formulas go in
    await h.at('C2:C' + last); await h.copy(); await h.at('E2'); await h.paste();
    await h.at('F2:F' + last); await h.copy(); await h.at('H2'); await h.paste();
    for (const [col, text] of [['C', '11월 전체'], ['D', '11월 보도자료'], ['E', '11월 일반'], ['F', '12월 전체'], ['G', '12월 보도자료'], ['H', '12월 일반']]) console.log(col + '1 ' + JSON.stringify(await h.typeDown(col, 1, [text], sheet)));
    for (const [col, t, p] of [['E', 'C', 'D'], ['H', 'F', 'G']]) {
      const vals = []; for (let r = 2; r <= last; r += 1) vals.push('=IF(' + t + r + '="","",' + t + r + '-N(' + p + r + '))');
      console.log(col + ' formulas ' + JSON.stringify(await h.typeDown(col, 2, vals, sheet)));
    }
    if (process.argv.includes('--filter')) { await h.at('A1:H' + last); await h.key('L', 'KeyL', 76, 10); await h.wait(2500); }
    await h.at('A1');
  });
}
