// Batch "exclude from search" requests through the Search Advisor screen, one address at a time.
// Sends a request only when the public address is confirmed closed. Stops on a security check, an error answer, or a missing answer.
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire('file:///C:/Users/User/Documents/GitHub/dataeconomics/package.json');
const puppeteer = require('puppeteer-core');
const out = process.argv[2];
const ids = process.argv.slice(3);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
const page = await b.newPage();
let keep = false;
const log = [];
try {
  await page.setViewport({ width: 1360, height: 1000 });
  page.on('dialog', async (d) => { log.push('DIALOG ' + d.message().replace(/\n/g, ' ')); await d.accept().catch(() => {}); });
  let last = null;
  page.on('response', async (r) => {
    if (/api-console\/request\/delete/.test(r.url()) && r.request().method() === 'POST') {
      last = { status: r.status(), body: (await r.text().catch(() => '')).slice(0, 200) };
    }
  });
  await page.goto('https://searchadvisor.naver.com/console/site/request/delete?site=' + encodeURIComponent('https://www.jbnews.com'), { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await page.waitForSelector('input[type=text]', { timeout: 30000 }).catch(() => {});
  await sleep(2500);
  for (const id of ids) {
    const url = 'https://www.jbnews.com/news/articleView.html?idxno=' + id;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }).then((r) => r.text()).catch(() => '');
    if (!res.includes('\uC874\uC7AC\uD558\uC9C0 \uC54A\uB294 \uB9C1\uD06C')) { log.push(id + '\tSKIP public address is not closed'); console.log(log.at(-1)); continue; }
    const input = (await page.$$('input[type=text]')).pop();
    if (!input) { log.push(id + '\tSTOP no input field'); console.log(log.at(-1)); break; }
    await input.click();
    await page.keyboard.down('Control'); await page.keyboard.press('KeyA'); await page.keyboard.up('Control'); await page.keyboard.press('Backspace');
    await page.keyboard.type(url, { delay: 12 });
    await sleep(400);
    last = null;
    const pos = await page.evaluate(() => { const btn = [...document.querySelectorAll('button')].find((x) => x.innerText.trim() === '\uD655\uC778' && x.offsetParent); if (!btn) return null; const r = btn.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
    if (!pos) { log.push(id + '\tSTOP no confirm button'); console.log(log.at(-1)); break; }
    await page.mouse.click(pos[0], pos[1]);
    for (let i = 0; i < 16 && !last; i++) await sleep(500);
    const captcha = await page.evaluate(() => /\uBCF4\uC548\uC808\uCC28|\uAE00\uC790 \uBC0F \uC22B\uC790\uB97C \uC785\uB825/.test(document.body.innerText));
    if (captcha) { keep = true; await page.bringToFront(); log.push(id + '\tSTOP security check shown'); console.log(log.at(-1)); break; }
    if (!last) { log.push(id + '\tSTOP no answer from server'); console.log(log.at(-1)); break; }
    const ok = last.status === 200 && /"message":"SUCCESS"/.test(last.body);
    log.push(id + '\t' + (ok ? 'OK' : 'FAIL') + '\t' + last.status + '\t' + (ok ? '' : last.body));
    console.log(log.at(-1));
    if (!ok) break;
    await sleep(1800);
  }
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.waitForSelector('input[type=text]', { timeout: 30000 }).catch(() => {});
  await sleep(4000);
  const rows = await page.evaluate(() => [...document.querySelectorAll('table tbody tr')].map((tr) => tr.innerText.replace(/\s+/g, ' ').trim()).filter((t) => /idxno/.test(t)));
  console.log('LISTED ' + rows.length);
  for (const r of rows) console.log('   ' + r.slice(0, 110));
  await page.screenshot({ path: out + '/nsa-exclude-list.png', fullPage: true }).catch(() => {});
} finally {
  fs.appendFileSync(out + '/nsa-exclude-log.tsv', log.join('\n') + '\n');
  if (!keep) await page.close().catch(() => {});
  b.disconnect();
}
