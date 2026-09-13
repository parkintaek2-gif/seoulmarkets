#!/usr/bin/env node
/**
 * check-f7-data-quality.mjs — **F7(Korea Screener API) 밑감 일곱 벌의 「값이 맞나·빠진 날이
 * 있나」를 검사한다.**
 *
 * ── 왜 만들었나 (2026-09-13 · 3번) ───────────────────────────────────────────
 * 2026-09-12 업무분장에서 F7 여섯 조각 중 「⑤ 데이터 품질 — 3번, 값이 맞나·빠진 날이
 * 있나」를 맡았다. 09-13 에 6번이 people·mezzanine·ownership 까지 뚫어 일곱 엔드포인트가
 * 전부 라이브가 됐는데, **그 밑감을 «검사»로 지키는 자가 아직 없었다.**
 * 회사 강령 그대로다 — 「규칙은 문장이 아니라 검사로 둔다」.
 *
 * ── 이 자가 하는 것 / 안 하는 것 ─────────────────────────────────────────────
 * ```
 * ✅ 밑감이 있나 · 파싱되나 · «값이 있다고 부를 만큼» 채워졌나
 * ✅ 가장 최신 날짜가 참는 선 안에 있나 (check-archive-freshness.mjs 와 같은 결,
 *    단 여기는 API 가 실제로 내보내는 **가공본**을 잰다 — 원자료 폴더가 아니다)
 * ⛔ 라이브 서버에 curl 하지 않는다 — 배포 전에도, 오프라인에서도 돌아야 한다.
 *    src/data · src/lib 의 가공본을 직접 읽는다. 라이브 확인은 사람이 curl 로 따로 한다.
 * ⛔ 값 하나하나의 «정확성»(가령 삼성전자 인원수가 진짜 맞나)은 원자료 대조가 필요해
 *    이 자가 못 잰다 — 그건 수집기·빌더 자신의 자가시험 몫이다. 여기는 **공급 사고**만 잡는다.
 * ```
 *
 * ⚠ 밑감 일곱은 꼴이 **셋으로 갈린다** — 첫 삽질에서 둘을 놓쳤다(2026-09-13 실측) —
 *   ① 배열(행) 꼴          F2·F4·ownership·메자닌·사람           → 일반 검사
 *   ② 사전(딕셔너리) 꼴    F3 계정사전 — `{accountNames:{...}}`   → 키 개수만 잰다
 *   ③ JS 모듈(자동생성) 꼴  무역 — `src/lib/trade-data.mjs` 의 `TRADE.window.as_of`
 *      `src/data/*.json` 이 아니라 **빌드된 모듈**을 동적 import 해야 한다
 *
 * 쓰는 법
 *   node scripts/check-f7-data-quality.mjs
 *   node scripts/check-f7-data-quality.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** 자를 읽는다 — 배열이거나, {results:[...]} 꼴이거나 */
export function 배열읽기(파일경로) {
  const 절대경로 = path.join(뿌리, 파일경로);
  if (!fs.existsSync(절대경로)) return { 있나: false, 행: [] };
  const j = JSON.parse(fs.readFileSync(절대경로, 'utf8'));
  const 행 = Array.isArray(j) ? j : (j.results ?? j.rows ?? j.data ?? []);
  return { 있나: true, 행 };
}

/** yyyymmdd·yyyy-mm-dd·yyyy-mm·연도(숫자) 를 모두 Date 로 바꾼다. 못 바꾸면 null */
export function 날짜로(v) {
  if (v == null) return null;
  if (typeof v === 'number') {
    if (v > 1900 && v < 2100) return new Date(v, 11, 31); // 연도만
    return null;
  }
  const s = String(v);
  let m = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  m = s.match(/^(\d{4})-(\d{2})$/);
  if (m) return new Date(+m[1], +m[2] - 1, 28);
  m = s.match(/^(\d{4})$/);
  if (m) return new Date(+m[1], 11, 31);
  return null;
}

function 칸값(행, 후보칸들) {
  for (const 칸 of 후보칸들) if (행[칸] != null) return 행[칸];
  return null;
}

/** ① 배열(행) 꼴 검사 — 대부분의 밑감이 이 꼴이다 */
export function 행꼴검사({ 이름, 길, 날짜칸, 핵심칸, 참는일 }) {
  const 문제 = [];
  const { 있나, 행 } = 배열읽기(길);
  if (!있나) return { 이름, 통과: false, 문제: [`파일이 없다 — ${길}`] };
  if (행.length === 0) return { 이름, 통과: false, 문제: ['행이 0건이다 — 공급이 끊겼다'] };

  if (핵심칸) {
    const 비율 = 행.filter((r) => 칸값(r, 핵심칸) != null && 칸값(r, 핵심칸) !== '').length / 행.length;
    if (비율 < 0.9) 문제.push(`핵심칸(${핵심칸.join('|')}) 채움률 ${(비율 * 100).toFixed(1)}% — 90% 미만`);
  }

  if (날짜칸 && 참는일 != null) {
    const 날짜들 = 행.map((r) => 날짜로(칸값(r, 날짜칸))).filter(Boolean);
    if (날짜들.length === 0) {
      문제.push(`날짜칸(${날짜칸.join('|')})에서 하나도 못 읽었다 — 칸 이름이 바뀌었을 수 있다`);
    } else {
      const 최신 = new Date(Math.max(...날짜들.map((d) => d.getTime())));
      const 지남일 = Math.floor((Date.now() - 최신.getTime()) / 86400000);
      if (지남일 > 참는일) 문제.push(`가장 최근이 ${최신.toISOString().slice(0, 10)} — ${지남일}일 지남(참는 선 ${참는일})`);
    }
  }

  return { 이름, 통과: 문제.length === 0, 문제, 행수: 행.length };
}

/** ② 사전 꼴 검사 — F3 계정사전. 행이 아니라 «키 개수»로 잰다 */
export function 사전꼴검사({ 이름, 길, 사전칸, 최소키수 }) {
  const 절대경로 = path.join(뿌리, 길);
  if (!fs.existsSync(절대경로)) return { 이름, 통과: false, 문제: [`파일이 없다 — ${길}`] };
  const j = JSON.parse(fs.readFileSync(절대경로, 'utf8'));
  const 사전 = j[사전칸];
  if (!사전 || typeof 사전 !== 'object') return { 이름, 통과: false, 문제: [`「${사전칸}」 칸이 사전(객체) 꼴이 아니다`] };
  const 키수 = Object.keys(사전).length;
  if (키수 < 최소키수) return { 이름, 통과: false, 문제: [`키 ${키수}개 — ${최소키수}개 미만(공급이 줄었다)`], 행수: 키수 };
  return { 이름, 통과: true, 행수: 키수 };
}

/** ③ 모듈 꼴 검사 — 무역. 빌드된 src/lib/trade-data.mjs 를 동적 import 한다 */
export async function 모듈꼴검사({ 이름, 길, 참는일 }) {
  const 절대경로 = path.join(뿌리, 길);
  if (!fs.existsSync(절대경로)) return { 이름, 통과: false, 문제: [`파일이 없다 — ${길}(scripts/build-trade-api-data.mjs 로 만든다)`] };
  const mod = await import(pathToFileURL(절대경로).href);
  const TRADE = mod.TRADE;
  if (!TRADE?.national?.length) return { 이름, 통과: false, 문제: ['TRADE.national 이 비어 있다'] };
  const 문제 = [];
  const 최근월 = TRADE.window?.latest_month;
  const 최신 = 날짜로(최근월);
  if (!최신) {
    문제.push('window.latest_month 를 못 읽었다');
  } else {
    const 지남일 = Math.floor((Date.now() - 최신.getTime()) / 86400000);
    if (지남일 > 참는일) 문제.push(`가장 최근 달이 ${최근월} — ${지남일}일 지남(참는 선 ${참는일})`);
  }
  return { 이름, 통과: 문제.length === 0, 문제, 행수: TRADE.national.length };
}

/** F7 밑감 일곱 벌 — 검사 계획. `꼴` 이 어느 검사함수를 쓸지 정한다 */
export const 밑감들 = [
  { 꼴: '행', 이름: 'F2 밸류에이션', 길: 'src/data/korea-valuation-tape.json', 날짜칸: ['priceAsOf', 'price_as_of'], 핵심칸: ['ticker'], 참는일: 10 },
  { 꼴: '사전', 이름: 'F3 계정사전', 길: 'src/data/korea-financial-account-english.json', 사전칸: 'accountNames', 최소키수: 100 },
  { 꼴: '행', 이름: 'F4 지수 시세', 길: 'src/data/korea-index-tape.json', 날짜칸: ['date'], 핵심칸: ['close'], 참는일: 10 },
  { 꼴: '행', 이름: '5%룰 대량보유(ownership)', 길: 'src/data/korea-ownership-filings-tape.json', 날짜칸: ['filedOn', 'filed_on'], 핵심칸: ['holderName', 'holder_name'], 참는일: 400 },
  { 꼴: '행', 이름: '메자닌(CB·BW·EB)', 길: 'src/data/korea-mezzanine-tape.json', 날짜칸: ['boardResolutionDate', 'board_resolution_date'], 핵심칸: ['instrumentType', 'instrument_type'], 참는일: 400 },
  { 꼴: '행', 이름: '사람(근속·급여)', 길: 'src/data/korea-people-tape.json', 날짜칸: ['fiscalYear', 'fiscal_year'], 핵심칸: ['headcount'], 참는일: 400 },
  { 꼴: '모듈', 이름: '무역(국가×월 수출입)', 길: 'src/lib/trade-data.mjs', 참는일: 60 },
];

export async function 검사(밑감) {
  if (밑감.꼴 === '사전') return 사전꼴검사(밑감);
  if (밑감.꼴 === '모듈') return 모듈꼴검사(밑감);
  return 행꼴검사(밑감);
}

async function 자가시험() {
  const 실패 = [];
  // 배열읽기 — 없는 파일
  { const r = 배열읽기('archive/이런파일없다-자가시험용.json'); if (r.있나 !== false) 실패.push('없는 파일을 있다고 했다'); }
  // 배열읽기 — results 꼴
  {
    const 임시 = path.join(뿌리, 'archive', '.check-f7-자가시험-tmp.json');
    fs.writeFileSync(임시, JSON.stringify({ results: [{ a: 1 }, { a: 2 }] }));
    const r = 배열읽기(path.relative(뿌리, 임시));
    fs.unlinkSync(임시);
    if (r.행.length !== 2) 실패.push('results 꼴을 못 읽는다');
  }
  // 날짜로 — 네 가지 꼴
  if (날짜로('20260910')?.getFullYear() !== 2026) 실패.push('yyyymmdd 못 읽음');
  if (날짜로('2026-09-10')?.getMonth() !== 8) 실패.push('yyyy-mm-dd 못 읽음');
  if (날짜로('2026-09')?.getFullYear() !== 2026) 실패.push('yyyy-mm 못 읽음');
  if (날짜로(2026)?.getFullYear() !== 2026) 실패.push('연도(숫자) 못 읽음');
  if (날짜로('쓰레기') !== null) 실패.push('못 읽을 값을 읽었다고 했다');
  if (날짜로(null) !== null) 실패.push('null 을 날짜로 읽었다');
  // 행꼴검사 — 빈 배열이면 떨어져야 한다
  {
    const 임시 = path.join(뿌리, 'archive', '.check-f7-자가시험-tmp2.json');
    fs.writeFileSync(임시, JSON.stringify([]));
    const r = 행꼴검사({ 이름: '자가시험용', 길: path.relative(뿌리, 임시), 날짜칸: null, 핵심칸: null, 참는일: null });
    fs.unlinkSync(임시);
    if (r.통과 !== false) 실패.push('빈 배열인데 통과로 나왔다');
  }
  // 사전꼴검사 — 키 수가 모자라면 떨어져야 한다
  {
    const 임시 = path.join(뿌리, 'archive', '.check-f7-자가시험-tmp3.json');
    fs.writeFileSync(임시, JSON.stringify({ 사전: { a: 1, b: 2 } }));
    const r = 사전꼴검사({ 이름: '자가시험용', 길: path.relative(뿌리, 임시), 사전칸: '사전', 최소키수: 100 });
    fs.unlinkSync(임시);
    if (r.통과 !== false) 실패.push('키 2개인데 최소 100개 기준을 통과했다고 했다');
  }
  // 밑감들 계획 자체가 실제 존재하는 검사함수를 가리키나
  for (const 밑감 of 밑감들) {
    if (!['행', '사전', '모듈'].includes(밑감.꼴)) 실패.push(`${밑감.이름}: 모르는 꼴 「${밑감.꼴}」`);
  }

  if (실패.length) { console.log('🔴 자가시험 실패:', 실패.join(' · ')); process.exit(1); }
  console.log('✅ check-f7-data-quality 자가시험 통과');
  process.exit(0);
}

async function 본검사() {
  console.log('■ F7 밑감 일곱 벌 — 값·날짜 검사');
  let 빨강 = 0;
  for (const 밑감 of 밑감들) {
    const 결과 = await 검사(밑감);
    if (결과.통과) {
      console.log(`  ✅ ${결과.이름}  ${결과.행수 ?? ''}건`);
    } else {
      빨강++;
      console.log(`  🔴 ${결과.이름}`);
      for (const p of 결과.문제) console.log(`     ⬜ ${p}`);
    }
  }
  if (빨강 > 0) {
    console.log(`\n🔴 ${빨강}/${밑감들.length} 문제 있음`);
    process.exit(1);
  }
  console.log('\n✅ 전부 통과');
}

const 실행됨 = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (실행됨) {
  if (process.argv.includes('--자가시험')) await 자가시험();
  else await 본검사();
}
