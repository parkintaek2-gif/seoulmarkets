#!/usr/bin/env node
/**
 * 중부매일-도움말링크-맞춘다.mjs
 *   — 운세 기사 본문 끝 「도움말:」 자리의 KLifeMap 링크를 **갈래에 맞는 최종 주소**로 맞춘다.
 *
 * 🔴 [2026-11-23 · 사장님] 「도움말에 링크 제대로 걸고」
 *
 * [무엇이 있었나] 예약 24편 가운데 14편이 집 대문(https://klifemap.ai/)만 걸려 있었다.
 *   띠별 운세를 읽고 온 사람이 띠별 지면이 아니라 첫 화면에 떨어진다.
 *   남은 5편은 https://klifemap.ai/unse 인데, 그 주소는 301 로 /unse/ 에 간다.
 *   한 번 더 도는 주소를 걸어 둘 까닭이 없다.
 *
 * 걸 주소 (2026-11-23 에 실제로 재서 정했다)
 *   띠별    https://klifemap.ai/unse/        (unse 는 301 → unse/ · unse/ 는 200)
 *   별자리  https://klifemap.ai/horoscope    (200)
 *
 * 무엇을 하나
 *   ① 기사 수정 서식을 연다
 *   ② 본문에서 klifemap.ai 를 가리키는 a 태그의 href 와 data-cke-saved-href 를 찾는다
 *   ③ 갈래에 맞는 주소와 다르면 바꾸고 저장한다
 *   ④ 되읽어 승인·예약·제목이 그대로인지 보고, 링크가 들어갔는지 본다
 *
 * ⛔ 승인 라디오를 건드리지 않는다 (사장님 2026-11-22)
 * ⛔ 제목·분류·본문의 다른 글자를 건드리지 않는다 — 링크 주소만 바꾼다
 * ⛔ 다른 중부매일 파일을 들여오지 않는다
 *
 * 쓰는 법
 *   node scripts/중부매일-도움말링크-맞춘다.mjs --list <목록.tsv>
 *   node scripts/중부매일-도움말링크-맞춘다.mjs --list <목록.tsv> --맞춘다
 *   node scripts/중부매일-도움말링크-맞춘다.mjs --자체검사
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 여기 = path.dirname(fileURLToPath(import.meta.url));
const 뿌리 = path.join(여기, '..');

export const 갈래별주소 = {
  띠별: 'https://klifemap.ai/unse/',
  별자리: 'https://klifemap.ai/horoscope',
};
export const 집 = 'klifemap.ai';
export const 기록파일 = 'docs/중부매일-도움말링크-기록.tsv';
export const 서식주소 = (n) => 'https://cms.jbnews.com/news/adminArticleWriteForm.html?mode=modify&idxno=' + n;

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

/** 본문에 들어 있는 klifemap 링크 주소들 */
export function 지금링크들(본문) {
  const 글 = String(본문 ?? '');
  const 모 = [];
  const 자 = /(?:data-cke-saved-href|href)\s*=\s*["']([^"']*klifemap\.ai[^"']*)["']/gi;
  let m;
  while ((m = 자.exec(글))) 모.push(m[1]);
  return [...new Set(모)];
}

/**
 * 링크 주소만 갈아 끼운다. 글자·태그·다른 속성은 건드리지 않는다.
 * href 와 data-cke-saved-href 둘 다 바꾼다 — 편집기가 둘을 함께 쥔다.
 */
export function 링크고치기(본문, 바른주소) {
  const 글 = String(본문 ?? '');
  if (!바른주소) return { 글, 바꾼수: 0 };
  let 바꾼수 = 0;
  const 새글 = 글.replace(
    /((?:data-cke-saved-href|href)\s*=\s*)(["'])([^"']*klifemap\.ai[^"']*)\2/gi,
    (통째, 앞, 따옴표, 주소) => {
      if (주소 === 바른주소) return 통째;
      바꾼수 += 1;
      return 앞 + 따옴표 + 바른주소 + 따옴표;
    },
  );
  return { 글: 새글, 바꾼수 };
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

  const 실물 = '<p style="font-size:16px;margin:16px 0 4px;">도움말: '
    + '<a data-cke-saved-href="https://klifemap.ai/" href="https://klifemap.ai/" '
    + 'rel="noopener" target="_blank">KLifeMap.AI</a></p>';

  본다('① 목록 파일에서 대상을 읽는다', (() => {
    const 것 = 목록에서대상('2026-11-29\t1516529\t띠별\n2026-11-29\t1516530\t별자리');
    return 것.length === 2 && 것[1].갈래 === '별자리';
  })());
  본다('② 번호가 아닌 줄은 안 받는다', 목록에서대상('2026-11-29\tabc\t띠별').length === 0);

  본다('③ 지금 걸린 주소를 읽는다',
    JSON.stringify(지금링크들(실물)) === JSON.stringify(['https://klifemap.ai/']));
  본다('④ 두 속성을 한 주소로 센다', 지금링크들(실물).length === 1);

  const 고침 = 링크고치기(실물, 갈래별주소.띠별);
  본다('⑤ 두 자리를 다 바꾼다', 고침.바꾼수 === 2);
  본다('⑥ 바꾼 뒤 주소가 하나다',
    JSON.stringify(지금링크들(고침.글)) === JSON.stringify([갈래별주소.띠별]));
  본다('⑦ 글자와 다른 속성은 그대로다',
    고침.글.includes('>KLifeMap.AI</a>') && 고침.글.includes('rel="noopener"')
    && 고침.글.includes('target="_blank"') && 고침.글.includes('도움말: '));
  본다('⑧ 이미 맞으면 한 곳도 안 바꾼다',
    링크고치기(고침.글, 갈래별주소.띠별).바꾼수 === 0);
  본다('⑨ 별자리는 다른 주소로 간다',
    링크고치기(실물, 갈래별주소.별자리).글.includes('href="https://klifemap.ai/horoscope"'));
  본다('⑩ 갈래마다 주소가 다르다', 갈래별주소.띠별 !== 갈래별주소.별자리);
  본다('⑪ 띠별 주소는 끝 빗금이 있다 — 301 을 한 번 덜 돈다',
    갈래별주소.띠별.endsWith('/unse/'));
  본다('⑫ 다른 집 링크는 안 건드린다', (() => {
    const 글 = '<a href="https://www.jbnews.com/abc">ㄱ</a>';
    return 링크고치기(글, 갈래별주소.띠별).바꾼수 === 0;
  })());
  본다('⑬ 본문이 비면 아무것도 안 한다', 링크고치기('', 갈래별주소.띠별).바꾼수 === 0);
  본다('⑭ 바른 주소가 없으면 안 건드린다', 링크고치기(실물, '').바꾼수 === 0);

  const 앞 = { 제목: 'ㄱ', 분류: 'S2N203', 승인: '승인', 예약: '2026-11-29 00:05' };
  본다('⑮ 아무것도 안 바뀌면 통과', 달라진것(앞, { ...앞 }).length === 0);
  본다('🔴 ⑯ 승인 상태가 바뀌면 잡는다',
    달라진것(앞, { ...앞, 승인: '미승인' }).some((m) => /승인 상태/.test(m)));
  본다('🔴 ⑰ 예약 시각이 바뀌면 잡는다',
    달라진것(앞, { ...앞, 예약: '2026-11-30 00:05' }).some((m) => /예약 시각/.test(m)));
  본다('⛔ ⑱ 승인 라디오를 누르는 글이 없다', (() => {
    const 글 = fs.readFileSync(new URL(import.meta.url), 'utf8');
    return !/recog-[ce]['"]?\s*\)?\s*\.\s*click|recog-[ce][^\n]*checked\s*=/.test(글);
  })());
  본다('⛔ ⑲ 다른 중부매일 파일을 들여오지 않는다', (() => {
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

async function 한편맞추기(기사번호, 갈래) {
  const 바른 = 갈래별주소[갈래];
  if (!바른) return { 결과: '🔴 갈래를 모른다 — ' + 갈래 };
  const 앞 = await 한편읽기(기사번호);
  if (!앞) return { 결과: '🔴 서식을 못 읽었다' };
  const 지금 = 지금링크들(앞.본문);
  if (!지금.length) return { 결과: '🔴 본문에 도움말 링크가 없다', 앞 };
  if (지금.length === 1 && 지금[0] === 바른) return { 결과: '이미 맞다', 앞, 뒤: 앞 };

  const 고침 = 링크고치기(앞.본문, 바른);
  if (!고침.바꾼수) return { 결과: '🔴 바꿀 것을 못 찾았다', 앞 };

  let 넣음 = '못 했다'; let 눌림 = '못 했다';
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
  const 뒤것 = 지금링크들(뒤.본문);
  const 맞았나 = 뒤것.length === 1 && 뒤것[0] === 바른;
  const 흠 = 달라진것(앞, 뒤);
  let 결과 = 맞았나 ? '맞췄다 (' + 고침.바꾼수 + '곳)' : '🔴 안 맞았다 — 지금 ' + 뒤것.join(',');
  if (흠.length) 결과 += ' · ' + 흠.join(' · ');
  return { 결과, 앞, 뒤 };
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
const 정말맞추나 = 인자.includes('--맞춘다');

if (!목록길) { console.log('🔴 --list <목록.tsv> 가 있어야 한다'); process.exit(1); }

const 대상 = 목록에서대상(fs.readFileSync(목록길, 'utf8'));
console.log('■ 대상 ' + 대상.length + '편');
console.log('■ 띠별 → ' + 갈래별주소.띠별 + '  ·  별자리 → ' + 갈래별주소.별자리);
console.log('⛔ 승인 라디오는 건드리지 않는다\n');

const 줄들 = [];
let 맞춤 = 0; let 이미 = 0; let 탈 = 0;
for (const x of 대상) {
  let r;
  if (정말맞추나) {
    r = await 한편맞추기(x.번호, x.갈래);
  } else {
    const 것 = await 한편읽기(x.번호);
    const 지금 = 것 ? 지금링크들(것.본문) : [];
    const 바른 = 갈래별주소[x.갈래] || '';
    const 말 = !것 ? '🔴 못 읽었다'
      : (지금.length === 1 && 지금[0] === 바른) ? '이미 맞다'
        : '🔴 지금 ' + (지금.join(',') || '(없다)');
    r = { 결과: 말 };
  }
  if (/^맞췄다/.test(r.결과)) 맞춤 += 1;
  else if (r.결과 === '이미 맞다') 이미 += 1;
  else 탈 += 1;
  console.log('  ' + x.날 + '  ' + String(x.갈래).padEnd(4) + '  ' + x.번호 + '  ' + r.결과);
  줄들.push([오늘(), x.번호, x.갈래, 갈래별주소[x.갈래] || '', r.결과].join('\t'));
}

const 기록길 = path.join(뿌리, 기록파일);
if (!fs.existsSync(기록길)) fs.writeFileSync(기록길, '# 날\t기사번호\t갈래\t걸주소\t결과\n', 'utf8');
fs.appendFileSync(기록길, 줄들.join('\n') + '\n', 'utf8');

console.log('\n■ 맞췄다 ' + 맞춤 + '편 · 이미 맞음 ' + 이미 + '편 · 🔴 탈 ' + 탈 + '편');
console.log('✔ 적었다 — ' + 기록파일);
