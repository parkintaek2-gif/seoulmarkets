/* 메모리를 0.5GB 로 내리고 빌드 명령을 맞춘 뒤 대시보드로 배포하고 로그를 받는다 */
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
const 낼곳 = 'C:/Users/User/AppData/Local/Temp/u5-tmp/끝장면4.txt';
const 새명령 = 'node scripts/받는다-지어진지면.mjs';
fs.writeFileSync(낼곳, '');
const 적는다 = (s) => fs.appendFileSync(낼곳, s + '\n');
const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
let page = null;
try {
  page = await b.newPage();
  await page.setViewport({ width: 1600, height: 1600 });
  await page.goto('https://app.cloudtype.io/@parkintaek2/seoulmarkets:main/web#settings', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.bringToFront();
  await new Promise(r => setTimeout(r, 14000));

  const 찾기 = (글) => page.evaluate((g) => {
    const e = [...document.querySelectorAll('*')].filter(x => x.children.length === 0 && (x.innerText||'').trim() === g).pop();
    if (!e) return null; const r = e.getBoundingClientRect();
    return r.width > 0 ? { x: r.x + r.width/2, y: r.y + r.height/2 } : null;
  }, 글);

  const 고르개 = await 찾기('768MB') || await 찾기('0.75GB');
  if (고르개) {
    await page.mouse.click(고르개.x, 고르개.y);
    await new Promise(r => setTimeout(r, 3500));
    const 반 = await 찾기('512MB') || await 찾기('0.5GB');
    if (!반) 적는다('⚠ 0.5GB 항목을 못 찾았다');
    else { await page.mouse.click(반.x, 반.y); await new Promise(r => setTimeout(r, 3000)); 적는다('① 메모리 0.5GB 를 골랐다'); }
  } else 적는다('① 메모리 고르개를 못 찾았다(이미 0.5 일 수 있다)');

  const r1 = await page.evaluate((새명령) => {
    const 칸 = [...document.querySelectorAll('input,textarea')].find(e => (e.value||'').trim() === 'npm run build');
    if (!칸) return '이미 바뀌어 있다';
    const proto = 칸 instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(칸, 새명령);
    칸.dispatchEvent(new Event('input', { bubbles: true }));
    칸.dispatchEvent(new Event('change', { bubbles: true }));
    return 'ok';
  }, 새명령);
  적는다('② 빌드 칸 — ' + r1);
  await new Promise(r => setTimeout(r, 2500));

  const d = await page.evaluate(() => {
    const e = [...document.querySelectorAll('button')].filter(x => /배포하기/.test((x.innerText||'').trim())).pop();
    if (!e) return null; e.scrollIntoView({ block: 'center' });
    const r = e.getBoundingClientRect();
    return { x: r.x + r.width/2, y: r.y + r.height/2 };
  });
  if (!d) throw new Error('「배포하기」 단추가 없다');
  await new Promise(r => setTimeout(r, 1200));
  await page.mouse.click(d.x, d.y);
  적는다('③ 배포하기를 눌렀다 — ' + new Date().toLocaleTimeString('ko-KR'));
  await new Promise(r => setTimeout(r, 14000));

  await page.goto('https://app.cloudtype.io/@parkintaek2/seoulmarkets:main/web#settings', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise(r => setTimeout(r, 12000));
  const 뒤 = await page.evaluate(() => {
    const t = (document.body.innerText||'');
    const m = t.match(/\d+MB\s*Memory/) || t.match(/Memory/);
    const 값 = [...document.querySelectorAll('input,textarea')].map(e => (e.value||'').trim()).filter(Boolean).slice(-4).join(' | ');
    return (m ? m[0] : '?') + ' · ' + 값;
  });
  적는다('④ 다시 열어 본 것 — ' + 뒤);
} catch (e) { 적는다('🔴 ' + e.message); }
finally { if (page) { try { await page.close(); } catch {} } try { b.disconnect(); } catch {} }
