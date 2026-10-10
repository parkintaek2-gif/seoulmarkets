#!/usr/bin/env node
/**
 * build-korea-executives-tape.mjs — **회사 지면이 읽을 «대표이사» 자료를 만든다.**
 *
 * ── 🔴 왜 (2026-10-10 · 5번) ────────────────────────────────────────
 * 실제 질의를 전수로 보니 「who is the ceo of …」가 **이미 10.3위**로 뜬다.
 * 그런데 한국 회사 지면 2,582장에 CEO 가 한 줄도 없다 —
 * `archive/raw/dart-executives` 에 대표이사 6,727명이 받아져 있는데 안 쓰고 있었다.
 * ⇒ **답이 없는데도 그 질의로 뜬다.** 답을 넣으면 그 자리를 지면들이 한꺼번에 먹는다.
 *
 * ── ⛔ 이 자가 지키는 것 ────────────────────────────────────────────
 * ⛔ **생년월을 내지 않는다.** 공시에 있어도 지면에 낼 까닭이 없다.
 * ⛔ **학력·경력 원문을 베끼지 않는다.** 길고, 그 사람에 대한 «평가»로 읽힌다.
 *   우리는 사실만 놓는다(강령 ①) — 이름·직위·담당·재직 기간까지다.
 * ⛔ **로마자는 우리가 옮긴 것**이다. 본인이 쓰는 표기(여권·회사 영문본)와 다를 수 있다.
 *   그래서 `romanIsConventional` 을 함께 적어 지면이 그 사실을 밝힐 수 있게 한다.
 * ⛔ 못 옮긴 이름은 **빼지 않고 로마자만 null** 로 둔다 — 외국인 임원이 그렇다.
 *   「쉬타오(중국)」를 Syu-tao 로 만들면 틀린다. 한글만 적는 것이 맞다.
 * ⚠ 「대표」가 참인 줄만 담는다. 전 임원 35,004명을 다 내면 지면이 무거워진다.
 *
 * 쓰는 법
 *   node scripts/build-korea-executives-tape.mjs --자가시험
 *   node scripts/build-korea-executives-tape.mjs            무엇이 나오는지만 본다
 *   node scripts/build-korea-executives-tape.mjs --적는다
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { 이름로마자 } from '../src/lib/korean-name-roman.mjs';

export const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const 들머리 = path.join(뿌리, 'archive', 'raw', 'dart-executives', 'executives-2025.ndjson');
export const 낼곳 = path.join(뿌리, 'src', 'data', 'korea-executives-tape.json');

/** 재직 개월 → 사람이 읽는 말. ⛔ 모르면 null — 0 으로 채우지 않는다 */
export function 재직말(개월) {
  const n = Number(개월);
  if (!Number.isFinite(n) || n <= 0) return null;
  const 해 = Math.floor(n / 12);
  if (해 < 1) return `${n} months`;
  return 해 === 1 ? '1 year' : `${해} years`;
}

/**
 * 한 줄을 지면이 쓸 꼴로.
 * ⛔ 대표가 아니거나 이름이 없으면 null — 거르는 쪽이 부른다.
 */
export function 한줄바꾸기(o) {
  if (!o || o.대표 !== true) return null;
  const 이름 = String(o.이름 ?? '').trim();
  const 종목 = String(o.종목 ?? '').trim();
  if (!이름 || !종목) return null;
  const r = 이름로마자(이름);
  return {
    ticker: 종목.padStart(6, '0'),
    nameKo: 이름,
    /* ⛔ 못 옮기면 null 이다. 지어내지 않는다 */
    nameRoman: r.로마자,
    romanIsConventional: r.로마자 ? r.관례인가 : null,
    title: String(o.직위 ?? '').trim() || null,
    duty: String(o.담당 ?? '').trim() || null,
    /* ⚠ 사내이사·사외이사 같은 구분은 «사실»이라 담는다 */
    boardType: String(o.구분 ?? '').trim() || null,
    fullTime: o.상근 === '상근' ? true : (o.상근 === '비상근' ? false : null),
    tenure: 재직말(o.재직개월),
    /* ⛔ 생년월·학력·경력은 담지 않는다 — 위 머리글 참고 */
  };
}

/** 한 회사에 대표가 여럿일 수 있다 — 재직이 긴 쪽을 앞에 둔다 */
export function 회사별로묶기(줄들) {
  const 표 = new Map();
  for (const o of 줄들 ?? []) {
    const r = 한줄바꾸기(o);
    if (!r) continue;
    if (!표.has(r.ticker)) 표.set(r.ticker, []);
    표.get(r.ticker).push(r);
  }
  for (const [, 들] of 표) {
    들.sort((a, b) => {
      const 해 = (x) => Number(String(x.tenure ?? '').match(/\d+/)?.[0] ?? 0);
      return 해(b) - 해(a);
    });
  }
  return 표;
}

/* ── 자가시험 ─────────────────────────────────────────────────── */
function 자가시험() {
  let 통 = 0; let 탈 = 0;
  const 검 = (이름, 참, 덧 = '') => { if (참) { 통++; console.log('✅', 이름, 덧); } else { 탈++; console.log('🔴', 이름, 덧); } };

  const 보기 = {
    corp: '00232317', 종목: '033030', 회사: '지오엠씨', 연도: '2025', 이름: '임영현',
    성별: '여', 생년월: '1959년 05월', 직위: '대표이사', 구분: '사내이사', 상근: '상근',
    담당: '총괄', 대표: true, 관계: '없음', 오너: false, 재직개월: 419,
    재직원문: '1991.9.28\n~', 임기만료: '2028년 03월 27일',
    학력: '서울과학종합대학원', 경력: '㈜선경 … 現 법무부 한국법무복지공단 이사',
  };
  const r = 한줄바꾸기(보기);
  검('대표이사 줄을 바꾼다', r !== null);
  검('종목코드가 여섯 자리다', r.ticker === '033030');
  검('한글 이름을 그대로 담는다', r.nameKo === '임영현');
  검('로마자를 붙인다', r.nameRoman === 'Lim Yeong-hyeon');
  검('🔴 관례 표기인지 함께 적는다 — 지면이 「우리가 옮긴 것」이라 밝힐 수 있게',
    r.romanIsConventional === true);
  검('직위·담당을 담는다', r.title === '대표이사' && r.duty === '총괄');
  검('재직을 해로 적는다', r.tenure === '34 years', `— ${r.tenure}`);

  /* 🔴🔴 강령 — 내면 안 되는 것 */
  const 글 = JSON.stringify(r);
  검('⛔ 생년월이 안 나간다', !글.includes('1959'));
  검('⛔ 학력이 안 나간다', !/서울과학종합대학원/.test(글));
  검('⛔ 경력 원문이 안 나간다', !/법무복지공단/.test(글));
  검('⛔ 성별이 안 나간다 — 지면이 묻는 것이 아니다', !/"성별"|"gender"/.test(글));

  검('⛔ 대표가 아니면 안 담는다', 한줄바꾸기({ ...보기, 대표: false }) === null);
  검('⛔ 이름이 없으면 안 담는다', 한줄바꾸기({ ...보기, 이름: '' }) === null);
  검('⛔ 종목코드가 없으면 안 담는다', 한줄바꾸기({ ...보기, 종목: '' }) === null);
  검('⛔ 빈 것에 안 터진다', 한줄바꾸기(null) === null && 한줄바꾸기({}) === null);

  /* 🔴 외국인 임원 — 로마자는 null 이지만 한글은 남는다 */
  const 외 = 한줄바꾸기({ ...보기, 이름: '쉬타오\n(중국)' });
  검('🔴 못 옮겨도 빼지 않는다 — 한글 이름은 남는다', 외 !== null && 외.nameKo.includes('쉬타오'));
  검('🔴 그때 로마자는 null 이다 — Syu-tao 로 지어내지 않는다', 외.nameRoman === null);
  검('🔴 관례 여부도 null 이다 — 옮기지 않았으니 말할 것이 없다', 외.romanIsConventional === null);

  검('재직을 모르면 null', 재직말(0) === null && 재직말(null) === null && 재직말('x') === null);
  검('한 해 미만은 달로', 재직말(7) === '7 months');
  검('한 해는 단수로', 재직말(14) === '1 year');

  /* 회사별 묶기 */
  const 묶음 = 회사별로묶기([
    보기,
    { ...보기, 이름: '김철수', 재직개월: 30 },
    { ...보기, 이름: '박영희', 대표: false },
    { ...보기, 종목: '000660', 이름: '이민수' },
  ]);
  검('회사마다 묶는다', 묶음.size === 2);
  검('⛔ 대표 아닌 사람은 안 들어간다', 묶음.get('033030').length === 2);
  검('🔴 재직이 긴 쪽이 앞이다', 묶음.get('033030')[0].nameKo === '임영현');

  /* 🔴 진짜 자료로 돌려 본다 — 지어낸 감으로만 시험하지 않는다 */
  try {
    const 줄들 = fs.readFileSync(들머리, 'utf8').split('\n').filter(Boolean)
      .map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
    const 묶 = 회사별로묶기(줄들);
    const 사람수 = [...묶.values()].reduce((s, v) => s + v.length, 0);
    검('🔴 진짜 자료에서 회사가 천 곳을 넘는다', 묶.size > 1000, `— 회사 ${묶.size} · 대표 ${사람수}명`);
    const 샌것 = [...묶.values()].flat().filter((x) => JSON.stringify(x).match(/19\d\d년/));
    검('🔴 진짜 자료에서도 생년월이 한 건도 안 샌다', 샌것.length === 0, `— 샌 것 ${샌것.length}`);
    const 못옮김 = [...묶.values()].flat().filter((x) => !x.nameRoman).length;
    console.log(`   ⬜ 로마자를 못 옮긴 사람 ${못옮김}명 — 외국인 임원이다. 한글로만 적는다`);
  } catch (e) {
    console.log('   ⬜ 진짜 자료를 못 읽었다 —', String(e.message).slice(0, 60));
  }

  console.log(탈 ? `\n🔴 자가시험 ${탈}건 탈` : `\n✅ 자가시험 ${통} 통과`);
  process.exit(탈 ? 1 : 0);
}

if (process.argv.includes('--자가시험')) 자가시험();

/* ── 실제로 만든다 ───────────────────────────────────────────── */
const 내가실행됐다 = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (내가실행됐다) {
  const 줄들 = fs.readFileSync(들머리, 'utf8').split('\n').filter(Boolean)
    .map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  const 묶 = 회사별로묶기(줄들);
  const 사람수 = [...묶.values()].reduce((s, v) => s + v.length, 0);
  const 못옮김 = [...묶.values()].flat().filter((x) => !x.nameRoman).length;

  console.log(`■ 들머리 ${줄들.length}줄 → 회사 ${묶.size}곳 · 대표 ${사람수}명`);
  console.log(`   ⬜ 로마자를 못 옮긴 사람 ${못옮김}명 (외국인 임원 — 한글로만 적는다)`);

  const 낼것 = {
    _meta: {
      출처: 'DART 전자공시 — 임원 현황 (2025 사업보고서)',
      만든때: new Date().toLocaleString('sv-SE').slice(0, 19),   /* ⛔ toISOString 금지 */
      회사수: 묶.size,
      대표수: 사람수,
      로마자못옮김: 못옮김,
      밝힐것: '로마자 표기는 우리가 옮긴 것이다. 본인이 쓰는 표기와 다를 수 있다.',
      안담은것: '생년월·학력·경력은 담지 않는다 — 지면이 묻는 것이 아니다',
    },
    byTicker: Object.fromEntries([...묶].sort((a, b) => a[0].localeCompare(b[0]))),
  };

  if (!process.argv.includes('--적는다')) {
    console.log('\n⬜ 보기만 했다. 정말 만들려면 --적는다');
    const 보기 = [...묶.entries()].slice(0, 2);
    for (const [t, v] of 보기) console.log('  ', t, JSON.stringify(v[0]));
    process.exit(0);
  }
  fs.writeFileSync(낼곳, `${JSON.stringify(낼것, null, 1)}\n`, 'utf8');
  console.log(`\n✅ 냈다 — ${path.relative(뿌리, 낼곳)} (${(fs.statSync(낼곳).size / 1024).toFixed(0)}KB)`);
}
