#!/usr/bin/env node
/**
 * 잰다-운세기사뒤-네이버유입.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * 사장님 2026-11-19 — 「**운세 기사 나간 뒤 네이버 검색으로 들어오는 방문자가
 *   좀 늘었는 지 봐**」
 *
 * [무엇을 재나]
 *   네 사이트의 **네이버에서 온 방문자**를 날짜별로 갈라 낸다.
 *   중부매일 운세 기사의 첫 출고일을 등록 기록에서 읽어 그 앞뒤로 나눠 견준다.
 *
 * ⛔ 「늘었다」를 평균 하나로 말하지 않는다 — 날짜별 줄을 그대로 낸다.
 * ⛔ 기사가 나간 날이 오늘 하루뿐이면 **「아직 못 잰다」**고 적는다. 하루치로
 *    추세를 말하지 않는다.
 * ⚠ GA4 는 당일·전날 집계가 덜 찬다. 그 날은 표시로 갈라 둔다.
 *
 * 쓰는 법
 *   node scripts/잰다-운세기사뒤-네이버유입.mjs            # 최근 21일
 *   node scripts/잰다-운세기사뒤-네이버유입.mjs --일 30
 *   node scripts/잰다-운세기사뒤-네이버유입.mjs --자체검사
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 여기 = path.dirname(fileURLToPath(import.meta.url));
const 뿌리 = path.join(여기, '..');

export const 기록파일 = [
  'docs/중부매일-띠별-등록기록.tsv',
  'docs/중부매일-별자리-올린기록.tsv',
];

/** 네이버에서 온 것인가 — search.naver.com · m.search.naver.com · naver 전부 */
export function 네이버인가(출처) {
  return /naver/i.test(String(출처 ?? ''));
}

/**
 * 🔴 **네이버 검색인가** — 「organic 만」으로 재면 대부분이 버려진다.
 *   2026-11-19 실측: 28일 동안 백년지도의 네이버 유입 3,195명 가운데
 *   **2,581명이 `m.search.naver.com / referral`** 이었다. GA4 는 네이버 모바일
 *   검색을 검색엔진으로 못 알아보고 referral 로 적는다. 그것도 검색으로 들어온 것이다.
 * ⛔ 로그인(nid)·블로그·카페·메일은 검색이 아니다 — 갈라서 뺀다.
 */
export function 네이버검색인가(출처, 매체) {
  const s = String(출처 ?? '').toLowerCase();
  if (!네이버인가(s)) return false;
  if (/^(nid|blog|cafe|mail|post|tv|shopping)\./.test(s)) return false;
  if (/organic/i.test(String(매체 ?? ''))) return true;
  return /(^|\.)search\.naver\.com$/.test(s) || s === 'naver';
}

/** YYYYMMDD → YYYY-MM-DD */
export function 날풀기(s) {
  const t = String(s ?? '');
  return /^\d{8}$/.test(t) ? `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)}` : t;
}

/** 등록 기록에서 «됐다» 로 찍힌 가장 이른 날 — 운세 기사가 처음 나간 날 */
export function 첫기사날(글들) {
  let 가장이른 = null;
  for (const 글 of 글들) {
    for (const 줄 of String(글 ?? '').split(/\r?\n/)) {
      if (!줄 || 줄.startsWith('#')) continue;
      const 칸 = 줄.split('\t');
      const 날 = (칸[0] || '').trim();
      const 됐나 = (칸[3] || '').trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(날)) continue;
      if (됐나 !== '됐다') continue;
      if (!가장이른 || 날 < 가장이른) 가장이른 = 날;
    }
  }
  return 가장이른;
}

/** 줄들을 «사이트 → 날 → 사람수» 로 접는다 */
export function 접기(줄들, { 우리것인가, 사이트이름 }) {
  const 표 = {};
  const 날들 = new Set();
  for (const r of 줄들 ?? []) {
    const [d, h, 출처, 매체] = r.값;
    if (!우리것인가(h)) continue;
    if (!네이버검색인가(출처, 매체)) continue;
    const 날 = 날풀기(d);
    const s = 사이트이름(h);
    날들.add(날);
    (표[s] ??= {})[날] = (표[s][날] || 0) + r.수;
  }
  return { 표, 날들: [...날들].sort() };
}

/** 기준일 앞뒤로 갈라 하루 평균을 낸다. 날이 없으면 null —  */
export function 앞뒤평균(날별, 날들, 기준날) {
  const 앞 = 날들.filter((d) => d < 기준날);
  const 뒤 = 날들.filter((d) => d >= 기준날);
  const 평균 = (목록) => (목록.length
    ? 목록.reduce((a, d) => a + (날별?.[d] || 0), 0) / 목록.length
    : null);
  return { 앞평균: 평균(앞), 뒤평균: 평균(뒤), 앞날수: 앞.length, 뒤날수: 뒤.length };
}

/* ── 자체검사 ─────────────────────────────────────────────────────────── */
function 자체검사() {
  const 잰다 = [];
  const 본다 = (이름, 값) => 잰다.push([이름, !!값]);

  본다('네이버 출처를 알아본다', 네이버인가('search.naver.com'));
  본다('m.search 도 네이버다', 네이버인가('m.search.naver.com'));
  본다('구글은 네이버가 아니다', !네이버인가('google'));
  본다('빈 값은 네이버가 아니다', !네이버인가(null));
  본다('naver / organic 은 검색이다', 네이버검색인가('naver', 'organic'));
  본다('🔴 m.search.naver.com / referral 도 검색이다',
    네이버검색인가('m.search.naver.com', 'referral'));
  본다('search.naver.com / referral 도 검색이다',
    네이버검색인가('search.naver.com', 'referral'));
  본다('⛔ 로그인(nid)은 검색이 아니다', !네이버검색인가('nid.naver.com', 'referral'));
  본다('⛔ 블로그는 검색이 아니다', !네이버검색인가('blog.naver.com', 'referral'));
  본다('⛔ 카페는 검색이 아니다', !네이버검색인가('cafe.naver.com', 'referral'));
  본다('구글은 네이버 검색이 아니다', !네이버검색인가('google', 'organic'));
  본다('날을 푼다', 날풀기('20261119') === '2026-11-19');
  본다('이미 푼 날은 그대로 둔다', 날풀기('2026-11-19') === '2026-11-19');

  const 기록 = [
    '# 날\t올린때\t승인\t됐나\t그림수\t주소',
    '2026-11-20\t2026-11-19 00:48\t승인\t됐다\t12\thttp://x',
    '2026-11-19\t2026-11-19 00:25\t미승인\t됐다\t12\thttp://x',
    '2026-11-18\t2026-11-18 00:25\t미승인\t안됐다\t0\t',
  ].join('\n');
  본다('됐다 로 찍힌 가장 이른 날을 집는다', 첫기사날([기록]) === '2026-11-19');
  본다('안 된 날은 안 센다', 첫기사날([기록]) !== '2026-11-18');
  본다('빈 기록이면 날이 없다', 첫기사날(['# 날\n']) === null);
  본다('기록이 둘이면 더 이른 쪽', 첫기사날([기록, '2026-11-10\tx\tx\t됐다\t12\tu']) === '2026-11-10');

  const 도구 = { 우리것인가: (h) => !/localhost/.test(h), 사이트이름: (h) => h.replace(/^www\./, '') };
  const 줄들 = [
    { 값: ['20261119', 'klifemap.ai', 'search.naver.com', 'organic'], 수: 5 },
    { 값: ['20261119', 'www.klifemap.ai', 'search.naver.com', 'organic'], 수: 2 },
    { 값: ['20261119', 'klifemap.ai', 'google', 'organic'], 수: 9 },
    { 값: ['20261118', 'klifemap.ai', 'nid.naver.com', 'referral'], 수: 7 },
    { 값: ['20261118', 'localhost', 'search.naver.com', 'organic'], 수: 3 },
    { 값: ['20261118', 'klifemap.ai', 'm.search.naver.com', 'referral'], 수: 4 },
  ];
  const { 표, 날들 } = 접기(줄들, 도구);
  본다('www 를 한 사이트로 묶는다', 표['klifemap.ai']['2026-11-19'] === 7);
  본다('구글은 빼고 센다', 표['klifemap.ai']['2026-11-19'] !== 16);
  본다('🔴 모바일 검색(referral)을 센다', 표['klifemap.ai']['2026-11-18'] === 4);
  본다('우리 것이 아닌 호스트는 뺀다', Object.keys(표).length === 1);
  본다('날이 정렬돼 나온다', 날들.join(',') === '2026-11-18,2026-11-19');

  const 날별 = { '2026-11-16': 2, '2026-11-17': 4, '2026-11-18': 6, '2026-11-19': 10 };
  const 날목록 = Object.keys(날별).sort();
  const a = 앞뒤평균(날별, 날목록, '2026-11-19');
  본다('앞 평균을 낸다', a.앞평균 === 4);
  본다('뒤 평균을 낸다', a.뒤평균 === 10);
  본다('기준날은 뒤에 든다', a.뒤날수 === 1);
  const b = 앞뒤평균(날별, 날목록, '2026-11-01');
  본다('앞에 날이 없으면 null 이다 — 0 이 아니다', b.앞평균 === null);

  const 진 = 잰다.filter(([, v]) => !v);
  for (const [이름, v] of 잰다) console.log(`${v ? '✅' : '🔴'} ${이름}`);
  console.log(진.length ? `\n🔴 ${진.length}/${잰다.length} 떨어졌다` : `\n✅ 자체검사 ${잰다.length} 통과`);
  process.exitCode = 진.length ? 1 : 0;
}

/* ── 실제로 잰다 ──────────────────────────────────────────────────────── */
function 인자(이름, 기본) {
  const i = process.argv.indexOf(이름);
  if (i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')) return process.argv[i + 1];
  return 기본;
}

async function 본일() {
  const { 토큰받기, 재기, 우리것인가, 사이트이름 } = await import('./lib/ga4.mjs');
  const 일수 = Number(인자('--일', '21'));

  const 글들 = 기록파일.map((p) => {
    const 길 = path.join(뿌리, p);
    return fs.existsSync(길) ? fs.readFileSync(길, 'utf8') : '';
  });
  const 기준날 = 첫기사날(글들);

  const t = await 토큰받기();
  if (t.못잼) { console.log('🔴 GA4 에 못 물었다 — ' + t.못잼); process.exitCode = 1; return; }

  const 줄들 = await 재기(t.토큰, t.속성, ['date', 'hostName', 'sessionSource', 'sessionMedium'],
    { 시작: `${일수}daysAgo`, 끝: 'today' });
  if (줄들 === null) { console.log('🔴 GA4 가 줄을 안 줬다 — 못 쟀다'); process.exitCode = 1; return; }

  const { 표, 날들 } = 접기(줄들, { 우리것인가, 사이트이름 });

  console.log(`■ 네이버 검색으로 들어온 방문자 — 최근 ${일수}일 (오늘 포함)`);
  console.log(`   중부매일 운세 기사 첫 출고일: ${기준날 ?? '기록에서 못 찾았다'}`);
  console.log('   ⚠ 오늘과 어제는 GA4 집계가 덜 찬다\n');

  const 사이트들 = Object.keys(표).sort();
  if (!사이트들.length) { console.log('   네이버 검색으로 들어온 줄이 한 줄도 없다'); return; }

  const 모든날 = 날들;
  console.log('   날        ' + 사이트들.map((s) => s.padStart(14)).join(''));
  for (const d of 모든날) {
    const 표시 = 기준날 && d >= 기준날 ? ' ⭐' : '   ';
    console.log(`   ${d}${표시}` + 사이트들.map((s) => String(표[s][d] ?? 0).padStart(14)).join(''));
  }

  if (!기준날) return;
  console.log('\n   첫 출고일 앞뒤 하루 평균');
  for (const s of 사이트들) {
    const { 앞평균, 뒤평균, 앞날수, 뒤날수 } = 앞뒤평균(표[s], 모든날, 기준날);
    const 글 = (v) => (v === null ? '못 쟀다' : v.toFixed(1) + '명');
    console.log(`   ${s.padEnd(20)} 앞 ${글(앞평균)} (${앞날수}일)   →   뒤 ${글(뒤평균)} (${뒤날수}일)`);
  }
  const 뒤날수 = 모든날.filter((d) => d >= 기준날).length;
  if (뒤날수 <= 2) {
    console.log(`\n   🔴 기사가 나간 뒤가 ${뒤날수}일뿐이다 — 늘었다·줄었다를 아직 말할 수 없다.`);
  }
}

if (process.argv.includes('--자체검사')) 자체검사();
else await 본일();
