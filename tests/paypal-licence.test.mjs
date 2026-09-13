/**
 * paypal-licence.test.mjs — **달러 결제가 «새지 않는가»를 잰다.**
 * ─────────────────────────────────────────────────────────────────────────
 * 사장님 지시 (2026-09-13): 「페이팔 등 국적불문 결제 … 나머진 알아서 꼼꼼하게 살펴서
 * 합리적인 전략아래 **세심하게 오휴없이 구현**해라」
 *
 * 여기서 막는 것은 «돈이 새는 길» 넷이다 —
 *   ① 손님이 보낸 금액으로 파는 것          ($2,990 짜리를 $0.01 에 사 간다)
 *   ② 승인 안 된 주문으로 파일을 받는 것
 *   ③ 통화가 다른데 통과시키는 것            (KRW 990 로 결제하고 $990 짜리를 받는다)
 *   ④ '990.0' 과 '990.00' 을 다르다고 막는 것 (살 수 있는 사람을 못 사게 한다)
 *
 * ⛔ 「아마 맞겠지」로 두지 않는다. 값이 오가는 자리는 검사로 못 박는다.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { 상품, 상품찾기, 값글 } from '../src/data/licence-products.mjs';
import { 센트, 승인읽기, 켜졌나, 진짜돈인가, 밑주소, 화면에낼것, _토큰비우기 } from '../src/lib/paypal.mjs';

/* ── 상품표 ───────────────────────────────────────────────── */

test('상품표: 값이 전부 달러이고 소수점 두 자리다 — 페이팔이 요구하는 꼴', () => {
  for (const [코드, s] of Object.entries(상품)) {
    assert.match(s.usd, /^\d+\.\d{2}$/, 코드 + ' 의 값이 «달러 두 자리» 꼴이 아니다: ' + s.usd);
    assert.equal(s.코드, 코드, '코드와 열쇠가 어긋난다: ' + 코드);
  }
});

test('상품표: 기간이 «월·연·1회» 가운데 하나로 반드시 적혀 있다 (사장님: 명확히 해라)', () => {
  for (const [코드, s] of Object.entries(상품)) {
    assert.ok(['one-time', 'year', 'month'].includes(s.기간), 코드 + ' 의 기간이 없다/모른다: ' + s.기간);
    assert.ok(s.기간글 && s.기간글.length > 2, 코드 + ' 의 «화면에 낼 기간 글»이 없다');
  }
});

test('🔴 상품표: 원화(KRW·원)가 한 글자도 없다 — 사장님: 달러로만 기재해야지', () => {
  const 글 = JSON.stringify(상품);
  assert.ok(!/KRW/.test(글), '상품표에 KRW 가 남아 있다');
  assert.ok(!/[0-9]\s*원/.test(글), '상품표에 「원」 표기가 남아 있다');
});

test('상품찾기: 모르는 코드를 «기본값»으로 팔지 않는다', () => {
  assert.equal(상품찾기('없는것'), null);
  assert.equal(상품찾기(''), null);
  assert.equal(상품찾기(null), null);
  assert.equal(상품찾기(undefined), null);
  assert.equal(상품찾기('single').코드, 'single');
  assert.equal(상품찾기('  SINGLE  ').코드, 'single', '앞뒤 빈칸과 대문자도 같은 상품이다');
});

test('값글: 화면에 내는 값에 달러 기호가 하나만 붙는다', () => {
  assert.equal(값글(상품.single), '$990');
  assert.equal(값글(상품.all), '$2,990');
  assert.equal(값글(상품.academic), '$79');
});

/* ── 센트 ─────────────────────────────────────────────────── */

test('센트: 문자열 값을 정수로 바꾼다 — 부동소수로 비교하지 않는다', () => {
  assert.equal(센트('990.00'), 99000);
  assert.equal(센트('990.0'), 99000, "'990.0' 과 '990.00' 은 같은 돈이다");
  assert.equal(센트('990'), 99000);
  assert.equal(센트('0.01'), 1);
  assert.equal(센트('2990.00'), 299000);
});

test('센트: 돈이 아닌 것은 NaN — 통과시키지 않는다', () => {
  assert.ok(Number.isNaN(센트('abc')));
  assert.ok(Number.isNaN(센트('')));
  assert.ok(Number.isNaN(센트(null)));
  assert.ok(Number.isNaN(센트('-1.00')), '음수 금액을 받지 않는다');
  assert.ok(Number.isNaN(센트('1.234')), '센트보다 잘게 쪼갠 값을 받지 않는다');
});

/* ── 승인읽기 — 돈이 새는 네 길을 막는다 ───────────────────── */

const 잘된답 = (값, 통화 = 'USD') => ({
  status: 'COMPLETED',
  purchase_units: [{ payments: { captures: [{ id: 'CAP1', status: 'COMPLETED', amount: { currency_code: 통화, value: 값 } }] } }],
});

test('✅ 값과 통화가 맞으면 통과한다', () => {
  const r = 승인읽기(잘된답('990.00'), 상품.single);
  assert.equal(r.ok, true);
  assert.equal(r.결제번호, 'CAP1');
});

test("✅ '990.0' 처럼 자릿수만 달라도 통과한다 — 살 수 있는 사람을 막지 않는다", () => {
  assert.equal(승인읽기(잘된답('990.0'), 상품.single).ok, true);
  assert.equal(승인읽기(잘된답('990'), 상품.single).ok, true);
});

test('🔴 ① 금액이 적으면 막는다 — $2,990 짜리를 $0.01 로 사 갈 수 없다', () => {
  const r = 승인읽기(잘된답('0.01'), 상품.all);
  assert.equal(r.ok, false);
  assert.match(r.왜, /wrong amount/);
});

test('🔴 ② 승인이 안 끝났으면 막는다', () => {
  assert.equal(승인읽기({ status: 'CREATED' }, 상품.single).ok, false);
  assert.equal(승인읽기({ status: 'APPROVED' }, 상품.single).ok, false);
  assert.equal(승인읽기(null, 상품.single).ok, false);
  assert.equal(승인읽기({}, 상품.single).ok, false);
});

test('🔴 ② 겉은 COMPLETED 인데 «잡힌 돈»이 없으면 막는다', () => {
  assert.equal(승인읽기({ status: 'COMPLETED', purchase_units: [] }, 상품.single).ok, false);
  assert.equal(승인읽기({ status: 'COMPLETED', purchase_units: [{ payments: { captures: [] } }] }, 상품.single).ok, false);
  const 미완 = { status: 'COMPLETED', purchase_units: [{ payments: { captures: [{ id: 'C', status: 'PENDING', amount: { currency_code: 'USD', value: '990.00' } }] } }] };
  assert.equal(승인읽기(미완, 상품.single).ok, false, 'capture 가 PENDING 이면 아직 받은 돈이 아니다');
});

test('🔴 ③ 통화가 다르면 막는다 — KRW 990 으로 $990 짜리를 못 산다', () => {
  const r = 승인읽기(잘된답('990.00', 'KRW'), 상품.single);
  assert.equal(r.ok, false);
  assert.match(r.왜, /wrong currency/);
});

test('🔴 상품을 안 주면 막는다 — 「무엇을 샀는지 모르는 결제」를 통과시키지 않는다', () => {
  assert.equal(승인읽기(잘된답('990.00'), null).ok, false);
});

test('🔴 다른 상품 값으로는 통과 못 한다 — $79 내고 $2,990 짜리를 못 받는다', () => {
  assert.equal(승인읽기(잘된답(상품.academic.usd), 상품.all).ok, false);
  assert.equal(승인읽기(잘된답(상품.single.usd), 상품.all).ok, false);
});

/* ── 열쇠가 없을 때 — 되는 척하지 않는다 ─────────────────── */

test('⛔ 열쇠가 없으면 꺼진 것으로 본다. 화면에 결제 단추를 내지 않는다', () => {
  const 옛 = { id: process.env.PAYPAL_CLIENT_ID, s: process.env.PAYPAL_SECRET, m: process.env.PAYPAL_MODE };
  try {
    delete process.env.PAYPAL_CLIENT_ID; delete process.env.PAYPAL_SECRET;
    _토큰비우기();
    assert.equal(켜졌나(), false);
    assert.equal(화면에낼것().enabled, false);
    assert.equal(화면에낼것().clientId, null);
  } finally {
    if (옛.id) process.env.PAYPAL_CLIENT_ID = 옛.id; if (옛.s) process.env.PAYPAL_SECRET = 옛.s;
    if (옛.m) process.env.PAYPAL_MODE = 옛.m; _토큰비우기();
  }
});

test('⛔ 시크릿은 화면에 나가는 것에 «절대» 담기지 않는다', () => {
  const 옛 = { id: process.env.PAYPAL_CLIENT_ID, s: process.env.PAYPAL_SECRET };
  try {
    process.env.PAYPAL_CLIENT_ID = 'CID_TEST'; process.env.PAYPAL_SECRET = 'SECRET_MUST_NOT_LEAK';
    _토큰비우기();
    const 글 = JSON.stringify(화면에낼것());
    assert.ok(!글.includes('SECRET_MUST_NOT_LEAK'), '시크릿이 화면으로 새고 있다');
    assert.ok(글.includes('CID_TEST'), 'clientId 는 나가야 한다(공개 값이다)');
  } finally {
    if (옛.id) process.env.PAYPAL_CLIENT_ID = 옛.id; else delete process.env.PAYPAL_CLIENT_ID;
    if (옛.s) process.env.PAYPAL_SECRET = 옛.s; else delete process.env.PAYPAL_SECRET;
    _토큰비우기();
  }
});

test('🔴 PAYPAL_MODE 가 정확히 live 일 때만 진짜 돈이다 — 오타면 샌드박스로 간다', () => {
  const 옛 = process.env.PAYPAL_MODE;
  try {
    process.env.PAYPAL_MODE = 'live';   assert.equal(진짜돈인가(), true);
    assert.match(밑주소(), /^https:\/\/api-m\.paypal\.com/);
    process.env.PAYPAL_MODE = 'LIVE';   assert.equal(진짜돈인가(), true, '대소문자는 봐준다');
    process.env.PAYPAL_MODE = 'liv';    assert.equal(진짜돈인가(), false, '오타면 진짜 돈이 아니다');
    process.env.PAYPAL_MODE = 'sandbox';assert.equal(진짜돈인가(), false);
    assert.match(밑주소(), /sandbox/);
    delete process.env.PAYPAL_MODE;     assert.equal(진짜돈인가(), false, '안 적었으면 진짜 돈이 아니다');
  } finally { if (옛) process.env.PAYPAL_MODE = 옛; else delete process.env.PAYPAL_MODE; }
});
