/**
 * build-100y-upload-kit.mjs — 인스타그램이 열리는 날 바로 올릴 게시물 킷을 미리 짓는다.
 *
 * ── 왜 ─────────────────────────────────────────────────────────
 * 5번(총괄) 지침(2026-08-25 01:30) — 「올리는 일보다 «올릴 것을 제대로 짓는 일»이
 * 더 오래 걸립니다. 채널이 열린 날 바로 나가게 미리 지어 두십시오」. 6번·4번이 유튜브
 * 킷을 먼저 만들었다. 같은 방식으로 인스타(2번이 2026-08-24 15:56에 정한 1차 채널)
 * 카드뉴스 킷을 짓는다.
 *
 * ⛔ 문구를 지어내지 않는다 — 각 덱의 `.근거.json`에 이미 있는 「뜻」줄을 그대로 쓴다.
 * ⛔ 지면 주소가 없는 덱(근거 파일이 없는 덱)은 킷에 안 넣는다.
 * ⛔ /price(파는 지면)로만 가는 덱은 킷에서 뺀다 — 인스타 첫 인상에 파는 지면을 안 건다.
 *
 * 쓰는 법  node scripts/build-100y-upload-kit.mjs [--selftest]
 */
import fs from 'node:fs';
import { 오늘 } from './_kst.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 카드뉴스방 = path.join(뿌리, 'public/100y/cardnews');
const ORIGIN = 'https://100yearmap.com';

/** 덱 이름(파일명 앞부분)에서 「몇 번째 장」을 뗀다 */
export function 덱파일갈래(파일들) {
  const 덱별 = new Map();
  for (const f of 파일들) {
    const m = f.match(/^(.+)-(\d+)\.png$/);
    if (!m) continue;
    const 슬러그 = m[1];
    if (!덱별.has(슬러그)) 덱별.set(슬러그, []);
    덱별.get(슬러그).push(f);
  }
  return 덱별;
}

/** 근거 줄에서 지면 하나를 고른다. ⛔ /price 만 있으면 뺀다(null) */
export function 지면고르기(줄들) {
  const 후보 = 줄들.map((r) => r.지면).filter(Boolean);
  if (!후보.length) return null;
  const 무료 = 후보.find((u) => !u.includes('/price'));
  return 무료 ?? null; // ⛔ /price 뿐이면 안 쓴다(인스타 첫 인상에 파는 지면을 안 건다)
}

/** ⛔ 숫자 없이 관리용으로만 있는 줄 — 캡션에 안 쓴다(공시연도·공공누리 유형·값 안내 등) */
export const 관리용줄 = /공시연도|공공누리|한 벌 값|자료\s*이름|장수/;

/** 캡션을 짓는다 — 근거의 「뜻: 수」를 그대로 쓴다. 지어내지 않는다 */
export function 캡션짓기(줄들, 지면) {
  const 쓸줄 = 줄들.filter((r) => r.뜻 && r.수 != null && !관리용줄.test(r.뜻) && (r.지면 == null || !r.지면.includes('/price')));
  const 본줄들 = [];
  const 본것 = new Set();
  for (const r of 쓸줄) {
    const 줄 = `${r.뜻}: ${r.수}`;
    if (본것.has(줄)) continue;
    본것.add(줄);
    본줄들.push(줄);
    if (본줄들.length >= 4) break;
  }
  const 지면경로 = 지면.replace(ORIGIN, '');
  return [
    ...본줄들.map((s) => `· ${s}`),
    '',
    `자세히 보기 → 100yearmap.com${지면경로}`,
    '',
    '⚠️ ',
    '#백년지도 #100세인생 #한국통계 #인생그래프',
  ].join('\n');
}

/* ── 자가시험 ─────────────────────────────────────────── */
if (process.argv.includes('--selftest')) {
  const 본다 = (말, 참) => { console.log(참 ? '✅' : '🔴', 말); if (!참) process.exitCode = 1; };
  const 갈래 = 덱파일갈래(['a-1.png', 'a-2.png', 'b-1.png', '무관.txt']);
  본다('① 덱을 슬러그로 가른다', 갈래.size === 2 && 갈래.get('a').length === 2);
  본다('② 확장자 안 맞는 파일은 안 셈', !갈래.has('무관'));
  본다('③ /price 만 있으면 지면 없음(null)', 지면고르기([{ 지면: 'https://100yearmap.com/price' }]) === null);
  본다('④ 무료 지면을 우선', 지면고르기([{ 지면: 'https://100yearmap.com/price' }, { 지면: 'https://100yearmap.com/oneperson' }]) === 'https://100yearmap.com/oneperson');
  본다('⑤ 근거 없으면 null', 지면고르기([]) === null);
  const 캡션 = 캡션짓기([{ 뜻: '숫자 하나', 수: 1 }, { 뜻: '숫자 둘', 수: 2 }], 'https://100yearmap.com/oneperson');
  본다('⑥ 캡션에 뜻·수가 들어간다', 캡션.includes('숫자 하나: 1') && 캡션.includes('숫자 둘: 2'));
  본다('⑦ 캡션에 지면 주소가 들어간다', 캡션.includes('100yearmap.com/oneperson'));
  본다('⑧ 캡션에 통계 경고문이 들어간다', 캡션.includes('당신이 아닙니다'));
  본다('⑨ 뜻 줄 중복을 없앤다', 캡션짓기([{ 뜻: '같다', 수: 1 }, { 뜻: '같다', 수: 1 }], 'https://x/y').split('· 같다').length - 1 === 1);
  본다('⑩ 관리용 줄(공시연도 등)은 뺀다', !캡션짓기([{ 뜻: '공시연도', 수: 2024 }, { 뜻: '진짜 값', 수: 5 }], 'https://x/y').includes('공시연도'));
  본다('⑪ /price 로만 가는 줄은 뺀다', !캡션짓기([{ 뜻: '값', 수: 9900, 지면: 'https://100yearmap.com/price' }], 'https://x/y').includes('값: 9900'));
  process.exit();
}

const 내가직접불렸나 = !!process.argv[1] && path.basename(process.argv[1]) === 'build-100y-upload-kit.mjs';
if (내가직접불렸나) {
  const 파일들 = fs.readdirSync(카드뉴스방);
  const 덱별 = 덱파일갈래(파일들.filter((f) => f.endsWith('.png')));

  const 게시물들 = [];
  for (const [슬러그, 이미지들] of 덱별) {
    const 근거길 = path.join(카드뉴스방, `${슬러그}.근거.json`);
    if (!fs.existsSync(근거길)) continue;
    let 근거;
    try { 근거 = JSON.parse(fs.readFileSync(근거길, 'utf8')); } catch { continue; }
    const 줄들 = Array.isArray(근거) ? 근거 : (근거.자료 ?? 근거.근거 ?? []);
    if (!Array.isArray(줄들) || !줄들.length) continue;
    const 지면 = 지면고르기(줄들);
    if (!지면) continue;
    게시물들.push({
      슬러그,
      이미지: 이미지들.sort().map((f) => `public/100y/cardnews/${f}`),
      지면,
      캡션: 캡션짓기(줄들, 지면),
    });
  }

  /* ⛔ 순서를 손으로 안 정한다 — 이미지 장수(더 완성된 카드일수록 앞) 내림차순, 같으면 슬러그순 */
  게시물들.sort((a, b) => b.이미지.length - a.이미지.length || a.슬러그.localeCompare(b.슬러그));
  게시물들.forEach((p, i) => { p.순서 = i + 1; });

  const 낸다 = {
    site: '100yearmap',
    채널메모: '인스타그램 계정 생성은 사장님 손입니다(2번이 1차 채널로 정함, 2026-08-24 15:56). 이 킷은 계정이 열리는 날 바로 쓸 수 있게 미리 지어 둔 것입니다.',
    규칙: [
      '캡션 문구는 전부 각 덱의 .근거.json 「뜻」 줄 그대로입니다 — 지어내지 않았습니다.',
      '/price(파는 지면)로만 가는 덱은 뺐습니다.',
      '순서는 이미지 장수(카드가 완성된 정도) 내림차순입니다 — 등수를 매긴 것이 아닙니다.',
    ],
    만든날: 오늘(),
    총게시물: 게시물들.length,
    게시물: 게시물들,
  };
  const 낼곳 = path.join(뿌리, 'archive/100yearmap-upload-kit.json');
  fs.mkdirSync(path.dirname(낼곳), { recursive: true });
  fs.writeFileSync(낼곳, JSON.stringify(낸다, null, 1), 'utf8');
  console.log(`✅ ${path.relative(뿌리, 낼곳)} — 게시물 ${게시물들.length}개`);
}
