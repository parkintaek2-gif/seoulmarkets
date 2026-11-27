#!/usr/bin/env node
/**
 * jb-table4-change.mjs - JB News, owner's table of 2026-11-27 (4 articles): the three section changes.
 * Only the section is changed. Byline, title, body, photo and exposure time are left as they are.
 * Web publishing is NOT pressed here. Stops at the first article that does not read back as expected.
 *
 *   node scripts/jb-table4-change.mjs 1512171
 */
import fs from 'node:fs';
import * as M from './%EC%A4%91%EB%B6%80%EB%A7%A4%EC%9D%BC-%EA%B8%B0%EC%9E%90%EC%99%80%EB%B6%84%EB%A5%98-%EB%B0%94%EA%BE%BC%EB%8B%A4.mjs';
const change = Object.values(M).find((v) => typeof v === 'function' && v.constructor.name === 'AsyncFunction');
const plan = {
  1512171: { want: ['S1N7', 'S2N149', 'SRN552'], time: '2026-09-22 17:48' },
  1513261: { want: ['S1N31', '', ''], time: '2026-10-12 15:27' },
  1513985: { want: ['S1N30', 'S2N207', ''] },
  1503680: { want: ['S1N30', 'S2N207', ''] },
  1511116: { want: ['S1N7', 'S2N149', 'SRN549'], time: '2026-09-07 16:50' },
};
const logPath = 'docs/jb-table4-log-20261127.json';
const log = fs.existsSync(logPath) ? JSON.parse(fs.readFileSync(logPath, 'utf8')) : [];
for (const id of process.argv.slice(2)) {
  const p = plan[id];
  if (!p) { console.log('not in the table: ' + id); process.exit(1); }
  const keys = ['섹션1', '섹션2', '연재'];
  const arg = {}; p.want.forEach((v, i) => { if (v) arg[keys[i]] = v; });
  let r;
  try { r = await change(id, arg); } catch (e) { r = { err: String(e.message).slice(0, 120) }; }
  const vals = (s) => (s ? Object.entries(s).filter(([k]) => !/본문/.test(k)).map(([k, v]) => k + '=' + String(v).slice(0, 40)).join(' | ') : 'null');
  log.push({ id, at: new Date().toLocaleString('sv'), want: p.want, result: r });
  fs.writeFileSync(logPath, JSON.stringify(log, null, 1));
  console.log(id + ' => ' + JSON.stringify(r && Object.fromEntries(Object.entries(r).filter(([, v]) => typeof v !== 'object'))));
  for (const [k, v] of Object.entries(r || {})) if (v && typeof v === 'object') console.log('   ' + k + ': ' + vals(v));
  const ok = r && Object.values(r)[0] === true;
  if (!ok) { console.log('STOP - not as expected'); process.exit(1); }
}
