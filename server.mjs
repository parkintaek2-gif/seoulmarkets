/**
 * dist/ 를 그대로 서비스하는 정적 파일 서버. Cloudtype 배포용.
 *
 * 왜 필요한가 — Cloudflare Pages 는 `/equities` 요청에 `equities.html` 을 알아서 내주지만
 * 일반 Node 호스팅은 그렇지 않다. 그 규칙(clean URL)을 여기서 직접 구현한다.
 * 이게 없으면 사이트맵·canonical 이 가리키는 확장자 없는 URL 이 전부 404 다.
 *
 * 의존성 0개. Node 내장 모듈만 쓴다.
 */
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { timingSafeEqual, scryptSync } from 'node:crypto';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderAdmin, renderRaw } from './src/lib/admin.mjs';
import { handleApi } from './src/lib/api.mjs';
import { 등록 as 댓글등록, 목록 as 댓글목록 } from './src/lib/comments.mjs';
import { 경로후보 } from './src/lib/url-path.mjs';
import { 센다, flush할때되면, 유입표, 현황 as 유입현황 } from './src/lib/traffic.mjs';
/* 🔴 [2026-09-13 · 5번] 달러 결제 — 사장님: 「페이팔 결제붙여」·「이런 절차 필요없이 바로 결제」 */
import * as 페이팔 from './src/lib/paypal.mjs';
import { 상품찾기 } from './src/data/licence-products.mjs';

/**
 * 산 사람에게 무엇을 주나. ⛔ 여기 없는 상품은 «빈 목록»을 낸다 —
 * 「돈은 받았는데 줄 것이 없다」를 조용히 넘기지 않고 화면에 그대로 말한다.
 * ⚠ 파일 이름에 날짜가 박혀 있다. 새 판이 나오면 여기를 같이 고친다.
 */
function 산파일들(코드) {
  const 여섯 = [
    '/data/full/korea-people-panel-2026-09-11.csv',
    '/data/full/korea-mezzanine-book-2026-09-11.csv',
    '/data/full/korea-ownership-ledger-filings-2026-09-11.csv',
    '/data/full/korea-ownership-ledger-executives-2026-09-11.csv',
  ];
  if (코드 === 'all') return 여섯;
  if (코드 === 'single' || 코드 === 'academic') return 여섯;   /* 고르기는 다음 단계 — 지금은 같은 묶음 */
  if (코드 === 'trade') return ['/data/full/korea-trade-dataset.csv'];
  return [];
}

const ROOT = fileURLToPath(new URL('./dist/', import.meta.url));
const PORT = Number(process.env.PORT) || 3000;

/**
 * 편집국(/admin) 접근 계정.
 *
 * **비밀번호 원문은 여기 없다. scrypt 해시만 있다.**
 * 해시는 공개돼도 안전하다 — 그러라고 만든 것이다. 원문을 되돌릴 수 없고,
 * 12자 무작위 비밀번호라 오프라인 대입도 현실적으로 불가능하다.
 *
 * 이 방식을 쓴 이유: Cloudtype 의 stage secret 이 배포에 자동으로 붙지 않아
 * 환경변수 경로가 막혔다. 해시를 커밋하면 재배포해도 그대로 유지된다.
 *
 * 비밀번호를 바꾸려면:
 *   node -e "const{scryptSync,randomBytes}=require('crypto');const s=randomBytes(16).toString('hex');console.log(s+':'+scryptSync('새비밀번호',s,64).toString('hex'))"
 * 출력값을 아래 ADMIN_HASH 에 넣는다. 환경변수 ADMIN_HASH 로 덮어쓸 수도 있다.
 */
const ADMIN_USER = process.env.ADMIN_USER || 'parkintaek2@gmail.com';
const ADMIN_HASH =
  process.env.ADMIN_HASH ||
  'f4d63bf168afdca3b4d95cf1b5650de3:fcbf925198e0ca1cd1074b40225bea24a916a7c94cecb956009840750dd58b28677a73d655e8d72b91ead5eab40bacfb78cc7d004c50a984bbfaf88a9cc02cb6';
const ADMIN_ENABLED = ADMIN_USER !== '' && ADMIN_HASH.includes(':');

/** 길이 노출 없이 상수시간 비교. 타이밍으로 한 글자씩 알아내는 걸 막는다. */
function safeEqual(a, b) {
  const A = Buffer.from(a);
  const B = Buffer.from(b);
  if (A.length !== B.length) {
    timingSafeEqual(A, A); // 길이가 달라도 같은 시간을 쓴다
    return false;
  }
  return timingSafeEqual(A, B);
}

function checkAuth(req) {
  const h = req.headers.authorization ?? '';
  if (!h.startsWith('Basic ')) return false;
  const [u, ...rest] = Buffer.from(h.slice(6), 'base64').toString('utf8').split(':');
  const p = rest.join(':'); // 비밀번호에 콜론이 있어도 깨지지 않게
  if (!safeEqual(u ?? '', ADMIN_USER)) return false;

  const [salt, want] = ADMIN_HASH.split(':');
  let got;
  try {
    got = scryptSync(p, salt, 64).toString('hex');
  } catch {
    return false;
  }
  return safeEqual(got, want);
}

/*
 * 🔴🔴 [2026-08-30] **우리 영상이 검색에 «영상으로» 안 잡히던 까닭을 여기서 찾았다.**
 *   사장님이 물으셨다 — 「영상을 굳이 유튜브에 올릴 필요가 있나? 우리 사이트에만 올리고
 *   검색 색인만 되면 되는 거 아냐?」. 재 보러 갔다가 이것이 나왔다.
 *
 * ```
 *   https://www.kculturewire.com/video/numberone.mp4
 *     Content-Type: application/octet-stream      ← .mp4 가 이 표에 «없었다»
 * ```
 * ⛔ 그리고 우리는 `X-Content-Type-Options: nosniff` 를 건다 — 「추측하지 말라」는 뜻이다.
 *   그래서 **크롤러도 브라우저도 이것을 영상으로 볼 수 없다.** 못 보는 것이 «맞다».
 *   ⭐ 아래 BASE_HEADERS 의 nosniff 는 옳다. 잘못은 이 표가 비어 있던 것이다.
 *
 * 🔴 실측 — 지난 28일 영상 검색 노출이 **네 사이트 모두 0**이었고, URL Inspection 으로
 *   물으면 영상 지면 어느 것도 «영상 칸»을 안 준다. 사이트맵에 영상 29편을 냈는데도 그렇다.
 * ⚠ 「영상 사이트맵에 냈다」는 **낸 것**이지 잡힌 것이 아니다. 여기서 막혀 있었다.
 *
 * ⛔ 파일 하나를 막는 것이 아니라 «갈래»로 채운다 — 소리·자막·다음에 쓸 것까지.
 *   새 미디어를 쓰기 시작하면 «여기부터» 더한다. 안 더하면 조용히 octet-stream 이 된다.
 */
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  /* 🔴 2026-09-02 — GEO(3번): 지면마다 낸 .md 판(scripts/build-100y-markdown.mjs)이
   * 이 표에 없으면 조용히 octet-stream 이 된다(위 주석의 교훈, 영상과 같은 함정). */
  '.md': 'text/markdown; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  /* 🔴 영상·소리 — 이것이 없어서 우리 영상이 검색에 영상으로 안 잡혔다 */
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.wav': 'audio/wav',
  '.vtt': 'text/vtt; charset=utf-8',   /* 자막. 붙이면 체류가 는다 */
  '.pdf': 'application/pdf',
};

// public/_headers 와 같은 정책을 여기서도 건다. 호스팅이 바뀌어도 헤더는 유지된다.
const BASE_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
};

function cacheFor(pathname, ext) {
  if (pathname.startsWith('/_astro/')) return 'public, max-age=31536000, immutable';
  if (ext === '.html') return 'public, max-age=0, must-revalidate';
  if (ext === '.xml') return 'public, max-age=3600';
  return 'public, max-age=604800';
}

/** 경로를 실제 파일로 해석한다. 없으면 null.
 *
 * ⚠ 2026-08-04 — `decodeURIComponent` 가 **서버 전체를 죽이고 있었다.**
 *   잘못된 퍼센트 인코딩(`/%`, `/%zz`)이나 UTF-8 이 아닌 바이트가 경로에 들어오면
 *   URIError 를 던지는데, 이 함수는 try/catch 밖에서 불린다 → 프로세스가 내려간다.
 *   세 사이트가 한 프로세스에 있으므로 **서울마켓·위키팁도 같이 죽는다.**
 *   스캐너가 그런 요청 하나만 보내면 끝이라, 원래도 있던 구멍이었다.
 *   백년지도가 한글 주소 3,450장을 얹으면서 터질 확률만 커졌다.
 *   못 읽는 경로는 파일도 없는 경로다 — 죽지 말고 404 로 답한다.
 */
async function resolveFile(pathname) {
  /* ⚠ 후보가 **여럿**일 수 있다. 원시 UTF-8 바이트로 온 한글 주소를 되살린 것이
   *   두 번째 후보로 온다. 어느 쪽이 맞는지는 **파일이 있는지로 판정**한다 —
   *   조건으로 가르려다 한 번 실패했다(`new URL()` 이 퍼센트 인코딩을 넣어 버린다).
   *   순서가 뜻을 갖는다: 원래 해석이 먼저, 되살린 것이 나중. */
  const candidates = [];
  for (const decoded of 경로후보(pathname)) {
    // 디렉터리 탈출 차단
    const clean = normalize(decoded).replace(/^(\.\.[/\\])+/, '');
    if (clean === '/' || clean === '\\') candidates.push('index.html');
    else if (extname(clean)) candidates.push(clean);
    // 확장자가 없으면 clean URL 로 보고 .html 과 디렉터리 index 를 차례로 찾는다
    else candidates.push(`${clean}.html`, join(clean, 'index.html'));
  }

  for (const c of candidates) {
    const full = join(ROOT, c);
    if (!full.startsWith(ROOT)) continue;
    try {
      const s = await stat(full);
      if (s.isFile()) return { full, size: s.size };
    } catch {
      /* 다음 후보로 */
    }
  }
  return null;
}

function send(res, status, full, size, pathname, headOnly = false) {
  const ext = extname(full);
  res.writeHead(status, {
    ...BASE_HEADERS,
    'Content-Type': TYPES[ext] ?? 'application/octet-stream',
    'Content-Length': size,
    'Cache-Control': cacheFor(pathname, ext),
  });
  // HEAD 는 헤더만 보내고 본문을 보내면 안 된다. Node 는 이걸 자동으로 막아주지 않는다.
  // 본문을 딸려 보내면 프로토콜 위반이라 헬스체크·프록시가 응답을 못 끝내고 기다린다.
  if (headOnly) {
    res.end();
    return;
  }
  createReadStream(full).pipe(res);
}

/**
 * 요청 하나가 프로세스를 죽이지 못하게 한다.
 *
 * ⚠ 2026-08-04 — 실제로 죽었다. 잘못된 퍼센트 인코딩 하나에 `decodeURIComponent` 가
 *   URIError 를 던져 서버가 내려갔고, **세 사이트가 한 프로세스**라 서울마켓·위키팁까지
 *   같이 멈췄다. 그 원인은 resolveFile 안에서 따로 막았지만, 원인을 하나씩 막는 방식으로는
 *   다음 것을 놓친다. 여기서 한 번 더 받는다.
 *
 * 500 을 돌려주고 로그를 남긴 뒤 **계속 산다.** 한 사람의 요청이 실패하는 것과
 * 세 사이트가 전부 죽는 것은 완전히 다른 일이다.
 */
const handle = async (req, res) => {
  const parsed = new URL(req.url, 'http://localhost');

  /*
   * 이 서버는 정적 파일 서버라 원래 GET/HEAD 만 받았다.
   * 뉴스레터 접수(`/v1/subscribe`) 하나 때문에 **그 경로에서만** POST 를 연다.
   *
   * ⚠ 전면 개방하지 않는다. 열어 둔 메서드는 곧 공격면이다.
   *   실제로 POST 를 처리하는 곳은 `/v1/subscribe` 하나뿐이고, 다른 `/v1/*` 로 온
   *   POST 는 handleApi 안에서 405 로 떨어진다.
   */
  /* 🔴 2026-08-31 — 자체 댓글(`/api/comments`) 등록도 POST 라 여기 더한다.
   *   사장님 지시: 「우리 자체 댓글 서비스를 만들어라... 모든 유닛이 이용하도록」.
   *   3자 위젯(Giscus 등)을 안 쓰는 이유는 comments.mjs 머리글 참고 — IP·쿠키 정책 충돌. */
  /* 🔴 [2026-09-09 · 1번] `/v1/keys` — 셀프 발급 API 열쇠(P6). 같은 이유로 POST 허용 목록에 더한다. */
  /* 🔴 [2026-09-13 · 5번] 결제 두 자리도 POST 다 — 여기 안 넣으면 405 로 막혀 «살 수가 없다» */
  const POST허용 = req.method === 'POST' && (parsed.pathname === '/v1/subscribe' || parsed.pathname === '/api/comments' || parsed.pathname === '/v1/keys'
    || parsed.pathname === '/api/pay/order' || parsed.pathname === '/api/pay/capture');
  if (req.method !== 'GET' && req.method !== 'HEAD' && !POST허용) {
    res.writeHead(405, { ...BASE_HEADERS, Allow: 'GET, HEAD' }).end('Method Not Allowed');
    return;
  }

  let pathname = parsed.pathname;

  /* ── 도메인별 분기 ─────────────────────────────────────────────────
   *
   * 한 인스턴스가 여러 매체를 서비스한다. **메모리 추가가 0이다.**
   * Cloudtype 구독 총량이 1GB 이고 klifemap 과 나눠 쓰는데 여유가 0.25GB 뿐이라,
   * 매체마다 배포를 띄우면 그 자리에서 막힌다.
   *
   *   seoulmarkets.com  →  dist/           (금융)
   *   100yearmap.com    →  dist/100y/      (백년지도 · 교육)
   *   wiki-tip.com      →  dist/wikitip/   (K컬처 · 영문)
   *
   * 내부적으로는 **경로 접두사로 바꿔서** 아래 정적 파일 로직을 그대로 태운다.
   * 빌드 산출물이 이미 그 구조로 나오면 서버가 따로 알 것이 없다.
   *
   * ⚠ Host 헤더는 프록시가 넣어 주는 값이다. 포트가 붙어 올 수 있어 떼고 본다.
   *   그리고 **모르는 호스트는 기본(금융)으로 보낸다** — 새 도메인을 붙였는데
   *   여기 안 적으면 조용히 빈 화면이 나오는 것보다 낫다.
   */
  /*
   * ⭐ [2026-09-07 · 5번] **정본 호스트로 301 을 건다.**
   *
   * 왜 — GA4 28일을 재 보니 두 주소가 따로 잡혀 있었다.
   * ```
   * www.kculturewire.com   순방문자 105 · 평균 머문 62초 · 붙든 방문 33%
   * kculturewire.com       순방문자  88 · 평균 머문  5초 · 붙든 방문  4%  ← 전부 (direct)
   * ```
   *   88명이 다 유입원 없이 들어와 5초에 나간다. **사람의 모양이 아니다.**
   *   그런데 GA4 는 그것을 손님으로 세고, 서치콘솔에는 사이트맵이 «두 개» 잡혀 있었다
   *   (www 2,821장 · non-www 2,754장). 같은 글이 두 주소로 뜨면 둘 다 약해진다.
   *
   * ⛔ 딱 아는 호스트만 넣는다. 모르는 호스트를 건드리면 배포 헬스체크가 죽는다.
   * ⛔ GET·HEAD 만 넘긴다 — POST 를 301 로 넘기면 본문이 사라진다.
   * ⚠ 100yearmap·seoulmarkets·klifemap 은 «non-www 가 정본»이다. 여기 넣지 않는다.
   *   (그쪽 canonical 태그가 non-www 를 가리키는 것을 2026-09-07 에 확인했다)
   * ⭐ [2026-09-07 · 3번] www.100yearmap.com 도 같은 꼴(순방문자 5·평균 1초·붙든 방문 0%)이라
   *   여기 추가했다. 100yearmap 은 non-www 가 정본이라 **방향이 kculturewire 와 반대다**.
   */
  const 정본호스트 = {
    'kculturewire.com': 'www.kculturewire.com',
    'www.100yearmap.com': '100yearmap.com',
  };
  const 날호스트 = String(req.headers.host ?? '').split(':')[0].toLowerCase();
  const 정본 = 정본호스트[날호스트];
  if (정본 && (req.method === 'GET' || req.method === 'HEAD')) {
    res.writeHead(301, {
      Location: `https://${정본}${req.url ?? '/'}`,
      'Cache-Control': 'public, max-age=3600',
    });
    res.end();
    return;
  }

  const host = String(req.headers.host ?? '').split(':')[0].toLowerCase().replace(/^www\./, '');
  /*
   * ⚠ 여기 없는 호스트는 **조용히 금융 사이트로 떨어진다.** 404 도 에러도 안 난다.
   *   그래서 새 도메인을 붙일 때는 **NS 를 바꾸기 전에 이 줄부터 추가하고,
   *   `curl -H "Host: 새도메인" localhost:PORT/` 로 무엇이 뜨는지 눈으로 본다.**
   *   순서를 뒤집으면 잘못 뜨는 화면을 전 세계가 먼저 본다.
   *
   * ⚠ 2026-08-03 KST — wiki-tip.com 을 뺐다가 **같은 날 되살렸다.**
   *   접었던 이유: 「경제·금융 끝나면 그때 한류」.
   *   되살린 이유: PG 승인이 늦어 **결제가 있는 쪽만 멈췄다.**
   *     「무료 사이트는 그냥 진행해야지. 위키팁」 (사장님)
   *   위키팁은 무료 매체라 PG 와 무관하다. 멈출 이유가 없다.
   *   ← 도메인과 Cloudflare 존을 안 지워 둔 덕에 되살리는 데 한 줄로 끝났다.
   */
  /*
   * ⚠ 2026-08-05 KST — **K컬처 매체의 도메인이 `kculturewire.com` 으로 바뀌었다.**
   *   제호도 「케이컬처와이어」(화면 표기 K Culture Wire)다.
   *   옛 이름 「케이컬처인코리아」는 K=Korean 이라 **「Korea in Korea」**가 되는 것을
   *   사장님이 잡으셨다. wiki-tip.com 은 색인 0·트래픽 0 이라 지금이 바꾸기 제일 쌌다.
   *
   *   ⛔ **`wiki-tip.com` 을 지우지 않는다.** 같은 접두사를 계속 가리키게 두고,
   *      나중에 301 을 걸 때까지 두 주소가 다 뜨게 한다. 지우면 옛 주소가 조용히
   *      금융 사이트로 떨어진다(아래 「모르는 호스트」 주석 참조).
   */
  const SITE_PREFIX = {
    '100yearmap.com': '/100y',
    'hundredyearmap.com': '/100y',
    'kculturewire.com': '/wikitip',
    'wiki-tip.com': '/wikitip',   /* 옛 주소. 301 을 걸기 전까지 살려 둔다 */
  };
  /* ⚠⚠ **접두사 밖에 두어야 하는 경로들.** 3번이 잡아 준 사고다 (2026-08-05).
   *
   *   404  100yearmap.com/_astro/HundredYear.css   →  dist/100y/_astro/… **그런 폴더가 없다**
   *   200  seoulmarkets.com/_astro/Base.css        →  dist/_astro/…       접두사가 없어 멀쩡했다
   *
   * `dist/_astro/` **하나에 세 사이트 자산이 다 들어간다.** 빌드 도구가 그렇게 낸다.
   * 그런데 접두사가 붙는 사이트만 못 찾았다.
   *
   * ⚠ **오류가 하나도 안 난다.** 빌드 통과·배포 성공·지면 200. **화면만 민얼굴이다.**
   *   3번이 배포 전에 `<link>` 를 세어 봤기에 걸렸다. 안 셌으면 3,862장이 그대로 나갔다.
   *
   * ⚠ **CSS 만의 문제가 아니다.** 앞으로 이미지·JS·폰트를 자산으로 쓰면 같은 일이 난다.
   *   그래서 파일 하나를 막는 게 아니라 **경로 규칙**으로 막는다.
   *   새 빌드 도구를 붙일 때 그것이 만드는 공유 경로가 있으면 **여기에 더한다.**
   */
  /* ⚠ 2026-08-22 — 5번이 잡은 사고. /admin 도 세 사이트가 «편집국 하나»를 공유해야
   *   하는데(같은 계정, 같은 서버), 접두사가 붙으면 /admin → /wikitip/admin 이 되어
   *   316줄의 /admin 분기에 안 닿는다. seoulmarkets(접두사 없음)만 401(정상)이 뜨고
   *   나머지 둘은 404 였다. /admin(/…) 도 공유 경로에 넣는다. */
  /**
   * 🔴 2026-08-23 — `/v1/subscribe` 를 여기 넣는다.
   *   KCW `/subscribe` 가 「메일을 보내면 사람이 등록」하는 수동 절차였다(2번 실측).
   *   그런데 끝점은 이미 있었다 — 안 되던 까닭은 KCW 호스트로 온 요청에 `/wikitip` 이
   *   붙어 `/wikitip/v1/subscribe` 가 되어 404 였던 것뿐이다.
   * ⛔ `/v1/` 전체를 열지 않는다 — 그 API 는 6번 상품이고 호스트마다 열면 파는 면이 갈린다.
   *   메일 명단은 사이트와 무관한 하나이므로 **그 한 경로만** 접두사 밖으로 뺀다.
   */
  /* 🔴 2026-08-31 — `/api/comments` 도 같은 이유로 뺀다. 댓글은 세 사이트가
   *   **같은 코드로 같이 쓰는** 공용 기능이라, 접두사가 붙어 사이트마다 다른 경로
   *   (`/100y/api/comments`)가 되면 클라이언트 스크립트를 사이트별로 따로 짜야 한다. */
  /* `/comments-widget.js` 도 같이 뺀다 — `public/`(root) 에 하나만 있고
   *   100y·wikitip 은 각자 복사본이 없다. 접두사가 붙으면 그 두 사이트에서 404 난다. */
  /* 🔴 [2026-09-02 · 5번] `/deploy-stamp.txt` 도 같이 뺀다 — 바로 위 `comments-widget.js` 와
   *   **똑같은 사정**이다. 배포 도장은 `public/`(뿌리) 에 하나만 있고 100y·wikitip 에는
   *   복사본이 없다. 접두사가 붙으면 그 두 사이트에서 404 다 — 실제로 그랬다
   *   (SeoulMarkets 만 초록, KCW·백년지도는 404). 그러면 「라이브가 최신인가」를
   *   세 지면 중 하나만 잴 수 있다. 자가 셋 중 둘을 못 재면 그 자는 못 쓰는 자다. */
  const 공유경로 = /^\/(_astro|_image|_worker|@vite|assets)\/|^\/admin(\/|$)|^\/v1\/subscribe$|^\/api\/comments$|^\/comments-widget\.js$|^\/deploy-stamp\.txt$/;

  const prefix = SITE_PREFIX[host] ?? '';
  if (prefix && !공유경로.test(pathname) && !pathname.startsWith(prefix)) {
    // ⚠ Astro 가 `dist/100y.html` 로 낸다(폴더가 아니다). 그래서 `/` 는 접두사 **그대로**
    //   보내야 아래 clean URL 로직이 `100y.html` 을 찾는다. `/100y/` 로 보내면 404 다.
    pathname = pathname === '/' ? prefix : prefix + pathname;
  }

  // ── 데이터 API (/v1) ───────────────────────────────────────────────
  // 정적 파일보다 먼저 가로챈다. 매출의 3분의 2가 나올 자리라 별도 서버를 띄울
  // 법도 하지만, 정적 서버가 실측 47.6MB 밖에 안 쓰고 Cloudtype 여유가 0 이라
  // 여기 붙였다. 인프라 추가 비용 0원이다.
  {
    /*
     * ⚠ 2026-08-03 KST — 헤더와 IP 를 같이 넘긴다.
     *   RapidAPI 유료화 때문이다. 마켓플레이스는 자기를 거친 요청에만 헤더를
     *   붙여 주는데, 그걸 보지 않으면 구매자가 우리 도메인을 직접 불러 버린다.
     *
     *   IP 는 **x-forwarded-for 의 맨 앞**을 쓴다. Cloudtype 프록시 뒤라
     *   socket.remoteAddress 는 전부 프록시 주소로 같게 나온다 —
     *   그걸로 분당 한도를 걸면 전 세계가 한 양동이에 담긴다.
     */
    const 클라이언트IP =
      (req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() ||
      req.socket?.remoteAddress ||
      '';
    /*
     * POST 본문을 읽는다. 뉴스레터 접수(`/v1/subscribe`) 하나 때문이다.
     *
     * ⚠ 크기를 **반드시** 막는다. 안 막으면 누구나 무한정 밀어넣어 메모리를 채운다.
     *   Cloudtype 여유가 0.25GB 라 그 자리에서 klifemap 까지 같이 죽는다.
     *   이메일 한 줄에 16KB 면 충분하고도 남는다.
     */
    let 본문 = null;
    if (req.method === 'POST' && (pathname === '/v1' || pathname.startsWith('/v1/') || pathname === '/api/comments')) {
      본문 = await new Promise((resolve) => {
        const 조각 = [];
        let 크기 = 0;
        let 끝났다 = false;
        const 마감 = (v) => { if (!끝났다) { 끝났다 = true; resolve(v); } };
        req.on('data', (c) => {
          크기 += c.length;
          if (크기 > 16 * 1024) { req.destroy(); 마감(null); return; }
          조각.push(c);
        });
        req.on('end', () => 마감(Buffer.concat(조각).toString('utf8')));
        req.on('error', () => 마감(null));
      });
    }

    const api = await handleApi(pathname, parsed.searchParams, {
      headers: req.headers,
      ip: 클라이언트IP,
      method: req.method,
      body: 본문,
    });
    if (api) {
      res.writeHead(api.status, { ...BASE_HEADERS, ...api.headers });
      res.end(req.method === 'HEAD' ? undefined : api.body);
      return;
    }

    /* ── 자체 댓글(/api/comments) — 세 사이트 공용, 로그인·쿠키·IP 없음 ─────────
     * 사장님 지시(2026-08-31): 「우리 자체 댓글 서비스를 만들어라... 모든 유닛이
     * 이용하도록 해라. 논쟁꺼리를 우리가 만든다. 거기에 댓글을 붙일 수 있는 기능」.
     * 3자 위젯(Giscus 등)을 안 쓰는 이유·스팸 방지 방식은 comments.mjs 머리글 참고. */
    if (pathname === '/api/comments') {
      const 헤더 = { ...BASE_HEADERS, 'Content-Type': 'application/json; charset=utf-8', 'X-Robots-Tag': 'noindex' };
      if (req.method === 'GET') {
        const page = parsed.searchParams.get('page') ?? '';
        const 것들 = await 댓글목록(page).catch(() => []);
        res.writeHead(200, 헤더);
        res.end(JSON.stringify({ ok: true, comments: 것들 }));
        return;
      }
      if (req.method === 'POST') {
        let 입력 = {};
        try { 입력 = JSON.parse(본문 ?? '{}'); } catch { 입력 = {}; }
        const 결과 = await 댓글등록({
          page: 입력.page,
          name: 입력.name,
          body: 입력.body,
          honeypot: 입력.website, // 화면엔 「website」라는 미끼 이름으로 낸다(봇이 흔히 채우는 이름)
          openedAt: typeof 입력.openedAt === 'number' ? 입력.openedAt : undefined,
        });
        res.writeHead(결과.ok ? 200 : (결과.code ?? 400), 헤더);
        res.end(JSON.stringify(결과));
        return;
      }
    }

    /* ══ 달러 결제 (페이팔) ═══════════════════════════════════════════════
     * 사장님 지시 (2026-09-13):
     *   「**페이팔 결제붙여**」 · 「**달러 결제되게 해**」 · 「페이팔 등 **국적불문 결제**」
     *   「Email … invoice … bank transfer … **이런 절차 필요없이 바로 결제**할 수 있게 해」
     *
     * 🔴 돈이 새지 않게 지키는 것 —
     *   ⛔ 금액을 손님에게서 받지 않는다. «상품 코드»만 받고 값은 서버가 정한다
     *   ⛔ 「샀어요」라는 브라우저 말을 믿지 않는다. 페이팔에 다시 물어 확인한다
     *   ⛔ 열쇠가 없으면 결제 자리를 아예 안 연다 — 되는 척하지 않는다
     *   ⚠ 이 세 자리는 색인되면 안 된다(X-Robots-Tag: noindex)
     */
    if (pathname === '/api/pay/order' || pathname === '/api/pay/capture') {
      const 헤더 = { ...BASE_HEADERS, 'Content-Type': 'application/json; charset=utf-8', 'X-Robots-Tag': 'noindex' };
      if (!페이팔.켜졌나()) {
        res.writeHead(503, 헤더);
        res.end(JSON.stringify({ ok: false, error: 'payments are not configured' }));
        return;
      }
      let 입력 = {};
      try { 입력 = JSON.parse(본문 ?? '{}'); } catch { 입력 = {}; }
      const 품 = 상품찾기(입력.product);
      if (!품) {
        res.writeHead(400, 헤더);
        res.end(JSON.stringify({ ok: false, error: 'unknown product' }));
        return;
      }
      try {
        if (pathname === '/api/pay/order') {
          const id = await 페이팔.주문만들기(품);
          res.writeHead(200, 헤더);
          res.end(JSON.stringify({ ok: true, id }));
          return;
        }
        const 결과 = await 페이팔.승인확인(입력.orderID, 품);
        if (!결과.ok) {
          console.error('[pay] capture rejected —', 결과.왜);
          res.writeHead(402, 헤더);
          res.end(JSON.stringify({ ok: false, error: 'payment not confirmed' }));
          return;
        }
        /* ⭐ DB 가 없다. «누가 샀나»를 우리가 저장하지 않고 페이팔에 되묻는다(paypal.mjs 머리글).
             그래서 손님에게 주는 것은 «주문번호가 든 주소» 하나뿐이고, 그 주소는 만료되지 않는다. */
        const 받는곳 = '/api/download?order=' + encodeURIComponent(입력.orderID) + '&product=' + encodeURIComponent(품.코드);
        res.writeHead(200, 헤더);
        res.end(JSON.stringify({ ok: true, downloadUrl: 받는곳, receipt: 결과.결제번호 }));
        return;
      } catch (e) {
        console.error('[pay] ' + pathname + ' —', e?.message ?? e);
        res.writeHead(502, 헤더);
        res.end(JSON.stringify({ ok: false, error: 'payment provider error' }));
        return;
      }
    }
  }

  /* ── 산 파일 내려받기 ────────────────────────────────────────────────
   * ⭐ 저장소가 없다. 「이 주문이 정말 결제됐나」를 «페이팔에 되물어» 가른다.
   *    그래서 링크가 만료되지 않는다 — 지면에 적어 둔 「Links do not expire」 그대로다.
   * ⛔ 결제 확인 전에는 파일 이름조차 알려 주지 않는다.
   * ⚠ 색인되면 안 된다. noindex 를 붙인다.
   */
  if (pathname === '/api/download') {
    const 헤더 = { ...BASE_HEADERS, 'X-Robots-Tag': 'noindex, nofollow' };
    const 품 = 상품찾기(parsed.searchParams.get('product'));
    const 주문 = parsed.searchParams.get('order');
    if (!페이팔.켜졌나() || !품 || !주문) {
      res.writeHead(400, { ...헤더, 'Content-Type': 'text/plain; charset=utf-8' }).end('Bad request');
      return;
    }
    let 확인 = { ok: false, 왜: 'unchecked' };
    try { 확인 = await 페이팔.산주문인가(주문, 품); }
    catch (e) { console.error('[download] ' + (e?.message ?? e)); 확인 = { ok: false, 왜: 'provider error' }; }
    if (!확인.ok) {
      console.error('[download] refused —', 확인.왜);
      res.writeHead(402, { ...헤더, 'Content-Type': 'text/plain; charset=utf-8' })
        .end('This order is not paid, or the payment could not be confirmed.');
      return;
    }
    const 줄것 = 산파일들(품.코드);
    if (!줄것.length) {
      res.writeHead(503, { ...헤더, 'Content-Type': 'text/plain; charset=utf-8' })
        .end('Paid, but this dataset is not yet packaged. Write to admin@klifedesign.net with your order id and we will send it.');
      return;
    }
    /* ⚠ 지금은 파일 «목록»을 낸다. 묶음(zip)은 다음 단계다 —
         못 하는 것을 되는 척하지 않고, 산 사람이 바로 받을 수 있게 주소를 그대로 준다. */
    res.writeHead(200, { ...헤더, 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true, product: 품.코드, files: 줄것 }));
    return;
  }

  /* ── 유입 맥박(/traffic-pulse.json) — 인증 없이 «총계만» ─────────────
   * 왜: 데이터로 먹고사는 우리가 우리 방문자 수를 남(GA4·2번)에게 물을 순 없다.
   *     우리 서버가 이미 세니(traffic.mjs) 스스로 읽는다.
   * ⛔ 분포는 안 낸다(그건 /admin/traffic, 인증 안쪽). 여기는 사람/봇 «수»와 봇 종류뿐 —
   *    개인 식별값은 traffic.mjs 가 애초에 안 모은다(사람 쪽은 UA·IP 안 남김). */
  if (pathname === '/traffic-pulse.json') {
    let 몸;
    try {
      const c = 유입현황();
      몸 = JSON.stringify({ 사람: c.사람, 봇: c.봇, 봇별: c.봇별, 서로다른키: c.서로다른키, 모은시각: c.모은시각, 지금: c.지금 });
    } catch (e) { 몸 = JSON.stringify({ error: String(e?.message ?? e) }); }
    res.writeHead(200, { ...BASE_HEADERS, 'Content-Type': 'application/json; charset=utf-8', 'X-Robots-Tag': 'noindex' });
    res.end(req.method === 'HEAD' ? undefined : 몸);
    return;
  }

  // ── 편집국 ─────────────────────────────────────────────────────────
  // 정적 파일 처리보다 먼저 가로챈다. dist/ 에 admin 이라는 파일이 생겨도
  // 그쪽으로 새지 않게 하려는 것이다.
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    if (!ADMIN_ENABLED) {
      // 계정 미설정이면 존재 자체를 알리지 않는다.
      res.writeHead(404, { ...BASE_HEADERS, 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      return;
    }
    if (!checkAuth(req)) {
      res.writeHead(401, {
        ...BASE_HEADERS,
        'WWW-Authenticate': 'Basic realm="SeoulMarkets Newsroom", charset="UTF-8"',
        'Content-Type': 'text/plain; charset=utf-8',
      });
      res.end('Authentication required');
      return;
    }
    const adminHeaders = {
      ...BASE_HEADERS,
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    };

    /* /admin/traffic — 유입 현황 (JSON).
     * ⚠ **인증 안쪽**에 둔다. 우리 유입 분포는 밖에 보일 이유가 없다.
     * 집계만 있고 개인을 식별할 값은 애초에 안 모은다(traffic.mjs). */
    if (pathname === '/admin/traffic') {
      let 몸;
      try { 몸 = JSON.stringify(유입현황(), null, 1); }
      catch (e) { 몸 = JSON.stringify({ error: String(e?.message ?? e) }); }
      res.writeHead(200, { ...adminHeaders, 'Content-Type': 'application/json; charset=utf-8' });
      res.end(req.method === 'HEAD' ? undefined : 몸);
      return;
    }

    // /admin/raw/<slug> — 마크다운 원문 그대로 (복사·수정용)
    const rawMatch = pathname.match(/^\/admin\/raw\/(.+)$/);
    if (rawMatch) {
      const md = await renderRaw(decodeURIComponent(rawMatch[1]));
      if (md == null) {
        res.writeHead(404, { ...adminHeaders, 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not Found');
        return;
      }
      res.writeHead(200, { ...adminHeaders, 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(req.method === 'HEAD' ? undefined : md);
      return;
    }

    // /admin 또는 /admin/<slug>
    const slugMatch = pathname.match(/^\/admin\/(.+)$/);
    const r = await renderAdmin({
      user: ADMIN_USER,
      slug: slugMatch ? decodeURIComponent(slugMatch[1]) : null,
    });
    // 없는 기사면 404 로 돌려준다. 목록에 없는 slug 를 200 으로 주면 안 된다.
    const status = typeof r === 'string' ? 200 : r.status;
    const html = typeof r === 'string' ? r : r.html;
    res.writeHead(status, { ...adminHeaders, 'Content-Type': 'text/html; charset=utf-8' });
    res.end(req.method === 'HEAD' ? undefined : html);
    return;
  }

  // 확장자 없는 URL 을 정본으로 쓴다. /equities/ 나 /equities.html 로 들어오면 한 곳으로 모은다.
  const canonical = pathname
    .replace(/\/index\.html$/, '/')
    .replace(/\.html$/, '')
    .replace(/(.)\/$/, '$1');
  if (canonical !== pathname) {
    /* ⚠⚠ **접두사를 도로 떼고 보낸다.** 3번이 잡아 준 것이다 (2026-08-05).
     *
     *   전   100yearmap.com/school/  →  301  →  「/100y/school」   ← 내부 경로가 샌다
     *   후   100yearmap.com/school/  →  301  →  「/school」
     *
     * ⚠ 위 줄에 `**` 로 강조를 못 쓴다 — `**` 뒤에 `/` 가 오면 블록 주석이 거기서 끝난다.
     *   실제로 이 파일에서 한 번 깨뜨렸다. 강조가 필요하면 「」 를 쓴다.
     *
     * `/100y` 는 **한 인스턴스가 세 사이트를 서비스하려고 안에서만 쓰는 접두사**다.
     * 밖으로 나가면 두 주소가 같은 문서를 가리켜 **검색엔진이 중복으로 색인**한다.
     * 이용자가 그 주소를 공유하면 그것이 퍼진다.
     *
     * 원인은 순서였다 — 접두사를 **붙인 뒤에** 정본을 만들었다. 뗀 값으로 보낸다. */
    let 보낼곳 = canonical;
    if (prefix && 보낼곳.startsWith(prefix)) 보낼곳 = 보낼곳.slice(prefix.length) || '/';
    res.writeHead(301, { ...BASE_HEADERS, Location: 보낼곳 || '/' }).end();
    return;
  }

  const headOnly = req.method === 'HEAD';

  const hit = await resolveFile(pathname);
  if (hit) {
    send(res, 200, hit.full, hit.size, pathname, headOnly);
    return;
  }

  /**
   * ⚠⚠ 「사라진 지면」을 살아 있는 이웃으로 보낸다 (301)
   * ────────────────────────────────────────────────────────────────
   * [왜 이것이 있나 — 2026-09-03 실측 · 5번]
   *   사장님: 「낮은 방문자의 더 큰 원인은 … 검색엔진이 아직 우리를 실어주지 않는
   *   초기 단계 문제입니다」(4번 진단) 「모든 세션들과 함께 해결방법을 찾으라」
   *
   *   그래서 KCW 의 노출 큰 지면 60장을 하나씩 눌러 봤다. 다섯 장이 404 였다.
   *   ```
   *   /esports                                    노출 166
   *   /article/korea-challenger-win-rate          노출 151
   *   /article/korea-ladder-games-played          노출 104
   *   /ladder-gap                                 노출  28
   *   /article/the-top-tier-is-where-players-stay 노출  21
   *   ────────────────────────────────────────────  합 470
   *   ```
   *   ⭐ KCW 전체 노출 5,010건의 **9.4%** 가 우리 자신의 404 로 가고 있었다.
   *      **검색엔진은 우리를 실어 주고 있었다.** 우리가 그 자리를 비워 둔 것이다.
   *
   * [왜 그 다섯 장이 사라졌나]
   *   사장님 지시로 Riot 을 걷어낼 때 함께 없어졌다. 지운 것 자체는 맞다 —
   *   다만 **구글은 아직 그 주소를 보여 주고 있다.** 지우면 수요도 같이 사라지는 것이 아니다.
   *   ⚠ 사장님이 함께 바로잡아 주신 것 — 「내가 riot을 제거하라고 했지,
   *     e스포츠를 제거하라고는 하지 않았잖아」. 그래서 보낼 곳이 있다:
   *     `/esports-nations`·`/esports-games` 는 살아 있고 위키백과 열람수로 잰다.
   *
   * [⛔ 지키는 것]
   *   · 301 이다. 302 가 아니다 — 영구히 옮긴 것이고, 그래야 구글이 새 주소로 힘을 옮긴다
   *   · **뜻이 가까운 곳으로만** 보낸다. 아무 데나 보내면 손님이 속았다고 느끼고 바로 나간다
   *     (구글도 그것을 「soft 404」로 보고 오히려 깎는다)
   *   · KCW 접두사(`/wikitip`)가 붙은 길에만 걸린다. 세 사이트가 한 서버를 쓰므로
   *     다른 사이트의 같은 이름 주소를 건드리면 안 된다
   *   · 표에 없는 404 는 그대로 404 다. 조용히 홈으로 보내지 않는다
   */
  const 사라진지면 = {
    '/wikitip/esports': '/esports-nations',
    '/wikitip/ladder-gap': '/esports-nations',
    '/wikitip/article/korea-challenger-win-rate': '/esports-games',
    '/wikitip/article/korea-ladder-games-played': '/esports-games',
    '/wikitip/article/the-top-tier-is-where-players-stay': '/esports-games',
    /* 🔴 [2026-09-08 · 5번] **같은 갈래인데 두 자리를 빠뜨리고 있었다.**
       9/03 에는 「노출 큰 지면 60장」만 눌러 봐서, 그 목록에 안 든 이 둘이 남았다.
       오늘 check-kcw-retired-pages 가 접힌 주소 39개를 늘어놓아서 알았다.
       ⚠ 뜻이 가까운 곳으로만 보낸다는 규칙은 그대로다 — 둘 다 랭크 사다리 글이라
         /esports-games 가 맞다. 아무 데나 보내지 않는다. */
    '/wikitip/article/one-region-is-not-like-the-others': '/esports-games',
    '/wikitip/article/what-it-costs-to-be-top-300': '/esports-games',
    /* ⚠ [2026-09-03 6번] 5번의 방법(전체 지시)을 SeoulMarkets에 그대로 재서 찾았다.
     * 이 둘은 무역 스케일브레이크 결함으로 draft 처리된 지면(korea-us-surplus-doubled·
     * korea-trade-surplus-tripled-five-partners, [[6번-무역데이터-스케일브레이크]])인데
     * 구글은 아직 옛 주소를 기억하고 있다(28일 노출 3·2). SeoulMarkets는 접두사가
     * 없어 이 표에 그대로(접두사 없이) 걸린다 — KCW/100yearmap 내부 경로와는 다른 공간이라
     * 안 겹친다. 뜻이 가장 가까운 살아 있는 재작성본(비율 기반, 스케일브레이크 없음)으로 보낸다. */
    '/article/korea-us-surplus-doubled': '/article/korea-trade-surplus-four-partners-customs',
    '/article/korea-trade-surplus-tripled-five-partners': '/article/korea-trade-surplus-four-partners-customs',
  };
  {
    const 보낼곳 = 사라진지면[pathname];
    if (보낼곳) {
      res.writeHead(301, { ...BASE_HEADERS, Location: 보낼곳 }).end();
      return;
    }
  }

  /**
   * ⚠⚠ 「같은 뜻 다른 이름」을 정본으로 모은다 (301)
   * ────────────────────────────────────────────────────────────────
   * 🔴 위의 «사라진 지면»과 다르다. 이쪽은 **한 번도 있은 적 없는 주소**다 —
   *   손님과 링크는 단수·복수를 가리지 않는다. KCW 는 /articles·/tags 가 정본이고,
   *   서울마켓츠는 /article·/tag 가 정본이라 **같은 회사 안에서 꼴이 엇갈린다.**
   *   2026-09-11 순환점검에서 seoulmarkets.com/articles 가 404 인 것을 눈으로 보고 넣었다.
   *
   * ⛔ 두 주소가 다 200 이 되게 «지면을 두 장» 만들지 않는다 — 그건 중복이고 구글이 깎는다.
   *   한쪽만 살리고 다른 쪽은 301 로 보낸다. 그것이 힘을 한 곳에 모으는 길이다.
   * ⚠ 서울마켓츠는 접두사가 없어 여기 «맨 주소»로 적는다. KCW·백년지도는 내부에서
   *   /wikitip·/100y 가 붙으므로 이 표에 안 걸린다 — 세 사이트가 한 서버를 쓴다.
   */
  const 같은뜻다른이름 = {
    '/articles': '/article',
    '/tags': '/tag',
  };
  {
    const 보낼곳 = 같은뜻다른이름[pathname];
    if (보낼곳) {
      res.writeHead(301, { ...BASE_HEADERS, Location: 보낼곳 }).end();
      return;
    }
  }

  /**
   * ⚠⚠ **404 도 그 사이트 얼굴로 낸다.**
   *
   * 2026-08-05 실측 — `100yearmap.com/없는주소` 가 **「Page not found | SeoulMarkets」**
   * 로 나왔다. 금융 매체 머리말·꼬리말이 교육 사이트 방문자에게 그대로 보였다.
   * `resolveFile('/404')` 가 접두사를 안 붙여 `dist/404.html`(SeoulMarkets) 를 집었다.
   *
   * **404 는 사람이 제일 자주 보는 실패 화면이다.** 오타 하나로 남의 브랜드가 뜨면
   * 「이 회사가 뭐 하는 곳인가」가 흔들린다. 오픈 열흘 앞이라 더 그렇다.
   *
   * 그 사이트 전용 404 가 없으면 **기존대로 공용으로 떨어진다** — 안전한 쪽이다.
   * 5번(wiki-tip)·3번(100yearmap)은 `src/pages/<접두사>/404.astro` 를 만들면 저절로 걸린다.
   */
  const 후보들 = prefix ? [`${prefix}/404`, '/404'] : ['/404'];
  for (const 후보 of 후보들) {
    const notFound = await resolveFile(후보);
    if (notFound) {
      send(res, 404, notFound.full, notFound.size, 후보, headOnly);
      return;
    }
  }
  res.writeHead(404, { ...BASE_HEADERS, 'Content-Type': 'text/plain' }).end('Not Found');
};

const server = createServer((req, res) => {
  /* ── 유입 측정 ────────────────────────────────────────────────────
   * ⚠ **응답이 끝난 뒤에** 센다. 요청 처리 경로를 한 톨도 늦추지 않는다.
   *   그리고 `센다`/`flush할때되면` 은 **던지지 않도록** 만들어져 있다(traffic.mjs).
   *   그래도 여기서 한 번 더 감싼다 — 측정 때문에 세 사이트가 죽는 일은 없어야 한다.
   *
   * 남기는 것: 호스트·경로·유입 도메인·봇 여부·**우리가 붙인 `?from=` 딱지**.
   * 안 남기는 것: **IP·쿠키·UA 원문·검색어·물음표 뒤 나머지 전부**
   */
  res.on('finish', () => {
    try {
      const u = new URL(req.url ?? '/', 'http://localhost');
      센다({
        host: String(req.headers.host ?? '').split(':')[0],
        pathname: u.pathname,
        referer: req.headers.referer ?? req.headers.referrer,
        userAgent: req.headers['user-agent'],
        /* ⭐ 3번이 여섯 번 물은 한 줄 — 「한 장이 몇 번 열리나 · 값 지면까지 %」
         * ⛔ 물음표 뒤를 통째로 안 남긴다. **`from` 하나만** 흰 목록으로 뽑는다 —
         *    거기엔 손님이 친 검색어·이메일이 들어올 수 있다 */
        from: 유입표(u.searchParams),
      });
      flush할때되면();
    } catch { /* 측정은 조용히 실패한다 */ }
  });

  handle(req, res).catch((err) => {
    console.error(`[500] ${req.method} ${req.url} —`, err?.message ?? err);
    if (res.headersSent) {
      res.destroy(); // 이미 보내기 시작했으면 끊는 수밖에 없다
      return;
    }
    res.writeHead(500, { ...BASE_HEADERS, 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Internal Server Error');
  });
});

server.listen(PORT, () => {
  console.log(`serving dist/ on http://0.0.0.0:${PORT}`);
});

/**
 * 🔴🔴 2026-08-22 (5번) — **유입 집계가 오늘 하루 통째로 새고 있었다.**
 *
 * R2 의 그날치 파일을 열어 보니 마지막 갱신이 **오전 10:26** 이었다. 재 본 시각은 19:40 이다.
 * 어제까지는 매일 23:5x 까지 적혀 있었다 —
 *   8/18 23:58 · 8/19 23:55 · 8/20 23:50 · 8/21 23:52 · **8/22 10:26**
 *
 * 까닭: 집계는 메모리에 쌓이고 **10분마다** R2 로 흘려 쓴다(traffic.mjs FLUSH_MS).
 * 그런데 이 서버 하나가 네 집(seoulmarkets·100yearmap·kculturewire·klifemap)을 낸다.
 * 오늘은 여섯 자리가 오후 내내 배포했고, **배포는 컨테이너를 새로 띄운다.**
 * 10분이 차기 전에 프로세스가 죽으면 그때까지 센 것이 **그냥 사라진다.**
 * 종료 신호를 받아 마지막으로 흘려 쓰는 자리가 **없었다.**
 *
 * ⭐ 그래서 여기 둔다. 배포가 잦은 날일수록 이 자리가 하는 일이 크다.
 * ⛔ 여기서 던지지 않는다 — 종료 경로에서 던지면 컨테이너가 이상하게 죽는다.
 * ⚠ 오래 붙들지 않는다. 2초 안에 못 쓰면 포기하고 나간다 — 배포를 늦추는 것이 더 나쁘다.
 * ⚠ 이 파일은 네 집이 같이 쓴다. 그래서 하는 일을 **흘려 쓰기 하나로만** 좁혔다.
 */
let 끝내는중 = false;
async function 끝낼때흘려쓴다(신호) {
  if (끝내는중) return;
  끝내는중 = true;
  try {
    const { flush } = await import('./src/lib/traffic.mjs');
    const 결과 = await Promise.race([
      flush(),
      new Promise((풀기) => { setTimeout(() => 풀기({ timeout: true }), 2000); }),
    ]);
    console.log(`[${신호}] 유입 집계 마지막 흘려쓰기 — ${JSON.stringify(결과)}`);
  } catch (e) {
    console.error(`[${신호}] 흘려쓰기 실패(무시하고 나간다) — ${e?.message ?? e}`);
  }
  process.exit(0);
}
for (const 신호 of ['SIGTERM', 'SIGINT']) process.on(신호, () => { 끝낼때흘려쓴다(신호); });
