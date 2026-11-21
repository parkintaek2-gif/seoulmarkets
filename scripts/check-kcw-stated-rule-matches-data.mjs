#!/usr/bin/env node
/**
 * check-kcw-stated-rule-matches-data.mjs — **지면이 말한 자름선이 자료의 자름선과 같은가.**
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔴 [2026-09-08 · 5번] `/firm/*` 19장과 `/for-industry`(B2B 지면)에 이렇게 나가 있었다 —
 *
 *   「Every company whose **catalogue we can see completely**, in alphabetical order」
 *   「Companies whose catalogue we can **only see in part** have no sheet here」
 *
 *   손님은 「목록을 온전히 볼 수 있는 회사만 낸다」로 읽는다.
 *   그런데 실제 자름선은 `collect-korean-title-firms.mjs` 의 `등급()` 이고
 *   그것은 **차트에 든 작품 편수뿐**이다 — 10편 이상이 A, 5편 이상이 B.
 *   ⛔ 카탈로그를 얼마나 보는지는 **재지도 않는다.**
 *
 * ⚠ 9편인 회사는 「부분만 보이는 곳」이 아니다. 그냥 편수가 적은 곳이다.
 *   ⇒ 우리 강령 「」에 정면으로 걸린다. 스무 장이 그 말을 했다.
 *
 * ⭐ 이 자가 막는 것은 «그 갈래»다 — 지면 글이 자름선을 «다른 것으로» 바꿔 말하는 것.
 *   말과 자료가 어긋나면 검산이 안 되고, 틀린 한 줄이 옳은 스물셋까지 의심받게 한다.
 *
 * 쓰는 법
 *   node scripts/check-kcw-stated-rule-matches-data.mjs
 *   node scripts/check-kcw-stated-rule-matches-data.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';

const 뿌리 = path.resolve(import.meta.dirname, '..');

/**
 * 글에 「카탈로그를 온전히/부분만 본다」는 말이 있나.
 * ⚠ 낱말 하나로 잡지 않는다 — `catalogue` 는 멀쩡한 곳에도 쓴다.
 *   「본다/보인다」와 「온전히/부분만」이 **함께** 있을 때만 잡는다.
 */
export function 볼수있다고말했나(글) {
  const s = String(글 ?? '');
  const 무늬 = [
    /catalogue[^.]{0,40}\b(see|seen|visible)\b[^.]{0,20}\b(completely|in full|entirely)\b/i,
    /\b(see|seen|visible)\b[^.]{0,40}catalogue[^.]{0,20}\b(completely|in full|entirely)\b/i,
    /catalogue[^.]{0,40}\bonly\s+(see|seen)\b[^.]{0,20}\bin\s+part\b/i,
    /\bonly\s+(see|seen)\b[^.]{0,30}\bin\s+part\b/i,
  ];
  return 무늬.some((m) => m.test(s));
}

/** 글에서 「N or more」·「fewer than N」의 N 을 뽑는다. ⛔ 없으면 null */
export function 말한문턱(글) {
  const s = String(글 ?? '');
  const a = /(\d+)\s+or\s+more/i.exec(s);
  if (a) return Number(a[1]);
  const b = /fewer\s+than\s+(\d+)/i.exec(s);
  if (b) return Number(b[1]);
  return null;
}

/** 잰 수인가 — `Number(null) === 0` 이 「못 잼」을 「0」으로 바꾸는 것을 막는다 */
export function 잰수인가(v) {
  if (v == null) return false;
  if (typeof v === 'string' && v.trim() === '') return false;
  return Number.isFinite(Number(v));
}

/**
 * 회사 자료의 «말»과 «수»가 맞나.
 * 준 것: { 흠: [...], 재본것: {...} }
 */
export function 회사자료를본다(d) {
  const 흠 = [];
  const 글들 = [d?.whichCompanies, d?.whatIsMissing, d?.whatIsHere, d?.whatIsNotHere];
  for (const g of 글들) {
    if (볼수있다고말했나(g)) 흠.push(`⛔ 「카탈로그를 온전히/부분만 본다」고 말한다 — 자름선은 편수뿐이다: ${String(g).slice(0, 70)}…`);
  }
  const 말한것 = 말한문턱(d?.whichCompanies) ?? 말한문턱(d?.whatIsMissing);
  const 자료문턱 = 잰수인가(d?.pageThreshold) ? Number(d.pageThreshold) : null;
  if (말한것 == null) 흠.push('⛔ 지면 글이 문턱 수를 말하지 않는다 — 손님이 검산할 수 없다');
  if (자료문턱 == null) 흠.push('⬜ 자료에 pageThreshold 가 없다 — 못 쟀다(0 으로 치지 않는다)');
  if (말한것 != null && 자료문턱 != null && 말한것 !== 자료문턱) {
    흠.push(`⛔ 말한 문턱 ${말한것} 과 자료의 문턱 ${자료문턱} 이 다르다`);
  }
  /* ⭐ 가장 센 검산 — «실제로 낸 회사»의 최소 편수가 문턱보다 작으면 말이 거짓이다 */
  const 편수 = (d?.firms ?? [])
    .map((f) => (잰수인가(f?.titlesInCatalogue) ? Number(f.titlesInCatalogue) : null))
    .filter((n) => n != null);
  if (!편수.length) 흠.push('⬜ 낸 회사들의 편수를 못 읽었다 — 못 쟀다');
  else {
    const 최소 = Math.min(...편수);
    if (자료문턱 != null && 최소 < 자료문턱) {
      흠.push(`⛔ 문턱은 ${자료문턱} 인데 실제로 낸 회사 가운데 ${최소}편인 곳이 있다`);
    }
  }
  return { 흠, 재본것: { 말한것, 자료문턱, 낸회사수: (d?.firms ?? []).length, 최소편수: 편수.length ? Math.min(...편수) : null } };
}

const 내가입구인가 = !!process.argv[1]
  && process.argv[1].split(/[\\/]/).pop() === new URL(import.meta.url).pathname.split('/').pop();

if (내가입구인가 && process.argv.includes('--자가시험')) {
  const 시험 = [];
  const 재다 = (이름, 참) => 시험.push([이름, !!참]);

  /* 🔴 라이브에 실제로 나가 있던 두 문장 — 시험으로 굳힌다 */
  재다('실제로 나갔던 「see completely」를 잡는다',
    볼수있다고말했나('Every company whose catalogue we can see completely, in alphabetical order.'));
  재다('실제로 나갔던 「only see in part」를 잡는다',
    볼수있다고말했나('Companies whose catalogue we can only see in part have no sheet here.'));
  /* ⛔ 멀쩡한 글을 잡으면 사람이 이 검사를 끈다 */
  재다('고친 문장은 안 잡는다',
    !볼수있다고말했나('Every company with 10 or more titles that reached a Netflix weekly top 10, in alphabetical order.'));
  재다('catalogue 라는 낱말만으로는 안 잡는다',
    !볼수있다고말했나('The full catalogue of each company is listed on its own sheet.'));
  재다('「how much of its catalogue we can see」는 안 잡는다 — 우리가 새로 쓴 단서다',
    !볼수있다고말했나('not a claim about how much of its catalogue we can see.'));

  재다('말한문턱 — N or more', 말한문턱('Every company with 10 or more titles') === 10);
  재다('말한문턱 — fewer than N', 말한문턱('Companies with fewer than 7 charting titles') === 7);
  재다('말한문턱 — 수가 없으면 null', 말한문턱('Every company we can see') === null);

  재다('잰수인가 — null 은 못 잼', 잰수인가(null) === false);
  재다('잰수인가 — 0 은 잰 값', 잰수인가(0) === true);

  const 좋은것 = {
    whichCompanies: 'Every company with 10 or more titles that reached a Netflix weekly top 10, in alphabetical order.',
    whatIsMissing: 'Companies with fewer than 10 charting titles have no sheet here.',
    pageThreshold: 10,
    firms: [{ titlesInCatalogue: 10 }, { titlesInCatalogue: 76 }],
  };
  재다('맞는 자료는 흠 0', 회사자료를본다(좋은것).흠.length === 0);

  재다('말과 자료의 문턱이 다르면 잡는다',
    회사자료를본다({ ...좋은것, pageThreshold: 5 }).흠.some((x) => x.includes('다르다')));
  /* ⭐ 가장 센 검산 — 문턱보다 적은 회사를 실제로 냈으면 말이 거짓이다 */
  재다('문턱보다 적은 회사를 냈으면 잡는다',
    회사자료를본다({ ...좋은것, firms: [{ titlesInCatalogue: 4 }] }).흠.some((x) => x.includes('4편인 곳')));
  재다('pageThreshold 가 없으면 «못 쟀다»로 적는다',
    회사자료를본다({ ...좋은것, pageThreshold: undefined }).흠.some((x) => x.startsWith('⬜')));
  재다('문턱 수를 아예 말하지 않으면 잡는다',
    회사자료를본다({ ...좋은것, whichCompanies: 'Every company we publish.', whatIsMissing: 'Others are not here.' })
      .흠.some((x) => x.includes('검산할 수 없다')));

  const 틀린것 = 시험.filter(([, ok]) => !ok);
  for (const [이름, ok] of 시험) console.log(`  ${ok ? '✅' : '⛔'} ${이름}`);
  console.log(`\n자가시험 ${시험.length}건 · 어긋난 것 ${틀린것.length}건`);
  process.exit(틀린것.length ? 1 : 0);
}

if (내가입구인가) {
  const p = path.join(뿌리, 'src/data/wikitip-firm-pages.json');
  let d;
  try { d = JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) {
    console.log(`⬜ 자료를 못 읽었다 — ${String(e.message).slice(0, 60)} (0 으로 치지 않는다)`);
    process.exit(0);
  }
  const { 흠, 재본것 } = 회사자료를본다(d);
  console.log('지면이 말한 자름선 ↔ 자료의 자름선');
  console.log(`   말한 문턱 ${재본것.말한것} · 자료의 문턱 ${재본것.자료문턱} · 낸 회사 ${재본것.낸회사수}곳 · 그중 최소 편수 ${재본것.최소편수}`);
  if (!흠.length) { console.log('✅ 말과 수가 맞는다'); process.exit(0); }
  for (const x of 흠) console.log(`   ${x}`);
  console.log(`\n⛔ ${흠.length}건. 지면이 자름선을 «다른 것으로» 말하고 있다.`);
  process.exit(1);
}
