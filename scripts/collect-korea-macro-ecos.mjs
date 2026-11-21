#!/usr/bin/env node
/**
 * collect-korea-macro-ecos.mjs — **한국 거시 셋(GDP·물가·기준금리)을 ECOS 에서 받는다.**
 *
 * ── 왜 만드나 (2026-10-05 · 5번) ────────────────────────────────
 * 영문 검색어를 재 보니(en/us 자동완성) 이것들이 **10줄을 꽉** 채웠다 —
 *   `korea gdp` · `korea inflation` · `korean won exchange rate` · `korea stock market`
 * 그런데 `check-이미-있는-지면인가` 로 579개 파일을 뒤져 보니 그 말을 제목에 둔
 * 지면이 **하나도 없었다.** 까닭은 단순하다 — **자료가 없었다.**
 * `src/data/` 에 거시 시계열이 `cpi-telecom-base-effect.json` 한 장뿐이었다.
 *
 * 🔴 사장님 (2026-10-04): 「**에스마켓 구축을 빨리 끝내라. 데이터 수집, 가공만 하면
 *   될 수 있는 상황을 빨리 만들고. B2B 영업에 집중하라.**」
 *   ⇒ 지면을 먼저 짓는 것이 아니라 **자료를 먼저 세운다.** 이 자가 그 자리다.
 *
 * ── 받는 것 셋 ──────────────────────────────────────────────────
 * ```
 * 200Y102  국민계정 — 실질 GDP 성장률(전기비, 계절조정)   분기
 * 901Y009  소비자물가지수(2020=100)                      월
 * 722Y001  한국은행 기준금리                              일
 * ```
 * ⚠ 901Y009 는 **통계청이 작성**하고 한국은행이 ECOS 로 받아 싣는 것이다.
 *   나머지 둘은 한국은행 작성이다. **지면에 출처를 그대로 적는다** —
 *   2026-09 에 가계부채 자료에서 작성 기관을 안 밝혀 판정이 막힌 일이 있었다
 *   (`check-ecos-series-not-published.mjs` 가 그때 생겼다).
 *
 * ── ⛔ 이 자가 지키는 것 ────────────────────────────────────────
 * ⛔ **숨은 분류축(ITEM_CODE2)을 안 박으면 한 달에 값이 여럿 섞인다.**
 *   2026-10-04 에 2번이 901Y124 에서 겪은 바로 그 함정이다(은행전체·일반은행·특수은행이
 *   한 배열에 섞여 2023-12월에 0.3 이 세 번 나왔다). 그래서 **항목코드를 못 박고 받는다.**
 * ⛔ 못 받은 것을  — 빼고 몇 개를 뺐는지 적는다.
 * ⛔ 열쇠(ECOS_KEY)를 화면·로그·파일 어디에도 찍지 않는다.
 *
 * 쓰는 법
 *   node scripts/collect-korea-macro-ecos.mjs
 *   node scripts/collect-korea-macro-ecos.mjs --자가시험
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const 낼곳 = path.join(뿌리, 'src', 'data', 'korea-macro.json');

/**
 * 받을 계열. ⛔ `항목` 을 반드시 박는다 — 안 박으면 한 때에 값이 여럿 섞인다.
 * `작성` 은 지면에 그대로 적을 출처다. ⛔ 비워 두지 않는다.
 */
export const 계열들 = [
  {
    열쇠: 'gdpGrowth',
    /* ⚠ 항목코드를 '1400' 으로 적었다가 한 줄도 못 받았다 — ECOS 에 직접 물어
       10111 이 「국내총생산(GDP)(실질, 계절조정, 전기비)」임을 확인하고 고쳤다.
       ⛔ 코드를 머리로 지어내지 않는다. 물어보고 적는다. */
    표: '200Y102', 주기: 'Q', 항목: '10111',
    이름영문: 'Real GDP growth, quarter on quarter (seasonally adjusted)',
    단위: '%',
    작성: 'Bank of Korea — National Accounts',
  },
  {
    열쇠: 'cpi',
    표: '901Y009', 주기: 'M', 항목: '0',
    이름영문: 'Consumer price index (2020 = 100)',
    단위: '2020=100',
    작성: 'Statistics Korea, published through Bank of Korea ECOS',
  },
  {
    열쇠: 'policyRate',
    표: '722Y001', 주기: 'D', 항목: '0101000',
    이름영문: 'Bank of Korea base rate',
    단위: '% per year',
    작성: 'Bank of Korea',
  },
];

/** ⛔ 열쇠를 돌려주기만 한다. 부르는 쪽도 절대 찍지 않는다 */
export function 열쇠읽기({ 읽기 = readFileSync, 있나 = existsSync } = {}) {
  const p = path.join(뿌리, '.env');
  if (있나(p)) {
    for (const l of String(읽기(p, 'utf8')).split(/\r?\n/)) {
      const m = l.match(/^\s*ECOS_KEY\s*=\s*(.*)$/);
      if (m) return m[1].trim().replace(/^["']|["']$/g, '');
    }
  }
  return process.env.ECOS_KEY ?? '';
}

/** ⚠ KST. ⛔ toISOString 안 쓴다 — 자정~9시가 하루 어긋난다 */
export function 오늘(d = new Date()) {
  return {
    년: d.getFullYear(),
    월: String(d.getMonth() + 1).padStart(2, '0'),
    일: String(d.getDate()).padStart(2, '0'),
  };
}

/** 주기마다 「어디서 어디까지」를 만든다. ⛔ 끝을 미래로 넉넉히 둬야 최신이 들어온다 */
export function 기간(주기, d = new Date()) {
  const { 년, 월, 일 } = 오늘(d);
  if (주기 === 'Q') return [`${년 - 6}Q1`, `${년}Q4`];
  if (주기 === 'M') return [`${년 - 6}01`, `${년}12`];
  return [`${년 - 2}0101`, `${년}${월}${일}`];
}

/** ECOS 가 돌려준 줄을 우리 꼴로. ⛔ 숫자가 아니면 «버린다» — 0 으로 메우지 않는다 */
export function 줄다듬기(rows) {
  const 것 = [];
  let 버린수 = 0;
  for (const r of rows ?? []) {
    const t = String(r?.TIME ?? '').trim();
    const 날것 = String(r?.DATA_VALUE ?? '').trim();
    /* 🔴 빈 글자를 먼저 거른다 — `Number('')` 은 **0** 이라 그냥 두면
       「값이 없는 달」이 「0 인 달」로 둔갑한다. 자가시험에 걸려서 알았다. */
    const v = 날것 === '' ? NaN : Number(날것);
    if (!t || !Number.isFinite(v)) { 버린수 += 1; continue; }
    것.push({ t, v });
  }
  것.sort((a, b) => a.t.localeCompare(b.t));
  return { 줄: 것, 버린수 };
}

/**
 * 한 계열을 받는다.
 * @returns {{줄: Array, 버린수: number, 전체: number}|null} ⛔ 못 받으면 null — 빈 배열이 아니다
 */
export async function 계열받기(key, 계, { 부른다 = fetch } = {}) {
  const [a, b] = 기간(계.주기);
  const u = `https://ecos.bok.or.kr/api/StatisticSearch/${key}/json/kr/1/5000/${계.표}/${계.주기}/${a}/${b}/${계.항목}`;
  let j;
  try {
    const r = await 부른다(u);
    j = await r.json();
  } catch { return null; }
  const rows = j?.StatisticSearch?.row;
  if (!Array.isArray(rows)) return null;      /* ⛔ 「없다」와 「못 받았다」를 가른다 */
  const { 줄, 버린수 } = 줄다듬기(rows);
  return { 줄, 버린수, 전체: Number(j.StatisticSearch.list_total_count) || rows.length };
}

/** 물가지수에서 전년 동월 대비 상승률을 낸다. ⛔ 열두 달 전 값이 없으면 «안 낸다» */
export function 전년비(줄) {
  const 표 = new Map((줄 ?? []).map((x) => [x.t, x.v]));
  const 것 = [];
  for (const { t, v } of 줄 ?? []) {
    const 년 = Number(t.slice(0, 4));
    const 월 = t.slice(4, 6);
    const 앞 = 표.get(`${년 - 1}${월}`);
    if (!Number.isFinite(앞) || 앞 === 0) continue;   /* ⛔ 없으면 건너뛴다 */
    것.push({ t, v: Number((((v - 앞) / 앞) * 100).toFixed(2)) });
  }
  return 것;
}

/* ── 자가시험 ─────────────────────────────────────────────── */
const 내가실행됐다 = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (내가실행됐다 && process.argv.includes('--자가시험')) {
  let 통 = 0; const 진 = [];
  const 본다 = (이름, 참) => { if (참) 통 += 1; else 진.push(이름); };

  본다('계열이 셋', 계열들.length === 3);
  /* 🔴 2026-10-04 에 2번이 겪은 함정 — 항목을 안 박으면 한 때에 값이 여럿 섞인다 */
  본다('🔴 계열마다 «항목»을 박았다', 계열들.every((c) => c.항목 && String(c.항목).length >= 1));
  본다('⛔ 작성 기관을 비워 두지 않았다', 계열들.every((c) => c.작성 && c.작성.length > 5));
  본다('⛔ 영문 이름에 한국어가 없다', 계열들.every((c) => !/[가-힣]/.test(c.이름영문)));
  본다('열쇠가 겹치지 않는다', new Set(계열들.map((c) => c.열쇠)).size === 3);

  const d = new Date(2026, 9, 5);   /* 2026-10-05 */
  본다('분기 기간', 기간('Q', d)[0] === '2020Q1' && 기간('Q', d)[1] === '2026Q4');
  본다('월 기간', 기간('M', d)[0] === '202001' && 기간('M', d)[1] === '202612');
  본다('일 기간', 기간('D', d)[0] === '20240101' && 기간('D', d)[1] === '20261005');
  /* ⛔ toISOString 이면 자정에 하루 어긋난다 — 자정 직후로 재 본다 */
  본다('🔴 자정 직후에도 그날이다', 기간('D', new Date(2026, 9, 5, 0, 5))[1] === '20261005');

  const r = 줄다듬기([
    { TIME: '202602', DATA_VALUE: '2.1' },
    { TIME: '202601', DATA_VALUE: '1.9' },
    { TIME: '202603', DATA_VALUE: '' },
    { TIME: '', DATA_VALUE: '9' },
    { TIME: '202604', DATA_VALUE: '-' },
  ]);
  본다('숫자만 남긴다', r.줄.length === 2);
  본다('🔴 못 읽은 것을 0 으로 안 메우고 «센다»', r.버린수 === 3);
  본다('때 차례로 선다', r.줄[0].t === '202601' && r.줄[1].t === '202602');
  본다('⛔ 빈 것에도 안 터진다', 줄다듬기(null).줄.length === 0 && 줄다듬기([]).버린수 === 0);

  const 지수 = [
    { t: '202501', v: 100 }, { t: '202502', v: 100 },
    { t: '202601', v: 103 }, { t: '202602', v: 101 },
  ];
  const 비 = 전년비(지수);
  본다('전년비를 낸다', 비.length === 2);
  본다('🔴 전년비 값이 맞다', 비[0].t === '202601' && 비[0].v === 3 && 비[1].v === 1);
  본다('⛔ 열두 달 전이 없으면 «안 낸다»', 전년비([{ t: '202601', v: 103 }]).length === 0);
  본다('⛔ 0 으로 나누지 않는다', 전년비([{ t: '202501', v: 0 }, { t: '202601', v: 5 }]).length === 0);

  /* 🔴 못 받은 것과 「없다」를 가르나 — 가짜 손으로 잰다 */
  const 못받음 = await 계열받기('x', 계열들[0], { 부른다: async () => { throw new Error('끊김'); } });
  본다('🔴 못 받으면 null', 못받음 === null);
  const 빈것 = await 계열받기('x', 계열들[0], { 부른다: async () => ({ json: async () => ({}) }) });
  본다('🔴 꼴이 아니어도 null — 빈 배열이 아니다', 빈것 === null);
  const 받음 = await 계열받기('x', 계열들[0], {
    부른다: async () => ({ json: async () => ({ StatisticSearch: { list_total_count: 1, row: [{ TIME: '2026Q1', DATA_VALUE: '0.7' }] } }) }),
  });
  본다('받으면 줄이 들어온다', 받음 && 받음.줄.length === 1 && 받음.줄[0].v === 0.7);

  console.log(진.length ? `🔴 ${진.length} 떨어졌다 —\n  ${진.join('\n  ')}` : `✅ 자가시험 ${통} 통과`);
  process.exit(진.length ? 1 : 0);
}

if (내가실행됐다) {
  const key = 열쇠읽기();
  if (!key) { console.log('⛔ .env 에 ECOS_KEY 가 없다'); process.exit(1); }

  console.log('■ 한국 거시 셋을 ECOS 에서 받는다');
  const 답 = {};
  let 못받은것 = 0;
  for (const 계 of 계열들) {
    const r = await 계열받기(key, 계);
    if (!r) {                                    /* ⛔ 못 받은 것을 빈 배열로 적지 않는다 */
      못받은것 += 1;
      console.log(`   ⬜ ${계.열쇠} — 못 받았다 (${계.표})`);
      continue;
    }
    답[계.열쇠] = {
      name: 계.이름영문,
      unit: 계.단위,
      source: 계.작성,
      table: 계.표,
      freq: 계.주기,
      points: r.줄,
      dropped: r.버린수,
    };
    const 끝 = r.줄[r.줄.length - 1];
    console.log(`   ✅ ${계.열쇠.padEnd(12)} ${String(r.줄.length).padStart(5)}개 · 마지막 ${끝?.t} = ${끝?.v}${r.버린수 ? ` · 못 읽어 뺀 것 ${r.버린수}` : ''}`);
  }

  if (답.cpi) {
    const 비 = 전년비(답.cpi.points);
    답.cpiYoY = {
      name: 'Consumer price inflation, year on year',
      unit: '%',
      source: 답.cpi.source,
      table: 답.cpi.table,
      freq: 'M',
      points: 비,
      dropped: 답.cpi.points.length - 비.length,
    };
    const 끝 = 비[비.length - 1];
    console.log(`   ✅ cpiYoY       ${String(비.length).padStart(5)}개 · 마지막 ${끝?.t} = ${끝?.v}%`);
  }

  if (!Object.keys(답).length) { console.log('🔴 한 계열도 못 받았다 — 쓰지 않는다'); process.exit(1); }

  const { 년, 월, 일 } = 오늘();
  const 글 = JSON.stringify({
    _meta: {
      product: 'Korea Macro Tape',
      note: 'Quarterly GDP growth, monthly CPI and the daily policy rate, pulled from Bank of Korea ECOS.',
      builtAt: `${년}-${월}-${일}`,
      sources: 계열들.map((c) => ({ table: c.표, series: c.이름영문, compiledBy: c.작성 })),
      notCollected: 못받은것,
    },
    ...답,
  }, null, 2) + '\n';
  mkdirSync(path.dirname(낼곳), { recursive: true });
  writeFileSync(낼곳, 글, 'utf8');
  console.log(`\n✅ 냈다 — src/data/korea-macro.json${못받은것 ? ` (못 받은 계열 ${못받은것}개는 «빼고» 적었다)` : ''}`);
}
