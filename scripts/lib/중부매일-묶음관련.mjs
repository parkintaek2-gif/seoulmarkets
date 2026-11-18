/**
 * 중부매일-묶음관련.mjs — 운세 기사에 **묶음기사·관련기사**를 넣는다. 두 등록기가 함께 쓴다.
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔴🔴 사장님 2026-11-19 — 「**최신 기사 순으로 묶음기사 2건, 관련기사 2건도 꼭 올려**」
 * 🔴🔴 사장님 2026-11-18 — 「**출고된 기사만 <묶음기사·관련기사>에 넣을 수 있어**」
 *   · 별자리 기사 — 묶음기사는 **별자리**, 관련기사는 **띠별**
 *   · 띠별 기사   — 묶음기사는 **띠별**,   관련기사는 **별자리**
 *   즉 묶음은 «같은 종류», 관련은 «다른 종류». 건수는 둘 다 2건이다.
 *
 * ── CMS 가 실제로 어떻게 도는가 (2026-11-19 에 화면을 읽어서 알아낸 것) ──────
 *   ① 서식의 「묶음기사추가」 단추
 *        window.open('/news/adminFindArticleBundled.html?ridxno=<기사번호>&cartnum='+fn_guid(), …)
 *      관련기사는 adminFindArticleRelation.html — 두 창은 글자만 다르고 구조가 같다.
 *   ② 결과는 표가 아니라 `<li>` 목록이다. 한 줄에
 *        input#chkbox-<기사번호>  ·  h4.subject > a (제목)  ·  .info-group em (면·기자·날짜)
 *   ③ 체크를 «누르면» 그때마다 ajax 로 장바구니에 담긴다
 *        POST /news/adminArticle{Bundled|Relation}Add.ajax.php  { mode:"CI", cartnum, selIdxno, selChecked }
 *   ④ 장바구니가 차면 `.{bundled|relation}-choice-list` 안에 **저장 단추**가 그려진다
 *        .save_bundled_btn / .save_relation_btn → 폼을 통째로 보내고 opener 를 다시 그린 뒤 창이 스스로 닫힌다
 *   ⛔ 그래서 **체크만 하고 저장 단추를 안 누르면 아무것도 안 들어간다.** 장바구니에만 남는다.
 *   ⛔ 주소를 지어내 ajax 를 직접 부르지 않는다 — 화면의 단추를 누른다(사장님이 거듭 이르신 것).
 *
 * ── ⛔ 지키는 것 ─────────────────────────────────────────────
 *   · **기사를 저장하기 «전»에** 넣는다. 저장한 뒤에 넣으면 그것이 「수정」이 된다
 *     (사장님 — 「자꾸 수정하고 삭제하면 네이버한테 경고 받아」)
 *   · 고를 것이 없으면 **그냥 지나간다.** 없다고 등록을 세우지 않는다
 *   · 띄운 창은 그 자리에서 닫는다
 *
 *   node scripts/lib/중부매일-묶음관련.mjs --자체검사
 */
import { 탭들, 탭붙기, 자리잡기, 재기, 기본뿌리 } from './cdp.mjs';

/** 갈래마다 다른 이름을 한곳에 모아 둔다 — 두 창은 글자만 다르다 */
export const 갈래표 = {
  묶음: {
    단추글: '묶음기사추가',
    창무늬: 'adminFindArticleBundled',
    목록칸: '.bundled-choice-list',
    저장단추: '.save_bundled_btn',
    서식칸: '#bundled-ul',
  },
  관련: {
    단추글: '관련기사추가',
    창무늬: 'adminFindArticleRelation',
    목록칸: '.relation-choice-list',
    저장단추: '.save_relation_btn',
    서식칸: '#relation-ul',
  },
};

/** 운세 기사 제목에서 종류를 가른다. 운세 기사가 아니면 null */
export function 운세종류(제목) {
  const 글 = String(제목 || '');
  if (!글.includes('[오늘의 운세]')) return null;
  if (글.includes('띠별 운세')) return '띠별';
  if (글.includes('별자리 운세')) return '별자리';
  return null;
}

/** 띠별 기사가 고를 것 ↔ 별자리 기사가 고를 것 */
export function 고를종류(내종류, 갈래) {
  if (내종류 !== '띠별' && 내종류 !== '별자리') return null;
  const 반대 = (내종류 === '띠별') ? '별자리' : '띠별';
  if (갈래 === '묶음') return 내종류;   /* 묶음은 같은 종류 */
  if (갈래 === '관련') return 반대;     /* 관련은 다른 종류 */
  return null;
}

/**
 * 🔴 **최신 기사 순으로** 고른다 (사장님 2026-11-19).
 *   날짜 내림차순 → 같은 날이면 기사번호 내림차순.
 * ⛔ 기사번호만으로 줄 세우지 않는다 — 예약 기사는 번호를 «먼저» 받고 나중에 나간다.
 *   11월 20~26일 예약분(1516329~1516343)이 11월 19일 기사보다 번호가 크다.
 * @param {Array<{번호:string,제목:string,날:string}>} 목록  창에서 읽은 줄들
 * @param {string} 원하는종류  '띠별' | '별자리'
 * @param {string} 뺄번호      지금 쓰고 있는 기사 자신
 * @param {number} 몇건
 */
export function 최신으로고른다(목록, 원하는종류, 뺄번호, 몇건 = 2) {
  if (!Array.isArray(목록)) return [];
  const 뺄것 = String(뺄번호 || '');
  const 날꼴 = (글) => String(글 || '').length === 10 && String(글).split('-').length === 3;
  return 목록
    .filter((줄) => 줄 && String(줄.번호) !== 뺄것)
    .filter((줄) => 운세종류(줄.제목) === 원하는종류)
    .slice()
    .sort((가, 나) => {
      const 가날 = 날꼴(가.날) ? 가.날 : '';
      const 나날 = 날꼴(나.날) ? 나.날 : '';
      if (가날 !== 나날) return 나날 < 가날 ? -1 : 1;
      return Number(나.번호) - Number(가.번호);
    })
    .slice(0, 몇건);
}

/* ── 창 안에서 돌릴 글 ──────────────────────────────────────── */

/**
 * 🔴🔴 [2026-11-19] **검색은 쓰지 않는다 — 서버에 안 닿았다.**
 *   `sc_word` 에 「오늘의 운세」를 넣고 「검색하기」를 눌러도, 폼을 그대로 submit 해도
 *   결과가 한 줄도 안 바뀌었다. 쪽 링크의 주소를 읽어 보니 `sc_word=` 가 **비어 있었다** —
 *   화면이 보낸 적이 없다는 뜻이다. 「눌렀다」를 「찾았다」로 읽었으면 그냥 넘어갔을 자리다.
 * ⭐ 대신 **쪽을 넘기며 훑는다.** 목록은 이미 최신순(`sc_order_by=E`)이라
 *   위에서부터 만나는 순서가 곧 「최신 기사 순」이다(사장님 2026-11-19).
 *   쪽 링크는 평범한 주소라 누르면 그대로 넘어간다.
 */
export const 다음쪽글 = [
  '((쪽) => {',
  '  const a = [...document.querySelectorAll("a")]',
  '    .find((e) => (e.innerText || "").trim() === String(쪽));',
  '  if (!a) return "그 쪽이 없다";',
  '  a.click();',
  '  return "눌렀다";',
  '})',
].join('\n');

/** 「다음 쪽으로」 — 쪽 번호를 넣어 돌릴 글을 만든다 */
export function 쪽넘기기글(쪽) {
  return 다음쪽글 + '(' + Number(쪽) + ')';
}

/** 결과 줄을 읽는다 — 번호·제목·날짜 */
export const 줄읽기글 = [
  '(() => {',
  '  const 날인가 = (글) => {',
  '    const s = (글 || "").trim();',
  '    if (s.length !== 10) return false;',
  '    const 쪽 = s.split("-");',
  '    return 쪽.length === 3 && 쪽[0].length === 4 && !Number.isNaN(Number(쪽.join("")));',
  '  };',
  '  const 줄 = [...document.querySelectorAll("input[type=checkbox]")]',
  '    .filter((c) => c.id && c.id.indexOf("chkbox-") === 0)',
  '    .map((c) => {',
  '      const 칸 = c.closest("li") || c.parentElement;',
  '      const 이름 = 칸 ? 칸.querySelector("h4.subject a, a.list-links") : null;',
  '      const 토막 = 칸 ? [...칸.querySelectorAll(".info-group em")]',
  '        .map((e) => (e.innerText || "").trim()) : [];',
  '      return {',
  '        번호: String(c.value || "").trim(),',
  '        제목: 이름 ? (이름.innerText || "").trim() : "",',
  '        날: 토막.find(날인가) || null,',
  '      };',
  '    });',
  '  return JSON.stringify(줄);',
  '})()',
].join('\n');

/** 고른 번호들의 체크를 «실제로» 누른다 — 누르는 순간 장바구니에 담긴다 */
export function 체크누르기글(번호들) {
  return [
    '(() => {',
    '  const 고를것 = ' + JSON.stringify((번호들 || []).map(String)) + ';',
    '  let 센것 = 0;',
    '  const 못찾음 = [];',
    '  for (const 번호 of 고를것) {',
    '    const c = document.getElementById("chkbox-" + 번호);',
    '    if (!c) { 못찾음.push(번호); continue; }',
    '    if (!c.checked) { c.click(); 센것 += 1; }',
    '  }',
    '  return JSON.stringify({ 센것, 못찾음 });',
    '})()',
  ].join('\n');
}

/** 장바구니에 그려진 저장 단추를 누른다 */
export function 저장누르기글(저장단추) {
  return [
    '(() => {',
    '  const b = document.querySelector(' + JSON.stringify(저장단추) + ');',
    '  if (!b) return "저장 단추가 아직 없다";',
    '  b.click();',
    '  return "눌렀다";',
    '})()',
  ].join('\n');
}

/**
 * 🔴 서식에 **정말 들어갔나**를 센다 — 「눌렀다」를 「들어갔다」로 읽지 않는다.
 * 창이 닫히며 opener 의 bundled_reload()/relation_reload() 가 그 칸만 ajax 로 다시 그린다
 * (`articleBundledEntity.ajax.php` → `#bundled-ul`). 서식 전체는 새로 고쳐지지 않는다 —
 * ⭐ 그래서 본문·사진·키워드가 날아가지 않는다. 2026-11-19 에 함수를 읽어 확인했다.
 */
export function 서식에센다글(서식칸) {
  return [
    '(() => {',
    '  const 칸 = document.querySelector(' + JSON.stringify(서식칸) + ');',
    '  if (!칸) return -1;',
    '  return 칸.querySelectorAll("li").length;',
    '})()',
  ].join('\n');
}

/** 서식에서 추가 단추를 누른다 — window.open 이라 사람 몸짓이 있어야 열린다 */
export function 단추누르기글(단추글) {
  return [
    '(() => {',
    '  const b = [...document.querySelectorAll("button")]',
    '    .find((e) => ((e.innerText || "") + "").trim() === ' + JSON.stringify(단추글) + ');',
    '  if (!b) return "단추가 없다";',
    '  b.click();',
    '  return "눌렀다";',
    '})()',
  ].join('\n');
}

/* ── 실제로 넣는 걸음 ───────────────────────────────────────── */

const 쉰다 = (밀리) => new Promise((끝) => setTimeout(끝, 밀리));

/** 사람 몸짓으로 친다 — window.open 은 그래야 열린다 */
async function 몸짓으로(붙음, 글, 제한 = 30000) {
  const 답 = await 붙음.보내기('Runtime.evaluate', {
    expression: 글, returnByValue: true, awaitPromise: true, userGesture: true,
  }, 제한);
  if (답.exceptionDetails) throw new Error(답.exceptionDetails.text || '화면에서 오류가 났다');
  return 답.result?.value;
}

/**
 * 한 갈래를 넣는다.
 * @param {object} 붙음      기사 서식이 열린 탭
 * @param {object} 설정      { 갈래, 내종류, 기사번호, 몇건, 뿌리 }
 * @returns {Promise<string>} 사람이 읽을 한 줄
 */
export async function 한갈래넣기(붙음, 설정) {
  const { 갈래, 내종류, 기사번호 } = 설정 || {};
  const 몇건 = 설정?.몇건 ?? 2;
  const 최대쪽 = 설정?.최대쪽 ?? 5;   /* 한 쪽 20건 · 하루 20건쯤 나간다 — 닷새치면 넉넉하다 */
  const 뿌리 = 설정?.뿌리 || 기본뿌리;
  const 못찾음 = [];
  const 표 = 갈래표[갈래];
  if (!표) return '갈래를 모른다 — ' + 갈래;
  const 원하는종류 = 고를종류(내종류, 갈래);
  if (!원하는종류) return '내 기사 종류를 모른다 — ' + 내종류;

  /* 넣기 «전»에 세어 둔다 — 늘어난 수로 판정한다 */
  let 전에몇 = 0;
  try { 전에몇 = Number(await 재기(붙음, 서식에센다글(표.서식칸), 15000)) || 0; } catch { 전에몇 = 0; }

  const 전 = (await 탭들(뿌리)).map((t) => t.id);
  const 눌렀나 = String(await 몸짓으로(붙음, 단추누르기글(표.단추글)));
  if (눌렀나 !== '눌렀다') return 표.단추글 + ' — ' + 눌렀나;

  await 쉰다(4000);
  const 창 = (await 탭들(뿌리)).find((t) => !전.includes(t.id) && t.url.includes(표.창무늬));
  if (!창) return '창이 안 떴다';

  const 팝 = await 탭붙기(창.webSocketDebuggerUrl);
  let 말 = '';
  try {
    await 팝.보내기('Page.enable');
    await 팝.보내기('Runtime.enable');
    팝.듣기('Page.javascriptDialogOpening', () => {
      팝.보내기('Page.handleJavaScriptDialog', { accept: true }).catch(() => {});
    });
    await 자리잡기(팝, { 최대: 30000 });
    await 쉰다(1500);

    /* ①~③ 쪽을 넘기며 원하는 종류를 만나는 대로 담는다.
       목록이 최신순이라 «만나는 차례»가 곧 최신 차례다. */
    const 고른것 = [];
    let 읽은줄 = 0;
    for (let 쪽 = 1; 쪽 <= 최대쪽 && 고른것.length < 몇건; 쪽 += 1) {
      let 줄 = [];
      try { 줄 = JSON.parse(String(await 재기(팝, 줄읽기글, 25000))); } catch { 줄 = []; }
      읽은줄 += 줄.length;
      if (!줄.length) break;

      const 이미 = new Set(고른것.map((g) => g.번호));
      const 이쪽것 = 최신으로고른다(
        줄.filter((r) => !이미.has(r.번호)), 원하는종류, 기사번호, 몇건 - 고른것.length,
      );
      if (이쪽것.length) {
        let 담김 = { 센것: 0, 못찾음: [] };
        try { 담김 = JSON.parse(String(await 재기(팝, 체크누르기글(이쪽것.map((g) => g.번호)), 25000))); }
        catch { /* 저장이 없으면 아래에서 드러난다 */ }
        못찾음.push(...(담김.못찾음 || []));
        고른것.push(...이쪽것);
        await 쉰다(3000);
      }
      if (고른것.length >= 몇건) break;

      const 넘김 = String(await 재기(팝, 쪽넘기기글(쪽 + 1), 20000));
      if (넘김 !== '눌렀다') break;
      await 자리잡기(팝, { 최대: 25000 });
      await 쉰다(1500);
    }

    if (!고른것.length) {
      말 = '고를 것이 없다 — ' + 원하는종류 + ' (읽은 줄 ' + 읽은줄 + ')';
      return 말;
    }

    /* ④ 🔴 저장 단추를 누르지 않으면 «아무것도 들어가지 않는다» */
    let 저장 = String(await 재기(팝, 저장누르기글(표.저장단추), 20000));
    if (저장 !== '눌렀다') { await 쉰다(3000); 저장 = String(await 재기(팝, 저장누르기글(표.저장단추), 20000)); }
    await 쉰다(3000);

    /* 🔴 서식에 정말 늘었나를 «서식에서» 센다 */
    let 뒤에몇 = 전에몇;
    try { 뒤에몇 = Number(await 재기(붙음, 서식에센다글(표.서식칸), 15000)) || 0; } catch { /* 아래에 드러난다 */ }

    말 = (뒤에몇 > 전에몇 ? '넣었다' : '🔴 서식에 안 늘었다')
      + ' ' + 고른것.length + '건 (' + 전에몇 + '→' + 뒤에몇 + ') — '
      + 고른것.map((g) => g.번호 + '(' + (g.날 || '날 없음') + ')').join(', ')
      + (저장 === '눌렀다' ? '' : ' · 저장 ' + 저장)
      + (못찾음.length ? ' · 못 찾은 칸 ' + 못찾음.join(',') : '');
    return 말;
  } finally {
    팝.닫기();
    try { await fetch(뿌리 + '/json/close/' + 창.id); } catch { /* 스스로 닫혔으면 그만이다 */ }
  }
}

/**
 * 묶음기사와 관련기사를 **둘 다** 넣는다.
 * ⛔ 하나가 안 돼도 나머지는 넣는다 — 한쪽 때문에 둘 다 비우지 않는다.
 */
export async function 묶음관련넣기(붙음, 설정) {
  const 말 = [];
  for (const 갈래 of ['묶음', '관련']) {
    try { 말.push(갈래 + ' ' + (await 한갈래넣기(붙음, { ...설정, 갈래 }))); }
    catch (탈) { 말.push(갈래 + ' 🔴 ' + String(탈.message).slice(0, 70)); }
  }
  return 말.join(' · ');
}

/* ── 자체검사 ──────────────────────────────────────────────── */
function 직접실행인가() {
  const 길 = process.argv[1] || '';
  return 길.includes('중부매일-묶음관련');
}

if (직접실행인가() && process.argv.includes('--자체검사')) {
  const 잰다 = [];
  const 본다 = (이름, v) => 잰다.push([이름, !!v]);

  본다('갈래는 둘이다', Object.keys(갈래표).length === 2);
  본다('두 창은 글자만 다르다',
    갈래표.묶음.창무늬.replace('Bundled', 'X') === 갈래표.관련.창무늬.replace('Relation', 'X'));

  본다('띠별 기사를 가린다', 운세종류('[오늘의 운세] 11월 19일 목요일 띠별 운세') === '띠별');
  본다('별자리 기사를 가린다', 운세종류('[오늘의 운세] 11월 19일 목요일 별자리 운세') === '별자리');
  본다('⛔ 운세가 아닌 기사는 null', 운세종류('충북도 500억 방산클러스터 유치') === null);
  본다('⛔ 빈 제목도 견딘다', 운세종류('') === null && 운세종류(null) === null);

  본다('🔴 묶음은 같은 종류다', 고를종류('띠별', '묶음') === '띠별'
    && 고를종류('별자리', '묶음') === '별자리');
  본다('🔴 관련은 다른 종류다', 고를종류('띠별', '관련') === '별자리'
    && 고를종류('별자리', '관련') === '띠별');
  본다('⛔ 모르는 갈래는 null', 고를종류('띠별', '아무거나') === null);

  const 보기 = [
    { 번호: '1516325', 제목: '[오늘의 운세] 11월 19일 목요일 띠별 운세', 날: '2026-11-19' },
    { 번호: '1516326', 제목: '[오늘의 운세] 11월 19일 목요일 별자리 운세', 날: '2026-11-19' },
    { 번호: '1516329', 제목: '[오늘의 운세] 11월 20일 금요일 띠별 운세', 날: '2026-11-20' },
    { 번호: '1516331', 제목: '[오늘의 운세] 11월 20일 금요일 별자리 운세', 날: '2026-11-20' },
    { 번호: '1516310', 제목: '[오늘의 운세] 11월 18일 수요일 띠별 운세', 날: '2026-11-18' },
    { 번호: '1516348', 제목: '[2027 수능 이모저모] 신흥고 파이팅', 날: '2026-11-19' },
  ];

  {
    const 고름 = 최신으로고른다(보기, '띠별', '1516999', 2);
    본다('🔴 최신 날짜부터 고른다', 고름.map((g) => g.번호).join(',') === '1516329,1516325');
    본다('⛔ 운세가 아닌 기사는 안 고른다', !고름.some((g) => g.번호 === '1516348'));
    본다('⛔ 다른 종류는 안 고른다', 고름.every((g) => 운세종류(g.제목) === '띠별'));
  }
  {
    const 고름 = 최신으로고른다(보기, '별자리', '1516999', 2);
    본다('별자리도 최신부터', 고름.map((g) => g.번호).join(',') === '1516331,1516326');
  }
  {
    const 고름 = 최신으로고른다(보기, '띠별', '1516329', 2);
    본다('🔴 자기 자신은 안 고른다', !고름.some((g) => g.번호 === '1516329')
      && 고름.map((g) => g.번호).join(',') === '1516325,1516310');
  }
  {
    /* 🔴 번호만으로 줄 세우면 틀린다 — 예약 기사는 번호를 먼저 받는다 */
    const 섞임 = [
      { 번호: '1516343', 제목: '[오늘의 운세] 11월 26일 목요일 띠별 운세', 날: '2026-11-26' },
      { 번호: '1516325', 제목: '[오늘의 운세] 11월 19일 목요일 띠별 운세', 날: '2026-11-19' },
    ];
    const 고름 = 최신으로고른다(섞임, '띠별', '', 1);
    본다('🔴 날짜가 번호보다 앞선다', 고름[0].번호 === '1516343');
  }
  {
    const 같은날 = [
      { 번호: '1516300', 제목: '[오늘의 운세] 11월 19일 목요일 띠별 운세', 날: '2026-11-19' },
      { 번호: '1516325', 제목: '[오늘의 운세] 11월 19일 목요일 띠별 운세', 날: '2026-11-19' },
    ];
    본다('같은 날이면 번호가 큰 것이 먼저다',
      최신으로고른다(같은날, '띠별', '', 1)[0].번호 === '1516325');
  }
  본다('⛔ 빈 목록을 줘도 안 깨진다', 최신으로고른다([], '띠별', '', 2).length === 0
    && 최신으로고른다(null, '띠별', '', 2).length === 0);
  본다('⛔ 날짜가 없는 줄도 견딘다',
    최신으로고른다([{ 번호: '1', 제목: '[오늘의 운세] 띠별 운세', 날: null }], '띠별', '', 2).length === 1);
  본다('두 건을 넘겨 주지 않는다', 최신으로고른다(보기, '띠별', '', 9).length === 3);

  본다('체크 누르는 글에 번호가 담긴다', 체크누르기글(['111', '222']).includes('"111","222"'));
  본다('⛔ 체크가 이미 되어 있으면 다시 누르지 않는다',
    체크누르기글(['1']).includes('if (!c.checked)'));
  본다('저장 단추 이름이 갈래마다 다르다',
    저장누르기글(갈래표.묶음.저장단추).includes('save_bundled_btn')
    && 저장누르기글(갈래표.관련.저장단추).includes('save_relation_btn'));
  본다('줄읽기는 chkbox- 로 시작하는 칸만 본다', 줄읽기글.includes('chkbox-'));
  본다('⛔ ajax 주소를 지어내 부르지 않는다 — 화면의 단추를 누른다',
    !저장누르기글('.x').includes('ajax.php') && !쪽넘기기글(2).includes('ajax.php'));
  본다('🔴 검색을 쓰지 않는다 — 서버에 안 닿았다(2026-11-19 실측)',
    !줄읽기글.includes('sc_word') && !저장누르기글('.x').includes('sc_word'));
  본다('쪽 넘기기는 화면의 쪽 링크를 누른다',
    쪽넘기기글(3).includes('(3)') && 쪽넘기기글(3).includes('querySelectorAll("a")'));
  본다('⛔ 쪽 번호에 글을 섞어 넣을 수 없다 — 숫자로만 받는다',
    !쪽넘기기글('3; alert(1)').includes('alert') && 쪽넘기기글('3').includes('(3)'));

  본다('🔴 서식에 들어갔나를 서식에서 센다',
    서식에센다글(갈래표.묶음.서식칸).includes('#bundled-ul')
    && 서식에센다글(갈래표.관련.서식칸).includes('#relation-ul'));
  본다('⛔ 칸이 없으면 -1 을 준다 — 0 과 섞지 않는다',
    서식에센다글('#없는칸').includes('return -1'));

  const 진 = 잰다.filter(([, v]) => !v);
  for (const [이름, v] of 잰다) console.log(`${v ? '✅' : '🔴'} ${이름}`);
  console.log(진.length ? `\n🔴 ${진.length}/${잰다.length} 떨어졌다` : `\n✅ 자체검사 ${잰다.length} 통과`);
  process.exit(진.length ? 1 : 0);
}
