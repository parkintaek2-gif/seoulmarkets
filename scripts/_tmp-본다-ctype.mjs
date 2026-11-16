import puppeteer from 'puppeteer-core';
const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
let page = null;
try {
  page = await b.newPage();
  await page.setViewport({ width: 1600, height: 1200 });
  await page.goto('https://app.cloudtype.io/@parkintaek2/seoulmarkets:main/web#settings', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise(r => setTimeout(r, 9000));
  const 찾기 = (글) => page.evaluate((g) => {
    const e = [...document.querySelectorAll('*')].filter(x =>
      x.children.length===0 && (x.innerText||'').trim()===g).pop();
    if (!e) return null; const r = e.getBoundingClientRect();
    return r.width>0 ? { x:r.x+r.width/2, y:r.y+r.height/2 } : null;
  }, 글);
  const p = await 찾기('0.5GB');
  if (!p) throw new Error('0.5GB 고르개 없음 — 이미 바뀌었을 수 있다');
  await page.mouse.click(p.x, p.y);
  await new Promise(r => setTimeout(r, 4000));
  const g = await 찾기('1GB');
  if (!g) throw new Error('1GB 항목 없음');
  await page.mouse.click(g.x, g.y);
  await new Promise(r => setTimeout(r, 3000));
  console.log('① 메모리 1GB 를 골랐다');

  const d = await page.evaluate(() => {
    const e = [...document.querySelectorAll('button')].filter(x=>(x.innerText||'').trim()==='배포하기').pop();
    if (!e) return null; e.scrollIntoView({block:'center'}); const r = e.getBoundingClientRect();
    return { x:r.x+r.width/2, y:r.y+r.height/2 };
  });
  if (!d) throw new Error('「배포하기」 단추 없음');
  await new Promise(r => setTimeout(r, 1500));
  await page.mouse.click(d.x, d.y);
  console.log('② 「배포하기」를 눌렀다 — ' + new Date().toLocaleTimeString('ko-KR'));
  await new Promise(r => setTimeout(r, 15000));

  const 뒤 = await page.evaluate(() => {
    const t = (document.body.innerText||'').replace(/\n{2,}/g,'\n');
    return { 성능: (t.match(/성능[\s\S]{0,60}/)||[''])[0].replace(/\n/g,' '),
      계정: (t.match(/[\d.]+GB of 2GB/)||['?'])[0],
      상태: (t.match(/(빌드 중|배포 중|실행 중|대기|중지)[^\n]{0,20}/)||['?'])[0] };
  });
  console.log('③ ' + 뒤.성능);
  console.log('③ 계정 ' + 뒤.계정 + ' · 상태 ' + 뒤.상태);
  await page.screenshot({ path: 'C:/Users/User/AppData/Local/Temp/claude/112258f41787d32a/033739c7-59f8-4c4d-895e-94f02fa73ace/scratchpad/ctype배포.png' });
} catch (e) { console.log('🔴 ' + e.message); }
finally { if (page) { try { await page.close(); } catch {} } try { b.disconnect(); } catch {} }
