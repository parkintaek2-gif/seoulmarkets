#!/usr/bin/env node
/**
 * 눈으로본다-로그인결제.mjs — **로그인과 결제 지면을 그려서 그림으로 남긴다.**
 *
 * ── 🔴🔴 왜 (2026-11-08 · 사장님) ────────────────────────────────────
 * 「**매우 중요하고 매일해야하는 필수 지침 (1) 로그인, 결제 정상 여부 «눈으로 확인»
 *   — 2시간에 한번씩**」
 *
 * 우리는 결제를 두 시간마다(실제로는 매시) 재고 있었다. 그런데 **그림이 한 장도 없었다.**
 * 재는 자들은 전부 fetch 로 응답만 봤다. 「단추가 보인다」를 「결제가 된다」로 읽지 않기로
 * 해 놓고도, 정작 «무엇이 그려졌는지»는 아무도 본 적이 없다.
 *   - 2026-10 에 세미콜론 하나로 관리자 화면이 통째로 비었을 때도 초록불은 그대로였다.
 *   - 사장님이 로그인 화면을 «눈으로 보시고» 물으셔서 알아차린 사고가 이미 있었다.
 * ⇒ 이 자는 판정하지 않는다. **그려서 그림으로 남긴다.** 보는 것은 사람(또는 5번)이 한다.
 *
 * ── ⛔ 지키는 것 ──────────────────────────────────────────────────────
 *   ⛔ 승인(capture)을 부르지 않는다. 카드번호·계정 비밀번호를 넣지 않는다
 *   ⛔ 주소를 지어내지 않는다 — 첫 지면에서 «보이는 링크를 눌러» 들어간다
 *   ⛔ 크롬 9222(사장님 창)에 b.close() 를 쓰지 않는다. 여는 탭은 끝에서 닫는다
 *   ⛔ 「그렸다」를 「정상이다」로 읽지 않는다 — 이 자는 증거를 만들 뿐이다
 *
 * 쓰는 법
 *   node scripts/눈으로본다-로그인결제.mjs            찍는다
 *   node scripts/눈으로본다-로그인결제.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = fileURLToPath(new URL('..', import.meta.url));
const 찍는방 = path.join(뿌리, 'docs', '눈확인');

/** 재는 집 — 돈을 받는 두 곳이다 */
export const 집들 = [
  { 코드: 'klifemap', 이름: 'KLifeMap', 첫지면: 'https://klifemap.ai/' },
  /* 🔴 SeoulMarkets 는 «계정 없이» 판다 — 지면에 「no account with us」라고 적혀 있고
     /login 은 404 다. check-seoulmarkets-payment.mjs 의 로그인있나() 도 404 를 그냥 넘긴다.
     ⛔ 그러므로 여기서 로그인 지면을 찾아 404 그림을 찍으면 «거짓 경보»가 된다.
     거짓 경보는 진짜 경보를 죽인다 — 로그인 자리가 없는 집이라고 그대로 적는다. */
  { 코드: 'seoulmarkets', 이름: 'SeoulMarkets', 첫지면: 'https://seoulmarkets.com/',
    로그인없음: '계정 없이 파는 집이다 — 지면에 「no account with us」. /login 은 404 가 맞다' },
];

/**
 * 누를 링크를 고르는 말 — 한국어와 영어를 같이 본다
 * ⚠ 2026-11-08 첫 판에서 KLifeMap 의 «요금안내» 를 못 알아봤다. 말이 모자라면
 *   「지면이 없다」가 아니라 「내 말이 모자란다」다. 둘을 혼동하지 않는다.
 */
export const 찾을것 = [
  { 자리: '로그인', 말: /^(로그인|로그인하기|마이페이지|내 ?정보|sign ?in|log ?in|login|my ?page|account)$/i },
  { 자리: '결제', 말: /^(요금제|요금안내|요금|구독|결제|가격|이용권|결제하기|pricing|prices?|plans?|subscribe|upgrade|get ?access|buy)$/i },
];

/**
 * 첫 지면에 링크가 없을 때 쓸 «이미 아는» 주소 — ⛔ 지어낸 주소가 아니다.
 * 결제를 재는 자들이 날마다 두드리고 있는 길이다(check-seoulmarkets-payment.mjs 의 '/login',
 * check-klifemap-payment.mjs 의 '/login.html'). 링크가 없다는 사실은 그대로 적고,
 * 그래도 지면 자체는 그려서 눈으로 본다 — 「닿는 것」과 「걷는 것」은 다른 말이다.
 */
export const 아는길 = {
  klifemap: { 로그인: 'https://klifemap.ai/login.html' },
};

/** 링크 글을 받아 어느 자리인지 가린다. 못 가리면 null — ⛔ 아무 데나 넣지 않는다 */
export function 어느자리냐(글) {
  const s = String(글 ?? '').trim();
  if (!s || s.length > 24) return null;
  for (const x of 찾을것) if (x.말.test(s)) return x.자리;
  return null;
}

/** 그림 파일 이름 — 날·시각·집·자리가 다 들어가야 나중에 되짚을 수 있다 */
export function 그림이름(이제, 집코드, 자리) {
  const d = new Date(이제);
  const 시 = String(d.getHours()).padStart(2, '0');
  const 분 = String(d.getMinutes()).padStart(2, '0');
  return `${시}${분}-${집코드}-${자리}.png`;
}

/** 오늘 방 — docs/눈확인/2026-11-08/ */
export function 오늘방(이제 = new Date()) {
  return path.join(찍는방, new Date(이제).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }));
}

/* ── 자가시험 ───────────────────────────────────────────────────────── */
export function 자가시험() {
  const 것 = [];
  const 본다 = (이름, 참) => 것.push({ 이름, 참: !!참 });

  본다('돈 받는 두 집을 본다', 집들.length === 2);
  본다('로그인 링크를 가린다', 어느자리냐('로그인') === '로그인');
  본다('영문 Sign in 도 가린다', 어느자리냐('Sign in') === '로그인');
  본다('요금제를 결제 자리로 본다', 어느자리냐('요금제') === '결제');
  본다('Pricing 도 결제 자리로 본다', 어느자리냐('Pricing') === '결제');
  본다('⛔ 상관없는 링크는 안 고른다', 어느자리냐('회사 소개') === null);
  본다('⛔ 긴 글은 링크 이름이 아니다', 어느자리냐('로그인을 하시면 더 많은 것을 보실 수 있습니다') === null);
  본다('⛔ 빈 것에 안 터진다', 어느자리냐(null) === null && 어느자리냐('') === null);
  본다('그림 이름에 집과 자리가 들어간다',
    그림이름(new Date('2026-11-08T22:05:00+09:00'), 'klifemap', '로그인') === '2205-klifemap-로그인.png');
  본다('오늘 방이 날짜로 갈린다',
    path.basename(오늘방(new Date('2026-11-08T22:05:00+09:00'))) === '2026-11-08');

  const 빨강 = 것.filter((x) => !x.참);
  console.log(`■ 눈으로본다-로그인결제 자가시험 ${것.length - 빨강.length}/${것.length}`);
  for (const x of 것) console.log(`  ${x.참 ? '✅' : '🔴'} ${x.이름}`);
  return 빨강.length === 0;
}

/* ── 본문 ───────────────────────────────────────────────────────────── */
async function 찍는다() {
  const puppeteer = (await import('file:///C:/Users/User/Documents/GitHub/dataeconomics/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js')).default;
  const 이제 = new Date();
  const 방 = 오늘방(이제);
  fs.mkdirSync(방, { recursive: true });

  console.log('■ 눈으로 본다 — 로그인 · 결제 (사장님 2026-11-08 「눈으로 확인」)');
  console.log('   ' + 이제.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }));
  console.log('   ⛔ 승인은 부르지 않는다 · 카드번호를 넣지 않는다 · 그림만 남긴다\n');

  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', defaultViewport: { width: 1280, height: 1600 } });
  const 난것 = [];
  try {
    for (const 집 of 집들) {
      const page = await b.newPage();
      try {
        await page.goto(집.첫지면, { waitUntil: 'networkidle2', timeout: 60000 });
        await new Promise((r) => setTimeout(r, 2500));

        /* 첫 지면도 한 장 남긴다 — 지면이 통째로 빈 사고가 있었다 */
        {
          const 이름 = 그림이름(이제, 집.코드, '첫지면');
          await page.screenshot({ path: path.join(방, 이름), fullPage: false });
          난것.push({ 집: 집.이름, 자리: '첫지면', 그림: path.join(방, 이름), 주소: page.url() });
          console.log(`   ✅ ${집.이름} 첫지면 — ${이름}`);
        }

        /* 보이는 링크를 «눌러» 들어간다 — 주소를 지어내지 않는다 */
        for (const { 자리 } of 찾을것) {
          /* 로그인이 «설계상» 없는 집은 찾지 않는다 — 404 그림은 거짓 경보다 */
          if (자리 === '로그인' && 집.로그인없음) {
            console.log(`   ⬜ ${집.이름} 로그인 — ${집.로그인없음}`);
            난것.push({ 집: 집.이름, 자리, 그림: null, 왜: 집.로그인없음, 설계: true });
            continue;
          }
          /* ⛔ 규칙을 지면 안에 «한 벌 더» 적지 않는다 — 2026-11-08 에 바로 그래서 요금안내를
             못 찾았다. 겉의 찾을것 하나만 고치면 되게 글자 그대로 건네준다 */
          const 자리값 = await page.evaluate((글자, 자리글) => {
            const 자 = new RegExp(글자, 'i');
            const e = [...document.querySelectorAll('a,button')].find((x) => {
              const t = String(x.innerText || '').trim();
              return t && t.length <= 24 && 자.test(t);
            });
            if (!e) return null;
            e.scrollIntoView({ block: 'center' });
            const r = e.getBoundingClientRect();
            return { x: r.left + r.width / 2, y: r.top + r.height / 2, 글: e.innerText.trim(), 자리: 자리글 };
          }, 찾을것.find((x) => x.자리 === 자리).말.source, 자리);

          let 링크없음 = null;
          if (!자리값) {
            const 길 = (아는길[집.코드] ?? {})[자리];
            if (!길) {
              console.log(`   ⬜ ${집.이름} ${자리} — 첫 지면에 누를 링크가 없고 아는 길도 없다. 못 쟀다고 적는다`);
              난것.push({ 집: 집.이름, 자리, 그림: null, 왜: '첫 지면에 링크가 없다' });
              continue;
            }
            /* 🔴 첫 지면에서 «닿지 못한다»는 것 자체가 흠이다 — 그림과 함께 그대로 적는다 */
            링크없음 = '첫 지면에 링크가 없어 아는 길로 바로 갔다';
            console.log(`   🟡 ${집.이름} ${자리} — 첫 지면에 링크가 없다. 재는 자가 쓰는 길로 간다 · ${길}`);
            await page.goto(길, { waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {});
            await new Promise((r) => setTimeout(r, 3000));
          } else {
            await page.mouse.move(자리값.x, 자리값.y);
            await page.mouse.click(자리값.x, 자리값.y);
            await new Promise((r) => setTimeout(r, 4000));
          }

          const 이름 = 그림이름(이제, 집.코드, 자리);
          await page.screenshot({ path: path.join(방, 이름), fullPage: false });
          난것.push({ 집: 집.이름, 자리, 그림: path.join(방, 이름), 주소: page.url(),
            누른글: 자리값 ? 자리값.글 : null, 흠: 링크없음 });
          console.log(`   ${링크없음 ? '🟡' : '✅'} ${집.이름} ${자리} — `
            + (자리값 ? `「${자리값.글}」을 눌렀다` : 링크없음) + ` · ${page.url()}`);
          console.log(`      ${이름}`);

          await page.goto(집.첫지면, { waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {});
          await new Promise((r) => setTimeout(r, 1500));
        }
      } catch (e) {
        console.log(`   🔴 ${집.이름} — ${e.message}`);
        난것.push({ 집: 집.이름, 자리: '전체', 그림: null, 왜: e.message });
      } finally {
        await page.close().catch(() => {});
      }
    }
  } finally {
    b.disconnect();                       /* ⛔ b.close() 를 쓰지 않는다 */
  }

  const 찍힌수 = 난것.filter((x) => x.그림).length;
  console.log(`\n■ 그림 ${찍힌수}장 — ${path.relative(뿌리, 방).replace(/\\/g, '/')}`);
  console.log('⛔ 「찍었다」를 「정상이다」로 읽지 않는다. 그림을 열어서 봐야 본 것이다.');
  fs.writeFileSync(path.join(방, '찍은목록.json'), JSON.stringify({ 때: 이제.toISOString(), 난것 }, null, 1), 'utf8');
  return 찍힌수 > 0 ? 0 : 1;
}

const 내가진입점 = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (내가진입점) {
  if (process.argv.includes('--자가시험')) process.exit(자가시험() ? 0 : 1);
  process.exit(await 찍는다());
}
