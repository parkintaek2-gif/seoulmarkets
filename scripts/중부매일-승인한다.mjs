/**
 * 중부매일-승인한다.mjs — 올려 둔 기사를 **승인**하고 **웹출판**까지 누른다.
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔴🔴 사장님 2026-11-19 — 「**예약시간 걸었으면 승인까지 해**」 · 「**승인다했어. 27일부터 승인해**」
 *   노출시간을 걸어도 승인이 «저절로» 되지는 않았다. 걸어 두기만 하면 나가지 않는다.
 * 🔴🔴 사장님 2026-11-19 — 「승인 후에 웹출판을 반드시 클릭해야 한다. 제일 오른쪽 위에 있어」
 *   · 「승인후 N D Z K 가 컬러로 나와야 네이버 등 외부에 전송된거야」
 *
 * ── 🔴🔴 어느 길로 가나 — 사장님이 정하셨다 (2026-11-19) ─────────
 *   「**승인 선택 > 저장 > 웹출판 까지 다 해야 한다**」
 *   ⇒ 기사 서식을 열고 ① 승인 라디오를 고르고 ② 저장하고 ③ 웹출판을 누른다. 셋이 한 벌이다.
 *   ⛔ 승인관리 화면의 「선택승인」 단추 하나로 끝내지 않는다. 사장님이 셋을 다 하라 하셨다.
 *   ⛔ 저장은 노출시간을 망가뜨릴 수 있는 자리다(2026-11-19 에 입력일이 1970 이 된 적이 있다).
 *     **저장 앞뒤로 노출날·노출시각을 읽어** 그대로인지 본다. 달라졌으면 빨간불을 낸다.
 *
 *   node scripts/중부매일-승인한다.mjs 1516354 1516355 1516356
 *   node scripts/중부매일-승인한다.mjs --자체검사
 */
import { 새탭에서, 자리잡기, 재기 } from './lib/cdp.mjs';

export const 승인화면 = 'https://cms.jbnews.com/news/adminArticleIntegrationRecognition.html?sc_area=RW';
export const 서식주소 = (번호) => 'https://cms.jbnews.com/news/adminArticleWriteForm.html?mode=modify&idxno=' + 번호;

/**
 * ① 승인 라디오를 고른다.
 * ⛔ [2026-11-18] `r.checked = true` 만으로는 저장되지 않는다. 다시 읽으면 되돌아가 있었다.
 *   라디오를 «누르고», change 를 알리고, 라벨까지 눌러야 CMS 가 받아들인다.
 *   recog-e = 승인 · recog-c = 미승인 · recog-r = 반려
 */
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

/** ② 저장 */
export const 저장누르기글 = [
  '(() => {',
  '  const b = [...document.querySelectorAll("button")]',
  '    .find((e) => ((e.innerText || "") + "").trim() === "저장");',
  '  if (!b) return "저장 단추가 없다";',
  '  b.click();',
  '  return "눌렀다";',
  '})()',
].join('\n');

/** 목록에서 N D Z K 가 색으로 바뀌었나 — 사장님 「컬러로 나와야 외부에 전송된거야」 */
export function 포털색읽기글(번호) {
  return [
    '(() => {',
    '  const 줄 = document.querySelector("tr[data-article_idxno=\'" + ' + JSON.stringify(String(번호)) + ' + "\']");',
    '  if (!줄) return "그 줄이 없다";',
    '  const b = [...줄.querySelectorAll(".forward-btn")];',
    '  if (!b.length) return "포털 단추가 없다";',
    '  return b.map((e) => (e.getAttribute("title") || "") + ":"',
    '    + (e.className.indexOf("oncheck") >= 0 ? "켜짐" : "꺼짐")).join(" ");',
    '})()',
  ].join('\n');
}

/** 그 기사가 승인되었나를 «기사 서식에서» 읽는다. 읽기만 한다 */
export const 승인됐나글 = [
  '(() => {',
  '  const 켜짐 = (아이디) => { const e = document.getElementById(아이디); return !!(e && e.checked); };',
  '  const v = (이름) => { const e = document.getElementsByName(이름)[0]; return e ? (e.value || "") : ""; };',
  '  return JSON.stringify({',
  '    제목: v("title"),',
  '    승인: 켜짐("recog-e"), 미승인: 켜짐("recog-c"), 반려: 켜짐("recog-r"),',
  '    노출날: v("embargo_date"), 노출시각: v("embargo_time"),',
  '    묶음: document.querySelectorAll("#bundled-ul li").length,',
  '    관련: document.querySelectorAll("#relation-ul li").length,',
  '  });',
  '})()',
].join('\n');

/**
 * ③ 🔴 웹출판 — 누르지 않으면 네이버·다음으로 안 나간다.
 * ⛔ 스크립트로만 누르면 CMS 가 받지 않는 자리가 있다. **진짜 마우스로** 누른다.
 */
export const 웹출판자리글 = [
  '(() => {',
  '  const 후보 = [...document.querySelectorAll("button,a")]',
  '    .filter((e) => /웹출판/.test((e.innerText || "") + "") && (e.offsetWidth || e.offsetHeight));',
  '  if (!후보.length) return "";',
  '  const r = 후보[0].getBoundingClientRect();',
  '  return JSON.stringify({ x: r.left + r.width / 2, y: r.top + r.height / 2 });',
  '})()',
].join('\n');

const 쉰다 = (밀리) => new Promise((끝) => setTimeout(끝, 밀리));

function 대화상자받기(붙음) {
  붙음.듣기('Page.javascriptDialogOpening', () => {
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

/** 한 기사의 지금 상태를 읽는다 — 아무것도 바꾸지 않는다 */
export async function 상태읽기(번호) {
  return 새탭에서(서식주소(번호), async (붙음) => {
    대화상자받기(붙음);
    await 자리잡기(붙음, { 최대: 40000 });
    await 쉰다(2500);
    try { return JSON.parse(String(await 재기(붙음, 승인됐나글, 25000))); } catch { return null; }
  });
}

/**
 * 🔴🔴 한 기사를 **승인 선택 > 저장 > 웹출판** 까지 한다 (사장님 2026-11-19).
 * ⛔ 저장이 노출시간을 지우지 않았나를 앞뒤로 잰다.
 */
export async function 한건승인(번호) {
  return 새탭에서(서식주소(번호), async (붙음) => {
    대화상자받기(붙음);
    await 자리잡기(붙음, { 최대: 45000 });
    await 쉰다(3000);

    let 전 = null;
    try { 전 = JSON.parse(String(await 재기(붙음, 승인됐나글, 25000))); } catch { 전 = null; }
    if (!전) return '🔴 기사를 못 읽었다';
    if (전.승인) return '이미 승인이다 — ' + 전.제목;

    const 골랐나 = String(await 재기(붙음, 승인고르기글, 25000));
    if (골랐나 !== '골랐다') return '🔴 승인을 못 골랐다 — ' + 골랐나;

    const 저장 = String(await 재기(붙음, 저장누르기글, 25000));
    if (저장 !== '눌렀다') return '🔴 저장을 못 눌렀다 — ' + 저장;
    await 쉰다(9000);
    await 자리잡기(붙음, { 최대: 30000 });

    /* 🔴 승인 뒤 웹출판 — 진짜 마우스로 */
    let 좌표 = null;
    try { 좌표 = JSON.parse(String(await 재기(붙음, 웹출판자리글, 20000))); } catch { 좌표 = null; }
    let 출판 = '웹출판 단추를 못 찾았다';
    if (좌표) { await 진짜마우스로(붙음, 좌표); await 쉰다(7000); 출판 = '눌렀다'; }

    /* ⛔ 「눌렀다」를 「됐다」로 읽지 않는다 — 서식을 다시 읽는다 */
    let 뒤 = null;
    try {
      await 붙음.보내기('Page.navigate', { url: 서식주소(번호) });
      await 자리잡기(붙음, { 최대: 45000 });
      await 쉰다(3000);
      뒤 = JSON.parse(String(await 재기(붙음, 승인됐나글, 25000)));
    } catch { 뒤 = null; }

    if (!뒤) return '🔴 되읽기를 못 했다 (저장 ' + 저장 + ' · 웹출판 ' + 출판 + ')';
    const 시간그대로 = 뒤.노출날 === 전.노출날 && 뒤.노출시각 === 전.노출시각;
    return (뒤.승인 ? '🟢 승인' : '🔴 아직 미승인')
      + ' · 웹출판 ' + 출판
      + ' · 노출 ' + 뒤.노출날 + ' ' + 뒤.노출시각
      + (시간그대로 ? '' : ' 🔴 노출시간이 바뀌었다 (전 ' + 전.노출날 + ' ' + 전.노출시각 + ')')
      + ' · 묶음 ' + 뒤.묶음 + ' 관련 ' + 뒤.관련;
  });
}

/** 목록에서 N D Z K 를 읽는다 — 읽기만 한다 */
export async function 포털읽기(번호들) {
  return 새탭에서(승인화면, async (붙음) => {
    대화상자받기(붙음);
    await 자리잡기(붙음, { 최대: 40000 });
    await 쉰다(2500);
    const 말 = [];
    for (const 번호 of 번호들) {
      말.push(번호 + ' ' + String(await 재기(붙음, 포털색읽기글(번호), 20000)));
    }
    return 말.join('\n   ');
  });
}

/* ── 돌린다 ────────────────────────────────────────────────── */
function 직접실행인가() {
  return (process.argv[1] || '').includes('중부매일-승인한다');
}

if (직접실행인가() && process.argv.includes('--자체검사')) {
  const 잰다 = [];
  const 본다 = (이름, v) => 잰다.push([이름, !!v]);

  본다('승인 화면은 승인관리다', 승인화면.includes('IntegrationRecognition'));
  본다('서식 주소는 그 기사 하나를 연다', 서식주소(1516354).includes('idxno=1516354')
    && 서식주소(1516354).includes('mode=modify'));

  /* 🔴🔴 사장님이 정하신 셋 — 승인 선택 > 저장 > 웹출판 */
  본다('🔴 ① 승인 라디오를 고른다', 승인고르기글.includes('recog-e'));
  본다('⛔ checked 만 주지 않는다 — 누르고 change 를 알리고 라벨까지 누른다',
    승인고르기글.includes('r.click()')
    && 승인고르기글.includes('new Event("change"')
    && 승인고르기글.includes('label[for=recog-e]'));
  본다('⛔ 미승인·반려 칸을 누르지 않는다',
    !승인고르기글.includes('recog-c') && !승인고르기글.includes('recog-r'));
  본다('🔴 ② 저장을 누른다', 저장누르기글.includes('"저장"'));
  본다('⛔ 저장 단추를 글자로 «정확히» 맞춘다 — 「임시저장」이 섞이지 않게',
    저장누르기글.includes('.trim() === "저장"'));
  본다('🔴 ③ 웹출판은 진짜 마우스로 누를 좌표를 먼저 잰다',
    웹출판자리글.includes('getBoundingClientRect') && 웹출판자리글.includes('웹출판'));
  본다('⛔ 화면에 안 보이는 단추는 고르지 않는다',
    웹출판자리글.includes('offsetWidth'));

  본다('승인 여부는 라디오에서 읽는다',
    승인됐나글.includes('recog-e') && 승인됐나글.includes('recog-c'));
  본다('🔴 노출시간을 함께 읽는다 — 저장이 지우지 않았나를 앞뒤로 잰다',
    승인됐나글.includes('embargo_date') && 승인됐나글.includes('embargo_time'));
  본다('묶음·관련 건수도 함께 읽는다',
    승인됐나글.includes('#bundled-ul') && 승인됐나글.includes('#relation-ul'));
  본다('🔴 N D Z K 가 켜졌나를 읽는다 — 「컬러로 나와야 외부에 전송된거야」',
    포털색읽기글(1).includes('forward-btn') && 포털색읽기글(1).includes('oncheck'));
  본다('포털 줄은 기사번호로 집는다', 포털색읽기글(1516354).includes('1516354'));
  본다('⛔ 삭제를 부르는 곳이 한 군데도 없다',
    !승인고르기글.includes('Del') && !저장누르기글.includes('삭제')
    && !포털색읽기글(1).includes('Del'));

  const 진 = 잰다.filter(([, v]) => !v);
  for (const [이름, v] of 잰다) console.log(`${v ? '✅' : '🔴'} ${이름}`);
  console.log(진.length ? `\n🔴 ${진.length}/${잰다.length} 떨어졌다` : `\n✅ 자체검사 ${잰다.length} 통과`);
  process.exit(진.length ? 1 : 0);
}

if (직접실행인가() && !process.argv.includes('--자체검사')) {
  const 번호들 = process.argv.slice(2).filter((글) => /^[0-9]{6,9}$/.test(글));
  if (!번호들.length) {
    console.error('🔴 승인할 기사번호를 적어라 — node scripts/중부매일-승인한다.mjs 1516354 …');
    process.exit(1);
  }

  /* ⛔ 사장님 2026-11-19 「너무 한번에 올리지마」 — 한 건씩, 사이를 두고 간다 */
  let 안된것 = 0;
  for (const 번호 of 번호들) {
    let 말 = '';
    try { 말 = await 한건승인(번호); } catch (탈) { 말 = '🔴 ' + String(탈.message).slice(0, 90); }
    console.log('■ ' + 번호 + ' — ' + 말);
    if (!말.startsWith('🟢') && !말.startsWith('이미 승인')) 안된것 += 1;
    await new Promise((쉼) => setTimeout(쉼, 5000));
  }

  console.log('■ 포털 (N D Z K) —');
  try { console.log('   ' + (await 포털읽기(번호들))); }
  catch (탈) { console.log('   ⚠ 못 읽었다 — ' + String(탈.message).slice(0, 80)); }

  console.log(안된것 ? '🔴 ' + 안된것 + '건이 아직 승인이 아니다' : '🟢 모두 승인됐다');
  process.exit(안된것 ? 1 : 0);
}
