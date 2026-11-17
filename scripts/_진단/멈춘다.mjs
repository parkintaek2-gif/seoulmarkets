import puppeteer from 'puppeteer-core';
const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
let page = null;
try {
  page = await b.newPage();
  await page.setViewport({ width: 1600, height: 1400 });
  await page.goto('https://app.cloudtype.io/@parkintaek2/seoulmarkets:main/web', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.bringToFront();
  await new Promise(r => setTimeout(r, 13000));
  const 자리 = await page.evaluate(() => {
    const 머리 = [...document.querySelectorAll('*')].find(x => (x.innerText||'').startsWith('web') && (x.innerText||'').includes('Memory') && x.querySelectorAll('svg').length >= 3 && x.querySelectorAll('svg').length < 14);
    if (!머리) return null;
    const svgs = [...머리.querySelectorAll('svg')].map(s => { const r = s.getBoundingClientRect(); return { x: Math.round(r.x+r.width/2), y: Math.round(r.y+r.height/2), w: Math.round(r.width) }; });
    return svgs.filter(s => s.w > 6).slice(-5);
  });
  console.log(JSON.stringify(자리));
  await page.screenshot({ path: 'C:/Users/User/AppData/Local/Temp/u5-tmp/머리.png', clip: { x: 520, y: 60, width: 900, height: 200 } });
} catch (e) { console.log('🔴 ' + e.message); }
finally { if (page) { try { await page.close(); } catch {} } try { b.disconnect(); } catch {} }
