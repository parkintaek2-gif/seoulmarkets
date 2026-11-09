#!/usr/bin/env node
/**
 * check-새글-말투.mjs — 지금 새로 쓴 글에 순한글·조어·번역투가 들어갔는지 검사한다.
 *
 * ── 왜 만드나 (2026-11-09 · 사장님) ──────────────────────────────────
 * 「**너 순한글, 조어, 번역투 쓰지말라고 했지. 어제 지침까지 리스트로 만들었지.
 *   지침은 지키라고 있는 거지, 기록용으로 있는 게 아니야**」
 *
 * 금지어 목록을 155개까지 늘려 놓고도 내가 쓴 문서 다섯 개를 검사해 보니
 * 목록에 없던 말이 49번 들어 있었다. 목록을 늘리는 것과 지키는 것은 다른 일이다.
 * 지키게 하려면 글을 쓸 때마다 저절로 돌아야 한다.
 *
 * ── 새로 쓴 줄만 본다 ────────────────────────────────────────────────
 * 저장소 전체를 검사하면 옛 문서에서 수백 건이 나와 아무도 안 본다.
 * 경고가 많으면 경고가 죽는다. 그래서 git 이 알려 주는 「더해진 줄」만 본다.
 *   · 커밋하지 않은 변경에서 더해진 줄
 *   · 아직 git 이 모르는 새 파일의 모든 줄
 *
 * 보는 파일 — .md · .txt · .mjs · .js · .ts · .astro
 * ⛔ 자동으로 만들어지는 기록 파일은 보지 않는다. 사람이 쓴 글이 아니다.
 *
 * 사용법
 *   node scripts/check-새글-말투.mjs
 *   node scripts/check-새글-말투.mjs --자체검사
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { 금지어, 재기 } from './순한글-금지어.mjs';

const 저장소루트 = fileURLToPath(new URL('..', import.meta.url));

/** 검사할 확장자 */
export const 볼확장자 = ['.md', '.txt', '.mjs', '.js', '.ts', '.astro'];

/** 사람이 쓴 글이 아닌 것 — 자동으로 쌓이는 기록은 뺀다 */
export const 뺄경로 = [
  'docs/고정업무-마커/', 'docs/보낸메일.tsv', 'docs/색인요청-이력.tsv',
  'docs/indexnow-', 'docs/날마다-', 'docs/매시소통', 'docs/손님길점검',
  'src/data/', 'archive/', 'node_modules/', 'docs/세션간-메모.md',
  /* 🔴 금지어 사전 자신은 뺀다 — 금지어를 적어 두는 곳이라 스스로 걸린다 */
  'scripts/순한글-금지어.mjs', 'scripts/check-새글-말투.mjs',
  /* 🔴 사장님 원문은 고치지 않는다. 요약하지 말고 그대로 두라는 지시다 */
  'docs/사장님이-고치신-', 'docs/사장님-지시-대장.md',
];

export function 볼파일인가(경로) {
  const p = String(경로 ?? '').replace(/\\/g, '/');
  if (!볼확장자.includes(path.extname(p))) return false;
  return !뺄경로.some((x) => p.includes(x));
}

/** git 이 감싸 놓은 따옴표를 벗긴다 */
export function 따옴표벗기기(경로) {
  const p = String(경로 ?? '').trim();
  return p.startsWith('"') && p.endsWith('"') ? p.slice(1, -1) : p;
}

/**
 * git 을 실행한다.
 * 🔴 [2026-11-09] `core.quotepath=false` 가 꼭 필요하다. 이것이 없으면 git 이
 *   한글 경로를 따옴표와 8진수 글자로 바꿔 내놓는다. 그 글자를 경로로 읽으면
 *   확장자가 안 맞아 **한글 파일이 전부 조용히 빠진다.** 처음 만들었을 때
 *   걸린 것 0개가 나왔는데, 안 걸린 것이 아니라 못 본 것이었다.
 */
function git실행(인수들) {
  return execFileSync('git', ['-c', 'core.quotepath=false', ...인수들], {
    cwd: 저장소루트, encoding: 'utf8', maxBuffer: 1024 * 1024 * 64,
    stdio: ['ignore', 'pipe', 'ignore'],
  });
}

/**
 * 더해진 줄을 모은다.
 * @returns {{파일:string, 줄번호:number, 글:string}[]}
 */
export function 더해진줄() {
  const 것 = [];
  let 변경;
  /* 🔴 [2026-11-09] `--ignore-cr-at-eol` 이 꼭 필요하다. 이 저장소는 줄 끝을 CRLF 로
     바꿔 저장해서, 그것이 없으면 **어제 커밋한 파일까지 통째로 「새로 쓴 글」로 잡힌다.**
     처음 돌렸을 때 87개가 나왔는데 그 가운데 거의 전부가 그 탓이었다. */
  try { 변경 = git실행(['diff', 'HEAD', '--unified=0', '--ignore-cr-at-eol']); } catch { 변경 = ''; }
  let 지금파일 = null;
  let 줄번호 = 0;
  for (const 줄 of 변경.split(/\r?\n/)) {
    const m1 = 줄.match(/^\+\+\+ b\/(.+)$/);
    if (m1) { 지금파일 = 따옴표벗기기(m1[1]); continue; }
    const m2 = 줄.match(/^@@ -\d+(?:,\d+)? \+(\d+)/);
    if (m2) { 줄번호 = Number(m2[1]); continue; }
    if (지금파일 && 줄.startsWith('+') && !줄.startsWith('+++')) {
      if (볼파일인가(지금파일)) 것.push({ 파일: 지금파일, 줄번호, 글: 줄.slice(1) });
      줄번호 += 1;
    }
  }
  /* git 이 아직 모르는 새 파일은 통째로 새 글이다 */
  let 새파일 = '';
  try { 새파일 = git실행(['ls-files', '--others', '--exclude-standard']); } catch { /* 없으면 넘어간다 */ }
  /* 🔴 [2026-11-09] git 이 모르는 파일 가운데 **최근 12시간 안에 쓴 것만** 본다.
     이 검사는 「지금 쓰는 글」을 잡으려고 만든 것이다. 묵은 파일까지 한꺼번에 세우면
     경고가 수십 개가 되고, 경고가 많으면 아무도 안 본다. 묵은 것은 따로 날을 잡아 고친다. */
  const 열두시간 = 12 * 60 * 60 * 1000;
  for (const 경로 of 새파일.split(/\r?\n/).map((x) => 따옴표벗기기(x)).filter(Boolean)) {
    if (!볼파일인가(경로)) continue;
    let 글;
    try {
      const 자리 = path.join(저장소루트, 경로);
      if (Date.now() - fs.statSync(자리).mtimeMs > 열두시간) continue;
      글 = fs.readFileSync(자리, 'utf8');
    } catch { continue; }
    글.split(/\r?\n/).forEach((한줄, i) => 것.push({ 파일: 경로, 줄번호: i + 1, 글: 한줄 }));
  }
  return 것;
}

/**
 * 한 줄에서 금지어를 찾는다.
 *
 * 🔴 [2026-11-09] 처음에는 여기서 `includes` 로 직접 찾았다. **그것이 흠이었다.**
 *   사전은 말마다 두 가지를 더 적어 둔다 —
 *     · 앞에 한글이 붙으면 다른 낱말의 일부다 (「따지면」의 '지면')
 *     · `뒤` 가 적힌 말은 뒤 글자가 조사일 때만 센다 (「지면에·지면을」)
 *   그 둘을 안 보고 세었더니 오늘 고친 글에서 48개가 떴는데 거의 다 헛것이었다.
 *   ⛔ 헛경보가 쌓이면 사람이 이 자를 안 본다 — 그러면 진짜 하나도 같이 묻힌다.
 *   ⇒ 사전이 쥔 판정 자리(`재기`)를 그대로 부른다. 판정 규칙을 두 벌 두지 않는다.
 *
 * ⚠ `주석도본다: true` 다. 코드 파일에서 내가 한국어로 쓰는 자리가 바로 주석이기 때문이다.
 */
export function 줄에서찾는다(글, 목록 = null) {
  const 본문 = String(글 ?? '');
  if (!본문) return [];
  if (목록) {
    /* 자체검사에서 작은 목록을 넘길 때만 쓰는 길 — 앞 글자 규칙은 같이 지킨다 */
    const 것 = [];
    for (const x of 목록) {
      if (!x || !x.말) continue;
      let i = -1;
      while ((i = 본문.indexOf(x.말, i + 1)) !== -1) {
        const 앞 = i > 0 ? 본문[i - 1] : ' ';
        if (/[가-힣]/.test(앞)) continue;
        if (x.뒤 && !x.뒤.includes(본문[i + x.말.length] ?? '')) continue;
        것.push({ 말: x.말, 대신: x.대신 });
        break;
      }
    }
    return 것;
  }
  return 재기(본문, { 주석도본다: true }).map((x) => ({ 말: x.말, 대신: x.대신 }));
}

/** 한 차례 검사한다 */
export function 검사한다() {
  const 걸린것 = [];
  for (const 줄 of 더해진줄()) {
    const 찾은것 = 줄에서찾는다(줄.글);
    for (const y of 찾은것) 걸린것.push({ ...줄, ...y });
  }
  return 걸린것;
}

/* ── 자체 검사 ──────────────────────────────────────────────────────── */
export function 자체검사() {
  const 항목 = [];
  const 검사 = (이름, 결과) => 항목.push({ 이름, 결과: !!결과 });

  검사('문서 파일을 본다', 볼파일인가('docs/보고.md') === true);
  검사('스크립트 파일을 본다', 볼파일인가('scripts/a.mjs') === true);
  검사('그림 파일은 보지 않는다', 볼파일인가('docs/a.png') === false);
  검사('자동으로 쌓이는 기록은 보지 않는다',
    볼파일인가('docs/고정업무-마커/a.md') === false && 볼파일인가('src/data/a.ts') === false);
  검사('세션간 메모는 보지 않는다 — 여러 유닛이 같이 쓴다',
    볼파일인가('docs/세션간-메모.md') === false);

  const 목록 = [{ 말: '관문', 대신: '검사' }, { 말: '본보기', 대신: '표본' }];
  검사('금지어가 든 줄을 잡는다', 줄에서찾는다('이 관문을 지난다', 목록).length === 1);
  검사('두 개가 들면 두 개를 잡는다', 줄에서찾는다('관문과 본보기', 목록).length === 2);
  검사('깨끗한 줄은 통과한다', 줄에서찾는다('로그인과 결제를 점검했습니다', 목록).length === 0);
  검사('빈 줄에서 오류가 나지 않는다',
    줄에서찾는다('', 목록).length === 0 && 줄에서찾는다(null, 목록).length === 0);

  검사('실제 금지어 목록을 읽는다 — 0개면 못 읽은 것이다', 금지어.length > 100);
  /* 🔴 [2026-11-09] 사전의 앞·뒤 규칙을 안 보고 세던 자리. 헛경보 48개가 났다 */
  검사('🔴 낱말 안에 우연히 든 것은 안 센다 — 「따지면」의 지면',
    줄에서찾는다('그렇게 따지면 맞는 말이다').length === 0);
  검사('🔴 조사가 붙은 것은 센다 — 「지면에」',
    줄에서찾는다('지면에 싣는다').some((x) => x.말 === '지면'));
  검사('빈칸 뒤 「지면 탈락한다」는 안 센다 — 지다+면이다',
    줄에서찾는다('한 번 더 지면 탈락한다').every((x) => x.말 !== '지면'));
  검사('더해진 줄을 배열로 돌려준다', Array.isArray(더해진줄()));
  검사('🔴 git 이 감싼 따옴표를 벗긴다 — 한글 경로가 조용히 빠지던 자리다',
    따옴표벗기기('"docs/보고.md"') === 'docs/보고.md' && 따옴표벗기기('docs/보고.md') === 'docs/보고.md');
  검사('따옴표를 벗긴 한글 경로를 본다', 볼파일인가(따옴표벗기기('"docs/보고.md"')) === true);

  const 실패 = 항목.filter((x) => !x.결과);
  console.log(`■ check-새글-말투 자체 검사 ${항목.length - 실패.length}/${항목.length}`);
  for (const x of 항목) console.log(`  ${x.결과 ? '통과' : '실패'}  ${x.이름}`);
  return 실패.length === 0;
}

/* ── 실행부 ─────────────────────────────────────────────────────────── */
const 직접실행 = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (직접실행) {
  if (process.argv.includes('--자체검사')) process.exit(자체검사() ? 0 : 1);

  const 걸린것 = 검사한다();
  if (!걸린것.length) { console.log('■ 새로 쓴 글 말투 검사 — 걸린 것이 없다'); process.exit(0); }

  console.log(`■ 새로 쓴 글 말투 검사 — 걸린 것 ${걸린것.length}개`);
  const 파일별 = {};
  for (const x of 걸린것) (파일별[x.파일] ??= []).push(x);
  for (const [파일, 목록] of Object.entries(파일별)) {
    console.log(`\n${파일}`);
    for (const x of 목록.slice(0, 20)) {
      console.log(`   ${x.줄번호}행  「${x.말}」 → ${x.대신}`);
      console.log(`          ${x.글.trim().slice(0, 80)}`);
    }
    if (목록.length > 20) console.log(`   … 그 밖에 ${목록.length - 20}개`);
  }
  console.log('\n고친 뒤 다시 돌린다. 사장님 2026-11-09 —');
  console.log('   「지침은 지키라고 있는 거지, 기록용으로 있는 게 아니야」');
  process.exit(1);
}
