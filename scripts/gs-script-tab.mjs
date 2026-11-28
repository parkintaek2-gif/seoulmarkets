#!/usr/bin/env node
// gs-script-tab.mjs — attach to the Apps Script tab opened by gs-open-script.mjs, try its continue address, print what shows.
//   node scripts/gs-script-tab.mjs <tab id> [--close]
import { 탭들, 탭붙기 } from './lib/cdp.mjs';
const [tabId] = process.argv.slice(2);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const t = (await 탭들()).find((x) => x.id === tabId);
if (!t) { console.log('no such tab'); process.exit(1); }
if (process.argv.includes('--close')) { await fetch('http://127.0.0.1:9222/json/close/' + tabId); console.log('closed'); process.exit(0); }
const c = await 탭붙기(t.webSocketDebuggerUrl);
await c.보내기('Page.enable'); await c.보내기('Runtime.enable');
const ev = async (js) => (await c.보내기('Runtime.evaluate', { expression: js, returnByValue: true, awaitPromise: true })).result.value;
console.log('now: ' + await ev('document.title + " | " + (document.body ? document.body.innerText.replace(/\s+/g, " ").slice(0, 300) : "")'));
const cont = new URL(t.url).searchParams.get('continueUrl');
if (cont && /^https:\/\/script\.google\.com\//.test(cont)) {
  await c.보내기('Page.navigate', { url: cont }); await wait(12000);
  console.log('after continue: ' + await ev('location.href.slice(0, 150) + " | " + document.title + " | " + (document.body ? document.body.innerText.replace(/\s+/g, " ").slice(0, 300) : "")'));
}
c.닫기();
