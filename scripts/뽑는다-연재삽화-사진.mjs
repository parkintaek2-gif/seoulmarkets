/* 연재 삽화를 사진풍으로 뽑는 자리. 2026-11-15 에 세웠다.
 *
 * 🔴🔴 사장님 지적 둘
 *   「일본인이잖아」 — 주문에 Korean 을 넣어도 동아시아를 일본으로 그린다.
 *      특히 «전통 공간»(한옥·서예·한복)에서 그렇다. 배경을 현대 한국으로 옮기면 크게 준다.
 *      그리고 기모노·다다미·쇼지·일본식 건축·일본 글자를 하나씩 금지해야 한다.
 *   「얼굴은 젊은데 머리만 하야면 늙은이가 되는게 아냐」 — 머리색만 적으면
 *      젊은 얼굴에 흰머리만 얹힌다. 이마와 눈가의 주름, 볼과 턱선의 처진 살,
 *      목의 늘어진 피부, 손등의 검버섯까지 적어야 나이가 나온다.
 *
 * ⛔ 이 경로의 한계 — 두 번 확인했다. 더 돌려도 나아지지 않는다.
 *   ① 노인 얼굴이 약하다. 「아주 나이 든」을 적어도 젊게 나오는 경우가 절반이 넘는다
 *   ② 여러 사람을 한 화면에 배치하면 분위기가 무너진다. 잔치가 장례처럼 나온다
 *   ③ 긴 주문은 뒤쪽 요소가 무시된다. 사람을 둘 적어도 하나만 나오고 소품이 빠진다
 *   ⇒ 주문을 짧게 끊어도 ①②는 잡히지 않았다. 사람이 적고 소품이 분명한 장면을 고른다
 *
 * ⭐ 한 번에 뽑아 쓰지 않는다. 회차마다 세 벌 이상 뽑아 두고 «눈으로» 고른다.
 *   1차 54장에서 열 장만 맞았다. 주문을 고쳐 세 번 돌려 열여덟 장을 채웠다.
 */
/* 18장을 다시 뽑는다.
   고친 점 — ① 배경을 현대 한국으로 ② 일본 요소를 하나하나 금지
             ③ 나이는 머리색이 아니라 주름·처진 피부·목선으로 적는다 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire('file:///C:/Users/User/Documents/GitHub/dataeconomics/package.json');
const sharp = require('sharp');

const 담을곳 = 'C:/Users/User/AppData/Local/Temp/claude/112258f41787d32a/033739c7-59f8-4c4d-895e-94f02fa73ace/scratchpad/한국현대';
fs.mkdirSync(담을곳, { recursive: true });

const 앞 = 'South Korea, Seoul, present day. Korean people only. ';
const 뒤 = ' Cinematic photograph, warm light, muted beige tones, 35mm, medium wide shot.'
  + ' Strictly Korean, NOT Japanese, NOT Chinese.'
  + ' No kimono, no yukata, no tatami, no shoji screens, no Japanese architecture, no Japanese text.';

/* 나이 든 인물은 주름·처진 피부·목선까지 적는다 — 머리색만으로는 젊은 얼굴이 나온다 */
const 늙음 = 'deep wrinkles across the forehead and around the eyes, sagging skin on the cheeks and jaw, loose skin on the neck, age spots on the hands, thinning grey hair';

const 목록 = [
  ['13', `A Korean father in his late fifties with ${늙음}, wearing a dark knit sweater, sits at a dining table in a modern Seoul apartment with his teenage son in a black school uniform. A sheet of paper lies on the table between them.`],
  ['14', `A Korean woman in her eighties with ${늙음}, wearing a lilac cardigan, sits on a sofa in a modern Korean living room beside her middle-aged daughter in a beige jumper. An old worn notebook is open on their laps.`],
  ['15', 'A Korean woman in her late twenties sits alone at a wooden table in a modern Seoul cafe, a small desk calendar standing in front of her, her chin resting on her hand, large window behind.'],
  ['16', 'A Korean office worker in a beige coat stands in a Seoul subway car holding the handrail, reading a folded Korean newspaper, other passengers blurred behind.'],
  ['17', 'A Korean man in his forties sits on the edge of a low bed in a modern Korean bedroom just after waking, hair tousled, morning light through the curtain, a thoughtful expression.'],
  ['18', 'A large paper wall calendar with a clear grid of dates hangs on the wall of a modern Korean apartment. A Korean couple in their thirties stand facing it, one of them pointing at the top of the page.'],
  ['19', `A Korean man in his seventies with ${늙음}, wearing a grey cardigan, sits at a low table in a modern Korean living room. A thick old book with yellowed pages lies open in front of him, his finger resting on a page. Winter light through a wide window.`],
  ['20', 'Two Korean women face each other across a small table in a plain modern consulting room: one in her fifties with short permed hair listens on the left, a younger woman speaks on the right with open hands. Two tea cups on the table.'],
  ['21', 'Close view of a Korean hand holding an ink brush, writing Chinese characters on white paper laid on a wooden desk. A black ink stone sits beside the paper. Modern Korean study, daylight from the side.'],
  ['22', 'A wooden desk by a window in a modern Korean room. An old book with yellowed pages lies open on the left, a modern lined notebook on the right, reading glasses between them. A Korean man in a beige sweater sits behind the desk looking down at both.'],
  ['23', 'Three generations of a Korean family around a small birthday cake on a table in a modern Seoul apartment: a grandmother with deep wrinkles and grey hair, a middle-aged couple, and a child. Candlelight on their faces.'],
  ['24', 'A Korean man in his thirties sits at a cafe table holding one smartphone in each hand, raised side by side in front of his chest, both screens facing him, looking from one to the other.'],
  ['25', `At the centre of a long table in a modern Korean restaurant room sits a Korean man in his sixties with ${늙음}, wearing a dark suit, smiling. His adult sons and daughters sit around him. A large cake with candles stands in front of him.`],
  ['26', 'Outdoors at night on a grassy hill under a sky full of stars. Three young Korean adults lie on a picnic blanket looking straight up. Seoul city lights far on the horizon. Deep blue night.'],
  ['27', 'A Korean woman in her thirties reaches up and turns the page of a large paper wall calendar in a modern Korean apartment, the previous page curling away, morning light.'],
  ['28', 'Inside an observatory dome at night, dim blue light. A Korean student in a padded jacket leans into the eyepiece of a large telescope, one hand on the focus knob.'],
  ['29', 'Three illustrated tarot cards lie face up in a row on a dark cloth on a small table in a dim modern Korean room. A Korean woman sits behind the table, a visitor in front. A candle burns at the side.'],
  ['30', 'A Korean person in their thirties sits at a desk by a window in a modern Korean room, two printed result sheets laid side by side in front of them, looking from one to the other.'],
];

const 씨들 = [1301, 1450, 1607];

async function 한장(번호, 말, 씨) {
  const 자리 = path.join(담을곳, `${번호}-${씨}.jpg`);
  if (fs.existsSync(자리)) return true;
  const 주소 = 'https://image.pollinations.ai/prompt/' + encodeURIComponent(앞 + 말 + 뒤)
    + `?width=1024&height=1024&nologo=true&model=flux&seed=${씨 + Number(번호)}`;
  for (let 차례 = 1; 차례 <= 6; 차례 += 1) {
    try {
      const 답 = await fetch(주소, { headers: { 'User-Agent': 'editorial-illustration-client/1.0' } });
      if (!답.ok) { await new Promise((r) => setTimeout(r, 7000 * 차례)); continue; }
      const 바이트 = Buffer.from(await 답.arrayBuffer());
      const 잰것 = await sharp(바이트).metadata();
      const 가로 = 잰것.width, 세로 = 잰것.height;
      const 남은세로 = 세로 - Math.round(세로 * 0.065);
      const 변 = Math.min(가로, 남은세로);
      await sharp(바이트)
        .extract({ left: Math.round((가로 - 변) / 2), top: Math.round((남은세로 - 변) / 2), width: 변, height: 변 })
        .resize(1024, 1024).jpeg({ quality: 88, mozjpeg: true }).toFile(자리);
      return true;
    } catch (e) { await new Promise((r) => setTimeout(r, 7000 * 차례)); }
  }
  console.log(`${번호}-${씨} 못 받았다`);
  return false;
}

let 센것 = 0;
for (const 씨 of 씨들) {
  for (const [번호, 말] of 목록) {
    if (await 한장(번호, 말, 씨)) 센것 += 1;
    await new Promise((r) => setTimeout(r, 2500));
  }
  console.log(`씨 ${씨} 한 바퀴 끝 — 지금까지 ${센것}장`);
}
console.log(`끝 — ${센것}장`);
