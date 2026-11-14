#!/usr/bin/env node
/**
 * build-kcw-idol-vs-netflix.mjs — **아이돌 281명 중 넷플릭스에 나온 사람은 36명뿐이다.**
 *
 * ── 🔴🔴 왜 만들었나 (2026-10-04 · 5번) ─────────────────────────────────
 * 사장님 — 「**케이라리프맵 방문자가 0명이라고? … 방문자를 빨리 만들고 늘려**」
 *
 * KLifeMap 에는 사주·별자리 지면이 있는 사람이 281명이고, KCW 에는 넷플릭스
 * 상위권에 오른 작품으로 들어온 사람 지면이 634개다. 둘을 Q번호로 맞춰 보니
 * **겹치는 사람이 36명뿐**이었다. 그래서 나머지 245명에게는 KCW 에서 가는 길이 없다 —
 * 그것이 KLifeMap 이 바깥 링크를 못 받는 자리다.
 *
 * ⭐ 그런데 그 「36명뿐」이라는 수 자체가 **셀 만한 것**이다.
 *   아이돌이 연기로 건너오는 일이 흔해 보이지만, 재 보면 여덟에 하나다.
 *   링크만 모은 지면은 구글도 사람도 안 읽는다 — 이 수를 싣고 그 김에 길을 낸다.
 *
 * ⛔ 「아이돌은 연기를 못 한다」고 말하지 않는다. 우리가 잰 것은 **넷플릭스 상위권에
 *   오른 작품의 출연진 명단에 그 이름이 있었나**뿐이다. 연기 활동 전체가 아니다.
 * ⛔ 281명은 우리가 생일을 찾을 수 있었던 사람이지 아이돌 전체가 아니다.
 *
 * 쓰는 법
 *   node scripts/build-kcw-idol-vs-netflix.mjs --짓는다
 *   node scripts/build-kcw-idol-vs-netflix.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
/* 🔴 [2026-11-14] 영문 지면에 「오후」가 나갔다 — 잰 시각은 한 꼴로 적는다 */
import { 잰때문자 } from './lib/잰때.mjs';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const 낼길 = path.join(뿌리, 'src', 'data', 'kcw-idol-vs-netflix.json');

/** Q번호를 한 꼴로. ⛔ 못 읽으면 null — 빈 글자로 맞추지 않는다 */
export function 큐(값) {
  const s = String(값 ?? '').trim().toUpperCase();
  return /^Q\d+$/.test(s) ? s : null;
}

/**
 * 명단 둘을 맞춘다.
 * @param 아이돌 KLifeMap 쪽 — qid · name · groups
 * @param 넷플 KCW 쪽 — q · name · titleCount
 */
export function 맞춰보기(아이돌, 넷플) {
  const 넷플큐 = new Set((넷플 ?? []).map((x) => 큐(x.q)).filter(Boolean));
  const 그룹별 = new Map();
  let 겹침 = 0;
  const 겹친사람 = [];
  for (const x of 아이돌 ?? []) {
    const q = 큐(x.qid);
    const 있나 = Boolean(q && 넷플큐.has(q));
    if (있나) { 겹침 += 1; 겹친사람.push({ q, 이름: x.name ?? null }); }
    for (const g of x.groups ?? []) {
      if (!그룹별.has(g)) 그룹별.set(g, { 그룹: g, 수: 0, 넷플릭스: 0 });
      const v = 그룹별.get(g);
      v.수 += 1;
      if (있나) v.넷플릭스 += 1;
    }
  }
  const 그룹 = [...그룹별.values()].sort((a, b) => b.수 - a.수 || a.그룹.localeCompare(b.그룹));
  return {
    아이돌수: (아이돌 ?? []).length,
    겹침,
    안겹침: (아이돌 ?? []).length - 겹침,
    그룹수: 그룹.length,
    한명도없는그룹: 그룹.filter((g) => g.넷플릭스 === 0).length,
    그룹,
    겹친사람,
  };
}

/* ── 자가시험 ─────────────────────────────────────────────────────────── */
export function 자가시험() {
  const 결과 = [];
  const 본다 = (이름, 참) => 결과.push({ 이름, 참: !!참 });

  본다('Q번호를 한 꼴로', 큐('q123') === 'Q123');
  본다('⛔ 꼴이 아니면 null — 빈 글자로 맞추지 않는다', 큐('abc') === null && 큐('') === null);
  본다('⛔ null 에도 안 터진다', 큐(null) === null);

  const 아이돌 = [
    { qid: 'Q1', name: '가', groups: ['A'] },
    { qid: 'Q2', name: '나', groups: ['A'] },
    { qid: 'Q3', name: '다', groups: ['B'] },
  ];
  const 넷플 = [{ q: 'Q1', name: '가' }];
  const r = 맞춰보기(아이돌, 넷플);
  본다('겹친 사람을 센다', r.겹침 === 1 && r.안겹침 === 2);
  본다('그룹을 센다', r.그룹수 === 2);
  본다('🔴 한 명도 안 겹치는 그룹을 센다', r.한명도없는그룹 === 1);
  본다('그룹을 사람 수로 세운다', r.그룹[0].그룹 === 'A' && r.그룹[0].수 === 2);
  본다('그룹 안에서 겹친 수도 센다', r.그룹[0].넷플릭스 === 1);
  본다('겹친 사람 이름을 남긴다', r.겹친사람[0].이름 === '가');
  본다('⛔ 빈 명단에도 안 터진다',
    맞춰보기([], []).아이돌수 === 0 && 맞춰보기(null, null).그룹수 === 0);
  본다('⛔ 그룹이 없는 사람도 센다 — 사람 수에서 빠지지 않는다',
    맞춰보기([{ qid: 'Q9', name: '라' }], []).아이돌수 === 1);

  const 빨강 = 결과.filter((r2) => !r2.참).length;
  console.log('■ 아이돌 vs 넷플릭스 — 자가시험');
  for (const r2 of 결과) console.log(`  ${r2.참 ? '✅' : '🔴'} ${r2.이름}`);
  console.log(빨강 ? `🔴 빨강 ${빨강}개` : `✅ ${결과.length}가지 다 통과`);
  return 빨강 === 0;
}

/* ── 혼자 돌 때 ───────────────────────────────────────────────────────── */
const 내가실행됐다 = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (내가실행됐다) {
  if (process.argv.includes('--selftest') || process.argv.includes('--자가시험')) {
    process.exit(자가시험() ? 0 : 1);
  }
  if (!process.argv.includes('--짓는다')) { console.log('⛔ --짓는다 나 --자가시험 을 준다'); process.exit(1); }

  const 읽기 = (이름) => JSON.parse(fs.readFileSync(path.join(뿌리, 'src', 'data', 이름), 'utf8'));
  const 아이돌 = 읽기('klifemap-star-roster.json');
  const 넷플묶 = 읽기('wikitip-people.json');
  const 넷플 = Array.isArray(넷플묶) ? 넷플묶 : (넷플묶.people ?? []);
  const 다리 = 읽기('kcw-klifemap-star-bridge.json');

  const r = 맞춰보기(아이돌, 넷플);
  if (!r.아이돌수) { console.log('🔴 아이돌 명단이 비었다 — 쓰지 않는다'); process.exit(1); }

  /* 사주 지면이 있는 사람만 링크를 건다 — 다리 자료가 주소를 들고 있다 */
  const 주소 = new Map(다리.사람들.map((x) => [x.q, x]));
  const 사람들 = 아이돌.map((x) => {
    const q = 큐(x.qid);
    const 길 = q ? 주소.get(q) : null;
    return {
      q, 이름: x.name ?? null, 그룹: x.groups ?? [],
      넷플릭스지면: Boolean(q && 넷플.some((y) => 큐(y.q) === q)),
      사주: 길 ? 길.사주 : null,
      별자리: 길 ? 길.별자리 : null,
    };
  }).filter((x) => x.q);

  fs.writeFileSync(낼길, JSON.stringify({
    _meta: {
      무엇: 'KLifeMap 에 사주·별자리 지면이 있는 아이돌과, 그중 넷플릭스 상위권 작품에 나온 사람',
      아닌것: '연기 활동 전체가 아니다. 넷플릭스 주간 상위권에 오른 작품의 출연진 명단에 이름이 있었나만 본다',
      또아닌것: '아이돌 전체가 아니다. 우리가 생일을 찾을 수 있었던 사람만이다',
      잰때: 잰때문자(),
      출처: 'KLifeMap 명단(Wikidata) · KCW 넷플릭스 상위권 출연진 · 주소는 라이브 사이트맵에서 재서 뽑았다',
    },
    수: {
      아이돌: r.아이돌수, 넷플릭스에도: r.겹침, 넷플릭스에없음: r.안겹침,
      그룹: r.그룹수, 한명도없는그룹: r.한명도없는그룹,
    },
    그룹: r.그룹,
    사람들,
  }, null, 1), 'utf8');

  console.log(`✅ 아이돌 ${r.아이돌수}명 · 넷플릭스에도 있는 사람 ${r.겹침}명 · 그룹 ${r.그룹수}개`);
  console.log(`   한 명도 넷플릭스에 안 나온 그룹 ${r.한명도없는그룹}개`);
  console.log(`   → ${path.relative(뿌리, 낼길)}`);
  console.log('   ⛔ 「냈다」는 증거가 아니다 — 지면을 짓고 라이브에서 눌러 본다');
}
