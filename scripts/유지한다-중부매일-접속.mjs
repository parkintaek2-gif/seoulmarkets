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
export const 살필주소 = 'https://cms.jbnews.com/news/adminArticleListForm.html';
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

/** 로그인 화면으로 넘어갔나 */
export function 끊겼나(어디) {
  return /adminLoginForm|loginForm|\/login/i.test(String(어디 ?? ''));
}

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
    '  끊긴 것을 자정이 아니라 지금 알려 드리는 까닭이 그것입니다.',
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

  검('🔴 로그인 화면을 끊긴 것으로 본다', 끊겼나('https://cms.jbnews.com/admin/adminLoginForm.html'));
  검('🔴 목록 화면은 끊긴 것이 아니다', !끊겼나(살필주소));
  검('⛔ 빈 값은 끊긴 것이 아니다', !끊겼나('') && !끊겼나(null) && !끊겼나(undefined));
  검('대소문자를 가리지 않는다', 끊겼나('HTTPS://CMS.JBNEWS.COM/ADMIN/ADMINLOGINFORM.HTML'));

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

  if (실.length) { console.error('🔴 실패 ' + 실.length + '개\n - ' + 실.join('\n - ')); process.exit(1); }
  console.log('✅ 중부매일 접속 유지 — 자가시험 ' + 통 + '개 통과');
  process.exit(0);
}

/* ── 실제로 돈다 ──────────────────────────────────────────── */
if (!직접불렸나()) {
  /* 들여오기만 한 것이다. ⛔ 아무것도 하지 않는다 */
} else {
  console.log('■ 크롬 — ' + (await 크롬띄우기()));

  let 새탭 = null;
  try {
    const r = await fetch(기본뿌리 + '/json/new?' + encodeURIComponent(살필주소), { method: 'PUT' });
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
      const 답 = await 붙음.보내기('Runtime.evaluate',
        { expression: 'location.href', returnByValue: true }, 20000);
      const 어디 = String(답?.result?.value ?? '');
      console.log('■ 지금 어디 — ' + 어디);

      if (끊겼나(어디)) {
        const 줄들 = 기록읽기();
        if (지난분(줄들) >= 알림간격분) {
          console.log('🔴 끊겼다 — 알린다');
          console.log(끊겼다고알린다());
          기록하기('알렸다', '로그인 화면으로 넘어갔다');
        } else {
          console.log('🔴 끊겼다 — 세 시간이 안 지나 이번엔 안 알린다');
          기록하기('끊겼다', '세 시간이 안 지나 안 알렸다');
        }
        끝값 = 1;
      } else {
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
