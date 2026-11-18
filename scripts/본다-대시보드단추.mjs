#!/usr/bin/env node
/**
 * 본다-대시보드단추.mjs — 클라우드타입 통 화면에 **어떤 단추가 있나** 읽기만 한다.
 *
 * ── 🔴 왜 (2026-11-18 · 5번) ─────────────────────────────────────────
 * 「배포하기」를 세 번 눌렀는데 통이 한 번도 다시 뜨지 않았다
 * (통 로그의 부팅 자국이 08:36 하나뿐이다. `ctype update` 도 마찬가지였다).
 * 다시 띄우는 다른 단추가 화면에 있는지 **지어내지 말고 눈으로 본다.**
 *
 * ⛔ 이 자는 **아무것도 누르지 않는다.** 읽기만 한다.
 * ⛔ `b.close()` 금지 — 사장님 창이 닫힌다. 언제나 새 탭, 그리고 그 자리에서 닫는다.
 *
 * 쓰는 법
 *   node scripts/본다-대시보드단추.mjs
 */
import { pathToFileURL, fileURLToPath } from 'node:url';
import { realpathSync } from 'node:fs';

export function 직접불렸나(argv1 = process.argv[1], 나 = import.meta.url) {
  if (!argv1) return false;
  try {
    const 편길 = (p) => { try { return realpathSync(p); } catch { return p; } };
    return process.platform === 'win32'
      ? pathToFileURL(편길(argv1)).href.toLowerCase() === pathToFileURL(편길(fileURLToPath(나))).href.toLowerCase()
      : pathToFileURL(편길(argv1)).href === pathToFileURL(편길(fileURLToPath(나))).href;
  } catch (e) { return false; }
}

export const 설정주소 = 'https://app.cloudtype.io/@parkintaek2/seoulmarkets:main/web';

if (직접불렸나()) {
  const { 새탭에서, 자리잡기, 재기 } = await import('./lib/cdp.mjs');
  const 본것 = await 새탭에서(설정주소, async (붙음) => {
    await 자리잡기(붙음);
    await new Promise((r) => setTimeout(r, 6000));
    return 재기(붙음, `(() => {
      const 글 = [...document.querySelectorAll('button,a,[role="button"],[role="menuitem"]')]
        .filter((x) => x.offsetParent !== null)
        .map((x) => (x.innerText || x.getAttribute('aria-label') || '').trim())
        .filter((t) => t && t.length <= 24);
      return JSON.stringify([...new Set(글)]);
    })()`, 60000);
  });
  let 목록 = [];
  try { 목록 = JSON.parse(String(본것)); } catch (e) { 목록 = []; }
  console.log('■ 화면에 보이는 단추 ' + 목록.length + '개');
  for (const t of 목록) console.log('   · ' + t);
}
