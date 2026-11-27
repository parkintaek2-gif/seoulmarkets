#!/usr/bin/env node
// jb-s2-probe.mjs — NO SAVE. Opens the edit form, picks the sections in the form only, and prints the exposure time
// at each step to find which step changes it. The tab is closed without saving.
import { 새탭에서, 자리잡기, 재기 } from './lib/cdp.mjs';
import { 서식주소, 골라넣기글, 승인고르기글, 오피니언, 외부칼럼, 문화칼럼 } from './중부매일-기자와분류-바꾼다.mjs';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const t = `(() => { const e = document.querySelector('#embargo_time'); const d = document.querySelector('#embargo_date'); return (d && d.value) + ' ' + (e && e.value) + ' attr=' + (e && e.getAttribute('value')) + ' cls=' + (e && e.className) + ' ro=' + (e && e.readOnly); })()`;
for (const n of process.argv.slice(2)) {
  await 새탭에서(서식주소(n), async (c) => {
    c.듣기('Page.javascriptDialogOpening', () => { c.보내기('Page.handleJavaScriptDialog', { accept: true }).catch(() => {}); });
    await 자리잡기(c, { 최대: 45000 });
    await wait(1000); console.log(n + ' load+1s   ' + await 재기(c, t, 20000));
    await wait(3000); console.log(n + ' load+4s   ' + await 재기(c, t, 20000));
    await 재기(c, 골라넣기글('#sectionCode', 오피니언), 25000); await wait(3000);
    console.log(n + ' section1  ' + await 재기(c, t, 20000));
    await 재기(c, 골라넣기글('#subSectionCode', 외부칼럼), 25000); await wait(2500);
    console.log(n + ' section2  ' + await 재기(c, t, 20000));
    await 재기(c, 골라넣기글('#serialCode', 문화칼럼), 25000); await wait(1500);
    console.log(n + ' serial    ' + await 재기(c, t, 20000));
    await 재기(c, 승인고르기글, 25000); await wait(1500);
    console.log(n + ' approve   ' + await 재기(c, t, 20000));
  });
}
