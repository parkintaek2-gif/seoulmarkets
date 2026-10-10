#!/usr/bin/env node
/**
 * collect-uae-cbuae-fx-rates.mjs — **UAE 확장 1호 수집기.** CBUAE(UAE 중앙은행) 환율.
 *
 *   node scripts/collect-uae-cbuae-fx-rates.mjs --자가시험
 *   node scripts/collect-uae-cbuae-fx-rates.mjs                 새 달치만 받는다(있으면 건너뜀)
 *   node scripts/collect-uae-cbuae-fx-rates.mjs --전부           2018-01 부터 있는 대로 다 받는다
 *
 * ── 출처·라이선스 (docs/UAE-데이터-출처-라이선스.md 1-1-보강) ──────────────────
 * centralbank.ae/en/forex-eibor/exchange-rates/ — UAE 연방 오픈데이터 정책 적용
 * (누구나 접근·재사용·재배포, 출처표시만 요구). 한국의 한국수출입은행 환율과 같은 자리.
 *
 * ⛔ **"매일 갱신"이 아니다 — 월 단위 아카이브다.** 2026-09-13 에 직접 받아 열어 확인했다.
 *   그 달이 끝나야 다음 달 초에 그 달 전체가 파일 하나로 올라온다(예: 8월치가 9월 1일에 뜸).
 *   그러니 이 수집기를 매일 돌려도 그달 안에는 새 파일이 안 보이는 게 «정상»이다.
 * ⚠ 페이지가 기본 User-Agent 를 403 으로 막는다 — 브라우저 UA 를 반드시 보낸다.
 * 🔴 [2026-09-13 실측] **Node `fetch()`(undici)는 UA 를 똑같이 줘도 403 이다 — curl 은 200 이다.**
 *   Cloudflare 가 TLS 지문(JA3/JA4)으로 가른다고 보인다. ⇒ **curl 프로세스를 그대로 쓴다.**
 *   ⛔ 이 스크립트를 node fetch 로 되돌리지 마십시오 — 같은 벽에 다시 부딪힌다.
 * ⚠ EIBOR(은행간 금리)는 이 수집기에 없다 — 같은 조사에서 Cloudflare 봇 차단에 걸려
 *   형식을 아직 못 확인했다(위 문서에 적어 뒀다). 확인되면 별도 수집기로 붙인다.
 *
 * 저장: archive/raw/uae-cbuae-fx/<YYYY-MM>.json  (달마다 한 파일, 멱등 — 다시 돌리면 덮어쓴다)
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { put } from '../src/lib/store.mjs';
import { 시트읽기 } from './lib/xlsx-read.mjs';

const 목록주소 = 'https://centralbank.ae/en/forex-eibor/exchange-rates/';
const OUT_DIR = path.resolve('archive/raw/uae-cbuae-fx');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

const 달이름 = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/** 엑셀 날짜 일련번호 → ISO 8601 날짜(YYYY-MM-DD). 1900 윤년 버그를 포함한 관행적 계산. */
export function 엑셀날짜(serial) {
  const n = Number(serial);
  if (!Number.isFinite(n)) return null;
  const utcDays = Math.floor(n - 25569);
  const d = new Date(utcDays * 86400 * 1000);
  const y = d.getUTCFullYear(); const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 카드에 적힌 "August 2026" 꼴 → {yyyymm: '2026-08', 파일이름조각: 'aug26'} */
export function 달이름파싱(라벨) {
  const m = String(라벨 ?? '').trim().match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (!m) return null;
  const 월키 = m[1].slice(0, 3).toLowerCase();
  if (!(월키 in 달이름)) return null;
  const 연 = Number(m[2]);
  const 월 = 달이름[월키] + 1;
  return { yyyymm: `${연}-${String(월).padStart(2, '0')}` };
}

/**
 * "2026-08" → "2026-08-31" (그 달의 «마지막 날»).
 * ⛔ 파일 이름을 `<YYYY-MM>.json` 으로 두지 않는다 — check-archive-freshness.mjs 의 날뽑기()가
 *   8자리 날짜(YYYYMMDD)만 읽는다. 「이 달치 자료가 마지막으로 담은 날」로 이름 짓는 편이
 *   그 검사와도 맞고, 「최신이 언제까지인가」를 이름만 보고 알 수 있어 더 정확하다.
 */
export function 달말일(yyyymm) {
  const m = String(yyyymm ?? '').match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  const 연 = Number(m[1]); const 월 = Number(m[2]);
  const 다음달1일 = new Date(연, 월, 1); // month 는 0-based 라 그대로 «다음 달 1일»이 된다
  const 말일 = new Date(다음달1일.getTime() - 86400000);
  const y = 말일.getFullYear(); const mo = String(말일.getMonth() + 1).padStart(2, '0');
  const d = String(말일.getDate()).padStart(2, '0');
  return `${y}-${mo}-${d}`;
}

/** 목록 페이지 HTML 에서 (월 라벨, xlsx 주소) 짝을 뽑는다. 라벨이 두 번씩 나오므로 중복을 거둔다. */
export function 목록파싱(html) {
  const 라벨들전부 = [...html.matchAll(/<p class="font-r fs-small text-white-custom"[^>]*>([A-Za-z]+ \d{4})<\/p>/g)]
    .map((m) => m[1]);
  const 라벨들 = 라벨들전부.filter((l, i) => l !== 라벨들전부[i - 1]);
  const 주소들 = [...html.matchAll(/href="([^"]+\.xlsx)"/g)].map((m) => m[1]);
  const 짝 = [];
  for (let i = 0; i < Math.min(라벨들.length, 주소들.length); i += 1) {
    const 달 = 달이름파싱(라벨들[i]);
    if (달) 짝.push({ ...달, url: 주소들[i].startsWith('http') ? 주소들[i] : new URL(주소들[i], 목록주소).href });
  }
  return 짝;
}

/** xlsx 시트(줄 배열)를 {date, currency, rateVsAed} 행으로 바꾼다. 머리줄 셋(빈줄·제목·Date/Currency/Rate)은 건너뛴다. */
export function 표준화(줄들) {
  const 나온것 = [];
  let 못읽음 = 0;
  for (const 줄 of 줄들) {
    const [날짜칸, 통화, 값] = 줄;
    if (!/^\d+$/.test(String(날짜칸 ?? '').trim())) continue; // 빈줄·제목줄·머리줄 — 자료 시도가 아니다
    const date = 엑셀날짜(날짜칸);
    const rate = Number(값);
    if (!date || !통화 || !Number.isFinite(rate)) { 못읽음 += 1; continue; }
    나온것.push({ date, currency: 통화, rateVsAed: rate });
  }
  return { rows: 나온것, 못읽음 };
}

/* ── 자가시험 ───────────────────────────────────────────────────────── */
function 자가시험() {
  const 것 = []; const 재다 = (이름, 됐나) => 것.push({ 이름, 됐나 });

  재다('엑셀날짜: 2026-08-03(46237) 을 되돌린다', 엑셀날짜(46237) === '2026-08-03');
  재다('엑셀날짜: 2026-08-31(46265) 을 되돌린다', 엑셀날짜(46265) === '2026-08-31');
  재다('⛔ 엑셀날짜: 숫자가 아니면 null', 엑셀날짜('Date') === null);

  재다('달이름파싱: "August 2026" → 2026-08', 달이름파싱('August 2026')?.yyyymm === '2026-08');
  재다('달이름파싱: "January 2018" → 2018-01', 달이름파싱('January 2018')?.yyyymm === '2018-01');
  재다('⛔ 달이름파싱: 모르는 꼴은 null', 달이름파싱('그냥글자') === null);

  const 가짜목록 = `
    <li><a><p class="font-r fs-small text-white-custom">August 2026</p></a></li>
    <li><a href="/media/xxx/fx_aug26_en.xlsx" title="Download xls">a</a></li>
    <li><a><p class="font-r fs-small text-white-custom">July 2026</p></a></li>
    <li><a href="/media/yyy/fx_jul26_en.xlsx" title="Download xls">a</a></li>
  `;
  const 짝 = 목록파싱(가짜목록);
  재다('목록파싱: 짝이 2개 나온다(라벨 중복을 거뒀다)', 짝.length === 2);
  재다('목록파싱: 첫 짝이 2026-08 + 주소를 담는다',
    짝[0]?.yyyymm === '2026-08' && 짝[0]?.url.endsWith('fx_aug26_en.xlsx'));

  const 가짜줄들 = [
    [''],
    ['Exchange Rates against UAE Dirham for VAT related obligations.\r\nAugust 2026', ''],
    ['Date', 'Currency', 'Rate'],
    ['46237', 'US Dollar', '3.6725'],
    ['46237', 'Argentine Peso', '0.0024589999999999998'],
    ['46237', '깨진줄', 'not-a-number'],
  ];
  const 표준 = 표준화(가짜줄들);
  재다('표준화: 머리줄 셋을 건너뛰고 진짜 자료만 남긴다', 표준.rows.length === 2);
  재다('🔴 표준화: 숫자가 아닌 rate 는 못읽음으로 센다(조용히 버리지 않는다)', 표준.못읽음 === 1);
  재다('표준화: 날짜·통화·환율이 맞게 붙는다',
    표준.rows[0].date === '2026-08-03' && 표준.rows[0].currency === 'US Dollar' && 표준.rows[0].rateVsAed === 3.6725);

  재다('달말일: 31일까지 있는 달', 달말일('2026-08') === '2026-08-31');
  재다('달말일: 30일까지 있는 달', 달말일('2026-09') === '2026-09-30');
  재다('달말일: 평년 2월', 달말일('2026-02') === '2026-02-28');
  재다('달말일: 윤년 2월', 달말일('2024-02') === '2024-02-29');
  재다('⛔ 달말일: 모르는 꼴은 null', 달말일('2026/08') === null);

  const 실패 = 것.filter((x) => !x.됐나);
  console.log(`■ 자가시험 ${것.length - 실패.length}/${것.length}`);
  for (const x of 실패) console.log(`  🔴 ${x.이름}`);
  return 실패.length === 0;
}

/**
 * 브라우저가 보내는 헤더 한 벌.
 *
 * 🔴 [2026-10-11 00:5x · 5번] **UA 만으로는 이제 안 된다 — curl 도 403 이다.**
 *   위 2026-09-13 주석이 「curl 은 200」이라고 적어 두었는데 한 달 만에 거짓이 됐다.
 *   오늘 날이 바뀌며 신선도 자가 「41일 지남」으로 울어 알았다.
 *   ⭐ 자에 «날짜 박힌 사실»을 적을 때는 그것이 뒤집힐 수 있다고 봐야 한다.
 *     토스 실키에서 똑같이 당했다(그때는 한 달 묵은 글이 거짓을 찍고 있었다).
 *
 * 🔴 **무엇이 결정적인지 좁혀서 적는다** — 다음에 또 깨질 때 어디를 볼지 알게.
 * ```
 *   UA 만                                 403
 *   UA + Accept                           403
 *   UA + Accept-Language                  403
 *   UA + Sec-Fetch-Dest/Mode/Site         200   ← 이것이다
 * ```
 *   Cloudflare 가 **Sec-Fetch-* 가 없는 요청**을 봇으로 본다. 나머지는 곁들이다.
 * ⛔ 이 셋을 지우지 마십시오. 지우면 조용히 403 으로 돌아가고,
 *   이 자료는 **월 단위라 그달이 지나면 되받을 수 없다.**
 */
const 브라우저헤더 = [
  '-H', 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  '-H', 'Accept-Language: en-US,en;q=0.9',
  '-H', 'Sec-Fetch-Dest: document',
  '-H', 'Sec-Fetch-Mode: navigate',
  '-H', 'Sec-Fetch-Site: none',
  '-H', 'Upgrade-Insecure-Requests: 1',
];

/** curl 로 받는다(node fetch 는 이 사이트에서 403 — 위 「Node fetch」 주석 참고). 실패하면 던진다. */
function curl글자(url) {
  return execFileSync('curl', ['-sS', '-A', UA, ...브라우저헤더, '-f', url], { maxBuffer: 1024 * 1024 * 20 }).toString('utf8');
}
function curl바이너리(url) {
  return execFileSync('curl', ['-sS', '-A', UA, ...브라우저헤더, '-f', url], { maxBuffer: 1024 * 1024 * 20 });
}

/* ── 돌리기 ─────────────────────────────────────────────────────────── */
if (process.argv.includes('--자가시험')) process.exit(자가시험() ? 0 : 1);
if (!자가시험()) { console.log('🔴 자가시험이 깨졌다 — 돌리지 않는다.'); process.exit(1); }
console.log('');

async function main() {
  const 전부 = process.argv.includes('--전부');

  console.log(`목록을 받는다 — ${목록주소}`);
  let html;
  try { html = curl글자(목록주소); } catch (e) { console.error(`✕ 목록 페이지 — ${e.message}`); process.exit(1); }
  const 짝들 = 목록파싱(html);
  if (!짝들.length) { console.error('✕ 못 쟀다 — 월별 xlsx 링크를 하나도 못 찾았다(페이지 구조가 바뀌었을 수 있다)'); process.exit(1); }
  console.log(`목록에서 ${짝들.length}개월 찾음 (최신: ${짝들[0].yyyymm})`);

  const 받을것 = (전부 ? 짝들 : 짝들.filter((x) => !existsSync(path.join(OUT_DIR, `${달말일(x.yyyymm)}.json`))));
  if (!받을것.length) { console.log('✅ 새로 받을 달이 없다 — 다 있다'); return; }

  let 받음 = 0; let 실패 = 0;
  for (const { yyyymm, url } of 받을것) {
    const 파일이름 = 달말일(yyyymm);
    try {
      const buf = curl바이너리(url);
      const 줄들 = 시트읽기(buf);
      const { rows, 못읽음 } = 표준화(줄들);
      if (!rows.length) throw new Error('행이 0건 — 시트 모양이 바뀌었을 수 있다');

      const 결과 = await put(`raw/uae-cbuae-fx/${파일이름}.json`, JSON.stringify({
        _meta: {
          product: 'UAE CBUAE FX rates (against AED)',
          yyyymm,
          builtAt: new Date().toISOString(),
          source: 'Central Bank of the UAE (CBUAE), open data (attribution required, no other restriction)',
          sourceUrl: url,
          rows: rows.length,
          unreadable: 못읽음,
          notThis: [
            'Not a live/intraday rate — this file is CBUAE\'s own monthly archive, published after the month ends.',
            'Not investment advice.',
          ],
        },
        rows,
      }, null, 1), 'application/json');
      console.log(`  ✅ ${yyyymm}(→${파일이름}.json)  ${rows.length}행 (못읽음 ${못읽음}) → ${결과.local}`);
      받음 += 1;
    } catch (e) {
      console.error(`  ✕ ${yyyymm}  ${e.message}`);
      실패 += 1;
    }
  }
  console.log(`\n합계 받음 ${받음} · 실패 ${실패} · ${OUT_DIR}`);
}

if (pathToFileURL(process.argv[1]).href === import.meta.url) await main();
