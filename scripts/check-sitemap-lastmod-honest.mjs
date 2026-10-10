#!/usr/bin/env node
/**
 * check-sitemap-lastmod-honest.mjs — **사이트맵이 「오늘 다 고쳤다」고 거짓말하지 않나.**
 * (5번, 2026-09-23)
 *
 * ── 🔴 왜 (그날 내가 낸 결함) ──────────────────────────────────────────
 * 케이라이프맵에 생일 지면 1,468장을 내면서 사이트맵의 `<lastmod>` 에 **날마다 «오늘»을**
 * 찍었다. 한 자료로 찍은 롱테일이라 내용은 안 바뀌는데 날짜만 매일 새로 나갔다.
 *
 * 무엇이 나빴나 —
 *   ① 구글은 lastmod 가 늘 오늘이면 그 사이트맵의 lastmod 를 **아예 무시**하기 시작한다.
 *     그러면 «진짜로 고친 날»에 알릴 길이 사라진다. 우리가 우리 신호를 죽이는 것이다.
 *   ② 총괄의 「오늘 낸 글」 셈이 **1,468편**으로 부풀었다 — 사이트맵의 lastmod 를 세기 때문이다.
 *     사장님께 「1번 몫 1469/24」라는 헛수가 올라갈 뻔했다.
 *
 * ⭐ 회사 강령 그대로다 — 「못 잰 것은 못 쟀다고 적는다」의 짝으로,
 *   **안 고친 것을 고쳤다고 적지 않는다.**
 *
 * ── 🔴🔴 하루치 스냅숏으로는 판정할 수 없다 (같은 날 알았다) ───────────
 * 고치면서 lastmod 를 «만든 날»로 고정했는데, 그 만든 날이 곧 «오늘»이라
 * 고치기 전과 후가 **똑같이 73.7%** 로 보였다. 자가 배포 전후를 못 갈랐다.
 * ⇒ 거짓말의 정의는 「오늘이 많다」가 아니라 **「날마다 오늘로 바뀐다」**다.
 *   그래서 날마다 잰 값을 쌓고, **이틀 넘게 잇달아** 큰 몫이 오늘이면 그때 빨강으로 본다.
 * ⛔ 한 번 보고 단정하지 않는다 — 진짜로 그날 수천 장을 낸 날도 있다(우리가 그랬다).
 *
 * ── ⛔ 이 자가 못 재는 것 ──────────────────────────────────────────────
 * ⛔ 「무엇이 진짜 바뀌었나」는 못 잰다. «날짜가 정직한가»만 본다.
 * ⛔ 기사 사이트맵은 날마다 새 글이 붙으므로 재지 않는다(볼곳에 안 넣었다).
 *
 * 쓰는 법
 *   node scripts/check-sitemap-lastmod-honest.mjs --자가시험
 *   node scripts/check-sitemap-lastmod-honest.mjs            라이브를 재고 기록에 쌓는다
 *   node scripts/check-sitemap-lastmod-honest.mjs --안쌓는다  재기만 한다
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(fileURLToPath(import.meta.url), '..', '..');

/** 재는 곳. ⛔ 우리 사이트만 잰다 */
export const 볼곳 = [
  { 이름: 'KLifeMap', 주소: 'https://klifemap.ai/sitemap.xml' },
  { 이름: 'SeoulMarkets', 주소: 'https://seoulmarkets.com/sitemap-pages.xml' },
  { 이름: 'SeoulMarkets 회사', 주소: 'https://seoulmarkets.com/sitemap-companies.xml' },
];

export const 넘으면빨강 = 0.5;
export const 최소장수 = 30;
export const 잇달아며칠 = 2;          /* 이틀 잇달으면 그때 빨강 — 하루는 참는다 */
export const 기록길 = path.join('docs', '사이트맵-lastmod-기록.tsv');

/**
 * 몇 %가 「오늘」인가. 지면이 적으면 비율이 흔들리므로 «장수»도 함께 돌려준다.
 * ⛔ 사이트맵이 아니면 null — 0 으로 떨어뜨리지 않는다.
 */
export function 오늘몫(글, 오늘) {
  if (글 == null || !오늘) return null;
  const s = String(글);
  if (!/<urlset|<sitemapindex/i.test(s)) return null;
  const 전부 = s.match(/<lastmod>\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/g) || [];
  if (!전부.length) return { 전체: 0, 오늘: 0, 몫: null };   /* lastmod 가 없는 것은 흠이 아니다 */
  const 오늘것 = 전부.filter((x) => x.includes(오늘)).length;
  return { 전체: 전부.length, 오늘: 오늘것, 몫: 오늘것 / 전부.length };
}

/**
 * 🔴🔴 [2026-10-06 12:0x · 5번] **이 자가 묻는 것이 하나뿐이었다 — 「거짓말하나」.**
 *
 * 위 오늘몫() 에 이렇게 적어 두었었다 — 「lastmod 가 없는 것은 흠이 아니다」.
 * 그 한 줄 때문에 seoulmarkets 7,670장 가운데 **4,931장(64%)에 lastmod 가 아예 없는 것**을
 * 두 달 넘게 못 봤다. 자는 날마다 ✅ 를 찍고 있었다.
 *   japan 3,736장 · taiwan 1,090장 · uae 105장 — 셋 다 lastmod 0
 *
 * ⭐ 사이트맵이 거짓말하는 길은 **넷**이다. 하나만 묻고 있었다 —
 *   ① 날마다 「오늘」이라고 한다            → 구글이 lastmod 를 통째로 무시한다
 *   ② **아무 말도 안 한다**                 → 다시 올 때를 정할 근거가 없다
 *   ③ **다 같은 한 날이라고 한다**          → 안 바뀐 지면까지 바뀌었다고 하는 것이다
 *   ④ **아직 오지 않은 때를 말한다**        → 구글이 그 값을 안 믿는다 (2026-10-11 보탬)
 * ⛔ ③ 은 «언제나» 거짓은 아니다 — 타래를 한꺼번에 지으면 정말 한날 바뀐다.
 *   그래서 빨강이 아니라 ⚠ 로 적는다. 사람이 보고 가린다.
 *
 * ── 🔴 ④ 는 왜 뒤늦게 붙었나 (2026-10-11 02:5x · 5번) ──────────────
 * 이 자가 ①②③ 에 모두 «초록»을 내고 있는데 **일본 3,736장·대만 1,090장이
 * 미래를 가리키고 있었다.** 실측 — 지금 UTC 2026-10-10 17:46 · lastmod 2026-10-11T00:00:00.000Z.
 * 까닭은 `sitemap-[section].xml.ts` 가 **한국 날짜를 UTC 자정**으로 만든 것이었다.
 * 한국시간 10-11 02:00 은 UTC 10-10 17:00 이라 «UTC 자정 10-11» 은 여섯 시간 뒤다.
 * ⚠ **새벽(00~09시 KST)에 타래를 지을 때만** 난다. 낮에 지으면 안 나서 안 보였다.
 * ⭐ 무늬를 좁게 박으면 **다른 흠이 그 옆으로 지나간다.** 이 자가 꼭 그랬다.
 */

/**
 * 아직 오지 않은 때를 말하는 lastmod 가 몇인가.
 * ⛔ 날이 하나도 없으면 null — 「미래가 없다」가 아니라 **못 쟀다**다.
 *
 * ⚠ 처음에 「날짜만 적힌 꼴은 그 날 «끝»까지 봐 준다」로 짰다가 자가시험이 잡았다.
 *   그렇게 하면 `2026-10-11`(한국 날짜를 그냥 적은 것)을 봐 주게 된다 — 그런데 그것이
 *   바로 **고쳐야 할 미래 값**이다. 봐 주면 자가 흠을 덮는다.
 * ⇒ 꼴을 가리지 않고 **그 값이 가리키는 가장 이른 때**로 읽는다. 날짜만이면 그 날 자정(UTC).
 */
export function 미래몫(글, 이제 = new Date()) {
  if (글 == null) return null;
  const s = String(글);
  if (!/<urlset/i.test(s)) return null;
  const 값들 = (s.match(/<lastmod>\s*([^<\s]+)/g) || []).map((x) => x.replace(/^<lastmod>\s*/, ''));
  if (!값들.length) return null;
  const 미래 = [];
  for (const v of 값들) {
    const t = Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v}T00:00:00Z` : v);
    if (Number.isFinite(t) && t > 이제.getTime()) 미래.push(v);
  }
  return { 전체: 값들.length, 미래수: 미래.length, 보기: 미래.slice(0, 3), 몫: 미래.length / 값들.length };
}
export function 빠진몫(글) {
  if (글 == null) return null;
  const s = String(글);
  if (!/<urlset/i.test(s)) return null;      /* ⛔ 묶음(sitemapindex)은 lastmod 가 없어도 된다 */
  const 주소수 = (s.match(/<loc>/gi) || []).length;
  if (!주소수) return null;                   /* ⛔ 0 으로 떨어뜨리지 않는다 */
  const 날수 = (s.match(/<lastmod>/gi) || []).length;
  const 빠진것 = Math.max(0, 주소수 - 날수);
  return { 주소수, 날수, 빠진것, 몫: 빠진것 / 주소수 };
}

/** 한 날에 얼마나 몰렸나. ⛔ 날이 하나도 없으면 null — 「안 몰렸다」가 아니다 */
export function 한날몫(글) {
  if (글 == null) return null;
  const s = String(글);
  if (!/<urlset/i.test(s)) return null;
  const 날들 = (s.match(/<lastmod>\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/g) || [])
    .map((x) => x.slice(-10));
  if (!날들.length) return null;
  const 셈 = new Map();
  for (const d of 날들) 셈.set(d, (셈.get(d) ?? 0) + 1);
  let 많은날 = null; let 많은수 = 0;
  for (const [d, n] of 셈) if (n > 많은수) { 많은수 = n; 많은날 = d; }
  return { 전체: 날들.length, 서로다른날: 셈.size, 많은날, 많은수, 몫: 많은수 / 날들.length };
}

/** 사이트맵 묶음에서 자식 사이트맵 주소를 편다. ⛔ 묶음이 아니면 빈손 */
export function 묶음펴기(글) {
  const s = String(글 ?? '');
  if (!/<sitemapindex/i.test(s)) return [];
  return (s.match(/<loc>\s*([^<\s]+)/g) || []).map((x) => x.replace(/^<loc>\s*/, ''));
}

/** 그날 하루만 놓고 볼 때 「몫이 크다」인가. ⛔ 이것만으로 빨강을 내지 않는다 */
export function 몫이큰가(잰것) {
  if (!잰것 || 잰것.몫 == null) return false;
  if (잰것.전체 < 최소장수) return false;
  return 잰것.몫 > 넘으면빨강;
}

/** 기록 한 줄 만들기 — 날짜 · 이름 · 전체 · 오늘 */
export function 기록줄(날, 이름, 잰것) {
  return [날, 이름, 잰것?.전체 ?? '', 잰것?.오늘 ?? ''].join('\t');
}

/** 기록 읽기 */
export function 기록읽기(글) {
  return String(글 ?? '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const c = l.split('\t');
      return { 날: c[0], 이름: c[1], 전체: Number(c[2]), 오늘: Number(c[3]) };
    })
    .filter((x) => x.날 && x.이름 && Number.isFinite(x.전체) && Number.isFinite(x.오늘));
}

/** 하루 빼기 — 「2026-09-23」 → 「2026-09-22」. ⛔ toISOString 을 쓰지 않는다 */
export function 하루전(날) {
  const m = String(날 ?? '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * **며칠째 잇달아** 큰 몫을 「오늘」로 찍고 있나. 오늘을 1일째로 센다.
 * ⚠ 기록에 없는 날은 끊긴 것으로 본다 — 안 잰 날을 「그랬다」고 치지 않는다.
 */
export function 잇단날수(기록, 이름, 오늘, 오늘도큰가) {
  if (!오늘도큰가) return 0;
  const 큰날 = new Set((기록 ?? [])
    .filter((x) => x.이름 === 이름 && x.전체 >= 최소장수 && (x.오늘 / x.전체) > 넘으면빨강)
    .map((x) => x.날));
  let n = 1;                     /* 오늘 */
  let d = 하루전(오늘);
  while (d && 큰날.has(d)) { n += 1; d = 하루전(d); }
  return n;
}

/* ── 자가시험 ─────────────────────────────────────────────── */
if (process.argv.includes('--자가시험')) {
  const 잰다 = [];
  const 본다 = (이름, v) => 잰다.push([이름, !!v]);
  const 맵 = (날들) => `<urlset>${날들.map((d) => `<url><lastmod>${d}</lastmod></url>`).join('')}</urlset>`;
  const 오늘 = '2026-09-23';

  본다('오늘 것을 센다', 오늘몫(맵([오늘, 오늘, '2026-01-01']), 오늘).오늘 === 2);
  본다('몫을 셈한다', Math.abs(오늘몫(맵([오늘, '2026-01-01']), 오늘).몫 - 0.5) < 1e-9);
  본다('전체도 센다', 오늘몫(맵([오늘, '2026-01-01', '2025-05-05']), 오늘).전체 === 3);
  본다('⛔ 사이트맵이 아니면 null', 오늘몫('<html></html>', 오늘) === null);
  본다('⛔ 빈 것도 null', 오늘몫(null, 오늘) === null && 오늘몫('<urlset></urlset>', '') === null);
  본다('lastmod 가 없으면 몫은 null — 흠이 아니다',
    오늘몫('<urlset><url><loc>x</loc></url></urlset>', 오늘).몫 === null);

  const 다오늘 = 오늘몫(맵(Array(1468).fill(오늘)), 오늘);
  본다('몫이 크다고는 본다', 몫이큰가(다오늘) === true);
  본다('그때 몫은 100% 였다', 다오늘.몫 === 1);
  본다('⚠ 지면이 적으면 판정하지 않는다', 몫이큰가(오늘몫(맵(Array(10).fill(오늘)), 오늘)) === false);
  본다('절반은 아직 참는다',
    몫이큰가(오늘몫(맵(Array(50).fill(0).map((_, i) => (i < 25 ? 오늘 : '2026-01-01'))), 오늘)) === false);
  본다('절반을 넘으면 크다',
    몫이큰가(오늘몫(맵(Array(50).fill(0).map((_, i) => (i < 26 ? 오늘 : '2026-01-01'))), 오늘)) === true);
  본다('⛔ 못 잰 것을 크다고 하지 않는다', 몫이큰가(null) === false);

  /* 🔴 [2026-10-11] ④ 미래 — 감은 실측한 값에서 떠 왔다(일본·대만 사이트맵) */
  const 이제 = new Date('2026-10-10T17:46:00Z');
  const 맵하나 = (v) => `<urlset><url><loc>a</loc><lastmod>${v}</lastmod></url></urlset>`;
  본다('🔴🔴 아직 오지 않은 때를 집는다 (실측한 값 그대로)',
    미래몫(맵하나('2026-10-11T00:00:00.000Z'), 이제).미래수 === 1);
  본다('⛔ 지나간 때는 안 집는다',
    미래몫(맵하나('2026-10-09T00:00:00.000Z'), 이제).미래수 === 0);
  /* 🔴 처음에 「날짜만이면 그 날 끝까지 봐 준다」로 짰다가 이 자가시험이 잡았다 —
     그러면 한국 날짜를 그냥 적은 「2026-10-11」을 봐 주게 된다. 그것이 고쳐야 할 값인데. */
  본다('⛔ 오늘 날짜만 적힌 것은 미래가 아니다 (그 날 자정은 이미 지났다)',
    미래몫(맵하나('2026-10-10'), 이제).미래수 === 0);
  본다('🔴 날짜만 적혀도 «다음 날»이면 집는다',
    미래몫(맵하나('2026-10-11'), 이제).미래수 === 1);
  본다('⛔ lastmod 가 하나도 없으면 null — 「미래가 없다」가 아니라 못 쟀다',
    미래몫('<urlset><url><loc>a</loc></url></urlset>', 이제) === null);
  본다('⛔ 묶음(sitemapindex)은 재지 않는다',
    미래몫('<sitemapindex><sitemap><loc>a</loc></sitemap></sitemapindex>', 이제) === null);
  본다('⛔ 빈 입력에도 안 죽는다', 미래몫(null, 이제) === null);

  /* 🔴 [2026-10-06 12:0x · 5번] 「아무 말도 안 한다」와 「다 같은 날이라 한다」를 센다 */
  const 빈것 = '<urlset>' + '<url><loc>a</loc></url>'.repeat(4)
    + '<url><loc>b</loc><lastmod>2026-09-16</lastmod></url>' + '</urlset>';
  본다('🔴 lastmod 가 빠진 몫을 센다', Math.abs(빠진몫(빈것).몫 - 0.8) < 1e-9);
  본다('주소 수와 날 수를 나란히 적는다', 빠진몫(빈것).주소수 === 5 && 빠진몫(빈것).날수 === 1);
  본다('⛔ 묶음(sitemapindex)은 재지 않는다 — lastmod 가 없어도 된다',
    빠진몫('<sitemapindex><sitemap><loc>x</loc></sitemap></sitemapindex>') === null);
  본다('⛔ 사이트맵이 아니면 null', 빠진몫('<html></html>') === null && 빠진몫(null) === null);
  본다('⛔ 주소가 없으면 null — 「다 있다」가 아니다', 빠진몫('<urlset></urlset>') === null);

  const 한날 = '<urlset>' + '<url><loc>a</loc><lastmod>2026-09-16</lastmod></url>'.repeat(97)
    + '<url><loc>b</loc><lastmod>2026-09-23</lastmod></url>'.repeat(3) + '</urlset>';
  본다('🔴 한 날에 몰린 몫을 센다', Math.abs(한날몫(한날).몫 - 0.97) < 1e-9);
  본다('가장 많은 날을 집는다', 한날몫(한날).많은날 === '2026-09-16');
  본다('서로 다른 날이 몇인지 센다', 한날몫(한날).서로다른날 === 2);
  본다('⛔ 날이 하나도 없으면 null — 「안 몰렸다」가 아니다',
    한날몫('<urlset><url><loc>a</loc></url></urlset>') === null);

  본다('묶음을 편다', 묶음펴기('<sitemapindex><sitemap><loc>https://a/b.xml</loc></sitemap></sitemapindex>')
    .length === 1);
  본다('⛔ 묶음이 아니면 빈손', 묶음펴기('<urlset><url><loc>x</loc></url></urlset>').length === 0);

  본다('하루를 뺀다', 하루전('2026-09-23') === '2026-09-22');
  본다('달을 넘어도 뺀다', 하루전('2026-09-01') === '2026-08-31');
  본다('해를 넘어도 뺀다', 하루전('2026-01-01') === '2025-12-31');
  본다('⛔ 꼴이 틀리면 null', 하루전('x') === null && 하루전(null) === null);

  /* 🔴 이 자리가 이 자의 알맹이다 */
  const 기록 = 기록읽기(['# 머리', '2026-09-22\tKLifeMap\t1991\t1468', '2026-09-21\tKLifeMap\t500\t3'].join('\n'));
  본다('기록을 읽는다', 기록.length === 2 && 기록[0].오늘 === 1468);
  본다('⛔ 머리줄을 읽지 않는다', !기록.some((x) => String(x.날).startsWith('#')));
  본다('⛔ 빈 것에 안 터진다', 기록읽기(null).length === 0 && 기록읽기('').length === 0);

  본다('🔴 오늘도 크고 어제도 컸으면 2일째', 잇단날수(기록, 'KLifeMap', 오늘, true) === 2);
  본다('🔴 오늘만 크면 1일째 — 하루는 참는다', 잇단날수(기록, 'SeoulMarkets', 오늘, true) === 1);
  본다('⭐ 오늘 안 크면 0 — 고쳐진 것이다', 잇단날수(기록, 'KLifeMap', 오늘, false) === 0);
  본다('⚠ 안 잰 날은 끊긴 것으로 본다 — 「그랬다」고 치지 않는다',
    잇단날수(기록읽기('2026-09-20\tKLifeMap\t1991\t1468'), 'KLifeMap', 오늘, true) === 1);
  본다('⛔ 빈 기록에 안 터진다', 잇단날수(null, 'KLifeMap', 오늘, true) === 1);

  본다('🔴 이틀째가 되면 빨강이다', 잇단날수(기록, 'KLifeMap', 오늘, true) >= 잇달아며칠);
  본다('기록 줄을 만든다', 기록줄(오늘, 'X', { 전체: 10, 오늘: 5 }) === `${오늘}\tX\t10\t5`);

  본다('재는 곳이 적혀 있다', 볼곳.length >= 2 && 볼곳.every((x) => /^https:/.test(x.주소)));
  본다('⚠ 기사 사이트맵은 안 잰다 — 날마다 새 글이 붙는 자리다',
    !볼곳.some((x) => /sitemap-(equities|fx|rates|macro|commodities|funds)/.test(x.주소)));

  const 진 = 잰다.filter(([, v]) => !v);
  for (const [이름, v] of 잰다) console.log(`${v ? '✅' : '🔴'} ${이름}`);
  console.log(진.length ? `\n🔴 ${진.length}/${잰다.length} 떨어졌다` : `\n✅ 자가시험 ${잰다.length} 통과`);
  process.exit(진.length ? 1 : 0);
}

/* ── 실제로 잰다 ──────────────────────────────────────────── */
{
  const 오늘 = new Date().toLocaleDateString('sv-SE');
  const 쌓나 = !process.argv.includes('--안쌓는다');
  const 길 = path.join(뿌리, 기록길);
  let 기록 = [];
  try { 기록 = 기록읽기(fs.readFileSync(길, 'utf8')); } catch { 기록 = []; }
  /* 오늘 줄이 이미 있으면 빼고 다시 넣는다 — 하루에 여러 번 돌려도 줄이 안 늘어난다 */
  기록 = 기록.filter((x) => x.날 !== 오늘);

  console.log(`■ 사이트맵이 「오늘 다 고쳤다」고 말하고 있나 — ${오늘}`);
  const 새줄 = [];
  let 빨강 = 0;
  let 못잼 = 0;
  /* 🔴 [2026-10-06 12:1x · 5번] **빨강 하나에 끝말을 하나만 두었더니 엉뚱한 말이 나갔다.**
     「lastmod 를 안 말한다」로 빨강이 났는데 끝에 「날마다 전부 오늘이라 한다」가 찍혔다.
     까닭이 다르면 고칠 곳도 다르다. 까닭을 따로 센다. */
  const 빨강까닭 = { 날마다오늘: 0, 말안함: 0 };

  for (const 곳 of 볼곳) {
    let 글 = null;
    try {
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), 20000);
      const r = await fetch(곳.주소, { signal: ac.signal });
      clearTimeout(t);
      글 = r.ok ? await r.text() : null;
    } catch { 글 = null; }

    const 잰것 = 오늘몫(글, 오늘);
    if (잰것 == null) { console.log(`   ⬜ ${곳.이름} — 못 쟀다 (${곳.주소})`); 못잼 += 1; continue; }
    if (잰것.몫 == null) { console.log(`   ⬜ ${곳.이름} — lastmod 가 없다 (${잰것.전체}장). 흠은 아니다`); continue; }

    새줄.push(기록줄(오늘, 곳.이름, 잰것));
    const 큰가 = 몫이큰가(잰것);
    const 날수 = 잇단날수(기록, 곳.이름, 오늘, 큰가);
    const 글몫 = `${(잰것.몫 * 100).toFixed(1)}%`;

    if (날수 >= 잇달아며칠) {
      console.log(`   🔴 ${곳.이름} — ${잰것.전체}장 가운데 ${잰것.오늘}장(${글몫})이 「오늘」. **${날수}일째 잇달아** 그렇다`);
      빨강 += 1; 빨강까닭.날마다오늘 += 1;
    } else if (큰가) {
      console.log(`   ⚠ ${곳.이름} — ${잰것.전체}장 가운데 ${잰것.오늘}장(${글몫})이 「오늘」 (${날수}일째)`);
      console.log(`      오늘 정말 그만큼 냈으면 맞다. 내일도 같으면 빨강이 된다`);
    } else {
      console.log(`   ✅ ${곳.이름} — ${잰것.전체}장 가운데 ${잰것.오늘}장(${글몫})이 「오늘」`);
    }

    /* ④ 아직 오지 않은 때를 말하나 — 위 셋이 다 초록인데 이것이 빨간 적이 있다(2026-10-11) */
    const 앞선것 = 미래몫(글);
    if (앞선것 && 앞선것.미래수) {
      console.log(`   🔴 ${곳.이름} — ${앞선것.전체}장 가운데 ${앞선것.미래수}장이 **아직 오지 않은 때**를 말한다`);
      console.log(`      ${앞선것.보기.join(' · ')} — 구글은 미래 lastmod 를 안 믿는다. 그 신호가 통째로 죽는다`);
      console.log('      ⭐ 한국 날짜를 UTC 자정으로 만들면 새벽에 이렇게 된다 — +09:00 으로 읽는다');
      빨강 += 1;
    }
  }

  /* 🔴🔴 [2026-10-06 12:0x · 5번] **아무 말도 안 하는 묶음을 찾는다.**
     이 자는 「거짓말하나」만 물어서, seoulmarkets 7,670장 가운데 4,931장에
     lastmod 가 «아예 없는 것»을 두 달 넘게 못 봤다. 날마다 ✅ 를 찍고 있었다. */
  console.log('\n■ 사이트맵이 「언제 바뀌었나」를 아예 안 말하고 있나');
  for (const 뿌리맵 of [...new Set(볼곳.map((x) => x.주소.replace(/sitemap-[^/]+\.xml$/, "sitemap.xml")))]) {
    let 묶음글 = null;
    try {
      const r = await fetch(뿌리맵);
      묶음글 = r.ok ? await r.text() : null;
    } catch { 묶음글 = null; }
    const 아이들 = 묶음펴기(묶음글);
    /* ⚠ 묶음이 아닌 사이트맵도 있다(klifemap 은 한 장에 3,007주소다).
       ⛔ 그것을 「못 쟀다」로 뭉개지 않는다 — 그 자리에서 바로 잰다. */
    const 볼것 = 아이들.length ? 아이들 : (묶음글 ? [뿌리맵] : []);
    if (!볼것.length) { console.log(`   ⬜ ${뿌리맵} — 못 받았다`); 못잼 += 1; continue; }
    for (const 아이 of 볼것) {
      let g = null;
      try { const r = await fetch(아이); g = r.ok ? await r.text() : null; } catch { g = null; }
      const 빠 = 빠진몫(g);
      const 한 = 한날몫(g);
      const 짧 = 아이.replace(/^https?:\/\/[^/]+/, "");
      if (!빠) { console.log(`   ⬜ ${짧} — 못 쟀다`); 못잼 += 1; continue; }
      if (빠.몫 >= 0.5) {
        console.log(`   🔴 ${짧} — ${빠.주소수}장 가운데 ${빠.빠진것}장(${(빠.몫 * 100).toFixed(0)}%)이 lastmod 를 «안» 말한다`);
        빨강 += 1; 빨강까닭.말안함 += 1;
      } else if (빠.빠진것) {
        console.log(`   ⚠ ${짧} — ${빠.주소수}장 가운데 ${빠.빠진것}장이 lastmod 를 안 말한다`);
      } else if (한 && 한.전체 >= 최소장수 && 한.몫 > 0.9) {
        console.log(`   ⚠ ${짧} — ${한.전체}장 가운데 ${한.많은수}장(${(한.몫 * 100).toFixed(0)}%)이 «같은 날»(${한.많은날})이다`);
        console.log('      타래를 한꺼번에 지었으면 맞다. 아니면 안 바뀐 지면까지 바뀌었다고 하는 것이다');
      } else {
        console.log(`   ✅ ${짧} — ${빠.주소수}장 다 말한다${한 ? ` · 서로 다른 날 ${한.서로다른날}` : ""}`);
      }
    }
  }

  if (쌓나 && 새줄.length) {
    const 머리 = '# 사이트맵 lastmod 기록 — 날짜\t사이트\t전체\t오늘\n'
      + '# ⛔ 이 파일을 지우면 「며칠째 잇달아」를 못 센다. 하루치만으로는 판정이 안 된다\n';
    const 남길것 = [...기록.map((x) => 기록줄(x.날, x.이름, x)), ...새줄]
      .sort();
    fs.mkdirSync(path.dirname(길), { recursive: true });
    fs.writeFileSync(길, 머리 + 남길것.join('\n') + '\n', 'utf8');
    console.log(`   ✔ 기록에 쌓았다 — ${기록길} (${남길것.length}줄)`);
  }

  if (빨강까닭.날마다오늘) {
    console.log('\n⛔ 사이트맵이 «날마다» 「전부 오늘 고쳤다」고 말하고 있다.');
    console.log('   구글은 그런 lastmod 를 «아예 무시»하기 시작한다 — 진짜 고친 날에 알릴 길이 사라진다.');
    console.log('   ✅ 고치는 법: 자료가 안 바뀌는 지면은 lastmod 를 «만든 날»로 고정한다.');
    console.log('               내용을 실제로 고칠 때만 그 날짜를 손으로 올린다.');
  }
  if (빨강까닭.말안함) {
    console.log('\n⛔ 사이트맵이 「언제 바뀌었나」를 «아예 안 말하는» 묶음이 있다.');
    console.log('   구글이 다시 올 때를 정할 근거가 없다. 큰 묶음일수록 크게 손해다.');
    console.log('   ✅ 고치는 법: 자료 타래가 들고 있는 «지은 날»을 붙인다(src/pages/sitemap-[section].xml.ts).');
    console.log('   ⛔ 「오늘」을 찍지 않는다 — 그러면 위의 거짓말이 된다.');
  }
  if (빨강) process.exit(1);
  if (못잼) console.log('\n⬜ 못 잰 곳이 있다 — 「초록」으로 읽지 않는다.');
  else console.log('\n✅ 거짓말하는 사이트맵 0 · 말 안 하는 묶음 0');
}
