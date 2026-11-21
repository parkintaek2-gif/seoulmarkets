#!/usr/bin/env node
/**
 * check-daily-shipping.mjs — **오늘 각 유닛이 «밖으로» 무엇을 냈나.** (5번 총괄, 2026-08-28)
 *
 * ── 🔴 왜 이 자가 생겼나 ────────────────────────────────────────
 * 2026-08-28 밤, 유튜브가 처음 열렸다. 나는 내 몫 3편을 올리고 메모에
 * 「하루 유닛별 3편입니다」라고 «알렸다». 그런데 다른 유닛이 실제로 올렸는지는 안 봤다.
 * 사장님이 물으셨다 —
 *   「유튜브는 너만 올렸어?」 「다른 유닛은?」
 *   「**콘텐트 발행, 방문자수 등을 총괄이 확인, 지시해야지**」
 * 아무도 안 올렸다. 사장님이 물으시고 나서야 알았다.
 *
 * ⛔ **알리는 것은 게시판이지 총괄이 아니다.** 총괄은 «확인하고 지시»한다.
 * ⛔ 그리고 매일 손으로 세면 빠뜨린다. 그래서 자로 만든다.
 *
 * ── ⛔ 이 자가 지키는 것 ────────────────────────────────────
 * ⛔ 「만들었다」를 세지 않는다. **밖으로 나갔나**를 센다 — 둘은 다른 말이다.
 *   (영상 58편이 «만들어진 채» 두 주를 기다린 적이 있다)
 * ⛔ 유닛이 메모에 「냈습니다」라고 적은 것을 세지 않는다. **저장소를 직접 센다.**
 *   말을 세면 총괄이 재는 뜻이 없다.
 * ⚠ 유튜브는 저장소에 안 남는다 — 그 칸은 «못 잼»으로 두고 사람이 채운다.
 *   ⛔ 못 재는 것을 0 으로 적지 않는다.
 *
 * 쓰는 법
 *   node scripts/check-daily-shipping.mjs --자가시험
 *   node scripts/check-daily-shipping.mjs --잰다 [--날=2026-08-28]
 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 내가실행됐다 = process.argv[1]
  && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

/**
 * 유닛마다 «밖으로 나가는 것»이 어느 자리에 남는가.
 * ⚠ 4번(KLifeMap)은 저장소가 다르다 — 여기서는 못 센다. 그것을 «못 잼»으로 밝힌다.
 */
export const 자리표 = [
  { 유닛: '3번', 이름: '백년지도', 기사: ['content/articles/'], 지면: ['src/pages/100y/', 'public/100y/'], 카드: ['public/100y/cardnews/'], 영상: ['public/100y/video/'] },
  { 유닛: '5번', 이름: 'K Culture Wire', 기사: ['content/kculturewire/'], 지면: ['src/pages/wikitip/', 'public/wikitip/'], 카드: ['public/wikitip/cardnews/'], 영상: ['public/wikitip/video/'] },
  { 유닛: '6번', 이름: 'SeoulMarkets', 기사: ['content/articles/'], 지면: ['src/pages/', 'public/charts/'], 카드: ['public/cardnews/'], 영상: ['public/video/'] },
];

/** 4번은 저장소가 달라 이 자로 못 센다. ⛔ 「0」이 아니라 「못 잼」이다 */
export const 여기서못세는유닛 = [{ 유닛: '1·4번', 이름: 'KLifeMap', 까닭: '저장소가 다르다(klifemap)' }];

/** 「YYYY-MM-DD」인가 */
export function 날짜꼴인가(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

/**
 * 🔴🔴 [2026-08-29] **`toISOString()` 을 쓰고 있었다 — 그건 UTC 다.**
 *
 * 우리는 한국에서 일하고 사장님도 한국 시각으로 보신다. 그런데 `toISOString()` 은 UTC 라,
 * **한국 자정부터 아침 아홉 시까지는 «어제» 날짜를 준다**(KST = UTC+9).
 * ⭐ 그리고 이 자는 **09:00 방송**에 쓰인다 — KST 09:00 이 정확히 UTC 00:00 이다.
 *    즉 하필 «경계에 걸리는 시각»에 쓰이고 있었다.
 *
 * ⛔ 이 결함은 낮에 돌려 보면 안 보인다. 새벽에 인수인계하면서 우연히 잡았다.
 */
export function 오늘한국(때 = new Date()) {
  const 한국 = new Date(때.getTime() + 9 * 60 * 60 * 1000);
  return 한국.toISOString().slice(0, 10);
}

/**
 * 새로 «난» 파일만 센다.
 * ⛔ 고친 것을 «낸 것»으로 세지 않는다 — 오타 하나 고친 것이 발행으로 잡히면 수가 거짓이 된다.
 */
export function 새로난것(줄들, 앞가지들) {
  const 붙는가 = (f) => (앞가지들 ?? []).some((p) => f.startsWith(p));
  return [...new Set((줄들 ?? []).filter(붙는가))];
}

/** 사람이 읽는 한 줄. ⛔ 못 잰 칸을 0 으로 적지 않는다 */
export function 한줄(유닛, 이름, 값들) {
  const 칸 = (v) => (v === null || v === undefined ? '못잼' : String(v));
  return `  ${유닛.padEnd(7)} ${이름.slice(0, 16).padEnd(17)}`
    + ` ${칸(값들.기사).padStart(4)} ${칸(값들.지면).padStart(5)} ${칸(값들.카드).padStart(5)} ${칸(값들.영상).padStart(5)}`;
}

if (내가실행됐다 && process.argv.includes('--자가시험')) {
  let 통 = 0; const 실 = [];
  const 검 = (이름, 참) => { if (참) 통 += 1; else 실.push(이름); };

  검('날짜 꼴을 가린다', 날짜꼴인가('2026-08-28') === true);
  검('아무 글자나 날짜가 아니다', 날짜꼴인가('오늘') === false);
  검('빈 것도 날짜가 아니다', 날짜꼴인가(null) === false);

  검('앞가지가 붙는 것만 센다',
    새로난것(['content/articles/a.md', 'docs/x.md'], ['content/articles/']).length === 1);
  검('같은 파일을 두 번 안 센다',
    새로난것(['a/x.md', 'a/x.md'], ['a/']).length === 1);
  검('앞가지가 여럿이어도 된다',
    새로난것(['a/1', 'b/2', 'c/3'], ['a/', 'b/']).length === 2);
  검('빈 것을 넣어도 안 죽는다', 새로난것(null, ['a/']).length === 0 && 새로난것(['a/1'], null).length === 0);

  /* ⛔ 못 잰 칸이 0 으로 보이면 총괄이 「안 냈다」고 잘못 지시하게 된다 */
  검('못 잰 칸을 0 으로 안 적는다', 한줄('1·4번', 'KLifeMap', { 기사: null }).includes('못잼'));
  검('센 칸은 수로 적는다', 한줄('5번', 'KCW', { 기사: 2, 지면: 0, 카드: 5, 영상: 0 }).includes('2'));
  검('0 은 0 으로 적는다 — 못 잼과 다르다', 한줄('3번', '백년지도', { 기사: 0 }).includes('0'));

  검('자리표에 세 유닛이 있다', 자리표.length === 3);
  검('못 세는 유닛을 «버리지 않고» 적어 둔다', 여기서못세는유닛.length === 1);
  검('못 세는 까닭을 적는다', 여기서못세는유닛[0].까닭.length > 5);

  /**
   * ⛔⛔ [2026-08-29] **여기가 비어 있어서 「조용히 끝나는 결함」을 나흘 놓쳤다.**
   * 시험 열셋이 모두 «속 함수»만 재고, «이 자를 부르면 무엇이 나오나»를 아무도 안 쟀다.
   * 그래서 인자 없이 부르면 한 줄도 안 찍고 끝나는 것을 사람이 손으로 불러 봐야 알았다.
   * 🔴 자를 만들 때는 **부르는 길 자체를 한 번은 재야 한다.**
   */
  const 나 = fileURLToPath(import.meta.url);
  const 불러본다 = (args) => {
    try {
      const 글 = execFileSync(process.execPath, [나, ...args], { encoding: 'utf8', cwd: 뿌리 });
      return { 코드: 0, 글 };
    } catch (e) {
      return { 코드: e.status ?? -1, 글: `${e.stdout ?? ''}${e.stderr ?? ''}` };
    }
  };
  const 맨손 = 불러본다([]);
  검('⛔ 인자 없이 불러도 «조용하지» 않다', 맨손.글.trim().length > 30);
  검('⛔ 인자 없이 부르면 «성공(0)» 이라고 하지 않는다', 맨손.코드 === 2);
  검('맨손으로 부르면 쓰는 법을 알려 준다', /--잰다/.test(맨손.글));
  const 잰것 = 불러본다(['--잰다', '--날=2026-08-28']);
  검('⭐ --잰다 를 주면 표가 나온다', /유닛/.test(잰것.글) && /2026-08-28/.test(잰것.글));
  검('⭐ 유튜브는 못 잰다고 «적는다» — 0 으로 짐작하지 않는다', /유튜브는 이 자로 못 잽니다/.test(잰것.글));

  /**
   * ⛔⛔ [2026-08-29] **UTC 로 「오늘」을 정하고 있었다.** KST 자정~09시에는 어제가 나온다.
   * 하필 09:00 방송(=UTC 00:00)에 쓰이는 자였다. 시각을 넣어 재서 굳힌다.
   */
  검('⭐ 한국 새벽 1시는 «그날»이다 (UTC 로는 어제)',
    오늘한국(new Date('2026-08-29T01:30:00+09:00')) === '2026-08-29');
  검('⭐ 한국 아침 9시(=UTC 0시)도 그날이다',
    오늘한국(new Date('2026-08-29T09:00:00+09:00')) === '2026-08-29');
  검('한국 밤 11시 59분도 그날이다',
    오늘한국(new Date('2026-08-29T23:59:00+09:00')) === '2026-08-29');
  검('⛔ UTC 로 재면 틀린다는 것을 못박는다',
    new Date('2026-08-29T01:30:00+09:00').toISOString().slice(0, 10) === '2026-08-28');

  /** ⛔ 「그날」을 재는가 — `--until` 이 없어서 「그날 이후 전부」를 세고 있었다 */
  const 어제 = 불러본다(['--잰다', '--날=2026-08-27']);
  const 수뽑기 = (글) => (글.match(/K Culture Wire\s+(\d+)\s+(\d+)\s+(\d+)/) ?? []).slice(1).join(',');
  검('⭐ 날마다 «다른» 수가 나온다 — 그날만 센다',
    수뽑기(어제.글) !== '' && 수뽑기(어제.글) !== 수뽑기(잰것.글));

  if (실.length) { console.error(`❌ 자가시험 ${실.length}건 실패\n${실.map((s) => `   · ${s}`).join('\n')}`); process.exit(1); }
  console.log(`✅ 오늘 발행 현황을 재는 자 — 자가시험 ${통}개 통과`);
  process.exit(0);
}

if (내가실행됐다 && process.argv.includes('--잰다')) {
  const 준날 = (process.argv.find((a) => a.startsWith('--날='))?.split('=')[1]) ?? null;
  const 날 = 날짜꼴인가(준날) ? 준날 : 오늘한국();
  const git = (args) => execFileSync('git', args, { cwd: 뿌리, encoding: 'utf8', maxBuffer: 1e8 }).trim();

  /**
   * 🔴🔴 [2026-08-29] **「그날」을 재고 있지 않았다.** `--until` 이 없어서
   * 「그날 00:00 부터 «지금까지»」를 셌다. 어제를 재도 오늘 것이 섞여 들어왔다.
   * ⭐ 오늘을 잴 때는 차이가 안 보인다(뒤가 없으니). 그래서 어제를 재 보기 전까지 몰랐다.
   */
  const 난것 = git(['log', `--since=${날} 00:00`, `--until=${날} 23:59:59`,
    '--diff-filter=A', '--name-only', '--format='])
    .split('\n').map((s) => s.trim()).filter(Boolean);

  console.log(`■ ${날} — 각 유닛이 «밖으로» 낸 것`);
  console.log('  ⛔ 「만들었다」가 아니라 «새로 난 것»만 셌다. 고친 것은 안 센다.\n');
  console.log(`  ${'유닛'.padEnd(7)} ${'사이트'.padEnd(17)} ${'기사'.padStart(4)} ${'지면'.padStart(5)} ${'카드'.padStart(5)} ${'영상'.padStart(5)}`);

  for (const r of 자리표) {
    console.log(한줄(r.유닛, r.이름, {
      기사: 새로난것(난것, r.기사).length,
      지면: 새로난것(난것, r.지면).length,
      카드: 새로난것(난것, r.카드).length,
      영상: 새로난것(난것, r.영상).length,
    }));
  }
  for (const r of 여기서못세는유닛) {
    console.log(한줄(r.유닛, r.이름, {}) + `   ← ${r.까닭}`);
  }

  console.log('\n  ⚠ **유튜브는 이 자로 못 잽니다** — 저장소에 안 남습니다.');
  console.log('    채널에서 직접 세어 총괄이 손으로 적습니다. ⛔ 0 으로 짐작하지 않습니다.');
  console.log('  ⚠ 6번과 3번은 `content/articles/` 를 같이 씁니다 — 그 칸은 둘이 겹쳐 보입니다.');
  console.log('    누구 것인지는 파일 이름으로 갈라야 합니다. 아직 안 갈랐습니다.');
  console.log('\n  ⭐ 빈 곳이 있으면 총괄이 «짚어 말합니다». 알리는 것으로 끝내지 않습니다.');
}

/**
 * 🔴🔴 [2026-08-29 · 5번] **인자 없이 부르면 «조용히» 끝나고 있었다.**
 *
 * 총괄을 2번에게 넘기며 이 자를 인수인계했는데, 그 자리에서 `node scripts/check-daily-shipping.mjs`
 * 를 그냥 불러 보니 **한 줄도 안 찍고 종료코드 0** 으로 끝났다. 자가시험 열셋은 다 통과했다 —
 * 시험이 «부르는 길»을 안 재고 속 함수만 재고 있었기 때문이다.
 *
 * ⛔ 이것이 왜 나쁜가 — 다음 사람이 그냥 불러 보고 **「오늘 발행이 없구나」로 읽는다.**
 *    「못 쟀다」와 「없다」가 같은 화면으로 나오는 것이 우리가 제일 경계하는 것이다.
 *    사장님 강령 — 「**재 보고 안 되면 안 된다고 적는다.** 」.
 *
 * ✅ 그래서 아무 일도 안 할 때는 **쓰는 법을 찍고 종료코드 2** 로 끝낸다. 침묵하지 않는다.
 */
if (내가실행됐다 && !process.argv.includes('--잰다') && !process.argv.includes('--자가시험')) {
  console.log('⛔ 아무것도 안 쟀습니다 — 무엇을 할지 안 알려 주셨습니다.\n');
  console.log('쓰는 법');
  console.log('  node scripts/check-daily-shipping.mjs --잰다              오늘 발행을 잰다');
  console.log('  node scripts/check-daily-shipping.mjs --잰다 --날=2026-08-28   그날을 잰다');
  console.log('  node scripts/check-daily-shipping.mjs --자가시험          자를 검사한다\n');
  console.log('⚠ 이 자가 «조용히» 끝나면 다음 사람이 「발행이 없다」로 읽습니다.');
  console.log('   그래서 아무 일도 안 할 때는 이 글을 찍고 종료코드 2 로 끝냅니다.');
  process.exit(2);
}
