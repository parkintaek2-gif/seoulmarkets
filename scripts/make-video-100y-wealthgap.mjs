#!/usr/bin/env node
/**
 * make-video-100y-wealthgap.mjs — 백년지도 쇼츠. 14초 · 1080×1920 · 한국어.
 *   「고령층은 청년층보다 자산이 몇 배 많을까」(`/wealth-gap`)
 *
 * ── 캐릭터를 쓰는 «첫» 100yearmap 영상이다 ────────────────────────
 * 🔴 사장님(8/08): 「슬라이드쇼잖아. 이걸 누가 보냐」
 * 🔴 사장님(8/28): 「최소한 영상은 있어야지. 바로 그래픽이 나오는 건 좀 아니지」
 * 🔴 사장님(8/29): 「캐릭터를 활용하든, 애니메이션 캐릭터를 활용하든 자체 영상으로
 *                  서비스해. 달랑 카드, 그래픽 등 스틸이미지 사용하지마」
 * → 이전(`make-video2.mjs`)은 막대·숫자가 움직이긴 했지만 캐릭터가 없었다 —
 *   `docs/유튜브-들어가는-법.md`가 그 자체로도 "글자·차트만 움직이는 것"이라 부족하다고
 *   못박았다. K Culture Wire가 이미 만든 공용 캐릭터(`kcw-character.mjs`, currentColor라
 *   유닛마다 색만 바꾸면 된다)를 그대로 가져다 쓴다 — 새로 안 만든다.
 *
 * ── 왜 이 데이터인가 ──────────────────────────────────────────────
 * 2026-08-28에 KOSIS 가계금융복지조사로 직접 검증한 것(`/wealth-gap`) — 정부
 * 보도자료 인용값(2024년 3.9배)과 정확히 일치까지 확인된 실측이다.
 *
 * ⛔ 수를 손으로 안 박는다 — 전부 `wealth-gap-age.json`에서 읽는다.
 * ⛔ 「많다/적다」로 판정하지 않는다 — 「」를 반드시 적는다.
 * ⛔ 한계(총자산 기준·부채 미차감)가 표보다 먼저 뜬다 — KCW onecountry 편의 교훈 그대로.
 *
 * 쓰는 법
 *   node scripts/make-video-100y-wealthgap.mjs --out public/100y/media/wealthgap.mp4
 *   node scripts/make-video-100y-wealthgap.mjs --selftest
 *   node scripts/make-video-100y-wealthgap.mjs --그림 6.0
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { 캐릭터SVG, 사이, 술술 } from './kcw-character.mjs';
import { 섞기필터, 넘치나 } from './mix-voice-kcw.mjs';
import { 초읽기 } from './make-voice-100y.mjs';

const require = createRequire('C:/Users/USER/Documents/GitHub/klifemap/package.json');

export const 초당 = 30;
export const 폭 = 1080;
export const 높 = 1920;
export const 총초 = 14;

/** 🔴 사장님(8/29) — 「무성 콘텐트 다신 만들지 말 것」. anullsrc(빈 소리) 대신
 *  make-voice-100y.mjs로 낸 실제 내레이션을 얹는다. 대사와 화면 반전(줄 74 「말함」)이
 *  같은 자리를 봐야 하므로 여기 시각과 그 배열을 같이 손댄다. */
export const 목소리방 = 'archive/video/voice/wealthgap';
export const 목소리때들 = [0.6, 6.2, 11.0];

const d = JSON.parse(fs.readFileSync('src/data/100yearmap/wealth-gap-age.json', 'utf8'));

export const 연도들 = Object.keys(d.연도별).sort();
export const 기준연도 = d.기준연도;
export const 최근 = d.연도별[기준연도];
export const 첫해 = 연도들[0];
export const 첫값 = d.연도별[첫해];
/** ⚠ 표에는 최근 5개년만 싣는다 — 9줄을 다 넣으면 아래 「견줌」 칸과 겹친다.
 *  전체 이력은 지면(100yearmap.com/wealth-gap)에 있다. 여기 고른 5개는 «가장 최근»
 *  기준이지 유리한 해를 고른 것이 아니다 — 자료 끝에서부터 자른다. */
export const 표연도들 = 연도들.slice(-5);

function 끼(초, ㄱ, ㄴ) { return 사이(초, ㄱ, ㄴ); }
const ㄴ = (v) => Math.round(v * 100) / 100;
const 만원표시 = (v) => `${(v / 10000).toFixed(1)}억원`;

export function 칸HTML(초) {
  const 머리 = 술술(끼(초, 0.9, 1.8));
  const 띠 = 술술(끼(초, 1.6, 2.1));
  const 한계 = 술술(끼(초, 2.6, 3.4));
  const 표 = 술술(끼(초, 5.0, 6.0));
  const 견줌 = 술술(끼(초, 7.6, 8.6));
  const 끝 = 술술(끼(초, 11.6, 12.4));

  /* ⭐ 캐릭터가 크게 들어왔다가 오른쪽 아래로 물러난다 — KCW onecountry 편 그대로 */
  const 물러남 = 술술(끼(초, 1.7, 2.7));
  const 자리 = (큰, 작) => ㄴ(큰 + (작 - 큰) * 물러남);

  const 캐 = 캐릭터SVG(초, {
    들어옴: 0.1,
    그리는초: 1.0,
    /* ⚠ 실제 내레이션 세 줄의 시작(목소리때들)에 맞춘다 — 대사 없는데 입만 움직이면
       그것도 화면과 소리가 딴말을 하는 것이다(mix-voice-kcw.mjs가 이미 겪은 실수). */
    말함: [[0.6, 6.04], [6.2, 10.33], [11.0, 13.78]],
    가리킴: [[4.6, 7.2]],
    풀림: 11.4,
  });

  const 줄들 = 표연도들.map((연도) => {
    const 이 = 연도 === 기준연도;
    return `<tr><td class="ㄹ${이 ? ' 짚' : ''}">${연도}</td>`
      + `<td class="ㄴ${이 ? ' 짚' : ''}">${d.연도별[연도].배율}배</td></tr>`;
  }).join('');

  return `<style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{width:${폭}px;height:${높}px;background:#0b0d12;overflow:hidden;
         font-family:'Noto Sans KR','Segoe UI',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
    .판{position:absolute;inset:0}

    .누{position:absolute;left:${자리(232, 690)}px;top:${자리(470, 1392)}px;
        width:${자리(616, 330)}px;height:${자리(806, 430)}px;color:#c9a84c}
    .누 svg{width:100%;height:100%}

    .띠{position:absolute;left:84px;top:96px;font-size:26px;font-weight:800;letter-spacing:.08em;
        color:#8e733a;opacity:${ㄴ(띠)}}
    .큰{position:absolute;left:84px;right:84px;top:170px;opacity:${ㄴ(머리)};
        transform:scale(${ㄴ(0.88 + 0.12 * 머리)});transform-origin:left top}
    .큰 b{display:block;font-size:58px;font-weight:900;line-height:1.16;letter-spacing:-.02em;
          color:#e9e9ee}
    .큰 em{display:block;margin-top:18px;font-style:normal;font-size:36px;font-weight:900;
           color:#c9a84c;letter-spacing:-.01em}

    .한{position:absolute;left:84px;right:84px;top:520px;opacity:${ㄴ(한계)};
        transform:translateY(${ㄴ((1 - 한계) * 18)}px);
        border-left:6px solid #8e733a;padding-left:28px}
    .한 h3{font-size:24px;font-weight:800;letter-spacing:.04em;color:#8e733a;margin-bottom:12px}
    .한 p{font-size:29px;color:#b9c6cc;line-height:1.4}
    .한 b{color:#e9e9ee}

    .표{position:absolute;left:84px;right:520px;top:850px;opacity:${ㄴ(표 * (1 - 끝))}}
    .표 h3{font-size:22px;font-weight:800;letter-spacing:.04em;color:#5d707a;margin-bottom:14px}
    table{width:100%;border-collapse:collapse}
    td{padding:9px 0;border-top:1px solid #1d222c}
    .ㄹ{font-size:24px;font-weight:800;color:#b9c6cc}
    .ㄴ{font-size:24px;font-weight:700;color:#b9c6cc;text-align:right}
    .짚{color:#c9a84c;font-weight:900}

    .견{position:absolute;left:84px;right:400px;top:1310px;opacity:${ㄴ(견줌 * (1 - 끝))}}
    .견 h3{font-size:22px;font-weight:800;letter-spacing:.04em;color:#5d707a;margin-bottom:14px}
    .견 .두{display:flex;align-items:baseline;gap:22px}
    .견 .수{font-size:64px;font-weight:900;color:#e9e9ee;line-height:1}
    .견 .화{font-size:34px;color:#5d707a}
    .견 .수2{font-size:64px;font-weight:900;color:#c9a84c;line-height:1;
             transform:translateY(${ㄴ((1 - 견줌) * -26)}px)}
    .견 p{margin-top:16px;font-size:27px;color:#b9c6cc;line-height:1.4}
    .견 b{color:#e9e9ee}

    /* ⛔ 표·견이 다 안 사라진 채로 끝 문구가 겹쳐 뜨는 것을 막는다 — 막을 먼저 깐다 */
    .막{position:absolute;left:0;right:0;top:1260px;bottom:0;background:#0b0d12;
        opacity:${ㄴ(끝)}}
    .끝{position:absolute;left:84px;right:84px;top:1400px;opacity:${ㄴ(끝)};
        transform:scale(${ㄴ(0.96 + 0.04 * 끝)});transform-origin:left center}
    .끝 b{display:block;font-size:40px;font-weight:900;color:#e9e9ee;line-height:1.3}
    .끝 span{display:block;margin-top:16px;font-size:30px;font-weight:800;color:#c9a84c}
    .끝 i{display:block;margin-top:10px;font-style:normal;font-size:22px;color:#5d707a}
  </style>
  <div class="판">
    <div class="띠">100YEARMAP.COM</div>

    <div class="큰">
      <b>${기준연도}년, 60세 이상 가구 자산은<br>29세 이하 가구의 ${최근.배율}배입니다.</b>
      <em>가계금융복지조사 · 총자산 기준</em>
    </div>

    <div class="한">
      <h3>숫자보다 먼저</h3>
      <p>이 수는 <b>총자산</b>(부채를 빼기 전) 기준입니다. 부채까지 뺀 「순자산」으로 재면
        차이는 <b>더 큽니다</b> — 청년층은 학자금·전세자금 같은 부채 비중이 더 크기 때문입니다.</p>
    </div>

    <div class="표">
      <h3>연도 · 배율 (최근 ${표연도들.length}개년)</h3>
      <table><tbody>${줄들}</tbody></table>
    </div>

    <div class="견">
      <h3>${첫해}년 → ${기준연도}년</h3>
      <div class="두">
        <span class="수">${첫값.배율}배</span>
        <span class="화">→</span>
        <span class="수2">${최근.배율}배</span>
      </div>
      <p>29세 이하 ${만원표시(첫값.청년29이하_만원)} → ${만원표시(최근.청년29이하_만원)},
        60세 이상 ${만원표시(첫값.고령60이상_만원)} → ${만원표시(최근.고령60이상_만원)}로
        <b>둘 다 늘었지만 격차의 배율은 좁혀지지 않았습니다.</b></p>
    </div>

    <div class="막"></div>
    <div class="끝">
      <b>이것은 통계이지<br>당신이 아닙니다.</b>
      <span>100yearmap.com/wealth-gap</span>
      <i>가계금융복지조사 · ${연도들.length}개년 · 받은 날 ${d.받은때}</i>
    </div>

    <div class="누">${캐}</div>
  </div>`;
}

const 내가돌려졌다 = process.argv[1]
  && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (내가돌려졌다 && process.argv.includes('--selftest')) {
  let 통과 = 0; let 실패 = 0;
  const 글자만 = (h) => h.replace(/<style>[\s\S]*?<\/style>/g, '')
    .replace(/<svg[\s\S]*?<\/svg>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, ' ');
  const 재본다 = (이름, 값, 바람) => {
    const ok = typeof 바람 === 'function' ? 바람(값) : JSON.stringify(값) === JSON.stringify(바람);
    if (ok) 통과 += 1; else { 실패 += 1; console.log(`  ⛔ ${이름}  ->  ${JSON.stringify(값)}`); }
  };
  const 투명도 = (t, 이름) => {
    const m = 칸HTML(t).match(new RegExp(`\\.${이름}\\{[^}]*opacity:([0-9.]+)`));
    return m ? Number(m[1]) : null;
  };

  // ── 캐릭터 ───────────────────────────────────────────
  재본다('⭐ 캐릭터가 첫 1초에 이미 그려지고 있다', /stroke-dashoffset/.test(칸HTML(0.5)), true);
  재본다('⭐ 캐릭터가 숫자보다 먼저 나온다 — 0.5초엔 표가 없다', 투명도(0.5, '표'), 0);
  재본다('⭐ 캐릭터에 얼굴이 있다(다 그려진 뒤)', /class="we"/.test(칸HTML(2.5)), true);
  재본다('⭐ 끝에 캐릭터가 풀려서 선이 된다', (() => {
    const 관 = 칸HTML(12.6);
    return /class="ww"/.test(관) && !/class="we"/.test(관);
  })(), true);

  const 캐크기 = (t) => Number(칸HTML(t).match(/\.누\{[^}]*width:([0-9.]+)px/)?.[1] ?? 0);
  재본다('⭐⭐ 첫 화면에서 캐릭터가 크다 — 화면 폭의 절반이 넘는다', 캐크기(0.8) > 폭 * 0.5, true);
  재본다('⭐ 글이 뜬 뒤에는 물러나 작아진다', 캐크기(3.5) < 캐크기(0.8) * 0.65, true);
  재본다('물러나는 것이 툭 튀지 않는다', (() => {
    const xs = [1.7, 1.9, 2.1, 2.3, 2.5].map(캐크기);
    return xs.every((v, i) => i === 0 || v < xs[i - 1]);
  })(), true);

  재본다('⛔ 슬라이드쇼가 아니다 — 아무 두 시각이 다르다',
    (() => { const xs = [1, 2.5, 3.5, 5, 7, 9, 12].map(칸HTML); return new Set(xs).size === xs.length; })(), true);
  재본다('⛔ 마지막도 움직인다', 칸HTML(13.0) !== 칸HTML(13.1), true);

  // ── 이야기 ───────────────────────────────────────────
  재본다('⭐ 첫 화면에 배율이 나온다', 글자만(칸HTML(1.5)), (s) => s.includes(`${최근.배율}배`));
  재본다('⛔⛔ 한계가 표보다 먼저 뜬다', [투명도(3.6, '한'), 투명도(3.6, '표')],
    (v) => v[0] > 0.9 && v[1] < 0.05);
  재본다('⛔ 3초에 넘겨도 한계를 본다', 글자만(칸HTML(3.2)).replace(/\s+/g, ' '),
    (s) => s.includes('총자산') && s.includes('부채'));
  재본다('⭐ 표에 기준연도가 짚혀 있다', (칸HTML(7).match(/짚"/g) ?? []).length > 0, true);
  재본다('표 줄 수가 표연도 수와 같다(최근 5개년)', (칸HTML(7).match(/class="ㄹ/g) ?? []).length, 표연도들.length);
  재본다('표연도가 전체 연도의 마지막 조각이다(유리한 해 고르지 않음)',
    연도들.slice(-표연도들.length), 표연도들);
  재본다('⭐ 이것은 통계이지 당신이 아니다 문구가 끝에 있다', 글자만(칸HTML(13)),
    (s) => s.includes('통계이지') && s.includes('당신이 아닙니다'));
  재본다('⛔ 판정하는 말을 안 쓴다', [1.5, 7, 9, 13].map((t) => 글자만(칸HTML(t))).join(''),
    (s) => !/\b(많다|적다|좋다|나쁘다|심각하다)\b/.test(s));

  // ── 수를 손으로 안 박는다 ────────────────────────────
  재본다('⛔ 배율을 자료에서 읽는다', 최근.배율 === d.연도별[기준연도].배율, true);
  재본다('⛔ 첫해·기준연도가 자료의 실제 연도다', [첫해, 기준연도].every((y) => y in d.연도별), true);
  재본다('⛔ 검산(2024년 정부발표와 일치)을 지어내지 않았다',
    d.보도자료대조['2024년_검산'], '일치');

  // ── 주소 ────────────────────────────────────────────
  재본다('⭐ 주소가 1.6초부터 내내 보인다', [2.5, 5, 8, 11].map((t) => 투명도(t, '띠')),
    (xs) => xs.every((v) => v > 0.9));
  재본다('⭐ 첫 화면엔 주소가 없다', 투명도(0.5, '띠'), 0);
  재본다('끝에 지면 주소가 있다', 글자만(칸HTML(13)), (s) => s.includes('100yearmap.com/wealth-gap'));
  재본다('출처와 받은 날을 적는다', 글자만(칸HTML(13)),
    (s) => s.includes('가계금융복지조사') && s.includes(d.받은때));

  // ── 무성 콘텐트 다신 만들지 말 것(2026-08-29) ──────────────────────
  재본다('⛔ 목소리때들이 셋(대본 세 줄)이다', 목소리때들.length, 3);
  재본다('⛔ 목소리때들이 시간순으로 늘어난다', 목소리때들.every((t, i) => i === 0 || t > 목소리때들[i - 1]), true);
  재본다('⛔ 입이 움직이는 시작이 목소리 시작과 같다 — 화면과 소리가 딴말 안 한다', (() => {
    const m = 칸HTML.toString().match(/말함:\s*(\[\[[\s\S]*?\]\])/);
    const 말함 = JSON.parse(m[1]);
    return 말함.map((w) => w[0]).every((시작, i) => Math.abs(시작 - 목소리때들[i]) < 0.01);
  })(), true);

  console.log(실패 ? `\n⛔ ${실패}개 틀렸다 (통과 ${통과})` : `✅ 검사 ${통과}개 통과`);
  process.exit(실패 ? 1 : 0);
}

if (내가돌려졌다 && process.argv.includes('--그림')) {
  const i = process.argv.indexOf('--그림');
  const 때 = Number(process.argv[i + 1] ?? 6);
  const puppeteer = require('puppeteer-core');
  const b = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--no-sandbox', '--font-render-hinting=none'],
  });
  const p = await b.newPage();
  await p.setViewport({ width: 폭, height: 높, deviceScaleFactor: 1 });
  await p.setContent(칸HTML(때), { waitUntil: 'load' });
  const 낼길 = `C:/Users/User/AppData/Local/Temp/claude/100y-wealthgap-${String(때).replace('.', '_')}.png`;
  await p.screenshot({ path: 낼길 });
  await b.close();
  console.log(`✅ ${낼길}`);
}

if (내가돌려졌다 && !process.argv.includes('--selftest') && !process.argv.includes('--그림')) {
  const i = process.argv.indexOf('--out');
  const 낼길 = i >= 0 ? process.argv[i + 1] : 'wealthgap-100y.mp4';
  const 임시 = path.join(path.dirname(낼길), '_칸100ywealthgap');
  fs.mkdirSync(path.dirname(낼길), { recursive: true });
  fs.mkdirSync(임시, { recursive: true });

  const puppeteer = require('puppeteer-core');
  const b = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--no-sandbox', '--font-render-hinting=none'],
  });
  const p = await b.newPage();
  await p.setViewport({ width: 폭, height: 높, deviceScaleFactor: 1 });

  const 칸수 = Math.round(총초 * 초당);
  for (let n = 0; n < 칸수; n += 1) {
    await p.setContent(칸HTML(n / 초당), { waitUntil: 'load' });
    await p.screenshot({ path: path.join(임시, `${String(n).padStart(4, '0')}.png`) });
    if (n % 90 === 0) console.log(`  ${n}/${칸수}`);
  }
  await b.close();

  /* ⛔ 무성 콘텐트 다신 만들지 말 것(2026-08-29) — anullsrc(빈 소리) 대신 실제
     내레이션을 얹는다. mix-voice-kcw.mjs의 섞기필터를 그대로 쓴다(같은 실수를
     두 번 안 겪으려고 — adelay 양쪽 채널, apad로 총초까지 채워 끝 주소가 안 잘리게). */
  const 줄들 = 목소리때들.map((때, i) => {
    const 길 = path.join(목소리방, `${String(i).padStart(2, '0')}.wav`);
    if (!fs.existsSync(길)) { console.error(`⛔ 목소리가 없다 — ${길} (make-voice-100y.mjs로 먼저 낸다)`); process.exit(1); }
    return { 길, 때, 초: 초읽기(길) };
  });
  const 넘은것 = 넘치나(줄들, 총초);
  if (넘은것.length) {
    console.error('⛔ 목소리가 영상보다 길다 — 얹으면 잘린다:');
    for (const t of 넘은것) console.error(`   · ${t}`);
    process.exit(1);
  }

  const ff = require('ffmpeg-static');
  const 인자 = ['-y', '-framerate', String(초당), '-i', path.join(임시, '%04d.png')];
  for (const 줄 of 줄들) 인자.push('-i', 줄.길);
  인자.push(
    '-filter_complex', 섞기필터(줄들, 총초),
    '-map', '0:v', '-map', '[말끝]',
    '-c:v', 'libx264', '-profile:v', 'baseline', '-level', '3.1', '-pix_fmt', 'yuv420p',
    '-crf', '20', '-c:a', 'aac', '-b:a', '128k', '-shortest',
    '-movflags', '+faststart', 낼길,
  );
  execFileSync(ff, 인자, { stdio: 'ignore' });

  /* ⛔ 얹으면서 짧아졌는지 잰다 — mix-voice-kcw.mjs가 겪은 사고(끝 주소가 잘림)와 같은 검사 */
  const 길이재기 = (길) => {
    try { execFileSync(ff, ['-i', 길], { stdio: 'pipe' }); } catch (e) {
      const m = String(e.stderr).match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
      return m ? +m[1] * 3600 + +m[2] * 60 + +m[3] : null;
    }
    return null;
  };
  const 낸길이 = 길이재기(낼길);
  if (낸길이 !== null && 총초 - 낸길이 > 0.2) {
    console.error(`\n🔴 얹으면서 짧아졌다 — 원본 ${총초}초 → 낸 것 ${낸길이}초`);
    process.exit(1);
  }

  fs.rmSync(임시, { recursive: true, force: true });
  console.log(`✅ ${낼길}  ${총초}초 · ${폭}x${높} · ${(fs.statSync(낼길).size / 1024).toFixed(0)}KB`);
}
