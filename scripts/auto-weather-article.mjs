#!/usr/bin/env node
/**
 * auto-weather-article.mjs — **매일 10시, 날씨 기사를 시계가 잡는다.**
 *
 * ── 🔴 왜 (2026-10-17 · 사장님) ───────────────────────────────────
 * 「**매일 10시에 기사를 받을 수 있게 예약 해놔**」
 * 「**중부매일계정으로 여러 건 걸어놓은 예약 기사들 항상 제 시간에 반드시 보내게 조치해**」
 *
 * ⛔ 기억에 맡기지 않는다. 사람이 기억해서 지키는 구조를 만들지 않는다.
 * ⭐ 이 자가 하는 일 —
 *   ① 기상청에서 내일 예보를 «직접» 받는다 (잰다-내일날씨.mjs)
 *   ② 뼈대에 끼워 중부매일 계정 10시 회차에 시킨다
 *   ③ 다 쓰면 거둬서 데스킹에 건다
 *   ④ 막히면 그 자리에서 되돌려 다시 쓰게 한다 (막힌기사-되살린다.mjs)
 *   ⛔ 보내는 것은 사람이 본 뒤다 — 「보내기 전에 전부 눈으로 본다」(사장님)
 *     그래서 이 자는 «데스킹까지» 해 두고 선다. 09:20 에 돌면 10시 전에 끝난다.
 *
 * ⛔ 내가 기사를 쓰지 않는다. 쓰는 것은 중부매일 계정이다.
 *
 * 쓰는 법
 *   node scripts/auto-weather-article.mjs            오늘치를 준비한다
 *   node scripts/auto-weather-article.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
/* ⚠ 지역의 «차례»는 잰다-내일날씨.mjs 의 잴곳 하나가 정본이다 — 여기 다시 적지 않는다 */
import { 잴곳, 꼭있어야할곳 } from './잰다-내일날씨.mjs';

export const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const 뼈대길 = 'docs/지시-중부매일-날씨-뼈대.txt';
export const 지시길 = 'docs/지시-중부매일-날씨.txt';
export const 기사길 = 'docs/기사-중부매일-날씨-오늘.txt';
export const 자리표 = '<<<여기에 오늘 잰 예보를 넣는다>>>';
export const 날씨회차 = '10';

/** 잰 값을 사람이 읽는 사실 묶음으로 — ⛔ 못 잰 곳이 있으면 null (안 시킨다) */
export function 사실묶기(잰글, 이제 = new Date()) {
  const g = String(잰글 ?? '');
  if (!g.trim()) return null;
  if (/확인하지 못했다|못 쟀다/.test(g)) return null;
  /* 🔴 [2026-10-23 · 사장님] 「청주 → 충북 → 대전 → 세종 → 천안 등 충남 순」.
     ⚠ 차례는 «잴곳»이 정한다. 여기서 또 적으면 두 자리가 어긋난다. */
  const 줄 = g.split('\n').map((x) => x.trim())
    .filter((x) => 잴곳.some(([이]) => x.startsWith(`${이} `)));
  /* ⛔ 청주·대전은 사장님이 키워드로 못박으신 곳이다 — 하나라도 없으면 안 시킨다.
     나머지는 못 재면 그 줄만 빠진다. 못 잰 곳 하나로 기사 전체를 세우지 않는다. */
  if (!꼭있어야할곳.every((이) => 줄.some((x) => x.startsWith(`${이} `)))) return null;
  if (줄.length < 3) return null;
  const 내일 = new Date(이제.getTime() + 24 * 60 * 60 * 1000);
  const 요일 = ['일', '월', '화', '수', '목', '금', '토'][내일.getDay()];
  return [
    `내일은 ${내일.getMonth() + 1}월 ${내일.getDate()}일 ${요일}요일입니다.`,
    '기상청 동네예보에서 오늘 아침 직접 받은 값입니다.',
    ...줄.map((x) => x.replace(/\s{2,}\(기상청.*$/, '')),
    '',
    '⚠ 아래는 기상청 전국 예보와 다른 언론 기사로 교차 확인한 것입니다.',
    '(교차 확인한 내용을 여기에 덧붙입니다)',
  ].join('\n');
}

/* ── 자가시험 ─────────────────────────────────────────────────────── */
export function 자가시험() {
  const 것 = [];
  const 검 = (이름, 참) => 것.push({ 이름, 참: !!참 });
  const 잰것 = [
    '■ 내일(10월 18일 일요일) 예보',
    '',
    '대전 아침 최저 15도 · 낮 최고 24도 · 하늘 흐림 · 강수확률 최대 70%   (기상청 대전광역시)',
    '청주 아침 최저 15도 · 낮 최고 22도 · 하늘 흐림 · 강수확률 최대 90%   (기상청 충청북도 청주시상당구)',
    '세종 아침 최저 16도 · 낮 최고 23도 · 하늘 흐림 · 강수확률 최대 80%   (기상청 세종특별자치시 조치원읍)',
    '',
    '✅ 세 곳 다 쟀다',
  ].join('\n');
  const 못잰것 = 잰것.replace('대전 아침 최저 15도 · 낮 최고 24도 · 하늘 흐림 · 강수확률 최대 70%   (기상청 대전광역시)',
    '대전 ⬜ 확인하지 못했다 — 예보를 받지 못했다');

  const r = 사실묶기(잰것, new Date(2026, 9, 17));
  검('세 도시를 다 묶는다', r && ['대전', '청주', '세종'].every((이) => r.includes(이)));
  검('내일 날짜를 적는다', r && r.includes('10월 18일 일요일'));
  검('⛔ 기상청 꼬리표는 뗀다', r && !r.includes('(기상청 대전광역시)'));
  검('🔴 한 곳이라도 못 쟀으면 안 시킨다', 사실묶기(못잰것) === null);
  검('⛔ 빈 글이면 안 시킨다', 사실묶기('') === null);
  검('⛔ 도시가 모자라면 안 시킨다', 사실묶기('대전 아침 최저 15도') === null);

  검('뼈대 파일이 있다', fs.existsSync(path.join(뿌리, 뼈대길)));
  const 뼈 = fs.existsSync(path.join(뿌리, 뼈대길)) ? fs.readFileSync(path.join(뿌리, 뼈대길), 'utf8') : '';
  검('🔴 뼈대에 자리표가 있다', 뼈.includes(자리표));
  검('🔴 뼈대가 [내일 날씨] 를 못박는다', 뼈.includes('[내일 날씨]'));
  검('🔴 뼈대가 청주·대전을 못박는다', 뼈.includes('청주와 대전을 반드시'));
  /* 🔴 [2026-10-23 · 사장님] 「청주 날씨를 먼저 보도, 그 다음에 충북, 대전, 세종,
     천안 등 충남 순으로 내용을 구성해라」 — 뼈대가 이 차례를 말해 줘야 기사가 그리 나온다. */
  검('🔴 뼈대가 지역 차례를 못박는다 (청주 → 충북 → 대전 → 세종 → 충남)',
    뼈.includes('청주를 맨 먼저 쓰고') && 뼈.includes('천안 등 충남 차례로'));
  검('🔴 뼈대가 제목에서도 청주를 앞에 놓으라 한다',
    뼈.includes('청주를 대전보다 앞에'));
  검('🔴 뼈대가 웹 검색을 막는다', 뼈.includes('웹 검색은 하지 마십시오'));
  검('🔴 뼈대가 바이라인을 머리에 넣으라고 한다', 뼈.includes('[중부매일 박인택 기자]'));
  검('🔴 뼈대가 없는 수치를 지어내지 말라고 한다', 뼈.includes('지어내지 마십시오'));
  검('날씨 회차는 10시다', 날씨회차 === '10');

  for (const x of 것) console.log(`${x.참 ? '✅' : '🔴'} ${x.이름}`);
  const 탈 = 것.filter((x) => !x.참).length;
  console.log(탈 ? `\n🔴 자가시험 ${탈}건 탈` : `\n✅ 자가시험 ${것.length} 통과`);
  return 탈 === 0;
}

/* ── 손으로 돌릴 때 ───────────────────────────────────────────────── */
const 나인가 = process.argv[1] && process.argv[1].includes('auto-weather-article');
if (나인가) {
  if (process.argv.includes('--자가시험')) process.exit(자가시험() ? 0 : 1);

  /* 🔴🔴 [2026-11-17 · 사장님] 「**내일 아침에만 날씨기사 쓰지마**」
     ─────────────────────────────────────────────────────────────
     «그날 하루만» 거른다. 예약을 끄지 않는다 — 끄면 다시 켜는 것을 잊는다.
     거를 날을 docs/날씨기사-거를날.txt 에 한 줄씩 적어 둔다(YYYY-MM-DD).
     지난 날짜는 저절로 쓸모가 없어지므로 치울 것도 없다.
     ⛔ 「오늘만 안 한다」를 기억에 맡기지 않는다. 파일이 기억한다. */
  const 거를날길 = path.join(뿌리, 'docs', '날씨기사-거를날.txt');
  const 이제 = new Date();   /* ⛔ toISOString() 금지 — 이 PC 가 KST 다 */
  const 오늘글 = 이제.getFullYear() + '-'
    + String(이제.getMonth() + 1).padStart(2, '0') + '-'
    + String(이제.getDate()).padStart(2, '0');
  if (fs.existsSync(거를날길)) {
    const 거를날들 = fs.readFileSync(거를날길, 'utf8')
      .split(/\r?\n/).map((x) => x.replace(/#.*$/, '').trim()).filter(Boolean);
    if (거를날들.includes(오늘글)) {
      console.log(`■ ${오늘글} 은 날씨 기사를 «거르는 날»이다 — 사장님 지시로 적혀 있다.`);
      console.log(`   적힌 곳 : docs/날씨기사-거를날.txt`);
      console.log('   ⚠ 예약은 그대로 살아 있다. 다음 날부터 평소대로 돈다.');
      process.exit(0);
    }
  }

  const 때 = new Date().toTimeString().slice(0, 5);
  console.log(`■ ${때} 날씨 기사 — 기상청에서 내일 예보를 받는다`);

  const 잼 = spawnSync(process.execPath, [path.join(뿌리, 'scripts', '잰다-내일날씨.mjs')],
    { cwd: 뿌리, encoding: 'utf8', timeout: 3 * 60 * 1000 });
  const 잰글 = String(잼.stdout ?? '');
  console.log(잰글.trim());

  const 사실 = 사실묶기(잰글);
  if (!사실) {
    console.log('\n🔴 예보를 다 받지 못했다 — **안 시킨다.**');
    console.log('   ⛔ 「맑음 0도」로 메우지 않는다. 다시 재고 시킨다.');
    process.exit(2);
  }

  const 뼈 = fs.readFileSync(path.join(뿌리, 뼈대길), 'utf8');
  if (!뼈.includes(자리표)) { console.log('🔴 뼈대에 자리표가 없다'); process.exit(1); }
  fs.writeFileSync(path.join(뿌리, 지시길), 뼈.replace(자리표, 사실), 'utf8');
  console.log(`\n✔ 지시문을 지었다 — ${지시길}`);

  console.log(`\n→ ${날씨회차}시 회차(중부매일 계정)에 시킨다. ⛔ 내가 쓰지 않는다.`);
  const r = spawnSync(process.execPath,
    [path.join(뿌리, 'scripts', '시킨다-중부매일-기사.mjs'), '--회차', 날씨회차, '--글', 지시길],
    { cwd: 뿌리, encoding: 'utf8', timeout: 7 * 60 * 1000, stdio: 'inherit' });
  if (r.status !== 0) { console.log('\n🔴 시키지 못했다 — 위 까닭을 본다'); process.exit(1); }

  console.log('\n✅ 시켰다. 다음 거둠에서 받아 데스킹에 건다.');
  console.log('   ⛔ 보내기 전에 전부 눈으로 본다 — 이 자는 보내지 않는다.');
}
