import puppeteer from 'puppeteer-core';
const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
let page = null;
try {
  page = await b.newPage();
  await page.setViewport({ width: 1600, height: 1600 });
  await page.goto('https://app.cloudtype.io/@parkintaek2/seoulmarkets:main/web#settings', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.bringToFront();
  await new Promise(r => setTimeout(r, 14000));

  const 됐나 = await page.evaluate(() => {
    const 칸 = [...document.querySelectorAll('input,textarea')].find(e => (e.value||'').trim() === 'npm run build');
    if (!칸) return '칸을 못 찾았다';
    const proto = 칸 instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
    칸.focus();
    setter.call(칸, 'node scripts/받는다-지어진지면.mjs');
    칸.dispatchEvent(new Event('input', { bubbles: true }));
    칸.dispatchEvent(new Event('change', { bubbles: true }));
    칸.blur();
    return 'ok';
  });
  console.log('① 빌드 칸 — ' + 됐나);
  if (됐나 !== 'ok') throw new Error(됐나);
  await new Promise(r => setTimeout(r, 2500));

  const d = await page.evaluate(() => {
    const e = [...document.querySelectorAll('button')].filter(x => /배포하기|저장/.test((x.innerText||'').trim())).pop();
    if (!e) return null; e.scrollIntoView({ block: 'center' });
    const r = e.getBoundingClientRect();
    return { x: r.x + r.width/2, y: r.y + r.height/2, 글: (e.innerText||'').trim() };
  });
  if (!d) throw new Error('「배포하기」 단추가 없다');
  await new Promise(r => setTimeout(r, 1200));
  await page.mouse.click(d.x, d.y);
  console.log('② 「' + d.글 + '」를 눌렀다 — ' + new Date().toLocaleTimeString('ko-KR'));
  await new Promise(r => setTimeout(r, 15000));

  await page.goto('https://app.cloudtype.io/@parkintaek2/seoulmarkets:main/web#settings', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise(r => setTimeout(r, 13000));
  const 뒤 = await page.evaluate(() =>
    [...document.querySelectorAll('input,textarea')].map(e => (e.value||'').trim()).filter(Boolean).slice(-4).join(' | '));
  console.log('③ 다시 열어 본 값 — ' + 뒤);
} catch (e) { console.log('🔴 ' + e.message); }
finally { if (page) { try { await page.close(); } catch {} } try { b.disconnect(); } catch {} }
