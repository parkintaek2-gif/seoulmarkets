#!/usr/bin/env node
/**
 * collect-kcw-webtoon-adaptations.mjs — **웹툰이 드라마·영화가 되면 얼마나 읽히나.**
 * ────────────────────────────────────────────────────────────────────────────
 * [사장님 지시 — 2026-09-07]
 *   > 「**웹툰 등도 관심이 많은 케이컬쳐를 조사해봐**」
 *   > 「**영어 키워드 어떤게 의미있는 검색량을 보이면 그에 대한 콘텐트를 만들어**」
 *   > 「**우린 데이터저널리즘이니 만큼 사람들의 관심을 끌게 가공한 데이터를 포함하고**」
 *   > 「**다른 분야 케이컬쳐 콘텐트에도 관심가게 할 수 있는 데이터를 꼭 포함해**」
 *
 * [⭐ 왜 이 축인가 — 마지막 지시가 축을 정했다]
 *   웹툰만 세면 웹툰 지면에서 끝난다. **웹툰이 «드라마·영화»가 된 것**을 세면
 *   한 편의 글이 두 분야를 잇는다 — 웹툰 독자가 드라마를 보고, 드라마 독자가 원작을 찾는다.
 *   그 다리를 «수»로 놓는 것이 이 자다.
 *
 * [무엇을 세나 — 남이 안 센 것]
 *   위키데이터에서 «웹툰을 원작으로 한» 한국 드라마·영화를 뽑고,
 *   그 작품과 «원작 웹툰» 양쪽의 영어 위키백과 열람수를 나란히 잰다.
 *   ⇒ 「원작이 더 읽히나, 각색이 더 읽히나」를 처음으로 수로 말할 수 있다.
 *
 * [⛔ 지키는 것]
 *   · 남의 «완성된 순위표»를 옮기지 않는다. 원자료(위키데이터·열람수)에서 우리가 센다
 *   · 열람수는 **사람 트래픽만**(agent=user). 봇을 섞으면 수가 부풀어 거짓이 된다
 *   · 못 찾은 것은 «0» 이 아니라 **null** 로 둔다. 「위키 문서가 없다」와 「0회 읽혔다」는 다르다
 *
 * [쓰는 법]
 *   node scripts/collect-kcw-webtoon-adaptations.mjs --자가시험
 *   node scripts/collect-kcw-webtoon-adaptations.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * 🔴 [2026-09-07] **깃발 검사가 맨 앞에 선다.**
 *
 *   이 자에는 `--시험만` 이 없었다. 그런데 나는 그것을 붙여 「시험만 돈다」고 믿었고,
 *   자는 모르는 깃발을 조용히 버리고 «진짜 수집»을 돌려 자료를 덮었다.
 *   그 덮어쓴 자료에 지면이 읽는 두 칸이 없어 **빌드가 터졌고, 세 사이트 배포가 막혔다.**
 *
 * ⛔ send-mail.mjs 가 2026-09-03 에 `--첨부` 로 똑같이 당했다 —
 *   그때 배운 것이 「모르는 인자를 거부한다」였는데, 이 자엔 안 옮겨져 있었다.
 * ⭐ 그리고 검사가 «파일 뒤»에 있으면 소용이 없다. 주된 일이 먼저 돌아 버린다.
 *   그래서 여기, 아무것도 돌기 전에 둔다.
 */
/**
 * ⚠ **다시 돌리기 전에 읽으십시오 — 기사 제목에 이 자의 수가 박혀 있습니다.**
 *
 *   `/article/webtoon-adaptations-read-14x-more` · 제목 「read **14x** more」
 *   `/webtoon-adaptations` 표의 「배수중앙값」 칸이 그 14.0 이다.
 *
 *   🔴 2026-09-07 에 실측했다 — **창을 하루만 밀어도 그 수가 움직인다.**
 *```
 *      창 ~2026-09-05  배수중앙값 14.05   ← 기사·제목이 딛고 선 값 (dataAsOf 09-06)
 *      창 ~2026-09-06  배수중앙값 12.65   ← 하루 뒤에 다시 돌린 값
 *      짝 수(18쌍)와 각색우세(16쌍)는 그대로였다. 움직인 것은 열람수 창이다
 *```
 *   ⛔ 자료가 틀린 것이 아니다. **창이 다른 것**이다.
 *   ⛔ 그러니 자료만 갈아 놓고 가지 마십시오 — 지면은 새 수를 내고 기사 제목은 옛 수를
 *     말하게 됩니다. `check-kcw-crosschecks` 가 그것을 잡습니다.
 *
 * ✅ 다시 돌렸다면 셋을 함께 합니다 —
 *   ① 기사 본문·표의 수 ② 기사 제목과 dek ③ dataAsOf
 *   ⚠ 슬러그(`...-14x-more`)는 함부로 바꾸지 않습니다 — 이미 검색에 걸린 주소입니다.
 *     수가 크게 달라졌으면 슬러그는 두고 제목만 고치고, 그 까닭을 기사에 적습니다.
 */
const 아는깃발 = ['--자가시험', '--시험만', '--selftest', '--적는다', '--창'];
const 모르는깃발 = process.argv.slice(2)
  .filter((a) => a.startsWith('--') && !아는깃발.some((k) => a === k || a.startsWith(`${k}=`)));
if (모르는깃발.length) {
  console.error(`⛔ 모르는 깃발 — ${모르는깃발.join(' ')}`);
  console.error(`   아는 것은 ${아는깃발.join(' · ')} 뿐이다.`);
  console.error('   ⚠ 조용히 무시하면 「시험만 돌렸다」고 믿고 «진짜 수집»이 돌아 자료가 덮인다.');
  process.exit(1);
}
/** 시험을 부르는 세 이름을 한자리로 — 어느 것을 주든 «수집은 안 돈다» */
export const 시험만도나 = ['--자가시험', '--시험만', '--selftest'].some((k) => process.argv.includes(k));


/** `http://www.wikidata.org/entity/Q1234` → `Q1234`. ⛔ 못 읽으면 null 이다 — 빈 글자가 아니다 */
export function 큐아이디(주소) {
  const m = String(주소 ?? '').match(/\/(Q\d+)$/);
  return m ? m[1] : null;
}

/**
 * 원작이 한국 것인가 — **위키데이터 P495(원산국)로만** 가른다.
 *
 * ⛔ 이름으로 가르지 않는다. 「Old Boy (manga)」는 한국어 제목 같아 보이지만 일본 만화다.
 * ⛔ P495 가 안 달린 것을 «한국이 아니다»로 읽지 않는다 — `null`(모름)이다.
 *   는 이 저장소의 규칙이 여기서도 그대로다.
 */
export function 한국것인가(나라들) {
  if (!Array.isArray(나라들) || !나라들.length) return null;   /* 모름 */
  return 나라들.includes('South Korea');
}

/**
 * 국적으로 갈라 센다. 지면이 이 꼴을 그대로 읽는다 —
 * `국적으로가른것.한국원작.{짝,각색우세,원작우세,배수중앙값}`
 *
 * ⛔ 「모름」을 어느 쪽에도 넣지 않는다. 따로 센다.
 */
export function 국적으로가르기(줄들) {
  const 목 = Array.isArray(줄들) ? 줄들 : [];
  const 잰것 = 목.filter((x) => x && x.판정 !== '못 잼');
  const 셈 = (뽑) => {
    const g = 잰것.filter(뽑);
    const 배수 = g.map((x) => x.배수).filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
    const 중 = !배수.length ? null
      : (배수.length % 2 ? 배수[(배수.length - 1) / 2]
        : +((배수[배수.length / 2 - 1] + 배수[배수.length / 2]) / 2).toFixed(2));
    return {
      짝: g.length,
      각색우세: g.filter((x) => x.판정 === '각색').length,
      원작우세: g.filter((x) => x.판정 === '원작').length,
      배수중앙값: 중,
    };
  };
  return {
    한국원작: 셈((x) => x.한국원작 === true),
    남의원작: 셈((x) => x.한국원작 === false),
    국적을모름: 잰것.filter((x) => x.한국원작 == null).length,
    주의: '국적은 위키데이터 P495 다. 안 달린 원작은 «모름»으로 둔다 — 「한국이 아니다」로 읽지 않는다',
  };
}


/** 🔴 손님이 읽는 시각이다 — toLocaleString('ko-KR') 은 「오전」을 낸다.
 *  KST 를 영어로 적는다. ⛔ toISOString() 은 UTC 라 새벽에 하루가 어긋난다. */
function 잰때영어(때 = new Date()) {
  const 날 = 때.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const 시 = 때.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${날}, ${시} KST`;
}


const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SPARQL = 'https://query.wikidata.org/sparql';
const UA = 'KCultureWire/1.0 (parkintaek2@gmail.com) webtoon adaptations';
const 창 = 30;

/** 위키백과 열람수 주소 — 사람 트래픽만 */
export function 열람주소(제목, 처음, 끝) {
  const t = encodeURIComponent(String(제목 ?? '').split(' ').join('_'));
  return `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user/${t}/daily/${처음}/${끝}`;
}

/** YYYYMMDD — ⛔ toISOString() 은 UTC 라 새벽에 하루가 어긋난다 */
export function 날짜꼴(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
}

/**
 * 원작과 각색 중 어느 쪽이 더 읽혔나.
 * ⭐ 못 잰 쪽이 있으면 «비교하지 않는다» — 0 으로 채우면 늘 한쪽이 이긴다.
 */
export function 어느쪽이(원작, 각색) {
  if (원작 == null || 각색 == null) return { 판정: '못 잼', 까닭: '한쪽 이상이 위키 문서가 없거나 못 쟀다' };
  if (원작 === 0 && 각색 === 0) return { 판정: '둘 다 0', 까닭: '둘 다 읽힌 기록이 없다' };
  if (각색 > 원작) return { 판정: '각색', 배수: 원작 ? +(각색 / 원작).toFixed(1) : null };
  if (원작 > 각색) return { 판정: '원작', 배수: 각색 ? +(원작 / 각색).toFixed(1) : null };
  return { 판정: '같다' };
}

/* ── 자가시험 ─────────────────────────────────────────────────────────── */
const 내가직접돌았나 = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

/* ⭐ 세 이름을 다 받는다 — `--시험만` 을 줘도 수집이 «안» 돈다.
   그리고 파일 뒤에 있던 새 시험(국적 가르기)도 여기서 함께 돌린다. */
if (내가직접돌았나 && 시험만도나) {
  let 통과 = 0; let 실패 = 0;
  const 참 = (이름, 값) => { if (값) 통과++; else { 실패++; console.log('  🔴', 이름); } };

  참('빈칸을 밑줄로', 열람주소('Sweet Home', '20260101', '20260131').includes('Sweet_Home'));
  참('사람 트래픽만 부른다', 열람주소('x', '20260101', '20260131').includes('/user/'));
  참('봇을 안 섞는다', !열람주소('x', '20260101', '20260131').includes('all-agents'));
  참('영문 위키를 부른다', 열람주소('x', '20260101', '20260131').includes('en.wikipedia'));
  참('빈 제목을 견딘다', typeof 열람주소('', '20260101', '20260131') === 'string');

  참('날짜 꼴', 날짜꼴(new Date(2026, 0, 3)) === '20260103');
  참('두 자리로 채운다', 날짜꼴(new Date(2026, 8, 7)) === '20260907');
  /* ⛔ UTC 로 찍으면 새벽에 하루가 밀린다 — KST 그대로 쓴다 */
  참('새벽에도 그날이다', 날짜꼴(new Date(2026, 8, 7, 0, 30)) === '20260907');

  참('각색이 더 읽히면 각색', 어느쪽이(100, 500).판정 === '각색');
  참('그 배수를 낸다', 어느쪽이(100, 500).배수 === 5);
  참('원작이 더 읽히면 원작', 어느쪽이(500, 100).판정 === '원작');
  참('같으면 같다', 어느쪽이(100, 100).판정 === '같다');
  /* ⭐ 「못 잰 것」을  — 강령③ */
  참('한쪽이 null 이면 못 잼', 어느쪽이(null, 500).판정 === '못 잼');
  참('둘 다 null 이면 못 잼', 어느쪽이(null, null).판정 === '못 잼');
  참('둘 다 0 은 «못 잼»과 다르다', 어느쪽이(0, 0).판정 === '둘 다 0');
  참('0 을 못 잼으로 읽지 않는다', 어느쪽이(0, 5).판정 === '각색');

  console.log(`\n웹툰 각색 수집 — 자가시험 ${통과} 통과 · ${실패} 실패`);
  /* 🔴 국적 가르기 시험도 «여기서» 돈다. 파일 뒤에 두면 수집이 먼저 돌아 버린다 */
  const 더 = 자가시험();
  console.log(`   ⭐ 국적 가르기까지 합쳐 ${통과 + 더}가지`);
  process.exit(실패 ? 1 : 0);
}

if (내가직접돌았나) {
  const 물음 = async (q) => {
    for (let 시도 = 0; 시도 < 3; 시도++) {
      try {
        const r = await fetch(SPARQL, {
          method: 'POST',
          headers: { 'User-Agent': UA, Accept: 'application/sparql-results+json', 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ query: q }),
          signal: AbortSignal.timeout(120000),
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()).results.bindings;
      } catch (e) {
        if (시도 === 2) { console.log(`  ⚠ 못 물었다: ${String(e.message).slice(0, 60)}`); return null; }
        await new Promise((s) => setTimeout(s, 5000));
      }
    }
    return null;
  };

  /* ⚠ 한 번에 넓게 물으면 504 가 난다(같은 저장소의 kpop 수집기가 겪었다).
     그래서 «웹툰 원작» 하나로 좁혀 묻는다. */
  const q = `SELECT DISTINCT ?work ?workLabel ?src ?srcLabel ?enWork ?enSrc ?date WHERE {
    ?work wdt:P144 ?src .                      # 원작(based on)
    ?src wdt:P31/wdt:P279* wd:Q1004 .          # 원작이 만화(comic) 갈래
    { ?src wdt:P495 wd:Q884 } UNION { ?work wdt:P495 wd:Q884 }   # 한국 것
    OPTIONAL { ?work wdt:P577 ?date }
    OPTIONAL { ?lw schema:about ?work ; schema:isPartOf <https://en.wikipedia.org/> ; schema:name ?enWork }
    OPTIONAL { ?ls schema:about ?src  ; schema:isPartOf <https://en.wikipedia.org/> ; schema:name ?enSrc }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en,ko". }
  } LIMIT 600`;

  console.log('■ 위키데이터에 묻는다 — 한국 만화·웹툰을 원작으로 한 작품\n');
  const 줄 = await 물음(q);
  if (!줄) { console.log('🔴 못 물었다 — **아무것도 안 냈다.**'); process.exit(1); }

  /* 영문 위키 문서가 «양쪽 다» 있는 것만 견줄 수 있다 */
  const 것들 = [];
  const 본것 = new Set();
  for (const b of 줄) {
    const 열쇠 = (b.work?.value || '') + '|' + (b.src?.value || '');
    if (본것.has(열쇠)) continue; 본것.add(열쇠);
    것들.push({
      각색: b.workLabel?.value ?? null, 각색en: b.enWork?.value ?? null,
      원작: b.srcLabel?.value ?? null, 원작en: b.enSrc?.value ?? null,
      /* 🔴 [2026-09-07] 이 줄이 없어서 국적을 다시 물을 길이 없었다.
         QID 를 버리면 「원작이 한국 것인가」를 이 자 안에서 못 답한다 */
      원작QID: 큐아이디(b.src?.value),
      나온날: b.date?.value ? b.date.value.slice(0, 10) : null,
    });
  }
  const 잴수있는것 = 것들.filter((x) => x.각색en && x.원작en);
  console.log(`   받은 짝 ${것들.length}쌍 · 그중 «영문 위키가 양쪽 다» 있는 것 ${잴수있는것.length}쌍`);
  console.log(`   ⬜ 한쪽이라도 영문 문서가 없어 못 재는 것 ${것들.length - 잴수있는것.length}쌍 — \n`);

  /* 열람수 — 사람 트래픽만, 지난 30일 */
  const 끝날 = new Date(); 끝날.setDate(끝날.getDate() - 1);
  const 첫날 = new Date(끝날); 첫날.setDate(첫날.getDate() - (창 - 1));
  const 처음 = 날짜꼴(첫날); const 끝 = 날짜꼴(끝날);

  const 열람 = async (제목) => {
    try {
      const r = await fetch(열람주소(제목, 처음, 끝), { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30000) });
      if (r.status === 404) return null;          /* 문서가 없다 — 0 이 아니다 */
      if (!r.ok) return null;
      const j = await r.json();
      return (j.items || []).reduce((a, x) => a + (x.views || 0), 0);
    } catch (e) { return null; }
  };

  const 결과 = [];
  for (let i = 0; i < 잴수있는것.length; i++) {
    const x = 잴수있는것[i];
    const 각색수 = await 열람(x.각색en);
    await new Promise((s) => setTimeout(s, 200));
    const 원작수 = await 열람(x.원작en);
    await new Promise((s) => setTimeout(s, 200));
    결과.push({ ...x, 각색열람: 각색수, 원작열람: 원작수, ...어느쪽이(원작수, 각색수) });
    if ((i + 1) % 20 === 0) console.log(`   … ${i + 1}/${잴수있는것.length}`);
  }

  /* 🔴 [2026-09-07] 여기가 빠져 있었다 — 지면이 읽는 칸을 «이 자»가 만들어야 한다.
     원작마다 P495(원산국)·P136(갈래)을 한 번 더 묻는다. VALUES 로 한꺼번에 묻는다.
     ⚠ 못 물으면 «붙이지 않는다». 0 도 빈 목록도 아니다 — 그러면 지면이 「모름」으로 낸다. */
  const QID들 = [...new Set(결과.map((x) => x.원작QID).filter(Boolean))];
  if (QID들.length) {
    console.log(`\n■ 원작 ${QID들.length}개의 국적·갈래를 다시 묻는다 (P495 · P136)`);
    const 나라 = new Map(); const 갈래 = new Map();
    const 한칸 = 120;
    for (let i = 0; i < QID들.length; i += 한칸) {
      const 묶음 = QID들.slice(i, i + 한칸).map((q) => `wd:${q}`).join(' ');
      const q2 = `SELECT ?s ?cLabel ?gLabel WHERE {
        VALUES ?s { ${묶음} }
        OPTIONAL { ?s wdt:P495 ?c }
        OPTIONAL { ?s wdt:P136 ?g }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
      }`;
      const r2 = await 물음(q2);
      if (!r2) { console.log('   🔴 못 물었다 — 이 묶음은 «모름»으로 둔다. 0 으로 안 채운다'); continue; }
      for (const b of r2) {
        const id = 큐아이디(b.s?.value);
        if (!id) continue;
        if (b.cLabel?.value) { if (!나라.has(id)) 나라.set(id, new Set()); 나라.get(id).add(b.cLabel.value); }
        if (b.gLabel?.value) { if (!갈래.has(id)) 갈래.set(id, new Set()); 갈래.get(id).add(b.gLabel.value); }
      }
    }
    for (const x of 결과) {
      const n = x.원작QID ? 나라.get(x.원작QID) : null;
      const g = x.원작QID ? 갈래.get(x.원작QID) : null;
      if (n) x.원작나라 = [...n];
      if (g) x.원작갈래 = [...g];
      x.한국원작 = 한국것인가(x.원작나라);
    }
    const 붙은 = 결과.filter((x) => Array.isArray(x.원작나라) && x.원작나라.length).length;
    console.log(`   국적이 붙은 원작 ${붙은}개 / ${결과.length}개 — 나머지는 «모름»이다`);
  }

  결과.sort((a, b) => (b.각색열람 ?? -1) - (a.각색열람 ?? -1));
  const 잰것 = 결과.filter((x) => x.판정 !== '못 잼');
  const 각색이김 = 잰것.filter((x) => x.판정 === '각색').length;
  const 원작이김 = 잰것.filter((x) => x.판정 === '원작').length;

  console.log(`\n■ 잰 것 ${잰것.length}쌍 · 못 잰 것 ${결과.length - 잰것.length}쌍`);
  console.log(`   각색이 더 읽힌 것 ${각색이김}쌍 · 원작이 더 읽힌 것 ${원작이김}쌍`);
  console.log('\n■ 각색이 가장 많이 읽힌 열 편 (지난 30일 · 사람 트래픽)');
  for (const x of 결과.filter((y) => y.각색열람 != null).slice(0, 10)) {
    console.log(`   ${String(x.각색열람).padStart(8)}  ${String(x.각색en).slice(0, 34).padEnd(35)} ← ${String(x.원작en).slice(0, 26)} (${x.원작열람 ?? '못 잼'})`);
  }

  const 낼것 = {
    잰때: 잰때영어(),
    창: `${처음}~${끝} (30일 · 영문 위키 · 사람 트래픽만)`,
    우물: 'Wikidata SPARQL (P144 based on · P31/P279* Q1004 comic · P495 Q884 South Korea) + Wikimedia Pageviews',
    받은짝: 것들.length, 잴수있는것: 잴수있는것.length, 잰것: 잰것.length,
    각색이김, 원작이김,
    못잰것: 결과.length - 잰것.length,
    /* 🔴 지면이 이 두 칸을 «반드시» 읽는다. 빠지면 /webtoon-adaptations 가 터진다 */
    국적으로가른것: 국적으로가르기(결과),
    국적붙은것: 결과.filter((x) => Array.isArray(x.원작나라) && x.원작나라.length).length,
    rows: 결과,
  };
  const 낼곳 = path.join(뿌리, 'src', 'data', 'kcw-webtoon-adaptations.json');
  /* 🔴 [2026-09-07] **내보내기 전에 세운다.** 오늘 이 자가 두 칸을 빼고 덮어써서
     지면이 터지고 세 사이트 배포가 막혔다. 다시는 «모자란 자료를 덮어쓰지 않는다». */
  const 있어야할칸 = ['국적으로가른것', '국적붙은것', 'rows', '잰것', '각색이김', '원작이김'];
  const 빠진칸 = 있어야할칸.filter((k) => 낼것[k] === undefined || 낼것[k] === null);
  if (빠진칸.length) {
    console.error(`🔴 지면이 읽는 칸이 빠졌다 — ${빠진칸.join(' · ')}`);
    console.error('   ⛔ 있는 자료를 덮어쓰지 않고 멈춘다. 모자란 자료로 덮으면 지면이 터진다.');
    process.exit(1);
  }
  if (!낼것.국적으로가른것?.한국원작 || 낼것.국적으로가른것.한국원작.짝 === undefined) {
    console.error('🔴 국적으로가른것.한국원작.짝 이 없다 — 지면이 그 값을 바로 읽는다. 멈춘다.');
    process.exit(1);
  }
  fs.writeFileSync(낼곳, JSON.stringify(낼것, null, 2) + '\n');
  console.log(`\n✅ 냈다 — ${path.relative(뿌리, 낼곳)}`);
  console.log('⛔ 「못 잼」은 0 이 아니다 — 영문 위키 문서가 없거나 열람 기록이 없는 것이다.');
}

/**
 * ── 자가시험 ────────────────────────────────────────────────────────
 * ⛔ 이 자에는 `--시험만` 이 «없었다». 그런데 나는 그것을 붙여 「시험만 돈다」고 믿었고,
 *   자는 조용히 «진짜 수집»을 돌려 자료를 덮었다(2026-09-07 17:06).
 *   send-mail.mjs 가 9/03 에 `--첨부` 로 똑같이 당했다 —
 *   **모르는 깃발을 조용히 버리는 자는 「시험」이 「실행」이 된다.**
 * ✅ 그래서 시험을 붙이고, 모르는 깃발은 «거부»한다.
 */
export function 자가시험() {
  let 통 = 0; let 흠 = 0;
  const 봐 = (이름, 참) => { if (참) { 통++; console.log(`  ✅ ${이름}`); } else { 흠++; console.log(`  🔴 ${이름}`); } };

  봐('주소에서 QID 를 뽑는다', 큐아이디('http://www.wikidata.org/entity/Q1004') === 'Q1004');
  봐('⛔ 못 읽으면 null 이다 — 빈 글자가 아니다', 큐아이디('그냥글자') === null && 큐아이디(null) === null);

  봐('한국이면 참', 한국것인가(['South Korea']) === true);
  봐('여럿 중에 한국이 있어도 참', 한국것인가(['Japan', 'South Korea']) === true);
  봐('남의 것이면 거짓', 한국것인가(['Japan']) === false);
  봐('⛔ 국적이 안 달렸으면 «모름»(null) 이다 — 거짓이 아니다', 한국것인가([]) === null && 한국것인가(null) === null);

  const 줄 = [
    { 판정: '각색', 배수: 10, 한국원작: true },
    { 판정: '각색', 배수: 20, 한국원작: true },
    { 판정: '원작', 배수: 2, 한국원작: true },
    { 판정: '각색', 배수: 4, 한국원작: false },
    { 판정: '원작', 배수: 3, 한국원작: false },
    { 판정: '각색', 배수: 99, 한국원작: null },
    { 판정: '못 잼', 배수: null, 한국원작: true },
  ];
  const g = 국적으로가르기(줄);
  봐('한국 원작 짝을 센다 (못 잼은 빼고)', g.한국원작.짝 === 3);
  봐('각색우세·원작우세를 나눈다', g.한국원작.각색우세 === 2 && g.한국원작.원작우세 === 1);
  봐('배수 중앙값을 낸다', g.한국원작.배수중앙값 === 10);
  봐('남의 원작도 따로 센다', g.남의원작.짝 === 2);
  봐('⛔ «모름»을 어느 쪽에도 안 넣는다', g.국적을모름 === 1 && g.한국원작.짝 + g.남의원작.짝 === 5);
  봐('주의 글월을 함께 낸다', /P495/.test(g.주의));
  봐('빈 목록이면 0 이고 중앙값은 null', 국적으로가르기([]).한국원작.짝 === 0 && 국적으로가르기([]).한국원작.배수중앙값 === null);
  봐('목록이 아니어도 안 터진다', 국적으로가르기(null).한국원작.짝 === 0);

  /* 🔴 지면이 실제로 읽는 칸이 다 나오나 — 이것이 오늘 터진 자리다 */
  봐('🔴 지면이 읽는 칸 넷이 다 있다', ['한국원작', '남의원작', '국적을모름', '주의'].every((k) => k in g));

  console.log(`\n웹툰 각색 수집기 — 자가시험 ${통}가지 통과 · ${흠}가지 실패`);
  if (흠) process.exit(1);
  return 통;
}
