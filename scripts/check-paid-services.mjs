#!/usr/bin/env node
/**
 * **카드로 나가는 서비스가 아직 살아 있나** — 밖에서 잴 수 있는 것만 잰다.
 *
 * ── 🔴 왜 만드나 (2026-08-27 · 사장님 지시) ─────────────────────────────
 * 오늘 네 사이트가 세 시간 반 죽었다. 까닭은 **법인명이 바뀌며 카드가 바뀌어
 * 클라우드타입 정기결제가 실패**한 것이었다. 사장님 말씀 —
 *   「다른 결제해야 하는 서비스 카드 갱신해야 하겠다」
 *   「네가 알아보고 보고하기로 한건데, 걱정하는 것만 화면에서 확인가능할찌뿐」
 *
 * ⭐ 그래서 이 자는 **「밖에서 잴 수 있는 것」과 「화면에 들어가야 아는 것」을 갈라 낸다.**
 *   못 재는 것을 「괜찮다」로 적지 않는 것이 이 자의 전부다.
 *
 * ⛔ 열쇠 값을 절대 찍지 않는다. **있나 없나**와 **응답하나**만 본다.
 * ⛔ 돈이 드는 호출은 하지 않는다(AI 리포트 생성 따위). 무료로 되는 확인만 한다.
 *
 * 쓰는 법:
 *   node scripts/check-paid-services.mjs
 *   node scripts/check-paid-services.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* ── 재는 규칙 (순수 함수 — 자가시험이 여기를 잰다) ───────────── */

/** 남은 날. 만료일이 없으면 null — **** */
export function 남은날(만료, 오늘) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(만료 ?? ''))) return null;
  const a = Date.parse(`${만료}T00:00:00Z`);
  const b = Date.parse(`${오늘}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.round((a - b) / 86400000);
}

/**
 * 한 줄의 표시. 세 가지뿐이다 —
 *   살았다 · 죽었다 · **못잼**  ⛔ 못잼을 살았다로 세지 않는다.
 */
export function 표시(r) {
  if (r.잼 === false) return '⚠ 못잼';
  return r.살았나 ? '✅ 살았다' : '🔴 죽었다';
}

/** 만료가 가까운가. 60일 안이면 알린다. ⚠ 못 재면 알리지도 않는다(거짓 안심 금지). */
export function 곧만료(남은) {
  return typeof 남은 === 'number' && 남은 <= 60;
}

/* ── 실제로 재기 ───────────────────────────────────────────── */

const 도메인들 = [
  { 이름: 'kculturewire.com', rdap: 'https://rdap.verisign.com/com/v1/domain/kculturewire.com' },
  { 이름: 'seoulmarkets.com', rdap: 'https://rdap.verisign.com/com/v1/domain/seoulmarkets.com' },
  { 이름: '100yearmap.com', rdap: 'https://rdap.verisign.com/com/v1/domain/100yearmap.com' },
  { 이름: 'klifemap.ai', rdap: 'https://rdap.identitydigital.services/rdap/domain/klifemap.ai' },
];

const 사이트들 = [
  'https://klifemap.ai/', 'https://www.kculturewire.com/',
  'https://seoulmarkets.com/', 'https://100yearmap.com/',
];

async function 도메인재기(오늘) {
  const 낼것 = [];
  for (const d of 도메인들) {
    try {
      const r = await fetch(d.rdap, { headers: { accept: 'application/rdap+json' }, signal: AbortSignal.timeout(20000) });
      if (!r.ok) { 낼것.push({ 이름: d.이름, 잼: false, 까닭: `RDAP ${r.status}` }); continue; }
      const j = await r.json();
      const e = (j.events ?? []).find((x) => /expiration/i.test(x.eventAction));
      const 등록사 = (j.entities ?? []).find((x) => (x.roles ?? []).includes('registrar'));
      const fn = 등록사?.vcardArray?.[1]?.find((x) => x[0] === 'fn');
      낼것.push({
        이름: d.이름, 잼: true, 살았나: true,
        만료: e ? e.eventDate.slice(0, 10) : null,
        남은: 남은날(e ? e.eventDate.slice(0, 10) : null, 오늘),
        등록사: fn ? fn[3] : null,
      });
    } catch (err) {
      낼것.push({ 이름: d.이름, 잼: false, 까닭: err.message.slice(0, 40) });
    }
  }
  return 낼것;
}

async function 사이트재기() {
  const 낼것 = [];
  for (const u of 사이트들) {
    try {
      const r = await fetch(u, { redirect: 'manual', signal: AbortSignal.timeout(15000) });
      낼것.push({ 이름: u.replace(/^https:\/\//, '').replace(/\/$/, ''), 잼: true, 살았나: r.status < 400, 코드: r.status });
    } catch (e) {
      낼것.push({ 이름: u, 잼: false, 까닭: e.message.slice(0, 40) });
    }
  }
  return 낼것;
}

async function R2재기() {
  /* ⛔ 열쇠 값을 안 찍는다. `storeStatus()` 는 «있나 없나»만 준다(그렇게 짜여 있다). */
  try {
    const { storeStatus, list } = await import(`${new URL('../src/lib/store.mjs', import.meta.url).href}`);
    /* 🔴 [2026-08-27] 처음에 `st.remote` 를 봤다 — **그런 칸이 없다.** 참이름은
       `remote_enabled` 다. 그래서 R2 가 멀쩡한데 「죽었다」가 나왔다.
       ⛔ 오늘 하루 「칸 이름을 짐작하지 않는다」를 여러 번 적어 놓고 내가 그걸 어겼다.
         자료를 «열어 보고» 쓴다. 극단값이 나오면 자를 먼저 의심한다. */
    const st = storeStatus();
    if (!st || st.remote_enabled !== true) {
      return { 잼: true, 살았나: false, 까닭: `열쇠가 없다(원격 저장이 꺼져 있다) — ${st?.warning ?? ''}` };
    }
    const 것 = await list('', { timeout: 20000, max: 1 });
    return { 잼: true, 살았나: Array.isArray(것), 잰것: Array.isArray(것) ? `목록 응답 ${것.length}건` : '응답 모양이 다르다' };
  } catch (e) {
    return { 잼: true, 살았나: false, 까닭: e.message.slice(0, 60) };
  }
}

async function klifemap재기() {
  try {
    const r = await fetch('https://klifemap.ai/api/health', { signal: AbortSignal.timeout(15000) });
    const j = await r.json();
    return { 잼: true, 살았나: j.ok === true, 곁: j.checks?.optional ?? null };
  } catch (e) {
    return { 잼: false, 까닭: e.message.slice(0, 40) };
  }
}

async function 화면() {
  const 오늘 = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  console.log(`# 카드로 나가는 서비스 — 밖에서 잰 것 (${오늘})\n`);

  console.log('## 사이트 넷');
  for (const r of await 사이트재기()) console.log(`  ${표시(r).padEnd(9)} ${r.이름}${r.코드 ? ` (${r.코드})` : ''}${r.까닭 ? ` — ${r.까닭}` : ''}`);

  console.log('\n## 도메인 (등록대행사에 카드가 걸려 있다)');
  for (const r of await 도메인재기(오늘)) {
    if (!r.잼) { console.log(`  ⚠ 못잼    ${r.이름} — ${r.까닭}`); continue; }
    const 경고 = 곧만료(r.남은) ? '  🔴 곧 만료' : '';
    console.log(`  ✅ 살았다  ${r.이름.padEnd(20)} 만료 ${r.만료 ?? '못 읽음'} (${r.남은 ?? '?'}일 남음) · ${r.등록사 ?? '등록사 못 읽음'}${경고}`);
  }

  console.log('\n## 클라우드플레어 R2 — 자료 보관 (종량 과금)');
  const r2 = await R2재기();
  console.log(`  ${표시(r2).padEnd(9)} ${r2.잰것 ?? r2.까닭 ?? ''}`);

  console.log('\n## klifemap 서버 곁가지');
  const km = await klifemap재기();
  if (!km.잼) console.log(`  ⚠ 못잼    ${km.까닭}`);
  else {
    console.log(`  ${표시(km).padEnd(9)} /api/health`);
    if (km.곁) for (const [k, v] of Object.entries(km.곁)) {
      if (typeof v === 'string') console.log(`     ${k.padEnd(14)} ${v}`);
    }
    console.log('     ⚠ 「configured」는 **열쇠가 있다**는 뜻이지 «결제가 살아 있다»는 뜻이 아니다.');
  }

  console.log('\n## ⛔ 밖에서 못 재는 것 — 화면에 들어가야 안다');
  console.log(`
  네이버 클라우드(메일 발송)   console.ncloud.com → 마이페이지 → 결제수단
     🔴 여기가 막히면 사장님께 가는 알림 메일도 같이 죽는다
  Anthropic API (AI 리포트)   console.anthropic.com → Billing
  Spaceship (도메인 넷)        spaceship.com → Billing  (자동갱신이 켜져 있나)
  클라우드타입                 app.cloudtype.io → 설정 → 요금제  (오늘 한 번 끊겼던 곳)
  구글 (애드센스·GA·서치콘솔)   무료다. 카드가 걸려 있지 않다
  깃허브                       무료 요금제로 보인다. 화면에서 한 번 확인하면 좋다`);
  console.log('\n⛔ 「못 쟀다」를 「괜찮다」로 적지 않는다. 위 여섯은 재지 못했다.');
}

/* ── 자가시험 ─────────────────────────────────────────────── */
function 자가시험() {
  let 통과 = 0; let 실패 = 0;
  const 검 = (이름, 조건) => { if (조건) { 통과++; console.log(`  ✅ ${이름}`); } else { 실패++; console.log(`  ⛔ ${이름}`); } };

  검('남은 날을 센다', 남은날('2026-09-01', '2026-08-27') === 5);
  검('지난 날은 음수다', 남은날('2026-08-20', '2026-08-27') === -7);
  검('🔴 만료일이 없으면 null 이다 — 0 으로 안 채운다', 남은날(null, '2026-08-27') === null);
  검('모양이 다르면 null', 남은날('2026/09/01', '2026-08-27') === null);

  검('⚠ 못 잰 것은 «못잼» 이다', 표시({ 잼: false }) === '⚠ 못잼');
  검('🔴 못잼을 «살았다»로 세지 않는다', 표시({ 잼: false, 살았나: true }) === '⚠ 못잼');
  검('살았으면 살았다', 표시({ 잼: true, 살았나: true }) === '✅ 살았다');
  검('죽었으면 죽었다', 표시({ 잼: true, 살았나: false }) === '🔴 죽었다');

  검('60일 안이면 알린다', 곧만료(30) === true);
  검('60일 밖이면 안 알린다', 곧만료(400) === false);
  검('⛔ 못 재면 알리지도 않는다 — 거짓 안심을 만들지 않는다', 곧만료(null) === false);

  console.log(`\n자가시험 ${통과 + 실패}개 · 실패 ${실패}개`);
  return 실패;
}

const 이파일직접 = process.argv[1]
  && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (이파일직접) {
  if (process.argv.includes('--자가시험')) process.exit(자가시험() ? 1 : 0);
  else await 화면();
}
