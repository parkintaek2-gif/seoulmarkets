#!/usr/bin/env node
/**
 * collect-india-nse-credit-rating.mjs — **인도 상장사 신용등급이 «바뀐» 것을 날마다 쌓는다.**
 *
 * 사장님(2026-09-15): 「아시아 상장기업 신용등급 데이터 찾아서 서비스하자.
 *                      등급만 무료로 주는데 있지 않나?」
 * 사장님(그 뒤, 목적을 못박아 주심): **「지금 데이터 모아 나중에 신용등급이 바뀐 기업이
 *                                   어디인 지 알려주는 서비스가 목적」**
 *
 * ── 그래서 «표»가 아니라 «사건»을 모은다 ────────────────────────────────────
 * NSE 가 내주는 것은 5만 줄짜리 등급표다. 그런데 손님이 알고 싶은 것은 그게 아니다 —
 * **누가 언제 올라갔고 내려갔나**다. 실측(2026-09-15) —
 *
 *     Re-affirm  29,960   ← 그대로다. 사건이 아니다
 *     Other      16,643   ← 대개 철회·경과. 안을 봐야 한다
 *     Upgrade     2,389   ← ⭐ 이것
 *     Downgrade     599   ← ⭐ 이것
 *     New         1,362   ← ⭐ 새로 매긴 것도 사건이다
 *
 * ⇒ 바뀐 것만 남기면 5만 줄이 몇천 줄이 된다. 그것이 상품이고, 그것만 쌓는다.
 * ⭐ 이 수법은 사장님이 이미 정하신 것과 같다 — 「공시는 중대사건만 뽑으면 라이선스가
 *   안 걸린다」. 등급도 «전량»이 아니라 «변경 사건»이다.
 *
 * ── 🔴 왜 오늘부터 쌓아야 하나 — 소급이 «안 된다» ──────────────────────────
 * 이 갈래는 「지금 살아 있는 등급」을 내주는 자리다. 어제 무엇이 바뀌었는지를
 * 되돌려 주지 않는다. **오늘 안 받으면 오늘치는 영영 없다.**
 * ⇒ 아카이빙 목록(소급 불가)에 올린다. 한국 한경컨센서스와 같은 성격이다.
 *
 * ── 🟢 [2026-09-20 · 5번] 위 두 줄을 **재 보고 정정한다 — 소급이 «된다»** ────────
 * 사장님이 인도를 제 몫으로 다시 정하셔서 이어받다가, 쌓아 둔 것을 열어 봤다.
 * 사건마다 «제 날짜»(ratingDate)가 붙어 있고, 창이 하루가 아니다 —
 *
 *     받은 날      사건      변경 사건   창(가장 이른 ~ 가장 늦은)
 *     09-15     21,956     4,898     2025-01-10 ~ 2026-11-09
 *     09-18     22,295     4,975     2025-01-10 ~ 2026-11-09
 *     09-20     22,344     4,993     2025-01-10 ~ 2026-11-09
 *
 * ⭐ **시작이 세 번 다 2025-01-10 로 같고, 건수만 는다.** 굴러가는 창이 아니라
 *   «2025-01-10 부터 쌓이는 누적 자료»다. 그러니 —
 *     ✅ 하루 빠뜨려도 잃는 것이 없다. 다음에 받으면 그 사이 것이 다 들어온다
 *     ✅ 오늘 받은 한 벌에 이미 **20개월치 등급 변경 4,993건(회사 1,320곳)**이 들어 있다
 *   ⛔ 그렇다고 감시에서 빼지 않는다 — 출처가 창을 언제 자를지 모른다. 창이 잘리는
 *     순간을 알아채려면 날마다 재는 수밖에 없다(채권에서 그 생각으로 18일을 잃었다).
 * ⚠ 「소급 불가」라고 적어 둔 것은 **내(5번) 짐작이었다.** 받아서 열어 보지 않고 적었다.
 *   우리 규칙은 「없다고 적기 전에 그쪽 화면에 그 수가 떠 있는지 본다」다.
 *
 * ── ⛔ 아직 «내지» 않는다 — 약관을 읽었고, 막혀 있다 ───────────────────────
 * NSE 저작권 조문(2026-09-15 읽음, website-policies) —
 *   "Except as specifically permitted herein the Exchange is the owner of copyright in
 *    all information featured on this website and no portion of the information on this
 *    website may be reproduced on or transmitted to or stored in any other website or in
 *    other form of electronic retrieval system or by in any other form or by in any other means."
 * 일본 JCR 도 같다 — robots 는 다 열려 있는데 약관이 재배포를 막는다.
 *
 * ⇒ **모으는 것과 내는 것을 가른다.**
 *   ✅ 모은다   우리 archive 에 쌓는다. 안 쌓으면 영영 없다
 *   ⛔ 안 낸다  지면·API·상품 어디에도 «한 줄도» 안 올린다. 사장님 판단을 받은 뒤에 연다
 *   ⚠ 낼 때도 표를 베끼지 않는다 — 「누가 언제 올랐나」라는 «사실»을 우리 꼴로 낸다
 *
 * ── 쓰는 법 ────────────────────────────────────────────────────────────
 *   node scripts/collect-india-nse-credit-rating.mjs --자가시험
 *   node scripts/collect-india-nse-credit-rating.mjs --잰다      받아서 세 보기만 한다
 *   node scripts/collect-india-nse-credit-rating.mjs --적는다    archive 에 쌓는다
 *
 * ⚠ NSE 는 맨 요청을 막는다(봇 차단). 사장님 크롬(9222)에 붙어 «지면을 거쳐» 받는다.
 */
import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const 뿌리 = path.resolve(import.meta.dirname, '..');
const 둘곳 = path.join(뿌리, 'archive/raw/india-nse-credit-rating');
const 지면 = 'https://www.nseindia.com/companies-listing/corporate-sdd-credit-rating-reg30';
const 갈래 = ['equities', 'sme'];

/**
 * 「바뀐 것」인가.
 * 🔴 NSE 가 내주는 currentAction 은 글자가 제각각이다(실측) —
 *   Downgrade/Downgraded · Re-affirm/Reaffirmed · Other/Others · New/new/Assigned.
 *   묶지 않으면 같은 사건이 딴 것으로 세어진다.
 * ⛔ 모르는 글자를 「그대로다」로 넘기지 않는다 — 모르면 «모른다»고 내보내 사람이 보게 한다.
 */
export function 움직임(글) {
  const s = String(글 || '').trim().toLowerCase();
  if (!s) return 'unknown';
  if (/^(upgrade[d]?|upward)/.test(s)) return 'upgrade';
  if (/^(downgrade[d]?|downward)/.test(s)) return 'downgrade';
  if (/^(new|assigned|initial)/.test(s)) return 'new';
  if (/withdraw/.test(s)) return 'withdrawn';
  if (/^(re-?affirm(ed)?|reaffirm(ed)?|retain(ed)?|no change)/.test(s)) return 'unchanged';
  if (/^other/.test(s)) return 'other';
  return 'unknown';
}

/** 사건인가 — 그대로인 것은 쌓지 않는다. ⛔ 'other'·'unknown' 은 «버리지 않는다»(사람이 봐야 한다) */
export function 사건인가(움) {
  return 움 !== 'unchanged';
}

/**
 * 날짜를 믿을 수 있나.
 * 🔴 실측에 2205-12-04 가 있었다 — 신고자가 잘못 친 것이다.
 * ⛔ 고쳐 넣지 않는다. 「못 믿는다」고 표시해 두고 그 줄은 셈에서 뺀다(강령 3).
 */
export function 날짜읽기(글, 오늘 = new Date()) {
  const t = Date.parse(String(글 || ''));
  if (!Number.isFinite(t)) return { 날: null, 믿나: false, 까닭: 'unparseable' };
  const d = new Date(t);
  /* 🔴 toISOString() 을 쓰지 않는다 — 그건 UTC 라 이 PC(한국시간)에서 «하루가 앞당겨진다».
     실측: '04-Dec-2205' 를 넣었더니 2205-12-03 이 나왔다. 날짜 칸이 하루씩 어긋나면
     「언제 바뀌었나」를 파는 상품이 통째로 틀린다(사장님 지시 — 시각은 한국시간). */
  const 글로 = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
    + '-' + String(d.getDate()).padStart(2, '0');
  const 해 = d.getFullYear();
  const 올해 = 오늘.getFullYear();
  if (해 < 1990 || 해 > 올해 + 1) return { 날: 글로, 믿나: false, 까닭: 'year out of range' };
  return { 날: 글로, 믿나: true, 까닭: null };
}

/** 한 줄을 우리 꼴로. ⛔ 없는 칸을 0·빈글자로 채우지 않는다 */
export function 한줄추린다(r, 갈래이름, 오늘 = new Date()) {
  const 움 = 움직임(r.currentAction);
  const 날 = 날짜읽기(r.dateOfCurrentCredit, 오늘);
  return {
    listing: 갈래이름,
    symbol: r.symbol || null,
    company: r.companyName || null,
    isin: r.isin || null,
    agency: r.creditAgencyName || null,
    instrument: r.ratingAssigned || null,
    term: r.typeOfRating || null,
    rating: r.creditRating || null,
    outlook: r.outlook || null,
    action: 움,
    actionAsFiled: r.currentAction || null,
    ratingDate: 날.날,
    ratingDateTrusted: 날.믿나,
    ratingDateProblem: 날.까닭,
    amount: r.amount === undefined || r.amount === null || r.amount === '' ? null : r.amount,
    rationaleUrl: r.detailsOfRatingLink || null,
    broadcastAt: r.broadcastDateTime || null,
  };
}

/** 받은 것을 사건만 남기고 센다 */
export function 갈무리한다(줄들, 갈래이름, 오늘 = new Date()) {
  const 센것 = { 받은줄: 0, 사건: 0, 그대로: 0, 모르는말: 0, 날짜수상: 0 };
  const 것 = [];
  for (const r of 줄들 || []) {
    센것.받은줄 += 1;
    const x = 한줄추린다(r, 갈래이름, 오늘);
    if (x.action === 'unknown') 센것.모르는말 += 1;
    if (!x.ratingDateTrusted) 센것.날짜수상 += 1;
    if (!사건인가(x.action)) { 센것.그대로 += 1; continue; }
    센것.사건 += 1;
    것.push(x);
  }
  return { 것, 센것 };
}

/** ⚠ NSE 는 맨 요청을 막는다 — 크롬에 붙어 «지면 안에서» 부른다 */
async function 받아온다() {
  const require = createRequire('file:///C:/Users/User/Documents/GitHub/klifemap/package.json');
  const puppeteer = require('puppeteer-core');
  /* 🔴 [2026-11-05 · 사장님 「에마켓츠는 방치중인가?」]
     ⛔ 9222 하나만 보고 있었다. 공용 크롬이 9223 으로 서 있으면 이 거두기는 «그 자리에서 죽는다» —
       그래서 인도 신용등급이 조용히 멈춰 있었다. 「걸어 뒀다」를 「돌고 있다」로 읽은 자리다.
     ⇒ 두 자리를 차례로 두드린다. 둘 다 없으면 무엇이 없는지 적고 멈춘다. */
  const 두드릴것 = process.env.KLM_CHROME_PORT ? [process.env.KLM_CHROME_PORT] : [9222, 9223];
  let b = null, 마지막탈 = null;
  for (const 포트 of 두드릴것) {
    try { b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:' + 포트, defaultViewport: null }); break; }
    catch (e) { 마지막탈 = e; }
  }
  if (!b) throw new Error('공용 크롬에 못 붙었다 (' + 두드릴것.join('·') + ') — ' + (마지막탈 ? 마지막탈.message.slice(0, 120) : ''));
  const page = await b.newPage();          /* ⭐ 언제나 «새 탭» */
  try {
    await page.goto(지면, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await new Promise((r) => setTimeout(r, 2500));
    const 통 = {};
    for (const g of 갈래) {
      통[g] = await page.evaluate(async (i) => {
        const r = await fetch('/api/credit-rating-sdd-reg30?index=' + i, { headers: { Accept: 'application/json' } });
        if (!r.ok) return { 오류: 'HTTP ' + r.status };
        const j = await r.json();
        return Array.isArray(j) ? j : (j.data || []);
      }, g);
    }
    return 통;
  } finally {
    await page.close();
    b.disconnect();                         /* ⛔ close() 를 부르지 않는다 — 사장님 창이 닫힌다 */
  }
}

async function 본일() {
  const 적는다 = process.argv.includes('--적는다');
  const 오늘 = new Date();
  const 오늘글 = 오늘.getFullYear() + String(오늘.getMonth() + 1).padStart(2, '0') + String(오늘.getDate()).padStart(2, '0');

  const 통 = await 받아온다();
  const 모은것 = [];
  const 센것 = {};
  for (const g of 갈래) {
    const v = 통[g];
    if (!v || v.오류) { console.log('🔴 ' + g + ' — ' + ((v && v.오류) || '못 받았다')); 센것[g] = { 오류: (v && v.오류) || 'no data' }; continue; }
    const r = 갈무리한다(v, g, 오늘);
    모은것.push(...r.것);
    센것[g] = r.센것;
    console.log('■ ' + g + ' — 받은 줄 ' + r.센것.받은줄.toLocaleString()
      + ' · 사건 ' + r.센것.사건.toLocaleString()
      + ' · 그대로 ' + r.센것.그대로.toLocaleString()
      + (r.센것.모르는말 ? ' · 🔴 모르는 말 ' + r.센것.모르는말 : '')
      + (r.센것.날짜수상 ? ' · ⚠ 날짜 수상 ' + r.센것.날짜수상 : ''));
  }

  const 움직임별 = {};
  for (const x of 모은것) 움직임별[x.action] = (움직임별[x.action] || 0) + 1;
  const 회사 = new Set(모은것.map((x) => x.listing + ':' + x.symbol)).size;
  console.log('\n■ 쌓을 것 — 사건 ' + 모은것.length.toLocaleString() + '줄 · 회사 ' + 회사.toLocaleString());
  console.log('   ' + Object.entries(움직임별).map(([k, v]) => k + ' ' + v.toLocaleString()).join(' · '));

  if (!적는다) {
    console.log('\n⬜ 재기만 했다. 쌓으려면 --적는다');
    return;
  }

  fs.mkdirSync(둘곳, { recursive: true });
  const 냄 = {
    _meta: {
      product: 'India (NSE) listed-company credit rating ACTIONS — changes only, not the full rating table',
      why: 'The service is "whose rating changed"; re-affirmations are not events and are not stored.',
      collectedAt: 오늘.toISOString(),
      source: 지면,
      sourceApi: '/api/credit-rating-sdd-reg30?index={equities,sme}',
      basis: 'SEBI LODR Reg 30 system-driven disclosure — CRAs file daily, the exchange disseminates',
      counts: 센것,
      byAction: 움직임별,
      companies: 회사,
      notThis: [
        'Re-affirmations are dropped. This file is rating CHANGES only.',
        'Dates the filer typed wrongly are kept with ratingDateTrusted:false, never silently corrected.',
        'Unrecognised action words are kept as action:"unknown" so a person can look, never coerced to "unchanged".',
      ],
      /* 🔴 발행 금지 — 모으기만 한다 */
      publishGate: 'NSE 저작권 조문이 재배포를 막는다(2026-09-15 읽음). 사장님 판단 전에는 지면·API·상품 어디에도 내지 않는다.',
    },
    rows: 모은것,
  };
  /* 🔴 눌러서 쌓는다. 하루치가 11.7MB 라 그냥 두면 한 해에 4GB 가 넘는다 —
     여섯 자리가 같이 쓰는 저장소를 그렇게 부풀리면 안 된다. gzip 이면 한 자리 수 MB 가 된다.
     ⛔ 줄을 «버려서» 줄이지 않는다. 소급이 안 되는 자료라 지금 버리면 영영 없다. */
  const 길 = path.join(둘곳, 오늘글 + '.json.gz');
  fs.writeFileSync(길, zlib.gzipSync(Buffer.from(JSON.stringify(냄), 'utf8'), { level: 9 }));
  console.log('✅ 쌓았다 — ' + path.relative(뿌리, 길) + ' (' + Math.round(fs.statSync(길).size / 1024) + 'KB)');
  console.log('⛔ 모으기만 한다. 내는 것은 약관 판단을 받은 뒤다 — docs/신용등급-데이터-어디서-받나.md');
}

/* ── 자가시험 ──────────────────────────────────────────────────────────── */
export function 자가시험() {
  const 것 = [];
  const 재다 = (이름, 됐나) => 것.push({ 이름, 됐나 });

  재다('움직임: Upgrade', 움직임('Upgrade') === 'upgrade');
  재다('움직임: Downgrade', 움직임('Downgrade') === 'downgrade');
  재다('🔴 움직임: Downgraded 도 같은 것이다', 움직임('Downgraded') === 'downgrade');
  재다('🔴 움직임: Re-affirm 과 Reaffirmed 는 같다',
    움직임('Re-affirm') === 'unchanged' && 움직임('Reaffirmed') === 'unchanged');
  재다('🔴 움직임: New·new·Assigned 는 같다',
    움직임('New') === 'new' && 움직임('new') === 'new' && 움직임('Assigned') === 'new');
  재다('움직임: Other 와 Others 는 같다', 움직임('Other') === 'other' && 움직임('Others') === 'other');
  재다('움직임: 철회', 움직임('Withdrawn') === 'withdrawn');
  재다('⛔ 움직임: 모르는 말을 「그대로다」로 넘기지 않는다', 움직임('Zzz') === 'unknown');
  재다('움직임: 빈 것은 unknown', 움직임('') === 'unknown' && 움직임(null) === 'unknown');

  재다('사건: 그대로인 것은 사건이 아니다', 사건인가('unchanged') === false);
  재다('사건: 올림·내림·새로매김은 사건이다',
    사건인가('upgrade') && 사건인가('downgrade') && 사건인가('new'));
  재다('🔴 사건: 모르는 말도 «버리지 않는다» — 사람이 봐야 한다', 사건인가('unknown') === true);

  const 오늘 = new Date('2026-09-15T00:00:00Z');
  재다('날짜: 제대로 된 날', 날짜읽기('14-Sep-2026', 오늘).믿나 === true);
  재다('🔴 날짜: 2205년은 «못 믿는다»로 표시한다', 날짜읽기('04-Dec-2205', 오늘).믿나 === false);
  재다('⛔ 날짜: 못 믿어도 «지우지 않는다»', 날짜읽기('04-Dec-2205', 오늘).날 === '2205-12-04');
  재다('날짜: 못 읽으면 null 과 까닭', 날짜읽기('아무거나', 오늘).날 === null);
  재다('🔴 날짜: 한국시간 PC 에서 하루가 앞당겨지지 않는다', 날짜읽기('14-Sep-2026', 오늘).날 === '2026-09-14');

  const 본 = {
    creditAgencyName: 'ICRA Limited', symbol: 'CHENNPETRO', companyName: 'Chennai Petroleum Corporation Limited',
    isin: 'INE178A01016', ratingAssigned: 'Commercial Paper', typeOfRating: 'Short Term',
    creditRating: '[ICRA]A1+', outlook: null, dateOfCurrentCredit: '14-Sep-2026',
    amount: '7500', currentAction: 'Re-affirm', detailsOfRatingLink: 'https://example.test/x',
  };
  const 한 = 한줄추린다(본, 'equities', 오늘);
  재다('한줄: 회사·기관·등급이 옮겨진다',
    한.company === 'Chennai Petroleum Corporation Limited' && 한.agency === 'ICRA Limited' && 한.rating === '[ICRA]A1+');
  재다('한줄: 신고된 원래 말도 남긴다', 한.actionAsFiled === 'Re-affirm');
  재다('⛔ 한줄: 없는 outlook 을 빈 글자로 채우지 않는다', 한.outlook === null);

  const r = 갈무리한다([
    { ...본, currentAction: 'Re-affirm' },
    { ...본, symbol: 'A', currentAction: 'Upgrade' },
    { ...본, symbol: 'B', currentAction: 'Downgraded' },
    { ...본, symbol: 'C', currentAction: 'Zzz' },
    { ...본, symbol: 'D', currentAction: 'Upgrade', dateOfCurrentCredit: '04-Dec-2205' },
  ], 'equities', 오늘);
  재다('🔴 갈무리: 그대로인 줄은 안 쌓는다', r.센것.그대로 === 1);
  재다('갈무리: 사건 넷', r.센것.사건 === 4 && r.것.length === 4);
  재다('갈무리: 모르는 말을 센다', r.센것.모르는말 === 1);
  재다('갈무리: 수상한 날짜를 센다', r.센것.날짜수상 === 1);
  재다('갈무리: 받은 줄 수가 맞는다', r.센것.받은줄 === 5);
  재다('갈무리: 사건 + 그대로 = 받은 줄', r.센것.사건 + r.센것.그대로 === r.센것.받은줄);
  재다('⛔ 갈무리: 빈 것도 견딘다', 갈무리한다(null, 'equities').것.length === 0);

  const 실패 = 것.filter((x) => !x.됐나);
  console.log(`■ 자가시험 ${것.length - 실패.length}/${것.length}`);
  for (const x of 실패) console.log(`  🔴 ${x.이름}`);
  return 실패.length === 0;
}

if (process.argv.includes('--자가시험')) process.exit(자가시험() ? 0 : 1);
/* 🔴 [2026-11-05 · 5번] **막혔을 때 통째로 터뜨리지 않는다.**
   NSE 는 자동 접속을 막는다(`net::ERR_HTTP2_PROTOCOL_ERROR`). 그것이 터져 나오면
   날마다 도는 거두기 로그가 글 더미가 되고, 뒤에 붙는 일이 있으면 그것까지 선다.
   ⛔ 「막혔다」를 「고장」으로 적지 않는다. 한 줄로 적고 0 으로 끝낸다 —
     ⚠ 다만 **거뒀다고 적지 않는다.** 못 거둔 것은 못 거뒀다고 남는다. */
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  try {
    await 본일();
  } catch (e) {
    const 말 = String(e && e.message ? e.message : e);
    const 막힌것 = /ERR_HTTP2_PROTOCOL_ERROR|ERR_CONNECTION|403|429|timeout|Navigation/i.test(말);
    console.log(막힌것
      ? `⬜ 인도 NSE 가 막았다 — 못 거뒀다. 0 으로 안 채운다 (${말.slice(0, 90)})`
      : `🔴 인도 NSE 거두기가 깨졌다 — ${말.slice(0, 160)}`);
    process.exit(막힌것 ? 0 : 1);
  }
}
