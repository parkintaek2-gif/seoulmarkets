#!/usr/bin/env node
/**
 * 받는다-지어진지면.mjs — **컨테이너는 짓지 않는다. 지어 놓은 것을 받아서 편다.**
 *   짝이 되는 자: `scripts/올린다-지어진지면.mjs` (이 PC 에서 짓고 R2 에 올린다)
 *
 * ── 🔴🔴 왜 (2026-11-17 · 5번) ──────────────────────────────────────────
 * 서울마켓츠 배포가 열아홉 시간 동안 열두 번 내리 「오류」였다. 재서 알아낸 것 —
 *
 *     astro build 가 실제로 쓰는 메모리   1,120MB  (실측 · 220초에 성공)
 *     힙 상한을 400MB 로 조여도           1,023MB
 *     컨테이너에 줄 수 있는 끝             1,024MB  (계정 2GB 중 케이라이프맵이 1GB)
 *
 * ⇒ 메모리를 올리는 길은 끝났다. 2026-08-04 부터 다섯 번 올렸다 내렸다 했고
 *   그때마다 다음 번에 또 막혔다. 지면은 17장 → 16,143장이고 앞으로도 는다.
 *
 * ── ⛔ 안전하게 실패한다 ────────────────────────────────────────────────
 * 받을 것이 «지금 배포하는 커밋»이 아니면 **0 이 아닌 끝값으로 죽는다.**
 *   → Cloudtype 배포가 실패하고 **옛 통이 그대로 돈다.** 빈 사이트가 나가는 일은 없다.
 * ⚠ 틀린 지면을 내보내는 것보다 어제 지면이 그대로 도는 편이 낫다.
 *
 * 쓰는 법
 *   node scripts/받는다-지어진지면.mjs          (.cloudtype/app.yaml 의 build 가 부른다)
 *   node scripts/받는다-지어진지면.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 기다리는분 = 10;

/** 지금 이 작업트리가 서 있는 커밋. git 이 없으면 null */
export function 내커밋(여기 = 뿌리) {
  try { return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: 여기, encoding: 'utf8' }).trim(); }
  catch { return null; }
}

/** 편 것이 쓸 만한가. 틀린 데를 «모두» 적어 돌려준다 — 하나씩 고치며 다시 돌지 않게 */
export function 편것을본다({ 있는파일, 도장, 장수, 커밋 }) {
  const 탈 = [];
  for (const 길 of ['dist/index.html', 'dist/deploy-stamp.txt']) {
    if (!있는파일.includes(길)) 탈.push(길 + ' 이 없다');
  }
  if (!String(도장 ?? '').includes(String(커밋 ?? '').slice(0, 9))) {
    탈.push('도장의 커밋이 이 배포와 다르다 — ' + (String(도장 ?? '').match(/커밋=\S+/)?.[0] ?? '(없음)'));
  }
  if (!(장수 >= 1000)) 탈.push(`지면이 ${장수}장뿐이다`);
  return 탈;
}

async function 한다() {
  const 커밋 = 내커밋();
  if (!커밋) { console.log('🔴 git 을 못 불렀다 — 어느 커밋을 받아야 하는지 가릴 수 없다'); process.exit(1); }
  console.log('■ 이 배포의 커밋 — ' + 커밋.slice(0, 9));

  const 창고 = await import('../src/lib/store.mjs');
  const 올림 = await import('./올린다-지어진지면.mjs').catch(() => null);
  if (!창고.remoteEnabled) {
    console.log('🔴 R2 가 꺼져 있다 — ARCHIVE_S3_* 가 컨테이너에 안 들어왔다');
    console.log('   .cloudtype/app.yaml 의 env 블록을 본다. 저장(stage secret)과 주입은 별개다');
    process.exit(1);
  }

  const 끝날때 = Date.now() + 기다리는분 * 60 * 1000;
  let 쪽지 = null;
  for (let 회 = 1; ; 회 += 1) {
    let 글 = null;
    try { 글 = await 창고.get('지면/최신.json'); } catch (e) { console.log('⚠ ' + e.message); }
    const 본것 = 올림?.쪽지풀기 ? 올림.쪽지풀기(글?.toString?.('utf8') ?? 글) : null;
    if (본것 && 본것.커밋 === 커밋) { 쪽지 = 본것; break; }
    if (Date.now() > 끝날때) {
      console.log('🔴 ' + 기다리는분 + '분을 기다려도 이 커밋으로 지은 지면이 안 올라왔다');
      console.log('   쪽지에 적힌 커밋 — ' + (본것?.커밋 ?? '(쪽지를 못 읽었다)'));
      console.log('   ⇒ 배포 앞에 `node scripts/올린다-지어진지면.mjs` 를 돌린다');
      console.log('   ⛔ 여기서 죽는 것이 맞다. 옛 통이 그대로 돌고 빈 사이트가 안 나간다');
      process.exit(1);
    }
    if (회 === 1) console.log('⏳ 아직 안 올라왔다 — 짓는 중인 듯하다. 기다린다');
    await new Promise((r) => setTimeout(r, 20000));
  }
  console.log('■ 맞는 묶음을 찾았다 — ' + (쪽지.크기 / 1024 / 1024).toFixed(0) + 'MB');

  const 묶음길 = path.join(뿌리, 'dist.tar.gz');
  const 받은 = await 창고.원격을파일로받는다(쪽지.키, 묶음길);
  if (받은 === null) { console.log('🔴 쪽지가 가리키는 묶음이 없다 — ' + 쪽지.키); process.exit(1); }
  console.log('■ 받았다 — ' + (받은 / 1024 / 1024).toFixed(0) + 'MB');
  if (받은 !== 쪽지.크기) {
    console.log(`🔴 크기가 다르다 — 쪽지 ${쪽지.크기} · 받은 것 ${받은}`);
    process.exit(1);
  }

  fs.rmSync(path.join(뿌리, 'dist'), { recursive: true, force: true });
  const 품 = spawnSync('tar', ['-xzf', 'dist.tar.gz'], { cwd: 뿌리, stdio: 'inherit' });
  if (품.status !== 0) { console.log('🔴 묶음을 못 폈다 — 끝값 ' + 품.status); process.exit(1); }
  fs.rmSync(묶음길, { force: true });

  /* 편 것을 «다시 보고» 확인한다 — 펴는 것과 지면이 있는 것은 다른 일이다 */
  const 있는파일 = ['dist/index.html', 'dist/deploy-stamp.txt'].filter((p) => fs.existsSync(path.join(뿌리, p)));
  let 도장 = '';
  try { 도장 = fs.readFileSync(path.join(뿌리, 'dist/deploy-stamp.txt'), 'utf8'); } catch {}
  const 장수 = Number(
    spawnSync('sh', ['-c', 'find dist -name "*.html" | wc -l'], { cwd: 뿌리, encoding: 'utf8' })
      .stdout?.trim() || 0,
  );
  const 탈 = 편것을본다({ 있는파일, 도장, 장수, 커밋 });
  if (탈.length) { for (const t of 탈) console.log('🔴 ' + t); process.exit(1); }
  console.log(`✅ 지어진 지면을 폈다 — ${장수}장 · ${도장.match(/커밋=\S+/)?.[0]}`);
}

/* ───────────────────────── 자가시험 ───────────────────────── */
function 자가시험() {
  let 탈 = 0;
  const 본다 = (이름, 참) => { if (!참) { 탈 += 1; console.log('🔴 ' + 이름); } else console.log('✅ ' + 이름); };
  const 커밋 = 'abc123def'.padEnd(40, '0');
  const 좋은도장 = '커밋=' + 커밋.slice(0, 9) + '\n';
  const 둘 = ['dist/index.html', 'dist/deploy-stamp.txt'];

  본다('다 맞으면 탈이 없다', 편것을본다({ 있는파일: 둘, 도장: 좋은도장, 장수: 16143, 커밋 }).length === 0);
  본다('지면이 적으면 잡는다', 편것을본다({ 있는파일: 둘, 도장: 좋은도장, 장수: 7, 커밋 }).length === 1);
  본다('파일이 없으면 잡는다', 편것을본다({ 있는파일: [], 도장: 좋은도장, 장수: 16143, 커밋 }).length === 2);
  본다('도장이 다르면 잡는다', 편것을본다({ 있는파일: 둘, 도장: '커밋=deadbeef1', 장수: 16143, 커밋 }).length === 1);
  본다('도장이 없어도 잡는다', 편것을본다({ 있는파일: 둘, 도장: null, 장수: 16143, 커밋 }).length === 1);
  본다('여러 탈을 한꺼번에 적는다', 편것을본다({ 있는파일: [], 도장: null, 장수: 0, 커밋 }).length === 4);

  console.log(탈 === 0 ? '\n✅ 자가시험 통과' : `\n🔴 ${탈}가지 틀렸다`);
  process.exit(탈 === 0 ? 0 : 1);
}

/* ⛔ 불려 들어왔을 때는 아무것도 하지 않는다 — 짝인 「올린다」와 같은 규칙이다 */
const 나를직접불렀나 = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (나를직접불렀나) {
  if (process.argv.includes('--자가시험')) 자가시험();
  else await 한다();
}
