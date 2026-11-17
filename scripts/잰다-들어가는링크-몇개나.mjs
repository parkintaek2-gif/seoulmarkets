#!/usr/bin/env node
/**
 * 잰다-들어가는링크-몇개나.mjs — 지면마다 **다른 지면 몇 곳이 가리키나**를 센다.
 *
 * ── 🔴 왜 ────────────────────────────────────────────────────
 * [2026-11-18] 고등학교 지역 258장 가운데 128장이 28일 동안 0명이었는데,
 * **동네 크기 문제가 아니었다** — 분당구(24곳)·화성시(24곳)가 0명이고
 * 부평구(21곳)는 95명이다. 네이버에 쳐 보니 의정부시만 뜨고 나머지는 안 떴다.
 *
 * 같은 날 초등 261장이 0명이던 원인이 **들어가는 링크 하나뿐**이었다.
 * 그렇다면 고등학교 안에서도 링크 수가 갈리는지 **재 본다.**
 * ⛔ 「링크 때문일 것이다」로 끝내지 않는다. 세어 보고 말한다.
 *
 * ── 어떻게 재나 ──────────────────────────────────────────────
 * 지어 놓은 dist 를 통째로 읽어 `href` 를 센다. 라이브를 긁지 않는다 —
 * 16,000장을 긁으면 우리 서버를 우리가 때린다.
 * ⛔ 한 지면 안에서 같은 곳을 두 번 가리켜도 **한 곳**으로 센다.
 *   「링크 수」가 아니라 **「몇 장이 가리키나」**가 알고 싶은 것이다.
 *
 * 쓰는 법
 *   node scripts/잰다-들어가는링크-몇개나.mjs
 *   node scripts/잰다-들어가는링크-몇개나.mjs --selftest
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { 토큰받기, 재기, 우리것인가 } from './lib/ga4.mjs';
import { 슬러그꺼내기 } from './잰다-어떤지역이-벌어오나.mjs';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(뿌리, 'dist', '100y');

/** 한 지면이 가리키는 «지역 지면»들. ⛔ 같은 곳을 두 번 세지 않는다 */
export function 가리키는곳(글) {
  const 본것 = new Set();
  for (const m of String(글).matchAll(/href="([^"]*\/(?:report|elementary|middle)\/area\/[^"]+)"/g)) {
    let 길 = m[1];
    /* 바깥 주소면 경로만 남긴다 */
    길 = 길.replace(/^https?:\/\/[^/]+/, '');
    const s = 슬러그꺼내기(길);
    if (s) 본것.add(길.replace(/^\/(report|elementary|middle)\/.*$/, '$1') + '|' + s);
  }
  return 본것;
}

function 자가시험() {
  const 봄 = [];
  const 본다 = (이름, 참) => 봄.push({ 이름, 참 });

  본다('① 고등 링크를 센다',
    가리키는곳('<a href="/report/area/서울특별시-성북구">x</a>').has('report|서울특별시-성북구'));
  본다('② 초등·중등도 센다',
    가리키는곳('<a href="/elementary/area/경기도-화성시">x</a>').has('elementary|경기도-화성시')
    && 가리키는곳('<a href="/middle/area/경기도-화성시">x</a>').has('middle|경기도-화성시'));
  /* 🔴 한 지면이 같은 곳을 두 번 가리켜도 한 곳이다 — 아니면 목록 지면이 수를 부풀린다 */
  본다('③ 같은 곳을 두 번 가리켜도 하나',
    가리키는곳('<a href="/report/area/A">x</a><a href="/report/area/A">y</a>').size === 1);
  본다('④ 온전한 주소도 경로로 센다',
    가리키는곳('<a href="https://100yearmap.com/report/area/A">x</a>').has('report|A'));
  본다('⑤ 지역 지면이 아니면 안 센다',
    가리키는곳('<a href="/report/summary">x</a><a href="/about">y</a>').size === 0);
  본다('⑥ 고등과 초등은 다른 곳으로 센다',
    가리키는곳('<a href="/report/area/A">x</a><a href="/elementary/area/A">y</a>').size === 2);
  본다('⑦ dist 가 지어져 있다', fs.existsSync(dist));

  let 깨짐 = 0;
  for (const s of 봄) if (!s.참) { console.log('🔴 ' + s.이름); 깨짐 += 1; }
  console.log(깨짐 ? `🔴 ${깨짐}가지 깨졌다 (전체 ${봄.length})` : `✅ ${봄.length}가지 다 통과`);
  return 깨짐 === 0;
}

function 모든html(방, 모은것 = []) {
  for (const 것 of fs.readdirSync(방, { withFileTypes: true })) {
    const 길 = path.join(방, 것.name);
    if (것.isDirectory()) 모든html(길, 모은것);
    else if (것.name.endsWith('.html')) 모은것.push(길);
  }
  return 모은것;
}

async function 돈다() {
  if (!fs.existsSync(dist)) { console.log('🔴 dist 가 없다 — 먼저 빌드한다'); return; }

  console.log('\n📏 지역 지면을 몇 장이 가리키나 (지어 놓은 dist 에서 센다)\n');
  const 파일들 = 모든html(dist);
  console.log('  읽을 지면 :', 파일들.length, '장');

  /* 슬러그 → 가리키는 지면 수 */
  const 받는다 = new Map();
  for (const f of 파일들) {
    const 글 = fs.readFileSync(f, 'utf8');
    for (const 열쇠 of 가리키는곳(글)) {
      받는다.set(열쇠, (받는다.get(열쇠) || 0) + 1);
    }
  }

  /* GA4 로 실제 방문을 붙인다 */
  const t = await 토큰받기();
  const 벌었다 = new Map();
  if (!t.못잼) {
    const 줄들 = await 재기(t.토큰, t.속성, ['hostName', 'pagePath'], { 시작: '28daysAgo', 끝: 'yesterday' });
    for (const r of 줄들 || []) {
      const [h, p] = r.값;
      if (!우리것인가(h) || !/100yearmap/i.test(h)) continue;
      const s = 슬러그꺼내기(p);
      if (!s) continue;
      const 갈래 = /\/elementary\//.test(p) ? 'elementary' : /\/middle\//.test(p) ? 'middle' : 'report';
      벌었다.set(갈래 + '|' + s, (벌었다.get(갈래 + '|' + s) || 0) + r.수);
    }
  } else {
    console.log('  ⚠ GA4 를 못 읽었다 —', t.못잼, '· 링크 수만 적는다');
  }

  /* 고등학교만 갈라 본다 — 여기가 128장 0명이 난 자리다 */
  const 고등 = [...받는다.entries()].filter(([k]) => k.startsWith('report|'));
  const 번곳 = [], 못번곳 = [];
  for (const [열쇠, 링크수] of 고등) {
    (벌었다.get(열쇠) > 0 ? 번곳 : 못번곳).push({ 열쇠, 링크수, 사람: 벌었다.get(열쇠) || 0 });
  }

  const 가운데 = (xs) => {
    if (!xs.length) return null;
    const s = [...xs].sort((a, b) => a - b);
    const m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };

  console.log('\n  고등학교 지역 지면 — 들어가는 링크 수를 갈라 본다\n');
  console.log('  묶음            지면 수   들어가는 링크 가운데값   가장 적음~가장 많음');
  console.log('  ' + '─'.repeat(74));
  for (const [이름, 묶음] of [['방문 있음', 번곳], ['방문 없음', 못번곳]]) {
    const xs = 묶음.map((x) => x.링크수);
    console.log('  ' + 이름.padEnd(16) + String(묶음.length).padStart(5)
      + String(가운데(xs) ?? '—').padStart(20)
      + ('  ' + (xs.length ? Math.min(...xs) : '—') + ' ~ ' + (xs.length ? Math.max(...xs) : '—')).padStart(22));
  }

  /* 🔴 판정 — 두 묶음의 링크 수가 같으면 링크 탓이 아니다 */
  const 가1 = 가운데(번곳.map((x) => x.링크수));
  const 가2 = 가운데(못번곳.map((x) => x.링크수));
  console.log('');
  if (가1 != null && 가2 != null) {
    if (Math.abs(가1 - 가2) <= 1) {
      console.log('  ⇒ 두 묶음의 들어가는 링크 수가 거의 같다. **링크 탓이 아니다.**');
      console.log('     ⛔ 링크를 더 거는 것으로는 이 128장이 안 살아난다. 다른 데를 봐야 한다.');
    } else {
      console.log('  ⇒ 링크 수가 갈린다 (' + 가1 + ' 대 ' + 가2 + '). 링크를 더 걸 자리가 있다.');
    }
  }

  /* 세 묶음의 링크 받는 수 — 오늘 낸 길이 실제로 걸렸나 */
  console.log('\n  갈래별 — 한 장이 받는 링크 수 가운데값');
  for (const [이름, 머리] of [['고등 /report/area/', 'report|'], ['초등 /elementary/area/', 'elementary|'], ['중등 /middle/area/', 'middle|']]) {
    const xs = [...받는다.entries()].filter(([k]) => k.startsWith(머리)).map(([, v]) => v);
    console.log('     ' + 이름.padEnd(24) + (xs.length ? xs.length + '장 · 가운데값 ' + 가운데(xs) : '0장'));
  }
  console.log('');
}

const 인자 = process.argv.slice(2);
if (인자.includes('--selftest')) process.exit(자가시험() ? 0 : 1);
await 돈다();
