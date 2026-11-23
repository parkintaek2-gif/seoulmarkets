#!/usr/bin/env node
/**
 * 중부매일-사진-넣는다.mjs
 *   — 예약된 운세 기사에 **대표 사진과 사진 설명**을 넣는다.
 *
 * 🔴🔴 [2026-11-23 · 사장님] 「**띠별 운세, 별자리운세 예약기사들에 대표사진 및 사진 설명 추가**」
 *
 * [무엇이 있었나] 11월 24일부터 28일까지 예약된 열 편에 대표 사진이 없다.
 *   사장님이 2026-11-18 에 「모든 운세 기사에 반드시 대표 이미지를 넣어」라고 이르셨고,
 *   날마다 도는 등록 도구는 그렇게 하고 있는데, 이 열 편은 그 전에 올린 것이다.
 *
 * 무엇을 하나
 *   ① 기사 수정 서식을 연다
 *   ② 사진 칸을 펼쳐 이미 있는지 본다 — 있으면 올리지 않는다(같은 그림이 쌓인 적이 있다)
 *   ③ 없으면 그림을 끌어다 놓아 올리고 저장한다
 *   ④ 사진 설명(캡션)을 사진 메뉴로 넣는다 — 본문의 설명 칸이 아니다
 *   ⑤ 다시 열어 되읽는다. 승인 상태와 예약 시각이 바뀌었으면 빨간불로 적는다
 *
 * ⛔ 승인 라디오를 건드리지 않는다 (사장님 2026-11-22 「미승인 체크하지말고」)
 * ⛔ 제목·본문·분류를 건드리지 않는다. 이 도구는 사진만 다룬다
 * ⛔ 「저장을 눌렀다」를 「들어갔다」로 읽지 않는다 — 되읽기를 통과해야 들어간 것이다
 * ⛔ 다른 중부매일 파일을 들여오지 않는다 — 들여오면 그 파일의 몸통이 돈다
 *
 * 쓰는 법
 *   node scripts/중부매일-사진-넣는다.mjs --잰다            (읽기만 한다)
 *   node scripts/중부매일-사진-넣는다.mjs --한편 1516338
 *   node scripts/중부매일-사진-넣는다.mjs --넣는다          (대상을 다 넣는다)
 *   node scripts/중부매일-사진-넣는다.mjs --자체검사
 *   덧:  --부터 2026-11-24
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 여기 = path.dirname(fileURLToPath(import.meta.url));
const 뿌리 = path.join(여기, '..');

/* ── 정해 둔 값 ──────────────────────────────────────────────────────── */
export const 기본부터 = '2026-11-24';

export const 그림 = {
  띠별: path.join('C:', 'Users', 'User', 'Documents', 'GitHub',
    'klifemap', 'public', 'astro', 'ttibyeol-hero-1200x630.png'),
  별자리: path.join('C:', 'Users', 'User', 'Documents', 'GitHub',
    'klifemap', 'public', 'astro', 'horoscope-hero-1200x630.png'),
};

export const 기록파일 = {
  띠별: 'docs/중부매일-띠별-등록기록.tsv',
  별자리: 'docs/중부매일-별자리-올린기록.tsv',
};
export const 넣은기록 = 'docs/중부매일-사진-넣은기록.tsv';
export const 서식주소 = (n) => 'https://cms.jbnews.com/news/adminArticleWriteForm.html?mode=modify&idxno=' + n;

/** 사진 설명 — 등록 도구가 쓰는 글꼴 그대로다 */
export function 설명글만들기(날, 갈래) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(날 || ''));
  if (!m) return '';
  const 달 = String(Number(m[2]));
  const 일 = String(Number(m[3]));
  return '오늘의 운세 ' + m[1] + '년 ' + 달 + '월 ' + 일 + '일 ' + 갈래 + ' 운세. / KLifeMap.AI';
}

/** 기록 글에서 「그 날부터」의 «날 → 기사 번호» */
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

/** 목록 파일(날/기사번호/갈래, 탭 구분)에서 대상을 읽는다 — CMS 예약기사 화면에서 집은 것 */
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

export function 대상모으기(띠글, 별글, 부터) {
  const 것 = [];
  for (const [날, 번호] of 날부터번호들(띠글, 부터)) 것.push({ 날, 번호, 갈래: '띠별' });
  for (const [날, 번호] of 날부터번호들(별글, 부터)) 것.push({ 날, 번호, 갈래: '별자리' });
  return 것.sort((a, b) => (a.날 === b.날 ? (a.갈래 < b.갈래 ? -1 : 1) : (a.날 < b.날 ? -1 : 1)));
}

/** 저장 앞뒤가 같은가 — 사진만 늘고 나머지는 그대로여야 한다 */
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

  본다('① 띠별 설명글이 등록 도구와 같은 꼴이다',
    설명글만들기('2026-11-19', '띠별') === '오늘의 운세 2026년 11월 19일 띠별 운세. / KLifeMap.AI');
  본다('② 별자리 설명글도 같은 꼴이다',
    설명글만들기('2026-11-19', '별자리') === '오늘의 운세 2026년 11월 19일 별자리 운세. / KLifeMap.AI');
  본다('③ 달과 날의 앞 0 을 뗀다',
    설명글만들기('2026-01-05', '띠별') === '오늘의 운세 2026년 1월 5일 띠별 운세. / KLifeMap.AI');
  본다('④ 날이 아니면 빈 글이다', 설명글만들기('아무날', '띠별') === '');

  const 띠 = [
    '# 날\t올린때\t승인\t됐나\t그림수\t주소',
    '2026-11-22\t..\t승인\t됐다\t12\thttps://cms.jbnews.com/news/articleView.html?idxno=1516334',
    '2026-11-24\t..\t승인\t됐다\t12\thttps://cms.jbnews.com/news/articleView.html?idxno=1516338',
  ].join('\n');
  const 별 = '2026-11-24\t..\t승인\t됐다\t12\thttps://cms.jbnews.com/news/articleView.html?idxno=1516339';

  본다('⑤ 그 날부터만 집는다',
    JSON.stringify(날부터번호들(띠, '2026-11-24')) === JSON.stringify([['2026-11-24', '1516338']]));
  본다('⑥ 두 갈래를 날짜 차례로 합친다', (() => {
    const 것 = 대상모으기(띠, 별, '2026-11-24');
    return 것.length === 2 && 것[0].갈래 === '띠별' && 것[1].갈래 === '별자리';
  })());
  본다('⑦ 갈래마다 그림이 다르다', 그림.띠별 !== 그림.별자리);
  본다('⑧ 그림 파일이 둘 다 있다', fs.existsSync(그림.띠별) && fs.existsSync(그림.별자리));

  const 앞 = { 제목: 'ㄱ', 분류: 'S2N203', 승인: '승인', 예약: '2026-11-24 00:02' };
  본다('⑨ 아무것도 안 바뀌면 통과', 달라진것(앞, { ...앞 }).length === 0);
  본다('🔴 ⑩ 승인 상태가 바뀌면 잡는다',
    달라진것(앞, { ...앞, 승인: '미승인' }).some((m) => /승인 상태가 바뀌었다/.test(m)));
  본다('🔴 ⑪ 예약 시각이 바뀌면 잡는다',
    달라진것(앞, { ...앞, 예약: '2026-11-25 00:02' }).some((m) => /예약 시각이 바뀌었다/.test(m)));
  본다('🔴 ⑫ 분류가 바뀌면 잡는다',
    달라진것(앞, { ...앞, 분류: 'S2N157' }).some((m) => /분류가 바뀌었다/.test(m)));
  /* 찾는 글자를 그대로 적으면 이 줄 자신이 걸린다 — 쪼개서 적는다 */
  본다('⛔ ⑬ 다른 중부매일 파일을 들여오지 않는다', (() => {
    const 찾을것 = 'from ' + String.fromCharCode(39) + './' + '중부매일' + '-';
    return !fs.readFileSync(new URL(import.meta.url), 'utf8').includes(찾을것);
  })());
  본다('⛔ ⑭ 승인 라디오를 누르는 글이 없다', (() => {
    const 글 = fs.readFileSync(new URL(import.meta.url), 'utf8');
    return !/recog-[ce]['"]?\s*\)?\s*\.\s*click|recog-[ce][^\n]*checked\s*=/.test(글);
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
  '  const 작은 = d.querySelector("#subSectionCode, select[name=subSectionCode]");',
  '  const 승인칸 = d.querySelector("#recog-e");',
  '  const 미승인칸 = d.querySelector("#recog-c");',
  '  let 승인 = "모름";',
  '  if (승인칸 && 승인칸.checked) 승인 = "승인";',
  '  else if (미승인칸 && 미승인칸.checked) 승인 = "미승인";',
  '  const 장 = d.querySelector(".library-photo");',
  '  return JSON.stringify({',
  '    제목: v("input[name=title], #title"),',
  '    큰분류: (d.querySelector("#sectionCode, select[name=sectionCode]") || {}).value || "",',
  '    분류: 작은 ? 작은.value : "",',
  '    승인,',
  '    예약: (v("input[name=articleDate]") + " " + v("input[name=articleTime]")).trim(),',
  '    사진있나: !!장,',
  '    사진설명: 장 ? (((장.querySelector(".caption") || {}).textContent) || "").trim() : "",',
  '  });',
  '})()',
].join('\n');

const 사진펼치기 = [
  '(() => {',
  '  const 제목 = [...document.querySelectorAll(".accordion-title")]',
  '    .find((e) => (e.textContent || "").trim() === "사진");',
  '  if (!제목) return "사진 칸이 없다";',
  '  const 속 = 제목.closest(".accordion-item").querySelector(".accordion-content");',
  '  if (!(속 && 속.offsetHeight > 0)) 제목.click();',
  '  제목.scrollIntoView({ block: "center" });',
  '  return "열었다";',
  '})()',
].join('\n');

const 떨굴자리 = [
  '(() => {',
  '  const 제목 = [...document.querySelectorAll(".accordion-title")]',
  '    .find((e) => (e.textContent || "").trim() === "사진");',
  '  const 속 = 제목 ? 제목.closest(".accordion-item").querySelector(".accordion-content") : null;',
  '  const 후보 = [...(속 ? 속.querySelectorAll("*") : [])]',
  '    .filter((e) => /마우스로 이미지를 끌어오거나/.test(e.textContent || ""))',
  '    .sort((a, b) => a.innerHTML.length - b.innerHTML.length);',
  '  if (!후보[0]) return "";',
  '  const 네모 = 후보[0].getBoundingClientRect();',
  '  return JSON.stringify({ x: 네모.left + 네모.width / 2, y: 네모.top + 네모.height / 2 });',
  '})()',
].join('\n');

const 사진센다 = [
  '(() => {',
  '  const 제목 = [...document.querySelectorAll(".accordion-title")]',
  '    .find((e) => (e.textContent || "").trim() === "사진");',
  '  const 속 = 제목 ? 제목.closest(".accordion-item").querySelector(".accordion-content") : null;',
  '  const 수 = 속 ? (속.innerText || "").split("대표").length - 1 : 0;',
  '  return 수 > 0 ? ("올라갔다 " + 수 + "장") : "안 올라갔다";',
  '})()',
].join('\n');

const 사진정보읽기 = [
  '(() => {',
  '  const 제목 = [...document.querySelectorAll(".accordion-title")]',
  '    .find((e) => (e.textContent || "").trim() === "사진");',
  '  if (!제목) return "";',
  '  const 속 = 제목.closest(".accordion-item").querySelector(".accordion-content");',
  '  if (!(속 && 속.offsetHeight > 0)) 제목.click();',
  '  const 장 = document.querySelector(".library-photo");',
  '  if (!장) return "";',
  '  return JSON.stringify({',
  '    사진번호: 장.getAttribute("data-idxno") || "",',
  '    기사번호: 장.getAttribute("data-article_idxno") || "",',
  '    방: 장.getAttribute("data-subuploaddir") || "",',
  '    그림: 장.getAttribute("data-image") || "",',
  '    걸음: 장.getAttribute("data-step") || "1",',
  '    대표: 장.getAttribute("data-representation") || "Y",',
  '    이미적힌설명: (((장.querySelector(".caption") || {}).textContent) || "").trim(),',
  '  });',
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

function 사진창주소(것) {
  return 'https://cms.jbnews.com/news/photoWriteForm.html'
    + '?mode=modify&idxno=' + encodeURIComponent(것.사진번호)
    + '&article_idxno=' + encodeURIComponent(것.기사번호)
    + '&subUploadDir=' + encodeURIComponent(것.방)
    + '&image=' + encodeURIComponent(것.그림)
    + '&step=' + encodeURIComponent(것.걸음)
    + '&representation=' + encodeURIComponent(것.대표);
}

async function 한편읽기(기사번호) {
  let 것 = null;
  await 새탭에서(서식주소(기사번호), async (붙음) => {
    await 자리잡기(붙음, { 최대: 45000 });
    await new Promise((r) => setTimeout(r, 3000));
    try { 것 = JSON.parse(String(await 재기(붙음, 읽는글, 25000))); } catch (e) { 것 = null; }
  });
  return 것;
}

async function 한편넣기(기사번호, 갈래, 날) {
  const 설명 = 설명글만들기(날, 갈래);
  if (!설명) return { 결과: '🔴 설명글을 못 만들었다 — 날이 이상하다' };
  const 그림길 = 그림[갈래];
  if (!fs.existsSync(그림길)) return { 결과: '🔴 그림 파일이 없다 — ' + 그림길 };

  const 앞 = await 한편읽기(기사번호);
  if (!앞) return { 결과: '🔴 서식을 못 읽었다' };

  let 올림 = '건너뜀';
  if (!앞.사진있나) {
    await 새탭에서(서식주소(기사번호), async (붙음) => {
      await 자리잡기(붙음, { 최대: 45000 });
      await new Promise((r) => setTimeout(r, 3000));
      const 펼침 = String(await 재기(붙음, 사진펼치기, 20000));
      if (펼침 !== '열었다') { 올림 = '🔴 ' + 펼침; return; }
      await new Promise((r) => setTimeout(r, 2500));
      const 이미 = String(await 재기(붙음, 사진센다, 20000));
      if (/^올라갔다/.test(이미)) { 올림 = '이미 있다 — ' + 이미; return; }

      let 좌표 = null;
      try { 좌표 = JSON.parse(String(await 재기(붙음, 떨굴자리, 20000))); } catch { 좌표 = null; }
      if (!좌표) { 올림 = '🔴 떨굴 자리를 못 찾았다'; return; }

      const 짐 = { files: [그림길], items: [], dragOperationsMask: 1 };
      for (const 유형 of ['dragEnter', 'dragOver', 'drop']) {
        await 붙음.보내기('Input.dispatchDragEvent',
          { type: 유형, x: 좌표.x, y: 좌표.y, data: 짐 }, 30000);
        await new Promise((r) => setTimeout(r, 700));
      }
      await new Promise((r) => setTimeout(r, 18000));
      올림 = String(await 재기(붙음, 사진센다, 20000));
      if (!/^올라갔다/.test(올림)) return;

      /* ⛔ 승인 라디오를 건드리지 않는다. 저장만 누른다 */
      const 눌림 = String(await 재기(붙음, 저장글, 25000));
      if (눌림 !== '눌렀다') { 올림 = '🔴 ' + 눌림; return; }
      await new Promise((r) => setTimeout(r, 11000));
    });
    if (!/^올라갔다/.test(올림)) return { 결과: 올림, 앞 };
  } else {
    올림 = '사진이 이미 있다';
  }

  /* ── 사진 설명 ── */
  let 설명결과 = '못 했다';
  await 새탭에서(서식주소(기사번호), async (붙음) => {
    await 자리잡기(붙음, { 최대: 45000 });
    await new Promise((r) => setTimeout(r, 4000));
    let 것 = null;
    try { 것 = JSON.parse(String(await 재기(붙음, 사진정보읽기, 25000))); } catch { 것 = null; }
    if (!것 || !것.사진번호) { 설명결과 = '🔴 사진이 없다'; return; }
    if (것.이미적힌설명 === 설명) { 설명결과 = '이미 적혀 있다'; return; }

    await 붙음.보내기('Page.navigate', { url: 사진창주소(것) });
    await new Promise((r) => setTimeout(r, 10000));
    const 넣음 = String(await 재기(붙음, [
      '(() => {',
      '  const 칸 = document.querySelector("textarea#caption, textarea[name=caption]");',
      '  if (!칸) return "설명 칸이 없다";',
      '  칸.value = ' + JSON.stringify(설명) + ';',
      '  칸.dispatchEvent(new Event("input", { bubbles: true }));',
      '  칸.dispatchEvent(new Event("change", { bubbles: true }));',
      '  const 단추 = [...document.querySelectorAll("button,a,input[type=button],input[type=submit]")]',
      '    .filter((e) => (((e.innerText || e.value || "") + "").trim()) === "확인");',
      '  if (!단추.length) return "확인 단추가 없다";',
      '  단추[0].click();',
      '  return "넣고 눌렀다";',
      '})()',
    ].join('\n'), 25000));
    if (넣음 !== '넣고 눌렀다') { 설명결과 = '🔴 ' + 넣음; return; }
    await new Promise((r) => setTimeout(r, 9000));
    설명결과 = '눌렀다';
  });

  /* ── 되읽기 ── */
  const 뒤 = await 한편읽기(기사번호);
  if (!뒤) return { 결과: '🔴 되읽지 못했다', 앞, 올림, 설명결과 };
  const 흠 = 달라진것(앞, 뒤);
  const 사진됐나 = 뒤.사진있나;
  const 설명됐나 = 뒤.사진설명 === 설명;
  let 결과 = '됐다';
  if (!사진됐나) 결과 = '🔴 사진이 안 들어갔다';
  else if (!설명됐나) 결과 = '🔴 설명이 안 적혔다 — 지금: ' + (뒤.사진설명 || '(빈 칸)');
  if (흠.length) 결과 += ' · ' + 흠.join(' · ');
  return { 결과, 앞, 뒤, 올림, 설명결과 };
}

/* ── 돌린다 ──────────────────────────────────────────────────────────── */
const 인자 = process.argv.slice(2);
const 부터인자 = 인자.indexOf('--부터');
const 부터 = 부터인자 >= 0 ? 인자[부터인자 + 1] : 기본부터;
const 한편인자 = 인자.indexOf('--한편');
const 한편만 = 한편인자 >= 0 ? 인자[한편인자 + 1] : '';
const 정말넣나 = 인자.includes('--넣는다');

const 읽기 = (p) => { try { return fs.readFileSync(path.join(뿌리, p), 'utf8'); } catch { return ''; } };
const 목록인자 = 인자.indexOf('--list');
const 목록길 = 목록인자 >= 0 ? 인자[목록인자 + 1] : '';
let 대상 = 목록길
  ? 목록에서대상(fs.readFileSync(목록길, 'utf8'))
  : 대상모으기(읽기(기록파일.띠별), 읽기(기록파일.별자리), 부터);
if (한편만) 대상 = 대상.filter((x) => String(x.번호) === String(한편만));

console.log('■ ' + (목록길 ? '목록 파일' : 부터 + ' 부터') + ' — 대상 ' + 대상.length + '편');
console.log('■ 대표 사진과 사진 설명을 넣는다');
console.log('⛔ 승인 라디오는 건드리지 않는다 (사장님 2026-11-22)\n');

if (!정말넣나) {
  for (const x of 대상) {
    const 것 = await 한편읽기(x.번호);
    const 말 = 것
      ? ('사진=' + (것.사진있나 ? '있다' : '🔴 없다')
        + '  설명=' + (것.사진설명 || '(빈 칸)')
        + '  분류=' + (것.큰분류 || '?') + '/' + (것.분류 || '?')
        + '  승인=' + 것.승인)
      : '🔴 못 읽었다';
    console.log('  ' + x.날 + '  ' + x.갈래.padEnd(4) + '  ' + x.번호 + '  ' + 말);
  }
  console.log('\n■ 읽기만 했다. 넣으려면 --넣는다 를 붙인다');
  process.exit(0);
}

const 줄들 = [];
let 됨 = 0; let 탈 = 0;
for (const x of 대상) {
  const r = await 한편넣기(x.번호, x.갈래, x.날);
  const 좋나 = r.결과 === '됐다';
  if (좋나) 됨 += 1; else 탈 += 1;
  console.log('  ' + x.날 + '  ' + x.갈래.padEnd(4) + '  ' + x.번호 + '  ' + r.결과);
  줄들.push([오늘(), x.번호, x.갈래, 설명글만들기(x.날, x.갈래), r.결과].join('\t'));
}

function 오늘() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
    + '-' + String(d.getDate()).padStart(2, '0');
}

const 기록길 = path.join(뿌리, 넣은기록);
if (!fs.existsSync(기록길)) fs.writeFileSync(기록길, '# 날\t기사번호\t갈래\t사진설명\t결과\n', 'utf8');
fs.appendFileSync(기록길, 줄들.join('\n') + '\n', 'utf8');

console.log('\n■ 됐다 ' + 됨 + '편 · 🔴 탈 ' + 탈 + '편');
console.log('✔ 적었다 — ' + 넣은기록);
process.exit(탈 ? 1 : 0);
