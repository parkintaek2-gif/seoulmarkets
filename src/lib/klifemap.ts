/**
 * 백년지도 → KLifeMap 으로 넘어가는 **입구 한 곳**.
 *
 * 사장님 지시(2026-08-07) — *「유입은 한 방향이다. 백년지도가 끌어서 KLifeMap 고객이 되게 한다」*
 *
 * ## 🔴 주소를 여기 한 곳에만 둔다
 *
 *   지면 여러 장에 주소를 흩어 놓으면, 도착지가 바뀔 때 **일부만 고쳐져 조용히 어긋난다.**
 *   `/work` 의 이름을 주소에 안 박아 둔 덕에 글자만 갈아 끼웠던 것과 같은 이치다.
 *
 * ## ⚠ 도착지 상태 — **2026-08-10 08:4x 에 다시 쟀다**
 *
 *   ```
 *                        8/07 에 본 것        지금 (내가 다시 잼)
 *   /psychometrics.html  ⛔ 열자마자 로그인    ⛔ **그대로다** (아래 🔴)
 *   /content             열려 있다(329편)     ✅ 200 · 벽 없음
 *   /mansecalendar.html  열려 있다            ✅ 200 · 벽 없음 — 학부모에게 뜬금없는 건 그대로
 *   /career.html         404                 🔴 **아직 404**
 *   /child.html          404                 🔴 **아직 404**
 *   /child-career.html   (그때는 없었다)       ✅ 200 · 벽 없음  ← 지금 아이 쪽이 가는 자리
 *   /ilzin.html          (안 봤다)            ✅ 200 · 벽 없음  ← 지금 어른 쪽이 가는 자리
 *   ```
 *
 *   ## 🔴 **HTTP 200 이 「열린다」가 아니다** — 이걸로 갈렸다
 *
 *   1번이 23:4x 에 *「/psychometrics.html 은 이제 그냥 열립니다」*라고 알려 왔다.
 *   ⛔ **200 은 맞는데 열리지는 않는다.** 그 지면 안에 이 줄이 있다 —
 *
 *   ```js
 *   const token = localStorage.getItem('bj_auth_token');
 *   if (!token) { location.href = 'login.html?next=psychometrics.html'; return; }
 *   ```
 *
 *   ⚠ 껍데기는 200 으로 오고 **자바스크립트가 로그인으로 튕긴다.**
 *     로그인해 둔 창에서 보면 멀쩡히 열려서, 재는 사람이 로그인돼 있으면 못 본다.
 *   ⭐ 그래서 도착지를 잴 때는 **글자 안에 `login` 으로 튕기는 줄이 있나**까지 본다.
 *
 *   🔴 **도착지가 로그인 화면이면 거기서 다 나간다.** 링크를 거는 뜻이 없어진다.
 *
 * ## ⚠ 배너가 아니다
 *
 *   2번 지시 — *「배너를 붙이지 마십시오. 그 지면에서 이어지는 **다음 물음**으로 적습니다」*
 *   그래서 이 자리는 **광고 문구가 아니라 질문**이고, 우리 지면에서 이어지는 자리에 놓는다.
 */
export type 입구 = {
  /** 링크를 걸 수 있는 상태인가. `false` 면 지면은 물음만 적고 링크를 걸지 않는다 */
  준비됨: boolean;
  /** 도착지. `준비됨` 이 false 면 쓰지 않는다 */
  주소: string | null;
  /** 링크에 보일 글자 */
  이름: string;
  /** 왜 그리로 가는지 — 한 줄 */
  설명: string;
};

export const KLIFEMAP_적성: 입구 = {
  /**
   * ✅ **2026-08-07 19:4x 에 열렸다.** 1번이 배포했고, 나도 직접 재고 걸었다.
   *
   *   ```
   *   /child-career.html   200 · 8,092자
   *   로그인 벽 없음 · 결제 강요 없음 · 「겁주지 않습니다」 있음
   *   ```
   *
   *   ⚠ 처음 잰 것은 「로그인 있다」였는데 **셸 따옴표를 거치며 정규식이 어긋난 것**이었다.
   *     파일로 다시 재니 없었다. 🔴 **한글·정규식을 셸 문자열로 시험하지 않는다.**
   */
  준비됨: true,
  주소: 'https://klifemap.ai/child-career.html',
  이름: '우리 아이한테 이 길이 맞을까',
  설명: '같은 곳에서 만드는 KLifeMap 이 아이의 타고난 결을 봅니다',
};

/**
 * ⭐ **어른이 가는 문** (2026-08-09 21:2x · 2번 지시).
 *
 *   ## 🔴 왜 갈랐나 — **4,966장이 전부 「우리 아이」로 가고 있었다**
 *
 *   04:1x 에 문을 세다가 알았다. 딱지는 열일곱 갈래로 갈려 있는데 **도착지가 한 곳**이었다 —
 *   `/age/32`(서른둘) 에서 간 사람도, `/university/…` 에서 간 사람도 **아이 이야기**를 봤다.
 *   ⛔ 서른둘 손님에게 아이 화면을 보이면 거기서 나간다. 1번이 적은 「사람 0명」이 여기서 만들어진다.
 *
 *   ## 재 본 것 — ⛔ 로그인 화면으로는 안 보낸다
 *
 *   ```
 *   ✅ /ilzin.html          200 · 19,037자 · 로그인 흔적 없음   ← 여기로 보낸다
 *   ✅ /child-career.html   200 ·  7,775자 · 로그인 흔적 없음   ← 아이 쪽은 그대로
 *   ⛔ /saju.html · /mingli-*  로그인 벽 (2번이 잼)
 *   ```
 *   ⚠ 2번이 여섯 장을 재서 골라 주셨고, **나도 두 장을 직접 다시 쟀다.**
 */
export const KLIFEMAP_어른: 입구 = {
  준비됨: true,
  주소: 'https://klifemap.ai/ilzin.html',
  이름: '오늘 내 흐름은 어떤가',
  설명: '같은 곳에서 만드는 KLifeMap 이 날마다의 결을 봅니다',
};

/**
 * 🔴 **어른 쪽으로 보낼 갈래** (2번이 정한 셋).
 *   ⛔ 여기 없는 갈래는 그대로 아이 쪽으로 간다 — 학교·학과는 학부모가 보는 자리다.
 *   ⚠ 갈래를 늘릴 때는 **도착지를 먼저 재고** 늘린다. 로그인 벽이면 안 넣는다.
 *
 * ⭐ 2026-08-23 — 생애단계 지면 열여섯 곳을 더했다(도착지 `ilzin.html` 200·로그인 벽
 *   없음 재확인 후). 0~9세 대상 지면(breakfast·kindergarten·nursery·pediatrics·
 *   afterschool·elementary)은 **일부러 안 넣는다** — 그 지면 손님은 아이 이야기를 보러
 *   온 것이라 지금 기본 도착지(적성)가 이미 맞다. 태그만 `기타`에서 벗어나면 된다.
 */
export const 어른갈래: ReadonlySet<string> = new Set([
  'age', 'university', 'work', 'life', 'how-long', 'size',
  'pets', 'travel', 'promotion', 'exercise', 'hiking', 'golf', 'workout', 'cycling', 'swimming', 'soccer', 'parental-leave', 'oneperson', 'lifelong', 'retire-income', 'polytech', 'pension', 'training-card',
  'marriage-age', 'home', 'spending', 'healthy-years', 'years-left', 'real-wage', 'idle-youth', 'wealth-gap', 'youth-budget-2027', 'nonmarital-birth', 'korea-japan-youth', 'ranking-university', 'ranking-university-founding', 'ranking-university-region', 'ranking-university-level', 'ranking-stock-wealth', 'ranking-apartment-value', 'ranking-hagwon', 'ranking-medical-quota', 'ranking-lawmaker-wealth', 'ranking-kbo-salary', 'ranking-apartment-brand', 'ranking-convenience-brand', 'ranking-tax-delinquent', 'ranking-good-company', 'ranking-vleague-salary', 'ranking-university-nature-index', 'ranking-university-brand', 'ranking-city-brand', 'ranking-sangjo-brand', 'rankings', 'ranking-chicken-brand', 'ranking-coffee-brand', 'ranking-bakery-brand', 'ranking-hairsalon-brand', 'ranking-pizza-brand', 'ranking-petsupply-brand', 'ranking-eyewear-brand', 'ranking-juniorcollege-brand', 'ranking-cosmetics-brand', 'ranking-insurance-agency-brand', 'ranking-usedcar-brand', 'ranking-capital-brand', 'ranking-developer-brand', 'nps-cap-region', 'nps-cap-size', 'sandwich-generation', 'school-type-gap', 'ranking-university-global', 'oecd-elderly-poverty',
  /* [2026-09-30 · 1번] oecd-tertiary-employment-gap 이 8/23 표에 없어 «기타»로 빠지고 있었다(2번이 9/29 신설,
     등록을 놓침) — 같이 잡는다. oecd-employment-wage-gap-by-degree 는 오늘 그 짝으로 새로 낸 지면. */
  'oecd-tertiary-employment-gap', 'oecd-employment-wage-gap-by-degree', 'happiness-ranking', 'salary-ranking', 'mental-health', 'senior-doctor', 'high-value-home-age', 'wage-education', 'wage-distribution', 'divorce-age', 'remarriage', 'multicultural-marriage', 'birth-sex-ratio', 'fertility-rate',
  'keep-working', 'longest-job', 'care', 'ages', 'community', 'first-job',
  'qual-duration', 'qual-age',
  /* [2026-09-24 · 1번] nps-cap-size 와 같은 결(국민연금 자료 직접 집계, 학원·아동체육기관) */
  'academy-lifespan', 'kids-activity-lifespan',
  /* [2026-09-25 · 1번] 같은 결 — 동네 가게 여섯 업종(수의업·당구장·세탁업 등) 사업장 수명 */
  'neighborhood-shop-lifespan',
  /* 🔴 2026-09-10 3번 신설 — wage-education·wage-distribution과 같은 결(임금 비교) */
  'industry-region-cross', 'industry-size-cross',
  /* 🔴 2026-09-10 3번 신설 — 같은 원자료의 이직 추정치를 공식 통계와 대조(판정 없음) */
  'turnover-cross-check',
  /* 🔴 2026-09-10 3번 신설 — 고용24 RIASEC(상업이용 불가)의 대체, O*NET(CC BY 4.0) */
  'onet-riasec',
  /* 🔴 2026-09-10 3번 신설 — 질병관리청 국민건강영양조사, 나이대별 건강검진 수진율(자기응답) */
  'health-checkup-rate',
  /* 🔴 2026-09-11 3번 신설 — 사장님 지시. 학생자살 사망사안 보고서(한겨레 인용) */
  'student-warning-signs',
  /* 🔴 2026-09-12 3번 신설 — 국회미래연구원 한국인의 행복조사, 나이대별(5번이 자료 준비) */
  'happiness-by-age',
  /* 🔴 2026-09-12 3번 신설 — 국회미래연구원 1인가구 증가 대응 방안(3번이 직접 수집) */
  'oneperson-vulnerability',
  /* 🔴 2026-09-14 3번 신설 — 사장님이 직접 전달하신 열린재정 국세 표 vs 실질임금 실측 */
  'tax-vs-wage',
  /* 🔴 2026-09-14 3번 신설 — 국회미래연구원 인구위기와 축소사회 대응 I.총론(3번이 직접 수집) */
  'military-age-men',
  /* 🔴 2026-09-14 3번 신설 — 국회예산정책처 인구위기와 축소사회 대응 II.노동시장(3번이 직접 수집) */
  'labor-market-2072',
  /* 🔴 2026-09-14 3번 신설 — 국회예산정책처 인구위기와 축소사회 대응 III.지방행정재정체제(3번이 직접 수집) */
  'population-decline-regions',
  /* 🔴 2026-09-14 3번 신설 — region-axis.json(8번 8/8~10 수집) 재활용 — A7 지침에 지면 없다던 것 */
  'region-pay-raw-vs-adjusted',
  /* 🔴 2026-09-14 3번 신설 — industry-axis.json(8번 8/8~10 수집) 재활용 — 지면 없던 업종 축 */
  'industry-pay-turnover',
  /* 🔴 2026-09-14 3번 신설 — industry-region-cells.json 재활용, 업종별로 묶은 지역 몰림 */
  'industry-region-concentration',
  /* 🔴 2026-09-14 3번 신설 — school-class-size.json 재활용, 학급당 학생수 전국 분포 */
  'class-size-distribution',
  /* 🔴 2026-09-15 3번 신설 — 국가데이터처 KOSIS 국민이전계정, 생애주기적자(3번이 직접 수집) */
  'lifecycle-deficit',
  /* 🔴 2026-09-15 3번 신설 — 국가데이터처 KOSIS 국민이전계정, 연령재배분(공공이전) */
  'public-transfers-by-age',
  /* 🔴 2026-09-15 3번 신설 — 국가데이터처 KOSIS 가계금융복지조사, 연령별 소득분배지표 */
  'income-inequality-by-age',
  /* 🔴 2026-09-15 3번 신설 — 국가데이터처 KOSIS 가계금융복지조사, 연령별 순자산(wealth-gap 짝) */
  'networth-lifecycle', 'culture-attendance',
  /* [2026-10-02 · 1번] 사장님 지시(5번 경유) — 고령자 돈·일 축. retire-income·keep-working과 같은 결 */
  'elderly-money-gap', 'elderly-work-reason',
]);

/**
 * 🔴 2026-08-23 — **반대 방향(100yearmap → KLifeMap) 물음을 지면 갈래마다 다르게 짓는다.**
 *
 *   4번이 KLifeMap 대운 카드마다("30대→marriage-age") 그 나이대에 맞는 구체적인 물음을
 *   지어 걸었다(`saju.html` 의 `나이대다리` 표). 그런데 이쪽(100yearmap → KLifeMap)은
 *   여전히 지면과 상관없이 「오늘 내 흐름은 어떤가」 한 마디뿐이었다 — 다리가 한쪽만
 *   구체적인 것이다. 4번의 8구간과 짝이 맞는 지면부터 같은 결로 짓는다.
 *
 * ⛔ 여기 없는 갈래(pets·travel·home 처럼 특정 나이·시기와 안 묶이는 것)는 그대로
 *   `KLIFEMAP_어른` 기본 문구를 쓴다 — 억지로 짓지 않는다.
 */
const 어른갈래별물음: Partial<Record<string, { 이름: string; 설명: string }>> = {
  'first-job': { 이름: '이 시기 내 대운은 어떻게 보나', 설명: '첫 일자리를 찾는 이 시기, 사주로는 어떻게 읽히는지 봅니다' },
  'marriage-age': { 이름: '결혼을 생각하는 이 시기, 내 대운은', 설명: '통계 옆에 사주 대운도 나란히 봅니다' },
  promotion: { 이름: '승진을 앞둔 이 시기, 내 대운은', 설명: '통계 옆에 사주 대운도 나란히 봅니다' },
  'longest-job': { 이름: '일을 그만두는 이 시기, 내 대운은', 설명: '통계 옆에 사주 대운도 나란히 봅니다' },
  'retire-income': { 이름: '은퇴를 앞둔 이 시기, 내 대운은', 설명: '통계 옆에 사주 대운도 나란히 봅니다' },
  'keep-working': { 이름: '은퇴 후에도 일할 대운이 있는가', 설명: '통계 옆에 사주 대운도 나란히 봅니다' },
  oneperson: { 이름: '혼자 사는 이 시기, 내 대운은', 설명: '통계 옆에 사주 대운도 나란히 봅니다' },
  lifelong: { 이름: '지금 배우기 좋은 대운인가', 설명: '통계 옆에 사주 대운도 나란히 봅니다' },
  exercise: { 이름: '지금 몸을 움직이기 좋은 대운인가', 설명: '통계 옆에 사주 대운도 나란히 봅니다' },
  'elderly-work-reason': { 이름: '은퇴 후에도 일할 대운이 있는가', 설명: '통계 옆에 사주 대운도 나란히 봅니다' },
  'elderly-money-gap': { 이름: '노후 재물운은 어떻게 흐르는가', 설명: '통계 옆에 사주 대운도 나란히 봅니다' },
};

/** 갈래에 맞는 문을 고른다. ⛔ 한 곳으로 몰지 않는다 */
export function 입구고르기(경로?: string | null): 입구 {
  const 갈래 = 갈래고르기(경로);
  if (!어른갈래.has(갈래)) return KLIFEMAP_적성;
  const 물음 = 어른갈래별물음[갈래];
  return 물음 ? { ...KLIFEMAP_어른, 이름: 물음.이름, 설명: 물음.설명 } : KLIFEMAP_어른;
}

/** 같은 곳에서 만드는 다른 사이트라는 것을 밝힌다. ⛔ 남의 서비스인 척하지 않는다 */
export const KLIFEMAP_밝힘 = '같은 곳에서 만드는 KLifeMap';

/**
 * 넘어온 사람이 **백년지도에서 왔다는 것**을 도착지가 알 수 있게 표를 붙인다.
 *
 * 왜 (2026-08-07 23:0x · 사장님 말씀)
 * ─────────────────────────────────────────────────────────────────────
 * 값을 정하면서 내가 「백년지도에서 넘어온 손님에게 29,000 은 셀 것이다」라고 **짐작**했다.
 * 사장님이 되물으셨다 — **「백년지도에서 넘어오는지 아는 법을 만들면 되는 거 아니야?」**
 * 맞다. 재면 될 것을 짐작으로 물었다.
 *
 * ⛔ 사람을 따라다니지 않는다. 붙이는 것은 **어느 사이트의 어떤 지면 갈래에서 왔나** 둘뿐이다.
 *    누구인지·무엇을 봤는지는 안 붙인다. 학교 코드도 학과 코드도 안 붙인다.
 * ⚠ 갈래는 **정해 둔 목록 안**에서만 붙인다. 주소에 아무 글자나 실어 보내지 않는다.
 */
/* ⚠ **빌드 결과의 폴더 이름을 보고 적었다.** 처음엔 내가 기억으로 넷만 적었고,
 *   그 바람에 age·region·university 가 전부 `기타` 로 뭉뚱그려졌다.
 *   갈래를 못 가르면 「어느 지면이 손님을 데려오나」를 못 잰다 — 이걸 만든 이유가 그것이다. */
/**
 * 🔴 2026-08-23 — **생애단계 지면 스무 곳 남짓이 통째로 빠져 있었다.**
 *
 *   사장님·2번의 「KLifeMap×100yearmap 결합」 킥오프를 살피다가, 실제 라이브 지면을
 *   열어 보고 찾았다 — `/oneperson`(1인가구·전 연령), `/retire-income`(은퇴 후 소득) 같은
 *   생애단계 KOSIS 지면들이 이 목록에 하나도 없어 **전부 `기타`로 잡히고 있었다.**
 *   그리고 `기타`는 `어른갈래`에도 없으니 `KLIFEMAP_적성`(「우리 아이한테 이 길이 맞을까」)
 *   으로 갔다 — 은퇴 소득을 읽던 어른이 갑자기 자기 아이 진로 질문을 받은 것이다.
 *   이 파일 자체가 여러 번 겪은 바로 그 실수(1번이 여러 차례 잡아 준 것)를 새 지면들이
 *   그대로 반복하고 있었다.
 */
export const 붙일수있는갈래 = [
  /**
   * 🔴 [2026-09-05 · 5번] 3번이 낸 지면 여덟 장이 «at=기타» 로 나가고 있었다.
   *   기타로 쌓이면 «어느 지면이 손님을 데려왔는지» 소급해서 못 가른다 — 오늘 온 손님을
   *   내일 다시 나눌 수 없다. 그래서 갈래를 붙인다.
   *   건강·의료 다섯 · 대학 둘 · 봉사 하나. 이름은 폴더(주소) 그대로다.
   */
  'cardiac-arrest', 'common-illness', 'fall-injury', 'medical-cost', 'single-intent',
  'university-gap', 'university-package', 'volunteer',
  'major', 'college-major', 'school', 'university', 'region', 'age', 'data',
  /* 입구 지면을 달고 나서 늘었다 — 이 넷도 손님이 들어오는 자리다 */
  'size', 'how-long', 'after', 'work', 'research',
  /**
   * ⭐ 2026-08-23 — 생애단계 지면(KOSIS 실측, /ages 문 스물세 장 + 허브 둘).
   *   어른 쪽(대운·일진과 결이 맞는 인생 통계)과 아이 쪽(돌봄·보육 시설)을 갈라 붙인다 —
   *   갈림은 바로 아래 `어른갈래`에서 마저 한다.
   */
  'pets', 'travel', 'promotion', 'exercise', 'hiking', 'golf', 'workout', 'cycling', 'swimming', 'soccer', 'parental-leave', 'oneperson', 'lifelong', 'retire-income', 'polytech', 'pension', 'training-card',
  'marriage-age', 'home', 'spending', 'healthy-years', 'years-left', 'real-wage', 'idle-youth', 'wealth-gap', 'youth-budget-2027', 'nonmarital-birth', 'korea-japan-youth', 'ranking-university', 'ranking-university-founding', 'ranking-university-region', 'ranking-university-level', 'ranking-stock-wealth', 'ranking-apartment-value', 'ranking-hagwon', 'ranking-medical-quota', 'ranking-lawmaker-wealth', 'ranking-kbo-salary', 'ranking-apartment-brand', 'ranking-convenience-brand', 'ranking-tax-delinquent', 'ranking-good-company', 'ranking-vleague-salary', 'ranking-university-nature-index', 'ranking-university-brand', 'ranking-city-brand', 'ranking-sangjo-brand', 'rankings', 'ranking-chicken-brand', 'ranking-coffee-brand', 'ranking-bakery-brand', 'ranking-hairsalon-brand', 'ranking-pizza-brand', 'ranking-petsupply-brand', 'ranking-eyewear-brand', 'ranking-juniorcollege-brand', 'ranking-cosmetics-brand', 'ranking-insurance-agency-brand', 'ranking-usedcar-brand', 'ranking-capital-brand', 'ranking-developer-brand', 'nps-cap-region', 'nps-cap-size', 'sandwich-generation', 'school-type-gap', 'ranking-university-global', 'oecd-elderly-poverty',
  /* [2026-09-30 · 1번] oecd-tertiary-employment-gap 이 8/23 표에 없어 «기타»로 빠지고 있었다(2번이 9/29 신설,
     등록을 놓침) — 같이 잡는다. oecd-employment-wage-gap-by-degree 는 오늘 그 짝으로 새로 낸 지면. */
  'oecd-tertiary-employment-gap', 'oecd-employment-wage-gap-by-degree', 'happiness-ranking', 'salary-ranking', 'mental-health', 'senior-doctor', 'high-value-home-age', 'wage-education', 'wage-distribution', 'divorce-age', 'remarriage', 'multicultural-marriage', 'birth-sex-ratio', 'fertility-rate',
  /* [2026-09-22 · 5번] 낱장으로 난 지면이라 폴더가 없다 — 이름을 손으로 올린다.
     ⛔ 기타로 쌓이면 어느 지면이 손님을 데려왔는지 소급해서 못 가른다. */
  'housework-view-vs-reality',
  /* [2026-09-22 · 1번] 같은 까닭으로 오늘 새로 낸 낱장 둘을 더 올린다. */
  'housework-spectrum-by-age', 'parent-support-view-by-age',
  /* [2026-09-22 · 1번] 같은 까닭으로 오늘 낸 낱장 하나 더 — 노후 준비방법 */
  'retirement-prep-by-age',
  /* [2026-09-24 · 1번] 같은 까닭 — 일-가정 우선도, 나이·10년(2015→2025) */
  'work-family-priority-by-age',
  /* [2026-09-24 · 1번] 같은 까닭 — 우리 사회 신뢰도, 나이띠별(2025 단면) */
  'social-trust-by-age',
  /* [2026-09-24 · 1번] 같은 까닭 — 학원 종류별·아동 체육기관 사업장 수명(국민연금 직접 집계) */
  'academy-lifespan', 'kids-activity-lifespan',
  /* [2026-09-25 · 1번] 같은 까닭 — 동네 가게 여섯 업종(수의업·당구장·세탁업 등) 사업장 수명 */
  'neighborhood-shop-lifespan',
  /* [2026-10-02 · 1번] 사장님 지시(5번 경유) — 국가데이터처 「2026 고령자 통계」 지면 둘.
     ⛔ 기타로 쌓이면 소급이 안 된다. 만든 날 같이 올린다. */
  'elderly-money-gap', 'elderly-work-reason',
  /* [2026-10-11 · 5번] 같은 고령자 묶음인데 이 한 장이 빠져 `at=기타` 로 나가고 있었다.
     ⚠ 이 목록은 «두 벌»이다(위쪽 `어른갈래`에도 같은 줄이 있다). 고칠 때 어느 쪽인지 보고 고친다. */
  'elderly-abuse-rate',
  'keep-working', 'longest-job', 'care', 'ages', 'community', 'first-job',
  'breakfast', 'kindergarten', 'nursery', 'nursery-fill', 'pediatrics', 'afterschool', 'elementary', 'tutoring', 'tutoring-region', 'tutoring-income',
  /* 🔴 2026-09-11 3번 신설 — 사장님 지시. 학생자살 사망사안 보고서(한겨레 인용) */
  'student-warning-signs',
  /** ⭐ 2026-08-23 — 메뉴 개편으로 신설된 「대학 이전」 허브. 안의 여섯 지면과 같은 결(아이 쪽)이라
   *  `어른갈래`에는 넣지 않는다 — 부모가 보러 온 자리라 기본 도착지(적성)가 이미 맞다. */
  'before',
  /**
   * ⭐ 2026-08-08 05:2x — **팔 물건 두 장.** 여기서 넘어온 손님이 제일 중요하다.
   * ⚠ 둘을 갈라 붙인다 — `report`(학교 한 장) · `report-area`(지역 한 벌).
   *   한 이름으로 뭉치면 **어느 쪽이 손님을 데려오는지** 못 잰다. 값을 그걸로 정한다.
   */
  'report', 'report-area',
  /**
   * ⭐ 2026-08-08 13:5x — 1번이 「at=기타 가 섞여 있다」고 알려 와서 **셌다.**
   *
   *   ```
   *   school 2,415 · major 926 · college-major 838 · report-area 258 …
   *   기타 **1장** — /about 하나뿐이었다
   *   ```
   *
   *   ⛔ 짐작으로 「많이 섞였겠지」 하지 않고 dist 를 훑어 셌다. 한 장이었다.
   *   ⚠ 그래도 고친다 — 1번 말대로 **기타로 쌓이면 소급이 안 된다.**
   *     오늘 온 손님을 내일 다시 가를 수 없다.
   */
  'about',
  /**
   * 🔴 2026-08-08 19:1x — **첫 화면이 `기타` 로 나가고 있었다.** 1번이 라이브에서 잡아 줬다.
   *
   *   낮에 내가 「`at=기타` 는 4,962장 중 1장뿐」이라고 세어 알렸는데,
   *   1번이 **그 1장이 어느 장인지**를 재 보니 `https://100yearmap.com/` — **첫 화면**이었다.
   *
   *   ```
   *   장으로 세면   1 / 4,962 = 0.02%   → 「거의 없다」로 읽힌다
   *   사람으로 세면  첫 화면이다        → 사이트에서 제일 많이 보는 한 장이다
   *   ```
   *
   *   ⛔ **내 셈은 맞았는데 내가 그 셈을 잘못 읽었다.** 「몇 장에 있나」와 「몇 사람이 보나」는
   *     다른 물음이다. 훑은 수를 말하라던 오늘의 규칙과 **반대 방향**의 덫이다 — 여기서는
   *     장수가 아니라 **무게**를 물었어야 했다.
   *   ⚠ 그리고 `기타` 는 「아직 안 붙인 자리」로 읽힌다. 첫 화면은 기타가 아니다.
   */
  'home',
  /**
   * ⭐ 2026-08-09 06:2x — **층 대문 두 장**(`/life/50대` · `/life/60대`).
   *
   *   1번이 「꼬리가 붙었나」를 물어 전수로 세다가 **`at=기타` 가 둘 남아 있는 것**을 봤다.
   *   어제 지면을 내면서 이 목록에 넣는 것을 잊었다 — `region`·`age` 때와 같은 자리다.
   *
   *   ⚠ `age`(한 살짜리)와 **갈라 붙인다.** 층 대문은 열 해를 한 장에 놓은 다른 물건이고,
   *     어느 쪽이 손님을 데려오는지 갈라 봐야 다음 층을 어디부터 낼지 정할 수 있다.
   *   ⛔ 「둘뿐이라 그냥 두자」로 넘기지 않는다 — 기타로 쌓이면 **소급이 안 된다.**
   *     오늘 온 손님을 내일 다시 가를 수 없다(1번이 어제 알려 준 것).
   */
  'life',
  /**
   * 🔴 2026-08-10 11:5x — **`/price` 가 「모르는 곳」으로 들어오고 있었다.** 1번이 잡아 줬다.
   *
   *   내가 어제 *「문 18갈래 중 하나가 `at=기타` 라 한글이 들어간다」*고 알려만 드렸더니,
   *   1번이 **이 파일의 `갈래고르기` 를 그대로 불러** 사이트맵 4,885장을 갈라 봤다 —
   *   ```
   *   기타 5장 — /sitemap-image.xml(지면 아님) · **`/price`** · /terms · /privacy · /refund
   *   ```
   *   ⭐ 그 다섯 중 **`/price` 하나가 무겁다.** 사이트에서 **사려는 마음이 제일 큰 자리**인데
   *     거기서 나간 손님이 KLifeMap 에 「모르는 곳에서 온 사람」으로 닿고 있었다.
   *
   *   ⚠ 「다섯 장뿐」으로 넘기지 않는다. 어제 첫 화면 때와 **같은 덫**이다 —
   *     장수가 아니라 **무게**를 물어야 하는 자리다.
   *   ⭐ 그리고 값이 아스키가 되니 `at=기타` 의 한글 딱지 문제도 같이 사라진다.
   *     (1번 실측 — 생 한글 바이트로 부르면 **400**, 퍼센트로 부르면 200)
   *
   * ⚠ `terms`·`privacy`·`refund` 는 1번이 「급하지 않다」 했다. 한 덩어리로 같이 넣는다 —
   *   따로 넣으면 이 자리를 두 번 열게 되고, 그때 또 하나를 빠뜨린다.
   */
  'price', 'terms', 'privacy', 'refund',
  /**
   * 🔴 [2026-09-07 · 3번] 5번이 `npm test`로 잡아 준 「at=기타」 14장.
   *   대부분 오늘 새로 낸 지면(work-gap 이후)과 그 이전에 빠져 있던 것들이다.
   *   `school`·`major`·`college-major`·`university-gap`·`university-package` 처럼
   *   대학·학과 «분석» 지면은 어른갈래에 넣지 않는다(도착지 검증 안 함, 기존 결과대로 학부모·학생 쪽 기본 문이 맞다).
   */
  'apt-parking-age', 'dropout-by-school-type', 'ev-charger-by-age', 'property-tax', 'video',
  'work-gap', 'business-age', 'youth-employment-streak', 'college-job-perception-2026', 'twenties-jan-aug-employment', 'college-age-population',
  'major-name-gap', 'closed-universities', 'field-employment',
  'university-employment-spread', 'university-enrollment-fill',
  /* 🔴 [2026-09-08 · 3번] 어제(9/7) 이 목록에 새 지면 추가를 빠뜨려 14장이 「at=기타」로
     샜다(5번 지적, 이미 고침). 이번엔 새 지면을 만들면서 바로 넣는다 — school·major·
     university-gap과 같은 결(입시 분석)이라 어른갈래엔 안 넣는다. */
  'csat-applicant-mix', 'university-founding-gap', 'trendy-major-outcomes', 'university-dropout-rate',
  'university-faculty-rate', 'freshman-fill-region', 'csat-subject-choice',
  /* 🔴 2026-09-10 3번 신설 */
  'qual-duration', 'qual-age', 'industry-region-cross', 'industry-size-cross', 'turnover-cross-check', 'onet-riasec',
  'health-checkup-rate', 'happiness-by-age', 'oneperson-vulnerability', 'tax-vs-wage', 'military-age-men', 'labor-market-2072', 'population-decline-regions', 'region-pay-raw-vs-adjusted', 'industry-pay-turnover', 'industry-region-concentration', 'class-size-distribution', 'lifecycle-deficit', 'public-transfers-by-age', 'income-inequality-by-age', 'networth-lifecycle', 'culture-attendance',
  /* [2026-09-30 · 1번] 보건복지부 제2차 보건의료인력 실태조사(2026-09-29) 신설 지면 둘.
     major·college-major·field-employment·trendy-major-outcomes 와 같은 결(진로·직종 분석)이라
     어른갈래엔 넣지 않는다 — 기본 도착지(적성)가 이미 맞다. */
  'health-workforce-activity-rate', 'health-workforce-growth-2013-2023',
  /* [2026-10-02 · 1번] 사장님 지시(5번 경유) — THE 세계대학순위 2027(서울대 국내 1위·
     세계 56위) 신설 지면. ranking-university-global 과 같은 「순위+문제제기」 결. */
  'ranking-university-the',
  '기타',
] as const;

/**
 * 🔴 **딱지는 넣었는데 이 넷에는 문이 없다** — 1번이 반나절 만에 되짚어 알려 왔다(12:4x).
 *
 *   *「딱지만 보고 문을 안 봤습니다. **「딱지가 바르다」와 「문이 있다」는 다릅니다**」*
 *
 *   ```
 *   /price · /terms · /privacy · /refund   → klifemap 링크 **0개** (내가 라이브에서 다시 잼)
 *   /age/40 · /school/…                    → 문 1개씩 ✅
 *   ```
 *
 * ## 판단 — **문을 달지 않는다.** 셋 다 까닭이 있다
 *
 *   ```
 *   ① /price 는 **파는 지면**이다. 여기서 밖으로 내보내면 **사려던 사람을 뺀다**
 *   ② PG 뒤에 이 지면의 **사는 단추가 KLifeMap 결제로** 간다 — 그 문이 at=price 를 달고 간다.
 *      지금 적성 문을 달면 한 지면에서 KLifeMap 으로 가는 문이 **둘**이 되어 손님이 갈린다
 *   ③ 약관 셋은 결이 아니다 — 환불 규정을 읽는 사람에게 「우리 아이 적성」을 권하지 않는다
 *   ```
 *   ⛔ 1번이 준 다른 길(`준비됨: false`)은 **쓸 수 없다.** 그 값은 **전역**이라
 *     4,966장의 문이 통째로 죽는다. 한 지면을 끄는 스위치가 아니다.
 *
 * ⭐ 그래서 `at=price` 는 **PG 가 붙는 날 결제 문으로 처음 생긴다.** 그때까지 0명이 맞다.
 *   ⚠ 이 줄이 없으면 나중에 누가 「딱지는 있는데 문이 없네」 하고 **고쳐 버린다.** 그래서 적어 둔다.
 */
export const 문을안다는갈래: ReadonlySet<string> = new Set(['price', 'terms', 'privacy', 'refund']);
export type 갈래 = (typeof 붙일수있는갈래)[number];

/**
 * 지면 경로에서 갈래를 고른다. 모르는 것은 `기타` — 지어내지 않는다.
 *
 * ⚠ **입구 지면은 `/major.html` 로 나온다**(빌드가 file 꼴이라 그렇다).
 *   처음엔 `.html` 을 안 떼서 열세 장이 전부 `기타` 로 떨어졌다.
 *   낱장(`/major/3D건축인테리어과`)만 보고 자를 만들면 이걸 못 잡는다.
 */
export function 갈래고르기(경로: string | null | undefined): 갈래 {
  /**
   * ⚠ **`.html` 을 먼저 떼고 나서 `100y` 를 걸러 낸다.** 순서를 바꾸면 첫 화면을 놓친다 —
   *   첫 화면 파일은 `dist/100y.html` 이라 조각이 `100y.html` 로 오는데,
   *   먼저 거르면 `100y` 와 안 같아 살아남고 그대로 `기타` 가 된다.
   *   ⛔ 옛 자가 딱 이 순서였다. 고치면서 시험해 보고 알았다(2026-08-08 19:2x).
   */
  const 조각 = String(경로 ?? '')
    .split('/')
    .filter(Boolean)
    .map((s) => s.replace(/\.html?$/i, ''))
    .filter((s) => s !== '100y');
  const 첫 = 조각[0] ?? '';
  /**
   * ⚠ 첫 화면은 조각이 **하나도 없다**(`/` · `/100y` · `/100y.html` 이 다 여기로 온다).
   *   그래서 옛 자는 이것을 `기타` 로 떨어뜨렸다 — 제일 많이 보는 한 장인데.
   */
  if (!첫) return 'home';
  /**
   * ⚠ **`report` 만은 둘째 조각까지 본다.** 첫 조각만 보면
   *   `/report/7010057`(학교 한 장)과 `/report/area/…`(지역 한 벌)이 한 이름이 된다.
   *   이 둘은 파는 물건이 다르고 값도 다르게 정할 것이라, 갈라 놓지 않으면
   *   「어느 쪽이 손님을 데려오나」를 못 잰다.
   */
  if (첫 === 'report') return 조각[1] === 'area' ? 'report-area' : 'report';
  return (붙일수있는갈래 as readonly string[]).includes(첫) ? (첫 as 갈래) : '기타';
}

/**
 * 도착지 주소에 표를 붙여 돌려준다.
 * ⚠ 이미 물음표가 붙어 있을 수 있으므로 `?` 와 `&` 를 가려 쓴다.
 */
export function 입구주소(경로?: string | null): string | null {
  /** ⚠ 도착지가 갈래마다 다르다. 한 곳으로 몰지 않는다 — `입구고르기` 를 거친다 */
  const 문 = 입구고르기(경로);
  if (!문.준비됨 || !문.주소) return null;
  const 밑 = 문.주소;
  const 이음 = 밑.includes('?') ? '&' : '?';
  return `${밑}${이음}from=100y&at=${갈래고르기(경로)}`;
}
