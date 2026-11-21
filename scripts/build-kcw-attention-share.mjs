#!/usr/bin/env node
/**
 * build-kcw-attention-share.mjs — **한국 팀 774개 사이에서 관심이 얼마나 쏠려 있나**
 * ─────────────────────────────────────────────────────────────────────────────
 * [왜 이 축인가 · 2026-09-08 5번]
 *   오늘 커뮤니티 씨앗(인벤, 댓글 20): 「비인기 아이돌은 행사할때마다 적자라고 말하는 이유」
 *   ⛔ 우리는 «행사 수익»을 못 잰다. 그것을 잰 척하지 않는다.
 *   ✅ 잴 수 있는 것은 하나다 — **관심이 어떤 모양으로 퍼져 있나.**
 *     그 모양이, 저 물음이 «왜 생기는지»를 설명한다. 돈을 말하지 않고.
 *
 * [그물을 안 던진다]
 *   이미 받아 둔 두 벌을 다시 «센다». 새 우물을 파지 않는다 —
 *   · `kcw-group-afterlife.json`  774팀 · 2026-08 한 달 열람 (본판)
 *   · `kcw-member-vs-group.json`  380팀 · 12개월 열람  (검산판)
 *
 * ⭐ 두 벌은 **창도 다르고 팀 수도 다르고 받은 자도 다르다.** 그런데 같은 쏠림이 나오면
 *   그것은 한 벌의 버릇이 아니다. 그래서 이 자는 둘을 «나란히» 낸다.
 *
 * ⛔ 열람을 「인기」로 바꿔 쓰지 않는다. 열람은 «찾아본 횟수»다.
 * ⛔ 열람을 돈으로 바꿔 쓰지 않는다. 우리는 표값도 행사비도 모른다.
 * ⛔ 못 잰 팀을  — 앞자료가 이미 73팀을 뺐고, 그 수를 그대로 이고 간다.
 *
 * [쓰는 법]
 *   node scripts/build-kcw-attention-share.mjs --시험만     셈만 (파일 안 읽는다)
 *   node scripts/build-kcw-attention-share.mjs              세기만 하고 안 쓴다
 *   node scripts/build-kcw-attention-share.mjs --적는다      src/data/kcw-attention-share.json
 */

const 아는깃발 = new Set(['--시험만', '--적는다']);
{
  const 모르는것 = process.argv.slice(2).filter((a) => a.startsWith('--') && !아는깃발.has(a));
  if (모르는것.length) {
    console.error(`⛔ 모르는 깃발입니다: ${모르는것.join(' ')}`);
    console.error(`   아는 깃발: ${[...아는깃발].join(' · ')}`);
    process.exit(2);
  }
}

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 본판길 = path.join(ROOT, 'src', 'data', 'kcw-group-afterlife.json');
const 검산길 = path.join(ROOT, 'src', 'data', 'kcw-member-vs-group.json');
const 나갈것 = path.join(ROOT, 'src', 'data', 'kcw-attention-share.json');

/* ── 셈 (순수 함수 · 자가시험 대상) ───────────────────────────────────── */

/** 🔴 `Number(null)` 은 0 이다. 못 잰 것을 0 으로 삼지 않으려고 이 자를 둔다 */
export function 잰수인가(v) {
  if (v === null || v === undefined || v === '') return false;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0;
}

/** 위쪽 n 개가 전체의 몇 몫인가. n 이 팀 수보다 크면 null — 없는 것을 세지 않는다 */
export function 위쪽몫(내림차순, n) {
  if (!Array.isArray(내림차순) || !Number.isInteger(n) || n < 1) return null;
  if (n > 내림차순.length) return null;
  const 합 = 내림차순.reduce((a, b) => a + b, 0);
  if (!(합 > 0)) return null;
  return Number((내림차순.slice(0, n).reduce((a, b) => a + b, 0) / 합).toFixed(6));
}

/**
 * 「위에서 몇 팀이 절반을 가지나」.
 * ⭐ 이것이 이 지면의 가장 읽기 쉬운 수다 — 지니보다 먼저 낸다.
 */
export function 절반가지는수(내림차순) {
  if (!Array.isArray(내림차순) || !내림차순.length) return null;
  const 합 = 내림차순.reduce((a, b) => a + b, 0);
  if (!(합 > 0)) return null;
  let 누 = 0;
  for (let i = 0; i < 내림차순.length; i++) {
    누 += 내림차순[i];
    if (누 >= 합 / 2) return i + 1;
  }
  return 내림차순.length;
}

/** 아래쪽 절반이 다 합쳐 몇 몫인가. 팀 수가 홀수면 가운데는 «아래»에 넣는다 */
export function 아래절반몫(내림차순) {
  if (!Array.isArray(내림차순) || 내림차순.length < 2) return null;
  const 합 = 내림차순.reduce((a, b) => a + b, 0);
  if (!(합 > 0)) return null;
  const 시작 = Math.floor(내림차순.length / 2);
  return Number((내림차순.slice(시작).reduce((a, b) => a + b, 0) / 합).toFixed(6));
}

/**
 * 지니 — 0 이면 모든 팀이 똑같이 읽히고, 1 이면 한 팀이 다 가져간다.
 * ⚠ 이 말을 지면에 «그대로» 적는다. 「불평등 지수」라고만 쓰면 손님이 뜻을 모른다.
 */
export function 지니(수들) {
  if (!Array.isArray(수들) || 수들.length < 2) return null;
  const s = 수들.filter((x) => 잰수인가(x)).map(Number).sort((a, b) => a - b);
  if (s.length < 2) return null;
  const n = s.length;
  const 합 = s.reduce((a, b) => a + b, 0);
  if (!(합 > 0)) return null;
  let 쌓 = 0;
  for (let i = 0; i < n; i++) 쌓 += (2 * (i + 1) - n - 1) * s[i];
  return Number((쌓 / (n * 합)).toFixed(4));
}

/** 한 벌을 다 재서 한 덩이로 */
export function 한벌재기(값들, 볼자리 = [1, 3, 5, 10, 20, 50, 100, 200]) {
  if (!Array.isArray(값들)) return null;
  const 성한 = 값들.filter((x) => 잰수인가(x)).map(Number);
  if (성한.length < 2) return null;
  const 내림 = [...성한].sort((a, b) => b - a);
  const 합 = 내림.reduce((a, b) => a + b, 0);
  const 가운데 = 내림[Math.floor(내림.length / 2)];
  return {
    팀수: 내림.length,
    합,
    위쪽몫: 볼자리.map((n) => ({ n, 몫: 위쪽몫(내림, n) })).filter((x) => x.몫 !== null),
    절반가지는팀수: 절반가지는수(내림),
    절반가지는비율: (() => { const k = 절반가지는수(내림); return k === null ? null : Number((k / 내림.length).toFixed(6)); })(),
    아래절반몫: 아래절반몫(내림),
    가운데팀열람: 가운데,
    가운데팀몫: 합 > 0 ? Number((가운데 / 합).toFixed(8)) : null,
    지니: 지니(성한),
  };
}

/* ── 자가시험 ─────────────────────────────────────────────────────────── */

let 걸린것 = 0;
const 본다 = (무엇, 참) => { if (!참) { console.error(`  🔴 ${무엇}`); 걸린것++; } };

function 자가시험() {
  본다('null 은 잰 수가 아니다', 잰수인가(null) === false);
  본다('빈 글자는 잰 수가 아니다', 잰수인가('') === false);
  본다('0 은 잰 수다', 잰수인가(0) === true);

  본다('하나뿐이면 위쪽 1 이 전부', 위쪽몫([5], 1) === 1);
  본다('고르면 위쪽 1 이 4분의 1', 위쪽몫([1, 1, 1, 1], 1) === 0.25);
  본다('팀 수보다 크면 null', 위쪽몫([1, 2], 5) === null);
  본다('합이 0 이면 null', 위쪽몫([0, 0], 1) === null);
  본다('n 이 0 이면 null', 위쪽몫([1, 2], 0) === null);

  본다('한 팀이 다 가지면 1팀', 절반가지는수([100, 0, 0, 0]) === 1);
  본다('고르면 절반이 절반을 가진다', 절반가지는수([1, 1, 1, 1]) === 2);
  본다('빈 것은 null', 절반가지는수([]) === null);

  본다('고르면 아래절반이 절반', 아래절반몫([1, 1, 1, 1]) === 0.5);
  본다('한 팀이 다 가지면 아래절반은 0', 아래절반몫([100, 0, 0, 0]) === 0);
  본다('하나뿐이면 null', 아래절반몫([1]) === null);

  본다('고르면 지니 0', 지니([1, 1, 1, 1]) === 0);
  본다('한 팀이 다 가지면 지니가 1 에 가깝다', 지니([100, 0, 0, 0]) >= 0.74);
  본다('하나뿐이면 null', 지니([1]) === null);
  본다('전부 0 이면 null', 지니([0, 0, 0]) === null);
  본다('못 잰 것을 0 으로 안 센다', 지니([1, 1, null, 1]) === 0);

  {
    const r = 한벌재기([10, 5, 3, 2]);
    본다('한벌재기가 돈다', r !== null);
    본다('팀수를 센다', r.팀수 === 4);
    본다('합을 센다', r.합 === 20);
    본다('위쪽 1 은 50%', r.위쪽몫[0].몫 === 0.5);
    본다('팀 수보다 큰 자리는 뺀다', r.위쪽몫.every((x) => x.n <= 4));
    본다('절반은 한 팀이 가진다', r.절반가지는팀수 === 1);
  }
  본다('배열이 아니면 null', 한벌재기(null) === null);
  본다('둘 미만이면 null', 한벌재기([5]) === null);

  if (걸린것) { console.error(`\n🔴 자가시험 ${걸린것}가지 걸렸다`); process.exit(1); }
  console.log('✅ 자가시험 24가지 통과');
}

/* ── 주된 일 ──────────────────────────────────────────────────────────── */

function 이제() {
  const d = new Date();                       // ⭐ 이 PC 는 이미 KST 다
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())} KST`;
}

function 주된일() {
  자가시험();
  if (process.argv.includes('--시험만')) return;

  for (const 길 of [본판길, 검산길]) {
    if (!fs.existsSync(길)) { console.error(`⛔ ${path.relative(ROOT, 길)} 가 없다`); process.exit(1); }
  }
  const 앞 = JSON.parse(fs.readFileSync(본판길, 'utf8'));
  const 뒤 = JSON.parse(fs.readFileSync(검산길, 'utf8'));

  /* ⚠ 본판이 «같은 달»을 재고 있는지 먼저 본다. 달이 섞이면 쏠림이 아니라 잡탕이다 */
  const 달들 = new Set(앞.팀.map((t) => t.요즘달));
  if (달들.size !== 1) {
    console.error(`⛔ 요즘달이 ${달들.size} 가지다 — 한 달이 아니면 쏠림을 못 잰다: ${[...달들].join(', ')}`);
    process.exit(1);
  }
  const 잰달 = [...달들][0];

  const 본 = 한벌재기(앞.팀.map((t) => t.요즘열람));
  const 검 = 한벌재기(뒤.팀.map((t) => t.팀열람));
  if (!본 || !검) { console.error('⛔ 한쪽을 못 쟀다'); process.exit(1); }

  const 위 = [...앞.팀].filter((t) => 잰수인가(t.요즘열람))
    .sort((a, b) => b.요즘열람 - a.요즘열람).slice(0, 25)
    .map((t, i) => ({
      자리: i + 1, 이름: t.이름, 제목: t.제목, q: t.q,
      열람: Number(t.요즘열람),
      몫: Number((Number(t.요즘열람) / 본.합).toFixed(6)),
      데뷔해: Number.isFinite(t.데뷔해) ? t.데뷔해 : null,
    }));

  const 낼것 = {
    잰때: 이제(),
    잰달,
    우물: [
      `Main count — ${앞.셈.잰팀} Korean acts, English Wikipedia reads in the single month ${잰달}. Re-counted from kcw-group-afterlife.json; no new collection.`,
      `Check count — ${뒤.팀.length} acts, act-page reads over the twelve months ${뒤.창}. Re-counted from kcw-member-vs-group.json; a different act set, a different window, a different collector.`,
    ],
    이것이무엇인가: 'How unevenly English Wikipedia reading is spread across Korean music acts.',
    이것이아닌것: [
      'It is not a measure of popularity. A read is somebody looking a name up, which is not the same as liking, buying a ticket, or streaming.',
      'It is not a measure of money. We hold no fee, ticket or revenue data for any act on this page and make no claim about any act\'s finances.',
      'It is not a ranking of quality, and an act low on this list is not being called unsuccessful. The shape of the whole is the point, not any one row.',
      'Acts whose reading could not be retrieved are left out, not counted as zero. The main count already dropped ' + 앞.셈.못잰팀 + ' of ' + 앞.셈.받은팀 + ' acts for that reason.',
    ],
    선: {
      지니뜻: '0 would mean every act is read exactly as much as every other. 1 would mean a single act takes all of it.',
      아래절반: 'With an odd number of acts the middle act is counted in the lower half.',
      절반가지는수: 'Counting down from the most-read act until the running total first reaches half of everything.',
    },
    본판: 본,
    검산판: 검,
    /* ⭐ 두 벌이 얼마나 맞는가를 «지면이 다시 셀 수 있게» 자료에 둔다 */
    두벌견줌: 본.위쪽몫.map((x) => {
      const 짝 = 검.위쪽몫.find((y) => y.n === x.n);
      return 짝 ? { n: x.n, 본판몫: x.몫, 검산판몫: 짝.몫, 차이: Number(Math.abs(x.몫 - 짝.몫).toFixed(6)) } : null;
    }).filter(Boolean),
    위쪽스물다섯: 위,
    앞자료: {
      본판잰때: 앞.잰때, 본판창: 앞.창, 본판받은팀: 앞.셈.받은팀, 본판못잰팀: 앞.셈.못잰팀,
      검산판잰때: 뒤.잰때, 검산판창: 뒤.창,
    },
  };

  console.log(`\n=== 본판 · ${본.팀수}팀 · ${잰달} 한 달 ===`);
  console.log(`  한 달 열람 합 ${본.합.toLocaleString('en-US')}`);
  for (const x of 본.위쪽몫) console.log(`  상위 ${String(x.n).padStart(3)}팀 → ${(x.몫 * 100).toFixed(1)}%`);
  console.log(`  ⭐ 절반을 가지는 팀 ${본.절반가지는팀수}개 = 전체의 ${(본.절반가지는비율 * 100).toFixed(1)}%`);
  console.log(`  ⭐ 아래쪽 절반(${Math.ceil(본.팀수 / 2)}팀)이 다 합쳐 ${(본.아래절반몫 * 100).toFixed(1)}%`);
  console.log(`  가운데 팀 ${본.가운데팀열람.toLocaleString('en-US')}회 = 전체의 ${(본.가운데팀몫 * 100).toFixed(4)}%`);
  console.log(`  지니 ${본.지니}`);

  console.log(`\n=== 검산판 · ${검.팀수}팀 · 12개월 · 다른 수집기 ===`);
  for (const x of 낼것.두벌견줌) {
    console.log(`  상위 ${String(x.n).padStart(3)}팀 → 본판 ${(x.본판몫 * 100).toFixed(1)}% · 검산 ${(x.검산판몫 * 100).toFixed(1)}%`
      + `  (차이 ${(x.차이 * 100).toFixed(1)}점)`);
  }
  console.log(`  지니 본판 ${본.지니} · 검산 ${검.지니}`);

  if (!process.argv.includes('--적는다')) { console.log('\n⬜ 세기만 했다. 쓰려면 --적는다'); return; }
  fs.writeFileSync(나갈것, JSON.stringify(낼것, null, 2) + '\n', 'utf8');
  console.log(`\n✅ 적었다 — ${path.relative(ROOT, 나갈것)}`);
}

/* 🔴 불러 쓸 때 본문이 돌면 안 된다 — 2026-09-07 에 그 결함으로 한 자가 남의 자료를 덮었다 */
const 내가직접돌았나 = (() => {
  try { return process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]); }
  catch { return false; }
})();

if (내가직접돌았나) {
  try { 주된일(); } catch (e) { console.error('🔴', e.message); process.exit(1); }
}
