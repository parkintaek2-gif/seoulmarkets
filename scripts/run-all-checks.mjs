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
  /* 🔴🔴 [2026-09-19 · 2번] **tests/*.test.mjs 전체(node:test 자리)가 npm test 에
   *   «한 번도» 안 걸려 있었다.** check-tests-wired.mjs 는 scripts/ 폴더만 훑어서
   *   이 구멍을 못 잡는다(tests/ 는 아예 다른 폴더다) — 「자물쇠라고 적힌 종이」였다.
   *   라이선스 파일 존재·BOM·F7 API 커버리지·페이팔 검증 같은 검사 76개가 오늘까지
   *   조용히 «안 돌고» 있었다. `tests/*.test.mjs` 는 셸 글롭이라 execSync 가 그대로
   *   펼친다(Windows cmd.exe 로도 실측 확인) — node --test 에 디렉터리를 직접 주면
   *   이 Node 판에서는 되레 MODULE_NOT_FOUND 로 죽는다(직접 겪음), 그래서 글롭으로 편다.
   * ⛔ 글자 `tests` 뒤에 `/*.test.mjs` 를 «붙여 적지» 않는다 — check-tests-wired.mjs 의
   *   주석 걷기가 정규식이라 `/*` 를 «블록주석 시작»으로 잘못 읽어 그 뒤 몇 줄을
   *   통째로 삼킨다(실측 — check-comment-close.mjs 가 «안 불리는 검사」로 잘못 잡혔었다).
   *   그래서 문자열을 둘로 나눠 붙인다. */
  "node --test tests/" + "*.test.mjs",
  "node scripts/deploy.mjs --selftest",
  "node scripts/check-comment-close.mjs",
  /* 🔴 [2026-10-11 · 5번] **칸은 있는데 값이 한 줄도 없는 자리**를 찾는다.
   *   새벽에 대만 설립일·상장일이 1,095줄 «전부» null 인 것을 손으로 찾았다 —
   *   수집기가 서기 8자리를 민국 7자리 자로 읽고 있었고, 지면은 조용히 빈 채로 나갔다.
   *   그것을 보는 자가 없었다. 소음은 재 봤다 — 143개 묶음에 걸리는 것이 0개다
   *   (일본 pbr·market 둘은 `_못낸까닭` 짝 칸으로 밝혀 둬서 안 운다). */
  "node scripts/check-묶음에-죽은칸이-있나.mjs --자가시험",
  "node scripts/check-묶음에-죽은칸이-있나.mjs",
  "node scripts/count-newsdesk.mjs --자가시험",
  /* 🔴 [2026-09-09 · 5번] 신문 제목 수집기가 여기 «없었다». 세는 자(count-newsdesk)만 걸려
   *   있고 받는 자는 안 걸려 있어서, 오늘 결함 둘(세고 버리기·덮어쓰기)이 아무 검사에도
   *   안 잡혔다. 소급이 안 되는 항목의 수집기는 반드시 걸어 둔다. */
  "node scripts/collect-news-desk.mjs --자가시험",
  /* 🔴 [2026-10-11 · 5번] 한국 거시 셋(GDP·물가·기준금리)을 ECOS 에서 받는 자.
   *   10-05 에 check-all-selftests.mjs 목록에 넣었는데 그쪽은 「collect- 는 받지 않는다」가
   *   규칙이라 **그 파일의 자가시험이 엿새 동안 깨진 채**였다. 수집기 자가시험은 여기가 자리다. */
  "node scripts/collect-korea-macro-ecos.mjs --자가시험",
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
  "node scripts/check-hankyung-analysts-rank-field.mjs",
  /* 🔴 [2026-09-18 · 5번] 백업 저장소(Pages) 빌드를 «우리가 먼저» 잰다.
   *   아침에 내 기사 하나가 갈래 값을 틀려 빌드를 세웠고 실패 메일이 사장님께 일곱 번 갔다.
   *   ⛔ 알림이 사장님께만 가면 사장님이 우리 감시 장치가 된다.
   *   ⚠ 만들 때 check-2h ⑥-2 에만 물려 두고 여기 npm test 에는 안 물렸다 —
   *     check-tests-wired 가 그것을 잡아 줬다. **자를 만들면 관문에 «물려야» 도는 것이다.** */
  "node scripts/check-pages-build.mjs --자가시험",
  /* 🔴 [2026-09-18 · 5번] 결제 점검이 «지시대로 돌렸을 때» 대장에 남는가.
   *   「--적는다」를 붙여야만 적고 있어서, 고정 지시 명령줄 그대로 돌리면 증거가 안 남았다.
   *   실제로 seoulmarkets 줄이 12:11 뒤로 끊겨 있었다 — 13·14·15시 다 돌렸는데도.
   *   이런 결함은 조용하다 — 화면도 검사도 다 초록인데 대장만 비어 간다. */
  "node scripts/check-payment-ledger-writes.mjs --자가시험",
  "node scripts/check-payment-ledger-writes.mjs",
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
  /* 값이 한 곳에서 오나 — 상품표와 지면의 값이 어긋나면 손님이 딴 값을 보고 결제한다 */
  "node scripts/check-price-single-source.mjs",
  /* 인도 신용등급 — 받는 자와 세는 자. 날짜·「Other」를 잘못 읽으면 기사가 거짓이 된다 */
  "node scripts/collect-india-nse-credit-rating.mjs --자가시험",
  "node scripts/build-india-rating-moves.mjs --자가시험",
  /* 우리가 매기는 등급 — 기준선·가중치가 말없이 바뀌면 여기서 걸린다 */
  "node scripts/check-smarkets-grade.mjs",
  /* 컨센서스 지면 — 「rank 가 순위가 아니다」·「덜 받힌 판을 섞지 않는다」를 검사로 굳혔다 */
  "node scripts/build-seoulmarkets-consensus-page.mjs --자가시험",
  "node scripts/build-v1-consensus-tape.mjs --자가시험",
  /* 자리가 도는가 — 멈춘 자리의 사이트도 200 이라 점검표가 못 잡았다 */
  "node scripts/check-seats-alive.mjs --자가시험",
  /* 「지금 도는 자리」를 두 곳에 적지 못하게 막는다 — 만들어 놓고 여기 안 물려 있었다 */
  "node scripts/check-자리목록-한곳.mjs",
  /* 한 커밋에 남의 사이트 파일이 섞이는 것을 막는다 — .git/hooks/commit-msg 가 이 자를 부른다.
     ⚠ 훅은 저장소에 안 실린다(.git 은 커밋되지 않는다). 그래서 «자»만이라도 여기 물려
       둔다 — 자가 살아 있으면 다음 사람이 훅을 다시 걸 수 있다. */
  "node scripts/check-남의것섞였나.mjs --자가시험",
  "node scripts/check-16시보고.mjs --자가시험",
  "node scripts/check-seoulmarkets-payment.mjs --자가시험",
  /* 결제 뒤 편지 — 라이브(Cloudtype)는 파일 경로가 아니라 문자열 열쇠를 받는다 */
  "node src/lib/gmail-send.mjs --자가시험",
  "node scripts/손님길-자물쇠.mjs --자가시험",
  "node scripts/check-진도.mjs --자가시험",
  "node scripts/check-content-types.mjs --자가시험",
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
  /* 🔴 [2026-09-17] 사장님: 「마감시간 ASAP 못박아..다시는 9시란 말 쓰지말도록」
     같은 말씀을 세 번 하시게 했다. 다짐으로 못 고친 버릇이라 자로 잡는다. */
  "node scripts/check-마감은-ASAP.mjs",
  /* 🔴 [2026-09-17] 2번이 컨텍스트 한도에 걸려 하루를 멈췄는데, 커밋만 보던 나는
     그것을 「게을러서」로 사장님께 잘못 보고했다. 멈춘 자리와 안 하는 자리를 가른다. */
  "node scripts/check-유닛-살아있나.mjs --자가시험",
  /* 🔴 [2026-09-17] 시험 주소로 주문 편지가 나가 사장님 편지함에 반송이 쌓였다.
     진짜 첫 주문 편지가 그 속에 묻히면 못 보신다. */
  "node src/lib/mail-guard.mjs --자가시험",
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
  /* 🔴 [2026-10-11 12:0x · 5번] 남의 신문 제목이 우리 지면에 그대로 나는지 잰다.
     네 매체 이용약관을 아직 안 읽었고(대장 newsdesk-korean-press 줄), 지금은 우리가 센 수만
     내고 있다 — 그 「0곳」은 «오늘의 사실»이지 규칙이 아니라 날마다 재야 한다. */
  "node scripts/check-남의신문제목이-지면에-났나.mjs --자가시험",
  "node scripts/check-남의신문제목이-지면에-났나.mjs",
  "node scripts/check-sitemap-page-coverage.mjs --자가시험",
  "node scripts/check-sitemap-page-coverage.mjs",
  /* ⚠ 자가시험만 문다 — 라이브 재기는 네트워크가 필요하고 «며칠치 기록»이 있어야 판정된다.
     라이브는 매시 점검(check-2h)이 돌린다 */
  "node scripts/check-sitemap-lastmod-honest.mjs --자가시험",
  /* 「오늘 낸 글」을 lastmod 가 아니라 «새로 난 주소»로 센다 — 1,468 이 세어지던 자리 */
  "node scripts/lib/sitemap-new-urls.mjs --자가시험",
  /* 새 나라 지면을 내놓고 출처를 안 적었나 — 출처 표시는 예의가 아니라 라이선스 의무다 */
  "node scripts/check-country-sources-disclosed.mjs --자가시험",
  "node scripts/check-country-sources-disclosed.mjs",
  /* 🔴 누계 자료를 「분기」라고 부르면 그 지면의 모든 수가 한꺼번에 틀린다 (대만에서 실제로 났다) */
  "node scripts/check-period-labels.mjs --자가시험",
  "node scripts/check-period-labels.mjs",
  "node scripts/check-internal-comment-leak.mjs --자가시험",
  "node scripts/check-internal-comment-leak.mjs",
  "node scripts/check-seat-config.mjs --자가시험",
  "node scripts/check-seat-resume-id.mjs --자가시험",
  /* 🔴 [2026-09-27 · 사장님] 「세션입구가 제대로 작동하는 지 꼭 테스트해봐」
   *   그날 아침 실측 — 바탕화면 단추가 통째로 사라져 있었고, 백업 단추에는
   *   CLAUDE_CONFIG_DIR 이 없어 누르면 «빈 창»이 열릴 참이었으며, 마지막 수단인
   *   세션ID 찾기는 «남의 자리 ID» 를 주고 있었다(1번을 물으면 2번을 주었다).
   *   ⛔ 한 번 눌러 보는 것으로는 다음 달에 또 어긋난다. 그래서 관문에 올린다. */
  "node scripts/check-session-entry.mjs --자가시험",
  "node scripts/check-session-entry.mjs",
  "node scripts/build-session-entry.mjs --자가시험",
  /* 🔴 [2026-09-27 · 사장님] 「막히면 우리 노하우를 이용해 우회로를 반드시 찾는다」
   *   이 자는 막힌 칸마다 «아직 안 대 본 길»을 함께 찍는다 —
   *   「라이선스로 막혔다」가 닫힌 문으로 굳는 것을 막는다. */
  /* 🔴 [2026-09-27 · 사장님] 「메일을 앞으론 parkintaek2@gmail.com 으로 보내줘」
   *   주소가 아홉 파일에 박혀 있었다. 한 곳만 고치면 나머지가 조용히 옛 주소로 간다 —
   *   사장님은 「안 왔다」를 겪으시고 우리는 보낸 기록만 보고 「보냈다」고 적는다. */
  "node scripts/check-boss-mail.mjs --자가시험",
  "node scripts/check-boss-mail.mjs",
  "node scripts/check-asia-coverage.mjs --자가시험",
  "node scripts/collect-openfigi-listings.mjs --자가시험",
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
  "node scripts/lib/csv-out.mjs --자가시험",
  "node scripts/lib/csv-read.mjs --자가시험",
  "node scripts/build-seoulmarkets-full-parquet.mjs --자가시험",
  "node scripts/check-data-page-counts.mjs --자가시험",
  "node scripts/check-data-page-counts.mjs",
  /* 🔴 [2026-09-19 · 2번] src/lib/tiers.mjs("파는 것은 양이다" — 유일한 유료화 장치)
   * 는 --selftest 가 있었지만 어디에도 안 걸려 있었다. ENFORCE_FROM(2026-08-17)이
   * 이미 지나 지금 실제로 429 를 돌려야 하는데 그걸 재는 검사가 없었다. */
  "node src/lib/tiers.mjs --selftest",
  /* 🔴 [2026-09-20 · 2번] src/lib/apikeys.mjs(F7 열쇠 발급 — 1번 몫)도 같은 병이었다.
   * --selftest 는 있는데 npm test 어디에도 안 걸려 있었다. tiers.mjs 가 이 파일의
   * 확인() 을 불러 pro 등급을 가른다 — 유료화 장치의 절반이다. */
  "node src/lib/apikeys.mjs --selftest",
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
  /* 🔴 [2026-09-13 · 6번] F7 마지막 갈래(ownership) + 그걸 쓴 첫 기사(ownership-exit) +
   *   UAE 확장 1호 수집기 — 자가시험이 있는데 안 물리면 다음 사람이 「이게 돌고 있나」를
   *   다시 재야 한다. 위 둘과 같은 이유로 물린다. */
  "node scripts/build-korea-ownership-tape.mjs --자가시험",
  "node scripts/build-ownership-exit-ranking.mjs --자가시험",
  /* 🔴 [2026-09-15 · 1번] 사장님 지시(「매시 정각 5번과 소통... 자물쇠」)로 만든 자가시험.
   *   시각에 좌우되는 실행부(마지막 줄)는 여기 안 건다 — 자가시험만 물린다. */
  "node scripts/check-kcw-hourly-sync.mjs --자가시험",
  "node scripts/collect-uae-cbuae-fx-rates.mjs --자가시험",
  /* 🔴 [2026-09-13 · 3번] F7 — 「⑤ 데이터 품질」 몫. 일곱 엔드포인트 밑감의
   *   값 채움률·최신 날짜를 검사로 지킨다. archive-freshness 와 같은 결로
   *   «실제 검사»를 npm test 관문에 둔다(자가시험은 따로 손으로 돌린다). */
  "node scripts/check-f7-data-quality.mjs",
  /* 🔴 [2026-09-18 · 2번] 손님 계정(SeoulMarkets 2단계) — src/lib/accounts.mjs 자가시험.
   *   SQLite+litestream 이 아니라 이미 검증된 store.mjs(R2 직접쓰기)를 쓴다. 새 인프라가
   *   없으니 「볼륨·복구 시험」도 이 자가시험이 전부다 — 잃을 로컬 볼륨 자체가 없다. */
  "node scripts/check-accounts.mjs",
  /* 🔴 [2026-09-18 · 2번] 위 자는 accounts.mjs 로직만 잰다. 이 자는 server.mjs 라우팅을
   *   실제로 띄워 누른다 — 결제 라우트가 두 번 당한 "POST 본문읽을경로 빠짐" 함정을
   *   여기서도 그대로 밟을 뻔했고, 이 자가 그 자리에서 잡았다. */
  "node scripts/check-accounts-http.mjs",
  /* 🔴 [2026-09-13 · 3번] 5번의 check-daily.mjs(일일 점검표, 사장님 지시) 가 안 물려
   *   check-tests-wired.mjs 에 걸렸다. 자가시험만 문다 — 실제 검사는 「손으로 볼 것」이
   *   남아 있어 일부러 exit 1 을 낸다(아직 자동화 전이라는 신호). 그걸 npm test 관문에
   *   걸면 자동화되기 전까지 늘 빨갛다 — 그건 이 자의 설계 의도가 아니다. */
  "node scripts/check-daily.mjs --자가시험",
  /* 🔴 [2026-09-21 · 5번] 손님에게 나가는 제안서에 «우리끼리 쓰는 말»이 들어가는 것을 막는다.
   *   사장님: 「케맵 제안서를 사람들이 잘 안 쓰는 표현을 수정해라...
   *            자꾸 «값»이라고 쓰는데 실제로 한국에선 거의 쓰지 않는다」
   *   ⚠ 자가시험이 «진짜 제안서»까지 함께 재므로 이 한 줄로 둘 다 걸린다.
   *   ⛔ 우리끼리 보는 docs 는 안 본다 — 거기서는 그 말들이 오히려 정확하다. */
  "node scripts/check-제안서-말투.mjs --자가시험",
  /* 🔴 [2026-09-21] 인도 신용등급 대장을 🔴(전면 금지)에서 🟡(집계만)으로 «좁히면서»
     같이 붙였다. 나가도 되는 것은 «우리가 센 수»뿐이고, 개별 회사 이름+등급이 한 줄이라도
     새면 그때부터는 NSE 자료를 옮긴 것이 된다.
     ⭐ 대장을 넓힌 사람이 지킬 자를 같이 만들지 않으면 그 판단은 다음 세션에서 무너진다. */
  "node scripts/check-india-rating-leak.mjs --자가시험",
  "node scripts/check-india-rating-leak.mjs",
  /* 🔴 [2026-09-26] 기사에 박힌 수가 자료를 안 따라와 «손님이 옛 수를 읽고 있었다».
     자료는 9/26 으로 갱신됐는데 기사는 9/20 의 22,295건·2,629를 말하고 있었다.
     ⇒ 어긋나면 그 자리에서 막는다. 「틀린 숫자 하나가 옳은 스물셋을 같이 의심받게 한다」 */
  "node scripts/sync-india-article-numbers.mjs --자가시험",
  "node scripts/sync-india-article-numbers.mjs --검사",
  /* 🔴 [2026-09-21] 「막혔다」고 문서에 적힌 우물이 정말 막혀 있나를 기계가 잰다.
     그날 EDINET 열쇠가 이미 나와 있는데 옛 문서를 그대로 옮겨 사장님께
     「막혔다」고 보고했다. 문서는 스스로 낡는데 아무도 다시 안 잰다. */
  "node scripts/check-locked-wells.mjs --자가시험",
  /* 🔴 [2026-09-21] 사장님 — 「체크리스트에 꾸준히 리스트를 추가해」
     「<한 것, 진행 중, 포기한 것> 세 항목에 체크를 업데이트하면 되잖아」
     「일을 마무리할 때마다, 업무시간이 끝날 때마다 업데이트를 해」
     ⭐ 「포기한 것」 칸이 핵심이다 — 끝났거나 버린 일이 목록에 남아 다음 사람이
       「아직 안 한 일」로 읽은 사고가 저장소에 311번 적혀 있다. */
  "node scripts/check-checklist-three-boxes.mjs --자가시험",
  /* 🔴 [2026-09-21] 일본 재무제표 — 같은 회사의 «지난 해» 값을 올해로 쓰지 않는지,
     빈 칸을 0 으로 메꾸지 않는지를 시험이 지킨다. */
  "node scripts/collect-japan-edinet-financials.mjs --자가시험",
  "node scripts/build-japan-financials-tape.mjs --자가시험",
  /* 🔴 [2026-09-22] 한국 중대공시 — 손님 파일에 한글 회사명·공시 원제목이 새지 않는지,
     영문명 없는 회사를 지어내지 않는지를 시험이 지킨다. */
  "node scripts/build-korea-disclosures-feed.mjs --자가시험",
  /* 일본 중대공시 — 태그를 «요소 이름»으로 붙인다. 표에 없는 이름은 모르는것으로 쌓인다 */
  "node scripts/collect-japan-edinet-breaking.mjs --자가시험",
  "node scripts/build-japan-disclosures-feed.mjs --자가시험",
  /* 🔴 [2026-09-22] 사장님 「묻지 않고 네가 스스로 판단해서 하는 걸로 고쳐놔」 —
     묻는 글이 메모로 새면 그 자리에서 잡는다. 다짐이 아니라 자로 둔다. */
  "node scripts/check-승인요청-새는곳.mjs --자가시험",
  "node scripts/check-승인요청-새는곳.mjs",
  /* 🔴 [2026-09-22] 사장님 「스포츠기사는 seo 맞춤형으로 작성+대중적 관심 키워드」 —
     그 규칙은 저장소가 아니라 claude.ai 예약작업 아홉의 프롬프트에 산다. 고치는 자를
     두어 손으로 아홉 번 고치지 않는다. ⚠ 시험은 «고치는 셈»만 잰다(브라우저를 안 붙는다). */
  "node scripts/set-jbnews-sports-prompt.mjs --자가시험",
  /* 🔴 [2026-09-22] 사장님 「기사 보내지마」·「5시가 마지막」 — 세 겹으로 박았고 셋 다 잰다.
     ① 수집기의 회차 표(09~16시)와 보낼때인가() ② 예약 창이 17시를 안 넘나(윈도 쪽이라
     git 밖에 있다 — 옛 명령으로 다시 걸면 조용히 되살아난다) */
  "node scripts/collect-jbnews-sports-articles.mjs --자가시험",
  "node scripts/check-jbnews-sports-schedule.mjs --자가시험",
  "node scripts/check-jbnews-sports-schedule.mjs",
  /* 🔴 [2026-09-25] AI 자료판독 — 예약은 git 밖(이 PC 안)에 있어 조용히 사라진다.
     실제로 2026-09-15 부터 9일 동안 멈춘 것을 아무도 몰랐다. 기계가 등록값을 읽어 잰다. */
  "node scripts/invest-ai/read-market-data.mjs --자가시험",
  "node scripts/check-ai-learning-schedule.mjs --자가시험",
  "node scripts/check-ai-learning-schedule.mjs",
  /* 🔴🔴 [2026-09-25] 투자 AI 는 중기부 공모에 낸 아이템이다. 우리가 «밖에 대고 낸 말»이
     오늘도 사실인지 잰다 — 사장님 「결국 …담당 세션이 거짓을 보고한거다」. */
  "node scripts/check-invest-ai-claims.mjs --자가시험",
  "node scripts/check-invest-ai-claims.mjs",
  /* 🔴 [2026-09-26] 우리가 만든 자가 사장님 화면에 창을 띄워 두 달 가까이 방해했다 */
  "node scripts/check-no-popup-scripts.mjs --자가시험",
  "node scripts/check-no-popup-scripts.mjs",
  /* 🔴 [2026-09-22] 교재를 다듬을 때 원전 한문·전문용어·옮김을 잃지 않나.
     ⚠ 자가시험만 문다 — 실측은 형제 저장소(../klifemap)의 원고를 git 과 맞대므로
     그 저장소가 없는 자리에서 헛빨강이 된다. */
  "node scripts/check-교재-다듬기.mjs --자가시험",
  /* 🔴 [2026-09-22] 한국은행 「통계정보이용지침」 원문을 읽어 보니 판정이 «계열마다» 갈린다 —
     한국은행 작성은 상업적 이용 자유, 타 기관 작성은 그 기관 승인이 먼저다.
     901Y124(은행연합회)와 판정 못 낸 셋이 지면에 새지 않게 막는다. */
  "node scripts/check-ecos-series-not-published.mjs --자가시험",
  "node scripts/check-ecos-series-not-published.mjs",
  /* 기사·자료 대조기가 «기사가 잰 날»의 스냅숏을 고르는지 — 이것이 깨지면 지난 기사가
     자료를 다시 받을 때마다 통째로 빨강이 된다(2026-09-22 에 겪었다). */
  "node scripts/lib/그날자료.mjs --자가시험",
  /* 🔴 [2026-09-22] 내린 기사의 그림·영상이 아직 열려 있나 — 지면은 내렸는데
     결함 있는 그래프 «영상»이 200 으로 살아 있었다. 내린 것은 같이 내려가야 한다. */
  "node scripts/check-retracted-article-media.mjs --자가시험",
  "node scripts/check-retracted-article-media.mjs",
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
