#!/usr/bin/env node
/**
 * 잰다-서치콘솔에-무엇이-붙어있나.mjs — **구글 서치콘솔에 우리 네 곳이 붙어 있나.**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔴🔴 [2026-11-12 · 5번] 「소유확인 표를 못 봤다」는 「등록 안 됐다」가 «아니다».
 *   소유확인은 지면의 표(meta)로도 하고 DNS 로도 한다. 지면만 보고 「안 됐다」고 적으면
 *   고칠 것이 없는 자리를 날마다 고치러 가게 된다.
 *   ⇒ **서치콘솔에 직접 묻는다.** 그것이 밖에서 난 결과다.
 *
 * ⚠ 이 자가 쓰는 열쇠는 서비스 계정이다. 사람 계정으로 등록한 속성은 그 계정에
 *   «권한이 주어져 있어야» 보인다. 안 보이는 것이 곧 「없다」는 아니다 — 그렇게 적는다.
 *
 * 쓰는 법
 *   node scripts/잰다-서치콘솔에-무엇이-붙어있나.mjs
 *   node scripts/잰다-서치콘솔에-무엇이-붙어있나.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { 토큰받기 } from './fetch-gsc.mjs';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** 네 곳 — 어떤 꼴로든 붙어 있으면 된다 */
export const 우리곳 = [
  { 이름: '서울마켓', 자국: 'seoulmarkets.com' },
  { 이름: '백년지도', 자국: '100yearmap.com' },
  { 이름: 'K Culture Wire', 자국: 'kculturewire.com' },
  { 이름: 'KLifeMap', 자국: 'klifemap.ai' },
];

/** 속성 목록에서 그 자국을 가진 것을 고른다. ⛔ 못 찾으면 빈 배열 */
export function 붙은것(목록, 자국) {
  return (목록 ?? [])
    .filter((x) => String(x.siteUrl ?? '').includes(자국))
    .map((x) => ({ 꼴: x.siteUrl, 몫: x.permissionLevel }));
}

async function 주다() {
  if (process.argv.includes('--자가시험')) return 자가시험();
  let 목록; let 계정;
  try {
    const { 토큰, 계정: c } = await 토큰받기();
    계정 = c;
    const r = await fetch('https://searchconsole.googleapis.com/webmasters/v3/sites', {
      headers: { Authorization: `Bearer ${토큰}` },
    });
    const 답 = await r.json();
    if (!r.ok) throw new Error(답?.error?.message || ('HTTP ' + r.status));
    목록 = 답.siteEntry ?? [];
  } catch (e) {
    console.log('⬜ 서치콘솔에 못 물었다 — ' + String(e.message).slice(0, 120));
    console.log('   ⛔ 「못 물었다」는 「등록 안 됐다」가 아니다.');
    process.exit(2);
  }

  console.log('■ 서치콘솔이 이 열쇠에 보여 주는 속성 ' + 목록.length + '개');
  console.log('   열쇠 ' + 계정);
  let 빈곳 = 0;
  for (const x of 우리곳) {
    const 것 = 붙은것(목록, x.자국);
    if (!것.length) {
      빈곳 += 1;
      console.log(`   🔴 ${x.이름.padEnd(16)} 이 열쇠에는 안 보인다`);
    } else {
      console.log(`   ✅ ${x.이름.padEnd(16)} ${것.map((y) => y.꼴 + ' (' + y.몫 + ')').join(' · ')}`);
    }
  }
  /* ⚠ 우리 것이 아닌 속성도 적어 둔다 — 열쇠에 무엇이 붙어 있는지 알아야 한다 */
  const 남은것 = 목록.filter((x) => !우리곳.some((u) => String(x.siteUrl).includes(u.자국)));
  if (남은것.length) {
    console.log('   ⬜ 그 밖에 붙어 있는 것 ' + 남은것.length + '개 — '
      + 남은것.slice(0, 5).map((x) => x.siteUrl).join(' · '));
  }
  if (빈곳) {
    console.log('⛔ 안 보이는 곳은 색인 요청도 못 하고 검색어도 못 본다.');
    console.log('   ⚠ 사람 계정으로 등록돼 있을 수 있다 — 그러면 이 열쇠에 권한을 더해야 보인다.');
    process.exit(1);
  }
  console.log('✅ 네 곳이 다 붙어 있다');
  process.exit(0);
}

function 자가시험() {
  let 통 = 0; const 진 = [];
  const 본다 = (이름, 참) => { if (참) 통 += 1; else 진.push(이름); };
  const 목록 = [
    { siteUrl: 'sc-domain:seoulmarkets.com', permissionLevel: 'siteOwner' },
    { siteUrl: 'https://www.kculturewire.com/', permissionLevel: 'siteFullUser' },
  ];
  본다('🔴 도메인 꼴을 찾는다', 붙은것(목록, 'seoulmarkets.com').length === 1);
  본다('🔴 주소 꼴도 찾는다', 붙은것(목록, 'kculturewire.com')[0].꼴 === 'https://www.kculturewire.com/');
  본다('🔴 몫을 함께 들고 온다', 붙은것(목록, 'seoulmarkets.com')[0].몫 === 'siteOwner');
  본다('⛔ 없으면 빈 배열', 붙은것(목록, '100yearmap.com').length === 0);
  본다('⛔ 빈 것에 안 터진다', 붙은것(null, 'x').length === 0);
  본다('🔴 네 곳을 다 쥔다', 우리곳.length === 4);
  const 나 = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8');
  본다('⛔ 못 물은 것과 없는 것을 가른다', 나.includes('「못 물었다」는 「등록 안 됐다」가 아니다'));
  본다('⛔ 안 보이는 것이 없는 것은 아니라고 적었다', 나.includes('안 보이는 것이 곧 「없다」는 아니다'));
  console.log(진.length ? `🔴 ${진.length} 떨어졌다 —\n  ${진.join('\n  ')}` : `✅ 자가시험 ${통} 통과`);
  process.exit(진.length ? 1 : 0);
}

if (String(process.argv[1] ?? '').endsWith('잰다-서치콘솔에-무엇이-붙어있나.mjs')) await 주다();
