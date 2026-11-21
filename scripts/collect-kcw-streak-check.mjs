/**
 * collect-kcw-streak-check.mjs — **팬 투표 앱의 「연속 1위 주차」가 실제로 읽히는 것과 같이 가나.**
 *
 * ── 씨앗 (2026-09-05 00:5x · 신문 제목 수집에서) ──────────────
 * 스타뉴스 10건 중 «넷»이 「연속 1위 주차」였다.
 * ```
 * 방탄소년단 진   마이원픽 131주 연속 1위 · 32개월 연속 월간 1위
 * 방탄소년단 진   아이돌픽 67주 연속 1위
 * 방탄소년단 지민  글로벌 인기투표 주간 1위 · 누적 220회 최다 1위
 * ```
 * ⭐ 아무도 답하지 않는 물음이 여기 있다 — **그 131주 동안 실제로 가장 많이 읽힌 사람도
 *   같은 사람이었나?** 팬 투표는 «누르는 것»이고 열람수는 «찾아보는 것»이다. 다른 잣대다.
 *
 * ── ⛔ 이 자가 «말하지 않는» 것 (가장 중요하다) ───────────────
 * ⛔ **팬 투표 앱의 순위를 검산하는 것이 아니다.** 우리는 그 앱의 주별 1위 명단이 없다.
 *   있는 것은 신문 제목이 옮긴 「131주 연속」이라는 «주장»뿐이다.
 * ⛔ 그러니 「그 주장이 맞다/틀렸다」를 말하지 않는다. 우리가 말할 수 있는 것은 하나다 —
 *   **「우리가 세는 잣대(영문 위키백과 열람수)로는 그 주들 중 N주에서 1위였다.」**
 * ⛔ 「누가 더 인기 있나」를 말하지 않는다. 이 지면은 «두 잣대가 어긋나는 자리»를 센다.
 * ⬜ 견주는 무리(비교군)를 우리가 골랐다는 것을 지면에 적는다 — 고른 무리를 바꾸면 답이 바뀐다.
 *
 * ── 우물 ──────────────────────────────────────────────────
 * 위키미디어 열람수 API. **열쇠가 없고 소급이 된다** — 실측으로 이름당 1,189일(약 170주)을 받았다.
 *   https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/...
 *
 * 쓰는 법  node scripts/collect-kcw-streak-check.mjs --자가시험
 *          node scripts/collect-kcw-streak-check.mjs --잰다
 *          node scripts/collect-kcw-streak-check.mjs --잰다 --적는다
 */
import fs from 'node:fs';
import path from 'node:path';

const 뿌리 = path.resolve(import.meta.dirname, '..');
/**
 * 견주는 사람들. **제목을 짐작하지 않고 위키백과 API 로 확인했다.**
 *
 * 🔴🔴 [2026-09-05 01:4x] **이것이 오늘 밤 가장 큰 위험이었다.**
 *   처음에 제목을 «짐작»으로 적었다 — `RM_(rapper)` · `Suga_(rapper)`.
 *   재 보니 그 둘은 넘겨주기이고 실제 지면은 `RM (musician)` · `Suga` 다.
 *   ```
 *   짐작한 제목   RM_(rapper)   18만회      Suga_(rapper)   35만회
 *   실제 지면     RM (musician) 213만회     Suga            205만회
 *   ```
 *   ⛔ **그대로 냈으면 실존 인물의 열람수를 10분의 1로 적었다.**
 *     「RM 은 V 보다 34배 덜 읽힌다」는 거짓을 지면에 실었을 것이다.
 *   ⭐ 살아난 까닭은 하나다 — **RM·Suga 수가 유별나게 낮아서 이상하게 여겼다.**
 *     수가 「그럴듯하게」 나왔으면 못 잡았다. 그러니 이상한 수를 그냥 넘기지 않는다.
 *
 * ⚠ 넘겨주기 합산은 «두 번 세는 것이 아니다» — 열람수 API 는 넘겨주기 제목에 온 조회를
 *   그 제목 아래 따로 센다. 그래서 더해야 «그 사람에게 온 것»이 다 모인다.
 *   ⛔ 다만 넘겨주기인지 «다른 지면»인지 반드시 확인한다. 아래 것은 API 로 확인했다.
 * ⬜ `Agust D` 는 넘겨주기가 «아니라» 따로 선 지면이다(음반·별명). 그래서 «안 더했다».
 *   더하면 사람 열람수에 음반 열람수를 섞는 것이 된다.
 */
export const 사람들 = [
  { 이름: 'V', 씨앗: 'V_(singer)' },
  /* ⭐ 이름을 «본 지면 이름»으로 적는다 — 위키백과가 Jung Kook 으로 옮겼다.
     처음엔 Jungkook 으로 적었는데 그것이 넘겨주기였다. 표와 제목이 어긋나면 안 된다. */
  { 이름: 'Jung Kook', 씨앗: 'Jungkook' },
  { 이름: 'Jimin', 씨앗: 'Jimin' },
  { 이름: 'Jin', 씨앗: 'Jin_(singer)' },
  { 이름: 'RM', 씨앗: 'RM_(musician)' },
  { 이름: 'J-Hope', 씨앗: 'J-Hope' },
  { 이름: 'Suga', 씨앗: 'Suga_(rapper)' },
];

/** 신문 제목이 옮긴 «주장». 우리가 잰 것이 아니라 남이 말한 것이다 — 갈라 적는다 */
export const 신문이옮긴주장 = {
  누가: 'Jin',
  몇주: 131,
  어디서: 'MyOnePick (마이원픽) — a Korean fan-vote app',
  옮긴곳: 'Star News, 2026-09-05',
  '⛔': '우리는 그 앱의 주별 1위 명단이 없다. 이 수를 검산하지 않는다.',
};

/** `2026-08-31` 이 든 주의 월요일(ISO 주 시작)을 돌려준다 */
export function 주시작(날짜글) {
  const d = new Date(`${String(날짜글).slice(0, 4)}-${String(날짜글).slice(4, 6)}-${String(날짜글).slice(6, 8)}T00:00:00Z`);
  if (Number.isNaN(+d)) return null;
  const 요일 = d.getUTCDay();                       // 0=일 … 6=토
  const 뒤로 = 요일 === 0 ? 6 : 요일 - 1;            // 월요일까지 며칠 뒤로
  d.setUTCDate(d.getUTCDate() - 뒤로);
  return d.toISOString().slice(0, 10);
}

/** 하루 열람수를 주별 합으로 모은다. `{ '2026-08-31': 1234, … }` */
export function 주별로모으기(하루들) {
  const 주 = new Map();
  for (const { 날, 수 } of 하루들 ?? []) {
    const w = 주시작(날);
    if (!w || !Number.isFinite(수)) continue;       // ⛔ 못 잰 날을 
    주.set(w, (주.get(w) ?? 0) + 수);
  }
  return Object.fromEntries([...주.entries()].sort());
}

/**
 * 주마다 누가 가장 많이 읽혔나. 같으면 «공동 1위»로 둘 다 적는다.
 * ⛔ 한 사람만 골라 적지 않는다 — 동률을 임의로 깨면 그것이 곧 주장이 된다.
 */
export function 주별1위(사람별주별) {
  const 모든주 = new Set();
  for (const 주별 of Object.values(사람별주별)) for (const w of Object.keys(주별)) 모든주.add(w);
  const 낸것 = {};
  for (const w of [...모든주].sort()) {
    let 최고 = -1;
    const 임자 = [];
    for (const [이름, 주별] of Object.entries(사람별주별)) {
      const v = 주별[w];
      if (!Number.isFinite(v)) continue;
      if (v > 최고) { 최고 = v; 임자.length = 0; 임자.push(이름); }
      else if (v === 최고) 임자.push(이름);
    }
    if (임자.length) 낸것[w] = { 일위: 임자.sort(), 수: 최고 };
  }
  return 낸것;
}

/**
 * 값들의 가운데 값.
 * 🔴 `Number(null) === 0` 이라 걸러내지 않으면 못 잰 주가 0 으로 섞인다.
 *   2026-09-04 에 `/label-reach` 에서 그 실수를 했다. 먼저 «진짜 수»만 남긴다.
 */
export function 가운데(값들) {
  const v = (값들 ?? []).filter((x) => typeof x === 'number' && Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : Math.round((v[m - 1] + v[m]) / 2);
}

/**
 * ⭐ **「1위였던 주 0주」를 「아무도 안 읽는다」로 읽으면 안 된다.**
 *   0주인 네 사람도 주마다 수만 회씩 읽힌다. 그래서 지면에 중간값을 «나란히» 싣는다.
 *   ⛔ 순위만 싣고 크기를 안 싣는 표는 사람을 잘못 읽게 만든다.
 */
export function 사람별중간(주별) {
  return 가운데(Object.values(주별 ?? {}));
}

/** 한 사람이 «몇 주에서» 1위였나. 공동 1위도 1위로 센다 */
export function 몇주1위(주별1위표, 이름) {
  return Object.values(주별1위표 ?? {}).filter((x) => x.일위.includes(이름)).length;
}

/** 연속으로 가장 길게 1위였던 주 수 */
export function 가장긴연속(주별1위표, 이름) {
  let 지금 = 0, 최고 = 0;
  for (const w of Object.keys(주별1위표 ?? {}).sort()) {
    if (주별1위표[w].일위.includes(이름)) { 지금 += 1; 최고 = Math.max(최고, 지금); }
    else 지금 = 0;
  }
  return 최고;
}

/**
 * 이 제목들이 «정말» 그 지면으로 넘겨주는가. 위키백과 API 로 묻는다.
 * ⛔ 넘겨주기가 아닌 것을 더하면 남의 지면 열람수를 그 사람 것으로 세게 된다.
 *   `Agust D` 가 그 예다 — 넘겨주기가 아니라 따로 선 지면이다.
 */
export async function 넘겨주기확인(제목들, 가져오기 = fetch) {
  const u = 'https://en.wikipedia.org/w/api.php?action=query&redirects=1&format=json&titles='
    + encodeURIComponent(제목들.join('|'));
  const r = await 가져오기(u, { headers: { 'User-Agent': 'KCultureWire/1.0 (u5@klifedesign.net)' } });
  if (!r.ok) return { 상태: r.status, 넘김: {} };
  const j = await r.json();
  const 넘김 = {};
  for (const x of (j?.query?.redirects ?? [])) 넘김[x.from] = x.to;
  return { 상태: 200, 넘김 };
}

/**
 * 씨앗 제목 하나로 **본 지면과 그리로 오는 넘겨주기 «전부»**를 우물에서 받는다.
 *
 * 🔴🔴 [2026-09-05 02:3x] **제목을 손으로 적는 방식이 세 번 틀렸다.**
 *   1) `RM_(rapper)` 18만회 → 본 지면은 `RM (musician)` 213만회
 *   2) `Suga_(rapper)` 35만회 → 본 지면은 `Suga` 205만회
 *   3) `Jungkook` 409만회가 **본 지면이 아니라 넘겨주기**였다 —
 *      본 지면은 `Jung Kook` 이고, 둘을 더해야 570만회다
 *   ⛔ 세 번 다 «사람의 열람수»를 크게 틀리게 셀 뻔했다. 손으로 적는 것을 그만둔다.
 * ✅ 그래서 우물에 두 번 묻는다 —
 *   1. `redirects=1` 로 씨앗이 어디로 넘어가는지 → **본 지면**을 얻는다
 *   2. `prop=redirects` 로 그 지면으로 오는 **넘겨주기 목록 전부**를 얻는다
 *   ⇒ 이제 내가 목록을 짐작하지 않는다. 우물이 알려 준 것만 더한다.
 * ⚠ 열람수 API 는 넘겨주기 제목에 온 조회를 그 제목 아래 «따로» 센다.
 *   그래서 본 지면 + 넘겨주기를 다 더해야 그 사람에게 온 것이 모인다.
 */
export async function 본지면과넘겨주기(씨앗, 가져오기 = fetch) {
  const 부르기 = async (질의) => {
    const r = await 가져오기(`https://en.wikipedia.org/w/api.php?${질의}&format=json`,
      { headers: { 'User-Agent': 'KCultureWire/1.0 (u5@klifedesign.net)' } });
    if (!r.ok) return null;
    return r.json();
  };
  const 첫 = await 부르기(`action=query&redirects=1&titles=${encodeURIComponent(씨앗)}`);
  if (!첫?.query) return { 본지면: null, 넘겨주기: [], 까닭: '우물이 답하지 않았다' };
  const 지면들 = Object.values(첫.query.pages ?? {});
  const 본지면 = 지면들[0]?.title ?? null;
  if (!본지면 || 지면들[0]?.missing !== undefined) return { 본지면: null, 넘겨주기: [], 까닭: '그런 지면이 없다' };
  const 둘 = await 부르기(`action=query&prop=redirects&rdlimit=max&titles=${encodeURIComponent(본지면)}`);
  const 쪽 = Object.values(둘?.query?.pages ?? {})[0];
  const 넘겨주기 = (쪽?.redirects ?? [])
    .filter((x) => x.ns === 0)                        // 본문 이름칸만. 이야기·사용자 쪽은 뺀다
    .map((x) => String(x.title).replace(/ /g, '_'));
  return { 본지면: 본지면.replace(/ /g, '_'), 넘겨주기, 까닭: null };
}

/* ── 우물에서 받기 ────────────────────────────────────────── */
export async function 하루열람수(위키제목, 시작, 끝, 가져오기 = fetch) {
  const u = 'https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia'
    + `/all-access/user/${encodeURIComponent(위키제목)}/daily/${시작}/${끝}`;
  const r = await 가져오기(u, { headers: { 'User-Agent': 'KCultureWire/1.0 (u5@klifedesign.net)' } });
  if (!r.ok) return { 상태: r.status, 하루들: [] };
  const j = await r.json();
  return {
    상태: 200,
    하루들: (j.items ?? []).map((x) => ({ 날: String(x.timestamp).slice(0, 8), 수: x.views })),
  };
}

/* ── 자가시험 ────────────────────────────────────────────── */
async function 자가시험() {
  let 든것 = 0, 깬것 = 0;
  const 재 = (무엇, 실제, 바람) => {
    const a = JSON.stringify(실제), b = JSON.stringify(바람);
    if (a === b) { 든것 += 1; } else { 깬것 += 1; console.log(`🔴 ${무엇}\n   나온것 ${a}\n   바람   ${b}`); }
  };

  /* 2026-09-05 는 토요일 → 그 주 월요일은 2026-08-31 */
  재('토요일의 주 시작은 그 주 월요일', 주시작('20260905'), '2026-08-31');
  재('월요일은 그날 그대로', 주시작('20260831'), '2026-08-31');
  재('일요일은 «앞선» 월요일로 간다', 주시작('20260906'), '2026-08-31');
  재('해를 넘어도 맞다', 주시작('20260101'), '2025-12-29');
  재('날짜가 아니면 null', 주시작('아무거나'), null);

  재('주별로 더한다',
    주별로모으기([{ 날: '20260831', 수: 10 }, { 날: '20260901', 수: 5 }, { 날: '20260907', 수: 7 }]),
    { '2026-08-31': 15, '2026-09-07': 7 });
  재('⛔ 못 잰 날을 ',
    주별로모으기([{ 날: '20260831', 수: 10 }, { 날: '20260901', 수: null }]),
    { '2026-08-31': 10 });
  재('빈 값', 주별로모으기(null), {});

  const 사람별 = {
    Jin: { '2026-08-24': 100, '2026-08-31': 50 },
    Jimin: { '2026-08-24': 80, '2026-08-31': 90 },
  };
  재('주마다 1위를 가른다', 주별1위(사람별),
    { '2026-08-24': { 일위: ['Jin'], 수: 100 }, '2026-08-31': { 일위: ['Jimin'], 수: 90 } });
  재('동률은 둘 다 적는다',
    주별1위({ A: { w: 5 }, B: { w: 5 } }), { w: { 일위: ['A', 'B'], 수: 5 } });
  재('한 사람 자료가 없는 주는 그 사람을 빼고 센다',
    주별1위({ A: { w: 5 }, B: {} }), { w: { 일위: ['A'], 수: 5 } });

  재('가운데 값 — 홀수', 가운데([3, 1, 2]), 2);
  재('가운데 값 — 짝수는 평균', 가운데([1, 2, 3, 4]), 3);
  재('🔴 null 을 0 으로 세지 않는다', 가운데([null, 10, 20]), 15);
  재('진짜 수가 없으면 null', 가운데([null, undefined]), null);
  재('사람별 중간값', 사람별중간({ w1: 10, w2: 30, w3: 20 }), 20);

  재('몇 주에서 1위였나', 몇주1위(주별1위(사람별), 'Jin'), 1);
  재('공동 1위도 1위로 센다', 몇주1위(주별1위({ A: { w: 5 }, B: { w: 5 } }), 'B'), 1);
  재('한 번도 아니면 0', 몇주1위(주별1위(사람별), 'V'), 0);

  const 긴것 = { w1: { 일위: ['A'] }, w2: { 일위: ['A'] }, w3: { 일위: ['B'] }, w4: { 일위: ['A'] } };
  재('가장 긴 연속을 센다', 가장긴연속(긴것, 'A'), 2);
  재('끊기면 다시 센다', 가장긴연속(긴것, 'B'), 1);
  재('없으면 0', 가장긴연속(긴것, 'C'), 0);

  /**
   * 🔴🔴 제목을 손으로 적어 세 번 틀렸던 자리 —
   *   RM_(rapper) 18만 / Suga_(rapper) 35만 / Jungkook 이 «넘겨주기»였다.
   *   ⇒ 이제 목록을 안 적는다. 씨앗 하나만 두고 우물에 묻는다.
   *   그래서 시험도 «목록이 맞나»가 아니라 «묻는 꼴이 맞나»를 잰다.
   */
  재('사람마다 씨앗 하나만 둔다',
    사람들.every((x) => x.씨앗 && !x.지면 && !x.넘겨주기), true);
  재('일곱 사람이다', 사람들.length, 7);
  {
    /* 가짜 우물 — 씨앗이 넘겨주기일 때 본 지면을 찾아내는지 잰다 */
    const 가짜우물 = async (u) => {
      if (u.includes('redirects=1')) {
        return { ok: true, json: async () => ({
          query: { pages: { 1: { title: 'Jung Kook' } }, redirects: [{ from: 'Jungkook', to: 'Jung Kook' }] },
        }) };
      }
      return { ok: true, json: async () => ({
        query: { pages: { 1: { title: 'Jung Kook', redirects: [
          { ns: 0, title: 'Jungkook' }, { ns: 0, title: 'Jeon Jung-kook' }, { ns: 1, title: 'Talk:Jung Kook' },
        ] } } },
      }) };
    };
    const 받은것 = await 본지면과넘겨주기('Jungkook', 가짜우물);
    재('씨앗이 넘겨주기면 본 지면을 찾는다', 받은것.본지면, 'Jung_Kook');
    재('넘겨주기 목록을 우물에서 받는다', 받은것.넘겨주기, ['Jungkook', 'Jeon_Jung-kook']);
    재('⛔ 이야기 이름칸(ns 1)은 안 더한다', 받은것.넘겨주기.includes('Talk:Jung_Kook'), false);
  }
  {
    const 없는우물 = async () => ({ ok: true, json: async () => ({
      query: { pages: { '-1': { title: 'X', missing: '' } } },
    }) });
    const 없는것 = await 본지면과넘겨주기('X', 없는우물);
    재('없는 지면은 본지면이 null 이고 까닭을 적는다',
      [없는것.본지면, 없는것.까닭], [null, '그런 지면이 없다']);
  }

  /* 우물 — 가짜 가져오기로 «부르는 꼴»만 잰다. 네트워크를 타지 않는다 */
  let 부른주소 = null;
  const 가짜 = async (u) => { 부른주소 = u; return { ok: true, json: async () => ({ items: [{ timestamp: '2026083100', views: 7 }] }) }; };
  return 하루열람수('Jin_(singer)', '20260101', '20260901', 가짜).then(({ 상태, 하루들 }) => {
    재('우물 응답을 우리 꼴로 바꾼다', { 상태, 하루들 }, { 상태: 200, 하루들: [{ 날: '20260831', 수: 7 }] });
    재('주소에 이름과 날이 든다',
      부른주소.includes('Jin_(singer)') && 부른주소.includes('/daily/20260101/20260901'), true);
    /**
     * 🔴 처음엔 약속(Promise)을 그대로 견줬다 — `{}` 와 `0` 을 비교해 깨졌다.
     *   ⛔ 약속을 기다리지 않고 견주면 «언제나» 깨지거나 «언제나» 통과한다.
     *     후자가 더 나쁘다 — 통과하는 시험은 아무도 다시 안 본다.
     */
    return 하루열람수('X', '1', '2', async () => ({ ok: false, status: 404 }))
      .then((막힌것) => {
        재('막히면 빈 목록을 돌려준다 — ', 막힌것, { 상태: 404, 하루들: [] });
        console.log(`\n자가시험 ${든것}가지 통과${깬것 ? ` · 🔴 ${깬것}가지 깨짐` : ''}`);
        return 깬것 === 0;
      });
  });
}

/* ── 본 일 ──────────────────────────────────────────────── */
async function 본일(적나) {
  const 끝 = '20260901';
  const 시작 = '20230601';                          // 실측으로 여기까지 내준다(약 170주)
  console.log(`# 팬 투표 「연속 1위」와 «읽힌 것»이 같이 가나 — ${시작}~${끝}\n`);
  console.log('⛔ 이 자는 팬 투표 앱 순위를 검산하지 않는다. 그 앱의 주별 명단이 우리에게 없다.');
  console.log('   우리가 말할 수 있는 것은 「우리 잣대로는 그 주들 중 몇 주에서 1위였나」까지다.\n');

  const 사람별주별 = {};
  const 막힌것 = [];
  const 받은제목표 = {};
  const 막힌제목표 = {};
  /* ⭐ 넘겨주기 제목에 온 조회도 그 사람에게 온 것이다 — 더해서 센다.
     ⛔ 다만 「정말 넘겨주는가」를 API 로 먼저 확인한다. 짐작으로 더하지 않는다. */
  for (const { 이름, 씨앗 } of 사람들) {
    const { 본지면, 넘겨주기, 까닭 } = await 본지면과넘겨주기(씨앗);
    if (!본지면) { 막힌것.push(`${이름}(${까닭})`); continue; }
    const 볼것 = [본지면, ...넘겨주기];
    const 안더한것 = [];
    if (본지면 !== 씨앗) {
      console.log(`     ⭐ ${이름} — 씨앗 「${씨앗}」은 넘겨주기다. 본 지면은 「${본지면}」`);
    }
    const 하루합 = new Map();
    let 받은제목 = 0;
    const 막힌제목 = [];
    /**
     * 🔴🔴 [2026-09-05 02:2x] **여기서 자료가 «조용히» 새고 있었다.**
     *   낱개로 부르면 200 인데, 한 번에 서른 번쯤 부르면 우물이 일부를 막는다(요청 제한).
     *   첫 판은 `if (상태 !== 200) continue;` 로 «조용히» 건너뛰고,
     *   화면에는 `볼것.length` 를 찍어 「제목 3개」라고 말했다.
     *   ⇒ Jin 은 넘겨주기 두 개가 빠진 채로 세어졌다(2,122,233 대신 2,306,329 이어야 한다).
     *   ⛔ **자가 「3개를 봤다」고 말하면서 1개만 본 것이다.** 조용히 성공한 척하는 꼴이다.
     * ✅ 그래서 셋을 고쳤다 —
     *   1. 부르는 사이에 «쉰다»(우물에 대한 예의이자, 막히지 않는 길이다)
     *   2. 막히면 «한 번 더» 부른다
     *   3. 그래도 막힌 제목을 «세어서 화면과 자료에 적는다». 0 으로 덮지 않는다
     */
    for (const t of 볼것) {
      let 받은것 = await 하루열람수(t, 시작, 끝);
      if (받은것.상태 !== 200) {
        await new Promise((r) => setTimeout(r, 1200));      // 한 박자 쉬고 다시
        받은것 = await 하루열람수(t, 시작, 끝);
      }
      if (받은것.상태 !== 200) { 막힌제목.push(`${t}(${받은것.상태})`); continue; }
      받은제목 += 1;
      for (const { 날, 수 } of 받은것.하루들) 하루합.set(날, (하루합.get(날) ?? 0) + (수 ?? 0));
      await new Promise((r) => setTimeout(r, 250));         // 다음 부름까지 쉰다
    }
    if (!받은제목) { 막힌것.push(`${이름}(못 받음)`); continue; }
    if (막힌제목.length) {
      console.log(`     🔴 ${이름} — 우물이 막은 제목 ${막힌제목.length}개: ${막힌제목.join(', ')}`);
      console.log('        ⛔ 그만큼 «덜 세어졌다». 0 으로 덮지 않고 이렇게 적는다.');
    }
    const 하루들 = [...하루합.entries()].map(([날, 수]) => ({ 날, 수 })).sort((a, b) => a.날.localeCompare(b.날));
    사람별주별[이름] = 주별로모으기(하루들);
    /* ⛔ 몇 제목을 더했고 몇 개가 막혔나를 «자료에» 남긴다 —
       처음엔 이 두 줄이 빠져 자료에 null 로 들어갔다. 투명성 칸을 조용히 비우지 않는다. */
    받은제목표[이름] = 받은제목;
    막힌제목표[이름] = 막힌제목;
    if (안더한것.length) {
      console.log(`     ⬜ ${이름} — 넘겨주기가 아니라서 «안 더한» 제목: ${안더한것.join(', ')}`);
    }
    console.log(`  ${이름.padEnd(10)} 제목 ${받은제목}/${볼것.length}개 받음 · 하루 ${하루들.length}일 → 주 ${Object.keys(사람별주별[이름]).length}주`);
  }
  if (막힌것.length) console.log(`\n  ⬜ 못 받은 사람 ${막힌것.length}명 — ${막힌것.join(', ')} (0 으로 안 채운다)`);
  if (Object.keys(사람별주별).length < 2) { console.log('\n🔴 견줄 사람이 둘도 안 된다 — 못 쟀다'); return true; }

  const 표 = 주별1위(사람별주별);
  const 전체주 = Object.keys(표).length;
  console.log(`\n## 견준 주 ${전체주}주 · 견준 사람 ${Object.keys(사람별주별).length}명\n`);

  const 줄 = Object.keys(사람별주별).map((이름) => ({
    이름,
    일위주: 몇주1위(표, 이름),
    가장긴연속: 가장긴연속(표, 이름),
    주중간: 사람별중간(사람별주별[이름]),
    합계: Object.values(사람별주별[이름]).reduce((a, b) => a + b, 0),
    받은제목: 받은제목표[이름] ?? null,
    막힌제목: 막힌제목표[이름] ?? [],
  })).sort((a, b) => b.일위주 - a.일위주 || (b.주중간 ?? 0) - (a.주중간 ?? 0));
  for (const x of 줄) {
    console.log(`  ${x.이름.padEnd(10)} 1위였던 주 ${String(x.일위주).padStart(3)}주 `
      + `(${String(Math.round((x.일위주 / 전체주) * 1000) / 10).padStart(4)}%) · 연속 ${String(x.가장긴연속).padStart(2)}주`
      + ` · 주 중간 ${(x.주중간 ?? 0).toLocaleString('en-US').padStart(7)}회`
      + ` · 합계 ${x.합계.toLocaleString('en-US').padStart(10)}회`);
  }

  const 주장 = 신문이옮긴주장;
  const 그사람 = 줄.find((x) => x.이름 === 주장.누가);
  console.log(`\n## 신문이 옮긴 주장과 나란히\n`);
  console.log(`  남이 말한 것   ${주장.누가} — ${주장.어디서} 에서 ${주장.몇주}주 연속 1위 (${주장.옮긴곳})`);
  console.log(`  우리가 잰 것   ${주장.누가} — 우리 잣대로 1위였던 주 ${그사람?.일위주 ?? '못 쟀다'}주 `
    + `· 가장 긴 연속 ${그사람?.가장긴연속 ?? '못 쟀다'}주`);
  console.log('  ⛔ 이것은 그 주장이 틀렸다는 말이 «아니다». 두 잣대가 다른 것을 센다는 말이다.');
  console.log('     팬 투표는 «누르는 것»이고 열람수는 «찾아보는 것»이다.');

  console.log('\n## ⬜ 이 자가 못 재는 것\n');
  console.log(`  · 팬 투표 앱의 주별 1위 명단 — 우리에게 없다. ${주장.몇주}주를 검산할 수 없다`);
  console.log('  · 견주는 무리를 «우리가 골랐다» — 일곱 사람이다. 무리를 바꾸면 답이 바뀐다');
  console.log('  · 영문 위키백과만 셌다. 다른 언어판은 이 셈에 없다');

  if (적나) {
    const 낼길 = path.join(뿌리, 'src/data/kcw-streak-check.json');
    fs.writeFileSync(낼길, `${JSON.stringify({
      잰때: new Date().toLocaleString('ko-KR'),
      무엇인가: '팬 투표 「연속 1위」 주장과, 우리가 세는 열람수 1위가 같이 가나',
      '⛔아닌것': '팬 투표 앱 순위의 검산이 아니다. 그 앱의 주별 명단이 우리에게 없다',
      출처: 'Wikimedia pageviews API (en.wikipedia, all-access, user) — 열쇠 없음·소급됨',
      기간: { 시작, 끝, 견준주: 전체주 },
      신문이옮긴주장: 주장,
      사람들: 줄,
      못재는것: [
        '팬 투표 앱의 주별 1위 명단이 없다',
        '견주는 무리를 우리가 골랐다(일곱 사람)',
        '영문 위키백과만 셌다',
      ],
    }, null, 1)}\n`);
    console.log(`\n✅ 적었다 — ${path.relative(뿌리, 낼길).replace(/\\/g, '/')}`);
  } else {
    console.log('\n⚠ 아직 안 적었다. 적으려면 --적는다');
  }
  return true;
}

const 인 = process.argv.slice(2);
const 이파일이시작인가 = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
if (이파일이시작인가) {
  if (인.includes('--자가시험')) 자가시험().then((ok) => process.exit(ok ? 0 : 1));
  else if (인.includes('--잰다')) 본일(인.includes('--적는다')).then((ok) => process.exit(ok ? 0 : 1));
  else { console.log('⛔ --자가시험 이나 --잰다 를 준다'); process.exit(1); }
}
