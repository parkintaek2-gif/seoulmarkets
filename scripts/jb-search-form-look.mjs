#!/usr/bin/env node
/**
 * jb-search-form-look.mjs — 중부매일 CMS 기사검색 결과 화면의 검색 양식 항목을 읽는다(읽기 전용).
 * 인자로 질의 문자열을 주면 그 조건으로 articleList.html 을 화면 안에서 받아 건수와 첫 줄들을 적는다.
 *   node scripts/jb-search-form-look.mjs
 *   node scripts/jb-search-form-look.mjs "sc_area=I&sc_word=psd0328&sc_sdate=2026-01-01&sc_edate=2026-01-31"
 */
import { 새탭에서, 자리잡기, 재기 } from './lib/cdp.mjs';

const 질의 = process.argv[2] || '';
const 쉰다 = (ms) => new Promise((r) => setTimeout(r, ms));

await 새탭에서('https://cms.jbnews.com/news/adminSearchForm.html', async (t) => {
  await 자리잡기(t, { 최대: 45000 }); await 쉰다(4000);
  const 양식 = await 재기(t, `(() => {
    const out = [];
    for (const f of document.forms) {
      const 칸 = [...f.elements].filter((e) => e.name && /^sc_/.test(e.name)).map((e) => e.name + '(' + e.tagName + (e.type ? ':' + e.type : '') + ')'
        + (e.tagName === 'SELECT' ? '[' + [...e.options].slice(0, 14).map((o) => o.value + '~' + o.text.trim()).join('/') + ']' : '')
        + (e.type === 'radio' || e.type === 'checkbox' ? '=' + e.value + '~' + ((e.closest('label') || e.parentElement).innerText || '').trim().slice(0, 12) : ''));
      if (칸.length) out.push((f.name || f.id || 'form') + ' ' + f.action + ' :: ' + 칸.join(' | '));
    }
    return location.href + '\\n' + out.join('\\n');
  })()`, 20000);
  console.log(String(양식).slice(0, 3500));
  if (질의) {
    const 결과 = await 재기(t, `(async () => {
      const r = await fetch('./articleList.html?view_type=sm&sc_order_by=E&' + ${JSON.stringify(질의)}, { credentials: 'include' });
      const d = new DOMParser().parseFromString(await r.text(), 'text/html');
      const 건수 = ((d.body ? d.body.textContent : '').match(/전체\\s*([\\d,]+)\\s*건/) || [])[1];
      const 줄 = [...d.querySelectorAll('ul.type2 > li')].filter((li) => li.querySelector('a[href*=idxno]')).slice(0, 5).map((li) => {
        const a = li.querySelector('a[href*=idxno]'); const by = li.querySelector('.byline');
        return ((a.getAttribute('href') || '').match(/idxno=(\\d+)/) || [])[1] + ' ' + (by ? by.textContent.replace(/\\s+/g, ' ').trim() : '');
      });
      return '건수 ' + 건수 + '\\n' + 줄.join('\\n');
    })()`, 30000);
    console.log(String(결과));
  }
});
