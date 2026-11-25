/**
 * 중부매일-기사상태-읽는다.mjs — 기사 번호를 주면 **그 기사의 지금 상태**를 읽는다.
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔴 [2026-11-25] 미승인 운세 100건에 예약을 걸기 «전에», 그 기사가 어느 해 것인지
 *   노출시간이 들어 있는지를 먼저 본다. ⛔ 해(年)를 짐작해서 넣으면 기사가 엉뚱한
 *   날에 나간다. 제목에는 해가 없다.
 *
 * ⛔ 읽기만 한다. 승인도 저장도 하지 않는다.
 *
 *   node scripts/중부매일-기사상태-읽는다.mjs 1497885 1504756
 *   node scripts/중부매일-기사상태-읽는다.mjs --자가시험
 */
import { 새탭에서, 자리잡기, 재기 } from './lib/cdp.mjs';

export const 서식주소 = (번호) => 'https://cms.jbnews.com/news/adminArticleWriteForm.html?mode=modify&idxno=' + 번호;

/** 서식에서 읽을 것들 — ⛔ 바꾸지 않는다 */
export const 상태글 = [
  '(() => {',
  '  const 켜짐 = (id) => { const e = document.getElementById(id); return !!(e && e.checked); };',
  '  const v = (이름) => { const e = document.getElementsByName(이름)[0]; return e ? (e.value || "") : ""; };',
  '  const i = (id) => { const e = document.getElementById(id); return e ? (e.value || "") : ""; };',
  '  return JSON.stringify({',
  '    제목: v("title"),',
  '    승인: 켜짐("recog-e"), 미승인: 켜짐("recog-c"), 반려: 켜짐("recog-r"),',
  '    노출날: i("embargo_date"), 노출시각: i("embargo_time"),',
  '    입력일: v("input_date") || i("input_date") || "",',
  '    기사일자: v("article_date") || i("article_date") || "",',
  '  });',
  '})()',
].join('\n');

const 쉰다 = (밀리) => new Promise((끝) => setTimeout(끝, 밀리));

export async function 상태읽기(번호) {
  return 새탭에서(서식주소(번호), async (붙음) => {
    붙음.듣기('Page.javascriptDialogOpening', () => {
      붙음.보내기('Page.handleJavaScriptDialog', { accept: true }).catch(() => {});
    });
    await 자리잡기(붙음, { 최대: 45000 });
    await 쉰다(2500);
    try { return JSON.parse(String(await 재기(붙음, 상태글, 25000))); } catch { return null; }
  });
}

function 직접실행인가() { return (process.argv[1] || '').includes('중부매일-기사상태-읽는다'); }

if (직접실행인가() && process.argv.includes('--자가시험')) {
  const 잰다 = []; const 본다 = (이름, v) => 잰다.push([이름, !!v]);
  본다('서식 주소가 그 기사를 연다', 서식주소(1497885).includes('idxno=1497885'));
  본다('수정 모드로 연다', 서식주소(1).includes('mode=modify'));
  본다('노출날·노출시각을 읽는다', 상태글.includes('embargo_date') && 상태글.includes('embargo_time'));
  본다('승인 라디오 셋을 다 읽는다',
    상태글.includes('recog-e') && 상태글.includes('recog-c') && 상태글.includes('recog-r'));
  본다('⛔ 아무것도 누르거나 저장하지 않는다',
    !/\.click\(|submit\(|\.value\s*=/.test(상태글));
  const 진 = 잰다.filter(([, v]) => !v);
  for (const [이름, v] of 잰다) console.log((v ? '  ✅ ' : '  🔴 ') + 이름);
  console.log(진.length ? ('🔴 ' + 진.length + '가지 깨졌다') : ('✅ 자가시험 ' + 잰다.length + ' 통과'));
  process.exit(진.length ? 1 : 0);
}

if (직접실행인가() && !process.argv.includes('--자가시험')) {
  const 번호들 = process.argv.slice(2).filter((s) => /^\d+$/.test(s));
  if (!번호들.length) { console.log('⛔ 기사 번호를 달라'); process.exit(1); }
  for (const 번호 of 번호들) {
    const r = await 상태읽기(번호);
    if (!r) { console.log(번호 + ' — 🔴 못 읽었다'); continue; }
    console.log(번호 + ' — ' + (r.승인 ? '승인' : r.미승인 ? '미승인' : r.반려 ? '반려' : '모름')
      + ' · 노출 [' + r.노출날 + '] [' + r.노출시각 + ']'
      + ' · 입력일 [' + r.입력일 + '] · 기사일자 [' + r.기사일자 + ']');
    console.log('     ' + String(r.제목).slice(0, 70));
  }
}
