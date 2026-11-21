#!/usr/bin/env node
/**
 * 뽑는다-고유어와-한자어짝.mjs
 *   — 국립국어원 표준국어대사전에서 **고유어 표제어와 그 한자어 짝**을 뽑는다.
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔴🔴 사장님 2026-11-22 —
 *   「**순한글사전은 네가 만든 목록이 아니고 국립국어원의 우리말사전 등 순한글사전이야.
 *     너 주제에 무슨 우리나라 순한글 사전을 만들었다고 건방진 마음을 가지나**」
 *   2026-11-15 — 「순한글 등록 아닌 근본 대책을 세워. 순한글 사전을 찾던지,
 *                 국립국어원이나 한글학회에서 순한글 관련 데이터를 찾던지 해」
 *
 * [왜 만드나]
 *   우리가 겪으며 적어 온 금지어 목록은 316개뿐이고, 그것은 **사전이 아니다.**
 *   표준국어대사전에는 표제어마다 어종(고유어·한자어·외래어·혼종어)이 들어 있다.
 *   그 자료로 판정하면 **등록하지 않아도** 고유어인지 알 수 있다.
 *
 * [실제 자료 구조 — 열어 보고 적는다]
 *   <item><word_info>
 *     <word><![CDATA[날-마다]]></word>      ← CDATA 다. 붙임표가 들어 있다
 *     <word_type>고유어</word_type>
 *     <pos_info><pos>명사</pos>
 *       <comm_pattern_info><sense_info>
 *         <lexical_info><word><![CDATA[매일]]></word><type>동의어</type></lexical_info>
 *   🔴 비슷한말 쪽에는 **어종이 없다.** 그래서 두 번 훑는다 —
 *     ① 사전 전체에서 「말 → 어종」 표를 만든다
 *     ② 고유어 표제어의 동의어를 그 표로 판정한다
 *
 * [무엇을 뽑나]
 *   어종이 「고유어」인 표제어 가운데, 동의어에 「한자어」가 있는 것.
 *   ⇒ 짝이 없으면 바꿀 길이 없으므로 막아도 쓸 말이 없다. 짝이 있는 것만 올린다.
 *
 * ⛔ 받은 사전은 바깥에서 온 자료다. 저장소에 넣지 않는다 — 간추린 표만 넣는다.
 * ⛔ 품사가 조사·어미·접사인 것은 뺀다. 바꿀 수 있는 낱말이 아니다.
 *
 * 쓰는 법
 *   node scripts/뽑는다-고유어와-한자어짝.mjs <사전폴더> <낼파일>
 *   node scripts/뽑는다-고유어와-한자어짝.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';

/** CDATA 와 붙임표·어깨번호를 걷어 낸 낱말 */
export function 다듬는다(날것) {
  return String(날것 ?? '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/[-^·\s]/g, '')
    .replace(/\d+$/, '')
    .trim();
}

/** XML 한 조각에서 표제어 항목을 끊어 낸다 */
export function 항목들(글) {
  const 것 = [];
  const 재 = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = 재.exec(String(글 ?? '')))) 것.push(m[1]);
  return 것;
}

/** 항목의 «표제어» 와 어종 — word_info 바로 아래 것만 본다 */
export function 표제어(항목) {
  const 덩이 = (/<word_info>([\s\S]*?)<\/word_info>/.exec(String(항목 ?? '')) || [])[1] || String(항목 ?? '');
  const 말 = 다듬는다((/<word>([\s\S]*?)<\/word>/.exec(덩이) || [])[1] || '');
  const 어종 = ((/<word_type>([\s\S]*?)<\/word_type>/.exec(덩이) || [])[1] || '').trim();
  const 품사 = ((/<pos>([\s\S]*?)<\/pos>/.exec(덩이) || [])[1] || '').trim();
  return { 말, 어종, 품사 };
}

/** 그 항목이 가리키는 동의어·비슷한말들 (어종은 사전이 안 준다) */
export function 동의어들(항목) {
  const 것 = [];
  const 재 = /<lexical_info>([\s\S]*?)<\/lexical_info>/g;
  let m;
  while ((m = 재.exec(String(항목 ?? '')))) {
    const 덩이 = m[1];
    const 갈래 = ((/<type>([\s\S]*?)<\/type>/.exec(덩이) || [])[1] || '').trim();
    if (!/동의어|비슷한말/.test(갈래)) continue;
    const 말 = 다듬는다((/<word>([\s\S]*?)<\/word>/.exec(덩이) || [])[1] || '');
    if (말) 것.push(말);
  }
  return [...new Set(것)];
}

/** 바꿀 수 있는 낱말인가 — 품사와 글자만 본다(어종 짝은 따로 본다) */
export function 낱말인가(것) {
  if (!것 || !것.말) return false;
  if (것.말.length < 2) return false;            /* 한 글자는 다른 낱말 안에서 끝없이 걸린다 */
  if (!/^[가-힣]+$/.test(것.말)) return false;
  if (/조사|어미|접사/.test(것.품사)) return false;
  return true;
}

/* ── 자가시험 ─────────────────────────────────────────────────────────── */
function 자가시험() {
  const 잰다 = [];
  const 검 = (말, 됐나) => { 잰다.push((됐나 ? '  ✅ ' : '  🔴 ') + 말); if (!됐나) 자가시험.샘 = true; };

  /* 실제 자료와 같은 모양으로 적는다 — 본보기를 실물에 맞춰야 뜻이 있다 */
  const 날마다 = '<item><word_info>'
    + '<word><![CDATA[날-마다]]></word><word_type>고유어</word_type>'
    + '<pos_info><pos>명사</pos><comm_pattern_info><sense_info>'
    + '<lexical_info><word><![CDATA[매일]]></word><unit><![CDATA[의미]]></unit><type>동의어</type></lexical_info>'
    + '</sense_info></comm_pattern_info></pos_info></word_info></item>';
  const 매일 = '<item><word_info><word><![CDATA[매-일]]></word><word_type>한자어</word_type>'
    + '<pos_info><pos>명사</pos></pos_info></word_info></item>';
  const 조사 = '<item><word_info><word><![CDATA[에서]]></word><word_type>고유어</word_type>'
    + '<pos_info><pos>조사</pos></pos_info></word_info></item>';

  검('CDATA 를 걷는다', 다듬는다('<![CDATA[매일]]>') === '매일');
  검('붙임표를 걷는다', 다듬는다('<![CDATA[날-마다]]>') === '날마다');
  검('어깨번호를 걷는다', 다듬는다('<![CDATA[가-하다01]]>') === '가하다');

  검('항목을 끊어 낸다', 항목들(날마다 + 매일).length === 2);
  const a = 표제어(날마다);
  검('🔴 CDATA 속 표제어를 읽는다', a.말 === '날마다');
  검('어종을 읽는다', a.어종 === '고유어');
  검('품사를 읽는다', a.품사 === '명사');
  검('🔴 동의어를 읽는다 — 어종은 사전이 안 준다', 동의어들(날마다).join() === '매일');
  검('한자어 표제어도 읽는다', 표제어(매일).말 === '매일' && 표제어(매일).어종 === '한자어');

  검('🔴 낱말로 본다', 낱말인가(a));
  검('🔴 조사는 낱말로 안 본다', !낱말인가(표제어(조사)));
  검('한 글자는 안 본다', !낱말인가({ 말: '밤', 어종: '고유어', 품사: '명사' }));
  검('한글이 아니면 안 본다', !낱말인가({ 말: 'ㄱ', 어종: '고유어', 품사: '명사' }));

  /* 두 번 훑기를 그대로 흉내 낸다 */
  const 어종표 = new Map();
  for (const 항 of 항목들(날마다 + 매일 + 조사)) {
    const t = 표제어(항);
    if (t.말 && !어종표.has(t.말)) 어종표.set(t.말, t.어종);
  }
  검('어종표를 만든다', 어종표.get('매일') === '한자어' && 어종표.get('날마다') === '고유어');
  const 짝 = 동의어들(날마다).filter((w) => 어종표.get(w) === '한자어');
  검('🔴 사장님이 짚으신 날마다 → 매일 이 그대로 나온다', 짝.join() === '매일');

  console.log('━━━ 자가시험 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(잰다.join('\n'));
  console.log(`━━━ ${잰다.length}가지 가운데 ${잰다.filter((s) => s.includes('✅')).length}가지 통과`);
  return !자가시험.샘;
}

/* ── 들머리 ───────────────────────────────────────────────────────────── */
if (process.argv.includes('--자가시험')) process.exit(자가시험() ? 0 : 1);

const 사전방 = process.argv[2];
const 낼곳 = process.argv[3];
if (!사전방 || !낼곳) {
  console.error('쓰는 법: node scripts/뽑는다-고유어와-한자어짝.mjs <사전폴더> <낼파일>');
  process.exit(1);
}
if (!fs.existsSync(사전방)) { console.error('🔴 사전 폴더가 없다 — ' + 사전방); process.exit(1); }

const 조각들 = fs.readdirSync(사전방).filter((f) => f.endsWith('.xml')).sort();

/* ── 첫 번째 훑기 — 「말 → 어종」 표를 만든다 ── */
console.log(`■ 첫 번째 — 사전 조각 ${조각들.length}개에서 어종을 모은다`);
const 어종표 = new Map();
let 센항목 = 0;
for (let i = 0; i < 조각들.length; i += 1) {
  let 글;
  try { 글 = fs.readFileSync(path.join(사전방, 조각들[i]), 'utf8'); } catch (e) { continue; }
  for (const 항목 of 항목들(글)) {
    센항목 += 1;
    const t = 표제어(항목);
    if (!t.말) continue;
    /* 한자어가 더 쓸모 있으므로 한자어를 덮어쓰지 않는다 */
    const 있던것 = 어종표.get(t.말);
    if (!있던것 || (있던것 !== '한자어' && t.어종 === '한자어')) 어종표.set(t.말, t.어종);
  }
  if ((i + 1) % 20 === 0) console.log(`   ${i + 1}/${조각들.length}`);
}
console.log(`   항목 ${센항목.toLocaleString('ko-KR')}개 · 낱말 ${어종표.size.toLocaleString('ko-KR')}개`);

/* ── 두 번째 훑기 — 고유어에 한자어 짝이 있는 것만 뽑는다 ── */
console.log('■ 두 번째 — 고유어에 한자어 짝이 있는 것을 고른다');
const 모음 = new Map();
for (let i = 0; i < 조각들.length; i += 1) {
  let 글;
  try { 글 = fs.readFileSync(path.join(사전방, 조각들[i]), 'utf8'); } catch (e) { continue; }
  for (const 항목 of 항목들(글)) {
    const t = 표제어(항목);
    if (t.어종 !== '고유어' || !낱말인가(t)) continue;
    const 짝 = 동의어들(항목).filter((w) => 어종표.get(w) === '한자어' && w.length >= 2);
    if (!짝.length) continue;
    if (!모음.has(t.말)) 모음.set(t.말, [...new Set(짝)].slice(0, 3).join(' · '));
  }
  if ((i + 1) % 20 === 0) console.log(`   ${i + 1}/${조각들.length} · 지금까지 ${모음.size}개`);
}

const 줄 = [...모음.entries()].sort((a, b) => a[0].localeCompare(b[0], 'ko'));
const 글 = [
  '/* 고유어-한자어짝.js — **국립국어원 표준국어대사전에서 뽑은 고유어와 그 한자어 짝.**',
  ' *',
  ' * 🔴 사장님 2026-11-22 — 「순한글사전은 네가 만든 목록이 아니고 국립국어원의',
  ' *   우리말사전 등 순한글사전이야」',
  ' *',
  ' * ⛔ 손으로 고치지 않는다. `scripts/뽑는다-고유어와-한자어짝.mjs` 가 다시 만든다.',
  ' * ⚠ 한자어 짝이 있는 고유어만 담았다 — 짝이 없으면 바꿀 길이 없어 막아도 쓸 말이 없다.',
  ` * 사전 항목 ${센항목.toLocaleString('ko-KR')}개 가운데 ${모음.size.toLocaleString('ko-KR')}개를 뽑았다.`,
  ' */',
  'export const 고유어짝 = {',
  ...줄.map(([말, 짝]) => `  ${JSON.stringify(말)}: ${JSON.stringify(짝)},`),
  '};',
  '',
];
fs.writeFileSync(낼곳, 글.join('\n'), 'utf8');
console.log('');
console.log(`✅ 사전 항목 ${센항목.toLocaleString('ko-KR')}개에서 고유어 ${모음.size.toLocaleString('ko-KR')}개를 뽑았다`);
console.log('   ' + 낼곳);
