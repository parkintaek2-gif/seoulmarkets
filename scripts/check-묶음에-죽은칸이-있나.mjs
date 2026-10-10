#!/usr/bin/env node
/**
 * check-묶음에-죽은칸이-있나.mjs — **칸은 있는데 값이 한 줄도 없는 자리**를 찾는다.
 *
 * ── 🔴 왜 (2026-10-11 04:5x · 5번) ──────────────────────────────────
 * 새벽에 대만 지면을 손보다가 이것을 만났다 —
 * ```
 *   taiwan-financials-tape.json   founded_on  0/1095   listed_on  0/1095
 * ```
 * **칸은 있는데 값이 전부 비어 있었다.** 수집기가 서기 8자리를 민국 7자리 자로 읽고 있었다.
 * 원본에는 멀쩡히 들어 있었고, 지면은 그릴 것이 없어 조용히 빈 채로 나가고 있었다.
 *
 * ⭐ **칸을 만들었다는 것은 쓸 생각이었다는 뜻이다.** 그 칸이 영영 비어 있으면 둘 중 하나다 —
 *   ① 우리가 잘못 읽고 있다(대만 설립일) — **고쳐야 한다**
 *   ② 저쪽이 안 주는 것이다(일본 market) — **못 낸다고 적어야 한다**
 *   어느 쪽이든 그대로 두면 안 된다. 그런데 지금까지 이것을 보는 자가 없었다.
 *
 * ── ⛔ 소음을 먼저 쟀다 ─────────────────────────────────────────────
 * 자를 만들기 전에 142개 묶음을 훑어 **몇 개나 걸리나** 셌다 — **단 2칸**이었다.
 * (일본 `pbr`·`market`) 소음이 이 정도면 자로 둘 값이 있다.
 * ⛔ 「일부러 비운 칸」은 짝 칸(`xxx_못낸까닭`)으로 밝힌다. 그 짝이 있으면 **안 운다** —
 *   `pbr`/`pbr_못낸까닭` 이 그 꼴이다. 까닭을 적는 것이 이 저장소의 방식이고,
 *   적어 두면 다음 사람이 「왜 없지」 하고 또 파지 않는다.
 *
 * 쓰는 법
 *   node scripts/check-묶음에-죽은칸이-있나.mjs
 *   node scripts/check-묶음에-죽은칸이-있나.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 자료방 = path.join(뿌리, 'src', 'data');

/** 너무 적은 줄로는 판정하지 않는다 — 두세 줄짜리 묶음은 비어 보이는 것이 예사다 */
export const 최소줄수 = 20;
/**
 * 아주 큰 파일은 건너뛴다. ⛔ 「없다」가 아니라 **못 쟀다**로 센다.
 * ⚠ 처음에 12MB 로 두었더니 `korea-ownership-executives-tape.json`(12.0MB) 하나가
 *   딱 걸려 못 쟀다. 그 파일이야말로 사람 정보가 든 자리라 봐야 한다 — 한계를 올렸다.
 *   ⭐ 한계를 정할 때는 **지금 있는 것 가운데 가장 큰 것**을 재 보고 정한다.
 */
export const 최대바이트 = 32 * 1024 * 1024;

/** 묶음에서 줄 배열을 찾는다. ⛔ 못 찾으면 null — 빈 배열로 덮지 않는다 */
export function 줄찾기(j) {
  if (Array.isArray(j?.rows)) return j.rows;
  if (j?.byTicker && typeof j.byTicker === 'object') return Object.values(j.byTicker).flat();
  if (Array.isArray(j)) return j;
  return null;
}

/**
 * 한 묶음에서 죽은 칸을 고른다.
 * ⛔ 짝 칸(`<칸>_못낸까닭`)이 있고 그 값이 차 있으면 **일부러 비운 것**이다 — 안 운다.
 * @returns {{줄수:number, 죽은칸:string[], 밝힌칸:string[]}|null} 못 재면 null
 */
export function 죽은칸찾기(rows) {
  if (!Array.isArray(rows) || rows.length < 최소줄수) return null;
  if (typeof rows[0] !== 'object' || rows[0] === null) return null;
  const 칸 = new Set();
  for (const r of rows.slice(0, 300)) {
    if (r && typeof r === 'object') for (const k of Object.keys(r)) 칸.add(k);
  }
  const 값있나 = (k) => rows.some((r) => {
    const v = r?.[k];
    return v !== null && v !== undefined && v !== '';
  });
  const 죽은칸 = []; const 밝힌칸 = [];
  for (const k of 칸) {
    if (k.endsWith('_못낸까닭')) continue;          /* 짝 칸 자신은 재지 않는다 */
    if (값있나(k)) continue;
    /* 「못 낸다」고 밝혀 둔 칸인가 — 그러면 흠이 아니라 **적어 둔 것**이다 */
    if (칸.has(`${k}_못낸까닭`) && 값있나(`${k}_못낸까닭`)) { 밝힌칸.push(k); continue; }
    죽은칸.push(k);
  }
  return { 줄수: rows.length, 죽은칸: 죽은칸.sort(), 밝힌칸: 밝힌칸.sort() };
}

function main() {
  const 난것 = []; const 밝힌것 = []; const 못잰것 = [];
  let 본것 = 0;
  for (const f of fs.readdirSync(자료방)) {
    if (!f.endsWith('.json')) continue;
    const p = path.join(자료방, f);
    let st; let j;
    /* ⛔ 못 잰 것은 **이름을 밝힌다.** 수만 세면 다음 사람이 무엇을 못 봤는지 모른다 */
    try { st = fs.statSync(p); } catch { 못잰것.push(`${f} (못 읽음)`); continue; }
    if (st.size > 최대바이트) { 못잰것.push(`${f} (${(st.size / 1024 / 1024).toFixed(1)}MB — 너무 크다)`); continue; }
    try { j = JSON.parse(fs.readFileSync(p, 'utf8')); } catch { 못잰것.push(`${f} (JSON 이 안 풀린다)`); continue; }
    const r = 죽은칸찾기(줄찾기(j));
    if (!r) continue;
    본것 += 1;
    for (const k of r.죽은칸) 난것.push({ 파일: f, 칸: k, 줄수: r.줄수 });
    for (const k of r.밝힌칸) 밝힌것.push({ 파일: f, 칸: k });
  }

  console.log('■ 묶음에 «칸은 있는데 값이 한 줄도 없는» 자리가 있나');
  console.log(`   본 묶음 ${본것}개 · 못 잰 파일 ${못잰것.length}개`);
  for (const x of 못잰것) console.log(`      ⬜ ${x} — 「죽은 칸이 없다」가 아니라 **못 쟀다**`);
  console.log('');

  if (밝힌것.length) {
    console.log(`   ⬜ 「못 낸다」고 밝혀 둔 칸 ${밝힌것.length}개 — 흠이 아니다`);
    for (const x of 밝힌것) console.log(`      · ${x.파일} · ${x.칸}`);
    console.log('');
  }

  if (!난것.length) {
    console.log('✅ 죽은 칸 없다');
    process.exit(0);
  }
  console.log(`🔴 죽은 칸 ${난것.length}개`);
  for (const x of 난것) console.log(`   · ${x.파일} · ${x.칸}  (${x.줄수}줄 모두 비었다)`);
  console.log('\n   ⭐ 칸을 만들었다는 것은 쓸 생각이었다는 뜻이다. 둘 중 하나다 —');
  console.log('      ① 우리가 잘못 읽고 있다 → 수집기를 고친다 (대만 설립일이 그랬다)');
  console.log('      ② 저쪽이 안 주는 것이다 → `<칸>_못낸까닭` 을 짝으로 적는다 (일본 market 이 그랬다)');
  console.log('   ⛔ 칸을 그냥 지우지 않는다 — 지우면 다음 사람이 같은 자리를 또 판다');
  process.exit(1);
}

/* ── 자가시험 ─────────────────────────────────────────────────── */
if (process.argv.includes('--자가시험')) {
  let 통 = 0; const 진 = [];
  const 검 = (n, ok) => { if (ok) 통 += 1; else 진.push(n); };
  const 많이 = (o) => Array.from({ length: 30 }, () => ({ ...o }));

  검('🔴 값이 한 줄도 없는 칸을 집는다',
    죽은칸찾기(많이({ a: 1, b: null })).죽은칸.join() === 'b');
  검('⛔ 한 줄이라도 값이 있으면 안 집는다', (() => {
    const rows = 많이({ a: 1, b: null }); rows[7].b = '있다';
    return 죽은칸찾기(rows).죽은칸.length === 0;
  })());
  검('⛔ 빈 글자도 «없는 것»으로 본다 — 0 은 값이다', (() => {
    const rows = 많이({ a: '', b: 0 });
    const r = 죽은칸찾기(rows);
    return r.죽은칸.join() === 'a';
  })());
  /* 🔴🔴 이 저장소의 방식 — 못 내는 것은 짝 칸으로 밝힌다. 밝힌 것을 흠이라 하지 않는다 */
  검('🔴🔴 짝 칸(_못낸까닭)이 차 있으면 «밝힌 것»이지 흠이 아니다', (() => {
    const r = 죽은칸찾기(많이({ pbr: null, pbr_못낸까닭: '기준을 모른다' }));
    return r.죽은칸.length === 0 && r.밝힌칸.join() === 'pbr';
  })());
  검('⛔ 짝 칸이 있어도 «그것까지 비었으면» 밝힌 것이 아니다',
    죽은칸찾기(많이({ pbr: null, pbr_못낸까닭: null })).죽은칸.join() === 'pbr');
  검('⛔ 짝 칸 자신은 재지 않는다 — 혼자 있으면 그냥 빈 칸이다',
    죽은칸찾기(많이({ a: 1, b_못낸까닭: null })).죽은칸.length === 0);

  검(`⛔ ${최소줄수}줄보다 적으면 판정하지 않는다 — 두세 줄로는 못 잰다`,
    죽은칸찾기([{ a: null }, { a: null }]) === null);
  검('⛔ 줄이 객체가 아니면 재지 않는다', 죽은칸찾기(Array(30).fill(3)) === null);
  검('⛔ 빈 입력에도 안 죽는다', 죽은칸찾기(null) === null && 죽은칸찾기([]) === null);

  검('🔴 rows 꼴을 찾는다', 줄찾기({ rows: [1, 2] }).length === 2);
  검('🔴 byTicker 꼴도 찾는다', 줄찾기({ byTicker: { a: [1], b: [2, 3] } }).length === 3);
  검('🔴 맨 배열도 찾는다', 줄찾기([1, 2, 3]).length === 3);
  검('⛔ 못 찾으면 null — 빈 배열로 덮지 않는다', 줄찾기({ _meta: {} }) === null);

  /* 🔴 진짜 자료로 — 지어낸 감으로만 시험하지 않는다 */
  try {
    const j = JSON.parse(fs.readFileSync(path.join(자료방, 'japan-financials-tape.json'), 'utf8'));
    const r = 죽은칸찾기(줄찾기(j));
    검('🔴 진짜 자료 — 일본 묶음의 pbr·market 은 «밝힌 칸»으로 잡힌다',
      r && r.밝힌칸.includes('pbr') && r.밝힌칸.includes('market'));
    검('🔴 그래서 죽은 칸으로는 안 울린다', r && !r.죽은칸.includes('market'));
  } catch (e) {
    console.log('   ⬜ 진짜 자료를 못 읽었다 —', String(e.message).slice(0, 50));
  }

  for (const n of 진) console.log('🔴', n);
  console.log(진.length ? `🔴 자가시험 ${진.length} 떨어졌다` : `✅ 자가시험 ${통} 통과`);
  process.exit(진.length ? 1 : 0);
}

main();
