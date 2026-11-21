#!/usr/bin/env node
/**
 * measure-kcw-trend.mjs — **「효과가 조금씩 나타나나」에 숫자로 답한다.** (주 단위)
 *
 * ── 🔴 왜 만드나 (2026-08-31 · 5번) ──────────────────────────
 * 사장님이 물으셨다 — 「**K Culture Wire 방문자를 늘리는 일 >>> 효과가 조금씩 나타나?**」
 * ⛔ 이 물음에 「좋아지고 있습니다」로 답하면 안 된다. 그건 느낌이지 답이 아니다.
 * ⛔ 하루치 수를 들어 보이는 것도 안 된다 — 하루는 요일 하나에 흔들린다.
 * ⇒ **주 단위**로 놓고, 앞뒤 주를 나란히 보여 준다. 오르내림은 사장님이 보고 판단하신다.
 *
 * ── ⚠ 이 자가 «먼저» 말하는 것 ───────────────────────────────
 * ⚠ 구글은 사흘 늦다. **마지막 사흘은 아예 안 센다** — 덜 찬 주를 「떨어졌다」로 읽으면 안 된다.
 * ⚠ 노출·클릭은 «구글 검색»만이다. AI 답변을 타고 온 사람은 여기 없다.
 * ⛔ 못 잰 주를  「못 쟀다」로 적는다.
 * ⛔ 클릭이 한 자리 수인 구간에서 «변화율»을 말하지 않는다 — 3에서 6이 「두 배」가 아니다.
 *
 * 쓰는 법
 *   node scripts/measure-kcw-trend.mjs --자가시험
 *   node scripts/measure-kcw-trend.mjs [--주 8]
 */
import { readFileSync, existsSync } from 'node:fs';
import { createSign } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/*
 * ⚠ [2026-08-31] `.env` 를 읽는 이 대여섯 줄을 빼먹으면 **열쇠가 있는데도 「없다」**가 난다.
 *   8/30 에 `check-google-indexed.mjs` 가 같은 자리에서 「못 물었다」를 내고 있었고,
 *   오늘 이 자를 새로 만들면서 **또 빠뜨렸다.** 자를 새로 세울 때마다 되풀이되는 자리다.
 * ⛔ 「키가 없다」와 「키를 안 읽었다」는 다른 말이다. 뒤엣것을 앞엣것으로 적으면 안 된다.
 */
(function 환경파일읽기() {
  try {
    for (const 줄 of readFileSync(path.join(뿌리, '.env'), 'utf8').split(/\r?\n/)) {
      const m = 줄.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  } catch { /* 없으면 정상 */ }
})();

export const 사이트 = 'sc-domain:kculturewire.com';

/** 날짜를 YYYY-MM-DD 로. ⛔ 시간대를 흘리지 않는다 — 한국시각으로 적는다 */
export const 날 = (d) => new Date(d).toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' }).slice(0, 10);

/**
 * 주 경계를 만든다. 최근 것이 먼저.
 * ⚠ `끝` 은 «이미 사흘 물린» 날이어야 한다 — 여기서 다시 물리지 않는다(두 번 물리면 자료를 잃는다).
 */
export function 주나누기(끝, 주수) {
  if (!끝 || !Number.isFinite(주수) || 주수 < 1) return null;
  const 밀리 = 864e5;
  const 끝날 = new Date(`${날(끝)}T00:00:00+09:00`).getTime();
  const 것 = [];
  for (let i = 0; i < 주수; i += 1) {
    const b = 끝날 - i * 7 * 밀리;
    것.push({ 시작: 날(b - 6 * 밀리), 끝: 날(b) });
  }
  return 것;
}

/**
 * 「올랐나」를 말한다. ⛔ 작은 수에서 «몇 배»를 말하지 않는다.
 * @returns {{말:string, 방향:'up'|'down'|'flat'|'모름'}}
 */
export function 견주기(이번, 지난, 작은수 = 10) {
  if (!Number.isFinite(이번) || !Number.isFinite(지난)) return { 말: '못 쟀다', 방향: '모름' };
  const 차 = 이번 - 지난;
  if (차 === 0) return { 말: '그대로', 방향: 'flat' };
  const 방향 = 차 > 0 ? 'up' : 'down';
  /* ⛔ 3 → 6 을 「두 배」라고 하지 않는다. 그 자리에서 배수는 뜻이 없다 */
  if (이번 < 작은수 || 지난 < 작은수) return { 말: `${차 > 0 ? '+' : ''}${차} (수가 작다 — 배수로 말하지 않는다)`, 방향 };
  const 퍼센트 = Math.round((차 / 지난) * 100);
  return { 말: `${차 > 0 ? '+' : ''}${차} (${퍼센트 > 0 ? '+' : ''}${퍼센트}%)`, 방향 };
}

/* ── 자가시험 ───────────────────────────────────────────────── */
export function 자가시험() {
  const 실패 = [];
  const 검 = (이름, 참) => { if (!참) 실패.push(이름); };

  const 주 = 주나누기('2026-08-28', 3);
  검('주를 셋 만든다', 주.length === 3);
  검('첫 주가 이레다', 주[0].시작 === '2026-08-22' && 주[0].끝 === '2026-08-28');
  검('그 앞 주가 이어 붙는다', 주[1].끝 === '2026-08-21' && 주[1].시작 === '2026-08-15');
  검('⛔ 주 사이에 틈이 없다', new Date(주[0].시작) - new Date(주[1].끝) === 864e5);
  검('⛔ 못 쓸 값이면 null', 주나누기(null, 3) === null && 주나누기('2026-08-28', 0) === null);

  검('오른 것을 오른다고 한다', 견주기(120, 100).방향 === 'up');
  검('내린 것을 내렸다고 한다', 견주기(80, 100).방향 === 'down');
  검('같으면 그대로', 견주기(100, 100).방향 === 'flat');
  검('큰 수에서는 퍼센트를 쓴다', 견주기(120, 100).말.includes('+20%'));
  검('⛔ 작은 수에서 배수·퍼센트를 말하지 않는다', 견주기(6, 3).말.includes('배수로 말하지 않는다'));
  검('⛔ 작은 수여도 «차»는 말한다', 견주기(6, 3).말.includes('+3'));
  검('⛔ 못 쟀으면 「못 쟀다」 — 0 이 아니다', 견주기(null, 100).방향 === '모름');

  검('날짜를 한국시각으로 적는다', 날('2026-08-31T20:00:00+09:00') === '2026-08-31');

  return 실패;
}

const 내가실행됐다 = process.argv[1]
  && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (내가실행됐다 && process.argv.includes('--자가시험')) {
  const 실패 = 자가시험();
  if (실패.length) {
    console.error(`❌ 자가시험 실패 ${실패.length}\n${실패.map((s) => `   · ${s}`).join('\n')}`);
    process.exit(1);
  }
  console.log('✅ 추세 재는 자 — 자가시험 13 통과');
  process.exit(0);
}

if (내가실행됐다) {
  const 주수 = Number(process.argv[process.argv.indexOf('--주') + 1]) || 8;
  const 키파일 = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!키파일 || !existsSync(키파일)) { console.log('⚠ 서비스 계정 키파일이 없다 — **못 쟀다.**'); process.exit(1); }
  const 키 = JSON.parse(readFileSync(키파일, 'utf8'));
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const 이제초 = Math.floor(Date.now() / 1000);
  const 머리 = b64({ alg: 'RS256', typ: 'JWT' });
  const 몸 = b64({
    iss: 키.client_email,
    scope: 'https://www.googleapis.com/auth/webmasters.readonly',
    aud: 'https://oauth2.googleapis.com/token', iat: 이제초, exp: 이제초 + 3600,
  });
  const 서명 = createSign('RSA-SHA256').update(`${머리}.${몸}`).sign(키.private_key, 'base64url');
  const 토큰답 = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${머리}.${몸}.${서명}`,
    }),
  }).then((r) => r.json());
  if (!토큰답.access_token) { console.log('🔴 토큰을 못 받았다 — **못 쟀다.**'); process.exit(1); }

  /* ⚠ 구글이 마지막 사흘을 덜 채운다. 여기서 «한 번만» 민다 */
  const 끝 = new Date(Date.now() - 3 * 864e5);
  const 주들 = 주나누기(끝, 주수);

  console.log('■ K Culture Wire — 구글 검색에서 «주»마다 얼마나 보였나');
  console.log(`  ${주들[주들.length - 1].시작} ~ ${주들[0].끝} · ${주수}주`);
  console.log('  ⚠ 마지막 사흘은 구글이 아직 안 준다 — 여기 없다. 없다고 「떨어졌다」로 읽지 않는다.');
  console.log('  ⚠ 구글 검색만이다. AI 답변을 타고 온 사람은 이 표에 «없다».\n');

  const 잰것 = [];
  for (const w of [...주들].reverse()) {
    const 답 = await fetch(
      `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(사이트)}/searchAnalytics/query`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${토큰답.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate: w.시작, endDate: w.끝, type: 'web', dimensions: [], rowLimit: 1 }),
      },
    ).then((r) => r.json());
    const r = (답.rows ?? [])[0];
    잰것.push({
      ...w,
      노출: r ? r.impressions : null,
      클릭: r ? r.clicks : null,
      순위: r ? r.position : null,
    });
  }

  console.log('  주                        노출    클릭   가운데순위');
  for (let i = 0; i < 잰것.length; i += 1) {
    const c = 잰것[i];
    const 앞 = i > 0 ? 잰것[i - 1] : null;
    const 견 = 앞 ? 견주기(c.노출, 앞.노출) : null;
    console.log(`  ${c.시작} ~ ${c.끝}   ${String(c.노출 ?? '못 쟀다').padStart(5)}  ${String(c.클릭 ?? '-').padStart(5)}`
      + `   ${c.순위 === null ? '  못 쟀다' : c.순위.toFixed(1).padStart(7)}`
      + (견 ? `   노출 ${견.말}` : ''));
  }

  const 쓸것 = 잰것.filter((x) => x.노출 !== null);
  if (쓸것.length < 2) { console.log('\n⬜ **못 쟀다** — 견줄 주가 모자란다'); process.exit(0); }
  const 앞절반 = 쓸것.slice(0, Math.floor(쓸것.length / 2));
  const 뒷절반 = 쓸것.slice(Math.ceil(쓸것.length / 2));
  const 합 = (a, k) => a.reduce((n, x) => n + x[k], 0);
  console.log('\n  ── 앞절반 대 뒷절반 ─────────────────────────────');
  console.log(`  앞 ${앞절반.length}주   노출 ${합(앞절반, '노출')} · 클릭 ${합(앞절반, '클릭')}`);
  console.log(`  뒤 ${뒷절반.length}주   노출 ${합(뒷절반, '노출')} · 클릭 ${합(뒷절반, '클릭')}`
    + `   → ${견주기(합(뒷절반, '노출'), 합(앞절반, '노출')).말}`);
  console.log('\n⛔ 이 표는 «구글이 우리를 몇 번 보여 줬나»다. 방문자 수가 아니다.');
  console.log('   방문자는 measure-real-readers.mjs 로 따로 잰다 — 두 수를 더하지 않는다.');
}
