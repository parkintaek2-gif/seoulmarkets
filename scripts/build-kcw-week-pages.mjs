#!/usr/bin/env node
/**
 * build-kcw-week-pages.mjs — **한 주씩 지면을 낸다.** (`/week/<YYYY-MM-DD>` · 목록 `/weeks`)
 *
 * ── 🔴 왜 (2026-08-23 실측) ──────────────────────────────────
 * 28일 검색어를 낱말로 세 보니 우리 노출의 **60%(351 중 211)** 가
 * 「넷플릭스 자료파일·주간 주소를 그대로 치는 검색」이었다. 그중 가장 큰 무리가 이것이다 —
 * ```
 * netflix.com/tudum/top10?week=2024-11-03    노출 61 · 6.8~7.7위 · 클릭 0
 *  (따옴표·www·https 붙은 변형까지 합쳐 노출 120)
 * ```
 * 순위는 이미 7위 안팎인데 클릭이 0 이다. **손님이 찾는 것은 「그 주의 차트」인데
 * 우리에게 그 주를 보여 주는 지면이 한 장도 없었다.** 작품별·나라별로만 갈라 두었다.
 *
 * ⭐ 그래서 **안 쓰던 축**을 하나 편다 — 주(week). 자료는 이미 손에 있다(499,180줄).
 *   축을 바꾸는 것뿐이라 새로 캐 올 것이 없다.
 *
 * ── ⛔ 이 자가 지키는 것 ─────────────────────────────────────
 * ⛔ **한국 작품만 싣는다.** 우리는 한국 대중문화 매체다. 그 주의 전체 top 10 을 베끼면
 *   그건 넷플릭스 지면의 사본이고 우리 것이 아니다. **한국 몫이라고 지면에 밝힌다.**
 *   ⭐ 전체를 찾는 손님에게는 넷플릭스 그 주 지면으로 가는 문을 놓는다. 속이지 않는다.
 * ⛔ **나라별 표에는 시청 수가 없다.** 순위와 주만 있다. 「몇 명이 봤다」를 쓰지 않는다.
 * ⛔ 한국 작품 판정은 손으로 하지 않는다 — `lib/korean-netflix-titles.mjs` 의 자를 쓴다.
 *   그 자가 못 가른 것(이름이 같은 두 작품·글로벌에 안 뜬 것)은 **세어서 지면에 적는다.**
 * ⛔ 한 줄도 없는 주는 지면을 안 낸다. 빈 지면은 손님을 내보낸다.
 *
 * 쓰는 법
 *   node scripts/build-kcw-week-pages.mjs
 *   node scripts/build-kcw-week-pages.mjs --selftest
 */
import fs from 'node:fs';
import { 꼬리말 } from './kcw-static-footer.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { koreanTitleFilter } from './lib/korean-netflix-titles.mjs';
/* 🔴 [2026-09-03] UTC 로 날짜를 만들던 자리를 KST 로 고쳤다 */
import { 지금 } from './_kst.mjs';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const 곳간 = path.join(뿌리, 'archive', 'raw', 'netflix-top10');
export const 작품자료길 = path.join(뿌리, 'src', 'data', 'wikitip-title-pages.json');
export const 낼방 = path.join(뿌리, 'public', 'wikitip');

/** ⛔ 이 아래로는 지면을 안 낸다. 빈 지면·한 줄 지면은 손님을 내보낸다 */
export const 지면낼최소줄 = 3;

/** 가장 최근 나라별 표. ⛔ 파일이 없으면 못 쟀다 — 0 이 아니다 */
export function 가장최근나라표(방 = 곳간, 읽기 = fs.readdirSync) {
  const 것들 = 읽기(방).filter((f) => /^countries-\d{4}-\d{2}-\d{2}\.tsv$/.test(f)).sort();
  return 것들.length ? path.join(방, 것들[것들.length - 1]) : null;
}

/** TSV 한 줄 → 칸. ⛔ 쉼표가 아니라 탭이다 — 작품 이름에 쉼표가 흔하다 */
export function 줄가르기(줄) {
  return String(줄 ?? '').replace(/\r$/, '').split('\t');
}

export function 머리자리(머리줄) {
  const 칸 = 줄가르기(머리줄);
  const 자리 = {};
  for (const 이름 of ['country_name', 'country_iso2', 'week', 'category', 'weekly_rank',
    'show_title', 'season_title', 'cumulative_weeks_in_top_10']) {
    자리[이름] = 칸.indexOf(이름);
  }
  return 자리;
}

/**
 * 주별로 모은다. **작품 하나가 한 주에 여러 나라에 뜨는 것**이 보통이라
 * 작품별로 나라를 모으고, 가장 좋은 순위를 남긴다.
 */
export function 주별모으기(줄들, 자리, 남기나) {
  const 주 = new Map();
  let 걸러진줄 = 0;
  for (const 줄 of 줄들) {
    const c = 줄가르기(줄);
    const 제목 = c[자리.show_title];
    if (!제목) continue;
    if (!남기나(제목)) { 걸러진줄 += 1; continue; }
    const 주키 = c[자리.week];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(주키 ?? '')) continue;
    const 나라 = c[자리.country_name];
    const iso = c[자리.country_iso2];
    const 갈래 = c[자리.category];
    const 순위 = Number(c[자리.weekly_rank]);
    if (!주.has(주키)) 주.set(주키, { week: 주키, 작품: new Map(), 나라: new Map(), 줄수: 0 });
    const ㅈ = 주.get(주키);
    ㅈ.줄수 += 1;
    if (나라) ㅈ.나라.set(iso || 나라, 나라);
    const 열쇠 = `${제목}\u0000${갈래}`;   /* ⚠ 구분자는 «이스케이프로» 쓴다 — 날글자 NUL 을 박으면
      파일이 이진으로 읽혀 grep 이 안 통한다(2026-09-08 에 그것 때문에 이 파일을 못 읽었다) */
    if (!ㅈ.작품.has(열쇠)) {
      ㅈ.작품.set(열쇠, { title: 제목, category: 갈래, markets: new Set(), best: 99, places: 0 });
    }
    const ㅇ = ㅈ.작품.get(열쇠);
    if (iso || 나라) ㅇ.markets.add(iso || 나라);
    ㅇ.places += 1;
    if (Number.isFinite(순위) && 순위 < ㅇ.best) ㅇ.best = 순위;
  }
  return { 주, 걸러진줄 };
}

/** 지면에 쓸 꼴로 편다. ⛔ 순위표를 만들지 않는다 — 나라 수로 놓되 등수 칸을 안 둔다 */
export function 주정리(ㅈ) {
  return {
    week: ㅈ.week,
    rows: ㅈ.줄수,
    marketCount: ㅈ.나라.size,
    markets: [...ㅈ.나라.values()].sort(),
    titles: [...ㅈ.작품.values()]
      .map((x) => ({ ...x, marketCount: x.markets.size, markets: undefined }))
      .sort((a, b) => b.marketCount - a.marketCount || a.best - b.best
        || a.title.localeCompare(b.title)),
  };
}

/** 1 November 2024 처럼 읽는 말로. ⛔ 손님이 읽는 것은 ISO 가 아니다 */
export const 달이름 = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

export function 읽는날(iso) {
  const m = String(iso ?? '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return String(iso ?? '');
  return `${Number(m[3])} ${달이름[Number(m[2]) - 1]} ${m[1]}`;
}

export const 넷플릭스주소 = (week) => `https://www.netflix.com/tudum/top10?week=${week}`;

/** 우리 작품 지면이 있는 것만 링크로 건다. ⛔ 없는 주소로 걸면 404 를 손님에게 준다 */
export function 슬러그표(작품자료) {
  const 표 = new Map();
  const 것들 = 작품자료?.pages ?? 작품자료?.titles ?? [];
  for (const t of 것들) if (t.hasPage && t.slug && t.title) 표.set(t.title, t.slug);
  return 표;
}

/**
 * 🔴 [2026-10-05 23:1x · 5번] **Dataset 에 license·url 을 채운다.**
 *   사장님이 넘겨 주신 구글 메일 — 「데이터세트 구조화된 데이터 문제가 감지됨」.
 *
 *   세 Astro 레이아웃에는 채우기를 걸었는데 **이 지면 269장이 안 채워졌다** —
 *   여기는 레이아웃을 안 거치고 이 함수가 HTML 을 직접 찍기 때문이다.
 *   ⛔ 「레이아웃에 걸었으니 다 됐다」로 세지 않는다. **dist 를 재서** 알았다.
 *
 * ⛔ 이미 있는 값은 안 덮는다. ⛔ 정본을 모르면 url 을 안 넣는다.
 * ⚠ license 는 새 약속이 아니다 — 이용약관이 이미 손님께
 *   「다시 팔거나 그대로 배포하시는 것은 안 됩니다」라고 적어 둔 그것을 가리킨다.
 */
export function 주지면_데이터세트채우기(구조자료, 정본) {
  if (!구조자료 || typeof 구조자료 !== 'object') return 구조자료;
  let 것;
  try { 것 = JSON.parse(JSON.stringify(구조자료)); } catch { return 구조자료; }

  const 훑기 = (x) => {
    if (Array.isArray(x)) { for (const y of x) 훑기(y); return; }
    if (!x || typeof x !== 'object') return;
    const t = x['@type'];
    const 데이터세트인가 = t === 'Dataset' || (Array.isArray(t) && t.includes('Dataset'));
    if (데이터세트인가) {
      if (!x.license) x.license = 'https://www.kculturewire.com/terms';
      if (!x.url && 정본) x.url = 'https://www.kculturewire.com' + 정본;
    }
    for (const k of Object.keys(x)) if (x[k] && typeof x[k] === 'object') 훑기(x[k]);
  };
  훑기(것);
  return 것;
}

export const 껍데기 = (제목, 설명, 정본, 몸, 구조자료) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="canonical" href="https://www.kculturewire.com${정본}">
<title>${제목} &mdash; K Culture Wire</title>
<meta name="description" content="${설명}">
${구조자료 ? `<script type="application/ld+json">${JSON.stringify(주지면_데이터세트채우기(구조자료, 정본))}</script>` : ''}
<style>
  :root{ --ink:#14161a; --ink-2:#5b6270; --line:#e6e8ec; --bg:#fbfbfc; --card:#fff;
         --accent:#b4472a; --accent-soft:#fdf3f0; }
  @media (prefers-color-scheme: dark){ :root:not([data-theme="light"]){
    --ink:#eceef2; --ink-2:#9aa2b1; --line:#2a2e37; --bg:#101216; --card:#181b21;
    --accent:#e8825f; --accent-soft:#261915; } }
  :root[data-theme="dark"]{ --ink:#eceef2; --ink-2:#9aa2b1; --line:#2a2e37; --bg:#101216;
    --card:#181b21; --accent:#e8825f; --accent-soft:#261915; }
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);
    font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;
    -webkit-font-smoothing:antialiased}
  .wrap{max-width:760px;margin:0 auto;padding:32px 20px 80px}
  .back{display:inline-block;margin-bottom:24px;color:var(--accent);text-decoration:none;font-size:14px}
  h1{font-size:clamp(24px,4vw,34px);line-height:1.15;margin:0 0 10px;letter-spacing:-.02em}
  h2{font-size:19px;margin:36px 0 8px}
  .lead{color:var(--ink-2);margin:0 0 6px;max-width:62ch}
  .note{color:var(--ink-2);font-size:14px;margin:0 0 20px;max-width:62ch}
  .warn{background:var(--accent-soft);border-left:3px solid var(--accent);
    padding:12px 14px;border-radius:6px;margin:18px 0 28px;max-width:62ch;font-size:14px}
  .scroll{overflow-x:auto;margin:0 0 8px}
  table{width:100%;border-collapse:collapse;background:var(--card);
    border:1px solid var(--line);border-radius:10px;overflow:hidden}
  th,td{text-align:left;padding:10px 14px;border-bottom:1px solid var(--line);font-size:14px}
  th{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-2)}
  tr:last-child td{border-bottom:none}
  .nm{font-weight:600}
  .fine{color:var(--ink-2)}
  .num{text-align:right;white-space:nowrap}
  .names{color:var(--ink-2);font-size:14px;line-height:1.9;max-width:62ch}
  .grid{display:grid;gap:8px;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));
    margin:12px 0 0;padding:0;list-style:none}
  .grid a{display:block;background:var(--card);border:1px solid var(--line);border-radius:8px;
    padding:9px 12px;color:var(--accent);text-decoration:none;font-size:14px}
  a{color:var(--accent)}
  footer{margin-top:44px;padding-top:18px;border-top:1px solid var(--line);
    color:var(--ink-2);font-size:13px;max-width:62ch}
</style>
</head>
<body>
  <div class="wrap">
${몸}
    ${꼬리말(['<a href="/weeks">Every Top 10 week</a>'])}
  </div>
</body>
</html>
`;

/**
 * ⭐ 앞뒤 주로 가는 문 (2026-08-24 03:5x).
 *
 * 🔴 왜 — 오늘 색인을 표본으로 재 보니 작품 지면 21장 중 8장만 들어갔고, 안 들어간 것은
 *   「발견만(Discovered, not indexed)」이었다. 처음엔 **안쪽 링크가 적어서**라고 봤는데
 *   재 보니 아니었다 — `/title/my-demon` 은 들어오는 문이 **77개**, `/title/agency` 는 56개다.
 *   ⛔ 가설이 틀렸다. 안쪽 링크는 그 지면들의 문제가 아니다.
 * ⚠ 그런데 같은 자로 재다가 **주 지면의 약점**이 보였다 —
 *   작품 지면은 들어오는 문이 중앙값 14인데 **주 지면은 중앙값 1**이다.
 *   `/weeks` 목록에서 한 번 걸리는 것이 전부다. 그러면 구글이 끝가지로 본다.
 * ⭐ 앞뒤 주로 문을 낸다. 이것은 검색을 위한 꾸밈이 아니다 — **한 주를 본 사람이 다음
 *   주를 보고 싶은 것이 자연스럽다.** 손님에게 값이 없는 링크는 안 넣는다.
 */
export function 앞뒤주(정리들, 이번주) {
  const 순서 = 정리들.map((x) => x.week).sort();
  const i = 순서.indexOf(이번주);
  if (i < 0) return { 앞: null, 뒤: null };
  return { 앞: i > 0 ? 순서[i - 1] : null, 뒤: i < 순서.length - 1 ? 순서[i + 1] : null };
}

export function 앞뒤칸(앞, 뒤) {
  if (!앞 && !뒤) return '';
  const 조각 = [];
  if (앞) 조각.push(`<a href="/week/${앞}">&larr; ${읽는날(앞)}</a>`);
  if (뒤) 조각.push(`<a href="/week/${뒤}">${읽는날(뒤)} &rarr;</a>`);
  return `    <p class="note">The week before and after &mdash; ${조각.join(' &middot; ')}</p>\n`;
}

/**
 * 그 주 지면의 제목. **작품 이름을 앞에 놓는다.**
 *
 * 🔴 [2026-09-05 00:1x] 전 제목은 「Netflix Top 10, week of 4 July 2021 — the Korean titles」
 *   였다. 247장이 «다 같은 꼴»이고 **이름이 하나도 없다.**
 *   ⛔ 사람이 검색하는 것은 「Squid Game」이지 「week of 4 July 2021」이 아니다.
 *   ⭐ 어제(9/3) 네 유닛이 정한 규칙 — 「제목에 사람이 검색하는 실명 + 아무도 답하지 않는
 *     물음」. 「그 주에 어느 한국 작품이 가장 널리 있었나」는 아무도 답하지 않는다.
 *
 * ⚠ 작품 이름은 길이가 들쭉날쭉하다(「Alive」 5자 ~ 「Confidential Assignment 2:
 *   International」 40자). 그래서 **긴 꼴부터 대 보고 60자에 드는 첫 꼴을 쓴다.**
 *   ⛔ 이름을 잘라 넣지 않는다 — 자른 이름은 이름이 아니고, 검색에도 안 걸린다.
 *   ⬜ 이름이 너무 길어 어느 꼴도 60자에 안 들면 «가장 짧은 꼴»을 그대로 쓴다.
 *     길이 자가 그것을 목록에 올릴 것이고, 그것이 옳다 — 이름을 지키는 쪽을 고른다.
 */
/**
 * 영문 지면에 «뜻 없는» 우리말이 있나. 법으로 적어야 하는 것은 뺀다.
 *
 * ⛔ 지금 빼는 것은 통신판매업 신고번호 하나다 — 「2026-세종-0591」의 세종.
 *   ⚠ 이것을 안 빼면 이 시험은 «모든 지면»에 빨강을 낸다. 그러면 꺼진 시험이 된다.
 *     오늘 아침 check-kcw-korean-leak.mjs 가 2,795/2,796 을 빨강으로 낸 것과 같은 꼴이다.
 * ⛔ 예외를 넓히지 않는다. 새 예외가 필요하면 «왜»를 여기 적고 하나씩 넣는다.
 */
export function 뜻없는우리말(글) {
  const 깐것 = String(글 ?? '').replace(/[0-9]{4}-세종-[0-9]{4}/g, '');
  const 걸린것 = 깐것.match(/[가-힣]+/g) ?? [];
  return [...new Set(걸린것)];
}

export function 주제목(정리) {
  const 선두 = 정리.titles?.[0]?.title ?? null;
  const 긴날 = 읽는날(정리.week);
  if (!선두) return `Netflix Top 10, week of ${긴날} — the Korean titles`;
  const 꼴들 = [
    `${선두} led Korea's Netflix top 10, week of ${긴날}`,
    `${선두} — Korea on Netflix, week of ${긴날}`,
    `${선두} — Korea on Netflix, ${정리.week}`,
  ];
  return 꼴들.find((t) => t.length <= 60) ?? 꼴들[꼴들.length - 1];
}

/**
 * 🔴🔴 [2026-09-09 04:5x · 5번] **주별 지면 269장이 서로 거의 같은 글이었다.**
 *
 * 2026-09-08 에 색인을 물어 보고 두께를 잰 기록이 `src/data/kcw-google-indexed-20260908.json`
 * 에 남아 있다. 그 결론이 이랬다 —
 * ```
 *   /week/ 는 색인이 절반 넘게 되는데(12장 물어 7장) «노출이 0» 이다 — 색인 문제가 아니다
 *   안 된 것의 까닭이 「Crawled – currently not indexed」로 옮겨 갔다 (와서 보고 안 담기로 했다)
 *   269장 본문 1,883~3,084자 · 2,500자 미만 159장(59%)
 *   가장 얇은 두 장의 낱말 겹침 246/277 = 88.8%
 * ```
 * ⇒ **서로 다른 글이 아니었다.** 숫자 몇 개와 표만 바뀌고 설명 문단은 269장이 같았다.
 *
 * ⭐ 그리고 그 지면을 «찾는 사람은 있다» — 붙여넣은 넷플릭스 주소 검색
 *   (`netflix.com/tudum/top10?week=2024-11-03` 꼴)이 검색어가 보이는 노출의 33%다.
 *   ⛔ 그런데 그 검색은 `/market/nicaragua`·`/about`·`/title/knight-flower` 로 떨어진다.
 *     정작 그 주를 보여 주는 지면은 **노출이 0장**이다.
 *
 * ⭐ 그래서 «주마다 반드시 다른 사실»을 붙인다 — **지난주와 무엇이 바뀌었나**다.
 *   ⛔ 판정이 아니다. 「뜨는 작품」·「지는 작품」이라 쓰지 않는다.
 *     지난주 목록에 있었나 없었나, 나라 수가 늘었나 줄었나를 «세어» 적는다.
 *   ⛔ 지난주 자료가 없으면(첫 주·빠진 주) 이 칸을 «만들지 않는다.» 빈 칸을 
 */

/** 주 정리 하나에서 작품이름 → 나라수 표를 만든다 */
export function 나라수표(정리) {
  const 표 = new Map();
  for (const t of 정리?.titles ?? []) {
    const 이름 = String(t?.title ?? '').trim();
    if (!이름) continue;
    표.set(이름, Number(t.marketCount ?? 0));
  }
  return 표;
}

/**
 * 이번 주와 지난주를 대 본다.
 * ⛔ 지난주 정리가 없으면 null — 「바뀐 것이 없다」와 «못 쟀다»를 가른다.
 */
export function 주간변화(이번, 지난) {
  if (!이번 || !지난) return null;
  const 이 = 나라수표(이번);
  const 지 = 나라수표(지난);
  const 새로든것 = [...이.keys()].filter((n) => !지.has(n));
  const 빠진것 = [...지.keys()].filter((n) => !이.has(n));
  const 남은것 = [...이.keys()].filter((n) => 지.has(n))
    .map((n) => ({ 이름: n, 지난: 지.get(n), 이번: 이.get(n), 차: 이.get(n) - 지.get(n) }));
  const 늘어난것 = 남은것.filter((x) => x.차 > 0).sort((a, b) => b.차 - a.차);
  const 줄어든것 = 남은것.filter((x) => x.차 < 0).sort((a, b) => a.차 - b.차);
  return {
    지난주: 지난.week,
    새로든것: 새로든것.sort(),
    빠진것: 빠진것.sort(),
    그대로: 남은것.filter((x) => x.차 === 0).length,
    늘어난것,
    줄어든것,
    작품수차: (이번.titles?.length ?? 0) - (지난.titles?.length ?? 0),
    나라수차: (이번.marketCount ?? 0) - (지난.marketCount ?? 0),
    자리수차: (이번.rows ?? 0) - (지난.rows ?? 0),
  };
}

/** 늘거나 줄거나 그대로를 사람 말로. ⛔ 「뜨는/지는」 같은 판정어를 안 쓴다 */
export function 늘줌말(차) {
  /**
   * 🔴 자가시험이 잡았다 — `Number(null)` 은 **0** 이라 「같다」로 새어 나갔다.
   *   이 저장소가 늘 경고하는 그 함정이다(「못 쟀다」가 0 으로 바뀌는 것).
   *   ⛔ 그러니 null·undefined·빈 글자를 «Number 로 넘기기 전에» 걸러 낸다.
   */
  if (차 === null || 차 === undefined || 차 === '') return 'not measured';
  const n = Number(차);
  if (!Number.isFinite(n)) return 'not measured';
  if (n > 0) return `${n} more`;
  if (n < 0) return `${-n} fewer`;
  return 'the same number';
}

/**
 * 주간 변화 칸을 HTML 로. 지난주 자료가 없으면 빈 글자 — 칸 자체를 안 만든다.
 * ⚠ 지면에 한국어를 내지 않는다(손님이 영어권이다). 우리말은 코드 주석에만.
 */
export function 변화칸(변화, 슬러그, 읽는날) {
  if (!변화) return '';
  const 링크 = (이름) => {
    const s = 슬러그?.get?.(이름);
    return s ? `<a href="/title/${s}">${이름}</a>` : 이름;
  };
  const 조각 = [];
  조각.push('    <h2>What changed from the week before</h2>');
  조각.push(`    <p>Against <a href="/week/${변화.지난주}">${읽는날(변화.지난주)}</a>, this week held `
    + `${늘줌말(변화.작품수차)} Korean ${Math.abs(변화.작품수차) === 1 ? 'title' : 'titles'}, `
    + `reached ${늘줌말(변화.나라수차)} ${Math.abs(변화.나라수차) === 1 ? 'country' : 'countries'}, `
    + `and took ${늘줌말(변화.자리수차)} chart ${Math.abs(변화.자리수차) === 1 ? 'place' : 'places'}.</p>`);

  if (변화.새로든것.length) {
    조각.push(`    <p><b>Charting this week and not the week before</b> (${변화.새로든것.length}): `
      + `${변화.새로든것.map(링크).join(' &middot; ')}.</p>`);
  } else {
    조각.push('    <p>No title charted this week that had not charted the week before.</p>');
  }
  if (변화.빠진것.length) {
    조각.push(`    <p><b>Charting the week before and not this week</b> (${변화.빠진것.length}): `
      + `${변화.빠진것.map(링크).join(' &middot; ')}.</p>`);
  } else {
    조각.push('    <p>Every title that charted the week before charted again this week.</p>');
  }

  const 움직인것 = [...변화.늘어난것.slice(0, 3), ...변화.줄어든것.slice(0, 3)];
  if (움직인것.length) {
    조각.push('    <div class="scroll">');
    조각.push('    <table>');
    조각.push('      <thead><tr><th>Title held both weeks</th>'
      + '<th class="num">Countries, week before</th><th class="num">Countries, this week</th>'
      + '<th class="num">Change</th></tr></thead>');
    조각.push('      <tbody>');
    for (const x of 움직인것) {
      조각.push(`        <tr><td class="nm">${링크(x.이름)}</td>`
        + `<td class="num">${x.지난}</td><td class="num">${x.이번}</td>`
        + `<td class="num">${x.차 > 0 ? `+${x.차}` : x.차}</td></tr>`);
    }
    조각.push('      </tbody>');
    조각.push('    </table>');
    조각.push('    </div>');
    조각.push(`    <p class="note">${변화.그대로} ${변화.그대로 === 1 ? 'title' : 'titles'} held the `
      + 'same number of countries in both weeks. A country count going up or down is a count of '
      + 'top-10 listings, not a measure of how much anyone watched &mdash; Netflix&rsquo;s country '
      + 'file carries no viewing figures.</p>');
  } else {
    조각.push('    <p class="note">No title that held both weeks changed its country count.</p>');
  }
  return `${조각.join('\n')}\n`;
}

export function 주지면(정리, 슬러그, 전체주수, 앞 = null, 뒤 = null, 지난정리 = null) {
  const 줄 = 정리.titles.map((t) => {
    const s = 슬러그.get(t.title);
    const 이름 = s ? `<a href="/title/${s}">${t.title}</a>` : t.title;
    return `        <tr><td class="nm">${이름}</td>`
      + `<td class="fine">${t.category}</td>`
      + `<td class="num">${t.marketCount}</td>`
      + `<td class="num">${t.best}</td></tr>`;
  }).join('\n');

  const 제목 = 주제목(정리).replace(/—/g, '&mdash;');
  /* 🔴 2026-08-27 11:4x — 268장 «전부» 설명이 잘리고 있었다(최대 229자 · 구글은 155자쯤에서 자른다).
     잘린 뒤쪽은 전부 출처와 고지였고, 앞쪽에도 «손님이 누를 까닭»이 없었다.
     ⛔ 두 문장을 빼기 «전에» 본문을 쟀다 —
        「Korean slice」1회 · 「not the whole chart」1회 · Netflix 8회 · Tudum 1회.
        둘 다 본문에 살아 있으므로 설명에서만 덜었다. 없었으면 빼지 않았다.
     ⭐ 대신 무엇이 실려 있는지(작품·나라)를 넣었다 — 그것이 누를 까닭이다. */
  /**
   * 🔴🔴 [2026-09-09 06:4x · 5번] **설명 맨 앞에 «ISO 주 이름»을 넣는다.**
   *
   * 어제 잰 것 — 검색어가 보이는 노출의 33%(378노출)가 «붙여넣은 넷플릭스 주소»다.
   * ```
   *   「https://www.netflix.com/tudum/top10?week=2024-11-03」   노출 62
   *   「"netflix.com/tudum/top10?week=2024-11-03"」            노출 15
   * ```
   * ⛔ 그런데 그 검색이 `/market/nicaragua`(141) · `/about`(91) 로 떨어지고,
   *   정작 그 주를 보여 주는 이 지면은 **노출이 0장**이었다.
   *
   * ⭐ 까닭 하나가 여기 있었다 — 손님이 치는 글자는 `2024-11-03` 인데
   *   제목도 설명도 「3 November 2024」로만 적혀 있었다. **ISO 글자가 어디에도 없었다.**
   *
   * ⛔ 제목은 안 건드린다 — 제목 실험이 돌고 있다(다시잴날 2026-10-02).
   *   ⇒ 설명 맨 앞에 넣는다. 설명은 그 실험이 재는 변수가 아니다.
   * ⚠ 그리고 짧게 만든다 — 구글이 155자쯤에서 자른다(check-kcw-description-length).
   *   옛 설명은 약 150자였다. 앞에 덧붙이면 잘리므로 «줄이면서» 넣었다.
   */
  const 설명 = `Netflix week ${정리.week}: ${정리.titles[0]?.title ?? 'Korean titles'} led `
    + `${정리.titles.length} Korean ${정리.titles.length === 1 ? 'title' : 'titles'} — `
    + `${정리.rows} chart ${정리.rows === 1 ? 'place' : 'places'} in ${정리.marketCount} `
    + `${정리.marketCount === 1 ? 'country' : 'countries'}. Every title and country listed.`;

  /* 2026-08-29 — 아래 「This week&rsquo;s Korean titles」 는 늘 최신 주를 가리키는 입구다.
     날짜를 모르는 손님이 들어오는 문이라 지우지 않는다.
     🔴 [2026-09-05] 이 말이 원래 «HTML 주석»으로 지면 안에 있었다 — 주석도 브라우저로 간다.
       자가시험 「지면에 한국어가 없다」가 그 때문에 오래 빨강이었다. JS 주석으로 옮겼다.
       ⚠ 같은 잘못을 2026-08-28 에도 했다. 우리말은 «코드»에만 적는다. */
  const 몸 = `    <a class="back" href="/weeks">&larr; Every week</a>
    <a class="back" href="/netflix-korea-this-week">This week&rsquo;s Korean titles &rarr;</a>
    <h1>${정리.titles[0]?.title ? `${정리.titles[0].title} led Korea&rsquo;s Netflix week` : 'Netflix Top 10'}, ${읽는날(정리.week)}</h1>
    <p class="lead"><b>${정리.titles.length}</b> Korean ${정리.titles.length === 1 ? 'title' : 'titles'}
      held a weekly top 10 place in <b>${정리.marketCount}</b>
      ${정리.marketCount === 1 ? 'country' : 'countries'} that week, taking
      <b>${정리.rows}</b> chart ${정리.rows === 1 ? 'place' : 'places'} in total.</p>
    <p class="note">Week label <code>${정리.week}</code>, the same label Netflix uses. A chart place
      means one country's weekly top 10 listed the title once; it is not a count of viewers, and
      Netflix's country file carries no viewing figures at all.</p>

    <p class="warn"><b>This is the Korean slice of that week, not the whole chart.</b>
      Every week's top 10 in every country also holds titles from everywhere else, and we do not
      republish those &mdash; K Culture Wire counts Korean titles.
      <a href="${넷플릭스주소(정리.week)}" rel="nofollow noopener">Netflix's own page for this week</a>
      has the full lists.</p>

    <h2>Which Korean titles charted</h2>
    <div class="scroll">
    <table>
      <thead><tr><th>Title</th><th>Kind</th><th class="num">Countries</th>
        <th class="num">Best rank</th></tr></thead>
      <tbody>
${줄}
      </tbody>
    </table>
    </div>
    <p class="note">Ordered by how many countries listed it, then by best rank. That is a spread,
      not a ranking of the titles against each other.</p>

    <h2>Where they charted</h2>
    <p class="names">${정리.markets.join(' &middot; ')}</p>

${변화칸(주간변화(정리, 지난정리), 슬러그, 읽는날)}
${앞뒤칸(앞, 뒤)}
    <p class="note">One of ${전체주수} weeks we hold. <a href="/weeks">The full run of weeks</a> is
      here, and <a href="/netflix-top10-data">what is actually inside Netflix's two files</a> is
      written up separately.</p>`;

  return 껍데기(제목, 설명, `/week/${정리.week}`, 몸, {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 주제목(정리),
    description: 설명,
    temporalCoverage: 정리.week,
    creator: { '@type': 'Organization', name: 'K Culture Wire' },
    isBasedOn: ['https://www.netflix.com/tudum/top10'],
  });
}

export function 목록지면(정리들, 안낸주) {
  const 해별 = new Map();
  for (const w of 정리들) {
    const 해 = w.week.slice(0, 4);
    if (!해별.has(해)) 해별.set(해, []);
    해별.get(해).push(w);
  }
  const 칸 = [...해별.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([해, 것들]) => {
    const 링크 = 것들.sort((a, b) => b.week.localeCompare(a.week))
      .map((w) => `        <li><a href="/week/${w.week}">${읽는날(w.week)}</a>`
        + ` <span class="fine">${w.titles.length} ${w.titles.length === 1 ? 'title' : 'titles'}`
        + ` &middot; ${w.marketCount} ${w.marketCount === 1 ? 'country' : 'countries'}</span></li>`)
      .join('\n');
    return `    <h2>${해}</h2>
    <ul class="grid">
${링크}
    </ul>`;
  }).join('\n\n');

  const 제목 = 'Every Netflix Top 10 week, and the Korean titles in it';
  const 설명 = `${정리들.length} weeks of Netflix top 10 country lists, each one showing which `
    + `Korean titles charted that week and in how many countries. `
    + `${정리들[정리들.length - 1]?.week ?? ''} to ${정리들[0]?.week ?? ''}.`;

  const 몸 = `    <a class="back" href="/">&larr; K Culture Wire</a>
    <h1>Every week, and the Korean titles in it</h1>
    <p class="lead">Netflix publishes a weekly top 10 for each country. We hold
      <b>${정리들.length}</b> of those weeks and here is each one, showing which Korean titles
      charted and how far they travelled.</p>
    <p class="note">Weeks are labelled the way Netflix labels them. A chart place means one
      country's weekly top 10 listed the title once &mdash; not a count of viewers.</p>

    <p class="warn"><b>Each page is the Korean slice of that week.</b> We do not republish the
      whole chart. <a href="/netflix-top10-data">What is inside Netflix's two files</a> is written
      up separately, and the files themselves are Netflix's to publish, not ours.</p>
${안낸주 ? `
    <p class="note">${안낸주} further ${안낸주 === 1 ? 'week is' : 'weeks are'} in the file with
      fewer than ${지면낼최소줄} Korean chart places, which is too thin for a page. They are
      counted here rather than dropped &mdash; not published is not the same as not measured.</p>` : ''}

${칸}`;

  return 껍데기(제목, 설명, '/weeks', 몸, {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 제목,
    description: 설명,
    url: 'https://www.kculturewire.com/weeks',
    creator: { '@type': 'Organization', name: 'K Culture Wire' },
    isBasedOn: ['https://www.netflix.com/tudum/top10'],
  });
}

const 내가실행됐다 = process.argv[1]
  && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (내가실행됐다 && process.argv.includes('--selftest')) {
  let 통 = 0; let 실 = 0;
  const 참 = (n, v) => { if (v) 통 += 1; else { 실 += 1; console.error(`  ⛔ ${n}`); } };

  const 머리 = 'country_name\tcountry_iso2\tweek\tcategory\tweekly_rank\tshow_title'
    + '\tseason_title\tcumulative_weeks_in_top_10';
  const 자리 = 머리자리(머리);
  참('머리에서 칸 자리를 찾는다', 자리.show_title === 5 && 자리.week === 2);
  참('없는 칸은 -1 이다', 머리자리('a\tb').show_title === -1);
  /* ⛔ 작품 이름에 쉼표가 흔하다. 탭으로 가르는지 재 둔다 */
  참('탭으로 가른다', 줄가르기('Korea\tKR\t2024-11-03\tTV\t1\tHellbound, Part 2\tN/A\t1')[5]
    === 'Hellbound, Part 2');

  const 줄들 = [
    'Korea\tKR\t2024-11-03\tTV (Non-English)\t1\tAlive\tN/A\t1',
    'Japan\tJP\t2024-11-03\tTV (Non-English)\t3\tAlive\tN/A\t1',
    'Korea\tKR\t2024-11-03\tFilms\t2\tSomething English\tN/A\t1',
    'Korea\tKR\t2024-11-10\tTV (Non-English)\t5\tAlive\tN/A\t2',
    'Korea\tKR\tnot-a-date\tTV\t1\tAlive\tN/A\t1',
  ];
  const { 주, 걸러진줄 } = 주별모으기(줄들, 자리, (t) => t === 'Alive');
  참('주로 나눈다', 주.size === 2);
  참('한국 아닌 것은 걸러진다', 걸러진줄 === 1);
  /* ⛔ 날짜 꼴이 아닌 주는 버린다 — 없는 주소를 만들면 안 된다 */
  참('날짜가 아닌 주는 안 만든다', !주.has('not-a-date'));

  const 첫 = 주정리(주.get('2024-11-03'));
  참('작품 하나로 모은다', 첫.titles.length === 1);
  참('나라를 모아 센다', 첫.titles[0].marketCount === 2);
  참('가장 좋은 순위를 남긴다', 첫.titles[0].best === 1);
  참('줄 수를 센다', 첫.rows === 2);
  참('나라 수를 센다', 첫.marketCount === 2);

  /* 🔴 247장이 다 같은 꼴이고 이름이 하나도 없던 자리 */
  참('제목에 선두 작품 이름이 들어간다',
    주제목({ week: '2024-11-03', titles: [{ title: 'Alive' }] })
      === "Alive led Korea's Netflix top 10, week of 3 November 2024");
  참('이름이 길면 짧은 꼴로 물러난다',
    주제목({ week: '2024-11-03', titles: [{ title: 'Confidential Assignment 2: International' }] })
      .startsWith('Confidential Assignment 2: International'));
  참('⛔ 이름을 자르지 않는다',
    주제목({ week: '2024-11-03', titles: [{ title: 'Confidential Assignment 2: International' }] })
      .includes('Confidential Assignment 2: International'));
  참('작품이 없으면 옛 꼴로 돌아간다',
    주제목({ week: '2024-11-03', titles: [] })
      === 'Netflix Top 10, week of 3 November 2024 — the Korean titles');
  참('짧은 이름은 60자에 든다',
    주제목({ week: '2024-11-03', titles: [{ title: 'Alive' }] }).length <= 60);

  참('읽는 날로 바꾼다', 읽는날('2024-11-03') === '3 November 2024');
  참('날짜가 아니면 그대로 둔다', 읽는날('x') === 'x');
  참('넷플릭스 그 주 주소를 만든다',
    넷플릭스주소('2024-11-03') === 'https://www.netflix.com/tudum/top10?week=2024-11-03');

  /* ⛔ 지면 없는 작품에 링크를 걸면 손님에게 404 를 준다 */
  const 슬 = 슬러그표({ pages: [{ title: 'Alive', slug: 'alive', hasPage: true },
    { title: 'Gone', slug: 'gone', hasPage: false }] });
  참('지면 있는 것만 링크 표에 든다', 슬.get('Alive') === 'alive' && !슬.has('Gone'));

  const h = 주지면(첫, 슬, 268);
  /* 🔴 [2026-09-05 00:2x] 제목 꼴을 바꿨으니 이 시험도 «새 규칙»을 재게 고쳤다.
     ⛔ 시험을 지우지 않는다 — 지우면 제목이 망가져도 아무도 모른다.
     ⭐ 새 규칙은 「작품 이름이 앞에 오고, Netflix 와 그 주가 함께 든다」다. */
  참('제목에 선두 작품 이름이 앞에 온다', /<title>Alive /.test(h));
  참('제목에 Netflix 와 그 주가 든다',
    /<title>[^<]*Netflix[^<]*3 November 2024/.test(h));
  참('작품 지면으로 문을 낸다', h.includes('href="/title/alive"'));
  참('넷플릭스 그 주 지면으로 문을 낸다', h.includes('tudum/top10?week=2024-11-03'));
  /**
   * 🔴 [2026-09-09 · 5번] 손님이 «붙여넣는 글자»는 `2024-11-03` 이다.
   *   설명에 그 글자가 없으면, 그 주를 찾는 검색이 엉뚱한 지면으로 간다(어제 실측).
   *   ⛔ 제목은 실험 자물쇠가 걸려 있어 안 건드렸다 — 설명에만 넣었다.
   */
  참('🔴 설명 «맨 앞»에 ISO 주 이름이 든다 — 손님이 치는 글자다',
    /name="description" content="Netflix week 2024-11-03:/.test(h));
  참('⛔ 설명이 155자를 넘지 않는다 — 구글이 그쯤에서 자른다',
    ((h.match(/name="description" content="([^"]*)"/) ?? [])[1] ?? '').length <= 155);
  참('설명이 무엇이 실렸는지 말한다 — 누를 까닭이다',
    /name="description" content="[^"]*chart place/.test(h));
  /* 🔴 이 두 문장이 없으면 이 지면은 넷플릭스 지면의 사본처럼 읽힌다 */
  참('한국 몫임을 밝힌다', h.includes('Korean slice of that week'));
  참('시청 수가 없다고 적는다', h.includes('no viewing figures'));
  /* 🔴 걸린 우리말을 «세어서» 낸다 — 「없다/있다」만 내면 무엇이 걸렸는지 모른다 */
  참(`지면에 뜻 없는 우리말이 없다 (걸린 것: ${뜻없는우리말(h).join(',') || '없음'})`,
    뜻없는우리말(h).length === 0);
  참('정본 주소를 건다', h.includes('canonical" href="https://www.kculturewire.com/week/2024-11-03'));

  const 목 = 목록지면([첫, 주정리(주.get('2024-11-10'))], 4);
  /* 🔴 [2026-09-09 · 5번] 주간 변화 칸 — 269장이 서로 같은 글이던 것을 고친 자리 */
  {
    const 이번 = {
      week: '2024-11-03',
      rows: 58,
      marketCount: 26,
      titles: [{ title: 'Hellbound', marketCount: 20 }, { title: 'Exhuma', marketCount: 5 },
        { title: 'Knight Flower', marketCount: 3 }],
    };
    const 지난 = {
      week: '2024-10-27',
      rows: 62,
      marketCount: 36,
      titles: [{ title: 'Hellbound', marketCount: 25 }, { title: 'The Cursed', marketCount: 9 },
        { title: 'Knight Flower', marketCount: 3 }],
    };
    const v = 주간변화(이번, 지난);
    참('지난주와 대 본다', v !== null);
    참('새로 든 것을 집는다', v.새로든것.length === 1 && v.새로든것[0] === 'Exhuma');
    참('빠진 것을 집는다', v.빠진것.length === 1 && v.빠진것[0] === 'The Cursed');
    참('나라 수가 줄어든 것을 집는다',
      v.줄어든것.length === 1 && v.줄어든것[0].이름 === 'Hellbound' && v.줄어든것[0].차 === -5);
    참('그대로인 것을 센다', v.그대로 === 1);
    참('작품·나라·자리 차를 낸다',
      v.작품수차 === 0 && v.나라수차 === -10 && v.자리수차 === -4);
    참('⛔ 지난주가 없으면 null — 「바뀐 것 없음」과 가른다', 주간변화(이번, null) === null);
    참('⛔ 이번 주가 없어도 안 터진다', 주간변화(null, 지난) === null);

    참('늘줌말 — 늘면 more', 늘줌말(3) === '3 more');
    참('늘줌말 — 줄면 fewer', 늘줌말(-2) === '2 fewer');
    참('늘줌말 — 같으면 the same number', 늘줌말(0) === 'the same number');
    참('⛔ 늘줌말 — 수가 아니면 not measured', 늘줌말(null) === 'not measured');

    const 칸 = 변화칸(v, new Map([['Exhuma', 'exhuma']]), 읽는날);
    참('변화칸에 절 제목이 있다', 칸.includes('<h2>What changed from the week before</h2>'));
    참('지난주로 가는 링크가 있다', 칸.includes('href="/week/2024-10-27"'));
    참('지면이 있는 작품은 링크로 건다', 칸.includes('href="/title/exhuma"'));
    참('⛔ 지면이 없는 작품은 링크로 걸지 않는다', !칸.includes('href="/title/the-cursed"'));
    참('나라 수가 움직인 표를 낸다', 칸.includes('Countries, week before'));
    참('⛔ 판정어를 쓰지 않는다 — 뜨는·지는·인기 같은 말이 없다',
      !/\b(rising|falling|hit|flop|popular|best|worst)\b/i.test(칸));
    참('⛔ 조회수라고 말하지 않는다 — 넷플릭스 나라 파일에 조회수가 없다',
      칸.includes('carries no viewing figures'));
    참('⛔ 지난주가 없으면 칸을 아예 안 만든다', 변화칸(null, new Map(), 읽는날) === '');
    참('⛔ 변화칸에 한국어가 없다', !/[가-힣]/.test(칸));
  }
  참('목록이 해별로 묶인다', 목.includes('<h2>2024</h2>'));
  참('목록에 주 링크가 든다', 목.includes('href="/week/2024-11-03"'));
  /* ⛔ 안 낸 주를 조용히 지우지 않는다 */
  참('안 낸 주를 세어 적는다', 목.includes('4 further weeks are'));
  참('안 낸 주가 없으면 그 문장이 없다', !목록지면([첫], 0).includes('further'));
  참(`목록에 뜻 없는 우리말이 없다 (걸린 것: ${뜻없는우리말(목).join(',') || '없음'})`,
    뜻없는우리말(목).length === 0);
  /* ⛔ 이 시험이 «정말 도는지» 재 둔다 — 예외를 넣으면 다 통과하게 될 위험이 있다 */
  참('뜻 없는 우리말은 그대로 잡는다', 뜻없는우리말('<p>손님이 온다</p>').join(',') === '손님이,온다');
  참('신고번호의 세종은 빼고 본다', 뜻없는우리말('licence 2026-세종-0591 (Sejong)').length === 0);
  참('신고번호 «꼴이 아닌» 세종은 잡는다', 뜻없는우리말('세종에서 왔다').includes('세종에서'));

  /* ── 🔴 앞뒤 주로 가는 문 (2026-08-24 03:5x) ─────────────
     주 지면은 들어오는 문이 **중앙값 1** 이었다(작품 지면은 14).  에서 한 번
     걸리는 것이 전부였다. 앞뒤로 문을 낸다 — 한 주를 본 사람이 다음 주를 보고 싶은 것이
     자연스럽다. ⛔ 손님에게 값이 없는 링크는 안 넣는다 */
  const 셋 = [{ week: '2024-11-03' }, { week: '2024-11-10' }, { week: '2024-11-17' }];
  참('가운데 주는 앞뒤가 다 있다',
    앞뒤주(셋, '2024-11-10').앞 === '2024-11-03' && 앞뒤주(셋, '2024-11-10').뒤 === '2024-11-17');
  참('첫 주는 앞이 없다', 앞뒤주(셋, '2024-11-03').앞 === null);
  참('마지막 주는 뒤가 없다', 앞뒤주(셋, '2024-11-17').뒤 === null);
  /* ⛔ 목록에 없는 주를 물으면 없는 주소를 만들지 않는다 */
  참('모르는 주는 앞뒤가 다 없다',
    앞뒤주(셋, '1999-01-01').앞 === null && 앞뒤주(셋, '1999-01-01').뒤 === null);
  참('앞뒤가 없으면 칸을 안 낸다', 앞뒤칸(null, null) === '');
  참('앞만 있으면 앞만 낸다', 앞뒤칸('2024-11-03', null).includes('/week/2024-11-03')
    && !앞뒤칸('2024-11-03', null).includes('rarr'));
  참('읽는 날로 적는다', 앞뒤칸('2024-11-03', null).includes('3 November 2024'));

  console.log(`주별 지면 짓는 자 — 자가시험 ${통} 통과 · ${실} 실패`);
  process.exit(실 ? 1 : 0);
}

if (내가실행됐다) {
  const 표길 = 가장최근나라표();
  if (!표길) {
    console.log('⚠ 나라별 표가 없다 — archive/raw/netflix-top10 이 이 창에 안 내려와 있다.');
    console.log('   **못 쟀다.** 0 이 아니다. OneDrive·R2 에서 받아 온다.');
    process.exit(0);
  }
  const 작품자료 = fs.existsSync(작품자료길)
    ? JSON.parse(fs.readFileSync(작품자료길, 'utf8')) : null;
  if (!작품자료) console.log('⚠ 작품 지면 자료가 없다 — 작품 이름에 링크를 못 건다(지면은 낸다)');
  const 슬러그 = 슬러그표(작품자료);

  const 자 = koreanTitleFilter();
  const 글 = fs.readFileSync(표길, 'utf8');
  const 줄들 = 글.split('\n');
  const 자리 = 머리자리(줄들[0]);
  if (자리.show_title < 0 || 자리.week < 0) {
    console.log('🔴 표 머리가 달라졌다 — 칸 이름을 못 찾았다. 손으로 본다.');
    process.exit(1);
  }
  const { 주, 걸러진줄 } = 주별모으기(줄들.slice(1), 자리, 자.keepTitle);

  const 모든주 = [...주.values()].map(주정리).sort((a, b) => b.week.localeCompare(a.week));
  const 낼것 = 모든주.filter((w) => w.rows >= 지면낼최소줄);
  const 안낼것 = 모든주.filter((w) => w.rows < 지면낼최소줄);

  /* ⭐ 주 → 정리 표를 «한 번만» 만든다 — 지난주와 대 보려면 지난주 정리가 필요하다.
     ⛔ 269장마다 다시 찾으면 그만큼 헛일이다. */
  const 정리별 = new Map(낼것.map((w) => [w.week, w]));
  fs.mkdirSync(path.join(낼방, 'week'), { recursive: true });
  for (const w of 낼것) {
    const { 앞, 뒤 } = 앞뒤주(낼것, w.week);
    fs.writeFileSync(path.join(낼방, 'week', `${w.week}.html`),
      주지면(w, 슬러그, 낼것.length, 앞, 뒤, 앞 ? (정리별.get(앞) ?? null) : null));
  }
  fs.writeFileSync(path.join(낼방, 'weeks.html'), 목록지면(낼것, 안낼것.length));

  /**
   * 🔴 **사이트맵에 넣을 목록을 자료로 남긴다.**
   *   2026-08-08 에 지면을 내고 사이트맵 한 줄을 안 넣어 하루를 잃은 자리가 있다
   *   (`/data` — 사이트맵 소스에 그 까닭이 적혀 있다). 손으로 268줄을 적을 수는 없으니
   *   자료로 내고 사이트맵이 그것을 읽게 한다. ⛔ 손으로 옮겨 적지 않는다.
   */
  fs.writeFileSync(path.join(뿌리, 'src', 'data', 'kcw-week-pages.json'), `${JSON.stringify({
    generated: 지금().replace('T', ' ').replace('+09:00', ''),
    source: `Netflix Top 10 country lists, ${path.basename(표길)}`,
    unit: "A chart place means one country's weekly top 10 listed the title once. "
      + 'The country file carries no viewing figures.',
    whatIsHere: 'The Korean slice of each week. We do not republish the whole chart.',
    minRowsForPage: 지면낼최소줄,
    weekFrom: 낼것[낼것.length - 1]?.week ?? null,
    weekTo: 낼것[0]?.week ?? null,
    weekCount: 낼것.length,
    /* ⛔ 안 낸 주도 세어 남긴다 — 「안 냈다」와 「없다」는 다른 말이다 */
    weeksTooThin: 안낼것.length,
    weeks: 낼것.map((w) => ({
      week: w.week, titles: w.titles.length, markets: w.marketCount, rows: w.rows,
    })),
  }, null, 2)}\n`);

  const 통계 = 자.stats();
  console.log(`주별 지면 — ${path.basename(표길)} 에서 잼`);
  console.log(`   전체 줄 ${(줄들.length - 1).toLocaleString('en-US')} · 한국 아닌 줄로 걸러낸 것`
    + ` ${걸러진줄.toLocaleString('en-US')}`);
  console.log(`   주 ${모든주.length}개 · 지면 낸 주 ${낼것.length}개`
    + ` · 줄이 ${지면낼최소줄}개 미만이라 안 낸 주 ${안낼것.length}개`);
  console.log(`   가장 이른 주 ${낼것[낼것.length - 1]?.week} · 가장 늦은 주 ${낼것[0]?.week}`);
  console.log(`   작품 이름에 링크를 건 것 ${슬러그.size}개`);
  console.log(`   ⚠ 자가 못 가른 것 — 이름이 같은 두 작품 ${통계.ambiguous.length}개`
    + ` · 글로벌 표에 안 뜬 작품 ${통계.unlabelled}개 (남기고 세어 둔다)`);
  console.log(`\n✅ /weeks 와 /week/<날짜> ${낼것.length}장을 public/wikitip 에 냈다`);
}
