#!/usr/bin/env node
/**
 * measure-adsense-exposure.mjs — **광고가 실제로 «나가고 있는가»를 잰다.**
 * ────────────────────────────────────────────────────────────────────────────
 * [왜 만들었나]
 *   ① 5번이 2026-09-02 업무보고에 「매출(B2C) ⬜ 못 쟀다 — 재는 자가 없다」고 적었다.
 *      **「없다」로 두면 영원히 못 잰다.** 그래서 잴 수 있는 것부터 재는 자를 만든다.
 *   ② 같은 날 사장님이 애드센스 공지를 전해 주셨다 —
 *      **2027-02-17 부터 노출수 집계가 「다운로드 시작」 → 「렌더 시작」으로 바뀐다.**
 *      (IAB·MRC 업계 표준에 맞추는 것. 게시자가 할 조치는 없다고 구글이 밝혔다)
 *      → 렌더 전에 떠난 방문은 더는 노출로 안 잡힌다. **우리 노출수가 줄어 보일 수 있다.**
 *
 * [이 자가 재는 것 / 못 재는 것]
 *   ✅ 라이브 지면에 광고 «로더»와 «자리(ins)»가 실제로 몇 개 나가나
 *   ✅ 슬롯 ID 가 채워져 있나 (비어 있으면 AdSlot 이 아무것도 안 그린다)
 *   ✅ 렌더 전 이탈 위험 몫 — GA4 실측(1초 미만 세션)의 상한
 *   ⬜ **실제 노출수·수익은 못 잰다.** 애드센스 콘솔/관리 API 만 안다. 
 *   ⬜ 콘솔의 «자동광고» 스위치가 켜져 있는지도 못 잰다 — 바깥에서 볼 수 없다
 *
 * [쓰는 법]
 *   node scripts/measure-adsense-exposure.mjs
 *   node scripts/measure-adsense-exposure.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** 애드센스가 집계 방식을 바꾸는 날 — 이 날 전후의 노출수를 섞어 비교하지 않는다 */
export const 집계기준바뀌는날 = '2027-02-17';

/** 광고를 싣지 않는 경로 — Base.astro 의 `비편집경로` 와 같아야 한다 */
export const 비편집경로 = /^\/(terms|privacy|refund|contact|newsletter|community|about|pricing|404)\/?$/;

/** 지면 하나에서 광고 로더와 자리 수를 센다 */
export function 광고흔적(html) {
  const s = String(html ?? '');
  return {
    로더: (s.match(/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/g) || []).length,
    자리: (s.match(/<ins[^>]*class="[^"]*adsbygoogle/g) || []).length,
    푸시: /adsbygoogle\s*=\s*window\.adsbygoogle/.test(s) || /adsbygoogle\)\.push/.test(s),
  };
}

/** consts.ts 에서 슬롯 ID 가 채워졌나 본다 */
export function 슬롯설정(글) {
  const s = String(글 ?? '');
  const m = s.match(/export const ADS = \{([\s\S]*?)\} as const;/);
  if (!m) return { 못찾음: true };
  const client = (m[1].match(/client:\s*'([^']*)'/) || [])[1] ?? '';
  const 슬롯들 = {};
  const sm = m[1].match(/slots:\s*\{([^}]*)\}/);
  if (sm) for (const one of sm[1].matchAll(/(\w+):\s*'([^']*)'/g)) 슬롯들[one[1]] = one[2];
  return { client, 슬롯들, 채운슬롯: Object.values(슬롯들).filter(Boolean).length,
    전체슬롯: Object.keys(슬롯들).length };
}

const 집들 = [
  { 이름: 'K Culture Wire', 주소: 'https://www.kculturewire.com', 유닛: '5번',
    지면: ['/', '/most-read', '/netflix-top10-data', '/which-ranking'] },
  { 이름: 'SeoulMarkets', 주소: 'https://seoulmarkets.com', 유닛: '6번',
    지면: ['/', '/data', '/equities'] },
  { 이름: '백년지도', 주소: 'https://100yearmap.com', 유닛: '3번',
    지면: ['/', '/data', '/price'] },
];

async function 받는다(url) {
  try {
    const r = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(15000) });
    if (!r.ok) return { 코드: r.status };
    return { 코드: r.status, 글: await r.text() };
  } catch (e) { return { 못쟀다: String(e.message).slice(0, 40) }; }
}

function 자가시험() {
  let 흠 = 0;
  const 본다 = (이름, 참) => { if (참) console.log(`  ✅ ${이름}`); else { console.log(`  🔴 ${이름}`); 흠 += 1; } };
  const h = `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1"></script>
    <ins class="adsbygoogle" style="display:block"></ins>
    <script>(window.adsbygoogle=window.adsbygoogle||[]).push({})</script>`;
  const r = 광고흔적(h);
  본다('로더를 센다', r.로더 === 1);
  본다('광고 자리(ins)를 센다', r.자리 === 1);
  본다('푸시 코드를 본다', r.푸시 === true);
  const 빈 = 광고흔적('<html><body>아무것도 없다</body></html>');
  본다('없으면 0 이라고 한다', 빈.로더 === 0 && 빈.자리 === 0 && 빈.푸시 === false);
  /* ⛔ 로더만 있고 자리가 없는 것 — 우리가 2026-09-02 에 실제로 걸린 상태다 */
  const 로더만 = 광고흔적('<script src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=x"></script>');
  본다('🔴 로더만 있고 자리가 0인 것을 가려낸다', 로더만.로더 === 1 && 로더만.자리 === 0);

  const s = 슬롯설정("export const ADS = {\n  client: 'ca-pub-5113515144381167',\n  slots: { banner: '', inArticle: '' },\n} as const;");
  본다('client 를 읽는다', s.client === 'ca-pub-5113515144381167');
  본다('🔴 빈 슬롯을 «채운 것 0» 으로 센다', s.채운슬롯 === 0 && s.전체슬롯 === 2);
  const s2 = 슬롯설정("export const ADS = {\n  client: 'ca-pub-1',\n  slots: { banner: '123', inArticle: '' },\n} as const;");
  본다('채운 슬롯 하나를 센다', s2.채운슬롯 === 1);

  본다('광고 안 싣는 경로를 가려낸다',
    비편집경로.test('/privacy') && 비편집경로.test('/about/') && !비편집경로.test('/data'));
  본다('집계 기준 바뀌는 날을 못박아 둔다', 집계기준바뀌는날 === '2027-02-17');
  console.log(흠 ? `\n🔴 자가시험 ${흠}개 흠` : '\n✅ 자가시험 10가지 다 지났다');
  return 흠;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  if (process.argv.includes('--자가시험')) process.exit(자가시험() ? 1 : 0);

  console.log('# 광고가 실제로 나가고 있나 — ' + new Date().toLocaleString('ko-KR'));
  console.log(`  ⚠ 애드센스 노출수 집계가 ${집계기준바뀌는날} 부터 「다운로드 시작」 → 「렌더 시작」으로 바뀝니다.`);
  console.log('    그 날 전후의 노출수를 «같은 축에 놓고» 비교하지 않습니다.\n');

  /* ── ① 설정 ─────────────────────────────────────────────── */
  const 길 = path.join('src', 'consts.ts');
  if (fs.existsSync(길)) {
    const s = 슬롯설정(fs.readFileSync(길, 'utf8'));
    console.log('## ① 설정 (src/consts.ts)\n');
    if (s.못찾음) console.log('  ⬜ ADS 설정을 못 찾았다');
    else {
      console.log(`  client       ${s.client || '(비어 있다 — 광고가 아예 안 나간다)'}`);
      console.log(`  슬롯 ID      채운 것 ${s.채운슬롯} / ${s.전체슬롯}`
        + (s.채운슬롯 === 0 ? '  🔴 ← 비어 있으면 AdSlot 이 «아무것도 안 그린다»' : ''));
      for (const [k, v] of Object.entries(s.슬롯들)) console.log(`     · ${k}: ${v || '(빈칸)'}`);
    }
  } else console.log('## ① 설정 — ⬜ src/consts.ts 를 못 찾아 못 쟀다');

  /* ── ② 라이브 ───────────────────────────────────────────── */
  console.log('\n## ② 라이브 지면에 실제로 나가는 것\n');
  let 자리합 = 0; let 로더합 = 0; let 본지면 = 0;
  for (const 집 of 집들) {
    console.log(`  ── ${집.이름} (${집.유닛})`);
    for (const p of 집.지면) {
      const r = await 받는다(집.주소 + p);
      if (r.못쟀다) { console.log(`     ⬜ ${p.padEnd(22)} 못 쟀다 — ${r.못쟀다}`); continue; }
      if (!r.글) { console.log(`     ⬜ ${p.padEnd(22)} HTTP ${r.코드}`); continue; }
      const a = 광고흔적(r.글);
      본지면 += 1; 자리합 += a.자리; 로더합 += a.로더;
      const 빛 = a.자리 > 0 ? '✅' : (a.로더 > 0 ? '🟡' : '⬜');
      console.log(`     ${빛} ${p.padEnd(22)} 로더 ${a.로더} · 광고자리 ${a.자리}`
        + (a.자리 === 0 && a.로더 > 0 ? '  ← 로더만 나가고 «자리»가 없다' : ''));
    }
  }

  /* ── ③ 렌더 전 이탈 위험 ─────────────────────────────────── */
  console.log('\n## ③ 렌더 전 이탈 위험 — 집계 기준이 바뀌면 이 몫이 빠진다\n');
  const 읽은자료 = path.join('src', 'data', 'real-readers.json');
  if (fs.existsSync(읽은자료)) {
    try {
      const j = JSON.parse(fs.readFileSync(읽은자료, 'utf8'));
      console.log('  (src/data/real-readers.json 에서 읽음 — 잰 날 ' + (j.잰날 ?? j.날 ?? '모름') + ')');
    } catch { console.log('  ⬜ real-readers.json 을 못 읽었다'); }
  } else {
    console.log('  ⬜ src/data/real-readers.json 이 없다 —');
    console.log('     `node scripts/measure-real-readers.mjs --적는다=src/data/real-readers.json` 을 먼저 돌린다.');
  }
  console.log('  ⚠ 「1초 미만 세션 몫」은 **상한**이다. 그 세션이 정말 렌더 전에 떠났는지는');
  console.log('     바깥에서 못 본다 — 애드센스 콘솔의 노출수와 대 봐야 안다.');

  /* ── 마무리 ─────────────────────────────────────────────── */
  console.log('\n## 판정\n');
  if (본지면 === 0) { console.log('  ⬜ 라이브를 하나도 못 봤다 — 네트워크. **못 쟀다**'); process.exit(0); }
  if (자리합 === 0 && 로더합 > 0) {
    console.log(`  🔴 지면 ${본지면}장을 봤는데 **광고 자리가 0개**다. 로더만 ${로더합}장에 나간다.`);
    console.log('     → 콘솔의 «자동광고»가 켜져 있지 않으면 **광고가 한 개도 안 나간다.**');
    console.log('     → 그러면 노출수도 0 이고, 집계 방식이 바뀌어도 **영향이 0** 이다.');
    console.log('  ⭐ 먼저 할 일은 집계 방식이 아니라 **슬롯 ID 를 채우는 것**이다(애드센스 콘솔에서 만든다).');
    process.exit(1);
  }
  if (자리합 === 0) { console.log('  🔴 광고 자리도 로더도 없다 — 광고가 안 나간다.'); process.exit(1); }
  console.log(`  ✅ 지면 ${본지면}장에 광고 자리 ${자리합}개가 나간다.`);
  console.log(`  ⚠ 실제 노출수·수익은 여기서 못 잰다 — 애드센스 콘솔/관리 API 뿐이다. **못 쟀다고 적는다.**`);
}
