#!/usr/bin/env node
/**
 * build-company-research.mjs — 종목 페이지(/company/[slug])의 「Broker research」 구역 자료.
 *
 * ── 왜 (2026-10-27 · 5번 지시, 사장님 「투자는 쉽게, 정보는 자세히」) ─────────
 * `/v1/research` 에 1,139건 · 496개사 · 증권사 21곳이 있는데 종목 페이지에는 한 줄도 없었다.
 * 해외 개인 투자자는 API 를 쓰지 않는다. 이미 모아 둔 것을 사람이 읽는 페이지로 옮긴다.
 *
 * ⛔ 자료를 새로 모으지 않는다 — 이미 있는 인덱스만 읽는다.
 *   원본    archive/index/research.ndjson  (scripts/build-research-index.mjs 가 만든다)
 *   종목코드 archive/raw/research · research-list · broker 의 code 칸 (인덱스에는 코드가 없다)
 *   애널리스트 보강  src/data/korea-consensus-tape.json — (날짜·증권사·종목코드)가 «하나만»
 *                   맞을 때만 붙인다. 둘 이상이면 누구 것인지 모르므로 안 붙인다.
 * ⛔ 화면에 한국어를 내지 않는다 — 출력 JSON 에 한글을 싣지 않는다(끝에서 재서 멈춘다).
 *   리포트 제목은 한글뿐이고 영문 번역이 없으므로 싣지 않는다.
 * ⛔ 없는 값은 null —  투자의견을 모르면 null, 목표주가를 안 냈으면 null.
 * ⛔ 「컨센서스 판정」을 만들지 않는다 — 분포(건수·범위·중앙값)만 낸다.
 *
 * 산출  src/data/company-research.json  (커밋한다 — archive/ 는 .gitignore 라 빌드 컨테이너에 없다)
 * 실행  node scripts/build-company-research.mjs
 *       node scripts/build-company-research.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describeInstitution } from '../src/lib/institutions.mjs';
import { describeSubject } from '../src/lib/subjects.mjs';
import { 이름로마자 } from '../src/lib/korean-name-roman.mjs';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 최근몇건 = 10;

/* ── 투자의견 → 영문. 증권사가 쓴 말을 옮길 뿐, 우리 판단을 더하지 않는다 ── */
const 의견표 = {
  매수: 'Buy', 적극매수: 'Strong Buy', 강력매수: 'Strong Buy', 단기매수: 'Trading Buy',
  중립: 'Neutral', 보유: 'Hold', 매도: 'Sell', 비중확대: 'Overweight', 비중축소: 'Underweight',
  시장수익률: 'Market Perform', 시장수익률상회: 'Outperform', 시장수익률하회: 'Underperform',
  buy: 'Buy', strongbuy: 'Strong Buy', tradingbuy: 'Trading Buy', hold: 'Hold',
  neutral: 'Neutral', sell: 'Sell', reduce: 'Reduce', outperform: 'Outperform',
  underperform: 'Underperform', marketperform: 'Market Perform', overweight: 'Overweight',
  underweight: 'Underweight', nr: 'Not rated', notrated: 'Not rated',
};
export function 의견영문(o) {
  if (o == null) return null;
  const k = String(o).trim();
  if (!k) return null;
  const hit = 의견표[k] ?? 의견표[k.replace(/[\s_-]/g, '').toLowerCase()];
  if (hit) return hit;
  /* 모르는 말 — 한글이면 싣지 않는다(지어내지도, 한글을 내보내지도 않는다). 로마자면 그대로 */
  return /[가-힣]/.test(k) ? null : k;
}

/** 「김충현, CFA」·「김운호, 고혁진」 → 로마자. 못 옮긴 사람은 빼고, 아무도 못 옮기면 null */
export function 애널리스트영문(a) {
  if (!a) return null;
  const 조각 = String(a).split(/[,/·]/).map((s) => s.trim()).filter(Boolean);
  const 사람 = [];
  let 자격 = '';
  for (const c of 조각) {
    if (/^(CFA|FRM|CPA|AICPA)$/i.test(c)) { 자격 = c.toUpperCase(); if (사람.length) 사람[사람.length - 1] += `, ${자격}`; continue; }
    if (/^[A-Za-z][A-Za-z .'-]+$/.test(c)) { 사람.push(c); continue; }
    const r = 이름로마자(c);
    if (r?.로마자 && !/[가-힣]/.test(r.로마자)) 사람.push(r.로마자);
  }
  return 사람.length ? 사람.join('; ') : null;
}

/** 중앙값 — 짝수 개면 가운데 둘의 평균 */
export function 중앙값(xs) {
  const s = [...xs].sort((a, b) => a - b);
  if (!s.length) return null;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** 종목명 앞에 붙은 업종 꼬리표를 뗀다 — 「[조선/AI엔진] HD현대중공업」 */
const 꼬리표떼기 = (s) => String(s ?? '').replace(/^\s*\[[^\]]*\]\s*/, '').trim();
const 법인떼기 = (s) => String(s ?? '').replace(/\(주\)|㈜|주식회사/g, '').replace(/\s+/g, '').trim();

function 자가시험() {
  const 잰다 = [];
  const 본다 = (이름, v) => 잰다.push([이름, !!v]);
  본다('매수 → Buy', 의견영문('매수') === 'Buy');
  본다('BUY → Buy', 의견영문('BUY') === 'Buy');
  본다('StrongBuy → Strong Buy', 의견영문('StrongBuy') === 'Strong Buy');
  본다('NR → Not rated', 의견영문('NR') === 'Not rated');
  본다('null 은 null(0·빈칸으로 안 채운다)', 의견영문(null) === null);
  본다('모르는 한글 의견은 내보내지 않는다', 의견영문('아무말') === null);
  본다('애널리스트 로마자', 애널리스트영문('서미화') === 'Seo Mi-hwa');
  본다('자격은 이름 뒤에', 애널리스트영문('김충현, CFA') === 'Kim Chung-hyeon, CFA');
  본다('두 사람', 애널리스트영문('김운호, 고혁진') === 'Kim Un-ho; Ko Hyeok-jin');
  본다('못 옮기면 null', 애널리스트영문('') === null);
  본다('중앙값 홀수', 중앙값([3, 1, 2]) === 2);
  본다('중앙값 짝수', 중앙값([1, 2, 3, 4]) === 2.5);
  본다('빈 것은 null', 중앙값([]) === null);
  본다('업종 꼬리표', 꼬리표떼기('[조선/AI엔진] HD현대중공업') === 'HD현대중공업');
  const 실패 = 잰다.filter(([, ok]) => !ok);
  for (const [이름, ok] of 잰다) console.log(`${ok ? 'PASS' : 'FAIL'}  ${이름}`);
  if (실패.length) { console.error(`자가시험 실패 ${실패.length}건`); process.exit(1); }
  console.log(`자가시험 ${잰다.length}건 통과`);
}

function main() {
  const 인덱스길 = path.join(뿌리, 'archive/index/research.ndjson');
  if (!fs.existsSync(인덱스길)) {
    console.log('⚠ archive/index/research.ndjson 이 없다 — 기존 출력 그대로 둔다');
    process.exit(0);
  }
  const 줄들 = fs.readFileSync(인덱스길, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));

  /* 종목명 → 종목코드. 원본 파일의 code 칸에서 */
  const 이름코드 = new Map();
  for (const root of ['archive/raw/broker', 'archive/raw/research', 'archive/raw/research-list']) {
    const base = path.join(뿌리, root);
    if (!fs.existsSync(base)) continue;
    for (const d of fs.readdirSync(base)) {
      const dir = path.join(base, d);
      if (!fs.statSync(dir).isDirectory()) continue;
      for (const f of fs.readdirSync(dir)) {
        if (!f.endsWith('.json')) continue;
        try {
          const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
          const s = j.stock ?? j.subject;
          if (s && j.code && /^\d{6}$/.test(String(j.code))) 이름코드.set(s, String(j.code));
        } catch { /* 깨진 파일은 건너뛴다 — 인덱스 빌더가 세어 보고한다 */ }
      }
    }
  }
  /* 코드가 없는 이름은 재무 테이프의 회사명(법인 꼬리표 뗀 것)으로 한 번 더 */
  const fin = JSON.parse(fs.readFileSync(path.join(뿌리, 'src/data/korea-financials-tape.json'), 'utf8'));
  const 재무이름 = new Map();
  for (const r of fin.rows) 재무이름.set(법인떼기(r.name), String(r.code));
  const 코드찾기 = (s) => 이름코드.get(s) ?? 이름코드.get(꼬리표떼기(s)) ?? 재무이름.get(법인떼기(꼬리표떼기(s))) ?? null;

  /* 애널리스트 보강 — 한경 컨센서스 테이프 (날짜|증권사|코드) */
  const 테이프 = JSON.parse(fs.readFileSync(path.join(뿌리, 'src/data/korea-consensus-tape.json'), 'utf8'));
  const 테이프표 = new Map();
  for (const r of 테이프.reports ?? []) {
    if (!r.code || !r.published_on || !r.house) continue;
    const k = `${r.published_on}|${r.house}|${r.code}`;
    테이프표.set(k, [...(테이프표.get(k) ?? []), r]);
  }

  const 회사 = new Map();
  const 못찾은이름 = new Set();
  const 모르는의견 = new Map();
  const 모르는기관 = new Set();
  let 보강 = 0;
  for (const r of 줄들) {
    const code = 코드찾기(r.s);
    if (!code) { 못찾은이름.add(r.s); continue; }
    const 기관 = describeInstitution(r.h);
    if (!기관) { 모르는기관.add(r.h); continue; }
    const rating = 의견영문(r.o);
    if (r.o != null && rating == null) 모르는의견.set(r.o, (모르는의견.get(r.o) ?? 0) + 1);
    let analyst = 애널리스트영문(r.a);
    let analystFrom = analyst ? 'report' : null;
    if (!analyst) {
      const 후보 = 테이프표.get(`${r.d}|${r.h}|${code}`) ?? [];
      if (후보.length === 1) {
        analyst = 애널리스트영문(후보[0].analysts);
        if (analyst) { analystFrom = 'hankyung'; 보강++; }
      }
    }
    if (!회사.has(code)) 회사.set(code, { nameEn: describeSubject(꼬리표떼기(r.s)), 리포트: [] });
    회사.get(code).리포트.push({
      date: r.d,
      firm: 기관.en,
      firmType: 기관.type,
      analyst,
      ...(analystFrom === 'hankyung' ? { analystVia: 'hankyung' } : {}),
      rating,
      targetKrw: Number.isFinite(r.p) && r.p > 0 ? r.p : null,
    });
  }

  const 출력 = {};
  let 최초 = null;
  let 최종 = null;
  for (const [code, c] of [...회사.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const rs = c.리포트.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
    const 날짜들 = rs.map((x) => x.date).filter(Boolean).sort();
    /* 증권사마다 «가장 최근에 낸» 목표주가 하나 — 한 곳이 여러 번 냈다고 분포를 기울이지 않는다 */
    const 최근목표 = new Map();
    const 최근목표날 = new Map();
    for (const x of rs) if (x.targetKrw != null && !최근목표.has(x.firm)) { 최근목표.set(x.firm, x.targetKrw); 최근목표날.set(x.firm, x.date ?? null); }
    const 목표들 = [...최근목표.values()];
    /* [2026-10-27 · 반도체 지면] 그 «증권사별 최신 목표»가 언제 나온 것인지 — 오래된 목표가 섞였는지 손님이 보게 */
    const 목표날들 = [...최근목표날.values()].filter(Boolean).sort();
    if (날짜들[0] && (!최초 || 날짜들[0] < 최초)) 최초 = 날짜들[0];
    if (날짜들.at(-1) && (!최종 || 날짜들.at(-1) > 최종)) 최종 = 날짜들.at(-1);
    출력[code] = {
      nameEn: c.nameEn ?? null,
      reports: rs.length,
      brokerReports: rs.filter((x) => x.firmType === 'brokerage').length,
      firms: new Set(rs.map((x) => x.firm)).size,
      first: 날짜들[0] ?? null,
      last: 날짜들.at(-1) ?? null,
      withTarget: rs.filter((x) => x.targetKrw != null).length,
      latestTargets: {
        firms: 목표들.length,
        min: 목표들.length ? Math.min(...목표들) : null,
        max: 목표들.length ? Math.max(...목표들) : null,
        median: 중앙값(목표들),
        oldest: 목표날들[0] ?? null,
        newest: 목표날들.at(-1) ?? null,
      },
      latest: rs.slice(0, 최근몇건),
    };
  }

  const 결과 = {
    _meta: {
      what: 'Broker research on Korean listed companies, per company, for /company/[slug] pages.',
      source: 'Broker reports listed on Naver Finance\'s research board and on brokers\' own websites, collected by SeoulMarkets (archive/index/research.ndjson). Analyst names partly matched from Hankyung Consensus where date, firm and ticker matched exactly one report.',
      firstDay: 최초,
      lastDay: 최종,
      indexRecords: 줄들.length,
      companies: Object.keys(출력).length,
      unmatchedSubjects: [...못찾은이름].length,
      analystFromHankyung: 보강,
      latestShown: 최근몇건,
      notes: 'Sample of broker research, not all research. Missing values are null, never 0. Report titles are omitted: the archive holds only Korean titles. Target-price range and median use the latest stated target from each firm.',
      builtBy: 'scripts/build-company-research.mjs — do not edit by hand',
    },
    byCode: 출력,
  };
  const 글 = JSON.stringify(결과);
  if (/[가-힣]/.test(글)) {
    const 자리 = 글.search(/[가-힣]/);
    console.error(`⛔ 출력에 한글이 섞였다: …${글.slice(Math.max(0, 자리 - 60), 자리 + 20)}…`);
    process.exit(1);
  }
  fs.writeFileSync(path.join(뿌리, 'src/data/company-research.json'), JSON.stringify(결과, null, 1) + '\n');
  console.log(`인덱스 ${줄들.length}건 → 회사 ${Object.keys(출력).length}곳 (${최초} ~ ${최종})`);
  console.log(`  코드 못 찾은 종목명 ${못찾은이름.size}: ${[...못찾은이름].join(', ')}`);
  console.log(`  모르는 기관 ${모르는기관.size}: ${[...모르는기관].join(', ')}`);
  console.log(`  옮기지 못한 의견: ${JSON.stringify(Object.fromEntries(모르는의견))}`);
  console.log(`  애널리스트 한경 보강 ${보강}건`);
}

if (process.argv.includes('--자가시험')) 자가시험();
else main();
