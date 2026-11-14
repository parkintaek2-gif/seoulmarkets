#!/usr/bin/env node
/**
 * 증권사 **자사 사이트 직접** 수집기.
 *
 *   npm run collect:broker                  전 증권사 최근 1페이지
 *   npm run collect:broker -- --dry         저장하지 않고 파싱 결과만 본다
 *   npm run collect:broker -- --only=mirae  한 곳만
 *   npm run collect:broker -- --pages=3
 *
 * ── 왜 따로 만드나 ─────────────────────────────────────────────
 * `collect-research.mjs` 는 네이버 금융 경로다. 66,093건이 거기서 왔다.
 * 그 경로에는 **없는 것이 하나 있다 — 애널리스트 이름.**
 * 네이버 화면에 안 나오기 때문이다. 정규식으로 짜내 보려다 0.3% 만 채우고
 * 그나마 「애널리스트 대상으로」 같은 문장 조각이 섞여 전부 버렸다.
 *
 * **증권사 자기 사이트에는 작성자가 그냥 적혀 있다.**
 * 그게 이 수집기의 존재 이유다. 「누가 맞혔나」는 이름이 있어야 성립한다.
 *
 * 사장님 지시(2026-08-03): 「최신 애널 리포트는 직접 받든지 갖고 와.
 * 우린 인터넷신문으로 등록하니까」 · 「매일 증권사 사이트 다 방문해서 수집한다」
 *
 * ── 🔴 무엇을 가져오고 무엇을 안 가져오는가 ───────────────────
 *
 * ⚠ **미래에셋증권 리서치 목록 페이지에 이런 문구가 있다.** 그대로 옮긴다.
 *
 *   「본 리서치 보고서의 지적재산권은 당사에 있으므로, 당사와 협약 또는 허락없이
 *    무단 복제 및 배포할 수 없습니다. 당사의 리서치 보고서를 다운로드 또는
 *    **자동 대량 수집**하여 무단 전재 및 **상업적 재배포**하는 행위는 저작권법에 의한
 *    저작권 침해에 해당되어 처벌 받을 수 있습니다.」
 *
 * robots.txt 보다 강한, **명시적 고지**다. 못 본 척하지 않는다.
 * 그래서 이 수집기는 고지가 금지하는 대상 — **보고서** — 을 아예 건드리지 않는다.
 *
 *   가져온다 (사실. 저작권의 대상이 아니다)
 *     발행일 · 증권사 · 종목명 · 종목코드 · 투자의견 · 목표주가 · **애널리스트**
 *
 *   안 가져온다 (저작물)
 *     ✗ PDF 원문        ← 「리포트 그 자체」다
 *     ✗ 본문·요약 전문   ← 상세 페이지에 전문이 있지만 **저장하지 않는다**
 *     ✗ 차트·표 이미지
 *
 * 상세 페이지는 **목표주가 한 숫자를 읽으려고만** 연다. 읽은 뒤 본문은 버린다.
 * 제목은 식별자로만 남기고 재배포하지 않는다.
 *
 * 요청 간격을 넉넉히 두고, 신원을 밝히는 User-Agent 를 쓴다.
 * 이건 예의가 아니라 우리가 인터넷신문이기 때문이다.
 *
 * ── ⚠ 24곳 중 지금 되는 곳은 2곳이다 ──────────────────────────
 * 홈페이지가 전부 JS 껍데기(2~7KB)라 링크를 못 딴다. 사이트맵도 대부분 없다.
 * **한양 하나로 22곳을 단정하지 않는다**는 원칙대로, 확인된 곳만 넣었다.
 * 나머지는 브라우저로 리서치 주소를 확인한 뒤 하나씩 추가한다.
 * 표를 늘리는 것이 이 파일을 고치는 유일한 방법이다.
 */

import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { put, get, storeStatus } from '../src/lib/store.mjs';

const UA = 'Mozilla/5.0 (compatible; SeoulMarketsBot/0.1; +https://seoulmarkets.com/about)';
const ARCHIVE = path.resolve(process.env.ARCHIVE_DIR ?? 'archive');

const argv = process.argv.slice(2);
const DRY = argv.includes('--dry');
const PAGES = Number(argv.find((a) => a.startsWith('--pages='))?.slice(8)) || 1;
const ONLY = argv.find((a) => a.startsWith('--only='))?.slice(7) ?? null;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 한국시간. 이 PC 는 이미 KST 라 `new Date()` 를 그대로 쓴다 — 9시간을 더하면 틀린다. */
function stamp(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
}
const today = () => stamp().slice(0, 10);

/**
 * 증권사 사이트는 EUC-KR 이 아직도 흔하다. 헤더가 utf-8 이라고 적혀 있어도
 * 실제 바이트는 EUC-KR 인 경우가 있다(네이버 금융에서 이미 겪었다).
 * 그래서 **선언을 믿지 않고 바이트를 본다** — 한글이 안 나오면 다른 인코딩으로 다시 푼다.
 */
async function fetchHtml(url, charsetHint) {
  const res = await fetch(url, {
    headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml' },
    signal: AbortSignal.timeout(20000),
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const 후보 = charsetHint ? [charsetHint, 'utf-8', 'euc-kr'] : ['utf-8', 'euc-kr'];
  let 최선 = '';
  let 최다 = -1;
  for (const enc of 후보) {
    let t;
    try { t = new TextDecoder(enc).decode(buf); } catch { continue; }
    // 깨진 인코딩은 U+FFFD 가 쏟아진다. 한글이 가장 많이 나온 해석을 고른다.
    const 한글 = (t.match(/[가-힣]/g) ?? []).length - (t.match(/�/g) ?? []).length * 2;
    if (한글 > 최다) { 최다 = 한글; 최선 = t; }
  }
  return 최선;
}

const 태그제거 = (s) =>
  s.replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

/**
 * 목표주가를 한 줄에서 읽는다.
 *
 * 증권사마다 쓰는 말이 다르다 — 목표주가 · 목표가 · 적정주가 · 적정가치 · TP.
 * 단위도 다르다 — 「15만원」 「150,000원」 「15.0만원」.
 * ⚠ **찾은 척하지 않는다.** 못 읽으면 null 이다. 0 이나 추정치를 넣지 않는다.
 */
/**
 * 🔴🔴 [2026-11-14 · 5번] **Next.js 로 갈아탄 사이트에서 자료를 꺼낸다.**
 *
 * 한양증권이 사이트를 Next.js 로 새로 지었다. 옛 주소는 200 을 주지만 알맹이가 없다 —
 * 그래서 수집이 **날마다 0건**이면서 실패로도 안 잡혔다. 「200 이니 멀쩡하다」가 아니다.
 *
 * Next.js 는 서버에서 만든 자료를 `self.__next_f.push([1,"…"])` 조각으로 흘려 보낸다.
 * 조각을 이어 붙이면 그 안에 JSON 이 통째로 들어 있다.
 * ⛔ 정규식으로 JSON 을 자르지 않는다 — 중첩 괄호에서 반드시 깨진다.
 *   **괄호 균형**으로 떼어 낸다. 따옴표 안의 괄호는 세지 않는다.
 */
export function 넥스트조각잇기(html) {
  let 이은글 = '';
  for (const m of String(html ?? '').matchAll(/self\.__next_f\.push\(\[1,\s*"((?:[^"\\]|\\.)*)"\]\)/g)) {
    /* 조각 하나가 깨져도 나머지는 쓴다 — 한 조각 때문에 전부를 버리지 않는다 */
    try { 이은글 += JSON.parse('"' + m[1] + '"'); } catch { /* 넘어간다 */ }
  }
  return 이은글;
}

/** 이은 글에서 `머리` 로 시작하는 JSON 덩이를 괄호 균형으로 떼어 «쓸 만한 것»을 돌려준다 */
export function 덩이떼기(글, 머리, 쓸만한가 = () => true) {
  const g = String(글 ?? '');
  let 자리 = -1;
  while ((자리 = g.indexOf(머리, 자리 + 1)) !== -1) {
    let 깊이 = 0, 따옴표 = false, 탈출 = false;
    for (let i = 자리; i < g.length; i++) {
      const c = g[i];
      if (탈출) { 탈출 = false; continue; }
      if (c === '\\') { 탈출 = true; continue; }
      if (c === '"') { 따옴표 = !따옴표; continue; }
      if (따옴표) continue;
      if (c === '{') 깊이++;
      else if (c === '}') {
        깊이--;
        if (깊이 === 0) {
          try {
            const j = JSON.parse(g.slice(자리, i + 1));
            if (쓸만한가(j)) return j;
          } catch { /* 다음 덩이를 본다 */ }
          break;
        }
      }
    }
  }
  return null;   /* ⛔ 못 찾았으면 null 이다. 빈 것을 「0건」으로 내지 않는다 */
}

export function parseTargetPrice(text) {
  if (!text) return null;

  const 라벨 = '(?:목표\\s*주?가|적정\\s*주?가|적정가치|목표가|TP)\\s*(?:를|을|는|은)?\\s*(?:기존\\s*)?';
  const 금액 = '([0-9][0-9,.]*)\\s*(만원|원)';

  const 값으로 = (n, 단위) => {
    const x = Number(String(n).replace(/,/g, ''));
    if (!Number.isFinite(x) || x <= 0) return null;
    const v = 단위 === '만원' ? Math.round(x * 10000) : Math.round(x);
    // 한국 주식에서 1만원 미만 목표주가는 있지만 100원 미만은 파싱 사고다.
    return v >= 100 && v <= 100_000_000 ? v : null;
  };

  /*
   * ⚠ 순서를 반드시 이 순서로 본다. 뒤집으면 **옛 목표가를 집는다.**
   *
   *   「목표주가를 245,000원에서 280,000원으로 상향」
   *
   *   위 문장에서 단순 규칙은 245,000 을 집는다 — 그건 **바뀌기 전 값**이다.
   *   HD현대 건에서 실제로 280,000 이 맞았는데, 앞 문단에 새 값이 먼저 나와서
   *   **우연히** 맞은 것이었다. 문장이 하나뿐이었으면 틀렸다.
   *   그래서 「A에서 B로」 꼴을 먼저 잡고 **B** 를 쓴다.
   */
  const 변경 = text.match(new RegExp(라벨 + 금액 + '\\s*에서\\s*' + 금액 + '\\s*(?:으?로)', 'i'));
  if (변경) return 값으로(변경[3], 변경[4]);

  const m = text.match(new RegExp(라벨 + 금액, 'i'));
  return m ? 값으로(m[1], m[2]) : null;
}

/** 투자의견을 우리 어휘로 정규화한다. 증권사 표기가 제각각이다. */
/**
 * ⭐ [2026-09-03 5번 발견] 다시 돌리면 collectedAt이 「처음 받은 때」를 잃고
 * 「마지막으로 다시 쓴 때」로 덮였다 — 아카이빙은 소급이 안 되는 유일한 항목이라
 * 「언제 처음 받았나」가 지워지면 되찾을 길이 없다. 옛 파일이 있으면 그 시각을 지킨다.
 * ⛔ firstCollectedAt은 한 번 정해지면 안 바뀐다. collectedAt은 이번 실행 시각으로 매번 갱신한다(마지막으로 다시 쓴 때).
 */
export function 처음받은때(옛본문JSON, 이번수집시각) {
  if (!옛본문JSON) return 이번수집시각;
  try {
    const 옛 = JSON.parse(옛본문JSON);
    return 옛.firstCollectedAt ?? 옛.collectedAt ?? 이번수집시각;
  } catch {
    return 이번수집시각;
  }
}

export function normalizeRating(s) {
  if (!s) return null;
  const t = s.trim().toUpperCase().replace(/\s+/g, '');
  if (/^(매수|BUY|STRONGBUY|적극매수)$/.test(t)) return 'BUY';
  if (/^(중립|HOLD|NEUTRAL|MARKETPERFORM)$/.test(t)) return 'HOLD';
  if (/^(매도|SELL|REDUCE|UNDERPERFORM|비중축소)$/.test(t)) return 'SELL';
  if (/^(N\.?R\.?|NOTRATED|의견없음)$/.test(t)) return 'NR';
  return null; // 모르면 모른다고 한다
}

/* ────────────────────────────────────────────────────────────
   증권사별 어댑터
   ⚠ 실제로 받아 보고 확인한 곳만 넣는다. 추측한 경로를 넣지 않는다.
   ──────────────────────────────────────────────────────────── */

const 증권사 = {
  /**
   * 미래에셋증권 — 2026-08-03 실측. 전체 2,596건.
   * 목록:  /bbs/board/message/list.do?categoryId=1521&pageIndex=N
   * 상세:  /bbs/board/message/view.do?messageId={id}&categoryId=1521
   * 목록 제목에 「S-Oil (010950/매수)」 꼴로 종목·코드·의견이 다 들어 있다.
   * 목표주가만 상세 첫 문단에 있다.
   */
  mirae: {
    ko: '미래에셋증권',
    origin: 'https://securities.miraeasset.com',
    /*
     * 🔴 [2026-09-03 5번 발견 · 6번 재확인] categoryId=1521은 「리서치 리포트 › 전체」다.
     * 「전체」는 마켓뷰·글로벌브리핑·해외종목(RELIANCE IN·CRDO US 등 알파벳 티커) 등이
     * 최근 목록에 섞여 있어, 최근 10건이 전부 6자리 국내 코드가 아닌 날이 흔하다 —
     * 그래서 parseList가 code:null로 «정확히» 걸러내는데, main()의 `if (!r.code) continue`가
     * 그걸 실패 0·성공 0으로 조용히 넘겨 "파서가 죽었다"처럼 보였다(실은 그 배치에 국내
     * 종목 리포트가 없었을 뿐). 실측(브라우저로 직접 확인): categoryId=1800(기업분석)이
     * 진짜 국내 종목 리포트를 담는 하위분류다 — 현대건설(000720)·SK텔레콤(017670) 등
     * 6자리 코드가 실제로 나온다. 1521 대신 1800을 쓴다.
     */
    list: (p) => `https://securities.miraeasset.com/bbs/board/message/list.do?categoryId=1800&pageIndex=${p}`,
    detail: (id) => `https://securities.miraeasset.com/bbs/board/message/view.do?messageId=${id}&categoryId=1800`,
    parseList(html) {
      /*
       * ⚠ 처음에 `view('id','no')` 로 split 해서 주변 텍스트를 읽었더니
       *   제목이 `" id="bbsTitle0"> S-Oil` 로 나왔다. **속성 한가운데를 잘랐기 때문**이다.
       *   표가 멀쩡한 <tr><td>4칸이니 행 단위로 읽는 게 맞다.
       *     작성일 · 제목(div.subject > b) · 첨부 · 작성자
       */
      const 행 = [];
      for (const tr of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
        const tds = [...tr[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => m[1]);
        if (tds.length < 4) continue;                       // thead 등
        const id = tr[1].match(/view\('(\d+)'/)?.[1];
        if (!id) continue;
        const date = 태그제거(tds[0]).match(/20\d\d-\d{2}-\d{2}/)?.[0] ?? null;
        // 제목은 <b> 안에만 있다. 부제(<br/> 뒤)는 리포트 내용이라 안 가져간다.
        const 제목 = 태그제거(tds[1].match(/<b>([\s\S]*?)<\/b>/i)?.[1] ?? '');
        const 작성자 = 태그제거(tds[3]) || null;
        // 「종목명 (012345/매수)」 — 코드가 없으면 산업·전략 리포트다
        const 종목 = 제목.match(/^(.{1,40}?)\s*\((\d{6})\s*\/\s*([^)]{1,12})\)\s*$/);
        행.push({
          id,
          date,
          subject: 종목 ? 종목[1].trim() : null,
          code: 종목 ? 종목[2] : null,
          rating: 종목 ? normalizeRating(종목[3]) : null,
          analystRaw: 작성자,
        });
      }
      return 행.filter((r) => r.date);
    },
    parseDetail(html) {
      const b = 태그제거(html);
      // 작성자는 「작성자 이진호 작성일 2026-08-03」 꼴로 붙어 있다
      const analyst = b.match(/작성자\s+(.{2,20}?)\s+작성일/)?.[1]?.trim() ?? null;
      /*
       * ⚠ 앞부분 2,500자만 봤더니 목표주가를 못 찾았다. **머리말 메뉴가 그만큼 길다.**
       *   「작성일」 뒤부터가 기사 몸통이다. 거기서부터 3,000자만 본다.
       *   본문은 이 함수 안에서 끝난다 — 저장하지도 발행하지도 않는다.
       */
      const 시작 = b.indexOf('작성일');
      const 몸통 = 시작 >= 0 ? b.slice(시작, 시작 + 3000) : b.slice(0, 3000);
      const targetPrice = parseTargetPrice(몸통);
      return { analyst, targetPrice };
    },
  },

  /**
   * 한양증권 — 2026-11-14 다시 지음(5번).
   *
   * 🔴 **사이트가 Next.js 로 새로 지어졌다.** 옛 주소
   *   `/board/researchAnalyzeCompany/list?page=N` 은 아직 200 을 주지만
   *   ① 목록 알맹이가 HTML 에 없고 ② `page=` 를 **무시한다**(늘 1쪽).
   *   그래서 수집이 날마다 0건이면서 «실패로도 안 잡혔다».
   *   ⛔ 「200 이니 멀쩡하다」로 읽지 않는다. 몇 건을 건졌나를 본다.
   *
   * ⇒ 쪽이 실제로 넘어가는 주소는 보드 UUID 쪽이다(실측 — currentPage 가 따라 움직인다):
   *     https://www.hygood.co.kr/board/<보드UUID>?page=2
   *   글 하나는  /board/<보드UUID>/<글UUID>
   *
   * 목록 JSON 에 제목·작성일·첨부(PDF)가 다 있고, 상세 본문에 Analyst·투자의견·
   * 목표주가·현재주가가 라벨과 함께 있다. 2026-11-14 실측으로 2,077건 · 208쪽.
   */
  hanyang: {
    ko: '한양증권',
    origin: 'https://www.hygood.co.kr',
    보드: '00000000-0000-0000-0000-000009000001',
    list(p) { return `https://www.hygood.co.kr/board/${this.보드}?page=${p}`; },
    detail(id) { return `https://www.hygood.co.kr/board/${this.보드}/${id}`; },
    parseList(html) {
      const j = 덩이떼기(넥스트조각잇기(html), '{"posts":[',
        (x) => Array.isArray(x.posts) && x.posts.length > 0);
      /* ⛔ 못 읽었으면 «빈 목록»이 아니라 던진다 — 빈 목록은 「오늘 글이 없다」로 읽힌다 */
      if (!j) throw new Error('목록 JSON 을 못 읽었다 — 사이트 꼴이 또 바뀌었나 본다');
      const 행 = [];
      for (const x of j.posts) {
        const t = String(x.title ?? '');
        const 종목 = t.match(/([^[\]()]{1,40}?)\s*\((\d{6})\)/);
        행.push({
          id: x.postUuid,
          /* 작성일이 목록에 그대로 있다 — 상세를 안 열어도 날이 선다 */
          date: typeof x.createdDate === 'string' ? x.createdDate.slice(0, 10) : null,
          mmdd: (t.match(/\[(\d{2})\/(\d{2})\]/) || []).slice(1, 3).join('-') || null,
          subject: 종목 ? 종목[1].trim() : null,
          code: 종목 ? 종목[2] : null,
          rating: null,
          analystRaw: null,
        });
      }
      return 행;
    },
    parseDetail(html) {
      /* 상세 본문은 옛 꼴 그대로다 — 라벨이 살아 있어 읽는 법을 안 바꾼다 */
      const b = 태그제거(넥스트조각잇기(html) || html);
      const analyst = b.match(/Analyst\s*[:：]?\s*([가-힣]{2,4})/)?.[1] ?? null;
      const rating = normalizeRating(b.match(/투자의견\s*[:：]?\s*([A-Za-z가-힣.]{1,12})/)?.[1]);
      const targetPrice = parseTargetPrice(b);
      /*
       * ⚠ 한양은 「작성일 2026년 07월 10일」 꼴이었다. 새 꼴에는 작성일이 본문에 없을 수
       *   있으므로 **목록의 createdDate 를 쓴다**(수집() 이 det.date ?? r.date 로 받는다).
       *   ⛔ 형식을 하나로 가정하지 않는다 — 2026-08 에 그렇게 전건 date=null 이 났다.
       */
      const 년월일 = b.match(/작성일\s*(20\d\d)\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
      const 구분자 = b.match(/작성일\s*(20\d\d)[.\-/](\d{1,2})[.\-/](\d{1,2})/);
      const d = 년월일 ?? 구분자;
      const p2 = (n) => String(n).padStart(2, '0');
      return {
        analyst,
        rating,
        targetPrice,
        date: d ? `${d[1]}-${p2(d[2])}-${p2(d[3])}` : null,
      };
    },
  },
};

/* ──────────────────────────────────────────────────────────── */

async function 수집(key) {
  const a = 증권사[key];
  console.log(`\n── ${a.ko} ──`);
  const 기록 = [];
  let 실패 = 0;

  for (let p = 1; p <= PAGES; p++) {
    let 목록;
    try {
      목록 = a.parseList(await fetchHtml(a.list(p)));
    } catch (e) {
      console.log(`  목록 ${p}쪽 실패: ${e.message}`);
      실패++; // ⚠ 목록을 못 부른 것도 실패다. 여기서 안 세면 「실패 0」으로 조용히 성공이 된다
      break;
    }
    console.log(`  ${p}쪽 — ${목록.length}건`);
    if (!목록.length) break;

    for (const r of 목록) {
      // 종목 리포트가 아니면(코드 없음) 상세를 열지 않는다. 목표주가가 없는 글이다.
      if (!r.code) continue;
      try {
        const det = a.parseDetail(await fetchHtml(a.detail(r.id)));
        기록.push({
          broker: a.ko,
          id: r.id,                        // 저장 키가 된다. 재실행해도 덮어쓰기다
          date: det.date ?? r.date,
          subject: r.subject,
          code: r.code,
          rating: det.rating ?? r.rating,
          targetPrice: det.targetPrice ?? null,
          analyst: det.analyst ?? r.analystRaw ?? null,
          source: a.detail(r.id),          // 출처를 반드시 남긴다
          collectedAt: stamp(),
        });
      } catch (e) {
        실패++;
        console.log(`    ${r.id} 상세 실패: ${e.message}`);
      }
      await sleep(900); // 예의. 남의 서버를 몰아치지 않는다
    }
    await sleep(1200);
  }

  const 목표있음 = 기록.filter((r) => r.targetPrice).length;
  const 이름있음 = 기록.filter((r) => r.analyst).length;
  console.log(
    `  → ${기록.length}건 · 목표주가 ${목표있음} · 애널리스트 ${이름있음} · 실패 ${실패}`,
  );
  if (기록.length && 기록.length === 이름있음) console.log('    ✅ 애널리스트 전건 확보 — 네이버 경로로는 못 하던 것');
  if (!기록.length) console.log('    ⚠ 0건 — 이번에 아무것도 못 받았다. 실패로 센다(예약이 성공으로 넘기지 않게).');
  return { 기록, 실패 };
}

async function main() {
  const 대상 = ONLY ? [ONLY] : Object.keys(증권사);
  const 잘못 = 대상.filter((k) => !증권사[k]);
  if (잘못.length) {
    console.error(`모르는 증권사: ${잘못.join(', ')}\n아는 곳: ${Object.keys(증권사).join(', ')}`);
    process.exit(1);
  }

  console.log(`증권사 직접 수집 — ${대상.length}곳 · ${PAGES}쪽${DRY ? ' · DRY' : ''}`);
  console.log('⚠ 사실만 받는다. 본문·PDF 는 받지도 저장하지도 않는다.\n');

  const 전체 = [];
  const 결과 = [];
  for (const k of 대상) {
    const { 기록, 실패 } = await 수집(k);
    전체.push(...기록);
    // 실패 판정: 아무것도 못 받았거나(0건) 상세/목록에서 한 번이라도 실패했으면 실패다
    결과.push({ key: k, ko: 증권사[k].ko, 건수: 기록.length, 실패, 실패판정: 기록.length === 0 || 실패 > 0 });
  }

  /*
   * 🔴 0 을 성공으로 넘기지 않는다 (2026-08-08 지시).
   *   미래에셋이 18:40 에 목록 타임아웃으로 0건이었는데 종료코드 0(성공)으로 끝났다.
   *   눈으로 안 봤으면 그날치가 그대로 없어졌다. 한 곳이라도 실패면 종료코드 1로 끝낸다.
   *   ⚠ 단, 받은 것은 **먼저 저장한 뒤** 종료코드만 1로 둔다 — 부분 성공분을 버리지 않는다.
   */
  const 실패목록 = 결과.filter((r) => r.실패판정);
  if (실패목록.length) {
    console.error(
      `\n🔴 ${실패목록.length}곳 실패 — ${실패목록.map((r) => `${r.ko}(${r.건수}건·상세실패${r.실패})`).join(' · ')}`,
    );
    console.error('   0건이거나 목록을 못 부른 곳이 있다 → 종료코드 1. 예약이 「성공」으로 넘기지 않게.');
    process.exitCode = 1;
  }

  if (DRY) {
    console.log('\n=== DRY — 저장하지 않는다. 표본 5건 ===');
    console.log(JSON.stringify(전체.slice(0, 5), null, 1));
    return;
  }

  const 실행 = stamp();
  /*
   * ⚠ 저장 키에 시각을 넣지 않는다.
   *   처음에 `{증권사}-{종목코드}-{수집시각}` 으로 했더니 **매일 돌릴 때마다
   *   같은 리포트가 새 파일로 쌓였다.** 하루만 지나도 아카이브가 거짓말을 한다.
   *   증권사가 매긴 **리포트 고유번호**를 키로 쓰면 재실행이 덮어쓰기가 된다.
   *   (한 종목에 같은 날 리포트가 둘일 수도 있다 — 종목코드는 유일 키가 못 된다)
   */
  for (const r of 전체) {
    const 날 = r.date ?? today();
    const 키 = `raw/broker/${날}/${r.broker}-${r.id}.json`;
    const 옛본문 = await get(키); // 파일이 없으면 null — 그때는 이번이 처음이다
    const 레코드 = { ...r, firstCollectedAt: 처음받은때(옛본문?.toString('utf8'), r.collectedAt) };
    await put(키, JSON.stringify(레코드, null, 2), 'application/json');
  }
  await put(
    `manifest/broker/${실행}.json`,
    JSON.stringify(
      {
        실행,
        증권사: 대상,
        건수: 전체.length,
        목표주가: 전체.filter((r) => r.targetPrice).length,
        애널리스트: 전체.filter((r) => r.analyst).length,
        증권사별: 결과, // 곳마다 건수·실패·실패판정 — 나중에 「그날 어디가 비었나」를 안다
        실패곳: 실패목록.map((r) => r.ko),
        store: storeStatus(),
      },
      null,
      2,
    ),
    'application/json',
  );
  console.log(`\n저장 ${전체.length}건 → ${ARCHIVE}/raw/broker/`);
}

// 테스트에서 import 할 수 있게 직접 실행일 때만 돈다.
// ⚠ Windows 다. `file://` + 경로로 문자열을 만들면 슬래시 개수가 안 맞아
//   조건이 조용히 거짓이 되고 **아무 출력 없이 끝난다.** 실제로 그렇게 됐다.
//   pathToFileURL 을 쓴다.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
