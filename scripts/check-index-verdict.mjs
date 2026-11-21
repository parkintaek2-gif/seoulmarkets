/**
 * check-index-verdict.mjs — **구글이 「색인했다」고 «말하는» 지면이 몇 장인가.** (5번, 2026-09-07)
 *
 * ── 왜 이 자가 필요했나 ──────────────────────────────────────
 * 우리는 IndexNow 로 2,830장을 알리고 사이트맵을 냅니다. 그런데
 * **몇 장이 실제로 색인됐는지는 아무도 안 재고 있었습니다.**
 * 「알렸다」와 「색인됐다」는 다른 말입니다 — 이 저장소의 오래된 규칙 그대로입니다.
 *
 * ⛔ 서치콘솔 «화면»으로는 못 셌습니다. 사장님 크롬(9222)으로 열어 보니
 *   `sc-domain:kculturewire.com` 등 네 속성이 다 `not-verified` 로 튕겼습니다
 *   (API 는 되는데 화면은 안 됩니다 — 로그인 계정이 다른 것으로 보입니다).
 *   ⇒ 그래서 **URL 검사 API** 로 «한 장씩» 물어 표본으로 셉니다.
 *
 * ── ⛔ 이 자가 지키는 것 ────────────────────────────────────
 * ⛔ 표본입니다. **전수라고 말하지 않습니다.** 몇 장을 물었는지 늘 함께 냅니다
 * ⛔ 못 물어본 장을 「색인 안 됨」으로 세지 않습니다 — 따로 셉니다
 * ⛔ 하루 쿼터가 있습니다(대략 2,000). 다 쓰면 다른 자가 못 씁니다 — 기본을 작게 둡니다
 * ⚠ 구글이 말하는 것은 «구글의 판단»입니다. 그것이 진실이라고 쓰지 않습니다
 *
 * 쓰는 법
 *   node scripts/check-index-verdict.mjs --사이트 kcw --몇장 40
 *   node scripts/check-index-verdict.mjs --시험만
 */
import fs from 'node:fs';
import path from 'node:path';
import { createSign } from 'node:crypto';
import { pathToFileURL } from 'node:url';
/* 🔴 [2026-09-07] 파일 이름을 toISOString 으로 지어 «새벽에 하루가 어긋날» 자리였다.
   저장소 규칙은 _kst.mjs 다 — 9시간을 손으로 더하지 않고 이 자를 쓴다. */
import { 오늘 } from './_kst.mjs';

export const 사이트들 = {
  kcw: { 속성: 'sc-domain:kculturewire.com', 사이트맵: 'https://www.kculturewire.com/sitemap.xml' },
  '100y': { 속성: 'sc-domain:100yearmap.com', 사이트맵: 'https://100yearmap.com/sitemap.xml' },
  seoulmarkets: { 속성: 'sc-domain:seoulmarkets.com', 사이트맵: 'https://seoulmarkets.com/sitemap.xml' },
  klifemap: { 속성: 'sc-domain:klifemap.ai', 사이트맵: 'https://klifemap.ai/sitemap.xml' },
};

/** 구글이 내는 판정을 «우리 말»로 가른다. ⛔ 모르는 값을 「색인 안 됨」으로 뭉개지 않는다 */
export function 판정가르기(coverageState, verdict) {
  const c = String(coverageState ?? '');
  const v = String(verdict ?? '');
  if (/Submitted and indexed|URL is on Google/i.test(c) || v === 'PASS') return '색인됨';
  if (/Crawled - currently not indexed|Discovered - currently not indexed/i.test(c)) return '기다림';
  if (/Duplicate|canonical/i.test(c)) return '중복으로뺌';
  if (/Excluded by|noindex|blocked/i.test(c)) return '우리가막음';
  if (/not found|404/i.test(c)) return '없는지면';
  if (!c && !v) return '못물어봄';
  return '그밖';
}

/** ⭐ 표본에서 몫을 낼 때 «못 물어본 것»을 분모에서 뺀다 —  */
export function 몫내기(셈) {
  const 물어본 = Object.entries(셈)
    .filter(([k]) => k !== '못물어봄')
    .reduce((s, [, v]) => s + v, 0);
  if (!물어본) return { 물어본: 0, 색인몫: null, 까닭: '한 장도 못 물었다 — 몫을 낼 수 없다' };
  return { 물어본, 색인몫: +((셈.색인됨 ?? 0) / 물어본 * 100).toFixed(1) };
}

/** 사이트맵 URL 에서 «고르게 퍼진» 표본을 뽑는다 — ⛔ 앞에서 N장만 자르지 않는다 */
/**
 * 갈래로 거른다 — `--걸러=/title/` 처럼 «경로 조각»으로 준다.
 *
 * ⛔ 아무것도 안 걸리면 «빈 것»을 돌려준다. 못 걸렀다고 통째로 넘기지 않는다 —
 *   통째로 넘기면 「/title/ 을 물었다」고 믿고 엉뚱한 표본을 재게 된다.
 */
export function 갈래로거르기(주소들, 조각) {
  const 목 = Array.isArray(주소들) ? 주소들 : [];
const c = String(조각 ??'').trim();
  if (!c) return 목;
  return 목.filter((u) => {
    try { return new URL(u).pathname.includes(c); } catch { return false; }
  });
}

export function 고르게뽑기(목록, 몇장) {
  const a = [...(목록 ?? [])];
  if (몇장 <= 0 || !a.length) return [];
  if (a.length <= 몇장) return a;
  const 걸음 = a.length / 몇장;
  const 뽑 = [];
  for (let i = 0; i < 몇장; i++) 뽑.push(a[Math.floor(i * 걸음)]);
  return 뽑;
}

/**
 * 🔴 [2026-09-07] **이 자가 오진을 냈다. 그 까닭을 여기 못박는다.**
 *
 * 100yearmap 표본에서 4장이 「noindex 로 뺐다」로 나와, 나는 그것을
 *   「사이트맵에 noindex 지면이 660장쯤 들어 있다」로 어림해 3번께 세 번 올렸다.
 * 3번이 코드와 라이브를 직접 보고 반론했다 — 「지금은 noindex 가 안 걸려 있다.
 *   그 값은 구글이 «마지막으로 기어간 때»의 스냅샷일 것이다」.
 *
 * ⭐ 재 보니 3번이 맞았다 —
 * ```
 * 네 장의 lastCrawlTime   2026-08-05 02:19 ~ 06:27 UTC  (네 장 다 그날 4시간 안)
 * 3번이 색인을 «연» 커밋  2026-08-05 19:48 KST = 10:48 UTC
 * ⇒ 크롤이 «고침보다 먼저»였다. 그 뒤로 구글이 한 번도 다시 안 기어갔다
 * ```
 *
 * ⛔ 그래서 이 자는 이제 `lastCrawlTime` 을 «반드시» 함께 낸다.
 *   그 칸이 없으면 「지금 그렇다」와 「그때 그랬다」를 못 가른다 —
 *   못 가른 채로 남에게 올리면 남의 하루를 헛되게 쓴다.
 */
export const 낡음문턱일 = 14;

export function 낡은값인가(lastCrawlTime, 이제 = Date.now(), 문턱일 = 낡음문턱일) {
  if (!lastCrawlTime) return { 낡음: null, 까닭: '기어간 때를 모른다 — 낡았는지도 못 잰다' };
  const t = Date.parse(lastCrawlTime);
  if (!Number.isFinite(t)) return { 낡음: null, 까닭: '기어간 때의 꼴이 아니다' };
  const 지난날 = (이제 - t) / 86400000;
  return {
    낡음: 지난날 > 문턱일,
    지난날: +지난날.toFixed(1),
    까닭: 지난날 > 문턱일
      ? `${Math.round(지난날)}일 전 크롤이다 — 그 뒤에 고쳤다면 이 판정은 «옛것»이다`
      : `${Math.round(지난날)}일 전 크롤이다 — 최근 값이다`,
  };
}

/* ── 자가시험 ─────────────────────────────────────────────── */
function 자가시험() {
  let 통 = 0; let 실 = 0;
  const 봐 = (말, 참) => { if (참) { 통++; console.log('  ✅ ' + 말); } else { 실++; console.log('  🔴 ' + 말); } };

  봐('네 사이트가 다 있다', Object.keys(사이트들).length === 4);
  봐('속성 이름이 다 sc-domain 꼴', Object.values(사이트들).every((x) => x.속성.startsWith('sc-domain:')));

  봐('제출·색인은 색인됨', 판정가르기('Submitted and indexed', 'PASS') === '색인됨');
  봐('verdict PASS 만으로도 색인됨', 판정가르기('', 'PASS') === '색인됨');
  봐('기어갔지만 아직 아닌 것은 «기다림»', 판정가르기('Crawled - currently not indexed', 'NEUTRAL') === '기다림');
  봐('발견만 된 것도 «기다림»', 판정가르기('Discovered - currently not indexed', 'NEUTRAL') === '기다림');
  봐('🔴 중복·표준태그는 «중복으로뺌» — 기다림과 다른 말이다',
    판정가르기('Duplicate without user-selected canonical', 'NEUTRAL') === '중복으로뺌');
  봐('우리가 막은 것을 따로 가른다', 판정가르기('Excluded by noindex tag', 'NEUTRAL') === '우리가막음');
  봐('없는 지면을 따로 가른다', 판정가르기('Submitted URL not found (404)', 'FAIL') === '없는지면');
  봐('⛔ 아무것도 못 받으면 «못물어봄» — 색인 안 됨이 아니다', 판정가르기(null, null) === '못물어봄');
  봐('모르는 값은 «그밖» 으로 남긴다 — 뭉개지 않는다', 판정가르기('Something new', 'NEUTRAL') === '그밖');

  const m = 몫내기({ 색인됨: 30, 기다림: 10, 못물어봄: 5 });
  봐('⛔ 못 물어본 것을 분모에서 뺀다', m.물어본 === 40 && m.색인몫 === 75);
  봐('한 장도 못 물으면 몫을 안 낸다',
    몫내기({ 못물어봄: 3 }).색인몫 === null);
  봐('못 낼 때 까닭을 적는다', /못 물었다/.test(몫내기({ 못물어봄: 3 }).까닭));

  const 이제 = Date.parse('2026-09-07T12:00:00Z');
  봐('🔴 오래된 크롤을 «낡았다»고 말한다',
    낡은값인가('2026-08-05T03:00:00Z', 이제).낡음 === true);
  봐('낡았을 때 «옛것일 수 있다»고 적는다',
    /옛것/.test(낡은값인가('2026-08-05T03:00:00Z', 이제).까닭));
  봐('최근 크롤은 낡지 않았다', 낡은값인가('2026-09-05T03:00:00Z', 이제).낡음 === false);
  봐('⛔ 기어간 때를 모르면 «낡았다/아니다» 어느 쪽도 아니다 — null 이다',
    낡은값인가(null, 이제).낡음 === null);
  봐('모를 때도 까닭을 적는다', /못 잰다/.test(낡은값인가(null, 이제).까닭));
  봐('지난 날수를 함께 낸다', 낡은값인가('2026-09-05T12:00:00Z', 이제).지난날 === 2);

  const 목록 = Array.from({ length: 100 }, (_, i) => 'u' + i);
  const 뽑 = 고르게뽑기(목록, 10);
  봐('열 장을 뽑는다', 뽑.length === 10);
  봐('⛔ 앞에서 자르지 않는다 — 고르게 퍼진다', 뽑[0] === 'u0' && 뽑[9] === 'u90');
  봐('목록보다 많이 달라면 있는 만큼만', 고르게뽑기(['a', 'b'], 10).length === 2);
  봐('0장을 달라면 빈 것', 고르게뽑기(목록, 0).length === 0);
  봐('빈 목록이면 빈 것', 고르게뽑기([], 5).length === 0);

  /* 갈래로 거르기 */
  const 섞 = ['https://a.com/title/x', 'https://a.com/person/y', 'https://a.com/title/z', '깨진주소'];
  봐('갈래로 거른다', 갈래로거르기(섞, '/title/').length === 2);
  봐('⛔ 못 걸렀으면 빈 것 — 통째로 넘기지 않는다', 갈래로거르기(섞, '/없는갈래/').length === 0);
  봐('조각을 안 주면 그대로', 갈래로거르기(섞, '').length === 4);
  봐('깨진 주소는 조용히 뺀다', !갈래로거르기(섞, '/title/').includes('깨진주소'));
  봐('목록이 아니면 빈 것', 갈래로거르기(null, '/title/').length === 0);

  console.log(`\n색인 판정 검사 — 자가시험 ${통}가지 통과 · ${실}가지 실패`);
  if (실) process.exit(1);
  return 통;
}

/* ── 인증 (fetch-gsc.mjs 와 같은 길) ─────────────────────── */
/* .env 를 스스로 읽는다 — fetch-gsc.mjs 와 같은 방식이다(dotenv 를 안 쓴다) */
/**
 * .env 를 스스로 읽는다 — fetch-gsc.mjs 와 같은 방식(dotenv 를 안 쓴다).
 * ⚠ 정규식을 안 쓴다. 앞서 bash 를 거치며 정규식이 망가져 파일이 한 번 깨졌다 —
 *   문자열 나누기와 indexOf 로만 짜면 그 위험이 없다.
 * ⛔ 값을 화면에 찍지 않는다. 이 파일에는 열쇠가 들어 있다.
 */
function 환경읽기() {
  try {
    const 본문 = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
    const LF = String.fromCharCode(10);
    const CR = String.fromCharCode(13);
    for (const 날줄 of 본문.split(LF)) {
      const 줄 = 날줄.split(CR).join('').trim();
      if (!줄 || 줄.startsWith('#')) continue;
      const i = 줄.indexOf('=');
      if (i <= 0) continue;
      const 이름 = 줄.slice(0, i).trim();
      let 값 = 줄.slice(i + 1).trim();
      if ((값.startsWith('"') && 값.endsWith('"')) || (값.startsWith("'") && 값.endsWith("'"))) {
        값 = 값.slice(1, -1);
      }
      if (이름 && process.env[이름] === undefined) process.env[이름] = 값;
    }
  } catch { /* 없으면 그만 — 그때는 아래에서 «없다»고 말한다 */ }
}
async function 토큰받기() {
  환경읽기();
  const 키파일 = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!키파일) throw new Error('GOOGLE_APPLICATION_CREDENTIALS 가 .env 에 없다');
  const 키 = JSON.parse(fs.readFileSync(키파일, 'utf8'));
  const 지금초 = Math.floor(Date.now() / 1000);
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const 머리 = b64({ alg: 'RS256', typ: 'JWT' });
  const 몸 = b64({
    iss: 키.client_email, scope: 'https://www.googleapis.com/auth/webmasters.readonly',
    aud: 'https://oauth2.googleapis.com/token', iat: 지금초, exp: 지금초 + 3600,
  });
  const 서명 = createSign('RSA-SHA256').update(`${머리}.${몸}`).sign(키.private_key, 'base64url');
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${머리}.${몸}.${서명}`,
    }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error('토큰 실패: ' + JSON.stringify(j).slice(0, 200));
  return j.access_token;
}

const 인자 = (이름, 기본) => {
  const a = process.argv.find((x) => x.startsWith(`--${이름}=`));
  if (a) return a.split('=')[1];
  const i = process.argv.indexOf(`--${이름}`);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : 기본;
};

async function 주된일() {
  const 통 = 자가시험();
  const 이름 = 인자('사이트', 'kcw');
  const 몇장 = Number(인자('몇장', '30'));
  const 곳 = 사이트들[이름];
  if (!곳) { console.error(`⛔ 모르는 사이트 「${이름}」 — ${Object.keys(사이트들).join(' · ')}`); process.exit(1); }

  /* 사이트맵에서 주소를 받는다 — 사이트맵 색인이면 안쪽까지 한 겹 들어간다 */
  const UA = { 'User-Agent': 'KCultureWire/1.0 (+https://www.kculturewire.com; u5@klifedesign.net)' };
  const 받 = async (u) => (await fetch(u, { headers: UA })).text();
  let xml = await 받(곳.사이트맵);
  let 주소 = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  if (/<sitemapindex/i.test(xml)) {
    const 안쪽 = 주소.slice(0, 6);
    주소 = [];
    for (const s of 안쪽) 주소.push(...[...(await 받(s)).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
  }
  console.log(`\n■ ${이름} · 사이트맵 주소 ${주소.length.toLocaleString('en-US')}장 → 표본 ${몇장}장을 «고르게» 뽑아 묻는다`);

  const 조각 = 인자('걸러', '');
  const 걸러진 = 갈래로거르기(주소, 조각);
  if (조각 && !걸러진.length) {
    console.error(`⛔ 「${조각}」 에 걸리는 주소가 사이트맵에 없다. 통째로 재지 않고 멈춘다.`);
    process.exit(1);
  }
  if (조각) console.log(`   ⭐ 「${조각}」 갈래만 — ${걸러진.length.toLocaleString('en-US')}장 가운데서 뽑는다`);
  const 표본 = 고르게뽑기(걸러진, 몇장);
  const 토큰 = await 토큰받기();
  const 셈 = {}; const 줄 = [];
  for (const u of 표본) {
    let c = null; let v = null; let 오류 = null;
    let 긴때 = null; let 막힘 = null; let 로봇 = null;
    try {
      const r = await fetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
        method: 'POST',
        headers: { Authorization: `Bearer ${토큰}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ inspectionUrl: u, siteUrl: 곳.속성 }),
      });
      const j = await r.json();
      if (!r.ok) 오류 = `${r.status} ${j?.error?.message ?? ''}`.slice(0, 90);
      else {
        const r2 = j?.inspectionResult?.indexStatusResult ?? {};
        c = r2.coverageState ?? null;
        v = r2.verdict ?? null;
        긴때 = r2.lastCrawlTime ?? null;
        막힘 = r2.indexingState ?? null;
        로봇 = r2.robotsTxtState ?? null;
      }
    } catch (e) { 오류 = e.message.slice(0, 80); }
    const 판 = 오류 ? '못물어봄' : 판정가르기(c, v);
    셈[판] = (셈[판] ?? 0) + 1;
    const 낡 = 낡은값인가(긴때);
    줄.push({
      주소: u, 판정: 판, coverageState: c, verdict: v, 오류,
      lastCrawlTime: 긴때, indexingState: 막힘, robotsTxtState: 로봇,
      낡은값: 낡.낡음, 낡음까닭: 낡.까닭,
    });
    await new Promise((s) => setTimeout(s, 350));
  }

  const m = 몫내기(셈);
  console.log('\n■ 구글이 말하는 것');
  for (const [k, n] of Object.entries(셈).sort((a, b) => b[1] - a[1])) console.log(`   ${k.padEnd(12)} ${String(n).padStart(4)}장`);
  console.log(`\n   물어본 ${m.물어본}장 중 색인됨 ${m.색인몫 === null ? '못 잼' : m.색인몫 + '%'}`);
  if (셈.못물어봄) {
    console.log(`   ⬜ 못 물어본 ${셈.못물어봄}장 — 0 으로 안 셌다. 첫 까닭: ${줄.find((x) => x.오류)?.오류}`);
  }
  console.log(`\n⛔ 이것은 표본 ${표본.length}장이다. 사이트맵 ${주소.length.toLocaleString('en-US')}장 전체가 아니다.`);
  console.log('⚠ 그리고 이것은 «구글의 판단»이다 — 그것이 옳다는 뜻이 아니다.');

  /* 🔴 낡은 값을 「지금 그렇다」로 읽어 오진을 낸 적이 있다(2026-09-07 · 위 주석) */
  const 낡은것 = 줄.filter((x) => x.낡은값 === true);
  if (낡은것.length) {
    console.log(`\n🔴 이 가운데 ${낡은것.length}장은 «${낡음문턱일}일보다 오래된» 크롤 값이다.`);
    console.log('   그 뒤에 우리가 고쳤다면 이 판정은 «옛것»이다 — 「지금 그렇다」로 읽지 않는다.');
    for (const x of 낡은것.slice(0, 6)) {
      console.log(`   · ${x.주소.replace(/^https?:\/\//, '')}`);
      console.log(`     ${x.coverageState} · ${x.낡음까닭}`);
    }
    console.log('   ⇒ 고칠 것을 찾으려면 «코드와 라이브»를 함께 본다. 이 값만으로 남에게 올리지 않는다.');
  }

  /* ⛔ 갈래별 표본이 같은 이름으로 서로를 덮으면 어느 것을 잰 값인지 모르게 된다 */
  const 꼬리 = 조각 ? `-${조각.replace(/[^a-z0-9]+/gi, '')}` : '';
  const 어디 = path.join('src', 'data', `index-verdict-${이름}${꼬리}-${오늘()}.json`);
  fs.writeFileSync(어디, JSON.stringify({
    잰때: new Date().toLocaleString('ko-KR'), 사이트: 이름, 속성: 곳.속성,
    사이트맵장수: 주소.length, 표본: 표본.length, 셈, 몫: m,
    이것이아닌것: [
      '⛔ 전수가 아니다 — 표본이다.',
      '⛔ 못 물어본 장을 「색인 안 됨」으로 세지 않았다.',
      '⚠ 구글의 판단이지 사실 자체가 아니다.',
    ],
    줄,
  }, null, 1), 'utf8');
  console.log(`\n📁 적었다 — ${어디}\n자가시험 ${통}가지 통과.`);
}

/**
 * 🔴 [2026-09-08 · 3번] 5번이 자기 자에서 잡은 것과 같은 흠 — `export function`을 둔 자가
 *   파일 끝에서 곧바로 본문을 돌리면, 다른 자가 이 파일의 함수만 빌려 쓰려고 import 하는
 *   순간 이 블록이 돌고 process.exit 가 불려 부르는 쪽이 통째로 죽는다.
 *   `import.meta.url` 로 「내가 직접 돌 때만」 돌게 막는다.
 */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--시험만')) 자가시험();
  else 주된일().catch((e) => { console.error('🔴', e.message); process.exit(1); });
}
