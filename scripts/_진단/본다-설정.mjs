import puppeteer from 'puppeteer-core';
const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
let page = null;
try {
  page = await b.newPage();
  await page.setViewport({ width: 1600, height: 1600 });
  await page.goto('https://app.cloudtype.io/@parkintaek2/seoulmarkets:main/web#settings', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise(r => setTimeout(r, 14000));
  const t = await page.evaluate(() => {
    const 값 = [...document.querySelectorAll('input,textarea')].map(e => (e.value||'').trim()).filter(Boolean);
    return 값.join('\n');
  });
  console.log('=== 입력칸 값 ===');
  console.log(t.slice(0, 2000));
} catch (e) { console.log('🔴 ' + e.message); }
finally { if (page) { try { await page.close(); } catch {} } try { b.disconnect(); } catch {} }
