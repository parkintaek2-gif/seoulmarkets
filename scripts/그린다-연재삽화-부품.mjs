/* 연재 삽화 공통 부품 — 한지색 바탕에 먹선으로 그리는 신문 삽화 꼴 */

export const 색 = {
  바탕: '#F2EDE2',
  바탕짙게: '#E6DECF',
  먹: '#2A2724',
  머리: '#1C1A18',
  살: '#E7C9A4',
  살그늘: '#D4B189',
  옷가: '#8C8275',
  옷나: '#B9AE9C',
  점: '#B5452F',
  푸름: '#4A6D80',
  종이: '#FBF8F2',
};

/* 바탕 — 가로선 질감과 아래쪽 바닥 */
export function 바탕(h = 1024, w = 1024) {
  let 줄 = '';
  for (let y = 0; y < h; y += 4) 줄 += `<rect x="0" y="${y}" width="${w}" height="1" fill="#000" opacity="0.012"/>`;
  return `<rect width="${w}" height="${h}" fill="${색.바탕}"/>${줄}`;
}

/* 둥근 사람 머리 — 옆모습이 아니라 살짝 기운 정면 */
export function 머리(x, y, r, 각 = 0, 짧은머리 = true) {
  const 머리칼 = 짧은머리
    ? `<path d="M ${x - r * 1.05} ${y - r * 0.15}
         C ${x - r * 1.1} ${y - r * 1.15}, ${x + r * 1.1} ${y - r * 1.15}, ${x + r * 1.05} ${y - r * 0.15}
         C ${x + r * 0.9} ${y - r * 0.62}, ${x + r * 0.35} ${y - r * 0.48}, ${x} ${y - r * 0.6}
         C ${x - r * 0.38} ${y - r * 0.48}, ${x - r * 0.9} ${y - r * 0.62}, ${x - r * 1.05} ${y - r * 0.15} Z"
         fill="${색.머리}"/>`
    : `<path d="M ${x - r * 1.12} ${y + r * 0.55}
         C ${x - r * 1.3} ${y - r * 1.2}, ${x + r * 1.3} ${y - r * 1.2}, ${x + r * 1.12} ${y + r * 0.55}
         C ${x + r * 1.0} ${y + r * 0.1}, ${x + r * 0.95} ${y - r * 0.5}, ${x} ${y - r * 0.62}
         C ${x - r * 0.95} ${y - r * 0.5}, ${x - r * 1.0} ${y + r * 0.1}, ${x - r * 1.12} ${y + r * 0.55} Z"
         fill="${색.머리}"/>`;
  return `<g transform="rotate(${각} ${x} ${y})">
    <ellipse cx="${x}" cy="${y}" rx="${r * 0.88}" ry="${r}" fill="${색.살}"/>
    <ellipse cx="${x - r * 0.62}" cy="${y + r * 0.1}" rx="${r * 0.14}" ry="${r * 0.2}" fill="${색.살그늘}"/>
    ${머리칼}
    <ellipse cx="${x - r * 0.33}" cy="${y + r * 0.05}" rx="${r * 0.075}" ry="${r * 0.055}" fill="${색.먹}"/>
    <ellipse cx="${x + r * 0.33}" cy="${y + r * 0.05}" rx="${r * 0.075}" ry="${r * 0.055}" fill="${색.먹}"/>
    <path d="M ${x - r * 0.17} ${y + r * 0.52} Q ${x} ${y + r * 0.62}, ${x + r * 0.17} ${y + r * 0.52}"
      stroke="${색.먹}" stroke-width="${r * 0.07}" fill="none" stroke-linecap="round" opacity="0.75"/>
  </g>`;
}

/* 앉은 상반신 — 어깨에서 허리까지 */
export function 상반신(x, y, w, h, 옷 = 색.옷가, 기울기 = 0) {
  return `<g transform="rotate(${기울기} ${x} ${y})">
    <path d="M ${x - w / 2} ${y + h}
             C ${x - w / 2} ${y + h * 0.18}, ${x - w * 0.3} ${y}, ${x} ${y}
             C ${x + w * 0.3} ${y}, ${x + w / 2} ${y + h * 0.18}, ${x + w / 2} ${y + h} Z"
          fill="${옷}"/>
    <path d="M ${x} ${y + h * 0.02} L ${x} ${y + h}" stroke="#000" stroke-width="2" opacity="0.1"/>
  </g>`;
}

/* 팔 — 어깨에서 손끝까지 한 획 */
export function 팔(x1, y1, x2, y2, 굵기, 옷 = 색.옷가) {
  return `<path d="M ${x1} ${y1} Q ${(x1 + x2) / 2 + 18} ${(y1 + y2) / 2 + 22}, ${x2} ${y2}"
    stroke="${옷}" stroke-width="${굵기}" fill="none" stroke-linecap="round"/>
    <circle cx="${x2}" cy="${y2}" r="${굵기 * 0.42}" fill="${색.살}"/>`;
}

/* 책상 — 앞판이 있어 아래쪽을 가린다 */
export function 책상(x, y, w, 다리높이 = 150) {
  return `<rect x="${x - w / 2}" y="${y}" width="${w}" height="20" rx="5" fill="#B5854F"/>
    <rect x="${x - w / 2}" y="${y + 20}" width="${w}" height="${다리높이}" fill="#9A6F3F"/>
    <rect x="${x - w / 2}" y="${y + 20}" width="${w}" height="10" fill="#000" opacity="0.12"/>
    <rect x="${x - w / 2}" y="${y + 20 + 다리높이}" width="${w}" height="8" fill="#7E5932"/>`;
}

/* 걸터앉은 의자 등받이 — 인물 뒤에 둔다 */
export function 의자(x, y, w = 150, h = 190) {
  return `<rect x="${x - w / 2}" y="${y}" width="${w}" height="${h}" rx="14" fill="#6F6256"/>
    <rect x="${x - w / 2 + 12}" y="${y + 14}" width="${w - 24}" height="${h - 28}" rx="10" fill="#7E7265"/>`;
}

/* 바닥에 드리운 그림자 */
export function 그늘(x, y, rx, ry = 14) {
  return `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#000" opacity="0.08"/>`;
}

/* 벽과 바닥을 가르는 선 */
export function 벽선(y) {
  return `<line x1="0" y1="${y}" x2="1024" y2="${y}" stroke="${색.먹}" stroke-width="3" stroke-opacity="0.12"/>`;
}

/* 종이 한 장 */
export function 종이(x, y, w, h, 각 = 0, 줄수 = 4) {
  let 줄 = '';
  for (let i = 0; i < 줄수; i += 1) {
    const yy = y + h * (0.26 + i * 0.17);
    줄 += `<rect x="${x + w * 0.14}" y="${yy}" width="${w * (i % 2 ? 0.52 : 0.7)}" height="${Math.max(2, h * 0.035)}" fill="${색.먹}" opacity="0.26"/>`;
  }
  return `<g transform="rotate(${각} ${x + w / 2} ${y + h / 2})">
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${색.종이}" stroke="${색.먹}" stroke-width="2" stroke-opacity="0.22"/>
    ${줄}</g>`;
}

/* 창 */
export function 창(x, y, w, h) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="#DCE6E4"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="none" stroke="${색.먹}" stroke-width="5" stroke-opacity="0.45"/>
    <line x1="${x + w / 2}" y1="${y}" x2="${x + w / 2}" y2="${y + h}" stroke="${색.먹}" stroke-width="5" stroke-opacity="0.45"/>
    <line x1="${x}" y1="${y + h / 2}" x2="${x + w}" y2="${y + h / 2}" stroke="${색.먹}" stroke-width="5" stroke-opacity="0.45"/>`;
}

/* 아래쪽 바닥 그림자 띠 */
export function 바닥(y = 820) {
  return `<rect x="0" y="${y}" width="1024" height="${1024 - y}" fill="${색.바탕짙게}"/>`;
}

export function 감싼다(속) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">${속}</svg>`;
}

/* ── 소품들 ── */

export function 달력(x, y, w, h, 강조 = false) {
  let 칸 = '';
  for (let r = 0; r < 4; r += 1) for (let c = 0; c < 7; c += 1) {
    const cx = x + w * (0.09 + c * 0.125), cy = y + h * (0.42 + r * 0.14);
    const 빨강 = 강조 && r === 1 && c === 3;
    칸 += `<circle cx="${cx}" cy="${cy}" r="${w * 0.028}" fill="${빨강 ? 색.점 : 색.먹}" opacity="${빨강 ? 1 : 0.3}"/>`;
  }
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${색.종이}" stroke="${색.먹}" stroke-width="3" stroke-opacity="0.3"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h * 0.22}" rx="5" fill="${색.푸름}"/>${칸}`;
}

export function 책(x, y, w, h, 각 = 0) {
  return `<g transform="rotate(${각} ${x + w / 2} ${y + h / 2})">
    <path d="M ${x} ${y + h} L ${x} ${y + h * 0.12} Q ${x + w / 2} ${y - h * 0.08}, ${x + w} ${y + h * 0.12} L ${x + w} ${y + h} Z" fill="${색.종이}" stroke="${색.먹}" stroke-width="2.5" stroke-opacity="0.3"/>
    <line x1="${x + w / 2}" y1="${y + h * 0.02}" x2="${x + w / 2}" y2="${y + h}" stroke="${색.먹}" stroke-width="3" stroke-opacity="0.25"/>
    <rect x="${x + w * 0.1}" y="${y + h * 0.35}" width="${w * 0.28}" height="${h * 0.05}" fill="${색.먹}" opacity="0.22"/>
    <rect x="${x + w * 0.1}" y="${y + h * 0.5}" width="${w * 0.3}" height="${h * 0.05}" fill="${색.먹}" opacity="0.22"/>
    <rect x="${x + w * 0.58}" y="${y + h * 0.35}" width="${w * 0.3}" height="${h * 0.05}" fill="${색.먹}" opacity="0.22"/>
    <rect x="${x + w * 0.58}" y="${y + h * 0.5}" width="${w * 0.26}" height="${h * 0.05}" fill="${색.먹}" opacity="0.22"/></g>`;
}

export function 휴대전화(x, y, w, h, 각 = 0, 화면 = 색.푸름) {
  return `<g transform="rotate(${각} ${x + w / 2} ${y + h / 2})">
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${w * 0.14}" fill="${색.먹}"/>
    <rect x="${x + w * 0.07}" y="${y + h * 0.05}" width="${w * 0.86}" height="${h * 0.9}" rx="${w * 0.09}" fill="${화면}"/>
    <rect x="${x + w * 0.2}" y="${y + h * 0.22}" width="${w * 0.6}" height="${h * 0.06}" rx="3" fill="#fff" opacity="0.6"/>
    <rect x="${x + w * 0.2}" y="${y + h * 0.4}" width="${w * 0.45}" height="${h * 0.06}" rx="3" fill="#fff" opacity="0.45"/>
    <rect x="${x + w * 0.2}" y="${y + h * 0.58}" width="${w * 0.52}" height="${h * 0.06}" rx="3" fill="#fff" opacity="0.45"/></g>`;
}

export function 밤하늘(h = 1024) {
  let 별 = '';
  const 씨 = [[120, 110], [260, 180], [410, 96], [560, 210], [700, 130], [860, 230], [180, 300], [330, 360],
    [640, 330], [900, 380], [70, 420], [480, 268], [770, 420], [210, 500], [930, 120], [390, 452], [600, 460], [820, 300]];
  씨.forEach(([x, y], i) => {
    const r = 2.2 + (i % 4) * 1.5;
    별 += `<circle cx="${x}" cy="${y}" r="${r}" fill="#FFF8E4" opacity="${0.55 + (i % 3) * 0.15}"/>`;
  });
  return `<rect width="1024" height="${h}" fill="#1E2A3A"/>
    <rect width="1024" height="${h}" fill="url(#밤)" opacity="0.5"/>
    <defs><linearGradient id="밤" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#16202E"/><stop offset="1" stop-color="#33465C"/></linearGradient></defs>${별}`;
}

export function 카드(x, y, w, h, 각 = 0, 무늬 = '별') {
  const 속 = 무늬 === '별'
    ? `<path d="M ${x + w / 2} ${y + h * 0.3} l ${w * 0.1} ${h * 0.18} l ${w * 0.19} 0 l -${w * 0.15} ${h * 0.13} l ${w * 0.06} ${h * 0.19} l -${w * 0.2} -${h * 0.12} l -${w * 0.2} ${h * 0.12} l ${w * 0.06} -${h * 0.19} l -${w * 0.15} -${h * 0.13} l ${w * 0.19} 0 Z" fill="${색.점}" opacity="0.8"/>`
    : `<circle cx="${x + w / 2}" cy="${y + h * 0.48}" r="${w * 0.22}" fill="none" stroke="${색.푸름}" stroke-width="${w * 0.06}"/>`;
  return `<g transform="rotate(${각} ${x + w / 2} ${y + h / 2})">
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${w * 0.08}" fill="${색.종이}" stroke="${색.먹}" stroke-width="3" stroke-opacity="0.35"/>
    <rect x="${x + w * 0.08}" y="${y + h * 0.06}" width="${w * 0.84}" height="${h * 0.88}" rx="${w * 0.05}" fill="none" stroke="${색.먹}" stroke-width="2" stroke-opacity="0.2"/>${속}</g>`;
}

export function 케이크(x, y, w) {
  const h = w * 0.62;
  let 초 = '';
  for (let i = 0; i < 3; i += 1) {
    const cx = x - w * 0.22 + i * w * 0.22;
    초 += `<rect x="${cx - w * 0.018}" y="${y - h * 0.42}" width="${w * 0.036}" height="${h * 0.42}" fill="${색.종이}"/>
      <ellipse cx="${cx}" cy="${y - h * 0.5}" rx="${w * 0.028}" ry="${w * 0.045}" fill="#E8A33D"/>`;
  }
  return `${초}<rect x="${x - w / 2}" y="${y}" width="${w}" height="${h * 0.62}" rx="${w * 0.05}" fill="#F0D9BC"/>
    <rect x="${x - w / 2}" y="${y}" width="${w}" height="${h * 0.2}" rx="${w * 0.05}" fill="#E8C9A4"/>
    <rect x="${x - w * 0.56}" y="${y + h * 0.62}" width="${w * 1.12}" height="${h * 0.12}" rx="4" fill="#C9BFAE"/>`;
}

export function 붓(x, y, 길이, 각 = -32) {
  return `<g transform="rotate(${각} ${x} ${y})">
    <rect x="${x - 7}" y="${y - 길이}" width="14" height="${길이 * 0.78}" rx="6" fill="#8A6239"/>
    <rect x="${x - 8}" y="${y - 길이 * 0.24}" width="16" height="${길이 * 0.1}" fill="#C9A227"/>
    <path d="M ${x - 9} ${y - 길이 * 0.14} Q ${x} ${y + 길이 * 0.1}, ${x + 9} ${y - 길이 * 0.14} Z" fill="${색.먹}"/></g>`;
}

export function 신문(x, y, w, h, 각 = 0) {
  let 줄 = '';
  for (let i = 0; i < 7; i += 1) {
    const yy = y + h * (0.3 + i * 0.09);
    줄 += `<rect x="${x + w * 0.08}" y="${yy}" width="${w * 0.36}" height="${h * 0.035}" fill="${색.먹}" opacity="0.25"/>
      <rect x="${x + w * 0.54}" y="${yy}" width="${w * 0.36}" height="${h * 0.035}" fill="${색.먹}" opacity="0.25"/>`;
  }
  return `<g transform="rotate(${각} ${x + w / 2} ${y + h / 2})">
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${색.종이}" stroke="${색.먹}" stroke-width="2.5" stroke-opacity="0.25"/>
    <rect x="${x + w * 0.08}" y="${y + h * 0.1}" width="${w * 0.5}" height="${h * 0.1}" fill="${색.먹}" opacity="0.6"/>
    <line x1="${x + w / 2}" y1="${y}" x2="${x + w / 2}" y2="${y + h}" stroke="${색.먹}" stroke-width="2" stroke-opacity="0.18"/>${줄}</g>`;
}

export function 망원경(x, y, 길이 = 300, 각 = -34) {
  return `<g transform="rotate(${각} ${x} ${y})">
    <rect x="${x - 길이 / 2}" y="${y - 34}" width="${길이}" height="68" rx="34" fill="#5C6B78"/>
    <rect x="${x - 길이 / 2}" y="${y - 34}" width="${길이}" height="24" rx="12" fill="#6E7E8C"/>
    <circle cx="${x + 길이 / 2}" cy="${y}" r="38" fill="#3E4C58"/>
    <circle cx="${x + 길이 / 2}" cy="${y}" r="24" fill="#1E2A3A"/></g>
    <path d="M ${x} ${y + 30} L ${x - 70} ${y + 230} M ${x} ${y + 30} L ${x + 70} ${y + 230} M ${x} ${y + 30} L ${x} ${y + 230}"
      stroke="#5C6B78" stroke-width="16" stroke-linecap="round"/>`;
}

export function 침대(x, y, w) {
  return `<rect x="${x - w / 2}" y="${y}" width="${w}" height="${w * 0.2}" rx="10" fill="#B9AE9C"/>
    <rect x="${x - w / 2}" y="${y + w * 0.2}" width="${w}" height="${w * 0.12}" fill="#9A907F"/>
    <rect x="${x - w / 2 - 14}" y="${y - w * 0.22}" width="28" height="${w * 0.42}" rx="10" fill="#8A7F6E"/>`;
}

/* ── 밀도를 올리는 소품 ── */

export function 화분(x, y, 크기 = 1) {
  const w = 76 * 크기, h = 86 * 크기;
  return `<path d="M ${x} ${y - h * 0.3} C ${x - w * 0.9} ${y - h * 1.5}, ${x - w * 0.5} ${y - h * 0.1}, ${x} ${y - h * 0.26}
      C ${x + w * 0.5} ${y - h * 0.1}, ${x + w * 0.9} ${y - h * 1.5}, ${x} ${y - h * 0.3} Z" fill="#6E8565"/>
    <path d="M ${x} ${y - h * 0.26} C ${x - w * 0.6} ${y - h * 1.1}, ${x - w * 0.2} ${y - h * 0.5}, ${x} ${y - h * 0.3}" fill="none" stroke="#56694F" stroke-width="3"/>
    <path d="M ${x - w * 0.34} ${y} L ${x - w * 0.27} ${y - h * 0.3} L ${x + w * 0.27} ${y - h * 0.3} L ${x + w * 0.34} ${y} Z" fill="#B07A52"/>
    <rect x="${x - w * 0.3}" y="${y - h * 0.32}" width="${w * 0.6}" height="${h * 0.08}" rx="3" fill="#9A6742"/>`;
}

export function 액자(x, y, w, h, 속 = '산') {
  const 그림 = 속 === '산'
    ? `<path d="M ${x + w * 0.1} ${y + h * 0.78} L ${x + w * 0.38} ${y + h * 0.3} L ${x + w * 0.56} ${y + h * 0.58} L ${x + w * 0.72} ${y + h * 0.36} L ${x + w * 0.9} ${y + h * 0.78} Z" fill="#8FA39B"/>`
    : `<circle cx="${x + w / 2}" cy="${y + h * 0.48}" r="${Math.min(w, h) * 0.24}" fill="#C9A86E"/>`;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${색.종이}" stroke="#8A7256" stroke-width="7"/>${그림}`;
}

export function 찻잔(x, y, 크기 = 1) {
  const r = 22 * 크기;
  return `<path d="M ${x - r} ${y - r * 0.9} L ${x - r * 0.78} ${y} Q ${x} ${y + r * 0.4}, ${x + r * 0.78} ${y} L ${x + r} ${y - r * 0.9} Z" fill="${색.종이}" stroke="${색.먹}" stroke-width="2.5" stroke-opacity="0.3"/>
    <ellipse cx="${x}" cy="${y - r * 0.9}" rx="${r}" ry="${r * 0.3}" fill="#D9CDB8"/>
    <path d="M ${x + r * 0.95} ${y - r * 0.66} q ${r * 0.6} ${r * 0.1}, ${r * 0.1} ${r * 0.56}" fill="none" stroke="${색.먹}" stroke-width="4" stroke-opacity="0.3"/>
    <ellipse cx="${x}" cy="${y + r * 0.36}" rx="${r * 1.24}" ry="${r * 0.22}" fill="#C9BFAE"/>`;
}

export function 책더미(x, y, 장수 = 3) {
  let s = '';
  const 색들 = ['#8A6239', '#6E7E8C', '#A05B4A', '#7E7265'];
  for (let i = 0; i < 장수; i += 1) {
    const w = 128 - i * 11, h = 20;
    s += `<rect x="${x - w / 2}" y="${y - (i + 1) * h}" width="${w}" height="${h - 3}" rx="3" fill="${색들[i % 4]}"/>
      <rect x="${x - w / 2 + 7}" y="${y - (i + 1) * h + 6}" width="${w - 14}" height="3" fill="#fff" opacity="0.28"/>`;
  }
  return s;
}

export function 전등(x, y, 길이 = 120) {
  return `<line x1="${x}" y1="0" x2="${x}" y2="${y - 6}" stroke="${색.먹}" stroke-width="4" stroke-opacity="0.4"/>
    <path d="M ${x - 62} ${y + 46} L ${x - 30} ${y} L ${x + 30} ${y} L ${x + 62} ${y + 46} Z" fill="#C9A86E"/>
    <ellipse cx="${x}" cy="${y + 46}" rx="62" ry="12" fill="#F2DFA8"/>
    <path d="M ${x - 150} ${y + 300} L ${x - 62} ${y + 48} L ${x + 62} ${y + 48} L ${x + 150} ${y + 300} Z" fill="#FFF3D6" opacity="0.2"/>`;
}

/* 창으로 드는 빛 — 바닥에 길게 눕는다 */
export function 빛(x, y, w, h, 기울기 = 24) {
  return `<path d="M ${x} ${y} L ${x + w} ${y} L ${x + w + 기울기 * 3} ${y + h} L ${x + 기울기} ${y + h} Z" fill="#FFF3D6" opacity="0.3"/>`;
}

/* 창밖 풍경 — 멀리 보이는 나무와 지붕 */
export function 창밖(x, y, w, h) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#CFDCE0"/>
    <rect x="${x}" y="${y + h * 0.62}" width="${w}" height="${h * 0.38}" fill="#B9C9C2"/>
    <circle cx="${x + w * 0.28}" cy="${y + h * 0.56}" r="${w * 0.17}" fill="#9FB49C"/>
    <rect x="${x + w * 0.25}" y="${y + h * 0.66}" width="${w * 0.06}" height="${h * 0.2}" fill="#8A7256"/>
    <path d="M ${x + w * 0.56} ${y + h * 0.66} L ${x + w * 0.74} ${y + h * 0.5} L ${x + w * 0.92} ${y + h * 0.66} Z" fill="#9A8E7E"/>
    <rect x="${x + w * 0.6}" y="${y + h * 0.66}" width="${w * 0.28}" height="${h * 0.2}" fill="#AFA496"/>`;
}

/* 풍경이 보이는 창 */
export function 창풍경(x, y, w, h) {
  return `${창밖(x, y, w, h)}
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="none" stroke="${색.먹}" stroke-width="7" stroke-opacity="0.45"/>
    <line x1="${x + w / 2}" y1="${y}" x2="${x + w / 2}" y2="${y + h}" stroke="${색.먹}" stroke-width="6" stroke-opacity="0.45"/>
    <line x1="${x}" y1="${y + h / 2}" x2="${x + w}" y2="${y + h / 2}" stroke="${색.먹}" stroke-width="6" stroke-opacity="0.45"/>`;
}

/* 벽 아래쪽 굽도리 */
export function 굽도리(y) {
  return `<rect x="0" y="${y - 18}" width="1024" height="18" fill="#C9BFAE"/>`;
}
