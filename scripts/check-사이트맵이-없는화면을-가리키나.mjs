#!/usr/bin/env node
/**
 * check-사이트맵이-없는화면을-가리키나.mjs
 * SeoulMarkets 사이트맵이 «서지도 않는 화면»을 구글에 내밀고 있는지 본다.
 *
 * ── 왜 만드나 (2026-11-09) ──────────────────────────────────────────
 * 사장님이 서치콘솔 통지를 주셔서 404 를 고치다가, 사이트맵에 실린 주소
 * **8,039개를 전수로 눌러 봤다.** 한 장이 404 였다 —
 *
 *   https://seoulmarkets.com/sector/insurance-and-pensions
 *
 * 왜 그랬나 — **같은 것을 두 자가 서로 다르게 측정했다.**
 *   · 회사 화면       `지면낼만한가`  매출이 없어도 리서치가 있으면 낸다 (2026-10-27 에 넓힘)
 *   · 업종 화면       `낼만한가`      매출이 있어야 낸다 (안 넓혔다)
 *   · 사이트맵의 업종  `지면낼만한가`  ← 넓은 쪽을 썼다
 * 그래서 보험·연금처럼 **매출 칸이 비어 있는 업종**이 사이트맵에만 올랐다.
 * 보험사 12곳은 매출을 「매출액」이 아니라 보험수익으로 적어 우리 테이프의 칸이 비어 있다.
 *
 * ⛔ 사이트맵이 404 를 가리키면 그 사이트맵 **전체**의 신뢰가 깎인다.
 *   한 줄 때문에 8,038장이 같이 의심받는다.
 *
 * ⭐ 이것은 오늘 세 번째로 만난 **같은 꼴**이다 — 손으로 맞춰야 하는 목록이 둘인데
 *   한쪽만 고쳤다. (① 백년지도 사이트맵 62장 ② 내린 화면 301 ③ 이것)
 *
 * 쓰는 법
 *   node scripts/check-사이트맵이-없는화면을-가리키나.mjs
 *   node scripts/check-사이트맵이-없는화면을-가리키나.mjs --자체검사
 *   node scripts/check-사이트맵이-없는화면을-가리키나.mjs --전수   (라이브 8,039개를 다 눌러 본다)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { 낼만한가, 지면낼만한가 } from '../src/lib/company-page.mjs';
import { 업종주소, 업종말 } from '../src/lib/sector-en.mjs';

const 저장소루트 = fileURLToPath(new URL('..', import.meta.url));
const 자료 = (이름) => path.join(저장소루트, 'src/data', 이름);

/** 회사 코드마다 해마다의 줄을 묶는다 */
export function 코드로묶는다(행들) {
  const 묶음 = new Map();
  for (const r of 행들 ?? []) {
    if (!묶음.has(r.code)) 묶음.set(r.code, []);
    묶음.get(r.code).push(r);
  }
  return 묶음;
}

/**
 * 업종 주소 두 벌을 낸다.
 *   사이트맵것 — 사이트맵이 내미는 것
 *   화면것     — src/pages/sector/[slug].astro 가 실제로 세우는 것
 * ⚠ 두 자를 «여기 한 곳»에 나란히 적어 둔다. 떨어뜨려 놓으면 또 어긋난다.
 */
export function 업종두벌(묶음, 리서치표) {
  const 머리 = [...묶음.entries()].map(([code, rs]) => ({ code, ...rs[0] }));
  const 사이트맵것 = new Set();
  const 화면것 = new Set();
  for (const h of 머리) {
    const rs = 묶음.get(h.code);
    const s = 업종주소(h.sector);
    if (!s) continue;

    /* ① 사이트맵이 쓰는 자 — src/pages/sitemap-[section].xml.ts 의 업종 줄과 같아야 한다.
       회사 주소는 `지면낼만한가`(넓은 자)로 고르지만, 업종 주소는 업종 화면과 맞춰야 한다. */
    const 회사화면이서나 = 지면낼만한가(rs, (리서치표 ?? {})[h.code] ?? null);
    if (회사화면이서나 && 업종말(h.sector) && 낼만한가(rs)) 사이트맵것.add(s);

    /* ② 업종 화면이 쓰는 자 — src/pages/sector/[slug].astro 의 getStaticPaths 와 같아야 한다 */
    if (낼만한가(rs) && 업종말(h.sector)) 화면것.add(s);
  }
  return { 사이트맵것, 화면것 };
}

/** 한 차례 검사한다 */
export function 검사한다() {
  const 못잰것 = [];
  let fin;
  try { fin = JSON.parse(fs.readFileSync(자료('korea-financials-tape.json'), 'utf8')); }
  catch { 못잰것.push('korea-financials-tape.json 을 못 읽었다'); return { 걸린것: [], 못잰것 }; }
  let 리서치표 = {};
  try { 리서치표 = JSON.parse(fs.readFileSync(자료('company-research.json'), 'utf8')).byCode ?? {}; }
  catch { 못잰것.push('company-research.json 을 못 읽었다'); return { 걸린것: [], 못잰것 }; }

  const 묶음 = 코드로묶는다(fin.rows);
  /* 🔴 0개면 「어긋난 것이 없다」가 아니라 「못 읽었다」다 */
  if (!묶음.size) { 못잰것.push('회사 줄이 0개다 — 자료를 못 읽은 것이다'); return { 걸린것: [], 못잰것 }; }

  const { 사이트맵것, 화면것 } = 업종두벌(묶음, 리서치표);
  const 걸린것 = [...사이트맵것].filter((x) => !화면것.has(x)).sort()
    .map((x) => ({ 주소: '/sector/' + x, 왜: '사이트맵에는 있는데 화면이 안 선다' }));
  return { 걸린것, 못잰것, 사이트맵수: 사이트맵것.size, 화면수: 화면것.size };
}

/** 라이브 사이트맵 주소를 전부 눌러 본다 */
export async function 전수로잰다(뿌리 = 'https://seoulmarkets.com') {
  let 끊긴수 = 0;
  process.on('uncaughtException', (e) => {
    if (String(e?.code) === 'UND_ERR_SOCKET' || /socket/i.test(String(e?.message))) { 끊긴수 += 1; return; }
    throw e;
  });
  const 뭉치 = await (await fetch(뿌리 + '/sitemap.xml')).text();
  const 하위 = [...뭉치.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const 주소들 = [];
  for (const s of 하위) {
    const g = await (await fetch(s)).text();
    for (const m of g.matchAll(/<loc>([^<]+)<\/loc>/g)) 주소들.push(m[1]);
  }
  console.log(`■ 사이트맵 ${하위.length}벌 · 주소 ${주소들.length.toLocaleString('ko-KR')}개를 눌러 본다`);

  const 나쁜것 = [];
  let 다음 = 0; let 끝 = 0;
  async function 일꾼() {
    while (다음 < 주소들.length) {
      const u = 주소들[다음]; 다음 += 1;
      let 답 = null;
      for (let 번 = 0; 번 < 3 && !답; 번 += 1) {
        try { 답 = await fetch(u, { redirect: 'manual' }); }
        catch { await new Promise((f) => setTimeout(f, 700)); }
      }
      끝 += 1;
      if (끝 % 1000 === 0) process.stdout.write(`  …${끝}\n`);
      if (!답) { 나쁜것.push({ 주소: u, 코드: 0, 간곳: '못 불렀다' }); continue; }
      if (답.status !== 200) 나쁜것.push({ 주소: u, 코드: 답.status, 간곳: 답.headers.get('location') ?? '' });
    }
  }
  await Promise.all(Array.from({ length: 10 }, () => 일꾼()));
  return { 나쁜것, 센수: 끝, 끊긴수 };
}

/* ── 자체 검사 ──────────────────────────────────────────────────────── */
export function 자체검사() {
  const 항목 = [];
  const 검 = (이름, 결과) => 항목.push({ 이름, 결과: !!결과 });

  const 줄 = (code, sector, revenue) => ({ code, sector, revenue_krw: revenue });
  검('코드로 묶는다', 코드로묶는다([줄('A', 'x', 1), 줄('A', 'x', 2), 줄('B', 'y', 3)]).size === 2);
  검('빈 것에서 안 터진다', 코드로묶는다(null).size === 0);

  /* 보험·연금은 매출이 없다 — 화면이 안 선다. 사이트맵도 내밀면 안 된다 */
  const 보험 = 코드로묶는다([줄('000810', '보험·연금', null)]);
  const a = 업종두벌(보험, { '000810': { reports: 9 } });
  검('🔴 매출이 없는 업종은 화면이 안 선다', !a.화면것.has('insurance-and-pensions'));
  검('🔴 그 업종을 사이트맵도 안 내민다 — 이것이 11-09 에 404 였던 자리',
    !a.사이트맵것.has('insurance-and-pensions'));

  /* 같은 업종이라도 매출 칸이 «차면» 두 벌에 다 들어야 한다 — 판별 규칙이 아예 막힌 것이 아님을 본다 */
  const 보험매출있음 = 코드로묶는다([줄('000810', '보험·연금', 1000)]);
  const b = 업종두벌(보험매출있음, {});
  검('매출이 있으면 두 벌에 다 든다',
    b.화면것.has('insurance-and-pensions') && b.사이트맵것.has('insurance-and-pensions'));

  const r = 검사한다();
  검('돌려주는 꼴이 맞다', Array.isArray(r.걸린것) && Array.isArray(r.못잰것));
  검('실제 자료를 읽었다 — 업종이 0개면 못 읽은 것이다', (r.화면수 ?? 0) > 30);
  검('🔴 지금 어긋난 업종이 없다', r.걸린것.length === 0 && r.못잰것.length === 0);

  const 실패 = 항목.filter((x) => !x.결과);
  console.log(`■ check-사이트맵이-없는화면을-가리키나 자체 검사 ${항목.length - 실패.length}/${항목.length}`);
  for (const x of 항목) console.log(`  ${x.결과 ? '통과' : '실패'}  ${x.이름}`);
  return 실패.length === 0;
}

/* ── 실행부 ─────────────────────────────────────────────────────────── */
const 직접실행 = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (직접실행) {
  if (process.argv.includes('--자체검사')) process.exit(자체검사() ? 0 : 1);

  if (process.argv.includes('--전수')) {
    const { 나쁜것, 센수, 끊긴수 } = await 전수로잰다();
    console.log(`\n■ 잰 것 ${센수}개 · 연결이 끊겨 다시 잰 것 ${끊긴수}번`);
    console.log(`■ 200 이 아닌 것 ${나쁜것.length}개`);
    for (const x of 나쁜것) console.log(`  ${x.코드}  ${x.주소}${x.간곳 ? '  → ' + x.간곳 : ''}`);
    process.exit(나쁜것.length ? 1 : 0);
  }

  const { 걸린것, 못잰것, 사이트맵수, 화면수 } = 검사한다();
  if (못잰것.length) {
    console.log(`🔴 측정하지 못했다 ${못잰것.length}개 — 「걸린 것이 없다」가 아니다`);
    for (const x of 못잰것) console.log(`   ${x}`);
    process.exit(1);
  }
  if (!걸린것.length) {
    console.log(`■ 업종 주소 — 사이트맵 ${사이트맵수}개 · 화면 ${화면수}개 · 어긋난 것 없음`);
    process.exit(0);
  }
  console.log(`🔴 사이트맵이 서지도 않는 화면 ${걸린것.length}개를 가리킨다 — 구글이 거기서 404 를 받는다`);
  for (const x of 걸린것) console.log(`   ${x.주소}   ${x.왜}`);
  console.log('\n고치는 법 — 사이트맵의 업종 판별 규칙을 화면과 «같은 자»로 맞춘다.');
  console.log('   src/pages/sitemap-[section].xml.ts · src/pages/sector/[slug].astro');
  process.exit(1);
}
