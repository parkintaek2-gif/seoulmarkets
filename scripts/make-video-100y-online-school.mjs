#!/usr/bin/env node
/**
 * make-video-100y-online-school.mjs — 백년지도 쇼츠. 18.5초 · 1080×1920 · 한국어.
 *   「공립 온라인학교 시도별」(`/online-high-school-by-area`) — 2023년부터 시도마다 하나씩, 17곳
 *
 * 🔴 사장님(8/28) — 「달랑 카드, 그래픽 등 스틸이미지 사용하지마」·「캐릭터를 만들어서 활용」.
 *   그래서 카드 다섯 장을 잇지 않는다. make-video-100y-social-trust.mjs 꼴 그대로 —
 *   캐릭터(kcw-character.mjs)가 그려지며 들어오고, 말하는 동안 입이 움직이고, 글이 차례로 나온다.
 *   목소리는 make-voice-100y.mjs(Windows SAPI Heami), 섞기는 mix-voice-kcw.mjs.
 *   (2026-10-24 · 1번 — 오전에 카드 슬라이드쇼로 구웠다가 배포 전에 거두고 다시 만든 편)
 *
 * ⛔ 화면·대사에 없는 수를 말하지 않는다 — 전부 pages-school.json 에서 같은 거름으로 센다.
 * ⛔ 누가 다닐 수 있는지·무엇을 가르치는지는 말하지 않는다(NEIS 에 없다).
 *
 * 쓰는 법
 *   node scripts/make-voice-100y.mjs --out archive/video/voice/online-school --줄 "..." --줄 "..." --줄 "..."  ← 먼저
 *   node scripts/make-video-100y-online-school.mjs --out public/100y/video/공립온라인학교.mp4
 *   node scripts/make-video-100y-online-school.mjs --selftest
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
const 여기 = fileURLToPath(new URL('..', import.meta.url));

export const 초당 = 30;
export const 폭 = 1080;
export const 높 = 1920;
export const 총초 = 18.5;
export const 주소 = '100yearmap.com/online-high-school-by-area';

export const 목소리방 = 'archive/video/voice/online-school';
export const 목소리때들 = [0.6, 4.6, 11.0];
/* 목소리 길이(make-voice-100y 실측 3.61 · 6.02 · 5.35초)에 맞춘 입 움직임 구간 */
const 말함 = [[0.6, 4.21], [4.6, 10.62], [11.0, 16.35]];

const 학교 = JSON.parse(fs.readFileSync(path.join(여기, 'src/data/100yearmap/pages-school.json'), 'utf8'));
export const 온라인 = 학교
  .filter((x) => x.종류 === '각종학교(고)' && /온라인학교|온학교|온세종/.test(String(x.title)))
  .sort((a, b) => String(a.설립일).localeCompare(String(b.설립일)) || a.title.localeCompare(b.title, 'ko'));
const 해 = (x) => String(x.설립일).slice(0, 4);
const 달 = (x) => Number(String(x.설립일).slice(4, 6));
export const 해별 = {};
for (const x of 온라인) 해별[해(x)] = (해별[해(x)] ?? 0) + 1;
export const 첫 = 온라인[0];
export const 끝학교 = 온라인[온라인.length - 1];

const ㄴ = (v) => Math.round(v * 100) / 100;

export function 칸HTML(초) {
  const 머리 = 술술(사이(초, 0.0, 0.7));
  const 띠 = 술술(사이(초, 0.9, 1.4));
  const 큰수나옴 = 술술(사이(초, 2.2, 2.9));
  const 해들 = Object.keys(해별).map((_, i) => 술술(사이(초, 4.8 + i * 0.5, 5.4 + i * 0.5)));
  const 처음끝 = 술술(사이(초, 7.4, 8.1));
  const 맺음 = 술술(사이(초, 11.2, 11.9));
  const 끝 = 술술(사이(초, 16.6, 17.2));
  const 물러남 = 술술(사이(초, 1.6, 2.6));
  const 자리 = (큰, 작) => ㄴ(큰 + (작 - 큰) * 물러남);
  const 캐 = 캐릭터SVG(초, { 들어옴: 0.1, 그리는초: 1.0, 말함, 가리킴: [[0.6, 4.21]], 풀림: 16.6 });
  const 해줄 = Object.entries(해별).map(([y, n], i) => `
      <div class="해" style="opacity:${ㄴ(해들[i] * (1 - 끝))};transform:translateX(${ㄴ((1 - 해들[i]) * -30)}px)">
        <span>${y}년</span><b style="width:${n * 34}px"></b><em>${n}곳</em>
      </div>`).join('');
  return `<style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{width:${폭}px;height:${높}px;background:#12151c;color:#e9e9ee;overflow:hidden;
         font-family:'Malgun Gothic','맑은 고딕',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
    .판{position:absolute;inset:0;padding:100px 84px}
    .누{position:absolute;left:${자리(232, 690)}px;top:${자리(430, 1360)}px;
        width:${자리(616, 300)}px;height:${자리(806, 392)}px;color:#d4a843}
    .누 svg{width:100%;height:100%}
    .띠{position:absolute;left:84px;top:56px;font-size:26px;font-weight:800;letter-spacing:.08em;color:#9a7a2e;opacity:${ㄴ(띠)}}
    .머리{font-size:52px;font-weight:800;line-height:1.24;letter-spacing:-2px;opacity:${ㄴ(머리)};transform:translateY(${ㄴ((1 - 머리) * 26)}px)}
    .곁{margin-top:14px;font-size:26px;color:#9aa2b1;opacity:${ㄴ(머리)}}
    .큰수줄{margin-top:48px;opacity:${ㄴ(큰수나옴 * (1 - 끝))}}
    .큰수{font-size:120px;font-weight:900;color:#d4a843;letter-spacing:-3px}
    .큰수딸림{margin-top:4px;font-size:28px;color:#c3c8d4}
    .해들{margin-top:40px}
    .해{display:flex;align-items:center;gap:18px;margin-top:16px;font-size:30px}
    .해 span{width:110px;color:#c3c8d4}.해 b{height:26px;background:#d4a843;border-radius:4px}.해 em{font-style:normal;font-weight:800}
    .처음끝{margin-top:36px;padding:24px 28px;border-left:6px solid #d4a843;background:#1b1f29;border-radius:10px;
            font-size:27px;line-height:1.6;color:#c3c8d4;opacity:${ㄴ(처음끝 * (1 - 끝))}}
    .처음끝 b{color:#e9e9ee}
    .맺음{margin-top:28px;font-size:30px;font-weight:800;line-height:1.4;opacity:${ㄴ(맺음 * (1 - 끝))}}
    .막{position:absolute;left:0;right:0;top:1500px;bottom:0;background:#12151c;opacity:${ㄴ(끝)}}
    .마무리{position:absolute;left:84px;right:84px;top:1560px;opacity:${ㄴ(끝)}}
    .마무리 b{display:block;font-size:38px;font-weight:900;color:#e9e9ee;line-height:1.3}
    .마무리 span{display:block;margin-top:14px;font-size:28px;font-weight:800;color:#d4a843}
    .마무리 i{display:block;margin-top:8px;font-style:normal;font-size:22px;color:#8b93a3}
  </style>
  <div class="판">
    <div class="띠">100YEARMAP.COM</div>
    <div class="머리">시도마다 하나씩 생긴<br>공립 온라인학교</div>
    <div class="곁">NEIS 학교기본정보 · 각종학교(고)</div>
    <div class="큰수줄"><div class="큰수">${온라인.length}곳</div><div class="큰수딸림">문 연 해</div></div>
    <div class="해들">${해줄}</div>
    <div class="처음끝">처음 <b>${첫.title}</b> · ${해(첫)}년 ${달(첫)}월<br>마지막 <b>${끝학교.title}</b> · ${해(끝학교)}년 ${달(끝학교)}월</div>
    <div class="맺음">누가 다닐 수 있는지는 NEIS 에 없습니다.<br>학교 홈페이지에서 확인하십시오.</div>
    <div class="막"></div>
    <div class="마무리">
      <b>이것은 통계이지<br>당신이 아닙니다.</b>
      <span>${주소}</span>
      <i>NEIS 교육정보 개방 포털 · 학교기본정보</i>
    </div>
    <div class="누">${캐}</div>
  </div>`;
}

const 내가돌려졌다 = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (내가돌려졌다 && process.argv.includes('--selftest')) {
  let 통과 = 0; let 실패 = 0;
  const 글자만 = (h) => h.replace(/<style>[\s\S]*?<\/style>/g, '').replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, ' ');
  const 재본다 = (이름, 참) => { if (참) 통과 += 1; else { 실패 += 1; console.log(`  ⛔ ${이름}`); } };
  재본다('⭐ 캐릭터가 첫 1초에 그려지고 있다', /stroke-dashoffset/.test(칸HTML(0.5)));
  재본다('⛔ 슬라이드쇼가 아니다 — 열 시각이 다 다른 그림', (() => { const xs = [0.5, 1.5, 2.5, 4, 5.5, 7, 9, 11, 13, 15].map(칸HTML); return new Set(xs).size === xs.length; })());
  재본다('⭐ 큰 수가 온라인학교 수다', 글자만(칸HTML(3.5)).includes(`${온라인.length}곳`));
  재본다('⭐ 해별 수를 더하면 전체다', Object.values(해별).reduce((a, b) => a + b, 0) === 온라인.length);
  재본다('⭐ 처음·마지막 학교 이름이 있다', 글자만(칸HTML(9)).includes(첫.title) && 글자만(칸HTML(9)).includes(끝학교.title));
  재본다('⭐ 끝에 「」와 주소', 글자만(칸HTML(18)).includes('통계이지') && 글자만(칸HTML(18)).includes(주소));
  재본다('⛔ 목소리때들이 셋, 시간순', 목소리때들.length === 3 && 목소리때들.every((t, i) => i === 0 || t > 목소리때들[i - 1]));
  재본다('⛔ 입 움직임 시작이 목소리 시작과 같다', 말함.every((w, i) => Math.abs(w[0] - 목소리때들[i]) < 0.01));
  const 댈수 = new Set([온라인.length, ...Object.keys(해별), ...Object.values(해별), 해(첫), 달(첫), 해(끝학교), 달(끝학교)].map(String));
  const 온글 = [1, 3, 6, 9, 12, 18].map(칸HTML).join(' ');
  const 못댄것 = [...글자만(온글).replace(new RegExp(주소.replace('.', '\\.'), 'g'), ' ').replace(/100YEARMAP\.COM/g, ' ').matchAll(/\d+/g)]
    .map((m) => m[0]).filter((s) => !댈수.has(s));
  재본다(`화면의 수가 전부 자료에서 온다${못댄것.length ? ` — 못 댄 것: ${[...new Set(못댄것)].join(' · ')}` : ''}`, 못댄것.length === 0);
  console.log(실패 ? `\n⛔ ${실패}개 틀렸다 (통과 ${통과})` : `✅ 검사 ${통과}개 통과`);
  process.exit(실패 ? 1 : 0);
}

if (내가돌려졌다 && !process.argv.includes('--selftest')) {
  const oi = process.argv.indexOf('--out');
  const 낼길 = oi >= 0 ? process.argv[oi + 1] : path.join(여기, 'public/100y/video/공립온라인학교.mp4');
  const 임시 = path.join(path.dirname(낼길), '_칸100yonline');
  fs.mkdirSync(임시, { recursive: true });
  const { default: puppeteer } = await import('file:///C:/Users/USER/Documents/GitHub/klifemap/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js');
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox', '--font-render-hinting=none'] });
  const p = await b.newPage();
  await p.setViewport({ width: 폭, height: 높, deviceScaleFactor: 1 });
  const 칸수 = Math.round(총초 * 초당);
  for (let n = 0; n < 칸수; n += 1) {
    await p.setContent(칸HTML(n / 초당), { waitUntil: 'load' });
    await p.screenshot({ path: path.join(임시, `${String(n).padStart(4, '0')}.png`) });
    if (n % 90 === 0) console.log(`  ${n}/${칸수}`);
  }
  await b.close();
  const 줄들 = 목소리때들.map((때, i) => {
    const 길 = path.join(여기, 목소리방, `${String(i).padStart(2, '0')}.wav`);
    if (!fs.existsSync(길)) { console.error(`⛔ 목소리가 없다 — ${길}`); process.exit(1); }
    return { 길, 때, 초: 초읽기(길) };
  });
  const 넘은것 = 넘치나(줄들, 총초);
  if (넘은것.length) { console.error('⛔ 목소리가 영상보다 길다:', 넘은것); process.exit(1); }
  const ff = require('ffmpeg-static');
  const 인자 = ['-y', '-framerate', String(초당), '-i', path.join(임시, '%04d.png')];
  for (const 줄 of 줄들) 인자.push('-i', 줄.길);
  인자.push('-filter_complex', 섞기필터(줄들, 총초), '-map', '0:v', '-map', '[말끝]',
    '-c:v', 'libx264', '-profile:v', 'baseline', '-level', '3.1', '-pix_fmt', 'yuv420p',
    '-crf', '20', '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart', 낼길);
  execFileSync(ff, 인자, { stdio: 'ignore' });
  console.log(`✅ ${낼길}`);
  fs.rmSync(임시, { recursive: true, force: true });
}
