#!/usr/bin/env node
/**
 * 중부매일-분류와도움말.mjs
 *   — 예약된 운세 기사의 **작은 분류를 「오늘의 운세」로 맞추고**, 본문 끝 도움말의
 *     KLifeMap 링크가 제대로 걸렸는지 잰다.
 *
 * 🔴 [2026-11-23 · 사장님] 「예약기사 24편이야. 다 작업해. 분류도 잘 해」
 *                          「도움말에 링크 제대로 걸고」
 *
 * [무엇이 있었나] CMS 예약기사 24편 가운데 13편이 작은 분류가 「연재」(S2N157) 였다.
 *   나머지 11편은 「오늘의 운세」(S2N203) 다. 같은 기사 묶음이 두 자리로 갈려 있었다.
 *
 * 무엇을 하나
 *   ① 기사 수정 서식을 연다
 *   ② 작은 분류를 읽는다. S2N203 이면 건너뛴다
 *   ③ 아니면 S2N203 으로 바꾸고 저장한다
 *   ④ 본문에서 도움말의 링크를 찾아 적는다
 *   ⑤ 되읽어 승인·예약·제목·본문 길이가 그대로인지 본다
 *
 * ⛔ 승인 라디오를 건드리지 않는다 (사장님 2026-11-22 「미승인 체크하지말고」)
 * ⛔ 제목·본문·큰 분류를 건드리지 않는다
 * ⛔ 다른 중부매일 파일을 들여오지 않는다
 *
 * 쓰는 법
 *   node scripts/중부매일-분류와도움말.mjs --list <목록.tsv>
 *   node scripts/중부매일-분류와도움말.mjs --list <목록.tsv> --맞춘다
 *   node scripts/중부매일-분류와도움말.mjs --자체검사
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 여기 = path.dirname(fileURLToPath(import.meta.url));
const 뿌리 = path.join(여기, '..');

export const 바른작은분류 = 'S2N203';          /* 기획·특집 > 오늘의 운세 */
export const 바른큰분류 = 'S1N29';
export const 도움말집 = 'klifemap.ai';
export const 기록파일 = 'docs/중부매일-분류와도움말-기록.tsv';
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

/** 본문에서 도움말 자리의 KLifeMap 링크를 뽑는다 */
export function 도움말링크찾기(본문) {
  const 글 = String(본문 ?? '');
  const 모 = [];
  const 자 = /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>/gi;
  let m;
  while ((m = 자.exec(글))) {
    const 주소 = m[1];
    if (주소.toLowerCase().includes(도움말집)) 모.push(주소);
  }
  return [...new Set(모)];
}

/** 도움말 주소가 글자로만 있고 링크가 아니면 그것이 흠이다 */
export function 도움말판정(본문) {
  const 글 = String(본문 ?? '');
  const 링크 = 도움말링크찾기(글);
  if (링크.length) return { 좋나: true, 말: '링크 ' + 링크.join(' '), 링크 };
  if (글.toLowerCase().includes(도움말집)) {
    return { 좋나: false, 말: '🔴 주소가 글자로만 있다 — 링크가 아니다', 링크: [] };
  }
  return { 좋나: false, 말: '🔴 도움말 링크가 없다', 링크: [] };
}

export function 달라진것(앞, 뒤) {
  const 것 = [];
  if (뒤.승인 !== 앞.승인) 것.push('🔴 승인 상태가 바뀌었다 ' + 앞.승인 + ' → ' + 뒤.승인);
  if (뒤.예약 !== 앞.예약) 것.push('🔴 예약 시각이 바뀌었다 ' + 앞.예약 + ' → ' + 뒤.예약);
  if (뒤.제목 !== 앞.제목) 것.push('🔴 제목이 바뀌었다');
  if (뒤.큰분류 !== 앞.큰분류) 것.push('🔴 큰 분류가 바뀌었다 ' + 앞.큰분류 + ' → ' + 뒤.큰분류);
  if (Number(뒤.본문길이) !== Number(앞.본문길이)) {
    것.push('🔴 본문 길이가 바뀌었다 ' + 앞.본문길이 + ' → ' + 뒤.본문길이);
  }
  return 것;
}

/* ── 자체 검사 ───────────────────────────────────────────────────────── */
if (process.argv.includes('--자체검사')) {
  let 통 = 0; let 탈 = 0;
  const 본다 = (이름, 참) => {
    if (참) { 통 += 1; console.log('  ✅ ' + 이름); } else { 탈 += 1; console.log('  🔴 ' + 이름); }
  };

  본다('① 목록 파일에서 대상을 읽는다', (() => {
    const 것 = 목록에서대상('2026-11-24\t1516338\t띠별\n2026-11-24\t1516339\t별자리');
    return 것.length === 2 && 것[0].번호 === '1516338' && 것[1].갈래 === '별자리';
  })());
  본다('② 머리 줄과 빈 줄은 건너뛴다',
    목록에서대상('# 날\t번호\t갈래\n\n2026-12-05\t1516542\t별자리').length === 1);
  본다('③ 번호가 아닌 줄은 안 받는다', 목록에서대상('2026-12-05\tabc\t별자리').length === 0);

  본다('④ a 태그 속 링크를 찾는다',
    도움말링크찾기('<a href="https://klifemap.ai/unse">더 보기</a>')[0] === 'https://klifemap.ai/unse');
  본다('⑤ 같은 링크를 두 번 세지 않는다',
    도움말링크찾기('<a href="https://klifemap.ai/unse">ㄱ</a><a href="https://klifemap.ai/unse">ㄴ</a>').length === 1);
  본다('⑥ 다른 집 링크는 안 센다',
    도움말링크찾기('<a href="https://example.com/unse">ㄱ</a>').length === 0);
  본다('⑦ 링크가 있으면 좋다고 본다',
    도움말판정('<a href="https://klifemap.ai/unse">ㄱ</a>').좋나 === true);
  본다('🔴 ⑧ 주소가 글자로만 있으면 흠으로 잡는다', (() => {
    const r = 도움말판정('자세한 것은 klifemap.ai/unse 에서 보세요');
    return r.좋나 === false && /글자로만/.test(r.말);
  })());
  본다('🔴 ⑨ 아예 없으면 흠으로 잡는다',
    도움말판정('<p>오늘의 운세입니다</p>').좋나 === false);

  const 앞 = { 제목: 'ㄱ', 큰분류: 'S1N29', 승인: '승인', 예약: '2026-12-05 00:05', 본문길이: 1200 };
  본다('⑩ 아무것도 안 바뀌면 통과', 달라진것(앞, { ...앞 }).length === 0);
  본다('🔴 ⑪ 승인 상태가 바뀌면 잡는다',
    달라진것(앞, { ...앞, 승인: '미승인' }).some((m) => /승인 상태/.test(m)));
  본다('🔴 ⑫ 예약 시각이 바뀌면 잡는다',
    달라진것(앞, { ...앞, 예약: '2026-12-06 00:05' }).some((m) => /예약 시각/.test(m)));
  본다('🔴 ⑬ 본문 길이가 바뀌면 잡는다',
    달라진것(앞, { ...앞, 본문길이: 900 }).some((m) => /본문 길이/.test(m)));
  본다('⛔ ⑭ 승인 라디오를 누르는 글이 없다', (() => {
    const 글 = fs.readFileSync(new URL(import.meta.url), 'utf8');
    return !/recog-[ce]['"]?\s*\)?\s*\.\s*click|recog-[ce][^\n]*checked\s*=/.test(글);
  })());
  본다('⛔ ⑮ 다른 중부매일 파일을 들여오지 않는다', (() => {
    const 찾을것 = 'from ' + String.fromCharCode(39) + './' + '중부매일' + '-';
    return !fs.readFileSync(new URL(import.meta.url), 'utf8').includes(찾을것);
  })());

  console.log(탈 ? '\n🔴 자체 검사 ' + 탈 + '건 탈' : '\n✅ 자체 검사 ' + 통 + ' 통과');
  process.exit(탈 ? 1 : 0);
}

/* ── 여기서부터 CMS 를 만진다 ────────────────────────────────────────── */
const { 새탭에서, 자리잡기, 재기 } = await import('./lib/cdp.mjs');

const 읽는글 = [
  '(() => {',
  '  const d = document;',
  '  const v = (s) => { const e = d.querySelector(s); return e ? (e.value || "") : ""; };',
  '  const 큰 = d.querySelector("#sectionCode, select[name=sectionCode]");',
  '  const 작은 = d.querySelector("#subSectionCode, select[name=subSectionCode]");',
  '  const 승인칸 = d.querySelector("#recog-e");',
  '  const 미승인칸 = d.querySelector("#recog-c");',
  '  let 승인 = "모름";',
  '  if (승인칸 && 승인칸.checked) 승인 = "승인";',
  '  else if (미승인칸 && 미승인칸.checked) 승인 = "미승인";',
  '  let 본문 = v("textarea[name=articleBody], textarea#articleBody, textarea[name=content]");',
  '  if (!본문) {',
  '    const f = [...d.querySelectorAll("iframe")].find((x) => {',
  '      try { return x.contentDocument && x.contentDocument.body; } catch (e) { return false; }',
  '    });',
  '    if (f) { try { 본문 = f.contentDocument.body.innerHTML || ""; } catch (e) { 본문 = ""; } }',
  '  }',
  '  return JSON.stringify({',
  '    제목: v("input[name=title], #title"),',
  '    큰분류: 큰 ? 큰.value : "",',
  '    작은분류: 작은 ? 작은.value : "",',
  '    작은분류이름: (작은 && 작은.selectedOptions[0]) ? (작은.selectedOptions[0].textContent || "").trim() : "",',
  '    승인,',
  '    예약: (v("input[name=articleDate]") + " " + v("input[name=articleTime]")).trim(),',
  '    본문길이: (본문 || "").length,',
  '    본문: (본문 || "").slice(-3000),',
  '  });',
  '})()',
].join('\n');

const 분류바꾸는글 = (값) => [
  '(() => {',
  '  const 작은 = document.querySelector("#subSectionCode, select[name=subSectionCode]");',
  '  if (!작은) return "작은 분류 칸이 없다";',
  '  const 있나 = [...작은.options].some((o) => o.value === ' + JSON.stringify(값) + ');',
  '  if (!있나) return "그 분류가 목록에 없다";',
  '  작은.value = ' + JSON.stringify(값) + ';',
  '  작은.dispatchEvent(new Event("input", { bubbles: true }));',
  '  작은.dispatchEvent(new Event("change", { bubbles: true }));',
  '  return 작은.value === ' + JSON.stringify(값) + ' ? "바꿨다" : "안 바뀌었다";',
  '})()',
].join('\n');

const 저장글 = [
  '(() => {',
  '  const b = document.querySelectorAll("button, a, input[type=button], input[type=submit]");',
  '  for (let i = 0; i < b.length; i++) {',
  '    const g = (b[i].innerText || b[i].value || "").trim();',
  '    if (g === "저장") { b[i].click(); return "눌렀다"; }',
  '  }',
  '  return "저장 단추를 못 찾았다";',
  '})()',
].join('\n');

async function 한편읽기(기사번호) {
  let 것 = null;
  await 새탭에서(서식주소(기사번호), async (붙음) => {
    await 자리잡기(붙음, { 최대: 45000 });
    await new Promise((r) => setTimeout(r, 4000));
    try { 것 = JSON.parse(String(await 재기(붙음, 읽는글, 30000))); } catch (e) { 것 = null; }
  });
  return 것;
}

async function 한편맞추기(기사번호) {
  const 앞 = await 한편읽기(기사번호);
  if (!앞) return { 결과: '🔴 서식을 못 읽었다' };
  if (앞.작은분류 === 바른작은분류) return { 결과: '이미 맞다', 앞, 뒤: 앞 };

  let 바꿈 = '못 했다';
  await 새탭에서(서식주소(기사번호), async (붙음) => {
    await 자리잡기(붙음, { 최대: 45000 });
    await new Promise((r) => setTimeout(r, 4500));
    바꿈 = String(await 재기(붙음, 분류바꾸는글(바른작은분류), 25000));
    if (바꿈 !== '바꿨다') return;
    /* ⛔ 승인 라디오를 건드리지 않는다. 저장만 누른다 */
    const 눌림 = String(await 재기(붙음, 저장글, 25000));
    if (눌림 !== '눌렀다') { 바꿈 = '🔴 ' + 눌림; return; }
    await new Promise((r) => setTimeout(r, 12000));
  });
  if (바꿈 !== '바꿨다') return { 결과: '🔴 ' + 바꿈, 앞 };

  const 뒤 = await 한편읽기(기사번호);
  if (!뒤) return { 결과: '🔴 되읽지 못했다', 앞 };
  const 흠 = 달라진것(앞, 뒤);
  let 결과 = 뒤.작은분류 === 바른작은분류 ? '맞췄다' : '🔴 분류가 안 들어갔다 — 지금 ' + 뒤.작은분류;
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
const 한편인자 = 인자.indexOf('--한편');
const 한편만 = 한편인자 >= 0 ? 인자[한편인자 + 1] : '';
const 정말맞추나 = 인자.includes('--맞춘다');

if (!목록길 && !한편만) {
  console.log('🔴 --list <목록.tsv> 나 --한편 <기사번호> 가 있어야 한다');
  process.exit(1);
}

let 대상 = 목록길 ? 목록에서대상(fs.readFileSync(목록길, 'utf8')) : [];
if (한편만) {
  대상 = 대상.length ? 대상.filter((x) => String(x.번호) === String(한편만))
    : [{ 날: '?', 번호: 한편만, 갈래: '?' }];
}

console.log('■ 대상 ' + 대상.length + '편');
console.log('■ 작은 분류를 ' + 바른작은분류 + '(오늘의 운세) 로 맞추고 도움말 링크를 잰다');
console.log('⛔ 승인 라디오는 건드리지 않는다\n');

const 줄들 = [];
let 맞춤 = 0; let 이미 = 0; let 탈 = 0; let 링크흠 = 0;
for (const x of 대상) {
  let r;
  if (정말맞추나) {
    r = await 한편맞추기(x.번호);
  } else {
    const 것 = await 한편읽기(x.번호);
    const 말 = 것
      ? (것.작은분류 === 바른작은분류 ? '이미 맞다' : '🔴 ' + 것.작은분류 + '(' + 것.작은분류이름 + ')')
      : '🔴 못 읽었다';
    r = { 결과: 말, 앞: 것, 뒤: 것 };
  }
  const 본 = r.뒤 || r.앞;
  const 도움 = 본 ? 도움말판정(본.본문) : { 좋나: false, 말: '🔴 못 읽었다' };
  if (!도움.좋나) 링크흠 += 1;
  if (r.결과 === '맞췄다') 맞춤 += 1;
  else if (r.결과 === '이미 맞다') 이미 += 1;
  else 탈 += 1;
  console.log('  ' + x.날 + '  ' + String(x.갈래).padEnd(4) + '  ' + x.번호
    + '  분류: ' + r.결과 + '  ·  도움말: ' + 도움.말);
  줄들.push([오늘(), x.번호, x.갈래, r.결과, 도움.말].join('\t'));
}

const 기록길 = path.join(뿌리, 기록파일);
if (!fs.existsSync(기록길)) fs.writeFileSync(기록길, '# 날\t기사번호\t갈래\t분류결과\t도움말\n', 'utf8');
fs.appendFileSync(기록길, 줄들.join('\n') + '\n', 'utf8');

console.log('\n■ 맞췄다 ' + 맞춤 + '편 · 이미 맞음 ' + 이미 + '편 · 🔴 탈 ' + 탈 + '편');
console.log('■ 도움말 링크 흠 ' + 링크흠 + '편');
console.log('✔ 적었다 — ' + 기록파일);
