#!/usr/bin/env node
/**
 * 잰다-지역지면-살아있나.mjs — 지역 지면 전수를 눌러 본다.
 *
 * 🔴 [2026-11-17] 초등학교 261장이 28일 동안 순방문자 0명이었다.
 *   「냈다」를 「벌어 온다」로 읽지 않는다. 먼저 «손님이 여는 주소»로 눌러 본다.
 *
 * ⛔ 한글 주소를 셸 인자로 올리지 않는다 — CP949 로 읽혀 깨진다.
 *   그래서 주소를 이 안에서 짓는다.
 * ⛔ `/index.html` 같은 파일 이름으로 재지 않는다 — 손님과 네이버가 여는 것은 `/` 다.
 *
 * 쓰는 법
 *   node scripts/잰다-지역지면-살아있나.mjs --묶음=초등
 *   node scripts/잰다-지역지면-살아있나.mjs --묶음=고등 --몇장=20
 *   node scripts/잰다-지역지면-살아있나.mjs --selftest
 */
import fs from 'node:fs';
import path from 'node:path';

const 뿌리 = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1'), '..');

/* ── 슬러그를 어디서 얻나 ───────────────────────────────────────
   ⛔ 손으로 적지 않는다 — 지면을 짓는 자료와 «같은 곳»에서 읽는다.
   둘로 두면 하나가 늘 때 한쪽만 고쳐지고, 그때부터 다른 수가 나온다. */
function 슬러그들(묶음) {
  const 자리 = 묶음 === '초등'
    ? path.join(뿌리, 'src', 'pages', '100y', 'elementary', 'area')
    : path.join(뿌리, 'src', 'pages', '100y', 'report', 'area');
  /* 지면은 [slug].astro 한 장이 여러 주소를 낸다 — 사이트맵에서 읽는 편이 바르다 */
  return null;  /* 아래 사이트맵에서 읽는다 */
}

async function 사이트맵에서(묶음) {
  const 걸림 = 묶음 === '초등' ? '/elementary/area/' : '/report/area/';
  const 본다 = ['https://100yearmap.com/sitemap-index.xml', 'https://100yearmap.com/sitemap.xml',
    'https://100yearmap.com/sitemap-0.xml'];
  const 모은것 = new Set();
  const 더볼것 = [...본다];
  const 이미 = new Set();
  while (더볼것.length) {
    const u = 더볼것.shift();
    if (이미.has(u)) continue;
    이미.add(u);
    let 글 = '';
    try {
      const r = await fetch(u, { headers: { 'User-Agent': 'site-health-check' } });
      if (!r.ok) continue;
      글 = await r.text();
    } catch (e) { continue; }
    /* 사이트맵 묶음이면 안쪽 사이트맵을 더 본다 */
    for (const m of 글.matchAll(/<loc>([^<]+sitemap[^<]*)<\/loc>/gi)) 더볼것.push(m[1]);
    for (const m of 글.matchAll(/<loc>([^<]+)<\/loc>/gi)) {
      if (m[1].includes(걸림)) 모은것.add(m[1]);
    }
  }
  return [...모은것];
}

async function 눌러본다(주소) {
  const 시작 = Date.now();
  try {
    const r = await fetch(주소, { redirect: 'follow', headers: { 'User-Agent': 'site-health-check' } });
    const 글 = await r.text();
    return {
      코드: r.status,
      끝주소: r.url,
      글자: 글.length,
      제목: (글.match(/<title[^>]*>([^<]*)<\/title>/i) || [, ''])[1].trim(),
      걸린밀리: Date.now() - 시작,
    };
  } catch (e) {
    return { 코드: 0, 터짐: String(e.message || e), 걸린밀리: Date.now() - 시작 };
  }
}

/* ── 자가시험 ────────────────────────────────────────────────── */
function 자가시험() {
  const 봄 = [];
  const 본다 = (이름, 참) => 봄.push({ 이름, 참 });
  본다('뿌리가 저장소를 가리킨다', fs.existsSync(path.join(뿌리, 'package.json')));
  본다('초등 지면 코드가 있다',
    fs.existsSync(path.join(뿌리, 'src', 'pages', '100y', 'elementary', 'area', '[slug].astro')));
  본다('슬러그들은 사이트맵에 맡긴다', 슬러그들('초등') === null);
  let 깨짐 = 0;
  for (const s of 봄) if (!s.참) { console.log('🔴 ' + s.이름); 깨짐 += 1; }
  console.log(깨짐 ? `🔴 ${깨짐}가지 깨졌다` : `✅ ${봄.length}가지 다 통과`);
  return 깨짐 === 0;
}

/* ── 본 일 ───────────────────────────────────────────────────── */
async function 돈다(묶음, 몇장) {
  console.log(`\n📏 ${묶음}학교 지역 지면을 눌러 본다\n`);
  const 주소들 = await 사이트맵에서(묶음);
  console.log('  사이트맵에 있는 장 :', 주소들.length);
  if (!주소들.length) {
    console.log('  🔴 사이트맵에 한 장도 없다 — 네이버·구글이 이 지면을 «알 길이 없다»');
    console.log('     사이트맵에만 올리면 고아가 되지만, 사이트맵에 없으면 아예 모른다.');
    return;
  }

  const 볼것 = 몇장 && 몇장 < 주소들.length
    ? 주소들.filter((_, i) => i % Math.ceil(주소들.length / 몇장) === 0).slice(0, 몇장)
    : 주소들;
  console.log('  눌러 보는 장 :', 볼것.length, '\n');

  const 센다 = { 성함: 0, 깨짐: 0, 빈것: 0 };
  const 나쁜것 = [];
  for (let i = 0; i < 볼것.length; i += 1) {
    const r = await 눌러본다(볼것[i]);
    if (r.코드 !== 200) { 센다.깨짐 += 1; 나쁜것.push({ 주소: 볼것[i], ...r }); }
    else if (r.글자 < 3000) { 센다.빈것 += 1; 나쁜것.push({ 주소: 볼것[i], ...r }); }
    else 센다.성함 += 1;
    if (i < 3) console.log('   ' + r.코드 + '  ' + r.글자 + '자  ' + (r.제목 || '(제목 없음)'));
  }

  console.log('\n  성함 :', 센다.성함, '· 깨짐 :', 센다.깨짐, '· 속이 빈 것 :', 센다.빈것);
  if (나쁜것.length) {
    console.log('\n  🔴 나쁜 것 (위 10):');
    for (const x of 나쁜것.slice(0, 10)) {
      console.log('     ' + x.코드 + '  ' + decodeURIComponent(x.주소) + (x.터짐 ? '  ' + x.터짐 : ''));
    }
  }
}

const 인자 = process.argv.slice(2);
if (인자.includes('--selftest')) process.exit(자가시험() ? 0 : 1);
const 묶음 = (인자.find((a) => a.startsWith('--묶음=')) || '--묶음=초등').split('=')[1];
const 몇장 = Number((인자.find((a) => a.startsWith('--몇장=')) || '--몇장=0').split('=')[1]);
await 돈다(묶음, 몇장);
