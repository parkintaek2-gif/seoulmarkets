#!/usr/bin/env node
/**
 * make-video-100y-csat-inquiry.mjs — 백년지도 쇼츠. 20초 · 1080×1920 · 한국어.
 *   「수능 탐구 17과목 지원자 수 — 생명과학Ⅰ·지구과학Ⅰ이 가장 많이 줄었다」(`/csat-inquiry-subject-count`)
 *
 * 🔴 사장님(8/28) — 「달랑 카드, 그래픽 등 스틸이미지 사용하지마」·「캐릭터를 만들어서 활용」.
 *   make-video-100y-tech-name.mjs 꼴 그대로 — 캐릭터가 그려지며 들어오고, 말하는 동안 입이 움직이고,
 *   과목별 막대가 2026학년도 자리(옅은 막대) 위로 2027학년도 값까지 자란다.
 *   목소리는 make-voice-100y.mjs(Heami), 섞기는 mix-voice-kcw.mjs. (2026-10-26 · 1번)
 *
 * ⛔ 화면·대사에 없는 수를 말하지 않는다 — 전부 csat-kice-tables.json(평가원 붙임2)에서 지면과 같은 값을 쓴다.
 * ⛔ 과목 인원은 과목 선택 수다 — 화면에 «과목 선택 수»라 적는다.
 *
 * 쓰는 법
 *   node scripts/make-voice-100y.mjs --out archive/video/voice/csat-inquiry --줄 "..." --줄 "..." --줄 "..."  ← 먼저
 *   node scripts/make-video-100y-csat-inquiry.mjs --out public/100y/video/수능탐구과목.mp4
 *   node scripts/make-video-100y-csat-inquiry.mjs --selftest
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
export const 총초 = 20;
export const 주소 = '100yearmap.com/csat-inquiry-subject-count';

export const 목소리방 = 'archive/video/voice/csat-inquiry';
export const 목소리때들 = [0.6, 5.0, 11.2];
/* 목소리 길이(make-voice-100y 실측 3.98 · 5.73 · 7.11초)에 맞춘 입 움직임 구간 */
const 말함 = [[0.6, 4.58], [5.0, 10.73], [11.2, 18.31]];

const 자료 = JSON.parse(fs.readFileSync(path.join(여기, 'src/data/100yearmap/csat-kice-tables.json'), 'utf8'));
const 앞 = 자료.과목별['2026'].사회과학탐구;
const 뒤 = 자료.과목별['2027'].사회과학탐구;
export const 과목들 = ['사회·문화', '생활과 윤리', '지구과학Ⅰ', '생명과학Ⅰ', '물리학Ⅰ', '화학Ⅰ'];
export const 큰과목 = '생명과학Ⅰ';
export const 준수 = 앞[큰과목] - 뒤[큰과목];
export const 과탐다줄 = 자료.과학탐구과목.every((s) => 뒤[s] < 앞[s]);
const 최대 = Math.max(...과목들.flatMap((s) => [앞[s], 뒤[s]]));
const 쉼 = (n) => n.toLocaleString('en-US');
const ㄴ = (v) => Math.round(v * 100) / 100;

export function 칸HTML(초) {
  const 머리 = 술술(사이(초, 0.0, 0.7));
  const 띠 = 술술(사이(초, 0.9, 1.4));
  const 큰수나옴 = 술술(사이(초, 5.2, 5.9));
  const 옛막대 = 술술(사이(초, 1.8, 2.6));
  const 막대들 = 과목들.map((_, i) => 술술(사이(초, 2.4 + i * 0.35, 3.4 + i * 0.35)));
  const 맺음 = 술술(사이(초, 11.4, 12.1));
  const 끝 = 술술(사이(초, 16.4, 17.0));
  const 물러남 = 술술(사이(초, 1.6, 2.6));
  const 자리 = (큰, 작) => ㄴ(큰 + (작 - 큰) * 물러남);
  const 캐 = 캐릭터SVG(초, { 들어옴: 0.1, 그리는초: 1.0, 말함, 가리킴: [[5.0, 10.73]], 풀림: 16.4 });
  const 길이 = 600;
  const 줄 = 과목들.map((s, i) => {
    const 줄었나 = 뒤[s] < 앞[s];
    const 지금 = 앞[s] + (뒤[s] - 앞[s]) * 막대들[i];
    return `
      <div class="과" style="opacity:${ㄴ(옛막대 * (1 - 끝))}">
        <span>${s}</span>
        <div class="틀"><i style="width:${ㄴ((앞[s] / 최대) * 길이)}px"></i><b class="${줄었나 ? '줄' : '늘'}" style="width:${ㄴ((지금 / 최대) * 길이)}px"></b></div>
        <em style="opacity:${ㄴ(막대들[i])}">${쉼(뒤[s])}</em>
      </div>`;
  }).join('');
  return `<style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{width:${폭}px;height:${높}px;background:#12151c;color:#e9e9ee;overflow:hidden;
         font-family:'Malgun Gothic','맑은 고딕',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
    .판{position:absolute;inset:0;padding:100px 72px}
    .누{position:absolute;left:${자리(232, 720)}px;top:${자리(430, 1380)}px;
        width:${자리(616, 290)}px;height:${자리(806, 380)}px;color:#d4a843}
    .누 svg{width:100%;height:100%}
    .띠{position:absolute;left:72px;top:56px;font-size:26px;font-weight:800;letter-spacing:.08em;color:#9a7a2e;opacity:${ㄴ(띠)}}
    .머리{font-size:54px;font-weight:800;line-height:1.24;letter-spacing:-2px;opacity:${ㄴ(머리)};transform:translateY(${ㄴ((1 - 머리) * 26)}px)}
    .곁{margin-top:14px;font-size:26px;color:#9aa2b1;opacity:${ㄴ(머리)}}
    .보기{margin-top:30px;font-size:24px;color:#9aa2b1;opacity:${ㄴ(옛막대 * (1 - 끝))}}
    .보기 i{display:inline-block;width:26px;height:16px;background:#3a3f4c;border-radius:3px;margin:0 8px 0 0}
    .보기 b{display:inline-block;width:26px;height:16px;background:#d4a843;border-radius:3px;margin:0 8px 0 24px}
    .보기 b.줄{background:#7fa6d9}
    .과들{margin-top:18px}
    .과{display:flex;align-items:center;gap:16px;margin-top:20px;font-size:27px}
    .과 span{width:190px;color:#c3c8d4}
    .틀{position:relative;width:${길이}px;height:34px}
    .틀 i{position:absolute;left:0;top:0;height:34px;background:#3a3f4c;border-radius:5px}
    .틀 b{position:absolute;left:0;top:7px;height:20px;border-radius:4px}
    .틀 b.늘{background:#d4a843}.틀 b.줄{background:#7fa6d9}
    .과 em{font-style:normal;font-weight:800;font-variant-numeric:tabular-nums}
    .큰수줄{margin-top:40px;padding:22px 28px;border-left:6px solid #7fa6d9;background:#1b1f29;border-radius:10px;opacity:${ㄴ(큰수나옴 * (1 - 끝))}}
    .큰수{font-size:96px;font-weight:900;color:#7fa6d9;letter-spacing:-3px}
    .큰수딸림{margin-top:4px;font-size:28px;color:#c3c8d4;line-height:1.5}
    .맺음{margin-top:26px;font-size:30px;font-weight:800;line-height:1.4;opacity:${ㄴ(맺음 * (1 - 끝))}}
    .막{position:absolute;left:0;right:0;top:1500px;bottom:0;background:#12151c;opacity:${ㄴ(끝)}}
    .마무리{position:absolute;left:72px;right:72px;top:1560px;opacity:${ㄴ(끝)}}
    .마무리 b{display:block;font-size:38px;font-weight:900;color:#e9e9ee;line-height:1.3}
    .마무리 span{display:block;margin-top:14px;font-size:28px;font-weight:800;color:#d4a843}
    .마무리 i{display:block;margin-top:8px;font-style:normal;font-size:22px;color:#8b93a3}
  </style>
  <div class="판">
    <div class="띠">100YEARMAP.COM</div>
    <div class="머리">수능 D-24<br>탐구 과목 지원자 수</div>
    <div class="곁">한국교육과정평가원 원표 · 과목 선택 수</div>
    <div class="보기"><i></i>2026학년도<b></b>2027 늘어남<b class="줄"></b>2027 줄어듦</div>
    <div class="과들">${줄}</div>
    <div class="큰수줄"><div class="큰수">−${쉼(준수)}</div><div class="큰수딸림">${큰과목} ${쉼(앞[큰과목])} → ${쉼(뒤[큰과목])}</div></div>
    <div class="맺음">${과탐다줄 ? '과학탐구 8과목 모두 줄었습니다.' : ''}<br>왜 그런지는 이 표가 답하지 않습니다.</div>
    <div class="막"></div>
    <div class="마무리">
      <b>이것은 통계이지<br>당신이 아닙니다.</b>
      <span>${주소}</span>
      <i>한국교육과정평가원 · 2026·2027학년도 수능 지원자 현황</i>
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
  재본다('⛔ 슬라이드쇼가 아니다 — 열 시각이 다 다른 그림', (() => { const xs = [0.5, 1.5, 2.5, 3.2, 4, 5.5, 7, 11.6, 13, 17].map(칸HTML); return new Set(xs).size === xs.length; })());
  재본다('⭐ 대사의 «십일만 이천 → 칠만 사천»이 자료와 맞다', Math.floor(앞[큰과목] / 1000) === 112 && Math.floor(뒤[큰과목] / 1000) === 74);
  재본다('⭐ 대사의 «삼만 칠천 명 넘게»가 자료와 맞다', 준수 >= 37000 && 준수 < 38000);
  재본다('⭐ 대사의 «과학탐구 여덟 과목 모두 줄었다»가 자료와 맞다', 과탐다줄 && 자료.과학탐구과목.length === 8);
  재본다('⭐ 대사의 «사회문화·생활과 윤리는 늘었다»가 자료와 맞다', 뒤['사회·문화'] > 앞['사회·문화'] && 뒤['생활과 윤리'] > 앞['생활과 윤리']);
  재본다('⭐ 대사의 «이십사 일 전»이 시험일과 맞다', Math.round((new Date(2026, 10, 19) - new Date(2026, 9, 26)) / 864e5) === 24);
  재본다('⭐ 끝에 「」와 주소', 글자만(칸HTML(19)).includes('통계이지') && 글자만(칸HTML(19)).includes(주소));
  재본다('⛔ 입 움직임 시작이 목소리 시작과 같다', 말함.every((w, i) => Math.abs(w[0] - 목소리때들[i]) < 0.01));
  const 댈수 = new Set(['24', '8', '2026', '2027', ...과목들.map((s) => 쉼(뒤[s])), 쉼(준수), 쉼(앞[큰과목]), 쉼(뒤[큰과목])]);
  const 온글 = [1, 3, 5, 7, 12, 19].map(칸HTML).join(' ');
  const 못댄것 = [...글자만(온글).replace(/100yearmap\.com\/csat-inquiry-subject-count/g, ' ').replace(/100YEARMAP\.COM/g, ' ').replace(/[ⅠⅡ]/g, '').matchAll(/\d[\d,]*/g)]
    .map((m) => m[0]).filter((s) => !댈수.has(s));
  재본다(`화면의 수가 전부 자료에서 온다${못댄것.length ? ` — 못 댄 것: ${[...new Set(못댄것)].join(' · ')}` : ''}`, 못댄것.length === 0);
  console.log(실패 ? `\n⛔ ${실패}개 틀렸다 (통과 ${통과})` : `✅ 검사 ${통과}개 통과`);
  process.exit(실패 ? 1 : 0);
}

if (내가돌려졌다 && !process.argv.includes('--selftest')) {
  const oi = process.argv.indexOf('--out');
  const 낼길 = oi >= 0 ? process.argv[oi + 1] : path.join(여기, 'public/100y/video/수능탐구과목.mp4');
  const 임시 = path.join(path.dirname(낼길), '_칸100ycsat');
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
