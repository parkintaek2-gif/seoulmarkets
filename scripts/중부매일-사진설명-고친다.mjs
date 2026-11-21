#!/usr/bin/env node
/**
 * 중부매일-사진설명-고친다.mjs
 *   — 이미 올려 둔 운세 기사의 **사진 설명**을 넣고, 출처에 KLifeMap.AI 를 적는다.
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔴🔴 사장님 —
 *   ⑩ 「**모든 운세 기사에 사진설명 달아**」
 *   ⑪ 「**사진 출처에 KLifeMap.AI 넣는 것도 의미가 있잖아**」
 *
 * [왜 따로 도나]
 *   기사는 이레치를 한꺼번에 올린다. 등록하는 자(중부매일-별자리-등록.mjs)에 사진설명넣기()
 *   가 있지만, **이미 CMS 에 들어간 기사**는 그 자가 다시 짓지 않는다. 이 자가 그것들을 연다.
 *   11월 21일 띠별(1516332)·별자리(1516333)에 사진 설명이 빠져 있는 것을 11-21 에 실측했다.
 *
 * [적는 글 — 등록하는 자와 한 글자도 다르지 않다]
 *   오늘의 운세 2026년 11월 21일 띠별 운세. / KLifeMap.AI
 *   오늘의 운세 2026년 11월 21일 별자리 운세. / KLifeMap.AI
 *
 * ⛔ **기사 본문을 열어 저장하지 않는다.** 사진 창만 연다 — 승인 상태와 노출 시각을 건드리지 않는다
 * ⛔ 이미 같은 글이 적혀 있으면 아무것도 안 한다
 * ⛔ 11-21 자 앞은 건드리지 않는다 — 이미 나간 기사다
 * ⛔ b.close() 금지 · 연 탭은 그 자리에서 닫는다
 * ⛔ 중부매일 홈페이지에 실제로 반영하지 않는다 — 웹출판을 누르지 않는다
 *
 * 쓰는 법
 *   node scripts/중부매일-사진설명-고친다.mjs --잰다                     (읽기만 한다)
 *   node scripts/중부매일-사진설명-고친다.mjs --부터 2026-11-21 --까지 2026-11-28
 *   node scripts/중부매일-사진설명-고친다.mjs --자체검사
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { 새탭에서, 자리잡기, 재기 } from './lib/cdp.mjs';
import { 기록파일, 첫날, 서식주소, 그날번호, 날들만들기 } from './중부매일-도움말-고친다.mjs';

const 여기 = path.dirname(fileURLToPath(import.meta.url));
const 뿌리 = path.join(여기, '..');

/** 갈래마다 설명에 들어가는 말 */
export const 갈래말 = { 띠별: '띠별 운세', 별자리: '별자리 운세' };

/** 🔴 [사장님 ⑪] 출처에 KLifeMap.AI 를 적는다 */
export const 출처 = 'KLifeMap.AI';

/** 날짜를 「2026년 11월 21일」 꼴로 */
export function 한글날(날글) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(날글 || ''));
  if (!m) return null;
  return `${Number(m[1])}년 ${Number(m[2])}월 ${Number(m[3])}일`;
}

/** 그 기사에 적혀야 할 사진 설명 */
export function 사진말(날글, 갈래) {
  const 날 = 한글날(날글);
  const 말 = 갈래말[갈래];
  if (!날 || !말) return null;
  return `오늘의 운세 ${날} ${말}. / ${출처}`;
}

/** 이미 제대로 적혀 있나 — 글이 같고 출처가 들어 있어야 한다 */
export function 이미적혔나(적힌것, 날글, 갈래) {
  const 바른것 = 사진말(날글, 갈래);
  if (!바른것) return false;
  return String(적힌것 ?? '').trim() === 바른것;
}

/* ── CMS 에서 사진 정보를 읽는 코드 (등록하는 자와 같은 자리를 본다) ──────── */
const 사진정보읽기 = [
  '(() => {',
  '  const 제목 = [...document.querySelectorAll(".accordion-title, .accordion-header, h3, h4")]',
  '    .find((e) => /사진|이미지|포토/.test(e.textContent || ""));',
  '  if (!제목) return "";',
  '  const 속 = 제목.closest(".accordion-item") && 제목.closest(".accordion-item").querySelector(".accordion-content");',
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
  '    이미적힌설명: ((장.querySelector(".caption") || {}).textContent || "").trim(),',
  '  });',
  '})()',
].join('\n');

export function 사진창주소(것) {
  return 'https://cms.jbnews.com/news/photoWriteForm.html'
    + '?mode=modify&idxno=' + encodeURIComponent(것.사진번호)
    + '&article_idxno=' + encodeURIComponent(것.기사번호)
    + '&subUploadDir=' + encodeURIComponent(것.방)
    + '&image=' + encodeURIComponent(것.그림)
    + '&step=' + encodeURIComponent(것.걸음)
    + '&representation=' + encodeURIComponent(것.대표);
}

/** 기록에서 그 갈래·그 날의 기사 번호를 집는다 */
export function 번호찾기(갈래, 날) {
  const 길 = path.join(뿌리, 기록파일[갈래]);
  if (!fs.existsSync(길)) return null;
  return 그날번호(fs.readFileSync(길, 'utf8'), 날);
}

/* ── 한 편을 다룬다 ──────────────────────────────────────────────────── */
async function 한편(날, 갈래, 고칠까) {
  const 번호 = 번호찾기(갈래, 날);
  if (!번호) return { 날, 갈래, 번호: null, 결과: '기록에 번호가 없다' };
  const 바른것 = 사진말(날, 갈래);

  let 결과 = '못 쟀다';
  await 새탭에서(서식주소(번호), async (붙음) => {
    await 자리잡기(붙음, { 최대: 45000 });
    let 것 = null;
    try { 것 = JSON.parse(String(await 재기(붙음, 사진정보읽기, 25000))); } catch { 것 = null; }
    if (!것 || !것.사진번호) { 결과 = '사진이 없다'; return; }

    if (이미적혔나(것.이미적힌설명, 날, 갈래)) { 결과 = '이미 적혀 있다'; return; }
    if (!고칠까) {
      결과 = 것.이미적힌설명 ? `다르게 적혀 있다 — 「${것.이미적힌설명}」` : '비어 있다';
      return;
    }

    /* 사진 창만 연다 — 기사 본문은 열어 저장하지 않는다 */
    await 붙음.보내기('Page.navigate', { url: 사진창주소(것) });
    await new Promise((쉼) => setTimeout(쉼, 9000));
    const 넣음 = String(await 재기(붙음, [
      '(() => {',
      '  const 칸 = document.querySelector("textarea#caption, textarea[name=caption], input[name=caption]");',
      '  if (!칸) return "설명 칸이 없다";',
      '  칸.value = ' + JSON.stringify(바른것) + ';',
      '  칸.dispatchEvent(new Event("input", { bubbles: true }));',
      '  칸.dispatchEvent(new Event("change", { bubbles: true }));',
      '  const 단추 = [...document.querySelectorAll("button,a,input[type=button],input[type=submit]")]',
      '    .filter((e) => (((e.innerText || e.value || "") + "")).trim() === "확인");',
      '  if (!단추.length) return "확인 단추가 없다";',
      '  단추[0].click();',
      '  return "넣고 눌렀다";',
      '})()',
    ].join('\n'), 25000));
    if (넣음 !== '넣고 눌렀다') { 결과 = 넣음; return; }
    await new Promise((쉼) => setTimeout(쉼, 9000));

    /* ⛔ 「눌렀다」를 「적혔다」로 읽지 않는다 — 다시 열어 읽는다 */
    await 붙음.보내기('Page.navigate', { url: 서식주소(번호) });
    await 자리잡기(붙음, { 최대: 45000 });
    let 뒤 = null;
    try { 뒤 = JSON.parse(String(await 재기(붙음, 사진정보읽기, 25000))); } catch { 뒤 = null; }
    결과 = 이미적혔나(뒤 && 뒤.이미적힌설명, 날, 갈래)
      ? '넣었다'
      : `눌렀는데 안 적혔다 — 「${(뒤 && 뒤.이미적힌설명) || ''}」`;
  });
  return { 날, 갈래, 번호, 결과 };
}

/* ── 자체검사 ─────────────────────────────────────────────────────────── */
function 자체검사() {
  const 잰다 = [];
  const 검 = (말, 됐나) => { 잰다.push((됐나 ? '  ✅ ' : '  🔴 ') + 말); if (!됐나) 자체검사.샘 = true; };

  검('한글날이 바르게 나온다', 한글날('2026-11-21') === '2026년 11월 21일');
  검('한글날이 0 을 떼어 낸다', 한글날('2026-01-05') === '2026년 1월 5일');
  검('꼴이 아니면 null 이다', 한글날('2026/11/21') === null);

  검('띠별 사진 설명이 바르다',
    사진말('2026-11-21', '띠별') === '오늘의 운세 2026년 11월 21일 띠별 운세. / KLifeMap.AI');
  검('별자리 사진 설명이 바르다',
    사진말('2026-11-20', '별자리') === '오늘의 운세 2026년 11월 20일 별자리 운세. / KLifeMap.AI');
  검('🔴 출처에 KLifeMap.AI 가 반드시 든다 (사장님 ⑪)',
    /\/ KLifeMap\.AI$/.test(사진말('2026-11-21', '띠별')));
  검('모르는 갈래면 null 이다', 사진말('2026-11-21', '사주') === null);

  검('같은 글이면 이미 적힌 것으로 본다',
    이미적혔나('오늘의 운세 2026년 11월 21일 띠별 운세. / KLifeMap.AI', '2026-11-21', '띠별'));
  검('앞뒤 빈칸은 무시한다',
    이미적혔나('  오늘의 운세 2026년 11월 21일 띠별 운세. / KLifeMap.AI  ', '2026-11-21', '띠별'));
  검('🔴 출처가 빠지면 아직이다',
    !이미적혔나('오늘의 운세 2026년 11월 21일 띠별 운세.', '2026-11-21', '띠별'));
  검('🔴 옛 출처(KLifeDesign.AI)면 아직이다',
    !이미적혔나('오늘의 운세 2026년 11월 21일 띠별 운세. / KLifeDesign.AI', '2026-11-21', '띠별'));
  검('비어 있으면 아직이다', !이미적혔나('', '2026-11-21', '띠별'));
  검('날이 다르면 아직이다',
    !이미적혔나('오늘의 운세 2026년 11월 20일 띠별 운세. / KLifeMap.AI', '2026-11-21', '띠별'));
  검('갈래가 다르면 아직이다',
    !이미적혔나('오늘의 운세 2026년 11월 21일 별자리 운세. / KLifeMap.AI', '2026-11-21', '띠별'));

  검('사진창주소가 여섯 칸을 모두 싣는다', (() => {
    const 주소 = 사진창주소({ 사진번호: '1', 기사번호: '2', 방: '3', 그림: 'a.jpg', 걸음: '1', 대표: 'Y' });
    return ['idxno=1', 'article_idxno=2', 'subUploadDir=3', 'image=a.jpg', 'step=1', 'representation=Y']
      .every((칸) => 주소.includes(칸));
  })());
  검('사진창주소가 photoWriteForm 으로 간다',
    사진창주소({ 사진번호: '1', 기사번호: '2', 방: '3', 그림: 'a', 걸음: '1', 대표: 'Y' })
      .startsWith('https://cms.jbnews.com/news/photoWriteForm.html'));

  검('⛔ 11-21 앞은 손대지 않는다 (첫날이 그대로다)', 첫날 === '2026-11-21');
  검('날들만들기가 이레를 낸다', 날들만들기('2026-11-21', '2026-11-28').length === 8);

  검('띠별 기록 파일이 있다', fs.existsSync(path.join(뿌리, 기록파일.띠별)));
  검('별자리 기록 파일이 있다', fs.existsSync(path.join(뿌리, 기록파일.별자리)));
  검('🔴 11-21 띠별 번호를 찾는다', 번호찾기('띠별', '2026-11-21') === '1516332');
  검('🔴 11-21 별자리 번호를 찾는다', 번호찾기('별자리', '2026-11-21') === '1516333');
  검('없는 날은 null 이다', 번호찾기('띠별', '2030-01-01') === null);

  console.log('━━━ 자체검사 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(잰다.join('\n'));
  console.log(`━━━ ${잰다.length}가지 가운데 ${잰다.filter((s) => s.includes('✅')).length}가지 통과`);
  return !자체검사.샘;
}

/* ── 들머리 ───────────────────────────────────────────────────────────── */
const 인자 = process.argv.slice(2);
const 집는다 = (이름) => { const i = 인자.indexOf(이름); return i >= 0 ? 인자[i + 1] : null; };

if (인자.includes('--자체검사')) {
  process.exit(자체검사() ? 0 : 1);
}

const 잰다만 = 인자.includes('--잰다');
const 부터 = 집는다('--부터') || 집는다('--날') || 첫날;
const 까지 = 집는다('--까지') || 집는다('--날') || '2026-11-28';
const 날들 = 날들만들기(부터, 까지).filter((날) => 날 >= 첫날);

if (!날들.length) {
  console.error('🔴 다룰 날이 없다 — --부터 / --까지 를 보라. 첫날은 ' + 첫날 + ' 이다');
  process.exit(1);
}

console.log(`■ ${잰다만 ? '잰다' : '고친다'} — ${날들[0]} ~ ${날들[날들.length - 1]} · ${날들.length}일 × 2갈래`);
const 모음 = [];
for (const 날 of 날들) {
  for (const 갈래 of ['띠별', '별자리']) {
    let 것;
    try { 것 = await 한편(날, 갈래, !잰다만); }
    catch (e) { 것 = { 날, 갈래, 번호: null, 결과: '터졌다 — ' + String(e.message).slice(0, 70) }; }
    모음.push(것);
    console.log(`   ${것.날} ${것.갈래.padEnd(4)} ${String(것.번호 || '-').padEnd(8)} ${것.결과}`);
  }
}

console.log('');
const 셈 = new Map();
for (const 것 of 모음) {
  const 열쇠 = 것.결과.replace(/ —.*$/, '');
  셈.set(열쇠, (셈.get(열쇠) || 0) + 1);
}
for (const [열쇠, 수] of [...셈.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`   ${String(수).padStart(3)}편 · ${열쇠}`);
}
