/**
 * 학교알리미 학교별 숫자를 **시·군·구로 더한다** — 지역 × 입시 지면들이 같이 쓴다.
 *
 * ## 왜 따로 뺐나 (2026-10-22 · 1번)
 *
 *   /repeat-rate-by-area 를 낸 뒤 같은 셈을 네 장(4년제 진학 · 전문대 진학 · 국외 진학 ·
 *   학업중단)에 또 써야 했다. 장마다 베껴 쓰면 한 곳만 고쳐지고 나머지가 틀린 채 남는다.
 *   그리고 /report/area 지면이 «이 동네 줄»을 같은 셈으로 꺼내 보여야 한다 — 숫자가
 *   두 지면에서 달라지면 안 된다. 그래서 한 곳에 둔다.
 *
 * ## 지키는 것
 *
 *   ⛔ 학교 비율을 평균 내지 않는다. **분자·분모를 각각 더해서** 나눈다.
 *   ⛔ 못 가른 주소(세종 등)는 「기타」로 뭉치지 않고 뺀다 — `지역가르기` 가 null 을 준다.
 *   ⛔ 분모가 문턱 아래인 곳은 표에서만 빼고 전체 셈에는 넣는다.
 */
import schools from '../data/100yearmap/pages-school.json';
import { 단위 as 전체지역 } from '../data/100yearmap/areas.json';
import { 지역가르기 } from './school-area';

export type 지역셈 = {
  열쇠: string;
  시도: string;
  이름: string;
  분모: number;
  분자: number;
  곳: number;
  률: number;
};

const 학교표 = new Map((schools as any[]).map((x) => [String(x.code), x]));
const 슬러그표 = new Map((전체지역 as any[]).map((a) => [a.열쇠, a.slug]));

/** /report/area/<slug> 주소. 지역 목록에 없으면 null — 없는 주소를 지어내지 않는다 */
export const 지역링크 = (열쇠: string) =>
  슬러그표.get(열쇠) ? `/report/area/${슬러그표.get(열쇠)}` : null;

/**
 * @param 행들  학교알리미 행 (code 가 있어야 한다)
 * @param 갈래  고교유형을 거르는 식. null 이면 모든 갈래
 * @param 뽑기  행 → { 분모, 분자 }. 셀 수 없는 행이면 null
 */
export function 시군구로더함(
  행들: any[],
  갈래: RegExp | null,
  뽑기: (r: any) => { 분모: number; 분자: number } | null,
) {
  const 셈 = new Map<string, Omit<지역셈, '열쇠' | '률'>>();
  for (const r of 행들) {
    const x: any = 학교표.get(String(r.code));
    if (!x) continue;
    if (갈래 && !갈래.test(String(x.고교유형 ?? ''))) continue;
    const 값 = 뽑기(r);
    if (!값 || !(값.분모 > 0)) continue;
    const g = 지역가르기(x.주소);
    if (!g) continue;
    const v = 셈.get(g.열쇠) ?? { 시도: g.시도, 이름: g.이름, 분모: 0, 분자: 0, 곳: 0 };
    v.분모 += 값.분모;
    v.분자 += 값.분자;
    v.곳 += 1;
    셈.set(g.열쇠, v);
  }
  const 모든곳: 지역셈[] = [...셈.entries()].map(([열쇠, v]) => ({
    열쇠, ...v, 률: v.분모 ? (v.분자 / v.분모) * 100 : 0,
  }));

  const 시도셈 = new Map<string, { 분모: number; 분자: number }>();
  for (const x of 모든곳) {
    const v = 시도셈.get(x.시도) ?? { 분모: 0, 분자: 0 };
    v.분모 += x.분모; v.분자 += x.분자;
    시도셈.set(x.시도, v);
  }
  const 시도들 = [...시도셈.entries()]
    .map(([이름, v]) => ({ 이름, ...v, 률: v.분모 ? (v.분자 / v.분모) * 100 : 0 }))
    .sort((a, b) => b.률 - a.률);

  const 전체분모 = 모든곳.reduce((s, x) => s + x.분모, 0);
  const 전체분자 = 모든곳.reduce((s, x) => s + x.분자, 0);
  return {
    모든곳,
    시도들,
    전체분모,
    전체분자,
    전체률: 전체분모 ? (전체분자 / 전체분모) * 100 : null,
    /** 문턱을 넘은 곳만, 비율 큰 순 */
    올린곳: (문턱: number) => 모든곳.filter((x) => x.분모 >= 문턱).sort((a, b) => b.률 - a.률),
  };
}

export const 중간값 = (a: number[]) => {
  if (!a.length) return null;
  const b = [...a].sort((x, y) => x - y);
  const m = b.length >> 1;
  return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2;
};

/**
 * /report/area 가 «이 동네 줄»을 꺼내 쓰는 다섯 축. 지면 258장이 같은 셈을 되풀이하지 않게
 * 한 번만 센다. ⚠ 각 지면(/repeat-rate-by-area 등)과 **같은 갈래·같은 분자분모**여야 한다 —
 * 여기를 고치면 그 지면도 따라 고친다.
 */
let 입시줄캐시: any = null;
export function 입시줄들(진로행: any[], 중단행: any[]) {
  if (입시줄캐시) return 입시줄캐시;
  const 진 = 진로행.filter((r) => typeof r.진학률 === 'number');
  const 일자 = /일반고|자율고/;
  const n = (v: any) => Number(v) || 0;
  입시줄캐시 = [
    { 길: '/university-rate-by-area', 이름: '4년제 대학 진학률', 문턱: 300,
      셈: 시군구로더함(진, 일자, (r) => ({ 분모: n(r.졸업자), 분자: n(r.대학교) })) },
    { 길: '/junior-college-rate-by-area', 이름: '전문대 진학률', 문턱: 300,
      셈: 시군구로더함(진, 일자, (r) => ({ 분모: n(r.졸업자), 분자: n(r.전문대학) })) },
    { 길: '/repeat-rate-by-area', 이름: '대학에 바로 안 간 비율(재수 등)', 문턱: 300,
      셈: 시군구로더함(진, 일자, (r) => ({ 분모: n(r.졸업자), 분자: n(r.그밖) })) },
    { 길: '/study-abroad-by-area', 이름: '해외 대학 진학', 문턱: 300, 명수: true,
      셈: 시군구로더함(진, null, (r) => ({ 분모: n(r.졸업자), 분자: n(r.국외) })) },
    { 길: '/dropout-by-area', 이름: '학업중단율(재학생 대비)', 문턱: 900,
      셈: 시군구로더함(중단행, 일자, (r) => ({ 분모: n(r.재학생), 분자: n(r.학업중단) })) },
  ].map((축) => ({ ...축, 줄: 축.셈.올린곳(축.문턱) }));
  return 입시줄캐시;
}

/**
 * /report/area 의 «학교 환경» 두 축 — 학급당 학생 수 · 남녀공학 비율 (2026-10-23 · 5번 요청).
 * ⚠ /class-size-by-area · /coed-school-by-area 와 같은 셈·같은 문턱이어야 한다.
 * 줄 은 «큰 값이 위»로 세운다. 값글자 는 그 지면이 쓰는 단위 그대로.
 */
let 환경줄캐시: any = null;
export function 학교환경줄들(학급행: any[], 학교행: any[]) {
  if (환경줄캐시) return 환경줄캐시;
  const n = (v: any) => Number(v) || 0;
  const 학급 = 시군구로더함(학급행, null, (r) => ({ 분모: n(r.학급), 분자: n(r.학생) }));
  const 평균 = (x: 지역셈) => (x.분모 ? x.분자 / x.분모 : 0);
  const 학교들 = 학교행.filter((x) => x.종류 === '고등학교' && /^(남여공학|남|여)$/.test(String(x.공학 ?? '')));
  const 공학 = 시군구로더함(학교들, null, (x) => ({ 분모: 1, 분자: x.공학 === '남여공학' ? 1 : 0 }));
  환경줄캐시 = [
    { 길: '/class-size-by-area', 이름: '고등학교 학급당 학생 수(한 반 학생 수)', 셈: 학급,
      줄: 학급.모든곳.filter((x) => x.분모 >= 30).sort((a, b) => 평균(b) - 평균(a)), 값: 평균,
      값글자: (x: 지역셈) => `${평균(x).toFixed(1)}명` },
    { 길: '/coed-school-by-area', 이름: '남녀공학 고등학교 비율', 셈: 공학,
      줄: 공학.올린곳(5), 값: (x: 지역셈) => x.률,
      값글자: (x: 지역셈) => `${x.률.toFixed(1)}%` },
  ];
  return 환경줄캐시;
}

/** 한 줄 세우기 안에서 몇 번째인가 (1부터). 없으면 null */
/* ⚠ 같은 값은 같은 순위다 — 공학 100% 인 곳이 48곳인데 줄 순서대로 세면 «30위»로 보였다 */
export const 몇째 = (줄: 지역셈[], 열쇠: string, 값: (x: 지역셈) => number = (x) => x.률) => {
  const 나 = 줄.find((x) => x.열쇠 === 열쇠);
  if (!나) return null;
  const v = Math.round(값(나) * 1000);
  return 1 + 줄.filter((x) => Math.round(값(x) * 1000) > v).length;
};
