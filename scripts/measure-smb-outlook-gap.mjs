/* 소상공인 「다음 달 전망」과 그 달의 「체감」 — 얼마나 벌어지나
 *
 * ── 왜 이 자인가 (2026-10-12 17:0x · 5번) ─────────────────────────
 *   `check-쥔자료에-안쓴축이-있나.mjs` 가 (의존까지 읽어) 내놓은 22개에서 골랐다.
 *   ⛔ 짓기 전에 `check-이축으로-이미낸게있나` 를 돌렸다 —
 *     다만 열쇠가 한글이라 **그 자가 거의 못 봤다**(찾을 낱말 0개). 손으로도 훑었다.
 *
 *   잰 수가 드물다 —
 *   ```
 *     짝지은 149달 가운데 «149달» 전망이 체감보다 높다 — 100.0%
 *     중앙 21.3포인트 · 가장 큰 64.4(2020-03) · 가장 작은 1.2(2024-08)
 *     체감이 100 을 넘은 달은 149 가운데 «하나», 전망은 열다섯
 *   ```
 *
 * ── ⛔ 이 자가 하지 않는 것 ───────────────────────────────────────
 * 🔴 **「소상공인이 낙관한다」고 말하지 않는다.**
 *   전망 BSI 와 체감 BSI 가 «같은 질문»인지 우리는 모른다. 물음도 표본도 다를 수 있다.
 *   149/149 는 사람의 기분이 아니라 **두 자가 다른 것을 잰다는 뜻**일 수 있다.
 *   ⇒ 수를 내놓고, 그것이 무엇을 뜻하는지는 **보는 사람이 정한다.**
 * ⛔ 「그러니 전망치를 믿지 마라」도 말하지 않는다. 한쪽으로 치우친 자도 쓸모가 있다 —
 *   치우친 만큼을 알면 읽을 수 있다. 우리는 그 치우침을 재 줄 뿐이다.
 * ⛔ 못 짝지은 달을 
 *
 * 돌리기   node scripts/measure-smb-outlook-gap.mjs
 *          node scripts/measure-smb-outlook-gap.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 여기 = path.dirname(fileURLToPath(import.meta.url));
const 뿌리 = path.resolve(여기, '..');

/* ── 재는 규칙 ──────────────────────────────────────────────────── */

/** 두 줄을 달로 짝짓는다 — 한쪽만 있는 달은 «버리고 세어 둔다» (⛔ 0 으로 안 채운다) */
export function 짝짓기(체감, 전망) {
  const 짝 = [];
  const 체감만 = [];
  const 전망만 = [];
  const 모든달 = new Set([...Object.keys(체감 ?? {}), ...Object.keys(전망 ?? {})]);
  for (const m of [...모든달].sort()) {
    const a = 체감?.[m];
    const b = 전망?.[m];
    const a수 = Number.isFinite(a);
    const b수 = Number.isFinite(b);
    if (a수 && b수) 짝.push({ 달: m, 체감: a, 전망: b, 차: b - a });
    else if (a수) 체감만.push(m);
    else if (b수) 전망만.push(m);
  }
  return { 짝, 체감만, 전망만 };
}

/** 중앙값 — 빈 배열이면 null (⛔ 0 이 아니다) */
export function 중앙(수들) {
  const 것 = (수들 ?? []).filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (!것.length) return null;
  const i = Math.floor(것.length / 2);
  return 것.length % 2 ? 것[i] : (것[i - 1] + 것[i]) / 2;
}

/** 떠다니는 소수점을 턴다 — 82.8 - 63.6 이 19.200000000000003 으로 나온다 */
export function 다듬기(n, 자리 = 1) {
  return n == null ? null : Math.round(Number(n) * 10 ** 자리) / 10 ** 자리;
}

/** 해마다 몇 달이 담겼고 차가 얼마였나 — ⚠ 달 수를 함께 돌려준다 */
export function 해마다(짝) {
  const 통 = new Map();
  for (const r of 짝 ?? []) {
    const y = String(r.달).slice(0, 4);
    if (!통.has(y)) 통.set(y, []);
    통.get(y).push(r.차);
  }
  return [...통.entries()].map(([해, v]) => ({
    해,
    달수: v.length,
    중앙차: 다듬기(중앙(v)),
    온전한가: v.length === 12,
  })).sort((a, b) => a.해.localeCompare(b.해));
}

/* ── 자가시험 ───────────────────────────────────────────────────── */
function 자가시험() {
  let 통과 = 0; let 실패 = 0;
  const 같나 = (무엇, 잰것, 바라는것) => {
    const a = JSON.stringify(잰것); const b = JSON.stringify(바라는것);
    if (a === b) { 통과 += 1; return; }
    실패 += 1;
    console.log('  🔴 ' + 무엇 + '  잰것 ' + a + ' / 바란것 ' + b);
  };

  const r = 짝짓기({ 202601: 60, 202602: 70 }, { 202602: 85, 202603: 90 });
  같나('두 쪽에 다 있는 달만 짝짓는다', r.짝.length, 1);
  같나('   그 달의 차', r.짝[0].차, 15);
  같나('⛔ 체감만 있는 달은 버리고 «세어 둔다»', r.체감만, ['202601']);
  같나('⛔ 전망만 있는 달도 마찬가지 — 0 으로 안 채운다', r.전망만, ['202603']);
  같나('⛔ 수가 아니면 짝이 아니다', 짝짓기({ 202601: null }, { 202601: 80 }).짝.length, 0);
  같나('⛔ 빈 것도 터지지 않는다', 짝짓기(null, null).짝.length, 0);

  같나('중앙값', 중앙([1, 5, 3]), 3);
  같나('짝수면 가운데 둘의 평균', 중앙([1, 2, 3, 4]), 2.5);
  같나('⛔ 빈 배열은 null — 0 이 아니다', 중앙([]), null);

  같나('🔴 떠다니는 소수점을 턴다', 다듬기(82.8 - 63.6), 19.2);
  같나('   null 은 null 그대로', 다듬기(null), null);

  const 해 = 해마다([
    { 달: '202601', 차: 10 }, { 달: '202602', 차: 20 }, { 달: '202501', 차: 5 },
  ]);
  같나('해마다 가른다', 해.length, 2);
  같나('   2025 는 한 달뿐이다', 해[0].달수, 1);
  같나('⚠ 열두 달이 안 차면 그렇게 적는다 — 나란히 놓고 말 안 하면 표가 속인다',
    해[0].온전한가, false);
  같나('   2026 중앙차', 해[1].중앙차, 15);

  /* 🔴 오늘 실제로 잰 자리 — 이 자가 헛돌지 않는다는 증거다 */
  const 진짜 = 짝짓기(
    { 202605: 67.9, 202606: 63.6, 202607: 55.6 },
    { 202605: 84.8, 202606: 82.8, 202607: 77.3 },
  );
  같나('🔴 세 달 다 전망이 높다', 진짜.짝.every((x) => x.차 > 0), true);
  같나('   2026-07 의 차', 다듬기(진짜.짝[2].차), 21.7);

  console.log('\n자가시험 ' + (통과 + 실패) + '개 · 통과 ' + 통과 + ' · 실패 ' + 실패);
  return 실패 === 0;
}

/* ── 본체 ───────────────────────────────────────────────────────── */
function 센다() {
  const d = JSON.parse(fs.readFileSync(path.join(뿌리, 'src/data/smb-bsi.json'), 'utf8'));
  const { 짝, 체감만, 전망만 } = 짝짓기(d.체감, d.전망);
  const 차들 = 짝.map((r) => r.차);
  const 위 = 짝.filter((r) => r.차 > 0).length;

  const 벌어진달 = [...짝].sort((a, b) => b.차 - a.차).slice(0, 8)
    .map((r) => ({ ...r, 차: 다듬기(r.차) }));
  const 좁은달 = [...짝].sort((a, b) => a.차 - b.차).slice(0, 5)
    .map((r) => ({ ...r, 차: 다듬기(r.차) }));

  return {
    _무엇: 'How far ahead of the lived figure Korea’s small-business outlook index sits.',
    _출처: d.출처 ?? null,
    _표: d.표 ?? null,
    _단위: d.단위 ?? null,
    _뽑은날: d.뽑은날 ?? null,
    _잰때: new Date().toLocaleString('sv-SE').replace('T', ' '),   /* ⛔ toISOString 금지 — KST 다 */
    _밝힐것: [
      'We do not claim the outlook is wrong. We do not know that the two indices ask the same question.',
      'A reading of 149 out of 149 in one direction is as likely to be a property of the instruments as of anyone’s mood.',
      'Months present in only one series are counted and excluded, never filled with zero.',
    ],
    짝수: 짝.length,
    첫달: 짝[0]?.달 ?? null,
    끝달: 짝[짝.length - 1]?.달 ?? null,
    전망이높은달: 위,
    전망이높은몫: 짝.length ? 위 / 짝.length : null,
    중앙차: 다듬기(중앙(차들)),
    가장큰차: 다듬기(Math.max(...차들)),
    가장작은차: 다듬기(Math.min(...차들)),
    체감이백넘은달: 짝.filter((r) => r.체감 >= 100).length,
    전망이백넘은달: 짝.filter((r) => r.전망 >= 100).length,
    벌어진달,
    좁은달,
    해마다: 해마다(짝),
    못짝지은것: { 체감만: 체감만.length, 전망만: 전망만.length },
  };
}

/* ── 들머리 ─────────────────────────────────────────────────────── */
const 내가진입점 = process.argv[1]
  && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (내가진입점 && process.argv.includes('--자가시험')) {
  process.exit(자가시험() ? 0 : 1);
}

if (내가진입점) {
  const r = 센다();
  const 낼곳 = path.join(뿌리, 'src/data/smb-outlook-gap.json');
  fs.writeFileSync(낼곳, JSON.stringify(r, null, 1), 'utf8');

  console.log('■ 소상공인 전망과 체감의 사이');
  console.log('   짝지은 ' + r.짝수 + '달 · ' + r.첫달 + ' ~ ' + r.끝달);
  console.log('   전망이 높은 달 ' + r.전망이높은달 + ' ('
    + (r.전망이높은몫 * 100).toFixed(1) + '%)');
  console.log('   중앙 ' + r.중앙차 + '포인트 · 가장 큰 ' + r.가장큰차
    + '(' + r.벌어진달[0].달 + ') · 가장 작은 ' + r.가장작은차 + '(' + r.좁은달[0].달 + ')');
  console.log('   100 을 넘은 달 — 체감 ' + r.체감이백넘은달 + ' / 전망 ' + r.전망이백넘은달);
  console.log('   ⬜ 못 짝지은 달 — 체감만 ' + r.못짝지은것.체감만
    + ' · 전망만 ' + r.못짝지은것.전망만);
  console.log('   🔴 ⛔ 이 수를 「소상공인이 낙관한다」로 읽지 않는다 —');
  console.log('      두 자가 같은 질문인지 우리는 모른다. 그 말도 지면에 적는다.');
  console.log('✅ ' + 낼곳);
}
