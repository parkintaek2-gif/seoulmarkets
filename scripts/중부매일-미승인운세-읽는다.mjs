/**
 * 중부매일-미승인운세-읽는다.mjs — 승인관리 화면에서 **미승인 운세 기사**를 전부 읽는다.
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔴🔴 사장님 2026-11-25 — 「승인된 운세기사를 미승인(취소)으로 바꿔 놓음.
 *   예약을 왜 안 걸어서 이 난리를 치게 하나. **미승인 운세 기사 예약 제대로 건 뒤 승인 처리해**」
 *
 * ⇒ 고치려면 «무엇이 몇 건인지»부터 글자로 있어야 한다. 이 자는 읽기만 한다.
 * ⛔ 아무것도 바꾸지 않는다. 승인도, 노출시간도 건드리지 않는다.
 * ⛔ 쪽이 여러 장이다 — 한 장만 읽고 「전부」라고 적지 않는다.
 *
 *   node scripts/중부매일-미승인운세-읽는다.mjs
 *   node scripts/중부매일-미승인운세-읽는다.mjs --쪽수 7
 *   node scripts/중부매일-미승인운세-읽는다.mjs --자가시험
 */
import fs from 'node:fs';
import { 새탭에서, 자리잡기, 재기 } from './lib/cdp.mjs';

export const 승인화면 = 'https://cms.jbnews.com/news/adminArticleIntegrationRecognition.html?sc_area=RW';

/** 쪽 주소 — ⛔ 지어내지 않는다. CMS 가 쓰는 page 인자를 그대로 쓴다 */
export function 쪽주소(쪽) {
  const n = Number(쪽);
  if (!Number.isFinite(n) || n < 1) return 승인화면;
  return 승인화면 + '&page=' + Math.floor(n);
}

/**
 * 제목에서 «몇 월 며칠»을 집는다.
 * ⛔ 해(年)는 여기서 정하지 않는다 — 제목에 없기 때문이다. 없는 것을 지어내지 않는다.
 */
export function 제목에서날짜(제목) {
  const s = String(제목 ?? '');
  const m = s.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
  if (!m) return null;
  const 월 = Number(m[1]); const 일 = Number(m[2]);
  if (!(월 >= 1 && 월 <= 12)) return null;
  if (!(일 >= 1 && 일 <= 31)) return null;
  return { 월, 일 };
}

/** 띠별인가 별자리인가 — 노출시각이 갈린다(띠별 00:05 · 별자리 00:30) */
export function 갈래집기(제목) {
  const s = String(제목 ?? '');
  if (/별자리/.test(s)) return '별자리';
  if (/운세/.test(s)) return '띠별';
  return '모름';
}

/** 한 쪽의 줄을 읽는 글 — 기사번호·제목·승인상태 */
export const 줄읽기글 = [
  '(() => {',
  '  const 줄들 = [...document.querySelectorAll("tr[data-article_idxno]")];',
  '  const 것 = 줄들.map((tr) => {',
  '    const 번호 = tr.getAttribute("data-article_idxno") || "";',
  '    const a = tr.querySelector("a");',
  '    const 제목 = ((a && a.innerText) || tr.innerText || "").replace(/\\s+/g, " ").trim().slice(0, 80);',
  '    const 글 = (tr.innerText || "");',
  '    return { 번호: 번호, 제목: 제목, 미승인: /미승인/.test(글) };',
  '  });',
  '  return JSON.stringify({ 줄수: 줄들.length, 것: 것 });',
  '})()',
].join('\n');

const 쉰다 = (밀리) => new Promise((끝) => setTimeout(끝, 밀리));

export async function 한쪽읽기(쪽) {
  return 새탭에서(쪽주소(쪽), async (붙음) => {
    await 자리잡기(붙음, { 최대: 45000 });
    await 쉰다(3000);
    try { return JSON.parse(String(await 재기(붙음, 줄읽기글, 25000))); } catch { return null; }
  });
}

/* ── 자가시험 ──────────────────────────────────────────────── */
function 직접실행인가() { return (process.argv[1] || '').includes('중부매일-미승인운세-읽는다'); }

if (직접실행인가() && process.argv.includes('--자가시험')) {
  const 잰다 = []; const 본다 = (이름, v) => 잰다.push([이름, !!v]);
  본다('승인 화면은 승인관리다', 승인화면.includes('IntegrationRecognition'));
  본다('쪽 주소에 page 가 붙는다', 쪽주소(3).includes('page=3'));
  본다('⛔ 이상한 쪽은 첫 쪽으로 내려앉는다', 쪽주소(0) === 승인화면 && 쪽주소('가') === 승인화면);
  본다('제목에서 날짜를 집는다', (() => {
    const d = 제목에서날짜('[오늘의운세] 1월 29일 (음력 12월 11일)');
    return d && d.월 === 1 && d.일 === 29;
  })());
  본다('[오늘의 운세] 처럼 띄어 써도 집는다', (() => {
    const d = 제목에서날짜('[오늘의 운세] 2월 3일 (음력 12월 16일)');
    return d && d.월 === 2 && d.일 === 3;
  })());
  본다('⛔ 음력 쪽 숫자를 집지 않는다', (() => {
    const d = 제목에서날짜('[오늘의운세] 3월 24일 (음력 2월 6일)');
    return d && d.월 === 3 && d.일 === 24;
  })());
  본다('⛔ 날짜가 없으면 null 이다 — 0 이 아니다', 제목에서날짜('[오늘의운세] 봄맞이') === null);
  본다('⛔ 13월은 받지 않는다', 제목에서날짜('[오늘의운세] 13월 1일') === null);
  본다('⛔ 32일은 받지 않는다', 제목에서날짜('[오늘의운세] 1월 32일') === null);
  본다('⛔ 글이 아니면 null', 제목에서날짜(null) === null && 제목에서날짜(undefined) === null);
  본다('별자리를 가른다', 갈래집기('[오늘의별자리] 1월 2일') === '별자리');
  본다('띠별을 가른다', 갈래집기('[오늘의운세] 1월 2일') === '띠별');
  본다('⛔ 둘 다 아니면 모름이다', 갈래집기('[포토] 첫눈') === '모름');
  본다('별자리가 운세보다 앞선다', 갈래집기('[오늘의별자리 운세] 1월 2일') === '별자리');
  본다('줄읽기글이 기사번호를 집는다', 줄읽기글.includes('data-article_idxno'));
  본다('줄읽기글이 미승인을 가른다', 줄읽기글.includes('미승인'));
  본다('⛔ 줄읽기글은 아무것도 누르지 않는다',
    !/\.click\(|submit\(|Page\.navigate/.test(줄읽기글));

  const 진 = 잰다.filter(([, v]) => !v);
  for (const [이름, v] of 잰다) console.log((v ? '  ✅ ' : '  🔴 ') + 이름);
  console.log(진.length ? ('🔴 ' + 진.length + '가지 깨졌다') : ('✅ 자가시험 ' + 잰다.length + ' 통과'));
  process.exit(진.length ? 1 : 0);
}

if (직접실행인가() && !process.argv.includes('--자가시험')) {
  const i = process.argv.indexOf('--쪽수');
  const 쪽수 = i >= 0 ? Math.max(1, Math.min(30, Number(process.argv[i + 1]) || 1)) : 7;
  const 모은것 = [];
  const 본번호 = new Set();
  for (let 쪽 = 1; 쪽 <= 쪽수; 쪽 += 1) {
    const r = await 한쪽읽기(쪽);
    if (!r) { console.log('🔴 ' + 쪽 + '쪽을 못 읽었다 — 못 쟀다(0 이 아니다)'); continue; }
    let 새것 = 0;
    for (const o of r.것 || []) {
      if (!o || !o.번호 || 본번호.has(o.번호)) continue;
      본번호.add(o.번호); 모은것.push(o); 새것 += 1;
    }
    console.log('■ ' + 쪽 + '쪽 — 줄 ' + r.줄수 + ' · 새 기사 ' + 새것);
    if (!새것) { console.log('   (새 기사가 없다 — 여기서 멈춘다)'); break; }
  }
  const 운세 = 모은것.filter((o) => 갈래집기(o.제목) !== '모름');
  console.log('');
  console.log('■ 모은 기사 ' + 모은것.length + '건 · 그 가운데 운세 ' + 운세.length + '건');
  const 날짜없는것 = 운세.filter((o) => !제목에서날짜(o.제목));
  console.log('■ 제목에서 날짜를 못 집은 것 ' + 날짜없는것.length + '건');
  for (const o of 날짜없는것.slice(0, 10)) console.log('   ' + o.번호 + ' ' + o.제목);
  const 낼곳 = 'docs/자국/중부매일-미승인운세-20261125.json';
  fs.writeFileSync(낼곳, JSON.stringify(운세, null, 1), 'utf8');
  console.log('■ 적었다 — ' + 낼곳);
}
