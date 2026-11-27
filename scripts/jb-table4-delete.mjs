#!/usr/bin/env node
/**
 * jb-table4-delete.mjs - JB News, owner's table of 2026-11-27: delete ONE approved article (1513024).
 * Guards: the id and its exposure date are fixed here; the row must be on screen; the row text must carry
 * the title read this morning; exactly one checkbox may be on and it must be this id. Otherwise nothing is pressed.
 *
 *   node scripts/jb-table4-delete.mjs            (look only)
 *   node scripts/jb-table4-delete.mjs --delete
 */
import fs from 'node:fs';
import { 새탭에서, 자리잡기, 재기 } from './lib/cdp.mjs';
const ID = '1513024'; const DAY = '2026-10-07';
const really = process.argv.includes('--delete');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const dir = fs.readdirSync('docs').find((d) => { try { return fs.readdirSync('docs/' + d).some((f) => f.endsWith('-20261127.json') && f.includes('1-')); } catch { return false; } });
const checkFile = fs.readdirSync('docs/' + dir).filter((f) => f.endsWith('-20261127.json')).map((f) => 'docs/' + dir + '/' + f)
  .find((p) => { try { const j = JSON.parse(fs.readFileSync(p, 'utf8')); return Array.isArray(j) && j.some((r) => Object.values(r).includes(ID) && Object.values(r).some((v) => v && typeof v === 'object')); } catch { return false; } });
const rec = JSON.parse(fs.readFileSync(checkFile, 'utf8')).find((r) => Object.values(r).includes(ID));
const state = Object.values(rec).filter((v) => v && typeof v === 'object' && !Array.isArray(v)).pop();
const title = String(Object.values(state)[0]);
console.log('title on record: ' + title.length + ' chars, from ' + checkFile.replace(/[^\x20-\x7e]/g, '?'));
const search = `(() => { const f = document.getElementById('integrationSearchForm'); if (!f) return 'no form';
  for (const [n, v] of [['sc_date', 'S'], ['sc_sdate', '${DAY}'], ['sc_edate', '${DAY}'], ['sc_list_per_page', '100']]) { const e = f.elements[n]; if (!e) return n + ' missing'; e.disabled = false; e.removeAttribute('disabled'); e.value = v; e.dispatchEvent(new Event('change', { bubbles: true })); e.disabled = false; }
  f.submit(); return 'submitted'; })()`;
const look = `(() => { const tr = document.querySelector('tr[data-article_idxno="${ID}"]'); const c = document.getElementById('chkbox_${ID}');
  return JSON.stringify({ rows: document.querySelectorAll('tr[data-article_idxno]').length, hasRow: !!tr, hasChk: !!c, chkValue: c ? String(c.value) : '',
    rowText: tr ? tr.innerText.replace(/\s+/g, ' ') : '', del: document.querySelectorAll('.allDel-btn').length }); })()`;
const tick = `(() => { const c = document.getElementById('chkbox_${ID}'); if (!c) return JSON.stringify({ on: null }); if (!c.checked) c.click();
  return JSON.stringify({ on: [...document.querySelectorAll('input[type=checkbox]')].filter((e) => e.checked).map((e) => (e.id || e.name || '?') + '=' + e.value) }); })()`;
const press = `(() => { const b = document.querySelector('.allDel-btn'); if (!b) return 'no button'; b.click(); return 'pressed'; })()`;
const dialogs = [];
const result = await 새탭에서('https://cms.jbnews.com/news/adminArticleIntegrationRecognition2.html?sc_area=RW', async (t) => {
  t.듣기('Page.javascriptDialogOpening', (e) => { dialogs.push(String((e && e.message) || '')); t.보내기('Page.handleJavaScriptDialog', { accept: true }).catch(() => {}); });
  await 자리잡기(t, { 최대: 45000 }); await wait(3000);
  const s = String(await 재기(t, search, 25000));
  if (s !== 'submitted') return { stop: 'search: ' + s };
  await wait(8000); await 자리잡기(t, { 최대: 45000 }); await wait(2500);
  const a = JSON.parse(String(await 재기(t, look, 25000)));
  if (!a.hasRow || !a.hasChk || a.chkValue !== ID || a.del !== 1) return { stop: 'row/checkbox/button not as expected', a };
  if (!a.rowText.includes(title.slice(0, 12))) return { stop: 'row title differs from the record', a };
  if (!really) return { lookOnly: true, a };
  const on = JSON.parse(String(await 재기(t, tick, 25000))).on;
  if (!on || on.length !== 1 || !on[0].endsWith('=' + ID) || !on[0].startsWith('chkbox_' + ID)) return { stop: 'checked boxes are not exactly this one', on };
  const p = String(await 재기(t, press, 25000));
  if (p !== 'pressed') return { stop: p };
  await wait(9000); await 자리잡기(t, { 최대: 45000 }); await wait(2500);
  let b = null; try { b = JSON.parse(String(await 재기(t, look, 25000))); } catch { b = null; }
  return { pressed: true, before: a, on, after: b };
});
const show = JSON.parse(JSON.stringify(result)); for (const k of ['a', 'before', 'after']) if (show[k] && show[k].rowText) show[k].rowText = show[k].rowText.slice(0, 160);
console.log(JSON.stringify(show, null, 1));
console.log('dialogs: ' + JSON.stringify(dialogs));
fs.writeFileSync('docs/jb-table4-delete-log-20261127.json', JSON.stringify({ at: new Date().toLocaleString('sv'), id: ID, result, dialogs }, null, 1));
if (result.stop) process.exit(1);
