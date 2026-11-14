#!/usr/bin/env node
/**
 * check-emergency-100yearmap.mjs — 100yearmap 비상벨 (1번 docs/비상벨.md 프로토콜을 이 사이트에 맞춰 복사)
 *
 * ── 왜 ─────────────────────────────────────────────────────────
 * 사장님 지시(2026-08-31 원형, 2026-09-01 전체공지로 재확인 — "모든 세션 잘 작동하는지
 * 확인하라"): "버그가 생길 때 바로 조치할 수 있는 비상벨을 만들고, 모든 유닛이 쓰게
 * 하라." 6번이 seoulmarkets 판(tools/check-emergency.mjs)을 먼저 만들었다 — 그 틀을
 * BASE·검사목록만 바꿔 그대로 복사한다(새로 짓지 않는다).
 *
 * ── 무엇을 재나 (돈/신뢰가 바로 걸린 자리만) ──────────────────────
 *  ① 가용성: 홈·값 지면(/price)·데이터 허브(/data)·llms.txt 가 200 으로 살아 있나.
 *  ② 결제 시작점: /price 화면에 실제 가격 글자(9,900원)가 있나 — 값이 사라지면
 *     "곧 엽니다"로 되돌아간 사고(8/31 실제로 겪음)와 같은 종류다.
 *  ③ 사이트맵 살아 있나 — 죽으면 구글이 새 지면을 못 찾는다(느리게 도는 사고라
 *     비상벨보다는 2시간 체크리스트 몫이지만, 200 인지 정도는 여기서도 가볍게 본다).
 *  ⛔ 방문자/실적 경보는 넣지 않는다 — 그건 GA4가 정확히 푼다. 이 자는 못 잰다.
 *
 * ── 알림 창구 ──────────────────────────────────────────────────
 * 새 채널을 안 만든다. 공용 창구(klifemap /api/owner/notify, 사장님 메일로 즉시)를 부른다.
 * 키는 env 로만 읽는다: OWNER_NOTIFY_URL · OWNER_NOTIFY_KEY(없으면 SAJU_ADMIN_KEY).
 * 키가 없으면 「메일은 못 보내지만」 빨간불을 stderr+로그로 크게 남기고 exit 2 로 죽는다.
 *
 * 쓰는 법
 *   node tools/check-emergency-100yearmap.mjs            # 한 번 재고 끝낸다
 *   node tools/check-emergency-100yearmap.mjs --조용히   # 정상이면 조용히(크론용)
 *   node tools/check-emergency-100yearmap.mjs --자가시험 # 일부러 깨서 빨간불이 실제로 뜨는지 본다(로그 안 남김)
 */
import fs from 'node:fs';
import path from 'node:path';
import { 전부못닿았나, 우리가끊겼나, 부를까, 대조군재기, 지금시각 } from './lib/bell-offline-guard.mjs';

const 뿌리 = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1'), '..');
const 로그 = path.join(뿌리, 'docs', '비상벨.md');
const BASE = process.env.HUNDREDYEARMAP_BASE || 'https://100yearmap.com';
const 조용히 = process.argv.includes('--조용히');
const 자가시험 = process.argv.includes('--자가시험') || process.argv.includes('--selftest');

// 돈/신뢰가 바로 걸린 자리 — 죽으면 손님이 못 읽거나 못 사거나 못 찾는 곳만.
const 검사목록 = [
  { 이름: '홈', 경로: '/', 기대: 200 },
  /* 🔴🔴 [2026-11-13 · 5번] **「/price 가 200 이어야 한다」는 낡은 기대였다.**
     2026-11-10 에 사장님 「유료지역 리포트 없애라고 전에 말했잖아」로 값 페이지를 내렸고,
     `server.mjs` 의 사라진 페이지 표가 `/100y/price` → `/region` 으로 301 을 건다.
     그런데 **이 자리만 안 고쳐서** 매시 40분마다 거짓 경보가 쌓였다(11-13 하루에만 9회).
     ⛔ 거짓 경보를 그냥 두면 진짜 경보가 묻힌다 — 내린 날 이 표도 같이 고쳤어야 했다.
     ⭐ 내리는 일은 네 자리다 — 카탈로그 · 사이트맵 · 301 표 · **그 페이지를 지키던 검사**. */
  { 이름: '내린 값 페이지(/price → /region)', 경로: '/price', 기대: 301, 보낼곳: '/region' },
  { 이름: '지역 입구(/region)', 경로: '/region', 기대: 200 },
  { 이름: '데이터 허브', 경로: '/data', 기대: 200 },
  { 이름: 'llms.txt(AI 인용 관문)', 경로: '/llms.txt', 기대: 200 },
  { 이름: '사이트맵', 경로: '/sitemap.xml', 기대: 200 },
];

/* 🔴 [2026-11-13] 지킬 것이 **뒤집혔다.** 전에는 「값 글자가 있어야 한다」였는데,
   지역 한 벌은 2026-09-10 부터 무료다 — 이제는 **값 글자가 다시 보이면 안 된다.**
   안 받는 값을 적어 두면 손님에게는 거짓말이고 광고 심사에도 걸린다. */
const 안받는값_글자 = '9,900';

/* 🔴 [2026-09-21] **닿지 못한 것은 «한 번 더» 잰다.**
   그날 KCW 벨이 여섯 자리 전부 `fetch failed` 로 사장님께 「비상 6건」을 보냈고,
   4분 뒤 여섯 다 200 이었다 — 순간 끊김이었다.
   ⛔ HTTP 오류(4xx·5xx)는 다시 재지 않는다 — 서버가 «대답한» 것이라 진짜다. */
async function 재기(경로, 다시 = 1) {
  const url = BASE.replace(/\/$/, '') + 경로;
  for (let 번 = 0; ; 번++) {
    try {
      const r = await fetch(url, { redirect: 'manual', headers: { 'User-Agent': '100yearmap-emergency-bell' } });
      const 본문 = r.headers.get('content-type')?.includes('text') ? await r.text().catch(() => '') : '';
      /* 🔴 [2026-11-13] 301 을 기대하는 자리가 생겼다 — 보내는 곳까지 봐야 「바르게 옮겼나」를 안다 */
      return { url, code: r.status, 본문, 보낼곳: r.headers.get('location') || '' };
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
    console.error('⛔ 알림 키(OWNER_NOTIFY_KEY/SAJU_ADMIN_KEY)가 env 에 없다 — 메일 못 보냄. 로그로만 남긴다.');
    return { 보냄: false, 이유: '키 없음' };
  }
  try {
    const r = await fetch(notifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': key },
      body: JSON.stringify({ title: 제목, text: 내용, from: '100yearmap(3번)' }), // 영문 필드명(한글은 셸 인코딩 깨진 전례)
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
  const 덩이 = `\n## 🔴 100yearmap — ${이제}\n` + 줄들.map((l) => `- ${l}`).join('\n') + '\n';
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
    if (!조용히 || !ok) console.log(ok ? `✅ ${c.이름} ${r.code}` : `🔴 ${c.이름} ${r.code || r.오류} (기대 ${c.기대})`);
    if (!ok) 빨강.push(`${c.이름} 응답 ${r.code || r.오류} — 기대 ${c.기대} (${r.url})`);

    /* 🔴 [2026-11-13] 내린 페이지는 **보내는 곳까지** 본다 —
       301 만 맞고 엉뚱한 데로 보내면 손님이 길을 잃는데 이 검사는 초록으로 남는다 */
    if (c.보낼곳 && ok && r.보낼곳 !== c.보낼곳) {
      console.log(`🔴 ${c.이름} 이 ${r.보낼곳 || '(빈 Location)'} 으로 보낸다 — 기대 ${c.보낼곳}`);
      빨강.push(`${c.이름} 이 ${r.보낼곳 || '(빈 Location)'} 으로 보낸다 — 기대 ${c.보낼곳} (${r.url})`);
    }

    /* 🔴 [2026-11-13] 지킴이 뒤집혔다 — 안 받는 값이 **다시 보이면** 빨강이다.
       예전 글자 검사(「9,900 이 있어야 한다」)를 그대로 뒀으면 내린 뒤에도 매시 울렸다. */
    if (c.이름 === '지역 입구(/region)' && ok) {
      const 값이살아났나 = 자가시험 ? false : r.본문.includes(안받는값_글자);
      if (!조용히 || 값이살아났나) {
        console.log(값이살아났나
          ? `🔴 지역 입구에 안 받는 값(${안받는값_글자})이 다시 보인다`
          : `✅ 지역 입구에 안 받는 값(${안받는값_글자}) 글자가 없다`);
      }
      if (값이살아났나) {
        빨강.push(`/region 에 안 받는 값 글자(${안받는값_글자})가 다시 보인다 — 2026-11-10 에 내린 값이다 (${r.url})`);
      }
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
    if (!조용히) console.log('\n✅ 초록 — 돈/신뢰 걸린 자리 다 살아 있고, 내린 값 페이지도 /region 으로 바르게 보낸다.');
    return 0;
  }

  console.error(`\n🔴 빨강 ${빨강.length}건:`);
  빨강.forEach((l) => console.error('   ' + l));

  if (자가시험) {
    console.log('\n(자가시험 — 로그·알림 안 남긴다. 빨간불이 실제로 떴다는 것만 확인.)');
    return 빨강.length ? 0 : 1; // 자가시험은 "빨강이 떠야" 통과
  }

  로그남겨(빨강);
  const 결과 = await 알림보내라(`🔴 100yearmap 비상 ${빨강.length}건`, 빨강.join(' / '));
  console.error(결과.보냄 ? '📮 사장님 메일 창구로 알림 보냄' : `⚠ 알림 못 보냄(${결과.이유 || 결과.code}) — 로그엔 남겼다`);
  return 2;
}

본다().then((코드) => process.exit(코드));
