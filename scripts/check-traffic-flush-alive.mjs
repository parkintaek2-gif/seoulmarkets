#!/usr/bin/env node
/**
 * check-traffic-flush-alive.mjs — **유입 집계가 아직 흘러 쓰이고 있나**를 본다.
 *
 * ── 왜 ─────────────────────────────────────────────────────────
 * 🔴🔴 **이 자가 태어난 까닭 자체가 내 오독이었다.** 남겨 둔다 — 다음 사람이 같은 길로 안 가게.
 *
 * 2026-08-22 19:40 KST. 하루치 유입 파일의 `갱신` 이 「**오전 10:26**」이었다.
 * 나는 그것을 KST 로 읽고 「아홉 시간이 안 적혔다 = 계측이 샌다」고 판단했고,
 * **2번과 전 유닛에 그렇게 알렸다.** 틀렸다.
 * ```
 * 서버는 UTC 로 돈다 (TZ 설정이 없다)      → 라이브 헤더: Date: … 10:40:15 GMT
 * 갱신은 그 UTC 시각을 «한국어 꼴»로만 적는다 → 「오전 10:38」 = 19:38 KST
 * 실제 뒤짐은 9시간이 아니라 **9분**이었다
 * ```
 * 못박은 증거: 19:27 KST 에 눌러 둔 `?from=selftest` 딱지가 그 파일에 **이미 들어 있었다.**
 * 안 흘렀다면 있을 수 없다. ⭐ 시각을 다룰 때는 **어느 시계인지 먼저 적는다.**
 *
 * ── 그래도 이 자를 남기는 까닭 ────────────────────────────────
 * 「배포하면 아직 안 흘린 것이 사라진다」는 것은 **참이다**(메모리에 세고 뒤에 쓴다).
 * 다만 잃는 양은 아홉 시간이 아니라 **최대 FLUSH_MS**다. 그 손실을 줄이려고 둘을 고쳤다 —
 * 간격 10분→3분, `server.mjs` 의 종료 신호 흘려쓰기.
 *   ⛔ SIGTERM 은 윈도우에서 JS 까지 오지 않아 내 창에서는 확인이 안 된다.
 *     그래서 **운영에서 재는 자**를 둔다. 이 자다 — 다만 이제 **같은 시계로** 뺀다.
 *
 * ── 무엇을 보나 ───────────────────────────────────────────────
 * 그날치 파일의 `갱신` 이 **지금으로부터 얼마나 뒤졌나**. 많이 뒤졌으면 또 새고 있는 것이다.
 * ⛔ 밤에는 손님이 없어 흘려 쓸 것도 없다 — 요청이 없으면 흘려 쓰기도 안 돈다.
 *   그래서 **하루 요청이 어느 정도 있는 시간대에만** 잰다(기본 09~23시 KST).
 * ⚠ R2 자격이 없으면 「못 쟀다」로 넘어간다. 「샌다」고 말하지 않는다.
 *
 * 쓰는 법  node scripts/check-traffic-flush-alive.mjs --자가시험
 *          node scripts/check-traffic-flush-alive.mjs [--뒤짐한계분=40]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function 환경읽기() {
  try {
    const 본문 = fs.readFileSync(path.join(뿌리, '.env'), 'utf8');
    for (const 줄 of 본문.split(/\r?\n/)) {
      const m = 줄.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  } catch { /* 없으면 그만 */ }
}

/**
 * 한국어 `toLocaleString('ko-KR')` 로 적힌 시각을 분으로 읽는다.
 * 꼴: `2026. 8. 22. 오전 10:26:35`
 * ⛔ `Date.parse` 로 넘기지 않는다 — 이 꼴을 못 읽고 NaN 을 준다(그러면 자가 조용히 통과한다).
 */
export function 적힌시각읽기(글) {
  const m = String(글 ?? '').match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.\s*(오전|오후)\s*(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return null;
  let 시 = Number(m[5]);
  if (m[4] === '오후' && 시 !== 12) 시 += 12;
  if (m[4] === '오전' && 시 === 12) 시 = 0;
  return {
    year: Number(m[1]), month: Number(m[2]), day: Number(m[3]),
    hour: 시, minute: Number(m[6]), second: Number(m[7] ?? 0),
  };
}

/**
 * 두 시각 사이 분. ⚠ 같은 날 안에서만 쓴다(하루치 파일이다).
 *
 * 🔴🔴 2026-08-22 — 이 자를 만들자마자 **549분 뒤졌다**고 울었고, 나는 그걸 믿고
 *   「계측이 샌다」고 2번과 전 유닛에 알렸다. **틀렸다.**
 *   서버는 **UTC** 로 돌고, 파일의 `갱신` 은 그 UTC 시각을 한국어 꼴로만 적은 것이다.
 *   나는 그것을 KST 로 읽어 9시간(540분)을 「뒤짐」으로 셌다. 실제 뒤짐은 9분이었다.
 *   ⭐ **두 시계를 맞추지 않고 뺀 것**이 흠이다. 시각을 다룰 때는 어느 시계인지 먼저 적는다.
 *   ⚠ 확인한 방법: 라이브 응답 헤더 `Date: … 10:40:15 GMT` 와 파일의 「오전 10:38」이 맞고,
 *     같은 순간 KST 는 19:40 이었다. 그리고 19:27 에 누른 딱지가 그 파일에 이미 들어 있었다.
 */
export function 뒤진분(적힌, 지금) {
  if (!적힌) return null;
  const a = 적힌.hour * 60 + 적힌.minute;
  const b = 지금.hour * 60 + 지금.minute;
  return b - a;
}

/** 지금을 **서버 시계(UTC)** 로 준다 — 파일에 적힌 시각과 같은 시계여야 뺄 수 있다 */
export const 지금UTC = (d = new Date()) => ({ hour: d.getUTCHours(), minute: d.getUTCMinutes() });

/** 재도 되는 시간대인가 — 손님이 없는 새벽엔 흘려 쓸 것도 없다 */
export const 잴시간인가 = (시, { 부터 = 9, 까지 = 23 } = {}) => 시 >= 부터 && 시 <= 까지;

if (process.argv.includes('--자가시험')) {
  const 실패 = [];
  /* ⚠ 2026-09-01 — 수를 «재서» 적는다. 손으로 적으면 검사가 빠져도 수가 안 움직인다 */
  let 센것 = 0;
  const 검 = (이름, 참) => { 센것 += 1; if (!참) 실패.push(이름); };

  const t = 적힌시각읽기('2026. 8. 22. 오전 10:26:35');
  검('한국어 시각을 읽는다', t && t.hour === 10 && t.minute === 26 && t.day === 22);
  검('오후를 24시로 바꾼다', 적힌시각읽기('2026. 8. 21. 오후 11:52:40').hour === 23);
  검('오후 12시는 12시다', 적힌시각읽기('2026. 8. 21. 오후 12:05:00').hour === 12);
  검('오전 12시는 0시다', 적힌시각읽기('2026. 8. 21. 오전 12:05:00').hour === 0);
  검('초가 없어도 읽는다', 적힌시각읽기('2026. 8. 21. 오후 1:05').hour === 13);
  검('⛔ 못 읽으면 null (조용히 통과하지 않는다)', 적힌시각읽기('어제') === null);
  검('⛔ 빈 것도 null', 적힌시각읽기('') === null && 적힌시각읽기(null) === null);

  검('뒤진 분을 센다', 뒤진분({ hour: 10, minute: 26 }, { hour: 19, minute: 40 }) === 554);
  검('막 흘려 썼으면 0에 가깝다', 뒤진분({ hour: 19, minute: 38 }, { hour: 19, minute: 40 }) === 2);
  검('⛔ 못 읽은 시각은 null', 뒤진분(null, { hour: 19, minute: 40 }) === null);

  검('낮에는 잰다', 잴시간인가(14) === true);
  검('⛔ 새벽에는 안 잰다', 잴시간인가(4) === false);
  /* 🔴 이 칸이 이 자의 흠을 잡는다 — 두 시계를 맞추지 않고 빼면 9시간이 뒤짐으로 세어진다 */
  검('⭐⭐ 지금을 서버 시계(UTC)로 준다', (() => { const d = new Date(Date.UTC(2026, 7, 22, 10, 38)); const u = 지금UTC(d); return u.hour === 10 && u.minute === 38; })());
  검('⭐ 같은 시계로 빼면 뒤짐이 작다', 뒤진분({ hour: 10, minute: 29 }, 지금UTC(new Date(Date.UTC(2026, 7, 22, 10, 38)))) === 9);
  검('경계를 포함한다', 잴시간인가(9) === true && 잴시간인가(23) === true);

  if (실패.length) { console.error('❌ 자가시험 실패\n' + 실패.map((s) => `   · ${s}`).join('\n')); process.exit(1); }
  console.log(`✅ check-traffic-flush-alive 자가시험 통과 (${센것})`);
  process.exit(0);
}

환경읽기();
const { get, remoteEnabled } = await import(new URL('../src/lib/store.mjs', import.meta.url).href);
if (!remoteEnabled) {
  console.log('⚠ 못 쟀다 — R2 자격이 이 창에 없다. 「샌다」고 말하지 않는다');
  process.exit(0);
}

const 한계 = Number((process.argv.find((a) => a.startsWith('--뒤짐한계분='))?.split('=')[1]) ?? 40);
const 지금 = new Date();
/* ⚠ 파일 이름의 날짜도 **서버 시계(UTC)** 로 정해진다 — 그래서 여기서도 UTC 로 만든다 */
const 날 = `${지금.getUTCFullYear()}${String(지금.getUTCMonth() + 1).padStart(2, '0')}${String(지금.getUTCDate()).padStart(2, '0')}`;

if (!잴시간인가(지금.getUTCHours() + 9 > 23 ? 지금.getUTCHours() + 9 - 24 : 지금.getUTCHours() + 9)) {
  console.log('⚠ 못 쟀다 — 지금은 손님이 없는 시간대다(KST 기준). 흘려 쓸 것도 없다');
  process.exit(0);
}

const raw = await get(`raw/traffic/${날}.json`);
if (!raw) {
  console.log(`❌ 오늘치(${날})가 R2 에 아예 없다 — 흘려 쓰기가 한 번도 안 돌았다`);
  process.exit(1);
}
const j = JSON.parse(Buffer.isBuffer(raw) ? raw.toString('utf8') : String(raw));
const 적힌 = 적힌시각읽기(j.갱신);
if (!적힌) {
  console.log(`❌ 갱신 시각을 못 읽었다 — «${j.갱신}». 자가 이 꼴을 모르면 조용히 통과한다`);
  process.exit(1);
}
const 뒤짐 = 뒤진분(적힌, 지금UTC(지금));   /* ⭐ 같은 시계(UTC)로 뺀다 */

/* 🔴 [2026-10-11 12:0x · 5번] **이 줄에 속았다 — 어느 시계인지 안 적혀 있었다.**
   화면에 「마지막 갱신 2026. 10. 11. 오전 3:03:34」가 뜨는데 그때 한국은 «낮 12시»였다.
   나는 아홉 시간 멎은 줄 알고 들여다봤다. 속은 멀쩡했다 — 위 `뒤진분` 이 UTC 끼리 바르게 뺀다.
   ⭐ 이 파일 머리에 2026-08-22 의 교훈이 적혀 있다 — 「시각을 다룰 때는 어느 시계인지 먼저 적는다」.
     그 교훈을 «셈»에는 넣었는데 «화면»에는 안 넣었다. 화면도 사람이 읽는 자리다.
   ⛔ 적힌 값을 KST 로 고쳐 적지 않는다 — 그것은 서버가 적은 글이고, 바꾸면 원본과 어긋난다.
     어느 시계인지 밝히고, 한국시간을 «옆에» 함께 적는다. */
const KST로 = (t) => {
  if (!t) return '못 읽음';
  const ms = Date.UTC(t.year, t.month - 1, t.day, t.hour, t.minute, t.second) + 9 * 60 * 60 * 1000;
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
};
console.log(`유입 흘려쓰기 검사 — 오늘치 ${날}`);
console.log(`  마지막 갱신 ${j.갱신}  ← **서버 시계(UTC)** 다. 한국시간이 아니다`);
console.log(`               한국시간으로는 ${KST로(적힌)} 다`);
console.log(`  지금과의 차 ${뒤짐}분 (한계 ${한계}분) — 같은 시계(UTC)끼리 뺀 것이다`);
if (뒤짐 > 한계) {
  console.log(`❌ ${뒤짐}분 뒤졌다 — 세던 것이 또 새고 있다`);
  console.log('   ⭐ 볼 곳 둘: traffic.mjs 의 FLUSH_MS · server.mjs 의 종료 신호 흘려쓰기.');
  console.log('   ⚠ 배포가 잦은 날 이 자가 먼저 운다. 그게 이 자를 만든 까닭이다.');
  process.exit(1);
}
console.log('✅ 유입 집계가 흘러 쓰이고 있다');
