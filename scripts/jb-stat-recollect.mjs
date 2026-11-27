#!/usr/bin/env node
/**
 * jb-stat-recollect.mjs — 중부매일 CMS 통계 > 기자별통계(기준=승인)를 2026년 1~11월 전부 다시 읽는다.
 * 읽기 전용이다. 기사를 고치지 않는다. 결과는 <낼 폴더>/kija_2026MM.tsv 로 적는다.
 * (날마다 도는 jbnews-daily-stat.mjs 는 이번 달과 지난달만 읽는다. 이 파일은 그 폴더를 건드리지 않는다.)
 *
 * 쓰기  node scripts/jb-stat-recollect.mjs <낼 폴더>
 */
import fs from 'node:fs';
import path from 'node:path';
import { 새탭에서 } from './lib/cdp.mjs';

const 낼곳 = process.argv[2];
if (!낼곳) { console.log('낼 폴더를 준다'); process.exit(1); }
fs.mkdirSync(낼곳, { recursive: true });

const 마지막날 = (y, m) => new Date(y, m, 0).getDate();
const 표읽기 = `(() => {
  const 줄 = [];
  document.querySelectorAll('table tr').forEach((tr) => {
    const 칸 = [].slice.call(tr.querySelectorAll('th,td')).map(function (c) {
      return (c.textContent || '').replace(/[ \\t\\n\\r]+/g, ' ').trim();
    });
    if (칸.length) 줄.push(칸.join('\\t'));
  });
  const f = document.forms['form_statistics_search'];
  return JSON.stringify({ url: location.href, 시작: f && f.start_date ? f.start_date.value : '', 끝: f && f.end_date ? f.end_date.value : '', 줄: 줄 });
})()`;

await 새탭에서('https://cms.jbnews.com/statistics/authorList.html', async (붙음) => {
  await new Promise((z) => setTimeout(z, 6000));
  const 어디 = await 붙음.보내기('Runtime.evaluate', { expression: 'location.href', returnByValue: true });
  if (/adminLoginForm/.test(String(어디.result.value))) { console.log('🔴 CMS 로그인 화면이 떴다'); return; }
  for (let m = 1; m <= 11; m += 1) {
    const mm = String(m).padStart(2, '0');
    const 시작 = `2026-${mm}-01`;
    const 끝 = `2026-${mm}-${String(마지막날(2026, m)).padStart(2, '0')}`;
    const 넣고누른다 = `(() => {
      const f = document.forms['form_statistics_search'];
      if (!f) return 'NOFORM';
      if (f.start_date) f.start_date.value = '${시작}';
      if (f.end_date) f.end_date.value = '${끝}';
      const r = f.querySelector('input[name=sc_date][value=S]');
      if (r) r.checked = true;
      f.submit();
      return 'OK';
    })()`;
    const a = await 붙음.보내기('Runtime.evaluate', { expression: 넣고누른다, returnByValue: true });
    if (a.result.value !== 'OK') { console.log(`🔴 ${mm}월 검색 양식을 못 찾았다`); continue; }
    await new Promise((z) => setTimeout(z, 9000));
    const b = await 붙음.보내기('Runtime.evaluate', { expression: 표읽기, returnByValue: true });
    let 쓴것;
    try { 쓴것 = JSON.parse(b.result.value); } catch { console.log(`🔴 ${mm}월 표를 못 읽었다`); continue; }
    /* 화면에 남은 기간이 넣은 기간과 같은지 확인한다. 다르면 그 달은 적지 않는다 */
    if (쓴것.시작 !== 시작 || 쓴것.끝 !== 끝) { console.log(`🔴 ${mm}월 — 화면의 기간(${쓴것.시작}~${쓴것.끝})이 넣은 기간과 다르다. 적지 않는다`); continue; }
    fs.writeFileSync(path.join(낼곳, `kija_2026${mm}.tsv`), (쓴것.줄 || []).join('\n'), 'utf8');
    console.log(`✅ ${mm}월 — ${쓴것.줄.length}줄`);
    await new Promise((z) => setTimeout(z, 3000));
  }
});
