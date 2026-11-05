/**
 * 침입막기.mjs — **침입을 시도하는 쪽을 스스로 알아보고 문에서 끊는다.**
 *   (서울마켓츠 · 백년지도 · 케이컬처와이어 — 이 서버가 세 곳을 함께 낸다)
 *
 * ── 🔴 왜 만드나 (2026-11-05 · 사장님) ────────────────────────────────
 * 「**AI의 침입을 막을 수 있는 건 AI뿐이라고 난 생각한다. 보안에 문제가 생기지 않게
 *   예방조치, 누가 침입을 시도하면 바로 알아서 막을 수 있는 조치를 해라**」
 *
 * ⚠ **케이라이프맵의 `server/침입막기.js` 와 쌍둥이다.** 규칙을 한쪽만 고치면
 *   세 사이트와 케이라이프맵이 서로 다른 것을 막게 된다.
 *   ⇒ `scripts/check-침입막기-쌍둥이.mjs` 가 두 벌의 규칙이 같은지 재서,
 *     어긋나면 빨간불을 낸다. 한쪽을 고치면 다른 쪽도 고친다.
 *
 * ── ⛔ 절대 끊지 않는 것 ───────────────────────────────────────────────
 * 구글·빙·네이버·다음 — 손님이 여기서 온다. 막으면 사업이 끝난다.
 * 우리 자신(127.0.0.1·사내 주소) — 우리 점검이 우리를 끊으면 아무도 못 고친다.
 *
 * 🔴 끄는 법 — 환경변수 `침입막기=끈다`.
 * ⛔ 무엇에 걸렸는지 밖으로 알려 주지 않는다 — 알려 주면 그것만 피해서 다시 온다.
 */

/* ══ 규칙 — ⚠ 여기부터 「규칙 끝」까지가 케이라이프맵과 같아야 한다 ══ */
/* 규칙 시작 */
export const 창분 = 10;
export const 끊는점수 = 10;
export const 끊는시간분 = [10, 60, 1440];

export const 탐침 = [
  /\/\.env(\.|$|\/)/i, /\/\.git(\/|$)/i, /\/\.aws\//i, /\/\.ssh\//i,
  /\/wp-admin/i, /\/wp-login/i, /\/wp-content/i, /\/xmlrpc\.php/i,
  /\/phpmyadmin/i, /\/pma\//i, /\/adminer/i,
  /\/vendor\/phpunit/i, /\/cgi-bin\//i, /\/shell\b/i, /\/c99\.php/i,
  /\/config\.(json|php|yml|yaml)$/i, /\/credentials$/i, /\/\.htpasswd/i,
  /\/(backup|dump|db)\.(sql|zip|tar|gz)$/i, /\/id_rsa$/i,
  /\/actuator\/env/i,
  /\/server-status$/i, /\/solr\//i, /\/jenkins\//i, /\/\.vscode\//i,
  /\/telescope\/requests/i, /\/_ignition\/execute-solution/i,
];

export const 공격글자 = [
  { 이름: '길거슬러오르기', 자: /(\.\.(\/|\\|%2f|%5c)){2,}/i, 점: 10 },
  { 이름: 'SQL 넣기', 자: /(\bunion\b[\s/*]+\bselect\b|\bor\b\s+1\s*=\s*1\b|';\s*drop\s+table|\bsleep\s*\(\s*\d|\bbenchmark\s*\()/i, 점: 10 },
  { 이름: '글자판 넣기', 자: /(<script\b|javascript:|onerror\s*=|onload\s*=)/i, 점: 6 },
  { 이름: '서버쪽 틀 넣기', 자: /(\{\{.*?\}\}|\$\{.*?\}|<%.*?%>)/, 점: 6 },
  { 이름: '명령 넣기', 자: /(;\s*(cat|wget|curl|nc|bash|sh)\s|\|\s*(bash|sh)\b|\$\(.*\))/i, 점: 10 },
  { 이름: '널 글자', 자: /%00|\x00/, 점: 10 },
];

export const 세지않는이름 = [
  'googlebot', 'bingbot', 'yeti', 'daum', 'applebot', 'duckduckbot',
  'perplexitybot', 'oai-searchbot', 'chatgpt-user', 'gptbot', 'claudebot',
  'facebookexternalhit', 'twitterbot', 'slackbot', 'kakaotalk',
];

export const 스캐너이름 = [
  'sqlmap', 'nikto', 'nmap', 'masscan', 'zgrab', 'dirbuster', 'gobuster',
  'ffuf', 'feroxbuster', 'wpscan', 'acunetix', 'nessus', 'openvas', 'arachni',
  'w3af', 'xsstrike', 'commix', 'hydra', 'havij', 'netsparker', 'appscan',
  'nuclei', 'wfuzz', 'dirsearch', 'whatweb', 'joomscan',
];

export const 훑기창분 = 360;
export const 훑기한도 = 20;
export const 열쇠두드림창분 = 10;
export const 열쇠두드림한도 = 12;
/* 규칙 끝 */

/** ⛔ 우리 자신은 안 끊는다 */
export function 우리인가(ip) {
  const s = String(ip || '');
  return s === '127.0.0.1' || s === '::1' || s === '::ffff:127.0.0.1' || s === 'unknown'
    || /^10\./.test(s) || /^192\.168\./.test(s) || /^172\.(1[6-9]|2\d|3[01])\./.test(s);
}

/** 이 요청에 어떤 신호가 있나 */
export function 재본다({ 주소 = '', 물음 = '', 이름 = '' } = {}) {
  const 까닭 = [];
  let 점 = 0;
  const 전체 = String(주소) + '?' + String(물음);
  if (세지않는이름.some((w) => String(이름).toLowerCase().includes(w))) return { 점: 0, 까닭: [] };
  const 이름소문자 = String(이름).toLowerCase();
  for (const w of 스캐너이름) if (이름소문자.includes(w)) { 점 += 10; 까닭.push('스캐너 — ' + w); break; }
  for (const 자 of 탐침) if (자.test(주소)) { 점 += 10; 까닭.push('탐침 주소'); break; }
  for (const x of 공격글자) if (x.자.test(전체)) { 점 += x.점; 까닭.push(x.이름); }
  return { 점, 까닭 };
}

const 쌓임 = new Map();
const 끊김 = new Map();
const 기록 = [];

export function 켜졌나(환경 = process.env) {
  return String(환경['침입막기'] || '').trim() !== '끈다';
}

export function 가린다(ip) {
  const s = String(ip || '');
  const m = s.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  return m ? `${m[1]}.${m[2]}.x.x` : s.slice(0, 8) + '…';
}

export function 끊겼나(ip, 지금 = Date.now()) {
  const 것 = 끊김.get(ip);
  if (!것) return false;
  if (것.까지 <= 지금) { 끊김.delete(ip); return false; }
  return true;
}

export function 쌓는다(ip, 점, 까닭, 지금 = Date.now()) {
  if (!점 || 우리인가(ip)) return null;
  const 것 = 쌓임.get(ip) || { 점: 0, 마지막: 지금, 걸린횟수: 0, 까닭: [] };
  if (지금 - 것.마지막 > 창분 * 60 * 1000) { 것.점 = 0; 것.까닭 = []; }
  것.점 += 점;
  것.마지막 = 지금;
  for (const c of 까닭) if (!것.까닭.includes(c)) 것.까닭.push(c);
  쌓임.set(ip, 것);
  if (쌓임.size > 5000) 쌓임.delete(쌓임.keys().next().value);
  if (것.점 < 끊는점수) return null;

  const 앞선 = 끊김.get(ip);
  const 횟수 = (앞선 ? 앞선.횟수 : 것.걸린횟수) + 1;
  const 분 = 끊는시간분[Math.min(횟수 - 1, 끊는시간분.length - 1)];
  const 난것 = { 까지: 지금 + 분 * 60 * 1000, 횟수, 까닭: 것.까닭.slice(0, 5) };
  끊김.set(ip, 난것);
  것.점 = 0; 것.까닭 = []; 것.걸린횟수 = 횟수;
  기록.push({ 때: new Date(지금).toISOString(), ip, 분, 횟수, 까닭: 난것.까닭 });
  if (기록.length > 300) 기록.shift();
  console.log(`[침입막기] 끊었다 ${가린다(ip)} · ${분}분 · ${횟수}번째 · ${난것.까닭.join(', ')}`);
  return 난것;
}

/* ── 훑기 재는 자 ──────────────────────────────────────────────────
 * 🔴 [2026-11-05] 위 규칙들은 «내가 아는 수법»만 잡는다. 목록에 없는 주소를
 *   하나씩 두드려 보는 쪽은 404 를 받으며 마음껏 훑고 다녔다.
 * [자국] 훑는 쪽은 **서로 다른 주소**에서 404 를 잔뜩 받는다. 손님도 404 를
 *   받지만 «같은 주소»를 다시 받는다(그림 하나가 빠진 지면).
 *   ⇒ 수가 아니라 «서로 다른 주소의 수»를 센다. 이것이 둘을 가른다. */
const 헛디딤 = new Map();

/** 응답이 끝난 뒤에 부른다. 끊어야 하면 그 내용을 돌려준다 */
export function 헛디딤본다(ip, 상태, 주소, 이름 = '', 지금 = Date.now()) {
  if (우리인가(ip)) return null;
  if (세지않는이름.some((w) => String(이름).toLowerCase().includes(w))) return null;
  const n = Number(상태);
  if (n !== 404 && n !== 401 && n !== 403) return null;

  const 것 = 헛디딤.get(ip) || { 주소들: new Set(), 시작: 지금, 열쇠실패: 0, 열쇠시작: 지금 };
  if (n === 404) {
    if (지금 - 것.시작 > 훑기창분 * 60 * 1000) { 것.주소들 = new Set(); 것.시작 = 지금; }
    것.주소들.add(String(주소).slice(0, 200));
  } else {
    if (지금 - 것.열쇠시작 > 열쇠두드림창분 * 60 * 1000) { 것.열쇠실패 = 0; 것.열쇠시작 = 지금; }
    것.열쇠실패 += 1;
  }
  헛디딤.set(ip, 것);
  if (헛디딤.size > 5000) 헛디딤.delete(헛디딤.keys().next().value);

  if (것.주소들.size >= 훑기한도) {
    것.주소들 = new Set(); 것.시작 = 지금;
    return 쌓는다(ip, 10, ['훑기 — 못 찾은 주소 ' + 훑기한도 + '곳'], 지금);
  }
  if (것.열쇠실패 >= 열쇠두드림한도) {
    것.열쇠실패 = 0; 것.열쇠시작 = 지금;
    return 쌓는다(ip, 10, ['열쇠 두드리기 ' + 열쇠두드림한도 + '번'], 지금);
  }
  return null;
}

/** 응답이 끝난 뒤에 부르는 입구 — 서버가 res.on('finish') 에서 부른다 */
export function 끝났다(req, res) {
  try {
    const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()
      || req.socket?.remoteAddress || 'unknown';
    헛디딤본다(ip, res.statusCode, String(req.url || '').split('?')[0], req.headers['user-agent'] || '');
  } catch { /* 세다가 터져도 사이트는 돈다 */ }
}

export function 셈() {
  const 지금 = Date.now();
  let 산것 = 0;
  for (const [, v] of 끊김) if (v.까지 > 지금) 산것 += 1;
  return {
    켜졌나: 켜졌나(), 끊어둔수: 산것, 쌓인수: 쌓임.size,
    최근: 기록.slice(-20).map((x) => ({ 때: x.때, ip: 가린다(x.ip), 분: x.분, 횟수: x.횟수, 까닭: x.까닭 })),
  };
}

/**
 * 이 요청을 끊어야 하나 — 끊어야 하면 true. 부른 쪽이 403 을 낸다.
 * ⛔ 막이가 터져서 세 사이트가 서면 안 된다 — 무슨 일이 있어도 false 로 떨어진다.
 */
export function 끊나(req) {
  try {
    const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()
      || req.socket?.remoteAddress || 'unknown';
    if (우리인가(ip)) return false;
    if (끊겼나(ip)) return 켜졌나();
    const 주소 = String(req.url || '').split('?')[0];
    const 물음 = String(req.url || '').includes('?') ? String(req.url).slice(String(req.url).indexOf('?') + 1) : '';
    const { 점, 까닭 } = 재본다({ 주소, 물음, 이름: req.headers['user-agent'] || '' });
    if (!점) return false;
    const 난것 = 쌓는다(ip, 점, 까닭);
    return !!난것 && 켜졌나();
  } catch { return false; }
}

/* ── 자가시험 ──────────────────────────────────────────────────────── */
export function 자가시험() {
  const 것 = [];
  const 본다 = (이름, 참) => 것.push({ 이름, 참: !!참 });

  본다('.env 를 열면 한 번에 끊을 점수다', 재본다({ 주소: '/.env' }).점 >= 끊는점수);
  본다('wp-admin 도 그렇다', 재본다({ 주소: '/wp-admin/setup-config.php' }).점 >= 끊는점수);
  본다('SQL 넣기를 잡는다', 재본다({ 주소: '/api/x', 물음: "id=1' or 1=1--" }).점 >= 끊는점수);
  본다('길거슬러오르기를 잡는다', 재본다({ 주소: '/x/../../../../etc/passwd' }).점 >= 끊는점수);
  본다('🔴 ⛔ 보통 지면은 점이 0 이다', 재본다({ 주소: '/ko/review/kbl-sk-gas-2026-11-04' }).점 === 0);
  본다('🔴 ⛔ 댓글 목록도 0 이다', 재본다({ 주소: '/api/comments', 물음: 'slug=abc-def' }).점 === 0);
  본다('🔴 ⛔ 구글은 무엇을 해도 0 이다', 재본다({ 주소: '/.env', 이름: 'Googlebot/2.1' }).점 === 0);
  본다('🔴 ⛔ 보안 알림 자리는 탐침이 아니다', 재본다({ 주소: '/.well-known/security.txt' }).점 === 0);

  쌓임.clear(); 끊김.clear();
  const 때 = Date.now();
  본다('🔴 점 하나로는 안 끊는다', 쌓는다('203.0.113.9', 6, ['글자판 넣기'], 때) === null);
  본다('넘치면 끊는다', !!쌓는다('203.0.113.9', 6, ['글자판 넣기'], 때 + 1000));
  본다('첫 번째는 10분이다', 끊김.get('203.0.113.9').까지 - (때 + 1000) === 10 * 60 * 1000);
  본다('🔴 ⛔ 우리 자신은 안 끊는다', 쌓는다('127.0.0.1', 100, ['탐침 주소'], 때) === null);
  본다('⛔ 주소를 통째로 안 적는다', 가린다('203.0.113.9') === '203.0.x.x');
  본다('⛔ 빈 것에 안 터진다', 재본다({}).점 === 0 && 끊나({ headers: {} }) === false);
  본다('스캐너 이름을 잡는다 — sqlmap', 재본다({ 주소: '/', 이름: 'sqlmap/1.7.2#stable' }).점 >= 끊는점수);
  본다('🔴 ⛔ 보통 브라우저 이름은 0 이다',
    재본다({ 주소: '/ko/review/x', 이름: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/153.0.0.0 Safari/537.36' }).점 === 0);
  본다('🔴 서로 다른 주소로 404 를 스무 곳 받으면 끊는다', (() => {
    쌓임.clear(); 끊김.clear(); 헛디딤.clear();
    const t = Date.now();
    let 난것 = null;
    for (let i = 0; i < 훑기한도; i++) 난것 = 헛디딤본다('203.0.113.40', 404, '/없는곳' + i, '', t + i) || 난것;
    return !!난것;
  })());
  본다('🔴 ⛔ «같은» 주소를 백 번 받아도 안 끊는다 — 그림 빠진 지면을 보는 손님이다', (() => {
    쌓임.clear(); 끊김.clear(); 헛디딤.clear();
    const t = Date.now();
    for (let i = 0; i < 100; i++) 헛디딤본다('203.0.113.41', 404, '/img/없는그림.png', '', t + i);
    return !끊겼나('203.0.113.41', t + 200);
  })());
  본다('🔴 ⛔ 구글이 404 를 많이 받아도 안 끊는다', (() => {
    쌓임.clear(); 끊김.clear(); 헛디딤.clear();
    const t = Date.now();
    for (let i = 0; i < 50; i++) 헛디딤본다('66.249.66.1', 404, '/옛글' + i, 'Googlebot/2.1', t + i);
    return !끊겼나('66.249.66.1', t + 100);
  })());
  본다('🔴 열쇠를 거듭 두드리면 끊는다', (() => {
    쌓임.clear(); 끊김.clear(); 헛디딤.clear();
    const t = Date.now();
    let 난것 = null;
    for (let i = 0; i < 열쇠두드림한도; i++) 난것 = 헛디딤본다('203.0.113.42', 401, '/api/x', '', t + i) || 난것;
    return !!난것;
  })());
  본다('🔴 ⛔ 200 으로 잘 받는 것은 세지 않는다', (() => {
    쌓임.clear(); 끊김.clear(); 헛디딤.clear();
    const t = Date.now();
    for (let i = 0; i < 100; i++) 헛디딤본다('203.0.113.43', 200, '/지면' + i, '', t + i);
    return !끊겼나('203.0.113.43', t + 200);
  })());

  쌓임.clear(); 끊김.clear(); 기록.length = 0; 헛디딤.clear();
  const 빨강 = 것.filter((x) => !x.참);
  console.log(`■ 침입막기(세 사이트) 자가시험 ${것.length - 빨강.length}/${것.length}`);
  for (const x of 것) console.log(`  ${x.참 ? '✅' : '🔴'} ${x.이름}`);
  return 빨강.length === 0;
}

if (process.argv[1] && process.argv[1].endsWith('침입막기.mjs')) process.exit(자가시험() ? 0 : 1);
