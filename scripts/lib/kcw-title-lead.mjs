/**
 * kcw-title-lead.mjs — **작품 지면의 첫 문단에 «나라 이름»을 세운다.**
 *
 * ── 왜 만드나 ───────────────────────────────────────────────
 * 2026-08-28 새벽 실측 —
 * ```
 *   갈래        표본 색인률
 *   /born-on      20/20 = 100%
 *   /group        16/20 =  80%
 *   /title        14/20 =  70%
 * ```
 * 그리고 「왜 title 만 낮은가」를 설명하려던 가설이 **넷 다 반증됐다** —
 * 인입 링크 수 · 지면 두께 · 자료 양 · 판박이 비율. 마지막으로 8/25 에 열 장만
 * 「깊게」 해 둔 실험을 읽었더니 **5/10 대 5/10, 대조군과 한 장도 안 달랐다**
 * (그때 손댄 크기가 판박이 83% → 82%, 즉 1%p 였다).
 *
 * ⭐ 남은 가설 하나 — **「남이 이미 답하는 물음이라 우리 지면이 더할 것이 적다」**.
 *   「Yesterday」·「Noise」·「Law School」은 IMDb·위키·넷플릭스가 이미 답한다.
 *   반대로 `/born-on` 이 답하는 「3월 20일에 태어난 한국 스타」는 아무도 안 세어 놨고,
 *   그 갈래는 스무 장이 스무 장 다 색인에 들어가 있다.
 *
 * 🔴 그러니 이 자가 하는 일은 하나다 — **우리만 가진 것을 첫 문단으로 끌어올린다.**
 *   우리만 가진 것은 「나라별·주별 자취」다. 그런데 첫 문단이
 *   「21 of 94 markets」 처럼 **수만 말하고 나라 이름을 한 번도 안 말하고 있었다.**
 *   손님이 치는 말은 「squid game countries」·「18 again netflix countries」다.
 *
 * ── ⛔ 이 자가 지키는 것 ────────────────────────────────────
 * ⛔ **줄세우지 않는다.** 「가장 인기 있는 나라」라 쓰지 않는다. 「가장 높이 오른 곳」·
 *    「가장 오래 머문 곳」은 취향이 아니라 **자리와 주 수**라 사실이다.
 * ⛔ **동점을 숨기지 않는다.** 같은 자리에 오른 나라가 여럿이면 여럿이라고 적는다.
 *    하나만 골라 적으면 없는 1등을 만드는 것이다.
 * ⛔ **자료가 없으면 그 문장을 안 쓴다.** 빈칸을 그럴듯한 말로 메우지 않는다.
 * ⚠ 나라 수가 하나뿐인 작품도 있다. 그때는 「여러 나라」라 쓰지 않는다.
 */

/**
 * 수로 바꾸되 **없는 것은 0 이 아니라 「없음」으로 둔다.**
 * 🔴 자가시험을 짜다 여기서 걸렸다 — `Number(null)` 은 **0** 이라 유한수를 통과한다.
 *   그대로 두면 `peak: null` 인 줄이 「0위에 올랐다」가 되어 **없는 1등을 만든다.**
 *   ⚠ 「못 잰 것을 」가 우리 강령인데, 자바스크립트가 조용히 채운다.
 */
export function 수(v) {
  if (v === null || v === undefined || v === '') return NaN;
  return Number(v);
}

/** 같은 값이면 다 가져온다 — 동점을 하나로 줄이지 않기 위해서다. */
export function 으뜸들(목록, 값뽑기, 큰것이으뜸 = true) {
  if (!Array.isArray(목록) || !목록.length) return [];
  const 쌍 = 목록.map((x) => [x, 값뽑기(x)]).filter(([, v]) => Number.isFinite(v));
  if (!쌍.length) return [];
  const 값들 = 쌍.map(([, v]) => v);
  const 끝 = 큰것이으뜸 ? Math.max(...값들) : Math.min(...값들);
  return 쌍.filter(([, v]) => v === 끝).map(([x]) => x);
}

/**
 * 나라 이름을 사람이 읽는 꼴로 잇는다.
 * ⚠ 넷을 넘으면 잘라 적고 «몇 곳 더»를 붙인다 — 스무 나라를 다 늘어놓으면 문단이 아니라 목록이 된다.
 */
export function 나라이어붙이기(이름들, 최대 = 4) {
  const a = (이름들 ?? []).filter(Boolean);
  if (!a.length) return null;
  if (a.length === 1) return a[0];
  if (a.length <= 최대) return `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`;
  return `${a.slice(0, 최대).join(', ')} and ${a.length - 최대} more`;
}

/**
 * 첫 문단에 쓸 «나라가 들어간» 사실들을 만든다.
 * @returns {{높이: string|null, 오래: string|null, 한꺼번에: string|null}}
 */
export function 나라사실(t) {
  const 시장 = Array.isArray(t?.byMarket) ? t.byMarket : [];
  const 빈답 = { 높이: null, 오래: null, 한꺼번에: null };
  if (!시장.length) return 빈답;

  /* ① 가장 «높이» 오른 곳 — 자리 번호는 작을수록 높다 */
  const 꼭대기 = 으뜸들(시장, (m) => 수(m.peak), false);
  const 꼭대기값 = 꼭대기.length ? 수(꼭대기[0].peak) : null;
  const 높이 = 꼭대기.length && Number.isFinite(꼭대기값)
    ? `reached number ${꼭대기값} in ${나라이어붙이기(꼭대기.map((m) => m.name))}`
    : null;

  /* ② 가장 «오래» 머문 곳 — 한 나라에서 차지한 자리 수가 곧 그 나라에서의 주 수다.
     ⚠ 꼭대기와 같은 나라면 같은 말을 두 번 하는 것이라 안 쓴다. */
  const 오래머문 = 으뜸들(시장, (m) => 수(m.places), true);
  const 오래값 = 오래머문.length ? 수(오래머문[0].places) : null;
  const 같은곳 = 오래머문.length === 꼭대기.length
    && 오래머문.every((m, i) => m.name === 꼭대기[i]?.name);
  const 오래 = (오래머문.length && Number.isFinite(오래값) && 오래값 > 1 && !같은곳)
    ? `stayed longest in ${나라이어붙이기(오래머문.map((m) => m.name))} — ${오래값} weeks`
    : null;

  /* ③ 한 주에 «가장 많은 나라»가 동시에 들고 있던 때 */
  const 한꺼번에 = (수(t?.atOnce) > 1 && t?.atOnceWeek)
    ? `was on ${t.atOnce} country charts at once in the week of ${t.atOnceWeek}`
    : null;

  return { 높이, 오래, 한꺼번에 };
}

/**
 * `<title>` 태그. **구글이 60자에서 자르므로 넘으면 예전 꼴로 되돌린다.**
 * ⛔ 잘리는 제목을 내보내는 것이 나라 이름을 넣는 것보다 나쁘다.
 */
export function 제목만들기(t, 한도 = 60) {
  const 예전 = `${t.title}: Netflix country by country, every week it charted`;
  const 시장 = Array.isArray(t?.byMarket) ? t.byMarket : [];
  const n = 수(t?.markets);
  if (!시장.length || !Number.isFinite(n)) return 예전;
  const 꼭대기 = 으뜸들(시장, (m) => 수(m.peak), false);
  if (!꼭대기.length) return 예전;
  const 나라 = 꼭대기.length === 1 ? 꼭대기[0].name : `${꼭대기.length} countries`;
  /**
   * ⭐ 낱말을 **「countries」로** 고른 것은 취향이 아니라 잰 것이다.
   *   `find-missing-words.mjs` 가 8/26 에 집어낸 것 — `/title/18-again` 이
   *   「18 again netflix **countries**」로 노출을 받는데(평균순위 11.5~17.2)
   *   제목이 「country by country」라 그 말을 못 담고 있었다.
   * ⛔ 「country charts」로 쓰면 손님이 친 말과 어긋난다. 한 나라뿐이면 단수로 쓴다.
   */
  const 판 = n === 1 ? '1 country' : `${n} countries`;

  /**
   * 🔴 [2026-08-28] 처음에는 「넘치면 예전 꼴」 하나뿐이었는데, 556장에 돌려 보니
   *   **112장이 예전 꼴로 되돌아갔고 그 예전 꼴 자체가 60자를 넘었다.**
   *   되돌린 자리가 «더 나쁜» 자리였다. 방패가 방패 노릇을 못 한 것이다.
   * ⭐ 그래서 짧은 판을 차례로 둔다. 다 넘치면 **가장 짧은 것**을 고른다 —
   *   어차피 잘릴 바에는 덜 잘리는 쪽이 낫다.
   * ⛔ 다만 «작품 이름»은 어느 판에서도 안 뺀다. 그것이 손님이 친 말이다.
   */
  /**
   * ⚠ [2026-08-28] 556장에 돌려 보고 잡은 것 — Squid Game 이
   *   **「No.1 in 93 countries, charted in 93 countries」**로 나왔다. 같은 수를 두 번 말한다.
   *   꼭대기에 오른 나라 수와 오른 나라 수가 «같은» 작품(어디서나 1위)에서 난다.
   *   ⛔ 눈으로 한 장만 봤으면 못 봤다. 556장을 다 돌려 봐야 이런 것이 나온다.
   */
  const 겹쳐말함 = 꼭대기.length > 1 && 꼭대기.length === n;
  const 후보 = [
    겹쳐말함
      ? `${t.title}: No.${꼭대기[0].peak} in every one of ${판}`
      : `${t.title}: No.${꼭대기[0].peak} in ${나라}, charted in ${판}`,
    `${t.title}: No.${꼭대기[0].peak} in ${나라}`,
    `${t.title}: charted in ${판}`,
    예전,
  ];
  return 후보.find((s) => s.length <= 한도)
    ?? 후보.slice().sort((a, b) => a.length - b.length)[0];
}

/* ── 자가시험 ─────────────────────────────────────────────── */
if (process.argv[1] && process.argv[1].endsWith('kcw-title-lead.mjs')) {
  let 통과 = 0;
  const T = (이름, 참) => { if (참) { 통과 += 1; return; } console.error(`  ✗ ${이름}`); process.exitCode = 1; };

  T('동점을 다 가져온다', 으뜸들([{ p: 1 }, { p: 1 }, { p: 3 }], (x) => x.p, false).length === 2);
  T('빈 목록은 빈 답', 으뜸들([], (x) => x.p).length === 0);
  T('숫자가 아닌 것은 안 센다', 으뜸들([{ p: null }, { p: 2 }], (x) => 수(x.p), false)[0].p === 2);

  T('하나면 그대로', 나라이어붙이기(['Japan']) === 'Japan');
  T('둘이면 and', 나라이어붙이기(['Japan', 'Peru']) === 'Japan and Peru');
  T('셋이면 쉼표+and', 나라이어붙이기(['A', 'B', 'C']) === 'A, B and C');
  T('많으면 잘라 적고 몇 곳 더', 나라이어붙이기(['A', 'B', 'C', 'D', 'E', 'F']) === 'A, B, C, D and 2 more');
  T('빈 것은 null', 나라이어붙이기([]) === null);

  const 견본 = {
    title: 'Dream',
    markets: 21,
    atOnce: 20,
    atOnceWeek: '2023-07-30',
    byMarket: [
      { name: 'Bahrain', places: 1, peak: 7 },
      { name: 'Bangladesh', places: 2, peak: 1 },
      { name: 'Hong Kong', places: 3, peak: 3 },
    ],
  };
  const 사실 = 나라사실(견본);
  T('가장 높이 오른 나라를 말한다', 사실.높이 === 'reached number 1 in Bangladesh');
  T('가장 오래 머문 나라를 말한다', 사실.오래 === 'stayed longest in Hong Kong — 3 weeks');
  T('한꺼번에 몇 나라였나를 말한다', /20 country charts at once/.test(사실.한꺼번에));

  const 겹침 = 나라사실({ byMarket: [{ name: 'Japan', places: 5, peak: 1 }, { name: 'Peru', places: 1, peak: 4 }] });
  T('꼭대기와 가장 오래가 같은 나라면 두 번 말하지 않는다', 겹침.오래 === null);

  T('자료가 없으면 문장을 안 만든다', 나라사실({}).높이 === null);
  T('한 주만 있으면 「오래 머물렀다」를 안 쓴다',
    나라사실({ byMarket: [{ name: 'A', places: 1, peak: 2 }, { name: 'B', places: 1, peak: 5 }] }).오래 === null);
  T('한 나라뿐이어도 안 깨진다', 나라사실({ byMarket: [{ name: 'Peru', places: 2, peak: 4 }] }).높이 === 'reached number 4 in Peru');
  T('나라가 하나면 「countries」 라고 안 쓴다', /charted in 1 country$/.test(제목만들기({ title: 'X', markets: 1, byMarket: [{ name: 'Peru', places: 1, peak: 3 }] })) || 제목만들기({ title: 'X', markets: 1, byMarket: [{ name: 'Peru', places: 1, peak: 3 }] }).includes('1 country,') === false);

  T('제목에 나라가 들어간다', 제목만들기(견본) === 'Dream: No.1 in Bangladesh, charted in 21 countries');
  T('제목이 60자를 넘으면 «짧은 판»으로 줄인다 — 예전 꼴로 안 돌아간다',
    제목만들기({ ...견본, title: 'A'.repeat(40) }).length <= 60);
  T('어느 판도 안 맞으면 가장 짧은 것을 고른다(작품 이름은 안 뺀다)', (() => {
    const r = 제목만들기({ ...견본, title: 'A'.repeat(90) });
    return r.length <= 90 + 25 && r.startsWith('A'.repeat(90));
  })());
  T('자료가 없으면 예전 제목', 제목만들기({ title: 'X' }).endsWith('every week it charted'));

  console.log(`자가시험 ${통과}개 통과`);
}
