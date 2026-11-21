#!/usr/bin/env node
/**
 * 카드 굽기 — **밖으로 나갈 것은 글자만으로는 안 된다.**
 *
 * 사장님 지시(2026-08-07): 「외부유입 콘텐트에 텍스트만 있으면 안 되겠지?
 *   콘텐트를 다양화해서 서비스를 해. **스레드, 인스타, 유튜브, X** 등 유의미한 사이트에
 *   콘텐트를 생산, 배포해」
 *
 * ── 무엇을 굽나 ────────────────────────────────────────────────
 *   1080×1350  인스타그램·스레드 (세로 4:5 — 타임라인에서 가장 크게 잡힌다)
 *   1080×1920  쇼츠·릴스 표지 (9:16)
 *   1200×675   X·카카오톡 (16:9)
 * 한 사실당 세 벌을 굽는다. 손으로 다시 만들지 않는다.
 *
 * ── 무엇을 담나 ────────────────────────────────────────────────
 * ⛔ 예쁜 그림이 아니다. **숫자 하나와 그 숫자가 선 자리**다.
 * ✅ 분포를 그린다 — 우리 강령이 「」다. 카드에서도 지킨다
 * ✅ 출처를 카드 안에 넣는다. 밖으로 나간 그림은 우리 지면을 떠나서도 혼자 서 있어야 한다
 * ✅ 주소를 넣는다. 그림만 퍼지고 사람이 안 오면 유입이 아니다
 *
 * 쓰는 법
 *   node scripts/make-cards.mjs            archive/cards/ 에 굽는다
 *   node scripts/make-cards.mjs --selftest 글자·숫자 규칙을 검산한다
 */
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 낼곳 = path.join(뿌리, 'archive/cards');

/** 글자를 SVG 에 그대로 넣으면 &·< 가 XML 을 깬다 */
export function 안전글(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** 숫자를 사람이 읽는 말로. 카드에는 자릿점을 찍는다 */
export function 쉼표(n) {
  return Number(n).toLocaleString('ko-KR');
}

/** 분포 막대 — 값이 있는 데까지만 그린다. 빈칸을 0 으로 채우면 거짓 그래프가 된다 */
export function 막대들(값, { 폭, 높이, 강조칸 }) {
  const 최대 = Math.max(...값);
  const 칸 = 폭 / 값.length;
  return 값
    .map((v, i) => {
      const h = Math.round((v / 최대) * 높이);
      const 색 = i === 강조칸 ? '#c9a84c' : '#2e3545';
      return `<rect x="${(i * 칸).toFixed(1)}" y="${높이 - h}" width="${(칸 - 3).toFixed(1)}" height="${h}" rx="3" fill="${색}"/>`;
    })
    .join('');
}

if (process.argv.includes('--selftest')) {
  const 틀림 = [];
  if (안전글('a&b<c') !== 'a&amp;b&lt;c') 틀림.push('안전글이 XML 을 안 지킨다');
  if (쉼표(20630) !== '20,630') 틀림.push('쉼표가 안 찍힌다');
  const m = 막대들([1, 2, 3], { 폭: 300, 높이: 100, 강조칸: 2 });
  if ((m.match(/<rect/g) || []).length !== 3) 틀림.push('막대 개수가 다르다');
  if (!m.includes('#c9a84c')) 틀림.push('강조 칸이 금색이 아니다');
  if (막대들([5, 5], { 폭: 100, 높이: 50, 강조칸: -1 }).includes('#c9a84c')) 틀림.push('강조가 없는데 금색이 나온다');

  /* 줄나눔 — **잘리게 두지 않는다**가 이 도구의 약속이다. 여기가 무너지면 카드가 잘려 나간다 */
  const 긴글 = '예순에 스물다섯으로 돌아옵니다 그리고 더 길게 이어지는 문장';
  const 줄 = 줄나눔(긴글, 60, 900);
  if (줄.join(' ') !== 긴글) 틀림.push('줄나눔이 글자를 잃는다');
  for (const s of 줄) if (글자폭(s, 60) > 900) 틀림.push(`줄이 넘친다: ${s}`);
  const 한낱말 = 줄나눔('가나다라마바사아자차카타파하가나다라마바사', 60, 300);
  if (한낱말.length < 2) 틀림.push('띄어쓰기 없는 긴 낱말을 안 자른다');
  if (줄나눔('', 40, 500).length !== 0) 틀림.push('빈 글에서 줄이 생긴다');
  if (글자폭('가', 40) <= 글자폭('a', 40)) 틀림.push('한글이 라틴보다 좁게 잡힌다');

  /* 차이말 — 눈대중으로 「두 배쯤?」 하게 두지 않는다 */
  if (차이말(72.2, 10.2, true) !== '7.1배 · 62.0%p 차이') 틀림.push('퍼센트 차이말이 다르다: ' + 차이말(72.2, 10.2, true));
  if (차이말(100, 5) !== '20배 차이') 틀림.push('열 배 넘으면 소수점을 뗀다');
  if (차이말(5, 0) !== null) 틀림.push('0 으로 나눈다');
  if (차이말(52.5, 47.5) !== null) 틀림.push('반반인 것에 차이 배지를 붙인다');
  if (차이말(52.5, 47.5, true) !== null) 틀림.push('5%p 차이에 배지를 붙인다');
  if (차이말(60, 45, true) === null) 틀림.push('15%p 차이를 안 적는다');

  console.log(틀림.length ? `⛔ 자가시험 실패\n  ${틀림.join('\n  ')}` : `✅ 카드 굽기 자가시험 ${5 + 4 + 6}건 통과`);
  process.exit(틀림.length ? 1 : 0);
}

/* ── 카드 한 장 ─────────────────────────────────────────────── */
const 판 = {
  세로: { w: 1080, h: 1350, 이름: '4x5' },   // 인스타·스레드
  긴세로: { w: 1080, h: 1920, 이름: '9x16' }, // 쇼츠·릴스 표지
  가로: { w: 1200, h: 675, 이름: '16x9' },    // X·카카오톡
};

/**
 * 두 값을 나란히 놓는 꼴 — 「엄마 72.2% · 아빠 10.2%」처럼 **차이가 이야기인 것**에 쓴다.
 * ⚠ 두 막대의 자를 **같게** 둔다. 각자 최대에 맞춰 그리면 차이가 사라진다.
 */
/**
 * 몇 배·몇 %p 인지 사람이 읽는 말로. **차이를 눈이 아니라 글자로도 준다.**
 * ⚠ 퍼센트끼리는 「몇 배」와 「몇 %p」가 다른 말이다. 둘 다 적는다.
 */
export function 차이말(a, b, 퍼센트 = false) {
  const 큰 = Math.max(a, b), 작 = Math.min(a, b);
  if (!작) return null;
  const 배 = 큰 / 작;
  /* ⛔ **차이가 작으면 아무 말도 하지 않는다.**
     52.5% 대 47.5% 에 「1.1배 차이」를 붙이면 반반인 것을 차이가 있는 것처럼 만든다.
     그건 우리가 하지 않기로 한 일이다 — 없는 이야기를 그림으로 만드는 것. */
  if (배 < 1.3 && !(퍼센트 && 큰 - 작 >= 10)) return null;
  const 배말 = 배 >= 10 ? `${Math.round(배)}배` : `${배.toFixed(1)}배`;
  return 퍼센트 ? `${배말} · ${(큰 - 작).toFixed(1)}%p 차이` : `${배말} 차이`;
}

export function 견줌막대(둘, { 폭, 높이, 글꼴 = 'Malgun Gothic, sans-serif', 글자 = 34, 퍼센트 = false }) {
  const 최대 = Math.max(...둘.map((d) => d.값));
  const 칸 = 폭 / 둘.length;
  /* ⚠ **막대를 굵게 두지 않는다.** 가로로 굵으면 그림이 둔해 보인다(사장님 지적 2026-08-07).
     칸의 3분의 1 남짓, 그리고 폭에 위쪽 한도를 둔다 — 두 개짜리 카드에서 특히 두꺼워진다. */
  const 바폭 = Math.min(칸 * 0.34, 폭 * 0.11);
  const 그림 = 둘
    .map((d, i) => {
      const h = Math.round((d.값 / 최대) * 높이);
      const 가운데x = i * 칸 + 칸 / 2;
      const 왼 = 가운데x - 바폭 / 2;
      const 색 = i === 0 ? '#c9a84c' : '#3a4150';
      return (
        `<rect x="${왼.toFixed(0)}" y="${높이 - h}" width="${바폭.toFixed(0)}" height="${h}" rx="4" fill="${색}"/>` +
        /* 꼭대기 선 — 값이 어디서 끝나는지 눈이 바로 잡는다 */
        `<rect x="${(왼 - 바폭 * 0.28).toFixed(0)}" y="${(높이 - h - 5).toFixed(0)}" width="${(바폭 * 1.56).toFixed(0)}" height="5" rx="2.5" fill="${i === 0 ? '#e8d9a8' : '#7c8696'}"/>` +
        `<text x="${가운데x.toFixed(0)}" y="${높이 + Math.round(글자 * 1.35)}" text-anchor="middle" font-family="${글꼴}" font-size="${글자}" fill="#9aa0ac">${안전글(d.이름)}</text>` +
        `<text x="${가운데x.toFixed(0)}" y="${높이 - h - Math.round(글자 * 0.75)}" text-anchor="middle" font-family="${글꼴}" font-weight="700" font-size="${Math.round(글자 * 1.15)}" fill="#e9e9ee">${안전글(d.표시 ?? d.값)}</text>`
      );
    })
    .join('');

  /* 둘일 때는 **차이를 글자로도** 준다. 눈대중으로 「두 배쯤?」 하게 두지 않는다 */
  if (둘.length !== 2) return 그림;
  const 말 = 차이말(둘[0].값, 둘[1].값, 퍼센트);
  if (!말) return 그림;
  const 가운데 = 폭 / 2;
  const 위 = Math.round(높이 - (Math.max(둘[0].값, 둘[1].값) / 최대) * 높이) - Math.round(글자 * 2.2);
  /* ⚠ 배지 폭을 **글자를 재서** 잡는다. 어림해 두었더니 글자가 배지 밖으로 삐져나왔다 */
  const 말크기 = Math.round(글자 * 0.88);
  const 배지폭 = Math.round(글자폭(말, 말크기) + 말크기 * 1.6);
  const 배지높이 = Math.round(말크기 * 1.9);
  return (
    그림 +
    `<line x1="${(칸 / 2).toFixed(0)}" y1="${위 + 8}" x2="${(폭 - 칸 / 2).toFixed(0)}" y2="${위 + 8}" stroke="#5a6272" stroke-width="2" stroke-dasharray="6 6"/>` +
    `<rect x="${(가운데 - 배지폭 / 2).toFixed(0)}" y="${(위 + 8 - 배지높이 / 2).toFixed(0)}" width="${배지폭}" height="${배지높이}" rx="${Math.round(배지높이 / 2)}" fill="#0b0d12" stroke="#5a6272" stroke-width="2"/>` +
    `<text x="${가운데.toFixed(0)}" y="${(위 + 8 + 말크기 * 0.36).toFixed(0)}" text-anchor="middle" font-family="${글꼴}" font-weight="700" font-size="${말크기}" fill="#e8d9a8">${안전글(말)}</text>`
  );
}

/** 목록 꼴 — 위아래 몇 줄을 그대로 보여 준다. 「가져가 쓸 수 있게」의 가장 싼 형태다 */
export function 목록줄(줄들, { 폭, 줄높이, 글꼴 = 'Malgun Gothic, sans-serif' }) {
  return 줄들
    .map((r, i) => {
      const y = i * 줄높이;
      return (
        `<text x="0" y="${y}" font-family="${글꼴}" font-size="${Math.round(줄높이 * 0.52)}" fill="#e9e9ee">${안전글(r.이름)}</text>` +
        `<text x="${폭}" y="${y}" text-anchor="end" font-family="Malgun Gothic, sans-serif" font-weight="700" font-size="${Math.round(줄높이 * 0.52)}" fill="#c9a84c">${안전글(r.값)}</text>` +
        `<line x1="0" y1="${y + 그림자(줄높이)}" x2="${폭}" y2="${y + 그림자(줄높이)}" stroke="#232833" stroke-width="1"/>`
      );
    })
    .join('');
}
const 그림자 = (줄높이) => Math.round(줄높이 * 0.22);

/**
 * 글자 폭을 어림한다 — SVG 는 글자를 재 주지 않아 우리가 세야 한다.
 * 한글·한자·전각은 글자 크기만큼, 라틴 소문자는 그 절반 남짓 차지한다.
 */
export function 글자폭(글, 크기) {
  let 폭 = 0;
  for (const c of String(글)) {
    const code = c.codePointAt(0);
    const 넓은글자 = code > 0x1100 && !(code >= 0x2000 && code <= 0x206f);
    폭 += 크기 * (넓은글자 ? 1.0 : /[A-Z0-9]/.test(c) ? 0.62 : c === ' ' ? 0.28 : 0.52);
  }
  return 폭;
}

/**
 * 줄을 나눈다 — **잘리게 두지 않는다.**
 * ⚠ 한글은 띄어쓰기가 드물어 낱말 단위로만 나누면 한 줄이 넘친다. 그럴 땐 글자로 자른다.
 */
export function 줄나눔(글, 크기, 최대폭) {
  const 줄 = [];
  let 지금 = '';
  for (const 낱말 of String(글).split(' ')) {
    const 후보 = 지금 ? `${지금} ${낱말}` : 낱말;
    if (글자폭(후보, 크기) <= 최대폭) { 지금 = 후보; continue; }
    if (지금) 줄.push(지금);
    // 낱말 하나가 한 줄보다 길면 글자로 자른다
    let 조각 = '';
    for (const c of 낱말) {
      if (글자폭(조각 + c, 크기) > 최대폭) { 줄.push(조각); 조각 = c; } else 조각 += c;
    }
    지금 = 조각;
  }
  if (지금) 줄.push(지금);
  return 줄;
}

/** 여러 줄을 그린다. 그리고 **다음 것이 놓일 y** 를 돌려준다 — 빈칸이 생기지 않게 */
function 여러줄(글, { x, y, 크기, 최대폭, 글꼴, 색, 굵기 = 400, 줄간격 = 1.32, 가운데 = true }) {
  const 줄 = 줄나눔(글, 크기, 최대폭);
  const 그림 = 줄
    .map((s, i) => `<text x="${가운데 ? Math.round(x + 최대폭 / 2) : x}" y="${Math.round(y + 크기 * (1 + 줄간격 * i))}"${가운데 ? ' text-anchor="middle"' : ''} font-family="${글꼴}" font-weight="${굵기}" font-size="${크기}" fill="${색}">${안전글(s)}</text>`)
    .join('');
  return { 그림, 끝y: Math.round(y + 크기 * (1 + 줄간격 * (줄.length - 1))) };
}

/**
 * 카드 한 장.
 *
 * ⚠ **자리를 비율로 못 박지 않는다.** 4:5 에 맞춰 놓은 비율을 9:16 에 쓰면
 *   가운데가 텅 빈다(사장님이 두 번째 카드에서 바로 잡으셨다).
 *   위에서부터 **흐르게** 쌓고, 남는 자리를 그림이 채우고, 출처·주소만 바닥에 붙인다.
 */
export function 카드svg({ w, h }, 카드) {
  const { 위, 큰, 밑, 분포, 강조칸, 출처, 주소, 견줌, 목록, 영문 } = 카드;
  const 여백 = Math.round(w * 0.075);
  const 안폭 = w - 여백 * 2;
  const 본문글꼴 = 영문 ? 'Segoe UI, Arial, sans-serif' : 'Malgun Gothic, sans-serif';
  const 제목글꼴 = 영문 ? 'Georgia, serif' : 'Batang, Malgun Gothic, serif';

  // 제목 크기는 **줄 수로 정한다.** 두 줄에 들어오는 가장 큰 크기를 고른다
  let 큰크기 = Math.round(w * 0.095);
  while (큰크기 > w * 0.045 && 줄나눔(큰, 큰크기, 안폭).length > 2) 큰크기 -= 2;

  const 조각 = [];
  let y = Math.round(h * 0.085);

  const 라벨 = 여러줄(위, { x: 여백, y, 크기: Math.round(w * 0.033), 최대폭: 안폭, 글꼴: 본문글꼴, 색: '#9aa0ac' });
  조각.push(라벨.그림);
  y = 라벨.끝y + Math.round(h * 0.045);

  const 제목 = 여러줄(큰, { x: 여백, y, 크기: 큰크기, 최대폭: 안폭, 글꼴: 제목글꼴, 색: '#e9e9ee', 굵기: 900, 줄간격: 1.24 });
  조각.push(제목.그림);
  y = 제목.끝y + Math.round(h * 0.035);

  const 부제 = 여러줄(밑, { x: 여백, y, 크기: Math.round(w * 0.046), 최대폭: 안폭, 글꼴: 본문글꼴, 색: '#bf9d45', 줄간격: 1.45 });
  조각.push(부제.그림);
  y = 부제.끝y;

  // 바닥에 붙는 것 — 출처·주소
  const 주소크기 = Math.round(w * 0.030);
  const 출처크기 = Math.round(w * 0.023);
  const 바닥y = h - 여백;
  const 출처y = 바닥y - Math.round(주소크기 * 1.9);
  const 남은위 = y + Math.round(h * 0.03);
  const 남은아래 = 출처y - Math.round(h * 0.06);
  const 남은높이 = Math.max(Math.round(h * 0.08), 남은아래 - 남은위);

  /* ⚠ 남는 자리에 **그림을 가운데로** 놓는다.
     위에 붙여 놓으면 9:16 처럼 긴 판에서 아래가 통째로 빈다 —
     사장님이 두 번째 카드에서 바로 잡으신 것이 그것이다. */
  const 가운데 = (그림높이) => 남은위 + Math.max(0, Math.round((남은높이 - 그림높이) / 2));

  if (분포) {
    const 말높이 = Math.round(w * 0.055);
    const 그래프높이 = Math.min(남은높이 - 말높이, Math.round(h * 0.20));
    const 시작 = 가운데(그래프높이 + 말높이);
    조각.push(`<g transform="translate(${여백}, ${시작})">${막대들(분포, { 폭: 안폭, 높이: 그래프높이, 강조칸 })}</g>`);
    조각.push(`<text x="${여백}" y="${시작 + 그래프높이 + Math.round(w * 0.045)}" font-family="${본문글꼴}" font-size="${Math.round(w * 0.025)}" fill="#8e95a1">${안전글(카드.그래프말 ?? '스무 살에서 마흔넷까지 · 금색이 그 나이입니다')}</text>`);
  } else if (견줌) {
    const 이름높이 = Math.round(w * 0.06);
    const 그래프높이 = Math.min(남은높이 - 이름높이 - Math.round(w * 0.06), Math.round(h * 0.22));
    const 시작 = 가운데(그래프높이 + 이름높이) + Math.round(w * 0.05);
    조각.push(`<g transform="translate(${여백}, ${시작})">${견줌막대(견줌, { 폭: 안폭, 높이: 그래프높이, 글꼴: 본문글꼴, 글자: Math.round(w * 0.030), 퍼센트: !!카드.퍼센트 })}</g>`);
  } else if (목록) {
    const 줄높이 = Math.min(Math.round(남은높이 / 목록.length), Math.round(w * 0.085));
    const 시작 = 가운데(줄높이 * 목록.length);
    /* 표도 가운데 맞춤이다(사장님 지시). 안폭보다 좁게 잡아 판 한가운데에 세운다 */
    const 표폭 = Math.round(안폭 * 0.86);
    const 표x = Math.round((w - 표폭) / 2);
    조각.push(`<g transform="translate(${표x}, ${시작 + 줄높이})">${목록줄(목록, { 폭: 표폭, 줄높이, 글꼴: 본문글꼴 })}</g>`);
  }

  const 출처줄 = 여러줄(출처, { x: 여백, y: 출처y - 출처크기, 크기: 출처크기, 최대폭: 안폭, 글꼴: 본문글꼴, 색: '#8e95a1' });
  조각.push(출처줄.그림);
  조각.push(`<text x="${Math.round(w / 2)}" y="${바닥y}" text-anchor="middle" font-family="${제목글꼴}" font-weight="700" font-size="${주소크기}" fill="#c9a84c">${안전글(주소)}</text>`);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="#0b0d12"/>
  <rect x="0" y="0" width="${w}" height="8" fill="#c9a84c"/>
  ${조각.join('\n  ')}
</svg>`;
}

/* ── 오늘 구울 사실들 — 전부 우리가 잰 실측이다 ─────────────── */
const 자료길 = path.join(뿌리, 'src/data/100yearmap/age-axis.json');
if (!existsSync(자료길)) { console.error('⛔ age-axis.json 이 없다. node scripts/collect-age-axis.mjs 를 먼저 돌린다'); process.exit(1); }
const 나이 = JSON.parse(readFileSync(자료길, 'utf8'));

const 사실들 = [
  {
    이름: 'age32-marriage',
    위: '2025년에 처음 결혼한 남자 가운데',
    큰: '서른둘이 가장 많았습니다',
    밑: `${쉼표(나이.혼인.남편분포.값[12])}명 · 초혼 ${쉼표(나이.혼인.총건)}건 가운데`,
    분포: 나이.혼인.남편분포.값,
    강조칸: 12,
    출처: '국가데이터처 「초혼부부의 연령별 혼인」 2025',
    주소: '100yearmap.com/age/32',
  },
  {
    이름: 'wage-returns',
    위: '월급은 오르기만 하지 않습니다',
    큰: '예순에 스물다섯으로 돌아옵니다',
    밑: '마흔다섯에서 마흔아홉이 꼭대기입니다',
    // ⚠ 그림 없는 카드를 두지 않는다. 빈칸이 그렇게 생겼다
    견줌: [
      { 이름: '25~29세', 값: 3185, 표시: '318만 5천원' },
      { 이름: '45~49세', 값: 4683, 표시: '468만 3천원' },
      { 이름: '60세 이상', 값: 3188, 표시: '318만 8천원' },
    ],
    출처: '고용노동부 「규모·학력·연령계층·성별 임금 및 근로조건」 2025',
    주소: '100yearmap.com/age/68',
  },
  {
    // 견줌 꼴 — 차이 자체가 이야기인 것
    이름: 'childcare-leave',
    위: '아이가 태어난 해에 육아휴직을 쓴 사람',
    큰: '엄마 일곱에 아빠 하나',
    밑: '아빠 쪽은 회사 크기로 또 갈립니다 — 300명 이상 12.5%',
    견줌: [
      { 이름: '엄마', 값: 72.2, 표시: '72.2%' },
      { 이름: '아빠', 값: 10.2, 표시: '10.2%' },
    ],
    퍼센트: true,
    출처: '국가데이터처 「출생아 부모의 육아휴직 사용률」 2024',
    주소: '100yearmap.com/age/32',
  },
  {
    // 목록 꼴 — 「가져가 쓸 수 있게」의 가장 싼 형태
    이름: 'wage-by-age',
    위: '나이대별 월급여 (5인 이상 사업체)',
    큰: '꼭대기는 마흔다섯에서 마흔아홉',
    밑: '거기서 내려와 예순이면 스물다섯 언저리로 돌아옵니다',
    목록: [
      { 이름: '25~29세', 값: '318만 5천원' },
      { 이름: '35~39세', 값: '425만 9천원' },
      { 이름: '45~49세', 값: '468만 3천원' },
      { 이름: '55~59세', 값: '422만원' },
      { 이름: '60세 이상', 값: '318만 8천원' },
    ],
    출처: '고용노동부 「규모·학력·연령계층·성별 임금 및 근로조건」 2025',
    주소: '100yearmap.com/age',
  },
  {
    // 영문 — SeoulMarkets 몫. 말도 판도 다르다
    이름: 'sm-market-cap-per-worker',
    영문: true,
    위: 'Market cap per worker, Korean listed firms',
    큰: 'The top of the list is an artifact',
    밑: 'Holding firms report head-office staff only. By industry median, the real spread is 17.5x',
    목록: [
      { 이름: 'Financial support', 값: '₩4.4bn' },
      { 이름: 'R&D services', 값: '₩2.0bn' },
      { 이름: 'Other transport eq.', 값: '₩1.4bn' },
      { 이름: 'Apparel', 값: '₩0.28bn' },
      { 이름: 'Food', 값: '₩0.29bn' },
    ],
    출처: 'DART filings, 2,603 firms · median per industry, n≥20',
    주소: 'seoulmarkets.com',
  },
  {
    // 영문 — K Culture Wire 몫
    이름: 'kcw-music-export',
    영문: true,
    위: 'Korean music exports, 2005-2024',
    큰: 'Japan never shrank',
    밑: 'Japan grew 1.7x. Its share halved because everything else grew faster',
    견줌: [
      { 이름: 'Japan 2018', 값: 367, 표시: '$367M' },
      { 이름: 'North America 2024', 값: 278, 표시: '$278M' },
    ],
    출처: 'KOSIS, Music industry exports by region',
    주소: 'kculturewire.com',
  },
];

/* 🔴 **그림 없는 카드를 굽지 않는다.** 그러면 긴 판(9:16)에서 가운데가 통째로 빈다.
      말로 두지 않고 여기서 막는다 — 규칙은 문장이 아니라 검사다. */
const 그림없음 = 사실들.filter((f) => !f.분포 && !f.견줌 && !f.목록).map((f) => f.이름);
if (그림없음.length) {
  console.error(`⛔ 그림이 없는 카드가 있다: ${그림없음.join(' · ')}`);
  console.error('   분포·견줌·목록 가운데 하나를 넣는다. 글자만 있는 카드는 밖에서 안 읽힌다.');
  process.exit(1);
}

await mkdir(낼곳, { recursive: true });
let 센것 = 0;
for (const 사실 of 사실들) {
  for (const [key, 판형] of Object.entries(판)) {
    const 파일 = path.join(낼곳, `${사실.이름}-${판형.이름}.png`);
    await sharp(Buffer.from(카드svg(판형, 사실))).png().toFile(파일);
    센것++;
  }
}
console.log(`✅ 카드 ${센것}장 — ${path.relative(뿌리, 낼곳)}`);
console.log('   사실 ' + 사실들.length + '개 × 판 3종(인스타·쇼츠·X)');
console.log('⚠ 한글이 네모로 나오면 글꼴을 못 찾은 것이다. **눈으로 보고** 내보낸다.');
