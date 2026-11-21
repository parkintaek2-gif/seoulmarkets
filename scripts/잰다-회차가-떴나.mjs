/**
 * 잰다-회차가-떴나.mjs — **회차가 «떴나·성공했나»를 예약 자체에 물어서 잰다.**
 *
 * ── 🔴 왜 지었나 (2026-10-13 11:4x · 5번) ─────────────────────────────
 * `check-기사가-여섯편-다나갔나.mjs` 가 2026-10-12 를 이렇게 적었다 —
 * ```
 *   🔴 2026-10-12 (월)  2/6 편
 *        회차가 글을 안 냈다 : 09시 · 16시
 * ```
 * ⛔ 그런데 예약에 직접 물어 보니 **16시는 떴고 SUCCEEDED 였다** —
 * ```
 *   16시  fired_at 2026-10-12 15:26 KST · finished_at 15:33 · status SUCCEEDED
 * ```
 * ⭐ 즉 「회차가 글을 안 냈다」가 아니라 **「돌았는데 기사가 안 나왔다」**였다.
 *   둘은 처방이 아주 다르다 —
 *     · 안 떴다      ⇒ 예약·시간대·플랫폼을 본다
 *     · 떴는데 없다  ⇒ 지시문·데스킹·거두기를 본다
 *   가르지 않으면 **엉뚱한 데를 고치고 「고쳤다」고 적게 된다.**
 *
 * ⛔ 이 자는 「기사가 나갔나」를 말하지 않는다. 그것은 거둔기록이 잰다.
 *   이 자가 답하는 것은 하나다 — **«회차가 떴나, 그리고 성공했나»**
 *
 * ⚠ 예약은 **마지막 한 번**만 들고 있다(last_run). 그래서 역사가 없다.
 *   ⇒ 매시 돌면서 **대장에 쌓는다.** 같은 run 은 session_id 로 가려 두 번 안 적는다.
 *   ⭐ 오늘 쌓기 시작했으니 어제 것은 영영 없다 — 그래도 내일부터는 안다.
 *
 * 쓰는 법  node scripts/잰다-회차가-떴나.mjs --자가시험
 *          node scripts/잰다-회차가-떴나.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const 여기 = path.dirname(fileURLToPath(import.meta.url));
const 뿌리 = path.resolve(여기, '..');
export const 대장 = path.join(뿌리, 'docs', '회차-뜬기록.tsv');

const 탭 = String.fromCharCode(9);
const 엔 = String.fromCharCode(10);

/** 예약 하나에서 «우리가 알고 싶은 것»만 뽑는다. 못 읽으면 null — 「안 떴다」가 아니다 */
export function 뽑는다(트리거) {
  if (!트리거 || typeof 트리거 !== 'object') return null;
  const r = 트리거.last_run;
  if (!r || typeof r !== 'object') return null;
  if (!r.fired_at || !r.session_id) return null;
  return {
    뜬때: String(r.fired_at),
    끝난때: r.finished_at ? String(r.finished_at) : null,
    상태: String(r.status ?? ''),
    세션: String(r.session_id),
  };
}

/** 몇 분 걸렸나. 못 재면 null — 0 으로 적지 않는다 */
export function 걸린분(뜬때, 끝난때) {
  if (!뜬때 || !끝난때) return null;
  const a = new Date(뜬때).getTime();
  const b = new Date(끝난때).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return null;
  return Math.round((b - a) / 60000);
}

/** 한국시간 글로 바꾼다. ⛔ toISOString() 을 쓰지 않는다 */
export function 한국시각(iso) {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return null;
  return d.toLocaleString('sv-SE').replace(' ', 'T');
}

/** 판정. ⛔ 「모른다」를 「성했다」로 적지 않는다 */
export function 판정(뽑은것) {
  if (!뽑은것) return { 빛: '⬜', 말: '못 쟀다 — 예약이 돈 기록을 안 들고 있다' };
  const s = String(뽑은것.상태 ?? '');
  if (s.includes('SUCCEEDED')) return { 빛: '✅', 말: '떴고 성공했다' };
  if (s.includes('FAILED') || s.includes('ERROR')) return { 빛: '🔴', 말: '떴는데 실패했다 — ' + s };
  if (!뽑은것.끝난때) return { 빛: '⚠', 말: '떴고 아직 도는 중이다' };
  return { 빛: '⚠', 말: '떴다 — 상태를 모른다(' + s + ')' };
}

/**
 * 대장에 이미 있는 run 인가.
 * ⛔ 「글 어딘가에 그 세션이 보인다」가 아니라 «세션 칸»이 같은지 본다 —
 *   아무 데나 걸리면 멀쩡한 새 run 을 「이미 적었다」로 버린다.
 */
export function 이미적혔나(글, 세션) {
  if (!세션) return false;
  return String(글 ?? '').split(엔).some((l) => l.split(탭)[4] === 세션);
}

/* ── 자가시험 ──────────────────────────────────────────────────────── */
function 자가시험() {
  let 통과 = 0;
  let 실패 = 0;
  const 본다 = (말, 참) => {
    if (참) { 통과 += 1; console.log('  ✅ ' + 말); } else { 실패 += 1; console.log('  🔴 ' + 말); }
  };

  const 뜬때 = '2026-10-12T06:26:52.717Z';
  const 끝난때 = '2026-10-12T06:33:55.154Z';
  const 보기 = { last_run: { status: 'ROUTINE_RUN_STATUS_SUCCEEDED', fired_at: 뜬때, finished_at: 끝난때, session_id: 'cse_1' } };

  본다('예약에서 네 가지를 뽑는다', 뽑는다(보기).세션 === 'cse_1');
  본다('⛔ last_run 이 없으면 null — 「안 떴다」가 아니다', 뽑는다({}) === null);
  본다('⛔ 트리거가 아니어도 안 터진다', 뽑는다(null) === null);
  본다('⛔ 뜬 때가 없으면 null', 뽑는다({ last_run: { session_id: 'a' } }) === null);
  본다('⛔ 아직 안 끝났으면 끝난때가 null 이다 — ',
    뽑는다({ last_run: { fired_at: 뜬때, session_id: 'a' } }).끝난때 === null);

  본다('걸린 분을 센다', 걸린분(뜬때, 끝난때) === 7);
  본다('⛔ 끝난 때가 없으면 null — 0 분이 아니다', 걸린분(뜬때, null) === null);
  본다('⛔ 끝이 시작보다 앞서면 null', 걸린분('2026-10-12T07:00:00Z', '2026-10-12T06:00:00Z') === null);

  본다('✅ SUCCEEDED 면 초록', 판정(뽑는다(보기)).빛 === '✅');
  본다('🔴 FAILED 면 빨강', 판정({ 상태: 'ROUTINE_RUN_STATUS_FAILED', 끝난때: 'x' }).빛 === '🔴');
  본다('⚠ 아직 도는 중이면 ⚠ — ⛔ 성공으로 적지 않는다',
    판정({ 상태: 'ROUTINE_RUN_STATUS_RUNNING', 끝난때: null }).빛 === '⚠');
  본다('⬜ 못 쟀으면 ⬜ — ⛔ 「안 떴다」가 아니다', 판정(null).빛 === '⬜');
  본다('   그 말에 «못 쟀다»가 든다', /못 쟀다/.test(판정(null).말));

  본다('🔴 같은 run 을 두 번 적지 않는다 — session_id 로 가린다',
    이미적혔나(['2026-10-13', '16', 'x', 'y', 'cse_1'].join(탭), 'cse_1') === true);
  본다('⛔ 다른 run 은 새로 적는다',
    이미적혔나(['2026-10-13', '16', 'x', 'y', 'cse_1'].join(탭), 'cse_2') === false);
  본다('⛔ 빈 대장에도 안 터진다', 이미적혔나(null, 'cse_1') === false);
  본다('⛔ 세션 칸이 «아닌» 자리에 같은 글이 있어도 「적힌 것」으로 읽지 않는다',
    이미적혔나(['cse_1', '16', 'x', 'y', 'cse_9'].join(탭), 'cse_1') === false);
  본다('⛔ 세션이 없으면 false — 「이미 적었다」로 버리지 않는다', 이미적혔나('아무글', null) === false);

  본다('한국시각으로 바꾼다 — ⛔ toISOString() 을 안 쓴다',
    /^2026-10-\d\dT\d\d:\d\d/.test(한국시각(뜬때)));
  본다('⛔ 말이 안 되는 때는 null', 한국시각('어제') === null);

  console.log(엔 + '자가시험 ' + (통과 + 실패) + '개 · 통과 ' + 통과 + ' · 실패 ' + 실패);
  return 실패 === 0;
}

/* ── 본체 ──────────────────────────────────────────────────────────── */
async function 잰다() {
  const { 조직, 회차읽기 } = await import('./set-jbnews-sports-prompt.mjs');
  const 수집기글 = fs.readFileSync(path.join(여기, 'collect-jbnews-sports-articles.mjs'), 'utf8');
  const 회차 = 회차읽기(수집기글);
  if (!회차.length) { console.log('🔴 회차를 하나도 못 읽었다 — 수집기를 본다'); return 1; }

  const require = createRequire('file:///C:/Users/User/Documents/GitHub/klifemap/package.json');
  const puppeteer = require('puppeteer-core');
  const b = await puppeteer.connect({ browserURL: (process.env.KLM_CHROME_PORT ? 'http://127.0.0.1:' + process.env.KLM_CHROME_PORT : 'http://127.0.0.1:9222'), defaultViewport: null });
  const page = await b.newPage();
  let 나쁨 = 0;
  const 적을것 = [];
  const 옛글 = fs.existsSync(대장) ? fs.readFileSync(대장, 'utf8') : '';
  try {
    await page.goto('https://claude.ai/scheduled-task/' + 회차[0][1], { waitUntil: 'domcontentloaded', timeout: 90000 });
    await new Promise((r) => setTimeout(r, 3000));
    console.log('■ 회차가 «떴나·성공했나» — 예약에 직접 묻는다' + 엔);
    for (const [시, trig] of 회차) {
      const 받 = await page.evaluate(async (조직2, trig2) => {
        const res = await fetch('/api/organizations/' + 조직2 + '/cowork/scheduled_tasks/' + trig2, { headers: { accept: 'application/json' } });
        return { 상태: res.status, 글: await res.text() };
      }, 조직, trig);
      if (받.상태 !== 200) {
        console.log('  ⬜ ' + 시 + '시 — 못 물었다 (' + 받.상태 + '). 「안 떴다」가 아니다');
        continue;
      }
      const 뽑 = 뽑는다(JSON.parse(받.글).trigger);
      const r = 판정(뽑);
      const 분 = 뽑 ? 걸린분(뽑.뜬때, 뽑.끝난때) : null;
      console.log('  ' + r.빛 + ' ' + 시 + '시  ' + (뽑 ? 한국시각(뽑.뜬때) : '—').padEnd(20)
        + r.말 + (분 === null ? '' : ' · ' + 분 + '분 걸렸다'));
      if (r.빛 === '🔴') 나쁨 += 1;
      if (뽑 && !이미적혔나(옛글, 뽑.세션)) {
        적을것.push([한국시각(뽑.뜬때).slice(0, 10), 시, 한국시각(뽑.뜬때),
          분 === null ? '못쟀다' : 분 + '분', 뽑.세션, 뽑.상태].join(탭));
      }
    }
  } finally { await page.close(); b.disconnect(); }

  if (적을것.length) {
    if (!fs.existsSync(대장)) {
      fs.writeFileSync(대장, ['# 회차가 뜬 기록 — 날/회차/뜬때(KST)/걸린시간/session_id/상태',
        '# 🔴 예약은 «마지막 한 번»만 들고 있다(last_run). 매시 쌓아야 역사가 생긴다.',
        '# ⛔ 「회차가 안 떴다」와 「떴는데 기사가 없다」는 처방이 아주 다르다 —',
        '#   앞은 예약·시간대를 보고, 뒤는 지시문·데스킹·거두기를 본다.',
        ''].join(엔), 'utf8');
    }
    fs.appendFileSync(대장, 적을것.join(엔) + 엔, 'utf8');
    console.log(엔 + '  ✔ 새 run ' + 적을것.length + '개를 대장에 적었다 — docs/회차-뜬기록.tsv');
  } else {
    console.log(엔 + '  ⬜ 새로 적을 run 이 없다 — 아까 본 것과 같다(두 번 안 적는다)');
  }
  console.log('  ⛔ 이 자는 「기사가 나갔나」를 말하지 않는다 — 그것은 거둔기록이 잰다.');
  return 나쁨 ? 1 : 0;
}

/* ── 들머리 ────────────────────────────────────────────────────────── */
const 내가진입점 = process.argv[1]
  && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (내가진입점) {
  if (process.argv.includes('--자가시험')) process.exit(자가시험() ? 0 : 1);
  else process.exit(await 잰다());
}
