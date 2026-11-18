#!/usr/bin/env node
/**
 * 시험-흘려올리기.mjs — **큰 파일을 흘려서 R2 에 올리는 길이 실제로 도나** 한 번 재 본다.
 *
 * ── 🔴 왜 (2026-11-18 · 5번) ──────────────────────────────────────────
 * `원격에올린다(키, readFileSync(391MB))` 가 윈도에서 `ENOBUFS` 로 터졌다.
 * 빌드 15분이 버려지고 1번이 올린 기사 세 편이 라이브에 못 갔다.
 * 고쳤는데 — **고친 것을 15분짜리 빌드 뒤에 처음 돌려 보면 또 15분을 버린다.**
 * 그래서 이미 손에 있는 묶음으로 **먼저** 재 본다.
 *
 * ⛔ 작은 파일로 재면 서명만 재는 것이다. ENOBUFS 는 크기에서 나온다 — 진짜 묶음으로 잰다.
 * ⛔ 쓰고 나서 지운다. 라이브가 읽는 키(`지면/<커밋>.tar.gz` · 최신 쪽지)는 건드리지 않는다.
 *
 * 쓰는 법
 *   node scripts/시험-흘려올리기.mjs <파일길>
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 파일길 = process.argv[2] || path.join(뿌리, 'dist.tar.gz');
const 시험키 = '지면/시험-흘림.tar.gz';

if (!fs.existsSync(파일길)) {
  console.log('🔴 그런 파일이 없다 — ' + 파일길);
  process.exit(1);
}

const 창고 = await import('../src/lib/store.mjs');
if (!창고.remoteEnabled) {
  console.log('🔴 R2 가 꺼져 있다 — ARCHIVE_S3_* 를 본다');
  process.exit(1);
}

const 크기 = fs.statSync(파일길).size;
console.log('■ 흘려 올린다 — ' + (크기 / 1024 / 1024).toFixed(0) + 'MB → ' + 시험키);
const 샜다 = Date.now();

try {
  await 창고.원격에흘려올린다(시험키, 파일길, 'application/gzip');
} catch (e) {
  console.log('🔴 못 올렸다 — ' + String(e?.message ?? e).slice(0, 300));
  console.log('   ⛔ 이 상태로 15분짜리 빌드를 걸지 않는다. 여기부터 고친다.');
  process.exit(1);
}

const 걸린 = ((Date.now() - 샜다) / 1000).toFixed(0);
console.log('✅ 올라갔다 — ' + 걸린 + '초');

/* 🔴 시험 자국을 라이브 창고에 남기지 않는다 */
try {
  await 창고.del(시험키);
  console.log('■ 시험 자국을 지웠다 — ' + 시험키);
} catch (e) {
  console.log('⚠ 시험 자국을 못 지웠다 — ' + 시험키 + ' · ' + String(e?.message ?? e).slice(0, 120));
  console.log('   손으로 지워야 한다. 그대로 두면 묵은 묶음 치우는 자가 세는 수가 달라진다.');
}
