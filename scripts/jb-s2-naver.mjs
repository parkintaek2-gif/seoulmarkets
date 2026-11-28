#!/usr/bin/env node
// jb-s2-naver.mjs — READ ONLY. Search Naver (news tab and web tab) by the title of schedule-2 articles and print
// whether the jbnews article shows up, with which link. No CMS access, no browser.
//   node scripts/jb-s2-naver.mjs <article number> ...
import fs from 'node:fs';
const rows = JSON.parse(fs.readFileSync('docs/자국/중부매일-일정2-검수-20261128.json', 'utf8'));
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const get = async (u) => { const r = await fetch(u, { headers: { 'User-Agent': UA, 'Accept-Language': 'ko-KR,ko;q=0.9' } }); return { status: r.status, text: await r.text() }; };
const strip = (s) => s.replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();

for (const n of process.argv.slice(2)) {
  const row = rows.find((x) => x.번호 === n);
  if (!row || !row.뒤) { console.log(n + ' — not in the verification file'); continue; }
  const title = row.뒤.제목.replace(/^\[[^\]]*\]\s*/, '');
  const now = [row.뒤.섹션1글, row.뒤.섹션2글, row.뒤.연재글].join(' > ');
  console.log('\n== ' + n + ' | ' + row.뒤.기자명 + ' | CMS: ' + now + '\n   ' + row.뒤.제목);
  for (const [name, where] of [['news', 'news'], ['web', 'nexearch']]) {
    const u = 'https://search.naver.com/search.naver?where=' + where + '&query=' + encodeURIComponent('"' + title + '" 중부매일');
    let res;
    try { res = await get(u); } catch (e) { console.log('   ' + name + ': fetch failed ' + String(e.message).slice(0, 60)); continue; }
    const t = res.text;
    const direct = new Set([...t.matchAll(/https?:\/\/www\.jbnews\.com\/news\/articleView\.html\?idxno=(\d+)/g)].map((m) => m[1]));
    const naverNews = new Set([...t.matchAll(/https?:\/\/n\.news\.naver\.com\/(?:mnews\/)?article\/\d+\/\d+/g)].map((m) => m[0]));
    const hasTitle = strip(t).includes(title.slice(0, 14));
    console.log('   ' + name + ': http ' + res.status + ' · bytes ' + t.length + ' · this article link ' + (direct.has(n) ? 'YES' : 'no')
      + ' · other jbnews links ' + [...direct].filter((x) => x !== n).length + ' · naver-hosted links ' + naverNews.size + ' · title text on page ' + (hasTitle ? 'YES' : 'no'));
    await wait(1500);
  }
}
