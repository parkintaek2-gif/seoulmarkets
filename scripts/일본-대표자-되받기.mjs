#!/usr/bin/env node
/**
 * 일본-대표자-되받기.mjs — **이미 받아 둔 유가증권보고서에서 대표자만 다시 뽑는다.**
 *
 * ── 🔴 왜 (2026-10-10 23:3x · 5번) ──────────────────────────────────
 * `collect-japan-edinet-financials.mjs` 는 CSV 를 풀어 재무 아홉 칸만 뽑고
 * **CSV 를 지운다.** 그래서 오늘 그 수집기에 대표자 칸을 더해도 **앞으로 받는 것만** 담긴다.
 * 이미 쌓인 3,712건은 비어 있다 — 그 3,712건이 곧 일본 회사 지면 3,702장이다.
 *
 * ⭐ 다행히 **docID 를 알고 있다**(파일 이름이 docID 다). 목록 조회 없이 바로 받으면 된다.
 *
 * ── ⛔ 이 자가 지키는 것 ────────────────────────────────────────────
 * ⛔ **원래 값을 건드리지 않는다.** 대표자 칸 하나만 더해서 다시 쓴다.
 * ⛔ **이미 채워진 것은 건너뛴다** — 중간에 끊겨도 이어서 돌 수 있다(3,712건은 길다).
 * ⛔ **못 받은 것은 「없다」가 아니라 «안 적는다»** — 다음에 다시 받게 둔다.
 *   `representative_raw: null` 로 박아 두면 「재 봤는데 없더라」와 구별이 안 된다.
 *   ⇒ 서류에 그 줄이 «정말 없을» 때만 null 을 적고, **못 받은 것은 칸 자체를 안 만든다.**
 * ⚠ 그쪽을 몰아붙이지 않는다 — 건당 쉼을 둔다. EDINET 한도는 공개돼 있지 않아
 *   실측으로 간다(처음엔 작게 돌려 보고 늘린다).
 * ⛔ 열쇠 값을 화면·로그에 찍지 않는다.
 *
 * 쓰는 법
 *   node scripts/일본-대표자-되받기.mjs --자가시험
 *   node scripts/일본-대표자-되받기.mjs --몇개 20          (재 보기 — 안 적는다)
 *   node scripts/일본-대표자-되받기.mjs --몇개 20 --적는다
 *   node scripts/일본-대표자-되받기.mjs --적는다            (다 — 오래 걸린다)
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { 대표자뽑기 } from './collect-japan-edinet-financials.mjs';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 곳간 = path.join(뿌리, 'archive', 'raw', 'japan-edinet-financials');

const 인자 = (이름, 기본 = null) => {
  const i = process.argv.indexOf(이름);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : 기본;
};
const 참자 = (ms) => new Promise((r) => { setTimeout(r, ms); });

/** 되받을 것 고르기 — 이미 채워진 것은 뺀다 */
export function 할것고르기(한벌들) {
  return (한벌들 ?? []).filter((x) => x && x.docID && !('representative_raw' in x));
}

/** .env 에서 열쇠 — ⛔ 값을 돌려주기만 하고 찍지 않는다 */
function 열쇠읽기() {
  try {
    for (const 줄 of fs.readFileSync(path.join(뿌리, '.env'), 'utf8').split(/\r?\n/)) {
      const m = 줄.match(/^\s*(EDINET_API_KEY|EDINET_KEY)\s*=\s*(.*)$/);
      if (m) return m[2].trim().replace(/^["']|["']$/g, '');
    }
  } catch { /* 없으면 null */ }
  return null;
}

async function 한건(docID, 열쇠, 임시뿌리) {
  const r = await fetch(`https://api.edinet-fsa.go.jp/api/v2/documents/${docID}?type=5&Subscription-Key=${열쇠}`);
  if (!r.ok) return { 꼴: '못받음', 코드: r.status };
  const buf = Buffer.from(await r.arrayBuffer());
  const 임시 = path.join(임시뿌리, docID);
  fs.writeFileSync(`${임시}.zip`, buf);
  try {
    execFileSync('powershell', ['-NoProfile', '-Command',
      `Expand-Archive -Path "${임시}.zip" -DestinationPath "${임시}" -Force`], { stdio: 'ignore' });
    let 씨 = '';
    const 걷기 = (d) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) 걷기(p);
        else if (e.name.endsWith('.csv') && /^jpcrp/.test(e.name)) 씨 += fs.readFileSync(p, 'utf16le');
      }
    };
    걷기(임시);
    if (!씨) return { 꼴: '못받음', 코드: 'CSV 없음' };
    return { 꼴: '받음', 값: 대표자뽑기(씨) };
  } finally {
    fs.rmSync(임시, { recursive: true, force: true });
    fs.rmSync(`${임시}.zip`, { force: true });
  }
}

async function main() {
  const 적는다 = process.argv.includes('--적는다');
  const 몇개 = Number(인자('--몇개', '0')) || Infinity;
  const 쉼 = Number(인자('--쉼', '1200'));

  const 열쇠 = 열쇠읽기();
  if (!열쇠) { console.log('⬜ EDINET 열쇠를 못 찾았다 — 재지 못했다. 「없다」가 아니다.'); process.exit(0); }

  const 길들 = [];
  for (const 날 of fs.readdirSync(곳간)) {
    const d = path.join(곳간, 날);
    if (!fs.statSync(d).isDirectory()) continue;
    for (const f of fs.readdirSync(d)) if (f.endsWith('.json')) 길들.push(path.join(d, f));
  }
  const 한벌들 = 길들.map((p) => { try { return { ...JSON.parse(fs.readFileSync(p, 'utf8')), _길: p }; } catch { return null; } });
  const 할것 = 할것고르기(한벌들).slice(0, 몇개 === Infinity ? undefined : 몇개);

  console.log(`■ 모아 둔 보고서 ${길들.length}건 · 대표자 칸이 없는 것 ${할것고르기(한벌들).length}건`);
  console.log(`   이번에 ${할것.length}건 · 건당 ${쉼}ms 쉼 · ${적는다 ? '적는다' : '**재 보기만 한다**'}`);
  if (!할것.length) { console.log('✅ 되받을 것이 없다'); process.exit(0); }

  const 임시뿌리 = path.join(process.env.TEMP || 뿌리, 'edinet-되받기');
  fs.mkdirSync(임시뿌리, { recursive: true });

  let 받음 = 0; let 있음 = 0; let 없음 = 0; const 못받음 = [];
  const 시작 = Date.now();
  for (const [i, x] of 할것.entries()) {
    const r = await 한건(x.docID, 열쇠, 임시뿌리);
    if (r.꼴 !== '받음') { 못받음.push(`${x.docID}(${r.코드})`); await 참자(쉼); continue; }
    받음 += 1;
    if (r.값) 있음 += 1; else 없음 += 1;
    if (적는다) {
      const { _길, ...알맹이 } = x;
      fs.writeFileSync(_길, JSON.stringify({ ...알맹이, representative_raw: r.값 }, null, 1), 'utf8');
    }
    if (i < 5 || (i + 1) % 50 === 0) {
      console.log(`   ${i + 1}/${할것.length} ${x.docID} ${String(x.name ?? '').slice(0, 14)} → ${r.값 ?? '(서류에 없다)'}`);
    }
    await 참자(쉼);
  }
  fs.rmSync(임시뿌리, { recursive: true, force: true });

  const 분 = ((Date.now() - 시작) / 60000).toFixed(1);
  console.log(`\n■ 받음 ${받음} (대표자 있음 ${있음} · 서류에 없음 ${없음}) · 못 받음 ${못받음.length} · ${분}분`);
  if (못받음.length) {
    console.log(`   ⬜ 못 받은 것 — ${못받음.slice(0, 8).join(' · ')}${못받음.length > 8 ? ' …' : ''}`);
    console.log('   ⛔ 못 받은 것에는 칸을 안 만들었다. 다시 돌리면 그것부터 다시 받는다.');
  }
  if (!적는다) console.log('⚠ 재 보기만 했다 — 적으려면 `--적는다`');
  process.exit(0);
}

/* ── 자가시험 ─────────────────────────────────────────────────── */
if (process.argv.includes('--자가시험')) {
  let 통 = 0; const 진 = [];
  const 검 = (n, ok) => { if (ok) 통 += 1; else 진.push(n); };

  검('🔴 칸이 없는 것만 고른다', 할것고르기([
    { docID: 'A' }, { docID: 'B', representative_raw: '代表取締役社長　甲' },
  ]).length === 1);
  검('🔴🔴 «서류에 없더라»(null)도 다 된 것이다 — 다시 받지 않는다', 할것고르기([
    { docID: 'A', representative_raw: null },
  ]).length === 0);
  검('⛔ docID 가 없으면 못 받는다 — 고르지 않는다', 할것고르기([{ name: 'x' }]).length === 0);
  검('⛔ 빈 입력에도 안 죽는다', 할것고르기([]).length === 0 && 할것고르기(null).length === 0
    && 할것고르기([null, undefined]).length === 0);
  검('⛔ 열쇠를 화면에 찍지 않는다', !fs.readFileSync(fileURLToPath(import.meta.url), 'utf8')
    .match(/console\.log\([^)]*열쇠(?!를)/));

  for (const n of 진) console.log('🔴', n);
  console.log(진.length ? `🔴 자가시험 ${진.length} 떨어졌다` : `✅ 자가시험 ${통} 통과`);
  process.exit(진.length ? 1 : 0);
}

main();
