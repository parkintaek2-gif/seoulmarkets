#!/usr/bin/env node
/**
 * build-korea-company-profile-tape.mjs — **한국 상장사 개황에서 «설립일»만 뽑는다.**
 *
 * ── 🔴 왜 (2026-10-11 03:4x · 5번) ──────────────────────────────────
 * 오늘 새벽 대만에서 설립일·상장일이 1,095줄 **전부 null** 인 것을 찾아 고쳤다.
 * 그러고 「한국·일본에도 같은 것이 있나」를 재 보니 —
 * ```
 *   archive/raw/dart-company/company.ndjson   설립 3,931/3,931   (서기 8자리, 19970722)
 * ```
 * **처음부터 전부 있었다.** 받아 두고 묶음에 안 담아 지면이 모르고 있었던 것이다.
 * ⚠ 처음에 `grep est|found|date` 로 찾아 「없다」고 읽을 뻔했다 — 칸 이름이 **「설립」**이다.
 *   ⭐ **내가 쓴 말로 세지 않는다.** 저쪽이 쓰는 말로 센다.
 *
 * ⭐ 「when was X founded」·「how old is X」는 흔한 물음이고, 공시가 적은 날이다.
 *   우리가 셈하거나 고르는 것이 없다 — 그대로 옮기면 된다.
 *
 * ── ⛔ 이 자가 지키는 것 ────────────────────────────────────────────
 * ⛔ **설립일만 담는다.** 원본에는 사업자번호·법인번호·주소·대표 이름이 같이 있다 —
 *   손님 지면에 낼 까닭이 없는 것은 묶음에도 담지 않는다. 담아 두면 언젠가 샌다.
 * ⛔ 못 읽은 날은 **빼지 않고 세어서 알린다.** 0 으로 채우지 않는다.
 * ⚠ 날짜 꼴은 실측했다 — 서기 8자리(`19970722`). 민국이 아니다(대만과 다르다).
 *
 * 실행
 *   node scripts/build-korea-company-profile-tape.mjs            재 보기만
 *   node scripts/build-korea-company-profile-tape.mjs --적는다
 *   node scripts/build-korea-company-profile-tape.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 들어올곳 = path.join(뿌리, 'archive', 'raw', 'dart-company', 'company.ndjson');
const 낼곳 = path.join(뿌리, 'src', 'data', 'korea-company-profile-tape.json');

/**
 * 공시의 8자리 날짜를 ISO 로. ⛔ 그럴듯하지 않으면 **null** — 지어내지 않는다.
 * ⚠ 대만은 같은 자리에 민국 7자리가 섞여 있었다. 한국은 서기 8자리뿐인 것을 실측했다.
 */
export function 설립일읽기(v, 올해 = new Date().getFullYear()) {
  const m = /^(\d{4})(\d{2})(\d{2})$/.exec(String(v ?? '').trim());
  if (!m) return null;
  const 해 = Number(m[1]); const 달 = Number(m[2]); const 날 = Number(m[3]);
  if (달 < 1 || 달 > 12 || 날 < 1 || 날 > 31) return null;
  if (해 < 1800 || 해 > 올해) return null;     /* ⛔ 아직 오지 않은 해에 세워질 수는 없다 */
  return `${해}-${m[2]}-${m[3]}`;
}

/**
 * 한 줄을 묶음 줄로. ⛔ 종목코드가 없으면 상장사가 아니다 — 담지 않는다.
 * ⛔ **설립일 말고는 아무것도 담지 않는다**(위 머리말).
 */
export function 한줄(o) {
  const 종목 = String(o?.종목 ?? '').trim();
  if (!/^\d{6}$/.test(종목)) return null;
  const 설립 = 설립일읽기(o?.설립);
  if (!설립) return null;
  return { code: 종목, founded_on: 설립 };
}

function main() {
  const 적는다 = process.argv.includes('--적는다');
  if (!fs.existsSync(들어올곳)) {
    console.log(`⬜ 곳간이 없다 — ${들어올곳}. 「회사가 없다」가 아니라 못 쟀다.`);
    process.exit(0);
  }
  const 줄들 = fs.readFileSync(들어올곳, 'utf8').split('\n').filter(Boolean);
  const 난것 = [];
  let 종목없음 = 0; let 날못읽음 = 0; let 깨짐 = 0;
  for (const l of 줄들) {
    let o;
    try { o = JSON.parse(l); } catch { 깨짐 += 1; continue; }
    if (!/^\d{6}$/.test(String(o?.종목 ?? '').trim())) { 종목없음 += 1; continue; }
    const r = 한줄(o);
    if (!r) { 날못읽음 += 1; continue; }
    난것.push(r);
  }
  /* 같은 종목이 두 번 나오면 뒤엣것을 쓴다 — 개황은 덮어쓰는 자료다 */
  const 표 = new Map(난것.map((r) => [r.code, r]));
  const 줄 = [...표.values()].sort((a, b) => a.code.localeCompare(b.code));

  console.log(`■ 한국 상장사 설립일 — 원본 ${줄들.length}줄`);
  console.log(`   담은 회사 ${줄.length} · 종목코드 없음 ${종목없음}(비상장) · 날 못 읽음 ${날못읽음} · 깨진 줄 ${깨짐}`);
  const 해들 = 줄.map((r) => Number(r.founded_on.slice(0, 4))).sort((a, b) => a - b);
  if (해들.length) console.log(`   설립 해 ${해들[0]} ~ ${해들[해들.length - 1]}`);
  console.log('   ⛔ 설립일 말고는 담지 않았다 — 사업자번호·법인번호·주소·대표 이름은 원본에만 둔다');

  if (!적는다) { console.log('\n⬜ 재기만 했다. 적으려면 --적는다'); process.exit(0); }
  fs.writeFileSync(낼곳, JSON.stringify({
    _meta: {
      무엇: '한국 상장사 설립일 — 금융감독원 DART 기업개황',
      출처: 'DART (금융감독원) 전자공시 · 공공누리 제1유형(출처표시)',
      지은때: new Date().toLocaleString('ko-KR'),
      담은회사: 줄.length,
      못읽은날: 날못읽음,
      메모: '설립일 말고는 담지 않는다. 원본에 있는 사업자번호·법인번호·주소·대표 이름은 지면에 낼 까닭이 없다',
    },
    rows: 줄,
  }, null, 1), 'utf8');
  console.log(`\n✅ 적었다 — src/data/korea-company-profile-tape.json (${(fs.statSync(낼곳).size / 1024).toFixed(0)}KB)`);
  process.exit(0);
}

/* ── 자가시험 ─────────────────────────────────────────────────── */
if (process.argv.includes('--자가시험')) {
  let 통 = 0; const 진 = [];
  const 검 = (n, ok) => { if (ok) 통 += 1; else 진.push(n); };

  /* 🔴 감은 실측한 원본 값에서 떠 왔다 */
  검('🔴 서기 8자리를 읽는다 — 19970722 (한빛네트)', 설립일읽기('19970722') === '1997-07-22');
  검('🔴 1950년대도 읽는다', 설립일읽기('19551201') === '1955-12-01');
  검('⛔ 아직 오지 않은 해는 null — 그 해에 세워질 수 없다', 설립일읽기('20991201', 2026) === null);
  검('⛔ 너무 옛날도 null', 설립일읽기('17001201') === null);
  검('⛔ 없는 달·날은 null', 설립일읽기('19971322') === null && 설립일읽기('19970700') === null);
  검('⛔ 꼴이 틀리면 null', 설립일읽기('1997-07-22') === null && 설립일읽기('') === null && 설립일읽기(null) === null);
  /* ⚠ 대만은 같은 자리에 민국 7자리가 섞여 있었다. 한국 자가 그것을 받아 주면 안 된다 */
  검('⛔⛔ 민국 7자리를 받지 않는다 — 한국 공시는 서기다(대만과 다르다)', 설립일읽기('1151009') === null);

  검('🔴 한 줄을 묶음 줄로', JSON.stringify(한줄({ 종목: '036720', 설립: '19970722' }))
    === JSON.stringify({ code: '036720', founded_on: '1997-07-22' }));
  검('⛔ 종목코드가 없으면 담지 않는다 — 상장사가 아니다', 한줄({ 종목: '', 설립: '19970722' }) === null);
  검('⛔ 설립일을 못 읽으면 담지 않는다 — 빈 줄을 만들지 않는다', 한줄({ 종목: '036720', 설립: '' }) === null);
  /* 🔴🔴 원본에는 사업자번호·법인번호·주소·대표 이름이 같이 있다. 한 칸이라도 새면 안 된다 */
  검('🔴🔴 설립일 말고는 «아무것도» 담지 않는다', (() => {
    const r = 한줄({ 종목: '036720', 설립: '19970722', 사업자번호: '1', 법인번호: '2', 주소: '서울', 대표: '홍길동', 홈페이지: 'x' });
    return JSON.stringify(Object.keys(r)) === JSON.stringify(['code', 'founded_on']);
  })());
  검('⛔ 빈 입력에도 안 죽는다', 한줄(null) === null && 한줄({}) === null);

  for (const n of 진) console.log('🔴', n);
  console.log(진.length ? `🔴 자가시험 ${진.length} 떨어졌다` : `✅ 자가시험 ${통} 통과`);
  process.exit(진.length ? 1 : 0);
}

main();
