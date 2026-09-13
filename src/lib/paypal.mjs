/**
 * paypal.mjs — **서울마켓츠 달러 결제.** 페이팔 Orders v2.
 * ─────────────────────────────────────────────────────────────────────────
 * 사장님 지시 (2026-09-13):
 *   「**페이팔 결제붙여**」 · 「**달러 결제되게 해**」 · 「페이팔 등 **국적불문 결제**」
 *   「Email … We send an invoice … Pay by bank transfer … **이런 절차 필요없이 바로 결제**할 수 있게 해」
 *
 * 무엇이 있었나 — 그 지면은 「메일 주세요 → 인보이스 보냅니다 → 원화로 계좌이체」였다.
 *   ① 영어권 손님은 원화 계좌이체를 할 수 없다. 즉 **팔 수가 없었다.**
 *   ② 사람이 메일을 읽고 인보이스를 만들어야 했다 —
 *      경영원칙 **「사람을 거치는 계획을 세우지 않는다」**를 정면으로 어긴다.
 *
 * 🔴 지키는 것 넷
 *   ⛔ 금액을 «손님이 보낸 값»으로 정하지 않는다. 상품 코드만 받고 값은 서버가 정한다.
 *      안 그러면 $2,990 짜리를 $0.01 로 사 간다.
 *   ⛔ 승인(capture)을 «브라우저 말»만 듣고 믿지 않는다. 페이팔에 다시 물어 확인한다.
 *   ⛔ 시크릿을 어디로도 내보내지 않는다. clientId 만 화면에 간다.
 *   ⛔ 열쇠가 없으면 «되는 척하지 않는다». 화면에 결제 단추를 아예 안 낸다.
 */

const 라이브 = 'https://api-m.paypal.com';
const 샌드박스 = 'https://api-m.sandbox.paypal.com';

/** 진짜 돈이 오가는 곳인가 — PAYPAL_MODE 가 정확히 'live' 일 때만 */
export function 진짜돈인가() {
  return String(process.env.PAYPAL_MODE ?? '').trim().toLowerCase() === 'live';
}

export function 밑주소() {
  return 진짜돈인가() ? 라이브 : 샌드박스;
}

/** 열쇠가 다 있나. ⛔ 하나라도 없으면 결제 단추를 내지 않는다 */
export function 켜졌나() {
  return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_SECRET);
}

/** 화면에 나가도 되는 것만. ⛔ 시크릿은 절대 여기 담지 않는다 */
export function 화면에낼것() {
  return {
    enabled: 켜졌나(),
    clientId: 켜졌나() ? process.env.PAYPAL_CLIENT_ID : null,
    currency: 'USD',
    live: 진짜돈인가(),
  };
}

let 토큰 = null;      /* { 값, 만료 } — 32,400초짜리를 매번 새로 받지 않는다 */

export async function 토큰받기(지금 = Date.now()) {
  if (!켜졌나()) throw new Error('PayPal keys are not configured');
  if (토큰 && 토큰.만료 > 지금 + 60_000) return 토큰.값;
  const 기본 = Buffer.from(process.env.PAYPAL_CLIENT_ID + ':' + process.env.PAYPAL_SECRET).toString('base64');
  const r = await fetch(밑주소() + '/v1/oauth2/token', {
    method: 'POST',
    headers: { Authorization: 'Basic ' + 기본, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  const j = await r.json().catch(() => ({}));
  if (!j.access_token) throw new Error('PayPal token failed: ' + (j.error_description || j.error || r.status));
  토큰 = { 값: j.access_token, 만료: 지금 + (Number(j.expires_in || 3600) * 1000) };
  return 토큰.값;
}

/* 시험이 끼어들 수 있게 — ⚠ 제품 코드에서 부르지 않는다 */
export function _토큰비우기() { 토큰 = null; }

/**
 * 주문을 만든다. ⛔ 금액은 «서버가 정한 상품표»에서만 온다.
 * @param 상품 licence-products.mjs 의 한 줄
 */
export async function 주문만들기(상품, 데이터셋코드 = null, 부르기 = fetch) {
  if (!상품 || !상품.usd) throw new Error('unknown product');
  const t = await 토큰받기();
  const r = await 부르기(밑주소() + '/v2/checkout/orders', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: 상품.코드,
        /* ⭐ 무엇을 샀는지 페이팔 쪽에도 남긴다 — 나중에 따질 때 우리 기록이 아니라 «그쪽 기록»이 근거가 된다 */
        custom_id: (상품.코드 + (데이터셋코드 ? ':' + 데이터셋코드 : '')).slice(0, 127),
        description: ('SeoulMarkets — ' + 상품.이름 + (데이터셋코드 ? ' (' + 데이터셋코드 + ')' : '')).slice(0, 127),
        amount: { currency_code: 'USD', value: 상품.usd },
      }],
      application_context: { brand_name: 'SeoulMarkets', shipping_preference: 'NO_SHIPPING', user_action: 'PAY_NOW' },
    }),
  });
  const j = await r.json().catch(() => ({}));
  if (!j.id) throw new Error('PayPal order failed: ' + (j.message || r.status));
  return j.id;
}

/**
 * 승인을 «페이팔에 다시 물어» 확인한다.
 * ⛔ 브라우저가 「샀어요」라고 해도 그대로 믿지 않는다.
 * ⛔ 금액과 통화가 «우리가 정한 값과 정확히 같아야» 통과다.
 */
export async function 승인확인(주문번호, 상품, 부르기 = fetch) {
  if (!주문번호 || !/^[A-Za-z0-9-]{6,64}$/.test(String(주문번호))) return { ok: false, 왜: 'bad order id' };
  if (!상품) return { ok: false, 왜: 'unknown product' };
  const t = await 토큰받기();
  const r = await 부르기(밑주소() + '/v2/checkout/orders/' + 주문번호 + '/capture', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' },
  });
  const j = await r.json().catch(() => ({}));
  return 승인읽기(j, 상품);
}

/** 페이팔 답을 읽어 «정말로 받았나»를 가른다. 순수함수라 시험할 수 있다 */
export function 승인읽기(답, 상품) {
  /* ⛔ [2026-09-13] 검사가 잡았다 — 상품이 없으면 아래에서 터졌다.
       「무엇을 샀는지 모르는 결제」는 터질 일이 아니라 «막을» 일이다. */
  if (!상품 || !상품.usd) return { ok: false, 왜: 'unknown product' };
  if (!답 || 답.status !== 'COMPLETED') {
    return { ok: false, 왜: 'not completed (' + (답 && 답.status ? 답.status : '?') + ')' };
  }
  const 칸 = (답.purchase_units || [])[0];
  const 잡힌것 = 칸 && 칸.payments && (칸.payments.captures || [])[0];
  if (!잡힌것 || 잡힌것.status !== 'COMPLETED') return { ok: false, 왜: 'capture not completed' };
  const 금액 = 잡힌것.amount || {};
  if (금액.currency_code !== 'USD') return { ok: false, 왜: 'wrong currency: ' + 금액.currency_code };
  /* ⛔ 문자열로 비교하면 '990.0' 과 '990.00' 이 다르다고 나온다. 센트 단위 정수로 맞댄다 */
  if (센트(금액.value) !== 센트(상품.usd)) {
    return { ok: false, 왜: 'wrong amount: got ' + 금액.value + ', expected ' + 상품.usd };
  }
  return { ok: true, 결제번호: 잡힌것.id, 금액: 금액.value };
}

/**
 * 이미 낸 주문인가를 «다시» 확인한다 — 다운로드 때 쓴다.
 *
 * ⭐ 왜 이렇게 하나 — 서울마켓츠엔 DB 가 없다. 그래서 «누가 샀나»를 우리가 저장하지 않고
 *   **페이팔에 물어본다.** 페이팔이 진실의 근원이다.
 *   · 저장소가 필요 없다        · 링크가 만료되지 않는다(지면의 약속 그대로)
 *   · 위조할 수 없다            · 우리가 손님 정보를 들고 있지 않아도 된다
 * ⚠ 다운로드마다 페이팔을 한 번 부른다. 다운로드는 드물어 괜찮다.
 */
export async function 산주문인가(주문번호, 상품, 부르기 = fetch) {
  if (!주문번호 || !/^[A-Za-z0-9-]{6,64}$/.test(String(주문번호))) return { ok: false, 왜: 'bad order id' };
  if (!상품) return { ok: false, 왜: 'unknown product' };
  const t = await 토큰받기();
  const r = await 부르기(밑주소() + '/v2/checkout/orders/' + 주문번호, {
    headers: { Authorization: 'Bearer ' + t },
  });
  const j = await r.json().catch(() => ({}));
  return 승인읽기(j, 상품);
}

/** '990.00' → 99000 . ⛔ 부동소수로 비교하지 않는다 */
export function 센트(v) {
  const s = String(v ?? '').trim();
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return NaN;
  const [앞, 뒤 = ''] = s.split('.');
  return Number(앞) * 100 + Number((뒤 + '00').slice(0, 2));
}
