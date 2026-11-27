#!/usr/bin/env node
/**
 * jb-s2-change.mjs — schedule 2 (2026-11-28): move the scanned targets to Opinion > External column > Culture column
 *   (S1N7 · S2N149 · SRN552). Section only. Reporter, title, body, photo, exposure time untouched.
 * Only rows that were read as APPROVED and are not yet in the culture column are changed
 *   (saving turns approval on, so an unapproved article must never be saved here).
 * Never presses web publish.
 *   node scripts/jb-s2-change.mjs --count 1     (change N rows)
 *   node scripts/jb-s2-change.mjs               (change all remaining)
 *   node scripts/jb-s2-change.mjs --verify      (re-read all targets, compare with the first state; read only)
 */
import fs from 'node:fs';
import { 새탭에서, 자리잡기, 재기 } from './lib/cdp.mjs';
import { 한건바꾸기, 서식주소, 상태글, 오피니언, 외부칼럼, 문화칼럼 } from './중부매일-기자와분류-바꾼다.mjs';

const stateFile = 'docs/자국/중부매일-일정2-상태-20261128.json';
const logFile = 'docs/자국/중부매일-일정2-일지-20261128.json';
const checkFile = 'docs/자국/중부매일-일정2-검수-20261128.json';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const all = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
const done = (s) => s && s.섹션1 === 오피니언 && s.섹션2 === 외부칼럼 && s.연재 === 문화칼럼;

if (process.argv.includes('--verify')) {
  const out = []; let bad = 0;
  for (const row of all) {
    const after = await 새탭에서(서식주소(row.번호), async (c) => {
      await 자리잡기(c, { 최대: 45000 });
      await wait(3500);
      try { return JSON.parse(String(await 재기(c, 상태글, 25000))); } catch { return null; }
    });
    const before = row.상태; const 탈 = [];
    if (!after) 탈.push('못 읽음');
    else if (!before) 탈.push('처음 상태가 없다');
    else {
      if (before.승인 && !done(after)) 탈.push('문화칼럼이 아니다');
      if (!before.승인 && (after.섹션1 !== before.섹션1 || after.섹션2 !== before.섹션2 || after.연재 !== before.연재)) 탈.push('미승인인데 분류가 바뀌었다');
      if (after.노출날 !== before.노출날 || after.노출시각 !== before.노출시각) 탈.push('노출시간이 바뀌었다');
      if (after.승인 !== before.승인) 탈.push('승인 상태가 바뀌었다');
      if (after.기자id !== before.기자id || after.기자명 !== before.기자명 || after.기자메일 !== before.기자메일) 탈.push('기자가 바뀌었다');
      if (after.제목 !== before.제목) 탈.push('제목이 바뀌었다');
    }
    if (탈.length) bad += 1;
    out.push({ 번호: row.번호, 갈래: row.갈래, 전: before, 뒤: after, 탈 });
    fs.writeFileSync(checkFile, JSON.stringify(out, null, 1));
    console.log((탈.length ? 'BAD ' : 'ok ') + row.번호 + ' | ' + (after ? after.섹션1글 + ' > ' + after.섹션2글 + ' > ' + after.연재글 : '') + (탈.length ? ' — ' + 탈.join(' · ') : ''));
  }
  console.log('verify ' + out.length + ' rows, bad ' + bad + ' — ' + checkFile);
  process.exit(bad ? 1 : 0);
}

const log = fs.existsSync(logFile) ? JSON.parse(fs.readFileSync(logFile, 'utf8')) : [];
const finished = new Set(log.filter((x) => x.된것).map((x) => x.번호));
const todo = all.filter((x) => x.상태 && x.상태.승인 && !done(x.상태) && !finished.has(x.번호));
console.log('targets ' + all.length + ' · already culture column ' + all.filter((x) => done(x.상태)).length + ' · finished in log ' + finished.size
  + ' · not approved or unread (skipped) ' + all.filter((x) => !x.상태 || !x.상태.승인).length + ' · to do now ' + todo.length);

const at = process.argv.indexOf('--count');
const n = at > 0 ? Number(process.argv[at + 1]) : todo.length;
for (const row of todo.slice(0, n)) {
  let r;
  try { r = await 한건바꾸기(row.번호, { 섹션1: 오피니언, 섹션2: 외부칼럼, 연재: 문화칼럼 }); }
  catch (e) { r = { 된것: false, 말: 'ERROR ' + String(e.message).slice(0, 80) }; }
  log.push({ 번호: row.번호, 갈래: row.갈래, 제목: row.목록제목, 전: row.상태, 된것: !!(r && r.된것), 말: r && r.말, 뒤: r && r.뒤 });
  fs.writeFileSync(logFile, JSON.stringify(log, null, 1));
  console.log((r && r.된것 ? 'ok ' : 'BAD ') + row.번호 + ' — ' + String(r && r.말).slice(0, 150));
  if (!(r && r.된것)) { console.log('one row failed — stopping here'); process.exit(1); }
}
console.log('done — log ' + logFile);
