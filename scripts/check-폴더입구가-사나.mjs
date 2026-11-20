#!/usr/bin/env node
/**
 * check-폴더입구가-사나.mjs — **네 사이트의 「폴더 주소」가 라이브에서 사는가.**
 *
 * ── 🔴 왜 (2026-10-06 02:3x~02:5x · 5번) ────────────────────────────
 * KLifeMap 에 띠 지면 12장과 자료 2장을 내고 사이트맵에 넣고 홈에서 봇이
 * 닿는 것까지 확인했는데, 폴더 주소를 눌러 보니 —
 *
 * ```
 * https://klifemap.ai/unse/  → 404
 * https://klifemap.ai/data/  → 404
 * ```
 *
 * ⛔ **낱장은 다 되는데 목록이 없었다.** 낱장은 파일이 있어서 되는 것이고
 *   목록은 따로 만들어야 되는 것인데, 그 둘을 같은 것으로 읽었다.
 *
 * 그 길로 네 사이트를 다 재 보니 **입구 없는 폴더가 18곳**이었다 —
 * ```
 * seoulmarkets  8곳  /japan 3,736장 · /japan/company 3,702 · /company 2,521 …
 * kculturewire  7곳  /title 546 · /article 273 · /week 272 · /tag 175 …
 * 100yearmap    3곳  /report 259 · /report/area 258 · /life 2
 * klifemap      0곳  (그 자리에서 고쳤다)
 * ```
 * 약 1만 장이 입구 없는 묶음 밑에 있었다.
 *
 * ── ⚠ 과장하지 않는다 ──────────────────────────────────────────────
 * ```
 * ✅ 손님이 그 주소를 치면 404 를 본다                  확실하다
 * ✅ 묶음에 「무엇이 있나」를 볼 자리가 없다              확실하다
 * ⬜ 「이것 때문에 클릭이 0 이다」                       그렇게 적지 않는다
 * ```
 *
 * ── 무엇을 어떻게 재나 ──────────────────────────────────────────────
 *   ① 사이트맵을 받아 주소를 다 모은다
 *   ② 지면이 둘 이상 든 «폴더 자리»를 뽑는다 (묶음이라는 뜻이다)
 *   ③ 그 폴더 주소를 라이브에서 눌러 본다 — 리다이렉트까지 따라간다
 *   ④ 못 박은 수보다 «늘면» 막는다. 줄면 내려 적는다
 *
 * ⛔ 못 잰 것(사이트맵을 못 받음·시간 초과)으로는 막지 않는다.
 *   자가 못 재서 배포가 멈추면 그 자는 자물쇠가 아니라 걸림돌이다.
 *
 * 쓰는 법
 *   node scripts/check-폴더입구가-사나.mjs
 *   node scripts/check-폴더입구가-사나.mjs --사이트 seoulmarkets
 *   node scripts/check-폴더입구가-사나.mjs --자가시험
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const 사이트들 = [
  { 딱지: 'seoulmarkets', 밑: 'https://seoulmarkets.com', 맵: 'https://seoulmarkets.com/sitemap.xml' },
  { 딱지: 'kcw', 밑: 'https://www.kculturewire.com', 맵: 'https://www.kculturewire.com/sitemap.xml' },
  { 딱지: '100y', 밑: 'https://100yearmap.com', 맵: 'https://100yearmap.com/sitemap.xml' },
  /* ⚠ klifemap 은 «핵심» 사이트맵(124장)을 본다. 동적 `sitemap.xml` 은 3,009장이지만
     그 차이인 `/content` 2,800여 장은 **쪽·말을 쿼리로 넘겨**(`?page=2`·`?lang=en`)
     폴더가 아니다 — 여기서 잴 것이 없다. 폴더 묶음(`/ilju/`·`/unse/`·`/data/`)은
     핵심 사이트맵에 다 들어 있다.
     ⛔ 「핵심만 봤다」를 「다 봤다」로 적지 않는다 — 그래서 여기 적어 둔다. */
  { 딱지: 'klifemap', 밑: 'https://klifemap.ai', 맵: 'https://klifemap.ai/sitemap-core.xml' },
];

/**
 * 🔴 못 박은 수 — 이보다 «늘면» 막는다. 고치면 내려 적는다.
 *
 * 🔴🔴 [2026-10-06 03:1x · 5번] **라이브를 재는 자를 배포 «전» 관문에 걸 때의 함정.**
 *   고칠 것을 다 고치고 못 박은 수를 「고친 뒤에 될 수」로 적었더니, 그 고침을
 *   **내보내는 배포 자체가 막혔다.** 라이브는 아직 안 고쳐진 상태이기 때문이다.
 *
 *   ⛔ 못 박은 수는 **「지금 라이브에서 재지는 수」**다. 「고치면 될 수」가 아니다.
 *     그 둘을 섞으면 자물쇠가 자기를 고치러 가는 길을 막는다.
 *   ⭐ 배포가 나간 «뒤»에 다시 재서 내려 적는다 — 자가 그렇게 일러 준다.
 *
 * 2026-10-06 03:1x 라이브 실측. 이 배포로 seoulmarkets 2곳과 kcw 5곳이 이어진다.
 */
export const 못박은_구멍 = {
  /* 🔴 2026-10-06 03:2x — 배포가 나간 «뒤» 다시 재서 내려 적었다.
     seoulmarkets 2→0 · kcw 9→4. 자가 「내려 적으십시오」라고 일러 준 그대로다. */
  seoulmarkets: 0,   /* 10곳을 301 로 이었다 — 라이브에서 전부 200 을 확인했다 */
  kcw: 4,            /* 5곳을 이었다. 남은 것 — /week /market /from /born-in (2번) */
  '100y': 5,         /* 2026-11-20 라이브 실측 5 — /elementary/area·/middle/area 입구를 이 배포로 낸다. 배포 뒤 3 으로 내려 적는다. /report · /report/area · /life (1번이 목록 지면을 만든다) */
  klifemap: 0,       /* /unse/ · /data/ 허브를 그날 냈다 */
};

/** 한 번에 몇 곳까지 보나 — 큰 묶음부터. ⛔ 전부 누르면 오래 걸린다 */
export const 볼곳수 = 14;

/** 지면이 이만큼 든 자리만 「묶음」으로 본다 */
export const 묶음최소 = 2;

/**
 * 주소 목록에서 폴더 자리를 뽑아 센다.
 * ⛔ 마지막 칸은 지면 이름이므로 폴더로 세지 않는다.
 * @returns [[폴더, 장수], …] 많은 차례. 못 재면 null
 */
export function 폴더자리(주소들, 최소 = 묶음최소) {
  if (!Array.isArray(주소들)) return null;
  const 셈 = new Map();
  for (const u of 주소들) {
    let p;
    try { p = new URL(u).pathname; } catch { continue; }
    const 칸 = p.split('/').filter(Boolean);
    for (let i = 1; i < 칸.length; i++) {
      const 방 = '/' + 칸.slice(0, i).join('/') + '/';
      셈.set(방, (셈.get(방) ?? 0) + 1);
    }
  }
  return [...셈.entries()].filter(([, n]) => n >= 최소).sort((a, b) => b[1] - a[1]);
}

/** 사이트맵 글에서 <loc> 을 뽑는다 */
export function 주소들뽑기(xml) {
  const s = String(xml ?? '');
  if (!s.trim()) return null;
  const 것들 = [...s.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  return 것들.length ? 것들 : null;
}

/** 사이트맵 색인인가 — 안쪽 맵을 더 받아야 한다 */
export function 색인인가(xml) {
  return /<sitemapindex/i.test(String(xml ?? ''));
}

/**
 * ⛔ curl 의 `-o /dev/null` 이 Windows 에서 안 먹어 전부 「못잼」이 나왔다
 *   (2026-10-06 실측). 전부 같은 값이 나오면 자를 먼저 의심한다.
 *   그래서 node 의 fetch 를 쓴다.
 */
async function 글받기(u, 밀리 = 25000) {
  try {
    const r = await fetch(u, { redirect: 'follow', signal: AbortSignal.timeout(밀리) });
    if (!r.ok) return null;
    return await r.text();
  } catch { return null; }
}

/** 그 주소가 사는가 — 리다이렉트까지 «따라가서» 본다. ⛔ 못 물으면 null */
export async function 사나(u, 밀리 = 20000) {
  try {
    const r = await fetch(u, { redirect: 'follow', signal: AbortSignal.timeout(밀리) });
    return r.status === 200;
  } catch { return null; }
}

/** 한 사이트를 잰다. ⛔ 사이트맵을 못 받으면 null — 0 으로 안 적는다 */
export async function 한곳잰다(s, 볼수 = 볼곳수) {
  let xml = await 글받기(s.맵);
  if (!xml) return null;
  if (색인인가(xml)) {
    const 안쪽 = (주소들뽑기(xml) ?? []).slice(0, 8);
    const 글들 = await Promise.all(안쪽.map((u) => 글받기(u)));
    xml = 글들.filter(Boolean).join('\n');
  }
  const 주소들 = 주소들뽑기(xml);
  if (!주소들) return null;
  const 묶음 = (폴더자리(주소들) ?? []).slice(0, 볼수);
  const 줄들 = [];
  for (const [방, n] of 묶음) {
    const 산다 = await 사나(s.밑 + 방);
    줄들.push({ 방, 장수: n, 산다 });
  }
  return { 딱지: s.딱지, 사이트맵장수: 주소들.length, 줄들 };
}

/** 구멍만 — 「못 쟀다」는 구멍으로 세지 않는다 */
export function 구멍들(잰것) {
  if (!잰것 || !Array.isArray(잰것.줄들)) return null;
  return 잰것.줄들.filter((x) => x.산다 === false);
}

/* ── 자가시험 ────────────────────────────────────────────────────────── */
export function 자가시험() {
  const 결과 = [];
  const T = (이름, 참) => 결과.push({ 이름, 참: !!참 });

  const 주소 = [
    'https://a.com/japan/company/x', 'https://a.com/japan/company/y',
    'https://a.com/japan/sector/z', 'https://a.com/about',
  ];
  const 자리 = 폴더자리(주소);
  T('🔴 폴더 자리를 뽑는다', Array.isArray(자리) && 자리.length > 0);
  T('🔴 많은 차례로 준다', 자리[0][0] === '/japan/');
  T('🔴 /japan/ 이 세 장이다', 자리[0][1] === 3);
  T('🔴 /japan/company/ 가 두 장이다',
    (자리.find((x) => x[0] === '/japan/company/') ?? [])[1] === 2);
  T('⛔ 한 장짜리 자리는 묶음이 아니다',
    !자리.some((x) => x[0] === '/japan/sector/'));
  T('⛔ 마지막 칸(지면 이름)은 폴더로 안 센다',
    !자리.some((x) => x[0].endsWith('/about/') || x[0] === '/about/'));
  T('⛔ 배열이 아니면 null', 폴더자리(null) === null);
  T('⛔ 주소가 아닌 것은 건너뛴다', (폴더자리(['그냥글', 'https://a.com/x/y']) ?? []).length === 0);

  T('🔴 사이트맵에서 주소를 뽑는다',
    (주소들뽑기('<url><loc>https://a/1</loc></url><url><loc>https://a/2</loc></url>') ?? []).length === 2);
  T('⛔ 빈 글이면 null — 빈 배열이 아니다',
    주소들뽑기('') === null && 주소들뽑기(null) === null);
  T('⛔ <loc> 이 없으면 null', 주소들뽑기('<urlset></urlset>') === null);
  T('🔴 사이트맵 색인을 알아본다',
    색인인가('<sitemapindex xmlns="x">') === true && 색인인가('<urlset>') === false);

  T('🔴 구멍만 센다 — 「못 쟀다」는 구멍이 아니다',
    (구멍들({ 줄들: [{ 산다: false }, { 산다: true }, { 산다: null }] }) ?? []).length === 1);
  T('⛔ 못 잰 것은 null', 구멍들(null) === null && 구멍들({}) === null);

  T('🔴 네 사이트가 다 들어 있다', 사이트들.length === 4);
  T('🔴 사이트마다 못 박은 수가 있다',
    사이트들.every((s) => typeof 못박은_구멍[s.딱지] === 'number'));
  T('⛔ klifemap 은 0 이다 — 2026-10-06 에 그 자리에서 고쳤다',
    못박은_구멍.klifemap === 0);
  /* ⚠ 못 박은 수는 «실측»이어야 한다. 손으로 짐작해 적으면 자물쇠가 거짓이 된다 —
     2026-10-06 에 손으로 12곳만 세고 7 이라 적었는데 자가 14곳을 봐서 9 가 나왔다.
     ⛔ 그리고 「고치면 될 수」를 적어도 안 된다 — 그 고침을 내보내는 배포가 막힌다. */
  T('🔴 못 박은 수가 네 곳 다 음이 아닌 정수다',
    사이트들.every((s) => Number.isInteger(못박은_구멍[s.딱지]) && 못박은_구멍[s.딱지] >= 0));

  const 빨강 = 결과.filter((r) => !r.참).length;
  console.log('■ 폴더 입구가 사나 — 자가시험');
  for (const r of 결과) console.log(`  ${r.참 ? '✅' : '🔴'} ${r.이름}`);
  console.log(빨강 ? `🔴 빨강 ${빨강}개` : `✅ ${결과.length}가지 다 통과`);
  return 빨강 === 0;
}

/* ── 혼자 돌 때 ──────────────────────────────────────────────────────── */
const 내가실행됐다 = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (내가실행됐다) {
  if (process.argv.includes('--자가시험') || process.argv.includes('--selftest')) {
    process.exit(자가시험() ? 0 : 1);
  }

  const i = process.argv.indexOf('--사이트');
  const 고른 = i >= 0 ? process.argv[i + 1] : null;
  const 볼것 = 고른 ? 사이트들.filter((s) => s.딱지 === 고른) : 사이트들;
  if (!볼것.length) { console.log(`⛔ 그런 사이트가 없다 — ${사이트들.map((s) => s.딱지).join(' · ')}`); process.exit(1); }

  console.log('■ 폴더 주소가 라이브에서 사는가');
  console.log('   ⛔ 낱장이 된다고 목록도 되는 것이 아니다\n');

  const 막는것 = []; const 못잰것 = [];
  for (const s of 볼것) {
    const 잰것 = await 한곳잰다(s);
    if (!잰것) { console.log(`  ⬜ ${s.딱지} — 사이트맵을 못 받았다. 못 쟀다 (0 으로 안 적는다)`); 못잰것.push(s.딱지); continue; }
    const 구멍 = 구멍들(잰것) ?? [];
    const 못잼 = 잰것.줄들.filter((x) => x.산다 === null).length;
    const 못박은 = 못박은_구멍[s.딱지] ?? 0;
    const 표 = 구멍.length > 못박은 ? '🔴' : '✅';
    console.log(`  ${표} ${s.딱지.padEnd(14)} 묶음 ${String(잰것.줄들.length).padStart(2)}곳 중 `
      + `구멍 ${구멍.length}곳 (못 박은 수 ${못박은})${못잼 ? ` · 못 잰 곳 ${못잼}` : ''}`);
    for (const x of 구멍) console.log(`       🔴 ${x.방}  (${x.장수}장)`);
    if (구멍.length > 못박은) {
      막는것.push(`${s.딱지} 의 입구 없는 폴더가 ${못박은} → ${구멍.length} 로 늘었다`);
    } else if (구멍.length < 못박은) {
      console.log(`       ⭐ ${못박은 - 구멍.length}곳 줄었다 — 못 박은 수를 ${구멍.length} 로 내려 적으십시오`);
    }
  }

  if (못잰것.length) {
    console.log(`\n  ⚠ 못 잰 곳 ${못잰것.length} — ${못잰것.join(' · ')}`);
    console.log('     ⛔ 못 잰 것으로는 막지 않는다. 「못 쟀다」와 「깨졌다」는 다르다');
  }
  if (!막는것.length) { console.log('\n✅ 입구가 늘어난 곳이 없다'); process.exit(0); }
  console.log('\n🔴 **입구 없는 폴더가 늘었다 — 배포하지 않는다.**');
  for (const m of 막는것) console.log('   · ' + m);
  console.log('   ⭐ 목록 지면을 내거나, 이미 그 일을 하는 지면으로 보낸다');
  console.log('   ⛔ 같은 말을 하는 지면을 또 만들지 않는다 — 구글이 복사본으로 본다');
  process.exit(1);
}
