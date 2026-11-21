#!/usr/bin/env node
/**
 * collect-alimi-class-size-초중.mjs
 * **초등학교·중학교의 학급당 학생 수 · 수업교원 1인당 학생 수**를 받아 지면이 쓸 수 있게 만든다.
 *
 *   node scripts/collect-alimi-class-size-초중.mjs --급 초등
 *   node scripts/collect-alimi-class-size-초중.mjs --급 중등
 *   node scripts/collect-alimi-class-size-초중.mjs --급 초등 --dry   # 저장하지 않고 재기만
 *   node scripts/collect-alimi-class-size-초중.mjs --selftest
 *
 * ── 🔴 왜 만드나 (2026-11-18 · 5번) ─────────────────────────
 * 네이버에서 같은 지면을 두 가지 말로 물어 재었다 —
 *
 *     의정부시 고등학교            🔴 우리 0개 · 블로그 62
 *     의정부시 고등학교 «진학률»    ⭐ 우리 6개 · 블로그 48
 *     성북구 고등학교 «학급당 학생수» 🔴 우리 0개 · 블로그 23 · 카페 9   ← 가장 빈 자리
 *
 * 제목·본문에 «수치 이름»이 있어야 네이버가 든다. 고등학교는 오늘 그 말을 넣었다
 * (자료가 이미 있었고 표 이름이 「한 반 학생 수」라 그 말로 안 걸리고 있었다).
 * 초등 261장·중등 258장에는 **그 자료 자체가 없었다.** 학교알리미에 열려 있는지
 * 재 보니 초등 6,302행 · 중학 3,305행이 나왔다. 그래서 받는다.
 *
 * ── ⛔ 이 자가 지키는 것 ──────────────────────────────────
 * ⛔ **학생 0명인 학교는 빼낸다.** 0 은 「없다」가 아니라 「못 쟀다」에 가깝다
 *   (폐교 예정·신설). 지면에 「0명 · 0개 학급」이 사실처럼 나가면 안 된다.
 * ⛔ 저쪽이 준 COL_SUM·TEACH_CAL 을 쓰지 않는다 — 주간·야간을 합쳤으니 **다시 낸다.**
 * ⛔ 지역 값은 «학교별 평균의 평균»이 아니라 **학생 합 ÷ 학급 합**이다.
 *   작은 학교와 큰 학교를 같은 무게로 세면 지역 값이 틀어진다.
 * ⛔ 못 이은 학교를  몇 곳을 왜 못 이었는지 자료에 남긴다.
 * ⚠ 학교알리미 SCHUL_CODE 는 `S000003511` 꼴이고 우리 code 는 NEIS `7031110` 꼴이라
 *   **코드로는 못 잇는다**(2026-11-18 전수로 재서 0% 였다). 이름+시도로 잇는다.
 */
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import qs from 'node:querystring';
import { 알리미지역_고교지역 } from '../src/lib/region.ts';

const ROOT = path.resolve(
  path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1'),
  '..',
);

/** 학교알리미 공시항목 09 = 학년별·학급별 학생수 */
const 항목코드 = '09';
const 공시연도 = process.argv.includes('--year')
  ? process.argv[process.argv.indexOf('--year') + 1]
  : '2024';

export const 급표 = {
  초등: { 코드: '02', 파일: 'elementary', 이름: '초등학교', 낼곳: 'class-size-elementary.json' },
  중등: { 코드: '03', 파일: 'middle', 이름: '중학교', 낼곳: 'class-size-middle.json' },
};

const 한자리 = (n) => Math.round(n * 10) / 10;

/** 숫자로 바꾼다. ⛔ 빈 값·글자를 0 으로 읽지 않는다 — null 이다 */
export function 수(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(String(v).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : null;
}

/** 지역 하나의 학급당 학생 수. ⛔ 학교별 평균의 평균이 아니다 — 합을 합으로 나눈다 */
export function 지역값(줄들) {
  let 학생 = 0; let 학급 = 0; let 수업교원 = 0; let 셈 = 0;
  for (const r of 줄들) {
    if (!r || !(r.학생 > 0)) continue;
    학생 += r.학생; 학급 += r.학급 || 0; 수업교원 += r.수업교원 || 0; 셈 += 1;
  }
  return {
    학교수: 셈,
    학생,
    학급,
    수업교원,
    학급당학생: 학급 > 0 && 학생 > 0 ? 한자리(학생 / 학급) : null,
    교원1인당학생: 수업교원 > 0 && 학생 > 0 ? 한자리(학생 / 수업교원) : null,
  };
}

/** 가운데값. ⛔ 빈 목록은 null — 0 이 아니다 */
export function 중간값(arr) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const m = s.length >> 1;
  return 한자리(s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2);
}

function 자가시험() {
  const 봄 = []; const 본다 = (이름, 참) => 봄.push({ 이름, 참 });
  본다('① 수 — 쉼표를 뗀다', 수('1,234') === 1234);
  /* 🔴 빈 값을 0 으로 읽으면 「학생 0명」이 사실처럼 나간다 */
  본다('② 수 — 빈 값은 null', 수('') === null && 수(null) === null && 수(undefined) === null);
  본다('③ 수 — 글자는 null', 수('없음') === null);
  본다('④ 수 — 0 은 0 이다', 수('0') === 0);

  /* 🔴 학교별 평균의 평균이면 (30/1 + 10/1)/2 = 20 이 된다. 합으로 내면 40/2 = 20…
     그래서 무게가 다른 보기를 쓴다 — 학생 60 학급 2 와 학생 10 학급 1 */
  const v = 지역값([{ 학생: 60, 학급: 2, 수업교원: 6 }, { 학생: 10, 학급: 1, 수업교원: 2 }]);
  본다('⑤ 지역값 — 합을 합으로 나눈다', v.학급당학생 === 한자리(70 / 3));
  본다('⑥ 지역값 — 학교 수를 센다', v.학교수 === 2);
  /* ⛔ 학생 0 인 학교는 셈에서 뺀다 */
  const v2 = 지역값([{ 학생: 60, 학급: 2 }, { 학생: 0, 학급: 3 }]);
  본다('⑦ 지역값 — 학생 0 인 곳은 뺀다', v2.학교수 === 1 && v2.학급당학생 === 30);
  본다('⑧ 지역값 — 빈 목록은 null', 지역값([]).학급당학생 === null);
  본다('⑨ 지역값 — 학급이 0 이면 null (0 으로 안 채운다)',
    지역값([{ 학생: 10, 학급: 0 }]).학급당학생 === null);
  본다('⑩ 중간값 — 홀수', 중간값([1, 5, 3]) === 3);
  본다('⑪ 중간값 — 짝수', 중간값([1, 2, 3, 4]) === 2.5);
  본다('⑫ 중간값 — 빈 목록은 null', 중간값([]) === null);
  본다('⑬ 급표가 둘이다', Object.keys(급표).length === 2);

  let 깨짐 = 0;
  for (const s of 봄) if (!s.참) { console.log('🔴 ' + s.이름); 깨짐 += 1; }
  console.log(깨짐 ? '🔴 ' + 깨짐 + '가지 깨졌다' : '✅ ' + 봄.length + '가지 다 통과');
  return 깨짐 === 0;
}

if (process.argv.includes('--selftest') || process.argv.includes('--자가시험')) {
  process.exit(자가시험() ? 0 : 1);
}

const 고른급 = (() => {
  const i = process.argv.indexOf('--급');
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : null;
})();
if (!급표[고른급]) {
  console.log('🔴 --급 초등  또는  --급 중등  을 준다');
  process.exit(1);
}
const 급 = 급표[고른급];
const 시늉 = process.argv.includes('--dry');

const 오늘 = (() => {        /* 🔴 이 PC 는 이미 KST 다 — toISOString() 금지 */
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
})();

const 출처 = {
  이름: '학교알리미(한국교육학술정보원) 공개용데이터',
  공시항목: '학년별·학급별 학생수',
  공시연도,
  학교급: 급.이름,
  이용허락범위: '공공누리 제1유형(출처표시)',
  포털: 'https://www.data.go.kr/data/15014351/fileData.do',
  받은곳: 'https://www.schoolinfo.go.kr/ng/go/pnnggo_a01_l2.do',
};

function 받기(몸) {
  return new Promise((풀림) => {
    const req = https.request('https://www.schoolinfo.go.kr/openData.do', {
      method: 'POST',
      timeout: 90000,
      headers: {
        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        /* ⚠ 우리가 누구인지 밝힌다. 숨기고 긁지 않는다 */
        'user-agent': 'Mozilla/5.0 (compatible; 100yearmap/1.0; +https://100yearmap.com)',
        'content-length': Buffer.byteLength(몸),
      },
    }, (res) => {
      let 글 = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { 글 += c; });
      res.on('end', () => 풀림({ 코드: res.statusCode, 글 }));
    });
    req.on('error', (e) => 풀림({ 코드: 0, 글: String(e.message) }));
    req.on('timeout', () => { req.destroy(); 풀림({ 코드: 0, 글: '시간 초과' }); });
    req.end(몸);
  });
}

const { 코드: 상태, 글: 답 } = await 받기(
  qs.stringify({ APITYPE: 항목코드, PBANYR: 공시연도, SCHULKNDCODE: 급.코드 }),
);
if (상태 !== 200) { console.log('🔴 못 받았다 — HTTP ' + 상태); process.exit(1); }
let 목록 = [];
try { 목록 = JSON.parse(답).list ?? []; } catch (e) { 목록 = []; }
if (!목록.length) { console.log('🔴 행이 0개다 — 공시연도와 학교급 코드를 본다'); process.exit(1); }

/* ── 우리 학교에 잇는다 — ⚠ 코드는 체계가 달라 못 쓴다. 이름+시도로 잇는다 ── */
const 우리묶음 = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'src', 'data', '100yearmap', 급.파일 + '.json'), 'utf8'),
);
const 우리 = 우리묶음.자료 ?? [];
const 열쇠 = (이름, 시도) => `${String(이름 ?? '').trim()}|${시도}`;
const 우리표 = new Map(우리.map((x) => [열쇠(x.title, x.시도), x]));

/* ⚠ 저쪽 지역칸이 비면 이름으로만 잇되, **양쪽 모두에서 이름이 하나뿐일 때만** 잇는다.
   같은 이름이 둘이면 짐작해 붙이지 않는다 — 붙이면 남의 학교 숫자가 그 지면에 나간다 */
const 우리이름수 = new Map();
for (const x of 우리) 우리이름수.set(x.title, (우리이름수.get(x.title) ?? 0) + 1);
const 저쪽이름수 = new Map();
for (const r of 목록) {
  const n = String(r.SCHUL_NM ?? '').trim();
  저쪽이름수.set(n, (저쪽이름수.get(n) ?? 0) + 1);
}
const 이름만표 = new Map(우리.filter((x) => 우리이름수.get(x.title) === 1).map((x) => [x.title, x]));

const 모음 = new Map();
const 못이은것 = [];
for (const r of 목록) {
  const 시도 = 알리미지역_고교지역(r.ADRCD_NM);
  let 학교 = 시도 ? 우리표.get(열쇠(r.SCHUL_NM, 시도)) : null;
  if (!학교) {
    const n = String(r.SCHUL_NM ?? '').trim();
    if (저쪽이름수.get(n) === 1) 학교 = 이름만표.get(n) ?? null;
  }
  if (!학교) { 못이은것.push(`${r.SCHUL_NM} (${r.ADRCD_NM})`); continue; }
  const 칸 = 모음.get(학교.code) ?? { 학교, 학생: 0, 학급: 0, 수업교원: 0, 과정: [], 줄: 0 };
  칸.학생 += 수(r.COL_S_SUM) ?? 0;
  칸.학급 += 수(r.COL_C_SUM) ?? 0;
  칸.수업교원 += 수(r.TEACH_CNT) ?? 0;
  const 과 = String(r.DGHT_CRSE_SC_CODE ?? '').trim();
  if (과 && !칸.과정.includes(과)) 칸.과정.push(과);
  칸.줄 += 1;
  모음.set(학교.code, 칸);
}

const 결과 = [];
const 학생0 = [];
for (const 칸 of 모음.values()) {
  /* ⛔ 학생 0 은 「없다」가 아니라 「못 쟀다」다. 지면에 사실처럼 나가지 않게 여기서 끊는다 */
  if (칸.학생 === 0) { 학생0.push(칸.학교.title); continue; }
  결과.push({
    code: 칸.학교.code,
    표시명: 칸.학교.title,
    열쇠: 칸.학교.열쇠,
    시도: 칸.학교.시도,
    구: 칸.학교.구,
    학생: 칸.학생,
    학급: 칸.학급,
    /* ⚠ 【수업교원】 — 정규 교과목을 단독 전담해 수업하는 교원이다. 「교원수」와 다르다 */
    수업교원: 칸.수업교원,
    학급당학생: 칸.학급 > 0 ? 한자리(칸.학생 / 칸.학급) : null,
    교원1인당학생: 칸.수업교원 > 0 ? 한자리(칸.학생 / 칸.수업교원) : null,
    못냄: 칸.학급 === 0 && 칸.수업교원 === 0
      ? '학급 수와 수업교원 수가 모두 0으로 공시돼 있다'
      : 칸.학급 === 0 ? '학급 수가 0으로 공시돼 있다'
        : 칸.수업교원 === 0 ? '수업교원 수가 0으로 공시돼 있어 1인당 학생 수를 못 낸다' : undefined,
    과정: 칸.과정.length > 1 ? 칸.과정.join('·') : undefined,
  });
}

/* ── 지역별로 합친다 — ⛔ 학교별 평균의 평균이 아니라 합 ÷ 합 ── */
const 지역모음 = new Map();
for (const r of 결과) {
  if (!r.열쇠) continue;
  if (!지역모음.has(r.열쇠)) 지역모음.set(r.열쇠, []);
  지역모음.get(r.열쇠).push(r);
}
const 지역 = [...지역모음.entries()]
  .map(([열쇠, 줄들]) => ({ 열쇠, 시도: 줄들[0].시도, 구: 줄들[0].구, ...지역값(줄들) }))
  .sort((a, b) => a.열쇠.localeCompare(b.열쇠, 'ko'));

const 학급당들 = 결과.map((x) => x.학급당학생).filter((v) => v != null);
const 교원당들 = 결과.map((x) => x.교원1인당학생).filter((v) => v != null);
const 지역학급당 = 지역.map((x) => x.학급당학생).filter((v) => v != null);

const 통계 = {
  받은때: 오늘,
  저쪽행수: 목록.length,
  우리학교수: 우리.length,
  학교수: 결과.length,
  지역수: 지역.length,
  학생0이라뺌: 학생0.length,
  못이은것: 못이은것.length,
  못이은예: 못이은것.slice(0, 20),
  학급당학생_중간값: 중간값(학급당들),
  학급당학생_셈: 학급당들.length,
  교원1인당학생_중간값: 중간값(교원당들),
  교원1인당학생_셈: 교원당들.length,
  지역_학급당학생_중간값: 중간값(지역학급당),
};

console.log(`학교알리미 ${공시연도}년 「${출처.공시항목}」 — ${급.이름}`);
console.log(`  저쪽 ${목록.length}행 · 우리 ${우리.length}곳 · 이은 학교 ${결과.length}곳 · 못 이은 것 ${못이은것.length}`);
console.log(`  학급당 학생 중간값 ${통계.학급당학생_중간값}명 (${통계.학급당학생_셈}곳) · 수업교원 1인당 ${통계.교원1인당학생_중간값}명`);
console.log(`  지역 ${지역.length}곳 · 지역 학급당 학생 중간값 ${통계.지역_학급당학생_중간값}명`);
console.log(`  학생 0명이라 뺀 학교 ${학생0.length}곳 — 0 으로 채우지 않았다`);
if (못이은것.length) console.log(`  ⚠ 못 이은 예 — ${못이은것.slice(0, 5).join(' · ')}`);

if (시늉) { console.log('\n--dry 라 저장하지 않았다.'); process.exit(0); }

fs.mkdirSync(path.join(ROOT, 'archive', 'raw', 'alimi'), { recursive: true });
fs.writeFileSync(
  path.join(ROOT, 'archive', 'raw', 'alimi', `class-size-${급.파일}-${공시연도}.json`),
  JSON.stringify({ 출처, 받은때: 오늘, list: 목록 }, null, 1),
);
fs.writeFileSync(
  path.join(ROOT, 'src', 'data', '100yearmap', 급.낼곳),
  /* ⛔ 출처를 자료 «안»에 넣는다. 파일만 떨어져 나가도 출처가 따라가야 한다 */
  JSON.stringify({ 출처, 통계: { ...통계, 못이은예: undefined }, 지역, 자료: 결과 }, null, 1),
);
console.log(`\n저장했다 — src/data/100yearmap/${급.낼곳}`);
