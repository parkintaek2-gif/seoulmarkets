/**
 * make-cardnews-100y-social-trust.mjs — 카드뉴스 「우리 사회를 얼마나 믿나」 5장
 *
 * 자료: src/data/100yearmap/social-trust-by-age.json (KOSIS 사회조사 DT_1SSSP040R, 2025년)
 * ⛔ 등수·순위 말을 쓰지 않는다. 「믿어야 한다」로 재촉하지 않는다.
 *
 * 쓰는 법  node scripts/make-cardnews-100y-social-trust.mjs [--selftest]
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { 그리기 } from './make-cardnews-100y-voc.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const 낼방 = path.join(ROOT, 'public', '100y', 'cardnews');
const 자료 = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/100yearmap/social-trust-by-age.json'), 'utf8'));

export const 갈곳 = '100yearmap.com/social-trust-by-age';
export const 바닥 = 'KOSIS 사회조사 · 2025년, 나이띠별';

const 신뢰 = (r) => Math.round((r.매우 + r.약간) * 10) / 10;
const 불신 = (r) => Math.round((r.별로 + r.전혀) * 10) / 10;

export const 나이별신뢰 = 자료.나이띠별.map((r) => ({ 띠: r.띠, 신뢰: 신뢰(r), 불신: 불신(r) }));
export const 가장불신 = 나이별신뢰.reduce((a, b) => (b.불신 > a.불신 ? b : a));
export const 가장신뢰 = 나이별신뢰.reduce((a, b) => (b.신뢰 > a.신뢰 ? b : a));
export const 전국신뢰 = 신뢰(자료.전체);

export function 짜기() {
  return [
    {
      꼴: '표지',
      큰수: `${가장불신.신뢰}%`,
      줄들: [`${가장불신.띠}만`, '「믿을 수 없다」가', '「믿을 수 있다」보다 많습니다'],
    },
    {
      머리: '나이띠마다 다릅니다',
      줄들: 나이별신뢰.map((r) => `${r.띠}   믿음 ${r.신뢰}% · 안 믿음 ${r.불신}%`),
    },
    {
      머리: `${가장불신.띠}가 유일합니다`,
      줄들: [
        `믿을 수 있음 ${가장불신.신뢰}%`,
        `믿을 수 없음 ${가장불신.불신}%`,
        '',
        '이 나이띠만 「안 믿음」이',
        '「믿음」보다 큽니다.',
      ],
    },
    {
      머리: `${가장신뢰.띠}가 가장 높습니다`,
      줄들: [
        `믿을 수 있음 ${가장신뢰.신뢰}%`,
        `전국 평균은 ${전국신뢰}%입니다.`,
        '',
        '나이가 많다고',
        '더 안 믿는 것은 아닙니다.',
      ],
    },
    {
      꼴: '마무리',
      머리: '',
      줄들: [
        '「우리 사회」 한 단어에 대한',
        '2025년 한 해의 자기응답입니다.',
        '',
        '출처 — 국가데이터처 KOSIS',
        '사회조사 DT_1SSSP040R',
      ],
    },
  ];
}

/* ── 자가시험 ─────────────────────────────────────────── */
if (process.argv.includes('--selftest')) {
  const 본다 = (말, 참) => { console.log(참 ? '✅' : '🔴', 말); if (!참) process.exitCode = 1; };
  const 장들 = 짜기();
  const 민글 = 장들.map((장, i) => 그리기(장, i + 1, 장들.length, 바닥, 갈곳)).join('\n')
    .replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');

  본다('① 다섯 장이다', 장들.length === 5);
  본다('② 표지에 큰 수(가장 불신 나이띠의 신뢰율)가 있다', 장들[0].꼴 === '표지' && 장들[0].큰수.includes(String(가장불신.신뢰)));
  본다(`③ 나이띠별 신뢰·불신이 다 실려 있다`,
    나이별신뢰.every((r) => 민글.includes(`${r.띠}`) && 민글.includes(`${r.신뢰}%`)));
  본다('④ 가장 불신하는 나이띠를 짚었다', 민글.includes(`${가장불신.띠}가 유일합니다`) || 민글.includes(가장불신.띠));
  본다('⑤ 「」로 맺는다', 민글.includes(''));
  본다('⑥ 출처가 있다', 민글.includes('DT_1SSSP040R'));
  const 금지말 = ['등수', '순위', '랭킹', '몇 위', '꼴찌', '믿어야', '믿으세요', '가야 한다', '해야 한다'];
  const 걸린 = 금지말.filter((w) => 민글.includes(w));
  본다(`⑦ ⛔ 재촉·순위말이 없다${걸린.length ? ` — ${걸린.join(' · ')}` : ''}`, 걸린.length === 0);
  본다('⑧ 🔴 모든 장에 데려갈 주소가 있다',
    장들.every((장, i) => 그리기(장, i + 1, 장들.length, 바닥, 갈곳).includes(갈곳)));
  본다('⑨ 🔴 남의 카드 주소가 안 섞였다',
    !민글.includes('100yearmap.com/care') && !민글.includes('100yearmap.com/breakfast'));

  const 댈수 = new Set([
    ...나이별신뢰.flatMap((r) => [r.신뢰, r.불신, ...(r.띠.match(/\d+/g) || [])]),
    전국신뢰, 장들.length, 40, '040',
  ].map(String));
  const 못댄것 = [...민글.split(갈곳).join(' ').matchAll(/\d[\d,]*\.?\d*/g)]
    .map((m) => m[0].replace(/,/g, '')).filter((s) => !댈수.has(s) && !/^[1-5]$/.test(s) && !/^2025$/.test(s));
  본다(`⑩ 화면의 수가 전부 자료에서 온다${못댄것.length ? ` — 못 댄 것: ${[...new Set(못댄것)].slice(0, 6).join(' · ')}` : ''}`,
    못댄것.length === 0);

  console.log(`\n가장 불신 ${가장불신.띠}(${가장불신.불신}%) · 가장 신뢰 ${가장신뢰.띠}(${가장신뢰.신뢰}%)`);
  process.exit();
}

const 내가직접불렸나 = !!process.argv[1] && path.basename(process.argv[1]) === 'make-cardnews-100y-social-trust.mjs';
if (내가직접불렸나) {
  const sharp = createRequire(path.join(ROOT, 'package.json'))('sharp');
  fs.mkdirSync(낼방, { recursive: true });
  const 장들 = 짜기();
  for (let i = 0; i < 장들.length; i++) {
    const svg = 그리기(장들[i], i + 1, 장들.length, 바닥, 갈곳);
    await sharp(Buffer.from(svg)).png().toFile(path.join(낼방, `social-trust-by-age-${i + 1}.png`));
    console.log('✅', `social-trust-by-age-${i + 1}.png`);
  }
  console.log('⛔ 주소 없는 카드는 안 만든다 — 모든 장에', 갈곳);
}
