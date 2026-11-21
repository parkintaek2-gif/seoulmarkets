#!/usr/bin/env node
/**
 * collect-100y-wage-distribution.mjs — 「학력별 임금 분포」를 받는다 (평균이 아니라 «갈래»).
 *
 * ── 왜 이 표를 쓰나 (2026-09-02) ──────────────────────────────
 * /wage-education(118/DT_118N_LCE0003)은 학력별 «평균» 월급여액만 보여 준다. 회사 강령
 * 「」(모토와 철학 ②)와 어긋난다 — 평균 하나로는 «중졸이하 근로자 중에도
 * 고소득자가 있는지, 대졸 중에도 저소득자가 있는지»를 못 보여 준다.
 *
 * 118/DT_PAY0011(학력연령계층임금계층(총액)성별 근로자수 및 근로시간)은 학력×임금계층별
 * **근로자 headcount**를 준다 — 이것으로 «학력마다 임금 구간별 사람 비율»을 처음 낸다.
 *
 * ⛔⛔ 이 표의 「임금」은 **총액**(급여+상여+수당 등 다 포함)이다. /wage-education의
 *   「월급여액」(정액급여=기본급+통상수당, 상여 제외)과 **다른 개념**이다. 나란히 안 놓고,
 *   다르다는 것을 지면에 못박는다(모토와 철학 규칙).
 * ⛔ 임금 구간 경계는 KOSIS 원표가 정한 것을 그대로 묶어 올린다 — 구간 폭이 고르지 않다.
 *
 * 자가시험: node scripts/collect-100y-wage-distribution.mjs --selftest
 * 실행:     node scripts/collect-100y-wage-distribution.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { 키읽기 } from './lib/kosis-probe.mjs';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 낼길 = path.join(뿌리, 'src/data/100yearmap/wage-distribution.json');

export const 학력표 = ['중졸이하', '고졸', '전문대졸', '대졸이상'];
export const 밴드표 = ['200만원 미만', '200~300만원', '300~400만원', '400~500만원', '500만원 이상'];

/** C3_NM(예: "~799.9천원", "3000.0 ~ 3499.9")의 아래 경계값(천원)을 뽑는다 */
export function 아래경계(이름) {
  if (String(이름).startsWith('~')) return 0;
  const m = String(이름).match(/^([\d.]+)/);
  return m ? Number(m[1]) : null;
}

/** 아래경계(천원)를 5개 밴드 중 하나로 묶는다 */
export function 밴드묶기(경계) {
  if (경계 == null) return null;
  if (경계 < 2000) return '200만원 미만';
  if (경계 < 3000) return '200~300만원';
  if (경계 < 4000) return '300~400만원';
  if (경계 < 5000) return '400~500만원';
  return '500만원 이상';
}

/** rows(C1=학력·C3=임금계층·DT=근로자수인 행들)에서 학력별 밴드 분포(%)를 뽑는다 */
export function 분포뽑기(rows) {
  const 결과 = {};
  for (const 학력 of 학력표) {
    const 해당 = (rows ?? []).filter((r) => r.C1_NM === 학력 && r.C3_NM !== '전체');
    const 전체 = 해당.reduce((s, r) => s + (Number.isFinite(Number(r.DT)) ? Number(r.DT) : 0), 0);
    const 밴드합 = {};
    for (const b of 밴드표) 밴드합[b] = 0;
    for (const r of 해당) {
      const b = 밴드묶기(아래경계(r.C3_NM));
      if (b) 밴드합[b] += Number(r.DT) || 0;
    }
    결과[학력] = {
      근로자수: 전체,
      비율: Object.fromEntries(밴드표.map((b) => [b, 전체 > 0 ? Math.round((밴드합[b] / 전체) * 1000) / 10 : null])),
    };
  }
  return 결과;
}

/** ⛔ 밴드 비율 합이 100%에서 크게 벗어나면(반올림 오차 밖) 자를 의심한다 */
export function 합이백인가(분포, 학력) {
  const 합 = 밴드표.reduce((s, b) => s + (분포[학력]?.비율?.[b] ?? 0), 0);
  return Math.abs(합 - 100) < 1;
}

if (process.argv.includes('--selftest')) {
  const 실패 = [];
  const 검 = (이름, 참) => { if (!참) 실패.push(이름); };

  검('물결로 시작하면 0', 아래경계('~799.9천원') === 0);
  검('숫자를 뽑는다', 아래경계('3000.0 ~ 3499.9') === 3000);
  검('2000 미만은 200만원 미만', 밴드묶기(1999) === '200만원 미만');
  검('2000은 200~300만원', 밴드묶기(2000) === '200~300만원');
  검('5000 이상은 500만원 이상', 밴드묶기(5000) === '500만원 이상');
  검('⛔ null은 안 묶는다', 밴드묶기(null) === null);

  const 표본 = [
    { C1_NM: '중졸이하', C3_NM: '~799.9천원', DT: '50' },
    { C1_NM: '중졸이하', C3_NM: '2000.0 ~ 2199.9', DT: '30' },
    { C1_NM: '중졸이하', C3_NM: '5000.0 ~ 5999.9', DT: '20' },
    { C1_NM: '중졸이하', C3_NM: '전체', DT: '100' },
  ];
  const 분포 = 분포뽑기(표본);
  검('근로자수를 더한다', 분포['중졸이하'].근로자수 === 100);
  검('⛔ "전체" 행은 밴드 합에 안 낀다(이중산입 방지)', 분포['중졸이하'].비율['200만원 미만'] === 50);
  검('500만원 이상도 잡는다', 분포['중졸이하'].비율['500만원 이상'] === 20);
  검('⭐ 밴드 비율 합은 100%다', 합이백인가(분포, '중졸이하'));
  검('⛔ 자료 없는 학력은 null', 분포뽑기([])['고졸'].근로자수 === 0);

  if (실패.length) {
    console.error(`❌ 자가시험 실패 ${실패.length}\n${실패.map((s) => `   · ${s}`).join('\n')}`);
    process.exit(1);
  }
  console.log('✅ collect-100y-wage-distribution 자가시험 통과 (11)');
  process.exit(0);
}

const 키 = 키읽기();
const url = `https://kosis.kr/openapi/Param/statisticsParameterData.do?method=getList&apiKey=${키}` +
  `&itmId=ALL&objL1=ALL&objL2=ALL&objL3=ALL&objL4=ALL&format=json&jsonVD=Y&orgId=118&tblId=DT_PAY0011&prdSe=Y&newEstPrdCnt=1`;
const 원 = await (await fetch(url)).json();
if (!Array.isArray(원)) {
  console.error(`⛔ 못 받았다 — ${JSON.stringify(원).slice(0, 200)}`);
  process.exit(1);
}
const 근로자행 = 원.filter((r) => r.C2_NM === '전체' && r.C4_NM === '전체' && r.ITM_NM === '근로자수');
const 연도 = 근로자행[0]?.PRD_DE;
const 분포 = 분포뽑기(근로자행);

for (const 학력 of 학력표) {
  if (!합이백인가(분포, 학력)) {
    console.error(`⛔ 자가대조 실패 — ${학력}의 밴드 비율 합이 100%에서 벗어났다. 받은 값을 의심한다.`);
    process.exit(1);
  }
}

const 출력 = {
  출처: {
    이름: '국가데이터처 KOSIS · 고용노동부 「고용형태별근로실태조사」',
    표: '118/DT_PAY0011 (학력연령계층임금계층(총액)성별 근로자수 및 근로시간)',
    정의: '임금 : 급여·수당·상여·기타 등 명칭 불문하고 근로의 대가로 지급된 금액(현금·현물 포함) 전부 — 총액 기준 (statisticsExplData 원문)',
    대상: '근로자 1인 이상 사업체 소속 근로자(특수형태근로종사자 포함) 약 100만 명 표본조사',
    이용허락범위: 'KOSIS 통계정보 활용약관 제8조 — 상업적 활용 가능',
  },
  받은때: '2026-09-02',
  기준연도: 연도,
  주의: '이 표의 「임금」은 상여·수당을 포함한 총액이다. /wage-education의 「월급여액」(정액급여, 상여 제외)과 다른 개념이라 나란히 놓지 않는다.',
  학력별분포: 분포,
  자가대조: {
    학력별_밴드비율합_100: 학력표.every((e) => 합이백인가(분포, e)),
  },
};

fs.writeFileSync(낼길, JSON.stringify(출력, null, 1));
console.log(`✅ ${연도}년 학력 ${학력표.length}갈래 × 밴드 ${밴드표.length}개 → ${path.relative(뿌리, 낼길)}`);
