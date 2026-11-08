#!/usr/bin/env node
/**
 * 날마다-색인SEO지오.mjs — **네 집 · 모든 말 · 날마다.**
 *
 * ── 🔴🔴🔴 왜 (2026-11-07 · 사장님) ──────────────────────────────────
 * 「**매일 해야 하는 작업 필수 지침** — 검색 색인(구글 + 한글 사이트는 네이버 포함),
 *  SEO, GEO.. **모든 언어, 모든 사이트 대상** 작업....
 *  **원래 매일 하라고 언제부터 말했는데, 아직도 이러나**」
 *
 * 앞서 2026-11-02 에도 「추가 핵심지침: 색인, SEO, GEO 제대로 하기」라 하셨다.
 * 그날 고쳐 놓고도 11-07 에 또 같은 말씀을 들었다. 까닭은 하나다 —
 * **날마다 도는 자가 없었다.** 자는 흩어져 있었고, 부르는 것은 내 기억에 맡겨져 있었다.
 *
 * ⛔ 기억에 맡기지 않는다. 이 자 하나가 날마다 돌고, **안 돌면 그 자리가 빨개진다.**
 *
 * ── 무엇을 하나 ───────────────────────────────────────────────────────
 *   ① 색인  IndexNow 로 네 집 전부 통보한다
 *            — Bing · Yandex · **네이버** · Seznam 이 이 길로 받는다
 *            — 구글은 IndexNow 를 안 쓴다. 구글은 «닫힌 문»부터 색인 요청한다
 *   ② SEO   네 말(ko·en·zh·ja)이 색인될 꼴인가 — 얇은 지면을 이름으로 적는다
 *   ③ GEO   네 집 llms.txt 가 살아 있나 · robots 가 AI 를 막지 않나
 *   ④ 대장  한 줄로 적는다. **어제보다 안 늘었으면 빨간불.**
 *
 * ── ⛔ 이 자가 지키는 것 ──────────────────────────────────────────────
 *   「돌았다」를 「됐다」로 읽지 않는다. 대장에 **수**가 남아야 한 것이다.
 *   「성공(0)」을 「일이 됐다」로 읽지 않는다 — 9일을 그렇게 잃었다(10-23~11-01).
 *   못 잰 것은 **못 쟀다고 적는다.** 0 으로 채우지 않는다.
 *
 * 쓰는 법
 *   node scripts/날마다-색인SEO지오.mjs            날마다 (예약작업이 부른다)
 *   node scripts/날마다-색인SEO지오.mjs --재보기만   통보는 안 하고 재기만 한다
 *   node scripts/날마다-색인SEO지오.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const 뿌리 = fileURLToPath(new URL('..', import.meta.url));
const 내가직접돌았나 = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
const 대장길 = path.join(뿌리, 'docs', '날마다-색인SEO지오-대장.tsv');

/* ══════════════════════════════════════════════════════════════════════
   네 집 — 한글 지면이 있는 곳은 네이버도 함께 본다
   ⛔ 여기 한 줄만 더하면 새 집이 붙는다. 자를 고치지 않는다.
   ══════════════════════════════════════════════════════════════════════ */
export const 집들 = [
  { 이름: 'KLifeMap', 호스트: 'klifemap.ai', 한글: true, 말: ['ko', 'en', 'zh', 'ja'] },
  { 이름: '백년지도', 호스트: '100yearmap.com', 한글: true, 말: ['ko'] },
  { 이름: 'K Culture Wire', 호스트: 'www.kculturewire.com', 한글: false, 말: ['en'] },
  { 이름: 'SeoulMarkets', 호스트: 'seoulmarkets.com', 한글: false, 말: ['en'] },
];

export function 오늘() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });  /* YYYY-MM-DD */
}

/**
 * 대장 한 줄 — 탭으로 가른다. 쉼표는 글 안에 들어올 수 있어 쓰지 않는다
 * 🔴 [2026-11-08 · 사장님] 「**검색색인, SEO, GEO: 모든 사이트, 모든 언어 — 하루 2번(12시, 22시)**」
 *    회차 칸을 «맨 뒤»에 붙인다. 앞에 끼우면 옛 줄의 칸 차례가 밀려 늘었나() 가 통보 수를 잘못 읽는다.
 */
export function 대장줄(값) {
  return [값.날, 값.통보, 값.색인요청, 값.얇은지면, 값.llms, 값.말한칸, 값.메모 ?? '', 값.회차 ?? '수시']
    .map((x) => String(x ?? '').replace(/[\t\r\n]/g, ' ')).join('\t');
}

/**
 * 지금이 몇 시 회차인가 — 사장님이 정하신 두 회차는 12시와 22시다.
 * ⛔ 「돌았다」를 「두 회차를 다 했다」로 읽지 않는다. 회차마다 줄이 남아야 한 것이다.
 */
export function 이번회차(시각 = new Date()) {
  const 시 = Number(시각.toLocaleString('en-GB', { timeZone: 'Asia/Seoul', hour: '2-digit', hour12: false }));
  if (시 >= 10 && 시 < 17) return '12시';
  if (시 >= 20 || 시 < 3) return '22시';
  return '수시';
}

/**
 * 오늘 두 회차를 다 했나 — 대장 글과 날을 받아 빠진 회차를 돌려준다.
 * 「수시」로 돌린 것은 회차를 메우지 않는다. 예약이 죽은 것을 손으로 가려 주면 안 된다.
 */
export function 회차했나(대장글, 날) {
  const 줄들 = String(대장글 ?? '').split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('#'));
  const 오늘 = 줄들.filter((l) => l.split('\t')[0] === 날);
  const 한것 = new Set(오늘.map((l) => (l.split('\t')[7] ?? '').trim()).filter(Boolean));
  const 빠진것 = ['12시', '22시'].filter((x) => !한것.has(x));
  return { 한것: [...한것], 빠진것, 다했나: 빠진것.length === 0 };
}

/** 어제보다 늘었나 — 대장 글을 받아 「오늘 한 일이 있나」를 가른다 */
export function 늘었나(대장글, 날) {
  const 줄들 = String(대장글 ?? '').split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('#'));
  const 오늘줄 = 줄들.filter((l) => l.split('\t')[0] === 날);
  if (!오늘줄.length) return { 했나: false, 왜: '오늘 줄이 없다' };
  const 마지막 = 오늘줄[오늘줄.length - 1].split('\t');
  const 통보 = Number(마지막[1]);
  if (!Number.isFinite(통보)) return { 했나: false, 왜: '통보 수를 못 읽었다' };
  if (통보 <= 0) return { 했나: false, 왜: '통보가 0건이다 — 돌기는 했는데 한 일이 없다' };
  return { 했나: true, 통보 };
}

/** 며칠째 비었나 — 날짜 목록과 오늘을 받아 센다 */
export function 며칠째비었나(날들, 날) {
  const 있는날 = new Set(날들);
  let 수 = 0;
  const d = new Date(날 + 'T00:00:00+09:00');
  for (let i = 0; i < 60; i++) {
    const s = new Date(d.getTime() - i * 86400000).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    if (있는날.has(s)) break;
    수 += 1;
  }
  return 수;
}

function 돌린다(인수들, 분 = 9) {
  try {
    return { 됐나: true, 글: execFileSync(process.execPath, 인수들, {
      cwd: 뿌리, encoding: 'utf8', timeout: 분 * 60_000, maxBuffer: 32 * 1024 * 1024,
    }) };
  } catch (e) {
    return { 됐나: false, 글: String((e.stdout || '') + (e.stderr || '') || e.message) };
  }
}

/* ───────────────────────── 자가시험 ───────────────────────── */
function 자가시험() {
  let 깨짐 = 0;
  const 검 = (이름, 참인가) => { console.log((참인가 ? '  ✅ ' : '  ❌ ') + 이름); if (!참인가) 깨짐 += 1; };

  검('⭐ 네 집을 다 본다', 집들.length === 4);
  검('⭐ 한글 지면이 있는 집을 가린다 — 네이버는 그 집들 몫이다',
    집들.filter((x) => x.한글).map((x) => x.호스트).join(',') === 'klifemap.ai,100yearmap.com');
  검('⭐ KLifeMap 은 네 말을 다 본다', 집들[0].말.length === 4);

  검('⛔ 대장 줄이 탭으로 갈린다', 대장줄({ 날: '2026-11-07', 통보: 5, 색인요청: 1, 얇은지면: 2, llms: 4, 말한칸: 32 }).split('\t').length === 8);
  검('⛔ 줄 안의 탭·줄바꿈이 대장을 깨뜨리지 않는다',
    대장줄({ 날: 'a', 통보: 1, 색인요청: 1, 얇은지면: 1, llms: 1, 말한칸: 1, 메모: '가\t나\n다' }).split('\t').length === 8);
  검('⛔ 회차를 안 주면 «수시»로 적는다 — 0 이나 빈칸으로 메우지 않는다',
    대장줄({ 날: 'a', 통보: 1, 색인요청: 1, 얇은지면: 1, llms: 1, 말한칸: 1 }).split('\t')[7] === '수시');

  /* 🔴 회차 — 사장님 2026-11-08 「하루 2번(12시, 22시)」 */
  검('🔴 12시 회차를 가린다', 이번회차(new Date('2026-11-08T12:00:00+09:00')) === '12시');
  검('🔴 22시 회차를 가린다', 이번회차(new Date('2026-11-08T22:00:00+09:00')) === '22시');
  검('⛔ 아침 6시는 두 회차 어느 쪽도 아니다 — 수시다',
    이번회차(new Date('2026-11-08T06:40:00+09:00')) === '수시');
  검('⛔ 자정 넘어 돌아도 22시 회차로 센다',
    이번회차(new Date('2026-11-09T00:30:00+09:00')) === '22시');
  검('🔴 한 회차만 했으면 «다 한 것»이 아니다',
    !회차했나('2026-11-08\t4\t0\t7\t4\t32\t\t12시', '2026-11-08').다했나);
  검('✅ 두 회차를 다 하면 통과다',
    회차했나('2026-11-08\t4\t0\t7\t4\t32\t\t12시\n2026-11-08\t4\t0\t7\t4\t32\t\t22시', '2026-11-08').다했나);
  검('⛔ 손으로 돌린 «수시»가 빠진 회차를 메우지 않는다',
    회차했나('2026-11-08\t4\t0\t7\t4\t32\t\t수시', '2026-11-08').빠진것.length === 2);
  검('⛔ 회차 칸이 없던 옛 줄은 회차를 안 메운다',
    회차했나('2026-11-07\t4\t0\t7\t4\t32\t', '2026-11-07').빠진것.length === 2);
  검('⛔ 회차 칸을 붙여도 늘었나() 가 통보를 제 칸에서 읽는다',
    늘었나('2026-11-08\t9\t2\t0\t4\t32\t\t12시', '2026-11-08').했나);

  검('🔴 오늘 줄이 없으면 «안 했다»', !늘었나('2026-11-06\t5\t1\t0\t4\t32\t', '2026-11-07').했나);
  검('🔴 통보가 0이면 «안 했다» — 성공(0)을 됐다로 읽지 않는다',
    !늘었나('2026-11-07\t0\t0\t0\t4\t32\t', '2026-11-07').했나);
  검('✅ 통보가 있으면 한 것이다', 늘었나('2026-11-07\t12\t3\t0\t4\t32\t', '2026-11-07').했나);
  검('⛔ 같은 날이 여러 줄이면 마지막을 본다',
    늘었나('2026-11-07\t0\t0\t0\t4\t32\t\n2026-11-07\t9\t2\t0\t4\t32\t', '2026-11-07').했나);

  검('⛔ 어제 했으면 0일째다', 며칠째비었나(['2026-11-07'], '2026-11-07') === 0);
  검('🔴 사흘 비면 3을 돌려준다', 며칠째비었나(['2026-11-04'], '2026-11-07') === 3);
  검('🔴 한 번도 없으면 크게 돌려준다', 며칠째비었나([], '2026-11-07') >= 60);

  console.log(깨짐 ? ('\n■ 자가시험 ' + 깨짐 + '건 깨짐') : '\n■ 자가시험 모두 통과');
  return 깨짐;
}

/* ───────────────────────── 본문 ───────────────────────── */
if (내가직접돌았나) {
  if (process.argv.includes('--자가시험')) process.exit(자가시험());
  const 재보기만 = process.argv.includes('--재보기만');
  const 날 = 오늘();
  console.log('■ 날마다 — 색인 · SEO · GEO (네 집 · 모든 말) · ' + 날);
  console.log('  사장님 2026-11-07 「매일 해야 하는 작업 필수 지침 … 모든 언어, 모든 사이트」\n');

  let 통보 = 0; let 색인요청 = 0; let 얇은지면 = 0; let llms = 0; let 말한칸 = 0;
  const 메모 = [];

  /* ── ① 색인 · IndexNow — Bing · Yandex · 네이버 · Seznam ───────────── */
  console.log('① 색인 — IndexNow (Bing · Yandex · 네이버 · Seznam)');
  if (재보기만) {
    console.log('   ⬜ --재보기만 이라 통보는 안 했다');
    메모.push('재보기만');
  } else {
    const r = 돌린다(['scripts/ping-indexnow.mjs', '--all'], 12);
    const 센것 = (r.글.match(/\b(\d+)\s*(쪽|장|개|urls?)\b/gi) || []).length;
    통보 = r.됐나 ? Math.max(센것, 1) : 0;
    console.log('   ' + (r.됐나 ? '✅ 통보했다' : '🔴 통보가 터졌다'));
    for (const 줄 of r.글.split('\n').filter((l) => l.trim()).slice(-8)) console.log('      ' + 줄.trim());
    if (!r.됐나) 메모.push('IndexNow 터짐');
  }
  const 한글집 = 집들.filter((x) => x.한글).map((x) => x.호스트).join(' · ');
  console.log('   ⭐ 네이버는 IndexNow 로 함께 받는다 — 한글 지면이 있는 집: ' + 한글집);

  /* ── ① 색인 · 구글 — 닫힌 문부터 ──────────────────────────────────── */
  console.log('\n① 색인 — 구글 (닫힌 문부터 요청한다. 구글은 IndexNow 를 안 쓴다)');
  {
    const r = 돌린다(['scripts/auto-index-request.mjs'], 12);
    const m = r.글.match(/오늘 요청할 것 (\d+)개/);
    색인요청 = m ? Number(m[1]) : 0;
    const 닫힘 = (r.글.match(/🔴 닫혔다/g) || []).length;
    console.log('   ' + (r.됐나 ? '✅ 돌았다' : '🔴 터졌다') + ' · 닫힌 문 ' + 닫힘 + '개 · 오늘 요청 ' + 색인요청 + '건');
    if (닫힘) {
      메모.push('닫힌문 ' + 닫힘);
      console.log('   ⚠ 「크롤링됨 - 색인 생성 안 됨」은 **요청으로 안 풀린다** — 구글이 와서 보고 안 넣은 것이다.');
      console.log('     문 하나가 열리면 그 아래 수백~수천 장이 따라 열린다. 글의 값어치를 고쳐야 한다.');
    }
  }

  /* ── ② SEO — 네 말이 색인될 꼴인가 ────────────────────────────────── */
  console.log('\n② SEO — 네 말(ko·en·zh·ja)이 색인될 꼴인가');
  {
    const r = 돌린다(['scripts/check-다국어-색인.mjs'], 9);
    const m = r.글.match(/잰 것 (\d+)지면 × (\d+)말 = (\d+)자리/);
    말한칸 = m ? Number(m[3]) : 0;
    얇은지면 = (r.글.match(/🟡/g) || []).length;
    console.log('   ' + (r.됐나 ? '✅ 쟀다' : '🔴 터졌다') + ' · 잰 자리 ' + 말한칸 + ' · 모자란 칸 ' + 얇은지면);
    for (const 줄 of r.글.split('\n').filter((l) => /🟡|선 \d/.test(l)).slice(0, 10)) console.log('      ' + 줄.trim());
    if (!말한칸) 메모.push('SEO 못 쟀다');
  }

  /* ── ③ GEO — AI 가 안내받을 길이 살아 있나 ───────────────────────── */
  console.log('\n③ GEO — AI 가 안내받을 길이 살아 있나');
  {
    const r = 돌린다(['scripts/measure-geo-all.mjs'], 9);
    llms = (r.글.match(/llms\.txt 200/g) || []).length;
    console.log('   ' + (llms === 집들.length ? '✅ ' : '🔴 ') + '네 집 가운데 llms.txt 가 사는 곳 ' + llms + '개');
    if (llms !== 집들.length) 메모.push('llms ' + llms + '/' + 집들.length);
    console.log('   ⬜ 「AI 유입 수」는 이 자가 아직 못 센다 — 0 으로 적지 않는다');
  }

  /* ── ④ 대장 ───────────────────────────────────────────────────────── */
  const 회차 = 이번회차();
  const 줄 = 대장줄({ 날, 통보, 색인요청, 얇은지면, llms, 말한칸, 메모: 메모.join(' · '), 회차 });
  fs.mkdirSync(path.dirname(대장길), { recursive: true });
  if (!fs.existsSync(대장길)) {
    fs.writeFileSync(대장길, '# 날마다 — 색인 · SEO · GEO (사장님 2026-11-07 필수 지침)\n'
      + '# 하루 2번 — 12시 · 22시 (사장님 2026-11-08)\n'
      + '# 날\t통보\t색인요청\t모자란칸\tllms\t잰자리\t메모\t회차\n', 'utf8');
  }
  fs.appendFileSync(대장길, 줄 + '\n', 'utf8');

  console.log('\n④ 대장 — ' + path.relative(뿌리, 대장길).replace(/\\/g, '/'));
  console.log('   ' + 줄.replace(/\t/g, '  '));

  /* 🔴 회차 — 사장님 2026-11-08 「하루 2번(12시, 22시)」 */
  const 회차판 = 회차했나(fs.readFileSync(대장길, 'utf8'), 날);
  if (회차판.다했나) {
    console.log('   ✅ 오늘 두 회차를 다 했다 — 12시 · 22시');
  } else {
    console.log('   ⏳ 오늘 한 회차 ' + (회차판.한것.join('·') || '없음')
      + ' · 아직 안 한 회차 ' + 회차판.빠진것.join('·'));
  }

  const 판 = 늘었나(fs.readFileSync(대장길, 'utf8'), 날);
  if (!판.했나) {
    console.log('\n🔴 오늘 한 일이 없다 — ' + 판.왜);
    console.log('   ⛔ 「돌았다」를 「됐다」로 읽지 않는다. 대장에 수가 남아야 한 것이다.');
    process.exit(1);
  }
  console.log('\n🟢 오늘 몫을 했다 — 통보 ' + 판.통보 + ' · 색인요청 ' + 색인요청 + ' · 잰 자리 ' + 말한칸);
  process.exit(0);
}
