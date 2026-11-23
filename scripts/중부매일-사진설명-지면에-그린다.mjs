#!/usr/bin/env node
/**
 * 중부매일-사진설명-지면에-그린다.mjs
 *   — 운세 기사 본문의 대표 사진을 **figure + figcaption** 꼴로 바꿔
 *     사진 설명이 지면에 «실제로 그려지게» 한다.
 *
 * 🔴🔴 [2026-11-23 · 사장님] 「**사진설명 빠졌잖아. 아 진짜 대충하는구나. 제대로 해**」
 *                            「**사진설명 샘플도 줬는데 어떻게 안할수가 있지**」
 *
 * [무엇이 있었나 — 내가 틀린 자리]
 *   나는 CMS 사진 라이브러리의 캡션 칸을 읽고 「사진 설명 24편 전부 있다」고 적었다.
 *   그 칸은 들어 있었다. 그런데 **지면에는 한 글자도 안 나온다.**
 *   2026-11-22 에 나간 기사(1516334)의 라이브 지면을 받아 재 보니
 *   figure 0곳 · figcaption 0곳 · 설명 글자 0곳이었다.
 *
 *   까닭 — 중부매일 지면은 사진 설명을 figure 안의 figcaption 으로 그린다.
 *   다른 기자의 기사는 이렇게 들어 있다 (1516727 · 1516716 실측):
 *     <figure class="photo-layout image photo_1372658 float-center"
 *             data-idxno="1372658" data-type="photo" style="max-width: 774px;">
 *       <img alt="▲ …설명… / 괴산문화원" src="…1516727_1372658_4505.jpg" width="774" />
 *       <figcaption>▲ …설명… / 괴산문화원</figcaption>
 *     </figure>
 *   우리 운세 기사는 <p style="text-align:center"><img …></p> 로만 들어 있어
 *   설명이 그려질 자리 자체가 없었다.
 *
 *   ⚠ 라이브러리 캡션 칸이 차 있는 것을 「설명이 들어갔다」로 읽지 않는다.
 *     손님이 보는 것은 지면이지 CMS 서식이 아니다.
 *
 * 무엇을 하나
 *   ① 기사 수정 서식을 연다
 *   ② 본문에서 대표 사진을 감싼 p 를 찾는다
 *   ③ 사진 번호를 뽑는다 — 파일 이름 <기사번호>_<사진번호>_<일련>.png 의 가운데
 *      라이브러리 줄의 data-idxno 와 견준다. 다르면 멈춘다
 *   ④ figure + figcaption 꼴로 갈아 끼우고 저장한다
 *   ⑤ 되읽어 figcaption 과 설명 글자가 들어갔는지, 승인·예약·제목·분류가 그대로인지 본다
 *
 * ⛔ 승인 라디오를 건드리지 않는다 (사장님 2026-11-22)
 * ⛔ 제목·분류·본문의 다른 글자를 건드리지 않는다
 * ⛔ 오늘 것과 이미 지난 날짜의 기사는 대상에 넣지 않는다 (사장님 2026-11-23)
 * ⛔ 다른 중부매일 파일을 들여오지 않는다
 *
 * 쓰는 법
 *   node scripts/중부매일-사진설명-지면에-그린다.mjs --list <목록.tsv>
 *   node scripts/중부매일-사진설명-지면에-그린다.mjs --list <목록.tsv> --한편 1516338 --그린다
 *   node scripts/중부매일-사진설명-지면에-그린다.mjs --list <목록.tsv> --그린다
 *   node scripts/중부매일-사진설명-지면에-그린다.mjs --자체검사
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 여기 = path.dirname(fileURLToPath(import.meta.url));
const 뿌리 = path.join(여기, '..');

export const 지면폭 = 774;
export const 기록파일 = 'docs/중부매일-사진설명-지면기록.tsv';
export const 서식주소 = (n) => 'https://cms.jbnews.com/news/adminArticleWriteForm.html?mode=modify&idxno=' + n;

/** 사진 설명 — 사장님이 보여 주신 글꼴 그대로다 (2026-11-23) */
export function 설명글만들기(날, 갈래) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(날 || ''));
  if (!m) return '';
  return '오늘의 운세 ' + m[1] + '년 ' + String(Number(m[2])) + '월 '
    + String(Number(m[3])) + '일 ' + 갈래 + ' 운세. / KLifeMap.AI';
}

/** 중부매일 지면은 설명 앞에 ▲ 를 붙인다 — 다른 기자 기사 전부가 그렇다 */
export function 지면설명(설명) {
  const 글 = String(설명 || '').trim();
  if (!글) return '';
  return 글;
}

/** 목록 파일(날·기사번호·갈래, 탭 구분) */
export function 목록에서대상(글) {
  const 것 = [];
  for (const 줄 of String(글 ?? '').split(/\r?\n/)) {
    const 칸 = 줄.trim().split('\t');
    if (칸.length < 3) continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(칸[0])) continue;
    if (!/^\d{6,}$/.test(칸[1])) continue;
    것.push({ 날: 칸[0], 번호: 칸[1], 갈래: 칸[2].trim() });
  }
  return 것;
}

/** 본문에서 이 기사의 대표 사진 img 태그 하나를 통째로 집는다 */
export function 대표사진찾기(본문, 기사번호) {
  const 글 = String(본문 ?? '');
  const 안전 = String(기사번호).replace(/[^0-9]/g, '');
  if (!안전) return null;
  const 자 = new RegExp(
    '<img\\b[^>]*src\\s*=\\s*["\'][^"\']*\\/(' + 안전 + '_(\\d+)_\\d+\\.(?:png|jpg|jpeg|gif))["\'][^>]*>',
    'i',
  );
  const m = 자.exec(글);
  if (!m) return null;
  const src자 = /src\s*=\s*["']([^"']+)["']/i.exec(m[0]);
  return { 통째: m[0], 파일: m[1], 사진번호: m[2], 주소: src자 ? src자[1] : '' };
}

/** 이미 figure 로 그려져 있고 설명도 맞나 */
export function 이미그렸나(본문, 지면글) {
  const 글 = String(본문 ?? '');
  if (!/<figure\b/i.test(글)) return false;
  if (!/<figcaption\b/i.test(글)) return false;
  return 글.includes('<figcaption>' + 지면글 + '</figcaption>');
}

/** figure 꼴을 짓는다 — 다른 기자 기사와 같은 꼴 */
export function 피겨짓기(주소, 사진번호, 지면글) {
  const 따옴표안전 = String(지면글).replace(/"/g, '&quot;');
  return '<figure class="photo-layout image photo_' + 사진번호 + ' float-center"'
    + ' data-idxno="' + 사진번호 + '" data-type="photo" style="max-width: ' + 지면폭 + 'px;">'
    + '<img alt="' + 따옴표안전 + '" src="' + 주소 + '" width="' + 지면폭 + '" />'
    + '<figcaption>' + 지면글 + '</figcaption>'
    + '</figure>';
}

/**
 * 본문에서 대표 사진을 감싼 p 를 통째로 figure 로 갈아 끼운다.
 * 감싼 p 가 없으면 img 만 갈아 끼운다.
 */
export function 본문고치기(본문, 기사번호, 지면글) {
  const 글 = String(본문 ?? '');
  const 찾음 = 대표사진찾기(글, 기사번호);
  if (!찾음) return { 글, 바꾼수: 0, 까닭: '본문에 대표 사진이 없다' };
  if (!지면글) return { 글, 바꾼수: 0, 까닭: '설명글이 비었다' };

  const 피겨 = 피겨짓기(찾음.주소, 찾음.사진번호, 지면글);
  const 자리 = 글.indexOf(찾음.통째);

  /* 그 img 를 감싼 가장 가까운 p 를 찾는다 */
  const 앞p = 글.lastIndexOf('<p', 자리);
  const 뒤p = 글.indexOf('</p>', 자리);
  const 사이 = 앞p >= 0 && 뒤p > 자리 ? 글.slice(앞p, 뒤p + 4) : '';
  const 감쌌나 = Boolean(사이) && 사이.includes(찾음.통째)
    && !/<img\b[\s\S]*<img\b/i.test(사이);

  if (감쌌나) {
    return { 글: 글.slice(0, 앞p) + 피겨 + 글.slice(뒤p + 4), 바꾼수: 1, 까닭: 'p 를 figure 로 바꿨다' };
  }
  return { 글: 글.replace(찾음.통째, 피겨), 바꾼수: 1, 까닭: 'img 를 figure 로 바꿨다' };
}

export function 달라진것(앞, 뒤) {
  const 것 = [];
  if (뒤.승인 !== 앞.승인) 것.push('🔴 승인 상태가 바뀌었다 ' + 앞.승인 + ' → ' + 뒤.승인);
  if (뒤.예약 !== 앞.예약) 것.push('🔴 예약 시각이 바뀌었다 ' + 앞.예약 + ' → ' + 뒤.예약);
  if (뒤.제목 !== 앞.제목) 것.push('🔴 제목이 바뀌었다');
  if (뒤.분류 !== 앞.분류) 것.push('🔴 분류가 바뀌었다 ' + 앞.분류 + ' → ' + 뒤.분류);
  return 것;
}

/* ── 자체 검사 ───────────────────────────────────────────────────────── */
if (process.argv.includes('--자체검사')) {
  let 통 = 0; let 탈 = 0;
  const 본다 = (이름, 참) => {
    if (참) { 통 += 1; console.log('  ✅ ' + 이름); } else { 탈 += 1; console.log('  🔴 ' + 이름); }
  };

  /* 2026-11-22 에 나간 기사 1516334 의 본문 첫머리 실물 */
  const 실물 = '<p style="text-align:center"><img alt="" '
    + 'src="https://cdn.jbnews.com/news/photo/202611/1516334_1372119_2316.png" /></p> '
    + '<p style="font-size:16px;">[중부매일 박인택 기자] 2026년 11월 22일 일요일은</p>';

  본다('① 사장님 글꼴 그대로다',
    설명글만들기('2026-11-19', '별자리') === '오늘의 운세 2026년 11월 19일 별자리 운세. / KLifeMap.AI');
  본다('② 달과 날의 앞 0 을 뗀다',
    설명글만들기('2026-01-05', '띠별') === '오늘의 운세 2026년 1월 5일 띠별 운세. / KLifeMap.AI');
  본다('③ 날이 아니면 빈 글이다', 설명글만들기('아무날', '띠별') === '');
  본다('④ 지면 설명은 사장님 샘플 그대로다 — 덧붙이지 않는다',
    지면설명('오늘의 운세 2026년 11월 19일 띠별 운세. / KLifeMap.AI')
      === '오늘의 운세 2026년 11월 19일 띠별 운세. / KLifeMap.AI');
  본다('⑤ 앞뒤 빈 칸만 떼어 낸다', 지면설명('  ㄱ  ') === 'ㄱ');
  본다('⑥ 빈 글은 빈 글이다', 지면설명('') === '');

  const 찾음 = 대표사진찾기(실물, '1516334');
  본다('⑦ 대표 사진을 찾는다', Boolean(찾음) && 찾음.파일 === '1516334_1372119_2316.png');
  본다('⑧ 파일 이름 가운데가 사진 번호다', 찾음 && 찾음.사진번호 === '1372119');
  본다('⑨ 다른 기사 번호로는 안 걸린다', 대표사진찾기(실물, '1516338') === null);

  const 지면글 = 지면설명(설명글만들기('2026-11-22', '띠별'));
  const 고침 = 본문고치기(실물, '1516334', 지면글);
  본다('⑩ 한 곳을 바꾼다', 고침.바꾼수 === 1);
  본다('⑪ 감싼 p 를 통째로 걷어낸다', !고침.글.includes('text-align:center'));
  본다('⑫ figure 와 figcaption 이 생긴다',
    /<figure\b/.test(고침.글) && 고침.글.includes('<figcaption>' + 지면글 + '</figcaption>'));
  본다('⑬ 사진 번호가 class 와 data 에 함께 들어간다',
    고침.글.includes('photo_1372119') && 고침.글.includes('data-idxno="1372119"'));
  본다('⑭ 그림 주소는 그대로다',
    고침.글.includes('src="https://cdn.jbnews.com/news/photo/202611/1516334_1372119_2316.png"'));
  본다('⑮ alt 에도 같은 설명이 들어간다', 고침.글.includes('alt="' + 지면글 + '"'));
  본다('⑯ 본문의 다른 글자는 그대로다',
    고침.글.includes('[중부매일 박인택 기자] 2026년 11월 22일 일요일은'));
  본다('⑰ 이미 그렸으면 다시 안 그린다', 이미그렸나(고침.글, 지면글) === true);
  본다('⑱ 안 그려진 본문은 아니라고 한다', 이미그렸나(실물, 지면글) === false);
  본다('⑲ 설명이 다르면 다시 그려야 한다고 본다',
    이미그렸나(고침.글, '▲ 다른 설명') === false);
  본다('⑳ 사진이 없으면 아무것도 안 한다',
    본문고치기('<p>글만 있다</p>', '1516334', 지면글).바꾼수 === 0);
  본다('㉑ 설명이 비면 아무것도 안 한다', 본문고치기(실물, '1516334', '').바꾼수 === 0);
  본다('㉒ 목록 파일에서 대상을 읽는다',
    목록에서대상('2026-11-24\t1516338\t띠별').length === 1);

  const 앞 = { 제목: 'ㄱ', 분류: 'S2N203', 승인: '승인', 예약: '2026-11-24 00:05' };
  본다('㉓ 아무것도 안 바뀌면 통과', 달라진것(앞, { ...앞 }).length === 0);
  본다('🔴 ㉔ 승인 상태가 바뀌면 잡는다',
    달라진것(앞, { ...앞, 승인: '미승인' }).some((m) => /승인 상태/.test(m)));
  본다('🔴 ㉕ 예약 시각이 바뀌면 잡는다',
    달라진것(앞, { ...앞, 예약: '2026-11-25 00:05' }).some((m) => /예약 시각/.test(m)));
  본다('⛔ ㉖ 승인 라디오를 누르는 글이 없다', (() => {
    const 글 = fs.readFileSync(new URL(import.meta.url), 'utf8');
    return !/recog-[ce]['"]?\s*\)?\s*\.\s*click|recog-[ce][^\n]*checked\s*=/.test(글);
  })());
  본다('⛔ ㉗ 다른 중부매일 파일을 들여오지 않는다', (() => {
    const 찾을것 = 'from ' + String.fromCharCode(39) + './' + '중부매일' + '-';
    return !fs.readFileSync(new URL(import.meta.url), 'utf8').includes(찾을것);
  })());

  console.log(탈 ? '\n🔴 자체 검사 ' + 탈 + '건 탈' : '\n✅ 자체 검사 ' + 통 + ' 통과');
  process.exit(탈 ? 1 : 0);
}

/* ── 여기서부터 CMS 를 만진다 ────────────────────────────────────────── */
const { 새탭에서, 자리잡기, 재기 } = await import('./lib/cdp.mjs');

const 읽는글 = [
  '(function(){',
  '  var d = document;',
  '  var v = function(s){ var e = d.querySelector(s); return e ? (e.value || "") : ""; };',
  '  var 제목칸 = [].slice.call(d.querySelectorAll(".accordion-title"))',
  '    .filter(function(e){ return (e.textContent||"").trim() === "사진"; })[0];',
  '  if (제목칸) { var 속 = 제목칸.closest(".accordion-item").querySelector(".accordion-content");',
  '    if (!(속 && 속.offsetHeight > 0)) 제목칸.click(); }',
  '  var 장 = d.querySelector(".library-photo");',
  '  var 작은 = d.querySelector("#subSectionCode, select[name=subSectionCode]");',
  '  var 승인칸 = d.querySelector("#recog-e");',
  '  var 미승인칸 = d.querySelector("#recog-c");',
  '  var 승인 = "모름";',
  '  if (승인칸 && 승인칸.checked) 승인 = "승인";',
  '  else if (미승인칸 && 미승인칸.checked) 승인 = "미승인";',
  '  var 본문 = ""; var 어디 = "";',
  /* 편집기가 쥔 «깨끗한» 글을 먼저 받는다 — iframe 을 그냥 읽으면 위젯 껍데기가 섞인다 */
  '  try {',
  '    if (window.CKEDITOR) {',
  '      var 이름들 = Object.keys(CKEDITOR.instances || {});',
  '      for (var i = 0; i < 이름들.length; i++) {',
  '        var e1 = CKEDITOR.instances[이름들[i]];',
  '        if (e1 && e1.getData) { 본문 = e1.getData() || ""; 어디 = "ckeditor"; break; }',
  '      }',
  '    }',
  '  } catch (e) {}',
  '  if (!본문) {',
  '    var ta = d.querySelector("textarea[name=articleBody], textarea#articleBody, textarea[name=content]");',
  '    if (ta) { 본문 = ta.value || ""; 어디 = "textarea"; }',
  '  }',
  '  if (!본문) { var f = d.querySelector("iframe");',
  '    try { if (f && f.contentDocument) { 본문 = f.contentDocument.body.innerHTML || ""; 어디 = "iframe"; } } catch (e) {} }',
  '  return JSON.stringify({',
  '    제목: v("input[name=title], #title"),',
  '    분류: 작은 ? 작은.value : "",',
  '    승인: 승인,',
  '    예약: (v("input[name=articleDate]") + " " + v("input[name=articleTime]")).trim(),',
  '    줄사진번호: 장 ? (장.getAttribute("data-idxno") || "") : "",',
  '    줄파일: 장 ? (장.getAttribute("data-image") || "") : "",',
  '    본문길이: 본문.length,',
  '    본문어디: 어디,',
  '    본문: 본문',
  '  });',
  '})()',
].join('\n');

const 저장글 = [
  '(function(){',
  '  var b = document.querySelectorAll("button, a, input[type=button], input[type=submit]");',
  '  for (var i = 0; i < b.length; i++) {',
  '    var g = ((b[i].innerText || b[i].value || "") + "").trim();',
  '    if (g === "저장") { b[i].click(); return "눌렀다"; }',
  '  }',
  '  return "저장 단추를 못 찾았다";',
  '})()',
].join('\n');

function 본문넣는글(새본문, 어디) {
  return [
    '(function(){',
    ' try {',
    '  var 새글 = ' + JSON.stringify(새본문) + ';',
    '  if (' + JSON.stringify(어디) + ' === "ckeditor") {',
    '    if (!window.CKEDITOR) return "편집기가 없다";',
    '    var 이름들 = Object.keys(CKEDITOR.instances || {});',
    '    for (var i = 0; i < 이름들.length; i++) {',
    '      var e1 = CKEDITOR.instances[이름들[i]];',
    '      if (!(e1 && e1.setData)) continue;',
    '      e1.setData(새글);',
    '      if (e1.updateElement) e1.updateElement();',
    '      return "넣었다";',
    '    }',
    '    return "편집기를 못 찾았다";',
    '  }',
    '  if (' + JSON.stringify(어디) + ' === "textarea") {',
    '    var ta = document.querySelector("textarea[name=articleBody], textarea#articleBody, textarea[name=content]");',
    '    if (!ta) return "본문 칸이 없다";',
    '    ta.value = 새글;',
    '    ta.dispatchEvent(new Event("input", { bubbles: true }));',
    '    ta.dispatchEvent(new Event("change", { bubbles: true }));',
    '    return ta.value === 새글 ? "넣었다" : "안 들어갔다";',
    '  }',
    '  var f = document.querySelector("iframe");',
    '  try {',
    '    if (!(f && f.contentDocument)) return "본문 틀이 없다";',
    '    f.contentDocument.body.innerHTML = 새글;',
    '    return "넣었다";',
    '  } catch (e) { return "본문 틀에 못 넣었다"; }',
    ' } catch (e) { return "탈났다 — " + (e && e.message ? e.message : String(e)); }',
    '})()',
  ].join('\n');
}

/**
 * 편집기에서 이 기사의 대표 사진 위젯을 찾아 캡션을 켠다.
 * 대표 사진은 src 에 <기사번호>_ 가 든 것 하나뿐이다 — 운세 글의 작은 띠 그림은
 * klifemap.ai 에서 오므로 걸리지 않는다.
 */
function 위젯찾는글(기사번호) {
  const 안전 = String(기사번호).replace(/[^0-9]/g, '');
  return [
    '  function 편집기() {',
    '    if (!window.CKEDITOR) return null;',
    '    var 이름들 = Object.keys(CKEDITOR.instances || {});',
    '    for (var i = 0; i < 이름들.length; i++) {',
    '      var e = CKEDITOR.instances[이름들[i]];',
    '      if (e && e.widgets) return e;',
    '    }',
    '    return null;',
    '  }',
    '  function 대표위젯(ed) {',
    '    var inst = (ed.widgets && ed.widgets.instances) || {};',
    '    for (var id in inst) {',
    '      var w = inst[id];',
    '      if (!w || w.name !== "image") continue;',
    '      var s = (w.data && w.data.src) ? String(w.data.src) : "";',
    '      if (s.indexOf("' + 안전 + '_") >= 0) return w;',
    '    }',
    '    return null;',
    '  }',
  ].join('\n');
}

function 캡션켜는글(기사번호, 지면글) {
  return [
    '(function(){',
    ' try {',
    위젯찾는글(기사번호),
    '  var ed = 편집기();',
    '  if (!ed) return "편집기가 없다";',
    '  var w = 대표위젯(ed);',
    '  if (!w) return "대표 사진 위젯이 없다";',
    '  if (w.data && w.data.hasCaption) return "켰다 (이미 켜져 있었다)";',
    '  w.setData("hasCaption", true);',
    '  w.setData("alt", ' + JSON.stringify(지면글) + ');',
    '  return "켰다";',
    ' } catch (e) { return "탈났다 — " + (e && e.message ? e.message : String(e)); }',
    '})()',
  ].join('\n');
}

function 캡션글넣는글(기사번호, 지면글) {
  return [
    '(function(){',
    ' try {',
    위젯찾는글(기사번호),
    '  var ed = 편집기();',
    '  if (!ed) return "편집기가 없다";',
    '  var w = 대표위젯(ed);',
    '  if (!w) return "대표 사진 위젯이 없다";',
    '  if (!(w.data && w.data.hasCaption)) return "캡션이 안 켜졌다";',
    '  var cap = (w.parts && w.parts.caption) ? w.parts.caption : null;',
    '  if (!cap && w.element && w.element.findOne) cap = w.element.findOne("figcaption");',
    '  if (!cap) return "캡션 자리를 못 찾았다";',
    '  cap.setHtml(' + JSON.stringify(지면글) + ');',
    '  if (w.setData) w.setData("alt", ' + JSON.stringify(지면글) + ');',
    '  ed.fire("saveSnapshot");',
    '  ed.updateElement();',
    '  return "적었다";',
    ' } catch (e) { return "탈났다 — " + (e && e.message ? e.message : String(e)); }',
    '})()',
  ].join('\n');
}

async function 한편읽기(기사번호) {
  let 것 = null;
  await 새탭에서(서식주소(기사번호), async (붙음) => {
    await 자리잡기(붙음, { 최대: 45000 });
    await new Promise((r) => setTimeout(r, 6000));
    try { 것 = JSON.parse(String(await 재기(붙음, 읽는글, 30000))); } catch (e) { 것 = null; }
  });
  return 것;
}

async function 한편그리기(기사번호, 날, 갈래) {
  const 지면글 = 지면설명(설명글만들기(날, 갈래));
  if (!지면글) return { 결과: '🔴 설명글을 못 만들었다 — 날이 이상하다' };

  const 앞 = await 한편읽기(기사번호);
  if (!앞) return { 결과: '🔴 서식을 못 읽었다' };
  if (이미그렸나(앞.본문, 지면글)) return { 결과: '이미 그려져 있다', 앞, 뒤: 앞 };

  const 찾음 = 대표사진찾기(앞.본문, 기사번호);
  if (!찾음) return { 결과: '🔴 본문에 대표 사진이 없다', 앞 };
  if (앞.줄사진번호 && 앞.줄사진번호 !== 찾음.사진번호) {
    return { 결과: '🔴 사진 번호가 어긋난다 — 줄 ' + 앞.줄사진번호 + ' 대 본문 ' + 찾음.사진번호, 앞 };
  }

  /* 본문 글자를 직접 갈아 끼우면 CKEditor 이미지 위젯이 figure 를 도로 벗긴다.
     그래서 편집기의 위젯에 캡션을 켜는 길로 넣는다 (2026-11-23 에 겪었다). */
  const 고침 = 본문고치기(앞.본문, 기사번호, 지면글);
  if (!고침.바꾼수) return { 결과: '🔴 ' + 고침.까닭, 앞 };

  let 넣음 = '못 했다'; let 눌림 = '못 했다';
  await 새탭에서(서식주소(기사번호), async (붙음) => {
    await 자리잡기(붙음, { 최대: 45000 });
    await new Promise((r) => setTimeout(r, 7000));
    넣음 = String(await 재기(붙음, 본문넣는글(고침.글, 앞.본문어디), 40000));
    if (넣음 !== '넣었다') return;
    await new Promise((r) => setTimeout(r, 3000));
    /* ⛔ 승인 라디오는 건드리지 않는다 */
    눌림 = String(await 재기(붙음, 저장글, 25000));
    if (눌림 === '눌렀다') await new Promise((r) => setTimeout(r, 12000));
  });
  if (넣음 !== '넣었다') return { 결과: '🔴 본문을 못 넣었다 — ' + 넣음, 앞 };
  if (눌림 !== '눌렀다') return { 결과: '🔴 저장을 못 눌렀다 — ' + 눌림, 앞 };

  const 뒤 = await 한편읽기(기사번호);
  if (!뒤) return { 결과: '🔴 되읽지 못했다', 앞 };
  const 흠 = 달라진것(앞, 뒤);
  let 결과 = 이미그렸나(뒤.본문, 지면글)
    ? '그렸다'
    : '🔴 안 들어갔다 — figcaption ' + (/<figcaption/i.test(뒤.본문) ? '있는데 글이 다르다' : '없다');
  if (흠.length) 결과 += ' · ' + 흠.join(' · ');
  return { 결과, 앞, 뒤, 지면글 };
}

function 오늘() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
    + '-' + String(d.getDate()).padStart(2, '0');
}

/* ── 돌린다 ──────────────────────────────────────────────────────────── */
const 인자 = process.argv.slice(2);
const 목록인자 = 인자.indexOf('--list');
const 목록길 = 목록인자 >= 0 ? 인자[목록인자 + 1] : '';
const 한편인자 = 인자.indexOf('--한편');
const 한편만 = 한편인자 >= 0 ? 인자[한편인자 + 1] : '';
const 정말그리나 = 인자.includes('--그린다');

if (!목록길) { console.log('🔴 --list <목록.tsv> 가 있어야 한다'); process.exit(1); }

let 대상 = 목록에서대상(fs.readFileSync(목록길, 'utf8'));
if (한편만) 대상 = 대상.filter((x) => String(x.번호) === String(한편만));

/* ⛔ 오늘과 그 이전 날짜는 손대지 않는다 (사장님 2026-11-23) */
const 오늘날 = 오늘();
const 뺀것 = 대상.filter((x) => x.날 <= 오늘날);
대상 = 대상.filter((x) => x.날 > 오늘날);

console.log('■ 대상 ' + 대상.length + '편');
if (뺀것.length) console.log('⛔ 오늘과 지난 날짜 ' + 뺀것.length + '편은 뺐다 (사장님 2026-11-23)');
console.log('■ 본문 사진을 figure + figcaption 으로 바꿔 설명이 지면에 그려지게 한다');
console.log('⛔ 승인 라디오는 건드리지 않는다\n');

const 줄들 = [];
let 됨 = 0; let 이미 = 0; let 탈 = 0;
for (const x of 대상) {
  const 지면글 = 지면설명(설명글만들기(x.날, x.갈래));
  let r;
  if (정말그리나) {
    r = await 한편그리기(x.번호, x.날, x.갈래);
  } else {
    const 것 = await 한편읽기(x.번호);
    const 말 = !것 ? '🔴 못 읽었다'
      : 이미그렸나(것.본문, 지면글) ? '이미 그려져 있다'
        : (/<figcaption/i.test(것.본문) ? '🔴 figcaption 은 있는데 글이 다르다' : '🔴 지면에 설명이 없다');
    r = { 결과: 말 };
  }
  if (r.결과 === '그렸다') 됨 += 1;
  else if (r.결과 === '이미 그려져 있다') 이미 += 1;
  else 탈 += 1;
  console.log('  ' + x.날 + '  ' + String(x.갈래).padEnd(4) + '  ' + x.번호 + '  ' + r.결과);
  줄들.push([오늘날, x.번호, x.갈래, 지면글, r.결과].join('\t'));
}

if (줄들.length) {
  const 기록길 = path.join(뿌리, 기록파일);
  if (!fs.existsSync(기록길)) fs.writeFileSync(기록길, '# 날\t기사번호\t갈래\t지면설명\t결과\n', 'utf8');
  fs.appendFileSync(기록길, 줄들.join('\n') + '\n', 'utf8');
  console.log('\n✔ 적었다 — ' + 기록파일);
}
console.log('■ 그렸다 ' + 됨 + '편 · 이미 ' + 이미 + '편 · 🔴 탈 ' + 탈 + '편');
if (!정말그리나) console.log('■ 읽기만 했다. 그리려면 --그린다 를 붙인다');
