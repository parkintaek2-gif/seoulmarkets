/**
 * 업종 **한 장**(`/data/industry/[slug]`)의 목록을 만든다.
 *
 * ## 🔴 왜 이 지면들을 내나 — 측정해서 찾은 자리다 (2026-11-16 · 5번)
 *
 *   30일 AI 유입을 측정하니 SeoulMarkets 89건 가운데 **38%가 `/data/` 세 장**에 몰렸다 —
 *   `kospi-weights`(20) · `target-price-accuracy`(7) · `valuation`(7).
 *   그런데 `/data/` 지면은 이미 57장이다. 나머지 54장은 거의 0이다.
 *
 *   ⇒ **더 찍는 것이 답이 아니다.** 이기는 셋과 지는 54장의 차이는 형식이 아니라
 *     «질문»이었다 — 이기는 셋은 영어권이 실제로 묻는 말에 답한다.
 *     「Korean pharmaceutical companies」·「Korean banks list」 같은 **업종 전수** 질문에
 *     답할 자료(2,709사)는 쥐고 있는데 그 질문을 받는 지면이 한 장도 없었다.
 *
 * ## 🔴 왜 목록을 여기 한 곳에 두나
 *
 *   `[slug].astro` 의 `getStaticPaths` 와 `sitemap-[section].xml.ts` 가 **같은 목록**을
 *   봐야 한다. 두 곳에 따로 적으면 「사이트맵엔 있는데 404」 또는 그 반대가 된다.
 *   ⛔ 슬러그를 여기 말고 다른 데서 이어 붙이지 않는다.
 *
 * ## ⛔ 이 목록이 지키는 것
 *
 *   ⛔ **회사가 적은 업종은 지면을 내지 않는다.** 서너 곳짜리 표는 얇아서 구글이
 *     「크롤링됨 - 색인 생성 안 됨」으로 돌려보낸다(오늘 진단에서 32장이 그랬다).
 *     기준은 `지면을내는최소회사수` 한 곳에만 적는다.
 *   ⛔ 시가총액이 없는 회사를 0 으로 채우지 않는다 — 합계의 분모에서 뺀다.
 */
import tape from '../data/korea-valuation-tape.json';

/** 이보다 회사가 적은 업종은 지면을 내지 않는다 (얇은 지면은 색인이 안 된다) */
export const 지면을내는최소회사수 = 10;

export type 업종행 = {
  ticker: string | null;
  name: string | null;
  nameEn: string | null;
  market: string | null;
  industry: string | null;
  industryEn: string | null;
  marketCap: number | null;
  revenue: number | null;
  operatingIncome: number | null;
  netIncome: number | null;
  per: number | null;
  pbr: number | null;
  roe: number | null;
  fiscalYear: number | null;
  priceAsOf: string | null;
};

export type 업종 = {
  /** 자료의 `industryEn` 칸과 **글자까지 같다** — 이것으로 행을 고른다 */
  열쇠: string;
  영문: string;
  국문: string | null;
  slug: string;
  /** 그 업종의 상장사 수 */
  곳: number;
  /** 시가총액을 «잰» 회사 수 (못 잰 곳은 여기 안 든다) */
  시총잰곳: number;
  /** 잰 곳들의 시가총액 합(원) */
  시총합: number;
};

/**
 * 영문 업종명 → 주소 조각.
 * ⚠ 손으로 줄이지 않는다 — 줄이면 자료가 바뀔 때 조용히 어긋난다.
 *   쉼표와 `and` 만 걷고 기계적으로 만든다.
 */
export function 업종슬러그(영문: string): string {
  return String(영문 ?? '')
    .toLowerCase()
    .replace(/[,.]/g, ' ')
    .replace(/\band\b/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70)
    .replace(/-+$/g, '');
}

/** 자료의 모든 행 */
export function 모든행(): 업종행[] {
  return ((tape as any).rows ?? []) as 업종행[];
}

/** 한 업종의 회사들 — 시가총액 큰 차례. 못 잰 곳은 뒤로 */
export function 업종의회사들(열쇠: string): 업종행[] {
  return 모든행()
    .filter((r) => (r.industryEn ?? '') === 열쇠)
    .sort((a, b) => (b.marketCap ?? -1) - (a.marketCap ?? -1));
}

/**
 * 지면을 낼 업종 목록 — 회사 수가 많은 차례.
 * ⛔ 이 함수 하나만 쓴다. 지면과 사이트맵이 같은 것을 본다.
 */
export function 업종목록(): 업종[] {
  const 모음 = new Map<string, { 국문: string | null; 행: 업종행[] }>();
  for (const r of 모든행()) {
    const k = r.industryEn ?? '';
    if (!k) continue;
    if (!모음.has(k)) 모음.set(k, { 국문: r.industry ?? null, 행: [] });
    모음.get(k)!.행.push(r);
  }

  const 쓴슬러그 = new Set<string>();
  const 나온것: 업종[] = [];
  for (const [열쇠, v] of 모음) {
    if (v.행.length < 지면을내는최소회사수) continue;
    const slug = 업종슬러그(열쇠);
    if (!slug || 쓴슬러그.has(slug)) continue; /* 슬러그가 겹치면 뒤엣것을 안 낸다 — 404 보다 낫다 */
    쓴슬러그.add(slug);
    const 잰것 = v.행.filter((r) => typeof r.marketCap === 'number' && r.marketCap > 0);
    나온것.push({
      열쇠,
      영문: 열쇠,
      국문: v.국문,
      slug,
      곳: v.행.length,
      시총잰곳: 잰것.length,
      시총합: 잰것.reduce((a, r) => a + (r.marketCap ?? 0), 0),
    });
  }
  return 나온것.sort((a, b) => b.곳 - a.곳);
}

/** 주소 조각으로 업종 하나를 찾는다 */
export function 업종찾기(slug: string): 업종 | null {
  return 업종목록().find((x) => x.slug === slug) ?? null;
}
