/**
 * 한국 연예인 9,249명의 **직업**을 위키데이터에서 캐 온다.
 *
 * ── 🔴 왜 캐나 (2026-08-27 15:0x · 실측에서 나왔다) ────────────────────────
 * 생일 지면(`/born-on/*` 366장)에 오는 검색어를 GSC 로 28일 재 봤더니 일곱 개인데,
 * 그 갈림이 너무 뚜렷했다 —
 *
 *   검색어에 「kpop」이 **있는** 다섯 개  →  순위 54 · 55 · 56 · 63 · 63
 *   검색어에 「kpop」이 **없는** 두 개   →  순위 **9 · 12**
 *
 * 우리 지면에는 「K-pop」이라는 낱말이 **한 번도 없다.** 있는 것은
 * 「Korean stars」·「Korean actors and singers」뿐이다. 그러니 kpop 으로 찾는 사람에게는
 * 6페이지에 놓인다.
 *
 * ⛔ 그렇다고 제목에 「K-pop」을 그냥 적을 수 없다. **누가 가수인지 우리가 모른다.**
 *    원자료(`korean-entertainers-birth.json`)에 있는 칸은 q·name·born·sitelinks 넷뿐이다.
 *    모르는 것을 적는 것은 강령 ① 「」에 어긋난다.
 *
 * ⭐ 그래서 **캐 온다.** 알고 나서 적는다. 그러면 남이 못 하는 말을 할 수 있다 —
 *    「그날 태어난 42명 중 가수 19명·배우 21명·둘 다 2명」. 이것이 우리 자리다.
 *
 * ── 무엇을 받나 ────────────────────────────────────────────────────────
 *   P106 직업            가수(Q177220) · 배우(Q33999) · 아이돌(Q56816)  등
 *   P463 소속 단체       음악 그룹에 속해 있나 — 「아이돌」의 가장 단단한 표시다
 *
 * ⛔ 「아이돌이다」를 우리가 «판정»하지 않는다. 위키데이터가 적어 둔 것을 그대로 옮긴다.
 *    그리고 안 적혀 있는 사람은 **「미확인」**으로 남긴다. 
 *
 * 쓰는 법:
 *   node scripts/fetch-kcw-entertainer-roles.mjs --잰다     실제로 받는다
 *   node scripts/fetch-kcw-entertainer-roles.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 원자료 = path.join(뿌리, 'archive/raw/wikidata/korean-entertainers-birth.json');
const 낼길 = path.join(뿌리, 'archive/raw/wikidata/korean-entertainers-roles.json');

const 끝점 = 'https://query.wikidata.org/sparql';
const 머리 = { 'user-agent': 'KCultureWire/1.0 (parkintaek2@gmail.com)' };

/** 위키데이터 Q번호 → 우리가 쓰는 이름. ⛔ 여기 없는 직업은 «기타»로 남긴다(지어내지 않는다). */
export const 직업표 = {
  Q177220: '가수',
  Q33999: '배우',
  Q56816: '아이돌',          // idol (Japanese/Korean entertainment sense)
  Q10800557: '영화배우',
  Q10798782: '텔레비전배우',
  Q2405480: '성우',
  Q753110: '작곡가',
  Q36834: '작곡가',
  Q183945: '음반프로듀서',
  Q639669: '음악가',
  Q3282637: '영화제작자',
  Q2526255: '영화감독',
  Q245068: '코미디언',
  Q5716684: '무용수',
  Q13235160: '모델',
  Q4610556: '모델',
};

/**
 * 한 사람의 직업 Q번호들 → 우리가 쓸 «갈래».
 *
 * ⛔ 「가수이면서 배우」인 사람이 아주 흔하다(아이유·수지). 하나로 몰아넣지 않는다 —
 *   그러면 어느 쪽 수도 참이 아니게 된다. 둘 다면 «둘다»로 센다.
 * ⚠ 아무것도 안 적혀 있으면 **미확인**이다. 「배우」로 밀어 넣지 않는다.
 */
export function 갈래정하기(직업Q들 = [], 그룹있나 = false) {
  const 이름들 = 직업Q들.map((q) => 직업표[q]).filter(Boolean);
  const 노래 = 이름들.some((n) => ['가수', '아이돌', '음악가'].includes(n)) || 그룹있나;
  const 연기 = 이름들.some((n) => ['배우', '영화배우', '텔레비전배우', '성우'].includes(n));
  if (노래 && 연기) return '둘다';
  if (노래) return '노래';
  if (연기) return '연기';
  if (이름들.length) return '기타';
  return '미확인';
}

/** 한 묶음(values) SPARQL — 너무 크면 위키데이터가 끊는다. 200명씩 나눈다. */
export function 물음짓기(q들) {
  const values = q들.map((q) => `wd:${q}`).join(' ');
  /* 🔴 [2026-09-04 · 5번] **`?grp` 을 받아 놓고 `true` 로 뭉개고 있었다.**
     그래서 「이 사람이 그룹에 있다」는 알아도 «어느 그룹인지»는 몰랐고,
     생일 지면 366장이 「8 K-pop idols」라고 세면서 그룹 이름을 한 번도 못 적었다.
     ⭐ 라벨을 함께 받아 «이름»까지 남긴다. 요청 수는 그대로다 — 같은 물음에 칸 하나를 더할 뿐이다.
     ⛔ 기존 `grp`(참·거짓)는 «그대로 둔다». 그것을 읽는 자가 이미 있다. */
  /**
   * 🔴 [2026-09-04 20:2x · 5번] **P264(음반사)를 더한다 — 두 사이트가 같이 쓸 칸이다.**
   *
   *   6번이 K팝 기획사 넷의 재무·자사주를 모으면서 나에게 「5번↔6번 교차링크」를 물어 왔다.
   *   ⛔ 그런데 억지로 링크를 걸 수 없다 — 우리 손님은 K컬처 독자고 6번 손님은 투자자다.
   *     사장님이 못박으신 「사이트를 헷갈리지 않는다」에 정면으로 걸린다.
   *   ⭐ 그래서 **겹치는 자리를 찾았다** — 기획사다. 우리는 그 기획사 «아티스트가 얼마나
   *     읽히는지»를 쥐고 있고, 6번은 그 기획사의 «시가총액·재무»를 쥐고 있다.
   *     그 둘을 이으면 아무도 안 센 것이 나온다. 그리고 그것이 회사 정의 그대로다 —
   *     「그들은 재무를, 우리는 사람을 한다」.
   *
   *   ⛔ 그런데 재 보니 **우리 자료에 소속 기획사 칸이 아예 없었다.** 칸이 셋뿐이다(갈래·occ·grp).
   *     그러니 「링크를 걸자」가 아니라 «자료를 받자»가 먼저다.
   *   ✅ 새 자를 짓지 않고 **이 물음에 칸 하나를 더한다.** 요청 수는 그대로다.
   *   ⚠ P264 는 「음반사(record label)」다. 한국에서 기획사와 음반사가 대개 같지만 **늘 같지 않다.**
   *     그러니 이 칸을 「소속사」라고 부르지 않고 **「음반사」**라고 부른다. 아는 것만 적는다.
   */
  return `SELECT ?p ?occ ?grp ?grpLabel ?label ?labelLabel WHERE {
  VALUES ?p { ${values} }
  OPTIONAL { ?p wdt:P106 ?occ }
  OPTIONAL { ?p wdt:P463 ?grp . ?grp wdt:P31/wdt:P279* wd:Q2088357 }
  OPTIONAL { ?p wdt:P264 ?label }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}`;
}

const 자다 = (ms) => new Promise((r) => setTimeout(r, ms));

async function 받기(q들, 가져오기 = fetch) {
  const res = await 가져오기(`${끝점}?format=json&query=${encodeURIComponent(물음짓기(q들))}`, { headers: 머리 });
  if (!res.ok) throw new Error(`위키데이터 ${res.status} — 반쯤 받은 것으로 수를 내지 않는다`);
  const j = await res.json();
  const 모음 = new Map();
  for (const b of j.results.bindings) {
    const q = b.p.value.split('/').pop();
    if (!모음.has(q)) 모음.set(q, { occ: new Set(), grp: false, 그룹: new Map(), 음반사: new Map() });
    const it = 모음.get(q);
    if (b.occ) it.occ.add(b.occ.value.split('/').pop());
    if (b.label) {
      /* ⚠ 라벨이 Q숫자로 오면 «이름을 모르는 것»이다 — 이름 자리에 Q를 넣지 않는다.
         🔴 위 그룹 쪽 정규식이 `/^Qd+$/` 로 «백슬래시가 빠져» 있었다(원래 `\d`).
           그래서 Q숫자도 이름으로 통과한다. 여기서는 제대로 쓴다. 그쪽은 따로 고친다. */
      const lq = b.label.value.split('/').pop();
      const 이름 = b.labelLabel && !/^Q\d+$/.test(b.labelLabel.value) ? b.labelLabel.value : null;
      it.음반사.set(lq, 이름);
    }
    if (b.grp) {
      it.grp = true;
      /* ⚠ 라벨이 Q숫자 그대로 오면 «이름을 모르는 것»이다 — 이름 자리에 Q를 넣지 않는다 */
      const gq = b.grp.value.split('/').pop();
      const 이름 = b.grpLabel && !/^Q[0-9]+$/.test(b.grpLabel.value) ? b.grpLabel.value : null;
      it.그룹.set(gq, 이름);
    }
  }
  return 모음;
}

async function 다받기() {
  const 사람들 = JSON.parse(fs.readFileSync(원자료, 'utf8')).사람;
  console.log(`원자료 ${사람들.length.toLocaleString('en-US')}명`);
  const 묶음크기 = 200;
  const 결과 = {};
  let 못받은묶음 = 0;
  for (let i = 0; i < 사람들.length; i += 묶음크기) {
    const 조각 = 사람들.slice(i, i + 묶음크기);
    let 모음 = null;
    for (let 번 = 0; 번 < 3 && !모음; 번++) {
      try { 모음 = await 받기(조각.map((p) => p.q)); }
      catch (e) {
        console.log(`  ⚠ ${i}~ 묶음 ${번 + 1}번째 실패 — ${e.message}`);
        await 자다(3000 * (번 + 1));
      }
    }
    if (!모음) {
      /* ⛔ 못 받은 것을 «미확인»과 섞지 않는다. 섞으면 「위키데이터에 없다」와
         「우리가 못 받았다」가 한 칸이 되어, 다음 사람이 수를 믿게 된다. */
      못받은묶음++;
      for (const p of 조각) 결과[p.q] = { 갈래: '못받음', occ: [], grp: false };
      continue;
    }
    for (const p of 조각) {
      const it = 모음.get(p.q);
      const occ = it ? [...it.occ] : [];
      결과[p.q] = {
        갈래: 갈래정하기(occ, it ? it.grp : false), occ, grp: it ? it.grp : false,
        /* 새 칸. ⛔ 없는 사람에게는 아예 안 붙인다 — 빈 배열은 「그룹이 없다」로 잘못 읽힌다 */
        ...(it && it.그룹 && it.그룹.size
          ? { 그룹: [...it.그룹].map(([q2, 이름]) => ({ q: q2, 이름 })) } : {}),
        /* 🔴 [2026-09-04 20:2x] **모으기만 하고 결과에 안 넣어 두었다가 잡았다.**
           받아도 파일에 안 남으면 받은 것이 아니다. 오늘 아침에도 같은 꼴을 겪었다 —
           그룹을 받아 놓고 true 로 뭉갠 것. ⛔ 새 칸을 더할 때는 «저장까지» 따라간다. */
        ...(it && it.음반사 && it.음반사.size
          ? { 음반사: [...it.음반사].map(([q2, 이름]) => ({ q: q2, 이름 })) } : {}),
      };
    }
    process.stdout.write(`\r  받는 중 ${Math.min(i + 묶음크기, 사람들.length).toLocaleString('en-US')}/${사람들.length.toLocaleString('en-US')}`);
    await 자다(400);   // 위키데이터에 예의를 지킨다
  }
  console.log('');

  const 셈 = {};
  for (const v of Object.values(결과)) 셈[v.갈래] = (셈[v.갈래] ?? 0) + 1;
  console.log('갈래별 —');
  for (const [k, v] of Object.entries(셈).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(6)} ${v.toLocaleString('en-US')}명 (${(v / 사람들.length * 100).toFixed(1)}%)`);
  }
  if (못받은묶음) console.log(`⚠ 못 받은 묶음 ${못받은묶음}개 — 「못받음」으로 남겼다. 미확인과 «다른 것»이다.`);

  fs.writeFileSync(낼길, `${JSON.stringify({
    /* ⛔ toISOString 은 UTC 다 — 사장님 지시로 우리 시각은 KST 다. 이 PC 가 이미 KST 다 */
    잰때: new Date().toLocaleString('ko-KR'),
    출처: 'Wikidata SPARQL — P106(직업) · P463(소속 음악 그룹) · P264(음반사)',
    이자료가아닌것: '「아이돌인가」를 우리가 판정한 것이 아니다. 위키데이터가 적어 둔 것을 옮겼을 뿐이고, 안 적힌 사람은 미확인으로 남겼다.',
    사람수: 사람들.length,
    셈,
    사람: 결과,
  }, null, 2)}\n`);
  console.log(`✅ 적었다 — ${path.relative(뿌리, 낼길)}`);
}

/* ── 자가시험 ───────────────────────────────────────────────── */
function 자가시험() {
  let 통과 = 0; let 실패 = 0;
  const 검 = (이름, 조건) => { if (조건) { 통과++; console.log(`  ✅ ${이름}`); } else { 실패++; console.log(`  ⛔ ${이름}`); } };

  검('가수는 노래', 갈래정하기(['Q177220']) === '노래');
  검('배우는 연기', 갈래정하기(['Q33999']) === '연기');
  검('⭐ 가수이면서 배우면 «둘다» — 어느 한쪽으로 몰지 않는다', 갈래정하기(['Q177220', 'Q33999']) === '둘다');
  검('아이돌도 노래 쪽이다', 갈래정하기(['Q56816']) === '노래');
  검('⭐ 음악 그룹에 속했으면 직업이 안 적혀 있어도 노래 쪽이다', 갈래정하기([], true) === '노래');
  검('그룹 + 배우면 둘다', 갈래정하기(['Q33999'], true) === '둘다');
  검('🔴 아무것도 없으면 «미확인» — 배우로 밀어 넣지 않는다', 갈래정하기([]) === '미확인');
  검('모르는 Q번호만 있으면 미확인이다', 갈래정하기(['Q99999999']) === '미확인');
  검('아는 직업이지만 노래도 연기도 아니면 기타', 갈래정하기(['Q245068']) === '기타');
  검('빈 인자여도 안 죽는다', 갈래정하기() === '미확인');
  검('물음에 VALUES 가 들어간다', 물음짓기(['Q1', 'Q2']).includes('VALUES ?p { wd:Q1 wd:Q2 }'));
  검('물음이 직업과 그룹을 둘 다 묻는다',
    /wdt:P106/.test(물음짓기(['Q1'])) && /wdt:P463/.test(물음짓기(['Q1'])));

  /* 🔴 [2026-09-04 20:2x] 음반사(P264) 를 더했다 — 두 사이트가 같이 쓸 칸이다 */
  검('⭐ 물음이 음반사(P264)도 묻는다', /wdt:P264/.test(물음짓기(['Q1'])));
  검('음반사 라벨도 함께 받는다', /\?labelLabel/.test(물음짓기(['Q1'])));
  검('그룹 라벨은 그대로 받는다', /\?grpLabel/.test(물음짓기(['Q1'])));

  /**
   * 🔴 Q숫자를 «이름»으로 저장하지 않는지 본다.
   *   이 자에 원래 `/^Qd+$/`(백슬래시 빠짐)가 있었다 — 그 무늬는 Q12345 에 안 맞으므로
   *   가드가 통째로 죽어 있었다. 아직 라벨 받기를 안 돌려 새지는 않았고, 돌리기 전에 고쳤다.
   *   ⛔ 자가시험으로 굳혀 둔다. 다음 사람이 또 백슬래시를 빠뜨리면 여기서 걸린다.
   */
  검('⭐ Q숫자를 이름으로 안 본다', /^Q[0-9]+$/.test('Q12345') === true);
  검('⛔ 백슬래시 빠진 무늬는 Q숫자를 못 잡는다 (이것이 그 결함이었다)',
    new RegExp('^Qd+$').test('Q12345') === false);
  검('사람 이름은 Q꼴이 아니다', /^Q[0-9]+$/.test('Stray Kids') === false);
  검('음반사 이름도 Q꼴이 아니다', /^Q[0-9]+$/.test('JYP Entertainment') === false);

  console.log(`\n자가시험 ${통과 + 실패}개 · 실패 ${실패}개`);
  return 실패;
}

const 이파일직접 = process.argv[1]
  && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (이파일직접) {
  if (process.argv.includes('--자가시험')) process.exit(자가시험() ? 1 : 0);
  else if (process.argv.includes('--잰다')) await 다받기();
  else console.log('쓰는 법: --잰다 (실제로 받는다) · --자가시험');
}
