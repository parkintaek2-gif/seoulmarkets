/**
 * neis-school.mjs — NEIS 학교 원자료를 읽는 자. **초등·중등 빌더가 함께 쓴다.**
 *
 * 🔴 [2026-11-17] 중학교 빌더가 초등 빌더에서 이 함수들을 들여왔더니,
 *   들여오는 것만으로 **초등 빌더의 본문이 통째로 돌았다.** 모듈 맨 위 코드가
 *   실행되기 때문이다. `--자가시험` 을 주면 초등 자가시험이 돌고 끝나 버려
 *   중학교 자가시험은 한 번도 돌지 않았고, 그냥 돌리면 `elementary.json` 을
 *   덮어쓸 뻔했다.
 *   ⛔ 돌아가는 자에서 함수를 들여오지 않는다. 함수는 **돌지 않는 자리**에 둔다.
 *
 * ⛔ 이 파일은 아무것도 하지 않는다. 함수만 있다. 여기에 파일 쓰기를 넣지 않는다.
 */

/** ⚠ 올해를 붙박는다. 해가 바뀌면 「100년」의 뜻도 바뀐다 — 그때 다시 센다 */
export const 올해 = 2026;

/** 🔴 BOM 을 떼고 배열인 칸을 찾는다. 둘 중 하나만 빠뜨려도 통째로 죽는다 */
export function 읽기(글) {
  const s = 글.charCodeAt(0) === 0xFEFF ? 글.slice(1) : 글;
  const j = JSON.parse(s);
  return Array.isArray(j) ? j : (Object.values(j).find((v) => Array.isArray(v)) ?? []);
}

/** ⚠ 「전남광주통합특별시(광주)」→「전남광주통합특별시」. 괄호를 두면 한 시도가 둘이 된다 */
export const 시도씻기 = (s) => String(s ?? '').replace(/\s*\([^)]*\)\s*$/, '').trim();

/** 설립 연도. ⛔ 여덟 자리가 아니면 null — 지어내지 않는다 */
export function 설립연(x) {
  const v = String(x.FOND_YMD ?? '').replace(/-/g, '');
  return /^\d{8}$/.test(v) ? Number(v.slice(0, 4)) : null;
}
