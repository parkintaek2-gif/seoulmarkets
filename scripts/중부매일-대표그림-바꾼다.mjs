#!/usr/bin/env node
/**
 * 중부매일-대표그림-바꾼다.mjs
 *   — **예약 기사의 대표 그림**을 새 그림으로 바꾼다.
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔴🔴 사장님 2026-11-22
 *   「**예약기사는 수정해. 예약한 기사는 승인해도 예약시간에 웹표출되니 미승인 체크하지말고**」
 *   「**케이라이프맵에이아이가 맞는거야. 케이라이프디자인에이아이는 없어**」
 *
 * [왜]
 *   대표 그림 안에 「도움말: KLifeDesign.AI」가 **글자로 박혀** 있었다. 2026-11-22 에
 *   그림 두 장을 고쳤지만, 11-19 에 등록해 둔 예약 기사는 **옛 그림을 쥐고 있다.**
 *   그대로 두면 11-23 부터 틀린 주소가 또 나간다.
 *
 * [어떻게]
 *   기사 서식에서 사진 번호를 읽고, 사진 수정 창(photoWriteForm)을 열어
 *   「새로운사진 업로드」로 갈아 끼운다. **사진 창만 연다** — 기사 본문을 열어
 *   저장하지 않으므로 승인 상태와 노출 시각을 건드리지 않는다.
 *
 * ⛔ 「확인」을 누르기 전에 설명(캡션)이 비지 않았나 본다 — 비면 설명이 날아간다
 * ⛔ 이미 바꾼 기사는 다시 안 바꾼다 (기록 파일로 가린다)
 * ⛔ 이미 나간 기사는 건드리지 않는다 — 오늘 날짜보다 뒤엣것만 본다
 * ⛔ 다른 파일을 들여오지 않는다. 들여오는 순간 그 파일의 몸통이 돈다
 *    (2026-11-22 에 또 겪었다 — 들여오기 한 번에 16편을 훑었다)
 * ⛔ b.close() 금지 · 연 탭은 그 자리에서 닫는다
 *
 * 쓰는 법
 *   node scripts/중부매일-대표그림-바꾼다.mjs --잰다              (읽기만 한다)
 *   node scripts/중부매일-대표그림-바꾼다.mjs --한편 1516355      (한 편만 바꾼다)
 *   node scripts/중부매일-대표그림-바꾼다.mjs --바꾼다            (예약분을 다 바꾼다)
 *   node scripts/중부매일-대표그림-바꾼다.mjs --자체검사
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 여기 = path.dirname(fileURLToPath(import.meta.url));
const 뿌리 = path.join(여기, '..');

export const 기록파일 = {
  띠별: 'docs/중부매일-띠별-등록기록.tsv',
  별자리: 'docs/중부매일-별자리-올린기록.tsv',
};
export const 그림경로 = {
  띠별: 'C:/Users/User/Documents/GitHub/klifemap/public/astro/ttibyeol-hero-1200x630.png',
  별자리: 'C:/Users/User/Documents/GitHub/klifemap/public/astro/horoscope-hero-1200x630.png',
};
export const 바꾼기록 = 'docs/중부매일-대표그림-바꾼기록.tsv';

/** 오늘(KST) — ⛔ toISOString() 을 쓰지 않는다. 이 PC 가 이미 KST 다 */
export function 오늘() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
    + '-' + String(d.getDate()).padStart(2, '0');
}

/** 기록 글에서 「그 날 → 기사 번호」를 집는다. 같은 날이 여럿이면 «마지막» 것이 산다 */
export function 그날번호(기록글, 날) {
  let 찾음 = null;
  for (const 줄 of String(기록글 ?? '').split(/\r?\n/)) {
    if (!줄.trim() || 줄.startsWith('#')) continue;
    const 칸 = 줄.split('\t');
    if (칸[0] !== 날) continue;
    const m = /idxno=(\d+)/.exec(칸[5] || '');
    if (m) 찾음 = m[1];
  }
  return 찾음;
}

/** 아직 안 나간 날만 고른다 — 오늘보다 «뒤»엣것이다 */
export function 앞으로나갈날들(기록글, 오늘날) {
  const 것 = new Set();
  for (const 줄 of String(기록글 ?? '').split(/\r?\n/)) {
    if (!줄.trim() || 줄.startsWith('#')) continue;
    const 날 = 줄.split('\t')[0];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(날 || '')) continue;
    if (날 > 오늘날) 것.add(날);
  }
  return [...것].sort();
}

/** 이미 바꿨나 */
export function 이미바꿨나(바꾼기록글, 기사번호) {
  for (const 줄 of String(바꾼기록글 ?? '').split(/\r?\n/)) {
    if (!줄.trim() || 줄.startsWith('#')) continue;
    if (줄.split('\t')[1] === String(기사번호)) return true;
  }
  return false;
}

export const 서식주소 = (n) => 'https://cms.jbnews.com/news/adminArticleWriteForm.html?mode=modify&idxno=' + n;

export function 사진창주소(것) {
  return 'https://cms.jbnews.com/news/photoWriteForm.html'
    + '?mode=modify&idxno=' + encodeURIComponent(것.사진번호)
    + '&article_idxno=' + encodeURIComponent(것.기사번호)
    + '&subUploadDir=' + encodeURIComponent(것.방)
    + '&image=' + encodeURIComponent(것.그림)
    + '&step=' + encodeURIComponent(것.걸음)
    + '&representation=' + encodeURIComponent(것.대표);
}

/* ── 자체 검사 ───────────────────────────────────────────────────────── */
if (process.argv.includes('--자체검사')) {
  let 통 = 0; let 탈 = 0;
  const 본다 = (이름, 참) => { if (참) { 통 += 1; console.log('  ✅ ' + 이름); } else { 탈 += 1; console.log('  🔴 ' + 이름); } };
  const 보기기록 = [
    '2026-11-22\t2026-11-19 01:25\t미승인\t됐다\t12\thttps://cms.jbnews.com/news/articleView.html?idxno=1516334',
    '2026-11-23\t2026-11-19 01:30\t미승인\t됐다\t12\thttps://cms.jbnews.com/news/articleView.html?idxno=1516336',
    '2026-11-28\t2026-11-19 08:26\t미승인\t됐다\t12\thttps://cms.jbnews.com/news/articleView.html?idxno=1516355',
  ].join('\n');
  본다('① 날로 기사 번호를 집는다', 그날번호(보기기록, '2026-11-23') === '1516336');
  본다('② 없는 날은 null', 그날번호(보기기록, '2026-12-31') === null);
  본다('🔴 ③ 이미 나간 날은 안 고른다 — 오늘 것도 안 고른다',
    JSON.stringify(앞으로나갈날들(보기기록, '2026-11-22')) === JSON.stringify(['2026-11-23', '2026-11-28']));
  본다('🔴 ④ 오늘이 지나면 목록이 준다',
    JSON.stringify(앞으로나갈날들(보기기록, '2026-11-27')) === JSON.stringify(['2026-11-28']));
  본다('⑤ 이미 바꾼 것은 거른다',
    이미바꿨나('2026-11-22\t1516355\t띠별\t됐다', '1516355')
    && !이미바꿨나('2026-11-22\t1516355\t띠별\t됐다', '1516336'));
  본다('⑥ 머리글 줄은 안 센다', !이미바꿨나('#날\t기사번호\t갈래\t결과', '기사번호'));
  본다('⑦ 사진 창 주소가 photoWriteForm 을 가리킨다',
    사진창주소({ 사진번호: '1', 기사번호: '2', 방: 'a', 그림: 'b.png', 걸음: '1', 대표: 'Y' })
      .startsWith('https://cms.jbnews.com/news/photoWriteForm.html?mode=modify'));
  본다('⑧ 오늘이 KST 꼴이다', /^\d{4}-\d{2}-\d{2}$/.test(오늘()));
  본다('🔴 ⑨ 그림 파일이 둘 다 있다',
    fs.existsSync(그림경로.띠별) && fs.existsSync(그림경로.별자리));
  /* 🔴 [2026-11-22] 찾는 글자를 그대로 적으면 **이 줄 자신이 걸린다.**
     2026-11-21 에 같은 자리에서 겪었다 — 무엇이 걸렸나 적은 보고가 다시 걸렸다.
     ⇒ 쪼개서 적는다. 이 줄은 글자로 남지 않는다. */
  본다('⛔ ⑩ 다른 CMS 파일을 들여오지 않는다 — 들여오면 그 몸통이 돈다', (() => {
    const 찾을것 = 'from ' + String.fromCharCode(39) + './' + '중부매일' + '-';
    const 몸통 = fs.readFileSync(new URL(import.meta.url), 'utf8');
    return !몸통.includes(찾을것);
  })());
  console.log(탈 ? '\n🔴 자체 검사 ' + 탈 + '건 탈' : '\n✅ 자체 검사 ' + 통 + ' 통과');
  process.exit(탈 ? 1 : 0);
}

/* ── 여기서부터 CMS 를 만진다 ────────────────────────────────────────── */
const { 새탭에서, 자리잡기, 재기 } = await import('./lib/cdp.mjs');

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

/** 파일 칸에 그림을 넣는다 — CDP 로 직접 꽂는다 */
async function 그림꽂기(붙음, 그림길) {
  await 붙음.보내기('DOM.enable');
  const 문서 = await 붙음.보내기('DOM.getDocument', { depth: -1 });
  const 찾음 = await 붙음.보내기('DOM.querySelector', {
    nodeId: 문서.root.nodeId, selector: 'input[type=file]',
  });
  if (!찾음 || !찾음.nodeId) return '파일 칸을 못 찾았다';
  await 붙음.보내기('DOM.setFileInputFiles', { files: [그림길], nodeId: 찾음.nodeId });
  return '꽂았다';
}

async function 한편바꾸기(기사번호, 갈래, { 정말 }) {
  const 그림길 = 그림경로[갈래];
  if (!fs.existsSync(그림길)) return '🔴 그림 파일이 없다 — ' + 그림길;

  let 것 = null;
  await 새탭에서(서식주소(기사번호), async (붙음) => {
    await 자리잡기(붙음, { 최대: 45000 });
    try { 것 = JSON.parse(String(await 재기(붙음, 사진정보읽기, 25000))); } catch (e) { 것 = null; }
  });
  if (!것 || !것.사진번호) return '사진이 없다';
  if (!정말) return '바꿀 수 있다 — 사진 ' + 것.사진번호 + ' · 설명 ' + (것.이미적힌설명 ? '있다' : '🔴 비었다');

  let 결과 = '못 했다';
  await 새탭에서(사진창주소(것), async (붙음) => {
    await 자리잡기(붙음, { 최대: 45000 });
    await new Promise((r) => setTimeout(r, 3500));

    /* 설명이 비어 있으면 손대지 않는다 — 바꾸다가 설명이 날아가면 안 된다 */
    const 설명 = String(await 재기(붙음,
      '((document.querySelector("textarea[name=imageMemo], textarea") || {}).value || "").trim()', 15000));
    if (!설명 && !것.이미적힌설명) { 결과 = '🔴 설명이 비었다 — 손대지 않는다'; return; }

    const 눌렀나 = String(await 재기(붙음, [
      '(() => {',
      '  const e = [...document.querySelectorAll("button,a,label,div,span")]',
      '    .filter((x) => x.offsetParent !== null)',
      '    .find((x) => (x.innerText || "").trim() === "새로운사진 업로드");',
      '  if (!e) return "단추를 못 찾았다"; e.click(); return "눌렀다";',
      '})()',
    ].join('\n'), 20000));
    if (눌렀나 !== '눌렀다') { 결과 = '업로드 단추 — ' + 눌렀나; return; }
    await new Promise((r) => setTimeout(r, 2500));

    const 꽂음 = await 그림꽂기(붙음, 그림길);
    if (꽂음 !== '꽂았다') { 결과 = 꽂음; return; }
    await new Promise((r) => setTimeout(r, 9000));

    /* 설명이 비었으면 다시 넣는다 — 업로드가 지웠을 수 있다 */
    await 재기(붙음, [
      '(() => {',
      '  const t = document.querySelector("textarea[name=imageMemo], textarea");',
      '  if (!t) return "칸이 없다";',
      '  if (!(t.value || "").trim()) {',
      '    t.value = ' + JSON.stringify(것.이미적힌설명) + ';',
      '    t.dispatchEvent(new Event("input", { bubbles: true }));',
      '  }',
      '  return "됐다";',
      '})()',
    ].join('\n'), 15000);

    const 확인 = String(await 재기(붙음, [
      '(() => {',
      '  const e = [...document.querySelectorAll("button,a,input[type=button],input[type=submit]")]',
      '    .filter((x) => x.offsetParent !== null)',
      '    .find((x) => /^확인$/.test(((x.innerText || x.value || "").trim())));',
      '  if (!e) return "확인 단추를 못 찾았다"; e.click(); return "눌렀다";',
      '})()',
    ].join('\n'), 20000));
    await new Promise((r) => setTimeout(r, 7000));
    결과 = 확인 === '눌렀다' ? '✅ 바꿨다' : '확인 — ' + 확인;
  });
  return 결과;
}

/* ── 돌린다 ───────────────────────────────────────────────────────────── */
const 인자 = process.argv.slice(2);
const 정말 = 인자.includes('--바꾼다') || 인자.includes('--한편');
const 한편자리 = 인자.indexOf('--한편');
const 한편번호 = 한편자리 >= 0 ? 인자[한편자리 + 1] : null;
const 오늘날 = 오늘();

const 바꾼기록길 = path.join(뿌리, 바꾼기록);
let 바꾼글 = '';
try { 바꾼글 = fs.readFileSync(바꾼기록길, 'utf8'); } catch (e) { 바꾼글 = '#날\t기사번호\t갈래\t결과\n'; }

const 할것 = [];
for (const 갈래 of ['띠별', '별자리']) {
  let 기록글 = '';
  try { 기록글 = fs.readFileSync(path.join(뿌리, 기록파일[갈래]), 'utf8'); } catch (e) { continue; }
  for (const 날 of 앞으로나갈날들(기록글, 오늘날)) {
    const 번호 = 그날번호(기록글, 날);
    if (!번호) continue;
    if (한편번호 && 번호 !== 한편번호) continue;
    if (이미바꿨나(바꾼글, 번호)) { console.log('   ' + 날 + ' ' + 갈래 + ' ' + 번호 + '  이미 바꿨다'); continue; }
    할것.push({ 날, 갈래, 번호 });
  }
}

console.log('■ 대표 그림 바꾸기 — 오늘 ' + 오늘날 + ' 뒤로 나갈 기사 ' + 할것.length + '편'
  + (정말 ? '' : '  (--잰다 라 바꾸지 않는다)'));
if (!할것.length) { console.log('   할 것이 없다'); process.exit(0); }

let 된것 = 0; let 안된것 = 0;
for (const 하나 of 할것) {
  const 결과 = await 한편바꾸기(하나.번호, 하나.갈래, { 정말 });
  console.log('   ' + 하나.날 + ' ' + 하나.갈래.padEnd(4) + ' ' + 하나.번호 + '  ' + 결과);
  if (정말) {
    if (결과.startsWith('✅')) {
      된것 += 1;
      fs.appendFileSync(바꾼기록길, [오늘날, 하나.번호, 하나.갈래, '됐다'].join('\t') + '\n', 'utf8');
    } else 안된것 += 1;
  }
}
if (정말) console.log('\n된 것 ' + 된것 + '편 · 안 된 것 ' + 안된것 + '편');
process.exit(안된것 ? 1 : 0);
