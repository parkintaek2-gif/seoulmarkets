/**
 * check-kcw-geo-fit.mjs — **지면 하나하나가 「맞춤형」인가.** 석 칸으로 잰다.
 *
 * ── 사장님 지시 (2026-09-04 23:1x, 원문) ────────────────────
 * > 「SEO·GEO 맞춤 — 라이브에서 잰 것 … **중요한 일이다. 모든 콘텐트가 맞춤형으로 잘
 * >   만들고, 이미 만들어진 건 하나하나 다 맞춤형으로 바꿔라.**」
 *
 * ⚠ **이 지시가 나온 자리를 적어 둔다.** 내가 23시 보고에 「llms.txt 200 · robots 200 ·
 *   sitemap 200」을 네 사이트 다 **초록으로** 올렸고, 사장님은 그것을 「됐다」로 읽지 않으셨다.
 * ⛔ **「문이 열렸다」와 「콘텐트가 맞춤이다」는 다른 말이다.** 앞의 것은 사이트에 넷,
 *   뒤의 것은 지면에 하나하나 있다. 그래서 이 자는 **지면 단위로** 잰다.
 *
 * ── 무엇을 재나 — 석 칸 ──────────────────────────────────────
 * ```
 * 1. 실명      제목에 «사람이 실제로 검색하는 이름»이 있나
 *              ⭐ 어제(9/3) 네 유닛이 이어 써서 정한 규칙이다
 *                 (docs/보고/검색노출-병목-2026-09-03.md 9-4절)
 *              ⛔ 짐작으로 안 가른다 — «우리 자료에 있는 이름»으로만 판정한다
 *                 (넷플릭스 작품명·사람 이름·그룹명·회사명 … 2,500개쯤)
 * 2. 구조화    JSON-LD 가 지면에 있나 (GEO — AI 가 읽는 자리)
 * 3. canonical 있나 (같은 지면이 둘로 색인되면 둘 다 약해진다)
 * ```
 *
 * ── 🔴 넉 칸이었다가 석 칸으로 줄인 까닭 (2026-09-04 23:3x) ──
 * 처음에 「llms.txt 에 이 주소가 적혀 있나」를 넷째 칸으로 넣었다. 돌리니 **0 / 2,798 (0%)**
 * 이 나왔다. 하마터면 그것을 사장님께 「llms 등재 0%」로 올릴 뻔했다.
 * ⛔ **발견이 아니라 내 자가 틀린 것이었다.**
 * ```
 * llms.txt 는 주소를 하나하나 적지 않는다 — 갈래로 적는다
 *   `https://www.kculturewire.com/title/{slug}` — … 421 pages.
 * 그래서 주소를 글자로 맞춰 찾으면 «언제나 0» 이다
 * ```
 * ⭐ 그리고 **이미 그것을 옳게 재는 자가 있었다** — `scripts/check-llms-coverage.mjs`.
 *   돌려 보니 **115편 중 115편 걸림 · 0편 빠짐**이다. 내 칸은 그 자를 잘못 베낀 것이었다.
 * ⛔ **모두에게 빨강을 내는 검사는 꺼진 검사다.** 그 칸을 지우고, 있는 자를 가리킨다.
 *   ⚠ 오늘 두 번째다 — 아침에 한국어 새는 검사가 2,795/2,796 을 빨강으로 냈다.
 *     **「거의 다 빨강」이 나오면 자료를 의심하기 전에 내 자를 의심한다.**
 *
 * ── ⛔ 이 자가 «안» 하는 것 ──────────────────────────────────
 * ⛔ 「아무도 답하지 않는 물음인가」는 **못 잰다.** 그것은 남의 검색결과를 봐야 아는 것이다.
 *   규칙의 절반만 재는 자다. 그것을 숨기지 않고 화면에 적는다.
 * ⛔ 실명이 없다고 「나쁜 지면」이라 하지 않는다. **고칠 자리를 알려 주는 것**까지다.
 * ⛔ 제목 실험 자물쇠가 걸린 지면은 «지금 고치면 두 변화가 섞인다». 목록에 자물쇠로 적는다.
 *
 * 쓰는 법  node scripts/check-kcw-geo-fit.mjs --자가시험
 *          node scripts/check-kcw-geo-fit.mjs             (dist 를 읽는다 — 빌드가 먼저다)
 *          node scripts/check-kcw-geo-fit.mjs --고칠것     고칠 지면만 순서대로
 *          node scripts/check-kcw-geo-fit.mjs --사이트=sm      SeoulMarkets (6번)
 *          node scripts/check-kcw-geo-fit.mjs --사이트=100y    백년지도 (3번)
 *          ⭐ 사이트 인자가 없으면 KCW 다. 세 사이트가 한 dist 안에 있다.
 */
import fs from 'node:fs';
import path from 'node:path';

const 뿌리 = path.resolve(import.meta.dirname, '..');

/* ── 이름 사전 — «우리 자료»에서만 모은다 ─────────────────── */

/**
 * 이름으로 쓸 만한가. 너무 짧거나 흔한 낱말은 뺀다 — 「Us」 같은 것이 걸린다.
 *
 * 🔴 [2026-09-04 23:4x] **처음엔 「넉 자 미만은 버린다」였다. 그래서 사전이 얇았다.**
 *   고칠 목록을 «읽어» 보니 `/firm/kbs`·`/firm/mbc`·`/firm/sbs`·`/firm/tvn`·`/firm/ena` 가
 *   「실명 없음」으로 올라와 있었다. **KBS 는 실명이다.** 세 글자라서 걸러진 것이다.
 *   ⛔ 지면이 틀린 것이 아니라 **내 사전이 얇아서 지면을 틀렸다고 한 것이다.**
 *   ⚠ 목록을 내고 끝냈으면 그 다섯 장을 «고칠 것»으로 남에게 시켰을 것이다.
 *     **자를 만들면 그 자의 결과를 눈으로 읽어야 한다.**
 * ✅ 그래서 세 글자도 받는다 — 단 **큰 글자가 하나라도 있을 때만.**
 *   KBS·MBC·SBS·ENA·tvN 이 다 걸리고, 소문자 낱말(the·and·for)은 그대로 버린다.
 *   ⚠ 처음엔 「큰 글자가 둘 이상」으로 썼는데 **tvN 이 빠졌다** — 큰 글자가 N 하나다.
 *     자가시험 이름표에는 「tvN 을 약칭으로 본다」고 적고 기대값은 false 로 두었으니,
 *     **이름표와 기대값이 서로 어긋난 시험**이었다. 초록이 나와도 뜻이 없는 시험이다.
 */
export function 이름쓸만한가(이름) {
  const s = String(이름 ?? '').trim();
  if (!/[A-Za-z가-힣]/.test(s)) return false;
  if (/^(the|and|for|with|from|that|this|korea|korean|netflix)$/i.test(s)) return false;
  /**
   * 🔴 [2026-09-05 00:3x] **달 이름·요일을 뺐다.** `/kpop-birthdays` 가 「실명 있음」으로
   *   통과했는데, 걸린 이름이 **「March」**였다. 넷플릭스 작품에 그 이름이 있고
   *   제목의 「March the fullest」가 달 이름으로 큰 글자를 쓰니 그대로 걸렸다.
   * ⛔ 달 이름은 큰 글자라서 대소문자 규칙으로도 안 걸러진다. 목록으로 뺀다.
   *   ⚠ 「우연히 통과」를 두 번 잡았다 — 처음은 「count/Count」, 이번은 달 이름이다.
   *     **통과한 것을 하나하나 눌러 보지 않으면 계속 나온다.**
   */
  if (/^(january|february|march|april|june|july|august|september|october|november|december|monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i.test(s)) return false;
  if (s.length >= 4) return true;
  /* 석 자는 약칭만 받는다 — 큰 글자가 하나라도 있으면 약칭으로 본다 */
  return s.length === 3 && /[A-Z]/.test(s);
}

/**
 * 자료 방 아래의 `.json` 을 «하위 폴더까지» 모은다.
 *
 * 🔴 [2026-09-05 01:1x] **3번이 찾아서 넘겨 주신 결함이다.** 원문 그대로 옮긴다 —
 *   「`이름사전만들기()` 가 `fs.readdirSync(자료방)` 로 `src/data` 를 훑는데,
 *   **한 단계만** 봅니다(하위 폴더 안 내려감). 그런데 제 자료는 전부
 *   `src/data/100yearmap/`(97개 파일) 안에 있습니다 — `pages-major.json` 도
 *   `title` 칸을 그대로 갖고 있어서(925개 학과 이름) 사전 조건에 이미 맞는데,
 *   폴더 한 단계 차이로 하나도 안 읽힙니다.」
 *
 * ⇒ 그래서 백년지도가 「실명 0 / 4,945」로 나왔다. **지면도 자료도 옳았다.**
 *   내 사전이 얇았던 «다섯 번째» 갈래다
 *   (석 자 약칭 · 도시 이름 · 글자 배열 · 숫자로 시작하는 이름 · 그리고 하위 폴더).
 *
 * ⭐ 그리고 3번이 **내 파일을 직접 고치지 않고 원인만 넘겨 주셨다.** 그것이 옳다 —
 *   내가 같은 파일을 계속 손보고 있었으니 겹치면 둘 다 헛수고였다.
 *   ⛔ 나는 오늘 남의 파일을 두 번 쓸어 담았다. 배울 자리다.
 *
 * ⚠ 깊이는 두 단계까지만 본다. 더 깊이 가면 `node_modules` 같은 데까지 훑을 위험이 있고,
 *   우리 자료는 지금 한 단계 아래에 다 있다. **못 본 깊이가 있음을 적어 둔다.**
 */
export function 자료파일들(방, 깊이 = 2) {
  const 낸것 = [];
  if (깊이 <= 0 || !fs.existsSync(방)) return 낸것;
  let 것들 = [];
  try { 것들 = fs.readdirSync(방, { withFileTypes: true }); } catch { return 낸것; }
  for (const e of 것들) {
    const 길 = path.join(방, e.name);
    if (e.isDirectory()) 낸것.push(...자료파일들(길, 깊이 - 1));
    else if (e.name.endsWith('.json')) 낸것.push(길);
  }
  return 낸것;
}

/** 자료 파일들에서 이름을 긁어 모은다. 어느 파일에서 몇 개 왔는지 같이 돌려준다 */
export function 이름사전만들기(자료방 = path.join(뿌리, 'src/data')) {
  const 이름 = new Set();
  const 온데 = [];
  if (!fs.existsSync(자료방)) return { 이름들: [], 온데 };
  for (const 길 of 자료파일들(자료방)) {
    let j;
    try { j = JSON.parse(fs.readFileSync(길, 'utf8')); } catch { continue; }
    const 배열들 = Array.isArray(j) ? [j] : Object.values(j).filter(Array.isArray);
    let 여기 = 0;
    for (const 배열 of 배열들) {
      for (const 것 of 배열) {
        if (!것 || typeof 것 !== 'object') continue;
        /* ⭐ `place` 를 더했다 — `/from/ansan` 같은 지면이 「실명 없음」으로 잡히고 있었다.
           도시 이름은 사람이 실제로 검색하는 이름이다(wikitip-hometowns.json 에 37곳). */
        /**
         * 🔴 [2026-09-05 19:3x] **3번이 잡아 주셨다 — 「학과」 칸을 안 읽고 있었다.**
         *   `/100y/college-major/*` 837장이 전부 「빈 칸: 실명」으로 올라왔는데,
         *   그 제목에는 「가정교육과 취업률·진학률」처럼 **진짜 학과 이름이 이미 있었다.**
         *   까닭은 `major-outcomes.json` 이 이름을 `학과` 칸에 담기 때문이다 —
         *     { "학과": "간호학과", … }
         *   ⛔ **내 자가 837장을 고치라고 시키고 있었다.** 고치면 이미 맞는 제목을 건드리는 것이다.
         *   ⚠ 이 자가 시키는 일이 클수록 먼저 «자가 맞는지»부터 본다. 1,142장 가운데 837장이
         *     거짓이었으니, 그 목록을 그대로 믿고 일을 시작했으면 하루가 통째로 헛일이 된다.
         */
        for (const 칸 of ['name', 'title', 'enTitle', '회사', 'firm', 'person', 'place', '학과']) {
          const v = 것[칸];
          if (typeof v === 'string' && 이름쓸만한가(v)) { 이름.add(v.trim()); 여기 += 1; }
        }
        /**
         * 🔴 [2026-09-05 00:3x] **이름이 «글자 배열»로 들어 있는 자료를 못 읽고 있었다.**
         *   /born-year/ 아래 36장이 「실명 없음」으로 올라왔는데, 그 제목에는
         *   「Oh Hyeon-kyeong」·「Byun Hee-bong」 같은 이름이 «이미» 들어 있었다.
         *   자료가 이렇게 생겼다 —
         *     { "year": "1936", "people": 11, "top": ["Oh Hyeon-kyeong", "Johnny Yune"] }
         *   내 사전은 «객체의 칸»만 읽고 있었다. 글자 배열은 안 읽었다.
         * ⛔ 지면이 틀린 것이 아니라 **또 내 사전이 얇았다.** 세 번째다
         *   (석 자 약칭 · 도시 이름 · 그리고 이것).
         * ⚠ 그러니 「실명 없음 목록」을 그대로 남에게 시키지 않는다 —
         *   **목록을 읽고, 몇 장을 눌러 보고 나서** 시킨다.
         * ⛔ 아무 글자 배열이나 긁지 않는다. 이름이 들어가는 칸 이름만 본다.
         */
        for (const 칸 of ['top', 'names', 'people', 'members', 'titles']) {
          const v2 = 것[칸];
          if (!Array.isArray(v2)) continue;             // people 은 «수»일 때가 있다
          for (const x of v2) {
            if (typeof x === 'string' && 이름쓸만한가(x)) { 이름.add(x.trim()); 여기 += 1; }
          }
        }
      }
    }
    if (여기) 온데.push({ 파일: path.basename(길), 개수: 여기 });
  }
  return { 이름들: [...이름], 온데 };
}

/**
 * 세 사이트가 «한 dist» 안에 있다. 서버가 손님이 온 호스트를 보고 경로 접두를 갈아 끼운다.
 *
 * ⭐ [2026-09-05 00:2x] 6번이 「이 자를 SeoulMarkets 용으로 다시 만들겠다」고 메모에 남겼다.
 *   ⛔ 같은 자를 셋이 따로 만들면 셋이 따로 틀린다. 내가 오늘 이 자에서 잡은 결함이
 *     여섯 개인데, 그 여섯을 3번·6번이 각자 다시 겪게 된다.
 *   ✅ 그래서 자를 «사이트 인자»로 넓혔다. 6번은 만들지 않고 골라 쓰면 된다.
 *
 * ⚠ 이름 사전은 지금 «우리 자료 전부»에서 모은다 — K팝 작품·사람 이름이 대부분이다.
 *   그래서 SeoulMarkets·백년지도의 실명(종목명·학교명)은 «덜 잡힌다».
 *   ⛔ 그 수를 「그 사이트가 못했다」로 읽지 않는다. 사전이 얇은 것이다.
 *   ⭐ 오늘 이 사전이 얇아서 세 번 틀렸다(석 자 약칭·도시 이름·글자 배열). 네 번째가 이것이다.
 */
export const 사이트들 = {
  kcw: { 방: 'dist/wikitip', 이름: 'K Culture Wire', 꼬리: /\s*\|\s*K Culture Wire\s*$/i },
  '100y': { 방: 'dist/100y', 이름: '백년지도', 꼬리: /\s*[|·—-]\s*백년지도\s*$/ },
  sm: { 방: 'dist', 이름: 'SeoulMarkets', 꼬리: /\s*\|\s*SeoulMarkets\s*$/i, 뺄방: ['wikitip', '100y'] },
};
/** 정규식에 쓸 수 있게 특수문자를 막는다 */
export function 정규식막기(s) {
  return String(s ?? '').replace(/[.*+?^${}()|[\]\\]/g, (c) => '\\' + c);
}

/**
 * 제목에 사전의 이름이 들어 있나. 들어 있으면 «가장 긴 것»을 돌려준다.
 * ⛔ 낱말 경계를 본다 — 「Us」가 「Just」 안에서 걸리는 것을 막는다.
 *   ⚠ 우리말은 낱말 경계가 없어 이 규칙이 안 듣는다. 우리말 이름은 그대로 포함으로 본다.
 *
 * ── 🔴 [2026-09-05 00:2x] **대소문자를 안 가려서 «우연히» 통과했다** ────
 * 내가 방금 고친 두 지면을 다시 재 보니 이렇게 나왔다.
 * ```
 * /label-reach     실명: "Count"   ← 「SM」이 아니다
 * /cap-per-artist  실명: "Count"   ← 「HYBE」가 아니다
 *   제목: 「SM, YG, JYP, Hybe: how many artists we can actually count」
 *                                                              ^^^^^ 이것이 걸렸다
 * ```
 * 넷플릭스 작품에 「Count」라는 이름이 있고, 내가 대소문자를 안 가리게 짰다.
 * ⇒ **평범한 낱말이 작품 이름과 같으면 아무 제목이나 통과한다.**
 *   Count · Exit · Reach · Climb · Opening … 우리 지면 이름과 겹치는 것이 수두룩하다.
 * ⛔ **그러니 「88.2%」는 부풀려진 수였다.** 통과한 것 중 얼마가 우연인지 몰랐다.
 * ✅ 그래서 **제목에 적힌 쪽이 큰 글자로 시작하는지**를 본다.
 *   「count」는 떨어지고 「Count」는 걸린다.
 *
 * ── ⚠ 처음엔 아예 «대소문자를 가려» 맞췄는데, 그건 너무 좁았다 ────
 * 그렇게 하니 **`/cap-per-artist` 의 「HYBE」가 떨어졌다** — 우리 자료가 그 회사를
 * 「Hybe」로 적기 때문이다. **지면은 옳고 사전 표기가 다른 것**인데 지면을 틀렸다고 했다.
 * ⇒ 그래서 «찾기»는 대소문자를 안 가리고, «판정»은 제목 쪽 첫 글자로 한다.
 *   HYBE ↔ Hybe 는 걸리고, count ↔ Count 는 안 걸린다.
 */
export function 제목의실명(제목, 이름들) {
  const t = String(제목 ?? '');
  if (!t) return null;
  let 찾은 = null;
  for (const n of 이름들) {
    const 우리말 = /[가-힣]/.test(n);
    let 걸린것 = null;
    if (우리말) {
      if (t.includes(n)) 걸린것 = n;
    } else {
      const m = t.match(new RegExp('(^|[^A-Za-z0-9])(' + 정규식막기(n) + ')([^A-Za-z0-9]|$)', 'i'));
      /* ⭐ 제목에 적힌 쪽이 큰 글자로 시작해야 이름으로 본다 */
      /**
       * 🔴 [2026-09-05 00:4x] 처음엔 «큰 글자로 시작»만 봤다. 그래서
       *   「20th Century Girl」이 떨어졌다 — 숫자로 시작하는 작품 이름이다.
       *   /week 아래 석 장이 그 때문에 「실명 없음」으로 남아 있었다.
       *   ⛔ 지면은 옳고 내 판정이 좁았다. 오늘 이 갈래로 네 번째다.
       * ✅ 이름 «자체»가 글자로 시작할 때만 큰 글자를 따진다.
       *   숫자나 다른 글자로 시작하는 이름은 그 규칙을 걸지 않는다.
       */
      const 첫글자가로마자 = /^[A-Za-z]/.test(n);
      if (m && (!첫글자가로마자 || /^[A-Z]/.test(m[2]))) 걸린것 = n;
    }
    if (걸린것 && (!찾은 || 걸린것.length > 찾은.length)) 찾은 = 걸린것;
  }
  return 찾은;
}

/**
 * 손님이 받는 지면인가. 셋은 손님 지면이 아니다 — 세되 고칠 목록에 넣지 않는다.
 * 🔴 처음엔 이 가름이 없어서 은퇴 주소 14장과 /404 가 「고칠 것」 맨 위에 올라왔다.
 *   ⛔ 고칠 «수 없는» 것을 목록 맨 위에 두면, 그 아래 «고칠 수 있는» 것을 아무도 안 본다.
 */
export function 손님지면인가(글) {
  const h = String(글 ?? '');
  if (/<meta[^>]+name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(h)) return false;
  if (/<title[^>]*>\s*Retired address/i.test(h)) return false;   // 옛 주소 — 일부러 비워 둔 것
  if (/<title[^>]*>\s*Page not found/i.test(h)) return false;    // 404
  return true;
}

/** 지면 하나를 석 칸으로 잰다. 글은 «나간 HTML» 이다 */
export function 지면재기({ 주소, 글, 이름들, 꼬리 = null }) {
  const h = String(글 ?? '');
  const 제목 = (h.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '')
    .replace(꼬리 ?? /\s*\|\s*K Culture Wire\s*$/i, '').trim();
  return {
    주소,
    제목,
    실명: 제목의실명(제목, 이름들),
    구조화: /<script[^>]+type=["']application\/ld\+json["']/i.test(h),
    canonical: /<link[^>]+rel=["']canonical["']/i.test(h),
  };
}

/**
 * 🔴 **이 사이트에서 이 자가 «꺼져 있나».** 재기 전에 이것을 먼저 본다.
 *
 * [2026-09-05 00:3x] 자를 세 사이트로 넓히고 돌리니 백년지도가 **0 / 4,945 (0%)** 였다.
 * ⛔ 그것은 발견이 아니다. 내 이름 사전은 K팝 작품·사람 이름으로 채워져 있고,
 *   백년지도 지면의 실명은 «우리말 학교·학과 이름»이다. 사전에 한 개도 없다.
 * ⇒ **사전이 그 사이트를 모르면, 그 사이트는 언제나 0% 다.**
 *   그 0% 를 3번께 「맞춤형이 0장입니다」로 드렸다면 없는 결함을 시킨 것이 된다.
 *
 * ⚠ 오늘 같은 꼴을 세 번 겪었다 — llms 0/2,798 · 한국어 2,795/2,796 · 그리고 이것.
 *   셋 다 「거의 다 한쪽」이었다. 그래서 «수를 내기 전에» 자가 스스로 묻게 만든다.
 *
 * ⛔ 문턱을 넉넉히 잡지 않는다. 5% 미만이면 「못 쟀다」로 본다 —
 *   진짜로 5% 미만인 사이트가 있을 수 있지만, 그때도 «사전을 확인한 뒤» 말하는 것이 옳다.
 */
export function 사전이이사이트를아나(잰것들, 문턱몫 = 0.05) {
  const 전체 = 잰것들.length;
  if (!전체) return { 안다: false, 까닭: '지면이 0장이다' };
  const 걸린것 = 잰것들.filter((x) => x.실명).length;
  if (걸린것 / 전체 >= 문턱몫) return { 안다: true, 걸린것, 전체 };
  return {
    안다: false,
    걸린것,
    전체,
    까닭: `${전체}장 중 ${걸린것}장만 걸렸다 — 이름 사전이 이 사이트의 실명을 모르는 것으로 본다`,
  };
}
/** 석 칸 중 몇 칸이 찼나. 실명은 두 몫으로 센다 — 규칙이 그것을 먼저 말한다 */
export function 점수(잰것) {
  return (잰것.실명 ? 2 : 0) + (잰것.구조화 ? 1 : 0) + (잰것.canonical ? 1 : 0);
}
export const 만점 = 4;

/* ── 자가시험 ────────────────────────────────────────────── */
function 자가시험() {
  let 든것 = 0, 깬것 = 0;
  const 재 = (무엇, 실제, 바람) => {
    const a = JSON.stringify(실제), b = JSON.stringify(바람);
    if (a === b) { 든것 += 1; } else { 깬것 += 1; console.log(`🔴 ${무엇}\n   나온것 ${a}\n   바람   ${b}`); }
  };

  재('두 글자 이름은 안 쓴다', 이름쓸만한가('IU'), false);
  /* 🔴 사전이 얇아서 /firm/kbs 를 「실명 없음」으로 잡던 자리 */
  재('🔴 KBS 는 석 자여도 실명이다', 이름쓸만한가('KBS'), true);
  재('MBC·SBS·ENA 도 같다', [이름쓸만한가('MBC'), 이름쓸만한가('SBS'), 이름쓸만한가('ENA')], [true, true, true]);
  재('🔴 tvN 도 실명이다 — 큰 글자가 N 하나뿐이라 처음 규칙에서 빠졌다',
    이름쓸만한가('tvN'), true);
  재('석 자 소문자 낱말은 그대로 버린다',
    [이름쓸만한가('the'), 이름쓸만한가('and'), 이름쓸만한가('for')], [false, false, false]);
  재('도시 이름', 이름쓸만한가('Ansan'), true);

  /* 🔴 이름이 «글자 배열»로 든 자료를 못 읽어 /born-year 아래 36장을 틀렸다고 하던 자리 */
  {
    const 방 = fs.mkdtempSync(path.join(process.env.TEMP ?? '.', 'geofit-'));
    fs.writeFileSync(path.join(방, 'a.json'), JSON.stringify({
      pages: [{ year: '1936', people: 11, top: ['Oh Hyeon-kyeong', 'Johnny Yune'] }],
    }));
    const 하나 = 이름사전만들기(방).이름들.sort();
    재('글자 배열 안의 이름을 읽는다', 하나, ['Johnny Yune', 'Oh Hyeon-kyeong']);
    fs.writeFileSync(path.join(방, 'b.json'), JSON.stringify({
      pages: [{ people: 11, top: ['ok', 'Byun Hee-bong'] }],
    }));
    const 둘 = 이름사전만들기(방).이름들;
    재('짧은 글자는 그래도 버린다', 둘.includes('ok'), false);
    재('긴 이름은 받는다', 둘.includes('Byun Hee-bong'), true);
    재('people 이 «수»일 때 터지지 않는다', 둘.length > 0, true);
    fs.rmSync(방, { recursive: true, force: true });
  }
  재('네 글자부터 쓴다', 이름쓸만한가('HYBE'), true);
  재('흔한 낱말은 뺀다', 이름쓸만한가('Korea'), false);
  재('Netflix 도 뺀다 — 어디에나 있다', 이름쓸만한가('Netflix'), false);
  재('빈 값', 이름쓸만한가(null), false);
  재('우리말 이름', 이름쓸만한가('국립강릉원주대학교'), true);

  const 사전 = ['HYBE', 'Crash Landing on You', 'Go Youn-jung', 'Just', '국립강릉원주대학교'];
  재('제목에 든 이름을 찾는다', 제목의실명('HYBE alone is two-thirds', 사전), 'HYBE');
  재('가장 긴 이름을 고른다',
    제목의실명('Crash Landing on You: 72 weeks in Japan', 사전), 'Crash Landing on You');
  재('없으면 null', 제목의실명('K-pop market value per artist we can count', 사전), null);
  재('낱말 안에 박힌 것은 안 센다 — 「Just」가 「Justice」에서 걸리면 안 된다',
    제목의실명('Justice for all', 사전), null);
  재('낱말이면 센다', 제목의실명('Just one reader', 사전), 'Just');
  재('붙임표가 있어도 센다', 제목의실명('Go Youn-jung tops two Wikipedias', 사전), 'Go Youn-jung');
  재('우리말은 그대로 포함으로 본다',
    제목의실명('국립강릉원주대학교 취업률', 사전), '국립강릉원주대학교');
  /* 🔴 「count」가 작품 이름 「Count」로 통과하던 자리 */
  재('🔴 대소문자를 가린다 — 평범한 낱말이 작품 이름으로 통과하면 안 된다',
    제목의실명('how many artists we can actually count', ['Count']), null);
  재('제 꼴로 적히면 걸린다', 제목의실명('The Count returns', ['Count']), 'Count');
  재('소문자로 적힌 이름은 «없다»로 본다', 제목의실명('hybe alone', 사전), null);
  /* 🔴 숫자로 시작하는 작품 이름이 떨어지던 자리 */
  재('🔴 숫자로 시작하는 이름도 걸린다',
    제목의실명('20th Century Girl — Korea on Netflix', ['20th Century Girl']),
    '20th Century Girl');
  재('그래도 평범한 낱말은 안 걸린다',
    제목의실명('how many artists we can actually count', ['Count']), null);
  /* 🔴 우리 자료는 Hybe, 지면은 HYBE — 지면이 옳은데 사전 표기가 달라 떨어지던 자리 */
  재('🔴 HYBE 는 자료가 Hybe 여도 걸린다 — 둘 다 큰 글자로 시작한다',
    제목의실명('HYBE alone is two-thirds', ['Hybe']), 'Hybe');
  재('달 이름은 사전에 안 들어간다 — March 로 우연히 통과하던 자리',
    [이름쓸만한가('March'), 이름쓸만한가('July'), 이름쓸만한가('Monday')], [false, false, false]);
  재('달 이름과 겹치지 않는 이름은 그대로 쓴다', 이름쓸만한가('Marchlands'), true);
  재('빈 제목', 제목의실명('', 사전), null);

  const 글 = '<title>HYBE alone is two-thirds | K Culture Wire</title>'
    + '<link rel="canonical" href="/x"><script type="application/ld+json">{}</script>';
  재('석 칸을 다 찾는다',
    지면재기({ 주소: '/a', 글, 이름들: 사전 }),
    { 주소: '/a', 제목: 'HYBE alone is two-thirds', 실명: 'HYBE', 구조화: true, canonical: true });
  재('꼬리 사이트이름을 뗀다',
    지면재기({ 주소: '/a', 글: '<title>x | K Culture Wire</title>', 이름들: [] }).제목, 'x');
  재('없으면 다 false',
    지면재기({ 주소: '/b', 글: '<title>nothing</title>', 이름들: 사전 }),
    { 주소: '/b', 제목: 'nothing', 실명: null, 구조화: false, canonical: false });

  재('만점', 점수({ 실명: 'x', 구조화: true, canonical: true }), 4);
  재('실명은 두 몫이다', 점수({ 실명: 'x', 구조화: false, canonical: false }), 2);
  재('실명 없이 둘을 다 채워도 2 다', 점수({ 실명: null, 구조화: true, canonical: true }), 2);
  재('아무것도 없으면 0', 점수({ 실명: null, 구조화: false, canonical: false }), 0);

  /* 🔴 손님 지면 가름 — 은퇴 주소와 404 가 「고칠 것」 맨 위에 올라왔던 자리다 */
  재('보통 지면은 손님 지면이다', 손님지면인가('<title>HYBE alone</title>'), true);
  재('noindex 는 손님 지면이 아니다',
    손님지면인가('<meta name="robots" content="noindex,nofollow"><title>x</title>'), false);
  재('은퇴 주소는 손님 지면이 아니다',
    손님지면인가('<title>Retired address — K Culture Wire</title>'), false);
  재('404 는 손님 지면이 아니다', 손님지면인가('<title>Page not found</title>'), false);
  재('제목 안에 Retired 가 들어간 «진짜» 기사는 막지 않는다 — 머리에 와야 걸린다',
    손님지면인가('<title>Retired idols: who kept being read</title>'), true);

  /* 🔴 자물쇠 — 「31갈래 묶음」에서 첫 갈래만 읽던 자리 */
  const 묶음 = new Map();
  for (const m of '/title · /firm · /actors-in-their · /school  (한 쓸이로 묶은 31갈래)'
    .matchAll(/\/[A-Za-z0-9-]+(?:\/\*|\/[A-Za-z0-9-]+)?/g)) 묶음.set(m[0], '2026-09-25');
  재('묶음에서 길을 다 뽑는다', [...묶음.keys()], ['/title', '/firm', '/actors-in-their', '/school']);
  재('묶음의 «둘째» 길도 자물쇠에 걸린다 — 이것이 새던 자리다',
    자물쇠걸렸나('/firm', 묶음), '2026-09-25');
  재('그 아래 지면까지 막는다', 자물쇠걸렸나('/firm/kbs', 묶음), '2026-09-25');
  재('별표 꼴도 아래까지 막는다',
    자물쇠걸렸나('/person/iu', new Map([['/person/*', '2026-10-02']])), '2026-10-02');
  재('안 걸린 지면은 null', 자물쇠걸렸나('/label-reach', 묶음), null);
  재('비슷한 이름에 안 속는다 — /titles 는 /title 이 아니다',
    자물쇠걸렸나('/titles', 묶음), null);

  /* ⭐ 사이트 표 — 6번이 같은 자를 다시 만들지 않게 넓힌 자리 */
  재('세 사이트가 다 있다', Object.keys(사이트들).sort(), ['100y', 'kcw', 'sm']);
  재('SeoulMarkets 는 뿌리라서 남의 방을 뺀다', 사이트들.sm.뺄방.sort(), ['100y', 'wikitip']);
  /* 🔴 dist/100y.html 은 «파일»이라 폴더만 빼던 규칙을 비켜 갔다 */
  재('뺄 이름은 .html 을 뗀 것과도 맞는다',
    ['100y.html', 'wikitip.html'].map((f) => 사이트들.sm.뺄방.includes(f.replace(/.html$/, ''))),
    [true, true]);
  재('KCW·백년지도는 뺄 방이 없다',
    [사이트들.kcw.뺄방 ?? null, 사이트들['100y'].뺄방 ?? null], [null, null]);
  재('사이트마다 제목 꼬리를 다르게 뗀다',
    지면재기({ 주소: '/a', 글: '<title>Samsung | SeoulMarkets</title>', 이름들: [],
      꼬리: 사이트들.sm.꼬리 }).제목, 'Samsung');
  재('꼬리를 안 주면 KCW 꼴로 뗀다',
    지면재기({ 주소: '/a', 글: '<title>Squid Game | K Culture Wire</title>', 이름들: [] }).제목,
    'Squid Game');

  /* 🔴 백년지도가 0/4,945 로 나온 것을 «발견»으로 낼 뻔한 자리 */
  재('실명이 하나도 안 걸리면 못 쟀다로 본다',
    사전이이사이트를아나([{ 실명: null }, { 실명: null }]).안다, false);
  재('문턱을 넘으면 안다', 사전이이사이트를아나(
    [{ 실명: 'a' }, { 실명: null }, { 실명: null }, { 실명: null }]).안다, true);
  재('문턱 바로 아래는 못 쟀다',
    사전이이사이트를아나(Array.from({ length: 100 },
      (_, i) => ({ 실명: i < 4 ? 'a' : null }))).안다, false);
  재('지면이 0장이면 못 쟀다', 사전이이사이트를아나([]).안다, false);
  재('까닭을 글로 돌려준다',
    typeof 사전이이사이트를아나([{ 실명: null }]).까닭, 'string');

  console.log(`\n자가시험 ${든것}가지 통과${깬것 ? ` · 🔴 ${깬것}가지 깨짐` : ''}`);
  return 깬것 === 0;
}

/* ── 본 일 ──────────────────────────────────────────────── */

/** 제목 실험 자물쇠가 걸린 지면 — 지금 건드리면 두 변화가 섞인다 */
function 자물쇠걸린지면들() {
  const p = path.join(뿌리, 'src/data/kcw-title-experiments.json');
  if (!fs.existsSync(p)) return new Map();
  let j;
  try { j = JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return new Map(); }
  const 걸림 = new Map();
  const 오늘 = new Date();
  for (const x of (j.실험 ?? [])) {
    const 다시 = x.다시잴날 ? new Date(x.다시잴날) : null;
    if (!다시 || 다시 <= 오늘) continue;
    /**
     * 🔴 [2026-09-04 23:5x] 처음엔 `지면` 칸의 «첫 낱말»만 읽었다. 그래서
     *   「/title · /firm · /actors-in-their · … (한 쓸이로 묶은 31갈래)」 항목에서
     *   **첫 갈래 하나만 자물쇠로 잡히고 나머지 서른이 풀린 것으로 보였다.**
     *   ⚠ 이 주석을 쓰다 하나 더 겪었다 — 갈래 이름 앞에 굵게 표시를 붙이니 별표둘과
     *     빗금이 이어져 **주석이 그 자리에서 닫혔다.** 아래 코드가 주석 밖으로 튀어나와
     *     파일이 깨졌다. 갈래 이름은 굵게 표시 없이 적는다.
     *   ⛔ 그 목록을 그대로 「고칠 것」으로 삼았으면 «실험 중인 지면 서른 장»을 건드려
     *     A/B 를 통째로 망칠 뻔했다. 자물쇠는 나를 막으려고 있는 것이다.
     * ✅ 한 항목에 적힌 «모든» 길을 뽑는다. `/x/*` 는 그 아래 전부를 뜻한다.
     */
    for (const m of String(x.지면 ?? '').matchAll(/\/[A-Za-z0-9-]+(?:\/\*|\/[A-Za-z0-9-]+)?/g)) {
      걸림.set(m[0], x.다시잴날);
    }
  }
  return 걸림;
}

/** 이 주소가 자물쇠에 걸리나. `/x/*` 와 `/x` 는 그 아래 지면까지 막는다 */
export function 자물쇠걸렸나(주소, 걸림) {
  const a = String(주소 ?? '');
  for (const [길, 날] of 걸림) {
    const 뿌리길 = 길.replace(/\/\*$/, '');
    if (a === 뿌리길 || a.startsWith(뿌리길 + '/')) return 날;
  }
  return null;
}

/**
 * 그 사이트의 나간 지면을 훑는다.
 * ⚠ SeoulMarkets 는 dist 뿌리라서 «다른 두 사이트가 그 안에 들어 있다».
 *   그래서 뺄 방을 받는다 — 안 빼면 6번 수에 5번 지면 2,780장이 섞인다.
 */
function 나간지면들(사이트 = 사이트들.kcw) {
  const 방 = path.join(뿌리, 사이트.방);
  const 뺄 = new Set(사이트.뺄방 ?? []);
  const 낸것 = [];
  const 훑 = (d, 앞) => {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      /* ⛔ 남의 사이트 방은 안 들어간다 — 뿌리에서 훑을 때만 걸린다 */
      if (앞 === '' && 뺄.has(e.name)) continue;
      /**
       * 🔴 [2026-09-05 00:4x] 처음엔 «폴더»만 뺐다. 그런데 dist/100y.html 과
       *   dist/wikitip.html 은 «파일»이라 그대로 들어왔다.
       *   ⇒ SeoulMarkets 고칠 목록 맨 위에 「대학 다음까지 보는 진로 지도 — 백년지도」가
       *     올라와 있었다. **6번 수에 3번 지면이 섞인 것이다.**
       *   ⛔ 남의 지면을 남의 목록에 넣으면, 그 유닛이 남의 일을 하게 된다.
       */
      if (앞 === '' && !e.isDirectory() && 뺄.has(e.name.replace(/.html$/, ''))) continue;
      if (e.isDirectory()) 훑(p, 앞 + '/' + e.name);
      else if (e.name === 'index.html') 낸것.push({ 주소: 앞 || '/', 길: p });
      else if (e.name.endsWith('.html')) 낸것.push({ 주소: 앞 + '/' + e.name.replace(/\.html$/, ''), 길: p });
    }
  };
  훑(방, '');
  return 낸것;
}

function 본일(고칠것만, 사이트키 = 'kcw') {
  const { 이름들, 온데 } = 이름사전만들기();
  const 자물쇠 = 자물쇠걸린지면들();
  const 사이트 = 사이트들[사이트키];
  if (!사이트) {
    console.log(`🔴 그런 사이트가 없다: ${사이트키} — 있는 것: ${Object.keys(사이트들).join(', ')}`);
    return false;
  }
  const 지면들 = 나간지면들(사이트);

  console.log(`# ${사이트.이름} — 지면이 하나하나 「맞춤형」인가. 석 칸으로 잰 것\n`);
  console.log(`이름 사전 ${이름들.length}개 · 우리 자료 ${온데.length}개 파일에서 모았다`);
  console.log(`   가장 많이 준 파일: ${온데.sort((a, b) => b.개수 - a.개수).slice(0, 3).map((x) => `${x.파일}(${x.개수})`).join(' · ')}`);
  console.log(`제목 실험 자물쇠 ${자물쇠.size}장`);
  console.log('⭐ llms.txt 등재는 이 자가 안 잰다 — `scripts/check-llms-coverage.mjs` 가 갈래로 옳게 잰다');

  if (!지면들.length) {
    console.log(`\n⬜ **${사이트.방} 이 없다 — 못 쟀다.** \`npm run build\` 를 먼저 돌린다.`);
    return true;                                   // 못 쟀다로 세운다. 「깨끗하다」로 안 읽는다
  }

  /**
   * 🔴 [2026-09-04 23:5x] **같은 자를 20분 만에 두 번 돌렸더니 지면 수가 2,080 → 2,780
   *   으로 달라졌다.** 나는 그 사이 사전만 넓혔고 빌드를 돌리지 않았다.
   *   ⇒ **여섯 유닛이 같은 작업트리를 쓴다.** 옆 유닛이 배포하면서 `dist` 를 다시 쓰는
   *     중이었고, 내 첫 번째 셈은 «반쯤 쓰인 dist» 를 센 것이다.
   * ⛔ 그러니 이 자의 수를 «절대값»으로 읽지 않는다. 잰 시각과 지면 수를 같이 적는다.
   *   ⚠ 몫(%)은 그래도 읽을 만하다 — 반쯤 쓰인 dist 도 한쪽으로 치우쳐 쓰이지는 않는다.
   *     그래도 「84% → 88.2%」를 «고쳐서 올랐다»로 읽으면 틀린다. 사전을 넓힌 것이다.
   */
  /**
   * 🔴 [2026-09-05 00:4x] **여섯 유닛이 같은 트리에서 «동시에» 빌드한다.**
   *   내가 빌드를 마치고 재려는 사이에 옆 유닛 빌드가 dist 를 지우고 다시 쓴다.
   *   오늘 실측으로 겪은 것 — 2,798장 → 743장 → **dist/wikitip 이 아예 없어짐**.
   *   ⛔ 그런 dist 로 낸 수를 보고에 넣으면 없는 결함을 만든다(53.7% 를 한 번 냈다).
   *   ⭐ 라이브에는 위험이 없다 — Cloudtype 이 저장소를 clone 해서 «서버에서» 빌드한다.
   *
   * ── ⚠ 처음 짠 안전장치가 두 번 틀렸다. 적어 둔다 ────────
   *   1판: 사이트맵 장수와 견줬다 → 사이트맵이 «없을 때» 그냥 지나갔다.
   *        빠져나갈 구멍을 둔 안전장치는 안전장치가 아니다.
   *   2판: 사이트맵이 없으면 멈추게 했다 → 그런데 `dist/wikitip/sitemap.xml` 은
   *        **다 된 빌드에도 없다.** 그러니 늘 멈춘다.
   *        ⛔ 모두를 멈추는 검사는 꺼진 검사와 같다. 오늘 세 번째로 같은 함정이다.
   *   3판(이것): **전에 본 가장 큰 장수**를 파일에 적어 두고 그것과 견준다.
   *        표식을 «짐작»하지 않고 «내가 잰 것»을 쓴다.
   */
  const 바닥길 = path.join(뿌리, 'src/data/kcw-geo-fit-baseline.json');
  let 바닥 = {};
  try { 바닥 = JSON.parse(fs.readFileSync(바닥길, 'utf8')); } catch { 바닥 = {}; }
  const 전에본최대 = Number(바닥[사이트키]?.가장많이본장수) || 0;
  if (전에본최대 > 50 && 지면들.length < 전에본최대 * 0.5) {
    console.log('\n🔴 **dist 가 반쯤 쓰인 것으로 본다 — 멈춘다.**');
    console.log(`   전에 이 사이트에서 ${전에본최대}장을 봤는데 지금은 ${지면들.length}장뿐이다.`);
    console.log('   ⇒ 옆 유닛이 지금 빌드 중일 수 있다. npm run build 뒤에 다시 재십시오.');
    console.log('   ⛔ 이 상태로 낸 수를 보고에 넣지 않는다 — 없는 결함을 만든다.');
    return true;
  }
  if (지면들.length > 전에본최대) {
    바닥[사이트키] = { 가장많이본장수: 지면들.length, 본때: new Date().toLocaleString('ko-KR') };
    fs.writeFileSync(바닥길, JSON.stringify(바닥, null, 1) + '\n');
  }
  console.log(`\n⚠ 잰 시각 ${new Date().toLocaleString('ko-KR')} · dist 의 지면 ${지면들.length}장`);
  console.log('   여섯 유닛이 같은 작업트리를 쓴다 — 옆 유닛이 배포 중이면 이 수가 흔들린다.');

  /**
   * 🔴 [2026-09-05 00:4x] 목록을 만든 «뒤»에 옆 유닛 빌드가 그 파일을 지웠다 —
   *   dist/wikitip/person/yeom-hye-ran.html 을 읽다 자가 터졌다.
   *   ⛔ 자가 터지면 수가 «하나도» 안 나온다. 못 읽은 것은 세고, 나머지는 잰다.
   */
  let 못읽은 = 0;
  const 다 = [];
  for (const { 주소, 길 } of 지면들) {
    try { 다.push({ 주소, 글: fs.readFileSync(길, 'utf8') }); }
    catch { 못읽은 += 1; }
  }
  if (못읽은) {
    console.log(`   ⚠ 재는 사이에 사라진 지면 ${못읽은}장 — 옆 유닛이 빌드 중이다. 안 센다.`);
  }
  const 손님것 = 다.filter((x) => 손님지면인가(x.글));
  const 안본것 = 다.length - 손님것.length;
  const 잰것들 = 손님것.map(({ 주소, 글 }) => 지면재기({ 주소, 글, 이름들, 꼬리: 사이트.꼬리 }));

  const 셈 = { 실명: 0, 구조화: 0, canonical: 0 };
  for (const x of 잰것들) for (const k of Object.keys(셈)) if (x[k]) 셈[k] += 1;
  const 전체 = 잰것들.length;
  const 몫 = (n) => `${n} / ${전체} (${Math.round((n / 전체) * 1000) / 10}%)`;

  console.log(`\n## 손님이 받는 지면 ${전체}장을 재니\n`);
  const 앎 = 사전이이사이트를아나(잰것들);
  if (앎.안다) {
    console.log(`  제목에 실명   ${몫(셈.실명)}   ← 어제 정한 규칙의 첫 칸`);
  } else {
    console.log(`  제목에 실명   ⬜ **못 쟀다** — ${앎.까닭}`);
    console.log('     ⛔ 이 수를 「맞춤형이 아니다」로 읽지 않는다. 자가 이 사이트에서 꺼져 있다.');
    console.log('     ✅ 고치려면 이 사이트의 실명이 든 자료를 src/data 에 두십시오 —');
     console.log('        이름·title·회사·firm·place·top 칸을 읽습니다(우리말도 읽습니다).');
  }
  console.log(`  구조화 데이터 ${몫(셈.구조화)}   ← GEO. AI 가 읽는 자리`);
  console.log(`  canonical    ${몫(셈.canonical)}`);
  if (안본것) {
    console.log(`\n  ⬜ 안 본 것 ${안본것}장 — noindex·은퇴 주소·404 다. 손님이 받지 않는다.`);
    console.log('     ⚠ 이것을 「깨끗하다」로 읽지 않는다. 안 본 것은 안 본 것이다.');
  }

  const 고칠것 = 잰것들
    .filter((x) => 점수(x) < 만점)
    .map((x) => ({ ...x, 점: 점수(x), 자물쇠: 자물쇠걸렸나(x.주소, 자물쇠) }))
    .sort((a, b) => a.점 - b.점 || a.주소.localeCompare(b.주소));

  if (!앎.안다) {
    console.log(`\n## ⬜ 고칠 지면 목록을 내지 않는다 — 실명을 못 쟀다`);
    console.log('   ⛔ 못 잰 칸으로 만든 목록을 남에게 시키면 없는 일을 시키는 것이다.');
    console.log(`   ⚠ 구조화·canonical 은 위 수가 맞다 — 그 둘은 말과 상관이 없다.`);
    return true;
  }
  console.log(`\n## 고칠 지면 ${고칠것.length}장 — 빈 칸이 많은 것부터\n`);
  const 낼것 = 고칠것만 ? 고칠것 : 고칠것.slice(0, 25);
  for (const x of 낼것) {
    const 빈칸 = [
      !x.실명 && '실명',
      !x.구조화 && '구조화',
      !x.canonical && 'canonical',
    ].filter(Boolean).join('·');
    const 자 = x.자물쇠 ? `  🔒 ${x.자물쇠} 까지 제목 손대지 않는다` : '';
    console.log(`  ${String(x.점)}/${만점}  ${x.주소.padEnd(28)} 빈 칸: ${빈칸}${자}`);
    console.log(`         「${x.제목.slice(0, 74)}」`);
  }
  if (!고칠것만 && 고칠것.length > 낼것.length) {
    console.log(`\n  … ${고칠것.length - 낼것.length}장 더. 전부 보려면 --고칠것`);
  }

  console.log('\n## ⛔ 이 자가 못 재는 것 — \n');
  console.log('  「아무도 답하지 않는 물음인가」는 못 쟀다. 남의 검색결과를 봐야 아는 것이다.');
  console.log('  ⇒ 이 자는 어제 정한 규칙의 «절반»만 잰다. 실명이 있어도 남이 이미 답하는');
  console.log('     물음이면 7쪽으로 간다. 그 판정은 사람이 한다.');
  console.log(`  실명 판정은 «우리 자료에 있는 이름 ${이름들.length}개»로만 했다.`);
  console.log('     사전에 없는 이름이 제목에 있으면 «없다»로 잡힌다 — 사전을 넓히면 줄어든다.');
  /**
   * 🔴 [2026-09-05 · 5번] **이 칸은 100% 가 될 수 없고, 되어서도 안 된다.**
   *   자물쇠 안 걸린 지면 열여덟 장의 «자료»를 열어 보고 알았다 — 대부분이
   *   띠(band)와 비율만 담고 있어 사람도 작품도 들어 있지 않다.
   *   /climb · /actor-reach · /lead-lag · /crowding · /fewer-titles · /home-first ·
   *   /home-abroad · /returns 가 그런 지면이다.
   * ⛔ 그런 지면 제목에 이름을 넣으면 **그 지면이 «세지 않은 것»을 제목이 말하는 꼴**이 된다.
   *   강령 「못 잰 것은 못 쟀다고 적는다」에 정면으로 걸린다.
   * ⛔ 그러니 이 수를 올리려고 이름을 억지로 넣지 마십시오 — **자를 속이는 것**이지
   *   콘텐트가 좋아지는 것이 아니다.
   * ✅ 고칠 것은 하나뿐이다 — **자료에 이름이 «있는데» 제목이 안 쓴 지면.**
   */
  console.log('  ⛔ 이 칸은 100% 가 될 수 없다 — 분포를 재는 지면은 자료에 이름이 «없다».');
  console.log('     없는 지면에 이름을 넣으면 세지 않은 것을 제목이 말하게 된다. 넣지 마십시오.');
  console.log('     고칠 것은 «자료에 이름이 있는데 제목이 안 쓴» 지면뿐이다.');
  return true;
}

const 인 = process.argv.slice(2);
const 이파일이시작인가 = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
if (이파일이시작인가) {
  if (인.includes('--자가시험')) process.exit(자가시험() ? 0 : 1);
  else {
    const 키 = (인.find((x) => x.startsWith('--사이트=')) ?? '').split('=')[1] || 'kcw';
    process.exit(본일(인.includes('--고칠것'), 키) ? 0 : 1);
  }
}
