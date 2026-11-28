#!/usr/bin/env node
// check-privacy-gate.mjs — does the live site really leave EEA/UK/CH visitors untracked? (GDPR/CCPA, 2026-11-28)
// Opens the given pages in a new Chrome tab twice: once with the browser time zone set to Europe/Berlin, once to Asia/Seoul.
// Europe: window.__privacyHold must be 'region' and no Google Analytics, AdSense, Naver Analytics or Google SWG script may be in the page.
// Seoul:  window.__privacyHold must be '' and the Naver Analytics script must be present (so we know the gate did not simply break everything).
// usage: node scripts/check-privacy-gate.mjs [url ...]     exit code 1 when any expectation fails
import { 새탭에서, 자리잡기, 재기 } from './lib/cdp.mjs';
const urls = process.argv.slice(2).length ? process.argv.slice(2) : ['https://seoulmarkets.com/', 'https://seoulmarkets.com/privacy', 'https://seoulmarkets.com/equities', 'https://100yearmap.com/'];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const readJs = `JSON.stringify({ hold: window.__privacyHold, gaSkip: window.__gaSkip, scripts: [...document.querySelectorAll('script[src]')].map((s) => s.src).filter((u) => /googletagmanager|google-analytics|googlesyndication|doubleclick|wcs\\.pstatic|wcslog|news\\.google\\.com\\/swg/.test(u)).map((u) => u.split('?')[0]) })`;
let bad = 0;
for (const url of urls) {
  for (const zone of ['Europe/Berlin', 'Asia/Seoul']) {
    const sep = url.includes('?') ? '&' : '?';
    const out = await 새탭에서('about:blank', async (c) => {
      await c.보내기('Emulation.setTimezoneOverride', { timezoneId: zone });
      await c.보내기('Page.navigate', { url: url + sep + 'gate=' + Date.now() });
      await 자리잡기(c, { 최대: 45000 }); await wait(5000);
      return JSON.parse(String(await 재기(c, readJs, 20000)));
    });
    let ok;
    if (zone === 'Europe/Berlin') ok = out.hold === 'region' && out.scripts.length === 0;
    else ok = out.hold === '' && out.scripts.some((u) => /wcslog/.test(u));
    if (!ok) bad += 1;
    console.log((ok ? 'OK  ' : 'BAD ') + zone.padEnd(14) + url + ' hold=' + JSON.stringify(out.hold) + ' gaSkip=' + JSON.stringify(out.gaSkip) + ' scripts=' + JSON.stringify(out.scripts));
  }
}
console.log(bad ? 'FAILED ' + bad : 'all expectations met');
process.exit(bad ? 1 : 0);
