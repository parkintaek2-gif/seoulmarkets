import puppeteer from 'puppeteer-core';
const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
let page = null;
try {
  page = await b.newPage();
  await page.setViewport({ width: 1600, height: 1400 });
  await page.goto('https://app.cloudtype.io/@parkintaek2/seoulmarkets:main/web', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.bringToFront();
  await new Promise(r => setTimeout(r, 13000));
  const p = await page.evaluate(() => {
    const 행들 = [...document.querySelectorAll('*')].filter(x => (x.innerText||'').startsWith('no message') && x.querySelectorAll('svg').length >= 2 && x.querySelectorAll('svg').length < 10);
    const 행 = 행들[0]; if (!행) return null;
    const svgs = [...행.querySelectorAll('svg')]; const s = svgs[svgs.length - 1];   // 마지막 = 점 세 개
    const r = s.getBoundingClientRect();
    return { x: r.x + r.width/2, y: r.y + r.height/2 };
  });
  if (!p) throw new Error('행을 못 찾았다');
  await page.mouse.click(p.x, p.y);
  await new Promise(r => setTimeout(r, 4000));
  const t = await page.evaluate(() => {
    const 떠있는 = [...document.querySelectorAll('[role="menu"],[role="dialog"],ul,div')]
      .filter(e => { const r = e.getBoundingClientRect(); return r.width > 60 && r.width < 420 && r.height > 20 && r.height < 400 && (e.innerText||'').trim(); })
      .map(e => (e.innerText||'').trim()).filter(s => s.length < 200);
    return [...new Set(떠있는)].slice(-6).join('\n---\n');
  });
  console.log(t);
  await page.screenshot({ path: 'C:/Users/User/AppData/Local/Temp/u5-tmp/점세개.png' });
} catch (e) { console.log('🔴 ' + e.message); }
finally { if (page) { try { await page.close(); } catch {} } try { b.disconnect(); } catch {} }
