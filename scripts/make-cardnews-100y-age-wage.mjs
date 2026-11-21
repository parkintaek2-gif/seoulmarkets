/**
 * make-cardnews-100y-age-wage.mjs — 카드뉴스 「월급은 언제 가장 많을까요」 6장
 *
 * 🔴 8/17 예약분(docs/3번-콘텐트-예약-0817~0820.md). 자료는 이미 손에 있는 age-axis.json 이다.
 * ⛔ 지켜야 할 말 —
 *   · 나이를 줄세우지 않는다. 「몇 살에 얼마 벌어야 한다」를 쓰지 않는다
 *   · 근속은 「그 일을 몇 년 했나」가 아니라 **「지금 회사에 몇 년 다녔나」**다
 *   · 화면의 수는 전부 자료에서 온다
 *
 * 쓰는 법  node scripts/make-cardnews-100y-age-wage.mjs [--selftest]
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { 그리기 } from './make-cardnews-100y-voc.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const 낼방 = path.join(ROOT, 'public', '100y', 'cardnews');
const 자료 = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/100yearmap/age-axis.json'), 'utf8'));

export const 갈곳 = '100yearmap.com/age';
export const 바닥 = `${자료.출처.임금.해}년 · ${자료.출처.임금.기관} · 나이를 줄세우지 않습니다`;

/** ⛔ 「전체」 칸은 나이띠가 아니라 합이다. 표에서 뺀다 */
export const 띠들 = Object.entries(자료.임금)
  .filter(([띠]) => 띠 !== '전체')
  .map(([띠, v]) => ({ 띠, 만원: Math.round(v.월급여천원 / 10), 근속년: v.근속년 }));
export const 꼭대기 = [...띠들].sort((a, b) => b.만원 - a.만원)[0];
export const 오래다닌곳 = [...띠들].sort((a, b) => b.근속년 - a.근속년)[0];
export const 마지막 = 띠들[띠들.length - 1];

export function 짜기() {
  return [
    {
      꼴: '표지',
      큰수: `${꼭대기.만원.toLocaleString()}만원`,
      줄들: ['월급이 가장 많은 나이띠의', '한 달 월급여입니다.'],
    },
    {
      머리: '나이띠로 보면',
      줄들: 띠들.slice(2, 8).map((r) => `${r.띠}  ${r.만원.toLocaleString()}만원`),
    },
    {
      머리: '꼭대기는 여기입니다',
      줄들: [
        `${꼭대기.띠}  ${꼭대기.만원.toLocaleString()}만원`,
        '',
        `그리고 ${마지막.띠}는`,
        `${마지막.만원.toLocaleString()}만원입니다.`,
      ],
    },
    {
      머리: '한 자리에 오래 다니는 나이',
      줄들: [
        `${오래다닌곳.띠}  ${오래다닌곳.근속년}년`,
        '',
        '⚠ 「그 일을 몇 년 했나」가 아니라',
        '「지금 회사에 몇 년 다녔나」입니다.',
        // ⚠ 「0부터 셉니다」로 썼더니 자가시험이 «0» 을 「자료에 없는 수」로 셌다. 맞는 지적이다 —
        //    자료의 값이 아니라 말이다. 수를 빼고 말로만 적는다
        '옮기면 처음부터 다시 셉니다.',
      ],
    },
    {
      머리: '⛔ 이것은 목표가 아닙니다',
      줄들: [
        '몇 살에 얼마를 벌어야 한다고',
        '말하지 않습니다.',
        '',
        '같은 나이의 사람들이 실제로',
        '어떤 자리에 있나를 적을 뿐입니다.',
      ],
    },
    {
      꼴: '마무리',
      머리: '',
      줄들: [
        '가장 많은 자리가',
        '곧 맞는 자리는 아닙니다.',
        '',
        `출처 — ${자료.출처.임금.기관}`,
        `${자료.출처.임금.해}년 · ${자료.출처.임금.조건}`,
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

  본다('① 여섯 장이다', 장들.length === 6);
  const 등수말 = ['등수', '순위', '랭킹', '몇 위', '상위권', '하위권'].filter((w) => 민글.includes(w));
  본다(`② ⛔ 등수·순위를 쓰지 않는다${등수말.length ? ` — ${등수말.join(' · ')}` : ''}`, 등수말.length === 0);
  const 훈수 = ['벌어야', '해야 합니다', '늦었다', '준비하세요'].filter((w) => 민글.replace('벌어야 한다고', '').includes(w));
  본다(`③ 🔴 훈수를 두지 않는다${훈수.length ? ` — ${훈수.join(' · ')}` : ''}`, 훈수.length === 0);
  본다('④ 🔴 근속의 뜻을 밝힌다', 민글.includes('지금 회사에 몇 년 다녔나'));
  본다('⑤ 「통계이지 당신이 아니다」를 적는다', 민글.includes('통계이지 당신이 아닙니다'));
  본다('⑥ 🔴 모든 장에 데려올 주소가 있다',
    장들.every((장, i) => 그리기(장, i + 1, 장들.length, 바닥, 갈곳).includes(갈곳)));
  본다('⑦ 🔴 남의 카드 주소(/work)가 안 섞였다', !민글.includes('100yearmap.com/work'));

  const 띠속수 = 띠들.flatMap((r) => (String(r.띠).match(/\d+/g) || []).map(Number));
  const 댈수 = new Set([...띠속수, ...띠들.flatMap((r) => [r.만원, r.근속년]),
    Number(자료.출처.임금.해), 장들.length].filter((v) => v != null).map(String));
  const 못댄것 = [...민글.split(갈곳).join(' ').matchAll(/\d[\d,]*\.?\d*/g)]
    .map((m) => m[0].replace(/,/g, '')).filter((s) => !댈수.has(s) && !/^[1-6]$/.test(s));
  본다(`⑧ 화면의 수가 전부 자료에서 온다${못댄것.length ? ` — 못 댄 것: ${[...new Set(못댄것)].slice(0, 6).join(' · ')}` : ''}`,
    못댄것.length === 0);

  console.log(`\n꼭대기 ${꼭대기.띠} ${꼭대기.만원}만원 · 오래 다닌 곳 ${오래다닌곳.띠} ${오래다닌곳.근속년}년`);
  process.exit();
}

/* 🔴 여기부터가 «부르면 도는 몸»이다 — 남이 불러 글만 얻어 갈 수 있게 감싼다(8/16 규칙) */
const 내가직접불렸나 = !!process.argv[1] && path.basename(process.argv[1]) === 'make-cardnews-100y-age-wage.mjs';
if (내가직접불렸나) {
  const sharp = createRequire(path.join(ROOT, 'package.json'))('sharp');
  fs.mkdirSync(낼방, { recursive: true });
  const 장들 = 짜기();
  for (let i = 0; i < 장들.length; i++) {
    const svg = 그리기(장들[i], i + 1, 장들.length, 바닥, 갈곳);
    await sharp(Buffer.from(svg)).png().toFile(path.join(낼방, `월급꼭대기-${i + 1}.png`));
    console.log('✅', `월급꼭대기-${i + 1}.png`);
  }
  console.log('⛔ 주소 없는 카드는 안 만든다 — 모든 장에', 갈곳);
}
