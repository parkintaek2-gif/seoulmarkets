#!/usr/bin/env node
/**
 * build-kcw-press-vs-reading.mjs — 「신문이 쓰는 멤버」와 「사람이 읽는 멤버」가 같은가.
 * ─────────────────────────────────────────────────────────────────────────────
 * [왜 — 2026-09-04]
 *   오늘 새벽 받은 신문 제목(스타뉴스·텐아시아)에서 BTS 관련이 유난히 많았다.
 *   우리는 «영문 위키백과 열람수»도 갖고 있다. 두 자료를 나란히 놓으면
 *   「기사에 나오는 사람」과 「읽히는 사람」이 같은지 잴 수 있다.
 *
 *   ⭐ `archive/raw/newsdesk-korean-press` 는 지금까지 «수집기 말고 어떤 코드도» 읽지 않았다.
 *     기사에 쓰인 적이 없는 자료다.
 *
 * [⬜ 못 재는 것 — 먼저 적는다]
 *   ⬜ 추세. 아카이브가 «사흘치»(09-02·03·04)뿐이다. 사흘로 추세를 말하지 않는다.
 *   ⬜ 한국 신문 전부. 우리 수집기가 긁는 두 매체(스타뉴스·텐아시아)뿐이다.
 *   ⬜ 그룹 이름을 안 쓴 «단독» 기사. 멤버 이름은 「방탄소년단/BTS」가 든 제목 «안에서만» 센다 —
 *      「진」·「V」·「RM」 같은 짧은 이름이 아무 데나 걸리는 것을 막으려고 좁혔다. 그래서
 *      그룹 이름 없이 멤버만 말한 제목은 «놓친다». 그 놓친 수는 못 쟀다.
 *   ⬜ 왜 그 멤버를 썼나. 발매·행사·소속사 배포 어느 것도 이 자료에 없다.
 *
 * [🔴 이름표를 짐작했다가 틀렸다]
 *   처음에 열람 자료의 문서 이름을 `Suga (rapper)` · `RM (rapper)` 로 «짐작해» 적었다.
 *   그러니 그 둘이 「자료에 없다」로 나왔다. 실제로는 `Suga` 와 `RM (musician)` 으로 있었다.
 *   ⛔ 「없다」고 적기 전에 여러 표기로 찾는다 — 우리 규칙 그대로다.
 *
 *   node scripts/build-kcw-press-vs-reading.mjs
 *   node scripts/build-kcw-press-vs-reading.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
/* 🔴 [2026-11-14] 영문 지면에 「오후」가 나갔다 — 잰 시각은 한 꼴로 적는다 */
import { 잰때문자 } from './lib/잰때.mjs';

const 뿌리 = path.resolve(
  path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1'), '..');

/** BTS 일곱 멤버. 영문 이름은 «열람 자료에 실제로 있는 것»을 확인해 적었다 */
export const 멤버들 = [
  { 한글: ['진'], 영문: 'Jin (singer)' },
  { 한글: ['슈가', '민윤기'], 영문: 'Suga' },
  { 한글: ['제이홉', 'j-hope', 'J-Hope'], 영문: 'J-Hope' },
  { 한글: ['RM', '알엠'], 영문: 'RM (musician)' },
  { 한글: ['지민'], 영문: 'Jimin' },
  { 한글: ['뷔'], 영문: 'V (singer)' },
  { 한글: ['정국'], 영문: 'Jung Kook' },
];

export const 그룹정규 = /방탄소년단|BTS/;

/**
 * 제목 목록에서 그룹·멤버가 든 «제목 수»를 센다.
 * ⚠ 낱말 출현이 아니라 제목 수다 — 한 제목이 이름을 두 번 말해도 1 이다.
 */
export function 제목세기(제목들) {
  const 목록 = (제목들 ?? []).map((t) => String(t ?? ''));
  const 그룹든것 = 목록.filter((t) => 그룹정규.test(t));
  const 멤버셈 = {};
  for (const m of 멤버들) {
    /* 그룹 이름이 든 제목 «안에서만» 멤버를 센다 — 짧은 이름의 헛걸림을 막는다 */
    멤버셈[m.영문] = 그룹든것.filter((t) => m.한글.some((h) => t.includes(h))).length;
  }
  return { 제목수: 목록.length, 그룹든제목수: 그룹든것.length, 멤버셈 };
}

/** 여러 날을 합친다 */
export function 날들합치기(날별) {
  const 합 = { 제목수: 0, 그룹든제목수: 0, 멤버셈: {} };
  for (const m of 멤버들) 합.멤버셈[m.영문] = 0;
  for (const r of 날별) {
    합.제목수 += r.제목수;
    합.그룹든제목수 += r.그룹든제목수;
    for (const k of Object.keys(r.멤버셈)) 합.멤버셈[k] += r.멤버셈[k];
  }
  return 합;
}

/* ─── 자가시험 ────────────────────────────────────────────────────────────── */

function 자가시험() {
  let 통과 = 0, 실패 = 0;
  const 봄 = (무엇, 실제, 기대) => {
    const ok = JSON.stringify(실제) === JSON.stringify(기대);
    if (ok) 통과 += 1; else { 실패 += 1; console.log('  🔴 ' + 무엇 + '  실제=' + JSON.stringify(실제) + '  기대=' + JSON.stringify(기대)); }
  };
  const 맞다 = (무엇, x) => 봄(무엇, !!x, true);

  const r = 제목세기([
    '방탄소년단 지민, 글로벌 인기투표 1위',
    '방탄소년단 진, 아이돌픽 67주 연속 1위',
    'BTS 진, 구찌 캠페인 최다 검색',
    '지민 단독 기사인데 그룹 이름이 없다',      /* ⬜ 일부러 놓치게 둔 것 */
    '아무 상관 없는 제목',
  ]);
  봄('제목 수', r.제목수, 5);
  봄('그룹이 든 제목 수', r.그룹든제목수, 3);
  봄('Jimin 은 1 (그룹 없는 것은 안 센다)', r.멤버셈['Jimin'], 1);
  봄('Jin 은 2', r.멤버셈['Jin (singer)'], 2);
  봄('안 나온 멤버는 0', r.멤버셈['Jung Kook'], 0);

  /* 🔴 한 제목이 이름을 두 번 말해도 1 이어야 한다 */
  봄('한 제목에 두 번 나와도 1', 제목세기(['방탄소년단 지민, 지민 또 1위']).멤버셈['Jimin'], 1);

  /* ⚠ 짧은 이름이 아무 데나 걸리지 않아야 한다 — 그룹 이름이 없으면 안 센다 */
  봄('그룹 없이 「진」만 있으면 안 센다', 제목세기(['진짜 대단한 기록']).멤버셈['Jin (singer)'], 0);
  /* ⚠ 다만 그룹 이름이 든 제목 안에서는 「진」이 다른 말에 걸릴 수 있다. 그 한계를 시험으로 못박는다 */
  봄('⬜ 한계 — 그룹이 든 제목 안의 「진」짜도 걸린다(이 자가 못 가른다)',
    제목세기(['방탄소년단 진짜 대단하다']).멤버셈['Jin (singer)'], 1);

  봄('빈 목록', 제목세기([]), { 제목수: 0, 그룹든제목수: 0,
    멤버셈: Object.fromEntries(멤버들.map((m) => [m.영문, 0])) });
  봄('null 이 섞여도 센다', 제목세기(['방탄소년단 지민', null]).그룹든제목수, 1);

  const 합 = 날들합치기([제목세기(['방탄소년단 지민']), 제목세기(['BTS 진', '무관'])]);
  봄('합계 제목수', 합.제목수, 3);
  봄('합계 그룹든제목수', 합.그룹든제목수, 2);
  봄('합계 Jimin', 합.멤버셈['Jimin'], 1);
  봄('합계 Jin', 합.멤버셈['Jin (singer)'], 1);
  봄('빈 합계', 날들합치기([]).제목수, 0);
  맞다('멤버 일곱이 다 있다', 멤버들.length === 7);
  맞다('영문 이름이 겹치지 않는다', new Set(멤버들.map((m) => m.영문)).size === 7);

  console.log('\n자가시험 ' + (통과 + 실패) + '개 중 ' + 통과 + '개 통과' + (실패 ? ' · 🔴 ' + 실패 + '개 실패' : ''));
  return 실패 === 0;
}

/* ─── 직접 돌릴 때 ────────────────────────────────────────────────────────── */

if (process.argv[1] && process.argv[1].endsWith('build-kcw-press-vs-reading.mjs')) {
  if (process.argv.includes('--자가시험')) process.exit(자가시험() ? 0 : 1);

  const 신문방 = path.join(뿌리, 'archive/raw/newsdesk-korean-press');
  const 날들 = fs.readdirSync(신문방).filter((f) => /^\d{8}\.json$/.test(f)).sort();
  const 내몫매체 = ['스타뉴스', '텐아시아'];

  const 날별 = [];
  for (const f of 날들) {
    const j = JSON.parse(fs.readFileSync(path.join(신문방, f), 'utf8'));
    const 제목들 = 내몫매체.flatMap((m) => (j.매체별?.[m]?.쓸만한 ?? []).map((x) => x.제목));
    const r = 제목세기(제목들);
    날별.push({ 날: f.replace('.json', ''), 잰때: j.잰때 ?? null, ...r });
  }
  const 합 = 날들합치기(날별);

  console.log('신문 아카이브 ' + 날들.length + '일치 (' + 날들[0].replace('.json', '')
    + ' ~ ' + 날들[날들.length - 1].replace('.json', ') · 매체 ' + 내몫매체.join('·')));
  console.log('⬜ ' + 날들.length + '일로 추세를 말하지 않는다.\n');
  for (const d of 날별) {
    console.log('  ' + d.날 + '  제목 ' + String(d.제목수).padStart(3) + '건 · 그룹이 든 것 '
      + String(d.그룹든제목수).padStart(2) + '건 (' + (d.그룹든제목수 / d.제목수 * 100).toFixed(1) + '%)');
  }
  console.log('  합계 — 제목 ' + 합.제목수 + '건 중 ' + 합.그룹든제목수
    + '건 (' + (합.그룹든제목수 / 합.제목수 * 100).toFixed(1) + '%)');

  /* 열람 쪽 */
  const kj = JSON.parse(fs.readFileSync(path.join(뿌리, 'archive/raw/star-pageviews/kpop-20260822.json'), 'utf8'));
  const 열람 = Array.isArray(kj) ? kj : Object.values(kj).find((v) => Array.isArray(v));
  const 찾기 = (이름) => 열람.find((x) => x.이름 === 이름);

  const 표 = 멤버들.map((m) => {
    const x = 찾기(m.영문);
    return { 영문: m.영문, 신문: 합.멤버셈[m.영문], 하루: x ? Number(x.하루평균) : null };
  }).sort((a, b) => (b.하루 ?? -1) - (a.하루 ?? -1));

  console.log('\n  이름                신문(제목수)   하루열람');
  for (const r of 표) {
    console.log('  ' + r.영문.padEnd(20) + String(r.신문).padStart(8)
      + String(r.하루 === null ? '⬜못찾음' : r.하루.toLocaleString()).padStart(12));
  }
  const 그룹행 = 찾기('BTS');
  console.log('  ' + 'BTS (그룹)'.padEnd(20) + String(합.그룹든제목수).padStart(8)
    + String(그룹행 ? Number(그룹행.하루평균).toLocaleString() : '⬜').padStart(12));

  const 낼곳 = path.join(뿌리, 'src/data/kcw-press-vs-reading.json');
  fs.writeFileSync(낼곳, JSON.stringify({
    무엇인가: '한국 연예 매체 두 곳의 제목에 나오는 BTS 멤버와, 영문 위키백과에서 실제로 읽히는 BTS 멤버를 나란히 센 것',
    신문출처: '우리 수집기 archive/raw/newsdesk-korean-press · 매체 스타뉴스·텐아시아',
    신문날들: 날별.map((d) => ({ 날: d.날, 잰때: d.잰때, 제목수: d.제목수, 그룹든제목수: d.그룹든제목수 })),
    열람출처: kj.출처, 열람기간: kj.기간,
    잰때: 잰때문자(),
    못재는것: [
      '추세 — 신문 아카이브가 ' + 날들.length + '일치뿐이다',
      '한국 신문 전부 — 우리 수집기가 긁는 두 매체뿐이다',
      '그룹 이름을 안 쓴 단독 기사 — 멤버는 그룹 이름이 든 제목 안에서만 센다. 놓친 수는 못 쟀다',
      '그룹이 든 제목 안에서 「진」이 「진짜」에 걸리는 것을 이 자가 못 가른다(자가시험에 못박아 뒀다)',
      '왜 그 멤버를 썼나 — 발매·행사·배포가 이 자료에 없다',
    ],
    합계: 합, 표, 그룹하루: 그룹행 ? Number(그룹행.하루평균) : null,
  }, null, 2) + '\n', 'utf8');
  console.log('\n✅ 냈다 — src/data/kcw-press-vs-reading.json');
}
