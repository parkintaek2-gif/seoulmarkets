#!/usr/bin/env node
/**
 * check-sitemap-submitted.mjs — **사이트맵이 구글에 «제출돼 있고 읽히고 있나».**
 *
 * 🔴🔴 [2026-10-04 00:4x] 왜 만들었나
 *
 *   사장님이 「검색 색인, seo, geo효과는 언제 나타나기 시작하니?」라고 물으셔서 재 보니,
 *   klifemap.ai 는 **색인된 지면 24장 · 안 된 지면 819장**이었다(서치콘솔 개요).
 *   표본 58장을 URL 검사 API 로 물으니 **43장(74%)이 「구글이 한 번도 안 왔다」**였다.
 *
 *   ⭐ 「한 번도 안 왔다」가 이렇게 많으면 그것은 지면 하나하나의 흠이 아니다.
 *     **구글이 이 사이트에 오질 않는 것**이다. 그 첫 까닭이 사이트맵이다 —
 *     냈나 · 읽혔나 · 몇 장을 봤나 · 오류가 났나.
 *
 * ⛔ 「사이트맵 파일이 200 이다」를 「구글이 읽었다」로 읽지 않는다. 둘은 다른 말이다.
 *   이 자는 **구글이 말해 주는 쪽**(Search Console API)을 묻는다.
 *
 * 쓰는 법
 *   node scripts/check-sitemap-submitted.mjs
 *   node scripts/check-sitemap-submitted.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { createSign } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

export const 사이트 = [
  { 이름: 'klifemap', 속성: 'sc-domain:klifemap.ai' },
  { 이름: 'seoulmarkets', 속성: 'sc-domain:seoulmarkets.com' },
  /* ⛔ [2026-11-25 · 5번] K Culture Wire 는 2026-11-22 에 접었다 (사장님 — 「k컬쳐와이어는
     더이상 운영안한다」). 색인 요청을 내지 않는 사이트를 「14일째 안 읽혔다」고 빨강으로
     내면 그 옆의 «진짜» 빨강이 안 보인다. 운영하는 셋만 본다. */
  { 이름: '100y', 속성: 'sc-domain:100yearmap.com' },
];

/**
 * 구글이 돌려준 사이트맵 한 줄을 읽기 쉬운 꼴로.
 *
 * ⚠ [2026-10-04 00:5x] `indexed` 칸을 「구글이 넣은 장수」로 적었다가 **아홉 줄이 전부 0** 이
 *   나왔다. 네 사이트가 한꺼번에 0 일 리가 없다 — 자를 의심하니 맞았다.
 *   구글은 이 칸을 **더 이상 채워 주지 않는다**(값을 늘 0 으로 돌려준다).
 *   ⇒ 0 을 「색인이 하나도 안 됐다」로 읽으면 안 된다. **못 쟀다**로 적는다(강령 ③).
 *   색인 장수는 서치콘솔 「페이지」 화면이나 URL 검사 API 로 따로 재야 한다.
 */
export function 한줄읽기(s) {
  const 낸것 = Number(s?.contents?.[0]?.submitted ?? 0);
  const 색인raw = s?.contents?.[0]?.indexed;
  const 색인 = (색인raw === undefined || Number(색인raw) === 0) ? null : Number(색인raw);
  return {
    주소: String(s?.path ?? ''),
    낸장수: 낸것,
    구글이본장수: 색인,                 /* null = 구글이 안 알려 준다 */
    마지막제출: (s?.lastSubmitted ?? '').slice(0, 10),
    마지막읽음: (s?.lastDownloaded ?? '').slice(0, 10) || null,
    오류: Number(s?.errors ?? 0),
    경고: Number(s?.warnings ?? 0),
    막혔나: Boolean(s?.isPending) || !s?.lastDownloaded,
  };
}

/**
 * 🔴🔴 [2026-10-12 17:4x · 5번] **이 자가 「읽혔다 ✅」만 보여 주고 «언제»를 안 따졌다.**
 * ─────────────────────────────────────────────────────────────────────
 * 오늘 재 보니 seoulmarkets 사이트맵이 **2026-10-05 이후 안 읽혔다** —
 * 그 사이 klifemap 은 10-11, kcw·100y 는 10-10 에 읽혔다.
 * 그 이레 동안 데이터 지면을 **다섯 장** 냈는데 **구글은 그것을 모른다.**
 * 서치콘솔에서 재 본 표본 여덟 장 가운데 **둘이 「아직 알려지지 않은 URL」**이었다.
 *
 * ⛔ 자가 ✅ 를 내니 아무도 안 들여다봤다. **「읽혔다」가 「요즘 읽힌다」가 아니다.**
 * ⇒ 며칠이나 묵었나를 따져 빛을 낸다. 다른 세 곳이 1~3일마다 읽히므로 선을 닷새로 둔다.
 * ⚠ 선은 오늘 하루 실측으로 정했다 — 며칠 더 재서 다시 맞춘다. 어림으로 옮기지 않는다.
 */
export const 묵은선 = 5;

/** 며칠 묵었나 — 날짜를 못 읽으면 null (⛔ 0 이 아니다) */
export function 며칠묵었나(마지막읽음, 오늘 = new Date()) {
  const t = String(마지막읽음 ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
  const [y, m, d] = t.split('-').map(Number);
  const 그때 = new Date(y, m - 1, d);
  if (Number.isNaN(그때.getTime())) return null;
  const 오늘0 = new Date(오늘.getFullYear(), 오늘.getMonth(), 오늘.getDate());
  return Math.round((오늘0 - 그때) / 86400000);
}

/** 그 줄이 성한가 — ⛔ 「못 쟀다」와 「깨졌다」를 가른다 */
export function 판정(줄, 오늘 = new Date()) {
  if (!줄.마지막읽음) return { 빛: '🔴', 말: '구글이 «한 번도 안 읽었다»' };
  if (줄.오류) return { 빛: '🔴', 말: `오류 ${줄.오류}건` };
  if (줄.낸장수 === 0) return { 빛: '⚠', 말: '낸 장수가 0 — 사이트맵이 비었나' };
  const 묵음 = 며칠묵었나(줄.마지막읽음, 오늘);
  if (묵음 == null) return { 빛: '⬜', 말: `읽힌 날을 못 읽었다 (${줄.마지막읽음})` };
  if (묵음 > 묵은선) {
    return {
      빛: '🔴',
      말: `**${묵음}일째 안 읽혔다** (${줄.마지막읽음}) — 그 사이 낸 지면을 구글이 모른다`,
    };
  }
  return { 빛: '✅', 말: `읽혔다 (${줄.마지막읽음} · ${묵음}일 전)` };
}

function 토큰만들기() {
  try {
    for (const 줄 of fs.readFileSync(path.join(뿌리, '.env'), 'utf8').split(/\r?\n/)) {
      const m = 줄.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  } catch (e) { /* .env 가 없어도 환경변수로 올 수 있다 */ }
  const 열쇠길 = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!열쇠길 || !fs.existsSync(열쇠길)) throw new Error('GOOGLE_APPLICATION_CREDENTIALS 가 없다');
  const 키 = JSON.parse(fs.readFileSync(열쇠길, 'utf8'));
  const s0 = Math.floor(Date.now() / 1000);
  const h = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const b = Buffer.from(JSON.stringify({
    iss: 키.client_email,
    scope: 'https://www.googleapis.com/auth/webmasters.readonly',
    aud: 'https://oauth2.googleapis.com/token', iat: s0, exp: s0 + 3600,
  })).toString('base64url');
  const sig = createSign('RSA-SHA256').update(`${h}.${b}`).sign(키.private_key, 'base64url');
  return fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${h}.${b}.${sig}` }),
  }).then((r) => r.json()).then((j) => j.access_token);
}

const 내가진입점 = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (내가진입점 && process.argv.includes('--자가시험')) {
  let 탈 = 0;
  const 본다 = (이름, 참) => { console.log((참 ? '✅ ' : '🔴 ') + 이름); if (!참) 탈 += 1; };

  const 성한것 = 한줄읽기({
    path: 'https://a.com/sitemap.xml', lastSubmitted: '2026-09-01T00:00:00Z',
    lastDownloaded: '2026-10-01T00:00:00Z', errors: 0, warnings: 1,
    contents: [{ submitted: '2864', indexed: '24' }],
  });
  본다('낸 장수와 구글이 본 장수를 읽는다', 성한것.낸장수 === 2864 && 성한것.구글이본장수 === 24);
  /* 🔴 [2026-10-04] 구글이 indexed 를 늘 0 으로 준다 — 0 을 「색인 0 장」으로 읽으면 거짓말이 된다 */
  const 영이온것 = 한줄읽기({ path: 'x', lastDownloaded: '2026-10-01T00:00:00Z', contents: [{ submitted: '100', indexed: '0' }] });
  본다('🔴 indexed 가 0 이면 «못 쟀다»(null)로 둔다', 영이온것.구글이본장수 === null);
  본다('⛔ 그래도 낸 장수는 그대로 읽는다', 영이온것.낸장수 === 100);
  본다('날짜를 날까지만 자른다', 성한것.마지막읽음 === '2026-10-01');
  /* ⚠ [2026-10-12] 「돌리는 날에 따라 답이 달라지는 시험은 시험이 아니다」 —
     묵음 판정을 넣자 이 줄이 오늘 날짜에 끌려갔다. 오늘을 못 박는다. */
  const 그날 = new Date(2026, 9, 3);          /* 2026-10-03 — 읽힌 지 이틀 */
  본다('성한 것은 ✅', 판정(성한것, 그날).빛 === '✅');
  본다('   며칠 전인지 함께 적는다', /2일 전/.test(판정(성한것, 그날).말));

  /* 🔴 [2026-10-12] 오늘 겪은 자리 — ✅ 만 보고 「언제」를 안 따졌다 */
  const 묵은날 = new Date(2026, 9, 12);       /* 2026-10-12 — 읽힌 지 열하루 */
  본다('🔴 닷새를 넘겨 묵으면 빨간불이다', 판정(성한것, 묵은날).빛 === '🔴');
  본다('   며칠째인지 적는다', /11일째 안 읽혔다/.test(판정(성한것, 묵은날).말));
  본다('   그 사이 낸 지면을 구글이 모른다고 적는다',
    /구글이 모른다/.test(판정(성한것, 묵은날).말));
  본다('⛔ 선 위(닷새)는 아직 ✅ 다',
    판정(성한것, new Date(2026, 9, 6)).빛 === '✅');
  본다('⛔ 선 바로 너머(엿새)부터 🔴 다',
    판정(성한것, new Date(2026, 9, 7)).빛 === '🔴');

  본다('며칠 묵었나 — 같은 날은 0', 며칠묵었나('2026-10-12', new Date(2026, 9, 12)) === 0);
  본다('⛔ 날짜 꼴이 아니면 null — 0 이 아니다',
    며칠묵었나('어제') === null && 며칠묵었나(null) === null);
  본다('⬜ 날짜를 못 읽으면 ⬜ 로 둔다 — 🔴 도 ✅ 도 아니다',
    판정({ ...성한것, 마지막읽음: '언젠가' }, 묵은날).빛 === '⬜');

  const 안읽힌것 = 한줄읽기({ path: 'x', lastSubmitted: '2026-09-01T00:00:00Z', contents: [] });
  본다('🔴 한 번도 안 읽힌 것을 잡는다', 판정(안읽힌것).빛 === '🔴');
  본다('⛔ 그것을 「0 장」이 아니라 «안 읽었다»로 적는다', /안 읽었다/.test(판정(안읽힌것).말));

  const 오류난것 = 한줄읽기({ path: 'x', lastDownloaded: '2026-10-01T00:00:00Z', errors: 3, contents: [{ submitted: '10', indexed: '0' }] });
  본다('🔴 오류가 있으면 잡는다', 판정(오류난것).빛 === '🔴');

  const 빈것 = 한줄읽기({ path: 'x', lastDownloaded: '2026-10-01T00:00:00Z', errors: 0, contents: [{ submitted: '0', indexed: '0' }] });
  본다('⚠ 낸 장수가 0 이면 알린다', 판정(빈것).빛 === '⚠');
  본다('⛔ 빈 것·null 에도 안 터진다', 한줄읽기(null).낸장수 === 0 && 한줄읽기(undefined).주소 === '');

  console.log(탈 ? `\n🔴 ${탈}개 떨어졌다` : '\n✅ 자가시험 통과');
  process.exit(탈 ? 1 : 0);
}

if (내가진입점) {
  const 토큰 = await 토큰만들기();
  let 흠 = 0;
  for (const s of 사이트) {
    console.log(`\n■ ${s.이름}  (${s.속성})`);
    let j;
    try {
      const r = await fetch(
        `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(s.속성)}/sitemaps`,
        { headers: { Authorization: 'Bearer ' + 토큰 } });
      j = await r.json();
      if (!r.ok) { console.log(`   🔴 못 물었다 — ${r.status} ${String(j.error?.message || '').slice(0, 80)}`); 흠 += 1; continue; }
    } catch (e) { console.log('   🔴 못 물었다 — ' + String(e.message).slice(0, 70)); 흠 += 1; continue; }

    const 들 = j.sitemap || [];
    if (!들.length) {
      console.log('   🔴🔴 **사이트맵을 «하나도» 안 냈다** — 구글이 올 길이 없다');
      흠 += 1;
      continue;
    }
    for (const x of 들) {
      const 줄 = 한줄읽기(x);
      const p = 판정(줄);
      if (p.빛 !== '✅') 흠 += 1;
      console.log(`   ${p.빛} ${줄.주소.replace(/^https?:\/\//, '').padEnd(46)}`
        + `낸 장수 ${String(줄.낸장수).padStart(5)} · ${p.말}`);
      /* ⛔ [2026-10-12 17:5x] 빨간불만 내고 끝내면 사람이 «기억해서» 눌러야 한다.
         강령 ④ — 사람이 기억해서 지키는 구조를 만들지 않는다. 누를 줄을 그대로 찍는다.
         ⭐ 오늘 이 재제출이 실제로 먹었다 — 10-05 에 멈춰 있던 것이 그 자리에서 10-12 가 됐다. */
      if (p.빛 === '🔴' && 줄.마지막읽음) {
        console.log(`      ⇒ 그 자리에서 누른다 —  node scripts/resubmit-sitemap.mjs ${s.속성} ${줄.주소} --누른다`);
      }
    }
  }
  console.log(흠 ? `\n🔴 손댈 자리 ${흠}개` : '\n✅ 네 곳 다 사이트맵이 읽히고 있다');
  console.log('⚠ 구글은 «색인된 장수»를 이 API 로 안 알려 준다 — 늘 0 을 돌려준다.');
  console.log('   색인 장수는 서치콘솔 「페이지」 화면이나 check-색인-왜안되나.mjs 로 따로 잰다.');
}
