/* 옛 통을 «내린 뒤» 배포한다 — 새 통이 뜰 자리를 확실히 비우는 길.
   ⚠ 그동안 사이트가 잠깐 안 뜬다. 방문이 가장 적은 새벽에만 한다. */
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
const 낼곳 = 'C:/Users/User/AppData/Local/Temp/u5-tmp/내리고올린다.txt';
fs.writeFileSync(낼곳, '');
const 적는다 = (s) => { fs.appendFileSync(낼곳, s + '\n'); console.log(s); };
const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
let page = null;
try {
  page = await b.newPage();
  await page.setViewport({ width: 1600, height: 1400 });
  await page.goto('https://app.cloudtype.io/@parkintaek2/seoulmarkets:main/web', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.bringToFront();
  await new Promise(r => setTimeout(r, 13000));
  const 단추 = await page.evaluate(() => {
    const 머리 = [...document.querySelectorAll('*')].find(x => (x.innerText||'').startsWith('web') && (x.innerText||'').includes('Memory') && x.querySelectorAll('svg').length >= 3 && x.querySelectorAll('svg').length < 14);
    if (!머리) return null;
    const svgs = [...머리.querySelectorAll('svg')].map(s => { const r = s.getBoundingClientRect(); return { x: r.x+r.width/2, y: r.y+r.height/2, w: r.width }; }).filter(s => s.w > 6);
    return svgs.length >= 3 ? { 올림: svgs[svgs.length-3], 멈춤: svgs[svgs.length-2] } : null;
  });
  if (!단추) throw new Error('단추를 못 찾았다');
  await page.mouse.click(단추.멈춤.x, 단추.멈춤.y);
  적는다('① 멈춤을 눌렀다 — ' + new Date().toLocaleTimeString('ko-KR'));
  await new Promise(r => setTimeout(r, 5000));
  /* 확인 창이 뜨면 받는다 */
  const 확인 = await page.evaluate(() => {
    const e = [...document.querySelectorAll('button')].filter(x => /^(확인|중지|멈추기|예)$/.test((x.innerText||'').trim())).pop();
    if (!e) return null; const r = e.getBoundingClientRect();
    return { x: r.x+r.width/2, y: r.y+r.height/2, 글: (e.innerText||'').trim() };
  });
  if (확인) { await page.mouse.click(확인.x, 확인.y); 적는다('② 확인 창에서 「' + 확인.글 + '」'); }
  for (let i = 0; i < 24; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const 꼴 = await page.evaluate(() => ((document.body.innerText||'').match(/실행 중 \(\d\/\d\)|중지됨|중지 중|Stopped|대기/) || ['?'])[0]);
    if (i % 3 === 0) 적는다('   상태 — ' + 꼴);
    if (/중지됨|Stopped/.test(꼴)) { 적는다('③ 내려갔다 — ' + new Date().toLocaleTimeString('ko-KR')); break; }
  }
  await page.goto('https://app.cloudtype.io/@parkintaek2/seoulmarkets:main/web#settings', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise(r => setTimeout(r, 12000));
  const d = await page.evaluate(() => {
    const e = [...document.querySelectorAll('button')].filter(x => /배포하기/.test((x.innerText||'').trim())).pop();
    if (!e) return null; e.scrollIntoView({ block: 'center' });
    const r = e.getBoundingClientRect();
    return { x: r.x+r.width/2, y: r.y+r.height/2 };
  });
  if (!d) throw new Error('「배포하기」 단추가 없다');
  await new Promise(r => setTimeout(r, 1500));
  await page.mouse.click(d.x, d.y);
  적는다('④ 배포하기를 눌렀다 — ' + new Date().toLocaleTimeString('ko-KR'));
} catch (e) { 적는다('🔴 ' + e.message); }
finally { if (page) { try { await page.close(); } catch {} } try { b.disconnect(); } catch {} }
