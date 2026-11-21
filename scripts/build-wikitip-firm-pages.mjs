#!/usr/bin/env node
/**
 * 회사 지면 — **우리가 파는 여정표의 미리보기.**
 *
 * ⛔ 왜 이걸 내나 ─────────────────────────────────────────────
 *   우리가 파는 물건은 **회사별 여정표 한 장**이다(docs/상품안/여정표-*.md 17장).
 *   ⚠ 그런데 그 물건을 설명하는 지면이 웹에 **한 장도 없다.**
 *      그 회사 사람이 「우리 작품이 어느 나라에서 떴나」를 검색해도 우리를 못 만난다.
 *   ⭐ 이 지면들이 그 문이다. 2번(21:4x) 「물건을 넓히는 것이 5번이 스스로 낸 답」의 첫 걸음.
 *
 * ⛔ 이 자가 지키는 것 ───────────────────────────────────────────
 * ⛔ **파는 것을 다 내주지 않는다.** 지면은 **한 회사가 어디까지 갔나**까지다.
 *    작품 하나하나의 주별 자취·순위·시장별 자리 수는 **여정표에만** 있다.
 *    ⚠ 그 경계를 지면이 스스로 말한다 — 감추는 것이 아니라 **무엇이 더 있는지 적는다.**
 * ⛔ **회사끼리 줄세우지 않는다.** 지면마다 그 회사 것만 담는다. 이름 차례로 낸다.
 * ⛔ **취향을 평가하지 않는다.** 「좋은 작품」이라 안 쓴다. 다닌 자취만 적는다.
 * ⛔ 광고 자리를 만들지 않는다. Riot Production(App 866800) 승인 전이다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { 지금 } from './_kst.mjs';
import { 등급 } from './collect-korean-title-firms.mjs';

/**
 * **지면을 내는 문턱 — 차트에 든 작품 편수.**
 *
 * ⚠ 이 자는 `grade === 'A'` 로 걸러 왔고, `등급()` 은 편수만 본다(10편 이상이 A).
 *   그런데 지면 글에는 「카탈로그를 온전히 볼 수 있는 곳」이라고 적혀 있었다 — 사실이 아니었다.
 * ✅ 그래서 문턱을 «수»로 이 자리에 세우고, 지면 글이 그 수를 읽어 말하게 한다.
 * ⛔ 손으로 10 이라 적고 끝내지 않는다. 아래 자가시험이 `등급()` 과 «맞는지» 잰다 —
 *   등급 규칙이 바뀌면 시험이 깨져서 알려 준다.
 */
export const 지면문턱 = 10;

const 나라파일 = 'archive/raw/netflix-top10/countries.ndjson';
const 회사파일 = 'archive/raw/netflix-top10/firm-works.json';
const 낼파일 = 'src/data/wikitip-firm-pages.json';

/**
 * 몇 장을 내나.
 *
 * 🔴 2026-08-24 — **여덟에서 A등급 전부로 올린다.** 원래 여덟은 2번 지시였고,
 *   고르는 법은 「A등급에서 이름 차례로」였다. 순위로 안 읽히게 하려던 뜻은 옳다.
 *   ⛔ 그런데 재 보니 그 규칙이 **알파벳 L~Z 를 통째로 지우고 있었다.**
 *   A등급 19곳 중 앞 8곳만 나가서, 빠진 11곳에 이런 이름들이 다 있었다 —
 *     tvN 76편 · SBS 47 · SLL 39 · SHOWBOX 37 · SLL·Studio Dragon 28 · MBC 24
 *     Next Entertainment World 25 · Lotte Entertainment 21 · Plus M 12 · TVING 12
 *   가장 큰 곳(tvN)과 **회사 주소 중 유일하게 검색 노출이 있는 곳**(Lotte,
 *   28일 노출 7 · 순위 7)이 둘 다 밖에 있었다. 순위를 피하려다 알파벳 순위를 만든 것이다.
 *
 * ⭐ A등급 전부를 내면 **고르는 일 자체가 없어진다.** 「여덟을 골랐다」고 설명할 것이
 *   없고, 지면은 「카탈로그를 온전히 볼 수 있는 곳 전부」라고 말하면 된다.
 *   그것이 이름 차례보다 더 정직하다.
 * ⛔ B·C 등급으로 넓히지 않는다. 등급은 **카탈로그를 얼마나 온전히 보는가**이고,
 *   덜 보이는 곳의 지면을 내면 그 지면이 우리가 모르는 것을 아는 척한다.
 */
export const 낼장수 = null;   /* null = A등급 전부. 수를 손으로 적지 않는다 */

/** 주소에 쓸 이름. ⛔ 빈 슬러그를 내지 않는다 */
export function 슬러그(이름) {
  const s = String(이름).toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return s || null;
}

/** 몫. 밑이 0 이면 **0 이 아니라 null** */
export function 몫(a, b) {
  if (!b) return null;
  return +((100 * a) / b).toFixed(1);
}

/**
 * 한 주에 가장 넓게 퍼졌을 때 몇 나라였나.
 * ⛔ 「35개 나라」는 *동시에* 와 *차례로* 가 전혀 다른 이야기다. 여정표와 같은 셈을 쓴다.
 * ⛔ 같은 넓이면 **이른 주**를 잡는다 — 늦은 주를 잡으면 회사마다 답이 달라진다.
 */
export function 가장넓은주(줄들) {
  const 주별 = new Map();
  for (const r of 줄들) {
    if (!주별.has(r.주)) 주별.set(r.주, new Set());
    주별.get(r.주).add(r.iso2);
  }
  let 주 = null; let 수 = 0;
  for (const w of [...주별.keys()].sort()) {
    const n = 주별.get(w).size;
    if (n > 수) { 수 = n; 주 = w; }
  }
  return { week: 주, countries: 수 };
}

const 내가실행됐다 = process.argv[1]
  && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (내가실행됐다 && process.argv.includes('--selftest')) {
  let 통 = 0; let 실 = 0;
  const 재본다 = (이름, 실제, 바람) => {
    if (JSON.stringify(실제) === JSON.stringify(바람)) 통 += 1;
    else { 실 += 1; console.error(`  ⛔ ${이름}\n     받은 것: ${JSON.stringify(실제)}`); }
  };
  재본다('슬러그', 슬러그('SHOWBOX Co., Ltd.'), 'showbox-co-ltd');
  재본다('슬러그 — 앞뒤 줄표를 뗀다', 슬러그('--tvN--'), 'tvn');
  /* ⛔ 빈 슬러그를 내면 주소가 겹친다. 작품 지면에서 한 번 물렸던 자리다 */
  재본다('슬러그 — 라틴이 없으면 null', 슬러그('오징어'), null);
  재본다('몫 — 밑이 0 이면 null', 몫(1, 0), null);
  const ㅈ = (주, iso2) => ({ 주, iso2 });
  재본다('가장 넓은 주', 가장넓은주([ㅈ('w1', 'KR'), ㅈ('w2', 'KR'), ㅈ('w2', 'JP')]),
    { week: 'w2', countries: 2 });
  /* ⛔ 같은 넓이면 이른 주 */
  재본다('같은 넓이면 이른 주', 가장넓은주([ㅈ('w2', 'KR'), ㅈ('w1', 'JP')]),
    { week: 'w1', countries: 1 });
  재본다('빈 것', 가장넓은주([]), { week: null, countries: 0 });
  /**
   * 🔴 [2026-09-08] 지면 글이 자름선을 «다른 것으로» 말하고 있었다 —
   *   「카탈로그를 온전히 볼 수 있는 곳만」이라고 적혀 있었는데, 실제 자름선은 편수뿐이다.
   * ✅ 그래서 문턱 수를 세우고 `등급()` 과 어긋나지 않는지 여기서 잰다.
   *   ⛔ 등급 규칙이 바뀌면 이 시험이 깨진다 — 그때 지면 글도 같이 고쳐야 한다.
   */
  재본다(`문턱 ${지면문턱}편이면 A등급이다`, 등급(지면문턱), 'A');
  재본다(`문턱보다 한 편 적으면 A가 «아니다»`, 등급(지면문턱 - 1) === 'A', false);
  재본다('편수가 0이어도 등급을 낸다(빈 값이 아니다)', typeof 등급(0), 'string');
  console.log(`회사 지면 수집기 — 자가시험 ${통} 통과 · ${실} 실패`);
  process.exit(실 ? 1 : 0);
}

if (내가실행됐다) {
  for (const p of [나라파일, 회사파일]) {
    if (!fs.existsSync(p)) {
      console.log(`⛔ 원자료가 없다 — ${p}`);
      console.log('   ⚠ archive/ 는 git 에 안 올라간다. 「안 됐다」가 아니라 **못 쟀다**.');
      process.exit(1);
    }
  }
  const 회사자료 = JSON.parse(fs.readFileSync(회사파일, 'utf8'));

  /* 제목(소문자) → 그 제목이 나온 줄들 */
  const 제목줄 = new Map();
  let 줄 = 0;
  const 주모음 = new Set();
  for (const l of fs.readFileSync(나라파일, 'utf8').split('\n')) {
    if (!l) continue;
    줄 += 1;
    let r;
    try { r = JSON.parse(l); } catch { continue; }
    const iso2 = String(r.iso2).toUpperCase();
    if (iso2 === 'RU') continue;
    주모음.add(r.주);
    const k = String(r.제목 || '').toLowerCase();
    if (!제목줄.has(k)) 제목줄.set(k, []);
    제목줄.get(k).push({ 주: r.주, iso2, 국가: r.국가, 순위: r.순위, 제목: r.제목 });
  }

  /*
   * ⛔ 어느 여덟 곳인가 — **A등급에서 이름 차례로** 고른다.
   *   A등급은 「카탈로그를 가장 온전히 볼 수 있는 곳」이지 **잘하는 순서가 아니다.**
   *   ⭐ 이름 차례로 골라 「우리가 고른 여덟」이 순위로 안 읽히게 한다. 그 까닭을 지면이 말한다.
   */
  const 후보 = 회사자료.firms
    .filter((f) => f.grade === 'A' && 슬러그(f.firm))
    .sort((a, b) => a.firm.localeCompare(b.firm));

  const 지면들 = [];
  for (const f of 후보) {
    const 줄들 = [];
    const 작품 = new Map();
    for (const w of f.works) {
      const k = String(w.title || '').toLowerCase();
      const rows = 제목줄.get(k);
      if (!rows || !rows.length) continue;
      줄들.push(...rows);
      작품.set(w.title, rows);
    }
    if (작품.size < 3) continue;                 /* ⛔ 얇으면 안 낸다 */
    const 나라 = new Set(줄들.map((r) => r.iso2));
    const 나라별 = new Map();
    for (const r of 줄들) 나라별.set(r.국가, (나라별.get(r.국가) ?? 0) + 1);
    const 넓 = 가장넓은주(줄들);
    /* ⛔ 작품 목록은 **다섯 편까지**만. 나머지는 여정표에 있다 */
    const 작품줄 = [...작품].map(([title, rows]) => {
      const n = 가장넓은주(rows);
      return {
        title,
        places: rows.length,
        countries: new Set(rows.map((r) => r.iso2)).size,
        atOnce: n.countries,
        peak: Math.min(...rows.map((r) => r.순위)),
      };
    }).sort((a, b) => b.places - a.places);

    지면들.push({
      firm: f.firm,
      slug: 슬러그(f.firm),
      grade: f.grade,
      titlesInCatalogue: f.works.length,
      titlesThatCharted: 작품.size,
      places: 줄들.length,
      markets: 나라.size,
      weeks: new Set(줄들.map((r) => r.주)).size,
      widestWeek: 넓.week,
      widestWeekCountries: 넓.countries,
      topMarket: [...나라별].sort((a, b) => b[1] - a[1])[0][0],
      topMarketPlaces: [...나라별].sort((a, b) => b[1] - a[1])[0][1],
      shown: 작품줄.slice(0, 5),
      titlesNotShown: Math.max(0, 작품.size - 5),
    });
    /* ⛔ 자리 수로 자르지 않는다 — 자르면 알파벳 뒤쪽이 통째로 사라진다.
       낼장수 가 수로 적혀 있을 때만 자른다(되돌리고 싶을 때를 위해 남겨 둔다). */
    if (낼장수 !== null && 지면들.length >= 낼장수) break;
  }

  /* ── 스스로 본다 ── */
  /**
   * ⛔ 「몇 장이라야 한다」를 손으로 적지 않는다. **후보 수와 같아야 한다** —
   *   그게 「A등급 전부를 냈다」의 뜻이다. 수를 적어 두면 등급이 하나 늘 때 조용히 어긋난다.
   * ⛔ 0장이면 통과가 아니다. 아무것도 안 내고 성공했다고 하지 않는다.
   */
  const 있어야할장수 = 낼장수 === null ? 후보.length : 낼장수;
  if (!있어야할장수) throw new Error('후보가 0곳이다 — 자료를 못 읽었다. 0장을 내고 통과시키지 않는다');
  if (지면들.length !== 있어야할장수) {
    throw new Error(`지면이 ${지면들.length}장이다 — ${있어야할장수}장이라야 한다`);
  }
  const 슬러그모음 = new Set(지면들.map((x) => x.slug));
  if (슬러그모음.size !== 지면들.length) throw new Error('주소가 겹친다');
  for (const x of 지면들) {
    if (!x.slug) throw new Error(`${x.firm} — 주소가 비었다`);
    if (x.widestWeekCountries > x.markets) {
      throw new Error(`${x.firm} — 한 주 넓이(${x.widestWeekCountries})가 전체 시장(${x.markets})보다 크다`);
    }
    if (x.titlesThatCharted > x.titlesInCatalogue) {
      throw new Error(`${x.firm} — 차트에 오른 작품이 카탈로그보다 많다`);
    }
    for (const t of x.shown) {
      if (t.atOnce > t.countries) throw new Error(`${x.firm}/${t.title} — 동시가 전체보다 크다`);
      if (t.peak < 1 || t.peak > 10) throw new Error(`${x.firm}/${t.title} — 순위가 1~10 밖이다`);
    }
  }

  const out = {
    generated: 지금(),
    source: 'Netflix Top 10 (Tudum) weekly country lists, joined to production company (P272), original '
      + 'broadcaster (P449) and distributor (P750) from Wikidata.',
    whatIsHere: 'How far one company\'s titles travelled: how many markets, how many at once, and where the '
      + 'places fell.',
    whatIsNotHere: 'The week-by-week path of each title, its rank in each market, the full market table and the '
      + 'titles that never charted are in the company sheet, not on this page.',
    /* 🔴 이 문장이 「여덟을 골랐다」였다. 이제 고르지 않으므로 고른 이유를 적을 것이 없다.
       ⛔ 대신 **무엇이 빠졌는지**를 적는다 — 안 보이는 것과 없는 것은 다르다.

       🔴🔴 [2026-09-08 · 5번] **그 두 문장이 사실이 아니었다. 라이브 20장에 나가 있었다.**
         적혀 있던 말: 「Every company whose catalogue we can see completely」
                     「Companies whose catalogue we can only see in part have no sheet here」
         ⇒ 「목록을 온전히 볼 수 있는 회사만 낸다」로 읽힌다.

         그런데 실제 자름선은 `collect-korean-title-firms.mjs` 의 `등급()` 이고, 그것은
         **차트에 든 작품 «편수»뿐**이다 — A는 10편 이상, B는 5편 이상, 그 아래가 C.
         카탈로그를 얼마나 보는지는 **재지도 않는다.**

       ⛔ 9편인 회사는 「부분만 보이는 곳」이 아니다. 그냥 편수가 적은 곳이다.
         우리 강령이 「」인데, 이 문장은 자름선을 «다른 것으로»
         바꿔 말했다. 지면 스무 장이 그 말을 하고 있었고 그중 하나가 B2B 지면(/for-industry)이다.
       ⭐ 그리고 이 자름선은 «문턱 수»를 지면이 직접 말해야 한다 — 그래야 손님이 검산한다.
         그래서 아래 문장은 손으로 적지 않고 `지면문턱` 에서 읽어 만든다. */
    whichCompanies: `Every company with ${지면문턱} or more titles that reached a Netflix weekly top 10, in alphabetical order. `
      + 'The cut is a title count and nothing else, so this list is not a ranking and being on it is not a judgement.',
    whatIsMissing: `Companies with fewer than ${지면문턱} charting titles have no sheet here. `
      + 'That is a threshold we set to keep each sheet worth reading, not a statement about the company, '
      + 'and not a claim about how much of its catalogue we can see.',
    /** ⚠ 문턱을 자료에 함께 낸다. 지면이 수를 손으로 적지 않게 하려는 것이다 */
    pageThreshold: 지면문턱,
    weeksSpanned: 주모음.size,
    rowsRead: 줄,
    pages: 지면들.length,
    firms: 지면들,
  };
  fs.writeFileSync(낼파일, `${JSON.stringify(out, null, 2)}\n`, 'utf8');

  console.log(`줄 ${줄.toLocaleString('en-US')} · 주 ${주모음.size} · 지면 ${지면들.length}장`);
  for (const x of 지면들) {
    console.log(`  /firm/${x.slug.padEnd(24)} 작품 ${String(x.titlesThatCharted).padStart(3)} · 시장 ${String(x.markets).padStart(2)} · 한 주 최대 ${String(x.widestWeekCountries).padStart(2)}곳 · 자리 ${x.places}`);
  }
  console.log(`→ ${낼파일}`);
}
