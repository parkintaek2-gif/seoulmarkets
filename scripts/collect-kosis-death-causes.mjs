#!/usr/bin/env node
/**
 * collect-kosis-death-causes.mjs — **나이대별 사망원인 순위를 받는다.** (5번, 2026-09-23)
 *
 * ── 🔴 왜 (사장님이 자료를 직접 주셨다, 2026-09-22 21:4x) ──────────────
 * 사장님이 「2025년 사망원인통계 결과」(국가데이터처, 2026-09-22 발표) 기사를 통째로
 * 주시며 백년지도로 내라고 하셨다. 기사가 든 수 —
 *   사망원인 1위 암 24.9% · 2~10위 심장질환 9.3% … 간 질환 2.1%
 *   자살 사망자 14,872 → 14,144명(-4.9%) · 사망률 29.1 → 27.8(-4.7%)
 *   OECD 연령표준화 자살률 평균 10.9 vs 한국 24.9 — 1위(2위 리투아니아 18.1)
 *   나이대별 자살률이 대부분 줄었다 (20대 22.5→20.8 … 80세 이상 53.3→52.6)
 *
 * ⛔ **기사 수를 베끼지 않는다.** 그것은 «길잡이»이고, 우리가 내는 수는 원표에서 받은 것이어야 한다.
 *   회사 원칙 — 「남의 완성된 표를 받아 쓰지 않는다. 받아 쓰면 우리 방식대로 못 쪼갠다」.
 *   ⭐ 실제로 KOSIS 에 2025년 값이 «이미» 들어와 있었다(2026-09-23 실측). 기다릴 것이 없었다.
 *
 * ── ⭐ 왜 하필 이 표인가 ───────────────────────────────────────────────
 * `DT_1B34E20` **연령대별 사망원인 순위** — 백년지도의 나이 축(`/100y/age`)에 그대로 맞는다.
 * 사장님 모토 그대로다 — 「0~100세까지」·「너무 많은 고민들을 안고 사는 게 사람이지」.
 * 기사는 «자살률 하나»를 말하지만, 이 표는 **나이대마다 무엇으로 죽는지 차례대로** 준다.
 * 스무 살과 예순 살은 다른 것을 걱정해야 한다 — 그 사실을 나이 축이 보여 준다.
 *
 * ── ⛔ 이 자가 지키는 것 ────────────────────────────────────────────────
 * ⛔ **열쇠 값을 화면·로그·커밋 어디에도 찍지 않는다.**
 * ⛔ **못 받은 칸을 ** null 로 두고 지면이 「—」로 그린다.
 * ⛔ 라이선스 — KOSIS 제8조① 상업적 활용 가능 · 제7조① 출처표시 «의무».
 *   출처를 안 적으면 약관 위반이다. 지면에 반드시 적는다.
 * ⚠ 이 통계는 **자살을 다룬다.** 지면에는 상담 전화를 반드시 붙인다
 *   (자살예방 상담전화 109 · 정신건강 상담 1577-0199). 수집기는 그 사실을 자료에 적어 둔다.
 *
 * ⚠ [2026-09-23] 처음에 src/data/ 에 뒀다가 커밋 관문이 잡았다 — 그 폴더는 «서울마켓츠» 자리다.
 *   백년지도 자료는 src/data/100yearmap/ 에 둔다. 한 작업트리를 여섯이 쓰므로
 *   자료가 어느 사이트 것인지는 «폴더»로 갈린다. 관문이 그것을 지킨다.
 *
 * 쓰는 법
 *   node scripts/collect-kosis-death-causes.mjs --자가시험
 *   node scripts/collect-kosis-death-causes.mjs            받아서 src/data 에 적는다
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(fileURLToPath(import.meta.url), '..', '..');

/** 받을 표 — ⛔ 표 번호를 짐작하지 않았다. KOSIS 통계목록(F_27)에서 찾아 골랐다 */
export const 표들 = [
  { id: 'DT_1B34E20', 이름: '연령대별 사망원인 순위', 영문: 'Leading causes of death by age group' },
];

/** 나이대 이름을 차례로 세우는 자 — 「0세」·「1-9세」·「80세 이상」이 섞여 온다 */
export function 나이차례(이름) {
  const t = String(이름 ?? '').trim();
  if (!t) return 9999;
  if (/^계$|^전체$/.test(t)) return -1;              /* 「계」는 맨 앞 */
  const m = t.match(/(\d+)/);
  return m ? Number(m[1]) : 9998;
}

/** 순위 「1위」 → 1. ⛔ 못 읽으면 null — 0 으로 떨어뜨리지 않는다 */
export function 순위수(이름) {
  const m = String(이름 ?? '').match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

/** 수 읽기 — 「-」·「…」·빈칸은 «못 쟀다»(null)다. 0 과 다르다 */
export function 수읽기(v) {
  if (v == null) return null;
  const t = String(v).trim().replace(/,/g, '');
  if (!t || /^[-–—.…]+$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/**
 * KOSIS 가 준 낱줄들을 **나이대 × 순위** 로 접는다.
 * 한 줄이 「사망원인」·「사망자수」·「사망률」 가운데 하나씩만 담아 오므로 셋을 합쳐야 한 칸이 된다.
 */
export function 접기(줄들) {
  const 통 = new Map();
  for (const r of 줄들 ?? []) {
    const 해 = String(r.PRD_DE ?? '').trim();
    const 성 = String(r.C1_NM ?? '').trim();
    const 나이 = String(r.C2_NM ?? '').trim();
    const 순위 = 순위수(r.C3_NM);
    if (!해 || !나이 || 순위 == null) continue;
    const 열쇠 = `${해}|${성}|${나이}|${순위}`;
    if (!통.has(열쇠)) {
      통.set(열쇠, {
        해: Number(해), 성, 나이, 나이영문: r.C2_NM_ENG ?? null, 순위,
        사망원인: null, 사망원인영문: null, 사망자수: null, 사망률: null,
      });
    }
    const 칸 = 통.get(열쇠);
    const 항 = String(r.ITM_NM ?? '').trim();
    if (/사망원인/.test(항)) { 칸.사망원인 = String(r.DT ?? '').trim() || null; 칸.사망원인영문 = r.DT_ENG ?? null; }
    else if (/사망자수/.test(항)) 칸.사망자수 = 수읽기(r.DT);
    else if (/사망률/.test(항)) 칸.사망률 = 수읽기(r.DT);
  }
  return [...통.values()].sort((a, b) => (b.해 - a.해)
    || (나이차례(a.나이) - 나이차례(b.나이)) || (a.순위 - b.순위));
}

/** 두 해를 맞대어 «무엇이 올라오고 무엇이 내려갔나» — 남들이 안 세는 축이다 */
export function 해맞대기(칸들, 앞해, 뒷해) {
  const 뽑기 = (해) => new Map((칸들 ?? []).filter((x) => x.해 === 해 && x.성 === '계')
    .map((x) => [`${x.나이}|${x.순위}`, x]));
  const 앞 = 뽑기(앞해);
  const 뒤 = 뽑기(뒷해);
  const 것 = [];
  for (const [열쇠, b] of 뒤) {
    const a = 앞.get(열쇠);
    if (!a || !b.사망원인) continue;
    것.push({
      나이: b.나이, 순위: b.순위,
      앞원인: a.사망원인, 뒷원인: b.사망원인,
      바뀌었나: a.사망원인 !== b.사망원인,
      앞사망률: a.사망률, 뒷사망률: b.사망률,
      사망률차: a.사망률 != null && b.사망률 != null ? b.사망률 - a.사망률 : null,
    });
  }
  return 것.sort((x, y) => (나이차례(x.나이) - 나이차례(y.나이)) || (x.순위 - y.순위));
}

/* ── 자가시험 ─────────────────────────────────────────────── */
if (process.argv.includes('--자가시험')) {
  const 잰다 = [];
  const 본다 = (이름, v) => 잰다.push([이름, !!v]);

  본다('「계」가 맨 앞', 나이차례('계') === -1);
  본다('0세가 1-9세보다 앞', 나이차례('0세') < 나이차례('1-9세'));
  본다('20대가 60대보다 앞', 나이차례('20-29세') < 나이차례('60-69세'));
  본다('80세 이상이 뒤쪽', 나이차례('80세 이상') > 나이차례('70-79세'));
  본다('⛔ 빈 것은 맨 뒤', 나이차례('') === 9999 && 나이차례(null) === 9999);

  본다('순위를 읽는다', 순위수('1위') === 1 && 순위수('10위') === 10);
  본다('⛔ 못 읽으면 null — 0 으로 떨어뜨리지 않는다', 순위수('없음') === null && 순위수(null) === null);

  본다('수를 읽는다', 수읽기('14,144') === 14144 && 수읽기('27.8') === 27.8);
  본다('0 은 0 이다', 수읽기('0') === 0);
  본다('🔴 「-」는 «못 쟀다»(null)다 — 0 이 아니다', 수읽기('-') === null);
  본다('⛔ 빈칸도 null', 수읽기('') === null && 수읽기(null) === null && 수읽기('  ') === null);
  본다('⛔ 말이 안 되는 값은 null', 수읽기('알수없음') === null);

  /* 접기 — 세 줄(원인·사망자수·사망률)이 한 칸으로 합쳐지나 */
  const 낱줄 = [
    { PRD_DE: '2025', C1_NM: '계', C2_NM: '0세', C3_NM: '1위', ITM_NM: '사망원인', DT: '출생전후기에 기원한 특정 병태' },
    { PRD_DE: '2025', C1_NM: '계', C2_NM: '0세', C3_NM: '1위', ITM_NM: '사망자수(명)', DT: '255' },
    { PRD_DE: '2025', C1_NM: '계', C2_NM: '0세', C3_NM: '1위', ITM_NM: '사망률(십만명당)', DT: '104.6' },
    { PRD_DE: '2024', C1_NM: '계', C2_NM: '0세', C3_NM: '1위', ITM_NM: '사망률(십만명당)', DT: '110.6' },
    { PRD_DE: '2024', C1_NM: '계', C2_NM: '0세', C3_NM: '1위', ITM_NM: '사망원인', DT: '출생전후기에 기원한 특정 병태' },
  ];
  const 칸 = 접기(낱줄);
  본다('세 줄이 한 칸으로 합쳐진다', 칸.length === 2);
  const 이천이십오 = 칸.find((x) => x.해 === 2025);
  본다('원인·사망자수·사망률이 한 칸에 있다',
    이천이십오.사망원인 === '출생전후기에 기원한 특정 병태'
    && 이천이십오.사망자수 === 255 && 이천이십오.사망률 === 104.6);
  본다('새 해가 앞에 선다', 칸[0].해 === 2025);
  본다('⛔ 순위를 못 읽는 줄은 버린다',
    접기([{ PRD_DE: '2025', C2_NM: '0세', C3_NM: '없음', ITM_NM: '사망원인', DT: 'x' }]).length === 0);
  본다('⛔ 빈 것에 안 터진다', 접기(null).length === 0 && 접기([]).length === 0);

  const 맞댐 = 해맞대기(칸, 2024, 2025);
  본다('두 해를 맞댄다', 맞댐.length === 1);
  본다('안 바뀐 것을 안 바뀌었다고 한다', 맞댐[0].바뀌었나 === false);
  본다('사망률 차를 셈한다', Math.abs(맞댐[0].사망률차 - (104.6 - 110.6)) < 1e-9);
  본다('⛔ 빈 것에 안 터진다 — 해맞대기', 해맞대기(null, 2024, 2025).length === 0);

  본다('받을 표가 적혀 있다', 표들.length >= 1 && /^DT_/.test(표들[0].id));

  /* ⛔ 열쇠가 소스에 박혀 있지 않나 */
  const 내글 = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8');
  본다('⛔ 열쇠를 소스에 적지 않았다', !/apiKey=[A-Za-z0-9]{10}/.test(내글));

  const 진 = 잰다.filter(([, v]) => !v);
  for (const [이름, v] of 잰다) console.log(`${v ? '✅' : '🔴'} ${이름}`);
  console.log(진.length ? `\n🔴 ${진.length}/${잰다.length} 떨어졌다` : `\n✅ 자가시험 ${잰다.length} 통과`);
  process.exit(진.length ? 1 : 0);
}

/* ── 실제로 받는다 ────────────────────────────────────────── */
const 열쇠 = fs.readFileSync(path.join(뿌리, '.env'), 'utf8').match(/^KOSIS_API_KEY=(.+)$/m)?.[1]?.trim();
if (!열쇠) { console.error('🔴 .env 에 KOSIS_API_KEY 가 없다'); process.exit(1); }

const 받을해수 = Number(process.argv.find((a) => a.startsWith('--해수='))?.split('=')[1]) || 3;

const 모은것 = [];
for (const 표 of 표들) {
  const 주소 = `https://kosis.kr/openapi/Param/statisticsParameterData.do?method=getList&apiKey=${열쇠}`
    + `&orgId=101&tblId=${표.id}&itmId=ALL&objL1=ALL&objL2=ALL&objL3=ALL`
    + `&format=json&jsonVD=Y&prdSe=Y&newEstPrdCnt=${받을해수}`;
  const r = await fetch(주소);
  const 글 = await r.text();
  let 줄;
  try { 줄 = JSON.parse(글); } catch {
    console.error(`🔴 ${표.id} — 답을 못 읽었다 (앞 200자): ${글.slice(0, 200)}`);
    continue;
  }
  if (!Array.isArray(줄)) {
    console.error(`🔴 ${표.id} — 줄이 아니다: ${JSON.stringify(줄).slice(0, 200)}`);
    continue;
  }
  console.log(`■ ${표.id} ${표.이름} — 낱줄 ${줄.length}`);
  모은것.push({ 표, 낱줄: 줄 });

  /* 원본을 그대로 쌓아 둔다 — 소급이 안 되는 자료는 아니지만, 개정되면 옛 값이 사라진다 */
  const 방 = path.join(뿌리, 'archive', 'raw', 'kosis-death-causes');
  fs.mkdirSync(방, { recursive: true });
  fs.writeFileSync(path.join(방, `${표.id}-${new Date().toLocaleDateString('sv-SE')}.json`),
    JSON.stringify(줄), 'utf8');
}

if (!모은것.length) { console.error('🔴 하나도 못 받았다 — 아무것도 안 쓴다'); process.exit(1); }

const 칸들 = 접기(모은것[0].낱줄);
const 해들 = [...new Set(칸들.map((x) => x.해))].sort((a, b) => b - a);
const 맞댐 = 해들.length >= 2 ? 해맞대기(칸들, 해들[1], 해들[0]) : [];

const 낼것 = {
  _메모: {
    무엇: '연령대별 사망원인 순위 (KOSIS DT_1B34E20)',
    출처: 'KOSIS 국가통계포털(국가데이터처, 사망원인통계)',
    출처표기: `출처: KOSIS 국가통계포털(국가데이터처, 사망원인통계), ${new Date().toLocaleDateString('ko-KR')}`,
    라이선스: 'KOSIS 통계정보 활용약관 제8조① 상업적 활용 가능 · 제7조① 출처표시 의무',
    잰날: new Date().toLocaleString('ko-KR'),
    해: 해들,
    '⚠ 자살을 다루는 자료다':
      '이 자료를 쓰는 지면에는 상담 전화를 반드시 함께 낸다 — 자살예방 상담전화 109 · 정신건강 상담 1577-0199.',
    /* 🔴 [2026-09-23] check-100y-basis 가 잡았다 — 「…률」 칸이 있는데 분모를 안 적었다.
       비율을 내면서 «무엇으로 나눈 것인지»를 안 적으면 읽는 사람이 제 마음대로 읽는다. */
    '사망률의 분모': '그 해 그 나이대 인구 10만 명. 곧 「인구 10만 명당 몇 명이 그 원인으로 숨졌나」다. '
      + '나이대마다 사람 수가 달라서, 나이대끼리 견줄 때는 사망자수가 아니라 이 값으로 견준다.',
    '사망자수의 단위': '명. 그 해 그 나이대에서 그 원인으로 숨진 사람 수다.',
    '⛔ 못 잰 칸': '사망자수·사망률이 null 인 칸은 «못 쟀다»는 뜻이다. 0 으로 읽지 않는다.',
  },
  칸들,
  해맞대기: 맞댐,
};

const 낼곳 = path.join(뿌리, 'src', 'data', '100yearmap', 'death-causes-by-age.json');
fs.writeFileSync(낼곳, JSON.stringify(낼것, null, 1), 'utf8');
console.log(`✅ 적었다 — ${path.relative(뿌리, 낼곳)}`);
console.log(`   해 ${해들.join(' · ')} · 칸 ${칸들.length} · 맞댄 것 ${맞댐.length}`);
const 바뀐것 = 맞댐.filter((x) => x.바뀌었나);
console.log(`   ⭐ 두 해 사이에 «순위가 바뀐» 자리 ${바뀐것.length}곳`);
