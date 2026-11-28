#!/usr/bin/env node
/**
 * jb-sheet-daily.mjs — 구글 시트 「중부매일 뉴미디어국」 첫 시트 <기사-보도자료> 에
 *   기자별 «전체 기사건수»와 «보도자료 건수»를 날마다 넣는다.
 *
 * 사장님 2026-11-28 —
 *   「첫번째 시트 <기사-보도자료>에 매일 오전 1시에 전날 기자별 전체 기사건수, 보도자료 건수 데이터를 업데이트해」
 *   「기사분류, 기자명이 바뀌면 데이터를 수정하도록 해」
 *
 * 무엇을 넣나
 *   · 그 달 1일부터 «전날»까지의 누계를 그 달 열에 넣는다 (D = 11월, E = 12월. 머리글을 읽어 정한다)
 *   · 전체     = CMS 통계 > 기자별통계(기준=승인)의 승인 건수
 *   · 보도자료 = CMS 기사검색(보도자료 S1N31 + 기자명 + 기간)의 「전체 N건」
 *   · 기사분류·기자명이 바뀌면 지난 달 값도 달라지므로, 시트에 있는 달 열(끝난 달 포함)을 날마다 전부 다시 잰다
 *
 * 지키는 것
 *   ⛔ CMS 는 읽기만 한다. 아무것도 저장하지 않는다.
 *   ⛔ 시트는 달 열의 숫자 칸만 고친다. 기자명·순서·서식·다른 시트는 건드리지 않는다.
 *   ⛔ 재지 못한 칸에는 새 숫자를 쓰지 않고 있던 값을 그대로 둔다.
 *   ⛔ 비어 있던 칸에 잰 값이 0 이면 빈 채로 둔다 (사장님 시트의 모양을 바꾸지 않는다).
 *   ⛔ 시트에 없는 기자가 통계에 나와도 줄을 더하지 않는다. 기록에 적어 메일로 알린다.
 *   ✅ 넣은 뒤 시트를 다시 읽어 넣으려던 값과 같은지, A~C 열이 그대로인지 확인한다.
 *
 * 쓰는 법
 *   node scripts/jb-sheet-daily.mjs --잰다          재기만 한다 (시트에 쓰지 않는다)
 *   node scripts/jb-sheet-daily.mjs --넣는다        재고 시트에 넣고 확인한다
 *   node scripts/jb-sheet-daily.mjs --자리시험      시트에서 D2 로 가서 이름 상자와 수식 줄만 읽는다 (쓰지 않는다)
 *   node scripts/jb-sheet-daily.mjs --쓰기시험      D2 에 «지금 들어 있는 값»을 그대로 다시 넣어 입력 방식만 시험한다
 * 끝값: 0 = 다 됐다 · 1 = 재지 못했거나 시트가 어긋났다 (기록 파일의 「탈」을 본다)
 */
import fs from 'node:fs';
import path from 'node:path';
import { 새탭에서, 자리잡기, 재기 } from './lib/cdp.mjs';
import { 검색화면, 서식채우기글, 검색누르기글 } from './중부매일-기사검색.mjs';
import { 시트손 } from './lib/gs-type.mjs';

const 시트id = '18rEcErHG_PyVPy94ycAqSFLwXcXxtl-FXCoJkQ9tWpA';
const 시트gid = '1747466165';
const 시트이름 = '기사-보도자료';
const 곳간 = 'docs/자국/중부매일-시트-일일';
const 쉰다 = (ms) => new Promise((r) => setTimeout(r, ms));
const 두자 = (n) => String(n).padStart(2, '0');
const 날글 = (d) => d.getFullYear() + '-' + 두자(d.getMonth() + 1) + '-' + 두자(d.getDate());
const 열글자 = (i) => String.fromCharCode(65 + i);

/* ── 날짜: 이 PC 가 KST 다 ── */
const 지금 = new Date();
const 전날 = new Date(지금.getFullYear(), 지금.getMonth(), 지금.getDate() - 1);

/** 달 열 하나의 기간 — 그 달 1일부터, 끝난 달이면 말일까지 · 전날이 든 달이면 전날까지 · 아직 안 온 달이면 null */
export function 기간(해, 달, 기준 = 전날) {
  const 첫 = new Date(해, 달 - 1, 1); const 말 = new Date(해, 달, 0);
  if (기준 < 첫) return null;
  const 끝 = 기준 < 말 ? 기준 : 말;
  return { 부터: 날글(첫), 까지: 날글(끝) };
}

/* ── CMS 통계 > 기자별통계 (읽기 전용) ── */
async function 통계읽는다(기간들) {
  const 표읽기 = `(() => { const 줄 = []; document.querySelectorAll('table tr').forEach((tr) => { const 칸 = [].slice.call(tr.querySelectorAll('th,td')).map(function (c) { return (c.textContent || '').replace(/[ \\t\\n\\r]+/g, ' ').trim(); }); if (칸.length) 줄.push(칸); });
    const f = document.forms['form_statistics_search']; return JSON.stringify({ 시작: f && f.start_date ? f.start_date.value : '', 끝: f && f.end_date ? f.end_date.value : '', 줄: 줄 }); })()`;
  const 낸것 = {};
  await 새탭에서('https://cms.jbnews.com/statistics/authorList.html', async (c) => {
    await 쉰다(6000);
    if (/adminLoginForm/.test(String(await 재기(c, 'location.href', 20000)))) { for (const k of Object.keys(기간들)) 낸것[k] = { 탈: 'CMS 로그인 화면이 떴다' }; return; }
    for (const [k, g] of Object.entries(기간들)) {
      const a = String(await 재기(c, `(() => { const f = document.forms['form_statistics_search']; if (!f) return 'NOFORM'; f.start_date.value = '${g.부터}'; f.end_date.value = '${g.까지}'; const r = f.querySelector('input[name=sc_date][value=S]'); if (r) r.checked = true; f.submit(); return 'OK'; })()`, 20000));
      if (a !== 'OK') { 낸것[k] = { 탈: '통계 검색 양식을 못 찾았다' }; continue; }
      await 쉰다(9000);
      let t; try { t = JSON.parse(String(await 재기(c, 표읽기, 30000))); } catch { 낸것[k] = { 탈: '통계 표를 못 읽었다' }; continue; }
      if (t.시작 !== g.부터 || t.끝 !== g.까지) { 낸것[k] = { 탈: '화면의 기간(' + t.시작 + '~' + t.끝 + ')이 넣은 기간과 다르다' }; continue; }
      const 사람 = {};
      for (const p of t.줄) { if (p.length >= 4 && /^[0-9]+$/.test(p[0]) && p[1]) { const n = Number(String(p[3]).replace(/,/g, '')); if (Number.isFinite(n)) 사람[p[1]] = n; } }
      낸것[k] = Object.keys(사람).length ? { 사람 } : { 탈: '통계 표에 사람 줄이 없다' };
      await 쉰다(3000);
    }
  });
  return 낸것;
}

/* ── CMS 기사검색: 보도자료 + 기자명 + 기간 의 「전체 N건」 (읽기 전용) ── */
async function 보도자료센다(기자들, 기간들) {
  const 낸것 = {}; for (const k of Object.keys(기간들)) 낸것[k] = {};
  const 글 = (기자, g) => `(async () => {
    const u = './articleList.html?sc_section_code=S1N31&sc_sub_section_code=&sc_serial_code=&sc_area=A&sc_level=&sc_article_type=&sc_view_level=&sc_sdate=${g.부터}&sc_edate=${g.까지}&sc_serial_number=&sc_word=&sc_word2=&sc_andor=OR&sc_order_by=E&view_type=sm&box_idxno=&sc_multi_code=&sc_is_image=&sc_is_movie=&sc_user_name=' + encodeURIComponent(${JSON.stringify(기자)}) + '&sc_article_source=&sc_send_id=&page=1';
    const r = await fetch(u, { credentials: 'include' }); if (!r.ok) return JSON.stringify({ 탈: 'HTTP ' + r.status });
    const d = new DOMParser().parseFromString(await r.text(), 'text/html');
    const 글자 = d.body ? d.body.textContent : '';
    const m = 글자.match(/전체\\s*([\\d,]+)\\s*건/);
    const 줄 = d.querySelectorAll('ul.type2 > li a[href*=idxno]').length;
    const 양식 = !!d.querySelector('#sc_user_name, [name=sc_user_name]');
    return JSON.stringify({ 건수: m ? Number(m[1].replace(/,/g, '')) : null, 줄, 양식 });
  })()`;
  await 새탭에서(검색화면, async (c) => {
    await 자리잡기(c, { 최대: 45000 }); await 쉰다(3000);
    const 첫 = Object.values(기간들)[0];
    await 재기(c, 서식채우기글({ 기자: 기자들[0], 섹션: 'S1N31', 부터: 첫.부터, 까지: 첫.까지 }), 25000);
    const 눌림 = String(await 재기(c, 검색누르기글, 25000));
    if (눌림 !== '눌렀다') { for (const k of Object.keys(기간들)) for (const 기자 of 기자들) 낸것[k][기자] = { 탈: '검색을 못 눌렀다' }; return; }
    await 쉰다(7000); await 자리잡기(c, { 최대: 40000 });
    for (const [k, g] of Object.entries(기간들)) {
      for (const 기자 of 기자들) {
        let r; try { r = JSON.parse(String(await 재기(c, 글(기자, g), 40000))); } catch (e) { r = { 탈: String(e.message).slice(0, 60) }; }
        if (!r.탈 && r.건수 === null) r.탈 = '「전체 N건」 표기를 못 읽었다 (줄 ' + r.줄 + ' · 양식 ' + r.양식 + ')';
        낸것[k][기자] = r;
        await 쉰다(900);
      }
    }
  });
  return 낸것;
}

/* ── 시트 구조 (2026-11-28 사장님 지시로 바뀜) ──────────────────────────────
 *   기자 한 명이 한 줄이다. 머리글: A 번호 | B 기자명 | 「N월 전체」 | 「N월 보도자료」 | 「N월 일반」 | …
 *   「N월 일반」은 계산식(전체 − 보도자료)이다. 이 도구는 그 칸을 건드리지 않는다.
 *   머리글의 정렬 버튼으로 줄 순서가 바뀌므로, 줄 번호를 기억하지 않고 실행할 때마다 기자명으로 줄을 찾는다.
 */
async function 시트읽는다() {
  return 새탭에서('https://docs.google.com/spreadsheets/d/' + 시트id + '/gviz/tq?tqx=out:html&headers=0&sheet=' + encodeURIComponent(시트이름), async (c) => {
    await 자리잡기(c, { 최대: 60000 }); await 쉰다(3000);
    return JSON.parse(String(await 재기(c, `(() => JSON.stringify([...document.querySelectorAll('table tr')].map((tr) => [...tr.children].map((td) => td.textContent.trim()))))()`, 60000)));
  });
}

/** 읽은 표에서 기자 줄을 찾는다. rows[r] 이 시트의 r 번째 줄이다(rows[0] 은 표의 빈 머리줄, rows[1] 이 머리글). */
export function 짜임(rows) {
  if (!rows[1] || rows[1][1] !== '기자명') return { 탈: '머리글 줄(B1 = 기자명)을 못 찾았다' };
  const 기자들 = [];
  for (let r = 2; r < rows.length; r += 1) {
    if (rows[r][1] === '합계') break;
    if (!rows[r][1]) return { 탈: r + '줄에 기자명이 없다 — 시트 구조가 달라졌다' };
    기자들.push({ 기자: rows[r][1], 줄: r });
  }
  if (new Set(기자들.map((x) => x.기자)).size !== 기자들.length) return { 탈: '같은 기자명이 두 줄 있다' };
  return { 기자들 };
}

/** 머리글을 화면에서 읽어 달 열을 찾는다 — 「11월 전체」「11월 보도자료」 꼴. (표 읽기는 숫자 열의 머리글을 비워 준다) */
async function 머리글읽는다() {
  const 낸것 = { 열: [], 탈: '' };
  await 새탭에서('https://docs.google.com/spreadsheets/d/' + 시트id + '/edit#gid=' + 시트gid, async (c) => {
    const h = 시트손(c);
    await 자리잡기(c, { 최대: 60000 }); await 쉰다(7000);
    await c.보내기('Page.bringToFront', {}).catch(() => {});
    for (let i = 2; i < 40; i += 1) {
      const 열 = i < 26 ? String.fromCharCode(65 + i) : 'A' + String.fromCharCode(65 + i - 26);
      const s = await h.go(열 + '1');
      if (s.tab !== 시트이름 || s.box !== 열 + '1') { 낸것.탈 = 열 + '1 로 가지 못했다 (' + s.tab + ' ' + s.box + ')'; return; }
      if (!s.bar) break;
      const m = s.bar.match(/^(\d{1,2})월\s*(전체|보도자료|일반)$/);
      낸것.열.push({ 열, 표칸: i, 머리: s.bar, 달: m ? Number(m[1]) : null, 갈래: m ? m[2] : null });
    }
  });
  return 낸것;
}

/** 칸 하나에 값을 넣고 그 칸을 다시 읽어 확인한다 */
async function 시트에넣는다(넣을것들) {
  const 말 = [];
  await 새탭에서('https://docs.google.com/spreadsheets/d/' + 시트id + '/edit#gid=' + 시트gid, async (c) => {
    const h = 시트손(c);
    await 자리잡기(c, { 최대: 60000 }); await 쉰다(7000);
    await c.보내기('Page.bringToFront', {}).catch(() => {});
    for (const x of 넣을것들) {
      /* 넣기 직전에 그 줄의 기자명을 다시 본다 — 그 사이 누가 정렬 버튼을 눌렀으면 줄이 바뀌었을 수 있다 */
      const 이름칸 = await h.go('B' + x.줄);
      if (이름칸.tab !== 시트이름 || 이름칸.bar !== x.기자) { 말.push('🔴 ' + x.칸 + ' — B' + x.줄 + ' 이 ' + x.기자 + ' 가 아니다(' + 이름칸.bar + '). 넣지 않았다'); continue; }
      const r = await h.typeDown(x.열, x.줄, [x.값], 시트이름);
      const 뒤 = await h.go(x.칸);
      const 맞다 = r.ok && 뒤.bar === String(x.값);
      말.push((맞다 ? '✔ ' : '🔴 ') + x.칸 + ' ' + x.기자 + ' ' + x.머리 + ' ' + x.있던 + ' → ' + x.값 + (맞다 ? '' : ' · 지금 ' + 뒤.bar + (r.why ? ' · ' + r.why : '')));
    }
    await 쉰다(5000);   /* 구글이 저장할 시간 */
  });
  return 말;
}

/* ── 자가 실행 ── */
const 인자 = (n) => process.argv.includes(n);
if (!인자('--잰다') && !인자('--넣는다')) { console.log('--잰다 또는 --넣는다 를 준다'); process.exit(1); }

fs.mkdirSync(곳간, { recursive: true });
const 기록 = { 잰때: 날글(지금) + ' ' + 두자(지금.getHours()) + ':' + 두자(지금.getMinutes()), 전날: 날글(전날), 탈: [], 알림: [] };
const 기록곳 = path.join(곳간, 날글(지금) + '.json');
const 끝낸다 = (끝값) => { fs.writeFileSync(기록곳, JSON.stringify(기록, null, 1)); console.log('기록 ' + 기록곳 + ' · 탈 ' + 기록.탈.length + ' · 알림 ' + 기록.알림.length); process.exit(끝값); };

const 전표 = await 시트읽는다();
const 짬 = 짜임(전표);
if (짬.탈) { 기록.탈.push(짬.탈); 끝낸다(1); }
const 머리 = await 머리글읽는다();
if (머리.탈) { 기록.탈.push(머리.탈); 끝낸다(1); }
const 달열 = 머리.열.filter((x) => x.달 && (x.갈래 === '전체' || x.갈래 === '보도자료'));
const 해 = 전날.getFullYear();
const 기간들 = {};
for (const d of 달열) { const g = 기간(해, d.달); if (g) 기간들[d.달] = g; }
기록.기간 = 기간들; 기록.머리글 = 머리.열.map((x) => x.열 + '=' + x.머리);
console.log('기자 ' + 짬.기자들.length + '명 · 머리글 ' + 기록.머리글.join(' ') + ' · 재는 기간 ' + JSON.stringify(기간들));
if (!Object.keys(기간들).length) { 기록.탈.push('잴 달 열이 없다'); 끝낸다(1); }

const 통계 = await 통계읽는다(기간들);
const 보도 = await 보도자료센다(짬.기자들.map((x) => x.기자), 기간들);

const 넣을것들 = []; 기록.칸 = [];
for (const d of 달열) {
  if (!기간들[d.달]) continue;
  const st = 통계[d.달];
  if (d.갈래 === '전체' && st.탈) 기록.탈.push(d.달 + '월 전체 건수를 재지 못했다 — ' + st.탈);
  for (const 사람 of 짬.기자들) {
    const 있던 = (전표[사람.줄][d.표칸] || '');
    let 잰 = null;
    if (d.갈래 === '전체') 잰 = st.탈 ? null : (사람.기자 in st.사람 ? st.사람[사람.기자] : 0);
    else { const b = 보도[d.달][사람.기자]; if (b && !b.탈) 잰 = b.건수; else 기록.탈.push(d.달 + '월 ' + 사람.기자 + ' 보도자료를 재지 못했다 — ' + (b ? b.탈 : '결과 없음')); }
    /* 재지 못했으면 그대로 · 같으면 그대로 · 비어 있던 칸에 0 이면 빈 채로 */
    const 넣는다 = !(잰 === null || String(잰) === 있던 || (있던 === '' && 잰 === 0));
    기록.칸.push({ 칸: d.열 + 사람.줄, 기자: 사람.기자, 머리: d.머리, 있던, 잰, 넣는다 });
    if (넣는다) 넣을것들.push({ 칸: d.열 + 사람.줄, 열: d.열, 줄: 사람.줄, 기자: 사람.기자, 머리: d.머리, 있던, 값: 잰 });
  }
  if (d.갈래 === '전체' && !st.탈) for (const 이름 of Object.keys(st.사람)) if (!짬.기자들.some((x) => x.기자 === 이름) && !/^[a-zA-Z0-9_.]+$/.test(이름) && 이름 !== '중부매일') 기록.알림.push(d.달 + '월 시트에 없는 기자: ' + 이름 + ' ' + st.사람[이름] + '건');
}
/* 보도자료가 전체보다 많은 칸은 알린다 (일반이 음수가 된다) */
for (const 사람 of 짬.기자들) for (const 달 of Object.keys(기간들)) {
  const a = 기록.칸.find((k) => k.기자 === 사람.기자 && k.머리 === 달 + '월 전체'); const b = 기록.칸.find((k) => k.기자 === 사람.기자 && k.머리 === 달 + '월 보도자료');
  if (a && b && a.잰 !== null && b.잰 !== null && b.잰 > a.잰) 기록.알림.push(달 + '월 ' + 사람.기자 + ': 보도자료(' + b.잰 + ')가 전체(' + a.잰 + ')보다 많다');
}
for (const k of 기록.칸) if (k.넣는다 || k.잰 === null) console.log([k.칸, k.기자, k.머리, k.있던 + ' → ' + (k.잰 === null ? '못 잼' : k.잰)].join(' | '));
console.log('잰 칸 ' + 기록.칸.length + '개 · 바뀔 칸 ' + 넣을것들.length + '개');
for (const t of 기록.탈) console.log('🔴 ' + t);
for (const t of 기록.알림) console.log('⚠ ' + t);
if (인자('--잰다')) 끝낸다(기록.탈.length ? 1 : 0);

if (넣을것들.length) {
  기록.넣은말 = await 시트에넣는다(넣을것들);
  for (const t of 기록.넣은말) { console.log(t); if (t.startsWith('🔴')) 기록.탈.push(t); }
  await 쉰다(6000);
  /* 다시 읽어 기자명으로 대조한다 (그 사이 정렬이 바뀌어도 맞게 본다) */
  const 뒤표 = await 시트읽는다(); const 뒤짬 = 짜임(뒤표);
  let 어긋남 = 0;
  if (뒤짬.탈) { 기록.탈.push('넣은 뒤 시트를 다시 읽지 못했다 — ' + 뒤짬.탈); 어긋남 += 1; }
  else {
    if (뒤짬.기자들.length !== 짬.기자들.length) { 어긋남 += 1; 기록.탈.push('기자 줄 수가 달라졌다 — ' + 짬.기자들.length + ' → ' + 뒤짬.기자들.length); }
    for (const k of 기록.칸) {
      const 줄 = (뒤짬.기자들.find((x) => x.기자 === k.기자) || {}).줄; const 표칸 = 머리.열.find((x) => x.머리 === k.머리).표칸;
      const 지금값 = 줄 ? (뒤표[줄][표칸] || '') : null; const 기대 = k.넣는다 ? String(k.잰) : k.있던;
      if (지금값 !== 기대) { 어긋남 += 1; 기록.탈.push(k.기자 + ' ' + k.머리 + ' 칸이 기대와 다르다 — 기대 ' + 기대 + ' · 지금 ' + 지금값); }
    }
    for (const 사람 of 짬.기자들) { const 줄 = (뒤짬.기자들.find((x) => x.기자 === 사람.기자) || {}).줄; if (!줄 || 뒤표[줄][0] !== 전표[사람.줄][0]) { 어긋남 += 1; 기록.탈.push(사람.기자 + ' 의 번호가 달라졌다'); } }
  }
  console.log(어긋남 ? '🔴 다시 읽어 보니 ' + 어긋남 + '곳이 어긋난다' : '✅ 다시 읽어 확인했다 — 넣은 값이 모두 맞고 기자명·번호는 그대로다');
} else console.log('바뀔 칸이 없어 시트에 쓰지 않았다');
끝낸다(기록.탈.length ? 1 : 0);
