#!/usr/bin/env node
/**
 * collect-dart-breaking.mjs — 영어 금융 속보의 **감지 배관** (사장님 지시 2026-08-14)
 *
 *   *「자동 감지·발행 배관 … 토큰 많이 안 쓰면 슬슬 해」*
 *
 * ## 무엇을 하나
 *   그날 DART 에 올라온 공시 목록을 받아 **시장이 움직일 만한 것만** 골라
 *   속보 후보로 세운다. 숫자가 구조화 API 로 나오는 유형은 그 수까지 붙인다.
 *   ⭐ 이것은 **감지**까지다. 영어 기사로 쓰는 **발행**은 사람(Claude)이 한다 —
 *      정확성 때문이다. 감지는 매일 싸게 돌고, 발행만 손이 든다.
 *
 * ## ⛔ 지킴선 (6번이 스스로 그은 것)
 *   · **1차 공시(DART)만.** 네이버 가공물 금지.
 *   · 투자자문 아님 — 후보는 사실이지 매수의견이 아니다.
 *   · 키는 로그에 찍지 않는다 (저장소가 공개다).
 *
 * ## 🔴 [2026-09-13] 유형표를 **미국 SEC Form 8-K 중대사건 33종**에 맞춰 넓혔다
 * 사장님 지시: 「한국 공시도 미국식 중대사건 반영해서 수집해」. UAE ADX 공시 수집기
 * (`collect-uae-adx-disclosures.mjs`)에서 먼저 쓴 방법 그대로 — 미국은 전부 공시하게
 * 하지 않는다, **8-K 가 정한 유형에 걸릴 때만** 신고를 의무화한다. 그 유형에 한국
 * 수시공시 report_nm 을 맞대 봤다(실측: 2026-09-08~09-12 닷새치 2,356건 중 기존
 * 표에 안 걸리던 400가지 제목을 세어, 그중 진짜 중요해 보이는 것만 새로 추가).
 *
 *   report_nm(실측)                                    가장 가까운 8-K Item       무게
 *   대표이사변경                                          Item 5.02 임원 변경          8
 *   독립이사의선임ㆍ해임또는중도퇴임에관한신고               Item 5.02                   6
 *   상장폐지 우려·관리종목지정·매매거래정지                 Item 3.01 상장유지 실패     9
 *   최대주주변경을수반하는주식담보제공계약체결               Item 5.01 지배권 변동       8
 *   풍문또는보도에대한해명(미확정)                          Item 7.01/8.01 소문 해명    6
 *   타인에대한채무보증결정                                 Item 2.03 채무 발생          6
 *   특수관계인 자금차입·자금대여·유상증자참여                지배구조 적신호(8-K 없음)   4
 *   전환가액의조정                                         Item 3.02 인접(희석)        4
 *   의결권대리행사권유참고서류                             위임장 대결 가능성           5
 *
 * ⛔ 아래는 실측에서 «건수는 많지만 잡음»으로 판정해 **의도적으로 안 걸리게 둔다** —
 *   증권신고서·투자설명서·일괄신고추가서류(ELS/DLS 등 정기 발행 서류, 300건대),
 *   기업설명회(IR)개최안내, 주주총회소집공고(의결 «결과»가 아니라 «안내»뿐일 때),
 *   임원ㆍ주요주주특정증권등소유상황보고서(따로 `collect-dart-ownership.mjs` 가 다룬다).
 * ⛔ 이 무게는 **8-K 유형에 맞춰 본 사람 규칙**이다 — DART 가 스스로 매긴 등급이 아니다.
 *   그래서 신호는 못 만든다(투자AI 판독지침: 근거·sourceId 없이 신호화 금지). 감지까지다.
 *
 * 실행:  node scripts/collect-dart-breaking.mjs [YYYYMMDD]   (없으면 오늘)
 *        node scripts/collect-dart-breaking.mjs --자가시험
 * 출력:  archive/raw/dart-breaking/<날짜>.json  +  콘솔 요약(상위 후보)
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1'), '..');

/**
 * 속보로 값어치 있는 공시 유형과, 그 유형을 읽는 구조화 API·무게.
 * 무게가 클수록 시장 영향이 크다고 보고 위로 세운다. (근거는 위 헤더 주석의 8-K 대응표)
 */
export const 유형 = [
  { re: /상장폐지|관리종목\s*지정|매매거래정지|시가총액\s*미달/, 무게: 9, 태그: 'delisting-risk', api: null },
  { re: /매출액또는손익구조/, 무게: 9, 태그: 'earnings-swing', api: null },
  { re: /단일판매ㆍ?공급계약/, 무게: 8, 태그: 'supply-contract', api: null },
  { re: /(자기)?주식소각결정/, 무게: 8, 태그: 'cancellation', api: null },
  { re: /대표이사\s*(변경|선임|해임)/, 무게: 8, 태그: 'ceo-change', api: null },
  { re: /최대주주변경을수반하는|최대주주.*변경.*주식담보제공계약/, 무게: 8, 태그: 'control-change', api: null },
  { re: /자기주식취득결정/, 무게: 7, 태그: 'buyback', api: 'tsstkAqDecsn' },
  { re: /유상증자결정/, 무게: 7, 태그: 'rights-issue', api: 'piicDecsn' },
  { re: /독립이사의?\s*선임ㆍ?해임또는중도퇴임/, 무게: 6, 태그: 'director-change', api: null },
  { re: /무상증자결정/, 무게: 6, 태그: 'bonus-issue', api: 'fricDecsn' },
  { re: /타법인주식및출자증권취득결정/, 무게: 6, 태그: 'acquisition', api: null },
  { re: /전환사채권발행결정/, 무게: 6, 태그: 'convertible-bond', api: null },
  { re: /풍문또는보도에대한해명/, 무게: 6, 태그: 'rumor-response', api: null },
  { re: /타인(에|을)\s*(위한|대한)\s*채무보증결정/, 무게: 6, 태그: 'debt-guarantee', api: null },
  { re: /의결권대리행사권유참고서류/, 무게: 5, 태그: 'proxy-solicitation', api: null },
  { re: /투자판단관련주요경영사항/, 무게: 5, 태그: 'material-event', api: null },
  { re: /특수관계인.*(자금차입|자금대여|유상증자참여)|금전대여결정/, 무게: 4, 태그: 'related-party-financing', api: null },
  { re: /전환가액의?\s*조정/, 무게: 4, 태그: 'cb-repricing', api: null },
  { re: /주요사항보고서/, 무게: 4, 태그: 'major-report', api: null },
];

/**
 * report_nm(정정 대괄호 태그 포함 원문) → 걸린 유형 하나(가장 위에서 매치된 것) 또는 null.
 * ⛔ 「[기재정정]」같은 접두는 매치를 방해하면 안 된다 — 지운 뒤 검사한다.
 */
export function 유형찾기(report_nm) {
  const nm = String(report_nm ?? '').replace(/\[.*?\]/g, '').trim();
  return 유형.find((x) => x.re.test(nm)) ?? null;
}

/* ── 자가시험 — 실측한 진짜 report_nm 문자열로 잰다 ──────────────────────── */
function 자가시험() {
  const 것 = []; const 재다 = (이름, 됐나) => 것.push({ 이름, 됐나 });

  재다('대표이사변경 → ceo-change 무게8', 유형찾기('대표이사변경')?.태그 === 'ceo-change');
  재다('상장폐지 우려 안내 → delisting-risk 무게9',
    유형찾기('기타시장안내(시가총액 미달에 따른 상장폐지 우려 관련 안내)')?.태그 === 'delisting-risk');
  재다('관리종목지정 → delisting-risk', 유형찾기('관리종목지정')?.태그 === 'delisting-risk');
  재다('매매거래정지 → delisting-risk', 유형찾기('주권매매거래정지')?.태그 === 'delisting-risk');
  재다('최대주주변경을수반하는주식담보제공계약체결 → control-change',
    유형찾기('최대주주변경을수반하는주식담보제공계약체결')?.태그 === 'control-change');
  재다('독립이사의선임ㆍ해임또는중도퇴임에관한신고 → director-change',
    유형찾기('독립이사의선임ㆍ해임또는중도퇴임에관한신고')?.태그 === 'director-change');
  재다('풍문또는보도에대한해명(미확정) → rumor-response',
    유형찾기('풍문또는보도에대한해명(미확정)')?.태그 === 'rumor-response');
  재다('타인에대한채무보증결정 → debt-guarantee', 유형찾기('타인에대한채무보증결정')?.태그 === 'debt-guarantee');
  재다('타인을위한채무보증결정 → debt-guarantee', 유형찾기('타인을위한채무보증결정')?.태그 === 'debt-guarantee');
  재다('의결권대리행사권유참고서류 → proxy-solicitation',
    유형찾기('의결권대리행사권유참고서류')?.태그 === 'proxy-solicitation');
  재다('특수관계인으로부터자금차입 → related-party-financing',
    유형찾기('특수관계인으로부터자금차입')?.태그 === 'related-party-financing');
  재다('금전대여결정 → related-party-financing', 유형찾기('금전대여결정')?.태그 === 'related-party-financing');
  재다('전환가액의조정 → cb-repricing', 유형찾기('전환가액의 조정')?.태그 === 'cb-repricing');
  재다('주식소각결정(자기 접두 없이) → cancellation', 유형찾기('주식소각결정')?.태그 === 'cancellation');
  재다('자기주식소각결정(옛 표현) → cancellation', 유형찾기('자기주식소각결정')?.태그 === 'cancellation');
  재다('[기재정정]대표이사변경 → 대괄호 접두를 지우고도 걸린다', 유형찾기('[기재정정]대표이사변경')?.태그 === 'ceo-change');

  재다('⛔ 잡음(증권신고서)은 안 걸린다', 유형찾기('증권신고서(지분증권)') === null);
  재다('⛔ 잡음(투자설명서)은 안 걸린다', 유형찾기('투자설명서') === null);
  재다('⛔ 잡음(일괄신고추가서류)은 안 걸린다', 유형찾기('일괄신고추가서류(파생결합사채-주가연계파생결합사채)') === null);
  재다('⛔ 잡음(기업설명회 IR 개최안내)은 안 걸린다', 유형찾기('기업설명회(IR)개최(안내공시)') === null);
  재다('⛔ 잡음(임원ㆍ주요주주 소유상황보고서, 별도 파이프라인)은 안 걸린다',
    유형찾기('임원ㆍ주요주주특정증권등소유상황보고서') === null);
  재다('⛔ 관계 없는 제목은 null', 유형찾기('전혀 상관없는 제목') === null);

  재다('상장폐지가 실적변동보다 위(둘 다 무게9지만 표 순서상 먼저 매치)',
    유형.findIndex((x) => x.태그 === 'delisting-risk') < 유형.findIndex((x) => x.태그 === 'earnings-swing'));

  const 실패 = 것.filter((x) => !x.됐나);
  console.log(`■ 자가시험 ${것.length - 실패.length}/${것.length}`);
  for (const x of 실패) console.log(`  🔴 ${x.이름}`);
  return 실패.length === 0;
}

if (process.argv.includes('--자가시험')) process.exit(자가시험() ? 0 : 1);
if (!자가시험()) { console.log('🔴 자가시험이 깨졌다 — 돌리지 않는다.'); process.exit(1); }
console.log('');

function 키읽기() {
  const p = path.join(ROOT, '.env');
  if (existsSync(p)) for (const l of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = l.match(/^\s*DART_API_KEY\s*=\s*(.*)$/);
    if (m) return m[1].trim().replace(/^["']|["']$/g, '');
  }
  return process.env.DART_API_KEY ?? '';
}
const K = 키읽기();
if (!K) { console.error('⛔ DART_API_KEY 가 없다. .env 를 본다.'); process.exit(1); }

/** 오늘 날짜(KST) YYYYMMDD — 인자로 덮어쓸 수 있다 */
function 오늘KST() {
  const now = new Date(Date.now() + 9 * 3600 * 1000);
  return now.toISOString().slice(0, 10).replace(/-/g, '');
}
const 날짜 = (process.argv[2] && /^\d{8}$/.test(process.argv[2])) ? process.argv[2] : 오늘KST();

async function 젠(url) {
  const r = await fetch(url);
  return r.json();
}

/** 그날 공시 목록 전부 (페이지 넘김) */
async function 목록(de) {
  const all = [];
  for (let p = 1; p <= 25; p++) {
    const u = `https://opendart.fss.or.kr/api/list.json?crtfc_key=${K}&bgn_de=${de}&end_de=${de}&page_no=${p}&page_count=100`;
    const j = await 젠(u);
    if (j.status !== '000' || !j.list) break;
    all.push(...j.list);
    if (j.list.length < 100) break;
  }
  return all;
}

/** 자기주식 취득 결정의 수 (금액·주식수·소각여부) */
async function 자사주(cc, de) {
  const u = `https://opendart.fss.or.kr/api/tsstkAqDecsn.json?crtfc_key=${K}&corp_code=${cc}&bgn_de=${de}&end_de=${de}`;
  const j = await 젠(u);
  const r = (j.list || [])[0];
  if (!r) return null;
  return {
    주식: r.aqpln_stk_ostk, 금액원: r.aqpln_prc_ostk,
    방법: r.aq_mth, 목적: r.aq_pp,
    소각: /소각/.test(r.aq_pp || ''),
  };
}

const 목록전체 = await 목록(날짜);
console.log(`DART ${날짜} 총 공시 ${목록전체.length}건`);

// 후보 추리기 — 정정([기재정정] 등)은 원 유형으로 인식하되 표시
const 후보 = [];
for (const it of 목록전체) {
  const nm = it.report_nm;
  const t = 유형찾기(nm);
  if (!t) continue;
  후보.push({
    corp: it.corp_name, cls: it.corp_cls, code: it.stock_code, corp_code: it.corp_code,
    report: nm, rcept: it.rcept_no, flr: it.flr_nm,
    태그: t.태그, 무게: t.무게, 정정: /정정/.test(nm), api: t.api,
  });
}

// 자기주식은 수까지 붙인다 (구조화 API 가 있는 유형)
for (const c of 후보) {
  if (c.api === 'tsstkAqDecsn') {
    try { c.수 = await 자사주(c.corp_code, 날짜); } catch { c.수 = null; }
  }
}

후보.sort((a, b) => b.무게 - a.무게);

// 저장 (archive = gitignore, R2/사설 규약)
const 낼방 = path.join(ROOT, 'archive', 'raw', 'dart-breaking');
mkdirSync(낼방, { recursive: true });
const 파일 = path.join(낼방, `${날짜}.json`);
/* 🔴🔴 [2026-10-09 · 5번] **빈 날이 「없다」인지 「못 받았다」인지 알 수 없었다.**
   ─────────────────────────────────────────────────────────────────────────
   이 방에 빈 파일이 7개 있다(`후보: []`). 그 빈 칸이
     ① 그날 속보감 공시가 «정말 없었다»   ② DART 를 «못 받았다»
   가운데 무엇인지 파일만 봐서는 알 수 없었다.
   오늘 내가 다른 자료에서 바로 그 빈 칸을 보고 **짐작으로 까닭을 적었다가 틀렸다.**
   ⭐ 강령 — 「못 잰 것은 못 쟀다고 적는다 ·  · 」
   ⇒ UAE·두바이 수집기와 같은 꼴로 `_meta.coverage` 를 적는다.
   ⛔ 「총」이 0 인 것과 「후보」가 0 인 것은 **다르다** — 앞은 목록을 못 받았거나 공시가 없는 것이고,
     뒤는 공시는 받았는데 속보감이 없는 것이다. 둘을 갈라 적는다.
   ⛔ 값을 지어내지 않는다. 검사: `node scripts/check-없음과-못잼을-가르나.mjs` */
const 커버리지 = {
  attempted: true,
  listReceived: 목록전체.length,            /* 그날 DART 목록을 몇 건 받았나 */
  withData: 후보.length > 0,
  empty: 후보.length === 0,
  emptyReason: 후보.length > 0
    ? null
    : (목록전체.length === 0
      ? 'no-filings-received-for-the-day'        /* 목록 자체가 0 — 쉬는 날이거나 못 받았다 */
      : 'filings-received-but-none-met-weight'), /* 공시는 받았는데 속보감이 없었다 */
};
writeFileSync(파일, JSON.stringify({
  _meta: {
    product: 'DART breaking-news candidates',
    asOf: 날짜,
    builtAt: new Date().toISOString(),
    source: 'DART (Financial Supervisory Service) open API — list.json',
    coverage: 커버리지,
  },
  날짜,
  총: 목록전체.length,
  후보,
}, null, 1));

// 콘솔 요약 — 상위 12
console.log(`\n속보 후보 ${후보.length}건 (무게순 상위 12):`);
for (const c of 후보.slice(0, 12)) {
  const 수 = c.수 ? ` · ${c.수.금액원}원${c.수.소각 ? ' [소각]' : ''}` : '';
  console.log(`  [${c.무게}] ${c.태그} · ${c.corp}(${c.cls}${c.code ? ' ' + c.code : ''})${c.정정 ? ' ⟳정정' : ''} · rcp=${c.rcept}${수}`);
}
console.log(`\n→ 전체: ${path.relative(ROOT, 파일)}`);
console.log('⭐ 감지까지다. 영어 속보로 쓸 한 건은 사람이 고르고 검산해 쓴다.');
