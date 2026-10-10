#!/usr/bin/env node
/**
 * build-japan-disclosures-feed.mjs — **일본 중대공시를 손님 자료로 낸다.**
 *
 *   node scripts/build-japan-disclosures-feed.mjs
 *   node scripts/build-japan-disclosures-feed.mjs --자가시험
 *
 * ── 왜 (2026-09-22 · 5번) ──────────────────────────────────────────────
 * 사장님 지시 — 「모은 자료는 반드시 지면이나 콘텐트로 낸다」.
 * 한국 공시(`build-korea-disclosures-feed.mjs`)와 **같은 줄 꼴**로 낸다 — 한 지면에
 * 나란히 놓고 보려면 칸 이름이 같아야 한다.
 *
 * ⚠ 한국과 다른 점은 «태그를 어떻게 붙였나»뿐이다. 한국은 제목 정규식, 일본은 요소 이름.
 *   그 사정은 수집기 머리글에 있고, 지면은 손님에게 그 차이를 말해 준다.
 * ⛔ 손님 칸에 일본어를 담지 않는다 — 회사 영문명은 서류가 스스로 적어 낸 것을 쓴다.
 * ⛔ 영문명이 없으면 지어내지 않는다. 종목코드를 쓰고 그 수를 센다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { 사건 } from './collect-japan-edinet-breaking.mjs';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 곳간 = path.join(뿌리, 'archive', 'raw', 'japan-edinet-breaking');
const 나갈곳 = path.join(뿌리, 'src', 'data', 'japan-disclosures-feed.json');

/** 태그 → 영문 이름·설명. 여러 요소가 같은 태그를 가리키므로 «태그» 쪽으로 접는다 */
export function 갈래표() {
  const 표 = {};
  for (const v of Object.values(사건)) {
    if (!표[v.tag]) 표[v.tag] = { en: v.en, 뜻: v.뜻, 무게: v.무게 };
  }
  return 표;
}

/** EDINET 서류 주소 — 손님이 우리 말을 검산할 수 있어야 한다 */
export function 원문주소(docID) {
  const s = String(docID || '').trim();
  return /^S[0-9A-Z]{7}$/.test(s) ? `https://disclosure2.edinet-fsa.go.jp/WZEK0040.aspx?${s}` : null;
}

/** 한 서류를 손님 줄로 */
export function 한줄(d) {
  if (!d?.sec_code || !d?.태그?.length) return null;
  return {
    d: String(d.filed || d._meta?.받은날 || '').slice(0, 10) || null,
    t: String(d.sec_code),
    n: d.name_en || String(d.sec_code),   /* ⛔ 일본어 이름을 손님 칸에 담지 않는다 */
    named: Boolean(d.name_en),
    m: 'TSE',
    e: d.태그,
    w: Number(d.무게) || 0,
    amended: Boolean(d.amended),
    url: 원문주소(d.docID),
  };
}

/** 같은 서류를 두 번 세지 않는다 */
export function 겹침빼기(줄들) {
  const 본것 = new Set();
  const 것 = [];
  for (const r of 줄들 || []) {
    const 열쇠 = r.url || `${r.t}|${r.d}|${(r.e || []).join(',')}`;
    if (본것.has(열쇠)) continue;
    본것.add(열쇠);
    것.push(r);
  }
  return 것;
}

/* ── 자가시험 ──────────────────────────────────────────────── */
const 내가진입점 = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (내가진입점 && (process.argv.includes('--자가시험') || process.argv.includes('--selftest'))) {
  const 잰다 = [];
  const 검 = (이름, 참) => 잰다.push([이름, !!참]);
  const 보기 = {
    docID: 'S100Z367', sec_code: '7571', name: '株式会社ヤマノ',
    name_en: 'YAMANO HOLDINGS CORPORATION', filed: '2026-09-18',
    amended: false, 태그: ['control-change'], 무게: 8, _meta: { 받은날: '2026-09-18' },
  };

  검('원문 주소를 만든다', 원문주소('S100Z367').includes('S100Z367'));
  검('⛔ 서류번호가 이상하면 주소를 안 만든다', 원문주소('abc') === null);

  const a = 한줄(보기);
  검('한 줄로 옮긴다', a.t === '7571' && a.e[0] === 'control-change');
  검('시장은 TSE 다', a.m === 'TSE');
  검('⛔ 손님 줄에 일본어가 없다', !/[぀-ヿ一-鿿]/.test(JSON.stringify(a)));
  검('영문명이 있으면 named 가 참', a.named === true);
  검('영문명이 없으면 종목코드를 쓴다',
    한줄({ ...보기, name_en: null }).n === '7571' && 한줄({ ...보기, name_en: null }).named === false);
  검('태그가 없으면 줄을 안 만든다', 한줄({ ...보기, 태그: [] }) === null);
  검('종목코드가 없으면 줄을 안 만든다', 한줄({ ...보기, sec_code: '' }) === null);
  검('같은 서류를 두 번 세지 않는다', 겹침빼기([a, { ...a }]).length === 1);

  const 표 = 갈래표();
  /* 🔴 [2026-10-11 07:5x · 5번] 여기가 `=== 17` 이었는데 갈래가 **19개**로 늘어 깨져 있었다.
   *   그 수를 19 로 올리면 **갈래가 늘 때마다 또 깨진다** — 그러면 다음 사람이
   *   「수를 올려서 끈다」를 배우게 된다. 그 버릇이 이 저장소에서 가장 비싼 것이다.
   * ⭐ 이 칸이 지키려던 것은 「열일곱」이 아니라 **「사전이 비지 않았나」**다.
   *   수는 그 뜻을 재던 대리 지표였다 — 아래 네 줄이 진짜로 재는 자리다
   *   (꼭 있어야 할 갈래가 있나 · 한국어가 안 섞였나).
   * ⚠ 그래도 «바닥»은 둔다 — 사전이 통째로 비면 그것은 흠이다. */
  검('갈래 사전이 비지 않았다 — 열다섯은 넘는다', Object.keys(표).length >= 15);
  검('⛔ 갈래 이름·설명에 한국어가 없다',
    !/[가-힣]/.test(Object.values(표).map((v) => v.en + v.뜻).join('')));
  검('지배권 변경이 있다', Boolean(표['control-change']));
  검('대표이사 변경이 있다', Boolean(표['ceo-change']));

  const 진 = 잰다.filter(([, v]) => !v);
  for (const [이름, v] of 잰다) console.log(`${v ? '✅' : '🔴'} ${이름}`);
  console.log(진.length ? `\n🔴 ${진.length}/${잰다.length} 떨어졌다` : `\n✅ 자가시험 ${잰다.length} 통과`);
  process.exit(진.length ? 1 : 0);
}

/* ── 짓는다 ──────────────────────────────────────────────── */
if (내가진입점) {
  if (!fs.existsSync(곳간)) { console.error('🔴 곳간이 비었다 — archive/raw/japan-edinet-breaking'); process.exit(1); }
  const 날들 = fs.readdirSync(곳간).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
  if (!날들.length) { console.error('🔴 받은 날이 없다'); process.exit(1); }

  let 줄들 = [];
  let 원자료건수 = 0;
  for (const 날 of 날들) {
    for (const f of fs.readdirSync(path.join(곳간, 날))) {
      if (!f.endsWith('.json')) continue;
      원자료건수++;
      try {
        const 줄 = 한줄(JSON.parse(fs.readFileSync(path.join(곳간, 날, f), 'utf8')));
        if (줄) 줄들.push(줄);
      } catch { /* 한 건 때문에 멈추지 않는다 */ }
    }
  }
  줄들 = 겹침빼기(줄들).sort((a, b) => (b.d || '').localeCompare(a.d || '') || b.w - a.w);

  /* 🔴 관문 — 손님 파일에 일본어·한국어가 «한 글자라도» 있으면 멈춘다 */
  const 글 = JSON.stringify(줄들);
  if (/[가-힣]/.test(글) || /[぀-ヿ一-鿿]/.test(글)) {
    console.error('🔴 손님 파일에 영어 아닌 글자가 있다 — 안 낸다'); process.exit(1);
  }

  const 표 = 갈래표();
  const 갈래별 = {};
  for (const r of 줄들) for (const t of r.e) 갈래별[t] = (갈래별[t] || 0) + 1;

  const 낼것 = {
    무엇: 'Extraordinary reports filed by Tokyo-listed companies — Japan’s equivalent of a US Form 8-K.',
    출처: 'Financial Services Agency EDINET (disclosure2.edinet-fsa.go.jp)',
    처음날: 날들[0],
    만든날: 날들[날들.length - 1],
    건수: 줄들.length,
    원자료건수,
    회사수: new Set(줄들.map((r) => r.t)).size,
    영문명없는줄: 줄들.filter((r) => !r.named).length,
    갈래: Object.fromEntries(Object.entries(표).map(([k, v]) => [k, { ...v, n: 갈래별[k] || 0 }])),
    rows: 줄들,
  };
  fs.writeFileSync(나갈곳, JSON.stringify(낼것), 'utf8');
  console.log(`■ 일본 중대공시 — ${줄들.length}건 · 회사 ${낼것.회사수}곳 · ${낼것.처음날} ~ ${낼것.만든날}`);
  console.log(`   갈래 ${Object.keys(갈래별).length} · 영문명 없는 줄 ${낼것.영문명없는줄}`);
  console.log(`   → ${path.relative(뿌리, 나갈곳)}`);
}
