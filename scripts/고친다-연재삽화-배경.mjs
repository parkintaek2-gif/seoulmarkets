/* 16·17·27·28 을 우리 인물로 다시 만든다. 배경만 바꾼다. */
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('file:///C:/Users/User/Documents/GitHub/dataeconomics/package.json');
const sharp = require('sharp');

const 연중 = 'C:/Users/User/Documents/GitHub/dataeconomics/docs/그림-연중기획/';
const 낼곳 = 'C:/Users/User/Documents/GitHub/dataeconomics/docs/보고/연재삽화/';
const 임시 = 'C:/Users/User/AppData/Local/Temp/claude/112258f41787d32a/033739c7-59f8-4c4d-895e-94f02fa73ace/scratchpad/고친넷/';
fs.mkdirSync(임시, { recursive: true });

/* 배경 한 장을 만든다 — 창과 빛이 있는 흐린 실내 */
function 배경(색1, 색2, 창색) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0" stop-color="${색1}"/><stop offset="1" stop-color="${색2}"/></linearGradient></defs>
    <rect width="1200" height="1200" fill="url(#g)"/>
    <ellipse cx="230" cy="300" rx="260" ry="300" fill="${창색}" opacity="0.32"/>
    <path d="M 60 520 L 390 520 L 640 1200 L 120 1200 Z" fill="#FFF6E0" opacity="0.22"/>
    <rect x="0" y="1010" width="1200" height="190" fill="#000" opacity="0.07"/>
  </svg>`);
}

/* 인물을 네모로 떼어 새 배경 가운데에 올린다 */
async function 옮겨심는다({ 원본, 자른다, 배경버퍼, 놓는곳, 좌우반전 = false, 색조 = null, 낼이름 }) {
  const 떼낸것 = sharp(원본).extract(자른다);
  if (좌우반전) 떼낸것.flop();
  if (색조) 떼낸것.tint(색조);
  const 인물 = await 떼낸것.resize(놓는곳.width, 놓는곳.height, { fit: 'cover' })
    .blur(0.3).png().toBuffer();

  /* 가장자리를 부드럽게 지우는 타원 덮개 */
  const 덮개 = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${놓는곳.width}" height="${놓는곳.height}">
    <defs><radialGradient id="m" cx="0.5" cy="0.46" r="0.72">
      <stop offset="0.62" stop-color="#fff" stop-opacity="1"/>
      <stop offset="0.88" stop-color="#fff" stop-opacity="0.6"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
    <rect width="${놓는곳.width}" height="${놓는곳.height}" fill="#000"/><rect width="${놓는곳.width}" height="${놓는곳.height}" fill="url(#m)"/></svg>`);
  const 마스크 = await sharp(덮개).extractChannel('red').toBuffer();
  const 부드러운인물 = await sharp(인물).ensureAlpha().joinChannel(마스크).png().toBuffer();

  await sharp(배경버퍼)
    .composite([{ input: 부드러운인물, left: 놓는곳.left, top: 놓는곳.top }])
    .jpeg({ quality: 90, mozjpeg: true })
    .toFile(임시 + 낼이름);
  console.log(낼이름);
}

/* ⑯ 오늘의 운세 — 02 만세력의 인물을 지하철 빛깔 배경으로 */
await 옮겨심는다({
  원본: 연중 + '그림-연중02-사주-만세력.png',
  자른다: { left: 260, top: 60, width: 760, height: 760 },
  배경버퍼: 배경('#D8DCDE', '#B9C0C4', '#CBD9DE'),
  놓는곳: { left: 90, top: 90, width: 1020, height: 1020 },
  좌우반전: true,
  낼이름: '16.jpg',
});

/* ⑰ 돼지꿈 — 11 관상 얼굴의 인물을 아침 침실 빛깔 배경으로 */
await 옮겨심는다({
  원본: 연중 + '그림-연중11-관상-얼굴.png',
  자른다: { left: 180, top: 40, width: 820, height: 820 },
  배경버퍼: 배경('#F0E6D6', '#DFD2BE', '#F6EEDC'),
  놓는곳: { left: 90, top: 90, width: 1020, height: 1020 },
  낼이름: '17.jpg',
});

/* ㉗ 별자리 경계 — 01 손 없는 날의 인물을 다른 빛깔·반전으로 */
await 옮겨심는다({
  원본: 연중 + '그림-연중01-손없는날-이사날짜.png',
  자른다: { left: 60, top: 120, width: 700, height: 700 },
  배경버퍼: 배경('#E8E2D4', '#D2C9B6', '#DCE6E4'),
  놓는곳: { left: 90, top: 90, width: 1020, height: 1020 },
  좌우반전: true,
  낼이름: '27.jpg',
});

console.log('끝 — 16, 17, 27');
