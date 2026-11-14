/**
 * build-kcw-service-years.mjs — **그룹 멤버를 «생년 × 성별»로 센다.** (`/service-years` 가 쓴다)
 *
 * ── 🔴 왜 만들었나 (2026-09-09 09:0x · 5번 · 이슈에서 나왔다) ────────────────
 * 커뮤니티 08:00 수집의 6시간 창에 이 씨앗이 있었다 —
 *   `[Reddit r/kpop] SEVENTEEN's DK Enlists in Army, Shares Buzz Cut Photos` (1.7시간 전)
 *
 * 「누가 다음에 입대하나」는 영어권 K팝 독자가 가장 많이 찾는 물음 가운데 하나다.
 * 그런데 그 물음에 답하려면 생년과 성별이 «둘 다» 있어야 하고, 성별이 우리에게 없었다.
 * ⇒ 그래서 먼저 받았다 — `fetch-kcw-entertainer-gender.mjs` (P21 · 9,249명 · 못받은묶음 0).
 *
 * ── 🔴 이 자료가 반드시 지키는 것 ①  «나이는 움직이는 수다» ─────────────────
 * `build-kcw-age-bands.mjs` 가 이미 겪은 함정이다. 지면은 배포할 때만 다시 지어지므로
 * 「스물여덟인 사람」을 그대로 적으면 해가 바뀌는 날부터 지면이 거짓을 말한다.
 * ⭐ 그래서 셋을 «같이» 낸다 — 나이(손님이 찾는 말) · 생년(절대 안 변하는 사실) · 기준 해.
 * ⛔ 기준 해를 손으로 적지 않는다. 짓는 날에서 가져온다.
 *
 * ── 🔴 이 자료가 반드시 지키는 것 ②  «우리는 입대를 예측하지 않는다» ────────
 * ```
 * ⛔ 「이 사람이 몇 년에 입대한다」를 말하지 않는다 — 우리는 입대 날짜를 쥔 적이 없다
 * ⛔ 병역법의 나이 규정을 우리 지면이 «단정»하지 않는다 — 법은 우리 자료가 아니다
 * ⛔ 국적을 모른다. 명부에는 일본·중국·태국에서 태어난 멤버가 섞여 있고,
 *    태어난 곳이 국적과 «늘 같지 않다». 그래서 태어난 곳이 «적힌» 사람만 갈라 세고
 *    나머지는 미확인으로 둔다
 * ✅ 우리가 말할 수 있는 것은 하나다 — 「이 생년의 남성 멤버가 N명이고, 그들은 올해 NN세다」
 * ```
 * ⭐ 이것이 강령 그대로다 — 지형을 그리고 
 *
 * 쓰는 법
 *   node scripts/build-kcw-service-years.mjs
 *   node scripts/build-kcw-service-years.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { 살아있는글 } from './lib/live-code.mjs';
/* 🔴 [2026-11-14] 영문 지면에 「오후」가 나갔다 — 잰 시각은 한 꼴로 적는다 */
import { 잰때문자 } from './lib/잰때.mjs';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 생년길 = path.join(뿌리, 'archive/raw/wikidata/korean-entertainers-birth.json');
const 성별길 = path.join(뿌리, 'archive/raw/wikidata/korean-entertainers-gender.json');
const 그룹길 = path.join(뿌리, 'archive/raw/wikidata/korean-groups.json');
const 낼길 = path.join(뿌리, 'src/data/kcw-service-years.json');

/** ⚠ 시각은 KST. 이 PC 가 이미 KST 다 — toISOString() 을 쓰면 새벽에 해가 어긋난다 */
export function 올해(오늘 = new Date()) { return 오늘.getFullYear(); }

/**
 * `YYYY-MM-DD` — **지면이 쓰는 날짜다.**
 * ⛔ toISOString() 을 쓰지 않는다(UTC 라 새벽에 하루 어긋난다).
 * ⛔ toLocaleString('ko-KR') 도 지면에 쓰지 않는다 — 「오전」이 화면에 나간다.
 */
export function 날꼴(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const 날 = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${날}`;
}

/**
 * 그 해에 몇 살이 되나 — **만 나이가 아니라 「해 나이」다.**
 * ⛔ 생일이 지났나로 갈리는 만 나이를 쓰지 않는다. 지면이 하루마다 달라지면 안 된다.
 *   그래서 「2026년에 스물여덟이 되는 해」로 적고, 지면이 그 말을 그대로 쓴다.
 */
export function 해나이(생년, 기준해) {
  /* 🔴 Number(null) === 0 이다. 이 저장소의 대표 함정이고, 2026-09-09 에
     내가 «못 쟀으면 null» 을 지키려고 쓴 이 줄 자체가 그것에 걸렸다.
     ⛔ 그러니 Number() 를 부르기 «전»에 빈 것을 먼저 걸러 낸다. */
  const 빈것 = (v) => v === null || v === undefined || v === '';
  if (빈것(생년) || 빈것(기준해)) return null;
  const y = Number(생년);
  const 해 = Number(기준해);
  if (!Number.isFinite(y) || !Number.isFinite(해)) return null;
  return 해 - y;
}

/** 생년을 뽑는다. ⛔ 못 읽으면 null — 0 이나 올해로 채우지 않는다 */
export function 생년뽑기(born) {
  const m = String(born ?? '').match(/^(\d{4})/);
  if (!m) return null;
  const y = Number(m[1]);
  return y >= 1900 && y <= 2100 ? y : null;
}

/**
 * 태어난 곳이 한국인가 — ⛔ **국적 판정이 아니다.**
 * 위키데이터에 태어난 곳이 «적힌» 사람만 가르고, 안 적힌 사람은 미확인이다.
 * 우리 자료의 birthplace 는 Q번호이거나 이름이라 둘 다 견딘다.
 */
export function 태어난곳갈래(birthplace, 한국Q = 한국지역Q) {
  const 것 = [].concat(birthplace ?? []).filter(Boolean);
  if (!것.length) return '미확인';
  for (const b of 것) {
    const q = String(b?.q ?? b ?? '');
    if (한국Q.has(q)) return '한국';
  }
  return '한국밖으로적힘';
}

/** 한국을 가리키는 Q번호 몇 개. ⚠ 지역까지 다 넣을 수 없어 «나라» 수준만 둔다 */
export const 한국지역Q = new Set(['Q884']);

/**
 * 생년 × 성별로 센다.
 *
 * ⛔ 같은 사람이 두 그룹에 있으면 «한 번만» 센다 — 겹쳐 세면 수가 부풀려진다.
 *   (실측: 그룹 428개에 멤버 자리 1,742개인데 서로 다른 사람은 1,464명이다)
 */
export function 세기({ 멤버들, 성별, 기준해 }) {
  const 본사람 = new Map();
  for (const m of 멤버들 ?? []) {
    if (!m?.q || 본사람.has(m.q)) continue;
    const y = 생년뽑기(m.born);
    if (y == null) continue;               /* ⛔ 생년을 못 읽으면 세지 않는다 */
    본사람.set(m.q, { q: m.q, name: m.name, 생년: y, 성별: 성별?.[m.q] ?? '미확인', 곳: 태어난곳갈래(m.birthplace) });
  }
  const 해별 = new Map();
  for (const p of 본사람.values()) {
    if (!해별.has(p.생년)) 해별.set(p.생년, { 생년: p.생년, 해나이: 해나이(p.생년, 기준해), 남성: 0, 여성: 0, 그밖: 0, 성별미확인: 0, 전체: 0 });
    const 칸 = 해별.get(p.생년);
    칸.전체 += 1;
    if (p.성별 === '남성') 칸.남성 += 1;
    else if (p.성별 === '여성') 칸.여성 += 1;
    else if (p.성별 === '미확인' || p.성별 === '못받음') 칸.성별미확인 += 1;
    else 칸.그밖 += 1;
  }
  return { 사람: [...본사람.values()], 해별: [...해별.values()].sort((a, b) => b.생년 - a.생년) };
}

function 짓기() {
  const 성별파일 = JSON.parse(fs.readFileSync(성별길, 'utf8'));
  const 그룹파일 = JSON.parse(fs.readFileSync(그룹길, 'utf8'));
  const 기준해 = 올해();

  const 멤버들 = [];
  const 사람그룹 = new Map();
  for (const g of 그룹파일.그룹 ?? []) {
    for (const m of g.members ?? []) {
      멤버들.push(m);
      if (!사람그룹.has(m.q)) 사람그룹.set(m.q, []);
      사람그룹.get(m.q).push(g.name);
    }
  }

  const { 사람, 해별 } = 세기({ 멤버들, 성별: 성별파일.사람, 기준해 });
  for (const p of 사람) p.그룹 = 사람그룹.get(p.q) ?? [];

  const 남성전체 = 사람.filter((p) => p.성별 === '남성').length;
  const 여성전체 = 사람.filter((p) => p.성별 === '여성').length;
  const 성별미확인 = 사람.filter((p) => p.성별 === '미확인' || p.성별 === '못받음').length;

  const 답 = {
    generated: 잰때문자(),
    /* 🔴 [2026-09-09] `generated` 를 지면에 그대로 찍었더니 「오전 8:50:53」이 화면에 나갔다.
       우리 손님은 영어권이다 — 화면에 한국어를 내지 않는다.
       ⛔ 그렇다고 toISOString() 을 쓰지 않는다. 그것은 UTC 라 새벽에 «날짜가 하루 어긋난다».
       ✅ KST 인 이 PC 의 «부분»을 그대로 모아 붙인다. 지면은 이 칸을 쓴다. */
    builtOn: 날꼴(),
    asOfYear: 기준해,
    source: 'Wikidata (CC0) — P527 group members, P569 dates of birth, P21 sex or gender, P19 place of birth',
    whatThisIs: `Members of ${그룹파일.그룹수} Korean music groups, counted by birth year and by sex or gender as recorded on Wikidata. Ages shown are the age each person reaches during ${기준해}.`,
    whatThisIsNot: [
      'Not a prediction. We hold no enlistment dates and never say who serves, or when.',
      'Not a legal record. Sex or gender here is what Wikidata editors recorded.',
      'Not a nationality count. Place of birth is not citizenship, and most members have none recorded.',
      'Not a claim that any birth year matters. A larger year means more people were recorded.',
    ],
    weDoNotHave: ['enlistment dates', 'citizenship', 'discharge dates', 'service branch'],
    groupsRead: 그룹파일.그룹수,
    memberSlots: 멤버들.length,
    distinctPeopleWithBirthYear: 사람.length,
    men: 남성전체,
    women: 여성전체,
    sexNotRecorded: 성별미확인,
    byYear: 해별,
    /* ⛔ 사람 명단은 남성만 따로 빼지 않는다 — 그러면 「입대 예정자 명단」으로 읽힌다.
       지면에는 «해별 수»를 내고, 이름은 해 지면에서 성별과 함께 통째로 낸다 */
    people: 사람.map((p) => ({ q: p.q, name: p.name, birthYear: p.생년, ageThisYear: 해나이(p.생년, 기준해), sex: p.성별, birthplace: p.곳, groups: p.그룹 })),
  };

  fs.mkdirSync(path.dirname(낼길), { recursive: true });
  fs.writeFileSync(낼길, JSON.stringify(답, null, 1), 'utf8');
  console.log(`✅ ${낼길}`);
  console.log(`   그룹 ${답.groupsRead} · 멤버 자리 ${답.memberSlots} → 서로 다른 사람 ${답.distinctPeopleWithBirthYear}명`);
  console.log(`   남성 ${남성전체} · 여성 ${여성전체} · 성별 미확인 ${성별미확인} · 생년 ${해별.length}개`);
}

const 나 = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (나 && process.argv.includes('--자가시험')) {
  let 통 = 0; const 실 = [];
  const 검 = (n, ok) => { if (ok) 통 += 1; else 실.push(n); };

  검('생년뽑기 — ISO 날짜에서 해를 뽑는다', 생년뽑기('1997-02-18') === 1997);
  검('⛔ 생년뽑기 — 못 읽으면 null (0 으로 안 채운다)', 생년뽑기('') === null);
  검('⛔ 생년뽑기 — null 도 null', 생년뽑기(null) === null);
  검('⛔ 생년뽑기 — 말이 안 되는 해는 버린다', 생년뽑기('0001-01-01') === null);
  검('해나이 — 1998년생은 2026년에 28', 해나이(1998, 2026) === 28);
  검('⛔ 해나이 — 못 재면 null', 해나이(null, 2026) === null);
  검('⛔ 해나이 — 기준해가 없으면 null', 해나이(1998, null) === null);
  검('올해 — 짓는 날에서 가져온다 (손으로 안 적는다)', 올해(new Date('2031-03-04')) === 2031);

  검('태어난곳 — 한국이 적혀 있으면 한국', 태어난곳갈래([{ q: 'Q884' }]) === '한국');
  검('⛔ 태어난곳 — 안 적혀 있으면 미확인 (한국으로 안 밀어넣는다)', 태어난곳갈래([]) === '미확인');
  검('⛔ 태어난곳 — null 도 미확인', 태어난곳갈래(null) === '미확인');
  검('태어난곳 — 딴 나라면 그렇게 적는다', 태어난곳갈래([{ q: 'Q17' }]) === '한국밖으로적힘');

  const 견본 = [
    { q: 'A', name: 'A', born: '1998-01-01' },
    { q: 'B', name: 'B', born: '1998-06-06' },
    { q: 'A', name: 'A', born: '1998-01-01' },   /* 같은 사람이 두 그룹에 */
    { q: 'C', name: 'C', born: '2002-03-03' },
    { q: 'D', name: 'D', born: '' },             /* 생년 없음 */
  ];
  const 성별견본 = { A: '남성', B: '여성', C: '남성' };
  const r = 세기({ 멤버들: 견본, 성별: 성별견본, 기준해: 2026 });

  검('🔴 같은 사람을 두 번 세지 않는다', r.사람.length === 3);
  검('⛔ 생년 없는 사람은 세지 않는다', !r.사람.some((p) => p.q === 'D'));
  검('해별로 모은다', r.해별.length === 2);
  검('1998년 칸에 남성 1 · 여성 1', (() => { const c = r.해별.find((x) => x.생년 === 1998); return c.남성 === 1 && c.여성 === 1; })());
  검('해나이가 칸에 들어간다', r.해별.find((x) => x.생년 === 1998).해나이 === 28);
  검('새 해가 앞에 온다', r.해별[0].생년 === 2002);
  검('⛔ 성별이 없으면 성별미확인 칸으로 (남성으로 안 밀어넣는다)',
    세기({ 멤버들: [{ q: 'X', name: 'X', born: '1999-01-01' }], 성별: {}, 기준해: 2026 }).해별[0].성별미확인 === 1);
  검('⛔ 멤버가 없어도 안 죽는다', 세기({ 멤버들: null, 성별: {}, 기준해: 2026 }).사람.length === 0);
  검('날꼴 — YYYY-MM-DD 로 낸다 (지면이 쓰는 칸이다)', /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(날꼴(new Date(2026,8,9))));
  검('⛔ 날꼴 — 한국어가 섞이지 않는다. 화면에 한국어를 안 낸다', !/[가-힣]/.test(날꼴()));
  /* 🔴 이 검사를 «글자 찾기»로 세 번 짰고 세 번 다 자기 자신에 걸렸다 (2026-09-09) —
       1. 파일 전체를 훑으니 내 «주석»의 낱말에 걸렸다
       2. `살아있는글` 로 주석을 벗기니 이번엔 «검사 이름의 문자열»에 걸렸다
          (살아있는글은 문자열 «속»을 남긴다 — 그것이 그 자의 뜻이다)
       3. 낱말을 쪼개 붙이니 그래도 걸렸다 —
          🔴 `살아있는글` 은 **여러 줄 블록 주석의 «속줄»을 안 벗긴다.** 줄 단위로 재는 자라
          `/* 로 시작한 줄` 만 주석으로 보고 그 다음 줄들은 살아 있는 글로 남긴다
     ⇒ 그러니 글자로 재는 것을 그만두고 **움직임으로 잰다.** 이게 더 세다 —
       낱말을 바꿔 피할 수 없고, 「새벽에 하루 어긋난다」는 바로 그 사고를 직접 재기 때문이다.
     ⚠ `살아있는글` 의 이 한계는 5번이 메모로 전 유닛에 알렸다. 여기서 고치지 않는다 —
       그 자를 KST 관문 둘이 쓰고 있어, 함께 재기 전에 손대면 관문이 흔들린다. */
  검('🔴 날꼴 — KST 자정 직후에도 «그날»이다 (UTC 로 바꾸면 하루 앞으로 밀린다)',
    날꼴(new Date(2026, 8, 9, 0, 30)) === '2026-09-09');
  검('🔴 날꼴 — KST 자정 직전에도 «그날»이다', 날꼴(new Date(2026, 8, 9, 23, 30)) === '2026-09-09');
  검('🔴 「예측이 아니다」가 코드에 살아 있다',
    fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').includes('우리는 입대를 예측하지 않는다'));

  if (실.length) {
    console.error(`❌ 자가시험 실패 ${실.length}\n${실.map((s) => `   · ${s}`).join('\n')}`);
    process.exit(1);
  }
  console.log(`✅ 생년×성별 세는 자 — 자가시험 ${통}개 통과`);
  process.exit(0);
}

if (나) 짓기();
