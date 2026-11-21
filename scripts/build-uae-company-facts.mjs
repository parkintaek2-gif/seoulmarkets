#!/usr/bin/env node
/**
 * build-uae-company-facts.mjs — **UAE 상장사 한 곳을 지면에 낼 재료를 한 벌로 모은다.**
 * (5번, 2026-09-24)
 *
 * ── 🔴 왜 있나 ────────────────────────────────────────────────────────
 * Live 네 나라 가운데 **UAE 만 회사 낱장 지면이 없다.** 한국·일본·대만은 다 있다.
 * 자료가 없어서가 아니라 **네 곳에 흩어져 있어서**다 —
 * ```
 *   재무      src/data/uae-financials-tape.json         손익·대차 398행
 *   회사이름  ADX 는 공시 제목 안에 · DFM 은 프로필에    꼴이 서로 다르다
 *   업종      DFM 프로필에만 있다                        ADX 는 아직 없다
 *   주식수    DFM 프로필에만 있다                        ADX 는 아직 없다
 * ```
 * 대만은 tape 하나에 다 들어 있어 지면이 바로 섰다. UAE 는 이 자가 그 한 벌을 만든다.
 *
 * ── ⛔ 이 자가 지키는 것 ───────────────────────────────────────────────
 * ⛔ **시가총액을 이 파일에 담지 않는다.** ADX 약관 판정(2026-09-18)이 「쌓되 싣지 않는다」다.
 *   배수를 가르는 데만 쓰고, 가른 «배수»만 남긴다. 시총 자체는 나가지 않는다.
 * ⛔ **못 잰 칸을 ** 비우고, 왜 비었는지 함께 적는다.
 * ⛔ **환율을 만들어 곱하지 않는다.** 디르함은 디르함으로 적는다.
 * ⚠ 손익은 그 회사의 «회계 기간»이 섞여 있다(Q2 2026 · 2025 …). 기간을 반드시 함께 낸다 —
 *   한국(FY)·대만(누계)과 나란히 놓고 보는 손님이 속지 않게.
 *
 * 쓰는 법
 *   node scripts/build-uae-company-facts.mjs --자가시험
 *   node scripts/build-uae-company-facts.mjs            재기만 한다
 *   node scripts/build-uae-company-facts.mjs --적는다    src/data 에 적는다
 */
import fs from 'node:fs';
import path from 'node:path';
import { 배수가르기 } from '../src/lib/uae-balance-scale.mjs';

const 뿌리 = path.resolve(import.meta.dirname, '..');
const 나가는곳 = path.join(뿌리, 'src/data/uae-company-facts.json');

/**
 * ADX 공시 제목에서 회사 이름을 뽑는다.
 * 제목 꼴 — 「TWO POINT ZERO GROUP - P.J.S.C Financial Results for the Period Ended June 30,2026」
 * ⛔ DFM 제목에는 이름이 «없다»(「Financial statements for the year of 2025」). null 을 낸다.
 */
export function ADX이름뽑기(제목) {
  const s = String(제목 ?? '').trim();
  if (!s) return null;
  const 자른 = s.replace(/\s*(Financial\s+(Results|Statements)|Interim|Consolidated|Annual\s+Report)\b.*$/i, '').trim();
  /* 제목이 「Financial statements…」로 시작하면 자른 뒤 빈다 — 그 꼴에는 이름이 없다 */
  if (!자른 || 자른.length < 3) return null;
  return 자른.replace(/\s{2,}/g, ' ');
}

/** 그 회사의 여러 줄 가운데 «가장 최근» 줄을 고른다. 기간 글자가 아니라 date 로 고른다 */
export function 최근줄고르기(줄들) {
  const 벌 = (줄들 ?? []).filter(Boolean);
  if (!벌.length) return null;
  return vbest(벌);
  function vbest(a) {
    let 최 = a[0];
    for (const r of a) if (String(r.date ?? '') > String(최.date ?? '')) 최 = r;
    return 최;
  }
}

/**
 * 디르함 금액 한 칸 — 수가 아니면 null. 0 은 «값»이므로 살린다.
 *
 * 🔴 [2026-09-24] 처음에 `Number(v)` 만 썼다가 자가시험이 잡았다 —
 *   `Number(null)` 도 `Number('')` 도 **0** 이다. 그러면 «못 잰 칸»이 조용히 0 이 되어
 *   지면에 「매출 0」으로 나간다. 이 저장소가 가장 경계하는 잘못이 바로 그것이다
 *   (강령 ③ —  · 「0 과 못 쟀다는 다르다」).
 * ⇒ 빈 것·빈 글자를 먼저 걸러 낸다.
 */
export function 돈(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string' && v.trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** 이 회사를 지면으로 낼 만한가 — 손익 가운데 하나라도 있으면 낸다 */
export function 낼만한가(모음) {
  if (!모음 || !모음.symbol) return false;
  const r = 모음.최근 || {};
  return 돈(r.revenue_aed) !== null || 돈(r.net_profit_aed) !== null;
}

/* ── 자가시험 ─────────────────────────────────────────────── */
if (process.argv.includes('--자가시험')) {
  const 잰다 = [];
  const 본다 = (이름, v) => 잰다.push([이름, !!v]);

  본다('ADX 제목에서 이름을 뽑는다',
    ADX이름뽑기('Abu Dhabi Commercial Bank Financial Results for the Period Ended June 30,2026')
      === 'Abu Dhabi Commercial Bank');
  본다('「Financial Statements」 꼴도 자른다',
    ADX이름뽑기('Al Buhaira National Insurance Company Financial Statements for 2025')
      === 'Al Buhaira National Insurance Company');
  본다('🔴 DFM 꼴에는 이름이 없다 — null 을 낸다',
    ADX이름뽑기('Financial statements for the year of 2025') === null);
  본다('⛔ 빈 것에 안 터진다', ADX이름뽑기(null) === null);
  본다('⛔ 너무 짧으면 이름으로 안 본다', ADX이름뽑기('AB Financial Results for 2025') === null);

  본다('가장 최근 줄을 고른다',
    최근줄고르기([{ date: '2025-01-01' }, { date: '2026-07-30' }, { date: '2026-01-01' }]).date === '2026-07-30');
  본다('⛔ 빈 것에 안 터진다', 최근줄고르기([]) === null);
  본다('⛔ 빈 것에 안 터진다 2', 최근줄고르기(null) === null);

  본다('0 은 값이다 — 살린다', 돈(0) === 0);
  본다('수가 아니면 null', 돈('abc') === null);
  /* 🔴 Number(null) 도 Number('') 도 0 이다 — 못 잰 칸이 조용히 0 이 되는 자리다 */
  본다('🔴 빈 것을 0 으로 만들지 않는다', 돈(null) === null);
  본다('🔴 빈 글자도 0 으로 만들지 않는다', 돈('') === null);
  본다('🔴 공백만 있어도 0 으로 만들지 않는다', 돈('   ') === null);
  본다('⛔ undefined 도 마찬가지', 돈(undefined) === null);

  본다('손익이 하나라도 있으면 낸다', 낼만한가({ symbol: 'X', 최근: { net_profit_aed: 5 } }) === true);
  본다('매출만 있어도 낸다', 낼만한가({ symbol: 'X', 최근: { revenue_aed: 5 } }) === true);
  본다('⛔ 손익이 둘 다 없으면 안 낸다', 낼만한가({ symbol: 'X', 최근: { total_assets_aed: 5 } }) === false);
  본다('⛔ 종목코드가 없으면 안 낸다', 낼만한가({ 최근: { net_profit_aed: 5 } }) === false);
  본다('⛔ 빈 것에 안 터진다', 낼만한가(null) === false);

  const 진 = 잰다.filter(([, v]) => !v);
  for (const [이름, v] of 잰다) console.log(`${v ? '✅' : '🔴'} ${이름}`);
  console.log(진.length ? `\n🔴 ${진.length}/${잰다.length} 떨어졌다` : `\n✅ 자가시험 ${잰다.length} 통과`);
  process.exit(진.length ? 1 : 0);
}

/* ── 본 작업 ──────────────────────────────────────────────── */
{
  const 적나 = process.argv.includes('--적는다');
  console.log('■ UAE 상장사 지면 재료를 한 벌로 모은다 — Live 넷 가운데 UAE 만 회사 지면이 없다\n');

  const tape = JSON.parse(fs.readFileSync(path.join(뿌리, 'src/data/uae-financials-tape.json'), 'utf8'));
  const 줄들 = tape.rows || [];

  /* DFM 프로필 — 이름·업종·주식수가 여기에만 있다 */
  const DFM프로필 = new Map();
  const dfm길 = path.join(뿌리, 'archive/raw/dubai-dfm-companies');
  for (const f of (fs.existsSync(dfm길) ? fs.readdirSync(dfm길) : [])) {
    if (!f.endsWith('.json') || f.startsWith('_')) continue;
    try {
      const c = JSON.parse(fs.readFileSync(path.join(dfm길, f), 'utf8')).company;
      if (c?.symbol) DFM프로필.set(String(c.symbol), c);
    } catch { /* 한 파일이 깨져도 나머지를 버리지 않는다 */ }
  }

  /* 시가총액 — ⛔ 배수를 가르는 데«만» 쓴다. 이 파일에 담지 않는다 */
  const 시총표 = new Map();
  const mw길 = path.join(뿌리, 'archive/raw/uae-adx-marketwatch');
  const mw파일 = (fs.existsSync(mw길) ? fs.readdirSync(mw길).filter((f) => f.endsWith('.json')).sort() : []);
  if (mw파일.length) {
    try {
      const j = JSON.parse(fs.readFileSync(path.join(mw길, mw파일[mw파일.length - 1]), 'utf8'));
      for (const r of (Array.isArray(j) ? j : (j.rows || j.data || []))) {
        const cap = Number(r?.marketCap);
        if (r?.symbol && Number.isFinite(cap) && cap > 0) 시총표.set(String(r.symbol), cap);
      }
    } catch { /* 없으면 배수를 「보고서 표기」로만 가른다 */ }
  }

  /* 회사별로 묶는다 */
  const 회사별 = new Map();
  for (const r of 줄들) {
    const 키 = String(r.symbol);
    if (!회사별.has(키)) 회사별.set(키, []);
    회사별.get(키).push(r);
  }

  const 회사들 = [];
  for (const [symbol, 벌] of 회사별) {
    const 최근 = 최근줄고르기(벌);
    if (!최근) continue;
    const 거래소 = String(최근.exchange || '');
    const 프로필 = DFM프로필.get(symbol) || null;
    const 이름 = (거래소 === 'DFM' ? (프로필?.fullName || null) : null)
      ?? ADX이름뽑기(최근.title)
      ?? 벌.map((r) => ADX이름뽑기(r.title)).find(Boolean)
      ?? null;

    const 가름 = 배수가르기(최근, 시총표.get(symbol) ?? null);
    const 곱 = (v) => {
      const n = 돈(v);
      return (가름.배수 === null || n === null) ? null : n * 가름.배수;
    };

    const 한벌 = {
      symbol,
      exchange: 거래소,
      name: 이름,
      sector: 프로필?.sector || null,
      isin: 프로필?.isin || 최근.isin || null,
      auditor: 프로필?.auditor || null,
      listedOn: 프로필?.dateOfListing || null,
      최근: {
        period: 최근.period || null,
        priorPeriod: 최근.prior_period || null,
        date: 최근.date || null,
        revenue_aed: 돈(최근.revenue_aed),
        net_profit_aed: 돈(최근.net_profit_aed),
        eps: 돈(최근.eps),
        cash_aed: 돈(최근.cash_and_equivalents_aed),
        /* 🔴 대차대조표는 «가른 배수»를 곱해서 낸다. 못 갈랐으면 셋 다 비운다 */
        total_assets_aed: 곱(최근.total_assets_aed),
        total_liabilities_aed: 곱(최근.total_liabilities_aed),
        total_equity_aed: 곱(최근.total_equity_aed),
        balanceScale: 가름.배수,
        balanceScaleHow: 가름.어떻게,
        balanceScaleWhy: 가름.왜,
        reconciled: Boolean(최근.balance_sheet_reconciled),
        unitHint: 최근.unit_hint || null,
        pdf: 최근.eng_pdf_url || null,
      },
      /* 이력 — 기간마다 한 줄. 지면이 흐름을 그린다 */
      이력: 벌
        .slice()
        .sort((a, b) => String(a.date ?? '').localeCompare(String(b.date ?? '')))
        .map((r) => ({
          period: r.period || null,
          revenue_aed: 돈(r.revenue_aed),
          net_profit_aed: 돈(r.net_profit_aed),
          eps: 돈(r.eps),
        })),
    };
    if (낼만한가(한벌)) 회사들.push(한벌);
  }

  회사들.sort((a, b) => String(a.name || a.symbol).localeCompare(String(b.name || b.symbol), 'en'));

  const 이름있음 = 회사들.filter((c) => c.name).length;
  const 업종있음 = 회사들.filter((c) => c.sector).length;
  const 대차있음 = 회사들.filter((c) => c.최근.total_equity_aed !== null).length;
  const ADX수 = 회사들.filter((c) => c.exchange === 'ADX').length;
  const DFM수 = 회사들.filter((c) => c.exchange === 'DFM').length;

  console.log(`   지면으로 낼 회사  ${회사들.length}곳  (ADX ${ADX수} · DFM ${DFM수})`);
  console.log(`   이름이 있는 곳    ${이름있음}/${회사들.length}`);
  console.log(`   업종이 있는 곳    ${업종있음}/${회사들.length}  ⬜ ADX 업종 우물을 아직 못 찾았다`);
  console.log(`   대차가 선 곳      ${대차있음}/${회사들.length}  (못 가른 곳은 비웠다)`);

  if (이름있음 < 회사들.length) {
    console.log('\n   ⬜ 이름을 못 뽑은 곳:');
    for (const c of 회사들.filter((x) => !x.name).slice(0, 8)) console.log(`      ${c.exchange}:${c.symbol}`);
  }

  if (!적나) { console.log('\n⬜ 재기만 했다. 적으려면 --적는다'); process.exit(0); }

  const 낼것 = {
    _meta: {
      product: 'UAE listed-company facts — one record per company, ready for a page',
      builtAt: new Date().toLocaleString('sv-SE').replace(' ', 'T'),
      companies: 회사들.length,
      sources: [
        'src/data/uae-financials-tape.json (ADX/DFM filed statements)',
        'archive/raw/dubai-dfm-companies (DFM public company profile)',
      ],
      marketCapNote: 'Market capitalisation is deliberately NOT carried in this file. '
        + 'ADX terms of use do not permit republishing exchange market data; it is used only '
        + 'internally, to decide whether a balance sheet is stated in dirhams or thousands.',
    },
    companies: 회사들,
  };
  fs.writeFileSync(나가는곳, JSON.stringify(낼것, null, 1));
  console.log(`\n✅ 적었다 — src/data/uae-company-facts.json (${회사들.length}곳)`);
  process.exit(0);
}
