/**
 * build-100y-middle.mjs — **중학교 3,328곳**을 자료로 만든다.
 *
 *   node scripts/build-100y-middle.mjs --자가시험
 *   node scripts/build-100y-middle.mjs
 *
 * 낼 것: `src/data/100yearmap/middle.json`
 *
 * ## 🔴 왜 — **지역 이름이 제목에 든 페이지가 다섯 배를 번다**
 *
 *   [2026-11-17 실측] 백년지도의 묶음별 「한 장이 버는 사람」(28일)
 *   ```
 *   /report/area/  고등학교 지역 258장   12.16명   ← 지역 이름이 제목에 든 것
 *   그 밖           942장                2.26명
 *   ```
 *   한국어 사이트의 손님은 거의 전부 네이버에서 온다(백년지도 2,829명 / 3,102명).
 *   그리고 네이버에서 우리가 자리를 잡은 질문은 **블로그가 안 다루는 공공데이터 질문**이었다.
 *   초등을 냈으니 중등을 내면 초·중·고가 갖춰진다. 한 구에 세 장이 서로를 가리킨다.
 *
 * ## ⭐ 중학교에만 있는 축 — **남중 · 여중**
 *
 *   ```
 *   남녀공학 2,684곳 · 남 334곳 · 여 310곳
 *   ```
 *   「우리 구에 여중이 있나」는 부모가 실제로 묻는 질문이고,
 *   블로그 글보다 **공공데이터가 답하기 좋은** 질문이다. 초등에는 이 축이 사실상 없다.
 *   ⛔ 어느 쪽이 낫다고 쓰지 않는다. **몇 곳인지만 적는다.**
 *
 * ## ⛔ 이 자는 **페이지를 만들지 않는다.** 자료까지다
 *
 * ## ⚠ 이 자가 조심하는 것 (초등 빌더에서 겪은 것을 그대로 가져왔다)
 *
 *   ```
 *   🔴 원자료 첫 글자에 BOM 이 붙어 있다. 안 떼면 JSON.parse 가 죽는다
 *   🔴 top-level 이 배열이 아니다. 배열인 칸을 찾아 쓴다
 *   ⚠ 시도 이름에 괄호가 붙어 온다 — 「전남광주통합특별시(광주)」
 *   ⛔ 재외한국학교는 뺀다. 우리 지역 축에 자리가 없다
 *   ⛔ 아직 문 안 연 학교를 뺀다 — 「(가칭)○○중학교」 페이지가 생긴다
 *   ⚠ 설립일은 NEIS 값이다. 「몇 년째」로 안 쓰고 「1908년 설립」으로 쓴다
 *   ⛔ 오래된 것을 「명문」·「전통」으로 읽히게 쓰지 않는다. 햇수는 햇수다
 *   ```
 *
 * ⛔ 읽기·시도씻기·설립연을 여기에 **베끼지 않는다** — `lib/neis-school.mjs` 에서 불러다 쓴다.
 * ⛔ 초등 «빌더»에서 들여오지 않는다 — 들여오는 것만으로 그 본문이 돌아 자료를 덮어쓴다.
 *   두 벌을 두면 원자료 꼴이 바뀔 때 한쪽만 고쳐진다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { 지역가르기, 한벌최소 } from '../src/lib/school-area.ts';
import { 읽기, 시도씻기, 설립연, 올해 } from './lib/neis-school.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1'), '..');
const 원자료 = path.join(ROOT, 'archive', 'raw', 'neis', 'school-info.json');
const 낼길 = path.join(ROOT, 'src', 'data', '100yearmap', 'middle.json');

/** 남중·여중·남녀공학을 한 낱말로. ⛔ 어느 쪽이 낫다고 쓰지 않는다 */
export function 공학갈래(s) {
  const v = String(s ?? '').trim();
  if (v === '남') return '남중';
  if (v === '여') return '여중';
  if (v === '남여공학' || v === '남녀공학') return '남녀공학';
  return null;   /* ⛔ 모르는 값을 남녀공학으로 밀어 넣지 않는다 */
}

if (process.argv.includes('--자가시험')) {
  let 통과 = 0, 실패 = 0;
  const 본다 = (이름, 됐나) => { if (됐나) 통과 += 1; else { 실패 += 1; console.error('  ⛔ ' + 이름); } };

  본다('① 남중을 읽는다', 공학갈래('남') === '남중');
  본다('② 여중을 읽는다', 공학갈래('여') === '여중');
  본다('③ NEIS 표기(남여공학)를 읽는다', 공학갈래('남여공학') === '남녀공학');
  본다('④ 바른 표기(남녀공학)도 읽는다', 공학갈래('남녀공학') === '남녀공학');
  /* 🔴 모르는 값을 남녀공학으로 밀어 넣으면 남중·여중 수가 조용히 줄어든다 */
  본다('⑤ 모르는 값은 null — 공학으로 밀지 않는다', 공학갈래('?') === null && 공학갈래('') === null && 공학갈래(null) === null);
  본다('⑥ lib 의 자를 그대로 쓴다 (BOM)', 읽기('﻿[{"a":1}]').length === 1);
  본다('⑦ lib 의 자를 그대로 쓴다 (시도 괄호)', 시도씻기('전남광주통합특별시(광주)') === '전남광주통합특별시');
  본다('⑧ lib 의 자를 그대로 쓴다 (설립연)', 설립연({ FOND_YMD: '19860129' }) === 1986);
  본다('⑨ 올해가 초등과 같다', 올해 === 2026);
  본다('⑩ 원자료가 있다', fs.existsSync(원자료));

  console.log(실패 ? `\n⛔ ${실패}개 틀렸다 (통과 ${통과})` : `✅ 자가시험 ${통과}개 통과`);
  process.exit(실패 ? 1 : 0);
}

const 모두 = 읽기(fs.readFileSync(원자료, 'utf8'));
/* ⛔ 「각종학교(중)」·「방송통신중학교」를 섞지 않는다 — 부모가 찾는 중학교가 아니다.
   섞으면 구마다 곳수가 부풀고, 그 수로 적은 제목이 사실과 달라진다. */
const 중 = 모두.filter((x) => x.SCHUL_KND_SC_NM === '중학교');

const 곳들 = [];
let 재외 = 0, 주소없음 = 0, 지역못가름 = 0;
const 아직안엶 = [];
for (const x of 중) {
  const 시도 = 시도씻기(x.LCTN_SC_NM);
  if (시도 === '재외한국학교') { 재외 += 1; continue; }
  const 연 = 설립연(x);
  if (!String(x.SD_SCHUL_CODE ?? '').trim() || (연 != null && 연 > 올해)) {
    아직안엶.push({ title: x.SCHUL_NM, 설립연: 연, 시도 });
    continue;
  }
  const 주소 = x.ORG_RDNMA ?? null;
  if (!주소) { 주소없음 += 1; continue; }
  /** ⚠ 구·군은 고등·초등과 **같은 자**로 가른다. 두 벌을 두면 같은 구가 둘이 된다 */
  const g = 지역가르기(주소);
  if (!g) { 지역못가름 += 1; continue; }
  곳들.push({
    code: String(x.SD_SCHUL_CODE),
    title: x.SCHUL_NM,
    titleEn: x.ENG_SCHUL_NM ?? null,
    시도: g.시도,
    구: g.이름,
    열쇠: g.열쇠,
    설립: x.FOND_SC_NM ?? null,
    공학: 공학갈래(x.COEDU_SC_NM),
    설립연: 연,
    주소,
    홈페이지: x.HMPG_ADRES ?? null,
  });
}

const 백년넘은곳 = 곳들.filter((x) => x.설립연 != null && 올해 - x.설립연 >= 100)
  .sort((a, b) => a.설립연 - b.설립연);

const 지역별 = new Map();
for (const x of 곳들) {
  if (!지역별.has(x.열쇠)) {
    지역별.set(x.열쇠, { 열쇠: x.열쇠, 시도: x.시도, 구: x.구, 곳: 0, 백년: 0, 남중: 0, 여중: 0, 공학: 0 });
  }
  const a = 지역별.get(x.열쇠);
  a.곳 += 1;
  if (x.설립연 != null && 올해 - x.설립연 >= 100) a.백년 += 1;
  if (x.공학 === '남중') a.남중 += 1;
  else if (x.공학 === '여중') a.여중 += 1;
  else if (x.공학 === '남녀공학') a.공학 += 1;
}
const 단위 = [...지역별.values()].sort((a, b) => b.곳 - a.곳);
const 한벌될곳 = 단위.filter((a) => a.곳 >= 한벌최소);

/** ⛔ 같은 코드가 둘이면 페이지 하나가 다른 페이지를 덮는다. 겹치면 안 낸다 */
const 코드들 = new Set(곳들.map((x) => x.code));
if (코드들.size !== 곳들.length) {
  console.log(`⛔ 학교 코드가 겹친다 — ${곳들.length}곳에 코드는 ${코드들.size}개. 파일을 내지 않는다.`);
  process.exit(1);
}

fs.writeFileSync(낼길, JSON.stringify({
  이름: '중학교 — NEIS 교육정보 개방 포털',
  '⚠ 설립일': 'NEIS 값이다. 학교가 스스로 세는 개교기념일과 다를 수 있어 「몇 년째」로 쓰지 않고 「1908년 설립」으로 쓴다',
  '⛔ 안 쓰는 말': '명문 · 전통 · 순위 · 몇 위 · 좋은 학교 · 나쁜 학교 · 남녀공학이 낫다 · 남중이 낫다',
  '⚠ 여기에 없는 것': '학업성취 · 고교 진학 결과 — 중학교는 그 공시가 없다. 있는 것은 **문 연 날과 자리, 그리고 남중·여중·공학**이다',
  '⛔ 섞지 않은 것': '각종학교(중) 38곳 · 방송통신중학교 24곳 — 부모가 찾는 중학교가 아니다',
  올해,
  전체: 중.length,
  낸곳: 곳들.length,
  뺀것: { 재외한국학교: 재외, 주소없음, 지역못가름, 아직안엶: 아직안엶.length },
  '⛔ 아직 문 안 연 곳': { 왜: '설립일이 올해보다 뒤다. 페이지를 만들면 「(가칭)○○중학교」가 생긴다', 곳: 아직안엶 },
  백년넘은곳수: 백년넘은곳.length,
  가장오래된: 백년넘은곳.slice(0, 10).map((x) => ({ 설립연: x.설립연, title: x.title, 시도: x.시도, 구: x.구 })),
  남중수: 곳들.filter((x) => x.공학 === '남중').length,
  여중수: 곳들.filter((x) => x.공학 === '여중').length,
  공학수: 곳들.filter((x) => x.공학 === '남녀공학').length,
  '⚠ 공학 모름': 곳들.filter((x) => x.공학 == null).length,
  지역수: 단위.length,
  한벌될곳수: 한벌될곳.length,
  한벌최소,
  지역: 단위,
  자료: 곳들,
}, null, 1), 'utf8');

console.log('✅ ' + path.relative(ROOT, 낼길));
console.log(`   중학교 ${중.length.toLocaleString()}곳 중 **${곳들.length.toLocaleString()}곳**을 냈다`);
console.log(`   뺀 것 — 재외 ${재외} · 주소 없음 ${주소없음} · 지역 못 가름 ${지역못가름} · 아직 문 안 엶 ${아직안엶.length}`);
console.log(`   남중 ${곳들.filter((x) => x.공학 === '남중').length} · 여중 ${곳들.filter((x) => x.공학 === '여중').length}`
  + ` · 남녀공학 ${곳들.filter((x) => x.공학 === '남녀공학').length} · 모름 ${곳들.filter((x) => x.공학 == null).length}`);
console.log(`   ⭐ 문 연 지 100년이 넘은 곳 **${백년넘은곳.length.toLocaleString()}곳** · 가장 이른 곳 ${백년넘은곳[0]?.title} ${백년넘은곳[0]?.설립연}년`);
console.log(`   지역 ${단위.length}곳 · 한 벌이 될 만한 곳(${한벌최소}곳 이상) **${한벌될곳.length}곳**`);
console.log('⛔ 페이지는 만들지 않았다. 자료까지다.');
