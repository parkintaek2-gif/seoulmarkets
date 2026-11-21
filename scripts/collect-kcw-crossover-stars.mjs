#!/usr/bin/env node
/**
 * collect-kcw-crossover-stars.mjs — **노래와 연기를 다 하는 한국 연예인은 더 읽히나.**
 * ────────────────────────────────────────────────────────────────────────────
 * [왜 이 축인가 — 사장님 지시 2026-09-03]
 *   > 「자료를 찾아서 우리만의 콘텐트를 만들어봐 … 내가 말 안해도 네가 스스로 이런 걸 하는 게
 *   >  스스로 발전하는 거야 … **대중문화, 스타를 다루는 사이트가 사람이 제일 많이 찾고
 *   >  콘텐트를 소비한다고, 네가 바로 그 자리야**」
 *
 *   그래서 «사람 이름이 붙은 축»을 쥔 자료에서 찾았다.
 *   우리 명부 9,249명 가운데 **992명이 노래와 연기를 다 한다.**
 *   이 축을 쓴 지면이 우리 142편 중 «하나도 없었다»(2026-09-03 실측 — 「992」가 걸린 세 편은
 *   4,992·1992년이라는 딴 수였다).
 *
 * [무엇을 재나 — 남들이 안 센 것]
 *   기사들은 「아이돌이 연기까지 한다」를 이야기로 쓴다. **그것이 실제로 주목으로 돌아오는지는
 *   아무도 세지 않는다.** 우리는 세 자료를 이어서 그것을 잰다.
 *   ```
 *   roles   Q → 갈래(노래 · 연기 · 둘다)            9,249명   Wikidata P106·P463
 *   birth   Q → 이름 · 태어난 날 · sitelinks        9,249명   Wikidata
 *   열람수  이름 → 하루평균 (en.wikipedia 30일)     2,372+명  Wikimedia Pageviews API
 *   ```
 *   ⛔ 평균만 내지 않는다. 열람수는 꼬리가 두꺼워서 평균이 최상위 몇 명에게 끌려간다.
 *      **중앙값을 본다.** 우리 강령이 「」다.
 *   ⛔ 이 자는 「둘 다 하면 더 읽힌다」를 증명하려고 만든 자가 아니다. 재서 나오는 대로 적는다.
 *      반대로 나오면 반대로 적는다.
 *
 * [못 재는 것을 미리 적어 둔다]
 *   ⬜ 열람수 명단은 «가수·그룹»과 «배우» 두 벌이라, 어느 쪽 명단에도 없는 사람은 못 쟀다.
 *      못 쟀으면 0 으로 채우지 않고 «못 쟀다»로 센다.
 *   ⬜ 「둘 다 한다」는 위키데이터가 적어 둔 것이다. 우리가 판정한 것이 아니다.
 *      직업이 안 적힌 사람은 미확인으로 남는다.
 *   ⬜ 열람은 en.wikipedia 뿐이다. 한국 안의 인기는 이 자로 안 잰다.
 *
 * [쓰는 법]
 *   node scripts/collect-kcw-crossover-stars.mjs          재서 화면에 낸다
 *   node scripts/collect-kcw-crossover-stars.mjs --적는다  src/data/kcw-crossover-stars.json 에 적는다
 *   node scripts/collect-kcw-crossover-stars.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const 뿌리 = path.join(__dirname, '..');

/** 중앙값 — 열람수는 꼬리가 두꺼워 평균으로는 가운데가 안 보인다 */
export function 중앙값(값들) {
  const s = 값들.filter((v) => Number.isFinite(v)).slice().sort((a, b) => a - b);
  if (!s.length) return null;
  const 반 = Math.floor(s.length / 2);
  return s.length % 2 ? s[반] : Math.round((s[반 - 1] + s[반]) / 2);
}

/** 백분위 — 「위쪽 몇 명이 끌고 있나」를 보이려면 이것이 필요하다 */
export function 백분위(값들, p) {
  const s = 값들.filter((v) => Number.isFinite(v)).slice().sort((a, b) => a - b);
  if (!s.length) return null;
  const i = Math.min(s.length - 1, Math.max(0, Math.round((p / 100) * (s.length - 1))));
  return s[i];
}

/** 이름을 맞추기 위한 다듬기 — 그렇지만 «다듬어서 억지로 맞추지는» 않는다 */
export function 이름열쇠(이름) {
  return String(이름 ?? '').trim().toLowerCase().split(' ').filter(Boolean).join(' ');
}

/** 태어난 해 → 나이 (KST 오늘 기준) */
export function 나이(born, 오늘 = new Date()) {
  const m = String(born ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const 해 = Number(m[1]);
  if (해 < 1900 || 해 > 오늘.getFullYear()) return null;
  let n = 오늘.getFullYear() - 해;
  const 달 = Number(m[2]); const 날 = Number(m[3]);
  if (오늘.getMonth() + 1 < 달 || (오늘.getMonth() + 1 === 달 && 오늘.getDate() < 날)) n -= 1;
  return n;
}

/**
 * 세 자료를 이어서 갈래별로 잰다.
 * @returns {{갈래별:object, 못쟀다:object, 표본:object}}
 */
export function 잰다({ roles, birth, 열람 }) {
  /* 이름 → 하루평균 (사람만. 그룹은 사람이 아니라 뺀다) */
  const 열람표 = new Map();
  for (const 벌 of 열람) {
    for (const r of (벌.사람 || [])) {
      if (r.갈래 === 'group') continue;                     /* 그룹은 사람이 아니다 */
      const k = 이름열쇠(r.이름);
      if (!k) continue;
      const 이전 = 열람표.get(k);
      /* 같은 이름이 두 벌에 다 있으면 «더 많이 잡힌 쪽»을 쓴다(같은 사람의 같은 문서다) */
      if (!이전 || (r.하루평균 || 0) > 이전.하루평균) 열람표.set(k, { 하루평균: r.하루평균 || 0, 최근7일: r.최근7일 ?? null });
    }
  }

  const 갈래별 = {};
  const 못쟀다 = { 열람없음: 0, 이름없음: 0, 갈래미확인: 0 };
  const 모은사람 = [];

  for (const [q, 역] of Object.entries(roles.사람 || {})) {
    /* 🔴 여기서 grp 를 「그룹 레코드」로 읽고 빼면 안 된다 — 출처는 P463 «소속 음악 그룹»이다.
       grp:true 는 «그룹에 속한 사람»(아이돌 멤버)이고, 이 지면이 세려는 바로 그 사람들이다.
       2026-09-03 에 내가 그렇게 읽고 1,900명(둘다 992명 중 557명)을 버렸다. 자가시험이 이제 막는다. */
    const 갈래 = 역.갈래;
    if (!갈래 || 갈래 === '미확인') { 못쟀다.갈래미확인 += 1; continue; }
    const b = birth.get(q);
    if (!b || !b.name) { 못쟀다.이름없음 += 1; continue; }
    const 열람것 = 열람표.get(이름열쇠(b.name));
    if (!갈래별[갈래]) 갈래별[갈래] = { 명부: 0, 그룹소속: 0, 열람잡힘: 0, 하루평균들: [], sitelinks: [], 나이들: [] };
    const 칸 = 갈래별[갈래];
    칸.명부 += 1;
    if (역.grp) 칸.그룹소속 += 1;    /* P463 — 그룹에 속한 사람(아이돌 멤버) */
    if (Number.isFinite(b.sitelinks)) 칸.sitelinks.push(b.sitelinks);
    const a = 나이(b.born);
    if (a !== null) 칸.나이들.push(a);
    if (!열람것) { 못쟀다.열람없음 += 1; continue; }
    칸.열람잡힘 += 1;
    칸.하루평균들.push(열람것.하루평균);
    모은사람.push({ q, 이름: b.name, 갈래, 그룹소속: !!역.grp, 하루평균: 열람것.하루평균, sitelinks: b.sitelinks ?? null, 나이: a });
  }

  const 셈 = {};
  for (const [갈래, 칸] of Object.entries(갈래별)) {
    셈[갈래] = {
      명부: 칸.명부,
      그룹소속: 칸.그룹소속,
      홀로: 칸.명부 - 칸.그룹소속,
      열람잡힘: 칸.열람잡힘,
      잡힌몫: 칸.명부 ? Number(((칸.열람잡힘 / 칸.명부) * 100).toFixed(1)) : null,
      열람중앙값: 중앙값(칸.하루평균들),
      열람90분위: 백분위(칸.하루평균들, 90),
      sitelinks중앙값: 중앙값(칸.sitelinks),
      나이중앙값: 중앙값(칸.나이들),
    };
  }
  return { 갈래별: 셈, 못쟀다, 사람: 모은사람 };
}

function 자가시험() {
  let 흠 = 0; let 잰수 = 0;
  const 본다 = (이름, 참) => { 잰수 += 1; if (참) console.log(`  ✅ ${이름}`); else { console.log(`  🔴 ${이름}`); 흠 += 1; } };

  본다('중앙값 — 홀수', 중앙값([3, 1, 2]) === 2);
  본다('중앙값 — 짝수는 가운데 둘의 평균', 중앙값([1, 2, 3, 4]) === 3);
  본다('중앙값 — 빈 것은 null 이다()', 중앙값([]) === null);
  본다('중앙값 — 꼬리에 안 끌린다',
    중앙값([1, 1, 1, 1, 100000]) === 1);
  본다('백분위 90', 백분위([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 90) === 9);
  본다('백분위 — 빈 것은 null', 백분위([], 50) === null);

  본다('이름열쇠 — 대소문자·군더더기 공백을 없앤다', 이름열쇠('  Lee   Ji-Eun ') === 'lee ji-eun');
  /* ⛔ 이름을 «억지로» 맞추지 않는다 — 붙임표를 지우면 다른 사람이 붙는다 */
  본다('이름열쇠 — 붙임표를 지우지 않는다', 이름열쇠('Lee Ji-eun') !== 이름열쇠('Lee Jieun'));

  본다('나이 — 생일 지난 사람', 나이('1993-05-16', new Date(2026, 8, 3)) === 33);
  본다('나이 — 생일 안 지난 사람', 나이('1993-12-30', new Date(2026, 8, 3)) === 32);
  본다('나이 — 날짜가 없으면 null', 나이('') === null);
  본다('나이 — 말이 안 되는 해는 null', 나이('1200-01-01') === null);

  /* 이어붙이기 시험 — 작은 본보기로 «규칙»을 본다 */
  const roles = { 사람: {
    Q1: { 갈래: '둘다', grp: false },
    Q2: { 갈래: '노래', grp: false },
    Q3: { 갈래: '연기', grp: false },
    Q4: { 갈래: '노래', grp: false },      /* 열람 명단에 없다 → 못 쟀다 */
    Q5: { 갈래: '미확인', grp: false },    /* 갈래 미확인 → 센다, 재지 않는다 */
    Q6: { 갈래: '노래', grp: true },       /* 그룹에 «속한 사람» — 빼지 않는다 */
  } };
  const birth = new Map([
    ['Q1', { name: 'A One', born: '1990-01-01', sitelinks: 30 }],
    ['Q2', { name: 'B Two', born: '1995-01-01', sitelinks: 10 }],
    ['Q3', { name: 'C Three', born: '1985-01-01', sitelinks: 12 }],
    ['Q4', { name: 'D Four', born: '2000-01-01', sitelinks: 4 }],
    ['Q5', { name: 'E Five', born: '1999-01-01', sitelinks: 3 }],
    ['Q6', { name: 'F Six', born: '1998-01-01', sitelinks: 7 }],
  ]);
  const 열람 = [{ 사람: [
    { 이름: 'A One', 하루평균: 900, 갈래: 'singer' },
    { 이름: 'B Two', 하루평균: 100, 갈래: 'singer' },
    { 이름: 'C Three', 하루평균: 300, 갈래: 'actor' },
    { 이름: 'Some Group', 하루평균: 5000, 갈래: 'group' },   /* 그룹은 빠져야 한다 */
  ] }];
  const 결 = 잰다({ roles, birth, 열람 });

  /* 🔴 2026-09-03 에 실제로 낸 결함 — 이 두 줄이 그것을 막는다 */
  본다('grp 는 «그룹에 속한 사람»이다 — 빼지 않는다',
    결.갈래별['노래'] && 결.갈래별['노래'].명부 === 3);
  본다('그룹 소속과 홀로를 갈라 센다',
    결.갈래별['노래'].그룹소속 === 1 && 결.갈래별['노래'].홀로 === 2);
  본다('열람 명단의 group 레코드는 사람 셈에 안 섞인다',
    !결.사람.some((p) => p.이름 === 'Some Group'));
  본다('사람마다 그룹 소속 여부가 남는다',
    결.사람.some((p) => p.이름 === 'A One' && p.그룹소속 === false));
  본다('갈래 미확인은 재지 않고 센다', 결.못쟀다.갈래미확인 === 1);
  본다('열람 명단에 없는 사람은 못 쟀다로 센다', 결.못쟀다.열람없음 === 2);
  본다('명부 수와 열람 잡힌 수를 따로 낸다',
    결.갈래별['노래'].명부 === 3 && 결.갈래별['노래'].열람잡힘 === 1);
  본다('잡힌 몫을 백분율로 낸다', 결.갈래별['노래'].잡힌몫 === 33.3);
  본다('둘다 칸이 선다', 결.갈래별['둘다'] && 결.갈래별['둘다'].열람중앙값 === 900);
  본다('sitelinks 중앙값을 낸다', 결.갈래별['둘다'].sitelinks중앙값 === 30);
  본다('나이 중앙값을 낸다', 결.갈래별['둘다'].나이중앙값 !== null);
  /* ⛔ 못 쟀는데 0 이라고 적으면 안 된다 */
  본다('열람이 하나도 안 잡힌 갈래는 중앙값이 null 이다', (() => {
    const r2 = { 사람: { Q9: { 갈래: '연기', grp: false } } };
    const b2 = new Map([['Q9', { name: 'Nobody Here', born: '1990-01-01', sitelinks: 2 }]]);
    const 결2 = 잰다({ roles: r2, birth: b2, 열람: [{ 사람: [] }] });
    return 결2.갈래별['연기'].열람중앙값 === null;
  })());

  console.log(흠 ? `\n🔴 자가시험 ${잰수}가지 중 ${흠}가지 틀렸다` : `\n✅ 자가시험 ${잰수}가지 다 맞다`);
  return 흠;
}

function 읽는다(상대) {
  return JSON.parse(fs.readFileSync(path.join(뿌리, 상대), 'utf8'));
}

function main() {
  const 인자 = process.argv.slice(2);
  console.log('# 노래와 연기를 다 하는 한국 연예인은 더 읽히나\n');
  const 흠 = 자가시험();
  if (인자.includes('--자가시험')) process.exit(흠 ? 1 : 0);
  if (흠) { console.log('\n⛔ 자가시험이 틀렸다. 재지 않는다.'); process.exit(1); }

  const roles = 읽는다('archive/raw/wikidata/korean-entertainers-roles.json');
  const birthRaw = 읽는다('archive/raw/wikidata/korean-entertainers-birth.json');
  const birth = new Map();
  for (const p of (birthRaw.사람 || [])) birth.set(p.q, p);

  const 열람 = [];
  const 열람방 = path.join(뿌리, 'archive', 'raw', 'star-pageviews');
  const 열람파일 = fs.readdirSync(열람방).filter((f) => f.endsWith('.json')).sort();
  for (const f of 열람파일) 열람.push(JSON.parse(fs.readFileSync(path.join(열람방, f), 'utf8')));

  console.log(`\n자료 — roles ${roles.사람수}명 · birth ${birth.size}명 · 열람 파일 ${열람파일.join(', ')}\n`);

  const 결 = 잰다({ roles, birth, 열람 });

  console.log('| 갈래 | 명부 | 그룹 소속 | 홀로 | 열람 잡힘 | 잡힌 몫 | 하루평균 중앙값 | 90분위 | 위키 언어판 중앙값 | 나이 중앙값 |');
  console.log('|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
  for (const 갈래 of ['둘다', '노래', '연기', '기타']) {
    const c = 결.갈래별[갈래];
    if (!c) continue;
    const 값 = (v) => (v === null || v === undefined ? '못 쟀다' : v.toLocaleString('en-US'));
    console.log(`| ${갈래} | ${값(c.명부)} | ${값(c.그룹소속)} | ${값(c.홀로)} | ${값(c.열람잡힘)} | ${c.잡힌몫 === null ? '못 쟀다' : c.잡힌몫 + '%'} | ${값(c.열람중앙값)} | ${값(c.열람90분위)} | ${값(c.sitelinks중앙값)} | ${값(c.나이중앙값)} |`);
  }

  console.log(`\n⬜ 못 쟀다 — 열람 명단에 없음 ${결.못쟀다.열람없음.toLocaleString('en-US')}명 · `
    + `이름 없음 ${결.못쟀다.이름없음}명 · 갈래 미확인 ${결.못쟀다.갈래미확인}명`);

  const 둘다 = 결.갈래별['둘다']; const 노래 = 결.갈래별['노래']; const 연기 = 결.갈래별['연기'];
  if (둘다 && 노래 && 연기 && 둘다.열람중앙값 && 노래.열람중앙값 && 연기.열람중앙값) {
    console.log(`\n⭐ 중앙값 견주기 — 둘다 ${둘다.열람중앙값} vs 노래 ${노래.열람중앙값} `
      + `(${(둘다.열람중앙값 / 노래.열람중앙값).toFixed(2)}배) vs 연기 ${연기.열람중앙값} `
      + `(${(둘다.열람중앙값 / 연기.열람중앙값).toFixed(2)}배)`);
  }

  const 위 = 결.사람.filter((p) => p.갈래 === '둘다').sort((a, b) => b.하루평균 - a.하루평균).slice(0, 12);
  console.log('\n### 둘 다 하는 사람 가운데 가장 많이 읽힌 열두 명');
  for (const p of 위) console.log(`  ${String(p.하루평균).padStart(6)} /일  ${p.이름}  (언어판 ${p.sitelinks ?? '못 쟀다'} · 나이 ${p.나이 ?? '못 쟀다'})`);

  if (인자.includes('--적는다')) {
    const 길 = path.join(뿌리, 'src', 'data', 'kcw-crossover-stars.json');
    fs.writeFileSync(길, JSON.stringify({
      잰때: new Date().toLocaleString('ko-KR'),
      출처: 'Wikidata (P106 직업 · P463 소속 그룹 · sitelinks) + Wikimedia Pageviews API (en.wikipedia, 30일, all-access/user)',
      이자료가아닌것: '「둘 다 한다」는 위키데이터가 적어 둔 것이고 우리 판정이 아니다. 열람은 en.wikipedia 뿐이라 한국 안의 인기는 이 자로 재지 않는다.',
      갈래별: 결.갈래별,
      못쟀다: 결.못쟀다,
      위쪽사람: 위,
    }, null, 2), 'utf8');
    console.log(`\n📁 적었다 — src/data/kcw-crossover-stars.json`);
  } else {
    console.log('\n⬜ 안 적었다. 남기려면 --적는다 를 붙인다.');
  }
}

if (process.argv[1] && process.argv[1].endsWith('collect-kcw-crossover-stars.mjs')) main();
