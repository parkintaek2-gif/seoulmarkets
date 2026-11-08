#!/usr/bin/env node
/**
 * 치운다-우리가-남긴-탭.mjs — **우리 스크립트가 남긴 크롬 탭을 닫는다.**
 *
 * ── 🔴 왜 (2026-09-29 · 5번) ─────────────────────────────────────────
 * 배경 명령 셋이 **메모리 부족으로 죽었다.** 재 보니 메모리 89% · 남은 것 3.6GB 였고,
 * 크롬 탭이 **157개** 쌓여 있었다.
 *
 * 까닭은 우리 스크립트다. 우리는 언제나 «새 탭»을 열고 `finally` 에서 닫는데,
 * **`process.exit()` 로 끝나면 그 `finally` 가 안 돈다.** 오늘만 여러 자가 그렇게 끝났다.
 * 그 탭이 하나씩 쌓여 결국 PC 를 눌렀다.
 *
 * 🔴 **PC 가 멈추면 전 유닛이 멈춘다.** 그래서 이것은 살림이 아니라 운영이다.
 *
 * ⛔ **사장님 탭을 닫지 않는다.** `about:blank` 와 우리가 여는 주소만 닫는다.
 * ⛔ `b.close()` 를 부르지 않는다 — 사장님 창이 통째로 닫힌다. `disconnect()` 만.
 * ⛔ 탭이 하나만 남으면 더 닫지 않는다 — 창이 닫힐 수 있다.
 *
 * 쓰는 법
 *   node scripts/치운다-우리가-남긴-탭.mjs           무엇을 닫을지 «보기만» 한다
 *   node scripts/치운다-우리가-남긴-탭.mjs --닫는다  실제로 닫는다
 *   node scripts/치운다-우리가-남긴-탭.mjs --자가시험
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

/**
 * 이 탭을 닫아도 되나 — ⛔ 사장님이 보시던 것을 닫으면 안 된다.
 * 닫는 것은 둘뿐이다 — 빈 탭(about:blank), 그리고 «우리가 여는 주소».
 */
export function 닫아도되나(url, title = '') {
  const u = String(url ?? '');
  if (!u || u === 'about:blank') return true;
  /* 우리 스크립트가 여는 곳 */
  if (/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(u)) return true;
  if (/^https:\/\/claude\.ai\/(chat|scheduled-task|project|projects)\b/.test(u)) return true;
  if (/^https:\/\/(seoulmarkets\.com|klifemap\.ai|100yearmap\.com|www\.kculturewire\.com)\//.test(u)) return true;
  /* 그 밖은 사장님 것으로 본다 — 콘솔·메일·검색 화면 등 */
  return false;
}

/** 남길 탭 수 — 창이 닫히지 않게 적어도 하나는 둔다 */
export const 남길것 = 1;

/** 닫을 목록을 고른다. ⛔ 전부 닫지 않는다 */
export function 닫을것고르기(탭들) {
  const 것 = (탭들 ?? []).filter((t) => t && t.type === 'page');
  const 닫을것 = 것.filter((t) => 닫아도되나(t.url, t.title));
  /* 닫고 나면 몇 개가 남나 — 하나도 안 남으면 마지막 하나는 살린다 */
  const 남는수 = 것.length - 닫을것.length;
  if (남는수 >= 남길것) return 닫을것;
  return 닫을것.slice(0, Math.max(0, 닫을것.length - (남길것 - 남는수)));
}

/* ── 자가시험 ─────────────────────────────────────────────────────── */
export function 자가시험() {
  const 것 = [];
  const 본다 = (이름, 참, 덧 = '') => 것.push({ 이름, 참: !!참, 덧 });

  본다('빈 탭은 닫는다', 닫아도되나('about:blank'));
  본다('우리 로컬 서버 탭은 닫는다', 닫아도되나('http://127.0.0.1:4399/pricing'));
  본다('우리가 연 claude.ai 대화는 닫는다', 닫아도되나('https://claude.ai/chat/abc'));
  본다('우리 사이트 탭은 닫는다', 닫아도되나('https://klifemap.ai/horoscope.html'));
  본다('🔴 ⛔ 사장님 콘솔 탭은 «안» 닫는다', !닫아도되나('https://app.cloudtype.io/@parkintaek2/klifemap:main'));
  본다('🔴 ⛔ 메일 탭은 «안» 닫는다', !닫아도되나('https://mail.google.com/mail/u/0/'));
  본다('🔴 ⛔ 모르는 주소는 «안» 닫는다 — 사장님 것으로 본다', !닫아도되나('https://www.yna.co.kr/view/AKR123'));
  본다('⛔ 확장 프로그램 화면은 «안» 닫는다', !닫아도되나('chrome-extension://efaid/x.pdf'));

  const 탭예 = [
    { type: 'page', url: 'about:blank' },
    { type: 'page', url: 'https://claude.ai/chat/a' },
    { type: 'page', url: 'https://app.cloudtype.io/x' },
    { type: 'other', url: 'about:blank' },
  ];
  본다('page 가 아닌 것은 세지 않는다', 닫을것고르기(탭예).length === 2);
  본다('🔴 사장님 탭이 남으므로 둘 다 닫는다',
    닫을것고르기(탭예).every((t) => t.url !== 'https://app.cloudtype.io/x'));

  const 다우리것 = [{ type: 'page', url: 'about:blank' }, { type: 'page', url: 'about:blank' }];
  본다('🔴 전부 우리 것이어도 «하나는» 남긴다 — 창이 닫히면 안 된다',
    닫을것고르기(다우리것).length === 1);
  본다('⛔ 빈 것에 안 터진다', 닫을것고르기(null).length === 0 && 닫아도되나(null));

  const 빨강 = 것.filter((x) => !x.참);
  console.log(`■ 치운다-우리가-남긴-탭 자가시험 ${것.length - 빨강.length}/${것.length}`);
  for (const x of 것) console.log(`  ${x.참 ? '✅' : '🔴'} ${x.이름}${x.덧 ? `  (${x.덧})` : ''}`);
  return 빨강.length === 0;
}

/**
 * 어느 포트의 크롬에 붙나 — 🔴 [2026-11-05 · 사장님]
 *   「대부분 네가 열어놓고 안 닫는 것 같다. 사용 후 탭을 바로 닫아」
 *   이 자는 9222 만 두드리고 있었다. 그런데 작업용 크롬이 **9223** 으로 옮겨 간 뒤로
 *   언제나 「못 붙었다」만 내고 한 탭도 못 치웠다. 그 사이 탭이 다시 225개까지 쌓였다.
 *   ⛔ 포트를 하나만 적지 않는다 — 한 자리가 바뀌면 치우는 일이 통째로 멈춘다.
 */
export const 두드릴포트 = process.env.KLM_CHROME_PORT ? [Number(process.env.KLM_CHROME_PORT)] : [9223, 9222];

/** 한 포트에 붙어 탭 목록을 받아 온다. 못 붙으면 null */
export async function 한포트(포트) {
  const r = await fetch(`http://127.0.0.1:${포트}/json/list`, { signal: AbortSignal.timeout(4000) }).catch(() => null);
  if (!r || !r.ok) return null;
  const 탭들 = await r.json().catch(() => null);
  return 탭들 ? { 포트, 탭들 } : null;
}

/**
 * 🔴 [2026-11-08 · 5번] **붙는 포트를 «전부» 돌려준다.**
 *   옛 붙는다() 는 «먼저 답한 포트 하나»에서 멈췄다. 목록이 [9223, 9222] 라서
 *   9223 이 늘 먼저 답했고, 그 바람에 **9222 는 한 번도 쓸린 적이 없다.**
 *   그 사이 결제 자물쇠가 남긴 checkout 탭이 15개까지 쌓여 크롬이 9.1GB 를 먹었다.
 *   ⛔ 「붙었다」에서 멈추지 않는다 — 돌고 있는 크롬은 늘 둘 이상이다.
 */
export async function 붙는것들() {
  const 것 = [];
  for (const 포트 of 두드릴포트) {
    const x = await 한포트(포트);
    if (x) 것.push(x);
  }
  return 것;
}

/** 옛 이름 — 하나만 쓰던 자리가 남아 있어 그대로 둔다. 첫 포트를 돌려준다 */
export async function 붙는다() {
  const 것 = await 붙는것들();
  return 것[0] ?? null;
}

/** 남의 자(두 시간 점검 등)가 불러 쓰는 입구 — 닫은 수와 남은 수를 돌려준다. 못 붙으면 null */
export async function 치운다() {
  const 것들 = await 붙는것들();
  if (!것들.length) return null;
  let 닫힘 = 0;
  const 포트들 = [];
  for (const 붙음 of 것들) {
    포트들.push(붙음.포트);
    for (const t of 닫을것고르기(붙음.탭들)) {
      const x = await fetch(`http://127.0.0.1:${붙음.포트}/json/close/${t.id}`).catch(() => null);
      if (x && x.ok) 닫힘++;
    }
  }
  const 뒤 = await 붙는것들();
  const 남은수 = 뒤.reduce((a, z) => a + z.탭들.filter((t) => t.type === 'page').length, 0);
  return { 포트: 포트들.join('·'), 포트들, 닫힘, 남은수 };
}

/* ── 진입점 ───────────────────────────────────────────────────────── */
const 내가진입점 = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (내가진입점) {
  if (process.argv.includes('--자가시험')) process.exit(자가시험() ? 0 : 1);
  const 닫는다 = process.argv.includes('--닫는다');

  const 것들 = await 붙는것들();
  if (!것들.length) { console.log(`🔴 크롬에 못 붙었다 (${두드릴포트.join('·')})`); process.exit(1); }

  let 통닫힘 = 0; let 통탈 = 0;
  for (const { 포트, 탭들 } of 것들) {
    const 쪽 = 탭들.filter((t) => t.type === 'page');
    const 닫을것 = 닫을것고르기(탭들);
    console.log(`\n■ 크롬 ${포트} — 탭 ${쪽.length}개 · 닫을 것 ${닫을것.length}개 · 남길 것 ${쪽.length - 닫을것.length}개`);
    const 갈래 = {};
    for (const t of 닫을것) {
      const k = (t.url || '').replace(new RegExp('^(https?://[^/]+).*$'), '$1') || 'about:blank';
      갈래[k] = (갈래[k] ?? 0) + 1;
    }
    for (const [k, v] of Object.entries(갈래).sort((a, z) => z[1] - a[1])) console.log(`   ${String(v).padStart(4)}  ${k}`);
    if (!닫는다) continue;
    for (const t of 닫을것) {
      try {
        const x = await fetch(`http://127.0.0.1:${포트}/json/close/${t.id}`);
        x.ok ? 통닫힘++ : 통탈++;
      } catch { 통탈++; }
    }
  }

  if (!닫는다) { console.log('\n⬜ 보기만 했다 — --닫는다 를 붙여야 실제로 닫는다'); process.exit(0); }
  console.log(`\n✅ 닫았다 ${통닫힘}개 · 못 닫은 것 ${통탈}개`);
  const 뒤 = await 붙는것들();
  for (const { 포트, 탭들 } of 뒤) console.log(`   크롬 ${포트} 에 남은 탭 ${탭들.filter((t) => t.type === 'page').length}개`);
}
