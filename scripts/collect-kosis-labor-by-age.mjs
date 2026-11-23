#!/usr/bin/env node
/**
 * 연령별 실업률·경제활동참가율(경제활동인구조사 DT_1DA7012S, 연간)과
 * 연령별 비정규직 비중(경제활동인구조사 부가조사 DT_1DE7006S, 8월)을 받아 저장한다.
 *
 *   node scripts/collect-kosis-labor-by-age.mjs        # 받아서 저장
 *
 * 만드는 파일
 *   src/data/100yearmap/unemployment-by-age.json
 *   src/data/100yearmap/participation-by-age-sex.json
 *   src/data/100yearmap/irregular-share-by-age.json
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

async function 받기(tbl, itm, l1, se, s, e) {
  const u =
    `https://kosis.kr/openapi/Param/statisticsParameterData.do?method=getList&apiKey=${KEY}` +
    `&orgId=101&tblId=${tbl}&itmId=${itm}&objL1=${l1}&objL2=ALL&format=json&jsonVD=Y` +
    `&prdSe=${se}&startPrdDe=${s}&endPrdDe=${e}`;
  const r = await fetch(u, { signal: AbortSignal.timeout(60000) });
  const j = JSON.parse(await r.text());
  if (j?.err) throw new Error(`err ${j.err} ${j.errMsg}`);
  return j;
}
const 정리 = (x) => x.replace(/\s/g, '').replace(/ㆍ/g, '');
const 저장 = (이름, 내용) =>
  fs.writeFileSync(path.join(ROOT, 'src/data/100yearmap', 이름), JSON.stringify(내용, null, 1) + '\n');

/* 1 · 2 — 실업률(T80)·경제활동참가율(T60), 연간 */
const 연령10 = ['15-19세', '20-24세', '25-29세', '30-34세', '35-39세', '40-44세', '45-49세', '50-54세', '55-59세', '60-64세', '65-69세', '70세이상'];
const 연도들 = ['2015', '2020', '2025'];
async function 연간(항목, 이름) {
  const 결과 = {};
  // 성별 코드는 표 안에서 직접 읽는다
  const 전부 = await 받기('DT_1DA7012S', 항목, 'ALL', 'Y', '2015', '2025');
  for (const r of 전부) {
    const 성 = 정리(r.C1_NM);
    const 연령 = 정리(r.C2_NM);
    if (!연도들.includes(r.PRD_DE)) continue;
    if (!(연령10.includes(연령) || 연령 === '계')) continue;
    ((결과[성] ??= {})[연령] ??= {})[r.PRD_DE] = Number(r.DT);
  }
  return 결과;
}
const 실업 = await 연간('T80', '실업률');
const 참가 = await 연간('T60', '경제활동참가율');

const 출처연간 = {
  이름: '국가데이터처 KOSIS · 통계청 「경제활동인구조사」',
  표: '101/DT_1DA7012S (성/연령별 경제활동인구, 연간)',
  주소: 'https://kosis.kr/statHtml/statHtml.do?orgId=101&tblId=DT_1DA7012S',
  이용허락범위: 'KOSIS 통계정보 활용약관 제8조 — 상업적 활용 가능',
};
const 날 = 오늘();

저장('unemployment-by-age.json', { 만든날: 날, 출처: 출처연간, 단위: '%', 연도: 연도들, 연령: 연령10, 값: 실업 });
저장('participation-by-age-sex.json', { 만든날: 날, 출처: 출처연간, 단위: '%', 연도: 연도들, 연령: 연령10, 값: 참가 });

/* 3 — 비정규직 비중, 8월 부가조사 */
const 연령6 = ['15-19세', '20-29세', '30-39세', '40-49세', '50-59세', '60세이상'];
const 월들 = ['201608', '202108', '202508', '202608'];
const 부가 = await 받기('DT_1DE7006S', 'T01+T03', 'ALL', 'M', '201608', '202608');
const 비 = {};
for (const r of 부가) {
  if (!월들.includes(r.PRD_DE)) continue;
  const 성 = 정리(r.C1_NM);
  const 연령 = 정리(r.C2_NM);
  if (!(연령6.includes(연령) || 연령 === '계')) continue;
  const 칸 = (((비[성] ??= {})[연령] ??= {})[r.PRD_DE] ??= {});
  칸[r.ITM_NM === '비정규직' ? '비정규직' : '임금근로자'] = Number(r.DT);
}
저장('irregular-share-by-age.json', {
  만든날: 날,
  출처: {
    이름: '국가데이터처 KOSIS · 통계청 「경제활동인구조사 근로형태별 부가조사」',
    표: '101/DT_1DE7006S (성/연령별 근로형태(비정규직)별 취업자, 매년 8월)',
    주소: 'https://kosis.kr/statHtml/statHtml.do?orgId=101&tblId=DT_1DE7006S',
    이용허락범위: 'KOSIS 통계정보 활용약관 제8조 — 상업적 활용 가능',
  },
  단위: '천명',
  월: 월들,
  연령: 연령6,
  값: 비,
});
console.log('저장 끝');
