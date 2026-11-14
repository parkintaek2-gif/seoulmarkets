/**
 * 새 URL 을 IndexNow 로 통보한다. Bing·Yandex·Naver·Seznam 이 이 프로토콜을 받는다.
 * (구글은 IndexNow 를 쓰지 않는다 — 구글은 사이트맵 + Search Console 로 간다)
 *
 *   node scripts/ping-indexnow.mjs                          # 서울마켓 전체 (지금까지와 똑같다)
 *   node scripts/ping-indexnow.mjs /article/foo /macro      # 서울마켓, 지정한 경로만
 *   node scripts/ping-indexnow.mjs --host 100yearmap.com    # 백년지도 전체
 *   node scripts/ping-indexnow.mjs --host 100yearmap.com /after /work
 *   node scripts/ping-indexnow.mjs --all                    # 등록된 사이트 전부
 *   node scripts/ping-indexnow.mjs --all --dry              # **보내지 않고** 몇 건인지만 본다
 *
 * 발행 후 한 번 돌리면 된다. 하루 수백 건씩 남발하지 말 것.
 * ⚠ 고친 뒤 확인하려고 그냥 돌리면 **진짜 통보가 나간다.** 확인은 `--dry` 로 한다.
 *
 * 🔴 **Git Bash 에서 경로 인자를 주지 마라.** `/macro` 를 윈도우 경로로 바꿔 버린다 —
 *   실제로 이렇게 됐다(8/6 실측).
 *
 *     node scripts/ping-indexnow.mjs /macro
 *     → 스크립트가 받은 것: `c:/Program Files/Git/macro`
 *
 *   **PowerShell 이나 cmd 에서 돌린다.** 굳이 Git Bash 를 써야 하면 `MSYS_NO_PATHCONV=1` 를 앞에 붙인다.
 *   ⭐ 이 사고는 예전부터 있었는데 **조용히 이상한 URL 을 보내고 끝났다.**
 *      지금은 아래 「남의 호스트 섞임」 검사가 잡아서 **보내기 전에 멈춘다.**
 *
 * ─────────────────────────────────────────────────────────────
 * 🔴 **한 사이트만 박혀 있었다** (2026-08-06 · 2번이 찾아 3번에게 넘김)
 *
 *   const HOST = 'seoulmarkets.com';   ← 여기 하나뿐이었다
 *
 * 그래서 `100yearmap.com` 은 Bing·Yandex 에 **한 번도 알려진 적이 없었다.**
 * 2,483장을 만들어 놓고 통보를 안 한 셈이다.
 *
 * ⛔ **서울마켓 동작을 깨지 않는다** — 6번이 매 발행마다 쓴다.
 *   인자가 없으면 **예전과 똑같이** 돈다(같은 사이트맵 규칙 · 같은 본문).
 *
 * ⚠ **사이트마다 사이트맵 규칙이 다르다.** 이걸 놓치면 조용히 0건이 된다 —
 *   서울마켓은 `dist/sitemap-*.xml` **여러 장**, 백년지도는 `dist/100y/sitemap.xml` **한 장**이다.
 *
 * 🔴 **키 파일이 그 호스트에서 열려야 한다.** IndexNow 는 `keyLocation` 을 실제로 가져가 본다.
 *   8/6 실측 — `seoulmarkets.com/<키>.txt` **200**, `100yearmap.com/<키>.txt` **404** 였다.
 *   `public/100y/` 에 같은 키 파일을 놓아 고쳤다. **새 사이트를 붙이면 키 파일부터 놓는다.**
 *   (키 파일은 원래 공개해서 쓰는 것이다. 다만 값을 로그에 찍지 않는다)
 */
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

/** 인자 배열에서 경로만 뽑는다(순수함수 — 자가시험용). `--host x` 와 `--all`·`--dry` 를 뺀 나머지. */
export function 경로파싱(인자) {
  const 호스트자리 = 인자.indexOf('--host');
  return 인자.filter((a, n) => !a.startsWith('--') && !(호스트자리 >= 0 && n === 호스트자리 + 1));
}

/**
 * 🔴🔴 [2026-11-14 · 5번] **쉼표로 이어 붙인 주소 한 덩이를 «한 장»으로 통보했다.**
 *
 * 이 자는 주소를 **자리 인자**로 받는데(`--only` 같은 깃발이 없다), 다른 자(klifemap 쪽
 * `tools/indexnow.js`)는 `--only a,b,c` 꼴로 받는다. 그 버릇으로 쉼표로 이어 붙여 넘겼더니,
 * 통째로 «한 주소»가 되어 404 가 날 글이 검색엔진에 통보됐다.
 *
 * ⛔ 「없는 주소를 통보하면 신뢰가 깎인다」는 이 파일의 첫 규칙이다. 그 규칙을 내가 어겼다.
 * ⇒ 말로 적어 두지 않고 **검사로 막는다** — 경로에 쉼표가 있으면 보내기 전에 선다.
 *   쉼표는 주소에 올 수 없는 글자가 아니지만(법으로는 올 수 있다), **우리 주소에는 없다.**
 *   우리 주소에 쉼표가 생기는 날이 오면 그때 이 검사를 고치면 된다 — 조용히 틀리는 것보다 낫다.
 */
export function 쉼표로이어붙였나(경로들) {
  return (경로들 || []).filter((x) => String(x).includes(','));
}

function 자가시험() {
  let 실패 = 0, 셈 = 0;
  const 자 = (말, 참) => { 셈++; if (!참) { 실패++; console.error(`  ✕ ${말}`); } };

  자('--host 없이 경로 3개 — 다 살아있다(2026-09-04 전엔 첫 줄이 빠졌다)',
    JSON.stringify(경로파싱(['/a', '/b', '/c', '--dry'])) === JSON.stringify(['/a', '/b', '/c']));
  자('--host 없이 경로 1개 — 그 하나가 살아있다(전엔 0개로 떨어져 사이트 전체로 샜다)',
    JSON.stringify(경로파싱(['/a', '--dry'])) === JSON.stringify(['/a']));
  자('--host X 뒤의 값(X 자신)은 경로가 아니다', JSON.stringify(경로파싱(['--host', 'X', '/a', '/b'])) === JSON.stringify(['/a', '/b']));
  자('--all 만 있으면 경로 0개', JSON.stringify(경로파싱(['--all'])) === JSON.stringify([]));
  /* 🔴 [2026-11-14] 쉼표로 이어 붙인 덩이를 한 장으로 보냈다 — 검사로 막는다 */
  자('쉼표로 이어 붙인 것을 잡는다', 쉼표로이어붙였나(['/a,/b']).length === 1);
  자('성한 경로는 안 잡는다', 쉼표로이어붙였나(['/a', '/b']).length === 0);
  자('여러 개면 여러 개를 다 돌려준다', 쉼표로이어붙였나(['/a,/b', '/c,/d']).length === 2);
  자('⛔ 빈 것에 안 죽는다', 쉼표로이어붙였나(null).length === 0);
  자('아무 인자 없으면 경로 0개', JSON.stringify(경로파싱([])) === JSON.stringify([]));

  console.log(실패 === 0 ? `✅ 자가시험 통과(${셈}개)` : `🔴 자가시험 실패 ${실패}/${셈}건`);
  return 실패 === 0;
}

if (process.argv.includes('--자가시험')) {
  process.exit(자가시험() ? 0 : 1);
}

const KEY = (await readFile(new URL('./.indexnow-key', import.meta.url), 'utf8')).trim();

/**
 * 사이트 등록부 — **새 사이트를 붙이려면 여기 한 줄만 더한다.**
 * ⚠ 붙이기 전에 `https://<호스트>/<키>.txt` 가 **200 인지 먼저 재 본다.** 404 면 통보가 거절된다.
 */
const 사이트들 = {
  'seoulmarkets.com': {
    이름: '서울마켓',
    폴더: '',                                    // dist/
    /* 🔴 [2026-10-04 · 5번] 자가 「사이트맵을 못 찾았다」고 했다. 규칙이 낡은 줄 알고
       `sitemap.xml` 을 받게 넓혔더니 **색인 파일 하나**가 잡혀 그 안의 11장 «주소»를
       지면인 줄 알고 통보할 뻔했다 — 색인은 지면이 아니다.
       ⭐ 진짜 까닭은 따로 있었다 — **그때는 아직 빌드 전이라 dist 에 파일이 없었다.**
       ⚠ 「없다」가 나오면 ① 규칙이 낡았나 ② 아직 안 지었나 — 둘을 갈라 본다.
         내가 ①만 보고 자를 고쳐서 더 나쁜 꼴을 만들 뻔했다. 규칙은 원래대로 둔다. */
    고르기: (f) => /^sitemap-.*\.xml$/.test(f),  // ⚠ 색인용 sitemap.xml 은 뺀다
  },
  '100yearmap.com': {
    이름: '백년지도',
    폴더: '100y/',                               // dist/100y/
    고르기: (f) => f === 'sitemap.xml',          // 한 장
  },
  /* ⚠ **호스트를 `www.` 로 적는다.** 정식 주소가 그것이다(2026-08-06).
   *   Cloudtype 은 CNAME 을 요구하는데 Spaceship 은 루트 CNAME 을 A 로 바꿔 응답해서
   *   **루트(kculturewire.com)는 두 시스템이 영원히 만나지 않는다.** www 로만 붙는다.
   *   IndexNow 는 `host` 와 URL 의 호스트가 어긋나면 **422** 를 준다. 사이트맵도 www 다. */
  'www.kculturewire.com': {
    이름: 'K Culture Wire',
    폴더: 'wikitip/',                            // dist/wikitip/
    고르기: (f) => f === 'sitemap.xml',          // 한 장
  },
  /* 🔴 [2026-09-28 · 5번] **klifemap.ai 가 여기 없어서 한 번도 통보된 적이 없었다.**
   *   매출이 나는 서비스인데 Bing·Yandex·Naver·Seznam 에 아무것도 안 알리고 있었다.
   *   ⚠ 이 자는 원래 «우리 dist/» 를 읽는다. 그런데 klifemap 은 이 저장소가 아니라
   *     형제 저장소에서 «서버가» 그려 내므로 dist 가 없다. 그래서 «라이브 사이트맵»을 읽는다.
   *   ✅ 붙이기 전에 재 봤다 — https://klifemap.ai/<키>.txt 200 · sitemap.xml 200 · 2,850쪽 */
  'klifemap.ai': {
    이름: 'KLifeMap',
    라이브: 'https://klifemap.ai/sitemap.xml',    // dist 가 없다 — 사는 지면에서 읽는다
  },
};

const 기본사이트 = 'seoulmarkets.com';

// ── 인자 읽기 ────────────────────────────────────────────────
const 인자 = process.argv.slice(2);
const 전부 = 인자.includes('--all');
const 시늉 = 인자.includes('--dry');
const 호스트자리 = 인자.indexOf('--host');
const 고른호스트 = 호스트자리 >= 0 ? 인자[호스트자리 + 1] : null;
/** `--host x` 와 `--all`·`--dry` 를 뺀 나머지가 경로다. 자가시험이 도는 순수함수(위 `경로파싱`)를 그대로 쓴다 —
 * 2026-09-04 실측: 옛 코드는 --host 없이 쓸 때 첫 경로 인자를 조용히 빼먹었다(경로 3개 주면 2개만 나갔다). */
const 경로들 = 경로파싱(인자);

if (고른호스트 && !사이트들[고른호스트]) {
  console.error(`모르는 호스트다: ${고른호스트}`);
  console.error(`아는 것 — ${Object.keys(사이트들).join(' · ')}`);
  process.exit(1);
}
/* 🔴 [2026-11-14] 보내기 «전»에 선다. 보내고 나면 되돌릴 수 없다 */
const 쉼표든것 = 쉼표로이어붙였나(경로들);
if (쉼표든것.length) {
  console.error('⛔ 주소에 쉼표가 들어 있다 — 이 자는 주소를 «자리 인자»로 하나씩 받는다.');
  console.error('   쉼표로 이어 붙이면 통째로 «한 주소»가 되어 없는 글이 검색엔진에 통보된다.');
  for (const x of 쉼표든것) console.error(`   · ${String(x).slice(0, 100)}…`);
  console.error('\n   ✅ 이렇게 칩니다 —');
  console.error('      MSYS_NO_PATHCONV=1 node scripts/ping-indexnow.mjs --host <호스트> /a /b /c');
  console.error('   ⚠ klifemap 쪽 tools/indexnow.js 는 `--only a,b,c` 꼴이다. 둘을 섞지 않는다.');
  process.exit(1);
}
if (전부 && 경로들.length) {
  console.error('--all 과 경로를 같이 줄 수 없다. 경로는 한 사이트에만 해당한다.');
  process.exit(1);
}

const 돌릴것 = 전부 ? Object.keys(사이트들) : [고른호스트 ?? 기본사이트];

// ── 사이트맵에서 URL 긁기 ────────────────────────────────────
async function 사이트맵URL(호스트) {
  const 설정 = 사이트들[호스트];
  /* dist 가 없는 사이트(klifemap)는 «사는 지면»의 사이트맵을 그대로 읽는다.
     ⛔ 못 읽었을 때 조용히 0건으로 넘어가지 않는다 — 0건은 성공처럼 보인다 */
  if (설정.라이브) {
    try {
      const r = await fetch(설정.라이브, { signal: AbortSignal.timeout(30000) });
      if (!r.ok) { console.error(`⛔ ${호스트}: 라이브 사이트맵 ${r.status}`); return []; }
      const xml = await r.text();
      const out = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
      if (!out.length) { console.error(`⛔ ${호스트}: 라이브 사이트맵에 <loc> 이 없다`); return []; }
      return out;
    } catch (e) {
      console.error(`⛔ ${호스트}: 라이브 사이트맵을 못 읽었다 — ${String(e.message).slice(0, 60)}`);
      return [];
    }
  }

  const dir = new URL(`../dist/${설정.폴더}`, import.meta.url);
  if (!existsSync(dir)) {
    console.error(`⛔ ${호스트}: dist/${설정.폴더} 가 없다. 먼저 빌드했는지 본다.`);
    return [];
  }
  const files = (await readdir(dir)).filter(설정.고르기);
  if (!files.length) {
    /* ⚠ 여기서 조용히 넘어가면 「0건 보냈다」가 성공처럼 보인다. 반드시 말한다 */
    console.error(`⛔ ${호스트}: dist/${설정.폴더} 에서 사이트맵을 못 찾았다. 규칙이 바뀌었나 본다.`);
    return [];
  }
  const out = [];
  for (const f of files) {
    const xml = await readFile(new URL(f, dir), 'utf8');
    for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) out.push(m[1]);
  }
  return out;
}

// ── 한 사이트 통보 ───────────────────────────────────────────
async function 통보(호스트) {
  const ORIGIN = `https://${호스트}`;
  const urlList = 경로들.length ? 경로들.map((p) => new URL(p, ORIGIN).href) : await 사이트맵URL(호스트);

  if (urlList.length === 0) {
    console.error(`⛔ ${호스트}: 통보할 URL 이 없다.`);
    return false;
  }
  /* ⚠ 사이트맵에 **남의 호스트 URL** 이 섞이면 IndexNow 가 통째로 거절한다. 먼저 거른다 */
  const 남의것 = urlList.filter((u) => new URL(u).host !== 호스트);
  if (남의것.length) {
    console.error(`⛔ ${호스트}: 통보할 URL 가운데 ${남의것.length}개가 다른 호스트다 — ${남의것[0]}`);
    /* 🔴 [2026-10-06 20:59 · 5번] **이 자물쇠가 맞게 막았는데 «엉뚱한 까닭»을 말했다.**
       오늘 내가 Git Bash 에서 `--host seoulmarkets.com / /companies` 라고 쳤더니
       MSYS 가 `/` 를 `c:/Program Files/Git/` 로 바꿔 넣었다. 그런데 자는
       「사이트맵에 다른 호스트가 섞여 있다」고 말했다 — 사이트맵은 멀쩡했다.
       ⇒ 까닭을 틀리게 말하는 자물쇠는 사람을 엉뚱한 데로 보낸다. 거짓 빨강만큼 비싸다.
       ⛔ 막는 것은 그대로 둔다. 말만 고친다. */
    if (남의것.some((u) => /Program%20Files|Program Files|^file:/i.test(u))) {
      console.error('   ⭐ 이것은 사이트맵 탈이 아니다 — **Git Bash 가 `/` 를 윈도 경로로 바꾼 것**이다');
      console.error('      ✅ 앞에 MSYS_NO_PATHCONV=1 을 붙여서 다시 치십시오');
      console.error('         MSYS_NO_PATHCONV=1 node scripts/ping-indexnow.mjs --host <호스트> / /a /b');
    }
    return false;
  }

  if (시늉) {
    console.log(
      `[시늉] ${사이트들[호스트].이름} ${호스트} · ${urlList.length} URL(s) · 안 보냈다\n` +
        `        첫 줄 ${urlList[0]}\n        끝 줄 ${urlList[urlList.length - 1]}`,
    );
    return true;
  }

  const res = await fetch('https://api.indexnow.org/IndexNow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: 호스트, key: KEY, keyLocation: `${ORIGIN}/${KEY}.txt`, urlList }),
  });

  console.log(`IndexNow ${res.status} ${res.statusText} — ${사이트들[호스트].이름} ${호스트} · ${urlList.length} URL(s)`);

  /**
   * 🔴 2026-08-26 22:4x (5번) — **보낸 것을 «적지» 않고 있었다.**
   *   배포 관문(`check-deploy-ready.mjs`)은 `archive/indexnow-kcw.json` 을 읽어
   *   「색인 알림을 한 번도 못 받은 지면 117장」이라고 말한다. 그런데 그 기록을 적는 쪽은
   *   `check-kcw-indexnow.mjs` 뿐이고, **정작 통보를 «보내는» 이 자는 아무것도 안 적었다.**
   *   그래서 여기서 2,715장을 보내 200 을 받아도 관문의 수는 그대로 117 이었다.
   *   ⛔ 이건 「덜 알렸다」가 아니라 **자가 서로 안 맞물린 것**이다. 틀린 숫자가 남는다.
   *
   * ⛔ 6번 동작을 깨지 않는다 — 서울마켓·백년지도에는 이 기록이 없으므로 건너뛴다.
   * ⛔ try/catch 로 감싼다. 기록에 실패해도 «통보 자체»는 이미 성공한 것이다.
   */
  if (res.ok && 호스트 === 'www.kculturewire.com') {
    try {
      const { 기록길, 기록읽기, 적기, 오늘KST } = await import('./check-kcw-indexnow.mjs');
      const { mkdirSync, writeFileSync } = await import('node:fs');
      const path = (await import('node:path')).default;
      const 길들 = urlList.map((u) => new URL(u).pathname);
      /**
       * 🔴 `오늘KST` 는 «함수»다. 값인 줄 알고 그대로 넘겼다가 한 번 걸렸다 —
       *   함수를 넣으면 `JSON.stringify` 가 그 칸을 **통째로 빼 버려서**, 파일은 써지는데
       *   새 지면이 하나도 안 적힌다. 오류도 안 난다. **조용히 아무것도 안 하는 흠**이었다.
       *   ⭐ 그래서 적은 뒤에 «다시 읽어» 정말 들어갔는지 본다. 쓰고 끝내지 않는다.
       */
      const 날 = 오늘KST();
      mkdirSync(path.dirname(기록길), { recursive: true });
      writeFileSync(기록길, `${JSON.stringify(적기(길들, 날, 기록읽기()), null, 2)}\n`);
      const 다시 = 기록읽기();
      const 들어간수 = 길들.filter((p) => 다시.pinged?.[p]).length;
      if (들어간수 === 길들.length) {
        console.log(`   ✅ 보낸 ${길들.length}장을 기록에 적었다(${날}) — 관문의 「안 알린 장수」가 이제 맞는다`);
      } else {
        console.log(`   🔴 적었다는데 다시 읽으니 ${들어간수}/${길들.length}장뿐이다 — **기록이 안 맞는다**`);
        console.log('      ⛔ 통보는 갔다. 그러나 관문의 수는 믿지 마라.');
      }
    } catch (e) {
      console.log(`   ⚠ 통보는 갔는데 **기록은 못 적었다** — ${e.message}`);
      console.log('      ⛔ 「안 알린 지면 N장」이 실제보다 많게 보일 수 있다. 0 으로 읽지 않는다.');
    }
  }

  /* 🔴🔴 [2026-10-09 · 5번] **네 곳 모두** 보낸 날을 적는다.
     ⛔ 위 기록은 K Culture Wire 만이다. 나머지 셋은 언제 보냈는지 아무 데도 안 적혀
       있었고, 그래서 서울마켓 7,949장·KLifeMap 3,044장이 **한 번도 안 나간 것을
       아무도 몰랐다.** 재는 자가 없으면 안 한 것이 안 한 줄로 안 보인다.
     ⛔ 손으로 적게 두지 않는다 — 보내는 자리에서 바로 적는다.
     ⚠ try/catch — 기록에 실패해도 «통보 자체»는 이미 성공한 것이다. */
  if (res.ok) {
    try {
      const { 기록길: 보낸기록길, 오늘글 } = await import('./check-indexnow-보냈나.mjs');
      const { existsSync, writeFileSync, appendFileSync } = await import('node:fs');
      if (!existsSync(보낸기록길)) {
        writeFileSync(보낸기록길, '# IndexNow 보낸 기록 — 날\t호스트\t장수\n', 'utf8');
      }
      appendFileSync(보낸기록길, `${오늘글()}\t${호스트}\t${urlList.length}\n`, 'utf8');
      /* 🔴🔴 [2026-10-13 04:5x · 5번] **무엇을 쳤는지가 안 남고 있었다.**
         ─────────────────────────────────────────────────────────────
         대장에 「날 · 호스트 · 장수」만 적었다. 그래서 오늘 새벽에
         「이 데이터 지면을 구글에 알렸나」를 물었을 때 **가릴 수가 없었다.**
         ⛔ 「쳤다」는 기록이 있는데 「무엇을 쳤나」가 없으면,
           색인이 안 될 때 **우리가 안 알린 것인지 알리고도 안 온 것인지** 모른다.
           그 둘은 처방이 다르다 — 앞엣것은 치면 되고 뒤엣것은 기다리거나 내용을 고친다.
         ⚠ 전체를 칠 때는 장수가 7,949까지 간다. 그것을 다 적으면 대장이 못 읽게 된다.
           ⇒ **200장 이하일 때만** 주소를 적는다. 그 위는 「전체」라고만 적는다.
         ⚠ 이것도 try 안이다 — 적기에 실패해도 통보 자체는 이미 성공했다. */
      const 주소대장 = 보낸기록길.replace(/\.tsv$/, '-주소.tsv');
      if (!existsSync(주소대장)) {
        writeFileSync(주소대장, '# IndexNow 보낸 «주소» — 날\t호스트\t주소\n', 'utf8');
      }
      if (urlList.length <= 200) {
        appendFileSync(주소대장,
          urlList.map((u) => `${오늘글()}\t${호스트}\t${u}`).join('\n') + '\n', 'utf8');
      } else {
        appendFileSync(주소대장, `${오늘글()}\t${호스트}\t(전체 ${urlList.length}장 — 주소를 안 적었다)\n`, 'utf8');
      }
      console.log('   ✔ 보낸 날을 적었다 — docs/indexnow-보낸기록.tsv');
      console.log('   ✔ 보낸 «주소»도 적었다 — docs/indexnow-보낸기록-주소.tsv');
    } catch (e) {
      console.log(`   ⚠ 통보는 갔는데 **보낸 날은 못 적었다** — ${e.message}`);
      console.log('      ⛔ 다음에 검사가 「모른다」고 할 것이다. 「안 보냈다」로 읽지 마라.');
    }
  }

  if (!res.ok) {
    const 몸 = await res.text();
    console.log(몸);
    /**
     * ⚠ **403 이 두 가지다.** 처음엔 「키 파일 404」 하나로만 알고 안내를 적었는데,
     *   8/6 에 키 파일이 200 인데도 403 이 났다. 원인이 달랐다.
     */
    if (res.status === 403) {
      if (/SiteVerificationNotCompleted/i.test(몸)) {
        console.log(
          `⚠ 키 파일은 있는데 **IndexNow 쪽 확인이 아직 안 끝났다.**\n` +
            `   키 파일을 방금 올렸으면 정상이다. **조금 뒤에 다시 돌린다.**\n` +
            `   (8/6 실측 — 키 파일 배포 직후엔 이 오류가 났다)`,
        );
      } else {
        console.log(`⚠ ${ORIGIN}/<키>.txt 가 200 인지 먼저 본다. 404 면 그것부터 고친다.`);
      }
    }
  }
  return res.ok;
}

let 실패 = 0;
for (const 호스트 of 돌릴것) if (!(await 통보(호스트))) 실패++;
process.exit(실패 ? 1 : 0);
