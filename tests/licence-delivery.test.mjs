/**
 * licence-delivery.test.mjs — **산 사람이 «정말로» 받는가.**
 * ─────────────────────────────────────────────────────────────────────────
 * 사장님 지시 (2026-09-13): 「5-4 아직 못한 것 빨리 마무리해」
 *   — 데이터셋 고르기 · 묶음 내려받기.
 *
 * 여기서 막는 것 —
 *   ① 「돈은 받았는데 줄 것이 없다」 — 적어 둔 파일이 실제로 없는 경우
 *   ② single 을 샀는데 «전부» 받아 가는 경우 (한 개 값으로 여섯 개)
 *   ③ 데이터셋을 안 골랐는데 조용히 뭔가 주는 경우
 *   ④ 묶음이 «열리는 것처럼 보이다가 깨지는» 경우
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { 데이터셋, 데이터셋목록, 데이터셋찾기, 줄파일들, 골라야하나 } from '../src/data/licence-datasets.mjs';
import { 머리글, tar만들기, 묶기 } from '../src/lib/tar-gz.mjs';

const 뿌리 = fileURLToPath(new URL('../', import.meta.url));

/* ── ① 적어 둔 파일이 «실제로» 있나 ───────────────────────── */

test('🔴 파는 파일이 저장소에 실제로 있다 — 「돈은 받았는데 줄 것이 없다」를 막는다', () => {
  const 없는것 = [];
  for (const d of Object.values(데이터셋)) {
    for (const p of d.파일) {
      /* 공개 경로 /data/full/x.csv 는 빌드 전에는 src/data/full/x.csv 에 있다 */
      const 후보 = [뿌리 + 'src' + p, 뿌리 + 'public' + p, 뿌리 + 'dist' + p];
      if (!후보.some((f) => existsSync(f))) 없는것.push(d.코드 + ' → ' + p);
    }
  }
  assert.deepStrictEqual(없는것, [], '팔겠다고 적어 놓고 파일이 없다:\n  · ' + 없는것.join('\n  · '));
});

/* ── ②③ 무엇을 주나 ──────────────────────────────────────── */

test('all 은 모든 데이터셋의 파일을 준다', () => {
  const 전부 = Object.values(데이터셋).flatMap((d) => d.파일);
  assert.deepStrictEqual(줄파일들('all').sort(), 전부.sort());
});

test('🔴 single 은 «고른 하나»만 준다 — 한 개 값으로 전부 가져갈 수 없다', () => {
  const r = 줄파일들('single', 'people');
  assert.deepStrictEqual(r, 데이터셋.people.파일);
  assert.ok(r.length < Object.values(데이터셋).flatMap((d) => d.파일).length);
});

test('🔴 데이터셋을 안 골랐으면 «빈 목록» — 조용히 아무거나 주지 않는다', () => {
  assert.deepStrictEqual(줄파일들('single'), []);
  assert.deepStrictEqual(줄파일들('single', ''), []);
  assert.deepStrictEqual(줄파일들('single', '없는것'), []);
  assert.deepStrictEqual(줄파일들('academic', null), []);
});

test('모르는 상품은 빈 목록', () => {
  assert.deepStrictEqual(줄파일들('없는상품', 'people'), []);
  assert.deepStrictEqual(줄파일들(null), []);
});

test('골라야하나: single·academic 만 고르게 한다', () => {
  assert.equal(골라야하나('single'), true);
  assert.equal(골라야하나('academic'), true);
  assert.equal(골라야하나('all'), false);
  assert.equal(골라야하나('trade'), false);
});

test('데이터셋찾기: 모르는 코드를 기본값으로 주지 않는다', () => {
  assert.equal(데이터셋찾기('없는것'), null);
  assert.equal(데이터셋찾기(''), null);
  assert.equal(데이터셋찾기('PEOPLE').코드, 'people', '대문자도 같은 것으로 본다');
});

test('화면에 낼 목록에 값이 섞여 들어가지 않는다 — 값은 상품표가 정한다', () => {
  for (const d of 데이터셋목록) {
    assert.ok(d.코드 && d.이름 && d.설명);
    assert.ok(!('usd' in d) && !('파일' in d), '목록에 값이나 파일 경로가 새어 나간다');
  }
});

/* ── ④ 묶음이 «성한가» ───────────────────────────────────── */

test('tar 머리글: 512바이트이고 이름·크기가 제자리에 들어간다', () => {
  const h = 머리글('a.csv', 5);
  assert.equal(h.length, 512);
  assert.equal(h.toString('utf8', 0, 5), 'a.csv');
  assert.equal(parseInt(h.toString('ascii', 124, 135).trim(), 8), 5, '크기가 8진수로 적힌다');
  assert.equal(h.toString('ascii', 257, 262), 'ustar');
});

test('🔴 tar 체크섬이 맞는다 — 틀리면 «열리는 척하다가 깨진다»', () => {
  const h = 머리글('a.csv', 5);
  const 적힌것 = parseInt(h.toString('ascii', 148, 154).trim(), 8);
  const 빈칸 = Buffer.from(h);
  빈칸.write('        ', 148, 8, 'ascii');
  let 합 = 0; for (const v of 빈칸) 합 += v;
  assert.equal(적힌것, 합);
});

test('tar: 이름이 99바이트를 넘으면 던진다 — 조용히 잘라 내지 않는다', () => {
  assert.throws(() => 머리글('x'.repeat(120), 1), /name too long/);
});

test('tar 묶음: 512 배수로 맞고 끝에 빈 칸 둘이 붙는다', () => {
  const t = tar만들기([{ 이름: 'a.csv', 몸: Buffer.from('hello') }]);
  assert.equal(t.length % 512, 0);
  assert.ok(t.subarray(t.length - 1024).every((v) => v === 0), '끝 표시가 없다');
  assert.equal(t.toString('utf8', 512, 517), 'hello', '몸이 머리글 바로 뒤에 온다');
});

test('tar: 빈 목록이면 던진다 — 빈 묶음을 주지 않는다', () => {
  assert.throws(() => tar만들기([]), /nothing to pack/);
  assert.throws(() => tar만들기(null), /nothing to pack/);
});

test('🔴 묶기: 위로 올라가는 경로(..)를 받지 않는다', async () => {
  await assert.rejects(() => 묶기(['/../../secret.txt'], '/tmp', async () => Buffer.from('x')), /bad path/);
  await assert.rejects(() => 묶기(['data/x.csv'], '/tmp', async () => Buffer.from('x')), /bad path/);
});

test('묶기: 풀면 원래 내용이 그대로 나온다', async () => {
  const 가짜읽기 = async (p) => Buffer.from('col1,col2\n1,2\n' + p);
  const gz = await 묶기(['/data/full/a.csv', '/data/full/b.csv'], '/root', 가짜읽기);
  const tar = gunzipSync(gz);
  assert.equal(tar.length % 512, 0);
  assert.equal(tar.toString('utf8', 0, 5), 'a.csv', '첫 파일 이름이 폴더 없이 들어간다');
  assert.ok(tar.toString('utf8').includes('col1,col2'), '내용이 들어 있다');
});
