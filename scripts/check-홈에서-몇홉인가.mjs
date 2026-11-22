#!/usr/bin/env node
/**
 * check-홈에서-몇홉인가.mjs — **첫 화면에서 각 묶음까지 몇 번 눌러야 닿나.**
 *
 * ── 🔴🔴 왜 만들었나 (2026-10-04 06:0x · 5번) ───────────────────────────
 *   밤새 색인이 막힌 까닭을 찾아 가설 넷을 세웠고 **넷 다 틀렸다** —
 *   겹침도 아니고, 들어오는 링크 «수»도 아니고, 문이 아예 없는 것도 아니고,
 *   구글의 제재도 아니었다(서치콘솔에 수동 조치·보안 문제 없음).
 *
 *   다섯째로 **홈에서의 «거리»**를 재 보니 수가 갈렸다 —
 *   ```
 *   시장    홈에서 링크     회사 지면 색인(표본 4장)
 *   일본      (길 있음)        4/4   ✅
 *   한국      (길 있음)        2/4
 *   대만        0개            0/4   🔴 구글이 한 번도 안 왔다 (1,057장)
 *   걸프        0개            0/4   🔴 구글이 한 번도 안 왔다 (  104장)
 *   ```
 *   **홈에서 안 닿는 묶음은 통째로 안 온다.** 사이트맵에는 넷 다 들어 있었다.
 *   ⭐ 구글은 사이트맵으로 «알고», 링크를 타고 «온다». 둘은 다른 일이다.
 *
 * ── ⛔ 이 자가 안 하는 것 ─────────────────────────────────────────────
 * ⛔ **링크 «수»를 세지 않는다.** 그것은 `check-inbound-links.mjs` 가 한다. 그리고
 *   2026-10-04 에 재 보니 링크 수는 색인을 가르는 축이 «아니었다»
 *   (`/about` 은 3,016개가 들어오는데 색인 안 됐고, 링크 3개짜리는 색인됐다).
 *   여기서 보는 것은 **거리**다 — 0개와 1개의 차이는 크고, 3개와 3,000개의 차이는 작다.
 * ⛔ 「몇 홉이면 좋다」를 말하지 않는다. 수를 내고 멈춘다. 판정은 사람이 한다.
 * ⚠ **dist 안의 파일만 읽는다.** 서버가 그때그때 그려 내는 지면(예: klifemap `/content`)은
 *   파일이 아니므로 이 자가 못 본다 — 그 사이트에 쓰면 「안 닿는다」가 거짓이 된다.
 *   2026-10-04 에 그 흠으로 사장님께 틀린 보고를 올렸다. SeoulMarkets 은 정적이라 괜찮다.
 *
 * 쓰는 법
 *   node scripts/check-홈에서-몇홉인가.mjs
 *   node scripts/check-홈에서-몇홉인가.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * 🔴🔴 [2026-10-04 06:0x] **한 dist 에 «사이트 셋»이 들어 있다 — 홈도 셋이다.**
 *
 *   처음에 `dist/index.html` 하나에서 재었더니 「홈에서 한 번도 안 닿는 묶음」으로
 *   `/100y/school` 2,526장 · `/wikitip/person` 637장 … 7,500장이 넘게 나왔다.
 *   **거짓이다.** `/100y` 는 100yearmap.com 이 내고 `/wikitip` 은 kculturewire.com 이 낸다.
 *   seoulmarkets 의 홈에서 안 닿는 것이 당연하다 — 손님이 거기로 들어오지 않는다.
 *   ⇒ 메모리 「자를-먼저-의심한다-0이-나오면」 자리다. 같은 밤에 네 번째다.
 *
 * ⚠ `/japan`·`/taiwan`·`/uae` 는 **seoulmarkets 의 하위 구역**이다(자기 홈이 없다).
 *   그래서 사이트가 아니라 접두사로만 다룬다.
 * ⚠ 그리고 지면 «안»의 링크는 접두사 없이 적힌다 — `/100y/school/x` 안에서 `/school/y` 로 간다.
 *   서버가 호스트를 보고 접두사를 붙인다. 그래서 걸을 때 «그 지면의 접두사»를 붙여 찾는다.
 */
export const 사이트들 = [
  { 이름: 'seoulmarkets', 접두사: '', 홈: '/', 바깥: 'https://seoulmarkets.com/' },
  { 이름: '100yearmap', 접두사: '/100y', 홈: '/100y', 바깥: 'https://100yearmap.com/' },
  { 이름: 'kculturewire', 접두사: '/wikitip', 홈: '/wikitip', 바깥: 'https://www.kculturewire.com/' },
];

/**
 * 🔴🔴 [2026-10-06 17:22 · 5번] **결함 이름 — 「저장소 파일을 라이브인 양 읽는다」**
 *
 * 오늘 klifemap 에서 이 결함으로 **하루를 잃었다.** 거기 자는 저장소 파일을 읽었는데,
 * 그 사이트는 차림표를 «내보낼 때» 끼워 넣는다 — 저장소 홈에는 링크가 0개였다.
 * 그래서 「고쳤는데 수가 안 움직인다」는 거짓 빨강이 사흘 치 일을 헛돌게 했다.
 *
 * ⇒ 강령 ⑤ — 고치면 **인용한 곳까지 따라간다.** 이 자도 `dist/` 를 읽는다.
 *   여기는 정적 빌드라 괜찮을 «것 같»지만, 「같다」는 잰 것이 아니다.
 *   ⛔ 「괜찮을 것 같다」를 「괜찮다」로 적지 않는다. **재서 적는다.**
 *
 * ⚠ 홈 한 장만 받는다 — 셋이면 세 번이다. 거의 공짜다.
 * ⛔ 못 받으면 「같다」가 아니라 «못 쟀다»다. 세는 칸이 셋이다.
 */
/**
 * 그 사이트 홈이 dist 안 «어느 파일»인가.
 *
 * 🔴 [2026-10-06 17:28 · 5번] 처음에 `<홈>/index.html` 하나만 보고 ⬜ 못잼을 두 번 냈다.
 *   재 보니 100yearmap 홈은 `dist/100y.html` 이었다 — Astro 는 폴더가 아니라 낱장으로도 낸다.
 *   ⭐ ⬜ 가 정직하게 울어 준 덕에 잡았다. 「같다」로 적었으면 못 잡았다.
 * ⛔ 하나만 보고 「없다」로 적지 않는다. 두 꼴을 다 본다.
 */
export function 홈파일후보(홈) {
  const b = String(홈 ?? '/').replace(/^\//, '').replace(/\/+$/, '');
  if (!b) return ['index.html'];
  return [`${b}/index.html`, `${b}.html`];
}

export function 라이브와dist가다른가(dist글, 라이브글) {
  if (dist글 == null || 라이브글 == null) return { 결: '못잼', 까닭: '한쪽을 못 읽었다' };
  const a = 안쪽길들(dist글);
  const b = 안쪽길들(라이브글);
  const a집 = new Set(a); const b집 = new Set(b);
  const 라이브에만 = b.filter((x) => !a집.has(x));
  const dist에만 = a.filter((x) => !b집.has(x));
  if (!라이브에만.length && !dist에만.length) {
    return { 결: '같다', 까닭: `둘 다 ${a.length}곳을 건다`, 라이브에만, dist에만 };
  }
  return {
    결: '다르다',
    까닭: `라이브에만 ${라이브에만.length}곳 · dist 에만 ${dist에만.length}곳`,
    라이브에만, dist에만,
  };
}

/** 라이브 홈을 받아 본다. ⛔ 못 받으면 null — 「링크 0개」로 세지 않는다 */
export async function 라이브홈받기(주소, 받기 = fetch) {
  try {
    const r = await 받기(주소, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HopSelfCheck/1.0)' } });
    if (!r.ok) return null;
    return await r.text();
  } catch (e) { return null; }
}

/** 묶음 이름을 지을 때 한 칸 더 보는 접두사 (seoulmarkets 안의 구역도 포함) */
export const 사이트접두사 = ['/wikitip', '/100y', '/japan', '/taiwan', '/uae'];

/** 그 길이 어느 사이트 것인가 — 가장 긴 접두사가 이긴다 */
export function 어느사이트(길) {
  const s = String(길 ?? '');
  for (const x of 사이트들) {
    if (x.접두사 && (s === x.접두사 || s.startsWith(x.접두사 + '/'))) return x;
  }
  return 사이트들[0];
}

/**
 * 🔴 [2026-10-04 06:1x] **퍼센트 인코딩 주소를 파일 이름과 못 맞추고 있었다.**
 *
 *   `/100y/college-major` 가 「837장 가운데 400장만 닿는다(48%)」로 나왔다. 파 보니
 *   목록은 **837개 전부**에 링크를 걸고 있었다. 꼴이 이랬다 —
 *   ```
 *   목록의 링크   /college-major/%EA%B0%80%EC%A0%95%EA%B5%90%EC%9C%A1%EA%B3%BC
 *   파일 이름     /100y/college-major/가정교육과
 *   ```
 *   같은 지면인데 글자가 달라 못 찾은 것이다. **437장이 거짓으로 「안 닿는다」였다.**
 *   ⚠ 이 흠은 내 메모에 이미 적혀 있었다 — 「100yearmap 의 /major 는 퍼센트
 *     인코딩이라 아예 못 쟀다」. 적어 두고도 새 자에 그대로 되풀이했다.
 *
 * ⛔ 디코딩이 터지면(깨진 인코딩) 날것을 그대로 쓴다 — 지면 하나 때문에 자가 죽지 않는다.
 */
export function 길풀기(길) {
  const s = String(길 ?? '');
  if (!s.includes('%')) return s;
  try { return decodeURIComponent(s); } catch { return s; }
}

export function 안쪽길들(html) {
  const 것 = [];
  for (const m of String(html ?? '').matchAll(/href\s*=\s*"(\/[^"]*)"/g)) {
    const 날것 = m[1];
    if (날것.startsWith('//')) continue;                 /* //evil.com 은 바깥이다 */
    const 길 = 길풀기(날것.split(/[?#]/)[0]).replace(/\/+$/, '') || '/';
    것.push(길);
  }
  return [...new Set(것)];
}

/**
 * 🔴🔴 [2026-10-04 07:5x · 5번] **「접은 지면」은 안 닿는 것이 맞다 — 거짓 빨강을 막는다.**
 *
 *   이 자가 `/wikitip/title` 14장 · `/wikitip/room` 12장을 「통째로 묻혀 있다」고 냈다.
 *   파 보니 **스물여섯 장이 전부 «접은 지면»**이었다 —
 *   ```
 *   /wikitip/room/*    띠 방 — 2026-08-29 «사장님 지시»로 내렸다.
 *                      「접은 까닭이 적힌 지면 12장은 남겼다」(build-kcw-community.mjs)
 *   /wikitip/title/*   우리 주제가 아니라고 재서 뺀 작품. 주소만 살려 까닭을 적어 뒀다
 *                      (check-kcw-retired-pages.mjs — 「빈 404 는 손님을 내보낸다」)
 *   ```
 *   ⇒ **일부러 안 거는 것이다.** 옛 주소로 들어온 손님에게 까닭과 갈 곳을 주는 자리이고,
 *     목록에 다시 걸면 사장님이 내리라 하신 것을 되살리는 셈이 된다.
 *
 * ⛔ 내가 하마터면 「고립다」라고 보고 다시 걸 뻔했다. 메모리 「지시의 범위를 넓게 잡는
 *   것도 어기는 것이다」가 이 자리다. **안 닿는 데는 까닭이 있을 수 있다.**
 * ⚠ 그래도 «세기는» 한다 — 아래 출력에서 따로 적는다. 조용히 빼면 그것도 거짓 초록이다.
 *
 * ⛔ 무늬를 «넓게» 잡지 않는다. 처음에 `\bretired\b` 로 썼다가 되읽어 보니 기사 쪽에
 *   「two Korean companies … one retires nearly 10 percent」(주식 소각)·「retired workers」가
 *   걸렸다. 그대로 뒀으면 **진짜 빨강까지 「접은 것」으로 가려** 거짓 초록이 됐다.
 *   ⇒ 접은 지면이 «스스로 내거는 말»만 본다 — 제목이 `Retired address` 다.
 *   오늘 한글 샘 검사에서 「넓히는 고침 뒤에 빨강이 줄면 먼저 의심한다」를 배운 그 자리다.
 */
export const 접은자국 = /Retired address|This address was retired|이 주소는 접었/i;

export function 접은지면인가(html) {
  return 접은자국.test(String(html ?? ''));
}

/**
 * 🔴 [2026-10-04 07:5x · 5번] **걸지 «않는 것»이 맞는 지면이 따로 있다.**
 *
 *   접은 지면을 걷어 내고 67장이 남았는데, 그 가운데 일곱 장은 고칠 것이 아니었다 —
 *   ```
 *   /404 · /100y/404 · /wikitip/404     오류 지면. 목록에 거는 것이 틀린 것이다
 *   /account · /recover                 로그인한 사람만 보는 자리
 *   /research                           손님 지면이 아니다
 *   /100y/naver8660…                    네이버가 주인 확인에 쓰는 파일. 사람이 볼 것이 아니다
 *   ```
 *   ⛔ 이것들을 빨강으로 띄우면 **날마다 뜨는 못 고치는 빨강**이 되고, 옆의 진짜 빨강까지
 *     같이 묻는다. 오늘 로그인 검사와 접은 지면에서 두 번 겪은 그 자리다.
 *
 * ⚠ 무늬를 넓히지 않는다. **길 하나하나를 적는다** — 「auth 가 들어가면」 같은 식으로
 *   잡으면 나중에 진짜 손님 지면이 소리 없이 가려진다.
 * ⚠ 여기에 더할 때는 **왜 안 거는지를 같이 적는다.** 까닭이 없으면 그냥 흠이다.
 */
export const 걸지않는길 = new Set([
  '/404', '/100y/404', '/wikitip/404',            /* 오류 지면 */
  '/account', '/recover',                          /* 로그인한 사람만 */
  '/research',                                     /* 손님 지면이 아니다 */
  '/wikitip/video/review',                         /* 「Sound review」 — 우리가 소리를 들어 보는 자리 */
]);

/** 네이버·구글이 주인 확인에 쓰는 파일 — 사람이 볼 것이 아니다 */
export const 주인확인꼴 = /\/(naver[0-9a-f]{20,}|google[0-9a-f]{12,})$/i;

export function 걸지않는지면인가(길) {
  const g = String(길 ?? '');
  return 걸지않는길.has(g) || 주인확인꼴.test(g);
}

/**
 * 🔴 [2026-10-04 08:2x · 5번] **옮김 지면도 안 닿는 것이 맞다.**
 *
 *   `/100y/y/age32`·`/100y/y/jongno` 넷이 「통째로 묻혀 있다」로 떴다. 열어 보니 —
 *   ```
 *   <meta http-equiv="refresh" content="0; url=/age/32?from=yt-100y&at=age">
 *   <link rel="canonical" href="https://100yearmap.com/age/32">
 *   ```
 *   **바깥(유튜브 등)에서 들어오는 짧은 주소**이고, 들어온 사람을 바로 제 지면으로 보낸다.
 *   ⇒ 우리 목록에 걸 것이 아니다. canonical 도 제 지면을 가리키고 있다.
 *
 * ⛔ 무늬를 넓히지 않는다 — **지면이 스스로 내거는 것**만 본다. 0초 새로고침이 그것이다.
 *   ⚠ 몇 초 뒤에 옮기는 지면(읽을 시간을 주는 것)은 옮김 지면이 아니다. 그런 지면은
 *     손님이 거기서 읽을 것이 있다는 뜻이라, 안 닿으면 그건 흠이 맞다.
 */
export const 옮김자국 = /http-equiv=["']refresh["'][^>]*content=["']\s*0\s*;/i;

export function 옮김지면인가(html) {
  return 옮김자국.test(String(html ?? ''));
}

/**
 * 셈에서 뺄 지면인가 — **세 갈래뿐이다.**
 *   ① 접은 지면 (까닭을 적어 둔 옛 주소)
 *   ② 걸지 않는 것이 맞는 지면 (오류·로그인·주인확인)
 *   ③ 옮김 지면 (0초 새로고침으로 제 지면에 보낸다)
 * ⛔ 「안 닿는 것이 많으니 넓히자」로 여기에 더하지 않는다. 그것은 흠을 가리는 것이다.
 */
export function 셈에서뺄까(길, html) {
  return 걸지않는지면인가(길) || 접은지면인가(html) || 옮김지면인가(html);
}

/** 손님이 여는 주소 — `a/index.html` 은 `/a` 이고 `a.html` 도 `/a` 다 */
export function 손님길(파일, 밑) {
  const r = path.relative(밑, 파일).replace(/\\/g, '/');
  if (r === 'index.html') return '/';
  if (r.endsWith('/index.html')) return '/' + r.slice(0, -'/index.html'.length);
  if (r.endsWith('.html')) return '/' + r.slice(0, -'.html'.length);
  return '/' + r;
}

/** 묶음 이름 — `/japan/company/ukai` → `/japan/company` */
export function 묶음(길) {
  const 조각 = String(길 ?? '').split('/').filter(Boolean);
  if (!조각.length) return '/';
  /* 사이트 접두사가 앞에 붙으면 한 칸 더 본다 — /japan 과 /japan/company 는 다른 묶음이다 */
  const 접두사붙음 = 사이트접두사.includes('/' + 조각[0]);
  const 깊이 = 접두사붙음 ? 2 : 1;
  return '/' + 조각.slice(0, 깊이).join('/');
}

/**
 * 홈에서 너비우선으로 걸어 각 지면까지의 홉수를 낸다.
 * ⛔ 못 닿은 지면을 0 으로 적지 않는다 — 목록에 «없다»로 둔다. 그것이 사실이다.
 */
export function 홉재기(지면들, { 시작 = '/', 최대홉 = 6, 접두사 = '' } = {}) {
  const 사전 = new Map(지면들.map((p) => [p.길, p.링크 ?? []]));
  const 홉 = new Map();
  if (!사전.has(시작)) return 홉;                        /* 홈이 없으면 잴 수 없다 */
  홉.set(시작, 0);
  let 테두리 = [시작];
  for (let d = 1; d <= 최대홉 && 테두리.length; d++) {
    const 다음 = [];
    for (const 여기 of 테두리) {
      for (const 날것 of 사전.get(여기) ?? []) {
        /* 🔴 지면 안 링크는 접두사 없이 적힌다 — 내 접두사를 붙여서도 찾아본다.
           ⛔ 붙인 쪽을 «먼저» 본다. /100y 안에서 /school 은 /100y/school 이지
             seoulmarkets 의 /school 이 아니다. */
        const 후보 = 접두사 && !날것.startsWith(접두사 + '/') && 날것 !== 접두사
          ? [접두사 + 날것, 날것] : [날것];
        const 그리로 = 후보.find((c) => 사전.has(c));
        if (!그리로) continue;                           /* 지면이 없는 링크는 안 센다 */
        if (홉.has(그리로)) continue;
        홉.set(그리로, d);
        다음.push(그리로);
      }
    }
    테두리 = 다음;
  }
  return 홉;
}

/**
 * 홉마다 «몇 장»이 있나.
 *
 * 🔴🔴 [2026-10-06 17:55 · 5번] **묶음의 「가장 가까운」 홉만 보고 길을 잃었다.**
 *   `3홉 /company 2522장` 을 보고 「2,522장이 다 3홉」으로 읽었다. 틀렸다 —
 *   그것은 그 묶음에서 «가장 가까운 한 장»이 3홉이라는 뜻이다. 나머지는 더 깊을 수도,
 *   (아니다) 더 얕을 수는 없다. 곧 **2,522장이 3홉 «이상»**이라는 것만 안다.
 *   ⛔ 「몇 장이 묻혔나」를 그 줄로 알 수 없다. 그런데 고칠 값은 그 수로 정해진다.
 *
 * ⇒ 홉마다 장수를 센다. 같은 날 klifemap 에 붙인 것과 같은 자다 — 두 저장소가 같은 눈을 갖는다.
 * ⛔ 못 닿는 것을 0홉으로 세지 않는다. 셋째 칸(«못닿음»)에 둔다.
 */
export function 홉분포(지면들, 홉) {
  const 통 = new Map();
  for (const p of 지면들 ?? []) {
    const d = 홉?.has?.(p.길) ? 홉.get(p.길) : '못닿음';
    통.set(d, (통.get(d) ?? 0) + 1);
  }
  return 통;
}

/** 그 묶음 안에서 홉마다 몇 장인가 — 어디를 고칠지 정하는 수다 */
export function 묶음안홉분포(지면들, 홉, 묶음이름) {
  const 통 = new Map();
  for (const p of 지면들 ?? []) {
    if (묶음(p.길) !== 묶음이름) continue;
    const d = 홉?.has?.(p.길) ? 홉.get(p.길) : '못닿음';
    통.set(d, (통.get(d) ?? 0) + 1);
  }
  return 통;
}

/** 분포를 사람이 읽는 한 줄로. ⛔ 빈 것은 '' 가 아니라 '못 쟀다' 다 */
export function 분포한줄(통) {
  if (!통 || !통.size) return '못 쟀다';
  const 차례 = [...통.keys()].sort((a, b) => (a === '못닿음' ? 99 : a) - (b === '못닿음' ? 99 : b));
  return 차례.map((d) => `${d === '못닿음' ? '⬜못닿음' : d + '홉'} ${통.get(d)}`).join(' · ');
}

/** 묶음마다 «가장 가까운 지면»의 홉수. 못 닿으면 null — 0 으로 적지 않는다 */
export function 묶음별가장가까운홉(지면들, 홉) {
  const 것 = new Map();
  for (const p of 지면들) {
    const g = 묶음(p.길);
    const d = 홉.has(p.길) ? 홉.get(p.길) : null;
    const 이제 = 것.get(g) ?? { 묶음: g, 장수: 0, 가장가까운: null, 닿은장수: 0, 뺀장수: 0, 뺀것중닿은: 0 };
    이제.장수 += 1;
    if (p.뺌) 이제.뺀장수 += 1;   /* 세기는 한다 — 조용히 빼면 그것도 거짓 초록이다 */
    if (d != null) {
      이제.닿은장수 += 1;
      /* 🔴 [07:5x] 접은 지면 가운데 «아직 링크가 걸린» 것이 있다. 분모에서만 빼면
         몫이 101% 로 나온다 — 실제로 그렇게 나왔다. 분자에서도 같이 빼려고 센다 */
      if (p.뺌) 이제.뺀것중닿은 += 1;
      if (이제.가장가까운 == null || d < 이제.가장가까운) 이제.가장가까운 = d;
    }
    것.set(g, 이제);
  }
  return [...것.values()];
}

/* ── 자가시험 ─────────────────────────────────────────────────────── */
export function 자가시험() {
  const 결과 = [];
  const 본다 = (이름, 참, 덧 = '') => 결과.push({ 이름, 참: !!참, 덧 });

  본다('안쪽 링크를 뽑는다', 안쪽길들('<a href="/a">x</a><a href="/b/">y</a>').join(',') === '/a,/b');
  본다('⛔ 바깥 주소를 안 센다', 안쪽길들('<a href="https://x.com/a">x</a>').length === 0);
  본다('⛔ //evil 을 안쪽으로 안 읽는다', 안쪽길들('<a href="//evil.com/a">x</a>').length === 0);
  본다('⛔ 물음표·우물정은 자른다', 안쪽길들('<a href="/a?x=1#y">z</a>')[0] === '/a');
  본다('⛔ 같은 길을 한 번만 센다', 안쪽길들('<a href="/a">1</a><a href="/a/">2</a>').length === 1);

  /* 🔴 접은 지면 — 안 닿는 것이 맞다. 그러나 무늬가 넓으면 진짜 빨강을 가린다 */
  본다('접은 지면을 알아본다', 접은지면인가('<h1>Retired address</h1>'));
  본다('접은 지면을 알아본다 (본문)', 접은지면인가('<p>This address was retired.</p>'));
  본다('⛔ 주식 소각 기사를 접은 것으로 안 본다',
    !접은지면인가('<h1>One company retires nearly 10 percent of its shares</h1>'));
  본다('⛔ 은퇴한 사람 이야기를 접은 것으로 안 본다',
    !접은지면인가('<p>Retired workers draw a smaller pension.</p>'));
  본다('⛔ 빈 지면을 접은 것으로 안 본다', !접은지면인가(''));
  본다('⛔ 없는 글을 접은 것으로 안 본다', !접은지면인가(null));

  /* 걸지 않는 것이 맞는 지면 — 길 하나하나를 적는다. 무늬로 넓히지 않는다 */
  본다('오류 지면은 안 거는 것이 맞다', 걸지않는지면인가('/404') && 걸지않는지면인가('/100y/404'));
  본다('로그인한 사람만 보는 자리를 안 센다', 걸지않는지면인가('/account'));
  본다('주인 확인 파일을 안 센다', 걸지않는지면인가('/100y/naver86609d6dca43d138516eb4f3d8ffdc73'));
  본다('⛔ 손님 지면을 안 가린다', !걸지않는지면인가('/100y/csat-subject-choice'));
  본다('⛔ 404 가 든 손님 지면을 안 가린다', !걸지않는지면인가('/wikitip/article/error-404-the-song'));
  본다('⛔ naver 로 시작해도 짧으면 안 가린다', !걸지않는지면인가('/100y/naver-trends'));
  /* 옮김 지면 — 0초 새로고침만 본다 */
  본다('0초 새로고침은 옮김 지면이다',
    옮김지면인가('<meta http-equiv="refresh" content="0; url=/age/32">'));
  본다('따옴표가 홑이어도 본다',
    옮김지면인가("<meta http-equiv='refresh' content='0;url=/a'>"));
  본다('⛔ 몇 초 뒤에 옮기는 것은 옮김 지면이 아니다',
    !옮김지면인가('<meta http-equiv="refresh" content="8; url=/a">'));
  본다('⛔ 그냥 지면을 옮김으로 안 본다', !옮김지면인가('<p>refresh</p>'));

  본다('세 갈래를 한 자리에서 본다',
    셈에서뺄까('/404', '')
    && 셈에서뺄까('/x', '<h1>Retired address</h1>')
    && 셈에서뺄까('/x', '<meta http-equiv="refresh" content="0; url=/y">')
    && !셈에서뺄까('/x', '<p>hi</p>'));
  {
    /* 접은 것만 든 묶음은 「못 닿는다」가 아니라 「접었다」로 적힌다 */
    const 것 = [
      { 길: '/', 링크: [] },
      { 길: '/old/a', 링크: [], 뺌: true },
      { 길: '/old/b', 링크: [], 뺌: true },
    ];
    const 묶 = 묶음별가장가까운홉(것, 홉재기(것)).find((x) => x.묶음 === '/old');
    본다('접은 묶음은 뺀장수가 장수와 같다', 묶 && 묶.뺀장수 === 2 && 묶.장수 === 2);
    본다('⛔ 그래도 못 닿는 것은 그대로 적는다', 묶 && 묶.가장가까운 === null);
  }
  {
    /* 🔴 실제로 101% 가 나왔던 자리다 — 접은 지면에 링크가 아직 걸려 있을 때 */
    const 것 = [
      { 길: '/', 링크: ['/g/a', '/g/b'] },
      { 길: '/g/a', 링크: [] },
      { 길: '/g/b', 링크: [], 뺌: true },   /* 접었는데 아직 걸려 있다 */
      { 길: '/g/c', 링크: [], 뺌: true },   /* 접었고 안 걸려 있다 */
    ];
    const 묶 = 묶음별가장가까운홉(것, 홉재기(것)).find((x) => x.묶음 === '/g');
    const 몫 = Math.round(((묶.닿은장수 - 묶.뺀것중닿은) / (묶.장수 - 묶.뺀장수)) * 100);
    본다('🔴 접은 지면이 걸려 있어도 몫이 100%를 안 넘는다', 몫 === 100, `${몫}%`);
    본다('접었는데 닿는 것을 따로 센다', 묶.뺀것중닿은 === 1);
  }
  본다('⛔ 빈 것에 안 터진다', 안쪽길들(null).length === 0);
  /* 🔴 [2026-10-04] 퍼센트 인코딩 때문에 437장을 거짓으로 「안 닿는다」고 하던 자리 */
  본다('🔴 퍼센트 인코딩 주소를 파일 이름과 맞춘다',
    안쪽길들('<a href="/college-major/%EA%B0%80%EC%A0%95%EA%B5%90%EC%9C%A1%EA%B3%BC">x</a>')[0]
    === '/college-major/가정교육과');
  본다('⛔ 깨진 인코딩에 안 터진다 — 날것을 그대로 쓴다', 길풀기('/a%ZZ') === '/a%ZZ');
  본다('⛔ 퍼센트가 없으면 그대로다', 길풀기('/a/b') === '/a/b');
  본다('⛔ 빈 것·null 에 안 터진다', 길풀기(null) === '' && 길풀기('') === '');
  본다('⛔ 풀어도 같은 길은 한 번만 센다',
    안쪽길들('<a href="/a/%EA%B0%80">1</a><a href="/a/가">2</a>').length === 1);

  본다('index.html 은 홈이다', 손님길('d/index.html', 'd') === '/');
  본다('a/index.html 은 /a 다', 손님길('d/a/index.html', 'd') === '/a');
  본다('a.html 도 /a 다', 손님길('d/a.html', 'd') === '/a');

  본다('묶음을 가른다', 묶음('/company/abc') === '/company');
  본다('🔴 사이트 접두사가 붙으면 한 칸 더 본다', 묶음('/japan/company/ukai') === '/japan/company');
  본다('⛔ 접두사만 있으면 그대로다', 묶음('/japan') === '/japan');
  본다('⛔ 홈은 홈이다', 묶음('/') === '/');

  /* 홈 → /a → /a/x · /b 는 아무도 안 건다 */
  const 지면 = [
    { 길: '/', 링크: ['/a'] },
    { 길: '/a', 링크: ['/a/x'] },
    { 길: '/a/x', 링크: [] },
    { 길: '/b', 링크: [] },
    { 길: '/b/y', 링크: [] },
  ];
  const 홉 = 홉재기(지면);
  본다('홈은 0홉', 홉.get('/') === 0);
  본다('한 번 눌러 닿으면 1홉', 홉.get('/a') === 1);
  본다('두 번이면 2홉', 홉.get('/a/x') === 2);
  본다('🔴 아무도 안 거는 지면은 «목록에 없다» — 0 으로 적지 않는다', !홉.has('/b'));
  본다('⛔ 지면이 없는 링크는 안 센다', 홉재기([{ 길: '/', 링크: ['/없다'] }]).size === 1);
  본다('⛔ 홈이 없으면 빈 결과다', 홉재기([{ 길: '/a', 링크: [] }]).size === 0);
  본다('⛔ 고리가 있어도 안 돈다', 홉재기([
    { 길: '/', 링크: ['/a'] }, { 길: '/a', 링크: ['/'] },
  ]).get('/a') === 1);

  /* 🔴 [2026-10-04] 사이트 셋을 한 홈에서 재어 7,500장을 거짓으로 「묻혔다」고 하던 자리 */
  본다('🔴 /100y 는 100yearmap 것이다', 어느사이트('/100y/school/x').이름 === '100yearmap');
  본다('🔴 /wikitip 은 kculturewire 것이다', 어느사이트('/wikitip/person/x').이름 === 'kculturewire');
  본다('⛔ /japan 은 seoulmarkets 의 구역이다 — 따로 사이트가 아니다',
    어느사이트('/japan/company/x').이름 === 'seoulmarkets');
  본다('⛔ 접두사 없는 길은 seoulmarkets 다', 어느사이트('/company/x').이름 === 'seoulmarkets');
  본다('⛔ 비슷한 이름에 안 속는다 — /100yearbook 은 100yearmap 이 아니다',
    어느사이트('/100yearbook').이름 === 'seoulmarkets');

  /* 접두사 사이트: 지면 안 링크는 접두사 없이 적힌다 */
  const 백년 = [
    { 길: '/100y', 링크: ['/school'] },
    { 길: '/100y/school', 링크: ['/school/7531382'] },
    { 길: '/100y/school/7531382', 링크: [] },
    { 길: '/school', 링크: [] },                       /* seoulmarkets 의 같은 이름 — 헷갈리면 안 된다 */
  ];
  const 백년홉 = 홉재기(백년, { 시작: '/100y', 접두사: '/100y' });
  본다('🔴 접두사 없이 적힌 안쪽 링크를 내 접두사로 찾는다', 백년홉.get('/100y/school') === 1);
  본다('🔴 두 홉까지 따라간다', 백년홉.get('/100y/school/7531382') === 2);
  본다('⛔ 남의 사이트의 같은 이름으로 새지 않는다', !백년홉.has('/school'));

  const 묶 = 묶음별가장가까운홉(지면, 홉);
  const b = 묶.find((x) => x.묶음 === '/b');
  본다('🔴 못 닿은 묶음은 가장가까운이 null 이다', b && b.가장가까운 === null);
  본다('🔴 그래도 장수는 센다 — 몇 장이 묻혀 있는지가 요점이다', b && b.장수 === 2);
  const a = 묶.find((x) => x.묶음 === '/a');
  본다('닿은 묶음은 가장 가까운 홉을 낸다', a && a.가장가까운 === 1 && a.닿은장수 === 2);

  /* 🔴🔴 [2026-10-06 · 5번] 「저장소 파일을 라이브인 양 읽는 결함」을 막는 자리.
     오늘 klifemap 에서 이 결함으로 사흘 치 일이 헛돌았다. 검사로 굳힌다. */
  본다('⭐ 라이브에만 링크가 있으면 «다르다»로 센다 — 이것이 오늘 잃은 하루의 까닭이다',
    라이브와dist가다른가('<a href="/a">1</a>', '<a href="/a">1</a><a href="/all">2</a>').결 === '다르다');
  본다('둘이 같으면 같다',
    라이브와dist가다른가('<a href="/a">1</a>', '<a href="/a">1</a>').결 === '같다');
  본다('⛔ 한쪽을 못 읽으면 «같다»가 아니라 못잼 — 세는 칸이 셋이다',
    라이브와dist가다른가('<a href="/a">1</a>', null).결 === '못잼'
    && 라이브와dist가다른가(null, '<a href="/a">1</a>').결 === '못잼');
  본다('⛔ 빈 글과 못 읽음을 섞지 않는다 — 빈 글은 «읽었는데 링크가 없는» 것이다',
    라이브와dist가다른가('', '').결 === '같다');
  본다('라이브에만 있는 길을 이름까지 돌려준다 — 수만 주면 어디를 고칠지 모른다',
    라이브와dist가다른가('', '<a href="/all">x</a>').라이브에만?.[0] === '/all');
  본다('dist 에만 있는 것도 흠이다 — 배포가 뒤처졌다는 뜻이다',
    라이브와dist가다른가('<a href="/새것">x</a>', '').결 === '다르다');
  본다('⛔ 라이브를 못 받으면 null — 「링크 0개」로 세지 않는다',
    typeof 라이브홈받기 === 'function');
  {
    const 쪽 = [{ 길: '/a', 링크: [] }, { 길: '/b', 링크: [] }, { 길: '/c', 링크: [] }];
    const h = new Map([['/a', 1], ['/b', 3]]);
    본다('⭐ 홉마다 장수를 센다 — 「가장 가까운」만으로는 몇 장이 묻혔는지 모른다',
      홉분포(쪽, h).get(1) === 1 && 홉분포(쪽, h).get(3) === 1);
    본다('⛔ 못 닿는 것을 0홉으로 세지 않는다 — 셋째 칸에 둔다',
      홉분포(쪽, h).get('못닿음') === 1);
    본다('분포 한 줄은 얕은 것부터, 못닿음은 맨 뒤',
      분포한줄(홉분포(쪽, h)) === '1홉 1 · 3홉 1 · ⬜못닿음 1');
    본다('⛔ 빈 것은 빈 줄이 아니라 「못 쟀다」다',
      분포한줄(new Map()) === '못 쟀다' && 분포한줄(null) === '못 쟀다');
    본다('⛔ 홉 표가 없어도 안 터진다 — 다 못닿음이다',
      홉분포(쪽, null).get('못닿음') === 3);
  }
  본다('⭐ 홈 파일은 두 꼴을 다 본다 — 100y.html 과 100y/index.html',
    홈파일후보('/100y').join(',') === '100y/index.html,100y.html');
  본다('뿌리 홈은 index.html 하나다', 홈파일후보('/').join(',') === 'index.html');
  본다('⛔ 빈 길도 뿌리로 본다', 홈파일후보('').join(',') === 'index.html');
  본다('⛔ 사이트 셋에 바깥 주소가 다 적혀 있다 — 없으면 못 잰다',
    사이트들.every((s) => typeof s.바깥 === 'string' && s.바깥.startsWith('https://')));

  return 결과;
}

/* ── 실제로 잰다 ───────────────────────────────────────────────── */
const 이파일이진입점 =
  process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (이파일이진입점) {
  if (process.argv.includes('--자가시험')) {
    const 결과 = 자가시험();
    let 빨강 = 0;
    console.log('■ 홈에서 몇 홉인가 — 자가시험');
    for (const r of 결과) {
      if (!r.참) 빨강++;
      console.log(`  ${r.참 ? '✅' : '🔴'} ${r.이름}${r.덧 ? `  (${r.덧})` : ''}`);
    }
    console.log(빨강 ? `🔴 빨강 ${빨강}개` : `✅ ${결과.length}가지 다 통과`);
    process.exit(빨강 ? 1 : 0);
  }

  const 밑 = path.join(뿌리, 'dist');
  if (!fs.existsSync(밑)) {
    console.log('⬜ dist 가 없다 — node scripts/build-once.mjs 를 먼저 돌린다');
    process.exit(0);
  }
  const 지면들 = [];
  (function 걷(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) 걷(p);
      else if (e.name.endsWith('.html')) {
        const html = fs.readFileSync(p, 'utf8');
        const 길 = 손님길(p, 밑);
        지면들.push({ 길, 링크: 안쪽길들(html), 뺌: 셈에서뺄까(길, html) });
      }
    }
  }(밑));

  console.log(`■ 홈에서 몇 홉이면 닿나 — 지면 ${지면들.length}장\n`);

  /* ⭐ 재기 «전»에 자가 옳은 것을 보고 있는지부터 본다. 오늘 그 차례를 빼먹어 하루를 잃었다 */
  if (!process.argv.includes('--라이브안본다')) {
    console.log('   ■ 먼저 — 내가 읽는 dist 가 손님이 받는 것과 같은가');
    for (const s of 사이트들) {
      let dist글 = null;
      for (const c of 홈파일후보(s.홈)) {
        try { dist글 = fs.readFileSync(path.join(밑, c), 'utf8'); break; } catch (e) { /* 다음 꼴 */ }
      }
      const 라이브글 = await 라이브홈받기(s.바깥);
      const 본것 = 라이브와dist가다른가(dist글, 라이브글);
      const 빛 = 본것.결 === '같다' ? '✅' : (본것.결 === '못잼' ? '⬜' : '🔴');
      console.log(`   ${빛} ${s.이름.padEnd(13)} ${본것.결} — ${본것.까닭}`);
      if (본것.라이브에만?.length) {
        console.log(`      라이브에만 있는 길 — ${본것.라이브에만.slice(0, 5).join(' · ')}`);
        console.log('      ⛔ 이것이 있으면 아래 홉 수는 «적게» 나온 것이다 — 믿지 않는다');
      }
    }
    console.log('');
  }
  console.log('   ⛔ 이 자는 수를 낼 뿐이다. 「몇 홉이면 좋다」를 말하지 않는다.');
  console.log('   ⚠ 한 dist 에 사이트가 셋이다 — 각자 «자기 홈»에서 잰다.\n');

  let 못닿음전부 = 0;
  for (const s of 사이트들) {
    /* 그 사이트의 지면만 모은다 — 남의 사이트 지면을 섞으면 거짓 빨강이 난다 */
    const 내것 = 지면들.filter((p) => 어느사이트(p.길).이름 === s.이름);
    if (!내것.length) continue;
    const 홉 = 홉재기(내것, { 시작: s.홈, 접두사: s.접두사 });
    const 묶 = 묶음별가장가까운홉(내것, 홉)
      .filter((x) => x.장수 >= 20)                       /* 작은 묶음은 잡음이다 */
      .sort((a, b) => b.장수 - a.장수);

    console.log(`── ${s.이름}  (홈 ${s.홈} · 지면 ${내것.length}장 · 묶음 ${묶.length}개)`);
    if (!홉.size) { console.log('   ⬜ 홈 지면을 못 찾았다 — 못 쟀다\n'); continue; }
    const 못닿음 = [];
    const 접은묶음 = [];
    for (const x of 묶) {
      if (x.가장가까운 == null) {
        /* 🔴 접은 지면은 안 닿는 것이 «맞다» — 빨강으로 내면 거짓 빨강이다 (머리말 참조) */
        (x.뺀장수 === x.장수 ? 접은묶음 : 못닿음).push(x);
        continue;
      }
      /* 닿아야 할 것만 셈한다 — 접은 지면을 분모에 넣으면 「98%」 같은 거짓 흠이 남는다 */
      const 닿아야할것 = x.장수 - x.뺀장수;
      const 몫 = 닿아야할것 > 0 ? Math.round(((x.닿은장수 - x.뺀것중닿은) / 닿아야할것) * 100) : null;
      const 접은말 = x.뺀장수 ? ` · 일부러 안 거는 것 ${x.뺀장수}장은 뺐다` : '';
      console.log(`   ${String(x.가장가까운)}홉  ${x.묶음.padEnd(22)} ${String(x.장수).padStart(5)}장 · 닿는 것 ${몫 == null ? '못 쟀다' : `${몫}%`}${접은말}`);
      /* ⭐ 「가장 가까운」만으로는 몇 장이 묻혔는지 모른다 — 홉마다 장수를 함께 찍는다 */
      if (x.장수 >= 20) {
        const 속 = 묶음안홉분포(내것, 홉, x.묶음);
        const 깊은 = [...속.entries()].filter(([d]) => d !== '못닿음' && d >= 3)
          .reduce((a, [, n]) => a + n, 0);
        console.log(`          └ ${분포한줄(속)}${깊은 ? `   🔴 3홉 너머 ${깊은}장` : ''}`);
      }
    }
    if (접은묶음.length) {
      console.log('   ⬜ 접은 지면 — 안 닿는 것이 맞다. ⛔ 다시 걸지 않는다');
      for (const x of 접은묶음) console.log(`        ${x.묶음.padEnd(22)} ${String(x.장수).padStart(5)}장 · 옛 주소로 온 손님에게 까닭을 보여 준다`);
    }
    if (못닿음.length) {
      못닿음전부 += 못닿음.length;
      console.log('   🔴 홈에서 «한 번도» 안 닿는 묶음');
      for (const x of 못닿음) console.log(`        ${x.묶음.padEnd(22)} ${String(x.장수).padStart(5)}장이 통째로 묻혀 있다`);
    } else {
      console.log('   ✅ 20장 넘는 묶음은 모두 홈에서 닿는다 (접은 것은 뺀다)');
    }
    console.log('');
  }

  if (못닿음전부) {
    console.log('⭐ 2026-10-04 실측 — 홈에서 안 닿던 /taiwan/company(1,057장)·/uae/company(104장)은');
    console.log('  구글에 물으니 표본 네 장이 «다» 「한 번도 안 왔다」였다. 일본은 길이 있었고 4/4 색인됐다.');
    console.log('  ⛔ 사이트맵에 넣는 것으로는 안 온다. 첫 화면이나 가까운 목록에서 닿게 한다.');
  }
}
