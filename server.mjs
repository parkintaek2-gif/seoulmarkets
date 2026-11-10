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
/* 🔴 과속 막이 — 사장님 2026-10-03. 판정은 src/lib/과속막이.mjs 한 곳에만 둔다 */
import { 분당한도, 과속인가, 보낸곳, 쓸기시작 } from './src/lib/과속막이.mjs';
쓸기시작();
import { 등록 as 댓글등록, 목록 as 댓글목록 } from './src/lib/comments.mjs';
import { 던지기 as 투표던지기, 집계 as 투표집계 } from './src/lib/votes.mjs';
import { 경로후보 } from './src/lib/url-path.mjs';
import { 센다, flush할때되면, 유입표, 현황 as 유입현황, 우리점검머리글 } from './src/lib/traffic.mjs';
import { 못닿는주소인가 } from './src/lib/mail-guard.mjs';
import { 끊나 as 침입을끊나, 끝났다 as 침입끝났다 } from './src/lib/침입막기.mjs';
/* 🔴 [2026-09-13 · 5번] 달러 결제 — 사장님: 「페이팔 결제붙여」·「이런 절차 필요없이 바로 결제」 */
import * as 페이팔 from './src/lib/paypal.mjs';
import * as 계정 from './src/lib/accounts.mjs';
import { 메일보내기 } from './src/lib/gmail-send.mjs';
import { 상품, 상품찾기 } from './src/data/licence-products.mjs';
import { 데이터셋목록, 데이터셋찾기, 줄파일들, 골라야하나 } from './src/data/licence-datasets.mjs';
import { 묶기 } from './src/lib/tar-gz.mjs';
/* 🔴 [2026-10-31 · 1번] 백년지도 칼럼 — 사장님이 편집국에서 쓰시고, 이 서버가 R2 에서 읽어 바로 낸다 */
import * as 칼럼 from './src/lib/column.mjs';
import { 칼럼편집국 } from './src/lib/column-admin.mjs';
import { readFile as 파일읽기 } from 'node:fs/promises';
/* 🔴 [2026-11-01 · 사장님] 「ip가 같은 곳은 방문자 한명(즉 순방문자)로 계산해」
   ⛔ IP 원본은 저장하지 않는다 — 날짜를 섞은 되돌릴 수 없는 값으로만 센다. */
import * as 방문 from './src/lib/방문자집계.mjs';

/*
 * 🔴🔴 [2026-09-15 20:4x] **손님이 돈을 내고 «빈 봉투»를 받게 돼 있었다.**
 *
 * 파는 파일은 `src/data/full/` 에 있다 — 거기 둔 것이 맞다.
 * dist 에 두면 `/data/full/...` 로 «누구나 공짜로» 받아 가기 때문이다(라이브 404 로 확인).
 * 그런데 이 자가 묶을 때 «dist» 를 뿌리로 삼고 있었다. 그래서
 *   결제는 되고 · 승인도 되고 · 내려받기 주소도 나가고 · 그 주소를 누르면 파일이 없다.
 * ⛔ 오늘 만난 «빨간불이 안 켜지는» 세 번째 갈래다. 그리고 앞의 둘보다 나쁘다 —
 *   앞의 둘은 손님이 못 샀고, 이것은 **돈을 내고 못 받는다.**
 *
 * ⇒ 뿌리를 `src` 로 잡는다. 목록의 경로가 `/data/full/x.csv` 이므로
 *   `<저장소>/src` + `/data/full/x.csv` 로 정확히 떨어진다.
 * ⛔ dist 로 되돌리지 않는다. 되돌리면 공짜로 새거나(dist 에 넣으면) 빈 봉투가 된다.
 */
const 파는것뿌리 = fileURLToPath(new URL('./src', import.meta.url));
function 묶음만들기(경로들) { return 묶기(경로들, 파는것뿌리.replace(/[\\/]$/, '')); }

/** 묶음 파일 이름에 넣을 날짜. ⚠ 이 PC 는 이미 KST 다 — toISOString() 을 쓰지 않는다 */
function 오늘글(날 = new Date()) {
  const 두 = (n) => String(n).padStart(2, '0');
  return `${날.getFullYear()}-${두(날.getMonth() + 1)}-${두(날.getDate())}`;
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
  'a62dfe1462407a94521c5eabc883a5d4:ca4e74ee14082f16658154b5792c3606a6f1182d90dd0da616b9bf74a35d714dd7e8ee475d31ffbff87df75f31c6f0d33cf67c2fdd8b9852222bc4fc9d00332a';
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
  /* 🔴🔴 [2026-09-16] **홈 화면 이름이 계속 「seoulmarkets」로 뜬 까닭이 여기였다.**
   *
   * 사장님: 「홈화면에 추가할 때 여전히 seoulmarkets로 뜸 … 어제 작업한 건데, 왜 그러지?」
   *
   * 어제 이름은 제대로 고쳤다 — manifest 의 name·short_name 도, apple-mobile-web-app-title 도
   * 라이브에서 SMarkets 로 확인했다. 그런데 **아이폰이 그 매니페스트를 읽지 못했다.**
   * ```
   *   /manifest.webmanifest → Content-Type: application/octet-stream
   *   그리고 우리는 X-Content-Type-Options: nosniff 를 건다(「추측하지 말라」)
   *   ⇒ 사파리가 매니페스트로 «파싱하기를 거부»한다. 이름을 못 찾으니 주소로 떨어진다
   * ```
   * 사장님이 보신 소문자 「seoulmarkets」가 그 증거다 — 그것은 «호스트 이름»이다.
   *
   * ⛔ 이 표에 없는 확장자는 조용히 octet-stream 이 된다. 위 .mp4 주석이 같은 사고였고,
   *   그 주석에 「새 미디어를 쓰기 시작하면 여기부터 더한다」고 적어 두고도 또 당했다.
   *   ⇒ 이제 자가 잡는다 — scripts/check-content-types.mjs */
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  /* 🔴 [2026-09-16] 자를 만들자마자 둘을 더 잡았다 — **우리가 «파는» 파일 형식이다.**
   *   .csv 18개 · .parquet 4개가 octet-stream 으로 나가고 있었다.
   *   손님이 받아도 열리긴 하지만, 브라우저·크롤러·AI 는 그것이 표인 줄 모른다.
   *   ⚠ CSV 는 «다운로드»가 맞다 — 화면에 글자로 펴 보이면 손님이 복사해 쓰기 나쁘다. */
  '.csv': 'text/csv; charset=utf-8',
  '.parquet': 'application/vnd.apache.parquet',
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
  /* 🔴 [2026-10-02] 사장님: 「어제 체크한 보안상태는 모든 사이트가 괜찮나?」
     라이브로 재 보니 세 사이트(서울마켓·백년지도·KCW)에 **CSP 가 아예 없었다.**
     KLifeMap 에는 걸려 있었다 — 한 곳만 걸고 나머지를 잊은 꼴이다.

     ⚠ 왜 이 셋만 거나 — 스크립트 출처까지 조이면 애드센스·애널리틱스가 막혀 화면이 깨진다.
       그러면 되돌리느라 결국 CSP 를 통째로 떼게 된다. 아래 셋은 «지금 쓰는 것을 하나도
       안 막으면서» 실제 공격 셋을 막는다 —
         base-uri        <base> 를 몰래 넣어 모든 상대 주소를 남의 서버로 돌리는 것
         object-src      <object>·<embed> 로 플러그인을 심는 것
         frame-ancestors 남의 지면 안에 우리를 끼워 넣는 클릭재킹
     ⭐ 스크립트 출처 조이기는 쓰는 것을 전수로 센 뒤에 따로 건다. 질러서 깨뜨리지 않는다.

     ⚠ HSTS 는 브라우저가 «기억»해서 되돌리기 어렵다. 그래서 하루(86400)로 시작한다 —
       한동안 탈 없이 돌면 늘린다. includeSubDomains 는 안 붙인다(서브도메인을 다 못 재 봤다). */
  'Content-Security-Policy': "base-uri 'self'; object-src 'none'; frame-ancestors 'self'",
  'Strict-Transport-Security': 'max-age=86400',
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
  /* 🔴 [2026-09-14 · 1번] 자체 투표(`/api/vote`, VS 뉴스) — comments 와 같은 이유로 POST 를 연다.
   *   사장님 지시: 「투표할 수 있는 걸 만들어줘야지... 집계도 실시간으로」. */
  /* 🔴 [2026-09-18 · 2번] 손님 계정(회원가입·로그인) 두 자리도 POST 다 — 결제와 같은 이유. */
  /* 🔴 [2026-09-28 · 5번] `/v1/trial`(체험 신청)을 여기·본문읽을경로·공유경로 «셋 다»에 넣었다.
     셋 가운데 하나만 빠져도 지면은 멀쩡한데 접수만 조용히 깨진다. 2026-09-15 의 결제 사고가 그것이다. */
  const POST허용 = req.method === 'POST' && (parsed.pathname === '/v1/subscribe' || parsed.pathname === '/api/comments' || parsed.pathname === '/v1/keys' || parsed.pathname === '/v1/trial'
    || parsed.pathname === '/api/pay/order' || parsed.pathname === '/api/pay/capture' || parsed.pathname === '/api/pay/subscription-confirm' || parsed.pathname === '/api/vote'
    || parsed.pathname === '/api/account/signup' || parsed.pathname === '/api/account/login'
    /* 🔴 [2026-10-31 · 1번] 칼럼 저장·삭제. 로그인 확인은 아래 /admin 분기가 먼저 한다 */
    || parsed.pathname === '/admin/column/save' || parsed.pathname === '/admin/column/delete');
  if (req.method !== 'GET' && req.method !== 'HEAD' && !POST허용) {
    res.writeHead(405, { ...BASE_HEADERS, Allow: 'GET, HEAD' }).end('Method Not Allowed');
    return;
  }

  /* 🔴 과속 막이 — API 창구에만 건다(사장님 2026-10-03) */
  const 한도 = 분당한도(parsed.pathname);
  /* 🔴 [2026-10-03] 열쇠에 «호스트»를 넣는다. 이 스테이지 하나가 세 사이트를 같이 내므로
     호스트를 빼면 seoulmarkets 에서 쓴 횟수가 100yearmap·kculturewire 의 몫까지 깎는다
     (실측 — 백년지도·KCW 가 첫 번째 요청부터 429 를 맞았다). */
  const 호스트 = String(req.headers?.host || '');
  if (한도 && 과속인가(보낸곳(req) + ' ' + 호스트 + ' ' + parsed.pathname, 한도)) {
    res.writeHead(429, { ...BASE_HEADERS, 'content-type': 'application/json; charset=utf-8', 'retry-after': '60' })
      .end(JSON.stringify({ ok: false, error: 'Too many requests. Please try again in a minute.' }));
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
   * ⚠ 100yearmap·seoulmarkets 는 «non-www 가 정본»이다 — 그래서 방향이 kculturewire 와 «반대»다.
   *   (그쪽 canonical 태그가 non-www 를 가리키는 것을 2026-09-07 에 확인했다)
   * 🔴 [2026-10-06 10:2x · 5번] **이 주석이 「여기 넣지 않는다」였는데 그것이 틀렸다.**
   *   정본이 non-www 라면 **www 쪽을 non-www 로 넘겨야** 한다. 100y 는 그렇게 들어갔는데
   *   seoulmarkets 만 빠져 있었다. 그래서 실측하면 이랬다 —
   *   ```
   *   kculturewire.com   비www 301 → www        ✅ 제대로
   *   100yearmap.com     www  301 → 비www       ✅ 제대로
   *   seoulmarkets.com   둘 다 200              🔴 아무 데도 안 넘긴다
   *   ```
   *   같은 글이 두 주소로 뜨면 둘 다 약해진다(2026-09-07 에 GA4 로 잰 그대로다).
   *   ⚠ 같은 날 구글에게 물으니 서울마켓츠 **홈이 「크롤은 했는데 색인에 안 넣었다」**였다.
   *     마지막 크롤이 8월 5일이다. 그것과 이것이 같은 뿌리인지는 **못 가렸다** —
   *     다만 두 주소가 같은 글을 내는 것은 그 자체로 고칠 흠이다.
   * ⭐ [2026-09-07 · 3번] www.100yearmap.com 도 같은 꼴(순방문자 5·평균 1초·붙든 방문 0%)이라
   *   여기 추가했다. 100yearmap 은 non-www 가 정본이라 **방향이 kculturewire 와 반대다**.
   */
  const 정본호스트 = {
    'kculturewire.com': 'www.kculturewire.com',
    'www.100yearmap.com': '100yearmap.com',
    'www.seoulmarkets.com': 'seoulmarkets.com',
  };
  const 날호스트 = String(req.headers.host ?? '').split(':')[0].toLowerCase();
  const 정본 = 정본호스트[날호스트];
  /*
   * 🔴 [2026-09-23 · 5번] **`/ads.txt` 만은 301 을 걸지 않는다.**
   *
   * 애드센스 콘솔이 kculturewire.com 을 「Ads.txt 상태: 찾을 수 없음」으로 두고 있었고,
   * 그 때문에 계정 전체에 「수익 손실 위험 — ads.txt 파일 문제」 경고가 떠 있었다.
   * 파일은 멀쩡히 있다 — 다만 non-www 로 부르면 301 로 www 에 가서야 200 이 된다.
   * ⇒ 크롤러가 리디렉션 한 번을 안 따라가면 「없다」가 된다. 그 한 번을 없앤다.
   *
   * ⚠ 애드센스는 www 와 non-www 를 «한 사이트»로 본다 — 실측했다(2026-09-23 23:1x).
   *   콘솔에 www 를 새 사이트로 넣어 봤더니 목록이 그대로 4개였다.
   *   그러니 「www 를 따로 등록해서 푼다」는 길은 없다. 파일이 그 주소에서 바로 나와야 한다.
   * ⛔ 다른 경로의 301 은 그대로 둔다 — 두 주소로 같은 글이 뜨면 둘 다 약해진다(2026-09-07 실측).
   */
  if (정본 && /^\/ads\.txt(\?|$)/i.test(req.url ?? '')) {
    /* 301 을 건너뛰고 아래 정상 처리로 내려보낸다 */
  } else if (정본 && (req.method === 'GET' || req.method === 'HEAD')) {
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
  /* 🔴 [2026-09-14 · 1번] `/api/vote`·`/vote-widget.js` 도 같은 사정으로 뺀다 — comments 와
   *   완전히 같은 이유(세 사이트 공용, 접두사 붙으면 다른 사이트에서 404). VS 뉴스는
   *   지금 KCW 전용이지만, 댓글처럼 다른 사이트도 나중에 같은 코드로 쓸 수 있게 둔다. */
  const 공유경로 = /^\/(_astro|_image|_worker|@vite|assets)\/|^\/admin(\/|$)|^\/v1\/subscribe$|^\/v1\/trial$|^\/api\/comments$|^\/comments-widget\.js$|^\/deploy-stamp\.txt$|^\/api\/vote$|^\/vote-widget\.js$/;

  /*
   * 🔴🔴 [2026-10-06 03:0x · 5번] **폴더 주소에 입구가 없어 404 를 내던 자리.**
   *
   * KLifeMap 에 지면을 내고 사이트맵에도 넣고 홈에서 봇이 닿는 것까지 확인했는데
   * `/unse/` 와 `/data/` 를 눌러 보니 둘 다 404 였다. 그 길로 네 사이트를 다 재니
   * **입구 없는 폴더가 18곳**이고 그 밑에 약 1만 장이 있었다.
   *
   * ⛔ 여기 적힌 것들은 **목록 지면이 이미 있는데 길만 없던 것**이다.
   *   `/title` 의 목록은 `/titles` 이고, `/japan` 의 목록은 `/japan/companies` 다.
   *   같은 말을 하는 지면을 또 만들지 않는다 — 구글이 복사본으로 본다.
   *
   * ⚠ **접두사를 붙이기 «전»에** 한다. 붙인 뒤에 보내면 손님 주소줄에
   *   `/wikitip/` 이 드러나고, canonical 과 어긋나 구글이 두 주소를 보게 된다.
   * ⚠ 301(영구)로 낸다 — meta refresh 보다 검색엔진에 분명하다.
   * ⚠ 쿼리는 그대로 넘긴다.
   *
   * ⛔ 목록 지면이 «없는» 곳은 여기 적지 않는다. 엉뚱한 데로 보내는 것은
   *   404 보다 나쁘다. 아직 남은 곳 —
   *     kculturewire  /week · /market · /from     (2번이 목록 지면을 만든다)
   *     100yearmap    /report · /report/area · /life  (1번)
   */
  const KCW입구 = {
    '/title': '/titles', '/article': '/articles', '/tag': '/tags', '/firm': '/firms',
    /* 🔴 [2026-10-06 03:1x] 자가 내 손보다 깊이 봐서 찾았다 */
    '/star-sign': '/star-signs',
    /* ⛔ `/born-in` 은 안 적는다 — 달별 출생이라 짝이 뚜렷하지 않다.
       hometowns(고향)와도 born-on(날짜)과도 다르다. 2번이 목록 지면을 만든다 */
  };
  const 폴더입구 = {
    'kculturewire.com': KCW입구,
    'wiki-tip.com': KCW입구,
    'seoulmarkets.com': {
      '/japan': '/japan/companies', '/japan/company': '/japan/companies',
      '/taiwan': '/taiwan/companies', '/taiwan/company': '/taiwan/companies',
      '/uae': '/uae/companies', '/uae/company': '/uae/companies',
      '/company': '/companies',
      /* ⚠ 업종 목록은 `/companies` 안에 61갈래로 들어 있다 */
      '/sector': '/companies',
      '/japan/sector': '/japan/companies',
      '/taiwan/sector': '/taiwan/companies',
    },
  };
  {
    const 표 = 폴더입구[host];
    if (표 && (req.method === 'GET' || req.method === 'HEAD')) {
      /* 끝 빗금이 있든 없든 같은 자리로 본다 — `trailingSlash: 'never'` 와 짝이다 */
      const 민길 = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
      const 갈곳 = 표[민길];
      if (갈곳) {
        res.writeHead(301, { Location: 갈곳 + (parsed.search || ''), 'Cache-Control': 'public, max-age=3600' });
        res.end();
        return;
      }
    }
  }

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
     * POST 본문을 읽는다. 뉴스레터 접수(`/v1/subscribe`) 하나 때문이었다.
     *
     * ⚠ 크기를 **반드시** 막는다. 안 막으면 누구나 무한정 밀어넣어 메모리를 채운다.
     *   Cloudtype 여유가 0.25GB 라 그 자리에서 klifemap 까지 같이 죽는다.
     *   이메일 한 줄에 16KB 면 충분하고도 남는다.
     *
     * ── 🔴🔴 [2026-09-15 19:3x] **결제가 여기서 죽어 있었다 — 매출 0 이었다** ──
     *
     * 사장님: 「에스마켓츠도 케이라이프맵처럼 유료 판매를 본격적으로 시작햇으니
     *          **결제창이 제대로 작동하는 지** … 확인해야지」
     * 재 보니 결제 주문 경로가 모든 상품을 «unknown product» 로 물렸다.
     * ```
     *   curl -X POST /api/pay/order -d '{"product":"all"}'      → unknown product
     *   curl -X POST /api/pay/order -d '{"product":"single"}'   → unknown product
     *   curl -X POST /api/pay/order -d '{"product":"academic"}' → unknown product
     * ```
     * 상품표는 멀쩡했다. 지면도 멀쩡했다. 페이팔 열쇠도 live 였고 단추도 그려졌다.
     * ⇒ **이 흰 목록에 결제 경로가 빠져 있어서 본문을 «아예 안 읽고» 있었다.**
     *   본문이 null 이면 입력이 {} 가 되고, product 가 undefined 가 되고,
     *   상품찾기(undefined) 가 null 을 낸다. 그래서 400 이다.
     *
     * ⛔ 이것이 가장 나쁜 갈래의 사고다 — **어디에도 빨간불이 안 켜진다.**
     *   서버는 200 이고, 지면은 멀쩡하고, 단추도 뜬다. 손님이 「Pay with PayPal」을
     *   누른 «그 순간»에만 깨진다. 그 순간을 우리는 못 본다. 손님은 그냥 떠난다.
     * ⛔ 그러니 경로를 새로 붙일 때 이 목록을 «같이» 고친다. 여기 안 적으면
     *   그 경로는 POST 를 받는 척만 하고 본문이 항상 비어 온다.
     * ✅ 이제 자가 잡는다 — node scripts/check-seoulmarkets-payment.mjs
     *   그 자는 실제로 주문을 «만들어 보고» 판정한다(승인은 안 부른다 — 돈이 오가는 자리다).
     */
    const 본문읽을경로 = (p) => p === '/v1' || p.startsWith('/v1/')
      || p === '/api/comments' || p === '/api/vote'
      || p === '/api/pay/order' || p === '/api/pay/capture'   /* 🔴 빠져 있던 둘 */
      || p === '/api/pay/subscription-confirm'   /* 🔴 [2026-09-24·2번] 같은 함정, 미리 막음 */
      || p === '/api/account/signup' || p === '/api/account/login';   /* 🔴 [2026-09-18·2번] 같은 함정, 미리 막음 */
    let 본문 = null;
    if (req.method === 'POST' && 본문읽을경로(pathname)) {
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

    /* ── 자체 투표(/api/vote) — 세 사이트 공용, 로그인·쿠키·IP 없음 ──────────
     * 사장님 지시(2026-09-14): 「[VS 뉴스] 코너... 투표할 수 있는 걸 만들어줘야지...
     * 집계도 실시간으로」. comments 와 같은 정책·같은 스팸 방지 방식(votes.mjs 머리글 참고).
     * ⚠ 이 투표는 여론조사이지 인증투표가 아니다 — IP·쿠키가 없어 한 사람이 여러 번
     *   누르는 것을 서버가 확정적으로 막지 못한다(votes.mjs 머리글에 그 판단이 적혀 있다). */
    if (pathname === '/api/vote') {
      const 헤더 = { ...BASE_HEADERS, 'Content-Type': 'application/json; charset=utf-8', 'X-Robots-Tag': 'noindex' };
      if (req.method === 'GET') {
        const poll = parsed.searchParams.get('poll') ?? '';
        const choicesRaw = parsed.searchParams.get('choices') ?? '';
        const choices = choicesRaw ? choicesRaw.split(',').filter(Boolean) : undefined;
        const 집계결과 = await 투표집계(poll, { choices }).catch(() => ({ counts: {}, total: 0, updatedAt: null }));
        res.writeHead(200, 헤더);
        res.end(JSON.stringify({ ok: true, tally: 집계결과 }));
        return;
      }
      if (req.method === 'POST') {
        let 입력 = {};
        try { 입력 = JSON.parse(본문 ?? '{}'); } catch { 입력 = {}; }
        const 결과 = await 투표던지기({
          poll: 입력.poll,
          choices: Array.isArray(입력.choices) ? 입력.choices : undefined,
          choice: 입력.choice,
          honeypot: 입력.website, // 화면엔 「website」라는 미끼 이름으로 낸다(comments 와 같은 미끼)
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
    /* ── 손님 계정 (2026-09-18 · 2번) ────────────────────────────────────
     * 「비밀번호 → 계정 → 내가 산 것」의 1·2단. DB 가 아니라 src/lib/accounts.mjs
     * (=store.mjs, R2 직접쓰기)를 쓴다 — 이유는 accounts.mjs 머리글 참고.
     * ⛔ 세션은 서버에 아무것도 안 남긴다(HMAC 토큰 하나). ACCOUNT_SESSION_SECRET
     *   스테이지 시크릿이 없으면 발급·확인이 던지므로 그 경우 503 으로 답한다. */
    if (pathname === '/api/account/signup' || pathname === '/api/account/login') {
      const 헤더 = { ...BASE_HEADERS, 'Content-Type': 'application/json; charset=utf-8', 'X-Robots-Tag': 'noindex' };
      let 입력 = {};
      try { 입력 = JSON.parse(본문 ?? '{}'); } catch { 입력 = {}; }
      const email = String(입력.email ?? '').trim();
      const password = String(입력.password ?? '');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8) {
        res.writeHead(400, 헤더);
        res.end(JSON.stringify({ ok: false, error: 'valid email and password (8+ chars) required' }));
        return;
      }
      try {
        if (pathname === '/api/account/signup') {
          await 계정.계정만들기(email, password);
        } else {
          /* 🔴🔴 [2026-10-01 · 사장님] 「보안 철저하게 해. 우리 서비스들」
             여기에는 «아무 제한도 없었다» — 비밀번호를 몇 번이든 틀려도 됐다.
             신한은행을 턴 수법이 그것이다(입력값을 무작위로 대입).
             ⚠ 잠겼을 때도 틀렸을 때와 «같은 말»을 낸다 — 다른 말을 내면
               그 주소에 계정이 있다는 것을 알려 주는 셈이 된다. */
          if (계정.잠겼나(email)) {
            res.writeHead(401, 헤더);
            res.end(JSON.stringify({ ok: false, error: 'invalid email or password' }));
            return;
          }
          const 계정정보 = await 계정.로그인(email, password);
          if (!계정정보) {
            계정.실패적기(email);
            res.writeHead(401, 헤더);
            res.end(JSON.stringify({ ok: false, error: 'invalid email or password' }));
            return;
          }
          계정.실패지우기(email);
        }
        const 토큰 = 계정.세션발급(email);
        res.writeHead(200, 헤더);
        res.end(JSON.stringify({ ok: true, token: 토큰 }));
      } catch (e) {
        if (e?.code === 'exists') {
          res.writeHead(409, 헤더);
          res.end(JSON.stringify({ ok: false, error: 'account already exists' }));
          return;
        }
        console.error('[account] ' + pathname + ' —', e?.message ?? e);
        res.writeHead(503, 헤더);
        res.end(JSON.stringify({ ok: false, error: 'account service unavailable' }));
      }
      return;
    }

    /* 「내가 산 것」— 로그인 토큰이 있어야 한다. 목록은 색인일 뿐이고, 실제 결제 여부는
     * /api/download 와 마찬가지로 그때그때 PayPal 에 되묻는 것이 정본이다(여기서는 안 묻는다 —
     * 화면이 각 주문을 /api/download 로 다시 확인하며 받는다). */
    if (pathname === '/api/account/purchases') {
      const 헤더 = { ...BASE_HEADERS, 'Content-Type': 'application/json; charset=utf-8', 'X-Robots-Tag': 'noindex' };
      const auth = req.headers['authorization'] ?? '';
      const 토큰 = auth.startsWith('Bearer ') ? auth.slice(7) : '';
      let email = null;
      try { email = 계정.세션확인(토큰); } catch { email = null; }
      if (!email) {
        res.writeHead(401, 헤더);
        res.end(JSON.stringify({ ok: false, error: 'login required' }));
        return;
      }
      const 목록 = await 계정.내가산것(email);
      res.writeHead(200, 헤더);
      res.end(JSON.stringify({ ok: true, purchases: 목록 }));
      return;
    }

    /* 화면이 «결제 단추를 낼지 말지»를 알아야 한다. ⛔ 시크릿은 여기 안 담긴다(paypal.mjs 가 막는다) */
    if (pathname === '/api/pay/config') {
      res.writeHead(200, { ...BASE_HEADERS, 'Content-Type': 'application/json; charset=utf-8', 'X-Robots-Tag': 'noindex' });
      res.end(JSON.stringify({ ...페이팔.화면에낼것(), products: 상품, datasets: 데이터셋목록 }));
      return;
    }

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
      /* ⛔ single·academic 은 «어느 데이터셋»인지 골라야 한다.
           안 고르고 사면 결제 뒤에 줄 것이 없다 — 그 전에 막는다. */
      const 골른것 = 입력.dataset ? 데이터셋찾기(입력.dataset) : null;
      if (골라야하나(품.코드) && !골른것) {
        res.writeHead(400, 헤더);
        res.end(JSON.stringify({ ok: false, error: 'choose a dataset first' }));
        return;
      }
      try {
        if (pathname === '/api/pay/order') {
          const id = await 페이팔.주문만들기(품, 골른것 ? 골른것.코드 : null);
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
        const 받는곳 = '/api/download?order=' + encodeURIComponent(입력.orderID) + '&product=' + encodeURIComponent(품.코드)
          + (골른것 ? '&dataset=' + encodeURIComponent(골른것.코드) : '');
        res.writeHead(200, 헤더);
        res.end(JSON.stringify({ ok: true, downloadUrl: 받는곳, receipt: 결과.결제번호 }));

        /* 🔴 [2026-09-18 · 2번] 로그인한 손님이면 「내가 산 것」에 색인을 남긴다.
         * ⛔ 응답은 이미 나갔다 — 이건 편의 색인일 뿐, 실패해도 결제는 그대로 성공이다.
         *   비회원이거나 토큰이 없으면 계정.내가산것() 이 빈 배열을 주므로 그냥 넘어간다. */
        (async () => {
          const auth = req.headers['authorization'] ?? '';
          const 토큰 = auth.startsWith('Bearer ') ? auth.slice(7) : '';
          if (!토큰) return;
          let email = null;
          try { email = 계정.세션확인(토큰); } catch { return; }
          if (!email) return;
          await 계정.구매기록추가(email, { orderID: 입력.orderID, product: 품.코드, dataset: 골른것 ? 골른것.코드 : null });
        })().catch((e) => console.error('[account] 구매기록추가 실패 — ' + (e?.message ?? e)));

        /*
         * 🔴 [2026-09-15/16 · 5번→6번 · 사장님 지시 「회원가입 안하면 정보를 어떻게 보내지?」
         *   「페이팔 등록한 메일이 잘 안쓰는 거면?」]
         *   회원가입도 DB 도 없어, 손님이 탭을 닫으면 화면의 링크가 유일한 증거였다.
         *   두 주소로 편지를 보낸다 — ① 결제칸에 손님이 «직접 적은» 이메일(필수 칸,
         *   실제로 읽는 주소일 확률이 높다) ② 페이팔 승인 응답의 구매자 메일(결제용이라
         *   다를 수 있다). 하나는 «흡수»하지 않는다 — 사장님 지시: 둘 다 있으면 둘 다 보낸다.
         *
         * ⛔ **응답은 이미 위에서 나갔다.** 편지가 막혀도 결제는 이미 성공한 뒤다.
         *   메일보내기() 는 절대 던지지 않으므로 catch 는 방어일 뿐이다.
         * 🔴 손님 이메일 주소는 저장소·로그·docs/보낸메일.tsv 어디에도 적지 않는다
         *   (사장님 지시 — 「실제 사람의 사적인 내용은 공용 저장소에 적지 않는다」).
         *   아래 실패 로그에도 주소를 담지 않는다 — 주문번호까지만 남긴다.
         */
        const 체크아웃메일 = (() => {
          const e = String(입력.email ?? '').trim();
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : null;
        })();
        /* ⛔ 대소문자만 다른 같은 주소로 두 통을 보내지 않는다 */
        /* 🔴🔴 [2026-09-17] **시험 주소로는 안 보낸다 — 반송이 사장님 편지함으로 간다.**
         *   그날 사장님 편지함에 반송이 둘 들어왔다 —
         *     · `6ubon-test@klifedesign.net`        (우리 시험 계정 · 그 편지함이 없다)
         *     · `sb-…@personal.example.com`         (페이팔 «샌드박스» 구매자 · 도메인이 없다)
         *   결제 점검을 매시 돌리므로 **반송도 매시 쌓인다.** 사장님이 진짜 주문 편지와
         *   구분하실 수 없게 되고, 그러면 진짜 첫 주문이 왔을 때 묻혀서 못 보신다.
         *   ⛔ 「시험이니까 괜찮다」가 아니다 — 보내는 순간 바깥으로 나가고 되돌릴 수 없다.
         *   ✅ 그래서 «절대 닿지 않는 주소»는 보내지 않고 로그만 남긴다. 결제는 그대로 성공한다. */
        const 받을주소들 = [체크아웃메일, 결과.산사람메일].filter(Boolean)
          .filter((v, i, arr) => arr.findIndex((x) => x.toLowerCase() === v.toLowerCase()) === i)
          .filter((주소) => {
            /* 🔴 샌드박스로 돌고 있으면 «어느 주소로도» 안 보낸다. 시험 주문에서 나온 편지다.
             *   주소를 하나하나 막는 것보다 이쪽이 먼저다 — 시험 구매자 주소는 계속 새로 생긴다. */
            if (!페이팔.진짜돈인가()) {
              console.log(`[pay] 편지를 안 보냈다 — 샌드박스 모드다 (주문 ${입력.orderID})`);
              return false;
            }
            const 왜 = 못닿는주소인가(주소);
            if (왜) console.log(`[pay] 편지를 안 보냈다 — ${왜} (주문 ${입력.orderID})`);
            return !왜;
          });
        if (받을주소들.length) {
          const 상품이름 = 품.이름 + (골른것 ? ' — ' + 골른것.이름 : '');
          const 받을링크 = 'https://seoulmarkets.com' + 받는곳;
          for (const 주소 of 받을주소들) {
            메일보내기({
              받는곳: 주소,
              제목: 'Your SMarkets order — ' + 상품이름,
              글: [
                (결과.산사람이름 && 주소 === 결과.산사람메일 ? `Hi ${결과.산사람이름},` : 'Hi,'),
                '',
                `Thank you for your order — ${상품이름}.`,
                '',
                `Download your files: ${받을링크}`,
                '',
                `Order ID: ${입력.orderID}`,
                `Receipt: ${결과.결제번호}`,
                '',
                'This link does not expire. If you ever lose it, go to',
                'https://seoulmarkets.com/recover and enter the order ID above',
                '— PayPal also emailed you this same order ID in your receipt.',
                '',
                'Questions? Write to admin@klifedesign.net',
                '',
                '— SMarkets (seoulmarkets.com)',
              ].join('\n'),
            }).then((r) => {
              if (!r.ok) console.error('[pay-mail] order ' + 입력.orderID + ' — 편지를 못 보냈다: ' + r.왜);
            }).catch(() => { /* 메일보내기() 는 던지지 않는다 — 방어용 */ });
          }
        }
        return;
      } catch (e) {
        console.error('[pay] ' + pathname + ' —', e?.message ?? e);
        res.writeHead(502, 헤더);
        res.end(JSON.stringify({ ok: false, error: 'payment provider error' }));
        return;
      }
    }

    /* ── 정기결제(구독) 승인 확인 — 일회성 주문의 /api/pay/capture 짝 ──────────
     * 🔴 [2026-09-24 · 2번] 월 구독(single_monthly·all_monthly)은 지면이 페이팔
     *   구독을 «직접» 만들고(actions.subscription.create) 곧바로 /api/download 로
     *   갔다 — 서버를 한 번도 거치지 않았다. 그래서 일회성 주문과 달리 **영수증
     *   편지가 한 통도 안 나갔다**. 구독자는 화면에 한 번 뜬 링크를 놓치면
     *   /recover 로 스스로 찾아와야 했다(페이팔이 보내는 구독 확인 메일에는
     *   우리 다운로드 링크가 없다). 이 자리가 그 짝이다 — 지면이 onApprove 에서
     *   한 번 불러 주면, 여기서 페이팔에 «되물어»(구독확인) 확인하고 같은 꼴의
     *   영수증 편지를 보낸다. ⛔ 구독을 만들거나 승인(capture)하지 않는다 — 이미
     *   페이팔이 승인한 구독을 «다시 확인만» 한다. */
    if (pathname === '/api/pay/subscription-confirm') {
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
      const 골른것 = 입력.dataset ? 데이터셋찾기(입력.dataset) : null;
      if (골라야하나(품.코드) && !골른것) {
        res.writeHead(400, 헤더);
        res.end(JSON.stringify({ ok: false, error: 'choose a dataset first' }));
        return;
      }
      try {
        const 결과 = await 페이팔.구독확인(입력.subscriptionID, 품);
        if (!결과.ok) {
          console.error('[pay] subscription-confirm rejected —', 결과.왜);
          res.writeHead(402, 헤더);
          res.end(JSON.stringify({ ok: false, error: 'subscription not confirmed' }));
          return;
        }
        const 받는곳 = '/api/download?order=' + encodeURIComponent(입력.subscriptionID) + '&product=' + encodeURIComponent(품.코드)
          + (골른것 ? '&dataset=' + encodeURIComponent(골른것.코드) : '');
        res.writeHead(200, 헤더);
        res.end(JSON.stringify({ ok: true, downloadUrl: 받는곳, receipt: 결과.결제번호 }));

        /* 아래는 일회성 주문의 /api/pay/capture 와 같은 편지 규칙(2026-09-15/16 지시)을
           그대로 따른다 — 주소 결정·샌드박스 차단·반송 방지 전부 동일하다. */
        const 체크아웃메일 = (() => {
          const e = String(입력.email ?? '').trim();
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : null;
        })();
        const 받을주소들 = [체크아웃메일, 결과.산사람메일].filter(Boolean)
          .filter((v, i, arr) => arr.findIndex((x) => x.toLowerCase() === v.toLowerCase()) === i)
          .filter((주소) => {
            if (!페이팔.진짜돈인가()) {
              console.log(`[pay] 편지를 안 보냈다 — 샌드박스 모드다 (구독 ${입력.subscriptionID})`);
              return false;
            }
            const 왜 = 못닿는주소인가(주소);
            if (왜) console.log(`[pay] 편지를 안 보냈다 — ${왜} (구독 ${입력.subscriptionID})`);
            return !왜;
          });
        if (받을주소들.length) {
          const 상품이름 = 품.이름 + (골른것 ? ' — ' + 골른것.이름 : '');
          const 받을링크 = 'https://seoulmarkets.com' + 받는곳;
          for (const 주소 of 받을주소들) {
            메일보내기({
              받는곳: 주소,
              제목: 'Your SMarkets subscription — ' + 상품이름,
              글: [
                (결과.산사람이름 && 주소 === 결과.산사람메일 ? `Hi ${결과.산사람이름},` : 'Hi,'),
                '',
                `Thank you for subscribing — ${상품이름}.`,
                '',
                `Download your files: ${받을링크}`,
                '',
                `Subscription ID: ${입력.subscriptionID}`,
                '',
                'This link does not expire while your subscription is active. If you ever',
                'lose it, go to https://seoulmarkets.com/recover and enter the subscription',
                'ID above — PayPal also emailed you this same ID when you subscribed.',
                '',
                'Cancel any time in your PayPal account.',
                '',
                'Questions? Write to admin@klifedesign.net',
                '',
                '— SMarkets (seoulmarkets.com)',
              ].join('\n'),
            }).then((r) => {
              if (!r.ok) console.error('[pay-mail] subscription ' + 입력.subscriptionID + ' — 편지를 못 보냈다: ' + r.왜);
            }).catch(() => { /* 메일보내기() 는 던지지 않는다 — 방어용 */ });
          }
        }
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
    const 줄것 = 줄파일들(품.코드, parsed.searchParams.get('dataset'));
    if (!줄것.length) {
      res.writeHead(503, { ...헤더, 'Content-Type': 'text/plain; charset=utf-8' })
        .end('Paid, but we could not work out which dataset to send. Write to admin@klifedesign.net with your order id and we will sort it out.');
      return;
    }
    /* 묶음(.tar.gz)으로 한 번에 준다 — 손님이 파일을 하나씩 누르지 않아도 된다.
       ⛔ 만드는 데 실패하면 «조용히» 빈 파일을 주지 않는다. 목록으로 떨어뜨린다. */
    if (parsed.searchParams.get('as') !== 'list') {
      try {
        const 몸 = await 묶음만들기(줄것);
        res.writeHead(200, {
          ...헤더,
          'Content-Type': 'application/gzip',
          'Content-Disposition': 'attachment; filename="seoulmarkets-' + 품.코드 + '-' + 오늘글() + '.tar.gz"',
          'Content-Length': String(몸.length),
        });
        res.end(몸);
        return;
      } catch (e) {
        console.error('[download] tar.gz failed, falling back to list —', e?.message ?? e);
      }
    }
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

    /* ── 백년지도 칼럼 쓰기 (2026-10-31 · 1번) ─────────────────────────
     * 사장님: 「내가 글을 쓸 수 있는 cms를 게시판 식으로 만들어 나와 너희만 접속 가능하게」
     * ⭐ 로그인은 «위의 편집국 확인 그대로»다 — 따로 만들지 않았다. 여기 닿았으면 이미 통과했다.
     * 저장 요청은 같은 곳에서 왔는지·화면 확인값이 맞는지를 column-admin.mjs 가 한 번 더 본다. */
    if (pathname === '/admin/column' || pathname.startsWith('/admin/column/')) {
      const r = await 칼럼편집국(req, pathname);
      res.writeHead(r.status, { ...adminHeaders, ...r.headers });
      res.end(req.method === 'HEAD' ? undefined : r.body);
      return;
    }

    /* 🔴 [2026-11-01 · 사장님] 「ip가 같은 곳은 방문자 한명(즉 순방문자)로 계산해」
     *   「각 사이트마다 방문자, 페이지뷰를 어디서 볼 수 있나」
     * ⇒ 열면 바로 보이는 화면. 구글 애널리틱스에서 여러 번 눌러 찾지 않아도 된다.
     * ⚠ 이 수치는 우리 서버가 IP로 직접 센 것이다. IP 원본은 저장하지 않는다. */
    if (pathname === '/admin/visitors') {
      const 날짜 = (parsed.searchParams.get('date') || '').match(/^\d{4}-\d{2}-\d{2}$/)
        ? parsed.searchParams.get('date') : 방문.오늘();
      const 오늘인가 = 날짜 === 방문.오늘();
      const 표 = 오늘인가 ? 방문.집계(날짜) : (await 방문.지난날집계(날짜)) ?? {};
      if (parsed.searchParams.get('json') === '1') {
        res.writeHead(200, { ...adminHeaders, 'Content-Type': 'application/json; charset=utf-8' });
        res.end(req.method === 'HEAD' ? undefined : JSON.stringify({ 날짜, 사이트: 표 }, null, 1));
        return;
      }
      const ㄴ = (x) => Number(x ?? 0).toLocaleString('ko-KR');
      const 줄 = Object.entries(표).sort((a, b) => b[1].방문자 - a[1].방문자)
        .map(([이름, v]) => `<tr><td>${이름}</td><td class="n">${ㄴ(v.방문자)}</td>`
          + `<td class="n">${ㄴ(v.조회수)}</td>`
          /* ⛔ 아무도 안 왔으면 0 이 아니라 '—' 다 — 나눌 것이 없는 것과 0 은 다르다 */
          + `<td class="n">${v.방문자 ? (v.조회수 / v.방문자).toFixed(1) : '—'}</td>`
          + `<td class="n auto">${ㄴ(v.자동)}</td><td class="n auto">${ㄴ(v.자동조회수)}</td>`
          /* 🔴 [2026-11-02] 못 가린 것은 사람에도 자동에도 넣지 않는다 — 따로 적는다 */
          + `<td class="n auto">${ㄴ(v.미분류방문자)}</td></tr>`).join('');
      /* 🔴 누가 긁어 가는지 사장님도 보셔야 한다. 판별 규칙이 틀렸으면 여기서 드러난다 */
      const 이름표모음 = new Map();
      for (const v of Object.values(표)) {
        for (const [이름, n] of (v.이름표 ?? [])) 이름표모음.set(이름, (이름표모음.get(이름) ?? 0) + n);
      }
      const 긁는것 = [...이름표모음].sort((a, b) => b[1] - a[1]).slice(0, 15)
        .map(([이름, n]) => `<tr><td style="font-size:12px;word-break:break-all;">${String(이름).replace(/[<>&]/g, '')}</td><td class="n">${ㄴ(n)}</td></tr>`).join('');
      const 앞날 = new Date(`${날짜}T00:00:00+09:00`);
      const 하루전 = new Date(앞날.getTime() - 86400000);
      const 하루뒤 = new Date(앞날.getTime() + 86400000);
      const 몸 = `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>방문자 — ${날짜}</title>
<style>
body{font-family:system-ui,"Malgun Gothic",sans-serif;margin:0;padding:24px 16px;background:#fbfbfd;color:#15171c}
.wrap{max-width:720px;margin:0 auto}
h1{font-size:20px;margin:0 0 4px}
.sub{color:#5c6270;font-size:13px;margin:0 0 18px}
table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #e3e5ea;border-radius:10px;overflow:hidden}
th,td{padding:11px 12px;border-top:1px solid #eceef2;font-size:14px;text-align:left}
th{background:#f3f4f7;font-size:12.5px;color:#4a505c}
tr:first-child td{border-top:0}
td.n,th.n{text-align:right;font-variant-numeric:tabular-nums}
td.auto,th.auto{color:#8a909c}
.섞임{margin:0 0 16px;padding:12px 14px;border:1px solid #e8c88a;background:#fdf6e6;border-radius:9px;font-size:13px;line-height:1.75;color:#6b5420}
.nav{margin:16px 0;font-size:14px}
.nav a{color:#2b4bd8;text-decoration:none;margin-right:14px}
.note{margin-top:18px;font-size:12.5px;color:#5c6270;line-height:1.7}
.none{padding:18px;color:#5c6270;font-size:14px;background:#fff;border:1px solid #e3e5ea;border-radius:10px}
</style></head><body><div class="wrap">
<h1>방문자 — ${날짜}</h1>
<p class="sub">우리 서버가 IP로 직접 집계한 수치입니다. 같은 IP는 하루에 몇 번 와도 1명입니다.<br>
<b>방문자는 사람만 센 수입니다.</b> 검색엔진·AI 수집기 같은 자동 접속은 오른쪽에 따로 세어 둡니다.</p>
${날짜 <= '2026-11-01' ? `<p class="섞임"><b>이 날은 사람과 자동을 못 갈랐습니다.</b>
자동 접속을 가려내는 장치를 2026-11-01 09시에 넣었습니다. 그 전에 쌓인 수치에는
검색엔진·AI 수집기가 섞여 있습니다 — <b>사람 수로 읽지 마십시오.</b>
사람 수로 보실 수 있는 것은 2026-11-02 수치부터입니다.</p>` : ''}
<div class="nav">
  <a href="/admin/visitors?date=${방문.오늘(하루전)}">← 하루 전</a>
  <a href="/admin/visitors">오늘</a>
  <a href="/admin/visitors?date=${방문.오늘(하루뒤)}">하루 뒤 →</a>
</div>
${줄 ? `<table><thead><tr><th>사이트</th><th class="n">방문자</th><th class="n">조회수</th><th class="n">1인당</th><th class="n auto">자동</th><th class="n auto">자동 조회</th><th class="n auto">미분류</th></tr></thead><tbody>${줄}</tbody></table>`
  + (긁는것 ? `<h2 style="font-size:14px;margin:22px 0 8px;">들어온 것들 (많은 차례로 15개)</h2>
<table><thead><tr><th>브라우저·프로그램 이름</th><th class="n">연 횟수</th></tr></thead><tbody>${긁는것}</tbody></table>` : '')
    : '<p class="none">그 날 집계가 없습니다. 이 기능을 넣은 2026-11-01 이전 날짜는 수치가 없습니다.</p>'}
<p class="note">
  · 화면(HTML)을 받아 간 요청만 셉니다. 그림·스타일 요청은 세지 않습니다.<br>
  · IP 원본은 저장하지 않습니다. 날짜를 섞은 되돌릴 수 없는 값으로만 셉니다.<br>
  · <b>자동</b> 칸은 검색엔진·AI 수집기·보안 스캐너입니다. 사람 수에 넣지 않습니다.<br>
  · 자기를 브라우저라고 속이는 자동 접속은 못 거릅니다. 못 거른다고 적어 둡니다.<br>
  · <b>미분류</b>는 접속 이름이 안 남았거나 이름이 끊겨 사람인지 자동인지 <b>못 가린 것</b>입니다.
    사람에도 자동에도 넣지 않습니다 — 0으로 채우지 않고 못 가렸다고 적습니다.<br>
  · <b>1인당</b>은 사람으로 센 방문자가 받아 간 횟수입니다. 같은 사람이 다시 오면 그 사람 몫에 더합니다.<br>
  · 집계 방식은 케이라이프맵과 같습니다(2026-11-02 사장님 지시). 케이라이프맵은 서버가 달라 이 표에 없습니다.
</p>
</div></body></html>`;
      res.writeHead(200, { ...adminHeaders, 'Content-Type': 'text/html; charset=utf-8' });
      res.end(req.method === 'HEAD' ? undefined : 몸);
      return;
    }

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

  /* ── 백년지도 칼럼 — 서버가 채워 내는 네 자리 (2026-10-31 · 1번) ──────────
   *   /            첫 화면의 빈 칸(data-slot="home-columns")을 최근 공개 칼럼 셋으로 바꾼다
   *   /column      목록
   *   /column/<주소> 글
   *   /sitemap.xml 정적 사이트맵에 공개 칼럼 주소를 덧붙인다
   * ⭐ 글은 R2 에 있어 빌드가 모른다. 그래서 정적 파일을 읽어 «여기서» 채운다.
   * ⛔ 저장소가 늦거나 죽어도 첫 화면·사이트맵은 칼럼 없이 그대로 낸다(칼럼 때문에 홈이 죽지 않는다).
   *   칼럼 화면만 「잠시 뒤」로 답한다 — 「아직 없다」고 거짓으로 말하지 않는다. */
  if (prefix === '/100y' && (pathname === '/100y' || pathname === '/100y/sitemap.xml' || pathname === '/100y/column' || pathname === '/100y/column.md' || pathname.startsWith('/100y/column/'))) {
    const r = await 백년칼럼화면(pathname, parsed.searchParams);
    if (r) {
      res.writeHead(r.status, {
        ...BASE_HEADERS,
        'Content-Type': r.type,
        'Cache-Control': r.status === 200 ? cacheFor(pathname, r.type.startsWith('application/xml') ? '.xml' : '.html') : 'no-store',
        'Content-Length': Buffer.byteLength(r.body),
      });
      res.end(headOnly ? undefined : r.body);
      return;
    }
  }

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
    /* 🔴 [2026-10-26 · 1번 · 사장님 「서울마켓츠 색인 거부됐다. 해결 해라」] 위 둘과 «같은 날 같이 내린»
       셋째 지면인데 이 표에서 빠져 있었다 — 서치콘솔이 「찾을 수 없음(404)」으로 알려 왔다.
       대중 무역수지 글이라 대중 무역을 다룬 살아 있는 재작성본으로 보낸다. */
    '/article/korea-china-trade-balance-flipped': '/article/korea-trade-surplus-not-china',
    /* 🔴 [2026-11-09 · 5번 · 사장님이 서치콘솔 통지를 주셨다] **같은 흠이 또 났고 이번엔 내 것이다.**
       2026-10-11 에 내가 이 두 장을 내리면서 카탈로그와 사이트맵에서는 뺐는데
       **이 표에는 안 넣었다.** 사이트맵에서 빼는 것은 「구글에게 새로 알리지 않는 것」이지
       「구글이 잊는 것」이 아니다 — 2번이 10월 초에 이미 「Discovered」까지 확인해 둔 주소였다.
       그 뒤로 구글이 계속 긁어 404 를 받았고(마지막 크롤 10-29), 1번이 10-26 에 올린
       「찾을 수 없음(404)」 유효성 검사가 11-07 에 **이 장 때문에 실패했다.**
       ⭐ 내리는 일은 세 자리다 — 카탈로그 · 사이트맵 · **이 표**. 셋째를 빠뜨리면 404 가 남는다.
       뜻이 가까운 곳 — 둘 다 은행 가계대출 자료라 살아 있는 은행 가계대출 지면으로 보낸다.
       ⚠ 되살릴 때 이 두 줄도 함께 뗀다. docs/내린지면/README.md */
    '/data/bank-loan-delinquency': '/data/fixed-variable-rate-share',
    '/data/mortgage-balance-gender-gap': '/data/fixed-variable-rate-share',
    /* 🔴 [2026-11-10 · 5번 · 사장님 「유료지역 리포트 없애라고 전에 말했잖아」]
       **값 지면을 내렸다.** 지역 한 벌은 2026-09-10 에 이미 무료가 됐는데(price.ts
       `미리보기그만`) `/price` 만 살아서 「9,900원」을 세 번 보여 주고 있었다.
       팔지 않는 값을 적어 둔 것이라 손님에게는 거짓말이고, 광고를 거는 데도 걸린다.
       ⭐ 내리는 일은 세 자리다 — 카탈로그 · 사이트맵 · **이 표**(2026-11-09 에 배운 것).
       ⚠ 백년지도 내부 길에는 `/100y` 가 붙는다. 보내는 곳은 손님이 보는 주소다.
       뜻이 가까운 곳 — 지역 리포트로 가는 입구인 `/region` 으로 보낸다. */
    '/100y/price': '/region',
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

/**
 * 백년지도 칼럼 화면을 만든다. 돌려주는 것: { status, type, body } · null 이면 정적 처리로 넘긴다.
 * ⚠ 정적 파일(dist/100y.html · dist/100y/column.html · dist/100y/sitemap.xml)을 «껍데기»로 쓴다.
 */
async function 백년칼럼화면(pathname, searchParams) {
  const HTML = 'text/html; charset=utf-8';
  const 읽기 = async (상대) => { try { return await 파일읽기(join(ROOT, 상대), 'utf8'); } catch { return null; } };

  if (pathname === '/100y') {
    const 홈 = await 읽기('100y.html');
    if (!홈) return null;
    const 글들 = await 칼럼.공개목록();
    return { status: 200, type: HTML, body: 칼럼.홈채우기(홈, 글들 ?? []) };
  }
  if (pathname === '/100y/sitemap.xml') {
    const xml = await 읽기('100y/sitemap.xml');
    if (!xml) return null;
    const 글들 = await 칼럼.공개목록();
    return { status: 200, type: TYPES['.xml'], body: 칼럼.사이트맵더하기(xml, 글들 ?? []) };
  }

  /* 빌드가 낸 column.md 는 «0편일 때» 모습이라 실제 목록과 어긋난다 — 여기서 새로 쓴다 */
  if (pathname === '/100y/column.md') {
    const 글들 = await 칼럼.공개목록();
    if (글들 == null) return { status: 503, type: TYPES['.md'], body: '# 백년지도 칼럼\n\n칼럼을 잠시 불러오지 못했습니다.\n' };
    const 줄 = 글들.map((g) => `- [${g.title.replace(/[[\]]/g, '')}](${칼럼.ORIGIN}${칼럼.글주소(g.slug)}) — ${칼럼.날짜만(g.publishedAt || g.createdAt)}`);
    return { status: 200, type: TYPES['.md'], body: `# 백년지도 칼럼\n\n백년지도가 쓰는 칼럼입니다. 필자: 백년지도.\n\n${줄.length ? 줄.join('\n') : '아직 실린 칼럼이 없습니다.'}\n` };
  }

  const 껍데기 = await 읽기('100y/column.html');
  if (!껍데기) return null;
  const 잠시뒤 = () => ({
    status: 503, type: HTML,
    body: 칼럼.껍데기채우기(껍데기, { 제목: '백년지도 칼럼', 설명: '칼럼을 잠시 불러오지 못했습니다.', 주소: 칼럼.ORIGIN + '/column', 본문: '<p class="col-kicker">백년지도 칼럼</p><h1>잠시 뒤 다시 열어 주십시오</h1><p class="lead">칼럼을 불러오지 못했습니다. 글이 사라진 것은 아닙니다.</p><p class="note"><a href="/">백년지도 첫 화면으로 →</a></p>' })
      ?? 'Service Unavailable',
  });
  const 글들 = await 칼럼.공개목록();
  if (글들 == null) return 잠시뒤();

  if (pathname === '/100y/column') {
    const body = 칼럼.껍데기채우기(껍데기, {
      제목: '백년지도 칼럼',
      설명: '백년지도가 쓰는 칼럼입니다. 0세부터 100세까지, 숫자 뒤에 있는 이야기를 씁니다.',
      주소: 칼럼.ORIGIN + 칼럼.목록주소(),
      본문: 칼럼.목록본문HTML(글들),
    });
    return body ? { status: 200, type: HTML, body } : null;
  }

  let slug;
  try { slug = decodeURIComponent(pathname.slice('/100y/column/'.length)); } catch { slug = null; }
  if (!slug || !칼럼.주소맞나(slug)) return null;   // 정적 처리로 넘겨 404 를 낸다
  let 글;
  try { 글 = await 칼럼.공개글찾기(slug); } catch (e) {
    console.error('[column] 글을 못 읽었다 —', e?.message ?? e);
    return 잠시뒤();
  }
  if (!글) return null;
  const 주소 = 칼럼.ORIGIN + 칼럼.글주소(글.slug);
  const body = 칼럼.껍데기채우기(껍데기, {
    제목: 글.title,
    설명: 칼럼.글설명(글),
    주소,
    종류: 'article',
    jsonLd: 칼럼.글jsonLd(글),
    본문: 칼럼.글본문HTML(글, 글들),
    덧머리: `<meta property="article:published_time" content="${칼럼.esc(글.publishedAt || 글.createdAt)}"><meta property="article:modified_time" content="${칼럼.esc(글.updatedAt)}"><meta property="article:section" content="${칼럼.esc(칼럼.코너이름)}">`,
  });
  return body ? { status: 200, type: HTML, body } : null;
}

const server = createServer((req, res) => {
  /* 🔴 [2026-11-01] **`writeHead(status, 머리)` 로 넣은 머리글은 `getHeader()` 로 못 읽는다.**
     그래서 「화면을 받아 갔나」를 응답 종류로 판별하려다 한 건도 못 셌다(실물 시험에서 잡았다).
     ⇒ 여기서 한 번 감싸 두고 종류를 기억해 둔다. 응답 내용은 손대지 않는다. */
  const 원래머리쓰기 = res.writeHead.bind(res);
  res.writeHead = function (...인자) {
    try {
      const 머리 = 인자.find((x) => x && typeof x === 'object' && !Array.isArray(x));
      const t = 머리 && (머리['Content-Type'] ?? 머리['content-type']);
      if (t) res.응답종류 = String(t);
    } catch { /* 기억에 실패해도 응답은 그대로 나간다 */ }
    return 원래머리쓰기(...인자);
  };

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
        /* ⭐ [2026-09-17] 우리 점검 자가 스스로 대는 이름. 손님은 이 머리글을 안 붙인다.
         *   값은 안 남긴다 — 「붙었나 안 붙었나」만 본다(traffic.mjs 우리점검머리글 참조) */
        우리점검: !!req.headers[우리점검머리글],
      });
      flush할때되면();
    } catch { /* 측정은 조용히 실패한다 */ }
    /* 🔴 [2026-11-01 · 사장님] IP 기준 순방문자. 화면(HTML)을 받아 간 것만 센다 —
       그림·스타일·자료 요청까지 세면 한 사람이 수십 번으로 부풀어 뜻이 없어진다. */
    try {
      const 종류 = String(res.응답종류 ?? res.getHeader('Content-Type') ?? '');
      if (res.statusCode < 400 && 종류.startsWith('text/html')) {
        방문.기록(req.headers.host, 방문.주소뽑기(req), req.headers['user-agent'],
          undefined, req.url);
      } else if (res.statusCode < 400
        && /^(text\/css|application\/javascript|text\/javascript|font\/|image\/)/.test(종류)) {
        /* 🔴 [2026-11-03 · 사장님 「오늘 잘못됐지? 수정해」]
           **조회수로 세지 않는다.** 「이 주소가 브라우저였다」는 표만 남긴다.
           진짜 브라우저는 화면을 받으면 모양표·글씨체·그림을 이어서 받아 간다.
           주소를 바꿔 가며 브라우저 이름을 흉내 내는 수집기는 화면만 받고 끝낸다.
           ⚠ 아직 판정에 쓰지 않는다 — 세어서 따로 보여 주기만 한다. */
        방문.부속기록(req.headers.host, 방문.주소뽑기(req));
      }
    } catch { /* 집계 때문에 사이트가 죽는 일은 없어야 한다 */ }

    /* 🔴 [2026-11-05 · 사장님 「아무도 못뚫는」] 못 찾은 주소를 «서로 다른 주소의 수»로 센다.
       목록에 없는 주소를 하나씩 두드려 보는 쪽은 여기서 자국이 남는다.
       ⛔ 응답이 이미 나간 뒤다 — 손님을 한 톨도 늦추지 않는다. */
    침입끝났다(req, res);
  });

  /* 🔴🔴 [2026-11-05 · 사장님] **침입을 스스로 알아보고 문에서 끊는다.**
     「AI의 침입을 막을 수 있는 건 AI뿐이라고 난 생각한다. 보안에 문제가 생기지 않게
       예방조치, 누가 침입을 시도하면 바로 알아서 막을 수 있는 조치를 해라」
     ⛔ 무엇에 걸렸는지 알려 주지 않는다 — 알려 주면 그것만 피해서 다시 온다.
     ⛔ 구글·손님은 안 끊는다(src/lib/침입막기.mjs 자가시험이 그것을 지킨다).
     🔴 탈이 나면 환경변수 `침입막기=끈다` 로 코드를 안 고치고 끌 수 있다. */
  if (침입을끊나(req)) {
    res.writeHead(403, { ...BASE_HEADERS, 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

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

/* ══════════════════════════════════════════════════════════════════════
   🔴🔴 [2026-11-02 · 사장님] 「케이라이프맵 관리자 페이지에 세 사이트
                              방문자 등의 집계를 볼 수 있게 해」
   ─────────────────────────────────────────────────────────────────────
   서울마켓츠·백년지도·케이컬처와이어는 이 서버가 함께 낸다. 케이라이프맵은 서버가
   다르다. 그래서 **이쪽이 저쪽으로 보낸다.** 사장님은 화면 하나에서 네 곳을 보신다.
   ⛔ 개인을 가리키는 것은 보내지 않는다 — 수와 접속 정보 목록뿐이다.
   ⛔ 보내기가 실패해도 이 서버가 멈추지 않는다. 집계는 그대로 돈다.
   ⚠ 열쇠(KLM_ADMIN_KEY)가 없으면 **조용히 아무 일도 하지 않는다.** 내 자리에서
     띄울 때마다 라이브로 수치가 날아가면 안 된다.
   ══════════════════════════════════════════════════════════════════════ */
const KLM_ADMIN_KEY = process.env.KLM_ADMIN_KEY || '';
const KLM_받는곳 = process.env.KLM_BASE || 'https://klifemap.ai';
const 보내는주기ms = 2 * 60 * 1000;

/* 🔴🔴 [2026-11-03 · 사장님 「조회수와 사람수에서 우리를 빼」]
   «우리» 바깥 주소 목록을 케이라이프맵에서 받아 온다.
   ⛔ 이 저장소는 공개다 — 주소를 여기 적지 않는다.
   ⛔ 못 받으면 **쥐고 있던 것을 그대로 둔다.** 빈 목록으로 덮으면 우리가 다시
     손님으로 세어지는데, 그것이 «조용히» 틀리는 자리다.
   ⚠ 받은 뒤 다시가른다()가 그 날 오전치까지 소급해서 고친다. */
async function 우리주소를받아온다() {
  if (!KLM_ADMIN_KEY) return false;
  try {
    const r = await fetch(`${KLM_받는곳}/api/admin/visitors/our-ips`, {
      headers: { 'x-admin-key': KLM_ADMIN_KEY },
      signal: AbortSignal.timeout(20000),
    });
    if (!r.ok) {
      console.warn(`[방문자] 우리 주소 목록을 못 받았다 — HTTP ${r.status} (쥐고 있던 것을 그대로 쓴다)`);
      return false;
    }
    const j = await r.json();
    return 방문.우리주소를받는다(j?.주소);
  } catch (e) {
    console.warn('[방문자] 우리 주소 목록을 못 받았다 —', e?.message ?? e);
    return false;
  }
}

async function 케이라이프맵에보낸다() {
  if (!KLM_ADMIN_KEY) return false;
  try {
    /* ⚠ 보내기 «전에» 받아서 다시 가른다 — 옛 기준으로 센 수를 올리면 화면에
       고쳐지기 전 수치가 2분 동안 남는다. */
    await 우리주소를받아온다();
    try { 방문.다시가른다(); } catch (e) { /* 다시 가르다 걸려도 보내는 것은 계속한다 */ }
    const 날짜 = 방문.오늘();
    const 표 = 방문.집계(날짜);
    if (!Object.keys(표).length) return false;
    const r = await fetch(`${KLM_받는곳}/api/admin/visitors/outside`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-admin-key': KLM_ADMIN_KEY },
      body: JSON.stringify({ 날짜, 사이트: 표 }),
      signal: AbortSignal.timeout(20000),
    });
    if (!r.ok) {
      console.warn(`[방문자] 케이라이프맵에 못 보냈다 — HTTP ${r.status}`);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[방문자] 케이라이프맵에 못 보냈다 —', e?.message ?? e);
    return false;
  }
}

server.listen(PORT, () => {
  console.log(`serving dist/ on http://0.0.0.0:${PORT}`);
  /* 그 날 저장분을 읽어 이어서 센다 — 배포로 다시 떠도 오전치가 사라지지 않게 */
  방문.시작한다().catch((e) => console.warn('[방문자] 시작 실패(집계는 계속한다) —', e?.message ?? e));
  if (KLM_ADMIN_KEY) {
    케이라이프맵에보낸다();
    const 시계 = setInterval(() => { 케이라이프맵에보낸다(); }, 보내는주기ms);
    if (시계.unref) 시계.unref();
    console.log('[방문자] 케이라이프맵 관리자 화면으로 2분마다 보낸다');
  } else {
    console.log('[방문자] KLM_ADMIN_KEY 가 없어 케이라이프맵으로 보내지 않는다');
  }
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
    /* 🔴 [2026-11-01] IP 기준 집계도 같이 저장한다 — 배포가 잦아 이 자리가 없으면 그날치가 샌다 */
    await Promise.race([
      방문.저장하기().catch(() => false),
      new Promise((풀기) => { setTimeout(() => 풀기(false), 2000); }),
    ]);
  } catch (e) {
    console.error(`[${신호}] 흘려쓰기 실패(무시하고 나간다) — ${e?.message ?? e}`);
  }
  process.exit(0);
}
for (const 신호 of ['SIGTERM', 'SIGINT']) process.on(신호, () => { 끝낼때흘려쓴다(신호); });
