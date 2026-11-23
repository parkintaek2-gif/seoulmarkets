#!/usr/bin/env node
/**
 * 중부매일-분류-바꾼다.mjs
 *   — 예약 기사의 «2차 섹션(분류)»을 새 코드로 바꾼다.
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔴🔴 [2026-11-23 · 사장님]
 *   「**중부매일 운세 코드 변경했다. (1) S2N157 > S2N203**
 *    **(2) 오늘의 운세 목록 주소: https://www.jbnews.com//news/articleList.html**
 *    **?sc_section_code=S1N29&sc_sub_section_code=S2N203&view_type=sm**
 *    **(3) 11월 24일이후 예약기사 기사분류를 새로운 분류코드의 오늘의 운세로 바꿔**」
 *   「**11월 22일 기사까지는 내가 분류를 바꿨다**」
 *
 * 🔴 [2026-11-22 · 사장님] 「**예약기사는 수정해. 예약한 기사는 승인해도
 *    예약시간에 웹표출되니 미승인 체크하지말고**」
 *   ⇒ 저장할 때 승인 라디오를 **건드리지 않는다.** 미승인을 새로 누르지 않는다.
 *
 * [왜]
 *   중부매일이 운세 분류 코드를 바꿨다. 예약해 둔 기사는 **옛 코드를 쥐고 있어**
 *   그대로 두면 새 운세 목록에 안 뜬다.
 *
 * [어떻게]
 *   기사 수정 서식을 열어 #subSectionCode 만 바꾸고 저장한다.
 *   저장한 뒤 **다시 열어 되읽는다** — 분류·승인·예약 시각 셋을 견준다.
 *
 * ⛔ 「저장을 눌렀다」를 「바뀌었다」로 읽지 않는다. 되읽기를 통과해야 바뀐 것이다
 * ⛔ 승인 상태와 예약 시각이 저장 전과 달라지면 **빨간불로 적는다** — 삼키지 않는다
 * ⛔ 이미 나간 기사는 건드리지 않는다 — --부터 보다 앞엣것은 보지 않는다
 * ⛔ 다른 중부매일 파일을 들여오지 않는다. 들여오는 순간 그 파일의 몸통이 돈다
 * ⛔ b.close() 금지 · 연 탭은 그 자리에서 닫는다
 *
 * 쓰는 법
 *   node scripts/중부매일-분류-바꾼다.mjs --잰다                 (읽기만 한다)
 *   node scripts/중부매일-분류-바꾼다.mjs --한편 1516338          (한 편만 바꾼다)
 *   node scripts/중부매일-분류-바꾼다.mjs --바꾼다                (대상을 다 바꾼다)
 *   node scripts/중부매일-분류-바꾼다.mjs --자체검사
 *   덧:  --부터 2026-11-24   (기본값. 이 날 «부터»를 본다)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 여기 = path.dirname(fileURLToPath(import.meta.url));
const 뿌리 = path.join(여기, '..');

/* ── 정해 둔 값 ──────────────────────────────────────────────────────── */
export const 옛코드 = 'S2N157';                 /* 연재 */
export const 새코드 = 'S2N203';                 /* 오늘의 운세 */
export const 새이름 = '오늘의 운세';
export const 큰코드 = 'S1N29';                  /* 기획·특집 */
export const 기본부터 = '2026-11-24';           /* 사장님 — 11월 22일까지는 사장님이 바꾸셨다 */

export const 기록파일 = {
  띠별: 'docs/중부매일-띠별-등록기록.tsv',
  별자리: 'docs/중부매일-별자리-올린기록.tsv',
};
export const 바꾼기록 = 'docs/중부매일-분류-바꾼기록.tsv';
export const 서식주소 = (n) => 'https://cms.jbnews.com/news/adminArticleWriteForm.html?mode=modify&idxno=' + n;

/** 오늘(KST) — ⛔ toISOString() 을 쓰지 않는다. 이 PC 가 이미 KST 다 */
export function 오늘() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
    + '-' + String(d.getDate()).padStart(2, '0');
}

/**
 * 기록 글에서 「그 날부터」의 «날 → 기사 번호»를 집는다.
 * 같은 날이 여럿이면 «마지막» 줄이 산다 — 뒤에 적힌 것이 최신이다.
 */
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

/** 이미 바꿨나 */
export function 이미바꿨나(바꾼기록글, 기사번호) {
  for (const 줄 of String(바꾼기록글 ?? '').split(/\r?\n/)) {
    if (!줄.trim() || 줄.startsWith('#')) continue;
    const 칸 = 줄.split('\t');
    if (칸[1] === String(기사번호) && /됐다/.test(칸[4] || '')) return true;
  }
  return false;
}

/** 저장 앞뒤가 같은가 — 분류만 바뀌고 나머지는 그대로여야 한다 */
export function 달라진것(앞, 뒤) {
  const 것 = [];
  if (뒤.분류 !== 새코드) 것.push('분류가 ' + 새코드 + ' 가 아니다 (' + 뒤.분류 + ')');
  if (뒤.큰분류 !== 앞.큰분류) 것.push('1차 섹션이 바뀌었다 ' + 앞.큰분류 + ' → ' + 뒤.큰분류);
  if (뒤.승인 !== 앞.승인) 것.push('🔴 승인 상태가 바뀌었다 ' + 앞.승인 + ' → ' + 뒤.승인);
  if (뒤.예약 !== 앞.예약) 것.push('🔴 예약 시각이 바뀌었다 ' + 앞.예약 + ' → ' + 뒤.예약);
  if (뒤.제목 !== 앞.제목) 것.push('🔴 제목이 바뀌었다');
  return 것;
}

/** 대상을 모은다 — 두 기록을 합쳐 날짜 차례로 */
export function 대상모으기(띠별글, 별자리글, 부터) {
  const 것 = [];
  날부터번호들(띠별글, 부터).forEach(([날, n]) => 것.push({ 날, 기사번호: n, 갈래: '띠별' }));
  날부터번호들(별자리글, 부터).forEach(([날, n]) => 것.push({ 날, 기사번호: n, 갈래: '별자리' }));
  return 것.sort((a, b) => (a.날 === b.날 ? (a.갈래 < b.갈래 ? -1 : 1) : (a.날 < b.날 ? -1 : 1)));
}

/* ── 자체 검사 ───────────────────────────────────────────────────────── */
if (process.argv.includes('--자체검사')) {
  let 통 = 0; let 탈 = 0;
  const 본다 = (이름, 참) => {
    if (참) { 통 += 1; console.log('  ✅ ' + 이름); } else { 탈 += 1; console.log('  🔴 ' + 이름); }
  };
  const 띠 = [
    '# 날\t올린때\t승인\t됐나\t그림수\t주소',
    '2026-11-22\t2026-11-19 01:25\t미승인\t됐다\t12\thttps://cms.jbnews.com/news/articleView.html?idxno=1516334',
    '2026-11-24\t2026-11-19 01:30\t미승인\t됐다\t12\thttps://cms.jbnews.com/news/articleView.html?idxno=1516338',
    '2026-11-28\t2026-11-19 08:26\t미승인\t됐다\t12\thttps://cms.jbnews.com/news/articleView.html?idxno=1516355',
  ].join('\n');
  const 별 = [
    '2026-11-24\t2026-11-19 01:31\t미승인\t됐다\t12\thttps://cms.jbnews.com/news/articleView.html?idxno=1516339',
  ].join('\n');

  본다('① 그 날부터만 집는다 — 앞엣것은 안 집는다',
    JSON.stringify(날부터번호들(띠, '2026-11-24')) === JSON.stringify([['2026-11-24', '1516338'], ['2026-11-28', '1516355']]));
  본다('🔴 ② 사장님이 바꾸신 11-22 는 손대지 않는다',
    !날부터번호들(띠, '2026-11-24').some(([날]) => 날 === '2026-11-22'));
  본다('③ 머리글 줄은 안 센다', !날부터번호들(띠, '2000-01-01').some(([날]) => 날 === '# 날'));
  본다('④ 같은 날이 여럿이면 마지막이 산다',
    날부터번호들('2026-11-24\t..\tidxno=111\n2026-11-24\t..\tidxno=222', '2026-11-24')[0][1] === '222');
  본다('⑤ 두 갈래를 날짜 차례로 합친다', (() => {
    const 것 = 대상모으기(띠, 별, '2026-11-24');
    return 것.length === 3 && 것[0].날 === '2026-11-24' && 것[0].갈래 === '띠별'
      && 것[1].갈래 === '별자리' && 것[2].날 === '2026-11-28';
  })());
  본다('⑥ 이미 바꾼 것은 거른다',
    이미바꿨나('2026-11-23\t1516338\t띠별\tS2N203\t됐다', '1516338')
    && !이미바꿨나('2026-11-23\t1516338\t띠별\tS2N203\t됐다', '1516339'));
  본다('🔴 ⑦ 「못 했다」로 적힌 것은 바꾼 것으로 치지 않는다',
    !이미바꿨나('2026-11-23\t1516338\t띠별\tS2N203\t못 했다', '1516338'));

  const 앞 = { 분류: 옛코드, 큰분류: 큰코드, 승인: '승인', 예약: '2026-11-24 00:02', 제목: 'ㄱ' };
  본다('⑧ 분류만 바뀌면 통과', 달라진것(앞, { ...앞, 분류: 새코드 }).length === 0);
  본다('🔴 ⑨ 승인 상태가 바뀌면 잡는다',
    달라진것(앞, { ...앞, 분류: 새코드, 승인: '미승인' }).some((m) => /승인 상태가 바뀌었다/.test(m)));
  본다('🔴 ⑩ 예약 시각이 바뀌면 잡는다',
    달라진것(앞, { ...앞, 분류: 새코드, 예약: '2026-11-25 00:02' }).some((m) => /예약 시각이 바뀌었다/.test(m)));
  본다('🔴 ⑪ 분류가 안 바뀌었으면 잡는다',
    달라진것(앞, { ...앞 }).some((m) => /분류가/.test(m)));
  본다('⑫ 오늘이 KST 꼴이다', /^\d{4}-\d{2}-\d{2}$/.test(오늘()));
  본다('⑬ 새 코드와 옛 코드가 다르다', 새코드 !== 옛코드 && 큰코드 === 'S1N29');
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
  '  const 예약 = v("input[name=articleDate]") + " " + v("input[name=articleTime]");',
  '  return JSON.stringify({',
  '    제목: v("input[name=title], #title"),',
  '    큰분류: 큰 ? 큰.value : "",',
  '    분류: 작은 ? 작은.value : "",',
  '    분류이름: 작은 && 작은.options[작은.selectedIndex] ? 작은.options[작은.selectedIndex].text : "",',
  '    승인,',
  '    예약: 예약.trim(),',
  '    새코드가있나: !!(작은 && [...작은.options].some((o) => o.value === "' + 새코드 + '")),',
  '  });',
  '})()',
].join('\n');

const 바꾸는글 = [
  '(() => {',
  '  const 작은 = document.querySelector("#subSectionCode, select[name=subSectionCode]");',
  '  if (!작은) return "분류 칸을 못 찾았다";',
  '  if (![...작은.options].some((o) => o.value === "' + 새코드 + '")) return "새 코드가 보기에 없다";',
  '  작은.value = "' + 새코드 + '";',
  '  작은.dispatchEvent(new Event("change", { bubbles: true }));',
  '  return 작은.value === "' + 새코드 + '" ? "바꿨다" : "안 바뀌었다";',
  /* ⛔ 승인 라디오는 건드리지 않는다 — 사장님 2026-11-22 「미승인 체크하지말고」 */
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
    await new Promise((r) => setTimeout(r, 2500));
    try { 것 = JSON.parse(String(await 재기(붙음, 읽는글, 25000))); } catch (e) { 것 = null; }
  });
  return 것;
}

async function 한편바꾸기(기사번호) {
  const 앞 = await 한편읽기(기사번호);
  if (!앞) return { 결과: '🔴 서식을 못 읽었다' };
  if (!앞.새코드가있나) return { 결과: '🔴 새 코드가 보기에 없다 — CMS 분류가 다르다', 앞 };
  if (앞.분류 === 새코드) return { 결과: '이미 새 분류다', 앞, 건너뜀: true };

  let 눌렀나 = '';
  let 바꿨나 = '';
  await 새탭에서(서식주소(기사번호), async (붙음) => {
    await 자리잡기(붙음, { 최대: 45000 });
    await new Promise((r) => setTimeout(r, 2500));
    바꿨나 = String(await 재기(붙음, 바꾸는글, 20000));
    if (바꿨나 !== '바꿨다') return;
    눌렀나 = String(await 재기(붙음, 저장글, 20000));
    await new Promise((r) => setTimeout(r, 6000));
  });
  if (바꿨나 !== '바꿨다') return { 결과: '🔴 분류를 못 바꿨다 — ' + 바꿨나, 앞 };
  if (눌렀나 !== '눌렀다') return { 결과: '🔴 저장을 못 눌렀다 — ' + 눌렀나, 앞 };

  /* ⛔ 「눌렀다」를 「바뀌었다」로 읽지 않는다 — 다시 열어 되읽는다 */
  const 뒤 = await 한편읽기(기사번호);
  if (!뒤) return { 결과: '🔴 되읽기를 못 했다', 앞 };
  const 어긋남 = 달라진것(앞, 뒤);
  return { 결과: 어긋남.length ? '🔴 ' + 어긋남.join(' · ') : '됐다', 앞, 뒤, 어긋남 };
}

/* ── 돈다 ────────────────────────────────────────────────────────────── */
const 부터덧 = process.argv.indexOf('--부터');
const 부터 = 부터덧 >= 0 && process.argv[부터덧 + 1] ? process.argv[부터덧 + 1] : 기본부터;
const 한편덧 = process.argv.indexOf('--한편');
const 정말 = process.argv.includes('--바꾼다') || 한편덧 >= 0;

const 읽기 = (상대길) => {
  const 길 = path.join(뿌리, 상대길);
  return fs.existsSync(길) ? fs.readFileSync(길, 'utf8') : '';
};

let 대상 = [];
if (한편덧 >= 0 && process.argv[한편덧 + 1]) {
  대상 = [{ 날: '(손으로)', 기사번호: process.argv[한편덧 + 1], 갈래: '(손으로)' }];
} else {
  대상 = 대상모으기(읽기(기록파일.띠별), 읽기(기록파일.별자리), 부터);
}

console.log('■ ' + 부터 + ' 부터 — 대상 ' + 대상.length + '편');
console.log('■ ' + 옛코드 + ' → ' + 새코드 + ' (' + 새이름 + ')');
console.log('⛔ 승인 라디오는 건드리지 않는다 (사장님 2026-11-22)\n');

if (!정말) {
  for (const 것 of 대상) {
    const 앞 = await 한편읽기(것.기사번호);
    console.log([
      것.날, 것.갈래, 것.기사번호,
      앞 ? ('분류=' + 앞.분류 + '(' + 앞.분류이름 + ')') : '🔴 못 읽었다',
      앞 ? ('승인=' + 앞.승인) : '',
      앞 ? ('예약=' + 앞.예약) : '',
      앞 && 앞.분류 === 새코드 ? '← 이미 새 분류' : '',
    ].join('  '));
  }
  console.log('\n■ 읽기만 했다. 바꾸려면 --바꾼다 를 붙인다');
  process.exit(0);
}

const 바꾼기록글 = 읽기(바꾼기록);
const 줄들 = [];
let 됐다 = 0; let 탈 = 0; let 건너뜀 = 0;
for (const 것 of 대상) {
  if (이미바꿨나(바꾼기록글, 것.기사번호)) {
    console.log(것.날 + '  ' + 것.기사번호 + '  이미 바꿨다 — 건너뛴다');
    건너뜀 += 1;
    continue;
  }
  const r = await 한편바꾸기(것.기사번호);
  console.log(것.날 + '  ' + 것.갈래 + '  ' + 것.기사번호 + '  ' + r.결과);
  if (r.결과 === '됐다') 됐다 += 1;
  else if (r.건너뜀) 건너뜀 += 1;
  else 탈 += 1;
  줄들.push([오늘(), 것.기사번호, 것.갈래, 새코드, r.결과].join('\t'));
}

if (줄들.length) {
  const 길 = path.join(뿌리, 바꾼기록);
  if (!fs.existsSync(길)) fs.writeFileSync(길, '# 날\t기사번호\t갈래\t새분류\t결과\n', 'utf8');
  fs.appendFileSync(길, 줄들.join('\n') + '\n', 'utf8');
}

console.log('\n■ 됐다 ' + 됐다 + '편 · 건너뜀 ' + 건너뜀 + '편 · 🔴 탈 ' + 탈 + '편');
process.exit(탈 ? 1 : 0);
