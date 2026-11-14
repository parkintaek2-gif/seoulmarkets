#!/usr/bin/env node
/**
 * build-kcw-label-reach.mjs — **어느 K팝 회사의 아티스트가 실제로 «읽히나».**
 * (5번 · 2026-09-04)
 *
 * ── 왜 이 자가 생겼나 ────────────────────────────────────────
 * 6번이 K팝 기획사 넷의 재무를 모으며 「5번↔6번 교차링크」를 물어 왔다. 억지 링크 대신
 * 겹치는 주제(기획사)를 찾아 P264(음반사)와 P749(모회사)·티커를 받았다.
 * ⭐ 그 위에 «우리가 쥔 것»을 얹는 것이 이 자다 — 위키백과 열람 실측.
 *   사장님 정의 그대로다 — **「그들은 재무를, 우리는 사람을 한다」**.
 *
 * ── ⛔ 이 자가 지키는 것 — 여기가 전부다 ────────────────────
 * ⛔ **커버리지를 숨기지 않는다.** 음반사가 적힌 사람 1,044명 가운데 열람까지 이어지는 것은
 *   **490명(46.9%)**뿐이다. 그리고 안 이어지는 절반은 «덜 유명한 쪽»에 쏠려 있다 —
 *   열람 명단이 차트에 든 작품·상위 목록에서 왔기 때문이다.
 *   ⇒ 그러니 회사별 중간값은 **위로 치우친 값**이다. 그 말을 지면에 적는다.
 * ⛔ **몫이 큰 순으로 세우지 않는다.** 그러면 순위표가 되고, 순위표는 커버리지 차이를 감춘다.
 *   ⭐ 오늘 /school 에서 같은 판단을 했다. 같은 규칙을 쓴다 — 사람 수 순으로 세운다.
 * ⛔ **이어진 사람이 스물 미만인 회사는 중간값을 «말하지 않는다».** 셋 가운데 하나가
 *   유명하면 그 회사가 1등으로 보인다. 그것은 회사에 대한 사실이 아니다.
 * ⛔ 「이 회사가 낫다」고 하지 않는다. 읽힌 수는 «지금 사람들이 무엇을 찾는가»이지
 *   회사의 실력도 아니고 매출도 아니다.
 *
 * 쓰는 법  node scripts/build-kcw-label-reach.mjs --자가시험
 *          node scripts/build-kcw-label-reach.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { 윌슨구간 } from './lib/noise-test.mjs';
/* 🔴 [2026-11-14] 영문 지면에 「오후」가 나갔다 — 잰 시각은 한 꼴로 적는다 */
import { 잰때문자 } from './lib/잰때.mjs';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 출생길 = path.join(뿌리, 'archive/raw/wikidata/korean-entertainers-birth.json');
const 역할길 = path.join(뿌리, 'archive/raw/wikidata/korean-entertainers-roles.json');
const 소유길 = path.join(뿌리, 'archive/raw/wikidata/kpop-label-owners.json');
const 열람방 = path.join(뿌리, 'archive/raw/star-pageviews');
const 낼길 = path.join(뿌리, 'src/data/kcw-label-reach.json');

/**
 * 중간값을 «말할 수 있는» 최소 인원.
 * ⚠ 왜 20 인가 — 오늘 /school 에서 같은 판단을 했고 같은 값을 쓴다. 다섯 명이면 한 사람이
 *   전체를 흔들고, 스물이면 흔들리는 폭이 눈에 보이게 줄어든다.
 * ⛔ 낮추면 표가 길어지는 대신 «말할 수 없는 줄»이 늘어난다. 길이가 목적이 아니다.
 */
export const 말할최소 = 20;

/* ── 판단하는 함수들. 여기만 자가시험한다 ────────────────────── */

/** 가운데값. ⛔ 평균을 쓰지 않는다 — 한 사람이 백만이면 평균이 그 사람 것이 된다 */
export function 가운데(값들) {
  /**
   * 🔴 [2026-09-04 20:5x] **`Number(null)` 이 0 이다.** 자가시험이 잡았다.
   *   처음에 `.map(Number).filter(Number.isFinite)` 로 썼더니 `null` 이 **0 으로 바뀌어
   *   그대로 통과했다.** 그러면 「읽힌 수를 모르는 사람」이 「하루 0회 읽힌 사람」이 된다.
   *   ⛔ 그것이 바로 우리 강령 ③이 금하는 것이다 — 「0 으로 채우지 않는다」.
   *   ⚠ `Number('')` 도 0 이고 `Number(false)` 도 0 이다. 그래서 **수인 것만** 먼저 고른다.
   */
  const v = (값들 ?? []).filter((x) => typeof x === 'number' && Number.isFinite(x))
    .sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : Math.round((v[m - 1] + v[m]) / 2);
}

/**
 * 회사 하나를 잰다.
 * ⛔ 이어진 사람이 없으면 **아무 말도 하지 않는다** — 0 으로 채우지 않는다.
 */
export function 회사재기(회사, 사람들) {
  const 이어진 = (사람들 ?? []).filter((p) => Number.isFinite(p?.하루평균));
  const 전체 = (사람들 ?? []).length;
  if (!전체) return null;
  const 커버 = 전체 ? 윌슨구간(이어진.length, 전체) : null;
  return {
    회사: 회사?.소속 ?? null,
    티커: 회사?.티커 ?? null,
    거래소: 회사?.거래소 ?? null,
    레이블수: 회사?.레이블수 ?? null,
    아는사람: 전체,
    이어진사람: 이어진.length,
    커버리지: Math.round((이어진.length / 전체) * 1000) / 10,
    커버아래: 커버아래꺼내기(커버),
    중간하루: 이어진.length ? 가운데(이어진.map((p) => p.하루평균)) : null,
    합하루: 이어진.length ? 이어진.reduce((a, b) => a + b.하루평균, 0) : null,
    말할수있나: 이어진.length >= 말할최소,
    맨위: [...이어진].sort((a, b) => b.하루평균 - a.하루평균).slice(0, 3)
      .map((p) => ({ 이름: p.이름, 하루평균: p.하루평균 })),
  };
}

/* 윌슨 아래끝을 꺼내는 작은 도움 — 값이 없으면 null */
function 커버아래꺼내기(구간) {
  return 구간 ? Math.round(구간.아래 * 1000) / 10 : null;
}

/* ── 자가시험 ─────────────────────────────────────────────── */
if (process.argv.includes('--자가시험')) {
  let 통 = 0; let 실 = 0;
  const 참 = (이름, 값) => { if (값) 통 += 1; else { 실 += 1; console.log(`   🔴 ${이름}`); } };

  참('가운데값 홀수', 가운데([1, 5, 3]) === 3);
  참('가운데값 짝수는 두 값의 가운데', 가운데([1, 3, 5, 7]) === 4);
  참('⛔ 수가 아닌 것은 버린다', 가운데([1, 'x', null, 3]) === 2);
  /* 🔴 이 셋이 처음 판을 깨뜨렸다 — Number(null)·Number('')·Number(false) 가 다 0 이다 */
  참('🔴 null 이 0 으로 바뀌지 않는다', 가운데([10, null, 20]) === 15);
  참('🔴 빈 글자가 0 으로 바뀌지 않는다', 가운데([10, '', 20]) === 15);
  참('🔴 false 가 0 으로 바뀌지 않는다', 가운데([10, false, 20]) === 15);
  참('숫자꼴 글자도 «수가 아니다»', 가운데(['10', 20, 30]) === 25);
  참('⛔ 빈 목록은 못 쟀다', 가운데([]) === null && 가운데(null) === null);
  참('⭐ 한 사람이 아주 크면 가운데값이 안 끌려간다', 가운데([10, 20, 30, 1000000]) === 25);

  const 사람 = [];
  for (let i = 0; i < 25; i += 1) 사람.push({ 이름: `n${i}`, 하루평균: 100 + i });
  사람.push({ 이름: '모르는사람' });   // 열람이 안 이어진 사람
  const 잰것 = 회사재기({ 소속: 'HYBE', 티커: '352820', 레이블수: 7 }, 사람);
  참('회사 이름을 담는다', 잰것.회사 === 'HYBE');
  참('티커를 담는다', 잰것.티커 === '352820');
  참('아는 사람과 이어진 사람을 «따로» 센다', 잰것.아는사람 === 26 && 잰것.이어진사람 === 25);
  참('⭐ 커버리지를 낸다', 잰것.커버리지 === 96.2);
  참('스물을 넘으면 말할 수 있다', 잰것.말할수있나 === true);
  참('중간값을 낸다', 잰것.중간하루 === 112);
  참('맨위를 셋까지', 잰것.맨위.length === 3 && 잰것.맨위[0].하루평균 === 124);

  const 적은것 = 회사재기({ 소속: 'X' }, [{ 이름: 'a', 하루평균: 99999 }, { 이름: 'b' }, { 이름: 'c' }]);
  참('작은 회사도 수는 낸다', 적은것.이어진사람 === 1);
  참('⭐ 다만 «말할 수 있나»가 거짓이다', 적은것.말할수있나 === false);
  참('커버리지가 낮게 나온다', 적은것.커버리지 === 33.3);

  참('⛔ 이어진 사람이 0 이면 중간값을 안 만든다',
    회사재기({ 소속: 'Y' }, [{ 이름: 'a' }, { 이름: 'b' }]).중간하루 === null);
  참('⛔ 아무도 없으면 아무 말도 안 한다', 회사재기({ 소속: 'Z' }, []) === null);
  참('⛔ 빈 값에도 안 죽는다', 회사재기(null, null) === null);
  참('최소 인원이 스물이다', 말할최소 === 20);

  console.log(`\n회사별 읽힘을 재는 자 — 자가시험 ${통} 통과 · ${실} 실패`);
  process.exit(실 ? 1 : 0);
}

/* ── 실제로 낸다 ──────────────────────────────────────────── */
if (!process.argv.includes('--자가시험')) {
  for (const [이름, 길] of [['출생', 출생길], ['역할', 역할길], ['소유', 소유길]]) {
    if (!fs.existsSync(길)) { console.log(`🔴 ${이름} 자료가 없다 — ${path.relative(뿌리, 길)}`); process.exit(1); }
  }
  const q이름 = new Map(JSON.parse(fs.readFileSync(출생길, 'utf8')).사람.map((p) => [p.q, p.name]));
  const 역할 = JSON.parse(fs.readFileSync(역할길, 'utf8')).사람 ?? {};
  const 소유 = JSON.parse(fs.readFileSync(소유길, 'utf8'));
  const 레이블소속 = new Map((소유.음반사별 ?? []).map((x) => [x.q, x.소속 ?? x.이름 ?? null]));
  const 회사정보 = new Map((소유.소속별 ?? []).map((x) => [x.소속, x]));

  /* 열람 — 이름으로 이어진다. ⚠ 두 명단에 같은 이름이 있으면 «앞의 것»만 쓴다(값이 같다) */
  const 열람 = new Map();
  let 열람파일 = 0;
  for (const f of fs.readdirSync(열람방).filter((x) => x.endsWith('.json'))) {
    열람파일 += 1;
    for (const p of JSON.parse(fs.readFileSync(path.join(열람방, f), 'utf8')).사람 ?? []) {
      if (!열람.has(p.이름)) 열람.set(p.이름, p);
    }
  }

  /* 회사 → 사람들 */
  const 회사사람 = new Map();
  let 음반사있는사람 = 0;
  for (const [q, v] of Object.entries(역할)) {
    if (!Array.isArray(v.음반사) || !v.음반사.length) continue;
    음반사있는사람 += 1;
    const 이름 = q이름.get(q);
    if (!이름) continue;
    const 본 = 열람.get(이름);
    /* ⛔ 한 사람이 레이블 둘에 걸리면 «회사가 다를 때만» 두 번 센다. 같은 회사면 한 번이다 */
    const 회사들 = [...new Set(v.음반사.map((x) => 레이블소속.get(x.q) ?? x.이름).filter(Boolean))];
    for (const c of 회사들) {
      if (!회사사람.has(c)) 회사사람.set(c, []);
      회사사람.get(c).push({ 이름, 하루평균: 본 ? 본.하루평균 : undefined });
    }
  }

  /**
   * 🔴 [2026-09-04 21:0x] **「대표 보기 하나」를 고르려다 그만뒀다.**
   *   처음엔 「묶음 효과가 가장 큰 회사」를 골라 지면에 보기로 실으려 했다. 그런데 —
   *     ① 레이블 수로 고르니 Universal Music Group (10곳 · 2.5배) — K팝 회사가 아니다
   *     ② 배수로 고르니 Warner Music Group (11명 · 3.7배) — 표본이 열한 명이다
   *     ③ 바닥을 두니 다시 UMG
   *   ⛔ 고르는 규칙을 바꿀 때마다 답이 바뀌었다. **그것이 고르기라는 증거다.**
   *     내가 보이고 싶은 회사(HYBE)가 나오도록 규칙을 다듬고 있었다.
   *   ✅ 그래서 «고르지 않는다» — 모든 회사 줄에 「가장 큰 레이블」을 같이 싣는다.
   *     손님이 스스로 대비를 본다. 그것이 이 회사가 하는 일이다.
   */
  const 가장큰레이블표 = new Map();
  for (const s2 of 소유.소속별 ?? []) {
    const 큰 = (s2.레이블들 ?? []).slice().sort((a, b) => b.사람수 - a.사람수)[0] ?? null;
    if (큰) 가장큰레이블표.set(s2.소속, 큰);
  }

  const 잰것 = [...회사사람].map(([c, ps]) => {
    const x = 회사재기(회사정보.get(c) ?? { 소속: c }, ps);
    if (!x) return null;
    const 큰 = 가장큰레이블표.get(c) ?? null;
    return {
      ...x,
      가장큰레이블: 큰 ? 큰.이름 : null,
      가장큰레이블사람수: 큰 ? 큰.사람수 : null,
      /* 「레이블 하나만 세면 몇 분의 일로 보이나」 — 손님이 줄마다 스스로 본다 */
      묶음배수: 큰 && 큰.사람수 ? Math.round((x.아는사람 / 큰.사람수) * 10) / 10 : null,
    };
  }).filter(Boolean);
  /* ⛔ 중간값 순으로 세우지 않는다 — 순위표가 되고 커버리지 차이를 감춘다. 사람 수 순이다 */
  const 말할수있는것 = 잰것.filter((x) => x.말할수있나).sort((a, b) => b.이어진사람 - a.이어진사람);

  const 전체이어진 = 잰것.reduce((a, b) => a + b.이어진사람, 0);
  const 전체아는 = 잰것.reduce((a, b) => a + b.아는사람, 0);

  fs.writeFileSync(낼길, JSON.stringify({
    /* ⛔ toISOString 은 UTC 다 — 우리 시각은 KST 다 */
    잰때: 잰때문자(),
    무엇인가: 'For each K-pop company, how widely its artists are actually read on English Wikipedia. '
      + 'Labels are grouped into the listed parent company, so a group of labels counts once.',
    '⛔아닌것': [
      '순위표가 아니다. 읽힌 수는 회사의 실력도 매출도 아니고, 지금 사람들이 무엇을 찾는가다.',
      '소속 아티스트 전체가 아니다 — 위키데이터에 음반사가 적힌 사람만 세었다.',
      '읽힘까지 이어지는 사람은 그 절반 남짓이고, 안 이어지는 쪽은 덜 유명한 사람에 쏠려 있다. 그래서 중간값은 위로 치우쳐 있다.',
      '한 사람이 회사 둘에 걸리면 둘에서 각각 센다 — 합계가 사람 수보다 크다.',
    ],
    말할최소,
    셈: {
      음반사있는사람,
      /* ⛔ 지면이 이 수를 손으로 박지 않게 «자가» 낸다. 오늘 /school 에서 같은 것을 물렸다 */
      명단전체: q이름.size,
      회사수: 잰것.length,
      말할수있는회사: 말할수있는것.length,
      아는사람합: 전체아는,
      이어진사람합: 전체이어진,
      전체커버리지: 전체아는 ? Math.round((전체이어진 / 전체아는) * 1000) / 10 : null,
      열람파일수: 열람파일,
      열람이름수: 열람.size,
    },
    /**
     * ⭐ 「레이블만 세면 회사가 작게 나온다」 대비를 **지면이 손으로 적지 않도록** 여기서 낸다.
     * ⚠ 회사 이름을 코드에 박지 않는다 — 레이블이 가장 많은 회사를 «골라서» 낸다.
     *   자료가 바뀌면 대비도 따라 바뀐다. 박아 두면 그날 거짓이 된다.
     */
    회사들: 말할수있는것,
    '말할수없는회사': 잰것.filter((x) => !x.말할수있나).length,
  }, null, 1));

  console.log(`음반사가 적힌 사람 ${음반사있는사람}명 · 회사 ${잰것.length}곳`);
  console.log(`이어진 사람 ${전체이어진}/${전체아는} (${Math.round((전체이어진 / 전체아는) * 1000) / 10}%)`);
  console.log(`⭐ 중간값을 «말할 수 있는» 회사 ${말할수있는것.length}곳 (이어진 사람 ${말할최소}명 이상)\n`);
  for (const x of 말할수있는것.slice(0, 12)) {
    console.log(`  ${String(x.이어진사람).padStart(3)}/${String(x.아는사람).padStart(3)}명 (${String(x.커버리지).padStart(5)}%) `
      + `· 중간 하루 ${String(x.중간하루).padStart(6)} · ${x.티커 ? `[${x.티커}] ` : ''}${x.회사}`);
  }
  console.log(`\n⬜ 말할 수 없는 회사 ${잰것.filter((x) => !x.말할수있나).length}곳 — 이어진 사람이 ${말할최소}명 미만이다. 지웠지 않고 세었다.`);
  console.log(`\n냈다 — ${path.relative(뿌리, 낼길)}`);
  console.log('⚠ 지면에 실을 때 «커버리지»를 같이 실으십시오. 중간값만 실으면 순위표가 됩니다.');
}
