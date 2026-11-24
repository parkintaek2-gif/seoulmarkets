#!/usr/bin/env node
/**
 * 잰다-중부매일-아이피막혔나.mjs — **중부매일이 우리 주소를 끊으면 사장님께 메일로 알린다.**
 *
 * ── 왜 이 도구가 생겼나 ─────────────────────────────────────────
 * 2026-11-24 에 중부매일 본지·CMS 가 우리 주소를 통째로 **403 Forbidden** 으로 막았다.
 * 내가 기사목록을 160쪽 넘게 빠르게 긁은 것이 원인이다. 새 기사 등록이 막혔다.
 * 사장님 —
 * 「**중부매일 접속 차단되면 이메일 보내. 업체에 말해 ip차단 해제할테니**」
 *
 * ⇒ 이 도구는 막혔는지만 재고, **막힌 순간과 풀린 순간에만** 메일을 보낸다.
 *
 * ── 이 도구가 지키는 것 ──────────────────────────────────────────
 * ⛔ **막혀 있는 내내 메일을 보내지 않는다.** 상태가 «바뀐» 때만 한 통이다 —
 *   날마다 같은 말을 보내면 진짜 경보가 왔을 때 안 열어 보신다.
 * ⛔ 두 주소만, 한 번씩만 두드린다. 두드릴수록 차단이 길어진다.
 * ⛔ 네이버 주소로 보내지 않는다 — parkintaek2@gmail.com (사장님 2026-10-16)
 * ⛔ 「못 쟀다」(망 끊김·시간초과)와 「막혔다」(403)를 가른다. 못 쟀으면 메일을 안 보낸다.
 *
 * ── 이 도구가 못 보는 것 ─────────────────────────────────────────
 * ⚠ CMS 로그인이 살아 있는지는 못 잰다 — 그건 잰다-중부매일-문이-열려있나.mjs 가 본다
 * ⚠ 403 이 아닌 다른 꼴의 차단(빈 지면·끝없는 기다림)은 「못 쟀다」로 잡힌다
 *
 * 쓰는 법  node scripts/잰다-중부매일-아이피막혔나.mjs --자가시험
 *          node scripts/잰다-중부매일-아이피막혔나.mjs            잰다(메일은 안 보낸다)
 *          node scripts/잰다-중부매일-아이피막혔나.mjs --알린다    바뀌었으면 메일을 보낸다
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const 받는곳 = 'parkintaek2@gmail.com';
const 대장 = path.resolve('docs/자국/중부매일-접속상태.json');

export const 볼곳 = [
  ['본지', 'https://www.jbnews.com/'],
  ['CMS', 'https://cms.jbnews.com/'],
];

/**
 * 한 주소의 상태 코드를 「열림 / 막힘 / 못쟀다」로 읽는다.
 * ⛔ 403 만 막힘이다. 시간초과·망오류는 **못 쟀다**이지 막힘이 아니다 —
 *   이것을 안 가르면 우리 인터넷이 잠깐 끊긴 것으로 사장님께 거짓 경보가 간다.
 */
export function 코드를읽는다(코드) {
  if (코드 === null || 코드 === undefined) return '못쟀다';
  const n = Number(코드);
  if (n === 403 || n === 406 || n === 429) return '막힘';
  if (n >= 200 && n < 400) return '열림';
  if (n >= 500) return '못쟀다';
  return '막힘';
}

/**
 * 두 주소의 판정을 하나로 모은다.
 * 하나라도 막혔으면 막힘이다 — CMS 만 막혀도 기사를 못 올린다.
 */
export function 모은다(판정들) {
  const vs = Object.values(판정들 ?? {});
  if (!vs.length) return '못쟀다';
  if (vs.includes('막힘')) return '막힘';
  if (vs.every((v) => v === '못쟀다')) return '못쟀다';
  return '열림';
}

/**
 * 알려야 하나 — 상태가 «바뀐» 때만 참이다.
 * ⛔ 「못쟀다」로는 알리지 않는다. 앞선 상태를 지운 것도 아니다.
 */
export function 알려야하나(앞, 지금) {
  if (지금 === '못쟀다') return false;
  if (!앞) return 지금 === '막힘';   /* 처음 재는데 열려 있으면 조용하다 */
  return 앞 !== 지금;
}

/* ────────────────────────── 자가시험 ────────────────────────── */
function 자가시험() {
  const 시험 = [];
  const T = (이름, 참) => 시험.push([이름, !!참]);

  T('코드 — 403 은 막힘', 코드를읽는다(403) === '막힘');
  T('코드 — 429 도 막힘(요청이 잦다고 끊은 것)', 코드를읽는다(429) === '막힘');
  T('코드 — 200 은 열림', 코드를읽는다(200) === '열림');
  T('코드 — 301 도 열림(옮겨 보냈을 뿐)', 코드를읽는다(301) === '열림');
  /* 🔴 우리 인터넷이 끊긴 것을 「막혔다」로 읽으면 사장님께 거짓 경보가 간다 */
  T('코드 — 못 받았으면 «못쟀다»이지 막힘이 아니다', 코드를읽는다(null) === '못쟀다');
  T('코드 — 500 은 저쪽 탈이지 차단이 아니다', 코드를읽는다(500) === '못쟀다');

  T('모은다 — 하나라도 막혔으면 막힘', 모은다({ 본지: '열림', CMS: '막힘' }) === '막힘');
  T('모은다 — 둘 다 열렸으면 열림', 모은다({ 본지: '열림', CMS: '열림' }) === '열림');
  T('모은다 — 둘 다 못 쟀으면 못쟀다', 모은다({ 본지: '못쟀다', CMS: '못쟀다' }) === '못쟀다');
  T('모은다 — 하나만 못 쟀으면 나머지로 읽는다', 모은다({ 본지: '열림', CMS: '못쟀다' }) === '열림');
  T('모은다 — 빈 입력에 안 터진다', 모은다(undefined) === '못쟀다');

  /* 🔴 막혀 있는 내내 날마다 보내면 진짜 경보를 죽인다 (2026-11-10 「늑대와 양치기 소년」) */
  T('알림 — 열림에서 막힘으로 바뀌면 알린다', 알려야하나('열림', '막힘'));
  T('알림 — 막힘이 이어지면 «안» 알린다', !알려야하나('막힘', '막힘'));
  T('알림 — 막힘에서 열림으로 풀려도 알린다', 알려야하나('막힘', '열림'));
  T('알림 — 열림이 이어지면 조용하다', !알려야하나('열림', '열림'));
  T('알림 — 못 쟀으면 알리지 않는다', !알려야하나('열림', '못쟀다'));
  T('알림 — 처음 재는데 막혔으면 알린다', 알려야하나(null, '막힘'));
  T('알림 — 처음 재는데 열려 있으면 조용하다', !알려야하나(null, '열림'));

  const 진 = 시험.filter(([, ok]) => !ok);
  for (const [이름] of 진) console.error(`❌ ${이름}`);
  if (진.length) { console.error(`⛔ 자가시험 ${진.length}개 실패`); process.exit(1); }
  console.log(`✅ 잰다-중부매일-아이피막혔나 자가시험 통과 (${시험.length})`);
}

/* ────────────────────────── 실행 ────────────────────────── */
if (process.argv.includes('--자가시험') || process.argv.includes('--selftest')) { 자가시험(); process.exit(0); }

/* ⚠ `--notify` 는 ASCII 별칭이다 — 예약 .cmd 는 한글 인자를 CP949 로 깨뜨린다
   (2026-11-19 에 한글 인자를 올려 결제 알림이 몇 주째 조용히 죽어 있었다) */
const 알린다 = process.argv.includes('--알린다') || process.argv.includes('--notify');
const 판정들 = {};
const 코드들 = {};

for (const [이름, 주소] of 볼곳) {
  let 코드 = null;
  try {
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), 20000);
    const r = await fetch(주소, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'ko-KR,ko;q=0.9' },
      redirect: 'manual',
      signal: ctl.signal,
    });
    clearTimeout(to);
    코드 = r.status;
    try { await r.body?.cancel(); } catch { /* 본문은 안 읽는다 */ }
  } catch { 코드 = null; }
  코드들[이름] = 코드;
  판정들[이름] = 코드를읽는다(코드);
}

const 지금 = 모은다(판정들);
const 시각 = new Date().toLocaleString('ko-KR', { hour12: false });

let 앞 = null;
if (existsSync(대장)) {
  try { 앞 = JSON.parse(readFileSync(대장, 'utf8')).상태 ?? null; } catch { 앞 = null; }
}

const 빛 = { 열림: '✅', 막힘: '🔴', 못쟀다: '⬜' }[지금];
console.log(`${빛} 중부매일 접속 — ${지금}   (${시각})`);
for (const [이름] of 볼곳) {
  console.log(`   ${이름.padEnd(4)} HTTP ${코드들[이름] ?? '(못 받음)'}  →  ${판정들[이름]}`);
}
if (앞) console.log(`   앞선 상태: ${앞}`);

const 보낼까 = 알려야하나(앞, 지금);

/* 🔴 대장은 «메일이 나간 뒤에» 적는다 — 먼저 적으면 발송이 실패해도
   다음 회차가 「안 바뀌었다」로 읽고 조용해진다. 자국이 면죄부가 되는 자리다 */
function 대장에적는다() {
  if (지금 === '못쟀다') return;
  mkdirSync(path.dirname(대장), { recursive: true });
  writeFileSync(대장, JSON.stringify({ 상태: 지금, 시각, 코드들 }, null, 2), 'utf8');
}

if (!보낼까) {
  대장에적는다();
  console.log(알린다 ? '   → 상태가 바뀌지 않았다. 메일을 보내지 않는다.' : '   → 상태가 바뀌지 않았다.');
  process.exit(0);
}

if (!알린다) {
  console.log('   → 상태가 바뀌었다. 메일을 보내려면 --알린다 를 준다.');
  process.exit(0);
}

const 막힘 = 지금 === '막힘';
const 제목 = 막힘
  ? '[중부매일] 접속이 차단되었습니다 — 아이피 차단 해제 요청 필요'
  : '[중부매일] 접속이 복구되었습니다';
const 글 = 막힘
  ? [
    '중부매일 접속이 차단되었습니다.',
    '',
    `측정 시각: ${시각}`,
    ...볼곳.map(([이름]) => `${이름}: HTTP ${코드들[이름] ?? '(응답 없음)'} — ${판정들[이름]}`),
    '',
    '차단된 주소는 사무실 인터넷 회선의 공인 아이피입니다.',
    '업체에 차단 해제를 요청해 주시면 기사 등록과 기사 검색이 다시 가능해집니다.',
    '',
    '차단 중에는 다음이 막힙니다.',
    '- 새 기사 등록',
    '- CMS 기사검색 및 기자별 건수 확인',
    '- 발행된 기사 확인',
    '',
    '예약된 기사의 발행 자체는 영향을 받지 않습니다.',
    '',
    '복구되면 다시 메일로 알려 드리겠습니다.',
  ].join('\n')
  : [
    '중부매일 접속이 복구되었습니다.',
    '',
    `측정 시각: ${시각}`,
    ...볼곳.map(([이름]) => `${이름}: HTTP ${코드들[이름] ?? '(응답 없음)'} — ${판정들[이름]}`),
    '',
    '기사 등록과 기사 검색이 다시 가능합니다.',
  ].join('\n');

const 글자리 = path.resolve('docs/자국/중부매일-접속알림.txt');
mkdirSync(path.dirname(글자리), { recursive: true });
writeFileSync(글자리, `${글}\n`, 'utf8');

try {
  const 결과 = execFileSync(process.execPath, [
    'scripts/send-mail.mjs',
    `--받는곳=${받는곳}`,
    `--제목=${제목}`,
    `--글=${글자리}`,
    '--보낸다',
  ], { encoding: 'utf8', env: { ...process.env, CLAUDE_SEAT: process.env.CLAUDE_SEAT || '5' } });
  console.log(결과.trim().split('\n').slice(-6).join('\n'));
  대장에적는다();
  console.log(`   → 메일을 보냈다: ${제목}`);
} catch (e) {
  console.error('⛔ 메일을 보내지 못했다 —', String(e.message).slice(0, 200));
  console.error('   대장을 갱신하지 않았다 — 다음 회차가 다시 보낸다. 손으로 보내려면:');
  console.error(`   node scripts/send-mail.mjs --받는곳=${받는곳} --제목="${제목}" --글=${글자리} --보낸다`);
  process.exit(1);
}
/* ⚠ Node 26 은 fetch 가 쓴 소켓을 치우다 끝값을 더럽힌다 — 끝을 또렷이 박는다 */
process.exit(0);
