#!/usr/bin/env node
/**
 * **남의 신문 제목이 우리 지면에 그대로 났는지 잰다.**
 *
 * ── 🔴 왜 (2026-10-11 12:0x · 5번) ──────────────────────────────────
 * `archive/raw/newsdesk-korean-press` 는 네 매체(매일경제·동아일보·스타뉴스·텐아시아)의
 * 첫 화면 제목을 날마다 받아 쌓는다. 라이선스 대장에 「5번이 잰다」로 ⬜ 인 채 남아 있었고,
 * 그 자료로 만든 지면 셋(kcw-latin-in-headline · kcw-money-vs-age-in-headline ·
 * kcw-press-vs-reading)이 **이미 손님에게 나가고 있었다.**
 *
 * 재 보니 지면에 가는 것은 **우리가 센 수**와 로마자 낱말 하나씩(LG·AI·kg·ETF)뿐이고
 * 제목 원문은 0곳이었다(2026-10-11 실측 — 제목 162개 × dist 17,058개 파일).
 *
 * ⭐ 그 「0곳」은 **오늘의 사실이지 규칙이 아니다.** 누군가 기사에 제목 하나를 보기로
 *   옮겨 적으면 그날로 바뀐다. 그래서 글로 적지 않고 이 자로 둔다.
 *
 * ── ⛔ 이 자가 지키는 것 ────────────────────────────────────────────
 * ⛔ **제목은 남의 글이다.** 우리가 센 수는 우리 것이지만 제목 자체는 아니다.
 *   네 매체 이용약관을 아직 안 읽었다(대장에 그렇게 적혀 있다) — 읽기 전에는 안 낸다.
 * ⛔ 「짧으니까 괜찮겠지」로 넘기지 않는다. 그것은 우리가 할 판단이 아니다.
 * ⚠ robots 로 **받아도 된다**는 것과 **내도 된다**는 것은 다른 자다. 이 검사는 뒤쪽이다.
 *
 * ⚠ 짧은 제목은 우연히 겹친다(「속보」·「단독」 따위). 그래서 **12자 이상**만 본다 —
 *   그 아래는 우연을 걸러 낼 수 없어 세어 봤자 거짓 빨강만 난다.
 *
 *   node scripts/check-남의신문제목이-지면에-났나.mjs
 *   node scripts/check-남의신문제목이-지면에-났나.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** 우연한 겹침을 거르는 길이. 이보다 짧은 제목은 세지 않는다 */
export const 짧은것 = 12;

/**
 * 하루치 파일에서 제목만 꺼낸다.
 * ⛔ 링크(`길`)는 꺼내지 않는다 — 이 검사가 볼 것은 «글»이지 주소가 아니다.
 */
export function 제목꺼내기(하루치) {
  const 매체별 = 하루치 && 하루치.매체별;
  if (!매체별 || typeof 매체별 !== 'object') return [];
  const 모음 = [];
  for (const 한매체 of Object.values(매체별)) {
    for (const 한줄 of (한매체 && 한매체.쓸만한) || []) {
      const t = String((한줄 && 한줄.제목) ?? '').trim();
      if (t) 모음.push(t);
    }
  }
  return 모음;
}

/** 우연을 거르고 남은 것만 */
export function 셀것만(제목들, 최소길이 = 짧은것) {
  return [...new Set(제목들.map((s) => String(s).trim()))].filter((s) => s.length >= 최소길이);
}

/** 어느 파일에 어느 제목이 났나 — 처음 걸린 하나만 적는다(한 파일에 여러 개여도 한 줄) */
export function 난곳찾기(지면들, 제목들, 읽기) {
  const 걸린 = [];
  for (const f of 지면들) {
    let 글;
    try { 글 = 읽기(f); } catch { continue; }
    for (const h of 제목들) {
      if (글.includes(h)) { 걸린.push({ 지면: f, 제목: h }); break; }
    }
  }
  return 걸린;
}

function 지면모으기(d, 모음 = []) {
  let 것들;
  try { 것들 = fs.readdirSync(d, { withFileTypes: true }); } catch { return 모음; }
  for (const e of 것들) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) 지면모으기(p, 모음);
    else if (/\.(html|md|json|xml)$/.test(e.name)) 모음.push(p);
  }
  return 모음;
}

function 자가시험() {
  let 탈 = 0;
  const 검 = (이름, 참인가, 덧 = '') => {
    if (참인가) return;
    탈 += 1;
    console.log(`🔴 ${이름} ${덧}`);
  };

  /* 꺼내기 — 본 실행이 넘기는 «그 꼴» 그대로 */
  const 하루치 = {
    잰때: '2026-10-11T00:00:00.000Z',
    매체별: {
      매일경제: { 받은수: 2, 쓸만한: [{ 제목: '넓은 집보다 비싼 국평…가격역전 거래 160% 늘었다', 길: 'https://example.invalid/1' }] },
      동아일보: { 받은수: 1, 쓸만한: [{ 제목: '짧은제목', 길: 'https://example.invalid/2' }] },
    },
  };
  const 꺼낸것 = 제목꺼내기(하루치);
  검('두 매체에서 제목 둘을 꺼낸다', 꺼낸것.length === 2, `— ${꺼낸것.length}`);
  검('⛔ 링크는 안 꺼낸다 — 이 검사가 볼 것은 글이다', !꺼낸것.join(' ').includes('http'));
  검('⛔ 꼴이 어긋나도 터지지 않는다', 제목꺼내기(null).length === 0 && 제목꺼내기({}).length === 0);
  검('⛔ 쓸만한 칸이 없어도 터지지 않는다', 제목꺼내기({ 매체별: { 가: {} } }).length === 0);

  /* 길이 거르개 */
  const 셀것 = 셀것만(꺼낸것);
  검('🔴 12자 아래는 안 센다 — 우연히 겹쳐 거짓 빨강이 난다', 셀것.length === 1, `— ${JSON.stringify(셀것)}`);
  검('⛔ 같은 제목이 두 번 오면 한 번만 센다', 셀것만(['열두자가넘고도남는긴제목이다', '열두자가넘고도남는긴제목이다']).length === 1);
  검('⛔ 앞뒤 공백은 같은 제목으로 본다', 셀것만(['  열두자가넘고도남는긴제목이다  ', '열두자가넘고도남는긴제목이다']).length === 1);

  /* 난 곳 찾기 */
  const 가짜읽기 = (f) => ({
    '깨끗한.html': '<p>We counted 223 headlines.</p>',
    '샌것.html': '<p>보기: 넓은 집보다 비싼 국평…가격역전 거래 160% 늘었다</p>',
    '못읽는것.html': null,
  }[f] ?? (() => { throw new Error('없다'); })());
  const 걸린 = 난곳찾기(['깨끗한.html', '샌것.html'], 셀것, 가짜읽기);
  검('🔴 제목이 그대로 난 지면을 잡는다', 걸린.length === 1 && 걸린[0].지면 === '샌것.html');
  검('✅ 수만 적은 지면은 안 잡는다', !걸린.some((x) => x.지면 === '깨끗한.html'));
  검('⛔ 못 읽는 파일이 있어도 멈추지 않는다', 난곳찾기(['못읽는것.html', '샌것.html'], 셀것, (f) => {
    if (f === '못읽는것.html') throw new Error('못 읽는다');
    return 가짜읽기(f);
  }).length === 1);
  검('⛔ 한 지면에 여럿 나도 한 줄만 적는다',
    난곳찾기(['샌것.html'], [...셀것, '넓은 집보다 비싼 국평…가격역전 거래 160% 늘었다'], 가짜읽기).length === 1);
  검('⛔ 셀 제목이 없으면 아무것도 안 잡는다 — 빈 목록이 전부를 잡지 않는다',
    난곳찾기(['샌것.html'], [], 가짜읽기).length === 0);

  console.log(탈 ? `\n🔴 자가시험 ${탈}건 탈` : `\n✅ 자가시험 ${13 - 탈}개 통과`);
  if (탈) process.exit(1);
}

function 본실행() {
  const 밑감방 = path.join(뿌리, 'archive/raw/newsdesk-korean-press');
  const 지면방 = path.join(뿌리, 'dist');

  if (!fs.existsSync(밑감방)) {
    console.log('⬜ 못 쟀다 — archive/raw/newsdesk-korean-press 가 없다.');
    console.log('   ⚠ 「없다」가 아니라 「못 쟀다」다. 자료를 받고 다시 돌린다.');
    return;
  }
  if (!fs.existsSync(지면방)) {
    console.log('⬜ 못 쟀다 — dist 가 없다. node scripts/build-once.mjs 를 먼저 돌린다.');
    return;
  }

  /* ⚠ 날마다 수백 개씩 쌓인 것을 다 보면 느리다. 가장 최근 이레치만 본다 —
     「오늘 받은 제목이 오늘 지면에 났나」가 이 검사의 물음이다. */
  const 날들 = fs.readdirSync(밑감방).filter((f) => /^\d{8}\.json$/.test(f)).sort().slice(-7);
  if (!날들.length) {
    console.log('⬜ 못 쟀다 — 날짜 파일이 하나도 없다.');
    return;
  }

  const 모은제목 = [];
  for (const f of 날들) {
    try {
      모은제목.push(...제목꺼내기(JSON.parse(fs.readFileSync(path.join(밑감방, f), 'utf8'))));
    } catch (e) {
      /* ⛔ 묻지 않는다 — 못 읽은 날은 못 읽었다고 말한다 */
      console.log(`⬜ ${f} 를 못 읽었다 — ${e.message}`);
    }
  }
  const 셀것 = 셀것만(모은제목);
  const 지면들 = 지면모으기(지면방);

  console.log(`■ 신문 ${날들.length}일치 제목 ${셀것.length}개(${짧은것}자 이상)를 지면 ${지면들.length}개에서 찾는다`);
  if (!셀것.length) {
    console.log('⬜ 셀 제목이 하나도 없다 — 이 검사가 헛돌고 있다. 밑감을 보라.');
    return;
  }

  const 걸린 = 난곳찾기(지면들, 셀것, (f) => fs.readFileSync(f, 'utf8'));
  if (!걸린.length) {
    console.log('✅ 남의 신문 제목이 난 지면 0곳 — 우리가 센 수만 나간다');
    console.log('   ⚠ 이것은 «오늘의 사실»이지 규칙이 아니다. 그래서 날마다 잰다.');
    return;
  }

  console.log(`🔴 남의 신문 제목이 우리 지면에 그대로 났다 — ${걸린.length}곳`);
  for (const { 지면, 제목 } of 걸린.slice(0, 20)) {
    console.log(`   ⛔ ${path.relative(뿌리, 지면)}`);
    console.log(`      ← ${제목}`);
  }
  if (걸린.length > 20) console.log(`   … 그리고 ${걸린.length - 20}곳 더`);
  console.log('   ✅ 푸는 길: ① 제목을 빼고 «우리가 센 수»로 바꾼다');
  console.log('             ② 아니면 그 매체 이용약관을 읽고 docs/라이선스-대장.tsv 의');
  console.log('                newsdesk-korean-press 줄을 고친 뒤 이 자의 기준을 바꾼다');
  console.log('   ⛔ 기준을 먼저 바꿔서 빨강을 끄지 않는다 — 그러면 다음 사람이 그 버릇을 배운다');
  process.exit(1);
}

if (process.argv.includes('--자가시험')) 자가시험();
else 본실행();
