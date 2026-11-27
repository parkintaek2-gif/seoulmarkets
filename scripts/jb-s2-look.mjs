#!/usr/bin/env node
// jb-s2-look.mjs — READ ONLY. Print state and the exposure-time field details for the given article numbers.
import { 새탭에서, 자리잡기, 재기 } from './lib/cdp.mjs';
import { 서식주소, 상태글 } from './중부매일-기자와분류-바꾼다.mjs';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const field = `(() => { const e = document.querySelector('#embargo_time'); if (!e) return 'no field';
  const o = e.tagName === 'SELECT' ? [...e.options].map((x) => x.value).slice(0, 30).join(',') : '';
  const reg = [...document.querySelectorAll('input')].filter((i) => /date|time|regist|create|modify/i.test(i.name + i.id)).map((i) => i.name + '#' + i.id + '=' + i.value).join(' | ');
  return JSON.stringify({ tag: e.tagName, type: e.type, step: e.getAttribute('step'), attr: e.getAttribute('value'), value: e.value, options: o, others: reg }); })()`;
for (const n of process.argv.slice(2)) {
  const r = await 새탭에서(서식주소(n), async (c) => {
    await 자리잡기(c, { 최대: 45000 });
    await wait(4000);
    return [String(await 재기(c, 상태글, 25000)), String(await 재기(c, field, 25000))];
  });
  console.log(n + '\n ' + r[0] + '\n ' + r[1]);
}
