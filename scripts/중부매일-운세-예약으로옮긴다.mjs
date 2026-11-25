/**
 * 중부매일-운세-예약으로옮긴다.mjs — 미승인 운세 기사에 **미래 예약을 걸고 승인**한다.
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔴🔴 사장님 2026-11-25 — 「**미승인기사에 있는 운세 기사들을 모두 예약 걸어서 예약기사로 다 옮겨**」
 *   앞선 말씀 — 「예약을 왜 안 걸어서 이 난리를 치게 하나」
 *
 * ── 왜 노출시간을 «새로» 거나 ───────────────────────────────
 *   미승인 54건의 노출시간은 2026년 1~5월, 곧 **과거**다.
 *   과거 시각으로 승인하면 CMS 가 즉시 내보낸다 — 그것이 어제 44건에 일어난 일이다.
 *   ⇒ 예약기사가 되려면 노출시간이 **미래**여야 한다.
 *
 * ── 어느 날로 거나 ─────────────────────────────────────────
 *   제목의 월·일을 그대로 쓰고 **해만 다음 해**로 올린다. 시각은 매뉴얼대로 —
 *   띠별 00:05 · 별자리 00:30. ⛔ 날짜를 지어내지 않는다. 제목에 없으면 건너뛴다.
 *
 * ── ⛔ 웹출판을 누르지 않는다 ───────────────────────────────
 *   「승인 > 저장 > 웹출판」은 **지금 내보낼 기사**의 절차다.
 *   예약 기사에 웹출판을 누르면 예약 시각을 기다리지 않고 포털로 갈 수 있다.
 *   사장님이 막으신 것이 바로 그것이다. 예약은 예약 시각에 스스로 나간다.
 *
 *   node scripts/중부매일-운세-예약으로옮긴다.mjs --자가시험
 *   node scripts/중부매일-운세-예약으로옮긴다.mjs --센다
 *   node scripts/중부매일-운세-예약으로옮긴다.mjs --한다 --몇건 3
 *   node scripts/중부매일-운세-예약으로옮긴다.mjs --한다            (남은 것 전부)
 */
import fs from 'node:fs';
import { 새탭에서, 자리잡기, 재기 } from './lib/cdp.mjs';
import { 제목에서날짜, 갈래집기 } from './중부매일-미승인운세-읽는다.mjs';

export const 서식주소 = (번호) => 'https://cms.jbnews.com/news/adminArticleWriteForm.html?mode=modify&idxno=' + 번호;
export const 읽을곳 = 'docs/자국/중부매일-미승인운세-상태-20261125.json';
export const 일지곳 = 'docs/자국/중부매일-운세-예약으로옮긴다-일지.json';

/** 갈래에 따른 노출시각 — 매뉴얼 그대로 */
export function 노출시각정하기(제목) {
  return 갈래집기(제목) === '별자리' ? '00:30' : '00:05';
}

/** 두 자리로 채운다 */
function 두자리(n) { return (n < 10 ? '0' : '') + n; }

/**
 * 제목의 월·일에 **해를 붙여** 미래 노출날을 만든다.
 * ⛔ 오늘보다 앞선 날이 나오면 해를 하나 더 올린다 — 과거로 걸면 즉시 나간다.
 * ⛔ 2월 29일처럼 그 해에 없는 날이면 null — 지어내지 않는다.
 */
export function 예약날만들기(제목, 오늘 = new Date()) {
  const d = 제목에서날짜(제목);
  if (!d) return null;
  const 오늘자 = new Date(오늘.getFullYear(), 오늘.getMonth(), 오늘.getDate());
  for (let 더 = 0; 더 <= 8; 더 += 1) {
    const 해 = 오늘.getFullYear() + 더;
    const 날 = new Date(해, d.월 - 1, d.일);
    /* 그 해에 없는 날은 넘어간다 (2월 30일 따위가 3월로 말려 들어간다) */
    if (날.getMonth() !== d.월 - 1 || 날.getDate() !== d.일) continue;
    if (날.getTime() <= 오늘자.getTime()) continue;      /* ⛔ 과거·오늘은 예약이 아니다 */
    return 해 + '-' + 두자리(d.월) + '-' + 두자리(d.일);
  }
  return null;
}

/** 지금 상태를 읽는 글 — ⛔ 아무것도 바꾸지 않는다 */
export const 상태글 = [
  '(() => {',
  '  const 켜짐 = (id) => { const e = document.getElementById(id); return !!(e && e.checked); };',
  '  const v = (이름) => { const e = document.getElementsByName(이름)[0]; return e ? (e.value || "") : ""; };',
  '  const i = (id) => { const e = document.getElementById(id); return e ? (e.value || "") : ""; };',
  '  return JSON.stringify({',
  '    제목: v("title"),',
  '    승인: 켜짐("recog-e"), 미승인: 켜짐("recog-c"), 반려: 켜짐("recog-r"),',
  '    노출날: i("embargo_date"), 노출시각: i("embargo_time"),',
  '  });',
  '})()',
].join('\n');

/**
 * 노출시간을 건다.
 * ⛔ 날짜와 시각을 **둘 다** 넣는다. 하나만 넣으면 입력시각이 1970-01-01 이 되어 기사가 사라진다.
 */
export function 노출걸기글(날짜글, 시각글) {
  return [
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
    '  return (d.value === ' + JSON.stringify(날짜글) + ' && t.value === ' + JSON.stringify(시각글) + ')',
    '    ? "걸었다" : ("🔴 안 들어갔다 " + d.value + " " + t.value);',
    '})()',
  ].join('\n');
}

/** 승인 라디오를 고른다 — ⛔ 미승인·반려 칸은 누르지 않는다 */
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

/** 저장 — ⛔ 「임시저장」이 섞이지 않게 글자를 정확히 맞춘다 */
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

function 대화상자받기(붙음) {
  붙음.듣기('Page.javascriptDialogOpening', () => {
    붙음.보내기('Page.handleJavaScriptDialog', { accept: true }).catch(() => {});
  });
}

/**
 * 한 건을 **예약으로 옮긴다** — ① 노출시간 걸기 ② 승인 고르기 ③ 저장 ④ 되읽어 판정.
 * ⛔ 웹출판을 누르지 않는다.
 */
export async function 한건예약(번호, 오늘 = new Date()) {
  return 새탭에서(서식주소(번호), async (붙음) => {
    대화상자받기(붙음);
    await 자리잡기(붙음, { 최대: 45000 });
    await 쉰다(3000);

    let 전 = null;
    try { 전 = JSON.parse(String(await 재기(붙음, 상태글, 25000))); } catch { 전 = null; }
    if (!전) return { 된것: false, 말: '🔴 기사를 못 읽었다' };

    /* 🔴🔴 사장님 2026-11-25 — 「**어제 나간것들도 거뒀으니 다시 해당 날짜에 예약해놔**」
     *   ⇒ 이미 승인된 것도 예약을 건다. 앞서 건너뛴 45건이 바로 그것이다.
     *   ⛔ 단, `--승인된것은건너뛴다` 를 주면 건너뛴다(처음 54건을 할 때 쓰던 길).
     *   ⛔ 노출시간이 **이미 바라는 값**이면 건드리지 않는다 — 두 번 저장하지 않는다. */
    const 미리본날 = 예약날만들기(전.제목, 오늘);
    const 미리본시각 = 노출시각정하기(전.제목);
    if (전.승인 && process.argv.includes('--승인된것은건너뛴다')) {
      return { 된것: true, 건너뜀: true, 말: '이미 승인이다 — 건드리지 않았다' };
    }
    if (미리본날 && 전.노출날 === 미리본날 && String(전.노출시각).slice(0, 5) === 미리본시각) {
      return { 된것: true, 건너뜀: true, 예약날: 미리본날, 예약시각: 미리본시각,
        말: '이미 그 날짜로 예약돼 있다 — 건드리지 않았다' };
    }

    const 예약날 = 예약날만들기(전.제목, 오늘);
    if (!예약날) return { 된것: false, 말: '🔴 제목에서 예약날을 못 만들었다 — ' + String(전.제목).slice(0, 40) };
    const 예약시각 = 노출시각정하기(전.제목);

    const 걸었나 = String(await 재기(붙음, 노출걸기글(예약날, 예약시각), 25000));
    if (걸었나 !== '걸었다') return { 된것: false, 말: '🔴 노출시간을 못 걸었다 — ' + 걸었나 };

    const 골랐나 = String(await 재기(붙음, 승인고르기글, 25000));
    if (골랐나 !== '골랐다') return { 된것: false, 말: '🔴 승인을 못 골랐다 — ' + 골랐나 };

    const 저장 = String(await 재기(붙음, 저장누르기글, 25000));
    if (저장 !== '눌렀다') return { 된것: false, 말: '🔴 저장을 못 눌렀다 — ' + 저장 };
    await 쉰다(9000);
    await 자리잡기(붙음, { 최대: 30000 });

    /* ⛔ 「눌렀다」를 「됐다」로 읽지 않는다 — 서식을 다시 열어 읽는다 */
    let 뒤 = null;
    try {
      await 붙음.보내기('Page.navigate', { url: 서식주소(번호) });
      await 자리잡기(붙음, { 최대: 45000 });
      await 쉰다(3000);
      뒤 = JSON.parse(String(await 재기(붙음, 상태글, 25000)));
    } catch { 뒤 = null; }
    if (!뒤) return { 된것: false, 말: '🔴 되읽기를 못 했다 (저장은 눌렀다)' };

    const 날맞나 = 뒤.노출날 === 예약날;
    const 시각맞나 = String(뒤.노출시각).slice(0, 5) === 예약시각;
    const 된것 = !!뒤.승인 && 날맞나 && 시각맞나;
    return {
      된것,
      예약날, 예약시각,
      말: (뒤.승인 ? '승인' : '🔴 아직 미승인')
        + ' · 노출 ' + 뒤.노출날 + ' ' + 뒤.노출시각
        + (날맞나 && 시각맞나 ? '' : ' 🔴 건 값과 다르다 (걸었던 것 ' + 예약날 + ' ' + 예약시각 + ')'),
    };
  });
}

/* ── 자가시험 ──────────────────────────────────────────────── */
function 직접실행인가() { return (process.argv[1] || '').includes('중부매일-운세-예약으로옮긴다'); }

if (직접실행인가() && process.argv.includes('--자가시험')) {
  const 잰다 = []; const 본다 = (이름, v) => 잰다.push([이름, !!v]);
  const 기준 = new Date(2026, 10, 25);           /* 2026-11-25 */

  본다('지난 5월 27일은 다음 해 5월 27일이 된다',
    예약날만들기('[오늘의운세] 5월 27일 (음력 4월 11일)', 기준) === '2027-05-27');
  본다('1월 15일도 다음 해가 된다',
    예약날만들기('[오늘의운세] 1월 15일 (음력 11월 27일)', 기준) === '2027-01-15');
  본다('⛔ 과거로는 절대 안 건다 — 모두 오늘보다 뒤다', (() => {
    const 것 = ['1월 1일', '3월 26일', '5월 27일', '11월 25일', '12월 31일']
      .map((s) => 예약날만들기('[오늘의운세] ' + s, 기준));
    return 것.every((v) => v && new Date(v + 'T00:00:00') > new Date(2026, 10, 25));
  })());
  본다('⛔ 오늘(11월 25일)은 예약이 아니다 — 다음 해로 민다',
    예약날만들기('[오늘의운세] 11월 25일', 기준) === '2027-11-25');
  본다('내일(11월 26일)은 올해 그대로다',
    예약날만들기('[오늘의운세] 11월 26일', 기준) === '2026-11-26');
  본다('2월 29일은 윤년으로 간다 — 없는 날을 지어내지 않는다',
    예약날만들기('[오늘의운세] 2월 29일', 기준) === '2028-02-29');
  본다('⛔ 제목에 날짜가 없으면 null — 0 이 아니다',
    예약날만들기('[포토] 첫눈', 기준) === null);
  본다('⛔ 13월·32일은 null', 예약날만들기('[오늘의운세] 13월 1일', 기준) === null
    && 예약날만들기('[오늘의운세] 1월 32일', 기준) === null);
  본다('띠별은 00:05', 노출시각정하기('[오늘의운세] 5월 27일') === '00:05');
  본다('별자리는 00:30', 노출시각정하기('[오늘의별자리] 5월 27일') === '00:30');
  본다('🔴 노출시간은 날짜와 시각을 «둘 다» 넣는다',
    노출걸기글('2027-05-27', '00:05').includes('embargo_date')
    && 노출걸기글('2027-05-27', '00:05').includes('embargo_time'));
  본다('넣은 뒤 그 칸을 다시 읽어 확인한다',
    노출걸기글('2027-05-27', '00:05').includes('d.value === '));
  본다('승인 라디오를 고른다 — 누르고 change 를 알리고 라벨까지',
    승인고르기글.includes('recog-e') && 승인고르기글.includes('r.click()')
    && 승인고르기글.includes('new Event("change"') && 승인고르기글.includes('label[for=recog-e]'));
  본다('⛔ 미승인·반려 칸을 누르지 않는다',
    !승인고르기글.includes('recog-c') && !승인고르기글.includes('recog-r'));
  본다('⛔ 저장 단추를 글자로 정확히 맞춘다', 저장누르기글.includes('.trim() === "저장"'));
  본다('⛔ 웹출판을 누르는 곳이 한 군데도 없다', (() => {
    const 모두 = [상태글, 승인고르기글, 저장누르기글, 노출걸기글('2027-01-01', '00:05')].join('\n');
    return !/웹출판/.test(모두);
  })());
  본다('⛔ 삭제를 부르는 곳이 한 군데도 없다', (() => {
    const 모두 = [상태글, 승인고르기글, 저장누르기글, 노출걸기글('2027-01-01', '00:05')].join('\n');
    return !/삭제|Del\(|delete/i.test(모두);
  })());
  본다('⛔ 제목·본문을 건드리지 않는다', (() => {
    const 모두 = [승인고르기글, 저장누르기글, 노출걸기글('2027-01-01', '00:05')].join('\n');
    return !/title|content|body/i.test(모두);
  })());

  const 진 = 잰다.filter(([, v]) => !v);
  for (const [이름, v] of 잰다) console.log((v ? '  ✅ ' : '  🔴 ') + 이름);
  console.log(진.length ? ('🔴 ' + 진.length + '가지 깨졌다') : ('✅ 자가시험 ' + 잰다.length + ' 통과'));
  process.exit(진.length ? 1 : 0);
}

/* ── 돌린다 ────────────────────────────────────────────────── */
/**
 * 무엇을 할 것인가.
 * 🔴 [2026-11-25] 처음에는 상태 파일(미승인 100건)만 보았다. 그런데 승인관리 목록은
 *   앞의 것이 빠지면 뒤가 «당겨 올라온다» — 54건을 옮기고 나니 46건이 새로 드러났다.
 *   ⛔ 「한 번 읽은 목록 = 전부」로 읽지 않는다. 목록 파일을 다시 읽어 돌린다.
 *   승인 여부는 서식을 열어 그 자리에서 본다(이미 승인이면 건드리지 않는다).
 */
function 할것들() {
  const i = process.argv.indexOf('--목록');
  const 목록곳 = i >= 0 ? process.argv[i + 1] : 'docs/자국/중부매일-미승인운세-20261125.json';
  const 전부 = JSON.parse(fs.readFileSync(목록곳, 'utf8'));
  return 전부.filter((x) => 갈래집기(x.제목) !== '모름');
}

if (직접실행인가() && process.argv.includes('--센다')) {
  const 것 = 할것들();
  const 오늘 = new Date();
  console.log('■ 미승인 운세 ' + 것.length + '건');
  let 못만듦 = 0;
  for (const x of 것) {
    const 날 = 예약날만들기(x.제목, 오늘);
    if (!날) { 못만듦 += 1; console.log('   🔴 ' + x.번호 + ' 예약날을 못 만든다 — ' + String(x.제목).slice(0, 40)); }
  }
  console.log('■ 예약날을 만들 수 있는 것 ' + (것.length - 못만듦) + '건 · 못 만드는 것 ' + 못만듦 + '건');
  const 보기 = 것.slice(0, 5).map((x) => x.번호 + ' ' + x.노출날 + ' → ' + 예약날만들기(x.제목, 오늘)
    + ' ' + 노출시각정하기(x.제목));
  for (const s of 보기) console.log('   ' + s);
}

if (직접실행인가() && process.argv.includes('--한다')) {
  const i = process.argv.indexOf('--몇건');
  const 몇건 = i >= 0 ? Math.max(1, Number(process.argv[i + 1]) || 1) : 9999;
  const 것 = 할것들().slice(0, 몇건);
  const 오늘 = new Date();

  let 일지 = [];
  try { 일지 = JSON.parse(fs.readFileSync(일지곳, 'utf8')); } catch { 일지 = []; }
  const 이미 = new Set(일지.filter((x) => x.된것).map((x) => String(x.번호)));

  let 됐다 = 0; let 안됐다 = 0;
  for (const x of 것) {
    if (이미.has(String(x.번호))) { console.log('■ ' + x.번호 + ' — 이미 옮겼다'); continue; }
    let r = null;
    try { r = await 한건예약(x.번호, 오늘); }
    catch (탈) { r = { 된것: false, 말: '🔴 ' + String(탈.message).slice(0, 90) }; }
    console.log('■ ' + x.번호 + ' — ' + (r.된것 ? '🟢 ' : '') + r.말 + '  ' + String(x.제목).slice(0, 28));
    일지.push({ 번호: x.번호, 제목: x.제목, 된것: r.된것, 예약날: r.예약날 || '', 예약시각: r.예약시각 || '', 말: r.말, 잰때: new Date().toLocaleString('ko-KR') });
    fs.writeFileSync(일지곳, JSON.stringify(일지, null, 1), 'utf8');
    if (r.된것) 됐다 += 1; else 안됐다 += 1;
    await 쉰다(5000);
  }
  console.log('');
  console.log('■ 예약으로 옮긴 것 ' + 됐다 + '건 · 안 된 것 ' + 안됐다 + '건');
  console.log('■ 일지 — ' + 일지곳);
}
