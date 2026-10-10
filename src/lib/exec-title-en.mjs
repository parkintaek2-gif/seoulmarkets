/**
 * exec-title-en.mjs — **한국 임원 직위를 영문으로.**
 *
 * ── 🔴 왜 (2026-10-10 22:0x · 5번) ──────────────────────────────────
 * 회사 지면에 대표이사를 넣으려고 자료를 만들었더니 직위가 **한국어**였다 —
 * 「대표이사」·「대표이사 사장」·「각자 대표이사」. 영문 매체에 그대로 내면
 * 손님이 못 읽고 「라이브가 네 말로 나가나」 검사에도 걸린다.
 *
 * ⭐ 그리고 이 지면이 노리는 질의가 **「who is the ceo of …」** 다.
 *   그러니 **CEO 라는 말이 지면에 있어야** 그 질의에 맞는다.
 *   공식 영문 표기는 Representative Director 이므로 **둘을 함께** 적는다.
 *
 * ── ⛔ 이 자가 지키는 것 ────────────────────────────────────────────
 * ⛔ **모르는 직위는 null 이다.** 짐작해서 옮기지 않는다
 *   (`sector-en.mjs` 가 지키는 것과 같은 규칙이다).
 * ⚠ 자료의 직위에는 **공백이 제멋대로** 들어 있다 — 「대표 이사」·「대표이사사장」·
 *   「대표이사 사 장」이 다 같은 말이다. 그래서 공백을 모두 지우고 맞춘다.
 * ⚠ 조합이 많아 통짜 표로는 안 된다(179가지). **긴 조각부터 떼어 가며** 푼다.
 *
 * 쓰는 법
 *   import { 직위영문 } from '../lib/exec-title-en.mjs';
 *   직위영문('대표이사 사장')  →  'Representative Director (CEO), President'
 *   node src/lib/exec-title-en.mjs --자가시험
 */

/**
 * 조각 사전 — **긴 것부터** 적는다. 앞에서부터 떼어 내므로 차례가 뜻을 가른다.
 * ⚠ 「대표이사」가 「대표」·「이사」보다 먼저 와야 한다.
 */
export const 조각 = [
  ['공동대표이사', 'Co-Representative Director (CEO)'],
  ['각자대표이사', 'Representative Director (CEO)'],
  ['대표이사', 'Representative Director (CEO)'],
  ['사내이사', 'Inside Director'],
  ['사외이사', 'Outside Director'],
  ['부회장', 'Vice Chairman'],
  ['부사장', 'Executive Vice President'],
  ['회장', 'Chairman'],
  ['사장', 'President'],
  ['전무', 'Senior Managing Director'],
  ['상무', 'Managing Director'],
  ['대표', 'Representative'],
  ['은행장', 'President (Bank)'],
  ['행장', 'President (Bank)'],
  ['이사', 'Director'],
  ['감사', 'Auditor'],
  ['고문', 'Advisor'],
  ['의장', 'Chairperson'],
  /* ⚠ 상근 여부는 따로 담는 칸(fullTime)이 있다. 직위 글에 섞여 들어오면 여기서 받는다 */
  ['비상근', 'non-standing'],
  ['상근', 'standing'],
];

/**
 * 직위 한 벌을 영문으로.
 * @returns {string|null} 못 옮기면 null — 짐작해서 채우지 않는다
 */
export function 직위영문(직위) {
  /* ⚠ 공백·쉼표·괄호·빗금을 걷어 낸다.
     자료에 「대표이사 (사장)」·「사장, 대표이사」·「대표이사/사장」이 섞여 있다 */
  const s = String(직위 ?? '').replace(/[\s,·ㆍ()[\]/、]/g, '');
  if (!s) return null;

  const 난것 = [];
  let 남은 = s;
  let 돌이 = 0;
  while (남은 && 돌이++ < 20) {
    const 맞는것 = 조각.find(([ko]) => 남은.startsWith(ko));
    if (!맞는것) break;                       /* ⛔ 모르는 글자가 남으면 거기서 멈춘다 */
    if (!난것.includes(맞는것[1])) 난것.push(맞는것[1]);
    남은 = 남은.slice(맞는것[0].length);
  }
  /* ⛔ 한 조각도 못 떼었거나 모르는 글자가 남았으면 **옮기지 않는다** */
  if (!난것.length || 남은) return null;
  return 난것.join(', ');
}

/* ── 자가시험 ─────────────────────────────────────────────────── */
async function 자가시험() {
  let 통 = 0; let 탈 = 0;
  const 검 = (이름, 참, 덧 = '') => { if (참) { 통++; console.log('✅', 이름, 덧); } else { 탈++; console.log('🔴', 이름, 덧); } };

  검('🔴 대표이사에 CEO 가 들어간다 — 이 지면이 노리는 질의가 「who is the ceo of」다',
    직위영문('대표이사') === 'Representative Director (CEO)');
  검('사장', 직위영문('사장') === 'President');
  검('회장', 직위영문('회장') === 'Chairman');
  검('부회장 — 「부」를 떼고 회장으로 읽지 않는다', 직위영문('부회장') === 'Vice Chairman');
  검('부사장', 직위영문('부사장') === 'Executive Vice President');

  /* 🔴 공백이 제멋대로다 — 자료에 실제로 이렇게 들어 있다 */
  검('🔴 「대표 이사」(공백 낀 것)도 같은 말이다', 직위영문('대표 이사') === 'Representative Director (CEO)');
  검('🔴 「대표이사 사 장」도 푼다',
    직위영문('대표이사 사 장') === 'Representative Director (CEO), President');
  검('🔴 「대표이사사장」(붙은 것)도 같다',
    직위영문('대표이사사장') === 'Representative Director (CEO), President');
  검('🔴 괄호가 끼어도 푼다', 직위영문('대표이사 (사장)') === 'Representative Director (CEO), President');
  검('🔴 쉼표가 끼어도 푼다', 직위영문('사장, 대표이사') === 'President, Representative Director (CEO)');

  검('공동대표이사 — 「공동」을 버리지 않는다',
    직위영문('공동대표이사') === 'Co-Representative Director (CEO)');
  검('각자 대표이사', 직위영문('각자 대표이사') === 'Representative Director (CEO)');
  검('⛔ 같은 말을 두 번 적지 않는다', 직위영문('대표이사 대표이사') === 'Representative Director (CEO)');

  /* ⛔ 지어내지 않는 자리 */
  검('⛔ 빈 것은 null', 직위영문('') === null && 직위영문(null) === null);
  검('⛔ 모르는 직위는 null — 짐작해서 옮기지 않는다', 직위영문('최고행복책임자') === null);
  검('🔴 아는 조각 뒤에 모르는 글자가 남으면 null — 반쪽을 내지 않는다',
    직위영문('대표이사겸무엇무엇') === null);
  검('⛔ 영문이 들어오면 null — 우리가 옮길 것이 아니다', 직위영문('CEO') === null);

  /* 🔴 진짜 자료로 — 지어낸 감으로만 시험하지 않는다 */
  try {
    const { createRequire } = await import('node:module');
    const require = createRequire(import.meta.url);
    const j = require('../data/korea-executives-tape.json');
    const 다 = Object.values(j.byTicker).flat();
    let 옮김 = 0; const 못옮긴것 = new Map();
    for (const x of 다) {
      if (직위영문(x.title)) 옮김++;
      else 못옮긴것.set(x.title, (못옮긴것.get(x.title) ?? 0) + 1);
    }
    const 비 = 옮김 / 다.length;
    검(`🔴 진짜 자료 ${다.length}명 가운데 9할 넘게 옮긴다`, 비 > 0.9,
      `— ${(비 * 100).toFixed(1)}%`);
    const 많은못옮김 = [...못옮긴것].sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (많은못옮김.length) {
      console.log('   ⬜ 못 옮긴 직위(많은 차례):',
        많은못옮김.map(([k, v]) => `${JSON.stringify(k)}×${v}`).join(' · '));
    }
  } catch (e) {
    console.log('   ⬜ 진짜 자료를 못 읽었다 —', String(e.message).slice(0, 60));
  }

  console.log(탈 ? `\n🔴 자가시험 ${탈}건 탈` : `\n✅ 자가시험 ${통} 통과`);
  process.exit(탈 ? 1 : 0);
}

if (process.argv[1] && process.argv.includes('--자가시험')) 자가시험();
