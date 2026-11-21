#!/usr/bin/env node
/**
 * measure-kcw-age-in-headline.mjs — 한국 연예 지면이 **제목에 나이를 박는** 관행을 센다.
 *
 * ── 왜 (2026-09-11 01:3x · 5번) ──────────────────────────────────────────────
 * 오늘 우리가 받은 제목을 읽다가 눈에 걸렸다 —
 *   「'82세' 김도향, 3개월 전 낙상 사고」 · 「'88세' 김영옥」 · 「'32세' 한소희, '금발 변신'」
 *   「'39세' 한지은 맞아?」 · 「'36세' 강민경, 뽀얀 피부 비결」 · 「'42세' 박한별」
 *
 * ⭐ 영어권 지면은 이렇게 쓰지 않는다. 나이를 «제목의 첫 낱말»로, 따옴표에 넣어 박는 것은
 *   한국 연예 지면의 관행이다. 그런데 **아무도 이것을 센 적이 없다.**
 *   우리는 매일 신문 제목을 받아 쌓는다 — 그것이 우리 축이다.
 *
 * ⚠ 그리고 이것은 「관행이 이상하다」는 기사가 아니다. 세면 답이 나오는 물음이 있다 —
 *   ① 얼마나 자주 하나 · ② 어느 매체가 더 하나 · ③ 어느 나이대에 붙나
 *   ④ 남자와 여자에게 같은 비율로 붙나  ⑤ 그 수가 맞나(위키데이터 생년으로 대조)
 *
 * ── ⚠ 정직 규칙 ─────────────────────────────────────────────────────────────
 * ```
 * ⛔ 남녀 비교는 «이름으로 성별을 짐작해» 하지 않는다. 그것은 지어내는 것이다.
 *   성별은 이 자에서 재지 않는다 — 재려면 위키데이터 P21 을 따로 받아야 한다
 * ⛔ 나이가 맞는지도 이 자에서 판정하지 않는다 — 생년을 안 받았다. 못 쟀다고 적는다
 * ⛔ 매체 사이 비율을 견줄 때 «받은 제목 수»가 다른 것을 숨기지 않는다
 * ⛔ 열흘치는 열흘치다. 「한국 언론은 늘 이렇다」로 넓히지 않는다
 * ```
 *
 * 쓰는 법
 *   node scripts/measure-kcw-age-in-headline.mjs --자가시험
 *   node scripts/measure-kcw-age-in-headline.mjs --잰다
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const 밑감방 = path.join(뿌리, 'archive', 'raw', 'newsdesk-korean-press');
export const 낼곳 = path.join(뿌리, 'src', 'data', 'kcw-age-in-headline.json');

/**
 * 제목에서 «따옴표에 든 나이»를 뽑는다.
 * ⚠ 여러 꼴이 있다 — '82세' · "82세" · ‘82세’ · “82세” · [82세]
 * ⛔ 따옴표 없이 그냥 「82세」로 쓴 것은 «다른 것»이다. 둘을 갈라 센다 —
 *   따옴표에 넣는 것이 이 관행의 본체이고, 맨몸은 본문 문장일 수도 있다.
 */
/* ⚠ 클래스 안의 `]` 는 «반드시» escape 한다 — 안 하면 정규식이 거기서 클래스를 닫는다.
   2026-09-11 01:4x 에 그것으로 자가시험 열 가지가 막혔다(값은 안 나갔다). */
const 여는따옴표 = '[\u0027\u0022\u2018\u201C\u005B]';
const 닫는따옴표 = '[' + "\\u0027\\u0022\\u2019\\u201D" + '\\]]';
export const 따옴표든나이 = new RegExp(여는따옴표 + '\\s*(\\d{1,3})\\s*세\\s*' + 닫는따옴표, 'g');

export function 나이뽑기(제목) {
  const s = String(제목 ?? '');
  const 따옴 = [...s.matchAll(따옴표든나이)].map((m) => Number(m[1]));
  /* 맨몸은 따옴표에 든 것을 뺀 나머지로 센다 */
  const 지운것 = s.replace(따옴표든나이, ' ');
  const 맨몸 = [...지운것.matchAll(/(\d{1,3})\s*세/g)].map((m) => Number(m[1]));
  const 쓸만한 = (a) => a.filter((n) => n >= 1 && n <= 120);   /* ⛔ 「1000세」 같은 것은 나이가 아니다 */
  return { 따옴표: 쓸만한(따옴), 맨몸: 쓸만한(맨몸) };
}

/** 제목이 «맨 앞»에서 나이로 시작하나 — 관행의 가장 진한 꼴이다 */
export function 맨앞에나이(제목) {
  const s = String(제목 ?? '').trim();
  if (!s) return null;
  return new RegExp('^' + 여는따옴표 + '\\s*\\d{1,3}\\s*세\\s*' + 닫는따옴표).test(s);
}

/** 나이대로 묶는다 (10대·20대…). ⛔ 나이가 아니면 null */
export function 나이대(나이) {
  const n = Number(나이);
  if (!Number.isFinite(n) || n < 1 || n > 120) return null;
  return Math.floor(n / 10) * 10;
}

/** 한 날 파일에서 매체별 제목을 뽑는다. 못 읽으면 null */
export function 하루읽기(글) {
  let o; try { o = JSON.parse(글); } catch { return null; }
  const 매체별 = o && o.매체별;
  if (!매체별 || typeof 매체별 !== 'object') return null;
  const 것들 = [];
  for (const [이름, v] of Object.entries(매체별)) {
    const 줄들 = (v && Array.isArray(v.쓸만한)) ? v.쓸만한 : [];
    for (const x of 줄들) {
      const 제목 = typeof x === 'string' ? x : (x && x.제목);
      if (제목) 것들.push({ 매체: 이름, 갈래: (v && v.갈래) || null, 제목: String(제목) });
    }
  }
  return 것들.length ? 것들 : null;
}

/** 매체마다 센다. ⛔ 받은 제목 수를 함께 낸다 — 비율만 내면 표본을 숨기는 것이다 */
export function 매체별세기(것들) {
  if (!Array.isArray(것들) || !것들.length) return null;
  const m = new Map();
  for (const x of 것들) {
    if (!m.has(x.매체)) m.set(x.매체, { 매체: x.매체, 갈래: x.갈래, 제목수: 0, 따옴표붙은제목: 0, 맨앞: 0, 나이들: [] });
    const c = m.get(x.매체);
    c.제목수 += 1;
    const { 따옴표 } = 나이뽑기(x.제목);
    if (따옴표.length) { c.따옴표붙은제목 += 1; c.나이들.push(...따옴표); }
    if (맨앞에나이(x.제목)) c.맨앞 += 1;
  }
  return [...m.values()].map((c) => ({
    ...c,
    비율: c.제목수 ? Number((c.따옴표붙은제목 / c.제목수 * 100).toFixed(1)) : null,
  })).sort((a, b) => (b.비율 ?? -1) - (a.비율 ?? -1));
}

/* ── 자가시험 ─────────────────────────────────────────────── */
export function 자가시험() {
  let 통 = 0; const 막 = [];
  const 검 = (n, ok) => { if (ok) 통++; else 막.push(n); };

  검("홑따옴표 나이를 뽑는다", 나이뽑기("'82세' 김도향, 낙상 사고").따옴표[0] === 82);
  검('겹따옴표도 뽑는다', 나이뽑기('"88세" 김영옥').따옴표[0] === 88);
  검('둥근 따옴표도 뽑는다', 나이뽑기('‘32세’ 한소희').따옴표[0] === 32);
  검('대괄호도 뽑는다', 나이뽑기('[42세] 박한별').따옴표[0] === 42);
  검('🔴 따옴표에 든 것과 맨몸을 «갈라» 센다 — 관행의 본체는 따옴표 쪽이다',
    (() => { const r = 나이뽑기("'82세' 김도향이 60세 때 이야기");
      return r.따옴표[0] === 82 && r.맨몸[0] === 60; })());
  검('한 제목에 둘이면 둘 다 뽑는다',
    나이뽑기("'73세' 어머니와 '39세' 딸").따옴표.length === 2);
  검('⛔ 나이가 아닌 수는 버린다 — 「1000세」', 나이뽑기("'1000세' 전설").따옴표.length === 0);
  검('⛔ 나이가 없으면 빈 목록', 나이뽑기('김수현 스타랭킹 1위').따옴표.length === 0);
  검('⛔ null 도 견딘다', 나이뽑기(null).따옴표.length === 0);

  검('🔴 맨 앞에서 나이로 시작하는 것을 가른다', 맨앞에나이("'82세' 김도향") === true);
  검('가운데 있으면 맨 앞이 아니다', 맨앞에나이("김도향, '82세'에도 활동") === false);
  검('⛔ 빈 제목은 null', 맨앞에나이('') === null && 맨앞에나이(null) === null);

  검('나이대로 묶는다', 나이대(82) === 80 && 나이대(32) === 30);
  검('⛔ 나이가 아니면 null', 나이대(0) === null && 나이대(200) === null && 나이대('가') === null);

  const 글 = JSON.stringify({ 잰때: 'x', 매체별: {
    스타뉴스: { 갈래: 'K컬처', 쓸만한: [{ 제목: "'82세' 김도향" }, { 제목: '김수현 1위' }, { 제목: "'32세' 한소희" }] },
    매일경제: { 갈래: '경제', 쓸만한: [{ 제목: '국채금리 상승' }] },
  } });
  const 것들 = 하루읽기(글);
  검('한 날에서 제목을 뽑는다', 것들.length === 4);
  검('매체를 함께 붙인다', 것들[0].매체 === '스타뉴스');
  검('⛔ 꼴이 다르면 null', 하루읽기('{"a":1}') === null);
  검('⛔ JSON 이 아니면 null', 하루읽기('깨진 글') === null);

  const 셈 = 매체별세기(것들);
  검('매체마다 센다', 셈.length === 2);
  검('비율을 낸다 — 스타뉴스 3개 중 2개', 셈[0].비율 === 66.7);
  검('🔴 받은 제목 수를 함께 낸다 — 비율만 내면 표본을 숨긴다', 셈[0].제목수 === 3);
  검('맨 앞 꼴도 센다', 셈[0].맨앞 === 2);
  검('나이를 모아 둔다', 셈[0].나이들.length === 2);
  검('⛔ 빈 것이면 null', 매체별세기([]) === null && 매체별세기(null) === null);

  console.log('자가시험 — measure-kcw-age-in-headline.mjs\n');
  막.forEach((m) => console.log('  MAK ' + m));
  console.log(`\n통과 ${통} · 막힘 ${막.length}`);
  return 막.length === 0;
}

const 나 = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(나)) {
  if (process.argv.includes('--자가시험')) process.exit(자가시험() ? 0 : 1);
  if (!process.argv.includes('--잰다')) { console.log('⛔ --잰다 나 --자가시험 을 준다'); process.exit(1); }
  if (!자가시험()) { console.error('🔴 자가시험이 막혔다 — 값을 내지 않는다'); process.exit(1); }
  console.log('');

  let 파일들 = [];
  try { 파일들 = fs.readdirSync(밑감방).filter((f) => /^\d{8}\.json$/.test(f)).sort(); }
  catch { console.error('🔴 밑감방을 못 읽었다 — ' + 밑감방); process.exit(1); }

  const 모두 = []; const 날들 = [];
  for (const f of 파일들) {
    const 것들 = 하루읽기(fs.readFileSync(path.join(밑감방, f), 'utf8'));
    if (!것들) { console.log('  ⬜ ' + f + ' 를 못 읽었다 — '); continue; }
    날들.push(f.slice(0, 8));
    모두.push(...것들.map((x) => ({ ...x, 날: f.slice(0, 8) })));
  }
  if (!모두.length) { console.error('🔴 잴 것이 없다'); process.exit(1); }

  const 셈 = 매체별세기(모두);
  console.log(`■ 제목에 «따옴표로 나이를 박는» 관행 — ${날들.length}일 · 제목 ${모두.length.toLocaleString('ko-KR')}개`);
  console.log('  (' + 날들[0] + ' ~ ' + 날들[날들.length - 1] + ')\n');
  console.log('  매체          갈래      받은 제목   나이 박은 제목    비율     맨 앞에 박은 것');
  for (const c of 셈) {
    console.log('  ' + String(c.매체).padEnd(12) + String(c.갈래 || '—').padEnd(8)
      + String(c.제목수).padStart(9) + String(c.따옴표붙은제목).padStart(14)
      + (c.비율 == null ? '     ⬜' : (c.비율.toFixed(1) + '%').padStart(9))
      + String(c.맨앞).padStart(14));
  }

  /* 나이대 분포 — 어느 나이에 붙나 */
  const 대별 = new Map();
  for (const c of 셈) for (const n of c.나이들) {
    const d = 나이대(n);
    if (d == null) continue;
    대별.set(d, (대별.get(d) || 0) + 1);
  }
  const 나이합 = [...대별.values()].reduce((a, b) => a + b, 0);
  console.log('\n■ 어느 나이에 붙나 — 박힌 나이 ' + 나이합 + '개');
  [...대별].sort((a, b) => a[0] - b[0]).forEach(([d, n]) => {
    console.log('  ' + String(d) + '대  ' + String(n).padStart(4) + '  ' + '█'.repeat(Math.round(n / Math.max(1, 나이합) * 40)));
  });

  console.log('\n⛔ 이 자는 성별을 재지 않는다 — 이름으로 짐작하지 않는다.');
  console.log('⛔ 나이가 맞는지도 재지 않았다 — 생년을 안 받았다. 못 쟀다고 적는다.');
  console.log('⚠ ' + 날들.length + '일치는 ' + 날들.length + '일치다. 「한국 언론은 늘 이렇다」로 넓히지 않는다.');

  fs.mkdirSync(path.dirname(낼곳), { recursive: true });
  fs.writeFileSync(낼곳, JSON.stringify({
    잰때: new Date().toISOString(), 날수: 날들.length, 날들, 제목수: 모두.length,
    안잰것: ['성별(이름으로 짐작하지 않는다)', '나이가 맞는지(생년을 안 받았다)'],
    매체별: 셈, 나이대: Object.fromEntries([...대별].sort((a, b) => a[0] - b[0])),
  }, null, 2), 'utf8');
  console.log('\n  → ' + 낼곳);
  process.exit(0);
}
