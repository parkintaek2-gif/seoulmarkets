#!/usr/bin/env node
/**
 * 잰다-AI가-어느지면을-가리키나.mjs — **AI 가 손님을 «어느 지면»으로 보내나.**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔴 왜 (2026-11-12 · 5번)
 *   `잰다-AI유입.mjs` 는 「AI 로 383명이 왔다」까지만 말한다. 그것으로는 할 일이 안 나온다.
 *   **어느 지면이 인용되는지 알아야 «같은 꼴»을 더 낼 수 있다.**
 *   유입 자(check-유입-매일)가 검색어에 대해 하는 일을 AI 쪽에도 한다.
 *
 * ⭐ 28일 실측 — 영문 두 곳은 AI 가 구글을 압도한다.
 *   K Culture Wire  ChatGPT 150명 · 구글 자연검색 0명
 *   SeoulMarkets    ChatGPT  64명 · 구글 자연검색 2명
 *   사장님이 핵심지침에 「색인·SEO·**GEO**」를 나란히 적으신 자리다.
 *
 * ⚠ 이 수는 «세션»이다. 같은 사람이 두 번 오면 둘로 센다.
 * ⛔ 「쟀다」를 「늘었다」로 읽지 않는다 — 한 번 잰 것으로는 방향을 모른다.
 *
 * 쓰는 법
 *   node scripts/잰다-AI가-어느지면을-가리키나.mjs
 *   node scripts/잰다-AI가-어느지면을-가리키나.mjs --days 90 --몇 20
 *   node scripts/잰다-AI가-어느지면을-가리키나.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { 어느AI냐 } from './잰다-AI유입.mjs';
import { 토큰받기, 재기, 우리것인가, 사이트이름 } from './lib/ga4.mjs';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * GA4 줄(호스트·출처·지면)을 지면별로 모은다.
 * ⛔ AI 가 아닌 길은 아예 안 센다 — 섞으면 「AI 가 가리킨 지면」이 아니게 된다.
 */
export function 모은다(줄들) {
  const 지면 = new Map();
  for (const r of 줄들 ?? []) {
    const [호스트, 출처, 길] = r.값;
    if (!우리것인가(호스트)) continue;
    const ai = 어느AI냐(출처);
    if (!ai) continue;
    const 열쇠 = 사이트이름(호스트) + 길;
    const 것 = 지면.get(열쇠) ?? { 집: 사이트이름(호스트), 길, 수: 0, 갈래: {} };
    것.수 += r.수;
    것.갈래[ai] = (것.갈래[ai] ?? 0) + r.수;
    지면.set(열쇠, 것);
  }
  return [...지면.values()].sort((a, b) => b.수 - a.수);
}

async function 주다() {
  if (process.argv.includes('--자가시험')) return 자가시험();
  const 값 = (이름, 기본) => { const i = process.argv.indexOf(이름); return i >= 0 ? Number(process.argv[i + 1]) || 기본 : 기본; };
  const 일 = 값('--days', 30);
  const 몇 = 값('--몇', 25);

  const t = await 토큰받기();
  if (t.못잼) { console.log('⬜ 못 쟀다 — ' + t.못잼); process.exit(2); }
  const 줄들 = await 재기(t.토큰, t.속성, ['hostName', 'sessionSource', 'landingPage'],
    { 시작: `${일}daysAgo`, 끝: 'yesterday', 지표: 'sessions' });
  if (줄들 === null) { console.log('⬜ 못 쟀다 — GA4 가 줄을 안 줬다'); process.exit(2); }

  const 것 = 모은다(줄들);
  const 합 = 것.reduce((a, x) => a + x.수, 0);
  console.log(`■ AI 가 손님을 보낸 지면 — 요 ${일}일 · 세션 ${합}건 · 지면 ${것.length}장\n`);
  for (const x of 것.slice(0, 몇)) {
    console.log('   ' + String(x.수).padStart(4) + '  ' + x.집.padEnd(18) + x.길.slice(0, 60)
      + '   (' + Object.entries(x.갈래).map(([k, v]) => k + ' ' + v).join(' · ') + ')');
  }
  if (!것.length) {
    console.log('   ⬜ AI 로 온 세션이 없다 — 「없다」이지 「못 쟀다」가 아니다');
  } else {
    const 집별 = {};
    for (const x of 것) 집별[x.집] = (집별[x.집] ?? 0) + x.수;
    console.log('\n■ 집별 — ' + Object.entries(집별).sort((a, b) => b[1] - a[1])
      .map(([k, v]) => k + ' ' + v).join(' · '));
    const 윗동 = 것.slice(0, 5).reduce((a, x) => a + x.수, 0);
    console.log(`   위 다섯 장이 ${Math.round((윗동 / 합) * 100)}% 를 가져온다`);
  }
  console.log('\n⭐ 할 일 — 위 지면과 «같은 꼴»을 더 낸다. 이기는 자리를 넓히는 것이 가장 싸다.');
  console.log('⛔ 「쟀다」를 「늘었다」로 읽지 않는다 — 한 번 잰 것으로는 방향을 모른다.');
  process.exit(0);
}

function 자가시험() {
  let 통 = 0; const 진 = [];
  const 본다 = (이름, 참) => { if (참) 통 += 1; else 진.push(이름); };
  const 줄예 = [
    { 값: ['www.kculturewire.com', 'chatgpt.com', '/group/katseye'], 수: 12 },
    { 값: ['www.kculturewire.com', 'perplexity.ai', '/group/katseye'], 수: 3 },
    { 값: ['www.kculturewire.com', 'google', '/group/katseye'], 수: 99 },
    { 값: ['seoulmarkets.com', 'chatgpt.com', '/article/x'], 수: 5 },
    { 값: ['localhost', 'chatgpt.com', '/x'], 수: 888 },
  ];
  const r = 모은다(줄예);
  본다('🔴 AI 로 온 것만 센다 — 구글은 안 센다', r[0].수 === 15);
  본다('🔴 많이 온 지면이 앞에 온다', r[0].길 === '/group/katseye' && r[1].길 === '/article/x');
  본다('🔴 AI 갈래를 갈라 적는다', r[0].갈래.ChatGPT === 12 && r[0].갈래.Perplexity === 3);
  본다('⛔ localhost 는 손님이 아니다', !r.some((x) => x.집 === 'localhost'));
  본다('⛔ 빈 것에 안 터진다', 모은다(null).length === 0 && 모은다(undefined).length === 0);
  본다('🔴 집 이름을 함께 쥔다', r[0].집.includes('kculturewire'));
  const 나 = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8');
  본다('⛔ 쟀다를 늘었다로 읽지 않는다고 적었다', 나.includes('「쟀다」를 「늘었다」로 읽지 않는다'));
  본다('⛔ 없는 것과 못 쟀다를 가른다', 나.includes('「없다」이지 「못 쟀다」가 아니다'));
  console.log(진.length ? `🔴 ${진.length} 떨어졌다 —\n  ${진.join('\n  ')}` : `✅ 자가시험 ${통} 통과`);
  process.exit(진.length ? 1 : 0);
}

if (String(process.argv[1] ?? '').endsWith('잰다-AI가-어느지면을-가리키나.mjs')) await 주다();
