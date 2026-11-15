/* 17 은 20 과 구도를 갈라내고, 27 은 달력 쪽으로 당기고, 28 에는 마우스를 넣는다. */
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('file:///C:/Users/User/Documents/GitHub/dataeconomics/package.json');
const sharp = require('sharp');

const 연중 = 'C:/Users/User/Documents/GitHub/dataeconomics/docs/그림-연중기획/';
const 임시 = 'C:/Users/User/AppData/Local/Temp/claude/112258f41787d32a/033739c7-59f8-4c4d-895e-94f02fa73ace/scratchpad/고친넷/';

function 배경(색1, 색2, 창색) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0" stop-color="${색1}"/><stop offset="1" stop-color="${색2}"/></linearGradient></defs>
    <rect width="1200" height="1200" fill="url(#g)"/>
    <ellipse cx="230" cy="300" rx="260" ry="300" fill="${창색}" opacity="0.32"/>
    <path d="M 60 520 L 390 520 L 640 1200 L 120 1200 Z" fill="#FFF6E0" opacity="0.2"/>
  </svg>`);
}

async function 옮겨심는다({ 원본, 자른다, 배경버퍼, 좌우반전 = false, 색조 = null, 낼이름, 더할것 = [] }) {
  const 놓는곳 = { left: 90, top: 90, width: 1020, height: 1020 };
  const 떼낸것 = sharp(원본).extract(자른다);
  if (좌우반전) 떼낸것.flop();
  if (색조) 떼낸것.tint(색조);
  const 인물 = await 떼낸것.resize(놓는곳.width, 놓는곳.height, { fit: 'cover' }).png().toBuffer();

  const 덮개 = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${놓는곳.width}" height="${놓는곳.height}">
    <defs><radialGradient id="m" cx="0.5" cy="0.46" r="0.74">
      <stop offset="0.62" stop-color="#fff" stop-opacity="1"/>
      <stop offset="0.88" stop-color="#fff" stop-opacity="0.6"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
    <rect width="${놓는곳.width}" height="${놓는곳.height}" fill="#000"/>
    <rect width="${놓는곳.width}" height="${놓는곳.height}" fill="url(#m)"/></svg>`);
  const 마스크 = await sharp(덮개).extractChannel('red').toBuffer();
  const 부드러운 = await sharp(인물).ensureAlpha().joinChannel(마스크).png().toBuffer();

  await sharp(배경버퍼)
    .composite([{ input: 부드러운, left: 놓는곳.left, top: 놓는곳.top }, ...더할것])
    .jpeg({ quality: 90, mozjpeg: true })
    .toFile(임시 + 낼이름);
  console.log(낼이름);
}

/* ⑰ — 11 관상의 인물을 «얼굴 가까이» 당겨 20 과 구도를 가른다 */
await 옮겨심는다({
  원본: 연중 + '그림-연중11-관상-얼굴.png',
  자른다: { left: 330, top: 120, width: 520, height: 520 },
  배경버퍼: 배경('#F4E9D6', '#E2D3BA', '#FBF3DE'),
  낼이름: '17.jpg',
});

/* ㉗ — 01 의 «달력 쪽»으로 당긴다. 인물은 일부만 든다 */
await 옮겨심는다({
  원본: 연중 + '그림-연중01-손없는날-이사날짜.png',
  자른다: { left: 170, top: 55, width: 520, height: 520 },
  배경버퍼: 배경('#E6E0D2', '#CFC6B2', '#DCE6E4'),
  낼이름: '27.jpg',
});

/* ㉘ — 06 개명의 인물에 «마우스»를 더한다 */
const 마우스 = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="190" height="260">
  <ellipse cx="95" cy="236" rx="86" ry="18" fill="#000" opacity="0.18"/>
  <path d="M 95 26 C 150 26, 172 76, 172 142 C 172 206, 142 232, 95 232
           C 48 232, 18 206, 18 142 C 18 76, 40 26, 95 26 Z" fill="#3B3B3E"/>
  <path d="M 95 26 C 150 26, 172 76, 172 142 C 172 150, 171 158, 170 165
           L 20 165 C 19 158, 18 150, 18 142 C 18 76, 40 26, 95 26 Z" fill="#4C4C50"/>
  <path d="M 95 26 C 122 26, 142 40, 154 64 L 95 64 Z" fill="#5A5A5F" opacity="0.7"/>
  <line x1="95" y1="28" x2="95" y2="96" stroke="#2A2A2D" stroke-width="5"/>
  <rect x="86" y="86" width="18" height="34" rx="8" fill="#2A2A2D"/>
  <path d="M 30 70 C 44 44, 66 30, 95 28" stroke="#fff" stroke-width="7" opacity="0.14" fill="none"/>
</svg>`);
const 마우스그림 = await sharp(마우스).resize(118, 162).png().toBuffer();

await 옮겨심는다({
  원본: 연중 + '그림-연중06-개명-이름바꾸기.png',
  자른다: { left: 170, top: 70, width: 790, height: 790 },
  배경버퍼: 배경('#DFE3E6', '#C4CBD0', '#CBD9DE'),
  낼이름: '28.jpg',
  더할것: [{ input: 마우스그림, left: 556, top: 958 }],
});

console.log('끝 — 17, 27, 28');
