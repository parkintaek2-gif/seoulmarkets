#!/usr/bin/env node
/**
 * 가상 퍼포머 대 사람 퍼포머 — 영문 위키백과 열람수로 잰다
 *
 * 왜 이것을 재나 (2026-09-10 아침 신문 제목에서 나왔다)
 *   동아일보  「CNN과 인터뷰한 AI 배우 “난 인간의 적이 아니에요”」
 *   동아일보  「CNN과 인터뷰한 AI 배우, 즉석 연기 주문하자 ‘삐걱’」
 *   동아일보  「AI와 충무로의 동행… 유토파이 스튜디오, 한국 영화계 공동제작 본격 시동」
 *   ⇒ 이슈는 「AI 가 사람 배우 자리를 가져가나」다. 그런데 그것을 «사람이 얼마나 찾나»로
 *     잰 곳이 없다. 우리는 잴 수 있다 — 위키미디어 열람수는 열쇠가 필요 없고 CC0 다.
 *
 * ⭐ 우리 축이 남과 다른 점 — 「가상 케이팝」은 영화 하나가 아니다.
 *   PLAVE·이세계아이돌·MAVE:·Eternity 는 «여러 해» 돌고 있는 상품이고,
 *   K/DA·하츠네 미쿠·고릴라즈는 그 앞선 판이다. 한 편의 흥행이 아니라 «갈래»를 센다.
 *
 * 🔴 지키는 것 셋 (오늘 내가 어긴 자리들이다)
 *   1  창을 «둘» 낸다 — 12개월과 마지막 달. 하나만 내면 참인 수로 거짓말이 된다
 *   2  가상 쪽 대표는 «제일 큰 하나»다. 묶음 합으로 배수를 부풀리지 않는다
 *   3  못 받은 문서는 null 이다. 
 *
 * 쓰는 법
 *   node scripts/collect-kcw-virtual-performers.mjs --자가시험
 *   node scripts/collect-kcw-virtual-performers.mjs            받아서 낸다
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const 낼곳 = 'src/data/kcw-virtual-performers.json';
export const 판 = 'en';
export const 창 = { 처음: '20250901', 끝: '20260831' };
export const 창말 = 'September 2025 to August 2026';

export const 볼것 = [
  // 가상 — 사람이 아닌 출연자. «상품으로 돌고 있는 것»만 넣는다
  { 이름: 'PLAVE',              문서: 'Plave',              갈래: '가상', 무엇: 'virtual K-pop boy band, debuted 2023' },
  { 이름: 'Isegye Idol',        문서: 'Isegye_Idol',         갈래: '가상', 무엇: 'virtual girl group of VTubers, 2021' },
  { 이름: 'MAVE:',              문서: 'Mave:',               갈래: '가상', 무엇: 'virtual girl group, 2023' },
  { 이름: 'Eternity',           문서: 'Eternity_(group)',    갈래: '가상', 무엇: 'AI-generated girl group, 2021' },
  { 이름: 'K/DA',               문서: 'K/DA',                갈래: '가상', 무엇: 'virtual group from a video game, 2018' },
  { 이름: 'Hatsune Miku',       문서: 'Hatsune_Miku',        갈래: '가상', 무엇: 'Japanese Vocaloid, 2007 — the oldest of these' },
  { 이름: 'Gorillaz',           문서: 'Gorillaz',            갈래: '가상', 무엇: 'British virtual band, 1998' },
  { 이름: 'Huntr/x',            문서: 'Huntr/x',             갈래: '가상', 무엇: 'group inside the 2025 film' },
  { 이름: 'KPop Demon Hunters', 문서: 'KPop_Demon_Hunters',  갈래: '가상', 무엇: 'the 2025 film itself' },
  // 실재 — 사람
  { 이름: 'BTS',        문서: 'BTS',        갈래: '실재', 무엇: 'group' },
  { 이름: 'BLACKPINK',  문서: 'Blackpink',  갈래: '실재', 무엇: 'group' },
  { 이름: 'TWICE',      문서: 'Twice',      갈래: '실재', 무엇: 'group' },
  { 이름: 'Stray Kids', 문서: 'Stray_Kids', 갈래: '실재', 무엇: 'group' },
  { 이름: 'NewJeans',   문서: 'NewJeans',   갈래: '실재', 무엇: 'group' },
  { 이름: 'aespa',      문서: 'Aespa',      갈래: '실재', 무엇: 'group with virtual counterparts of its own' },
];

/* ── 재는 함수들 ─────────────────────────────────────────────────── */

/** 달별 목록을 합·첫달·마지막달로 접는다. ⛔ 빈 것은 null (0 이 아니다) */
export function 접기(items) {
  if (!Array.isArray(items) || items.length === 0) return { 합: null, 첫달: null, 마지막달: null, 달수: 0 };
  const 수들 = items.map((x) => Number(x?.views)).filter((n) => Number.isFinite(n) && n >= 0);
  if (수들.length === 0) return { 합: null, 첫달: null, 마지막달: null, 달수: 0 };
  return {
    합: 수들.reduce((a, b) => a + b, 0),
    첫달: 수들[0],
    마지막달: 수들[수들.length - 1],
    달수: 수들.length,
  };
}

/** 배수. ⛔ 아래가 0 이거나 못 쟀으면 null */
export function 배수(위, 아래) {
  if (!Number.isFinite(위) || !Number.isFinite(아래) || 아래 <= 0) return null;
  return Math.round((위 / 아래) * 100) / 100;
}

/** 몇 % 내려앉았나. 올랐으면 음수를 내지 않고 «올랐다»로 가른다 */
export function 움직임(첫, 끝) {
  if (!Number.isFinite(첫) || !Number.isFinite(끝) || 첫 <= 0) return { 값: null, 어느쪽: '못 쟀다' };
  const 비 = (끝 - 첫) / 첫;
  return { 값: Math.round(Math.abs(비) * 1000) / 10, 어느쪽: 비 >= 0 ? '올랐다' : '내려앉았다' };
}

/**
 * 두 창을 «다» 낸다. 가상 쪽 대표는 제일 큰 하나다.
 * 🔴 묶음 합으로 배수를 내지 않는다 — 오늘 아침 기술 갈래를 Google 로 부풀린 잘못과 같다.
 */
export function 두창견줌(줄들) {
  const 산 = (줄들 ?? []).filter((r) => r && Number.isFinite(r.합));
  const 가상 = 산.filter((r) => r.갈래 === '가상');
  const 실재 = 산.filter((r) => r.갈래 === '실재');
  if (가상.length === 0 || 실재.length === 0) {
    return { 잴수있나: false, 왜: '한쪽 갈래를 못 쟀다' };
  }
  const 큰것 = (목, 칸) => 목.reduce((a, b) => ((b[칸] ?? -1) > (a[칸] ?? -1) ? b : a));
  const 합 = (목, 칸) => 목.reduce((s, r) => s + (Number(r[칸]) || 0), 0);

  const 가상대표 = 큰것(가상, '합');
  const 가상대표달 = 큰것(가상, '마지막달');
  return {
    잴수있나: true,
    열두달: {
      가상제일큰하나: { 이름: 가상대표.이름, 수: 가상대표.합 },
      실재여섯합: 합(실재, '합'),
      실재제일큰하나: { 이름: 큰것(실재, '합').이름, 수: 큰것(실재, '합').합 },
      배수_가상대실재합: 배수(가상대표.합, 합(실재, '합')),
      이긴쪽: 가상대표.합 > 합(실재, '합') ? '가상' : '실재',
    },
    마지막달: {
      가상제일큰하나: { 이름: 가상대표달.이름, 수: 가상대표달.마지막달 },
      실재여섯합: 합(실재, '마지막달'),
      실재제일큰하나: { 이름: 큰것(실재, '마지막달').이름, 수: 큰것(실재, '마지막달').마지막달 },
      배수_가상대실재합: 배수(가상대표달.마지막달, 합(실재, '마지막달')),
      이긴쪽: 가상대표달.마지막달 > 합(실재, '마지막달') ? '가상' : '실재',
    },
    // ⭐ 영화를 뺀 «여러 해 돌고 있는 가상 그룹»만으로도 한 번 센다.
    //    한 편의 흥행과 갈래의 힘은 다른 것이다
    영화빼고: (() => {
      const 오래 = 가상.filter((r) => !/Demon_Hunters|Huntr/.test(r.문서));
      if (오래.length === 0) return null;
      const 큰 = 큰것(오래, '합');
      return { 제일큰하나: { 이름: 큰.이름, 수: 큰.합 }, 몇곳: 오래.length,
               배수_대실재합: 배수(큰.합, 합(실재, '합')) };
    })(),
  };
}

/** '10 September 2026, 13:40 KST' — 지면에 나갈 글은 만들 때부터 영문이다 */
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
  console.log('자가시험 — collect-kcw-virtual-performers.mjs');

  자가('접기 합이 맞다', 접기([{views:10},{views:20}]).합 === 30);
  자가('첫달·마지막달을 가른다', 접기([{views:10},{views:20}]).마지막달 === 20);
  자가('⛔ 빈 목록은 null (0 이 아니다)', 접기([]).합 === null);
  자가('⛔ null 도 null', 접기(null).합 === null);
  자가('⛔ 수가 아닌 것만 오면 null', 접기([{views:'x'}]).합 === null);
  자가('음수는 버린다', 접기([{views:-5},{views:7}]).합 === 7);
  자가('달수를 센다', 접기([{views:1},{views:2},{views:3}]).달수 === 3);

  자가('배수가 맞다', 배수(30, 10) === 3);
  자가('⛔ 아래가 0 이면 null', 배수(30, 0) === null);
  자가('⛔ 못 쟀으면 null', 배수(30, null) === null);

  자가('내려앉음을 잰다', 움직임(100, 10).어느쪽 === '내려앉았다');
  자가('내려앉은 폭이 맞다', 움직임(100, 10).값 === 90);
  자가('⭐ 올랐으면 «올랐다»로 가른다', 움직임(10, 100).어느쪽 === '올랐다');
  자가('올랐을 때 음수를 내지 않는다', 움직임(10, 100).값 > 0);
  자가('⛔ 첫달이 0 이면 못 쟀다', 움직임(0, 10).어느쪽 === '못 쟀다');

  const 표본 = [
    { 이름: 'A', 문서: 'A', 갈래: '가상', 합: 100, 마지막달: 5 },
    { 이름: 'B', 문서: 'B', 갈래: '가상', 합: 900, 마지막달: 3 },
    { 이름: 'KPop Demon Hunters', 문서: 'KPop_Demon_Hunters', 갈래: '가상', 합: 5000, 마지막달: 2 },
    { 이름: 'R1', 문서: 'R1', 갈래: '실재', 합: 400, 마지막달: 40 },
    { 이름: 'R2', 문서: 'R2', 갈래: '실재', 합: 300, 마지막달: 30 },
  ];
  const r = 두창견줌(표본);
  자가('잴 수 있다고 한다', r.잴수있나 === true);
  자가('🔴 가상 대표는 «제일 큰 하나»다', r.열두달.가상제일큰하나.수 === 5000);
  자가('🔴 가상 셋을 합치지 않는다', r.열두달.가상제일큰하나.수 !== 100 + 900 + 5000);
  자가('실재는 합으로 견준다', r.열두달.실재여섯합 === 700);
  자가('12개월로는 가상이 이긴다', r.열두달.이긴쪽 === '가상');
  자가('🔴 마지막달은 «따로» 큰 것을 고른다', r.마지막달.가상제일큰하나.수 === 5);
  자가('마지막달로는 실재가 이긴다', r.마지막달.이긴쪽 === '실재');
  자가('🔴 창이 둘 다 나온다', !!r.열두달 && !!r.마지막달);
  자가('창 둘의 이긴쪽이 다를 수 있다', r.열두달.이긴쪽 !== r.마지막달.이긴쪽);
  자가('⭐ 영화를 뺀 셈도 낸다', r.영화빼고 !== null);
  자가('영화를 뺀 대표는 900 이다', r.영화빼고.제일큰하나.수 === 900);
  자가('영화·영화속그룹 둘을 뺐다', r.영화빼고.몇곳 === 2);

  자가('⛔ 한쪽 갈래가 비면 못 쟨다고 한다',
    두창견줌([{ 이름:'A', 문서:'A', 갈래:'가상', 합:1, 마지막달:1 }]).잴수있나 === false);
  자가('못 쟨 까닭을 적는다', 두창견줌([]).왜 === '한쪽 갈래를 못 쟀다');
  자가('⛔ 합이 null 인 줄은 셈에서 뺀다',
    두창견줌([...표본, { 이름:'X', 문서:'X', 갈래:'실재', 합:null, 마지막달:null }]).열두달.실재여섯합 === 700);

  자가('볼것에 가상과 실재가 다 있다',
    볼것.some((x) => x.갈래 === '가상') && 볼것.some((x) => x.갈래 === '실재'));
  자가('⭐ 가상이 영화 말고도 여럿이다',
    볼것.filter((x) => x.갈래 === '가상' && !/Demon_Hunters|Huntr/.test(x.문서)).length >= 5);
  자가('문서 이름이 겹치지 않는다', new Set(볼것.map((x) => x.문서)).size === 볼것.length);
  자가('무엇 칸이 영문이다', 볼것.every((x) => !/[가-힣]/.test(x.무엇)));

  자가('시각이 영문으로 난다', /September 2026/.test(영문시각(new Date(2026, 8, 10, 13, 40))));
  자가('⛔ 시각에 한국어가 없다', !/[가-힣]/.test(영문시각(new Date(2026, 8, 10, 13, 40)).replace('KST','')));

  console.log(`\n통과 ${통과} · 실패 ${실패}`);
  return 실패 === 0;
}

/* ── 실행 ───────────────────────────────────────────────────────── */

const 내가실행됐다 = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
const 앞 = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/${판}.wikipedia/all-access/user/`;

async function 한문서(문서) {
  const 주소 = `${앞}${encodeURIComponent(문서)}/monthly/${창.처음}/${창.끝}`;
  const r = await fetch(주소, { headers: { 'User-Agent': 'KCultureWire/1.0 (data journalism; contact via kculturewire.com)' } });
  if (!r.ok) return { 못받음: `HTTP ${r.status}` };
  const j = await r.json();
  return { items: j?.items ?? [] };
}

if (내가실행됐다) {
  if (process.argv.includes('--자가시험')) process.exit(자가시험() ? 0 : 1);

  const 줄들 = [];
  for (const v of 볼것) {
    const got = await 한문서(v.문서);
    if (got.못받음) {
      // ⛔ 못 받은 것을 
      줄들.push({ ...v, 합: null, 첫달: null, 마지막달: null, 달수: 0, 못받음: got.못받음 });
      console.log(`  ⬜ ${v.이름.padEnd(20)} 못 받았다 — ${got.못받음}`);
    } else {
      const 접 = 접기(got.items);
      줄들.push({ ...v, ...접 });
      const 움 = 움직임(접.첫달, 접.마지막달);
      console.log(`  ${v.갈래 === '가상' ? '◐' : '○'} ${v.이름.padEnd(20)} ${String(접.합 ?? '못 쟀다').padStart(12)}` +
        ` · 마지막달 ${String(접.마지막달 ?? '?').padStart(8)} · ${움.값 ?? '?'}% ${움.어느쪽}`);
    }
    await new Promise((r) => setTimeout(r, 250));
  }

  console.log(`\n■ 창 ${창말} · 영문 위키백과 · 사람 조회만 · 읽은 줄 ${줄들.length}`);
  const 견줌 = 두창견줌(줄들);
  if (!견줌.잴수있나) {
    console.error('⛔ 못 쟀다 — ' + 견줌.왜);
    process.exit(1);
  }
  console.log(`■ 12개월  가상 제일 큰 하나 ${견줌.열두달.가상제일큰하나.이름} ${견줌.열두달.가상제일큰하나.수.toLocaleString()}` +
    ` 대 실재 합 ${견줌.열두달.실재여섯합.toLocaleString()} → ${견줌.열두달.이긴쪽}이 이긴다 (${견줌.열두달.배수_가상대실재합}배)`);
  console.log(`■ 마지막달 ${견줌.마지막달.가상제일큰하나.이름} ${(견줌.마지막달.가상제일큰하나.수 ?? 0).toLocaleString()}` +
    ` 대 실재 합 ${(견줌.마지막달.실재여섯합 ?? 0).toLocaleString()} → ${견줌.마지막달.이긴쪽}이 이긴다 (${견줌.마지막달.배수_가상대실재합}배)`);
  if (견줌.영화빼고) {
    console.log(`■ 영화를 빼면 — 가상 ${견줌.영화빼고.몇곳}곳 가운데 제일 큰 ${견줌.영화빼고.제일큰하나.이름}` +
      ` ${견줌.영화빼고.제일큰하나.수.toLocaleString()} · 실재 합의 ${견줌.영화빼고.배수_대실재합}배`);
  }

  fs.mkdirSync(path.dirname(낼곳), { recursive: true });
  fs.writeFileSync(낼곳, JSON.stringify({
    _meta: {
      builtAt: 영문시각(),
      source: 'Wikimedia Pageviews API (per-article, user agents only), English Wikipedia',
      licence: 'CC0 — Wikimedia Analytics data is released into the public domain',
      window: 창말,
      howToRead: 'Pageviews are attention, not sales. A film page is read by people looking up the plot, the cast or the songs; a group page is read by people who follow that group. These are not the same curiosity and this count cannot separate them.',
      whyBiggestOne: 'On the virtual side we publish the single biggest page, never the sum of the virtual pages. Summing a category and dividing by a rival lets one entry inflate the whole multiple.',
      whyTwoWindows: 'We publish both the twelve-month total and the last month. The twelve-month window and the last month point in opposite directions, and showing only one of them would be a true number telling a lie.',
    },
    rows: 줄들, comparison: 견줌,
  }, null, 2), 'utf8');
  console.log(`\n✅ 냈다 — ${낼곳}`);
}
