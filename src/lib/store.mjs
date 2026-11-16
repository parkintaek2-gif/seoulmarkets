/**
 * 아카이브 저장소 — 로컬 디스크와 S3 호환 오브젝트 스토리지(Cloudflare R2).
 *
 * ── 왜 필요한가. 이게 잠재 사고였다 ─────────────────────────────
 * 수집기는 `archive/` 로 파일을 쓴다. 그런데 **Cloudtype 컨테이너에는 영구 디스크가 없다.**
 * 재배포하면 파일시스템이 통째로 새로 뜬다.
 *
 * 인증키가 나온 뒤 그대로 수집을 시작했으면, 배포 한 번에 아카이브가 사라진다.
 * 그리고 관세청 10일 잠정치는 **다시 못 받는다** — 확정치로 덮인 뒤에는 원본이 없다.
 * 사업 전체가 「아카이브가 해자」라는 전제 위에 서 있는데, 그 해자가 재배포마다
 * 비워지는 구조였다.
 *
 * klifemap 세션이 SQLite 를 R2 로 복제(litestream)하는 것을 보고 같은 길로 간다.
 * **다만 그쪽 버킷·키는 쓰지 않는다.** 남의 데이터와 섞이면 사고가 났을 때 둘 다 죽는다.
 *
 * ── 왜 SDK 를 안 쓰는가 ─────────────────────────────────────────
 * 이 저장소의 런타임 의존성은 0개다. Cloudtype 메모리가 0.25GB 로 묶여 있고 실측이
 * 47.6MB 라 여유가 그리 크지 않다. AWS SDK 는 그 균형을 깬다.
 * S3 PUT 하나에 필요한 것은 SigV4 서명뿐이고, 그건 node:crypto 로 100줄이면 된다.
 * ──────────────────────────────────────────────────────────────
 *
 * 환경변수 (없으면 로컬 디스크로만 저장한다 — 개발 중에는 그게 정상이다)
 *   ARCHIVE_S3_ENDPOINT    예: https://<account>.r2.cloudflarestorage.com
 *   ARCHIVE_S3_BUCKET
 *   ARCHIVE_S3_KEY_ID
 *   ARCHIVE_S3_SECRET
 *   ARCHIVE_S3_REGION      기본 'auto' (R2)
 *   ARCHIVE_DIR            로컬 경로. 기본 ./archive
 */

import { createHash, createHmac } from 'node:crypto';
import { mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/* .env 를 직접 읽는다 — 의존성은 늘리지 않는다(이 저장소의 런타임 의존성은 0개다).
 *
 * 왜 필요한가. 2026-08-02 에 이것 때문에 사고가 날 뻔했다.
 * `scripts/fill-loop.sh` 는 `node scripts/collect-research.mjs` 를 그냥 부른다.
 * `--env-file` 이 없으니 인증값이 안 들어오고, remoteEnabled 가 false 가 되어
 * **수집한 파일이 로컬에만 쌓인다.** 그런데 아무 오류도 안 난다 — 설계상 조용히
 * 로컬 저장으로 내려앉기 때문이다. 12만 건이 그렇게 이 PC 에만 있었다.
 *
 * 실행하는 쪽이 플래그를 기억해야 하는 구조는 언젠가 잊는다. 저장소가 스스로 읽는다.
 * 이미 환경에 값이 있으면(운영 콘솔에서 넣은 경우) 그쪽을 그대로 둔다. */
/* ⚠ 2026-08-02 KST 수정 — 여기에 `if (process.env.ARCHIVE_S3_KEY_ID) return;` 가 있었다.
 *   R2 값 하나가 환경에 있으면 **.env 를 통째로 안 읽는** 구조였다.
 *   그러면 Cloudtype 콘솔에 R2 를 넣어 둔 환경에서 `DART_API_KEY` 같은 **다른 키가
 *   영영 안 읽힌다.** 그리고 그것도 조용히 실패한다 — 이 함수가 막으려던 바로 그 사고다.
 *
 *   아래 반복문이 이미 변수별로 「없을 때만 넣는다」를 하므로 그 가드는 불필요했다.
 *   운영 콘솔 값을 덮지 않는다는 원래 의도는 그 한 줄로 그대로 지켜진다. */
function 환경파일읽기() {
  try {
    const 본문 = readFileSync(path.resolve('.env'), 'utf8');
    for (const 줄 of 본문.split(/\r?\n/)) {
      const m = 줄.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
      if (!m) continue;                                // 주석·빈 줄
      const 값 = m[2].trim().replace(/^["']|["']$/g, '');
      if (process.env[m[1]] === undefined) process.env[m[1]] = 값;
    }
  } catch { /* .env 가 없는 것은 정상이다 — 그때는 로컬 저장만 한다 */ }
}
환경파일읽기();

const CFG = {
  endpoint: process.env.ARCHIVE_S3_ENDPOINT ?? '',
  bucket: process.env.ARCHIVE_S3_BUCKET ?? '',
  keyId: process.env.ARCHIVE_S3_KEY_ID ?? '',
  secret: process.env.ARCHIVE_S3_SECRET ?? '',
  region: process.env.ARCHIVE_S3_REGION ?? 'auto',
  dir: path.resolve(process.env.ARCHIVE_DIR ?? 'archive'),
};

export const remoteEnabled = Boolean(CFG.endpoint && CFG.bucket && CFG.keyId && CFG.secret);

const sha256hex = (s) => createHash('sha256').update(s).digest('hex');
const hmac = (key, s) => createHmac('sha256', key).update(s).digest();

/** SigV4 서명키. 날짜·리전·서비스로 단계별로 파생시킨다. */
function signingKey(secret, date, region, service) {
  return hmac(hmac(hmac(hmac(`AWS4${secret}`, date), region), service), 'aws4_request');
}

/**
 * S3 키를 URI 인코딩한다.
 *
 * ⚠ encodeURIComponent 를 그대로 쓰면 `/` 까지 %2F 로 바뀌어 경로가 깨진다.
 *   구분자는 남기고 각 조각만 인코딩한다. 그리고 S3 는 `!'()*` 도 인코딩하길 요구한다 —
 *   안 하면 서명 불일치(SignatureDoesNotMatch)가 나는데, 원인을 찾기가 대단히 어렵다.
 */
function encodeKey(key) {
  return key
    .split('/')
    .map((seg) =>
      encodeURIComponent(seg).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`),
    )
    .join('/');
}

/**
 * S3 호환 서명 요청. PUT·GET 이 이걸 같이 쓴다.
 *
 * ⚠ 처음엔 PUT 전용으로 서명이 함수 안에 박혀 있었다. GET 을 붙이면서 꺼냈다 —
 *   **서명 코드가 둘로 갈리면 한쪽만 고쳐지고, 그 증상이 SignatureDoesNotMatch 다.**
 *   그 오류는 원인이 응답에 안 나와서 찾는 데 반나절이 든다. 한 곳에서만 만든다.
 *
 * @param method  'PUT' | 'GET'
 * @param key     버킷 안의 키. 인코딩은 이 함수가 한다
 * @param body    PUT 일 때만. GET 은 빈 페이로드로 서명한다
 */
async function signedFetch(method, key, { body = null, contentType = null, timeout = 60_000 } = {}) {
  const url = new URL(`${CFG.endpoint.replace(/\/$/, '')}/${CFG.bucket}/${encodeKey(key)}`);
  const payload = body === null ? Buffer.alloc(0) : Buffer.isBuffer(body) ? body : Buffer.from(body, 'utf8');
  const payloadHash = createHash('sha256').update(payload).digest('hex');

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, ''); // 20260801T091500Z
  const date = amzDate.slice(0, 8);

  /* content-type 은 실제로 보내는 요청에만 넣는다.
     ⚠ 서명한 헤더와 보내는 헤더가 다르면 서명이 깨진다. 같은 객체에서 둘 다 만든다. */
  const headers = {
    host: url.host,
    ...(contentType ? { 'content-type': contentType } : {}),
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
  };
  const signedHeaders = Object.keys(headers).sort().join(';');
  const canonicalHeaders = Object.keys(headers)
    .sort()
    .map((h) => `${h}:${headers[h]}\n`)
    .join('');

  const canonicalRequest = [
    method,
    url.pathname,
    '', // 쿼리스트링 없음
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const scope = `${date}/${CFG.region}/s3/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    scope,
    sha256hex(canonicalRequest),
  ].join('\n');

  const signature = hmac(signingKey(CFG.secret, date, CFG.region, 's3'), stringToSign).toString('hex');

  return fetch(url, {
    method,
    headers: {
      ...headers,
      authorization: `AWS4-HMAC-SHA256 Credential=${CFG.keyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    },
    ...(method === 'PUT' ? { body: payload } : {}),
    signal: AbortSignal.timeout(timeout),
  });
}

/** S3 호환 PUT. 성공하면 저장된 키를 돌려준다. */
async function putRemote(key, body, contentType) {
  const res = await signedFetch('PUT', key, { body, contentType });
  if (!res.ok) {
    // 본문에 실제 원인이 들어 있다(SignatureDoesNotMatch 등). 잘라서 남긴다.
    const detail = (await res.text().catch(() => '')).slice(0, 300);
    throw new Error(`S3 PUT ${res.status}: ${detail}`);
  }
  return key;
}

/**
 * S3 호환 DELETE.
 *
 * 🔴 [2026-09-28 · 5번] **지우는 길이 아예 없었다.** put·get·list 뿐이었다.
 *   그래서 두 가지를 못 했다 —
 *     ① 시험으로 넣은 기록을 되돌리지 못한다. 라이브 스토리지에 시험 자국이 영영 남는다
 *     ② 🔴 **손님이 「내 신청을 지워 달라」고 할 때 못 지운다.**
 *        우리 privacy 지면은 「답변에 필요한 동안만 보관한다」고 약속하고 있다.
 *        지울 수 없으면 그 약속은 못 지키는 약속이다.
 *
 * ⚠ 없는 것을 지우는 것은 «성공»이다(S3 도 204 를 준다). 없앴다는 결과는 같다.
 */
async function delRemote(key, { timeout = 30_000 } = {}) {
  const res = await signedFetch('DELETE', key, { timeout });
  if (res.status === 404 || res.status === 204 || res.ok) return true;
  const detail = (await res.text().catch(() => '')).slice(0, 300);
  throw new Error(`S3 DELETE ${res.status}: ${detail}`);
}

/**
 * 큰 묶음을 **로컬 사본 없이** 원격에만 올린다.
 *
 * 🔴 [2026-11-17 · 5번] `put()` 은 늘 `archive/<키>` 에 사본을 같이 남긴다.
 *   작은 기록에는 그게 맞지만, **370MB 짜리 지면 묶음**을 그렇게 두면 배포마다
 *   이 PC 에 370MB 가 쌓인다. 올리는 것이 목적일 때는 이쪽을 쓴다.
 * ⛔ 서명은 `signedFetch` 하나만 쓴다 — 서명 길을 둘로 가르지 않는다(위 주석 참조).
 */
export async function 원격에올린다(key, body, contentType = 'application/octet-stream') {
  if (!remoteEnabled) throw new Error('원격 저장이 꺼져 있다 — ARCHIVE_S3_* 가 없다');
  return putRemote(key, body, contentType);
}

/**
 * 원격의 한 건을 **흘려서 파일로** 받는다. 통째로 메모리에 들지 않는다.
 *
 * 🔴 [2026-11-17 · 5번] `get()` 은 본문을 통째로 버퍼에 담는다. 370MB 짜리를
 *   그렇게 받으면 **메모리가 모자라 죽는 바로 그 자리**에서 또 죽는다.
 *   이 함수를 쓰는 곳이 그 자리다 — `scripts/받는다-지어진지면.mjs`.
 * @returns 받은 바이트 수. 없으면 null
 */
export async function 원격을흘려보낸다(key, 받는곳, { timeout = 600_000 } = {}) {
  if (!remoteEnabled) throw new Error('원격 저장이 꺼져 있다 — ARCHIVE_S3_* 가 없다');
  const res = await signedFetch('GET', key, { timeout });
  if (res.status === 404) return null;
  if (!res.ok) {
    const detail = (await res.text().catch(() => '')).slice(0, 300);
    throw new Error(`S3 GET ${res.status}: ${detail}`);
  }
  const 읽개 = res.body.getReader();
  let 센것 = 0;
  for (;;) {
    const { done, value } = await 읽개.read();
    if (done) break;
    센것 += value.length;
    if (!받는곳.write(Buffer.from(value))) await new Promise((r) => 받는곳.once('drain', r));
  }
  await new Promise((r) => 받는곳.end(r));
  return 센것;
}

/** 같은 것을 파일로 받는다. 묶음을 디스크에 둘 자리가 있을 때만 쓴다 */
export async function 원격을파일로받는다(key, 낼곳, 거들 = {}) {
  const { createWriteStream } = await import('node:fs');
  return 원격을흘려보낸다(key, createWriteStream(낼곳), 거들);
}

/**
 * 한 건을 지운다 — 로컬과 원격 «둘 다».
 * ⛔ 한쪽만 지우지 않는다. 로컬만 지우면 다음에 원격에서 되살아난다.
 * ⚠ 원격이 실패해도 던지지 않고 결과에 적는다 — 부르는 쪽이 「반쯤 지웠다」를 알아야 한다.
 */
export async function del(key) {
  const out = { key, local: false, remote: false, remoteError: null };
  try {
    await rm(path.join(CFG.dir, key), { force: true });
    out.local = true;
  } catch (e) {
    out.remoteError = `local: ${e.message}`;
  }
  if (remoteEnabled) {
    try { out.remote = await delRemote(key); }
    catch (e) { out.remoteError = e.message; }
  }
  return out;
}

/**
 * S3 호환 GET. **없으면 null 을 돌려준다 — 던지지 않는다.**
 *
 * 「아직 안 올렸다」와 「네트워크가 죽었다」는 부르는 쪽에서 다르게 다뤄야 하는데,
 * 둘 다 예외로 만들면 구분이 사라진다. 404 는 null, 그 밖의 실패만 던진다.
 */
async function getRemote(key, { timeout = 30_000 } = {}) {
  const res = await signedFetch('GET', key, { timeout });
  if (res.status === 404) return null;
  if (!res.ok) {
    const detail = (await res.text().catch(() => '')).slice(0, 300);
    throw new Error(`S3 GET ${res.status}: ${detail}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

/**
 * 한 건을 저장한다.
 *
 * **로컬과 원격 양쪽에 쓴다.** 원격이 설정돼 있어도 로컬을 건너뛰지 않는다 —
 * 네트워크가 죽은 날 수집이 통째로 빠지는 것보다, 디스크에라도 남는 편이 낫다.
 * 원격 실패는 던지지 않고 결과에 담아 돌려준다. 수집기가 그걸 매니페스트에 적는다.
 */
/**
 * ⚠🔴 [2026-09-28 · 5번] **이 자를 «로컬에서» 불러도 R2 로 나간다.**
 *
 * 이 파일 맨 위가 `.env` 를 «스스로» 읽어 `remoteEnabled` 를 정한다. 그래서
 * `ARCHIVE_DIR` 만 임시 폴더로 돌려 놓고 시험해도 원격 쓰기는 그대로 일어난다.
 * 오늘 체험신청을 시험하면서 그 길로 라이브 스토리지에 시험 기록을 두 번 넣었다
 * (지웠다 — 남은 0건).
 *
 * ⇒ 새 저장 경로를 시험할 때는 **`.env` 가 없는 폴더에서 돌리거나**,
 *   `ARCHIVE_S3_BUCKET` 을 빈 값으로 덮어 원격을 꺼 놓고 한다.
 * ⇒ 그래도 들어갔으면 `del()` 로 «로컬과 원격 둘 다» 지운다. 로컬만 지우면 되살아난다.
 */
export async function put(key, body, contentType = 'application/octet-stream') {
  const out = { key, local: null, remote: null, remoteError: null };

  const full = path.join(CFG.dir, key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, body);
  out.local = full;

  if (remoteEnabled) {
    try {
      out.remote = await putRemote(key, body, contentType);
    } catch (e) {
      out.remoteError = e.message;
    }
  }
  return out;
}

/**
 * 한 건을 읽는다. **로컬을 먼저 보고, 없으면 R2 를 본다.**
 *
 * ── 왜 이 순서인가 ─────────────────────────────────────────────
 * 개발 중인 이 PC 에는 로컬에 다 있다. 운영 컨테이너에는 하나도 없다(영구 디스크가 없다).
 * 같은 코드가 양쪽에서 돌아야 하므로 **환경을 분기하지 않고 순서로 푼다.**
 * 로컬을 먼저 보는 이유는 그쪽이 빠르고 R2 요청 요금이 안 들기 때문이다.
 *
 * **없으면 null 이다.** 「없다」는 정상 상태다 — 아직 안 모은 데이터가 있는 게 당연하다.
 * 부르는 쪽이 그걸 보고 응답을 정한다.
 */
/**
 * **접두사로 열쇠 목록을 뽑는다.** (2026-08-23 · 5번)
 *
 * ── 왜 필요했나 ───────────────────────────────────────────────
 * 오늘 `/subscribe` 를 원클릭으로 고쳤다. 그런데 **몇 명이 들어왔는지 셀 길이 없었다** —
 * `put`·`get` 만 있고 목록이 없다. 세는 길이 없으면 「가입이 늘었나」를 영원히 짐작으로
 * 말하게 된다. 그건 우리가 밖으로는 안 하는 짓이다.
 *
 * ── ⛔ 서명 길을 따로 둔 까닭 ─────────────────────────────────
 * `signedFetch` 는 **쿼리스트링이 없다고 못박고** 정경로를 만든다(`'', // 쿼리스트링 없음`).
 * 목록은 `?list-type=2&prefix=…` 가 필요하니 그 자리를 고쳐야 하는데, 그 함수는
 * `put`·`get` 이 같이 쓴다 — 넷 사이트의 모든 저장이 거기에 걸려 있다.
 * ⛔ 세러 왔다가 저장을 깨뜨리지 않는다. 그래서 **여기서만 쓰는 서명**을 따로 짠다.
 * ⚠ 나중에 둘을 합칠 수는 있다. 다만 그건 세는 일이 아니라 고치는 일이고, 오늘 할 일이 아니다.
 *
 * ── 돌려주는 것 ───────────────────────────────────────────────
 * 열쇠 문자열의 배열. **없으면 빈 배열**이고, 원격이 없으면 로컬 폴더를 훑는다.
 * ⛔ 못 물었을 때 빈 배열을 돌려주지 않는다 — 던진다. 「없다」와 「못 봤다」는 다른 말이고,
 *   부르는 쪽이 그 둘을 갈라 적어야 한다.
 */
export async function list(prefix = '', { timeout = 30_000, max = 5_000 } = {}) {
  if (!remoteEnabled) {
    /* 원격이 없으면 로컬 거울을 훑는다. ⚠ 운영 통에는 영구 디스크가 없어 로컬이 비어 있다 —
       그래서 이 길로 센 수는 «이 기계가 아는 것»이지 전부가 아니다. 부르는 쪽이 그걸 안다. */
    const 뿌리 = path.join(CFG.dir, prefix);
    const 것들 = [];
    const 걷는다 = async (방, 앞) => {
      let 줄;
      try { 줄 = await readdir(방, { withFileTypes: true }); } catch { return; }
      for (const e of 줄) {
        const 안 = 앞 ? `${앞}/${e.name}` : e.name;
        if (e.isDirectory()) await 걷는다(path.join(방, e.name), 안);
        else 것들.push(prefix ? `${prefix.replace(/\/$/, '')}/${안}` : 안);
      }
    };
    await 걷는다(뿌리, '');
    return 것들.slice(0, max);
  }

  const 열쇠들 = [];
  let 이어서 = null;
  do {
    const q = new URLSearchParams({ 'list-type': '2', 'max-keys': '1000' });
    if (prefix) q.set('prefix', prefix);
    if (이어서) q.set('continuation-token', 이어서);

    const url = new URL(`${CFG.endpoint.replace(/\/$/, '')}/${CFG.bucket}?${q.toString()}`);
    const payloadHash = createHash('sha256').update(Buffer.alloc(0)).digest('hex');
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const date = amzDate.slice(0, 8);
    const headers = { host: url.host, 'x-amz-content-sha256': payloadHash, 'x-amz-date': amzDate };
    const signedHeaders = Object.keys(headers).sort().join(';');
    const canonicalHeaders = Object.keys(headers).sort().map((h) => `${h}:${headers[h]}\n`).join('');
    /* ⚠ 정경로 쿼리는 **이름 순으로 정렬**해야 한다. URLSearchParams 순서 그대로 쓰면 서명이 깨진다 */
    const canonicalQuery = [...q.entries()]
      .map(([k, v]) => [encodeURIComponent(k), encodeURIComponent(v)])
      .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .map(([k, v]) => `${k}=${v}`).join('&');
    const canonicalRequest = ['GET', '/' + CFG.bucket, canonicalQuery, canonicalHeaders, signedHeaders, payloadHash].join('\n');
    const scope = `${date}/${CFG.region}/s3/aws4_request`;
    const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256hex(canonicalRequest)].join('\n');
    const signature = hmac(signingKey(CFG.secret, date, CFG.region, 's3'), stringToSign).toString('hex');

    const res = await fetch(url, {
      method: 'GET',
      headers: { ...headers, authorization: `AWS4-HMAC-SHA256 Credential=${CFG.keyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}` },
      signal: AbortSignal.timeout(timeout),
    });
    if (!res.ok) {
      const detail = (await res.text().catch(() => '')).slice(0, 300);
      throw new Error(`S3 LIST ${res.status}: ${detail}`);
    }
    const xml = await res.text();
    for (const m of xml.matchAll(/<Key>([^<]*)<\/Key>/g)) 열쇠들.push(m[1]);
    const t = xml.match(/<NextContinuationToken>([^<]*)<\/NextContinuationToken>/);
    이어서 = xml.includes('<IsTruncated>true</IsTruncated>') && t ? t[1] : null;
  } while (이어서 && 열쇠들.length < max);

  return 열쇠들.slice(0, max);
}

export async function get(key) {
  try {
    return await readFile(path.join(CFG.dir, key));
  } catch { /* 로컬에 없다. R2 를 본다 */ }

  if (!remoteEnabled) return null;
  return getRemote(key);
}

/**
 * 설정 상태.
 *
 * ⚠ **공개 API(/v1/meta)에 그대로 실린다.** 두 가지를 지킨다.
 *
 *   ① 키·시크릿 값을 담지 않는다 — 존재 여부만.
 *      이 세션에서 `ctype ls -o json` 이 klifemap 환경변수를 통째로 뱉는 것을 두 번
 *      겪었다. 같은 실수를 우리 코드가 하면 안 된다.
 *
 *   ② **서버 절대경로를 담지 않는다.** 처음엔 local_dir 을 넣었는데
 *      `C:\Users\USER\Documents\...` 가 그대로 나갔다 — 사용자명과 디렉터리 구조가
 *      공개된다. 운영에 필요한 것은 「로컬 저장이 되고 있는가」뿐이고, 경로 자체는
 *      바깥사람에게 아무 쓸모가 없다. 필요하면 로그에서 본다.
 */
export function storeStatus() {
  return {
    local_enabled: true,
    remote_enabled: remoteEnabled,
    remote_endpoint_host: CFG.endpoint ? new URL(CFG.endpoint).host : null,
    remote_bucket: CFG.bucket || null,
    remote_region: CFG.region,
    credentials_present: Boolean(CFG.keyId && CFG.secret),
    /**
     * 원격이 꺼져 있으면 그 사실이 곧 경고다. 아카이브가 이 사업의 해자인데
     * 재배포마다 비워지는 상태라는 뜻이기 때문이다.
     */
    warning: remoteEnabled
      ? null
      : 'Remote object storage is not configured; the archive is not durable across redeploys.',
  };
}

/** 운영용 — 경로가 필요할 때만 쓴다. **공개 응답에 넣지 말 것.** */
export function localDir() {
  return CFG.dir;
}
