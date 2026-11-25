/**
 * 중부매일-라이브에-보이나.mjs — 기사가 **독자에게 보이나**를 라이브에서 직접 잰다.
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔴🔴 사장님 2026-11-25 — 「**또 승인해서 네이버로 전송안되게 주의해**」
 *   ⇒ 예약을 걸었다면 라이브에 **안 보여야** 한다. 보이면 나간 것이다.
 *
 * ⛔ 읽기만 한다. 아무것도 누르지 않는다.
 * ⛔ 「승인했다」를 「나갔다」로도, 「안 나갔다」로도 읽지 않는다 — 열어서 본다.
 *
 *   node scripts/중부매일-라이브에-보이나.mjs 1504756 1504685
 *   node scripts/중부매일-라이브에-보이나.mjs --자가시험
 */
import { 새탭에서, 자리잡기, 재기 } from './lib/cdp.mjs';

export const 라이브주소 = (번호) => 'https://www.jbnews.com/news/articleView.html?idxno=' + 번호;

/** 화면에 무엇이 떴나 — 경고창·제목·본문 길이를 함께 본다 */
export const 본다글 = [
  '(() => {',
  '  const 글 = (document.body && document.body.innerText) || "";',
  '  const h = document.querySelector("h1,h2,h3");',
  '  return JSON.stringify({',
  '    주소: location.href,',
  '    머리: h ? (h.innerText || "").replace(/\\s+/g, " ").trim().slice(0, 60) : "",',
  '    글자수: 글.length,',
  '    검토중: /검토중인 기사/.test(글),',
  '    없는기사: /존재하지 않|삭제된|없는 기사/.test(글),',
  '  });',
  '})()',
].join('\n');

const 쉰다 = (밀리) => new Promise((끝) => setTimeout(끝, 밀리));

export async function 보이나(번호) {
  return 새탭에서(라이브주소(번호), async (붙음) => {
    let 경고 = '';
    붙음.듣기('Page.javascriptDialogOpening', (p) => {
      경고 = String((p && p.message) || '').slice(0, 80);
      붙음.보내기('Page.handleJavaScriptDialog', { accept: true }).catch(() => {});
    });
    await 자리잡기(붙음, { 최대: 40000 });
    await 쉰다(2500);
    let r = null;
    try { r = JSON.parse(String(await 재기(붙음, 본다글, 25000))); } catch { r = null; }
    if (!r) return { 번호, 판정: '못 쟀다', 경고 };
    const 막혔나 = !!경고 || r.검토중 || r.없는기사;
    return {
      번호,
      판정: 막혔나 ? '안 보인다' : (r.머리 ? '🔴 보인다' : '못 쟀다'),
      경고, 머리: r.머리, 글자수: r.글자수,
    };
  });
}

/* ── 자가시험 ──────────────────────────────────────────────── */
function 직접실행인가() { return (process.argv[1] || '').includes('중부매일-라이브에-보이나'); }

if (직접실행인가() && process.argv.includes('--자가시험')) {
  const 잰다 = []; const 본다 = (이름, v) => 잰다.push([이름, !!v]);
  본다('라이브 주소가 그 기사를 연다', 라이브주소(1504756).includes('idxno=1504756'));
  본다('⛔ CMS 가 아니라 독자가 보는 곳을 연다',
    라이브주소(1).includes('jbnews.com') && !라이브주소(1).includes('cms.'));
  본다('경고창 글을 읽는다 — 「검토중인 기사」가 거기 뜬다', 본다글.includes('검토중'));
  본다('⛔ 아무것도 누르지 않는다', !/\.click\(|submit\(|\.value\s*=/.test(본다글));
  본다('⛔ 삭제를 부르는 곳이 없다', !/삭제|delete/i.test(본다글.replace('삭제된', '')));
  const 진 = 잰다.filter(([, v]) => !v);
  for (const [이름, v] of 잰다) console.log((v ? '  ✅ ' : '  🔴 ') + 이름);
  console.log(진.length ? ('🔴 ' + 진.length + '가지 깨졌다') : ('✅ 자가시험 ' + 잰다.length + ' 통과'));
  process.exit(진.length ? 1 : 0);
}

if (직접실행인가() && !process.argv.includes('--자가시험')) {
  const 번호들 = process.argv.slice(2).filter((s) => /^\d+$/.test(s));
  if (!번호들.length) { console.log('⛔ 기사 번호를 달라'); process.exit(1); }
  for (const 번호 of 번호들) {
    let r = null;
    try { r = await 보이나(번호); } catch (탈) { r = { 번호, 판정: '못 쟀다', 경고: String(탈.message).slice(0, 60) }; }
    console.log(r.번호 + ' — ' + r.판정
      + (r.경고 ? ' · 경고 [' + r.경고 + ']' : '')
      + (r.머리 ? ' · 머리 [' + r.머리 + ']' : ''));
    await 쉰다(1500);
  }
}
