/**
 * company-page.mjs — **회사 지면 한 장에 들어갈 것을 «자료에서» 셈한다.** (5번, 2026-09-22)
 *
 * ── 🔴 왜 (사장님 지시 2026-09-22) ──────────────────────────────────────
 * 「**백년지도의 노하우 적용은 케이라이프맵과 에스마켓에 일단 해. 이 두 사이트가 중요하다**」
 *
 * 백년지도가 네 사이트 가운데 «유일하게» 진짜 손님이 늘어난 곳이고(7명 → 16명),
 * 까닭을 재 보니 **한 자료로 지면 수천 장을 찍은 것**이었다(/school 2,525장).
 * 서울마켓츠는 자료가 더 많은데(상장사 2,709 × 3년) 회사 지면이 «0장»이었다.
 *
 * ── ⛔ 이 자가 지키는 것 ────────────────────────────────────────────────
 * 🔴 **주력은 재무다. 사람은 곁들이다.** (사장님 2026-09-09 · 09-14)
 *   「사람(근속·급여·성별·임원)을 절대로 주력으로 하지마. 곁들이는 정도에 그쳐야 해」
 *   ⇒ 이 자는 재무를 먼저 돌려주고 사람은 «따로» 돌려준다. 지면이 그 차례로 그린다.
 * ⛔ **못 잰 칸을 ** null 로 두고 지면이 「—」로 그린다.
 *   0 은 「값이 0 이다」라는 뜻이고 null 은 「못 쟀다」다. 둘은 다른 말이다.
 * ⛔ **등수를 매기지 않는다**(백년지도 노하우). 「우량」·「상위」 같은 말을 쓰지 않는다.
 *   같은 업종에 몇 곳이 있는지는 규모의 사실이라 쓴다.
 * ⛔ **투자 판단을 적지 않는다.** 비율은 계산이고, 그것이 좋은지 나쁜지는 우리가 안 정한다.
 * ⚠ 모든 금액은 원(KRW)이다. 달러로 환산하지 않는다 — 환율을 쓰면 우리가 만든 수가 된다.
 */

/** 억·조로 쓰지 않는다 — 영문 독자가 읽는 지면이다. 10억(bn) 단위로 낸다 */
export function 조원억(원) {
  if (원 == null || !Number.isFinite(원)) return null;
  return 원 / 1e9;                                   /* KRW bn */
}

/** 나누기 — 바닥이 0 이거나 없으면 «못 쟀다»(null). ⛔ 0 으로 돌려주지 않는다 */
export function 나눔(위, 아래) {
  if (위 == null || 아래 == null) return null;
  if (!Number.isFinite(위) || !Number.isFinite(아래) || 아래 === 0) return null;
  return 위 / 아래;
}

/**
 * 한 회사의 세 해 재무를 «해가 오래된 것부터» 줄 세우고, 해마다 비율을 붙인다.
 * ⚠ 비율은 그 해 안에서만 셈한다 — 해를 섞으면 뜻이 없는 수가 된다.
 */
export function 재무줄(행들) {
  const 것 = [...(행들 ?? [])].filter((r) => r && Number.isFinite(r.year))
    .sort((a, b) => a.year - b.year);
  return 것.map((r) => ({
    year: r.year,
    basis: r.basis ?? null,
    measured: r.measured === true,
    revenue: 조원억(r.revenue_krw),
    operating: 조원억(r.operating_profit_krw),
    net: 조원억(r.net_profit_krw),
    assets: 조원억(r.assets_krw),
    equity: 조원억(r.equity_krw),
    영업이익률: 나눔(r.operating_profit_krw, r.revenue_krw),
    순이익률: 나눔(r.net_profit_krw, r.revenue_krw),
    자기자본비율: 나눔(r.equity_krw, r.assets_krw),
    ROE: 나눔(r.net_profit_krw, r.equity_krw),
  }));
}

/**
 * 첫 해 → 마지막 해 증감률. ⛔ 첫 해가 0 이거나 음수면 «못 쟀다» —
 * 음수에서 음수로 가는 변화율은 방향이 거꾸로 읽힌다.
 */
export function 늘어난비(줄들, 칸) {
  const 것 = (줄들 ?? []).filter((r) => r && r[칸] != null && Number.isFinite(r[칸]));
  if (것.length < 2) return null;
  const 처음 = 것[0][칸];
  const 끝 = 것[것.length - 1][칸];
  if (!(처음 > 0)) return null;
  return (끝 - 처음) / 처음;
}

/**
 * 사람 자료 — **곁들이다.** 없으면 없다고 둔다.
 * ⛔ 남녀 급여비를 「격차」라고 부르지 않는다. 비율은 비율이다.
 * ⚠ payRatioWithheldReason 은 회사가 «안 밝힌» 까닭이다. 그것도 사실이라 같이 낸다.
 */
export function 사람줄(행) {
  if (!행) return null;
  return {
    year: 행.fiscalYear ?? null,
    headcount: Number.isFinite(행.headcount) ? 행.headcount : null,
    men: Number.isFinite(행.men) ? 행.men : null,
    women: Number.isFinite(행.women) ? 행.women : null,
    womenShare: Number.isFinite(행.womenShareRatio) ? 행.womenShareRatio : null,
    tenure: Number.isFinite(행.tenureYears) ? 행.tenureYears : null,
    payMen: Number.isFinite(행.annualPayPerPersonKrwMen) ? 행.annualPayPerPersonKrwMen : null,
    payWomen: Number.isFinite(행.annualPayPerPersonKrwWomen) ? 행.annualPayPerPersonKrwWomen : null,
    payRatio: Number.isFinite(행.payRatioWomenToMen) ? 행.payRatioWomenToMen : null,
    withheld: 행.payRatioWithheldReason || null,
    marketCap: 조원억(행.marketCapKrw),
    close: Number.isFinite(행.closePriceKrw) ? 행.closePriceKrw : null,
    shares: Number.isFinite(행.listedShares) ? 행.listedShares : null,
    priceAsOf: 행.priceAsOf ?? null,
  };
}

/** 시장 코드 → 사람이 읽는 이름. ⛔ 모르는 코드를 KOSPI 로 짐작하지 않는다 */
export const 시장이름 = { Y: 'KOSPI', K: 'KOSDAQ', N: 'KONEX' };
export function 시장말(코드) { return 시장이름[String(코드 ?? '').trim()] ?? null; }

/**
 * 🔴 **지면을 낼 회사인가** — 얇은 지면을 2,700장 내면 광고 심사가 「저가치」로 본다.
 * 백년지도도 같은 판단으로 «수치가 하나도 없는 48곳»을 권하는 목록에서 뺐다.
 * ⇒ 매출이 한 해라도 잡힌 회사만 낸다. 나머지는 지면을 만들지 않는다.
 * ⛔ 「그 회사를 숨긴다」가 아니다 — 낼 내용이 없는 것이다.
 */
export function 낼만한가(행들) {
  const 것 = 행들 ?? [];
  if (!것.length) return false;
  return 것.some((r) => Number.isFinite(r?.revenue_krw) && r.revenue_krw > 0);
}

/**
 * 🔴 [2026-10-27 · 1번, 5번 지시] **매출 줄은 없지만 증권사 리서치가 있는 회사** — 지면을 낸다.
 * 은행·보험·증권·지주사는 매출을 「매출액」이 아니라 이자수익·보험수익·영업수익으로 적어
 * 우리 테이프의 revenue 칸이 비어 있다. 그래서 KB금융·신한·삼성생명 같은 곳이 리서치가
 * 있는데도 지면이 없었다(18곳). «낼 내용이 없는» 것이 아니라 «매출 칸을 못 읽은» 것이다.
 * ⇒ 리서치가 한 건이라도 있고, 영업이익·순이익·자산·자본 가운데 하나라도 «잰 값»이 있으면 낸다.
 * ⛔ 재무가 하나도 안 잡힌 곳은 여전히 안 낸다 — 리서치 한 줄짜리 얇은 지면을 늘리지 않는다.
 * ⛔ 지면은 이 회사들의 매출·이익률 칸을 «그리지 않는다»(못 잰 것을 0 이나 빈칸 줄로 늘어놓지 않는다).
 *   ⚠ 2023년 보험사 두 곳은 revenue 가 0 으로 들어와 있다 — 매출 칸을 아예 안 그리는 까닭이다.
 */
const 잰칸들 = ['operating_profit_krw', 'net_profit_krw', 'assets_krw', 'equity_krw'];
export function 리서치로낼만한가(행들, 리서치) {
  if (낼만한가(행들)) return false;                       /* 매출이 있으면 원래 길로 낸다 */
  if (!리서치 || !(Number(리서치.reports) > 0)) return false;
  return (행들 ?? []).some((r) => 잰칸들.some((k) => Number.isFinite(r?.[k])));
}

/** 회사 지면이 «서는가» — 낱장·사이트맵·다른 지면의 링크가 같은 자를 쓴다(어긋나면 404 를 건다) */
export function 지면낼만한가(행들, 리서치) {
  return 낼만한가(행들) || 리서치로낼만한가(행들, 리서치);
}

/** 매출 칸 없이 내는 지면에서 쓸 줄 — 잰 값이 하나도 없는 해는 뺀다(대시만 늘어선 줄을 안 그린다) */
export function 잰해만(줄들) {
  return (줄들 ?? []).filter((r) => ['operating', 'net', 'assets', 'equity'].some((k) => r?.[k] != null));
}

/* ── 자가시험 ─────────────────────────────────────────────── */
if (process.argv?.[1]?.endsWith('company-page.mjs') && process.argv.includes('--자가시험')) {
  const 잰다 = [];
  const 본다 = (이름, v) => 잰다.push([이름, !!v]);
  const 가깝나 = (a, b) => a != null && Math.abs(a - b) < 1e-9;

  본다('원을 10억 단위로', 가깝나(조원억(496394309778), 496.394309778));
  본다('⛔ 없으면 null', 조원억(null) === null && 조원억(undefined) === null && 조원억(NaN) === null);
  본다('0 은 0 이다 — null 이 아니다', 조원억(0) === 0);

  본다('나눔이 된다', 가깝나(나눔(1, 4), 0.25));
  본다('🔴 바닥이 0 이면 «못 쟀다» — 0 으로 돌려주지 않는다', 나눔(5, 0) === null);
  본다('⛔ 한쪽이 없으면 null', 나눔(null, 4) === null && 나눔(4, null) === null);
  본다('음수도 나눈다 — 적자는 사실이다', 가깝나(나눔(-2, 4), -0.5));

  const 줄 = 재무줄([
    { year: 2025, revenue_krw: 200, operating_profit_krw: 20, net_profit_krw: 10, assets_krw: 500, equity_krw: 250, basis: 'CFS', measured: true },
    { year: 2023, revenue_krw: 100, operating_profit_krw: 5, net_profit_krw: -3, assets_krw: 400, equity_krw: 200, basis: 'CFS', measured: true },
    { year: 2024, revenue_krw: 150, operating_profit_krw: 12, net_profit_krw: 6, assets_krw: 450, equity_krw: 220, basis: 'CFS', measured: true },
  ]);
  본다('해가 오래된 것부터 선다', 줄.map((r) => r.year).join(',') === '2023,2024,2025');
  본다('영업이익률을 셈한다', 가깝나(줄[2].영업이익률, 0.1));
  본다('적자도 그대로 낸다', 줄[0].순이익률 < 0);
  본다('자기자본비율을 셈한다', 가깝나(줄[0].자기자본비율, 0.5));
  본다('ROE 를 셈한다', 가깝나(줄[2].ROE, 10 / 250));
  본다('⛔ 빈 벌에 안 터진다', 재무줄([]).length === 0 && 재무줄(null).length === 0);
  본다('⛔ 해가 없는 줄은 뺀다', 재무줄([{ revenue_krw: 1 }]).length === 0);

  본다('매출 증감률을 셈한다', 가깝나(늘어난비(줄, 'revenue'), 1));   /* 100 → 200 */
  본다('🔴 첫 해가 0 이면 못 쟀다', 늘어난비([{ revenue: 0 }, { revenue: 10 }], 'revenue') === null);
  본다('🔴 첫 해가 적자면 못 쟀다 — 방향이 거꾸로 읽힌다',
    늘어난비([{ net: -5 }, { net: 5 }], 'net') === null);
  본다('⛔ 한 해뿐이면 null', 늘어난비([{ revenue: 10 }], 'revenue') === null);
  본다('⛔ 빈 것에 안 터진다', 늘어난비(null, 'revenue') === null);

  const ㅅ = 사람줄({ fiscalYear: 2025, headcount: 100, women: 30, womenShareRatio: 0.3, marketCapKrw: 1e12 });
  본다('사람 줄이 선다', ㅅ.headcount === 100 && 가깝나(ㅅ.womenShare, 0.3));
  본다('시가총액도 10억 단위', 가깝나(ㅅ.marketCap, 1000));
  본다('⛔ 없는 칸은 null 이다 — 0 이 아니다', ㅅ.tenure === null && ㅅ.payMen === null);
  본다('⛔ 사람 자료가 없으면 null', 사람줄(null) === null);

  본다('Y 는 KOSPI', 시장말('Y') === 'KOSPI');
  본다('K 는 KOSDAQ', 시장말('K') === 'KOSDAQ');
  본다('N 은 KONEX', 시장말('N') === 'KONEX');
  본다('⛔ 모르는 코드를 짐작하지 않는다', 시장말('Z') === null && 시장말(null) === null);

  본다('매출이 있으면 낸다', 낼만한가([{ revenue_krw: 1 }]) === true);
  본다('🔴 매출이 한 해도 없으면 안 낸다 — 얇은 지면을 수천 장 내지 않는다',
    낼만한가([{ revenue_krw: 0 }, { revenue_krw: null }]) === false);
  본다('⛔ 빈 것은 안 낸다', 낼만한가([]) === false && 낼만한가(null) === false);

  /* 리서치로 내는 지면 — 금융사 */
  const 금융 = [
    { year: 2025, revenue_krw: null, operating_profit_krw: 8518e9, net_profit_krw: 5841e9, assets_krw: 797923e9, equity_krw: 60830e9 },
    { year: 2022, revenue_krw: null, operating_profit_krw: null, net_profit_krw: null, assets_krw: null, equity_krw: null },
  ];
  본다('🔴 매출 칸이 비어도 리서치·재무가 있으면 낸다(KB금융 꼴)', 리서치로낼만한가(금융, { reports: 3 }) === true);
  본다('⛔ 리서치가 없으면 안 낸다', 리서치로낼만한가(금융, null) === false && 리서치로낼만한가(금융, { reports: 0 }) === false);
  본다('⛔ 재무가 하나도 없으면 리서치가 있어도 안 낸다',
    리서치로낼만한가([{ year: 2025, revenue_krw: null }], { reports: 5 }) === false);
  본다('매출이 있는 회사는 이 길이 아니다(원래 길)', 리서치로낼만한가([{ revenue_krw: 1, net_profit_krw: 1 }], { reports: 1 }) === false);
  본다('지면낼만한가 = 둘 중 하나', 지면낼만한가([{ revenue_krw: 1 }], null) && 지면낼만한가(금융, { reports: 1 }) && !지면낼만한가(금융, null));
  본다('⚠ 매출 0(보험사 2023 꼴)은 매출로 안 친다', 낼만한가([{ revenue_krw: 0, net_profit_krw: 5 }]) === false
    && 리서치로낼만한가([{ revenue_krw: 0, net_profit_krw: 5 }], { reports: 1 }) === true);
  const 잰줄 = 잰해만(재무줄(금융));
  본다('잰 값이 없는 해는 뺀다', 잰줄.length === 1 && 잰줄[0].year === 2025);
  본다('⛔ 빈 것에 안 터진다', 잰해만(null).length === 0);

  const 진 = 잰다.filter(([, v]) => !v);
  for (const [이름, v] of 잰다) console.log(`${v ? '✅' : '🔴'} ${이름}`);
  console.log(진.length ? `\n🔴 ${진.length}/${잰다.length} 떨어졌다` : `\n✅ 자가시험 ${잰다.length} 통과`);
  process.exit(진.length ? 1 : 0);
}
