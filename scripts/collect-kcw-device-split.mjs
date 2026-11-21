#!/usr/bin/env node
/**
 * collect-kcw-device-split.mjs — **한국 팀을 «무엇으로» 찾아보나 — 컴퓨터인가 전화인가**
 * ─────────────────────────────────────────────────────────────────────────────
 * [왜 이 축인가 · 2026-09-08 5번]
 *   오늘 씨앗(구글뉴스 kpop 영문): 「K-pop's new power fans? Middle-aged Americans with
 *   money and time to spend」
 *
 *   ⛔ 우리는 **나이를 못 잰다.** 위키미디어는 나이를 안 준다. 그것을 잰 척하면 안 된다.
 *   ✅ 잴 수 있는 것은 하나 있다 — **어느 기기로 읽었나.** 위키미디어가 그것은 준다.
 *     ⚠ 기기는 나이가 «아니다». 그 말을 지면과 기사에 못박는다.
 *     그래도 뜻이 있다 — 컴퓨터로 읽는 사람과 전화로 읽는 사람은 «다르게 도착한다»
 *     (책상에서 찾아보는 것과 손에 든 것으로 찾아보는 것).
 *
 *   ⭐ 이 축은 우리 저장소에 없다. `measure-real-readers.mjs` 가 «우리 사이트»의 기기를
 *     GA4 로 재지만, **위키백과 열람의 기기 갈림을 잰 자는 없다**(2026-09-08 확인).
 *
 * [셈]
 *   ```
 *   데스크톱몫 = desktop 열람 / all-access 열람
 *   ```
 *   ⚠ all-access 는 desktop + mobile-web + mobile-app 이다. 그러니 나머지를 「전화」로
 *     부르되 «앱과 웹을 합친 것»임을 적는다. 앱만 따로 부르지 않는다.
 *
 * [검산이 공짜로 붙는다]
 *   ⭐ `kcw-member-vs-group.json` 에 어제 받은 all-access 12개월 합이 이미 있다.
 *     오늘 all-access 를 «다시» 받아 그 수와 견주면, 우물이 그동안 움직였는지 알 수 있다.
 *     ⇒ 그래서 desktop 만 받지 않고 all-access 도 함께 받는다. 한 팀에 두 번 던진다.
 *
 * ⛔ 못 받은 팀을  뺀 수를 세어 적는다.
 * ⛔ 열람이 적은 팀은 «몫»이 잡음이다 — 바닥선을 두고, 그 선을 자료에 적는다.
 *
 * [쓰는 법]
 *   node scripts/collect-kcw-device-split.mjs --시험만       셈만 (그물 안 던진다)
 *   node scripts/collect-kcw-device-split.mjs --맛보기 30     30팀만 (빨리 보려고)
 *   node scripts/collect-kcw-device-split.mjs                재기만 하고 안 쓴다
 *   node scripts/collect-kcw-device-split.mjs --적는다        src/data/kcw-device-split.json
 */

const 아는깃발 = new Set(['--시험만', '--적는다', '--맛보기']);
{
  const 준것 = process.argv.slice(2);
  const 모르는것 = [];
  for (let i = 0; i < 준것.length; i++) {
    const a = 준것[i];
    if (!a.startsWith('--')) continue;
    if (!아는깃발.has(a)) 모르는것.push(a);
    if (a === '--맛보기') i++;
  }
  if (모르는것.length) {
    console.error(`⛔ 모르는 깃발입니다: ${모르는것.join(' ')}`);
    console.error(`   아는 깃발: ${[...아는깃발].join(' · ')}`);
    process.exit(2);
  }
}

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 팀길 = path.join(ROOT, 'src', 'data', 'kcw-member-vs-group.json');
const 세대길 = path.join(ROOT, 'src', 'data', 'kcw-generation.json');
const 나갈것 = path.join(ROOT, 'src', 'data', 'kcw-device-split.json');
const UA = { 'User-Agent': 'KCultureWire/1.0 (https://www.kculturewire.com; cs@klifedesign.net)' };
const 바닥선 = 1000;          // 창 동안 all-access 열람이 이만큼은 되어야 «몫»을 말한다

/* ── 셈 (순수 함수 · 자가시험 대상) ───────────────────────────────────── */

/** 🔴 `Number(null)` 은 0 이다. 못 잰 것을 「0회」로 삼지 않으려고 이 자를 둔다 */
export function 잰수인가(v) {
  if (v === null || v === undefined || v === '') return false;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0;
}

/**
 * 데스크톱 몫. 못 재면 null 이고, «셈이 어긋나면» 그것도 null 이다.
 * ⛔ desktop 이 all-access 보다 크면 어딘가 틀린 것이다 — 1 로 깎아 넘기지 않는다.
 */
export function 데스크톱몫(desktop, 전체) {
  if (!잰수인가(desktop) || !잰수인가(전체)) return null;
  const d = Number(desktop); const a = Number(전체);
  if (!(a > 0)) return null;
  if (d > a) return null;                       // 어긋났다 — 짐작하지 않는다
  return Number((d / a).toFixed(4));
}

/** 중앙값. 빈 것이면 null */
export function 중앙값(수들) {
  if (!Array.isArray(수들)) return null;
  const v = 수들.filter((x) => 잰수인가(x)).map(Number).sort((a, b) => a - b);
  if (!v.length) return null;
  const 가 = Math.floor((v.length - 1) / 2);
  const 나 = Math.ceil((v.length - 1) / 2);
  return Number(((v[가] + v[나]) / 2).toFixed(4));
}

/**
 * 두 수가 얼마나 어긋나나 — 어제 받은 것과 오늘 받은 것을 견주는 데 쓴다.
 * ⚠ 0 으로 나누지 않는다. 옛 값이 0 이면 못 쟀다고 한다.
 */
export function 어긋남(옛, 새) {
  if (!잰수인가(옛) || !잰수인가(새)) return null;
  const a = Number(옛);
  if (!(a > 0)) return null;
  return Number((Math.abs(Number(새) - a) / a).toFixed(4));
}

/** 데뷔해를 열 해 단위 띠로. 못 가르면 null — 「모름」 띠를 만들지 않는다 */
export function 십년띠(해) {
  if (!Number.isInteger(해) || 해 < 1900 || 해 > 2100) return null;
  const b = Math.floor(해 / 10) * 10;
  return `${b}s`;
}

/* ── 자가시험 ─────────────────────────────────────────────────────────── */

let 걸린것 = 0;
const 본다 = (무엇, 참) => { if (!참) { console.error(`  🔴 ${무엇}`); 걸린것++; } };

function 자가시험() {
  본다('null 은 잰 수가 아니다', 잰수인가(null) === false);
  본다('빈 글자는 잰 수가 아니다', 잰수인가('') === false);
  본다('0 은 잰 수다', 잰수인가(0) === true);
  본다('음수는 잰 수가 아니다', 잰수인가(-5) === false);

  본다('반이면 0.5', 데스크톱몫(50, 100) === 0.5);
  본다('전부면 1', 데스크톱몫(100, 100) === 1);
  본다('0 이면 0', 데스크톱몫(0, 100) === 0);
  본다('🔴 desktop 이 더 크면 null — 1 로 깎지 않는다', 데스크톱몫(150, 100) === null);
  본다('전체가 0 이면 null', 데스크톱몫(0, 0) === null);
  본다('못 잰 것이 섞이면 null', 데스크톱몫(null, 100) === null);
  본다('전체를 못 재면 null', 데스크톱몫(50, null) === null);

  본다('중앙값 홀수', 중앙값([0.1, 0.2, 0.3]) === 0.2);
  본다('중앙값 짝수', 중앙값([0.1, 0.3]) === 0.2);
  본다('못 잰 것을 빼고 센다', 중앙값([0.1, null, 0.3]) === 0.2);
  본다('빈 것은 null', 중앙값([]) === null);

  본다('같으면 0', 어긋남(100, 100) === 0);
  본다('10% 늘면 0.1', 어긋남(100, 110) === 0.1);
  본다('10% 줄면 0.1', 어긋남(100, 90) === 0.1);
  본다('옛 값이 0 이면 null', 어긋남(0, 5) === null);
  본다('못 잰 것이 섞이면 null', 어긋남(null, 5) === null);

  본다('2013 은 2010s', 십년띠(2013) === '2010s');
  본다('2020 은 2020s', 십년띠(2020) === '2020s');
  본다('1999 는 1990s', 십년띠(1999) === '1990s');
  본다('해가 아니면 null', 십년띠(null) === null);
  본다('말이 안 되는 해는 null', 십년띠(1200) === null);

  if (걸린것) { console.error(`\n🔴 자가시험 ${걸린것}가지 걸렸다`); process.exit(1); }
  console.log('✅ 자가시험 25가지 통과');
}

/* ── 그물 ─────────────────────────────────────────────────────────────── */

async function 받기(주소) {
  for (let i = 0; i < 5; i++) {
    try {
      const r = await fetch(주소, { headers: UA });
      if (r.ok) return await r.json();
      if (r.status === 404) return null;
      if (r.status === 429 || r.status >= 500) {
        await new Promise((s) => setTimeout(s, 2000 * (i + 1)));
        continue;
      }
      return { 못받음: r.status };
    } catch (e) {
      if (i === 4) return { 못받음: e.message };
      await new Promise((s) => setTimeout(s, 800));
    }
  }
  return { 못받음: '다섯 번 다 실패' };
}

/** 한 문서의 창 동안 열람 합. 못 읽으면 null — 0 으로 안 채운다 */
async function 열람합(제목, 접근, 시, 끝) {
  const u = 'https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia'
    + `/${접근}/user/${encodeURIComponent(제목.replace(/ /g, '_'))}/monthly/${시}/${끝}`;
  const j = await 받기(u);
  if (!j || j.못받음 || !Array.isArray(j.items)) return null;
  return j.items.reduce((a, it) => a + Number(it.views || 0), 0);
}

function 이제() {
  const d = new Date();                       // ⭐ 이 PC 는 이미 KST 다
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())} KST`;
}

async function 주된일() {
  자가시험();
  if (process.argv.includes('--시험만')) return;

  if (!fs.existsSync(팀길)) { console.error(`⛔ ${path.relative(ROOT, 팀길)} 가 없다`); process.exit(1); }
  const 앞 = JSON.parse(fs.readFileSync(팀길, 'utf8'));
  const 창 = String(앞.창 || '');
  const m = /^(\d{4})-(\d{2})\s*~\s*(\d{4})-(\d{2})$/.exec(창);
  if (!m) { console.error(`⛔ 앞자료의 창을 못 읽었다: ${창}`); process.exit(1); }
  const 시 = `${m[1]}${m[2]}01`;
  const 끝 = `${m[3]}${m[4]}01`;
  console.log(`창 ${창} → ${시}~${끝}`);

  /* 데뷔해를 붙인다 — 있으면 붙이고, 없으면 «없다»로 둔다 */
  const 데뷔 = new Map();
  if (fs.existsSync(세대길)) {
    for (const t of JSON.parse(fs.readFileSync(세대길, 'utf8')).팀 || []) 데뷔.set(t.q, t.데뷔해);
    console.log(`데뷔해를 붙일 수 있는 팀 ${데뷔.size}개`);
  } else console.log('⚠ 세대 자료가 없다 — 데뷔해 없이 간다');

  let 팀들 = (앞.팀 || []).filter((t) => t.제목 && 잰수인가(t.팀열람));
  const 맛i = process.argv.indexOf('--맛보기');
  if (맛i >= 0) {
    const n = Number(process.argv[맛i + 1]);
    if (!Number.isInteger(n) || n < 1) { console.error('⛔ --맛보기 뒤에 팀 수를 주십시오'); process.exit(2); }
    팀들 = [...팀들].sort((a, b) => b.팀열람 - a.팀열람).slice(0, n);
    console.log(`⚠ 맛보기 — 많이 읽히는 ${팀들.length}팀만 잽니다`);
  }

  const 줄 = []; const 못잰것 = [];
  for (let i = 0; i < 팀들.length; i++) {
    const t = 팀들[i];
    const [d, a] = await Promise.all([
      열람합(t.제목, 'desktop', 시, 끝),
      열람합(t.제목, 'all-access', 시, 끝),
    ]);
    if (!잰수인가(a)) { 못잰것.push({ 이름: t.이름, q: t.q, 까닭: 'all-access 를 못 읽었다' }); }
    else if (!잰수인가(d)) { 못잰것.push({ 이름: t.이름, q: t.q, 까닭: 'desktop 을 못 읽었다' }); }
    else if (Number(a) < 바닥선) { 못잰것.push({ 이름: t.이름, q: t.q, 까닭: `창 동안 열람 ${a}회 — 바닥선 ${바닥선} 아래라 몫이 잡음이다` }); }
    else {
      const 몫 = 데스크톱몫(d, a);
      if (몫 === null) { 못잰것.push({ 이름: t.이름, q: t.q, 까닭: `셈이 어긋났다 — desktop ${d} > all-access ${a}` }); }
      else {
        const 해 = 데뷔.get(t.q);
        줄.push({
          이름: t.이름, 제목: t.제목, q: t.q,
          전체: Number(a), 데스크톱: Number(d), 전화: Number(a) - Number(d),
          데스크톱몫: 몫,
          데뷔해: Number.isInteger(해) ? 해 : null,
          띠: 십년띠(Number.isInteger(해) ? 해 : null),
          어제전체: Number(t.팀열람),
          어제와어긋남: 어긋남(t.팀열람, a),
        });
      }
    }
    if ((i + 1) % 20 === 0 || i + 1 === 팀들.length) process.stdout.write(`\r  ${i + 1}/${팀들.length} · 잰 것 ${줄.length} · 뺀 것 ${못잰것.length}   `);
  }
  process.stdout.write('\n');
  if (!줄.length) { console.error('⛔ 한 팀도 못 쟀다'); process.exit(1); }

  /* ── 검산: 어제 받은 all-access 와 오늘 받은 것이 맞나 ── */
  const 어긋난것들 = 줄.map((x) => x.어제와어긋남).filter((v) => v !== null);
  const 검산 = {
    견준팀수: 어긋난것들.length,
    중앙어긋남: 중앙값(어긋난것들),
    한푼이하: 어긋난것들.filter((v) => v <= 0.01).length,
    한푼이하몫: 어긋난것들.length ? Number((어긋난것들.filter((v) => v <= 0.01).length / 어긋난것들.length).toFixed(4)) : null,
    가장어긋난: [...줄].filter((x) => x.어제와어긋남 !== null)
      .sort((a, b) => b.어제와어긋남 - a.어제와어긋남).slice(0, 5)
      .map((x) => ({ 이름: x.이름, 어제: x.어제전체, 오늘: x.전체, 어긋남: x.어제와어긋남 })),
  };

  /* ── 띠별 ── */
  const 띠들 = [...new Set(줄.map((x) => x.띠).filter(Boolean))].sort();
  const 띠별 = 띠들.map((b) => {
    const 것 = 줄.filter((x) => x.띠 === b);
    return { 띠: b, 팀수: 것.length, 데스크톱몫중앙값: 중앙값(것.map((x) => x.데스크톱몫)) };
  });
  const 띠없음 = 줄.filter((x) => !x.띠).length;

  const 정렬 = [...줄].sort((a, b) => b.데스크톱몫 - a.데스크톱몫);
  const 낼것 = {
    잰때: 이제(),
    창,
    우물: [
      `Wikimedia Pageviews REST API — en.wikipedia, agent=user, monthly, ${창}. Fetched twice per act: access=desktop and access=all-access.`,
      'Phone is all-access minus desktop, so it is mobile web and the Wikipedia app added together. We do not report the app separately.',
      'Debut years joined from kcw-generation.json (Wikidata P571). Acts without one are kept but not binned.',
    ],
    이것이무엇인가: 'Which device people used when they looked up a Korean act on English Wikipedia.',
    이것이아닌것: [
      '🔴 It is not age. Wikimedia publishes no reader age, and this page makes no claim about how old anybody is. A phone is not young and a desktop is not middle-aged.',
      'It is not location. Device and country are separate measurements; ours is device only.',
      'It is not our own site. Our visitors are measured separately in GA4; this is reading on Wikipedia.',
      `Acts read under ${바닥선} times in the window are dropped rather than shown with a noisy share.`,
    ],
    선: {
      바닥선,
      전화의뜻: 'all-access minus desktop — mobile web plus the app',
      띠: 'Ten-year bands by founding year. Acts with no recorded year are counted in the totals but not in the bands.',
    },
    셈: {
      앞자료팀수: (앞.팀 || []).length,
      던진팀수: 팀들.length,
      잰팀수: 줄.length,
      뺀팀수: 못잰것.length,
      띠없는팀수: 띠없음,
      데스크톱몫중앙값: 중앙값(줄.map((x) => x.데스크톱몫)),
      데스크톱합: 줄.reduce((a, x) => a + x.데스크톱, 0),
      전화합: 줄.reduce((a, x) => a + x.전화, 0),
      전체합: 줄.reduce((a, x) => a + x.전체, 0),
    },
    검산,
    띠별,
    데스크톱쪽스물: 정렬.slice(0, 20),
    전화쪽스물: 정렬.slice(-20).reverse(),
    팀: 줄.sort((a, b) => b.전체 - a.전체),
    못잰것,
  };
  /* 전체를 하나로 합친 몫 — 팀마다의 중앙값과 «다르다». 둘 다 낸다 */
  낼것.셈.합쳐본데스크톱몫 = 낼것.셈.전체합 > 0
    ? Number((낼것.셈.데스크톱합 / 낼것.셈.전체합).toFixed(4)) : null;

  console.log(`\n=== 기기 갈림 · ${줄.length}팀 · ${창} ===`);
  console.log(`  팀마다의 데스크톱몫 중앙값 ${(낼것.셈.데스크톱몫중앙값 * 100).toFixed(1)}%`);
  console.log(`  열람을 다 합쳐 본 데스크톱몫 ${(낼것.셈.합쳐본데스크톱몫 * 100).toFixed(1)}%`);
  console.log(`  (합친 것이 중앙값과 다른 것은 «많이 읽히는 팀»이 다르게 움직인다는 뜻이다)`);
  console.log('\n=== 데뷔 십년띠별 데스크톱몫 중앙값 ===');
  for (const b of 띠별) console.log(`  ${b.띠}  팀 ${String(b.팀수).padStart(3)} · ${(b.데스크톱몫중앙값 * 100).toFixed(1)}%`);
  if (띠없음) console.log(`  (데뷔해 없는 ${띠없음}팀은 띠에 안 넣었다 — 합계에는 있다)`);
  console.log('\n=== 컴퓨터로 많이 읽는 쪽 여덟 ===');
  for (const x of 정렬.slice(0, 8)) console.log(`  ${(x.데스크톱몫 * 100).toFixed(1)}%  ${x.이름} (${x.데뷔해 ?? '연도 없음'}) · 열람 ${x.전체.toLocaleString('en-US')}`);
  console.log('=== 전화로 많이 읽는 쪽 여덟 ===');
  for (const x of 정렬.slice(-8).reverse()) console.log(`  ${(x.데스크톱몫 * 100).toFixed(1)}%  ${x.이름} (${x.데뷔해 ?? '연도 없음'}) · 열람 ${x.전체.toLocaleString('en-US')}`);
  console.log(`\n=== 검산: 어제 받은 all-access 와 오늘 것 ===`);
  console.log(`  견준 팀 ${검산.견준팀수} · 1% 안쪽 ${검산.한푼이하}팀 (${(검산.한푼이하몫 * 100).toFixed(1)}%) · 어긋남 중앙 ${(검산.중앙어긋남 * 100).toFixed(2)}%`);
  for (const x of 검산.가장어긋난) console.log(`   가장 어긋난: ${x.이름} 어제 ${x.어제.toLocaleString('en-US')} → 오늘 ${x.오늘.toLocaleString('en-US')} (${(x.어긋남 * 100).toFixed(1)}%)`);

  if (!process.argv.includes('--적는다')) { console.log('\n⬜ 재기만 했다. 쓰려면 --적는다'); return; }
  if (맛i >= 0) { console.error('\n⛔ 맛보기 판을 적지 않는다 — 자료가 반쪽이 된다'); process.exit(1); }
  fs.writeFileSync(나갈것, JSON.stringify(낼것, null, 2) + '\n', 'utf8');
  console.log(`\n✅ 적었다 — ${path.relative(ROOT, 나갈것)}`);
}

/* 🔴 불러 쓸 때 본문이 돌면 안 된다 — 2026-09-07 에 그 결함으로 한 자가 남의 자료를 덮었다 */
const 내가직접돌았나 = (() => {
  try { return process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]); }
  catch { return false; }
})();

if (내가직접돌았나) {
  주된일().catch((e) => { console.error('🔴', e.message); process.exit(1); });
}
