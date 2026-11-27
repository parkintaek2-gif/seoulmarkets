#!/usr/bin/env node
/**
 * jb-s2-scan.mjs — schedule 2 (2026-11-28): find the target articles and read their current state. READ ONLY.
 *   Kim Seongsik 2026-01-01~08-31, title has the 35th/36th anniversary special tag
 *   Cho Hyeokyeon 2026-01-01~09-02, all articles
 * Writes docs/자국/중부매일-일정2-상태-20261128.json
 *   node scripts/jb-s2-scan.mjs            (search + read state)
 *   node scripts/jb-s2-scan.mjs --search   (search only, print counts)
 */
import fs from 'node:fs';
import { 새탭에서, 자리잡기, 재기 } from './lib/cdp.mjs';
import { 찾는다 } from './중부매일-기사검색.mjs';
import { 서식주소, 상태글 } from './중부매일-기자와분류-바꾼다.mjs';

const out = 'docs/자국/중부매일-일정2-상태-20261128.json';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const tag = /\[\s*창간\s*3[56]\s*주년\s*특별기획\s*\]/;

const kim = await 찾는다({ 기자: '김성식', 부터: '2026-01-01', 까지: '2026-08-31' }, { 최대쪽: 80 });
console.log('kim: ' + (kim.오류 || '') + ' rows ' + kim.것.length + ' | ' + kim.채움);
const cho = await 찾는다({ 기자: '조혁연', 부터: '2026-01-01', 까지: '2026-09-02' }, { 최대쪽: 80 });
console.log('cho: ' + (cho.오류 || '') + ' rows ' + cho.것.length + ' | ' + cho.채움);

const kimT = kim.것.filter((x) => tag.test(x.제목));
console.log('kim tagged ' + kimT.length + ' / not tagged ' + (kim.것.length - kimT.length));
for (const x of kim.것.filter((y) => !tag.test(y.제목))) console.log('  kim-skip ' + x.번호 + ' | ' + x.기자 + ' | ' + x.날짜 + ' | ' + x.제목.slice(0, 50));
const byline = (rows, name) => { const m = {}; for (const r of rows) m[r.기자] = (m[r.기자] || 0) + 1; console.log(name + ' bylines ' + JSON.stringify(m)); };
byline(kim.것, 'kim'); byline(cho.것, 'cho');

const targets = [...kimT.map((x) => ({ ...x, 갈래: '김성식' })), ...cho.것.map((x) => ({ ...x, 갈래: '조혁연' }))];
if (process.argv.includes('--search')) { for (const t of targets) console.log(t.갈래 + ' ' + t.번호 + ' | ' + t.섹션 + ' | ' + t.기자 + ' | ' + t.날짜 + ' | ' + t.제목.slice(0, 44)); process.exit(0); }

const res = [];
for (const t of targets) {
  const s = await 새탭에서(서식주소(t.번호), async (c) => {
    await 자리잡기(c, { 최대: 45000 });
    await wait(3000);
    try { return JSON.parse(String(await 재기(c, 상태글, 25000))); } catch { return null; }
  });
  res.push({ 번호: t.번호, 갈래: t.갈래, 할일: '문화칼럼으로', 목록제목: t.제목, 목록분류: t.섹션, 목록기자: t.기자, 목록날짜: t.날짜, 상태: s });
  fs.writeFileSync(out, JSON.stringify(res, null, 1));
  const x = s || {};
  console.log([t.번호, t.갈래, x.섹션1글 + ' > ' + x.섹션2글 + ' > ' + x.연재글, x.승인 ? 'approved' : (x.미승인 ? 'unapproved' : '?'), (x.노출날 || '') + ' ' + (x.노출시각 || ''), x.기자명, String(x.제목 || 'UNREAD').slice(0, 30)].join(' | '));
}
console.log('wrote ' + out + ' — ' + res.length + ' rows, unread ' + res.filter((x) => !x.상태).length);
