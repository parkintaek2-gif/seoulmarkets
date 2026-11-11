#!/usr/bin/env node
/**
 * 고친다-손님글-금지어.mjs — **손님 지면에 남아 있던 금지어를 손으로 적은 짝으로 바꾼다.**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔴🔴 [2026-11-11] `check-손님글-금지어.mjs` 가 **마크다운 제목 줄을 안 재고 있었다.**
 *   그 결함을 고치자 그동안 가려져 있던 글 스물넷이 한꺼번에 드러났다.
 *
 * ⛔ **기계가 알아서 고르게 두지 않는다.** 금지어 하나에 바꿔 쓸 말이 둘씩 적혀 있고
 *   (「내리 」 → 내내 · 연속) 어느 쪽이 맞는지는 **문장마다 다르다.**
 *   한 번 잘못 바꾸면 손님 지면에 어색한 문장이 그대로 남는다.
 *   ⇒ 짝을 하나씩 손으로 적는다. 짝이 안 맞으면 «안 고치고 알린다».
 *
 * 쓰는 법
 *   node scripts/고친다-손님글-금지어.mjs --해본다
 *   node scripts/고친다-손님글-금지어.mjs --고친다
 *   node scripts/고친다-손님글-금지어.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 글방 = 'content/kcw-reviews/';

/** [파일, 옛 말, 새 말] — ⚠ 옛 말은 «그 파일에 꼭 한 번만» 있어야 한다 */
export const 짝 = [
  ['content/kculturewire/bts-is-not-a-seoul-band.md',
    '그 지면은 제목부터', '그 페이지는 제목부터'],

  [글방 + 'kbl-gas-db-2026-10-28.md',
    '리바운드 50개를 걷어내는 동안', '리바운드 50개를 잡아내는 동안'],
  [글방 + 'kbl-kgc-sk-2026-11-06.md',
    '5승 3패, 3위로 내려앉았다', '5승 3패, 3위로 하락했다'],
  [글방 + 'kbl-lg-sono-2026-11-07.md',
    '전체 점수에서 한 점이 모자랐다', '전체 점수에서 한 점이 부족했다'],
  [글방 + 'kbl-mobis-kcc-2026-10-29.md',
    '두 경기를 내리 진 뒤에', '두 경기를 연속으로 진 뒤에'],
  [글방 + 'kbl-sk-kcc-2026-10-27.md',
    '네 경기를 내리 이겼다', '네 경기를 연속으로 이겼다'],
  [글방 + 'kbl-sk-samsung-2026-11-01.md',
    '아홉 경기를 내리 이긴', '아홉 경기를 연속으로 이긴'],
  [글방 + 'kbl-sk-samsung-2026-11-01.md',
    '줄이기에는 시간이 모자랐다', '줄이기에는 시간이 부족했다'],

  [글방 + 'kbo-ks-series-samsung-kt-2026.md',
    '따라붙었지만 한 점이 모자랐다', '따라붙었지만 한 점이 부족했다'],
  [글방 + 'kbo-po2-samsung-kia.md',
    '희생플라이로 2점을 보태', '희생플라이로 2점을 추가해'],
  [글방 + 'kbo-po3-samsung-kia.md',
    '2점을 보태 6대4로 경기를 닫았다', '2점을 추가해 6대4로 경기를 마무리했다'],

  [글방 + 'korea-nt-november-2026-squad.md',
    '명단을 고른 기준도 밝혔다', '명단의 선발 기준도 밝혔다'],
  [글방 + 'korea-nt-november-2026-squad.md',
    '발탁 여부에 관심이 쏠렸던', '발탁 여부에 관심이 집중됐던'],
  [글방 + 'lotte-giants-lee-dong-wook-manager.md',
    '## 롯데가 고른 자리는 수비다', '## 롯데가 선택한 자리는 수비다'],
  [글방 + 'lotte-giants-lee-dong-wook-manager.md',
    '최근 세 시즌은 내리 7위였다', '최근 세 시즌은 연속 7위였다'],

  [글방 + 'mbc-omniscient-akmu-episode-422.md',
    '받아 웃음이 터졌다', '받아 웃음이 나왔다'],
  [글방 + 'tvn-100days-lie-episode-10-2026-11-09.md',
    '연회장에서 폭탄이 터졌다', '연회장에서 폭탄이 폭발했다'],

  [글방 + 'vleague-ex-soop-2026-11-05.md',
    '서브 득점 1개를 보태', '서브 득점 1개를 더해'],
  [글방 + 'vleague-heungkuk-jungkwanjang-2026-11-04.md',
    '블로킹 4개를 보태', '블로킹 4개를 더해'],
  [글방 + 'vleague-hyundai-samsung-2026-11-05.md',
    '그런데도 결과가 갈린 것은', '그런데도 결과가 나뉜 것은'],
  [글방 + 'vleague-ibk-gs-2026-11-06.md',
    '블로킹 1개를 보태', '블로킹 1개를 더해'],

  [글방 + 'worlds-2026-gen-lyon-qf.md',
    '이 판 최다 처치를 했고', '이 경기 최다 처치를 했고'],
  [글방 + 'worlds-2026-hle-blg-swiss5.md',
    '용 셋을 내리 가져갔다', '용 셋을 연속으로 가져갔다'],
  [글방 + 'worlds-2026-hle-blg-swiss5.md',
    '큰 흐름은 한화생명이 쥐고 있었다', '큰 흐름은 한화생명이 유지하고 있었다'],
  [글방 + 'worlds-2026-hle-g2-swiss4.md',
    '타워를 한 채밖에 걷어내지 못했다', '타워를 한 채밖에 철거하지 못했다'],
  [글방 + 'worlds-2026-kc-cfo-swiss4.md',
    '갈리오를 고른 이유로', '갈리오를 선택한 이유로'],
  [글방 + 'worlds-2026-kc-cfo-swiss4.md',
    '바론은 한 마리씩 나눠 가졌고', '바론은 양 팀이 한 마리씩 사냥했고'],
  [글방 + 'worlds-2026-quarterfinals-bracket.md',
    '세 판을 내리 이겼고', '세 판을 연속으로 이겼고'],
  [글방 + 'worlds-2026-t1-mkoi.md',
    '## 고른 챔피언', '## 선택한 챔피언'],
  [글방 + 'worlds-2026-t1-mkoi.md',
    '그 시점을 먼저 고른 결과에', '그 시점을 먼저 선택한 결과에'],
  [글방 + 'worlds-2026-t1-mkoi.md',
    'T1이 9개를 걷어내는 사이', 'T1이 9개를 철거하는 사이'],
  [글방 + 'worlds-2026-t1-mkoi.md',
    '케리아가 두 세트를 내리 뛰었다', '케리아가 두 세트를 연속으로 뛰었다'],
  [글방 + 'worlds-2026-t1-mkoi.md',
    'KOI는 2승 2패로 내려앉았다', 'KOI는 2승 2패로 하락했다'],
];

async function 주다() {
  if (process.argv.includes('--자가시험')) return 자가시험();
  const 고친다 = process.argv.includes('--고친다');
  if (!고친다 && !process.argv.includes('--해본다')) {
    console.log('쓰는 법: --해본다 | --고친다 | --자가시험');
    process.exit(2);
  }

  const 담아둔다 = new Map();
  let 맞음 = 0; const 안맞음 = [];
  for (const [상대길, 옛말, 새말] of 짝) {
    const 길 = path.join(뿌리, 상대길);
    let 글 = 담아둔다.get(길) ?? (fs.existsSync(길) ? fs.readFileSync(길, 'utf8') : null);
    if (글 === null) { 안맞음.push([상대길, '파일이 없다']); continue; }
    const 번 = 글.split(옛말).length - 1;
    if (번 === 0) { 안맞음.push([상대길, '없다 — ' + 옛말]); continue; }
    if (번 > 1) { 안맞음.push([상대길, 번 + '번 있다(하나여야 한다) — ' + 옛말]); continue; }
    담아둔다.set(길, 글.replace(옛말, 새말));
    맞음 += 1;
  }

  console.log(`짝 ${맞음}/${짝.length} 맞췄다 · 글 ${담아둔다.size}장`);
  for (const [길, 까닭] of 안맞음) console.log(`   🔴 ${길} — ${까닭}`);
  if (!고친다) { console.log('\n⚠ --해본다 라 파일을 안 고쳤다'); process.exit(0); }
  for (const [길, 글] of 담아둔다) fs.writeFileSync(길, 글, 'utf8');
  console.log(`\n✅ ${담아둔다.size}장을 고쳤다`);
  process.exit(안맞음.length ? 1 : 0);
}

async function 자가시험() {
  let 통 = 0; let 탈 = 0;
  const 검 = (이름, 참) => { if (참) { 통++; console.log('✅', 이름); } else { 탈++; console.log('🔴', 이름); } };
  const { 재기 } = await import('./순한글-금지어.mjs');

  검('🔴 바꿔 넣을 새 말에 금지어가 없다',
    짝.every(([, , 새]) => 재기(새, { 샵은주석이아니다: true }).length === 0));
  검('⛔ 옛 말과 새 말이 다르다', 짝.every(([, 옛, 새]) => 옛 !== 새));
  검('⛔ 길이 모두 content 아래다', 짝.every(([길]) => 길.startsWith('content/')));
  검('🔴 짝이 비어 있지 않다', 짝.length >= 20);

  console.log(탈 ? `\n🔴 자가시험 ${탈}건 탈` : `\n✅ 자가시험 ${통} 통과`);
  process.exit(탈 ? 1 : 0);
}

const 나를직접돌렸나 = (process.argv[1] || '').replace(/\\/g, '/').endsWith('고친다-손님글-금지어.mjs');
if (나를직접돌렸나) await 주다();
