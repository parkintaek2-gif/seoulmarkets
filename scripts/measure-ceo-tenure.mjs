/* 한국 상장사 «대표이사가 그 자리에 얼마나 오래 있었나» — 센다
 *
 * ── 왜 이 자인가 (2026-10-12 15:3x · 5번) ─────────────────────────
 *   `check-쥔자료에-안쓴축이-있나.mjs` 가 내놓은 186개 가운데 골랐다.
 *   `korea-executives-tape.json` 은 2,769개 회사의 대표 3,589명을 담고 있는데
 *   그 가운데 `tenure` 칸을 쓴 지면이 없었다.
 *
 *   고른 까닭 — **그 지면에만 있는 수**가 나온다.
 *   영어권 손님이 「한국 기업 지배구조」를 볼 때 묻는 수이고,
 *   우리 말고 영문으로 이걸 센 곳을 우리는 모른다.
 *
 * ── ⛔ 이 자가 하지 않는 것 ───────────────────────────────────────
 * ⛔ 「오래 있는 것이 좋다/나쁘다」를 말하지 않는다. 얼마나 오래인가까지다.
 * ⛔ 다른 나라와 견주지 않는다 — **우리가 안 쟀다.** 남의 수를 옮겨 적지 않는다.
 * ⛔ 평균을 앞에 내지 않는다. 평균이 규범이 되면 나침반이 아니라 압박이 된다. 분포로 낸다.
 * ⛔ 동명이인을 가리지 않는다 — 생년이 없다. 그래서 「겸직」은 아예 안 센다.
 * ⛔ 못 잰 것을  몇 명을 못 쟀는지 지면에 적는다.
 *
 * 돌리기   node scripts/measure-ceo-tenure.mjs            자료를 만든다
 *          node scripts/measure-ceo-tenure.mjs --자가시험   자를 잰다
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 여기 = path.dirname(fileURLToPath(import.meta.url));
const 뿌리 = path.resolve(여기, '..');

/* ── 재는 규칙 — 자가시험이 이것들을 잰다 ───────────────────────── */

/** 'N years' · '1 year' · 'N months' 를 햇수로. 못 읽으면 null (⛔ 0 이 아니다) */
export function 햇수로(글) {
  const t = String(글 ?? '').trim();
  if (!t) return null;
  const m = t.match(/^(\d+)\s*(years?|months?)$/i);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n < 0) return null;
  return /month/i.test(m[2]) ? n / 12 : n;
}

/** 회사 나이(해) — 설립일을 못 읽으면 null (⛔ 0 이 아니다) */
export function 회사나이(설립일, 오늘 = new Date()) {
  const t = String(설립일 ?? '').trim();
  const m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const 해 = Number(m[1]);
  if (해 < 1800 || 해 > 오늘.getFullYear()) return null;
  const 그때 = new Date(해, Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(그때.getTime())) return null;
  return (오늘 - 그때) / (365.2425 * 24 * 60 * 60 * 1000);
}

/* 재임이 회사 나이보다 길면 둘 중 하나가 틀렸다.
 * ⛔ 버리지 않는다 — 따로 세어 지면에 수를 적는다.
 * ⚠ 흔한 까닭은 평범하다 — 회사를 다시 세우거나 이름을 바꾸면
 *   설립일은 되돌아가는데 재임은 앞 회사 것을 이어 적는다.
 * 여유 1년 — 달·날을 모르는 공시가 있어 딱 맞아떨어지지 않는다 */
export const 여유해 = 1;

/** '걸러야 하나' — 참이면 분포에서 빼고 따로 센다. 나이를 모르면 «거르지 않는다» */
export function 설립보다긴가(재임해, 나이해) {
  if (재임해 == null || 나이해 == null) return false;
  return 재임해 > 나이해 + 여유해;
}

/** 분위수 — 오름차순으로 정렬된 배열에서 */
export function 분위(정렬된, p) {
  if (!Array.isArray(정렬된) || !정렬된.length) return null;
  const i = Math.min(정렬된.length - 1, Math.max(0, Math.floor(정렬된.length * p)));
  return 정렬된[i];
}

/** 칸 나누기 — 아래는 넣고 위는 뺀다 [아래, 위) */
export const 칸들 = [
  [0, 1], [1, 3], [3, 5], [5, 10], [10, 20], [20, 30], [30, Infinity],
];

export function 칸이름(아래, 위) {
  if (위 === Infinity) return `${아래}+ years`;
  if (아래 === 0) return 'Under 1 year';
  return `${아래}–${위} years`;
}

export function 칸에넣기(햇수들) {
  return 칸들.map(([a, b]) => {
    const n = 햇수들.filter((v) => v >= a && v < b).length;
    return {
      아래: a,
      위: b === Infinity ? null : b,
      이름: 칸이름(a, b),
      수: n,
      몫: 햇수들.length ? n / 햇수들.length : null,
    };
  });
}

/* ── 자가시험 ───────────────────────────────────────────────────── */
function 자가시험() {
  let 통과 = 0; let 실패 = 0;
  const 같나 = (무엇, 잰것, 바라는것) => {
    const a = JSON.stringify(잰것); const b = JSON.stringify(바라는것);
    if (a === b) { 통과 += 1; return; }
    실패 += 1;
    console.log('  🔴 ' + 무엇 + '  잰것 ' + a + ' / 바란것 ' + b);
  };

  같나('25 years', 햇수로('25 years'), 25);
  같나('1 year(단수)', 햇수로('1 year'), 1);
  같나('6 months', 햇수로('6 months'), 0.5);
  같나('1 month', 햇수로('1 month'), 1 / 12);
  같나('빈 것은 null — ⛔ 0 이 아니다', 햇수로(''), null);
  같나('undefined 도 null', 햇수로(undefined), null);
  같나('못 읽는 꼴은 null', 햇수로('since 2001'), null);
  같나('앞뒤 빈칸을 턴다', 햇수로('  3 years  '), 3);
  같나('0 years 는 0 이다 — null 이 아니다', 햇수로('0 years'), 0);

  const 정렬 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  같나('중앙값', 분위(정렬, 0.5), 6);
  같나('빈 배열은 null', 분위([], 0.5), null);

  const 칸 = 칸에넣기([0.5, 2, 2, 4, 7, 12, 25, 40]);
  같나('0~1년 한 명', 칸[0].수, 1);
  같나('1~3년 두 명', 칸[1].수, 2);
  같나('30+ 한 명', 칸[6].수, 1);
  같나('칸 수를 다 더하면 전체', 칸.reduce((s, c) => s + c.수, 0), 8);
  같나('30+ 이름', 칸[6].이름, '30+ years');
  같나('0~1 이름', 칸[0].이름, 'Under 1 year');
  같나('빈 입력이면 몫은 null — ⛔ 0% 가 아니다', 칸에넣기([])[0].몫, null);

  /* ⚠ 20 은 10~20 칸이 아니라 20~30 칸이다 — 위는 뺀다 */
  같나('경계 20 은 위 칸으로', 칸에넣기([20])[5].수, 1);
  같나('경계 20 은 아래 칸에 없다', 칸에넣기([20])[4].수, 0);

  /* ── 설립일 견줌 — 기사(korea-ceo-tenure-eleven-year-median)가 쓴 것과 같은 거름 ── */
  const 오늘 = new Date(2026, 9, 12);
  const 가깝나 = (무엇, 잰것, 바라는것, 틈 = 0.05) => {
    if (잰것 != null && Math.abs(잰것 - 바라는것) <= 틈) { 통과 += 1; return; }
    실패 += 1;
    console.log('  🔴 ' + 무엇 + '  잰것 ' + 잰것 + ' / 바란것 ' + 바라는것);
  };
  가깝나('1897 설립이면 129살쯤', 회사나이('1897-02-19', 오늘), 129.6, 0.2);
  같나('설립일이 없으면 null — ⛔ 0 이 아니다', 회사나이(null, 오늘), null);
  같나('꼴이 다르면 null', 회사나이('1897/02/19', 오늘), null);
  같나('앞날 설립은 null', 회사나이('2099-01-01', 오늘), null);

  같나('재임 58년 · 회사 30살이면 거른다', 설립보다긴가(58, 30), true);
  같나('재임 55년 · 회사 60살이면 안 거른다', 설립보다긴가(55, 60), false);
  같나('여유 1년 안쪽은 안 거른다', 설립보다긴가(30.5, 30), false);
  같나('여유를 넘으면 거른다', 설립보다긴가(31.5, 30), true);
  같나('나이를 모르면 «거르지 않는다»', 설립보다긴가(58, null), false);
  같나('재임을 모르면 거르지 않는다', 설립보다긴가(null, 30), false);

  console.log('\n자가시험 ' + (통과 + 실패) + '개 · 통과 ' + 통과 + ' · 실패 ' + 실패);
  return 실패 === 0;
}

/* ── 본체 ───────────────────────────────────────────────────────── */
function 센다() {
  const 테이프 = JSON.parse(fs.readFileSync(path.join(뿌리, 'src/data/korea-executives-tape.json'), 'utf8'));
  const 이름표 = JSON.parse(fs.readFileSync(path.join(뿌리, 'src/data/kr-listed-company-names.json'), 'utf8'));
  const 프로필 = JSON.parse(fs.readFileSync(path.join(뿌리, 'src/data/korea-company-profile-tape.json'), 'utf8'));

  const 회사이름 = new Map();
  for (const c of 이름표.회사들 ?? []) {
    if (c && c.ticker && c.name) 회사이름.set(String(c.ticker), String(c.name));
  }

  const 설립 = new Map();
  for (const r of 프로필.rows ?? []) {
    if (r && r.code && r.founded_on) 설립.set(String(r.code), String(r.founded_on));
  }

  const 줄 = [];
  for (const [ticker, 사람들] of Object.entries(테이프.byTicker ?? {})) {
    for (const r of 사람들 ?? []) 줄.push({ ...r, ticker: String(ticker) });
  }

  const 오늘 = new Date();
  const 잰것 = [];
  const 거른것 = [];
  let 못잰것 = 0;
  let 나이모름 = 0;
  for (const r of 줄) {
    const y = 햇수로(r.tenure);
    if (y === null) { 못잰것 += 1; continue; }
    const 나이 = 회사나이(설립.get(r.ticker), 오늘);
    if (나이 == null) 나이모름 += 1;
    const 한줄 = { ...r, 햇수: y, 회사나이: 나이 };
    if (설립보다긴가(y, 나이)) 거른것.push(한줄);
    else 잰것.push(한줄);
  }

  const 햇수들 = 잰것.map((r) => r.햇수).sort((a, b) => a - b);

  const 상근 = 잰것.filter((r) => r.fullTime === true).map((r) => r.햇수).sort((a, b) => a - b);
  const 비상근 = 잰것.filter((r) => r.fullTime === false).map((r) => r.햇수).sort((a, b) => a - b);
  const 비상근전체 = 줄.filter((r) => r.fullTime === false).length;

  /* 가장 오래 앉은 열둘 — ⛔ 고르지 않는다. 햇수 차례대로다.
     ⚠ 거른 것은 여기 안 들어온다 — 기사가 이미 의심스럽다고 밝힌 줄들이다 */
  const 꾸미기 = (r) => ({
    ticker: r.ticker,
    회사: 회사이름.get(r.ticker) ?? null,
    사람: r.nameRoman ?? null,
    직함: r.title ?? null,
    햇수: r.햇수,
    회사나이: r.회사나이,
    상근인가: r.fullTime === true,
  });
  const 오래 = [...잰것].sort((a, b) => b.햇수 - a.햇수).slice(0, 12).map(꾸미기);
  const 거른보기 = [...거른것].sort((a, b) => b.햇수 - a.햇수).slice(0, 6).map(꾸미기);
  const 회사이름못찾음 = 오래.filter((r) => !r.회사).length;

  return {
    _무엇: 'How long Korean listed-company CEOs have held the seat.',
    _출처: 테이프._meta?.출처 ?? 'DART',
    _원자료만든때: 테이프._meta?.만든때 ?? null,
    _잰때: new Date().toLocaleString('sv-SE').replace('T', ' '),   /* ⛔ toISOString 금지 — KST 다 */
    _밝힐것: [
      'Tenure is the figure the company itself filed; we did not recompute it from appointment dates.',
      'We do not identify people across companies — the filings carry no birth date, so same-name rows are not merged.',
      'Rows whose tenure we could not read are counted as unmeasured, never as zero.',
      'Rows stating a tenure longer than the company has existed are set aside and counted, not deleted.',
    ],
    _옆지면: {
      주소: '/article/korea-ceo-tenure-eleven-year-median',
      무엇: 'Our own article counts one chief executive per company (the longest-serving where there are several). This page counts every seat. The two numbers differ for that reason, and both are stated.',
    },
    회사수: Number(테이프._meta?.회사수 ?? 0),
    대표수: 줄.length,
    잰수: 잰것.length,
    못잰수: 못잰것,
    거른수: 거른것.length,
    나이모름: 나이모름,
    거른보기: 거른보기,
    분위: {
      p25: 분위(햇수들, 0.25),
      중앙: 분위(햇수들, 0.5),
      p75: 분위(햇수들, 0.75),
      최대: 햇수들.length ? 햇수들[햇수들.length - 1] : null,
    },
    칸: 칸에넣기(햇수들),
    스물넘은수: 햇수들.filter((v) => v >= 20).length,
    상근대비: {
      상근: { 수: 상근.length, 중앙: 분위(상근, 0.5) },
      비상근: { 전체: 비상근전체, 잰수: 비상근.length, 중앙: 분위(비상근, 0.5) },
    },
    오래: 오래,
    회사이름못찾음,
  };
}

/* ── 들머리 ─────────────────────────────────────────────────────── */
if (process.argv.includes('--자가시험')) {
  process.exit(자가시험() ? 0 : 1);
}

const 결과 = 센다();
const 낼곳 = path.join(뿌리, 'src/data/ceo-tenure.json');
fs.writeFileSync(낼곳, JSON.stringify(결과, null, 1), 'utf8');

console.log('■ 한국 상장사 대표이사 재임 기간');
console.log('   회사 ' + 결과.회사수 + ' · 대표 ' + 결과.대표수);
console.log('   잰 것 ' + 결과.잰수 + ' · ⬜ 못 잰 것 ' + 결과.못잰수
  + ' (' + (결과.못잰수 / 결과.대표수 * 100).toFixed(1) + '%)');
console.log('   ⚠ 설립일보다 긴 재임이라 따로 센 것 ' + 결과.거른수
  + ' · 설립일 자체를 모르는 것 ' + 결과.나이모름);
console.log('   중앙 ' + 결과.분위.중앙 + '년 · 1사분위 ' + 결과.분위.p25
  + ' · 3사분위 ' + 결과.분위.p75 + ' · 가장 긴 것 ' + 결과.분위.최대 + '년');
for (const c of 결과.칸) {
  console.log('     ' + c.이름.padEnd(16) + String(c.수).padStart(5)
    + '  ' + (c.몫 == null ? '—' : (c.몫 * 100).toFixed(1) + '%'));
}
console.log('   20년 넘은 사람 ' + 결과.스물넘은수
  + ' (' + (결과.스물넘은수 / 결과.잰수 * 100).toFixed(1) + '%)');
console.log('   상근 중앙 ' + 결과.상근대비.상근.중앙 + '년 / 비상근 중앙 '
  + 결과.상근대비.비상근.중앙 + '년 (' + 결과.상근대비.비상근.잰수 + '명 쟀다)');
if (결과.회사이름못찾음) console.log('   ⬜ 맨 위 열둘 가운데 회사 영문명을 못 찾은 것 ' + 결과.회사이름못찾음);
console.log('✅ ' + 낼곳);
