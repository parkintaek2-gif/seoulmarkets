/**
 * gmail-send.mjs — **회사 메일을 실제로 보내는 «한 곳»** (Gmail API · 도메인 위임)
 * ─────────────────────────────────────────────────────────────────────────
 * 🔴 [2026-09-15 · 6번 · 사장님 지시 — 5번 전달, 9/16 21시] 「회원가입 안하면
 *   정보를 어떻게 보내지?」에서 나온 일이다. 결제 뒤 손님에게 편지를 보내려면
 *   server.mjs 가 Gmail 을 불러야 하는데, 그 조각(`jwt만들기()`)이 지금까지
 *   `scripts/send-mail.mjs` 의 `main` 안 «클로저»로만 있어 서버가 못 썼다.
 *
 * ⇒ 그 조각을 여기로 뽑는다. `scripts/send-mail.mjs`(CLI)와 `server.mjs`(결제 뒤
 *   자동 발송)가 **같은 함수**를 쓴다 — 한 곳에서만 보내야 나중에 두 곳이 어긋나지 않는다.
 *
 * ⛔ 여기 있는 `메일보내기()`는 **절대 던지지 않는다.** 결제가 성공한 뒤에 부르는
 *   자리라서, 메일이 막혀도 결제 자체는 그대로 성공이어야 한다 — 실패는
 *   `{ ok:false, 왜 }`로만 돌려주고, 부르는 쪽이 로그에만 남기면 된다.
 */
import { readFileSync, existsSync } from 'node:fs';
import { createSign } from 'node:crypto';

export const 갈래 = 'https://www.googleapis.com/auth/gmail.send';

/**
 * 보내는 주소. ⛔ 관리용(admin@)은 쓰지 않는다. 자리 번호가 있으면 그 자리 주소,
 * 없으면(서버 프로세스처럼 CLAUDE_SEAT 이 없는 곳) MAIL_FROM 을 따른다.
 * (scripts/send-mail.mjs 8/30 실측 그대로 — cs@ 는 Workspace 의 실제 사용자가 아니다)
 */
const 자리번호 = String(process.env.CLAUDE_SEAT ?? '').match(/^[1-9]$/)?.[0] ?? null;
export const 보내는주소 = process.env.MAIL_FROM
  ?? (자리번호 ? `u${자리번호}@klifedesign.net` : 'admin@klifedesign.net');
export const 보내는이름 = process.env.MAIL_FROM_NAME ?? 'SMarkets';

/** RFC 2822 제목. 한글이면 MIME(=?UTF-8?B?...?=)으로 감싼다 — 안 그러면 받는 쪽에서 깨진다 */
export function 제목인코딩(제목) {
  const s = String(제목 ?? '');
  if (/^[\x20-\x7E]*$/.test(s)) return s;
  return `=?UTF-8?B?${Buffer.from(s, 'utf8').toString('base64')}?=`;
}

/** 파일 이름으로 MIME 종류를 고른다. ⛔ 모르는 것은 지어내지 않고 octet-stream 을 쓴다 */
export function 종류고르기(파일이름) {
  const n = String(파일이름 ?? '').toLowerCase();
  if (n.endsWith('.pdf')) return 'application/pdf';
  if (n.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (n.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (n.endsWith('.csv')) return 'text/csv';
  if (n.endsWith('.tsv')) return 'text/tab-separated-values';
  if (n.endsWith('.md') || n.endsWith('.txt')) return 'text/plain';
  if (n.endsWith('.png')) return 'image/png';
  if (n.endsWith('.jpg') || n.endsWith('.jpeg')) return 'image/jpeg';
  return 'application/octet-stream';
}

/** 첨부 이름도 제목과 같은 MIME 인코딩으로 감싼다 — 한글 파일이름이 깨지지 않게 */
export function 첨부이름인코딩(이름) {
  return 제목인코딩(이름);
}

/** 편지 한 통. 첨부가 있으면 multipart/mixed 로 짠다 */
/**
 * 글을 «흐르는 문단»으로 만든다 — 기사처럼 문단이 긴 글에 쓴다.
 *
 * ── 🔴 왜 (2026-09-29 · 5번) ─────────────────────────────────────────
 * 사장님 — 「**줄바꿈을 계속 잘 못하고 있다. 문장이 끝나지 않았는데 자꾸 줄바꿈을 하네**」
 * 나는 그것을 기사를 쓰는 쪽 탓으로 보고 회차 프롬프트부터 고쳤다. **재 보니 아니었다.**
 *   · 계정이 쓴 원문은 문단이 «한 줄»로 길었다 — 가장 긴 문단 507자, 짧은 줄이 없었다
 *   · 우리 발송 코드도 본문을 감싸지 않는다 (base64 76자 접기는 디코드하면 사라진다)
 * ⇒ 문장 가운데서 끊긴 것은 **긴 한 줄짜리 `text/plain` 을 메일이 폭에 맞춰 접은 것**이다.
 *   「서민준(충남 ⏎ 서천군청)」처럼 «괄호 안»까지 갈린 것이 그 증거다 —
 *   문장 부호를 보는 사람이라면 거기서 끊지 않는다. 글자 수로 센 기계만 그렇게 끊는다.
 *
 * ⭐ 그래서 고칠 곳은 글이 아니라 «그릇»이다. 문단을 <p> 로 싸서 보내면
 *   받는 쪽이 제 폭에 맞춰 «흐르게» 하고, 복사해도 문장 가운데 개행이 안 들어간다.
 * ⛔ 원인을 재기 전에 처방부터 내리지 않는다. 나는 이번에 그 순서를 어겼다.
 */
export function 문단으로(글) {
  const 벗김 = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const 문단들 = String(글 ?? '').replace(/\r/g, '').split(/\n{2,}/)
    .map((p) => p.trim()).filter(Boolean);
  /* 문단 «안»의 홑줄바꿈은 살린다 — 제목·부제·기자명 줄이 붙어 버리면 안 된다 */
  const 몸 = 문단들.map((p) => `<p>${벗김(p).split('\n').join('<br>')}</p>`).join('\n');
  return '<!doctype html><html><head><meta charset="utf-8"></head>'
    + '<body style="font-family:system-ui,-apple-system,\'Segoe UI\',sans-serif;'
    + 'font-size:15px;line-height:1.75;color:#111;max-width:46em">'
    + `${몸}</body></html>`;
}

export function 편지만들기({ 받는곳, 제목, 글, 첨부들 = [], 보내는곳 = 보내는주소, 이름 = 보내는이름, 흐르게 = false }) {
  const 글64 = (t) => Buffer.from(String(t ?? ''), 'utf8').toString('base64').replace(/(.{76})/g, '$1\n');
  /* 흐르게 = true 면 본문을 HTML 문단으로 보낸다. 그 밖에는 여태 하던 대로 text/plain */
  const 본문종류 = 흐르게 ? 'text/html; charset="UTF-8"' : 'text/plain; charset="UTF-8"';
  const 본문글 = 흐르게 ? 문단으로(글) : 글;

  if (!첨부들.length) {
    return [
      `From: ${이름} <${보내는곳}>`,
      `To: ${받는곳}`,
      `Subject: ${제목인코딩(제목)}`,
      'MIME-Version: 1.0',
      `Content-Type: ${본문종류}`,
      'Content-Transfer-Encoding: base64',
      '',
      글64(본문글),
    ].join('\r\n');
  }

  /* 경계 글자는 본문에 나올 수 없는 것이어야 한다 */
  const 경계 = '----klifedesign-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  const 줄들 = [
    `From: ${이름} <${보내는곳}>`,
    `To: ${받는곳}`,
    `Subject: ${제목인코딩(제목)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${경계}"`,
    '',
    `--${경계}`,
    `Content-Type: ${본문종류}`,
    'Content-Transfer-Encoding: base64',
    '',
    글64(본문글),
    '',
  ];
  for (const a of 첨부들) {
    줄들.push(
      `--${경계}`,
      `Content-Type: ${종류고르기(a.이름)}`,
      'Content-Transfer-Encoding: base64',
      `Content-Disposition: attachment; filename="${첨부이름인코딩(a.이름)}"`,
      '',
      Buffer.from(a.내용).toString('base64').replace(/(.{76})/g, '$1\n'),
      '',
    );
  }
  줄들.push(`--${경계}--`);
  return 줄들.join('\r\n');
}

/** Gmail send API 가 요구하는 base64url */
export const 감싸기 = (편지) => Buffer.from(편지, 'utf8').toString('base64url');

/**
 * 🔴🔴 [2026-11-11 · 사장님] 「**이메일 못받았는데**」 — 그 날 밤에 찾은 까닭이 여기다.
 * ═══════════════════════════════════════════════════════════════════════════
 * 20:19 에 보낸 메일이 ✅ 와 메시지 id 까지 받고도 사장님께 «안 갔다».
 * 첨부 원본 합은 22.3MB 였고, 문지기는 그 «원본 바이트»를 재서 24MB 아래라고 통과시켰다.
 *
 * ⛔ **그런데 메일에 실리는 것은 원본이 아니다.** 첨부는 base64 로 감싸져 실리고,
 *   base64 는 3바이트를 4글자로 늘린다 — **원본의 약 1.34배**가 된다.
 *   22.3MB → 약 29.8MB. 지메일 한 통 한도 25MB 를 넘었다.
 *   보내는 쪽 API 는 받아 주고 보낸편지함에도 남지만, **받는 쪽에서 죽는다.**
 *
 * ⇒ 「검사는 손님이 겪는 것을 재야 한다.」 원본 크기는 손님이 겪는 것이 아니다.
 *   **실리는 크기를 잰다.**
 *
 * @param {number} 원본바이트 첨부 원본 바이트 합
 * @param {number} 글자수     본문 글자수(넉넉히 2바이트로 친다)
 */
export function 실리는크기(원본바이트 = 0, 글자수 = 0) {
  const 첨부 = Math.ceil(원본바이트 / 3) * 4;      // base64
  const 줄바꿈 = Math.ceil(첨부 / 76) * 2;          // 76자마다 CRLF
  const 머리와경계 = 2048;                          // 머리글·경계줄 넉넉히
  return 첨부 + 줄바꿈 + 글자수 * 2 + 머리와경계;
}

/** 지메일 한 통 한도 — 받는 쪽 기준 25MB */
export const 한통한도 = 25 * 1024 * 1024;
/** 여기를 넘으면 서고 알린다. 한도에 바싹 붙이지 않는다 */
export const 안전선 = 23 * 1024 * 1024;

/** 보내도 되나 — {된다, 실리는바이트, 까닭} */
export function 크기관문(원본바이트 = 0, 글자수 = 0) {
  const 실린다 = 실리는크기(원본바이트, 글자수);
  if (실린다 > 안전선) {
    return {
      된다: false,
      실리는바이트: 실린다,
      까닭: '첨부 원본 ' + (원본바이트 / 1048576).toFixed(1) + 'MB 는 base64 로 실리면 '
        + (실린다 / 1048576).toFixed(1) + 'MB 가 된다 — 지메일 한 통 한도 25MB 를 넘는다. '
        + '보내는 쪽은 받아 주고 보낸편지함에도 남지만 받는 쪽에서 죽는다.',
    };
  }
  return { 된다: true, 실리는바이트: 실린다, 까닭: '' };
}

/**
 * 서비스 계정 열쇠를 읽는다 — «두 길»을 다 받는다. ⛔ 없으면 null — 예외로 던지지 않는다.
 * 부르는 쪽(메일보내기)이 그것을 「메일이 아직 안 켜졌다」로 조용히 읽는다.
 *
 * 🔴 [2026-09-16/17 · 5번 실측] 라이브(Cloudtype)에서는 파일 경로 방식이 «영영 안 된다» —
 *   Cloudtype 시크릿은 문자열이지 파일이 아니고, 이 키파일은 git 이 추적하지 않아
 *   배포해도 컨테이너 안에 안 생긴다. 그래서 로컬 개발(`GOOGLE_APPLICATION_CREDENTIALS`
 *   파일 경로)과 라이브(`GOOGLE_SERVICE_ACCOUNT_JSON` 문자열, JSON 원문 또는 base64)를
 *   같은 함수가 다 받게 한다 — «먼저 문자열, 없으면 파일».
 * ⛔ 값을 로그에 찍지 않는다.
 */
export function 키읽기() {
  const 문자열키 = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (문자열키 && 문자열키.trim()) {
    const 시도 = (s) => { try { return JSON.parse(s); } catch { return null; } };
    /* 원문 JSON 을 먼저 본다 — '{' 로 시작하면 그대로, 아니면 base64 로 감싼 것으로 본다 */
    const 곧장 = 시도(문자열키);
    if (곧장) return 곧장;
    try {
      const 풀린것 = Buffer.from(문자열키, 'base64').toString('utf8');
      const 파싱됨 = 시도(풀린것);
      if (파싱됨) return 파싱됨;
    } catch { /* base64 도 아니면 아래에서 파일 경로로 넘어간다 */ }
  }
  const 키파일 = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!키파일 || !existsSync(키파일)) return null;
  try { return JSON.parse(readFileSync(키파일, 'utf8')); } catch { return null; }
}

/**
 * 도메인 위임 JWT. `sub`(대신할 주소)를 인자로 받는다 — 고정해 두면 한 주소로만
 * 청할 수 있어 「무엇이 막혔는지」를 못 가린다(scripts/send-mail.mjs `--가린다` 참조).
 */
export function jwt만들기(키, 대신할주소 = 보내는주소) {
  const 지금 = Math.floor(Date.now() / 1000);
  const h = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const b = Buffer.from(JSON.stringify({
    iss: 키.client_email, sub: 대신할주소, scope: 갈래,
    aud: 'https://oauth2.googleapis.com/token', iat: 지금, exp: 지금 + 3600,
  })).toString('base64url');
  return `${h}.${b}.${createSign('RSA-SHA256').update(`${h}.${b}`).sign(키.private_key, 'base64url')}`;
}

/** 위임 토큰을 청한다. ⛔ 못 받으면 던진다 — 부르는 쪽(메일보내기)이 잡는다 */
export async function 위임토큰받기(키, 대신할주소 = 보내는주소, 부르기 = fetch) {
  const r = await 부르기('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt만들기(키, 대신할주소),
    }),
  });
  const j = await r.json().catch(() => ({}));
  if (!j.access_token) throw new Error(j.error_description || j.error || ('token http ' + r.status));
  return j.access_token;
}

/**
 * ⭐ 실제로 한 통 보낸다 — server.mjs 와 scripts/send-mail.mjs 가 같이 쓰는 자리.
 *
 * ⛔ **절대 던지지 않는다.** 결제 뒤 자리에서 부르므로, 여기서 무엇이 막혀도
 *   호출자는 `{ ok:false, 왜 }`만 받고 계속 진행할 수 있어야 한다.
 */
export async function 메일보내기({
  받는곳, 제목, 글, 첨부들 = [], 보내는곳 = 보내는주소, 이름 = 보내는이름,
  대신할주소 = 보내는곳, 부르기 = fetch, 흐르게 = false,
} = {}) {
  try {
    if (!받는곳 || !제목 || !글) return { ok: false, 왜: '받는곳·제목·글 가운데 빠진 것이 있다' };
    const 키 = 키읽기();
    if (!키) return { ok: false, 왜: '서비스 계정 열쇠가 없다(GOOGLE_SERVICE_ACCOUNT_JSON 또는 GOOGLE_APPLICATION_CREDENTIALS)' };
    const 토큰 = await 위임토큰받기(키, 대신할주소, 부르기);
    const raw = 감싸기(편지만들기({ 받는곳, 제목, 글, 첨부들, 보내는곳, 이름, 흐르게 }));
    const r = await 부르기('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${토큰}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw }),
    });
    const j = await r.json().catch(() => ({}));
    if (j.error) return { ok: false, 왜: j.error.message || 'gmail send 실패' };
    if (!j.id) return { ok: false, 왜: 'gmail 이 메시지 id 를 안 줬다' };
    return { ok: true, id: j.id };
  } catch (e) {
    return { ok: false, 왜: String(e && e.message ? e.message : e).slice(0, 200) };
  }
}

/* ── 자가시험 — 키읽기() 가 «두 길」을 다 받는지 ─────────────────────────── */

export function 자가시험() {
  const 것 = []; const 재다 = (이름, 됐나) => 것.push({ 이름, 됐나 });
  const 옛 = { j: process.env.GOOGLE_SERVICE_ACCOUNT_JSON, f: process.env.GOOGLE_APPLICATION_CREDENTIALS };
  const 지우기 = () => { delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON; delete process.env.GOOGLE_APPLICATION_CREDENTIALS; };
  const 되돌리기 = () => {
    지우기();
    if (옛.j !== undefined) process.env.GOOGLE_SERVICE_ACCOUNT_JSON = 옛.j;
    if (옛.f !== undefined) process.env.GOOGLE_APPLICATION_CREDENTIALS = 옛.f;
  };
  const 가짜키 = { client_email: 'x@y.iam.gserviceaccount.com', private_key: 'fake', client_id: '1' };

  try {
    지우기();
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON = JSON.stringify(가짜키);
    재다('🔴 문자열판 — JSON 원문을 그대로 받는다', 키읽기()?.client_email === 가짜키.client_email);

    지우기();
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON = Buffer.from(JSON.stringify(가짜키)).toString('base64');
    재다('🔴 base64판 — 감싼 것도 풀어서 받는다', 키읽기()?.client_email === 가짜키.client_email);

    지우기();
    재다('⛔ 둘 다 없으면 null — 「없다」를 지어내지 않는다', 키읽기() === null);

    지우기();
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON = '이건 JSON 도 base64 도 아니다 !!!';
    재다('⛔ 문자열이 있어도 못 읽으면(둘 다 파싱 실패) 파일 경로로 넘어간다(파일도 없으면 null)', 키읽기() === null);

    지우기();
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON = '   ';
    재다('⛔ 빈 칸뿐인 문자열은 «없는 것»으로 본다', 키읽기() === null);
  } finally {
    되돌리기();
  }

  const 실패 = 것.filter((x) => !x.됐나);
  console.log(`■ gmail-send 자가시험 ${것.length - 실패.length}/${것.length}`);
  for (const x of 실패) console.log(`  🔴 ${x.이름}`);
  return 실패.length === 0;
}

if (process.argv[1] && process.argv[1].endsWith('gmail-send.mjs') && process.argv.includes('--자가시험')) {
  process.exit(자가시험() ? 0 : 1);
}
