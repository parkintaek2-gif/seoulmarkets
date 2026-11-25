/**
 * 중부매일-미승인-구운세-삭제한다.mjs — 미승인기사 목록의 **「(구)오늘의운세」를 기사째 지운다.**
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔴🔴 사장님 2026-11-25 — 「**미승인기사에 있는 (구 오늘의 운세) 다 삭제해**」
 *   복명복창하고 승낙(「해」)을 받은 뒤에 만들었다.
 *
 * ⛔⛔ 되돌릴 수 없다. 그래서 —
 *   ① 지우기 전에 번호·제목·분류를 파일에 적는다
 *   ② 전체선택(`#chkall`)을 쓰지 않는다. 줄마다 번호로 켠다
 *   ③ 분류 칸이 **「(구)오늘의운세」로 시작하는 줄만** 켠다
 *   ④ 누르기 직전에 켜진 번호를 다시 세어, 바라던 것과 한 개라도 다르면 멈춘다
 *   ⑤ 누른 뒤 목록을 다시 열어 사라졌나 본다
 *
 * ⛔ 「오늘의 운세」(사장님 이름으로 예약된 것)는 **절대 켜지 않는다.**
 *   2026-11-25 에 그것을 2건 지워 사고를 냈다. 이 자에는 그 분류를 지우는 길이 없다.
 * ⛔ 운세가 아닌 미승인 기사도 건드리지 않는다.
 *
 *   node scripts/중부매일-미승인-구운세-삭제한다.mjs --자가시험
 *   node scripts/중부매일-미승인-구운세-삭제한다.mjs --센다
 *   node scripts/중부매일-미승인-구운세-삭제한다.mjs --한다 --몇건 1
 *   node scripts/중부매일-미승인-구운세-삭제한다.mjs --한다
 */
import fs from 'node:fs';
import { 새탭에서, 자리잡기, 재기 } from './lib/cdp.mjs';

export const 미승인화면 = 'https://cms.jbnews.com/news/adminArticleIntegrationRecognition.html?sc_area=RW';
export const 쪽주소 = (쪽) => (Number(쪽) > 1 ? 미승인화면 + '&page=' + Math.floor(Number(쪽)) : 미승인화면);
export const 목록곳 = 'docs/자국/중부매일-미승인-구운세-삭제대상.json';
export const 일지곳 = 'docs/자국/중부매일-미승인-구운세-삭제-일지.json';

/** 지울 것인가 — ⛔ 분류가 「(구)오늘의운세」로 시작할 때만 */
export function 지울것인가(분류글) {
  const s = String(분류글 ?? '').trim();
  return /^\(구\)\s*오늘의운세/.test(s);
}

export const 줄읽기글 = [
  '(() => {',
  '  const 줄들 = [...document.querySelectorAll("tr[data-article_idxno]")];',
  '  return JSON.stringify({ 줄수: 줄들.length, 것: 줄들.map((tr) => {',
  '    const a = tr.querySelector("a");',
  '    const 칸 = [...tr.querySelectorAll("td")].map((td) => (td.innerText || "").replace(/\\s+/g, " ").trim());',
  '    return { 번호: tr.getAttribute("data-article_idxno") || "",',
  '      제목: ((a && a.innerText) || "").replace(/\\s+/g, " ").trim().slice(0, 50),',
  '      분류: 칸[1] || "", 기자: 칸[2] || "", 칸: 칸.slice(0, 5),',
  '      선택칸: !!document.getElementById("chkbox_" + (tr.getAttribute("data-article_idxno") || "")) };',
  '  }) });',
  '})()',
].join('\n');

export const 모두끄기글 = [
  '(() => {',
  '  let 껐다 = 0;',
  '  for (const e of document.querySelectorAll("input[type=checkbox]")) {',
  '    if (e.checked) { e.checked = false; e.dispatchEvent(new Event("change", { bubbles: true })); 껐다 += 1; }',
  '  }',
  '  return String(껐다);',
  '})()',
].join('\n');

export function 하나켜기글(번호) {
  return [
    '(() => {',
    '  const e = document.getElementById("chkbox_" + ' + JSON.stringify(String(번호)) + ');',
    '  if (!e) return "그 줄의 선택칸이 없다";',
    '  if (e.value !== ' + JSON.stringify(String(번호)) + ') return "🔴 선택칸의 값이 다르다 " + e.value;',
    '  e.click(); e.checked = true;',
    '  e.dispatchEvent(new Event("change", { bubbles: true }));',
    '  return e.checked ? "켰다" : "🔴 안 켜졌다";',
    '})()',
  ].join('\n');
}

export const 켜진것글 = [
  '(() => {',
  '  const 것 = [...document.querySelectorAll("input[name=\'chkbox[]\']")].filter((e) => e.checked).map((e) => e.value);',
  '  const 전체 = document.getElementById("chkall");',
  '  return JSON.stringify({ 켜진것: 것, 전체선택: !!(전체 && 전체.checked) });',
  '})()',
].join('\n');

export const 삭제자리글 = [
  '(() => {',
  '  const b = [...document.querySelectorAll("button.allDel-btn")].find((e) => (e.offsetWidth || e.offsetHeight));',
  '  if (!b) return "";',
  '  if (!/선택삭제/.test((b.innerText || "") + "")) return "";',
  '  b.scrollIntoView({ block: "center" });',
  '  const r = b.getBoundingClientRect();',
  '  return JSON.stringify({ x: r.left + r.width / 2, y: r.top + r.height / 2 });',
  '})()',
].join('\n');

const 쉰다 = (밀리) => new Promise((끝) => setTimeout(끝, 밀리));

async function 진짜마우스로(붙음, 좌표) {
  for (const 유형 of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
    await 붙음.보내기('Input.dispatchMouseEvent', {
      type: 유형, x: 좌표.x, y: 좌표.y,
      button: 유형 === 'mouseMoved' ? 'none' : 'left',
      clickCount: 유형 === 'mouseMoved' ? 0 : 1,
    });
    await 쉰다(300);
  }
}

export async function 한쪽읽기(쪽) {
  return 새탭에서(쪽주소(쪽), async (붙음) => {
    붙음.듣기('Page.javascriptDialogOpening', () => {
      붙음.보내기('Page.handleJavaScriptDialog', { accept: true }).catch(() => {});
    });
    await 자리잡기(붙음, { 최대: 45000 });
    await 쉰다(2500);
    try { return JSON.parse(String(await 재기(붙음, 줄읽기글, 25000))); } catch { return null; }
  });
}

export async function 모은다(최대쪽 = 30) {
  const 모은것 = new Map();
  for (let 쪽 = 1; 쪽 <= 최대쪽; 쪽 += 1) {
    const r = await 한쪽읽기(쪽);
    if (!r) { console.log('🔴 ' + 쪽 + '쪽을 못 읽었다'); continue; }
    let 새것 = 0;
    for (const o of r.것 || []) { if (o.번호 && !모은것.has(o.번호)) { 모은것.set(o.번호, o); 새것 += 1; } }
    if (!새것) break;
    await 쉰다(800);
  }
  return [...모은것.values()];
}

/**
 * 첫 쪽에서 「(구)오늘의운세」 줄을 `몇건` 까지 켜고 한 번에 지운다.
 * 돌려주는 것: { 지운번호, 말 }
 */
export async function 첫쪽에서지운다(몇건) {
  return 새탭에서(쪽주소(1), async (붙음) => {
    const 물음 = [];
    붙음.듣기('Page.javascriptDialogOpening', (p) => {
      물음.push(String((p && p.message) || '').slice(0, 60));
      붙음.보내기('Page.handleJavaScriptDialog', { accept: true }).catch(() => {});
    });
    await 자리잡기(붙음, { 최대: 45000 });
    await 쉰다(3000);

    let r = null;
    try { r = JSON.parse(String(await 재기(붙음, 줄읽기글, 25000))); } catch { r = null; }
    if (!r) return { 지운번호: [], 말: '🔴 목록을 못 읽었다', 멈춤: true };
    const 대상 = (r.것 || []).filter((o) => 지울것인가(o.분류)).slice(0, 몇건);
    if (!대상.length) return { 지운번호: [], 말: '첫 쪽에 지울 것이 없다', 끝: true };

    await 재기(붙음, 모두끄기글, 20000);
    for (const o of 대상) {
      const 켬 = String(await 재기(붙음, 하나켜기글(o.번호), 20000));
      if (켬 !== '켰다') return { 지운번호: [], 말: '🔴 ' + o.번호 + ' ' + 켬, 멈춤: true };
    }

    /* ④ 누르기 직전 — 켜진 것이 바라던 것과 «정확히» 같은가 */
    let 켜진 = null;
    try { 켜진 = JSON.parse(String(await 재기(붙음, 켜진것글, 20000))); } catch { 켜진 = null; }
    const 바란 = 대상.map((o) => String(o.번호)).sort().join(',');
    if (!켜진 || 켜진.전체선택 || [...켜진.켜진것].map(String).sort().join(',') !== 바란) {
      return { 지운번호: [], 말: '🔴 켜진 것이 바라던 것과 다르다 — 누르지 않았다', 멈춤: true };
    }

    let 좌표 = null;
    const 자리 = String(await 재기(붙음, 삭제자리글, 20000));
    if (자리) { try { 좌표 = JSON.parse(자리); } catch { 좌표 = null; } }
    if (!좌표) return { 지운번호: [], 말: '🔴 선택삭제 단추를 못 찾았다', 멈춤: true };

    await 진짜마우스로(붙음, 좌표);
    /* 스무 건을 한 번에 지우면 8초로는 모자랐다 — 한 건이 «아직 있다»로 읽혀 멈췄다(실제로는 지워져 있었다) */
    await 쉰다(15000);

    /* ⑤ 되읽는다 */
    await 붙음.보내기('Page.navigate', { url: 쪽주소(1) });
    await 자리잡기(붙음, { 최대: 40000 });
    await 쉰다(3000);
    let 뒤 = null;
    try { 뒤 = JSON.parse(String(await 재기(붙음, 줄읽기글, 25000))); } catch { 뒤 = null; }
    const 남은 = new Set(((뒤 && 뒤.것) || []).map((o) => String(o.번호)));
    const 지운 = 대상.filter((o) => !남은.has(String(o.번호)));
    const 안지워진 = 대상.filter((o) => 남은.has(String(o.번호)));
    return {
      지운번호: 지운.map((o) => ({ 번호: o.번호, 제목: o.제목, 분류: o.분류 })),
      말: '지운 것 ' + 지운.length + ' · 남은 것 ' + 안지워진.length + (물음.length ? ' · 물음창 [' + 물음.join(' / ') + ']' : ''),
      멈춤: 안지워진.length > 0,
    };
  });
}

/* ── 자가시험 ──────────────────────────────────────────────── */
function 직접실행인가() { return (process.argv[1] || '').includes('중부매일-미승인-구운세-삭제한다'); }

if (직접실행인가() && process.argv.includes('--자가시험')) {
  const 잰다 = []; const 본다 = (이름, v) => 잰다.push([이름, !!v]);
  본다('미승인 화면이다 — 예약 화면이 아니다', 미승인화면.includes('Recognition.html?sc_area=RW') && !미승인화면.includes('Embargo'));
  본다('🔴 (구)오늘의운세는 지운다', 지울것인가('(구)오늘의운세-네이버 X') === true);
  본다('⛔ 「오늘의 운세」는 «절대» 지우지 않는다', 지울것인가('오늘의 운세') === false);
  본다('⛔ 「오늘의운세」(구 없음)도 지우지 않는다', 지울것인가('오늘의운세') === false);
  본다('⛔ 빈 분류·다른 분류는 지우지 않는다',
    지울것인가('') === false && 지울것인가(null) === false && 지울것인가('스포츠') === false && 지울것인가('연재') === false);
  본다('⛔ 전체선택을 쓰지 않는다', !하나켜기글(1).includes('chkall'));
  본다('켜기 전에 칸의 값이 그 번호인지 본다', 하나켜기글(1497885).includes('e.value !=='));
  본다('누르기 직전에 켜진 것을 센다', 켜진것글.includes('e.checked') && 켜진것글.includes('chkall'));
  본다('선택삭제 단추를 class 와 글자로 고른다', 삭제자리글.includes('allDel-btn') && 삭제자리글.includes('선택삭제'));
  본다('⛔ 줄읽기글은 아무것도 누르지 않는다', !/\.click\(|submit\(/.test(줄읽기글));
  const 진 = 잰다.filter(([, v]) => !v);
  for (const [이름, v] of 잰다) console.log((v ? '  ✅ ' : '  🔴 ') + 이름);
  console.log(진.length ? ('🔴 ' + 진.length + '가지 깨졌다') : ('✅ 자가시험 ' + 잰다.length + ' 통과'));
  process.exit(진.length ? 1 : 0);
}

if (직접실행인가() && process.argv.includes('--센다')) {
  const 것 = await 모은다();
  const 갈래 = {};
  for (const o of 것) 갈래[o.분류 || '(빈칸)'] = (갈래[o.분류 || '(빈칸)'] || 0) + 1;
  const 대상 = 것.filter((o) => 지울것인가(o.분류));
  console.log('■ 미승인기사 모두 ' + 것.length + '건');
  console.log('■ 분류별: ' + JSON.stringify(갈래, null, 1));
  console.log('■ 지울 것 ((구)오늘의운세) ' + 대상.length + '건 · 선택칸 없는 줄 ' + 대상.filter((o) => !o.선택칸).length + '건');
  fs.writeFileSync(목록곳, JSON.stringify(대상, null, 1), 'utf8');
  console.log('■ 적었다 — ' + 목록곳);
}

if (직접실행인가() && process.argv.includes('--한다')) {
  const i = process.argv.indexOf('--몇건');
  let 남은몫 = i >= 0 ? Math.max(1, Number(process.argv[i + 1]) || 1) : 99999;
  let 일지 = [];
  try { 일지 = JSON.parse(fs.readFileSync(일지곳, 'utf8')); } catch { 일지 = []; }
  let 합 = 0;
  for (let 회 = 1; 회 <= 60 && 남은몫 > 0; 회 += 1) {
    let r = null;
    try { r = await 첫쪽에서지운다(Math.min(20, 남은몫)); }
    catch (탈) { r = { 지운번호: [], 말: '🔴 ' + String(탈.message).slice(0, 90), 멈춤: true }; }
    console.log('■ ' + 회 + '회 — ' + r.말);
    for (const o of r.지운번호) 일지.push({ ...o, 잰때: new Date().toLocaleString('ko-KR') });
    fs.writeFileSync(일지곳, JSON.stringify(일지, null, 1), 'utf8');
    합 += r.지운번호.length; 남은몫 -= r.지운번호.length;
    if (r.끝 || r.멈춤) break;
    await 쉰다(3000);
  }
  console.log('');
  console.log('■ 이번에 지운 것 ' + 합 + '건 — 일지 ' + 일지곳);
}
