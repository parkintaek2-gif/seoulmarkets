#!/usr/bin/env node
/**
 * 잰다-네이버에서-우리가-뜨나.mjs — 네이버에 동네 이름을 쳐서 **우리 지면이 뜨는지** 본다.
 *
 * ── 🔴 왜 ────────────────────────────────────────────────────
 * [2026-11-18] 고등학교 지역 258장 가운데 128장이 28일 동안 0명이었다.
 * 그런데 **크기 문제가 아니었다** —
 * ```
 *   부평구   21곳   95명      ← 번다
 *   분당구   24곳    0명      ← 더 큰데 0명
 *   화성시   24곳    0명
 *   남양주시 21곳    0명
 *   학교 10곳 넘는데 0명인 동네가 35곳
 * ```
 * 둘 중 하나다 — ① 네이버가 아직 색인을 안 했다 ② 색인은 됐는데 밀렸다.
 * ⛔ 재지 않고 단정하지 않는다. 손님이 하는 그대로 쳐 본다.
 *
 * ⛔ 주소를 지어내 넣지 않는다 — 검색창에 쳐서 결과를 본다.
 * ⛔ b.close() 금지(사장님 창이 닫힌다) · 연 탭은 그 자리에서 닫는다.
 * ⛔ 한글을 셸 인자로 받지 않는다 — CP949 로 깨진다. 볼 동네는 이 안에 적는다.
 *
 * 쓰는 법
 *   node scripts/잰다-네이버에서-우리가-뜨나.mjs
 *   node scripts/잰다-네이버에서-우리가-뜨나.mjs --selftest
 */
import { createRequire } from 'node:module';
const require = createRequire(new URL('../package.json', import.meta.url));
const puppeteer = require('puppeteer-core');

/** 재는 짝 — 버는 곳과 못 버는 곳을 **나란히** 본다. 한쪽만 보면 견줄 데가 없다 */
/* 🔴🔴 [2026-11-22 · 5번] **중학교 259장·초등학교 261장이 28일 0명이다 — 묶음째 비었다.**
   ─────────────────────────────────────────────────────────────────────────
   고립는 아니다(들어오는 링크를 재니 폴더 입구 두 장 말고는 다 가리켜진다).
   제목에도 수치 이름이 이미 들어 있다 — 「○○시 중학교 학급당 학생 수 40곳」.
   그렇다면 남는 것은 **색인이냐 경쟁이냐**다. 같은 동네로 고·중·초를 나란히 친다 —
   고등학교가 버는 동네에서 중·초가 안 뜨면 **그 묶음의 문제**이고,
   셋 다 안 뜨면 **그 동네의 문제**다. 가려야 어디에 손댈지 정해진다.
   ⚠ 11-18 에 쟀던 고등학교 짝은 여기 적어 둔다 — 견줄 자리를 잃지 않는다.
     부평구 95명 · 의정부시 73명 · 분당구/화성시/남양주시/부천시 0명(학교 수는 더 많다) */
export const 볼것 = [
  { 말: '부평구 고등학교 진학률', 슬러그: '인천광역시-부평구', 몫: '고 · 번다 95명' },
  { 말: '의정부시 중학교 학급당 학생 수', 슬러그: '경기도-의정부시', 몫: '중 · 제목 그대로' },
  /* ⭐ 이름까지 붙여서도 안 뜨면 «색인이 안 된 것»이다 — 경쟁이면 이렇게 치면 뜬다.
     11-18 에 「기계공학과 취업률 진학률 백년지도」로 쳐서 5개가 떴던 것이 그 증거다. */
  { 말: '의정부시 중학교 학급당 학생 수 백년지도', 슬러그: '경기도-의정부시', 몫: '중 · 이름까지' },
  { 말: '부평구 초등학교 학급당 학생 수 백년지도', 슬러그: '인천광역시-부평구', 몫: '초 · 이름까지' },
  { 말: '부평구 고등학교 진학률 백년지도', 슬러그: '인천광역시-부평구', 몫: '고 · 대조군' },
  { 말: '부평구 고등학교 학급당 학생 수', 슬러그: '인천광역시-부평구', 몫: '고 · 제목에 그 말이 없다' },
  { 말: '화성시 고등학교 학급당 학생 수', 슬러그: '경기도-화성시', 몫: '고 · 28일 0명이던 곳' },
  { 말: '부평구 고등학교 학급당 학생 수 백년지도', 슬러그: '인천광역시-부평구', 몫: '고 · 색인은 됐나' },
];

/** 결과 속에서 우리 것을 알아본다. ⛔ 호스트만 보면 다른 사이트의 인용을 우리로 센다 */
export function 우리것인가(주소) {
  return /(?:^|\/\/)(?:www\.)?100yearmap\.com\//.test(String(주소 || ''));
}

function 자가시험() {
  const 봄 = [];
  const 본다 = (이름, 참) => 봄.push({ 이름, 참 });
  본다('① 우리 주소를 알아본다', 우리것인가('https://www.100yearmap.com/report/area/x'));
  본다('② www 없는 것도 알아본다', 우리것인가('https://100yearmap.com/report/area/x'));
  /* 🔴 남의 글에 우리 이름이 적힌 것을 「우리가 떴다」로 세면 안 된다 */
  본다('③ 남의 블로그는 우리 것이 아니다', !우리것인가('https://blog.naver.com/x/100yearmap.com'));
  본다('④ 비슷한 이름도 아니다', !우리것인가('https://not100yearmap.com/x'));
  본다('⑤ 빈 것은 아니다', !우리것인가('') && !우리것인가(null));
  본다('⑥ 버는 곳과 못 버는 곳을 나란히 본다',
    볼것.some((v) => /번다/.test(v.몫)) && 볼것.some((v) => /0명/.test(v.몫)));
  let 깨짐 = 0;
  for (const s of 봄) if (!s.참) { console.log('🔴 ' + s.이름); 깨짐 += 1; }
  console.log(깨짐 ? `🔴 ${깨짐}가지 깨졌다` : `✅ ${봄.length}가지 다 통과`);
  return 깨짐 === 0;
}

async function 돈다() {
  const b = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:9222', defaultViewport: null, protocolTimeout: 300000,
  });
  let p = null;
  console.log('\n📏 네이버에 쳐서 우리 지면이 뜨나 — 손님이 하는 그대로\n');
  try {
    p = await b.newPage();
    await p.setViewport({ width: 1180, height: 900 });
    for (const v of 볼것) {
      const u = 'https://search.naver.com/search.naver?query=' + encodeURIComponent(v.말);
      await p.goto(u, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await new Promise((r) => setTimeout(r, 1800));
      const 본것 = await p.evaluate(() => {
        const 모은것 = [];
        for (const a of document.querySelectorAll('a[href]')) {
          const h = a.getAttribute('href') || '';
          if (/^https?:\/\//.test(h)) 모은것.push(h);
        }
        return 모은것;
      });
      const 우리 = 본것.filter(우리것인가);
      /* ⛔ 순서를 「순위」로 적지 않는다 — 네이버가 자리마다 다른 덩이를 넣는다 */
      console.log('  ' + v.말.padEnd(20) + '(' + v.몫 + ')');
      console.log('     우리 링크 : ' + (우리.length ? '✅ ' + 우리.length + '개' : '🔴 없다')
        + ' · 결과 링크 전체 ' + 본것.length + '개');
      if (우리.length) {
        for (const x of [...new Set(우리)].slice(0, 2)) {
          console.log('       ' + decodeURIComponent(x).slice(0, 96));
        }
      }
    }
    /* 색인 자체를 확인한다 — 사이트 안에서 찾기 */
    console.log('\n  네이버가 우리를 몇 장 쥐고 있나 (site 검색)');
    await p.goto('https://search.naver.com/search.naver?query=' + encodeURIComponent('site:100yearmap.com'),
      { waitUntil: 'domcontentloaded', timeout: 120000 });
    await new Promise((r) => setTimeout(r, 1800));
    const 몇장 = await p.evaluate(() =>
      [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href') || '')
        .filter((h) => /100yearmap\.com/.test(h)).length);
    console.log('     site 검색에 보인 우리 링크 :', 몇장, '개');
  } finally {
    if (p) { try { await p.close(); } catch (e) { /* 이미 닫혔다 */ } }
    await b.disconnect();
  }
  console.log('');
}

const 인자 = process.argv.slice(2);
if (인자.includes('--selftest')) process.exit(자가시험() ? 0 : 1);
await 돈다();
