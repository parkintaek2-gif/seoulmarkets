/**
 * 자물쇠-케이라이프디자인-네문장.mjs
 * ─────────────────────────────────────────────────────────────────
 * 케이라이프디자인 한 페이지 홈페이지에 들어가는 **네 문장**은 전부 사장님 문장이다.
 *
 *   사장님 2026-11-22 — 「내가 쓴 적 없다. 너희가 지은 말이다. 모든 곳에서 삭제해라」
 *   사장님 2026-11-23 — 「케이라이프디자인 홈페이지 내 사이트 설명 중 두 가지 추가로 수정함. 반영해」
 *
 * ⛔ 한 글자도 고치지 않는다. 조사·띄어쓰기·마침표까지 그대로 쓴다.
 * ⛔ 「임시」 문장을 다시 만들지 않는다. 네 문장이 다 왔으므로 임시는 없다.
 *
 * 쓰는 법
 *   node scripts/자물쇠-케이라이프디자인-네문장.mjs
 *   node scripts/자물쇠-케이라이프디자인-네문장.mjs --자가시험
 *
 * 끝값 0 = 초록불, 1 = 빨간불
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 저장소 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** 사장님 문장 — 여기를 고치려면 사장님 말씀이 있어야 한다 */
const 네문장 = [
  '인생을 그리는 데 도움을 줄 수 있는 지도와 내비게이션 세 가지를 제공합니다.',
  '사주, 별자리, 궁합. 택일 등 인생에 필요한 지도를 그려 드립니다.',
  '0세부터 100세까지, 궁금한 것을 안내하는 인생 내비게이션입니다.',
  '아시아와 걸프 지역의 금융시장 데이터를 영어로 볼 수 있습니다.',
];

/** 정본 — 여기에는 네 문장이 반드시 그대로 있어야 한다 */
const 정본 = 'docs/계획-케이라이프디자인-홈페이지-최종.md';

/** 지면 — 아직 안 지었으면 건너뛴다(못 쟀다고 적는다). 지으면 여기도 잰다 */
const 지면후보 = [
  'src/pages/klifedesign/index.astro',
  'src/pages/klifedesign.astro',
  'src/pages/company/index.astro',
];

function 읽는다(상대길) {
  const 길 = path.join(저장소, 상대길);
  if (!fs.existsSync(길)) return null;
  return fs.readFileSync(길, 'utf8');
}

function 잰다(글, 어디) {
  const 깨진것 = [];
  if (글 === null) return { 못쟀다: true, 어디, 깨진것 };
  네문장.forEach((문장, n) => {
    if (!글.includes(문장)) 깨진것.push(`${어디} — ${n + 1}번 문장이 그대로 있지 않다: 「${문장}」`);
  });
  return { 못쟀다: false, 어디, 깨진것 };
}

function 전부잰다() {
  const 깨진것 = [];
  const 못잰것 = [];

  const 정본글 = 읽는다(정본);
  if (정본글 === null) {
    깨진것.push(`정본이 없다 — ${정본}`);
  } else {
    깨진것.push(...잰다(정본글, 정본).깨진것);
    /* 임시 문장이 되살아나지 않았나 */
    if (/임시[:：]/.test(정본글) || /문장 대기/.test(정본글)) {
      깨진것.push(`${정본} — 「임시」 문장이나 「문장 대기」가 되살아났다. 네 문장은 다 왔다`);
    }
  }

  const 지면길 = 지면후보.find((p) => fs.existsSync(path.join(저장소, p)));
  if (!지면길) {
    못잰것.push('지면을 아직 안 지었다 — 지으면 그 지면도 이 자물쇠가 잰다');
  } else {
    깨진것.push(...잰다(읽는다(지면길), 지면길).깨진것);
  }

  return { 깨진것, 못잰것 };
}

/** 자가시험 — 문장 하나를 일부러 비틀면 이 자물쇠가 정말 빨간불을 내나 */
function 자가시험() {
  const 가짜 = 네문장.map((s, i) => (i === 2 ? s.replace('내비게이션', '네비게이션') : s)).join('\n');
  const 결과 = 잰다(가짜, '(자가시험)');
  const 잡았나 = 결과.깨진것.length === 1;
  console.log(잡았나
    ? '✅ 자가시험 — 글자 하나를 비틀자 자물쇠가 잡았다'
    : `🔴 자가시험이 실패했다 — 비틀었는데 ${결과.깨진것.length}건만 잡았다`);
  return 잡았나 ? 0 : 1;
}

if (process.argv.includes('--자가시험')) {
  process.exitCode = 자가시험();
} else {
  const { 깨진것, 못잰것 } = 전부잰다();
  못잰것.forEach((m) => console.log(`⚠ ${m}`));
  if (깨진것.length) {
    console.log(`🔴 케이라이프디자인 네 문장 — ${깨진것.length}건이 어긋났다`);
    깨진것.forEach((m) => console.log(`   ${m}`));
    process.exitCode = 1;
  } else {
    console.log('✅ 케이라이프디자인 네 문장이 사장님 문장 그대로다');
  }
}
