/**
 * taiwan-company-page.mjs — **대만 상장사 한 곳의 지면에 올릴 수를 만든다.** (5번, 2026-09-23)
 *
 * ── 왜 ───────────────────────────────────────────────────────────────
 * 사장님: 「사우디, 상하이 외 할 곳은?」 → 재서 대만을 1순위로 올렸고 「응」을 받았다.
 * TWSE 가 OpenAPI 를 열쇠 없이 열었는데 **항목·회사명이 중국어**다 —
 * 한국 DART 와 똑같은 「언어 장벽형 기회」이고, 우리는 그 일을 두 번 해 봤다.
 *
 * ── ⛔ 이 자가 지키는 것 ──────────────────────────────────────────────
 * ⛔ **** 없는 계정은 null 이고 지면은 「—」로 둔다.
 * ⛔ **바닥이 0 이면 나누지 않는다.** Infinity 를 비율이라 적지 않는다.
 * ⛔ **등수를 매기지 않는다.** 「우량」·「상위」를 만들지 않는다.
 * ⛔ **환율을 만들어 곱하지 않는다.** 대만달러는 대만달러로 적는다.
 * ⚠ 이 자료는 **분기 재무제표**다. 한국(연간)·일본(연간)과 기간이 다르다 —
 *   그래서 두 나라 수와 나란히 놓을 때는 그 사실을 지면이 «먼저» 말한다.
 * 🔴 수집기가 천 TWD 를 원으로 이미 고쳐 놓았다. 여기서 또 곱하지 않는다.
 *
 * ── 🔴🔴 손익은 «그 분기»가 아니라 «연초부터의 누계»다 (2026-09-23 배포 뒤 실측) ──
 * 처음에 지면이 「These are quarterly figures」라고 적고 나갔다. **틀린 말이었다.**
 * TWSE 손익표(`t187ap06_L_*`)의 季別=2 는 「2분기 석 달」이 아니라 **1~2분기 누계(상반기)**다.
 * 대차대조표(`t187ap07_L_*`)만 그 분기 «말» 시점 값이다.
 *
 * 어떻게 알았나 — 안 자랄 수 없는 회사로 검산했다. 연 매출을 아는 회사를 골라
 * 「한 분기라면 얼마여야 하나」와 맞대어 봤다.
 * ```
 * 2412 中華電信  우리 수 121.4bn   연 매출 ≈ 230bn ⇒ 한 분기면 ≈ 58bn · 반년이면 ≈ 115bn
 *                                  ⇒ **누계다.** 통신사가 한 해에 두 배로 크지 않는다
 * 1301 台塑      우리 수  89.2bn   연 ≈ 200bn ⇒ 반년치와 맞는다
 * 2454 聯發科    우리 수 301.3bn   연 ≈ 530bn ⇒ 반년치와 맞는다
 * 2317 鴻海      우리 수 4,645bn   연 ≈ 7,700bn ⇒ 한 분기(1,900bn)가 아니다
 * ```
 * ⛔ 그래서 「분기」라는 말을 지면에 쓰지 않는다. 「연초부터 Q2 까지 누계」라고 적는다.
 * ⛔ ROE 를 「this quarter」라고 적지 않는다 — 분자가 반년치라 뜻이 달라진다.
 * ⚠ 그리고 **분자는 누계, 분모(자본·자산)는 시점**이다. 그 비대칭을 지면이 말한다.
 * ⭐ 배운 것 — 새 나라의 첫 지면은 «수의 크기»를 아는 회사로 한 번 검산하고 낸다.
 *   단위(천 배)는 배포 전에 잡았는데 «기간»은 못 잡고 나갔다. 둘 다 같은 종류의 함정이다.
 */

/** TWD → 십억 TWD. 못 재면 null */
export function 십억(n) {
  if (n == null || !Number.isFinite(Number(n))) return null;
  return Number(n) / 1e9;
}

/** 바닥이 0 이거나 없으면 null — ⛔ Number(null) 이 0 이라 먼저 거른다 */
export function 나눔(위, 아래) {
  if (위 == null || 아래 == null || 위 === '' || 아래 === '') return null;
  const a = Number(위); const b = Number(아래);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return null;
  return a / b;
}

/** 지면에 올릴 한 줄 */
export function 재무줄(행) {
  if (!행) return null;
  const 매출 = 십억(행.revenue_twd);
  const 영업 = 십억(행.operating_profit_twd);
  const 세전 = 십억(행.pretax_profit_twd);
  const 순익 = 십억(행.net_profit_twd);
  const 자산 = 십억(행.assets_twd);
  const 부채 = 십억(행.liabilities_twd);
  const 자본 = 십억(행.equity_twd);
  return {
    year: 행.year ?? null,
    quarter: 행.quarter ?? null,
    revenue: 매출, operating: 영업, pretax: 세전, net: 순익,
    assets: 자산, liabilities: 부채, equity: 자본,
    bps: 행.bps_twd == null ? null : Number(행.bps_twd),
    영업이익률: 나눔(영업, 매출),
    순이익률: 나눔(순익, 매출),
    자기자본비율: 나눔(자본, 자산),
    부채비율: 나눔(부채, 자본),
    ROE: 나눔(순익, 자본),
  };
}

/**
 * 시장이 매긴 값 — 종가·시가총액·PER·PBR·배당수익률.
 *
 * 🔴 **시가총액은 거래소가 준 종가에 발행주식수를 곱한 것**이지, 우리가 만든 수가 아니다.
 *   그리고 «PBR × 주당순자산»이라는 다른 길로 검산해 둔 값을 함께 들고 온다 —
 *   두 길이 5% 넘게 어긋나면 지면이 그 사실을 «말한다». ⛔ 어긋난다고 수를 고치지 않는다.
 *   1,070곳을 맞대어 보니 어긋난 곳은 1곳뿐이었다(6949 PELL BMT).
 *
 * ⚠ 이 수는 «어느 날짜의» 값이다. 손익(반년 누계)과 기간이 다르므로 지면이 날짜를 적는다.
 */
export function 시장줄(행) {
  if (!행) return null;
  const 것 = {
    close: 행.close_twd == null ? null : Number(행.close_twd),
    priceDate: 행.price_date || null,
    marketCap: 십억(행.market_cap_twd),
    per: 행.per == null ? null : Number(행.per),
    pbr: 행.pbr == null ? null : Number(행.pbr),
    dividendYield: 행.dividend_yield_pct == null ? null : Number(행.dividend_yield_pct),
    crossCheck: 행.price_cross_check == null ? null : Number(행.price_cross_check),
  };
  return Object.values(것).some((v) => v != null) ? 것 : null;
}

/** 두 길로 잰 주가가 많이 어긋났나 — 지면이 그때만 말한다 */
export const 어긋남선 = 0.05;
export function 많이어긋났나(시장) {
  return !!시장 && 시장.crossCheck != null && 시장.crossCheck > 어긋남선;
}

/**
 * 업종 영문 이름 → 주소 조각. ⛔ 옮긴 이름이 없으면 null — 주소를 지어내지 않는다.
 * ⚠ 이름이 곧 주소이므로, 사전의 영문 이름을 바꾸면 그 지면의 주소가 바뀐다.
 */
export function 업종주소(이름) {
  const s = String(이름 ?? '').trim().toLowerCase();
  if (!s) return null;
  const 주소 = s.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return 주소 || null;
}

/** 회사 됨됨이 — 재무가 아닌 것. 사람은 «곁들이»라 이름 한 줄만 둔다 */
export function 회사줄(행) {
  if (!행) return null;
  const 것 = {
    shares: 행.shares == null ? null : Number(행.shares),
    paidIn: 십억(행.paid_in_capital_twd),
    website: 행.website || null,
    listedOn: 행.listed_on || null,
    foundedOn: 행.founded_on || null,
  };
  return Object.values(것).some((v) => v != null) ? 것 : null;
}

/**
 * ② 낼 내용이 없으면 지면을 만들지 않는다 (백년지도 노하우).
 * ⛔ 영문 이름이 없으면 안 낸다 — 영문 매체다.
 */
export function 낼만한가(행) {
  if (!행) return false;
  if (!String(행.code ?? '').trim()) return false;
  if (!String(행.name_en ?? '').trim()) return false;
  return 행.revenue_twd != null || 행.assets_twd != null;
}

/**
 * 가운데값. ⛔ 빈 벌이면 null.
 * ⚠ Astro 의 getStaticPaths() 는 «격리되어» 돌아 같은 파일 앞말의 선언을 못 본다 —
 *   그래서 지면에서 쓸 것은 반드시 이 모듈에 둔다(2026-09-23 에 일본 지면이 그것으로 죽었다).
 */
export function 가운데값(수들) {
  const 것 = (수들 ?? []).filter((n) => n != null && Number.isFinite(n)).sort((a, b) => a - b);
  if (!것.length) return null;
  const m = Math.floor(것.length / 2);
  return 것.length % 2 ? 것[m] : (것[m - 1] + 것[m]) / 2;
}

/** 분기 표기 — 「2026 Q2」. 못 쟀으면 null.
 *  ⚠ 이것은 «어느 제출분인가»를 가리키는 꼬리표일 뿐이다.
 *    손익 수가 덮는 «기간»은 `누계기간()` 이 말한다 — 둘을 섞지 않는다. */
export function 분기말(행) {
  if (!행?.year) return null;
  return 행.quarter ? `${행.year} Q${행.quarter}` : String(행.year);
}

/** 손익 수가 실제로 덮는 기간. 🔴 季別=2 는 석 달이 아니라 «연초부터 반년»이다.
 *  { 짧게, 길게, 달수 } — 못 쟀으면 null */
export function 누계기간(행) {
  if (!행?.year) return null;
  const q = Number(행.quarter);
  if (!Number.isInteger(q) || q < 1 || q > 4) return null;
  const 짧게 = [`${행.year} Q1`, `${행.year} H1`, `${행.year} 9M`, `${행.year} full year`][q - 1];
  const 길게 = q === 1
    ? `the first quarter of ${행.year}`
    : `the first ${[0, 0, 'six', 'nine', 'twelve'][q]} months of ${행.year} (cumulative, Q1–Q${q})`;
  return { 짧게, 길게, 달수: q * 3 };
}

/* ── 자가시험 ─────────────────────────────────────────────── */
if (process.argv?.[1]?.endsWith('taiwan-company-page.mjs') && process.argv.includes('--자가시험')) {
  const 잰다 = [];
  const 본다 = (이름, v) => 잰다.push([이름, !!v]);

  본다('원을 십억으로', 십억(9375654727000) === 9375.654727);
  본다('⛔ 없으면 null', 십억(null) === null && 십억('x') === null);
  본다('0 은 0 이다', 십억(0) === 0);

  본다('나눈다', Math.abs(나눔(1, 4) - 0.25) < 1e-12);
  본다('🔴 ⛔ 바닥이 0 이면 null', 나눔(1, 0) === null);
  본다('🔴 ⛔ Number(null) 이 0 이라 먼저 거른다', 나눔(null, 2) === null && 나눔(2, null) === null);
  본다('음수도 낸다', 나눔(-1, 2) === -0.5);

  const 행 = {
    code: '2330', name_en: 'TSMC', year: 2026, quarter: '2',
    revenue_twd: 2404483690000, operating_profit_twd: 1425568793000,
    pretax_profit_twd: 1550229773000, net_profit_twd: 1279582227000,
    assets_twd: 9375654727000, liabilities_twd: 2901183746000, equity_twd: 6474470981000,
    bps_twd: 248.05, shares: 25932370067, paid_in_capital_twd: 259323700670,
    website: 'https://www.tsmc.com',
  };
  const 줄 = 재무줄(행);
  본다('재무줄이 선다', Math.abs(줄.revenue - 2404.48369) < 1e-6 && 줄.year === 2026);
  본다('분기를 남긴다', 줄.quarter === '2' && 분기말(행) === '2026 Q2');
  본다('영업이익률을 낸다', Math.abs(줄.영업이익률 - 1425568793 / 2404483690) < 1e-9);
  본다('ROE 를 낸다', Math.abs(줄.ROE - 1279582227 / 6474470981) < 1e-9);
  본다('부채비율을 낸다', Math.abs(줄.부채비율 - 2901183746 / 6474470981) < 1e-9);
  본다('🔴 수집기가 이미 원으로 고쳤다 — 여기서 또 곱하지 않는다', 줄.assets > 9000 && 줄.assets < 10000);
  본다('⛔ 주당순자산은 그대로 둔다', 줄.bps === 248.05);
  본다('⛔ 빈 것에 안 터진다', 재무줄(null) === null);

  const 빈줄 = 재무줄({ code: 'x', year: 2026 });
  본다('⛔ 없는 수는 null 로 남는다', 빈줄.revenue === null && 빈줄.ROE === null);

  const 회 = 회사줄(행);
  본다('회사줄이 선다', 회.shares === 25932370067 && Math.abs(회.paidIn - 259.32370067) < 1e-6);
  본다('⛔ 아무것도 없으면 null', 회사줄({ code: 'x' }) === null);

  본다('낼 만하다', 낼만한가(행) === true);
  본다('🔴 매출도 자산도 없으면 안 낸다', 낼만한가({ code: 'x', name_en: 'X' }) === false);
  본다('🔴 영문 이름이 없으면 안 낸다', 낼만한가({ code: 'x', name_en: '', revenue_twd: 1 }) === false);
  본다('⛔ 빈 것에 안 터진다', 낼만한가(null) === false);

  본다('홀수면 한가운데', 가운데값([3, 1, 2]) === 2);
  본다('짝수면 두 개의 가운데', 가운데값([1, 2, 3, 4]) === 2.5);
  본다('🔴 ⛔ 빈 벌이면 null', 가운데값([]) === null && 가운데값(null) === null);
  본다('⛔ 못 잰 것을 섞지 않는다', 가운데값([1, null, 3]) === 2);

  본다('⛔ 해가 없으면 분기 표기도 없다', 분기말({ quarter: '2' }) === null);

  /* 🔴 손익은 «그 분기»가 아니라 «연초부터 누계»다 — 머리글의 검산 참조 */
  const 반년 = 누계기간(행);
  본다('🔴 Q2 는 석 달이 아니라 반년이다', 반년.짧게 === '2026 H1' && 반년.달수 === 6);
  본다('🔴 ⛔ 「quarterly」라고 적지 않는다', !/quarter(?!s of)/i.test(반년.길게) && /cumulative/.test(반년.길게));
  본다('Q1 만 진짜 한 분기다', 누계기간({ year: 2026, quarter: 1 }).달수 === 3);
  본다('Q3 는 아홉 달', 누계기간({ year: 2026, quarter: '3' }).짧게 === '2026 9M');
  본다('Q4 는 한 해 전부', 누계기간({ year: 2026, quarter: 4 }).달수 === 12);
  본다('⛔ 분기를 못 쟀으면 기간도 없다', 누계기간({ year: 2026 }) === null && 누계기간(null) === null);
  본다('⛔ 없는 분기 번호를 만들지 않는다', 누계기간({ year: 2026, quarter: 9 }) === null);

  /* ── 시장이 매긴 값 ── */
  const 시 = 시장줄({
    close_twd: 2460, price_date: '2026-09-22', market_cap_twd: 63793630364820,
    per: 28.52, pbr: 9.92, dividend_yield_pct: 1.23, price_cross_check: 0.0003,
  });
  본다('종가·시가총액을 낸다', 시.close === 2460 && Math.abs(시.marketCap - 63793.63036482) < 1e-6);
  본다('날짜를 남긴다 — 손익과 기간이 다르다', 시.priceDate === '2026-09-22');
  본다('⛔ 아무것도 없으면 null', 시장줄({ code: 'x' }) === null && 시장줄(null) === null);
  본다('🔴 두 길이 맞으면 조용하다', 많이어긋났나(시) === false);
  본다('🔴 5% 넘게 어긋나면 지면이 말한다', 많이어긋났나(시장줄({ price_cross_check: 0.95 })) === true);
  본다('⛔ 못 쟀으면 말하지 않는다', 많이어긋났나(시장줄({ close_twd: 1 })) === false);

  본다('업종 주소를 만든다', 업종주소('Iron and steel') === 'iron-and-steel');
  본다('쉼표도 한 이음으로', 업종주소('Tourism, hotels and catering') === 'tourism-hotels-and-catering');
  본다('⛔ 이름이 없으면 주소도 없다', 업종주소(null) === null && 업종주소('  ') === null);
  본다('⛔ 한자만이면 주소를 지어내지 않는다', 업종주소('水泥工業') === null);

  const 진 = 잰다.filter(([, v]) => !v);
  for (const [이름, v] of 잰다) console.log(`${v ? '✅' : '🔴'} ${이름}`);
  console.log(진.length ? `\n🔴 ${진.length}/${잰다.length} 떨어졌다` : `\n✅ 자가시험 ${잰다.length} 통과`);
  process.exit(진.length ? 1 : 0);
}
