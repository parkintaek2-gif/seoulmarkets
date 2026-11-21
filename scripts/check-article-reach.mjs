/**
 * 기사가 **어느 지면에서도 못 닿는 채로** 나가는 것을 막는다. (npm test)
 *
 * ── 왜 ─────────────────────────────────────────────────────────
 * 2026-08-07, 기사 12편 중 **7편이 아무 지면에도 안 걸려** 있었다.
 * 첫 화면은 최신 3편만 세우고 사이트맵에는 있지만,
 * **사람이 검색해서 들어오는 자리는 지면**이다. 만들고 문을 안 내면 없는 것과 같다.
 *
 * 관계는 기사 앞말 `pages` 에 있고 지면은 그것을 읽는다(KcwRelatedArticles).
 * 이 검사는 그 사슬이 끊긴 곳을 찾는다.
 *
 * ── 무엇을 보나 ───────────────────────────────────────────────
 * ① 기사의 `pages` 에 적힌 주소에 지면 파일이 실제로 있나
 * ② 그 지면이 KcwRelatedArticles 를 걸고 있나 — 안 걸면 적어도 안 보인다
 * ③ `pages` 가 빈 기사가 있나 — 경고만 한다. 「어느 지면 자료도 안 썼다」가 참일 수 있다
 *
 * ⛔ 기사 내용이 그 지면과 맞는지는 **안 본다.** 그건 사람이 할 일이다.
 *    여기서 하는 말은 **닿을 수 있나**뿐이다.
 *
 * 남의 기사·지면이 걸리면 고치지 말고 그 자리에 알린다.
 */
import fs from 'node:fs';
import path from 'node:path';

const CD = 'content/kculturewire';
const PD = 'src/pages/wikitip';

const 문제 = [];
const 경고 = [];

/** 앞말에서 pages 목록을 뽑는다. 컬렉션을 안 거치고 글자로 읽는다 — 빌드 없이 돌아야 한다. */
const pages를읽는다 = (src) => {
  /*
   * ⛔ 2026-08-08 11:2x. 원래 `\s+-` 로 읽었다. `\s` 는 줄바꿈까지 먹어서
   *    **CRLF 로 저장된 기사 하나에서 통째로 안 읽혔다** — `korean-netflix-titles-one-body`
   *    한 편이 「pages 가 비었다」로 나왔는데 실제로는 /actors 와 /titles 가 적혀 있었다.
   *    39편 중 그 한 편만 CRLF 였고, 자가 없는 잘못을 만들어 낸 것이다.
   *    줄 안의 빈칸만 먹도록 `[^\S\r\n]` 로 좁히고 `\r?\n` 을 받는다.
   */
  const m = src.match(/^pages:[^\S\r\n]*\r?\n((?:[^\S\r\n]+-[^\S\r\n]+.*\r?\n)+)/m);
  if (!m) return null;
  return [...m[1].matchAll(/-[^\S\r\n]+"?([^"\r\n]+?)"?[^\S\r\n]*\r?$/gm)].map((x) => x[1].trim());
};

/**
 * 앞말 길이 — 스키마가 정한 한계다(`src/content.config.ts`, 2번 파일).
 * ⛔ 2026-08-08 에 **두 번** 이 한계를 넘겨 빌드가 죽었다. 스키마가 잡아 주긴 하는데
 *    빌드가 1분 돌고 나서 죽는다. 여기서 1초에 잡는다. 자리는 같고 값이 싸다.
 * ⚠ 한계를 여기에 손으로 적는다 — 스키마는 2번 것이라 안 건드린다.
 *    스키마가 바뀌면 이 수도 같이 고친다. 그래서 어디를 봐야 하는지 위에 적어 둔다.
 */
const 앞말한계 = { title: 120, dek: 240 };
/* 갈래에 쓸 수 있는 값 — **스키마 파일에서 읽어 온다.** 여기 손으로 적어 두면
   사장님이 갈래를 바꾸실 때 이 자만 옛 목록을 들고 남아 «거짓 빨강»을 켠다.
   ⚠ 못 읽으면 빈 목록을 돌려주고 이 검사는 «안 잰다». 못 재는 것을 빨강으로 만들지 않는다. */
const 갈래값 = (() => {
  try {
    const 전체 = fs.readFileSync(path.join('src', 'content.config.ts'), 'utf8');
    /* 🔴 [2026-09-18] 처음엔 파일 전체에서 첫 `category: z.enum` 을 집었다. 그런데 이 파일에는
       컬렉션이 «둘»이다 — 금융(articles)과 K컬처(kcwArticles). 앞의 것이 먼저 걸려서
       KCW 기사 222편을 통째로 「스키마에 없는 값」이라 부르는 **거짓 빨강**이 났다.
       (이 파일 스스로 위에 적어 두었다 — 거짓 빨강은 묶음 자를 멈춰 뒤 검사를 다 막는다.)
       ⇒ kcwArticles 블록 «안»에서만 찾는다. 블록을 못 찾으면 아예 안 잰다. */
    const 시작 = 전체.indexOf('const kcwArticles');
    if (시작 < 0) return {};
    const 끝 = 전체.indexOf('\nconst ', 시작 + 1);
    const 블록 = 전체.slice(시작, 끝 < 0 ? undefined : 끝);
    const 뽑기 = (열쇠) => {
      const m = 블록.match(new RegExp(`${열쇠}:\\s*z\\.enum\\(\\[([^\\]]+)\\]`));
      return m ? m[1].split(',').map((v) => v.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean) : null;
    };
    const out = {};
    for (const 열쇠 of ['category', 'genre']) { const v = 뽑기(열쇠); if (v && v.length) out[열쇠] = v; }
    return out;
  } catch { return {}; }
})();

const 기사들 = fs.readdirSync(CD).filter((f) => f.endsWith('.md'));

/**
 * 🔴🔴 [2026-09-02] 이 자가 **거짓 빨강 25건**을 냈다. 앞 판은 주소를 이렇게만 풀었다 —
 *   `'/person'` → `src/pages/wikitip/person.astro`. 한 겹 파일만 본 것이다.
 *   그래서 아래 넷을 다 「지면이 없다」고 불렀는데, **넷 다 라이브에서 200 이었다.**
 *
 *   ```
 *   /person · /school · /born-on   → <디렉터리>/index.astro 로 있다
 *   /market/vietnam                → market/[slug].astro (동적 주소)로 난다
 *   /community                     → src/pages/community.astro (wikitip 방 «밖»)
 *   /stem/im                       → .astro 파일이 아니라 서버가 낸다
 *   ```
 *
 *   ⚠ 이 자 자신이 위에 적어 두었다 — 「거짓 빨강은 … 묶음 자를 첫 실패에서 멈춰
 *      뒤의 검사 전부를 못 돌게 만든다」. 실제로 그 일이 났다: 이 25건 뒤에 있던 검사들이
 *      한 번도 안 돌았다. **그래서 주소를 제대로 푼다.**
 */

/** 방 아래에서 그 꼴의 파일을 다 모은다 */
function 지면모으기(방, 꼴, 담을것 = []) {
  if (!fs.existsSync(방)) return 담을것;
  for (const it of fs.readdirSync(방, { withFileTypes: true })) {
    const 길 = path.join(방, it.name);
    if (it.isDirectory()) { 지면모으기(길, 꼴, 담을것); continue; }
    if (꼴.test(it.name)) 담을것.push(길);
  }
  return 담을것;
}

/**
 * 파일 길을 주소로 바꾼다.
 * ⭐ `src/pages/wikitip/` 아래가 kculturewire 의 «뿌리»다 — 그래서 그 앞머리를 뗀다.
 */
function 길을주소로(길) {
  let r = 길.replace(/\\/g, '/').replace(/^src\/pages\//, '').replace(/\.astro$/, '');
  r = r.replace(/^wikitip\//, '').replace(/^wikitip$/, '');
  r = r.replace(/(^|\/)index$/, '');
  return `/${r}`.replace(/\/{2,}/g, '/').replace(/(.)\/$/, '$1');
}

/**
 * ⭐ [2026-09-02] **정적 HTML 지면도 본다.** KCW 의 `/community` 는 .astro 가 아니라
 *   `public/wikitip/community.html` 이다(`build-kcw-community-front.mjs` 가 짓는다).
 *   ⛔ 그것을 몰라서 이 자가 **`src/pages/community.astro`(6번·SeoulMarkets 지면)**를 짚고
 *      「KcwRelatedArticles 를 안 걸었다」고 했다. 남의 지면을 고치라고 시킨 셈이다.
 *      두 지면은 이름만 같고 딴 사이트다 —
 *      「Rooms — K Culture Wire community」 대 「Community — reading rooms by market | SeoulMarkets」.
 */
const 정적지면들 = 지면모으기(path.join('public', 'wikitip'), /\.html$/i)
  .map((길) => ({
    길: 길.replace(/\\/g, '/'),
    주소: `/${길.replace(/\\/g, '/').replace(/^public\/wikitip\//, '').replace(/\.html$/i, '')}`,
    본문: fs.readFileSync(길, 'utf8'),
    갈래: 'static',
  }));

const 지면들 = 지면모으기('src/pages', /\.astro$/)
  .map((길) => ({
    길: 길.replace(/\\/g, '/'), 주소: 길을주소로(길), 본문: fs.readFileSync(길, 'utf8'), 갈래: 'astro',
  }));

/* ⚠ 같은 주소가 여럿일 수 있다.
   ① `public/wikitip/community.html`(KCW 정적) 대 `src/pages/community.astro`(SeoulMarkets)
   ② `src/pages/index.astro`(SeoulMarkets) 대 `src/pages/wikitip/index.astro`(KCW)
   ⭐ 이 검사는 **KCW 기사**를 보므로 우선순위를 정적(KCW) → wikitip → 나머지로 둔다.
      안 그러면 남의 지면을 보고 판정한다. */
const 순위 = (p) => (p.갈래 === 'static' ? 0 : p.길.includes('/wikitip/') ? 1 : 2);
const 고정주소 = new Map();
for (const p of [...정적지면들, ...지면들].sort((가, 나) => 순위(가) - 순위(나))) {
  if (!고정주소.has(p.주소)) 고정주소.set(p.주소, p);
}

/** 동적 주소 — `market/[slug]` 같은 것. `[…]` 한 칸을 아무 글자 한 토막으로 본다 */
const 동적주소 = 지면들.filter((p) => p.주소.includes('['))
  .map((p) => ({
    ...p,
    꼴: new RegExp(`^${p.주소.split('/').map((s) => (/^\[.*\]$/.test(s) ? '[^/]+' : s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))).join('/')}$`),
  }));

/** 사이트맵이 스스로 낸다고 적어 둔 주소들 — .astro 가 아니라 서버가 내는 것이 있다 */
const 사이트맵글 = (() => {
  try { return fs.readFileSync(path.join(PD, 'sitemap.xml.ts'), 'utf8'); } catch { return ''; }
})();

/**
 * 주소에 해당하는 지면을 찾는다.
 * @returns {{주소:string, 본문:string, 길:string}|null}
 */
export function 지면찾기(주소) {
  const 깨끗 = 주소 === '/' ? '/' : 주소.replace(/\/$/, '');
  if (고정주소.has(깨끗)) return 고정주소.get(깨끗);
  return 동적주소.find((p) => p.꼴.test(깨끗)) ?? null;
}

/** 사이트맵이 그 주소를 내겠다고 적어 두었나 — 서버가 내는 주소를 거짓 빨강으로 안 부르려고 본다 */
export const 사이트맵이내나 = (주소) => 사이트맵글.includes(`'${주소}'`) || 사이트맵글.includes(`"${주소}"`);

let 닿는기사 = 0;
for (const f of 기사들) {
  const src = fs.readFileSync(path.join(CD, f), 'utf8');
  if (/^draft:\s*true/m.test(src)) continue;
  const slug = f.replace(/\.md$/, '');

  /* 앞말 길이. 넘으면 빌드가 죽는데, 죽기까지 1분이 걸린다. 여기서 먼저 잡는다 */
  for (const [열쇠, 한계] of Object.entries(앞말한계)) {
    const m = src.match(new RegExp(`^${열쇠}:\\s*"([\\s\\S]*?)"\\s*\\r?$`, 'm'));
    if (m && m[1].length > 한계) {
      문제.push(`${slug} — ${열쇠} 가 ${m[1].length}자다. 스키마 한계 ${한계}자를 넘어 빌드가 선다`);
    }
  }

  /* 🔴 [2026-09-18 · 5번] **앞말의 «갈래 값»도 여기서 잡는다.**
     사장님: 「배포가 잘 안된다고 자꾸 메일이 온다」
     ─────────────────────────────────────────────────────────────
     내가 낸 기사에 `category: data` · `genre: method` 를 적었다. 둘 다 스키마에 없는
     값이라 astro 의 content sync 에서 **빌드가 통째로 섰고**, 그 실패 메일이
     사장님께 일곱 번 갔다(10:24~10:52 KST).
     ⛔ 바로 윗줄이 «길이»는 「빌드가 선다」며 미리 잡고 있었는데, 같은 이유로 빌드를
       세우는 «갈래 값»은 아무도 안 보고 있었다. 한쪽만 막은 자물쇠였다.
     ⚠ 목록은 손으로 적지 않고 **스키마 파일에서 읽어 온다** — 사장님이 갈래를 바꾸시면
       (2026-08-10 「스타·작품·전통문화·산업」처럼) 이 자가 저절로 따라가야 한다. */
  for (const [열쇠, 값들] of Object.entries(갈래값)) {
    const m = src.match(new RegExp(`^${열쇠}:\\s*["']?([A-Za-z0-9_-]+)["']?\\s*\\r?$`, 'm'));
    if (m && !값들.includes(m[1])) {
      문제.push(`${slug} — ${열쇠} 가 「${m[1]}」이다. 스키마에 없는 값이라 빌드가 선다 (쓸 수 있는 것: ${값들.join('·')})`);
    }
  }

  const pages = pages를읽는다(src);

  if (!pages || !pages.length) {
    경고.push(`${slug} — pages 가 비었다. 어느 지면에서도 안 보인다(첫 화면 최신 3편은 예외)`);
    continue;
  }
  let 하나라도보임 = false;
  for (const 주소 of pages) {
    const 지면 = 지면찾기(주소);
    if (!지면) {
      /* ⬜ .astro 가 아니라 서버가 내는 주소도 있다(`/stem/im`). 사이트맵이 낸다고
         적어 두었으면 **「없다」가 아니라 「못 쟀다」**로 적는다 —  */
      if (사이트맵이내나(주소)) {
        경고.push(`${slug} — '${주소}' 는 .astro 가 아니라 서버가 낸다. 기사가 걸렸는지 **못 쟀다**`);
        continue;
      }
      문제.push(`${slug} — pages 의 '${주소}' 에 해당하는 지면이 없다`);
      continue;
    }
    /* ⭐ 지면 갈래마다 «보이나»를 다르게 잰다.
       astro  → 받는 자리(KcwRelatedArticles)를 걸었나
       static → 그 기사 주소가 실제로 글에 있나 (컴포넌트를 못 쓰는 지면이다) */
    const 보인다 = 지면.갈래 === 'static'
      ? 지면.본문.includes(`/article/${slug}`)
      : 지면.본문.includes('KcwRelatedArticles');
    if (!보인다) {
      문제.push(지면.갈래 === 'static'
        ? `${지면.길} — 기사가 이 지면('${주소}')을 가리키는데 그 기사 링크가 없다. 지면에 안 보인다`
        : `${지면.길} — 기사가 이 지면('${주소}')을 가리키는데 KcwRelatedArticles 를 안 걸었다. 지면에 안 보인다`);
      continue;
    }
    하나라도보임 = true;
  }
  if (하나라도보임) 닿는기사++;
}

/* ── 자가시험 ── 안 잡는 검사는 통과를 못 믿는다. */
if (process.argv.includes('--selftest')) {
  const 시험 = [
    ['따옴표 있는 목록을 읽는다', 'pages:\n  - "/watched"\n  - "/exports"\n', ['/watched', '/exports']],
    ['따옴표 없는 목록도 읽는다', 'pages:\n  - /watched\n', ['/watched']],
    ['pages 가 없으면 null', 'tags: ["a"]\n', null],
    ['빈 pages 는 null', 'pages:\n', null],
    ['다음 칸에서 멈춘다', 'pages:\n  - "/a"\nsources:\n  - org: "x"\n', ['/a']],
  ];
  let 통과 = 0;
  for (const [이름, src, 기대] of 시험) {
    const got = pages를읽는다(src);
    if (JSON.stringify(got) === JSON.stringify(기대)) 통과++;
    else console.log(`  ❌ 자가시험 실패: ${이름} — 나온 것 ${JSON.stringify(got)}`);
  }
  console.log(`기사 닿음 검사 — 자가시험 ${시험.length}건 중 ${통과}건 통과`);
  if (통과 !== 시험.length) process.exit(1);
}

console.log(`기사 닿음 검사 — 기사 ${기사들.length}편 중 지면에서 닿는 것 ${닿는기사}편`);
if (경고.length) 경고.forEach((m) => console.log(`   ⚠ ${m}`));
if (문제.length) {
  console.log(`❌ ${문제.length}건`);
  문제.forEach((m) => console.log(`   ${m}`));
  console.log('   만들고 문을 안 내면 없는 것과 같다. 남의 것이면 고치지 말고 알린다.');
  process.exit(1);
}
console.log('✅ 기사가 가리킨 지면이 전부 있고, 전부 기사를 걸고 있다');
