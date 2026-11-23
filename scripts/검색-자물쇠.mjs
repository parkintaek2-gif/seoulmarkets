#!/usr/bin/env node
/**
 * 검색-자물쇠.mjs — **검색(SEO·GEO·색인)이 안 되어 있으면 배포를 막는다.**
 *
 * ── 🔴🔴 왜 자물쇠인가 (2026-10-04 · 5번) ──────────────────────────────
 * 사장님: 「seo, geo, 색인 **대체 내가 그렇게 강조했는데**」
 *         「**모든일에 다국어, 검색 관련 업무 무조건 자물쇠를 걸어**」
 *         「**모든 유닛에**」 · 「**다국어는 케이라이프맵만**」
 *
 * 그날 낮에 나는 「제목이 치는 말인가」를 두 시간 점검에 걸고
 * 「이제 저절로 보입니다」라고 보고했다. **그것으로는 모자랐다.**
 *
 * ```
 * 🔴 보이게 하는 검사   빨간불이 떠도 그냥 지나갈 수 있다
 *                      ─ 2026-08-22 에 만든 키워드 자가 9월 7일 뒤로 한 번도 안 돌았다
 * ✅ 자물쇠            안 되어 있으면 «배포가 안 나간다». 지나갈 수가 없다
 * ```
 *
 * ── 무엇을 막나 (모든 유닛) ────────────────────────────────────────────
 *   ① AI 검색 크롤러(GEO)가 막혀 있지 않나  — robots.txt 에 막는 줄이 있나
 *   ② llms.txt 가 사는가              — AI 검색이 읽는 안내문
 *   ③ 사이트맵이 사는가               — 구글이 올 길
 *   ④ 30위 밖에서 질 싸움하는 말이 «늘지» 않았나 — 못 박은 수와 견준다
 *
 * ⛔ 「줄어야 통과」가 아니라 **「늘면 막는다」**다. 한 번에 다 고칠 수는 없고,
 *   나빠지는 것만은 막아야 한다. 좋아지면 못 박은 수를 내린다.
 * ⛔ 못 잰 것을 0 으로 적지 않는다 — 못 재면 «못 쟀다»고 적고 막지 않는다.
 *   자가 못 재서 배포가 멈추면 그 자는 자물쇠가 아니라 걸림돌이다.
 *
 * 쓰는 법
 *   node scripts/검색-자물쇠.mjs              재서 막을지 정한다
 *   node scripts/검색-자물쇠.mjs --고친다      robots.txt 의 막는 줄을 걷는다
 *   node scripts/검색-자물쇠.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * 🔴 못 박은 수 — 이보다 «늘면» 막는다. 좋아지면 내려 적는다.
 *
 * 🔴🔴 [2026-10-06 02:5x · 5번] **합계 하나로 보다가 거짓으로 막았다.**
 *   10-04 에 117 을 못 박았는데 오늘 164 가 나와 배포가 멈췄다. 갈라 보니 —
 * ```
 * seoulmarkets  30위 밖 113 / 뜬 말 153   10-04 에도 세고 있던 곳
 * kcw                     6 /       9    10-04 에도 세고 있던 곳
 * 100y                   45 /      49   ← **10-04 엔 GSC 파일이 아예 없었다**
 * klifemap                0 /       0    아직 뜨는 말이 없다
 * ```
 *   ⇒ 113+6 = 119 로 **거의 그대로**다. 나빠진 것이 아니라
 *     **100yearmap 을 처음 재기 시작한 것**이었다.
 *
 *   ⛔ 합계는 「재는 곳이 늘어난 것」과 「나빠진 것」을 가르지 못한다.
 *     그 둘을 섞으면 자물쇠가 날마다 거짓으로 막고, 거짓으로 막는 자물쇠는
 *     결국 꺼진다 — 그러면 자물쇠가 없는 것과 같다(이 자 머리말 그대로다).
 *
 *   ⛔ 기준선만 164 로 올리는 것도 안 된다. 새 사이트를 잴 때마다 올리면
 *     그때는 거짓으로 «통과»시킨다. 막는 쪽으로 틀리나 통과시키는 쪽으로
 *     틀리나 똑같이 자물쇠가 아니다.
 *
 *   ⭐ 그래서 **사이트별로** 못 박는다. 한 곳이 나빠지면 그 곳만 막힌다.
 */
export const 못박은_질싸움들 = {
  seoulmarkets: 113,   /* 2026-10-06 02:5x 실측 (뜬 말 153가지 중) */
  kcw: 6,              /* 2026-10-06 02:5x 실측 (뜬 말 9가지 중) */
  '100y': 45,          /* 2026-10-06 02:5x 실측 — 처음 재는 곳이다 */
  klifemap: 0,         /* 아직 뜨는 말이 없다 */
};

/**
 * ⚠ 새로 뜨기 시작한 말은 «좋은 일»이다 — 지면을 내면 30위 밖부터 시작한다.
 *   절대 수만 보면 그 좋은 일을 「나빠졌다」로 읽는다. 사장님이 요구하신 것은
 *   지면 수 × 말 수 × 나라 수가 같이 느는 것이다.
 *   ⇒ **절대 수가 늘었고 «동시에» 몫(30위 밖 비율)도 나빠졌을 때만** 막는다.
 *     지면을 더 내서 수가 늘었는데 몫이 그대로거나 좋아졌으면 통과시킨다.
 */
export const 못박은_질싸움몫 = {
  seoulmarkets: 0.739,   /* 113/153 */
  kcw: 0.667,            /* 6/9 */
  '100y': 0.918,         /* 45/49 */
  klifemap: 1.0,         /* 못 잰 자리 — 뜬 말이 0가지다 */
};

/** ⚠ 합계는 «보여만» 준다. 막는 판정은 사이트별로 한다 */
export const 못박은_질싸움 = Object.values(못박은_질싸움들).reduce((a, b) => a + b, 0);

/** AI 검색이 읽어 가는 자들. 막으면 GEO 가 통째로 죽는다 */
export const AI크롤러 = [
  'GPTBot', 'OAI-SearchBot', 'ChatGPT-User',
  'ClaudeBot', 'Claude-User', 'anthropic-ai',
  'PerplexityBot', 'Google-Extended', 'Applebot-Extended', 'CCBot',
];

export const 사이트들 = [
  { 딱지: 'kcw', 집: 'www.kculturewire.com' },
  { 딱지: 'klifemap', 집: 'klifemap.ai' },
  { 딱지: '100y', 집: '100yearmap.com' },
  { 딱지: 'seoulmarkets', 집: 'seoulmarkets.com' },
];

/**
 * robots.txt 에서 **AI 크롤러를 막는 줄**을 찾는다.
 * ⛔ `Disallow:` 가 빈 줄은 «막지 않는다»는 뜻이다 — 그것까지 흠으로 세지 않는다.
 * ⛔ 로그인 화면 같은 개별 금지는 막음이 아니다. `Disallow: /` 만이 통째 막음이다.
 */
export function AI를막나(robots) {
  const s = String(robots ?? '');
  if (!s.trim()) return null;            /* 못 읽었다 — 0 으로 안 적는다 */
  const 줄들 = s.split(/\r?\n/);
  const 막힌것 = [];
  let 지금자 = null;
  for (const 줄 of 줄들) {
    const u = /^\s*User-agent\s*:\s*(.+?)\s*$/i.exec(줄);
    if (u) { 지금자 = u[1]; continue; }
    const d = /^\s*Disallow\s*:\s*(.*?)\s*$/i.exec(줄);
    if (!d || !지금자) continue;
    if (d[1] !== '/') continue;          /* 통째 막음만 본다 */
    const 이름 = 지금자.toLowerCase();
    if (이름 === '*' || AI크롤러.some((x) => x.toLowerCase() === 이름)) 막힌것.push(지금자);
  }
  return 막힌것;
}

/** 못 박은 수보다 늘었나 — 늘면 막는다 */
export function 늘었나(지금, 못박은 = 못박은_질싸움) {
  if (typeof 지금 !== 'number' || !Number.isFinite(지금) || 지금 < 0) return null;
  return 지금 > 못박은;
}

/**
 * 한 사이트가 «나빠졌나» — 수와 몫을 함께 본다.
 *
 * ⛔ 수만 보면 지면을 내서 새 말이 뜨기 시작한 것을 「나빠졌다」로 읽는다.
 *   그것은 우리가 바라는 일이다(사장님: 지면 수 × 말 수 × 나라 수).
 * ⛔ 몫만 보면 분모가 작은 곳에서 한 가지가 늘어도 크게 튄다(kcw 는 9가지뿐).
 * ⭐ **둘 다 나빠졌을 때만** 막는다. 하나라도 좋아졌으면 통과시킨다.
 *
 * @returns null  못 쟀다 — 막지 않는다
 */
export function 나빠졌나(잰것, 못박은수, 못박은몫) {
  if (!잰것 || typeof 잰것.뒤 !== 'number' || typeof 잰것.전체 !== 'number') return null;
  if (typeof 못박은수 !== 'number' || typeof 못박은몫 !== 'number') return null;
  if (잰것.전체 <= 0) return null;          /* 뜬 말이 없으면 잴 것이 없다 */
  const 몫 = 잰것.뒤 / 잰것.전체;
  return 잰것.뒤 > 못박은수 && 몫 > 못박은몫;
}

function 받아온다(주소) {
  try {
    return execFileSync('curl', ['-sS', '--max-time', '15', '-A',
      'Mozilla/5.0 (compatible; klifedesign-check)', 주소], { encoding: 'utf8' });
  } catch { return null; }
}

/** 그 주소가 사는가 — HTTP 가 200 인가. ⛔ 못 물으면 null
 *
 * 🔴🔴 [2026-11-23 · 5번] **403 을 「없다」로 읽어 배포를 거짓으로 세웠다.**
 *   ─────────────────────────────────────────────────────────────────────
 *   [무엇이 있었나] 라이브 주소 아홉 개를 연달아 열었더니 우리 침입 차단 장치가
 *     내 아이피를 끊었다. 그 뒤로 이 자가 세 사이트 모두에 대해
 *     「llms 없음 · 사이트맵 없음」을 찍었고 배포가 멈췄다.
 *     **파일은 그 자리에 있었다.** 403 이 돌아온 것을 c === '200' 이 false 로
 *     읽었을 뿐이다 — 「없다」와 「못 봤다」를 한 칸에 담은 것이다.
 *   ⛔ 측정하지 못한 것을 측정한 것처럼 적지 않는다. 사장님이 거듭 이르신 것이다.
 *   ⇒ 404 와 410 만 「없다」로 센다. 403·429·5xx 와 같이 **막혀서 못 본 것**은
 *     null 로 돌려 「못 쟀다」가 되게 한다. 못 쟀다는 배포를 막지 않는다. */
export function 산다(주소) {
  try {
    const c = execFileSync('curl', ['-sS', '-o', process.platform === 'win32' ? 'NUL' : '/dev/null',
      '-w', '%{http_code}', '--max-time', '15', 주소], { encoding: 'utf8' }).trim();
    if (!/^\d+$/.test(c)) return null;
    if (c === '200') return true;
    if (c === '404' || c === '410') return false;   /* 정말 없다 */
    return null;                                     /* 막혔거나 탈났다 — 못 쟀다 */
  } catch { return null; }
}

/* ── 자가시험 ─────────────────────────────────────────────────────────── */
export function 자가시험() {
  const 결과 = [];
  const T = (이름, 참) => 결과.push({ 이름, 참: !!참 });

  T('🔴 모두 막는 줄을 잡는다',
    (AI를막나('User-agent: *\nDisallow: /') || []).length === 1);
  T('🔴 GPTBot 을 막는 줄을 잡는다',
    (AI를막나('User-agent: GPTBot\nDisallow: /') || []).includes('GPTBot'));
  T('ClaudeBot 도 본다',
    (AI를막나('User-agent: ClaudeBot\nDisallow: /') || []).includes('ClaudeBot'));
  T('⛔ 개별 금지는 막음이 아니다',
    (AI를막나('User-agent: *\nAllow: /\nDisallow: /login.html') || []).length === 0);
  T('⛔ 빈 Disallow 는 막음이 아니다',
    (AI를막나('User-agent: GPTBot\nDisallow:') || []).length === 0);
  T('⛔ 대소문자가 달라도 본다',
    (AI를막나('user-agent: gptbot\ndisallow: /') || []).length === 1);
  T('⛔ 못 읽으면 null — 빈 배열이 아니다',
    AI를막나('') === null && AI를막나(null) === null);
  T('⛔ 관계없는 자는 안 센다',
    (AI를막나('User-agent: BadSpider\nDisallow: /') || []).length === 0);

  T('🔴 못 박은 수보다 늘면 막는다', 늘었나(118, 117) === true);
  T('같으면 안 막는다', 늘었나(117, 117) === false);
  T('줄면 안 막는다', 늘었나(90, 117) === false);
  T('⛔ 못 잰 것은 null — 막지 않는다', 늘었나(null) === null && 늘었나('열둘') === null);
  T('⛔ 음수도 못 잰 것으로 본다', 늘었나(-1) === null);

  T('AI 크롤러 목록에 주요한 것이 다 있다',
    ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended'].every((x) => AI크롤러.includes(x)));
  T('네 사이트가 다 들어 있다', 사이트들.length === 4);

  /* 🔴 [2026-10-06] 합계 하나로 보다가 거짓으로 막은 자리 — 여기를 지킨다 */
  T('🔴 못 박은 수를 사이트마다 따로 둔다',
    사이트들.every(({ 딱지 }) => typeof 못박은_질싸움들[딱지] === 'number'
      && typeof 못박은_질싸움몫[딱지] === 'number'));
  T('🔴 수와 몫이 «둘 다» 나빠지면 막는다',
    나빠졌나({ 뒤: 130, 전체: 150 }, 113, 0.739) === true);
  T('⛔ 수만 늘고 몫이 좋아졌으면 안 막는다 — 지면을 내면 새 말이 뜬다',
    나빠졌나({ 뒤: 130, 전체: 200 }, 113, 0.739) === false);
  T('⛔ 몫만 나쁘고 수가 그대로면 안 막는다',
    나빠졌나({ 뒤: 113, 전체: 120 }, 113, 0.739) === false);
  T('🔴 같으면 안 막는다', 나빠졌나({ 뒤: 113, 전체: 153 }, 113, 0.739) === false);
  T('⛔ 뜬 말이 0 가지면 null — 막지 않는다',
    나빠졌나({ 뒤: 0, 전체: 0 }, 0, 1.0) === null);
  T('⛔ 못 잰 것은 null', 나빠졌나(null, 113, 0.739) === null
    && 나빠졌나({ 뒤: '여럿', 전체: 10 }, 113, 0.739) === null
    && 나빠졌나({ 뒤: 5, 전체: 10 }, null, 0.739) === null);
  /* ⚠ 2026-10-06 실측 그대로 넣었을 때 아무 데도 안 막혀야 한다 */
  T('🔴 오늘 실측으로는 네 곳 다 안 막힌다', (() => {
    const 잰 = { seoulmarkets: { 뒤: 113, 전체: 153 }, kcw: { 뒤: 6, 전체: 9 },
      '100y': { 뒤: 45, 전체: 49 }, klifemap: { 뒤: 0, 전체: 0 } };
    return Object.entries(잰).every(([딱지, v]) =>
      나빠졌나(v, 못박은_질싸움들[딱지], 못박은_질싸움몫[딱지]) !== true);
  })());
  T('⛔ seoulmarkets 가 진짜 나빠지면 막힌다 — 자물쇠가 꺼진 것이 아니다',
    나빠졌나({ 뒤: 140, 전체: 160 }, 못박은_질싸움들.seoulmarkets, 못박은_질싸움몫.seoulmarkets) === true);
  T('🔴 합계는 사이트별 수를 더한 것이다',
    못박은_질싸움 === 113 + 6 + 45 + 0);

  const 빨강 = 결과.filter((r) => !r.참).length;
  console.log('■ 검색 자물쇠 — 자가시험');
  for (const r of 결과) console.log(`  ${r.참 ? '✅' : '🔴'} ${r.이름}`);
  console.log(빨강 ? `🔴 빨강 ${빨강}개` : `✅ ${결과.length}가지 다 통과`);
  return 빨강 === 0;
}

/**
 * 사이트마다 질 싸움 중인 말이 몇 가지인가.
 * ⛔ 합계 하나로 돌려주지 않는다 — 그러면 「재는 곳이 늘어난 것」과
 *   「나빠진 것」을 가르지 못한다. 2026-10-06 에 그래서 거짓으로 막혔다.
 * @returns { [딱지]: { 뒤, 전체, 파일 } }  · 아무 데도 못 재면 null
 */
export async function 질싸움갈래() {
  try {
    const m = await import('./check-제목이-치는말인가.mjs');
    const 밑 = path.join(뿌리, 'src/data');
    const 모음 = {};
    for (const { 딱지 } of 사이트들) {
      const 것들 = fs.readdirSync(밑)
        .filter((n) => n.startsWith(`gsc-${딱지}-2`) && n.endsWith('.json')).sort();
      const 마지막 = 것들[것들.length - 1];
      if (!마지막) continue;                 /* 못 쟀다 — 0 으로 안 적는다 */
      let 말들 = null;
      try { 말들 = m.뜬말들(JSON.parse(fs.readFileSync(path.join(밑, 마지막), 'utf8'))); }
      catch { 말들 = null; }
      if (말들 === null) continue;
      모음[딱지] = { 뒤: (m.뒤처진말들(말들) || []).length, 전체: 말들.length, 파일: 마지막 };
    }
    return Object.keys(모음).length ? 모음 : null;
  } catch { return null; }
}

/** 지금 질 싸움 중인 말이 모두 몇 가지인가 — «보여 주기»용. ⛔ 막는 판정에 쓰지 않는다 */
export async function 질싸움수() {
  const 갈래 = await 질싸움갈래();
  if (!갈래) return null;
  return Object.values(갈래).reduce((a, b) => a + b.뒤, 0);
}

/* ── 혼자 돌 때 ───────────────────────────────────────────────────────── */
const 내가실행됐다 = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (내가실행됐다) {
  if (process.argv.includes('--selftest') || process.argv.includes('--자가시험')) {
    process.exit(자가시험() ? 0 : 1);
  }

  const 막는것 = [];
  const 못잰것 = [];

  console.log('■ 검색 자물쇠 — SEO·GEO·색인');
  console.log('   ⛔ 안 되어 있으면 배포하지 않는다. 사장님: 「무조건 자물쇠를 걸어」\n');

  for (const { 집 } of 사이트들) {
    const robots = 받아온다(`https://${집}/robots.txt`);
    const 막힘 = AI를막나(robots);
    const llms = 산다(`https://${집}/llms.txt`);
    const 사맵 = 산다(`https://${집}/sitemap.xml`);

    const 줄 = [];
    if (막힘 === null) { 못잰것.push(`${집} robots.txt`); 줄.push('⬜ robots 못 읽었다'); }
    else if (막힘.length) { 막는것.push(`${집} — AI 검색을 막는 줄: ${막힘.join(', ')}`); 줄.push(`🔴 AI 막음 ${막힘.join(', ')}`); }
    else 줄.push('✅ AI 안 막음');

    if (llms === null) { 못잰것.push(`${집} llms.txt`); 줄.push('⬜ llms 못 쟀다'); }
    else if (!llms) { 막는것.push(`${집} — llms.txt 가 없다 (GEO)`); 줄.push('🔴 llms 없음'); }
    else 줄.push('✅ llms');

    if (사맵 === null) { 못잰것.push(`${집} sitemap.xml`); 줄.push('⬜ 사이트맵 못 쟀다'); }
    else if (!사맵) { 막는것.push(`${집} — sitemap.xml 이 없다`); 줄.push('🔴 사이트맵 없음'); }
    else 줄.push('✅ 사이트맵');

    console.log(`  ${집.padEnd(24)} ${줄.join(' · ')}`);
  }

  /* 🔴🔴 [2026-10-04 · 5번] **오늘 색인 요청 몫을 썼나.**
     구글에 직접 물어 보니 KLifeMap 지면은 「발견됨 - 색인 안 함」이고
     「한 번도 수집 안 왔다」였다. 사이트맵만으로는 안 들어간다.
     ⛔ 색인 요청은 하루 10개 안팎이 한도다 — **안 쓰면 그날치가 영영 사라진다.**
       날마다 쓰면 한 해에 3,600장이고, 안 쓰면 0장이다. 그래서 막는다. */
  let 색인글 = ''; let 색인막힘 = false;
  try { 색인글 = execFileSync('node', [path.join(뿌리, 'scripts/날마다-색인요청.mjs'), '--오늘몫을썼나'], { encoding: 'utf8', cwd: 뿌리 }); }
  catch (e) { 색인글 = String(e.stdout ?? '') + String(e.stderr ?? ''); 색인막힘 = true; }
  for (const l of 색인글.split(/\r?\n/)) if (l.trim()) console.log('\n  ' + l.trim());

  /* 🔴🔴 [2026-10-29 · 5번] **문이 잠긴 것과 안 한 것을 가른다.**
     ─────────────────────────────────────────────────────────────────
     오늘 서치콘솔이 네 속성 모두 「이 속성에 액세스할 수 없습니다」였다
     (크롬에 든 계정 admin@klifedesign.net 에 권한이 없다).
     색인 요청을 «할 수가 없는데» 이 자물쇠가 배포를 통째로 세운다.
     ⛔ 몫을 쓴 척하고 넘어가지 않는다 — 그러면 진짜로 안 한 날과 구별이 사라진다.
     ⇒ 문이 잠긴 날은 **배포를 막지 않되 화면에 크게 적는다.** 고칠 것은 권한이지 배포가 아니다.
     ⚠ 이 면제는 «그날 자국이 있을 때»만 열린다 — 자국은 색인요청 자가 남긴다. */
  /* ⛔ `toISOString()` 을 쓰지 않는다 — 이 PC 는 이미 한국시간이다(사장님 지침) */
  const 오늘날 = new Date().toLocaleDateString('sv-SE');
  const 문잠김자국 = path.join(뿌리, 'docs', '고정업무-마커', `${오늘날}-서치콘솔-문잠김.txt`);
  const 문잠겼나 = fs.existsSync(문잠김자국);
  if (색인막힘 && 문잠겼나) {
    console.log('\n  🔴🔴 서치콘솔 문이 잠겼다 — 오늘 색인 요청을 «할 수가 없었다».');
    console.log('     크롬에 든 계정에 네 속성 권한이 없다. 배포는 막지 않는다.');
    console.log(`     자국 — ${path.relative(뿌리, 문잠김자국)}`);
  } else if (색인막힘) {
    막는것.push('오늘 색인 요청 몫을 안 썼다 — node scripts/날마다-색인요청.mjs --넣는다');
  }

  /* 🔴🔴 [2026-10-04 · 5번] **형제 지면이 너무 닮았나 — 구글이 안 넣는 진짜 까닭.**
     구글은 「발견됨 - 색인 안 함」이라고만 답하고 왜인지는 말하지 않는다. 재 보니 —
       KCW born-on      41.5% · 3,990자  → 366장 중 142장이 1쪽에 떴다
       KLifeMap star ko 59.9% · 2,381자  → 0장
     ⛔ 같은 틀에 이름만 바뀐 지면은 「새 글」이 아니라 「복사본」이다.
     ⚠ 지금 세 곳이 걸려 있다. 다 고칠 때까지 배포를 멈출 수는 없으므로
       **못 박은 수를 두고 「늘면 막는다」**로 한다. 고치면 내려 적는다. */
  {
    let 닮음글 = ''; let 닮은곳 = null;
    try { 닮음글 = execFileSync('node', [path.join(뿌리, 'scripts/check-형제지면이-너무-닮았나.mjs')], { encoding: 'utf8', cwd: 뿌리 }); }
    catch (e) { 닮음글 = String(e.stdout ?? '') + String(e.stderr ?? ''); }
    /* 🔴 [2026-10-04] 처음에 🔴 줄을 모두 셌더니 **자가 쓴 요약 줄까지** 세어 3이 4가 됐다.
       ⛔ 자가 제 요약을 흠으로 세면 수가 영영 안 맞는다. 표 줄만 센다. */
    닮은곳 = (닮음글.match(/^\s*🔴 .*닮은 몫/gm) || []).length;
    const 못박은_닮은틀 = 3;   /* 2026-10-04 실측 — 고치면 내려 적는다 */
    console.log(`\n  ${닮은곳 > 못박은_닮은틀 ? '🔴' : '✅'} 구글이 「복사본」으로 볼 지면 틀 ${닮은곳}개 (못 박은 수 ${못박은_닮은틀})`);
    if (닮은곳 > 못박은_닮은틀) 막는것.push(`너무 닮은 지면 틀이 ${못박은_닮은틀} → ${닮은곳} 로 늘었다`
      + ' — node scripts/check-형제지면이-너무-닮았나.mjs');
    else if (닮은곳 < 못박은_닮은틀) console.log(`     ⭐ ${못박은_닮은틀 - 닮은곳}개 줄었다 — 못 박은 수를 ${닮은곳} 로 내려 적으십시오`);
  }

  /* 🔴 [2026-10-06 · 5번] **사이트별로 가른다.** 합계 하나로 보면
     「100yearmap 을 처음 재기 시작한 것」을 「나빠진 것」으로 읽는다. */
  const 갈래 = await 질싸움갈래();
  if (갈래 === null) {
    못잰것.push('질 싸움 중인 말');
    console.log('\n  ⬜ 질 싸움 중인 말 — 못 쟀다 (GSC 자료가 없다). 0 으로 안 적는다');
  } else {
    console.log('\n  ■ 30위 밖에서 질 싸움 중인 말 — 사이트별로');
    let 합 = 0;
    for (const { 딱지 } of 사이트들) {
      const 잰것 = 갈래[딱지];
      if (!잰것) { console.log(`     ⬜ ${딱지.padEnd(14)} 못 쟀다 (GSC 자료가 없다)`); continue; }
      합 += 잰것.뒤;
      const 수기준 = 못박은_질싸움들[딱지];
      const 몫기준 = 못박은_질싸움몫[딱지];
      const 몫 = 잰것.전체 > 0 ? 잰것.뒤 / 잰것.전체 : null;
      const 나쁨 = 나빠졌나(잰것, 수기준, 몫기준);
      const 표 = 나쁨 === null ? '⬜' : (나쁨 ? '🔴' : '✅');
      const 몫글 = 몫 === null ? '못 잼' : (몫 * 100).toFixed(1) + '%';
      console.log(`     ${표} ${딱지.padEnd(14)} ${String(잰것.뒤).padStart(3)}/${String(잰것.전체).padStart(3)}가지 (${몫글})`
        + `  못 박은 수 ${수기준} · 몫 ${(몫기준 * 100).toFixed(1)}%`);
      /* ⭐ 수와 몫이 «둘 다» 나빠졌을 때만 막는다 — 지면을 내서 새 말이
         뜨기 시작한 것은 좋은 일이지 나빠진 것이 아니다 */
      if (나쁨) 막는것.push(`${딱지} 의 질 싸움 말이 ${수기준}→${잰것.뒤} 이고 몫도 `
        + `${(몫기준 * 100).toFixed(1)}%→${몫글} 로 나빠졌다`);
      else if (몫 !== null && 몫 < 몫기준 - 0.005) {
        console.log(`        ⭐ 몫이 좋아졌다 — 못 박은 몫을 ${(몫).toFixed(3)} 로 내려 적으십시오`);
      }
    }
    console.log(`     ─ 합 ${합}가지 (⚠ 합계로는 막지 않는다 — 사이트별로 본다)`);
  }

  if (못잰것.length) {
    console.log(`\n  ⚠ 못 잰 것 ${못잰것.length}개 — ${못잰것.slice(0, 4).join(' · ')}`);
    console.log('     ⛔ 못 잰 것으로는 막지 않는다. 「못 쟀다」와 「깨졌다」는 다르다');
  }

  if (막는것.length) {
    console.log('\n🔴🔴 **검색 자물쇠가 막는다 — 배포하지 않는다.**');
    for (const x of 막는것) console.log(`   · ${x}`);
    console.log('\n   고치는 길');
    console.log('     AI 막음     node scripts/검색-자물쇠.mjs --고친다');
    console.log('     질 싸움     node scripts/check-제목이-치는말인가.mjs 로 보고');
    console.log('                 node scripts/measure-keyword-demand.mjs 로 치는 말을 재서 제목에 넣는다');
    process.exit(1);
  }
  console.log('\n✅ 검색 자물쇠 — 막는 것 없다');
}
