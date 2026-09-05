#!/usr/bin/env node
/**
 * 백년지도 — **지면마다 다른 공유 카드**(1200×630 PNG).
 *
 *   node scripts/make-og-100y-pages.mjs            만든다
 *   node scripts/make-og-100y-pages.mjs --맛보기    세 장만 만들어 무게를 잰다
 *   node scripts/make-og-100y-pages.mjs --selftest  자를 시험한다
 *
 * ## 🔴 왜 (2026-08-08 12:1x · 2번 라이브 실측)
 *
 *   ```
 *   학교 지면 8장  → 서로 다른 그림 **1가지**   https://100yearmap.com/og.png
 *   지역 한 벌 6장 → 서로 다른 그림 **1가지**   같은 파일
 *   ```
 *
 *   *「누가 노원구 지면을 카톡으로 보내도 강릉여고를 보낸 사람과 똑같은 그림이 뜹니다.
 *     받는 쪽에서는 무엇을 보낸 것인지 알 수가 없습니다」*
 *
 * ## ⛔ SVG 로 두지 않는다
 *
 *   **카카오톡·X·페이스북이 SVG 를 아예 안 그린다.** 5번이 거기서 데였다(기사 36편).
 *   SVG 로 그리되 **PNG 로 구워서** 낸다. 굽는 것은 `sharp` 다.
 *
 * ## ⚠ 지면 이름만 얹지 않는다 — **그 지면의 숫자 한 개**를 크게
 *
 *   ```
 *   학교      「강릉여자고등학교 · 진학률 78.6%」
 *   지역 한 벌 「노원구 고등학교 26곳」 + 퍼짐
 *   ```
 *
 *   ⛔ 숫자를 지어내지 않는다. 자료에 없으면 **그 자리를 비우고 이름만** 쓴다.
 *   ⛔ 등수·「몇 위」를 카드에 쓰지 않는다. 지면 규칙이 카드에도 그대로 걸린다.
 *
 * ## ⚠ 어디에 두나
 *
 *   `server.mjs` 가 `100yearmap.com` 을 `dist/100y/` 로 보낸다.
 *   Astro 는 `public/*` 를 `dist/*` 로 복사하므로
 *     `public/100y/og/<이름>.png` → `https://100yearmap.com/og/<이름>.png` 다.
 *   ⛔ `public/og/` 에 두면 **서울마켓 자리**로 가서 여기서는 404 다.
 *
 * ## ⚠ 한글이 네모(두부)로 나오면 글꼴을 못 찾은 것이다
 *
 *   sharp 는 시스템 글꼴로 그린다. 만든 뒤 **한 장을 눈으로 본다.**
 */
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';   /* 🔴 [2026-09-06] 직접 실행 판정에 쓴다 — 남의 자가시험을 삼키지 않으려고 */
/* 🔴 규칙은 한 곳에 있다. 카드도 **같은 값**을 불러 쓴다 */
import { 최소분모 } from '../src/lib/school-rules.ts';

const ROOT = path.resolve(
  path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1'),
  '..',
);
const 낼방 = path.join(ROOT, 'public', '100y', 'og');
const 자료방 = path.join(ROOT, 'src', 'data', '100yearmap');

/** 지면과 같은 값이다. `public/100y/style.css` 의 토큰을 옮겨 적었다 */
const 색 = {
  바탕: '#12151c',
  결: '#1a1e27',
  금: '#c9a84c',
  금연한: '#e8d9a8',
  글: '#e9e9ee',
  흐림: '#9aa0ac',
  선: '#262b36',
};
const 고딕 = "'Malgun Gothic','맑은 고딕','Noto Sans KR',sans-serif";
const 명조 = "'Noto Serif KR','Batang','바탕',serif";

/** XML 에 그대로 넣으면 깨지는 글자를 막는다. ⛔ 학교 이름에 & 가 들어 있을 수 있다 */
export function 안전하게(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * 긴 이름을 두 줄로 자른다. **글자 수로 자른다** — 한글은 대개 폭이 고르다.
 * ⚠ 두 줄을 넘으면 뒤를 「…」로 줄인다. 카드 밖으로 나가면 아무것도 안 보인다.
 */
export function 줄나누기(글, 한줄 = 13, 최대줄 = 2) {
  const s = String(글 ?? '').trim();
  const 줄 = [];
  for (let i = 0; i < s.length; i += 한줄) 줄.push(s.slice(i, i + 한줄));
  if (줄.length <= 최대줄) return 줄;
  const 자른 = 줄.slice(0, 최대줄);
  자른[최대줄 - 1] = 자른[최대줄 - 1].slice(0, 한줄 - 1) + '…';
  return 자른;
}

/** 파일 이름에 쓸 수 없는 글자를 바꾼다. ⚠ 윈도우는 `\ / : * ? " < > |` 를 못 쓴다 */
export const 파일이름 = (s) => String(s ?? '').replace(/[\\/:*?"<>|]/g, '_');

/**
 * 카드 한 장의 SVG.
 * @param {{딱지:string, 이름:string, 수?:string|null, 수말?:string|null, 밑?:string|null}} 값
 */
export function 카드SVG(값) {
  const 줄 = 줄나누기(값.이름);
  const 이름크기 = 줄.length > 1 ? 58 : 68;
  const 이름y = 값.수 ? 250 : 300;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${색.바탕}"/>
  <rect x="0" y="0" width="1200" height="8" fill="${색.금}"/>
  <text x="80" y="96" font-family="${명조}" font-size="30" font-weight="bold" fill="${색.금}">백년지도</text>
  <text x="228" y="96" font-family="${고딕}" font-size="22" fill="${색.흐림}">${안전하게(값.딱지)}</text>
  <line x1="80" y1="132" x2="1120" y2="132" stroke="${색.선}" stroke-width="1"/>
  ${줄
    .map(
      (t, i) =>
        `<text x="80" y="${이름y + i * (이름크기 + 12)}" font-family="${고딕}" font-size="${이름크기}" font-weight="bold" fill="${색.글}">${안전하게(t)}</text>`,
    )
    .join('\n  ')}
  ${
    값.수
      ? `<text x="80" y="470" font-family="${명조}" font-size="104" font-weight="bold" fill="${색.금연한}">${안전하게(값.수)}</text>
  <text x="80" y="522" font-family="${고딕}" font-size="26" fill="${색.흐림}">${안전하게(값.수말 ?? '')}</text>`
      : ''
  }
  ${값.밑 ? `<text x="80" y="580" font-family="${고딕}" font-size="24" fill="${색.흐림}">${안전하게(값.밑)}</text>` : ''}
</svg>`;
}

/* ── 자를 시험한다 ────────────────────────────────────────────── */
function 셀프테스트() {
  const 검사 = [];
  const 확인 = (이름, 실제, 기대) => 검사.push({ 이름, 통과: JSON.stringify(실제) === JSON.stringify(기대) });

  확인('짧은 이름은 한 줄', 줄나누기('노원구'), ['노원구']);
  확인('긴 이름은 두 줄', 줄나누기('가나다라마바사아자차카타파하거너더'), ['가나다라마바사아자차카타파', '하거너더']);
  확인('⭐ 두 줄을 넘으면 줄인다', 줄나누기('가'.repeat(60)).length, 2);
  확인('⭐ 줄이면 … 가 붙는다', 줄나누기('가'.repeat(60))[1].endsWith('…'), true);
  확인('빈 이름', 줄나누기(''), []);

  확인('⭐ & 를 막는다', 안전하게('A&B'), 'A&amp;B');
  확인('< 를 막는다', 안전하게('<b>'), '&lt;b&gt;');
  확인('null 은 빈 글', 안전하게(null), '');

  확인('파일 이름에서 / 를 바꾼다', 파일이름('가/나'), '가_나');
  확인('⭐ 한글은 그대로 둔다', 파일이름('서울특별시-강동구'), '서울특별시-강동구');

  const svg = 카드SVG({ 딱지: '학교', 이름: '강릉여자고등학교', 수: '78.6%', 수말: '진학률', 밑: '강원' });
  확인('SVG 가 1200×630', /width="1200" height="630"/.test(svg), true);
  확인('⭐ 수가 들어간다', svg.includes('78.6%'), true);
  const 수없음 = 카드SVG({ 딱지: '학교', 이름: '아무고', 수: null });
  확인('⭐ 수가 없으면 그 자리를 비운다', /font-size="104"/.test(수없음), false);

  for (const c of 검사) console.log(`${c.통과 ? '✅' : '⛔'} ${c.이름}`);
  const 실패 = 검사.filter((c) => !c.통과).length;
  console.log(`\n검사 ${검사.length}개 · 실패 ${실패}개`);
  process.exit(실패 ? 1 : 0);
}

/* ── 무엇을 그릴지 모은다 ────────────────────────────────────── */

const 읽 = (f) => JSON.parse(fs.readFileSync(path.join(자료방, f), 'utf8'));

function 그릴것모으기() {
  const 학교들 = 읽('pages-school.json');
  const 진로 = 읽('school-career.json');
  const 중단 = 읽('school-dropout.json');
  const 지역 = 읽('areas.json');

  const 진로표 = new Map(진로.자료.map((r) => [r.code, r]));
  const 중단표 = new Map(중단.자료.map((r) => [r.code, r]));

  const 목록 = [];

  /* ① 파는 114장이 먼저다 — 2번 지시 */
  for (const a of 지역.단위) {
    목록.push({
      갈래: a.한벌로팔만한가 ? '지역-파는' : '지역-무료',
      이름파일: 파일이름(`area-${a.slug}`),
      딱지: '지역 한 벌',
      이름: `${a.이름} 고등학교`,
      수: `${a.곳}곳`,
      수말: '한 장에 모았습니다',
      밑: a.시도,
    });
  }

  /* ② 학교 — **숫자가 있는 곳만** 수를 넣는다 */
  for (const s of 학교들) {
    const r = 진로표.get(s.code);
    const d = 중단표.get(s.code);
    let 수 = null;
    let 수말 = null;
    if (r?.진학률 != null) {
      수 = `${r.진학률}%`;
      수말 = `졸업생 ${r.졸업자.toLocaleString()}명 중 진학`;
    } else if (d?.재학생 != null && d.재학생 >= 최소분모) {
      /**
       * ⚠ **작은 수는 카드에 크게 쓰지 않는다.** 맛보기에서 「3명」이 큼직하게 나왔다 —
       *   사실이지만 카드로 보면 오해를 산다(폐교 직전으로 읽힌다).
       *   ⛔ 그 학교를 숨기는 것이 아니다. **수를 빼고 이름만** 둔다.
       *   경계는 지면과 같은 `최소분모`(30명)다 — 여기 따로 적지 않는다.
       */
      수 = `${d.재학생.toLocaleString()}명`;
      수말 = '재학생';
    }
    목록.push({
      갈래: '학교',
      이름파일: 파일이름(`school-${s.code}`),
      딱지: [s.지역, s.고교유형].filter(Boolean).join(' · '),
      이름: s.title,
      수,
      수말,
      밑: 수 ? null : '백년지도에서 이 학교를 봅니다',
    });
  }

  return 목록;
}

/* ── 굽는다 ──────────────────────────────────────────────────── */

async function 본일() {
  const 맛보기 = process.argv.includes('--맛보기');
  fs.mkdirSync(낼방, { recursive: true });

  let 목록 = 그릴것모으기();
  const 셈 = new Map();
  for (const x of 목록) 셈.set(x.갈래, (셈.get(x.갈래) ?? 0) + 1);
  console.log('그릴 것 —', [...셈.entries()].map(([k, v]) => `${k} ${v}`).join(' · '), `· 합 ${목록.length}`);

  if (맛보기) {
    목록 = [
      목록.find((x) => x.갈래 === '지역-파는'),
      목록.find((x) => x.갈래 === '지역-무료'),
      목록.find((x) => x.갈래 === '학교' && x.수),
      목록.find((x) => x.갈래 === '학교' && !x.수),
    ].filter(Boolean);
    console.log('⚠ 맛보기 — 네 장만 굽는다');
  }

  let 만듦 = 0;
  let 바이트 = 0;
  for (const x of 목록) {
    /**
     * ⚠ **팔레트 PNG 로 굽는다.** 2,500장이 넘으니 한 장 무게가 그대로 저장소 무게가 된다.
     *   색이 예닐곱 가지뿐이라 팔레트로 줄여도 눈으로 차이가 없다.
     */
    const png = await sharp(Buffer.from(카드SVG(x)))
      .png({ palette: true, colors: 32, compressionLevel: 9 })
      .toBuffer();
    fs.writeFileSync(path.join(낼방, `${x.이름파일}.png`), png);
    만듦++;
    바이트 += png.length;
    if (!맛보기 && 만듦 % 500 === 0) console.log(`  … ${만듦}/${목록.length}`);
  }

  const 메가 = (바이트 / 1024 / 1024).toFixed(1);
  console.log(`\n✅ ${만듦}장 · 합 ${메가}MB · 한 장 평균 ${Math.round(바이트 / 만듦 / 1024)}KB`);
  console.log(`   ${path.relative(ROOT, 낼방)}`);
}

/* 🔴 [2026-09-06] 직접 실행일 때만 돈다 — make-og-100y-topics.mjs 가 이 파일을 import 한다.
   실측: node scripts/make-og-100y-topics.mjs --selftest → 이 파일 시험이 대신 떴다. */
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  && process.argv.includes('--selftest')) 셀프테스트();
else await 본일();
