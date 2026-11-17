/* build 와 start 를 지금 app.yaml 과 맞춘 뒤 대시보드로 배포한다.
   ⛔ ctype update 는 쓰지 않는다 — 직전 배포의 설정을 다시 써서 되돌려 놓는다 */
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
const 낼곳 = 'C:/Users/User/AppData/Local/Temp/u5-tmp/명령바꿈.txt';
fs.writeFileSync(낼곳, '');
const 적는다 = (s) => { fs.appendFileSync(낼곳, s + '\n'); console.log(s); };
const 새빌드 = 'echo "짓지도 받지도 않는다 - start 에서 받는다"';
const 새시작 = "node scripts/띄운다-서버.mjs";
const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
let page = null;
try {
  page = await b.newPage();
  await page.setViewport({ width: 1600, height: 1600 });
  await page.goto('https://app.cloudtype.io/@parkintaek2/seoulmarkets:main/web#settings', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.bringToFront();
  await new Promise(r => setTimeout(r, 14000));
  const r1 = await page.evaluate((a, b2) => {
    const 넣기 = (칸, 값) => {
      const proto = 칸 instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(칸, 값);
      칸.dispatchEvent(new Event('input', { bubbles: true }));
      칸.dispatchEvent(new Event('change', { bubbles: true }));
    };
    const 칸들 = [...document.querySelectorAll('input,textarea')];
    const 빌드 = 칸들.find(e => /받는다-지어진지면|npm run build|짓지도/.test(e.value||''));
    const 시작 = 칸들.find(e => /npm start|띄운다-서버/.test(e.value||''));
    if (!빌드 || !시작) return '빌드:' + !!빌드 + ' 시작:' + !!시작;
    넣기(빌드, a); 넣기(시작, b2);
    return 'ok';
  }, 새빌드, 새시작);
  적는다('① 칸 — ' + r1);
  if (r1 !== 'ok') throw new Error(r1);
  await new Promise(r => setTimeout(r, 2500));
  const d = await page.evaluate(() => {
    const e = [...document.querySelectorAll('button')].filter(x => /배포하기/.test((x.innerText||'').trim())).pop();
    if (!e) return null; e.scrollIntoView({ block: 'center' });
    const r = e.getBoundingClientRect();
    return { x: r.x+r.width/2, y: r.y+r.height/2 };
  });
  if (!d) throw new Error('「배포하기」 단추가 없다');
  await new Promise(r => setTimeout(r, 1200));
  await page.mouse.click(d.x, d.y);
  적는다('② 배포하기를 눌렀다 — ' + new Date().toLocaleTimeString('ko-KR'));
  await new Promise(r => setTimeout(r, 15000));
  await page.goto('https://app.cloudtype.io/@parkintaek2/seoulmarkets:main/web#settings', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise(r => setTimeout(r, 12000));
  const 뒤 = await page.evaluate(() =>
    [...document.querySelectorAll('input,textarea')].map(e => (e.value||'').trim()).filter(Boolean).slice(-3).join(' | '));
  적는다('③ 다시 열어 본 값 — ' + 뒤);
} catch (e) { 적는다('🔴 ' + e.message); }
finally { if (page) { try { await page.close(); } catch {} } try { b.disconnect(); } catch {} }
