#!/usr/bin/env node
/**
 * 올린다-지어진지면.mjs — **여기서 짓고, 지은 것을 R2 에 올린다.**
 *
 * ── 🔴🔴 왜 (2026-11-17 · 5번) ──────────────────────────────────────────
 * 서울마켓츠 배포가 열아홉 시간 동안 열두 번 내리 「오류」였다. 재서 알아낸 것 —
 *
 *     astro build 가 실제로 쓰는 메모리   1,120MB  (이 PC 실측 · 220초에 성공)
 *     힙 상한을 400MB 로 조여도           1,023MB  (100MB 밖에 안 준다)
 *     컨테이너에 줄 수 있는 끝             1,024MB  (계정 2GB 중 케이라이프맵이 1GB)
 *
 * ⇒ **올리는 것으로는 못 넘긴다.** 2026-08-04 에 0.25→0.5, 11-16 에 0.5→1.0→0.5→0.75.
 *   다섯 번 올렸다 내렸다 했고 그때마다 다음 번에 또 막혔다.
 *   지면은 17장에서 16,143장이 됐고 앞으로도 는다. 메모리를 올리는 길은 끝났다.
 *
 * ⇒ **짓는 자리를 옮긴다.** 컨테이너는 짓지 않고 받아서 편다.
 *   (GitHub Actions 는 2026-08-14 에 꺼 놓아서 못 쓴다 — 켜려면 저장된 열쇠가 필요하다)
 *
 * ── 하는 일 ────────────────────────────────────────────────────────────
 *   ① npm run build 로 dist/ 를 짓는다 (build-once 가 자물쇠를 건다)
 *   ② dist/deploy-stamp.txt 에 «지금 커밋»을 찍는다
 *   ③ dist 를 tar.gz 로 묶어 R2 에 올린다 — `지면/<커밋>.tar.gz`
 *   ④ `지면/최신.json` 에 {커밋, 키, 크기} 를 적는다 ← 컨테이너가 이것부터 본다
 *   ⑤ 묵은 묶음을 지운다 (최근 3개만 남긴다)
 *
 * ⛔ 작업트리가 깨끗하지 않으면 멈춘다 — 커밋 안 된 것으로 지으면 라이브와 저장소가 갈린다.
 *
 * 쓰는 법
 *   node scripts/올린다-지어진지면.mjs
 *   node scripts/올린다-지어진지면.mjs --짓지않고          이미 있는 dist 를 올리기만 한다
 *   node scripts/올린다-지어진지면.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const 최신키 = '지면/최신.json';
export const 남길개수 = 3;

/** 묶음 키를 커밋에서 만든다. 한 곳에서만 만들어 양쪽이 어긋나지 않게 한다 */
export function 묶음키(커밋) {
  if (!/^[0-9a-f]{40}$/.test(String(커밋 ?? ''))) throw new Error('커밋이 40자가 아니다');
  return `지면/${커밋}.tar.gz`;
}

/** 최신 쪽지를 읽어 쓸 수 있는 꼴인지 가린다. 못 믿을 것은 null 로 돌려준다 */
export function 쪽지풀기(글) {
  let o = null;
  try { o = JSON.parse(String(글 ?? '')); } catch { return null; }
  if (!o || typeof o !== 'object') return null;
  if (!/^[0-9a-f]{40}$/.test(String(o.커밋 ?? ''))) return null;
  if (typeof o.키 !== 'string' || !o.키) return null;
  if (!Number.isFinite(o.크기) || o.크기 <= 0) return null;
  return { 커밋: o.커밋, 키: o.키, 크기: o.크기, 때: o.때 ?? null };
}

/** 묶음 키 목록에서 **지울 것**을 고른다 — 새것 N개는 남긴다 */
export function 지울것(키들, 남길 = 남길개수, 지키는키 = null) {
  const 쓸것 = (키들 ?? []).filter((k) => /^지면\/[0-9a-f]{40}\.tar\.gz$/.test(k));
  const 늦은순 = [...쓸것].sort().reverse();           // 이름이 아니라 «들어온 순»을 모르니 이름순
  const 남는것 = new Set(늦은순.slice(0, 남길));
  if (지키는키) 남는것.add(지키는키);
  return 쓸것.filter((k) => !남는것.has(k));
}

function 깨끗한가() {
  const 더러움 = execFileSync('git', ['status', '--porcelain'], { cwd: 뿌리, encoding: 'utf8' })
    .split(/\r?\n/)
    .filter((줄) => 줄.trim())
    /* 자동으로 쌓이는 기록은 봐준다 — 지면을 바꾸지 않는다 */
    .filter((줄) => !/\s(docs|logs|archive|tmp)\//.test(줄))
    .filter((줄) => !/\.log$|찍은목록\.json$|\.tsv$/.test(줄));
  return 더러움;
}

async function 한다() {
  const 짓지않고 = process.argv.includes('--짓지않고');
  const 커밋 = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: 뿌리, encoding: 'utf8' }).trim();
  const 더러움 = 깨끗한가();
  if (더러움.length) {
    console.log('🔴 커밋 안 된 것이 ' + 더러움.length + '개 있다 — 먼저 커밋·푸시한다');
    for (const 줄 of 더러움.slice(0, 10)) console.log('   ' + 줄);
    process.exit(1);
  }
  const 원격 = execFileSync('git', ['ls-remote', 'origin', 'main'], { cwd: 뿌리, encoding: 'utf8' })
    .trim().split(/\s+/)[0];
  if (원격 !== 커밋) {
    console.log('🔴 올린 것과 여기가 다르다 — 먼저 push 한다');
    console.log('   여기 ' + 커밋.slice(0, 9) + ' · 원격 ' + String(원격).slice(0, 9));
    process.exit(1);
  }
  console.log('■ 커밋 ' + 커밋.slice(0, 9) + ' 로 짓는다');

  if (!짓지않고) {
    const 품 = spawnSync(process.execPath, ['scripts/build-once.mjs'], {
      cwd: 뿌리, stdio: 'inherit',
      env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=2048' },
    });
    if (품.status !== 0) { console.log('🔴 빌드가 실패했다 — 끝값 ' + 품.status); process.exit(1); }
  }

  /* ② 도장. ⛔ 손으로 고치지 않는다 — 라이브가 어느 커밋인지 가리는 단 하나의 자다 */
  const 도장 = [
    '# 배포 도장 — 이 파일이 라이브에 그대로 보이면 그 배포가 «정말» 나간 것이다.',
    '# 만든 자: scripts/올린다-지어진지면.mjs  (2026-11-17 5번)',
    '# ⛔ 손으로 고치지 마십시오.',
    '커밋=' + 커밋.slice(0, 9),
    '온커밋=' + 커밋,
    '찍은때(KST)=' + new Date().toLocaleString('sv-SE').replace('T', ' '),
    '',
  ].join('\n');
  fs.writeFileSync(path.join(뿌리, 'dist/deploy-stamp.txt'), 도장);

  const 장수 = Number(
    spawnSync('sh', ['-c', 'find dist -name "*.html" | wc -l'], { cwd: 뿌리, encoding: 'utf8' })
      .stdout?.trim() || 0,
  );
  if (장수 < 1000) { console.log('🔴 지면이 ' + 장수 + '장뿐이다 — 올리지 않는다'); process.exit(1); }
  console.log('■ 지면 ' + 장수 + '장');

  /* ③ 묶는다 */
  const 묶음길 = path.join(뿌리, 'dist.tar.gz');
  fs.rmSync(묶음길, { force: true });
  const 묶 = spawnSync('tar', ['-czf', 'dist.tar.gz', 'dist'], { cwd: 뿌리, stdio: 'inherit' });
  if (묶.status !== 0) { console.log('🔴 묶지 못했다'); process.exit(1); }
  const 크기 = fs.statSync(묶음길).size;
  console.log('■ 묶었다 — ' + (크기 / 1024 / 1024).toFixed(0) + 'MB');

  const 창고 = await import('../src/lib/store.mjs');
  if (!창고.remoteEnabled) { console.log('🔴 R2 가 꺼져 있다 — .env 의 ARCHIVE_S3_* 를 본다'); process.exit(1); }

  const 키 = 묶음키(커밋);
  await 창고.원격에올린다(키, fs.readFileSync(묶음길), 'application/gzip');
  console.log('■ 올렸다 — ' + 키);

  /* ④ 쪽지는 «묶음을 올린 뒤에» 쓴다. 순서를 바꾸면 없는 묶음을 가리키는 쪽지가 생긴다 */
  await 창고.원격에올린다(
    최신키,
    Buffer.from(JSON.stringify({ 커밋, 키, 크기, 때: new Date().toISOString() }, null, 2)),
    'application/json',
  );
  console.log('■ 쪽지를 고쳤다 — ' + 최신키);
  fs.rmSync(묶음길, { force: true });

  /* ⑤ 묵은 것을 치운다 */
  try {
    const 있는것 = await 창고.list('지면/');
    const 지울 = 지울것(있는것, 남길개수, 키);
    for (const k of 지울) { await 창고.del(k); console.log('■ 묵은 묶음을 지웠다 — ' + k); }
  } catch (e) {
    console.log('⚠ 묵은 것을 못 치웠다(배포에는 지장 없다) — ' + e.message);
  }

  console.log('\n✅ 올렸다. 이제 배포한다 — node scripts/배포한다-서울마켓츠.mjs');
}

/* ───────────────────────── 자가시험 ───────────────────────── */
function 자가시험() {
  let 탈 = 0;
  const 본다 = (이름, 참) => { if (!참) { 탈 += 1; console.log('🔴 ' + 이름); } else console.log('✅ ' + 이름); };
  const a = 'a'.repeat(40), b = 'b'.repeat(40), c = 'c'.repeat(40), d = 'd'.repeat(40);

  본다('묶음키는 커밋으로 만든다', 묶음키(a) === '지면/' + a + '.tar.gz');
  let 던졌나 = false;
  try { 묶음키('짧다'); } catch { 던졌나 = true; }
  본다('40자가 아니면 던진다', 던졌나);

  본다('쪽지가 제대로면 푼다', 쪽지풀기(JSON.stringify({ 커밋: a, 키: '지면/x', 크기: 5 }))?.커밋 === a);
  본다('커밋이 이상하면 null', 쪽지풀기(JSON.stringify({ 커밋: 'xx', 키: 'k', 크기: 5 })) === null);
  본다('크기가 0이면 null', 쪽지풀기(JSON.stringify({ 커밋: a, 키: 'k', 크기: 0 })) === null);
  본다('JSON 이 아니면 null', 쪽지풀기('{{{') === null);
  본다('빈 것도 null', 쪽지풀기(null) === null);

  const 키들 = [a, b, c, d].map((x) => '지면/' + x + '.tar.gz');
  const 지울 = 지울것(키들, 3);
  본다('넷 중 하나만 지운다', 지울.length === 1);
  본다('남길 것은 이름 큰 셋', !지울.includes('지면/' + d + '.tar.gz'));
  본다('지키는 키는 안 지운다', 지울것(키들, 3, '지면/' + a + '.tar.gz').length === 0);
  본다('다른 이름은 건드리지 않는다', 지울것(['지면/최신.json', ...키들], 3).every((k) => k.endsWith('.tar.gz')));
  본다('빈 목록도 안 죽는다', 지울것(null).length === 0);

  console.log(탈 === 0 ? '\n✅ 자가시험 통과' : `\n🔴 ${탈}가지 틀렸다`);
  process.exit(탈 === 0 ? 0 : 1);
}

/* ⛔ **불려 들어왔을 때는 아무것도 하지 않는다.**
 *   `받는다-지어진지면.mjs` 가 `쪽지풀기` 하나를 쓰려고 이 파일을 import 한다.
 *   이 줄이 없으면 컨테이너가 받으려다 «짓기»를 시작한다 — 고치려던 바로 그 일이다. */
const 나를직접불렀나 = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (나를직접불렀나) {
  if (process.argv.includes('--자가시험')) 자가시험();
  else await 한다();
}
