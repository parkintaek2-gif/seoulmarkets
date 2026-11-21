/**
 * parquet-out.mjs — 행(줄) 배열 + 머리칸을 Parquet 파일로 낸다.
 *
 * ── 왜 (P1 Ⅲ-3-1 · F5) ────────────────────────────────────────────────────
 * 「파일 CSV(모두가 연다) + Parquet(큰 것을 빨리 읽는다)」. CSV 표본을 만들 때
 * «같은 표본»을 Parquet 으로도 낸다 — 손님이 pandas·DuckDB 로 바로 읽게.
 *
 * ⛔ 이 자가 지키는 것
 * ⛔  — null/undefined 는 그대로 null 로 낸다(hyparquet-writer 가
 *   nullable 컬럼을 기본 지원한다). 숫자 칸에서 Number(null)===0 함정을 만들지 않는다
 * ✅ 칸마다 타입을 «잰다» — 표본 안의 모든 값이 유한수(또는 빈 값)면 DOUBLE, 아니면 STRING.
 *   지어내지 않는다: 한 값이라도 숫자가 아니면 그 칸은 통째로 STRING 이다(섞어 낼 수 없다)
 */
import { parquetWriteFile } from 'hyparquet-writer';

/**
 * 🔴 [2026-09-11 실측] 「005930」처럼 앞자리 0 이 있는 종목코드를 숫자로 잘못 재면
 * DOUBLE 로 바뀌며 「5930」이 되어 앞자리 0 이 지워진다 — 라운드트립으로 실측해서 잡았다.
 * ⇒ 문자열은 String(Number(v)) === v 일 때만 «진짜 숫자 표기»로 인정한다.
 */
function 진짜숫자문자열인가(v) {
  if (v.trim() === '') return false;
  const n = Number(v);
  return Number.isFinite(n) && String(n) === v.trim();
}

/** 칸 하나의 값들을 보고 DOUBLE 인지 STRING 인지 잰다. 빈 값은 판단에서 뺀다 */
export function 칸타입(값들) {
  let 숫자아닌것있음 = false;
  let 값있음 = false;
  for (const v of 값들) {
    if (v === null || v === undefined || v === '') continue;
    값있음 = true;
    if (typeof v === 'number') { if (!Number.isFinite(v)) { 숫자아닌것있음 = true; break; } continue; }
    if (typeof v === 'string' && 진짜숫자문자열인가(v)) continue;
    숫자아닌것있음 = true; break;
  }
  if (!값있음) return 'STRING'; // 칸이 통째로 비었으면 문자로 낸다(타입을 지어내지 않는다)
  return 숫자아닌것있음 ? 'STRING' : 'DOUBLE';
}

/** 행(객체) 배열 + 머리칸(칸 이름 순서) → hyparquet-writer columnData */
export function 열로바꾸기(줄들, 머리칸) {
  return 머리칸.map((k) => {
    const 원값들 = 줄들.map((r) => (r[k] === undefined ? null : r[k]));
    const 타입 = 칸타입(원값들);
    const data = 타입 === 'DOUBLE'
      ? 원값들.map((v) => (v === null || v === '' ? null : Number(v)))
      : 원값들.map((v) => (v === null ? null : String(v)));
    return { name: k, data, type: 타입 };
  });
}

/** 줄들 + 머리칸을 파일경로에 .parquet 로 쓴다. 줄이 0개면 쓰지 않는다(빈 스키마를 지어내지 않는다) */
export function parquet로쓰기(줄들, 머리칸, 파일경로) {
  if (!Array.isArray(줄들) || 줄들.length === 0) return false;
  parquetWriteFile({ filename: 파일경로, columnData: 열로바꾸기(줄들, 머리칸) });
  return true;
}

const 나 = process.argv[1] && new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1') === process.argv[1].replace(/\\/g, '/');

if (나 && process.argv.includes('--자가시험')) {
  let 통 = 0; const 실 = [];
  const 검 = (n, ok) => { if (ok) 통 += 1; else 실.push(n); };

  검('칸타입 — 전부 숫자면 DOUBLE', 칸타입([1, 2, 3]) === 'DOUBLE');
  검('칸타입 — 숫자 문자열도 DOUBLE 로 잰다', 칸타입(['1', '2.5', null]) === 'DOUBLE');
  검('칸타입 — 하나라도 글자면 STRING', 칸타입([1, 2, 'abc']) === 'STRING');
  검('⛔ 칸타입 — 통째로 비었으면 STRING(타입을 지어내지 않는다)', 칸타입([null, '', undefined]) === 'STRING');
  검('칸타입 — 빈 값은 판단에서 뺀다(나머지가 숫자면 DOUBLE)', 칸타입([1, null, '', 2]) === 'DOUBLE');
  검('🔴 칸타입 — 「005930」처럼 앞자리 0 있는 코드는 STRING(숫자로 재면 5930 이 된다)',
    칸타입(['005930', '000660']) === 'STRING');
  검('칸타입 — 「1234」처럼 앞자리 0 없는 숫자문자열은 그대로 DOUBLE', 칸타입(['1234', '5678']) === 'DOUBLE');

  const 줄들 = [{ a: 1, b: 'x', c: null }, { a: 2, b: 'y', c: null }];
  const 열 = 열로바꾸기(줄들, ['a', 'b', 'c']);
  검('열로바꾸기 — 칸 순서를 머리칸대로', 열.map((c) => c.name).join(',') === 'a,b,c');
  검('열로바꾸기 — 숫자 칸은 DOUBLE', 열[0].type === 'DOUBLE' && 열[0].data[0] === 1);
  검('열로바꾸기 — 글자 칸은 STRING', 열[1].type === 'STRING' && 열[1].data[1] === 'y');
  검('⛔ 열로바꾸기 — null 을 0 으로 바꾸지 않는다', 열[2].data[0] === null);

  검('⛔ parquet로쓰기 — 줄이 0개면 안 쓴다(빈 스키마를 지어내지 않는다)',
    parquet로쓰기([], ['a'], '/아무데나/x.parquet') === false);

  if (실.length) {
    console.error(`❌ 자가시험 실패 ${실.length}\n${실.map((x) => `   · ${x}`).join('\n')}`);
    process.exit(1);
  }
  console.log(`✅ parquet-out 자가시험 ${통}개 통과`);
  process.exit(0);
}
