/**
 * 중부매일-스포츠-등록.mjs — 중부매일 계정이 쓴 **스포츠 기사(e스포츠 제외)를 CMS 에 미승인으로 올린다.**
 *
 * 사장님 2026-11-26 —
 *   「클로드 중부매일 계정이 작성하는 기사 중 스포츠(e스포츠 제외)를 네가 받아서 cms에 올려.
 *    user_id, 기자명 등 정보를 수정해. 다 작성하면 … 상태 메뉴에서 미승인 체크> 저장해놓고
 *    나한테 이메일로 보고해.」 · 「사진과 사진설명, 사진제목까지 다 올려」
 *
 * ⛔ 승인·웹출판·노출시간을 건드리지 않는다. 상태는 언제나 미승인이다.
 * ⛔ 새 기사 화면(mode=input)은 **열 때마다 기사번호를 하나 잡는다.** 한 기사에 한 번만 연다.
 * ⛔ 사진이 다 올라가지 않으면 저장하지 않고 멈춘다.
 *
 *   node scripts/중부매일-스포츠-등록.mjs --기사=docs/자국/…json --첫걸음      새로 열어 채우고 저장
 *   node scripts/중부매일-스포츠-등록.mjs --기사=…json --번호=1516999 --본다     저장된 것을 읽기만
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { 새탭에서, 자리잡기, 재기 } from './lib/cdp.mjs';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 인자 = (이름, 기본 = '') => {
  const 머리 = `--${이름}=`;
  const a = process.argv.find((x) => x.startsWith(머리));
  return a ? a.slice(머리.length) : 기본;
};
const 쉰다 = (밀리) => new Promise((끝) => setTimeout(끝, 밀리));
const 등록주소 = 'https://cms.jbnews.com/news/adminArticleWriteForm.html?mode=input';
export const 수정주소 = (번호) => 'https://cms.jbnews.com/news/adminArticleWriteForm.html?mode=modify&idxno=' + 번호;

const 기사길 = 인자('기사');
if (!기사길) { console.error('⛔ --기사=<json> 을 준다'); process.exit(1); }
const 기사 = JSON.parse(fs.readFileSync(path.resolve(뿌리, 기사길), 'utf8'));

/** 본문 — 첫 문단 앞에 기자 첫머리를 붙인다. 사진은 저장 뒤에 넣는다 */
export function 본문만든다(것) {
  return 것.문단.map((글, i) => '<p>' + (i === 0 ? 것.첫머리 + ' ' : '') + 글 + '</p>').join('\n');
}

const 사진펼치기 = [
  '(() => {',
  '  const 제목 = [...document.querySelectorAll(".accordion-title")].find((e) => (e.textContent || "").trim() === "사진");',
  '  if (!제목) return "사진 칸이 없다";',
  '  const 속 = 제목.closest(".accordion-item").querySelector(".accordion-content");',
  '  if (!(속 && 속.offsetHeight > 0)) 제목.click();',
  '  제목.scrollIntoView({ block: "center" });',
  '  return "열었다";',
  '})()',
].join('\n');
const 떨굴자리 = [
  '(() => {',
  '  const 제목 = [...document.querySelectorAll(".accordion-title")].find((e) => (e.textContent || "").trim() === "사진");',
  '  const 속 = 제목 ? 제목.closest(".accordion-item").querySelector(".accordion-content") : null;',
  '  const 후보 = [...(속 ? 속.querySelectorAll("*") : [])].filter((e) => /마우스로 이미지를 끌어오거나/.test(e.textContent || "")).sort((a, b) => a.innerHTML.length - b.innerHTML.length);',
  '  if (!후보[0]) return "";',
  '  후보[0].scrollIntoView({ block: "center" });',
  '  const 네모 = 후보[0].getBoundingClientRect();',
  '  return JSON.stringify({ x: 네모.left + 네모.width / 2, y: 네모.top + 네모.height / 2 });',
  '})()',
].join('\n');
const 사진수 = 'document.querySelectorAll(".library-photo").length';
const 사진목록 = [
  '(() => JSON.stringify([...document.querySelectorAll(".library-photo")].map((장) => ({',
  '  사진번호: 장.getAttribute("data-idxno") || "", 기사번호: 장.getAttribute("data-article_idxno") || "",',
  '  방: 장.getAttribute("data-subuploaddir") || "", 그림: 장.getAttribute("data-image") || "",',
  '  걸음: 장.getAttribute("data-step") || "", 대표: 장.getAttribute("data-representation") || "",',
  '  설명: ((장.querySelector(".caption") || {}).textContent || "").trim(),',
  '  속글: (장.innerText || "").replace(/\\s+/g, " ").trim().slice(0, 120),',
  '}))))()',
].join('\n');
const 상태읽기 = [
  '(() => {',
  '  const v = (이름) => { const e = document.getElementsByName(이름)[0]; return e ? (e.value || "") : "(없음)"; };',
  '  const 고른 = document.querySelector("input[name=recognition]:checked");',
  '  let 본문 = "";',
  '  try { 본문 = CKEDITOR.instances.FCKeditor1.getData() || ""; } catch (e) { 본문 = "(못 읽음)"; }',
  '  return JSON.stringify({',
  '    주소: location.href, 번호: v("idxno"), mode: v("mode"),',
  '    user_id: v("user_id"), user_name: v("user_name"), user_email: v("user_email"),',
  '    제목: v("title"), 부제: v("subTitle"), 큰섹션: v("sectionCode"), 작은섹션: v("subSectionCode"),',
  '    상태: 고른 ? (고른.id + "=" + 고른.value) : "(고른 것 없음)",',
  '    노출날: v("embargo_date"), 노출시각: v("embargo_time"),',
  '    본문길이: 본문.length, 본문첫머리: 본문.replace(/<[^>]+>/g, " ").replace(/\\s+/g, " ").trim().slice(0, 60),',
  '    본문사진: (본문.match(/<figure/g) || []).length, 본문설명: (본문.match(/<figcaption/g) || []).length,',
  '    키워드: [...document.querySelectorAll("input[name=\'keyword[]\'], .tag-item, .keyword-item")].map((e) => (e.value || e.textContent || "").trim()).filter(Boolean).slice(0, 12),',
  '    키워드칸: v("keyword"),',
  '    사진수: document.querySelectorAll(".library-photo").length,',
  '  });',
  '})()',
].join('\n');

async function 편집기기다린다(붙음) {
  for (let 번 = 0; 번 < 25; 번 += 1) {
    const 떴나 = String(await 재기(붙음, '(() => !!(window.CKEDITOR && CKEDITOR.instances && CKEDITOR.instances.FCKeditor1 && CKEDITOR.instances.FCKeditor1.status === "ready"))()', 15000));
    if (떴나 === 'true') return true;
    await 쉰다(2000);
  }
  return false;
}
function 대화상자받기(붙음) {
  붙음.듣기('Page.javascriptDialogOpening', (일) => {
    console.log('   (알림창) ' + String((일 && 일.message) || '').slice(0, 120));
    붙음.보내기('Page.handleJavaScriptDialog', { accept: true }).catch(() => {});
  });
}

async function 사진올린다(붙음, 파일) {
  const 앞 = Number(await 재기(붙음, 사진수, 15000));
  const 펼침 = String(await 재기(붙음, 사진펼치기, 20000));
  if (펼침 !== '열었다') return 펼침;
  await 쉰다(2500);
  let 좌표 = null;
  try { 좌표 = JSON.parse(String(await 재기(붙음, 떨굴자리, 20000))); } catch { 좌표 = null; }
  if (!좌표) return '떨굴 자리를 못 찾았다';
  const 짐 = { files: [파일], items: [], dragOperationsMask: 1 };
  for (const 유형 of ['dragEnter', 'dragOver', 'drop']) {
    await 붙음.보내기('Input.dispatchDragEvent', { type: 유형, x: 좌표.x, y: 좌표.y, data: 짐 }, 30000);
    await 쉰다(700);
  }
  for (let 번 = 0; 번 < 15; 번 += 1) {
    await 쉰다(2000);
    const 뒤 = Number(await 재기(붙음, 사진수, 15000));
    if (뒤 === 앞 + 1) return '올라갔다';
    if (뒤 > 앞 + 1) return '🔴 한 장보다 많이 늘었다 — ' + 앞 + ' → ' + 뒤;
  }
  return '안 올라갔다';
}

async function 키워드넣는다(붙음, 낱말들) {
  let 좌표 = null;
  try {
    좌표 = JSON.parse(String(await 재기(붙음, [
      '(() => {',
      '  const 칸 = [...document.querySelectorAll("input")].find((e) => /입력 \\(최대/.test(e.placeholder || "") || e.name === "text");',
      '  if (!칸) return "";',
      '  칸.scrollIntoView({ block: "center" });',
      '  const r = 칸.getBoundingClientRect();',
      '  return JSON.stringify({ x: r.left + r.width / 2, y: r.top + r.height / 2 });',
      '})()',
    ].join('\n'), 20000)));
  } catch { 좌표 = null; }
  if (!좌표) return '키워드 칸을 못 찾았다';
  const 자리글 = '(() => { const 칸 = [...document.querySelectorAll("input")].find((e) => /입력 \\(최대/.test(e.placeholder || "") || e.name === "text"); if (!칸) return ""; 칸.scrollIntoView({ block: "center" }); const r = 칸.getBoundingClientRect(); return JSON.stringify({ x: r.left + r.width / 2, y: r.top + r.height / 2 }); })()';
  const 든것글 = '((document.getElementsByName("keyword")[0] || {}).value || "")';
  for (const 낱말 of 낱말들.flatMap((x) => [x, x])) {
    /* 낱말이 하나 들어갈 때마다 입력 칸이 밀린다 — 셋째 낱말이 빠지던 까닭으로 본다. 매번 자리를 다시 읽고,
       이미 들어간 낱말은 건너뛴다(한 낱말을 두 번까지 해 본다) */
    const 지금든 = String(await 재기(붙음, 든것글, 15000)).split(',').map((x) => x.trim());
    if (지금든.includes(낱말)) continue;
    try { 좌표 = JSON.parse(String(await 재기(붙음, 자리글, 20000))); } catch { /* 앞 자리를 그대로 쓴다 */ }
    for (const 유형 of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
      await 붙음.보내기('Input.dispatchMouseEvent', { type: 유형, x: 좌표.x, y: 좌표.y, button: 유형 === 'mouseMoved' ? 'none' : 'left', clickCount: 유형 === 'mouseMoved' ? 0 : 1 });
      await 쉰다(200);
    }
    await 붙음.보내기('Input.insertText', { text: 낱말 });
    await 쉰다(600);
    for (const 유형 of ['rawKeyDown', 'keyUp']) {
      await 붙음.보내기('Input.dispatchKeyEvent', { type: 유형, key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
      await 쉰다(300);
    }
    await 쉰다(900);
  }
  const 끝든 = String(await 재기(붙음, 든것글, 15000)).split(',').map((x) => x.trim()).filter(Boolean);
  const 빠진 = 낱말들.filter((낱) => !끝든.includes(낱));
  return (빠진.length ? '🔴 빠졌다 ' + 빠진.join(', ') + ' · ' : '다 들어갔다 · ') + '키워드 칸: ' + 끝든.join(', ');
}

/* ── 읽기만 ── */
if (process.argv.includes('--본다')) {
  const 번호 = 인자('번호');
  if (!/^[0-9]{6,9}$/.test(번호)) { console.error('⛔ --번호= 를 준다'); process.exit(1); }
  const 결과 = await 새탭에서(수정주소(번호), async (붙음) => {
    대화상자받기(붙음);
    await 자리잡기(붙음, { 최대: 45000 });
    await 편집기기다린다(붙음);
    await 재기(붙음, 사진펼치기, 20000);
    await 쉰다(2500);
    return { 상태: JSON.parse(String(await 재기(붙음, 상태읽기, 25000))), 사진: JSON.parse(String(await 재기(붙음, 사진목록, 25000))) };
  });
  console.log(JSON.stringify(결과, null, 1));
}

/* ── 첫걸음: 새로 열어 사진·글·분류·기자·상태·키워드를 넣고 저장한다 ── */
if (process.argv.includes('--첫걸음')) {
  for (const 장 of 기사.사진) {
    if (!fs.existsSync(path.resolve(뿌리, 장.파일))) { console.error('🔴 사진 파일이 없다 — ' + 장.파일); process.exit(1); }
  }
  const 결과 = await 새탭에서(등록주소, async (붙음) => {
    대화상자받기(붙음);
    await 자리잡기(붙음, { 최대: 45000 });
    let 어디 = '';
    for (let 번 = 0; 번 < 4 && !어디; 번 += 1) {
      try { 어디 = String(await 재기(붙음, 'location.href', 30000)); }
      catch (오류) {
        console.log('   (화면이 답하지 않는다 — 알림창을 닫아 보고 다시 읽는다) ' + String(오류.message).slice(0, 60));
        try { await 붙음.보내기('Page.handleJavaScriptDialog', { accept: false }, 8000); } catch { /* 알림창이 없었다 */ }
      }
    }
    if (!어디) return { 멈춤: '화면이 끝내 답하지 않았다 — 아무것도 넣지 않았다' };
    if (/adminLoginForm/.test(어디)) return { 멈춤: '로그인 화면이다 — ' + 어디 };
    if (!(await 편집기기다린다(붙음))) return { 멈춤: '편집기가 안 떴다' };
    const 잡은번호 = String(await 재기(붙음, '(document.getElementsByName("idxno")[0] || {}).value || ""', 15000));
    console.log('■ 잡은 기사번호 — ' + (잡은번호 || '(화면에 없음)'));

    for (const 장 of 기사.사진) {
      const 올림 = await 사진올린다(붙음, path.resolve(뿌리, 장.파일));
      console.log('■ 사진 — ' + 장.파일 + ' : ' + 올림);
      if (올림 !== '올라갔다') return { 멈춤: '사진을 못 올렸다 — 저장하지 않았다', 잡은번호 };
    }

    const 채움 = String(await 재기(붙음, [
      '(() => {',
      '  const d = document;',
      '  const 넣는다 = (이름, 값) => { const e = d.getElementsByName(이름)[0]; if (!e) return false; e.value = 값; e.dispatchEvent(new Event("input", { bubbles: true })); e.dispatchEvent(new Event("change", { bubbles: true })); return true; };',
      '  const 못넣음 = [];',
      '  if (!넣는다("title", ' + JSON.stringify(기사.제목) + ')) 못넣음.push("title");',
      '  if (!넣는다("subTitle", ' + JSON.stringify(기사.부제) + ')) 못넣음.push("subTitle");',
      '  CKEDITOR.instances.FCKeditor1.setData(' + JSON.stringify(본문만든다(기사)) + ');',
      '  if (!넣는다("user_id", ' + JSON.stringify(기사.기자.user_id) + ')) 못넣음.push("user_id");',
      '  if (!넣는다("user_name", ' + JSON.stringify(기사.기자.user_name) + ')) 못넣음.push("user_name");',
      '  if (!넣는다("user_email", ' + JSON.stringify(기사.기자.user_email) + ')) 못넣음.push("user_email");',
      '  if (!넣는다("sectionCode", ' + JSON.stringify(기사.큰섹션) + ')) 못넣음.push("sectionCode");',
      '  const r = d.querySelector("#recog-c");',
      '  if (r) { r.click(); r.checked = true; r.dispatchEvent(new Event("change", { bubbles: true })); const lb = d.querySelector("label[for=recog-c]"); if (lb) lb.click(); } else 못넣음.push("recog-c");',
      '  return 못넣음.length ? "못 넣은 칸 — " + 못넣음.join(",") : "채웠다";',
      '})()',
    ].join('\n'), 60000));
    console.log('■ 칸 채우기 — ' + 채움);
    if (채움 !== '채웠다') return { 멈춤: 채움 + ' — 저장하지 않았다', 잡은번호 };

    await 쉰다(3500);
    const 작은 = String(await 재기(붙음, [
      '(() => { const e = document.querySelector("#subSectionCode") || document.getElementsByName("subSectionCode")[0];',
      '  if (!e) return "2차 칸이 없다";',
      '  if (![...e.options].some((o) => o.value === ' + JSON.stringify(기사.작은섹션) + ')) return "2차 목록에 없다 — " + [...e.options].map((o) => o.value + ":" + o.textContent.trim()).join(" / ");',
      '  e.value = ' + JSON.stringify(기사.작은섹션) + '; e.dispatchEvent(new Event("change", { bubbles: true })); return "2차 = " + e.value; })()',
    ].join('\n'), 20000));
    console.log('■ 분류 — ' + 작은);
    if (!/^2차 = /.test(작은)) return { 멈춤: 작은 + ' — 저장하지 않았다', 잡은번호 };

    try { console.log('■ 키워드 — ' + (await 키워드넣는다(붙음, 기사.키워드 || []))); }
    catch (오류) { console.log('⚠ 키워드를 못 넣었다 — ' + String(오류.message).slice(0, 80)); }

    /* 🔴🔴 사장님 2026-11-26 「다른 기사를 작성할 때도 입력 시간이 1970년이 아닌 작성 날짜가 되게 꼭 해」
       기사노출날짜·노출시간 칸을 비운 채 올린 기사 두 건(1516931·1516943)이, 뒤에 수정 화면에서
       승인 저장되자 입력 시각이 1970.01.01 09:00 이 됐다. 그래서 처음 저장할 때부터 «작성 시각»을 적어 넣는다.
       ⛔ 지금보다 1분 앞 시각을 넣는다 — 앞날이면 예약이 된다. */
    const 작성때 = new Date(Date.now() - 60 * 1000);
    const 두자 = (n) => String(n).padStart(2, '0');
    const 작성날 = 작성때.getFullYear() + '-' + 두자(작성때.getMonth() + 1) + '-' + 두자(작성때.getDate());
    const 작성시 = 두자(작성때.getHours()) + ':' + 두자(작성때.getMinutes());
    await 재기(붙음, [
      '(() => { const d = document.querySelector("#embargo_date") || document.getElementsByName("embargo_date")[0];',
      '  const t = document.querySelector("#embargo_time") || document.getElementsByName("embargo_time")[0];',
      '  if (!d || !t) return "노출시간 칸이 없다";',
      '  d.value = ' + JSON.stringify(작성날) + '; d.dispatchEvent(new Event("input", { bubbles: true })); d.dispatchEvent(new Event("change", { bubbles: true }));',
      '  t.value = ' + JSON.stringify(작성시) + '; t.dispatchEvent(new Event("input", { bubbles: true })); t.dispatchEvent(new Event("change", { bubbles: true }));',
      '  return "넣었다"; })()',
    ].join('\n'), 20000);
    const 저장전 = JSON.parse(String(await 재기(붙음, 상태읽기, 25000)));
    console.log('■ 저장 전 — ' + JSON.stringify(저장전));
    const 맞나 = 저장전.user_id === 기사.기자.user_id && 저장전.user_name === 기사.기자.user_name
      && 저장전.user_email === 기사.기자.user_email && /^recog-c=/.test(저장전.상태)
      && 저장전.제목 === 기사.제목 && 저장전.큰섹션 === 기사.큰섹션 && 저장전.작은섹션 === 기사.작은섹션
      && 저장전.노출날 === 작성날 && 저장전.노출시각 === 작성시 && 저장전.본문길이 > 500 && 저장전.사진수 === 기사.사진.length;
    if (!맞나) return { 멈춤: '저장 전 확인이 안 맞는다 — 저장하지 않았다', 잡은번호, 저장전 };

    const 누름 = String(await 재기(붙음, [
      '(() => { const b = document.querySelectorAll("button");',
      '  for (let i = 0; i < b.length; i++) if ((b[i].innerText || "").trim() === "저장") { b[i].click(); return "눌렀다"; }',
      '  return "저장 단추를 못 찾았다"; })()',
    ].join('\n'), 20000));
    console.log('■ 저장 — ' + 누름);
    await 쉰다(10000);
    await 자리잡기(붙음, { 최대: 30000 });
    const 뒤주소 = String(await 재기(붙음, 'location.href', 20000));
    console.log('■ 저장 뒤 주소 — ' + 뒤주소);
    return { 잡은번호, 뒤주소 };
  });
  console.log(JSON.stringify(결과, null, 1));
}

/* ── 둘째걸음: 사진제목·사진설명을 넣고, 사진을 본문에 가운데로 넣고, 미승인으로 다시 저장한다 ──
   ⚠ 수정 화면은 열릴 때 상태 칸이 «승인»으로 떠 있다(실제 상태와 무관). 저장 전에 미승인을 다시 누르고 확인한다. */
if (process.argv.includes('--둘째걸음')) {
  const 번호 = 인자('번호');
  if (!/^[0-9]{6,9}$/.test(번호)) { console.error('⛔ --번호= 를 준다'); process.exit(1); }
  const 사진창주소 = (것) => 'https://cms.jbnews.com/news/photoWriteForm.html?mode=modify&idxno=' + encodeURIComponent(것.사진번호)
    + '&article_idxno=' + encodeURIComponent(것.기사번호) + '&subUploadDir=' + encodeURIComponent(것.방)
    + '&image=' + encodeURIComponent(것.그림) + '&step=' + encodeURIComponent(것.걸음) + '&representation=' + encodeURIComponent(것.대표);
  const 설명꼴 = (장) => '▲ ' + 장.설명;

  const 결과 = await 새탭에서(수정주소(번호), async (붙음) => {
    대화상자받기(붙음);
    const 연다 = async () => {
      await 재기(붙음, '(() => { window.onbeforeunload = null; setTimeout(() => location.reload(), 300); return "다시 연다"; })()', 20000);
      await 쉰다(9000);
      await 자리잡기(붙음, { 최대: 45000 });
      if (!(await 편집기기다린다(붙음))) throw new Error('편집기가 안 떴다');
      await 재기(붙음, 사진펼치기, 20000);
      await 쉰다(2500);
    };
    await 자리잡기(붙음, { 최대: 45000 });
    if (!(await 편집기기다린다(붙음))) return { 멈춤: '편집기가 안 떴다' };
    await 재기(붙음, 사진펼치기, 20000);
    await 쉰다(2500);
    let 사진들 = JSON.parse(String(await 재기(붙음, 사진목록, 25000)));
    if (사진들.length !== 기사.사진.length) return { 멈춤: '사진 수가 다르다 — ' + 사진들.length };
    사진들.sort((a, b) => Number(a.걸음) - Number(b.걸음));

    /* ① 사진마다 제목과 설명 */
    for (let i = 0; i < 사진들.length; i += 1) {
      const 것 = 사진들[i];
      const 장 = 기사.사진[i];
      if (것.설명 === 설명꼴(장)) { console.log('■ 사진 ' + (i + 1) + ' — 설명이 이미 적혀 있다'); continue; }
      /* ⛔ 기사 탭을 다른 주소로 옮기지 않는다 — Page.navigate 가 답하지 않고 멈췄다(2026-11-26). 사진 화면은 제 탭으로 연다 */
      const 넣음 = await 새탭에서(사진창주소(것), async (사진탭) => {
      대화상자받기(사진탭);
      await 자리잡기(사진탭, { 최대: 30000 });
      await 쉰다(3000);
      const 답 = String(await 재기(사진탭, [
        '(() => {',
        '  const 칸 = document.querySelector("textarea[name=caption]");',
        '  if (!칸) return "설명 칸이 없다";',
        '  칸.value = ' + JSON.stringify(설명꼴(장)) + ';',
        '  칸.dispatchEvent(new Event("input", { bubbles: true })); 칸.dispatchEvent(new Event("change", { bubbles: true }));',
        '  const 제목 = document.querySelector("form[name=photoWriteForm] input[name=title]") || document.getElementsByName("title")[0];',
        '  if (제목) 제목.value = ' + JSON.stringify(장.제목) + ';',
        '  const 단추 = [...document.querySelectorAll("button,a,input[type=button],input[type=submit]")].filter((e) => ((e.innerText || e.value || "") + "").trim() === "확인");',
        '  if (!단추.length) return "확인 단추가 없다";',
        '  단추[0].click();',
        '  return "넣고 눌렀다" + (제목 ? "" : " (제목 칸은 없다)");',
        '})()',
      ].join('\n'), 25000));
      await 쉰다(8000);
      return 답;
      });
      console.log('■ 사진 ' + (i + 1) + ' 제목·설명 — ' + 넣음);
      if (!/^넣고 눌렀다/.test(넣음)) return { 멈춤: '사진 ' + (i + 1) + ' — ' + 넣음 };
    }

    /* ② 설명이 적혔나 읽는다.
       ⛔ 이 탭을 새로 고치지 않는다 — 나가기 확인창에 걸려 화면이 답하지 않았다(2026-11-26).
       방금 적었으면 여기서 끝내고, 같은 명령을 한 번 더 돌려 새 탭에서 이어 간다 */
    if (사진들.some((것, i) => 것.설명 !== 설명꼴(기사.사진[i]))) return { 다시: '사진 설명을 적었다 — 같은 명령을 한 번 더 돌린다' };
    void 연다;
    사진들 = JSON.parse(String(await 재기(붙음, 사진목록, 25000)));
    사진들.sort((a, b) => Number(a.걸음) - Number(b.걸음));
    for (let i = 0; i < 사진들.length; i += 1) {
      const 맞나 = 사진들[i].설명 === 설명꼴(기사.사진[i]);
      console.log('■ 사진 ' + (i + 1) + ' 설명 되읽기 — ' + (맞나 ? '적혔다' : '🔴 다르다: ' + (사진들[i].설명 || '(빈 칸)')));
      if (!맞나) return { 멈춤: '사진 설명이 안 적혔다 — 본문 저장을 하지 않았다', 사진들 };
    }

    /* ③ 본문에 사진을 가운데로 넣는다 — 사장님이 올리신 1516855 와 같은 figure 꼴 */
    const 넓이들 = JSON.parse(String(await 재기(붙음, '(() => JSON.stringify([...document.querySelectorAll(".library-photo")].map((장) => { const i = 장.querySelector("img"); return { 번호: 장.getAttribute("data-idxno"), 넓이: i ? i.naturalWidth : 0 }; })))()', 20000)));
    const 피겨 = (것, 장) => {
      const 넓 = Math.min(774, Math.max(300, Number((넓이들.find((x) => x.번호 === 것.사진번호) || {}).넓이) || 500));
      const 글 = 설명꼴(장).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
      return '<figure class="photo-layout image photo_' + 것.사진번호 + ' float-center" data-idxno="' + 것.사진번호 + '" data-type="photo" style="max-width: ' + 넓 + 'px;">'
        + '<img alt="' + 글 + '" src="/news/photo/' + 것.방 + 것.그림 + '" width="' + 넓 + '" /><figcaption>' + 글 + '</figcaption></figure>';
    };
    const 조각 = 기사.문단.map((글, i) => '<p>' + (i === 0 ? 기사.첫머리 + ' ' : '') + 글 + '</p>');
    const 끼움 = [];
    조각.forEach((p, i) => {
      기사.사진.forEach((장, k) => { if (장.문단앞 === i) 끼움.push(피겨(사진들[k], 장)); });
      끼움.push(p);
    });
    const 새본문 = 끼움.join('\n');
    const 넣은뒤 = String(await 재기(붙음, [
      '(() => new Promise((끝) => {',
      '  const 판 = CKEDITOR.instances.FCKeditor1;',
      '  판.setData(' + JSON.stringify(새본문) + ', { callback: () => { const 글 = 판.getData() || ""; 끝(JSON.stringify({ 사진: (글.match(/<figure/g) || []).length, 설명: (글.match(/<figcaption/g) || []).length, 길이: 글.length })); } });',
      '}))()',
    ].join('\n'), 40000));
    console.log('■ 본문에 사진 — ' + 넣은뒤);

    /* ④ 빠진 키워드가 있으면 넣는다 */
    const 지금키 = String(await 재기(붙음, '(document.getElementsByName("keyword")[0] || {}).value || ""', 15000));
    const 빠진 = (기사.키워드 || []).filter((낱) => !지금키.split(',').map((x) => x.trim()).includes(낱));
    if (빠진.length) {
      try { console.log('■ 키워드 추가 — ' + (await 키워드넣는다(붙음, 빠진))); } catch (오류) { console.log('⚠ 키워드를 못 넣었다 — ' + String(오류.message).slice(0, 80)); }
    }

    /* ⑤ 미승인을 다시 누르고, 저장 전에 전부 확인한다 */
    await 재기(붙음, [
      '(() => { const d = document; const r = d.querySelector("#recog-c"); if (!r) return "미승인 칸이 없다";',
      '  r.click(); r.checked = true; r.dispatchEvent(new Event("change", { bubbles: true })); const lb = d.querySelector("label[for=recog-c]"); if (lb) lb.click(); return "눌렀다"; })()',
    ].join('\n'), 20000);
    await 쉰다(1500);
    const 저장전 = JSON.parse(String(await 재기(붙음, 상태읽기, 25000)));
    console.log('■ 저장 전 — ' + JSON.stringify(저장전));
    const 맞나 = 저장전.번호 === 번호 && 저장전.user_id === 기사.기자.user_id && 저장전.user_name === 기사.기자.user_name
      && 저장전.user_email === 기사.기자.user_email && /^recog-c=/.test(저장전.상태) && 저장전.제목 === 기사.제목
      && 저장전.큰섹션 === 기사.큰섹션 && 저장전.작은섹션 === 기사.작은섹션
      && 저장전.본문사진 === 기사.사진.length && 저장전.본문설명 === 기사.사진.length && 저장전.사진수 === 기사.사진.length;
    if (!맞나) return { 멈춤: '저장 전 확인이 안 맞는다 — 저장하지 않았다', 저장전 };

    const 누름 = String(await 재기(붙음, [
      '(() => { const b = document.querySelectorAll("button");',
      '  for (let i = 0; i < b.length; i++) if ((b[i].innerText || "").trim() === "저장") { b[i].click(); return "눌렀다"; }',
      '  return "저장 단추를 못 찾았다"; })()',
    ].join('\n'), 20000));
    console.log('■ 저장 — ' + 누름);
    await 쉰다(10000);
    await 자리잡기(붙음, { 최대: 30000 });
    return { 뒤주소: String(await 재기(붙음, 'location.href', 20000)) };
  });
  console.log(JSON.stringify(결과, null, 1));
}

/* ── 셋째걸음: 사진을 CMS 의 «가운데 정렬» 단추로 본문에 넣고 미승인으로 저장한다 ──
   사장님 2026-11-26 「사진은 기사에 넣어」 · 사진설명은 사장님이 직접 입력하신다.
   ⚠ 가운데 정렬 단추는 사진을 편집기 «위젯»으로 넣는다. 한 장을 넣은 직후 다음 장을 넣으면
     고른 채로 남은 앞 장을 덮어쓴다(2026-11-26 실측). 그래서 한 장씩 넣어 CMS 가 만든 태그만
     받아 두고, 마지막에 문단 사이에 끼워 한 번에 적는다.
   ⛔ 이 탭을 다른 주소로 옮기거나 새로 고치지 않는다. */
if (process.argv.includes('--셋째걸음')) {
  const 번호 = 인자('번호');
  if (!/^[0-9]{6,9}$/.test(번호)) { console.error('⛔ --번호= 를 준다'); process.exit(1); }
  const 결과 = await 새탭에서(수정주소(번호), async (붙음) => {
    대화상자받기(붙음);
    await 자리잡기(붙음, { 최대: 45000 });
    if (!(await 편집기기다린다(붙음))) return { 멈춤: '편집기가 안 떴다' };
    await 재기(붙음, 사진펼치기, 20000);
    await 쉰다(2500);
    const 사진들 = JSON.parse(String(await 재기(붙음, 사진목록, 25000))).sort((a, b) => Number(a.걸음) - Number(b.걸음));
    if (사진들.length !== 기사.사진.length) return { 멈춤: '사진 수가 다르다 — ' + 사진들.length };
    const 앞 = JSON.parse(String(await 재기(붙음, 상태읽기, 25000)));
    if (앞.본문길이 < 500 || 앞.user_id !== 기사.기자.user_id) return { 멈춤: '열린 기사가 기대와 다르다', 앞 };
    if (앞.본문사진 > 0) return { 멈춤: '본문에 이미 사진이 있다 — 손대지 않았다', 앞 };

    const 글만 = 본문만든다(기사);
    const 적는다글 = (본문) => '(() => new Promise((끝) => { CKEDITOR.instances.FCKeditor1.setData(' + JSON.stringify(본문) + ', { callback: () => 끝("적었다") }); }))()';
    const 태그들 = [];
    for (let i = 0; i < 사진들.length; i += 1) {
      await 재기(붙음, 적는다글(글만), 40000);
      await 쉰다(1500);
      const 자리글 = String(await 재기(붙음, '(() => { const 장 = document.querySelectorAll(".library-photo")[' + i + ']; if (!장) return ""; 장.scrollIntoView({ block: "center" }); const r = 장.getBoundingClientRect(); return JSON.stringify({ x: r.left + r.width / 2, y: r.top + r.height / 2 }); })()', 20000));
      let 좌표 = null;
      try { 좌표 = JSON.parse(자리글); } catch { 좌표 = null; }
      if (!좌표) return { 멈춤: '사진 ' + (i + 1) + ' 자리를 못 찾았다' };
      await 붙음.보내기('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 좌표.x, y: 좌표.y, button: 'none' });
      await 쉰다(1500);
      const 누름 = String(await 재기(붙음, [
        '(() => { const 장 = document.querySelectorAll(".library-photo")[' + i + '];',
        '  const 모두 = [...장.querySelectorAll("button")];',
        '  const 가운데 = 모두.find((e) => /가운데|중앙|center/i.test((e.getAttribute("title") || "") + (e.getAttribute("data-tp") || "")));',
        '  if (!가운데) return "못 찾았다";',
        '  가운데.click(); return "눌렀다"; })()',
      ].join('\n'), 25000));
      await 쉰다(4000);
      const 태그 = String(await 재기(붙음, [
        '(() => { const 글 = CKEDITOR.instances.FCKeditor1.getData() || "";',
        '  const 파일 = ' + JSON.stringify(사진들[i].그림) + ';',
        '  const 자리 = 글.indexOf(파일); if (자리 < 0) return "";',
        '  const 앞 = 글.lastIndexOf("<figure", 자리); const 뒤 = 글.indexOf("</figure>", 자리);',
        '  if (앞 < 0 || 뒤 < 0) return "";',
        '  return 글.slice(앞, 뒤 + 9); })()',
      ].join('\n'), 20000));
      console.log('■ 사진 ' + (i + 1) + ' 가운데 정렬 — ' + 누름 + ' · ' + (태그 ? 태그.slice(0, 400) : '태그를 못 받았다'));
      if (!태그 && 태그들[0] && 기사.사진[i].넓이) {
        /* 단추가 두 번째부터 반응하지 않을 때 — CMS 가 첫 장에 만든 태그를 그대로 본떠 번호·파일·넓이만 바꾼다 */
        /* ⛔ 파일 이름을 먼저 바꾼다 — 번호부터 바꾸면 파일 이름 속 번호가 같이 바뀌어 없는 파일이 된다 */
        const 본 = 태그들[0].split(사진들[0].그림).join(사진들[i].그림).split(사진들[0].사진번호).join(사진들[i].사진번호)
          .replace(/max-width:\s*[0-9]+px/, 'max-width:' + 기사.사진[i].넓이 + 'px');
        console.log('   첫 장의 태그를 본떠 만든다 — ' + 본.slice(0, 300));
        태그들.push(본);
        continue;
      }
      if (!태그) return { 멈춤: '사진 ' + (i + 1) + ' 태그를 못 받았다 — 저장하지 않았다' };
      태그들.push(태그);
    }

    const 조각 = 기사.문단.map((글, i) => '<p>' + (i === 0 ? 기사.첫머리 + ' ' : '') + 글 + '</p>');
    const 끼움 = [];
    조각.forEach((p, i) => {
      기사.사진.forEach((장, k) => { if (장.문단앞 === i) 끼움.push(태그들[k]); });
      끼움.push(p);
    });
    await 재기(붙음, 적는다글(끼움.join('\n')), 40000);
    await 쉰다(2500);
    const 뼈대 = String(await 재기(붙음, '(() => (CKEDITOR.instances.FCKeditor1.getData() || "").replace(/<p>([^<]{0,14})[^<]*<\\/p>/g, "<p>$1…</p>").split(/\\s+/).join(" ").slice(0, 1800))()', 20000));
    console.log('■ 본문 뼈대 — ' + 뼈대);

    await 재기(붙음, [
      '(() => { const d = document; const r = d.querySelector("#recog-c"); if (!r) return "미승인 칸이 없다";',
      '  r.click(); r.checked = true; r.dispatchEvent(new Event("change", { bubbles: true })); const lb = d.querySelector("label[for=recog-c]"); if (lb) lb.click(); return "눌렀다"; })()',
    ].join('\n'), 20000);
    await 쉰다(1500);
    const 저장전 = JSON.parse(String(await 재기(붙음, 상태읽기, 25000)));
    const 센것 = JSON.parse(String(await 재기(붙음, '(() => { const 글 = CKEDITOR.instances.FCKeditor1.getData() || ""; return JSON.stringify({ 그림: (글.match(/<img/g) || []).length, 문단: (글.match(/<p>/g) || []).length, 다든파일: ' + JSON.stringify(사진들.map((x) => x.그림)) + '.every((f) => 글.includes(f)) }); })()', 15000)));
    console.log('■ 저장 전 — ' + JSON.stringify(센것) + ' · ' + JSON.stringify(저장전));
    const 맞나 = 저장전.번호 === 번호 && 저장전.user_id === 기사.기자.user_id && 저장전.user_name === 기사.기자.user_name
      && 저장전.user_email === 기사.기자.user_email && /^recog-c=/.test(저장전.상태) && 저장전.제목 === 기사.제목
      && 저장전.큰섹션 === 기사.큰섹션 && 저장전.작은섹션 === 기사.작은섹션
      && 센것.그림 === 기사.사진.length && 센것.문단 === 기사.문단.length && 센것.다든파일 === true;
    if (!맞나) return { 멈춤: '저장 전 확인이 안 맞는다 — 저장하지 않았다', 저장전 };

    const 누름 = String(await 재기(붙음, [
      '(() => { const b = document.querySelectorAll("button");',
      '  for (let i = 0; i < b.length; i++) if ((b[i].innerText || "").trim() === "저장") { b[i].click(); return "눌렀다"; }',
      '  return "저장 단추를 못 찾았다"; })()',
    ].join('\n'), 20000));
    console.log('■ 저장 — ' + 누름);
    await 쉰다(10000);
    await 자리잡기(붙음, { 최대: 30000 });
    return { 뒤주소: String(await 재기(붙음, 'location.href', 20000)) };
  });
  console.log(JSON.stringify(결과, null, 1));
}

/* ── 날짜를 바로잡고 승인·웹출판한다 ──
   사장님 2026-11-26 「날짜바꾸고 승인, 웹출판해」 (기사 1516931 의 입력 시각이 1970.01.01 09:00 으로 저장돼 있었다)
   ⛔ 본문·사진·사진설명·기자 정보는 건드리지 않는다. 노출날짜·노출시간과 상태만 바꾼다.
   ⛔ 노출시간은 지금보다 2분 앞으로 넣는다 — 앞날이면 예약이 되어 그 자리에서 나가지 않는다. */
if (process.argv.includes('--날짜고치고승인')) {
  const 번호 = 인자('번호');
  if (!/^[0-9]{6,9}$/.test(번호)) { console.error('⛔ --번호= 를 준다'); process.exit(1); }
  const 두 = (n) => String(n).padStart(2, '0');
  const 때 = new Date(Date.now() - 2 * 60 * 1000);
  const 날 = 때.getFullYear() + '-' + 두(때.getMonth() + 1) + '-' + 두(때.getDate());
  const 시 = 두(때.getHours()) + ':' + 두(때.getMinutes());
  const 결과 = await 새탭에서(수정주소(번호), async (붙음) => {
    대화상자받기(붙음);
    await 자리잡기(붙음, { 최대: 45000 });
    if (!(await 편집기기다린다(붙음))) return { 멈춤: '편집기가 안 떴다' };
    const 앞 = JSON.parse(String(await 재기(붙음, 상태읽기, 25000)));
    console.log('■ 고치기 전 — ' + JSON.stringify(앞));
    if (앞.번호 !== 번호 || ![기사.제목, 기사.새제목].includes(앞.제목)) return { 멈춤: '열린 기사가 다르다', 앞 };
    const 앞본문 = String(await 재기(붙음, 'CKEDITOR.instances.FCKeditor1.getData() || ""', 20000));
    /* 날짜가 이미 성하면(1970 이 아니고 오늘이면) 그 값을 그대로 다시 넣는다 — 입력 시각을 또 옮기지 않는다 */
    const 성한날 = 앞.노출날 === 날 && /^[0-9]{2}:[0-9]{2}$/.test(앞.노출시각);
    const 쓸날 = 성한날 ? 앞.노출날 : 날;
    const 쓸시 = 성한날 ? 앞.노출시각 : 시;

    const 넣음 = String(await 재기(붙음, [
      '(() => {',
      '  const d = document.querySelector("#embargo_date") || document.getElementsByName("embargo_date")[0];',
      '  const t = document.querySelector("#embargo_time") || document.getElementsByName("embargo_time")[0];',
      '  if (!d || !t) return "노출시간 칸이 없다";',
      '  d.value = ' + JSON.stringify(쓸날) + '; d.dispatchEvent(new Event("input", { bubbles: true })); d.dispatchEvent(new Event("change", { bubbles: true }));',
      '  t.value = ' + JSON.stringify(쓸시) + '; t.dispatchEvent(new Event("input", { bubbles: true })); t.dispatchEvent(new Event("change", { bubbles: true }));',
      '  const 새부제 = ' + JSON.stringify(기사.새부제 || '') + ';',
      '  if (새부제) { const 부 = document.getElementsByName("subTitle")[0]; if (!부) return "부제 칸이 없다"; 부.value = 새부제; 부.dispatchEvent(new Event("input", { bubbles: true })); 부.dispatchEvent(new Event("change", { bubbles: true })); }',
      '  const r = document.querySelector("#recog-e"); if (!r) return "승인 칸이 없다";',
      '  r.click(); r.checked = true; r.dispatchEvent(new Event("change", { bubbles: true })); const lb = document.querySelector("label[for=recog-e]"); if (lb) lb.click();',
      /* 사장님 2026-11-26 「제목도 바꿔」 — 기사 자료에 «새제목»이 있으면 제목 칸도 바꾼다 */
      '  const 새제목 = ' + JSON.stringify(기사.새제목 || '') + ';',
      '  if (새제목) { const 칸 = document.getElementsByName("title")[0]; if (!칸) return "제목 칸이 없다"; 칸.value = 새제목; 칸.dispatchEvent(new Event("input", { bubbles: true })); 칸.dispatchEvent(new Event("change", { bubbles: true })); }',
      '  return "넣었다 " + d.value + " " + t.value + (새제목 ? " · 제목 " + document.getElementsByName("title")[0].value : "");',
      '})()',
    ].join('\n'), 20000));
    console.log('■ 날짜·상태 — ' + 넣음);
    if (!/^넣었다/.test(넣음)) return { 멈춤: 넣음 + ' — 저장하지 않았다' };
    /* 사장님 2026-11-26 — 날씨 키워드 일곱 개 「바로 해. 왜 미루나」. 기사 자료에 «추가키워드»가 있으면 빠진 것을 넣는다 */
    if ((기사.추가키워드 || []).length) {
      const 키결과 = await 키워드넣는다(붙음, 기사.추가키워드);
      console.log('■ 키워드 — ' + 키결과);
      if (/빠졌다/.test(키결과)) return { 멈춤: '키워드가 다 들어가지 않았다 — 저장하지 않았다' };
    }
    await 쉰다(1500);
    const 저장전 = JSON.parse(String(await 재기(붙음, 상태읽기, 25000)));
    const 뒤본문 = String(await 재기(붙음, 'CKEDITOR.instances.FCKeditor1.getData() || ""', 20000));
    console.log('■ 저장 전 — ' + JSON.stringify(저장전));
    const 맞나 = 저장전.노출날 === 쓸날 && 저장전.노출시각 === 쓸시 && /^recog-e=/.test(저장전.상태)
      && (!기사.새제목 || 저장전.제목 === 기사.새제목) && (!기사.새부제 || 저장전.부제 === 기사.새부제)
      && 저장전.user_id === 기사.기자.user_id && 저장전.user_name === 기사.기자.user_name && 저장전.user_email === 기사.기자.user_email
      && 저장전.본문사진 === 앞.본문사진 && 저장전.본문설명 === 앞.본문설명 && 뒤본문 === 앞본문 && 앞본문.length > 500;
    if (!맞나) return { 멈춤: '저장 전 확인이 안 맞는다 — 저장하지 않았다', 저장전 };

    const 누름 = String(await 재기(붙음, [
      '(() => { const b = document.querySelectorAll("button");',
      '  for (let i = 0; i < b.length; i++) if ((b[i].innerText || "").trim() === "저장") { b[i].click(); return "눌렀다"; }',
      '  return "저장 단추를 못 찾았다"; })()',
    ].join('\n'), 20000));
    console.log('■ 저장 — ' + 누름);
    await 쉰다(10000);
    await 자리잡기(붙음, { 최대: 30000 });
    const 뒤주소 = String(await 재기(붙음, 'location.href', 20000));
    console.log('■ 저장 뒤 주소 — ' + 뒤주소);
    if (!/articleView/.test(뒤주소)) return { 멈춤: '저장 뒤 기사 화면으로 가지 않았다 — 웹출판을 누르지 않았다', 뒤주소 };

    /* 웹출판 — 진짜 마우스로 누른다 */
    const 자리글 = String(await 재기(붙음, [
      '(() => { const 후보 = [...document.querySelectorAll("button,a")].filter((e) => /웹출판/.test((e.innerText || "") + "") && (e.offsetWidth || e.offsetHeight));',
      '  if (!후보.length) return ""; const r = 후보[0].getBoundingClientRect();',
      '  return JSON.stringify({ x: r.left + r.width / 2, y: r.top + r.height / 2, 글: (후보[0].innerText || "").trim() }); })()',
    ].join('\n'), 20000));
    let 좌표 = null;
    try { 좌표 = JSON.parse(자리글); } catch { 좌표 = null; }
    if (!좌표) return { 멈춤: '웹출판 단추를 못 찾았다 — 저장(승인)까지만 됐다', 뒤주소 };
    for (const 유형 of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
      await 붙음.보내기('Input.dispatchMouseEvent', { type: 유형, x: 좌표.x, y: 좌표.y, button: 유형 === 'mouseMoved' ? 'none' : 'left', clickCount: 유형 === 'mouseMoved' ? 0 : 1 });
      await 쉰다(300);
    }
    await 쉰다(8000);
    console.log('■ 웹출판 — 눌렀다 (' + 좌표.글 + ')');
    return { 뒤주소, 넣은날: 날, 넣은시각: 시 };
  });
  console.log(JSON.stringify(결과, null, 1));
}

/* ── 사진넣기: 이미 저장된 미승인 기사에 사진 한 장을 올려 본문 맨 위에 가운데로 넣고, 사진 밑 칸에 설명을 적는다 ──
   사장님 2026-11-26 「사진 박스에서 사진 바로 밑을 클릭하면 사진설명 넣을 수 있다. 앞으로 그렇게 해」
   ⛔ 설명은 받은 글 그대로 넣는다. 상태는 미승인으로 둔다. 노출날짜가 바뀌면 저장하지 않는다. */
if (process.argv.includes('--사진넣기')) {
  const 번호 = 인자('번호');
  const 파일 = 인자('파일');
  const 설명길 = 인자('설명글');
  if (!/^[0-9]{6,9}$/.test(번호) || !파일 || !설명길) { console.error('⛔ --번호= --파일= --설명글=<글 파일> 을 준다'); process.exit(1); }
  const 설명 = fs.readFileSync(path.resolve(뿌리, 설명길), 'utf8').trim();
  const 파일길 = path.resolve(뿌리, 파일);
  if (!fs.existsSync(파일길) || !설명) { console.error('🔴 사진 파일이나 설명이 없다'); process.exit(1); }
  const 결과 = await 새탭에서(수정주소(번호), async (붙음) => {
    대화상자받기(붙음);
    await 자리잡기(붙음, { 최대: 45000 });
    if (!(await 편집기기다린다(붙음))) return { 멈춤: '편집기가 안 떴다' };
    const 앞 = JSON.parse(String(await 재기(붙음, 상태읽기, 25000)));
    console.log('■ 넣기 전 — ' + JSON.stringify(앞));
    if (앞.번호 !== 번호 || 앞.제목 !== 기사.제목) return { 멈춤: '열린 기사가 다르다', 앞 };
    /* 수정 화면에서 올린 사진은 기사를 저장하지 않아도 사진 칸에 남는다(2026-11-26 실측). 한 장이 이미 있으면 그것을 쓴다 */
    if (앞.사진수 > 1 || 앞.본문사진 !== 0) return { 멈춤: '이미 사진이 있다 — 손대지 않았다', 앞 };
    if (!/^20[0-9]{2}-/.test(앞.노출날) || 앞.노출날.startsWith('1970')) return { 멈춤: '노출날짜가 이상하다 — 손대지 않았다', 앞 };
    const 앞본문 = String(await 재기(붙음, 'CKEDITOR.instances.FCKeditor1.getData() || ""', 20000));

    const 올림 = 앞.사진수 === 1 ? '올라갔다' : await 사진올린다(붙음, 파일길);
    console.log('■ 사진 올리기 — ' + (앞.사진수 === 1 ? '앞서 올린 한 장을 쓴다' : 올림));
    if (앞.사진수 === 1) { await 재기(붙음, 사진펼치기, 20000); await 쉰다(2500); }
    if (올림 !== '올라갔다') return { 멈춤: '사진을 못 올렸다 — 저장하지 않았다' };
    await 쉰다(2000);
    const 사진들 = JSON.parse(String(await 재기(붙음, 사진목록, 25000)));
    if (사진들.length !== 1) return { 멈춤: '사진 수가 하나가 아니다 — ' + 사진들.length };
    const 것 = 사진들[0];

    /* 본문을 글만 있는 처음 상태로 되돌린 뒤(떨굴 때 끼어든 그림을 지운다) 가운데 정렬 단추를 누른다 */
    const 적는다글 = (본문) => '(() => new Promise((끝) => { CKEDITOR.instances.FCKeditor1.setData(' + JSON.stringify(본문) + ', { callback: () => 끝("적었다") }); }))()';
    await 재기(붙음, 적는다글(앞본문), 40000);
    await 쉰다(1500);
    const 자리글 = String(await 재기(붙음, '(() => { const 장 = document.querySelector(".library-photo"); if (!장) return ""; 장.scrollIntoView({ block: "center" }); const r = 장.getBoundingClientRect(); return JSON.stringify({ x: r.left + r.width / 2, y: r.top + r.height / 2 }); })()', 20000));
    let 좌표 = null;
    try { 좌표 = JSON.parse(자리글); } catch { 좌표 = null; }
    if (좌표) {
      await 붙음.보내기('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 좌표.x, y: 좌표.y, button: 'none' });
      await 쉰다(1500);
    }
    /* 본문을 다시 적은 뒤에는 편집기에 커서가 없어 단추가 넣을 자리를 못 찾는다 — 맨 앞에 커서를 둔다 */
    await 재기(붙음, '(() => { const 판 = CKEDITOR.instances.FCKeditor1; 판.focus(); const r = 판.createRange(); r.moveToElementEditStart(판.editable()); 판.getSelection().selectRanges([r]); return "커서"; })()', 20000);
    await 쉰다(800);
    const 누름 = String(await 재기(붙음, [
      '(() => { const 장 = document.querySelector(".library-photo"); if (!장) return "사진이 없다";',
      '  const 가운데 = [...장.querySelectorAll("button")].find((e) => /가운데|중앙|center/i.test((e.getAttribute("title") || "") + (e.getAttribute("data-tp") || "")));',
      '  if (!가운데) return "못 찾았다"; 가운데.click(); return "눌렀다"; })()',
    ].join('\n'), 25000));
    await 쉰다(4000);
    const 태그 = String(await 재기(붙음, [
      '(() => { const 글 = CKEDITOR.instances.FCKeditor1.getData() || ""; const 자리 = 글.indexOf(' + JSON.stringify(것.그림) + '); if (자리 < 0) return "";',
      '  const 앞 = 글.lastIndexOf("<figure", 자리); const 뒤 = 글.indexOf("</figure>", 자리); if (앞 < 0 || 뒤 < 0) return ""; return 글.slice(앞, 뒤 + 9); })()',
    ].join('\n'), 20000));
    console.log('■ 가운데 정렬 — ' + 누름 + ' · ' + (태그 ? 태그.slice(0, 330) : '태그를 못 받았다'));
    if (!태그 || !/<figcaption><\/figcaption>/.test(태그)) return { 멈춤: '사진 태그를 못 받았다 — 저장하지 않았다' };

    const 글자 = 설명.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const 새태그 = 태그.replace('<figcaption></figcaption>', '<figcaption>' + 글자 + '</figcaption>')
      .replace('alt=""', 'alt="' + 글자.replace(/"/g, '&quot;') + '"');
    await 재기(붙음, 적는다글(새태그 + '\n' + 앞본문), 40000);
    await 쉰다(2500);

    await 재기(붙음, [
      '(() => { const d = document; const r = d.querySelector("#recog-c"); if (!r) return "미승인 칸이 없다";',
      '  r.click(); r.checked = true; r.dispatchEvent(new Event("change", { bubbles: true })); const lb = d.querySelector("label[for=recog-c]"); if (lb) lb.click(); return "눌렀다"; })()',
    ].join('\n'), 20000);
    await 쉰다(1500);
    const 저장전 = JSON.parse(String(await 재기(붙음, 상태읽기, 25000)));
    const 센것 = JSON.parse(String(await 재기(붙음, '(() => { const 글 = CKEDITOR.instances.FCKeditor1.getData() || ""; const m = 글.match(/<figcaption>([^<]*)<\\/figcaption>/); return JSON.stringify({ 그림: (글.match(/<img/g) || []).length, 문단: (글.match(/<p>/g) || []).length, 설명: m ? m[1] : "" }); })()', 15000)));
    console.log('■ 저장 전 — ' + JSON.stringify(센것) + ' · ' + JSON.stringify(저장전));
    const 맞나 = 저장전.번호 === 번호 && /^recog-c=/.test(저장전.상태) && 저장전.user_id === 앞.user_id && 저장전.user_name === 앞.user_name
      && 저장전.노출날 === 앞.노출날 && 저장전.노출시각 === 앞.노출시각 && 저장전.큰섹션 === 앞.큰섹션 && 저장전.작은섹션 === 앞.작은섹션
      && 센것.그림 === 1 && 센것.문단 === 기사.문단.length && 센것.설명.replace(/&amp;/g, '&') === 설명;
    if (!맞나) return { 멈춤: '저장 전 확인이 안 맞는다 — 저장하지 않았다', 저장전 };

    const 저장누름 = String(await 재기(붙음, [
      '(() => { const b = document.querySelectorAll("button");',
      '  for (let i = 0; i < b.length; i++) if ((b[i].innerText || "").trim() === "저장") { b[i].click(); return "눌렀다"; }',
      '  return "저장 단추를 못 찾았다"; })()',
    ].join('\n'), 20000));
    console.log('■ 저장 — ' + 저장누름);
    let 뒤주소 = '';
    for (let 번 = 0; 번 < 12 && !/articleView/.test(뒤주소); 번 += 1) {
      await 쉰다(2500);
      try { 뒤주소 = String(await 재기(붙음, 'location.href', 6000)); } catch { 뒤주소 = ''; }
    }
    return { 뒤주소 };
  });
  console.log(JSON.stringify(결과, null, 1));
}

/* ── 키워드넣기: 이미 있는 기사에 빠진 키워드만 넣고 저장한다 ──
   사장님 2026-11-26 「추천키워드(해시태크) 내일날씨 청주날씨 대전날씨 세종날씨 천안날씨 충주날씨 오늘날씨」 「바로 해. 왜 미루나」
   ⛔ 키워드 말고는 아무것도 바꾸지 않는다. 상태는 지금 저장돼 있는 그대로 둔다(승인된 기사면 승인, 미승인이면 미승인).
   ⛔ 웹출판을 누르지 않는다. 노출날짜가 1970 이면 손대지 않는다. */
if (process.argv.includes('--키워드넣기')) {
  const 번호 = 인자('번호');
  const 지금상태 = 인자('지금상태');   /* 승인 | 미승인 — 공개 화면으로 확인한 값을 사람이 적어 준다 */
  if (!/^[0-9]{6,9}$/.test(번호) || !['승인', '미승인'].includes(지금상태)) { console.error('⛔ --번호= --지금상태=승인|미승인 을 준다'); process.exit(1); }
  const 넣을것 = 기사.추가키워드 || [];
  if (!넣을것.length) { console.error('⛔ 기사 자료에 추가키워드가 없다'); process.exit(1); }
  const 칸이름 = 지금상태 === '승인' ? 'recog-e' : 'recog-c';
  const 결과 = await 새탭에서(수정주소(번호), async (붙음) => {
    대화상자받기(붙음);
    await 자리잡기(붙음, { 최대: 45000 });
    if (!(await 편집기기다린다(붙음))) return { 멈춤: '편집기가 안 떴다' };
    const 앞 = JSON.parse(String(await 재기(붙음, 상태읽기, 25000)));
    console.log('■ 넣기 전 — 키워드 칸: ' + 앞.키워드칸 + ' · 노출 ' + 앞.노출날 + ' ' + 앞.노출시각 + ' · ' + 앞.제목);
    if (앞.번호 !== 번호 || ![기사.제목, 기사.새제목].includes(앞.제목)) return { 멈춤: '열린 기사가 다르다', 앞 };
    if (!/^20[0-9]{2}-/.test(앞.노출날) || 앞.노출날.startsWith('1970')) return { 멈춤: '노출날짜가 이상하다 — 손대지 않았다', 앞 };
    const 앞본문 = String(await 재기(붙음, 'CKEDITOR.instances.FCKeditor1.getData() || ""', 20000));

    const 키결과 = await 키워드넣는다(붙음, 넣을것);
    console.log('■ 키워드 — ' + 키결과);
    if (/빠졌다/.test(키결과)) return { 멈춤: '키워드가 다 들어가지 않았다 — 저장하지 않았다' };

    /* 상태 칸은 열릴 때 «승인»으로 떠 있다. 지금 저장돼 있는 상태와 같은 칸을 눌러 그대로 둔다. 날짜도 읽은 값을 그대로 다시 적는다 */
    await 재기(붙음, [
      '(() => { const d = document; const r = d.querySelector("#' + 칸이름 + '"); if (!r) return "상태 칸이 없다";',
      '  r.click(); r.checked = true; r.dispatchEvent(new Event("change", { bubbles: true })); const lb = d.querySelector("label[for=' + 칸이름 + ']"); if (lb) lb.click();',
      '  const 날 = d.querySelector("#embargo_date"); const 시 = d.querySelector("#embargo_time");',
      '  if (날 && 시) { 날.value = ' + JSON.stringify(앞.노출날) + '; 날.dispatchEvent(new Event("change", { bubbles: true })); 시.value = ' + JSON.stringify(앞.노출시각) + '; 시.dispatchEvent(new Event("change", { bubbles: true })); }',
      '  return "그대로 두었다"; })()',
    ].join('\n'), 20000);
    await 쉰다(1500);
    const 저장전 = JSON.parse(String(await 재기(붙음, 상태읽기, 25000)));
    const 뒤본문 = String(await 재기(붙음, 'CKEDITOR.instances.FCKeditor1.getData() || ""', 20000));
    const 든 = 저장전.키워드칸.split(',').map((x) => x.trim());
    const 맞나 = 저장전.번호 === 번호 && 저장전.상태.startsWith(칸이름 + '=') && 저장전.노출날 === 앞.노출날 && 저장전.노출시각 === 앞.노출시각
      && 저장전.제목 === 앞.제목 && 저장전.부제 === 앞.부제 && 저장전.user_id === 앞.user_id && 저장전.큰섹션 === 앞.큰섹션 && 저장전.작은섹션 === 앞.작은섹션
      && 뒤본문 === 앞본문 && 넣을것.every((낱) => 든.includes(낱));
    console.log('■ 저장 전 — 키워드 칸: ' + 저장전.키워드칸 + ' · 상태 ' + 저장전.상태 + ' · 노출 ' + 저장전.노출날 + ' ' + 저장전.노출시각);
    if (!맞나) return { 멈춤: '저장 전 확인이 안 맞는다 — 저장하지 않았다', 저장전 };

    const 누름 = String(await 재기(붙음, [
      '(() => { const b = document.querySelectorAll("button");',
      '  for (let i = 0; i < b.length; i++) if ((b[i].innerText || "").trim() === "저장") { b[i].click(); return "눌렀다"; }',
      '  return "저장 단추를 못 찾았다"; })()',
    ].join('\n'), 20000));
    console.log('■ 저장 — ' + 누름);
    let 뒤주소 = '';
    for (let 번 = 0; 번 < 12 && !/articleView/.test(뒤주소); 번 += 1) {
      await 쉰다(2500);
      try { await 붙음.보내기('Page.handleJavaScriptDialog', { accept: true }, 4000); } catch { /* 창이 없다 */ }
      try { 뒤주소 = String(await 재기(붙음, 'location.href', 6000)); } catch { 뒤주소 = ''; }
    }
    return { 뒤주소 };
  });
  console.log(JSON.stringify(결과, null, 1));
}
