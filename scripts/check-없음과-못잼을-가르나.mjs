#!/usr/bin/env node
/**
 * check-없음과-못잼을-가르나.mjs — **빈 자료가 「없다」인지 「못 받았다」인지 알 수 있나.**
 * (5번 2026-10-09)
 *
 * ── 🔴🔴 왜 만드나 ─────────────────────────────────────────────────────────
 * 오늘 내가 `dubai-dfm-shareholders` 의 빈 칸 74곳을 보고 **짐작으로**
 * 「없는 것이 아니라 못 받은 것일 수 있다」고 적고 자료 등급을 「약하다」로 매겼다.
 * 열어 보니 자료가 이미 답을 들고 있었다 —
 *     `_meta.coverage = { attempted, withData, empty, emptyReason }`
 *     73곳 · `no-substantial-shareholders-disclosed`
 * ⇒ **「받아 봤더니 없더라」였다.** 내 짐작이 틀렸다.
 *
 * 그래서 되물었다 — **다른 자료는 그 둘을 가르고 있나?** 세어 보니 아니었다.
 * ⭐ 강령: 「**못 잰 것은 못 쟀다고 적는다** ·  · 」
 *   그 강령이 **자료 쪽에서는 거의 안 지켜지고 있었다.**
 *
 * ── ⛔ 이 자가 지키는 것 ───────────────────────────────────────────────────
 * ⛔ `.json` 으로 쌓는 갈래에만 묻는다. `.ndjson·csv·pdf·xlsx·하위폴더` 꼴에는
 *   **이 물음을 못 묻는다** — 「없다」로 세지 않고 «못 물음»으로 따로 센다.
 * ⛔ 수가 늘 때만 운다. 지금 48갈래를 다 고치라는 자가 아니다 —
 *   **새 수집기가 또 안 갈라 적는 것**을 막는 자다.
 * ⚠ 「coverage 칸이 있다」가 「제대로 적는다」는 아니다. 칸이 있나만 본다. 그 한계를 말한다.
 *
 * 쓰는 법
 *   node scripts/check-없음과-못잼을-가르나.mjs --자가시험
 *   node scripts/check-없음과-못잼을-가르나.mjs
 *   node scripts/check-없음과-못잼을-가르나.mjs --보인다
 */
import fs from 'node:fs';
import path from 'node:path';

const 뿌리 = path.resolve(import.meta.dirname, '..');
export const 자료방 = path.join(뿌리, 'archive', 'raw');

/** 못 박은 수 — 이보다 늘면 운다. ⛔ 줄었으면 이 수를 같이 줄인다 */
export const 못박은_안가르는수 = 48;

/**
 * 한 자료 덩이가 「없음/못잼」을 갈라 적나.
 * @returns {boolean|null} 글이 아니거나 못 읽으면 null (⛔ false 가 아니다)
 */
export function 가르나(덩이) {
  if (덩이 == null || typeof 덩이 !== 'object' || Array.isArray(덩이)) return null;
  const m = 덩이._meta ?? 덩이._메모 ?? 덩이.meta ?? {};
  const c = (m && typeof m === 'object' ? (m.coverage ?? m.커버리지) : null) ?? 덩이.coverage;
  if (c && typeof c === 'object') return true;
  return false;
}

/** 그 방이 이 물음을 물을 수 있는 꼴인가 — `.json` 파일이 있나 */
export function 물을수있나(파일이름들) {
  if (!Array.isArray(파일이름들)) return null;
  return 파일이름들.some((n) => String(n).endsWith('.json'));
}

/* ── 자가시험 ───────────────────────────────────────────────────────────── */
if (process.argv.includes('--자가시험')) {
  const 것 = []; const 다 = (이름, 참) => 것.push({ 이름, 참: !!참 });

  다('🔴 _meta.coverage 가 있으면 참', 가르나({ _meta: { coverage: { attempted: true } } }) === true);
  다('덩이 바로 밑 coverage 도 본다', 가르나({ coverage: { attempted: true } }) === true);
  다('한글 칸 이름도 본다', 가르나({ _메모: { 커버리지: { 시도: true } } }) === true);
  다('🔴 없으면 거짓', 가르나({ _meta: { builtAt: 'x' } }) === false);
  다('⛔ 글자 coverage 는 안 센다 — 칸이어야 한다', 가르나({ coverage: 'yes' }) === false);
  다('⛔ 객체가 아니면 null (false 가 아니다)', 가르나('아무 글') === null);
  다('⛔ 배열도 null — 덩이가 아니다', 가르나([1, 2]) === null);
  다('⛔ null 도 null', 가르나(null) === null);

  다('json 이 있으면 물을 수 있다', 물을수있나(['a.json', 'b.csv']) === true);
  다('🔴 json 이 없으면 못 묻는다', 물을수있나(['a.ndjson', 'b.csv']) === false);
  다('⛔ 목록이 아니면 null', 물을수있나(null) === null);

  const 진 = 것.filter((x) => !x.참);
  console.log(`없음·못잼 가르기 — 자체 점검 ${것.length - 진.length}/${것.length}`);
  for (const x of 진) console.log('   🔴 ' + x.이름);
  process.exit(진.length ? 1 : 0);
}

/* ── 실제로 센다 ───────────────────────────────────────────────────────── */
const 보인다 = process.argv.includes('--보인다');

console.log('■ 빈 자료가 「없다」인지 「못 받았다」인지 알 수 있나');
console.log('   ⭐ 강령 — 「못 잰 것은 못 쟀다고 적는다 · 」');
console.log('   ⚠ 「coverage 칸이 있나」만 본다. 그 칸을 «제대로» 적는지는 못 잰다\n');

if (!fs.existsSync(자료방)) {
  console.log('⬜ archive/raw 를 못 읽었다 — 못 쟀다. 「다 갈라 적는다」가 아니다');
  process.exit(0);
}

const 가름 = []; const 안가름 = []; const 못물음 = []; const 못읽음 = [];
for (const e of fs.readdirSync(자료방, { withFileTypes: true }).filter((x) => x.isDirectory())) {
  const d = path.join(자료방, e.name);
  let ns;
  try { ns = fs.readdirSync(d); } catch { 못읽음.push(e.name); continue; }
  if (물을수있나(ns) !== true) { 못물음.push(e.name); continue; }
  /* ⛔ 한 장만 보면 그 장만 특이할 수 있다 — 세 장까지 본다 */
  const 볼것 = ns.filter((n) => n.endsWith('.json')).slice(0, 3);
  let 읽힘 = false; let 찾음 = false;
  for (const n of 볼것) {
    try {
      const j = JSON.parse(fs.readFileSync(path.join(d, n), 'utf8'));
      읽힘 = true;
      if (가르나(j) === true) { 찾음 = true; break; }
    } catch { /* 한 장을 못 읽어도 멈추지 않는다 */ }
  }
  if (!읽힘) 못읽음.push(e.name);
  else if (찾음) 가름.push(e.name);
  else 안가름.push(e.name);
}

console.log(`  ✅ 갈라 적는다      ${String(가름.length).padStart(3)}갈래`);
console.log(`  🔴 안 갈라 적는다   ${String(안가름.length).padStart(3)}갈래  (못 박은 수 ${못박은_안가르는수})`);
console.log(`  ⬜ 이 물음을 못 묻는다 ${String(못물음.length).padStart(3)}갈래  (.ndjson·csv·pdf·하위폴더 꼴)`);
console.log(`  ⬜ 못 읽었다        ${String(못읽음.length).padStart(3)}갈래`);

if (가름.length) console.log(`\n  ✅ ${가름.join(' · ')}`);
if (보인다 && 안가름.length) {
  console.log('\n  🔴 안 갈라 적는 갈래');
  for (const n of 안가름) console.log('     · ' + n);
}

console.log('');
if (안가름.length > 못박은_안가르는수) {
  console.log(`🔴 안 갈라 적는 갈래가 ${못박은_안가르는수} → ${안가름.length} 로 **늘었다.**`);
  console.log('   ⛔ 새 수집기를 지을 때 `_meta.coverage = { attempted, withData, empty, emptyReason }` 를 적는다.');
  console.log('   ⭐ 그것이 없으면 다음 사람이 빈 칸을 보고 «짐작»한다. 오늘 내가 그랬다.');
  process.exit(1);
}
console.log(`✅ 안 갈라 적는 갈래가 안 늘었다 (${안가름.length} ≤ ${못박은_안가르는수})`);
console.log('   ⚠ 이것은 「괜찮다」가 아니라 「더 나빠지지 않았다」다. 줄이는 것은 다음 사람 몫이다');
