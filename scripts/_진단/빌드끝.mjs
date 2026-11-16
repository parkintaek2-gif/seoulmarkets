import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
const ctype = 'C:/Users/User/AppData/Roaming/npm/node_modules/@cloudtype/cli/bin/ctype.js';
const 낼곳 = 'C:/Users/User/AppData/Local/Temp/u5-tmp/끝장면.txt';
const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
let page = null;
try {
  page = await b.newPage();
  await page.setViewport({ width: 1600, height: 1400 });
  await page.goto('https://app.cloudtype.io/@parkintaek2/seoulmarkets:main/web', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.bringToFront();
  await new Promise(r => setTimeout(r, 13000));
  await new Promise((res) => spawn(process.execPath, [ctype, 'update', 'web', '-t', '@parkintaek2/seoulmarkets:main'],
    { cwd: 'C:/Users/User/Documents/GitHub/dataeconomics', stdio: 'ignore' }).on('close', res));
  await new Promise(r => setTimeout(r, 6000));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.bringToFront();
  await new Promise(r => setTimeout(r, 11000));
  const p = await page.evaluate(() => {
    const 행들 = [...document.querySelectorAll('*')].filter(x => (x.innerText||'').startsWith('no message') && x.querySelectorAll('svg').length >= 2 && x.querySelectorAll('svg').length < 10);
    const 행 = 행들[0]; if (!행) return null;
    const svgs = [...행.querySelectorAll('svg')]; const s = svgs[svgs.length - 2];
    const r = s.getBoundingClientRect();
    return { x: r.x + r.width/2, y: r.y + r.height/2 };
  });
  await page.mouse.click(p.x, p.y);
  for (let i = 0; i < 180; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const t = await page.evaluate(() => {
      const j = (document.body.innerText||'').indexOf('빌드로그');
      return j < 0 ? '' : document.body.innerText.slice(j).replace(/\*{12,}/g, '***');
    });
    if (t) fs.writeFileSync(낼곳, t);
    if (/ServiceError|\bfailed\b|naming to|Successfully/i.test(t.slice(-2500))) {
      await new Promise(r => setTimeout(r, 4000));
      const 끝 = await page.evaluate(() => {
        const j = (document.body.innerText||'').indexOf('빌드로그');
        return j < 0 ? '' : document.body.innerText.slice(j).replace(/\*{12,}/g, '***');
      });
      fs.writeFileSync(낼곳, 끝 + '\n■■ 끝났다');
      break;
    }
  }
} catch (e) { fs.appendFileSync(낼곳, '\n🔴 ' + e.message); }
finally { if (page) { try { await page.close(); } catch {} } try { b.disconnect(); } catch {} }
