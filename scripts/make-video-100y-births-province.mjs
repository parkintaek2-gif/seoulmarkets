#!/usr/bin/env node
/**
 * make-video-100y-births-province.mjs — 백년지도 쇼츠. 23초 · 1080×1920 · 한국어.
 *   「2026년 1~8월 출생아 시도별 — 17개 시도 한 표」(`/births-by-province-2026`)
 *
 * 🔴 사장님(8/28) — 「달랑 카드, 그래픽 등 스틸이미지 사용하지마」·「캐릭터를 만들어서 활용」.
 *   make-video-100y-teacher-exam.mjs 꼴 그대로 — 캐릭터가 그려지며 들어오고, 말하는 동안 입이 움직이고,
 *   17개 시도 막대가 1년 전보다 늘어난 비율까지 자란다. 2019년 같은 기간보다 많은 두 곳(경기·대전)은 색을 달리한다.
 *   목소리는 make-voice-100y.mjs(Heami), 섞기는 mix-voice-kcw.mjs. (2026-10-31 · 1번)
 *
 * ⛔ 화면·대사에 없는 수를 말하지 않는다 — 전부 births-2026.json에서 페이지와 같은 셈으로 낸다.
 *
 * 쓰는 법
 *   node scripts/make-voice-100y.mjs --out archive/video/voice/births-province --줄 "..." --줄 "..." --줄 "..."  ← 먼저
 *   node scripts/make-video-100y-births-province.mjs --out public/100y/video/시도별출생아2026.mp4
 *   node scripts/make-video-100y-births-province.mjs --selftest
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
export const 총초 = 23;
export const 주소 = '100yearmap.com/births-by-province-2026';

export const 목소리방 = 'archive/video/voice/births-province';
export const 목소리때들 = [0.6, 7.8, 14.4];
/* 목소리 길이(make-voice-100y 실측 6.69 · 6.04 · 5.58초)에 맞춘 입 움직임 구간 */
const 말함 = [[0.6, 7.29], [7.8, 13.84], [14.4, 19.98]];

const 자료 = JSON.parse(fs.readFileSync(path.join(여기, 'src/data/100yearmap/births-2026.json'), 'utf8'));
const 합 = (r, a, b) => r.월.filter((m) => m.월 >= a && m.월 <= b).reduce((t, m) => t + m.출생, 0);
const 달 = (r, m) => r.월.find((x) => x.월 === m).출생;
export const 행 = 자료.시도
  .map((r) => {
    const 올 = 합(r, '202601', '202608'); const 작 = 합(r, '202501', '202508'); const 옛 = 합(r, '201901', '201908');
    return { k: r.짧은, 율: (올 / 작 - 1) * 100, 넘음: 올 > 옛, 팔준: 달(r, '202608') < 달(r, '202508') };
  })
  .sort((a, b) => b.율 - a.율);
export const 전올 = 합(자료.전국, '202601', '202608');
export const 전율 = (전올 / 합(자료.전국, '202501', '202508') - 1) * 100;
const 최대 = 20;
const 쉼 = (n) => n.toLocaleString('en-US');
const 하나 = (v) => v.toFixed(1);
const ㄴ = (v) => Math.round(v * 100) / 100;

export function 칸HTML(초) {
  const 머리 = 술술(사이(초, 0.0, 0.7));
  const 띠 = 술술(사이(초, 0.9, 1.4));
  const 판나옴 = 술술(사이(초, 1.8, 2.6));
  const 막대들 = 행.map((_, i) => 술술(사이(초, 2.2 + i * 0.18, 3.2 + i * 0.18)));
  const 큰수나옴 = 술술(사이(초, 1.0, 1.7));
  const 이천십구 = 술술(사이(초, 7.8, 8.6));
  const 광주 = 술술(사이(초, 14.4, 15.1));
  const 끝 = 술술(사이(초, 20.2, 20.8));
  const 물러남 = 술술(사이(초, 1.6, 2.6));
  const 자리 = (큰, 작) => ㄴ(큰 + (작 - 큰) * 물러남);
  const 캐 = 캐릭터SVG(초, { 들어옴: 0.1, 그리는초: 1.0, 말함, 가리킴: [[7.8, 13.84]], 풀림: 20.2 });
  const 길이 = 560;
  const 줄 = 행.map((r, i) => {
    const 지금 = r.율 * 막대들[i];
    const 색 = r.넘음 ? `opacity:1;background:${이천십구 > 0.5 ? '#7fd99a' : '#d4a843'}` : '';
    const 표 = r.팔준 ? `<s style="opacity:${ㄴ(광주)}">8월만 보면 감소</s>` : '';
    return `
      <div class="시${r.팔준 && 광주 > 0.5 ? ' 짚음' : ''}" style="opacity:${ㄴ(판나옴 * (1 - 끝))}">
        <span>${r.k}</span>
        <div class="틀"><b style="width:${ㄴ((지금 / 최대) * 길이)}px;${색}"></b></div>
        <em style="opacity:${ㄴ(막대들[i])}">${하나(r.율)}%</em>${표}
      </div>`;
  }).join('');
  return `<style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{width:${폭}px;height:${높}px;background:#12151c;color:#e9e9ee;overflow:hidden;
         font-family:'Malgun Gothic','맑은 고딕',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
    .판{position:absolute;inset:0;padding:100px 72px}
    .누{position:absolute;left:${자리(232, 760)}px;top:${자리(430, 1330)}px;
        width:${자리(616, 260)}px;height:${자리(806, 340)}px;color:#d4a843}
    .누 svg{width:100%;height:100%}
    .띠{position:absolute;left:72px;top:56px;font-size:26px;font-weight:800;letter-spacing:.08em;color:#9a7a2e;opacity:${ㄴ(띠)}}
    .머리{font-size:54px;font-weight:800;line-height:1.24;letter-spacing:-2px;opacity:${ㄴ(머리)};transform:translateY(${ㄴ((1 - 머리) * 26)}px)}
    .곁{margin-top:14px;font-size:26px;color:#9aa2b1;opacity:${ㄴ(머리)}}
    .보기{margin-top:22px;font-size:23px;color:#9aa2b1;opacity:${ㄴ(이천십구 * (1 - 끝))}}
    .보기 b{display:inline-block;width:26px;height:16px;background:#7fd99a;border-radius:3px;margin:0 8px 0 0}
    .시들{margin-top:10px}
    .시{display:flex;align-items:center;gap:14px;margin-top:9px;font-size:26px;position:relative}
    .시 span{width:84px;color:#c3c8d4}
    .시.짚음 span{color:#ff9b7a;font-weight:800}
    .시 s{text-decoration:none;font-size:22px;color:#ff9b7a;font-weight:800;margin-left:6px}
    .틀{position:relative;width:${길이}px;height:30px}
    .틀 b{position:absolute;left:0;top:6px;height:18px;border-radius:4px;background:#d4a843}
    .시 em{font-style:normal;font-weight:800;font-variant-numeric:tabular-nums}
    .큰수줄{position:absolute;left:72px;right:72px;top:1270px;padding:20px 26px;border-left:6px solid #d4a843;background:#1b1f29;border-radius:10px;opacity:${ㄴ(큰수나옴 * (1 - 이천십구))}}
    .큰수{font-size:76px;font-weight:900;color:#d4a843;letter-spacing:-2px}
    .큰수딸림{margin-top:4px;font-size:27px;color:#c3c8d4;line-height:1.5}
    .둘째{position:absolute;left:72px;right:400px;top:1290px;font-size:31px;font-weight:800;line-height:1.45;opacity:${ㄴ(이천십구 * (1 - 광주))}}
    .둘째 b{color:#7fd99a}
    .셋째{position:absolute;left:72px;right:400px;top:1290px;font-size:31px;font-weight:800;line-height:1.45;opacity:${ㄴ(광주 * (1 - 끝))}}
    .셋째 b{color:#ff9b7a}
    .막{position:absolute;left:0;right:0;top:1500px;bottom:0;background:#12151c;opacity:${ㄴ(끝)}}
    .마무리{position:absolute;left:72px;right:72px;top:1560px;opacity:${ㄴ(끝)}}
    .마무리 b{display:block;font-size:38px;font-weight:900;color:#e9e9ee;line-height:1.3}
    .마무리 span{display:block;margin-top:14px;font-size:26px;font-weight:800;color:#d4a843}
    .마무리 i{display:block;margin-top:8px;font-style:normal;font-size:22px;color:#8b93a3}
  </style>
  <div class="판">
    <div class="띠">100YEARMAP.COM</div>
    <div class="머리">2026년 1~8월 출생아<br>17개 시도 1년 전보다</div>
    <div class="곁">국가데이터처 월별 인구동향 · 잠정</div>
    <div class="보기"><b></b>2019년 같은 기간보다 많은 곳</div>
    <div class="시들">${줄}</div>
    <div class="큰수줄"><div class="큰수">${쉼(전올)}명</div><div class="큰수딸림">전국 1~8월 출생아<br>1년 전보다 ${하나(전율)}% 많음</div></div>
    <div class="둘째">2019년 같은 기간보다<br>많은 곳은 <b>${행.filter((r) => r.넘음).map((r) => r.k).join('·')}</b>뿐</div>
    <div class="셋째"><b>${행.filter((r) => r.팔준).map((r) => r.k).join('·')}</b>은 8월 한 달만<br>보면 1년 전보다 적다</div>
    <div class="막"></div>
    <div class="마무리">
      <b>이것은 통계이지<br>당신이 아닙니다.</b>
      <span>${주소}</span>
      <i>국가데이터처 「2026년 8월 인구동향」 · 2026-10-28 발표</i>
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
  재본다('⛔ 슬라이드쇼가 아니다 — 열 시각이 다 다른 그림', (() => { const xs = [0.5, 1.5, 2.5, 3.2, 4, 7, 9, 15, 18, 22].map(칸HTML); return new Set(xs).size === xs.length; })());
  재본다('⭐ 대사의 «열일곱 개 시도가 모두 늘었다»가 자료와 맞다', 행.length === 17 && 행.every((r) => r.율 > 0));
  재본다('⭐ 대사의 «십구만 삼천칠백여 명»이 자료와 맞다', 전올 >= 193700 && 전올 < 193800);
  재본다('⭐ 대사의 «십사 점 오 퍼센트»가 자료와 맞다', 하나(전율) === '14.5');
  재본다('⭐ 대사의 «경기와 대전 두 곳»이 자료와 맞다', 행.filter((r) => r.넘음).map((r) => r.k).sort().join() === ['경기', '대전'].sort().join());
  재본다('⭐ 대사의 «광주 8월 감소»가 자료와 맞다', 행.filter((r) => r.팔준).map((r) => r.k).join() === '광주');
  재본다('⭐ 막대가 판을 넘지 않는다(최대 20)', 행.every((r) => r.율 <= 최대));
  재본다('⭐ 끝에 「」와 주소', 글자만(칸HTML(22.5)).includes('통계이지') && 글자만(칸HTML(22.5)).includes(주소));
  재본다('⛔ 입 움직임 시작이 목소리 시작과 같다', 말함.every((w, i) => Math.abs(w[0] - 목소리때들[i]) < 0.01));
  const 댈수 = new Set(['1', '8', '17', '2019', '2026', '2026-10-28', ...행.map((r) => 하나(r.율)), 쉼(전올), 하나(전율)]);
  const 온글 = [1, 3, 5, 9, 16, 22.5].map(칸HTML).join(' ');
  const 못댄것 = [...글자만(온글).replace(new RegExp(주소.replace(/[.\/-]/g, '\\$&'), 'g'), ' ').replace(/100YEARMAP\.COM/g, ' ').replace(/2026-10-28/g, ' ').matchAll(/\d[\d,.]*/g)]
    .map((m) => m[0].replace(/\.$/, '')).filter((s) => !댈수.has(s));
  재본다(`화면의 수가 전부 자료에서 온다${못댄것.length ? ` — 못 댄 것: ${[...new Set(못댄것)].join(' · ')}` : ''}`, 못댄것.length === 0);
  console.log(실패 ? `\n⛔ ${실패}개 틀렸다 (통과 ${통과})` : `✅ 검사 ${통과}개 통과`);
  process.exit(실패 ? 1 : 0);
}

if (내가돌려졌다 && process.argv.includes('--frame')) {
  const 초 = Number(process.argv[process.argv.indexOf('--frame') + 1]);
  const 낼 = process.argv[process.argv.indexOf('--frame') + 2];
  const { default: puppeteer } = await import('file:///C:/Users/USER/Documents/GitHub/klifemap/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js');
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox'] });
  const p = await b.newPage();
  await p.setViewport({ width: 폭, height: 높, deviceScaleFactor: 1 });
  await p.setContent(칸HTML(초), { waitUntil: 'load' });
  await p.screenshot({ path: 낼 });
  await b.close();
  process.exit(0);
}

if (내가돌려졌다 && !process.argv.includes('--selftest')) {
  const oi = process.argv.indexOf('--out');
  const 낼길 = oi >= 0 ? process.argv[oi + 1] : path.join(여기, 'public/100y/video/시도별출생아2026.mp4');
  const 임시 = path.join(path.dirname(낼길), '_칸100ybirths');
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
