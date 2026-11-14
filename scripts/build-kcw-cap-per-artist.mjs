#!/usr/bin/env node
/**
 * build-kcw-cap-per-artist.mjs — **시가총액을 «사람 수»로 나눈다.** (5번, 2026-09-04)
 *
 * ── 왜 이 자가 생겼나 ────────────────────────────────────────
 * 6번이 「5번↔6번 교차링크」를 물어 왔다. 푸터 링크는 손님이 달라 안 걸었고, 대신 겹치는
 * 주제(기획사)를 찾아 두 쪽이 «같은 자료»를 쓰게 했다. 그리고 오늘 저녁에 이렇게 갈라졌다 —
 *
 *   6번  KRX 시세로 시가총액을 쟀다 (archive/raw/kpop-agencies/market-cap-20260903.json)
 *   5번  위키데이터·위키백과로 소속 아티스트와 읽힌 수를 쟀다 (src/data/kcw-label-reach.json)
 *
 * ⭐ 두 쪽을 이으면 아무도 안 센 것이 나온다 — **아티스트 한 명당 시가총액**.
 *   사장님 정의 그대로다: **「그들은 재무를, 우리는 사람을 한다」**
 *
 * ── ⛔ 이 자가 지키는 것 — 여기가 전부다 ────────────────────
 * ⛔ **이것을 「고평가·저평가」로 부르지 않는다.** 우리는 투자자문을 하지 않는다.
 *   「한 명당 얼마」는 나눗셈이지 판단이 아니다. 지면에도 그렇게 적는다.
 * ⛔ **사람 수가 바닥값임을 잊지 않는다.** 위키데이터에 음반사가 적힌 사람만 셌다 —
 *   9,249명 가운데 1,044명(11.3%)뿐이다. 나눗셈의 «분모»가 바닥값이면 몫은 «천장값»이다.
 *   ⇒ 그러니 회사끼리 견주는 것이 위험하다. 회사마다 그 바닥이 다르게 얕다.
 * ⛔ **못 이은 회사를 0 으로 채우지 않는다.** 이름이 안 맞으면 「못 이었다」로 센다.
 * ⛔ 티커가 죽어 있으면 그것을 적는다 — 6번이 CJ E&M(130960)을 KRX 시세 목록에서 못 찾았고
 *   DART 공시도 0건이라 «실질 비활동»으로 결론냈다. 그 회사를 표에 살아 있는 것처럼 두지 않는다.
 *
 * 쓰는 법  node scripts/build-kcw-cap-per-artist.mjs --자가시험
 *          node scripts/build-kcw-cap-per-artist.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
/* 🔴 [2026-11-14] 영문 지면에 「오후」가 나갔다 — 잰 시각은 한 꼴로 적는다 */
import { 잰때문자 } from './lib/잰때.mjs';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 읽힘길 = path.join(뿌리, 'src/data/kcw-label-reach.json');
const 시총방 = path.join(뿌리, 'archive/raw/kpop-agencies');
const 낼길 = path.join(뿌리, 'src/data/kcw-cap-per-artist.json');

/* ── 판단하는 함수들. 여기만 자가시험한다 ────────────────────── */

/**
 * 회사 이름을 맞춘다.
 * ⚠ 6번은 「HYBE」, 위키데이터는 「Hybe」로 적는다. 대소문자·「Entertainment」 꼬리·점을 벗긴다.
 * ⛔ 그래도 안 맞으면 «맞춘 척하지 않는다» — 못 이었다고 센다.
 */
export function 이름고르기(이름) {
  return String(이름 ?? '')
    .toLowerCase()
    .replace(/\b(entertainment|ent\.?|corp\.?|co\.?|inc\.?|group|media|music)\b/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/** 티커로 먼저, 없으면 이름으로 맞춘다. ⛔ 티커가 있으면 티커가 이긴다 — 이름은 흔들린다 */
export function 짝찾기(회사, 시총들) {
  const 목 = Array.isArray(시총들) ? 시총들 : [];
  if (회사?.티커) {
    const t = 목.find((x) => String(x.티커) === String(회사.티커));
    if (t) return { 짝: t, 무엇으로: '티커' };
  }
  const 키 = 이름고르기(회사?.회사);
  if (!키) return { 짝: null, 무엇으로: null };
  const n = 목.find((x) => 이름고르기(x.이름) === 키);
  if (n) return { 짝: n, 무엇으로: '이름' };
  return { 짝: null, 무엇으로: null };
}

/**
 * 한 명당 시가총액.
 * ⛔ 사람 수가 0 이면 나누지 않는다 — Infinity 를 수라고 적으면 지면이 거짓이 된다.
 */
export function 한명당(시가총액, 사람수) {
  const c = Number(시가총액); const n = Number(사람수);
  if (!Number.isFinite(c) || !Number.isFinite(n) || n <= 0 || c <= 0) return null;
  return Math.round(c / n);
}

/** 억원으로. ⚠ 원 단위를 지면에 그대로 내면 아무도 못 읽는다 */
export function 억원(원) {
  const v = Number(원);
  if (!Number.isFinite(v)) return null;
  return Math.round((v / 1e8) * 10) / 10;
}

/* ── 자가시험 ─────────────────────────────────────────────── */
if (process.argv.includes('--자가시험')) {
  let 통 = 0; let 실 = 0;
  const 참 = (이름, 값) => { if (값) 통 += 1; else { 실 += 1; console.log(`   🔴 ${이름}`); } };

  참('⭐ HYBE 와 Hybe 가 같은 것으로 맞는다', 이름고르기('HYBE') === 이름고르기('Hybe'));
  참('Entertainment 꼬리를 벗긴다',
    이름고르기('SM Entertainment') === 이름고르기('SM'));
  참('점과 빈칸을 벗긴다', 이름고르기('J.Y.P. Entertainment') === 이름고르기('JYP'));
  참('⛔ 다른 회사는 안 맞는다', 이름고르기('SM') !== 이름고르기('YG'));
  참('⛔ 빈 값에도 안 죽는다', 이름고르기(null) === '');

  const 시총 = [{ 이름: 'HYBE', 티커: '352820', 시가총액: 7586803136000 },
    { 이름: 'SM Entertainment', 티커: '041510', 시가총액: 1720000000000 }];
  참('⭐ 티커로 맞춘다', 짝찾기({ 회사: 'Hybe', 티커: '352820' }, 시총).무엇으로 === '티커');
  참('티커가 틀리면 이름으로 물러선다',
    짝찾기({ 회사: 'SM Entertainment', 티커: '999999' }, 시총).무엇으로 === '이름');
  참('이름만으로도 맞춘다', 짝찾기({ 회사: 'HYBE' }, 시총).짝.티커 === '352820');
  참('⛔ 없으면 «못 이었다» — 아무 것이나 붙이지 않는다',
    짝찾기({ 회사: 'Kakao Entertainment' }, 시총).짝 === null);
  참('⛔ 빈 값에도 안 죽는다', 짝찾기(null, null).짝 === null);

  참('한 명당을 낸다', 한명당(1000, 4) === 250);
  참('⛔ 사람이 0 이면 안 나눈다', 한명당(1000, 0) === null);
  참('⛔ 사람 수가 수가 아니면 안 나눈다', 한명당(1000, 'x') === null);
  참('⛔ 시가총액이 없으면 안 나눈다', 한명당(null, 10) === null);
  참('⛔ Infinity 를 수라고 적지 않는다', Number.isFinite(한명당(1000, 0)) === false);

  참('억원으로 바꾼다', 억원(7586803136000) === 75868);
  참('소수 한 자리까지', 억원(88100000000) === 881);
  참('⛔ 수가 아니면 못 쟀다', 억원('x') === null);

  console.log(`\n한 명당 시가총액을 재는 자 — 자가시험 ${통} 통과 · ${실} 실패`);
  process.exit(실 ? 1 : 0);
}

/* ── 실제로 낸다 ──────────────────────────────────────────── */
if (!process.argv.includes('--자가시험')) {
  if (!fs.existsSync(읽힘길)) { console.log('🔴 읽힘 자료가 없다 — 먼저 build-kcw-label-reach.mjs'); process.exit(1); }
  /* ⚠ 6번이 낸 파일 가운데 «가장 최근» 것을 쓴다. 이름을 박지 않는다 — 날마다 새로 온다 */
  const 시총파일 = fs.existsSync(시총방)
    ? fs.readdirSync(시총방).filter((f) => /^market-cap-\d+\.json$/.test(f)).sort().pop() : null;
  if (!시총파일) { console.log('🔴 6번의 시가총액 파일이 없다 — archive/raw/kpop-agencies/market-cap-*.json'); process.exit(1); }

  const 읽힘 = JSON.parse(fs.readFileSync(읽힘길, 'utf8'));
  const 시총원본 = JSON.parse(fs.readFileSync(path.join(시총방, 시총파일), 'utf8'));
  const 시총들 = 시총원본.회사 ?? [];
  /* 6번이 「비활동」으로 결론낸 회사를 적어 둔다 — 표에 살아 있는 것처럼 두지 않는다 */
  const 비활동메모 = Object.entries(시총원본).filter(([k]) => /^CJ|비활동/i.test(k)).map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`);

  const 이은것 = []; const 못이은것 = [];
  for (const c of 읽힘.회사들 ?? []) {
    const { 짝, 무엇으로 } = 짝찾기(c, 시총들);
    if (!짝) { 못이은것.push({ 회사: c.회사, 티커: c.티커 ?? null, 아는사람: c.아는사람 }); continue; }
    이은것.push({
      회사: c.회사,
      티커: 짝.티커,
      종가: 짝.종가 ?? null,
      시가총액억: 억원(짝.시가총액),
      아는사람: c.아는사람,
      이어진사람: c.이어진사람,
      커버리지: c.커버리지,
      중간하루: c.중간하루,
      /* ⭐ 이 지면의 알맹이 — 다만 «분모가 바닥값»임을 이름에 담는다 */
      아는사람한명당억: 억원(한명당(짝.시가총액, c.아는사람)),
      맞춘법: 무엇으로,
    });
  }
  /* ⛔ 한 명당 값 순으로 세우지 않는다 — 순위표가 되고 「고평가」로 읽힌다. 시가총액 순이다 */
  이은것.sort((a, b) => (b.시가총액억 ?? 0) - (a.시가총액억 ?? 0));

  fs.writeFileSync(낼길, JSON.stringify({
    /* ⛔ toISOString 은 UTC 다 — 우리 시각은 KST 다 */
    잰때: 잰때문자(),
    무엇인가: 'Market value divided by the number of artists we can count for each listed K-pop company. '
      + 'The market figures are measured by our markets desk from KRX prices; the artist counts are ours.',
    '⛔아닌것': [
      '투자 판단이 아니다. 「한 명당 얼마」는 나눗셈이지 고평가·저평가라는 뜻이 아니다.',
      '분모가 바닥값이다 — 위키데이터에 음반사가 적힌 사람만 세었다. 그러므로 몫은 천장값이다.',
      '회사마다 그 바닥이 다르게 얕다. 그래서 회사끼리 견주는 데 쓸 수 없다.',
      '아티스트 수는 계약상 소속이 아니라 «음반을 낸 곳»으로 이은 것이다.',
    ],
    시총출처: { 파일: 시총파일, 기준일: 시총원본.기준일 ?? null, 출처: 시총원본.출처 ?? null, 잰이: '6번 SeoulMarkets' },
    읽힘출처: { 잰때: 읽힘.잰때 ?? null, 사람바닥: 읽힘.셈?.음반사있는사람 ?? null, 명단전체: 읽힘.셈?.명단전체 ?? null },
    비활동메모,
    셈: { 이은회사: 이은것.length, 못이은회사: 못이은것.length },
    회사들: 이은것,
    못이은회사들: 못이은것,
  }, null, 1));

  console.log(`시가총액 파일 — ${시총파일} (기준일 ${시총원본.기준일 ?? '⬜'}) · 6번이 잰 것`);
  console.log(`이은 회사 ${이은것.length}곳 · 못 이은 회사 ${못이은것.length}곳\n`);
  console.log('회사               시가총액(억)   아는사람   한 명당(억)   맞춘법');
  for (const x of 이은것) {
    console.log(`  ${String(x.회사).padEnd(20).slice(0, 20)} ${String(x.시가총액억).padStart(9)} `
      + `${String(x.아는사람).padStart(8)} ${String(x.아는사람한명당억).padStart(11)}   ${x.맞춘법}`);
  }
  if (못이은것.length) {
    console.log(`\n⬜ 못 이은 회사 ${못이은것.length}곳 — 0 으로 채우지 않고 센다`);
    for (const x of 못이은것) console.log(`   ${x.회사}${x.티커 ? ` [${x.티커}]` : ''} · 아는사람 ${x.아는사람}`);
  }
  if (비활동메모.length) {
    console.log('\n⚠ 6번이 적어 둔 것 —');
    for (const m of 비활동메모) console.log(`   ${m}`);
  }
  console.log(`\n냈다 — ${path.relative(뿌리, 낼길)}`);
  console.log('⛔ 지면에 실을 때 「고평가·저평가」로 쓰지 마십시오. 우리는 투자자문을 하지 않습니다.');
  console.log('⛔ 그리고 «분모가 바닥값»임을 같은 자리에 적으십시오 — 안 적으면 회사끼리 견주게 됩니다.');
}
