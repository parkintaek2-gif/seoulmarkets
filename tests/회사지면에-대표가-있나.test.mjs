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

  /* 🔴 [2026-10-10 23:1x] **본문에 답을 넣는 것만으로는 그 물음에 안 걸린다.**
   *   「who is the ceo of …」가 이미 10.3위로 뜨는데 제목·설명에는 CEO 라는 말이 없었다.
   *   제목은 「earnings results」로 4~8위를 먹고 있어 손대지 않고, 설명과 구조화 데이터에 넣었다. */
  await t.test('🔴 설명(description)이 대표 이름을 낸다 — 스니펫이 그 물음의 답이 되게', () => {
    const 다 = fs.readdirSync(회사방).filter((f) => f.endsWith('.html')).slice(0, 400);
    let 칸있고설명도있다 = 0; let 칸있는데설명없다 = 0;
    for (const f of 다) {
      const 글 = fs.readFileSync(path.join(회사방, f), 'utf8');
      if (!글.includes('Who runs it')) continue;
      const m = /<meta name="description" content="([^"]*)"/.exec(글);
      if (m && /Representative director \(CEO\):/.test(m[1])) 칸있고설명도있다 += 1;
      else 칸있는데설명없다 += 1;
    }
    assert.ok(칸있고설명도있다 > 0 && 칸있는데설명없다 === 0,
      `대표 칸은 있는데 설명에 안 들어간 지면 ${칸있는데설명없다}장 (들어간 것 ${칸있고설명도있다}장).\n`
      + '  설명을 만드는 자리와 칸을 그리는 자리가 어긋났습니다.');
  });

  /* ⚠ 설명에 넣는 것만으로는 모자란다 — 구글은 160자쯤에서 자른다. 앞 문장이 길어지거나
     회사 이름이 길면 대표 줄이 «잘리는 쪽»으로 조용히 밀린다. 자리까지 재야 한다 */
  await t.test('🔴 대표 줄이 설명 앞 160자 안에 있다 — 뒤로 밀리면 스니펫에서 잘린다', () => {
    const 다 = fs.readdirSync(회사방).filter((f) => f.endsWith('.html'));
    let 안 = 0; const 밖 = [];
    for (const f of 다) {
      const m = /<meta name="description" content="([^"]*)"/.exec(fs.readFileSync(path.join(회사방, f), 'utf8'));
      const i = m ? m[1].indexOf('Representative director (CEO):') : -1;
      if (i < 0) continue;
      if (i < 160) 안 += 1; else 밖.push(`${f}(${i}자)`);
    }
    assert.ok(안 > 0, '대표 줄이 든 설명을 하나도 못 찾았습니다 — 이 검사가 헛돌고 있습니다');
    assert.deepEqual(밖.slice(0, 5), [],
      `대표 줄이 160자 뒤로 밀린 지면 ${밖.length}장 — 설명 앞 문장이 길어졌습니다`);
  });

  await t.test('🔴 구조화 데이터가 같은 사실을 기계에도 낸다 — 구글은 본문 글자가 아니라 이 칸을 본다', () => {
    const 다 = fs.readdirSync(회사방).filter((f) => f.endsWith('.html')).slice(0, 200);
    let 잰것 = 0; let 샌것 = 0; const 빠진것 = [];
    for (const f of 다) {
      const 글 = fs.readFileSync(path.join(회사방, f), 'utf8');
      if (!글.includes('Who runs it')) continue;
      잰것 += 1;
      const 덩이 = [...글.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
      const 회사 = 덩이.map((x) => { try { return JSON.parse(x[1]); } catch { return null; } })
        .find((j) => j && j['@type'] === 'Corporation');
      if (!회사?.employee?.length) { 빠진것.push(f); continue; }
      /* ⛔⛔ 여기에도 생년월이 새면 안 된다 — 사람 눈에만 안 보일 뿐 같이 나간다 */
      if (/19\d\d/.test(JSON.stringify(회사.employee))) 샌것 += 1;
    }
    assert.ok(잰것 > 0, '대표 칸이 있는 지면을 하나도 못 찾았습니다 — 이 검사가 헛돌고 있습니다');
    assert.deepEqual(빠진것.slice(0, 5), [],
      `대표 칸은 있는데 Corporation.employee 가 없는 지면 ${빠진것.length}장`);
    assert.equal(샌것, 0, '구조화 데이터에 생년월로 보이는 네 자리 수가 들어 있습니다');
  });

  /* 🔴 [2026-10-11 03:5x] 설립일 — DART 기업개황에 3,931/3,931 이 처음부터 있었는데
     묶음에 안 담아 지면이 모르고 있었다. 대만에서 같은 모양을 찾고 나서야 봤다.
     ⛔ 「칸이 있다」와 「값이 있다」와 「지면에 닿는다」는 셋 다 다른 물음이다. */
  await t.test('🔴 설립일이 지면에 닿는다', () => {
    const 다 = fs.readdirSync(회사방).filter((f) => f.endsWith('.html'));
    const 있음 = 다.filter((f) => fs.readFileSync(path.join(회사방, f), 'utf8').includes('When it was founded')).length;
    assert.ok(있음 / 다.length > 0.8,
      `회사 지면 ${다.length}장 가운데 ${있음}장에만 설립일이 있습니다.\n`
      + '  묶음을 다시 지으십시오 — node scripts/build-korea-company-profile-tape.mjs --적는다');
  });

  await t.test('⛔⛔ 설립일 칸이 «설립일 말고는» 아무것도 안 낸다 — 개황에 사업자번호·주소가 같이 있다', () => {
    const 다 = fs.readdirSync(회사방).filter((f) => f.endsWith('.html')).slice(0, 300);
    const 샌것 = [];
    for (const f of 다) {
      const 글 = fs.readFileSync(path.join(회사방, f), 'utf8');
      const i = 글.indexOf('When it was founded');
      if (i < 0) continue;
      const 칸 = 글.slice(i, i + 1200);
      /* 사업자번호 10자리·법인번호 13자리가 그 칸 안에 보이면 샌 것이다 */
      if (/\b\d{3}-?\d{2}-?\d{5}\b/.test(칸) || /\b\d{6}-?\d{7}\b/.test(칸)) 샌것.push(f);
    }
    assert.deepEqual(샌것.slice(0, 5), [], `설립일 칸에 번호가 샌 지면: ${샌것.length}장`);
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
