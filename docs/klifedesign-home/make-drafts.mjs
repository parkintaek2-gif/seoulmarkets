#!/usr/bin/env node
/**
 * 케이라이프디자인 회사 홈페이지(한 페이지) 디자인 초안 세 개를 HTML 로 만든다.
 * 문안 정본: docs/계획-케이라이프디자인-홈페이지-최종.md — 네 문장은 사장님 문장이라 한 글자도 고치지 않는다.
 * 넣는 것은 둘뿐이다: 회사 소개, 사이트 세 개 안내 카드. 회사 정보는 케이라이프맵 화면에 적힌 것과 같다.
 *   node docs/klifedesign-home/make-drafts.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 여기 = path.dirname(fileURLToPath(import.meta.url));
const 회사 = '케이라이프디자인';
const 소개 = '인생을 그리는 데 도움을 줄 수 있는 지도와 내비게이션 세 가지를 제공합니다.';
const 카드 = [
  { 이름: '케이라이프맵에이아이', 문장: '사주, 별자리, 궁합. 택일 등 인생에 필요한 지도를 그려 드립니다.', 주소: 'https://klifemap.ai', 보임: 'klifemap.ai' },
  { 이름: '백년지도', 문장: '0세부터 100세까지, 궁금한 것을 안내하는 인생 내비게이션입니다.', 주소: 'https://100yearmap.com', 보임: '100yearmap.com' },
  { 이름: '에스마켓츠', 문장: '아시아와 걸프 지역의 금융시장 데이터를 영어로 볼 수 있습니다.', 주소: 'https://seoulmarkets.com', 보임: 'seoulmarkets.com' },
];
const 정보 = ['상호: 주식회사 케이라이프디자인', '사업자등록번호: 456-87-03384', '주소: 세종특별자치시 남세종로 441, 제상가1동 101호 (보람동, 호려울마을5단지)', '고객센터: 070-5236-1029', '이메일: cs@klifedesign.net'];
const 저작 = '© 2026 주식회사 케이라이프디자인. All rights reserved.';
const 머리 = (제목, css) => `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${제목}</title><style>
*{box-sizing:border-box}html,body{margin:0}body{font-family:"Pretendard","Noto Sans KR","Malgun Gothic","Apple SD Gothic Neo",sans-serif;-webkit-font-smoothing:antialiased;word-break:keep-all}
a{color:inherit;text-decoration:none}${css}</style></head><body>`;
const 꼬리정보 = (cls) => `<footer class="${cls}"><p>${정보.join(' · ')}</p><p>${저작}</p></footer></body></html>`;

/* A — 밝고 단순한 안. 흰 바탕, 큰 글자, 얇은 테두리 카드 세 장 */
const A = 머리(회사, `
body{background:#fff;color:#14181f}
.wrap{max-width:1040px;margin:0 auto;padding:0 28px}
header{padding:120px 0 72px}
h1{font-size:46px;letter-spacing:-.02em;margin:0 0 22px;font-weight:800}
.lead{font-size:22px;line-height:1.6;color:#3b4350;margin:0;max-width:720px}
.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;padding-bottom:96px}
.card{display:flex;flex-direction:column;border:1px solid #dfe3ea;border-radius:16px;padding:30px 26px 26px;min-height:240px;transition:border-color .15s,transform .15s}
.card:hover{border-color:#14181f;transform:translateY(-2px)}
.card h2{font-size:22px;margin:0 0 14px;font-weight:700}
.card p{font-size:16px;line-height:1.7;color:#4a5361;margin:0 0 24px;flex:1}
.card span{font-size:15px;font-weight:600;color:#1f5fd1}
.card span::after{content:" →"}
.f{border-top:1px solid #e8ebf0;padding:28px 28px 44px;color:#7a8391;font-size:13px;line-height:1.8;max-width:1040px;margin:0 auto}
.f p{margin:0}
@media(max-width:760px){header{padding:72px 0 44px}h1{font-size:34px}.lead{font-size:18px}.cards{grid-template-columns:1fr;gap:14px;padding-bottom:56px}.card{min-height:0}}
`) + `<div class="wrap"><header><h1>${회사}</h1><p class="lead">${소개}</p></header><main class="cards">${카드.map((c) => `<a class="card" href="${c.주소}"><h2>${c.이름}</h2><p>${c.문장}</p><span>${c.보임}</span></a>`).join('')}</main></div>` + 꼬리정보('f');

/* B — 남색 지도 안. 위는 짙은 남색 바탕에 등고선 무늬, 카드가 그 경계에 걸친다 */
const 등고선 = encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="900" height="520" viewBox="0 0 900 520"><g fill="none" stroke="#ffffff" stroke-opacity=".09" stroke-width="1.2"><path d="M-20 420C120 340 220 470 380 400S640 300 920 380"/><path d="M-20 360C140 280 240 400 400 330S660 240 920 310"/><path d="M-20 300C160 220 260 330 420 262S680 180 920 240"/><path d="M-20 240C180 160 280 262 440 196S700 122 920 172"/><path d="M-20 180C200 100 300 196 460 132S720 64 920 106"/><path d="M-20 120C220 44 320 130 480 70S740 8 920 42"/><circle cx="640" cy="150" r="46"/><circle cx="640" cy="150" r="82"/><circle cx="640" cy="150" r="122"/></g></svg>');
const B = 머리(회사, `
body{background:#f3f5f9;color:#0f1b2d}
.hero{background:#0f2a4a url("data:image/svg+xml,${등고선}") right -40px top -20px/900px auto no-repeat;color:#fff;padding:110px 28px 170px}
.in{max-width:1040px;margin:0 auto}
h1{font-size:44px;margin:0 0 20px;font-weight:800;letter-spacing:-.01em}
.lead{font-size:21px;line-height:1.65;margin:0;max-width:640px;color:#dbe6f5}
.cards{max-width:1040px;margin:-96px auto 0;padding:0 28px 88px;display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.card{display:flex;flex-direction:column;background:#fff;border-radius:14px;padding:28px 26px 24px;box-shadow:0 10px 30px rgba(15,42,74,.12);border-top:4px solid #2f7de1;min-height:232px}
.card:nth-child(2){border-top-color:#1aa389}.card:nth-child(3){border-top-color:#e0892a}
.card h2{font-size:21px;margin:0 0 12px;font-weight:700}
.card p{font-size:16px;line-height:1.7;color:#44506180;color:#445061;margin:0 0 22px;flex:1}
.card span{font-size:14px;font-weight:700;color:#0f2a4a;border:1px solid #c9d3e2;border-radius:999px;padding:8px 14px;align-self:flex-start}
.f{background:#0f2a4a;color:#a9b9cf;font-size:13px;line-height:1.8;padding:30px 28px 40px}
.f p{margin:0 auto;max-width:1040px}
@media(max-width:760px){.hero{padding:72px 22px 130px;background-size:620px auto}h1{font-size:32px}.lead{font-size:18px}.cards{grid-template-columns:1fr;margin-top:-84px;padding:0 22px 56px;gap:14px}.card{min-height:0}}
`) + `<section class="hero"><div class="in"><h1>${회사}</h1><p class="lead">${소개}</p></div></section><main class="cards">${카드.map((c) => `<a class="card" href="${c.주소}"><h2>${c.이름}</h2><p>${c.문장}</p><span>${c.보임}</span></a>`).join('')}</main>` + 꼬리정보('f');

/* C — 따뜻한 종이 색 안. 명조 제목, 카드 대신 번호가 붙은 줄 세 개 */
const C = 머리(회사, `
body{background:#f7f2e9;color:#2a2520}
.wrap{max-width:880px;margin:0 auto;padding:0 28px}
header{padding:112px 0 56px;border-bottom:2px solid #2a2520}
h1{font-family:"Noto Serif KR","Nanum Myeongjo","Batang",serif;font-size:48px;margin:0 0 24px;font-weight:700;letter-spacing:-.01em}
.lead{font-size:21px;line-height:1.7;margin:0;color:#4d453c}
.rows{padding-bottom:88px}
.row{display:grid;grid-template-columns:64px 1fr auto;gap:8px 24px;align-items:baseline;padding:34px 0;border-bottom:1px solid #cfc5b4}
.row b{font-family:"Noto Serif KR","Nanum Myeongjo","Batang",serif;font-size:22px;color:#a2552a;font-weight:700}
.row h2{font-family:"Noto Serif KR","Nanum Myeongjo","Batang",serif;font-size:26px;margin:0 0 10px;font-weight:700}
.row p{font-size:16.5px;line-height:1.75;margin:0;color:#5a5148}
.row span{font-size:15px;font-weight:600;color:#a2552a;white-space:nowrap}
.row span::after{content:" ↗"}
.row:hover h2{text-decoration:underline;text-underline-offset:6px}
.f{max-width:880px;margin:0 auto;padding:26px 28px 44px;color:#8a7f70;font-size:13px;line-height:1.8}
.f p{margin:0}
@media(max-width:760px){header{padding:68px 0 36px}h1{font-size:34px}.lead{font-size:18px}.row{grid-template-columns:40px 1fr;padding:26px 0}.row span{grid-column:2;margin-top:6px}.row h2{font-size:22px}.rows{padding-bottom:48px}}
`) + `<div class="wrap"><header><h1>${회사}</h1><p class="lead">${소개}</p></header><main class="rows">${카드.map((c, i) => `<a class="row" href="${c.주소}"><b>0${i + 1}</b><div><h2>${c.이름}</h2><p>${c.문장}</p></div><span>${c.보임}</span></a>`).join('')}</main></div>` + 꼬리정보('f');

for (const [이름, 글] of [['draft-a.html', A], ['draft-b.html', B], ['draft-c.html', C]]) fs.writeFileSync(path.join(여기, 이름), 글, 'utf8');
console.log('초안 세 개를 적었다 — draft-a.html · draft-b.html · draft-c.html');
