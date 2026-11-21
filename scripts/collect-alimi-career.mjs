#!/usr/bin/env node
/**
 * 고등학교 **졸업생의 진로**(진학 · 취업 · 기타)를 받아 지면이 쓸 수 있게 만든다.
 *
 *   node scripts/collect-alimi-career.mjs            # 받아서 저장
 *   node scripts/collect-alimi-career.mjs --dry      # **저장하지 않고** 재기만 한다
 *
 *   → archive/raw/alimi/career-<연도>.json        원자료 (gitignore)
 *   → src/data/100yearmap/school-career.json      빌드가 읽는 것
 *
 * ## 🔴 이 파일은 **제가 두 번 틀린 것을 바로잡은 것**이다 (2026-08-07)
 *
 *   8/6 · 8/7 두 번 「졸업생 진로는 공개용데이터에 없다. EDSS 신청이 필요하다」고
 *   결론 내고 **문서·메모·지면 2,369장에 그렇게 적었다. 틀렸다.**
 *   항목 **52 「졸업생의 진로 현황」**이 계정도 신청도 없이 열려 있다.
 *
 *   ⛔ 두 번 다 원인이 같다 — **항목 목록을 뽑는 내 자가 불완전했다.**
 *     ① 코드를 `1`~`40` 으로만 훑었다 → `51`~`94` 를 통째로 못 봤다
 *     ② 화면에서 `value=` 로 이름을 긁었다 → 52 가 안 잡혔다(목록 37개로 셌다)
 *     ③ 제대로 `JG_HANGMOK_CD` 로 짝지으니 **55개**였고 그 안에 52 가 있었다
 *   ⭐ **「없다」는 결론은 「있다」보다 검증이 더 필요하다.** 없다고 적기 전에
 *     내가 어떻게 훑었는지를 먼저 의심한다.
 *
 * ## 칸 뜻 — 공식 설명문과 산수 **양쪽으로** 맞췄다
 *
 *   학교알리미 정의(고등학교) — `졸업자 = 진학자(등록자) + 취업자 + 기타`
 *                              `진학자 = 전문대학 + 대학교 + 국외진학`
 *
 *     TOTAL2 졸업자 · TOTAL3 전문대학 · TOTAL4 대학교 · TOTAL7 취업자 · TOTAL8 기타
 *     TOT_SUM 진학자 계 · OUT_TOT_SUM 국외진학 · MAN_n · WOMAN_n 은 같은 칸의 남·여
 *     ⚠ 여기 별표 뒤에 슬래시를 쓰지 않는다 — `MAN*` 와 `/` 가 붙으면 주석이 닫힌다(실제로 겪었다)
 *
 * ### 🔴 국외진학 칸은 **자리가 고정돼 있지 않다** — 인덱스를 믿으면 안 된다
 *
 *   같은 표 안에서 학교마다 `TOTAL5` 에도 `TOTAL6` 에도 들어간다(실측 14건 대 251건).
 *   처음에 `TOTAL5` 로 못 박았더니 **269곳에서 합이 안 맞았다.**
 *   ⛔ 그래서 이름 있는 칸 `OUT_TOT_SUM` 을 쓴다. 그러면 `3+4+국외 = TOT_SUM` 이
 *     **2,076행 전부** 맞는다.
 *
 * ### 🔴 **취업과 기타는 갈라서 싣지 않는다** — 칸이 자리를 옮긴다
 *
 *   `TOTAL7`·`TOTAL8` 도 국외처럼 **행마다 자리가 바뀐다.** 렌더해 보고 잡았다.
 *
 *   ```
 *   분당중앙고  졸 216 · 진학 109 · TOTAL7 107 · TOTAL8 0    → 7 을 취업으로 읽으면 「취업 49.5%」
 *   서울사대부고 졸 224 · 진학 165 · TOTAL7 0   · TOTAL8 59   → 8 이 나머지를 다 갖는다
 *   ```
 *
 *   둘 다 강남·분당 일반고다. 「취업 49.5%」는 있을 수 없다. **나머지가 통째로 한 칸에
 *   들어가는데 그 칸이 7 이기도 8 이기도 하다.** 일반고 1,350곳 중 831곳이 `TOTAL7=0` 이다.
 *
 *   ⚠ 총합만 보면 안 걸린다 — 전국 `TOTAL7` 1.7% · `TOTAL8` 20.1% 로 오히려 그럴듯하다.
 *     **총합이 맞아도 개별이 틀릴 수 있다.** 그래서 학교 하나를 눈으로 봐야 한다.
 *
 *   ⛔ 그래서 취업률을 **내지 않는다.** 「진학」과 「그 밖」으로만 가른다.
 *     `그 밖 = 졸업자 − 진학` 이라 자리와 무관하게 항상 맞는다.
 *     ⚠ 「그 밖」에는 취업·재수·미상이 섞여 있다. **그 말을 지면에 적는다.**
 *
 * ### 반대로 전문대학·대학교 칸은 **안정적이다** (실측)
 *
 *   전국 전문대학 14.4% · 대학교 63.9% · 국외 0.2% — 실제 분포와 맞는다.
 *   일반고 1,337곳 중 전문대>대학인 곳은 **10곳(0.7%)** 뿐이다. 뒤집힌 칸이 아니다.
 *
 *   ⛔ 그래도 **학교마다 다시 검산한다.** 안 맞으면 비율을 내지 않고 이유를 남긴다.
 *
 * ## ⚠ 이 표에 **직업계고는 거의 없다** — 빠뜨린 것이 아니다
 *
 *   항목 09 에는 특성화고가 487곳인데 항목 52 에는 **4곳**뿐이다.
 *   직업계고 졸업자 진로는 **별도 조사**(직업계고 졸업자 취업통계 · KOSIS 920024)로 간다.
 *   우리는 그것을 이미 `/work` 지면에 쓰고 있다. **갈래가 다른 것이지 어긋난 것이 아니다.**
 *
 * ## ⚠ 특수학교·각종학교·방송통신고는 우리 갈래가 아니다
 *
 *   이 표에는 그것들이 197행 섞여 있다(`HS_KND_SC_NM` 이 비어 있다).
 *   우리 지면에 없는 학교라 **「못 이었다」 셈에 넣지 않는다** — 넣으면 못 이은 수가
 *   192 로 부풀어 「많이 놓쳤다」로 보인다. 갈래를 갈라 세는 것이 정직하다.
 *
 * ## ⚠ 이 취업률은 직업계고 유지취업률과 **다른 자다**
 *
 *   여기 【취업자】는 「1개월 근로 60시간 이상 + 소득」이다(정규·비정규·자영업 포함).
 *   `/work` 지면의 직업계고 유지취업률은 재는 자가 다르다. **빼서 견주면 안 된다.**
 *   그 말을 지면에 적는다.
 *
 * ## ⚠ 「기타」를 「논다」로 읽으면 안 된다
 *
 *   설명문상 「진학에 속하지 않는 경우 등」이다. **재수생이 여기 들어간다.**
 *   일반고에서 기타가 큰 것은 대개 재수다. 그 말을 안 붙이면 지면이 학교를 때린다.
 *
 * ## 이용허락범위 — **공공누리 제1유형(출처표시)** · 계정·신청 없음 · robots Allow
 */
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import qs from 'node:querystring';
import { 알리미지역_고교지역 } from '../src/lib/region.ts';
/* 🔴 규칙은 한 곳에 있다. 여기 다시 적지 않는다 — `src/lib/school-rules.ts` */
import { 최소분모, 방송통신인가, 우리갈래인가, 학교급코드 } from '../src/lib/school-rules.ts';

const ROOT = path.resolve(
  path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1'),
  '..',
);
const 시늉 = process.argv.includes('--dry');

/** 학교알리미 공시항목 코드. 52 = 졸업생의 진로 현황 */
const 항목코드 = '52';
const 고등학교 = '04';
const 공시연도 = process.argv.includes('--year')
  ? process.argv[process.argv.indexOf('--year') + 1]
  : '2024';

const 출처 = {
  이름: '학교알리미(한국교육학술정보원) 공개용데이터',
  공시항목: '졸업생의 진로 현황',
  공시연도,
  이용허락범위: '공공누리 제1유형(출처표시)',
  포털: 'https://www.data.go.kr/data/15014351/fileData.do',
  받은곳: 'https://www.schoolinfo.go.kr/ng/go/pnnggo_a01_l2.do',
  취업자정의: '1개월 근로시간 60시간 이상이고 그에 대한 소득이 있는 학생 (정규직·비정규직·자영업 포함)',
  진학자정의: '진학하여 해당 학교에 등록한 학생 (1학생 1학교 등록 원칙)',
};

function 받기(몸) {
  return new Promise((풀림, 깨짐) => {
    const req = https.request(
      'https://www.schoolinfo.go.kr/openData.do',
      {
        method: 'POST',
        timeout: 90000,
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
const 영 = (v) => 수(v) ?? 0;
const 한자리 = (n) => Math.round(n * 10) / 10;

/** 🔴 이 PC 는 이미 KST 다. `toISOString()` 은 UTC 라 새벽에 하루가 어긋난다 */
const 오늘 = (() => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
})();

/**
 * 🔴 **졸업자가 적으면 비율을 내지 않는다** — 전 사이트 규칙(2026-08-06).
 *   30명이면 한 사람이 3.3%p 다. 그 아래로는 한 사람이 전국 중간값과의 차이보다 크게 흔든다.
 *   ⚠ 이 값은 `collect-alimi-dropout.mjs` 의 `최소재학생`, `check-100yearmap-launch.mjs` 의
 *     `작은분모` 와 **같은 뜻**이다. 하나를 바꾸면 셋을 같이 본다.
 */
const 최소졸업자 = 최소분모;


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
  throw new Error('행이 0개다. 공시연도와 학교급 코드를 본다.');
}

/* ── 우리 학교에 잇는다 ───────────────────────────────────── */
const 우리 = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'src', 'data', '100yearmap', 'pages-school.json'), 'utf8'),
);
const 열쇠 = (이름, 시도) => `${String(이름 ?? '').trim()}|${시도}`;
const 우리표 = new Map(우리.map((x) => [열쇠(x.title, x.지역), x]));

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

/* ── 주간·야간이 따로 나오면 합친다 ───────────────────────── */
const 모음 = new Map();
const 못이은것 = [];
let 방통 = 0;
let 우리갈래아님 = 0;

for (const r of 목록) {
  if (방송통신인가(r.SCHUL_NM)) { 방통++; continue; }
  /* ⚠ 특수학교·각종학교는 `HS_KND_SC_NM` 이 비어 있다. 우리 지면에 없는 갈래라
     못 이었다고 세지 않는다 — 세면 못 이은 수가 192 로 부풀어 잘못 읽힌다 */
  if (!우리갈래인가(r.HS_KND_SC_NM)) { 우리갈래아님++; continue; }
  const 시도 = 알리미지역_고교지역(r.ADRCD_NM);
  let 학교 = 시도 ? 우리표.get(열쇠(r.SCHUL_NM, 시도)) : null;
  if (!학교 && !시도) {
    const n = String(r.SCHUL_NM ?? '').trim();
    if (저쪽이름수.get(n) === 1) 학교 = 이름만표.get(n) ?? null;
  }
  if (!학교) { 못이은것.push(`${r.SCHUL_NM} (${r.ADRCD_NM})`); continue; }

  const 칸 = 모음.get(학교.code) ?? {
    학교, 졸업자: 0, 전문대학: 0, 대학교: 0, 국외: 0, 진학계: 0, 취업: 0, 기타: 0,
    남졸업자: 0, 여졸업자: 0, 과정: [], 줄: 0, 갈래: r.HS_KND_SC_NM ?? null,
  };
  칸.줄++;
  칸.졸업자 += 영(r.TOTAL2);
  칸.전문대학 += 영(r.TOTAL3);
  칸.대학교 += 영(r.TOTAL4);
  /* 🔴 국외는 `TOTAL5`·`TOTAL6` 를 오가므로 **이름 있는 칸**을 쓴다 */
  칸.국외 += 영(r.OUT_TOT_SUM);
  칸.진학계 += 영(r.TOT_SUM);
  칸.취업 += 영(r.TOTAL7);
  칸.기타 += 영(r.TOTAL8);
  칸.남졸업자 += 영(r.MAN2);
  칸.여졸업자 += 영(r.WOMAN2);
  const 과 = String(r.DGHT_CRSE_SC_CODE ?? '').trim();
  if (과 && !칸.과정.includes(과)) 칸.과정.push(과);
  모음.set(학교.code, 칸);
}

/* ── 검산하고 담는다 ─────────────────────────────────────── */
const 결과 = [];
const 안맞음 = [];
const 졸업자0 = [];

for (const 칸 of 모음.values()) {
  /* ⛔ 졸업자 0 은 지면에 「0명」이 사실처럼 나간다. 빼낸다 — **** */
  if (칸.졸업자 === 0) { 졸업자0.push(칸.학교.title); continue; }

  const 진학 = 칸.전문대학 + 칸.대학교 + 칸.국외;
  /* 🔴 취업·기타 칸은 자리가 흔들린다(위 주석). **합쳐서만 쓴다.**
     `그 밖 = 졸업자 − 진학` 은 자리와 무관하게 항상 맞는다 */
  const 그밖 = 칸.졸업자 - 진학;
  /* 🔴 **학교마다 두 가지를 검산한다.** 칸 뜻이 내 짐작이면 여기서 터진다.
       ① 전문대학 + 대학교 + 국외 = 저쪽이 준 진학 계
       ② 진학 + 취업 + 기타 = 졸업자 */
  const 맞나 = 진학 === 칸.진학계 && 진학 + 칸.취업 + 칸.기타 === 칸.졸업자;
  if (!맞나) {
    안맞음.push(
      `${칸.학교.title}(${칸.줄}줄): 졸업 ${칸.졸업자} · 진학 ${진학}(저쪽 ${칸.진학계})` +
        ` + 취업 ${칸.취업} + 기타 ${칸.기타}`,
    );
  }
  const 비율 = (n) =>
    맞나 && 칸.졸업자 >= 최소졸업자 ? 한자리((n / 칸.졸업자) * 100) : null;

  결과.push({
    code: 칸.학교.code,
    표시명: 칸.학교.title,
    졸업자: 칸.졸업자,
    진학: 진학,
    전문대학: 칸.전문대학,
    대학교: 칸.대학교,
    국외: 칸.국외,
    그밖: 그밖,
    /* ⚠ 원자료 값은 기록으로만 남긴다. **지면은 이 둘을 쓰지 않는다** — 자리가 흔들린다.
       지우지 않는 이유: 나중에 이름표 붙은 화면을 얻으면 여기서 다시 가를 수 있다 */
    원자료_TOTAL7: 칸.취업,
    원자료_TOTAL8: 칸.기타,
    남졸업자: 칸.남졸업자 || null,
    여졸업자: 칸.여졸업자 || null,
    갈래: 칸.갈래,
    /* ⛔ 비율은 우리가 낸 값이다. 검산이 안 맞거나 졸업자가 적으면 **내지 않는다** */
    진학률: 비율(진학),
    그밖율: 비율(그밖),
    비율못냄: !맞나
      ? '공시된 항목의 합이 졸업자 수와 맞지 않는다'
      : 칸.졸업자 < 최소졸업자
        ? `졸업자가 ${칸.졸업자}명이라 비율이 뜻을 잃는다`
        : undefined,
    과정: 칸.과정.length > 1 ? 칸.과정.join('·') : undefined,
  });
}

const 중간값 = (arr) => {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const m = s.length >> 1;
  return 한자리(s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2);
};
const 진학률들 = 결과.map((x) => x.진학률).filter((v) => v != null);
const 그밖율들 = 결과.map((x) => x.그밖율).filter((v) => v != null);

/**
 * 🔴 사장님 지시(2026-08-15) — 「판단 장치는 추측이 아니라 <데이터, 검증된 과학기술, 학술적 근거>」
 * ⭐ 5번(8/15): 「③은 «인용이 있나»가 아니라 «그 방법의 **알려진 한계**가 적혀 있나»로 잰다」
 *   ⇒ 자료 안에 **어떻게 셌나(②)** 와 **무엇을 못 보여 주나(③)** 를 함께 넣는다.
 *     파일만 떨어져 나가도 «읽는 법»이 따라가야 한다. 출처를 넣는 것과 같은 까닭이다.
 */
const 셈과한계 = {
  '② 어떻게 셌나': {
    진학률: '진학 ÷ 졸업자 × 100 (학교마다)',
    지역값: '학교별 값의 **가운데값**(median)',
    '왜 가운데값인가':
      '졸업자가 30명인 학교와 400명인 학교가 섞여 있다. 평균을 내면 큰 학교가 지역을 대표해 버린다',
  },
  '③ 무엇을 못 보여 주나': [
    '**학교가 한 표**다 — 사람 수로 가중하지 않았다. 「그 지역 학생의 진학률」이 아니라 「그 지역 학교들의 가운데」다',
    '「그 밖」에 재수·취업·미상이 **한 칸에 뭉쳐** 있다. 나눌 수 없다',
    '특성화고 일부는 이 공시에 진학 칸이 없다 — 빼면 그 지역 학교 수가 달라진다',
    '가운데값은 **퍼짐을 안 보여 준다**. 지면에는 퍼짐을 먼저 놓는다',
    '최소분모 30 미만인 지역은 값을 내지 않는다',
  ],
};

const 통계 = {
  받은때: 오늘,
  출처,
  셈과한계,
  저쪽행수: 목록.length,
  방송통신고: 방통,
  /* 특수학교·각종학교 — 우리 지면에 없는 갈래라 「못 이었다」에 안 넣는다 */
  우리갈래아님: 우리갈래아님,
  학교수: 결과.length,
  졸업자0이라뺌: 졸업자0.length,
  못이은것: 못이은것.length,
  못이은예: 못이은것.slice(0, 20),
  검산안맞음: 안맞음.length,
  검산안맞은예: 안맞음.slice(0, 10),
  비율낸학교: 진학률들.length,
  진학률_중간값: 중간값(진학률들),
  그밖율_중간값: 중간값(그밖율들),
  전국졸업자: 결과.reduce((a, x) => a + x.졸업자, 0),
  전국진학: 결과.reduce((a, x) => a + x.진학, 0),
  전국그밖: 결과.reduce((a, x) => a + x.그밖, 0),
};

console.log(`학교알리미 ${공시연도}년 「${출처.공시항목}」`);
console.log(
  `  저쪽 ${목록.length}행 (방통 ${방통} · 특수/각종 ${우리갈래아님} 뺌)` +
    ` · 학교 ${결과.length}곳 · 못 이은 것 ${못이은것.length}`,
);
console.log(`  졸업자 0이라 뺀 곳 ${졸업자0.length}`);
console.log(
  `  🔴 검산 — 진학+취업+기타 ≠ 졸업자 인 학교 ${안맞음.length}곳` +
    (안맞음.length ? ` → ${안맞음.slice(0, 3).join(' / ')}` : ' (전부 맞는다)'),
);
console.log(
  `  중간값 — 진학률 ${통계.진학률_중간값}% · 그 밖 ${통계.그밖율_중간값}%` +
    ` (비율 낸 학교 ${진학률들.length}곳)`,
);
console.log(
  `  전국 합 — 졸업 ${통계.전국졸업자.toLocaleString()} = 진학 ${통계.전국진학.toLocaleString()}` +
    ` + 그 밖 ${통계.전국그밖.toLocaleString()}`,
);
console.log(`  이용허락범위 ${출처.이용허락범위}`);
if (못이은것.length) console.log(`  ⚠ 못 이은 예 — ${못이은것.slice(0, 5).join(' · ')}`);

if (시늉) {
  console.log('\n--dry 라 저장하지 않았다.');
  process.exit(0);
}

fs.mkdirSync(path.join(ROOT, 'archive', 'raw', 'alimi'), { recursive: true });
fs.writeFileSync(
  path.join(ROOT, 'archive', 'raw', 'alimi', `career-${공시연도}.json`),
  JSON.stringify({ 출처, 받은때: 오늘, list: 목록 }, null, 1),
);
fs.mkdirSync(path.join(ROOT, 'src', 'data', '100yearmap'), { recursive: true });
fs.writeFileSync(
  path.join(ROOT, 'src', 'data', '100yearmap', 'school-career.json'),
  /* ⛔ 출처를 **자료 안에** 넣는다. 파일만 떨어져 나가도 출처가 따라가야 한다 */
  JSON.stringify(
    { 출처, 통계: { ...통계, 못이은예: undefined, 검산안맞은예: undefined }, 자료: 결과 },
    null,
    1,
  ),
);
console.log('\n저장했다 — archive/raw/alimi · src/data/100yearmap/school-career.json');
