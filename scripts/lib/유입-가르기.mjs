/**
 * lib/유입-가르기.mjs — 「어디서 왔나」와 「사람인가」를 가르는 규칙 한 곳.
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔴 왜 한 곳에 두나 — 같은 규칙을 두 자가 따로 들고 있으면 한쪽만 고쳐진다.
 *   2026-11-18 에 영어 두 사이트에만 수집기 기준을 대고 케이라이프맵에 안 대서
 *   우리 결제 점검 1,171세션을 손님으로 적어 사장님께 올렸다.
 *
 * ⛔ direct 를 «버리지» 않는다 — 케이라이프맵 direct 는 252초 머물고 11.2장을 본다
 * ⛔ 「수집기다」라고 확정하지 않는다. 세 가지가 다 걸릴 때만 「가깝다」고 쓴다
 */

/** 유입원을 세 갈래로 가른다. ⛔ 모르는 것을 direct 로 밀어 넣지 않는다 */
export function 유입갈래(유입원) {
  const s = String(유입원 ?? '').trim().toLowerCase();
  if (!s) return '못 쟀다';
  if (s === '(direct)' || s === 'direct' || s === '(not set)') return '직접';
  if (/^(chatgpt\.com|chat\.openai\.com|perplexity\.ai|www\.perplexity\.ai|copilot\.microsoft\.com|gemini\.google\.com|claude\.ai)$/.test(s)) return 'AI';
  return '검색·링크';
}

/**
 * 🔴 **우리 점검이 첫 지면으로 여는 자리인가.**
 *   손님은 결제창·로그인 화면을 «첫 지면»으로 열지 않는다.
 * ⛔ 두 번째로 들른 결제창을 걸러 내는 것이 아니다 — 첫 지면일 때만이다.
 */
export function 우리점검지면인가(경로) {
  return /^\/(checkout|login|dashboard)(\.html)?(\?|$|\/)/i.test(String(경로 ?? ''));
}

/**
 * 「사람일 가능성이 낮다」를 가린다. ⛔ 확정이 아니다 — 셋이 다 걸릴 때만이다.
 * 머문 시간이 짧고 · 사람당 지면이 1.0 이고 · 한 나라에 쏠리면 수집기에 가깝다.
 */
export function 수집기에가까운가({ 머문초, 사람당지면, 한나라몫 }) {
  let 표 = 0;
  if (Number(머문초) <= 20) 표 += 1;
  if (Number(사람당지면) <= 1.1) 표 += 1;
  if (Number(한나라몫) >= 0.6) 표 += 1;
  return 표 >= 3;
}
