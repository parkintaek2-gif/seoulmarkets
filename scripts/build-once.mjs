/**
 * 한 번에 **하나만** 빌드한다.
 *
 * 🔴 왜 — 2026-08-07 16:4x, 빌드가 이렇게 죽었다.
 *   `ENOENT: no such file or directory, mkdir 'dist\100y\major'`
 *   여섯 자리가 **같은 작업트리**를 쓴다. 두 자리가 동시에 `astro build` 를 돌리면
 *   한쪽이 dist 를 비우는 사이 다른 쪽이 그 안에 쓰려다 죽는다.
 *   ⚠ 더 나쁜 것은 **죽지 않고 반쯤 섞인 dist 가 남는 것**이다 —
 *     그걸로 판정하면 「나갔다/안 나갔다」가 통째로 틀린다. 오늘 그 근처까지 갔다.
 *
 * ⛔ `node node_modules/astro/bin/astro.mjs build` 를 직접 부르지 마십시오.
 *   이 파일을 부르십시오. 남이 빌드 중이면 **기다렸다가** 돕니다.
 *
 * 쓰는 법
 *   node scripts/build-once.mjs            남이 끝나면 내가 빌드한다 (최대 10분 기다림)
 *   node scripts/build-once.mjs --selftest
 */
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 여기 = path.dirname(fileURLToPath(import.meta.url));
const 뿌리 = path.resolve(여기, '..');
/** ⚠ 저장소 **안**에 둔다 — 이 자물쇠는 「이 작업트리」 이야기다. .gitignore 에 넣는다 */
export const 자물쇠 = path.join(뿌리, '.build-lock.json');
export const 오래되면분 = 12;   // 빌드가 이보다 오래 걸리면 죽은 것으로 본다

/** 자물쇠를 건 프로세스가 아직 사는가. 죽었으면 남은 자물쇠일 뿐이다. */
export function 살아있나(pid) {
  if (!pid) return true;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code === 'EPERM';
  }
}

export function 읽기() {
  if (!existsSync(자물쇠)) return null;
  try {
    const j = JSON.parse(readFileSync(자물쇠, 'utf8'));
    return { ...j, 지난분: (Date.now() - new Date(j.언제).getTime()) / 60000, 산다: 살아있나(j.pid) };
  } catch {
    return null;
  }
}

/** 지금 빌드해도 되는가. 안 되면 왜 안 되는지 말로 준다. */
export function 걸어도되나(락, 한계 = 오래되면분) {
  if (!락) return { 된다: true, 왜: '자물쇠가 없다' };
  if (!락.산다) return { 된다: true, 왜: `자물쇠를 건 pid ${락.pid} 가 죽었다` };
  if (락.지난분 >= 한계) return { 된다: true, 왜: `${락.지난분.toFixed(0)}분째라 만료로 본다` };
  return { 된다: false, 왜: `${락.자리 ?? '누군가'} 가 ${락.지난분.toFixed(1)}분째 빌드 중이다` };
}

if (process.argv.includes('--selftest')) {
  const 잰다 = [];
  const 봄 = (이름, 본것, 바란것) => {
    const 같다 = JSON.stringify(본것) === JSON.stringify(바란것);
    잰다.push(같다);
    console.log(`${같다 ? '✅' : '❌'} ${이름}${같다 ? '' : `  본 것 ${JSON.stringify(본것)} / 바란 것 ${JSON.stringify(바란것)}`}`);
  };
  봄('자물쇠가 없으면 걸어도 된다', 걸어도되나(null).된다, true);
  봄('내가 살아 있으면 못 건다', 걸어도되나({ pid: process.pid, 지난분: 1, 산다: true }).된다, false);
  봄('⛔ 죽은 임자면 걸어도 된다', 걸어도되나({ pid: 999999, 지난분: 1, 산다: false }).된다, true);
  봄('오래되면 만료로 본다', 걸어도되나({ pid: process.pid, 지난분: 30, 산다: true }).된다, true);
  봄('살아 있는 pid 를 안다', 살아있나(process.pid), true);
  봄('없는 pid 는 죽었다', 살아있나(999999), false);
  const 틀린것 = 잰다.filter((x) => !x).length;
  console.log(틀린것 ? `\n❌ ${틀린것}개 어긋났다` : `\n✅ ${잰다.length}개 다 맞다`);
  process.exit(틀린것 ? 1 : 0);
}

/* ── 실제로 빌드 ───────────────────────────────────────────────── */

const 자리 = process.env.CLAUDE_SEAT || '이름 없는 창';
const 최대기다림초 = 600;
const 때 = () => new Date().toTimeString().slice(0, 5);

let 기다린초 = 0;
while (true) {
  const r = 걸어도되나(읽기());
  if (r.된다) break;
  if (기다린초 >= 최대기다림초) {
    console.error(`⛔ ${최대기다림초 / 60}분을 기다렸는데 ${r.왜}. 사람이 봐야 한다.`);
    process.exit(1);
  }
  if (기다린초 === 0) console.log(`⏳ ${때()} ${r.왜} — 기다린다`);
  await new Promise((res) => setTimeout(res, 15000));
  기다린초 += 15;
}

writeFileSync(자물쇠, JSON.stringify({ 자리, pid: process.pid, 언제: new Date().toISOString() }));
/**
 * 🔴 [2026-09-22 · 5번] 곳간에서 «손님 자료»를 다시 뽑는다 — **빌드 «앞»에** 해야 한다.
 *
 * 한국 중대공시는 자리지킴이가 매시 곳간에 쌓는다. 그 자료를 지면이 쓰려면 누군가
 * `src/data/*.json` 을 다시 내야 하는데, **사람이 기억해서 돌리는 구조로 두지 않는다** —
 * 잊으면 지면이 며칠 전 자료를 손님에게 보이고, 아무도 모른다.
 * ⛔ 실패해도 배포를 막지 않는다(별도 프로세스·종료코드 무시) — 여섯 자리가 한 트리를 쓴다.
 *   자료가 안 갱신되면 옛 파일이 그대로 실린다. 그편이 배포가 멈추는 것보다 낫다.
 */
/* 🔴🔴 [2026-10-05 05:4x · 5번] **`build-100y-lastmod.mjs` 를 여기 붙인다.**
   라이브 사이트맵을 재 보니 100yearmap 지면 68장에 `<lastmod>` 가 없었다.
   까닭은 그 자가 **2026-08-31 뒤로 한 번도 안 돌았기 때문**이다 — 그 뒤에 낸
   지면들이 대장에 없으니 사이트맵이 날을 못 찾는다(모르면 빈칸으로 두는 자다).
   한 번 돌리니 99줄이 들어왔다.
   ⛔ 「만들어 놓고 안 쓰면 안 만든 것과 같다.」 사람이 기억해서 돌리는 구조로
     두지 않는다 — 빌드가 저절로 부르게 한다. */
for (const [이름, 자] of [
  ['한국 중대공시', 'scripts/build-korea-disclosures-feed.mjs'],
  ['백년지도 lastmod 대장', 'scripts/build-100y-lastmod.mjs'],
]) {
  try {
    const r = spawnSync(process.execPath, [자], { cwd: 뿌리, stdio: 'inherit', timeout: 120000 });
    if (r.status !== 0) console.log(`⚠ ${이름} 자료 갱신 실패 — 옛 파일로 빌드한다`);
  } catch (e) {
    console.log(`⚠ ${이름} 자료 갱신 중 오류(무시하고 계속) — ${e.message}`);
  }
}

/* 🔴 [2026-11-16 · 5번] **앞말이 스키마를 어기면 빌드가 통째로 죽는다.**
   오늘 아침에 두 편이 title 123자(한도 120)였고, 빌드가 4분을 돌고 나서야
   «한 편씩» 알려 줬다. 두 번 돌려 8분을 버렸다.
   커밋전관문은 «담긴» 파일만 보므로 작업 중인 파일은 한 번도 안 봤다.
   ⇒ 빌드 앞에서 content 전체를 1초에 본다. 걸리면 여기서 선다 —
     4분을 태우고 실패하는 것보다 1초에 막히는 것이 싸다.
   ⛔ 이 검사가 터지면(도구가 없거나 오류) 빌드를 막지 않는다. 막는 검사가 거짓이면
     일이 통째로 선다 — 2026-11-14 에 그렇게 KCW 영문 4편이 못 나갔다. */
try {
  const 앞말 = spawnSync(process.execPath, ['tools/커밋전관문.mjs', '--전부'], {
    cwd: 뿌리, stdio: 'inherit', timeout: 60000,
  });
  if (앞말.status !== 0) {
    /* 🔴 [2026-11-16] **배포 서버에서는 세우지 않는다.**
       Cloudtype 이 `npm run build` 로 이 자를 «서버에서» 부른다(.cloudtype/app.yaml).
       거기서 세우면 라이브가 통째로 안 나간다 — 내 PC 를 지키자고 손님 쪽을 끊는 꼴이다.
       서버에서는 적어만 두고 빌드는 계속한다. 어차피 깨진 글이 있으면 astro 가 멈춘다.
       ⛔ 막는 검사가 거짓이면 일이 통째로 선다 — 2026-11-14 에 그렇게 KCW 영문 4편이
         못 나갔다. 이 자의 값어치는 «내 PC 에서 4분을 아끼는 것»이지 배포를 막는 것이 아니다. */
    const 서버다 = !!(process.env.CLOUDTYPE || process.env.CI || process.env.PORT);
    console.log('⛔ 앞말이 스키마를 어긴 글이 있다 — 위에 적힌 글자 수를 줄이십시오');
    if (서버다) {
      console.log('   ⚠ 배포 서버라 세우지 않는다 — 빌드를 이어 간다');
    } else {
      console.log('   (빌드를 4분 태우지 않으려고 여기서 세웁니다)');
      process.exit(1);
    }
  }
} catch (e) {
  console.log('⚠ 앞말 검사를 못 돌렸다(무시하고 빌드한다) — ' + e.message);
}

let 결과 = 1;
try {
  console.log(`${때()} 빌드한다 (${자리})`);
  결과 = spawnSync(process.execPath, ['node_modules/astro/bin/astro.mjs', 'build'], {
    cwd: 뿌리,
    stdio: 'inherit',
  }).status ?? 1;
} finally {
  // ⚠ 내 자물쇠만 푼다. 만료로 남이 가져갔을 수 있다
  const 지금락 = 읽기();
  if (지금락 && 지금락.pid === process.pid) unlinkSync(자물쇠);
}
/**
 * 🔴 2026-09-02(3번, GEO) — astro build 뒤 100yearmap 지면마다 .md 판을 낸다.
 * ⛔⛔ 이 저장소를 여섯 자리가 같이 쓴다 — 여기서 던지면 **전 유닛 배포가 막힌다.**
 *   그래서 별도 프로세스로 돌리고 종료코드를 무시한다. 실패해도 astro 빌드 결과(결과)만
 *   이 스크립트의 exit code 를 정한다 — .md 가 안 나가도 배포는 막지 않는다.
 */
if (결과 === 0) {
  try {
    const md결과 = spawnSync(process.execPath, ['scripts/build-100y-markdown.mjs'], {
      cwd: 뿌리,
      stdio: 'inherit',
      timeout: 60000,
    });
    if (md결과.status !== 0) console.log('⚠ 100y 마크다운 판 생성 실패 — 배포는 계속한다(.html은 정상)');
  } catch (e) {
    console.log(`⚠ 100y 마크다운 판 생성 중 오류(무시하고 계속) — ${e.message}`);
  }
}

/**
 * 🔴 2026-09-02(6번, GEO [5번→6번] ②) — astro build 뒤 SeoulMarkets 기사마다 .md 판을 낸다.
 * ⛔⛔ 위 100y 블록과 같은 이유로 별도 프로세스·종료코드 무시 — .md가 안 나가도 배포는 막지 않는다.
 */
if (결과 === 0) {
  try {
    const md결과 = spawnSync(process.execPath, ['scripts/build-seoulmarkets-markdown.mjs'], {
      cwd: 뿌리,
      stdio: 'inherit',
      timeout: 60000,
    });
    if (md결과.status !== 0) console.log('⚠ SeoulMarkets 마크다운 판 생성 실패 — 배포는 계속한다(.html은 정상)');
  } catch (e) {
    console.log(`⚠ SeoulMarkets 마크다운 판 생성 중 오류(무시하고 계속) — ${e.message}`);
  }
}

/**
 * 🔴 2026-09-03(5번) — KCW 기사마다 .md 판을 낸다.
 *   같은 GEO 지시를 3번·6번은 했는데 **5번만 빠져 있었다.** 오늘 낸 여섯 편의 .md 판이
 *   라이브에서 전부 404 인 것을 재서 알았다.
 * ⛔ 위 두 블록과 같은 이유로 종료코드 무시 — .md 가 안 나가도 배포는 막지 않는다.
 */
if (결과 === 0) {
  try {
    const kcw결과 = spawnSync(process.execPath, ['scripts/build-kcw-markdown.mjs'], {
      cwd: 뿌리,
      stdio: 'inherit',
      timeout: 60000,
    });
    if (kcw결과.status !== 0) console.log('⚠ KCW 마크다운 판 생성 실패 — 배포는 계속한다(.html은 정상)');
  } catch (e) {
    console.log(`⚠ KCW 마크다운 판 생성 중 오류(무시하고 계속) — ${e.message}`);
  }
}

/**
 * 🔴🔴 2026-10-28(5번) — 사장님 「케이컬쳐와이어도 철저하게 검색색인, seo, geo 맞춤으로 운용해」
 *   바로 위에서 **영문 기사**의 평문 판을 내면서 한국어 K-Review 는 빠져 있었다.
 *   라이브에서 재 보니 `/ko/review/<주소>.md` 가 404 였다 — 2026-09-03 에 메운 구멍이
 *   한국어 쪽에 그대로 다시 나 있었던 것이다.
 * ⛔ 위와 같은 이유로 종료코드는 무시한다 — 평문 판이 안 나가도 지면은 멀쩡하다.
 */
if (결과 === 0) {
  try {
    const 리뷰결과 = spawnSync(process.execPath, ['scripts/build-kcw-review-markdown.mjs'], {
      cwd: 뿌리,
      stdio: 'inherit',
      timeout: 60000,
    });
    if (리뷰결과.status !== 0) console.log('⚠ K-Review 평문 판 생성 실패 — 배포는 계속한다(.html은 정상)');
  } catch (e) {
    console.log(`⚠ K-Review 평문 판 생성 중 오류(무시하고 계속) — ${e.message}`);
  }
}

/**
 * 🔴 2026-09-02(6번, GEO [5번→6번] ③) — 표 있는 기사마다 Dataset 구조화데이터가 실제로 나갔는지 잰다.
 * ⛔⛔ 위 블록들과 같은 이유로 별도 프로세스·종료코드 무시 — 알림용일 뿐 배포를 막지 않는다.
 */
if (결과 === 0) {
  try {
    spawnSync(process.execPath, ['scripts/check-seoulmarkets-dataset-schema.mjs'], {
      cwd: 뿌리,
      stdio: 'inherit',
      timeout: 60000,
    });
  } catch (e) {
    console.log(`⚠ Dataset 구조화데이터 확인 중 오류(무시하고 계속) — ${e.message}`);
  }
}

/**
 * 🔴 2026-09-03(5번) — **카드 대체글이 «조용히» 벌 이름으로 떨어져 있었다.**
 *   `KcwCardnews.astro` 는 지면 머리글을 `src/data/wikitip-headlines.json` 에서 찾아
 *   카드 대체글로 쓴다. 그 표는 «지어진 지면»에서 읽어 만드는데, **아무도 다시 만들지
 *   않고 있었다.** 그래서 지면 97장에서 멈춰 있었고, 그 뒤에 생긴 14장은 머리글이 없어
 *   대체글이 벌 이름으로 떨어졌다 — `/weeks-counter` 의 카드가 「counter — card 1 of 5」였다.
 *   ⛔ 그 부품의 머리글이 스스로 적어 둔 말이 이것이다 —
 *      「대체글이 없는 것보다 나쁜 것은 «아무 뜻 없는 대체글»이다」. 구글 이미지가 그 글자를 읽는다.
 *   ⚠ 이 표는 dist 에서 읽으므로 **빌드 뒤**에 만들어야 하고, 그러면 «다음» 빌드에 실린다.
 *      새 지면은 한 걸음 늦게 반영된다 — 그것이 이 자리의 한계이고, 재서 아는 편이 낫다.
 * ⛔⛔ 위 블록들과 같은 이유로 별도 프로세스·종료코드 무시 — 배포를 막지 않는다.
 */
if (결과 === 0) {
  try {
    spawnSync(process.execPath, ['scripts/build-kcw-headlines.mjs'], {
      cwd: 뿌리,
      stdio: 'inherit',
      timeout: 120000,
    });
  } catch (e) {
    console.log(`⚠ KCW 머리글 표 갱신 중 오류(무시하고 계속) — ${e.message}`);
  }
}

console.log(결과 === 0 ? `✅ ${때()} 빌드 끝` : `⛔ ${때()} 빌드 실패`);
process.exit(결과);
