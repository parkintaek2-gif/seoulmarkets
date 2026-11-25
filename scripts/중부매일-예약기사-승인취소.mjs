/**
 * 중부매일-예약기사-승인취소.mjs — 예약기사 목록에서 **「(구)오늘의운세-네이버」 분류를 뺀다.**
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔴🔴 사장님 2026-11-25 — 「**구 오늘의 운세-네이버X 분류는 우리가 쓴 오늘의 운세가 아니잖아.
 *   다 예약기사에서 삭제해**」
 *
 * ── ⭐ 「삭제」가 무엇인지 먼저 재고 나서 만들었다 ─────────────
 *   목록 줄 끝의 단추를 코드로 읽으니 이랬다 —
 *     <button type="button" class="button nd-white recog-btn" value="RC" title="승인취소">
 *   ⇒ **기사를 지우는 것이 아니라 「승인취소」다.** 누르면 미승인으로 돌아가
 *     예약기사 목록에서 빠진다. 기사 자체는 남는다.
 *   ⛔ 사장님 「삭제 많이 하면 네이버에게 벌점 받아」 — 그래서 이 길을 골랐다.
 *
 * ── ⛔ 건드리지 않는 것 ───────────────────────────────────
 *   예약기사 117건 가운데 분류가 **「오늘의 운세」인 20건**은 우리가 쓴 것이다.
 *   ⛔ 분류 칸을 글자로 맞춰 **「(구)오늘의운세」가 든 줄만** 누른다.
 *
 *   node scripts/중부매일-예약기사-승인취소.mjs --자가시험
 *   node scripts/중부매일-예약기사-승인취소.mjs --센다
 *   node scripts/중부매일-예약기사-승인취소.mjs --한다 --몇건 1
 *   node scripts/중부매일-예약기사-승인취소.mjs --한다
 */
import fs from 'node:fs';
import { 새탭에서, 자리잡기, 재기 } from './lib/cdp.mjs';

export const 예약화면 = 'https://cms.jbnews.com/news/adminArticleIntegrationEmbargo.html?sc_area=AW';
export const 쪽주소 = (쪽) => (Number(쪽) > 1 ? 예약화면 + '&page=' + Math.floor(Number(쪽)) : 예약화면);
export const 일지곳 = 'docs/자국/중부매일-예약기사-승인취소-일지.json';

/** 뺄 것인가 — ⛔ 「오늘의 운세」(우리 것)는 빼지 않는다 */
export function 뺄것인가(분류글) {
  const s = String(분류글 ?? '');
  if (!s) return false;
  if (!/\(구\)\s*오늘의운세/.test(s)) return false;     /* (구) 가 붙은 것만 */
  return true;
}

/** 한 줄에서 분류 칸을 집는다 */
export function 분류집기(칸들) {
  for (const c of 칸들 || []) {
    const s = String(c || '');
    if (/오늘의\s*운세|오늘의운세|별자리/.test(s) && s.length < 40) return s;
  }
  return '';
}

/** 목록 줄을 읽는 글 — ⛔ 아무것도 누르지 않는다 */
export const 줄읽기글 = [
  '(() => {',
  '  const 줄들 = [...document.querySelectorAll("tr[data-article_idxno]")];',
  '  return JSON.stringify({ 줄수: 줄들.length, 것: 줄들.map((tr) => {',
  '    const a = tr.querySelector("a");',
  '    return { 번호: tr.getAttribute("data-article_idxno") || "",',
  '      제목: ((a && a.innerText) || "").replace(/\\s+/g, " ").trim().slice(0, 45),',
  '      칸: [...tr.querySelectorAll("td")].map((td) => (td.innerText || "").replace(/\\s+/g, " ").trim()) };',
  '  }) });',
  '})()',
].join('\n');

/**
 * 그 기사 줄의 **승인취소 단추 자리**를 잰다.
 * ⛔ 단추를 글자가 아니라 `value="RC"` 로 고른다 — 다른 「취소」와 섞이지 않게.
 * ⛔ 번호가 맞는 줄에서만 찾는다.
 */
export function 취소자리글(번호) {
  return [
    '(() => {',
    '  const tr = document.querySelector("tr[data-article_idxno=\'" + ' + JSON.stringify(String(번호)) + ' + "\']");',
    '  if (!tr) return "";',
    '  const b = [...tr.querySelectorAll("button")].find((e) => e.value === "RC");',
    '  if (!b) return "";',
    '  if (!(b.offsetWidth || b.offsetHeight)) return "";',
    '  b.scrollIntoView({ block: "center" });',
    '  const r = b.getBoundingClientRect();',
    '  return JSON.stringify({ x: r.left + r.width / 2, y: r.top + r.height / 2, 제목: (b.title || "") });',
    '})()',
  ].join('\n');
}

/** 그 번호가 아직 목록에 있나 */
export function 아직있나글(번호) {
  return '(() => !!document.querySelector("tr[data-article_idxno=\'" + '
    + JSON.stringify(String(번호)) + ' + "\']"))()';
}

const 쉰다 = (밀리) => new Promise((끝) => setTimeout(끝, 밀리));

function 대화상자받기(붙음, 모은말) {
  붙음.듣기('Page.javascriptDialogOpening', (p) => {
    if (모은말) 모은말.push(String((p && p.message) || '').slice(0, 80));
    붙음.보내기('Page.handleJavaScriptDialog', { accept: true }).catch(() => {});
  });
}

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

/** 한 쪽을 읽어 «뺄 것»만 추린다 */
export async function 한쪽읽기(쪽) {
  return 새탭에서(쪽주소(쪽), async (붙음) => {
    대화상자받기(붙음);
    await 자리잡기(붙음, { 최대: 45000 });
    await 쉰다(2500);
    let r = null;
    try { r = JSON.parse(String(await 재기(붙음, 줄읽기글, 25000))); } catch { r = null; }
    if (!r) return null;
    return (r.것 || []).map((o) => ({ ...o, 분류: 분류집기(o.칸) }));
  });
}

/**
 * 한 건을 승인취소한다 — 목록 1쪽을 열고 그 번호를 찾아 누른다.
 * ⛔ 분류를 **다시 읽어** 뺄 것이 맞는지 확인하고 나서 누른다. 목록은 당겨 올라온다.
 */
export async function 한건취소(번호, { 최대쪽 = 14 } = {}) {
  return 새탭에서(쪽주소(1), async (붙음) => {
    const 말 = [];
    대화상자받기(붙음, 말);
    await 자리잡기(붙음, { 최대: 45000 });
    await 쉰다(2500);

    /* 그 번호가 어느 쪽에 있나 */
    let 찾음 = null;
    for (let 쪽 = 1; 쪽 <= 최대쪽; 쪽 += 1) {
      if (쪽 > 1) {
        await 붙음.보내기('Page.navigate', { url: 쪽주소(쪽) });
        await 자리잡기(붙음, { 최대: 40000 });
        await 쉰다(2200);
      }
      let r = null;
      try { r = JSON.parse(String(await 재기(붙음, 줄읽기글, 25000))); } catch { r = null; }
      if (!r || !r.줄수) break;
      const 줄 = (r.것 || []).find((o) => String(o.번호) === String(번호));
      if (줄) { 찾음 = { 쪽, 줄 }; break; }
    }
    if (!찾음) return { 된것: false, 말: '예약기사 목록에 없다 — 이미 빠졌거나 못 찾았다' };

    /* ⛔ 누르기 «직전»에 분류를 다시 본다 */
    const 분류 = 분류집기(찾음.줄.칸);
    if (!뺄것인가(분류)) {
      return { 된것: false, 분류, 말: '⛔ 뺄 것이 아니다 — 분류 [' + 분류 + ']' };
    }

    let 좌표 = null;
    const 자리 = String(await 재기(붙음, 취소자리글(번호), 20000));
    if (자리) { try { 좌표 = JSON.parse(자리); } catch { 좌표 = null; } }
    if (!좌표) return { 된것: false, 분류, 말: '🔴 승인취소 단추를 못 찾았다' };
    if (!/승인취소/.test(좌표.제목 || '')) {
      return { 된것: false, 분류, 말: '⛔ 단추 이름이 「승인취소」가 아니다 — [' + 좌표.제목 + '] 누르지 않았다' };
    }

    await 진짜마우스로(붙음, 좌표);
    await 쉰다(6000);

    /* ⛔ 「눌렀다」를 「됐다」로 읽지 않는다 — 목록을 다시 열어 사라졌나 본다 */
    await 붙음.보내기('Page.navigate', { url: 쪽주소(찾음.쪽) });
    await 자리잡기(붙음, { 최대: 40000 });
    await 쉰다(3000);
    const 아직 = await 재기(붙음, 아직있나글(번호), 20000);
    return {
      된것: !아직, 분류,
      말: (아직 ? '🔴 아직 예약기사에 남아 있다' : '빠졌다') + (말.length ? ' · 물음창 [' + 말[0] + ']' : ''),
    };
  });
}

/* ── 자가시험 ──────────────────────────────────────────────── */
function 직접실행인가() { return (process.argv[1] || '').includes('중부매일-예약기사-승인취소'); }

if (직접실행인가() && process.argv.includes('--자가시험')) {
  const 잰다 = []; const 본다 = (이름, v) => 잰다.push([이름, !!v]);
  본다('예약기사 화면이 맞다', 예약화면.includes('IntegrationEmbargo'));
  본다('쪽 주소에 page 가 붙는다', 쪽주소(3).includes('page=3') && 쪽주소(1) === 예약화면);
  본다('🔴 (구)오늘의운세는 뺀다', 뺄것인가('(구)오늘의운세-네이버 X') === true);
  본다('⛔ 「오늘의 운세」는 «빼지 않는다» — 우리가 쓴 것이다', 뺄것인가('오늘의 운세') === false);
  본다('⛔ 빈 분류는 빼지 않는다', 뺄것인가('') === false && 뺄것인가(null) === false);
  본다('⛔ 엉뚱한 분류는 빼지 않는다', 뺄것인가('오늘의 별자리') === false && 뺄것인가('사설') === false);
  본다('띄어쓰기가 달라도 (구)는 잡는다', 뺄것인가('(구) 오늘의운세-네이버') === true);
  본다('분류 칸을 칸들에서 집는다',
    분류집기(['1504756번 기사', '(구)오늘의운세-네이버 X', '중부매일']) === '(구)오늘의운세-네이버 X');
  본다('⛔ 긴 칸(제목 따위)은 분류로 보지 않는다',
    분류집기(['[오늘의운세] 5월 27일 (음력 4월 11일) (2,983) 이미지기사 중부매일 2027']) === '');
  본다('🔴 단추를 value=RC 로 고른다 — 글자로 고르지 않는다',
    취소자리글(1).includes('e.value === "RC"'));
  본다('⛔ 그 기사 줄 «안»에서만 찾는다', 취소자리글(1504756).includes('data-article_idxno'));
  본다('⛔ 화면에 안 보이는 단추는 누르지 않는다', 취소자리글(1).includes('offsetWidth'));
  본다('단추 이름을 함께 가져온다 — 「승인취소」가 아니면 누르지 않는다',
    취소자리글(1).includes('b.title'));
  본다('⛔ 줄읽기글은 아무것도 누르지 않는다', !/\.click\(|submit\(/.test(줄읽기글));
  본다('⛔ 어디에도 삭제를 부르지 않는다', (() => {
    const 모두 = [줄읽기글, 취소자리글(1), 아직있나글(1)].join('\n');
    return !/삭제|Del\(|delete/i.test(모두);
  })());
  const 진 = 잰다.filter(([, v]) => !v);
  for (const [이름, v] of 잰다) console.log((v ? '  ✅ ' : '  🔴 ') + 이름);
  console.log(진.length ? ('🔴 ' + 진.length + '가지 깨졌다') : ('✅ 자가시험 ' + 잰다.length + ' 통과'));
  process.exit(진.length ? 1 : 0);
}

/* ── 돌린다 ────────────────────────────────────────────────── */
async function 모은다() {
  const 모은것 = new Map();
  for (let 쪽 = 1; 쪽 <= 14; 쪽 += 1) {
    const 것 = await 한쪽읽기(쪽);
    if (!것) { console.log('🔴 ' + 쪽 + '쪽을 못 읽었다 — 못 쟀다(0 이 아니다)'); continue; }
    let 새것 = 0;
    for (const o of 것) { if (o.번호 && !모은것.has(o.번호)) { 모은것.set(o.번호, o); 새것 += 1; } }
    if (!새것) break;
    await 쉰다(900);
  }
  return [...모은것.values()];
}

if (직접실행인가() && process.argv.includes('--센다')) {
  const 것 = await 모은다();
  const 뺄것 = 것.filter((o) => 뺄것인가(o.분류));
  const 둘것 = 것.filter((o) => !뺄것인가(o.분류));
  console.log('■ 예약기사 모두 ' + 것.length + '건');
  console.log('   🔴 뺄 것 ((구)오늘의운세) ' + 뺄것.length + '건');
  console.log('   ⭐ 그대로 둘 것 ' + 둘것.length + '건');
  const 갈래 = {};
  for (const o of 둘것) 갈래[o.분류 || '(모름)'] = (갈래[o.분류 || '(모름)'] || 0) + 1;
  console.log('   둘 것의 분류: ' + JSON.stringify(갈래));
  fs.writeFileSync('docs/자국/중부매일-예약기사-뺄것.json', JSON.stringify(뺄것, null, 1), 'utf8');
  console.log('■ 적었다 — docs/자국/중부매일-예약기사-뺄것.json');
}

if (직접실행인가() && process.argv.includes('--한다')) {
  const i = process.argv.indexOf('--몇건');
  const 몇건 = i >= 0 ? Math.max(1, Number(process.argv[i + 1]) || 1) : 9999;
  const 것 = JSON.parse(fs.readFileSync('docs/자국/중부매일-예약기사-뺄것.json', 'utf8')).slice(0, 몇건);

  let 일지 = [];
  try { 일지 = JSON.parse(fs.readFileSync(일지곳, 'utf8')); } catch { 일지 = []; }
  const 이미 = new Set(일지.filter((x) => x.된것).map((x) => String(x.번호)));

  let 됐다 = 0; let 안됐다 = 0;
  for (const x of 것) {
    if (이미.has(String(x.번호))) continue;
    let r = null;
    try { r = await 한건취소(x.번호); }
    catch (탈) { r = { 된것: false, 말: '🔴 ' + String(탈.message).slice(0, 90) }; }
    console.log('■ ' + x.번호 + ' — ' + (r.된것 ? '🟢 ' : '') + r.말 + '  [' + (r.분류 || x.분류) + ']  ' + String(x.제목).slice(0, 24));
    일지.push({ 번호: x.번호, 제목: x.제목, 분류: r.분류 || x.분류, 된것: r.된것, 말: r.말,
      잰때: new Date().toLocaleString('ko-KR') });
    fs.writeFileSync(일지곳, JSON.stringify(일지, null, 1), 'utf8');
    if (r.된것) 됐다 += 1; else 안됐다 += 1;
    await 쉰다(3000);
  }
  console.log('');
  console.log('■ 예약기사에서 뺀 것 ' + 됐다 + '건 · 안 된 것 ' + 안됐다 + '건 — 일지 ' + 일지곳);
}
