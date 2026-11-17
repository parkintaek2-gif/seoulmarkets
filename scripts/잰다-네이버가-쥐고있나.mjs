/**
 * 잰다-네이버가-쥐고있나.mjs — 네이버가 그 지면을 쥐고 있나, **지면의 제목으로** 묻는다.
 *
 * 🔴 앞의 방법(주소를 그대로 치기)은 거짓이었다 — 네이버가 «검색어 자체»를 링크로
 *   만들어 보여 주는 것을 내가 「쥐고 있다」로 셌다. 배포도 안 된 중학교 지면이
 *   「쥐고 있다」로 나와서 잡았다.
 *   ⭐ 대조군(아직 없어야 할 것)을 넣어 두지 않았으면 그대로 사장님께 갔다.
 *
 * ⇒ 이번엔 **그 지면에만 있는 제목 글귀**로 묻는다. 색인돼 있으면 그 글귀로 뜬다.
 * ⛔ 대조군을 반드시 함께 잰다 — 아직 배포 안 된 중학교 지면.
 *   대조군이 「쥐고 있다」로 나오면 이 측정도 버린다.
 */
import { createRequire } from 'node:module';
const require = createRequire(new URL('../package.json', import.meta.url));
const puppeteer = require('puppeteer-core');

const 볼것 = [
  { 말: '부평구 고등학교 21곳, 한 장에', 몫: '방문 95명', 슬러그: '인천광역시-부평구' },
  { 말: '의정부시 고등학교 16곳, 한 장에', 몫: '방문 73명', 슬러그: '경기도-의정부시' },
  { 말: '분당구 고등학교 24곳, 한 장에', 몫: '방문 0명', 슬러그: '경기도-성남시-분당구' },
  { 말: '화성시 고등학교 24곳, 한 장에', 몫: '방문 0명', 슬러그: '경기도-화성시' },
  { 말: '남양주시 고등학교 21곳, 한 장에', 몫: '방문 0명', 슬러그: '경기도-남양주시' },
  /* 🔴 대조군 — 아직 배포 전이다. 「쥐고 있다」로 나오면 이 측정은 거짓이다 */
  { 말: '성북구 중학교 18곳, 한 장에', 몫: '⚠ 대조군(배포 전)', 슬러그: '서울특별시-성북구' },
];

/** 결과에서 우리 것을 알아본다. ⛔ 호스트만 보면 남의 글에 적힌 우리 이름을 센다 */
export function 우리지면인가(주소, 슬러그) {
  const s = String(주소 || '');
  if (!/(?:^|\/\/)(?:www\.)?100yearmap\.com\//.test(s)) return false;
  try { return decodeURIComponent(s).includes(슬러그); } catch (e) { return s.includes(슬러그); }
}

/* ── 자가시험 ──────────────────────────────────────────────
   🔴 [2026-11-18] 이 자의 앞 판은 **거짓이었다.** 주소를 그대로 치면 네이버가
   「검색어 자체」를 링크로 내주는데 그것을 「쥐고 있다」로 셌다. 아직 배포도 안 된
   지면이 「쥐고 있다」로 나와서 잡았다.
   ⛔ 그래서 이 자는 대조군(아직 없어야 할 지면)을 «늘» 함께 잰다. 아래 ⑤가 그 자리다. */
function 자가시험() {
  const 봄 = [];
  const 본다 = (이름, 참) => 봄.push({ 이름, 참 });
  본다('① 우리 지면을 알아본다',
    우리지면인가('https://100yearmap.com/report/area/서울특별시-성북구', '서울특별시-성북구'));
  본다('② 퍼센트 인코딩을 푼다',
    우리지면인가('https://100yearmap.com/report/area/%EC%84%9C%EC%9A%B8%ED%8A%B9%EB%B3%84%EC%8B%9C-%EC%84%B1%EB%B6%81%EA%B5%AC', '서울특별시-성북구'));
  본다('③ 다른 동네는 아니다',
    !우리지면인가('https://100yearmap.com/report/area/경기도-화성시', '서울특별시-성북구'));
  /* 🔴 남의 블로그에 우리 이름이 적힌 것을 「우리가 떴다」로 세면 안 된다 */
  본다('④ 남의 글은 우리 것이 아니다',
    !우리지면인가('https://blog.naver.com/x/100yearmap.com/report/area/서울특별시-성북구', '서울특별시-성북구'));
  본다('⑤ 대조군이 목록에 들어 있다', 볼것.some((v) => /대조군/.test(v.몫)));
  본다('⑥ 버는 곳과 못 버는 곳을 나란히 본다',
    볼것.some((v) => /방문 \d+명/.test(v.몫)) && 볼것.some((v) => /방문 0명/.test(v.몫)));
  let 깨짐 = 0;
  for (const x of 봄) if (!x.참) { console.log('🔴 ' + x.이름); 깨짐 += 1; }
  console.log(깨짐 ? '🔴 ' + 깨짐 + '가지 깨졌다' : '✅ ' + 봄.length + '가지 다 통과');
  return 깨짐 === 0;
}

if (process.argv.includes('--selftest')) process.exit(자가시험() ? 0 : 1);

const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null, protocolTimeout: 300000 });
let p = null;
try {
  p = await b.newPage();
  await p.setViewport({ width: 1180, height: 900 });
  console.log('\n📏 네이버가 그 지면을 쥐고 있나 — 지면의 제목 글귀로 묻는다\n');
  for (const v of 볼것) {
    await p.goto('https://search.naver.com/search.naver?query=' + encodeURIComponent('"' + v.말 + '"'),
      { waitUntil: 'domcontentloaded', timeout: 120000 });
    await new Promise((r) => setTimeout(r, 1800));
    const 본것 = await p.evaluate((슬) => {
      const 모은것 = [];
      for (const a of document.querySelectorAll('a[href]')) {
        const h = a.getAttribute('href') || '';
        if (/100yearmap\.com/.test(h)) 모은것.push(decodeURIComponent(h));
      }
      return {
        우리: 모은것.length,
        그지면: 모은것.some((x) => x.includes(슬)),
        본보기: 모은것.slice(0, 2),
      };
    }, v.슬러그);
    console.log('  ' + v.말.padEnd(28) + '(' + v.몫 + ')');
    console.log('     그 지면이 떴나 : ' + (본것.그지면 ? '✅ 떴다' : '🔴 안 떴다')
      + ' · 우리 링크 ' + 본것.우리 + '개');
    if (본것.본보기.length) console.log('       ' + 본것.본보기[0].slice(0, 90));
    await new Promise((r) => setTimeout(r, 900));
  }
} finally {
  if (p) { try { await p.close(); } catch (e) { /* 이미 닫혔다 */ } }
  await b.disconnect();
}
console.log('\n  ⛔ 대조군이 「떴다」로 나오면 이 측정도 버린다.\n');
