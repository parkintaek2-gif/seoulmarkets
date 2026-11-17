/* 멈춘 통을 다시 올린다(▶). 배포가 실패해 사이트가 내려가 있을 때 되살리는 길 */
import puppeteer from 'puppeteer-core';
const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
let page = null;
try {
  page = await b.newPage();
  await page.setViewport({ width: 1600, height: 1400 });
  await page.goto('https://app.cloudtype.io/@parkintaek2/seoulmarkets:main/web', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.bringToFront();
  await new Promise(r => setTimeout(r, 12000));
  const p = await page.evaluate(() => {
    const 머리 = [...document.querySelectorAll('*')].find(x => (x.innerText||'').startsWith('web') && (x.innerText||'').includes('Memory') && x.querySelectorAll('svg').length >= 3 && x.querySelectorAll('svg').length < 14);
    if (!머리) return null;
    const svgs = [...머리.querySelectorAll('svg')].map(s => { const r = s.getBoundingClientRect(); return { x: r.x+r.width/2, y: r.y+r.height/2, w: r.width }; }).filter(s => s.w > 6);
    return svgs.length >= 3 ? svgs[svgs.length-3] : null;
  });
  if (!p) throw new Error('▶ 단추를 못 찾았다');
  await page.mouse.click(p.x, p.y);
  console.log('■ ▶ 를 눌렀다 — ' + new Date().toLocaleTimeString('ko-KR'));
  await new Promise(r => setTimeout(r, 6000));
  const 확인 = await page.evaluate(() => {
    const e = [...document.querySelectorAll('button')].filter(x => /^(확인|시작|예)$/.test((x.innerText||'').trim())).pop();
    if (!e) return null; const r = e.getBoundingClientRect();
    return { x: r.x+r.width/2, y: r.y+r.height/2 };
  });
  if (확인) { await page.mouse.click(확인.x, 확인.y); console.log('■ 확인을 눌렀다'); }
  await new Promise(r => setTimeout(r, 12000));
  const 꼴 = await page.evaluate(() => ((document.body.innerText||'').match(/실행 중 \(\d\/\d\)|중지됨|시작 중|대기/) || ['?'])[0]);
  console.log('■ 상태 — ' + 꼴);
} catch (e) { console.log('🔴 ' + e.message); }
finally { if (page) { try { await page.close(); } catch {} } try { b.disconnect(); } catch {} }
