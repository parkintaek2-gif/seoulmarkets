/**
 * 회사지면에-대표가-있나.test.mjs — **「who is the ceo of …」에 답이 있나.**
 * 실행: node --test tests/회사지면에-대표가-있나.test.mjs
 *
 * ── 🔴 왜 (2026-10-10 22:0x · 5번) ──────────────────────────────────
 * 실제 질의를 전수로 보니 「who is the ceo of …」가 **이미 10.3위**로 떴다.
 * 그런데 회사 지면 2,582장에 CEO 가 한 줄도 없었다 — 답이 없는데도 그 질의로 뜬 것이다.
 * `archive/raw/dart-executives` 에 대표 6,727명이 받아져 있는데 **안 쓰고 있었다.**
 *
 * ⛔ 이 칸은 조용히 사라질 수 있다 — 자료 파일 이름이 바뀌거나, 지면을 손보다
 *   `대표들` 을 안 넘기면 그날로 2,389장에서 한꺼번에 빠진다. 그래서 검사로 묶는다.
 * ⛔ 「빌드가 됐다」를 「칸이 있다」로 읽지 않는다 — **지은 지면을 세어 본다.**
 *
 * ⚠ 이 검사는 `dist/` 가 있어야 돈다. 없으면 건너뛴다(빌드 전에는 잴 것이 없다).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 회사방 = path.join(뿌리, 'dist', 'company');

/** 지은 회사 지면 가운데 대표 칸이 있는 비율 */
export function 덮는비율(방 = 회사방, 읽기 = fs) {
  if (!읽기.existsSync(방)) return null;                 /* ⛔ 못 재면 null — 0 이 아니다 */
  const 다 = 읽기.readdirSync(방).filter((f) => f.endsWith('.html'));
  if (!다.length) return null;
  let 있음 = 0;
  for (const f of 다) {
    if (읽기.readFileSync(path.join(방, f), 'utf8').includes('Who runs it')) 있음 += 1;
  }
  return { 모두: 다.length, 있음, 비율: 있음 / 다.length };
}

test('회사 지면이 「누가 이끄나」에 답한다', async (t) => {
  const r = 덮는비율();
  if (r === null) {
    t.skip('dist/company 가 없다 — 빌드 전이라 잴 것이 없다');
    return;
  }

  await t.test('🔴 지면의 9할 넘게 대표 칸이 있다', () => {
    assert.ok(r.비율 > 0.9,
      `회사 지면 ${r.모두}장 가운데 ${r.있음}장(${(r.비율 * 100).toFixed(0)}%)에만 있습니다.\n`
      + '  자료(src/data/korea-executives-tape.json)가 비었거나 지면이 «대표들»을 안 받습니다.\n'
      + '  다시 만들려면 — node scripts/build-korea-executives-tape.mjs --적는다');
  });

  await t.test('🔴 손님이 찾는 말(CEO)이 지면에 있다 — 질의가 그 말이다', () => {
    const 한장 = fs.readdirSync(회사방).filter((f) => f.endsWith('.html'))
      .map((f) => fs.readFileSync(path.join(회사방, f), 'utf8'))
      .find((t2) => t2.includes('Who runs it'));
    assert.ok(한장 && /office a CEO holds/.test(한장),
      '대표 칸에 CEO 라는 말이 없습니다. 한국 직위는 「부회장」·「사장」이라\n'
      + '  영문으로 옮겨도 CEO 가 안 나오는 회사가 많습니다 — 설명 줄에서 밝혀야 합니다.');
  });

  await t.test('⛔ 로마자가 «우리가 옮긴 것»이라고 밝힌다 — 지어낸 이름인 척하지 않는다', () => {
    const 한장 = fs.readdirSync(회사방).filter((f) => f.endsWith('.html'))
      .map((f) => fs.readFileSync(path.join(회사방, f), 'utf8'))
      .find((t2) => t2.includes('Who runs it') && t2.includes('('));
    assert.ok(한장 && /Roman spellings are ours/.test(한장),
      '로마자 표기가 우리 것이라는 말이 지면에 없습니다.\n'
      + '  본인이 쓰는 표기와 다를 수 있습니다 — 그 사실을 숨기면 안 됩니다.');
  });

  await t.test('⛔⛔ 생년월이 지면에 새지 않는다 — 공시에 있어도 낼 까닭이 없다', () => {
    const 다 = fs.readdirSync(회사방).filter((f) => f.endsWith('.html')).slice(0, 400);
    const 샌것 = [];
    for (const f of 다) {
      const 글 = fs.readFileSync(path.join(회사방, f), 'utf8');
      const i = 글.indexOf('Who runs it');
      if (i < 0) continue;
      /* 그 칸 안쪽만 본다 — 지면 다른 곳의 연도(회계연도 따위)를 잡으면 헛경보다 */
      const 칸 = 글.slice(i, i + 4000);
      if (/19\d\d년\s*\d{2}월|\b19[2-9]\d년/.test(칸)) 샌것.push(f);
    }
    assert.deepEqual(샌것, [], `생년월이 샌 지면: ${샌것.slice(0, 5).join(' · ')}`);
  });
});

test('⛔ 이 검사가 헛돌지 않는다 — 비면 정말 우는지', async (t) => {
  await t.test('🔴 칸이 하나도 없는 더미에서는 비율이 0 이다', () => {
    const 가짜 = {
      existsSync: () => true,
      readdirSync: () => ['a.html', 'b.html'],
      readFileSync: () => '<html>대표 칸이 없는 지면</html>',
    };
    assert.equal(덮는비율('X', 가짜).비율, 0, '못 잡으면 이 검사는 도장일 뿐입니다');
  });
  await t.test('⛔ 방이 없으면 null 이다 — 0 으로 읽지 않는다', () => {
    assert.equal(덮는비율('X', { existsSync: () => false }), null);
  });
  await t.test('⛔ 빈 방도 null 이다', () => {
    assert.equal(덮는비율('X', { existsSync: () => true, readdirSync: () => [] }), null);
  });
});
