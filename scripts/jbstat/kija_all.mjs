// 중부매일 CMS 기자별통계 - 올해 달마다 한 번씩, 한 탭에서 차례로 거둔다.
// 빠르게 많이 두드리면 또 끊긴다(2026-11-24 403). 조회 사이에 간격을 둔다.
import fs from 'fs';
import { 새탭에서 } from 'file:///C:/Users/User/Documents/GitHub/dataeconomics/scripts/lib/cdp.mjs';

const 올해 = 2026;
const 끝달 = Number(process.argv[2] || 11);
const 마지막날 = (y, m) => new Date(y, m, 0).getDate();

const 표읽기 = `(() => {
  const 줄 = [];
  document.querySelectorAll('table tr').forEach((tr) => {
    const 칸 = [].slice.call(tr.querySelectorAll('th,td')).map(function (c) {
      return (c.textContent || '').replace(/[ 	\\n\\r]+/g, ' ').trim();
    });
    if (칸.length) 줄.push(칸.join('\\t'));
  });
  return JSON.stringify({ url: location.href, 줄: 줄 });
})()`;

await 새탭에서('https://cms.jbnews.com/statistics/authorList.html', async (붙음) => {
  await new Promise((z) => setTimeout(z, 6000));
  for (let m = 1; m <= 끝달; m += 1) {
    const mm = String(m).padStart(2, '0');
    const 시작 = `${올해}-${mm}-01`;
    const 끝 = `${올해}-${mm}-${String(마지막날(올해, m)).padStart(2, '0')}`;
    const 파일 = `kija_${올해}${mm}.tsv`;
    if (fs.existsSync(파일) && fs.readFileSync(파일, 'utf8').trim()) {
      console.log(`skip ${mm}월 — 이미 있다`);
      continue;
    }
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
    if (a.result.value !== 'OK') { console.log(`${mm}월 탈 — ${a.result.value}`); continue; }
    await new Promise((z) => setTimeout(z, 9000));
    const b = await 붙음.보내기('Runtime.evaluate', { expression: 표읽기, returnByValue: true });
    let 쓴것;
    try { 쓴것 = JSON.parse(b.result.value); } catch (e) { console.log(`${mm}월 못 읽었다`); continue; }
    const 사람줄 = (쓴것.줄 || []).filter((l) => /^[0-9]+\t/.test(l));
    fs.writeFileSync(파일, (쓴것.줄 || []).join('\n'), 'utf8');
    console.log(`${mm}월  기자 ${사람줄.length}명  →  ${파일}`);
    await new Promise((z) => setTimeout(z, 4000));   /* 두드리는 사이를 벌린다 */
  }
});
console.log('ALL DONE');
