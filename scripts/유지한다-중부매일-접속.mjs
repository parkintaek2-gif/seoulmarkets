#!/usr/bin/env node
/**
 * 유지한다-중부매일-접속.mjs — 중부매일 CMS 접속이 끊기지 않게 붙잡아 둔다.
 *
 * ── 🔴🔴 왜 이것이 있나 (사장님 2026-11-18) ──────────────────
 *   「매일 0시 1분에 기사를 승인까지 직접 해」
 *   「자정에 내가 열 수 없잖아」
 *
 *   0시 1분에 올리는 자(올린다-중부매일-별자리.mjs)는 **이미 로그인된 크롬**을 쓴다.
 *   그런데 CMS 는 한동안 아무것도 안 하면 접속을 끊는다. 낮에 한 번 로그인해 두어도
 *   자정까지 그대로 있을 까닭이 없다. 끊긴 것을 자정에 알아차리면 사장님을 깨워야 한다.
 *
 *   ⇒ 그래서 낮 동안 10분마다 한 번씩 CMS 를 열어 본다. 열어 보는 것만으로 접속이 이어진다.
 *   ⇒ 끊겨 있으면 **그때 바로** 사장님께 알린다. 자정이 아니라 낮에 알리는 것이 핵심이다.
 *
 * ⛔ 사장님 창을 안 건드린다. 전용 크롬(9222)에 붙고, 연 자리는 그 자리에서 닫는다.
 * ⛔ 비밀번호를 읽거나 어디로 보내지 않는다. 이 자는 「끊겼나」만 본다.
 * ⛔ 알림이 쌓이지 않게 세 시간에 한 번만 보낸다 — 거짓 경보가 진짜 경보를 죽인다.
 *
 * 쓰는 법
 *   node scripts/유지한다-중부매일-접속.mjs
 *   node scripts/유지한다-중부매일-접속.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { realpathSync } from 'node:fs';
import { 탭들, 탭붙기, 기본뿌리 } from './lib/cdp.mjs';
import { 크롬띄우기, 알릴곳, 때글 } from './올린다-중부매일-별자리.mjs';

const 여기 = path.dirname(fileURLToPath(import.meta.url));
const 뿌리 = path.join(여기, '..');

/** 가벼운 화면 하나. 기사등록 화면은 무겁고 임시저장을 건드릴 수 있어 쓰지 않는다 */
/**
 * 🔴 로그인하면 실제로 서는 자리. 2026-11-18 실측으로 잡았다.
 * ⛔ adminArticleListForm.html 로 보지 않는다 — **그 주소는 없는 페이지다.**
 *   「요청하신 페이지를 찾을 수 없습니다」가 떠서, 로그인돼 있어도 끊긴 것으로 읽혔다.
 * ⚠ 기사등록 화면으로 보지 않는다 — 무겁고 임시저장을 건드릴 수 있다.
 */
export const 살필주소 = 'https://cms.jbnews.com/news/adminArticleIntegrationRecognition.html?sc_area=RW';
export const 로그인주소 = 'https://cms.jbnews.com/admin/adminLoginForm.html';
export const 기록길 = path.join(뿌리, 'docs', '중부매일-접속기록.tsv');
export const 알림간격분 = 180;

/** 이 파일이 직접 불렸나 — ⛔ 들여오기만 해도 밖으로 나가는 것을 막는다 */
export function 직접불렸나(argv1 = process.argv[1], 나 = import.meta.url) {
  try {
    const a = pathToFileURL(realpathSync(argv1)).href;
    const b = pathToFileURL(realpathSync(fileURLToPath(나))).href;
    return process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b;
  } catch { return false; }
}

/**
 * 🔴🔴 접속이 살아 있나.
 *
 * ⛔ 2026-11-18 에 **거짓 초록불**을 냈다. 「로그인 화면이 아니면 성하다」로 쟀는데,
 *   cms.jbnews.com 은 접속이 끊기면 로그인 화면을 주지 않고 **공개 홈(www.jbnews.com)으로
 *   튕긴다.** 그래서 끊긴 채로 「접속이 살아 있다」가 세 번 찍혔다.
 *
 * ⇒ 재는 자리를 바꾼다 — 「무엇이 아닌가」가 아니라 **「관리 화면이 실제로 떴나」**다.
 *   ① 끝에 선 주소가 cms.jbnews.com 이어야 하고
 *   ② 관리 화면의 표가 보여야 한다(제목 칸이나 편집기).
 *   목록 화면에는 편집기가 없으므로 둘 중 하나면 된다.
 */
export function 살아있나(것) {
  if (!것 || typeof 것 !== 'object') return false;
  const 주소 = String(것.주소 ?? '');
  if (!/^https:\/\/cms\.jbnews\.com\//i.test(주소)) return false;
  if (/adminLoginForm|loginForm/i.test(주소)) return false;
  return !!(것.제목칸 || 것.편집기 || 것.목록표);
}

/** 화면에서 긁어 오는 말 — 한 곳에만 적는다 */
export const 살피는말 = `(() => JSON.stringify({
  주소: location.href,
  제목칸: !!document.querySelector('input[name=title]'),
  편집기: !!(window.CKEDITOR && CKEDITOR.instances && CKEDITOR.instances.FCKeditor1),
  목록표: !!document.querySelector('form[name=searchForm], a[href*=adminArticleWriteForm]')
}))()`;

/** 마지막으로 알린 때부터 몇 분 지났나. 기록이 없으면 Infinity */
export function 지난분(줄들, 지금 = new Date()) {
  const 알린것 = 줄들.filter((x) => /\t알렸다\t/.test(x));
  if (!알린것.length) return Infinity;
  const 마지막 = 알린것[알린것.length - 1].split('\t')[0];
  const m = String(마지막).match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/);
  if (!m) return Infinity;
  const t = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]));
  return (지금.getTime() - t.getTime()) / 60000;
}

export function 기록읽기() {
  try { return fs.readFileSync(기록길, 'utf8').split(/\r?\n/).filter((x) => x.trim()); }
  catch { return []; }
}

export function 기록하기(상태, 덧말) {
  const 줄 = [때글(), 상태, String(덧말 ?? '')].join('\t');
  try {
    if (!fs.existsSync(기록길)) fs.writeFileSync(기록길, '때\t상태\t덧말\n', 'utf8');
    fs.appendFileSync(기록길, 줄 + '\n', 'utf8');
  } catch { /* 적지 못해도 일은 이어 간다 */ }
  return 줄;
}

/**
 * 🔴🔴 끊겼으면 **스스로 다시 들어간다.**
 *
 * 로그인 화면에는 「아이디 저장」만 있고 「로그인 유지」가 없다(2026-11-18 실측).
 * 그러니 접속은 언젠가 반드시 끊긴다. 끊길 때마다 사장님을 부르면 자정에 깨우게 된다.
 * ⇒ 크롬이 저장해 둔 아이디·비밀번호를 **크롬이 스스로 채우게** 두고, 단추만 누른다.
 *
 * 🔴🔴 **아이디 칸을 «진짜 마우스»로 눌러야 채워진다** (사장님 2026-11-18 「아이디 쪽을 클릭해봐」).
 *   화면이 뜬 것만으로는 비밀번호 칸이 빈 채로 있다. element.click() 으로도 안 된다.
 *   Input.dispatchMouseEvent 로 그 자리를 실제로 눌러야 크롬이 채운다.
 *
 * ⛔ 비밀번호를 읽지 않는다. 적지 않는다. 어디로도 보내지 않는다.
 *   이 글에서 비밀번호에 대해 아는 것은 **「비어 있나 아닌가」** 하나뿐이다.
 */
export const 아이디칸자리말 = `(() => {
  const i = document.querySelector('#user_id');
  if (!i) return '';
  const r = i.getBoundingClientRect();
  if (!r.width || !r.height) return '';
  return JSON.stringify({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
})()`;

export const 들어가는말 = `(() => {
  const i = document.querySelector('#user_id');
  const p = document.querySelector('#user_pw');
  if (!i || !p) return JSON.stringify({ 됨: false, 왜: '칸이 없다' });
  /* ⛔ 값을 내보내지 않는다. 길이가 0 인지만 본다 */
  if (!String(p.value || '').length) return JSON.stringify({ 됨: false, 왜: '비밀번호가 안 채워졌다' });
  if (!String(i.value || '').length) return JSON.stringify({ 됨: false, 왜: '아이디가 안 채워졌다' });
  const b = document.querySelector('button[type=submit], input[type=submit]');
  if (!b) return JSON.stringify({ 됨: false, 왜: '로그인 단추가 없다' });
  b.click();
  return JSON.stringify({ 됨: true, 왜: '눌렀다' });
})()`;

/** 끊겼다고 알린다. ⛔ 메일이 안 나가도 이 자가 터지지 않는다 */
export function 끊겼다고알린다() {
  const 글길 = path.join(뿌리, 'docs', '편지-중부매일-접속끊김.txt');
  const 글 = [
    '사장님, 5번입니다.',
    '',
    '중부매일 CMS 접속이 끊겨 있습니다. 지금 낮에 한 번 로그인해 주시면,',
    '오늘 0시 1분 운세 기사가 제 손으로 올라갑니다.',
    '',
    '■ 하실 일',
    '  크롬 북마크 막대의 CMS 를 누르신 뒤 비밀번호를 넣고 로그인하시면 됩니다.',
    '  크롬이 비밀번호를 저장할지 물으면 저장을 눌러 주십시오.',
    '  한 번 저장해 두시면 다음부터는 접속이 끊겨도 제가 스스로 다시 들어갑니다.',
    '',
    '■ 제가 하고 있는 것',
    '  10분마다 CMS 를 열어 접속을 이어 두고 있습니다.',
    '  끊긴 것을 자정이 아니라 지금 알려 드리는 이유가 그것입니다.',
    '',
    '5번 드림',
  ].join('\n');
  try { fs.writeFileSync(글길, 글, 'utf8'); } catch { /* 적지 못해도 메일은 띄운다 */ }
  try {
    execFileSync('node', [path.join(뿌리, 'scripts', 'send-mail.mjs'),
      '--받는곳=' + 알릴곳,
      '--제목=[5번] 중부매일 CMS 접속이 끊겼습니다 - 낮에 한 번 로그인 부탁드립니다',
      '--글=' + 글길, '--흐르게', '--보낸다'], { cwd: 뿌리, stdio: 'inherit', timeout: 120000 });
    return '메일을 보냈다';
  } catch (e) {
    return '🔴 메일도 못 보냈다 — ' + String(e.message).slice(0, 90);
  }
}

/* ── 자가시험 ─────────────────────────────────────────────── */
if (직접불렸나() && process.argv.includes('--자가시험')) {
  let 통 = 0; const 실 = [];
  const 검 = (이름, 참) => { if (참) 통 += 1; else 실.push(이름); };

  /* 🔴🔴 2026-11-18 에 거짓 초록불을 낸 바로 그 꼴 — 공개 홈으로 튕긴 것 */
  검('🔴 공개 홈으로 튕기면 끊긴 것이다',
    !살아있나({ 주소: 'https://www.jbnews.com/', 제목칸: false, 편집기: false, 목록표: false }));
  검('🔴 공개 홈의 관리 주소도 끊긴 것이다',
    !살아있나({ 주소: 'https://www.jbnews.com/news/adminArticleListForm.html', 목록표: true }));
  검('🔴 로그인 화면은 끊긴 것이다',
    !살아있나({ 주소: 'https://cms.jbnews.com/admin/adminLoginForm.html', 목록표: true }));
  검('🔴 cms 에서 제목 칸이 보이면 살아 있다',
    살아있나({ 주소: 'https://cms.jbnews.com/news/adminArticleWriteForm.html?mode=input', 제목칸: true }));
  검('🔴 cms 목록 화면도 살아 있는 것이다',
    살아있나({ 주소: 살필주소, 목록표: true }));
  검('⛔ 주소만 cms 고 표가 하나도 없으면 끊긴 것이다',
    !살아있나({ 주소: 살필주소, 제목칸: false, 편집기: false, 목록표: false }));
  검('⛔ 빈 것은 끊긴 것이다', !살아있나(null) && !살아있나(undefined) && !살아있나('성하다'));
  검('⛔ 생김새만 흉내 낸 주소에 속지 않는다',
    !살아있나({ 주소: 'https://cms.jbnews.com.evil.example/x', 제목칸: true }));
  검('살피는 말이 세 가지를 다 본다',
    /제목칸/.test(살피는말) && /편집기/.test(살피는말) && /목록표/.test(살피는말));

  검('기록이 없으면 Infinity', 지난분([]) === Infinity);
  검('알린 줄이 없으면 Infinity', 지난분(['2026-11-18 20:00\t성하다\t']) === Infinity);
  {
    const 지금 = new Date(2026, 10, 18, 21, 0);
    검('🔴 한 시간 전에 알렸으면 60분',
      Math.round(지난분(['2026-11-18 20:00\t알렸다\t끊김'], 지금)) === 60);
    검('🔴 마지막 알림을 본다 — 앞엣것이 아니다',
      Math.round(지난분(['2026-11-18 10:00\t알렸다\t', '2026-11-18 20:30\t알렸다\t'], 지금)) === 30);
    검('성한 줄이 섞여도 알린 줄만 센다',
      Math.round(지난분(['2026-11-18 20:30\t알렸다\t', '2026-11-18 20:50\t성하다\t'], 지금)) === 30);
    검('🔴 세 시간이 안 됐으면 안 알린다', 지난분(['2026-11-18 20:00\t알렸다\t'], 지금) < 알림간격분);
    검('🔴 세 시간이 지났으면 알린다',
      지난분(['2026-11-18 17:00\t알렸다\t'], new Date(2026, 10, 18, 20, 30)) >= 알림간격분);
  }
  검('⛔ 때가 깨져 있으면 Infinity', 지난분(['뭐야\t알렸다\t']) === Infinity);

  검('알림 간격이 세 시간이다', 알림간격분 === 180);
  검('🔴 살필 곳이 기사등록 화면이 아니다 — 임시저장을 건드리지 않는다',
    !/WriteForm/i.test(살필주소) && /cms\.jbnews\.com/.test(살필주소));
  검('⛔ 들여오기만으로는 안 돈다', typeof 직접불렸나 === 'function' && !직접불렸나('아무것도아닌길'));
  검('기록 자리가 docs 안이다', 기록길.includes(path.join('docs', '중부매일-접속기록.tsv')));
  검('⛔ 비밀번호를 다루는 곳이 없다',
    !fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').match(/password\s*=|\.value\s*=\s*["'][^"']{4,}/));

  /* 🔴🔴 스스로 다시 들어가는 말 — ⛔ 비밀번호가 밖으로 나가지 않아야 한다 */
  검('🔴 다시 들어가는 말이 단추를 누른다', /\.click\(\)/.test(들어가는말));
  검('⛔ 비밀번호 값을 내보내지 않는다 — 길이만 본다',
    /String\(p\.value \|\| ''\)\.length/.test(들어가는말)
    && !/비밀번호: *p\.value|pw: *p\.value|값: *p\.value/.test(들어가는말));
  검('⛔ 비밀번호를 채워 넣지 않는다 — 크롬이 채우게 둔다',
    !/p\.value\s*=/.test(들어가는말) && !/user_pw[^\n]*=\s*["']/.test(들어가는말));
  검('🔴 안 채워졌으면 누르지 않는다',
    /비밀번호가 안 채워졌다/.test(들어가는말) && /아이디가 안 채워졌다/.test(들어가는말));
  검('🔴 로그인 주소가 cms 다', /^https:\/\/cms\.jbnews\.com\//.test(로그인주소));
  /* 🔴🔴 사장님 2026-11-18 「아이디 쪽을 클릭해봐」 — 눌러야 크롬이 채운다 */
  검('🔴 아이디 칸 자리를 재는 말이 있다',
    /getBoundingClientRect/.test(아이디칸자리말) && /#user_id/.test(아이디칸자리말));
  검('⛔ 아이디 칸 자리 말이 값을 내보내지 않는다', !/\.value/.test(아이디칸자리말));
  /* 🔴 2026-11-18 — 없는 페이지를 보고 있었다. 그 주소로 되돌아가면 안 된다 */
  검('⛔ 살필 곳이 없는 페이지가 아니다', !/adminArticleListForm/.test(살필주소));
  검('🔴 살필 곳이 로그인 뒤 실제로 서는 자리다',
    /adminArticleIntegrationRecognition/.test(살필주소));
  {
    /* 🔴🔴 2026-11-18 — 알림 창이 떠 있으면 화면을 한 글자도 못 읽는다.
       닫는 자리를 지우면 이 자가 날마다 그 자리에서 선다. 지워지지 않게 못박는다 */
    const 나글 = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8');
    검('🔴 알림 창을 스스로 닫는다',
      /Page\.javascriptDialogOpening/.test(나글) && /Page\.handleJavaScriptDialog/.test(나글));
    검('🔴 바깥 것을 막고 본다 — 유튜브 틀이 화면을 멈춘다',
      /Network\.setBlockedURLs/.test(나글) && /youtube\.com/.test(나글));
    검('🔴 빈 자리로 열고 옮겨 간다',
      /json\/new\?about:blank/.test(나글));
    검('🔴 아이디 칸을 진짜 마우스로 누른다',
      /Input\.dispatchMouseEvent/.test(나글) && /mousePressed/.test(나글));
  }

  if (실.length) { console.error('🔴 실패 ' + 실.length + '개\n - ' + 실.join('\n - ')); process.exit(1); }
  console.log('✅ 중부매일 접속 유지 — 자가시험 ' + 통 + '개 통과');
  process.exit(0);
}

/* ── 실제로 돈다 ──────────────────────────────────────────── */
if (!직접불렸나()) {
  /* 들여오기만 한 것이다. ⛔ 아무것도 하지 않는다 */
} else {
  console.log('■ 크롬 — ' + (await 크롬띄우기()));

  /* 🔴 빈 자리로 연다. 2026-11-18 실측 — 무거운 화면(공개 홈은 유튜브 틀이 다섯)으로 바로 열면
     Runtime.enable 이 30초 안에 안 온다. 빈 자리에 먼저 붙고 그 뒤에 옮겨 간다 */
  let 새탭 = null;
  try {
    const r = await fetch(기본뿌리 + '/json/new?about:blank', { method: 'PUT' });
    새탭 = (await r.json()).id;
  } catch { 새탭 = null; }

  if (!새탭) {
    console.error('🔴 CMS 를 열지 못했다');
    console.log(기록하기('못열었다', '크롬에 붙지 못했다'));
    process.exit(1);
  }

  await new Promise((s) => setTimeout(s, 6000));
  const 탭 = (await 탭들()).find((x) => x.id === 새탭);
  let 끝값 = 1;

  if (!탭) {
    console.error('🔴 연 자리를 못 찾았다');
    console.log(기록하기('못열었다', '연 자리를 못 찾았다'));
  } else {
    const 붙음 = await 탭붙기(탭.webSocketDebuggerUrl);
    try {
      await 붙음.보내기('Runtime.enable');
      await 붙음.보내기('Page.enable');
      /* 🔴🔴 2026-11-18 실측 — 접속이 끊긴 채로 관리 주소를 열면 CMS 가 알림 창을 띄운다.
         알림 창이 떠 있는 동안 Runtime.evaluate 가 «영영 안 온다». 40초를 줘도 안 온다.
         ⇒ 뜨는 즉시 닫는다. 안 닫으면 이 자가 날마다 그 자리에서 선다 */
      붙음.듣기('Page.javascriptDialogOpening', () => {
        붙음.보내기('Page.handleJavaScriptDialog', { accept: true })
          .catch(() => { /* 이미 닫혔다 */ });
      });
      /* 🔴 공개 홈으로 튕기면 유튜브 틀이 다섯 붙어 화면이 멈춘다. 그러면 아무것도 못 읽는다.
         우리가 보려는 것은 「관리 화면이 떴나」 하나뿐이므로 바깥 것을 막고 본다 */
      await 붙음.보내기('Network.enable');
      await 붙음.보내기('Network.setBlockedURLs', {
        urls: ['*youtube.com*', '*ytimg.com*', '*googlevideo.com*',
          '*doubleclick.net*', '*googlesyndication.com*', '*google-analytics.com*'],
      });
      await 붙음.보내기('Page.navigate', { url: 살필주소 });
      await new Promise((s) => setTimeout(s, 8000));
      try { await 붙음.보내기('Page.stopLoading', {}, 8000); } catch { /* 그냥 간다 */ }
      await new Promise((s) => setTimeout(s, 1200));
      const 답 = await 붙음.보내기('Runtime.evaluate',
        { expression: 살피는말, returnByValue: true }, 40000);
      let 것 = null;
      try { 것 = JSON.parse(String(답?.result?.value ?? '')); } catch { 것 = null; }
      const 어디 = 것 ? String(것.주소) : '(못 읽었다)';
      console.log('■ 지금 어디 — ' + 어디);

      if (!살아있나(것)) {
        /* 🔴 먼저 스스로 다시 들어가 본다. 사장님을 부르는 것은 그 다음이다 */
        console.log('🔴 관리 화면이 안 떴다 — 스스로 다시 들어가 본다');
        await 붙음.보내기('Page.enable');
        await 붙음.보내기('Page.navigate', { url: 로그인주소 });
        await new Promise((s) => setTimeout(s, 7000));

        /* 🔴🔴 아이디 칸을 진짜 마우스로 누른다 — 안 누르면 비밀번호가 안 채워진다 */
        const 자리답 = await 붙음.보내기('Runtime.evaluate',
          { expression: 아이디칸자리말, returnByValue: true }, 20000);
        let 곳 = null;
        try { 곳 = JSON.parse(String(자리답?.result?.value ?? '')); } catch { 곳 = null; }
        if (곳) {
          for (const 꼴 of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
            await 붙음.보내기('Input.dispatchMouseEvent', {
              type: 꼴, x: 곳.x, y: 곳.y, button: 'left',
              clickCount: 꼴 === 'mouseMoved' ? 0 : 1,
            });
            await new Promise((s) => setTimeout(s, 180));
          }
          await new Promise((s) => setTimeout(s, 2500));
        } else {
          console.log('   ⚠ 아이디 칸을 못 찾았다');
        }

        const 눌 = await 붙음.보내기('Runtime.evaluate',
          { expression: 들어가는말, returnByValue: true }, 20000);
        let 눌것 = null;
        try { 눌것 = JSON.parse(String(눌?.result?.value ?? '')); } catch { 눌것 = null; }
        console.log('   ■ 다시 들어가기 — ' + (눌것 ? 눌것.왜 : '못 읽었다'));

        if (눌것 && 눌것.됨) {
          await new Promise((s) => setTimeout(s, 8000));
          await 붙음.보내기('Page.navigate', { url: 살필주소 });
          await new Promise((s) => setTimeout(s, 7000));
          const 다 = await 붙음.보내기('Runtime.evaluate',
            { expression: 살피는말, returnByValue: true }, 20000);
          let 다것 = null;
          try { 다것 = JSON.parse(String(다?.result?.value ?? '')); } catch { 다것 = null; }
          if (살아있나(다것)) {
            console.log('✔ 스스로 다시 들어갔다');
            기록하기('되들어갔다', String(다것.주소).slice(0, 80));
            끝값 = 0;
          }
        }
      }

      if (끝값 !== 0 && !살아있나(것)) {
        const 줄들 = 기록읽기();
        if (지난분(줄들) >= 알림간격분) {
          console.log('🔴 끊겼다 — 알린다');
          console.log(끊겼다고알린다());
          기록하기('알렸다', '관리 화면이 안 떴다 — ' + 어디.slice(0, 70));
        } else {
          console.log('🔴 끊겼다 — 세 시간이 안 지나 이번엔 안 알린다');
          기록하기('끊겼다', '세 시간이 안 지나 안 알렸다');
        }
        끝값 = 1;
      } else if (살아있나(것)) {
        console.log('✔ 접속이 살아 있다');
        기록하기('성하다', 어디.slice(0, 80));
        끝값 = 0;
      }
    } finally {
      붙음.닫기();
    }
  }

  try { await fetch(기본뿌리 + '/json/close/' + 새탭); } catch { /* 그냥 둔다 */ }
  /* ⚠ 소켓이 닫히기 전에 끝내면 노드가 끝에서 괴상한 줄을 뱉는다. 로그를 더럽힌다 */
  await new Promise((s) => setTimeout(s, 400));
  process.exit(끝값);
}
