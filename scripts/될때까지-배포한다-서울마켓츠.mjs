#!/usr/bin/env node
/**
 * 될때까지-배포한다-서울마켓츠.mjs — 도장이 바뀔 때까지 다시 건다.
 *
 * ── 🔴 왜 (2026-11-18 06:1x · 5번 실측) ──────────────────────────────
 * 한 번 거는 것으로는 안 된다. 배포 내역 실측 — 최근 열두 번 가운데 성공은 둘이다.
 * 빌드 기록이 한 줄도 없이 「오류」로 끝나는데, 그것은 빌드 컨테이너가 아예 뜨지
 * 못했다는 표시다. 계정 2GB 가운데 klifemap-app 1GB · web 0.5GB 가 차 있어
 * 빌드가 설 자리가 0.5GB 뿐이다. 자리가 나는 순간에만 들어간다.
 *
 * ⇒ 사람이 지켜보며 다시 누르는 일을 «없앤다». 될 때까지 이 자가 건다.
 *
 * ⛔ 「눌렀다」를 「됐다」로 읽지 않는다. 판정은 deploy-stamp.txt 의 커밋으로만 한다.
 * ⛔ 끝없이 돌지 않는다 — 횟수와 시간에 끝을 둔다. 못 하면 «못 했다»고 적는다.
 * ⚠ 다른 통(klifemap)의 배포와 겹치면 둘 다 자리를 못 잡는다. 혼자 돌린다.
 *
 * 쓰는 법
 *   node scripts/될때까지-배포한다-서울마켓츠.mjs
 *   node scripts/될때까지-배포한다-서울마켓츠.mjs --최대 8
 *   node scripts/될때까지-배포한다-서울마켓츠.mjs --selftest
 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 도장주소 = 'https://100yearmap.com/deploy-stamp.txt';

/** 인자에서 수를 읽는다. ⛔ 이상한 값이면 기본값으로 내려앉는다 — 0 번 돌지 않는다 */
export function 숫자인자(인자들, 이름, 기본) {
  const i = 인자들.indexOf(이름);
  if (i < 0 || i + 1 >= 인자들.length) return 기본;
  const n = Number(인자들[i + 1]);
  return Number.isFinite(n) && n >= 1 && n <= 30 ? Math.floor(n) : 기본;
}

/** 도장 글에서 짧은 커밋을 뽑는다. ⛔ 못 읽으면 null — 빈 글자를 「같다」로 읽지 않는다 */
export function 도장커밋(글) {
  const m = String(글 ?? '').match(/^커밋=([0-9a-f]{7,40})\s*$/m);
  return m ? m[1] : null;
}

/** 라이브가 바라던 커밋인가. ⛔ 둘 중 하나라도 없으면 false 다 */
export function 닿았나(도장글, 바라는커밋) {
  const a = 도장커밋(도장글);
  if (!a || !바라는커밋) return false;
  const b = String(바라는커밋);
  return a.startsWith(b) || b.startsWith(a);
}

/**
 * 🔴 바뀐 파일 가운데 **지은 지면이 달라지는 것**만 골라낸다.
 *
 * ⛔ 넓게 잡는다. 「이건 아마 안 닿을 것」이라고 빼지 않는다 —
 *   빼서 틀리면 옛 지면이 라이브로 나가고, 넣어서 틀려 봐야 빌드 한 번 더다.
 * ⚠ `scripts/` 는 뺀다. 짓는 자(`build-once.mjs`)는 scripts 에 있지만 그것이 바뀌면
 *   어차피 빌드를 다시 돌리는 자리다. 여기서 재는 것은 «기록 커밋이 끼었나»뿐이다.
 */
export function 지면에닿는것(파일들) {
  const 닿는다 = (f) => {
    const p = String(f).replace(/\\/g, '/');
    if (/^(src|public|content)\//.test(p)) return true;
    if (/^(astro\.config|package\.json|package-lock\.json|tsconfig)/.test(p)) return true;
    return false;
  };
  return (파일들 ?? []).filter(닿는다);
}

function 자가시험() {
  const 봄 = []; const 본다 = (이름, 참) => 봄.push({ 이름, 참 });
  /* 🔴 14:42 에 올린 묶음을 두고 「옛 판」으로 서 버린 그 자리 */
  본다('⑧ 기록 파일만 바뀐 것은 지면에 안 닿는다',
    지면에닿는것(['docs/indexnow-보낸기록.tsv', 'docs/보낸메일.tsv', 'scripts/ping-indexnow.mjs']).length === 0);
  본다('⑨ src 가 바뀌면 지면에 닿는다',
    지면에닿는것(['docs/보낸메일.tsv', 'src/pages/100y/region/[slug].astro']).length === 1);
  본다('⑩ 윈도 역슬래시 길도 가린다',
    지면에닿는것(['src\\lib\\csat-province.ts']).length === 1);
  본다('⑪ public 과 package.json 도 지면에 닿는다',
    지면에닿는것(['public/robots.txt', 'package.json']).length === 2);
  본다('⑫ 빈 목록은 안 닿는다', 지면에닿는것([]).length === 0 && 지면에닿는것(null).length === 0);
  본다('① 도장에서 커밋을 읽는다', 도장커밋('# 머리\n커밋=118c780a7\n온커밋=118c780a70ed') === '118c780a7');
  본다('② 커밋 줄이 없으면 null', 도장커밋('아무것도 없다') === null);
  본다('③ 빈 글도 null', 도장커밋('') === null && 도장커밋(null) === null);
  본다('④ 짧은 것과 긴 것이 같으면 닿았다', 닿았나('커밋=118c780a7', '118c780a70edf6b8'));
  본다('⑤ 다르면 안 닿았다', 닿았나('커밋=4822d6909', '118c780a7') === false);
  /* 🔴 도장을 못 읽은 것을 「닿았다」로 읽으면 못 나간 배포를 나갔다고 적는다 */
  본다('⑥ 못 읽으면 안 닿았다', 닿았나('', '118c780a7') === false);
  본다('⑦ 바라는 커밋이 없어도 안 닿았다', 닿았나('커밋=118c780a7', null) === false);
  본다('⑧ 인자를 읽는다', 숫자인자(['--최대', '8'], '--최대', 6) === 8);
  본다('⑨ 이상한 값은 기본값', 숫자인자(['--최대', '0'], '--최대', 6) === 6
    && 숫자인자(['--최대', 'abc'], '--최대', 6) === 6);
  본다('⑩ 인자가 없으면 기본값', 숫자인자([], '--최대', 6) === 6);
  let 깨짐 = 0;
  for (const s of 봄) if (!s.참) { console.log('🔴 ' + s.이름); 깨짐 += 1; }
  console.log(깨짐 ? '🔴 ' + 깨짐 + '가지 깨졌다' : '✅ ' + 봄.length + '가지 다 통과');
  return 깨짐 === 0;
}

if (process.argv.includes('--selftest') || process.argv.includes('--자가시험')) {
  process.exit(자가시험() ? 0 : 1);
}

const 최대 = 숫자인자(process.argv, '--최대', 6);

async function 도장읽기() {
  try {
    const r = await fetch(도장주소, { redirect: 'follow' });
    return r.ok ? await r.text() : '';
  } catch (e) { return ''; }
}

const 바라는커밋 = execFileSync('git', ['rev-parse', '--short=9', 'HEAD'],
  { cwd: 뿌리, encoding: 'utf8' }).trim();
console.log('■ 바라는 커밋 — ' + 바라는커밋);

if (닿았나(await 도장읽기(), 바라는커밋)) {
  console.log('⬜ 이미 그 커밋이 라이브다 — 아무것도 안 한다');
  process.exit(0);
}

/**
 * 🔴🔴 [2026-11-18 08:4x · 5번] **올리지 않고 여섯 번 눌러 한 시간을 버렸다.**
 * ─────────────────────────────────────────────────────────────────────
 * 지면 1,214장의 제목을 고치고 `npm run build` 를 세 번 돌렸다. 자가시험 126가지
 * 통과, 커밋·푸시도 다 닿았다. 그런데 라이브가 세 시간 전 판 그대로였고
 * 이 자가 여섯 번 걸어 여섯 번 다 「오류」로 끝났다.
 *
 * 까닭 — **2026-11-17 에 배포 방식이 바뀌었다.** 컨테이너는 이제 짓지 않는다.
 *   여기서 짓고 R2 에 올리면 컨테이너가 **받아서 편다**(astro build 1,120MB 가
 *   컨테이너 상한 1,024MB 를 넘어서 짓는 자리를 옮겼다).
 * ⇒ `npm run build` 는 내 PC 의 dist 만 바꾼다. `dist/` 는 git 에 추적되지도 않는다.
 *   **올리지 않으면 R2 에 옛 묶음이 그대로 있고, 눌러 봐야 그 옛것을 받아서 편다.**
 *
 * ⛔ 이 자는 「누르는 자」일 뿐이라 그것을 모르고 여섯 번을 눌렀다.
 *   ⇒ 누르기 «전에» 올린 것이 최신인지 본다. 아니면 **그 자리에서 선다.**
 * ⚠ 올리는 자가 도장을 만든다 — 로컬 도장의 커밋이 HEAD 면 올린 것이다.
 *   `npm run build` 는 도장을 안 만든다(build-once.mjs 에 그 줄이 없다).
 */
{
  const fs = await import('node:fs');
  const 도장길 = path.join(뿌리, 'dist', 'deploy-stamp.txt');
  let 지은커밋 = null;
  try {
    지은커밋 = (fs.readFileSync(도장길, 'utf8').match(/^커밋=(\S+)/m) ?? [])[1] ?? null;
  } catch (e) { 지은커밋 = null; }
  if (!지은커밋) {
    console.log('🔴 dist/deploy-stamp.txt 가 없다 — 아직 한 번도 «올리지» 않았다.');
    console.log('   ⇒ 먼저 이것을 돌린다 —  node scripts/올린다-지어진지면.mjs');
    process.exit(1);
  }
  if (!닿았나('커밋=' + 지은커밋, 바라는커밋)) {
    /* 🔴 [2026-11-18 · 5번] 커밋이 다르다고 **다 옛 판인 것은 아니다.**
       이 저장소는 매시 예약이 기록 파일을 저절로 커밋한다. 15분짜리 빌드를 마치면
       그 사이에 기록 커밋이 한둘 올라와 있고, HEAD 만 보면 **방금 올린 묶음이 옛 판이 된다.**
       실제로 14:42 에 올린 묶음을 두고 「옛 판이다」로 서 버렸다 —
       그 사이 바뀐 것은 `docs/*.tsv` 둘과 `scripts/ping-indexnow.mjs` 뿐이었다.
       ⇒ **지면에 닿는 것이 바뀌었나**를 본다. 안 바뀌었으면 올린 묶음이 곧 최신이다.
       ⛔ 못 가려내면(커밋을 모른다 등) 옛 판으로 친다. 모르는 것을 통과로 읽지 않는다. */
    let 바뀐것 = null;
    try {
      바뀐것 = execFileSync('git', ['diff', '--name-only', 지은커밋 + '..HEAD'],
        { cwd: 뿌리, encoding: 'utf8' }).split('\n').map((s) => s.trim()).filter(Boolean);
    } catch (e) { 바뀐것 = null; }
    const 지면이바뀌었나 = 바뀐것 === null ? true : 지면에닿는것(바뀐것).length > 0;
    if (지면이바뀌었나) {
      console.log('🔴 **올린 것이 옛 판이다** — 올린 커밋 ' + 지은커밋 + ' · 바라는 커밋 ' + 바라는커밋);
      if (바뀐것 === null) console.log('   ⚠ 무엇이 바뀌었는지 «못 가렸다» — 옛 판으로 친다');
      else for (const f of 지면에닿는것(바뀐것).slice(0, 8)) console.log('   · ' + f);
      console.log('   ⛔ 이대로 누르면 컨테이너가 «옛 묶음»을 받아서 편다. 몇 번을 눌러도 같다.');
      console.log('   ⇒ 먼저 이것을 돌린다 —  node scripts/올린다-지어진지면.mjs');
      process.exit(1);
    }
    console.log('✅ 올린 것이 최신이다 — ' + 지은커밋
      + ' (HEAD 는 ' + 바라는커밋 + ' 지만 그 사이 ' + 바뀐것.length + '개는 **지면에 안 닿는다**)');
  } else {
    console.log('✅ 올린 것이 최신이다 — ' + 지은커밋);
  }
}

for (let 회 = 1; 회 <= 최대; 회 += 1) {
  console.log('\n■ ' + 회 + '/' + 최대 + ' 번째로 건다');
  try {
    execFileSync(process.execPath, ['scripts/배포단추-누른다-서울마켓츠.mjs'],
      { cwd: 뿌리, stdio: 'inherit' });
  } catch (e) {
    console.log('⚠ 거는 데서 걸렸다 — ' + (e.message || '').slice(0, 120));
  }
  /* 한 번 걸면 4분쯤에 나간다. 9분까지 보고 안 되면 다시 건다 */
  for (let i = 1; i <= 18; i += 1) {
    await new Promise((r) => setTimeout(r, 30000));
    if (닿았나(await 도장읽기(), 바라는커밋)) {
      console.log('✅ 라이브가 바뀌었다 — ' + 바라는커밋 + ' (' + 회 + '번째 · ' + (i * 30) + '초)');
      process.exit(0);
    }
  }
  console.log('🔴 ' + 회 + '번째가 안 나갔다');
}

console.log('\n🔴 ' + 최대 + '번 걸었는데 못 나갔다. 라이브는 아직 옛 판이다.');
console.log('   ⇒ 자리가 없는 것이다. klifemap 배포가 도는 중인지 보고, 끝난 뒤 다시 건다.');
process.exit(1);
