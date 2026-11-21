#!/usr/bin/env node
/**
 * 멤버 대 그룹 — 솔로가 자기 그룹만큼 읽히나
 *
 * 왜 이것을 재나 (2026-09-10 아침 신문 제목에서 나왔다)
 *   동아일보 「제니 ‘드라큘라’ 빌보드 톱10 15주…BTS ‘버터’와 타이」
 *   ⇒ 이슈는 「솔로가 그룹만큼 간다」다. 그런데 그것을 «사람이 얼마나 찾나»로 잰 곳이 없다.
 *     차트 자료는 라이선스가 걸리지만 위키미디어 열람수는 열쇠가 없고 CC0 다.
 *
 * ⭐ 우리 축: 그룹 문서 하나 대 그 그룹 «멤버 문서들». 두 가지를 가른다 —
 *   1  멤버 «한 사람»이 그룹 문서를 넘어섰나          (누가 그룹보다 크나)
 *   2  멤버 «합»이 그룹 문서의 몇 배인가              (그룹이라는 이름이 얼마나 남았나)
 *   ⚠ 2 는 합이라 부풀 수 있으므로 1 을 «먼저» 낸다. 합만 내면 오늘 아침 잘못을 되풀이한다.
 *
 * 🔴 429 를 만나면 다시 받는다 — 오늘 두 문서가 429 로 비었고, 그 상태로 합을 내면
 *   한쪽이 짧아져 결론이 기운다. 표본을 전량인 척하지 않는다.
 *
 * 쓰는 법
 *   node scripts/collect-kcw-member-vs-group.mjs --자가시험
 *   node scripts/collect-kcw-member-vs-group.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * 🔴 낼 이름을 바꿨다 — 2026-09-10 14:30
 *   처음에 'src/data/kcw-member-vs-group.json' 로 냈다. 그런데 그 파일이 «09-08부터 있던
 *   남의 자료»(380팀 축)였고, /member-vs-group 지면이 39줄에서 그것을 읽고 있었다.
 *   ⇒ 내 수집기가 그것을 덮어 «전체 빌드»가 섰다. 여섯이 다 배포를 못 했다.
 *   ⛔ 「없을 것 같은 이름」을 짐작해서 쓰지 않는다. 낼 곳이 이미 있는지 «먼저 본다».
 */
export const 낼곳 = 'src/data/kcw-group-vs-members-panel.json';
export const 판 = 'en';
export const 창 = { 처음: '20250901', 끝: '20260831' };
export const 창말 = 'September 2025 to August 2026';

export const 무리 = [
  {
    그룹: 'BLACKPINK', 그룹문서: 'Blackpink',
    멤버: [
      { 이름: 'Jennie', 문서: 'Jennie_(singer)' },
      { 이름: 'Lisa',   문서: 'Lisa_(rapper)' },
      { 이름: 'Rosé',   문서: 'Rosé_(singer)' },
      { 이름: 'Jisoo',  문서: 'Jisoo' },
    ],
  },
  {
    그룹: 'BTS', 그룹문서: 'BTS',
    멤버: [
      { 이름: 'RM',       문서: 'RM_(rapper)' },
      { 이름: 'Jin',      문서: 'Jin_(singer)' },
      { 이름: 'Suga',     문서: 'Suga_(rapper)' },
      { 이름: 'J-Hope',   문서: 'J-Hope' },
      { 이름: 'Jimin',    문서: 'Jimin' },
      { 이름: 'V',        문서: 'V_(singer)' },
      { 이름: 'Jungkook', 문서: 'Jungkook' },
    ],
  },
  {
    그룹: 'aespa', 그룹문서: 'Aespa',
    멤버: [
      // ⚠ Karina_(singer) 는 «다른 사람»에게 넘어간다(열람수 3,493). 이어짐 관문이 잡아 줬고,
      //   Aespa 문서가 «거는 것»에서 맞는 이름을 찾았다. 이름을 짐작하지 않는다.
      { 이름: 'Karina',  문서: 'Karina_(South_Korean_singer)' },
      { 이름: 'Winter',  문서: 'Winter_(singer)' },
      { 이름: 'Giselle',문서: 'Giselle_(singer)' },
      { 이름: 'Ningning',문서: 'Ningning' },
    ],
  },
];

/* ── 재는 함수들 ─────────────────────────────────────────────────── */

/** ⛔ 빈 것은 null (0 이 아니다) */
export function 접기(items) {
  if (!Array.isArray(items) || items.length === 0) return { 합: null, 첫달: null, 마지막달: null, 달수: 0 };
  const 수 = items.map((x) => Number(x?.views)).filter((n) => Number.isFinite(n) && n >= 0);
  if (수.length === 0) return { 합: null, 첫달: null, 마지막달: null, 달수: 0 };
  return { 합: 수.reduce((a, b) => a + b, 0), 첫달: 수[0], 마지막달: 수[수.length - 1], 달수: 수.length };
}

export function 배수(위, 아래) {
  if (!Number.isFinite(위) || !Number.isFinite(아래) || 아래 <= 0) return null;
  return Math.round((위 / 아래) * 100) / 100;
}

/**
 * 한 무리를 판정한다. 칸('합' 또는 '마지막달')을 골라 부른다.
 * ⛔ 그룹이나 멤버를 못 쟀으면 그 무리는 «못 쟀다»로 낸다. 반쪽으로 셈하지 않는다.
 */
export function 무리판정(줄, 칸 = '합') {
  const 그룹수 = 줄?.그룹줄?.[칸];
  const 산멤버 = (줄?.멤버줄 ?? []).filter((m) => Number.isFinite(m?.[칸]));
  if (!Number.isFinite(그룹수) || 산멤버.length === 0) {
    return { 잴수있나: false, 왜: '그룹이나 멤버를 못 쟀다' };
  }
  if (산멤버.length !== (줄.멤버줄 ?? []).length) {
    return { 잴수있나: false, 왜: `멤버 ${(줄.멤버줄 ?? []).length}명 가운데 ${산멤버.length}명만 쟀다` };
  }
  const 제일큰 = 산멤버.reduce((a, b) => (b[칸] > a[칸] ? b : a));
  const 합 = 산멤버.reduce((s, m) => s + m[칸], 0);
  const 넘은이 = 산멤버.filter((m) => m[칸] > 그룹수).map((m) => m.이름);
  return {
    잴수있나: true,
    그룹: 그룹수,
    제일큰멤버: { 이름: 제일큰.이름, 수: 제일큰[칸] },
    배수_제일큰대그룹: 배수(제일큰[칸], 그룹수),
    멤버합: 합,
    배수_합대그룹: 배수(합, 그룹수),
    그룹넘은멤버: 넘은이,
    몇명이넘었나: 넘은이.length,
    멤버수: 산멤버.length,
  };
}

/**
 * 🔴 열람수 API 는 «넘김(redirect)을 따라가지 않는다» — 2026-09-10 실측으로 알았다.
 *
 * 처음에 `RM_(rapper)` 로 받아 27,156 을 얻었다. 그럴싸한 수였다. 그런데 위키백과에
 * 물어 보니 `RM (rapper)` 는 «넘김»이고 본문서는 `RM (musician)` 이었다.
 * ⇒ 넘김 문서의 열람수는 «그 이름으로 들어온 사람» 수일 뿐이고 본문서 조회가 아니다.
 *   그것을 그대로 냈으면 BTS 멤버 하나를 몇십 분의 일로 적은 기사가 나갔을 것이다.
 *
 * ⛔ 「칸이 채워져 있다 ≠ 그 뜻이다」의 또 한 경우다. 수가 나왔다고 맞는 문서가 아니다.
 * ✅ 그래서 열람수를 받기 «전에» 제목을 풀어 본문서 이름을 얻는다.
 *
 * 실측으로 확인된 넘김들 —
 *   RM (rapper) → RM (musician) · Suga (rapper) → Suga · Jungkook → Jung Kook
 *   Karina (singer) → Karina    · Winter (singer)·Giselle (singer)·Ningning 은 본문서다
 */
export function 풀린제목(응답, 원래) {
  const q = 응답?.query;
  if (!q) return { 제목: null, 왜: '응답에 query 가 없다' };
  const 페이지 = Object.values(q.pages ?? {})[0];
  if (!페이지) return { 제목: null, 왜: '응답에 page 가 없다' };
  if ('missing' in 페이지) return { 제목: null, 왜: '그런 문서가 없다' };
  const 넘김 = (q.redirects ?? []).find((x) => x?.from);
  return {
    제목: String(페이지.title ?? 원래).replace(/ /g, '_'),
    넘김이었나: Boolean(넘김),
    넘김: 넘김 ? `${넘김.from} → ${넘김.to}` : null,
  };
}

/**
 * 🔴 넘김을 따라갔는데 «다른 사람»에게 갈 수 있다 — 2026-09-10 실측으로 알았다.
 *
 * `Karina_(singer)` 를 풀었더니 `Karina` 가 나왔고 열람수 3,493 이 «수로는» 나왔다.
 * 그런데 3,493 은 세계적 걸그룹 멤버의 한 해 조회수가 될 수 없다 — 그것은 다른 Karina 이거나
 * 여러 사람을 늘어놓은 문서였다.
 *
 * ⛔ 「제목이 풀렸다」를 「맞는 사람이다」로 읽지 않는다. 수가 나온 것도 증거가 아니다.
 * ✅ 그래서 «그 문서가 그룹 문서를 거는가»를 위키백과에 묻는다. 멤버 문서는 자기 그룹을 건다.
 *    거지 않으면 그 줄은 못 쟀다로 낸다 — 틀린 수를 내는 것보다 낫다.
 */
export function 그룹을거나(응답, 그룹문서) {
  const 페이지 = Object.values(응답?.query?.pages ?? {})[0];
  if (!페이지) return { 건다: false, 왜: '응답에 page 가 없다' };
  const 걸린것 = (페이지.links ?? []).map((x) => String(x?.title ?? '').replace(/ /g, '_'));
  const 찾는것 = String(그룹문서 ?? '').replace(/ /g, '_');
  if (걸린것.length === 0) return { 건다: false, 왜: '거는 것이 없다고 왔다' };
  return { 건다: 걸린것.includes(찾는것), 왜: 걸린것.includes(찾는것) ? null : `그룹 문서(${찾는것})를 걸지 않는다` };
}

/** '10 September 2026, 14:05 KST' */
export function 영문시각(날 = new Date()) {
  const 달 = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const 두자 = (n) => String(n).padStart(2, '0');
  return `${날.getDate()} ${달[날.getMonth()]} ${날.getFullYear()}, ${두자(날.getHours())}:${두자(날.getMinutes())} KST`;
}

/* ── 자가시험 ───────────────────────────────────────────────────── */

function 자가시험() {
  let 통과 = 0, 실패 = 0;
  const 자가 = (이름, 참인가) => {
    if (참인가) { 통과 += 1; console.log('  ✅ ' + 이름); }
    else { 실패 += 1; console.log('  ⛔ ' + 이름); }
  };
  console.log('자가시험 — collect-kcw-member-vs-group.mjs');

  자가('접기 합이 맞다', 접기([{views:5},{views:6}]).합 === 11);
  자가('⛔ 빈 것은 null', 접기([]).합 === null);
  자가('⛔ null 도 null', 접기(null).합 === null);
  자가('마지막달을 가른다', 접기([{views:5},{views:6}]).마지막달 === 6);
  자가('음수를 버린다', 접기([{views:-1},{views:6}]).합 === 6);

  자가('배수가 맞다', 배수(10, 4) === 2.5);
  자가('⛔ 아래가 0 이면 null', 배수(10, 0) === null);

  const 줄 = {
    그룹: 'G', 그룹줄: { 합: 100, 마지막달: 10 },
    멤버줄: [
      { 이름: 'A', 합: 150, 마지막달: 4 },
      { 이름: 'B', 합: 50,  마지막달: 3 },
      { 이름: 'C', 합: 20,  마지막달: 2 },
    ],
  };
  const r = 무리판정(줄, '합');
  자가('잴 수 있다고 한다', r.잴수있나 === true);
  자가('🔴 «제일 큰 멤버»를 먼저 낸다', r.제일큰멤버.이름 === 'A');
  자가('제일 큰 멤버 대 그룹 배수', r.배수_제일큰대그룹 === 1.5);
  자가('멤버 합도 낸다', r.멤버합 === 220);
  자가('합 대 그룹 배수', r.배수_합대그룹 === 2.2);
  자가('🔴 그룹을 넘은 «사람 수»를 센다', r.몇명이넘었나 === 1);
  자가('넘은 사람 이름을 낸다', r.그룹넘은멤버[0] === 'A');
  자가('⭐ 합 배수가 제일큰 배수보다 크다는 것을 스스로 보여 준다',
    r.배수_합대그룹 > r.배수_제일큰대그룹);

  const rm = 무리판정(줄, '마지막달');
  자가('마지막달은 아무도 그룹을 못 넘었다', rm.몇명이넘었나 === 0);
  자가('마지막달 제일 큰 멤버는 A 다', rm.제일큰멤버.이름 === 'A');
  자가('🔴 창을 바꾸면 답이 뒤집힌다는 것을 자가 보여 준다',
    r.몇명이넘었나 !== rm.몇명이넘었나);

  자가('⛔ 그룹을 못 쟀으면 못 쟨다',
    무리판정({ 그룹줄: { 합: null }, 멤버줄: [{ 이름:'A', 합:1 }] }, '합').잴수있나 === false);
  자가('⛔ 멤버가 하나라도 비면 못 쟨다',
    무리판정({ 그룹줄: { 합: 10 }, 멤버줄: [{ 이름:'A', 합:1 }, { 이름:'B', 합:null }] }, '합').잴수있나 === false);
  자가('몇 명만 쟀는지 까닭에 적는다',
    /2명 가운데 1명/.test(무리판정({ 그룹줄: { 합: 10 }, 멤버줄: [{ 이름:'A', 합:1 }, { 이름:'B', 합:null }] }, '합').왜));
  자가('⛔ 멤버가 아예 없으면 못 쟨다',
    무리판정({ 그룹줄: { 합: 10 }, 멤버줄: [] }, '합').잴수있나 === false);
  자가('⛔ 빈 줄도 못 쟨다', 무리판정(null, '합').잴수있나 === false);

  자가('무리가 셋이다', 무리.length === 3);
  자가('무리마다 멤버가 둘 이상이다', 무리.every((g) => g.멤버.length >= 2));
  자가('문서 이름이 겹치지 않는다', (() => {
    const 다 = 무리.flatMap((g) => [g.그룹문서, ...g.멤버.map((m) => m.문서)]);
    return new Set(다).size === 다.length;
  })());
  자가('멤버 이름에 한국어가 없다', 무리.every((g) => g.멤버.every((m) => !/[가-힣]/.test(m.이름))));

  // 🔴 제목 풀기 — 넘김 문서로 재면 수가 몇십 분의 일이 된다
  const 넘김응답 = {
    query: {
      redirects: [{ from: 'RM (rapper)', to: 'RM (musician)' }],
      pages: { 1: { title: 'RM (musician)' } },
    },
  };
  자가('🔴 넘김을 따라가 본문서 이름을 낸다', 풀린제목(넘김응답, 'RM_(rapper)').제목 === 'RM_(musician)');
  자가('넘김이었다고 표시한다', 풀린제목(넘김응답, 'x').넘김이었나 === true);
  자가('무엇에서 무엇으로였나를 적는다', /RM \(rapper\) → RM \(musician\)/.test(풀린제목(넘김응답, 'x').넘김));
  자가('빈칸을 밑줄로 바꾼다', 풀린제목({ query: { pages: { 1: { title: 'Jung Kook' } } } }, 'x').제목 === 'Jung_Kook');
  자가('넘김이 아니면 그렇게 표시한다',
    풀린제목({ query: { pages: { 1: { title: 'Ningning' } } } }, 'x').넘김이었나 === false);
  자가('⛔ 없는 문서는 null 이다',
    풀린제목({ query: { pages: { 1: { title: 'x', missing: '' } } } }, 'x').제목 === null);
  자가('없는 까닭을 적는다',
    풀린제목({ query: { pages: { 1: { missing: '' } } } }, 'x').왜 === '그런 문서가 없다');
  자가('⛔ 응답이 이상하면 null 이다', 풀린제목({}, 'x').제목 === null);
  자가('⛔ null 응답도 null', 풀린제목(null, 'x').제목 === null);
  자가('⛔ 못 푼 제목을 «원래 이름»으로 되돌려 쓰지 않는다', 풀린제목(null, 'RM_(rapper)').제목 !== 'RM_(rapper)');

  // 🔴 이어짐 관문 — 넘김이 «다른 사람»에게 갔는지 본다
  const 걸린응답 = { query: { pages: { 1: { links: [{ title: 'Aespa' }, { title: 'SM Entertainment' }] } } } };
  자가('🔴 그룹 문서를 걸면 통과', 그룹을거나(걸린응답, 'Aespa').건다 === true);
  자가('빈칸을 밑줄로 맞춰 본다', 그룹을거나(걸린응답, 'Aespa').건다 === true);
  자가('⛔ 그룹 문서를 안 걸면 막는다', 그룹을거나(걸린응답, 'Blackpink').건다 === false);
  자가('막은 까닭에 그룹 이름을 적는다', /Blackpink/.test(그룹을거나(걸린응답, 'Blackpink').왜));
  자가('⛔ 거는 것이 없다고 오면 막는다',
    그룹을거나({ query: { pages: { 1: { links: [] } } } }, 'Aespa').건다 === false);
  자가('⛔ 응답이 이상하면 막는다', 그룹을거나({}, 'Aespa').건다 === false);
  자가('⛔ null 응답도 막는다', 그룹을거나(null, 'Aespa').건다 === false);

  자가('시각이 영문으로 난다', /September 2026/.test(영문시각(new Date(2026, 8, 10, 14, 5))));

  console.log(`\n통과 ${통과} · 실패 ${실패}`);
  return 실패 === 0;
}

/* ── 실행 ───────────────────────────────────────────────────────── */

const 내가실행됐다 = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
const 앞 = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/${판}.wikipedia/all-access/user/`;

/** 🔴 429 는 다시 받는다. 못 받은 것을  */
async function 한문서(문서, 시도수 = 4) {
  for (let i = 1; i <= 시도수; i += 1) {
    const r = await fetch(`${앞}${encodeURIComponent(문서)}/monthly/${창.처음}/${창.끝}`,
      { headers: { 'User-Agent': 'KCultureWire/1.0 (data journalism; contact via kculturewire.com)' } });
    if (r.ok) return { items: (await r.json())?.items ?? [] };
    if (r.status !== 429) return { 못받음: `HTTP ${r.status}` };
    await new Promise((s) => setTimeout(s, 1200 * i));
  }
  return { 못받음: 'HTTP 429 (네 번 다시 받아도 안 왔다)' };
}

/** 🔴 열람수를 받기 «전에» 제목을 푼다. 넘김 문서로 재면 수가 몇십 분의 일이 된다 */
async function 제목풀기(문서, 시도수 = 4) {
  const u = 'https://en.wikipedia.org/w/api.php?action=query&titles=' + encodeURIComponent(문서) +
            '&redirects=1&prop=info&format=json';
  for (let i = 1; i <= 시도수; i += 1) {
    const r = await fetch(u, { headers: { 'User-Agent': 'KCultureWire/1.0 (data journalism; contact via kculturewire.com)' } });
    if (r.ok) {
      const 글 = await r.text();
      try { return 풀린제목(JSON.parse(글), 문서); }
      catch { await new Promise((s) => setTimeout(s, 1500 * i)); continue; }   // 「too many requests」가 글로 온다
    }
    await new Promise((s) => setTimeout(s, 1500 * i));
  }
  return { 제목: null, 왜: '제목을 못 풀었다' };
}

/**
 * 🔴 여럿을 «한 번에» 묻는다 — 사람마다 부르면 429 가 난다 (2026-09-10 실측).
 * 위키백과 query API 는 titles 를 | 로 최대 50개까지 받는다.
 * 돌려주는 것: 적은이름 → { 제목, 넘김, 그룹을거나 }
 */
async function 무리한번에(적은이름들, 그룹문서, 시도수 = 4) {
  const u = 'https://en.wikipedia.org/w/api.php?action=query' +
    '&titles=' + 적은이름들.map((t) => encodeURIComponent(t.replace(/_/g, ' '))).join('%7C') +
    '&redirects=1&prop=links&pltitles=' + encodeURIComponent(그룹문서.replace(/_/g, ' ')) +
    '&pllimit=500&format=json';
  for (let i = 1; i <= 시도수; i += 1) {
    const r = await fetch(u, { headers: { 'User-Agent': 'KCultureWire/1.0 (data journalism; contact via kculturewire.com)' } });
    if (r.ok) {
      const 글 = await r.text();
      let j;
      try { j = JSON.parse(글); } catch { await new Promise((s) => setTimeout(s, 2000 * i)); continue; }
      const q = j.query ?? {};
      // 넘김 표: 적은 이름 → 풀린 이름
      const 넘김표 = new Map((q.redirects ?? []).map((x) => [String(x.from), String(x.to)]));
      const 찾는것 = String(그룹문서).replace(/_/g, ' ');
      const 제목별 = new Map();
      for (const 페이지 of Object.values(q.pages ?? {})) {
        if ('missing' in 페이지) continue;
        const 걸림 = (페이지.links ?? []).some((l) => String(l?.title ?? '') === 찾는것);
        제목별.set(String(페이지.title), { 제목: String(페이지.title).replace(/ /g, '_'), 그룹을거나: 걸림 });
      }
      const 낸것 = new Map();
      for (const 적은 of 적은이름들) {
        const 보통 = 적은.replace(/_/g, ' ');
        const 풀린 = 넘김표.get(보통) ?? 보통;
        const 찾음 = 제목별.get(풀린);
        낸것.set(적은, 찾음
          ? { ...찾음, 넘김: 넘김표.has(보통) ? `${보통} → ${풀린}` : null }
          : { 제목: null, 왜: '그런 문서가 없다' });
      }
      return 낸것;
    }
    await new Promise((s) => setTimeout(s, 2000 * i));
  }
  return null;   // ⛔ 못 물었으면 null. 「걸린다」로 넘기지 않는다
}

/** 푼 것(제목·넘김·그룹을거나)을 이미 쥐고 있을 때 열람수만 받아 한 줄로 만든다 */
async function 한줄(이름, 적은문서, 푼것, 멤버인가) {
  const 바탕 = { 이름, 문서: 푼것?.제목 ?? null, 적은문서, 넘김: 푼것?.넘김 ?? null };
  const 빈줄 = (왜) => ({ ...바탕, 합: null, 첫달: null, 마지막달: null, 달수: 0, 못받음: 왜 });

  if (!푼것 || !푼것.제목) return 빈줄(푼것?.왜 ?? '제목을 못 풀었다');

  // 🔴 멤버 줄이면 «그 그룹 사람인지»부터 본다. 수가 나오더라도 다른 사람이면 내지 않는다
  if (멤버인가) {
    바탕.그룹을거나 = 푼것.그룹을거나 === true;
    if (!바탕.그룹을거나) return 빈줄('맞는 사람이 아닐 수 있다 — 그룹 문서를 걸지 않는다');
  }

  const got = await 한문서(푼것.제목);
  await new Promise((s) => setTimeout(s, 400));
  if (got.못받음) return 빈줄(got.못받음);
  return { ...바탕, ...접기(got.items) };
}

if (내가실행됐다) {
  if (process.argv.includes('--자가시험')) process.exit(자가시험() ? 0 : 1);

  const 낸것 = [];
  for (const g of 무리) {
    // ⭐ 제목 풀기와 이어짐 확인을 «무리마다 한 번»에 묻는다 — 사람마다 부르면 429 가 난다
    const 적은것 = [g.그룹문서, ...g.멤버.map((m) => m.문서)];
    const 푼표 = await 무리한번에(적은것, g.그룹문서);
    await new Promise((s) => setTimeout(s, 600));
    if (!푼표) {
      console.log(`\n■ ${g.그룹}  ⬜ 제목을 못 물었다 — 이 무리는 내지 않는다`);
      낸것.push({ 그룹: g.그룹, 그룹줄: null, 멤버줄: [],
                 열두달: { 잴수있나: false, 왜: '제목을 못 물었다' },
                 마지막달: { 잴수있나: false, 왜: '제목을 못 물었다' } });
      continue;
    }
    const 그룹줄 = await 한줄(g.그룹, g.그룹문서, 푼표.get(g.그룹문서), false);
    const 멤버줄 = [];
    for (const m of g.멤버) 멤버줄.push(await 한줄(m.이름, m.문서, 푼표.get(m.문서), true));
    const 줄 = { 그룹: g.그룹, 그룹줄, 멤버줄 };
    줄.열두달 = 무리판정(줄, '합');
    줄.마지막달 = 무리판정(줄, '마지막달');
    낸것.push(줄);

    console.log(`\n■ ${g.그룹}  그룹 문서 ${String(그룹줄.합 ?? '못 쟀다').padStart(10)}`);
    for (const m of 멤버줄) {
      const 표 = Number.isFinite(m.합) && Number.isFinite(그룹줄.합) && m.합 > 그룹줄.합 ? '🔴 그룹보다 크다' : '';
      console.log(`   ${m.이름.padEnd(10)} ${String(m.합 ?? '못 쟀다').padStart(10)} · 마지막달 ${String(m.마지막달 ?? '?').padStart(8)} ${표}`);
    }
    if (줄.열두달.잴수있나) {
      console.log(`   ⇒ 12개월: 제일 큰 멤버 ${줄.열두달.제일큰멤버.이름} ${줄.열두달.배수_제일큰대그룹}배 · ` +
        `그룹을 넘은 멤버 ${줄.열두달.몇명이넘었나}명 · 멤버 합은 그룹의 ${줄.열두달.배수_합대그룹}배`);
      console.log(`   ⇒ 마지막달: 그룹을 넘은 멤버 ${줄.마지막달.잴수있나 ? 줄.마지막달.몇명이넘었나 + '명' : '못 쟀다'}`);
    } else {
      console.log(`   ⬜ 못 쟀다 — ${줄.열두달.왜}`);
    }
  }

  const 못쟨무리 = 낸것.filter((x) => !x.열두달.잴수있나);
  // 🔴 덮기 방지 — 낼 곳에 «내 것이 아닌» 파일이 있으면 멈춘다 (2026-09-10 사고)
  if (fs.existsSync(낼곳)) {
    let 남의것 = false;
    try {
      const 있던것 = JSON.parse(fs.readFileSync(낼곳, 'utf8'));
      남의것 = !(있던것 && 있던것._meta && 있던것._meta.source && /Wikimedia/.test(있던것._meta.source) && Array.isArray(있던것.groups));
    } catch { 남의것 = true; }
    if (남의것) {
      console.error(`⛔ ${낼곳} 에 이미 «내 것이 아닌» 파일이 있다 — 덮지 않는다.`);
      console.error(`   지면이 그것을 읽고 있으면 덮는 순간 전체 빌드가 선다. 이름을 바꾸십시오.`);
      process.exit(1);
    }
  }
  fs.mkdirSync(path.dirname(낼곳), { recursive: true });
  fs.writeFileSync(낼곳, JSON.stringify({
    _meta: {
      builtAt: 영문시각(),
      source: 'Wikimedia Pageviews API (per-article, user agents only), English Wikipedia',
      licence: 'CC0 — Wikimedia Analytics data is released into the public domain',
      window: 창말,
      howToRead: 'Pageviews are lookups, not streams, sales or chart positions. A member page and a group page are both read by fans and by people who just heard a name, and this count cannot separate those two.',
      whyBiggestFirst: 'For each group we publish the single biggest member before the sum of the members. A sum divided by the group page can be inflated by one member, so the sum is shown second and labelled as a sum.',
      whyTwoWindows: 'Both the twelve-month total and the most recent single month are published, because the two windows can disagree about whether a member outdraws the group.',
      unmeasured: 못쟨무리.map((x) => ({ group: x.그룹, why: x.열두달.왜 })),
    },
    groups: 낸것,
  }, null, 2), 'utf8');
  console.log(`\n✅ 냈다 — ${낼곳}` + (못쟨무리.length ? `  ⬜ 못 쟨 무리 ${못쟨무리.length}개` : ''));
}
