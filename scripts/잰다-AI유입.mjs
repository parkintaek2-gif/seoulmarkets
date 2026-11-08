#!/usr/bin/env node
/**
 * 잰다-AI유입.mjs — **AI 를 거쳐 우리 집에 온 사람을 센다.**
 *
 * ── 🔴🔴 왜 (2026-11-08 · 사장님) ────────────────────────────────────
 * 「**AI 유입 수는 아직 못 셉니다**」라고 제가 보고에 적었더니 사장님이 바로
 * 「**세는 도구 만들기로 했는데 왜 안하나. 바로 해**」라고 이르셨다.
 *
 * 날마다-색인SEO지오 의 ③ GEO 자리는 llms.txt 가 «있나»만 보고 있었다.
 * 그것은 **문을 열어 뒀나**이지 **사람이 들어왔나**가 아니다.
 * GEO 를 한다면서 정작 그 성과를 한 번도 세지 않고 있었다.
 *
 * ── 무엇을 세나 ──────────────────────────────────────────────────────
 * GA4 의 세션 출처(sessionSource)에서 **AI 길로 들어온 것만** 골라 센다.
 *   ChatGPT · Perplexity · Claude · Copilot · Gemini · Grok · You · Poe · Phind
 *
 * ── ⛔ 이 자가 지키는 것 ──────────────────────────────────────────────
 *   ⛔ 못 받으면 **null 을 낸다.** 「0 명이 왔다」와 「못 쟀다」는 다른 말이다
 *   ⛔ 오늘치를 넣지 않는다 — 하루가 안 끝나 늘 낮게 나오고 「떨어졌다」로 오독된다
 *   ⛔ GA4 가 덜 세는 것을 보정하지 않는다. 광고차단·쿠키거부로 늘 «바닥값»이다
 *   ⛔ 모르는 출처를 AI 로 밀어 넣지 않는다 — 부풀린 수가 가장 나쁘다
 *
 * 쓰는 법
 *   node scripts/잰다-AI유입.mjs                  요 30일
 *   node scripts/잰다-AI유입.mjs --days 7
 *   node scripts/잰다-AI유입.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { 토큰받기, 재기, 우리것인가, 사이트이름 } from './lib/ga4.mjs';

const 뿌리 = fileURLToPath(new URL('..', import.meta.url));
const 대장길 = path.join(뿌리, 'docs', 'AI유입-대장.tsv');

/**
 * AI 길 목록 — 출처 글에 이 조각이 들어 있으면 그 AI 로 센다.
 * ⛔ 한 줄만 더하면 새 AI 가 붙는다. 판정하는 곳을 늘리지 않는다.
 * ⚠ 「bing」 을 넣지 않는다 — 빙은 검색엔진이지 AI 답변이 아니다. 섞으면 수가 부푼다.
 */
export const AI길 = [
  { 이름: 'ChatGPT', 조각: ['chatgpt.com', 'chat.openai.com', 'openai.com'] },
  { 이름: 'Perplexity', 조각: ['perplexity.ai'] },
  { 이름: 'Claude', 조각: ['claude.ai', 'anthropic.com'] },
  { 이름: 'Copilot', 조각: ['copilot.microsoft.com'] },
  { 이름: 'Gemini', 조각: ['gemini.google.com', 'bard.google.com'] },
  { 이름: 'Grok', 조각: ['grok.com', 'x.ai'] },
  { 이름: 'You.com', 조각: ['you.com'] },
  { 이름: 'Poe', 조각: ['poe.com'] },
  { 이름: 'Phind', 조각: ['phind.com'] },
];

/** 이 출처가 어느 AI 인가 — 아니면 null. ⛔ 헷갈리면 null 이다 */
export function 어느AI냐(출처) {
  const s = String(출처 ?? '').toLowerCase().trim();
  if (!s || s === '(direct)' || s === '(not set)') return null;
  for (const a of AI길) for (const 조각 of a.조각) if (s.includes(조각)) return a.이름;
  return null;
}

/** 줄들을 받아 집별·AI별로 센다. ⛔ 우리 집이 아닌 호스트는 버린다 */
export function 센다(줄들) {
  const 집별 = {};
  const AI별 = {};
  let AI합 = 0;
  let 전체합 = 0;
  for (const r of 줄들 ?? []) {
    const [호스트, 출처] = r.값;
    if (!우리것인가(호스트)) continue;
    const 집 = 사이트이름(호스트);
    전체합 += r.수;
    (집별[집] ??= { 전체: 0, AI: 0, 갈래: {} });
    집별[집].전체 += r.수;
    const ai = 어느AI냐(출처);
    if (!ai) continue;
    AI합 += r.수;
    집별[집].AI += r.수;
    집별[집].갈래[ai] = (집별[집].갈래[ai] ?? 0) + r.수;
    AI별[ai] = (AI별[ai] ?? 0) + r.수;
  }
  return { 집별, AI별, AI합, 전체합 };
}

/** 대장 한 줄 — 탭으로 가른다 */
export function 대장줄(값) {
  return [값.날, 값.일수, 값.AI합, 값.전체합, 값.갈래 ?? '', 값.메모 ?? '']
    .map((x) => String(x ?? '').replace(/[\t\r\n]/g, ' ')).join('\t');
}

/* ── 자가시험 ───────────────────────────────────────────────────────── */
export function 자가시험() {
  const 것 = [];
  const 본다 = (이름, 참) => 것.push({ 이름, 참: !!참 });

  본다('ChatGPT 를 가린다', 어느AI냐('chatgpt.com') === 'ChatGPT');
  본다('옛 주소 chat.openai.com 도 가린다', 어느AI냐('chat.openai.com') === 'ChatGPT');
  본다('Perplexity 를 가린다', 어느AI냐('www.perplexity.ai') === 'Perplexity');
  본다('Claude 를 가린다', 어느AI냐('claude.ai') === 'Claude');
  본다('Gemini 를 가린다', 어느AI냐('gemini.google.com') === 'Gemini');
  본다('🔴 ⛔ 구글 검색을 AI 로 세지 않는다', 어느AI냐('google') === null);
  본다('🔴 ⛔ 빙을 AI 로 세지 않는다 — 검색엔진이지 AI 답변이 아니다', 어느AI냐('bing') === null);
  본다('🔴 ⛔ 네이버를 AI 로 세지 않는다', 어느AI냐('naver') === null);
  본다('⛔ 직접 들어온 것은 AI 가 아니다', 어느AI냐('(direct)') === null);
  본다('⛔ 빈 것에 안 터진다', 어느AI냐(null) === null && 어느AI냐('') === null);

  const 줄예 = [
    { 값: ['klifemap.ai', 'chatgpt.com'], 수: 7 },
    { 값: ['klifemap.ai', 'google'], 수: 93 },
    { 값: ['www.kculturewire.com', 'perplexity.ai'], 수: 3 },
    { 값: ['localhost', 'chatgpt.com'], 수: 999 },
    { 값: ['klifemap-xyz.cloudtype.app', 'chatgpt.com'], 수: 888 },
  ];
  const r = 센다(줄예);
  본다('🔴 AI 로 온 것만 모은다', r.AI합 === 10);
  본다('🔴 ⛔ localhost 와 배포 확인용 주소는 손님이 아니다', r.전체합 === 103);
  본다('집별로 갈라 센다', r.집별['klifemap.ai'].AI === 7 && r.집별['kculturewire.com'].AI === 3);
  본다('AI 갈래별로도 센다', r.AI별.ChatGPT === 7 && r.AI별.Perplexity === 3);
  본다('⛔ 빈 것에 안 터진다', 센다(null).AI합 === 0 && 센다(undefined).전체합 === 0);
  본다('대장 줄이 탭으로 갈린다', 대장줄({ 날: '2026-11-08', 일수: 30, AI합: 10, 전체합: 103 }).split('\t').length === 6);

  const 빨강 = 것.filter((x) => !x.참);
  console.log(`■ 잰다-AI유입 자가시험 ${것.length - 빨강.length}/${것.length}`);
  for (const x of 것) console.log(`  ${x.참 ? '✅' : '🔴'} ${x.이름}`);
  return 빨강.length === 0;
}

/**
 * 남의 자가 불러 쓰는 입구.
 * @returns {Promise<{AI합:number, 전체합:number, 집별:Object, AI별:Object, 일수:number}|{못잼:string}>}
 */
export async function 잰다({ 일 = 30 } = {}) {
  const t = await 토큰받기();
  if (t.못잼) return t;                       /* ⛔ 0 이 아니라 «못잼» 이다 */
  const 줄들 = await 재기(t.토큰, t.속성, ['hostName', 'sessionSource'],
    { 시작: `${일}daysAgo`, 끝: 'yesterday', 지표: 'sessions' });
  if (줄들 === null) return { 못잼: 'GA4 가 줄을 안 줬다' };
  return { ...센다(줄들), 일수: 일 };
}

/* ── 본문 ───────────────────────────────────────────────────────────── */
const 내가진입점 = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (내가진입점) {
  if (process.argv.includes('--자가시험')) process.exit(자가시험() ? 0 : 1);

  const i = process.argv.indexOf('--days');
  const 일 = i >= 0 ? Number(process.argv[i + 1]) : 30;

  console.log('■ AI 유입 — AI 를 거쳐 우리 집에 온 사람 (요 ' + 일 + '일, 어제까지)');
  console.log('   사장님 2026-11-08 「세는 도구 만들기로 했는데 왜 안하나. 바로 해」\n');

  const r = await 잰다({ 일 });
  if (r.못잼) {
    console.log('⬜ 못 쟀다 — ' + r.못잼);
    console.log('   ⛔ 못 잰 것을 0 으로 적지 않는다. 「AI 로 온 사람이 없다」와 다른 말이다.');
    process.exit(2);
  }

  const 몫 = r.전체합 > 0 ? ((100 * r.AI합) / r.전체합).toFixed(2) : null;
  console.log('   AI 로 들어온 세션 ' + r.AI합.toLocaleString() + '건'
    + ' · 전체 ' + r.전체합.toLocaleString() + '건'
    + (몫 === null ? '' : ' · 몫 ' + 몫 + '%'));

  console.log('\n■ 어느 AI 에서 왔나');
  const AI줄 = Object.entries(r.AI별).sort((a, b) => b[1] - a[1]);
  if (!AI줄.length) console.log('   ⬜ 한 건도 없다 — 이것은 «쟀는데 0» 이다. 못 잰 것이 아니다.');
  for (const [이름, 수] of AI줄) console.log('   ' + 이름.padEnd(12) + String(수).padStart(6) + '건');

  console.log('\n■ 집별');
  for (const [집, g] of Object.entries(r.집별).sort((a, b) => b[1].AI - a[1].AI)) {
    const 갈래 = Object.entries(g.갈래).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ' ' + v).join(' · ');
    console.log('   ' + 집.padEnd(22) + 'AI ' + String(g.AI).padStart(5)
      + ' / 전체 ' + String(g.전체).padStart(7) + (갈래 ? '   ' + 갈래 : ''));
  }

  /* 대장 — 수가 남아야 «잰 것»이다 */
  const 날 = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
  const 갈래글 = AI줄.map(([k, v]) => k + ' ' + v).join(' · ');
  if (!fs.existsSync(대장길)) {
    fs.mkdirSync(path.dirname(대장길), { recursive: true });
    fs.writeFileSync(대장길, '# AI 유입 — AI 를 거쳐 들어온 세션 (사장님 2026-11-08 지시로 세기 시작)\n'
      + '# ⛔ 못 쟀을 때는 줄을 적지 않는다. 0 으로 채우면 「AI 로 온 사람이 없다」로 읽힌다\n'
      + '# 날\t잰일수\tAI\t전체\t갈래\t메모\n', 'utf8');
  }
  fs.appendFileSync(대장길, 대장줄({ 날, 일수: 일, AI합: r.AI합, 전체합: r.전체합, 갈래: 갈래글 }) + '\n', 'utf8');
  console.log('\n■ 대장 — docs/AI유입-대장.tsv 에 적었다');
  console.log('⛔ 「쟀다」를 「늘었다」로 읽지 않는다. 늘었는지는 줄이 쌓여야 보인다.');
  process.exit(0);
}
