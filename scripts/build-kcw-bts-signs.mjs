/**
 * K Culture Wire — **표준 작업틀 「남의 이슈 + 우리만의 축」의 첫 자.**
 *
 * 사장님 지시(2026-09-05): 「(원래 이슈 + 우리가 남들과는 달리 내놓을 수 있는 콘텐트)로
 * 콘텐트, 페이지를 만드는 것은?」 · 「전 세션에 공유, 꼭 반영케 하도록 함」
 * 전문: docs/작업틀-이슈더하기우리축.md
 *
 * 이슈  BTS 아리랑 영국 오피셜 앨범 차트 24주째 (스포츠월드 제목)
 * 축    우리가 가진 한국 연예인 9,249명의 생일 → 별자리 분포
 *
 * ── 🔴 이 자가 절대 안 하는 것 ─────────────────────────────
 * ⛔ **풀이를 하지 않는다.** 「염소자리라서 …」는 우리 강령에 정면으로 걸린다.
 * ⛔ **「특별한 배치」라고 쓰지 않는다.** 재 보면 여섯 가지가 «가장 흔한» 결과다.
 * ⭐ 우리가 내는 것은 둘 — 일곱 명의 자리(사실)와, 그것이 우연 안인지(위험).
 *
 * ── ⚠ 밟은 덫 ────────────────────────────────────────
 * 01-01 이 48명으로 가장 많다. 「생년만 알 때 채우는 날」이라 앞서 이미 잡아 둔 것이다.
 * 그래서 염소자리 수를 «그것을 뺀 값과 함께» 낸다. 하나만 내면 조용히 부풀려진다.
 * 02-28 도 48명이지만 까닭을 못 쟀으므로 표를 붙이지 않는다.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
/* 🔴 [2026-11-14] 영문 지면에 「오후」가 나갔다 — 잰 시각은 한 꼴로 적는다 */
import { 잰때문자 } from './lib/잰때.mjs';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 원자료 = path.join(뿌리, 'archive/raw/wikidata/korean-entertainers-birth.json');
const 낼곳 = path.join(뿌리, 'src/data/kcw-bts-signs.json');

/** 널리 쓰이는 경계다. 해마다 몇 시간씩 밀리므로 지면에 그 사실을 적는다. */
export const 자리표 = [
  ['Capricorn', 12, 22, 1, 19], ['Aquarius', 1, 20, 2, 18], ['Pisces', 2, 19, 3, 20],
  ['Aries', 3, 21, 4, 19], ['Taurus', 4, 20, 5, 20], ['Gemini', 5, 21, 6, 20],
  ['Cancer', 6, 21, 7, 22], ['Leo', 7, 23, 8, 22], ['Virgo', 8, 23, 9, 22],
  ['Libra', 9, 23, 10, 22], ['Scorpio', 10, 23, 11, 21], ['Sagittarius', 11, 22, 12, 21],
];

export function 별자리(월, 일) {
  if (!월 || !일) return null;
  for (const [이름, m1, d1, m2, d2] of 자리표) {
    if (m1 <= m2) {
      if ((월 === m1 && 일 >= d1) || (월 === m2 && 일 <= d2) || (월 > m1 && 월 < m2)) return 이름;
    } else if ((월 === m1 && 일 >= d1) || (월 === m2 && 일 <= d2)) return 이름;
  }
  return null;
}

/** 씨앗 고정 난수 — 다시 돌려도 같은 수가 나와야 «재현 가능»하다 */
export function 난수기(씨앗) {
  let s = 씨앗 >>> 0;
  return () => { s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}

/** 일곱을 뽑았을 때 «서로 다른 자리»가 몇 가지인지의 분포. 우리 실제 분포에서 뽑는다 */
export function 서로다른자리분포(자리들, 뽑을수 = 7, 번 = 200000, 씨앗 = 20260905) {
  const 주사위 = 난수기(씨앗);
  const 셈 = new Array(뽑을수 + 1).fill(0);
  for (let i = 0; i < 번; i += 1) {
    const 든것 = new Set();
    for (let k = 0; k < 뽑을수; k += 1) 든것.add(자리들[Math.floor(주사위() * 자리들.length)]);
    셈[든것.size] += 1;
  }
  return 셈.map((n) => n / 번);
}

/** 기대에서 몇 표준편차인가. 열두 칸에 고르게 떨어진다는 것을 영가설로 둔다 */
export function 몇표준편차(관측, 합, 칸 = 12) {
  const 기대 = 합 / 칸;
  const sd = Math.sqrt(기대 * ((칸 - 1) / 칸));
  return { 기대, sd, 편차: (관측 - 기대) / sd };
}

export const BTS = [
  { 이름: 'Jin', 본명: 'Kim Seok-jin', 태어난날: '1992-12-04' },
  { 이름: 'Suga', 본명: 'Min Yoon-gi', 태어난날: '1993-03-09' },
  { 이름: 'J-Hope', 본명: 'Jung Ho-seok', 태어난날: '1994-02-18' },
  { 이름: 'RM', 본명: 'Kim Nam-joon', 태어난날: '1994-09-12' },
  { 이름: 'Jimin', 본명: 'Park Ji-min', 태어난날: '1995-10-13' },
  { 이름: 'V', 본명: 'Kim Tae-hyung', 태어난날: '1995-12-30' },
  { 이름: 'Jung Kook', 본명: 'Jeon Jung-kook', 태어난날: '1997-09-01' },
];

const 달의날수 = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function 본일() {
  const 원 = JSON.parse(readFileSync(원자료, 'utf8'));
  const 사람들 = Array.isArray(원) ? 원 : Object.values(원).find((v) => Array.isArray(v));

  const 자리들 = [];
  const 달별 = {};
  const 날별 = {};
  for (const p of 사람들) {
    const b = String(p.born ?? '');
    const 월 = Number(b.slice(5, 7));
    const 일 = Number(b.slice(8, 10));
    const s = 별자리(월, 일);
    if (!s) continue;
    자리들.push(s);
    달별[월] = (달별[월] ?? 0) + 1;
    const md = b.slice(5, 10);
    날별[md] = (날별[md] ?? 0) + 1;
  }
  const 합 = 자리들.length;
  const 셈 = {};
  for (const s of 자리들) 셈[s] = (셈[s] ?? 0) + 1;
  const 새해첫날 = 날별['01-01'] ?? 0;

  const 자리별 = 자리표.map(([이름]) => {
    const n = 셈[이름] ?? 0;
    const { 기대, 편차 } = 몇표준편차(n, 합);
    return {
      자리: 이름,
      사람: n,
      새해첫날뺀것: 이름 === 'Capricorn' ? n - 새해첫날 : n,
      기대: Math.round(기대),
      표준편차: Number(편차.toFixed(1)),
      잡음밖인가: Math.abs(편차) >= 2,
    };
  });

  const 멤버 = BTS.map((m) => ({
    ...m,
    자리: 별자리(Number(m.태어난날.slice(5, 7)), Number(m.태어난날.slice(8, 10))),
  }));
  const 서로다른 = new Set(멤버.map((m) => m.자리)).size;
  const 분포 = 서로다른자리분포(자리들);

  const 달목록 = Object.entries(달별)
    .map(([m, n]) => ({ 달: Number(m), 사람: n, 하루당: Number((n / 달의날수[Number(m) - 1]).toFixed(1)) }))
    .sort((a, b) => a.달 - b.달);

  const 나온것 = {
    잰때: 잰때문자(),
    이슈: 'BTS Arirang, 24th week on the UK Official Albums Chart (Sports World headline, 2026-09)',
    whatThisIs: 'The star signs of the seven BTS members, and whether that arrangement is unusual '
      + `against the ${합} Korean entertainers whose birth dates we hold.`,
    whatThisIsNot: [
      'Not a reading. We never say what a sign means about anyone.',
      'Not a claim that BTS is unusual. Six distinct signs is the single most likely outcome.',
      'Not a natal chart. Public profiles carry no birth times, so no chart is possible.',
      'Not a claim about the UK chart. We did not measure it and it is only the reason we looked.',
    ],
    출처: ['Wikidata — Korean entertainers with a date of birth (P569)'],
    멤버,
    서로다른자리: 서로다른,
    뽑기분포: 분포.map((몫, k) => ({ 가지: k, 몫: Number((몫 * 100).toFixed(1)) })).filter((x) => x.가지 >= 3),
    이배치가나올확률: Number((분포[서로다른] * 100).toFixed(1)),
    사람총수: 합,
    자리별,
    달별: 달목록,
    새해첫날인사람: 새해첫날,
    못잰것: [
      'Birth times. Public profiles do not carry them, so no natal chart is possible.',
      'Sign boundaries move by a few hours from year to year. Someone born on a boundary day may fall the other way in their own birth year.',
      `${새해첫날} people are recorded as born on 1 January. That is the date used when only a year is known, so Capricorn is shown twice — as counted and with those removed.`,
      '48 people are recorded on 28 February and we could not establish why. We did not flag it, because a guess would make the flag itself untrustworthy.',
    ],
  };
  writeFileSync(낼곳, `${JSON.stringify(나온것, null, 2)}\n`);
  console.log(`✅ ${낼곳}`);
  console.log(`   BTS 서로 다른 자리 ${서로다른}가지 · 그 배치가 나올 확률 ${나온것.이배치가나올확률}%`);
  console.log(`   잡음(±2σ) 밖인 자리 — ${자리별.filter((x) => x.잡음밖인가).map((x) => `${x.자리} ${x.표준편차}σ`).join(' · ')}`);
}

function 자가시험() {
  let 든것 = 0; let 깬것 = 0;
  const 재 = (말, a, b) => {
    if (JSON.stringify(a) === JSON.stringify(b)) 든것 += 1;
    else { 깬것 += 1; console.log(`  🔴 ${말} — 나온 것 ${JSON.stringify(a)} / 바란 것 ${JSON.stringify(b)}`); }
  };
  재('12월 30일은 염소자리', 별자리(12, 30), 'Capricorn');
  재('1월 19일도 염소자리 — 해를 넘는 자리를 옳게 잇는다', 별자리(1, 19), 'Capricorn');
  재('1월 20일은 물병자리 — 경계 하루 차이', 별자리(1, 20), 'Aquarius');
  재('12월 21일은 사수자리 — 반대쪽 경계', 별자리(12, 21), 'Sagittarius');
  재('9월 1일은 처녀자리', 별자리(9, 1), 'Virgo');
  재('9월 12일도 처녀자리 — RM 과 정국이 겹치는 자리다', 별자리(9, 12), 'Virgo');
  재('10월 13일은 천칭자리', 별자리(10, 13), 'Libra');
  재('12월 4일은 사수자리', 별자리(12, 4), 'Sagittarius');
  재('3월 9일은 물고기자리', 별자리(3, 9), 'Pisces');
  재('2월 18일은 물병자리', 별자리(2, 18), 'Aquarius');
  재('2월 19일은 물고기자리 — 하루 차이로 넘어간다', 별자리(2, 19), 'Pisces');
  재('달이 없으면 null', 별자리(0, 5), null);
  재('날이 없으면 null', 별자리(5, 0), null);

  const 첫 = 난수기(20260905); const 값 = [첫(), 첫(), 첫()];
  const 둘 = 난수기(20260905);
  재('⭐ 씨앗이 같으면 같은 수가 나온다 — 재현 가능해야 한다', [둘(), 둘(), 둘()], 값);
  재('씨앗이 다르면 다른 수가 나온다', 난수기(1)() === 난수기(2)(), false);

  const 고른12 = 자리표.map(([n]) => n);
  const 분포 = 서로다른자리분포(고른12, 7, 20000, 20260905);
  재('분포를 다 더하면 1 이다', Math.round(분포.reduce((s, v) => s + v, 0) * 100) / 100, 1);
  재('일곱을 뽑으면 여덟 가지가 나올 수 없다', 분포[8] ?? 0, 0);
  재('🔴 여섯 가지는 드문 일이 아니다 — 30%를 넘는다', 분포[6] > 0.3, true);
  재('일곱 가지가 여섯 가지보다 드물다', 분포[7] < 분포[6], true);

  재('919 는 기대(771)에서 5표준편차 넘게 떨어져 있다', 몇표준편차(919, 9249).편차 > 5, true);
  재('688 은 아래쪽으로 3표준편차 넘게 떨어져 있다', 몇표준편차(688, 9249).편차 < -3, true);
  재('기대와 같으면 편차가 0 이다', Math.abs(몇표준편차(771, 9252).편차) < 0.01, true);

  const 자리들 = BTS.map((m) => 별자리(Number(m.태어난날.slice(5, 7)), Number(m.태어난날.slice(8, 10))));
  재('BTS 일곱 명이 다 자리를 받는다', 자리들.every(Boolean), true);
  재('⭐ 일곱 중 서로 다른 자리는 여섯이다', new Set(자리들).size, 6);
  재('겹치는 자리는 처녀자리 하나뿐이다', 자리들.filter((s) => s === 'Virgo').length, 2);
  재('일곱 명이 다 다른 사람이다 — 이름이 겹치지 않는다', new Set(BTS.map((m) => m.이름)).size, 7);

  console.log(`\n자가시험 ${든것}가지 통과${깬것 ? ` · 🔴 ${깬것}가지 깨짐` : ''}`);
  if (깬것) process.exitCode = 1;
}

const 이파일이시작인가 = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (이파일이시작인가) {
  if (process.argv.includes('--시험')) 자가시험();
  else 본일();
}
