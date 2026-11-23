#!/usr/bin/env node
/**
 * 지역별고용조사 기혼여성 부가표 둘을 받아 저장한다.
 *   101/DT_1ES4H11J  18세 미만 자녀연령별 경력보유여성 (천명, 연간)
 *   101/DT_1ES4H07J  연령대별/사유별 경력보유여성 (천명, 연간)
 *
 *   node scripts/collect-kosis-career-interrupted.mjs
 *
 * 만드는 파일
 *   src/data/100yearmap/career-interrupted-by-child-age.json
 *   src/data/100yearmap/career-interrupted-reason-by-age.json
 *
 * 이용허락범위: KOSIS 통계정보 활용약관 제8조 — 상업적 활용 가능, 출처표시 의무.
 * ⛔ 키 값을 출력하거나 커밋하지 않는다. `.env` 는 gitignore.
 */
import fs from 'node:fs';
import path from 'node:path';
import { 오늘 } from './_kst.mjs';

const ROOT = path.resolve(
  path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1'),
  '..',
);
const KEY = fs.readFileSync(path.join(ROOT, '.env'), 'utf8').match(/^KOSIS_API_KEY=(.+)$/m)?.[1]?.trim();
if (!KEY) throw new Error('.env 에 KOSIS_API_KEY 가 없다');

async function 받기(tbl, objL2) {
  const u =
    `https://kosis.kr/openapi/Param/statisticsParameterData.do?method=getList&apiKey=${KEY}` +
    `&orgId=101&tblId=${tbl}&itmId=ALL&objL1=ALL${objL2 ? '&objL2=ALL' : ''}&format=json&jsonVD=Y` +
    `&prdSe=Y&startPrdDe=2016&endPrdDe=2026`;
  const j = JSON.parse(await (await fetch(u, { signal: AbortSignal.timeout(60000) })).text());
  if (j?.err) throw new Error(`err ${j.err} ${j.errMsg}`);
  return j;
}
const 정리 = (x) => x.replace(/\s/g, '').replace(/^-/, '');
const 해 = ['2016', '2021', '2026'];
const 저장 = (이름, 내용) =>
  fs.writeFileSync(path.join(ROOT, 'src/data/100yearmap', 이름), JSON.stringify(내용, null, 1) + '\n');
const 날 = 오늘();

/* 1 — 막내 자녀 나이별 */
const a = await 받기('DT_1ES4H11J', false);
const 값1 = {};
for (const r of a) {
  if (!해.includes(r.PRD_DE)) continue;
  ((값1[정리(r.C1_NM)] ??= {})[정리(r.ITM_NM)] ??= {})[r.PRD_DE] = Number(r.DT);
}
저장('career-interrupted-by-child-age.json', {
  만든날: 날,
  출처: {
    이름: '국가데이터처 KOSIS · 통계청 「지역별고용조사」 기혼여성 부가조사',
    표: '101/DT_1ES4H11J (18세 미만 자녀연령별 경력보유여성)',
    주소: 'https://kosis.kr/statHtml/statHtml.do?orgId=101&tblId=DT_1ES4H11J',
    이용허락범위: 'KOSIS 통계정보 활용약관 제8조 — 상업적 활용 가능',
  },
  단위: '천명',
  연도: 해,
  자녀연령: ['18세미만자녀없음', '6세이하', '7-12세', '13-17세', '계'],
  값: 값1,
});

/* 2 — 연령대·사유별 */
const b = await 받기('DT_1ES4H07J', true);
const 값2 = {};
for (const r of b) {
  if (!해.includes(r.PRD_DE) || r.ITM_ID !== 'T00') continue; // T01 은 상대표준오차(RSE)라 뺀다
  ((값2[정리(r.C1_NM)] ??= {})[정리(r.C2_NM)] ??= {})[r.PRD_DE] = Number(r.DT);
}
저장('career-interrupted-reason-by-age.json', {
  만든날: 날,
  출처: {
    이름: '국가데이터처 KOSIS · 통계청 「지역별고용조사」 기혼여성 부가조사',
    표: '101/DT_1ES4H07J (연령대별/사유별 경력보유여성)',
    주소: 'https://kosis.kr/statHtml/statHtml.do?orgId=101&tblId=DT_1ES4H07J',
    이용허락범위: 'KOSIS 통계정보 활용약관 제8조 — 상업적 활용 가능',
  },
  단위: '천명',
  연도: 해,
  연령: ['15-29세', '30-39세', '40-49세', '50-54세', '계'],
  사유: ['결혼', '임신.출산', '육아', '자녀교육', '가족돌봄'],
  값: 값2,
});
console.log('저장 끝');
