/**
 * bell-offline-guard.mjs — 비상벨의 «거짓경보» 막이.
 *
 * ── 왜 생겼나 (2026-09-21 19:40) ───────────────────────────────────────────
 * K Culture Wire 비상벨이 사장님께 「🔴 kculturewire 비상 6건」을 보냈다. 여섯 줄이
 * 전부 똑같았다 — `응답 fetch failed`. 4분 뒤에 재 보니 여섯 자리 다 200 이었다.
 *
 * ```
 * 19:40  홈·/most-read·/articles·/data·/llms.txt·/sitemap.xml  전부 fetch failed
 * 19:44  같은 여섯 자리                                        전부 200
 * ```
 *
 * ⭐ **사이트 여섯 곳이 같은 순간에 죽는 일은 없다. 끊긴 것은 «연결 하나»다.**
 *   `fetch failed` 는 HTTP 오류가 아니라 «닿지도 못했다»는 뜻이다(DNS·소켓).
 *   그런데 벨은 그것을 「지면이 깨졌다」로 읽고 사장님을 불렀다.
 *
 * ⚠ 더 뼈아픈 것 — `check-emergency-kcw.mjs` 168줄에 이미 이렇게 적혀 있었다.
 *   「자를 먼저 의심한다 — 모든 지면이 빨강이었고, 그것이 자의 흠이라는 신호였다.」
 *   그 교훈이 «한글 누출» 검사에만 걸려 있고 «가용성» 검사에는 안 걸려 있었다.
 *   ⇒ 겪어서 적은 규칙을 한 자리에만 걸면, 옆 자리에서 같은 사고가 다시 난다.
 *
 * ── 그래서 이 부품이 하는 일 셋 ────────────────────────────────────────────
 *  ① 닿지 못한 것(code 0)은 «한 번 더» 재고 판정한다 — 순간 끊김을 사고로 세지 않는다
 *  ② 그래도 전부 닿지 못했으면 «대조군»을 찔러 본다 (우리 통제 밖의 주소)
 *  ③ 대조군도 못 닿으면 → 우리 쪽 사고가 아니다. **사장님을 부르지 않는다.** 로그만 남긴다
 *
 * ⛔ 대조군이 «되는데» 우리만 안 되면 그것은 진짜 사고다. 그때는 반드시 부른다.
 *    이 막이는 경보를 줄이려는 것이지 «끄려는» 것이 아니다.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** 닿지도 못한 것인가 — HTTP 코드가 아니라 연결 자체가 실패한 것 */
export function 못닿았나(결과) {
  if (!결과) return false;
  return Number(결과.code) === 0;
}

/**
 * 여섯이 전부 못 닿았다 — 사이트가 아니라 «연결»을 의심할 자리인가.
 * ⚠ 하나만 못 닿은 것은 그 지면의 문제일 수 있다. 둘 이상이 «전부»일 때만 의심한다.
 */
export function 전부못닿았나(결과들) {
  const 것들 = (결과들 || []).filter(Boolean);
  if (것들.length < 2) return false;
  return 것들.every(못닿았나);
}

/**
 * 🔴🔴 [2026-11-14 · 5번] **「전부 403」도 같은 꼴이다 — 우리가 끊긴 것이다.**
 *
 * 오늘 아침 벨이 네 사이트에서 403 을 스물한 줄 적었다. 사이트는 멀쩡했다 —
 * **우리 보안 점검기가 /admin·/.env 를 두드려 우리 아이피가 침입막기에 끊긴 것**이다.
 * 침입막기는 401·403 이 10분에 열두 번을 넘으면 그 아이피를 끊는다.
 *
 * ⭐ 이 파일이 2026-09-21 에 적어 둔 말 그대로다 —
 *   **「사이트 여섯 곳이 같은 순간에 죽는 일은 없다」.**
 *   그때는 그것을 `code 0`(못 닿음)에만 걸었다. 오늘은 403 으로 왔다.
 *   ⇒ 겪어서 적은 규칙을 «한 가지 모양»에만 걸면 다른 모양으로 다시 온다.
 *
 * ⚠ 403 이 «섞여» 있으면 그것은 진짜 사고다 — 한 지면만 닫힌 것일 수 있다.
 *   전부일 때만 우리 쪽이 끊긴 것으로 본다.
 */
export function 우리가끊겼나(결과들) {
  const 것들 = (결과들 || []).filter(Boolean);
  if (것들.length < 2) return false;
  return 것들.every((x) => Number(x.code) === 403);
}

/**
 * 판정 — 부를 것인가, 삼킬 것인가.
 *
 * @param {boolean} 전부못닿음  위 `전부못닿았나` 의 답
 * @param {boolean|null} 대조군닿나  대조군에 닿았나 (안 재 봤으면 null)
 * @returns {{부른다:boolean, 까닭:string}}
 */
export function 부를까(전부못닿음, 대조군닿나, 우리끊김 = false) {
  /* 🔴 [2026-11-14] 전부 403 이면 사이트가 아니라 우리가 끊긴 것이다.
     ⛔ 사장님을 부르지 않는다 — 부르면 「늑대와 양치기 소년」이 된다.
     ✅ 대신 까닭을 또렷이 적는다. 10분 뒤에 저절로 풀린다. */
  if (우리끊김) {
    return { 부른다: false, 까닭: '네 사이트가 전부 403 이다 — 사이트가 아니라 «우리 아이피»가 침입막기에 끊겼다. 10분 뒤 다시 잰다' };
  }
  if (!전부못닿음) return { 부른다: true, 까닭: '진짜 사고다 — 일부만 깨졌다' };
  if (대조군닿나 === true) return { 부른다: true, 까닭: '대조군은 닿는데 우리만 못 닿는다 — 진짜 사고다' };
  if (대조군닿나 === false) return { 부른다: false, 까닭: '대조군도 못 닿는다 — 이 PC 가 바깥에 못 나간다. 우리 사고가 아니다' };
  return { 부른다: false, 까닭: '전부 못 닿았는데 대조군을 못 재 봤다 — 부르지 않고 로그만 남긴다' };
}

/** 대조군 — 우리 통제 «밖»의 주소여야 뜻이 있다. 우리 서버를 찌르면 같이 죽는다.
    env 로 바꿀 수 있게 둔 것은 «삼키는 길»을 실제로 시험해 보기 위해서다 —
    부르는 길은 사장님께 진짜 메일이 가므로 함부로 시험하지 않는다. */
export const 대조군주소 = process.env.BELL_CONTROL_URL || 'https://www.google.com/generate_204';

/**
 * 로그에 적을 시각 — **한국시간**.
 *
 * 🔴 [2026-09-21] 비상벨 넷이 전부 로그 시각을 틀리게 적고 있었다.
 *   19:40 에 난 사고가 `docs/비상벨.md` 에 **「10:40」**으로 남았다 —
 *   `new Date().toISOString()` 은 UTC 라 아홉 시간이 어긋난다.
 *   CLAUDE.md 가 「toISOString() 금지 · 9시간 더하기 금지」를 못박아 두었는데도
 *   비상벨 넷이 다 어기고 있었다. **사고 시각이 틀리면 이력이 쓸모가 없다.**
 *   ⚠ klifemap 벨은 `Date.now() + 9시간` 뒤 toISOString 이라 «이 PC 에서만» 우연히 맞는다 —
 *     UTC 로 도는 기계에 올리면 아홉 시간 앞선 시각을 찍는다.
 */
export function 지금시각() {
  const d = new Date();                     /* 이 PC 가 이미 KST 다 — 더하지도 빼지도 않는다 */
  const 두자리 = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${두자리(d.getMonth() + 1)}-${두자리(d.getDate())} `
    + `${두자리(d.getHours())}:${두자리(d.getMinutes())}`;
}

export async function 대조군재기(주소 = 대조군주소, 시간 = 8000) {
  try {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 시간);
    const r = await fetch(주소, { signal: ac.signal, headers: { 'User-Agent': 'bell-offline-guard' } });
    clearTimeout(t);
    return r.status > 0;
  } catch { return false; }
}

/* ── 자가시험 ─────────────────────────────────────────────────────────────
   쓰는 법  node tools/lib/bell-offline-guard.mjs --자가시험

   🔴 argv 만 보고 돌리면 «이 파일을 불러다 쓰는 쪽»의 자가시험을 가로챈다.
     처음 쓸 때 실제로 그랬다 — `check-emergency-kcw.mjs --자가시험` 을 쳤더니
     벨의 깨뜨림 시험 대신 이 부품의 시험이 돌고 그대로 종료됐다.
     ⇒ «내가 진입점일 때»만 돈다.                                            */
const 내가진입점 = (() => {
  try {
    const 나 = fileURLToPath(import.meta.url);
    const 부른것 = process.argv[1] ? path.resolve(process.argv[1]) : '';
    return 나 === 부른것;
  } catch { return false; }
})();
if (내가진입점 && (process.argv.includes('--자가시험') || process.argv.includes('--selftest'))) {
  const 잰다 = [];
  const 본다 = (이름, 참) => 잰다.push([이름, !!참]);

  본다('code 0 은 못 닿은 것이다', 못닿았나({ code: 0 }) === true);
  본다('500 은 닿은 것이다', 못닿았나({ code: 500 }) === false);
  본다('200 은 닿은 것이다', 못닿았나({ code: 200 }) === false);
  본다('빈 것은 못 닿은 것이 아니다', 못닿았나(null) === false);

  const 여섯다실패 = [0, 0, 0, 0, 0, 0].map((c) => ({ code: c }));
  본다('여섯이 전부 못 닿으면 연결을 의심한다', 전부못닿았나(여섯다실패) === true);
  본다('하나만 못 닿으면 의심하지 않는다', 전부못닿았나([{ code: 0 }]) === false);
  본다('하나가 200 이면 연결은 살아 있다', 전부못닿았나([{ code: 0 }, { code: 200 }]) === false);
  본다('500 이 섞이면 연결은 살아 있다', 전부못닿았나([{ code: 0 }, { code: 500 }]) === false);
  본다('빈 목록은 의심하지 않는다', 전부못닿았나([]) === false);

  본다('일부만 깨지면 부른다', 부를까(false, null).부른다 === true);
  본다('일부만 깨지면 대조군과 무관하게 부른다', 부를까(false, false).부른다 === true);
  본다('전부 못 닿아도 대조군이 되면 부른다', 부를까(true, true).부른다 === true);
  본다('전부 못 닿고 대조군도 안 되면 «안» 부른다', 부를까(true, false).부른다 === false);
  본다('대조군을 못 쟀으면 안 부른다', 부를까(true, null).부른다 === false);
  본다('안 부를 때 까닭을 말한다', 부를까(true, false).까닭.includes('우리 사고가 아니다'));

  /* 🔴 2026-09-21 에 실제로 일어난 꼴을 그대로 재현한다 */
  const 그날 = [0, 0, 0, 0, 0, 0].map(() => ({ code: 0, 오류: 'fetch failed' }));
  본다('9/21 19:40 의 꼴이면 사장님을 안 부른다', 부를까(전부못닿았나(그날), false).부른다 === false);
  본다('같은 꼴이라도 대조군이 되면 부른다', 부를까(전부못닿았나(그날), true).부른다 === true);

  /* 🔴 [2026-11-14] 「전부 403」 — 우리가 끊긴 꼴 */
  const 전부403 = [403, 403, 403, 403].map((c) => ({ code: c }));
  본다('전부 403 이면 우리가 끊긴 것이다', 우리가끊겼나(전부403) === true);
  본다('🔴 403 에 200 이 섞이면 우리가 끊긴 것이 아니다',
    우리가끊겼나([{ code: 403 }, { code: 200 }]) === false);
  본다('🔴 하나뿐이면 판단하지 않는다', 우리가끊겼나([{ code: 403 }]) === false);
  본다('🔴 404 가 섞이면 우리가 끊긴 것이 아니다',
    우리가끊겼나([{ code: 403 }, { code: 404 }]) === false);
  본다('빈 목록은 아니다', 우리가끊겼나([]) === false);
  본다('우리가 끊겼으면 사장님을 «안» 부른다', 부를까(false, true, true).부른다 === false);
  본다('안 부를 때 까닭에 «우리 아이피»가 들어간다',
    부를까(false, true, true).까닭.includes('우리 아이피'));
  본다('⛔ 끊김이 아니면 예전 그대로 부른다', 부를까(false, true, false).부른다 === true);

  본다('대조군은 우리 도메인이 아니다', !/kculturewire|klifemap|seoulmarkets|100yearmap/.test(대조군주소));

  /* 🔴 시각 — 19:40 사고가 「10:40」으로 남았던 자리 */
  const 이제 = 지금시각();
  본다('시각 꼴이 YYYY-MM-DD HH:MM 이다', /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(이제));
  본다('UTC 가 아니라 이 PC 시계와 같다', 이제.slice(11, 13) === String(new Date().getHours()).padStart(2, '0'));
  본다('날짜도 이 PC 와 같다', Number(이제.slice(8, 10)) === new Date().getDate());
  본다('toISOString 을 안 쓴다', !지금시각.toString().includes('toISOString'));
  본다('9시간을 더하지 않는다', !/9\s*\*\s*3600|3600\s*\*\s*9|32400/.test(지금시각.toString()));

  const 진 = 잰다.filter(([, v]) => !v);
  for (const [이름, v] of 잰다) console.log(`${v ? '✅' : '🔴'} ${이름}`);
  console.log(진.length ? `\n🔴 ${진.length}/${잰다.length} 떨어졌다` : `\n✅ ${잰다.length}가지 모두 통과`);
  process.exit(진.length ? 1 : 0);
}
