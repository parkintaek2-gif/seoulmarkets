import type { APIRoute } from 'astro';
import majors from '../../data/100yearmap/pages-major.json';
import schools from '../../data/100yearmap/pages-school.json';
import universities from '../../data/100yearmap/pages-university.json';
import 중단자료 from '../../data/100yearmap/school-dropout.json';
/* 🔴 [2026-09-23] 「검색에 올릴 만한가」는 이제 «한 곳»에서 온다 — 애드센스가
   100yearmap 을 「가치가 별로 없는 콘텐츠」로 막았다. 지면·사이트맵·이미지사이트맵이
   조건을 따로 적으면 반드시 갈라진다. */
import 진로자료 from '../../data/100yearmap/school-career.json';
import { 검색에올릴만한가 } from '../../lib/school-worth-indexing.mjs';
import 학급자료 from '../../data/100yearmap/school-class-size.json';
import 대학학과 from '../../data/100yearmap/major-outcomes.json';
import { 학과슬러그 } from '../../lib/college-major';
/* ⚠ 위의 (시·도 목록)과 이름이 겹치지 않게 **다른 이름**으로 받는다 */
import 지역단위 from '../../data/100yearmap/areas.json';
import { 한벌로팔만한가 } from '../../lib/school-area';
/* 🔴 파는 지면을 검색에 여는 스위치. `[slug].astro` 의 noindex 와 **같은 것**을 부른다 */
import { 파는지면검색 } from '../../lib/price';
import { 짧은지역명 } from '../../lib/region';
/* 🔴 층 목록은 **한 곳**에서 온다 — 지면과 사이트맵이 두 벌을 두면 갈라진다 */
import { 낼층 } from '../../lib/age-layer';
/* 🔴 `<lastmod>` — **git 이 아는 진짜 날**만 담긴다. `scripts/build-100y-lastmod.mjs` 가 만든다.
   ⛔ 빌드한 날을 4,772장에 다 박지 않는다. 그건 「매일 전부 바뀌었다」는 거짓말이고,
     크롤러가 알아채면 lastmod 를 통째로 무시한다. **모르는 갈래는 빈칸으로 둔다** */
import 날대장 from '../../data/100yearmap/lastmod.json';

/** ⚠ `school/[code].astro` 의 `noindex` 조건과 **한 글자도 다르면 안 된다** */
const 중단있는코드 = new Set(((중단자료 as any).자료 as any[]).map((r) => r.code));
/** ⭐ 2026-08-07 — 학급당·수업교원 1인당 학생 수도 **이 학교 하나의 숫자**라 지면을 연다.
 *  ⚠ 지금은 두 자료의 학교 집합이 정확히 같다(2,371곳 · 실측). 그래도 조건을 같이 늘려 둔다 —
 *    한쪽 자료만 다시 받으면 갈라지고, 그때 조건이 어긋나면 모순된 신호가 나간다 */
const 학급있는코드 = new Set(((학급자료 as any).자료 as any[]).map((r) => r.code));
const 진로있는코드 = new Set(((진로자료 as any).자료 as any[]).map((r: any) => String(r.code)));
/** 🔴 지면·사이트맵·이미지사이트맵이 나눠 쓰는 «한 벌» */
const 있나 = { 진로: 진로있는코드, 중단: 중단있는코드, 학급: 학급있는코드 };

/** 지역 지면의 주소는 `짧은지역명` 이다. `region/[slug].astro` 의 getStaticPaths 와 **같은 데서 뽑는다** —
 *  한쪽에 손으로 적어 두면 지역 이름이 바뀔 때 사이트맵만 옛 주소를 가리키게 된다 */
const 지역들 = [
  ...new Set((schools as any[]).map((s) => 짧은지역명(s.지역)).filter(Boolean)),
];

/**
 * 백년지도 사이트맵.
 *
 * 왜 따로 두나 — `src/pages/sitemap.xml.ts` 는 서울마켓(SITE_URL) 것이다.
 *   백년지도는 도메인이 다르다. server.mjs 가 `100yearmap.com/sitemap.xml` 을
 *   `dist/100y/sitemap.xml` 로 보내므로, 이 파일이 그 자리에 놓인다.
 *
 * ⚠ 주소에 접두사 `/100y` 를 붙이지 않는다.
 *   방문자가 보는 주소는 `https://100yearmap.com/major/조리과` 다.
 *   `/100y` 는 우리가 한 서버에서 세 사이트를 돌리려고 쓰는 내부 사정일 뿐,
 *   검색엔진에 그 사정을 알릴 이유가 없다.
 *
 * ⚠ 3,450장을 한 파일에 넣는다. 사이트맵 한도는 5만 URL · 50MB 라 아직 여유가 있다.
 *   대학알리미가 들어와 학과 페이지가 늘면 그때 쪼갠다.
 *
 * 🔴 **noindex 인 지면은 사이트맵에 넣지 않는다** (2026-08-05 정정).
 *
 * 앞선 주석은 반대로 적혀 있었다 — 「noindex 인 페이지도 넣는다」.
 * 그러면 검색엔진에 **모순된 신호**를 준다. 사이트맵은 「이걸 색인해 달라」는 뜻인데
 * 그 지면이 「색인하지 마라」고 말한다. Search Console 이 경고를 띄우고,
 * 그런 URL 이 많으면 사이트맵 전체의 신뢰가 깎인다.
 *
 * ```
 * 사장님 결정 2026-08-05 「얇은 것만 빼고 지금 떼라」
 *   ▶ 넣는다  학과 · 대학 · **학과가 있는 학교** · 고정 지면
 *   ⏸ 뺀다    학과가 없는 일반고 — `school/[code].astro` 가 같은 조건으로 noindex 를 건다
 * ```
 *
 * ⚠ **두 파일의 조건이 같아야 한다.** 한쪽만 고치면 다시 어긋난다.
 */

const ORIGIN = 'https://100yearmap.com';

/** 한글 주소는 그대로 두면 XML 파서가 깨진다. 인코딩하고 & 를 escape 한다 */
const loc = (path: string) =>
  ORIGIN +
  path
    .split('/')
    .map((seg) => (seg ? encodeURIComponent(seg) : seg))
    .join('/');

type Entry = { path: string; priority: string; changefreq: string };

/**
 * 그 길이 어느 갈래인가 → `lastmod.json` 의 열쇠.
 *
 * ⚠ `scripts/build-100y-lastmod.mjs` 의 `갈래찾기()` 와 **같은 규칙**이다.
 *   한쪽만 고치면 그 갈래가 조용히 날을 잃는다(빌드는 그대로 지나간다).
 */
const 갈래열쇠 = (길: string): string => {
  if (길 === '/') return '/';
  const 마디 = 길.split('/').filter(Boolean);
  if (마디.length === 1) return '/' + 마디[0];
  if (마디[0] === 'report' && 마디[1] === 'area') return '갈래:area';
  if (마디[0] === 'report') return '갈래:report';
  return '갈래:' + 마디[0];
};

const 날들 = ((날대장 as any).날 ?? {}) as Record<string, string>;
/** ⛔ 모르면 빈 글자 — 아무 날이나 지어내지 않는다 */
const lastmod = (길: string): string => {
  const d = 날들[갈래열쇠(길)];
  return /^\d{4}-\d{2}-\d{2}$/.test(String(d ?? '')) ? `<lastmod>${d}</lastmod>` : '';
};

export const GET: APIRoute = () => {
  const entries: Entry[] = [
    { path: '/', priority: '1.0', changefreq: 'weekly' },
    { path: '/about', priority: '0.8', changefreq: 'monthly' },
    /* 🔴 2026-08-08 11:3x — 파는 지면이 라이브인데 이 셋이 404 였다(2번 실측).
       ⚠ 고정 지면을 만들면 **여기 한 줄을 같이 넣는다.** 안 넣으면 검사가 잡는다 */
    /* 🔴 2026-08-21 — 여기 있던 { path: '/sitemap-image.xml' } 를 **뺐다.**
       <loc> 은 «지면 주소» 자리다. 사이트맵을 거기 넣으면 구글이 그것을 지면으로 읽고
       「제목이 없는 지면」으로 본다(내 검사가 4,788장 중 그 한 장만 잡아냈다).
       ⇒ 사이트맵을 알리는 자리는 robots.txt 의 Sitemap: 줄이다. 거기로 옮겼다 */
    /**
     * 🔴 2026-08-09 04:2x — **값 지면.** 2번 실측: `/price` 를 포함해 값이 있을 만한
     *   주소가 **전부 404** 였고 첫 화면에 값 글자가 **0번**이었다.
     *
     * ⚠ 우선순위를 0.9 로 둔다. 파는 지면 114장은 `noindex` 라 닫혀 있어서,
     *   「백년지도 값」·「학교 자료 얼마」로 찾아오는 사람이 닿을 곳이 **여기 하나뿐**이다.
     * ⛔ 이 줄을 빠뜨리면 지면은 열려 있는데 사이트맵에 없는 어긋난 상태가 된다 —
     *   `/after`·`/region` 에서 두 번 그랬다. 그래서 지면과 **같은 커밋**에 넣는다.
     */
    { path: '/price', priority: '0.9', changefreq: 'weekly' },
    /* 🔴 2026-09-07 5번 — /contact 를 «지면과 같은 커밋»에 넣는다.
       docs/애드센스-계정-상태.md Ⅵ-6 이 2026-09-02 에 「심사를 막는 것은 하나뿐 —
       백년지도 /contact 가 404」라 적어 뒀는데 9/7 에도 404 였다. 애드센스는 «연락 수단»을 본다.
       ⚠ 우선순위를 0.4 로 둔다 — 검색 유입용 지면이 아니고 «심사와 신뢰»용 지면이다 */
    { path: '/contact', priority: '0.4', changefreq: 'monthly' },
    /* 🔴 [2026-10-31 · 1번] 백년지도 칼럼 목록. 칼럼 하나하나의 주소는 R2 에 있어 빌드가 모른다 —
       server.mjs 가 이 사이트맵을 낼 때 공개 칼럼을 덧붙인다(src/lib/column.mjs 사이트맵더하기) */
    { path: '/column', priority: '0.8', changefreq: 'daily' },
    { path: '/terms', priority: '0.4', changefreq: 'yearly' },
    { path: '/privacy', priority: '0.4', changefreq: 'yearly' },
    { path: '/refund', priority: '0.4', changefreq: 'yearly' },
    /* 🔴 「대학 다음이 제일 중요」(사장님 2026-08-06). 우리가 남과 다른 자리라 첫 화면 다음으로 높다.
       ⚠ 새 고정 지면을 만들면 **여기 한 줄을 같이 넣는다.** 안 넣으면 지면은 검색에 열려 있는데
         사이트맵에는 없는 어긋난 상태가 된다 — /after 를 만들고 실제로 그랬다(2026-08-06). */
    { path: '/after', priority: '0.9', changefreq: 'weekly' },
    /* 메뉴 셋째 축. 이름은 사장님 결정 대기지만 **주소는 `/work` 로 고정**이다
       (이름을 주소에 안 박았다 — 지면 앞머리 주석 참조).
       ⭐ 이 줄을 일부러 안 넣고 빌드해 봤더니 `check:100y:launch` 가 그 자리에서 잡았다.
          검사가 헛돌지 않는다는 것을 실제로 확인한 셈이다(2026-08-06). */
    { path: '/work', priority: '0.9', changefreq: 'weekly' },
    /* ⭐ 2026-08-07 신설 — 「그 일자리는 얼마나 갈까」. 다른 자리가 넘겨 준 사업 축 자료로 만들었다.
       ⚠ 메뉴에는 안 넣었다(이미 여덟 칸이다). `/work`·`/after` 에서 잇는다.
       ⛔ 이 줄을 빠뜨리면 지면은 검색에 열려 있는데 사이트맵에 없는 어긋난 상태가 된다 —
         `/after` 와 `/region` 에서 실제로 그랬고 `check:100y:launch` 가 잡았다. */
    { path: '/how-long', priority: '0.8', changefreq: 'monthly' },
    /* ⭐ 2026-08-07 신설 — 「큰 회사가 정말 나을까」. 사업 축이 넘겨 준 규모별 자료로 만들었다.
       ⚠ 메뉴에는 안 넣었다(이미 여덟 칸). `/how-long`·`/work`·`/after` 에서 잇는다. */
    { path: '/size', priority: '0.8', changefreq: 'monthly' },
    { path: '/major', priority: '0.9', changefreq: 'weekly' },
    /* ⭐ 2026-08-07 신설 — **대학** 학과. `/major`(고등학교 학과)와 다른 지면이다.
       이름이 82개 겹치지만 학교급이 달라 섞으면 숫자가 어긋난다. */
    { path: '/college-major', priority: '0.9', changefreq: 'weekly' },
    { path: '/school', priority: '0.8', changefreq: 'weekly' },
    { path: '/school-progression-rank', priority: '0.9', changefreq: 'monthly' },
    { path: '/university', priority: '0.9', changefreq: 'weekly' },
    { path: '/research', priority: '0.7', changefreq: 'monthly' },
    { path: '/data', priority: '0.8', changefreq: 'weekly' },
    /* 짧은 영상 — 사장님 지시(2026-08-14)로 **하루에 하나씩 내고 배포까지** 한다.
       ⚠ 또 잊을 뻔했다. 지면을 만들자마자 `check:100y:launch` 가
          「검색엔 열렸는데 사이트맵에 없다 — /video」로 세웠다.
          `/after` · `/region` 때와 **세 번째 같은 실수**다. 고정 지면을 만들면 여기부터 온다. */
    { path: '/video', priority: '0.7', changefreq: 'daily' },
    /* 지역으로 보기 — 「경기도 고등학교」처럼 **지역으로 찾는 검색**을 받는 자리다.
       ⭐ 이번에도 검사가 먼저 잡았다(2026-08-06 17:0x). 지면을 만들고 이 줄을 잊었더니
          `check:100y:launch` 가 「검색엔 열렸는데 사이트맵에 없다 — /region」으로 세웠다.
          `/after` 때와 **똑같은 실수**다. 고정 지면을 만들면 여기부터 온다. */
    { path: '/region', priority: '0.8', changefreq: 'monthly' },
    ...지역들.map((지역) => ({
      path: `/region/${지역}`,
      priority: '0.7',
      changefreq: 'monthly',
    })),
    /* 나이로 보기 — 「32살 평균 연봉」·「결혼 적령기」처럼 **나이로 찾는 검색**을 받는 자리다.
       ⚠ 나이 목록은 `age/[age].astro` 의 getStaticPaths 와 **같아야 한다.** 늘릴 때 두 곳을 함께 고친다. */
    { path: '/age', priority: '0.8', changefreq: 'monthly' },
    /* 🔴 초등학교 — 「○○초등학교 몇 년도」·「우리 학교 개교」처럼 **학교 나이로 찾는 검색**을 받는다.
       ⚠ 이 자 안에 「/after · /region 때와 **세 번째 같은 실수**」라고 적혀 있다.
         지면을 만들고 여기 한 줄을 안 넣으면 **네 번째**가 된다. 만든 날(8/16)에 같이 넣는다. */
    { path: '/elementary', priority: '0.8', changefreq: 'monthly' },
    /* 🔴 2026-08-27 — 사교육 참여율·비용(KOSIS 초중고사교육비조사). 우리 강령(학원을
       팔지 않는다)과 직접 닿는 자리라 사장님 지시로 착수. 만든 날 여기 넣는다. */
    { path: '/tutoring', priority: '0.8', changefreq: 'yearly' },
    /* 🔴 2026-09-01 — /tutoring과 같은 조사(초중고사교육비조사)의 지역 축. DT_1PE202는
       "참여율"이 아니라 "사교육비"였다(표 이름 오인 정정, KOSIS 후보 문서 참고). */
    { path: '/tutoring-region', priority: '0.7', changefreq: 'yearly' },
    /* 🔴 2026-09-02 — 같은 조사(초중고사교육비조사)의 소득 축(101/DT_1PE102). 소득구간이
       2022년 개편돼 시계열은 안 내고 2025년 한 해만 냄. */
    { path: '/tutoring-income', priority: '0.7', changefreq: 'yearly' },
    /* 🔴 2026-09-02 — /wage-education의 «평균» 대신 «분포»(118/DT_PAY0011). 강령 「평균이
       아니라 분포」 직접 이행. 임금이 총액(상여 포함) 기준이라 /wage-education과 다르다. */
    { path: '/wage-distribution', priority: '0.7', changefreq: 'yearly' },
    /* 🔴 2026-09-02 — /marriage-age 짝(101/DT_1B85011·DT_1B85006). 이혼 연령 1990~2025
       추세 + 혼인지속기간별 분포. 인구동향조사(행정통계). */
    { path: '/divorce-age', priority: '0.7', changefreq: 'yearly' },
    /* 🔴 2026-08-28 — 실질임금(사업체노동력조사×소비자물가지수, 저희 계산). 사장님이
       고용노동부 보도자료를 직접 짚으며 지시. 매달 갱신 여지가 있어 monthly. */
    { path: '/real-wage', priority: '0.8', changefreq: 'monthly' },
    /* 🔴 2026-08-28 — 「청년 예산 언박싱 2027」보도자료 각주를 KOSIS로 검증해 지면화.
       월별 갱신되는 실측 통계라 monthly. */
    { path: '/idle-youth', priority: '0.8', changefreq: 'monthly' },
    { path: '/wealth-gap', priority: '0.8', changefreq: 'yearly' },
    /* 🔴 2026-08-28 — 2027년도 예산안(정부안) 청년 정책 안내. 12월 국회 확정 때 재확인 필요. */
    { path: '/youth-budget-2027', priority: '0.7', changefreq: 'monthly' },
    /* 🔴 2026-08-31 — 뉴스 헤드라인(혼인 외 출생아 역대 최대)을 KOSIS로 검증해 지면화. */
    { path: '/nonmarital-birth', priority: '0.7', changefreq: 'yearly' },
    /* 🔴 2026-08-31 — 대한상의·일본상의 공동 「한일 청년의식조사 2026」 언론 보도 인용.
       ⛔ 정부 통계 아님 — 지면 안에 못박음. 원자료 못 찾음(언론 보도로만 인용). */
    { path: '/korea-japan-youth', priority: '0.6', changefreq: 'yearly' },
    /* 🔴 2026-09-01 — 2번(5번 대행) signal.bz 직접 주문. 종부세 1주택 기본공제 개편(9/1 확정)을
       KOSIS 주택소유통계(연령×주택자산가액)로 검증해 지면화. 찬반 판정 없음. */
    { path: '/high-value-home-age', priority: '0.7', changefreq: 'yearly' },
    /* 🔴 2026-09-01 — docs/새데이터-KOSIS-후보.md 후보 이행. 118/DT_118N_LCE0003(고용형태별
       근로실태조사)로 학력별 월급여·시간당임금을 검증해 지면화. 판정 없음, 상관관계만. */
    { path: '/wage-education', priority: '0.7', changefreq: 'yearly' },
    /* 🔴 2026-08-31 — 「순위+문제제기」 시리즈 1편. 중앙일보 대학평가(3자 순위) 인용 +
       대학알리미 실측 대조. docs/3번-순위콘텐트-지침.md 참고. */
    { path: '/ranking-university', priority: '0.7', changefreq: 'yearly' },
    /* 🔴 2026-09-01 — 「순위+문제제기」 시리즈 3편(사장님 지시 10 — 국립·공립·사립 나눠서).
       개별 대학을 새로 평가하지 않는다 — 이미 공시된 값을 설립유형별로 묶어 평균만 낸다. */
    { path: '/ranking-university-founding', priority: '0.7', changefreq: 'yearly' },
    /* 🔴 2026-09-01 — 시리즈 4편(사장님 지시 10, 「지역순위」). 5개 권역 평균만, 개별 평가 아님. */
    { path: '/ranking-university-region', priority: '0.7', changefreq: 'yearly' },
    /* 🔴 2026-09-01 — 시리즈 5편(마지막, 사장님 지시 10 「4년제·전문대」).
       전문대학 평균 취업률이 4년제보다 높다 — 문제제기형 실측, 판정 없음. */
    { path: '/ranking-university-level', priority: '0.7', changefreq: 'yearly' },
    /* 🔴 2026-08-31 — 「순위+문제제기」 시리즈 2편. CEOscore데일리 국내 주식부호 순위(3자
       인용) + 100yearmap 청년 가구 자산 실측(KOSIS) 대조. 개인 행복 판정 안 함. */
    { path: '/ranking-stock-wealth', priority: '0.7', changefreq: 'yearly' },
    { path: '/happiness-ranking', priority: '0.7', changefreq: 'yearly' },
    /* 🔴 2026-09-10 — 「순위+문제제기」 시리즈 7편(마지막). CEO스코어(기업데이터연구소)
       500대 기업 평균급여 순위(2차 보도 인용) + 100yearmap KOSIS 임금분포 실측 대조. */
    { path: '/salary-ranking', priority: '0.7', changefreq: 'yearly' },
    /* 🔴 2026-08-31 — 시즌2-2 「몸/맘」 1편. 한국보건사회연구원 KOSIS 우울감·스트레스
       나이대별 실측. 진단 아님 — docs/3번-시즌2-2-몸맘.md 참고. */
    { path: '/mental-health', priority: '0.7', changefreq: 'yearly' },
    /* 🔴 2026-09-12 — 국회미래연구원 「한국인의 행복조사」 나이 축. 사장님 지시(9/11),
       5번이 수집·가공한 자료를 지면으로 냈다. */
    { path: '/happiness-by-age', priority: '0.7', changefreq: 'yearly' },
    /* 🔴 2026-09-11 — 사장님 지시로 신설. 학생자살 사망사안 보고서(한겨레 인용) — 조기발견의
       틈을 판정 없이 옮긴다. 안전보도 원칙 준수(방법 언급 없음·상담전화 최상단). */
    { path: '/student-warning-signs', priority: '0.7', changefreq: 'yearly' },
    { path: '/senior-doctor', priority: '0.7', changefreq: 'yearly' },
    /* ⛔ 2026-08-21 사장님 지시로 스타 사주(/saju · /saju/iu)를 내렸다.
       「왜 네가 스타사주를 서비스하냐? 전혀 상관없는데」 — 다시 넣지 않는다. */
    /* 🔴 0~5세 — 어린이집이 한 곳도 없는 지역. 8/21 00:14 실측에서 대입 아닌 지면이
       4,773장 중 24장(0.5%)이었다. 그 24장에 한 장을 더한다.
       ⚠ 지면을 만든 그 자리에서 이 줄을 넣는다 — /after·/region·/elementary·/saju 에 이어
         **다섯 번째** 같은 실수를 하지 않으려고. */
    { path: '/nursery', priority: '0.8', changefreq: 'monthly' },
    /* 🔴 0~5세 셋째 문(2026-08-24) — 「어린이집 정원 대비 현원」. 자동완성 실측(「어린이집 정원」10줄,
       그중 «정원 현원»·«정원 충족률» 포함)으로 신호를 확인하고 냈다. 「대기아동」이 아니다 — 그 표는
       KOSIS·data.go.kr 어디에도 없어 못 찾았다고 지면·자료 양쪽에 적었다. */
    { path: '/nursery-fill', priority: '0.7', changefreq: 'monthly' },
    /* 🔴 2026-08-25 — 「등산 인구」 자동완성 실측(4줄) 확인 후 낸 지면. 국민생활체육조사
       나이대별 등산 참여율(성별×나이 교차와 안 섞고 나이만 골랐다 — collect-100y-hiking.mjs). */
    { path: '/hiking', priority: '0.7', changefreq: 'monthly' },
    /* 🔴 2026-08-25 — 「골프 인구」 자동완성 실측(10줄, 오늘 최강 신호) 확인 후 낸 지면.
       같은 표에서 나이만 골랐다(collect-100y-golf.mjs). 2022~2024년은 항목명이 달라
       2025년 한 해만 싣는다. */
    { path: '/golf', priority: '0.7', changefreq: 'monthly' },
    /* 🔴 2026-08-25 — 「헬스 인구」류 신호 확인 후 낸 지면. 같은 표에서 나이만 골랐다
       (collect-100y-workout.mjs). 「보디빌딩(헬스)」 항목명이 2021~2025 5년 내내 동일해
       golf와 달리 5년을 그대로 이었다. */
    { path: '/workout', priority: '0.7', changefreq: 'monthly' },
    /* 🔴 2026-08-25 — 「자전거 인구」류 신호 확인 후 낸 지면. 같은 표에서 나이만 골랐다
       (collect-100y-cycling.mjs). 「자전거사이클산악 자전거」 항목명이 2021~2025 5년 내내
       동일해 5년을 그대로 이었다. */
    { path: '/cycling', priority: '0.7', changefreq: 'monthly' },
    /* 🔴 2026-08-25 — 「수영 인구」류 신호 확인 후 낸 지면. 같은 표에서 나이만 골랐다
       (collect-100y-swimming.mjs). 2021년은 이 표에 수영 항목 자체가 없어(이름 변경이
       아니라 그 해에 안 실림) 2022~2025 4년만 잇는다. */
    { path: '/swimming', priority: '0.7', changefreq: 'monthly' },
    /* 🔴 2026-08-25 — 「축구 인구」 신호 확인 후 낸 지면. 같은 표에서 나이만 골랐다
       (collect-100y-soccer.mjs). 「축구 풋살」 항목명이 2021~2025 5년 내내 동일해(공백까지
       JSON.stringify로 대조) 5년을 그대로 이었다. */
    { path: '/soccer', priority: '0.7', changefreq: 'monthly' },
    /* 🔴 2026-08-25 — 「육아휴직 사용률」 자동완성 실측(10줄, 오늘 등산 다음으로 강함)
       확인 후 낸 지면. 통계청 「출생아 부모의 육아휴직 사용률」(org 101 · DT_CC2024D002)
       2015~2024 10년치를 그대로 이었다(collect-100y-parental-leave.mjs). */
    { path: '/parental-leave', priority: '0.7', changefreq: 'monthly' },
    /* 🔴 0~5세 둘째 문 — 「우리 동네 유치원」. 시·군·구 228칸이라 «동네 이름»으로 찾는 검색을 받는다.
       /nursery 가 스스로 적어 둔 한계(「유치원은 이 표에 없습니다」)를 닫는 지면이다. */
    { path: '/kindergarten', priority: '0.8', changefreq: 'monthly' },
    /* 🔴 «그 다음» — 학과 뒤 40년의 끝자락. 「몇 살에 퇴직」·「평균 퇴직 나이」로 찾는 검색을 받는다.
       사장님 「대입이 전혀 중요하지 않다. 그 다음, 그 전이 중요한 거다」 */
    { path: '/longest-job', priority: '0.8', changefreq: 'monthly' },
    /* 🔴 초등 저학년(6~9) — 어린이집(0~5)·유치원(3~5) 다음 문. 「방과후학교 참여율」·「늘봄학교」로 찾는 검색을 받는다 */
    { path: '/afterschool', priority: '0.8', changefreq: 'monthly' },
    /* 🔴 0~100세 전부 — 우리 이름값에 가장 맞는 자료다(완전생명표 1세별).
       「기대수명」·「65세 기대여명」·「몇 살까지 사나」로 찾는 검색을 받는다 */
    { path: '/years-left', priority: '0.9', changefreq: 'monthly' },
    /* 🔴 /years-left 의 다음 물음 — 남은 해가 다 건강한 해는 아니다.
       「건강수명」으로 찾는 검색을 받는다. ⛔ 한 수로 말하지 않는다(잣대에 따라 8.3년 다르다) */
    { path: '/healthy-years', priority: '0.8', changefreq: 'monthly' },
    /* 🔴 키즈 — 「맡길 데」 다음은 「아플 때 갈 데」다(2번 8/21 04:2x).
       ⛔ 제목·주소 어디에도 「소아과가 없다」로 쓰지 않는다. 이 표는 «의원»만 센다 */
    { path: '/pediatrics', priority: '0.8', changefreq: 'monthly' },
    /* 🔴 밤새 낸 여덟 장이 서로 모르고 있었다(2번 8/21 06:2x). 한 자리에 모으는 문이다.
       들어오게 하는 것과 머물게 하는 것은 다른 일이다 */
    { path: '/ages', priority: '0.9', changefreq: 'weekly' },
    /* 🔴 /ages 가 스스로 「70대 뒤가 얇습니다」라 적어 둔 자리를 채운다.
       /longest-job(53세에 그만둔다) 바로 다음 물음이다 */
    { path: '/keep-working', priority: '0.8', changefreq: 'monthly' },
    /* 🔴 /longest-job 의 짝 — 몇 살에 그만두었나의 반대쪽. 20~40대가 비어 있던 자리다(2번 07:2x) */
    { path: '/first-job', priority: '0.8', changefreq: 'monthly' },
    /* 🔴 /first-job 다음이 30대다 — 2번이 「20~40대가 비어 있다」 한 자리를 마저 채운다.
       ⛔ 이 지면의 뜻은 수 하나가 아니라 **두 수가 갈리는 까닭**이다 —
          평균 초혼 33.9세인데 30~34세 미혼이 67.4%다. 재는 것이 다르다 */
    { path: '/marriage-age', priority: '0.8', changefreq: 'monthly' },

    /* 🔴 /ages 가 스스로 「70대 뒤가 얇습니다」라 적어 둔 자리다.
       /keep-working 이 55~79세까지고 그 뒤가 통째로 비어 있었다 */
    { path: '/care', priority: '0.8', changefreq: 'monthly' },

    /* 🔴 사장님 「대입에 몰입하지 마」 — 그런데 10대 문이 /major 하나뿐이었다.
       ⛔ 제목은 10대인데 맨 위 칸은 20대다(19~29세 62.1%). 한 칸만 떼면 거짓이 된다 */
    { path: '/breakfast', priority: '0.8', changefreq: 'monthly' },

    /* 🔴 나이 줄에서 40대가 얇았다. 그 자리를 채운다.
       ⛔⛔ 이것은 «소유율»이 아니라 «구성비»다 — 그 나이대의 몇 %가 집을 가졌나가 아니라
          집을 가진 가구 가운데 그 나이대가 몇 %인가다. 지면·카드·영상 셋 다 그 말을 박았다 */
    { path: '/home', priority: '0.8', changefreq: 'monthly' },

    /* 🔴 2번 17시·19시 — 「40대 자리」. /home 은 맨 위 칸이 50대라 «제목까지 40대인 문»을 따로 지었다.
       ⛔ /age 가 이미 빚을 다루므로 빚은 안 건드린다 */
    { path: '/spending', priority: '0.8', changefreq: 'monthly' },
    /**
     * 🔴 2026-08-23 20:4x — **2번 실측: sitemap이 실제 지면의 4분의 1도 안 담고 있었다.**
     *
     *   여기 여덟 줄이 통째로 빠져 있었다 — 지면은 다 라이브인데(각자 페이지 만들 때
     *   자기 자신을 이 사이트맵에 넣는 것을 잊었다) 사이트맵에는 없어 검색엔진이 늦게
     *   찾거나 못 찾는 상태였다. `/after`·`/region` 때와 같은 실수가 여덟 번 겹친 것이다.
     * ⛔ 앞으로 이 갈래에 지면을 새로 내면 **여기 한 줄을 같이 넣는다.**
     */
    { path: '/pets', priority: '0.8', changefreq: 'monthly' },
    { path: '/travel', priority: '0.8', changefreq: 'monthly' },
    { path: '/promotion', priority: '0.8', changefreq: 'monthly' },
    { path: '/exercise', priority: '0.8', changefreq: 'monthly' },
    { path: '/oneperson', priority: '0.8', changefreq: 'monthly' },
    /* 🔴 2026-09-12 3번 신설 — 국회미래연구원 1인가구 증가 대응 방안(직접 수집). /oneperson과
       다른 자료 — 이쪽은 경제·주거·사회연결망 격차 */
    { path: '/oneperson-vulnerability', priority: '0.7', changefreq: 'yearly' },
    { path: '/lifelong', priority: '0.8', changefreq: 'monthly' },
    { path: '/retire-income', priority: '0.8', changefreq: 'monthly' },
    /* 「배움의 길」 첫 지면(2026-08-26 신설, 사장님 지시) — 폴리텍대학 학과·과정 */
    { path: '/polytech', priority: '0.8', changefreq: 'monthly' },
    /* 국민연금 수급현황(2026-08-26 신설, 사장님 지시) — 지역×나이 */
    { path: '/pension', priority: '0.8', changefreq: 'monthly' },
    /* 국민내일배움카드 훈련과정(2026-08-26 신설, 사장님 지시) — 지역별 개수 */
    { path: '/training-card', priority: '0.8', changefreq: 'weekly' },
    /* 「대학 이후」의 짝(2026-08-23 신설) — 여기서도 잊지 않는다 */
    { path: '/before', priority: '0.8', changefreq: 'monthly' },
    /* 🔴 2026-09-03 — 사장님 지시("질병관리청·소방청 데이터를 스스로 찾아라")로 낸 지면.
       ⛔⛔ 사장님이 "콘텐트 목표 달성했는데 방문자 1명이면 이유를 찾아 고쳐라"고 지적한
         뒤 check:100y:launch를 처음 돌려서 잡았다 — 이 세 줄이 통째로 빠져 있었다.
         지면은 라이브인데 사이트맵엔 없어 구글이 몰랐다. /after·/region·/pets 등에서
         반복된 것과 같은 실수를 오늘 또 세 번 했다 — 앞으로 새 고정 지면을 만들 때마다
         반드시 이 자리에 같은 커밋으로 넣는다. */
    { path: '/cardiac-arrest', priority: '0.8', changefreq: 'yearly' },
    { path: '/fall-injury', priority: '0.8', changefreq: 'yearly' },
    { path: '/volunteer', priority: '0.7', changefreq: 'yearly' },
    /* 🔴 2026-09-04 — 사장님이 하나금융연구소 뉴스 인용문을 주며 지시(「긁어올 수 있으면
       데이터를 가공해」). 원문 PDF 4쪽 Summary 표(결혼계획별 1인가구 세 유형)를 인용. */
    { path: '/single-intent', priority: '0.7', changefreq: 'yearly' },
    /* 🔴 2026-09-04 — 사장님이 원드라이브에 직접 쓰신 「독립 데이터포털 목록.md」에서
       건강보험심사평가원(HIRA) 빅데이터개방포털을 찾음. 국민건강보험공단과 다른 기관. */
    { path: '/medical-cost', priority: '0.7', changefreq: 'yearly' },
    /* 🔴 2026-09-05 — 사장님 지시로 medical-cost 안에서 실명축(질병명)을 찾다가
       HIRA 「다빈도질병 통계」를 새로 찾음. 짝지면으로 따로 냄(진료비는 「얼마나」,
       이 지면은 「무슨 병으로」). */
    { path: '/common-illness', priority: '0.7', changefreq: 'yearly' },
    /* 🔴 2026-09-05 — 이슈+축: 교육부 「서울대 10개 만들기」 첫 패키지 지원대학 발표(9/1)에
       기존 대학알리미 공시 축(취업률)을 붙임. */
    { path: '/university-package', priority: '0.7', changefreq: 'monthly' },
    /* 🔴 2026-09-05 — 5번 제안(KCW /cannot-see 처럼 「우리 자가 못 보는 것」을 지면으로).
       대학 취업률 자료 377곳 중 48곳이 비어 있는 이유를 분교·폐교·미확인으로 가른다. */
    { path: '/university-gap', priority: '0.6', changefreq: 'yearly' },
    /* 🔴 2026-09-05 — 이슈+축: 사장님이 공유하신 K-apt 서울 주차난 기사 + 사장님이
       직접 받아 주신 K-apt 웹참조자료 엑셀로 준공연도×세대당주차대수를 계산. */
    { path: '/apt-parking-age', priority: '0.7', changefreq: 'yearly' },
    /* 🔴 2026-09-06 — 사장님이 apt-parking-age 와 같은 K-apt 원자료에서
       「주차면보다 좋은 데이터」를 물으심 — 전기차 충전기 vs 보유대수를 계산. */
    { path: '/ev-charger-by-age', priority: '0.7', changefreq: 'yearly' },
    /* 🔴 2026-09-06 — /school 지면 2,371장의 학업중단 수치를 학교 이름 없이
       고교유형(일반고·특성화고·자율고·특목고) 넷으로만 묶은 새 지면. */
    { path: '/dropout-by-school-type', priority: '0.6', changefreq: 'yearly' },
    /* 🔴 2026-09-06 — 2번이 「재산세」 구글트렌드(9월 2기분 고지서 시즌) 갭을 찾아
       수집기·자가대조까지 넘겨줬다(커밋 a0a04107). 3번이 지면만 붙였다. */
    { path: '/property-tax', priority: '0.7', changefreq: 'yearly' },
    /* 🔴 2026-09-06 — 8번이 만들어 두고(2026-08-08~10) 지면으로 안 나가고 있던
       work-map.json(국민연금×KEDI, 공표치 대조까지 마침)을 지면화. */
    { path: '/work-gap', priority: '0.7', changefreq: 'yearly' },
    /* 🔴 2026-09-06 — 같은 8번 원자료(industry-life.json)의 다른 축 — 지금 살아
       있는 사업장의 나이. work-gap과 원자료는 같지만 겹치는 칸이 없다. */
    { path: '/business-age', priority: '0.7', changefreq: 'yearly' },
    /* 🔴 2026-09-06 — 뉴스 인용(「청년 취업자 45개월째 감소」)을 KOSIS 원자료로
       재계산해 검증. 8월 이후 값이 공표되면(다음 공표 9/9) 다시 재는 monthly. */
    { path: '/youth-employment-streak', priority: '0.8', changefreq: 'monthly' },
    /* 🔴 2026-09-07 — 커뮤니티 씨앗(「'80% 선발' 수시 원서접수」)을 계기로 통계청
       장래인구추계 18세 인구를 직접 재 확인. 매년 갱신되는 추계라 yearly. */
    { path: '/college-age-population', priority: '0.7', changefreq: 'yearly' },
    /* 🔴 2026-09-07 — 커뮤니티 씨앗(「철학과>컴공과 취업률 역전」)을 계기로
       이미 모은 major-outcomes.json을 새로 받지 않고 다시 계산해 지면화. */
    { path: '/major-name-gap', priority: '0.7', changefreq: 'yearly' },
    /* 🔴 2026-09-07 — 커뮤니티 씨앗(대입 정원·지역대학 위기)을 계기로 이미
       8번이 모은 closed-universities.json을 연대·지역·법인상태로 다시 묶음. */
    { path: '/closed-universities', priority: '0.7', changefreq: 'yearly' },
    /* 🔴 2026-09-07 — /major-name-gap(개별 학과 뒤집힘 사례)의 짝. 계열 전체
       집계로 보면 인문·공학 격차가 여전히 남는지, 이미 8번이 만든
       field-outcomes.json(교육부 공표치와 0.03% 안에서 맞춘 것)을 그대로 지면화. */
    { path: '/field-employment', priority: '0.7', changefreq: 'yearly' },
    /* 🔴 2026-09-07 — 커뮤니티 씨앗(「국·공립대 취업률 1위 목포해양대」)을 계기로
       이미 붙어 있던 pages-university.json의 취업률(대학알리미)로 분포만 다시 계산.
       ⛔ 「1위」로 뭉뚱그리지 않고 국공립 43곳 분포에서 자리를 그대로 보여 준다. */
    { path: '/university-employment-spread', priority: '0.7', changefreq: 'yearly' },
    /* 🔴 2026-09-07 — /college-age-population(18세 인구 감소)의 자연스러운 후속.
       이미 붙어 있던 pages-university.json의 재학생충원율(대학알리미)로 분포만
       다시 계산. 특정 학교를 「망했다」로 읽지 않고 분포 그대로 보여 준다. */
    { path: '/university-enrollment-fill', priority: '0.7', changefreq: 'yearly' },
    /* 🔴 2026-09-08 — 시도교육청이 하나씩 내는 2027학년도 수능 응시원서 접수 결과를
       모은다. 전국 KOSIS 표가 없어(확인함) 시도 발표를 직접 모았다 — 지금 경남·충북. */
    { path: '/csat-applicant-mix', priority: '0.7', changefreq: 'weekly' },
    /* 🔴 2026-10-22 · 1번 — 수능 D-28 · N수생 23년 만에 최대. 손님이 네이버에서 «시군구» 지면으로
       들어오는 것을 보고(5번 실측) 같은 이슈를 시군구·시도로 가른 두 장. */
    { path: '/repeat-rate-by-area', priority: '0.8', changefreq: 'yearly' },
    { path: '/n-su-ratio-by-province', priority: '0.8', changefreq: 'yearly' },
    /* 2026-10-22 저녁 · 1번 — 같은 축(지역 × 입시) 네 장 더. /report/area 에서 이리로 잇는다 */
    { path: '/university-rate-by-area', priority: '0.8', changefreq: 'yearly' },
    { path: '/junior-college-rate-by-area', priority: '0.8', changefreq: 'yearly' },
    { path: '/study-abroad-by-area', priority: '0.7', changefreq: 'yearly' },
    { path: '/dropout-by-area', priority: '0.8', changefreq: 'yearly' },
    { path: '/class-size-by-area', priority: '0.7', changefreq: 'yearly' },
    { path: '/teacher-ratio-by-area', priority: '0.7', changefreq: 'yearly' },
    { path: '/coed-school-by-area', priority: '0.7', changefreq: 'yearly' },
    { path: '/graduates-by-area', priority: '0.7', changefreq: 'yearly' },
    { path: '/century-old-high-schools-by-area', priority: '0.7', changefreq: 'yearly' },
    { path: '/private-high-school-by-area', priority: '0.7', changefreq: 'yearly' },
    { path: '/vocational-high-school-by-area', priority: '0.7', changefreq: 'yearly' },
    { path: '/special-purpose-high-school-by-area', priority: '0.7', changefreq: 'yearly' },
    { path: '/private-elementary-school-by-area', priority: '0.7', changefreq: 'yearly' },
    { path: '/adult-high-school-by-area', priority: '0.7', changefreq: 'yearly' },
    { path: '/online-high-school-by-area', priority: '0.7', changefreq: 'yearly' },
    { path: '/new-high-school-by-area', priority: '0.7', changefreq: 'yearly' },
    { path: '/national-high-school-by-area', priority: '0.7', changefreq: 'yearly' },
    { path: '/alternative-high-school-by-area', priority: '0.7', changefreq: 'yearly' },
    { path: '/tech-name-high-school', priority: '0.7', changefreq: 'yearly' },
    { path: '/high-school-age-by-area', priority: '0.7', changefreq: 'yearly' },
    { path: '/same-name-high-schools', priority: '0.7', changefreq: 'yearly' },
    { path: '/csat-applicants-by-province', priority: '0.8', changefreq: 'yearly' },
    { path: '/csat-math-choice-by-province', priority: '0.8', changefreq: 'yearly' },
    { path: '/csat-korean-choice-by-province', priority: '0.8', changefreq: 'yearly' },
    { path: '/csat-inquiry-subject-count', priority: '0.8', changefreq: 'yearly' },
    { path: '/csat-second-language-count', priority: '0.8', changefreq: 'yearly' },
    { path: '/csat-vocational-inquiry-by-province', priority: '0.8', changefreq: 'yearly' },
    { path: '/teacher-exam-competition-2027', priority: '0.8', changefreq: 'yearly' },
    { path: '/elementary-teacher-exam-2027', priority: '0.8', changefreq: 'yearly' },
    { path: '/gyeonggi-teacher-exam-2027', priority: '0.8', changefreq: 'yearly' },
    { path: '/private-school-teacher-exam-2027', priority: '0.7', changefreq: 'yearly' },
    { path: '/teacher-hiring-outlook-2030', priority: '0.7', changefreq: 'yearly' },
    { path: '/students-per-teacher-2026', priority: '0.7', changefreq: 'yearly' },
    { path: '/births-by-province-2026', priority: '0.8', changefreq: 'monthly' },
    { path: '/births-by-month-2026', priority: '0.8', changefreq: 'monthly' },
    { path: '/marriages-by-province-2026', priority: '0.8', changefreq: 'monthly' },
    { path: '/natural-decrease-by-province-2026', priority: '0.8', changefreq: 'monthly' },
    { path: '/births-by-city-2025', priority: '0.8', changefreq: 'monthly' },
    { path: '/mother-age-by-city-2025', priority: '0.7', changefreq: 'monthly' },
    { path: '/freshman-fill-by-province', priority: '0.8', changefreq: 'yearly' },
    { path: '/university-employment-by-province', priority: '0.8', changefreq: 'yearly' },
    { path: '/university-dropout-by-province', priority: '0.7', changefreq: 'yearly' },
    /* 🔴 2026-09-09 — 「사탐런」 씨앗. 같은 수능 지원자 안에서 탐구 과목 선택
       구성비(사탐만/과탐만/교차)가 2026→2027학년도 어떻게 바뀌었는지 — 위
       /csat-applicant-mix(자격별 지원자 수)와는 다른 축이다. */
    { path: '/csat-subject-choice', priority: '0.7', changefreq: 'yearly' },
    /* 🔴 2026-09-10 — 8/8에 「8번」이 만들고 지면이 없어 묵혀 있던 국민연금 가입
       사업장 교차자료 둘을 낸다. */
    { path: '/industry-region-cross', priority: '0.6', changefreq: 'yearly' },
    { path: '/industry-size-cross', priority: '0.6', changefreq: 'yearly' },
    /* 🔴 2026-09-10 — 같은 국민연금 원자료의 월상실률(3번, 0.58~12.16%)을 KOSIS
       142/DT_G26036(중소기업실태조사 공식 이직률)과 나란히 놓는다. 판정 없음. */
    { path: '/turnover-cross-check', priority: '0.6', changefreq: 'yearly' },
    /* 🔴 2026-09-10 — 고용24 RIASEC(PAR사 홀랜드 SDS, 상업이용 불가)의 대체로 O*NET
       Interest Profiler(CC BY 4.0) 자료를 새로 받아 낸다. */
    { path: '/onet-riasec', priority: '0.6', changefreq: 'yearly' },
    /* 🔴 2026-09-10 3번 신설 — 질병관리청 국민건강영양조사, 나이대별 건강검진 수진율(자기응답) */
    { path: '/health-checkup-rate', priority: '0.6', changefreq: 'yearly' },
    /* 🔴 2026-09-08 — 「지방국립대 무상교육」 뉴스 씨앗. 정책 효과는 말할 수 없어
       정책 시행 «전» 기준선(국공립·사립 재학생충원율·취업률)만 pages-university.json
       재계산으로 남긴다. */
    { path: '/university-founding-gap', priority: '0.7', changefreq: 'yearly' },
    /* 🔴 2026-09-08 — 오늘 커뮤니티 씨앗(신한대 바둑콘텐츠학과·숭실대 디지털금융AI
       계약학과·성균관대 인공지능학과 신설)을 계기로 이미 모은 major-outcomes.json을
       새로 받지 않고 다시 계산 — 신산업 이름 학과들의 취업률이 실제로 갈리는지 본다. */
    { path: '/trendy-major-outcomes', priority: '0.7', changefreq: 'yearly' },
    /* 🔴 2026-09-08 — 「동국대 취업률 2년 연속 하락」 씨앗. 학교 이름을 걸고 등수를
       매기지 않고, 대학알리미가 함께 공시하는 중도탈락률을 국공립·사립으로 갈라
       pages-university.json 재계산으로 기준선만 남긴다. */
    { path: '/university-dropout-rate', priority: '0.7', changefreq: 'yearly' },
    /* 🔴 2026-09-08 — 「지방국립대 무상교육」 씨앗. 학교 이름을 걸고 등수를 매기지 않고,
       대학알리미가 함께 공시하는 전임교원확보율을 국공립·사립으로 갈라
       pages-university.json 재계산으로 정책 시행 전 기준선만 남긴다. */
    { path: '/university-faculty-rate', priority: '0.7', changefreq: 'yearly' },
    /* 🔴 2026-09-08 — 「지방국립대 무상교육」 씨앗의 다섯 번째 지표. 국공립·사립 대신
       수도권·비수도권 축으로 신입생충원율을 pages-university.json 재계산으로 남긴다. */
    { path: '/freshman-fill-region', priority: '0.7', changefreq: 'yearly' },
    /* 🔴 2026-09-10 3번 — 9/9 에 낸 넷(remarriage·multicultural-marriage·birth-sex-ratio·
       fertility-rate)이 이 사이트맵에 빠져 있었다. 지면은 라이브인데 사이트맵엔 없는
       어긋난 상태 — /after·/region 때와 같은 실수. lastmod·llms.txt 도 같이 고친다. */
    { path: '/remarriage', priority: '0.7', changefreq: 'yearly' },
    { path: '/multicultural-marriage', priority: '0.7', changefreq: 'yearly' },
    { path: '/birth-sex-ratio', priority: '0.7', changefreq: 'yearly' },
    { path: '/fertility-rate', priority: '0.7', changefreq: 'yearly' },
    /* 🔴 2026-09-10 3번 신설 — 국가기술자격 취득 소요일수·필기 합격 횟수(등급별).
       공공데이터포털 15039800, 제한 없음. 8/15에 자료만 받고 지면이 없어 묵혀 있었다. */
    { path: '/qual-duration', priority: '0.7', changefreq: 'yearly' },
    /* 🔴 2026-09-10 3번 신설 — 나이띠별 국가기술자격 응시·합격(나이 축). 15037521, 제한 없음. */
    { path: '/qual-age', priority: '0.7', changefreq: 'yearly' },
    /* 🔴 2026-09-30 1번 신설 — 보건복지부 제2차 보건의료인력 실태조사(2026-09-29). 활동률
       (핵심 축)과 규모·증감·지역·성별·연령 짝 지면. 고정 지면을 만들면 여기 한 줄을 같이
       넣는다 — 안 넣으면 검색에 열려 있는데 사이트맵엔 없는 상태가 된다. */
    { path: '/health-workforce-activity-rate', priority: '0.7', changefreq: 'yearly' },
    { path: '/health-workforce-growth-2013-2023', priority: '0.7', changefreq: 'yearly' },
    /* 🔴 2026-09-30 1번 신설 — OECD 교육지표 2026, 학력별 고용률·상대임금(OECD평균 대비). */
    { path: '/oecd-employment-wage-gap-by-degree', priority: '0.7', changefreq: 'yearly' },
    /* 🔴 2026-10-02 — 사장님 지시(5번 경유). THE 세계대학순위 2027(서울대 국내 1위·세계 56위)
       신설 지면. QS 세계대학순위 2027과 맞댄 「순위+문제제기」 시리즈 신규편. */
    { path: '/ranking-university-the', priority: '0.7', changefreq: 'yearly' },
    /* 🔴 2026-10-02 1번 신설 — 국가데이터처 「2026 고령자 통계」(사장님 지시, 5번 경유). 돈의
       어긋남(순자산·연금·빈곤율)과 몇 살까지 일하나(근로의향·고용률) 두 지면. 고정 지면을 만들면
       여기 한 줄을 같이 넣는다 — 안 넣으면 검색에 열려 있는데 사이트맵엔 없는 상태가 된다. */
    { path: '/elderly-money-gap', priority: '0.8', changefreq: 'yearly' },
    { path: '/elderly-work-reason', priority: '0.8', changefreq: 'yearly' },
    /* 🔴 [2026-11-09 · 5번] **살아 있는데 사이트맵에 없던 62장을 한꺼번에 넣는다.**
       구글 색인 대장에서 `/rankings` 가 「Google에는 아직 알려지지 않은 URL입니다」로 찍혀
       원인을 찾다 발견했다. 고정 지면 235개를 사이트맵과 맞춰 보니 62장이 빠져 있었다.
       전부 200 으로 열려 있고 noindex 도 걸려 있지 않다 — 구글만 모르고 있었다.
       ⚠ 이 파일은 `/after`·`/region`·`/video` 에서 같은 일을 겪고 「고정 지면을 만들면
         여기 한 줄을 같이 넣는다」고 세 번 적어 두었다. 그런데 또 62장이 샜다.
         말로 적은 규칙은 지켜지지 않는다 — 그래서 검사를 새로 만들었다:
         `node scripts/check-100y-사이트맵-빠진화면.mjs` 가 소스의 고정 지면과 이 목록을 맞춰 본다. */
    { path: '/academy-lifespan', priority: '0.8', changefreq: 'monthly' },
    { path: '/all', priority: '0.9', changefreq: 'weekly' },
    { path: '/child-wellbeing', priority: '0.8', changefreq: 'monthly' },
    { path: '/class-size-distribution', priority: '0.8', changefreq: 'monthly' },
    { path: '/culture-attendance', priority: '0.8', changefreq: 'monthly' },
    { path: '/death-causes', priority: '0.8', changefreq: 'monthly' },
    { path: '/elderly-abuse-rate', priority: '0.8', changefreq: 'monthly' },
    { path: '/housework-spectrum-by-age', priority: '0.8', changefreq: 'monthly' },
    { path: '/housework-view-vs-reality', priority: '0.8', changefreq: 'monthly' },
    { path: '/income-inequality-by-age', priority: '0.8', changefreq: 'monthly' },
    { path: '/industry-pay-turnover', priority: '0.8', changefreq: 'monthly' },
    { path: '/industry-region-concentration', priority: '0.8', changefreq: 'monthly' },
    { path: '/kids-activity-lifespan', priority: '0.8', changefreq: 'monthly' },
    { path: '/labor-market-2072', priority: '0.8', changefreq: 'monthly' },
    { path: '/lifecycle-deficit', priority: '0.8', changefreq: 'monthly' },
    { path: '/military-age-men', priority: '0.8', changefreq: 'monthly' },
    { path: '/neighborhood-shop-lifespan', priority: '0.8', changefreq: 'monthly' },
    { path: '/networth-lifecycle', priority: '0.8', changefreq: 'monthly' },
    { path: '/nps-cap-region', priority: '0.8', changefreq: 'monthly' },
    { path: '/nps-cap-size', priority: '0.8', changefreq: 'monthly' },
    { path: '/oecd-elderly-poverty', priority: '0.8', changefreq: 'monthly' },
    { path: '/oecd-tertiary-employment-gap', priority: '0.8', changefreq: 'monthly' },
    { path: '/parent-support-view-by-age', priority: '0.8', changefreq: 'monthly' },
    { path: '/population-decline-regions', priority: '0.8', changefreq: 'monthly' },
    { path: '/public-transfers-by-age', priority: '0.8', changefreq: 'monthly' },
    { path: '/ranking-apartment-brand', priority: '0.7', changefreq: 'monthly' },
    { path: '/ranking-apartment-value', priority: '0.7', changefreq: 'monthly' },
    { path: '/ranking-bakery-brand', priority: '0.7', changefreq: 'monthly' },
    { path: '/ranking-capital-brand', priority: '0.7', changefreq: 'monthly' },
    { path: '/ranking-chicken-brand', priority: '0.7', changefreq: 'monthly' },
    { path: '/ranking-city-brand', priority: '0.7', changefreq: 'monthly' },
    { path: '/ranking-coffee-brand', priority: '0.7', changefreq: 'monthly' },
    { path: '/ranking-convenience-brand', priority: '0.7', changefreq: 'monthly' },
    { path: '/ranking-cosmetics-brand', priority: '0.7', changefreq: 'monthly' },
    { path: '/ranking-developer-brand', priority: '0.7', changefreq: 'monthly' },
    { path: '/ranking-eyewear-brand', priority: '0.7', changefreq: 'monthly' },
    { path: '/ranking-good-company', priority: '0.7', changefreq: 'monthly' },
    { path: '/ranking-hagwon', priority: '0.7', changefreq: 'monthly' },
    { path: '/ranking-hairsalon-brand', priority: '0.7', changefreq: 'monthly' },
    { path: '/ranking-insurance-agency-brand', priority: '0.7', changefreq: 'monthly' },
    { path: '/ranking-juniorcollege-brand', priority: '0.7', changefreq: 'monthly' },
    { path: '/ranking-kbo-salary', priority: '0.7', changefreq: 'monthly' },
    { path: '/ranking-lawmaker-wealth', priority: '0.7', changefreq: 'monthly' },
    { path: '/ranking-medical-quota', priority: '0.7', changefreq: 'monthly' },
    { path: '/ranking-petsupply-brand', priority: '0.7', changefreq: 'monthly' },
    { path: '/ranking-pizza-brand', priority: '0.7', changefreq: 'monthly' },
    { path: '/ranking-sangjo-brand', priority: '0.7', changefreq: 'monthly' },
    { path: '/ranking-tax-delinquent', priority: '0.7', changefreq: 'monthly' },
    { path: '/ranking-university-brand', priority: '0.7', changefreq: 'monthly' },
    { path: '/ranking-university-global', priority: '0.7', changefreq: 'monthly' },
    { path: '/ranking-university-nature-index', priority: '0.7', changefreq: 'monthly' },
    { path: '/ranking-usedcar-brand', priority: '0.7', changefreq: 'monthly' },
    { path: '/ranking-vleague-salary', priority: '0.7', changefreq: 'monthly' },
    { path: '/rankings', priority: '0.9', changefreq: 'weekly' },
    { path: '/region-pay-raw-vs-adjusted', priority: '0.8', changefreq: 'monthly' },
    { path: '/retirement-prep-by-age', priority: '0.8', changefreq: 'monthly' },
    { path: '/sandwich-generation', priority: '0.8', changefreq: 'monthly' },
    { path: '/school-type-gap', priority: '0.8', changefreq: 'monthly' },
    { path: '/social-trust-by-age', priority: '0.8', changefreq: 'monthly' },
    { path: '/tax-vs-wage', priority: '0.8', changefreq: 'monthly' },
    { path: '/twenties-jan-aug-employment', priority: '0.8', changefreq: 'monthly' },
    { path: '/work-family-priority-by-age', priority: '0.8', changefreq: 'monthly' },
    ...[25, 32, 40, 55, 68].map((나이) => ({
      path: `/age/${나이}`,
      priority: '0.7',
      changefreq: 'monthly',
    })),
    /* 층 대문 — 「50대 평균 연봉」·「60대 자산」처럼 **층으로 찾는 검색**을 받는 자리다.
       🔴 2026-08-09 03:5x — 지면을 내자마자 여기 넣는다. `/after`·`/region` 때
          **두 번 잊었고 두 번 다 검사가 잡았다.** 세 번째는 안 만든다.
       ⚠ 목록은 `src/lib/age-layer.ts` 의 `낼층` 에서 온다 — 두 곳에 적지 않는다. */
    ...(낼층 as readonly string[]).map((층) => ({
      path: `/life/${층}`,
      priority: '0.8',
      changefreq: 'monthly',
    })),
    // 학과가 학교보다 앞이다. 「어떤 길인가」가 「어느 학교인가」보다 먼저 오는 질문이다
    ...(majors as any[]).map((m) => ({
      path: m.url as string,
      priority: '0.8',
      changefreq: 'monthly',
    })),
    /* 대학 학과 837 — ⚠ 주소는 `학과주소()` 가 만든다. 지면과 **같은 함수**를 써야 어긋나지 않는다.
       ⚠ 여기서 인코딩하면 아래 `loc()` 이 한 번 더 해서 이중 인코딩된다. **날 이름**을 넘긴다 */
    ...((대학학과 as any).자료 as any[]).map((m) => ({
      path: `/college-major/${학과슬러그(m.학과)}`,
      priority: '0.7',
      changefreq: 'monthly',
    })),
    /* ⚠ **얇은 지면은 뺀다.** `school/[code].astro` 가 **같은 조건으로** noindex 를 건다.
       두 곳이 어긋나면 모순된 신호가 나간다.

       ⭐ 2026-08-06 — 조건이 하나 늘었다. 학교별 **학업중단 수치**가 붙은 지면은
         학과가 없어도 연다. 유형 평균이 아니라 **이 학교 하나의 숫자**라서다.
         실측 — 학교 2,525 = 학과 있음 1,172 + 학과 없지만 수치 있음 1,269 + 둘 다 없음 84 */
    ...(schools as any[])
      .filter(
        (s) => 검색에올릴만한가(s, 있나),
      )
      .map((s) => ({
        path: s.url as string,
        priority: '0.6',
        changefreq: 'monthly',
      })),
    ...(universities as any[]).map((u) => ({
      path: u.url as string,
      priority: '0.7',
      changefreq: 'monthly',
    })),
    /**
     * 🔴 2026-08-08 09:4x — **지역 한 벌 지면.** 258장 중 **무료로 연 것만** 넣는다.
     *
     *   ```
     *   10곳 이상 114장   한 벌로 판다  → 지면이 noindex 다. 여기 안 넣는다
     *   9곳 이하  144장   무료로 열었다 → 여기 넣는다
     *   ```
     *
     * ⚠ **`[slug].astro` 의 noindex 조건과 한 글자도 다르면 안 된다.** 둘 다
     *   `한벌로팔만한가(곳수)` 한 곳을 부른다 — 손으로 10 을 다시 적지 않는다.
     *   8/6 에 `/after` 가 「검색엔 열렸는데 사이트맵에 없음」으로 걸린 적이 있다.
     */
    ...((지역단위 as any).단위 as any[])
      /* 🔴 스위치는 `price.ts` **한 곳**이다. `[slug].astro` 의 noindex 가 같은 것을 부른다 —
         두 곳에 두면 한쪽만 켜져 「사이트맵엔 있는데 지면은 noindex」가 된다 */
      .filter((a) => 파는지면검색.연다 || !한벌로팔만한가(a.곳))
      .map((a) => ({
        path: `/report/area/${a.slug}`,
        priority: '0.6',
        changefreq: 'monthly',
      })),
    /**
     * 🔴 2026-08-08 10:1x — **학교 한 곳 리포트도 열었다.**
     *
     *   1번이 잡아 준 것 — *「무료로 열어도 noindex 면 광고가 안 된다」.*
     *   학교 한 곳은 통째로 열고 지역 묶음(114개 구)을 판다. **연 부분이 그대로 광고**다.
     *
     * ⚠ 목록이 `report/[code].astro` 의 `getStaticPaths` 와 **같아야 한다.**
     *   지금은 본보기 한 곳이라 여기 한 줄이다. 늘리면 **두 곳을 같이** 늘린다.
     */
    { path: '/report/7010057', priority: '0.7', changefreq: 'monthly' },
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    (e) =>
      `  <url><loc>${loc(e.path)}</loc>${lastmod(e.path)}<changefreq>${e.changefreq}</changefreq><priority>${e.priority}</priority></url>`,
  )
  .join('\n')}
</urlset>
`;
  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
