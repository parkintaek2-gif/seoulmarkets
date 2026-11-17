#!/usr/bin/env node
/**
 * 잰다-어떤지역이-벌어오나.mjs — 지역 지면 가운데 **어떤 동네가 손님을 벌어 오나**.
 *
 * ── 🔴 왜 ────────────────────────────────────────────────────
 * [2026-11-17] 고등학교 지역 258장 가운데 **125장에만 방문 기록이 있었다.**
 * 나머지 133장은 28일 동안 한 사람도 안 열었다.
 *
 * 「왜」를 모르면 다음에 무엇을 만들지 정할 수 없다. 두 갈래다 —
 *   ① 작은 동네라 찾는 사람 자체가 적다  → 더 만들어도 소용없다. 다른 축을 판다
 *   ② 크기와 상관없이 안 걸린다          → 색인·제목 문제다. 고치면 133장이 살아난다
 * ⛔ 재지 않고 둘 중 하나로 단정하지 않는다.
 *
 * ── 무엇을 재나 ──────────────────────────────────────────────
 * 방문 기록이 있는 동네와 없는 동네의 **학교 수 분포**를 갈라 본다.
 * 학교 수는 그 동네의 크기를 대신한다(인구 자료를 따로 안 들여도 된다).
 *
 * 쓰는 법
 *   node scripts/잰다-어떤지역이-벌어오나.mjs
 *   node scripts/잰다-어떤지역이-벌어오나.mjs --selftest
 */
import { 토큰받기, 재기, 우리것인가 } from './lib/ga4.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** 주소에서 슬러그를 꺼낸다. ⛔ 퍼센트 인코딩을 그대로 두면 한 동네가 둘로 갈린다 */
export function 슬러그꺼내기(경로) {
  const m = String(경로 || '').match(/^\/(?:report|elementary|middle)\/area\/(.+?)\/?$/);
  if (!m) return null;
  try { return decodeURIComponent(m[1]); } catch (e) { return m[1]; }
}

/** 가운데값. ⛔ 평균을 쓰지 않는다 — 큰 시 몇 곳이 평균을 끌어올린다 */
export function 가운데값(수들) {
  if (!수들.length) return null;
  const s = [...수들].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : Math.round(((s[m - 1] + s[m]) / 2) * 10) / 10;
}

function 자가시험() {
  const 봄 = [];
  const 본다 = (이름, 참) => 봄.push({ 이름, 참 });
  본다('① 고등 주소에서 슬러그를 꺼낸다',
    슬러그꺼내기('/report/area/서울특별시-성북구') === '서울특별시-성북구');
  본다('② 끝의 빗금을 떼고 꺼낸다',
    슬러그꺼내기('/report/area/서울특별시-성북구/') === '서울특별시-성북구');
  /* 🔴 GA4 는 한글 주소를 퍼센트 인코딩으로 준다. 안 풀면 한 동네가 둘로 갈린다 */
  본다('③ 퍼센트 인코딩을 푼다',
    슬러그꺼내기('/report/area/%EC%84%9C%EC%9A%B8%ED%8A%B9%EB%B3%84%EC%8B%9C-%EC%84%B1%EB%B6%81%EA%B5%AC') === '서울특별시-성북구');
  본다('④ 초등·중등 주소도 꺼낸다',
    슬러그꺼내기('/elementary/area/경기도-화성시') === '경기도-화성시'
    && 슬러그꺼내기('/middle/area/경기도-화성시') === '경기도-화성시');
  본다('⑤ 지역 지면이 아니면 null', 슬러그꺼내기('/report/summary') === null && 슬러그꺼내기('/') === null);
  본다('⑥ 가운데값 — 홀수', 가운데값([1, 5, 3]) === 3);
  본다('⑦ 가운데값 — 짝수', 가운데값([1, 2, 3, 4]) === 2.5);
  본다('⑧ 빈 것은 null', 가운데값([]) === null);
  본다('⑨ 지역 자료가 있다', fs.existsSync(path.join(뿌리, 'src/data/100yearmap/areas.json')));

  let 깨짐 = 0;
  for (const s of 봄) if (!s.참) { console.log('🔴 ' + s.이름); 깨짐 += 1; }
  console.log(깨짐 ? `🔴 ${깨짐}가지 깨졌다 (전체 ${봄.length})` : `✅ ${봄.length}가지 다 통과`);
  return 깨짐 === 0;
}

async function 돈다() {
  const t = await 토큰받기();
  if (t.못잼) { console.log('🔴 못 쟀다 —', t.못잼); return; }

  const 줄들 = await 재기(t.토큰, t.속성, ['hostName', 'pagePath'],
    { 시작: '28daysAgo', 끝: 'yesterday' });
  if (!줄들) { console.log('🔴 GA4 가 줄을 안 줬다'); return; }

  /* 슬러그마다 사람 수 */
  const 벌었다 = new Map();
  for (const r of 줄들) {
    const [h, p] = r.값;
    if (!우리것인가(h) || !/100yearmap/i.test(h)) continue;
    const s = 슬러그꺼내기(p);
    if (!s) continue;
    벌었다.set(s, (벌었다.get(s) || 0) + r.수);
  }

  /* 고등학교 지역 전체 목록 — 자료에서 읽는다 */
  const { 단위 } = JSON.parse(fs.readFileSync(path.join(뿌리, 'src/data/100yearmap/areas.json'), 'utf8'));
  const 있음 = [], 없음 = [];
  for (const a of 단위) {
    const 사람 = 벌었다.get(a.slug) || 0;
    (사람 > 0 ? 있음 : 없음).push({ ...a, 사람 });
  }

  console.log('\n📏 지역 지면 — 어떤 동네가 손님을 벌어 오나 (28일 · GA4 순방문자)\n');
  console.log('  전체 지역 :', 단위.length, '· 기록 있음 :', 있음.length, '· 기록 없음 :', 없음.length);
  console.log('');
  console.log('  묶음          동네 수   학교 수 가운데값   학교 수 가장 적음~가장 많음');
  console.log('  ' + '─'.repeat(70));
  for (const [이름, 묶음] of [['기록 있음', 있음], ['기록 없음', 없음]]) {
    const 곳들 = 묶음.map((a) => Number(a.곳) || 0);
    const 가 = 가운데값(곳들);
    const 작 = Math.min(...곳들), 큰 = Math.max(...곳들);
    console.log('  ' + 이름.padEnd(14) + String(묶음.length).padStart(5)
      + String(가 ?? '—').padStart(16) + ('  ' + 작 + ' ~ ' + 큰).padStart(22));
  }

  /* 🔴 핵심 — 큰 동네인데도 기록이 없는 곳. 있으면 크기 문제가 아니다 */
  const 큰데없음 = 없음.filter((a) => (Number(a.곳) || 0) >= 10)
    .sort((a, b) => (Number(b.곳) || 0) - (Number(a.곳) || 0));
  console.log('\n  🔴 학교 10곳 이상인데 기록이 없는 동네 :', 큰데없음.length, '곳');
  for (const a of 큰데없음.slice(0, 15)) {
    console.log('     ' + String(a.곳).padStart(3) + '곳  ' + a.이름 + '  (' + a.slug + ')');
  }
  if (!큰데없음.length) {
    console.log('     없다 — 기록이 없는 곳은 모두 학교 10곳 미만인 작은 동네다.');
    console.log('     ⇒ 색인 문제가 아니라 «찾는 사람 자체가 적은» 것이다.');
    console.log('     ⇒ 작은 동네를 더 만드는 대신 «큰 동네의 다른 축»을 판다.');
  }

  /* 많이 번 동네의 크기 — 어느 크기대가 버나 */
  const 위 = [...있음].sort((a, b) => b.사람 - a.사람).slice(0, 10);
  console.log('\n  많이 번 열 곳 (사람 · 학교 수)');
  for (const a of 위) console.log('     ' + String(a.사람).padStart(4) + '명  ' + String(a.곳).padStart(3) + '곳  ' + a.이름);
  console.log('');
}

const 인자 = process.argv.slice(2);
if (인자.includes('--selftest')) process.exit(자가시험() ? 0 : 1);
await 돈다();
