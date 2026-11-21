/**
 * make-cardnews-100y-new-high-school.mjs — 카드뉴스 「최근 10년 새로 문 연 고등학교 84곳」 5장
 *
 * 소스 지면 — /new-high-school-by-area (NEIS 학교기본정보, 설립일 2016년 이후 고등학교)
 * ⛔ 이 카드의 수는 전부 그 지면이 쓰는 같은 거름(종류 고등학교·설립일 8자리·2016년 이후)으로 센 수다. 새로 재지 않는다.
 * ⛔ 이름·갈래를 바꾼 학교가 새 날짜로 오를 수 있다 — 카드에도 밝힌다.
 *
 * 쓰는 법  node scripts/make-cardnews-100y-new-high-school.mjs [--selftest]
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { 그리기 } from './make-cardnews-100y-voc.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const 낼방 = path.join(ROOT, 'public', '100y', 'cardnews');
const 학교 = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/100yearmap/pages-school.json'), 'utf8'));

export const 갈곳 = '100yearmap.com/new-high-school-by-area';
export const 바닥 = 'NEIS 학교기본정보 · 2016년 이후 설립 고등학교';

const 시작해 = 2016;
const 고교 = 학교.filter((x) => x.종류 === '고등학교' && /^\d{8}$/.test(String(x.설립일)));
const 해 = (x) => Number(String(x.설립일).slice(0, 4));
const 새 = 고교.filter((x) => 해(x) >= 시작해);
const 지역수 = {};
for (const x of 새) 지역수[x.지역] = (지역수[x.지역] ?? 0) + 1;
const 순 = Object.entries(지역수).sort((a, b) => b[1] - a[1]);
const 모든지역 = [...new Set(고교.map((x) => x.지역))];
const 없는곳 = 모든지역.filter((r) => !지역수[r]);
const 짧게 = (s) => s.replace('전남광주통합특별시', '전남광주').replace(/(특별자치도|특별자치시|특별시|광역시)$/, '').replace(/도$/, '');
const 올해 = 새.filter((x) => 해(x) === 2026);

export function 짜기() {
  return [
    {
      꼴: '표지',
      큰수: `${새.length}곳`,
      줄들: [`${시작해}년 이후 새로 문 연`, '고등학교입니다. (NEIS)'],
    },
    {
      머리: '어디에 생겼나',
      줄들: 순.slice(0, 5).map(([r, n]) => `${짧게(r)}  ${n}곳`),
    },
    {
      머리: '한 곳도 없는 시도',
      줄들: [`${없는곳.length}곳`, '', ...없는곳.map(짧게)],
    },
    {
      머리: `2026년 문 연 곳 ${올해.length}곳`,
      줄들: 올해.slice(0, 6).map((x) => x.title),
    },
    {
      꼴: '마무리',
      머리: '새 학교는 사람이 모이는 곳에',
      줄들: ['이름·갈래를 바꾼 학교가', '새 날짜로 섞였을 수 있습니다.', '', ''],
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
  본다('② 표지 큰 수가 지면의 수(84)다', 장들[0].큰수 === `${새.length}곳` && 새.length === 84);
  본다('③ 모든 장에 데려갈 주소가 있다',
    장들.every((장, i) => 그리기(장, i + 1, 장들.length, 바닥, 갈곳).includes(갈곳)));
  본다('④ 지역별 수를 더하면 전체다', Object.values(지역수).reduce((a, b) => a + b, 0) === 새.length);

  const 댈수 = new Set([새.length, 시작해, 없는곳.length, 올해.length, 2026, ...Object.values(지역수), 장들.length].map(String));
  const 못댄것 = [...민글.split(갈곳).join(' ').matchAll(/\d[\d,]*\.?\d*/g)]
    .map((m) => m[0].replace(/,/g, '')).filter((s) => !댈수.has(s) && !/^[1-5]$/.test(s));
  본다(`⑤ 화면의 수가 전부 자료에서 온다${못댄것.length ? ` — 못 댄 것: ${[...new Set(못댄것)].slice(0, 6).join(' · ')}` : ''}`,
    못댄것.length === 0);

  console.log(`\n새 고교 ${새.length}곳 · 없는 시도 ${없는곳.length} · 2026년 ${올해.length}곳`);
  process.exit();
}

/* 🔴 여기부터가 «부르면 도는 몸»이다 */
const 내가직접불렸나 = !!process.argv[1] && path.basename(process.argv[1]) === 'make-cardnews-100y-new-high-school.mjs';
if (내가직접불렸나) {
  const sharp = createRequire(path.join(ROOT, 'package.json'))('sharp');
  fs.mkdirSync(낼방, { recursive: true });
  const 장들 = 짜기();
  for (let i = 0; i < 장들.length; i++) {
    const svg = 그리기(장들[i], i + 1, 장들.length, 바닥, 갈곳);
    await sharp(Buffer.from(svg)).png().toFile(path.join(낼방, `새고교-${i + 1}.png`));
    console.log('✅', `새고교-${i + 1}.png`);
  }
  console.log('⛔ 주소 없는 카드는 안 만든다 — 모든 장에', 갈곳);
}
