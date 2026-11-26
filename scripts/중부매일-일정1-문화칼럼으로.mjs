#!/usr/bin/env node
/**
 * 중부매일-일정1-문화칼럼으로.mjs — 일정 ①(2026-11-27)의 문화·기획 15건을
 *   **오피니언 > 외부칼럼 > 문화칼럼**(S1N7 · S2N149 · SRN552)으로 바꾼다.
 *
 * 일정 문서: docs/중부매일-작업일정-20261127-1204.md 「① 11월 27일」
 * ⛔ 분류만 바꾼다. 기자 이름·제목·본문·사진·노출시간은 건드리지 않는다.
 * ⛔ 먼저 읽어 둔 상태(docs/자국/중부매일-일정1-상태-20261127.json)에서
 *    «승인» 이고 «아직 문화칼럼이 아닌» 것만 바꾼다. 미승인 기사는 바꾸지 않는다
 *    (저장할 때 승인이 켜지므로, 미승인을 승인으로 올리는 일이 생기면 안 된다).
 * ⛔ 웹출판은 여기서 누르지 않는다.
 *
 *   node scripts/중부매일-일정1-문화칼럼으로.mjs --몇건 1
 *   node scripts/중부매일-일정1-문화칼럼으로.mjs
 */
import fs from 'node:fs';
import { 한건바꾸기, 오피니언, 외부칼럼, 문화칼럼 } from './중부매일-기자와분류-바꾼다.mjs';

const 상태곳 = 'docs/자국/중부매일-일정1-상태-20261127.json';
const 일지곳 = 'docs/자국/중부매일-일정1-문화칼럼-일지-20261127.json';

const 전부 = JSON.parse(fs.readFileSync(상태곳, 'utf8')).filter((x) => x.할일 === '문화칼럼으로');
const 이미된것 = (s) => s && s.섹션1 === 오피니언 && s.섹션2 === 외부칼럼 && s.연재 === 문화칼럼;
const 일지 = fs.existsSync(일지곳) ? JSON.parse(fs.readFileSync(일지곳, 'utf8')) : [];
const 끝난번호 = new Set(일지.filter((x) => x.된것).map((x) => x.번호));

const 할것 = 전부.filter((x) => x.상태 && x.상태.승인 && !이미된것(x.상태) && !끝난번호.has(x.번호));
const 안할것 = 전부.filter((x) => !x.상태 || !x.상태.승인);
console.log('대상 ' + 전부.length + '건 · 이미 문화칼럼 ' + 전부.filter((x) => 이미된것(x.상태)).length
  + '건 · 일지에 끝난 것 ' + 끝난번호.size + '건 · 승인이 아니라 건너뛰는 것 ' + 안할것.length + '건 · 이번에 할 것 ' + 할것.length + '건');

const 몇건자리 = process.argv.indexOf('--몇건');
const 몇건 = 몇건자리 > 0 ? Number(process.argv[몇건자리 + 1]) : 할것.length;

for (const 줄 of 할것.slice(0, 몇건)) {
  let r;
  try { r = await 한건바꾸기(줄.번호, { 섹션1: 오피니언, 섹션2: 외부칼럼, 연재: 문화칼럼 }); }
  catch (e) { r = { 된것: false, 말: '🔴 ' + String(e.message).slice(0, 80) }; }
  일지.push({ 번호: 줄.번호, 제목: 줄.목록제목, 전: 줄.상태, 된것: !!(r && r.된것), 말: r && r.말, 뒤: r && r.뒤 });
  fs.writeFileSync(일지곳, JSON.stringify(일지, null, 1));
  console.log((r && r.된것 ? '✅ ' : '🔴 ') + 줄.번호 + ' ' + String(줄.목록제목).slice(0, 30) + ' — ' + String(r && r.말).slice(0, 150));
  if (!(r && r.된것)) { console.log('🔴 한 건이 어긋났다 — 여기서 멈춘다'); process.exit(1); }
}
console.log('끝 — 일지 ' + 일지곳);
