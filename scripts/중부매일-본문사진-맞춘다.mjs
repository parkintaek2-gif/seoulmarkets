#!/usr/bin/env node
/**
 * 중부매일-본문사진-맞춘다.mjs
 *   — 기사 본문에 박힌 사진 주소를 «실제 올라간 파일»로 맞춘다.
 *
 * 🔴🔴 [2026-11-23 · 사장님] 「**띠별 운세, 별자리운세 예약기사들에 대표사진 및 사진 설명 추가**」
 *
 * [무엇이 있었나] 사장님 화면에 사진이 안 보였다. 재 보니 사진은 올라가 있었다 —
 *   사진 줄도 있고 설명도 적혀 있고 파일도 297KB 로 열린다.
 *   그런데 **본문에 박힌 img 주소가 다른 이름**이었다.
 *     나간 기사 1516334   줄파일 _2316.png · 본문 _2316.png   같다
 *     예약 기사 1516338   줄파일 _485.png  · 본문 _3326.png   다르다 — 없는 파일
 *   그래서 기사 보기 화면에서 그림이 0 x 0 으로 그려졌다.
 *   사진을 끌어다 놓으면 본문에도 한 장이 끼어드는데, 그때 들어간 임시 이름이
 *   본문에 남고 저장된 실제 파일은 다른 이름이 된 것으로 보인다.
 *
 * 무엇을 하나
 *   ① 사진 줄의 data-image 를 읽는다 — 이것이 «실제» 파일이다
 *   ② 본문에서 그 기사의 사진 주소를 찾아 실제 파일 이름으로 바꾼다
 *   ③ 저장하고 다시 열어 되읽는다
 *
 * ⛔ 바꾸는 것은 사진 파일 이름 하나뿐이다. 본문의 다른 글자를 건드리지 않는다
 * ⛔ 승인 라디오를 건드리지 않는다 (사장님 2026-11-22 「미승인 체크하지말고」)
 * ⛔ 이미 맞는 기사는 건너뛴다
 * ⛔ 다른 중부매일 파일을 들여오지 않는다
 *
 * 쓰는 법
 *   node scripts/중부매일-본문사진-맞춘다.mjs --잰다
 *   node scripts/중부매일-본문사진-맞춘다.mjs --한편 1516338 --맞춘다
 *   node scripts/중부매일-본문사진-맞춘다.mjs --맞춘다
 *   node scripts/중부매일-본문사진-맞춘다.mjs --자체검사
 *   덧:  --부터 2026-11-24
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 여기 = path.dirname(fileURLToPath(import.meta.url));
const 뿌리 = path.join(여기, '..');

export const 기본부터 = '2026-11-24';
export const 기록파일 = {
  띠별: 'docs/중부매일-띠별-등록기록.tsv',
  별자리: 'docs/중부매일-별자리-올린기록.tsv',
};
export const 맞춘기록 = 'docs/중부매일-본문사진-맞춘기록.tsv';
export const 서식주소 = (n) => 'https://cms.jbnews.com/news/adminArticleWriteForm.html?mode=modify&idxno=' + n;

/**
 * 본문에서 «그 기사의» 사진 주소만 실제 이름으로 바꾼다.
 * ⛔ 다른 기사 번호로 시작하는 주소는 건드리지 않는다 — 인용 사진일 수 있다.
 */
export function 본문고치기(본문, 기사번호, 실제파일) {
  if (!본문 || !실제파일) return { 글: 본문, 바꾼수: 0 };
  const 안전 = String(기사번호).replace(/[^0-9]/g, '');
  if (!안전) return { 글: 본문, 바꾼수: 0 };
  const 자 = new RegExp(안전 + '_[0-9]+_[0-9]+\\.(png|jpg|jpeg|gif)', 'gi');
  let 바꾼수 = 0;
  const 글 = String(본문).replace(자, (맞은것) => {
    if (맞은것 === 실제파일) return 맞은것;
    바꾼수 += 1;
    return 실제파일;
  });
  return { 글, 바꾼수 };
}

/** 본문 속 그 기사의 사진 이름들을 뽑는다 */
export function 본문속사진들(본문, 기사번호) {
  const 안전 = String(기사번호).replace(/[^0-9]/g, '');
  if (!안전) return [];
  const 자 = new RegExp(안전 + '_[0-9]+_[0-9]+\\.(?:png|jpg|jpeg|gif)', 'gi');
  return [...new Set(String(본문 || '').match(자) || [])];
}

export function 날부터번호들(기록글, 부터) {
  const 집 = new Map();
  for (const 줄 of String(기록글 ?? '').split(/\r?\n/)) {
    if (!줄.trim() || 줄.startsWith('#')) continue;
    const 칸 = 줄.split('\t');
    const 날 = 칸[0];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(날 || '')) continue;
    if (날 < 부터) continue;
    const m = /idxno=(\d+)/.exec(칸.join('\t'));
    if (m) 집.set(날, m[1]);
  }
  return [...집.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
}

export function 대상모으기(띠글, 별글, 부터) {
  const 것 = [];
  for (const [날, 번호] of 날부터번호들(띠글, 부터)) 것.push({ 날, 번호, 갈래: '띠별' });
  for (const [날, 번호] of 날부터번호들(별글, 부터)) 것.push({ 날, 번호, 갈래: '별자리' });
  return 것.sort((a, b) => (a.날 === b.날 ? (a.갈래 < b.갈래 ? -1 : 1) : (a.날 < b.날 ? -1 : 1)));
}

export function 달라진것(앞, 뒤) {
  const 것 = [];
  if (뒤.승인 !== 앞.승인) 것.push('🔴 승인 상태가 바뀌었다 ' + 앞.승인 + ' → ' + 뒤.승인);
  if (뒤.예약 !== 앞.예약) 것.push('🔴 예약 시각이 바뀌었다 ' + 앞.예약 + ' → ' + 뒤.예약);
  if (뒤.제목 !== 앞.제목) 것.push('🔴 제목이 바뀌었다');
  if (뒤.분류 !== 앞.분류) 것.push('🔴 분류가 바뀌었다 ' + 앞.분류 + ' → ' + 뒤.분류);
  if (뒤.본문길이 && 앞.본문길이 && Math.abs(뒤.본문길이 - 앞.본문길이) > 40) {
    것.push('🔴 본문 길이가 크게 달라졌다 ' + 앞.본문길이 + ' → ' + 뒤.본문길이);
  }
  return 것;
}

/* ── 자체 검사 ───────────────────────────────────────────────────────── */
if (process.argv.includes('--자체검사')) {
  let 통 = 0; let 탈 = 0;
  const 본다 = (이름, 참) => {
    if (참) { 통 += 1; console.log('  ✅ ' + 이름); } else { 탈 += 1; console.log('  🔴 ' + 이름); }
  };

  const 본문 = '<p>앞글</p><img src="/news/photo/202611/1516338_1372123_3326.png">'
    + '<p>가운데</p><img src="/news/photo/202611/1516338_1372123_3326.png"><p>끝글</p>';

  const r1 = 본문고치기(본문, '1516338', '1516338_1372123_485.png');
  본다('① 틀린 이름 둘을 다 바꾼다', r1.바꾼수 === 2);
  본다('② 바꾼 뒤에는 실제 이름만 남는다',
    !r1.글.includes('_3326.png') && (r1.글.match(/_485\.png/g) || []).length === 2);
  본다('🔴 ③ 본문의 다른 글자는 그대로다',
    r1.글.includes('<p>앞글</p>') && r1.글.includes('<p>가운데</p>') && r1.글.includes('<p>끝글</p>'));
  본다('④ 길이가 거의 그대로다', Math.abs(r1.글.length - 본문.length) <= 8);

  const 이미맞음 = '<img src="/news/photo/202611/1516334_1372119_2316.png">';
  본다('⑤ 이미 맞으면 안 바꾼다', 본문고치기(이미맞음, '1516334', '1516334_1372119_2316.png').바꾼수 === 0);

  const 남의것 = '<img src="/news/photo/202611/9999999_1_1.png">';
  본다('🔴 ⑥ 다른 기사의 사진은 건드리지 않는다',
    본문고치기(남의것, '1516338', '1516338_1372123_485.png').바꾼수 === 0);

  본다('⑦ 본문 속 사진 이름을 뽑는다',
    JSON.stringify(본문속사진들(본문, '1516338')) === JSON.stringify(['1516338_1372123_3326.png']));
  본다('⑧ 실제 파일이 없으면 아무것도 안 한다', 본문고치기(본문, '1516338', '').바꾼수 === 0);
  본다('⑨ 빈 본문에 안 터진다', 본문고치기('', '1516338', 'a.png').바꾼수 === 0);

  const 앞 = { 제목: 'ㄱ', 분류: 'S2N203', 승인: '승인', 예약: '2026-11-24 00:02', 본문길이: 24064 };
  본다('⑩ 사진 이름만 바뀌면 통과', 달라진것(앞, { ...앞, 본문길이: 24064 }).length === 0);
  본다('🔴 ⑪ 승인이 바뀌면 잡는다',
    달라진것(앞, { ...앞, 승인: '미승인' }).some((m) => /승인 상태가 바뀌었다/.test(m)));
  본다('🔴 ⑫ 본문이 크게 줄면 잡는다',
    달라진것(앞, { ...앞, 본문길이: 100 }).some((m) => /본문 길이가 크게 달라졌다/.test(m)));
  본다('⑬ 이름 길이 차이 정도는 안 잡는다', 달라진것(앞, { ...앞, 본문길이: 24060 }).length === 0);
  /* 찾는 글자를 그대로 적으면 이 줄 자신이 걸린다 — 쪼개서 적는다 */
  본다('⛔ ⑭ 다른 중부매일 파일을 들여오지 않는다', (() => {
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
  '  var ta = d.querySelector("textarea[name=articleBody], textarea#articleBody, textarea[name=content]");',
  '  if (ta) { 본문 = ta.value || ""; 어디 = "textarea"; }',
  '  if (!본문) { var f = d.querySelector("iframe");',
  '    try { if (f && f.contentDocument) { 본문 = f.contentDocument.body.innerHTML || ""; 어디 = "iframe"; } } catch (e) {} }',
  '  return JSON.stringify({',
  '    제목: v("input[name=title], #title"),',
  '    분류: 작은 ? 작은.value : "",',
  '    승인: 승인,',
  '    예약: (v("input[name=articleDate]") + " " + v("input[name=articleTime]")).trim(),',
  '    줄파일: 장 ? (장.getAttribute("data-image") || "") : "",',
  '    설명: 장 ? (((장.querySelector(".caption")||{}).textContent)||"").trim() : "",',
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
    '  var 새글 = ' + JSON.stringify(새본문) + ';',
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

async function 한편맞추기(기사번호) {
  const 앞 = await 한편읽기(기사번호);
  if (!앞) return { 결과: '🔴 서식을 못 읽었다' };
  if (!앞.줄파일) return { 결과: '🔴 사진 줄이 없다', 앞 };
  const 지금것 = 본문속사진들(앞.본문, 기사번호);
  if (!지금것.length) return { 결과: '🔴 본문에 사진이 없다', 앞 };
  if (지금것.length === 1 && 지금것[0] === 앞.줄파일) {
    return { 결과: '이미 맞다', 앞, 건너뜀: true };
  }

  const 고침 = 본문고치기(앞.본문, 기사번호, 앞.줄파일);
  if (!고침.바꾼수) return { 결과: '🔴 바꿀 것을 못 찾았다', 앞 };

  let 넣음 = '못 했다';
  let 눌림 = '못 했다';
  await 새탭에서(서식주소(기사번호), async (붙음) => {
    await 자리잡기(붙음, { 최대: 45000 });
    await new Promise((r) => setTimeout(r, 6000));
    넣음 = String(await 재기(붙음, 본문넣는글(고침.글, 앞.본문어디), 40000));
    if (넣음 !== '넣었다') return;
    await new Promise((r) => setTimeout(r, 1500));
    /* ⛔ 승인 라디오는 건드리지 않는다 */
    눌림 = String(await 재기(붙음, 저장글, 25000));
    if (눌림 === '눌렀다') await new Promise((r) => setTimeout(r, 12000));
  });
  if (넣음 !== '넣었다') return { 결과: '🔴 본문을 못 넣었다 — ' + 넣음, 앞 };
  if (눌림 !== '눌렀다') return { 결과: '🔴 저장을 못 눌렀다 — ' + 눌림, 앞 };

  const 뒤 = await 한편읽기(기사번호);
  if (!뒤) return { 결과: '🔴 되읽지 못했다', 앞 };
  const 뒤것 = 본문속사진들(뒤.본문, 기사번호);
  const 맞았나 = 뒤것.length === 1 && 뒤것[0] === 뒤.줄파일;
  const 흠 = 달라진것(앞, 뒤);
  let 결과 = 맞았나 ? '맞췄다 (' + 고침.바꾼수 + '곳)' : '🔴 안 맞았다 — 지금 ' + 뒤것.join(',');
  if (흠.length) 결과 += ' · ' + 흠.join(' · ');
  return { 결과, 앞, 뒤 };
}

/* ── 돌린다 ──────────────────────────────────────────────────────────── */
const 인자 = process.argv.slice(2);
const 부터인자 = 인자.indexOf('--부터');
const 부터 = 부터인자 >= 0 ? 인자[부터인자 + 1] : 기본부터;
const 한편인자 = 인자.indexOf('--한편');
const 한편만 = 한편인자 >= 0 ? 인자[한편인자 + 1] : '';
const 정말맞추나 = 인자.includes('--맞춘다');

const 읽기 = (p) => { try { return fs.readFileSync(path.join(뿌리, p), 'utf8'); } catch { return ''; } };
const 목록인자 = 인자.indexOf('--list');
const 목록길 = 목록인자 >= 0 ? 인자[목록인자 + 1] : '';
function 목록에서대상(글) {
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
let 대상 = 목록길
  ? 목록에서대상(fs.readFileSync(목록길, 'utf8'))
  : 대상모으기(읽기(기록파일.띠별), 읽기(기록파일.별자리), 부터);
if (한편만) 대상 = 대상.filter((x) => String(x.번호) === String(한편만));

function 오늘() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
    + '-' + String(d.getDate()).padStart(2, '0');
}

console.log('■ ' + 부터 + ' 부터 — 대상 ' + 대상.length + '편');
console.log('■ 본문 속 사진 주소를 실제 올라간 파일로 맞춘다');
console.log('⛔ 승인 라디오와 본문의 다른 글자는 건드리지 않는다\n');

if (!정말맞추나) {
  for (const x of 대상) {
    const 것 = await 한편읽기(x.번호);
    if (!것) { console.log('  ' + x.날 + '  ' + x.갈래 + '  ' + x.번호 + '  🔴 못 읽었다'); continue; }
    const 본문것 = 본문속사진들(것.본문, x.번호);
    const 같나 = 본문것.length === 1 && 본문것[0] === 것.줄파일;
    console.log('  ' + x.날 + '  ' + x.갈래.padEnd(4) + '  ' + x.번호
      + '  줄=' + (것.줄파일 || '(없다)')
      + '  본문=' + (본문것.join(',') || '(없다)')
      + '  ' + (같나 ? '✅ 같다' : '🔴 다르다'));
  }
  console.log('\n■ 읽기만 했다. 맞추려면 --맞춘다 를 붙인다');
  process.exit(0);
}

const 줄들 = [];
let 됨 = 0; let 건너뜀 = 0; let 탈 = 0;
for (const x of 대상) {
  const r = await 한편맞추기(x.번호);
  if (/^맞췄다/.test(r.결과)) 됨 += 1;
  else if (r.건너뜀) 건너뜀 += 1;
  else 탈 += 1;
  console.log('  ' + x.날 + '  ' + x.갈래.padEnd(4) + '  ' + x.번호 + '  ' + r.결과);
  줄들.push([오늘(), x.번호, x.갈래, (r.앞 && r.앞.줄파일) || '', r.결과].join('\t'));
}

const 기록길 = path.join(뿌리, 맞춘기록);
if (!fs.existsSync(기록길)) fs.writeFileSync(기록길, '# 날\t기사번호\t갈래\t실제파일\t결과\n', 'utf8');
fs.appendFileSync(기록길, 줄들.join('\n') + '\n', 'utf8');

console.log('\n■ 맞췄다 ' + 됨 + '편 · 이미 맞음 ' + 건너뜀 + '편 · 🔴 탈 ' + 탈 + '편');
console.log('✔ 적었다 — ' + 맞춘기록);
process.exit(탈 ? 1 : 0);
