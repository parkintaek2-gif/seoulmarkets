/**
 * 배포단추-누른다-서울마켓츠.mjs
 *   — 클라우드타입 대시보드의 「배포하기」를 눌러 **최신 커밋을 빌드**한다. (web 통)
 *
 * 🔴🔴🔴 왜 이것이 있어야 하나 (2026-11-17 15:5x · 5번)
 *   `scripts/배포한다-서울마켓츠.mjs` 는 `ctype update` 를 부른다.
 *   `update` 는 **저장된 설정이 아니라 «직전 배포»의 설정으로 올린다** —
 *   같은 이미지를 다시 띄울 뿐 새 커밋을 가져오지 않는다.
 *   그래서 오늘 1번이 네 번(10:50 · 12:20 · 13:15 · 15:15) 「아직 404 입니다」를 올렸고,
 *   내가 15:33 에 그것을 또 불러 라이브 도장이 **ee2464753(05:44)** 에 그대로 머물렀다.
 *   같은 잘못이 11/17 06:36 에도 있었다(세션간 메모).
 *   ⇒ 최신 커밋을 빌드하는 길은 대시보드 「설정」 탭의 「배포하기」 하나뿐이다.
 *   ⛔ `ctype apply` 는 쓰지 않는다 — 콘솔 환경변수가 통째로 지워진다(CLAUDE.md).
 *
 * ⚠ 안전장치 — 환경변수가 덜 실린 채로 누르면 **키가 날아간다.**
 *   칸 수를 먼저 세고, 최소 칸수보다 적으면 누르지 않고 멈춘다.
 *
 * ⚠ web 통에는 세 사이트가 같이 실린다 —
 *   seoulmarkets.com · 100yearmap.com · www.kculturewire.com
 *   누르면 셋이 함께 새 판으로 간다. 하나만 올리는 길은 없다.
 *
 * 쓰는 법
 *   node scripts/배포단추-누른다-서울마켓츠.mjs
 *   node scripts/배포단추-누른다-서울마켓츠.mjs --자가시험
 */
import { createRequire } from 'node:module';
const require = createRequire('file:///C:/Users/User/Documents/GitHub/dataeconomics/package.json');

export const 설정주소 = 'https://app.cloudtype.io/@parkintaek2/seoulmarkets:main/web#settings';
export const 최소칸수 = 10;

/** 환경변수가 다 실렸나 — 덜 실렸으면 누르면 안 된다 */
export function 눌러도되나(칸수, 값있는칸) {
  if (!Number.isFinite(칸수) || !Number.isFinite(값있는칸)) return false;
  if (칸수 < 최소칸수) return false;
  /* 값이 하나도 없으면 화면이 아직 안 그려진 것이다 */
  return 값있는칸 >= 칸수 - 2;
}

if (process.argv.includes('--자가시험')) {
  let 통과 = 0; let 탈 = 0;
  const 참 = (이름, v) => { if (v) { 통과++; } else { 탈++; console.log('🔴 ' + 이름); } };
  참('환경변수가 다 실리면 눌러도 된다', 눌러도되나(35, 34) === true);
  참('🔴 칸이 적으면 안 누른다 — 화면이 덜 그려진 것이다', 눌러도되나(5, 5) === false);
  참('🔴 값이 거의 비면 안 누른다 — 누르면 키가 날아간다', 눌러도되나(35, 3) === false);
  참('🔴 수가 아니면 안 누른다', 눌러도되나(null, 10) === false && 눌러도되나(35, undefined) === false);
  참('⛔ ctype 에 apply 를 넘기지 않는다',
    !require('node:fs').readFileSync(new URL(import.meta.url), 'utf8')
      .includes('[' + String.fromCharCode(39) + 'ap' + 'ply' + String.fromCharCode(39)));
  참('⛔ ctype update 를 부르지 않는다 — 그것이 이 자가 생긴 까닭이다',
    !require('node:fs').readFileSync(new URL(import.meta.url), 'utf8')
      .includes('[' + String.fromCharCode(39) + 'upd' + 'ate' + String.fromCharCode(39)));
  참('주소가 web 통을 가리킨다', 설정주소.includes('/web#settings'));
  console.log(탈 ? '🔴 자가시험 ' + 탈 + '건 탈' : '✅ 자가시험 ' + 통과 + ' 통과');
  process.exit(탈 ? 1 : 0);
}

const puppeteer = require('puppeteer-core');
const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null, protocolTimeout: 240000 });
const page = await b.newPage();
let 됐나 = false;
try {
  await page.setViewport({ width: 1400, height: 1300 });
  /* 이 화면은 긴 폴링을 문다 — 글이 들어오면 간다. 두 번까지 두드린다. */
  let 열렸나 = false;
  for (const 참을시간 of [150000, 180000]) {
    try {
      await page.goto(설정주소, { waitUntil: 'domcontentloaded', timeout: 참을시간 });
      열렸나 = true; break;
    } catch (e) {
      console.log(`⚠ 설정 화면이 ${Math.round(참을시간 / 1000)}초 안에 안 열렸다 — ${String(e.message).slice(0, 60)}`);
    }
  }
  if (!열렸나) throw new Error('설정 화면을 두 번 다 못 열었다');
  await new Promise((r) => setTimeout(r, 11000));

  const 상태 = await page.evaluate(() => {
    const 칸 = [...document.querySelectorAll('input')].filter((e) => e.offsetParent !== null);
    return { 칸수: 칸.length, 값있는칸: 칸.filter((e) => (e.value || '').length > 0).length };
  });
  console.log('환경변수 칸 ' + 상태.칸수 + '개 · 값 있는 칸 ' + 상태.값있는칸 + '개');
  if (!눌러도되나(상태.칸수, 상태.값있는칸)) {
    console.log('🔴 환경변수가 덜 실렸다 — 지금 누르면 키가 날아간다. 멈춘다.');
    process.exit(1);
  }

  const 있나 = await page.evaluate(() => {
    const e = [...document.querySelectorAll('button,a,[role="button"]')].filter((x) => x.offsetParent !== null)
      .find((x) => (x.innerText || '').trim() === '배포하기');
    if (!e) return false;
    e.scrollIntoView({ behavior: 'instant', block: 'center' });
    return true;
  });
  if (!있나) { console.log('🔴 「배포하기」 단추를 못 찾았다'); process.exit(1); }
  await new Promise((r) => setTimeout(r, 1000));
  const c = await page.evaluate(() => {
    const e = [...document.querySelectorAll('button,a,[role="button"]')].filter((x) => x.offsetParent !== null)
      .find((x) => (x.innerText || '').trim() === '배포하기');
    const r = e.getBoundingClientRect();
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
  });
  await page.mouse.click(c.x, c.y);
  await new Promise((r) => setTimeout(r, 9000));
  const 뒤 = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
  됐나 = /빌드 중|배포 중|대기 중/.test(뒤);
  console.log(됐나 ? '✅ 「배포하기」를 눌렀다 — 빌드가 시작됐다' : '⚠ 눌렀는데 빌드 표시가 안 보인다');
  console.log('⇒ 닿았나는 도장으로 판정한다 — curl https://seoulmarkets.com/deploy-stamp.txt');
} catch (e) {
  console.log('🔴 ' + String(e.message).slice(0, 220));
} finally {
  await page.close().catch(() => {});
  b.disconnect();
}
process.exit(됐나 ? 0 : 1);
