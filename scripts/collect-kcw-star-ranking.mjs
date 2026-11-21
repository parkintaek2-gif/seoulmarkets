#!/usr/bin/env node
/**
 * 스타뉴스 「스타랭킹」(모바일 앱 STARPOLL/스타폴의 투표 결과) — WikiTip(K컬처) 축.
 *
 *   node scripts/collect-kcw-star-ranking.mjs
 *   node scripts/collect-kcw-star-ranking.mjs --자가시험
 *
 * ── 사장님 지시(2026-09-16) ────────────────────────────────────
 *   「스타폴도 체크해. 일주일에 한번정도」
 *
 * ── 무엇인가 ───────────────────────────────────────────────────
 * `starnewskorea.com/star-ranking` 은 STARNEWS 가 운영하는 지면이고, 모바일 앱
 * STARPOLL(스타폴 — AAA 시상식 공식 투표 앱)의 팬 투표 결과를 그대로 보여준다.
 * 카테고리 10개: 왕중왕(king-of-king) · 배우 남/여(male-actor/female-actor) ·
 * 아이돌 남/여(male-idol/female-idol) · 트롯 남/여(male-trot/female-trot) ·
 * 스포츠 남/여(male-sports/female-sports) · AAA 스타킹(aaa-starking).
 * 각 카테고리마다 1~2위는 「대결(VS)」 카드로, 3~5위는 목록으로 서버가 그려서 낸다
 * (그 아래 순위는 로그인 뒤 버튼을 눌러야 API 로 더 받아온다 — 아래 참고).
 *
 * ── ⚠ 라이선스 — robots.txt 를 정확히 읽는다 ─────────────────────
 * `curl -s https://www.starnewskorea.com/robots.txt` — `User-Agent: *` 그룹에
 * **`Allow: /star-ranking/`** 이 명시돼 있다. 금지된 것은 `/star-ranking/image/`
 * (사진)와 `/api/`(그 아래 더보기 API) 뿐이다. 그래서 이 수집기는 **지면 HTML만**
 * 받는다 — API 를 따로 부르지 않는다. 실측(2026-09-16) — plain curl(자바스크립트
 * 실행 없이)로도 이름·득표수가 그대로 있다. 서버가 그려서 내는 값이라 `/api/` 를
 * 어길 필요가 없다.
 *
 * ── ⚠ 이 수는 «우리가 잰 값»이 아니다 ─────────────────────────────
 * `collect-star-pageviews.mjs`(위키백과 조회수)는 우리가 직접 재서 «우리 것»이 된
 * 값이다. 이 수집기가 받는 득표수는 **남의 투표 캠페인 결과**다(팬덤이 표를 모아
 * 미는 성격 — 유료 광고 시청으로도 표를 얻는다). 그러니:
 *   ✅ 사실(이름 + 순위 + 득표수)만 archiving 한다 — 표현은 바꾸지 않고 원본 그대로.
 *   ⛔ 기사에 쓸 때는 반드시 "이것은 팬 투표수이지 우리가 잰 관심도가 아니다"라는
 *     주의문을 단다(사장님 강령 — ""와 같은 자리).
 *   ⛔ 「인기 순위」라고 부르지 않는다. **「투표 결과」**라고 부른다.
 *
 * ── ⚠ 카테고리 대응이 «순서»가 아니라 «위치»로 이뤄진다 ──────────
 * 카테고리 이름을 유추하지 않는다 — 각 카테고리 슬러그(`/star-ranking/<slug>/<id>`)의
 * 첫 등장 위치부터 다음 카테고리의 첫 등장 위치 «사이»만 잘라서 그 구간에서 이름·득표수를
 * 뽑는다. 문서 순서가 바뀌어도 슬러그로 구간을 나누므로 이름이 엉뚱한 카테고리에 안 붙는다.
 *
 * ── 무엇이 안 잡히나 ───────────────────────────────────────────
 * 6위 이하는 로그인 뒤 「더보기」로 API 를 불러야 나온다(robots.txt 가 그 API 를 막는다).
 * 그래서 이 수집기는 **카테고리마다 1~5위만** 남긴다.  — 못 잡은
 * 카테고리는 빈 배열로 남기고 로그에 찍는다.
 */
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { 오늘 } from './_kst.mjs';

export const 주소 = 'https://www.starnewskorea.com/star-ranking';
export const UA = 'SeoulMarketsBot/0.1 (https://kculturewire.com/about)';
export const OUT = path.resolve('archive/raw/kcw-star-ranking');

/** 문서 순서가 아니라 화면에 실제로 보이는 한글 이름이 정본이다 */
export const 카테고리들 = [
  { 슬러그: 'king-of-king', 이름: '스타왕중왕' },
  { 슬러그: 'male-actor', 이름: '스타배우(남)' },
  { 슬러그: 'female-actor', 이름: '스타배우(여)' },
  { 슬러그: 'male-idol', 이름: '스타아이돌(남)' },
  { 슬러그: 'female-idol', 이름: '스타아이돌(여)' },
  { 슬러그: 'male-trot', 이름: '스타트롯(남)' },
  { 슬러그: 'female-trot', 이름: '스타트롯(여)' },
  { 슬러그: 'male-sports', 이름: '스타스포츠(남)' },
  { 슬러그: 'female-sports', 이름: '스타스포츠(여)' },
  { 슬러그: 'aaa-starking', 이름: 'AAA 2026 스타킹' },
];

/** 「1,234」 → 1234. 쉼표 없는 것도 받는다. 빈 값은 0 이 아니라 null */
export function 수(v) {
  const s = String(v ?? '').replace(/,/g, '').trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * 한 카테고리 구간(slice)에서 1~2위(대결 카드)와 3~5위(목록)를 뽑는다.
 * ⚠ 두 패턴이 다르다 — 대결 카드는 `font-extrabold` 이름 뒤에 바로 득표수,
 *   목록은 순위 숫자 뒤에 이름·득표수가 온다. 하나로 합쳐 짜면 반이 빈다.
 */
export function 구간파싱(slice) {
  const 대결 = [...slice.matchAll(
    /text-16\/24 font-extrabold">([^<]+)<\/span><div class="text-starnews-red text-16\/24">([0-9,]+)<!-- -->★/g,
  )].map(([, 이름, 표]) => ({ 이름, 득표: 수(표) }));
  const 목록 = [...slice.matchAll(
    /text-14\/20 font-extrabold min-w-6">(\d+)<!-- -->위<\/div><\/div><div class="text-14\/20 font-bold grow ml-2">([^<]+)<\/div><div class="text-starnews-red text-14\/20 font-bold ml-2">([0-9,]+)<!-- -->★/g,
  )].map(([, 순위, 이름, 표]) => ({ 순위: Number(순위), 이름, 득표: 수(표) }));

  const 결과 = [];
  대결.forEach((x, i) =>결과.push({ 순위: i + 1, 이름: x.이름, 득표: x.득표 }));
  목록.forEach((x) => 결과.push(x));
  return 결과.sort((a, b) => a.순위 - b.순위);
}

/**
 * 전체 HTML에서 카테고리마다 구간을 잘라 파싱한다.
 * ⛔ 카테고리 이름을 «순서»로 정하지 않는다 — 슬러그의 첫 등장 위치로 구간을 나눈다.
 */
export function 전체파싱(html) {
  const 앵커 = 카테고리들
    .map((c) => ({ ...c, 위치: html.indexOf(`/star-ranking/${c.슬러그}/`) }))
    .filter((c) => c.위치 >= 0)
    .sort((a, b) => a.위치 - b.위치);

  const 못찾음 = 카테고리들.filter((c) => !앵커.some((a) => a.슬러그 === c.슬러그)).map((c) => c.이름);

  const 결과 = {};
  앵커.forEach((a, i) => {
    const 끝 = i + 1 < 앵커.length ? 앵커[i + 1].위치 : html.indexOf('</main>', a.위치);
    const slice = html.slice(a.위치, 끝 > 0 ? 끝 : html.length);
    결과[a.슬러그] = { 이름: a.이름, 순위: 구간파싱(slice) };
  });
  return { 카테고리: 결과, 못찾음 };
}

// ── 자가시험 ──────────────────────────────────────────────────
function 자가시험() {
  const 봄 = [], 안봄 = [];
  const 자 = (설명, 참) => (참 ? 봄 : 안봄).push(설명);

  자('수() — 쉼표 있는 값', 수('393,663') === 393663);
  자('수() — 쉼표 없는 값', 수('916473') === 916473);
  자('수() — 못 읽는 값은 null', 수('') === null);

  const 표본 = `
    <div class="mt-3"><span class="text-16/24 font-extrabold">임영웅</span><div class="text-starnews-red text-16/24">393,663<!-- -->★</div></div>
    <div class="mt-3"><span class="text-16/24 font-extrabold">박서진</span><div class="text-starnews-red text-16/24">272,332<!-- -->★</div></div>
    <div class="text-14/20 font-extrabold min-w-6">3<!-- -->위</div></div><div class="text-14/20 font-bold grow ml-2">송가인</div><div class="text-starnews-red text-14/20 font-bold ml-2">52,909<!-- -->★</div>
  `;
  const 파싱 = 구간파싱(표본);
  자('구간파싱 — 3건(대결2+목록1)', 파싱.length === 3);
  자('구간파싱 — 1위 이름', 파싱[0]?.이름 === '임영웅' && 파싱[0]?.득표 === 393663);
  자('구간파싱 — 3위 이름(목록쪽)', 파싱[2]?.이름 === '송가인' && 파싱[2]?.순위 === 3);

  const 가짜문서 = `x /star-ranking/male-trot/1 y ${표본} /star-ranking/female-trot/2 z`;
  const 전체 = 전체파싱(가짜문서);
  자('전체파싱 — male-trot 구간에 3건 담김', 전체.카테고리['male-trot']?.순위.length === 3);
  자('전체파싱 — female-trot 은 이 구간 밖(0건)', (전체.카테고리['female-trot']?.순위.length ?? 0) === 0);
  자('전체파싱 — 못찾음에 나머지 8개 카테고리가 남는다', 전체.못찾음.length === 8);

  console.log(`자가시험 ${봄.length}/${봄.length + 안봄.length}`);
  if (안봄.length) { console.log('🔴 틀린 것:'); 안봄.forEach((x) => console.log('   · ' + x)); }
  return 안봄.length === 0;
}

async function main() {
  if (process.argv.includes('--자가시험')) {
    process.exit(자가시험() ? 0 : 1);
  }
  if (!자가시험()) { console.log('🔴 자가시험이 깨졌다 — 멈춘다'); process.exit(1); }

  const r = await fetch(주소, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(30000) });
  if (!r.ok) { console.log(`🔴 HTTP ${r.status}`); process.exit(1); }
  const html = await r.text();

  const { 카테고리, 못찾음 } = 전체파싱(html);
  const 날 = 오늘();

  mkdirSync(OUT, { recursive: true });
  const 산출 = path.join(OUT, `${날}.json`);
  writeFileSync(산출, JSON.stringify({
    출처: 'starnewskorea.com/star-ranking (STARPOLL 앱 투표 결과)',
    받은날: 날,
    주의: '이것은 팬 투표수(캠페인성)다. 우리가 잰 관심도가 아니다. 기사화 시 그 사실을 반드시 명시한다.',
    한계: '카테고리마다 1~5위까지만 서버가 그려서 낸다. 6위 이하는 로그인 API가 필요해(robots.txt 가 /api/ 를 막는다) 못 받는다.',
    못찾음,
    카테고리,
  }, null, 1));

  console.log(`✅ ${Object.keys(카테고리).length}/${카테고리들.length}개 카테고리 · ${날}`);
  if (못찾음.length) console.log(`⚠ 못 찾음: ${못찾음.join(', ')}`);
  Object.values(카테고리).forEach((c) => {
    const 일등 = c.순위[0];
    console.log(`   ${c.이름.padEnd(14)} 1위 ${일등 ? `${일등.이름} ${일등.득표?.toLocaleString()}★` : '못 잡음'} (${c.순위.length}명 잡힘)`);
  });
  console.log(`\n   ${산출}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
