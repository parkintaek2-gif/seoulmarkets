#!/usr/bin/env node
// jb-s2-add2.mjs — 2026-11-28 boss: the two Kim Seongsik articles without the special tag (1503678, 1502914) also go to the culture column.
// READ ONLY on the CMS. Reads their state and puts them at the front of the state file. Also marks the two rows whose
// exposure time shifted (accepted by the boss) as done in the log, so they are not saved again.
import fs from 'node:fs';
import { 새탭에서, 자리잡기, 재기 } from './lib/cdp.mjs';
import { 서식주소, 상태글 } from './중부매일-기자와분류-바꾼다.mjs';
const stateFile = 'docs/자국/중부매일-일정2-상태-20261128.json';
const logFile = 'docs/자국/중부매일-일정2-일지-20261128.json';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const all = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
const add = [];
for (const n of ['1503678', '1502914']) {
  if (all.some((x) => x.번호 === n)) { console.log('already in ' + n); continue; }
  const s = await 새탭에서(서식주소(n), async (c) => { await 자리잡기(c, { 최대: 45000 }); await wait(3500); try { return JSON.parse(String(await 재기(c, 상태글, 25000))); } catch { return null; } });
  if (!s) { console.log('UNREAD ' + n); process.exit(1); }
  add.push({ 번호: n, 갈래: '김성식', 할일: '문화칼럼으로', 목록제목: s.제목, 목록분류: s.섹션2글, 목록기자: s.기자명, 목록날짜: s.노출날 + ' ' + s.노출시각, 상태: s });
  console.log([n, s.기자id, s.기자명, s.섹션1글 + ' > ' + s.섹션2글 + ' > ' + s.연재글, s.승인 ? 'approved' : 'unapproved', s.노출날 + ' ' + s.노출시각, s.제목.slice(0, 50)].join(' | '));
}
fs.writeFileSync(stateFile, JSON.stringify([...add, ...all], null, 1));
const log = JSON.parse(fs.readFileSync(logFile, 'utf8'));
const seen = new Set(); const out = [];
for (const x of log) {
  if (!x.된것 && x.뒤 && x.전 && x.뒤.섹션1 === 'S1N7' && x.뒤.연재 === 'SRN552' && x.뒤.노출날 === x.전.노출날) { x.된것 = true; x.시각달라짐 = x.전.노출시각 + ' -> ' + x.뒤.노출시각; console.log('log fixed ' + x.번호 + ' ' + x.시각달라짐); }
  out.push(x); seen.add(x.번호);
}
fs.writeFileSync(logFile, JSON.stringify(out, null, 1));
console.log('state rows ' + (add.length + all.length) + ' · log done ' + new Set(out.filter((x) => x.된것).map((x) => x.번호)).size);
