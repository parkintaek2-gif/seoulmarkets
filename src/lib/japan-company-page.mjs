/**
 * japan-company-page.mjs — **일본 상장사 한 곳의 지면에 올릴 수를 만든다.** (5번, 2026-09-23)
 *
 * ── 🔴 왜 ────────────────────────────────────────────────────────────
 * 사장님 지시 — 「백년지도의 노하우 적용은 케이라이프맵과 에스마켓에 일단 해」
 * 그 노하우는 **한 자료로 지면 수천 장을 찍는 것**이다. 한국은 2,515장을 냈는데,
 * 같은 저장소에 **일본 상장사 3,672곳**의 재무가 지면 없이 쌓여 있었다.
 * 한국보다 크고, 영문 데이터 벤더가 얇은 자리다(사장님: 「나라 확장은 경쟁공백 기준」).
 *
 * ── ⛔ 이 자가 지키는 것 ──────────────────────────────────────────────
 * ⛔ **0 으로 채우지 않는다.** 없는 계정은 null 이고, 지면은 그 자리를 「—」로 둔다.
 * ⛔ **바닥이 0 이면 나누지 않는다** — 0 으로 나눈 Infinity 를 「비율」이라 적지 않는다.
 * ⛔ **등수를 매기지 않는다.** 「우량」·「상위」 같은 말을 만들지 않는다.
 * ⛔ **환율을 만들어 곱하지 않는다.** 엔은 엔으로 적는다 — 환율은 회사가 낸 수가 아니다.
 * ⚠ 이 자료는 회사마다 **가장 최근 결산 한 줄**이다(EDINET 유가증권보고서).
 *   한국처럼 해마다 줄이 서지 않는다 — 그래서 「몇 년 사이 얼마 늘었다」를 적지 않는다.
 *   ⛔ 없는 이력을 있는 것처럼 그리지 않는다.
 */

/** 엔 → 십억 엔(JPY bn). 못 재면 null */
export function 십억엔(n) {
  if (n == null || !Number.isFinite(Number(n))) return null;
  return Number(n) / 1e9;
}

/** 바닥이 0 이거나 없으면 null — ⛔ Infinity 를 비율이라 적지 않는다 */
export function 나눔(위, 아래) {
  /* ⚠ Number(null) 은 0 이다 — 먼저 거르지 않으면 「못 잰 것」이 0 으로 둔갑한다 */
  if (위 == null || 아래 == null || 위 === '' || 아래 === '') return null;
  const a = Number(위); const b = Number(아래);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return null;
  return a / b;
}

/** 지면에 올릴 한 줄로 고친다 */
export function 재무줄(행) {
  if (!행) return null;
  const 매출 = 십억엔(행.revenue_jpy);
  const 영업 = 십억엔(행.operating_profit_jpy);
  const 순익 = 십억엔(행.net_profit_jpy);
  const 자산 = 십억엔(행.assets_jpy);
  const 자본 = 십억엔(행.equity_jpy);
  return {
    year: 행.year ?? null,
    periodEnd: 행.period_end ?? null,
    basis: 행.basis ?? null,
    revenue: 매출, operating: 영업, net: 순익, assets: 자산, equity: 자본,
    영업이익률: 나눔(영업, 매출),
    순이익률: 나눔(순익, 매출),
    자기자본비율: 나눔(자본, 자산),
    ROE: 나눔(순익, 자본),
    총자산회전율: 나눔(매출, 자산),
  };
}

/**
 * 유가증권보고서 표지의 **대표자**. 재무와 섞지 않는다 — `재무줄()` 은 재무만 넘긴다.
 *
 * 🔴 [2026-10-11 01:0x · 5번] **묶음에 넣었는데 지면에 한 장도 안 그려졌다.**
 *   `재무줄()` 이 흰 목록이라 지정한 칸만 넘긴다. `rep_name` 이 거기서 조용히 걸러졌다.
 *   ⭐ 「자료에 있다」와 「지면에 닿는다」 사이에 **거르개가 하나 더** 있었다.
 *     빌드가 성공한 것을 칸이 생긴 것으로 읽었으면 그대로 배포됐다 — 세어 보고 알았다.
 * ⛔ 이름은 한자 그대로 넘긴다. 로마자를 지어내지 않는다.
 */
export function 대표줄(행) {
  if (!행?.rep_name) return null;
  return {
    name: 행.rep_name,
    title: 행.rep_title ?? null,
    titleEn: 행.rep_title_en ?? null,
  };
}

/** 시장이 매긴 값 — 회사가 낸 수가 아니다. 따로 담아 지면에서도 따로 적는다 */
export function 시장줄(행) {
  if (!행) return null;
  const 것 = {
    marketCap: 십억엔(행.market_cap_jpy),
    price: 행.price_jpy == null ? null : Number(행.price_jpy),
    shares: 행.shares == null ? null : Number(행.shares),
    eps: 행.eps_jpy == null ? null : Number(행.eps_jpy),
    bps: 행.bps_jpy == null ? null : Number(행.bps_jpy),
    per: 행.per == null ? null : Number(행.per),
    pbr: 행.pbr == null ? null : Number(행.pbr),
    pbr못낸까닭: 행.pbr_못낸까닭 ?? null,
  };
  return Object.values(것).some((v) => v != null) ? 것 : null;
}

/**
 * ② 낼 내용이 없으면 지면을 만들지 않는다 (백년지도 노하우).
 * 매출도 자산도 없는 줄은 표가 전부 「—」가 된다 — 그런 지면은 손님에게 쓸모가 없고
 * 검색엔진에도 얇은 지면으로 읽힌다.
 */
export function 낼만한가(행) {
  if (!행) return false;
  if (!String(행.code ?? '').trim()) return false;
  if (!String(행.name_en ?? '').trim()) return false;   /* 영문 매체다 — 영문 이름이 없으면 안 낸다 */
  return 행.revenue_jpy != null || 행.assets_jpy != null;
}

/**
 * 가운데값. ⛔ 빈 벌이면 null — 0 으로 메꾸지 않는다.
 * ⚠ 이 자가 여기 있는 까닭 — Astro 의 `getStaticPaths()` 는 **격리되어** 실행되어
 *   같은 파일 앞말에 선언한 함수를 못 본다(2026-09-23 에 빌드가 「가운데값 is not defined」로
 *   죽어서 알았다). 그 안에서 쓸 것은 반드시 «모듈»에 두고 import 해야 한다.
 */
export function 가운데값(수들) {
  const 것 = (수들 ?? []).filter((n) => n != null && Number.isFinite(n)).sort((a, b) => a - b);
  if (!것.length) return null;
  const m = Math.floor(것.length / 2);
  return 것.length % 2 ? 것[m] : (것[m - 1] + 것[m]) / 2;
}

/** 업종 주소 조각. 모르면 null — ⛔ 짐작해서 만들지 않는다 */
export function 업종주소(업종) {
  const t = String(업종 ?? '').trim();
  if (!t) return null;
  const s = t.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return s || null;
}

/**
 * 한 줄로 늘어선 한벌에서 **내 이웃**을 고른다. ⛔ 앞에서 N개를 떼 오지 않는다.
 *
 * 🔴🔴 [2026-10-04 · 5번] **이것이 없어서 일본 회사 3,702장이 모두 «같은 12개»를
 *   가리키고 있었다.** 업종별 한벌을 이름순으로 세운 뒤 `.slice(0, 12)` 했기 때문이다.
 *   화면에는 「같은 업종 12곳」이라고 떴으니 눈으로는 멀쩡해 보인다 —
 *   **길을 세어 보고서야 드러났다.** 3,702장 중 3,286장이 들어오는 길이 «하나»뿐이었다.
 *   ⇒ 구글은 링크를 타고 온다. 길이 하나뿐인 깊은 지면에는 좀처럼 오지 않는다.
 *
 * ⭐ 이웃을 고르면 한벌 전체가 **고리처럼 이어진다** — 모든 곳이 링크를 받는다.
 * ⛔ 자기 자신은 안 넣는다. ⛔ 한벌이 짧으면 있는 만큼만 낸다(0 으로 채우지 않는다).
 *
 * @param {Array} 한벌  이름순으로 세워 둔 목록
 * @param {number} 나   그 안에서 내 자리(없으면 -1)
 * @param {number} 몇   뽑을 수
 */
export function 이웃고르기(한벌, 나, 몇 = 12) {
  const a = Array.isArray(한벌) ? 한벌 : [];
  if (a.length <= 1) return [];
  const n = a.length;
  const 쓸것 = Math.min(몇, n - 1);
  /* 내 자리를 모르면 앞에서 뽑되 자기 자신만 뺀다 — 못 찾았다고 빈손으로 두지 않는다 */
  const i = Number.isInteger(나) && 나 >= 0 && 나 < n ? 나 : 0;
  const 낸것 = [];
  /* 고리로 돈다 — 끝에 닿으면 처음으로 넘어가 모든 곳이 이웃을 가진다 */
  let 걸음 = 1;
  while (낸것.length < 쓸것 && 걸음 <= n) {
    const 뒤 = a[(i + 걸음) % n];
    if (뒤 && 낸것.length < 쓸것 && (i + 걸음) % n !== i) 낸것.push(뒤);
    const 앞자리 = (((i - 걸음) % n) + n) % n;
    const 앞 = a[앞자리];
    if (앞 && 낸것.length < 쓸것 && 앞자리 !== i && !낸것.includes(앞)) 낸것.push(앞);
    걸음 += 1;
  }
  return 낸것;
}

/* ── 자가시험 ─────────────────────────────────────────────── */
if (process.argv?.[1]?.endsWith('japan-company-page.mjs') && process.argv.includes('--자가시험')) {
  const 잰다 = [];
  const 본다 = (이름, v) => 잰다.push([이름, !!v]);

  본다('엔을 십억으로 바꾼다', 십억엔(214128000000) === 214.128);
  본다('⛔ 없으면 null', 십억엔(null) === null && 십억엔('x') === null);
  본다('0 은 0 이다 — null 이 아니다', 십억엔(0) === 0);

  /* 🔴 [2026-10-04] 3,702장이 모두 같은 12개를 가리키던 흠 */
  const 열 = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
  본다('이웃을 고른다 — 자기 자신은 안 넣는다', !이웃고르기(열, 3, 4).includes('d'));
  본다('내 둘레에서 고른다', 이웃고르기(열, 3, 2).sort().join('') === 'ce');
  본다('⛔ 앞에서 떼 오지 않는다 — 자리가 다르면 낸 것도 달라야 한다',
    이웃고르기(열, 0, 3).join('') !== 이웃고르기(열, 7, 3).join(''));
  본다('⛔ 한벌이 하나뿐이면 빈손', 이웃고르기(['a'], 0, 5).length === 0);
  본다('⛔ 빈 한벌도 빈손', 이웃고르기([], 0, 5).length === 0 && 이웃고르기(null, 0, 5).length === 0);
  본다('한벌이 짧으면 있는 만큼만 — 0 으로 채우지 않는다', 이웃고르기(['a', 'b', 'c'], 1, 9).length === 2);
  본다('끝에 선 것도 이웃을 받는다 — 고리로 돈다', 이웃고르기(열, 9, 4).length === 4);
  본다('⛔ 같은 것을 두 번 넣지 않는다',
    new Set(이웃고르기(열, 5, 8)).size === 이웃고르기(열, 5, 8).length);
  본다('내 자리를 모르면 앞에서 뽑되 빈손으로 두지 않는다', 이웃고르기(열, -1, 3).length === 3);

  본다('나눈다', Math.abs(나눔(1, 4) - 0.25) < 1e-12);
  본다('🔴 ⛔ 바닥이 0 이면 null — Infinity 를 비율이라 적지 않는다', 나눔(1, 0) === null);
  본다('⛔ 없으면 null', 나눔(null, 2) === null && 나눔(2, null) === null);
  본다('음수도 낸다 — 적자를 못 쟀다고 하지 않는다', 나눔(-1, 2) === -0.5);

  const 행 = {
    code: '1301', name_en: 'KYOKUYO CO.,LTD.', sector: 'Fishery, Agriculture & Forestry',
    year: 2026, period_end: '2026-03-31', basis: 'consolidated',
    assets_jpy: 214128000000, equity_jpy: 78868000000, revenue_jpy: 334612000000,
    operating_profit_jpy: 10731000000, net_profit_jpy: 6532000000,
    shares: 12078000, bps_jpy: 6511.31, eps_jpy: 576.02, per: 8.6,
    price_jpy: 4953.772, market_cap_jpy: 59831658216, pbr: null,
    pbr_못낸까닭: 'BPS basis mismatch',
  };
  const 줄 = 재무줄(행);
  본다('재무줄이 선다', 줄.revenue === 334.612 && 줄.year === 2026);
  본다('영업이익률을 낸다', Math.abs(줄.영업이익률 - 10.731 / 334.612) < 1e-9);
  본다('ROE 를 낸다', Math.abs(줄.ROE - 6.532 / 78.868) < 1e-9);
  본다('자기자본비율을 낸다', Math.abs(줄.자기자본비율 - 78.868 / 214.128) < 1e-9);
  본다('결산일을 그대로 남긴다', 줄.periodEnd === '2026-03-31');
  본다('⛔ 빈 것에 안 터진다', 재무줄(null) === null);

  const 빈줄 = 재무줄({ code: 'x', year: 2026 });
  본다('⛔ 없는 수는 null 로 남는다 — 0 으로 안 채운다',
    빈줄.revenue === null && 빈줄.영업이익률 === null && 빈줄.ROE === null);

  const 시장 = 시장줄(행);
  본다('시장줄이 선다', Math.abs(시장.marketCap - 59.831658216) < 1e-9 && 시장.per === 8.6);
  본다('못 낸 PBR 의 까닭을 남긴다', 시장.pbr === null && 시장.pbr못낸까닭 === 'BPS basis mismatch');
  본다('⛔ 아무것도 없으면 시장줄 자체가 null', 시장줄({ code: 'x' }) === null);

  본다('낼 만하다', 낼만한가(행) === true);
  본다('🔴 매출도 자산도 없으면 안 낸다', 낼만한가({ code: 'x', name_en: 'X' }) === false);
  본다('🔴 영문 이름이 없으면 안 낸다 — 영문 매체다',
    낼만한가({ code: 'x', name_en: '', revenue_jpy: 1 }) === false);
  본다('⛔ 종목코드가 없으면 안 낸다', 낼만한가({ name_en: 'X', revenue_jpy: 1 }) === false);
  본다('⛔ 빈 것에 안 터진다', 낼만한가(null) === false);
  본다('자산만 있어도 낸다 — 못 낸 칸은 「—」로 둔다',
    낼만한가({ code: 'x', name_en: 'X', assets_jpy: 1 }) === true);

  본다('홀수면 한가운데', 가운데값([3, 1, 2]) === 2);
  본다('짝수면 두 개의 가운데', 가운데값([1, 2, 3, 4]) === 2.5);
  본다('🔴 ⛔ 빈 벌이면 null — 0 으로 메꾸지 않는다', 가운데값([]) === null && 가운데값(null) === null);
  본다('⛔ 못 잰 것을 섞지 않는다', 가운데값([1, null, 3, undefined]) === 2);
  본다('음수도 센다 — 적자를 빼지 않는다', 가운데값([-3, -1, -2]) === -2);

  본다('업종 주소를 만든다', 업종주소('Fishery, Agriculture & Forestry') === 'fishery-agriculture-and-forestry');
  본다('⛔ 없으면 null', 업종주소(null) === null && 업종주소('  ') === null);
  본다('⛔ 앞뒤 하이픈이 안 남는다', !/^-|-$/.test(업종주소('  Retail Trade  ')));

  const 진 = 잰다.filter(([, v]) => !v);
  for (const [이름, v] of 잰다) console.log(`${v ? '✅' : '🔴'} ${이름}`);
  console.log(진.length ? `\n🔴 ${진.length}/${잰다.length} 떨어졌다` : `\n✅ 자가시험 ${잰다.length} 통과`);
  process.exit(진.length ? 1 : 0);
}
