#!/usr/bin/env node
/**
 * make-video-100y-tech-name.mjs — 백년지도 쇼츠. 18.5초 · 1080×1920 · 한국어.
 *   「인공지능·반도체 고등학교 — 새 이름, 오래된 학교」(`/tech-name-high-school`)
 *
 * 🔴 사장님(8/28) — 「달랑 카드, 그래픽 등 스틸이미지 사용하지마」·「캐릭터를 만들어서 활용」.
 *   make-video-100y-online-school.mjs 꼴 그대로 — 캐릭터가 그려지며 들어오고, 말하는 동안 입이 움직이고,
 *   설립 연대별 막대가 차례로 자란다. 목소리는 make-voice-100y.mjs(Heami), 섞기는 mix-voice-kcw.mjs.
 *   (2026-10-25 · 1번)
 *
 * ⛔ 화면·대사에 없는 수를 말하지 않는다 — 전부 pages-school.json 에서 지면과 같은 거름으로 센다.
 * ⛔ 옛 이름은 NEIS 에 없다 — 학교마다 옛 이름을 지어 말하지 않는다.
 *
 * 쓰는 법
 *   node scripts/make-voice-100y.mjs --out archive/video/voice/tech-name --줄 "..." --줄 "..." --줄 "..."  ← 먼저
 *   node scripts/make-video-100y-tech-name.mjs --out public/100y/video/인공지능반도체고교.mp4
 *   node scripts/make-video-100y-tech-name.mjs --selftest
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
export const 주소 = '100yearmap.com/tech-name-high-school';

export const 목소리방 = 'archive/video/voice/tech-name';
export const 목소리때들 = [0.6, 5.4, 11.5];
/* 목소리 길이(make-voice-100y 실측 4.39 · 5.58 · 4.36초)에 맞춘 입 움직임 구간 */
const 말함 = [[0.6, 4.99], [5.4, 10.98], [11.5, 15.86]];

/* 지면(src/pages/100y/tech-name-high-school)과 같은 낱말·같은 거름 */
const 낱말 = ['인공지능', '소프트웨어', '반도체', '바이오', '에너지', '디지털', '미디어', '게임', '로봇', 'IT', '애니메이션', '뷰티'];
const 학교 = JSON.parse(fs.readFileSync(path.join(여기, 'src/data/100yearmap/pages-school.json'), 'utf8'));
const 해 = (x) => Number(String(x.설립일).slice(0, 4));
export const 든것 = 학교
  .filter((x) => x.종류 === '고등학교' && /^\d{8}$/.test(String(x.설립일)) && 낱말.some((w) => String(x.title).includes(w)))
  .sort((a, b) => String(a.설립일).localeCompare(String(b.설립일)));
export const 기준해 = 2005;
export const 옛 = 든것.filter((x) => 해(x) < 기준해).length;
export const 가장옛 = 든것[0];
export const 연대별 = {};
for (const x of 든것) { const d = `${Math.floor(해(x) / 10) * 10}`; 연대별[d] = (연대별[d] ?? 0) + 1; }

const ㄴ = (v) => Math.round(v * 100) / 100;

export function 칸HTML(초) {
  const 머리 = 술술(사이(초, 0.0, 0.7));
  const 띠 = 술술(사이(초, 0.9, 1.4));
  const 큰수나옴 = 술술(사이(초, 2.2, 2.9));
  const 막대들 = Object.keys(연대별).map((_, i) => 술술(사이(초, 5.6 + i * 0.4, 6.2 + i * 0.4)));
  const 옛줄 = 술술(사이(초, 9.4, 10.1));
  const 맺음 = 술술(사이(초, 11.7, 12.4));
  const 끝 = 술술(사이(초, 16.6, 17.2));
  const 물러남 = 술술(사이(초, 1.6, 2.6));
  const 자리 = (큰, 작) => ㄴ(큰 + (작 - 큰) * 물러남);
  const 캐 = 캐릭터SVG(초, { 들어옴: 0.1, 그리는초: 1.0, 말함, 가리킴: [[5.4, 10.98]], 풀림: 16.6 });
  const 줄 = Object.entries(연대별).map(([d, n], i) => `
      <div class="해" style="opacity:${ㄴ(막대들[i] * (1 - 끝))}">
        <span>${d}년대</span><b style="width:${ㄴ(n * 46 * 막대들[i])}px"></b><em>${n}곳</em>
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
    .큰수줄{margin-top:44px;opacity:${ㄴ(큰수나옴 * (1 - 끝))}}
    .큰수{font-size:120px;font-weight:900;color:#d4a843;letter-spacing:-3px}
    .큰수딸림{margin-top:4px;font-size:28px;color:#c3c8d4}
    .해들{margin-top:30px}
    .해{display:flex;align-items:center;gap:18px;margin-top:12px;font-size:28px}
    .해 span{width:140px;color:#c3c8d4}.해 b{height:24px;background:#d4a843;border-radius:4px}.해 em{font-style:normal;font-weight:800}
    .옛줄{margin-top:30px;padding:22px 28px;border-left:6px solid #d4a843;background:#1b1f29;border-radius:10px;
          font-size:27px;line-height:1.6;color:#c3c8d4;opacity:${ㄴ(옛줄 * (1 - 끝))}}
    .옛줄 b{color:#e9e9ee}
    .맺음{margin-top:24px;font-size:30px;font-weight:800;line-height:1.4;opacity:${ㄴ(맺음 * (1 - 끝))}}
    .막{position:absolute;left:0;right:0;top:1500px;bottom:0;background:#12151c;opacity:${ㄴ(끝)}}
    .마무리{position:absolute;left:84px;right:84px;top:1560px;opacity:${ㄴ(끝)}}
    .마무리 b{display:block;font-size:38px;font-weight:900;color:#e9e9ee;line-height:1.3}
    .마무리 span{display:block;margin-top:14px;font-size:28px;font-weight:800;color:#d4a843}
    .마무리 i{display:block;margin-top:8px;font-style:normal;font-size:22px;color:#8b93a3}
  </style>
  <div class="판">
    <div class="띠">100YEARMAP.COM</div>
    <div class="머리">인공지능·반도체 고등학교<br>새 이름, 오래된 학교</div>
    <div class="곁">NEIS 학교기본정보 · 이름에 든 낱말로 골랐습니다</div>
    <div class="큰수줄"><div class="큰수">${든것.length}곳</div><div class="큰수딸림">세운 연대 (NEIS 설립일)</div></div>
    <div class="해들">${줄}</div>
    <div class="옛줄"><b>${옛}곳</b>이 ${기준해}년 전에 세워졌습니다<br>가장 오래된 곳 <b>${가장옛.title}</b> · ${해(가장옛)}년</div>
    <div class="맺음">새 이름이 새 학교는 아닙니다.<br>옛 이름은 NEIS 에 없습니다.</div>
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
  재본다('⛔ 슬라이드쇼가 아니다 — 열 시각이 다 다른 그림', (() => { const xs = [0.5, 1.5, 2.5, 4, 5.8, 7, 9, 11, 13, 15].map(칸HTML); return new Set(xs).size === xs.length; })());
  재본다('⭐ 큰 수가 지면의 학교 수다(48)', 글자만(칸HTML(3.5)).includes(`${든것.length}곳`) && 든것.length === 48);
  재본다('⭐ 연대별 수를 더하면 전체다', Object.values(연대별).reduce((a, b) => a + b, 0) === 든것.length);
  재본다('⭐ 대사의 «마흔여섯»이 화면 수와 같다', 옛 === 46);
  재본다('⭐ 끝에 「」와 주소', 글자만(칸HTML(18)).includes('통계이지') && 글자만(칸HTML(18)).includes(주소));
  재본다('⛔ 입 움직임 시작이 목소리 시작과 같다', 말함.every((w, i) => Math.abs(w[0] - 목소리때들[i]) < 0.01));
  const 댈수 = new Set([든것.length, 옛, 기준해, 해(가장옛), ...Object.keys(연대별), ...Object.values(연대별)].map(String));
  const 온글 = [1, 3, 6, 9, 10.5, 12, 18].map(칸HTML).join(' ');
  const 못댄것 = [...글자만(온글).replace(/100yearmap\.com\/tech-name-high-school/g, ' ').replace(/100YEARMAP\.COM/g, ' ').matchAll(/\d+/g)]
    .map((m) => m[0]).filter((s) => !댈수.has(s));
  재본다(`화면의 수가 전부 자료에서 온다${못댄것.length ? ` — 못 댄 것: ${[...new Set(못댄것)].join(' · ')}` : ''}`, 못댄것.length === 0);
  console.log(실패 ? `\n⛔ ${실패}개 틀렸다 (통과 ${통과})` : `✅ 검사 ${통과}개 통과`);
  process.exit(실패 ? 1 : 0);
}

if (내가돌려졌다 && !process.argv.includes('--selftest')) {
  const oi = process.argv.indexOf('--out');
  const 낼길 = oi >= 0 ? process.argv[oi + 1] : path.join(여기, 'public/100y/video/인공지능반도체고교.mp4');
  const 임시 = path.join(path.dirname(낼길), '_칸100ytech');
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
