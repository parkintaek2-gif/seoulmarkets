/* ㉘ 망원경 사진의 얼굴에 마스크를 씌운다. 얼굴이 어색해 보이는 것을 가린다. */
import { createRequire } from 'node:module';
const require = createRequire('file:///C:/Users/User/Documents/GitHub/dataeconomics/package.json');
const sharp = require('sharp');

const 원본 = 'C:/Users/User/AppData/Local/Temp/claude/112258f41787d32a/033739c7-59f8-4c4d-895e-94f02fa73ace/scratchpad/한국현대/28-1301.jpg';
const 낼곳 = 'C:/Users/User/AppData/Local/Temp/claude/112258f41787d32a/033739c7-59f8-4c4d-895e-94f02fa73ace/scratchpad/28마스크.jpg';

/* 얼굴 — 코 (545,500) 입 (525,555) 턱 (545,605), 왼쪽으로 조금 기울어 있다 */
const 마스크 = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
  <defs>
    <linearGradient id="천" x1="0" y1="0" x2="0.35" y2="1">
      <stop offset="0" stop-color="#A18E6D"/>
      <stop offset="0.52" stop-color="#86734F"/>
      <stop offset="1" stop-color="#5E4E37"/>
    </linearGradient>
    <linearGradient id="그늘" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#000" stop-opacity="0.22"/>
      <stop offset="0.35" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity="0.12"/>
    </linearGradient>
  </defs>

  <g transform="translate(-10, 30) rotate(-6 560 548)">
    <!-- 귀끈 — 얼굴 양옆으로 넘어간다 -->
    <path d="M 432 486 C 392 476, 374 498, 388 536" stroke="#8E7B58" stroke-width="12" fill="none" stroke-linecap="round" opacity="0.92"/>
    <path d="M 684 470 C 722 462, 738 486, 726 526" stroke="#8E7B58" stroke-width="12" fill="none" stroke-linecap="round" opacity="0.92"/>

    <!-- 마스크 몸체 -->
    <path d="M 430 470 C 476 446, 628 442, 682 468 C 696 512, 690 574, 656 618 C 622 664, 494 668, 456 622 C 424 584, 420 508, 430 470 Z"
          fill="url(#천)"/>
    <path d="M 430 470 C 476 446, 628 442, 682 468 C 696 512, 690 574, 656 618 C 622 664, 494 668, 456 622 C 424 584, 420 508, 430 470 Z"
          fill="url(#그늘)"/>

    <!-- 콧등 쪽 가장자리 -->
    <path d="M 430 470 C 476 446, 628 442, 682 468" stroke="#604F39" stroke-width="6" fill="none" opacity="0.85"/>
    <!-- 코 집게 -->
    <path d="M 464 476 C 514 458, 606 456, 656 474" stroke="#604F39" stroke-width="7" fill="none" opacity="0.5" stroke-linecap="round"/>

    <!-- 가운데 접힘선 -->
    <path d="M 558 456 C 562 522, 560 596, 552 656" stroke="#6F5E43" stroke-width="4" fill="none" opacity="0.55"/>
    <!-- 가로 주름 -->
    <path d="M 436 518 C 512 500, 608 498, 680 516" stroke="#736247" stroke-width="3.5" fill="none" opacity="0.5"/>
    <path d="M 444 566 C 516 548, 606 546, 674 562" stroke="#736247" stroke-width="3.5" fill="none" opacity="0.45"/>

    <!-- 아래쪽 그늘 -->
    <path d="M 456 622 C 494 668, 622 664, 656 618 C 620 652, 496 656, 456 622 Z" fill="#000" opacity="0.14"/>
    <path d="M 430 470 C 476 446, 628 442, 682 468 C 684 476, 684 482, 684 488 C 626 466, 480 470, 430 486 Z" fill="#000" opacity="0.18"/>
  </g>
</svg>`;

/* 가장자리를 살짝 흐려 사진에 녹인다. 알파까지 함께 흐려야 테두리가 안 보인다 */
const 흐린마스크 = await sharp(Buffer.from(마스크)).blur(1.6).png().toBuffer();

/* 🔴 망원경은 마스크보다 «앞»에 있다 — 왼쪽 귀끈이 망원경 위로 나오면 안 된다.
   원본에서 망원경이 지나가는 띠만 떼어 맨 위에 다시 올린다. */
const 망원경덮개 = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
  <rect width="1024" height="1024" fill="#000"/>
  <!-- 망원경 — 끝의 렌즈는 둥글다. 직선으로 자르면 마스크가 칼로 벤 듯 보인다 -->
  <path d="M 0 404
           L 356 466
           C 412 476, 444 504, 446 546
           C 448 588, 418 614, 358 622
           L 0 668 Z" fill="#fff"/>
  <!-- 옷깃 — 마스크 아래쪽은 옷 «안»으로 들어간다 -->
  <path d="M 340 712
           C 440 664, 580 648, 706 616
           C 740 608, 764 616, 780 640
           L 860 1024 L 300 1024 Z" fill="#fff"/>
  <!-- 오른쪽 머리카락 — 귀끈이 이 뒤로 들어간다 -->
  <path d="M 662 418 C 700 410, 744 430, 752 486
           C 760 540, 748 592, 722 622
           C 700 646, 672 640, 664 606
           C 656 548, 654 466, 662 418 Z" fill="#fff"/>
</svg>`;
const 덮개알파 = await sharp(Buffer.from(망원경덮개)).blur(1.3).extractChannel('red').toBuffer();
const 망원경조각 = await sharp(원본).ensureAlpha().joinChannel(덮개알파).png().toBuffer();

await sharp(원본)
  .composite([{ input: 흐린마스크 }, { input: 망원경조각 }])
  .jpeg({ quality: 92, mozjpeg: true })
  .toFile(낼곳);
console.log('마스크를 씌웠다');
