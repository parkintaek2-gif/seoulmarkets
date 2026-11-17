#!/usr/bin/env node
/**
 * 배포한다-서울마켓츠.mjs
 *   서울마켓츠(세 사이트를 함께 내는 서버) 운영 배포를 다시 올린다.
 *
 * ── 왜 이 파일이 있나 (2026-11-03) ────────────────────────────────
 *   윈도에서 노드가 `npx.cmd` 를 못 띄운다(EINVAL). ctype 본체(.js)를 노드로
 *   직접 띄우는 것이 이 저장소의 확립된 방식이다 — 심는다-다리열쇠.mjs 와 같다.
 *
 * ⛔ 서 있는 폴더와 `-t` 가 짝이어야 한다 — dataeconomics 폴더 / web.
 *
 * 🔴🔴🔴 이 자는 «새 커밋을 가져오지 않는다» (2026-11-17 15:5x · 5번)
 *   이 자가 부르는 `ctype update` 는 저장된 설정이 아니라 **직전 배포의 설정**으로
 *   같은 이미지를 다시 띄울 뿐이다. 새 커밋은 안 온다.
 *   ⇒ 11/17 에 1번이 네 번(10:50·12:20·13:15·15:15) 「영문 3편이 아직 404 입니다」를
 *     올렸고, 15:33 에 내가 이 자를 불러 라이브 도장이 ee2464753(05:44)에 그대로 섰다.
 *     06:36 에도 같은 잘못이 있었다(docs/세션간-메모.md).
 *   ⛔ **새 커밋을 내보낼 때 이 자를 부르지 않는다** —
 *     `node scripts/배포단추-누른다-서울마켓츠.mjs` 를 쓴다(대시보드 「배포하기」).
 *   ✅ 이 자는 «같은 판을 다시 띄울 때»만 쓴다 (통이 죽었을 때 되살리기).
 *   ✅ 닿았나는 도장으로 판정한다 — curl https://seoulmarkets.com/deploy-stamp.txt
 *
 * 쓰는 법
 *   node scripts/배포한다-서울마켓츠.mjs            (같은 판 다시 띄우기)
 *   node scripts/배포단추-누른다-서울마켓츠.mjs      (새 커밋 내보내기 — 이쪽이다)
 */
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ctype자리 } from './심는다-다리열쇠.mjs';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 짝 = '@parkintaek2/seoulmarkets:main';
const 대상 = 'web';

const 위치 = ctype자리();
if (!위치) {
  console.log('🔴 ctype 본체를 찾지 못했다');
  process.exit(1);
}

/* 🔴 [2026-11-17 · 5번] **지어 올린 것이 있는지 먼저 본다.**
 *   컨테이너는 더는 짓지 않는다 — R2 의 `지면/최신.json` 을 받아서 편다.
 *   안 올리고 배포하면 컨테이너가 10분을 기다리다 죽는다. 그 10분을 여기서 아낀다. */
try {
  const { execFileSync } = await import('node:child_process');
  const 커밋 = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: 뿌리, encoding: 'utf8' }).trim();
  const 창고 = await import('../src/lib/store.mjs');
  const { 쪽지풀기 } = await import('./올린다-지어진지면.mjs');
  const 쪽지 = 쪽지풀기((await 창고.get('지면/최신.json'))?.toString?.('utf8'));
  if (!쪽지 || 쪽지.커밋 !== 커밋) {
    console.log('🔴 이 커밋으로 지은 지면이 R2 에 없다 — ' + 커밋.slice(0, 9));
    console.log('   올라가 있는 것 — ' + (쪽지?.커밋?.slice(0, 9) ?? '(쪽지를 못 읽었다)'));
    console.log('   ⇒ 먼저 돌린다:  node scripts/올린다-지어진지면.mjs');
    process.exit(1);
  }
  console.log('■ 지어 올린 것 확인 — ' + (쪽지.크기 / 1024 / 1024).toFixed(0) + 'MB');
} catch (e) {
  console.log('⚠ 올라간 것을 못 봤다(그래도 배포는 건다) — ' + e.message);
}

console.log('■ 재배포를 시작한다 — ' + 대상 + ' / ' + 짝);
const 아이 = spawn(process.execPath, [위치, 'update', 대상, '-t', 짝], {
  cwd: 뿌리, stdio: 'inherit',
});
아이.on('close', (번호) => {
  console.log(번호 === 0 ? '\n✅ 재배포 명령이 받아들여졌다' : '\n🔴 실패 — 종료 번호 ' + 번호);
  process.exit(번호 === 0 ? 0 : 1);
});
