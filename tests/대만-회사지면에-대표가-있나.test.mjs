/**
 * 대만-회사지면에-대표가-있나.test.mjs — **「who is the ceo of …」에 답이 있나(대만).**
 * 실행: node --test tests/대만-회사지면에-대표가-있나.test.mjs
 *
 * ── 🔴 왜 (2026-10-11 01:5x · 5번) ──────────────────────────────────
 * 대만은 **자료도 지면도 이미 있었다.** 그런데 그 물음에 안 걸리고 있었다 —
 *   ① 지면에 「Chair 楊基寬」 한 줄이 자본금 표 «안»에 있었다. **CEO 라는 말이 없다.**
 *   ② `總經理`(대만에서 CEO 자리에 가장 가까운 것)는 수집기가 받아 두고 **안 담았다.**
 * ⭐ 「자료가 없다」가 아니라 「찾는 말로 적혀 있지 않다」가 흠인 자리였다.
 *   처음에 `grep Chairman` 으로 0장을 세고 「없다」고 읽을 뻔했다 — 지면은 「Chair」로 적고 있었다.
 *
 * ⛔ **둘 중 누가 CEO 인지 우리가 정하지 않는다.** 회사마다 다르고 공시가 말해 주지 않는다.
 *   「董事長이 CEO다」라고 적으면 틀린 회사가 많다 — 둘을 나란히 놓고 그 사실을 적는다.
 *
 * ⚠ `dist/` 가 있어야 돈다. 없으면 건너뛴다.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 회사방 = path.join(뿌리, 'dist', 'taiwan', 'company');
const 묶음길 = path.join(뿌리, 'src', 'data', 'taiwan-financials-tape.json');

/** 묶음이 두 자리를 몇 줄 쥐고 있나 */
export function 자료가쥔수(묶음) {
  const rows = 묶음?.rows ?? [];
  return {
    모두: rows.length,
    회장: rows.filter((r) => r.chairman).length,
    사장: rows.filter((r) => r.president).length,
  };
}

test('대만 회사 지면이 「누가 이끄나」에 답한다', async (t) => {
  if (!fs.existsSync(회사방) || !fs.existsSync(묶음길)) {
    t.skip('dist/taiwan/company 나 묶음이 없다 — 빌드 전이라 잴 것이 없다');
    return;
  }
  const 묶음 = JSON.parse(fs.readFileSync(묶음길, 'utf8'));
  const 센것 = 자료가쥔수(묶음);
  const 지면들 = fs.readdirSync(회사방).filter((f) => f.endsWith('.html'));

  await t.test('🔴 자료 쪽 — 묶음이 總經理를 쥔다 (안 담고 버리던 칸이다)', () => {
    assert.ok(센것.모두 > 0, '묶음이 비었습니다');
    const 비 = 센것.사장 / 센것.모두;
    assert.ok(비 > 0.9,
      `묶음 ${센것.모두}줄 가운데 ${센것.사장}줄(${(비 * 100).toFixed(0)}%)만 總經理를 쥡니다.\n`
      + '  수집기가 그 칸을 안 담고 있습니다 — node scripts/collect-twse-financials.mjs --적는다');
  });

  await t.test('🔴 전달 쪽 — 지면의 9할 넘게 「Who runs it」 칸이 있다', () => {
    const 있음 = 지면들.filter((f) => fs.readFileSync(path.join(회사방, f), 'utf8').includes('Who runs it')).length;
    const 비 = 있음 / 지면들.length;
    assert.ok(비 > 0.9,
      `지면 ${지면들.length}장 가운데 ${있음}장(${(비 * 100).toFixed(0)}%)에만 칸이 있습니다.\n`
      + '  지면이 묶음의 chairman·president 를 안 받습니다.');
  });

  await t.test('🔴 손님이 찾는 말(CEO)이 지면에 있다 — 「Chair」만으로는 그 질의에 안 걸린다', () => {
    const 한장 = 지면들.map((f) => fs.readFileSync(path.join(회사방, f), 'utf8'))
      .find((t2) => t2.includes('Who runs it'));
    assert.ok(한장 && /chief executive — the CEO/.test(한장),
      '대표 칸에 CEO 라는 말이 없습니다 — 이 지면이 노리는 질의가 그 말입니다.');
  });

  await t.test('⛔⛔ 둘 중 누가 CEO 인지 «우리가 정하지 않는다» — 공시가 말해 주지 않는다', () => {
    const 한장 = 지면들.map((f) => fs.readFileSync(path.join(회사방, f), 'utf8'))
      .find((t2) => t2.includes('Who runs it'));
    assert.ok(한장 && /differs from company to company, and the filing does not say/.test(한장),
      '둘 중 누가 CEO 인지 공시가 말하지 않는다는 사실이 지면에 없습니다.\n'
      + '  「董事長이 CEO다」로 읽히면 틀린 회사가 많습니다.');
    assert.ok(한장 && /董事長/.test(한장) && /總經理/.test(한장),
      '공시가 적은 한자 직위가 지면에 없습니다 — 손님이 맞대어 볼 수 없습니다.');
  });

  await t.test('⛔⛔ 로마자를 지어내지 않는다 — 그 까닭을 지면이 밝힌다', () => {
    const 한장 = 지면들.map((f) => fs.readFileSync(path.join(회사방, f), 'utf8'))
      .find((t2) => t2.includes('Who runs it'));
    assert.ok(한장 && /We do not romanise them/.test(한장),
      '한자 이름을 로마자로 안 옮긴 까닭이 지면에 없습니다.');
  });

  await t.test('⛔ 구조화 데이터가 같은 사실을 기계에도 낸다', () => {
    const 한장 = 지면들.map((f) => fs.readFileSync(path.join(회사방, f), 'utf8'))
      .find((t2) => t2.includes('Who runs it'));
    const 회사 = [...(한장 ?? '').matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
      .map((x) => { try { return JSON.parse(x[1]); } catch { return null; } })
      .find((j) => j && j['@type'] === 'Corporation');
    assert.ok(회사?.employee?.length, 'Corporation.employee 가 없습니다');
  });

  await t.test('🔴 대표 줄이 설명 앞 160자 안에 있다 — 뒤로 밀리면 스니펫에서 잘린다', () => {
    let 안 = 0; const 밖 = [];
    for (const f of 지면들) {
      const m = /<meta name="description" content="([^"]*)"/.exec(fs.readFileSync(path.join(회사방, f), 'utf8'));
      const i = m ? m[1].search(/Chairman |president /) : -1;
      if (i < 0) continue;
      if (i < 160) 안 += 1; else 밖.push(`${f}(${i}자)`);
    }
    assert.ok(안 > 0, '대표 줄이 든 설명을 하나도 못 찾았습니다 — 이 검사가 헛돌고 있습니다');
    assert.deepEqual(밖.slice(0, 5), [], `대표 줄이 160자 뒤로 밀린 지면 ${밖.length}장`);
  });
});

test('⛔ 이 검사가 헛돌지 않는다 — 비면 정말 우는지', async (t) => {
  await t.test('🔴 아무도 안 쥔 묶음은 0 으로 센다', () => {
    assert.deepEqual(자료가쥔수({ rows: [{ code: '1' }] }), { 모두: 1, 회장: 0, 사장: 0 });
  });
  await t.test('⛔ 두 자리를 «따로» 센다 — 하나로 뭉치면 總經理가 빠진 것을 못 본다', () => {
    const r = 자료가쥔수({ rows: [{ chairman: '張安平' }, { chairman: '甲', president: '程耀輝' }] });
    assert.deepEqual([r.모두, r.회장, r.사장], [2, 2, 1]);
  });
  await t.test('⛔ 빈 입력에도 안 죽는다', () => {
    assert.equal(자료가쥔수(null).모두, 0);
  });
});
