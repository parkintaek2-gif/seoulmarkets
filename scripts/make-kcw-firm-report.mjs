#!/usr/bin/env node
/**
 * **「내 작품 여정표」 한 장** — 한 회사에게 파는 물건. (사장님 지시 2026-08-09 · b2b 판매)
 *
 * ── 왜 이것을 먼저 만드나 ──────────────────────────────────────
 * 2번: 「오늘 팔 수 있는 것 하나를 고르고 까닭을 적으십시오」. 이것을 골랐다. 까닭 넷 —
 *   ① **오늘 만들 수 있다.** 자료가 이미 다 있다. 새로 모을 것이 없다
 *   ② 그 회사만 관심 있는 물건이라 **값을 깎을 상대가 없다**
 *   ③ 보내면 **답이 온다.** 안 오면 그것도 답이다
 *   ④ 실패해도 **잃는 것이 시간뿐**이다. 재고도 계약도 사람도 안 든다
 *
 * ── 무엇을 파나 — 그들이 **못 가진 것** ────────────────────────
 * 넷플릭스는 공급사에 **글로벌 시간**을 준다. **나라를 안 준다.**
 * 그래서 제작사·배급사는 자기 작품이 **어느 시장에서** 어떻게 다녔는지 모른다.
 * 다음 작품을 어느 나라에 먼저 낼지 정할 근거가 없다. 그 근거를 판다.
 *
 * ── ⛔ 지키는 것 ──────────────────────────────────────────────
 * · **취향을 평가하지 않는다.** 「좋은 작품」이라 안 쓴다. 다닌 자취만 적는다
 * · **회사끼리 줄세우지 않는다.** 이 장은 그 회사 것만 담는다. 남과 견주는 칸은 「왜 다른가」와 함께
 * · 못 잰 것은 **못 쟀다**고 적는다. 빈칸을 
 *
 * 쓰는 법: node scripts/make-kcw-firm-report.mjs --회사 "SHOWBOX Co., Ltd."
 *          node scripts/make-kcw-firm-report.mjs --전부      ← A등급 열일곱 곳을 한 번에
 *          node scripts/make-kcw-firm-report.mjs --selftest
 */
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const 회사파일 = 'archive/raw/netflix-top10/firm-works.json';
const 나라판 = 'archive/raw/netflix-top10/countries.ndjson';
const 낼방 = 'docs/상품안';

/** 파일 이름으로 쓸 수 있게 다듬는다 */
export function 파일이름(회사) {
  return 회사.normalize('NFC').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').toLowerCase();
}

/** 주 문자열에서 해를 뽑는다. 꼴이 다르면 **지어내지 않고 던진다** */
export function 해(주) {
  const m = /^(\d{4})-\d{2}-\d{2}$/.exec(주);
  if (!m) throw new Error(`주가 YYYY-MM-DD 가 아니다: ${주}`);
  return +m[1];
}

/**
 * 한 작품의 여정을 한 줄로 접는다.
 * ⛔ 자리(places)는 **나라×주**다. 나라 수와 주 수를 따로 적지 않으면 둘이 섞여 읽힌다.
 */
export function 여정(줄들) {
  if (!줄들.length) return null;
  const 나라 = new Set(); const 주 = new Set();
  let 최고 = 99; let 첫 = '9999-99-99'; let 끝 = '0000-00-00';
  const 나라별 = new Map();
  for (const r of 줄들) {
    나라.add(r.iso2); 주.add(r.주);
    if (r.순위 < 최고) 최고 = r.순위;
    if (r.주 < 첫) 첫 = r.주;
    if (r.주 > 끝) 끝 = r.주;
    나라별.set(r.국가, (나라별.get(r.국가) || 0) + 1);
  }
  const 큰나라 = [...나라별].sort((a, b) => b[1] - a[1])[0];
  /*
   * 🔴 2026-08-09 20:1x — **한 주에 가장 넓게 퍼졌을 때 몇 나라였나.**
   *   ⭐ 「35개 나라」는 *동시에* 35곳인 것과 *차례로* 35곳인 것이 전혀 다른 이야기인데,
   *     지금 시트는 그 둘을 같은 칸(Markets)에 담아 왔다. 회사가 알고 싶은 것은 앞엣것이다.
   *   ⭐ 그리고 오늘 잰 것 — 이 칸을 순위 옆에 두면 시청시간 설명력이 **+4.2%p** 오른다.
   *     넷플릭스가 세계 차트에도 나라 차트에도 안 주는 칸이고, 우리가 만든다.
   */
  const 주별나라 = new Map();
  for (const r of 줄들) {
    if (!주별나라.has(r.주)) 주별나라.set(r.주, new Set());
    주별나라.get(r.주).add(r.iso2);
  }
  let 가장넓은주 = null; let 가장넓은수 = 0;
  /* ⛔ 같은 넓이면 **이른 주**를 잡는다 — 늦은 주를 잡으면 회사마다 답이 달라진다 */
  for (const w of [...주별나라.keys()].sort()) {
    const n = 주별나라.get(w).size;
    if (n > 가장넓은수) { 가장넓은수 = n; 가장넓은주 = w; }
  }
  return {
    places: 줄들.length, countries: 나라.size, weeks: 주.size,
    peak: 최고, first: 첫, last: 끝,
    topMarket: 큰나라[0], topMarketPlaces: 큰나라[1],
    widestWeekCountries: 가장넓은수, widestWeek: 가장넓은주,
  };
}

const 내가실행됐다 = process.argv[1]
  && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (내가실행됐다 && process.argv.includes('--selftest')) {
  let 통과 = 0; let 실패 = 0;
  const 재본다 = (이름, 실제, 바람) => {
    const ok = typeof 바람 === 'function' ? 바람(실제) : JSON.stringify(실제) === JSON.stringify(바람);
    if (ok) 통과 += 1; else { 실패 += 1; console.error(`  ⛔ ${이름}\n     받은 것: ${JSON.stringify(실제)}`); }
  };
  재본다('파일 이름을 다듬는다', 파일이름('SHOWBOX Co., Ltd.'), 'showbox-co-ltd');
  재본다('한글 이름도 남긴다', 파일이름('스튜디오 드래곤'), (s) => s.includes('스튜디오'));
  재본다('해를 뽑는다', 해('2023-04-16'), 2023);
  재본다('꼴이 다르면 던진다',
    (() => { try { 해('2023-4-16'); return '안 던짐'; } catch { return '던짐'; } })(), '던짐');
  재본다('빈 줄은 null', 여정([]), null);
  const 보기 = [
    { iso2: 'KR', 국가: 'South Korea', 주: '2023-01-01', 순위: 3 },
    { iso2: 'KR', 국가: 'South Korea', 주: '2023-01-08', 순위: 1 },
    { iso2: 'VN', 국가: 'Vietnam', 주: '2023-01-08', 순위: 7 },
  ];
  const v = 여정(보기);
  재본다('자리는 줄 수다', v.places, 3);
  재본다('나라 수와 주 수를 따로 센다', [v.countries, v.weeks], [2, 2]);
  재본다('최고 순위는 가장 작은 수다', v.peak, 1);
  재본다('첫 주·마지막 주', [v.first, v.last], ['2023-01-01', '2023-01-08']);
  재본다('가장 크게 걸린 시장', [v.topMarket, v.topMarketPlaces], ['South Korea', 2]);
  /* ⛔ 자리 = 나라 × 주 가 **아니다**. 같은 주에 두 나라면 자리 2 · 나라 2 · 주 1 이다 */
  재본다('자리를 나라×주로 셈하지 않는다', v.places !== v.countries * v.weeks, true);
  console.log(실패 ? `⛔ ${실패}개 틀렸다 (통과 ${통과})` : `✅ 검사 ${통과}개 통과`);
  process.exit(실패 ? 1 : 0);
}

if (내가실행됐다) {
  const i = process.argv.indexOf('--회사');
  const 고른회사 = i >= 0 ? process.argv[i + 1] : null;
  /* ⛔ `archive/` 는 git 이 안 담는다(원자료 자리다). 다른 창에서는 이 파일이 없다.
     「파일이 없다」로 멎지 말고 **무엇을 먼저 부를지** 일러 준다 */
  if (!fs.existsSync(회사파일)) {
    console.log(`⬜ ${회사파일} 이 없다 — archive 는 git 이 안 담는다.`);
    console.log('   먼저 이것을 부른다: node scripts/collect-korean-title-firms.mjs  (위키데이터에 7묶음 묻는다)');
    process.exit(1);
  }
  const 자료 = JSON.parse(fs.readFileSync(회사파일, 'utf8'));
  if (!고른회사 && !process.argv.includes('--전부')) {
    console.log('⛔ --회사 <이름> 이 없다(A등급 전부는 --전부). A등급 열일곱 곳:');
    for (const f of 자료.firms.filter((x) => x.grade === 'A')) console.log(`   ${f.firm}  (${f.works.length}편)`);
    process.exit(1);
  }
  /*
   * ⭐ 2026-08-09 11:1x — `--전부` 를 붙였다.
   *   ⛔ 회사 한 곳마다 원자료(49만 줄)를 다시 읽고 있었다. 열일곱 곳이면 열일곱 번이다.
   *      **한 번 읽고 열일곱 장**을 낸다. 만드는 내용은 한 글자도 안 바꿨다.
   */
  const 만들회사들 = 고른회사 === '--전부' || process.argv.includes('--전부')
    ? 자료.firms.filter((x) => x.grade === 'A')
    : [자료.firms.find((x) => x.firm === 고른회사)];
  if (만들회사들.some((x) => !x)) throw new Error(`그런 회사가 명단에 없다: ${고른회사} — 이름을 그대로 넣는다`);

  /* 이 회사들 작품의 넷플릭스 제목을 **다 합쳐** 한 번만 읽는다 */
  const 온제목 = new Set(만들회사들.flatMap((f) => f.works.map((w) => w.title).filter(Boolean)));
  const 온모음 = new Map([...온제목].map((t) => [t, []]));
  /* ⛔ 자료 창은 **판 전체**에서 잰다. 그 회사 줄에서 재면 그건 창이 아니라 **그들의 발자국**이다.
     둘을 한 줄에 적으면 손님은 「자료가 104주뿐인가」로 읽는다. 갈라 적는다. */
  const 창 = { 첫: '9999-99-99', 끝: '0000-00-00', 나라: new Set() };
  const rl = readline.createInterface({ input: fs.createReadStream(나라판), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    let r; try { r = JSON.parse(line); } catch { continue; }
    if (r.iso2 === 'RU') continue;
    if (r.주 < 창.첫) 창.첫 = r.주;
    if (r.주 > 창.끝) 창.끝 = r.주;
    창.나라.add(r.iso2);
    if (!온모음.has(r.제목)) continue;
    온모음.get(r.제목).push(r);
  }

  /* 여기서부터 회사마다 한 장씩. **원자료는 위에서 이미 다 읽었다** */
  for (const 회사 of 만들회사들) {
  const 제목들 = new Set(회사.works.map((w) => w.title).filter(Boolean));
  const 제목없음 = 회사.works.length - 제목들.size;
  const 모음 = new Map([...제목들].map((t) => [t, 온모음.get(t) ?? []]));

  const 줄 = [...모음].map(([title, rows]) => ({ title, ...(여정(rows) ?? {}) }))
    .filter((x) => x.places)
    .sort((a, b) => b.places - a.places);
  const 안걸린것 = [...모음].filter(([, rows]) => !rows.length).map(([t]) => t);

  const 총자리 = 줄.reduce((s, x) => s + x.places, 0);
  const 총나라 = new Set(); const 총주 = new Set();
  for (const [, rows] of 모음) for (const r of rows) { 총나라.add(r.iso2); 총주.add(r.주); }

  /* 시장별 — ⛔ 「어디가 1등인가」가 아니라 「어디가 다른가」를 보이려고 양 끝을 함께 낸다 */
  const 시장 = new Map();
  for (const [, rows] of 모음) for (const r of rows) 시장.set(r.국가, (시장.get(r.국가) || 0) + 1);
  const 시장순 = [...시장].sort((a, b) => b[1] - a[1]);

  /*
   * 🔴 2026-08-09 22:4x — **지금 업계가 하는 이야기 안에 이 회사를 놓는다.**
   *   업계 이야기는 「제작비 27배 → 감당할 곳이 준다 → 몰린다」다. 우리가 재 보니 **안 몰렸다.**
   *   ⭐ 손님이 사는 까닭은 「우리 작품이 어디 갔나」만이 아니라 **「그래서 우리가 어디 있나」**다.
   *      판 전체 수치는 지면에 공짜로 있다. 파는 것은 **그 옆에 놓인 자기 줄**이다.
   * ⛔ 남의 회사 수치를 이 종이에 안 적는다. 자기 줄과 **판 전체**만 나란히 놓는다.
   * ⛔ 판 자료가 없으면 이 절을 **통째로 뺀다.** 빈 표를 손님에게 보내지 않는다.
   */
  const 판길 = 'src/data/wikitip-leverage.json';
  const 판 = fs.existsSync(판길) ? JSON.parse(fs.readFileSync(판길, 'utf8')) : null;
  let 자리절 = '';
  if (판) {
    const 해별내작품 = new Map();
    for (const [t, rows] of 모음) {
      for (const r of rows) {
        const y = String(해(r.주));
        if (!해별내작품.has(y)) 해별내작품.set(y, new Set());
        해별내작품.get(y).add(t);
      }
    }
    const 줄들 = 판.byYear.map((y) => {
      const 내것 = 해별내작품.get(y.year)?.size ?? 0;
      const 몫 = y.titlesWithFirm ? +((100 * 내것) / y.titlesWithFirm).toFixed(1) : null;
      const 덜 = y.weeks < 40 ? ' *(part year)*' : '';
      return `| ${y.year}${덜} | ${내것} | ${y.titlesWithFirm} | ${몫 == null ? '—' : `${몫}%`} | ${y.topThreeRatio}× |`;
    });
    const 온전 = 판.byYear.filter((y) => y.weeks >= 40);
    const ㅊ = 온전[0]; const ㄲ = 온전[온전.length - 1];
    자리절 = `
## Where you sit in the year

The argument running through the industry right now starts from cost — a reported rise from about
$360,000 an episode in 2015 to roughly $9.8m for *Squid Game* season 2 in 2024 — and concludes that
fewer companies can now finance a Korean series. **Those cost figures are not ours and we hold no
budgets.** What we can measure is the consequence the argument predicts: the charts closing around
fewer companies. Across ${ㅊ.year}–${ㄲ.year} they did not. The three largest companies' coverage
went from ${ㅊ.topThreeRatio}× an even split to ${ㄲ.topThreeRatio}× — down.

Your own line, against that:

| Year | Your titles charting | All Korean titles charting | Your share | Market top-3 concentration |
|---|---:|---:|---:|---:|
${줄들.join('\n')}

⛔ **This is not a ranking and no other company appears on it.** The right-hand column is the whole
market, published openly at kculturewire.com/leverage; the columns beside it are yours. A year where
your share falls while the market count also falls is a different story from one where only yours does,
and the two columns are here so you can tell them apart.

⚠ A year with fewer charting titles makes any share look larger. That is why the market column is a
ratio against an even split rather than a raw percentage.
`;
  }

  const 값 = { A: '$60,000', B: '$24,000', C: '$6,000' }[회사.grade];
  /* 🔴 `toISOString()` 은 **UTC** 를 준다. 새벽 4시(KST)에 부르면 **어제 날짜**가 찍힌다.
     2026-08-07 에 /subscribe 가 라이브에서 하루 이른 날짜를 손님께 보인 것이 같은 병이었다.
     ⛔ 손님에게 가는 종이에 날짜를 틀리게 적지 않는다. 자리(시간대)를 못박는다. */
  const 잰날 = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
  const 줄글 = (x) => `| ${x.title} | ${x.countries} | ${x.widestWeekCountries} | ${x.places} | ${x.peak} | ${x.weeks} | ${x.first} → ${x.last} | ${x.topMarket} (${x.topMarketPlaces}) |`;

  const md = `# ${회사.firm} — where your titles travelled

**Netflix weekly country top 10 — ${창.나라.size} markets, ${창.첫} to ${창.끝}.** Measured ${잰날} (KST) by K Culture Wire.

Within that window your titles appear in **${총나라.size} markets across ${총주.size} weeks**.

Netflix publishes global hours to you. It does not publish **which market**. This sheet is that missing column.

## Your catalogue in this data

| | |
|---|---:|
| Titles of yours we hold | **${줄.length}** |
| Chart places they took | **${총자리.toLocaleString('en-US')}** |
| Markets they reached | **${총나라.size}** |
| Weeks they appear in | **${총주.size}** |
| Your role on these titles | ${[...new Set(회사.works.flatMap((w) => w.roles))].join(' · ')} |

## Title by title

⛔ This is not a ranking of quality. It is a record of movement.

| Title | Markets | At once | Places | Peak | Weeks | First → Last | Largest market |
|---|---:|---:|---:|---:|---:|---|---|
${줄.map(줄글).join('\n')}

*Places* counts one title appearing in one country in one week. A title in 3 countries for 4 weeks
can take 12 places. *Peak* is the highest position it reached in any single market.

**Read *Markets* and *At once* together.** *Markets* is every country the title ever reached;
*At once* is the most it held in a single week. A title with 40 markets and 38 at once opened
everywhere on one day. A title with 40 markets and 6 at once spread country by country over months —
two different kinds of release that the first column alone cannot tell apart. Netflix publishes
neither figure: both are counted here from the weekly country lists.

## Where they travelled — and why the ends differ

| Market | Places from your titles |
|---|---:|
${시장순.slice(0, 8).map(([n, v]) => `| ${n} | ${v} |`).join('\n')}
| … | |
${시장순.slice(-4).map(([n, v]) => `| ${n} | ${v} |`).join('\n')}

⛔ The bottom rows are not weaker markets. Countries differ in how many Korean titles their
chart carries at all — the United States fills half its Korean places with 6 titles, Vietnam
needs 49. A small number here can mean a narrow market, not a weak title.
The comparable figure for every market is at **kculturewire.com/catalogue-depth**.
${자리절}
## What this sheet cannot tell you

${안걸린것.length ? `- **${안걸린것.length} of your titles never entered any country's top 10** in this window, so they have no row above: ${안걸린것.slice(0, 6).join(', ')}${안걸린것.length > 6 ? ` and ${안걸린것.length - 6} more` : ''}. Absence from a top 10 is not absence of viewing.` : '- Every title of yours in our data entered at least one country top 10.'}
${제목없음 ? `- ${제목없음} of your works could not be matched to a Netflix chart title by name, so they are excluded rather than counted as zero.\n` : ''}- Netflix top 10 is a **rank list, not a viewing count**. A title outside the top 10 is invisible here at any level of viewing.
- We identify Korean titles by Wikidata country of origin and by item number. Where an English name is shared with a foreign work we say so rather than guess — the size of that group is published at kculturewire.com/catalogue-depth.

---

**${회사.firm}** is a grade ${회사.grade} holder in our data (${회사.works.length} titles).
One-off sheet **$2,000**. Annual access to the same data as it updates each week: **${값}**.

Source: Netflix Tudum weekly top 10 (country lists) · Wikidata P495 / P272 / P449 / P750.
Every figure on this sheet has a table behind it at kculturewire.com.
`;

  fs.mkdirSync(낼방, { recursive: true });
  const 낼길 = `${낼방}/여정표-${파일이름(회사.firm)}.md`;
  fs.writeFileSync(낼길, md);
  console.log(`${회사.firm} — 작품 ${줄.length}편 · 자리 ${총자리} · 시장 ${총나라.size} · 주 ${총주.size}`);
  if (안걸린것.length) console.log(`⚠ 어느 나라 top10 에도 안 걸린 작품 ${안걸린것.length}편 — 0 으로 안 적고 따로 밝혔다`);
  console.log(`→ ${낼길}`);
  }
}
