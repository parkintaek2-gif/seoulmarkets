/**
 * make-cardnews-100y-gyeonggi-teacher.mjs — 카드뉴스 「경기 중등교사 임용 2027 과목별」 5장
 *
 * 소스 지면 — /gyeonggi-teacher-exam-2027 (경기도교육청 2027학년도 중등교사 등 임용시험 접수현황 원본 PDF, 2026-10-19 18:00 기준)
 * ⛔ 이 카드의 수는 전부 teacher-exam-2027.json(경기과목)에서 지면과 같은 셈으로 낸 수다. 새로 재지 않는다.
 * ⛔ 「붙기 쉬운 과목」을 쓰지 않는다 — 지원 ÷ 선발일 뿐이라고 카드에도 밝힌다.
 *
 * 쓰는 법  node scripts/make-cardnews-100y-gyeonggi-teacher.mjs [--selftest]
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { 그리기 } from './make-cardnews-100y-voc.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const 낼방 = path.join(ROOT, 'public', '100y', 'cardnews');
const 자료 = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/100yearmap/teacher-exam-2027.json'), 'utf8'));

export const 갈곳 = '100yearmap.com/gyeonggi-teacher-exam-2027';
export const 바닥 = '경기도교육청 · 2027학년도 중등교사 임용 접수현황';

const g = 자료.경기과목;
const 쉼 = (n) => n.toLocaleString('en-US');
const 모두 = g.과목.map((r) => ({ 과: r[0], 선: r[1] + r[2], 지: r[3] + r[4], 비교과: g.비교과.includes(r[0]) }))
  .map((r) => ({ ...r, 율: (r.지 / r.선).toFixed(2) }));
const 교과 = 모두.filter((r) => !r.비교과).sort((a, b) => Number(b.율) - Number(a.율));
const 많이 = [...교과].sort((a, b) => b.선 - a.선);
const 선합 = g.공립합계[0] + g.공립합계[1];
const 지합 = g.공립합계[2] + g.공립합계[3];

export function 짜기() {
  return [
    { 꼴: '표지', 큰수: `${쉼(지합)}명`, 줄들: ['경기 중등교사 임용 원서.', `${쉼(선합)}명을 뽑습니다.`] },
    { 머리: '가장 많이 뽑는 교과', 줄들: 많이.slice(0, 5).map((r) => `${r.과}  ${r.선}명 · ${쉼(r.지)}명 지원`) },
    { 머리: '지원 ÷ 선발이 높은 교과', 줄들: 교과.slice(0, 5).map((r) => `${r.과}  ${r.율}대 1`) },
    { 머리: '지원 ÷ 선발이 낮은 교과', 줄들: 교과.slice(-5).reverse().map((r) => `${r.과}  ${r.율}대 1`) },
    { 꼴: '마무리', 머리: '원서를 낸 사람 ÷ 뽑을 사람입니다', 줄들: ['누가 붙을지를', '말하지 않습니다.', '', ''] },
  ];
}

/* ── 자가시험 ─────────────────────────────────────────── */
if (process.argv.includes('--selftest')) {
  const 본다 = (말, 참) => { console.log(참 ? '✅' : '🔴', 말); if (!참) process.exitCode = 1; };
  const 장들 = 짜기();
  const 민글 = 장들.map((장, i) => 그리기(장, i + 1, 장들.length, 바닥, 갈곳)).join('\n')
    .replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
  본다('① 다섯 장이다', 장들.length === 5);
  본다('② 표지 큰 수가 지면의 수(12,171)다', 장들[0].큰수 === '12,171명' && 지합 === 12171);
  본다('③ 모든 장에 데려갈 주소가 있다', 장들.every((장, i) => 그리기(장, i + 1, 장들.length, 바닥, 갈곳).includes(갈곳)));
  본다('④ 과목 합이 공립합계다', 모두.reduce((a, r) => a + r.선, 0) === 선합 && 모두.reduce((a, r) => a + r.지, 0) === 지합);
  const 댈수 = new Set([지합, 선합, 2027, 장들.length, ...모두.map((r) => r.선), ...모두.map((r) => r.지), ...모두.map((r) => r.율)].map(String));
  const 못댄것 = [...민글.split(갈곳).join(' ').matchAll(/\d[\d,]*\.?\d*/g)]
    .map((m) => m[0].replace(/,/g, '').replace(/\.$/, '')).filter((s) => !댈수.has(s) && !/^[1-5]$/.test(s));
  본다(`⑤ 화면의 수가 전부 자료에서 온다${못댄것.length ? ` — 못 댄 것: ${[...new Set(못댄것)].slice(0, 6).join(' · ')}` : ''}`, 못댄것.length === 0);
  console.log(`\n선발 ${선합} · 지원 ${지합} · 교과 ${교과.length}`);
  process.exit();
}

/* 🔴 여기부터가 «부르면 도는 몸»이다 */
const 내가직접불렸나 = !!process.argv[1] && path.basename(process.argv[1]) === 'make-cardnews-100y-gyeonggi-teacher.mjs';
if (내가직접불렸나) {
  const sharp = createRequire(path.join(ROOT, 'package.json'))('sharp');
  fs.mkdirSync(낼방, { recursive: true });
  const 장들 = 짜기();
  for (let i = 0; i < 장들.length; i++) {
    const svg = 그리기(장들[i], i + 1, 장들.length, 바닥, 갈곳);
    await sharp(Buffer.from(svg)).png().toFile(path.join(낼방, `경기임용과목-${i + 1}.png`));
    console.log('✅', `경기임용과목-${i + 1}.png`);
  }
  console.log('⛔ 주소 없는 카드는 안 만든다 — 모든 장에', 갈곳);
}
