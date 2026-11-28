#!/usr/bin/env node
// gs-shot.mjs — READ ONLY. Screenshot of a Google Sheet tab (by gid) in a new tab. Nothing is typed or changed.
//   node scripts/gs-shot.mjs <spreadsheet id> <gid> <out.png>
import fs from 'node:fs';
import { 새탭에서, 자리잡기 } from './lib/cdp.mjs';
const [id, gid, out] = process.argv.slice(2);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await 새탭에서('https://docs.google.com/spreadsheets/d/' + id + '/edit#gid=' + gid, async (c) => {
  await 자리잡기(c, { 최대: 60000 });
  await wait(7000);
  const r = await c.보내기('Page.captureScreenshot', { format: 'png' }, 30000);
  fs.writeFileSync(out, Buffer.from(r.data, 'base64'));
});
console.log('saved ' + out);
