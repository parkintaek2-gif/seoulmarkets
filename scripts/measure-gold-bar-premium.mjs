#!/usr/bin/env node
/**
 * measure-gold-bar-premium.mjs — **한국 금시장은 같은 금을 두 값에 팔고 있다.**
 *
 *   node scripts/measure-gold-bar-premium.mjs            재서 src/data 에 낸다
 *   node scripts/measure-gold-bar-premium.mjs --자가시험   자가시험만
 *
 * ── 🔴 왜 만들었나 (2026-09-11 02:5x · 5번) ────────────────────────
 *
 * 고리점검에서 SeoulMarkets 갈래 넷이 얇다고 걸렸고, 까닭이 기사 수임을 셌다
 * (commodities 6편). 그래서 자료를 보러 갔더니 —
 *
 *   `archive/raw/commodities` 폴더가 **비어 있었다.** 0개.
 *   그런데 `scripts/collect-commodities.mjs` 는 «있고, 돌면» 자료가 온다.
 *   2026-08-04 에 붙여 놓고 그 뒤로 아무도 돌리지 않은 것이다.
 *
 * ⛔ 이것이 그 수집기 머리글에 적힌 사고와 «똑같은 사고»다. 거기 이렇게 적혀 있다 —
 *   「데이터가 열려 있는데 수집기를 안 붙여 두고 「출처가 없다」고 알고 있던 셈이다」.
 *   이번엔 수집기까지 붙여 두고 **안 돌려서** 같은 자리에 다시 섰다.
 *   ⇒ 자를 만드는 것으로 끝나지 않는다. 도는지를 보는 자리에 올려야 한다.
 *
 * ── ⭐ 남들이 안 세는 축 ────────────────────────────────────────
 *
 * KRX 금시장은 **같은 순도(99.99%)의 금을 두 규격으로 상장한다** —
 *   `금 99.99_1kg`     기관·도매 규격
 *   `미니금 99.99_100g` 개인이 사는 규격
 * 둘은 같은 금인데 **종가가 다르다.** 2026-09-09 실측: 1kg 191,000 · 미니 193,000.
 * 즉 개인 규격이 «비싸다». 그 차이를 세는 곳이 없다.
 *
 * ⛔ 이 자가 지키는 것
 *   · **「프리미엄」을 한 날의 값으로 말하지 않는다.** 날마다 재서 분포를 낸다
 *   · 두 종목이 «같은 날 다 있는» 날만 견준다 — 한쪽만 있는 날을 
 *   · ⛔ 평균을 쓰지 않는다. 중앙값과 «가장 좁은 날·가장 넓은 날»을 함께 낸다
 *   · 거래량을 함께 낸다 — 미니금이 얇은 시장이면 그 값차의 뜻이 다르다.
 *     ⚠ 이 자는 「왜」를 말하지 않는다. 얼마나 벌어지나까지다
 *   · 자료가 셋 미만인 날짜 창으로는 값을 내지 않는다(적어도날)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const 밑감방 = path.join(뿌리, 'archive/raw/commodities');
export const 낼곳 = path.join(뿌리, 'src/data/gold-bar-premium.json');

/** 이보다 적은 날로는 값을 내지 않는다 — 한두 날로 「프리미엄」을 말하지 않는다 */
export const 적어도날 = 3;
/** 두 규격의 이름 — ⛔ 이름으로 «짐작»하지 않는다. 실측한 상장명 그대로다 */
export const 큰바 = '금 99.99_1kg';
export const 작은바 = '미니금 99.99_100g';

/** 한 날의 두 종목을 짝지어 값차를 낸다. ⛔ 한쪽이 없으면 null — 채우지 않는다 */
export function 하루짝(줄들) {
  const 금 = (줄들 ?? []).filter((r) => r && r.시장 === '금');
  const 큰 = 금.find((r) => String(r.이름).trim() === 큰바) ?? null;
  const 작 = 금.find((r) => String(r.이름).trim() === 작은바) ?? null;
  if (!큰 || !작) return null;
  const a = Number(큰.종가); const b = Number(작.종가);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0) return null;
  return {
    날: String(큰.일자 ?? 작.일자 ?? ''),
    큰종가: a,
    작은종가: b,
    /* 큰 바를 기준으로 «몇 %» 비싼가. 음수면 미니가 싸다 — 그것도 결과다 */
    프리미엄: (b - a) / a,
    큰거래량: Number.isFinite(Number(큰.거래량)) ? Number(큰.거래량) : null,
    작은거래량: Number.isFinite(Number(작.거래량)) ? Number(작.거래량) : null,
    큰등락률: Number.isFinite(Number(큰.등락률)) ? Number(큰.등락률) : null,
    작은등락률: Number.isFinite(Number(작.등락률)) ? Number(작.등락률) : null,
  };
}

/** ⛔ 비면 null. 평균이 아니라 중앙값이다 */
export function 가운뎃값(수들) {
  const v = (수들 ?? []).map(Number).filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

/**
 * 두 규격이 «같은 날 같은 방향으로» 움직였나를 센다.
 * ⭐ 같은 금인데 방향이 갈리는 날이 있다면 그것은 두 규격이 «따로 값이 매겨진다»는 뜻이다.
 * ⛔ 등락률이 한쪽이라도 없으면 그 날은 세지 않는다(못 쟀다).
 */
export function 방향세기(짝들) {
  let 같음 = 0; let 갈림 = 0; let 못쟀다 = 0;
  for (const d of 짝들 ?? []) {
    const a = d?.큰등락률; const b = d?.작은등락률;
    if (!Number.isFinite(a) || !Number.isFinite(b)) { 못쟀다 += 1; continue; }
    if (a === 0 || b === 0) { 못쟀다 += 1; continue; }   /* 0 은 방향이 없다 */
    if ((a > 0) === (b > 0)) 같음 += 1; else 갈림 += 1;
  }
  return { 같음, 갈림, 못쟀다 };
}

export function 재기(날파일들) {
  const 짝들 = [];
  let 읽은날 = 0; let 짝못지은날 = 0;
  for (const { 날, 줄들 } of 날파일들 ?? []) {
    읽은날 += 1;
    const d = 하루짝(줄들);
    if (!d) { 짝못지은날 += 1; continue; }
    짝들.push({ ...d, 날: d.날 || 날 });
  }
  짝들.sort((a, b) => String(a.날).localeCompare(String(b.날)));
  const 프 = 짝들.map((d) => d.프리미엄);
  const 넉넉 = 짝들.length >= 적어도날;
  return {
    읽은날,
    짝지은날: 짝들.length,
    짝못지은날,
    넉넉,
    /* ⛔ 날이 모자라면 값을 내지 않는다. null 이 「0」이 아니다 */
    가운데프리미엄: 넉넉 ? 가운뎃값(프) : null,
    가장좁은날: 넉넉 ? 짝들.reduce((a, b) => (b.프리미엄 < a.프리미엄 ? b : a)) : null,
    가장넓은날: 넉넉 ? 짝들.reduce((a, b) => (b.프리미엄 > a.프리미엄 ? b : a)) : null,
    미니가싼날: 짝들.filter((d) => d.프리미엄 < 0).length,
    방향: 방향세기(짝들),
    가운데큰거래량: 가운뎃값(짝들.map((d) => d.큰거래량)),
    가운데작은거래량: 가운뎃값(짝들.map((d) => d.작은거래량)),
    날들: 짝들,
  };
}

export function 자가시험() {
  const 하루 = (큰종가, 작은종가, 날 = '20260909', 더 = {}) => ([
    { 일자: 날, 시장: '금', 이름: 큰바, 종가: 큰종가, 거래량: 1000, 등락률: 더.큰등락률 ?? 1 },
    { 일자: 날, 시장: '금', 이름: 작은바, 종가: 작은종가, 거래량: 20, 등락률: 더.작은등락률 ?? 1 },
    { 일자: 날, 시장: '석유', 유종: '경유', 경쟁가중평균: 1768 },
  ]);
  const 목 = [
    ['하루짝이 두 규격을 짝짓는다', () => {
      const d = 하루짝(하루(191000, 193000));
      return d && d.큰종가 === 191000 && d.작은종가 === 193000;
    }],
    ['프리미엄은 큰 바를 기준으로 낸다', () => {
      const d = 하루짝(하루(200000, 202000));
      return Math.abs(d.프리미엄 - 0.01) < 1e-12;
    }],
    ['🔴 미니가 싸면 음수로 낸다 — 「프리미엄」이라는 이름 때문에 뒤집지 않는다', () => {
      const d = 하루짝(하루(200000, 198000));
      return d.프리미엄 < 0;
    }],
    ['⛔ 한쪽이 없으면 null — 없는 값을 채우지 않는다', () =>
      하루짝([{ 일자: '20260909', 시장: '금', 이름: 큰바, 종가: 191000 }]) === null],
    ['⛔ 석유 줄이 섞여 있어도 금만 본다', () => {
      const d = 하루짝(하루(191000, 193000));
      return d !== null;
    }],
    ['⛔ 종가가 수가 아니면 null', () =>
      하루짝(하루('없음', 193000)) === null && 하루짝(하루(0, 193000)) === null],
    ['⛔ 빈 것도 견딘다', () => 하루짝([]) === null && 하루짝(null) === null],
    ['가운뎃값은 평균이 아니다', () => 가운뎃값([1, 2, 100]) === 2],
    ['⛔ 비면 null', () => 가운뎃값([]) === null && 가운뎃값(null) === null],
    ['🔴 날이 셋보다 적으면 값을 내지 않는다 — 한두 날로 프리미엄을 말하지 않는다', () => {
      const r = 재기([{ 날: '20260908', 줄들: 하루(191000, 193000, '20260908') },
        { 날: '20260909', 줄들: 하루(191000, 193000, '20260909') }]);
      return r.넉넉 === false && r.가운데프리미엄 === null && r.가장넓은날 === null;
    }],
    ['날이 셋이면 낸다', () => {
      const r = 재기(['20260907', '20260908', '20260909'].map((d) => ({ 날: d, 줄들: 하루(200000, 202000, d) })));
      return r.넉넉 === true && Math.abs(r.가운데프리미엄 - 0.01) < 1e-12 && r.짝지은날 === 3;
    }],
    ['🔴 짝을 못 지은 날을 «세어서 낸다» — 조용히 빼지 않는다', () => {
      const r = 재기([
        { 날: '20260907', 줄들: 하루(200000, 202000, '20260907') },
        { 날: '20260908', 줄들: [{ 일자: '20260908', 시장: '금', 이름: 큰바, 종가: 200000 }] },
        { 날: '20260909', 줄들: 하루(200000, 202000, '20260909') },
      ]);
      return r.읽은날 === 3 && r.짝지은날 === 2 && r.짝못지은날 === 1;
    }],
    ['가장 좁은 날과 넓은 날을 함께 낸다 — 한 날의 수를 「그 프리미엄」이라 부르지 않기 위해', () => {
      const r = 재기([
        { 날: 'a', 줄들: 하루(200000, 201000, 'a') },
        { 날: 'b', 줄들: 하루(200000, 206000, 'b') },
        { 날: 'c', 줄들: 하루(200000, 202000, 'c') },
      ]);
      return r.가장좁은날.날 === 'a' && r.가장넓은날.날 === 'b';
    }],
    ['방향세기가 갈린 날을 센다', () => {
      const r = 방향세기([{ 큰등락률: 1, 작은등락률: -1 }, { 큰등락률: 1, 작은등락률: 2 }]);
      return r.갈림 === 1 && r.같음 === 1;
    }],
    ['⛔ 등락률 0 은 방향이 없다 — 「같다」로 세지 않는다', () => {
      const r = 방향세기([{ 큰등락률: 0, 작은등락률: 1 }]);
      return r.못쟀다 === 1 && r.같음 === 0 && r.갈림 === 0;
    }],
    ['⛔ 등락률이 없으면 못 쟀다로 센다', () => {
      const r = 방향세기([{ 큰등락률: null, 작은등락률: 1 }, {}]);
      return r.못쟀다 === 2;
    }],
    ['⛔ 빈 것도 견딘다 (방향)', () => {
      const r = 방향세기(null);
      return r.같음 === 0 && r.갈림 === 0 && r.못쟀다 === 0;
    }],
    ['미니가 싼 날을 따로 센다', () => {
      const r = 재기([
        { 날: 'a', 줄들: 하루(200000, 199000, 'a') },
        { 날: 'b', 줄들: 하루(200000, 206000, 'b') },
        { 날: 'c', 줄들: 하루(200000, 202000, 'c') },
      ]);
      return r.미니가싼날 === 1;
    }],
  ];
  let 통 = 0; const 실 = [];
  for (const [이름, 재본다] of 목) {
    let ok = false;
    try { ok = !!재본다(); } catch { ok = false; }
    if (ok) 통 += 1; else 실.push(이름);
  }
  console.log(`금 두 규격 검사 — 자가시험 ${통}/${목.length}`);
  실.forEach((x) => console.log(`   X ${x}`));
  return 실.length;
}

const 나 = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (나) {
  const 흠 = 자가시험();
  if (process.argv.includes('--자가시험')) process.exit(흠 ? 1 : 0);
  if (흠) { console.log('🔴 자가시험이 깨졌다 — 값을 내지 않는다'); process.exit(1); }

  if (!fs.existsSync(밑감방)) {
    console.log(`⬜ 못 쟀다 — 밑감방이 없다: ${path.relative(뿌리, 밑감방)}`);
    console.log('   node scripts/collect-commodities.mjs --from <날> --to <날> 로 먼저 받는다');
    process.exit(0);
  }
  const 파일들 = fs.readdirSync(밑감방).filter((f) => /^\d{8}\.ndjson$/.test(f)).sort();
  const 날파일들 = 파일들.map((f) => ({
    날: f.slice(0, 8),
    줄들: fs.readFileSync(path.join(밑감방, f), 'utf8').split(/\r?\n/)
      .filter((s) => s.trim()).map((s) => { try { return JSON.parse(s); } catch { return null; } })
      .filter(Boolean),
  }));
  const r = 재기(날파일들);

  const 퍼 = (v) => (v == null ? '—' : `${(v * 100).toFixed(3)}%`);
  console.log('');
  console.log(`■ 날 파일 ${r.읽은날}개 · 두 규격이 다 있는 날 ${r.짝지은날} · 짝 못 지은 날 ${r.짝못지은날}`);
  if (!r.넉넉) {
    console.log(`⬜ 못 쟀다 — 짝지은 날이 ${r.짝지은날}개다(적어도 ${적어도날}). 값을 내지 않는다`);
    process.exit(0);
  }
  console.log(`■ 미니금(100g)이 1kg 보다 «비싼» 정도 — 가운뎃값 ${퍼(r.가운데프리미엄)}`);
  console.log(`   가장 좁은 날 ${r.가장좁은날.날} ${퍼(r.가장좁은날.프리미엄)}`
    + ` · 가장 넓은 날 ${r.가장넓은날.날} ${퍼(r.가장넓은날.프리미엄)}`);
  console.log(`   미니가 «싼» 날 ${r.미니가싼날}일 / ${r.짝지은날}일`);
  console.log(`■ 같은 날 등락 방향 — 같음 ${r.방향.같음} · 갈림 ${r.방향.갈림} · 못 쟀다 ${r.방향.못쟀다}`);
  console.log(`■ 거래량 가운뎃값 — 1kg ${Number(r.가운데큰거래량).toLocaleString('en-US')}`
    + ` · 미니 ${Number(r.가운데작은거래량).toLocaleString('en-US')}`);
  console.log('   ⚠ 이 자는 «왜»를 말하지 않는다. 얼마나 벌어지나까지다');

  const 낼것 = {
    잰때: new Date().toISOString(),
    밑감: 'archive/raw/commodities/<날짜>.ndjson',
    무엇을세나: 'KRX 금시장에 같은 순도(99.99%)로 상장된 두 규격의 종가 차이. 1kg 바를 기준으로 100g 미니바가 몇 % 비싼가.',
    ...r,
  };
  fs.writeFileSync(낼곳, `${JSON.stringify(낼것, null, 2)}\n`, 'utf8');
  console.log(`\n  ✅ 냈다 — ${path.relative(뿌리, 낼곳)}`);
}
