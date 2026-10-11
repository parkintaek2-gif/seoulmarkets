#!/usr/bin/env node
/**
 * **유입 집계(traffic)를 운영(R2)에서 곳간으로 내려받는다.**
 *
 * ── 🔴 왜 (2026-10-11 13:0x · 5번) ──────────────────────────────────
 * `check-archive-freshness` 가 두 시간째 같은 것을 묻고 있었다 —
 * ```
 *   ⬜ 이 표 «밖»에서 날마다 쌓던 갈래 1개가 멎었다 — 주인이 있나 본다
 *      · archive/raw/traffic — 마지막 2026-09-29 (12일 · 최근 30일에 6장)
 * ```
 * ⭐ **영영 묻는 검사는 무시하게 되는 검사다.** 그래서 끝을 낸다.
 *
 * 재 보니 —
 * ```
 *   R2 에 지난 40일이 «다» 있다        ⇒ 자료를 잃은 것은 아니다
 *   곳간에는 9일치뿐이고 32일치가 없다  ⇒ 사본이 제 구실을 못 하고 있었다
 * ```
 * 사장님 (2026-08-24): 「**방문자, 체류시간 증대에 올인해라**」
 * ⇒ 유입은 우리가 가장 자주 봐야 하는 자료다. 그 사본이 열이틀 낡아 있으면
 *   그 사이에 무엇이 먹혔는지 **네트워크 없이는 못 본다.**
 *
 * ── ⛔ 이 자가 지키는 것 ────────────────────────────────────────────
 * ⛔ **덮어쓰지 않는다.** 이미 있는 날은 건너뛴다 — 곳간은 «그때 받은 것»을 쥐는 자리다.
 *   ⚠ 오늘치만은 예외다. 하루가 안 끝나 계속 자라므로 `--오늘도` 로 다시 받을 수 있다.
 * ⛔ **R2 자격이 없으면 「못 받았다」고 적고 끝낸다.** 「없다」고 말하지 않는다.
 * ⛔ **보기만 한다.** 정말 적으려면 `--적는다` 를 붙인다.
 * ⚠ 손님 개인정보는 애초에 안 들어 있다 — 키가 「호스트⏎경로⏎유입도메인⏎봇⏎봇종류」뿐이고
 *   IP·쿠키·사람 식별값은 모으지 않는다(파일의 `설명` 칸에 그 말이 박혀 있다).
 *   ⛔ 그래도 **받은 뒤 한 번 더 본다** — 뜻밖의 칸이 생기면 그때 멈춘다.
 *
 *   node scripts/유입-곳간에-내려받는다.mjs              보기만 한다
 *   node scripts/유입-곳간에-내려받는다.mjs --적는다      정말 받는다
 *   node scripts/유입-곳간에-내려받는다.mjs --날수=60     더 거슬러 본다(기본 40)
 *   node scripts/유입-곳간에-내려받는다.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 곳간 = path.join(뿌리, 'archive/raw/traffic');

/** 하루 밀리초 */
const 하루 = 86400000;

/**
 * 받을 날을 고른다.
 * ⚠ 파일 이름의 날짜는 **서버 시계(UTC)** 로 정해진다 — 여기서도 UTC 로 만든다.
 *   ⛔ 한국시간으로 만들면 하루가 어긋나 매일 한 장씩 비게 된다.
 */
export function 날들만들기(이제, 날수) {
  const p = (n) => String(n).padStart(2, '0');
  const 모음 = [];
  for (let i = 0; i < 날수; i += 1) {
    const d = new Date(이제.getTime() - i * 하루);
    모음.push(`${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}`);
  }
  return 모음;
}

/**
 * 받을 것만 고른다 — 이미 있는 날은 건너뛴다.
 * @param 오늘도 오늘치는 하루가 안 끝나 계속 자라므로 다시 받을 수 있게 한다
 */
export function 받을것고르기(날들, 있는것, { 오늘 = null, 오늘도 = false } = {}) {
  const 쥔것 = 있는것 instanceof Set ? 있는것 : new Set(있는것);
  return 날들.filter((날) => {
    if (!쥔것.has(날)) return true;
    return 오늘도 && 날 === 오늘;
  });
}

/**
 * 받은 것이 우리가 아는 꼴인가 — 뜻밖의 칸이 생기면 그때 멈춘다.
 * ⛔ 「개인정보가 없다」를 글로만 갖지 않는다. 받을 때마다 잰다.
 */
export const 아는칸 = ['날짜', '갱신', '갱신시계', '갱신KST', '하루의범위', '설명', '집계'];
export function 낯선칸찾기(j) {
  if (!j || typeof j !== 'object') return ['(객체가 아니다)'];
  return Object.keys(j).filter((k) => !아는칸.includes(k));
}

function 자가시험() {
  let 탈 = 0;
  const 검 = (이름, 참, 덧 = '') => { if (!참) { 탈 += 1; console.log(`🔴 ${이름} ${덧}`); } };

  /* 🔴 날짜는 UTC 로 만든다 — KST 로 만들면 하루가 어긋나 날마다 한 장씩 빈다 */
  const 낮 = new Date(Date.UTC(2026, 9, 11, 4, 2));   /* KST 로는 10-11 13:02 */
  검('🔴 UTC 로 날을 만든다', 날들만들기(낮, 1)[0] === '20261011');
  const 밤 = new Date(Date.UTC(2026, 9, 11, 20, 30)); /* KST 로는 10-12 05:30 — «다음 날»이다 */
  검('🔴🔴 한국이 다음 날이어도 서버 시계를 따른다 — 파일 이름이 그 시계로 지어진다',
    날들만들기(밤, 1)[0] === '20261011', `— ${날들만들기(밤, 1)[0]}`);
  검('날수만큼 거슬러 간다', 날들만들기(낮, 3).join(' ') === '20261011 20261010 20261009');
  검('달을 넘어도 센다', 날들만들기(new Date(Date.UTC(2026, 9, 1)), 2).join(' ') === '20261001 20260930');

  /* ⛔ 덮어쓰지 않는다 */
  const 날들 = ['20261011', '20261010', '20261009'];
  검('⛔ 이미 있는 날은 건너뛴다',
    받을것고르기(날들, ['20261010']).join(' ') === '20261011 20261009');
  검('⛔ 다 있으면 받을 것이 없다', 받을것고르기(날들, 날들).length === 0);
  검('🔴 --오늘도 면 오늘치만 다시 받는다 — 하루가 안 끝나 계속 자란다',
    받을것고르기(날들, 날들, { 오늘: '20261011', 오늘도: true }).join(' ') === '20261011');
  검('⛔ --오늘도 가 «어제»까지 다시 받게 하지 않는다',
    받을것고르기(날들, 날들, { 오늘: '20261011', 오늘도: true }).length === 1);

  /* ⛔ 낯선 칸이 생기면 멈춘다 */
  검('✅ 아는 꼴은 낯선 칸이 없다',
    낯선칸찾기({ 날짜: 'x', 갱신: 'x', 갱신시계: 'x', 갱신KST: 'x', 하루의범위: 'x', 설명: 'x', 집계: {} }).length === 0);
  검('🔴 뜻밖의 칸을 잡는다 — 개인정보가 섞여 들어오면 여기서 걸린다',
    낯선칸찾기({ 날짜: 'x', 집계: {}, 손님이메일: ['a@b.c'] }).join('') === '손님이메일');
  검('⛔ 칸이 모자란 것은 낯선 칸이 아니다 — 그것은 다른 흠이다',
    낯선칸찾기({ 날짜: 'x' }).length === 0);
  검('⛔ 객체가 아니면 그렇다고 말한다', 낯선칸찾기(null).length === 1);

  console.log(탈 ? `\n🔴 자가시험 ${탈}건 탈` : '\n✅ 자가시험 13개 통과');
  if (탈) process.exit(1);
}

async function 본실행() {
  /* .env 를 읽어 R2 자격을 올린다 */
  try {
    for (const 줄 of fs.readFileSync(path.join(뿌리, '.env'), 'utf8').split(/\r?\n/)) {
      const m = 줄.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  } catch { /* 없으면 그만 */ }

  const { get, remoteEnabled } = await import(new URL('../src/lib/store.mjs', import.meta.url).href);
  if (!remoteEnabled) {
    console.log('⬜ 못 받았다 — R2 자격이 이 창에 없다.');
    console.log('   ⚠ 「곳간이 비었다」가 아니라 「못 받았다」다. 자격이 있는 창에서 다시 돌린다.');
    return;
  }

  const 적는다 = process.argv.includes('--적는다');
  const 오늘도 = process.argv.includes('--오늘도');
  const 날수 = Number(process.argv.find((a) => a.startsWith('--날수='))?.split('=')[1] ?? 40);

  fs.mkdirSync(곳간, { recursive: true });
  const 있는것 = new Set(fs.readdirSync(곳간).filter((f) => /^\d{8}\.json$/.test(f)).map((f) => f.slice(0, 8)));
  const 날들 = 날들만들기(new Date(), 날수);
  const 받을것 = 받을것고르기(날들, 있는것, { 오늘: 날들[0], 오늘도 });

  console.log(`■ 지난 ${날수}일 · 곳간에 있는 날 ${있는것.size} · 받아 볼 날 ${받을것.length}`);
  if (!받을것.length) {
    console.log('✅ 받을 것이 없다 — 곳간이 R2 를 따라잡고 있다');
    return;
  }

  let 받음 = 0; let 없음 = 0; let 바이트 = 0; const 낯선 = [];
  for (const 날 of 받을것) {
    let raw;
    try { raw = await get(`raw/traffic/${날}.json`); } catch (e) {
      console.log(`   ⬜ ${날} — 못 받았다: ${e.message}`);
      없음 += 1;
      continue;
    }
    if (!raw) { 없음 += 1; continue; }
    const 글 = Buffer.isBuffer(raw) ? raw.toString('utf8') : String(raw);
    let j;
    try { j = JSON.parse(글); } catch (e) {
      console.log(`   ⬜ ${날} — 읽을 수 없는 글이다: ${e.message}`);
      없음 += 1;
      continue;
    }
    /* ⛔ 「개인정보가 없다」를 글로만 갖지 않는다 — 받을 때마다 잰다 */
    const 낯선칸 = 낯선칸찾기(j);
    if (낯선칸.length) { 낯선.push(`${날}: ${낯선칸.join(', ')}`); continue; }

    받음 += 1;
    바이트 += Buffer.byteLength(글, 'utf8');
    if (적는다) fs.writeFileSync(path.join(곳간, `${날}.json`), 글);
  }

  if (낯선.length) {
    console.log(`\n🔴 뜻밖의 칸이 든 날 ${낯선.length} — **적지 않았다**`);
    낯선.forEach((s) => console.log(`   ⛔ ${s}`));
    console.log('   ⚠ 유입 집계에 새 칸이 생겼다. 손님 개인정보가 아닌지 먼저 보고,');
    console.log('     옳은 칸이면 이 자의 `아는칸` 에 더한다. ⛔ 보지 않고 더하지 않는다.');
  }
  console.log(`\n${적는다 ? '✅ 적었다' : '⬜ 보기만 했다'} — 받은 날 ${받음} · 못 받은 날 ${없음} · ${Math.round(바이트 / 1024)}KB`);
  if (!적는다) console.log('   정말 받으려면 --적는다 를 붙인다');
  if (낯선.length) process.exit(1);
}

if (process.argv.includes('--자가시험')) 자가시험();
else await 본실행();
