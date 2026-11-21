#!/usr/bin/env node
/**
 * 잰다-직접유입-날마다.mjs — **직접 유입(direct)이 날마다 어떻게 움직이나**를 잰다.
 * ─────────────────────────────────────────────────────────────────────────────
 * 사장님 2026-11-19 — 「**우리 이외에 direct 방문자 변화는 있나?**」
 *
 * 🔴 direct 칸에는 세 가지가 섞여 있다. 섞인 채로 세면 「늘었다」가 거짓이 된다 —
 *   ① 우리 점검 (결제창·로그인·대시보드를 **첫 지면**으로 여는 것)
 *   ② 수집기 (싱가포르에 쏠리고 한 장만 보고 나간다)
 *   ③ 나머지 — 주소를 직접 치거나 즐겨찾기로 온 사람
 *   사장님이 물으신 「우리 이외」는 ③ 이다. 셋을 갈라서 다 보여 준다.
 *
 * ⛔ direct 를 통째로 버리지 않는다 — 케이라이프맵 direct 는 252초 머무는 진짜 사람이다
 * ⛔ 「수집기다」라고 확정하지 않는다. 가른 근거를 함께 적고 판단은 읽는 사람이 한다
 * ⚠ 세션으로 센다. 첫 지면·나라까지 갈라 보려면 사람 수로는 갈 수 없다 — 그 말을 적는다
 *
 * 쓰는 법
 *   node scripts/잰다-직접유입-날마다.mjs
 *   node scripts/잰다-직접유입-날마다.mjs --일 30
 *   node scripts/잰다-직접유입-날마다.mjs --자체검사
 */
import { 유입갈래, 우리점검지면인가 } from './lib/유입-가르기.mjs';

/** 수집기가 쏠리는 나라 — ⛔ 「이 나라 사람은 손님이 아니다」가 아니다.
 *  2026-11-18 실측에서 영어 두 사이트 direct 의 70~83% 가 여기였고 머문 시간이 5~12초였다 */
export const 수집기쏠린나라 = new Set(['Singapore']);

/** YYYYMMDD → YYYY-MM-DD */
export function 날풀기(s) {
  const t = String(s ?? '');
  return /^\d{8}$/.test(t) ? `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)}` : t;
}

/** 직접 유입 한 줄을 세 갈래 중 하나로 민다 */
export function 어느갈래(첫지면, 나라) {
  if (우리점검지면인가(첫지면)) return '우리점검';
  if (수집기쏠린나라.has(String(나라 ?? ''))) return '수집기쪽';
  return '그밖';
}

/**
 * GA4 줄들을 «사이트 → 날 → {우리점검, 수집기쪽, 그밖}» 으로 접는다.
 * 줄은 [날, 호스트, 유입원, 첫지면, 나라] 다섯 칸이다.
 */
export function 접기(줄들, { 우리것인가, 사이트이름 }) {
  const 표 = {};
  const 날들 = new Set();
  for (const r of 줄들 ?? []) {
    const [d, h, 유입원, 첫지면, 나라] = r.값;
    if (!우리것인가(h)) continue;
    if (유입갈래(유입원) !== '직접') continue;
    const 날 = 날풀기(d);
    const s = 사이트이름(h);
    날들.add(날);
    const 칸 = ((표[s] ??= {})[날] ??= { 우리점검: 0, 수집기쪽: 0, 그밖: 0 });
    칸[어느갈래(첫지면, 나라)] += r.수;
  }
  return { 표, 날들: [...날들].sort() };
}

/** 날 목록의 평균 — 날이 없으면 null 이다. ⛔  */
export function 평균(날별, 날들, 칸이름) {
  if (!날들.length) return null;
  const 합 = 날들.reduce((a, d) => a + ((날별?.[d] || {})[칸이름] || 0), 0);
  return 합 / 날들.length;
}

/* ── 자체검사 ─────────────────────────────────────────────────────────── */
function 자체검사() {
  const 잰다 = [];
  const 본다 = (이름, 값) => 잰다.push([이름, !!값]);

  본다('날을 푼다', 날풀기('20261119') === '2026-11-19');
  본다('직접 유입을 가른다', 유입갈래('(direct)') === '직접');
  본다('🔴 우리 결제 점검을 가른다', 어느갈래('/checkout.html', 'South Korea') === '우리점검');
  본다('로그인 화면도 우리 점검이다', 어느갈래('/login', 'South Korea') === '우리점검');
  본다('싱가포르 한 장짜리는 수집기 쪽으로 민다', 어느갈래('/', 'Singapore') === '수집기쪽');
  본다('그 밖은 그밖이다', 어느갈래('/unse/rat.html', 'South Korea') === '그밖');
  /* ⛔ 우리 점검이 싱가포르에서 올 리 없지만, 순서가 바뀌면 수가 달라진다 */
  본다('우리 점검이 수집기보다 먼저 걸린다', 어느갈래('/checkout.html', 'Singapore') === '우리점검');

  const 도구 = { 우리것인가: (h) => !/localhost/.test(h), 사이트이름: (h) => h.replace(/^www\./, '') };
  const 줄들 = [
    { 값: ['20261119', 'klifemap.ai', '(direct)', '/', 'South Korea'], 수: 10 },
    { 값: ['20261119', 'www.klifemap.ai', '(direct)', '/', 'South Korea'], 수: 2 },
    { 값: ['20261119', 'klifemap.ai', '(direct)', '/checkout.html', 'South Korea'], 수: 7 },
    { 값: ['20261119', 'klifemap.ai', '(direct)', '/', 'Singapore'], 수: 30 },
    { 값: ['20261119', 'klifemap.ai', 'm.search.naver.com', '/', 'South Korea'], 수: 99 },
    { 값: ['20261118', 'klifemap.ai', '(not set)', '/', 'South Korea'], 수: 4 },
    { 값: ['20261118', 'localhost', '(direct)', '/', 'South Korea'], 수: 5 },
  ];
  const { 표, 날들 } = 접기(줄들, 도구);
  본다('www 를 한 사이트로 묶는다', 표['klifemap.ai']['2026-11-19'].그밖 === 12);
  본다('⛔ 검색 유입은 안 센다', 표['klifemap.ai']['2026-11-19'].그밖 !== 111);
  본다('우리 점검을 따로 센다', 표['klifemap.ai']['2026-11-19'].우리점검 === 7);
  본다('수집기 쪽을 따로 센다', 표['klifemap.ai']['2026-11-19'].수집기쪽 === 30);
  본다('(not set) 도 직접이다', 표['klifemap.ai']['2026-11-18'].그밖 === 4);
  본다('우리 것이 아닌 호스트는 뺀다', Object.keys(표).length === 1);
  본다('날이 정렬돼 나온다', 날들.join(',') === '2026-11-18,2026-11-19');

  const 날별 = { '2026-11-18': { 그밖: 4 }, '2026-11-19': { 그밖: 12 } };
  본다('평균을 낸다', 평균(날별, ['2026-11-18', '2026-11-19'], '그밖') === 8);
  본다('🔴 날이 없으면 null 이다 — 0 이 아니다', 평균(날별, [], '그밖') === null);

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
  const 기준날 = 인자('--기준날', '2026-11-19');   /* 운세 기사 첫 출고일 */

  const t = await 토큰받기();
  if (t.못잼) { console.log('🔴 GA4 에 못 물었다 — ' + t.못잼); process.exitCode = 1; return; }

  const 줄들 = await 재기(t.토큰, t.속성,
    ['date', 'hostName', 'sessionSource', 'landingPage', 'country'],
    { 시작: `${일수}daysAgo`, 끝: 'today', 지표: 'sessions' });
  if (줄들 === null) { console.log('🔴 GA4 가 줄을 안 줬다 — 못 쟀다'); process.exitCode = 1; return; }

  const { 표, 날들 } = 접기(줄들, { 우리것인가, 사이트이름 });
  console.log(`■ 직접 유입(direct) — 최근 ${일수}일 · 세션 수`);
  console.log('   ⚠ 사람 수가 아니라 세션이다. 첫 지면·나라까지 가르려면 사람 수로는 못 간다');
  console.log('   ⚠ 오늘은 집계가 덜 찬다 · ⭐ 는 운세 기사가 나간 뒤\n');

  const 사이트들 = Object.keys(표).sort();
  for (const s of 사이트들) {
    console.log(`── ${s}`);
    console.log('   날              그밖(우리 이외)   우리 점검   수집기 쪽');
    for (const d of 날들) {
      const 칸 = 표[s][d] || { 우리점검: 0, 수집기쪽: 0, 그밖: 0 };
      const 별 = d >= 기준날 ? ' ⭐' : '   ';
      console.log(`   ${d}${별}` + String(칸.그밖).padStart(12)
        + String(칸.우리점검).padStart(12) + String(칸.수집기쪽).padStart(12));
    }
    const 앞 = 날들.filter((d) => d < 기준날);
    const 뒤 = 날들.filter((d) => d >= 기준날);
    const 글 = (v) => (v === null ? '못 쟀다' : v.toFixed(1));
    console.log(`   하루 평균 «그밖»  앞 ${글(평균(표[s], 앞, '그밖'))} (${앞.length}일)`
      + `   →   뒤 ${글(평균(표[s], 뒤, '그밖'))} (${뒤.length}일)\n`);
  }

  const 뒤날수 = 날들.filter((d) => d >= 기준날).length;
  if (뒤날수 <= 2) console.log(`🔴 기준날 뒤가 ${뒤날수}일뿐이다 — 늘었다·줄었다를 아직 말할 수 없다.`);
}

if (process.argv.includes('--자체검사')) 자체검사();
else await 본일();
