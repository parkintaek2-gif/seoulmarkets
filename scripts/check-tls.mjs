#!/usr/bin/env node
/**
 * check-tls.mjs — 우리 주소들이 **브라우저에서 경고 없이 열리는지** 잰다.
 *
 * 왜 만들었나 (2026-08-07 21:3x · 2번)
 * ─────────────────────────────────────────────────────────────────────────
 * 배포가 나갔는지 보려고 kculturewire.com 을 부르다가 걸렸다.
 *
 *   kculturewire.com  →  인증서가 *.sel3.cloudtype.app 였다
 *                        = 손님 화면에 **「이 연결은 비공개가 아닙니다」** 전체 경고
 *
 * 우리는 이 사이트에 기사를 17편 올렸고 오픈이 여드레 뒤였다.
 * **아무도 몰랐다.** 우리가 `200 이 뜨나`만 쟀기 때문이다.
 * curl·fetch·Invoke-WebRequest 는 다 200 을 준다. 인증서를 안 보기 때문이다.
 *
 * 원인은 **DNS TXT 값 앞의 띄어쓰기 한 칸**이었다.
 *   [ cloudtype-space=@parkintaek2]  ← 29자 · 앞에 공백
 *   [cloudtype-space=@parkintaek2]   ← 28자 · 맞는 값
 * 눈으로는 같아 보인다. **글자 수로 재야 보인다.**
 *
 * ⛔ 그래서 이 자는 「열리나」를 재지 않는다. **「경고 없이 열리나」**를 잰다.
 *    200 은 아무것도 보장하지 않는다.
 *
 * 쓰는 법
 *   node scripts/check-tls.mjs              — 전 주소 검사 (틀리면 exit 1)
 *   node scripts/check-tls.mjs --selftest   — 자 자신을 검사
 */

import tls from 'node:tls';

/** 손님이 주소창에 칠 수 있는 것은 다 여기 있어야 한다. www 도 apex 도 둘 다 */
export const 주소들 = [
  'seoulmarkets.com',
  'www.seoulmarkets.com',
  '100yearmap.com',
  'www.100yearmap.com',
  'kculturewire.com',
  'www.kculturewire.com',
  'wiki-tip.com',
  'www.wiki-tip.com',
  'klifemap.ai',
  'www.klifemap.ai',
];

/**
 * ⛔ **여기 있는 것은 안 잰다.** 왜 안 재는지를 적어 둔다 —
 *    적어 두지 않으면 다음 사람이 「빠졌다」고 보고 다시 넣는다.
 */
export const 안재는것 = {
  'hundredyearmap.com':
    '2026-08-08 실측 — NS·SOA 가 아예 없다. **우리가 가진 도메인이 아니다.** ' +
    'server.mjs 의 SITE_PREFIX 에 이름만 남아 있는데, 사는 것을 정하기 전에는 지면이 없다. ' +
    '살 것이면 그때 이 목록에 넣는다.',
};

/** 인증서가 이 이름을 덮나. `*.a.b` 는 `c.a.b` 만 덮고 `a.b` 나 `d.c.a.b` 는 못 덮는다 */
export function 이름이덮이나(호스트, 이름목록) {
  const h = String(호스트 ?? '').toLowerCase().replace(/\.$/, '');
  if (!h) return false;
  return (이름목록 ?? []).some((raw) => {
    const n = String(raw ?? '').trim().toLowerCase().replace(/^DNS:/i, '').replace(/\.$/, '');
    if (!n) return false;
    if (n === h) return true;
    if (!n.startsWith('*.')) return false;
    const 뒤 = n.slice(2);
    if (!h.endsWith('.' + 뒤)) return false;
    // 별표는 딱 한 칸만 먹는다
    return h.slice(0, h.length - 뒤.length - 1).indexOf('.') === -1;
  });
}

/** subjectaltname 문자열을 이름 목록으로 */
export function 이름뽑기(altname) {
  return String(altname ?? '')
    .split(',')
    .map((s) => s.trim().replace(/^DNS:/i, ''))
    .filter(Boolean);
}

/** 며칠 남았나. 못 읽으면 null — 짐작하지 않는다 */
export function 남은날(valid_to, 지금 = new Date()) {
  const t = Date.parse(valid_to);
  if (Number.isNaN(t)) return null;
  return Math.floor((t - 지금.getTime()) / 86400000);
}

/**
 * ⚠ 한 곳만 보고 판정하지 않는다. TXT 앞의 공백처럼 **눈에 안 보이는 차이**가 있으므로
 *   맞는지 틀리는지를 `authorized` 한 값으로만 받지 않고 이름 목록까지 같이 남긴다.
 */
export function 판정(호스트, 결과) {
  if (결과.오류) return { 호스트, 상태: '못 붙음', 말: 결과.오류 };
  const 이름 = 이름뽑기(결과.altname);
  if (!이름이덮이나(호스트, 이름)) {
    return { 호스트, 상태: '⛔ 남의 인증서', 말: `이 이름이 안 들어 있다 → ${이름.join(', ') || '(없음)'}` };
  }
  const d = 남은날(결과.valid_to);
  if (d !== null && d < 0) return { 호스트, 상태: '⛔ 만료', 말: `${-d}일 지났다` };
  if (d !== null && d < 14) return { 호스트, 상태: '⚠ 곧 만료', 말: `${d}일 남았다` };
  if (!결과.authorized) return { 호스트, 상태: '⛔ 못 믿음', 말: 결과.사유 || '알 수 없음' };
  return { 호스트, 상태: '✅', 말: d === null ? '' : `${d}일 남음` };
}

function 재기(호스트, 시간 = 15000) {
  return new Promise((resolve) => {
    const s = tls.connect(
      { host: 호스트, port: 443, servername: 호스트, rejectUnauthorized: false, timeout: 시간 },
      () => {
        const c = s.getPeerCertificate();
        resolve({
          authorized: s.authorized,
          사유: s.authorizationError ? String(s.authorizationError) : '',
          altname: c?.subjectaltname ?? '',
          valid_to: c?.valid_to ?? '',
        });
        s.end();
      },
    );
    s.on('error', (e) => resolve({ 오류: e.code || e.message }));
    s.on('timeout', () => { s.destroy(); resolve({ 오류: '시간초과' }); });
  });
}

function 셀프테스트() {
  const 검사 = [];
  const 확인 = (이름, 실제, 기대) => 검사.push({ 이름, 통과: JSON.stringify(실제) === JSON.stringify(기대), 실제, 기대 });

  확인('제 이름은 덮인다', 이름이덮이나('a.com', ['a.com']), true);
  확인('다른 이름은 안 덮인다', 이름이덮이나('a.com', ['b.com']), false);
  확인('별표는 한 칸을 덮는다', 이름이덮이나('www.a.com', ['*.a.com']), true);
  확인('⭐ 별표는 apex 를 못 덮는다', 이름이덮이나('a.com', ['*.a.com']), false);
  확인('별표는 두 칸을 못 덮는다', 이름이덮이나('x.y.a.com', ['*.a.com']), false);
  확인('⭐ 오늘 걸린 그 꼴', 이름이덮이나('kculturewire.com', ['*.sel3.cloudtype.app']), false);
  확인('대소문자는 같게 본다', 이름이덮이나('A.com', ['a.COM']), true);
  확인('끝 점은 같게 본다', 이름이덮이나('a.com.', ['a.com']), true);
  확인('빈 호스트는 거짓', 이름이덮이나('', ['a.com']), false);
  확인('빈 목록은 거짓', 이름이덮이나('a.com', []), false);
  확인('DNS: 접두사를 뗀다', 이름뽑기('DNS:a.com, DNS:*.a.com'), ['a.com', '*.a.com']);
  확인('빈 값은 빈 목록', 이름뽑기(''), []);
  확인('남은날', 남은날('Aug 20 00:00:00 2026 GMT', new Date('2026-08-07T00:00:00Z')), 13);
  확인('⭐ 못 읽으면 null — 짐작하지 않는다', 남은날('아무말'), null);
  확인('지난 것은 음수', 남은날('Aug 1 00:00:00 2026 GMT', new Date('2026-08-07T00:00:00Z')), -6);
  확인('판정 · 남의 인증서', 판정('a.com', { authorized: false, altname: 'DNS:*.b.com' }).상태, '⛔ 남의 인증서');
  확인('판정 · 못 붙음', 판정('a.com', { 오류: 'ENOTFOUND' }).상태, '못 붙음');
  /* 🔴 [2026-11-18] 여기에 'Dec 1 00:00:00 2026 GMT' 라고 «고정 날짜»를 박아 두었더니
     그 날이 다가오면서 남은 날이 14일 밑으로 떨어져 시험 둘이 저절로 깨졌다
     (11-18 기준 13일 남음 → 「⚠ 곧 만료」). 묶음 124개 가운데 이 하나가 날마다
     빨강이었고, 그 빨강이 **진짜 빨강을 가리고 있었다.**
     ⇒ 날짜를 오늘에서 세어 짓는다. 시험은 시계가 가도 같은 것을 재야 한다. */
  const 먼앞날 = (일) => new Date(Date.now() + 일 * 86400000).toUTCString().replace(/^\w+, /, '');
  확인(
    '판정 · 정상',
    판정('a.com', { authorized: true, altname: 'DNS:a.com', valid_to: 먼앞날(90) }).상태,
    '✅',
  );
  확인('⭐ 이름이 맞아도 안 믿기면 통과가 아니다', 판정('a.com', { authorized: false, altname: 'DNS:a.com', valid_to: 먼앞날(90) }).상태, '⛔ 못 믿음');
  /* ⭐ 「곧 만료」 자리도 고정 날짜 없이 잰다 — 이 칸이 비어 있어 위 둘이 깨진 것을 못 봤다 */
  확인('열흘 남으면 곧 만료다', 판정('a.com', { authorized: true, altname: 'DNS:a.com', valid_to: 먼앞날(10) }).상태, '⚠ 곧 만료');
  확인('⭐ 곧 만료가 못 믿음보다 먼저다', 판정('a.com', { authorized: false, altname: 'DNS:a.com', valid_to: 먼앞날(10) }).상태, '⚠ 곧 만료');
  확인('주소 목록에 apex 와 www 가 둘 다 있다', 주소들.includes('kculturewire.com') && 주소들.includes('www.kculturewire.com'), true);

  for (const c of 검사) console.log(`${c.통과 ? '✅' : '⛔'} ${c.이름}${c.통과 ? '' : `\n     받은 것 ${JSON.stringify(c.실제)}\n     기대 ${JSON.stringify(c.기대)}`}`);
  const 실패 = 검사.filter((c) => !c.통과).length;
  console.log(`\n검사 ${검사.length}개 · 실패 ${실패}개`);
  process.exit(실패 ? 1 : 0);
}

async function 본일() {
  console.log('우리 주소가 **경고 없이** 열리는지 잰다 (200 이 뜨는지가 아니다)\n');
  const 결과 = [];
  for (const h of 주소들) 결과.push(판정(h, await 재기(h)));

  for (const r of 결과) console.log(`  ${r.상태.padEnd(9)} ${r.호스트.padEnd(24)} ${r.말}`);

  const 나쁜 = 결과.filter((r) => r.상태.startsWith('⛔'));
  const 못붙음 = 결과.filter((r) => r.상태 === '못 붙음');
  console.log('');
  if (나쁜.length) {
    console.log(`⛔ **손님 화면에 경고가 뜨는 주소 ${나쁜.length}개.** 이건 「안 열린다」와 같다.`);
    console.log('   Cloudtype 연결 목록에 그 이름이 있는지 · DNS TXT 값에 **앞뒤 공백이 없는지** 본다.');
    console.log('   (2026-08-07 에 걸린 것이 TXT 앞의 공백 한 칸이었다)');
  }
  if (못붙음.length) console.log(`⚠ 못 붙은 주소 ${못붙음.length}개 — 안 쓰는 주소면 목록에서 뺀다.`);
  if (!나쁜.length && !못붙음.length) console.log('✅ 전부 경고 없이 열린다.');
  process.exit(나쁜.length ? 1 : 0);
}

if (process.argv.includes('--selftest')) 셀프테스트();
else await 본일();
