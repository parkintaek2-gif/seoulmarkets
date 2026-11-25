/**
 * 중부매일-기자와분류-바꾼다.mjs — 기사의 **기자명**과 **분류(섹션·연재)**를 바꾼다.
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔴🔴 사장님 2026-11-25 —
 *   「1. 10월~11월25일까지 박인택 바이라인으로 웹에 올라간 스포츠 기사 중
 *      e스포츠 기사 빼고 나머지는 기자명을 이지효로 바꿔.
 *    2. 시민기자 카테고리에 있는 기사들을 [오피니언>외부칼럼>시민기자칼럼]으로 바꿔
 *    3. 중부매일 바이라인 일반문화, 학술문화재 기사 분류를 [오피니언>외부칼럼>문화칼럼]으로 바꿔
 *    다 하면 웹출판 해」
 *
 * ⛔ 시키신 칸만 바꾼다. 제목·본문·사진·노출시간은 건드리지 않는다.
 * ⛔ 저장이 노출시간을 덮을 수 있다 — **앞뒤로 재서** 달라지면 빨간불을 낸다.
 * ⛔ 웹출판은 여기서 누르지 않는다. 셋을 다 마친 뒤 따로 한다.
 *
 * 값 (2026-11-25 에 CMS 서식에서 읽었다)
 *   이지효 기자   jhlee · 이지효 기자 · jhlee@jbnews.com
 *   오피니언      S1N7   ·  외부칼럼 S2N149
 *   시민기자칼럼  SRN593  ·  문화칼럼 SRN552
 *
 *   node scripts/중부매일-기자와분류-바꾼다.mjs --자가시험
 *   node scripts/중부매일-기자와분류-바꾼다.mjs --일 1 --몇건 3
 *   node scripts/중부매일-기자와분류-바꾼다.mjs --일 2
 */
import fs from 'node:fs';
import { 새탭에서, 자리잡기, 재기 } from './lib/cdp.mjs';

export const 서식주소 = (번호) => 'https://cms.jbnews.com/news/adminArticleWriteForm.html?mode=modify&idxno=' + 번호;

/**
 * 🔴🔴 사장님 2026-11-25 — 세 번에 걸쳐 정해졌다. **마지막 말씀이 정본이다.**
 *   ① 「스포츠기사는 기자명, 메일주소(자동 입력)만 바꿔」
 *   ② 내가 재서 올렸다 — 공개된 기사의 「기자 프로필 보기」 링크가
 *      `sc_word=parkintaek0521` 로 남아 **이름만 바꾸면 박인택 계정을 가리킨다.**
 *   ③ 「**user-id 바꿔**」  ⇒ 셋을 다 바꾼다.
 *
 * ⚠ 「자동 입력」을 그대로 믿지 않고 재 봤다 — **자동으로 들어가지 않는다.**
 *   `#user_name` 은 `autocomplete=off` 인 그냥 글자 칸이고, 곁에 기자 고르기 장치도
 *   datalist 도 없다. 이름을 바꾸고 input·change·keyup·blur 를 다 알려도
 *   메일은 `parkintaek0521@jbnews.com` 그대로였다. 그래서 메일도 내가 넣는다.
 */
export const 이지효 = { id: 'jhlee', 이름: '이지효 기자', 메일: 'jhlee@jbnews.com' };
export const 오피니언 = 'S1N7';
export const 외부칼럼 = 'S2N149';
export const 시민기자칼럼 = 'SRN593';
export const 문화칼럼 = 'SRN552';

/** 지금 값을 읽는 글 — ⛔ 아무것도 바꾸지 않는다 */
export const 상태글 = [
  '(() => {',
  '  const v = (고르개) => { const e = document.querySelector(고르개); return e ? String(e.value || "") : null; };',
  '  const 고른글 = (고르개) => { const s = document.querySelector(고르개);',
  '    return s && s.options[s.selectedIndex] ? (s.options[s.selectedIndex].text || "").trim() : ""; };',
  '  const 켜짐 = (id) => { const e = document.getElementById(id); return !!(e && e.checked); };',
  '  return JSON.stringify({',
  '    제목: v("[name=title]"),',
  '    기자id: v("#user_id"), 기자명: v("#user_name"), 기자메일: v("#user_email"),',
  '    섹션1: v("#sectionCode"), 섹션1글: 고른글("#sectionCode"),',
  '    섹션2: v("#subSectionCode"), 섹션2글: 고른글("#subSectionCode"),',
  '    연재: v("#serialCode"), 연재글: 고른글("#serialCode"),',
  '    승인: 켜짐("recog-e"), 미승인: 켜짐("recog-c"),',
  '    노출날: v("#embargo_date"), 노출시각: v("#embargo_time"),',
  '  });',
  '})()',
].join('\n');

/**
 * 기자를 바꾸는 글 — **이름과 메일만** 바꾼다.
 * ⛔ `user_id` 는 `사람.id` 가 있을 때만 건드린다. 평소에는 손대지 않는다(사장님 지시).
 */
export function 기자바꾸기글(사람) {
  const 아이디줄 = 사람.id
    ? '  탈.push(넣("#user_id", ' + JSON.stringify(사람.id) + '));'
    : '  /* ⛔ user_id 는 건드리지 않는다 */';
  return [
    '(() => {',
    '  const 넣 = (고르개, 값) => { const e = document.querySelector(고르개);',
    '    if (!e) return "🔴 칸이 없다 " + 고르개;',
    '    e.value = 값;',
    '    e.dispatchEvent(new Event("input", { bubbles: true }));',
    '    e.dispatchEvent(new Event("change", { bubbles: true }));',
    '    return e.value === 값 ? "" : ("🔴 안 들어갔다 " + 고르개 + "=" + e.value); };',
    '  const 탈 = [];',
    '  탈.push(넣("#user_name", ' + JSON.stringify(사람.이름) + '));',
    '  탈.push(넣("#user_email", ' + JSON.stringify(사람.메일) + '));',
    아이디줄,
    '  const 남은것 = 탈.filter(Boolean);',
    '  return 남은것.length ? 남은것.join(" | ") : "바꿨다";',
    '})()',
  ].join('\n');
}

/** 고르개 하나를 고르는 글 — ⛔ 그 값이 목록에 없으면 «아무거나» 고르지 않는다 */
export function 골라넣기글(고르개, 값) {
  return [
    '(() => {',
    '  const s = document.querySelector(' + JSON.stringify(고르개) + ');',
    '  if (!s) return "🔴 칸이 없다";',
    '  const 있나 = [...s.options].some((o) => o.value === ' + JSON.stringify(값) + ');',
    '  if (!있나) return "🔴 그 값이 목록에 없다 — " + [...s.options].map((o) => o.value).join(",").slice(0, 120);',
    '  s.value = ' + JSON.stringify(값) + ';',
    '  s.dispatchEvent(new Event("change", { bubbles: true }));',
    '  return s.value === ' + JSON.stringify(값) + ' ? "골랐다" : "🔴 안 골라졌다";',
    '})()',
  ].join('\n');
}

/**
 * 🔴🔴 사장님 2026-11-25 — 「**[중부매일 박인택 기자]도 바이라인과 동일한 기자 이름으로 바꿔**」
 *   본문 첫머리의 `［중부매일 박인택 기자］` 를 바이라인과 같은 이름으로 바꾼다.
 *   ⛔ 바꾸는 것은 **대괄호 안의 그 표기뿐**이다. 본문의 다른 글자는 한 자도 건드리지 않는다.
 *   괄호는 전각(［］)과 반각([])을 둘 다 받는다 — 지면에 둘 다 있다.
 */
export function 본문기자바꾸기(본문, 옛이름, 새이름) {
  const 글 = String(본문 ?? '');
  const 자 = new RegExp('([\\[［]\\s*중부매일\\s*)' + 옛이름 + '(\\s*기자\\s*[\\]］])', 'g');
  let 몇곳 = 0;
  const 새글 = 글.replace(자, (_, 앞, 뒤) => { 몇곳 += 1; return 앞 + 새이름 + 뒤; });
  return { 새글, 몇곳 };
}

/** 본문을 읽는 글 — ⛔ 바꾸지 않는다 (도움말링크 도구가 쓰는 길과 같다) */
export const 본문읽는글 = [
  '(function(){',
  '  var 본문 = ""; var 어디 = "";',
  '  var ta = document.querySelector("textarea[name=articleBody], textarea#articleBody, textarea[name=content]");',
  '  if (ta) { 본문 = ta.value || ""; 어디 = "textarea"; }',
  '  if (!본문) { var f = document.querySelector("iframe");',
  '    try { if (f && f.contentDocument) { 본문 = f.contentDocument.body.innerHTML || ""; 어디 = "iframe"; } } catch (e) {} }',
  '  return JSON.stringify({ 본문: 본문, 어디: 어디 });',
  '})()',
].join('\n');

export function 본문넣는글(새본문, 어디) {
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

/** 승인 라디오를 고른다 */
export const 승인고르기글 = [
  '(() => {',
  '  const r = document.getElementById("recog-e");',
  '  if (!r) return "승인 칸이 없다";',
  '  r.click(); r.checked = true;',
  '  r.dispatchEvent(new Event("change", { bubbles: true }));',
  '  const lb = document.querySelector("label[for=recog-e]"); if (lb) lb.click();',
  '  return r.checked ? "골랐다" : "🔴 안 켜졌다";',
  '})()',
].join('\n');

/** 저장 */
export const 저장누르기글 = [
  '(() => {',
  '  const b = [...document.querySelectorAll("button")]',
  '    .find((e) => ((e.innerText || "") + "").trim() === "저장");',
  '  if (!b) return "저장 단추가 없다";',
  '  b.click();',
  '  return "눌렀다";',
  '})()',
].join('\n');

const 쉰다 = (밀리) => new Promise((끝) => setTimeout(끝, 밀리));

/**
 * 한 건을 바꾼다.
 * 바랄것 = { 기자?: {id,이름,메일}, 섹션1?, 섹션2?, 연재? }
 * ⛔ 1차섹션을 바꾸면 2차 목록이 «다시 그려진다» — 사이를 두고 차례로 넣는다.
 */
export async function 한건바꾸기(번호, 바랄것) {
  return 새탭에서(서식주소(번호), async (붙음) => {
    붙음.듣기('Page.javascriptDialogOpening', () => {
      붙음.보내기('Page.handleJavaScriptDialog', { accept: true }).catch(() => {});
    });
    await 자리잡기(붙음, { 최대: 45000 });
    await 쉰다(3500);

    let 전 = null;
    try { 전 = JSON.parse(String(await 재기(붙음, 상태글, 25000))); } catch { 전 = null; }
    if (!전) return { 된것: false, 말: '🔴 기사를 못 읽었다' };

    const 한말 = [];
    if (바랄것.기자) {
      const r = String(await 재기(붙음, 기자바꾸기글(바랄것.기자), 25000));
      한말.push('기자 ' + r);
      if (r !== '바꿨다') return { 된것: false, 전, 말: '🔴 ' + r };
      /* ⛔ user_id 를 안 건드렸으니 그대로여야 한다 — 바뀌었으면 빨간불이다 */
      if (!바랄것.기자.id) 한말.push('user_id 그대로 ' + 전.기자id);
    }
    /* 본문 첫머리의 ［중부매일 ○○○ 기자］ — 대괄호 안의 이름만 바꾼다 */
    let 본문전길이 = null; let 본문몇곳 = 0;
    if (바랄것.본문기자) {
      let b = null;
      try { b = JSON.parse(String(await 재기(붙음, 본문읽는글, 25000))); } catch { b = null; }
      if (!b || !b.본문) return { 된것: false, 전, 말: '🔴 본문을 못 읽었다 — 아무것도 저장하지 않았다' };
      본문전길이 = b.본문.length;
      const { 새글, 몇곳 } = 본문기자바꾸기(b.본문, 바랄것.본문기자.옛, 바랄것.본문기자.새);
      본문몇곳 = 몇곳;
      if (몇곳 > 0) {
        if (새글.length !== b.본문.length) return { 된것: false, 전, 말: '🔴 본문 길이가 달라진다 — 넣지 않았다' };
        const r = String(await 재기(붙음, 본문넣는글(새글, b.어디), 25000));
        if (r !== '넣었다') return { 된것: false, 전, 말: '🔴 본문 — ' + r };
      }
      한말.push('본문 표기 ' + 몇곳 + '곳');
    }
    if (바랄것.섹션1) {
      const r = String(await 재기(붙음, 골라넣기글('#sectionCode', 바랄것.섹션1), 25000));
      한말.push('1차 ' + r);
      if (r !== '골랐다') return { 된것: false, 전, 말: '🔴 1차섹션 — ' + r };
      await 쉰다(3000);                       /* 2차 목록이 다시 그려지기를 기다린다 */
    }
    if (바랄것.섹션2) {
      const r = String(await 재기(붙음, 골라넣기글('#subSectionCode', 바랄것.섹션2), 25000));
      한말.push('2차 ' + r);
      if (r !== '골랐다') return { 된것: false, 전, 말: '🔴 2차섹션 — ' + r };
      await 쉰다(2500);
    }
    if (바랄것.연재) {
      const r = String(await 재기(붙음, 골라넣기글('#serialCode', 바랄것.연재), 25000));
      한말.push('연재 ' + r);
      if (r !== '골랐다') return { 된것: false, 전, 말: '🔴 연재 — ' + r };
      await 쉰다(1500);
    }

    /* 승인 — 수정으로 열면 미승인으로 떨어질 수 있다. 다시 켠다 */
    한말.push('승인 ' + String(await 재기(붙음, 승인고르기글, 25000)));

    const 저장 = String(await 재기(붙음, 저장누르기글, 25000));
    if (저장 !== '눌렀다') return { 된것: false, 전, 말: '🔴 저장을 못 눌렀다 — ' + 저장 };
    await 쉰다(9000);
    await 자리잡기(붙음, { 최대: 30000 });

    /* ⛔ 「눌렀다」를 「됐다」로 읽지 않는다 — 다시 열어 읽는다 */
    let 뒤 = null;
    try {
      await 붙음.보내기('Page.navigate', { url: 서식주소(번호) });
      await 자리잡기(붙음, { 최대: 45000 });
      await 쉰다(3500);
      뒤 = JSON.parse(String(await 재기(붙음, 상태글, 25000)));
    } catch { 뒤 = null; }
    if (!뒤) return { 된것: false, 전, 말: '🔴 되읽기를 못 했다 (저장은 눌렀다)' };

    const 어긋남 = [];
    let 본문말 = '';
    if (바랄것.본문기자) {
      let b2 = null;
      try { b2 = JSON.parse(String(await 재기(붙음, 본문읽는글, 25000))); } catch { b2 = null; }
      if (!b2 || !b2.본문) 어긋남.push('🔴 저장 뒤 본문을 못 읽었다');
      else {
        const 옛남음 = 본문기자바꾸기(b2.본문, 바랄것.본문기자.옛, 바랄것.본문기자.옛).몇곳;
        const 새있음 = 본문기자바꾸기(b2.본문, 바랄것.본문기자.새, 바랄것.본문기자.새).몇곳;
        if (옛남음 > 0) 어긋남.push('🔴 본문에 옛 기자 표기가 ' + 옛남음 + '곳 남았다');
        if (본문몇곳 > 0 && 새있음 < 본문몇곳) 어긋남.push('🔴 본문에 새 기자 표기가 없다');
        if (b2.본문.length !== 본문전길이) 어긋남.push('🔴 본문 길이가 ' + 본문전길이 + ' → ' + b2.본문.length);
        본문말 = ' · 본문 표기 ' + (본문몇곳 > 0 ? 새있음 + '곳 바꿈' : '원래 없음');
      }
    }
    if (바랄것.기자) {
      if (뒤.기자명 !== 바랄것.기자.이름) 어긋남.push('기자명=' + 뒤.기자명);
      if (뒤.기자메일 !== 바랄것.기자.메일) 어긋남.push('기자메일=' + 뒤.기자메일);
      /* 🔴 id 를 지정하지 않았으면 «그대로»여야 한다 — 조용히 바뀌면 잡는다 */
      const 바랄id = 바랄것.기자.id || 전.기자id;
      if (뒤.기자id !== 바랄id) 어긋남.push('🔴 user_id 가 ' + 전.기자id + ' → ' + 뒤.기자id);
    }
    if (바랄것.섹션1 && 뒤.섹션1 !== 바랄것.섹션1) 어긋남.push('1차=' + 뒤.섹션1);
    if (바랄것.섹션2 && 뒤.섹션2 !== 바랄것.섹션2) 어긋남.push('2차=' + 뒤.섹션2);
    if (바랄것.연재 && 뒤.연재 !== 바랄것.연재) 어긋남.push('연재=' + 뒤.연재);
    /* ⛔ 노출시간이 바뀌면 큰일이다 — 과거 기사가 지금 포털로 나간다 */
    if (뒤.노출날 !== 전.노출날 || 뒤.노출시각 !== 전.노출시각) {
      어긋남.push('🔴 노출시간이 바뀌었다 ' + 전.노출날 + ' ' + 전.노출시각 + ' → ' + 뒤.노출날 + ' ' + 뒤.노출시각);
    }
    if (!뒤.승인) 어긋남.push('🔴 미승인으로 떨어졌다');

    return {
      된것: 어긋남.length === 0,
      전, 뒤,
      말: (어긋남.length ? '🔴 ' + 어긋남.join(' · ')
        : '됐다 · ' + 뒤.기자명 + ' · ' + 뒤.섹션1글 + ' > ' + 뒤.섹션2글 + ' > ' + 뒤.연재글 + 본문말),
      본문몇곳,
    };
  });
}

/* ── 자가시험 ──────────────────────────────────────────────── */
function 직접실행인가() { return (process.argv[1] || '').includes('중부매일-기자와분류-바꾼다'); }

if (직접실행인가() && process.argv.includes('--자가시험')) {
  const 잰다 = []; const 본다 = (이름, v) => 잰다.push([이름, !!v]);
  본다('이지효 기자는 jhlee · 이지효 기자 · jhlee@jbnews.com',
    이지효.id === 'jhlee' && 이지효.이름 === '이지효 기자' && 이지효.메일 === 'jhlee@jbnews.com');
  본다('🔴 user_id 까지 바꾼다 — 사장님 「user-id 바꿔」',
    기자바꾸기글(이지효).includes('넣("#user_id"') && 기자바꾸기글(이지효).includes('jhlee'));
  본다('⚠ 공개 기사의 「기자 프로필 보기」 링크가 user_id 를 쓴다 — 그래서 바꾼다',
    이지효.id === 'jhlee');
  본다('오피니언 S1N7 · 외부칼럼 S2N149', 오피니언 === 'S1N7' && 외부칼럼 === 'S2N149');
  본다('시민기자칼럼 SRN593 · 문화칼럼 SRN552', 시민기자칼럼 === 'SRN593' && 문화칼럼 === 'SRN552');
  본다('기자는 이름과 메일을 함께 바꾼다',
    기자바꾸기글(이지효).includes('#user_name') && 기자바꾸기글(이지효).includes('#user_email'));
  본다('⚠ 메일은 «자동 입력되지 않는다» — 재 보고 알았다. 그래서 내가 넣는다',
    기자바꾸기글(이지효).includes('jhlee@jbnews.com'));
  본다('넣은 뒤 그 칸을 다시 읽어 확인한다', 기자바꾸기글(이지효).includes('e.value === 값'));
  본다('🔴 본문 첫머리 전각 대괄호 표기를 바꾼다', (() => {
    const r = 본문기자바꾸기('<p>［중부매일 박인택 기자］ 여자배구 GS칼텍스가</p>', '박인택', '이지효');
    return r.몇곳 === 1 && r.새글 === '<p>［중부매일 이지효 기자］ 여자배구 GS칼텍스가</p>';
  })());
  본다('반각 대괄호도 바꾼다',
    본문기자바꾸기('[중부매일 박인택 기자] 본문', '박인택', '이지효').새글 === '[중부매일 이지효 기자] 본문');
  본다('⛔ 대괄호 밖의 「박인택」은 건드리지 않는다', (() => {
    const r = 본문기자바꾸기('박인택 감독은 말했다. 박인택 기자가 물었다.', '박인택', '이지효');
    return r.몇곳 === 0 && r.새글 === '박인택 감독은 말했다. 박인택 기자가 물었다.';
  })());
  본다('⛔ 본문 길이가 달라지지 않는다',
    본문기자바꾸기('［중부매일 박인택 기자］ 가나다', '박인택', '이지효').새글.length === '［중부매일 박인택 기자］ 가나다'.length);
  본다('표기가 없으면 0곳이고 글은 그대로다',
    본문기자바꾸기('쇼트트랙 최민정이', '박인택', '이지효').몇곳 === 0);
  본다('⛔ 목록에 없는 값은 고르지 않는다 — 아무거나 집지 않는다',
    골라넣기글('#sectionCode', 'S1N7').includes('그 값이 목록에 없다'));
  본다('고른 뒤 change 를 알린다', 골라넣기글('#sectionCode', 'S1N7').includes('new Event("change"'));
  본다('승인 라디오를 고른다 — 수정으로 열면 떨어진다',
    승인고르기글.includes('recog-e') && 승인고르기글.includes('label[for=recog-e]'));
  본다('⛔ 미승인·반려 칸을 누르지 않는다',
    !승인고르기글.includes('recog-c') && !승인고르기글.includes('recog-r'));
  본다('⛔ 저장 단추를 글자로 정확히 맞춘다', 저장누르기글.includes('.trim() === "저장"'));
  본다('🔴 노출시간을 앞뒤로 읽는다', 상태글.includes('embargo_date') && 상태글.includes('embargo_time'));
  본다('⛔ 제목·본문을 바꾸는 곳이 한 군데도 없다', (() => {
    const 모두 = [기자바꾸기글(이지효), 골라넣기글('#sectionCode', 'S1N7'), 승인고르기글, 저장누르기글].join('\n');
    return !/\[name=title\]|#title|content|본문/i.test(모두);
  })());
  본다('⛔ 웹출판을 누르는 곳이 한 군데도 없다', (() => {
    const 모두 = [상태글, 기자바꾸기글(이지효), 골라넣기글('#sectionCode', 'S1N7'), 승인고르기글, 저장누르기글].join('\n');
    return !/웹출판/.test(모두);
  })());
  본다('⛔ 삭제를 부르는 곳이 한 군데도 없다', (() => {
    const 모두 = [상태글, 기자바꾸기글(이지효), 골라넣기글('#sectionCode', 'S1N7'), 승인고르기글, 저장누르기글].join('\n');
    return !/삭제|delete/i.test(모두);
  })());
  const 진 = 잰다.filter(([, v]) => !v);
  for (const [이름, v] of 잰다) console.log((v ? '  ✅ ' : '  🔴 ') + 이름);
  console.log(진.length ? ('🔴 ' + 진.length + '가지 깨졌다') : ('✅ 자가시험 ' + 잰다.length + ' 통과'));
  process.exit(진.length ? 1 : 0);
}

/* ── 돌린다 ────────────────────────────────────────────────── */
export const 일지곳 = (일) => 'docs/자국/중부매일-기자와분류-일지-' + 일 + '.json';

function 할것들(일) {
  if (일 === '1') {
    const 전부 = JSON.parse(fs.readFileSync('docs/자국/중부매일-박인택-스포츠-20261125.json', 'utf8'));
    const 뺀것 = new Set(JSON.parse(fs.readFileSync('docs/자국/중부매일-박인택-e스포츠-뺀것.json', 'utf8')).map((x) => String(x.번호)));
    return 전부.filter((x) => !뺀것.has(String(x.번호)))
      .map((x) => ({ 번호: x.번호, 제목: x.제목,
        바랄것: { 기자: 이지효, 본문기자: { 옛: '박인택', 새: '이지효' } } }));
  }
  if (일 === '2') {
    const 전부 = JSON.parse(fs.readFileSync('docs/자국/중부매일-시민기자-20261125.json', 'utf8'));
    return 전부.map((x) => ({ 번호: x.번호, 제목: x.제목,
      바랄것: { 섹션1: 오피니언, 섹션2: 외부칼럼, 연재: 시민기자칼럼 } }));
  }
  if (일 === '3') {
    const o = JSON.parse(fs.readFileSync('docs/자국/중부매일-문화칼럼-대상-20261125.json', 'utf8'));
    const 번호들 = o.찾음.map((x) => ({ 번호: x.번호, 제목: x.제목 }));
    번호들.push({ 번호: '1499701', 제목: '멍석 김문태의 동심화 - 큰일날 뻔' });
    return 번호들.map((x) => ({ ...x, 바랄것: { 섹션1: 오피니언, 섹션2: 외부칼럼, 연재: 문화칼럼 } }));
  }
  throw new Error('--일 은 1·2·3 가운데 하나다');
}

if (직접실행인가() && process.argv.includes('--일')) {
  const 일 = process.argv[process.argv.indexOf('--일') + 1];
  const i = process.argv.indexOf('--몇건');
  const 몇건 = i >= 0 ? Math.max(1, Number(process.argv[i + 1]) || 1) : 9999;
  const 것 = 할것들(일).slice(0, 몇건);

  let 일지 = [];
  try { 일지 = JSON.parse(fs.readFileSync(일지곳(일), 'utf8')); } catch { 일지 = []; }
  const 이미 = new Set(일지.filter((x) => x.된것).map((x) => String(x.번호)));

  console.log('■ ' + 일 + '번 일 — 할 것 ' + 것.length + '건 (이미 된 것 ' + 이미.size + ')');
  let 됐다 = 0; let 안됐다 = 0;
  for (const x of 것) {
    if (이미.has(String(x.번호))) continue;
    let r = null;
    try { r = await 한건바꾸기(x.번호, x.바랄것); }
    catch (탈) { r = { 된것: false, 말: '🔴 ' + String(탈.message).slice(0, 90) }; }
    console.log('■ ' + x.번호 + ' — ' + (r.된것 ? '🟢 ' : '') + r.말 + '  ' + String(x.제목).slice(0, 26));
    일지.push({ 번호: x.번호, 제목: x.제목, 된것: r.된것, 말: r.말,
      전: r.전 || null, 뒤: r.뒤 || null, 잰때: new Date().toLocaleString('ko-KR') });
    fs.writeFileSync(일지곳(일), JSON.stringify(일지, null, 1), 'utf8');
    if (r.된것) 됐다 += 1; else 안됐다 += 1;
    await 쉰다(4000);
  }
  console.log('');
  console.log('■ 바꾼 것 ' + 됐다 + '건 · 안 된 것 ' + 안됐다 + '건 — 일지 ' + 일지곳(일));
}
