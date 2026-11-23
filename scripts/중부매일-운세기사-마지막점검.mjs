#!/usr/bin/env node
/**
 * 중부매일-운세기사-마지막점검.mjs
 *   — 예약된 운세 기사가 **손님 화면에 나올 때 갖춰야 할 것**을 한자리에서 잰다.
 *
 * 🔴 [2026-11-23 · 사장님] 「사진, 사진설명 다 넣으라고」 「도움말에 링크 제대로 걸고」
 *                          「분류도 잘 해」 「제대로 해」
 *
 * [왜 만들었나] 사진 설명을 CMS 라이브러리 칸에서만 재고 「들어갔다」고 적었다가
 *   지면에는 한 글자도 안 나오는 것을 사장님께 들켰다. 재는 자리가 손님 화면이
 *   아니면 아무리 초록불이 많아도 거짓이다. 그래서 **본문 글자로** 잰다.
 *
 * 여섯 가지를 잰다
 *   ① 분류가 오늘의 운세(S2N203) 인가
 *   ② 대표 사진이 본문에 있나
 *   ③ 그 사진이 figure 로 감싸여 있나 — 감싸이지 않으면 설명이 안 그려진다
 *   ④ figcaption 글이 그 날 그 갈래의 설명과 똑같은가
 *   ⑤ 도움말 링크가 갈래에 맞는 주소인가
 *   ⑥ 띠·별자리 그림 열두 장이 그대로 있나 — 본문을 갈아 끼울 때 잃기 쉽다
 *
 * ⛔ 읽기만 한다. 아무것도 고치지 않는다
 * ⛔ 다른 중부매일 파일을 들여오지 않는다
 *
 * 쓰는 법
 *   node scripts/중부매일-운세기사-마지막점검.mjs --list <목록.tsv>
 *   node scripts/중부매일-운세기사-마지막점검.mjs --자체검사
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 여기 = path.dirname(fileURLToPath(import.meta.url));
const 뿌리 = path.join(여기, '..');

export const 바른분류 = 'S2N203';
export const 갈래별도움말 = {
  띠별: 'https://klifemap.ai/unse/',
  별자리: 'https://klifemap.ai/horoscope',
};
export const 작은그림수 = 12;
export const 기록파일 = 'docs/중부매일-운세기사-점검기록.tsv';
export const 서식주소 = (n) => 'https://cms.jbnews.com/news/adminArticleWriteForm.html?mode=modify&idxno=' + n;

export function 설명글만들기(날, 갈래) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(날 || ''));
  if (!m) return '';
  return '오늘의 운세 ' + m[1] + '년 ' + String(Number(m[2])) + '월 '
    + String(Number(m[3])) + '일 ' + 갈래 + ' 운세. / KLifeMap.AI';
}

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

/** 본문 글자를 여섯 가지로 가른다 */
export function 잰다(본문, 분류, 기사번호, 날, 갈래) {
  const 글 = String(본문 ?? '');
  const 안전 = String(기사번호).replace(/[^0-9]/g, '');
  const 설명 = 설명글만들기(날, 갈래);
  const 바른도움말 = 갈래별도움말[갈래] || '';

  const 사진자 = new RegExp(안전 + '_\\d+_\\d+\\.(?:png|jpg|jpeg|gif)', 'i');
  const 사진있나 = 안전 ? 사진자.test(글) : false;

  /* figure 안에 그 사진이 들어 있나 */
  let 피겨감쌌나 = false;
  for (const 조각 of 글.match(/<figure[\s\S]{0,2000}?<\/figure>/gi) || []) {
    if (안전 && 사진자.test(조각)) { 피겨감쌌나 = true; break; }
  }

  const 캡션들 = (글.match(/<figcaption[^>]*>([\s\S]{0,400}?)<\/figcaption>/gi) || [])
    .map((x) => x.replace(/<[^>]*>/g, '').trim());
  const 캡션맞나 = Boolean(설명) && 캡션들.some((c) => c === 설명);

  const 도움말들 = [...new Set(
    (글.match(/(?:data-cke-saved-href|href)\s*=\s*["']([^"']*klifemap\.ai[^"']*)["']/gi) || [])
      .map((x) => (/["']([^"']+)["']/.exec(x) || [])[1])
      .filter(Boolean),
  )];
  const 도움말맞나 = Boolean(바른도움말) && 도움말들.length === 1 && 도움말들[0] === 바른도움말;

  const 작은그림 = (글.match(/klifemap\.ai\/astro\/[^"']+\.(?:png|jpg|jpeg|gif)/gi) || []).length;

  const 흠 = [];
  if (분류 !== 바른분류) 흠.push('분류 ' + (분류 || '빈칸'));
  if (!사진있나) 흠.push('대표 사진 없음');
  if (!피겨감쌌나) 흠.push('figure 아님 — 설명이 안 그려진다');
  if (!캡션맞나) 흠.push('사진 설명 ' + (캡션들.length ? '다름: ' + 캡션들[0].slice(0, 40) : '없음'));
  if (!도움말맞나) 흠.push('도움말 ' + (도움말들.join(',') || '없음'));
  if (작은그림 !== 작은그림수) 흠.push('작은 그림 ' + 작은그림 + '장');

  return {
    좋나: 흠.length === 0,
    흠,
    분류, 사진있나, 피겨감쌌나, 캡션맞나, 도움말맞나, 작은그림,
    설명, 도움말들,
  };
}

/* ── 자체 검사 ───────────────────────────────────────────────────────── */
if (process.argv.includes('--자체검사')) {
  let 통 = 0; let 탈 = 0;
  const 본다 = (이름, 참) => {
    if (참) { 통 += 1; console.log('  ✅ ' + 이름); } else { 탈 += 1; console.log('  🔴 ' + 이름); }
  };

  const 설명 = 설명글만들기('2026-11-24', '띠별');
  const 작은들 = Array.from({ length: 12 }, (_, i) => (
    '<img src="https://klifemap.ai/astro/ddi-color/' + String(i + 1).padStart(2, '0') + '-x.png" />'
  )).join('');
  const 온전한 = '<figure class="photo-layout image photo_1372123 float-center" data-idxno="1372123">'
    + '<img alt="' + 설명 + '" src="https://cdn.jbnews.com/news/photo/202611/1516338_1372123_485.png" />'
    + '<figcaption>' + 설명 + '</figcaption></figure>'
    + '<p>본문</p>' + 작은들
    + '<p>도움말: <a href="https://klifemap.ai/unse/">KLifeMap.AI</a></p>';

  본다('① 사장님 글꼴 그대로다',
    설명글만들기('2026-11-19', '별자리') === '오늘의 운세 2026년 11월 19일 별자리 운세. / KLifeMap.AI');
  본다('② 온전한 기사는 흠이 없다', 잰다(온전한, 'S2N203', '1516338', '2026-11-24', '띠별').좋나);

  본다('🔴 ③ 분류가 다르면 잡는다',
    잰다(온전한, 'S2N157', '1516338', '2026-11-24', '띠별').흠.some((x) => /분류/.test(x)));
  본다('🔴 ④ figure 가 아니면 잡는다', (() => {
    const 맨것 = 온전한.replace(/<figure[\s\S]*?<\/figure>/i,
      '<p><img src="https://cdn.jbnews.com/news/photo/202611/1516338_1372123_485.png" /></p>');
    const r = 잰다(맨것, 'S2N203', '1516338', '2026-11-24', '띠별');
    return r.사진있나 === true && r.피겨감쌌나 === false && r.흠.some((x) => /figure/.test(x));
  })());
  본다('🔴 ⑤ 설명 글이 다르면 잡는다', (() => {
    const 딴것 = 온전한.replace('<figcaption>' + 설명, '<figcaption>딴 설명');
    return 잰다(딴것, 'S2N203', '1516338', '2026-11-24', '띠별').흠.some((x) => /사진 설명/.test(x));
  })());
  본다('🔴 ⑥ 사진이 아예 없으면 잡는다',
    잰다('<p>글만</p>', 'S2N203', '1516338', '2026-11-24', '띠별').흠.some((x) => /대표 사진/.test(x)));
  본다('🔴 ⑦ 도움말이 집 대문이면 잡는다', (() => {
    const 대문 = 온전한.replace('https://klifemap.ai/unse/', 'https://klifemap.ai/');
    return 잰다(대문, 'S2N203', '1516338', '2026-11-24', '띠별').흠.some((x) => /도움말/.test(x));
  })());
  본다('🔴 ⑧ 작은 그림이 모자라면 잡는다', (() => {
    const 모자란 = 온전한.replace('<img src="https://klifemap.ai/astro/ddi-color/01-x.png" />', '');
    const r = 잰다(모자란, 'S2N203', '1516338', '2026-11-24', '띠별');
    return r.작은그림 === 11 && r.흠.some((x) => /작은 그림/.test(x));
  })());
  본다('⑨ 별자리는 다른 도움말 주소를 본다', (() => {
    const 별 = 온전한
      .replace('https://klifemap.ai/unse/', 'https://klifemap.ai/horoscope')
      .replace(new RegExp(설명, 'g'), 설명글만들기('2026-11-24', '별자리'));
    return 잰다(별, 'S2N203', '1516338', '2026-11-24', '별자리').좋나;
  })());
  본다('🔴 ⑩ 갈래가 뒤바뀌면 잡는다',
    !잰다(온전한, 'S2N203', '1516338', '2026-11-24', '별자리').좋나);
  본다('⑪ 목록 파일에서 대상을 읽는다',
    목록에서대상('2026-11-24\t1516338\t띠별').length === 1);
  본다('⛔ ⑫ 고치는 글이 없다 — 읽기만 한다', (() => {
    const 글 = fs.readFileSync(new URL(import.meta.url), 'utf8');
    return !/setData\s*\(|\.click\s*\(\)|innerHTML\s*=/.test(글);
  })());
  본다('⛔ ⑬ 다른 중부매일 파일을 들여오지 않는다', (() => {
    const 찾을것 = 'from ' + String.fromCharCode(39) + './' + '중부매일' + '-';
    return !fs.readFileSync(new URL(import.meta.url), 'utf8').includes(찾을것);
  })());

  console.log(탈 ? '\n🔴 자체 검사 ' + 탈 + '건 탈' : '\n✅ 자체 검사 ' + 통 + ' 통과');
  process.exit(탈 ? 1 : 0);
}

/* ── 여기서부터 CMS 를 읽는다 ────────────────────────────────────────── */
const { 새탭에서, 자리잡기, 재기 } = await import('./lib/cdp.mjs');

const 읽는글 = [
  '(function(){',
  '  var d = document;',
  '  var v = function(s){ var e = d.querySelector(s); return e ? (e.value || "") : ""; };',
  '  var 작은 = d.querySelector("#subSectionCode, select[name=subSectionCode]");',
  '  var 승인칸 = d.querySelector("#recog-e");',
  '  var 미승인칸 = d.querySelector("#recog-c");',
  '  var 승인 = "모름";',
  '  if (승인칸 && 승인칸.checked) 승인 = "승인";',
  '  else if (미승인칸 && 미승인칸.checked) 승인 = "미승인";',
  '  var 본문 = "";',
  '  try {',
  '    if (window.CKEDITOR) {',
  '      var 이름들 = Object.keys(CKEDITOR.instances || {});',
  '      for (var i = 0; i < 이름들.length; i++) {',
  '        var e1 = CKEDITOR.instances[이름들[i]];',
  '        if (e1 && e1.getData) { 본문 = e1.getData() || ""; break; }',
  '      }',
  '    }',
  '  } catch (e) {}',
  '  return JSON.stringify({',
  '    제목: v("input[name=title], #title"),',
  '    분류: 작은 ? 작은.value : "",',
  '    승인: 승인,',
  '    예약: (v("input[name=articleDate]") + " " + v("input[name=articleTime]")).trim(),',
  '    본문길이: 본문.length,',
  '    본문: 본문',
  '  });',
  '})()',
].join('\n');

async function 한편읽기(기사번호) {
  let 것 = null;
  await 새탭에서(서식주소(기사번호), async (붙음) => {
    await 자리잡기(붙음, { 최대: 45000 });
    await new Promise((r) => setTimeout(r, 6000));
    try { 것 = JSON.parse(String(await 재기(붙음, 읽는글, 30000))); } catch (e) { 것 = null; }
  });
  return 것;
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
if (!목록길) { console.log('🔴 --list <목록.tsv> 가 있어야 한다'); process.exit(1); }

const 대상 = 목록에서대상(fs.readFileSync(목록길, 'utf8'));
console.log('■ 대상 ' + 대상.length + '편 — 여섯 가지를 잰다');
console.log('■ 분류 · 대표 사진 · figure · 사진 설명 · 도움말 링크 · 작은 그림 12장');
console.log('⛔ 읽기만 한다\n');

const 줄들 = [];
let 좋음 = 0; let 흠난것 = 0;
for (const x of 대상) {
  const 것 = await 한편읽기(x.번호);
  if (!것) {
    흠난것 += 1;
    console.log('  ' + x.날 + '  ' + x.갈래.padEnd(4) + '  ' + x.번호 + '  🔴 못 읽었다');
    줄들.push([오늘(), x.번호, x.갈래, '못 읽었다'].join('\t'));
    continue;
  }
  const r = 잰다(것.본문, 것.분류, x.번호, x.날, x.갈래);
  if (r.좋나) 좋음 += 1; else 흠난것 += 1;
  const 말 = r.좋나
    ? '✅ 여섯 가지 다 됐다 · 승인=' + 것.승인 + ' · 예약=' + (것.예약 || '(빈칸)')
    : '🔴 ' + r.흠.join(' · ');
  console.log('  ' + x.날 + '  ' + x.갈래.padEnd(4) + '  ' + x.번호 + '  ' + 말);
  줄들.push([오늘(), x.번호, x.갈래, r.좋나 ? '다 됐다' : r.흠.join(' / ')].join('\t'));
}

const 기록길 = path.join(뿌리, 기록파일);
if (!fs.existsSync(기록길)) fs.writeFileSync(기록길, '# 날\t기사번호\t갈래\t결과\n', 'utf8');
fs.appendFileSync(기록길, 줄들.join('\n') + '\n', 'utf8');

console.log('\n■ 다 된 것 ' + 좋음 + '편 · 🔴 흠 ' + 흠난것 + '편');
console.log('✔ 적었다 — ' + 기록파일);
process.exit(흠난것 ? 1 : 0);
