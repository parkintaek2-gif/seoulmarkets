/**
 * make-cardnews-100y-natural-decrease.mjs — 카드뉴스 「출생아 − 사망자 시도별 2026년 1~8월」 5장
 *
 * 소스 페이지 — /natural-decrease-by-province-2026 (국가데이터처 KOSIS 월별 인구동향 101/DT_1B8000G, 잠정)
 * ⛔ 이 카드의 수는 전부 births-2026.json에서 페이지와 같은 셈으로 낸 수다. 새로 재지 않는다.
 * ⛔ 「인구가 늘었다」를 쓰지 않는다 — 이사 온 사람·떠난 사람이 빠진 수라고 카드에도 밝힌다.
 *
 * 쓰는 법  node scripts/make-cardnews-100y-natural-decrease.mjs [--selftest]
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { 그리기 } from './make-cardnews-100y-voc.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const 낼방 = path.join(ROOT, 'public', '100y', 'cardnews');
const 자료 = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/100yearmap/births-2026.json'), 'utf8'));

export const 갈곳 = '100yearmap.com/natural-decrease-by-province-2026';
export const 바닥 = '국가데이터처 · 2026년 8월 인구동향(잠정)';

const 쉼 = (n) => n.toLocaleString('en-US');
const 부호 = (n) => (n > 0 ? '+' : '−') + 쉼(Math.abs(n));
const 합 = (r, a, b, k) => r.월.filter((m) => m.월 >= a && m.월 <= b).reduce((t, m) => t + m[k], 0);
const 줄 = (r) => {
  const 출 = 합(r, '202601', '202608', '출생'); const 사 = 합(r, '202601', '202608', '사망');
  return { k: r.짧은, 출, 사, 차: 출 - 사, 차전: 합(r, '202501', '202508', '출생') - 합(r, '202501', '202508', '사망'), 비: Math.round(출 / 사 * 100) };
};
const 전 = 줄(자료.전국);
const 행 = 자료.시도.map(줄).sort((a, b) => b.차 - a.차);
const 많은 = 행.filter((r) => r.차 > 0);
const 비순 = [...행].sort((a, b) => a.비 - b.비);

export function 짜기() {
  return [
    { 꼴: '표지', 큰수: `${많은.length}곳`, 줄들: ['17개 시도 중 태어난 사람이', '더 많은 곳 (2026년 1~8월)'] },
    { 머리: '태어난 사람이 더 많은 곳', 줄들: 많은.map((r) => `${r.k}  ${부호(r.차)}명`) },
    { 머리: '사망자 100명당 출생아 적은 곳', 줄들: 비순.slice(0, 5).map((r) => `${r.k}  ${r.비}명`) },
    { 머리: '전국 출생아 − 사망자', 줄들: [`2026년 1~8월  ${부호(전.차)}명`, `2025년 1~8월  ${부호(전.차전)}명`, '', `출생아 ${쉼(전.출)}명`, `사망자 ${쉼(전.사)}명`] },
    { 꼴: '마무리', 머리: '이사 온 사람·떠난 사람은 빠진 수입니다', 줄들: ['지역 삶의 좋고 나쁨을', '말하지 않습니다.', '', ''] },
  ];
}

/* ── 자가시험 ─────────────────────────────────────────── */
if (process.argv.includes('--selftest')) {
  const 본다 = (말, 참) => { console.log(참 ? '✅' : '🔴', 말); if (!참) process.exitCode = 1; };
  const 장들 = 짜기();
  const 민글 = 장들.map((장, i) => 그리기(장, i + 1, 장들.length, 바닥, 갈곳)).join('\n')
    .replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
  본다('① 다섯 장이다', 장들.length === 5);
  본다('② 표지 큰 수가 페이지의 수(4곳)다', 장들[0].큰수 === '4곳' && 많은.length === 4);
  본다('③ 모든 장에 데려갈 주소가 있다', 장들.every((장, i) => 그리기(장, i + 1, 장들.length, 바닥, 갈곳).includes(갈곳)));
  /* 2026년 잠정치는 17개 시도 합이 전국과 몇 명 다르다(출생 3명·사망 7명, 원인 미확인) — 10명 안쪽인지만 본다 */
  본다('④ 시도 합이 전국과 10명 안쪽으로 맞다(출생)', Math.abs(행.reduce((a, r) => a + r.출, 0) - 전.출) <= 10);
  const 댈수 = new Set([2025, 2026, 17, 100, 8, 많은.length, 전.출, 전.사, Math.abs(전.차), Math.abs(전.차전), ...행.map((r) => Math.abs(r.차)), ...행.map((r) => r.비)].map(String));
  const 못댄것 = [...민글.split(갈곳).join(' ').matchAll(/\d[\d,]*\.?\d*/g)]
    .map((m) => m[0].replace(/,/g, '').replace(/\.$/, '')).filter((s) => !댈수.has(s) && !/^[1-5]$/.test(s));
  본다(`⑤ 화면의 수가 전부 자료에서 온다${못댄것.length ? ` — 못 댄 것: ${[...new Set(못댄것)].slice(0, 6).join(' · ')}` : ''}`, 못댄것.length === 0);
  console.log(`\n전국 ${전.차} · 많은곳 ${많은.map((r) => r.k).join('·')}`);
  process.exit();
}

/* 🔴 여기부터가 «부르면 도는 몸»이다 */
const 내가직접불렸나 = !!process.argv[1] && path.basename(process.argv[1]) === 'make-cardnews-100y-natural-decrease.mjs';
if (내가직접불렸나) {
  const sharp = createRequire(path.join(ROOT, 'package.json'))('sharp');
  fs.mkdirSync(낼방, { recursive: true });
  const 장들 = 짜기();
  for (let i = 0; i < 장들.length; i++) {
    const svg = 그리기(장들[i], i + 1, 장들.length, 바닥, 갈곳);
    await sharp(Buffer.from(svg)).png().toFile(path.join(낼방, `출생사망시도-${i + 1}.png`));
    console.log('✅', `출생사망시도-${i + 1}.png`);
  }
  console.log('⛔ 주소 없는 카드는 안 만든다 — 모든 장에', 갈곳);
}
