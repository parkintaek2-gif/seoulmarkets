#!/usr/bin/env node
/**
 * collect-jgb-yields.mjs — **일본 국채 금리 곡선** (재무성·영문·열쇠 없음)
 * ─────────────────────────────────────────────────────────────────────────
 * 사장님: 「도쿄도 알아봐, 금융시장」 · 「마감시간을 왜 항상 길게 잡냐? 그냥 바로바로 해」
 *
 * ⭐ 이것이 우리 «채권·금리» 갈래에 일본을 한 번에 넣는다.
 *   만기 15개(1Y~40Y)를 «날마다» 준다 — AsianBondsOnline 의 2/5/10년보다 훨씬 깊다.
 *
 * 🔴 소급이 «안 되는» 자료다. 재무성은 **이번 달치만** 이 주소에 둔다.
 *   달이 바뀌면 지난 달 값은 이 파일에서 사라진다 ⇒ 날마다 받아 쌓아야 한다.
 *   ⛔ 「연말에 한 번에 받지」로 미루면 그 사이 날짜가 영영 빈다.
 *
 * ⚠ 파일이 CSV 인데 머리에 설명 줄이 한 줄 붙어 온다 — 둘째 줄이 칸 이름이다.
 *
 *   node scripts/collect-jgb-yields.mjs           받아서 쌓는다
 *   node scripts/collect-jgb-yields.mjs --시험    자가시험만
 */
import { mkdirSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const 주소 = 'https://www.mof.go.jp/english/jgbs/reference/interest_rate/jgbcme.csv';
export const 쌓는곳 = path.join(뿌리, 'archive', 'raw', 'jgb-yields');

/**
 * 재무성 CSV 를 줄로 바꾼다.
 * ⛔ 「-」 나 빈칸을  — 그날 그 만기가 «없었다»는 것과
 *   「금리가 0 이었다」는 전혀 다른 말이다. 없으면 null 로 둔다.
 */
export function 읽는다(글) {
  const 줄 = String(글 ?? '').split(/\r?\n/).filter((s) => s.trim());
  if (줄.length < 2) return { 칸: [], 값: [], 못읽음: '줄이 모자란다' };
  /* 머리 줄을 찾는다 — 「Date」로 시작하는 줄이다. 설명 줄이 몇 개든 건너뛴다 */
  const 머리번호 = 줄.findIndex((s) => /^\s*Date\s*,/i.test(s));
  if (머리번호 < 0) return { 칸: [], 값: [], 못읽음: 'Date 로 시작하는 머리 줄이 없다' };
  const 칸 = 줄[머리번호].split(',').map((s) => s.trim()).filter(Boolean);
  const 값 = [];
  for (const s of 줄.slice(머리번호 + 1)) {
    const 쪽 = s.split(',').map((x) => x.trim());
    if (!/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(쪽[0] ?? '')) continue;
    const 한줄 = { date: 날짜맞추기(쪽[0]) };
    for (let i = 1; i < 칸.length; i += 1) {
      const v = 쪽[i];
      한줄[칸[i]] = (v === undefined || v === '' || v === '-') ? null : Number(v);
    }
    값.push(한줄);
  }
  return { 칸, 값 };
}

/** 2026/9/1 → 2026-09-01 . ⛔ toISOString 을 쓰지 않는다(UTC 라 날짜가 어긋난다) */
export function 날짜맞추기(s) {
  const m = String(s ?? '').match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (!m) return null;
  return m[1] + '-' + String(m[2]).padStart(2, '0') + '-' + String(m[3]).padStart(2, '0');
}

/** 그날 값이 몇 개 찼나 — 「행이 있다」를 「값이 있다」로 읽지 않으려고 센다 */
export function 채움(한줄) {
  const k = Object.keys(한줄 ?? {}).filter((x) => x !== 'date');
  return { 칸수: k.length, 찬것: k.filter((x) => Number.isFinite(한줄[x])).length };
}

/* ───────────────────────── 자가시험 ───────────────────────── */
function 자가시험() {
  const 것 = []; const 본다 = (이름, 참) => 것.push({ 이름, 참: !!참 });
  const 보기 = [
    'Interest Rate (September 2026),,,,,(Unit : %)',
    'Date,1Y,2Y,3Y,10Y,40Y',
    '2026/9/1,1.527,1.802,1.952,2.987,4.145',
    '2026/9/2,1.530,-,1.960,2.990,4.150',
  ].join('\n');
  const r = 읽는다(보기);

  본다('설명 줄을 건너뛰고 머리를 찾는다', r.칸[0] === 'Date');
  본다('만기 칸을 다 읽는다', r.칸.length === 6);
  본다('두 줄을 읽는다', r.값.length === 2);
  본다('날짜를 2026-09-01 꼴로 바꾼다', r.값[0].date === '2026-09-01');
  본다('수를 수로 읽는다', r.값[0]['10Y'] === 2.987);
  /* 🔴 여기가 이 자의 핵심이다 — 없는 것을 0 으로 채우면 「금리 0%」가 되어 거짓이 된다 */
  본다('「-」 를 0 이 아니라 null 로 둔다', r.값[1]['2Y'] === null);
  본다('없는 것을 ', r.값[1]['2Y'] !== 0);

  본다('머리 줄이 없으면 못 읽었다고 한다', 읽는다('아무 글').못읽음 !== undefined);
  본다('빈 글도 안 터진다', 읽는다('').값.length === 0);
  본다('날짜가 아닌 줄은 버린다', 읽는다('Date,1Y\n합계,9').값.length === 0);
  본다('잘못된 날짜는 null', 날짜맞추기('2026-13') === null);
  본다('채움을 센다', 채움(r.값[1]).찬것 === 4 && 채움(r.값[1]).칸수 === 5);

  const 진 = 것.filter((x) => !x.참);
  console.log('■ 자가시험 ' + (것.length - 진.length) + '/' + 것.length);
  for (const x of 진) console.log('   🔴 ' + x.이름);
  return 진.length === 0;
}

/* ───────────────────────── 실행 ───────────────────────── */
async function 받는다() {
  const r = await fetch(주소, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(60000) });
  if (!r.ok) throw new Error('재무성이 ' + r.status + ' 를 냈다');
  return await r.text();
}

const 직접 = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (직접) {
  if (process.argv.includes('--시험')) process.exit(자가시험() ? 0 : 1);
  if (!자가시험()) process.exit(1);
  console.log('');
  try {
    const 글 = await 받는다();
    const r = 읽는다(글);
    if (r.못읽음) { console.log('🔴 못 읽었다 — ' + r.못읽음); process.exit(1); }
    mkdirSync(쌓는곳, { recursive: true });
    const 오늘 = new Date();
    const 이름 = 오늘.getFullYear() + '-' + String(오늘.getMonth() + 1).padStart(2, '0')
      + '-' + String(오늘.getDate()).padStart(2, '0') + '.json';
    writeFileSync(path.join(쌓는곳, 이름), JSON.stringify({
      _메모: {
        상품: '일본 국채 금리 곡선 (JGB yield curve)',
        출처: 'Ministry of Finance, Japan — ' + 주소,
        받은때: 오늘.toLocaleString('ko-KR'),
        소급: '안 된다 — 이 주소는 «이번 달»치만 둔다. 날마다 받아야 한다',
        아닌것: ['투자 자문이 아니다', '실시간이 아니다'],
      },
      칸: r.칸, 값: r.값,
    }, null, 1), 'utf8');

    const 끝 = r.값[r.값.length - 1];
    const c = 채움(끝);
    console.log('■ 일본 국채 금리 — ' + 오늘.toLocaleString('ko-KR'));
    console.log('   받은 날 ' + r.값.length + '일 · 만기 ' + (r.칸.length - 1) + '개');
    console.log('   마지막 날 ' + 끝.date + ' — 값이 찬 만기 ' + c.찬것 + '/' + c.칸수);
    console.log('   1Y ' + 끝['1Y'] + ' · 10Y ' + 끝['10Y'] + ' · 30Y ' + 끝['30Y'] + ' · 40Y ' + 끝['40Y']);
    console.log('   ✔ ' + path.relative(뿌리, path.join(쌓는곳, 이름)));
    console.log('   ⚠ 이 주소는 이번 달치만 둔다 — 날마다 받아야 날짜가 안 빈다');
    console.log('   쌓인 날 ' + (existsSync(쌓는곳) ? readdirSync(쌓는곳).length : 0) + '개');
  } catch (e) {
    console.log('🔴 못 받았다 — ' + String(e.message).slice(0, 120));
    console.log('   ⛔ 「없다」가 아니라 「못 받았다」로 적는다.');
    process.exit(1);
  }
}
