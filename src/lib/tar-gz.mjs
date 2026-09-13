/**
 * tar-gz.mjs — **산 파일을 한 묶음으로 준다.**
 * ─────────────────────────────────────────────────────────────────────────
 * 사장님 지시 (2026-09-13): 「5-4 아직 못한 것 빨리 마무리해」 — 그 가운데 «묶음 내려받기».
 *
 * 왜 zip 이 아니라 tar.gz 인가
 *   zip 을 제대로 쓰려면 CRC32 표·중앙 디렉터리·EOCD 를 손으로 짜야 하고,
 *   한 자리만 틀려도 «열리는 것처럼 보이다가 깨지는» 파일이 나온다.
 *   tar 는 512바이트 머리글 하나뿐이라 손으로 짜도 틀릴 자리가 적고,
 *   gzip 은 node 에 이미 있다(zlib). **적게 틀릴 길을 고른다.**
 *   ⚠ 윈도우 기본 탐색기는 .tar.gz 를 못 연다. 우리 손님은 데이터 쓰는 사람이라 괜찮지만,
 *     지면에 「tar.gz — use 7-Zip, macOS/Linux open it natively」라고 적어 둔다.
 *
 * ⛔ 파일이 하나라도 없으면 던진다. «빈 묶음»을 조용히 주지 않는다.
 */
import { readFile } from 'node:fs/promises';
import { gzip } from 'node:zlib';
import { promisify } from 'node:util';

const 눌러라 = promisify(gzip);
const 칸 = 512;

/** tar 머리글 한 장. 이름·크기·체크섬만 제대로 넣으면 어디서나 풀린다 */
export function 머리글(이름, 크기, 때 = Math.floor(Date.now() / 1000)) {
  const b = Buffer.alloc(칸, 0);
  const 넣 = (글, 자리, 길이) => b.write(String(글).slice(0, 길이 - 1), 자리, 길이 - 1, 'utf8');
  const 여덟 = (n, 자리, 길이) => b.write(n.toString(8).padStart(길이 - 1, '0') + '\0', 자리, 길이, 'ascii');

  if (Buffer.byteLength(이름) > 99) throw new Error('tar: name too long — ' + 이름);
  넣(이름, 0, 100);
  여덟(0o644, 100, 8);     /* mode  */
  여덟(0, 108, 8);          /* uid   */
  여덟(0, 116, 8);          /* gid   */
  여덟(크기, 124, 12);      /* size  */
  여덟(때, 136, 12);        /* mtime */
  b.write('        ', 148, 8, 'ascii');  /* 체크섬 자리는 «빈칸 여덟»으로 두고 셈한다 */
  b.write('0', 156, 1, 'ascii');          /* typeflag: 보통 파일 */
  b.write('ustar\0', 257, 6, 'ascii');
  b.write('00', 263, 2, 'ascii');

  let 합 = 0;
  for (const v of b) 합 += v;
  b.write(합.toString(8).padStart(6, '0') + '\0 ', 148, 8, 'ascii');
  return b;
}

/** 512 의 배수로 채운다 — tar 는 칸을 맞춰야 한다 */
function 채움(크기) {
  const 남 = 크기 % 칸;
  return 남 === 0 ? Buffer.alloc(0) : Buffer.alloc(칸 - 남, 0);
}

/**
 * @param 것들 [{ 이름, 몸(Buffer) }]
 * @returns tar 바이트
 */
export function tar만들기(것들) {
  if (!Array.isArray(것들) || !것들.length) throw new Error('tar: nothing to pack');
  const 조각 = [];
  for (const { 이름, 몸 } of 것들) {
    if (!이름 || !Buffer.isBuffer(몸)) throw new Error('tar: bad entry — ' + 이름);
    조각.push(머리글(이름, 몸.length), 몸, 채움(몸.length));
  }
  조각.push(Buffer.alloc(칸 * 2, 0));   /* 끝 표시 — 빈 칸 둘 */
  return Buffer.concat(조각);
}

/**
 * 공개 경로 목록을 읽어 .tar.gz 로 묶는다.
 * @param 경로들 '/data/full/….csv' 꼴
 * @param 뿌리 dist 폴더의 절대 경로
 */
export async function 묶기(경로들, 뿌리, 읽기 = readFile) {
  if (!Array.isArray(경로들) || !경로들.length) throw new Error('nothing to pack');
  const 것들 = [];
  for (const p of 경로들) {
    /* ⛔ 위로 올라가는 경로(..)를 받지 않는다 */
    if (typeof p !== 'string' || p.includes('..') || !p.startsWith('/')) throw new Error('bad path: ' + p);
    const 이름 = p.split('/').pop();
    const 몸 = await 읽기(뿌리 + p);
    것들.push({ 이름, 몸: Buffer.isBuffer(몸) ? 몸 : Buffer.from(몸) });
  }
  return 눌러라(tar만들기(것들));
}
