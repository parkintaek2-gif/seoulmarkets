#!/usr/bin/env node
/**
 * measure-geo-all.mjs — **GEO 시행 상태를 네 사이트에서 한 번에 잰다.**
 * ────────────────────────────────────────────────────────────────────────────
 * [왜 있나 — 2026-09-02 사장님]
 *   > 「AI에이전트용 콘텐트 전략(GEO) 바로 공유 후 시행」
 *   > 「**모든 유닛 GEO 시행하게 지시해라**」
 *
 *   ⛔ 말로 된 지시는 잊힌다. 우리 강령 ④ — 「규칙은 문장이 아니라 **검사**로 둔다」.
 *      그래서 지시문(`docs/지시-GEO-전유닛.md`)과 **같이** 이 자를 둔다.
 *
 * [왜 이름이 check- 가 아니라 measure- 인가]
 *   ⚠ 이 자는 **네트워크를 탄다.** `npm test` 에 물리면 인터넷이 흔들리는 날
 *     전원의 배포가 막힌다. 그래서 **막는 자(check)가 아니라 재는 자(measure)** 로 둔다.
 *     막지 않는 대신 **못 잰 것은 「못 쟀다」로 낸다** — 
 *
 * [쓰는 법]
 *   node scripts/measure-geo-all.mjs            네 사이트를 잰다
 *   node scripts/measure-geo-all.mjs --자가시험   스스로 시험한다
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 집들 = [
  { 이름: 'SeoulMarkets', 주소: 'https://seoulmarkets.com', 유닛: '6번' },
  { 이름: 'K Culture Wire', 주소: 'https://www.kculturewire.com', 유닛: '5번' },
  { 이름: '백년지도', 주소: 'https://100yearmap.com', 유닛: '3번' },
  { 이름: 'KLifeMap', 주소: 'https://klifemap.ai', 유닛: '1번·4번' },
];

/** 봇을 «이름별»로 세는 자가 그 저장소에 있는가 — 있으면 몇 갈래인가 */
export function 봇갈래수(글) {
  const s = String(글 ?? '');
  /* AI 크롤러를 몇 갈래로 가르는가. 한 칸에 뭉쳐 있으면 1 이다 */
  const 갈래 = new Set();
  for (const m of s.matchAll(/'(ai:[^']+)'/g)) 갈래.add(m[1]);
  for (const m of s.matchAll(/\['(AI크롤러|AI봇)'/g)) 갈래.add(m[1]);
  /* [2026-11-02] klifemap 이 ['AI-오픈AI사용자', …] 꼴로 갈래를 나눴는데 이 자가
     그 이름표를 몰라 «0갈래»라고 적었다. 실제로는 열 갈래였다.
     ⛔ 재는 쪽을 안 고치면 고친 것이 고쳐지지 않은 것으로 보인다. */
  for (const m of s.matchAll(/\['(AI-[^']+)'/g)) 갈래.add(m[1]);
  return 갈래.size;
}

async function 재본다(주소, 길) {
  try {
    const r = await fetch(주소 + 길, { redirect: 'follow', signal: AbortSignal.timeout(15000) });
    if (!r.ok) return { 코드: r.status, 줄: 0 };
    const t = await r.text();
    return { 코드: r.status, 줄: t.split('\n').filter((l) => l.trim()).length };
  } catch (e) {
    return { 못쟀다: String(e.message).slice(0, 40) };
  }
}

function 자가시험() {
  let 흠 = 0;
  const 본다 = (이름, 참) => { if (참) console.log(`  ✅ ${이름}`); else { console.log(`  🔴 ${이름}`); 흠 += 1; } };
  본다('AI 를 여러 갈래로 가른 것을 센다',
    봇갈래수("if(x) return 'ai:openai학습'; if(y) return 'ai:perplexity';") === 2);
  본다('한 칸에 뭉친 것은 1 로 센다',
    봇갈래수("['AI크롤러', /gptbot|claudebot/i],") === 1);
  본다('아무것도 없으면 0', 봇갈래수('const a = 1;') === 0);
  본다('AI- 로 시작하는 이름표도 갈래로 센다',
    봇갈래수("['AI-오픈AI사용자', /chatgpt-user/i], ['AI-퍼플렉시티', /perplexity/i],") === 2);
  본다('같은 갈래를 두 번 세지 않는다',
    봇갈래수("'ai:perplexity' … 'ai:perplexity'") === 1);
  console.log(흠 ? `\n🔴 자가시험 ${흠}개 흠` : '\n✅ 자가시험 4가지 다 지났다');
  return 흠;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  if (process.argv.includes('--자가시험')) process.exit(자가시험() ? 1 : 0);

  console.log('# GEO 시행 상태 — ' + new Date().toLocaleString('ko-KR'));
  console.log('  지시문: docs/지시-GEO-전유닛.md\n');

  console.log('## ① AI 가 안내받을 길이 있나 (llms.txt)\n');
  let 없는집 = 0;
  for (const 집 of 집들) {
    const l = await 재본다(집.주소, '/llms.txt');
    const r = await 재본다(집.주소, '/robots.txt');
    const 빛 = l.못쟀다 ? '⬜' : (l.코드 === 200 ? '✅' : '🔴');
    if (l.코드 && l.코드 !== 200) 없는집 += 1;
    const 말 = l.못쟀다 ? `못 쟀다 — ${l.못쟀다}` : `${l.코드}${l.코드 === 200 ? ` · ${l.줄}줄` : ' ← 아예 없다'}`;
    console.log(`  ${빛} ${집.이름.padEnd(16)} ${집.유닛.padEnd(8)} llms.txt ${말}`
      + `   robots ${r.못쟀다 ? '못쟀다' : r.코드}`);
  }

  console.log('\n## ② 봇을 «이름별»로 세나\n');
  const 저장소들 = [
    { 이름: 'dataeconomics (5·3·6번)', 길: path.join('src', 'lib', 'traffic.mjs') },
    { 이름: 'klifemap (1·4번)', 길: path.join('..', 'klifemap', 'server.js') },
  ];
  for (const s of 저장소들) {
    if (!fs.existsSync(s.길)) { console.log(`  ⬜ ${s.이름} — 파일을 못 찾아 **못 쟀다** (${s.길})`); continue; }
    const n = 봇갈래수(fs.readFileSync(s.길, 'utf8'));
    const 빛 = n >= 5 ? '✅' : (n >= 2 ? '🟡' : '🔴');
    console.log(`  ${빛} ${s.이름.padEnd(26)} AI 를 ${n}갈래로 가른다`
      + (n <= 1 ? '  ← 한 칸에 뭉쳐 있다. 누가 읽는지 모른다' : ''));
  }

  console.log('\n## ⛔ 하지 않을 것');
  console.log('  봇 차단·화이트리스트. 방문자가 하루 한 자리 수인 단계에서');
  console.log('  AI 봇을 막는 것은 늘고 있는 유일한 유입 통로를 스스로 닫는 일이다.');

  if (없는집) {
    console.log(`\n⛔ llms.txt 가 없는 집이 ${없는집}곳이다 — 그 집은 AI 가 «안내를 못 받는다».`);
    process.exit(1);
  }
  console.log('\n✅ 네 집 다 llms.txt 가 있다.');
}
