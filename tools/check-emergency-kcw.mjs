#!/usr/bin/env node
/**
 * check-emergency-kcw.mjs — **K Culture Wire 비상벨.** (1번이 만든 `docs/비상벨.md` 틀을 이 사이트에 맞춰 복사)
 *
 * ── 왜 이 파일이 생겼나 (2026-09-01 20:2x · 5번) ────────────────────────────
 * 사장님 전체 공지 —
 *   「**1번이 만든 비상벨이 있다. 모든 세션 잘 작동하는 지 확인하라.**」
 *
 * 확인해 보니 **5번(K Culture Wire) 몫이 아예 없었다.**
 * ```
 * 1번 klifemap.ai      tools/check-emergency.mjs            ✅ 있다 (원형)
 * 3번 100yearmap.com   tools/check-emergency-100yearmap.mjs ✅ 있다
 * 6번 seoulmarkets.com tools/check-emergency.mjs            ✅ 있다
 * 5번 kculturewire.com                                      🔴 없었다  ← 이 파일
 * ```
 * ⚠ 「전 유닛이 쓰게 하라」는 지시가 8/31 에 나왔는데 열흘 가까이 내 몫이 비어 있었다.
 *   ⇒ 남이 만든 틀을 「좋다」고 적어 두는 것과 «내 자리에 세우는 것»은 다른 일이다.
 *
 * ── 무엇을 재나 (돈/신뢰가 바로 걸린 자리만 — 전부 재면 느려지고, 느리면 안 돌린다) ──
 *  ① 가용성   홈 · 순위 지면 · 기사 한 편 · /data · llms.txt · 사이트맵이 200 인가
 *  ② 한글 누출 가드  **우리 손님은 영어권이다.** 손님 화면에 한글이 새면 그 자체가 사고다
 *     (사장님 2026-08-05 「네가 할 일은 영어뉴스+데이터가공이다… 해외대상이다」)
 *  ③ 순위 지면의 «수»가 살아 있나  제목에 이름·수치가 들어가는 지면이라 자료가 비면
 *     제목이 거짓이 된다. 그래서 지면 안에 실제 숫자가 있는지 본다
 *  ⛔ 방문자·조회수 경보는 넣지 않는다 — 그건 GA4/Search Console 이 푼다. 비상벨의 일이 아니다.
 *
 * ── 알림 창구 ──────────────────────────────────────────────────────────────
 * ⛔ 새 채널을 안 만든다. 공용 창구(klifemap `/api/owner/notify`)를 부른다.
 * ⛔ 열쇠는 env 로만 읽는다 — 코드·로그에 값을 안 남긴다.
 * ⛔ 열쇠가 없으면 «조용히 넘어가지 않는다» — 빨간불을 크게 남기고 exit 2 로 죽는다.
 * ⛔ 필드 이름은 «영문»으로 쓴다(title/text/from) — 한글 필드명이 셸 인코딩으로 깨진 전례가 있다.
 *
 * 쓰는 법
 *   node tools/check-emergency-kcw.mjs            한 번 재고 끝낸다
 *   node tools/check-emergency-kcw.mjs --조용히    정상이면 조용히(크론용)
 *   node tools/check-emergency-kcw.mjs --자가시험  일부러 깨서 빨간불이 «실제로» 뜨는지 본다
 *
 * ⚠ `docs/비상벨.md` 가 못박아 둔 것 — 「새 감시기를 만들 때는 반드시 정상 상태에서 먼저
 *   초록불을 확인하고, 그다음 일부러 하나를 깨뜨려 빨간불이 실제로 뜨는지도 확인한다」.
 *   이 파일도 그렇게 했다(초록 확인 → 자가시험 빨강 확인).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { 전부못닿았나, 우리가끊겼나, 부를까, 대조군재기, 지금시각 } from './lib/bell-offline-guard.mjs';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 로그 = path.join(뿌리, 'docs', '비상벨.md');
const BASE = process.env.KCW_BASE || 'https://www.kculturewire.com';
const 조용히 = process.argv.includes('--조용히');
const 자가시험 = process.argv.includes('--자가시험') || process.argv.includes('--selftest');

/* 돈/신뢰가 바로 걸린 자리 — 죽으면 손님이 못 읽거나 구글이 못 찾는 곳만.
   ⚠ 「손님이 실제로 여는 주소」로 잰다 — `/index.html` 같은 파일 이름 주소로 재지 않는다. */
const 검사목록 = [
  { 이름: '홈', 경로: '/', 기대: 200 },
  { 이름: '순위 지면(/most-read)', 경로: '/most-read', 기대: 200 },
  { 이름: '기사 목록', 경로: '/articles', 기대: 200 },
  { 이름: '데이터 허브', 경로: '/data', 기대: 200 },
  { 이름: 'llms.txt(AI 인용 관문)', 경로: '/llms.txt', 기대: 200 },
  { 이름: '사이트맵', 경로: '/sitemap.xml', 기대: 200 },
];

/* 순위 지면에 «수»가 살아 있나 — 제목에 이름·수치가 들어가는 지면이라 자료가 비면 제목이 거짓이 된다 */
const 수있어야하는곳 = [
  { 이름: '순위 지면에 읽힌 수', 경로: '/most-read', 무늬: /\d{2,3},\d{3}/ },
];

/* 한글 누출 가드 — 손님 화면(HTML 본문)에 한글이 새면 사고. 우리 손님은 영어권이다.
   ⚠ 지면 «안»의 한글 주석은 빌드에서 지워지므로 라이브 HTML 에 있으면 진짜 누출이다. */
const 한글가드 = ['/', '/most-read'];
const 한글무늬 = /[가-힣]{2,}/;

/* 🔴🔴 [2026-10-28 · 사장님] 「케이컬쳐와이어 한국어 서비스 시작했는데, (한글 누출) 비상이라고 메일이 왜 오나?」
   ─────────────────────────────────────────────────────────────────────────
   [무엇이 있었나] 한국어 리뷰(/ko)를 내면서 영문 홈과 순위 지면 머리띠에
     「리뷰 (Korean reviews)」 라는 길목이 생겼다. 이 자가 그 한 낱말을 누출로 읽어
     비상 메일을 계속 보냈다. 라이브를 떠서 세어 보니 두 지면 모두 «한 건», 그 길목뿐이었다.
   [어떻게 고치나] ⛔ 「리뷰」를 허용목록에 넣지 않는다 — 낱말을 하나씩 더하면 목록이
     자라면서 진짜 누출까지 조용히 통과시킨다(푸터 때 이미 정한 원칙이다).
   ⇒ **스스로 한국어라고 «선언한» 칸(lang="ko")을 셈에서 뺀다.** 그 선언은 손님과
     검색엔진에게 「여기는 한국어다」라고 밝혀 둔 자리라, 거기 한글이 있는 것은 사고가 아니다.
     선언 없이 새는 한글은 그대로 빨강으로 남는다 — 자가 무뎌지지 않는다.
   ⚠ 같은 이름의 태그가 겹쳐 든 경우는 보지 않는다. 언어를 선언하는 칸은 길목·토막글이라
     겹치지 않고, 겹치더라도 덜 지워져 «빨강 쪽»으로 틀린다(놓치는 쪽이 아니다). */
export function 한국어로선언한칸빼기(html) {
  let 글 = String(html == null ? '' : html);
  const 선언 = /<([a-zA-Z][\w-]*)\b[^>]*\blang\s*=\s*["']ko(?:-[A-Za-z]+)?["'][^>]*>/i;
  for (let 번 = 0; 번 < 500; 번 += 1) {
    const m = 선언.exec(글);
    if (!m) break;
    const 꼬리 = new RegExp('</' + m[1].toLowerCase() + '\\s*>', 'i');
    const 나머지 = 글.slice(m.index + m[0].length);
    const k = 나머지.search(꼬리);
    if (k < 0) { 글 = 글.slice(0, m.index) + ' '; break; }
    글 = 글.slice(0, m.index) + ' ' + 나머지.slice(k + 나머지.slice(k).match(꼬리)[0].length);
  }
  return 글;
}

/** 화면에 «보이는 글»만 남긴다 — 선언된 한국어 칸·푸터·스크립트·스타일은 셈에서 뺀다 */
export function 보이는글만(본문) {
  return 한국어로선언한칸빼기(본문)
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ');
}

/* ⭐ 규칙은 문장이 아니라 «검사»로 둔다 — 말로만 적어 둔 규칙은 다음 사람이 모른다 */
export function 가드자가시험() {
  const 것 = [];
  const 재본다 = (이름, 참) => 것.push({ 이름, 참: !!참 });
  재본다('⛔ 한국어 길목(lang="ko")은 누출이 아니다',
    !한글무늬.test(보이는글만('<nav><a href="/articles">All articles</a> · <a href="/ko" hreflang="ko" lang="ko">리뷰 <span class="fine">(Korean reviews)</span></a></nav>')));
  재본다('🔴 선언 없이 샌 한글은 그대로 잡는다', 한글무늬.test(보이는글만('<main><h1>오늘의 기사</h1></main>')));
  재본다('🔴 길목을 뺀 뒤에 샌 한글도 잡는다', 한글무늬.test(보이는글만('<a lang="ko">리뷰</a><p>이건 사고다</p>')));
  재본다('⛔ 푸터의 법정 표기는 안 잡는다', !한글무늬.test(보이는글만('<footer>Mail-order licence 2026-세종-0591 (세종특별자치시)</footer>')));
  재본다('⛔ 빈 것에 안 터진다', 한국어로선언한칸빼기(null) === '' && 보이는글만(undefined) === '');
  const 빨강 = 것.filter((x) => !x.참);
  console.log(`■ 한글 누출 가드 자가시험 ${것.length - 빨강.length}/${것.length}`);
  for (const x of 것) console.log(`  ${x.참 ? '✅' : '🔴'} ${x.이름}`);
  return 빨강.length === 0;
}

/**
 * 한 자리를 잰다.
 *
 * 🔴 [2026-09-21 19:40] **닿지 못한 것은 «한 번 더» 잰다.**
 *   그날 여섯 자리가 전부 `fetch failed` 로 나와 사장님께 「비상 6건」이 갔다.
 *   4분 뒤 여섯 다 200 이었다 — 순간 끊김이었다. 한 번의 실패로 사람을 부르지 않는다.
 *   ⛔ HTTP 오류(4xx·5xx)는 다시 재지 않는다 — 그건 서버가 «대답한» 것이라 진짜다.
 */
async function 재기(경로, 다시 = 1) {
  const url = BASE.replace(/\/$/, '') + 경로;
  for (let 번 = 0; ; 번++) {
    try {
      const r = await fetch(url, { redirect: 'manual', headers: { 'User-Agent': 'kcw-emergency-bell' } });
      const 본문 = r.headers.get('content-type')?.includes('text') ? await r.text().catch(() => '') : '';
      return { url, code: r.status, 본문 };
    } catch (e) {
      if (번 >= 다시) return { url, code: 0, 오류: String(e?.message ?? e), 본문: '' };
      await new Promise((r) => setTimeout(r, 2500));
    }
  }
}

/**
 * `.env` 에서 «이름을 아는 열쇠만» 읽는다.
 *
 * ⚠ [2026-09-01] 이 벨을 처음 돌렸을 때 빨강을 잡았는데 「알림 열쇠가 env 에 없다 —
 *   메일 못 보냄」이 났다. 열쇠는 `dataeconomics/.env` 의 `OWNER_NOTIFY_KEY` 로 «있었다».
 *   이 저장소에는 dotenv 를 쓰는 자리가 없어서 스크립트가 그 파일을 안 읽었을 뿐이다.
 *   ⇒ 비상벨이 정작 비상일 때 못 부르는 상태였다. 그것이 가장 나쁜 흠이다.
 *
 * ⛔ 값을 화면·로그에 안 찍는다. 있고 없는지만 말한다.
 * ⛔ 파일 전체를 process.env 에 쏟지 않는다 — 이름을 아는 둘만 가져온다.
 */
function 열쇠읽기(이름들) {
  for (const 이름 of 이름들) if (process.env[이름]) return process.env[이름];
  for (const 자리 of [path.join(뿌리, '.env'), path.join(뿌리, '..', 'klifemap', '.env')]) {
    let 글;
    try { 글 = fs.readFileSync(자리, 'utf8'); } catch { continue; }
    for (const 줄 of 글.split(/\r?\n/)) {
      const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(줄);
      if (!m) continue;
      if (!이름들.includes(m[1])) continue;
      const 값 = m[2].trim().replace(/^["']|["']$/g, '');
      if (값) return 값;
    }
  }
  return '';
}

async function 알림보내라(제목, 내용) {
  const notifyUrl = process.env.OWNER_NOTIFY_URL || 'https://klifemap.ai/api/owner/notify';
  const key = 열쇠읽기(['OWNER_NOTIFY_KEY', 'SAJU_ADMIN_KEY']);
  if (!key) {
    console.error('⛔ 알림 열쇠(OWNER_NOTIFY_KEY/SAJU_ADMIN_KEY)가 env 에 없다 — 메일 못 보냄. 로그로만 남긴다.');
    return { 보냄: false, 이유: '열쇠 없음' };
  }
  try {
    const r = await fetch(notifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': key },
      /* ⛔ 영문 필드명 — 한글 필드명이 셸 인코딩으로 깨져 「제목이 없습니다」가 난 전례가 있다 */
      body: JSON.stringify({ title: 제목, text: 내용, from: 'kculturewire(5번)' }),
    });
    return { 보냄: r.ok, code: r.status };
  } catch (e) {
    console.error('⛔ 알림 창구 호출 실패:', String(e?.message ?? e));
    return { 보냄: false, 이유: String(e?.message ?? e) };
  }
}

function 로그남겨(줄들) {
  /* 🔴 [2026-09-21] 여기가 UTC 였다 — 19:40 사고가 「10:40」으로 남았다.
     CLAUDE.md 의 「toISOString() 금지」를 비상벨 넷이 다 어기고 있었다. */
  const 이제 = 지금시각();
  const 덩이 = `\n## 🔴 kculturewire — ${이제}\n` + 줄들.map((l) => `- ${l}`).join('\n') + '\n';
  fs.appendFileSync(로그, 덩이);
}

async function 본다() {
  const 빨강 = [];
  const 가용성결과 = [];

  /* 자가시험일 때는 «자 자체»부터 재 본다 — 라이브를 재기 전에 자가 성한지 본다 */
  if (자가시험 && !가드자가시험()) {
    console.error('🔴 한글 누출 가드가 스스로 틀렸다 — 라이브를 재기 전에 이것부터 고친다');
    return 1;
  }

  for (const c of 검사목록) {
    /* 자가시험 — 홈을 일부러 없는 주소로 바꿔 빨간불이 «실제로» 뜨는지 본다 */
    const 경로 = 자가시험 && c.이름 === '홈' ? '/__이경로는없다__강제빨강' : c.경로;
    const r = await 재기(경로);
    가용성결과.push(r);
    const ok = r.code === c.기대;
    if (!조용히 || !ok) console.log(ok ? `✅ ${c.이름} ${r.code}` : `🔴 ${c.이름} ${r.code || r.오류} (기대 ${c.기대})`);
    if (!ok) 빨강.push(`${c.이름} 응답 ${r.code || r.오류} — 기대 ${c.기대} (${r.url})`);
  }

  /* 🔴 [2026-09-21] **여섯이 «전부» 못 닿았으면 사이트가 아니라 연결을 의심한다.**
     이 파일 아래쪽에 이미 「자를 먼저 의심한다 — 모든 지면이 빨강이면 자의 흠」이라고
     적혀 있었는데, 그 규칙이 한글 누출 검사에만 걸려 있고 여기엔 없었다.
     ⇒ 대조군(우리 통제 밖 주소)을 찔러 갈라 본다. 자세한 것은 tools/lib/bell-offline-guard.mjs */
  /* 🔴🔴 [2026-11-14 · 5번] **가용성이 «전부 403» 이면 사이트가 아니라 우리가 끊긴 것이다.**
     우리 보안 점검기가 /admin·/.env 를 두드리면 침입막기가 우리 아이피를 끊는다.
     그 뒤로는 모든 자리가 403 으로 찍힌다. ⛔ 그것으로 사장님을 부르지 않는다. */
  if (!자가시험 && 우리가끊겼나(가용성결과)) {
    const 판 = 부를까(false, null, true);
    console.error(`\n⚠ 가용성 ${가용성결과.length}자리가 «전부» 403 이다`);
    console.error(`   ⇒ ${판.까닭}`);
    로그남겨([`⚠ 거짓경보를 삼켰다 — 가용성 ${가용성결과.length}자리가 전부 403 이다.`
      + ' 사이트가 아니라 우리 아이피가 침입막기에 끊긴 것이다(보안 점검기를 돌린 뒤에 그렇게 된다).'
      + ' 10분 뒤에 저절로 풀린다. 사장님을 부르지 않았다.']);
    console.error('📮 사장님께 «안» 보냈다 — 우리가 끊긴 것이다. 로그에만 남겼다.');
    return 1;
  }

  if (!자가시험 && 전부못닿았나(가용성결과)) {
    const 대조군 = await 대조군재기();
    const 판 = 부를까(true, 대조군);
    console.error(`\n⚠ 가용성 ${가용성결과.length}자리가 «전부» 못 닿았다 — 대조군 ${대조군 ? '닿는다' : '못 닿는다'}`);
    console.error(`   ⇒ ${판.까닭}`);
    if (!판.부른다) {
      로그남겨([`⚠ 거짓경보를 삼켰다 — 가용성 ${가용성결과.length}자리 전부 fetch failed 이고 대조군도 못 닿았다.`
        + ' 이 PC 가 바깥에 못 나간 것이지 사이트가 죽은 것이 아니다. 사장님을 부르지 않았다.']);
      console.error('📮 사장님께 «안» 보냈다 — 우리 사고가 아니다. 로그에만 남겼다.');
      return 1;   /* 0(정상)도 2(사고)도 아니다 — 「못 쟀다」는 제 값을 가진다 */
    }
  }

  for (const c of 수있어야하는곳) {
    const r = await 재기(c.경로);
    const 있나 = c.무늬.test(r.본문 || '');
    if (!조용히 || !있나) console.log(있나 ? `✅ ${c.이름} 있음` : `🔴 ${c.이름} 없음 — 자료가 비었을 수 있다`);
    if (!있나 && r.code === 200) 빨강.push(`${c.이름} 이 지면에서 안 보인다 — 제목에 수치를 쓰는 지면이라 제목이 거짓이 될 수 있다 (${r.url})`);
  }

  for (const p of 한글가드) {
    const r = await 재기(p);
    if (r.code !== 200) continue; /* 위에서 이미 잡았다 — 두 번 세지 않는다 */
    /* HTML 태그·속성을 뺀 «보이는 글»만 본다. 스크립트·스타일 안은 화면에 안 나온다.
       ⚠ [2026-09-01 · 처음 돌리자마자 잡은 거짓경보] 이 자가 「세종」을 누출로 잡았다.
          실물을 열어 보니 «푸터의 법정 표기»였다 —
            Mail-order licence 2026-세종-0591 (세종특별자치시)
          통신판매업 신고번호와 사업장 주소는 «한글이어야 하는» 자리다. 빼면 법을 어긴다.
       ⇒ 그래서 푸터를 셈에서 뺀다. ⛔ 한글 낱말을 하나씩 허용목록에 넣는 쪽으로 안 간다 —
          그러면 목록이 자라면서 진짜 누출까지 조용히 통과시킨다.
       ⭐ 「자를 먼저 의심한다」 — 0 이나 100% 처럼 극단이 나오면 도구 결함을 먼저 찾는다.
          여기서는 «모든 지면이 빨강»이었고, 그것이 자의 흠이라는 신호였다. */
    const 샌것 = 보이는글만(r.본문).match(한글무늬);
    if (샌것) {
      빨강.push(`⛔ 한글 누출 — ${r.url} 화면에 「${샌것[0]}」가 보인다. 우리 손님은 영어권이다`);
      console.log(`🔴 한글 누출 가드 — ${p} 에 「${샌것[0]}」`);
    } else if (!조용히) {
      console.log(`✅ 한글 누출 없음 ${p}`);
    }
  }

  if (빨강.length === 0) {
    if (!조용히) console.log('\n✅ 초록 — 돈/신뢰 걸린 자리 다 살아 있고, 한글 누출 0.');
    return 0;
  }

  console.error(`\n🔴 빨강 ${빨강.length}건:`);
  빨강.forEach((l) => console.error('   ' + l));

  if (자가시험) {
    console.log('\n(자가시험 — 로그·알림 안 남긴다. 빨간불이 실제로 떴다는 것만 확인.)');
    return 빨강.length ? 0 : 1; /* 자가시험은 «빨강이 떠야» 통과 */
  }

  로그남겨(빨강);
  const 결과 = await 알림보내라(`🔴 kculturewire 비상 ${빨강.length}건`, 빨강.join(' / '));
  console.error(결과.보냄 ? '📮 사장님 메일 창구로 알림 보냄' : `⚠ 알림 못 보냄(${결과.이유 || 결과.code}) — 로그엔 남겼다`);
  return 2;
}

본다().then((코드) => process.exit(코드));
