#!/usr/bin/env node
/**
 * 본다-지면쪽지.mjs — **통이 받아 갈 쪽지가 무엇을 가리키나** 읽기만 한다.
 *
 * ── 🔴 왜 (2026-11-18 · 5번) ─────────────────────────────────────────
 * 묶음을 올리고 배포를 눌렀는데 통이 «옛 커밋»을 폈다. 통 로그에 이렇게 찍혔다 —
 * ```
 * ■ 쪽지가 가리키는 커밋 — a2b9cbc2a · 374MB      ← 내가 올린 것은 5d5733fdf 였다
 * ```
 * 누르기를 여섯 번 더 해도 같은 쪽지를 읽으니 같은 것을 편다.
 * ⛔ **「올렸다」를 「쪽지가 그것을 가리킨다」로 읽지 않는다.** 눈으로 읽어 본다.
 *
 * ⛔ 이 자는 **읽기만 한다.** 고치는 길을 여기 두지 않는다 —
 *   읽으러 열었다가 쓰게 되는 자리를 만들지 않는다.
 *
 * 쓰는 법
 *   node scripts/본다-지면쪽지.mjs
 */
import { pathToFileURL, fileURLToPath } from 'node:url';
import { realpathSync } from 'node:fs';

export function 직접불렸나(argv1 = process.argv[1], 나 = import.meta.url) {
  if (!argv1) return false;
  try {
    const 편길 = (p) => { try { return realpathSync(p); } catch { return p; } };
    const 부른것 = pathToFileURL(편길(argv1)).href;
    const 이파일 = pathToFileURL(편길(fileURLToPath(나))).href;
    return process.platform === 'win32'
      ? 부른것.toLowerCase() === 이파일.toLowerCase()
      : 부른것 === 이파일;
  } catch (e) { return false; }
}

if (직접불렸나()) {
  const 창고 = await import('../src/lib/store.mjs');
  if (!창고.remoteEnabled) {
    console.log('🔴 R2 가 꺼져 있다 — ARCHIVE_S3_* 를 본다');
    process.exit(1);
  }

  const 쪽지 = await 창고.get('지면/최신.json').catch(() => null);
  if (!쪽지) {
    console.log('🔴 쪽지가 없다 — 지면/최신.json');
    process.exit(1);
  }
  const 글 = Buffer.isBuffer(쪽지) ? 쪽지.toString('utf8') : String(쪽지);
  console.log('■ 지면/최신.json');
  console.log(글.trim());

  console.log('\n■ 창고에 있는 묶음');
  const 있는것 = await 창고.list('지면/').catch(() => []);
  for (const k of 있는것) console.log('   ' + k);
}
