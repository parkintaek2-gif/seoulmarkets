#!/usr/bin/env node
/**
 * jb-stat-row-look.mjs — CMS 통계 > 기자별통계에서 한 달을 검색하고, 이름이 주어진 줄의 HTML(링크 포함)을 읽는다. 읽기 전용.
 *   node scripts/jb-stat-row-look.mjs psd0328 2026-01-01 2026-01-31
 */
import { 새탭에서 } from './lib/cdp.mjs';

const [이름, 시작, 끝] = process.argv.slice(2);
await 새탭에서('https://cms.jbnews.com/statistics/authorList.html', async (붙음) => {
  await new Promise((z) => setTimeout(z, 6000));
  await 붙음.보내기('Runtime.evaluate', { expression: `(() => {
    const f = document.forms['form_statistics_search'];
    if (!f) return 'NOFORM';
    f.start_date.value = '${시작}'; f.end_date.value = '${끝}';
    const r = f.querySelector('input[name=sc_date][value=S]'); if (r) r.checked = true;
    f.submit(); return 'OK';
  })()`, returnByValue: true });
  await new Promise((z) => setTimeout(z, 9000));
  const b = await 붙음.보내기('Runtime.evaluate', { expression: `(() => {
    const tr = [...document.querySelectorAll('table tr')].find((x) => [...x.querySelectorAll('td,th')].some((c) => (c.textContent || '').replace(/\\s+/g, ' ').trim() === ${JSON.stringify(이름)}));
    if (!tr) return 'NO ROW; url ' + location.href + ' rows ' + document.querySelectorAll('table tr').length + ' start ' + (document.forms['form_statistics_search'] ? document.forms['form_statistics_search'].start_date.value : '?');
    const 양식 = [...document.forms].map((f) => (f.name || f.id) + ' ' + f.action + ' :: ' + [...f.elements].filter((e) => e.name).map((e) => e.name + '=' + String(e.value).slice(0, 20)).join(' | ')).join('\\n');
    return tr.outerHTML.replace(/\\s+/g, ' ').slice(0, 1800) + '\\nFORMS\\n' + 양식.slice(0, 1200);
  })()`, returnByValue: true });
  console.log(String(b.result.value));
});
