#!/usr/bin/env node
/**
 * 만든다-표그림.mjs — **표를 그림 한 장으로 만든다.**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔴🔴 [2026-11-11 · 사장님] 「**word파일로 줄 것. 표는 깨지지 않게 이미지로 줄 것**」
 *
 * 표를 글자로 붙이면 받는 쪽 편집기마다 칸이 어긋난다. 그림이면 어디서 열어도 같다.
 *
 * ⛔ 크롬 9222 에 붙을 때 브라우저를 통째로 닫는 호출은 금지 — disconnect() 만. 언제나 새 탭.
 * ⛔ 연 탭은 그 일이 끝나는 자리에서 닫는다.
 *
 * 쓰는 법
 *   node scripts/만든다-표그림.mjs --자료 <표.json> --낼곳 <그림.png>
 *   node scripts/만든다-표그림.mjs --자가시험
 *
 * 자료 꼴 — { 제목, 부제, 머리: [..], 줄: [[..], [..]] }
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** 글자를 그대로 보이게 막는다 — 표 안의 글이 화면 꼴을 망가뜨리지 않게 */
export function 막기(글) {
  return String(글 ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function 화면만들기({ 제목, 부제, 머리, 줄 }) {
  const 칸머리 = (머리 ?? []).map((h) => '<th>' + 막기(h) + '</th>').join('');
  const 몸 = (줄 ?? []).map((r) => '<tr>'
    + r.map((c, i) => '<td class="' + (i === 0 ? 'first' : '') + '">' + 막기(c) + '</td>').join('')
    + '</tr>').join('');
  return '<!doctype html><html lang="ko"><head><meta charset="utf-8">'
    + '<style>'
    + 'body{margin:0;padding:28px 32px;background:#fff;'
    + "font-family:'Malgun Gothic','맑은 고딕',sans-serif;color:#1a1a1a}"
    + 'h1{margin:0 0 4px;font-size:21px;letter-spacing:-0.3px}'
    + 'p.sub{margin:0 0 16px;font-size:13px;color:#555}'
    + 'table{border-collapse:collapse;width:100%;font-size:14px}'
    + 'th{background:#2b3a55;color:#fff;font-weight:600;padding:9px 10px;text-align:left;'
    + 'border:1px solid #2b3a55;white-space:nowrap}'
    + 'td{padding:8px 10px;border:1px solid #d6dae2;vertical-align:top;line-height:1.55}'
    + 'td.first{background:#f2f5f9;font-weight:600;white-space:nowrap;width:70px}'
    + 'tr:nth-child(even) td{background:#fafbfd}'
    + 'tr:nth-child(even) td.first{background:#eef2f7}'
    + '</style></head><body>'
    + '<h1>' + 막기(제목) + '</h1>'
    + (부제 ? '<p class="sub">' + 막기(부제) + '</p>' : '')
    + '<table><thead><tr>' + 칸머리 + '</tr></thead><tbody>' + 몸 + '</tbody></table>'
    + '</body></html>';
}

async function 주다() {
  if (process.argv.includes('--자가시험')) return 자가시험();
  const 값 = (이름) => { const i = process.argv.indexOf(이름); return i >= 0 ? process.argv[i + 1] : null; };
  const 자료길 = 값('--자료');
  const 낼곳 = 값('--낼곳');
  if (!자료길 || !낼곳) { console.log('쓰는 법: --자료 <표.json> --낼곳 <그림.png>'); process.exit(1); }

  const 자료 = JSON.parse(fs.readFileSync(자료길, 'utf8'));
  const 화면 = 화면만들기(자료);
  const 임시 = path.resolve(path.dirname(낼곳), '.표-임시.html');
  fs.mkdirSync(path.dirname(낼곳), { recursive: true });
  fs.writeFileSync(임시, 화면, 'utf8');

  const { default: puppeteer } = await import('puppeteer-core');
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const p = await b.newPage();
  try {
    await p.setViewport({ width: 980, height: 300, deviceScaleFactor: 2 });
    await p.goto('file:///' + 임시.replace(/\\/g, '/'), { waitUntil: 'networkidle0', timeout: 30000 });
    await p.screenshot({ path: path.resolve(낼곳), fullPage: true });
    console.log('✅ 표를 그림으로 만들었다 — ' + path.resolve(낼곳)
      + ' (' + Math.round(fs.statSync(path.resolve(낼곳)).size / 1024) + 'KB)');
  } finally {
    await p.close();
    await b.disconnect();
    fs.rmSync(임시, { force: true });
  }
}

function 자가시험() {
  let 통 = 0; let 탈 = 0;
  const 검 = (이름, 참) => { if (참) { 통++; console.log('✅', 이름); } else { 탈++; console.log('🔴', 이름); } };
  const 나 = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8');

  const h = 화면만들기({ 제목: 'ㄱ', 부제: 'ㄴ', 머리: ['달', '날짜'], 줄: [['1월', '6일'], ['2월', '5일']] });
  검('🔴 제목과 부제가 들어간다', h.includes('>ㄱ<') && h.includes('>ㄴ<'));
  검('🔴 머리 칸이 들어간다', h.includes('<th>달</th>') && h.includes('<th>날짜</th>'));
  검('🔴 줄이 두 개다', (h.match(/<tr><td/g) || []).length === 2);
  검('🔴 첫 칸에 표시가 붙는다', h.includes('class="first"'));
  검('⛔ 꺾쇠가 글자로 들어가면 막는다', 화면만들기({ 제목: '<b>', 머리: [], 줄: [] }).includes('&lt;b&gt;'));
  검('⛔ 빈 자료에 안 터진다', 화면만들기({}).includes('<table>'));
  검('⛔ 부제가 없으면 그 줄을 안 넣는다', !화면만들기({ 제목: 'ㄱ', 머리: [], 줄: [] }).includes('class="sub"'));
  /* 🔴 사장님 창이 닫히면 안 된다 — 이 두 줄은 영원히 지키는 것이다 */
  검('⛔ 브라우저를 닫지 않는다',
    !new RegExp('b[.]clo' + 'se[(]').test(나) && 나.includes('disconnect()'));
  검('⛔ 연 탭을 그 자리에서 닫는다', 나.includes('p.close()') && 나.includes('finally'));
  검('🔴 사장님 지시를 적어 두었다', 나.includes('표는 깨지지 않게 이미지로'));

  console.log(탈 ? '\n🔴 자가시험 ' + 탈 + '건 탈' : '\n✅ 자가시험 ' + 통 + ' 통과');
  process.exit(탈 ? 1 : 0);
}

const 나를직접돌렸나 = String(process.argv[1] ?? '').endsWith('만든다-표그림.mjs');
if (나를직접돌렸나) await 주다();
