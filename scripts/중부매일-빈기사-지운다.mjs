/**
 * 중부매일-빈기사-지운다.mjs — **아무것도 안 든 임시 기사**만 지운다.
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔴🔴 왜 이런 것이 생기나 — CMS 의 새 기사 서식(`mode=input`)은 **열 때마다 기사번호를
 *   하나 잡는다.** 저장하지 않아도 빈 기사가 목록에 남는다. 화면 구조를 알아보느라 서식을
 *   몇 번 열었더니 넉 장이 생겼다(2026-11-19).
 * 🔴🔴 사장님 2026-11-19 — 「**당연히 지워**」
 *
 * ── ⛔ 이 자가 스스로에게 거는 자물쇠 ────────────────────────
 *   사장님 — 「**삭제나 수정은 네 맘대로 하지마**」 · 「자꾸 수정하고 삭제하면 네이버한테 경고 받아」
 *   2026-11-19 에 **띠별만 지우라 하신 것을 별자리까지 지워** 기사를 잃었다. 그래서 —
 *   ① 지울 번호를 **인자로 받는다.** 스스로 고르지 않는다
 *   ② 지우기 전에 **한 장씩 열어** 제목·부제·본문·사진이 **모두 비었나**를 본다
 *   ③ 한 장이라도 알맹이가 있으면 **한 장도 안 지우고 멈춘다**
 *   ④ 목록에서 체크한 뒤 **켜진 체크가 지울 번호와 글자까지 같은가**를 다시 센다
 *   ⑤ 그래야 「선택삭제」를 누른다. 끝나고 **정말 사라졌나**를 되읽는다
 *
 *   node scripts/중부매일-빈기사-지운다.mjs 1516349 1516350 --정말지운다
 *   node scripts/중부매일-빈기사-지운다.mjs 1516349            (보기만 한다)
 *   node scripts/중부매일-빈기사-지운다.mjs --자체검사
 */
import { 새탭에서, 자리잡기, 재기 } from './lib/cdp.mjs';

export const 목록화면 = 'https://cms.jbnews.com/news/adminArticleIntegrationRecognition.html?sc_area=RW';
export const 삭제단추 = '.allDel-btn';
export const 서식주소 = (번호) => 'https://cms.jbnews.com/news/adminArticleWriteForm.html?mode=modify&idxno=' + 번호;

/** 기사 속을 읽는다 — 지울지 말지는 이 값으로만 정한다 */
export const 속읽기글 = [
  '(() => {',
  '  const v = (이름) => { const e = document.getElementsByName(이름)[0]; return e ? (e.value || "") : ""; };',
  '  let 본문 = null;',
  '  try { if (window.CKEDITOR && CKEDITOR.instances.FCKeditor1) 본문 = CKEDITOR.instances.FCKeditor1.getData() || ""; } catch (e) { 본문 = null; }',
  '  return JSON.stringify({',
  '    읽었나: (본문 !== null),',
  '    제목: v("title"), 부제: v("subTitle"),',
  '    본문길이: (본문 === null ? -1 : 본문.length),',
  '    사진: document.querySelectorAll(".library-photo").length,',
  '    묶음: document.querySelectorAll("#bundled-ul li").length,',
  '    관련: document.querySelectorAll("#relation-ul li").length,',
  '  });',
  '})()',
].join('\n');

/**
 * 🔴 **빈 기사인가.** 하나라도 알맹이가 있으면 false.
 * ⛔ 편집기를 못 읽었으면(읽었나 === false) **빈 것으로 치지 않는다.**
 *   「못 쟀다」를 「없다」로 읽지 않는다 — 그 한 줄이 기사를 잃고 얻은 것이다.
 */
export function 비었나(속) {
  if (!속 || 속.읽었나 !== true) return false;
  if (String(속.제목 || '').trim()) return false;
  if (String(속.부제 || '').trim()) return false;
  if (!(속.본문길이 === 0)) return false;
  if (속.사진 !== 0 || 속.묶음 !== 0 || 속.관련 !== 0) return false;
  return true;
}

/** 지울 번호만 체크한다 */
export function 체크켜기글(번호들) {
  return [
    '(() => {',
    '  const 지울것 = ' + JSON.stringify((번호들 || []).map(String)) + ';',
    '  const 못찾음 = [];',
    '  for (const 번호 of 지울것) {',
    '    const c = document.getElementById("chkbox_" + 번호);',
    '    if (!c) { 못찾음.push(번호); continue; }',
    '    if (!c.checked) c.click();',
    '  }',
    '  const 켜진것 = [...document.querySelectorAll("input[type=checkbox]")]',
    '    .filter((e) => e.checked && e.id && e.id.indexOf("chkbox_") === 0)',
    '    .map((e) => String(e.value));',
    '  return JSON.stringify({ 못찾음, 켜진것 });',
    '})()',
  ].join('\n');
}

/** 🔴 「선택삭제」 — 이 자에서 단 한 군데, 지우는 자리다 */
export const 삭제누르기글 = [
  '(() => {',
  '  const b = document.querySelector(' + JSON.stringify(삭제단추) + ');',
  '  if (!b) return "선택삭제 단추가 없다";',
  '  b.click();',
  '  return "눌렀다";',
  '})()',
].join('\n');

/** 목록에 아직 남아 있나 */
export function 남았나글(번호들) {
  return [
    '(() => {',
    '  const 볼것 = ' + JSON.stringify((번호들 || []).map(String)) + ';',
    '  const 남은것 = 볼것.filter((번호) => !!document.getElementById("chkbox_" + 번호));',
    '  return JSON.stringify(남은것);',
    '})()',
  ].join('\n');
}

const 쉰다 = (밀리) => new Promise((끝) => setTimeout(끝, 밀리));
function 대화상자받기(붙음) {
  붙음.듣기('Page.javascriptDialogOpening', () => {
    붙음.보내기('Page.handleJavaScriptDialog', { accept: true }).catch(() => {});
  });
}

/** 한 장을 열어 속을 읽는다 */
export async function 속보기(번호) {
  return 새탭에서(서식주소(번호), async (붙음) => {
    대화상자받기(붙음);
    await 자리잡기(붙음, { 최대: 45000 });
    await 쉰다(4000);
    try { return JSON.parse(String(await 재기(붙음, 속읽기글, 25000))); } catch { return null; }
  });
}

/* ── 자체검사 ──────────────────────────────────────────────── */
function 직접실행인가() {
  return (process.argv[1] || '').includes('중부매일-빈기사-지운다');
}

if (직접실행인가() && process.argv.includes('--자체검사')) {
  const 잰다 = [];
  const 본다 = (이름, v) => 잰다.push([이름, !!v]);
  const 빈것 = { 읽었나: true, 제목: '', 부제: '', 본문길이: 0, 사진: 0, 묶음: 0, 관련: 0 };

  본다('아무것도 없으면 빈 기사다', 비었나(빈것));
  본다('🔴 제목이 있으면 안 지운다', !비었나({ ...빈것, 제목: '[오늘의 운세] 11월 27일' }));
  본다('🔴 부제가 있으면 안 지운다', !비었나({ ...빈것, 부제: '음력 10월 19일' }));
  본다('🔴 본문이 있으면 안 지운다', !비었나({ ...빈것, 본문길이: 1 }));
  본다('🔴 사진이 있으면 안 지운다', !비었나({ ...빈것, 사진: 1 }));
  본다('🔴 묶음·관련이 붙어 있으면 안 지운다',
    !비었나({ ...빈것, 묶음: 1 }) && !비었나({ ...빈것, 관련: 1 }));
  본다('🔴 공백만 든 제목도 알맹이로 보지 않는다 — 그래도 지우지 않는다',
    !비었나({ ...빈것, 제목: '제목' }));
  본다('🔴🔴 못 읽었으면 «빈 것으로 치지 않는다»',
    !비었나({ ...빈것, 읽었나: false }) && !비었나(null) && !비었나({}));
  본다('⛔ 본문을 못 재면(-1) 안 지운다', !비었나({ ...빈것, 본문길이: -1 }));

  본다('체크 글에 지울 번호가 담긴다', 체크켜기글(['1516349']).includes('"1516349"'));
  본다('🔴 켜진 체크를 다시 읽어 돌려준다', 체크켜기글(['1']).includes('켜진것'));
  본다('⛔ 전체선택(chkall)을 건드리지 않는다', !체크켜기글(['1']).includes('chkall'));
  본다('남았나는 체크칸이 있나로 센다', 남았나글(['1']).includes('chkbox_'));
  본다('🔴 지우는 자리는 이 파일에 한 군데다',
    삭제누르기글.includes('allDel-btn') && !체크켜기글(['1']).includes('allDel')
    && !속읽기글.includes('allDel') && !남았나글(['1']).includes('allDel'));

  const 진 = 잰다.filter(([, v]) => !v);
  for (const [이름, v] of 잰다) console.log(`${v ? '✅' : '🔴'} ${이름}`);
  console.log(진.length ? `\n🔴 ${진.length}/${잰다.length} 떨어졌다` : `\n✅ 자체검사 ${잰다.length} 통과`);
  process.exit(진.length ? 1 : 0);
}

/* ── 돌린다 ────────────────────────────────────────────────── */
if (직접실행인가() && !process.argv.includes('--자체검사')) {
  const 번호들 = process.argv.slice(2).filter((글) => /^[0-9]{6,9}$/.test(글));
  const 정말 = process.argv.includes('--정말지운다');
  if (!번호들.length) {
    console.error('🔴 지울 기사번호를 적어라 — node scripts/중부매일-빈기사-지운다.mjs 1516349 …');
    process.exit(1);
  }

  /* ② 한 장씩 열어 본다 */
  console.log('■ 지우기 전에 한 장씩 본다 —');
  const 알맹이있는것 = [];
  for (const 번호 of 번호들) {
    const 속 = await 속보기(번호);
    const 빔 = 비었나(속);
    console.log('   ' + 번호 + ' ' + (빔 ? '비었다' : '🔴 알맹이가 있다') + ' ' + JSON.stringify(속));
    if (!빔) 알맹이있는것.push(번호);
  }

  /* ③ 한 장이라도 알맹이가 있으면 한 장도 안 지운다 */
  if (알맹이있는것.length) {
    console.error('🔴 ' + 알맹이있는것.join(', ') + ' 에 알맹이가 있다. **한 장도 지우지 않는다**');
    process.exit(1);
  }
  console.log('✔ ' + 번호들.length + '장이 모두 비었다');
  if (!정말) { console.log('■ --정말지운다 를 주지 않았다. 보기만 하고 끝낸다'); process.exit(0); }

  const 끝값 = await 새탭에서(목록화면, async (붙음) => {
    대화상자받기(붙음);
    await 자리잡기(붙음, { 최대: 45000 });
    await 쉰다(3000);

    let 켬 = { 못찾음: [], 켜진것: [] };
    try { 켬 = JSON.parse(String(await 재기(붙음, 체크켜기글(번호들), 25000))); } catch { 켬 = null; }
    if (!켬) { console.error('🔴 체크를 못 읽었다. 멈춘다'); return 1; }
    if (켬.못찾음.length) {
      console.error('🔴 목록에 없다 — ' + 켬.못찾음.join(',') + '. 멈춘다');
      return 1;
    }

    /* ④ 켜진 것이 지울 것과 «글자까지» 같은가 */
    const 켠것 = 켬.켜진것.slice().sort().join(',');
    const 지울것 = 번호들.slice().sort().join(',');
    if (켠것 !== 지울것) {
      console.error('🔴 체크가 지울 번호와 다르다. 멈춘다');
      console.error('   켜진 것 — ' + 켠것);
      console.error('   지울 것 — ' + 지울것);
      return 1;
    }
    console.log('✔ 체크 ' + 켬.켜진것.length + '개가 지울 번호와 꼭 같다');

    /* ⑤ 그래야 누른다 */
    console.log('■ 선택삭제 — ' + String(await 재기(붙음, 삭제누르기글, 25000)));
    await 쉰다(8000);
    await 자리잡기(붙음, { 최대: 30000 });

    await 붙음.보내기('Page.navigate', { url: 목록화면 });
    await 자리잡기(붙음, { 최대: 45000 });
    await 쉰다(3000);
    let 남은 = [];
    try { 남은 = JSON.parse(String(await 재기(붙음, 남았나글(번호들), 25000))); } catch { 남은 = null; }
    if (남은 === null) { console.log('⚠ 되읽기를 못 했다 — 목록을 눈으로 봐야 한다'); return 1; }
    if (남은.length) { console.log('🔴 아직 남아 있다 — ' + 남은.join(',')); return 1; }
    console.log('🟢 ' + 번호들.length + '장을 지웠다 — ' + 번호들.join(', '));
    return 0;
  });
  process.exit(끝값);
}
