#!/usr/bin/env node
/**
 * jb-election-scan.mjs — 2026년 4·5·6월에 「선거」로 분류된 기사를 CMS 기사검색으로 전부 읽는다. ⛔ 읽기만 한다.
 *
 * 사장님 2026-11-27 —
 *   「4, 5, 6월에 <선거>로 분류된 기사가 있어. 모두 보도자료로 바꿔」
 *   「선거 기사는 모든 기사, 기존 분류 무관하고 다 보도자료로 바꿔」
 *
 * 방법: 검색 화면에서 정치(S1N1)의 2차 분류 목록을 읽어 이름이 「선거」인 코드를 찾고,
 *   그 코드로 달마다 검색 결과를 전부 읽는다(쪽마다 0.8초 쉼). 기자 조건은 걸지 않는다.
 *   전체 건수 표기와 읽은 줄 수가 다르면 「건수 어긋남」으로 적는다.
 *
 *   node scripts/jb-election-scan.mjs docs/jb-election-scan-20261127.json
 */
import fs from 'node:fs';
import { 새탭에서, 자리잡기, 재기 } from './lib/cdp.mjs';
import { 검색화면, 서식채우기글, 검색누르기글 } from './중부매일-기사검색.mjs';

const 낼곳 = process.argv[2];
const 쉰다 = (ms) => new Promise((r) => setTimeout(r, ms));
const 달들 = [['2026-04-01', '2026-04-30'], ['2026-05-01', '2026-05-31'], ['2026-06-01', '2026-06-30']];

/* 승인기사 목록의 검색 양식에서 정치의 2차 분류 목록을 읽는다 */
const 이차읽는글 = `(async () => {
  const r = await fetch('./adminArticleIntegrationRecognition2.html?sc_area=RW', { credentials: 'include' });
  const d = new DOMParser().parseFromString(await r.text(), 'text/html');
  return JSON.stringify({ 양식있나: !!d.getElementById('integrationSearchForm') });
})()`;

const 받는글 = (일차, 이차, 부터, 까지) => `(async () => {
  const 쉼 = (ms) => new Promise((r) => setTimeout(r, ms));
  const 바탕 = './articleList.html?sc_section_code=${일차}&sc_sub_section_code=${이차}&sc_serial_code=&sc_area=A&sc_level=&sc_article_type=&sc_view_level='
    + '&sc_sdate=${부터}&sc_edate=${까지}&sc_serial_number=&sc_word=&sc_word2=&sc_andor=OR&sc_order_by=E&view_type=sm&box_idxno=&sc_multi_code=&sc_is_image=&sc_is_movie='
    + '&sc_user_name=&sc_article_source=&sc_send_id=';
  const 읽기 = async (쪽, 전체) => {
    const r = await fetch(바탕 + '&page=' + 쪽 + (전체 === null ? '' : '&total=' + 전체), { credentials: 'include' });
    if (!r.ok) return { 탈: 'HTTP ' + r.status };
    const d = new DOMParser().parseFromString(await r.text(), 'text/html');
    const 건수글 = ((d.body ? d.body.textContent : '').match(/전체\\s*([\\d,]+)\\s*건/) || [])[1];
    const 줄 = [...d.querySelectorAll('ul.type2 > li')].filter((li) => li.querySelector('a[href*=idxno]')).map((li) => {
      const a = li.querySelector('a[href*=idxno]'); const m = (a.getAttribute('href') || '').match(/idxno=(\\d+)/);
      const h = li.querySelector('h4,h3,.titles'); const by = li.querySelector('.byline');
      const 쪼갠 = by ? [...by.children].map((e) => (e.textContent || '').replace(/\\s+/g, ' ').trim()).filter(Boolean) : [];
      return { 번호: m ? m[1] : '', 제목: ((h && h.textContent) || '').replace(/\\s+/g, ' ').trim().slice(0, 80), 섹션: 쪼갠[0] || '', 기자: 쪼갠[1] || '', 날짜: 쪼갠[2] || '' };
    });
    return { 건수: 건수글 === undefined ? null : Number(건수글.replace(/,/g, '')), 줄 };
  };
  const 첫 = await 읽기(1, null);
  if (첫.탈) return JSON.stringify(첫);
  const 모음 = new Map(); for (const o of 첫.줄) if (o.번호) 모음.set(o.번호, o);
  const 전체 = 첫.건수; const 쪽수 = 전체 === null ? 1 : Math.ceil(전체 / 20);
  for (let p = 2; p <= 쪽수; p += 1) {
    await 쉼(800);
    const r = await 읽기(p, 전체);
    if (r.탈) return JSON.stringify({ 탈: r.탈 + ' (' + p + '쪽)', 건수: 전체, 줄: [...모음.values()] });
    for (const o of r.줄) if (o.번호) 모음.set(o.번호, o);
  }
  return JSON.stringify({ 건수: 전체, 줄: [...모음.values()] });
})()`;

await 새탭에서('https://cms.jbnews.com/news/adminArticleIntegrationRecognition2.html?sc_area=RW', async (t) => {
  await 자리잡기(t, { 최대: 45000 }); await 쉰다(3000);
  /* 정치를 골라 2차 목록을 읽는다(검색을 보내지 않는다) */
  const 이차목록 = JSON.parse(String(await 재기(t, `(async () => {
    const f = document.getElementById('integrationSearchForm'); const e = f && f.elements['sc_section_code']; if (!e) return JSON.stringify(null);
    e.value = 'S1N1'; e.dispatchEvent(new Event('change', { bubbles: true })); if (window.jQuery) window.jQuery(e).trigger('change');
    await new Promise((r) => setTimeout(r, 3000));
    return JSON.stringify([...f.elements['sc_sub_section_code'].options].map((o) => ({ 값: o.value, 글: o.textContent.trim() })));
  })()`, 30000)));
  if (!이차목록) { console.log('🔴 2차 분류 목록을 못 읽었다'); return; }
  const 선거 = 이차목록.filter((o) => o.글 === '선거');
  console.log('정치의 2차 분류: ' + 이차목록.filter((o) => o.값).map((o) => o.값 + '=' + o.글).join(' | '));
  if (선거.length !== 1) { console.log('🔴 이름이 「선거」인 2차 분류가 ' + 선거.length + '개다 — 멈춘다'); return; }
  const 결과 = [];
  for (const [부터, 까지] of 달들) {
    let r = null;
    try { r = JSON.parse(String(await 재기(t, 받는글('S1N1', 선거[0].값, 부터, 까지), 900000))); } catch (e) { r = { 탈: '읽기 실패 ' + String(e.message).slice(0, 60) }; }
    const 줄 = r.줄 || [];
    const 어긋남 = !r.탈 && r.건수 !== null && r.건수 !== 줄.length;
    결과.push({ 달: 부터.slice(0, 7), 코드: 선거[0].값, 건수표기: r.건수 ?? null, 읽은줄: 줄.length, 탈: r.탈 || (어긋남 ? '건수 어긋남' : ''), 줄 });
    fs.writeFileSync(낼곳, JSON.stringify(결과));
    const 갈래 = {}; for (const o of 줄) 갈래[o.섹션] = (갈래[o.섹션] || 0) + 1;
    console.log((r.탈 || 어긋남 ? '🔴 ' : '✅ ') + 부터.slice(0, 7) + ' — 선거 검색 ' + (r.건수 ?? '?') + '건 · 읽은 줄 ' + 줄.length + ' · 줄에 보인 분류 ' + JSON.stringify(갈래) + (r.탈 ? ' · ' + r.탈 : ''));
    await 쉰다(1500);
  }
});
