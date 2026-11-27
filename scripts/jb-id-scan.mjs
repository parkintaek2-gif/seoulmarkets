#!/usr/bin/env node
/**
 * jb-id-scan.mjs — 중부매일 CMS 에서 «계정 아이디»로 쓴 승인 기사를 기간으로 읽는다(통계 화면이 거는 링크와 같은 조건). 읽기 전용.
 *   기자명 검색(sc_user_name)으로는 아이디만 있는 계정(psd0328 등)이 0건으로 나온다 — sc_area=I & sc_word=<아이디> 로 찾는다.
 *   node scripts/jb-id-scan.mjs psd0328 2026-01-01 2026-01-31 docs/jb-psd0328-scan-20261127.json
 */
import fs from 'node:fs';
import { 새탭에서, 자리잡기, 재기 } from './lib/cdp.mjs';

const [아이디, 시작, 끝, 낼곳] = process.argv.slice(2);
const 쉰다 = (ms) => new Promise((r) => setTimeout(r, ms));
const 바탕 = 'https://cms.jbnews.com/news/articleList.html?sc_sdate=' + 시작 + '&sc_edate=' + 끝 + '&sc_recognition=E&sc_area=I&sc_word=' + encodeURIComponent(아이디);

await 새탭에서(바탕, async (t) => {
  await 자리잡기(t, { 최대: 45000 }); await 쉰다(4000);
  const 글 = `(async () => {
    const 쉼 = (ms) => new Promise((r) => setTimeout(r, ms));
    const 읽기 = (d) => [...d.querySelectorAll('ul.type2 > li')].filter((li) => li.querySelector('a[href*=idxno]')).map((li) => {
      const a = li.querySelector('a[href*=idxno]'); const m = (a.getAttribute('href') || '').match(/idxno=(\\d+)/);
      const h = li.querySelector('h4,h3,.titles'); const by = li.querySelector('.byline');
      const 쪼갠 = by ? [...by.children].map((e) => (e.textContent || '').replace(/\\s+/g, ' ').trim()).filter(Boolean) : [];
      return { 번호: m ? m[1] : '', 제목: ((h && h.textContent) || '').replace(/\\s+/g, ' ').trim().slice(0, 90), 섹션: 쪼갠[0] || '', 기자: 쪼갠[1] || '', 날짜: 쪼갠[2] || '' };
    });
    const 건수글 = ((document.body.textContent || '').match(/전체\\s*([\\d,]+)\\s*건/) || [])[1];
    const 전체 = 건수글 === undefined ? null : Number(건수글.replace(/,/g, ''));
    const 모음 = new Map(); for (const o of 읽기(document)) if (o.번호) 모음.set(o.번호, o);
    const 쪽수 = 전체 === null ? 1 : Math.ceil(전체 / 20);
    for (let p = 2; p <= 쪽수; p += 1) {
      await 쉼(800);
      const r = await fetch(${JSON.stringify(바탕)} + '&page=' + p + '&total=' + 전체, { credentials: 'include' });
      if (!r.ok) return JSON.stringify({ 탈: 'HTTP ' + r.status, 건수: 전체, 줄: [...모음.values()] });
      const d = new DOMParser().parseFromString(await r.text(), 'text/html');
      for (const o of 읽기(d)) if (o.번호) 모음.set(o.번호, o);
    }
    return JSON.stringify({ 주소: location.href, 건수: 전체, 줄: [...모음.values()] });
  })()`;
  const r = JSON.parse(String(await 재기(t, 글, 120000)));
  fs.writeFileSync(낼곳, JSON.stringify({ 아이디, 시작, 끝, ...r }, null, 1));
  console.log((r.탈 ? '🔴 ' + r.탈 + ' · ' : '') + '전체 표기 ' + r.건수 + '건 · 읽은 줄 ' + r.줄.length);
});
