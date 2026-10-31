#!/usr/bin/env node
/**
 * 구글-색인요청.mjs — **서치콘솔에서 「색인 생성 요청」을 눌러 준다.**
 *
 * ── 🔴🔴 왜 만들었나 (2026-10-04 · 5번) ─────────────────────────────────
 * 사장님 — 「**케이라리프맵 방문자가 0명이라고? … 방문자를 빨리 만들고 늘려**」
 *
 * klifemap.ai 는 구글 검색에서 **28일 노출 0 · 클릭 0** 이었다. 사이트맵 2,918장은
 * 구글이 읽었고(오류 0) robots 도 열려 있는데 **홈 한 장만** 색인돼 있었다.
 * 구글은 IndexNow 를 안 쓰고, Indexing API 는 채용·라이브스트림만 받는다 —
 * 남은 길은 **서치콘솔 화면의 「색인 생성 요청」 단추**뿐이고 그것은 사람 손이다.
 *
 * ⛔ 그 손을 사장님께 빌리지 않는다. 공용 크롬(9222)에 붙어 내가 누른다.
 * ⚠ 처음에 검사 주소를 «유추해서» 넣었다가 404 를 받았다 —
 *   사장님 (수십 번) 「**주소를 지어내지 말고 화면의 링크를 눌러라**」. 그대로 한다:
 *   서치콘솔을 열고 → 화면이 주는 검사 입력칸에 주소를 치고 → 나온 단추를 누른다.
 *
 * ⚠ 구글은 하루 요청 수를 제한한다. 「한도 초과」가 뜨면 그대로 적고 멈춘다 —
 *   눌렀다고 색인되는 것도 아니다. 「대기열에 추가」까지가 우리가 할 수 있는 전부다.
 * ⛔ 사장님 창을 닫지 않는다 — disconnect() 만. 내가 연 탭만 닫는다.
 *
 * ── 🔴🔴 [2026-10-09 · 5번] 속성을 못 박아 둔 탓에 하루 몫 열 개를 통째로 버렸다 ──
 * 이 자는 **속성을 `sc-domain:klifemap.ai` 로 못 박아** 두고 있었다(아래 24줄 경고 그대로).
 * 그런데 나는 2026-10-08 에 `날마다-색인요청.mjs` 를 고쳐 **seoulmarkets 주소를 맨 앞으로**
 * 당겼다. 두 가지가 겹치자 — klifemap 속성에서 seoulmarkets 주소를 검사하게 되어
 * **단추가 아예 안 나왔다.** 10-09 아침 열 건이 전부 「못찾음」이다.
 *   ⛔ 「한쪽을 고치면 인용한 곳까지 따라간다」를 내가 어겼다. 경고가 주석에 **적혀 있었는데도**
 *     말로만 있는 규칙이라 안 걸렸다.
 *   ⭐ 그래서 속성을 «주소에서 끌어낸다». 사람이 기억해서 맞추는 구조를 없앤다.
 *
 * 쓰는 법
 *   node scripts/구글-색인요청.mjs <주소> [주소...]
 *   node scripts/구글-색인요청.mjs --자가시험
 */
import puppeteer from 'puppeteer-core';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * 주소 → 서치콘솔 속성.
 *
 * 🔴🔴🔴 [2026-10-29 · 5번] **모든 주소를 `sc-domain:` 으로 보내고 있었다.**
 *   ─────────────────────────────────────────────────────────────────
 *   그런 속성이 «없는» 사이트가 있다. 10-29 에 속성 고르개를 눌러 적은 것 —
 *     klifemap.ai                 도메인 꼴  ✅
 *     kculturewire.com            도메인 꼴  ✅
 *     https://klifemap.ai/        주소 꼴
 *     https://www.klifemap.ai/    주소 꼴
 *     https://seoulmarkets.com/   주소 꼴   ← **도메인 꼴이 없다**
 *     https://100yearmap.com/     주소 꼴   ← **도메인 꼴이 없다**
 *   없는 속성으로 가면 서치콘솔이 「액세스할 수 없습니다」를 띄운다.
 *   내 자가 그것을 **「문이 잠겼다」**로 읽었고, 나는 사장님께
 *   **「서치콘솔 권한이 끊겼다」**고 올렸다. 사장님 — 「**로그인돼잇다**」. 맞는 말씀이었다.
 *   ⛔ 「권한이 없다」와 「그 속성이 없다」는 **다른 일**이다. 섞으면 없는 사고를 올리게 된다.
 *
 * ⛔ 표에 없는 주소에 기본값을 몰래 넣지 않는다 — null 을 내고 부르는 쪽이 「못 쟀다」로 적는다.
 *   짐작으로 sc-domain 을 지어내던 것이 바로 이 사고의 뿌리다.
 * ⚠ 속성이 늘거나 꼴이 바뀌면 **고르개를 눌러 보고** 이 표를 고친다. 지어내지 않는다.
 */
/* 🔴🔴🔴 [2026-10-29 12:4x · 5번] **여덟 속성을 하나씩 열어 보고 적은 표다.**
 *   ⛔ 짐작으로 적지 않았다. 되는 것과 안 되는 것을 둘 다 눌러 봤다 —
 *     ✅ https://klifemap.ai/        검사칸 664px
 *     ✅ https://www.klifemap.ai/    검사칸 664px
 *     🔴 sc-domain:klifemap.ai       「이 속성에 액세스할 수 없습니다」
 *     🔴 sc-domain:kculturewire.com  같음
 *     🔴 https://seoulmarkets.com/   같음 (sc-domain 꼴도 같음)
 *     🔴 https://100yearmap.com/     같음 (sc-domain 꼴도 같음)
 *   ⇒ 크롬에 든 admin@klifedesign.net 은 **klifemap 주소 꼴 둘만** 쓸 수 있다.
 *
 *   ⚠ 어제 나는 이것을 「서치콘솔 권한이 끊겼다」로 뭉뚱그려 올렸고,
 *     사장님이 「**로그인돼잇다**」고 바로잡아 주셨다. 두 말이 다 맞다 —
 *     로그인은 돼 있고, 그 계정이 **네 속성에 권한이 없을 뿐**이다.
 *     ⛔ 「끊겼다」처럼 넓은 말로 올리지 않는다. 되는 것과 안 되는 것을 갈라 적는다.
 *
 * ⚠ 권한이 생기면 이 표를 고친다. **고르개를 눌러 보고** 고친다 — 지어내지 않는다.
 */
export const 속성표 = {
  'klifemap.ai': 'https://klifemap.ai/',
};

/** 이 계정으로는 못 들어가는 곳 — 「왜 안 되나」를 자가 말할 수 있게 따로 적는다 */
export const 못들어가는곳 = {
  'kculturewire.com': '2026-10-29 재 봄 — 도메인 꼴·주소 꼴 모두 「액세스할 수 없습니다」',
  'seoulmarkets.com': '2026-10-29 재 봄 — 도메인 꼴·주소 꼴 모두 「액세스할 수 없습니다」',
  '100yearmap.com': '2026-10-29 재 봄 — 도메인 꼴·주소 꼴 모두 「액세스할 수 없습니다」',
};

export function 속성구하기(주소) {
  let 호스트;
  try { 호스트 = new URL(String(주소)).hostname.toLowerCase(); } catch { return null; }
  if (!호스트) return null;
  const 벗긴것 = 호스트.replace(/^www./, '');
  return 속성표[벗긴것] ?? null;
}

/** 속성이 같은 것끼리 묶는다. 속성을 못 구한 것은 따로 낸다 */
export function 속성별묶기(주소들) {
  const 묶음 = new Map();
  const 못구함 = [];
  for (const u of 주소들 ?? []) {
    const s = 속성구하기(u);
    if (!s) { 못구함.push(u); continue; }
    if (!묶음.has(s)) 묶음.set(s, []);
    묶음.get(s).push(u);
  }
  return { 묶음, 못구함 };
}

export const 속성주소 = (속성) =>
  'https://search.google.com/search-console?resource_id=' + encodeURIComponent(속성);

if (process.argv.includes('--자가시험')) {
  const 것 = []; const 다 = (이름, 참) => 것.push({ 이름, 참: !!참 });
  다('klifemap 은 «주소 꼴» 속성이다 — 도메인 꼴은 못 들어간다', 속성구하기('https://klifemap.ai/all') === 'https://klifemap.ai/');
  다('🔴 seoulmarkets 는 이 계정으로 못 들어간다', 속성구하기('https://seoulmarkets.com/data') === null && 못들어가는곳['seoulmarkets.com']);
  다('www 는 뗀다', 속성구하기('https://www.klifemap.ai/x') === 'https://klifemap.ai/');
  다('주소가 아니면 null — 기본값을 몰래 안 쓴다', 속성구하기('그냥글') === null);
  다('빈 것도 null', 속성구하기(null) === null);
  다('속성별로 묶는다', (() => {
    const { 묶음 } = 속성별묶기(['https://klifemap.ai/a', 'https://seoulmarkets.com/b', 'https://klifemap.ai/c']);
    return 묶음.size === 1 && 묶음.get('https://klifemap.ai/').length === 2;
  })());
  다('못 구한 것은 따로 낸다', 속성별묶기(['아무거나']).못구함.length === 1);
  다('속성 주소를 제대로 만든다', 속성주소('sc-domain:klifemap.ai').endsWith('sc-domain%3Aklifemap.ai'));
  다('🔴 100yearmap 도 못 들어간다', 속성구하기('https://100yearmap.com/age') === null);
  다('⛔ 표에 없는 곳은 지어내지 않는다', 속성구하기('https://naver.com/x') === null);
  다('⛔ 주소가 아니면 null', 속성구하기('그냥 글') === null);
  다('⛔ 못 들어가는 곳은 까닭을 들고 있다', Object.values(못들어가는곳).every((v) => /재 봄/.test(v)));
  const 진 = 것.filter((x) => !x.참);
  console.log(`구글 색인요청 — 자체 점검 ${것.length - 진.length}/${것.length}`);
  for (const x of 진) console.log('   🔴 ' + x.이름);
  process.exit(진.length ? 1 : 0);
}

/* ⛔ 이 파일을 «불러서» 표만 쓰는 자가 있다(날마다-색인요청.mjs).
   명령으로 돌 때만 아래가 돌게 한다 — 안 그러면 부르는 쪽이 그 자리에서 죽는다.
   2026-10-29 에 실제로 그랬다 — 「쓰는 법」만 찍고 그날 색인 요청이 또 0건이 될 뻔했다. */
const 내가실행됐다 = process.argv[1]
  && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (!내가실행됐다) {
  /* 불러 쓰는 자리 — 표와 함수만 내주고 끝낸다 */
} else {
const 것들 = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!것들.length) {
  console.log('⛔ 쓰는 법: node scripts/구글-색인요청.mjs <주소> [주소...]');
  process.exit(1);
}
const b = await puppeteer.connect({ browserURL: (process.env.KLM_CHROME_PORT ? 'http://127.0.0.1:' + process.env.KLM_CHROME_PORT : 'http://127.0.0.1:9223'), defaultViewport: null });
const p = await b.newPage();
const 잠깐 = (ms) => new Promise((r) => setTimeout(r, ms));
const { 묶음, 못구함 } = 속성별묶기(것들);
/* ⛔ 「못 구했다」로 뭉뚱그리지 않는다 — **왜** 못 넣는지 말한다.
   「그 주소를 모른다」와 「그 속성에 권한이 없다」는 고칠 것이 서로 다르다. */
for (const u of 못구함) {
  let 집 = null;
  try { 집 = new URL(u).hostname.toLowerCase().replace(/^www./, ''); } catch { 집 = null; }
  const 까닭 = 집 && 못들어가는곳[집];
  if (까닭) {
    console.log(`■ ${u}`);
    console.log(`   🔴 이 계정(admin@klifedesign.net)은 ${집} 속성에 **권한이 없다** — 안 넣는다`);
    console.log(`      ${까닭}`);
      console.log('      ⇒ 고칠 것은 권한이다. 서치콘솔에서 이 계정을 사용자로 더하면 열린다');
  } else {
    console.log(`■ ${u}`);
    console.log('   ⬜ 주소에서 속성을 못 구했다 — 안 넣는다');
  }
}
try {
 for (const [속성, 주소들] of 묶음) {
  /* 🔴 속성마다 한 번씩 연다 — 한 속성 화면에서 다른 사이트 주소를 검사하면
     「색인 생성 요청」 단추가 아예 안 나온다. 그것이 10-09 의 열 건이다. */
  console.log(`\n── 속성 ${속성} — ${주소들.length}개`);
  await p.goto(속성주소(속성), { waitUntil: 'networkidle2', timeout: 90000 });
  await 잠깐(4000);

  /* 🔴🔴 [2026-10-29 · 5번] **문이 잠겼는데 「모름」으로 적고 있었다.**
     ─────────────────────────────────────────────────────────────────
     [무엇이 있었나] 오늘 열 개가 모두 「모름」으로 대장에 적혔는데 하나도 안 들어갔다.
       서치콘솔이 **「이 속성에 액세스할 수 없습니다」**를 띄우고 있었다 — 크롬에 든 계정이
       admin@klifedesign.net 인데 네 속성 모두 그 계정에 권한이 없다.
       검사칸은 «있긴 한데 폭이 0» 이라 `click()` 이 터졌다.
     [무엇이 나빴나] 「모름」은 **단추를 누른 뒤 알림만 못 읽은 것**을 뜻한다(10-09 의 뜻매김).
       누르지도 못한 것을 그 말로 적으면 **하루 몫 열 개가 헛되이 깎인다** —
       그날의 색인 요청이 통째로 사라지는데 대장에는 「했다」로 남는다.
     ⇒ 문이 잠긴 것을 «먼저» 보고, 그 속성은 **한 줄도 적지 않고** 건너뛴다.
     ⛔ 「칸이 있다」를 「쓸 수 있다」로 읽지 않는다 — 폭이 0 이면 못 쓰는 칸이다. */
  const 문 = await p.evaluate(() => {
    const 칸 = document.querySelector('input[aria-label*="검사"], input[placeholder*="검사"]');
    const r = 칸 ? 칸.getBoundingClientRect() : null;
    const t = document.body.innerText || '';
    return {
      잠겼나: /액세스할 수 없습니다|소유권 확인|not-verified/.test(`${t} ${location.href}`),
      계정: (t.match(/([\w.+-]+@[\w.-]+) 계정으로 로그인됨/) || [])[1] || '(모름)',
      칸폭: r ? Math.round(r.width) : 0,
    };
  });
  /* 🔴🔴🔴 [2026-10-29 · 5번] **「칸 폭이 0」을 「문이 잠겼다」로 읽고 있었다.**
     ─────────────────────────────────────────────────────────────────
     [무엇이 있었나] 10-29 00:33 에 열 줄이 모두 「검사칸폭 0」으로 찍혔다.
       나는 그것을 보고 사장님께 **「서치콘솔 권한이 끊겼다」**고 올렸다.
       사장님 — 「**로그인돼잇다**」. 열어 보니 정말 열려 있었다
       (박인택 · admin@klifedesign.net · 색인 23 / 미색인 3,307 / 클릭 13).
       그 시각 진짜로 있었던 일은 **작업용 크롬이 내려가 있던 것**이다.
     [무엇이 나빴나] 폭 0 은 「못 쓴다」가 아니라 **「아직 못 쟀다」**다.
       둘을 한 덩이로 묶으면 ① 사장님께 없는 사고를 올리고
       ② 자물쇠가 면제를 열어 **그날 색인 요청이 통째로 빠진다.**
     ⇒ 가른다 — 글자로 잠긴 것만 「잠겼다」. 폭 0 은 몇 번 더 기다려 보고,
       그래도 0 이면 **「못 쟀다」**로 적는다. ⛔ 못 쟀을 때 «자국을 남기지 않는다».
       면제는 정말 잠긴 날에만 열려야 한다. */
  if (!문.잠겼나 && 문.칸폭 === 0) {
    let 다시 = { ...문 };
    for (let n = 0; n < 3 && !다시.잠겼나 && 다시.칸폭 === 0; n += 1) {
      /* eslint-disable no-await-in-loop */
      await new Promise((r) => setTimeout(r, 2500));
      다시 = await p.evaluate(() => {
        const 칸2 = document.querySelector('input[aria-label*="검사"], input[placeholder*="검사"]');
        const r2 = 칸2 ? 칸2.getBoundingClientRect() : null;
        const t2 = document.body.innerText || '';
        return {
          잠겼나: /액세스할 수 없습니다|소유권 확인|not-verified/.test(t2 + ' ' + location.href),
          계정: (t2.match(/([w.+-]+@[w.-]+) 계정으로 로그인됨/) || [])[1] || '(모름)',
          칸폭: r2 ? Math.round(r2.width) : 0,
        };
      });
      /* eslint-enable no-await-in-loop */
    }
    문.잠겼나 = 다시.잠겼나;
    문.칸폭 = 다시.칸폭;
    문.계정 = 다시.계정;
    if (!문.잠겼나 && 문.칸폭 === 0) {
      console.log(`⬜ ${속성} — **못 쟀다.** 검사칸이 안 그려졌다(폭 0). 건너뛴다`);
      console.log(`   크롬에 든 계정 ${문.계정}`);
      console.log('   ⛔ 이것은 「문이 잠겼다」가 아니다 — 자국을 남기지 않고 면제도 열지 않는다');
      console.log('   ⇒ 작업용 크롬이 살아 있는지부터 본다 (포트 9222)');
      continue;
    }
  }
  if (문.잠겼나) {
    console.log(`🔴 ${속성} — **문이 잠겼다.** 한 줄도 안 적고 건너뛴다 (하루 몫을 안 깎는다)`);
    console.log(`   크롬에 든 계정 ${문.계정} · 검사칸 폭 ${문.칸폭}`);
    console.log('   ⇒ 이 속성을 볼 수 있는 계정으로 크롬에 들어가야 한다');
    /* ⭐ 자국을 «여기서» 남긴다 — 검색 자물쇠의 면제는 이 자국이 있을 때만 열린다.
       ⛔ 손으로 만들어 면제를 사지 않는다. 실제로 문을 두드려 본 자만 이 줄을 쓴다. */
    try {
      const fs = (await import('node:fs')).default;
      const path = (await import('node:path')).default;
      const { fileURLToPath } = await import('node:url');
      const 뿌리 = fileURLToPath(new URL('..', import.meta.url));
      const 방 = path.join(뿌리, 'docs', '고정업무-마커');
      fs.mkdirSync(방, { recursive: true });
      const 때 = new Date();
      fs.appendFileSync(
        path.join(방, `${때.toLocaleDateString('sv-SE')}-서치콘솔-문잠김.txt`),
        `${때.toLocaleString('sv-SE')}\t${속성}\t계정 ${문.계정}\t검사칸폭 ${문.칸폭}\n`,
        'utf8',
      );
    } catch (e) { console.log(`   ⚠ 자국을 못 남겼다 — ${e.message}`); }
    continue;
  }

  for (const u of 주소들) {
    const 칸 = await p.$('input[aria-label*="검사"], input[placeholder*="검사"], input[type="text"]');
    if (!칸) { console.log(`🔴 ${속성} — 검사 입력칸을 못 찾았다. 이 속성은 건너뛴다`); break; }
    await 칸.click({ clickCount: 3 });
    await 칸.type(u, { delay: 15 });
    await p.keyboard.press('Enter');
    await 잠깐(12000);
    /* 「색인 생성 요청」이라고 쓰인 것을 눌러 본다 */
    const 눌렀나 = await p.evaluate(() => {
      const 것 = [...document.querySelectorAll('span,div,button')]
        .filter((e) => /^색인 생성 요청$/.test((e.textContent || '').trim()));
      if (!것.length) return false;
      것[0].click();
      return true;
    });
    if (!눌렀나) { console.log(`■ ${u}\n   ⬜ 「색인 생성 요청」 단추를 못 찾았다`); continue; }
    await 잠깐(25000);
    const 글 = await p.evaluate(() => document.body.innerText);
    const 줄 = 글.split('\n').map((s) => s.trim()).filter(Boolean)
      .filter((l) => /요청|대기열|추가|한도|초과|오류/.test(l)).slice(0, 4);
    console.log(`■ ${u}\n   ${줄.join(' / ') || '눌렀는데 알림을 못 읽었다'}`);
    await 잠깐(3000);
  }
 }
} finally { await p.close(); b.disconnect(); }

}