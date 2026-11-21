#!/usr/bin/env node
/**
 * collect-datago-accounts.mjs — **공공데이터포털에 우리가 이미 받아 둔 개발계정을 긁어 온다.**
 * (5번 · 총괄 · 2026-09-04)
 *
 * ── 왜 이 자가 생겼나 ────────────────────────────────────────
 * 사장님이 주소를 주셨다(2026-09-04):
 *   「https://www.data.go.kr/iim/api/selectAcountList.do >>>>>여기도 네이버로 로그인하면된다.
 *     parkintaek@naver.com」
 *
 * 우리는 지금 **어느 API 가 이미 승인돼 있는지 모른다.** 그래서 같은 자료를 또 신청하고,
 * 이미 열려 있는 자료를 「없다」고 적는다.
 *
 * 🔴🔴 [2026-09-04 21:4x · 실측] **그런데 이 화면은 «우리 열쇠의 대장이 아니었다».**
 *   ─────────────────────────────────────────────────────────────────────────
 *   사장님이 「크롬 사용해」로 풀어 주셔서, 사장님 크롬에 붙어 네이버 로그인으로 들어갔다.
 *   그리고 화면이 스스로 이렇게 말했다 —
 *
 *     전체 0 건 · 신청 0 · 보류 0 · 반려 0 · 승인 0 · 활용변경 0 · 활용연장 0 · 기간만료 0 · 활용중지 0
 *
 *   ⇒ 네이버로 들어간 그 계정에는 **신청 내역이 하나도 없다.**
 *   ⚠ 그런데 우리는 도는 DATAGO_KEY 를 갖고 있고 여러 개가 승인돼 있다.
 *     ⇒ **그 열쇠는 다른 계정 것이다.**
 *
 *   ⛔ 이 자리에 「이 목록이 그 물음의 정본이다」라고 적어 두었던 것을 **물린다.**
 *     그렇게 적혀 있으면 다음 사람이 이 화면을 보고 「우리는 아무것도 신청 안 했다」로 읽는다.
 *   ⭐ 우리 열쇠의 정본은 여전히 `npm run watch:approvals` 다 —
 *     화면이 아니라 **응답**으로 잰다. 계정이 무엇이든 열쇠가 열리면 열린 것이다.
 *
 * ── ⛔ 이 자가 지키는 것 ─────────────────────────────────────
 * ⛔ **사장님 크롬 창을 건드리지 않는다.** 프로필을 «복사»해서 따로 띄운다.
 *   (2026-09-04 실측 — 사장님 크롬이 22개 프로세스로 떠 있었다. 원본을 열면 잠긴다)
 * ⛔ **비밀번호를 읽지 않는다.** `Login Data` 를 복사하지 않는다 — 세션 쿠키만 가져온다.
 * ⛔ **열쇠 값을 화면에 찍지 않는다.** 아카이브 파일에만 적고, 화면에는 이름과 길이만 낸다.
 *   화면 기록이 로그로 남으면 그것이 유출 경로가 된다.
 * ⛔ **로그인 화면으로 튕기면 「받았다」고 하지 않는다.** 「세션이 안 넘어왔다」로 적는다.
 *   빈 목록을 「신청한 것이 없다」로 읽으면 다시 다 신청하게 된다 — 그것이 제일 나쁘다.
 *
 * 쓰는 법
 *   node scripts/collect-datago-accounts.mjs --selftest
 *   node scripts/collect-datago-accounts.mjs --받는다
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const 오늘 = (() => {
  /* ⛔ toISOString 을 쓰지 않는다 — UTC 라 새벽에 하루가 어긋난다. 이 PC 는 이미 KST 다 */
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
})();
const 낼방 = path.join(ROOT, 'archive', 'raw', 'datago-accounts', 오늘);

export const 목록주소 = 'https://www.data.go.kr/iim/api/selectAcountList.do';

/* ── 판단하는 함수들. 여기만 자가시험한다 ────────────────────── */

/**
 * 로그인 화면으로 튕겼나.
 * ⛔ 「목록이 비었다」와 「로그인이 안 됐다」를 가르는 것이 이 자의 핵이다.
 *   못 가르면 «이미 승인된 자료»를 없다고 적고 또 신청한다.
 */
export function 로그인화면인가(주소, 글) {
  const u = String(주소 ?? '');
  const h = String(글 ?? '');
  /**
   * 🔴 [2026-09-04 21:3x] **이 자가 «로그인된 진짜 목록 화면»을 로그인 화면이라 불렀다.**
   *   ────────────────────────────────────────────────────────────────────────
   *   재 보니 이랬다 —
   * ```
   *   주소  …/selectAcountList.do        ← 목록 화면이 맞다
   *   글    200KB                        ← 로그인 화면은 13.5KB 다
   *   화면  「… English 로그아웃 마이페이지 …」  ← «로그아웃»이 있다. 즉 로그인된 것이다
   *   그런데 「로그인이 필요…」 무늬가 true 로 걸렸다
   * ```
   *   ⇒ 그 문구가 지면 어딘가(안내·스크립트)에 그냥 들어 있었다. 내 무늬가 헛맞은 것이다.
   *
   *   ⛔ 「빈 목록을 로그인 화면으로 오판하지 않는다」는 자가시험을 이미 넣어 뒀는데,
   *     **「로그인된 진짜 화면」쪽은 시험하지 않았다.** 한쪽만 막아 둔 것이다.
   *   ✅ 그래서 **「로그아웃」이 화면에 있으면 로그인된 것으로 본다** — 가장 단단한 표시다.
   *     로그아웃 단추는 로그인한 사람에게만 보인다.
   *   ⚠ 그다음에야 문구를 본다. 순서가 중요하다.
   */
  if (/로그아웃|logout/i.test(h)) return false;
  if (/auth\.data\.go\.kr|\/sso\/|common-login/i.test(u)) return true;
  /* 화면 안에 로그인 폼이 있으면 그것도 로그인 화면이다 */
  if (/name=["']?(userId|loginId)["']?/i.test(h)) return true;
  if (/로그인이 필요|세션이 만료|로그인 후 이용/.test(h)) return true;
  return false;
}

/**
 * 목록 표의 한 줄을 가른다.
 *
 * ⚠ 이 포털의 개발계정 표는 칸 이름이 화면 판마다 다르다. 그래서 «칸 위치»로 읽지 않고
 *   내용의 꼴로 읽는다 — 날짜꼴·상태말·자료번호를 각각 알아본다.
 * ⬜ 못 알아본 칸은 버리지 않고 `그밖` 에 남긴다. 
 */
export function 줄가르기(칸들) {
  const c = (Array.isArray(칸들) ? 칸들 : []).map((x) => String(x ?? '').trim()).filter(Boolean);
  const 것 = { 이름: null, 자료번호: null, 신청일: null, 상태: null, 끝나는날: null, 그밖: [] };
  for (const v of c) {
    if (!것.자료번호 && /^[0-9]{6,10}$/.test(v)) { 것.자료번호 = v; continue; }
    const 날 = v.match(/^(20[0-9]{2})[.\-/]\s?([0-9]{1,2})[.\-/]\s?([0-9]{1,2})/);
    if (날) {
      const 꼴 = `${날[1]}-${String(날[2]).padStart(2, '0')}-${String(날[3]).padStart(2, '0')}`;
      if (!것.신청일) 것.신청일 = 꼴; else if (!것.끝나는날) 것.끝나는날 = 꼴;
      continue;
    }
    if (!것.상태 && /^(승인|신청|반려|중지|정지|심의|대기)/.test(v)) { 것.상태 = v; continue; }
    if (!것.이름 && v.length >= 4) { 것.이름 = v; continue; }
    것.그밖.push(v);
  }
  return 것;
}

/**
 * 🔴🔴 [2026-09-04 21:2x · 실측] **프로필을 복사해도 로그인 세션이 안 따라온다.**
 *   ─────────────────────────────────────────────────────────────────────────
 *   사장님이 「크롬 사용해」로 풀어 주신 뒤 바로 돌렸는데 로그인 화면으로 튕겼다.
 *   그래서 파일을 하나씩 재 봤다 —
 * ```
 *   Default/Network/Cookies   원본 1,769,472  복사본 1,769,472   ← «복사는 됐다»
 *   Default/Local Storage     원본 3,908,398  복사본 3,861,052
 * ```
 *   ⇒ 파일이 없는 것이 아니다. **크롬이 쿠키 «값»을 프로필 경로에 묶어 암호화한다**
 *     (Windows App-Bound Encryption). 폴더를 옮기면 열 수 없다.
 *
 *   ⭐ 그래서 klifemap 쪽 자(`render-reports.js`)는 되는데 여기는 안 됐다 —
 *     그 자의 주석에 답이 있었다: 「토큰(localStorage)은 **암호화돼 있지 않아**
 *     복사만으로 세션이 따라온다」. KLifeMap 은 localStorage 토큰을 쓰고,
 *     data.go.kr 은 **서버 세션 쿠키**를 쓴다. 그 차이다.
 *   ⛔ 그러니 「프로필 복사로 세션을 빌린다」를 «모든 사이트에» 쓰지 않는다.
 *     쿠키로 로그인하는 곳에는 통하지 않는다. 이 한 줄이 오늘 알아낸 것이다.
 *
 *   ✅ 대신 **돌아가는 크롬에 붙는다.** 재 보니 9222 포트가 열려 있었다
 *     (Chrome/152.0.7977.65 · Protocol 1.3). 사장님 창을 건드리지 않고 **새 탭**만 연다.
 *   ⛔ 사장님 탭을 닫거나 옮기지 않는다. 우리가 연 탭만 우리가 닫는다.
 */
export const 붙을주소 = (process.env.KLM_CHROME_PORT ? 'http://127.0.0.1:' + process.env.KLM_CHROME_PORT : 'http://127.0.0.1:9222');

export async function 붙는곳찾기(가져오기 = fetch) {
  try {
    const r = await 가져오기(`${붙을주소}/json/version`);
    if (!r.ok) return null;
    const j = await r.json();
    return j.webSocketDebuggerUrl ?? null;
  } catch { return null; }
}

/**
 * ⭐ **화면이 스스로 말하는 「전체 N 건」을 읽는다.**
 *
 * 🔴 이 함수가 이 자의 핵이다. 없으면 「0건 받았다」가 두 가지를 한 칸에 담는다 —
 *   ① 정말 신청한 것이 없다   ② 내 파서가 표를 못 읽었다
 *   그 둘을 못 가르면 다음 사람이 「신청한 게 없구나」로 읽고 전부 다시 신청한다.
 * ✅ 화면에 적힌 수와 내가 받은 수를 «나란히» 낸다. 어긋나면 그것이 파서 흠이다.
 */
export function 화면이말하는건수(글) {
  const t = String(글 ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const m = t.match(/전체\s*([0-9][0-9,]*)\s*건/);
  return m ? Number(m[1].replace(/,/g, '')) : null;
}

/** 이름이 있는 줄만 남긴다. ⛔ 빈 화면에서 항목을 지어내지 않는다 */
export function 쓸만한줄인가(것) {
  return !!(것 && 것.이름 && 것.이름.length >= 4);
}

/**
 * 사장님 크롬 프로필을 «복사»한다 — 로그인된 세션만 따라온다.
 * ⛔ `Login Data`(비밀번호) 를 목록에 넣지 않는다. 넣을 까닭이 없다.
 */
export function 복사할것들() {
  return ['Local State', 'Default/Preferences', 'Default/Local Storage',
    'Default/Cookies', 'Default/Session Storage', 'Default/Network/Cookies'];
}

function 프로필복사(dst) {
  const src = path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'User Data');
  if (!fs.existsSync(src)) return null;
  try {
    if (fs.existsSync(dst)) fs.rmSync(dst, { recursive: true, force: true });
  } catch {
    return 프로필복사(`${dst}-${process.pid}`);
  }
  fs.mkdirSync(path.join(dst, 'Default'), { recursive: true });
  for (const rel of 복사할것들()) {
    const s = path.join(src, rel); const d = path.join(dst, rel);
    if (!fs.existsSync(s)) continue;
    try { fs.cpSync(s, d, { recursive: true, force: true }); } catch { /* 잠긴 것은 건너뛴다 */ }
  }
  return dst;
}

/* ── 자가시험 ─────────────────────────────────────────────── */
if (process.argv.includes('--selftest')) {
  let 통 = 0; let 실 = 0;
  const 참 = (이름, 값) => { if (값) 통 += 1; else { 실 += 1; console.log(`   🔴 ${이름}`); } };

  참('sso 주소는 로그인 화면', 로그인화면인가('https://auth.data.go.kr/sso/login', ''));
  참('로그인 폼이 있으면 로그인 화면',
    로그인화면인가('https://www.data.go.kr/x', '<input name="userId">'));
  참('안내 문구로도 알아본다',
    로그인화면인가('https://www.data.go.kr/x', '<p>로그인이 필요합니다</p>'));
  참('목록 화면은 로그인 화면이 아니다',
    !로그인화면인가(목록주소, '<table><tr><td>영화진흥위원회_박스오피스</td></tr></table>'));
  참('⭐ 빈 목록을 로그인 화면으로 오판하지 않는다',
    !로그인화면인가(목록주소, '<table><tbody></tbody></table>'));

  /* 🔴 [2026-09-04] 이 자가 «로그인된 진짜 목록 화면»을 로그인 화면이라 불렀다 — 여기서 굳힌다 */
  참('⭐ 화면에 「로그아웃」이 있으면 로그인된 것이다',
    !로그인화면인가(목록주소, '<a>로그아웃</a> <p>로그인이 필요합니다</p>'));
  참('영문 logout 도 알아본다',
    !로그인화면인가(목록주소, '<a>Logout</a><input name="userId">'));
  참('⛔ 로그아웃이 없으면 여전히 로그인 화면으로 본다',
    로그인화면인가(목록주소, '<p>로그인이 필요합니다</p>'));
  참('⛔ 로그인 주소는 로그아웃 글자가 없으면 로그인 화면이다',
    로그인화면인가('https://auth.data.go.kr/sso/common-login?x=1', ''));

  /* ⭐ 화면이 스스로 말하는 건수 — 「0건 받았다」의 두 뜻을 가르는 자리다 */
  참('화면의 「전체 0 건」을 읽는다', 화면이말하는건수('<span>전체 0 건</span>') === 0);
  참('쉼표가 든 수도 읽는다', 화면이말하는건수('전체 1,234 건') === 1234);
  참('띄어쓰기가 없어도 읽는다', 화면이말하는건수('전체12건') === 12);
  참('⛔ 없으면 «못 읽었다»고 한다 — ', 화면이말하는건수('<p>아무것도</p>') === null);
  참('⛔ 빈 값에도 안 죽는다', 화면이말하는건수(null) === null);

  const 한줄 = 줄가르기(['1', '영화진흥위원회_영화관 입장권 통합전산망', '15057381',
    '2026.09.04', '승인', '2028.09.04']);
  참('이름을 잡는다', 한줄.이름 === '영화진흥위원회_영화관 입장권 통합전산망');
  참('자료번호를 잡는다', 한줄.자료번호 === '15057381');
  참('신청일을 ISO 로', 한줄.신청일 === '2026-09-04');
  참('끝나는날을 둘째 날짜로', 한줄.끝나는날 === '2028-09-04');
  참('상태를 잡는다', 한줄.상태 === '승인');
  참('한 자리 수는 자료번호가 아니다', !/^1$/.test(String(한줄.자료번호)));
  참('못 알아본 칸을 그밖에 남긴다', 한줄.그밖.includes('1'));

  참('빈 줄은 안 쓴다', !쓸만한줄인가(줄가르기([])));
  참('이름만 있어도 쓴다', 쓸만한줄인가(줄가르기(['국립국어원_우리말샘'])));
  참('짧은 이름은 안 쓴다', !쓸만한줄인가(줄가르기(['abc'])));
  참('한 자리 날짜도 읽는다', 줄가르기(['x', '2026.9.4']).신청일 === '2026-09-04');
  참('빗금 날짜도 읽는다', 줄가르기(['자료 이름', '2026/09/04']).신청일 === '2026-09-04');

  참('⛔ 비밀번호 파일을 복사 목록에 안 넣는다',
    !복사할것들().some((x) => /Login Data|Web Data/i.test(x)));
  참('쿠키는 복사한다', 복사할것들().some((x) => /Cookies/.test(x)));

  console.log(`\n공공데이터포털 개발계정을 긁는 자 — 자가시험 ${통} 통과 · ${실} 실패`);
  process.exit(실 ? 1 : 0);
}

/* ── 실제로 받는다 ────────────────────────────────────────── */
if (process.argv.includes('--받는다')) {
  const 크롬 = ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'].find((p) => fs.existsSync(p));
  if (!크롬) { console.log('🔴 크롬을 못 찾았다'); process.exit(1); }

  const puppeteer = createRequire(path.join(ROOT, '..', 'klifemap', 'package.json'))('puppeteer-core');

  /**
   * ⭐ 먼저 «돌아가는 크롬»에 붙어 본다 — 위 붙는곳찾기 주석을 읽는다.
   *   프로필 복사로는 쿠키 세션이 안 따라오기 때문이다(실측).
   * ⛔ 사장님 탭을 건드리지 않는다. 새 탭만 열고, 우리가 연 탭만 우리가 닫는다.
   */
  let 브 = null; let 붙었나 = false; let 내탭 = null; let 튕겼나 = false;
  const 소켓 = await 붙는곳찾기();
  if (소켓) {
    try {
      브 = await puppeteer.connect({ browserWSEndpoint: 소켓, defaultViewport: null });
      붙었나 = true;
      console.log('✅ 돌아가는 크롬에 붙었다 — 사장님 로그인 세션을 그대로 쓴다 (새 탭만 연다)');
    } catch (e) { console.log(`⚠ 붙기 실패 — ${e.message.slice(0, 80)}`); }
  } else {
    console.log('⬜ 9222 포트가 안 열려 있다 — 프로필 복사로 물러선다(쿠키 세션은 안 따라올 수 있다)');
  }

  if (!브) {
    const 프로필 = 프로필복사(path.join(os.tmpdir(), 'datago-accounts-profile'));
    if (!프로필) { console.log('🔴 크롬 프로필을 못 찾았다'); process.exit(1); }
    console.log('✅ 프로필을 복사했다 — 사장님 창은 안 건드린다');
    브 = await puppeteer.launch({
      executablePath: 크롬, headless: 'new', userDataDir: 프로필,
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1400,1000'],
    });
  }
  try {
    const 쪽 = await 브.newPage();
    내탭 = 쪽;   /* ⛔ 우리가 연 탭만 우리가 닫는다 */
    await 쪽.setViewport({ width: 1400, height: 1000 });
    await 쪽.goto(목록주소, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise((f) => setTimeout(f, 2500));

    /**
     * ⭐ [2026-09-04 21:3x · 실측] **로그인 화면으로 튕기면 「네이버 로그인」을 누른다.**
     *   ─────────────────────────────────────────────────────────────────────
     *   화면 그림을 눈으로 보고 알았다 — 아이디·비밀번호 칸 옆에 **캡차**가 있다(「pc2wc」).
     *   ⛔ 그러니 비밀번호가 있어도 자동화가 안 된다. 그리고 우리는 비밀번호를 찾지 않는다.
     *   ⭐ 그런데 그 옆에 **「네이버 로그인」 단추**가 있었다. 사장님이 말씀하신 그 길이다 —
     *     「여기도 네이버로 로그인하면된다」.
     *   ✅ 사장님 크롬에 이미 네이버 세션이 있으므로, 그 단추 한 번으로 SSO 가 돈다.
     *     실측 — 누른 뒤 6초 만에 주소가 `selectAcountList.do` 로 돌아왔다.
     *   ⛔ 비밀번호를 넣지 않는다. 캡차를 풀지 않는다. **이미 있는 세션을 쓰는 것뿐이다.**
     */
    if (로그인화면인가(쪽.url(), await 쪽.content())) {
      const 눌렀나 = await 쪽.evaluate(() => {
        const 것 = [...document.querySelectorAll('a,button')].find((e) => /네이버/.test(e.textContent || ''));
        if (!것) return false;
        것.click();
        return true;
      });
      if (눌렀나) {
        console.log('   ⭐ 로그인 화면이라 「네이버 로그인」을 눌렀다 — 이미 있는 세션을 쓴다');
        await new Promise((f) => setTimeout(f, 6000));
        /* 돌아온 뒤 목록으로 한 번 더 간다 — SSO 가 프로필 화면으로 보낼 수 있다 */
        if (!쪽.url().includes('selectAcountList')) {
          await 쪽.goto(목록주소, { waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {});
        }
        await new Promise((f) => setTimeout(f, 1500));
      } else {
        console.log('   ⬜ 「네이버 로그인」 단추를 못 찾았다');
      }
    }

    const 지금주소 = 쪽.url();
    const 글 = await 쪽.content();
    console.log(`   주소 ${지금주소}`);
    console.log(`   글 ${(글.length / 1024).toFixed(1)}KB`);

    fs.mkdirSync(낼방, { recursive: true });
    fs.writeFileSync(path.join(낼방, 'account-list.html'), 글);
    await 쪽.screenshot({ path: path.join(낼방, 'account-list.png'), fullPage: true });

    if (로그인화면인가(지금주소, 글)) {
      console.log('\n⛔ **로그인 화면으로 튕겼다.** 세션이 안 넘어왔다.');
      console.log('   ⚠ 이것을 「신청한 자료가 없다」로 읽지 않는다 — 못 쟀을 뿐이다.');
      console.log(`   화면 그림을 남겼다 → ${path.relative(ROOT, path.join(낼방, 'account-list.png'))}`);
      /**
       * 🔴 여기 `await 브.close()` 가 있었다. **붙은 상태면 그 한 줄이 사장님 크롬을
       *   통째로 닫는다** — 열려 있던 탭이 다 사라진다. 아래 finally 와 같은 판단을 쓴다.
       *   ⛔ 「닫는다」를 두 곳에 따로 적으면 한쪽만 고치는 날이 온다. 그래서 여기서는
       *     닫지 않고 «던져서» finally 한 곳으로 모은다.
       */
      throw new Error('로그인 화면으로 튕겼다');
    }

    const 줄들 = await 쪽.evaluate(() => [...document.querySelectorAll('table tr')]
      .map((tr) => [...tr.querySelectorAll('td,th')].map((td) => td.innerText.trim())));
    const 것들 = 줄들.map(줄가르기).filter(쓸만한줄인가);

    fs.writeFileSync(path.join(낼방, 'accounts.json'), JSON.stringify({
      잰때: new Date().toLocaleString('ko-KR'),
      주소: 목록주소,
      표줄수: 줄들.length,
      받은것: 것들.length,
      항목: 것들,
    }, null, 2));

    /**
     * ⭐ 「받은 수」와 «화면이 스스로 말하는 수»를 나란히 낸다.
     *   ⛔ 이것이 없으면 「0건」이 ①정말 없다 ②내 파서가 못 읽었다 를 한 칸에 담는다.
     */
    const 화면수 = 화면이말하는건수(글);
    console.log(`\n표 ${줄들.length}줄 · 받은 것 ${것들.length}건 · `
      + `화면이 말하는 것 ${화면수 === null ? '⬜ 못 읽음' : `${화면수}건`}`);
    if (화면수 === 0) {
      console.log('⭐ **화면이 스스로 0건이라 말한다.** 파서 흠이 아니다 — 이 계정에 신청 내역이 «없다».');
      console.log('   ⚠ 그런데 우리는 도는 DATAGO_KEY 를 갖고 있고 여러 개가 승인돼 있다(npm run watch:approvals).');
      console.log('   ⇒ 그 열쇠는 «다른 계정» 것이다. **이 화면은 우리 열쇠의 대장이 아니다.**');
    } else if (화면수 !== null && 화면수 !== 것들.length) {
      console.log(`🔴 화면은 ${화면수}건이라는데 내가 ${것들.length}건을 받았다 — **파서 흠이다.**`);
    }
    const 상태별 = new Map();
    for (const x of 것들) 상태별.set(x.상태 ?? '⬜ 못 읽음', (상태별.get(x.상태 ?? '⬜ 못 읽음') ?? 0) + 1);
    for (const [k, v] of [...상태별].sort((a, b) => b[1] - a[1])) console.log(`   ${String(v).padStart(4)}건  ${k}`);
    for (const x of 것들.slice(0, 30)) {
      console.log(`   ${(x.자료번호 ?? '⬜').padStart(9)}  ${x.상태 ?? '⬜'}  ${x.이름}`);
    }
    if (것들.length > 30) console.log(`   … 그리고 ${것들.length - 30}건 더 (파일에 다 있다)`);
    console.log(`\n→ ${path.relative(ROOT, 낼방)}`);
  } catch (e) {
    if (!/로그인 화면으로 튕겼다/.test(e.message)) throw e;
    튕겼나 = true;
  } finally {
    /* 🔴 붙은 것이면 브라우저를 닫지 않는다 — 사장님 크롬을 통째로 닫는 것이 된다.
       우리가 연 탭만 닫고 연결만 끊는다. 이것을 틀리면 사장님 창이 다 사라진다. */
    if (붙었나) {
      if (내탭) await 내탭.close().catch(() => {});
      브.disconnect();
    } else {
      await 브.close().catch(() => {});
    }
  }

  /* ⛔ 이 줄은 «--받는다 블록 안»에 있어야 한다. 밖에 두었다가 ReferenceError 를 냈다 */
  if (튕겼나) process.exit(2);
}
