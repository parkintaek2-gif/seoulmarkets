#!/usr/bin/env node
/**
 * 잰다-색인된장수.mjs — **서치콘솔에 노출된 지면이 몇 장인가.**
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠⚠ 이 자가 내는 수는 「색인된 장수」가 **아니다.**
 *   서치콘솔 searchAnalytics 는 «검색 결과에 노출된» 지면만 돌려준다.
 *   색인은 됐는데 아직 한 번도 안 뜬 지면은 여기에 안 나온다.
 *   ⇒ 이 수는 **아래쪽 선**이다. 「적어도 이만큼은 색인됐다」로 읽는다.
 *   ⛔ 「60장 중 12장만 색인됐다」로 적지 않는다. 「12장이 노출됐다」가 잰 것이다.
 *
 * 쓰는 법
 *   node scripts/잰다-색인된장수.mjs --터 klifemap.ai --앞꼬리 /ilju/ --날수 90
 *   node scripts/잰다-색인된장수.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { 토큰받기 } from './fetch-gsc.mjs';

/** 그 지면이 센 자리에 드나 — 앞꼬리 여럿 가운데 하나라도 맞으면 든다 */
export function 드나(주소, 앞꼬리들) {
  const u = String(주소 ?? '');
  return (앞꼬리들 ?? []).some((p) => u.includes(p));
}

/** 날짜 창 — ⛔ toISOString 금지. 이 PC 는 한국시간이다 */
export function 창잡기(오늘 = new Date(), 날수 = 90) {
  const 적기 = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const 끝 = new Date(오늘.getFullYear(), 오늘.getMonth(), 오늘.getDate() - 3);
  const 첫 = new Date(오늘.getFullYear(), 오늘.getMonth(), 오늘.getDate() - 3 - 날수);
  return { 첫날: 적기(첫), 끝날: 적기(끝) };
}

async function 물어본다(토큰, 속성, 첫날, 끝날, 차원 = ['page']) {
  const r = await fetch(
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(속성)}/searchAnalytics/query`,
    { method: 'POST',
      headers: { Authorization: `Bearer ${토큰}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate: 첫날, endDate: 끝날, dimensions: 차원, rowLimit: 25000 }) });
  const 답 = await r.json();
  if (!r.ok) throw new Error(답?.error?.message || ('HTTP ' + r.status));
  return 답.rows ?? [];
}

async function 주다() {
  if (process.argv.includes('--자가시험')) return 자가시험();
  const 값 = (이름, 기본) => { const i = process.argv.indexOf('--' + 이름); return i >= 0 ? process.argv[i + 1] : 기본; };
  const 터 = 값('터', 'klifemap.ai');
  const 앞꼬리들 = String(값('앞꼬리', '/ilju/')).split(',').map((s) => s.trim()).filter(Boolean);
  const 날수 = Number(값('날수', 90)) || 90;

  const { 토큰 } = await 토큰받기();
  const { 첫날, 끝날 } = 창잡기(new Date(), 날수);
  const 줄들 = await 물어본다(토큰, 'sc-domain:' + 터, 첫날, 끝날);
  const 든것 = 줄들.filter((x) => 드나(x.keys?.[0], 앞꼬리들));
  const 노출 = 든것.reduce((a, x) => a + (x.impressions || 0), 0);
  const 클릭 = 든것.reduce((a, x) => a + (x.clicks || 0), 0);

  console.log('■ ' + 터 + '  ' + 첫날 + ' ~ ' + 끝날 + ' (' + 날수 + '일)');
  console.log('   찾는 자리  ' + 앞꼬리들.join(' · '));
  console.log('   노출된 지면 ' + 든것.length + '장 · 노출 ' + 노출 + ' · 클릭 ' + 클릭);
  console.log('   (전체 노출 지면 ' + 줄들.length + '장)');
  for (const x of 든것.sort((a, b) => b.impressions - a.impressions).slice(0, 10)) {
    console.log('     ' + String(x.impressions).padStart(6) + '  ' + String(x.keys[0]).replace('https://' + 터, ''));
  }
  console.log('⚠ 이 수는 «노출된» 장수다 — 색인은 됐는데 아직 안 뜬 지면은 여기 없다.');
  console.log('   ⛔ 「몇 장만 색인됐다」로 적지 않는다. 「몇 장이 노출됐다」가 잰 것이다.');
  process.exit(0);
}

function 자가시험() {
  let 통 = 0; const 진 = [];
  const 본다 = (이름, 참) => { if (참) 통 += 1; else 진.push(이름); };
  본다('🔴 앞꼬리가 맞으면 든다', 드나('https://klifemap.ai/ilju/gap-ja', ['/ilju/']) === true);
  본다('⛔ 안 맞으면 안 든다', 드나('https://klifemap.ai/tti-rat', ['/ilju/']) === false);
  본다('🔴 여럿 가운데 하나만 맞아도 든다', 드나('https://a/b/sinsal', ['/ilju/', 'sinsal']) === true);
  본다('⛔ 빈 것에 안 터진다', 드나(null, null) === false);
  const { 첫날, 끝날 } = 창잡기(new Date(2026, 10, 12), 90);
  본다('🔴 마지막 사흘은 뺀다 — 아직 안 굳었다', 끝날 === '2026-11-09');
  본다('🔴 날수만큼 거슬러 간다', 첫날 === '2026-08-11');
  const 나 = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8');
  본다('⛔ toISOString 을 안 쓴다', !나.includes('toISO' + 'String()'));
  본다('⛔ 노출과 색인을 가른다고 적었다', 나.includes('「색인된 장수」가 **아니다**'));
  console.log(진.length ? `🔴 ${진.length} 떨어졌다 —\n  ${진.join('\n  ')}` : `✅ 자가시험 ${통} 통과`);
  process.exit(진.length ? 1 : 0);
}

if (String(process.argv[1] ?? '').endsWith('잰다-색인된장수.mjs')) await 주다();
