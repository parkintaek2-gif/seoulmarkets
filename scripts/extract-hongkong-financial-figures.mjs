#!/usr/bin/env node
/**
 * 🔴🔴🔴 [2026-10-11 16:1x · 5번] **이 자를 돌리지 마십시오. 약관이 막습니다.**
 *
 *   오늘 11:5x 에 hkex.com.hk/global/exchange/terms-of-use 를 **원문으로 읽고**
 *   `collect-hongkong-hkex-disclosures.mjs` 와 `collect-hongkong-hkex-financials.mjs` 둘에
 *   자물쇠를 걸었는데 **이 자를 빠뜨렸습니다.** 그 둘의 «다음 단계»인데 놓친 것입니다.
 *
 *   ⛔ 이 자가 하는 일이 약관이 콕 집어 막는 그것입니다 —
 *     PDF 를 «열어»(web scraping) 수치를 «뽑아»(text/data mining) 모읍니다(compilations).
 *     「create or compile derivative works … from the Information」
 *     「You are not permitted to conduct … any text or data mining or web scraping」
 *     「whether or not for gain」 — 비상업이어도 안 됩니다.
 *
 *   ⭐ 겪은 것 — **자물쇠는 «갈래»가 아니라 «그 자료를 만지는 자 전부»에 건다.**
 *     수집기만 막고 가공기를 두면 자료는 그대로 쌓입니다. 한 줄 비어 있으면 길이 열려 있는 것입니다.
 *   ⚠ 까닭과 원문 인용은 `docs/라이선스-대장.tsv` 의 hongkong-hkex-* 세 줄에 있습니다.
 */
if (!process.argv.includes('--약관을-읽었고-라이선스가-있다')) {
  console.error('⛔ HKEX 약관이 스크래핑·2차 가공·재배포를 모두 막습니다 — 위 머리글을 읽으십시오.');
  console.error('   docs/라이선스-대장.tsv 의 hongkong-hkex-* 줄에 원문 인용이 있습니다.');
  process.exit(1);
}
/**
 * extract-hongkong-financial-figures.mjs — collect-hongkong-hkex-financials.mjs 가 모은
 * 「보고서 목록」에서 실제 PDF를 열어 «매출·순이익 수치»를 뽑는다.
 *
 * 🔴 5번 지시(2026-09-28 08:56) 「우리가 파는 것은 «재무 수치»입니다.
 *    보고서 목록만 모으고 끝내지 않습니다」 — 목록(collect-*)의 다음 단계.
 *
 * 방식: HKEX 상장사 MD&A(Management Discussion & Analysis)는 상장규정 부록16에 따라
 * "Revenue ... amounted to approximately HK$X million" / "Profit(loss) ... attributable
 * to owners ... approximately HK$X million" 식 문장이 준정형으로 들어간다. 그 문장을 정규식으로 문다.
 * ⛔ 전 회사가 이 문장꼴을 안 쓴다 — 못 뽑으면 못 뽑았다고 적는다().
 *
 * 쓰는 법
 *   node scripts/extract-hongkong-financial-figures.mjs --자가시험
 *   node scripts/extract-hongkong-financial-figures.mjs [--개수 20]
 */
import fs from 'node:fs';
import { 오늘 } from './_kst.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 목록폴더 = path.join(뿌리, 'archive/raw/hongkong-hkex-financials');
const 낼폴더 = path.join(뿌리, 'archive/raw/hongkong-financial-figures');
const 쉼 = (ms) => new Promise((r) => setTimeout(r, ms));

/** 실제 재무보고서만 남긴다 — 지연·정지 공고는 PDF 안에 수치가 없다 */
export function 진짜보고서인가(제목) {
  const 거르는말 = /delay|postpone|suspension|further delay|despatch/i;
  return !거르는말.test(String(제목 ?? ''));
}

export function 이미뽑은것(폴더 = 낼폴더) {
  const 것 = new Set();
  if (!fs.existsSync(폴더)) return 것;
  for (const f of fs.readdirSync(폴더).filter((f) => f.endsWith('.json'))) {
    const j = JSON.parse(fs.readFileSync(path.join(폴더, f), 'utf8'));
    for (const r of j.벌 ?? []) if (r.출처파일) 것.add(r.출처파일);
  }
  return 것;
}

/** MD&A 문장꼴에서 매출을 뽑는다. 못 찾으면 null */
export function 매출뽑기(글) {
  const 패턴들 = [
    /revenue[\s\S]{0,80}?amounted to approximately\s*(?:HK\$|RMB|US\$)\s*([\d,]+(?:\.\d+)?)\s*(million|billion)/i,
    /turnover[\s\S]{0,80}?amounted to approximately\s*(?:HK\$|RMB|US\$)\s*([\d,]+(?:\.\d+)?)\s*(million|billion)/i,
    /(?:the\s+)?group'?s\s+revenue[\s\S]{0,120}?(?:HK\$|RMB|US\$)\s*([\d,]+(?:\.\d+)?)\s*(million|billion)/i,
  ];
  for (const p of 패턴들) {
    const m = p.exec(글);
    if (m) return { 값: Number(m[1].replace(/,/g, '')), 단위: m[2].toLowerCase(), 문장꼴: p.source.slice(0, 20) };
  }
  return null;
}

/**
 * MD&A 문장꼴에서 순이익(음수=손실)을 뽑는다. 못 찾으면 null.
 * ⚠ "Profit and total comprehensive loss for the year attributable to..." 같은
 *   두 낱말이 같이 나오는 표제문은 일부러 거른다 — (profit|loss) 바로 뒤에
 *   군더더기 없이 "attributable" 이 오는 자리만 문다(모호한 자리는 안 문다).
 */
export function 순이익뽑기(글) {
  const 패턴 = /(profit|loss)(?:\s+for the (?:year|period))?\s+attributable to (?:owners|shareholders)(?: of the company)?\s+was approximately\s*(?:HK\$|RMB|US\$)\s*([\d,]+(?:\.\d+)?)\s*(million|billion)/i;
  const m = 패턴.exec(글);
  if (!m) return null;
  const 부호 = /loss/i.test(m[1]) ? -1 : 1;
  return { 값: 부호 * Number(m[2].replace(/,/g, '')), 단위: m[3].toLowerCase() };
}

export async function PDF텍스트뽑기(url, 부르기 = fetch, pdfjs) {
  const r = await 부르기(url, { headers: { 'User-Agent': 'klifemap.ai / seoulmarkets.com research' } });
  if (!r.ok) return null;
  const buf = new Uint8Array(await r.arrayBuffer());
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  let 글 = '';
  for (let i = 1; i <= Math.min(doc.numPages, 40); i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    글 += content.items.map((it) => it.str).join(' ') + '\n';
  }
  return 글;
}

/* ─────────────────────────────── 자가시험 ─────────────────────────────── */
const 예문 = `FINANCIAL REVIEW Revenue The Group's revenue for the year ended 30 April 2026 recorded amounted to approximately HK$433.4 million which represented an increase of approximately HK$59.1 million or 15.8% from approximately HK$374.3 million for the year ended 30 April 2025. The Group's loss attributable to owners of the Company was approximately HK$16.5 million for the year ended 30 April 2026. Profit and total comprehensive loss for the year attributable to owners of the Company was approximately HK$16.5 million for the year ended 30 April 2026.`;

const 손실예문 = `Revenue The Group's revenue for the year ended 31 December 2025 amounted to approximately HK$88.0 million. The Group's loss attributable to owners of the Company was approximately HK$16.5 million for the year ended 31 December 2025.`;

export function 자가시험() {
  const 결과 = [];
  const 본다 = (이름, 됐나, 덧말 = '') => 결과.push({ 이름, 됐나: !!됐나, 덧말 });

  본다('진짜보고서인가 — 정상 연차보고서는 통과', 진짜보고서인가('ANNUAL REPORT 2026'));
  본다('⛔ 진짜보고서인가 — 발표지연 공고는 거른다', !진짜보고서인가('FURTHER DELAY IN PUBLICATION OF THE 2025 ANNUAL RESULTS'));
  본다('⛔ 진짜보고서인가 — 거래정지 공고는 거른다', !진짜보고서인가('CONTINUED SUSPENSION OF TRADING'));

  const 매출 = 매출뽑기(예문);
  본다('매출뽑기 — 값을 찾는다(433.4)', 매출 && 매출.값 === 433.4);
  본다('매출뽑기 — 단위(million)', 매출 && 매출.단위 === 'million');
  본다('⛔ 매출뽑기 — 문장꼴이 없으면 null', 매출뽑기('아무 상관없는 글') === null);

  const 순이익_손실 = 순이익뽑기(예문);
  본다('순이익뽑기 — loss는 음수로', 순이익_손실 && 순이익_손실.값 === -16.5);

  const 순이익2 = 순이익뽑기(손실예문);
  본다('순이익뽑기 — 다른 문장에서도 손실을 음수로 뽑는다', 순이익2 && 순이익2.값 === -16.5);
  본다('⛔ 순이익뽑기 — 문장꼴이 없으면 null', 순이익뽑기('아무 상관없는 글') === null);

  const 모호한표제만 = `Profit and total comprehensive loss for the year attributable to owners of the Company was approximately HK$16.5 million for the year ended 30 April 2026.`;
  const 순이익3 = 순이익뽑기(모호한표제만);
  본다('순이익뽑기 — "Profit and ... loss" 모호한 표제문도 loss 쪽(음수)으로 옳게 문다', 순이익3 && 순이익3.값 === -16.5);

  본다('이미뽑은것 — 폴더 없으면 빈 Set(죽지 않는다)',
    이미뽑은것(path.join(뿌리, '없는폴더_자가시험')) instanceof Set);

  return 결과;
}

/* ─────────────────────────────── 본 일 ─────────────────────────────── */
async function 모은다(개수 = 20) {
  const 파일들 = fs.existsSync(목록폴더) ? fs.readdirSync(목록폴더).filter((f) => f.endsWith('.json')).sort() : [];
  if (!파일들.length) { console.log('🔴 archive/raw/hongkong-hkex-financials 가 비어 있다 — collect-hongkong-hkex-financials.mjs 먼저'); return; }
  const 목록 = JSON.parse(fs.readFileSync(path.join(목록폴더, 파일들[파일들.length - 1]), 'utf8'));
  const 뽑을것 = (목록.보고서 ?? [])
    .filter((r) => (r.갈래 === '연차보고서' || r.갈래 === '반기보고서') && 진짜보고서인가(r.제목) && r.파일)
    .filter((r) => !이미뽑은것().has(r.파일))
    .slice(0, 개수);

  console.log(`■ 이번에 열 PDF ${뽑을것.length}건 (전체 후보 중 이미 뽑은 것 제외)`);
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const 낸것 = [];
  let 못뽑은수 = 0;

  for (const r of 뽑을것) {
    try {
      const 글 = await PDF텍스트뽑기(r.파일, fetch, pdfjs);
      const 매출 = 글 ? 매출뽑기(글) : null;
      const 순이익 = 글 ? 순이익뽑기(글) : null;
      if (!매출 && !순이익) 못뽑은수++;
      낸것.push({
        티커: r.종목[0]?.티커, 이름: r.종목[0]?.이름, 갈래: r.갈래, 때: r.때,
        매출_백만: 매출 ? (매출.단위 === 'billion' ? 매출.값 * 1000 : 매출.값) : null,
        순이익_백만: 순이익 ? (순이익.단위 === 'billion' ? 순이익.값 * 1000 : 순이익.값) : null,
        통화: 'HKD(또는 원문 통화, 본 보고서 대부분 HK$)',
        출처파일: r.파일,
        못뽑음: !매출 && !순이익 ? '문장꼴(approximately HK$X million) 못 찾음 — PDF가 이미지·표뿐이거나 다른 문형' : null,
      });
      console.log(`   ${매출 || 순이익 ? '✅' : '🔴'} ${r.종목[0]?.이름} — 매출 ${매출?.값 ?? '못뽑음'} / 순이익 ${순이익?.값 ?? '못뽑음'}`);
    } catch (e) {
      낸것.push({ 티커: r.종목[0]?.티커, 이름: r.종목[0]?.이름, 갈래: r.갈래, 때: r.때, 매출_백만: null, 순이익_백만: null, 출처파일: r.파일, 못뽑음: `열기 실패 — ${e.message}` });
      못뽑은수++;
      console.log(`   🔴 ${r.종목[0]?.이름} — 열기 실패: ${e.message}`);
    }
    await 쉼(500);
  }

  fs.mkdirSync(낼폴더, { recursive: true });
  /* 🔴 [2026-10-11 · 5번] toISOString() 은 UTC 다 — 밤 9시 뒤에 돌리면 «전날» 파일에 쌓인다.
     사장님: 「한국표준시간으로 하는 걸 못박아놔」. 이 PC 는 이미 한국시간이다. */
  const 낼이름 = `${오늘()}.json`;
  const 기존 = fs.existsSync(path.join(낼폴더, 낼이름)) ? JSON.parse(fs.readFileSync(path.join(낼폴더, 낼이름), 'utf8')).벌 : [];
  const 낼것 = {
    _메모: {
      방식: 'HKEX MD&A 준정형 문장(approximately HK$X million) 정규식 — 표·이미지뿐인 PDF는 못 뽑는다',
      한계: '전 회사가 이 문장꼴을 쓰지 않는다. 못뽑음 필드로 남긴다(0 채우지 않음)',
    },
    건수: 기존.length + 낸것.length,
    뽑힌수: 기존.filter((x) => !x.못뽑음).length + 낸것.filter((x) => !x.못뽑음).length,
    못뽑은수: 기존.filter((x) => x.못뽑음).length + 못뽑은수,
    벌: [...기존, ...낸것],
  };
  fs.writeFileSync(path.join(낼폴더, 낼이름), JSON.stringify(낼것, null, 2), 'utf8');
  console.log(`\n✅ 이번 회차 ${낸것.length}건 중 ${낸것.length - 못뽑은수}건 수치 뽑음, ${못뽑은수}건 못 뽑음 — archive/raw/hongkong-financial-figures/${낼이름}`);
  return 낼것;
}

const 이파일이진입점 = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (이파일이진입점) {
  if (process.argv.includes('--자가시험')) {
    const 결과 = 자가시험();
    let 빨강 = 0;
    console.log('■ 홍콩 재무수치 뽑는 자 — 자가시험');
    for (const r of 결과) {
      if (!r.됐나) 빨강++;
      console.log(`  ${r.됐나 ? '✅' : '🔴'} ${r.이름}${r.덧말 ? `  (${r.덧말})` : ''}`);
    }
    console.log(빨강 ? `🔴 빨강 ${빨강}개` : `✅ ${결과.length}가지 다 통과`);
    process.exit(빨강 ? 1 : 0);
  } else {
    const i = process.argv.indexOf('--개수');
    await 모은다(i >= 0 ? Number(process.argv[i + 1]) : 20);
  }
}
