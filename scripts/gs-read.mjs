#!/usr/bin/env node
// gs-read.mjs — READ ONLY. Open a Google Sheet in a new tab of the shared Chrome, list the sheet tabs, then open the
// sheet's own HTML table view (gviz out:html) in another new tab and save the cells as JSON rows. Nothing is typed or changed.
//   node scripts/gs-read.mjs <spreadsheet id> <out.json> [tab index]
import fs from 'node:fs';
import { 새탭에서, 자리잡기, 재기 } from './lib/cdp.mjs';
const [id, out, idx = '0'] = process.argv.slice(2);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const info = await 새탭에서('https://docs.google.com/spreadsheets/d/' + id + '/edit', async (c) => {
  await 자리잡기(c, { 최대: 60000 });
  await wait(6000);
  return JSON.parse(String(await 재기(c, `(() => JSON.stringify({ url: location.href.slice(0, 120), title: document.title, tabs: [...document.querySelectorAll('.docs-sheet-tab .docs-sheet-tab-name')].map((e) => e.textContent) }))()`, 30000)));
});
console.log(JSON.stringify(info));
const name = info.tabs[Number(idx)];
if (!name) { console.log('no such tab'); process.exit(1); }
const rows = await 새탭에서('https://docs.google.com/spreadsheets/d/' + id + '/gviz/tq?tqx=out:html&headers=0&sheet=' + encodeURIComponent(name), async (c) => {
  await 자리잡기(c, { 최대: 60000 });
  await wait(3000);
  return JSON.parse(String(await 재기(c, `(() => JSON.stringify([...document.querySelectorAll('table tr')].map((tr) => [...tr.children].map((td) => td.textContent.trim()))))()`, 60000)));
});
console.log('sheet ' + name + ' · rows ' + rows.length + ' · cols ' + (rows[0] ? rows[0].length : 0));
if (out) fs.writeFileSync(out, JSON.stringify({ info, name, rows }));
