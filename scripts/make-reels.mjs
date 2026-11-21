#!/usr/bin/env node
/**
 * 카드뉴스 영상 — **한 장으로 끝내지 않고 넘겨 보게 한다.**
 *
 * 사장님 지시(2026-08-07): 「**영상도 해야지, X도**」 · 「카드뉴스는 텍스트 콘텐트에도 넣어.
 *   비주얼해지게」
 *
 * ── 어떻게 만드나 ──────────────────────────────────────────────
 * ffmpeg 가 이 PC 에 없다. **없다고 멈추지 않는다** — sharp 로 움직이는 GIF 를 만든다.
 * 쇼츠·릴스는 결국 「몇 장이 넘어가는 것」이고, GIF 는 X·스레드·카톡에서 그대로 돈다.
 *
 *   1장  질문을 던진다        「서른둘에 사람들은 결혼했을까?」
 *   2장  숫자를 보여 준다      「서른둘이 가장 많았습니다 — 20,630명」
 *   3장  분포로 넓힌다        「그래도 절반은 아직입니다」
 *   4장  우리가 판단하지 않는다 「」
 *
 * ⛔ 마지막 장을 빼지 않는다. 넘겨 보는 물건일수록 **규범으로 읽히기 쉽다.**
 *
 * 쓰는 법
 *   node scripts/make-reels.mjs            archive/cards/ 에 굽는다
 *   node scripts/make-reels.mjs --selftest 짜임 규칙을 검산한다
 */
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 낼곳 = path.join(뿌리, 'archive/cards');

/**
 * 넘김 짜임을 검사한다 — **마지막 장은 반드시 「우리가 판단하지 않는다」**여야 한다.
 * 규칙을 문장으로 두면 다음 사람이 빼먹는다. 검사로 둔다.
 */
export function 짜임검사(장들) {
  const 탈 = [];
  if (장들.length < 3) 탈.push('세 장보다 적으면 넘겨 볼 것이 없다');
  if (장들.length > 6) 탈.push('여섯 장을 넘으면 끝까지 안 본다');
  const 끝 = 장들[장들.length - 1];
  if (!/통계이지 당신이 아닙니다|not you|우리가 정할 자격이 없습니다/.test(`${끝?.큰 ?? ''} ${끝?.밑 ?? ''}`))
    탈.push('마지막 장에 「」가 없다');
  if (!장들.some((s) => s.분포 || s.견줌 || s.목록)) 탈.push('그림이 한 장도 없다');
  return 탈;
}

if (process.argv.includes('--selftest')) {
  const 좋은것 = [{ 큰: 'ㄱ' }, { 큰: 'ㄴ', 분포: [1, 2] }, { 큰: '' }];
  const 틀림 = [];
  if (짜임검사(좋은것).length) 틀림.push('멀쩡한 짜임을 막는다');
  if (!짜임검사([{ 큰: 'ㄱ' }, { 큰: 'ㄴ', 분포: [1] }]).length) 틀림.push('두 장짜리를 통과시킨다');
  if (!짜임검사([{ 큰: 'ㄱ' }, { 큰: 'ㄴ', 분포: [1] }, { 큰: '끝' }]).length) 틀림.push('마지막 장 규칙을 안 본다');
  if (!짜임검사([{ 큰: 'ㄱ' }, { 큰: 'ㄴ' }, { 큰: '' }]).length) 틀림.push('그림 없는 짜임을 통과시킨다');
  console.log(틀림.length ? `⛔ 자가시험 실패\n  ${틀림.join('\n  ')}` : '✅ 카드뉴스 자가시험 4건 통과');
  process.exit(틀림.length ? 1 : 0);
}

/* 카드 그리는 것은 make-cards 의 것을 그대로 쓴다 — 두 벌로 나뉘면 디자인이 갈린다 */
const 카드 = await import(path.join(뿌리, 'scripts/make-cards.mjs').replace(/\\/g, '/').replace(/^([A-Za-z]):/, 'file:///$1:'));

const 나이 = JSON.parse(readFileSync(path.join(뿌리, 'src/data/100yearmap/age-axis.json'), 'utf8'));

const 이야기들 = [
  {
    이름: 'reel-age32',
    장: [
      { 위: '백년지도', 큰: '서른둘에 사람들은', 밑: '결혼했을까요, 아직일까요',
        견줌: [{ 이름: '했다', 값: 52.5, 표시: '52.5%' }, { 이름: '아직', 값: 47.5, 표시: '47.5%' }],
        출처: '국가데이터처 「초혼부부의 연령별 혼인」 2025', 주소: '100yearmap.com/age/32' },
      { 위: '2025년에 처음 결혼한 남자 가운데', 큰: '서른둘이 가장 많았습니다',
        밑: `${카드.쉼표(나이.혼인.남편분포.값[12])}명 · 초혼 ${카드.쉼표(나이.혼인.총건)}건 가운데`,
        분포: 나이.혼인.남편분포.값, 강조칸: 12,
        출처: '국가데이터처 「초혼부부의 연령별 혼인」 2025', 주소: '100yearmap.com/age/32' },
      { 위: '그런데 봉우리 하나가 전부는 아닙니다', 큰: '스물다섯에도 마흔에도 사람이 있습니다',
        밑: '서른둘까지 한 남자는 52.5% — 절반 언저리입니다',
        분포: 나이.혼인.남편분포.값, 강조칸: -1,
        출처: '국가데이터처 「초혼부부의 연령별 혼인」 2025', 주소: '100yearmap.com/age/32' },
      { 위: '백년지도가 하지 않는 말', 큰: '',
        밑: '늦었다거나 이르다고 말하지 않습니다. 우리가 정할 자격이 없습니다',
        목록: [{ 이름: '가장 많은 나이', 값: '서른둘' }, { 이름: '맞는 나이', 값: '정하지 않습니다' }],
        출처: '백년지도 — 길을 정해 주지 않고 어디에 무엇이 있는지 보여 줍니다',
        주소: '100yearmap.com/age' },
    ],
  },
];

await mkdir(낼곳, { recursive: true });
let 센것 = 0;
for (const 이야기 of 이야기들) {
  const 탈 = 짜임검사(이야기.장);
  if (탈.length) { console.error(`⛔ ${이야기.이름} — ${탈.join(' · ')}`); process.exit(1); }

  for (const [판이름, 판형] of [['9x16', { w: 1080, h: 1920 }], ['4x5', { w: 1080, h: 1350 }]]) {
    const 장그림 = [];
    for (const [i, 장] of 이야기.장.entries()) {
      const png = await sharp(Buffer.from(카드.카드svg(판형, 장))).png().toBuffer();
      장그림.push(png);
      await sharp(png).toFile(path.join(낼곳, `${이야기.이름}-${판이름}-${i + 1}.png`));
    }
    await sharp(장그림, { join: { across: 1, animated: true } })
      .gif({ delay: [2600, 3000, 3000, 3400], loop: 0 })
      .toFile(path.join(낼곳, `${이야기.이름}-${판이름}.gif`));
    센것++;
  }
}
console.log(`✅ 카드뉴스 ${센것}편 · 장 ${이야기들[0].장.length}장씩 — ${path.relative(뿌리, 낼곳)}`);
console.log('⚠ 넘김 속도는 2.6~3.4초다. 읽는 시간이 모자라면 늘린다.');
