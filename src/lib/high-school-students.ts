/**
 * 고등학교 «학생 수 기준» 페이지 여섯 장이 같이 쓰는 합산·분위 도구 (2026-11-28 · 1번)
 *
 * 행은 high-school-province.ts 의 고교들을 그대로 쓴다. 여기서 한 일은 학생·학급·수업교원을 더하고 나눈 것뿐이다.
 * 학생·학급 값이 없는 학교(학교 코드로 못 이은 곳)는 합계에서 뺀다 — 0 으로 채우지 않는다.
 * ⛔ 「수업교원」을 「교원 수」라 쓰지 않는다. 공표 교원수와 세는 범위가 다르다(교장·교감·보건·상담 등 제외).
 */
import { 고교들, 수, 퍼글, 중앙, type 고교행 } from './high-school-province';

export { 고교들, 수, 퍼글, 중앙 };
export type { 고교행 };

/** 학생 수가 있는 학교만 */
export const 값있는 = 고교들.filter((r) => r.학생 !== null && r.학급 !== null && r.학급 > 0) as (고교행 & { 학생: number; 학급: number })[];
export const 못이은 = 고교들.length - 값있는.length;

export const 합 = (a: 고교행[], f: (r: 고교행) => number | null) => a.reduce((s, r) => s + (f(r) ?? 0), 0);

/** 분위수 (선형 보간). p 는 0~1 */
export function 분위(값: number[], p: number): number | null {
  if (!값.length) return null;
  const b = [...값].sort((x, y) => x - y);
  const i = (b.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return b[lo] + (b[hi] - b[lo]) * (i - lo);
}

export const 소수1 = (n: number | null) => (n === null ? '—' : n.toFixed(1));

/** 키 함수로 묶는다 */
export function 묶기<T>(행들: T[], 키: (r: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const r of 행들) {
    const k = 키(r);
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(r);
  }
  return m;
}

export const 시도순서 = (행들: 고교행[]) => [...묶기(행들, (r) => r.시도).keys()].filter(Boolean);
