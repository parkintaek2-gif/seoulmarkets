#!/usr/bin/env node
/**
 * 보고안내면-커밋막는다.mjs — 업무보고를 제때 안 내면 **그 시각부터 커밋이 막힌다.**
 *
 * ── 🔴🔴 왜 만드나 (2026-11-19 22:45 · 5번) ─────────────────────────
 * 사장님 — 「**제 때 보고하면 배포 막힐 일 없잖아 /
 *            너는 강제로 할 일, 하지 말아야 할 일 리스트업 했잖아. 그건 왜 작용을 안하나?**」
 *
 * 그날 16시 보고를 안 냈고, 장치 셋이 다 걸려 있었는데 셋 다 나를 못 세웠다.
 *
 *   알림 자물쇠    16:05~22:05 에 «일곱 번» 적었다 → 적은 곳이 메모 파일이라 안 읽으면 없는 것
 *   자동 발송 예약  16:00 에 돌았다 → 「원고가 없으면 짓지 않는다」로 조용히 끝났다
 *   배포 관문      실제로 세웠다 → 그런데 내가 «배포를 할 때»만 걸린다. 여섯 시간 뒤였다
 *
 * ⭐ 셋의 종착점이 다 「파일에 적기」이거나 「내가 배포할 때」였다.
 *   ⇒ 적는 자리를 바꾼다. **커밋**은 내가 무슨 일을 하든 몇 분에 한 번씩 지나가는 길목이다.
 *     16시 몇 분 만에 걸렸을 것이다. 그날 나는 16시 뒤에도 커밋을 여러 번 했다.
 *
 * ── 막는 조건 ───────────────────────────────────────────────────
 *   ① 자리가 5번일 때만 막는다 (CLAUDE_SEAT=5). 1번 커밋은 건드리지 않는다
 *      ⛔ 남의 유닛 일을 내 보고 때문에 세우지 않는다
 *   ② 오늘 몫 보고가 안 나갔을 때만. 지난 날은 지금 메울 수 없으니 막지 않는다
 *      (그날 한 일을 지금 지어내는 것은 보고가 아니라 거짓이다)
 *   ③ 보고를 내려고 하는 커밋은 통과시킨다 — 안 그러면 스스로를 가둔다
 *
 * ⛔ 빠져나가려면 git commit --no-verify 다. 막는 자가 길을 아주 끊지는 않는다.
 *   다만 그것은 사장님께 「안 냈다」로 남는다 — 이 자가 아니라 보낸메일 대장이 센다.
 *
 * 쓰는 법
 *   node scripts/보고안내면-커밋막는다.mjs            커밋 훅이 부른다
 *   node scripts/보고안내면-커밋막는다.mjs --본다      막힐지만 본다 (끝값 0)
 *   node scripts/보고안내면-커밋막는다.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { execFileSync } from 'node:child_process';

const 여기 = path.dirname(url.fileURLToPath(import.meta.url));
export const 뿌리 = path.resolve(여기, '..');

/** 이 자가 막는 자리 — 5번 것만 */
export const 막는자리 = '5';

/** 보고를 내려는 커밋이면 통과시킨다 — 스스로를 가두지 않는다 */
export const 봐주는길 = [
  'docs/보고',
  'docs/보낸메일.tsv',
  'docs/세션간-메모.md',
  'docs/사장님-지시-대장.md',
  'scripts/보고안내면-커밋막는다.mjs',
];

export function 보고커밋인가(담긴것) {
  const 줄 = (담긴것 ?? []).map((x) => String(x).replace(/\\/g, '/')).filter(Boolean);
  if (줄.length === 0) return false;
  return 줄.every((f) => 봐주는길.some((p) => f === p || f.startsWith(p + '/') || f.startsWith(p)));
}

export function 담긴것읽기() {
  try {
    const 글 = execFileSync('git', ['diff', '--cached', '--name-only'],
      { cwd: 뿌리, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return String(글).split(/\r?\n/).filter(Boolean);
  } catch (e) { return []; }
}

/**
 * 막을 까닭이 있나.
 * @returns {{막나: boolean, 까닭: string, 빠짐: Array}}
 */
export async function 재본다({ 자리 = process.env.CLAUDE_SEAT, 담긴것 = null, 이제 = new Date() } = {}) {
  if (String(자리 ?? '') !== 막는자리) {
    return { 막나: false, 까닭: `자리가 ${자리 || '없음'} 이라 안 본다 (5번 것만 막는다)`, 빠짐: [] };
  }
  const 담김 = 담긴것 ?? 담긴것읽기();
  if (보고커밋인가(담김)) {
    return { 막나: false, 까닭: '보고를 내려는 커밋이라 통과시킨다', 빠짐: [] };
  }
  let 자물쇠;
  try { 자물쇠 = await import('./보고나갔나-자물쇠.mjs'); }
  catch (e) { return { 막나: false, 까닭: '자물쇠를 못 불렀다 — 0 으로 치지 않는다', 빠짐: [] }; }

  if (!fs.existsSync(자물쇠.대장길)) {
    return { 막나: false, 까닭: '보낸메일 대장을 못 읽었다 — 못 쟀다', 빠짐: [] };
  }
  const 줄들 = fs.readFileSync(자물쇠.대장길, 'utf8').split(/\r?\n/).filter(Boolean);
  const 빠짐 = 자물쇠.막을것(줄들, 이제);
  if (빠짐.length === 0) return { 막나: false, 까닭: '오늘 몫 보고가 다 나갔다', 빠짐: [] };
  return { 막나: true, 까닭: `오늘 몫 보고 ${빠짐.length}건이 안 나갔다`, 빠짐 };
}

function 알린다(결과) {
  console.log('');
  console.log('🔒 **업무보고를 안 내서 커밋이 막혔다** — ' + 결과.까닭);
  for (const x of 결과.빠짐) console.log(`   · ${x.날}  ${x.이름} — 안 나갔다`);
  console.log('');
  console.log('   사장님 2026-11-19 — 「제 때 보고하면 배포 막힐 일 없잖아」');
  console.log('   ⚠ 오늘 한 일은 지금 손에 있다. 지금 쓰면 2분이고, 안 쓰면 내일도 막힌다.');
  console.log('');
  console.log('   푸는 법 — 보고를 «직접 써서» 보낸다 (기계가 짓지 않는다)');
  console.log('     1. docs/보고-5번-16시-<날짜>.txt 에 직접 쓴다 — 1.한 것(숫자로) 2.못한 것 3.막힌 것');
  console.log('     2. node scripts/밖으로나가는말-관문.mjs <그 파일>');
  console.log('     3. node scripts/send-mail.mjs --받는곳=parkintaek2@gmail.com \\');
  console.log('          --제목="[5번] 16시 보고 — <날짜>" --글=<그 파일> --흐르게 --보낸다');
  console.log('');
  console.log('   ⛔ --no-verify 로 빠져나가도 대장에는 「안 냈다」로 남는다.');
}

// ── 자가시험 ───────────────────────────────────────────────
async function 자가시험() {
  let 통과 = 0; let 깨짐 = 0;
  const T = (이름, 참) => { if (참) { 통과 += 1; } else { 깨짐 += 1; console.log('🔴 ' + 이름); } };

  T('5번이 아니면 안 막는다', (await 재본다({ 자리: '1', 담긴것: ['src/x.ts'] })).막나 === false);
  T('자리를 모르면 안 막는다', (await 재본다({ 자리: undefined, 담긴것: ['src/x.ts'] })).막나 === false);

  T('보고 파일만 담긴 커밋은 통과', 보고커밋인가(['docs/보고-5번-16시-20261119.txt']) === true);
  T('보낸메일 대장만 담겨도 통과', 보고커밋인가(['docs/보낸메일.tsv']) === true);
  T('세션간 메모만 담겨도 통과', 보고커밋인가(['docs/세션간-메모.md']) === true);
  T('보고와 코드가 섞이면 봐주지 않는다',
    보고커밋인가(['docs/보낸메일.tsv', 'src/pages/index.astro']) === false);
  T('빈 커밋은 보고 커밋이 아니다', 보고커밋인가([]) === false);
  T('역슬래시 길도 읽는다', 보고커밋인가(['docs\\보낸메일.tsv']) === true);
  T('비슷한 이름에 속지 않는다', 보고커밋인가(['docs/세션간-메모-사본.md']) === false
    || 보고커밋인가(['src/docs/보낸메일.tsv']) === false);

  /* 대장을 가짜로 넣어 본다 — 오늘 16시 것이 있으면 안 막고, 없으면 막는다 */
  const 자물쇠 = await import('./보고나갔나-자물쇠.mjs');
  const 이제 = new Date(2026, 10, 19, 17, 0, 0);           /* 2026-11-19 17:00 KST */
  const 날 = 자물쇠.날글(이제);
  const 있는줄 = [`${날} 16:05\tadmin@klifedesign.net\tparkintaek2@gmail.com\t[5번] 16시 보고 — 11월 19일\tid`];
  T('그날 16시 보고가 대장에 있으면 안 빠진 것으로 센다', 자물쇠.나갔나(있는줄, 날, 자물쇠.볼보고[0]) === true);
  T('대장이 비면 빠진 것으로 센다', 자물쇠.나갔나([], 날, 자물쇠.볼보고[0]) === false);
  T('16시 전에는 아직 이른 것으로 본다',
    자물쇠.아직이른가(날, 자물쇠.볼보고[0], new Date(2026, 10, 19, 15, 0, 0)) === true);
  T('16시가 지나면 이르지 않다',
    자물쇠.아직이른가(날, 자물쇠.볼보고[0], 이제) === false);

  T('봐주는 길에 이 자 자신이 들어 있다 — 고치는 커밋이 막히지 않는다',
    봐주는길.includes('scripts/보고안내면-커밋막는다.mjs'));

  console.log(`\n■ 자가시험 ${통과}가지 통과 · ${깨짐}가지 깨짐`);
  return 깨짐 === 0;
}

const 나 = url.fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(나)) {
  const 인자 = process.argv.slice(2);
  if (인자.includes('--자가시험')) { process.exit(await 자가시험() ? 0 : 1); }
  const 결과 = await 재본다();
  if (인자.includes('--본다')) {
    console.log(결과.막나 ? '🔒 막는다 — ' + 결과.까닭 : '✅ 안 막는다 — ' + 결과.까닭);
    process.exit(0);
  }
  if (결과.막나) { 알린다(결과); process.exit(1); }
  process.exit(0);
}
