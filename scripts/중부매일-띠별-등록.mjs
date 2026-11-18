#!/usr/bin/env node
/**
 * 중부매일-띠별-등록.mjs — 그날 별자리 운세를 **중부매일 CMS 에 넣고 승인까지** 한다.
 *
 * ── 🔴🔴 왜 (2026-11-18 · 사장님) ────────────────────────────────────
 * 사장님 — 「2번대로 하자… cms 열면 자동로그인해서 하면 됨.
 *          매일 0시 1분에 기사를 승인까지 직접 해.」
 *          「안 될 경우, 못한 경우엔 이메일 보내놔」
 *
 * 붙여넣기 길은 **잴 수가 없다** — 편집기가 사람이 누른 붙여넣기만 받는다.
 * 흉내 낸 사건은 통째로 버려진다(2026-11-18 에 두 번 재 봤고 둘 다 빈 글이 됐다).
 * ⇒ 그래서 사람 손을 기다리지 않고 **내가 넣는다.** 넣는 길은 재 봤고 아무것도 안 지워진다.
 *
 * 하는 일
 * ```
 *   ① 그날 원고를 짓는다      klifemap/astro/cms원고.js 가 짓는다 — 글은 한 곳에서만 짓는다
 *   ② 칸을 채운다            제목·부제·본문·사진설명·분류(기획·특집 > 연재)
 *   ③ 승인을 켜고 저장한다     recognition = E
 *   ④ 되읽어 판정한다         그림 12장·첫 줄·도움말·제목을 «화면에서» 본다
 *   ⑤ 어긋나면 메일을 보낸다   사장님 지시 — 못한 경우에 알린다
 * ```
 * ⛔ 「저장을 눌렀다」를 「올라갔다」로 읽지 않는다. ④ 를 통과해야 올라간 것이다.
 * ⛔ 조용히 실패하지 않는다. 어느 걸음에서 섰든 메일이 나간다.
 * ⚠ 크롬은 전용 자리(klm-cms-chrome)로 띄운다 — 사장님 창을 건드리지 않는다.
 *   그 자리에 CMS 로그인이 남아 있어 열면 그대로 들어간다(사장님이 북마크로 넣어 두셨다).
 *
 * 쓰는 법
 *   node scripts/중부매일-띠별-등록.mjs                 오늘치 · 승인까지
 *   node scripts/중부매일-띠별-등록.mjs --날 2026-11-20
 *   node scripts/중부매일-띠별-등록.mjs --미승인          승인은 안 켠다
 *   node scripts/중부매일-띠별-등록.mjs --자체검사
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { 탭들, 탭붙기, 자리잡기, 재기, 기본뿌리 } from './lib/cdp.mjs';
import { pathToFileURL } from 'node:url';

/**
 * 🔴🔴 이 파일이 **직접 불렸나**. 들여오기만 했으면 거짓이다.
 *
 * ⛔ 2026-11-18 에 같은 자리에 세 번 빠졌다 — 남의 함수 하나를 쓰려고 들여왔을 뿐인데
 *   파일 몸통이 돌아 IndexNow 8,108장이 나가고 배포 단추가 눌렸다.
 *   이 파일은 **기사를 신문에 올린다.** 들여오기 한 번이 기사 발행이 된다.
 *
 * ⚠ 재는 자리는 「들여와지나」가 아니라 **「밖에 닿나」**다. 밖에 닿는 파일은 다 이것을 단다.
 */
export function 직접실행인가(argv1 = process.argv[1], 나 = import.meta.url) {
  try {
    const a = pathToFileURL(fs.realpathSync(argv1)).href;
    const b = pathToFileURL(fs.realpathSync(fileURLToPath(나))).href;
    return process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b;
  } catch { return false; }
}

export const 크롬프로필경로 = 'C:\\Users\\User\\AppData\\Local\\klm-cms-chrome';
export const 등록주소 = 'https://cms.jbnews.com/news/adminArticleWriteForm.html?mode=input';
export const 큰섹션 = 'S1N29';    /* 기획·특집 */
export const 작은섹션 = 'S2N157';  /* 연재 */
export const 통보주소 = 'parkintaek2@gmail.com';

const 여기 = path.dirname(fileURLToPath(import.meta.url));
const 뿌리 = path.resolve(여기, '..');
const KL = 'C:/Users/User/Documents/GitHub/klifemap';
const K = createRequire(KL + '/package.json');

/** KST 오늘. ⛔ toISOString() 금지 — UTC 라 새벽에 하루가 어긋난다 */
export function 오늘일자(d = new Date()) {
  return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() };
}

export function 일자해석(글) {
  const m = String(글 ?? '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) } : null;
}

export function 시각문자열(d = new Date()) {
  const 두 = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + 두(d.getMonth() + 1) + '-' + 두(d.getDate())
    + ' ' + 두(d.getHours()) + ':' + 두(d.getMinutes());
}

/**
 * 🔴 그날 것을 이미 올렸나 — 자국에서 본다.
 *   ⛔ 안 보면 0시 1분마다 같은 날 기사가 한 편씩 더 생긴다.
 *   ⚠ 「됐다」로 적힌 줄만 센다. 못한 줄은 다시 해야 하는 것이다.
 */
export function 등록여부확인(자국글, 일자문자열) {
  const 줄들 = String(자국글 ?? '').split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('#'));
  for (const l of 줄들) {
    const 칸 = l.split('\t');
    if (칸[0] === 일자문자열 && 칸[3] === '됐다' && /articleView/.test(칸[5] || '')) return 칸[5];
  }
  return null;
}

export async function 포트작동확인(뿌리주소 = 기본뿌리) {
  try {
    const r = await fetch(뿌리주소 + '/json/version', { signal: AbortSignal.timeout(4000) });
    return r.ok;
  } catch { return false; }
}

/** 전용 크롬을 띄운다. ⛔ 사장님 창은 안 건드린다 */
export async function 크롬실행() {
  if (await 포트작동확인()) return '이미 떠 있다';
  const 크롬 = ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'].find((p) => fs.existsSync(p));
  if (!크롬) return '🔴 크롬을 못 찾았다';
  spawn(크롬, ['--remote-debugging-port=9222', '--user-data-dir=' + 크롬프로필경로,
    '--no-first-run', '--no-default-browser-check', 등록주소],
  { detached: true, stdio: 'ignore' }).unref();
  for (let i = 0; i < 20; i++) {
    await new Promise((s) => setTimeout(s, 1500));
    if (await 포트작동확인()) return '띄웠다';
  }
  return '🔴 포트가 안 열렸다';
}

/**
 * 🔴 사장님 2026-11-18 — 「안 될 경우, 못한 경우엔 이메일 보내놔」
 * ⛔ 메일을 못 보내도 이 자가 터지지 않는다. 터지면 사유이 통째로 사라진다.
 */
export function 등록실패통보(일자문자열, 사유, 참고사항) {
  const 글길 = path.join(뿌리, 'docs', '편지-중부매일띠별-못올렸다.txt');
  const 글 = [
    '사장님, 5번입니다.',
    '',
    일자문자열 + ' 띠별 운세를 중부매일 CMS 에 올리지 못했습니다.',
    '',
    '■ 어디서 섰나',
    사유,
    '',
    '■ 더 볼 것',
    String(참고사항 ?? '(없음)'),
    '',
    '■ 손으로 올리시려면',
    '  node scripts/중부매일-띠별-등록.mjs --날 ' + 일자문자열,
    '  크롬이 로그아웃돼 있으면 CMS 북마크를 한 번 눌러 로그인해 두시면 됩니다.',
    '',
    '5번 드림',
  ].join('\n');
  try { fs.writeFileSync(글길, 글, 'utf8'); } catch { /* 적지 못해도 메일은 띄운다 */ }
  try {
    execFileSync('node', [path.join(뿌리, 'scripts', 'send-mail.mjs'),
      '--받는곳=' + 통보주소,
      '--제목=[5번] ' + 일자문자열 + ' 띠별 운세를 올리지 못했습니다',
      '--글=' + 글길, '--보낸다'], { cwd: 뿌리, stdio: 'inherit', timeout: 120000 });
    return '메일을 보냈다';
  } catch (e) {
    return '🔴 메일도 못 보냈다 — ' + String(e.message).slice(0, 90);
  }
}

export const 대표이미지경로 = path.join('C:', 'Users', 'User', 'Documents', 'GitHub',
  'klifemap', 'public', 'astro', 'ttibyeol-hero-1200x630.png');

/**
 * 🔴🔴 대표 이미지를 **사진 메뉴로** 올린다 (사장님 2026-11-18).
 *   「그 메뉴를 통해서 넣어야 사진제목과 사진설명을 넣을 수 있어」
 *   「모든 운세 기사에 반드시 대표 이미지를 넣어」
 *
 * ⛔ 파일 칸에 값을 넣는 방식은 안 된다 — CMS 가 받지 않는다(2026-11-18 실측).
 *   끌어다 놓는 방식이라야 올라간다. Input.dispatchDragEvent 로 떨군다.
 * ⚠ 저장하기 전까지는 임시다. 다시 열면 사라진다 — 그래서 저장 앞에서 올린다.
 * ⚠ 떨구면 본문에도 한 장이 끼어든다. 그래서 **본문을 채우기 전에** 올린다 —
 *   뒤이은 setData 가 그 한 장을 덮어 지운다.
 */
export const 사진펼치기 = [
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

export const 떨굴자리 = [
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

export const 사진센다 = [
  '(() => {',
  '  const 제목 = [...document.querySelectorAll(".accordion-title")]',
  '    .find((e) => (e.textContent || "").trim() === "사진");',
  '  const 속 = 제목 ? 제목.closest(".accordion-item").querySelector(".accordion-content") : null;',
  '  const 수 = 속 ? (속.innerText || "").split("대표").length - 1 : 0;',
  '  return 수 > 0 ? ("올라갔다 " + 수 + "장") : "안 올라갔다";',
  '})()',
].join('\n');

async function 대표이미지올리기(접속) {
  if (!fs.existsSync(대표이미지경로)) return '🔴 그림 파일이 없다 — ' + 대표이미지경로;
  const 펼침 = String(await 재기(접속, 사진펼치기, 20000));
  if (펼침 !== '열었다') return 펼침;
  await new Promise((쉼) => setTimeout(쉼, 2500));

  /* 🔴🔴 이미 있으면 올리지 않는다 — 2026-11-18 에 같은 그림이 일곱 장까지 쌓였다.
     날마다 도는 자라서, 막지 않으면 한 해에 삼백예순 장이 된다. */
  const 이미 = String(await 재기(접속, 사진센다, 20000));
  if (/^올라갔다/.test(이미)) return '이미 있다 — ' + 이미;

  let 좌표 = null;
  try { 좌표 = JSON.parse(String(await 재기(접속, 떨굴자리, 20000))); } catch { 좌표 = null; }
  if (!좌표) return '떨굴 자리를 못 찾았다';

  const 짐 = { files: [대표이미지경로], items: [], dragOperationsMask: 1 };
  for (const 유형 of ['dragEnter', 'dragOver', 'drop']) {
    await 접속.보내기('Input.dispatchDragEvent',
      { type: 유형, x: 좌표.x, y: 좌표.y, data: 짐 }, 30000);
    await new Promise((쉼) => setTimeout(쉼, 700));
  }
  await new Promise((쉼) => setTimeout(쉼, 18000));
  return String(await 재기(접속, 사진센다, 20000));
}


/**
 * 🔴🔴 사진 설명(캡션)을 넣는다 — 사장님 2026-11-18
 *   「반드시 메뉴에서 사진 선택해서 사진제목과 설명 쓰라니까」 · 「글쓰기 도구 > 사진」
 *
 * 올라간 사진 위의 「수정」을 누르면 `photoWriteForm.html` 이 새 창으로 열린다.
 * 그 창에 설명(캡션) 칸이 있다. 창을 띄우는 대신 그 주소로 바로 간다 — 같은 화면이다.
 * ⛔ 기사 본문의 「사진 설명」 칸과 다른 것이다. 사장님이 이 메뉴로 넣으라 하셨다.
 * ⚠ 사진은 저장한 뒤라야 번호가 붙는다. 그래서 저장 «뒤»에 부른다.
 */
export const 사진정보읽기 = [
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
  '    이미적힌설명: (장.querySelector(".caption") || {}).textContent || "",',
  '  });',
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

async function 사진설명넣기(접속, 기사번호, 설명글) {
  await 접속.보내기('Page.navigate',
    { url: 'https://cms.jbnews.com/news/adminArticleWriteForm.html?mode=modify&idxno=' + 기사번호 });
  await new Promise((쉼) => setTimeout(쉼, 11000));
  let 것 = null;
  try { 것 = JSON.parse(String(await 재기(접속, 사진정보읽기, 25000))); } catch { 것 = null; }
  if (!것 || !것.사진번호) return '사진이 없다';
  if (String(것.이미적힌설명).trim() === String(설명글).trim()) return '이미 적혀 있다';

  await 접속.보내기('Page.navigate', { url: 사진창주소(것) });
  await new Promise((쉼) => setTimeout(쉼, 10000));
  const 넣음 = String(await 재기(접속, [
    '(() => {',
    '  const 칸 = document.querySelector("textarea#caption, textarea[name=caption]");',
    '  if (!칸) return "설명 칸이 없다";',
    '  칸.value = ' + JSON.stringify(설명글) + ';',
    '  칸.dispatchEvent(new Event("input", { bubbles: true }));',
    '  칸.dispatchEvent(new Event("change", { bubbles: true }));',
    '  const 단추 = [...document.querySelectorAll("button,a,input[type=button],input[type=submit]")]',
    '    .filter((e) => ((e.innerText || e.value || "") + "").trim() === "확인");',
    '  if (!단추.length) return "확인 단추가 없다";',
    '  단추[0].click();',
    '  return "넣고 눌렀다";',
    '})()',
  ].join('\n'), 25000));
  if (넣음 !== '넣고 눌렀다') return 넣음;
  await new Promise((쉼) => setTimeout(쉼, 9000));

  /* ⛔ 「눌렀다」를 「적혔다」로 읽지 않는다 — 다시 열어 읽는다 */
  await 접속.보내기('Page.navigate',
    { url: 'https://cms.jbnews.com/news/adminArticleWriteForm.html?mode=modify&idxno=' + 기사번호 });
  await new Promise((쉼) => setTimeout(쉼, 11000));
  let 다시 = null;
  try { 다시 = JSON.parse(String(await 재기(접속, 사진정보읽기, 25000))); } catch { 다시 = null; }
  const 적힌것 = 다시 ? String(다시.이미적힌설명).trim() : '';
  return (적힌것 === String(설명글).trim())
    ? '적었다 — ' + 적힌것
    : '🔴 안 적혔다 — 지금 적힌 것: ' + (적힌것 || '(빈 칸)');
}


/**
 * 🔴🔴 키워드를 넣는다 — 사장님 2026-11-19
 *   「키워드에 두 개를 넣어 <오늘의운세>와 <오늘의별자리> 띄어쓰기 하면 안됨.
 *     키워드 넣고 반드시 엔터키를 쳐야 함. 해시태그는 저절로 붙음」
 *
 * ⛔ 값만 넣으면 안 된다. 엔터를 쳐야 CMS 가 낱말로 받아들인다.
 * ⛔ 띄어쓰기를 넣지 않는다.
 */
export const 키워드들 = ['오늘의운세', '오늘의별자리'];

async function 키워드넣기(접속) {
  const 자리글 = String(await 재기(접속, [
    '(() => {',
    '  const 칸 = [...document.querySelectorAll("input")]',
    '    .find((e) => /입력 \\(최대/.test(e.placeholder || "") || e.name === "text");',
    '  if (!칸) return "";',
    '  칸.scrollIntoView({ block: "center" });',
    '  const r = 칸.getBoundingClientRect();',
    '  return JSON.stringify({ x: r.left + r.width / 2, y: r.top + r.height / 2 });',
    '})()',
  ].join('\n'), 20000));
  let 좌표 = null;
  try { 좌표 = JSON.parse(자리글); } catch { 좌표 = null; }
  if (!좌표) return '키워드 칸을 못 찾았다';

  for (const 낱말 of 키워드들) {
    for (const 유형 of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
      await 접속.보내기('Input.dispatchMouseEvent', {
        type: 유형, x: 좌표.x, y: 좌표.y,
        button: 유형 === 'mouseMoved' ? 'none' : 'left',
        clickCount: 유형 === 'mouseMoved' ? 0 : 1,
      });
      await new Promise((쉼) => setTimeout(쉼, 200));
    }
    await 접속.보내기('Input.insertText', { text: 낱말 });
    await new Promise((쉼) => setTimeout(쉼, 600));
    for (const 유형 of ['rawKeyDown', 'keyUp']) {
      await 접속.보내기('Input.dispatchKeyEvent', {
        type: 유형, key: 'Enter', code: 'Enter',
        windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13,
      });
      await new Promise((쉼) => setTimeout(쉼, 300));
    }
    await new Promise((쉼) => setTimeout(쉼, 900));
  }

  return String(await 재기(접속, [
    '(() => {',
    '  const 글 = (document.body.innerText || "");',
    '  const 든것 = ' + JSON.stringify(['오늘의운세', '오늘의별자리']) + '.filter((낱) => 글.includes("#" + 낱) || 글.includes(낱));',
    '  return 든것.length + "개 들어갔다 — " + 든것.join(", ");',
    '})()',
  ].join('\n'), 20000));
}


/**
 * 🔴🔴 노출시간을 건다 — 사장님 2026-11-19
 *   「저작권 바로 밑에 +를 클릭하면 노출시간이 있다. 노출시간을 설정하면
 *     그 시간에 예약이 걸려 승인이 자동으로 되는거야. 이걸 활용해」
 *
 * ⇒ 기사를 미리 올려 두고 시간만 걸어 두면 그 시각에 저절로 나간다.
 *   자정에 사람이 깨어 있을 까닭이 없어진다.
 * ⚠ 칸은 접혀 있어도 서식 안에 있다. 값을 넣으면 그대로 올라간다.
 */
async function 노출시간넣기(접속, 날짜글, 시각글) {
  if (!날짜글 || !시각글) return '거는 시간이 없다';
  return String(await 재기(접속, [
    '(() => {',
    '  const d = document.querySelector("#embargo_date");',
    '  const t = document.querySelector("#embargo_time");',
    '  if (!d || !t) return "노출시간 칸이 없다";',
    '  d.value = ' + JSON.stringify(날짜글) + ';',
    '  d.dispatchEvent(new Event("input", { bubbles: true }));',
    '  d.dispatchEvent(new Event("change", { bubbles: true }));',
    '  t.value = ' + JSON.stringify(시각글) + ';',
    '  t.dispatchEvent(new Event("input", { bubbles: true }));',
    '  t.dispatchEvent(new Event("change", { bubbles: true }));',
    '  return "걸었다 " + d.value + " " + t.value;',
    '})()',
  ].join('\n'), 20000));
}


/**
 * 🔴🔴 사진을 **가운데 정렬로 본문에 넣는다** — 사장님 2026-11-19
 *   「사진에 마우스 오버하면 사진 가로 정렬 메뉴가 생성된다.
 *     이중 가운데 정렬을 클릭하면 사진이 자동으로 기사안에 들어간다. 이것까지 꼭 해야 한다」
 *
 * ⚠ 본문을 채운 «뒤»에 넣는다 — 먼저 넣으면 setData 가 덮어 지운다.
 * ⛔ 스크립트로만 누르면 메뉴가 안 뜬다. 마우스를 올린 뒤 진짜로 누른다.
 */
async function 가운데정렬넣기(접속) {
  const 자리글 = String(await 재기(접속, [
    '(() => {',
    '  const 제목 = [...document.querySelectorAll(".accordion-title")]',
    '    .find((e) => (e.textContent || "").trim() === "사진");',
    '  if (제목) {',
    '    const 속 = 제목.closest(".accordion-item").querySelector(".accordion-content");',
    '    if (!(속 && 속.offsetHeight > 0)) 제목.click();',
    '  }',
    '  const 장 = document.querySelector(".library-photo");',
    '  if (!장) return "";',
    '  장.scrollIntoView({ block: "center" });',
    '  const r = 장.getBoundingClientRect();',
    '  return JSON.stringify({ x: r.left + r.width / 2, y: r.top + r.height / 2 });',
    '})()',
  ].join('\n'), 20000));
  let 사진좌표 = null;
  try { 사진좌표 = JSON.parse(자리글); } catch { 사진좌표 = null; }
  if (!사진좌표) return '사진이 없다';

  /* 마우스를 올려야 정렬 메뉴가 뜬다 */
  await 접속.보내기('Input.dispatchMouseEvent',
    { type: 'mouseMoved', x: 사진좌표.x, y: 사진좌표.y, button: 'none' });
  await new Promise((쉼) => setTimeout(쉼, 1500));

  /* ⛔ [2026-11-19] 마우스를 올려도 정렬 단추가 화면 크기로 안 잡힌다.
     이 CMS 의 단추들은 스크립트 누르기를 받아들인다 — 사진 수정 단추가 그랬다. */
  const 누름 = String(await 재기(접속, [
    '(() => {',
    '  const 장 = document.querySelector(".library-photo");',
    '  if (!장) return "사진이 없다";',
    '  const 모두 = [...장.querySelectorAll("button")];',
    '  const 가운데 = 모두.find((e) => /가운데|중앙|center/i.test(',
    '    (e.getAttribute("title") || "") + (e.getAttribute("data-tp") || "")));',
    '  if (!가운데) return "못 찾았다 — " + 모두.map((e) =>',
    '    (e.getAttribute("data-tp") || "") + ":" + (e.getAttribute("title") || "")).join(",");',
    '  가운데.click();',
    '  return "눌렀다 " + (가운데.getAttribute("title") || 가운데.getAttribute("data-tp"));',
    '})()',
  ].join('\n'), 25000));
  if (!/눌렀다/.test(누름)) return 누름;
  await new Promise((쉼) => setTimeout(쉼, 3500));

  /* ⛔ 「눌렀다」를 「들어갔다」로 읽지 않는다 — 본문에 그림이 늘었는지 센다.
     ⚠ 단추가 눌려도 안 들어갈 때가 있다. 그러면 같은 그림을 편집기로 직접 가운데에 넣는다 —
       사장님이 바라시는 결과(사진이 기사 안에 있는 것)는 같다. */
  return String(await 재기(접속, [
    '(() => {',
    '  if (!window.CKEDITOR || !CKEDITOR.instances.FCKeditor1) return "편집기를 못 찾았다";',
    '  const 판 = CKEDITOR.instances.FCKeditor1;',
    '  let 글 = 판.getData() || "";',
    '  const 들었나 = (본문) => /photo\\/|thumbnail|upload/i.test(본문);',
    '  if (들었나(글)) return "본문에 들어갔다 — 정렬 단추로";',
    '  const 장 = document.querySelector(".library-photo");',
    '  if (!장) return "사진이 없다";',
    '  const 방 = 장.getAttribute("data-subuploaddir") || "";',
    '  const 파일 = 장.getAttribute("data-image") || "";',
    '  if (!파일) return "그림 이름을 못 읽었다";',
    '  /* 🔴 주소 꼴은 사장님이 넣으신 기사에서 그대로 읽어 왔다 — /news/photo/202611/....png */',
    '  const 주소 = "/news/photo/" + 방 + 파일;',
    '  const 설명 = (장.querySelector(".caption") || {}).textContent || "";',
    '  const 넣을것 = \'<p style="text-align:center;"><img alt="\' + 설명 + \'" src="\' + 주소 + \'"></p>\';',
    '  판.setData(넣을것 + 글);',
    '  글 = 판.getData() || "";',
    '  return 들었나(글) ? "본문에 넣었다 — 편집기로" : "넣었는데 안 보인다";',
    '})()',
  ].join('\n'), 25000));
}


/**
 * 🔴🔴 웹출판을 누른다 — 사장님 2026-11-19
 *   「승인 후에 웹출판을 반드시 클릭해야 한다. 제일 오른쪽 위에 있어」
 *
 * ⛔ 스크립트로만 누르면 CMS 가 받지 않는 자리가 있다. 진짜 마우스로 누른다.
 */
async function 웹출판누르기(접속) {
  const 자리글 = String(await 재기(접속, [
    '(() => {',
    '  const 후보 = [...document.querySelectorAll("button,a")]',
    '    .filter((e) => /웹출판/.test((e.innerText || "") + "")',
    '      && (e.offsetWidth || e.offsetHeight));',
    '  if (!후보.length) return "";',
    '  const e = 후보[0];',
    '  const r = e.getBoundingClientRect();',
    '  return JSON.stringify({ x: r.left + r.width / 2, y: r.top + r.height / 2 });',
    '})()',
  ].join('\n'), 20000));
  let 좌표 = null;
  try { 좌표 = JSON.parse(자리글); } catch { 좌표 = null; }
  if (!좌표) return '웹출판 단추를 못 찾았다';

  for (const 유형 of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
    await 접속.보내기('Input.dispatchMouseEvent', {
      type: 유형, x: 좌표.x, y: 좌표.y,
      button: 유형 === 'mouseMoved' ? 'none' : 'left',
      clickCount: 유형 === 'mouseMoved' ? 0 : 1,
    });
    await new Promise((쉼) => setTimeout(쉼, 300));
  }
  await new Promise((쉼) => setTimeout(쉼, 6000));
  return '눌렀다';
}


/* ── 자체검사 ─────────────────────────────────────────────── */
if (직접실행인가() && process.argv.includes('--자체검사')) {
  let 통 = 0; const 실 = [];
  const 검 = (이름, 참) => { if (참) 통 += 1; else 실.push(이름); };

  검('날 읽기', JSON.stringify(일자해석('2026-11-20')) === JSON.stringify({ y: 2026, m: 11, d: 20 }));
  검('⛔ 꼴이 아니면 null', 일자해석('2026/11/20') === null && 일자해석(null) === null);
  /* ⛔ toISOString() 을 쓰면 새벽 0시 1분에 «어제» 운세가 나간다 */
  검('🔴 0시 1분에도 그날이다 (KST)', (() => {
    const d = new Date(2026, 10, 20, 0, 1, 0);
    const t = 오늘일자(d);
    return t.y === 2026 && t.m === 11 && t.d === 20;
  })());
  검('시각문자열이 KST 꼴이다', 시각문자열(new Date(2026, 10, 20, 0, 1)) === '2026-11-20 00:01');
  검('분류가 기획·특집 > 연재다', 큰섹션 === 'S1N29' && 작은섹션 === 'S2N157');
  검('등록 주소가 새 기사 자리다', 등록주소.includes('mode=input'));
  검('알릴 곳이 지메일이다 — ⛔ 네이버로 보내지 않는다',
    통보주소 === 'parkintaek2@gmail.com' && !통보주소.includes('naver'));

  const C = K(KL + '/astro/cms원고-띠별.js');
  const { 열두띠수집: 모으기 } = await import(
    'file:///C:/Users/User/Documents/GitHub/klifemap/scripts/%EB%8F%85%EB%A6%BD%ED%8C%8C%EC%9D%BC/CMS%EC%9B%90%EA%B3%A0%EC%83%9D%EC%84%B1-%EB%9D%A0%EB%B3%84.mjs');
  const 모음 = 모으기({ y: 2026, m: 11, d: 19 });
  const o = 모음 ? C.원고생성(모음, { y: 2026, m: 11, d: 19 }) : null;
  검('🔴 원고를 klifemap 모듈이 짓는다 — 여기서 짓지 않는다', !!o && o.본문.length > 3000);
  검('🔴 그림이 열둘이다', (o.본문.match(/<img /g) || []).length === 12);
  검('⛔ data: 그림이 없다 — CMS 가 지운다', !o.본문.includes('data:image'));
  검('🔴 본문 글자크기가 16px 다 (사장님 2026-11-18)', o.본문.includes('font-size:16px'));
  검('🔴 제목에 요일이 들어간다 (사장님 문서)',
    o.제목 === '[오늘의 운세] 11월 19일 목요일 띠별 운세');
  검('🔴 부제가 음력과 일진이다',
    o.부제 === '음력 10월 11일 정유일…12간지로 보는 오늘 하루');
  검('🔴 서두에 바이라인이 있다', o.본문.includes('[중부매일 박인택 기자]'));
  검('🔴 생년 항목이 48개다', (o.본문.match(/년생은 /g) || []).length === 48);
  검('🔴 사진 설명이 붙는다', o.사진설명 === '오늘의 운세 2026년 11월 19일 띠별 운세. / KLifeMap.AI');
  검('🔴 등록실패통보 가 있다 — 조용히 실패하지 않는다', typeof 등록실패통보 === 'function');

  /* 🔴 같은 날 두 편을 만들지 않는다 — 0시 1분마다 한 편씩 쌓이면 지면이 더러워진다 */
  {
    const 자국 = ['# 날\t올린때\t승인\t됐나\t그림수\t주소',
      '2026-11-20\t2026-11-19 00:01\t승인\t됐다\t12\thttps://cms.jbnews.com/news/articleView.html?idxno=1516319',
      '2026-11-21\t2026-11-21 00:01\t승인\t못했다\t-\t-'].join('\n');
    검('🔴 이미 올린 날은 주소를 돌려준다',
      등록여부확인(자국, '2026-11-20') === 'https://cms.jbnews.com/news/articleView.html?idxno=1516319');
    검('⛔ 못한 날은 다시 해야 한다 — null 이다', 등록여부확인(자국, '2026-11-21') === null);
    검('⛔ 없는 날도 null', 등록여부확인(자국, '2026-12-01') === null);
    검('⬜ 빈 자국에 안 터진다', 등록여부확인('', '2026-11-20') === null && 등록여부확인(null, 'x') === null);
  }

  if (실.length) { console.error('🔴 실패 ' + 실.length + '개\n - ' + 실.join('\n - ')); process.exit(1); }
  console.log(`✅ 중부매일 띠별 올리기 — 자체검사 ${통}개 통과`);
  process.exit(0);
}

/* ── 돈다 ─────────────────────────────────────────────── */
/* ⛔ 들여오기만 했으면 한 줄도 돌지 않는다 — 기사가 저절로 나가는 것을 막는다 */
if (!직접실행인가()) {
  /* 들여오기다. 아무것도 하지 않는다 */
} else {
const 자리 = process.argv.indexOf('--날');
const 날 = 자리 >= 0 ? 일자해석(process.argv[자리 + 1]) : 오늘일자();
if (!날) { console.error('⛔ --날 뒤에 2026-11-20 꼴로 준다'); process.exit(1); }
const 승인할까 = !process.argv.includes('--미승인');
/* 🔴 사장님 2026-11-19 — 노출시간을 걸면 그 시각에 저절로 승인된다 */
const 노출자리 = process.argv.indexOf('--노출');
const 노출날 = 노출자리 >= 0 ? process.argv[노출자리 + 1] : null;
const 노출시각 = 노출자리 >= 0 ? (process.argv[노출자리 + 2] || '00:05') : null;
const 일자문자열 = 날.y + '-' + String(날.m).padStart(2, '0') + '-' + String(날.d).padStart(2, '0');

const C = K(KL + '/astro/cms원고-띠별.js');
const { 열두띠수집 } = await import(
  'file:///C:/Users/User/Documents/GitHub/klifemap/scripts/%EB%8F%85%EB%A6%BD%ED%8C%8C%EC%9D%BC/CMS%EC%9B%90%EA%B3%A0%EC%83%9D%EC%84%B1-%EB%9D%A0%EB%B3%84.mjs');
const 모음 = 열두띠수집(날);
const o = 모음 ? C.원고생성(모음, 날) : null;
if (!o) {
  console.error('🔴 그날 자료를 못 만들었다');
  console.log(등록실패통보(일자문자열, '운세 자료를 만들지 못했습니다 (일진 엔진).', 'klifemap 계산 모듈'));
  process.exit(1);
}
console.log('■ 원고 — ' + o.제목 + ' (' + o.본문.length + '자 · 그림 12장)');


/**
 * 🔴🔴 **금지어가 있으면 올리지 않는다.**
 *
 * 2026-11-18 에 「뒷심」·「끌어안」·「길목」이 본문에 들어간 채로 만들어졌다.
 * 메일 검사가 잡아서 멈췄을 뿐, 등록기에는 검사가 없어 그대로 신문에 나갈 뻔했다.
 * ⇒ 올리기 전에 본문을 검사한다. 걸리면 등록하지 않고 메일로 알린다.
 * ⛔ 「메일에서 잡히겠지」로 두지 않는다. 신문으로 가는 길에는 메일이 없다.
 */
const 검사파일 = path.join(뿌리, 'docs', '.검사-중부매일-띠별.txt');
fs.writeFileSync(검사파일, String(o.제목) + '\n' + String(o.부제) + '\n'
  + String(o.본문).replace(/<[^>]+>/g, ' '), 'utf8');
try {
  execFileSync('node', [path.join(뿌리, 'scripts', '밖으로나가는말-관문.mjs'), 검사파일],
    { cwd: 뿌리, stdio: 'pipe', timeout: 120000 });
  console.log('■ 금지어 검사 — 통과');
} catch (검사오류) {
  const 알림 = String(검사오류.stdout ?? '') + String(검사오류.stderr ?? '');
  console.error('🔴 본문에 금지어가 있다 — 올리지 않는다');
  console.error(알림.slice(0, 900));
  console.log(등록실패통보(일자문자열, '본문에 금지어가 있어 등록하지 않았습니다.',
    알림.slice(0, 500)));
  process.exit(1);
}
/* 🔴 같은 날 두 편을 만들지 않는다 — 이미 올렸으면 그것을 «고쳐» 승인만 켠다 */
const 자국길 = path.join(뿌리, 'docs', '중부매일-띠별-등록기록.tsv');
const 이미 = fs.existsSync(자국길) ? 등록여부확인(fs.readFileSync(자국길, 'utf8'), 일자문자열) : null;
if (이미) console.log('■ 그날 것이 이미 있다 — 새로 쓰지 않고 그것을 연다: ' + 이미);

console.log('■ 크롬 — ' + (await 크롬실행()));

/**
 * 🔴🔴 올리기 전에 **접속부터 세운다.** 0시 1분에 끊겨 있으면 그대로 못 올린다.
 * 유지하는 자가 끊김을 잡아내고 스스로 다시 들어간다 — 그 자를 먼저 부른다.
 * ⛔ 들여오지 않고 «따로 돌린다». 그 자가 이 파일을 들여오므로 서로 물리면 안 된다.
 * ⚠ 실패해도 그냥 간다 — 접속이 이미 성하면 아무 일도 안 일어난다.
 */
try {
  execFileSync('node', [path.join(뿌리, 'scripts', '중부매일-접속유지.mjs')],
    { cwd: 뿌리, stdio: 'inherit', timeout: 240000 });
} catch { console.log('⚠ 접속 세우기가 종료코드 1 로 끝났다 — 그래도 가 본다'); }

if (!(await 포트작동확인())) {
  console.error('🔴 크롬 포트가 없다');
  console.log(등록실패통보(일자문자열, '크롬 디버깅 포트(9222)가 안 열렸습니다.', '전용 자리 ' + 크롬프로필경로));
  process.exit(1);
}

const 탭검색 = async (무늬) => (await 탭들()).find((x) => x.type === 'page' && 무늬.test(x.url || ''));

/* 이미 있으면 그 기사를, 없으면 새 기사 자리를 연다 */
const 대상주소 = 이미 || 등록주소;
let 생성한탭 = null;
/* ⛔ [2026-11-19] 열려 있던 서식 자리를 다시 쓰지 않는다 - 남의 기사를 고쳐 버렸다 */
let 탭 = null;
if (!탭) {
  const r = await fetch(기본뿌리 + '/json/new?' + encodeURIComponent(대상주소), { method: 'PUT' });
  try { 생성한탭 = (await r.json()).id; } catch { 생성한탭 = null; }
  await new Promise((s) => setTimeout(s, 8000));
  /* 🔴🔴 [2026-11-19] 무늬로 찾으면 «예전에 열려 있던» 서식 자리를 집는다.
     그 자리에는 편집기가 없어 「편집기를 못 찾았다」로 멈췄다.
     ⇒ 내가 방금 연 자리만 쓴다. 못 찾으면 그때만 무늬로 찾는다. */
  const 목록 = await 탭들();
  탭 = 생성한탭 ? 목록.find((x) => x.id === 생성한탭) : null;
  if (!탭) 탭 = await 탭검색(이미 ? /articleView/ : /adminArticleWriteForm/);
}
if (!탭) {
  console.error('🔴 기사등록 화면을 못 열었다');
  console.log(등록실패통보(일자문자열, '기사등록 화면을 열지 못했습니다.', 등록주소));
  process.exit(1);
}

const 붙음 = await 탭붙기(탭.webSocketDebuggerUrl);
let 종료코드 = 1;
try {
  /* 🔴🔴 알림 창이 떠 있으면 화면을 한 글자도 못 읽는다(2026-11-18 실측).
     뜨는 즉시 닫는다. 안 닫으면 이 자가 자정에 그 자리에서 선다 */
  await 붙음.보내기('Page.enable');
  붙음.듣기('Page.javascriptDialogOpening', () => {
    붙음.보내기('Page.handleJavaScriptDialog', { accept: true })
      .catch(() => { /* 이미 닫혔다 */ });
  });
  await 자리잡기(붙음);
  const 어디 = String(await 재기(붙음, 'location.href', 20000));
  if (/adminLoginForm/.test(어디)) {
    console.error('🔴 로그인 화면이다');
    console.log(등록실패통보(일자문자열, 'CMS 자동로그인이 풀렸습니다. 로그인 화면이 떴습니다.', 어디));
    process.exit(1);
  }

  /* 이미 있는 기사면 «수정» 을 눌러 고치는 화면으로 간다 */
  if (이미) {
    const 눌렀 = String(await 재기(붙음, [
      '(() => { const a = document.querySelectorAll("a,button");',
      '  for (let i = 0; i < a.length; i++) if ((a[i].innerText || "").trim() === "수정") { a[i].click(); return "눌렀다"; }',
      '  return "수정 단추를 못 찾았다"; })()',
    ].join('\n'), 20000));
    console.log('■ 수정으로 — ' + 눌렀);
    await new Promise((s) => setTimeout(s, 6000));
    await 자리잡기(붙음);
  }

  const 채우기 = [
    '(() => {',
    '  const d = document;',
    '  const T = ' + JSON.stringify(o.제목) + ';',
    '  const S = ' + JSON.stringify(o.부제) + ';',
    '  const B = ' + JSON.stringify(o.본문) + ';',
    '  const P = ' + JSON.stringify(o.사진설명) + ';',
    '  const 승인 = ' + (승인할까 ? 'true' : 'false') + ';',
    '  const t = d.querySelector("input[name=title]"); if (t) t.value = T;',
    '  const s = d.querySelector("textarea[name=subTitle]"); if (s) s.value = S;',
    '  if (!window.CKEDITOR || !window.CKEDITOR.instances.FCKeditor1) return "편집기를 못 찾았다";',
    '  window.CKEDITOR.instances.FCKeditor1.setData(B);',
    '  const cap = d.querySelector("#caption_ie_mod"); if (cap) cap.value = P;',
    '  const sec = d.querySelector("#sectionCode");',
    '  if (sec) { sec.value = ' + JSON.stringify(큰섹션) + '; sec.dispatchEvent(new Event("change", { bubbles: true })); }',
    /* 🔴🔴 [2026-11-18] 사장님 「디폴트가 승인이야」 · 「미승인 클릭해」
     ⛔ r.checked = true 만으로는 저장되지 않는다. 다시 읽으면 승인으로 돌아가 있었다.
     라디오를 누르고, change 를 알리고, 라벨까지 눌러야 CMS 가 받아들인다. */
  '  const 칸이름 = 승인 ? "recog-e" : "recog-c";',
  '  const r = d.querySelector("#" + 칸이름);',
  '  if (r) { r.click(); r.checked = true; r.dispatchEvent(new Event("change", { bubbles: true }));',
  '    const lb = d.querySelector("label[for=" + 칸이름 + "]"); if (lb) lb.click(); }',
    '  return "채웠다";',
    '})()',
  ].join('\n');
  /* 🔴 본문을 채우기 «전»에 대표 이미지를 올린다 — 떨구면 본문에 한 장이 끼어들고,
     바로 뒤의 setData 가 그것을 덮어 지운다. 순서를 바꾸면 본문에 그림이 남는다. */
  try { console.log('■ 대표 이미지 — ' + (await 대표이미지올리기(붙음))); }
  catch (그림오류) { console.log('⚠ 대표 이미지를 못 올렸다 — ' + String(그림오류.message).slice(0, 80)); }

  /* 🔴 새 서식은 편집기가 늦게 뜬다. 뜰 때까지 기다린다 — 2026-11-19 에 여기서 멈췄다 */
  for (let 번 = 0; 번 < 20; 번 += 1) {
    const 떴나 = String(await 재기(붙음, '(() => !!(window.CKEDITOR && CKEDITOR.instances && CKEDITOR.instances.FCKeditor1))', 15000));
    if (떴나 === 'true') break;
    await new Promise((쉼) => setTimeout(쉼, 2000));
  }
  const 채운결과 = String(await 재기(붙음, 채우기, 60000));
  console.log('■ 칸 채우기 — ' + 채운결과);
  if (채운결과 !== '채웠다') {
    console.log(등록실패통보(일자문자열, '편집기를 찾지 못했습니다 — ' + 채운결과, 어디));
    process.exit(1);
  }

  /* 2차 섹션은 1차가 바뀐 뒤에 채워진다 — 조금 기다렸다 고른다 */
  await new Promise((s) => setTimeout(s, 3000));
  const 작은고르기 = [
    '(() => {',
    '  const e = document.querySelector("#subSectionCode");',
    '  if (!e) return "2차 칸이 없다";',
    '  e.value = ' + JSON.stringify(작은섹션) + ';',
    '  e.dispatchEvent(new Event("change", { bubbles: true }));',
    '  return "2차 = " + e.value;',
    '})()',
  ].join('\n');
  console.log('■ 분류 — ' + String(await 재기(붙음, 작은고르기, 20000)));

  /* 🔴 사장님 2026-11-19 — 가운데 정렬을 눌러야 사진이 기사 안에 들어간다 */
  try { console.log('■ 가운데 정렬 — ' + (await 가운데정렬넣기(붙음))); }
  catch (정렬오류) { console.log('⚠ 가운데 정렬을 못 했다 — ' + String(정렬오류.message).slice(0, 80)); }

  /* 🔴🔴 [2026-11-19] 시각만 넣고 날짜를 비우면 입력시각이 1970-01-01 이 되어 기사가 사라진다.
     사장님 「노출시간을 선택하면 제대로 날짜를 설정해야지」 — 둘 다 있을 때만 건다. */
  const 날짜꼴 = String(노출날 || '').length === 10 && String(노출날).split('-').length === 3;
  const 시각꼴 = String(노출시각 || '').length === 5 && String(노출시각).split(':').length === 2;
  if (노출날 && !(날짜꼴 && 시각꼴)) {
    console.error('🔴 노출시간이 온전하지 않다 — ' + 노출날 + ' ' + 노출시각 + '. 걸지 않는다');
    process.exit(1);
  }
  if (날짜꼴 && 시각꼴) {
    try { console.log('■ 노출시간 — ' + (await 노출시간넣기(붙음, 노출날, 노출시각))); }
    catch (노출오류) { console.log('⚠ 노출시간을 못 걸었다 — ' + String(노출오류.message).slice(0, 80)); }
  }

  /* 🔴 사장님 2026-11-19 — 키워드 두 개. 넣고 엔터를 쳐야 받아들인다 */
  try { console.log('■ 키워드 — ' + (await 키워드넣기(붙음))); }
  catch (키워드오류) { console.log('⚠ 키워드를 못 넣었다 — ' + String(키워드오류.message).slice(0, 80)); }

  const 저장 = [
    '(() => {',
    '  const b = document.querySelectorAll("button");',
    '  for (let i = 0; i < b.length; i++) if ((b[i].innerText || "").trim() === "저장") { b[i].click(); return "눌렀다"; }',
    '  return "저장 단추를 못 찾았다";',
    '})()',
  ].join('\n');
  console.log('■ 저장 — ' + String(await 재기(붙음, 저장, 20000)));

  /* ④ 되읽어 판정한다 — 「눌렀다」를 「올라갔다」로 읽지 않는다 */
  await new Promise((s) => setTimeout(s, 9000));
  const 본다 = [
    '(() => {',
    '  const d = document;',
    '  const t = d.body ? d.body.innerText : "";',
    '  return JSON.stringify({',
    '    주소: location.href,',
    '    그림수: d.querySelectorAll("img[src*=ddi-color]").length,',
    '    첫줄: t.indexOf(' + JSON.stringify('[중부매일 박인택 기자]') + ') >= 0,',
    '    도움말: t.indexOf("도움말: KLifeDesign.AI") >= 0,',
    '    제목: t.indexOf(' + JSON.stringify(o.제목) + ') >= 0',
    '  });',
    '})()',
  ].join('\n');
  let 잰것 = null;
  try { 잰것 = JSON.parse(String(await 재기(붙음, 본다, 40000))); } catch { 잰것 = null; }
  console.log('■ 되읽기 — ' + JSON.stringify(잰것));

  const 됐나 = !!잰것 && 잰것.그림수 === 12 && 잰것.첫줄 && 잰것.도움말 && 잰것.제목
    && /articleView/.test(잰것.주소);

  if (됐나) {
    console.log('🟢 올라갔다 — ' + (승인할까 ? '승인' : '미승인') + ' · ' + 잰것.주소);
    /* 🔴 사장님 2026-11-19 — 승인 뒤 웹출판을 반드시 누른다 */
    if (승인할까) {
      try { console.log('■ 웹출판 — ' + (await 웹출판누르기(붙음))); }
      catch (출판오류) { console.log('⚠ 웹출판을 못 눌렀다 — ' + String(출판오류.message).slice(0, 80)); }
    }
    /* 🔴 사장님 「반드시 메뉴에서 사진 선택해서 사진제목과 설명 쓰라니까」 */
    const 기사번호 = String(잰것.주소).split('idxno=')[1];
    if (기사번호) {
      try { console.log('■ 사진 설명 — ' + (await 사진설명넣기(붙음, 기사번호, o.사진설명))); }
      catch (설명오류) { console.log('⚠ 사진 설명을 못 적었다 — ' + String(설명오류.message).slice(0, 80)); }
    }
    종료코드 = 0;
  } else {
    console.log('🔴 올라가지 않았다');
    console.log(등록실패통보(일자문자열,
      '저장은 눌렀는데 되읽기가 통과하지 못했습니다.',
      JSON.stringify(잰것)));
  }

  /* 자국을 남긴다 — 됐든 안 됐든 */
  if (!fs.existsSync(자국길)) fs.writeFileSync(자국길, '# 날\t올린때(KST)\t승인\t됐나\t그림수\t주소\n', 'utf8');
  fs.appendFileSync(자국길, [o.일자문자열, 시각문자열(), 승인할까 ? '승인' : '미승인',
    됐나 ? '됐다' : '못했다', 잰것 ? 잰것.그림수 : '-', 잰것 ? 잰것.주소 : '-'].join('\t') + '\n', 'utf8');
} catch (e) {
  console.error('🔴 돌다가 터졌다 — ' + e.message);
  console.log(등록실패통보(일자문자열, '돌다가 터졌습니다 — ' + String(e.message).slice(0, 160), ''));
} finally {
  붙음.닫기();
  /* ⛔ 연 탭은 그 일이 끝나는 자리에서 닫는다 — 2026-11-05 사장님 지시.
     안 닫으면 날마다 한 장씩 쌓여 빌드가 죽는다(225장까지 간 적이 있다). */
  if (생성한탭) {
    try { await fetch(기본뿌리 + '/json/close/' + 생성한탭); console.log('■ 연 탭을 닫았다'); }
    catch { console.log('⚠ 연 탭을 못 닫았다'); }
  }
}
process.exit(종료코드);
}
