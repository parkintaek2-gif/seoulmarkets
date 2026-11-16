import puppeteer from 'puppeteer-core';
const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
let page = null;
try {
  page = await b.newPage();
  await page.setViewport({ width: 1600, height: 1400 });
  await page.goto('https://app.cloudtype.io/@parkintaek2/seoulmarkets:main/web', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.bringToFront();
  await new Promise(r => setTimeout(r, 13000));
  for (const 칸 of ['워크로드', '이벤트']) {
    const p = await page.evaluate((g) => {
      const e = [...document.querySelectorAll('*')].filter(x => x.children.length === 0 && (x.innerText||'').trim() === g).pop();
      if (!e) return null; const r = e.getBoundingClientRect();
      return { x: r.x + r.width/2, y: r.y + r.height/2 };
    }, 칸);
    if (!p) { console.log('🔴 ' + 칸 + ' 칸 없음'); continue; }
    await page.mouse.click(p.x, p.y);
    await new Promise(r => setTimeout(r, 9000));
    const t = await page.evaluate(() => (document.body.innerText||''));
    const i = t.indexOf('CLI');
    console.log('===== ' + 칸 + ' =====');
    console.log(t.slice(i, i + 1400));
  }
} catch (e) { console.log('🔴 ' + e.message); }
finally { if (page) { try { await page.close(); } catch {} } try { b.disconnect(); } catch {} }
