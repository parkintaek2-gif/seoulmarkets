/**
 * 고등학교 시도별 페이지 여섯 장이 같이 쓰는 학교 행 (2026-11-27 · 1번)
 *
 * 출처  NEIS 학교기본정보(고교유형·공학·설립·설립일·주소) — pages-school.json
 *       학교알리미 2024 공시 「학년별·학급별 학생수」 — school-class-size.json (학생·학급·수업교원)
 * 두 표는 학교 코드로 잇는다. 이은 학교만 학생·학급 값을 갖고, 못 이은 학교는 값이 null 이다(0 으로 채우지 않는다).
 * ⛔ 시도 이름은 NEIS 의 지역 칸을 쓴다. 「전남광주통합특별시(전남)」·「(광주)」는 따로 센다.
 */
import schools from '../data/100yearmap/pages-school.json';
import classSize from '../data/100yearmap/school-class-size.json';
import { 지역가르기 } from './school-area';

export type 고교행 = {
  code: string;
  이름: string;
  시도: string;
  구: string;
  구열쇠: string;
  유형: string;
  공학: string;
  설립: string;
  설립연: number | null;
  학생: number | null;
  학급: number | null;
  교원: number | null;
  학급당: number | null;
  교원당: number | null;
};

const 시도이름 = (s: string) =>
  s === '전남광주통합특별시(전남)' ? '전남' : s === '전남광주통합특별시(광주)' ? '광주' : s;

const 값표 = new Map((classSize as any).자료.map((r: any) => [String(r.code), r]));

export const 고교들: 고교행[] = (schools as any[])
  .filter((x) => x.종류 === '고등학교')
  .map((x) => {
    const g = 지역가르기(x.주소);
    const 시도 = 시도이름(String(x.지역 ?? ''));
    const 구 = g ? g.이름 : '';
    const v: any = 값표.get(String(x.code));
    const 연 = Number(String(x.설립일 ?? '').slice(0, 4));
    return {
      code: String(x.code),
      이름: x.title,
      시도,
      구,
      구열쇠: g ? `${시도} ${구}` : '',
      유형: String(x.고교유형 ?? ''),
      공학: String(x.공학 ?? ''),
      설립: String(x.설립 ?? ''),
      설립연: Number.isFinite(연) && 연 > 1800 ? 연 : null,
      학생: v ? v.학생 : null,
      학급: v ? v.학급 : null,
      교원: v ? v.수업교원 : null,
      학급당: v ? v.학급당학생 : null,
      교원당: v ? v.교원1인당학생 : null,
    };
  });

export const 공시표출처 = (classSize as any).출처 as {
  이름: string; 공시항목: string; 공시연도: string; 이용허락범위: string;
};
export const 받은때 = (classSize as any).통계.받은때 as string;

export const 수 = (n: number) => Number(n).toLocaleString('ko-KR');
export const 퍼 = (a: number, b: number) => (b ? (a / b) * 100 : 0);
export const 퍼글 = (a: number, b: number) => `${퍼(a, b).toFixed(1)}%`;
export const 중앙 = (a: number[]) => {
  if (!a.length) return null;
  const b = [...a].sort((x, y) => x - y);
  const m = b.length >> 1;
  return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2;
};

/** 시도별 묶음 — 행 거름식과 «센다» 식으로 */
export function 시도로(행들: 고교행[], 센다: (r: 고교행) => boolean) {
  const 맵 = new Map<string, { 이름: string; 곳: number; 센곳: number }>();
  for (const r of 행들) {
    if (!r.시도) continue;
    const a = 맵.get(r.시도) ?? { 이름: r.시도, 곳: 0, 센곳: 0 };
    a.곳 += 1;
    if (센다(r)) a.센곳 += 1;
    맵.set(r.시도, a);
  }
  return [...맵.values()].sort((a, b) => 퍼(b.센곳, b.곳) - 퍼(a.센곳, a.곳) || b.센곳 - a.센곳);
}

/** 시군구별 묶음 — 학교 최소 수 이상인 곳만 «올린곳», 그 아래는 «빠진곳» */
export function 구로(행들: 고교행[], 센다: (r: 고교행) => boolean, 최소: number) {
  const 맵 = new Map<string, { 시도: string; 구: string; 곳: number; 센곳: number }>();
  for (const r of 행들) {
    if (!r.구열쇠) continue;
    const a = 맵.get(r.구열쇠) ?? { 시도: r.시도, 구: r.구, 곳: 0, 센곳: 0 };
    a.곳 += 1;
    if (센다(r)) a.센곳 += 1;
    맵.set(r.구열쇠, a);
  }
  const 모두 = [...맵.values()];
  const 올린곳 = 모두
    .filter((x) => x.곳 >= 최소)
    .sort((a, b) => 퍼(b.센곳, b.곳) - 퍼(a.센곳, a.곳) || b.센곳 - a.센곳);
  return { 모두, 올린곳, 빠진곳: 모두.length - 올린곳.length };
}
