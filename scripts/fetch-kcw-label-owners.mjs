#!/usr/bin/env node
/**
 * fetch-kcw-label-owners.mjs — **음반사 195곳의 «모회사와 상장 티커»를 위키데이터에서 받는다.**
 * (5번 · 2026-09-04)
 *
 * ── 왜 이 자가 생겼나 ────────────────────────────────────────
 * 6번이 K팝 기획사 넷의 재무를 모으면서 「5번↔6번 교차링크」를 물어 왔다. 억지 링크 대신
 * 겹치는 주제(기획사)를 찾아 P264(음반사)를 받았고, 사람 1,044명 · 음반사 195곳이 나왔다.
 *
 * 🔴 **그 수를 보자마자 덫이 보였다.**
 * ```
 * SM Entertainment   133명
 * YG Entertainment   101명
 * JYP Entertainment   70명
 * Big Hit Music        21명   ← ⚠ 이것을 「HYBE 는 작다」로 읽으면 통째로 틀린다
 * Pledis Entertainment 44명   ← HYBE 하위 레이블이다
 * ```
 * HYBE 아티스트는 **하위 레이블 여러 곳으로 흩어져** 있다. 레이블 이름으로 세면
 * 상장사 HYBE 의 크기가 실제보다 훨씬 작게 나온다.
 *
 * ⛔ **그 소유 관계를 내가 «알고 있다»고 적지 않는다.** 널리 알려진 사실이라도
 *   우리 강령 ①은 「」다. 그래서 **위키데이터에서 받는다.**
 *
 * ── 무엇을 받나 ─────────────────────────────────────────────
 *   P749 모회사(parent organization)      레이블 → 상장 모회사
 *   P127 소유자(owned by)                 P749 가 없을 때의 대안
 *   P414 상장 거래소(stock exchange)      상장돼 있나
 *   P249 티커(ticker symbol)              6번이 재무와 이을 열쇠
 *
 * ⛔ 없는 것은 **「미확인」**으로 남긴다. 0 이나 빈 문자열로 채우지 않는다.
 * ⛔ 모회사를 «한 단계»만 받는다. HYBE 위에 또 무엇이 있는지는 이 자가 말하지 않는다.
 *
 * 쓰는 법  node scripts/fetch-kcw-label-owners.mjs --자가시험
 *          node scripts/fetch-kcw-label-owners.mjs --잰다
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 원자료 = path.join(뿌리, 'archive/raw/wikidata/korean-entertainers-roles.json');
const 낼길 = path.join(뿌리, 'archive/raw/wikidata/kpop-label-owners.json');

const 끝점 = 'https://query.wikidata.org/sparql';
const 머리 = { 'user-agent': 'KCultureWire/1.0 (parkintaek2@gmail.com)' };

/* ── 판단하는 함수들. 여기만 자가시험한다 ────────────────────── */

/** 사람 자료에서 «음반사 Q번호 → 이름 · 사람수»를 모은다 */
export function 음반사모으기(사람) {
  const 표 = new Map();
  for (const v of Object.values(사람 ?? {})) {
    if (!Array.isArray(v?.음반사)) continue;
    for (const x of v.음반사) {
      if (!x || typeof x.q !== 'string') continue;
      const it = 표.get(x.q) ?? { q: x.q, 이름: null, 사람수: 0 };
      it.사람수 += 1;
      if (!it.이름 && x.이름) it.이름 = x.이름;
      표.set(x.q, it);
    }
  }
  return [...표.values()].sort((a, b) => b.사람수 - a.사람수);
}

export function 물음짓기(q들) {
  const values = q들.map((q) => `wd:${q}`).join(' ');
  return `SELECT ?c ?parent ?parentLabel ?owner ?ownerLabel ?exch ?exchLabel ?ticker WHERE {
  VALUES ?c { ${values} }
  OPTIONAL { ?c wdt:P749 ?parent }
  OPTIONAL { ?c wdt:P127 ?owner }
  OPTIONAL { ?c wdt:P414 ?exch }
  OPTIONAL { ?c p:P414/pq:P249 ?ticker }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}`;
}

/** Q숫자가 이름 자리에 오면 «이름을 모르는 것»이다. ⛔ Q를 이름으로 쓰지 않는다 */
export function 이름만(라벨) {
  const v = 라벨?.value ?? null;
  if (!v || /^Q[0-9]+$/.test(v)) return null;
  return v;
}

/**
 * 한 레이블의 «최종 소속»을 정한다.
 * ⛔ 모회사가 없으면 «자기 자신»이라고 단정하지 않는다 — 「미확인」이다.
 *   자기 자신으로 두면 「독립 레이블」과 「모회사를 우리가 모르는 레이블」이 한 칸이 된다.
 */
export function 소속정하기(것) {
  /**
   * 🔴 [2026-09-04 20:4x] **처음 쓴 규칙이 회사를 «사람 이름» 아래로 묶었다.**
   *   ────────────────────────────────────────────────────────────────
   *   돌려 보니 이렇게 나왔다 —
   *     「70명 · [035900] **J.Y. Park**」  ← 레이블은 JYP Entertainment 다
   *   까닭: `P127 소유자` 가 **회사가 아니라 사람**(박진영)을 가리킨다.
   *   그런데 티커 035900 은 «JYP Entertainment 자기 것»이다 — 그 레이블이 곧 상장사다.
   *
   *   ⛔ 이대로 6번에게 넘기면 6번이 재무를 «사람 이름»에 붙이려 한다. 그것이 사고다.
   *   ✅ 그래서 규칙을 하나 앞에 둔다 —
   *     **레이블이 자기 티커를 갖고 있으면 그 레이블이 곧 상장 주체다. 남 아래로 묶지 않는다.**
   *   ⚠ 이 규칙은 「사람인지 회사인지」를 내가 판정하지 않는다. 티커라는 «사실»로 가른다.
   *     사람은 티커가 없다. 그것이 이 규칙이 정직한 까닭이다.
   */
  if (것?.티커) return { 소속: 것.이름 ?? null, 근거: '자기 티커가 있다 — 이 레이블이 곧 상장 주체다' };
  if (것?.모회사이름) return { 소속: 것.모회사이름, 근거: 'P749 모회사' };
  if (것?.소유자이름) {
    return {
      소속: 것.소유자이름,
      /* ⚠ P127 은 사람일 수 있다. 그것을 감추지 않고 근거에 적어 둔다 */
      근거: 'P127 소유자 — ⚠ 사람일 수 있다. 재무에 붙이기 전에 회사인지 확인하십시오',
    };
  }
  return { 소속: null, 근거: '⬜ 위키데이터에 모회사·소유자가 안 적혀 있다 — 독립인지 미확인인지 못 가린다' };
}

/* ── 자가시험 ─────────────────────────────────────────────── */
if (process.argv.includes('--자가시험')) {
  let 통 = 0; let 실 = 0;
  const 참 = (이름, 값) => { if (값) 통 += 1; else { 실 += 1; console.log(`   🔴 ${이름}`); } };

  const 사람 = {
    A: { 음반사: [{ q: 'Q1', 이름: 'SM Entertainment' }] },
    B: { 음반사: [{ q: 'Q1', 이름: 'SM Entertainment' }, { q: 'Q2', 이름: 'Big Hit Music' }] },
    C: { 갈래: '연기' },
    D: { 음반사: [] },
  };
  const 모은것 = 음반사모으기(사람);
  참('음반사 둘을 모은다', 모은것.length === 2);
  참('사람 수를 센다', 모은것[0].q === 'Q1' && 모은것[0].사람수 === 2);
  참('많은 순으로 세운다', 모은것[0].사람수 >= 모은것[1].사람수);
  참('이름을 살린다', 모은것[0].이름 === 'SM Entertainment');
  참('⛔ 음반사가 없는 사람은 안 센다', !모은것.some((x) => x.q === undefined));
  참('⛔ 빈 값에도 안 죽는다', 음반사모으기(null).length === 0);
  참('⛔ q 가 없는 줄은 버린다', 음반사모으기({ X: { 음반사: [{ 이름: '이름만' }] } }).length === 0);

  참('물음에 P749 가 있다', /wdt:P749/.test(물음짓기(['Q1'])));
  참('물음에 P127 이 있다', /wdt:P127/.test(물음짓기(['Q1'])));
  참('물음에 거래소와 티커가 있다',
    /wdt:P414/.test(물음짓기(['Q1'])) && /pq:P249/.test(물음짓기(['Q1'])));
  참('VALUES 로 묶는다', 물음짓기(['Q1', 'Q2']).includes('VALUES ?c { wd:Q1 wd:Q2 }'));

  참('이름을 꺼낸다', 이름만({ value: 'HYBE' }) === 'HYBE');
  참('⭐ Q숫자는 이름이 아니다', 이름만({ value: 'Q12345' }) === null);
  참('빈 값은 없는 것', 이름만(null) === null && 이름만({}) === null);

  참('모회사가 있으면 그것이 소속',
    소속정하기({ 모회사이름: 'HYBE' }).소속 === 'HYBE');
  참('모회사가 없으면 소유자로 간다',
    소속정하기({ 소유자이름: 'CJ ENM' }).소속 === 'CJ ENM');
  참('⭐ 모회사가 P749 면 근거에 P749 를 적는다',
    소속정하기({ 모회사이름: 'HYBE' }).근거.includes('P749'));
  참('🔴 둘 다 없으면 «자기 자신»이 아니라 미확인이다',
    소속정하기({}).소속 === null);
  참('미확인일 때 까닭을 적는다', 소속정하기({}).근거.includes('못 가린다'));
  참('⛔ 빈 값에도 안 죽는다', 소속정하기(null).소속 === null);

  /**
   * 🔴 [2026-09-04 20:4x] 실제로 겪은 것을 굳힌다 — JYP Entertainment 가 사람 이름
   *   「J.Y. Park」 아래로 묶여 나왔다. P127 소유자가 회사가 아니라 사람이었다.
   */
  참('⭐ 자기 티커가 있으면 남 아래로 안 묶인다 (JYP 건)',
    소속정하기({ 이름: 'JYP Entertainment', 티커: '035900', 소유자이름: 'J.Y. Park' }).소속 === 'JYP Entertainment');
  참('그때 근거에 «자기 티커»가 적힌다',
    소속정하기({ 이름: 'JYP Entertainment', 티커: '035900' }).근거.includes('자기 티커'));
  참('⭐ 티커가 있어도 모회사보다 자기가 앞선다',
    소속정하기({ 이름: 'SM Entertainment', 티커: '041510', 모회사이름: 'Kakao' }).소속 === 'SM Entertainment');
  참('티커가 없으면 모회사로 묶인다 (Big Hit → HYBE 건)',
    소속정하기({ 이름: 'Big Hit Music', 모회사이름: 'Hybe' }).소속 === 'Hybe');
  참('⚠ P127 로 묶을 때는 «사람일 수 있다»를 근거에 적는다',
    소속정하기({ 이름: 'X', 소유자이름: '누군가' }).근거.includes('사람일 수 있다'));

  console.log(`\n음반사 모회사를 받는 자 — 자가시험 ${통} 통과 · ${실} 실패`);
  process.exit(실 ? 1 : 0);
}

/* ── 실제로 받는다 ────────────────────────────────────────── */
if (process.argv.includes('--잰다')) {
  if (!fs.existsSync(원자료)) { console.log('🔴 사람 자료가 없다 — 먼저 fetch-kcw-entertainer-roles.mjs --잰다'); process.exit(1); }
  const 사람 = JSON.parse(fs.readFileSync(원자료, 'utf8')).사람 ?? {};
  const 음반사들 = 음반사모으기(사람);
  console.log(`음반사 ${음반사들.length}곳 · 사람 ${음반사들.reduce((a, b) => a + b.사람수, 0)}명분`);
  if (!음반사들.length) { console.log('⬜ 음반사 칸이 없다 — 못 쟀다'); process.exit(0); }

  const 결과 = new Map(음반사들.map((x) => [x.q, { ...x }]));
  const 묶음 = 100;
  let 못받은 = 0;
  for (let i = 0; i < 음반사들.length; i += 묶음) {
    const 조각 = 음반사들.slice(i, i + 묶음).map((x) => x.q);
    let j = null;
    for (let 번 = 0; 번 < 3 && !j; 번 += 1) {
      /* eslint-disable no-await-in-loop */
      try {
        const r = await fetch(`${끝점}?format=json&query=${encodeURIComponent(물음짓기(조각))}`, { headers: 머리 });
        if (!r.ok) throw new Error(`위키데이터 ${r.status}`);
        j = await r.json();
      } catch (e) {
        console.log(`  ⚠ ${i}~ 묶음 ${번 + 1}번째 실패 — ${e.message}`);
        await new Promise((f) => setTimeout(f, 3000 * (번 + 1)));
      }
    }
    if (!j) { 못받은 += 조각.length; continue; }
    for (const b of j.results.bindings) {
      const q = b.c.value.split('/').pop();
      const it = 결과.get(q);
      if (!it) continue;
      if (b.parent) { it.모회사q = b.parent.value.split('/').pop(); it.모회사이름 = 이름만(b.parentLabel) ?? it.모회사이름 ?? null; }
      if (b.owner) { it.소유자q = b.owner.value.split('/').pop(); it.소유자이름 = 이름만(b.ownerLabel) ?? it.소유자이름 ?? null; }
      if (b.exch) it.거래소 = 이름만(b.exchLabel) ?? it.거래소 ?? null;
      if (b.ticker) it.티커 = b.ticker.value;
    }
    await new Promise((f) => setTimeout(f, 400));
  }

  const 항목 = [...결과.values()].map((x) => ({ ...x, ...소속정하기(x) }));

  /* 소속별로 사람을 다시 모은다 — ⭐ 이것이 6번에게 넘길 표다 */
  const 소속별 = new Map();
  for (const x of 항목) {
    const 이름 = x.소속 ?? x.이름 ?? `⬜ ${x.q}`;
    const it = 소속별.get(이름) ?? { 소속: 이름, 레이블수: 0, 사람수: 0, 레이블들: [], 티커: null, 거래소: null };
    it.레이블수 += 1; it.사람수 += x.사람수;
    it.레이블들.push({ 이름: x.이름, 사람수: x.사람수, 근거: x.근거 });
    if (!it.티커 && x.티커) { it.티커 = x.티커; it.거래소 = x.거래소; }
    소속별.set(이름, it);
  }
  const 소속목록 = [...소속별.values()].sort((a, b) => b.사람수 - a.사람수);

  fs.writeFileSync(낼길, JSON.stringify({
    /* ⛔ toISOString 은 UTC 다 — 우리 시각은 KST 다 */
    잰때: new Date().toLocaleString('ko-KR'),
    출처: 'Wikidata SPARQL — P264(음반사) · P749(모회사) · P127(소유자) · P414(거래소) · P249(티커)',
    '⛔아닌것': [
      '「이 레이블이 이 회사 것이다」를 우리가 판정한 것이 아니다. 위키데이터에 적힌 것을 옮겼다.',
      '모회사를 한 단계만 받았다. 그 위에 또 무엇이 있는지는 이 자료가 말하지 않는다.',
      '음반사(P264)는 소속 기획사와 «늘 같지 않다». 계약 관계가 아니라 음반을 낸 곳이다.',
      '사람 수는 위키데이터에 음반사가 적힌 사람만 센 것이다 — 소속 아티스트 전체가 아니다.',
    ],
    셈: {
      음반사수: 항목.length,
      사람수: 항목.reduce((a, b) => a + b.사람수, 0),
      모회사가적힌곳: 항목.filter((x) => x.소속).length,
      모회사가안적힌곳: 항목.filter((x) => !x.소속).length,
      티커가적힌곳: 항목.filter((x) => x.티커).length,
      못받은곳: 못받은,
    },
    소속별: 소속목록,
    음반사별: 항목,
  }, null, 1));

  console.log(`\n모회사가 적힌 곳 ${항목.filter((x) => x.소속).length} · 안 적힌 곳 ${항목.filter((x) => !x.소속).length} · 티커가 적힌 곳 ${항목.filter((x) => x.티커).length}`);
  if (못받은) console.log(`⚠ 못 받은 곳 ${못받은}곳 — 「미확인」과 다르다`);
  console.log('\n⭐ 소속으로 다시 모은 상위 12곳 (6번에게 넘길 표)');
  for (const x of 소속목록.slice(0, 12)) {
    console.log(`  ${String(x.사람수).padStart(4)}명  레이블 ${String(x.레이블수).padStart(2)}곳  ${x.티커 ? `[${x.티커}] ` : ''}${x.소속}`);
  }
  console.log(`\n냈다 — ${path.relative(뿌리, 낼길)}`);
  console.log('⚠ 6번께 — 이 표의 사람 수는 «위키데이터에 음반사가 적힌 사람»만입니다. 소속 전체가 아닙니다.');
}
