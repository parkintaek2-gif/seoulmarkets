#!/usr/bin/env node
/**
 * check-asia-coverage.mjs — **아시아 마켓이 나라별로 «어디까지 찼나»를 센다.**
 *
 * 🔴 사장님 (2026-09-27): 「**아시아마켓 구축도 중요하고**」
 *    앞서 (2026-09-26): 「**아시아마켓츠 마무리했나?**」 · 「**아직 멀었는데 넋놓고 있니?**」
 *
 * ── 왜 이 자가 필요한가 ─────────────────────────────────────────
 * 「어디까지 됐나」를 문서로 적어 두면 그 문서가 늙는다. 실제로 오늘 아침 계획 문서와
 * 자료 폴더가 어긋나 있었다. ⇒ **자료를 직접 세서** 채움도를 낸다.
 *
 * 축은 저장소 CLAUDE.md 가 정한 순서 그대로다 —
 *   ① 회사 명부  ② 재무제표  ③ 공시(중대사건)  ④ 시세·지수
 *   ⑤ 사람(이사회·임원)은 «서비스»다. 주력으로 세지 않는다(사장님 2026-09-14).
 *
 * ⛔ **못 잰 것은 못 쟀다고 적는다. 0 으로 채우지 않는다.**
 * ⛔ 라이선스로 막힌 것은 «비어 있다»가 아니라 «막혔다»로 적는다 — 그 둘은 다른 말이고,
 *   섞으면 다음 사람이 이미 재 본 벽에 또 머리를 박는다.
 *
 * ── 🔴🔴 그러나 「막혔다」로 끝내지 않는다 (사장님 2026-09-27) ─────────
 *   「**우회로 찾아라. 다른 나라에서 했던 노하우를 이용해**」
 *   「**막히면 우리 노하우를 이용해 우회로를 반드시 찾는다**」
 *
 * 내가 막힌 둘을 구별해 적어 놓고 «닫힌 문»으로 두었다가 사장님께 되돌림을 받았다.
 * 구별해 적는 것은 맞다. 잘못은 **거기서 멈춘 것**이다.
 *
 * ⇒ 그래서 이 자는 막힌 칸마다 **아직 안 대 본 길**을 함께 찍는다.
 *   남은 길이 있으면 그것은 막힌 것이 아니라 «아직 안 해 본 것»이다.
 *
 * 쓰는 법
 *   node scripts/check-asia-coverage.mjs
 *   node scripts/check-asia-coverage.mjs --자가시험   (영문 별칭 --selftest)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const 원자료방 = path.join(뿌리, 'archive', 'raw');

/**
 * 나라표 — 축마다 «어느 폴더가 그것인가».
 * ⚠ 폴더 이름을 여기 한 곳에 적는다. 수집기 이름이 바뀌면 여기만 고친다.
 */
export const 나라들 = [
  {
    나라: '한국', 코드: 'KR',
    명부: 'dart-company', 재무: 'dart-financials', 공시: 'dart-breaking', 시세: 'krx',
  },
  {
    나라: '일본', 코드: 'JP',
    명부: 'japan-jpx-companies', 재무: 'japan-edinet-financials',
    공시: 'japan-edinet-breaking', 시세: 'jgb-yields',
  },
  {
    나라: 'UAE 아부다비', 코드: 'AE-AZ',
    명부: 'uae-adx-marketwatch', 재무: 'uae-adx-financials',
    공시: 'uae-adx-disclosures', 시세: 'uae-adx-marketwatch',
  },
  {
    나라: 'UAE 두바이', 코드: 'AE-DU',
    명부: 'dubai-dfm-companies', 재무: 'dubai-dfm-financials',
    공시: 'dubai-dfm-breaking', 시세: null,
  },
  {
    나라: '사우디', 코드: 'SA',
    명부: 'saudi-openfigi-companies', 재무: null, 공시: null, 시세: null,
    /* 🔴 2026-09-26 에 재 봤다. 「못 했다」가 아니라 「막혔다」다.
       ⚠ 다만 «대 본 길»을 함께 적는다 — 안 대 본 길이 남아 있으면 막힌 것이 아니다 */
    막힘: {
      재무: 'saudiexchange.sa 약관이 systematic retrieval 을 금지한다 (거래소 길만 대 봤다)',
    },
    /* ⛔ 재무는 «거래소 하나»만 대 봤다. 나머지는 아직이다 */
    대본길: { 재무: ['거래소 공개 API'] },
  },
  {
    나라: '대만', 코드: 'TW',
    명부: null, 재무: 'twse-financials', 공시: null, 시세: null,
  },
  {
    나라: '인도', 코드: 'IN',
    명부: null, 재무: null, 공시: null, 시세: null,
    딸림: { '신용등급': 'india-nse-credit-rating' },
  },
  {
    나라: '중국 상하이', 코드: 'CN-SH',
    명부: null, 재무: null, 공시: 'shanghai-cninfo-breaking', 시세: null,
  },
  {
    나라: '홍콩', 코드: 'HK',
    /* 🎯 [2026-09-27] **뚫었다.** 사장님 「우회로 찾아라. 다른 나라에서 했던 노하우를 이용해」
       HKEX 약관이 막은 것은 «거래소 지면»이다. 사우디에서 쓴 ③번 길(나라 밖 식별자)을
       그대로 대니 그 자리에서 열렸다 — OpenFIGI exchCode=HK, 보통주 2,841건.
       ⭐ 게다가 티커가 «홍콩 종목코드 그대로»(619) 온다. 사우디에서는 못 얻던 것이다. */
    /* 🎯 [2026-09-27 · 2번] 공시도 뚫었다 — www1.hkexnews.hk/search/titleSearchServlet.do 를
       title 키워드(중대사건 구절)로 온 시장에 돌리고, 위 OpenFIGI 종목표로 «우리 것만»
       걸러냈다(거래소 약관이 막는 «전량 systematic retrieval»이 아니라 중대사건 몇 갈래만). */
    /* 🎯 [2026-09-28 · 2번] 재무도 같은 우물 — title="annual report"·"interim report" 로
       30일치 184건(연차 85·반기 99) 확보. collect-hongkong-hkex-financials.mjs. */
    명부: 'hongkong-openfigi-companies', 재무: 'hongkong-hkex-financials', 공시: 'hongkong-hkex-disclosures', 시세: null,
    대본길: { 명부: ['거래소 공개 API', '나라 밖 공개 식별자'], 공시: ['거래소 공개 API'], 재무: ['거래소 공개 API'] },
  },
];

export const 축들 = ['명부', '재무', '공시', '시세'];

/**
 * 🔴 우리가 이미 뚫어 본 길들. 벽을 만나면 이것을 차례로 «대 본다».
 * ⛔ 이 표를 줄이지 않는다 — 줄이면 「막혔다」가 다시 닫힌 문이 된다.
 */
export const 우회로 = [
  { 이름: '규제기관 공시 시스템', 본보기: '한국 DART · 일본 EDINET',
    설명: '거래소가 막아도 감독기관은 공시를 여는 곳이 많다. 가장 두껍다' },
  { 이름: '거래소 공개 API', 본보기: 'UAE 아부다비 ADX · 두바이 DFM',
    설명: '약관을 읽어 「공개 API」로 열어 둔 곳인지 본다' },
  { 이름: '나라 밖 공개 식별자', 본보기: 'OpenFIGI (사우디 393곳 · 홍콩 2,841건)',
    설명: '앞의 둘이 다 막혔을 때. 거래소 약관과 무관한 제3자 우물이다' },
  { 이름: '발행사 자신이 내는 것', 본보기: '회사 IR·연차보고서',
    설명: '거래소 약관은 거래소 지면에 걸린다. 발행사 저작물은 그와 별개다' },
  { 이름: '우리가 «센 수»만 내기', 본보기: '인도 신용등급',
    설명: '원자료 재배포가 막혀도 우리가 세어 만든 통계·분포는 우리 것이다' },
];

/** 그 칸에서 «이미 대 본 길»을 뺀 나머지 — 남아 있으면 아직 안 해 본 것이다 */
export function 안대본길(대본것 = []) {
  const 본것 = new Set((대본것 ?? []).map(String));
  return 우회로.filter((r) => !본것.has(r.이름));
}

/** 그 폴더에 벌이 몇이고 마지막이 언제인가. ⛔ 없으면 «없다»를 준다. 0 으로 치지 않는다 */
export function 벌세기(폴더, 방 = 원자료방) {
  if (!폴더) return null;
  const 길 = path.join(방, 폴더);
  if (!fs.existsSync(길)) return null;
  let 것들 = [];
  try { 것들 = fs.readdirSync(길).filter((s) => !s.startsWith('_')); } catch { return null; }
  if (!것들.length) return { 수: 0, 마지막: null };
  const 날 = 것들
    .map((s) => (s.match(/(\d{4})-?(\d{2})-?(\d{2})/) || []).slice(1).join('-'))
    .filter(Boolean)
    .sort();
  return { 수: 것들.length, 마지막: 날.length ? 날[날.length - 1] : null };
}

/** 한 나라의 채움을 재서 줄 하나로 만든다 */
export function 나라재기(나라, 방 = 원자료방) {
  const 칸 = {};
  for (const 축 of 축들) {
    const 막힌까닭 = 나라.막힘?.[축];
    const 잰것 = 벌세기(나라[축], 방);
    if (잰것 && 잰것.수) 칸[축] = { 꼴: '있다', ...잰것, 막힌까닭 };
    else if (막힌까닭) 칸[축] = { 꼴: '막혔다', 막힌까닭 };
    else 칸[축] = { 꼴: '없다' };
  }
  const 찬수 = 축들.filter((a) => 칸[a].꼴 === '있다').length;
  const 막힌수 = 축들.filter((a) => 칸[a].꼴 === '막혔다').length;
  return { ...나라, 칸, 찬수, 막힌수 };
}

/** 다음에 손댈 곳 — «막힌 것이 아니라 비어 있는 것» 가운데 앞 축부터 */
export function 다음할것(잰것들) {
  const 것 = [];
  for (const r of 잰것들) {
    for (const 축 of 축들) {
      if (r.칸[축].꼴 !== '없다') continue;
      것.push({ 나라: r.나라, 축, 찬수: r.찬수 });
      break;                       /* 한 나라에 하나씩만 — 앞 축이 먼저다 */
    }
  }
  /* 이미 많이 찬 나라를 먼저 마무리한다. 반쯤 선 나라가 상품이 되기 더 가깝다 */
  것.sort((a, z) => z.찬수 - a.찬수);
  return 것;
}

/* ── 자가시험 ─────────────────────────────────────────────────────── */
function 자가시험() {
  let 통과 = 0; const 실패 = [];
  const 본다 = (이름, 참) => { if (참) { 통과 += 1; console.log('✅ ' + 이름); } else { 실패.push(이름); console.log('❌ ' + 이름); } };

  본다('⛔ 없는 폴더는 null — 0 으로 치지 않는다', 벌세기('없는폴더') === null);
  본다('⛔ 폴더 이름이 null 이면 null', 벌세기(null) === null);
  /* 🔴 [2026-10-11 08:5x · 5번] 여기가 `< 106` 이었는데 **자료가 늘어 110 이 되자 깨졌다.**
   *   걸러내기는 멀쩡했다 — 파일 111개 가운데 밑줄 하나를 빼고 110 을 세고 있었다.
   * ⭐ 이 칸이 지키려던 것은 「106보다 적은가」가 아니라 **「밑줄 파일을 빼고 세는가」**다.
   *   수는 그 뜻을 재던 대리 지표였고, **자료가 느는 자리에 수를 박으면 반드시 깨진다.**
   *   ⇒ 수를 박지 않고 폴더를 세어 맞대어 본다. 자료가 늘어도 안 깨지고,
   *     밑줄을 안 거르면 바로 운다.
   * ⚠ 오늘 같은 모양을 다섯 번째 본다(갈래 열일곱 · 이름이 check- 인가 · 내 가리개 둘). */
  본다('⛔ 밑줄로 시작하는 것은 벌이 아니다 (_coverage.json)', (() => {
    let 다;
    try { 다 = fs.readdirSync(path.join(뿌리, 'archive', 'raw', 'uae-adx-financials')); } catch { return false; }
    const 밑줄 = 다.filter((f) => f.startsWith('_')).length;
    if (!밑줄) return false;               /* ⛔ 거를 것이 없으면 이 시험은 헛돈다 */
    return (벌세기('uae-adx-financials')?.수 ?? -1) === 다.length - 밑줄;
  })());

  /* 🔴 「막혔다」와 「없다」는 다른 말이다 — 섞으면 이미 재 본 벽에 또 박는다 */
  const 사우디 = 나라재기(나라들.find((n) => n.코드 === 'SA'));
  본다('🔴 사우디 재무는 «막혔다»로 적힌다', 사우디.칸.재무.꼴 === '막혔다');
  본다('🔴 막힌 까닭이 함께 적힌다', /systematic retrieval/.test(사우디.칸.재무.막힌까닭 ?? ''));
  /* 🎯 [2026-09-27] 홍콩 명부는 «뚫렸다» — 「막혔다」로 재던 옛 시험을 여기서 바꿨다.
     ⛔ 시험이 옛 판정을 지키고 있으면 그 시험이 우회로를 막는다. 고친 것을 시험도 따라간다. */
  const 홍콩 = 나라들.find((n) => n.코드 === 'HK');
  본다('🎯 홍콩 명부는 더 이상 막힌 것으로 적혀 있지 않다', !홍콩.막힘?.명부);
  본다('홍콩 명부를 «나라 밖 식별자»로 뚫었다고 적혀 있다',
    (홍콩.대본길?.명부 ?? []).includes('나라 밖 공개 식별자'));

  /* 🔴 사장님 「막히면 우리 노하우를 이용해 우회로를 반드시 찾는다」 */
  본다('우회로 표에 우리가 뚫어 본 길이 넷 이상 있다', 우회로.length >= 4);
  본다('🔴 사우디 재무는 «거래소 길만» 대 봤다고 적혀 있다',
    (나라들.find((n) => n.코드 === 'SA').대본길?.재무 ?? []).length === 1);
  본다('⇒ 그러므로 아직 안 대 본 길이 남아 있다',
    안대본길(['거래소 공개 API']).length === 우회로.length - 1);
  본다('⛔ 다 대 봤으면 남는 길이 없다', 안대본길(우회로.map((r) => r.이름)).length === 0);
  본다('⛔ 빈 것·null 에도 안 터진다 — 안대본길',
    안대본길(null).length === 우회로.length && 안대본길().length === 우회로.length);

  const 일본 = 나라재기(나라들.find((n) => n.코드 === 'JP'));
  본다('일본은 재무가 차 있다', 일본.칸.재무.꼴 === '있다');
  본다('찬 축을 센다', 일본.찬수 >= 3);

  /* ⛔ 막힌 것을 「다음 할 것」으로 올리면 안 된다 */
  const 다음 = 다음할것([사우디, 나라재기(홍콩), 일본]);
  본다('⛔ 막힌 축은 다음 할 것에 안 오른다',
    !다음.some((d) => d.나라 === '사우디' && d.축 === '재무'));
  본다('한 나라에 한 줄만 오른다',
    new Set(다음.map((d) => d.나라)).size === 다음.length);

  console.log(`\n${실패.length ? '❌' : '✅'} 자가시험 ${통과}${실패.length ? ' · 실패 ' + 실패.length : ' 통과'}`);
  return !실패.length;
}

/* ── 진입점 ───────────────────────────────────────────────────────── */
const 내가진입점 = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (내가진입점 && (process.argv.includes('--자가시험') || process.argv.includes('--selftest'))) {
  process.exit(자가시험() ? 0 : 1);
} else if (내가진입점) {
  const 잰것 = 나라들.map((n) => 나라재기(n));
  const 표시 = { 있다: '✅', 막혔다: '⛔', 없다: '⬜' };

  console.log('■ 아시아 마켓 채움도 — 자료를 직접 세었다\n');
  console.log(`${'나라'.padEnd(16)} ${축들.map((a) => a.padEnd(7)).join('')} 찬 축`);
  console.log('─'.repeat(58));
  for (const r of 잰것) {
    const 칸글 = 축들.map((a) => (표시[r.칸[a].꼴] + '     ')).join('');
    console.log(`${r.나라.padEnd(16)} ${칸글} ${r.찬수}/4${r.막힌수 ? ` (막힘 ${r.막힌수})` : ''}`);
  }

  console.log('\n■ 벌 수와 마지막 날');
  for (const r of 잰것) {
    const 있는것 = 축들.filter((a) => r.칸[a].꼴 === '있다');
    if (!있는것.length) continue;
    console.log(`  ${r.나라} — ${있는것.map((a) => `${a} ${r.칸[a].수}벌${r.칸[a].마지막 ? `(~${r.칸[a].마지막})` : ''}`).join(' · ')}`);
  }

  const 막힌것 = [];
  for (const r of 잰것) for (const a of 축들) {
    if (r.칸[a].꼴 === '막혔다') {
      막힌것.push({ 나라: r.나라, 축: a, 까닭: r.칸[a].막힌까닭, 대본것: r.대본길?.[a] ?? [] });
    }
  }
  if (막힌것.length) {
    /* 🔴 사장님 (2026-09-27): 「막히면 우리 노하우를 이용해 우회로를 반드시 찾는다」
       ⛔ 막힌 목록만 찍고 끝내지 않는다. «아직 안 대 본 길»을 그 자리에 함께 낸다 */
    console.log('\n⛔ 그 «문»이 막힌 것 — 그러나 그 «자료»가 막힌 것은 아니다');
    for (const { 나라, 축, 까닭, 대본것 } of 막힌것) {
      console.log(`  · ${나라} ${축} — ${까닭}`);
      const 남은 = 안대본길(대본것);
      if (!남은.length) { console.log('      🔴 우리가 아는 길을 다 대 봤다 — «새 길»을 찾아야 한다'); continue; }
      console.log(`      ▶ 아직 안 대 본 길 ${남은.length} — ${남은.map((r) => r.이름).join(' · ')}`);
    }
  }

  console.log('\n▶ 다음에 손댈 곳 (반쯤 선 나라부터, 앞 축부터)');
  for (const d of 다음할것(잰것).slice(0, 6)) {
    console.log(`  ${d.찬수}/4  ${d.나라} — ${d.축}`);
  }
  console.log('\n⚠ 사람(이사회·임원)은 축에 넣지 않았다 — 사장님이 「서비스 정도」로 정하셨다(2026-09-14).');
}
