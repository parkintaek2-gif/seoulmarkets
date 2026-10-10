/**
 * 일본-회사지면에-대표가-있나.test.mjs — **「who is the ceo of …」에 답이 있나(일본).**
 * 실행: node --test tests/일본-회사지면에-대표가-있나.test.mjs
 *
 * ── 🔴 왜 (2026-10-11 00:5x · 5번) ──────────────────────────────────
 * 실제 질의를 전수로 보니 「who is the ceo of hokkaidosenko.co.jp」가 **이미 10.3위**였다.
 * 그 꼴이 한국보다 **일본에서 먼저** 오고 있었는데, 일본 지면 3,702장에 CEO 가 한 줄도 없었다.
 * 답은 유가증권보고서 표지(`TitleAndNameOfRepresentativeCoverPage`)에 있었다 —
 * 우리 수집기가 재무 아홉 칸만 뽑고 버리고 있었던 것이다.
 *
 * ⭐ **자료가 없는 것과 지면이 안 그리는 것은 다른 흠이다.** 한 수로 둘을 재지 않는다 —
 *   묶음에 몇 줄이 대표자를 쥐고 있나(자료)와, 그 줄을 쥔 지면이 칸을 그렸나(전달)를 따로 센다.
 *   섞어 재면 되받기가 덜 돌았을 뿐인데 「지면이 깨졌다」로 읽는다.
 *
 * ⚠ 이 검사는 `dist/` 가 있어야 돈다. 없으면 건너뛴다.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 회사방 = path.join(뿌리, 'dist', 'japan', 'company');
const 묶음길 = path.join(뿌리, 'src', 'data', 'japan-financials-tape.json');

/** 묶음이 대표자를 몇 줄 쥐고 있나 — **자료** 쪽 */
export function 자료가쥔수(묶음) {
  const rows = 묶음?.rows ?? [];
  return {
    모두: rows.length,
    이름있음: rows.filter((r) => r.rep_name).length,
    서류에없다: rows.filter((r) => r.rep_상태 === '서류에없다').length,
    안받음: rows.filter((r) => r.rep_상태 === '안받음').length,
  };
}

test('일본 회사 지면이 「누가 이끄나」에 답한다', async (t) => {
  if (!fs.existsSync(회사방) || !fs.existsSync(묶음길)) {
    t.skip('dist/japan/company 나 묶음이 없다 — 빌드 전이라 잴 것이 없다');
    return;
  }
  const 묶음 = JSON.parse(fs.readFileSync(묶음길, 'utf8'));
  const 센것 = 자료가쥔수(묶음);
  const 지면들 = fs.readdirSync(회사방).filter((f) => f.endsWith('.html'));

  /* ⛔ **되받기가 덜 돈 것은 흠이 아니라 «아직 못 잰 것»이다.** 3,712건을 받는 데 두 시간 반이
     걸린다 — 그 사이 이 검사가 빨간불이면 다른 유닛이 「지면이 깨졌다」로 읽는다.
     ⚠ 그렇다고 조용히 넘기지 않는다. 몇 줄이 남았는지 적고 건너뛴다. */
  /* ⛔ 먼저 「칸이 아예 없다」와 「칸이 있는데 비었다」를 가른다 —
     묶음을 아직 안 지었으면 rep_상태 가 통째로 없다. 그것을 「0%」로 읽으면 거짓 빨간불이다 */
  if (!(묶음.rows ?? []).some((r) => 'rep_상태' in r)) {
    t.skip('묶음에 rep_상태 칸이 아예 없다 — 아직 안 지었다(node scripts/build-japan-financials-tape.mjs --적는다)');
    return;
  }
  if (센것.안받음 > 센것.모두 * 0.05) {
    t.skip(`되받기가 아직 돈다 — ${센것.모두}줄 가운데 ${센것.안받음}줄이 «안받음»이다. `
      + '다 받은 뒤에 잰다(node scripts/일본-대표자-되받기.mjs --적는다 → build-japan-financials-tape.mjs --적는다)');
    return;
  }

  await t.test('🔴 자료 쪽 — 묶음의 8할 넘는 줄이 대표자 이름을 쥔다', () => {
    assert.ok(센것.모두 > 0, '묶음이 비었습니다');
    const 비 = 센것.이름있음 / 센것.모두;
    assert.ok(비 > 0.8,
      `묶음 ${센것.모두}줄 가운데 ${센것.이름있음}줄(${(비 * 100).toFixed(0)}%)만 대표자를 쥡니다.\n`
      + `  아직 안 받은 줄 ${센것.안받음} · 서류에 없던 줄 ${센것.서류에없다}\n`
      + '  «안받음»이 크면 되받기가 덜 돈 것입니다 — node scripts/일본-대표자-되받기.mjs --적는다\n'
      + '  그 뒤 묶음을 다시 짓습니다 — node scripts/build-japan-financials-tape.mjs --적는다');
  });

  await t.test('🔴 전달 쪽 — 자료를 쥔 회사는 지면에도 칸이 있다', () => {
    /* 묶음에서 이름을 쥔 종목코드를 골라, 그 지면이 칸을 그렸는지 본다.
       ⛔ 지면 전체를 세지 않는다 — 자료가 없는 회사까지 섞이면 두 흠이 한 수로 뭉개진다 */
    const 쥔줄 = (묶음.rows ?? []).filter((r) => r.rep_name).slice(0, 300);
    let 있음 = 0; const 없음 = [];
    for (const r of 쥔줄) {
      const 후보 = 지면들.filter((f) => f.includes(String(r.code)));
      if (!후보.length) continue;             /* 지면이 아예 없는 것은 이 검사의 물음이 아니다 */
      const 글 = fs.readFileSync(path.join(회사방, 후보[0]), 'utf8');
      if (글.includes('Who runs it')) 있음 += 1; else 없음.push(후보[0]);
    }
    assert.ok(있음 > 0, '대표자를 쥔 지면을 하나도 못 찾았습니다 — 이 검사가 헛돌고 있습니다');
    assert.deepEqual(없음.slice(0, 5), [],
      `자료는 있는데 칸이 없는 지면 ${없음.length}장 — 지면이 묶음의 rep_name 을 안 받습니다`);
  });

  await t.test('🔴 손님이 찾는 말(CEO)이 지면에 있다 — 일본 직위는 「社長」이라 그냥 옮기면 안 나온다', () => {
    const 한장 = 지면들.map((f) => fs.readFileSync(path.join(회사방, f), 'utf8'))
      .find((t2) => t2.includes('Who runs it'));
    assert.ok(한장 && /office a CEO holds/.test(한장),
      '대표 칸에 CEO 라는 말이 없습니다 — 이 지면이 노리는 질의가 그 말입니다.');
  });

  await t.test('⛔⛔ 로마자를 지어내지 않는다 — 그 까닭을 지면이 밝힌다', () => {
    const 한장 = 지면들.map((f) => fs.readFileSync(path.join(회사방, f), 'utf8'))
      .find((t2) => t2.includes('Who runs it'));
    assert.ok(한장 && /We do not romanise it/.test(한장),
      '한자 이름을 로마자로 안 옮긴 까닭이 지면에 없습니다.\n'
      + '  읽기가 여럿이라 지어내면 사람 이름을 틀리게 박습니다 — 숨기면 안 됩니다.');
  });

  await t.test('⛔ 구조화 데이터가 같은 사실을 기계에도 낸다', () => {
    const 한장 = 지면들.map((f) => fs.readFileSync(path.join(회사방, f), 'utf8'))
      .find((t2) => t2.includes('Who runs it'));
    const 회사 = [...(한장 ?? '').matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
      .map((x) => { try { return JSON.parse(x[1]); } catch { return null; } })
      .find((j) => j && j['@type'] === 'Corporation');
    assert.ok(회사?.employee?.length,
      'Corporation.employee 가 없습니다 — 구글은 이 물음에 답할 때 본문이 아니라 이 칸을 봅니다');
  });

  await t.test('🔴 대표 줄이 설명 앞 160자 안에 있다 — 뒤로 밀리면 스니펫에서 잘린다', () => {
    let 안 = 0; const 밖 = [];
    for (const f of 지면들) {
      const m = /<meta name="description" content="([^"]*)"/.exec(fs.readFileSync(path.join(회사방, f), 'utf8'));
      const i = m ? m[1].indexOf('CEO (representative director):') : -1;
      if (i < 0) continue;
      if (i < 160) 안 += 1; else 밖.push(`${f}(${i}자)`);
    }
    assert.ok(안 > 0, '대표 줄이 든 설명을 하나도 못 찾았습니다 — 이 검사가 헛돌고 있습니다');
    assert.deepEqual(밖.slice(0, 5), [],
      `대표 줄이 160자 뒤로 밀린 지면 ${밖.length}장 — 설명 앞 문장이 길어졌습니다`);
  });
});

test('⛔ 이 검사가 헛돌지 않는다 — 비면 정말 우는지', async (t) => {
  await t.test('🔴 아무도 대표자를 안 쥔 묶음은 0 으로 센다', () => {
    assert.equal(자료가쥔수({ rows: [{ code: '1', rep_상태: '안받음' }] }).이름있음, 0);
  });
  await t.test('⛔ 세 갈래를 따로 센다 — 뭉치면 되받기 진행을 못 본다', () => {
    const r = 자료가쥔수({
      rows: [
        { rep_name: '大久保 昇', rep_상태: '있다' },
        { rep_상태: '서류에없다' },
        { rep_상태: '안받음' },
      ],
    });
    assert.deepEqual([r.모두, r.이름있음, r.서류에없다, r.안받음], [3, 1, 1, 1]);
  });
  await t.test('⛔ 빈 입력에도 안 죽는다', () => {
    assert.equal(자료가쥔수(null).모두, 0);
    assert.equal(자료가쥔수({}).이름있음, 0);
  });
});
