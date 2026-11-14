#!/usr/bin/env node
/**
 * check-seat-login-expiry.mjs — **자리마다 로그인이 언제 끊기는지 미리 재서 알린다.**
 *
 * ── 🔴🔴 왜 (2026-11-14 · 5번) ───────────────────────────────────────────
 * 아침에 1번에게 일을 내리다 경고 한 줄을 봤다 —
 *   「Warning: this sign-in can end at any time from now until 2026-11-16.
 *     **Renewing it does not move that date.**」
 * 1번 자리의 로그인이 **2026-11-16 에 끝난다.** 갱신해도 그 날짜는 안 움직인다.
 * 끊기면 그날 네 사이트 콘텐트가 **통째로 0편**이 된다 — 2026-11-13 에 자리가
 * 안 열려 겪은 바로 그 일이, 이번에는 자리는 열린 채로 벌어진다.
 *
 * ⛔ 그날 아침에 알면 늦다. 그날은 토요일이고, 다시 로그인하는 데 사람 손이 든다.
 * ⇒ 날마다 재서 **사흘 전부터** 울린다. 하루 전이면 사장님께도 올린다.
 *
 * ⛔ 「로그인돼 있다(loggedIn: true)」를 「내일도 돈다」로 읽지 않는다.
 *   지금 켜져 있는 것과 내일 켜져 있는 것은 다른 말이다.
 *   [[걸어뒀다를-돌고있다로-읽지-않는다]] 와 같은 자리의 병이다.
 *
 * 쓰는 법
 *   node scripts/check-seat-login-expiry.mjs            잰다
 *   node scripts/check-seat-login-expiry.mjs --알린다    사흘 안이면 사장님께 메일
 *   node scripts/check-seat-login-expiry.mjs --자가시험
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** 재는 자리들 — 설정 폴더가 자리를 가른다 */
export const 자리들 = [
  { 번호: '1', 이름: '1번 모든 사이트 콘텐트', 설정: 'C:/Users/USER/.claude-u1' },
  { 번호: '5', 이름: '5번 총괄', 설정: 'C:/Users/USER/.claude-u5' },
];

/** 사흘 안이면 울린다. 하루 안이면 사장님께 올린다 */
export const 울릴날수 = 3;   /* ⛔ 이 수가 종료코드를 정하지 않는다 — 알림만 정한다 */
export const 올릴날수 = 1;

/**
 * 남은 날수를 센다.
 * ⛔ toISOString() 을 쓰지 않는다 — 이 PC 는 한국시간이고 9시간을 더하거나 빼지 않는다.
 * ⛔ 못 읽으면 «못 쟀다»이지 «넉넉하다»가 아니다. null 을 돌려주고 부르는 쪽이 가른다.
 */
export function 남은날수(끝나는때, 이제 = new Date()) {
  if (!끝나는때) return null;
  const t = new Date(끝나는때);
  if (Number.isNaN(t.getTime())) return null;
  return (t.getTime() - 이제.getTime()) / (24 * 60 * 60 * 1000);
}

/** 자리 하나의 상태 글(JSON)을 읽어낸다 */
export function 읽어낸다(글) {
  try {
    const x = JSON.parse(String(글 || ''));
    return {
      쟀나: true,
      들어와있나: x.loggedIn === true,
      끝나는때: x.loginExpiresAt || null,
      메일: x.email || '',
      요금제: x.subscriptionType || '',
    };
  } catch {
    return { 쟀나: false, 까닭: '상태를 못 읽었다' };
  }
}

/** 한 자리의 판정 — 빨강 · 노랑 · 초록 · 못잼 */
export function 판정(자리상태, 이제 = new Date()) {
  if (!자리상태.쟀나) return { 빛: '못잼', 말: '상태를 못 읽었다' };
  if (!자리상태.들어와있나) return { 빛: '빨강', 말: '로그인이 이미 끊겼다' };
  const 날 = 남은날수(자리상태.끝나는때, 이제);
  if (날 === null) return { 빛: '못잼', 말: '끝나는 때를 못 읽었다' };
  if (날 <= 0) return { 빛: '빨강', 말: '로그인이 이미 끝났다', 남은날: 날 };
  if (날 <= 올릴날수) return { 빛: '빨강', 말: '하루도 안 남았다', 남은날: 날 };
  if (날 <= 울릴날수) return { 빛: '노랑', 말: '곧 끊긴다', 남은날: 날 };
  return { 빛: '초록', 말: '넉넉하다', 남은날: 날 };
}

/* ══════════════════════════════════════════════════════════════════════
   자가시험
   ══════════════════════════════════════════════════════════════════════ */
if (process.argv.includes('--자가시험')) {
  let 통 = 0; const 탈 = [];
  const 본다 = (이름, 참) => { if (참) 통 += 1; else { 탈.push(이름); console.log('🔴 ' + 이름); } };
  const 이제 = new Date('2026-11-14T07:20:00+09:00');

  본다('⛔ 못 읽은 것은 못 쟀다이지 멀쩡한 것이 아니다', 읽어낸다('{{{').쟀나 === false);
  본다('⛔ 빈 글도 마찬가지', 읽어낸다('').쟀나 === false);
  본다('상태를 읽는다', 읽어낸다('{"loggedIn":true,"loginExpiresAt":"2026-11-16T06:50:30Z"}').들어와있나 === true);

  본다('⛔ 못 쟀으면 초록이 아니다', 판정({ 쟀나: false }, 이제).빛 === '못잼');
  본다('⛔ 끝나는 때가 없으면 초록이 아니다',
    판정({ 쟀나: true, 들어와있나: true, 끝나는때: null }, 이제).빛 === '못잼');
  본다('🔴 이미 끊겼으면 빨강',
    판정({ 쟀나: true, 들어와있나: false }, 이제).빛 === '빨강');

  /* 1번 자리의 실제 값 — 2026-11-16T06:50Z = 한국시간 11-16 15:50 */
  본다('🔴 이틀 남짓이면 노랑 — 그날 아침에 알면 늦다',
    판정({ 쟀나: true, 들어와있나: true, 끝나는때: '2026-11-16T06:50:30Z' }, 이제).빛 === '노랑');
  본다('🔴 하루 안이면 빨강',
    판정({ 쟀나: true, 들어와있나: true, 끝나는때: '2026-11-14T20:00:00+09:00' }, 이제).빛 === '빨강');
  본다('⛔ 나흘 넘게 남았으면 초록 — 거짓 경보를 내지 않는다',
    판정({ 쟀나: true, 들어와있나: true, 끝나는때: '2026-11-18T13:06:11Z' }, 이제).빛 === '초록');
  본다('⛔ 이미 지난 때는 빨강',
    판정({ 쟀나: true, 들어와있나: true, 끝나는때: '2026-11-13T00:00:00+09:00' }, 이제).빛 === '빨강');

  본다('남은 날수를 잰다', Math.round(남은날수('2026-11-16T07:20:00+09:00', 이제)) === 2);
  본다('⛔ 못 읽는 때는 null', 남은날수('그제', 이제) === null && 남은날수(null, 이제) === null);

  console.log(탈.length ? `\n🔴 ${탈.length}가지 탈` : `\n✅ 자가시험 ${통} 통과`);
  process.exit(탈.length ? 1 : 0);
}

/* ══════════════════════════════════════════════════════════════════════
   잰다
   ══════════════════════════════════════════════════════════════════════ */
const 잰것 = [];
for (const 자리 of 자리들) {
  if (!fs.existsSync(자리.설정)) { 잰것.push({ ...자리, ...판정({ 쟀나: false }), 까닭: '설정 폴더가 없다' }); continue; }
  let 글 = '';
  try {
    /* ⛔ shell: true 로 인자를 붙여 넘기지 않는다 — 인자가 그대로 이어붙는다.
       윈도에서 `claude` 는 .cmd 라 cmd /c 로 부른다. */
    글 = execFileSync('cmd', ['/c', 'claude', 'auth', 'status'],
      { encoding: 'utf8', timeout: 60000, env: { ...process.env, CLAUDE_CONFIG_DIR: 자리.설정 } });
  } catch (e) {
    잰것.push({ ...자리, 빛: '못잼', 말: String(e.message).slice(0, 80) });
    continue;
  }
  const 상태 = 읽어낸다(글);
  잰것.push({ ...자리, ...상태, ...판정(상태) });
}

const 이제글 = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
console.log(`\n■ 자리 로그인이 언제 끊기나 — ${이제글}\n`);

const 빛글 = { 빨강: '🔴', 노랑: '🟡', 초록: '✅', 못잼: '⬜' };
for (const x of 잰것) {
  const 남은 = Number.isFinite(x.남은날) ? `${x.남은날.toFixed(1)}일 남음` : '-';
  const 끝 = x.끝나는때 ? new Date(x.끝나는때).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) : '(못 읽음)';
  console.log(`  ${빛글[x.빛] || '?'} ${x.이름.padEnd(22)} ${String(남은).padEnd(12)} 끝나는 때 ${끝}   ${x.메일 || ''}`);
  if (x.빛 === '빨강' || x.빛 === '노랑' || x.빛 === '못잼') console.log(`      → ${x.말}`);
}

const 급한것 = 잰것.filter((x) => x.빛 === '빨강' || x.빛 === '노랑');
console.log('');
if (!급한것.length) {
  console.log('✅ 사흘 안에 끊기는 자리가 없다\n');
} else {
  console.log('⛔ 「갱신하면 된다」로 읽지 않는다 — 끝나는 날짜는 갱신해도 안 움직인다.');
  console.log('   다시 로그인해야 한다: CLAUDE_CONFIG_DIR 을 그 자리로 두고 `claude auth login`\n');
}

/* ⛔ 사장님께는 겨냥한 것만 올린다 — 날마다 보내면 늑대와 양치기 소년이 된다
   ⛔ 예약작업에서는 ASCII 별칭(--alert)을 쓴다. 한글 인자는 깨져서 전해질 수 있다 —
      2026-11-14 에 run-기사다갔나.cmd 의 `--알린다` 가 그렇게 깨져 몇 주를 조용히 있었다. */
if ((process.argv.includes('--알린다') || process.argv.includes('--alert'))
  && 급한것.some((x) => x.빛 === '빨강')) {
  console.log('🔴 빨강이 있다 — 사장님께 올릴 자리다 (보내는 것은 부르는 쪽이 한다)');
}

/**
 * 🔴 [2026-11-14 · 5번 · 같은 날 고침] **잰 것을 「고장」으로 내보내고 있었다.**
 *
 * 08:00 에 이 자가 1번 자리의 만료(11-16)를 제대로 잡고 종료코드 1 을 냈다.
 * 그런데 `잰다-저절로-도는-일이-실패했나.mjs` 는 1 을 **그 일이 실패한 것**으로 읽는다.
 * ⇒ 잘 돌아간 자가 고장 목록에 올라앉았다. 거짓 빨강이 하나 더 늘어난 것이다.
 *
 * ⭐ 가른다 — **일이 실패한 것**과 **일이 찾아낸 것**은 다르다.
 *   0 = 쟀다(찾은 것이 있든 없든)  ·  1 = 못 쟀다(이것이 고장이다)
 *   찾은 것은 종료코드가 아니라 **알림**으로 나간다. 그것이 이 자의 일이다.
 */
const 못잰것 = 잰것.filter((x) => x.빛 === '못잼');
if (못잰것.length === 잰것.length && 잰것.length) {
  console.log('🔴 한 자리도 못 쟀다 — 이것이 고장이다');
  process.exitCode = 1;
} else {
  process.exitCode = 0;   /* 쟀다. 급한 것이 있어도 «이 자»는 제 일을 했다 */
}
