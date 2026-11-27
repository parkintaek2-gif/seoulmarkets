#!/usr/bin/env node
/**
 * check-klifemap-foreign-hangul.mjs — 케이라이프맵 외국어 주소(en·zh·ja)에 한국어 글자가 얼마나 남았는지 잰다. 읽기만 한다.
 *
 * 주소 목록은 라이브 https://klifemap.ai/sitemap-lang.xml 에서 받는다(2026-11-27 신설, 언어마다 54개).
 * 화면에 보이는 글(script·style 을 뺀 본문)에서 한글 글자 수를 세어 많은 순으로 적는다.
 * 약관·개인정보처럼 한국어 원문을 일부러 둔 화면도 그대로 나온다 — 고칠지 말지는 사람이 본다.
 *
 *   node scripts/check-klifemap-foreign-hangul.mjs            (셋 다)
 *   node scripts/check-klifemap-foreign-hangul.mjs ja         (한 언어)
 *   node scripts/check-klifemap-foreign-hangul.mjs ja --min 20   (한글 20자 이상만)
 */
const 말들 = process.argv.slice(2).filter((a) => /^(en|zh|ja)$/.test(a));
const 최소자리 = process.argv.indexOf('--min');
const 최소 = 최소자리 > 0 ? Number(process.argv[최소자리 + 1]) : 1;
const 받기 = async (u) => (await fetch(u, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; bingbot/2.0)' } })).text();
const 본문만 = (h) => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/g, ' ');

const 지도 = await 받기('https://klifemap.ai/sitemap-lang.xml');
const 주소들 = [...지도.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, '&'));
let 합 = 0;
for (const 말 of (말들.length ? 말들 : ['en', 'zh', 'ja'])) {
  const 내것 = 주소들.filter((u) => u.includes('lang=' + 말) || u.includes('/' + 말 + '-1.html'));
  const 줄 = [];
  for (const u of 내것) {
    try {
      const 글 = 본문만(await 받기(u));
      const 한글 = 글.match(/[가-힣]+/g) || [];
      const 자수 = 한글.join('').length;
      if (자수 >= 최소) 줄.push({ u: u.replace('https://klifemap.ai', ''), 자수, 보기: [...new Set(한글)].slice(0, 8).join(' ') });
    } catch (e) { 줄.push({ u, 자수: -1, 보기: '못 읽음' }); }
  }
  줄.sort((a, b) => b.자수 - a.자수);
  const 말합 = 줄.reduce((s, x) => s + Math.max(0, x.자수), 0);
  합 += 말합;
  console.log('■ ' + 말 + ' — 주소 ' + 내것.length + '개 · 한글이 남은 주소 ' + 줄.length + '개 · 한글 ' + 말합 + '자');
  for (const x of 줄) console.log('   ' + String(x.자수).padStart(5) + '자  ' + x.u + '  — ' + x.보기);
}
console.log('합계 한글 ' + 합 + '자');
