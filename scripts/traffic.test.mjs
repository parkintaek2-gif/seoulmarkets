#!/usr/bin/env node
/**
 * 유입 측정 시험.
 *
 * ⚠ 이 코드는 **운영 서버 안에서 돈다.** 그래서 「제대로 세는가」보다
 *   **「절대 안 죽는가」**를 먼저 시험한다. 측정 하나 때문에 세 사이트가 멈추면 안 된다.
 */
import { 센다, 현황, 셀것인가, 유입도메인, 봇종류 } from '../src/lib/traffic.mjs';

let 실패 = 0;
const 확인 = (조건, 이름) => { if (!조건) { 실패++; console.log(`  ✕ ${이름}`); } };

console.log('유입 측정');

/* ── ① 절대 안 죽는다 — 이상한 입력을 다 넣어 본다 ───────────── */
for (const 나쁜 of [
  undefined, null, {}, { pathname: null }, { pathname: 123 },
  { pathname: '/a', referer: '깨진 URL' }, { pathname: '/a', referer: null },
  { pathname: '/a', host: null, userAgent: null },
  { pathname: '/'.repeat(5000) },
  { pathname: '/a', referer: 'javascript:alert(1)' },
]) {
  try { 센다(나쁜); } catch (e) { 실패++; console.log(`  ✕ 던졌다: ${JSON.stringify(나쁜)?.slice(0, 40)} — ${e.message}`); }
}
try { 현황(); } catch (e) { 실패++; console.log(`  ✕ 현황()이 던졌다: ${e.message}`); }

/* ── ② 셀 것과 안 셀 것 ─────────────────────────────────────── */
확인(셀것인가('/article/abc'), '기사는 센다');
확인(셀것인가('/rankings'), '지면은 센다');
확인(!셀것인가('/_astro/x.css'), '빌드 자원은 안 센다');
확인(!셀것인가('/favicon.ico'), '파비콘은 안 센다');
확인(!셀것인가('/og-default.png'), '이미지는 안 센다');
확인(!셀것인가('/admin'), '우리가 보는 화면은 안 센다');
확인(!셀것인가('/sitemap.xml'), '사이트맵은 안 센다');

/* ── ③ 유입 도메인 — **전체 URL 을 남기지 않는다** ───────────── */
확인(유입도메인(null) === '(직접)', '리퍼러 없음 → (직접)');
확인(유입도메인('깨진것') === '(알수없음)', '깨진 리퍼러 → (알수없음)');
확인(유입도메인('https://www.google.com/search?q=비밀검색어') === 'google.com',
  '⭐ 검색어가 붙어 와도 **도메인만** 남긴다');
확인(유입도메인('https://seoulmarkets.com/x', 'seoulmarkets.com') === '(내부)', '같은 사이트 → (내부)');
확인(유입도메인('https://100yearmap.com/x', 'seoulmarkets.com') === '우리:100yearmap.com',
  '우리 사이트끼리는 따로 표시한다');

/* ── ④ 실제로 센다 ──────────────────────────────────────────── */
const 전 = 현황().사람;
for (let i = 0; i < 5; i++) {
  센다({ host: 'seoulmarkets.com', pathname: '/article/test', referer: 'https://google.com/', userAgent: 'Mozilla/5.0' });
}
센다({ host: 'seoulmarkets.com', pathname: '/article/test', userAgent: 'Googlebot/2.1' });
const 후 = 현황();
확인(후.사람 - 전 === 5, `사람 5건이 세어졌다 (실제 ${후.사람 - 전})`);
확인(후.봇 >= 1, '봇이 따로 세어졌다');

/* ── ⑤ ⚠ 개인정보가 안 남는다 ───────────────────────────────── */
const 전부 = JSON.stringify(현황());
확인(!전부.includes('Mozilla'), '⭐ User-Agent 원문이 안 남는다');
확인(!전부.includes('비밀검색어'), '⭐ 검색어가 안 남는다');
확인(!/\b\d{1,3}(\.\d{1,3}){3}\b/.test(전부), '⭐ IP 모양의 값이 안 남는다');

/* ── ⑥ 경로 상한 — 스캐너가 임의 URL 을 때려도 무한히 안 는다 ─── */
const 전키 = 현황().서로다른키;
for (let i = 0; i < 4000; i++) 센다({ host: 'x', pathname: `/scan/${i}`, userAgent: 'Mozilla/5.0' });
const 후키 = 현황().서로다른키;
확인(후키 < 전키 + 4000, `⭐ 경로 상한이 걸린다 (${전키} → ${후키}, 4000건 넣음)`);

/* ⚠ 여기서 「전부 통과」를 찍지 않는다. **아래 ⑦⑧ 이 아직 안 돌았다.**
 *   중간에 성공 메시지를 찍으면 그게 곧 「검사가 헛도는」 모양이 된다. */

/* ── ⑦ ⭐ 스캐너는 **브라우저 UA 를 흉내 낸다.** 경로로 걸러야 한다
 *    2026-08-05 첫 측정에서 「사람 64」 중 상당수가 이것들이었다. */
{
  const 브라우저UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0 Safari/537.36';
  const 전 = 현황();
  const 스캐너경로들 = [
    '/wp-admin/install.php', '/phpinfo.php', '/.env/.env.bak', '/.aws/credentials',
    '/test.php', '/_profiler/phpinfo', '/index.php', '/.git/config', '/backup.sql',
    '/vendor/phpunit/phpunit/src/Util/PHP/eval-stdin.php', '/config.json.bak',
  ];
  for (const p of 스캐너경로들) 센다({ host: 'x.com', pathname: p, userAgent: 브라우저UA });
  const 후 = 현황();
  확인(후.사람 === 전.사람,
    `⭐ 스캐너 경로 ${스캐너경로들.length}건이 사람으로 안 세어진다 (사람 ${전.사람} → ${후.사람})`);
  확인(후.봇 - 전.봇 === 스캐너경로들.length, '전부 봇으로 세어진다');
}

/* ── ⑧ ⚠ 진짜 지면은 여전히 사람이어야 한다. 과잉 차단이 더 나쁘다 ── */
{
  const 브라우저UA = 'Mozilla/5.0 (Macintosh) Safari/605.1';
  const 전 = 현황().사람;
  for (const p of [
    '/article/korea-tenure-and-returns-industry-mix', '/rankings', '/', '/about',
    '/100y/school/7531408', '/university/0002744', '/major/%EC%A1%B0%EB%A6%AC%EA%B3%BC',
  ]) 센다({ host: 'x.com', pathname: p, userAgent: 브라우저UA });
  확인(현황().사람 - 전 === 7, `⭐ 진짜 지면 7건은 사람으로 센다 (실제 ${현황().사람 - 전})`);
}

if (실패) { console.error(`\n${실패} 실패`); process.exit(1); }
console.log('  스캐너 판별까지 전부 통과');

/* ══════════════════════════════════════════════════════════════════
 * ⭐ AI 크롤러 세분 — **뭉치면 누가 읽는지 모른다**
 *
 * 2026-08-05 실측: 봇 1,919건 중 **1,842건(96%)이 AI**, 구글은 9건이었다.
 * 우리는 영문으로 한국 시장 데이터를 낸다 — 이 독자층에게는 **구글 순위보다
 * AI 답변에 인용되는 쪽이 빠를 수 있다.** 그러면 어느 회사가 얼마나 가져가는지가
 * 전략 정보다. 한 칸에 'ai' 로 두면 그 판단을 못 한다.
 *
 * ⚠ **학습용과 검색용을 가른다.** GPTBot 은 학습, OAI-SearchBot 은 답변 인용이다.
 *   막을지 말지가 다르다.
 * ⚠ 아래 UA 는 각 사가 공개한 문자열 꼴이다.
 * ══════════════════════════════════════════════════════════════════ */
{
  const 표 = [
    ['Mozilla/5.0 (compatible; GPTBot/1.2; +https://openai.com/gptbot)', 'ai:openai학습'],
    ['Mozilla/5.0 (compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot)', 'ai:openai검색'],
    ['Mozilla/5.0 (compatible; ChatGPT-User/1.0; +https://openai.com/bot)', 'ai:openai사용자'],
    ['Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)', 'ai:anthropic학습'],
    ['Mozilla/5.0 (compatible; Claude-SearchBot/1.0)', 'ai:anthropic검색'],
    ['Mozilla/5.0 (compatible; Claude-User/1.0)', 'ai:anthropic사용자'],
    ['Mozilla/5.0 (compatible; PerplexityBot/1.0; +https://perplexity.ai/bot)', 'ai:perplexity'],
    ['CCBot/2.0 (https://commoncrawl.org/faq/)', 'ai:commoncrawl'],
    ['Mozilla/5.0 (compatible; Google-Extended)', 'ai:google학습'],
    /* ⭐ [2026-09-02] 전에는 'ai:기타' 였다 — 이제 «누구인지»까지 남는다 */
    ['Mozilla/5.0 (compatible; Bytespider; spider-feedback@bytedance.com)', 'ai:bytespider'],
    ['Mozilla/5.0 (compatible; meta-externalagent/1.1)', 'ai:meta-externalagent'],
    /* ⚠ 검색엔진이 AI 로 새면 안 된다 — 반대쪽도 시험한다 */
    ['Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)', 'google'],
    ['Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)', 'bing'],
    ['Mozilla/5.0 (compatible; Yeti/1.1; +http://naver.me/spd)', 'naver'],
  ];
  let 실패 = 0;
  console.log('AI 크롤러 세분');
  for (const [ua, 기대] of 표) {
    const v = 봇종류(ua);
    if (v !== 기대) { 실패++; console.log(`  ✕ ${기대} → ${v}  |  ${ua.slice(0, 46)}`); }
  }
  if (실패) { console.error(`\n${실패} 실패`); process.exit(1); }
  console.log(`  ${표.length} 통과 · 0 실패`);
}

/* ══════════════════════════════════════════════════════════════════
 * 🔴 모르는 봇도 **이름표까지** 남긴다 (2026-09-02 · GEO)
 *
 * 실측에서 봇 35,818건 중 「기타」가 28,296건(79%)이었다.
 * 뭉쳐 두면 새 AI 봇이 와도 목록에 더할 근거가 안 생긴다 — 「모른다」가 「없다」로 굳는다.
 * ⛔ UA 원문은 남기지 않는다. 봇이 스스로 대는 **제품 이름 한 토막**뿐이다.
 * ══════════════════════════════════════════════════════════════════ */
{
  const 표 = [
    /* 아직 목록에 없는 봇들 — 이름표가 붙어야 다음에 목록에 넣을 수 있다 */
    ['Mozilla/5.0 (compatible; SemrushBot/7~bl; +http://www.semrush.com/bot.html)', '기타:semrushbot'],
    ['Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)', '기타:ahrefsbot'],
    ['Mozilla/5.0 (compatible; MJ12bot/v1.4.8; http://mj12bot.com/)', '기타:mj12bot'],
    ['python-requests/2.31.0', '기타:python-requests'],
    ['curl/8.4.0', '기타:curl'],
    ['axios/1.6.2', '기타:axios'],
    /* ⚠ UA 가 아예 없는 것도 «없다»고 적는다 —  */
    ['', '기타:빈UA'],
    /* ⛔ 이미 이름을 아는 것들은 **그대로**여야 한다 — 이름표가 덮어쓰면 안 된다 */
    ['Mozilla/5.0 (compatible; GPTBot/1.2; +https://openai.com/gptbot)', 'ai:openai학습'],
    ['Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)', 'google'],
  ];
  let 실패 = 0;
  console.log('모르는 봇의 이름표');
  for (const [ua, 기대] of 표) {
    const v = 봇종류(ua);
    if (v !== 기대) { 실패++; console.log(`  ✕ ${기대} → ${v}  |  ${ua.slice(0, 46) || '(빈 UA)'}`); }
  }
  /* ⚠ 칸이 무한히 늘면 집계가 못 쓰게 된다 — 길이를 못박는다 */
  const 긴것 = 봇종류(`X${'a'.repeat(200)}/1.0`);
  if (긴것.length > 4 + 24) { 실패++; console.log(`  ✕ 이름표가 너무 길다 — ${긴것.length}자`); }
  if (실패) { console.error(`\n${실패} 실패`); process.exit(1); }
  console.log(`  ${표.length + 1} 통과 · 0 실패`);
}

/* ══════════════════════════════════════════════════════════════════
 * 🔴🔴 하루가 통째로 «덮여» 사라지지 않는다 (2026-09-17)
 *
 * 30일을 세어 보니 사흘이 비어 있었다 — 09-05 요청 3건 · 09-10 12건 · 09-15 2건.
 * 옆날들은 2~5만 건이다. 「손님이 없었다」가 아니라 «지워진» 것이었다.
 * 까닭: flush 가 R2 «읽기 실패»를 「파일이 없다」와 같이 받아 빈 누적 위에 지금 통만
 * 얹어 put 했다. ⇒ 한 번 못 읽은 그 순간 그날 쌓인 것이 통째로 덮인다.
 *
 * ⛔ 이 시험이 지키는 것 — **못 읽었으면 쓰지 않는다.**
 *   글자를 찾아보는 시험이 아니라 «불러서» 본다. 글자 시험은 고쳐도 안 잡힌다(오늘 겪었다).
 * ══════════════════════════════════════════════════════════════════ */
{
  const { 쌓인것읽기 } = await import('../src/lib/traffic.mjs');
  console.log('\n읽기 실패 때 하루를 덮어쓰지 않는다');
  let 실패 = 0;
  const 재본다 = async (이름, 읽기, 봐야할것) => {
    const r = await 쌓인것읽기(읽기, 'raw/traffic/20260917.json');
    const 맞나 = 봐야할것(r);
    if (!맞나) { 실패++; console.log(`  ✕ ${이름} — 나온 것 ${JSON.stringify(r).slice(0, 90)}`); }
  };

  /* 🔴 그날 실제로 일어난 일 — R2 가 한 번 안 열렸다 */
  await 재본다('읽기가 던지면 «쓰지 마라»를 낸다',
    async () => { throw new Error('S3 GET 503: slow down'); },
    (r) => r.ok === false && /못 읽었다/.test(r.왜));
  await 재본다('시간초과도 마찬가지다',
    async () => { throw new Error('The operation was aborted due to timeout'); },
    (r) => r.ok === false);

  /* 파일이 «없는» 것은 정상이다 — 그날 첫 판이다. 이때는 써야 한다 */
  await 재본다('파일이 없으면 빈 누적으로 «쓴다»',
    async () => null,
    (r) => r.ok === true && Object.keys(r.누적).length === 0);

  /* 쌓인 것이 있으면 그대로 돌려준다 — 이것이 안 되면 날마다 덮어쓴다 */
  await 재본다('쌓인 것을 그대로 돌려준다',
    async () => JSON.stringify({ 집계: { 'a\tb\tc\t0\t\t': 1234 } }),
    (r) => r.ok === true && r.누적['a\tb\tc\t0\t\t'] === 1234);
  await 재본다('Buffer 로 와도 읽는다',
    async () => Buffer.from(JSON.stringify({ 집계: { x: 7 } })),
    (r) => r.ok === true && r.누적.x === 7);

  /* 읽기는 됐는데 깨진 경우 — 덮으면 깨진 것마저 못 되살린다 */
  await 재본다('깨진 글이면 «쓰지 마라»를 낸다',
    async () => '{이건 JSON 이 아니다',
    (r) => r.ok === false && /깨졌다/.test(r.왜));
  /* 집계 칸이 없는 옛 꼴은 «빈 것»으로 읽되 실패는 아니다 */
  await 재본다('집계 칸이 없으면 빈 누적이다',
    async () => JSON.stringify({ 날짜: '20260917' }),
    (r) => r.ok === true && Object.keys(r.누적).length === 0);

  if (실패) { console.error(`\n${실패} 실패`); process.exit(1); }
  console.log('  7 통과 · 0 실패');
}
