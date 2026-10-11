#!/usr/bin/env node
/**
 * check-all-selftests.mjs — **자가시험이 있는 검사들을 한 자리에서 다 돌린다.**
 * ────────────────────────────────────────────────────────────────────────────
 * [왜 만들었나 — 2026-09-02]
 *   `check-tests-wired.mjs` 가 「안 불리는 검사가 30 → **66**」으로 울려서
 *   **전 유닛의 npm test 가 통째로 막혀 있었다.** 배포 관문이 npm test 를 타므로
 *   그 사이 아무도 배포를 못 한다.
 *
 *   ⛔ 봐주는 수를 올려서 끄는 것은 «톱니를 무력화»하는 것이다. 그러면 다음에 또 늘어난다.
 *   ⭐ 그래서 66개를 갈라 세어 보고, **자가시험이 있고 인터넷·크롬·DB 를 안 타는 43개**를
 *      이 자로 묶어 npm test 에 «한 줄로» 물린다.
 *      (package.json 의 test 줄에 43개를 붙이면 2,446자가 늘어 사람이 읽을 수 없게 된다)
 *
 *   ⚠ 물리기 전에 **43개를 하나씩 돌려서 전부 통과하는 것을 확인했다.** 남의 검사를
 *      물렸다가 그것이 실패하면 전 유닛 배포가 또 막힌다 — 그건 고치는 게 아니라 옮기는 것이다.
 *
 * [이 자를 어떻게 쓰나]
 *   새 검사를 만들었고 자가시험이 있으면 **아래 `돌릴것` 에 한 줄 더한다.** 그것이 곧
 *   「자기가 만든 검사는 자기가 물린다」다. package.json 은 안 건드린다.
 *
 *   node scripts/check-all-selftests.mjs            전부 돌린다
 *   node scripts/check-all-selftests.mjs --자가시험   이 자 자신을 시험한다
 *
 * ⛔ 인터넷·크롬·DB 를 타는 검사를 여기에 넣지 않는다 — npm test 가 «남의 사정»으로 죽는다.
 *    그런 것은 `check-tests-wired.mjs` 의 `봐준다` 에 **까닭을 적어** 넣는다.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * [검사 파일, 자가시험 깃발]
 * ⭐ 이 배열이 «부름»이다 — `check-tests-wired.mjs` 는 주석을 안 세고 코드만 따라간다.
 *    그래서 목록을 주석이 아니라 **진짜 배열**로 둔다.
 */
export const 돌릴것 = [
  ['check-100y-name-placement.mjs', '--자가시험'],
  ['check-1500-reports.mjs', '--자가시험'],
  ['check-6beon-directives.mjs', '--selftest'],
  ['check-6번-15시보고-자물쇠.mjs', '--자가시험'],
  ['check-6번-콘텐트-due.mjs', '--자가시험'],
  ['check-결제-둘다.mjs', '--자가시험'],
  ['소통-매시-자동.mjs', '--자가시험'],
  ['아카이빙-되받기.mjs', '--자가시험'],
  ['정기업무-예약.mjs', '--자가시험'],
  ['쿠키-털기.mjs', '--자가시험'],
  /* 🔴 [2026-10-11 12:0x · 5번] 남의 신문 제목이 우리 지면에 그대로 나는지 잰다.
     ⚠ 여기는 «자가시험»만 문다 — 본 실행은 dist 가 있어야 해서 run-all-checks 에 따로 물려 있다. */
  ['check-남의신문제목이-지면에-났나.mjs', '--자가시험'],
  ['check-영문스니펫이-영어로-읽히나.mjs', '--자가시험'],
  ['check-daily-shipping.mjs', '--자가시험'],
  ['check-demand-covered.mjs', '--자가시험'],
  ['check-dist-ready.mjs', '--자가시험'],
  ['check-import-safety.mjs', '--자가시험'],
  ['check-kcw-article-backlinks.mjs', '--자가시험'],
  ['check-kcw-comment-leak.mjs', '--자가시험'],
  ['check-kcw-crosschecks.mjs', '--자가시험'],
  ['check-kcw-llms-freshness.mjs', '--자가시험'],
  ['check-kcw-memo-clock.mjs', '--자가시험'],
  ['check-kcw-my-files-only.mjs', '--자가시험'],
  ['check-kcw-names-in-title.mjs', '--자가시험'],
  ['check-kcw-narration-fits.mjs', '--자가시험'],
  ['check-kcw-row-pages.mjs', '--자가시험'],
  ['check-kcw-silent-video.mjs', '--자가시험'],
  ['check-kcw-title-cutoff.mjs', '--자가시험'],
  ['check-kcw-video-lists.mjs', '--자가시험'],
  ['check-kcw-wakers.mjs', '--자가시험'],
  ['check-korean-title-suspects.mjs', '--자가시험'],
  ['check-made-but-invisible.mjs', '--자가시험'],
  ['check-mail-dns.mjs', '--selftest'],
  ['check-meta-length.mjs', '--자가시험'],
  ['check-name-placement.mjs', '--자가시험'],
  ['check-no-riot.mjs', '--자가시험'],
  ['check-orphan-comment-close.mjs', '--자가시험'],
  ['check-owner-request.mjs', '--selftest'],
  ['check-person-title.mjs', '--자가시험'],
  ['check-school-desc.mjs', '--자가시험'],
  ['check-seat-split.mjs', '--자가시험'],
  ['check-selftest-counts.mjs', '--자가시험'],
  ['check-seoulmarkets-silent-video.mjs', '--자가시험'],
  ['check-session-entry-crlf.mjs', '--자가시험'],
  ['check-template-leak.mjs', '--자가시험'],
  ['check-title-change-cooldown.mjs', '--자가시험'],
  ['check-title-spelling-match.mjs', '--자가시험'],
  ['check-tls.mjs', '--selftest'],
  ['check-traffic-flush-alive.mjs', '--자가시험'],
  ['check-two-chart-merge.mjs', '--자가시험'],
  ['check-unregistered-title-changes.mjs', '--자가시험'],
  ['check-utc-today.mjs', '--자가시험'],
  ['check-wikitip-indexed-records.mjs', '--자가시험'],
  ['build-wikitip-title-demand.mjs', '--자가시험'],
  /* 🔴 [2026-10-05 · 5번] 지면을 내고 사이트맵에 안 넣는 사고가 «여섯 번째»라 자로 만들었다 */
  ['check-사이트맵-빠진지면.mjs', '--자가시험'],
  /* 🔴 [2026-10-05] 한국 거시 셋(GDP·물가·기준금리)을 ECOS 에서 받는 자가 여기 있었다.
     ⛔ 위 규칙이 「collect- 는 받지 않는다」인데 그것을 어겨, **이 파일의 자가시험이
       한 칸 깨진 채로 엿새**를 갔다(2026-10-11 05:5x 에 5번이 봄).
     ⇒ 지우지 않고 `run-all-checks.mjs` 로 옮겼다 — 거기에는 collect-news-desk.mjs 의
       자가시험이 이미 걸려 있다. 수집기 자가시험은 거기가 자리다.
     ⭐ 규칙을 어기면서 넣을 때는 **규칙을 고치든지 자리를 옮기든지** 한다.
       그냥 넣으면 그 규칙을 지키는 검사가 조용히 빨강이 된다. */

  /* 🔴🔴 [2026-10-11 05:5x · 5번] **9월 2일에 0 으로 만든 「안 불리는 검사」가 51개로 돌아와 있었다.**
   *   한 달 동안 새로 지은 검사를 아무도 안 물린 것이다.
   *   ⛔ 「안 불리는 검사는 문장일 뿐」이라는 말이 그냥 말이 아니었다 —
   *     `check-제목이-검색되는말인가.mjs` 는 **자가시험 한 칸이 깨진 채로** 있었다.
   *     안 물려 있어서 아무도 몰랐다. (그 하나는 고친 뒤에 물린다 — 깨진 채 물리면
   *     전 유닛 npm test 가 막힌다.)
   *   ⇒ 아래 열여섯은 **하나씩 돌려 보고** 도는 것만 넣었다. 짐작으로 넣지 않았다. */
  ['check-uae-balance-scale.mjs', '--자가시험'],
  ['check-강의슬라이드-명반후보.mjs', '--자가시험'],
  ['check-강의슬라이드-이마트꼴인가.mjs', '--자가시험'],
  ['check-강의자료-순한글조어.mjs', '--자가시험'],
  ['check-나라입구가-회사를-다거나.mjs', '--자가시험'],
  ['check-라이선스-대장-빈칸.mjs', '--자가시험'],
  ['check-막힌일.mjs', '--자가시험'],
  ['check-순한글조어.mjs', '--자가시험'],
  ['check-스포츠-카테고리비율.mjs', '--자가시험'],
  ['check-시세를-그대로-내놓나.mjs', '--자가시험'],
  ['check-없음과-못잼을-가르나.mjs', '--자가시험'],
  ['check-영문지면에-우리말.mjs', '--자가시험'],
  ['check-이미-있는-지면인가.mjs', '--자가시험'],
  ['check-자료가-낡았나.mjs', '--자가시험'],
  ['check-제목에-수가-있나.mjs', '--자가시험'],
  /* 🔴 이 자는 **자가시험이 깨진 채로 한 달을 갔다**(2026-10-11 고침).
     어간만 들고 다녀 「larg 가 빠졌다」고 말하고 있었다 — 사람이 못 알아듣는다.
     안 물려 있어서 아무도 안 봤다. 고치고 물린다. */
  ['check-제목이-검색되는말인가.mjs', '--자가시험'],
  ['check-주석이-코드를-깨뜨리나.mjs', '--자가시험'],
  /* 이 넷은 바깥(인터넷·크롬)을 안 타는데도 안 물려 있었다 — 돌려 보고 넣었다 */
  ['check-로그에-개인정보가-찍히나.mjs', '--자가시험'],
  ['check-보고말투.mjs', '--자가시험'],
  ['check-사람이-치는-말인가.mjs', '--자가시험'],
  ['check-이미-낸-것인가.mjs', '--자가시험'],

  /* 🔴🔴 [2026-10-11 06:5x · 5번] **본 실행이 인터넷·크롬을 타도 «자가시험»은 안 탄다.**
   *   남은 서른은 전부 바깥을 타는 자라 「봐준다」에 넣어야 하는 줄 알았는데,
   *   돌려 보니 스물넷이 자가시험을 갖고 있었다. 그것만 물리면 된다
   *   (2026-09-02 에 66개를 처리할 때 쓴 바로 그 방식이다).
   *
   * ⛔ **「빨리 끝났다」를 「자가시험이 돌았다」로 읽지 않았다.** 처음에 시간으로 가렸더니
   *   `check-네사이트-보안-라이브` 가 0초에 끝나 통과했는데, 실은 `--자가시험` 을
   *   «무시하고» 본 실행을 한 것이었다. ⇒ **출력에 「자가시험」이 찍히는지**로 다시 가렸다.
   *   그렇게 다섯이 걸러졌다 — 가져오면-도는자 · 네사이트-보안-라이브 ·
   *   만세력손님-안으로-가나 · 오늘-몇편-났나 · 카페손님-어느글로. 그 다섯은 안 넣는다. */
  ['check-dataset-구조화자료.mjs', '--자가시험'],
  ['check-dataset-채우기.mjs', '--자가시험'],
  ['check-inbound-links.mjs', '--자가시험'],
  ['check-klifemap-글들이-색인되나.mjs', '--자가시험'],
  ['check-page-sameness.mjs', '--자가시험'],
  ['check-seoulmarkets-얇은지면.mjs', '--자가시험'],
  ['check-sitemap-submitted.mjs', '--자가시험'],
  ['check-공공데이터-이용허락이-바뀌었나.mjs', '--자가시험'],
  ['check-과속막이.mjs', '--자가시험'],
  ['check-구글에-얼마나-보이나.mjs', '--자가시험'],
  ['check-구글이-보는-글자.mjs', '--자가시험'],
  ['check-네사이트-검색유입-견준다.mjs', '--자가시험'],
  ['check-다국어-색인.mjs', '--자가시험'],
  ['check-되는지면-무엇이다른가.mjs', '--자가시험'],
  ['check-바깥채널-로그인.mjs', '--자가시험'],
  ['check-백년지도-왜-안눌리나.mjs', '--자가시험'],
  ['check-사이트맵을-구글이-받았나.mjs', '--자가시험'],
  ['check-색인-얼마나-됐나.mjs', '--자가시험'],
  ['check-선호출처-자격.mjs', '--자가시험'],
  ['check-세징검다리.mjs', '--자가시험'],
  ['check-손님눈에-보이는-글자.mjs', '--자가시험'],
  ['check-폴더입구가-사나.mjs', '--자가시험'],
  ['check-형제지면이-너무-닮았나.mjs', '--자가시험'],
  ['check-회차예약-한국시간인가.mjs', '--자가시험'],

  /* 🔴🔴 [2026-10-11 06:5x · 5번] **내 가리개가 이 셋을 잘못 걸렀다.**
   *   「출력에 «자가시험» 이 찍히나」로 가렸는데 —
   *     check-가져오면-도는자        「자체 점검 8/8」 이라고 찍는다
   *     check-네사이트-보안-라이브    node:test 를 써서 「ℹ pass」 꼴로 찍는다
   *     check-만세력손님-안으로-가나  「깨짐 0」 이라고 찍는다
   *   셋 다 자가시험이 멀쩡히 돌고 있었다. ⇒ **코드가 깃발을 받나**로 다시 가렸다.
   * ⭐ 오늘 밤 이 모양에 세 번 걸렸다 — grep Chairman(지면은 「Chair」),
   *   grep est|found(원본은 「설립」), 그리고 이것. **내가 쓴 말로 세지 않는다.** */
  ['check-가져오면-도는자.mjs', '--자가시험'],
  ['check-네사이트-보안-라이브.mjs', '--자가시험'],
  ['check-만세력손님-안으로-가나.mjs', '--자가시험'],
];

export function 자가시험() {
  let 흠 = 0;
  let 잰수 = 0;
  const 본다 = (이름, 참) => {
    잰수 += 1;
    if (참) console.log(`  ✅ ${이름}`);
    else { console.log(`  🔴 ${이름}`); 흠 += 1; }
  };
  본다('돌릴 것이 비어 있지 않다', 돌릴것.length > 0);
  본다('모두 [파일, 깃발] 두 칸이다', 돌릴것.every((x) => Array.isArray(x) && x.length === 2));
  /* ⭐ `build-` 도 받는다 — 만드는 자의 자가시험도 검사만큼 값이 있다.
     2026-09-02 에 `build-wikitip-title-demand.mjs` 를 넣으려다 여기서 막혔다.
     그 자는 첫 화면이 죽은 링크 13개를 걸던 것을 막는 자라, 안 돌리면 그것이 다시 자란다.
     ⛔ `collect-`·`make-`·`measure-` 는 받지 않는다 — 그것들은 인터넷·크롬을 탄다.

     🔴🔴 [2026-10-11 06:0x · 5번] **이 칸이 깨진 채로 있었다.** 이름 넷이 걸렸는데
       `collect-` 가 아니라 **한글로 시작하는 우리 자**였다 —
         소통-매시-자동.mjs · 아카이빙-되받기.mjs · 정기업무-예약.mjs · 쿠키-털기.mjs
       이 저장소는 한글 이름을 쓴다. 규칙이 **현실과 어긋나 있었다.**
     ⭐ 이 규칙의 «뜻»은 「인터넷·크롬을 타는 자를 여기 넣지 마라」이지
       「이름이 check- 여야 한다」가 아니다. 이름은 그 뜻을 재던 **대리 지표**였다.
       대리 지표가 현실과 어긋나면, 고칠 것은 현실이 아니라 지표다.
     ⇒ 한글로 시작하는 이름을 받되, 막고 싶던 셋은 **이름으로 그대로 막는다.** */
  본다('⛔ 인터넷·크롬을 타는 이름(collect-·make-·measure-)이 없다',
    돌릴것.every(([f]) => !/^(collect|make|measure)-/.test(f)));
  본다('모두 .mjs 이고 check-·build- 거나 우리말 이름이다',
    돌릴것.every(([f]) => /\.mjs$/.test(f) && /^(check-|build-|[가-힣])/.test(f)));
  본다('깃발이 --자가시험 이나 --selftest 다',
    돌릴것.every(([, g]) => g === '--자가시험' || g === '--selftest'));
  본다('같은 파일을 두 번 넣지 않았다', new Set(돌릴것.map(([f]) => f)).size === 돌릴것.length);
  /* ⛔ 이 자가 자기를 부르면 끝없이 돈다 */
  본다('자기를 안 부른다', !돌릴것.some(([f]) => f === 'check-all-selftests.mjs'));
  console.log(흠 ? `\n🔴 자가시험 ${흠}개 흠` : `\n✅ 자가시험 ${잰수}가지 다 지났다 — 돌릴 것 ${돌릴것.length}개`);
  return 흠;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  if (process.argv.includes('--자가시험')) process.exit(자가시험() ? 1 : 0);

  const 뿌리 = path.dirname(fileURLToPath(import.meta.url));
  let 흠 = 0;
  const 흠난것 = [];
  for (const [f, 깃발] of 돌릴것) {
    const r = spawnSync(process.execPath, [path.join(뿌리, f), 깃발], { encoding: 'utf8' });
    if (r.status !== 0) { 흠 += 1; 흠난것.push(f); }
  }
  console.log(`자가시험 묶음 — ${돌릴것.length}개 중 ${돌릴것.length - 흠}개 통과`);
  if (흠) {
    console.error(`\n⛔ ${흠}개가 흠났다:`);
    for (const f of 흠난것) console.error(`   · ${f}  →  node scripts/${f} 로 다시 보십시오`);
    process.exit(1);
  }
  console.log('✅ 다 지났다');
}
