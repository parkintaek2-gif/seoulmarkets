#!/usr/bin/env node
/**
 * **그 지면으로 가는 길이 몇 개인가** — 색인이 안 되는 까닭을 얇기 말고 다른 쪽에서 잰다.
 *
 * ── 왜 ─────────────────────────────────────────────────────────
 *   744장 중 80장이 색인됐고, 안 들어간 것은 자로 찍어 낸 623장이다.
 *   ⛔ 처음엔 **얇아서**라고 생각했다. 그런데 재 보니 아니었다 —
 *      색인된 12장 중 **5장이 시장 한 곳짜리**(전체 비중은 25.7%)다.
 *      `one-on-one` 은 1시장·1자리·1주 인데 들어갔다. **얇기로는 설명이 안 된다.**
 *   ⭐ 그러면 남은 큰 후보는 **길**이다. 구글은 링크를 타고 온다.
 *      사이트맵에만 있고 어느 지면에서도 안 걸린 지면은 **고립**다.
 *
 * ── ⛔ 이 자가 지키는 것 ────────────────────────────────────
 * ⛔ **지은 것(dist)에서 잰다.** 소스에서 세면 실제로 나간 링크와 다를 수 있다.
 * ⛔ 자기 자신으로 가는 링크는 안 센다. 그러면 모든 지면이 최소 1이 된다.
 * ⚠ 이것도 **구글의 까닭을 보는 것이 아니다.** 우리 쪽 길을 세는 것이다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * 🔴 [2026-10-04 · 5번] **이 자가 K컬처와이어 한 곳만 재고 있었다.**
 *   오늘 밤 서울마켓 7,945장·백년지도 4,910장을 네이버·빙에 처음 통보했는데,
 *   «고립인지 아닌지를 잰 적이 없다». 사이트맵에 올려도 어느 지면에서도 안 걸리면
 *   구글은 타고 올 길이 없다 — **통보한 수가 곧 색인될 수를 뜻하지 않는다.**
 *   ⇒ 새 자를 만들지 않고 이 자를 넓혔다. 세는 방법은 똑같다.
 *
 * ⛔ dist 안에 세 사이트가 겹쳐 있다 — `dist/` 가 서울마켓이고 그 «안»에
 *   `100y/`·`wikitip/` 이 들어 있다. 서울마켓을 걸을 때 그 둘을 빼지 않으면
 *   남의 지면을 제 것으로 세어 수가 부풀어 오른다.
 */
export const 사이트들 = {
  kcw: {
    이름: 'K Culture Wire', 방: 'dist/wikitip', 도메인: 'https://www.kculturewire.com',
    뺄방: [], 사이트맵: ['sitemap.xml'],
    있어야할갈래: ['title', 'market', 'article', 'firm', 'born-on'],
    갈래: (q) => (q.startsWith('/article/') ? '기사'
      : q.startsWith('/title/') ? '작품 지면'
        : q.startsWith('/market/') ? '시장 지면'
          : q.startsWith('/firm/') ? '회사 지면'
            : q.startsWith('/born-on/') ? '생일 지면'
              : q.startsWith('/group/') ? '그룹 지면'
                : q.startsWith('/school/') ? '학교 지면' : '그 밖의 지면'),
  },
  '100y': {
    이름: '백년지도', 방: 'dist/100y', 도메인: 'https://100yearmap.com',
    뺄방: [], 사이트맵: ['sitemap.xml'],
    있어야할갈래: ['school', 'report', 'age'],
    갈래: (q) => (q.startsWith('/school/') ? '학교 지면'
      : q.startsWith('/report/area/') ? '지역 지면'
        : q.startsWith('/university/') ? '대학 지면'
          : q.startsWith('/age/') ? '나이 지면' : '그 밖의 지면'),
  },
  seoulmarkets: {
    이름: 'SeoulMarkets', 방: 'dist', 도메인: 'https://seoulmarkets.com',
    뺄방: ['100y', 'wikitip', '_astro'],
    /* 🔴 사이트맵이 열한 갈래로 갈려 있다. 하나만 읽으면 7,945장 중 몇백 장만 센다 */
    사이트맵: ['sitemap-pages.xml', 'sitemap-companies.xml', 'sitemap-japan.xml',
      'sitemap-taiwan.xml', 'sitemap-uae.xml', 'sitemap-equities.xml',
      'sitemap-funds.xml', 'sitemap-fx.xml', 'sitemap-macro.xml',
      'sitemap-rates.xml', 'sitemap-commodities.xml'],
    있어야할갈래: ['japan', 'company', 'article'],
    갈래: (q) => (q.startsWith('/japan/company/') ? '일본 회사'
      : q.startsWith('/japan/sector/') ? '일본 업종'
        : q.startsWith('/company/') ? '한국 회사'
          : q.startsWith('/article/') ? '기사'
            : q.startsWith('/uae/') ? 'UAE 지면'
              : q.startsWith('/taiwan/') ? '대만 지면' : '그 밖의 지면'),
  },
};

/** ⛔ 모르는 이름을 받으면 kcw 로 «조용히» 떨어지지 않는다 — 세운다 */
export function 사이트고르기(argv = []) {
  const m = (argv || []).map(String).find((a) => a.startsWith('--사이트='));
  const 이름 = m ? m.slice('--사이트='.length) : 'kcw';
  if (!Object.prototype.hasOwnProperty.call(사이트들, 이름)) return null;
  return { 열쇠: 이름, ...사이트들[이름] };
}

const 고른것 = 사이트고르기(process.argv);
const 지음방 = 고른것 ? 고른것.방 : 'dist/wikitip';

/** 그 글 안의 우리 쪽 링크. ⛔ 밖으로 나가는 것과 닻(#)은 뺀다 */
export function 링크들(html) {
  const 나온것 = [];
  for (const m of String(html).matchAll(/href\s*=\s*["']([^"']+)["']/g)) {
    const h = m[1].trim();
    if (!h.startsWith('/')) continue;          /* 밖 · 닻 · mailto */
    나온것.push(길정규화(h));
  }
  return 나온것;
}

/**
 * 사이트맵에 적힌 주소를 dist 쪽 주소와 견줄 수 있게 고른다.
 *
 * 🔴 [2026-10-04 · 5번] **이것이 없어서 「백년지도 2,038장이 지은 것 자체가 없다」가 나왔다.**
 *   사이트맵에는 `/region/%EA%B0%95%EC%9B%90` 로 적히고 dist 에는 `region/강원.html` 로 있다.
 *   둘을 그대로 견주면 영원히 안 맞는다. 라이브는 200 이었다 — **없는 흠을 지어낸 것**이다.
 *   ⭐ 수가 극단으로 나오면 자를 먼저 의심한다. 2,038장이 그 신호였다.
 */
export function 길정규화(날것) {
  const q = String(날것 ?? '').split('#')[0].split('?')[0];
  let 길 = q;
  try { 길 = decodeURIComponent(q); } catch { 길 = q; }   /* ⛔ 못 풀면 날것 그대로 — 버리지 않는다 */
  길 = 길.replace(/\/$/, '');
  return 길 || '/';
}

/** dist 안의 html 을 주소로 바꾼다. `title/x.html` → `/title/x` */
export function 주소(파일) {
  const p = String(파일).replace(/\\/g, '/').replace(/\.html$/, '');
  return p === 'index' ? '/' : `/${p.replace(/\/index$/, '')}`;
}

const 내가실행됐다 = process.argv[1]
  && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (내가실행됐다 && process.argv.includes('--selftest')) {
  let 통 = 0; let 실 = 0;
  const 재본다 = (이름, 실제, 바람) => {
    if (JSON.stringify(실제) === JSON.stringify(바람)) 통 += 1;
    else { 실 += 1; console.error(`  ⛔ ${이름}\n     받은 것: ${JSON.stringify(실제)}`); }
  };
  재본다('링크를 뽑는다', 링크들('<a href="/titles">x</a>'), ['/titles']);
  /* ⛔ 밖으로 나가는 것은 안 센다 */
  재본다('밖은 안 센다', 링크들('<a href="https://netflix.com">x</a>'), []);
  재본다('닻과 물음표를 뗀다', 링크들('<a href="/a?b=1#c">x</a>'), ['/a']);
  재본다('꼬리 빗금을 뗀다', 링크들('<a href="/a/">x</a>'), ['/a']);
  재본다('작은따옴표도 읽는다', 링크들("<a href='/z'>x</a>"), ['/z']);
  재본다('주소 — index', 주소('index.html'), '/');
  재본다('주소 — 아래 방', 주소('title/stepmom.html'), '/title/stepmom');
  /* 🔴 [2026-10-04] 한글 주소를 「지은 것이 없다」로 읽던 흠 — 2,038장이 헛것이었다 */
  재본다('한글 주소를 푼다', 길정규화('/region/%EA%B0%95%EC%9B%90'), '/region/강원');
  재본다('이미 푼 것은 그대로', 길정규화('/region/강원'), '/region/강원');
  재본다('꼬리 빗금을 뗀다 — 길정규화', 길정규화('/a/'), '/a');
  재본다('뿌리는 빗금 하나로', 길정규화('/'), '/');
  /* ⛔ 반쯤 깨진 인코딩이 와도 버리지 않는다 — 날것 그대로 남긴다 */
  재본다('못 풀면 날것', 길정규화('/a%ZZb'), '/a%ZZb');
  /* 🔴 [2026-10-04] 세 사이트로 넓히며 보탠 시험 */
  재본다('기본은 kcw 다', 사이트고르기([]).열쇠, 'kcw');
  재본다('서울마켓을 고른다', 사이트고르기(['--사이트=seoulmarkets']).방, 'dist');
  재본다('백년지도를 고른다', 사이트고르기(['--사이트=100y']).방, 'dist/100y');
  /* ⛔ 모르는 이름이면 «조용히» kcw 로 떨어지지 않는다 — null 을 내고 세운다 */
  재본다('모르는 이름은 null', 사이트고르기(['--사이트=없는곳']), null);
  /* 🔴 dist 안에 100y·wikitip 이 겹쳐 있다 — 서울마켓은 그 둘을 빼야 한다 */
  재본다('서울마켓은 남의 방을 뺀다',
    사이트고르기(['--사이트=seoulmarkets']).뺄방.includes('wikitip'), true);
  재본다('kcw 는 뺄 방이 없다', 사이트고르기(['--사이트=kcw']).뺄방.length, 0);
  /* 🔴 서울마켓 사이트맵은 열한 갈래다. 하나만 읽으면 수가 통째로 모자란다 */
  재본다('서울마켓 사이트맵은 여럿이다',
    사이트고르기(['--사이트=seoulmarkets']).사이트맵.length > 5, true);
  재본다('갈래를 가른다 — 일본 회사',
    사이트고르기(['--사이트=seoulmarkets']).갈래('/japan/company/toyota'), '일본 회사');
  재본다('갈래를 가른다 — 학교',
    사이트고르기(['--사이트=100y']).갈래('/school/7530071'), '학교 지면');
  console.log(`길 세기 — 자가시험 ${통} 통과 · ${실} 실패`);
  process.exit(실 ? 1 : 0);
}

if (내가실행됐다) {
  if (!고른것) {
    console.log(`⛔ 모르는 사이트다 — 쓸 수 있는 것: ${Object.keys(사이트들).join(' · ')}`);
    process.exit(1);
  }
  console.log(`■ ${고른것.이름} (${고른것.방})\n`);
  if (!fs.existsSync(지음방)) {
    console.log('⬜ dist 가 없다 — `node scripts/build-once.mjs` 뒤에 다시 부른다.');
    process.exit(1);
  }
  /* dist 를 훑는다 */
  const 파일들 = [];
  const 걷는다 = (방, 앞= '') => {
    for (const e of fs.readdirSync(`${지음방}/${방}`, { withFileTypes: true })) {
      const 안 = 앞 ? `${앞}/${e.name}` : e.name;
      /* ⛔ 겹쳐 있는 남의 사이트는 안 센다 — 뿌리에서만 가린다 */
      if (!앞 && (고른것?.뺄방 ?? []).includes(e.name)) continue;
      if (e.isDirectory()) 걷는다(`${방}/${e.name}`, 안);
      else if (e.name.endsWith('.html')) 파일들.push(안);
    }
  };
  걷는다('.');
  /**
   * 🔴 2026-08-23 — 이 자가 **반쯤 지어진 dist** 를 읽고 「지은 지면 389장」을 냈다.
   *   실제로는 1,227장이고 `title/`·`market/` 이 아예 없었다. 다른 유닛이 같은 저장소에서
   *   빌드하면 아스트로가 dist 를 비우기 때문이다. 아래 「비었다」 검사는 0장만 잡는다.
   *   ⛔ 그 수를 내면 「작품 지면에 들어오는 길이 하나도 없다」로 읽힌다 — 없는 흠이다.
   *   ⭐ 갈래 디렉터리가 없으면 **못 쟀다**고 말하고 나간다. check-visitor-walk 과 같은 걸림돌이다.
   */
  const 있어야할갈래 = 고른것.있어야할갈래;
  const 빠진갈래 = 있어야할갈래.filter((d) => !fs.existsSync(`${지음방}/${d}`));
  if (빠진갈래.length) {
    console.log(`⚠ 못 쟀다 — dist 가 다 안 찼다(갈래 ${빠진갈래.join(', ')} 없음). 빌드가 도는 중일 수 있다.`);
    console.log(`   지금 보이는 것 ${파일들.length}장. ⛔ 이 수로 판단하지 않는다 — 깨진 것이 아니라 못 잰 것이다.`);
    process.exit(0);
  }
  /*
   * 🔴 2026-08-10 02:0x — **첫 화면 한 장이 안 보이고 있었다.**
   *   `astro.config.mjs` 가 `build: { format: 'file' }` 이라 `pages/wikitip/index.astro` 는
   *   `dist/wikitip/index.html` 이 아니라 **`dist/wikitip.html`**(한 칸 위)로 나온다.
   *   ⛔ 그래서 첫 화면에서 걸어 들어가는 셈이 통째로 헛돌았다 — 「747장 못 닿음」이 나왔다.
   *   ⚠ 라이브 `/` 는 200 이고 링크가 61개다. **없던 게 아니라 내 자가 딴 데를 봤다.**
   */
  const 첫화면파일 = `${지음방}.html`;
  const 첫화면있다 = fs.existsSync(첫화면파일);
  if (!파일들.length) {
    console.log('⬜ dist 가 비었다 — 다른 창이 빌드 중일 수 있다. 다시 짓고 부른다.');
    process.exit(1);
  }

  const 들어오는길 = new Map(파일들.map((f) => [주소(f), 0]));
  if (첫화면있다) 들어오는길.set('/', 0);
  const 볼것들 = [...파일들.map((f) => ({ 길: 주소(f), 파일: `${지음방}/${f}` }))];
  if (첫화면있다) 볼것들.push({ 길: '/', 파일: 첫화면파일 });
  /*
   * 🔴 2026-08-25 — **나가는 길도 같이 센다.** 왜 넓혔는지 적어 둔다.
   * 사장님 지시는 「방문자«와 체류시간»에 올인」인데 이 자는 «들어오는» 길만 세고 있었다.
   * 들어오는 길은 「찾아지나」를 말하고, **나가는 길은 「머무나」를 말한다.**
   * 나가는 길이 0인 지면은 **막다른 골목**이다 — 읽고 나서 갈 데가 없으면 그냥 나간다.
   * ⛔ 새 자를 만들지 않았다. 같은 링크를 이미 훑고 있어서 세는 김에 반대편도 센 것이다.
   *   오늘 이미 두 번, «있는 지면»을 못 보고 새로 지으려 했다. 있는 자를 먼저 본다.
   * ⚠ 나가는 길이 많다고 오래 머무는 것은 아니다. 이 자는 「갈 데가 있나」까지만 말한다 —
   *   실제로 머무는지는 GA4(`measure-kcw-dwell.mjs`)로 따로 잰다. 둘을 같은 것으로 안 적는다.
   */
  const 나가는길 = new Map();
  for (const v of 볼것들) {
    const 나 = v.길;
    const 본것 = new Set(링크들(fs.readFileSync(v.파일, 'utf8')));
    let 밖 = 0;
    for (const h of 본것) {
      if (h === 나) continue;                       /* ⛔ 자기 자신은 안 센다 */
      if (들어오는길.has(h)) { 들어오는길.set(h, 들어오는길.get(h) + 1); 밖 += 1; }
    }
    나가는길.set(나, 밖);
  }

  const 갈래 = 고른것.갈래;
  const 통 = new Map();
  for (const [p, n] of 들어오는길) {
    const g = 갈래(p);
    if (!통.has(g)) 통.set(g, []);
    통.get(g).push(n);
  }
  const 가운데 = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

  /*
   * 🔴 2번 지시(02:2x) — **딱 하나를 잰다: 사이트맵에는 있는데 어느 지면에서도 안 걸린 장이 몇인가.**
   *   ⛔ dist 전체가 아니라 **사이트맵 기준**이다. 우리가 「구글아 와서 보라」고 낸 목록이 그것이다.
   */
  /* 🔴 사이트맵이 여러 갈래로 갈린 곳이 있다(서울마켓 11개). 하나만 읽으면 수가 통째로 모자란다 */
  /* ⛔ 도메인의 점을 정규식 점으로 두면 'wwwXkculturewire' 같은 것도 걸린다 — 꼭 막는다 */
  const 도메인꼴 = new RegExp(`<loc>${고른것.도메인.split('.').join('[.]')}([^<]*)</loc>`, 'g');
  const 사이트맵길 = [];
  let 못읽은사이트맵 = 0;
  for (const 이름 of 고른것.사이트맵) {
    const 길 = `${지음방}/${이름}`;
    if (!fs.existsSync(길)) { 못읽은사이트맵 += 1; continue; }
    const sm = fs.readFileSync(길, 'utf8');
    for (const m of sm.matchAll(도메인꼴)) 사이트맵길.push(길정규화(m[1]));
  }
  if (!사이트맵길.length) {
    console.log(`⚠ 못 쟀다 — 사이트맵에서 주소를 하나도 못 읽었다(못 연 파일 ${못읽은사이트맵}개).`);
    console.log('   ⛔ 이것을 「고립 0장」으로 읽지 않는다. 깨진 것이 아니라 못 잰 것이다.');
    process.exit(0);
  }
  if (못읽은사이트맵) console.log(`⬜ 사이트맵 ${못읽은사이트맵}개는 없어서 못 읽었다 — 아래 수에 그만큼 빠져 있다\n`);
  const 사이트맵고립 = 사이트맵길.filter((p) => (들어오는길.get(p) ?? 0) === 0);
  const 사이트맵인데지면없음 = 사이트맵길.filter((p) => !들어오는길.has(p));

  console.log('🔴 2번이 물으신 수 — **사이트맵에 있는데 어느 지면에서도 안 걸린 장**');
  console.log(`   **고립 ${사이트맵고립.length}장 / 사이트맵 ${사이트맵길.length}장**`);
  if (사이트맵인데지면없음.length) {
    console.log(`   ⚠ 그중 ${사이트맵인데지면없음.length}장은 **지은 것 자체가 없다** — ${사이트맵인데지면없음.slice(0, 5).join(' · ')}`);
  }
  for (const p of 사이트맵고립.slice(0, 10)) console.log(`     ${p}`);
  console.log('');

  /*
   * ⭐ 고립가 없어도 **깊으면 늦게 온다.** 크롤러는 첫 화면에서 링크를 타고 들어온다.
   *   그래서 첫 화면에서 **몇 번 만에 닿나**를 같이 잰다. 고립 수만으로는 절반이다.
   */
  const 깊이 = new Map([['/', 0]]);
  const 줄서기 = ['/'];
  const 링크캐시 = new Map();
  for (const f of 파일들) 링크캐시.set(주소(f), `${지음방}/${f}`);
  if (첫화면있다) 링크캐시.set('/', 첫화면파일);
  while (줄서기.length) {
    const 지금 = 줄서기.shift();
    const f = 링크캐시.get(지금);
    if (!f) continue;
    for (const h of new Set(링크들(fs.readFileSync(f, 'utf8')))) {
      if (깊이.has(h) || !들어오는길.has(h)) continue;
      깊이.set(h, 깊이.get(지금) + 1);
      줄서기.push(h);
    }
  }
  const 깊이별 = new Map();
  for (const p of 사이트맵길) {
    const d = 깊이.has(p) ? 깊이.get(p) : '못 닿음';
    깊이별.set(d, (깊이별.get(d) ?? 0) + 1);
  }
  console.log('첫 화면에서 몇 번 만에 닿나 (사이트맵 기준)');
  for (const [d, n] of [...깊이별].sort((a, b) => (typeof a[0] === 'number' ? a[0] : 99) - (typeof b[0] === 'number' ? b[0] : 99))) {
    console.log(`   ${String(d).padStart(6)}번  ${String(n).padStart(4)}장`);
  }
  console.log('');

  console.log(`지은 지면 ${파일들.length}장 — **들어오는 길** 수\n`);
  console.log('갈래          장수   가운데   길 0인 것   길 1인 것');
  for (const [g, a] of [...통].sort((x, y) => y[1].length - x[1].length)) {
    const 영 = a.filter((n) => n === 0).length;
    const 하나 = a.filter((n) => n === 1).length;
    console.log(`${g.padEnd(12)} ${String(a.length).padStart(4)} ${String(가운데(a)).padStart(7)} ${String(영).padStart(9)} ${String(하나).padStart(10)}`);
  }

  /*
   * 🔴 **나가는 길** — 「머무나」쪽이다. 위의 표와 «반대 방향»이므로 따로 낸다.
   * ⛔ 두 표를 같은 것으로 읽지 않는다. 들어오는 길 0 은 「아무도 못 찾는다」이고,
   *   나가는 길 0 은 「읽고 나면 갈 데가 없다」다. 고치는 법도 다르다.
   */
  console.log('');
  console.log(`지은 지면 ${파일들.length}장 — **나가는 길** 수 (막다른 골목 찾기)\n`);
  console.log('갈래          장수   가운데   나갈 데 0   나갈 데 1~2');
  const 나통 = new Map();
  for (const [p, n] of 나가는길) {
    const g = 갈래(p);
    if (!나통.has(g)) 나통.set(g, []);
    나통.get(g).push({ p, n });
  }
  const 막다른 = [];
  for (const [g, a] of [...나통].sort((x, y) => y[1].length - x[1].length)) {
    const 수들 = a.map((x) => x.n);
    const 영 = a.filter((x) => x.n === 0);
    const 적은 = a.filter((x) => x.n >= 1 && x.n <= 2);
    막다른.push(...영, ...적은);
    console.log(`${g.padEnd(12)} ${String(a.length).padStart(4)} ${String(가운데(수들)).padStart(7)}`
      + ` ${String(영.length).padStart(9)} ${String(적은.length).padStart(11)}`);
  }
  if (막다른.length) {
    막다른.sort((a, b) => a.n - b.n);
    console.log('\n  나갈 데가 가장 적은 지면 —');
    for (const x of 막다른.slice(0, 12)) {
      console.log(`    ${String(x.n).padStart(2)}개  ${x.p}   (들어오는 길 ${들어오는길.get(x.p) ?? 0})`);
    }
  } else {
    console.log('\n  ✅ 나갈 데가 두 개 이하인 지면이 없다');
  }
  console.log('\n  ⚠ 나갈 데가 있다는 것과 «실제로 눌린다»는 것은 다른 말이다.');
  console.log('     눌리는지는 GA4 로 따로 잰다 — 이 자는 「갈 데가 있나」까지만 말한다.');

  /* 색인된 작품 지면과 안 된 것을 맞대 본다 */
  const 색인 = ['stepmom', 'seoul-vibe', 'project-y', 'bad-guys', 'the-way-back', 'one-on-one',
    'the-crowned-clown', 'the-killing-vote', 'the-devil-s-plan', 'can-this-love-be-translated',
    'the-world-of-the-married', 'the-secret-life-of-my-secretary'];
  const 작품 = [...들어오는길].filter(([p]) => p.startsWith('/title/'));
  const 안 = 작품.filter(([p]) => 색인.includes(p.slice(7))).map(([, n]) => n);
  const 밖 = 작품.filter(([p]) => !색인.includes(p.slice(7))).map(([, n]) => n);
  if (안.length) {
    console.log(`\n작품 지면 — 구글이 가져간 것과 아닌 것`);
    console.log(`  색인된 ${안.length}장   길 가운데 ${가운데(안)} · 최소 ${Math.min(...안)} · 최대 ${Math.max(...안)}`);
    console.log(`  안 된 ${밖.length}장   길 가운데 ${가운데(밖)} · 최소 ${Math.min(...밖)} · 최대 ${Math.max(...밖)}`);
    console.log('  ⚠ 12장은 적다. 여기서 「이것이 까닭이다」로 넘어가지 않는다.');
  }
}
