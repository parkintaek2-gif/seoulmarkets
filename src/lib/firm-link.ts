/**
 * firm-link.ts — **회사 이름을 회사 지면으로 잇는 한 곳.**
 *
 * ── 왜 있나 ──────────────────────────────────────────────────────────────
 * 2026-08-29 에 지면마다 «들어오는 안쪽 링크»를 처음으로 전수로 셌다
 * (`scripts/measure-kcw-inbound.mjs`). 나온 것이 이렇다 —
 *
 * ```
 * 갈래        지면    아무 데서도 안 걸림   한 곳에서만 걸림   가운데
 * person      636         0                  0              9.5
 * title       560         4(접은 것)          0               18
 * firm         19         0                 11                1     ← 여기
 * ```
 *
 * 🔴 **회사 지면 19장 중 11장이 「한 곳」에서만 걸린다.** 그 한 곳은 목록 지면
 * `/firms` 하나다. 목록이 접히면 열아홉 장이 통째로 고립된다.
 *
 * 까닭은 작품 지면에 있었다. 작품 560장이 「누가 만들었나」 표를 싣는데,
 * 회사 이름을 **글자로만** 냈다 — `<td class="nm">{f.firm}</td>`.
 * 손님이 「Studio Dragon 이 만든 다른 것」으로 걸어갈 문이 거기 있었는데 안 열려 있었다.
 *
 * ⭐ 이것은 `person-link.ts`(사람)·`title-link.ts`(작품)와 **같은 규칙의 세 번째 자리**다.
 *   세 번 겪었으니 규칙으로 적어 둔다 — **「목록에 있다」와 「지면이 있다」는 다른 말이다.**
 *
 * ── 지키는 것 ────────────────────────────────────────────────────────────
 * ① **지면이 있는 회사만 건다.** 우리가 지면을 내는 회사는 열아홉뿐이고,
 *   그것은 「카탈로그를 온전히 볼 수 있는 회사」라는 기준으로 자료가 정한다.
 *   ⛔ 순위가 아니고, 목록에 있다고 훌륭한 회사라는 뜻도 아니다.
 * ② 지면이 없으면 **링크만 빼고 이름은 그대로 낸다.** 그 회사가 만든 것은 사실이다.
 * ③ ⛔ 이름이 겹치면 안 건다 — 손님을 «다른 회사»로 보내는 것은 안 거는 것보다 나쁘다.
 *
 * ⚠ Astro 의 `getStaticPaths` 는 따로 떼어 돌아간다 — 이 함수를 그 안에서 부르고
 *   지면이 쓸 것은 props 로 건넨다.
 */

export type 회사줄 = { firm?: string; slug?: string };

/** 이름을 견줄 수 있는 꼴로. ⛔ 점·쉼표는 지우지 않는다 — 「SHOWBOX Co., Ltd.」가 그 이름이다 */
export function 이름키(이름: unknown): string {
  return String(이름 ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * 이름 → 회사 지면 슬러그 표.
 * @returns 표(Map) 와 «겹쳐서 뺀» 이름 수
 */
export function 이름표만들기(회사들: 회사줄[] = []): { 표: Map<string, string>; 겹친수: number } {
  const 표 = new Map<string, string>();
  const 겹친것 = new Set<string>();
  for (const f of 회사들) {
    const k = 이름키(f?.firm);
    const s = String(f?.slug ?? '');
    if (!k || !s) continue;
    if (표.has(k) && 표.get(k) !== s) { 겹친것.add(k); continue; }
    표.set(k, s);
  }
  /* ⛔ 겹친 이름은 «아예 뺀다». 하나를 골라 걸면 손님이 다른 회사를 본다 */
  for (const k of 겹친것) 표.delete(k);
  return { 표, 겹친수: 겹친것.size };
}

/**
 * 지면이 있으면 주소를, 없으면 null 을 낸다.
 * 쓰는 쪽에서 `{주소 ? <a href={주소}>{이름}</a> : 이름}` 꼴로 쓴다.
 */
export function 회사주소(이름: unknown, 표: Map<string, string>): string | null {
  const s = 표.get(이름키(이름));
  return s ? `/firm/${s}` : null;
}
