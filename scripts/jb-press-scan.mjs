#!/usr/bin/env node
/**
 * jb-press-scan.mjs — 대상 기자·달마다 CMS 기사검색을 「보도자료 + 기자명 + 그 달」로 실행해
 *   결과 줄을 전부 읽는다. ⛔ 읽기만 한다. 아무것도 저장하지 않는다.
 *
 * 사장님 2026-11-27 —
 *   「cms 내 기사검색 > 검색 카테고리를 보도자료로 지정 + 기자명 입력칸에 기자명 입력 >
 *    검색 결과 중 보도자료 외에 다른 분류명이 있는 것만 찾아서 참조 섹션 중 보도자료 외에 분류는 삭제」
 *   「월 전체기사량이70건이 넘는 데만 검색해서 작업하도록 해...70건 이하는 하지 말고」
 *
 * 방법: 검색 서식으로 첫 검색을 한 번 실행해 결과 화면에 들어간 뒤, 그 화면의 쪽 이동 링크와 같은 형식의 주소를
 *   화면 안에서 받아 읽는다(로그인된 같은 창). 쪽마다 0.8초 쉰다.
 * 전체 건수 표기와 읽은 줄 수가 다르면 그 기자·달을 「어긋남」으로 적는다 — 덜 읽고 다 읽었다고 하지 않는다.
 *
 *   node scripts/jb-press-scan.mjs docs/jb-press-targets-20261127.json docs/jb-press-scan-20261127.json
 */
import fs from 'node:fs';
import { 새탭에서, 자리잡기, 재기 } from './lib/cdp.mjs';
import { 검색화면, 서식채우기글, 검색누르기글 } from './중부매일-기사검색.mjs';

const [대상곳, 낼곳] = process.argv.slice(2);
const { 대상 } = JSON.parse(fs.readFileSync(대상곳, 'utf8'));
const 쉰다 = (ms) => new Promise((r) => setTimeout(r, ms));
const 끝날 = (달) => { const [y, m] = 달.split('-').map(Number); return 달 + '-' + String(new Date(y, m, 0).getDate()).padStart(2, '0'); };
const 이미 = fs.existsSync(낼곳) ? JSON.parse(fs.readFileSync(낼곳, 'utf8')) : [];
const 끝난것 = new Set(이미.filter((x) => !x.탈).map((x) => x.기자 + ' ' + x.달));

/** 화면 안에서 도는 글 — 한 기자·달의 모든 쪽을 받아 줄을 읽는다 */
const 받는글 = (기자, 부터, 까지) => `(async () => {
  const 쉼 = (ms) => new Promise((r) => setTimeout(r, ms));
  const 바탕 = './articleList.html?sc_section_code=S1N31&sc_sub_section_code=&sc_serial_code=&sc_area=A&sc_level=&sc_article_type=&sc_view_level='
    + '&sc_sdate=${부터}&sc_edate=${까지}&sc_serial_number=&sc_word=&sc_word2=&sc_andor=OR&sc_order_by=E&view_type=sm&box_idxno=&sc_multi_code=&sc_is_image=&sc_is_movie='
    + '&sc_user_name=' + encodeURIComponent(${JSON.stringify(기자)}) + '&sc_article_source=&sc_send_id=';
  const 읽기 = async (쪽, 전체) => {
    const r = await fetch(바탕 + '&page=' + 쪽 + (전체 === null ? '' : '&total=' + 전체), { credentials: 'include' });
    if (!r.ok) return { 탈: 'HTTP ' + r.status };
    const d = new DOMParser().parseFromString(await r.text(), 'text/html');
    if (!d.querySelector('#sc_user_name') && !d.querySelector('ul.type2') && /login/i.test(d.title + (d.body ? d.body.innerText.slice(0, 200) : ''))) return { 탈: '로그인 화면' };
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
  const 전체 = 첫.건수;
  const 쪽수 = 전체 === null ? 1 : Math.ceil(전체 / 20);
  for (let p = 2; p <= 쪽수; p += 1) {
    await 쉼(800);
    const r = await 읽기(p, 전체);
    if (r.탈) return JSON.stringify({ 탈: r.탈 + ' (' + p + '쪽)', 건수: 전체, 줄: [...모음.values()] });
    for (const o of r.줄) if (o.번호) 모음.set(o.번호, o);
  }
  return JSON.stringify({ 건수: 전체, 줄: [...모음.values()] });
})()`;

await 새탭에서(검색화면, async (t) => {
  await 자리잡기(t, { 최대: 45000 }); await 쉰다(3000);
  /* 검색 서식으로 한 번 들어가 결과 화면(같은 폴더)에 선다 */
  const 첫대상 = 대상[0];
  await 재기(t, 서식채우기글({ 기자: 첫대상.기자, 섹션: 'S1N31', 부터: 첫대상.달 + '-01', 까지: 끝날(첫대상.달) }), 25000);
  const 눌림 = String(await 재기(t, 검색누르기글, 25000));
  if (눌림 !== '눌렀다') { console.log('🔴 검색을 못 눌렀다 — ' + 눌림); return; }
  await 쉰다(7000); await 자리잡기(t, { 최대: 40000 });

  const 결과 = 이미.filter((x) => !x.탈);
  for (const x of 대상) {
    if (끝난것.has(x.기자 + ' ' + x.달)) continue;
    let r = null;
    try { r = JSON.parse(String(await 재기(t, 받는글(x.기자, x.달 + '-01', 끝날(x.달)), 180000))); } catch (e) { r = { 탈: '읽기 실패 ' + String(e.message).slice(0, 60) }; }
    const 줄 = r.줄 || [];
    const 다른분류 = 줄.filter((o) => o.섹션 !== '보도자료');
    const 어긋남 = !r.탈 && r.건수 !== null && r.건수 !== 줄.length;
    결과.push({ 기자: x.기자, 달: x.달, 엑셀전체: x.전체, 건수표기: r.건수 ?? null, 읽은줄: 줄.length, 탈: r.탈 || (어긋남 ? '건수 어긋남' : ''), 줄 });
    fs.writeFileSync(낼곳, JSON.stringify(결과));
    console.log((r.탈 || 어긋남 ? '🔴 ' : '✅ ') + x.기자 + ' ' + x.달 + ' — 보도자료 검색 ' + (r.건수 ?? '?') + '건 · 읽은 줄 ' + 줄.length + ' · 다른 분류명 ' + 다른분류.length + '건'
      + (다른분류.length ? ' [' + [...new Set(다른분류.map((o) => o.섹션))].join(',') + ']' : '') + (r.탈 ? ' · ' + r.탈 : ''));
    if (r.탈 && /로그인|HTTP 4|HTTP 5/.test(r.탈)) { console.log('🔴 멈춘다 — ' + r.탈); break; }
    await 쉰다(1200);
  }
});
