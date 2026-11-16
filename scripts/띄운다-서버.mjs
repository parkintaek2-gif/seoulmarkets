#!/usr/bin/env node
/**
 * 띄운다-서버.mjs — **포트를 먼저 열고, 지면을 받고, 그 다음에 진짜 서버로 넘긴다.**
 *
 * ── 🔴🔴 왜 (2026-11-17 · 5번) ──────────────────────────────────────────
 * 지면 914MB 를 이미지에 넣으면 **이미지의 한 겹이 너무 커서 안 올라간다** —
 * 빌드 로그가 `🟢 Image build complete.` 뒤 push 에서 한 겹만 `Preparing` 인 채 끊겼다.
 * 그래서 지면을 이미지에서 빼고 `start` 에서 받게 했더니, 이번엔 받는 20초 동안
 * 포트가 안 열려 **뜨는 자리에서 죽었다.** 둘 다 「받는 때」를 잘못 고른 것이다.
 *
 * ⇒ 받는 것과 포트 여는 것을 **갈라 놓는다.**
 *     ① 지면이 없으면 먼저 임시 문지기를 PORT 에 띄운다 (503 · Retry-After)
 *     ② 그 뒤에 지면을 받아 편다
 *     ③ 문지기를 닫고 진짜 server.mjs 를 띄운다
 *   지면이 이미 있으면 ①②를 건너뛴다 — 두 번째 뜰 때는 그대로 빠르다.
 *
 * ⛔ 받기가 실패하면 **0 이 아닌 끝값으로 죽는다.** 반쯤 빈 지면을 내보내지 않는다.
 *
 * 쓰는 법 — .cloudtype/app.yaml 의 start 가 이것을 부른다
 *   node scripts/띄운다-서버.mjs
 *   node scripts/띄운다-서버.mjs --자가시험
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createServer } from 'node:http';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** 지면이 이미 쓸 만하게 있나. 「폴더가 있다」가 아니라 「첫 지면이 있다」로 본다 */
export function 지면이있나(여기 = 뿌리) {
  return fs.existsSync(path.join(여기, 'dist/index.html'));
}

/** 문지기가 돌려줄 답. 사람이 보는 글이므로 짧고 또렷하게 */
export function 기다리라는답() {
  return {
    code: 503,
    headers: { 'content-type': 'text/html; charset=utf-8', 'retry-after': '20', 'cache-control': 'no-store' },
    body: '<!doctype html><meta charset="utf-8"><title>곧 돌아옵니다</title>'
      + '<p style="font:16px/1.6 system-ui;margin:3rem auto;max-width:28rem">'
      + '서버를 새로 올리는 중입니다. 20초쯤 뒤에 다시 열어 주십시오.</p>',
  };
}

async function 한다() {
  const 포트 = Number(process.env.PORT || 3000);

  if (지면이있나()) {
    console.log('■ 지면이 이미 있다 — 바로 띄운다');
    await import('../server.mjs');
    return;
  }

  const 답 = 기다리라는답();
  const 문지기 = createServer((req, res) => { res.writeHead(답.code, 답.headers); res.end(답.body); });
  await new Promise((res, rej) => { 문지기.once('error', rej); 문지기.listen(포트, '0.0.0.0', res); });
  console.log('■ 문지기를 ' + 포트 + ' 에 띄웠다 — 받는 동안 포트는 열려 있다');

  const 품 = spawnSync(process.execPath, ['scripts/받는다-지어진지면.mjs'], { cwd: 뿌리, stdio: 'inherit' });
  if (품.status !== 0) {
    console.log('🔴 지면을 못 받았다 — 끝값 ' + 품.status + '. 반쯤 빈 지면을 내보내느니 죽는다');
    process.exit(품.status === null ? 1 : 품.status);
  }

  문지기.closeAllConnections?.();
  await new Promise((res) => 문지기.close(res));
  console.log('■ 문지기를 닫았다 — 진짜 서버로 넘긴다');
  await import('../server.mjs');
}

/* ───────────────────────── 자가시험 ───────────────────────── */
function 자가시험() {
  let 탈 = 0;
  const 본다 = (이름, 참) => { if (!참) { 탈 += 1; console.log('🔴 ' + 이름); } else console.log('✅ ' + 이름); };
  const 임시 = fs.mkdtempSync(path.join(os.tmpdir(), '띄운다-'));

  본다('지면이 없으면 false', 지면이있나(임시) === false);
  fs.mkdirSync(path.join(임시, 'dist'), { recursive: true });
  본다('폴더만 있는 것은 «있다»가 아니다', 지면이있나(임시) === false);
  fs.writeFileSync(path.join(임시, 'dist/index.html'), '<p>안녕</p>');
  본다('첫 지면이 있으면 true', 지면이있나(임시) === true);

  const 답 = 기다리라는답();
  본다('503 으로 돌려준다', 답.code === 503);
  본다('다시 오라고 적는다', 답.headers['retry-after'] === '20');
  본다('쌓아 두지 말라고 적는다', 답.headers['cache-control'] === 'no-store');
  본다('글이 한국어다', 답.body.includes('다시 열어'));

  fs.rmSync(임시, { recursive: true, force: true });
  console.log(탈 === 0 ? '\n✅ 자가시험 통과' : `\n🔴 ${탈}가지 틀렸다`);
  process.exit(탈 === 0 ? 0 : 1);
}
const 나를직접불렀나 = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (나를직접불렀나) {
  if (process.argv.includes('--자가시험')) 자가시험();
  else await 한다();
}
