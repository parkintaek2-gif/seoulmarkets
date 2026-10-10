import type { APIRoute } from 'astro';
import fs from 'node:fs';
import { SITE_URL, CATEGORIES } from '../consts';
import { publishedArticles } from '../lib/articles';
import { getPagedTags } from '../lib/tags';
import countryProfiles from '../data/country-trade-profiles.json';
/* 🔴 [2026-09-22 · 5번] 회사·업종 지면 2,575장 — 사이트맵에 없으면 구글이 못 찾는다.
   지면을 찍는 «까닭»이 색인이므로, 여기 빠지면 2,575장을 지은 뜻이 없다. */
import fin from '../data/korea-financials-tape.json';
import { 주소표만들기 } from '../lib/company-slug.mjs';
import { 낼만한가 } from '../lib/company-page.mjs';
import { 업종주소 } from '../lib/sector-en.mjs';
/* 🔴 [2026-09-23 · 5번] 일본 상장사 지면 3,707장. 같은 까닭으로 여기에 넣는다 */
import jp from '../data/japan-financials-tape.json';
/* 🔴 [2026-09-23 · 5번] 대만 상장사 지면. 같은 까닭으로 여기에 넣는다 */
import tw from '../data/taiwan-financials-tape.json';
import { 낼만한가 as tw낼만한가, 업종주소 as tw업종주소 } from '../lib/taiwan-company-page.mjs';
import { 낼만한가 as jp낼만한가, 업종주소 as jp업종주소 } from '../lib/japan-company-page.mjs';
/* 🔴 [2026-09-24 · 5번] UAE 상장사 지면 104 + 목록 1.
   사장님: 「에스마켓츠 나라별 작업을 빨리 끝내게 우선 서둘러」
   재 보니 일본 3,706 · 한국 2,582 · 대만 1,090 이 서 있는데 UAE 는 «한 장도» 없었다.
   자료는 회사 111곳이 쌓여 있었다 — 모으고 안 낸 것이다. */
import uae from '../data/uae-company-facts.json';
import { 낼만한가 as uae낼만한가, 주소표만들기 as uae주소표만들기 } from '../lib/uae-company-page.mjs';

type Video = { title: string; description: string; thumbnail: string; content: string };
type Image = { loc: string; title: string };
type Url = { loc: string; lastmod?: Date; priority: string; changefreq: string; video?: Video; image?: Image };

/**
 * 🔴🔴 [2026-10-05 05:4x · 5번] **회사 지면 2,582장에 `<lastmod>` 가 하나도 없었다.**
 *   라이브를 그대로 재서 찾았다 —
 *     sitemap-companies.xml  url 2,582 · lastmod 0
 *     sitemap-equities.xml   url    99 · lastmod 99
 *     sitemap-macro.xml      url    47 · lastmod 47
 *   회사 지면은 SeoulMarkets 에서 가장 큰 덩어리인데 「언제 바뀌었나」를
 *   구글에게 한 번도 안 알리고 있었다. 다시 올 때를 정할 근거가 없다.
 *
 * ⛔ 그렇다고 「오늘」을 찍으면 안 된다 — 2026-09-23 에 케이라이프맵에서
 *   날마다 오늘을 찍었다가 구글이 우리 lastmod 를 통째로 무시하게 만들 뻔했다.
 *   `check-sitemap-lastmod-honest.mjs` 가 그때 생겼다.
 *
 * ⭐ 정직한 날짜가 자료 안에 있다 — `_meta.years[].pulled_on` 은 그 회계연도를
 *   DART 에서 **실제로 받아온 날**이다(예: 2025년치는 20260916). 회사마다 들고 있는
 *   «가장 최근 연도»의 그 날짜를 쓴다. 지어내지 않고 자료가 말하는 날을 쓴다.
 * ⛔ 모르면 안 붙인다. `undefined` 를 내면 위의 템플릿이 lastmod 줄을 아예 뺀다.
 */
export function 받아온날표(meta: any): Map<number, Date> {
  const 표 = new Map<number, Date>();
  for (const y of (meta?.years ?? [])) {
    const 해 = Number(y?.year);
    const s = String(y?.pulled_on ?? '');
    const m = s.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (!Number.isFinite(해) || !m) continue;   /* ⛔ 꼴이 아니면 버린다 */
    const d = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00Z`);
    if (Number.isFinite(d.getTime())) 표.set(해, d);
  }
  return 표;
}

/**
 * 🔴🔴 [2026-10-05 · 5번] **손으로 적은 목록이 빠뜨린 지면을 찾아 메운다.**
 *
 * `src/pages/` 바로 밑의 `*.astro` 를 훑어 사이트맵에 없는 것을 찾는다.
 * ⛔ 깊은 곳(`/data/`·`/company/` 등)은 안 본다 — 그쪽은 저마다 다른 규칙으로
 *   만들어지고, 여기서 싸잡아 넣으면 404 를 사이트맵에 싣게 된다.
 * ⛔ 동적 경로(`[...]`)·사이트맵 자신·404·계정 화면은 뺀다.
 * ⚠ 이 자가 찾아 넣는 것은 «안 넣은 것보다 낫다»는 뜻이지 손질된 줄을 대신하지
 *   않는다. 우선순위를 다듬고 싶으면 위 목록에 손으로 적는다.
 */
const 사이트맵에안낼것 = new Set([
  '404', 'account', 'recover', 'trial', 'contact', 'privacy', 'index',
]);

export function 빠진것찾기(이미있는것: Url[], { 읽기 = fs.readdirSync } = {}): Url[] {
  const 있는길 = new Set(이미있는것.map((u) => String(u.loc).replace(/\/+$/, '')));
  let 파일들: string[] = [];
  try {
    파일들 = 읽기(path.join(process.cwd(), 'src', 'pages')) as unknown as string[];
  } catch { return []; }            /* ⛔ 못 읽으면 빈손 — 지어내지 않는다 */
  const 것: Url[] = [];
  for (const f of 파일들) {
    const name = String(f);
    if (!name.endsWith('.astro')) continue;
    const slug = name.replace(/\.astro$/, '');
    if (slug.includes('[') || slug.startsWith('_')) continue;   /* 동적·부분 지면 */
    if (사이트맵에안낼것.has(slug)) continue;
    const loc = `/${slug}`;
    if (있는길.has(loc)) continue;
    것.push({ loc, changefreq: 'monthly', priority: '0.7' });
  }
  return 것;
}

/**
 * 🔴🔴 [2026-10-06 11:5x · 5번] **japan·taiwan·uae 4,931장에 `<lastmod>` 가 하나도 없었다.**
 *
 * 10-05 에 companies 2,582장을 고치면서 **같은 흠이 있는 셋을 안 따라갔다.**
 *   japan   3,736장 · lastmod 0
 *   taiwan  1,090장 · lastmod 0
 *   uae       105장 · lastmod 0
 * 7,670장 가운데 4,931장(64%)이 「언제 바뀌었나」를 구글에게 말하지 않고 있었다.
 *
 * ⚠ 같은 날 아침 색인을 물었더니 못 읽힌 넷이 «전부» japan·taiwan 이었다.
 *   (/japan/company/ai-robotics · ewell · w-scope · /taiwan/company/highwealth)
 *   ⛔ 「그래서 안 읽혔다」고 말할 수는 없다 — 그 둘이 같이 보였을 뿐이다.
 *     다만 lastmod 는 넣는 것이 맞고, 넣어야 다시 올 때를 정할 근거가 생긴다.
 *
 * ⭐ 정직한 날이 자료 안에 있다 — 타래의 `_meta.지은때`(한국어 꼴)와 `_meta.builtAt`(ISO).
 *   타래를 통째로 다시 지을 때 그 지면들의 «자료가 실제로» 바뀐다. 그 날이 맞다.
 * ⚠ 그래서 한 묶음이 한 날을 함께 말하게 된다. companies 처럼 회사마다 다르지 않다.
 *   그것은 거짓이 아니다 — 정말 한꺼번에 바뀌기 때문이다.
 * ⛔ 「오늘」을 찍지 않는다. 2026-09-23 에 케이라이프맵에서 그러다 구글이 우리
 *   lastmod 를 통째로 무시하게 만들 뻔했다.
 * ⛔ 못 읽으면 안 붙인다 — undefined 를 내면 템플릿이 lastmod 줄을 아예 뺀다.
 */
export function 지은때읽기(값: any, 이제: Date = new Date()): Date | null {
  const s = String(값 ?? '').trim();
  if (!s) return null;
  /* ⛔ **미래 날은 안 쓴다.** 구글은 미래 lastmod 를 믿지 않는다 —
     그러면 「언제 바뀌었나」 신호가 통째로 죽는다. 아래 두 꼴 다 이것을 지난다 */
  const 쓸만한가 = (d: Date) => (Number.isFinite(d.getTime()) && d.getTime() <= 이제.getTime() ? d : null);
  /* ① ISO 꼴 — uae 의 builtAt 이 이렇다. 이미 UTC 라 그 날의 UTC 자정은 그 시각보다 앞이다 */
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:[T ]|$)/.exec(s);
  if (iso) return 쓸만한가(new Date(`${iso[1]}-${iso[2]}-${iso[3]}T00:00:00Z`));
  /* ② 한국어 꼴 — 「2026. 9. 26. 오후 6:06:37」. ⛔ Date.parse 에 맡기지 않는다
   *
   * 🔴🔴 [2026-10-11 02:4x · 5번] **이 줄이 사이트맵에 «미래 시각»을 찍고 있었다.**
   *   한국 날짜를 `T00:00:00Z`(UTC 자정)로 만들고 있었다. 그런데 한국시간 10-11 02:00 은
   *   UTC 로 10-10 17:00 이다 — **UTC 자정 10-11 은 여섯 시간 뒤, 아직 오지 않은 시각**이다.
   *   실측: 지금 UTC 2026-10-10 17:46 · 사이트맵 lastmod 2026-10-11T00:00:00.000Z
   *         일본 3,736장 · 대만 1,090장이 미래를 가리키고 있었다.
   *   ⚠ **새벽(00~09시 KST)에 타래를 지을 때만** 생긴다. 낮에 지으면 안 생겨서 안 보였다.
   *     오늘 새벽 일본·대만 지면을 고쳐 내면서 처음 드러났다.
   *   ⇒ 한국 날짜는 **한국시간 자정**(`+09:00`)으로 읽는다. 그 시각은 언제나 지나간 때다.
   * ⭐ 사장님 「시각은 한국시간(KST)·toISOString() 금지」와 같은 뿌리다 — 시계가 섞인 것이다. */
  const ko = /^(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\./.exec(s);
  if (ko) {
    const 해 = Number(ko[1]); const 달 = Number(ko[2]); const 날 = Number(ko[3]);
    if (달 < 1 || 달 > 12 || 날 < 1 || 날 > 31) return null;
    const p = (n: number) => String(n).padStart(2, '0');
    return 쓸만한가(new Date(`${해}-${p(달)}-${p(날)}T00:00:00+09:00`));
  }
  return null;                     /* ⛔ 모르는 꼴은 지어내지 않는다 */
}

/** 그 회사가 들고 있는 «가장 최근 연도»의 받아온 날. ⛔ 모르면 null */
export function 받아온날(줄들: any[] | undefined, 표: Map<number, Date>): Date | null {
  if (!줄들?.length || !표.size) return null;
  const 해들 = 줄들.map((r) => Number(r?.year)).filter((y) => Number.isFinite(y) && 표.has(y));
  if (!해들.length) return null;
  return 표.get(Math.max(...해들)) ?? null;
}

// XML 이스케이프 — 제목·설명에 &, <, > 가 들어오면 사이트맵이 깨진다.
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function getStaticPaths() {
  return [
    { params: { section: 'pages' } },
    { params: { section: 'companies' } },
    { params: { section: 'japan' } },
    { params: { section: 'taiwan' } },
    { params: { section: 'uae' } },
    ...CATEGORIES.map((c) => ({ params: { section: c.slug } })),
  ];
}

const xml = (urls: Url[]) => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls
  .map(
    (u) => `  <url>
    <loc>${SITE_URL}${u.loc}</loc>${u.lastmod ? `
    <lastmod>${u.lastmod.toISOString()}</lastmod>` : ''}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>${u.image ? `
    <image:image>
      <image:loc>${SITE_URL}${u.image.loc}</image:loc>
      <image:title>${esc(u.image.title)}</image:title>
    </image:image>` : ''}${u.video ? `
    <video:video>
      <video:thumbnail_loc>${SITE_URL}${u.video.thumbnail}</video:thumbnail_loc>
      <video:title>${esc(u.video.title)}</video:title>
      <video:description>${esc(u.video.description)}</video:description>
      <video:content_loc>${SITE_URL}${u.video.content}</video:content_loc>
    </video:video>` : ''}
  </url>`,
  )
  .join('\n')}
</urlset>
`;

export const GET: APIRoute = async ({ params }) => {
  const section = params.section!;
  let urls: Url[];

  if (section === 'companies') {
    /* 회사 2,515 + 업종 60 + 목록 1. ⛔ 지면을 «안 만든» 회사는 여기에도 안 넣는다 —
       사이트맵이 404 를 가리키면 그 사이트맵 전체의 신뢰가 깎인다. */
    const 행들 = (fin as any).rows as any[];
    const 묶음 = new Map<string, any[]>();
    for (const r of 행들) {
      if (!묶음.has(r.code)) 묶음.set(r.code, []);
      묶음.get(r.code)!.push(r);
    }
    const 회사머리 = [...묶음.entries()].map(([code, rs]) => ({ code, ...rs[0] }));
    const 주소표 = 주소표만들기(회사머리);
    const 업종들 = new Set<string>();
    /* 🔴 [2026-10-05] 받아온 날을 lastmod 로 붙인다 — 「오늘」이 아니라 자료가 말하는 날 */
    const 날표 = 받아온날표((fin as any)._meta);
    const 모든날 = [...날표.values()];
    const 가장최근 = 모든날.length ? new Date(Math.max(...모든날.map((d) => d.getTime()))) : undefined;
    const 것: Url[] = [{ loc: '/companies', lastmod: 가장최근, changefreq: 'weekly', priority: '0.9' }];
    for (const h of 회사머리) {
      const 그회사 = 묶음.get(h.code);
      if (!낼만한가(그회사)) continue;
      것.push({
        loc: '/company/' + 주소표.get(h.code),
        lastmod: 받아온날(그회사, 날표) ?? undefined,   /* ⛔ 모르면 안 붙는다 */
        changefreq: 'monthly',
        priority: '0.6',
      });
      const s2 = 업종주소(h.sector);
      if (s2) 업종들.add(s2);
    }
    for (const s2 of [...업종들].sort()) {
      /* 업종 지면은 그 업종 회사들을 모은 것이라 가장 최근 받아온 날을 쓴다 */
      것.push({ loc: '/sector/' + s2, lastmod: 가장최근, changefreq: 'weekly', priority: '0.7' });
    }
    urls = 것;
  } else if (section === 'japan') {
    /* 🔴 [2026-09-23 · 5번] 일본 상장사 지면 3,672 + 업종 34 + 목록 1.
       ⛔ 지면을 «안 만든» 회사는 여기에도 안 넣는다 — 사이트맵이 404 를 가리키면
         그 사이트맵 전체의 신뢰가 깎인다. 그래서 지면과 «같은 자»(낼만한가)로 거른다. */
    const 행들 = ((jp as any).rows as any[]).filter((r) => jp낼만한가(r));
    const 주소표 = 주소표만들기(행들);
    const 업종들 = new Set<string>();
    /* 🔴 [2026-10-06] 타래를 지은 날을 lastmod 로 붙인다. ⛔ 모르면 안 붙는다 */
    const jp지은때 = 지은때읽기((jp as any)._meta?.지은때) ?? undefined;
    const 것: Url[] = [{ loc: '/japan/companies', lastmod: jp지은때, changefreq: 'weekly', priority: '0.9' }];
    for (const r of 행들) {
      것.push({ loc: '/japan/company/' + 주소표.get(String(r.code)), lastmod: jp지은때, changefreq: 'monthly', priority: '0.6' });
      const s2 = jp업종주소(r.sector);
      if (s2) 업종들.add(s2);
    }
    for (const s2 of [...업종들].sort()) {
      것.push({ loc: '/japan/sector/' + s2, lastmod: jp지은때, changefreq: 'weekly', priority: '0.7' });
    }
    urls = 것;
  } else if (section === 'uae') {
    /* 🔴 [2026-09-24 · 5번] UAE 상장사 지면 104 + 목록 1.
       ⛔ 지면을 «안 만든» 회사는 여기에도 안 넣는다 — 사이트맵이 404 를 가리키면
         그 사이트맵 전체의 신뢰가 깎인다. 지면과 «같은 자»(낼만한가)로 거른다.
       ⚠ 업종 지면은 아직 없다 — 자료의 sector 가 대부분 null 이라 만들 것이 없다.
         ⛔ 없는 것을 사이트맵에 적지 않는다. 채워지면 그때 넣는다. */
    const 회사들 = ((uae as any).companies as any[]).filter((c) => uae낼만한가(c));
    const 주소표 = uae주소표만들기(회사들);
    const uae지은때 = 지은때읽기((uae as any)._meta?.builtAt) ?? undefined;
    const 것: Url[] = [{ loc: '/uae/companies', lastmod: uae지은때, changefreq: 'weekly', priority: '0.9' }];
    for (const c of 회사들) {
      const s = 주소표.get(c.symbol);
      if (s) 것.push({ loc: '/uae/company/' + s, lastmod: uae지은때, changefreq: 'monthly', priority: '0.6' });
    }
    urls = 것;
  } else if (section === 'taiwan') {
    /* 🔴 [2026-09-23 · 5번] 대만 상장사 지면 + 업종 지면 + 목록 1.
       ⚠ 여기 「업종 지면은 아직 없다 — TWSE 가 코드만 주고 이름을 안 준다」고 적혀 있었다.
         틀렸다. 같은 API 의 t187ap14_L 이 「水泥工業」처럼 이름을 준다 — 우리가 안 찾은 것이었다.
       ⛔ 그래도 사전에 없는 이름은 여전히 null 이고, 그런 곳으로는 지면도 주소도 만들지 않는다. */
    const 행들 = ((tw as any).rows as any[]).filter((r) => tw낼만한가(r));
    const 주소표 = 주소표만들기(행들);
    const tw지은때 = 지은때읽기((tw as any)._meta?.지은때) ?? undefined;
    const 것: Url[] = [{ loc: '/taiwan/companies', lastmod: tw지은때, changefreq: 'weekly', priority: '0.9' }];
    const 업종본것 = new Set<string>();
    for (const r of 행들) {
      const s = tw업종주소(String((r as any).industry_en || ''));
      if (s && !업종본것.has(s)) { 업종본것.add(s); 것.push({ loc: '/taiwan/sector/' + s, lastmod: tw지은때, changefreq: 'weekly', priority: '0.7' }); }
    }
    for (const r of 행들) {
      것.push({ loc: '/taiwan/company/' + 주소표.get(String(r.code)), lastmod: tw지은때, changefreq: 'weekly', priority: '0.6' });
    }
    urls = 것;
  } else if (section === 'pages') {
    const all = await publishedArticles();
    const newest = all[0]?.data.pubDate;
    urls = [
      { loc: '', lastmod: newest, changefreq: 'daily', priority: '1.0' },
      // 커뮤니티 허브 — 손님이 「갈 곳」이자 갈래 지면으로 가는 문. 새 지면이라 목록에 빠져 있었다(2026-08-21).
      /* 🔴 [2026-09-11 · 5번] 기사·태그 «허브». 낱장 132·108 장이 사는데 모으는 장이 404 였다.
       *   손님이 닿을 길이 사이트맵뿐이었고, 사이트맵을 손으로 여는 손님은 없다. */
      { loc: '/article', lastmod: newest, changefreq: 'daily', priority: '0.9' },
      { loc: '/tag', lastmod: newest, changefreq: 'weekly', priority: '0.8' },
      { loc: '/community', lastmod: newest, changefreq: 'weekly', priority: '0.7' },
      // 데이터 API 판매 화면. 개발자 검색 유입이 곧 영업이라 우선순위를 높게 둔다.
      { loc: '/api', changefreq: 'weekly', priority: '0.9' },
      // 파는 지면 — 사는 쪽이 검색으로 찾는 자리다.
      { loc: '/pricing', changefreq: 'weekly', priority: '0.6' },
      { loc: '/about', changefreq: 'monthly', priority: '0.5' },
      { loc: '/contact', changefreq: 'monthly', priority: '0.4' },
      { loc: '/privacy', changefreq: 'monthly', priority: '0.3' },
      // 데이터 랭킹 지면 — 검색 유입 가치가 있는데 사이트맵에 빠져 있었다(손님 걸음 2026-08-07 실측).
      { loc: '/rankings', lastmod: newest, changefreq: 'weekly', priority: '0.8' },
      // 영상 갤러리 — 세로 숏영상 51편을 한자리에. 구글 비디오 축 + 체류(2026-08-24 방문 올인).
      { loc: '/video', lastmod: newest, changefreq: 'weekly', priority: '0.7' },
      // 데이터 상품 지면들 — 기업이 살 「주소」다. 검색 유입이 곧 영업. 5장이 사이트맵에 0개였다(56316, 2026-08-09).
      { loc: '/data', changefreq: 'weekly', priority: '0.9' },
      // 🔴 [2026-09-18 · 6번] Korea Markets Research Index(학술논문 1,406편 색인) — 라이브
      // 200 이고 noindex 도 없는데 이 목록에 없었다. 넷째로 찾은 같은 병.
      { loc: '/research', changefreq: 'weekly', priority: '0.7' },
      /* 🔴 [2026-10-05 · 5번] kospi · korean stocks · korea stock market 이 각각
         자동완성 10줄을 꽉 찬다(en/us 실측). 2,709곳의 다섯 해 재무가 이미 있었는데
         제목에 KOSPI 를 둔 지면이 없었다. ⭐ 재 보니 코스닥 적자 기업 비중이
         다섯 해에 33.5% → 44.3% 로 올랐다 — 주가가 아니라 «공시»에만 보이는 것이다. */
      { loc: '/kospi-vs-kosdaq', changefreq: 'monthly', priority: '0.9' },
      /* 🔴 [2026-10-05 · 5번] korean stocks · japan stock market · taiwan stock exchange 가
         모두 자동완성 10줄을 꽉 찬다. ⭐ 한국과 일본은 상장 회사 수가 4% 안쪽으로 비슷한데
         상위 10사의 매출 몫이 34.9% 대 17.0% — 두 배가 넘는다. 대만은 52.4%. */
      { loc: '/revenue-concentration', changefreq: 'monthly', priority: '0.9' },
      /* 🔴 [2026-10-05 · 5번] korea inflation · korea gdp · bank of korea rate 가 10줄을
         꽉 찬다. 자료가 없어 지면이 없었다 — collect-korea-macro-ecos.mjs 로 세웠다.
         ⭐ 실질금리(기준금리 − 물가)가 2026-04~08 다섯 달 마이너스였고 09 에 +0.12% 로 돌아섰다. */
      { loc: '/korea-inflation-rate', changefreq: 'weekly', priority: '0.9' },
      /* 🔴 [2026-10-05 10:1x · 5번] korea gdp·korea economy 가 자동완성 10줄을 꽉 채우는데
         답할 지면이 없었다(check-demand-covered). 자료는 오늘 아침에 받아 뒀다. */
      { loc: '/korea-gdp-growth', changefreq: 'weekly', priority: '0.9' },
      /* 🔴 [2026-09-12 · 4번] F6 무료 영문 지면 넷(Financials·Valuation·Index·Consensus) —
       *   target-changes(Consensus)만 여기 있었고 나머지 셋은 라이브 200인데 이 목록에
       *   없었다. 같은 사고가 이 파일에서 벌써 세 번째다(위 5번 주석 두 곳 참고).
       *   ⛔ 지면을 만들면 «같은 커밋에서» 이 목록에 넣는다. */
      /* 무료 스크리너 — 손님이 «자기 물음»을 넣는 지면이라 색인 우선순위를 높게 둔다 */
      { loc: '/data/screener', changefreq: 'weekly', priority: '0.9' },
      /* 🔴 [2026-09-23] 새 지면을 «같은 커밋»에서 넣는다 — 안 넣으면 구글이 못 찾는다 */
      { loc: '/data/profit-streaks', changefreq: 'weekly', priority: '0.8' },
      { loc: '/data/financials', changefreq: 'weekly', priority: '0.9' },
      { loc: '/data/valuation', changefreq: 'weekly', priority: '0.9' },
      { loc: '/data/indices', changefreq: 'weekly', priority: '0.9' },
      { loc: '/data/sector-workforce-panel', changefreq: 'weekly', priority: '0.8' },
      { loc: '/data/pension-wage-panel', changefreq: 'weekly', priority: '0.8' },
      { loc: '/data/target-price-accuracy', changefreq: 'weekly', priority: '0.8' },
      /* 🔴 [2026-09-09 · 5번] P5 무료 지면 — Korea Consensus Tape 의 깔때기.
       *   ⚠ 「맞췄나」(target-price-accuracy)와 다른 지면이다 — 이쪽은 「누가 언제 «바꿨나»」다.
       *   ⛔ 지면을 내면 사이트맵에 «같은 커밋에서» 넣는다. 오늘 KCW 쪽에서 이것을 잊어
       *     세 지면이 라이브 200 이면서 검색엔 안 알려진 채로 몇 시간 있었다. */
      { loc: '/data/target-changes', changefreq: 'daily', priority: '0.8' },
      /* P5 둘째 무료 지면 — Korea Ownership Ledger 의 깔때기 (2026-09-09 · 5번) */
      { loc: '/data/ownership', changefreq: 'weekly', priority: '0.8' },
      /* P5 셋째 무료 지면 — Korea Mezzanine Book 의 깔때기 (2026-09-09 · 5번) */
      { loc: '/data/mezzanine', changefreq: 'weekly', priority: '0.8' },
      /* P5 넷째 무료 지면 — Korea People Panel 의 깔때기 (2026-09-09 · 5번) */
      { loc: '/data/people', changefreq: 'weekly', priority: '0.8' },
      { loc: '/data/board-composition', changefreq: 'weekly', priority: '0.8' },
      { loc: '/data/analyst-attention', changefreq: 'weekly', priority: '0.8' },
      { loc: '/data/broker-candour', changefreq: 'weekly', priority: '0.8' },
      { loc: '/data/sector-leaders', changefreq: 'weekly', priority: '0.8' },
      { loc: '/data/consensus', changefreq: 'weekly', priority: '0.8' },
      // 관세청 무역 데이터 상품 — 국가×월 수출입. 무료 CSV + 라이브 API 로 이어진다(2026-08-21).
      { loc: '/data/korea-trade-dataset', lastmod: newest, changefreq: 'weekly', priority: '0.8' },
      // Korea Concentration Index — 주가×관세청 교차. 무료 지면 + 일일 CSV → 유료 피드(2026-08-22).
      { loc: '/data/concentration', lastmod: newest, changefreq: 'daily', priority: '0.9' },
      { loc: '/data/korea-concentration.csv', changefreq: 'daily', priority: '0.6' },
      // 채권 거래집중 무료 CSV — 인용 유도용(2026-08-26, 5번 「자료 먼저」). 발견돼야 인용된다.
      { loc: '/data/korea-bond-concentration.csv', changefreq: 'weekly', priority: '0.6' },
      // 🔴 [2026-09-11 · 5번] 이 둘을 «만들고 여기 넣는 것을 잊었다». bond-boards 는
      // 오늘 새벽에 냈는데 몇 시간 동안 라이브 200 이면서 검색엔 안 알려진 상태였다.
      // ⛔ 지면을 만들면 «같은 커밋에서» 이 목록에 넣는다.
      { loc: '/data/bond-boards', changefreq: 'daily', priority: '0.9' },
      // 펀드 등록원부를 «설정연도 × 유형»으로 읽은 지면. 남들이 안 세는 축이다.
      { loc: '/data/fund-shelf', changefreq: 'weekly', priority: '0.9' },
      /* 🔴 [2026-09-12 · 4번] 전수 대조로 더 찾은 누락 넷 — 전부 라이브 200,
       *   셋(kospi-weights·largest-companies·trading-partners)은 «서치콘솔이 가리켜»
       *   5번이 2026-09-11에 만든 지면인데 사이트맵에는 못 들어갔다. 수요를 확인하고
       *   만든 지면이 검색엔 안 보이는 채로 있었다. */
      { loc: '/data/kospi-weights', changefreq: 'weekly', priority: '0.8' },
      { loc: '/data/largest-companies', changefreq: 'weekly', priority: '0.8' },
      { loc: '/data/trading-partners', changefreq: 'weekly', priority: '0.7' },
      /* 🔴 [2026-09-30 · 5번] KRX 공개 API 칸 이름을 영문으로 푼 지면.
       *   애드센스가 seoulmarkets 를 막은 뒤 검색어를 «자리별»로 갈라 찾은 자리다 —
       *   "ksq_bydd_trd" krx open api 8위 · "stk_bydd_trd" krx 9위인데
       *   정작 우리 지면에는 그 낱말이 한 번도 없었다. 그 말로 오는 사람은
       *   구경꾼이 아니라 그 API 를 붙이려는 개발자, 곧 B2B 손님이라 우선순위를 높게 둔다. */
      { loc: '/data/krx-open-api-fields', changefreq: 'weekly', priority: '0.9' },
      /* 🔴🔴 [2026-10-10 · 5번] **여섯째 사고 — 이번엔 내가 냈다.**
       *   위 KRX 지면을 손보다 「27거래일 내내 한 주도 안 거래된 종목 90개」를 쟀고,
       *   그것으로 지면을 내고 배포까지 했는데 **이 목록에 안 넣었다.** 라이브 200 인데
       *   사이트맵에 0 이었다 — 분모를 키우려고 낸 글이 검색엔 없는 채로 나간 것이다.
       *   ⛔ 이 파일에 「같은 커밋에서 넣는다」가 **다섯 번** 적혀 있고 내가 여섯 번째다.
       *     말로 적힌 규칙은 여섯 번 어겨졌다. 적는 것으로는 안 막힌다.
       *   ⭐ 그래서 오늘 글이 아니라 **자**로 바꿨다 —
       *     `tests/data지면이-사이트맵에-다-있나.test.mjs` 가 `src/pages/data/*.astro` 와
       *     이 목록을 전수 대조한다. 일곱째는 사람이 아니라 자가 먼저 잡는다. */
      { loc: '/data/never-traded', changefreq: 'weekly', priority: '0.9' },
      // 🔴 [2026-09-18 · 6번] 이 파일의 넷째 사고 — 신용등급·외국인보유·재무축 지면 다섯이
      // 같은 실수로 빠져 있었다(9/15~9/17에 만들고 이 목록에 안 넣음). 사이트맵이 11줄로
      // 보인 진짜 까닭은 「자료가 없어서」가 아니라 이 목록이 낡아서였다.
      { loc: '/data/company-credit', changefreq: 'weekly', priority: '0.9' },
      { loc: '/data/foreign-holdings', lastmod: newest, changefreq: 'weekly', priority: '0.8' },
      // 🔴 [2026-09-20 · 1번] 도쿄 확장 첫 지면 — 같은 커밋에서 바로 넣는다(위 사고를 안 되풀이한다).
      { loc: '/data/japan-listed-companies', changefreq: 'weekly', priority: '0.8' },
      /* [2026-09-22] 한국 중대공시 — 날마다 줄이 늘어난다(자리지킴이가 매시 쌓는다) */
      { loc: '/data/korea-disclosures', changefreq: 'daily', priority: '0.8' },
      { loc: '/data/disclosures', changefreq: 'daily', priority: '0.8' },
      { loc: '/data/gulf-economies', changefreq: 'monthly', priority: '0.8' },
      /* 🔴 [2026-10-04 · 2번] 다섯째 사고 — 같은 실수가 또 반복됐다. 10/3~10/4에 낸
       * 여섯 지면이 이 목록에 안 들어가 있었다(/data/index.astro 카탈로그에는 걸려 있었지만
       * 이 사이트맵 목록은 따로 손으로 채운다). check-google-indexed.mjs로 확인하기 전에는
       * 아무도 몰랐을 것이다. 다음에 지면을 낼 때는 이 목록도 같은 커밋에서 고친다. */
      { loc: '/data/fixed-variable-rate-share', changefreq: 'weekly', priority: '0.7' },
      { loc: '/data/ppi-import-price-gap', changefreq: 'weekly', priority: '0.7' },
      { loc: '/data/industry-production-divergence', changefreq: 'weekly', priority: '0.7' },
      { loc: '/data/bank-loan-delinquency', changefreq: 'weekly', priority: '0.7' },
      { loc: '/data/trade-by-product', changefreq: 'weekly', priority: '0.7' },
      { loc: '/data/mortgage-balance-gender-gap', changefreq: 'weekly', priority: '0.7' },
      { loc: '/data/credit-balance', changefreq: 'weekly', priority: '0.7' },
      { loc: '/data/telecom-cpi-base-effect', changefreq: 'monthly', priority: '0.7' },
      { loc: '/data/real-wage-plateau', changefreq: 'monthly', priority: '0.7' },
      /* 🔴 [2026-10-04 · 2번] 위 여섯 장을 고치다가 /data/*.astro 전수 대조로 하나 더 찾았다 —
       * segment-reporting은 /data/index.astro 카탈로그에는 있었지만 이 목록에는 날짜 기록 없이
       * 처음부터 빠져 있었던 것으로 보인다(언제 생긴 구멍인지 특정 못함). */
      { loc: '/data/segment-reporting', changefreq: 'weekly', priority: '0.7' },
      { loc: '/rankings/market-cap', changefreq: 'weekly', priority: '0.8' },
      { loc: '/rankings/pbr', changefreq: 'weekly', priority: '0.8' },
      { loc: '/rankings/interest-cover', changefreq: 'weekly', priority: '0.8' },
      { loc: '/data/korea-valuation.csv', changefreq: 'weekly', priority: '0.6' },
      { loc: '/data/korea-trade.csv', changefreq: 'weekly', priority: '0.6' },
      { loc: '/data/korea-trade-balance.csv', changefreq: 'weekly', priority: '0.6' },
      { loc: '/data/korean-listed-workforce.csv', changefreq: 'weekly', priority: '0.6' },
      // 파는 조건 지면 — 사는 쪽 법무가 본다.
      { loc: '/terms', changefreq: 'monthly', priority: '0.3' },
      { loc: '/refund', changefreq: 'monthly', priority: '0.3' },
      // 구독자 모으는 유일한 자리 — 검색이 못 찾으면 유입이 없다.
      { loc: '/newsletter', changefreq: 'monthly', priority: '0.5' },
      ...CATEGORIES.map((c) => ({
        loc: `/${c.slug}`,
        lastmod: all.find((a) => a.data.category === c.slug)?.data.pubDate,
        changefreq: 'daily',
        priority: '0.8',
      })),
      // 태그 허브(2편↑) — 지면 문턱과 «같은 2편»(어긋나면 404 가 사이트맵에 실린다). 2026-08-25.
      ...(await getPagedTags()).map((t) => ({
        loc: `/tag/${t.slug}`,
        lastmod: t.articles[0]?.data.pubDate,
        changefreq: 'weekly',
        priority: '0.6',
      })),
      // 나라별 무역 프로필 — 「korea trade with X」 롱테일 대량(2026-08-27 사장님 지시: 관세청 캐시카우·방문 지렛대).
      { loc: '/trade', lastmod: newest, changefreq: 'weekly', priority: '0.8' },
      ...countryProfiles.profiles.map((p: { slug: string }) => ({
        loc: `/trade/${p.slug}`,
        lastmod: countryProfiles.asOf ? new Date(countryProfiles.asOf) : newest,
        changefreq: 'weekly',
        priority: '0.7',
      })),
    ];
    /* 🔴🔴 [2026-10-05 06:2x · 5번] **손으로 적은 이 목록이 또 새 지면을 빠뜨렸다.**
       이 파일 주석에만 같은 사고가 «다섯 번» 적혀 있다(2026-09-12·09-18·09-20·09-23·10-04).
       그때마다 「다음엔 같은 커밋에서 넣는다」고 적고 끝냈는데, 오늘 또 셋이 빠졌다 —
       `/revenue-concentration` · `/korea-inflation-rate` · `/kpop-group-size`.
       ⇒ **사람이 기억해서 지키는 구조를 만들지 않는다.** 저절로 찾아 메운다.
       오늘 아침에 백년지도 갈래 표에서도 똑같이 34장이 빠져 있어 같은 고침을 했다.
       ⛔ 손으로 적은 줄을 지우지 않는다 — 거기에는 우선순위·주기가 손질돼 있다.
         빠진 것만 «끝에» 더한다. */
    urls = [...urls, ...빠진것찾기(urls)];
  } else {
    // 기사에 세로 숏영상(+썸네일용 첫 카드뉴스)이 있으면 <video:video> 를 붙여 구글 비디오 검색에 알린다.
    // 썸네일 없으면 구글이 버리므로 mp4·첫카드 둘 다 있을 때만(2026-08-24 5번 총괄 발견).
    urls = (await publishedArticles(section)).map((a) => {
      const hasVid = fs.existsSync(`public/video/${a.id}.mp4`) && fs.existsSync(`public/cardnews/${a.id}-1.png`);
      // 기사별 공유카드(og)를 이미지 사이트맵에 — 구글 이미지 검색 노출 자리(2026-08-25 사장님 말씀: 카드도 검색자리).
      const hasOg = fs.existsSync(`public/og/${a.id}.png`);
      return {
        loc: `/article/${a.id}`,
        lastmod: a.data.updatedDate ?? a.data.pubDate,
        changefreq: 'weekly',
        priority: '0.7',
        ...(hasOg ? { image: { loc: `/og/${a.id}.png`, title: a.data.title.slice(0, 200) } } : {}),
        ...(hasVid
          ? {
              video: {
                title: a.data.title.slice(0, 100),
                description: a.data.dek.slice(0, 2048),
                thumbnail: `/cardnews/${a.id}-1.png`,
                content: `/video/${a.id}.mp4`,
              },
            }
          : {}),
      };
    });
  }

  return new Response(xml(urls), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
