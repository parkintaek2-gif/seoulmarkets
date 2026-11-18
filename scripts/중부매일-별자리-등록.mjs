#!/usr/bin/env node
/**
 * 중부매일-별자리-등록.mjs — 그날 별자리 운세를 **중부매일 CMS 에 넣고 승인까지** 한다.
 *
 * ── 🔴🔴 왜 (2026-11-18 · 사장님) ────────────────────────────────────
 * 사장님 — 「2번대로 하자… cms 열면 자동로그인해서 하면 됨.
 *          매일 0시 1분에 기사를 승인까지 직접 해.」
 *          「안 될 경우, 못한 경우엔 이메일 보내놔」
 *
 * 붙여넣기 길은 **잴 수가 없다** — 편집기가 사람이 누른 붙여넣기만 받는다.
 * 흉내 낸 사건은 통째로 버려진다(2026-11-18 에 두 번 재 봤고 둘 다 빈 글이 됐다).
 * ⇒ 그래서 사람 손을 기다리지 않고 **내가 넣는다.** 넣는 길은 재 봤고 아무것도 안 지워진다.
 *
 * 하는 일
 * ```
 *   ① 그날 원고를 짓는다      klifemap/astro/cms원고.js 가 짓는다 — 글은 한 곳에서만 짓는다
 *   ② 칸을 채운다            제목·부제·본문·사진설명·분류(기획·특집 > 연재)
 *   ③ 승인을 켜고 저장한다     recognition = E
 *   ④ 되읽어 판정한다         그림 12장·첫 줄·도움말·제목을 «화면에서» 본다
 *   ⑤ 어긋나면 메일을 보낸다   사장님 지시 — 못한 경우에 알린다
 * ```
 * ⛔ 「저장을 눌렀다」를 「올라갔다」로 읽지 않는다. ④ 를 통과해야 올라간 것이다.
 * ⛔ 조용히 실패하지 않는다. 어느 걸음에서 섰든 메일이 나간다.
 * ⚠ 크롬은 전용 자리(klm-cms-chrome)로 띄운다 — 사장님 창을 건드리지 않는다.
 *   그 자리에 CMS 로그인이 남아 있어 열면 그대로 들어간다(사장님이 북마크로 넣어 두셨다).
 *
 * 쓰는 법
 *   node scripts/중부매일-별자리-등록.mjs                 오늘치 · 승인까지
 *   node scripts/중부매일-별자리-등록.mjs --날 2026-11-20
 *   node scripts/중부매일-별자리-등록.mjs --미승인          승인은 안 켠다
 *   node scripts/중부매일-별자리-등록.mjs --자체검사
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { 탭들, 탭붙기, 자리잡기, 재기, 기본뿌리 } from './lib/cdp.mjs';
import { pathToFileURL } from 'node:url';

/**
 * 🔴🔴 이 파일이 **직접 불렸나**. 들여오기만 했으면 거짓이다.
 *
 * ⛔ 2026-11-18 에 같은 자리에 세 번 빠졌다 — 남의 함수 하나를 쓰려고 들여왔을 뿐인데
 *   파일 몸통이 돌아 IndexNow 8,108장이 나가고 배포 단추가 눌렸다.
 *   이 파일은 **기사를 신문에 올린다.** 들여오기 한 번이 기사 발행이 된다.
 *
 * ⚠ 재는 자리는 「들여와지나」가 아니라 **「밖에 닿나」**다. 밖에 닿는 파일은 다 이것을 단다.
 */
export function 직접실행인가(argv1 = process.argv[1], 나 = import.meta.url) {
  try {
    const a = pathToFileURL(fs.realpathSync(argv1)).href;
    const b = pathToFileURL(fs.realpathSync(fileURLToPath(나))).href;
    return process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b;
  } catch { return false; }
}

export const 크롬프로필경로 = 'C:\\Users\\User\\AppData\\Local\\klm-cms-chrome';
export const 등록주소 = 'https://cms.jbnews.com/news/adminArticleWriteForm.html?mode=input';
export const 큰섹션 = 'S1N29';    /* 기획·특집 */
export const 작은섹션 = 'S2N157';  /* 연재 */
export const 통보주소 = 'parkintaek2@gmail.com';

const 여기 = path.dirname(fileURLToPath(import.meta.url));
const 뿌리 = path.resolve(여기, '..');
const KL = 'C:/Users/User/Documents/GitHub/klifemap';
const K = createRequire(KL + '/package.json');

/** KST 오늘. ⛔ toISOString() 금지 — UTC 라 새벽에 하루가 어긋난다 */
export function 오늘일자(d = new Date()) {
  return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() };
}

export function 일자해석(글) {
  const m = String(글 ?? '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) } : null;
}

export function 시각문자열(d = new Date()) {
  const 두 = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + 두(d.getMonth() + 1) + '-' + 두(d.getDate())
    + ' ' + 두(d.getHours()) + ':' + 두(d.getMinutes());
}

/**
 * 🔴 그날 것을 이미 올렸나 — 자국에서 본다.
 *   ⛔ 안 보면 0시 1분마다 같은 날 기사가 한 편씩 더 생긴다.
 *   ⚠ 「됐다」로 적힌 줄만 센다. 못한 줄은 다시 해야 하는 것이다.
 */
export function 등록여부확인(자국글, 일자문자열) {
  const 줄들 = String(자국글 ?? '').split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('#'));
  for (const l of 줄들) {
    const 칸 = l.split('\t');
    if (칸[0] === 일자문자열 && 칸[3] === '됐다' && /articleView/.test(칸[5] || '')) return 칸[5];
  }
  return null;
}

export async function 포트작동확인(뿌리주소 = 기본뿌리) {
  try {
    const r = await fetch(뿌리주소 + '/json/version', { signal: AbortSignal.timeout(4000) });
    return r.ok;
  } catch { return false; }
}

/** 전용 크롬을 띄운다. ⛔ 사장님 창은 안 건드린다 */
export async function 크롬실행() {
  if (await 포트작동확인()) return '이미 떠 있다';
  const 크롬 = ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'].find((p) => fs.existsSync(p));
  if (!크롬) return '🔴 크롬을 못 찾았다';
  spawn(크롬, ['--remote-debugging-port=9222', '--user-data-dir=' + 크롬프로필경로,
    '--no-first-run', '--no-default-browser-check', 등록주소],
  { detached: true, stdio: 'ignore' }).unref();
  for (let i = 0; i < 20; i++) {
    await new Promise((s) => setTimeout(s, 1500));
    if (await 포트작동확인()) return '띄웠다';
  }
  return '🔴 포트가 안 열렸다';
}

/**
 * 🔴 사장님 2026-11-18 — 「안 될 경우, 못한 경우엔 이메일 보내놔」
 * ⛔ 메일을 못 보내도 이 자가 터지지 않는다. 터지면 사유이 통째로 사라진다.
 */
export function 등록실패통보(일자문자열, 사유, 참고사항) {
  const 글길 = path.join(뿌리, 'docs', '편지-중부매일별자리-못올렸다.txt');
  const 글 = [
    '사장님, 5번입니다.',
    '',
    일자문자열 + ' 별자리 운세를 중부매일 CMS 에 올리지 못했습니다.',
    '',
    '■ 어디서 섰나',
    사유,
    '',
    '■ 더 볼 것',
    String(참고사항 ?? '(없음)'),
    '',
    '■ 손으로 올리시려면',
    '  node scripts/중부매일-별자리-등록.mjs --날 ' + 일자문자열,
    '  크롬이 로그아웃돼 있으면 CMS 북마크를 한 번 눌러 로그인해 두시면 됩니다.',
    '',
    '5번 드림',
  ].join('\n');
  try { fs.writeFileSync(글길, 글, 'utf8'); } catch { /* 적지 못해도 메일은 띄운다 */ }
  try {
    execFileSync('node', [path.join(뿌리, 'scripts', 'send-mail.mjs'),
      '--받는곳=' + 통보주소,
      '--제목=[5번] ' + 일자문자열 + ' 별자리 운세를 올리지 못했습니다',
      '--글=' + 글길, '--보낸다'], { cwd: 뿌리, stdio: 'inherit', timeout: 120000 });
    return '메일을 보냈다';
  } catch (e) {
    return '🔴 메일도 못 보냈다 — ' + String(e.message).slice(0, 90);
  }
}

/* ── 자체검사 ─────────────────────────────────────────────── */
if (직접실행인가() && process.argv.includes('--자체검사')) {
  let 통 = 0; const 실 = [];
  const 검 = (이름, 참) => { if (참) 통 += 1; else 실.push(이름); };

  검('날 읽기', JSON.stringify(일자해석('2026-11-20')) === JSON.stringify({ y: 2026, m: 11, d: 20 }));
  검('⛔ 꼴이 아니면 null', 일자해석('2026/11/20') === null && 일자해석(null) === null);
  /* ⛔ toISOString() 을 쓰면 새벽 0시 1분에 «어제» 운세가 나간다 */
  검('🔴 0시 1분에도 그날이다 (KST)', (() => {
    const d = new Date(2026, 10, 20, 0, 1, 0);
    const t = 오늘일자(d);
    return t.y === 2026 && t.m === 11 && t.d === 20;
  })());
  검('시각문자열이 KST 꼴이다', 시각문자열(new Date(2026, 10, 20, 0, 1)) === '2026-11-20 00:01');
  검('분류가 기획·특집 > 연재다', 큰섹션 === 'S1N29' && 작은섹션 === 'S2N157');
  검('등록 주소가 새 기사 자리다', 등록주소.includes('mode=input'));
  검('알릴 곳이 지메일이다 — ⛔ 네이버로 보내지 않는다',
    통보주소 === 'parkintaek2@gmail.com' && !통보주소.includes('naver'));

  const C = K(KL + '/astro/cms원고.js');
  const { 오늘의별자리자료 } = K(KL + '/astro/오늘의별자리자료.js');
  const o = C.원고만들기(오늘의별자리자료('ko', { y: 2026, m: 11, d: 19 }));
  검('🔴 원고를 klifemap 모듈이 짓는다 — 여기서 짓지 않는다', !!o && o.글.length > 3000);
  검('🔴 그림이 열둘이다', (o.글.match(/<img /g) || []).length === 12);
  검('⛔ data: 그림이 없다 — CMS 가 지운다', !o.글.includes('data:image'));
  검('🔴 본문 글자크기가 16px 다 (사장님 2026-11-18)', o.글.includes('font-size:16px'));
  검('🔴 제목이 샘플 꼴이다', o.제목 === '[오늘의 운세] 11월 19일 별자리 운세');
  검('🔴 사진 설명이 붙는다', o.사진말 === '오늘의 운세 2026년 11월 19일 별자리 운세. / KLifeMap.AI');
  검('🔴 등록실패통보 가 있다 — 조용히 실패하지 않는다', typeof 등록실패통보 === 'function');

  /* 🔴 같은 날 두 편을 만들지 않는다 — 0시 1분마다 한 편씩 쌓이면 지면이 더러워진다 */
  {
    const 자국 = ['# 날\t올린때\t승인\t됐나\t그림수\t주소',
      '2026-11-20\t2026-11-19 00:01\t승인\t됐다\t12\thttps://cms.jbnews.com/news/articleView.html?idxno=1516319',
      '2026-11-21\t2026-11-21 00:01\t승인\t못했다\t-\t-'].join('\n');
    검('🔴 이미 올린 날은 주소를 돌려준다',
      등록여부확인(자국, '2026-11-20') === 'https://cms.jbnews.com/news/articleView.html?idxno=1516319');
    검('⛔ 못한 날은 다시 해야 한다 — null 이다', 등록여부확인(자국, '2026-11-21') === null);
    검('⛔ 없는 날도 null', 등록여부확인(자국, '2026-12-01') === null);
    검('⬜ 빈 자국에 안 터진다', 등록여부확인('', '2026-11-20') === null && 등록여부확인(null, 'x') === null);
  }

  if (실.length) { console.error('🔴 실패 ' + 실.length + '개\n - ' + 실.join('\n - ')); process.exit(1); }
  console.log(`✅ 중부매일 별자리 올리기 — 자체검사 ${통}개 통과`);
  process.exit(0);
}

/* ── 돈다 ─────────────────────────────────────────────── */
/* ⛔ 들여오기만 했으면 한 줄도 돌지 않는다 — 기사가 저절로 나가는 것을 막는다 */
if (!직접실행인가()) {
  /* 들여오기다. 아무것도 하지 않는다 */
} else {
const 자리 = process.argv.indexOf('--날');
const 날 = 자리 >= 0 ? 일자해석(process.argv[자리 + 1]) : 오늘일자();
if (!날) { console.error('⛔ --날 뒤에 2026-11-20 꼴로 준다'); process.exit(1); }
const 승인할까 = !process.argv.includes('--미승인');
const 일자문자열 = 날.y + '-' + String(날.m).padStart(2, '0') + '-' + String(날.d).padStart(2, '0');

const C = K(KL + '/astro/cms원고.js');
const { 오늘의별자리자료 } = K(KL + '/astro/오늘의별자리자료.js');
const o = C.원고만들기(오늘의별자리자료('ko', 날));
if (!o) {
  console.error('🔴 그날 자료를 못 만들었다');
  console.log(등록실패통보(일자문자열, '운세 자료를 만들지 못했습니다 (오늘의별자리자료).', 'klifemap 계산 모듈'));
  process.exit(1);
}
console.log('■ 원고 — ' + o.제목 + ' (' + o.글.length + '자 · 그림 12장)');


/**
 * 🔴🔴 **금지어가 있으면 올리지 않는다.**
 *
 * 2026-11-18 에 「뒷심」·「끌어안」·「길목」이 본문에 들어간 채로 만들어졌다.
 * 메일 검사가 잡아서 멈췄을 뿐, 등록기에는 검사가 없어 그대로 신문에 나갈 뻔했다.
 * ⇒ 올리기 전에 본문을 검사한다. 걸리면 등록하지 않고 메일로 알린다.
 * ⛔ 「메일에서 잡히겠지」로 두지 않는다. 신문으로 가는 길에는 메일이 없다.
 */
const 검사파일 = path.join(뿌리, 'docs', '.검사-중부매일-별자리.txt');
fs.writeFileSync(검사파일, String(o.제목) + '\n' + String(o.부제) + '\n'
  + String(o.글).replace(/<[^>]+>/g, ' '), 'utf8');
try {
  execFileSync('node', [path.join(뿌리, 'scripts', '밖으로나가는말-관문.mjs'), 검사파일],
    { cwd: 뿌리, stdio: 'pipe', timeout: 120000 });
  console.log('■ 금지어 검사 — 통과');
} catch (검사오류) {
  const 알림 = String(검사오류.stdout ?? '') + String(검사오류.stderr ?? '');
  console.error('🔴 본문에 금지어가 있다 — 올리지 않는다');
  console.error(알림.slice(0, 900));
  console.log(등록실패통보(일자문자열, '본문에 금지어가 있어 등록하지 않았습니다.',
    알림.slice(0, 500)));
  process.exit(1);
}
/* 🔴 같은 날 두 편을 만들지 않는다 — 이미 올렸으면 그것을 «고쳐» 승인만 켠다 */
const 자국길 = path.join(뿌리, 'docs', '중부매일-별자리-올린기록.tsv');
const 이미 = fs.existsSync(자국길) ? 등록여부확인(fs.readFileSync(자국길, 'utf8'), 일자문자열) : null;
if (이미) console.log('■ 그날 것이 이미 있다 — 새로 쓰지 않고 그것을 연다: ' + 이미);

console.log('■ 크롬 — ' + (await 크롬실행()));

/**
 * 🔴🔴 올리기 전에 **접속부터 세운다.** 0시 1분에 끊겨 있으면 그대로 못 올린다.
 * 유지하는 자가 끊김을 잡아내고 스스로 다시 들어간다 — 그 자를 먼저 부른다.
 * ⛔ 들여오지 않고 «따로 돌린다». 그 자가 이 파일을 들여오므로 서로 물리면 안 된다.
 * ⚠ 실패해도 그냥 간다 — 접속이 이미 성하면 아무 일도 안 일어난다.
 */
try {
  execFileSync('node', [path.join(뿌리, 'scripts', '중부매일-접속유지.mjs')],
    { cwd: 뿌리, stdio: 'inherit', timeout: 240000 });
} catch { console.log('⚠ 접속 세우기가 종료코드 1 로 끝났다 — 그래도 가 본다'); }

if (!(await 포트작동확인())) {
  console.error('🔴 크롬 포트가 없다');
  console.log(등록실패통보(일자문자열, '크롬 디버깅 포트(9222)가 안 열렸습니다.', '전용 자리 ' + 크롬프로필경로));
  process.exit(1);
}

const 탭검색 = async (무늬) => (await 탭들()).find((x) => x.type === 'page' && 무늬.test(x.url || ''));

/* 이미 있으면 그 기사를, 없으면 새 기사 자리를 연다 */
const 대상주소 = 이미 || 등록주소;
let 생성한탭 = null;
let 탭 = 이미 ? null : await 탭검색(/adminArticleWriteForm\?mode=input/);
if (!탭) {
  const r = await fetch(기본뿌리 + '/json/new?' + encodeURIComponent(대상주소), { method: 'PUT' });
  try { 생성한탭 = (await r.json()).id; } catch { 생성한탭 = null; }
  await new Promise((s) => setTimeout(s, 6000));
  탭 = await 탭검색(이미 ? /articleView/ : /adminArticleWriteForm/);
}
if (!탭) {
  console.error('🔴 기사등록 화면을 못 열었다');
  console.log(등록실패통보(일자문자열, '기사등록 화면을 열지 못했습니다.', 등록주소));
  process.exit(1);
}

const 붙음 = await 탭붙기(탭.webSocketDebuggerUrl);
let 종료코드 = 1;
try {
  /* 🔴🔴 알림 창이 떠 있으면 화면을 한 글자도 못 읽는다(2026-11-18 실측).
     뜨는 즉시 닫는다. 안 닫으면 이 자가 자정에 그 자리에서 선다 */
  await 붙음.보내기('Page.enable');
  붙음.듣기('Page.javascriptDialogOpening', () => {
    붙음.보내기('Page.handleJavaScriptDialog', { accept: true })
      .catch(() => { /* 이미 닫혔다 */ });
  });
  await 자리잡기(붙음);
  const 어디 = String(await 재기(붙음, 'location.href', 20000));
  if (/adminLoginForm/.test(어디)) {
    console.error('🔴 로그인 화면이다');
    console.log(등록실패통보(일자문자열, 'CMS 자동로그인이 풀렸습니다. 로그인 화면이 떴습니다.', 어디));
    process.exit(1);
  }

  /* 이미 있는 기사면 «수정» 을 눌러 고치는 화면으로 간다 */
  if (이미) {
    const 눌렀 = String(await 재기(붙음, [
      '(() => { const a = document.querySelectorAll("a,button");',
      '  for (let i = 0; i < a.length; i++) if ((a[i].innerText || "").trim() === "수정") { a[i].click(); return "눌렀다"; }',
      '  return "수정 단추를 못 찾았다"; })()',
    ].join('\n'), 20000));
    console.log('■ 수정으로 — ' + 눌렀);
    await new Promise((s) => setTimeout(s, 6000));
    await 자리잡기(붙음);
  }

  const 채우기 = [
    '(() => {',
    '  const d = document;',
    '  const T = ' + JSON.stringify(o.제목) + ';',
    '  const S = ' + JSON.stringify(o.부제) + ';',
    '  const B = ' + JSON.stringify(o.글) + ';',
    '  const P = ' + JSON.stringify(o.사진말) + ';',
    '  const 승인 = ' + (승인할까 ? 'true' : 'false') + ';',
    '  const t = d.querySelector("input[name=title]"); if (t) t.value = T;',
    '  const s = d.querySelector("textarea[name=subTitle]"); if (s) s.value = S;',
    '  if (!window.CKEDITOR || !window.CKEDITOR.instances.FCKeditor1) return "편집기를 못 찾았다";',
    '  window.CKEDITOR.instances.FCKeditor1.setData(B);',
    '  const cap = d.querySelector("#caption_ie_mod"); if (cap) cap.value = P;',
    '  const sec = d.querySelector("#sectionCode");',
    '  if (sec) { sec.value = ' + JSON.stringify(큰섹션) + '; sec.dispatchEvent(new Event("change", { bubbles: true })); }',
    /* 🔴🔴 [2026-11-18] 사장님 「디폴트가 승인이야」 · 「미승인 클릭해」
     ⛔ r.checked = true 만으로는 저장되지 않는다. 다시 읽으면 승인으로 돌아가 있었다.
     라디오를 누르고, change 를 알리고, 라벨까지 눌러야 CMS 가 받아들인다. */
  '  const 칸이름 = 승인 ? "recog-e" : "recog-c";',
  '  const r = d.querySelector("#" + 칸이름);',
  '  if (r) { r.click(); r.checked = true; r.dispatchEvent(new Event("change", { bubbles: true }));',
  '    const lb = d.querySelector("label[for=" + 칸이름 + "]"); if (lb) lb.click(); }',
    '  return "채웠다";',
    '})()',
  ].join('\n');
  const 채운결과 = String(await 재기(붙음, 채우기, 60000));
  console.log('■ 칸 채우기 — ' + 채운결과);
  if (채운결과 !== '채웠다') {
    console.log(등록실패통보(일자문자열, '편집기를 찾지 못했습니다 — ' + 채운결과, 어디));
    process.exit(1);
  }

  /* 2차 섹션은 1차가 바뀐 뒤에 채워진다 — 조금 기다렸다 고른다 */
  await new Promise((s) => setTimeout(s, 3000));
  const 작은고르기 = [
    '(() => {',
    '  const e = document.querySelector("#subSectionCode");',
    '  if (!e) return "2차 칸이 없다";',
    '  e.value = ' + JSON.stringify(작은섹션) + ';',
    '  e.dispatchEvent(new Event("change", { bubbles: true }));',
    '  return "2차 = " + e.value;',
    '})()',
  ].join('\n');
  console.log('■ 분류 — ' + String(await 재기(붙음, 작은고르기, 20000)));

  const 저장 = [
    '(() => {',
    '  const b = document.querySelectorAll("button");',
    '  for (let i = 0; i < b.length; i++) if ((b[i].innerText || "").trim() === "저장") { b[i].click(); return "눌렀다"; }',
    '  return "저장 단추를 못 찾았다";',
    '})()',
  ].join('\n');
  console.log('■ 저장 — ' + String(await 재기(붙음, 저장, 20000)));

  /* ④ 되읽어 판정한다 — 「눌렀다」를 「올라갔다」로 읽지 않는다 */
  await new Promise((s) => setTimeout(s, 9000));
  const 본다 = [
    '(() => {',
    '  const d = document;',
    '  const t = d.body ? d.body.innerText : "";',
    '  return JSON.stringify({',
    '    주소: location.href,',
    '    그림수: d.querySelectorAll("img[src*=zodiac-color]").length,',
    '    첫줄: t.indexOf(' + JSON.stringify('[오늘의 운세] ' + o.긴날 + ' 별자리 운세') + ') >= 0,',
    '    도움말: t.indexOf("도움말: KLifeDesign.AI") >= 0,',
    '    제목: t.indexOf(' + JSON.stringify(o.제목) + ') >= 0',
    '  });',
    '})()',
  ].join('\n');
  let 잰것 = null;
  try { 잰것 = JSON.parse(String(await 재기(붙음, 본다, 40000))); } catch { 잰것 = null; }
  console.log('■ 되읽기 — ' + JSON.stringify(잰것));

  const 됐나 = !!잰것 && 잰것.그림수 === 12 && 잰것.첫줄 && 잰것.도움말 && 잰것.제목
    && /articleView/.test(잰것.주소);

  if (됐나) {
    console.log('🟢 올라갔다 — ' + (승인할까 ? '승인' : '미승인') + ' · ' + 잰것.주소);
    종료코드 = 0;
  } else {
    console.log('🔴 올라가지 않았다');
    console.log(등록실패통보(일자문자열,
      '저장은 눌렀는데 되읽기가 통과하지 못했습니다.',
      JSON.stringify(잰것)));
  }

  /* 자국을 남긴다 — 됐든 안 됐든 */
  if (!fs.existsSync(자국길)) fs.writeFileSync(자국길, '# 날\t올린때(KST)\t승인\t됐나\t그림수\t주소\n', 'utf8');
  fs.appendFileSync(자국길, [일자문자열, 시각문자열(), 승인할까 ? '승인' : '미승인',
    됐나 ? '됐다' : '못했다', 잰것 ? 잰것.그림수 : '-', 잰것 ? 잰것.주소 : '-'].join('\t') + '\n', 'utf8');
} catch (e) {
  console.error('🔴 돌다가 터졌다 — ' + e.message);
  console.log(등록실패통보(일자문자열, '돌다가 터졌습니다 — ' + String(e.message).slice(0, 160), ''));
} finally {
  붙음.닫기();
  /* ⛔ 연 탭은 그 일이 끝나는 자리에서 닫는다 — 2026-11-05 사장님 지시.
     안 닫으면 날마다 한 장씩 쌓여 빌드가 죽는다(225장까지 간 적이 있다). */
  if (생성한탭) {
    try { await fetch(기본뿌리 + '/json/close/' + 생성한탭); console.log('■ 연 탭을 닫았다'); }
    catch { console.log('⚠ 연 탭을 못 닫았다'); }
  }
}
process.exit(종료코드);
}
