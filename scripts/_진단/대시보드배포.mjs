/* 대시보드의 「배포하기」로 «지금 저장된 설정»으로 배포하고, 빌드 로그를 끝까지 받는다.
   ⛔ ctype update 는 «직전 배포의 설정»을 다시 쓴다 — 바꾼 빌드 명령이 안 실린다 (2026-11-17 확인) */
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
const 낼곳 = 'C:/Users/User/AppData/Local/Temp/u5-tmp/끝장면2.txt';
fs.writeFileSync(낼곳, '');
const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
let page = null;
try {
  page = await b.newPage();
  await page.setViewport({ width: 1600, height: 1600 });
  await page.goto('https://app.cloudtype.io/@parkintaek2/seoulmarkets:main/web#settings', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.bringToFront();
  await new Promise(r => setTimeout(r, 14000));
  const 지금설정 = await page.evaluate(() =>
    [...document.querySelectorAll('input,textarea')].map(e => (e.value||'').trim()).filter(Boolean).slice(-4).join(' | '));
  fs.appendFileSync(낼곳, '■ 저장된 설정 — ' + 지금설정 + '\n');
  const d = await page.evaluate(() => {
    const e = [...document.querySelectorAll('button')].filter(x => /배포하기/.test((x.innerText||'').trim())).pop();
    if (!e) return null; e.scrollIntoView({ block: 'center' });
    const r = e.getBoundingClientRect();
    return { x: r.x + r.width/2, y: r.y + r.height/2 };
  });
  if (!d) throw new Error('「배포하기」 단추가 없다');
  await new Promise(r => setTimeout(r, 1200));
  await page.mouse.click(d.x, d.y);
  fs.appendFileSync(낼곳, '■ 배포하기를 눌렀다 — ' + new Date().toLocaleTimeString('ko-KR') + '\n');
  await new Promise(r => setTimeout(r, 14000));
  await page.goto('https://app.cloudtype.io/@parkintaek2/seoulmarkets:main/web', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.bringToFront();
  await new Promise(r => setTimeout(r, 12000));
  const p = await page.evaluate(() => {
    const 행들 = [...document.querySelectorAll('*')].filter(x => (x.innerText||'').startsWith('no message') && x.querySelectorAll('svg').length >= 2 && x.querySelectorAll('svg').length < 10);
    const 행 = 행들[0]; if (!행) return null;
    const svgs = [...행.querySelectorAll('svg')]; const s = svgs[svgs.length - 2];
    const r = s.getBoundingClientRect();
    return { x: r.x + r.width/2, y: r.y + r.height/2 };
  });
  await page.mouse.click(p.x, p.y);
  const 머리 = fs.readFileSync(낼곳, 'utf8');
  for (let i = 0; i < 200; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const t = await page.evaluate(() => {
      const j = (document.body.innerText||'').indexOf('빌드로그');
      return j < 0 ? '' : document.body.innerText.slice(j).replace(/\*{12,}/g, '***');
    });
    if (t) fs.writeFileSync(낼곳, 머리 + t);
    if (/ServiceError|\bfailed\b|naming to|Successfully/i.test(t.slice(-2500))) {
      await new Promise(r => setTimeout(r, 4000));
      const 끝 = await page.evaluate(() => {
        const j = (document.body.innerText||'').indexOf('빌드로그');
        return j < 0 ? '' : document.body.innerText.slice(j).replace(/\*{12,}/g, '***');
      });
      fs.writeFileSync(낼곳, 머리 + 끝 + '\n■■ 끝났다');
      break;
    }
  }
} catch (e) { fs.appendFileSync(낼곳, '\n🔴 ' + e.message); }
finally { if (page) { try { await page.close(); } catch {} } try { b.disconnect(); } catch {} }
