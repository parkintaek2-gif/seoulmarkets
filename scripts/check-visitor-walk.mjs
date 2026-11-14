/**
 * **손님으로 한 바퀴 걷는다.** 빌드 결과(dist)를 읽는 사람 눈으로 본다.
 *
 * ── 왜 ─────────────────────────────────────────────────────────
 * 2026-08-08 04:0x. 두 시간 동안 기사를 열두 편 내면서 **지면을 한 번도 안 걸어 봤다.**
 * 걸어 보니 `/contact`·`/subscribe` 꼬리말에 회사 이름이 **`[object Object]`** 로 나가고 있었다.
 * `{PUBLISHER}` 가 객체인데 그대로 찍었다. 빌드도 검사도 통과하는 종류의 잘못이다 —
 * **문법이 맞고 뜻이 틀린 것**은 사람이 화면을 봐야 걸린다. 그 「사람이 보는 일」을 자로 만든다.
 *
 * ── 무엇을 보나 ───────────────────────────────────────────────
 *   ① 죽은 링크 — 지면끼리 거는 길이 실제로 있나
 *   ② 얇은 지면 — 본문이 너무 짧으면 손님이 헛걸음한다
 *   ③ 나가는 길 — 기사에서 다른 곳으로 갈 수 있나
 *   ④ 머리말 — title · description · canonical (검색이 이걸 본다)
 *   ⑤ **화면에 새는 것** — undefined · NaN · [object Object]
 *
 * ⛔ 「보기 좋은가」는 안 본다. 그건 사람 몫이다. 여기서 보는 것은 **깨졌나**뿐이다.
 *
 * 쓰는 법: node scripts/check-visitor-walk.mjs   (dist 가 있어야 한다)
 */
import fs from 'node:fs';
import path from 'node:path';
/* ⭐ 「본문에 문이 있나」의 무늬는 **한 곳에만** 둔다. 2026-08-22 에 그 규칙을 저쪽에서만
   고쳐 이 자가 열 편을 거짓으로 울렸다(전체 주소로 건 문을 못 셌다). 가져다 쓴다 */
import { 본문에링크있나 } from './lib/kcw-body-links.mjs';

const D = 'dist/wikitip';
/** ⛔ 빌드 format 이 `file` 이라 첫 화면은 `dist/wikitip/index.html` 이 아니라 **`dist/wikitip.html`** 이다.
    이걸 몰라 처음 돌렸을 때 25장 전부 「죽은 링크 /」로 울렸다. 잣대가 틀린 것이었다. */
const 첫화면 = 'dist/wikitip.html';

/**
 * 값은 **소스에서 읽는다.** 자에 박으면 자와 지면이 어긋날 자리가 하나 더 생긴다.
 *
 * ⛔ 처음 쓸 때 `\d` 가 `d` 로 들어가 **빈 배열**이 나왔다. 그러면 아래에서
 *    `new RegExp('')` 이 되어 **무엇에나 맞는 자**가 된다 — 규칙이 늘 통과한다.
 *    오늘 하루 종일 잡아 온 꼴을 자기 손으로 만들 뻔했다. **못 읽으면 크게 선다.**
 */
export function 값읽기() {
  const s = fs.readFileSync('src/data/wikitip-price.ts', 'utf8');
  const v = [...s.matchAll(/^export const (?:ONE_OFF_USD|MONTHLY_USD) = (\d+);/gm)].map((m) => m[1]);
  if (v.length !== 2) {
    throw new Error(`src/data/wikitip-price.ts 에서 값을 ${v.length}개 읽었다. 둘이라야 한다 — 자가 무엇과 맞출지 모른다`);
  }
  return v;
}

const 얇은기준 = 900;   // 자 — 이보다 짧으면 손님이 읽을 것이 없다
const 나가는길기준 = 3; // 기사 하나에서 다른 곳으로 가는 길

/** ⚠ 엔티티를 **지우지 않고 되돌린다.** 통째로 지웠더니 `Film &amp; television` 이
    「Film  television」이 되어 갈래 검사가 늘 헛울었다. 자주 쓰는 것만 되돌린다. */
const 되돌림 = { '&amp;': '&', '&#39;': "'", '&quot;': '"', '&lt;': '<', '&gt;': '>', '&middot;': '·', '&nbsp;': ' ' };
export function 본문(h) {
  return h.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, (m) => 되돌림[m] ?? ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
export function 링크(h) {
  return [...new Set([...h.matchAll(/href="([^"]+)"/g)].map((m) => m[1]))];
}
/**
 * **접두사 밖에 사는 공유 경로.**
 *
 * 🔴 [2026-09-03] 이 자가 기사 지면 180장에 「죽은 링크 `/_astro/_..CxA39zMW.css`」를
 *   달았다. 그 파일은 **있다** — `dist/_astro/` 에 있다. 세 사이트가 자산 한 벌을
 *   나눠 쓰기 때문에 `dist/wikitip/_astro/` 는 아예 없는 폴더다.
 *   `server.mjs` 313줄의 «공유경로»가 이 경로들을 접두사 밖에서 찾는다.
 * ⛔ 180장이 다 빨강이면 그 안의 «진짜» 죽은 링크 하나를 아무도 못 본다
 *   (실제로 `which-ranking.html` 의 `/title/i-am-solo` 가 그 아래 묻혀 있었다).
 * ⚠ 그렇다고 뿌리를 «모든» 주소에 열지 않는다 — `/about` 을 뿌리에서 찾으면
 *   SeoulMarkets 의 about 이 잡혀 «없는 지면이 살아 있다»고 나온다. 그것이 더 나쁘다.
 *   서버가 접두사 밖으로 빼는 그 꼴만 뿌리에서도 찾는다.
 */
export const 공유경로 = /^\/(_astro|_image|_worker|@vite|assets)\/|^\/admin(\/|$)|^\/v1\/subscribe$|^\/api\/comments$|^\/comments-widget\.js$|^\/deploy-stamp\.txt$/;

/**
 * **구글에 담지 말라고 이미 말한 지면인가.**
 *
 * 🔴 [2026-09-03] 이 자가 열아홉 줄을 「description 이 없다」·「canonical 이 없다」로 울렸다.
 *   전부 `noindex` 다 — 띠 방 열둘 · 내린 작품 넷 · 내부 소리검토 하나.
 *   description 과 canonical 은 **검색이 읽는 것**이다. 담지 말라고 한 지면에 그것이 없는 것은
 *   흠이 아니라 맞는 상태다. 맞는 상태를 빨강으로 부르면 사람이 검사를 끈다.
 * ⛔ 주소를 손으로 봐주지 않는다. 재서 가른다 — noindex 를 떼는 날 저절로 다시 울린다.
 *   (`check-two-clicks`·`check-kcw-orphan-pages` 와 같은 규칙이다)
 * ⚠ 죽은 링크·[object Object]·title 은 **noindex 여도 그대로 잡는다** — 그건 손님이 겪는 흠이다.
 */
export function 색인안함(글) {
  return /name=["']robots["'][^>]*noindex/i.test(String(글 ?? '').slice(0, 4000));
}

/** 우리 안쪽 주소가 실제 파일로 있나. */
export function 있나(u, 있음 = fs.existsSync) {
  if (/^https?:|^mailto:|^#/.test(u)) return true;
  const p = u.split('#')[0].split('?')[0];
  if (p === '/') return 있음(첫화면);
  const 후보 = [`${D}${p}.html`, `${D}${p}/index.html`, `${D}${p}`];
  /* 공유 경로는 뿌리(dist/)에도 있다 — 서버가 거기서 찾는다 */
  if (공유경로.test(p)) 후보.push(`dist${p}`);
  return 후보.some((x) => 있음(x));
}

/**
 * 🔴🔴 [2026-11-14 · 5번] **재는 태그를 한 꼴로만 찾다가 「없는 것을 있다고 적었다」를 냈다.**
 *
 * 지면이 분석 태그를 «자바스크립트로 심는» 꼴로 바뀌었다 —
 *   `var gaId = "G-B06MWDY5K8";` … `src = "…/gtag/js?id=" + gaId;`
 * 그런데 이 자는 `?id=G-…` 라는 **글자 그대로**만 찾고 있었다. 그래서 태그가 멀쩡히
 * 도는데 「태그가 없다」로 읽고, /privacy 가 **거짓말을 한다**고 막았다.
 * 그 하나 때문에 KCW 배포가 섰다.
 *
 * ⛔ 「안 보인다」를 「없다」로 읽지 않는다. 자가 볼 줄 아는 꼴이 좁았을 뿐이다.
 * ⚠ 그래도 느슨해지지 않는다 — 측정 ID 를 «지면에서 읽어» /privacy 와 맞춰 보는
 *   본래 규칙은 그대로다. 읽는 길만 둘로 넓힌다.
 */
export function 재는ID찾기(글) {
  const g = String(글 ?? '');
  /* ① 글자 그대로 박은 꼴 — <script src="…/gtag/js?id=G-XXXX"> */
  const 곧바로 = /googletagmanager\.com\/gtag\/js\?id=(G-[A-Z0-9]+)/.exec(g);
  if (곧바로) return 곧바로[1];
  /* ② 자바스크립트로 심는 꼴 — gaId = "G-XXXX" 를 쓰고 주소를 이어 붙인다 */
  const 심는꼴 = /gaId\s*=\s*["'](G-[A-Z0-9]+)["']/.exec(g);
  if (심는꼴 && /googletagmanager\.com\/gtag\/js/.test(g)) return 심는꼴[1];
  return null;   /* ⛔ 못 찾았으면 null 이다. 「없다」가 아니라 «이 자가 못 봤다»도 된다 */
}

if (process.argv[1] && process.argv[1].endsWith('check-visitor-walk.mjs')) {
  let 시험 = 0; let 통과 = 0;
  const 자가 = (이름, 참) => { 시험++; if (참) 통과++; else console.log(`  ⛔ 자가시험 실패 — ${이름}`); };
  자가('태그를 걷어 낸다', 본문('<p>a <b>b</b></p>') === 'a b');
  자가('style 안은 본문이 아니다', 본문('<style>x{y:1}</style><p>a</p>') === 'a');
  자가('링크를 겹치지 않게 뽑는다', 링크('<a href="/a">1</a><a href="/a">2</a>').length === 1);
  자가('바깥 주소는 늘 살아 있다고 본다', 있나('https://x.com', () => false));
  자가('첫 화면은 wikitip.html 로 찾는다', 있나('/', (p) => p === 첫화면));
  자가('없는 주소는 잡는다', !있나('/nope', () => false));
  자가('noindex 를 읽는다', 색인안함('<meta name="robots" content="noindex, follow">'));
  자가('담는 지면은 예외가 아니다', !색인안함('<meta name="robots" content="index,follow">'));
  자가('⛔ 못 읽으면 예외로 안 만든다', !색인안함(undefined));
  자가('공유 자산은 뿌리에서도 찾는다', 있나('/_astro/x.css', (q) => q === 'dist/_astro/x.css'));
  자가('⛔ 보통 지면은 뿌리에서 안 찾는다 — 남의 사이트 지면이 잡힌다',
    !있나('/about', (q) => q === 'dist/about.html'));
  /* 🔴 [2026-11-14] 재는 태그를 두 꼴 다 알아보나 */
  자가('글자 그대로 박은 꼴을 읽는다',
    재는ID찾기('<script src="https://www.googletagmanager.com/gtag/js?id=G-ABC12345"></script>') === 'G-ABC12345');
  자가('자바스크립트로 심는 꼴도 읽는다',
    재는ID찾기('var gaId = "G-B06MWDY5K8"; s.src = "https://www.googletagmanager.com/gtag/js?id=" + gaId;') === 'G-B06MWDY5K8');
  자가('⛔ ID 만 있고 주소가 없으면 안 읽는다 — 안 쓰는 값이 남아 있을 수 있다',
    재는ID찾기('var gaId = "G-B06MWDY5K8";') === null);
  자가('⛔ 아무것도 없으면 null 이다', 재는ID찾기('<p>hi</p>') === null);
  자가('⛔ 빈 값에도 안 죽는다', 재는ID찾기(null) === null);
  자가('값을 소스에서 둘 읽는다', 값읽기().length === 2);
  자가('값이 숫자다', 값읽기().every((v) => /^\d+$/.test(v)));
  console.log(`손님 걸음 검사 — 자가시험 ${시험}건 중 ${통과}건 통과`);
  if (통과 !== 시험) process.exit(1);

  if (!fs.existsSync(D)) { console.error(`⛔ ${D} 가 없다 — node scripts/build-once.mjs 를 먼저 돌린다`); process.exit(1); }
  /* 🔴 2026-08-09 04:0x — **하위 폴더를 안 팠다.** 그날 `/market/<나라>` 93장을 냈는데
     93장 전부에 죽은 링크(`/methodology`)가 들어간 채 **라이브로 나갔다.**
     이 자는 `home-abroad.html` 한 장만 잡았다 — 나머지 93장은 못 본 자리에 있었다.
     ⛔ 오늘 이 병을 다섯 번째 만난다(열쇠 · 두 번 안에 닿나 · 손으로 박은 수 · 검색 채비 · 여기).
     ⭐ 판다. `article/` 은 아래에서 따로 센다. */
  const 지면 = [];
  {
    const 판다 = (d, 앞) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        if (e.isDirectory()) {
          if (e.name === 'article') continue;
          판다(path.join(d, e.name), `${앞}${e.name}/`);
          continue;
        }
        if (e.name.endsWith('.html')) 지면.push(`${앞}${e.name}`);
      }
    };
    판다(D, '');
  }
  /**
 * 🔴 2026-08-22 — 이 자가 두 번 연달아 **ENOENT 로 터졌다**
 *   (`dist/wikitip/market/egypt.html`, 그다음 `dist/wikitip/title/oh-my-ghost-clients.html`).
 *   그런데 깨진 것이 아니었다. **다른 유닛이 같은 저장소에서 빌드를 돌리는 중**이었고,
 *   아스트로는 빌드를 시작할 때 dist 를 비운다. 내가 그 빈 순간을 읽은 것이다.
 *   ⛔ 그것을 「죽은 링크」로 적으면 **없는 흠을 고치러 사람이 나선다.**
 *   ⭐ 「깨졌다」와 「못 쟀다」를 가른다 — 갈래 디렉터리가 아예 없으면 못 쟀다다.
 * ⚠ 빌드가 끝난 뒤 다시 돌리면 잰다. 침묵하지 않고 못 쟀다고 말한다.
 */
const 있어야할것 = ['title', 'market', 'firm', 'article', 'born-on'];
const 빠진갈래 = 있어야할것.filter((d) => !fs.existsSync(`${D}/${d}`));
if (빠진갈래.length) {
  console.log(`⚠ 못 쟀다 — dist 가 다 안 찼다. 빌드가 도는 중일 수 있다`);
  if (빠진갈래.length) console.log(`   없는 갈래: ${빠진갈래.join(', ')}`);
  console.log('   ⛔ 이것은 깨진 것이 아니다. 빌드가 끝난 뒤 다시 돌린다.');
  process.exit(0);
}

const 기사디렉 = `${D}/article`;
  const 기사 = fs.existsSync(기사디렉) ? fs.readdirSync(기사디렉).filter((f) => f.endsWith('.html')) : [];

  const 문제 = [];
  for (const [묶음, 목록, 앞] of [['지면', 지면, D], ['기사', 기사, 기사디렉]]) {
    for (const f of 목록) {
      const h = fs.readFileSync(path.join(앞, f), 'utf8');
      const t = 본문(h);
      const 이름 = 묶음 === '기사' ? `article/${f}` : f;
      const 안쪽 = 링크(h).filter((u) => !/^https?:|^mailto:|^#/.test(u));

      /* 404 지면은 원래 얇고 canonical 이 없다 — 손님이 머무는 자리가 아니다. */
      const 예외 = f === '404.html' || 색인안함(h);
      if (!예외 && t.length < 얇은기준) 문제.push(`${이름} — 본문 ${t.length}자. ${얇은기준}자보다 얇다`);
      const 깨짐 = 안쪽.filter((u) => !있나(u));
      if (깨짐.length) 문제.push(`${이름} — 죽은 링크 ${깨짐.length}개: ${깨짐.slice(0, 3).join(' · ')}`);
      if (!/<title>[^<]{10,}<\/title>/.test(h)) 문제.push(`${이름} — title 이 없거나 열 자보다 짧다`);
      if (!예외 && !/name="description" content="[^"]{40,}"/.test(h)) 문제.push(`${이름} — description 이 없거나 짧다`);
      if (!예외 && !/rel="canonical"/.test(h)) 문제.push(`${이름} — canonical 이 없다`);
      /* ⑤ 화면에 새는 것 — 이 검사를 만든 까닭이다 */
      for (const 샌것 of ['[object Object]', 'undefined', 'NaN']) {
        if (t.includes(샌것)) 문제.push(`🔴 ${이름} — 화면에 «${샌것}» 이 나간다`);
      }
      if (묶음 === '기사' && 안쪽.filter((u) => u.startsWith('/')).length < 나가는길기준) {
        문제.push(`${이름} — 나가는 길이 ${안쪽.filter((u) => u.startsWith('/')).length}개뿐이다`);
      }
    }
  }

  /* ── 첫 화면이 우리 자산을 보여 주나 ──
     ⛔ 2026-08-08 06:0x. 라이브 첫 화면을 재 보니 **36편 중 3편**만 걸려 있었다.
        8/7 에 「15편 중 3편」이라고 적어 두고 **수만 세고 안 늘렸다.**
        기사가 가장 큰 자산인데 손님은 첫 화면에서 셋만 봤다.
     ⚠ 「몇 편」을 손으로 박지 않는다 — **전체 편수에 비례**해서 본다. 기사가 늘면 기준도 는다. */
  {
    const 첫 = fs.existsSync(첫화면) ? fs.readFileSync(첫화면, 'utf8') : '';
    const 건기사 = new Set([...첫.matchAll(/href="(\/article\/[^"]+)"/g)].map((m) => m[1]));
    /*
     * ⛔ 2026-08-08 15:5x. 여기가 `Math.min(8, …)` 이었다 — **바닥이 8에 못박혀 있었다.**
     *    바로 위 주석에는 「전체 편수에 비례해서 본다」고 적혀 있다. **주석과 코드가 달랐다.**
     *    기사가 36 → 43 으로 느는 동안 첫 화면은 계속 8편이었고 자는 한 번도 안 울었다.
     *    아침에 이름 붙인 꼴 그대로다 — 「검사가 있다 ≠ 재고 있다」.
     * ⚠ 이제 정말로 비례한다. 기사가 늘면 바닥도 는다. 갈래 칸이 다섯을 저절로 채우니 8이 아래끝이다.
     */
    const 최소 = Math.max(8, Math.ceil(기사.length * 0.25));
    if (건기사.size < 최소) {
      문제.push(`🔴 첫 화면이 기사 ${건기사.size}편만 건다 — 전체 ${기사.length}편 중. 적어도 ${최소}편은 보여야 한다`);
    }
    /* 갈래 넓이 — 기사가 있는 갈래는 첫 화면에 이름이 나와야 한다 */
    const 갈래 = new Set();
    for (const f of fs.readdirSync('content/kculturewire').filter((x) => x.endsWith('.md'))) {
      const m = fs.readFileSync(path.join('content/kculturewire', f), 'utf8').match(/^category:\s*(\w+)/m);
      if (m) 갈래.add(m[1]);
    }
    /* 🔴 2026-08-10 — 갈래를 새로 짰다(사장님: 「기존 카테고리는 촌스럽다」).
       이 표가 옛 이름을 들고 있어서 **첫 화면에 있는 Stars 를 없다고** 말했다.
       ⛔ 자에 이름을 손으로 적으면 이렇게 낡는다. 스키마와 같은 말을 쓴다. */
    const 표기 = {
      stars: 'Stars', titles: 'Titles', industry: 'Industry', tradition: 'Tradition',
    };
    const 본문첫 = 본문(첫);
    for (const g of 갈래) {
      const 말 = 표기[g] ?? g;
      if (!본문첫.includes(말)) 문제.push(`첫 화면이 «${말}» 갈래를 안 보여 준다 — 손님이 그 축이 있는 줄 모른다`);
    }
  }

  /* ── 기사 **본문**에서 나가는 길이 있나 ──
     ⛔ 2026-08-08 06:3x. 2번이 물어서 재 보니 **36편 중 31편**에 본문 링크가 하나도 없었다.
        위 ③ 규칙은 꼬리말·이웃기사까지 세어서 **늘 통과했다** — 재는 자리가 틀렸다.
     ⭐ 검색으로 온 사람은 첫 화면을 안 거치고 기사 한 장에 곧장 떨어진다.
        거기서 나갈 길이 없으면 한 장만 보고 간다. 그래서 **본문**을 따로 잰다.
     ⚠ 앞말(frontmatter)은 뺀다. 거기 적힌 pages 는 지면이 거는 것이지 손님이 누르는 것이 아니다. */
  {
    const CD = 'content/kculturewire';
    if (fs.existsSync(CD)) {
      /**
       * 🔴🔴 2026-08-22 — 이 자가 기사 10편을 「본문에 문이 없다」고 불렀는데, 세 편을 열어 보니
       *   **전부 전체 주소로 문이 있었다**(`](https://www.kculturewire.com/…)`).
       *   같은 날 `fix-kcw-body-doors.mjs` 에서 똑같은 흠을 고치고 이렇게 적어 뒀다 —
       *   「⭐ 우리 집 주소로 건 링크도 문이다. 둘 다 센다」. **그 고침이 이 자까지 안 따라왔다.**
       *   ⭐ 회사 규칙 ⑤ — 하나를 고치면 인용한 곳까지 따라간다. 이번엔 자가 두 곳이었다.
       *   ⛔ 그래서 무늬를 여기 또 적지 않고 **그 파일에서 가져다 쓴다.** 한 곳만 고치면 둘이 같이 산다.
       * ⚠ CRLF 로 저장된 편이 섞여 있어 앞말 떼기도 그쪽 함수를 쓴다(`\n` 만 보면 한 편을 놓친다).
       */
      const 없는 = [];
      for (const f of fs.readdirSync(CD).filter((x) => x.endsWith('.md'))) {
        const 원본 = fs.readFileSync(path.join(CD, f), 'utf8');
        if (!본문에링크있나(원본)) 없는.push(f.replace('.md', ''));
      }
      if (없는.length) {
        문제.push(`🔴 기사 ${없는.length}편의 **본문**에 나가는 길이 하나도 없다: ${없는.slice(0, 3).join(' · ')}${없는.length > 3 ? ` 외 ${없는.length - 3}편` : ''}`);
      }
    }
  }

  /* ── 사는 길이 이어지나 ──
     2번 지시(2026-08-08 07:3x): 「손님이 되어 /data 에서 한 벌을 사는 데까지 걸으십시오.
     누르는 곳마다 도착지가 있나 · 값이 보이나 · 신청이 실제로 접수되나」
     ⛔ 07:5x 에 걸어 보니 막힌 칸이 셋이었다 —
        ① 첫 화면 **본문**에 /data 가 없었다(꼬리말에만) ② 언제 답하는지 안 적었다
        ③ 오늘 바로 건넬 수 있는 벌을 만들어 놓고 **지면이 그것을 몰랐다**
     ⚠ 값은 아직 사장님 손이라 「값이 있나」는 안 본다. **값이 없다고 말하나**를 본다. */
  {
    const 첫 = fs.existsSync(첫화면) ? fs.readFileSync(첫화면, 'utf8') : '';
    const 본문부 = 첫.slice(0, 첫.lastIndexOf('<footer'));
    if (!본문부.includes('href="/data"')) {
      문제.push('🔴 첫 화면 **본문**에 /data 로 가는 길이 없다 — 꼬리말까지 안 내리는 손님은 자료를 파는 줄 모른다');
    }
    const dp = `${D}/data.html`;
    if (!fs.existsSync(dp)) {
      문제.push('🔴 /data 가 없다 — 파는 것에 닿을 주소가 사라졌다');
    } else {
      const t = 본문(fs.readFileSync(dp, 'utf8'));
      const 있어야 = [
        [/reply within/i, '언제 답하는지'],
        [/ready to hand over today/i, '오늘 바로 건넬 수 있는 것이 무엇인지'],
        /*
         * ⛔ 2026-08-08 13:2x. 여기가 「not put a price here」(값이 아직 없다)를 **요구**하고 있었다.
         *    12:3x 2번 지시로 그 문장을 지웠더니 **자가 지면을 틀렸다고 했다.** 지면이 맞고 자가 낡았다.
         *    2번: 「미정이라고 적지 마십시오. **곧 엽니다 · 열리면 알려 드릴까요**로 두십시오」
         * ⚠ 그래서 재는 것을 뒤집는다 — 「없다고 말하나」가 아니라 **「언제 살 수 있나를 말하나」**다.
         */
        /*
         * ⛔ 2026-08-08 16:0x. **값이 정해졌다**(2번 15:5x). 자를 또 뒤집는다 —
         *    12:3x 에는 「곧 엽니다」를 요구했고, 이제는 **값 자체**를 요구한다.
         *    ⚠ 값을 자에 손으로 안 박는다. `wikitip-price.ts` 에서 읽어 지면과 맞댄다 —
         *       박으면 값을 바꿀 때 자와 지면이 어긋나고, 자가 지면을 틀렸다고 한다.
         *       오늘만 그 꼴을 두 번 겪었다.
         */
        [new RegExp(값읽기().map((v) => `\\$${v}`).join('|')), '값'],
        [/free|opening month/i, '여는 달이 무료라는 것'],
        [/mailto:/i, null],
      ];
      for (const [re, 무엇] of 있어야) {
        if (무엇 && !re.test(t)) 문제.push(`/data 가 «${무엇}»를 말하지 않는다 — 손님이 기다릴지 딴 데를 볼지 못 정한다`);
      }
      if (!/mailto:/i.test(fs.readFileSync(dp, 'utf8'))) {
        문제.push('🔴 /data 에 신청할 곳이 없다 — 읽고 나서 갈 데가 없다');
      }
      /* ⛔ 「미정」을 지면에 안 적는다(2번 지시). 손님이 읽는 것은 「언제 살 수 있나」다 */
      for (const 말 of [/not set/i, /undecided/i, /\bTBD\b/, /to be decided/i]) {
        if (말.test(t)) 문제.push(`🔴 /data 가 «${말.source}» 라고 적었다 — 「미정」은 안 적는다`);
      }
      /* 무엇이 들어 있나를 **수로** 말하나. 값을 못 적는 동안 이게 사는 판단의 전부다 */
      for (const [re, 무엇] of [[/\bTables\b/, '파일 수'], [/\bRows\b/, '줄 수'], [/\bFormat\b/, '어떤 꼴'], [/\bRefreshed\b/, '갱신 주기']]) {
        if (!re.test(t)) 문제.push(`/data 가 «${무엇}»를 안 적는다 — 값이 없는 동안 이게 판단의 전부다`);
      }
    }
  }

  /* ── 공유되는 순간 ──
     2번 지시(2026-08-08 08:4x): 「기사 36편의 og:image 가 전부 한 장입니다. 기사마다 다른 카드를 다십시오」
     ⛔ 두 가지가 같이 틀려 있었다 —
        ① `/og.svg` 였다. **SVG 는 카카오톡·X·페이스북이 안 그린다** — 공유하면 그림이 아예 안 뜬다
        ② 36편이 같은 그림이라 떠도 다 똑같다. 유입의 첫 칸이 비어 있었다
     ⚠ 「og:image 가 있나」로는 못 잡는다. 있었는데 안 뜨는 것이었다.
        **확장자 · 서로 다른가 · 파일이 실제로 있나** 셋을 따로 잰다. */
  {
    const 카드들 = new Map();
    for (const f of 기사) {
      const h = fs.readFileSync(path.join(기사디렉, f), 'utf8');
      const m = h.match(/property="og:image" content="([^"]+)"/);
      const 이름 = `article/${f}`;
      if (!m) { 문제.push(`🔴 ${이름} — og:image 가 없다. 공유하면 그림 없이 나간다`); continue; }
      const 주소 = m[1];
      if (!/\.png$/i.test(주소)) {
        문제.push(`🔴 ${이름} — og:image 가 «${주소.split('/').pop()}» 다. PNG 라야 카카오톡·X·페이스북이 그린다`);
      }
      /* 절대 주소가 아니면 저 셋은 못 따라온다 */
      if (!/^https:\/\//.test(주소)) 문제.push(`🔴 ${이름} — og:image 가 절대 주소가 아니다: ${주소}`);
      /* 지면이 가리키는 파일이 실제로 나갔나. `public/wikitip/*` 가 `dist/wikitip/*` 로 복사된다 */
      const 안쪽길 = 주소.replace(/^https:\/\/www\.kculturewire\.com/, '');
      if (안쪽길.startsWith('/') && !fs.existsSync(path.join(D, 안쪽길.slice(1)))) {
        문제.push(`🔴 ${이름} — og:image 가 가리키는 ${안쪽길} 이 dist 에 없다. 공유하면 404 다`);
      }
      카드들.set(이름, 주소);
    }
    /* 서로 다른가 — 이게 2번이 물은 것이다 */
    const 가짓수 = new Set(카드들.values()).size;
    if (기사.length && 가짓수 < 카드들.size) {
      const 겹친 = [...카드들.values()].filter((v, i, a) => a.indexOf(v) !== i);
      문제.push(`🔴 기사 ${카드들.size}편이 카드 ${가짓수}가지를 나눠 쓴다 — 겹치는 것: ${[...new Set(겹친)].slice(0, 2).join(' · ')}`);
    }
  }

  /* ── 재면 밝힌다 ──
     2026-08-08 11:5x. 이 사이트에 **분석 코드가 한 줄도 없었다**(소스·빌드·라이브 0건).
     붙이기로 했는데, 붙이는 순간 **쿠키와 접속기록이 생긴다.**
     ⛔ 재는 것과 밝히는 것은 **한 덩어리다.** 하나만 있으면 선다 —
        태그만 있고 지면이 없으면 몰래 재는 것이고,
        지면만 있고 태그가 없으면 없는 것을 있다고 적은 것이다. 둘 다 거짓이다.
     ⚠ 측정 ID 를 검사에 손으로 박지 않는다. **지면에 나간 것에서 읽어** 서로 맞춘다. */
  {
    const 첫 = fs.existsSync(첫화면) ? fs.readFileSync(첫화면, 'utf8') : '';
    const 잰ID = 재는ID찾기(첫);
    const pp = `${D}/privacy.html`;
    if (잰ID) {
      if (!fs.existsSync(pp)) {
        문제.push('🔴 분석 태그를 달아 놓고 /privacy 가 없다 — 밝히지 않고 재는 것이다');
      } else {
        const t = 본문(fs.readFileSync(pp, 'utf8'));
        if (!t.includes(잰ID)) 문제.push(`🔴 /privacy 가 실제로 쓰는 측정 ID(${잰ID})를 안 적는다`);
        for (const [말, 무엇] of [[/cookie/i, '쿠키가 생긴다는 것'], [/switch the analytics off|opt-out|block/i, '끄는 법']]) {
          if (!말.test(t)) 문제.push(`/privacy 가 «${무엇}»을 말하지 않는다`);
        }
      }
      /* 꼬리말에서 닿아야 한다. 만들고 문을 안 내면 없는 것과 같다 */
      if (!첫.includes('href="/privacy"')) 문제.push('🔴 첫 화면에서 /privacy 로 가는 길이 없다');
    } else if (fs.existsSync(pp)) {
      const t = 본문(fs.readFileSync(pp, 'utf8'));
      if (/Google Analytics/i.test(t)) {
        문제.push('🔴 /privacy 는 분석을 쓴다고 적었는데 지면에 태그가 없다 — 없는 것을 있다고 적었다');
      }
    }
  }

  console.log(`걸어 본 것 — 지면 ${지면.length}장 · 기사 ${기사.length}편`);
  if (문제.length) {
    console.log(`\n⛔ 손님 걸음 — ${문제.length}건`);
    for (const s of 문제) console.log(`   · ${s}`);
    process.exit(1);
  }
  console.log('✅ 걸리는 것 0건 — 죽은 링크·얇은 지면·새는 값 없음');
}
