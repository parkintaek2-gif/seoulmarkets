#!/usr/bin/env node
/**
 * 만든다-그림-한장보기.mjs — **여러 장을 한 장에 모아 보여 준다.**
 * ═══════════════════════════════════════════════════════════════════════════
 * 사장님께 열두 장을 따로 보내면 메일이 20MB 를 넘고, 받는 쪽에서 하나씩 열어야 한다.
 * ⇒ 한 장으로 모아 **한눈에 보시게** 한다. 원본은 폴더에 그대로 둔다.
 *
 * ⛔ 크롬 9222 에 붙을 때 브라우저를 닫지 않는다 — 사장님 창이 닫힌다. disconnect() 만. 언제나 새 탭
 * ⛔ 연 탭은 finally 에서 닫는다
 *
 * 쓰는 법
 *   node scripts/만든다-그림-한장보기.mjs --방 <그림폴더> --낼곳 <파일.png> [--제목 "..."]
 *   node scripts/만든다-그림-한장보기.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

/** 파일 이름에서 보여 줄 이름을 뽑는다 — 「그림-연중01-손없는날-이사날짜.png」 → 「01 손없는날 이사날짜」 */
export function 보일이름(파일) {
  return String(파일 ?? '')
    .replace(/\.(png|jpg|jpeg|webp)$/i, '')
    .replace(/^그림-연중/, '')
    .replace(/-/g, ' ')
    .trim();
}

/** 폴더에서 그림을 차례대로 모은다 */
export function 그림모으기(방) {
  if (!fs.existsSync(방)) return [];
  return fs.readdirSync(방)
    .filter((n) => /\.(png|jpg|jpeg|webp)$/i.test(n))
    .sort()
    .map((n) => ({ 파일: n, 길: path.join(방, n), 이름: 보일이름(n) }));
}

/** 한 장짜리 화면을 짓는다 — ⚠ 그림은 data: 로 박아 넣는다(파일 주소는 크롬이 막는다) */
export function 화면짓기(것들, 제목) {
  const 칸 = 것들.map((x) => {
    const 자료 = fs.readFileSync(x.길).toString('base64');
    const 갈래 = /\.jpe?g$/i.test(x.파일) ? 'image/jpeg' : 'image/png';
    return `<figure><img src="data:${갈래};base64,${자료}" alt=""><figcaption>${x.이름}</figcaption></figure>`;
  }).join('\n');
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#faf8f5;font-family:'Malgun Gothic','맑은 고딕',system-ui,sans-serif;padding:28px 24px 34px}
  h1{font-size:20px;color:#2b2b2b;margin-bottom:6px}
  p.note{font-size:12.5px;color:#7a7368;margin-bottom:20px}
  .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
  figure{background:#fff;border:1px solid #e6e0d8;border-radius:10px;overflow:hidden}
  img{display:block;width:100%;aspect-ratio:1/1;object-fit:cover}
  figcaption{font-size:12px;color:#4a4540;padding:7px 9px;border-top:1px solid #efeae3}
</style></head><body>
<h1>${제목}</h1>
<p class="note">원본은 docs/그림-연중기획/ 에 한 장씩 들어 있습니다. 신문 지면에는 쓰지 않습니다.</p>
<div class="grid">${칸}</div>
</body></html>`;
}

async function 주다() {
  if (process.argv.includes('--자가시험')) return 자가시험();
  const 값 = (이름) => { const i = process.argv.indexOf(이름); return i >= 0 ? process.argv[i + 1] : null; };
  const 방 = 값('--방'); const 낼곳 = 값('--낼곳');
  const 제목 = 값('--제목') || '그림 한눈에 보기';
  if (!방 || !낼곳) { console.log('쓰는 법: --방 <폴더> --낼곳 <파일.png> [--제목 "..."]'); process.exit(1); }

  const 것들 = 그림모으기(방);
  if (!것들.length) { console.log('🔴 그림이 없다 — ' + 방); process.exit(1); }

  /* ⚠ 상대 주소를 그대로 file:// 에 붙이면 뿌리(/docs/…)로 읽혀 못 찾는다 — 반드시 절대 주소로 */
  const 낼곳절대 = path.resolve(낼곳);
  const 임시 = path.join(path.dirname(낼곳절대), '_한장보기.html');
  fs.mkdirSync(path.dirname(낼곳절대), { recursive: true });
  fs.writeFileSync(임시, 화면짓기(것들, 제목), 'utf8');

  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await b.newPage();
  try {
    await page.setViewport({ width: 1480, height: 1200, deviceScaleFactor: 1 });
    await page.goto('file:///' + 임시.replace(/\\/g, '/'), { waitUntil: 'networkidle0', timeout: 90000 });
    await new Promise((r) => setTimeout(r, 900));
    await page.screenshot({ path: 낼곳절대, fullPage: true });
    console.log(`✅ ${것들.length}장을 한 장에 모았다 — ${낼곳절대} (${Math.round(fs.statSync(낼곳절대).size / 1024)}KB)`);
  } finally {
    await page.close();
    await b.disconnect();
    try { fs.unlinkSync(임시); } catch { /* 지워지면 그만이다 */ }
  }
}

function 자가시험() {
  let 통 = 0; let 탈 = 0;
  const 검 = (이름, 참) => { if (참) { 통++; console.log('✅', 이름); } else { 탈++; console.log('🔴', 이름); } };
  const 나 = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8');

  검('🔴 파일 이름에서 보일 이름을 뽑는다',
    보일이름('그림-연중01-손없는날-이사날짜.png') === '01 손없는날 이사날짜');
  검('⛔ 확장자를 떼어 낸다', !보일이름('가-나.jpg').includes('.jpg'));
  검('⛔ 없는 폴더는 빈 목록', 그림모으기(path.join('없는', '폴더')).length === 0);
  검('🔴 그림을 이름 차례로 모은다', (() => {
    const 방 = path.join(process.env.TEMP || '.', '_한장보기시험');
    fs.mkdirSync(방, { recursive: true });
    fs.writeFileSync(path.join(방, '나.png'), 'x');
    fs.writeFileSync(path.join(방, '가.png'), 'x');
    const r = 그림모으기(방).map((x) => x.파일);
    fs.rmSync(방, { recursive: true, force: true });
    return r.length === 2 && r[0] < r[1];
  })());
  /* ⚠ 자가시험 글 자체가 걸리지 않게 낱말을 쪼갠다 */
  검('⛔ 크롬을 닫지 않는다 — disconnect 만 쓴다',
    나.includes('disconnect()') && !new RegExp('\\bb\\.' + 'clo' + 'se\\(\\)').test(나));
  검('⛔ 연 탭을 끝나는 자리에서 닫는다', /finally[\s\S]{0,120}page\.close\(\)/.test(나));
  검('🔴 그림을 data: 로 박는다 — 파일 주소는 크롬이 막는다', 나.includes("'data:'") || 나.includes('data:${갈래}'));

  console.log(탈 ? `\n🔴 자가시험 ${탈}건 탈` : `\n✅ 자가시험 ${통} 통과`);
  process.exit(탈 ? 1 : 0);
}

const 나를직접돌렸나 = (process.argv[1] || '').replace(/\\/g, '/').endsWith('만든다-그림-한장보기.mjs');
if (나를직접돌렸나) await 주다();
