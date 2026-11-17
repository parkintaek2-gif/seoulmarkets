#!/usr/bin/env node
/**
 * 잰다-AI가-어느지면을-보내나.mjs — ChatGPT·Perplexity 가 **어느 지면으로** 손님을 보내나.
 *
 * ── 🔴 왜 ────────────────────────────────────────────────────
 * [2026-11-18] 영어 두 사이트는 장당 수익이 낮다 — KCW 1.85명, SeoulMarkets 1.68명.
 * 백년지도 지역 지면은 12.16명이다. 그런데 영어 사이트는 **ChatGPT 가 구글보다
 * 수십 배 많이 보낸다**(28일 · KCW 153명 대 1명). 검색이 아니라 AI 가 문이다.
 *
 * ⇒ 그 문이 **어느 지면으로** 열리는지 알아야 무엇을 더 쓸지 정한다.
 *   「글을 더 쓴다」가 아니라 「AI 가 인용하는 꼴의 글을 더 쓴다」로 가야 한다.
 *
 * ⛔ 「ChatGPT 유입이 많다」로 끝내지 않는다. 어느 지면인지까지 본다.
 *
 * 쓰는 법
 *   node scripts/잰다-AI가-어느지면을-보내나.mjs
 *   node scripts/잰다-AI가-어느지면을-보내나.mjs --selftest
 */
import { 토큰받기, 재기, 우리것인가, 사이트이름 } from './lib/ga4.mjs';

/** AI 답변엔진인가. ⛔ 「ai」가 든 주소를 다 세지 않는다 — 아는 이름만 본다 */
export function AI인가(유입원) {
  return /^(chatgpt\.com|chat\.openai\.com|perplexity\.ai|www\.perplexity\.ai|copilot\.microsoft\.com|gemini\.google\.com|claude\.ai)$/i
    .test(String(유입원 || '').trim());
}

function 자가시험() {
  const 봄 = [];
  const 본다 = (이름, 참) => 봄.push({ 이름, 참 });
  본다('① ChatGPT 를 센다', AI인가('chatgpt.com'));
  본다('② 옛 주소도 센다', AI인가('chat.openai.com'));
  본다('③ Perplexity 를 센다', AI인가('perplexity.ai') && AI인가('www.perplexity.ai'));
  본다('④ Claude 를 센다', AI인가('claude.ai'));
  /* 🔴 「ai」가 들었다고 다 AI 가 아니다 — 우리 사이트가 klifemap.ai 다 */
  본다('⑤ klifemap.ai 는 AI 엔진이 아니다', !AI인가('klifemap.ai'));
  본다('⑥ 구글은 아니다', !AI인가('google') && !AI인가('google.com'));
  본다('⑦ 직접 유입은 아니다', !AI인가('(direct)'));
  본다('⑧ 빈 값은 아니다', !AI인가('') && !AI인가(null));
  let 깨짐 = 0;
  for (const s of 봄) if (!s.참) { console.log('🔴 ' + s.이름); 깨짐 += 1; }
  console.log(깨짐 ? `🔴 ${깨짐}가지 깨졌다` : `✅ ${봄.length}가지 다 통과`);
  return 깨짐 === 0;
}

if (process.argv.includes('--selftest')) process.exit(자가시험() ? 0 : 1);

const t = await 토큰받기();
if (t.못잼) { console.log('🔴 못 쟀다 —', t.못잼); process.exit(0); }

const 줄들 = await 재기(t.토큰, t.속성, ['hostName', 'sessionSource', 'landingPage'],
  { 시작: '28daysAgo', 끝: 'yesterday', 지표: 'sessions' });

const 모음 = {};
for (const r of 줄들 || []) {
  const [h, 원, 들어온곳] = r.값;
  if (!우리것인가(h) || !AI인가(원)) continue;
  const s = 사이트이름(h);
  ((모음[s] ??= {})[들어온곳] = (모음[s][들어온곳] || 0) + r.수);
}

console.log('\n📏 AI 답변엔진이 어느 지면으로 손님을 보내나 — 28일\n');
for (const [사이트, 표] of Object.entries(모음).sort((a, b) =>
  Object.values(b[1]).reduce((x, y) => x + y, 0) - Object.values(a[1]).reduce((x, y) => x + y, 0))) {
  const 합 = Object.values(표).reduce((a, b) => a + b, 0);
  const 종류 = Object.keys(표).length;
  console.log('  ■ ' + 사이트 + ' — ' + 합 + '세션 · 지면 ' + 종류 + '종');
  for (const [p, n] of Object.entries(표).sort((a, b) => b[1] - a[1]).slice(0, 8)) {
    console.log('     ' + String(n).padStart(4) + '  ' + p);
  }
  console.log('');
}

if (!Object.keys(모음).length) console.log('  ⬜ AI 유입이 한 건도 없다 — 「없다」와 「못 쟀다」를 가른다\n');
else console.log('  ⬜ 한 지면에 몰리면 그 꼴을 더 쓴다. 고르게 퍼지면 사이트 전체가 인용되는 것이다.\n');
