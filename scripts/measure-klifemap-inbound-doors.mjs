#!/usr/bin/env node
/**
 * measure-klifemap-inbound-doors.mjs — **klifemap 지면이 홈에서 «몇 걸음»인가.**
 * ─────────────────────────────────────────────────────────────────────────────
 * 매체: **KLifeMap**(klifemap.ai). ⛔ 이 자는 «재기만» 한다. 아무것도 안 고친다 —
 *   klifemap 은 매출이 나는 서비스다. 재는 자가 그 서비스를 건드릴 이유가 없다.
 *
 * ── 🔴 왜 (2026-09-08 · 4번 물음에 5번이 답하려고 지음) ────────────
 * 4번이 klifemap 색인을 재서 「표본 12장 중 색인 0. 7장은 구글이 주소를 아직 모른다」고 했다.
 * 사장님이 「네가 해봐」 하셔서 내가 재고 답했다.
 *
 * ── 🔴🔴 그런데 내 첫 판이 «두 번» 틀렸다. 둘 다 적어 둔다 ─────────
 *
 * **첫째 틀림 — 표본 다섯 장으로 전체를 셌다.**
 *   홈·saju·astro·horoscope 넷과 콘텐트 한 장만 열어 보고
 *   「사이트맵에만 있고 안쪽 문이 없는 지면 484장(98%)」이라고 냈다.
 *   전수로 재니 104장(21%)이었다. 표본에 `/content` 목록 지면이 빠져 있었다.
 *
 * **둘째 틀림 — 쪽 넘김을 아예 안 봤다. 4번이 잡아 줬다.**
 *   4번: 「career-042 가 `/content?page=5` 에는 이미 잡히는데 5번 문0 목록에도 들어 있다.
 *        진짜 표적이 «목록 쪽넘김»이 아니라 «관련 글 본문링크»일 수 있다」
 *   재 보니 4번이 옳았다 — `/content?page=5` 가 career-042 를 가리킨다.
 *   ⛔ 내 자가 `?물음표`를 떼어 버려서 `/content?page=5` 를 `/content` 로 눌러 버렸고,
 *     그래서 **쪽 넘김 지면을 한 장도 안 열었다.** 그 안의 링크를 다 잃은 것이다.
 *
 * ⭐ 그러니 이 자료의 참말은 「고립」가 아니라 **「깊다」**다.
 *   `/content` 1쪽에는 쪽넘김 링크가 **「다음」 하나**뿐이다. 25쪽이면 홈에서 스물다섯 걸음이다.
 *   구글은 깊은 주소를 낮은 우선순위로 두고 늦게 온다 — 4번이 본 「아직 모른다」가 그 모습이다.
 *
 * ⛔ 「문이 없다」와 「멀다」는 **다른 병이고 처방도 다르다.**
 *   문이 없으면 링크를 달아야 하고, 멀면 «가까운 목록»을 만들어야 한다.
 *   내가 그것을 섞어 말했다. 그래서 이 자를 «깊이 재는 자»로 다시 지었다.
 *
 * 쓰는 법
 *   node scripts/measure-klifemap-inbound-doors.mjs
 *   node scripts/measure-klifemap-inbound-doors.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';

const 뿌리 = path.resolve(import.meta.dirname, '..');
const 사이트맵 = 'https://klifemap.ai/sitemap.xml';
const 바탕 = 'https://klifemap.ai';
const 시작길 = '/';

/** 사이트맵 글에서 주소를 뽑는다 */
export function 주소뽑기(xml) {
  return [...String(xml ?? '').matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
}

/**
 * 주소를 «하나의 이름»으로 만든다.
 *
 * 🔴 [2026-09-08] 첫 판은 `?물음표`를 **무조건 떼었다.** 그래서 `/content?page=5` 가
 *   `/content` 가 되고, 쪽 넘김 지면을 한 장도 안 열었다. 링크를 통째로 잃었다.
 * ✅ 이제 «쪽 넘김 물음표»는 살린다. 그 밖의 물음표는 뗀다 —
 *   추적 값(`utm_*` 따위)까지 살리면 같은 지면이 여러 개로 세어진다.
 * ⛔ `#조각`은 언제나 뗀다. 같은 지면이다.
 */
export function 이름꼴(길) {
  let s = String(길 ?? '').split('#')[0];
  if (!s) return null;
  const [앞, 물음] = s.split('?');
  let 뒤 = '';
  if (물음) {
    const 살릴것 = [];
    for (const 짝 of 물음.split('&')) {
      const [k, v] = 짝.split('=');
      if (/^(page|p|쪽)$/i.test(k ?? '') && /^\d+$/.test(v ?? '')) 살릴것.push(`${k.toLowerCase()}=${Number(v)}`);
    }
    if (살릴것.length) 뒤 = `?${살릴것.sort().join('&')}`;
  }
  let 몸 = 앞 || '/';
  if (몸.length > 1) 몸 = 몸.replace(/\/$/, '');
  /* ⭐ page=1 은 1쪽과 같은 지면이다. 둘로 세지 않는다 */
  if (뒤 === '?page=1' || 뒤 === '?p=1') 뒤 = '';
  return 몸 + 뒤;
}

/**
 * 한 지면의 글에서 **같은 사이트 안쪽 길**만 뽑는다.
 * ⛔ 남의 사이트 링크는 안쪽 문이 아니다.
 */
export function 안쪽길뽑기(html, 바탕주소 = 바탕) {
  const 길들 = [...String(html ?? '').matchAll(/href\s*=\s*["']([^"']+)["']/g)].map((m) => m[1]);
  const 답 = new Set();
  for (const h of 길들) {
    if (!h || h.startsWith('#') || /^(mailto:|tel:|javascript:)/i.test(h)) continue;
    let 길 = null;
    if (h.startsWith('/')) 길 = h;
    else if (h.startsWith(바탕주소)) 길 = h.slice(바탕주소.length) || '/';
    else if (/^https?:/i.test(h)) continue;          /* 남의 사이트 */
    else 길 = `/${h}`;                                /* 상대 길 */
    const 이름 = 이름꼴(길);
    if (이름) 답.add(이름);
  }
  return [...답];
}

/** 주소에서 이름꼴만. ⛔ 못 읽으면 null — 짐작하지 않는다 */
export function 길만(주소) {
  try { return 이름꼴(new URL(주소).pathname + (new URL(주소).search || '')); }
  catch { return null; }
}

async function 기본받기(u) {
  try {
    const r = await fetch(u, { signal: AbortSignal.timeout(25000) });
    if (!r.ok) return { 못받음: `HTTP ${r.status}` };
    return { 글: await r.text() };
  } catch (e) {
    return { 못받음: e.message };
  }
}

/**
 * 홈에서 걸어 나가며 «몇 걸음»인지 잰다(너비 우선).
 * ⚠ 사이트맵에 있는 주소 + 쪽 넘김 주소만 따라간다 — 끝없이 도는 것을 막는다.
 * ⛔ 못 받은 지면은 「못 받았다」로 남긴다. 0 걸음으로 치지 않는다.
 */
export async function 걸음재기({ 시작 = 시작길, 갈수있나, 한번에 = 6, 쉬는틈 = 120, 받기 = 기본받기, 최대지면 = 4000 } = {}) {
  const 걸음 = new Map([[시작, 0]]);
  const 못받은 = [];
  const 링크수 = new Map();
  let 이번줄 = [시작];
  let 깊이 = 0;
  let 본것 = 0;

  while (이번줄.length && 본것 < 최대지면) {
    const 다음줄 = [];
    for (let i = 0; i < 이번줄.length; i += 한번에) {
      const 묶음 = 이번줄.slice(i, i + 한번에);
      const 것들 = await Promise.all(묶음.map(async (p) => [p, await 받기(바탕 + p)]));
      for (const [p, v] of 것들) {
        본것 += 1;
        if (v.못받음) { 못받은.push({ 길: p, 왜: v.못받음 }); continue; }
        const 간곳 = 안쪽길뽑기(v.글);
        링크수.set(p, 간곳.length);
        for (const q of 간곳) {
          if (걸음.has(q)) continue;
          if (!갈수있나(q)) continue;
          걸음.set(q, 깊이 + 1);
          다음줄.push(q);
        }
      }
      if (i + 한번에 < 이번줄.length) await new Promise((r) => setTimeout(r, 쉬는틈));
    }
    이번줄 = 다음줄;
    깊이 += 1;
  }
  return { 걸음, 못받은, 링크수, 본것 };
}

/* ── 자가시험 ────────────────────────────────────────────────── */
const 내가입구인가 = !!process.argv[1]
  && process.argv[1].split(/[\\/]/).pop() === new URL(import.meta.url).pathname.split('/').pop();

if (내가입구인가 && process.argv.includes('--자가시험')) {
  const 시험 = [];
  const 재다 = (이름, 참) => 시험.push([이름, !!참]);

  재다('주소뽑기 — loc 두 개', 주소뽑기('<loc>https://a/x</loc><loc>https://a/y</loc>').length === 2);
  재다('주소뽑기 — 빈 글은 0개', 주소뽑기('').length === 0);

  /* 🔴 첫 판이 여기서 자료를 잃었다 — 4번이 잡아 준 자리다 */
  재다('이름꼴 — ?page= 는 «살린다»', 이름꼴('/content?page=5') === '/content?page=5');
  재다('이름꼴 — page=1 은 1쪽과 같은 지면', 이름꼴('/content?page=1') === '/content');
  재다('이름꼴 — 추적 물음표는 뗀다', 이름꼴('/content?utm_source=x') === '/content');
  재다('이름꼴 — 쪽과 추적이 섞이면 쪽만 살린다', 이름꼴('/content?utm_source=x&page=3') === '/content?page=3');
  재다('이름꼴 — #조각은 뗀다', 이름꼴('/content/a#위') === '/content/a');
  재다('이름꼴 — 끝 슬래시를 뗀다', 이름꼴('/content/a/') === '/content/a');
  재다('이름꼴 — 뿌리는 /', 이름꼴('/') === '/');

  const 보기 = `<a href="/content/a">A</a><a href="content/b">B</a>
    <a href="https://klifemap.ai/content?page=2">다음</a>
    <a href="https://klifemap.ai/content/c#조각">C</a>
    <a href="https://klifemap.ai/content/c?utm=1">같은 C</a>
    <a href="https://다른곳.com/content/z">남</a>`;
  const 길들 = 안쪽길뽑기(보기);
  재다('안쪽길 — 쪽넘김 링크를 잡는다', 길들.includes('/content?page=2'));
  재다('안쪽길 — 남의 사이트는 안 센다', !길들.some((x) => x.includes('/z')));
  재다('안쪽길 — 같은 지면을 하나로 센다', 길들.filter((x) => x === '/content/c').length === 1);

  /* 깊이 재기 — 「다음」 하나만 있는 쪽 넘김이 얼마나 깊어지나를 그대로 흉내 낸다 */
  const 가짜 = {
    '/': '<a href="/content">목록</a>',
    '/content': '<a href="/content/a1">a1</a><a href="/content?page=2">다음</a>',
    '/content?page=2': '<a href="/content/a2">a2</a><a href="/content?page=3">다음</a>',
    '/content?page=3': '<a href="/content/a3">a3</a>',
  };
  const 알수있는것 = new Set(['/', '/content', '/content?page=2', '/content?page=3', '/content/a1', '/content/a2', '/content/a3']);
  const r = await 걸음재기({
    갈수있나: (p) => 알수있는것.has(p),
    받기: async (u) => { const p = u.slice(바탕.length); return 가짜[p] ? { 글: 가짜[p] } : { 글: '' }; },
    한번에: 4, 쉬는틈: 0,
  });
  재다('깊이 — 홈은 0걸음', r.걸음.get('/') === 0);
  재다('깊이 — /content 는 1걸음', r.걸음.get('/content') === 1);
  재다('깊이 — 1쪽의 글은 2걸음', r.걸음.get('/content/a1') === 2);
  /* ⭐ 이것이 이 자를 다시 지은 까닭이다 — 「다음」만 있으면 걸음이 쪽수만큼 쌓인다 */
  재다('깊이 — 3쪽의 글은 4걸음 (쪽마다 한 걸음씩 쌓인다)', r.걸음.get('/content/a3') === 4);
  재다('깊이 — 못 받은 것은 0으로 치지 않는다', r.못받은.length === 0);

  const 틀린것 = 시험.filter(([, ok]) => !ok);
  for (const [이름, ok] of 시험) console.log(`  ${ok ? '✅' : '⛔'} ${이름}`);
  console.log(`\n자가시험 ${시험.length}건 · 어긋난 것 ${틀린것.length}건`);
  process.exit(틀린것.length ? 1 : 0);
}

if (내가입구인가) {
  const r0 = await fetch(사이트맵, { signal: AbortSignal.timeout(25000) });
  if (!r0.ok) { console.log(`🔴 사이트맵을 못 받았다 — HTTP ${r0.status}`); process.exit(1); }
  const 사이트맵길 = new Set(주소뽑기(await r0.text()).map(길만).filter(Boolean));
  console.log(`사이트맵 지면 ${사이트맵길.size}장 — 홈에서 «몇 걸음»인지 잰다`);
  console.log('⚠ 재기만 합니다. 이 자는 klifemap 을 고치지 않습니다.');
  console.log('⭐ 쪽 넘김(?page=N)도 따라갑니다 — 첫 판은 그것을 떼어 버려 자료를 잃었습니다.\n');

  const 갈수있나 = (p) => 사이트맵길.has(p) || /[?&](page|p)=\d+/i.test(p);
  const { 걸음, 못받은, 본것 } = await 걸음재기({ 갈수있나 });

  const 못받은몫 = 본것 ? 못받은.length / 본것 : 1;
  if (못받은몫 > 0.10) {
    console.log(`🔴 못 받은 지면이 ${(못받은몫 * 100).toFixed(0)}% (${못받은.length}장) 입니다 — 세지 않고 멈춥니다.`);
    for (const x of 못받은.slice(0, 5)) console.log(`   · ${x.길} — ${x.왜}`);
    process.exit(1);
  }

  const 사이트맵것 = [...사이트맵길].map((p) => ({ 길: p, 걸음: 걸음.has(p) ? 걸음.get(p) : null }));
  const 못닿은 = 사이트맵것.filter((x) => x.걸음 == null);
  const 닿은 = 사이트맵것.filter((x) => x.걸음 != null);
  const 칸 = [[0, 2], [3, 4], [5, 9], [10, 19], [20, 999]];

  console.log(`■ 사이트맵 ${사이트맵길.size}장 가운데`);
  console.log(`   홈에서 닿는 것 ${닿은.length}장 · **한 번도 안 닿는 것 ${못닿은.length}장**`);
  console.log(`   (훑은 지면 ${본것}장 · 못 받은 것 ${못받은.length}장)`);
  console.log('');
  console.log('■ 걸음 분포 — 깊으면 구글이 늦게 온다');
  for (const [a, b] of 칸) {
    const 것 = 닿은.filter((x) => x.걸음 >= a && x.걸음 <= b);
    console.log(`   ${String(a).padStart(2)}~${String(b === 999 ? '∞' : b).padEnd(3)} 걸음  ${String(것.length).padStart(4)}장`);
  }
  const 깊은것 = 닿은.filter((x) => x.걸음 >= 10).sort((a, b) => b.걸음 - a.걸음);
  console.log('');
  console.log(`■ 열 걸음 이상 ${깊은것.length}장 — 맛보기 10장`);
  for (const x of 깊은것.slice(0, 10)) console.log(`   ${String(x.걸음).padStart(2)}걸음 ← ${x.길}`);
  if (못닿은.length) {
    console.log('');
    console.log(`■ 한 번도 안 닿는 ${못닿은.length}장 — 맛보기 10장`);
    for (const x of 못닿은.slice(0, 10)) console.log(`   · ${x.길}`);
  }

  const 낼곳 = path.join(뿌리, 'src/data/klifemap-inbound-doors.json');
  fs.writeFileSync(낼곳, JSON.stringify({
    지은때: new Date().toLocaleString('ko-KR'),
    무엇을잰것: 'klifemap.ai 사이트맵 지면이 홈에서 몇 걸음인가 (쪽 넘김 ?page=N 도 따라간다)',
    '⛔ 이 자는 고치지 않는다': 'klifemap 은 매출이 나는 서비스다. 재기만 한다',
    '⚠ 첫 판이 틀렸다': '「문이 0인 지면 104장」이라고 냈다. 쪽 넘김을 떼어 버려 링크를 잃은 것이었다 — 4번이 잡아 줬다',
    사이트맵장수: 사이트맵길.size,
    훑은장수: 본것,
    못받은장수: 못받은.length,
    닿은장수: 닿은.length,
    못닿은장수: 못닿은.length,
    걸음중앙값: (() => { const v = 닿은.map((x) => x.걸음).sort((a, b) => a - b); return v.length ? (v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2) : null; })(),
    열걸음이상: 깊은것.length,
    열걸음이상목록: 깊은것.map((x) => ({ 길: x.길, 걸음: x.걸음 })),
    못닿은목록: 못닿은.map((x) => x.길),
    못받은것: 못받은.slice(0, 30),
  }, null, 2), 'utf8');
  console.log(`\n→ ${path.relative(뿌리, 낼곳)}`);
}
