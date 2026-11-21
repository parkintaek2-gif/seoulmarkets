#!/usr/bin/env node
/**
 * collect-oecd-cli.mjs — **OECD 경기선행지수(CLI) 국가비교** (KOR·JPN·IND·CHN, 열쇠 없음)
 * ─────────────────────────────────────────────────────────────────────────
 * 5번 → 6번 (2026-09-16 11:5x 메모): 사장님 지시로 국제기구 데이터를 훑다가
 * `docs/6번-근거대장.md` 16줄의 「OECD CLI 국가비교 — 미착수(OECD SDMX 서버 오늘 빈응답)」가
 * 서버 탓이 아니라 **우리 쪽 헤더 문제**였음을 확인했다 —
 *
 *   ① 옛 주소 stats.oecd.org 는 301 로 죽었다(2024년에 새 주소로 갈아탔다)
 *   ② 새 주소(sdmx.oecd.org)는 국가/헤더가 맞아야 200 을 준다. csvfilewithlabels 로 받으면 된다
 *
 * 실측(2026-09-17) — KOR·JPN·IND·CHN 은 값이 온다(140개월씩, 2015-01~2026-08).
 * **ARE·SAU(걸프)는 OECD 회원이 아니라 이 계열로 못 덮는다** — 걸프는 IMF·World Bank 로 메운다.
 * ⛔ 그러니 이 자는 «국가비교» 근거를 KOR·JPN·IND·CHN 넷으로만 세운다. 걸프를 억지로 섞지 않는다.
 *
 * ⭐ 이 자료는 **소급이 된다** — OECD 가 전체 이력을 그대로 들고 있다(오늘 못 받아도
 *   내일 다시 받으면 같은 값이 온다). JGB 금리곡선(이번 달치만 두는 자료)과 다르다.
 *   그래서 「하루도 빠뜨리면 안 되는」 아카이빙 감시에는 올리지 않는다 — 매달 한 번이면 된다.
 *
 *   node scripts/collect-oecd-cli.mjs           받아서 쌓는다
 *   node scripts/collect-oecd-cli.mjs --시험    자가시험만
 */
import { mkdirSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const 나라들 = ['KOR', 'JPN', 'IND', 'CHN'];
export const 주소 = 'https://sdmx.oecd.org/public/rest/data/OECD.SDD.STES,DSD_STES@DF_CLI,4.1/'
  + 나라들.join('+') + '.M.LI...AA...H?format=csvfilewithlabels&startPeriod=2015-01';
export const 쌓는곳 = path.join(뿌리, 'archive', 'raw', 'oecd-cli');

/**
 * SDMX csvfilewithlabels 응답을 나라별 시계열로 바꾼다.
 * ⚠ 「코드,이름」이 칸마다 짝으로 나온다(REF_AREA,Reference area 처럼) — TIME_PERIOD·
 *   OBS_VALUE 는 짝의 «이름 쪽»이 빈칸이다. 이름으로 칸을 찾지, 자리 번호를 믿지 않는다
 *   (OECD 가 칸 순서를 바꾼 적이 있다고 5번 메모에 있다 — 자리 고정은 위험하다).
 */
export function 읽는다(글) {
  const 줄 = String(글 ?? '').split(/\r?\n/).filter((s) => s.trim());
  if (!줄.length) return { 나라: {}, 못읽음: '빈 응답이다' };
  const 머리 = 줄[0].split(',');
  const 자리 = (이름) => 머리.indexOf(이름);
  const iArea = 자리('REF_AREA');
  const iTime = 자리('TIME_PERIOD');
  const iVal = 자리('OBS_VALUE');
  if (iArea < 0 || iTime < 0 || iVal < 0) {
    return { 나라: {}, 못읽음: '머리 칸(REF_AREA·TIME_PERIOD·OBS_VALUE) 을 못 찾았다' };
  }
  const 나라 = {};
  for (const s of 줄.slice(1)) {
    const 쪽 = s.split(',');
    const 코드 = 쪽[iArea];
    const 때 = 쪽[iTime];
    const 값 = 쪽[iVal];
    if (!코드 || !때 || 값 === undefined || 값 === '') continue;
    const n = Number(값);
    if (!Number.isFinite(n)) continue;
    (나라[코드] ??= []).push({ time: 때, value: n });
  }
  for (const k of Object.keys(나라)) 나라[k].sort((a, b) => (a.time < b.time ? -1 : 1));
  return { 나라 };
}

/* ───────────────────────── 자가시험 ───────────────────────── */
function 자가시험() {
  const 것 = []; const 본다 = (이름, 참) => 것.push({ 이름, 참: !!참 });

  const 보기 = [
    'STRUCTURE,STRUCTURE_ID,REF_AREA,Reference area,TIME_PERIOD,Time period,OBS_VALUE,Observation value',
    'DATAFLOW,x,KOR,Korea,2026-07,,101.234,',
    'DATAFLOW,x,KOR,Korea,2026-08,,101.9,',
    'DATAFLOW,x,JPN,Japan,2026-08,,99.5,',
  ].join('\n');
  const r = 읽는다(보기);
  본다('머리 줄에서 칸을 이름으로 찾는다(자리 고정 안 함)', r.못읽음 === undefined);
  본다('나라별로 나눈다', Object.keys(r.나라).sort().join() === 'JPN,KOR');
  본다('KOR 이 두 달치다', r.나라.KOR.length === 2);
  본다('값을 수로 읽는다', r.나라.KOR[1].value === 101.9);
  본다('시간순으로 정렬한다', r.나라.KOR[0].time === '2026-07');

  본다('빈 글은 못읽음', 읽는다('').못읽음 !== undefined);
  본다('머리 칸이 없으면 못읽음', 읽는다('a,b,c\n1,2,3').못읽음 !== undefined);

  const 값빈줄 = [
    'REF_AREA,Reference area,TIME_PERIOD,Time period,OBS_VALUE,Observation value',
    'KOR,Korea,2026-08,,,',
  ].join('\n');
  본다('값이 빈 줄은 버린다 — ', Object.keys(읽는다(값빈줄).나라).length === 0);

  const 진 = 것.filter((x) => !x.참);
  console.log('■ 자가시험 ' + (것.length - 진.length) + '/' + 것.length);
  for (const x of 진) console.log('   🔴 ' + x.이름);
  return 진.length === 0;
}

/* ───────────────────────── 실행 ───────────────────────── */
async function 받는다() {
  const r = await fetch(주소, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(60000),
  });
  if (!r.ok) throw new Error('OECD SDMX 가 ' + r.status + ' 를 냈다');
  return await r.text();
}

const 직접 = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (직접) {
  if (process.argv.includes('--시험')) process.exit(자가시험() ? 0 : 1);
  if (!자가시험()) process.exit(1);
  console.log('');
  try {
    const 글 = await 받는다();
    const r = 읽는다(글);
    if (r.못읽음) { console.log('🔴 못 읽었다 — ' + r.못읽음); process.exit(1); }
    mkdirSync(쌓는곳, { recursive: true });
    const 오늘 = new Date();
    const 이름 = 오늘.getFullYear() + '-' + String(오늘.getMonth() + 1).padStart(2, '0')
      + '-' + String(오늘.getDate()).padStart(2, '0') + '.json';
    writeFileSync(path.join(쌓는곳, 이름), JSON.stringify({
      _메모: {
        상품: 'OECD 경기선행지수(CLI, amplitude-adjusted) — 국가비교',
        출처: 'OECD.Stat SDMX — ' + 주소,
        받은때: 오늘.toLocaleString('ko-KR'),
        나라: 나라들,
        소급: '된다 — OECD 가 전체 이력을 그대로 준다. 오늘 못 받아도 내일 같은 값이 온다',
        빠진나라: ['ARE', 'SAU'] ,
        빠진까닭: '걸프(UAE·사우디)는 OECD 회원이 아니라 이 계열로 안 나온다. IMF·World Bank 로 메운다',
        아닌것: ['투자 자문이 아니다', '예측이 아니다 — 값 그대로만 쓴다'],
      },
      나라: r.나라,
    }, null, 1), 'utf8');

    console.log('■ OECD CLI 국가비교 — ' + 오늘.toLocaleString('ko-KR'));
    for (const c of 나라들) {
      const v = r.나라[c] || [];
      const 끝 = v[v.length - 1];
      console.log('   ' + c + '  ' + v.length + '개월 · 마지막 ' + (끝 ? 끝.time + ' = ' + 끝.value : '없음'));
    }
    console.log('   ⛔ ARE·SAU 는 OECD 로 못 덮는다 — 걸프는 IMF·World Bank 로 메운다');
    console.log('   ✔ ' + path.relative(뿌리, path.join(쌓는곳, 이름)));
    console.log('   쌓인 날 ' + (existsSync(쌓는곳) ? readdirSync(쌓는곳).length : 0) + '개');
  } catch (e) {
    console.log('🔴 못 받았다 — ' + String(e.message).slice(0, 120));
    console.log('   ⛔ 「없다」가 아니라 「못 받았다」로 적는다.');
    process.exit(1);
  }
}
