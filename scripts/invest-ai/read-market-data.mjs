#!/usr/bin/env node
/**
 * read-market-data.mjs — **투자 AI 가 우리 마켓 데이터를 읽어 「어떤 종목인가」를 판단한다.**
 *
 * ── 🔴🔴 왜 있나 ──────────────────────────────────────────────────────
 * 사장님 (2026-09-24):
 *   「**투자ai는 지금 구축 중인 마켓 데이터를 읽을 수 있고, 그걸로 어떤 종목인 지
 *     판단할 수 있게도 해라. 애널 리포트, 공시, 뉴스 등도 당연히 학습해야 한다
 *     :::매우 중요한 업무이다.**」
 *
 * 우리는 2,709개사 재무·밸류에이션과 893건 공시를 이미 모아 두었다. 그런데 투자 AI 는
 * 그것을 **한 줄도 읽지 않고** 있었다(2026-09-24 실측). 뉴스만 사람이 읽어 넣었고,
 * 그마저 담당이던 6번 자리가 없어지며 09-15 에 멈췄다.
 *
 * ── ⛔ 이 자가 하지 않는 것 ────────────────────────────────────────────
 * ⛔ **시세를 예측하지 않는다. 매수·매도를 권하지 않는다.**
 *   내는 것은 「이 회사가 지금 어떤 상태인가」라는 **사실의 구조화**다.
 *   판독지침에 이미 못박혀 있다 — 「신호는 «무슨 일이 있었나»의 구조화 기록이지 매수·매도가 아니다」.
 * ⛔ **못 잰 것은 ** 값이 없으면 그 축은 «못 쟀다»로 둔다.
 *   (Number(null) 이 0 이 되는 함정을 UAE 에서 한 번 겪었다.)
 * ⛔ 판단은 여기(규칙)가 하고 LLM 은 손대지 않는다. 결정론이다 — 같은 입력이면 같은 답.
 *
 * ── 무엇을 읽나 ───────────────────────────────────────────────────────
 *   korea-valuation-tape.json    2,709사 · 시총·순익·자본·자산·매출·영업익·유동자산/부채
 *   korea-financials-tape.json   13,545행(여러 해) · 해마다 매출·영업익·순익 → **성장**을 잰다
 *   korea-disclosures-feed.json  893건 · 갈래(e)와 무게(w)가 이미 매겨져 있다 → **사건**
 *
 * 쓰는 법
 *   node scripts/invest-ai/read-market-data.mjs              오늘 신호를 만들어 화면에 낸다
 *   node scripts/invest-ai/read-market-data.mjs --적는다      signals-<오늘>.jsonl 로 저장한다
 *   node scripts/invest-ai/read-market-data.mjs --종목 005930 한 종목만 자세히 본다
 *   node scripts/invest-ai/read-market-data.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 여기 = path.dirname(fileURLToPath(import.meta.url));
export const 뿌리 = path.resolve(여기, '..', '..');
export const 모델 = 'read-market-data/1.0';

/** 오늘(KST). ⛔ UTC 로 바꾸지 않는다 */
export function 오늘8자리(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
}

/**
 * 🔴 못 잰 칸을 0 으로 만들지 않는다.
 *   `Number(null)` 도 `Number('')` 도 0 이다 — 그대로 쓰면 「자본이 0 인 회사」가 무더기로 생긴다.
 *   UAE 회사 지면에서 한 번 겪은 함정이라 여기서도 같은 자를 쓴다.
 */
export function 돈(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string' && v.trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** 나눗셈 — 나눌 수 없으면 null. 0 으로 나누어 Infinity 를 만들지 않는다 */
export function 나누기(a, b) {
  const x = 돈(a); const y = 돈(b);
  if (x === null || y === null || y === 0) return null;
  const r = x / y;
  return Number.isFinite(r) ? r : null;
}

/* ═══════════════════ 1. 종목의 «성격»을 가른다 ═══════════════════ */

/**
 * 한 회사의 밸류에이션 한 줄을 읽어 다섯 축을 잰다.
 * ⚠ 각 축은 «못 쟀다»(null)를 가질 수 있다. 못 잰 축은 판정에서 빠진다.
 */
export function 다섯축(행) {
  const 시총 = 돈(행?.marketCap);
  const 순익 = 돈(행?.netIncome);
  const 자본 = 돈(행?.totalEquity);
  const 자산 = 돈(행?.totalAssets);
  const 매출 = 돈(행?.revenue);
  const 영업익 = 돈(행?.operatingIncome);
  const 유동자산 = 돈(행?.currentAssets);
  const 유동부채 = 돈(행?.currentLiabilities);

  return {
    per: 순익 !== null && 순익 > 0 ? 나누기(시총, 순익) : null,   /* 적자면 PER 을 내지 않는다 */
    pbr: 자본 !== null && 자본 > 0 ? 나누기(시총, 자본) : null,
    roe: 자본 !== null && 자본 > 0 ? 나누기(순익, 자본) : null,
    영업이익률: 매출 !== null && 매출 > 0 ? 나누기(영업익, 매출) : null,
    부채비율: 자본 !== null && 자본 > 0 && 자산 !== null ? 나누기(자산 - 자본, 자본) : null,
    유동비율: 나누기(유동자산, 유동부채),
    적자인가: 순익 === null ? null : 순익 < 0,
    자본잠식인가: 자본 === null ? null : 자본 <= 0,
  };
}

/**
 * 다섯 축으로 «어떤 종목인가»를 이름 붙인다.
 * ⛔ 「사라」·「팔라」가 아니다. 성격표다 — 손님이 종목을 고를 때 쓰는 갈래다.
 * ⚠ 못 잰 축은 그 딱지를 붙이지 않는다. 「모른다」를 「아니다」로 바꾸지 않는다.
 */
export function 성격딱지(축) {
  const 딱지 = [];
  if (축.자본잠식인가 === true) 딱지.push('자본잠식');
  if (축.적자인가 === true) 딱지.push('적자');
  if (축.pbr !== null && 축.pbr < 0.7) 딱지.push('저PBR');
  if (축.per !== null && 축.per > 0 && 축.per < 8) 딱지.push('저PER');
  if (축.roe !== null && 축.roe >= 0.15) 딱지.push('고ROE');
  if (축.영업이익률 !== null && 축.영업이익률 >= 0.15) 딱지.push('고마진');
  if (축.영업이익률 !== null && 축.영업이익률 < 0) 딱지.push('영업적자');
  if (축.부채비율 !== null && 축.부채비율 >= 3) 딱지.push('고부채');
  if (축.유동비율 !== null && 축.유동비율 < 1) 딱지.push('유동성주의');
  return 딱지;
}

/* ═══════════════════ 2. 여러 해를 맞대어 «성장»을 잰다 ═══════════════════ */

/**
 * 한 회사의 해마다 재무를 받아 최근 두 해의 증가율을 낸다.
 * ⚠ 두 해가 다 있어야 잰다. 한 해뿐이면 «못 쟀다».
 */
export function 성장률(해마다) {
  const 정렬 = (해마다 ?? []).filter((r) => Number.isFinite(Number(r?.year)))
    .sort((a, b) => Number(a.year) - Number(b.year));
  if (정렬.length < 2) return { 매출증가: null, 영업익증가: null, 해: null };
  const 뒤 = 정렬[정렬.length - 1];
  const 앞 = 정렬[정렬.length - 2];
  const 늘었나 = (a, b) => {
    const x = 돈(a); const y = 돈(b);
    if (x === null || y === null || y <= 0) return null;
    return (x - y) / y;
  };
  return {
    매출증가: 늘었나(뒤.revenue_krw, 앞.revenue_krw),
    영업익증가: 늘었나(뒤.operating_profit_krw, 앞.operating_profit_krw),
    해: `${앞.year}→${뒤.year}`,
  };
}

/* ═══════════════════ 3. 신호로 바꾼다 ═══════════════════ */

/**
 * 공시 한 건을 신호로. 갈래(e)와 무게(w)가 이미 매겨져 있으니 그것을 쓴다.
 * ⚠ 방향은 «갈래»가 정한다. 우리가 주가를 짐작하지 않는다.
 */
export const 공시방향 = {
  'delisting-risk': -1, 'going-concern': -1, 'capital-impairment': -1,
  'lawsuit': -1, 'penalty': -1, 'default': -1,
  'control-change': 0, 'ceo-change': 0, 'director-change': 0,
  'financial-report': 0, 'board-outcome': 0,
  'buyback': 1, 'dividend': 1, 'capex': 1, 'supply-contract': 1,
};

export function 공시를신호로(c) {
  if (!c || !c.t || !c.d || !c.e) return null;
  const 방향 = 공시방향[c.e];
  if (방향 === undefined) return null;                    /* 모르는 갈래는 «만들지 않는다» */
  const 세기 = Math.max(0, Math.min(3, Math.round((Number(c.w) || 0) / 3)));
  return {
    ts: String(c.d),
    source: 'DART 중대공시',
    sourceId: `dart:${c.url ? c.url.split('rcpNo=')[1] || c.url : `${c.t}:${c.d}:${c.e}`}`,
    entity: { market: c.m === 'KOSDAQ' ? 'KOSDAQ' : 'KOSPI', code: String(c.t) },
    kind: '공시',
    direction: 방향,
    strength: 세기,
    horizon: 30,
    evidence: `${c.n ?? c.t} — ${c.e} (무게 ${c.w})`,
    model: 모델,
  };
}

/**
 * 재무·밸류에이션을 읽어 「어떤 종목인가」 신호로. 사건이 아니라 «상태»다.
 * ⚠ direction 0 을 쓴다 — 상태는 방향이 아니다. 방향을 지어내지 않는다.
 */
export function 상태를신호로(행, 축, 딱지, 성장, 날) {
  if (!행?.ticker || !딱지.length) return null;
  const 값 = [
    축.pbr !== null ? `PBR ${축.pbr.toFixed(2)}` : null,
    축.per !== null ? `PER ${축.per.toFixed(1)}` : null,
    축.roe !== null ? `ROE ${(축.roe * 100).toFixed(1)}%` : null,
    성장?.매출증가 !== null && 성장?.매출증가 !== undefined
      ? `매출 ${(성장.매출증가 * 100).toFixed(1)}%(${성장.해})` : null,
  ].filter(Boolean).join(' · ');
  return {
    ts: String(행.priceAsOf || 날),
    source: '우리 마켓데이터(재무·밸류에이션)',
    sourceId: `mkt:${행.ticker}:${행.fiscalYear ?? ''}:${행.priceAsOf ?? 날}`,
    entity: { market: 행.market === 'K' ? 'KOSDAQ' : 'KOSPI', code: String(행.ticker) },
    kind: '실적',
    direction: 0,
    strength: Math.min(3, 딱지.length),
    horizon: 90,
    evidence: `${행.name} [${딱지.join('·')}] ${값 || '값 못 잼'}`,
    model: 모델,
  };
}

/* ═══════════════════ 4. 읽어서 낸다 ═══════════════════ */

export function 자료읽기() {
  const 읽 = (n) => {
    try { return JSON.parse(fs.readFileSync(path.join(뿌리, 'src', 'data', n), 'utf8')); }
    catch { return null; }
  };
  return {
    밸류: 읽('korea-valuation-tape.json'),
    재무: 읽('korea-financials-tape.json'),
    공시: 읽('korea-disclosures-feed.json'),
  };
}

/** 공시 자료에서 건 배열을 찾아 낸다 — 칸 이름이 판마다 다르다 */
export function 공시목록(공시) {
  if (!공시) return [];
  for (const k of ['공시', 'rows', 'items', 'list', 'feed']) {
    if (Array.isArray(공시[k])) return 공시[k];
  }
  return Array.isArray(공시) ? 공시 : [];
}

export function 다읽는다({ 밸류, 재무, 공시 }, 날 = 오늘8자리(), 최근일수 = 7) {
  const 신호 = [];
  const 못잰것 = { 시총없음: 0, 자본없음: 0 };

  /* ── 해마다 재무를 회사별로 모은다 ── */
  const 해별 = new Map();
  for (const r of (재무?.rows ?? [])) {
    const c = String(r.code ?? '');
    if (!c) continue;
    if (!해별.has(c)) 해별.set(c, []);
    해별.get(c).push(r);
  }

  /* ── ① 종목 상태 ── */
  for (const 행 of (밸류?.rows ?? [])) {
    const 축 = 다섯축(행);
    if (돈(행.marketCap) === null) 못잰것.시총없음 += 1;
    if (돈(행.totalEquity) === null) 못잰것.자본없음 += 1;
    const 딱지 = 성격딱지(축);
    if (!딱지.length) continue;                       /* 딱지가 없으면 말할 것이 없다 */
    const 성장 = 성장률(해별.get(String(행.ticker)));
    const s = 상태를신호로(행, 축, 딱지, 성장, 날);
    if (s) 신호.push(s);
  }

  /* ── ② 공시 사건 — 최근 것만 ── */
  const 자른날 = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 최근일수);
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  })();
  for (const c of 공시목록(공시)) {
    if (String(c.d ?? '') < 자른날) continue;
    const s = 공시를신호로(c);
    if (s) 신호.push(s);
  }

  return { 신호, 못잰것 };
}

/* ═══════════════════ 4-2. 어제와 견준다 ═══════════════════
 * 🔴🔴 [2026-09-25 · 사장님] 「**투자AI 폴더를 읽고 어떻게 해야 할 지 방법을 강구해**」
 *
 * [무엇이 잘못돼 있었나 — 재서 알았다]
 *   멱등이 «같은 날 파일 안»에서만 걸려 있었다. 날이 바뀌면 새 파일이라
 *   **2,233건이 통째로 다시 적혔다.** 그래서 signals-20260924 와 20260925 가
 *   **글자 하나까지 같았다**(각 801KB). 날마다 같은 것을 다시 쓰고 있었던 것이다.
 *
 * ⛔ 그것은 「배우는 것」이 아니다. 「오늘 상태를 다시 적는 것」이다.
 *   사장님이 짚으셨다 — 「**이름과 하는 일이 다르다**」.
 *
 * [무엇이 신호인가 — 회사가 이미 정해 둔 답이 있었다]
 *   CLAUDE.md 「주력과 서비스」 절 —
 *   > 「명단을 팔려는 것이 아니라, 어제와 맞대어 «바뀐 사람»을 잡으려는 것이다」
 *   ⭐ 같은 원리가 여기에도 그대로 맞는다. **어제와 다른 것이 신호다.**
 *   PBR 이 어제 0.35 였는데 오늘도 0.35 이면 그것은 소식이 아니다.
 *
 * [그래서 둘로 가른다]
 *   signals-<날>.jsonl   «바뀐 것»만 — 날마다 쌓인다. 이것이 신호다
 *   state-latest.jsonl    오늘의 «전체 상태» 한 벌 — 덮어쓴다. 용량이 안 는다
 *
 * ⛔ 「안 바뀌었으니 안 적는다」를 「멈췄다」와 헷갈리지 않게, 적을 때마다
 *   state-latest.jsonl 의 머리줄에 «언제 읽었나»를 남긴다. 재는 자가 그것을 본다.
 */

/** 오늘보다 앞선 signals-*.jsonl 가운데 가장 최근 것 — 없으면 null */
export function 지난판찾기(방, 오늘날) {
  let 것들 = [];
  try { 것들 = fs.readdirSync(방); } catch { return null; }
  const 날들 = 것들
    .map((f) => (f.match(/^signals-(\d{8})\.jsonl$/) || [])[1])
    .filter(Boolean)
    .filter((d) => d < String(오늘날))
    .sort();
  return 날들.length ? path.join(방, `signals-${날들[날들.length - 1]}.jsonl`) : null;
}

/**
 * 🔴 견주는 «열쇠» — sourceId 를 그대로 쓰면 안 된다.
 *
 * 상태 신호의 sourceId 는 `mkt:<코드>:<해>:<시세판날짜>` 꼴이다. 시세 판이 바뀌면
 * sourceId 가 통째로 바뀌어 **2,166건이 전부 「새것」으로 잡힌다**(2026-09-25 실측).
 * ⇒ 견줄 때는 «어느 회사인가»만 남긴다. 판 날짜는 되짚기용이지 견주기용이 아니다.
 */
export function 견줌열쇠(s) {
  const id = String(s?.sourceId ?? '');
  const m = id.match(/^mkt:([^:]+):/);
  return m ? `mkt:${m[1]}` : id;
}

/**
 * 🔴 견주는 «값» — evidence 를 통째로 견주면 안 된다.
 *
 * 시세는 날마다 움직인다. PBR 0.35 → 0.36 은 **소식이 아니다.**
 * 소식은 「PBR 1.05 → 0.95 로 내려가 **저PBR 이 됐다**」처럼 그 회사의 «성격»이 바뀐 것이다.
 * 사장님 지시도 숫자가 아니라 성격이었다 — 「**그걸로 어떤 종목인 지 판단할 수 있게**」.
 * ⇒ 상태 신호는 딱지(`[저PBR·유동성주의]`)만 견준다. 공시는 사건이므로 evidence 를 그대로 본다.
 */
export function 견줌값(s) {
  const ev = String(s?.evidence ?? '');
  if (String(s?.kind) !== '실적') return ev;
  const m = ev.match(/\[([^\]]*)\]/);
  return m ? m[1] : '(딱지없음)';
}

/** 파일에서 «견줌열쇠 → 견줌값» 지도를 만든다 (깨진 줄은 조용히 건너뛴다) */
export function 지도만들기(길) {
  const m = new Map();
  if (!길) return m;
  let 글 = '';
  try { 글 = fs.readFileSync(길, 'utf8'); } catch { return m; }
  for (const l of 글.split('\n')) {
    if (!l.trim()) continue;
    try {
      const o = JSON.parse(l);
      if (o && o.sourceId && !o._state) m.set(견줌열쇠(o), 견줌값(o));
    } catch { /* 넘어간다 */ }
  }
  return m;
}

/**
 * 어제 지도와 견주어 «말할 것이 있는 것»만 고른다.
 * ⛔ 「없던 것」과 「달라진 것」 둘 다 신호다. 없던 것만 고르면 성격이 바뀐 회사를 놓친다.
 */
export function 바뀐것만(신호, 지난지도) {
  const 새것 = [], 달라진것 = [], 그대로 = [];
  for (const s of 신호) {
    const k = 견줌열쇠(s);
    if (!지난지도.has(k)) { 새것.push(s); continue; }
    if (지난지도.get(k) !== 견줌값(s)) 달라진것.push({ ...s, 지난딱지: 지난지도.get(k) });
    else 그대로.push(s);
  }
  return { 새것, 달라진것, 그대로, 적을것: [...새것, ...달라진것] };
}

/* ═══════════════════ 5. 돌린다 ═══════════════════ */
const 직접돌리나 = (() => {
  try {
    const 나 = decodeURIComponent(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
    const 부른것 = String(process.argv[1] || '').replace(/\\/g, '/');
    return Boolean(부른것) && 나.replace(/\\/g, '/').endsWith(부른것.split('/').pop());
  } catch { return false; }
})();

if (직접돌리나 && process.argv.includes('--자가시험')) {
  const 잰다 = [];
  const 본다 = (이름, v) => 잰다.push([이름, !!v]);

  /* 🔴 못 잰 것을 0 으로 만들지 않는다 — UAE 에서 겪은 함정 */
  본다('🔴 null 은 0 이 아니다', 돈(null) === null && 돈('') === null && 돈(undefined) === null);
  본다('✅ 숫자는 그대로', 돈('123') === 123 && 돈(0) === 0);
  본다('⛔ 0 으로 나누지 않는다', 나누기(1, 0) === null);
  본다('⛔ 못 잰 값으로 나누지 않는다', 나누기(null, 2) === null && 나누기(2, null) === null);

  const 튼튼 = { marketCap: 1000, netIncome: 200, totalEquity: 800, totalAssets: 1000, revenue: 900, operatingIncome: 200, currentAssets: 500, currentLiabilities: 200 };
  const 축1 = 다섯축(튼튼);
  본다('PBR 을 센다', Math.abs(축1.pbr - 1.25) < 0.001);
  본다('ROE 를 센다', Math.abs(축1.roe - 0.25) < 0.001);
  본다('고ROE·고마진 딱지가 붙는다', 성격딱지(축1).includes('고ROE') && 성격딱지(축1).includes('고마진'));

  const 적자 = { marketCap: 1000, netIncome: -50, totalEquity: 800, totalAssets: 1000, revenue: 900, operatingIncome: -20 };
  const 축2 = 다섯축(적자);
  본다('⛔ 적자면 PER 을 내지 않는다', 축2.per === null);
  본다('적자·영업적자 딱지가 붙는다', 성격딱지(축2).includes('적자') && 성격딱지(축2).includes('영업적자'));

  const 빈것 = 다섯축({});
  본다('🔴 값이 없으면 축이 전부 null 이다', 빈것.pbr === null && 빈것.roe === null && 빈것.적자인가 === null);
  본다('🔴 못 잰 것에 딱지를 붙이지 않는다', 성격딱지(빈것).length === 0);

  본다('성장 — 두 해가 있어야 잰다', 성장률([{ year: 2025, revenue_krw: 110 }]).매출증가 === null);
  본다('성장 — 두 해로 증가율을 낸다', (() => {
    const g = 성장률([{ year: 2024, revenue_krw: 100 }, { year: 2025, revenue_krw: 120 }]);
    return Math.abs(g.매출증가 - 0.2) < 0.001 && g.해 === '2024→2025';
  })());

  본다('공시 — 모르는 갈래는 신호를 «만들지 않는다»',
    공시를신호로({ t: '005930', d: '2026-09-23', e: '알수없는갈래', w: 5 }) === null);
  본다('공시 — 상장폐지위험은 -1 이다',
    공시를신호로({ t: '208860', d: '2026-09-23', e: 'delisting-risk', w: 9, m: 'KOSDAQ' }).direction === -1);
  본다('공시 — CEO 변경은 0 이다 (방향을 짐작하지 않는다)',
    공시를신호로({ t: '005930', d: '2026-09-23', e: 'ceo-change', w: 8 }).direction === 0);

  /* 🔴 만든 신호가 «기존 스키마»를 지켜야 한다 — 안 그러면 저장소가 거부한다 */
  const { 신호검증 } = await import('./lib-signal.mjs');
  const 보기공시 = 공시를신호로({ t: '208860', d: '2026-09-23', e: 'delisting-risk', w: 9, m: 'KOSDAQ', n: '다산', url: 'x?rcpNo=123' });
  본다('🔴 공시 신호가 스키마를 지킨다', 신호검증(보기공시).length === 0);
  const 보기상태 = 상태를신호로({ ticker: '005930', name: '삼성전자', market: 'Y', priceAsOf: '20260914', fiscalYear: 2025 },
    축1, 성격딱지(축1), 성장률([{ year: 2024, revenue_krw: 100 }, { year: 2025, revenue_krw: 120 }]), '20260924');
  본다('🔴 상태 신호가 스키마를 지킨다', 신호검증(보기상태).length === 0);
  본다('⛔ 상태 신호는 방향을 0 으로 둔다 — 시세를 예측하지 않는다', 보기상태.direction === 0);

  본다('⛔ 날짜에 toISOString 을 쓰지 않는다',
    !fs.readFileSync(fileURLToPath(import.meta.url), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1')
      .includes(`toISO${'String()'}`));

  /* 🔴 [2026-09-25] 어제와 견주기 — 이것이 없어서 signals-20260924 와 20260925 가
     «글자 하나까지» 같았다(각 801KB). 날마다 같은 것을 다시 쓰고 있었다. */
  /* 🔴 열쇠에 판 날짜가 들어가면 판이 바뀔 때 2,166건이 전부 「새것」이 된다 (실측) */
  본다('🔴 견줌열쇠는 시세 판 날짜를 뗀다', 견줌열쇠({ sourceId: 'mkt:005930:2025:20260914' }) === 'mkt:005930'
    && 견줌열쇠({ sourceId: 'mkt:005930:2025:20260922' }) === 'mkt:005930');
  본다('공시는 사건이라 sourceId 를 그대로 쓴다', 견줌열쇠({ sourceId: 'dart:20260923900528' }) === 'dart:20260923900528');

  /* 🔴 시세는 날마다 움직인다. 숫자를 견주면 날마다 2,166건이 «달라진 것»이 된다 */
  const 어제상태 = { kind: '실적', sourceId: 'mkt:x:2025:20260914', evidence: '가나다 [저PBR·적자] PBR 0.35 · ROE -1%' };
  const 오늘같은성격 = { kind: '실적', sourceId: 'mkt:x:2025:20260922', evidence: '가나다 [저PBR·적자] PBR 0.36 · ROE -1.1%' };
  const 오늘딴성격 = { kind: '실적', sourceId: 'mkt:x:2025:20260922', evidence: '가나다 [고ROE·고마진] PBR 1.90 · ROE 21%' };
  본다('🔴 숫자만 움직인 것은 소식이 아니다 — 딱지를 견준다', 견줌값(어제상태) === 견줌값(오늘같은성격));
  본다('🔴 성격(딱지)이 바뀐 것은 소식이다', 견줌값(어제상태) !== 견줌값(오늘딴성격));
  본다('공시는 evidence 를 그대로 견준다', 견줌값({ kind: '공시', evidence: '아무개 상장폐지' }) === '아무개 상장폐지');

  const 지난 = new Map([['mkt:x', '저PBR·적자'], ['mkt:y', '고ROE']]);
  const 결 = 바뀐것만([
    오늘같은성격,                                                                    /* 그대로 */
    { kind: '실적', sourceId: 'mkt:y:2025:20260922', evidence: 'ㄴ [저PBR] PBR 0.4' }, /* 성격이 바뀌었다 */
    { kind: '실적', sourceId: 'mkt:z:2025:20260922', evidence: 'ㄷ [고마진] PBR 2.0' }, /* 새로 생겼다 */
  ], 지난);
  본다('🔴 어제와 같은 성격은 안 적는다 — 같은 것은 소식이 아니다', 결.그대로.length === 1);
  본다('🔴 성격이 달라진 것은 적는다 — 없던 것만 고르면 바뀐 회사를 놓친다', 결.달라진것.length === 1);
  본다('🔴 달라진 것에는 «어제 무엇이었나»를 함께 적는다', 결.달라진것[0].지난딱지 === '고ROE');
  본다('🔴 새로 생긴 것은 적는다', 결.새것.length === 1);
  본다('🔴 적을 것은 «달라진 것 + 새것» 둘이다', 결.적을것.length === 2);
  본다('견줄 지난 판이 없으면 전부 새것이다 (첫 판)', 바뀐것만([{ kind: '실적', sourceId: 'mkt:q:2025:1', evidence: 'ㄹ [적자]' }], new Map()).적을것.length === 1);
  본다('⛔ 깨진 줄이 있어도 지도가 서고 터지지 않는다', (() => {
    const 임시 = path.join(뿌리, 'src', 'data', 'invest-ai', '.selftest-깨진줄.jsonl');
    try {
      fs.mkdirSync(path.dirname(임시), { recursive: true });
      fs.writeFileSync(임시, '{"sourceId":"k","evidence":"e"}\n이건 JSON 이 아니다\n\n', 'utf8');
      const m = 지도만들기(임시);
      return m.size === 1 && m.get('k') === 'e';
    } finally { try { fs.unlinkSync(임시); } catch { /* 없으면 그만 */ } }
  })());
  본다('⛔ 없는 파일을 지도로 만들어도 터지지 않는다', 지도만들기(path.join(뿌리, '없는파일.jsonl')).size === 0);

  const 떨 = 잰다.filter(([, v]) => !v);
  for (const [이, v] of 잰다) console.log(`${v ? '✅' : '🔴'} ${이}`);
  console.log(떨.length ? `\n🔴 ${떨.length}/${잰다.length} 떨어졌다` : `\n✅ 자가시험 ${잰다.length} 통과`);
  process.exit(떨.length ? 1 : 0);
}

if (직접돌리나) {
  const 날 = 오늘8자리();
  const 자료 = 자료읽기();
  if (!자료.밸류 || !자료.재무) {
    console.error('🔴 마켓 데이터를 못 읽었다 — src/data/korea-*-tape.json');
    process.exit(2);
  }
  const 한종목 = (() => {
    const i = process.argv.indexOf('--종목');
    return i > 0 ? process.argv[i + 1] : null;
  })();

  const { 신호, 못잰것 } = 다읽는다(자료, 날);

  if (한종목) {
    const 행 = (자료.밸류.rows ?? []).find((r) => String(r.ticker) === 한종목);
    if (!행) { console.error(`🔴 ${한종목} 을 밸류에이션 표에서 못 찾았다`); process.exit(2); }
    const 축 = 다섯축(행);
    console.log(`■ ${행.name} (${행.ticker}) — ${행.industry ?? ''}`);
    for (const [k, v] of Object.entries(축)) {
      console.log(`   ${k.padEnd(10)} ${v === null ? '(못 쟀다)' : typeof v === 'number' ? v.toFixed(3) : v}`);
    }
    console.log(`   딱지       ${성격딱지(축).join(' · ') || '(없음)'}`);
    process.exit(0);
  }

  const 상태신호 = 신호.filter((s) => s.kind === '실적');
  const 공시신호 = 신호.filter((s) => s.kind === '공시');
  console.log('■ 투자 AI — 우리 마켓 데이터를 읽었다');
  console.log(`   종목 상태 신호  ${상태신호.length}건 (밸류에이션 ${자료.밸류.rows?.length ?? 0}사 가운데 말할 것이 있는 곳)`);
  console.log(`   공시 사건 신호  ${공시신호.length}건 (최근 7일)`);
  console.log(`   ⚠ 못 잰 것 — 시총 없음 ${못잰것.시총없음}사 · 자본 없음 ${못잰것.자본없음}사 (0 으로 안 채웠다)`);

  /* 딱지별 몇 곳인지 — 「어떤 종목인가」가 실제로 갈리는지 눈으로 본다 */
  const 셈 = new Map();
  for (const s of 상태신호) {
    const m = s.evidence.match(/\[([^\]]+)\]/);
    if (!m) continue;
    for (const d of m[1].split('·')) 셈.set(d, (셈.get(d) ?? 0) + 1);
  }
  console.log('   갈래별 —', [...셈.entries()].sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k} ${v}`).join(' · '));

  /* ⚠ `--save` 는 `--적는다` 와 같다. 윈도 작업 스케줄러의 .cmd 안에서는 한글 인자가
     CP949 로 깨지며 «뒷글자까지 먹는다» — 2026-09-24 에 실제로 겪었다. 예약은 exit 0 을
     내는데 아무 일도 안 일어났다. ⇒ 예약에서 부를 때는 반드시 영문 인자를 쓴다. */
  if (process.argv.includes('--적는다') || process.argv.includes('--save')) {
    const 방 = path.join(뿌리, 'src', 'data', 'invest-ai');
    fs.mkdirSync(방, { recursive: true });
    const 길 = path.join(방, `signals-${날}.jsonl`);

    /* ① 오늘 파일 안의 멱등 — 하루에 여러 번 돌려도 같은 것이 두 번 안 들어간다 */
    const 오늘이미 = 지도만들기(길);

    /* ② 🔴 어제와 견준다 — 이것이 없어서 날마다 2,233건이 통째로 다시 적혔다 */
    const 지난길 = 지난판찾기(방, 날);
    const 지난지도 = 지도만들기(지난길);
    const { 새것, 달라진것, 그대로, 적을것 } = 바뀐것만(신호, 지난지도);
    const 적는다 = 적을것.filter((s) => 오늘이미.get(견줌열쇠(s)) !== 견줌값(s));

    fs.appendFileSync(길, 적는다.map((s) => JSON.stringify(s)).join('\n') + (적는다.length ? '\n' : ''), 'utf8');

    /* ③ 전체 상태는 «한 벌»만 둔다 — 날마다 801KB 를 쌓지 않는다.
       ⛔ 안 바뀐 날에도 이 파일의 머리줄이 갱신된다. 재는 자가 「멈췄나」를 여기서 본다. */
    const 상태길 = path.join(방, 'state-latest.jsonl');
    const 머리 = { _state: true, 읽은날: 날, 읽은때: new Date().toLocaleString('ko-KR'), 건수: 신호.length };
    fs.writeFileSync(상태길, [JSON.stringify(머리), ...신호.map((s) => JSON.stringify(s))].join('\n') + '\n', 'utf8');

    console.log('');
    console.log(`✅ ${길}`);
    console.log(`   새로 생긴 것   ${새것.length}건`);
    console.log(`   값이 달라진 것  ${달라진것.length}건`);
    console.log(`   어제와 같은 것  ${그대로.length}건 — ⛔ 적지 않는다. 같은 것은 소식이 아니다`);
    console.log(`   실제로 적은 것  ${적는다.length}건${지난길 ? ` (견준 판: ${path.basename(지난길)})` : ' (견줄 지난 판이 없다 — 첫 판이다)'}`);
    console.log(`✅ ${상태길} — 오늘 전체 상태 ${신호.length}건을 «한 벌»로 덮어썼다`);
  } else {
    console.log('\n⬜ --적는다 를 붙이면 signals-<오늘>.jsonl 에 저장한다');
  }
}
