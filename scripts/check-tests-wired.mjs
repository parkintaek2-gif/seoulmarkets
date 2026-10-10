#!/usr/bin/env node
/**
 * check-tests-wired.mjs — **검사가 `npm test` 에 물려 있나**를 검사한다.
 *
 * 🔴 왜 — 2026-08-08 15:4x, 8번이 「npm test 가 안 부르는 것이 있다」고 알렸다. 세어 보니
 *   **검사 파일 68개 중 53개가 안 불리고 있었다.** 부르는 것은 15개뿐이었다.
 *   우리 규칙이 「규칙은 문장이 아니라 검사로 둔다」인데,
 *   **안 불리는 검사는 그냥 문장이다.** 78% 가 문장이었다.
 *
 * ⛔ 그래서 이 검사를 둔다. 새 검사를 만들고 물려 놓지 않으면 여기서 운다.
 * ⚠ 한 번에 53개를 다 물릴 수는 없다 — 어떤 것은 느리고, 어떤 것은 그 기사 하나를 위한
 *   일회용이다. 그래서 **「봐준 목록」**을 두되, 그 목록이 **줄어들기만 하게** 한다.
 *   ⛔ 목록에 새로 넣으려면 **까닭을 한 줄 적어야** 한다. 조용히 늘리지 못하게.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** 검사로 세는 파일 이름 무늬 */
export const 검사무늬 = /(\.test\.mjs|^check-.*\.mjs)$/;

/**
 * 봐주는 것 — **까닭이 있어야 들어온다.** 까닭 없이 이름만 넣지 않는다.
 * ⚠ 이 목록은 **줄어들기만 한다.** 늘리려면 왜 상시 검사가 아닌지 적는다.
 */
export const 봐준다 = {
  'check-tests-wired.mjs': '이 파일. 자기를 자기가 부르면 안 된다',

  /* 🔴 [2026-10-11 06:5x · 5번] 9월 2일에 0 으로 만든 수가 51 로 돌아와 있어 다시 훑었다.
     마흔다섯은 자가시험을 물려 닫았고, 자가시험이 «아예 없는» 이 셋만 여기 적는다.
     ⛔ 수를 올려서 끄지 않았다 — 셋 다 왜 자가시험을 못 두는지 까닭을 적는다. */
  'check-data지면-색인됐나.mjs': '구글 Search Console 에 직접 물어 /data/ 갈래가 왜 투명한지 본다. 열쇠와 인터넷이 있어야 도는 자라 npm test 에 둘 수 없다 — 손으로 돌린다',
  'check-오늘-몇편-났나.mjs': '라이브 주소를 받아 새 글이 몇 편 났는지 센다. 인터넷이 없으면 셀 것이 없다 — 가를 자가시험이 없다',
  'check-카페손님-어느글로.mjs': '다음 카페(바깥 사이트)에서 오는 손님이 어느 글로 들어오는지 본다. 크롬 9222 에 붙어야 도는 자라 npm test 에 둘 수 없다',

  /* 🔴🔴 [2026-09-02 · 5번] **안 불리는 검사가 30 → 66 으로 늘어 전 유닛 npm test 가 막혔다.**
     사장님: 「npm test 가 깨져 있습니다 … 자기가 만든 검사는 자기가 물립니다 >>>> 이건 뭘까? 해결해」

     [어떻게 풀었나 — 봐주는 수를 «올리지» 않았다]
       66개를 갈라 세었다 — 자가시험이 있고 인터넷·크롬·DB 를 안 타는 것 43개 · 나머지 23개.
       ⭐ 43개는 하나씩 돌려 **전부 통과하는 것을 확인한 뒤** `check-all-selftests.mjs` 로 묶어
          npm test 에 «한 줄»로 물렸다(package.json 에 2,446자를 붙이지 않으려고 자를 뒀다).
       ⛔ 남의 검사를 물렸다가 그것이 실패하면 전 유닛 배포가 또 막힌다 — 그건 옮기는 것이지
          고치는 것이 아니다. 그래서 «돌려 보고» 물렸다.
       ⇒ 66 → 22. 그 22개가 아래다. **전부 인터넷·라이브·구글API 를 탄다.**

     [그리고 봐주는 수를 0 으로 조였다]
       아래에 까닭을 다 적었으니 안불림은 0 이 된다. ⇒ 이제 **안 물린 검사가 하나만 생겨도 운다.**
       그것이 「자기가 만든 검사는 자기가 물린다」를 문장이 아니라 «검사»로 만드는 길이다.
     ⚠ 새 검사를 만들었으면 ① 자가시험이 있으면 `check-all-selftests.mjs` 목록에 한 줄 더한다
       ② 인터넷·크롬을 타면 **여기에 까닭을 적어** 넣는다. 둘 중 하나는 해야 한다.
     ⛔ 봐주는 수를 올려서 끄지 않는다. 그러면 다음 사람이 또 66개를 만난다. */
  'check-100y-llms-freshness.mjs': '라이브 100yearmap 의 llms.txt 를 받아 지면과 대 본다. 인터넷이 끊기면 npm test 가 통째로 죽는다',
  'check-100y-sitemap-read.mjs': '구글 서치콘솔 API 로 사이트맵 읽힘을 본다. 인터넷 + 구글 API 한도를 탄다',
  'check-2h.mjs': '두 시간마다 도는 «자리지킴» 감시자다. 배포 관문이 아니라 상시 감시라 npm test 에 넣을 자리가 아니다',
  'check-clock.mjs': '라이브 서버의 시각이 KST 와 맞나 본다. 인터넷을 탄다',
  'check-first-onward-link.mjs': '라이브 지면을 받아 첫 안쪽 링크의 자리를 잰다. 인터넷을 탄다',
  'check-google-indexed.mjs': '구글 URL Inspection API 한도(하루 2,000건)를 쓴다. 상시로 물리면 한도를 태운다',
  'check-import-safe.mjs': '라이브에서 대본 길이를 재 본다. 인터넷을 탄다',
  'check-indexing.mjs': '구글 색인 상태를 라이브로 본다. 인터넷을 탄다',
  'check-kcw-broken-links.mjs': '라이브 기사의 링크를 하나씩 눌러 본다. 인터넷이 끊기면 죽는다',
  'check-kcw-sitemap-lastmod.mjs': '라이브 사이트맵의 lastmod 를 받아 본다. 인터넷을 탄다',
  'check-kcw-video-sitemap.mjs': '라이브 영상 사이트맵을 받아 본다. 인터넷을 탄다',
  'check-live-assets.mjs': '라이브에 나간 자원을 받아 본다. 인터넷을 탄다',
  'check-live-matches-source.mjs': '라이브가 내 HEAD 와 같은지 받아 본다. 배포 «뒤»에 도는 자다 — 배포 전에는 옛 지면을 보고 운다',
  'check-navigational-impressions.mjs': '서치콘솔 노출을 받아 잰다. 인터넷 + 구글 API 를 탄다',
  'check-paid-services.mjs': '라이브에서 유료 서비스가 보이나 밖에서 잰다. 인터넷을 탄다',
  'check-search-index.mjs': '라이브 색인을 본다. 인터넷을 타고 자가시험이 아직 없다 — 주인이 자가시험을 붙이면 묶음으로 옮긴다',
  'check-seoulmarkets-broken-links.mjs': '라이브 기사의 링크를 눌러 본다. 인터넷을 탄다',
  'check-seoulmarkets-video-sitemap.mjs': '라이브 영상 사이트맵을 본다. 인터넷을 타고 자가시험이 아직 없다',
  'check-sitemap-freshness.mjs': '서치콘솔로 사이트맵 신선도를 본다. 인터넷 + 구글 API 를 탄다',
  'check-title-ambiguity.mjs': '라이브 제목을 받아 견준다. 인터넷을 타고 자가시험이 아직 없다',
  'check-trade-scale-break.mjs': '🔒 잠금쇠. 자가시험이 아직 없다 — 주인이 붙이면 `check-all-selftests.mjs` 목록으로 옮긴다',
  'check-youtube-100y.mjs': '라이브 유튜브 쪽을 본다. 인터넷을 탄다. ⚠ 우리는 유튜브에 안 올린다(사장님 2026-08-30) — 이 자가 아직 필요한지는 주인이 정한다',

  /* 3번(백년지도) 것 넷 — 2026-08-08 16:5x~17:5x. 넷 다 **상시로 돌 수 없는 까닭**이 다르다.
     ⚠ 상시로 돌 수 있는 둘(check-100y-provenance · check-100y-major-bridge)은 npm test 에 물렸다 */
  'check-100y-label-echo.mjs': '나간 지면 4,963장을 훑는다. 빌드가 없으면 잴 것이 없다 — npm run check:100y:label',
  'check-100y-reach.mjs': '나간 지면 4,962장을 걸어 본다. 빌드가 없으면 잴 것이 없다 — npm run check:100y:reach',
  'check-100y-print.mjs': '진짜 크롬으로 A4 에 앉힌다. 크롬과 빌드가 둘 다 있어야 돈다 — npm run check:100y:print',
  'check-100y-phone.mjs': '진짜 크롬을 375px 로 띄운다. 크롬과 빌드가 둘 다 있어야 돈다 — npm run check:100y:phone',
  'check-100y-live-sale.mjs': '라이브를 받아 잰다. 인터넷이 끊기면 npm test 가 통째로 죽고, 배포 전에는 옛 지면을 보고 운다',
  'check-analytics-fires.mjs': '진짜 크롬으로 라이브를 열어 GA 가 쏘는지 잰다. 크롬·인터넷이 둘 다 있어야 돈다 — npm run check:ga',
  'check-100yearmap-launch.mjs': 'dist 5,000장을 훑는다. 빌드가 없으면 잴 것이 없고, 여섯이 dist 를 같이 써서 남이 빌드하는 사이에 ENOENT 가 난다 — npm run check:100y:launch',
  'check-100y-indexed.mjs': '구글 URL Inspection API 한도(하루 2,000건)를 쓴다. 5번 check-kcw-indexed.mjs 와 같은 까닭 — 상시로 물리면 한도를 태운다 — node scripts/check-100y-indexed.mjs --잰다 --n=60 --쓴다 (하루 한 번)',

  /* 3번(백년지도) — 2026-08-21 8/10 이후 새로 생긴 44개를 다시 훑으며 둘만 남겼다.
     나머지 열넷은 --자가시험/--selftest 로 npm test 에 그대로 물렸다(자가시험만으로 충분히 지킨다).
     이 둘은 자가시험 자체가 없다 — 재는 것 전부가 라이브·dist 라 자가시험을 만들 수가 없다 */
  'check-100y-live.mjs': '항상 100yearmap.com 라이브를 받아 잰다. 자가시험이 없다 — npm run check:100y:live',
  'check-100y-content-evidence.mjs': 'dist 를 읽어 콘텐트 수치가 지면에 있나 본다. 빌드가 없으면 잴 것이 없다 — npm run check:100y:content-evidence',

  /* 5번 것 — 2026-08-22. 파일 머리에 스스로 적어 뒀다: 「npm test 에 물리지 않는다.
     내가 쉰 것으로 다른 다섯 자리의 빌드를 세우면 남에게 피해를 준다」. 하루 두 번(11:47·23:47)
     따로 도는 자물쇠다 — 2번이 그 설계를 그대로 존중해 봐준다에 넣는다(무단으로 물리지 않는다) */
  'check-no-idle-hours.mjs': '5번의 개인 게으름 감시자. npm test 에 물리면 남의 빌드가 죽는다 — 하루 2번 예약(11:47·23:47)으로 상시 돈다',

  /* 5번 것 — 2026-08-22. 구글에 우리 지면의 색인 여부를 **직접 물어** 잰다(URL Inspection API).
     ⛔ 하루 한도가 2,000건이고 한 번에 표본 61건을 쓴다. 상시 사슬에 물리면 한도를 태우고
       다른 자리도 못 재게 된다. 한 번에 1~2분도 걸린다. 그래서 하루 한 번 따로 부른다.
     ⚠ 이 자는 **자가시험이 있다**(18칸) — 그쪽은 API 를 안 쓰므로 npm test 에서 그대로 돈다. */
  'check-kcw-indexed.mjs': '구글 URL Inspection API 한도(하루 2,000건)를 쓴다. 상시로 물리면 한도를 태운다 — node scripts/check-kcw-indexed.mjs --잰다 --n=60 --쓴다 (하루 한 번)',
};

/**
 * 파일 하나를 읽어 준다. 없으면 빈 글이다.
 * ⚠ 검사에서 갈아 끼울 수 있게 밖으로 뺐다 — 자가시험이 진짜 파일을 안 만들어도 되게.
 */
export const 소스읽기 = (이름) => {
  try { return fs.readFileSync(path.join(뿌리, 'scripts', 이름), 'utf8'); }
  catch { return ''; }
};

/**
 * **모아 부르는 자를 따라간다.**
 *
 * 🔴 왜 — 2026-08-08 18:5x. `check-wikitip-all.mjs` 한 자가 42개를 execFileSync 로 부른다.
 *   그 42개는 실제로 매번 돈다. 그런데 이 자는 `package.json` 의 글자만 봐서
 *   **42개를 전부 「안 불림」으로 셌다.** 세는 자가 틀리면 못 박은 수도 틀린다.
 *
 * ⛔ 「불린다」는 package.json 에 이름이 있다는 뜻이 아니라 **실제로 돈다**는 뜻이다.
 *   그러니 물린 자가 제 안에서 부르는 검사도 물린 것으로 센다. 몇 단계든 따라간다.
 *
 * ⚠ 돌고 도는 것(a 가 b 를, b 가 a 를)에 안 빠진다 — **`물림` 이 곧 본 것**이라
 *   한 파일이 두 번 줄에 서지 않는다. ⛔ 따로 「본 것」 자물쇠를 두었다가 뺐다.
 *   빼고 깨뜨려 보니 검사가 그대로 통과했다 — **안 서는 자물쇠는 자물쇠가 아니다.**
 *
 * ⛔ **주석에 적힌 이름은 안 센다.** 주석은 부르는 것이 아니라 말하는 것이다.
 *   (이 파일만 해도 `봐준다` 설명에 검사 이름 넷이 적혀 있다. 그걸 「부른다」고 세면 거짓이다.)
 */
export const 주석빼기 = (글) =>
  String(글 ?? '').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

export function 갈라내기(파일들, 부름, 봐줄것 = 봐준다, 읽기 = 소스읽기) {
  const 검사 = 파일들.filter((f) => 검사무늬.test(f));

  /**
   * 🔴 2026-08-10 05:5x — **여기서 같은 실수를 한 번 더 하고 있었다.**
   *
   *   8/8 에 고친 것은 「`check-` 로 시작하는 **모아 부르는 자**를 따라간다」였다.
   *   그런데 씨앗을 여전히 **검사 이름을 가진 파일**에서만 뿌리고 있었다. 그래서
   *   ```
   *   npm test  →  build-100y-style.mjs --확인  →  check-100y-customer·leak·tap --자가시험
   *   ```
   *   이 셋이 **진짜로 매번 도는데도** 「안 불림」으로 세어졌다. 이름이 `check-` 가
   *   아니라는 이유 하나로 길이 끊겼다.
   *
   * ⛔ 「불린다」는 이름이 예쁘다는 뜻이 아니라 **실제로 돈다**는 뜻이다.
   *   그래서 씨앗을 **package.json 이 부르는 모든 스크립트**로 넓힌다.
   *   ⚠ 세는 대상(`검사`)은 그대로다 — 검사가 아닌 파일이 「검사 수」에 끼지는 않는다.
   */
  const 씨앗 = 파일들.filter((f) => String(부름 ?? '').includes(f));

  /* ⚠ **본 것**과 **검사로 센 것**을 가른다. 길은 검사가 아닌 파일도 이어 준다
   *   (npm test → build-x.mjs → build-y.mjs → check-z.mjs 도 세 단계 다 따라간다).
   *   ⛔ 「본 것」이 곧 돌고 도는 것을 막는 자물쇠다 — 한 파일이 두 번 줄에 서지 않는다 */
  const 본것 = new Set(씨앗);
  const 볼것 = [...씨앗];
  while (볼것.length) {
    const 이번 = 볼것.pop();
    let 글 = '';
    try { 글 = 주석빼기(읽기(이번)); } catch { 글 = ''; }   // 못 읽으면 안 부르는 것으로 본다. 죽지 않는다
    for (const f of 파일들) {
      if (f === 이번 || 본것.has(f)) continue;
      if (글.includes(f)) { 본것.add(f); 볼것.push(f); }
    }
  }
  const 물림 = new Set(검사.filter((f) => 본것.has(f)));

  const 안불림 = 검사.filter((f) => !물림.has(f) && !(f in 봐줄것));
  return { 검사수: 검사.length, 안불림 };
}

/* ── 검사 ── */
if (process.argv.includes('--selftest')) {
  let 통과 = 0, 실패 = 0;
  const 재본다 = (이름, 실제, 바람) => {
    const ok = typeof 바람 === 'function' ? 바람(실제) : JSON.stringify(실제) === JSON.stringify(바람);
    if (ok) 통과 += 1; else { 실패 += 1; console.error(`  ⛔ ${이름}\n     받은 것: ${JSON.stringify(실제)}`); }
  };
  재본다('물린 것은 안 걸린다', 갈라내기(['a.test.mjs'], 'node scripts/a.test.mjs', {}).안불림, []);
  재본다('안 물린 것은 걸린다', 갈라내기(['a.test.mjs'], 'node scripts/b.test.mjs', {}).안불림, ['a.test.mjs']);
  재본다('봐준 것은 안 걸린다', 갈라내기(['a.test.mjs'], '', { 'a.test.mjs': '까닭' }).안불림, []);
  재본다('검사 아닌 파일은 안 센다', 갈라내기(['build.mjs'], '', {}).검사수, 0);
  재본다('check- 로 시작하면 센다', 갈라내기(['check-x.mjs'], '', {}).검사수, 1);
  재본다('가운데 check- 는 안 센다', 갈라내기(['make-check-x.mjs'], '', {}).검사수, 0);
  재본다('빈 목록', 갈라내기([], '', {}).안불림, []);
  재본다('부름이 null 이어도 안 죽는다', 갈라내기(['a.test.mjs'], null, {}).안불림, ['a.test.mjs']);
  재본다('봐준 것에 까닭이 다 있다', Object.values(봐준다).every((x) => x && x.length > 3), true);

  /* ── 모아 부르는 자를 따라가나 ── */
  const 글판 = (표) => (이름) => 표[이름] ?? '';
  재본다('모아 부르는 자가 부르면 물린 것이다',
    갈라내기(['check-all.mjs', 'check-b.mjs'], 'node scripts/check-all.mjs', {},
      글판({ 'check-all.mjs': "execFileSync('node',['scripts/check-b.mjs'])" })).안불림, []);
  재본다('두 단계도 따라간다',
    갈라내기(['check-all.mjs', 'check-b.mjs', 'check-c.mjs'], 'node scripts/check-all.mjs', {},
      글판({ 'check-all.mjs': "'check-b.mjs'", 'check-b.mjs': "'check-c.mjs'" })).안불림, []);
  재본다('안 물린 자가 부르는 것은 그대로 안 물린 것이다',
    갈라내기(['check-all.mjs', 'check-b.mjs'], '', {},
      글판({ 'check-all.mjs': "'check-b.mjs'" })).안불림, ['check-all.mjs', 'check-b.mjs']);
  재본다('돌고 도는 것에 안 빠진다',
    갈라내기(['check-a.mjs', 'check-b.mjs'], 'node scripts/check-a.mjs', {},
      글판({ 'check-a.mjs': "'check-b.mjs'", 'check-b.mjs': "'check-a.mjs'" })).안불림, []);
  재본다('주석에 적힌 이름은 안 센다',
    갈라내기(['check-a.mjs', 'check-b.mjs'], 'node scripts/check-a.mjs', {},
      글판({ 'check-a.mjs': '/* check-b.mjs 는 느려서 뺐다 */' })).안불림, ['check-b.mjs']);
  재본다('한 줄 주석도 안 센다',
    갈라내기(['check-a.mjs', 'check-b.mjs'], 'node scripts/check-a.mjs', {},
      글판({ 'check-a.mjs': '// check-b.mjs 는 나중에' })).안불림, ['check-b.mjs']);
  /* ── 🔴 검사 이름이 **아닌** 모아 부르는 자도 따라가나 (8/10 고침) ── */
  재본다('검사 이름이 아닌 자가 부르면 물린 것이다',
    갈라내기(['build-style.mjs', 'check-b.mjs'], 'node scripts/build-style.mjs --확인', {},
      글판({ 'build-style.mjs': "execFileSync(node,['scripts/check-b.mjs','--자가시험'])" })).안불림, []);
  재본다('검사 아닌 자를 두 단계 따라간다',
    갈라내기(['build-a.mjs', 'build-b.mjs', 'check-c.mjs'], 'node scripts/build-a.mjs', {},
      글판({ 'build-a.mjs': "'build-b.mjs'", 'build-b.mjs': "'check-c.mjs'" })).안불림, []);
  재본다('안 불리는 자가 부르는 것은 그대로 안 물린 것이다 (검사 아닌 자도 같다)',
    갈라내기(['build-x.mjs', 'check-d.mjs'], '', {},
      글판({ 'build-x.mjs': "'check-d.mjs'" })).안불림, ['check-d.mjs']);
  재본다('검사 아닌 자는 「검사 수」에 안 낀다',
    갈라내기(['build-style.mjs', 'check-b.mjs'], 'node scripts/build-style.mjs', {},
      글판({ 'build-style.mjs': "'check-b.mjs'" })).검사수, 1);
  재본다('검사 아닌 자의 주석에 적힌 이름은 안 센다',
    갈라내기(['build-style.mjs', 'check-b.mjs'], 'node scripts/build-style.mjs', {},
      글판({ 'build-style.mjs': '/* check-b.mjs 는 느려서 뺐다 */' })).안불림, ['check-b.mjs']);

  재본다('읽기가 터져도 안 죽는다',
    갈라내기(['check-a.mjs'], 'node scripts/check-a.mjs', {}, () => { throw new Error('x'); }).안불림, []);
  console.log(실패 ? `\n⛔ ${실패}개 틀렸다 (통과 ${통과})` : `✅ 검사 ${통과}개 통과`);
  process.exit(실패 ? 1 : 0);
}

/* ── 실행 ── */
const j = JSON.parse(fs.readFileSync(path.join(뿌리, 'package.json'), 'utf8'));
const 파일들 = fs.readdirSync(path.join(뿌리, 'scripts'));
const { 검사수, 안불림 } = 갈라내기(파일들, j.scripts?.test ?? '');

/* 🔴 [2026-09-02 · 5번] **목록을 볼 길이 없었다.**
   톱니를 지나면 「아직 22개가 안 불립니다」만 찍고 «무엇이» 안 불리는지는 안 보였다.
   그래서 아무도 줄이지 못했다 — 고칠 수 없는 경고는 경고가 아니다.
   `node scripts/check-tests-wired.mjs --목록` 으로 언제든 다 본다. */
if (process.argv.includes('--목록')) {
  console.log(`안 불리는 검사 ${안불림.length}개 (검사 파일 ${검사수}개 중)`);
  for (const f of 안불림) console.log(`  · ${f}`);
  process.exit(0);
}

/**
 * ⚠ 이 수를 **줄이기만** 한다 — 늘어나면 운다.
 *
 * 53 (8/8 15:4x) → **11** (8/8 18:5x)
 *   ⭐ 42개는 새로 물려서 준 것이 아니다. **원래 돌고 있었는데 내가 못 세고 있었다** —
 *     `check-wikitip-all.mjs` 가 부르는 것을 이 자가 안 따라갔다.
 *     세는 자를 고치고, 그 자를 `npm test` 에 물렸다.
 *   ⛔ 남은 것은 대개 **인터넷·라이브·크롬**을 탄다. 물리면 npm test 가 남의 사정으로 죽는다.
 *     각자 봐준다 에 까닭을 적고 넣든지, 상시로 돌게 고치든지 주인이 정한다.
 *
 * 11 → **10** (8/10 06:0x)
 *   ⭐ 여기서도 **하나는 새로 물려서 준 것이 아니다.** 씨앗을 검사 이름을 가진 파일에서만
 *     뿌리고 있어서, `build-100y-style.mjs --확인` 이 매번 부르는 검사 셋이 「안 불림」에
 *     들어가 있었다. 위 `갈라내기` 를 고쳐 길이 이어졌다.
 *   ⚠ 그래서 이 수가 줄었다고 검사가 늘어난 것이 아니다 — **세는 자가 덜 세고 있었다.**
 *
 * 10 → **44** (그 사이 늘어난 채 아무도 안 봄) → **30** (2026-08-21 3번이 다시 훑음)
 *   5번이 「44개가 전부 check-100y-*(3번 몫)」이라 짚었는데 **세어 보니 틀렸다** — 실은
 *   check-100y-* 14개 · check-kcw-*(5번 것) 18개 · 나머지(check-clock·check-mail-dns·
 *   check-tls·check-riot-key 등 공유·타 유닛 것) 12개였다. ⛔ 출처를 못 믿으면 옳은 것도
 *   같이 의심받는다 — 그래서 셈만 고치고 넘긴다(품평 아니다).
 *   3번 몫 14개는 이번에 닫았다 — 12개는 `--자가시험`/`--selftest` 로 `npm test` 에 물리고
 *   (전부 dist·라이브 없이 도는 자가시험만 있다), 자가시험이 아예 없는 둘(check-100y-live·
 *   check-100y-content-evidence)만 위 `봐준다` 에 까닭을 적어 넣었다.
 *   남은 30개는 각 자리 몫이다 — **3번이 남의 검사를 대신 물리지 않는다.**
 */
/* 🔴 [2026-09-02 · 5번] 30 → **0**. 66개를 43(물림) + 22(까닭 적어 봐줌) 으로 다 처리했다.
   ⇒ 이제 **안 물린 검사가 하나만 생겨도 운다.** 「자기가 만든 검사는 자기가 물린다」가
   문장이 아니라 검사가 된다. ⛔ 이 수를 올려서 끄지 마십시오 — 둘 중 하나를 하십시오:
   ① 자가시험이 있으면 check-all-selftests.mjs 목록에 한 줄  ② 인터넷·크롬을 타면 위 봐준다 에 까닭 */
const 오늘까지봐주는수 = 0;

console.log(`검사 파일 ${검사수}개 · npm test 가 부르는 것 ${검사수 - 안불림.length}개 · 안 부르는 것 ${안불림.length}개`);
if (안불림.length > 오늘까지봐주는수) {
  console.error(`\n⛔ 안 불리는 검사가 늘었다 (${오늘까지봐주는수} → ${안불림.length}).`);
  console.error('   새로 만든 검사를 npm test 에 물리십시오. 안 불리는 검사는 문장일 뿐입니다.');
  /* 🔴 [2026-09-02 · 5번] **열 개만 찍고 있었다.** 66개가 걸렸는데 열 줄만 보이니
     고치려는 사람이 나머지 56개를 알 수가 없었다 — 그래서 아무도 안 고쳤다.
     ⛔ 「너무 길다」는 이유로 잘라 놓으면 «고칠 수 없는 경고»가 된다. 다 찍는다. */
  for (const f of 안불림) console.error(`   · ${f}`);
  process.exit(1);
}
if (안불림.length) {
  console.log(`⚠ 아직 ${안불림.length}개가 안 불립니다 — 줄여 가는 중입니다(오늘 기준 ${오늘까지봐주는수}개).`);
}
