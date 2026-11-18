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
 *   node scripts/시험-흘려올리기.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { realpathSync } from 'node:fs';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 시험키 = '지면/시험-흘림.tar.gz';

/**
 * 🔴🔴 **들여오기만 해도 밖으로 나가는 자가 되지 않는다.**
 *
 * [2026-11-18] 한 시간 사이에 같은 자리에 두 번 빠졌다 —
 * `ping-indexnow.mjs` 를 들여왔더니 통보 8,108장이 실제로 나갔고,
 * `될때까지-배포한다-서울마켓츠.mjs` 를 들여왔더니 배포 단추가 눌렸다.
 * **이 자는 R2 에 쓴다.** 들여오는 것만으로 창고에 374MB 가 올라가면 안 된다.
 *
 * ⛔ 「아무도 안 들여올 자」는 기준이 아니다 — **들여와지느냐가 아니라 밖에 닿느냐**가 기준이다.
 * ⚠ 이름을 형제들과 같은 `직접불렸나` 로 맞춘다 — 한 낱말로 저장소를 훑을 수 있게.
 *   ⛔ 그 함수를 형제 파일에서 «들여오지» 않는다. 들여오는 것을 막으려고 만든 문을
 *     들여와서 쓰면 그 파일이 또 도는지를 이 파일이 떠안게 된다.
 */
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

function 자가시험() {
  const 봄 = []; const 본다 = (이름, 참) => 봄.push({ 이름, 참 });
  본다('① 제 손으로 불리면 참이다', 직접불렸나(fileURLToPath(import.meta.url)) === true);
  본다('② 남이 들여오면 거짓이다', 직접불렸나('/어딘가/다른자.mjs') === false);
  본다('③ ⛔ 부른 길이 없으면 거짓이다 (들여온 것이다)', 직접불렸나(null) === false);
  본다('④ ⛔ 빈 글자도 거짓이다', 직접불렸나('') === false);
  let 깨짐 = 0;
  for (const s of 봄) if (!s.참) { console.log('🔴 ' + s.이름); 깨짐 += 1; }
  console.log(깨짐 ? '🔴 ' + 깨짐 + '가지 깨졌다' : '✅ ' + 봄.length + '가지 다 통과');
  return 깨짐 === 0;
}

if (process.argv.includes('--자가시험') || process.argv.includes('--selftest')) {
  process.exit(자가시험() ? 0 : 1);
}

/* ⛔ 여기서부터는 **직접 불렸을 때만** 돈다 */
if (직접불렸나()) {
  const 파일길 = process.argv[2] || path.join(뿌리, 'dist.tar.gz');

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

  console.log('✅ 올라갔다 — ' + ((Date.now() - 샜다) / 1000).toFixed(0) + '초');

  /* 🔴 시험 자국을 라이브 창고에 남기지 않는다 */
  try {
    await 창고.del(시험키);
    console.log('■ 시험 자국을 지웠다 — ' + 시험키);
  } catch (e) {
    console.log('⚠ 시험 자국을 못 지웠다 — ' + 시험키 + ' · ' + String(e?.message ?? e).slice(0, 120));
    console.log('   손으로 지워야 한다. 그대로 두면 묵은 묶음 치우는 자가 세는 수가 달라진다.');
  }
}
