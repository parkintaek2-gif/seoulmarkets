#!/usr/bin/env node
/**
 * find-kcw-demand-gaps.mjs — **손님이 «치는데 우리가 못 받는» 말을 찾는다.**
 *
 * ── 왜 만드나 (2026-08-30 13:3x · 5번) ──────────────────────
 * 사장님 지시 — 「**특히 케이컬쳐는 스타의 이름, 작품명, 노래제목** 등이겠지」·
 * 「**방문자, 체류시간 증대에 올인해라**」.
 *
 * 그런데 지면을 «자료에 있는 축»으로 골라 오다 보니, 자료는 있는데 **아무도 안 치는 말**로
 * 지면을 낸 적이 있다. ⛔ 그것은 편수만 늘리고 사람은 안 데려온다.
 *
 * ⭐ 그래서 거꾸로 간다 — **구글이 「사람이 이렇게 쳤다」고 알려 준 말**에서 시작한다.
 *   그중 우리가 **위에 못 올라간 것**(순위가 낮은 것)이 다음에 낼 지면이다.
 *
 * ── ⛔ 이 자가 지키는 것 ─────────────────────────────────────
 * ⛔ **노출 0 은 「수요 없음」이 아니다** — 우리가 «안 보인 것»일 수도 있다. 갈라 적는다.
 * ⛔ **자기 주소를 친 말(navigational)은 뺀다** — 「kculturewire」 같은 것은 이길 자리가 아니라
 *   이미 우리를 아는 사람이다. 2026-08-29 에 노출의 51%가 이것이었다.
 * ⛔ **넷플릭스 원본 파일을 찾는 말도 뺀다** — `all-weeks-countries.tsv` 류.
 *   그 사람은 우리 글이 아니라 «그 파일»을 찾는다. 데려와도 안 머문다.
 * ⛔ 못 잰 것은 **못 쟀다**고 적는다. 
 *
 * ── ⚠ 90일로 재면 «어제 낸 지면»을 못 본다 (2026-08-30 13:5x 에 걸릴 뻔했다) ──
 * 「BTS 고향 검색어에서 우리가 8등」이라고 읽고 지면을 고치려 했는데,
 * 그 90일 노출의 대부분은 **그 지면이 생기기 «전»**의 것이었다. 옛 지면(`/hometowns`)이
 * 받던 노출을 새 지면(`/bts-hometowns`, 8/29 신설)의 성적으로 읽을 뻔했다.
 * ⛔ **어느 «지면»이 그 말을 받고 있는지**를 같이 보지 않으면 엉뚱한 것을 고친다.
 * ⭐ 그래서 `--짝` 을 뒀다 — 검색어와 지면을 «함께» 본다.
 *
 * 쓰는 법
 *   node scripts/find-kcw-demand-gaps.mjs                28일치를 재서 보여 준다
 *   node scripts/find-kcw-demand-gaps.mjs --days 90
 *   node scripts/find-kcw-demand-gaps.mjs --짝 bts --days 7    검색어 ↔ 지면을 짝지어 본다
 *   node scripts/find-kcw-demand-gaps.mjs --자가시험
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createSign } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

(function 환경파일읽기() {
  try {
    for (const 줄 of readFileSync(path.join(뿌리, '.env'), 'utf8').split(/\r?\n/)) {
      const m = 줄.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  } catch { /* 없으면 정상 */ }
})();

export const 사이트 = 'sc-domain:kculturewire.com';

/* ── 갈라내는 규칙. 자가시험이 이것을 잰다 ────────────────────── */

/**
 * 이 말이 **우리를 이미 아는 사람**이 친 것인가(navigational).
 * ⛔ 이런 말은 순위를 올릴 «자리»가 아니다. 이미 1등이거나, 남의 이름이다.
 */
export function 우리이름인가(말) {
  return /kculturewire|k culture wire|위키팁|wikitip/i.test(String(말 ?? ''));
}

/**
 * 이 말이 **넷플릭스 원본 파일**을 찾는 것인가.
 * 🔴 2026-08-30 실측 — 노출 상위에 `all-weeks-countries.tsv` 류가 잔뜩 있었다.
 *   그 사람은 우리 «글»이 아니라 그 «파일»을 찾는다. 데려와도 안 머문다.
 *   ⛔ 이것을 수요로 세면 「우리가 잘하고 있다」는 착시가 생긴다.
 */
export function 원본파일찾기인가(말) {
  const s = String(말 ?? '');
  return /\.tsv|tudum\/top10\/data|netflix\.com\/tudum/i.test(s);
}

/** 셋 중 무엇인가 — 이길 자리 · 우리 이름 · 원본 파일 */
export function 갈래(말) {
  if (우리이름인가(말)) return '우리이름';
  if (원본파일찾기인가(말)) return '원본파일';
  return '이길자리';
}

/**
 * **다음에 낼 만한가**를 정한다.
 * ⭐ 「노출은 있는데 위에 못 올라간 것」이 우리가 손댈 자리다.
 * ⛔ 순위를 모르면 «모른다»로 둔다 — 좋은 쪽으로도 나쁜 쪽으로도 안 민다.
 */
export function 손댈자리인가({ impressions, position, clicks }) {
  if (!Number.isFinite(impressions) || impressions <= 0) return false;
  if (!Number.isFinite(position)) return null;      /* ⛔ 못 쟀다 */
  if (position <= 3) return false;                  /* 이미 위에 있다 — 손댈 것이 없다 */
  return true;
}

/* ── 자가시험 ───────────────────────────────────────────────── */
export function 자가시험() {
  const 실패 = [];
  const 검 = (이름, 참) => { if (!참) 실패.push(이름); };

  검('우리 이름을 알아본다', 우리이름인가('kculturewire netflix') === true);
  검('대소문자를 안 가린다', 우리이름인가('K Culture Wire') === true);
  검('작품 이름은 우리 이름이 아니다', 우리이름인가('project wolf hunting netflix') === false);

  검('🔴 넷플릭스 원본 파일 찾기를 알아본다',
    원본파일찾기인가('"all-weeks-countries.tsv" netflix') === true);
  검('주소째 친 것도 알아본다',
    원본파일찾기인가('https://www.netflix.com/tudum/top10?week=2024-11-03') === true);
  검('⛔ 그냥 넷플릭스가 든 말은 원본 파일 찾기가 아니다',
    원본파일찾기인가('12.12 the day netflix') === false);

  검('셋으로 가른다',
    갈래('kculturewire') === '우리이름'
    && 갈래('all-weeks-global.tsv') === '원본파일'
    && 갈래('a model family hit or flop') === '이길자리');

  검('⭐ 노출 있고 순위가 낮으면 손댈 자리다',
    손댈자리인가({ impressions: 9, position: 8, clicks: 1 }) === true);
  검('⛔ 이미 3등 안이면 손댈 것이 없다',
    손댈자리인가({ impressions: 40, position: 2, clicks: 3 }) === false);
  검('⛔ 노출이 없으면 «수요를 못 본 것»이지 손댈 자리가 아니다',
    손댈자리인가({ impressions: 0, position: 5, clicks: 0 }) === false);
  검('⛔ 순위를 모르면 «모른다» — 0 도 참도 아니다',
    손댈자리인가({ impressions: 9, position: null, clicks: 0 }) === null);

  return 실패;
}

const 내가실행됐다 = process.argv[1]
  && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (내가실행됐다 && process.argv.includes('--자가시험')) {
  const 실패 = 자가시험();
  if (실패.length) {
    console.error(`❌ 자가시험 실패 ${실패.length}\n${실패.map((s) => `   · ${s}`).join('\n')}`);
    process.exit(1);
  }
  console.log('✅ 수요 틈 찾는 자 — 자가시험 11 통과');
  process.exit(0);
}

if (내가실행됐다) {
  const 날수 = Number(process.argv[process.argv.indexOf('--days') + 1]) || 28;
  const 키파일 = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!키파일 || !existsSync(키파일)) {
    console.log('⚠ 서비스 계정 키파일이 없다 — **못 쟀다.**');
    process.exit(1);
  }
  const 키 = JSON.parse(readFileSync(키파일, 'utf8'));
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const 이제 = Math.floor(Date.now() / 1000);
  const 머리 = b64({ alg: 'RS256', typ: 'JWT' });
  const 몸 = b64({
    iss: 키.client_email,
    scope: 'https://www.googleapis.com/auth/webmasters.readonly',
    aud: 'https://oauth2.googleapis.com/token', iat: 이제, exp: 이제 + 3600,
  });
  const 서명 = createSign('RSA-SHA256').update(`${머리}.${몸}`).sign(키.private_key, 'base64url');
  const 토큰답 = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${머리}.${몸}.${서명}`,
    }),
  }).then((r) => r.json());
  if (!토큰답.access_token) {
    console.log('🔴 토큰을 못 받았다 — **못 쟀다.**', JSON.stringify(토큰답).slice(0, 200));
    process.exit(1);
  }

  /* ⚠ 구글이 마지막 이틀은 덜 채운다. 그래서 사흘을 뒤로 민다.
     🔴 [2026-08-30] **이 사흘이 눈먼 자리다.** 8/29 에 낸 지면을 8/30 에 재려 했더니
       자료가 8/27 까지라 «있을 수가 없었다». 하마터면 「새 지면이 안 먹힌다」로 읽을 뻔했다.
     ⛔ 그러니 «잰 마지막 날»을 늘 화면에 적는다. 안 적으면 오늘까지 잰 것으로 읽힌다. */
  const 끝 = new Date(Date.now() - 3 * 86400_000);
  const 시작 = new Date(끝.getTime() - 날수 * 86400_000);
  const 날 = (d) => d.toISOString().slice(0, 10);

  const 청하기 = (몸) => fetch(
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(사이트)}/searchAnalytics/query`,
    {
      method: 'POST',
      headers: { authorization: `Bearer ${토큰답.access_token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ startDate: 날(시작), endDate: 날(끝), type: 'web', ...몸 }),
    },
  ).then((r) => r.json());

  /* ── --짝 : 검색어와 «지면»을 함께 본다 ────────────────────────
     🔴 이것이 없어서 옛 지면의 성적을 새 지면 것으로 읽을 뻔했다. */
  const 짝낱말 = process.argv.includes('--짝') ? process.argv[process.argv.indexOf('--짝') + 1] : null;
  if (짝낱말) {
    const 답2 = await 청하기({ dimensions: ['query', 'page'], rowLimit: 1000 });
    const 행2 = (답2.rows ?? [])
      .map((r) => ({ 말: r.keys[0], 지면: r.keys[1], ...r }))
      .filter((r) => r.말.toLowerCase().includes(짝낱말.toLowerCase()));
    console.log(`\n「${짝낱말}」이 든 검색어 ↔ 그것을 받은 지면 · ${날(시작)} ~ ${날(끝)} (${날수}일)\n`);
    if (!행2.length) {
      console.log('  ⚠ 한 건도 안 잡혔다 — **못 쟀다.** (그 말로 노출이 없었거나, 아직 안 모였다)');
      process.exit(0);
    }
    for (const r of 행2.sort((a, b) => b.impressions - a.impressions)) {
      console.log(`  노출 ${String(r.impressions).padStart(3)} · 순위 ${r.position.toFixed(1).padStart(5)} · 클릭 ${r.clicks}`);
      console.log(`      말   ${r.말}`);
      console.log(`      지면 ${r.지면.replace('https://www.kculturewire.com', '')}`);
    }
    const 지면별 = new Map();
    for (const r of 행2) 지면별.set(r.지면, (지면별.get(r.지면) ?? 0) + r.impressions);
    console.log('\n  지면별 노출 합 —');
    for (const [p, n] of [...지면별].sort((a, b) => b[1] - a[1])) {
      console.log(`    ${String(n).padStart(4)}  ${p.replace('https://www.kculturewire.com', '')}`);
    }
    process.exit(0);
  }

  const 답 = await 청하기({ dimensions: ['query'], rowLimit: 1000 });

  const 행 = (답.rows ?? []).map((r) => ({
    말: r.keys[0],
    impressions: r.impressions, clicks: r.clicks, position: r.position,
  }));
  if (!행.length) {
    console.log(`⚠ ${날(시작)} ~ ${날(끝)} 사이에 «검색어가 하나도 안 잡혔다» — 못 쟀다.`);
    console.log('   구글이 준 말:', JSON.stringify(답).slice(0, 300));
    process.exit(1);
  }

  const 통 = { 이길자리: [], 우리이름: [], 원본파일: [] };
  for (const r of 행) 통[갈래(r.말)].push(r);
  const 합 = (a) => a.reduce((n, r) => n + r.impressions, 0);
  const 전체노출 = 합(행);

  console.log(`\nK Culture Wire — 손님이 친 말 ${행.length}개 · ${날(시작)} ~ ${날(끝)} (${날수}일)`);
  console.log(`⚠ **${날(끝)} 까지다.** 그 뒤 사흘은 구글이 아직 안 준다 —`);
  console.log('   그 사이에 낸 지면은 여기 «있을 수가 없다». 없다고 「안 먹혔다」로 읽지 않는다.\n');
  console.log(`  노출 합계        ${전체노출}`);
  console.log(`  ├ 이길 자리      ${합(통.이길자리)}  (${통.이길자리.length}개)`);
  console.log(`  ├ 우리 이름      ${합(통.우리이름)}  (${통.우리이름.length}개) ⛔ 이미 우리를 아는 사람`);
  console.log(`  └ 넷플릭스 원본  ${합(통.원본파일)}  (${통.원본파일.length}개) ⛔ 우리 글을 찾는 게 아니다`);

  /*
   * 🔴 [2026-08-31] **어느 지면이 그 말을 받았는지를 적지 않고 있었다.**
   *   `--짝` 모드는 그것을 «이미 받아 오면서» 화면에만 뿌리고 버렸다.
   *   그래서 「손님이 이름으로 찾는데 우리 제목엔 이름이 없다」를 세려는 자가
   *   자료만 보고는 아무것도 못 했다 — 지면을 몰라 제목을 찾을 수가 없다.
   * ⭐ 사장님 지시(「스타 이름이 이렇게 제목에 나와야해」)를 검사로 굳히려면 이 칸이 있어야 한다.
   * ⚠ 한 말이 여러 지면에 걸릴 수 있다 — **노출이 가장 큰 하나**를 적고 몇 장이었는지도 적는다.
   *   ⛔ 「대표 지면」을 유일한 답인 척하지 않는다.
   */
  let 말별지면 = new Map();
  try {
    const 답2 = await 청하기({ dimensions: ['query', 'page'], rowLimit: 5000 });
    for (const r of 답2.rows ?? []) {
      const [말, 지면] = r.keys;
      const 있 = 말별지면.get(말);
      if (!있 || r.impressions > 있.노출) 말별지면.set(말, { 지면, 노출: r.impressions, 장수: (있?.장수 ?? 0) + 1 });
      else 말별지면.set(말, { ...있, 장수: 있.장수 + 1 });
    }
  } catch (e) {
    /* ⛔ 못 물었으면 «못 쟀다»로 둔다. 빈 값을 「지면이 없다」로 읽지 않게 표시한다 */
    말별지면 = null;
    console.log(`\n⚠ 지면 짝을 **못 물었다** — ${String(e.message).slice(0, 60)}`);
  }

  const 손댈것 = 통.이길자리.filter((r) => 손댈자리인가(r) === true)
    .sort((a, b) => b.impressions - a.impressions)
    .map((r) => (말별지면 === null
      ? { ...r, 지면: null, 지면못쟀다: true }
      : { ...r, 지면: 말별지면.get(r.말)?.지면 ?? null, 지면장수: 말별지면.get(r.말)?.장수 ?? 0 }));
  const 못잰것 = 통.이길자리.filter((r) => 손댈자리인가(r) === null);

  console.log(`\n🔴 **다음에 낼 지면 후보 ${손댈것.length}개** — 사람은 치는데 우리가 위에 못 올라간 말\n`);
  for (const r of 손댈것.slice(0, 40)) {
    console.log(`   노출 ${String(r.impressions).padStart(4)} · 순위 ${r.position.toFixed(1).padStart(5)} · 클릭 ${r.clicks}   ${r.말}`);
  }
  if (손댈것.length > 40) console.log(`   … 그리고 ${손댈것.length - 40}개 더`);
  if (못잰것.length) console.log(`\n⚠ 순위를 «못 잰» 말 ${못잰것.length}개 — 없는 것으로 안 친다`);

  const 낼길 = path.join(뿌리, 'src/data/kcw-demand-gaps.json');
  writeFileSync(낼길, `${JSON.stringify({
    잰날: new Date().toISOString(), 사이트, 시작: 날(시작), 끝: 날(끝),
    전체노출, 갈래별: { 이길자리: 합(통.이길자리), 우리이름: 합(통.우리이름), 원본파일: 합(통.원본파일) },
    손댈것, 못잰것수: 못잰것.length,
  }, null, 1)}\n`);
  console.log(`\n  적었다 → ${path.relative(뿌리, 낼길)}`);
}
