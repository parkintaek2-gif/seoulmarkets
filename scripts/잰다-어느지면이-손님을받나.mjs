#!/usr/bin/env node
/**
 * 잰다-어느지면이-손님을받나.mjs — 손님이 «어느 지면으로» 들어오나
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔴 사장님 지시 (2026-11-15) — 「우리 사이트 방문자수 안 늘리나? … 방문자수 증대 올인」
 *
 * [왜 이 도구가 필요했나]
 *   2026-11-15 에 네 사이트 유입원을 재서 알아낸 것 —
 *     백년지도   네이버 2,543명 · 구글    2명
 *     케이라이프맵 네이버   214명 · 구글    6명
 *     에스마켓츠  구글     1명 · ChatGPT  69명
 *     K컬처와이어 구글     1명 · ChatGPT 153명
 *   네 사이트 28일 구글 검색 클릭을 다 더해도 13건이다.
 *   ⇒ 백년지도만 «네이버에서» 손님을 받고 있다. 그 방식을 나머지에 옮기려면
 *     «어느 지면이» 받는지부터 알아야 한다. 사이트 전체로는 옮길 것이 안 보인다.
 *
 * ⛔ Direct 는 우리 점검 트래픽이 섞인다 — 손님 수로 읽지 않는다 (2026-09-22 사장님 지적).
 *
 * 쓰는 법
 *   node scripts/잰다-어느지면이-손님을받나.mjs --호스트 100yearmap.com
 *   node scripts/잰다-어느지면이-손님을받나.mjs --호스트 klifemap.ai --일수 28 --몇장 30
 *   node scripts/잰다-어느지면이-손님을받나.mjs --넷다
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 속성 = '549135289';

function 열쇠읽기() {
  for (const 이름 of ['gsc-sa.json', 'ga4-sa.json', 'search-console-sa.json']) {
    const p = path.join(뿌리, 'secrets', 이름);
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
  }
  const env = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (env && fs.existsSync(env)) return JSON.parse(fs.readFileSync(env, 'utf8'));
  throw new Error('서비스 계정 열쇠를 못 찾았다 (secrets/gsc-sa.json)');
}

/** ⚠ indexOf 가 -1 일 때 argv[0](노드 경로)을 집는 잘못을 막는다 */
export function 인자(이름, 기본, argv = process.argv) {
  const i = argv.indexOf(이름);
  if (i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--')) return argv[i + 1];
  const 붙은것 = argv.find((a) => a.startsWith(이름 + '='));
  return 붙은것 ? 붙은것.slice(이름.length + 1) : 기본;
}

/** 우리 점검 트래픽이 섞이는 칸인가 */
export function 우리칸인가(채널) {
  return 채널 === 'Direct' || 채널 === 'Unassigned' || !채널;
}

if (process.argv.includes('--자가시험')) {
  const 본 = [
    [() => 인자('--호스트', 'klifemap.ai', ['node', 's.mjs']), 'klifemap.ai'],
    [() => 인자('--호스트', 'klifemap.ai', ['node', 's.mjs', '--호스트', '100yearmap.com']), '100yearmap.com'],
    [() => 인자('--호스트', 'klifemap.ai', ['node', 's.mjs', '--호스트=100yearmap.com']), '100yearmap.com'],
    [() => 인자('--호스트', 'klifemap.ai', ['node', 's.mjs', '--호스트', '--일수']), 'klifemap.ai'],
    [() => 우리칸인가('Direct'), true],
    [() => 우리칸인가('Organic Search'), false],
    [() => 우리칸인가(''), true],
  ];
  let 통과 = 0;
  본.forEach(([f, 나와야], i) => {
    const 나옴 = f();
    if (나옴 === 나와야) 통과 += 1;
    else console.log('  X ' + (i + 1) + '번 -> [' + 나옴 + '] (와야 할 것 [' + 나와야 + '])');
  });
  console.log('자가시험 ' + 통과 + '/' + 본.length);
  process.exit(통과 === 본.length ? 0 : 1);
}

async function 물어보다(토큰, 몸) {
  const r = await fetch('https://analyticsdata.googleapis.com/v1beta/properties/' + 속성 + ':runReport', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + 토큰, 'Content-Type': 'application/json' },
    body: JSON.stringify(몸),
  });
  if (!r.ok) throw new Error('GA4 ' + r.status + ' ' + (await r.text()).slice(0, 200));
  return r.json();
}

const 일수 = Number(인자('--일수', '28'));
const 몇장 = Number(인자('--몇장', '25'));
const 호스트들 = process.argv.includes('--넷다')
  ? ['100yearmap.com', 'klifemap.ai', 'www.kculturewire.com', 'seoulmarkets.com']
  : [인자('--호스트', 'klifemap.ai')];

/* ⚠ ga4-report.mjs 는 불러오는 것만으로 제 자가시험을 돌린다 — 내 자가시험이 끝난 뒤에 부른다 */
const { 토큰받기 } = await import('./ga4-report.mjs');
const 토큰 = await 토큰받기(열쇠읽기(), 'https://www.googleapis.com/auth/analytics.readonly');

for (const 호스트 of 호스트들) {
  const 걸러 = { filter: { fieldName: 'hostName', stringFilter: { matchType: 'EXACT', value: 호스트 } } };
  console.log('\n■ ' + 호스트 + ' — 어느 지면이 손님을 받나 · 최근 ' + 일수 + '일');

  const 답 = await 물어보다(토큰, {
    dateRanges: [{ startDate: 일수 + 'daysAgo', endDate: 'yesterday' }],
    dimensions: [{ name: 'landingPagePlusQueryString' }, { name: 'sessionDefaultChannelGroup' }],
    metrics: [{ name: 'totalUsers' }, { name: 'sessions' }, { name: 'averageSessionDuration' }],
    dimensionFilter: 걸러,
    orderBys: [{ metric: { metricName: 'totalUsers' }, desc: true }],
    limit: 400,
  });

  const 줄들 = (답.rows || []).map((r) => ({
    지면: r.dimensionValues[0].value,
    채널: r.dimensionValues[1].value,
    사람: Number(r.metricValues[0].value),
    세션: Number(r.metricValues[1].value),
    머문초: Number(r.metricValues[2].value),
  }));

  const 바깥 = 줄들.filter((r) => !우리칸인가(r.채널));
  const 지면별 = {};
  for (const r of 바깥) {
    const o = (지면별[r.지면] ||= { 사람: 0, 세션: 0, 머문합: 0, 채널: new Set() });
    o.사람 += r.사람; o.세션 += r.세션; o.머문합 += r.머문초 * r.세션; o.채널.add(r.채널);
  }
  const 차례 = Object.entries(지면별).sort((a, b) => b[1].사람 - a[1].사람);
  const 바깥합 = 바깥.reduce((s, r) => s + r.사람, 0);
  const 우리합 = 줄들.filter((r) => 우리칸인가(r.채널)).reduce((s, r) => s + r.사람, 0);

  console.log('   바깥에서 온 사람 ' + 바깥합.toLocaleString() + '명 · 우리 트래픽이 섞이는 칸 ' + 우리합.toLocaleString() + '명');
  console.log('   손님을 받는 지면 ' + 차례.length + '장\n');
  console.log('      사람   세션  머문시간  지면');
  for (const [지면, o] of 차례.slice(0, 몇장)) {
    const 머문 = o.세션 ? Math.round(o.머문합 / o.세션) : 0;
    console.log(
      '   ' + String(o.사람).padStart(7) +
      String(o.세션).padStart(7) +
      (머문 + '초').padStart(9) + '  ' + 지면.slice(0, 68)
    );
  }
  const 쏠림 = 차례.length ? Math.round((차례.slice(0, 5).reduce((s, [, o]) => s + o.사람, 0) / Math.max(바깥합, 1)) * 100) : 0;
  console.log('\n   앞 5장이 바깥 손님의 ' + 쏠림 + '% 를 받는다');
}
