#!/usr/bin/env node
/**
 * jb-press-fix.mjs — 보도자료 검색에 «다른 분류명»으로 보인 기사를 **보도자료 하나**로만 분류되게 고친다.
 *
 * 사장님 2026-11-27 —
 *   「대상 기사가 참조섹션이 있으면 그것만 지우고, 1차 분류 보도자료 하나만 남겨」
 *   「검색 결과 중 보도자료 외에 다른 분류명이 있는 것만 찾아서 참조 섹션 중 보도자료 외에 분류는 삭제」
 *
 * 한 건마다 —
 *   ① 수정 화면을 열어 지금 분류·참조섹션·승인·노출시간·제목·기자를 읽는다
 *   ② 참조섹션 줄을 전부 지운다(「삭제」 단추)
 *   ③ 1차 분류를 보도자료(S1N31)로 고른다
 *   ④ 승인이던 기사만 승인을 다시 고르고 저장한다 — ⛔ 미승인이던 기사는 고치지 않고 건너뛴다(승인으로 올리지 않는다)
 *   ⑤ 다시 열어 읽는다: 1차 보도자료 · 2차와 연재 없음 · 참조섹션 0줄 · 승인·노출시간·제목·기자 그대로
 * 한 건이라도 어긋나면 거기서 멈춘다. ⛔ 웹출판은 누르지 않는다.
 * ⛔ 기자가 박인택이고 제목에 「오늘의 운세」가 든 기사는 열지도 않는다.
 *
 *   node scripts/jb-press-fix.mjs --몇건 1      (ASCII 별칭: --count 1)
 *   node scripts/jb-press-fix.mjs
 */
import fs from 'node:fs';
import { 새탭에서, 자리잡기, 재기 } from './lib/cdp.mjs';
import { 서식주소, 상태글, 골라넣기글, 승인고르기글, 저장누르기글 } from './중부매일-기자와분류-바꾼다.mjs';

/* 다른 훑은 파일(예: 선거 기사)로도 같은 방식으로 고친다 — --scan <json> --log <json> */
const 인자값 = (이름, 기본) => { const i = process.argv.indexOf(이름); return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : 기본; };
const 훑은곳 = 인자값('--scan', 'docs/jb-press-scan-20261127.json');
const 일지곳 = 인자값('--log', 'docs/jb-press-fix-log-20261127.json');
const 쉰다 = (ms) => new Promise((r) => setTimeout(r, ms));

const 참조읽는글 = `(() => JSON.stringify([...document.querySelectorAll('#refer-section-list-div .refer-section-div')].map((d) => {
  const g = (c) => { const e = d.querySelector('select.' + c); return e ? { 값: e.value, 글: e.value && e.selectedOptions[0] ? e.selectedOptions[0].textContent.trim() : '' } : { 값: '', 글: '' }; };
  return { 일차: g('refer_section_code'), 이차: g('refer_sub_section_code'), 연재: g('refer_serial_code') };
})))()`;
const 참조지우는글 = `(() => {
  let 누른 = 0;
  for (let i = 0; i < 12; i += 1) {
    const b = document.querySelector('#refer-section-list-div .refer-section-div .refer-section-del-button');
    if (!b) break;
    b.click(); 누른 += 1;
  }
  return JSON.stringify({ 누른, 남은줄: document.querySelectorAll('#refer-section-list-div .refer-section-div').length });
})()`;

async function 읽는다(붙음) {
  let 상태 = null; let 참조 = null;
  try { 상태 = JSON.parse(String(await 재기(붙음, 상태글, 25000))); } catch { 상태 = null; }
  try { 참조 = JSON.parse(String(await 재기(붙음, 참조읽는글, 25000))); } catch { 참조 = null; }
  return { 상태, 참조 };
}

export async function 한건고친다(번호) {
  return 새탭에서(서식주소(번호), async (붙음) => {
    붙음.듣기('Page.javascriptDialogOpening', () => { 붙음.보내기('Page.handleJavaScriptDialog', { accept: true }).catch(() => {}); });
    await 자리잡기(붙음, { 최대: 45000 }); await 쉰다(2500);
    let 전 = await 읽는다(붙음);
    /* 🔴 [2026-11-27] 화면이 덜 뜨면 분류·노출시간이 빈 채로 읽히고 승인도 false 로 나온다.
       그것을 「미승인 기사」로 읽어 3건을 건너뛰었다(실제로는 승인 기사였다). 빈 화면은 «못 읽음»이다 — 두 번 더 기다려 읽는다. */
    for (let 다시 = 0; 다시 < 2 && 전.상태 && (!전.상태.섹션1 || !전.상태.노출날 || !전.상태.제목); 다시 += 1) {
      await 쉰다(6000);
      전 = await 읽는다(붙음);
    }
    if (!전.상태 || !전.참조) return { 된것: false, 말: '기사를 못 읽었다' };
    if (!전.상태.섹션1 || !전.상태.노출날 || !전.상태.제목) return { 된것: false, 전, 말: '수정 화면이 덜 떴다 — 아무것도 하지 않았다' };
    if (/오늘의 운세/.test(전.상태.제목) || /박인택/.test(전.상태.기자명)) return { 된것: true, 건너뜀: true, 전, 말: '건드리지 않는 기사라 건너뛴다' };
    if (!전.상태.승인) return { 된것: true, 건너뜀: true, 전, 말: '미승인 기사라 고치지 않았다' };
    if (전.상태.섹션1 === 'S1N31' && 전.참조.length === 0) return { 된것: true, 건너뜀: true, 전, 말: '이미 보도자료 하나뿐이다' };

    const 지움 = JSON.parse(String(await 재기(붙음, 참조지우는글, 25000)));
    if (지움.남은줄 !== 0) return { 된것: false, 전, 말: '참조섹션 줄이 ' + 지움.남은줄 + '개 남았다 — 저장하지 않았다' };
    await 쉰다(800);
    if (전.상태.섹션1 !== 'S1N31') {
      const r = String(await 재기(붙음, 골라넣기글('#sectionCode', 'S1N31'), 25000));
      if (r !== '골랐다') return { 된것: false, 전, 말: '1차 분류를 못 골랐다 — ' + r + ' · 저장하지 않았다' };
      await 쉰다(2200);
    }
    const 중간 = await 읽는다(붙음);
    if (!중간.상태 || 중간.상태.섹션1 !== 'S1N31' || 중간.상태.섹션2 || 중간.상태.연재 || (중간.참조 || []).length) {
      return { 된것: false, 전, 말: '저장 전 화면이 바라는 상태가 아니다 — 저장하지 않았다', 중간 };
    }
    await 재기(붙음, 승인고르기글, 25000);
    const 저장 = String(await 재기(붙음, 저장누르기글, 25000));
    if (저장 !== '눌렀다') return { 된것: false, 전, 말: '저장을 못 눌렀다 — ' + 저장 };
    await 쉰다(6000); await 자리잡기(붙음, { 최대: 30000 });

    let 뒤 = { 상태: null, 참조: null };
    /* 🔴 [2026-11-27] 저장 뒤 화면이 늦게 뜨면 되읽기가 빈다 — 그 한 번으로 전체가 멈췄다(76건 중 1번, 97건 중 1번).
       세 번까지 다시 열어 읽는다. 그래도 못 읽으면 그때 멈춘다. */
    for (let 다시 = 0; 다시 < 3; 다시 += 1) {
      try {
        await 붙음.보내기('Page.navigate', { url: 서식주소(번호) });
        await 자리잡기(붙음, { 최대: 45000 }); await 쉰다(2500 + 다시 * 4000);
        뒤 = await 읽는다(붙음);
      } catch { 뒤 = { 상태: null, 참조: null }; }
      if (뒤.상태 && 뒤.참조 && 뒤.상태.섹션1 && 뒤.상태.노출날) break;
    }
    if (!뒤.상태 || !뒤.참조 || !뒤.상태.섹션1 || !뒤.상태.노출날) return { 된것: false, 전, 말: '저장은 눌렀으나 되읽기를 못 했다' };
    const 탈 = [];
    if (뒤.상태.섹션1 !== 'S1N31') 탈.push('1차=' + 뒤.상태.섹션1글);
    if (뒤.상태.섹션2) 탈.push('2차=' + 뒤.상태.섹션2글);
    if (뒤.상태.연재) 탈.push('연재=' + 뒤.상태.연재글);
    if (뒤.참조.length) 탈.push('참조섹션 ' + 뒤.참조.length + '줄');
    if (뒤.상태.노출날 !== 전.상태.노출날 || 뒤.상태.노출시각 !== 전.상태.노출시각) 탈.push('노출시간이 바뀌었다');
    if (!뒤.상태.승인) 탈.push('미승인으로 떨어졌다');
    if (뒤.상태.제목 !== 전.상태.제목) 탈.push('제목이 바뀌었다');
    if (뒤.상태.기자id !== 전.상태.기자id || 뒤.상태.기자명 !== 전.상태.기자명 || 뒤.상태.기자메일 !== 전.상태.기자메일) 탈.push('기자가 바뀌었다');
    return { 된것: 탈.length === 0, 전, 뒤, 말: 탈.length ? 탈.join(' · ') : '보도자료 하나로 고쳤다' };
  });
}

const 분류글 = (x) => !x || !x.상태 ? '' : [x.상태.섹션1글, x.상태.섹션2 ? x.상태.섹션2글 : '', x.상태.연재 ? x.상태.연재글 : ''].filter(Boolean).join(' > ')
  + ((x.참조 || []).length ? ' + 참조[' + x.참조.map((r) => [r.일차.글, r.이차.글, r.연재.글].filter(Boolean).join(' > ')).join(' / ') + ']' : '');

if ((process.argv[1] || '').includes('jb-press-fix')) {
  const 훑음 = JSON.parse(fs.readFileSync(훑은곳, 'utf8'));
  const 대상 = [];
  for (const x of 훑음) for (const o of x.줄) if (o.섹션 !== '보도자료' && !대상.some((d) => d.번호 === o.번호)) 대상.push({ ...o, 달: x.달 });
  const 일지 = fs.existsSync(일지곳) ? JSON.parse(fs.readFileSync(일지곳, 'utf8')) : [];
  /* 빈 화면을 읽고 건너뛴 줄은 끝난 것으로 치지 않는다 */
  const 끝난 = new Set(일지.filter((x) => x.된것 && !(x.건너뜀 && !(x.전 && x.전.상태 && x.전.상태.섹션1))).map((x) => x.번호));
  const 할것 = 대상.filter((o) => !끝난.has(o.번호));
  const 자리 = Math.max(process.argv.indexOf('--몇건'), process.argv.indexOf('--count'));
  const 몇건 = 자리 > 0 ? Number(process.argv[자리 + 1]) : 할것.length;
  console.log('대상 ' + 대상.length + '건 · 일지에 끝난 것 ' + 끝난.size + '건 · 이번에 할 것 ' + Math.min(몇건, 할것.length) + '건');
  for (const o of 할것.slice(0, 몇건)) {
    let r;
    try { r = await 한건고친다(o.번호); } catch (e) { r = { 된것: false, 말: '오류 ' + String(e.message).slice(0, 80) }; }
    일지.push({ 번호: o.번호, 제목: o.제목, 기자: o.기자, 달: o.달, 검색에보인분류: o.섹션, 때: new Date().toLocaleString('sv'), 된것: !!r.된것, 건너뜀: !!r.건너뜀, 말: r.말, 전분류: 분류글(r.전), 뒤분류: 분류글(r.뒤), 전: r.전, 뒤: r.뒤 });
    fs.writeFileSync(일지곳, JSON.stringify(일지, null, 1));
    console.log((r.된것 ? (r.건너뜀 ? '⬜ ' : '✅ ') : '🔴 ') + o.번호 + ' ' + o.기자 + ' | ' + 분류글(r.전) + ' → ' + (r.건너뜀 ? '(그대로)' : 분류글(r.뒤)) + ' | ' + r.말);
    if (!r.된것) { console.log('🔴 한 건이 어긋났다 — 여기서 멈춘다'); process.exit(1); }
  }
  console.log('끝 — 일지 ' + 일지곳);
}
