#!/usr/bin/env node
/**
 * **영문 지면의 구글 스니펫에 영어 손님이 못 읽는 글자가 들어 있나.**
 *
 * ── 🔴 왜 (2026-10-11 12:1x · 5번) ──────────────────────────────────
 * 사장님 (2026-09-29): 「검색엔진과 ai 에이전트가 우리 고객을 얼마나 잘 데리고 오는 지를
 *   **체크하고, 연구하고 또 실행해서** 매일 매일 고객이 늘어나게 해라… **제일 중요한 작업이다**」
 *
 * 그 지시대로 유입을 재다가 찾았다 —
 * ```
 *   SeoulMarkets 가 구글 «앞장»에 뜬 질의 51개 · 노출 110회 · 클릭 0   (GSC 2026-10-06)
 *     komatsu matere co.,ltd. earnings results    4.4위 · 10회 · 0클릭
 *     denyo co., ltd. earnings results           10.0위 ·  8회 · 0클릭
 *     stella chemifa corporation earnings results  8.0위 ·  8회 · 0클릭
 *   그 지면들의 스니펫 둘째 문장:  「CEO (representative director): 中 山 大 輔.」
 * ```
 * 전수로 재니 **4,755장**이 그랬다(일본 3,699 · 대만 1,056 · 한국 0).
 * 한국이 0인 까닭은 같은 날 아침에 로마자로 고쳤기 때문이다 — 고칠 수 있었던 것이다.
 *
 * ⚠ **클릭 0 의 「까닭」이라고 단정하지 않는다.** 110회는 그렇게 말하기엔 적은 수다.
 *   다만 **영문 지면의 스니펫이 영어로 읽혀야 한다**는 것은 그와 따로 맞다.
 *   ⭐ 우리가 고친 것은 「클릭률」이 아니라 「읽히나」다. 둘을 같은 말로 적지 않는다.
 *
 * ── ⛔ 이 자가 지키는 것 ────────────────────────────────────────────
 * ⛔ **한자·가나를 우리가 로마자로 옮겨서 끄지 않는다.** 같은 한자도 읽는 법이 여럿이라
 *   (「中山」은 なかやま 일 수도 ちゅうざん 일 수도 있다) 지어내면 **거짓 이름**이 된다.
 *   실측: 일본 자료 3,699명 가운데 로마자 표기가 있는 사람은 없다 —
 *   EDINET 은 회사 영문명(name_en)은 주지만 사람 영문명은 안 준다.
 * ✅ 푸는 길은 **설명에서 빼고 본문에 두는 것**이다. 본문에는 왜 한자인지도 영어로 적는다.
 * ⚠ 본문(`<body>`)은 안 본다 — 거기 한자가 있는 것은 «사실 그 자체»라 옳다.
 *   이 자가 보는 것은 손님이 **누르기 «전»에** 보는 두 줄뿐이다 — 제목과 설명.
 *
 *   node scripts/check-영문스니펫이-영어로-읽히나.mjs
 *   node scripts/check-영문스니펫이-영어로-읽히나.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** 한자·히라가나·가타카나·한글 — 영어 손님이 못 읽는 글자 */
export const 못읽는글자 = /[぀-ヿ㐀-䶿一-鿿가-힯]/;

/** 손님이 누르기 «전»에 보는 두 줄만 꺼낸다 */
export function 스니펫꺼내기(글) {
  const d = /<meta name="description" content="([^"]*)"/.exec(String(글 ?? ''));
  const t = /<title>([^<]*)</.exec(String(글 ?? ''));
  return { 설명: d ? d[1] : null, 제목: t ? t[1] : null };
}

/** 못 읽는 글자가 처음 나온 자리 앞뒤를 잘라 보여 준다 — 어디가 문제인지 바로 보이게 */
export function 걸린자리(글, 앞 = 42, 뒤 = 12) {
  const s = String(글 ?? '');
  const i = s.search(못읽는글자);
  if (i < 0) return null;
  return s.slice(Math.max(0, i - 앞), i + 뒤).trim();
}

/** 한 지면을 잰다. 못 읽는 글자가 있으면 까닭을, 없으면 null */
export function 한장재기(글) {
  const { 설명, 제목 } = 스니펫꺼내기(글);
  /* ⛔ 설명이 «없는» 것은 이 자가 잴 일이 아니다 — 다른 검사의 몫이다 */
  if (제목 && 못읽는글자.test(제목)) return { 어디: '제목', 걸린: 걸린자리(제목) };
  if (설명 && 못읽는글자.test(설명)) return { 어디: '설명', 걸린: 걸린자리(설명) };
  return null;
}

/**
 * ⚠ **영문 지면만 본다.** 백년지도(`100y/`)는 한국어 지면이라 한글이 옳고,
 *   KLifeMap 은 이 저장소가 아니다. 여기 적힌 방들이 SeoulMarkets 의 회사 지면이다.
 * ⛔ 이 목록을 «줄여서» 빨강을 끄지 않는다. 늘리는 것은 괜찮다.
 */
export const 볼방들 = ['company', 'japan/company', 'taiwan/company'];

function 자가시험() {
  let 탈 = 0;
  const 검 = (이름, 참인가, 덧 = '') => { if (!참인가) { 탈 += 1; console.log(`🔴 ${이름} ${덧}`); } };

  const 깨끗한 = '<title>Denyo Co.,Ltd. (6517) earnings results — FY2026 | SMarkets</title>'
    + '<meta name="description" content="Denyo Co.,Ltd. (6517) reported JPY 72.2bn of revenue. Operating profit JPY 7.8bn.">';
  const 샌것 = '<title>Denyo Co.,Ltd. (6517) earnings results | SMarkets</title>'
    + '<meta name="description" content="Denyo Co.,Ltd. (6517) reported JPY 72.2bn. CEO (representative director): 吉永 隆法.">';
  const 제목이샌것 = '<title>株式会社 極洋 earnings results</title>'
    + '<meta name="description" content="KYOKUYO CO.,LTD. reported JPY 334.6bn of revenue.">';

  검('✅ 영어로만 된 스니펫은 안 잡는다', 한장재기(깨끗한) === null);
  검('🔴 설명에 든 한자를 잡는다', 한장재기(샌것)?.어디 === '설명');
  검('🔴 제목에 든 한자도 잡는다', 한장재기(제목이샌것)?.어디 === '제목');
  검('🔴 걸린 자리를 앞뒤와 함께 보여 준다 — 어디가 문제인지 바로 보이게',
    /representative director/.test(한장재기(샌것)?.걸린 ?? ''), `— ${한장재기(샌것)?.걸린}`);

  /* 글자 갈래 — 한자만이 아니다 */
  const 싸개 = (s) => `<title>ok</title><meta name="description" content="${s}">`;
  검('🔴 히라가나를 잡는다', 한장재기(싸개('CEO: たなか')) !== null);
  검('🔴 가타카나를 잡는다', 한장재기(싸개('CEO: タナカ')) !== null);
  검('🔴 한글도 잡는다 — 영문 지면이다', 한장재기(싸개('CEO: 김민수')) !== null);
  검('✅ 로마자·숫자·부호는 안 잡는다', 한장재기(싸개('JPY 72.2bn — Q1–Q2 (cumulative), 7.8%')) === null);

  /* ⛔ 꼴이 어긋나도 터지지 않는다 */
  검('⛔ 설명이 없어도 터지지 않는다', 한장재기('<title>ok</title>') === null);
  검('⛔ 제목도 설명도 없으면 null', 한장재기('<p>아무것도 없다</p>') === null);
  검('⛔ 빈 글·null 에도 안 터진다', 한장재기('') === null && 한장재기(null) === null);
  검('⛔ 걸린 글자가 없으면 걸린자리는 null', 걸린자리('all english here') === null);

  /* ⭐ 자가시험이 «제 몫을 하나» — 깨끗한 것만 넣고 통과하면 헛돈다 */
  검('⭐ 이 자가 헛돌지 않는다 — 샌 것을 넣으면 반드시 잡힌다', 한장재기(샌것) !== null);

  console.log(탈 ? `\n🔴 자가시험 ${탈}건 탈` : '\n✅ 자가시험 14개 통과');
  if (탈) process.exit(1);
}

function 본실행() {
  let 샌것합 = 0; let 본것합 = 0; let 못잰방 = 0;
  for (const 방이름 of 볼방들) {
    const 방 = path.join(뿌리, 'dist', 방이름);
    if (!fs.existsSync(방)) {
      console.log(`⬜ dist/${방이름} 이 없다 — 못 쟀다. node scripts/build-once.mjs 를 먼저 돌린다`);
      못잰방 += 1;
      continue;
    }
    const 파일 = fs.readdirSync(방).filter((f) => f.endsWith('.html'));
    const 샌것 = [];
    for (const f of 파일) {
      const 흠 = 한장재기(fs.readFileSync(path.join(방, f), 'utf8'));
      if (흠) 샌것.push({ 지면: `${방이름}/${f}`, ...흠 });
    }
    본것합 += 파일.length;
    샌것합 += 샌것.length;
    console.log(`${샌것.length ? '🔴' : '✅'} dist/${방이름}  지면 ${파일.length}장 · 스니펫이 영어로 안 읽히는 것 ${샌것.length}장`);
    for (const x of 샌것.slice(0, 4)) console.log(`     ${x.지면} (${x.어디})  ←  ${x.걸린}`);
    if (샌것.length > 4) console.log(`     … 그리고 ${샌것.length - 4}장 더`);
  }

  if (못잰방 === 볼방들.length) {
    console.log('⬜ 한 방도 못 쟀다 — 「깨끗하다」가 아니라 「못 쟀다」다');
    return;
  }
  if (!샌것합) {
    console.log(`\n✅ 지면 ${본것합}장 — 손님이 누르기 전에 보는 두 줄이 다 영어로 읽힌다`);
    console.log('   ⚠ 이것은 «읽히나»를 잰 것이지 «클릭이 느나»를 잰 것이 아니다. 둘을 섞지 않는다.');
    return;
  }
  console.log(`\n🔴 모두 ${샌것합}장의 스니펫에 영어 손님이 못 읽는 글자가 있다`);
  console.log('   ✅ 푸는 길: 그 글자를 «설명에서 빼고 본문에» 둔다. 본문에는 왜 그 글자인지도 영어로 적는다');
  console.log('   ⛔ 한자·가나를 우리가 로마자로 옮겨서 끄지 않는다 — 읽는 법이 여럿이라 거짓 이름이 된다');
  console.log('   ⛔ 위 `볼방들` 을 줄여서 끄지 않는다');
  process.exit(1);
}

if (process.argv.includes('--자가시험')) 자가시험();
else 본실행();
