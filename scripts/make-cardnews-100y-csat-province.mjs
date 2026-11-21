/**
 * make-cardnews-100y-csat-province.mjs — 카드뉴스 「2027 수능 지원자 시도별 551,864명」 5장
 *
 * 소스 지면 — /csat-applicants-by-province (한국교육과정평가원 2026·2027학년도 수능 지원자 현황 붙임1)
 * ⛔ 이 카드의 수는 전부 csat-kice-tables.json 에서 지면과 같은 셈으로 낸 수다. 새로 재지 않는다.
 * ⛔ 지원자 수다(응시자 아님) — 카드에도 밝힌다.
 *
 * 쓰는 법  node scripts/make-cardnews-100y-csat-province.mjs [--selftest]
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { 그리기 } from './make-cardnews-100y-voc.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const 낼방 = path.join(ROOT, 'public', '100y', 'cardnews');
const 자료 = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/100yearmap/csat-kice-tables.json'), 'utf8'));

export const 갈곳 = '100yearmap.com/csat-applicants-by-province';
export const 바닥 = '한국교육과정평가원 · 2026·2027학년도 수능 지원자 현황';

const 앞 = 자료.시도별['2026'];
const 뒤 = 자료.시도별['2027'];
const 쉼 = (n) => n.toLocaleString('en-US');
const 부호 = (n) => (n > 0 ? `+${쉼(n)}` : `−${쉼(-n)}`);
const 행 = 자료.시도순.map((k) => ({ k, 뒤: 뒤[k].계, 차: 뒤[k].계 - 앞[k].계 })).sort((a, b) => b.뒤 - a.뒤);
const 는곳 = 행.filter((r) => r.차 > 0).sort((a, b) => b.차 - a.차);
const 준곳 = 행.filter((r) => r.차 < 0).sort((a, b) => a.차 - b.차);

export function 짜기() {
  return [
    { 꼴: '표지', 큰수: `${쉼(뒤.계.계)}명`, 줄들: ['2027학년도 수능 지원자.', '11월 19일, 17개 시도.'] },
    { 머리: '지원자가 많은 시도', 줄들: 행.slice(0, 5).map((r) => `${r.k}  ${쉼(r.뒤)}명`) },
    { 머리: `1년 새 늘어난 곳 ${는곳.length}곳`, 줄들: [...는곳.map((r) => `${r.k}  ${부호(r.차)}명`), '', `줄어든 곳 ${준곳.length}곳`] },
    { 머리: '가장 많이 준 곳', 줄들: 준곳.slice(0, 5).map((r) => `${r.k}  ${부호(r.차)}명`) },
    { 꼴: '마무리', 머리: '원서를 낸 사람 수입니다', 줄들: ['시험 날 실제로 본 사람은', '이보다 적습니다.', '', ''] },
  ];
}

/* ── 자가시험 ─────────────────────────────────────────── */
if (process.argv.includes('--selftest')) {
  const 본다 = (말, 참) => { console.log(참 ? '✅' : '🔴', 말); if (!참) process.exitCode = 1; };
  const 장들 = 짜기();
  const 민글 = 장들.map((장, i) => 그리기(장, i + 1, 장들.length, 바닥, 갈곳)).join('\n')
    .replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
  본다('① 다섯 장이다', 장들.length === 5);
  본다('② 표지 큰 수가 지면의 수(551,864)다', 장들[0].큰수 === '551,864명' && 뒤.계.계 === 551864);
  본다('③ 모든 장에 데려갈 주소가 있다', 장들.every((장, i) => 그리기(장, i + 1, 장들.length, 바닥, 갈곳).includes(갈곳)));
  본다('④ 시도 합이 전국이다', 행.reduce((a, r) => a + r.뒤, 0) === 뒤.계.계);
  const 댈수 = new Set([뒤.계.계, 는곳.length, 준곳.length, 17, 11, 19, 2026, 2027, 장들.length, ...행.map((r) => r.뒤), ...행.map((r) => Math.abs(r.차))].map(String));
  const 못댄것 = [...민글.split(갈곳).join(' ').matchAll(/\d[\d,]*\.?\d*/g)]
    .map((m) => m[0].replace(/,/g, '').replace(/\.$/, '')).filter((s) => !댈수.has(s) && !/^[1-5]$/.test(s));
  본다(`⑤ 화면의 수가 전부 자료에서 온다${못댄것.length ? ` — 못 댄 것: ${[...new Set(못댄것)].slice(0, 6).join(' · ')}` : ''}`, 못댄것.length === 0);
  console.log(`\n지원자 ${뒤.계.계} · 는 곳 ${는곳.length} · 준 곳 ${준곳.length}`);
  process.exit();
}

/* 🔴 여기부터가 «부르면 도는 몸»이다 */
const 내가직접불렸나 = !!process.argv[1] && path.basename(process.argv[1]) === 'make-cardnews-100y-csat-province.mjs';
if (내가직접불렸나) {
  const sharp = createRequire(path.join(ROOT, 'package.json'))('sharp');
  fs.mkdirSync(낼방, { recursive: true });
  const 장들 = 짜기();
  for (let i = 0; i < 장들.length; i++) {
    const svg = 그리기(장들[i], i + 1, 장들.length, 바닥, 갈곳);
    await sharp(Buffer.from(svg)).png().toFile(path.join(낼방, `수능지원자시도-${i + 1}.png`));
    console.log('✅', `수능지원자시도-${i + 1}.png`);
  }
  console.log('⛔ 주소 없는 카드는 안 만든다 — 모든 장에', 갈곳);
}
