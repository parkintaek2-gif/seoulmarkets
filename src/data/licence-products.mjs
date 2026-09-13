/**
 * licence-products.mjs — **파는 것의 «한 곳의 진실».**
 * ─────────────────────────────────────────────────────────────────────────
 * 사장님 지시 (2026-09-13):
 *   「**달러로만 기재**해야지. 페이팔 등 **국적불문 결제**」
 *   「구독료를 **월, 연, 일인지 명확히** 해라」
 *   「이런 절차 필요없이 **바로 결제**할 수 있게 해」
 *
 * 🔴 왜 한 파일에 모으나 — **지면의 값과 페이팔이 받는 값이 어긋나면 그것이 사고다.**
 *   지면(`src/pages/data/index.astro`)도, 서버(`server.mjs`)도 여기만 본다.
 *   한쪽만 고치면 손님이 화면에서 본 값과 다른 금액이 청구된다.
 *   ⛔ 값을 다른 곳에 «또» 적지 않는다.
 *
 * ⚠ 달러 값은 환율로 지어낸 것이 아니다. 새로 정한 값이다 —
 *   FnGuide 단품이 월 11만원(≈$80)·연 132만원(≈$960)이다(2026-09-13 그 지면에서 직접 읽음).
 *   Single 을 그 자리에 놓았고, All 은 FnGuide 전체 묶음(연 ≈$12,000)보다 훨씬 낮췄다.
 *   우리가 후발이고, 아직 손님이 없다.
 *
 * ⚠ 「월 얼마」는 «참고»로만 적는다. 실제 청구는 연 1회다.
 *   달마다 걷는 정기결제는 아직 안 붙였으므로 **되는 척하지 않는다.**
 */

/** 값은 페이팔이 요구하는 꼴 그대로 — 소수점 두 자리 문자열. 숫자로 두면 0.1+0.2 문제가 난다 */
export const 통화 = 'USD';

export const 상품 = {
  academic: {
    코드: 'academic',
    이름: 'Academic licence — one dataset',
    설명: 'One dataset for a thesis, dissertation or published paper.',
    usd: '79.00',
    기간: 'one-time',
    기간글: 'One-time',
  },
  single: {
    코드: 'single',
    이름: 'Single dataset — one year',
    설명: 'One dataset, complete, plus every release for twelve months.',
    usd: '990.00',
    기간: 'year',
    기간글: 'Per year, billed annually',
    월참고: '82.50',
  },
  all: {
    코드: 'all',
    이름: 'All six datasets — one year',
    설명: 'Every dataset on the page, plus every release for twelve months.',
    usd: '2990.00',
    기간: 'year',
    기간글: 'Per year, billed annually',
    월참고: '249.00',
  },

  /* 🔴 [2026-09-13] 월 정기결제 — 사장님: 「구독료를 월, 연, 일인지 명확히 해라」
       ⛔ 앞서는 월간을 «참고 숫자»로만 적고 실제로는 못 팔았다. 이제 진짜로 판다.
       ⚠ 연으로 사면 $990, 달로 나눠 내면 $99×12 = $1,188 이다. 나눠 내는 값이 «더 비싸다» —
         그것이 정상이고, 화면에도 그렇게 보이게 둔다. 숨기면 나중에 항의가 된다.
       ⚠ planId 는 페이팔에 만들어 둔 요금제다(2026-09-13 생성).
         값을 고치려면 페이팔에서 «새 요금제»를 만들고 여기 id 를 바꾼다 —
         옛 요금제의 값을 고치면 이미 가입한 손님에게도 적용된다. */
  single_monthly: {
    코드: 'single_monthly',
    이름: 'Single dataset — monthly',
    설명: 'One dataset, complete, with every release while you subscribe. Cancel any time.',
    usd: '99.00',
    기간: 'month',
    기간글: 'Per month, recurring',
    planId: 'P-2KG0517585759370JNKTC6LI',
    같은것: 'single',
  },
  all_monthly: {
    코드: 'all_monthly',
    이름: 'All six datasets — monthly',
    설명: 'Every dataset, with every release while you subscribe. Cancel any time.',
    usd: '299.00',
    기간: 'month',
    기간글: 'Per month, recurring',
    planId: 'P-6KH32877FB069642WNKTC6LI',
    같은것: 'all',
  },
  trade: {
    코드: 'trade',
    이름: 'Korea trade dataset',
    설명: 'Every partner country, every month — exports, imports, balance.',
    usd: '29.00',
    기간: 'one-time',
    기간글: 'One-time',
  },
};

/** 코드로 상품을 찾는다. 없으면 null — ⛔ 모르는 코드를 «기본값»으로 팔지 않는다 */
export function 상품찾기(코드) {
  const k = String(코드 ?? '').trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(상품, k) ? 상품[k] : null;
}

/** 화면에 내는 값 — 「$990」 꼴. ⛔ 통화 기호를 다른 곳에서 또 붙이지 않는다 */
export function 값글(s) {
  if (!s) return '';
  const n = Number(s.usd);
  return '$' + (Number.isInteger(n) ? n.toLocaleString('en-US') : n.toLocaleString('en-US', { minimumFractionDigits: 2 }));
}
