#!/usr/bin/env node
/**
 * collect-japan-edinet-breaking.mjs — **일본 중대공시(臨時報告書). 나라 차례표의 둘째 칸.**
 *
 *   node scripts/collect-japan-edinet-breaking.mjs --재본다           며칠치에 몇 건 있나만
 *   node scripts/collect-japan-edinet-breaking.mjs --며칠 5 --적는다
 *   node scripts/collect-japan-edinet-breaking.mjs --날 2026-09-18 --적는다
 *   node scripts/collect-japan-edinet-breaking.mjs --자가시험
 *
 * ── 🔴 왜 (2026-09-22 · 5번) ────────────────────────────────────────────
 * 회사 규칙의 새 나라 차례표 — ① 재무제표 ② **공시(중대사건)** ③ 컨센서스.
 * 일본은 ①이 섰다(3,672사). 이것이 ②다.
 * 사장님이 못박으신 두 태그가 여기 있다 — **지배권 변경 · 대표이사 변경**.
 *
 * ── ⭐ 한국과 결정적으로 다른 점 ─────────────────────────────────────────
 * ```
 * 한국 DART   제목이 「단일판매ㆍ공급계약체결」·「대표이사 변경」  → 제목 정규식으로 태그가 선다
 * 일본 EDINET 제목이 「臨時報告書」 하나뿐                      → 제목으로는 아무것도 모른다
 * ```
 * ⛔ 한국 수집기를 베끼면 태그가 **하나도** 안 선다.
 * ⭐ 대신 더 단단한 길이 있다 — 서류 안에 **사건 이름을 단 요소**가 따로 들어온다.
 *   `jpcrp-esr_cor:ChangesInRepresentativeDirectorsTextBlock` 처럼. 곧 «어떤 요소가
 *   있느냐»가 그대로 태그다. 글월이 바뀌어도 요소 이름은 안 바뀐다.
 *
 * ⚠ 아래 태그표는 **짐작이 아니라 실측**이다 — 2026-09-14~18 닷새, 상장 임시보고서
 *   81건을 열어 나온 요소 19가지를 세어 옮겼다. 새 이름이 나오면 `모르는것` 으로 쌓인다.
 *
 * ── 이용허락범위 ──────────────────────────────────────────────────────────
 * 금융청 EDINET — 공공데이터 이용규약(PDL1.0). 재무제표와 같은 우물, 같은 규약.
 * ⛔ 열쇠 값을 화면·로그·커밋 어디에도 안 찍는다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 둘곳 = path.join(뿌리, 'archive', 'raw', 'japan-edinet-breaking');

/**
 * 요소 이름 → 영문 태그·설명·무게.
 *
 * 무게는 한국(`collect-dart-breaking.mjs`)과 **같은 자로** 맞춘다 — 두 나라를 한 화면에
 * 놓고 견주려면 눈금이 같아야 한다. 지배권·대표이사 변경이 8, 실적에 큰 영향이 9.
 * ⛔ 「좋다/나쁘다」를 이름에 넣지 않는다. 사건의 이름만 적는다.
 */
export const 사건 = {
  ChangesInMajorShareholderTextBlock:
    { tag: 'major-shareholder-change', en: 'Major shareholder change', 무게: 8,
      뜻: 'A change in who holds a major stake in the company' },
  ChangesInParentCompaniesOrSpecifiedSubsidiariesTextBlock:
    { tag: 'control-change', en: 'Parent or key subsidiary change', 무게: 8,
      뜻: 'A change in the parent company, or in a subsidiary the rules treat as significant' },
  ChangesInRepresentativeDirectorsTextBlock:
    { tag: 'ceo-change', en: 'Representative director change', 무게: 8,
      뜻: 'A change in the representative director — the office a Japanese company files as its chief executive' },
  EventWithSignificantEffectsOnFinancialPositionBusinessPerformanceAndCashFlowsTextBlock:
    { tag: 'material-event', en: 'Event with significant effect', 무게: 9,
      뜻: 'An event the company states will materially affect its financial position, results or cash flows' },
  EventWithSignificantEffectsOnFinancialPositionBusinessPerformanceAndCashFlowsOfGroupTextBlock:
    { tag: 'material-event-group', en: 'Group-level significant event', 무게: 9,
      뜻: 'The same, stated at group level rather than for the filer alone' },
  DecisionOnAcquisitionOfSubsidiaryTextBlock:
    { tag: 'subsidiary-acquisition', en: 'Subsidiary acquisition', 무게: 6,
      뜻: 'A decision to acquire another company as a subsidiary' },
  DecisionOnAcquisitionOfSubsidiaryByConsolidatedSubsidiaryTextBlock:
    { tag: 'subsidiary-acquisition', en: 'Subsidiary acquisition', 무게: 6,
      뜻: 'The same, decided by a consolidated subsidiary rather than the filer' },
  DecisionOnShareExchangeTextBlock:
    { tag: 'share-exchange', en: 'Share exchange', 무게: 7,
      뜻: 'A decision to exchange shares — the structure Japan uses to make one company a wholly owned subsidiary of another' },
  DecisionOnAbsorptionTypeMergerTextBlock:
    { tag: 'merger', en: 'Absorption-type merger', 무게: 7,
      뜻: 'A decision to merge, with one company absorbing the other' },
  DecisionOnAbsorptionTypeSplitOfConsolidatedSubsidiaryTextBlock:
    { tag: 'company-split', en: 'Company split', 무게: 6,
      뜻: 'A decision to split off part of a consolidated subsidiary into another company' },
  DecisionOnHoldingShareholdersMeetingForPurposeOfReverseStockSplitTextBlock:
    { tag: 'reverse-split', en: 'Reverse stock split', 무게: 6,
      뜻: 'A meeting called to decide on consolidating shares' },
  ResolutionOfShareholdersMeetingTextBlock:
    { tag: 'agm-outcome', en: 'Shareholders meeting outcome', 무게: 5,
      뜻: 'How the resolutions put to a shareholders meeting were voted' },
  IssueOfStockOptionsNotSubjectToSecuritiesRegistrationTextBlock:
    { tag: 'stock-options', en: 'Stock option issue', 무게: 4,
      뜻: 'Share options issued without a securities registration statement' },
  FinancialCovenantsTextBlock:
    { tag: 'financial-covenant', en: 'Financial covenant', 무게: 6,
      뜻: 'A covenant attached to the company’s borrowing — what would count as a breach' },
  /* 🔴 [2026-10-04 06:5x · 5번] 아래 셋은 「표에 없는 요소」로 떠 있던 것들이다.
     자가 「안 올리면 그 사건은 영영 안 잡힌다」고 적어 두었고, 그대로 두면 수집은 되어도
     갈래가 안 붙어 지면에서 못 쓴다. 이름이 또렷한 셋만 올린다.
     ⛔ 뜻이 아리송한 것은 올리지 않는다 — 잘못 붙인 갈래가 빈 갈래보다 나쁘다.
     ⚠ 무게는 이미 있는 짝과 맞춘다(지배권·대표 8 · 실적 영향 9 · 재무약정 6). */
  FinancialCovenantsOfConsolidatedSubsidiariesTextBlock:
    { tag: 'financial-covenant', en: 'Financial covenant (subsidiary)', 무게: 6,
      뜻: 'A covenant attached to a consolidated subsidiary’s borrowing — what would count as a breach' },
  DecisionOnTransferOrAcquisitionOfBusinessTextBlock:
    { tag: 'business-transfer', en: 'Business transferred or acquired', 무게: 8,
      뜻: 'A decision to sell or buy a business — not the whole company, but a line of it' },
  PrivatePlacementOfSecuritiesTextBlock:
    { tag: 'private-placement', en: 'Securities placed privately', 무게: 7,
      뜻: 'Shares or bonds sold to named investors rather than offered to the public' },
  LikelihoodOfUncollectibleOrDelinquentAccountsTextBlock:
    { tag: 'bad-debt', en: 'Receivable may not be collected', 무게: 8,
      뜻: 'The company states a receivable may not be collected on time or at all' },
  LikelihoodOfUncollectibleOrDelinquentAccountsOfConsolidatedSubsidiaryTextBlock:
    { tag: 'bad-debt', en: 'Receivable may not be collected', 무게: 8,
      뜻: 'The same, at a consolidated subsidiary' },
  ChangeInIndependentAuditorsTextBlock:
    { tag: 'auditor-change', en: 'Auditor change', 무게: 7,
      뜻: 'A change of the accounting firm that audits the company' },
  CorporateShareholderGovernanceAgreementTextBlock:
    { tag: 'governance-agreement', en: 'Shareholder governance agreement', 무게: 6,
      뜻: 'An agreement between the company and a shareholder about how it is run' },
  PublicOfferingOrSecondaryDistributionOfSecuritiesOutsideJapanTextBlock:
    { tag: 'offering-abroad', en: 'Offering outside Japan', 무게: 6,
      뜻: 'Shares or bonds offered or distributed outside Japan' },
  /* 🔴 [2026-09-22] 60일치를 받으니 표에 없는 이름 넷이 떴다 — «모르는것» 통이 제 일을 했다.
     넷 다 이미 있는 사건의 변형이다(자회사가 한 것 · 주식양도 약정). 같은 태그로 묶는다.
     ⛔ 새 태그를 만들어 갈래를 늘리지 않는다 — 손님이 읽을 이름은 사건이지 주체가 아니다. */
  CorporateShareholderAgreementOnShareTransferEtcTextBlock:
    { tag: 'governance-agreement', en: 'Shareholder governance agreement', 무게: 6,
      뜻: 'An agreement between the company and a shareholder about how it is run, including share transfers' },
  DecisionOnAbsorptionTypeSplitTextBlock:
    { tag: 'company-split', en: 'Company split', 무게: 6,
      뜻: 'A decision to split off part of the business into another company' },
  DecisionOnAbsorptionTypeMergerOfConsolidatedSubsidiaryTextBlock:
    { tag: 'merger', en: 'Absorption-type merger', 무게: 7,
      뜻: 'The same merger decision, taken at a consolidated subsidiary' },
  DecisionOnShareExchangeOfConsolidatedSubsidiaryTextBlock:
    { tag: 'share-exchange', en: 'Share exchange', 무게: 7,
      뜻: 'The same share-exchange decision, taken at a consolidated subsidiary' },
};

/** CSV 한 줄을 칸으로 가른다 — 탭 구분, 값은 큰따옴표로 싸여 있다 */
export function 줄가르기(줄) {
  return String(줄 || '').split('\t').map((s) => s.replace(/^"|"$/g, ''));
}

/** 한 칸의 값을 찾는다. 없거나 「－」면 null */
export function 칸값(글, 요소) {
  for (const 줄 of String(글 || '').split(/\r?\n/)) {
    const c = 줄가르기(줄);
    if (c[0] !== 요소) continue;
    const v = String(c[8] ?? '').trim();
    if (!v || v === '－' || v === '-') return null;
    return v;
  }
  return null;
}

/**
 * 서류 글에서 **어떤 사건인가**를 고른다.
 *
 * ⛔ 자유글(ReasonForFiling)을 정규식으로 긁지 않는다 — 글월은 회사마다 다르다.
 * ✅ «사건 이름을 단 요소»가 있느냐로 정한다.
 * ⚠ 한 서류에 사건이 여럿일 수 있다(모회사 변경 + 실적 영향). 다 담는다.
 * ⚠ 표에 없는 이름은 버리지 않고 `모르는것` 으로 담는다 — 안 담으면 늘 때 아무도 모른다.
 */
export function 사건고르기(글) {
  const 태그 = [];
  const 모르는것 = [];
  const 본것 = new Set();
  for (const 줄 of String(글 || '').split(/\r?\n/)) {
    const c = 줄가르기(줄);
    const e = c[0] || '';
    if (!/^jpcrp-esr_cor:/.test(e)) continue;
    const 이름 = e.replace('jpcrp-esr_cor:', '');
    if (/CoverPage|ReasonForFiling/.test(이름)) continue;
    if (본것.has(이름)) continue;
    본것.add(이름);
    const s = 사건[이름];
    if (!s) { 모르는것.push(이름); continue; }
    if (!태그.includes(s.tag)) 태그.push(s.tag);
  }
  return { 태그, 모르는것 };
}

/** 그 서류가 «담을 만한가» — 아는 사건이 하나도 없으면 안 담는다 */
export function 담을만한가(고른것) {
  return Boolean(고른것?.태그?.length);
}

/** 여러 태그가 붙으면 그중 «가장 무거운» 것을 그 서류의 무게로 쓴다 */
export function 무게재기(태그들) {
  let 가장 = 0;
  for (const s of Object.values(사건)) if ((태그들 || []).includes(s.tag)) 가장 = Math.max(가장, s.무게);
  return 가장 || null;
}

/** EDINET 종목코드는 다섯 자리(끝 0) — 네 자리로 줄인다. ⚠ 130A0 처럼 글자가 섞인 것도 있다 */
export function 종목코드(다섯) {
  const s = String(다섯 ?? '').trim();
  if (!s) return null;
  return s.length === 5 && s.endsWith('0') ? s.slice(0, 4) : s;
}

/** 오늘로부터 며칠 전 평일들 — 주말은 서류가 0건이다 */
export function 최근평일(며칠, 오늘 = new Date()) {
  const 것 = [];
  for (let i = 1; 것.length < 며칠 && i <= 며칠 * 3; i++) {
    const t = new Date(오늘); t.setDate(오늘.getDate() - i);
    if (t.getDay() === 0 || t.getDay() === 6) continue;
    것.push(`${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`);
  }
  return 것;
}

/* ── 자가시험 ──────────────────────────────────────────────── */
const 내가진입점 = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (내가진입점 && (process.argv.includes('--자가시험') || process.argv.includes('--selftest'))) {
  const 잰다 = [];
  const 검 = (이름, 참) => 잰다.push([이름, !!참]);
  const 머리 = '"要素ID"\t"項目名"\t"コンテキストID"\t"相対年度"\t"連結・個別"\t"期間・時点"\t"ユニットID"\t"単位"\t"値"';
  const 줄 = (e, 값) => `"${e}"\t"이름"\t"ctx"\t""\t""\t""\t""\t""\t"${값}"`;
  const 글 = (...es) => [머리, ...es.map((e) => 줄(e, '있다'))].join('\n');

  검('탭으로 가르고 따옴표를 벗긴다', 줄가르기('"a"\t"b"')[0] === 'a');
  검('칸 값을 찾는다', 칸값([머리, 줄('jpdei_cor:SecurityCodeDEI', '75710')].join('\n'), 'jpdei_cor:SecurityCodeDEI') === '75710');
  검('⛔ 「－」는 값이 아니다', 칸값([머리, 줄('jpdei_cor:FundCodeDEI', '－')].join('\n'), 'jpdei_cor:FundCodeDEI') === null);
  검('없으면 null', 칸값(머리, 'jpdei_cor:SecurityCodeDEI') === null);

  검('⭐ 대표이사 변경을 잡는다 — 사장님이 못박으신 둘 가운데 하나',
    사건고르기(글('jpcrp-esr_cor:ChangesInRepresentativeDirectorsTextBlock')).태그[0] === 'ceo-change');
  검('⭐ 지배권(모회사) 변경을 잡는다 — 나머지 하나',
    사건고르기(글('jpcrp-esr_cor:ChangesInParentCompaniesOrSpecifiedSubsidiariesTextBlock')).태그[0] === 'control-change');
  검('대주주 변경도 따로 잡는다',
    사건고르기(글('jpcrp-esr_cor:ChangesInMajorShareholderTextBlock')).태그[0] === 'major-shareholder-change');
  검('한 서류에 사건이 둘이면 둘 다 담는다',
    사건고르기(글('jpcrp-esr_cor:ChangesInRepresentativeDirectorsTextBlock',
      'jpcrp-esr_cor:ChangesInMajorShareholderTextBlock')).태그.length === 2);
  검('같은 태그를 두 번 담지 않는다',
    사건고르기(글('jpcrp-esr_cor:DecisionOnAcquisitionOfSubsidiaryTextBlock',
      'jpcrp-esr_cor:DecisionOnAcquisitionOfSubsidiaryByConsolidatedSubsidiaryTextBlock')).태그.length === 1);
  검('⛔ 표지는 사건이 아니다',
    사건고르기(글('jpcrp-esr_cor:CompanyNameCoverPage')).태그.length === 0);
  검('⛔ 제출 사유(자유글)도 사건이 아니다',
    사건고르기(글('jpcrp-esr_cor:ReasonForFilingTextBlock')).태그.length === 0);
  검('⛔ 모르는 이름을 버리지 않고 담아 둔다',
    사건고르기(글('jpcrp-esr_cor:아직없는사건TextBlock')).모르는것.length === 1);
  검('아는 사건이 없으면 안 담는다', 담을만한가(사건고르기(글('jpcrp-esr_cor:CompanyNameCoverPage'))) === false);
  검('있으면 담는다', 담을만한가(사건고르기(글('jpcrp-esr_cor:ChangesInMajorShareholderTextBlock'))) === true);

  검('여럿이면 가장 무거운 것을 쓴다', 무게재기(['agm-outcome', 'ceo-change']) === 8);
  검('실적 영향이 제일 무겁다', 무게재기(['material-event']) === 9);
  검('모르는 태그면 null', 무게재기(['없는태그']) === null);

  검('종목코드 다섯 자리를 네 자리로', 종목코드('75710') === '7571');
  검('⚠ 글자가 섞인 코드도 줄인다', 종목코드('130A0') === '130A');
  검('⛔ 빈 것은 null', 종목코드('') === null);

  const 평일 = 최근평일(5, new Date(2026, 8, 21));
  검('며칠만큼 낸다', 평일.length === 5);
  검('주말을 건너뛴다', 평일[0] === '2026-09-18');

  검('사건 이름·설명에 한국어가 없다',
    !/[가-힣]/.test(Object.values(사건).map((v) => v.en + v.뜻 + v.tag).join('')));
  /* 🔴 [2026-10-04 06:5x] **수를 박아 둔 시험이 요소를 더할 때마다 빨개진다.**
     「스물세 가지」·「열일곱뿐」으로 못 박아 두었더니, 오늘 표에 없던 요소 셋을 올리자
     그 자리가 깨졌다. 요소가 느는 것은 «좋은 일»이다 — EDINET 이 새 서식을 내면 는다.
     ⛔ 수를 박지 말고 «줄지 않았나»와 «짝이 맞나»를 본다.
     (같은 날 색인 자에서 「klifemap 대표 지면이 여덟이다」가 같은 꼴로 깨졌다) */
  검('실측한 스물세 가지를 «적어도» 다 적었다 — 줄면 누가 지운 것이다',
    Object.keys(사건).length >= 23);
  검('⛔ 요소 이름이 겹치지 않는다', new Set(Object.keys(사건)).size === Object.keys(사건).length);
  검('자회사가 한 합병도 같은 태그로 묶는다',
    사건['DecisionOnAbsorptionTypeMergerOfConsolidatedSubsidiaryTextBlock'].tag === 사건['DecisionOnAbsorptionTypeMergerTextBlock'].tag);
  검('🔴 갈래 이름은 사건이지 주체가 아니다 — 자회사가 한 것도 같은 갈래로 묶인다',
    new Set(Object.values(사건).map((v) => v.tag)).size < Object.keys(사건).length);
  검('⛔ 갈래 이름에 주체가 안 들어간다 (…-by-subsidiary 같은 꼬리)',
    Object.values(사건).every((v) => !/-by-|-of-consolidated/.test(v.tag)));
  검('⛔ 모든 사건에 태그·영문·무게·뜻이 있다',
    Object.values(사건).every((v) => v.tag && v.en && Number.isFinite(v.무게) && v.뜻));

  const 진 = 잰다.filter(([, v]) => !v);
  for (const [이름, v] of 잰다) console.log(`${v ? '✅' : '🔴'} ${이름}`);
  console.log(진.length ? `\n🔴 ${진.length}/${잰다.length} 떨어졌다` : `\n✅ 자가시험 ${잰다.length} 통과`);
  process.exit(진.length ? 1 : 0);
}

/* ── 실제로 받는다 ──────────────────────────────────────────────── */
if (내가진입점) {
  const 인자 = (이름, 기본 = null) => {
    const i = process.argv.indexOf(이름);
    return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : 기본;
  };
  const 적는다 = (process.argv.includes('--적는다') || process.argv.includes('--write'));
  const 재본다 = process.argv.includes('--재본다');
  const 다시받는다 = process.argv.includes('--다시받는다');

  const KEY = (() => {
    try { return fs.readFileSync(path.join(뿌리, '.env'), 'utf8').match(/^EDINET_KEY=(.+)$/m)?.[1]?.trim() || null; }
    catch { return null; }
  })();
  if (!KEY) { console.error('🔴 .env 에 EDINET_KEY 가 없다'); process.exit(1); }

  /* 끊기면 다시 건다 — 250일을 한 번에 받다 죽은 적이 있다(2026-09-21) */
  const 끈질기게 = async (u, 다시 = 3) => {
    let 마지막;
    for (let n = 0; n <= 다시; n++) {
      try {
        const ac = new AbortController();
        const 시계 = setTimeout(() => ac.abort(), 30000);
        try { return await fetch(u, { signal: ac.signal }); } finally { clearTimeout(시계); }
      } catch (e) {
        마지막 = e;
        if (n < 다시) await new Promise((r) => setTimeout(r, 3000 * (n + 1)));
      }
    }
    throw 마지막;
  };

  const 날하나 = 인자('--날');
  const 날들 = 날하나 ? [날하나] : 최근평일(Number(인자('--며칠', 5)));

  let 받음 = 0, 건너 = 0, 실패 = 0, 못본날 = 0;
  const 태그셈 = {};
  const 모르는것셈 = {};

  for (const 날 of 날들) {
    let 목;
    try {
      const r = await 끈질기게(`https://api.edinet-fsa.go.jp/api/v2/documents.json?date=${날}&type=2&Subscription-Key=${KEY}`);
      const j = await r.json().catch(() => null);
      목 = (j?.results || []).filter((x) => String(x.docTypeCode) === '180' && x.secCode && x.xbrlFlag === '1');
    } catch (e) { 못본날++; console.log(`   🔴 ${날} 목록을 못 받았다 — ${String(e?.message ?? e).slice(0, 50)}`); continue; }

    console.log(`\n── ${날} : 임시보고서(상장) ${목.length}건`);
    if (재본다) continue;
    const 날폴더 = path.join(둘곳, 날);
    if (적는다) fs.mkdirSync(날폴더, { recursive: true });

    for (const d of 목) {
      const 낼길 = path.join(날폴더, `${d.docID}.json`);
      if (적는다 && !다시받는다 && fs.existsSync(낼길)) { 건너++; continue; }
      const 임시 = path.join(둘곳, `_tmp-${d.docID}`);
      try {
        const rr = await 끈질기게(`https://api.edinet-fsa.go.jp/api/v2/documents/${d.docID}?type=5&Subscription-Key=${KEY}`);
        if (!rr.ok) { 실패++; continue; }
        fs.rmSync(임시, { recursive: true, force: true });
        fs.mkdirSync(임시, { recursive: true });
        fs.writeFileSync(`${임시}.zip`, Buffer.from(await rr.arrayBuffer()));
        execFileSync('powershell', ['-NoProfile', '-Command',
          `Expand-Archive -Path "${임시}.zip" -DestinationPath "${임시}" -Force`]);
        const 훑 = (dir) => fs.readdirSync(dir, { withFileTypes: true })
          .flatMap((e) => (e.isDirectory() ? 훑(path.join(dir, e.name)) : [path.join(dir, e.name)]));
        const csv = 훑(임시).filter((f) => /\.csv$/i.test(f))
          .sort((a, b) => fs.statSync(b).size - fs.statSync(a).size)[0];
        if (!csv) { 실패++; continue; }
        const 씨 = fs.readFileSync(csv, 'utf16le');
        const 고른것 = 사건고르기(씨);
        for (const m of 고른것.모르는것) 모르는것셈[m] = (모르는것셈[m] || 0) + 1;
        if (!담을만한가(고른것)) { 실패++; continue; }
        for (const t of 고른것.태그) 태그셈[t] = (태그셈[t] || 0) + 1;

        const 한벌 = {
          _meta: {
            출처: '금융청 EDINET (api.edinet-fsa.go.jp/api/v2) — 臨時報告書',
            이용허락범위: '공공데이터 이용규약(PDL1.0) — 상업적 이용 가능, 출처 표시',
            받은날: 날, 받은때: new Date().toLocaleString('ko-KR'),
          },
          docID: d.docID,
          sec_code: 종목코드(d.secCode),
          edinet_code: d.edinetCode,
          name: d.filerName,
          name_en: 칸값(씨, 'jpdei_cor:FilerNameInEnglishDEI'),
          filed: 칸값(씨, 'jpcrp-esr_cor:FilingDateCoverPage') || 날,
          amended: 칸값(씨, 'jpdei_cor:AmendmentFlagDEI') === 'true',
          태그: 고른것.태그,
          무게: 무게재기(고른것.태그),
          모르는요소: 고른것.모르는것,
        };
        if (적는다) fs.writeFileSync(낼길, JSON.stringify(한벌, null, 1), 'utf8');
        받음++;
        if (받음 <= 6 || 받음 % 20 === 0) {
          console.log(`   ✅ ${한벌.sec_code} ${(한벌.name_en || 한벌.name || '').slice(0, 34)} — ${한벌.태그.join('·')}`);
        }
      } catch (e) { 실패++; console.log(`   🔴 ${d.docID} ${String(e?.message ?? e).slice(0, 60)}`); }
      finally {
        fs.rmSync(임시, { recursive: true, force: true });
        fs.rmSync(`${임시}.zip`, { force: true });
      }
    }
  }

  console.log(`\n■ 받음 ${받음} · 이미 있음 ${건너} · 못 담음 ${실패}`
    + (못본날 ? ` · 🔴 목록을 못 본 날 ${못본날}` : ''));
  const 차례 = Object.entries(태그셈).sort((a, b) => b[1] - a[1]);
  if (차례.length) console.log('  갈래별 — ' + 차례.map(([k, v]) => `${k} ${v}`).join(' · '));
  const 모름 = Object.entries(모르는것셈).sort((a, b) => b[1] - a[1]);
  if (모름.length) {
    console.log('\n⬜ 표에 없는 요소 — 이름을 보고 사건 표에 올린다(안 올리면 그 사건은 영영 안 잡힌다)');
    for (const [k, v] of 모름.slice(0, 15)) console.log(`   ${String(v).padStart(3)}  ${k}`);
  }
  if (적는다) console.log('■ 둔 곳 archive/raw/japan-edinet-breaking/<날짜>/<docID>.json');
  else if (!재본다) console.log('⭐ --적는다 를 안 줬다. 저장하지 않았다.');
}
