/**
 * licence-datasets.mjs — **파는 «데이터셋»의 한 곳의 진실.**
 * ─────────────────────────────────────────────────────────────────────────
 * 사장님 지시 (2026-09-13): 「5-4 아직 못한 것 빨리 마무리해」 —
 *   그 가운데 «데이터셋 고르기»와 «묶음 내려받기»가 여기에 달려 있다.
 *
 * 🔴 왜 파일 이름을 여기 한 곳에만 두나
 *   파일 이름에 날짜가 박혀 있다(…-2026-09-11.csv). 새 판이 나오면 여기만 고친다.
 *   서버·지면 어디에도 파일 이름을 «또» 적지 않는다 — 두 곳에 적으면 반드시 어긋난다.
 *
 * ⛔ 여기 없는 데이터셋은 팔지 않는다. 「돈은 받았는데 줄 것이 없다」를 만들지 않는다.
 * ⚠ 파일이 실제로 있는지는 검사(tests/licence-files.test.mjs)가 잰다 —
 *   이름만 적어 두고 파일이 없으면 손님이 돈을 내고 빈손이 된다.
 */

/** 뿌리는 dist/ 아래 공개 경로다. server.mjs 가 그대로 내보낸다 */
export const 데이터셋 = {
  people: {
    코드: 'people',
    이름: 'Sector workforce panel',
    설명: 'Headcount, tenure, pay and the gender gap, as filed — the axis nobody else counts.',
    파일: ['/data/full/korea-people-panel-2026-09-11.csv'],
  },
  mezzanine: {
    코드: 'mezzanine',
    이름: 'Convertibles, warrants and exchangeables',
    설명: 'Korean CB, BW and EB issues as filed — private versus public placement, coupons, refixing.',
    파일: ['/data/full/korea-mezzanine-book-2026-09-11.csv'],
  },
  ownership: {
    코드: 'ownership',
    이름: 'Ownership and insider filings',
    설명: 'Large-holding reports and executive share filings — who moved a stake, and when.',
    파일: [
      '/data/full/korea-ownership-ledger-filings-2026-09-11.csv',
      '/data/full/korea-ownership-ledger-executives-2026-09-11.csv',
    ],
  },
};

/** 화면이 고르게 낼 목록 — 값이 아니라 «무엇을 사는가»다 */
export const 데이터셋목록 = Object.values(데이터셋).map((d) => ({ 코드: d.코드, 이름: d.이름, 설명: d.설명 }));

export function 데이터셋찾기(코드) {
  const k = String(코드 ?? '').trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(데이터셋, k) ? 데이터셋[k] : null;
}

/**
 * 산 사람에게 줄 파일들.
 * @param 상품코드 'all' 이면 전부 · 'single'/'academic' 이면 고른 하나 · 'trade' 는 무역
 * @param 데이터셋코드 single·academic 일 때만 쓴다
 * ⛔ single 인데 데이터셋을 안 골랐으면 «빈 목록»을 낸다 — 조용히 전부 주지 않는다.
 */
export function 줄파일들(상품코드, 데이터셋코드) {
  /* 월 상품(single_monthly·all_monthly)은 연 상품과 «같은 것»을 준다 —
     차이는 청구 방식이지 받는 파일이 아니다. */
  const p = String(상품코드 ?? '').trim().toLowerCase().replace(/_monthly$/, '');
  if (p === 'all') return Object.values(데이터셋).flatMap((d) => d.파일);
  if (p === 'single' || p === 'academic') {
    const d = 데이터셋찾기(데이터셋코드);
    return d ? d.파일.slice() : [];
  }
  if (p === 'trade') return ['/data/full/korea-trade-dataset.csv'];
  return [];
}

/** 상품이 «데이터셋을 골라야 하는가» — 화면이 고르개를 낼지 정할 때 쓴다 */
export function 골라야하나(상품코드) {
  const p = String(상품코드 ?? '').trim().toLowerCase().replace(/_monthly$/, '');
  return p === 'single' || p === 'academic';
}
