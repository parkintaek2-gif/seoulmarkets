/**
 * 신문 제목 아카이브를 «세는» 자.
 *
 * 🔴 [2026-09-09 01:2x · 5번] **이 자를 만든 까닭 — 세는 사람이 계속 0으로 세고 있었다.**
 *
 * 이어가기 프롬프트에도 파일 꼴이 이렇게 적혀 있다 —
 *   「파일 꼴은 `{ 잰때, 매체별: { 매체이름: [...] } }` 다」
 *   「평소 24건(매일경제·동아일보·스타뉴스·텐아시아 각 6)이다」
 *
 * ⛔ **둘 다 실제와 다르다.** 오늘 재 보니 이렇다 —
 * ```
 *   매체별.<매체>  는 «배열이 아니라» { 갈래, 몫, 받은수, 쓸만한수, 못받은, 쓸만한:[...] }
 *   평소 건수      24건이 아니라 «받은 380~400건 · 쓸만한 100~150건»
 * ```
 * ⇒ 배열로 알고 `.length` 를 부르면 undefined 라 **네 매체가 다 0건으로 나온다.**
 *   나는 오늘 실제로 「합 0 · 매일경제 0 · 동아일보 0 …」을 찍고 나서야 알았다.
 *   프롬프트가 시킨 대로 「최상위에서 배열을 찾지 않기」는 지켰는데, **한 겹 더 안쪽에서**
 *   같은 병을 앓은 것이다.
 *
 * ⭐ 그래서 세는 일을 사람 기억에서 떼어 자에 둔다 — 「규칙은 문장이 아니라 검사로 둔다」.
 *
 * 쓰는 법
 * ```
 * node scripts/count-newsdesk.mjs            어제와 오늘을 견준다
 * node scripts/count-newsdesk.mjs --날=3     최근 사흘
 * node scripts/count-newsdesk.mjs --자가시험
 * ```
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const LF = String.fromCharCode(10);
const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const 방 = 'archive/raw/newsdesk-korean-press';

/** 이 자가 무엇을 잴 수 있고 무엇을 못 잼는지 밝힌다 */
export function 잰수인가(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

/**
 * 매체 한 곳을 센다.
 * ⛔ 배열이 아닌 것에 .length 를 부르지 않는다. 받은수 가 없으면 쓸만한 목록으로 물러선다.
 * ⛔ 「없다」와 「0」을 가른다 — 잴 것이 아예 없으면 null 이다.
 */
export function 매체센다(값) {
  if (Array.isArray(값)) return { 받은수: 값.length, 쓸만한수: 값.length, 꼴: '배열(옛 꼴)' };
  if (!값 || typeof 값 !== 'object') return { 받은수: null, 쓸만한수: null, 꼴: '못 쟀다' };
  const 쓸목록 = Array.isArray(값.쓸만한) ? 값.쓸만한.length : null;
  const 받 = 잰수인가(값.받은수) ? 값.받은수 : null;
  const 쓸 = 잰수인가(값.쓸만한수) ? 값.쓸만한수 : 쓸목록;
  return { 받은수: 받, 쓸만한수: 쓸, 꼴: '뭉치' };
}

/** 하루치 파일 하나를 센다. 파일이 없으면 null —  */
export function 하루센다(날, 저장소 = 뿌리) {
  const 길 = path.join(저장소, 방, `${날}.json`);
  if (!fs.existsSync(길)) return null;
  let j;
  try { j = JSON.parse(fs.readFileSync(길, 'utf8')); } catch { return { 날, 깨짐: true }; }
  const 매체별 = j?.매체별;
  if (!매체별 || typeof 매체별 !== 'object') return { 날, 매체수: 0, 받은수: null, 쓸만한수: null, 매체: [] };
  const 매체 = Object.entries(매체별).map(([이름, v]) => ({ 이름, ...매체센다(v) }));
  const 더하기 = (칸) => {
    const 값들 = 매체.map((m) => m[칸]).filter(잰수인가);
    return 값들.length ? 값들.reduce((a, b) => a + b, 0) : null;
  };
  return {
    날,
    잰때: j?.잰때 ?? null,
    매체수: 매체.length,
    받은수: 더하기('받은수'),
    쓸만한수: 더하기('쓸만한수'),
    빈매체: 매체.filter((m) => m.받은수 === 0 || m.받은수 === null).map((m) => m.이름),
    매체,
  };
}

/** 저장소에 있는 날들을 새것부터 낸다 */
export function 날들(저장소 = 뿌리) {
  const d = path.join(저장소, 방);
  if (!fs.existsSync(d)) return [];
  return fs.readdirSync(d)
    .filter((x) => /^[0-9]{8}\.json$/.test(x))
    .map((x) => x.slice(0, 8))
    .sort()
    .reverse();
}

const 내가 = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (내가 && process.argv.includes('--자가시험')) {
  let 통 = 0; const 실 = [];
  const 검 = (n, ok) => { if (ok) 통 += 1; else 실.push(n); };

  검('🔴 뭉치 꼴을 센다 — 배열로 알고 세면 0 이 나오던 자리',
    매체센다({ 받은수: 165, 쓸만한수: 50, 쓸만한: [1, 2] }).받은수 === 165);
  검('쓸만한수 가 없으면 목록 길이로 물러선다',
    매체센다({ 받은수: 9, 쓸만한: [1, 2, 3] }).쓸만한수 === 3);
  검('옛 배열 꼴도 센다', 매체센다([1, 2, 3]).받은수 === 3);
  검('옛 배열 꼴이라고 밝힌다', 매체센다([1]).꼴 === '배열(옛 꼴)');
  검('⛔ 값이 없으면 null — 0 이 아니다', 매체센다(null).받은수 === null);
  검('⛔ 글자가 와도 안 터진다', 매체센다('가').받은수 === null);
  검('⛔ 받은수 가 글자면 안 센다', 매체센다({ 받은수: '많음' }).받은수 === null);
  검('0 은 0 으로 센다 — null 로 뭉개지 않는다', 매체센다({ 받은수: 0, 쓸만한수: 0 }).받은수 === 0);
  검('잰수인가 — 수만 참', 잰수인가(3) === true && 잰수인가(null) === false);
  검('⛔ NaN 은 잰 수가 아니다', 잰수인가(Number('가')) === false);

  {
    /* 임시 저장소로 하루센다 를 잰다 */
    const 임시 = fs.mkdtempSync(path.join(process.env.TEMP ?? '.', 'newsdesk-'));
    fs.mkdirSync(path.join(임시, 방), { recursive: true });
    fs.writeFileSync(path.join(임시, 방, '20260909.json'), JSON.stringify({
      잰때: '2026-09-09T01:20:00+09:00',
      매체별: {
        매일경제: { 받은수: 165, 쓸만한수: 50, 쓸만한: [] },
        텐아시아: { 받은수: 20, 쓸만한수: 3, 쓸만한: [] },
        막힌곳: { 받은수: 0, 쓸만한수: 0, 쓸만한: [] },
      },
    }), 'utf8');
    const r = 하루센다('20260909', 임시);
    검('하루를 더해서 센다', r.받은수 === 185);
    검('쓸만한수도 더한다', r.쓸만한수 === 53);
    검('매체 수를 센다', r.매체수 === 3);
    검('🔴 막힌 매체를 이름으로 집어 낸다', r.빈매체.length === 1 && r.빈매체[0] === '막힌곳');
    검('⛔ 파일이 없으면 null — 0 건이 아니다', 하루센다('19990101', 임시) === null);
    검('날들을 새것부터 낸다', 날들(임시)[0] === '20260909');
    fs.rmSync(임시, { recursive: true, force: true });
  }

  if (실.length) {
    console.error(`❌ 자가시험 실패 ${실.length}${LF}${실.map((s) => `   · ${s}`).join(LF)}`);
    process.exit(1);
  }
  console.log(`✅ 신문 제목 셈 자가시험 통과 (${통})`);
  process.exit(0);
}

if (내가) {
  const 몇 = Number((process.argv.find((x) => x.startsWith('--날=')) ?? '--날=2').slice(4)) || 2;
  const 볼날 = 날들().slice(0, 몇);
  if (!볼날.length) {
    console.log('⬜ 아카이브에 파일이 없다 — 못 쟀다. 0건이라고 적지 않는다');
    process.exit(1);
  }
  console.log(`■ 신문 제목 아카이브 — 최근 ${볼날.length}일`);
  console.log('');
  const 잰것 = [];
  for (const 날 of 볼날) {
    const r = 하루센다(날);
    잰것.push(r);
    const 매체글 = r.매체.map((m) => `${m.이름} ${m.받은수 ?? '⬜'}/${m.쓸만한수 ?? '⬜'}`).join(' · ');
    console.log(`  ${날}  받은 ${r.받은수 ?? '⬜ 못 쟀다'} · 쓸만한 ${r.쓸만한수 ?? '⬜ 못 쟀다'}`);
    console.log(`            ${매체글}`);
    if (r.빈매체.length) console.log(`            🔴 막힌 매체 ${r.빈매체.length}곳 — ${r.빈매체.join(' · ')}`);
  }
  console.log('');
  console.log('⭐ 매체별 값은 «배열이 아니다» — { 갈래, 몫, 받은수, 쓸만한수, 못받은, 쓸만한:[…] } 뭉치다.');
  console.log('   배열로 알고 .length 를 부르면 네 매체가 다 0건으로 나온다. 이 자를 쓰면 그 일이 없다.');
  const 막힌 = 잰것[0]?.빈매체?.length ?? 0;
  process.exit(막힌 ? 1 : 0);
}
