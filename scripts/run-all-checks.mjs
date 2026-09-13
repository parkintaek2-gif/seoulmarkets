#!/usr/bin/env node
/**
 * run-all-checks.mjs — **검사를 다 돌리고 «요약»을 낸다.** `npm test` 의 몸이다.
 *
 * ── 🔴🔴 왜 만들었나 (2026-09-09 07:2x · 5번) ──────────────────────────────
 *
 * `npm test` 는 검사 129개를 **`&&` 로 이어 붙인** 한 줄이었다.
 * 그래서 앞에서 하나가 종료코드 1 을 내면 **그 뒤가 통째로 안 돈다.**
 *
 * 2026-09-09 새벽에 그 값을 실제로 치렀다 —
 * ```
 *   check-100y-kosis-transfer 가 「원본이 아카이브에 없다」로 exit 1
 *     ← 실은 «파일 이름을 잘못 짐작»한 것이었고, 원본은 백업에 있었다
 *   ⇒ 그 뒤 검사 100여 개가 «며칠째 한 번도 안 돌고» 있었다
 *   ⇒ 그 안에 숨어 있던 것 —
 *        기사 64칸이 「자료와 어긋난다」 (스냅숏을 새것으로 잡아서)
 *        build-kcw-markdown 자가시험이 TypeError (견본이 낡아서)
 *        메모 표식 톱니가 596 → 718
 *   ⇒ 하나씩 고치니 7개가 드러났고, 그 7개를 다 고치자 129개가 초록이 됐다
 * ```
 *
 * ⛔ **못 잰 하나가 잴 수 있는 백 개를 가린다.** 그것이 이 자를 만든 까닭이다.
 *
 * ── 무엇이 달라지나 ────────────────────────────────────────────────────────
 * ```
 * ✅ 다 돌린다        하나가 깨져도 나머지를 끝까지 돌려 «무엇이 깨졌는지 다» 본다
 * ✅ 종료코드는 그대로  하나라도 깨지면 1 이다. 관문을 무르게 하지 않는다
 * ✅ 요약을 낸다       통과 N · 깨짐 M · 깨진 것마다 마지막 줄들
 * ⭐ --멈춤           옛 꼴(첫 깨짐에서 멈춤)로 돌린다. 빠르게 한 개만 볼 때 쓴다
 * ⭐ --조용           깨진 것만 찍는다
 * ```
 *
 * ⚠ 단계 목록을 «이 파일 안»에 둔다. 자료 파일로 빼지 않는다 —
 *   `check-tests-wired.mjs` 가 package.json → 이 파일 → 검사 이름으로 길을 따라가는데,
 *   자료 파일에 빼면 그 길이 끊겨 「안 불리는 검사」가 갑자기 129개로 뛴다.
 *
 * 쓰는 법
 *   npm test
 *   node scripts/run-all-checks.mjs --멈춤
 *   node scripts/run-all-checks.mjs --자가시험
 */
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const LF = String.fromCharCode(10);
const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** 검사 단계 — ⛔ 순서를 함부로 바꾸지 않는다. 앞의 것이 dist·자료를 만들어 두는 것이 있다 */
export const 단계들 = [
  "node scripts/check-before-i-write.mjs --자가시험",
  "node scripts/check-tests-wired.mjs",
  "node scripts/deploy.mjs --selftest",
  "node scripts/check-comment-close.mjs",
  "node scripts/count-newsdesk.mjs --자가시험",
  /* 🔴 [2026-09-09 · 5번] 신문 제목 수집기가 여기 «없었다». 세는 자(count-newsdesk)만 걸려
   *   있고 받는 자는 안 걸려 있어서, 오늘 결함 둘(세고 버리기·덮어쓰기)이 아무 검사에도
   *   안 잡혔다. 소급이 안 되는 항목의 수집기는 반드시 걸어 둔다. */
  "node scripts/collect-news-desk.mjs --자가시험",
  /* 🔴 [2026-09-09 · 5번] 백년지도에는 check-100y-phone 이 있는데 KCW 에는 «없었다».
   *   그래서 /read-in 이 폰에서 122px 밀린 채 배포까지 나갔고, /esports-nations 는
   *   그 전부터 11px 밀리고 있었다. 손님은 폰으로 온다 — 이 자를 관문에 둔다. */
  "node scripts/check-kcw-phone.mjs --자가시험",
  "node scripts/build-seoulmarkets-target-changes.mjs --자가시험",
  "node scripts/build-seoulmarkets-ownership.mjs --자가시험",
  "node scripts/build-seoulmarkets-mezzanine-page.mjs --자가시험",
  "node scripts/build-seoulmarkets-people-page.mjs --자가시험",
  "node scripts/check-imports-committed.mjs",
  "node scripts/check-kcw-social-copy.mjs",
  "node scripts/probe-broker-site.mjs --자가시험",
  "node scripts/check-stock-prices-datago.mjs",
  "node scripts/check-licence-register.mjs",
  "node scripts/check-forbidden-sources.mjs",
  "node scripts/build-seoulmarkets-research-page.mjs --자가시험",
  "node scripts/collect-korea-markets-research.mjs --자가시험",
  "node scripts/collect-trade-revisions.mjs --자가시험",
  "node scripts/make-sitemap-tree.mjs --자가시험",
  "node scripts/count-data-inquiries.mjs --selftest",
  /* 🔴 [2026-09-09 · 5번] 자물쇠가 매일 부르라던 자가 «없었다». 만들었으니 관문에 둔다 —
   *   「PDF 를 열어서 쪽수를 보고 나서만 보낸다」가 이 자의 자가시험에 박혀 있다. */
  "node scripts/send-1600-report.mjs --자가시험",
  "node scripts/restore-archive-from-onedrive.mjs --자가시험",
  "node scripts/collect-kcw-korean-names.mjs --자가시험",
  "node scripts/lib/kcw-roster-match.mjs --자가시험",
  "node scripts/check-wikitip-all.mjs",
  "node scripts/claude-index.mjs",
  "node scripts/deploy-lock.test.mjs",
  "node scripts/collect-broker-direct.test.mjs",
  "node scripts/server-url.test.mjs",
  "node scripts/collect-tenure.test.mjs",
  "node scripts/collect-executives.test.mjs",
  "node scripts/traffic.test.mjs",
  "node scripts/server-routing.test.mjs",
  "node scripts/issuance.test.mjs",
  "node scripts/check-100yearmap-copy.mjs",
  "node scripts/check-school-rules.mjs",
  "node scripts/check-jsx-space.mjs",
  "node scripts/check-legal-name.mjs",
  "node scripts/check-korean.mjs",
  "node scripts/check-frontmatter.mjs",
  "node scripts/check-school-area.mjs",
  "node scripts/check-school-gap.mjs",
  "node scripts/check-inflow-tag.mjs",
  "node scripts/check-100y-nps-coverage.mjs",
  "node scripts/build-100y-style.mjs --확인",
  "node scripts/check-100y-provenance.mjs",
  "node scripts/check-100y-major-bridge.mjs",
  "node scripts/check-answered.mjs --자가시험",
  "node scripts/check-board.mjs --자가시험",
  "node scripts/check-content-pipeline.mjs --자가시험",
  "node scripts/check-deploy-ready.mjs --자가시험",
  "node scripts/deploy-key.mjs --자가시험",
  "node scripts/report-key.mjs --자가시험",
  "node scripts/find-first.mjs --자가시험",
  "node scripts/check-100y-age-axis-transfer.mjs",
  "node scripts/check-100y-kosis-transfer.mjs",
  "node scripts/check-100y-university-transfer.mjs",
  "node scripts/check-100y-areas-recount.mjs",
  "node scripts/check-100y-research-transfer.mjs",
  "node scripts/check-100y-elementary-transfer.mjs",
  "node scripts/check-100y-major-recount.mjs",
  "node scripts/check-100y-summary-recount.mjs",
  "node scripts/check-100y-school-transfer.mjs",
  "node scripts/check-100y-evidence.mjs",
  "node scripts/check-100y-runbook.mjs",
  "node scripts/check-100y-saju-same-engine.mjs",
  "node scripts/check-100y-asof.mjs --자가시험",
  "node scripts/check-100y-banned-words.mjs --selftest",
  "node scripts/check-100y-garbage.mjs --자가시험",
  "node scripts/check-100y-samey.mjs --자가시험",
  "node scripts/check-100y-thin.mjs --자가시험",
  "node scripts/check-100y-video-schema.mjs --selftest",
  "node scripts/check-100y-reach-to-buy.mjs --자가시험",
  "node scripts/check-100y-live-numbers.mjs --자가시험",
  "node scripts/check-100y-indexable.mjs --selftest",
  "node scripts/check-100y-broken-links.mjs --selftest",
  "node scripts/check-kcw-title-length.mjs --자가시험",
  "node scripts/check-kcw-description-length.mjs --자가시험",
  "node scripts/check-kcw-all.mjs --selftest",
  "node scripts/check-kcw-article-numbers.mjs --selftest",
  "node scripts/check-kcw-cliches.mjs --selftest",
  "node scripts/check-kcw-evidence-basis.mjs --selftest",
  "node scripts/check-kcw-frontmatter.mjs --selftest",
  "node scripts/check-kcw-garbage.mjs --selftest",
  "node scripts/check-kcw-stated-rule-matches-data.mjs --자가시험",
  "node scripts/check-kcw-stated-rule-matches-data.mjs",
  "node scripts/check-ad-fill.mjs --자가시험",
  "node scripts/check-asked-boss-before-searching.mjs --자가시험",
  "node scripts/check-asked-boss-before-searching.mjs",
  "node scripts/check-kcw-korean-leak.mjs --selftest",
  "node scripts/check-kcw-median-stability.mjs --selftest",
  "node scripts/check-kcw-plural.mjs --selftest",
  "node scripts/check-kcw-script-habits.mjs --selftest",
  /* 🔴 [2026-09-11] 기사 겹침 — 자가시험만 관문에 넣는다. 본검사는 «막지 않는» 자다
     (헛울림이 빨간불이 되면 그 옆의 진짜 빨간불이 안 보인다). 목록은 check-kcw-all 의 보는검사에 있다 */
  "node scripts/check-article-overlap.mjs --자가시험",
  "node scripts/check-kcw-glued-words.mjs --자가시험",
  "node scripts/check-kcw-search-ready.mjs --selftest",
  "node scripts/check-kcw-three-clicks.mjs --selftest",
  "node scripts/check-kcw-visitor-eyes.mjs --selftest",
  "node scripts/measure-kcw-subscribers.mjs --자가시험",
  "node scripts/build-100y-markdown.mjs --selftest",
  "node scripts/build-seoulmarkets-markdown.mjs --selftest",
  "node scripts/build-kcw-markdown.mjs --selftest",
  "node scripts/check-llms-coverage.mjs --자가시험",
  "node scripts/make-cvbd-dilution-chart.mjs --자가시험",
  "node scripts/make-rights-issue-dilution-chart.mjs --자가시험",
  "node scripts/check-seoulmarkets-dataset-schema.mjs --자가시험",
  "node scripts/make-offshore-assets-chart.mjs --자가시험",
  "node scripts/check-kcw-sitemap-gap.mjs --자가시험",
  "node scripts/check-gone-page-redirects.mjs --자가시험",
  "node scripts/check-kcw-rich-results.mjs --자가시험",
  "node scripts/collect-kcw-crossover-stars.mjs --자가시험",
  "node scripts/collect-community-desk.mjs --시험",
  "node scripts/collect-dart.mjs --자가시험",
  "node scripts/collect-dart-ownership.mjs --자가시험",
  "node scripts/collect-dart-mezzanine.mjs --자가시험",
  "node scripts/collect-seoulmarkets-hankyung-consensus.mjs --자가시험",
  "node scripts/collect-seoulmarkets-hankyung-analysts.mjs --자가시험",
  "node scripts/build-seoulmarkets-consensus-tape.mjs --자가시험",
  "node scripts/collect-cpi-telecom-base-effect.mjs --자가시험",
  "node scripts/collect-emp-gendergap-h1.mjs --자가시험",
  "node scripts/make-gendergap-census-chart.mjs --자가시험",
  "node scripts/make-tenure-census-chart.mjs --자가시험",
  "node scripts/collect-workplace-injury-causes.mjs --자가시험",
  "node scripts/make-workplace-injury-chart.mjs --자가시험",
  "node scripts/make-kospi-swing-check.mjs --자가시험",
  "node scripts/make-kospi-swing-chart.mjs --자가시험",
  "node scripts/build-kcw-number-one-where.mjs --자가시험",
  "node scripts/build-kcw-demon-hunters-year.mjs --자가시험",
  "node scripts/build-kcw-peak-month.mjs --자가시험",
  "node scripts/check-kcw-cardnews-orphan.mjs",
  "node scripts/check-open-asks.mjs --자가시험",
  "node scripts/check-visitor-metric-named.mjs --자가시험",
  "node scripts/check-kcw-canonical.mjs --시험만",
  "node scripts/check-index-verdict.mjs --시험만",
  "node scripts/check-sitemap-pickup.mjs --시험만",
  "node scripts/check-kcw-daily-quota.mjs --자가시험",
  "node scripts/check-kst-date.mjs",
  "node scripts/check-memo-marker.mjs",
  "node scripts/check-findings.mjs",
  "node scripts/check-ranked-but-unclicked.mjs --재기",
  "node scripts/check-astro-props.mjs --자가시험",
  "node scripts/check-astro-props.mjs",
  "node scripts/check-kcw-geo-fit.mjs --자가시험",
  "node scripts/check-asset-files-committed.mjs --자가시험",
  "node scripts/check-seoulmarkets-korean-leak.mjs --selftest",
  "node scripts/check-seat-config.mjs --자가시험",
  "node scripts/check-seat-resume-id.mjs --자가시험",
  "node scripts/_article-drift.mjs --자가시험",
  /* 🔴 [2026-09-10 · 6번] 5번이 만든 검사가 npm test 에 안 물려 있었다 —
   *   check-tests-wired.mjs 가 「안 부르는 검사 0→1」로 잡았다. 만든 사람이 물려야 하는데
   *   빠졌던 것을 6번이 이어서 물린다. */
  "node scripts/check-article-product-funnel.mjs --자가시험",
  "node scripts/check-plain-language.mjs --자가시험",
  "node scripts/check-selftest-hijack.mjs",
  "node tools/save-history.mjs --자가시험",
  "node scripts/check-all-selftests.mjs",
  "node scripts/fetch-kcw-entertainer-gender.mjs --자가시험",
  "node scripts/build-kcw-service-years.mjs --자가시험",
  "node scripts/build-seoulmarkets-people-panel.mjs --자가시험",
  "node scripts/build-seoulmarkets-company-master.mjs --자가시험",
  "node scripts/build-seoulmarkets-ownership-ledger.mjs --자가시험",
  "node scripts/build-seoulmarkets-mezzanine-book.mjs --자가시험",
  "node scripts/lib/financial-account-en.mjs --자가시험",
  "node scripts/lib/parquet-out.mjs --자가시험",
  "node scripts/build-korea-valuation-tape.mjs --자가시험",
  "node scripts/build-korea-index-tape.mjs --자가시험",
  "node scripts/build-korea-governance-snapshot.mjs --자가시험",
  "node scripts/check-archive-freshness.mjs",
  "node scripts/collect-kcw-language-reads.mjs --자가시험",
  "node scripts/build-kcw-group-mix.mjs --자가시험",
  "node scripts/build-kcw-language-reads.mjs --자가시험",
  /* 🔴 [2026-09-13 · 6번] check-tests-wired.mjs 가 「안 부르는 검사 0→3」으로 잡았다.
   *   만든 사람이 안 물렸던 것을 이어서 물린다. */
  "node scripts/check-hub-missing.mjs",
  "node scripts/check-klifemap-adsense-ready.mjs",
  "node scripts/check-klifemap-payment.mjs",
  /* 🔴 [2026-09-13 · 6번] F7 — build-korea-people-tape.mjs 도 새로 만든 자기시험이라
   *   여기 안 물리면 check-tests-wired.mjs 가 「안 부르는 검사」로 다시 잡는다. */
  "node scripts/build-korea-people-tape.mjs --자가시험",
  "node scripts/build-korea-mezzanine-tape.mjs --자가시험",
  /* 🔴 [2026-09-13 · 3번] F7 — 「⑤ 데이터 품질」 몫. 일곱 엔드포인트 밑감의
   *   값 채움률·최신 날짜를 검사로 지킨다. archive-freshness 와 같은 결로
   *   «실제 검사»를 npm test 관문에 둔다(자가시험은 따로 손으로 돌린다). */
  "node scripts/check-f7-data-quality.mjs",
];

/** 한 단계가 «검사»인가 — 요약에서 갈라 세려고 본다 */
export function 검사인가(줄) {
  return /check-|--selftest|--자가시험|--시험|[.]test[.]mjs/.test(String(줄 ?? ''));
}

/** 깨진 것의 마지막 줄들만 남긴다 — 다 찍으면 요약이 안 읽힌다 */
export function 꼬리(글, 줄수 = 6) {
  return String(글 ?? '').split(/\r?\n/).filter((l) => l.trim()).slice(-줄수).join(LF);
}

/** 요약 한 줄 */
export function 요약글(통과, 깨짐) {
  if (!Number.isFinite(통과) || !Number.isFinite(깨짐)) return '⬜ 못 쟀다';
  if (!깨짐) return `✅ 검사 ${통과}개 전부 지났다`;
  return `🔴 ${통과 + 깨짐}개 중 ${깨짐}개가 깨졌다 (통과 ${통과})`;
}

const 내가 = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (내가 && process.argv.includes('--자가시험')) {
  let 통 = 0; const 실 = [];
  const 검 = (n, ok) => { if (ok) 통 += 1; else 실.push(n); };

  검(`단계가 ${단계들.length}개 있다 — 비어 있으면 아무것도 안 보고 통과한다`, 단계들.length > 100);
  검('단계마다 node 로 시작한다', 단계들.every((c) => c.startsWith('node ')));
  검('⛔ 단계에 && 가 섞여 있지 않다 — 하나가 두 개를 숨긴다', 단계들.every((c) => !c.includes('&&')));
  검('검사인가 — check- 를 알아본다', 검사인가('node scripts/check-x.mjs') === true);
  검('검사인가 — --자가시험도 알아본다', 검사인가('node scripts/build-x.mjs --자가시험') === true);
  검('⛔ 검사인가 — 그 밖은 아니다', 검사인가('node scripts/claude-index.mjs') === false);
  검('꼬리 — 마지막 줄들만 남긴다', 꼬리('a' + LF + 'b' + LF + 'c', 2) === 'b' + LF + 'c');
  검('⛔ 꼬리 — 빈 줄은 버린다', 꼬리('a' + LF + LF + 'b', 2) === 'a' + LF + 'b');
  검('⛔ 꼬리 — 없는 것도 견딘다', 꼬리(null) === '');
  검('요약글 — 다 지나면 초록', 요약글(3, 0).startsWith('✅'));
  검('요약글 — 깨지면 수를 함께 낸다', 요약글(3, 2) === '🔴 5개 중 2개가 깨졌다 (통과 3)');
  검('⛔ 요약글 — 못 쟀으면 0으로 안 적는다', 요약글(null, 0) === '⬜ 못 쟀다');

  if (실.length) {
    console.error(`❌ 자가시험 실패 ${실.length}${LF}${실.map((s) => `   · ${s}`).join(LF)}`);
    process.exit(1);
  }
  console.log(`✅ 검사 돌리는 자 — 자가시험 ${통}개 통과`);
  process.exit(0);
}

if (내가) {
  const 멈춤 = process.argv.includes('--멈춤');
  const 조용 = process.argv.includes('--조용');
  const 깨진것 = [];
  let 통과 = 0;

  console.log(`■ 검사 ${단계들.length}개를 ${멈춤 ? '«첫 깨짐에서 멈추며»' : '«끝까지»'} 돌린다`);
  if (!멈춤) console.log('   ⭐ 하나가 깨져도 나머지를 다 돌린다 — 못 잰 하나가 백 개를 가리지 않게');
  console.log('');

  for (const [i, 줄] of 단계들.entries()) {
    const 앞 = `[${String(i + 1).padStart(3)}/${단계들.length}]`;
    let 낸것 = '';
    try {
      낸것 = execSync(줄, { cwd: 뿌리, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 20 * 60 * 1000 });
      통과 += 1;
      if (!조용) console.log(`${앞} ✅ ${줄}`);
    } catch (e) {
      낸것 = `${e.stdout ?? ''}${LF}${e.stderr ?? ''}`;
      깨진것.push({ 줄, 꼬리: 꼬리(낸것) });
      console.log(`${앞} 🔴 ${줄}`);
      if (멈춤) break;
    }
  }

  console.log('');
  console.log(요약글(통과, 깨진것.length));
  if (깨진것.length) {
    console.log('');
    console.log('■ 깨진 것 — 마지막 줄들');
    for (const x of 깨진것) {
      console.log(`${LF}🔴 ${x.줄}`);
      for (const l of x.꼬리.split(LF)) console.log(`   ${l}`);
    }
    console.log('');
    console.log('⭐ 하나만 다시 보려면 그 줄을 그대로 붙여 돌린다.');
    console.log('⛔ 「못 쟀다」로 게이트를 세우지 않는다 — 못 잰 하나가 잴 수 있는 백 개를 가린다.');
    process.exit(1);
  }
  process.exit(0);
}
