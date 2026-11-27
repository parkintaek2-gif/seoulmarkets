/**
 * 중부매일-기사검색.mjs — CMS 기사검색 화면으로 **기사를 찾아 번호를 모은다.**
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔴 [2026-11-25] 사장님이 기자명·분류를 바꾸라 하셨다. 바꾸려면 «어느 기사인지»부터
 *   글자로 있어야 한다. 이 자는 찾기만 한다.
 *
 * ⛔ 읽기만 한다. 아무것도 바꾸지 않는다.
 * ⛔ 주소를 지어내지 않는다 — 화면의 서식을 채우고 검색 단추를 누른다.
 *
 * 섹션 코드 (2026-11-25 에 화면에서 읽었다)
 *   S1N1 정치 · S1N2 경제 · S1N3 사회 · S1N4 문화 · S1N7 오피니언 · S1N9 포토
 *   S1N10 스포츠·연예 · S1N11 라이프 · S1N13 시민기자 · S1N15 임시
 *   S1N27 중부매일TV · S1N28 지역 · S1N29 기획·특집 · S1N30 사람들 · S1N31 보도자료
 *
 *   node scripts/중부매일-기사검색.mjs --자가시험
 *   node scripts/중부매일-기사검색.mjs --기자 박인택 --섹션 S1N10 --부터 2026-10-01 --까지 2026-11-25
 */
import fs from 'node:fs';
import { 새탭에서, 자리잡기, 재기 } from './lib/cdp.mjs';

export const 검색화면 = 'https://cms.jbnews.com/news/adminSearchForm.html';

/* 🔴 [2026-11-27] CMS 1차 섹션이 바뀌었다 — 「지역」(S1N28)과 「시민기자」(S1N13)가 목록에서 사라지고
   「충청」(S1N32)이 생겼다(승인기사 목록의 검색 양식에서 직접 읽음).
   사라진 코드로 검색하면 CMS 가 섹션 조건을 버리고 «전체»를 준다 — 200건씩 나와 결과가 부풀었다.
   사장님 2026-11-27 — 「지역 > 보도자료로 통합」 「시민기자 > 외부칼럼 중 시민기자칼럼으로 변경」
   시민기자칼럼은 오피니언 > 외부칼럼의 연재(SRN593)다. 보도자료(S1N31)에는 2차 섹션이 없다. */
export const 섹션코드 = {
  정치: 'S1N1', 경제: 'S1N2', 사회: 'S1N3', 문화: 'S1N4', 오피니언: 'S1N7',
  포토: 'S1N9', '스포츠·연예': 'S1N10', 라이프: 'S1N11',
  임시: 'S1N15', 중부매일TV: 'S1N27', '기획·특집': 'S1N29',
  사람들: 'S1N30', 보도자료: 'S1N31', 충청: 'S1N32',
};

/** 서식을 채우는 글 — ⛔ 빈 것은 넣지 않는다. 지어낸 값을 서식에 올리지 않는다 */
export function 서식채우기글({ 기자 = '', 섹션 = '', 부터 = '', 까지 = '', 낱말 = '' } = {}) {
  return [
    '(() => {',
    '  const 적은것 = [];',
    '  const 넣기 = (고르개, 값) => {',
    '    if (!값) return;',
    '    const e = document.querySelector(고르개);',
    '    if (!e) { 적은것.push("🔴 칸이 없다 " + 고르개); return; }',
    '    e.value = 값;',
    '    e.dispatchEvent(new Event("input", { bubbles: true }));',
    '    e.dispatchEvent(new Event("change", { bubbles: true }));',
    '    적은것.push(고르개 + "=" + e.value);',
    '  };',
    '  넣기("#sc_user_name", ' + JSON.stringify(기자) + ');',
    '  넣기("#sc_sdate", ' + JSON.stringify(부터) + ');',
    '  넣기("#sc_edate", ' + JSON.stringify(까지) + ');',
    /* 🔴 [2026-11-25] `#admin-article-search` 는 화면 «맨 위»의 검색창이다.
   *   거기에 넣으면 서식의 다른 조건이 다 무시되고 전체가 나온다(20,274건을 받았다).
   *   서식 안의 검색단어 칸은 `#sc_word` 다. */
  '  넣기("#sc_word", ' + JSON.stringify(낱말) + ');',
    '  const 섹 = ' + JSON.stringify(섹션) + ';',
    '  if (섹) {',
    '    const r = [...document.querySelectorAll("input[name=sc_section_code]")].find((e) => e.value === 섹);',
    '    if (!r) { 적은것.push("🔴 그 섹션 칸이 없다 " + 섹); }',
    '    else { r.click(); r.checked = true; r.dispatchEvent(new Event("change", { bubbles: true }));',
    '           적은것.push("섹션=" + 섹 + (r.checked ? " 켜짐" : " 🔴 안 켜짐")); }',
    '  }',
    '  return 적은것.join(" | ");',
    '})()',
  ].join('\n');
}

/**
 * 검색을 실행하는 단추를 누른다.
 * 🔴 [2026-11-25] 글자가 **「확인」**이다. 「검색」이 아니다.
 *   화면 맨 위의 「검색」은 다른 자리로 가는 메뉴였고, 그것을 눌러 0건이 나왔다.
 *   ⛔ 이름으로 짐작하지 않는다 — 화면을 찍어 보고 나서 고쳤다.
 * ⛔ 「확인」은 화면에 여럿 있다. **기자이름 칸이 든 서식 안**의 것만 고른다.
 */
export const 검색누르기글 = [
  '(() => {',
  '  const 기준 = document.querySelector("#sc_user_name");',
  '  const 서식 = 기준 ? (기준.closest("form") ||기준.closest("section,div.box,div")) : null;',
  '  if (!서식) return "검색 서식을 못 찾았다";',
  '  const b = [...서식.querySelectorAll("button,input[type=submit],a")]',
  '    .filter((e) => /확인/.test((e.innerText || e.value || "") + "") && (e.offsetWidth || e.offsetHeight));',
  '  if (!b.length) return "확인 단추가 없다";',
  '  b[b.length - 1].click();',
  '  return "눌렀다";',
  '})()',
].join('\n');

/**
 * 결과 줄을 읽는 글.
 * 🔴 [2026-11-25] 검색 결과는 `tr[data-article_idxno]` 가 **아니다.**
 *   승인관리 화면과 틀이 다르다 — 여기는 `ul.type2 > li` 다.
 *   ⛔ 「승인관리에서 되던 고르개」를 그대로 쓰면 0건으로 읽힌다. 틀마다 본다.
 */
export const 줄읽기글 = [
  '(() => {',
  '  const 줄들 = [...document.querySelectorAll("ul.type2 > li")]',
  '    .filter((li) => li.querySelector("a[href*=idxno]"));',
  '  const 건수글 = ((document.body.innerText || "").match(/전체\\s*[\\d,]+\\s*건/) || [""])[0];',
  '  return JSON.stringify({ 주소: location.href, 건수글: 건수글, 줄수: 줄들.length, 것: 줄들.map((li) => {',
  '    const a = li.querySelector("a[href*=idxno]");',
  '    const 곳 = a ? (a.getAttribute("href") || "") : "";',
  '    const m = 곳.match(/idxno=(\\d+)/);',
  '    const h = li.querySelector("h4,h3,.titles");',
  '    /* ⭐ 섹션·기자·날짜는 .byline 안에 «자식 하나씩» 들어 있다 — 본문에서 긁지 않는다 */',
  '    const by = li.querySelector(".byline");',
  '    const 쪼갠것 = by ? [...by.children].map((e) => (e.innerText || "").replace(/\\s+/g, " ").trim()).filter(Boolean) : [];',
  '    return { 번호: m ? m[1] : "",',
  '      제목: ((h && h.innerText) || "").replace(/\\s+/g, " ").trim().slice(0, 80),',
  '      섹션: 쪼갠것[0] || "",',
  '      기자: 쪼갠것[1] || "",',
  '      날짜: 쪼갠것[2] || "",',
  '      바이라인: by ? (by.innerText || "").replace(/\\s+/g, " ").trim().slice(0, 90) : "" };',
  '  }) });',
  '})()',
].join('\n');

const 쉰다 = (밀리) => new Promise((끝) => setTimeout(끝, 밀리));

/** 다음 쪽으로 간다 — 쪽 번호 링크를 누른다. ⛔ 주소를 지어내지 않는다 */
export function 쪽누르기글(쪽) {
  return [
    '(() => {',
    '  const 것 = [...document.querySelectorAll("a")]',
    '    .filter((e) => ((e.innerText || "") + "").trim() === ' + JSON.stringify(String(쪽)) + ');',
    '  if (!것.length) return "그 쪽이 없다";',
    '  것[것.length - 1].click();',
    '  return "눌렀다";',
    '})()',
  ].join('\n');
}

export async function 찾는다(조건, { 최대쪽 = 20 } = {}) {
  return 새탭에서(검색화면, async (붙음) => {
    붙음.듣기('Page.javascriptDialogOpening', () => {
      붙음.보내기('Page.handleJavaScriptDialog', { accept: true }).catch(() => {});
    });
    await 자리잡기(붙음, { 최대: 45000 });
    await 쉰다(3000);

    const 채움 = String(await 재기(붙음, 서식채우기글(조건), 25000));
    const 눌림 = String(await 재기(붙음, 검색누르기글, 25000));
    if (눌림 !== '눌렀다') return { 채움, 오류: '🔴 검색을 못 눌렀다 — ' + 눌림, 것: [] };
    await 쉰다(7000);
    await 자리잡기(붙음, { 최대: 40000 });

    const 모은것 = new Map();
    let 주소 = '';
    for (let 쪽 = 1; 쪽 <= 최대쪽; 쪽 += 1) {
      if (쪽 > 1) {
        const 간다 = String(await 재기(붙음, 쪽누르기글(쪽), 25000));
        if (간다 !== '눌렀다') break;
        await 쉰다(6000);
        await 자리잡기(붙음, { 최대: 40000 });
      }
      let r = null;
      try { r = JSON.parse(String(await 재기(붙음, 줄읽기글, 25000))); } catch { r = null; }
      if (!r) break;
      주소 = r.주소;
      let 새것 = 0;
      for (const o of r.것 || []) { if (o.번호 && !모은것.has(o.번호)) { 모은것.set(o.번호, o); 새것 += 1; } }
      if (!새것) break;
    }
    return { 채움, 주소, 것: [...모은것.values()] };
  });
}

/* ── 자가시험 ──────────────────────────────────────────────── */
function 직접실행인가() { return (process.argv[1] || '').includes('중부매일-기사검색'); }

if (직접실행인가() && process.argv.includes('--자가시험')) {
  const 잰다 = []; const 본다 = (이름, v) => 잰다.push([이름, !!v]);
  본다('검색 화면 주소가 맞다', 검색화면.includes('adminSearchForm'));
  본다('스포츠·연예는 S1N10', 섹션코드['스포츠·연예'] === 'S1N10');
  본다('🔴 사라진 섹션(지역·시민기자)은 표에 없다 — 있으면 검색이 전체를 준다', !('지역' in 섹션코드) && !('시민기자' in 섹션코드));
  본다('충청은 S1N32', 섹션코드.충청 === 'S1N32');
  본다('오피니언은 S1N7', 섹션코드.오피니언 === 'S1N7');
  본다('기자명 칸을 채운다', 서식채우기글({ 기자: '박인택' }).includes('sc_user_name'));
  본다('기간 칸을 채운다', 서식채우기글({ 부터: '2026-10-01', 까지: '2026-11-25' }).includes('sc_sdate')
    && 서식채우기글({ 부터: '2026-10-01', 까지: '2026-11-25' }).includes('sc_edate'));
  본다('⛔ 빈 값은 서식에 넣지 않는다', 서식채우기글({ 기자: '' }).includes('if (!값) return'));
  본다('섹션은 값으로 고른다 — 자리로 찾지 않는다',
    서식채우기글({ 섹션: 'S1N10' }).includes('e.value === 섹'));
  본다('⛔ 섹션 칸이 없으면 그렇다고 적는다 — 아무거나 고르지 않는다',
    서식채우기글({ 섹션: 'S1N10' }).includes('그 섹션 칸이 없다'));
  본다('🔴 검색 실행 단추는 「확인」이다 — 「검색」이 아니다',
    검색누르기글.includes('확인') && !검색누르기글.includes('=== "검색"'));
  본다('⛔ 기자이름 칸이 든 서식 안에서만 고른다 — 화면 맨 위 메뉴를 누르지 않는다',
    검색누르기글.includes('#sc_user_name') && 검색누르기글.includes('closest'));
  본다('⛔ 화면에 안 보이는 단추는 누르지 않는다', 검색누르기글.includes('offsetWidth'));
  본다('🔴 검색 결과는 ul.type2 > li 다 — 승인관리의 tr 이 아니다',
    줄읽기글.includes('ul.type2') && !줄읽기글.includes('data-article_idxno'));
  본다('기사번호는 링크의 idxno 에서 집는다', 줄읽기글.includes('idxno=(\\d+)'));
  본다('전체 건수를 함께 읽는다 — 몇 건인지 모르고 다 모았다고 하지 않는다',
    줄읽기글.includes('건수글'));
  본다('⛔ 줄읽기글은 아무것도 누르지 않는다', !/\.click\(|submit\(/.test(줄읽기글));
  본다('⛔ 쪽은 링크를 눌러 넘긴다 — 주소를 지어내지 않는다',
    쪽누르기글(2).includes('querySelectorAll("a")') && !쪽누르기글(2).includes('page='));
  본다('⛔ 저장·승인·삭제를 부르는 곳이 한 군데도 없다', (() => {
    const 모두 = [서식채우기글({ 기자: 'ㄱ' }), 검색누르기글, 줄읽기글, 쪽누르기글(2)].join('\n');
    return !/저장|recog-|삭제|delete/i.test(모두);
  })());
  const 진 = 잰다.filter(([, v]) => !v);
  for (const [이름, v] of 잰다) console.log((v ? '  ✅ ' : '  🔴 ') + 이름);
  console.log(진.length ? ('🔴 ' + 진.length + '가지 깨졌다') : ('✅ 자가시험 ' + 잰다.length + ' 통과'));
  process.exit(진.length ? 1 : 0);
}

if (직접실행인가() && !process.argv.includes('--자가시험')) {
  const 집다 = (이름) => { const i = process.argv.indexOf(이름); return i >= 0 ? (process.argv[i + 1] || '') : ''; };
  const 조건 = { 기자: 집다('--기자'), 섹션: 집다('--섹션'), 부터: 집다('--부터'), 까지: 집다('--까지'), 낱말: 집다('--낱말') };
  const 낼곳 = 집다('--낼곳');
  const r = await 찾는다(조건);
  console.log('■ 서식에 넣은 것 — ' + r.채움);
  if (r.오류) { console.log(r.오류); process.exit(1); }
  console.log('■ 결과 주소 — ' + String(r.주소).slice(0, 140));
  console.log('■ 찾은 기사 ' + r.것.length + '건');
  for (const o of r.것) console.log("   " + o.번호 + "  [" + o.섹션 + "] " + o.기자 + " " + o.날짜 + "  " + o.제목);
  if (낼곳) { fs.writeFileSync(낼곳, JSON.stringify(r.것, null, 1), 'utf8'); console.log('■ 적었다 — ' + 낼곳); }
}
