/**
 * check-색인-얼마나-됐나.mjs — **구글이 우리 지면을 얼마나 색인했나**를 묻는다.
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔴 사장님: 「영상만 하지말고, 텍스트 콘텐트를 만들어서 검색엔진 통해서 우리 쪽으로
 *   방문하게 해. **색인 잊지말고**」 · 「유입량을 지금의 천배, 만배로」
 *
 * ⚠ 앞서 쓰던 `scripts/_색인상태.mjs` 는 **주소 다섯을 손으로 박아 둔 것**이었다.
 *   그 다섯이 다 「Google에는 아직 알려지지 않은 URL입니다」로 나왔는데,
 *   다섯만 보고는 **그것이 전부인지 그 다섯만 그런지 알 수가 없다.**
 *   ⇒ 사이트맵에서 «골고루» 뽑아서 센다. 그래야 「몇 %가 색인됐나」를 말할 수 있다.
 *
 * ⛔ 할당량이 있다 — URL 검사 API 는 하루 2,000건, 분당 600건이다.
 *   그래서 전수가 아니라 **표본**이다. 표본이라고 적고, 표본 수를 함께 낸다.
 * ⛔ 「색인됐다」와 「수집됐다」를 섞지 않는다 —
 *     수집(crawl) 은 구글이 와서 읽은 것, 색인(index) 은 검색 결과에 넣은 것이다.
 *     한 번도 안 온 지면과, 와서 보고 안 넣은 지면은 **고칠 방법이 다르다.**
 *
 * 쓰는 법
 *   node scripts/check-색인-얼마나-됐나.mjs                  (klifemap · 표본 40)
 *   node scripts/check-색인-얼마나-됐나.mjs --사이트 klifemap --몇개 60
 *   node scripts/check-색인-얼마나-됐나.mjs --자가시험
 */
import process from 'node:process';

/* ─────────────────────────── 재는 규칙 ─────────────────────────── */

/**
 * 사이트맵 글에서 주소를 뽑는다.
 * ⛔ 못 읽으면 null 이다 — 빈 배열이 아니다. 「없다」와 「못 쟀다」는 다르다.
 */
export function 주소뽑기(사이트맵글) {
  const s = String(사이트맵글 ?? '');
  if (!s.includes('<loc>')) return null;
  return [...s.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim()).filter(Boolean);
}

/**
 * 🔴 [2026-11-16 · 5번] **묶음 사이트맵인가.**
 *   서울마켓츠를 쟀더니 「사이트맵 11장」이 나왔다. 실제는 8,046장이다.
 *   그 사이트는 sitemap.xml 이 하위 사이트맵 11개를 가리키는 «묶음»인데,
 *   이 자가 그 11개 «주소»를 지면으로 세었다. 그러고는 「안 왔음 100%」를 냈다 —
 *   사이트맵 주소는 색인될 지면이 아니니 당연한 결과였다. **거짓 빨강이다.**
 *   ⛔ 묶음을 안 펼치면 큰 사이트는 영영 못 잰다. 못 재는 자는 없는 자보다 나쁘다.
 */
export function 묶음인가(사이트맵글) {
  return /<sitemapindex[\s>]/i.test(String(사이트맵글 ?? ''));
}

/**
 * 주소를 갈래로 나눈다 — 갈래마다 고르게 뽑아야 한쪽만 보고 단정하지 않는다.
 * ⚠ `/content/star-…` 가 수천 장이라, 그냥 앞에서부터 뽑으면 **그것만** 뽑힌다.
 */
export function 갈래(주소) {
  const 길 = String(주소 ?? '').replace(/^https?:\/\/[^/]+/, '');
  const 말 = /[?&]lang=([a-z]{2})/.exec(길)?.[1] ?? 'ko';
  if (/^\/content\/star-/.test(길)) return `스타글-${말}`;
  if (/^\/content\//.test(길)) return `글-${말}`;
  if (/^\/ilju\//.test(길)) return `일주-${말}`;
  if (/^\/?$/.test(길) || /^\/\?/.test(길)) return `첫화면-${말}`;
  return `지면-${말}`;
}

/**
 * 갈래마다 고르게 뽑는다.
 * ⛔ 뽑는 자리를 무작위로 하지 않는다 — 날마다 다른 표본이면 어제와 비교를 못 한다.
 *   갈래 안에서 «고른 간격»으로 집는다. 지면이 늘어도 표본이 통째로 바뀌지 않는다.
 */
export function 고르게뽑기(주소들, 몇개) {
  if (!Array.isArray(주소들) || !주소들.length) return null;
  const 통 = new Map();
  for (const u of 주소들) {
    const g = 갈래(u);
    if (!통.has(g)) 통.set(g, []);
    통.get(g).push(u);
  }
  const 갈래수 = 통.size;
  const 몫 = Math.max(1, Math.floor(몇개 / 갈래수));
  const 뽑은것 = [];
  for (const [, 목록] of [...통].sort((a, b) => a[0].localeCompare(b[0]))) {
    const n = Math.min(몫, 목록.length);
    const 간격 = 목록.length / n;
    for (let i = 0; i < n; i++) 뽑은것.push(목록[Math.floor(i * 간격)]);
  }
  return 뽑은것.slice(0, 몇개);
}

/** 구글이 한 말을 세 갈래로 간추린다 — 고칠 방법이 서로 다르기 때문이다 */
export const 갈래이름 = {
  색인됨: '색인됨 — 검색 결과에 들어 있다',
  와서안넣음: '와서 보고 안 넣었다 — 글·제목을 고쳐야 한다',
  안왔음: '아직 한 번도 안 왔다 — 알리고 링크를 걸어야 한다',
  모름: '못 쟀다',
};

export function 간추리기(색인결과) {
  const i = 색인결과 ?? {};
  const v = String(i.verdict ?? '');
  const c = String(i.coverageState ?? '');
  if (!v && !c) return '모름';
  if (v === 'PASS' || /^제출.*색인|Submitted and indexed|색인이 생성됨/i.test(c)) return '색인됨';
  /* 「알려지지 않은 URL」 · 「발견됨 - 현재 색인이 생성되지 않음」 = 수집 자체가 안 왔다 */
  if (/알려지지 않은|not known to Google|발견됨|Discovered/i.test(c)) {
    return i.lastCrawlTime ? '와서안넣음' : '안왔음';
  }
  return '와서안넣음';
}

/* ─────────────────────────── 자가시험 ─────────────────────────── */
function 자가시험() {
  let 흠 = 0;
  const 본다 = (이름, 맞나) => { console.log(`  ${맞나 ? '✅' : '🔴'} ${이름}`); if (!맞나) 흠 += 1; };

  본다('⛔ 못 읽으면 null 이다 — 빈 배열이 아니다', 주소뽑기('아무 글') === null && 주소뽑기(null) === null);
  본다('주소를 뽑는다', 주소뽑기('<url><loc>https://a/b</loc></url>').join() === 'https://a/b');
  /* 🔴 2026-11-16 — 묶음을 못 가려 서울마켓츠가 「11장」으로 보였다 */
  본다('묶음 사이트맵을 가린다', 묶음인가('<sitemapindex xmlns="x"><sitemap><loc>https://a/s1.xml</loc></sitemap></sitemapindex>') === true);
  본다('낱장은 묶음이 아니다', 묶음인가('<urlset><url><loc>https://a/b</loc></url></urlset>') === false);
  본다('⛔ 빈 것에 안 터진다', 묶음인가(null) === false && 묶음인가('') === false);

  본다('스타 글을 가린다', 갈래('https://k/content/star-q1-saju') === '스타글-ko');
  본다('말을 가린다', 갈래('https://k/content/star-q1-saju?lang=en') === '스타글-en');
  본다('일주 낱장을 가린다', 갈래('https://k/ilju/gapja.html') === '일주-ko');
  본다('보통 지면을 가린다', 갈래('https://k/saju.html') === '지면-ko');

  const 많은것 = [
    ...Array.from({ length: 100 }, (_, i) => `https://k/content/star-q${i}-saju`),
    ...Array.from({ length: 5 }, (_, i) => `https://k/p${i}.html`),
  ];
  const 뽑은것 = 고르게뽑기(많은것, 10);
  본다('🔴 수가 많은 갈래가 표본을 다 먹지 않는다',
    뽑은것.some((u) => u.includes('/p')) && 뽑은것.some((u) => u.includes('star-')));
  본다('⛔ 두 번 뽑아도 같은 표본이다 — 어제와 견줄 수 있어야 한다',
    고르게뽑기(많은것, 10).join() === 뽑은것.join());
  본다('⛔ 빈 목록이면 null', 고르게뽑기([], 10) === null);

  본다('색인된 것을 가린다', 간추리기({ verdict: 'PASS', coverageState: '제출되었으며 색인이 생성됨' }) === '색인됨');
  본다('🔴 한 번도 안 온 것을 가린다',
    간추리기({ verdict: 'NEUTRAL', coverageState: 'Google에는 아직 알려지지 않은 URL입니다.' }) === '안왔음');
  본다('🔴 와서 보고 안 넣은 것을 가린다',
    간추리기({ verdict: 'NEUTRAL', coverageState: '발견됨 - 현재 색인이 생성되지 않음', lastCrawlTime: '2026-10-01T00:00:00Z' }) === '와서안넣음');
  본다('⛔ 못 쟀으면 「모름」이다 — 0 으로 세지 않는다', 간추리기({}) === '모름' && 간추리기(null) === '모름');

  console.log(흠 ? `\n🔴 흠 ${흠}` : '\n✅ 자가시험 전부 통과');
  process.exit(흠 ? 1 : 0);
}

/* ─────────────────────────── 손으로 쓰기 ─────────────────────────── */
if (process.argv.includes('--자가시험')) { 자가시험(); }
else {
  const 인자 = (이름, 밑값) => {
    const i = process.argv.indexOf(이름);
    return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : 밑값;
  };
  const 딱지 = 인자('--사이트', 'klifemap');
  const 몇개 = Number(인자('--몇개', '40'));

  const { 토큰받기, 사이트들 } = await import('./fetch-gsc.mjs');
  const { 토큰 } = await 토큰받기();
  const 자리 = 사이트들[딱지];
  if (!자리) { console.log(`🔴 모르는 사이트 — ${딱지}`); process.exit(1); }

  const 뿌리 = 자리.속성.replace(/^sc-domain:/, 'https://').replace(/\/$/, '');
  const 사이트맵글 = await (await fetch(`${뿌리}/sitemap.xml`)).text();
  /* 🔴 묶음이면 하위 사이트맵을 모두 펼친다 — 안 펼치면 큰 사이트가 11장으로 보인다 */
  let 주소들 = 주소뽑기(사이트맵글);
  if (묶음인가(사이트맵글) && 주소들) {
    const 모음 = [];
    for (const 하위 of 주소들) {
      try {
        const 글 = await (await fetch(하위)).text();
        const 것 = 주소뽑기(글);
        if (것) 모음.push(...것);
      } catch (e) { /* 한 장을 못 받아도 나머지는 센다 */ }
    }
    console.log(`   ⬜ 묶음 사이트맵이다 — 하위 ${주소들.length}장을 펼쳐 지면 ${모음.length.toLocaleString()}장을 얻었다`);
    주소들 = 모음;
  }
  if (!주소들) { console.log('🔴 사이트맵을 못 읽었다 — 안 센다'); process.exit(1); }

  const 표본 = 고르게뽑기(주소들, 몇개);
  console.log(`■ ${딱지} — 사이트맵 ${주소들.length}장 가운데 표본 ${표본.length}장`);
  console.log('   ⚠ 표본이다. 전수가 아니다 — URL 검사 API 는 하루 2,000건이 선이다\n');

  const 센것 = { 색인됨: [], 와서안넣음: [], 안왔음: [], 모름: [] };
  for (const 주소 of 표본) {
    try {
      const r = await fetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
        method: 'POST',
        headers: { Authorization: `Bearer ${토큰}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ inspectionUrl: 주소, siteUrl: 자리.속성, languageCode: 'ko' }),
      });
      if (!r.ok) { 센것.모름.push(주소); continue; }
      const j = await r.json();
      센것[간추리기(j.inspectionResult?.indexStatusResult)].push(주소);
    } catch (e) { 센것.모름.push(주소); }
  }

  const 잰것 = 표본.length - 센것.모름.length;
  const 몫 = (n) => (잰것 ? `${((n / 잰것) * 100).toFixed(0)}%` : '—');
  console.log(`   ✅ 색인됨      ${String(센것.색인됨.length).padStart(3)}장  ${몫(센것.색인됨.length)}`);
  console.log(`   ⚠ 와서 안 넣음 ${String(센것.와서안넣음.length).padStart(3)}장  ${몫(센것.와서안넣음.length)}  — 글·제목을 고쳐야 한다`);
  console.log(`   🔴 안 왔음     ${String(센것.안왔음.length).padStart(3)}장  ${몫(센것.안왔음.length)}  — 알리고 링크를 걸어야 한다`);
  if (센것.모름.length) console.log(`   ⬜ 못 쟀음     ${String(센것.모름.length).padStart(3)}장          — 0 으로 세지 않는다`);

  console.log(`\n⇒ 사이트맵 ${주소들.length}장에 견주면 색인된 것은 어림잡아 ${Math.round(주소들.length * (센것.색인됨.length / Math.max(1, 잰것)))}장으로 보인다.`);
  console.log('   ⛔ 「어림」이다. 정확한 수는 서치콘솔 화면에서만 보인다.');

  for (const [갈래, 목록] of Object.entries(센것)) {
    if (!목록.length || 갈래 === '색인됨') continue;
    console.log(`\n   [${갈래}] 보기 —`);
    for (const u of 목록.slice(0, 5)) console.log(`     ${u.replace(뿌리, '')}`);
  }
}
