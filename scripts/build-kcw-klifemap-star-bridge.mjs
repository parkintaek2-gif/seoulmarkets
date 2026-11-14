#!/usr/bin/env node
/**
 * build-kcw-klifemap-star-bridge.mjs — **KCW 에서 KLifeMap 스타 지면으로 가는 다리.**
 *
 * ── 🔴🔴 왜 만들었나 (2026-10-04 · 5번) ─────────────────────────────────
 * 사장님 — 「**케이라리프맵 방문자가 0명이라고? … 방문자를 빨리 만들고 늘려**」
 *
 * 재 보니 klifemap.ai 는 구글 검색에서 **28일 노출 0 · 클릭 0** 이었다.
 * 사이트맵 2,918장을 구글이 읽었고(오류 0) robots 도 열려 있는데 **홈 한 장만** 색인됐다.
 *
 * ⭐ 그런데 KCW 사람 지면 634개는 색인돼 있다. 색인된 지면이 길을 내면 구글이 따라간다.
 *   사람 지면마다 「그 사람 전용」 링크를 붙여 36명을 이었다(같은 날 먼저 한 일).
 *   남은 **245명**은 KCW 에 사람 지면이 없어 길이 안 난다 — 그 245명을 위해 다리를 놓는다.
 *
 * ⛔ 링크만 모은 지면은 만들지 않는다. 구글이 그런 지면을 안 받고, 손님에게도 값이 없다.
 *   **잰 사실**을 같이 싣는다 — 이름·생일·별자리, 그리고 그 281명이 어떤 사람들인가.
 * ⛔ 주소를 지어내지 않는다. 라이브 사이트맵에서 «재서» 나온 Q번호만 쓴다.
 * ⛔ 이름을 지어내지 않는다. KLifeMap 이 Wikidata 에서 받아 둔 이름표를 그대로 쓴다.
 *
 * 쓰는 법
 *   node scripts/build-kcw-klifemap-star-bridge.mjs --짓는다
 *   node scripts/build-kcw-klifemap-star-bridge.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
/* 🔴 [2026-11-14] 영문 지면에 「오후」가 나갔다 — 잰 시각은 한 꼴로 적는다 */
import { 잰때문자 } from './lib/잰때.mjs';

const 여기 = path.dirname(fileURLToPath(import.meta.url));
const 뿌리 = path.resolve(여기, '..');
export const 사이트맵 = 'https://klifemap.ai/sitemap.xml';
export const 낼길 = path.join(뿌리, 'src', 'data', 'kcw-klifemap-star-bridge.json');

/** 사이트맵 글에서 영어 스타 지면 Q번호를 집는다. ⛔ 지어내지 않는다 — 있는 것만 */
export function 영어스타Q(사이트맵글) {
  const saju = new Set(); const astro = new Set();
  for (const m of String(사이트맵글 ?? '').matchAll(/star-(q\d+)-(saju|astro)-en/g)) {
    (m[2] === 'saju' ? saju : astro).add(m[1].toUpperCase());
  }
  return { saju, astro };
}

/** 사주·별자리가 «둘 다» 있고 영문 이름까지 있는 사람만. ⛔ 반쪽은 안 싣는다 */
export function 다리놓을사람들(saju, astro, 이름표) {
  const 것 = [];
  for (const q of saju) {
    if (!astro.has(q)) continue;
    const en = 이름표?.[q]?.en;
    if (!en) continue;
    것.push({ q, 이름: en, 사주: `https://klifemap.ai/content/${q.toLowerCase()}-saju-en`.replace('/q', '/star-q'), 별자리: `https://klifemap.ai/content/${q.toLowerCase()}-astro-en`.replace('/q', '/star-q') });
  }
  것.sort((a, b) => a.이름.localeCompare(b.이름, 'en'));
  return 것;
}

/* ── 자가시험 ─────────────────────────────────────────────────────────── */
export function 자가시험() {
  const 결과 = [];
  const 본다 = (이름, 참) => 결과.push({ 이름, 참: !!참 });

  const { saju, astro } = 영어스타Q('a star-q1-saju-en b star-q1-astro-en c star-q2-saju-en');
  본다('사주 지면을 집는다', saju.has('Q1') && saju.has('Q2'));
  본다('별자리 지면을 집는다', astro.has('Q1'));
  본다('⛔ 한국어 지면은 안 집는다', !영어스타Q('star-q9-saju-ko').saju.has('Q9'));
  본다('⛔ 빈 글·null 에도 안 터진다', 영어스타Q('').saju.size === 0 && 영어스타Q(null).saju.size === 0);

  const 것 = 다리놓을사람들(saju, astro, { Q1: { en: 'Alpha' }, Q2: { en: 'Beta' } });
  본다('🔴 둘 다 있는 사람만 싣는다 — 반쪽은 안 싣는다', 것.length === 1 && 것[0].q === 'Q1');
  본다('주소를 지어내지 않는다 — Q번호 그대로', 것[0].사주.endsWith('/star-q1-saju-en'));
  본다('별자리 주소도 낸다', 것[0].별자리.endsWith('/star-q1-astro-en'));
  본다('⛔ 영문 이름이 없으면 안 싣는다', 다리놓을사람들(saju, astro, { Q1: {} }).length === 0);
  본다('⛔ 이름표가 없어도 안 터진다', 다리놓을사람들(saju, astro, null).length === 0);
  본다('이름 차례로 세운다',
    다리놓을사람들(new Set(['Q1', 'Q2']), new Set(['Q1', 'Q2']), { Q1: { en: 'Zed' }, Q2: { en: 'Ann' } })[0].이름 === 'Ann');

  const 빨강 = 결과.filter((r) => !r.참).length;
  console.log('■ KCW→KLifeMap 스타 다리 — 자가시험');
  for (const r of 결과) console.log(`  ${r.참 ? '✅' : '🔴'} ${r.이름}`);
  console.log(빨강 ? `🔴 빨강 ${빨강}개` : `✅ ${결과.length}가지 다 통과`);
  return 빨강 === 0;
}

/* ── 혼자 돌 때 ───────────────────────────────────────────────────────── */
const 내가실행됐다 = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (내가실행됐다) {
  if (process.argv.includes('--selftest') || process.argv.includes('--자가시험')) {
    process.exit(자가시험() ? 0 : 1);
  }
  if (!process.argv.includes('--짓는다')) {
    console.log('⛔ --짓는다 나 --자가시험 을 준다');
    process.exit(1);
  }
  const r = await fetch(사이트맵);
  if (!r.ok) { console.log(`🔴 사이트맵을 못 받았다 — HTTP ${r.status}. **빈 파일을 쓰지 않는다**`); process.exit(1); }
  const { saju, astro } = 영어스타Q(await r.text());
  const 이름표 = JSON.parse(fs.readFileSync(path.join(뿌리, 'src', 'data', 'klifemap-star-names.json'), 'utf8')).이름;
  const 사람들 = 다리놓을사람들(saju, astro, 이름표);
  if (!사람들.length) { console.log('🔴 한 사람도 못 맞췄다 — 쓰지 않는다'); process.exit(1); }

  fs.writeFileSync(낼길, JSON.stringify({
    _meta: {
      무엇: 'KLifeMap 에 영어 사주·별자리 지면이 «둘 다» 있는 한국 연예인 명단',
      아닌것: '인기 순위가 아니다. 지면이 있는가만 본다',
      잰때: 잰때문자(),
      출처: '라이브 사이트맵(klifemap.ai/sitemap.xml)에서 재서 뽑았다 · 이름은 Wikidata',
      사람수: 사람들.length,
    },
    사람들,
  }, null, 1), 'utf8');
  console.log(`✅ ${사람들.length}명 — ${path.relative(뿌리, 낼길)}`);
  console.log('   ⛔ 「냈다」는 증거가 아니다 — 지면을 짓고 라이브에서 눌러 본다');
}
