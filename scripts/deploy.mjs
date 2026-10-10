#!/usr/bin/env node
/**
 * 배포 — **혼자 하지 않는다.**
 *
 *   npm run deploy              점검 → 통보 → 배포 → 확인
 *   npm run deploy -- --check   점검만 한다 (배포하지 않는다)
 *   npm run deploy -- --force   경고를 무시하고 강행 (사장님 지시가 있을 때만)
 *
 * ── 왜 만들었나 ────────────────────────────────────────────────
 * 2026-08-03 21:26 에 seoulmarkets 를, 21:30 에 klifemap 을 배포했다.
 * **4분 차이로 겹쳤고 내 롤링 업데이트가 25분 넘게 멈췄다.**
 * 총 1GB 를 나눠 쓰는데 롤링 업데이트에는 순간적으로 **두 배**가 필요하다.
 *
 * 사장님 지시: 「배포는 서로 통보하고 하는 규칙을 공유해라」
 *
 * ⚠ **말로 하는 규칙은 잊힌다.** 그날 나는 세션간 메모에 「곧 apply 합니다」라고
 *   적어 뒀는데도 겹쳤다. 적는 것만으로는 안 막힌다. 그래서 코드로 막는다.
 *   (필수지시 11 — 사람을 거치는 계획을 세우지 않는다. 도구로 푼다)
 *
 * ── 어떻게 막나 ────────────────────────────────────────────────
 * ① **락 파일** — 두 저장소 바깥, 공통 상위 폴더에 둔다.
 *    두 세션이 같은 PC 에서 도니 이 파일 하나로 서로를 본다.
 *      C:\Users\USER\Documents\GitHub\.cloudtype-deploy-lock.json
 *    ⚠ 저장소 안에 두면 안 된다 — 저장소가 달라서 서로 안 보인다.
 * ② **상대 상태 확인** — 상대 스테이지가 Running 이 아니면 멈춘다.
 *    배포 중인 것을 밀면 둘 다 죽는다.
 * ③ **통보** — 세션간 메모에 시각과 함께 자동으로 적는다. 손으로 적지 않는다.
 * ④ **확인** — 뜰 때까지 지켜보고, 실패하면 실패했다고 말한다.
 *
 * 락은 **20분이 지나면 만료**로 본다. 세션이 죽어 락이 남으면 영영 배포를 못 하니까.
 */

import { readFileSync, writeFileSync, existsSync, unlinkSync, appendFileSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import https from 'node:https';

/**
 * 🔴 2026-08-08 05:4x — **자리(cwd)를 안 박아 둬서 배포가 「성공」이라 하고 아무것도 안 나갔다.**
 *
 *   바탕화면 `00_세션입구` 에서 부르니 `.cloudtype/app.yaml` 을 못 찾았다.
 *   그런데 **ctype 이 조용히 넘어가고**, 있던 통을 그냥 되살렸다 —
 *   60초 만에 `Running` 이 떴고(4,807장을 지을 시간이 아니다) 라이브는 200 이었다.
 *   그래서 이 스크립트가 **「✅ 나갔다」로 끝냈다.** 3번이 낸 길은 라이브에 없었다.
 *
 *   ⛔ 「성공」이라 말하면서 아무것도 안 나가는 것이 가장 나쁜 꼴이다.
 *      멎는 것은 눈에 보이지만 이건 안 보인다.
 *   ✅ 부른 자리가 어디든 **이 파일 옆 저장소**를 쓴다. `check-riot-key.mjs` 를 고친 것과 같은 꼴이다.
 */
const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** ⚠ 저장소 **바깥**이다. klifemap 세션도 같은 경로를 본다. */
const LOCK = path.resolve('C:/Users/USER/Documents/GitHub/.cloudtype-deploy-lock.json');
/** ⚠ `probe` — 그 프로젝트가 **실제로 살아 있나**를 볼 주소. 표시가 멎었는지 가릴 때 쓴다 */
const 나 = { project: 'seoulmarkets', stage: '@parkintaek2/seoulmarkets:main', app: 'web', probe: 'https://seoulmarkets.com/' };

/* 🔴🔴 [2026-08-26 · 5번이 재서 고침] **메모에 「[SeoulMarkets] 배포 완료」로 825번 찍혀 있었다.**
   ─────────────────────────────────────────────────────────────────────────
   [무엇이 있었나] 이 스테이지 하나가 **세 사이트를 같이** 낸다 —
     seoulmarkets.com(6번) · 100yearmap.com(3번) · www.kculturewire.com(5번).
     그런데 배포 알림은 언제나 「[SeoulMarkets]」로 나갔다.
   ⛔ 그래서 5번이 사람 지면 636장을 밀어도 메모에는 **「SeoulMarkets 배포 완료」**로
     남는다. 6번이 그것을 읽으면 «자기 것이 나간 줄» 안다 —
     어제 5번 배포 줄 바로 위에 6번의 진행 줄이 있어 실제로 그렇게 읽히는 자리였다.
   ⚠ 스테이지 이름이 seoulmarkets 인 것은 «맞다». 틀린 것은 그것을 «사이트 이름»처럼
     보이게 적은 것이다. 그래서 「스테이지」라고 밝혀 적는다.
   ⚠ 이 글자를 읽어 가는 자는 없다(scripts·tools 전수 0건). 메모에만 남는다. */
const 딱지 = `[배포 · ${나.project} 스테이지]`;

/** 이 스테이지가 같이 내는 사이트들 — 알림에 한 번 밝혀 준다.
 *  ⛔ 「무엇이 나갔나」를 사람이 짐작하지 않게 한다. */
const 같이나가는곳 = 'seoulmarkets.com · 100yearmap.com · www.kculturewire.com';
const 상대 = { project: 'klifemap', stage: '@parkintaek2/klifemap:main', app: 'klifemap-app', probe: 'https://klifemap.ai/' };
const 락만료분 = 20;

const argv = process.argv.slice(2);
const CHECK_ONLY = argv.includes('--check');
const FORCE = argv.includes('--force');

/**
 * 🔴 **표식** — 이번 커밋이 실제로 바꾼 것 하나를 라이브에서 집는다 (2번 지시 2026-08-08 18:2x).
 *
 *   ```
 *   node scripts/deploy.mjs --표식 https://…/subscribe "15 August"
 *   ```
 *
 * ## 왜 (2번)
 *
 *   *「오늘 사장님을 제일 오래 기다리게 한 것이 배포입니다 …
 *     **다 끝났는데 배포기가 「보류」라고 해서 아무도 끝난 줄 몰랐던 것**」*
 *
 *   이 자는 이미 「새로 나갈 지면」과 「지문」으로 판정한다. 그래도 못 잡는 자리가 있다 —
 *   ⛔ **바뀐 것이 지면 목록에도 지문에도 안 잡히는 배포**(설정·헤더·리다이렉트 …).
 *   그때 부르는 쪽이 **무엇이 바뀌었는지 아는 유일한 사람**이라 손으로 넘기게 한다.
 *
 * ## ⛔ 표식이 배포 **전에 이미** 라이브에 있으면 쓰지 않는다
 *
 *   그건 **가짜 성공**이다. 배포가 안 나가도 처음부터 ✅ 가 뜬다.
 *   그래서 배포를 걸기 전에 한 번 집어 보고, 이미 있으면 **그 표식을 버린다**(배포는 계속한다).
 *
 * ## ⚠ 표식이 없으면 「보류」가 아니라 **「모름」**이다
 *
 *   *「⛔ 「보류」는 사람이 「다시 돌려야 하나」로 읽습니다. 오늘 그래서 겹쳐 돌린 사람이 있었습니다」*
 */
/**
 * 🔴 Git Bash(MSYS)가 `/` 로 시작하는 인자를 **윈도 경로로 바꿔** 버린다 (5번이 잡음, 2026-08-09 03:5x).
 *
 * ```
 * 넣은 것   --표식 https://…/sitemap.xml "/market/vietnam"
 * 받은 것   "C:/Program Files/Git/market/vietnam"      ← 낱말이 통째로 딴것이 됐다
 * 그래서    배포는 제대로 나갔는데 판정만 ❌ 「안 나갔다」로 찍혔다
 * ```
 *
 * ⛔ 이건 쓰는 사람 잘못이 아니다. **자가 되돌려 놓는다.**
 * ⚠ 되돌린 것은 화면에 찍는다 — 조용히 고치면 다음 사람이 또 속는다.
 */
/**
 * 🔴🔴 [2026-08-29 · 5번] **표식이 «지면에 아예 없는 글자»면 배포가 나가도 ❌ 가 찍힌다.**
 *
 * 오늘 이 자리에 걸렸다 — 숏영상을 /person 에 싣고 표식을 「Two rulers」로 줬다.
 * 그 글자는 **영상 «안»에만** 있고 지면 HTML 에는 없다. 배포는 제대로 나갔는데
 * 자는 「안 나갔다」고 했다.
 *
 * ⛔ 헛경보는 «못 잡은 것»만큼 나쁘다. 자가 거짓말을 두 번 하면 사람이 자를 안 본다.
 * ⭐ 그런데 이건 **배포 전에 알 수 있다** — 우리가 방금 지은 dist 안에 그 글자가
 *   있는지 보면 된다. 없으면 라이브에도 영원히 안 나타난다.
 *
 * ⚠ dist 에서 그 지면을 «못 찾으면» 「없다」가 아니라 **「못 쟀다」**다(null).
 *   0 으로 채우지 않는 것과 같은 뜻이다 — 못 쟀으면 막지 않는다.
 */
export function 낸것에표식있나(주소, 낱말, 있나 = existsSync, 읽기 = (p) => readFileSync(p, 'utf8')) {
  let 길;
  try { 길 = new URL(String(주소)).pathname; } catch { return null; }
  const 몸 = decodeURIComponent(길).replace(/^\/+/, '').replace(/\/$/, '');
  const 벗김 = 몸.replace(/^wikitip\//, '');
  /* ⚠ 여섯 유닛이 한 dist 를 쓴다. 갈래마다 자리가 달라 후보를 다 본다 */
  const 후보 = 몸 === ''
    ? ['dist/index.html', 'dist/wikitip/index.html']
    : [`dist/wikitip/${벗김}.html`, `dist/wikitip/${벗김}/index.html`,
      `dist/${몸}.html`, `dist/${몸}/index.html`];
  for (const c of 후보) {
    const p = path.join(뿌리, c);
    if (!있나(p)) continue;
    try { return String(읽기(p)).includes(String(낱말)); } catch { return null; }
  }
  return null;   /* 못 찾았다 = 못 쟀다 */
}

export function 경로되돌리기(낱말) {
  const 글 = String(낱말 ?? '');
  const m = /^[A-Za-z]:[\\/](?:.*[\\/])?Git[\\/](.*)$/.exec(글);
  if (!m) return { 낱말: 글, 되돌렸나: false };
  return { 낱말: '/' + m[1].replace(/\\/g, '/'), 되돌렸나: true };
}

function 표식읽기(a = argv) {
  const i = a.findIndex((x) => x === '--표식' || x === '--marker');
  if (i < 0) return null;
  const 주소 = a[i + 1];
  let 낱말 = a[i + 2];
  if (!주소 || !낱말 || 주소.startsWith('--') || 낱말.startsWith('--')) return null;
  if (!/^https?:\/\//.test(주소)) return null;
  const 되돌린 = 경로되돌리기(낱말);
  if (되돌린.되돌렸나) {
    console.log(`⚠ 표식이 Git Bash 에 뭉개져 있었다 — 되돌렸다: ${낱말}  →  ${되돌린.낱말}`);
    낱말 = 되돌린.낱말;
  }
  return { 주소, 낱말 };
}
const 표식 = 표식읽기();

const 지금 = () => new Date(); // 이 PC 는 KST 다. 9시간을 더하지 않는다
const 시각 = (d = 지금()) => d.toLocaleString('ko-KR', { hour12: false });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * 🔴 빌드가 깨졌다 — **배포를 하지 않는다.**
 * ⚠ 「판정을 못 한다」와 다른 말이다. 구울 수가 없으면 배포는 뜻이 없다.
 *   자세한 까닭은 아래 build-once 를 부르는 자리의 주석에 있다(2026-09-04).
 */
export class 빌드실패 extends Error {
  constructor(글) {
    super('빌드가 깨졌다');
    this.name = '빌드실패';
    this.글 = String(글 || '');
  }

  /** 오류 글에서 «사람이 고칠 수 있는 한 줄»을 뽑는다. 없으면 null — 억지로 만들지 않는다 */
  get짚은곳() {
    return 빌드오류짚기(this.글);
  }
}

/**
 * 빌드 오류 글에서 「어느 파일이 왜」를 뽑는다.
 * ⚠ 못 뽑으면 `null` 이다. 「없다」가 아니라 **「못 짚었다」**로 내보낸다 —
 *   그러면 부르는 쪽이 원문 전체를 보여 준다.
 */
export function 빌드오류짚기(글) {
  const s = String(글 || '').replace(/\[[0-9;]*m/g, '');   // 색코드를 지운다
  /* Astro 콘텐츠 스키마 오류 — 우리가 제일 자주 내는 꼴이다 */
  const m = s.match(/InvalidContentEntryDataError\][^\n]*?([A-Za-z0-9_]+)\s*→\s*([^\s]+)/);
  const 까닭 = s.match(/^\s*([A-Za-z]+):\s*(Too big[^\n]*|Too small[^\n]*|Invalid[^\n]*|Required[^\n]*)/m);
  if (m) {
    return {
      꼴: '콘텐츠스키마',
      묶음: m[1],
      글쪽: m[2],
      까닭: 까닭 ? `${까닭[1]}: ${까닭[2].trim()}` : null,
      고치는곳: `content/*/${m[2]}.md 의 frontmatter`,
    };
  }
  const 길 = s.match(/^\s*(?:Location:\s*\n\s*)?([A-Za-z]:[\\/][^\n:]+\.(?:md|astro|ts|mjs|js))/m);
  if (길) return { 꼴: '파일', 글쪽: null, 까닭: null, 고치는곳: 길[1] };
  return null;
}

/** ⚠ `-t` 없이 부르지 않는다. 없으면 전역 스테이지로 튀어 남의 프로젝트에 배포된다. */
function ctype(args) {
  try {
    /* ⚠ `cwd: 뿌리` — 어디서 부르든 저장소에서 돌게 한다. 이게 없어 배포가 헛돌았다 */
    return execFileSync('ctype', args, { encoding: 'utf8', timeout: 120000, shell: true, cwd: 뿌리 });
  } catch (e) {
    return (e.stdout ?? '') + (e.stderr ?? '');
  }
}

/**
 * ⛔ **ctype 이 「파일이 없다」를 조용히 넘긴다.** 그러면 안 나간 것을 나갔다고 적게 된다.
 *    그 말이 보이면 성공으로 읽지 않는다.
 *
 * ⭐ 2026-08-22 03:4x 추가 — **로그인이 안 돼 있어도 exit 0 이다.**
 *   데스크톱 이사 뒤 `.cloudtype` 계정이 새 PC 에 없는데 `ctype apply` 가
 *   "Login required." 만 찍고 조용히 성공으로 끝났다(6번 실측 — 35편 라이브 404).
 *   이 말도 헛돎이다.
 */
export function 헛돌았나(출력) {
  return /not found|no such file|login required|not logged in|unauthorized/i.test(String(출력 ?? ''));
}

/** 스테이지의 앱 상태를 읽는다. 색코드가 섞여 오므로 지운다. */
/**
 * ctype 이 찍어 준 갱신 시각이 몇 분 지났나. 못 읽으면 **null — 짐작하지 않는다.**
 * ⚠ null 을 0 으로 보면 「방금 갱신됐다」가 되어 막는 쪽으로 기울고, 큰 수로 보면 미는 쪽으로 기운다.
 *   못 읽으면 **막는 쪽**이 안전하므로 부르는 자리에서 null 을 「멎지 않았다」로 쓴다.
 */
export function 갱신지난분(적힌시각, 지금 = new Date()) {
  const t = Date.parse(String(적힌시각 ?? '').trim().replace(' ', 'T'));
  if (Number.isNaN(t)) return null;
  const 분 = (지금.getTime() - t) / 60000;
  /* ⚠ 2026-08-08 02:3x — **화면에 「12분째」라 적어 놓고 막았다.**
   *   판정은 11.6 으로 하고 표시만 반올림해 12 로 보여 줬다.
   *   ⛔ **적은 수와 잰 수가 다르면 사람이 도구를 못 믿는다.** 내림으로 맞춘다 —
   *      이제 화면의 수가 곧 판정에 쓴 수다. */
  return 분 < 0 ? 0 : Math.floor(분);
}

/** 그 주소가 실제로 열리나. 못 열리면 false — 배포 중일 수 있으니 막는 쪽으로 쓴다 */
function 살아서열리나(주소) {
  if (!주소) return Promise.resolve(false);
  return new Promise((r) => {
    https
      .get(주소, { timeout: 10000 }, (res) => { res.resume(); r(res.statusCode >= 200 && res.statusCode < 400); })
      .on('error', () => r(false))
      .on('timeout', function () { this.destroy(); r(false); });
  });
}

function 상태(stage, app) {
  const out = ctype(['ls', '-t', stage]).replace(/\x1b\[[0-9;]*m/g, '');
  for (const line of out.split(/\r?\n/)) {
    const c = line.trim().split(/\s{2,}/);
    if (c[0] === app) return { status: c[2] ?? '?', updated: c.slice(-1)[0] ?? '' };
  }
  return { status: '알 수 없음', updated: '', raw: out.slice(0, 300) };
}

/**
 * 락을 건 프로세스가 아직 살아 있는가.
 *
 * ⚠ **죽은 프로세스는 배포하고 있지 않다.** 그런데 락은 남는다.
 *   2026-08-07 하루에 **세 번** 이 자물쇠에 막혔다 — 배포가 중간에 끊길 때마다 남았고,
 *   그때마다 20분을 기다리거나 손으로 지웠다. 손으로 지우는 것은 **위험하다** —
 *   진짜 도는 배포를 지울 수 있다. 그래서 **pid 가 살아 있는지로 가린다.**
 *
 * ⛔ 다른 프로젝트(klifemap)의 pid 는 이 PC 의 것이지만 확실치 않을 수 있어,
 *   **내 프로젝트 락에만** 이 판정을 쓴다. 남의 것은 시간으로만 만료시킨다.
 */
export function 살아있나(pid) {
  if (!pid) return true; // pid 가 없는 옛 락은 살아 있는 것으로 본다(안전한 쪽)
  try {
    process.kill(pid, 0); // 신호 0 은 죽이지 않는다. 있는지만 묻는다
    return true;
  } catch (e) {
    return e.code === 'EPERM'; // 남의 계정 것이면 살아 있는 것이다
  }
}

function 락읽기() {
  if (!existsSync(LOCK)) return null;
  try {
    const j = JSON.parse(readFileSync(LOCK, 'utf8'));
    const 지난분 = (Date.now() - new Date(j.startedAt).getTime()) / 60000;
    return { ...j, 지난분, 임자살아있다: 살아있나(j.pid) };
  } catch {
    return null; // 깨진 락은 없는 것으로 본다
  }
}

/**
 * **상대가 지금 진짜로 배포 중인가** — 표시가 아니라 락으로 본다.
 *
 * ⛔ ctype 의 `Starting` 은 배포가 끝난 뒤에도 오래 남는다. 오늘만 네 번 그것에 막혔다.
 * ✅ 락은 배포를 내는 쪽이 직접 쓰고, 끝나면 지운다. **없으면 아무도 안 하고 있는 것이다.**
 *
 * `락` 은 `락읽기()` 가 준 것(없으면 null). 판정에 쓰는 것은 셋뿐이다 —
 * 누구 것인가 · 임자가 살아 있나 · 너무 오래됐나.
 */
export function 상대가배포중인가(락, 상대이름, 만료분 = 20) {
  if (!락) return false;                       // 아무도 안 쥐고 있다
  if (락.project !== 상대이름) return false;    // 내 락이거나 남의 것이다
  if (락.임자살아있다 === false) return false;  // 임자가 죽었다 — 남은 자국일 뿐이다
  if (typeof 락.지난분 === 'number' && 락.지난분 > 만료분) return false; // 너무 오래됐다
  return true;
}

/**
 * 상대 스테이지 표시가 **「죽어 있다」**인가.
 *
 * 🔴 [2026-08-27] 이 갈래가 없어서 사고가 났다 — 아래 `지나가도되나` 주석을 보라.
 */
export function 멎어있나(상태글자) {
  return String(상태글자 || '').trim().toLowerCase() === 'stopped';
}

/**
 * **상대 프로젝트 때문에 멈춰야 하나, 지나가도 되나.**
 *
 * 🔴🔴 2026-08-27 14:2x — **자 둘이 서로를 막아 네 사이트가 다 죽은 채로 잠겼다.**
 *
 *   klifemap 이 Stopped 로 멎자 이 자가 「배포 중인 것을 밀면 둘 다 죽는다」며 막았고,
 *   같은 시각 klifemap 쪽 자는 「seoulmarkets 가 Running 이 아니다」며 기다렸다.
 *   seoulmarkets.com · kculturewire.com · 100yearmap.com · klifemap.ai 가 전부 404 인데
 *   **되살릴 길이 두 자에 다 잠겨 있었다.**
 *
 *   무엇이 틀렸나 — 옛 조건이 `상대살았나`(사이트 200)를 **반드시** 요구했다.
 *   그런데 상대가 «죽어 있을» 때가 바로 사이트가 200 을 못 주는 때다.
 *   그러니 「상대가 죽었다」와 「상대가 배포 중이다」를 **같은 것으로 다루고 있었다.**
 *   둘은 정반대다 —
 *
 *     Starting · Building · Pending  진짜 도는 중일 수 있다 → 밀면 둘 다 죽는다. **막는다**
 *     Stopped                        도는 것이 없다        → 밀 것이 없다. **막지 않는다**
 *
 * ⛔ 그래도 **락은 그대로 본다.** 락을 쥔 사람이 있으면 Stopped 라도 막는다 —
 *   방금 `ctype update` 를 눌러 아직 표시가 안 바뀐 것일 수 있다.
 *
 * @returns true 면 「지나가도 된다」(막지 않는다)
 */
export function 지나가도되나({ 상대상태, 상대살았나, 락으로본배포중, 지난분 } = {}) {
  if (락으로본배포중) {
    /* 락은 «우리가 직접 쓰는 사실»이다. 쥔 사람이 있으면 표시가 무엇이든 막는다.
       ⚠ 다만 락이 12분을 넘겼고 상대 사이트가 살아 있으면 옛 규칙대로 지나간다. */
    return !!(상대살았나 && 지난분 !== null && 지난분 !== undefined && 지난분 >= 12);
  }
  if (멎어있나(상대상태)) return true;   // 🔴 죽어 있다 = 도는 것이 없다 = 막을 까닭이 없다
  return !!상대살았나;                   // 표시는 이상해도 사이트가 200 이면 멎은 표시로 본다
}

/**
 * 🔴🔴 [2026-08-28 02:2x · 5번] **자물쇠에 「누가·무엇을」을 적는다. 제 자물쇠를 남의 것으로 읽었습니다.**
 * ─────────────────────────────────────────────────────────────────────────
 * [무엇이 있었나] 새벽에 `/title` 556장을 배포하고 자물쇠 파일을 열어 보니
 *   `{"project":"seoulmarkets", ...}` 라고만 적혀 있었다. 그래서 **「6번이 배포 중이구나,
 *   줄 서야겠다」**고 읽고 사장님께 그렇게 보고까지 했다. **제 것이었다.**
 *
 * ⛔ 더 나쁜 것 — **이 오해를 막는 주석을 제가 이 파일 위쪽에 8/26 에 써 놨다.**
 *   「스테이지 이름이 seoulmarkets 인 것은 맞다. 틀린 것은 그것을 «사이트 이름»처럼
 *    보이게 적은 것이다」. 경고를 써 놓고 이틀 뒤에 제가 그 경고에 걸렸다.
 * ⚠ **주석은 이 파일을 여는 사람만 지킨다. 자물쇠 파일을 여는 사람은 이 파일을 안 연다.**
 * ⭐ 그러니 고칠 자리는 주석이 아니라 **자물쇠 파일 그 자체**다 —
 *   읽는 자리에 뜻이 적혀 있어야 한다.
 */
function 락걸기(사유) {
  writeFileSync(
    LOCK,
    JSON.stringify({
      project: 나.project,
      stage: 나.stage,
      /* ⭐ 사람이 읽는 자리 — 「누가 잡았나」와 「무엇이 같이 나가나」를 짐작하지 않게 적는다 */
      누가: '5번(K Culture Wire)',
      '⚠ 스테이지 이름이 곧 사이트 이름이 아니다': `이 스테이지 하나가 세 사이트를 같이 낸다 — ${같이나가는곳}`,
      '이 자물쇠가 막는 것': '같은 스테이지에 두 배포가 겹치는 것',
      startedAt: 지금().toISOString(),
      '언제 저절로 풀리나': `${락만료분}분 뒤`,
      pid: process.pid,
      note: 사유,
    }, null, 2),
  );
}

/**
 * 지켜보기가 끊겼을 때 메모에 남기는 글.
 *
 * ⛔ 이 글에서 «빠지면 안 되는» 것 셋이 있다. 오늘(2026-09-09) 그 셋이 없어서 사고가 났다 —
 *   1. 「배포 자체는 이미 나갔다」 — 없으면 다음 사람이 실패로 읽는다
 *   2. 「지면으로 판정하라」 — ctype 표시는 배포가 끝난 뒤에도 오래 남는다
 *   3. 「남의 미커밋을 stash 하지 마라」 — 3번이 실제로 그렇게 하셨다. 원인이 아니었다
 */
export function 끊긴통보문(딱지, 신호, 시각글) {
  return `> ⚠ **${딱지} 지켜보기가 끊겼다 ${시각글} KST** (${신호}) — **배포 자체는 이미 나갔다.**\n`
    + '> ⛔ 이 줄을 「배포 실패」로 읽지 마십시오. 라이브는 «지면으로» 판정하십시오 —\n'
    + '> `curl -s -o /dev/null -w "%{http_code}" https://seoulmarkets.com/` 와 `public/deploy-stamp.txt` 대조.\n'
    + '> ⚠ 남의 미커밋 파일을 stash 하지 마십시오. 그것은 배포 막힘의 원인이 아닙니다.';
}

function 락풀기() {
  const j = 락읽기();
  // 남의 락은 절대 지우지 않는다
  if (j && j.project === 나.project) unlinkSync(LOCK);
}

/** 세션간 메모에 자동으로 적는다. 손으로 적으면 잊는다. */
function 통보(문구) {
  /* ⚠ 상대경로면 부른 자리에 따라 못 찾고, 그때 **조용히 안 적힌다.**
   *   2026-08-08 05:3x 배포가 그랬다 — 다른 자리에서 불러 통보가 통째로 빠졌다.
   *   다른 자리들이 「배포 중이구나」를 못 본다. 락과 달리 이건 사람이 보는 신호다. */
  const p = path.join(뿌리, 'docs', '세션간-메모.md');
  if (!existsSync(p)) { console.log(`⚠ 통보할 메모가 없다 — ${p}`); return; }
  appendFileSync(p, `\n${문구}\n`, 'utf8');
}

/**
 * 라이브 URL 을 직접 찔러 응답 코드를 본다.
 * ⚠ 판정을 **시간이 아니라 실제 상태**로 하기 위함이다. ctype 감시가 컨테이너
 *   기동보다 짧게 끊겨도, 라이브가 200 이면 서비스는 뜬 것이다.
 *   (실제 공개 URL 이라 fetch 의 Host 문제는 없다 — 호스트 라우팅 시험과 다르다)
 */
async function 라이브확인() {
  try {
    const r = await fetch('https://seoulmarkets.com/', { method: 'HEAD', redirect: 'manual' });
    return r.status;
  } catch {
    return 0;
  }
}

/**
 * **저장소가 막아 둔 지면** — `.gitignore` 가 가린 `src/pages` 아래 자리를 주소 앞머리로.
 *
 * ── 🔴 왜 (2026-10-10 22:4x · 5번) ──────────────────────────────────
 * 「빌드됐다」를 「배포된다」로 읽고 있었다. `.gitignore` 로 막아 둔 지면은
 * 내 dist 에는 멀쩡히 지어지지만 **저장소에 없으니 배포 번들에 영영 안 들어간다** —
 * 라이브는 영영 404 다. 그것을 「새로 나갈 지면」으로 집으면 이 자는 배포가 끝나도
 * 매번 「아직 안 뜬 것」이라고 거짓 빨간불을 낸다.
 *   실제로 `/100y/school-type` 하나가 그랬다. 10-05 에 중복 지면이라 내가 막아 둔 것인데
 *   오늘 배포 확인에서 그대로 빨간불로 나왔다.
 * ⛔ **mtime 으로는 못 거른다** — 방금 빌드돼 새 파일이다. 위의 「옛 찌꺼기」 거르개와
 *   막는 까닭이 다르다. 저쪽은 「이번에 안 지어진 것」, 이쪽은 「지어져도 안 나가는 것」이다.
 *
 * @param {string} git출력 `git status --ignored=matching --porcelain -- src/pages` 의 글
 * @returns {string[]} 예: ['/100y/school-type']  — 주소 앞머리다(그 아래 지면도 다 막힌다)
 */
export function 저장소가막은지면(git출력) {
  const 난것 = [];
  for (const 줄 of String(git출력 ?? '').split('\n')) {
    /* 꼴을 실측했다(2026-10-10) — `!! src/pages/100y/school-type/`.
       폴더째 무시되면 한 줄로 오고, 파일 하나면 `.astro` 로 끝난다. 둘 다 받는다.
       ⚠ 한글 경로는 git 이 따옴표로 싸서 이스케이프한다 — 그 줄은 여기서 못 푼다.
         괜찮다. 부르는 쪽이 한글 주소는 어차피 판정에 안 쓴다(아래 영문 거르개). */
    const m = 줄.match(/^!!\s+(?!")src\/pages\/(.+)$/);
    if (!m) continue;
    const 길 = m[1].replace(/\/+$/, '').replace(/(\/index)?\.astro$/, '');
    if (길) 난것.push(`/${길}`);
  }
  return 난것;
}

/**
 * 이 주소가 막힌 자리 아래인가. **앞머리가 같다고 막힌 것이 아니다** —
 * `/100y/school-type` 이 막혔다고 `/100y/school-type-gap` 까지 빼면 멀쩡한 지면을
 * 판정에서 잃는다. 자리 경계(`/`)에서 끊어 본다.
 */
export function 막혔나(길, 막힌앞머리 = []) {
  return 막힌앞머리.some((b) => 길 === b || 길.startsWith(`${b}/`));
}

/**
 * **새로 나가는 지면을 미리 골라 둔다** — 배포가 끝났는지 ctype 표시가 아니라 이것으로 안다.
 *
 * ⚠ 2026-08-07 새벽에 배포를 네 번 했는데 **네 번 다 600초를 「Starting」으로 태우고
 *   「판정 보류」로 끝났다.** 라이브는 네 번 다 200 이었다. ctype 표시가 멎어 있는 것이지
 *   배포가 안 된 것이 아니었다. 한 번에 10분씩, 하룻밤에 40분을 버렸다.
 *
 * 그래서 판정을 **표시가 아니라 내용**으로 바꾼다.
 *   빌드 결과(dist)에는 있는데 **라이브에는 아직 404 인 주소**를 찾아 두고,
 *   그 주소가 200 이 되는 순간 「나갔다」로 본다. 이건 표시가 아니라 사실이다.
 *
 * ⛔ 고칠 것이 지면 추가가 아니라 **글자 수정뿐이면 새 주소가 없다.** 그때는 못 쓴다 —
 *   빈 배열을 돌려주고, 부르는 쪽이 옛 방식(ctype 표시 + 라이브 200)으로 되돌아간다.
 *   ⚠ 없는 것을 있는 척하지 않는다.
 */
async function 새주소찾기(최대 = 3) {
  /* ⚠ 이름을 `뿌리` 로 두면 저장소 뿌리를 가린다. 부른 자리가 저장소가 아니면 통째로 어긋난다 */
  const dist뿌리 = path.join(뿌리, 'dist');
  if (!existsSync(dist뿌리)) return [];

  // ⚠ dist 가 낡으면 판정이 틀린다. **낡았는지 맞히려 들지 않고 여기서 새로 빌드한다.**
  //   시각을 견주는 방식으로 두 번 어긋났다(2026-08-07 03:0x·05:0x). 어긋날 자리를 없앤다.
  //   빌드는 30초 안팎이고 배포는 그보다 훨씬 길다 — 그만한 값을 한다.
  try {
    console.log('판정에 쓸 지면 목록을 만든다 — 빌드한다(30초 안팎)…');
    // ⚠ npx 도 npx.cmd 도 부르지 않는다 — 셸에 따라 못 찾는다(둘 다 겪었다).
    // 🔴 astro 를 **직접** 부르지 않는다 — 여섯 자리가 같은 작업트리를 쓴다.
    //   두 자리가 동시에 빌드하면 한쪽이 dist 를 비우는 사이 다른 쪽이 죽거나,
    //   더 나쁘게는 **반쯤 섞인 dist** 가 남아 판정이 통째로 틀린다(2026-08-07 16:4x 실제로 겪음).
    //   build-once 가 자물쇠를 쥐고 하나씩 돌린다.
    /* 🔴🔴 [2026-09-04 · 5번이 겪고 고침] **빌드 실패를 「판정을 못 한다」로 낮춰 읽고 있었다.**
       ─────────────────────────────────────────────────────────────────────────────
       06:0x 에 새 기사 한 편을 냈다. 배포를 두 번 돌렸고 두 번 다 이렇게 끝났다 —
       ```
         ✅ Running · 라이브 200
         🔴🔴 라이브가 아직 옛 것이다 … ⭐ 몇 분 기다린 뒤 **다시 배포**하십시오
       ```
       그 안내를 따라 또 배포했고, 또 같은 말이 나왔다. **기다려도 영영 안 나갔다.**

       [까닭] 배포가 아니라 **빌드가 깨져 있었다.** 내 기사의 `dek` 이 240자를 넘어
         `InvalidContentEntryDataError` 로 «사이트 전체» 빌드가 죽었다.
         Cloudtype 도 같은 저장소를 같은 명령으로 굽는다 — 그쪽도 똑같이 죽는다.

       ⛔ 그런데 옛 코드는 그 실패를 삼켰다. `stdio: 'ignore'` 로 오류 글을 버리고,
         catch 에서 「지면 판정을 쓰지 않고 옛 방식으로 돈다」고만 적고 **배포를 계속했다.**
         그래서 사람이 보는 것은 「Running · 라이브 200」과 「다시 배포하십시오」뿐이었다.
         2026-09-01 밤에 5번이 두 시간을 헛돈 것도 이 꼴이었을 수 있다(그때는 못 쟀다).

       🔴 그리고 이 결함은 **한 유닛이 여섯을 다 막는다.** 세 사이트가 «한 빌드»다 —
         내 frontmatter 한 줄이 6번·3번의 배포까지 영영 안 나가게 만들고,
         그 유닛들은 까닭을 모른 채 「다시 배포」만 되풀이한다.

       ✅ 그래서 빌드가 깨지면 **배포를 하지 않고 멈춘다.** 오류 글을 그대로 보여 준다.
         「판정을 못 한다」와 「구울 수가 없다」는 다른 말이다. */
    /* 🔴 2026-09-28 · 2번이 겪고 고침 — spawnSync 기본 stdout 한도(1MB)를 astro의
       지면별 로그(15,000+ 줄)가 넘겨 ENOBUFS 로 죽었다. r.status 는 null 이 되고
       빌드는 실제로 성공했는데 이 자가 「빌드가 깨졌다」로 잘못 읽어 세 사이트
       배포를 다 막았다(node -e 로 직접 재현: stdout 978,295바이트에서 SIGTERM).
       maxBuffer 를 넉넉히 주고, ENOBUFS 는 빌드 실패와 다른 말로 알린다. */
    const r = spawnSync(process.execPath, [path.join(뿌리, 'scripts', 'build-once.mjs')],
      { cwd: 뿌리, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    if (r.error && r.error.code === 'ENOBUFS') {
      throw new Error(`빌드 판정 도구가 출력에 묻혔다(ENOBUFS) — 빌드 자체가 깨진 게 아니다. maxBuffer 를 더 올려야 한다: ${r.error.message}`);
    }
    if (r.status !== 0) {
      const 글 = String(r.stdout || '') + String(r.stderr || '');
      throw new 빌드실패(글);
    }
  } catch (e) {
    if (e instanceof 빌드실패) throw e;      // ⛔ 삼키지 않는다. 위로 올려 배포를 멈춘다
    throw new 빌드실패(String(e && e.message ? e.message : e));
  }

  // ① 라이브 사이트맵 셋을 받아 **지금 나가 있는 주소**를 모은다. 요청 세 번이면 된다.
  //    ⛔ dist 의 지면을 하나씩 찔러 보지 않는다 — 3,900 번을 쏘게 된다.
  const 호스트들 = ['https://seoulmarkets.com', 'https://100yearmap.com', 'https://www.kculturewire.com'];
  /**
   * ⚠ **사이트맵의 주소는 퍼센트 인코딩되어 있다** — `/major/%EC%A0%95…` 이지 `/major/정보처리과` 가 아니다.
   *   그래서 `산것.has('…/major/정보처리과')` 는 **영영 안 맞는다.**
   *   지금은 아래 ASCII 걸름망이 한글 주소를 먼저 빼기 때문에 탈이 안 난다.
   *   ⛔ **걸름망을 넓히려거든 여기 인코딩부터 맞춰야 한다.** 안 그러면 한글 지면
   *      4,000여 장이 통째로 「라이브에 아직 없다」로 잡혀 판정이 무너진다.
   *   (2026-08-08 05:5x — 「/major 가 사이트맵에 없다」로 잘못 읽었다가 풀어 보고 알았다)
   */
  const 산것 = new Set();
  for (const h of 호스트들) {
    try {
      const t = await (await fetch(`${h}/sitemap.xml`)).text();
      for (const m of t.matchAll(/<loc>([^<]+)<\/loc>/g)) 산것.add(m[1].replace(/\/$/, ''));
    } catch { /* 못 받으면 그 호스트는 못 본 것으로 둔다 */ }
  }
  if (!산것.size) return [];

  // ② dist 의 지면을 주소로 바꿔 사이트맵에 없는 것을 고른다
  //    ⚠ dist 는 지우고 다시 만들지 않아 **옛 빌드의 찌꺼기가 남을 수 있다.**
  //      저장소에 없는 지면이 dist 에만 남으면 영영 404 이고, 그것을 판정에 쓰면
  //      배포가 끝났는데도 끝까지 기다린다. 아직 실제로 겪지는 않았고 미리 막아 둔다.
  //      **이번 빌드에서 다시 쓰인 파일만** 본다 — index.html 은 매 빌드 다시 쓰인다.
  const { readdirSync, statSync } = await import('node:fs');
  const 기준시각 = existsSync(path.join(dist뿌리, 'index.html'))
    ? statSync(path.join(dist뿌리, 'index.html')).mtimeMs - 10 * 60 * 1000
    : 0;
  const 후보 = [];
  let 사라진지면 = 0;
  /**
   * 🔴 [2026-09-05 04:1x] **이 걷기가 배포를 통째로 터뜨렸다.**
   *   목록을 만든 «뒤»에 옆 유닛 빌드가 그 파일을 지웠고, statSync 가 ENOENT 로 던졌다.
   *     Error: ENOENT: no such file or directory, stat
   *       …/dist/100y/college-major/경찰학전공.html
   *   ⛔ **여섯 유닛이 같은 dist 를 쓴다.** 옆에서 빌드하는 동안 파일은 지워지고 다시 쓰인다.
   *     그때 배포가 죽으면 «다 된 커밋이 손님에게 안 나간다» — 가장 비싼 실패다.
   * ✅ 못 읽은 것은 «세어서 알리고» 나머지로 배포를 이어 간다.
   *   ⚠ 0 으로 덮지 않는다. 몇 장을 못 봤는지 화면에 적는다 —
   *     그 장수가 크면 판정에 쓸 표식이 모자랄 수 있으니 사람이 알아야 한다.
   */
  const 걷기 = (d, 앞) => {
    let 것들;
    try { 것들 = readdirSync(d, { withFileTypes: true }); } catch { 사라진지면 += 1; return; }
    for (const e of 것들) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (e.name !== '_astro') 걷기(p, `${앞}/${e.name}`); continue; }
      if (!e.name.endsWith('.html')) continue;
      let 때;
      try { 때 = statSync(p).mtimeMs; } catch { 사라진지면 += 1; continue; }
      if (때 >= 기준시각) 후보.push(`${앞}/${e.name.replace(/\.html$/, '')}`);
    }
  };
  걷기(dist뿌리, '');

  /* 저장소가 막아 둔 지면은 빌드돼도 배포 번들에 안 들어간다 — 판정에 쓰면 영영 거짓 빨간불이다 */
  let 막힌앞머리 = [];
  try {
    const { execFileSync } = await import('node:child_process');
    막힌앞머리 = 저장소가막은지면(execFileSync(
      'git', ['status', '--ignored=matching', '--porcelain', '--', 'src/pages'],
      { cwd: 뿌리, encoding: 'utf8' },
    ));
  } catch {
    /* ⚠ git 에게 못 물으면 «못 쟀다»다. 거르지 않고 간다 — 빈 배열로 덮어 「없다」고 하지 않는다 */
    console.log('⚠ 막힌 지면을 git 에게 못 물었다 — 거르지 않고 간다.');
  }
  if (막힌앞머리.length) {
    console.log(`⬜ 저장소가 막아 둔 지면 ${막힌앞머리.length}자리는 판정에서 뺀다 — ${막힌앞머리.join(' · ')}`);
  }

  if (사라진지면) {
    console.log(`⚠ 걷는 사이에 사라진 지면 ${사라진지면}장 — 옆 유닛이 빌드 중이다.`);
    console.log('   그만큼 «안 본 것»이고, 0 으로 덮지 않았다. 판정 표식이 모자라면 다시 배포한다.');
  }

  const 주소로 = (길) =>
    길.startsWith('/100y/') ? `https://100yearmap.com${길.slice(5)}`
    : 길.startsWith('/wikitip/') ? `https://www.kculturewire.com${길.slice(8)}`
    : `https://seoulmarkets.com${길}`;

  const { createHash } = await import('node:crypto');
  const 지문 = (글) => createHash('md5').update(글.replace(/\r\n/g, '\n')).digest('hex');

  const 잰다 = [];
  // ① 새로 나갈 지면 — 라이브에 아직 없는 것
  for (const 길 of 후보) {
    if (잰다.length >= 최대) break;
    if (/\/(404|index)$/.test(길)) continue;
    // ⚠ 한글·점이 든 주소는 판정에 쓰지 않는다. 인코딩 때문에 **영영 200 이 안 되는** 것을
    //   골라 놓으면 배포가 끝났는데도 끝까지 기다린다. 2026-08-07 시험에서 실제로 하나 잡혔다.
    if (!/^[/a-z0-9\-_/]+$/i.test(길)) continue;
    /* ⛔ 빌드됐어도 저장소에 없으면 라이브에 영영 안 간다 — 이것으로 판정하면 끝까지 기다린다 */
    if (막혔나(길, 막힌앞머리)) continue;
    const u = 주소로(길);
    if (산것.has(u)) continue;
    try {
      const r = await fetch(u, { method: 'HEAD', redirect: 'manual' });
      if (r.status === 404) 잰다.push({ url: u, 기댓값: null });   // 200 이 되면 나간 것
    } catch { /* 못 재면 넘긴다 */ }
  }

  // ⚠ 지문표는 **새 지면이 있든 없든 남긴다.** 여기서 일찍 돌아가 버리면 표가 영영 안 생기고,
  //   다음에 자료만 고친 배포가 왔을 때 또 못 잰다. 실제로 한 번 그렇게 비어 있었다.
  {
    const { readFileSync } = await import('node:fs');
    const 이번지문 = new Map();
    for (const 길 of 후보) {
      if (/\/(404|index)$/.test(길) || !/^[/a-z0-9\-_/]+$/i.test(길)) continue;
      /* 🔴 2026-08-08 05:4x — 여기서 **사이트맵에 있는 것만** 지문을 떴다.
       *   그런데 **팔 지면은 noindex 라 사이트맵에 없다.** 그래서 3번이 팔 지면 두 곳을
       *   고친 배포가 「바뀐 지면이 없다」로 떨어져 600초를 태우고 「판정 보류」로 끝났다.
       *   ⛔ 우리가 파는 물건만 영영 판정이 안 되는 자를 갖고 있던 것이다.
       *   ✅ 사이트맵에 있든 없든 지문을 뜬다. 살아 있는지는 아래에서 200 으로 가린다. */
      try {
        이번지문.set(길, 지문(readFileSync(path.join(dist뿌리, `${길}.html`), 'utf8')));
      } catch { /* 못 읽으면 넘긴다 */ }
    }
    var 이번지문표 = 이번지문;                  // 아래 ②에서 다시 쓴다
    var 지난지문표 = 지문표읽기();
    지문표쓰기(이번지문);
  }

  if (잰다.length) return 잰다;

  // ② 새 지면이 없으면 — **자료·글자만 고친 배포**다. 바뀐 지면의 지문으로 판정한다.
  //    ⭐ 컨테이너 빌드가 내 빌드와 **바이트까지 같은 것**을 확인했다(2026-08-07 08:3x).
  //
  //    🔴 2026-08-07 16:0x — 여기에 구멍이 있었다. **실제로 5번 자료가 안 나갔는데 「나갔다」고 했다.**
  //      옛 방식은 dist 를 걸으며 앞에서부터 60장만 라이브와 견줬다. 지면이 4,700장이라
  //      앞 60장은 거의 다 백년지도 것이고, **바뀐 K팝 지면은 영영 안 걸렸다.**
  //      그래서 「바뀐 곳이 없다」로 보고 옛 방식(200)으로 되돌아가 무조건 통과했다.
  //
  //    ✅ 고친 방법 — **지난 배포 때의 dist 지문표를 남겨 두고, 이번 dist 와 견준다.**
  //      바뀐 지면이 어느 것인지 **자기 PC 안에서 정확히** 알아낸다. 라이브를 4,700번 찌르지 않는다.
  const 이번지문 = 이번지문표;
  const 지난지문 = 지난지문표;

  // 지난 표가 있으면 **바뀐 지면만** 골라 낸다. 없으면(첫 배포) 옛 방식으로 되돌아간다
  const 바뀐것 = 지난지문
    ? [...이번지문.keys()].filter((길) => 지난지문.get(길) !== 이번지문.get(길))
    : null;

  if (!지난지문) {
    console.log('⬜ 지난 배포의 지문표가 없다 — 이번에 만들어 둔다. 이번 판정은 옛 방식으로 돈다');
    return 잰다;
  }
  if (!바뀐것.length) {
    console.log('⬜ 지난 배포와 견줘 바뀐 지면이 없다 — 자료·글자도 그대로다');
    return 잰다;
  }
  console.log(`바뀐 지면 ${바뀐것.length}장을 찾았다 (지난 배포와 견줌). 그중 앞 3장으로 판정한다`);

  /* ⚠ 앞 3장이 아니라 **살아 있는 것 중 앞 3장**을 쓴다.
   *   사이트맵 밖까지 보게 되면서 「아직 한 번도 안 나간 지면」이 섞일 수 있다.
   *   그런 것을 판정에 골라 놓으면 영영 안 맞아 끝까지 기다린다 — ①에서 겪은 덫과 같다. */
  for (const 길 of 바뀐것) {
    if (잰다.length >= 3) break;
    const u = 주소로(길);
    try {
      const res = await fetch(u);
      if (res.status !== 200) { console.log(`  ⬜ ${u} 가 ${res.status} 다 — 판정에 쓰지 않는다`); continue; }
      const 라이브 = 지문(await res.text());
      // 이미 같으면 이번 배포로 바뀔 것이 없는 지면이다(누가 먼저 냈을 수 있다)
      if (라이브 !== 이번지문.get(길)) 잰다.push({ url: u, 기댓값: 이번지문.get(길) });
    } catch { /* 못 재면 넘긴다 */ }
  }
  return 잰다;
}

/**
 * dist 지면의 지문표. **저장소 바깥**에 둔다 — 커밋에 섞이면 diff 가 지저분해지고,
 * 다른 세션이 같은 저장소를 쓰는데 이 표는 **이 PC 의 마지막 배포** 이야기라서 그렇다.
 */
const 지문표 = path.resolve('C:/Users/USER/Documents/GitHub/.cloudtype-dist-manifest.json');

function 지문표읽기() {
  if (!existsSync(지문표)) return null;
  try {
    const j = JSON.parse(readFileSync(지문표, 'utf8'));
    return new Map(Object.entries(j.지면 ?? {}));
  } catch {
    return null; // 깨진 표는 없는 것으로 본다
  }
}

function 지문표쓰기(표) {
  try {
    writeFileSync(
      지문표,
      JSON.stringify({ 만든때: 지금().toISOString(), 지면: Object.fromEntries(표) }, null, 0),
    );
  } catch { /* 못 써도 배포는 계속한다 */ }
}

/**
 * 🔴 **판정 한 곳** — 무엇을 보고 「나갔다/안 나갔다/모른다」고 하는지 여기서만 정한다.
 *
 * ⛔ 이 함수는 **네트워크를 안 탄다.** 그래야 `--selftest` 로 시험할 수 있다.
 *   판정을 부르는 자리에 흩어 놓으면 시험할 수 없고, 시험 못 하는 판정이 오늘 사고를 냈다.
 *
 * 돌려주는 `꼴`
 * ```
 * 나갔다      ✅  라이브에서 바뀐 것을 실제로 봤다
 * 안나갔다    ❌  표식을 줬는데 끝까지 안 나타났다 — 이건 「모름」이 아니다
 * 표식못씀    ⚠   표식이 배포 전에 이미 있었다(가짜 성공). 다른 것으로 판정한다
 * 모름        ⬜  볼 표식이 없었다. ⛔ 「보류」라고 쓰지 않는다
 * ```
 */
export function 판정하기(입력) {
  const { 표식있나, 표식이미있었나, 표식나타났나, 지면판정, ctype상태, 라이브코드 } = 입력 ?? {};

  /* ⛔ 가짜 성공을 제일 먼저 걸러 낸다. 이걸 놓치면 안 나간 배포가 ✅ 로 선다 */
  if (표식있나 && 표식이미있었나) {
    return {
      꼴: '표식못씀',
      말: '표식이 배포 전에 이미 라이브에 있었다 — 이 표식으로는 판정할 수 없다(가짜 성공). 이번 커밋이 실제로 바꾼 낱말을 주십시오',
    };
  }
  if (표식있나 && 표식나타났나) return { 꼴: '나갔다', 말: '표식이 라이브에 나타났다' };
  if (표식있나 && !표식나타났나) {
    /* 🔴🔴 [2026-08-26 · 5번이 겪고 고침] **자기 눈으로 본 것을 자기가 부정하고 있었다.**
       ─────────────────────────────────────────────────────────────────────────
       04:0x 에 새 기사 한 편을 냈다. 화면에는 이렇게 찍혔다 —
       ```
         400초 · Starting · 새 지면 404/404
         420초 · Starting · 새 지면 200/200      ← 새 지면이 «라이브에 떴다»
       ❌ 안 나갔다 — 표식이 안 나타났다
       ```
       ⛔ 두 줄이 서로를 뒤집는다. 그리고 4번이 그 ❌ 를 보고 메모에
         「SeoulMarkets 배포 실패건」으로 적으셨다 — 남의 자리까지 잘못 읽게 만들었다.

       [무엇이 틀렸나] 틀린 것은 배포가 아니라 **내가 고른 표식**이었다.
         그 문장은 카드 «그림» 안에만 있고 지면 «글자»에는 없었다.
       ⭐ 그런데 이 자는 이미 「새 지면이 200 이다」라는 더 센 증거를 손에 쥐고 있었다.
         증거를 쥐고서 「라이브는 옛 지면입니다」라고 말하면 그것이 거짓이다.

       ⛔ 그렇다고 ✅ 로 넘기지도 않는다 — 표식이 안 맞은 것은 사람이 고쳐야 할 일이다.
         그래서 셋째 자리를 둔다: 「나갔다 · 다만 표식이 안 맞았다」. */
    if (지면판정) {
      return {
        꼴: '표식빗나감',
        말: '표식은 안 나타났지만 **새 지면이 라이브 200** 이다 — 나간 것이다. '
          + '틀린 것은 배포가 아니라 표식이다(그 낱말이 지면 글자에 없었을 수 있다)',
      };
    }
    return { 꼴: '안나갔다', 말: '표식을 줬는데 끝까지 안 나타났다. 라이브는 옛 지면이다' };
  }

  if (지면판정) return { 꼴: '나갔다', 말: '새 지면이 라이브 200 이다' };
  if (ctype상태 === 'Running') return { 꼴: '나갔다', 말: `상태 Running · 라이브 ${라이브코드}` };

  /**
   * ⚠ 여기가 오늘 사고 난 자리다. 옛 자는 여기서 **「판정 보류」**라고 적었고,
   *   사람이 그것을 **「다시 돌려야 하나」**로 읽어 겹쳐 돌렸다.
   * ⛔ 우리가 아는 것은 「모른다」뿐이다. 모르는 것을 모른다고 적는다.
   */
  return {
    꼴: '모름',
    말:
      라이브코드 === 200
        ? `볼 표식이 없어 **못 쟀다**. 라이브는 200 이고 ctype 은 ${ctype상태} 다 — 나갔는지는 모른다`
        : `볼 표식이 없어 **못 쟀다**. 라이브 ${라이브코드} · ctype ${ctype상태}`,
  };
}

/** 라이브에서 낱말이 보이나. ⚠ 못 받으면 `null` — `false`(없다)와 다르다 */
/**
 * 🔴🔴 2026-08-22 — **새로 낸 지면은 표식으로 판정할 수 없었다.** 그 구멍으로 배포가
 *   「✅ Running · 라이브 200」이라 말하고 **아무것도 안 나갔다.** 이 파일 앞머리 주석이
 *   경고한 바로 그 꼴이다 — 「성공이라 말하면서 아무것도 안 나가는 것이 가장 나쁜 꼴이다」.
 *
 *   까닭: 배포 전 미리보기에서 새 지면은 **404** 다. 이 자가 404 를 `null`(=못 집었다)로
 *   돌려주니 표식이 버려지고 판정이 「모름」으로 내려갔다.
 *
 *   ⭐ 그런데 404 는 **가장 좋은 표식**이다 — 「없던 것이 생겼다」만큼 분명한 것이 없다.
 *   그래서 404 는 `'없는지면'` 으로 돌려주고 끊김만 `null` 로 남긴다.
 *   ⛔ 새 지면을 낼 때 그 지면 자체를 표식으로 줄 수 있어야 한다. 그게 확인하려는 것이다.
 */
export async function 표식집기(주소, 낱말, 가져오기 = fetch) {
  try {
    const r = await 가져오기(주소);
    if (r.status === 404) return '없는지면';
    if (!r.ok) return null;
    const 글 = await r.text();
    return 글.includes(낱말);
  } catch {
    return null;
  }
}

/* ───────────────────────── 자가 시험 (2번 지시 셋) ───────────────────────── */
async function 자가시험() {
  const 본보기 = [
    /**
     * 🔴 [2026-08-29] 표식이 «낸 지면에 아예 없는 글자»면 배포가 나가도 ❌ 가 찍힌다.
     *   숏영상을 지면에 싣고 표식을 영상 «안»의 글자로 준 날 걸렸다.
     *   ⛔ 헛경보는 못 잡은 것만큼 나쁘다 — 자가 두 번 거짓말하면 사람이 자를 안 본다.
     */
    ['⓪ 낸 지면에 그 글자가 있으면 참', () =>
      낸것에표식있나('https://www.kculturewire.com/person', '있는말',
        (p) => /person/.test(p), () => '<p>있는말</p>') === true],
    ['⓪ 낸 지면에 그 글자가 없으면 거짓 — 이 표식은 못 쓴다', () =>
      낸것에표식있나('https://www.kculturewire.com/person', 'Two rulers',
        () => true, () => '<p>다른 말만 있다</p>') === false],
    ['⓪ ⛔ 지면을 못 찾으면 «못 쟀다»(null) — 0 으로 안 채운다', () =>
      낸것에표식있나('https://www.kculturewire.com/없는곳', 'x', () => false) === null],
    ['⓪ 주소가 아니면 못 쟀다', () =>
      낸것에표식있나('주소아님', 'x') === null],
    ['⓪ /wikitip 이 붙은 주소도 같은 자리를 본다', () =>
      낸것에표식있나('https://www.kculturewire.com/wikitip/person', 'ㅇ',
        (p) => /person/.test(p), () => 'ㅇ') === true],
    /* ① 표식이 이미 라이브에 있으면 → 배포 전인데 ✅ 가 나오면 안 된다 */
    ['① 이미 있던 표식으로 ✅ 가 안 난다', () =>
      판정하기({ 표식있나: true, 표식이미있었나: true, 표식나타났나: true, ctype상태: 'Running', 라이브코드: 200 }).꼴 === '표식못씀'],
    ['① 그때 「나갔다」가 아니다', () =>
      판정하기({ 표식있나: true, 표식이미있었나: true, 표식나타났나: true }).꼴 !== '나갔다'],
    /* ② 표식이 끝까지 안 나타나면 → ❌ 로 선다 */
    ['② 안 나타나면 안나갔다', () =>
      판정하기({ 표식있나: true, 표식이미있었나: false, 표식나타났나: false, 라이브코드: 200 }).꼴 === '안나갔다'],
    ['② 그때 「모름」이 아니다', () =>
      판정하기({ 표식있나: true, 표식이미있었나: false, 표식나타났나: false, 라이브코드: 200 }).꼴 !== '모름'],
    /* ③ 표식 없이 부르면 → 「모름」이지 「보류」가 아니다 */
    ['③ 표식 없으면 모름', () =>
      판정하기({ 표식있나: false, ctype상태: 'Starting', 라이브코드: 200 }).꼴 === '모름'],
    ['③ 「보류」라는 말을 안 쓴다', () =>
      !/보류/.test(판정하기({ 표식있나: false, ctype상태: 'Starting', 라이브코드: 200 }).말)],
    /* 나머지 — 있던 판정이 그대로 서나 */
    ['표식이 나타나면 나갔다', () =>
      판정하기({ 표식있나: true, 표식이미있었나: false, 표식나타났나: true }).꼴 === '나갔다'],
    ['새 지면이 뜨면 나갔다', () => 판정하기({ 표식있나: false, 지면판정: true }).꼴 === '나갔다'],
    ['Running 이면 나갔다', () => 판정하기({ 표식있나: false, ctype상태: 'Running', 라이브코드: 200 }).꼴 === '나갔다'],
    /* 🔴 [2026-08-26] 이 시험이 «옛 판정»을 지키고 있었다 — 고친 것은 시험이 아니라 규칙이다.
       표식이 안 나타났는데 «새 지면이 200» 이면, 나간 것이 맞다. 다만 표식이 틀린 것이다.
       ⛔ 「안나갔다」로 내면 메모를 읽는 다른 자리가 「배포 실패」로 읽는다(오늘 그렇게 읽혔다). */
    ['표식이 안 나타나도 새 지면이 200 이면 «나간 것»이다', () =>
      판정하기({ 표식있나: true, 표식나타났나: false, 지면판정: true }).꼴 === '표식빗나감'],
    ['⛔ 새 지면 증거가 «없으면» 안나갔다 그대로다', () =>
      판정하기({ 표식있나: true, 표식나타났나: false, 지면판정: false }).꼴 === '안나갔다'],
    ['빈 입력이어도 안 죽는다', () => 판정하기().꼴 === '모름'],
    /* 🔴 2026-10-10 — 「빌드됐다」를 「배포된다」로 읽어 거짓 빨간불이 났다.
       감은 실측한 git 출력에서 떠 왔다 — 지어낸 꼴로 시험하지 않는다. */
    ['🔴 .gitignore 로 막은 지면 폴더를 집는다 (실측한 꼴 그대로)', () =>
      저장소가막은지면('!! src/pages/100y/school-type/\n')[0] === '/100y/school-type'],
    ['파일 하나만 막혀도 집는다 — index.astro 를 주소에서 뗀다', () =>
      저장소가막은지면('!! src/pages/100y/x/index.astro')[0] === '/100y/x'],
    ['.astro 하나도 주소로 바꾼다', () =>
      저장소가막은지면('!! src/pages/foo.astro')[0] === '/foo'],
    ['⛔ 막힌 것이 아닌 줄은 안 집는다 — ?? 와 M 은 저장소가 아는 것이다', () =>
      저장소가막은지면('?? src/pages/a/\n M src/pages/b.astro\n').length === 0],
    ['⛔ src/pages 밖은 안 집는다', () =>
      저장소가막은지면('!! tmp/\n!! logs/\n').length === 0],
    ['⛔ 빈 입력·null 에도 안 죽는다', () =>
      저장소가막은지면('').length === 0 && 저장소가막은지면(null).length === 0],
    /* ⚠ 한글 경로는 git 이 따옴표로 싸서 이스케이프한다. 푸는 척하지 않고 버린다 —
       부르는 쪽이 한글 주소는 어차피 판정에 안 쓴다. 반쪽으로 푼 주소를 내는 것이 더 나쁘다 */
    ['⛔ 따옴표 친 줄(한글 경로)은 지어내지 않고 버린다', () =>
      저장소가막은지면('!! "src/pages/100y/\\355\\225\\234/"').length === 0],
    /* 거르개 — 함수로 빼지 않으면 시험이 못 닿아 도장만 찍힌다 */
    ['🔴 막힌 자리 자신이 걸린다', () => 막혔나('/100y/school-type', ['/100y/school-type'])],
    ['🔴 막힌 자리 «아래»도 걸린다', () =>
      막혔나('/100y/school-type/sub', ['/100y/school-type'])],
    ['🔴🔴 앞머리만 같은 «멀쩡한» 지면은 안 걸린다 — 라이브 200 인 school-type-gap 이 있다', () =>
      !막혔나('/100y/school-type-gap', ['/100y/school-type'])],
    ['막힌 자리가 없으면 아무것도 안 걸린다', () => !막혔나('/100y/school-type')],
    /* 인자 읽기 */
    ['--표식 을 읽는다', () => 표식읽기(['--표식', 'https://a.b/c', '15 August'])?.낱말 === '15 August'],
    ['낱말이 없으면 표식이 아니다', () => 표식읽기(['--표식', 'https://a.b/c']) === null],
    ['주소가 아니면 안 받는다', () => 표식읽기(['--표식', '/subscribe', '15 August']) === null],
    ['다음 깃발을 낱말로 안 읽는다', () => 표식읽기(['--표식', 'https://a.b', '--force']) === null],
    ['없으면 null', () => 표식읽기(['--check']) === null],
    /* 🔴🔴 2026-08-27 — 자 둘이 서로를 막아 네 사이트가 다 죽은 채로 잠겼다.
       「상대가 죽었다」와 「상대가 배포 중이다」를 같은 것으로 다루고 있었다. */
    ['🔴 상대가 Stopped 이고 락이 비었으면 «지나간다»', () =>
      지나가도되나({ 상대상태: 'Stopped', 상대살았나: false, 락으로본배포중: false, 지난분: 3 }) === true],
    ['⛔ 상대가 Stopped 여도 «락을 쥐고 있으면» 막는다', () =>
      지나가도되나({ 상대상태: 'Stopped', 상대살았나: false, 락으로본배포중: true, 지난분: 3 }) === false],
    ['⛔ 상대가 Starting 이고 사이트도 안 열리면 막는다', () =>
      지나가도되나({ 상대상태: 'Starting', 상대살았나: false, 락으로본배포중: false, 지난분: 3 }) === false],
    ['상대가 Starting 이어도 사이트가 200 이면 지나간다', () =>
      지나가도되나({ 상대상태: 'Starting', 상대살았나: true, 락으로본배포중: false, 지난분: 3 }) === true],
    ['락이 12분을 넘겼고 사이트가 200 이면 지나간다', () =>
      지나가도되나({ 상대상태: 'Starting', 상대살았나: true, 락으로본배포중: true, 지난분: 13 }) === true],
    ['락이 12분 안이면 사이트가 200 이어도 막는다', () =>
      지나가도되나({ 상대상태: 'Starting', 상대살았나: true, 락으로본배포중: true, 지난분: 5 }) === false],
    ['unknown 은 Stopped 가 아니다 — 사이트가 죽었으면 막는다', () =>
      지나가도되나({ 상대상태: 'unknown', 상대살았나: false, 락으로본배포중: false, 지난분: 3 }) === false],
    ['멎어있나 는 대소문자를 안 가린다', () => 멎어있나(' STOPPED ') === true && 멎어있나('Running') === false],
    ['빈 입력이어도 안 죽는다', () => 지나가도되나() === false],
    /* 표식집기 — 가짜 가져오기로 시험한다 */
    ['낱말이 있으면 true', async () =>
      (await 표식집기('u', '15 August', async () => ({ ok: true, text: async () => 'x 15 August y' }))) === true],
    ['낱말이 없으면 false', async () =>
      (await 표식집기('u', '15 August', async () => ({ ok: true, text: async () => 'x 14 August y' }))) === false],
    ['못 받으면 null — false 와 다르다', async () =>
      (await 표식집기('u', 'x', async () => { throw new Error('끊김'); })) === null],
    ['200 이 아니면 null', async () =>
      (await 표식집기('u', 'x', async () => ({ ok: false, status: 500 }))) === null],
    /* 🔴 2026-08-22 이 구멍으로 «성공이라 말하고 안 나간» 배포가 한 번 있었다 */
    ['🔴 404 는 «없는 지면» 이다 — 끊김과 다르다', async () =>
      (await 표식집기('u', 'x', async () => ({ ok: false, status: 404 }))) === '없는지면'],

    /* 🔴 Git Bash 가 `/` 로 시작하는 낱말을 윈도 경로로 바꿔 버리던 것 (5번이 잡음) */
    ['뭉개진 표식을 되돌린다', async () =>
      경로되돌리기('C:/Program Files/Git/market/vietnam').낱말 === '/market/vietnam'],
    ['되돌렸다고 알려 준다', async () =>
      경로되돌리기('C:/Program Files/Git/market/vietnam').되돌렸나 === true],
    ['역슬래시도 되돌린다', async () =>
      경로되돌리기('C:\\Program Files\\Git\\data\\board-composition').낱말 === '/data/board-composition'],
    ['멀쩡한 낱말은 안 건드린다', async () =>
      경로되돌리기('15 August').낱말 === '15 August' && 경로되돌리기('15 August').되돌렸나 === false],
    ['멀쩡한 경로도 안 건드린다', async () =>
      경로되돌리기('/market/vietnam').낱말 === '/market/vietnam'],
    ['Git 이 안 든 윈도 경로는 안 건드린다', async () =>
      경로되돌리기('C:/Users/USER/x').되돌렸나 === false],
    ['빈 값에 안 죽는다', async () =>
      경로되돌리기(null).낱말 === '' && 경로되돌리기(undefined).되돌렸나 === false],

    /* ── 빌드 실패를 배포로 넘기지 않는다 (2026-09-04) ────────────────────────
       ⚠ **진짜로 겪은 글**을 넣는다. 지어낸 오류 글로 시험하면 진짜가 와도 못 짚는다.
         아래 글은 2026-09-04 06:01 에 실제로 나온 것을 색코드만 남기고 옮긴 것이다. */
    ['진짜 겪은 빌드 오류에서 「어디가·무엇이」를 짚는다', async () => {
      const 진짜 = '\u001b[2m06:01:31\u001b[22m \u001b[34m[content]\u001b[39m Syncing content\n'
        + '\u001b[31m[InvalidContentEntryDataError]\u001b[39m \u001b[1mkcwArticles \u2192 chart-credits-buy-a-level-not-a-direction\u001b[22m data does not match collection schema.\n\n'
        + '  \u001b[1mdek\u001b[22m: Too big: expected string to have <=240 characters\n';
      const r = 빌드오류짚기(진짜);
      return r !== null && r.꼴 === '콘텐츠스키마'
        && r.묶음 === 'kcwArticles'
        && r.글쪽 === 'chart-credits-buy-a-level-not-a-direction'
        && /Too big/.test(r.까닭 ?? '');
    }],
    ['못 짚으면 «못 짚었다»(null)로 낸다 — 억지로 지어내지 않는다', async () =>
      빌드오류짚기('무슨 말인지 모를 오류') === null && 빌드오류짚기('') === null
      && 빌드오류짚기(null) === null],
    ['다른 글쪽이 오면 그 글쪽을 짚는다 (한 편에 박아 두지 않았다)', async () => {
      const r = 빌드오류짚기('[InvalidContentEntryDataError] hundredYear → some-other-page data does not match\n\n  title: Required\n');
      return r && r.묶음 === 'hundredYear' && r.글쪽 === 'some-other-page';
    }],
    ['파일 길만 있는 오류도 어디인지는 짚는다', async () => {
      const r = 빌드오류짚기('Something broke\n  Location:\n    C:/Users/User/Documents/GitHub/dataeconomics/src/pages/x.astro\n');
      return r && r.꼴 === '파일' && /x\.astro$/.test(r.고치는곳);
    }],
    ['빌드실패는 «다른 오류와 구별»된다 — 배포를 멈추는 갈래다', async () => {
      const a = new 빌드실패('아무 글');
      return (a instanceof 빌드실패) && (a instanceof Error)
        && !(new Error('그냥 오류') instanceof 빌드실패);
    }],
    ['빌드실패가 원문을 «잃지 않는다» — 사람이 볼 것은 이 글뿐이다', async () => {
      const 글 = 'Too big: expected string to have <=240 characters';
      return new 빌드실패(글).글 === 글 && new 빌드실패(null).글 === '';
    }],

    /* 🔴 [2026-09-09 · 5번] 지켜보기가 끊겼을 때의 글 — 오늘 이 글이 «없어서» 사고가 났다.
     *   「배포 시작」만 매달려 남았고, 3번이 그것을 실패로 읽고 남의 미커밋을 stash 하셨다. */
    ['🔴 끊긴 통보에 «배포는 나갔다»가 들어간다 — 없으면 다음 사람이 실패로 읽는다', async () =>
      /배포 자체는 이미 나갔다/.test(끊긴통보문('[배포 · x]', 'SIGTERM', '20시'))],
    ['🔴 끊긴 통보가 «지면으로 판정하라»고 말한다 — ctype 표시는 오래 남는다', async () =>
      /지면으로/.test(끊긴통보문('[배포 · x]', 'SIGTERM', '20시'))],
    ['🔴 끊긴 통보가 «남의 미커밋을 stash 하지 말라»고 못박는다 (오늘 실제로 있었던 일)', async () =>
      /stash 하지 마십시오/.test(끊긴통보문('[배포 · x]', 'SIGTERM', '20시'))],
    ['끊긴 통보에 신호 이름과 시각이 들어간다 — 언제 무엇에 끊겼나를 알아야 한다', async () => {
      const g = 끊긴통보문('[배포 · x]', 'SIGINT', '20시 41분');
      return g.includes('SIGINT') && g.includes('20시 41분');
    }],
    ['끊긴 통보가 메모 인용줄(>)로 시작한다 — 메모 꼴을 깨지 않는다', async () =>
      끊긴통보문('[배포 · x]', 'SIGTERM', '20시').startsWith('> ')],
  ];
  let 진 = 0;
  for (const [이름, 재기] of 본보기) {
    let 됐나 = false;
    try { 됐나 = (await 재기()) === true; } catch { 됐나 = false; }
    if (!됐나) { console.log(`  ⛔ 자가시험 실패 — ${이름}`); 진++; }
  }
  console.log(`자가시험 ${본보기.length}개 · 실패 ${진}개`);
  return 진;
}

/**
 * 🔒 배포 관문 — **열쇠 없이는 못 나간다.**
 *
 * 사장님(2026-08-09 20:10): 「자물쇠를 최대로 찾아 **채워라. 모든 세션에**」
 * 2번(20:4x): 「지금 **2번 말고 전부 ☐** 입니다. **만들어만 놓고 아무도 안 씁니다**」
 *
 * ⛔ 실제로 그랬다 — 이 파일에 `deploy-key` 라는 글자가 **한 번도 없었다.**
 *    그래서 5번은 2026-08-09 하루에 배포를 다섯 번 하면서 열쇠를 **한 번도 안 받았다.**
 *    자물쇠가 없던 게 아니라 **문에 안 달려 있었다.**
 *
 * ⛔ **뒷문을 안 만든다.** `--열쇠없이` 같은 스위치를 두면 그건 자물쇠가 아니라 장식이다.
 * ⚠ 대신 **여는 법을 화면에 정확히 찍는다.** 막기만 하고 길을 안 알려 주면 일이 멈춘다.
 * ⚠ `--probe` · `--자가시험` 은 배포가 아니므로 안 막는다. 락도 안 건드린다.
 */
async function 열쇠관문() {
  const { execFileSync } = await import('node:child_process');
  const i = argv.findIndex((a) => a === '--열쇠' || a === '--key');
  const 열쇠 = i >= 0 ? argv[i + 1] : null;
  if (!열쇠) {
    console.log('\n🔒 **배포 열쇠가 없다.** 이 자는 열쇠 없이 배포하지 않는다.\n');
    console.log('  ① node scripts/deploy-key.mjs            히스토리를 읽고 물음을 받는다');
    console.log('  ② node scripts/deploy-key.mjs --답 "…"   맞히면 열쇠가 나온다');
    console.log('  ③ node scripts/deploy.mjs --열쇠 <열쇠> …  그때 배포가 열린다\n');
    console.log('⚠ 열쇠는 **커밋이나 날이 바뀌면 죽는다.** 그때는 다시 읽고 다시 받는다.');
    console.log('⛔ 뒷문은 없다. 히스토리를 안 읽으면 못 나간다.');
    return false;
  }
  try {
    execFileSync('node', ['scripts/check-deploy-ready.mjs', '--열쇠', 열쇠], { stdio: 'inherit' });
    return true;
  } catch {
    console.log('\n⛔ 관문에서 섰다. 위에 적힌 것을 고치고 다시 돌린다.');
    return false;
  }
}

async function main() {
  if (argv.includes('--selftest') || argv.includes('--자가시험')) {
    process.exit((await 자가시험()) ? 1 : 0);
  }

  /*
   * ⛔ --probe 보다 앞에 두지 않는다 — probe 는 배포가 아니다.
   * 🔴 `process.exit(1)` 을 안 쓴다 — 아래 try/finally 를 타면서 **종료코드가 0 으로 덮였다.**
   *    실제로 그랬다: 막는 글은 찍히는데 `$?` 가 0 이라, 이어 부르는 쪽은 **성공으로 읽었다.**
   *    ⭐ 던져서 위쪽 catch 가 1 로 끝내게 한다. 자물쇠는 **소리만 내면 안 되고 물어야 한다.**
   */
  if (!process.argv.includes('--probe') && !(await 열쇠관문())) {
    throw new Error('배포 열쇠가 없다 — 위에 적힌 세 줄을 따른다');
  }

  // --probe 는 판정에 쓸 「새로 나갈 지면」만 보여준다. 배포도 락도 건드리지 않는다.
  if (process.argv.includes('--probe')) {
    const 새주소 = await 새주소찾기();
    console.log(
      새주소.length
        ? `새로 나갈 지면 ${새주소.length}개:\n  ${새주소.map((x) => (x.기댓값 ? `${x.url}  (지문으로 잰다)` : x.url)).join('\n  ')}`
        : '새로 나갈 지면이 없다 — 이번 배포는 옛 방식으로 판정한다',
    );
    return;
  }

  console.log(`배포 점검 — ${시각()} KST\n`);

  // ── ① 남의 락이 걸려 있나 ──────────────────────────────────
  const 락 = 락읽기();
  if (락 && 락.project !== 나.project) {
    if (락.지난분 < 락만료분) {
      console.error(`⛔ ${락.project} 이(가) 배포 중이다 — ${락.지난분.toFixed(1)}분 전에 시작.`);
      console.error(`   메모리를 나눠 쓴다. 끝날 때까지 기다린다.`);
      console.error(`   락: ${LOCK}`);
      process.exit(1);
    }
    console.log(`⚠ ${락.project} 락이 ${락.지난분.toFixed(0)}분째다 — 만료로 본다. 지우고 진행한다.`);
    unlinkSync(LOCK);
  }
  if (락 && 락.project === 나.project && 락.지난분 < 락만료분) {
    // ⚠ 락을 건 프로세스가 죽었으면 배포는 이미 끝났거나 끊긴 것이다. 20분을 기다릴 이유가 없다
    if (!락.임자살아있다) {
      console.log(`⚠ 내 락이 ${락.지난분.toFixed(0)}분째인데 **건 프로세스(pid ${락.pid})가 죽어 있다** — 치우고 진행한다.`);
      unlinkSync(LOCK);
    } else {
      console.error(`⛔ 이 프로젝트가 이미 배포 중이다 (${락.지난분.toFixed(1)}분 전 시작 · pid ${락.pid} 살아 있음).`);
      process.exit(1);
    }
  }

  // ── ② 상대 스테이지가 안정적인가 ───────────────────────────
  const 상대상태 = 상태(상대.stage, 상대.app);
  console.log(`  ${상대.project.padEnd(13)} ${상대상태.status}   (갱신 ${상대상태.updated})`);
  const 내상태 = 상태(나.stage, 나.app);
  console.log(`  ${나.project.padEnd(13)} ${내상태.status}   (갱신 ${내상태.updated})`);

  const 막힘 = [];
  if (상대상태.status !== 'Running') {
    /* ⚠⚠ 2026-08-08 02:1x — **이 자리에서 한 시간 반을 잃었다.**
     *   klifemap 이 01:58 에 Starting 으로 찍힌 뒤 표시가 그대로 멎었다.
     *   1번은 그 뒤 배포한 적이 없고 klifemap.ai 는 99ms 에 200 을 줬는데도
     *   내 배포가 **네 번** 막혔다.
     *
     *   같은 교훈이 이 파일 141줄에 이미 적혀 있었다 —
     *   「ctype 표시가 멎어 있는 것이지 배포가 안 된 것이 아니었다」.
     *   그런데 그걸 **내 프로젝트에만** 적용하고 상대 프로젝트에는 안 썼다.
     *
     * ⛔ 그렇다고 표시를 무시하지는 않는다. 진짜 도는 배포를 밀면 둘 다 죽는다.
     *    **두 가지가 같이 맞을 때만** 멎은 표시로 본다 —
     *      ① 표시가 12분 넘게 그대로다   ② 상대 사이트가 200 을 준다
     *    진짜 배포 중이면 표시가 방금 갱신되거나 사이트가 흔들린다. */
    const 지난분 = 갱신지난분(상대상태.updated);
    const 상대살았나 = await 살아서열리나(상대.probe);
    const 락 = 락읽기();
    const 락으로본배포중 = 상대가배포중인가(락, 상대.project, 락만료분);
    /**
     * 🔴 2026-08-08 08:0x — **오늘만 네 번 이 자리에 막혔다**(06:28·07:03·07:19·08:08).
     *   네 번 다 klifemap.ai 는 200 이었고 1번은 그 사이 계속 커밋하고 있었다.
     *   네 번째는 **11분째**라 12분 문턱에 1분 모자라 막혔다 — 문턱은 임의의 수다.
     *
     * ⭐ 더 나은 자가 이미 있었다 — **락이다.**
     *   락은 우리가 직접 쓰는 **사실**이고, ctype 표시는 남이 보여 주는 **화면**이다.
     *   상대가 락을 안 쥐고 있으면 **상대는 배포하고 있지 않다.**
     *   (klifemap 쪽도 같은 락을 쓴다 — 07:03 에 `klifemap · ctype update` 로 찍힌 것을 봤다)
     *
     * ⛔ 그래도 사이트 200 은 같이 본다. 락을 안 쓰고 배포하는 길이 생겼을 수도 있으니
     *   **두 자 중 하나라도 「배포 중」이라 하면 막는다** — 겹치면 둘 다 죽는다.
     */
    /**
     * 🔴🔴 2026-08-27 14:2x — **둘이 서로를 막아 넷이 다 죽어 있었다.**
     *
     *   klifemap 이 Stopped 로 멎자 이 자가 「배포 중인 것을 밀면 둘 다 죽는다」며 막았다.
     *   같은 시각 klifemap 쪽 자는 「seoulmarkets 가 Running 이 아니다」며 기다렸다.
     *   ⛔ **둘 다 죽으면 둘 다 못 살아난다.** 네 사이트가 전부 404 인데
     *     되살릴 길이 두 자에 다 잠겨 있었다.
     *
     *   무엇이 틀렸나 — 위 조건이 `상대살았나`(사이트 200)를 **반드시** 요구한다.
     *   그런데 상대가 «죽어 있을» 때가 바로 사이트가 200 을 못 주는 때다.
     *   그러니 「상대가 죽었다」와 「상대가 배포 중이다」를 **같은 것으로 다루고 있었다.**
     *
     * ⭐ 둘은 정반대다 —
     *     Starting · Building · Pending  → 진짜 도는 중일 수 있다. 밀면 둘 다 죽는다. 막는다
     *     **Stopped**                    → 도는 것이 없다. 밀 것이 없으니 **막을 까닭이 없다**
     *
     * ⛔ 그래도 락은 그대로 본다. 락을 쥔 사람이 있으면 Stopped 라도 막는다 —
     *   방금 `ctype update` 를 눌러 아직 상태가 안 바뀐 것일 수 있다.
     */
    const 상대가멎어있나 = 멎어있나(상대상태.status);
    const 멎은표시 = 지나가도되나({
      상대상태: 상대상태.status, 상대살았나, 락으로본배포중, 지난분,
    });
    if (상대가멎어있나 && !락으로본배포중) {
      console.log(
        `\n⚠ ${상대.project} 이 **Stopped** 다 — 도는 배포가 없고 락도 비어 있다. **막지 않는다.**`,
      );
      console.log('   (「죽어 있는 것」과 「배포 중인 것」은 정반대다 — 2026-08-27 에 이 둘을 같이 다뤄'
        + ' 네 사이트가 다 죽은 채로 되살릴 길이 잠겼다)');
    }

    if (멎은표시) {
      console.log(
        `\n⚠ ${상대.project} 표시가 ${지난분 === null ? '?' : 지난분}분째 ${상대상태.status} 인데 ` +
        `${상대.probe} 는 200 이고 ` +
        `${락으로본배포중 ? '락도 12분을 넘겼다' : '**락을 아무도 안 쥐고 있다**'}. 표시가 멎은 것으로 본다.`,
      );
      console.log('   (락은 우리가 쓰는 사실이고 ctype 표시는 남이 보여 주는 화면이다)');
    } else {
      막힘.push(
        `${상대.project} 이 ${상대상태.status} 다 — 배포 중인 것을 밀면 둘 다 죽는다` +
        (지난분 === null ? '' : ` (${Math.round(지난분)}분째 · 사이트 ${상대살았나 ? '200' : '안 열림'})`),
      );
    }
  }
  if (내상태.status === 'Starting') {
    /* ⚠⚠ 2026-08-08 02:3x — **같은 것을 한 번 더 겪었다.**
     *   02:16 배포가 「나갔다」로 끝나면서 스스로 「(ctype 표시 Starting)」이라고 적어 놓고도,
     *   02:28 다음 배포에서 그 표시에 제 발이 걸렸다.
     *   상대 프로젝트만 고치고 **내 쪽에 같은 자를 안 댄 것**이다.
     *
     * ⛔ 락이 진짜 방패다 — 이 저장소는 나만 배포한다. 락이 비었으면 도는 배포가 없다.
     *    표시는 거들 뿐이므로, 상대 쪽과 **같은 잣대**로 본다.
     *      ① 표시가 12분 넘게 그대로다   ② 내 사이트가 200 을 준다 */
    const 지난분 = 갱신지난분(내상태.updated);
    const 내가살았나 = await 살아서열리나(나.probe);

    /* ⚠ 2026-08-08 03:2x — **내 배포는 끝날 때마다 표시가 Starting 으로 남는다.**
     *   오늘 새벽 세 번 다 「판정 보류 — ctype Starting · 라이브 200」으로 끝났다.
     *   그러면 이 표시는 내 쪽에서 **아무것도 말해 주지 않는다.** 12분을 기다리는 것은
     *   안전을 사는 것이 아니라 그냥 기다리는 것이다.
     *
     * ⭐ 내 프로젝트의 진짜 방패는 **락**이다 —
     *   이 저장소는 나만 배포하고, 락은 배포가 도는 내내 잡혀 있으며 죽은 pid 는 치운다.
     *   **락이 비었으면 내 배포는 돌고 있지 않다.** 여기까지 왔다는 것이 곧 락이 비었다는 뜻이다.
     * ⛔ 그래도 사이트가 안 열리면 막는다 — 그때는 진짜 무슨 일이 있는 것이다. */
    const 멎은표시 = 내가살았나;

    if (멎은표시) {
      console.log(
        `\n⚠ 내 표시가 ${지난분 === null ? '?' : 지난분}분째 Starting 인데 ${나.probe} 는 200 이다. ` +
        '**표시가 멎은 것으로 본다.**',
      );
      console.log('   (내 배포는 끝날 때마다 이 표시가 남는다. 진짜 방패는 락이고 락은 비어 있다)');
    } else {
      막힘.push(
        '이 프로젝트가 이미 Starting 이다 — 앞선 배포가 아직 안 끝났다' +
        (지난분 === null ? '' : ` (${Math.round(지난분)}분째 · 사이트 ${내가살았나 ? '200' : '안 열림'})`),
      );
    }
  }

  // ⚠ 스테이지가 klifemap 으로 넘어간 채 끝나면 다음 명령이 남의 것을 건드린다
  ctype(['ls', '-t', 나.stage]);

  if (막힘.length) {
    console.error('\n⛔ 배포하지 않는다.');
    막힘.forEach((m) => console.error('   · ' + m));
    if (!FORCE) {
      console.error('\n   정말 해야 하면 --force (사장님 지시가 있을 때만).');
      process.exit(1);
    }
    console.error('\n⚠ --force 로 강행한다.');
  }

  if (CHECK_ONLY) {
    console.log('\n--check 였다. 배포하지 않고 끝낸다.');
    return;
  }

  // ── ③ 락 걸고 통보 ─────────────────────────────────────────
  // 배포 **전에** 새로 나갈 주소를 잡아 둔다. 나간 뒤에 재면 이미 200 이라 뭐가 새 것인지 모른다.
  const 새주소 = await 새주소찾기();
  console.log(
    새주소.length
      ? `이번에 새로 나갈 지면 ${새주소.length}개를 판정에 쓴다:\n  ${새주소.map((x) => (x.기댓값 ? `${x.url}  (지문으로 잰다)` : x.url)).join('\n  ')}`
      : '새로 나갈 지면이 없다(글자 수정뿐인 듯하다) — 옛 방식(ctype 표시 + 라이브 200)으로 판정한다',
  );

  /**
   * 🔴 표식은 **배포를 걸기 전에** 집어 둔다. 나간 뒤에 집으면 「원래 있던 것」과 못 가른다.
   * ⛔ 이미 있으면 그 표식을 버린다 — 배포는 계속한다. 판정만 다른 것으로 한다.
   */
  let 표식이미있었나 = false;
  let 쓸표식 = 표식;
  /**
   * ⭐ 라이브를 집기 «전에», 우리가 방금 지은 것 안에 그 글자가 있는지부터 본다.
   *   없으면 그 표식으로는 무엇도 판정할 수 없다 — 배포는 계속하고 표식만 버린다.
   */
  if (표식) {
    const 낸것에 = 낸것에표식있나(표식.주소, 표식.낱말);
    if (낸것에 === false) {
      console.log(`⚠ 표식 「${표식.낱말}」이 **방금 지은 지면 안에 없다**(${표식.주소}).`);
      console.log('   라이브에도 영원히 안 나타난다 — 이 표식은 안 쓴다. 배포는 계속한다.');
      console.log('   ⭐ 표식은 «지면 글자»여야 한다. 영상·그림 «안»의 글자는 지면에 없다.');
      쓸표식 = null;
    } else if (낸것에 === null) {
      console.log(`⬜ 방금 지은 것에서 ${표식.주소} 를 못 찾았다 — 미리 못 쟀다(막지 않는다)`);
    }
  }
  if (쓸표식) {
    const 있나 = await 표식집기(쓸표식.주소, 쓸표식.낱말);
    if (있나 === '없는지면') {
      /* ⭐ 새로 낸 지면이다. 「404 였던 것이 낱말을 담고 200 이 된다」로 판정한다 */
      console.log(`표식으로 판정한다 — ${쓸표식.주소} 는 지금 404 다. 낱말 「${쓸표식.낱말}」을 담고 뜨면 나간 것이다`);
    } else
    if (있나 === null) {
      console.log(`⬜ 표식을 못 집었다(${쓸표식.주소}) — 이 표식은 안 쓴다`);
      쓸표식 = null;
    } else if (있나) {
      표식이미있었나 = true;
      console.log(
        `⚠ 표식 「${쓸표식.낱말}」이 **배포 전에 이미** 라이브에 있다 — 가짜 성공이 된다. 이 표식은 안 쓴다`,
      );
    } else {
      console.log(`표식으로 판정한다 — ${쓸표식.주소} 에 「${쓸표식.낱말}」이 나타나면 나간 것이다`);
    }
  }

  락걸기('ctype apply');
  /* 🔴 [2026-09-09 20:4x · 5번] **끊겨도 «끊겼다»고 적게 한다.**
   *
   * 오늘 나는 이 자를 두 번 부르고 두 번 다 «내 시간 제한»에 죽였다(각 9~10분).
   * 배포 자체는 나갔지만 지켜보기가 끊겨 **「배포 완료」 통보가 메모에 안 적혔다.**
   * ⇒ 메모에 「🚀 배포 시작」만 매달려 남는다.
   * ⚠ 오늘 3번이 바로 그것에 헷갈렸다 — 매달린 줄과 「라이브가 옛 것」 경보를 보고
   *   배포가 실패한 줄 알고 1번의 미커밋 파일을 stash 까지 하셨다. 실제로는 나가 있었다.
   *
   * ⭐ 락은 걱정 없다 — 이 자에 이미 「내 락인데 pid 가 죽었으면 치우고 진행」이 있다.
   *   빠져 있던 것은 **사람이 읽는 신호**다. 락과 달리 그건 아무도 대신 지워 주지 않는다.
   * ⛔ 그러니 여기서 고치는 것은 락이 아니라 «통보»다.
   */
  const 끊길때 = (신호) => {
    try { 통보(끊긴통보문(딱지, 신호, 시각())); }
    catch { /* 통보가 안 돼도 아래 락은 풀어야 한다 */ }
    try { 락풀기(); } catch { /* 남의 락은 애초에 안 지운다 */ }
    process.exit(130);
  };
  process.on('SIGINT', () => 끊길때('SIGINT'));
  process.on('SIGTERM', () => 끊길때('SIGTERM'));

  통보(
    `> 🚀 **${딱지} 배포 시작 ${시각()} KST** — \`${나.stage}\`\n` +
    `> (이 스테이지 하나가 ${같이나가는곳} 를 같이 냅니다 — 누가 밀었든 셋이 함께 나갑니다)\n` +
      `> 끝나면 이 줄 아래에 결과가 붙습니다. 락: \`${LOCK}\``,
  );
  console.log(`\n락 걸었다. 세션간 메모에 통보했다.\n배포한다 — ${나.stage}`);

  /* 🔴 [2026-09-01 밤] **배포 도장을 먼저 찍는다.** 이 파일이 라이브에 그대로 보이면
     그 배포가 «정말» 나간 것이다. 아래 배포 뒤 대조가 이 파일을 읽는다.
     ⛔⛔ 담을 때 **이 한 파일만** 담는다. 오늘 낮에 내가 전체 담기를 해서 3번의 미커밋
        파일을 스쳐 담아가 빌드를 깨뜨렸다. 여섯이 한 작업 트리를 쓴다 — 경로를 못 박는다.
     ⚠ 담기·밀기가 안 되어도 배포는 계속한다. 도장은 «재는 자»일 뿐이고,
        재는 자 때문에 배포가 멈추면 그것이 더 나쁘다. 대신 못 쟀다고 적는다. */
  try {
    const 도장 = await import('./check-live-is-my-head.mjs');
    도장.도장찍기();
    execFileSync('git', ['add', '--', 'public/deploy-stamp.txt'], { cwd: 뿌리, stdio: 'ignore' });
    const 바뀐것 = execFileSync('git', ['diff', '--cached', '--name-only'], { cwd: 뿌리 }).toString().trim();
    if (바뀐것) {
      execFileSync('git', ['commit', '-q', '-m', '배포 도장 (라이브 대조용 · 자동)'], { cwd: 뿌리, stdio: 'ignore' });
      execFileSync('git', ['push', '-q'], { cwd: 뿌리, stdio: 'ignore' });
      console.log('  · 배포 도장을 찍고 밀었다 — 배포 뒤 이것으로 라이브를 대조한다');
    }
  } catch (e) {
    console.log('  ⬜ 배포 도장을 못 찍었다 — ' + String(e.message).slice(0, 70) + ' (배포는 계속한다)');
  }

  try {
    // ⚠ -t 를 절대 빼지 않는다
    /* ⚠ 저장소 절대경로로 준다. 상대경로면 부른 자리에 따라 못 찾는다 */
    const 설계도 = path.join(뿌리, '.cloudtype', 'app.yaml');
    if (!existsSync(설계도)) {
      락풀기();
      console.log(`\n⛔ 설계도가 없다 — ${설계도}\n   배포하지 않는다. 이걸 넘기면 「나갔다」고 적고 아무것도 안 나간다.`);
      process.exit(1);
    }
    const out = ctype(['apply', '-f', 설계도, '-t', 나.stage]);
    console.log(out.trim().split('\n').slice(-2).join('\n'));
    /* 🔴 ctype 이 「파일이 없다」를 조용히 넘기고 있던 통을 되살린다.
     *   그러면 라이브가 200 이라 이 스크립트가 「✅ 나갔다」로 끝낸다 — 실제로는 안 나갔다.
     *   2026-08-08 05:3x 에 그렇게 한 번 속았다. 그 말이 보이면 성공으로 읽지 않는다. */
    if (헛돌았나(out)) {
      락풀기();
      console.log('\n⛔ ctype 이 「파일을 못 찾았다」고 했다 — 헛돌았다.\n   라이브가 200 이어도 나간 것이 아니다. 아래를 그대로 옮긴다:\n' + out.trim());
      process.exit(1);
    }

    // ── ④ 뜰 때까지 지켜본다 — **시간이 아니라 실제 상태로 판정한다** ──
    // ⚠ 옛 감시 한도(400초)가 컨테이너 기동보다 짧아 **성공을 「미완」으로 오판**했다
    //   (2026-08-05 두 번). 사람이 「실패했네」 하고 다시 돌리면 롤링에 메모리가 두 배 든다.
    //   그래서 ① 한도를 600초로 늘리고 ② 그래도 Running 을 못 보면 **라이브 URL 로 실제를 본다**
    //   ③ ⛔ 조용히 「실패/미완」이라고 적지 않는다.
    // ⭐ 2026-08-07 — **표시 말고 내용으로 판정한다.** 새로 나갈 주소가 200 이 되면 끝난 것이다.
    //   ctype 표시가 멎어도 이건 사실이라 안 흔들린다. 없으면 옛 방식으로 되돌아간다.
    // ⭐ 2026-08-08 18:3x — 볼 것이 하나 늘었다. **부른 사람이 준 표식**을 제일 먼저 본다.
    //   그리고 아무 표식도 없으면 「보류」가 아니라 **「모름」**으로 적는다 — 2번 지시.
    let 결과 = 'Starting';
    let 내용확인 = null;
    let 표식나타났나 = false;
    /**
     * 🔴 2026-08-23 — ctype 이 `Running` 이라 하여 고리를 나갔는데 표식이 아직 404 였다.
     *   자는 「❌ 안 나갔다」고 적었다. 그런데 **두 번 더 재 보니 200 이었다.**
     *   컨테이너가 Running 이 되는 순간과 새 파일이 서비스되는 순간은 같지 않다.
     *   ⭐ 그러니 잴 것(표식·새 주소)이 있으면 Running 을 보고도 **곧바로 안 나간다.**
     *      유예만큼 더 재고, 그래도 안 뜨면 그때 판정한다. 없는 실패를 적는 것이
     *      늦게 적는 것보다 나쁘다 — 사람이 다시 돌리면 롤링에 메모리가 두 배 든다.
     */
    /**
     * 🔴🔴 [2026-08-28 · 5번] **이 고리는 최대 600초(30회 × 20초) 돈다.
     *   그러니 이 자를 «600초보다 짧은 시간제한»으로 감싸 부르지 마라.**
     *   ─────────────────────────────────────────────────────────────
     *   새벽에 `timeout 550` 로 감싸 불렀다가 배포가 아직 Building 인 채로 잘렸다.
     *   ⛔ 그래서 ① 아무 판정도 못 남기고 ② **자물쇠가 죽은 채 남았다**(20분간 남의 배포를 막는다)
     *     ③ 나는 「배포가 실패했나」 하고 헤맸다. **실제로는 잘 나가고 있었다.**
     *   ⚠ 지켜보는 자를 중간에 끊으면 «배포»가 멈추는 것이 아니다. 배포는 서버에서 계속 돈다 —
     *     끊기는 것은 **우리가 결과를 아는 길**뿐이다. 그것이 더 나쁘다.
     *   ⭐ 끊겼으면 다시 배포하지 말고 **라이브를 직접 보라** — 표식이 떴으면 나간 것이다.
     */
    let 러닝본뒤 = 0;
    /* 🔴🔴 [2026-08-30 · 5번] **유예를 6회(120초)에서 15회(300초)로 늘린다.**
       ─────────────────────────────────────────────────────────────
       오늘 llms.txt 배포에서 이 자가 180초에 「❌ 안 나갔다」로 적었다. **그런데 나갔다.**
       라이브를 직접 보니 200 이었다. 없는 실패를 적은 것이다.
       ⚠ 까닭 — 앞선 배포로 컨테이너가 이미 «Running» 이었다. 새로 민 것이 아직
         빌드에 안 들어갔는데도 상태는 계속 Running 이라, 유예 120초가 그냥 흘러갔다.
         (같은 날 앞선 배포는 표식이 뜨기까지 **460초**가 걸렸다. 120초는 애초에 짧았다.)
       ⛔ 없는 실패를 적으면 사람이 «다시 민다» — 롤링이 두 번 돌아 메모리가 두 배 든다.
         내가 오늘 그렇게 했다. 이 주석은 그 값이다. */
    const 러닝유예 = 15;  // 15회 × 20초 = 300초
    for (let i = 0; i < 30; i++) {
      await sleep(20000);
      결과 = 상태(나.stage, 나.app).status;

      /* 🔴 표식이 있으면 **그것부터** 본다. 부른 사람이 무엇이 바뀌는지 아는 유일한 사람이다 */
      if (쓸표식 && !표식이미있었나) {
        /* ⚠ '없는지면' 은 아직 404 라는 뜻이다 — 「나타났다」로 세면 안 된다 */
        const 집은것 = await 표식집기(쓸표식.주소, 쓸표식.낱말);
        const 있나 = 집은것 === true;
        if (있나 === true) {
          표식나타났나 = true;
          console.log(`  ${(i + 1) * 20}초 · ${결과} · 표식 「${쓸표식.낱말}」 떴다`);
          break;
        }
      }

      if (새주소.length) {
        const { createHash } = await import('node:crypto');
        const 잰것 = await Promise.all(새주소.map(async ({ url, 기댓값 }) => {
          try {
            if (!기댓값) return (await fetch(url, { method: 'HEAD', redirect: 'manual' })).status;
            // 글자만 고친 지면은 **지문이 같아지면** 나간 것이다
            const 글 = await (await fetch(url)).text();
            const h = createHash('md5').update(글.replace(/\r\n/g, '\n')).digest('hex');
            return h === 기댓값 ? 200 : 0;
          } catch { return 0; }
        }));
        // ⚠ **하나라도 200 이면 새 빌드가 서고 있는 것이다.**
        //   「전부 200」으로 두었더니 한 장이 안 떠서 600초를 다 태웠다(2026-08-07 06:0x).
        //   지면이 안 뜨는 데는 다른 까닭이 있을 수 있고(주소 규칙·noindex·라우팅),
        //   그것은 배포가 끝났나와 다른 문제다. 안 뜬 것은 **이름을 적어 남긴다.**
        // ⚠ 2026-08-21 — 3xx(리다이렉트)도 **떴다**로 센다. apex→www·끝슬래시 정규화가
        //   301 을 내는데, 옛 검사는 `=== 200` 이라 살아 있는 /newsletter 를 「아직 404」로
        //   몇 시간째 거짓 경보했다(2번 지적). 200~399 면 라이브다. 404·5xx·0(지문불일치)만 못 뜬 것.
        const 뜬것 = 새주소.filter((_, k) => 잰것[k] >= 200 && 잰것[k] < 400);
        console.log(`  ${(i + 1) * 20}초 · ${결과} · 새 지면 ${잰것.join('/')}`);
        if (뜬것.length) {
          // ⚠ 2026-08-21 (2번 두 번째 지적) — 「안 뜬 것」을 **실제 HTTP 상태로 재확인**한다.
          //   지문(해시) 불일치는 잰것=0 이지만 **라이브는 200 일 수 있다**(CDN·동적 조각으로 빌드본과
          //   글자가 한 끗 다르면 해시가 어긋난다). 그건 「내용이 아직 안 바뀜」이지 「404」가 아니다.
          //   /newsletter 가 HEAD·GET 다 200 인데도 「안 뜬 것」에 실려 몇 시간째 거짓 경보한 까닭이 이것.
          //   ⇒ 2xx·3xx 면 뜬 것으로 보고 목록에서 뺀다. 진짜 못 뜬 것(≥400·접속실패)만 남긴다.
          const 안뜬후보 = 새주소.filter((x) => !뜬것.includes(x));
          const 진짜안뜬 = [];
          for (const x of 안뜬후보) {
            let 살아있나 = false;
            try {
              const st = (await fetch(x.url, { method: 'HEAD', redirect: 'manual' })).status;
              살아있나 = st >= 200 && st < 400;
            } catch { 살아있나 = false; }
            if (!살아있나) 진짜안뜬.push(x.url);
          }
          내용확인 = { 뜬것: 뜬것.map((x) => x.url), 안뜬것: 진짜안뜬 };
          break;
        }
      } else {
        console.log(`  ${(i + 1) * 20}초 · ${결과}`);
      }
      if (결과 === 'Running') {
        const 잴것있나 = (쓸표식 && !표식이미있었나) || 새주소.length > 0;
        러닝본뒤 += 1;
        if (!잴것있나 || 러닝본뒤 > 러닝유예) break;
        if (러닝본뒤 === 1) console.log(`      ⏳ ctype 은 Running 인데 아직 안 보인다 — ${러닝유예 * 20}초 더 잰다`);
      }
    }

    /**
     * 🔴 **판정은 `판정하기()` 한 곳에서 낸다** (2번 지시 18:2x).
     *   여기서 다시 if 를 쓰지 않는다 — 흩어 놓으면 시험할 수 없고, 시험 못 하는 판정이 오늘 사고를 냈다.
     */
    const 라이브코드먼저 = 내용확인 || 결과 === 'Running' ? null : await 라이브확인();
    const 판 = 판정하기({
      표식있나: !!쓸표식 || 표식이미있었나,
      표식이미있었나,
      표식나타났나,
      지면판정: !!내용확인,
      ctype상태: 결과,
      라이브코드: 라이브코드먼저,
    });

    /* ⚠ 표식을 줬는데 안 나타난 것은 **❌ 다.** 「모름」으로 뭉개지 않는다 */
    if (판.꼴 === '안나갔다') {
      통보(
        `> ❌ **${딱지} 배포 안 나갔다 ${시각()} KST** — 표식 「${쓸표식.낱말}」이 ` +
          `${쓸표식.주소} 에 끝까지 안 나타났다(600초).\n` +
          `> ctype \`${결과}\` · 라이브 \`${라이브코드먼저}\`. **라이브는 옛 지면입니다.**`,
      );
      console.log(`\n❌ 안 나갔다 — 표식 「${쓸표식.낱말}」이 안 나타났다 (ctype ${결과})`);
    } else if (판.꼴 === '표식빗나감') {
      /* 🔴 [2026-08-26] 나갔다 — 다만 표식이 안 맞았다. ⛔ ❌ 로 내지 않는다:
         메모를 읽는 다른 자리가 「배포 실패」로 읽는다(오늘 실제로 그렇게 읽혔다). */
      통보(
        `> ✅ **${딱지} 배포 완료 ${시각()} KST** — 새 지면이 라이브 200 이다.\n`
          + (내용확인?.뜬것 ?? []).map((u) => `> · ${u} 200`).join('\n')
          + `\n> ⚠ 다만 표식 「${쓸표식.낱말}」은 ${쓸표식.주소} 에서 못 찾았습니다.\n`
          + `> **틀린 것은 배포가 아니라 표식입니다** — 그 낱말이 지면 «글자»에 없었을 수 있습니다`
          + `(그림 안의 글자는 못 찾습니다). 다음에는 지면 본문에 새로 생긴 낱말을 주십시오.`,
      );
      console.log(`\n✅ 나갔다 — 새 지면 ${내용확인?.뜬것?.length ?? 0}개 라이브 200`);
      console.log(`⚠ 표식 「${쓸표식.낱말}」은 못 찾았다 — 표식이 틀린 것이지 배포가 틀린 것이 아니다`);
    } else if (판.꼴 === '표식못씀') {
      /* 가짜 성공을 막았다. 다른 것으로 다시 판정한다 — 표식이 없었던 셈으로 친다 */
      const 다시 = 판정하기({
        표식있나: false,
        지면판정: !!내용확인,
        ctype상태: 결과,
        라이브코드: 라이브코드먼저 ?? (await 라이브확인()),
      });
      통보(
        `> ⚠ **${딱지} 표식을 못 썼습니다 ${시각()} KST** — 「${표식.낱말}」이 ` +
          `**배포 전에 이미** 라이브에 있었습니다(가짜 성공).\n` +
          `> 다시 판정: ${다시.말}\n` +
          `> ⭐ 다음에는 **이번 커밋이 실제로 바꾼 낱말**을 주십시오.`,
      );
      console.log(`\n⚠ 표식 못 씀 — 배포 전에 이미 있었다. 다시 판정: ${다시.꼴} · ${다시.말}`);
    } else if (판.꼴 === '모름') {
      /**
       * ⚠ 옛 자는 여기서 **「판정 보류」**라고 적었다. 2번 —
       *   *「⛔ 「보류」는 사람이 「다시 돌려야 하나」로 읽습니다. 오늘 그래서 겹쳐 돌린 사람이 있었습니다」*
       */
      통보(
        `> ⬜ **${딱지} 배포 판정 모름 ${시각()} KST** — ${판.말}\n` +
          `> ⛔ **다시 돌리지 마십시오.** 「모름」은 실패가 아닙니다 — 볼 표식이 없었을 뿐입니다.\n` +
          `> ⭐ 다음부터 \`--표식 <주소> <이번에 바뀐 낱말>\` 을 같이 주시면 여기서 ✅/❌ 가 납니다.`,
      );
      console.log(`\n⬜ 판정 모름 — ${판.말}\n   ⛔ 다시 돌리지 말 것. 실패가 아니라 못 잰 것이다.`);
    } else if (표식나타났나) {
      통보(
        `> ✅ **${딱지} 배포 완료 ${시각()} KST** — 표식 「${쓸표식.낱말}」이 ` +
          `${쓸표식.주소} 에 떴다.\n> (ctype 표시는 \`${결과}\` — 표시가 아니라 라이브 글자로 판정했다)`,
      );
      console.log(`\n✅ 표식 「${쓸표식.낱말}」 떴다 — 나갔다 (ctype 표시 ${결과})`);
    } else if (내용확인) {
      // 새로 낸 지면이 실제로 200 이다. ctype 표시가 무엇이든 나간 것이다.
      const 못뜬줄 = 내용확인.안뜬것.length
        ? `\n> ⚠ **아직 안 뜬 것(200~399 아님)** — ${내용확인.안뜬것.join(' · ')}\n` +
          `> 배포와 별개 문제다. 주소 규칙·라우팅을 눈으로 본다.`
        : '';
      통보(
        `> ✅ **${딱지} 배포 완료 ${시각()} KST** — 새 지면이 라이브에 떴다.\n` +
          내용확인.뜬것.map((u) => `> · ${u} 200`).join('\n') +
          `\n> (ctype 표시는 \`${결과}\` — 표시가 아니라 지면으로 판정했다)` + 못뜬줄,
      );
      console.log(`\n✅ 새 지면 ${내용확인.뜬것.length}개 라이브 200 — 나갔다 (ctype 표시 ${결과})`);
      if (내용확인.안뜬것.length) console.log(`⚠ 아직 안 뜸(200~399 아님): ${내용확인.안뜬것.join(' · ')}`);
    } else if (결과 === 'Running') {
      const code = await 라이브확인();
      통보(`> ✅ **${딱지} 배포 완료 ${시각()} KST** — 상태 \`Running\` · 라이브 \`${code}\``);
      console.log(`\n✅ Running · 라이브 ${code}`);
    }

    /* 🔴🔴 [2026-09-01 밤] **「배포 완료」로 끝내면 안 된다.**
       klifemap 에서 배포 명령이 「deployed」라 답하고 「새 포드가 떴다 ✅」까지 찍힌 뒤에도
       **라이브 파일은 옛 것이었다.** 두 판을 잇달아 배포하고도 그랬다. 그 통은 빌드와
       배포가 따로 돌아, 밀자마자 배포하면 «직전 이미지»가 다시 내려간다.
       ⛔ 그 사이 나는 라이브에서 재고 「고쳤는데 왜 안 되지」로 코드를 또 뒤졌다 —
          두 시간을 헛돌았다. «배포됐다는 말»을 믿은 것이 잘못이다.
       ⭐ 그래서 배포 도장으로 «손님이 받는 것이 내 HEAD 인가»를 잰다(세 지면 다).
       ⚠ 도장이 라이브에 없으면 «못 쟀다»로 낸다 — 0 으로 치지 않는다.
          (도장을 처음 넣은 배포에서는 그 배포가 끝난 «다음»부터 잴 수 있다.) */
    try {
      const 도장 = await import('./check-live-is-my-head.mjs');
      const r = await 도장.견준다();
      if (r.다른것) {
        통보(`> 🔴 **${딱지} — 배포는 나갔는데 라이브가 아직 옛 것이다.** 몇 분 뒤 다시 배포한다.`);
        console.log('\n  ⚠ 배포는 나갔지만 **라이브는 아직 옛 것이다.** 위 안내를 따르십시오.');
      }
    } catch (e) {
      console.log('  ⬜ 배포 도장 대조를 못 했다 — ' + String(e.message).slice(0, 70) + ' (0 으로 치지 않는다)');
    }
    /**
     * ⚠ 옛 자에는 여기 **「판정 보류」** 가지가 하나 더 있었다. 지웠다 —
     *   그 자리는 이제 `판정하기()` 가 **「모름」**으로 돌려주고 위에서 받는다.
     *   ⛔ 두 곳에서 같은 것을 판정하면 갈라진다. 한 곳에서만 낸다.
     */
  } finally {
    락풀기();
    ctype(['ls', '-t', 나.stage]); // 전역 스테이지를 우리 것으로 되돌려 둔다
    console.log('락 풀었다.');
  }
}

/* ⚠ [2026-08-27] `process.argv[1]` 이 «없을» 때가 있다 — `node -e` 로 불러 쓸 때가 그렇다.
   그러면 `pathToFileURL(undefined)` 가 던져서 **이 자를 부품으로 못 쓴다.**
   오늘 이 자의 규칙 하나가 옳은지 밖에서 재 보려다 여기서 막혔다.
   ⛔ 「직접 돌 때만 일한다」는 자물쇠가 «불러 쓰는 것 자체»를 막으면 안 된다. */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    락풀기();
    /* 🔴 빌드가 깨진 것은 «배포 문제가 아니다». 사람이 고칠 곳을 짚어 준다.
       ⛔ 여기서 「다시 배포하십시오」라고 말하지 않는다 — 그 말이 오늘 두 번 헛돌게 했다. */
    if (e instanceof 빌드실패) {
      const 짚 = e.get짚은곳();
      console.error('\n🔴🔴 **빌드가 깨졌다 — 배포하지 않았다.**');
      console.error('   Cloudtype 도 같은 저장소를 같은 명령으로 굽는다. 여기서 깨지면 거기서도 깨진다.');
      console.error('   ⛔ 다시 배포해도 소용없다. **고쳐야 나간다.**\n');
      if (짚 && 짚.꼴 === '콘텐츠스키마') {
        console.error(`   어디가  ${짚.고치는곳}`);
        console.error(`   무엇이  ${짚.까닭 ?? '(못 짚었다 — 아래 원문을 보십시오)'}`);
        console.error(`   묶음    ${짚.묶음}\n`);
      } else if (짚) {
        console.error(`   어디가  ${짚.고치는곳}\n`);
      } else {
        console.error('   ⬜ 어디인지 **못 짚었다.** 아래 원문을 그대로 보십시오.\n');
      }
      console.error('── 빌드가 낸 말 ─────────────────────────────');
      console.error(e.글.trim().split('\n').slice(-25).join('\n'));
      console.error('─────────────────────────────────────────────');
      console.error('\n   🔴 세 사이트가 **한 빌드**다. 이것을 고칠 때까지 6번·3번의 배포도 안 나간다.');
      console.error('   ✅ 고친 뒤 확인: node scripts/build-once.mjs   (종료코드 0 이어야 한다)');
      process.exit(1);
    }
    console.error(e);
    process.exit(1);
  });
}
