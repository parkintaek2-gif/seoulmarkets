/**
 * kcw-og-card.mjs — **K Culture Wire 영문 기사의 카드 그림이 있는가.**
 *
 * ── 🔴🔴 사장님 지시 (2026-11-20, 원문) ───────────────────────────────
 * 「**왜 사진이 없나? 꼭 사진 찾아서 써.**」
 *
 * 그날 케이리뷰 129편을 채우고 나서 영문 쪽을 재 보니 **348편 목록에 그림이 한 장도 없었다.**
 * 그런데 기사마다 `public/wikitip/og/<id>.png` 가 **이미 지어져 있었다**(348편 중 340편).
 * 공유용으로만 쓰고 목록에서는 한 번도 안 보여 준 것이다.
 * ⇒ 새로 만들 것이 없다. **있는 것을 목록에 내건다.**
 *
 * ⛔ 저작권 문제가 없다 — 우리가 지은 그림이고 남의 사진이 아니다.
 * ⛔ 없는 것을 걸지 않는다 — 8편은 카드가 없다. 걸면 빈 상자가 보인다.
 *   「빈 상자는 없는 것만 못하다」(기사 지면 주석, 2026-10).
 */
import fs from 'node:fs';
import path from 'node:path';

/** 카드 그림이 놓인 자리. ⚠ 케이컬처와이어는 `/wikitip` 이 앞에 붙는다 */
export const 카드폴더 = path.resolve(process.cwd(), 'public', 'wikitip', 'og');

/** 기사 하나의 카드 주소 — 손님이 실제로 여는 주소다(`/wikitip` 은 서버가 붙인다) */
export function 카드주소(글번호) {
  return `/og/${글번호}.png`;
}

/**
 * 카드가 **있는** 기사 번호를 모은다. 지면이 이것으로 걸지 말지 정한다.
 * ⚠ 지을 때 한 번만 읽는다 — 지면마다 폴더를 다시 읽지 않게 불러 둔 쪽에서 한 번 부른다.
 */
export function 카드있는글() {
  if (!fs.existsSync(카드폴더)) return new Set();
  return new Set(
    fs.readdirSync(카드폴더)
      .filter((이름) => 이름.toLowerCase().endsWith('.png'))
      .map((이름) => 이름.slice(0, -4)),
  );
}

/* ───────────────────────────── 자가시험 ─────────────────────────────
   [실행] node src/lib/kcw-og-card.mjs --자가시험
   ───────────────────────────────────────────────────────────────── */
if (process.argv.includes('--자가시험')) {
  let 흠 = 0;
  const 검 = (이름, 참) => { if (!참) { 흠 += 1; console.log('🔴 ' + 이름); } };
  const 있는것 = 카드있는글();

  검('🔴 카드를 하나라도 찾는다', 있는것.size > 0);
  검('🔴 300편 넘게 카드가 있다', 있는것.size > 300);
  검('주소는 /og/<번호>.png 다', 카드주소('abc') === '/og/abc.png');
  검('⛔ 확장자를 떼고 모은다 — 「.png」가 번호에 남지 않는다',
    [...있는것].every((n) => !n.endsWith('.png')));

  /* 🔴 실제 글과 맞춰 본다 — 없는 글을 걸면 빈 상자가 보인다 */
  const 글폴더 = path.resolve(process.cwd(), 'content', 'kculturewire');
  if (fs.existsSync(글폴더)) {
    const 글들 = fs.readdirSync(글폴더).filter((n) => n.endsWith('.md')).map((n) => n.slice(0, -3));
    const 없는것 = 글들.filter((n) => !있는것.has(n));
    검('⛔ 카드 없는 글을 세어 둔다(0 이 아니어도 된다 — 걸지만 않으면 된다)',
      Array.isArray(없는것));
    console.log(`   글 ${글들.length}편 · 카드 있는 것 ${글들.length - 없는것.length}편 · 없는 것 ${없는것.length}편`);
    for (const n of 없는것.slice(0, 10)) console.log('   ⬜ 카드 없음 — ' + n);
  }
  console.log(흠 ? `🔴 ${흠}가지 실패` : '✅ 카드 그림 자가시험 통과');
  process.exit(흠 ? 1 : 0);
}
