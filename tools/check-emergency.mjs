#!/usr/bin/env node
/**
 * check-emergency.mjs — SeoulMarkets 비상벨 (1번 docs/비상벨.md 프로토콜을 이 사이트에 맞춰 복사)
 *
 * ── 왜 ─────────────────────────────────────────────────────────
 * 사장님 지시(2026-08-31): "버그가 생길 때 바로 조치할 수 있는 비상벨을 만들고, 모든
 * 유닛이 쓰게 하라." 1번이 klifemap 몫으로 원형을 만들었고, 각 유닛이 BASE·검사목록만
 * 바꿔 복사한다. 이 파일은 seoulmarkets.com 판.
 *
 * ── 무엇을 재나 (돈/신뢰가 바로 걸린 자리만 — 전부 재면 느려지고, 느리면 안 돌린다) ──
 *  ① 가용성: 홈·기사 한 편·/data·llms.txt 가 200 으로 살아 있나.
 *  ② 투자AI 노출 0 가드: 투자AI가 «공개 페이지로 새 나가지 않았나»(새 나가면 모두의창업
 *     상용화 저촉 = 사업 사고). 후보 경로가 404 이고, 홈에 노출 신호가 없어야 정상.
 *  ⛔ 방문자/실적 경보는 넣지 않는다 — 그건 GA4(2번)가 정확히 푼다. 6번은 못 판단한다.
 *
 * ── 🔴 [2026-09-10 · 5번 지시] «200 을 세지 않는다» — 오늘 klifemap 이 이 자리에서 걸렸다 ──
 * 사장님이 klifemap.ai/content 를 여니 «아직 발행된 콘텐츠가 없습니다」가 떴는데, 서버는
 * 200 을 내고 있었고 자동 검사도 초록이었다. ⇒ **상태코드만 보면 이 사고를 못 잡는다.**
 * 그래서 여기도 「보이는 글자 수」와 「비었다고 말하는 문구」를 함께 잰다 — 5번이 klifemap
 * 비상벨에 넣은 `담긴것재기()`와 같은 판정을 이 사이트에 맞춰 옮긴다.
 *
 * ── 알림 창구 ──────────────────────────────────────────────────
 * 새 채널을 안 만든다. 공용 창구(klifemap /api/owner/notify, 사장님 메일로 즉시)를 부른다.
 * 키는 env 로만 읽는다(코드/로그에 값 안 남긴다): OWNER_NOTIFY_URL · OWNER_NOTIFY_KEY
 * (없으면 SAJU_ADMIN_KEY). 키가 없으면 «메일은 못 보내지만» 빨간불을 stderr+로그로 크게
 * 남기고 exit 2 로 죽는다 — 조용히 넘어가지 않는다(신조3: 못 하면 못 한다고 적는다).
 *
 * 쓰는 법
 *   node tools/check-emergency.mjs            # 한 번 재고 끝낸다
 *   node tools/check-emergency.mjs --조용히   # 정상이면 조용히(크론용)
 *   node tools/check-emergency.mjs --자가시험 # 일부러 깨서 빨간불이 실제로 뜨는지 본다(로그 안 남김)
 */
import fs from 'node:fs';
import path from 'node:path';
import { 전부못닿았나, 우리가끊겼나, 부를까, 대조군재기, 지금시각 } from './lib/bell-offline-guard.mjs';

const 뿌리 = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1'), '..');
const 로그 = path.join(뿌리, 'docs', '비상벨.md');
const BASE = process.env.SEOULMARKETS_BASE || 'https://seoulmarkets.com';
const 조용히 = process.argv.includes('--조용히');
const 자가시험 = process.argv.includes('--자가시험') || process.argv.includes('--selftest');

// 돈/신뢰가 바로 걸린 자리 — 죽으면 손님이 못 읽거나 못 찾는 곳만.
// ⚠ 최소글자 는 «오늘 값의 반토막도 안 되는» 보수적인 문턱이다 — 실측(2026-09-10):
//   홈 51,356자 · 기사 8,525자 · /data 8,230자. 자료가 조금 줄어도 안 울리게 넉넉히 둔다.
const 검사목록 = [
  { 이름: '홈', 경로: '/', 기대: 200, 최소글자: 5000 },
  { 이름: '기사(집중도)', 경로: '/article/korea-everything-comes-down-to-four', 기대: 200, 최소글자: 2000 },
  { 이름: '데이터 허브', 경로: '/data', 기대: 200, 최소글자: 2000 },
  { 이름: 'llms.txt(AI 인용 관문)', 경로: '/llms.txt', 기대: 200, 최소글자: 5000 },
];

/** 태그를 벗겨 «보이는 글자 수»를 센다. 스크립트·스타일은 먼저 뗀다(손님 눈에 안 보인다) */
export function 보이는글자(본문) {
  return String(본문 ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim().length;
}

/**
 * «비었다」고 화면이 직접 말하는 문구. ⛔ 200 이어도 이 말이 있으면 사고다.
 *
 * 🔴 [2026-09-10 · 5번 지적] 처음 판은 klifemap 사고의 «한국어» 문구를 그대로 옮겨 왔었다.
 *   seoulmarkets 는 영문 전용 사이트라 그 문구는 여기 화면에 «절대 안 뜬다» —
 *   영원히 안 걸리는 판정이었다. src/pages/index.astro·[category].astro 를 직접 읽어
 *   «이 사이트가 실제로 쓰는» 빈 화면 문구로 갈아 끼운다.
 */
const 비어있다표현 = [
  'No articles published yet.',   // src/pages/index.astro — 홈이 통째로 비었을 때
  'Nothing filed in',             // src/pages/[category].astro — 그 갈래가 비었을 때 (뒤에 카테고리명이 붙는다)
];
export function 비었다고말하나(본문) {
  const t = String(본문 ?? '');
  return 비어있다표현.some((s) => t.includes(s));
}

// 투자AI 노출 0 가드 — 이 경로들이 «있으면» 사고. 404(또는 미존재)여야 정상.
const 투자AI_노출후보 = ['/invest-ai', '/invest', '/invest-ai/', '/trading-ai', '/투자ai'];

/* 🔴 [2026-09-21] **닿지 못한 것은 «한 번 더» 잰다.**
   그날 KCW 벨이 여섯 자리 전부 `fetch failed` 로 사장님께 「비상 6건」을 보냈고,
   4분 뒤 여섯 다 200 이었다 — 순간 끊김이었다.
   ⛔ HTTP 오류(4xx·5xx)는 다시 재지 않는다 — 서버가 «대답한» 것이라 진짜다. */
async function 재기(경로, 다시 = 1) {
  const url = BASE.replace(/\/$/, '') + 경로;
  for (let 번 = 0; ; 번++) {
    try {
      const r = await fetch(url, { redirect: 'manual', headers: { 'User-Agent': 'seoulmarkets-emergency-bell' } });
      const 본문 = r.headers.get('content-type')?.includes('text') ? await r.text().catch(() => '') : '';
      return { url, code: r.status, 본문 };
    } catch (e) {
      if (번 >= 다시) return { url, code: 0, 오류: String(e?.message ?? e), 본문: '' };
      await new Promise((r) => setTimeout(r, 2500));
    }
  }
}

async function 알림보내라(제목, 내용) {
  const notifyUrl = process.env.OWNER_NOTIFY_URL || 'https://klifemap.ai/api/owner/notify';
  const key = process.env.OWNER_NOTIFY_KEY || process.env.SAJU_ADMIN_KEY || '';
  if (!key) {
    // 키가 없다 — 메일은 못 보낸다. 조용히 넘기지 않는다.
    console.error('⛔ 알림 키(OWNER_NOTIFY_KEY/SAJU_ADMIN_KEY)가 env 에 없다 — 메일 못 보냄. 로그로만 남긴다.');
    return { 보냄: false, 이유: '키 없음' };
  }
  try {
    const r = await fetch(notifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': key },
      body: JSON.stringify({ title: 제목, text: 내용, from: 'seoulmarkets(6번)' }), // 영문 필드명(한글은 셸 인코딩 깨진 전례)
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
  const 덩이 = `\n## 🔴 seoulmarkets — ${이제}\n` + 줄들.map((l) => `- ${l}`).join('\n') + '\n';
  fs.appendFileSync(로그, 덩이);
}

async function 본다() {
  const 빨강 = [];

  const 가용성결과 = [];
  for (const c of 검사목록) {
    const 경로 = 자가시험 && c.이름 === '홈' ? '/__이경로는없다__강제빨강' : c.경로; // 자가시험: 홈을 일부러 깬다
    const r = await 재기(경로);
    가용성결과.push(r);
    const ok = r.code === c.기대;
    if (!ok) {
      if (!조용히) console.log(`🔴 ${c.이름} ${r.code || r.오류} (기대 ${c.기대})`);
      빨강.push(`${c.이름} 응답 ${r.code || r.오류} — 기대 ${c.기대} (${r.url})`);
      continue;
    }
    /* 🔴 200 이어도 여기서 끝내지 않는다 — 비어 있을 수 있다(오늘 klifemap 이 그 꼴이었다) */
    const 글자수 = 보이는글자(r.본문);
    const 비었나 = 비었다고말하나(r.본문);
    const 자가시험비움 = 자가시험 && c.이름 === '데이터 허브'; // 자가시험: 데이터 허브를 일부러 «비웠다»고 친다
    const 내용ok = !비었나 && !자가시험비움 && 글자수 >= c.최소글자;
    if (!조용히 || !내용ok) {
      console.log(내용ok
        ? `✅ ${c.이름} ${r.code} · 보이는 글자 ${글자수}자`
        : `🔴 ${c.이름} ${r.code} 인데 내용이 비었다 — 보이는 글자 ${글자수}자(문턱 ${c.최소글자})${비었나 || 자가시험비움 ? ' · 「비었다」 문구 있음' : ''}`);
    }
    if (!내용ok) {
      빨강.push(`${c.이름} 은 200 인데 화면이 비어 보인다 — 보이는 글자 ${글자수}자(문턱 ${c.최소글자})${비었나 || 자가시험비움 ? ', 비었다는 문구 있음' : ''} (${r.url})`);
    }
  }

  // 투자AI 노출 0 가드
  for (const p of 투자AI_노출후보) {
    const r = await 재기(p);
    const 노출됨 = r.code === 200; // 200 이면 공개돼 있다 = 사고
    if (노출됨) {
      빨강.push(`⛔ 투자AI 공개노출 의심 — ${r.url} 가 200 이다(모두의창업 상용화 저촉). 즉시 내려야 한다`);
      console.log(`🔴 투자AI 노출 가드 — ${p} 가 200`);
    }
  }

  /* 🔴 [2026-09-21] **가용성이 «전부» 못 닿았으면 사이트가 아니라 연결을 의심한다.**
     대조군(우리 통제 밖 주소)을 찔러 갈라 본다 — tools/lib/bell-offline-guard.mjs */
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
      return 1;
    }
  }

  if (빨강.length === 0) {
    if (!조용히) console.log('\n✅ 초록 — 돈/신뢰 걸린 자리 다 살아 있고, 투자AI 노출 0.');
    return 0;
  }

  console.error(`\n🔴 빨강 ${빨강.length}건:`);
  빨강.forEach((l) => console.error('   ' + l));

  if (자가시험) {
    console.log('\n(자가시험 — 로그·알림 안 남긴다. 빨간불이 실제로 떴다는 것만 확인.)');
    return 빨강.length ? 0 : 1; // 자가시험은 "빨강이 떠야" 통과
  }

  로그남겨(빨강);
  const 결과 = await 알림보내라(`🔴 seoulmarkets 비상 ${빨강.length}건`, 빨강.join(' / '));
  console.error(결과.보냄 ? '📮 사장님 메일 창구로 알림 보냄' : `⚠ 알림 못 보냄(${결과.이유 || 결과.code}) — 로그엔 남겼다`);
  return 2;
}

/** 순수함수 자가시험 — 네트워크 없이 판정 로직 자체를 잰다 */
function 단위시험() {
  const 것 = []; const 재다 = (이름, 됐나) => 것.push({ 이름, 됐나 });

  재다('보이는글자: 태그를 벗기고 겹공백을 하나로',
    보이는글자('<div>가  나\n다</div>') === '가 나 다'.length);
  재다('보이는글자: script·style 은 아예 뗀다(손님 눈에 안 보인다)',
    보이는글자('<style>.x{color:red}</style><script>var x=1</script><p>글</p>') === 1);
  재다('⛔ 보이는글자: 빈 것은 0', 보이는글자('') === 0 && 보이는글자(null) === 0);

  재다('🔴 비었다고말하나: seoulmarkets 가 «실제로» 쓰는 빈 홈 문구를 잡는다(klifemap 문구가 아니다)',
    비었다고말하나('<p class="empty">No articles published yet.</p>') === true);
  재다('비었다고말하나: 빈 갈래 문구(카테고리명이 뒤에 붙어도) 잡는다',
    비었다고말하나('<p class="empty">Nothing filed in FX yet.</p>') === true);
  재다('비었다고말하나: 정상 본문에는 안 걸린다',
    비었다고말하나('<p>Samsung Electronics target price raised</p>') === false);

  const 실패 = 것.filter((x) => !x.됐나);
  if (!조용히 || 실패.length) console.log(`■ 단위시험 ${것.length - 실패.length}/${것.length}`);
  for (const x of 실패) console.log(`  🔴 ${x.이름}`);
  return 실패.length === 0;
}

if (!단위시험()) { console.error('🔴 단위시험이 깨졌다 — 판정 로직을 먼저 고친다.'); process.exit(1); }

본다().then((코드) => process.exit(코드));
