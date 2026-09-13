#!/usr/bin/env node
/**
 * build-ownership-exit-ranking.mjs — 「대량보유 전량 매도 — 사유란이 «최대주주 변경»을
 *   밝힌 건은 몇 건인가」 차트+데이터.
 *   재료: src/data/korea-ownership-filings-tape.json (F7 /v1/ownership, DART majorstock).
 *   ⛔ 판정 없음 — 사유원문(reason_raw_ko)에 「최대주주」 문구가 있는지 «세기»만 한다.
 *      문구가 없다고 지배력이 안 바뀌었다는 뜻은 아니다 — 필드가 말 안 한 것뿐이다.
 * 출력: public/charts/ownership-exit-ranking.svg · src/data/ownership-exit-filings.json
 *
 * node scripts/build-ownership-exit-ranking.mjs --자가시험
 * node scripts/build-ownership-exit-ranking.mjs --적는다
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 원본길 = path.join(뿌리, 'src/data/korea-ownership-filings-tape.json');
const CHARTS = path.join(뿌리, 'public/charts');

/** 구조조정(분할·합병·대표보고자 변경 등) 사유는 «경제적 매각»이 아니라 걷어낸다. */
export const 재편사유 = /분할|합병|대표보고자|연명보고|해소|소멸|형태 변경|조정|해지/;
/** 실제 매도로 지분이 준 것만 담는다. */
export const 매도사유 = /매도|처분|양도/;

/** 한 회사(ticker)에 최근 것 하나만 남긴다 — 같은 사건이 공동보고자로 여러 줄일 수 있다. */
export function 회사당하나(rows) {
  const seen = new Set(); const out = [];
  for (const r of rows) { if (!seen.has(r.ticker)) { seen.add(r.ticker); out.push(r); } }
  return out;
}

/** 전량(또는 거의 전량) 매도 사건만 추린다. */
export function 전량매도추리기(rows) {
  return (rows ?? []).filter((r) => r.stakeChangePct !== null && r.stakeChangePct < 0
    && r.stakePct !== null && r.stakePct <= 1
    && 매도사유.test(r.reasonRawKo ?? '') && !재편사유.test(r.reasonRawKo ?? ''));
}

/** 사유원문에 「최대주주」 문구가 있는가 — 판정이 아니라 «문구 검색»이다. */
export function 최대주주문구있나(reasonRawKo) {
  return /최대주주/.test(reasonRawKo ?? '');
}

function 짓기() {
  const tape = JSON.parse(fs.readFileSync(원본길, 'utf8'));
  const 전량 = 전량매도추리기(tape.rows);
  const 정렬 = [...전량].sort((a, b) => a.stakeChangePct - b.stakeChangePct);
  const 유일 = 회사당하나(정렬);
  const 이름있음 = 유일.filter((r) => 최대주주문구있나(r.reasonRawKo)).length;
  return {
    rows: 유일, 전체후보: 전량.length, 최대주주문구있음: 이름있음,
    sourceBuiltAt: tape._meta?.builtAt ?? null,
  };
}

/* ── 자가시험 ───────────────────────────────────────────────────────── */
function 자가시험() {
  const 것 = []; const 재다 = (이름, 됐나) => 것.push({ 이름, 됐나 });

  const 표본 = [
    { ticker: 'A', stakeChangePct: -10, stakePct: 0, reasonRawKo: '주식 매도에 따른 변동' },
    { ticker: 'B', stakeChangePct: -5, stakePct: 0.5, reasonRawKo: '주식양도계약 거래 종결' },
    { ticker: 'C', stakeChangePct: -20, stakePct: 5, reasonRawKo: '전량매도' }, // 남은 지분 5% > 1 → 제외
    { ticker: 'D', stakeChangePct: 10, stakePct: 0, reasonRawKo: '매도' }, // 증가라 제외
    { ticker: 'E', stakeChangePct: -30, stakePct: 0, reasonRawKo: '인적분할에 따른 매도' }, // 재편 사유라 제외
    { ticker: 'F', stakeChangePct: -15, stakePct: 0, reasonRawKo: '최대주주 변경을 수반하는 매도' },
  ];
  const 추림 = 전량매도추리기(표본);
  재다('전량매도추리기: 지분 증가(D)는 뺀다', !추림.some((r) => r.ticker === 'D'));
  재다('🔴 전량매도추리기: 남은 지분이 1% 넘으면(C) 뺀다', !추림.some((r) => r.ticker === 'C'));
  재다('🔴 전량매도추리기: 재편 사유(E)는 매도라는 말이 있어도 뺀다', !추림.some((r) => r.ticker === 'E'));
  재다('전량매도추리기: 진짜 매도(A·B·F)는 남긴다', ['A', 'B', 'F'].every((t) => 추림.some((r) => r.ticker === t)));

  재다('최대주주문구있나: 문구 있으면 참', 최대주주문구있나('최대주주 변경') === true);
  재다('⛔ 최대주주문구있나: 문구 없으면 거짓(지어내지 않는다)', 최대주주문구있나('그냥 매도') === false);
  재다('최대주주문구있나: 빈 값은 거짓', 최대주주문구있나(null) === false);

  재다('회사당하나: 같은 ticker 는 먼저 온 것만 남긴다', (() => {
    const r = 회사당하나([{ ticker: 'X', v: 1 }, { ticker: 'X', v: 2 }, { ticker: 'Y', v: 3 }]);
    return r.length === 2 && r[0].v === 1;
  })());

  let 실제 = null;
  try { 실제 = 짓기(); } catch (e) { 재다('실제 자료로 지어진다 — ' + e.message, false); }
  if (실제) {
    재다('실제 자료: 후보가 있다', 실제.rows.length > 0);
    재다('🔴 실데이터: 최대주주 문구가 있는 것이 «소수»다(105건 중 절반 미만)',
      실제.최대주주문구있음 < 실제.rows.length / 2);
    재다('실데이터: 1위가 가장 큰 낙폭(음수 최소)이다', 실제.rows[0].stakeChangePct <= 실제.rows[1].stakeChangePct);
  }

  const 실패 = 것.filter((x) => !x.됐나);
  console.log(`■ 자가시험 ${것.length - 실패.length}/${것.length}`);
  for (const x of 실패) console.log(`  🔴 ${x.이름}`);
  return 실패.length === 0;
}

if (process.argv.includes('--자가시험')) process.exit(자가시험() ? 0 : 1);
if (!자가시험()) { console.log('🔴 자가시험이 깨졌다 — 만들지 않는다.'); process.exit(1); }
console.log('');

const { rows, 전체후보, 최대주주문구있음, sourceBuiltAt } = 짓기();
const TOP = rows.slice(0, 9);
console.log(`■ Ownership exit ranking — 후보 ${전체후보}건 · 회사 ${rows.length}곳 · 「최대주주」 문구 있음 ${최대주주문구있음}곳`);
TOP.forEach((r, i) => console.log(`  ${i + 1}. ${r.nameEn ?? r.nameKo} (${r.ticker}) ${r.stakeChangePct}pp · ${최대주주문구있나(r.reasonRawKo) ? 'names control change' : 'cause not named'}`));

if (!process.argv.includes('--적는다')) { console.log('\n⭐ 아직 안 적었다. --적는다 를 붙인다.'); process.exit(0); }

fs.mkdirSync(CHARTS, { recursive: true });
const INK = '#0f172a'; const SUB = '#64748b'; const BG = '#ffffff';
const NAMED = '#15803d'; const UNNAMED = '#b91c1c';
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
const W = 800; const rowsN = TOP.length;
const H = 70 + rowsN * 34 + 40; const ML = 210; const MR = 90; const MT = 60; const MB = 30;
const iw = W - ML - MR; const max = Math.abs(TOP[0].stakeChangePct); const step = (H - MT - MB) / rowsN;
const bh = Math.min(24, step * 0.6); const scale = iw / max;
let bars = '';
TOP.forEach((r, i) => {
  const cy = MT + step * i + step / 2; const w = Math.abs(r.stakeChangePct) * scale;
  const named = 최대주주문구있나(r.reasonRawKo);
  const color = named ? NAMED : UNNAMED;
  const label = named ? 'names control change' : 'cause not named';
  bars += `<rect x="${ML}" y="${(cy - bh / 2).toFixed(1)}" width="${w.toFixed(1)}" height="${bh}" fill="${color}" rx="2"/>`
    + `<text x="${ML - 10}" y="${(cy + 4).toFixed(1)}" text-anchor="end" font-size="12" fill="${INK}">${esc(r.nameEn ?? r.nameKo)}</text>`
    + `<text x="${(ML + w + 6).toFixed(1)}" y="${(cy + 4).toFixed(1)}" font-size="11.5" font-weight="700" fill="${color}">${Math.abs(r.stakeChangePct).toFixed(1)}pp · ${label}</text>`;
});
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Georgia,'Times New Roman',serif" role="img" aria-label="Nine Korean listed companies where a 5%-plus filer's reported stake dropped to near zero through an ordinary sale, ranked by the size of the drop, marked by whether the filing's reason field names a controlling-shareholder change">
<rect width="${W}" height="${H}" fill="${BG}"/>
<text x="20" y="26" font-size="16" font-weight="700" fill="${INK}">A 75-point stake disappeared — and the filing didn't say who took over</text>
<text x="20" y="42" font-size="12" fill="${SUB}">Korea Ownership Ledger, substantial-shareholding (5%+) filings where a holder's stake fell to ~0 via an ordinary sale, ranked by size of the drop</text>
${bars}
<text x="${W - MR}" y="${H - 8}" text-anchor="end" font-size="10" fill="${SUB}">Source: DART (Financial Supervisory Service) majorstock filings, collected by SeoulMarkets</text>
</svg>`;
fs.writeFileSync(path.join(CHARTS, 'ownership-exit-ranking.svg'), svg);
fs.writeFileSync(path.join(뿌리, 'src/data/ownership-exit-filings.json'), JSON.stringify({
  builtFrom: sourceBuiltAt, candidateCount: 전체후보, companyCount: rows.length,
  namesControlChangeCount: 최대주주문구있음, rows,
}, null, 1), 'utf8');
console.log('\n📁 적었다 — public/charts/ownership-exit-ranking.svg · src/data/ownership-exit-filings.json');
