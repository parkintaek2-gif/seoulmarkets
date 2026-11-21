#!/usr/bin/env node
/**
 * 고등학교 **학급당 학생 수 · 수업교원 1인당 학생 수**를 받아 지면이 쓸 수 있게 만든다.
 *
 *   node scripts/collect-alimi-class-size.mjs            # 받아서 저장
 *   node scripts/collect-alimi-class-size.mjs --dry      # **저장하지 않고** 재기만 한다
 *
 *   → archive/raw/alimi/class-size-<연도>.json      원자료 (gitignore)
 *   → src/data/100yearmap/school-class-size.json    빌드가 읽는 것
 *
 * ## ⭐ 왜 이 항목인가 (2026-08-07)
 *
 *   일반고 지면에 붙일 것을 찾다가 **KOSIS 334/DT_33403N_006 은 못 쓴다**는 것을 봤다.
 *   그 표의 축은 「학제및설립별」 — 전문대학·대학·대학원이다. **고교가 아니고 학교별도 아니다.**
 *
 *   ⛔ **졸업생 진로는 공개용데이터에 없다.** 8/6 에 항목 이름으로, 8/7 에 항목 코드로
 *      두 번 확인했다. 그건 에듀데이터서비스(EDSS) 신청+심사를 거쳐야 한다.
 *
 *   🟢 대신 **09 「학년별·학급별 학생수」** 가 학교별로 열려 있다. 여기 두 숫자가 있다.
 *        학급당 학생 수        — 「우리 아이 반이 몇 명인가」
 *        수업교원 1인당 학생 수 — 「선생님 한 분이 몇 명을 보는가」
 *      둘 다 학부모가 실제로 보는 값이고, **학교마다 다른 이 학교 하나의 숫자**다.
 *      학과가 없는 일반고에 붙일 수 있는 것 중 이만한 것이 없다.
 *
 * ## ⚠ 1차 훑기가 항목을 놓쳤다 — 같은 실수를 반복하지 않는다
 *
 *   코드를 `1`~`40` 으로만 훑고 「2024 에는 10개만 공시」라고 적을 뻔했다. 틀렸다.
 *   실제 코드는 **`04`·`09` 처럼 0 이 붙고, `51`~`94` 도 있다.** 다시 훑으니 **21개**였다.
 *   ⛔ 「없다」고 적기 전에 **코드 표기와 범위를 먼저 확인한다.**
 *
 * ## 칸 뜻은 산수로 확인했다 (짐작이 아니다)
 *
 *   국립국악고 — 학생 437 ÷ 수업교원 41 = 10.66  ≒  `TEACH_CAL` 10.7  ✅
 *                학생 437 ÷ 학급  15 = 29.1   =  `COL_SUM`   29.1  ✅
 *
 *   COL_S_SUM 학생수 계 · COL_C_SUM 학급수 계 · COL_SUM 학급당 학생수
 *   TEACH_CNT 수업교원수 · TEACH_CAL 수업교원 1인당 학생수
 *   ※ 【수업교원】은 정규 교과목을 단독 전담해 수업하는 교원이다(학교알리미 정의).
 *     휴직·파견까지 넣은 「교원수」와 다르다. **지면에 이 말을 그대로 적는다.**
 *
 * ## ⚠ 한 학교가 두 줄일 수 있다 — 주간·야간
 *
 *   `DGHT_CRSE_SC_CODE` 가 주간/야간이다. 그냥 첫 줄만 쓰면 야간이 통째로 빠지고,
 *   덮어쓰면 주간이 사라진다. **합친다** — 학생·학급·교원을 더하고 비율은 다시 낸다.
 *   ⛔ 저쪽이 준 `COL_SUM`·`TEACH_CAL` 을 그냥 쓰지 않는다(한 줄짜리 값이다).
 *
 * ## 이용허락범위 — **공공누리 제1유형(출처표시)**
 *
 *   15014351 학교알리미 공개용데이터 · 1유형 · 전국 — 상업 이용 ○ · 변형 ○.
 *   ⛔ 조건이 출처표시이므로 **산출물 안에 출처를 박아 넣는다.**
 *   ⛔ robots 확인함 — `User-agent: * / Allow: /`. 계정·본인확인이 필요 없다.
 *
 * ## ⚠ 인코딩 — 화면(HTML)은 EUC-KR 인데 **이 JSON 만 UTF-8** 이다
 *
 * ## ⚠ 학교 잇기 — 코드가 다르다
 *
 *   학교알리미 `S000003540` ≠ 우리(NEIS) `9010438`. **이름 + 시도**로 잇는다.
 *   ⛔ 못 이으면 **버린다.** 억지로 붙이면 남의 학교 숫자가 지면에 나간다.
 */
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import qs from 'node:querystring';
import { 알리미지역_고교지역 } from '../src/lib/region.ts';
/* 🔴 규칙은 한 곳에 있다. 여기 다시 적지 않는다 — `src/lib/school-rules.ts` */
import { 방송통신인가, 학교급코드 } from '../src/lib/school-rules.ts';

const ROOT = path.resolve(
  path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1'),
  '..',
);
const 시늉 = process.argv.includes('--dry');

/** 학교알리미 공시항목 코드. 09 = 학년별·학급별 학생수 */
const 항목코드 = '09';
const 고등학교 = '04';
const 공시연도 = process.argv.includes('--year')
  ? process.argv[process.argv.indexOf('--year') + 1]
  : '2024';

const 출처 = {
  이름: '학교알리미(한국교육학술정보원) 공개용데이터',
  공시항목: '학년별·학급별 학생수',
  공시연도,
  이용허락범위: '공공누리 제1유형(출처표시)',
  포털: 'https://www.data.go.kr/data/15014351/fileData.do',
  받은곳: 'https://www.schoolinfo.go.kr/ng/go/pnnggo_a01_l2.do',
};

function 받기(몸) {
  return new Promise((풀림, 깨짐) => {
    const req = https.request(
      'https://www.schoolinfo.go.kr/openData.do',
      {
        method: 'POST',
        timeout: 60000,
        headers: {
          'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
          /* ⚠ 우리가 누구인지 밝힌다. 숨기고 긁지 않는다 */
          'user-agent': 'Mozilla/5.0 (compatible; 100yearmap/1.0; +https://100yearmap.com)',
          'x-requested-with': 'XMLHttpRequest',
          referer: 'https://www.schoolinfo.go.kr/ng/go/pnnggo_a01_l2.do',
        },
      },
      (res) => {
        const 조각 = [];
        res.on('data', (c) => 조각.push(c));
        /* ⚠ **UTF-8 이다.** 화면은 EUC-KR 인데 이것만 다르다 */
        res.on('end', () => 풀림({ 코드: res.statusCode, 글: Buffer.concat(조각).toString('utf8') }));
      },
    );
    req.on('error', 깨짐);
    req.on('timeout', () => { req.destroy(); 깨짐(new Error('시간 초과')); });
    req.end(몸);
  });
}

const 수 = (v) => {
  if (v == null) return null;
  const s = String(v).trim();
  if (s === '' || s === '-') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};
const 한자리 = (n) => Math.round(n * 10) / 10;

/** 오늘 날짜 — 🔴 이 PC 는 이미 KST 다. `toISOString()` 은 UTC 라 새벽에 하루가 어긋난다 */
const 오늘 = (() => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
})();


/**
 * 🔴 **학교급을 하나만 받으면 안 된다** (2026-08-07 실측).
 *   `04` 만 받던 탓에 각종학교·평생학교·고등기술학교 **25곳이 통째로 비어** 있었다.
 *   코드 목록은 `src/lib/school-rules.ts` 한 곳에 있다.
 *   ⚠ 어떤 급은 「FileInfo Empty」로 온다 — 그건 오류가 아니라 **그 급에 자료가 없는 것**이다.
 *     멈추지 않고 넘어가되, **몇 급에서 몇 행을 받았는지 찍는다.** 조용히 지나가면 또 놓친다.
 */
const 급별행수 = {};
const 목록 = [];
for (const 급 of 학교급코드) {
  const { 코드: 상태, 글: 답 } = await 받기(
    qs.stringify({ APITYPE: 항목코드, PBANYR: 공시연도, SCHULKNDCODE: 급 }),
  );
  if (상태 !== 200) { 급별행수[급] = `HTTP ${상태}`; continue; }
  let 몫 = [];
  try { 몫 = JSON.parse(답).list ?? []; } catch { 몫 = []; }
  급별행수[급] = 몫.length;
  목록.push(...몫);
}
console.log('  학교급별 받은 행 —', Object.entries(급별행수).map(([k, v]) => `${k}:${v}`).join(' · '));

if (!목록.length) {
  throw new Error(
    '행이 0개다. 공시연도와 학교급 코드를 본다.',
  );
}

/* ── 우리 학교에 잇는다 ───────────────────────────────────── */
const 우리 = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'src', 'data', '100yearmap', 'pages-school.json'), 'utf8'),
);
const 열쇠 = (이름, 시도) => `${String(이름 ?? '').trim()}|${시도}`;
const 우리표 = new Map(우리.map((x) => [열쇠(x.title, x.지역), x]));

/**
 * ⚠ **저쪽 지역칸이 비어 있는 학교가 있다.** 그때만, 그리고 **이름이 양쪽 모두에서
 *   하나뿐일 때만** 이름으로 잇는다. 같은 이름이 둘씩이면 짐작해 붙이지 않는다 —
 *   붙이면 남의 학교 숫자가 그 학교 지면에 나간다.
 */
const 우리이름수 = new Map();
for (const x of 우리) 우리이름수.set(x.title, (우리이름수.get(x.title) ?? 0) + 1);
const 저쪽이름수 = new Map();
for (const r of 목록) {
  const n = String(r.SCHUL_NM ?? '').trim();
  저쪽이름수.set(n, (저쪽이름수.get(n) ?? 0) + 1);
}
const 이름만표 = new Map(
  우리.filter((x) => 우리이름수.get(x.title) === 1).map((x) => [x.title, x]),
);

/* ── 주간·야간을 합친다 ───────────────────────────────────── */
const 모음 = new Map();
const 못이은것 = [];
let 방통 = 0;

for (const r of 목록) {
  /* ⚠ 방송통신고는 우리 지면에 없는 갈래다. 못 이었다고 셈에 넣지 않는다 */
  if (방송통신인가(r.SCHUL_NM)) { 방통++; continue; }
  const 시도 = 알리미지역_고교지역(r.ADRCD_NM);
  let 학교 = 시도 ? 우리표.get(열쇠(r.SCHUL_NM, 시도)) : null;
  if (!학교 && !시도) {
    const n = String(r.SCHUL_NM ?? '').trim();
    if (저쪽이름수.get(n) === 1) 학교 = 이름만표.get(n) ?? null;
  }
  if (!학교) {
    못이은것.push(`${r.SCHUL_NM} (${r.ADRCD_NM})`);
    continue;
  }
  const 칸 = 모음.get(학교.code) ?? {
    학교, 학생: 0, 학급: 0, 수업교원: 0, 과정: [], 줄: 0,
  };
  칸.학생 += 수(r.COL_S_SUM) ?? 0;
  칸.학급 += 수(r.COL_C_SUM) ?? 0;
  칸.수업교원 += 수(r.TEACH_CNT) ?? 0;
  const 과 = String(r.DGHT_CRSE_SC_CODE ?? '').trim();
  if (과 && !칸.과정.includes(과)) 칸.과정.push(과);
  칸.줄++;
  모음.set(학교.code, 칸);
}

const 결과 = [];
const 학생0 = [];
for (const 칸 of 모음.values()) {
  /**
   * ⛔ **학생 0명인 학교는 아예 빼낸다** (2026-08-07 · 렌더해 보고 잡았다).
   *
   *   자료에 남겨 두면 지면에 「0명 · 0개 학급 · 수업교원 0명」이 **사실처럼** 나간다.
   *   0 은 여기서 「없다」가 아니라 「못 쟀다」에 가깝다 — 폐교 예정이거나 신설이라
   *   그해 학생이 안 잡힌 것이다. ****는 규칙을 화면에서 어기는 꼴이라
   *   자료 단계에서 끊는다. 몇 곳인지는 통계에 남긴다.
   */
  if (칸.학생 === 0) { 학생0.push(칸.학교.title); continue; }
  결과.push({
    code: 칸.학교.code,
    표시명: 칸.학교.title,
    학생: 칸.학생,
    학급: 칸.학급,
    /* ⚠ 【수업교원】 — 정규 교과목을 **단독 전담해 수업하는** 교원이다.
       휴직·파견까지 넣은 「교원수」와 다르다. 지면에 이 말을 그대로 적는다 */
    수업교원: 칸.수업교원,
    /* ⛔ 저쪽이 준 COL_SUM·TEACH_CAL 을 쓰지 않는다. 주간·야간을 합쳤으니 **다시 낸다** */
    학급당학생: 칸.학급 > 0 && 칸.학생 > 0 ? 한자리(칸.학생 / 칸.학급) : null,
    교원1인당학생: 칸.수업교원 > 0 && 칸.학생 > 0 ? 한자리(칸.학생 / 칸.수업교원) : null,
    /* 왜 못 냈는지 남긴다 — 지면이 「없다」가 아니라 「못 낸다」로 말하게 한다.
       ⛔  */
    못냄:
      칸.학급 === 0 && 칸.수업교원 === 0
        ? '학급 수와 수업교원 수가 모두 0으로 공시돼 있다'
        : 칸.학급 === 0
          ? '학급 수가 0으로 공시돼 있다'
          : 칸.수업교원 === 0
            ? '수업교원 수가 0으로 공시돼 있어 1인당 학생 수를 못 낸다'
            : undefined,
    과정: 칸.과정.length > 1 ? 칸.과정.join('·') : undefined,
  });
}

/* ── 전국 분포 — ⛔ 평균만 싣지 않는다. 지면이 분포를 그릴 수 있게 같이 낸다 ── */
const 중간값 = (arr) => {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const m = s.length >> 1;
  return 한자리(s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2);
};
const 학급당들 = 결과.map((x) => x.학급당학생).filter((v) => v != null);
const 교원당들 = 결과.map((x) => x.교원1인당학생).filter((v) => v != null);

const 통계 = {
  받은때: 오늘,
  출처,
  저쪽행수: 목록.length,
  방송통신고: 방통,
  학교수: 결과.length,
  /* ⛔ 뺀 것을 숨기지 않는다. 몇 곳을 왜 뺐는지 자료 안에 남긴다 */
  학생0이라뺌: 학생0.length,
  학생0이라뺀곳: 학생0,
  두줄인학교: 결과.filter((x) => x.과정).length,
  못이은것: 못이은것.length,
  못이은예: 못이은것.slice(0, 20),
  학급당학생_중간값: 중간값(학급당들),
  학급당학생_셈: 학급당들.length,
  교원1인당학생_중간값: 중간값(교원당들),
  교원1인당학생_셈: 교원당들.length,
};

console.log(`학교알리미 ${공시연도}년 「${출처.공시항목}」`);
console.log(
  `  저쪽 ${목록.length}행(방통 ${방통} 뺌) · 학교 ${결과.length}곳 · 못 이은 것 ${못이은것.length}`,
);
console.log(`  주간·야간 두 줄인 학교 ${통계.두줄인학교}곳 — 합쳐서 비율을 다시 냈다`);
console.log(
  `  학급당 학생 중간값 ${통계.학급당학생_중간값}명 (${통계.학급당학생_셈}곳) · ` +
    `수업교원 1인당 ${통계.교원1인당학생_중간값}명 (${통계.교원1인당학생_셈}곳)`,
);
console.log(
  `  학생 0명이라 뺀 학교 ${학생0.length}곳${학생0.length ? ` — ${학생0.join(' · ')}` : ''}`,
);
console.log(`  비율 못 낸 학교 ${결과.filter((x) => x.못냄).length}곳 — 0 으로 채우지 않았다`);
console.log(`  이용허락범위 ${출처.이용허락범위}`);
if (못이은것.length) console.log(`  ⚠ 못 이은 예 — ${못이은것.slice(0, 5).join(' · ')}`);

if (시늉) {
  console.log('\n--dry 라 저장하지 않았다.');
  process.exit(0);
}

fs.mkdirSync(path.join(ROOT, 'archive', 'raw', 'alimi'), { recursive: true });
fs.writeFileSync(
  path.join(ROOT, 'archive', 'raw', 'alimi', `class-size-${공시연도}.json`),
  JSON.stringify({ 출처, 받은때: 오늘, list: 목록 }, null, 1),
);
fs.mkdirSync(path.join(ROOT, 'src', 'data', '100yearmap'), { recursive: true });
fs.writeFileSync(
  path.join(ROOT, 'src', 'data', '100yearmap', 'school-class-size.json'),
  /* ⛔ 출처를 **자료 안에** 넣는다. 파일만 떨어져 나가도 출처가 따라가야 한다 */
  JSON.stringify({ 출처, 통계: { ...통계, 못이은예: undefined }, 자료: 결과 }, null, 1),
);
console.log('\n저장했다 — archive/raw/alimi · src/data/100yearmap/school-class-size.json');
