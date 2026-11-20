/**
 * make-kcw-score-card.mjs — **경기 사진이 없을 때 쓰는 「점수판」 그림을 짓는다.**
 *
 * ── 🔴🔴 사장님 지시 (2026-10-28, 원문) ───────────────────────────────
 * 「k-review 드라마 등 각 메뉴에도 썸네일 넣어. **연합뉴스 사진만 있으면 스코어와
 *   각 팀의 엠블럼을 사용해서 이미지를 세련되게 만들어**」
 *
 * ⭐ 앞선 지시(「스포츠에선 각 팀의 엠블럼을 사진으로 쓰지말고」)와 어긋나지 않는다.
 *   그때 막으신 것은 **엠블럼을 경기 사진 «대신» 내거는 것**이다.
 *   여기서 짓는 것은 사진이 아니라 **우리가 만든 그림**이고, 엠블럼은 그 안의 부품이다.
 *   ⇒ 사진이 있으면 늘 사진이 먼저다. 이 그림은 **사진이 없을 때만** 쓴다.
 *
 * ⛔ 엠블럼은 «협회가 내는 것»만 받아 둔다 — `public/brand/kbo/<구단코드>.png`, 농구는 `public/brand/kbl/<로고갈래>.svg`.
 *   남의 블로그에서 받은 파일을 쓰지 않는다.
 * ⛔ 점수를 손으로 적지 않는다 — 기사의 머리말(frontmatter)과 제목에서 읽어 온다.
 *
 * 쓰는 법
 *   node scripts/make-kcw-score-card.mjs --글=content/kcw-reviews/kbo-po2-samsung-kia.md --적는다
 *   node scripts/make-kcw-score-card.mjs --selftest
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const 뿌리 = fileURLToPath(new URL('..', import.meta.url));

/* ── 구단 — 협회 엠블럼 파일 이름과 «구단이 쓰는 색» ────────────────────── */
export const 구단 = {
  '삼성 라이온즈': { 코드: 'SS', 색: '#074CA1', 짧게: '삼성' },
  'KIA 타이거즈': { 코드: 'HT', 색: '#EA0029', 짧게: 'KIA' },
  '두산 베어스': { 코드: 'OB', 색: '#131230', 짧게: '두산' },
  'LG 트윈스': { 코드: 'LG', 색: '#C30452', 짧게: 'LG' },
  '한화 이글스': { 코드: 'HH', 색: '#FF6600', 짧게: '한화' },
  'SSG 랜더스': { 코드: 'SK', 색: '#CE0E2D', 짧게: 'SSG' },
  'NC 다이노스': { 코드: 'NC', 색: '#315288', 짧게: 'NC' },
  'kt wiz': { 코드: 'KT', 색: '#000000', 짧게: 'kt' },
  '롯데 자이언츠': { 코드: 'LT', 색: '#041E42', 짧게: '롯데' },
  '키움 히어로즈': { 코드: 'WO', 색: '#570514', 짧게: '키움' },
};

/**
 * 🔴 [2026-10-31 · 사장님] 「연합뉴스는 사용못함(이 경우는 엠블럼+스코어로 이미지 만들어 사용)」
 * ─────────────────────────────────────────────────────────────────────────
 * e스포츠 구단. **엠블럼은 라이엇 게임즈 LoL 이스포츠 공식 파일만 받아 둔다** —
 * `getTeams` 가 주는 `alternativeImage`(흰 바탕용)를 `public/brand/lolesports/<코드>.png` 로.
 * ⛔ 남의 블로그·팬 사이트에서 받은 파일을 쓰지 않는다.
 * ⚠ 색은 구단이 쓰는 색이지 경기 기록이 아니다. 점수·기록은 어디서도 손으로 적지 않는다.
 */
export const 이스포츠구단 = {
  '한화생명e스포츠': { 코드: 'HLE', 색: '#F26522', 짧게: '한화생명' },
  'G2 e스포츠': { 코드: 'G2', 색: '#1C1C1C', 짧게: 'G2' },
  'T1': { 코드: 'T1', 색: '#E2012D', 짧게: 'T1' },
  '젠지 e스포츠': { 코드: 'GEN', 색: '#AA8A00', 짧게: '젠지' },
  '디플러스 기아': { 코드: 'DK', 색: '#004B9F', 짧게: '디플러스' },
  '빌리빌리 게이밍': { 코드: 'BLG', 색: '#0B2A5B', 짧게: '빌리빌리' },
  '톱 e스포츠': { 코드: 'TES', 색: '#D4232E', 짧게: '톱' },
  '인빅터스 게이밍': { 코드: 'IG', 색: '#13227A', 짧게: '인빅터스' },
  '애니원스 레전드': { 코드: 'AL', 색: '#C8102E', 짧게: '애니원스' },
  '모비스타 KOI': { 코드: 'MKOI', 색: '#00A3E0', 짧게: '모비스타' },
  '카르민 코프': { 코드: 'KC', 색: '#1D2A44', 짧게: '카르민' },
  'CTBC 플라잉 오이스터': { 코드: 'CFO', 색: '#005BAC', 짧게: 'CFO' },
  '팀 리퀴드': { 코드: 'TLAW', 색: '#0A1E3C', 짧게: '리퀴드' },
  '팀 시크릿': { 코드: 'TSW', 색: '#1A1A1A', 짧게: '시크릿' },
  '리옹 게이밍': { 코드: 'LYON', 색: '#F2A900', 짧게: '리옹' },
  '로스 그란데스': { 코드: 'LOS', 색: '#1B998B', 짧게: '로스' },
};

/**
 * 🔴 [2026-10-31 · 사장님] 「연합뉴스는 사용못함(이 경우는 엠블럼+스코어로 이미지 만들어 사용)」
 * ─────────────────────────────────────────────────────────────────────────
 * 프로농구(KBL) 구단. **엠블럼은 한국농구연맹 공식 누리집이 내거는 파일만 받아 둔다** —
 *   https://www.kbl.or.kr/assets/img/logo/logo-<로고갈래>.svg   (경기 기록 화면 머리에 쓰는 것)
 *   로고갈래(db·ss·sono…)는 KBL 이 주는 구단 목록(api.kbl.or.kr/common/teamList 의 teamLogoClass)
 *   그대로다. 받아 둔 곳 — `public/brand/kbl/<로고갈래>.svg` (2026-10-31 받음).
 * ⛔ 남의 블로그·팬 사이트에서 받은 파일을 쓰지 않는다. 상무는 정규리그에 없어 두지 않는다.
 * ⚠ 이름은 KBL 일정 화면의 tnameH/tnameA 꼴(「울산 현대모비스」)을 쓴다 — 명칭도 그 꼴로 적는다.
 * ⚠ 색은 «그 엠블럼 파일 안에 든 색»에서 골랐다(지어낸 색이 아니다).
 *   삼성(노랑)·LG(노랑)처럼 흰 바탕에서 점수 글자가 안 읽히는 색은 띠에만 쓰고,
 *   점수 글자는 같은 파일 안의 짙은 색(글자색)으로 적는다.
 */
export const 농구구단 = {
  '원주 DB': { 코드: 'db', 색: '#007F41', 짧게: 'DB' },
  '서울 삼성': { 코드: 'ss', 색: '#FAC10B', 글자색: '#000000', 짧게: '삼성' },
  '고양 소노': { 코드: 'sono', 색: '#223E63', 짧게: '소노' },
  '서울 SK': { 코드: 'sk', 색: '#E1002B', 짧게: 'SK' },
  '창원 LG': { 코드: 'lg', 색: '#FFD900', 글자색: '#C20037', 짧게: 'LG' },
  '안양 정관장': { 코드: 'kgc', 색: '#CF1F25', 짧게: '정관장' },
  '부산 KCC': { 코드: 'kcc', 색: '#0069B4', 짧게: 'KCC' },
  '수원 KT': { 코드: 'kt', 색: '#D92728', 짧게: 'KT' },
  '대구 한국가스공사': { 코드: 'pega', 색: '#374EA2', 짧게: '가스공사' },
  '울산 현대모비스': { 코드: 'hd', 색: '#1A3065', 짧게: '현대모비스' },
};

/**
 * 🔴 [2026-11-20 · 사장님] 「왜 사진이 없나? 꼭 사진 찾아서 써」 — 배구(V-리그 여자부).
 * ⛔ 엠블럼은 **한국배구연맹이 내는 파일만** 받아 둔다 — `https://cdn.kovo.co.kr/emblems/<이름>.svg`
 *   (연맹 공식 지면이 그대로 부르는 주소다). 색은 그 엠블럼에서 재서 적었다.
 * ⚠ 이름은 기사 머리말의 `subject.명칭` 에 적히는 꼴 그대로다 — 연맹 정식 명칭보다 짧다.
 *   「대전 정관장 레드스파크스」가 아니라 「정관장」으로 적힌다.
 */
export const 배구구단 = {
  'GS칼텍스': { 코드: 'kixx', 색: '#00728F', 짧게: 'GS칼텍스' },
  '한국도로공사': { 코드: 'hipass', 색: '#102A86', 짧게: '도로공사' },
  '현대건설': { 코드: 'hillstate', 색: '#002D74', 짧게: '현대건설' },
  '흥국생명': { 코드: 'pinkspiders', 색: '#E4007F', 짧게: '흥국생명' },
  'IBK기업은행': { 코드: 'altos', 색: '#004B9D', 짧게: 'IBK' },
  /* ⚠ 농구의 「안양 정관장」과 이름이 겹친다 — 두팀읽기 가 «긴 쪽»을 남겨서 가른다 */
  '정관장': { 코드: 'redsparks', 색: '#CF1F25', 짧게: '정관장' },
  'SOOP': { 코드: 'soopers', 색: '#0545B1', 짧게: 'SOOP' },
};

/**
 * 🔴 [2026-11-20 · 사장님] 「**왜 사진이 없나? 꼭 사진 찾아서 써.
 *   저작권 문제없게 언론사 사진 쓰면 절대 안됨**」
 * ─────────────────────────────────────────────────────────────────────────
 * 축구 지면 6편이 전부 사진 없이 나가 있었다 — 종목 표에 축구가 아예 없었기 때문이다.
 * ⛔ 엠블럼은 **한국프로축구연맹이 내는 파일만** 받아 둔다 —
 *   `https://www.kleague.com/about/emblem.do` 가 연맹이 공개한 엠블럼 지면이고,
 *   파일은 `/assets/images/emblem/emblem_<구단코드>@3x.png` 다(540×540).
 * ⛔ 색을 손으로 지어내지 않는다. `엠블럼-색을-잰다` 로 **그 엠블럼에서 재서** 적었다.
 * ⚠ 이름은 기사 머리말의 `subject.명칭` 에 적히는 꼴 그대로여야 집힌다.
 */
export const 축구구단 = {
  'FC서울': { 코드: 'k09', 색: '#D7010F', 짧게: '서울' },
  '울산 HD FC': { 코드: 'k01', 색: '#024291', 짧게: '울산' },
  '대전 하나 시티즌': { 코드: 'k10', 색: '#052B5A', 짧게: '대전' },
  '강원FC': { 코드: 'k21', 색: '#01615A', 짧게: '강원' },
  '전북 현대 모터스': { 코드: 'k05', 색: '#174B35', 짧게: '전북' },
  /* 인천은 엠블럼의 노랑이 가장 넓다 — 흰 바탕에 그대로 적으면 안 읽힌다 */
  '인천 유나이티드': { 코드: 'k18', 색: '#FED501', 글자색: '#1B1B1B', 짧게: '인천' },
  '제주SK FC': { 코드: 'k04', 색: '#0A1663', 짧게: '제주' },
  'FC안양': { 코드: 'k27', 색: '#4A237A', 짧게: '안양' },
  '포항 스틸러스': { 코드: 'k03', 색: '#1A1A1A', 짧게: '포항' },
  '김천 상무': { 코드: 'k35', 색: '#022648', 짧게: '김천' },
  '광주FC': { 코드: 'k22', 색: '#C60119', 짧게: '광주' },
  '수원FC': { 코드: 'k29', 색: '#083968', 짧게: '수원FC' },
  '대구FC': { 코드: 'k17', 색: '#0366B7', 짧게: '대구' },
  '부천FC1995': { 코드: 'k26', 색: '#A42526', 짧게: '부천' },
};

/**
 * 종목마다 엠블럼을 어디서 받아 어디에 두고, 바닥에 누구를 적나.
 * ⛔ 「엠블럼 — K Culture Wire」로 적지 않는다. 엠블럼은 우리 것이 아니다.
 */
export const 종목 = {
  kbo: { 표: 구단, 폴더: 'kbo', 엠블럼높이: 96, 낸곳: '한국야구위원회(KBO)' },
  lolesports: { 표: 이스포츠구단, 폴더: 'lolesports', 엠블럼높이: 128, 낸곳: '라이엇 게임즈 LoL 이스포츠' },
  /* KBL 파일은 벡터(SVG, 132×80)라 키워도 뭉개지지 않는다 */
  kbl: { 표: 농구구단, 폴더: 'kbl', 엠블럼높이: 150, 확장자: 'svg', 낸곳: '한국농구연맹(KBL)' },
  /* 연맹이 내는 축구 엠블럼은 540×540 이라 키워도 뭉개지지 않는다 */
  kleague: { 표: 축구구단, 폴더: 'kleague', 엠블럼높이: 124, 낸곳: '한국프로축구연맹' },
  /* 연맹이 내는 배구 엠블럼은 벡터(SVG)라 키워도 뭉개지지 않는다 */
  kovo: { 표: 배구구단, 폴더: 'kovo', 엠블럼높이: 132, 확장자: 'svg', 낸곳: '한국배구연맹(KOVO)' },
};

/** 종목의 엠블럼 파일 확장자 — 적지 않았으면 png */
export function 엠블럼확장자(종목키) {
  return (종목[종목키] && 종목[종목키].확장자) || 'png';
}

/** 구단 이름 하나가 어느 종목의 것인가 — 못 찾으면 null */
export function 종목찾기(이름) {
  for (const [키, 값] of Object.entries(종목)) if (값.표[이름]) return 키;
  return null;
}

/** 종목을 가리지 않고 구단 정보를 집는다 */
export function 구단정보(이름) {
  const k = 종목찾기(이름);
  return k ? 종목[k].표[이름] : null;
}

/**
 * 제목에서 「8대3」 같은 점수를 집는다.
 * ⛔ 「5대1 제압」의 앞 수가 «이긴 팀»이다 — 제목의 맨 앞에 선 팀이 이긴 팀이다.
 */
export function 점수읽기(제목) {
  /* 🔴 [2026-10-31] 농구는 세 자리 점수(101대99)가 난다 — 두 자리로 묶으면 «01대99» 로 잘못 읽는다 */
  const m = String(제목 ?? '').match(/(\d{1,3})\s*대\s*(\d{1,3})/);
  if (!m) return null;
  return { 앞: Number(m[1]), 뒤: Number(m[2]) };
}

/**
 * 「… 삼성 라이온즈 대 KIA 타이거즈」에서 두 팀을 집는다.
 * ⚠ 여기서 나오는 차례는 «경기 표기 차례»(원정 대 홈)이지 승패가 아니다.
 */
export function 두팀읽기(명칭) {
  const 모든이름 = Object.values(종목).flatMap((s) => Object.keys(s.표));
  const 걸린것 = 모든이름.filter((n) => String(명칭 ?? '').includes(n));
  /* 🔴 [2026-11-20] 배구 「정관장」이 농구 「안양 정관장」 안에 들어 있다.
     둘 다 세면 농구 경기에서 이름이 셋이 되어 «그리던 것까지 멈춘다».
     ⇒ 다른 이름 안에 통째로 든 짧은 이름은 버린다. 긴 쪽이 그 경기의 구단이다. */
  const 이름들 = 걸린것.filter((n) => !걸린것.some((m) => m !== n && m.includes(n)));
  if (이름들.length !== 2) return null;
  /* 글에 먼저 나오는 쪽을 앞에 둔다 */
  return 이름들.sort((a, b) => String(명칭).indexOf(a) - String(명칭).indexOf(b));
}

/**
 * 🔴 [2026-11-20] **제목의 머리절만 본다.** 「…시리즈 1승 1패」의 `패` 를 패배로 읽으면 안 된다.
 * ⛔ 「제패」는 이긴 것이다 — `패` 한 글자로 세지 않는다.
 */
export function 진꼴인가(제목) {
  const 머리절 = String(제목 ?? '').split(/[…]/)[0];
  if (/무승부|비겼/.test(머리절)) return false;
  return /(?<!제)패|졌다|지며|내줬다|무릎/.test(머리절);
}

/**
 * 제목 맨 앞에 선 팀이 이긴 팀이다. 「삼성, 플레이오프 2차전 KIA 8대3 제압」
 *
 * 🔴 [2026-11-20] 두 가지를 더 본다 — 축구 6편을 그리다 둘 다 걸렸다.
 *   ① **무승부**: 「FC서울, 1대1 무승부로 우승 확정」 — 이긴 쪽이 «없다».
 *     점수를 넘겨 받지 못하면 못 가린다. 그래서 `점수` 를 셋째 인자로 받는다.
 *   ② **패배 꼴**: 「한국 축구, 사우디에 2대3 패」 — 맨 앞에 선 팀이 «진» 팀이다.
 * ⛔ 둘을 안 가리면 진 팀을 이긴 자리에 세운 그림이 나간다. 점수는 맞는데 사실이 틀린다.
 */
export function 이긴팀(제목, 두팀, 점수) {
  if (!두팀) return null;
  if (점수 && Number(점수.앞) === Number(점수.뒤)) return null; /* 무승부 */
  const 자리 = 두팀.map((n) => {
    const 짧 = 구단정보(n).짧게;
    const i = String(제목).indexOf(짧);
    return i < 0 ? Number.MAX_SAFE_INTEGER : i;
  });
  if (자리[0] === 자리[1]) return null;
  const 앞선팀 = 자리[0] < 자리[1] ? 두팀[0] : 두팀[1];
  if (진꼴인가(제목)) return 두팀.find((n) => n !== 앞선팀) ?? null;
  return 앞선팀;
}

/** 머리말에서 한 줄 값을 읽는다(얕은 YAML — 「키: "값"」 또는 「키: 값」) */
export function 머리값(글, 키) {
  const m = String(글).match(new RegExp(`^\\s*${키}:\\s*(.+)$`, 'm'));
  if (!m) return null;
  return m[1].trim().replace(/^["']|["']$/g, '');
}

/** 그림 파일을 글에 그대로 실어 준다 — 바깥 주소를 타지 않으므로 늘 그려진다 */
export function 글로실은그림(길) {
  return `data:${그림갈래(길)};base64,${fs.readFileSync(길).toString('base64')}`;
}

/** 확장자로 그림 갈래를 정한다 — KBL 엠블럼은 SVG 다(png 로 실으면 빈 자리로 찍힌다) */
export function 그림갈래(길) {
  return /\.svg$/i.test(String(길)) ? 'image/svg+xml' : 'image/png';
}

/** 날짜를 「2026년 10월 27일」로 */
export function 날짜글(iso) {
  const t = new Date(iso);
  if (Number.isNaN(+t)) return '';
  return `${t.getFullYear()}년 ${t.getMonth() + 1}월 ${t.getDate()}일`;
}

/** 그림 한 장의 HTML — 크롬이 그려서 찍는다(글꼴이 확실하다) */
export function 그림글(것) {
  const { 왼, 오, 점수왼, 점수오, 이긴쪽, 대회, 날짜, 엠블럼왼, 엠블럼오 } = 것;
  /* 🔴 [2026-10-31] 엠블럼 높이를 종목마다 달리 둔다 — KBO 파일은 81×59 라 늘리면 뭉개지고,
     라이엇이 내는 파일은 1000×1000 이라 96px 로 묶으면 넓은 화면에서 초라해진다. */
  const 높이 = Number(것.엠블럼높이) || 96;
  const 흐리게 = (쪽) => (이긴쪽 && 이긴쪽 !== 쪽 ? 'opacity:.45;' : '');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:1200px;height:630px;background:#fff;
       font-family:'Pretendard','Malgun Gothic',system-ui,sans-serif;
       display:flex;flex-direction:column;}
  .bar{height:8px;display:flex}
  .bar i{flex:1}
  .top{padding:46px 64px 0;text-align:center}
  .meet{font-size:23px;letter-spacing:.02em;color:#5b6472;font-weight:600}
  .when{font-size:19px;color:#97a0ad;margin-top:10px}
  .mid{flex:1;display:flex;align-items:center;justify-content:center;gap:52px;padding:0 64px}
  .team{width:330px;text-align:center}
  /* ⚠ 협회가 내는 엠블럼 파일이 81×59 로 작다. 크게 늘리면 뭉개진다 —
     96px 까지만 올리고(1.6배), 모자란 몫은 «점수 글자»가 메운다. */
  .team img{height:${높이}px;object-fit:contain;image-rendering:auto}
  .team .nm{margin-top:18px;font-size:30px;font-weight:800;color:#161b22;letter-spacing:-.01em}
  .sc{font-size:132px;font-weight:800;line-height:1;letter-spacing:-.03em;font-variant-numeric:tabular-nums}
  .vs{font-size:40px;color:#c3cad4;font-weight:700;padding-bottom:26px}
  .foot{padding:0 64px 44px;text-align:center;font-size:19px;color:#97a0ad}
  </style></head><body>
  <div class="bar"><i style="background:${것.색왼}"></i><i style="background:${것.색오}"></i></div>
  <div class="top"><div class="meet">${대회}</div><div class="when">${날짜}</div></div>
  <div class="mid">
    <div class="team" style="${흐리게(왼)}">
      <img src="${엠블럼왼}" alt="">
      <div class="nm">${왼}</div>
      <div class="sc" style="color:${것.글자색왼 || 것.색왼}">${점수왼}</div>
    </div>
    <div class="vs">:</div>
    <div class="team" style="${흐리게(오)}">
      <img src="${엠블럼오}" alt="">
      <div class="nm">${오}</div>
      <div class="sc" style="color:${것.글자색오 || 것.색오}">${점수오}</div>
    </div>
  </div>
  <div class="foot">${것.바닥}</div>
  </body></html>`;
}

/**
 * 🔴 [2026-10-29 · 5번] 경기가 아닌 글의 그림 — 「사실 카드」.
 *   사장님: 「각 메뉴에도 썸네일 넣어」. 그런데 일정 안내·감독 선임처럼 **점수가 없는 글**이 있다.
 *   점수판을 억지로 씌우지 않는다 — 그 글의 «주제»를 그대로 크게 적는다.
 *   ⛔ 없는 숫자를 지어내지 않는다. 적는 것은 기사 머리말에 이미 있는 말뿐이다.
 */
export function 사실카드글(것) {
  const { 윗말, 큰말, 아랫말, 색, 바닥 } = 것;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:1200px;height:630px;background:#fff;
       font-family:'Pretendard','Malgun Gothic',system-ui,sans-serif;
       display:flex;flex-direction:column}
  .bar{height:8px;background:${색}}
  .mid{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
       padding:0 96px;text-align:center}
  .up{font-size:24px;font-weight:700;color:${색};letter-spacing:.04em}
  .big{margin-top:22px;font-size:62px;font-weight:800;line-height:1.26;
       color:#161b22;letter-spacing:-.025em}
  .dn{margin-top:26px;font-size:22px;color:#97a0ad}
  .foot{padding:0 64px 44px;text-align:center;font-size:19px;color:#97a0ad}
  </style></head><body>
  <div class="bar"></div>
  <div class="mid">
    <div class="up">${윗말}</div>
    <div class="big">${큰말}</div>
    ${아랫말 ? `<div class="dn">${아랫말}</div>` : ''}
  </div>
  <div class="foot">${바닥}</div>
  </body></html>`;
}

/**
 * 주제 명칭을 「윗말 / 큰말」로 가른다.
 * 「2026 장애인아시아경기대회 사격 50m 복사」 → 윗말 «2026 장애인아시아경기대회» · 큰말 «사격 50m 복사»
 * ⚠ 가를 자리를 못 찾으면 통째로 큰말에 둔다 — 억지로 자르지 않는다.
 */
export function 주제가르기(명칭, 주체) {
  const 글 = String(명칭 ?? '').trim();
  if (!글) return null;

  /* ① 글쓴이가 이미 줄표로 갈라 놓았으면 그대로 따른다 — 가장 믿을 만하다 */
  const 줄표 = 글.split(/\s+[—–-]\s+/);
  if (줄표.length === 2 && 줄표[0] && 줄표[1]) return { 윗말: 줄표[0].trim(), 큰말: 줄표[1].trim() };

  /* ② 대회 이름이 앞에 서는 꼴 — 「…대회 / …컵 / …리그」 까지가 윗말이다 */
  const m = 글.match(/^(.*?(?:아시아경기대회|장애인아시아경기대회|아시안컵|아시안게임|월드컵|올림픽|선수권대회|챔피언십|포스트시즌|정규리그))\s+(.+)$/);
  if (m) return { 윗말: m[1].trim(), 큰말: m[2].trim() };

  /* ②-b 🔴 [2026-11-20] 「2026 APBC 한국 대 호주 (개막전)」처럼 «연도 + 대회 약어»로 서는 꼴.
     ⚠ 이것이 없으면 ④로 떨어져 윗말에 «일본야구기구(NPB) 2026 APBC 조직위원회»가 통째로 들어간다.
     ⛔ 약어는 두 글자 이상 여덟 글자 이하의 영문·숫자만 본다 — 구단 이름을 약어로 오인하지 않게. */
  const 약어 = 글.match(/^(\d{4}\s+[A-Z][A-Z0-9]{1,7})\s+(.+)$/);
  if (약어) return { 윗말: 약어[1].trim(), 큰말: 약어[2].trim() };

  /* ③ 주체(구단·협회) 이름으로 시작하면 그 이름까지가 윗말이다 */
  const 주 = String(주체 ?? '').trim();
  if (주 && 글.startsWith(주) && 글.length > 주.length + 1) {
    return { 윗말: 주, 큰말: 글.slice(주.length).trim() };
  }

  /* ④ 못 가르면 통째로 큰말에 둔다 — 억지로 자르지 않는다 */
  return { 윗말: 주, 큰말: 글 };
}

/* ───────────────────────────── 자가시험 ───────────────────────────── */
function 자가시험() {
  let 통과 = 0; let 실패 = 0;
  const 참 = (이름, 값) => { if (값) { 통과 += 1; } else { 실패 += 1; console.log('🔴 ' + 이름); } };

  참('점수를 집는다', JSON.stringify(점수읽기('삼성, 플레이오프 2차전 KIA 8대3 제압')) === '{"앞":8,"뒤":3}');
  참('띄어쓴 점수도 집는다', JSON.stringify(점수읽기('KIA 5 대 1 승')) === '{"앞":5,"뒤":1}');
  참('점수가 없으면 없다고 한다', 점수읽기('롯데, 이동욱 감독 선임') === null);
  참('두 자리 점수도 집는다', JSON.stringify(점수읽기('두산 12대10')) === '{"앞":12,"뒤":10}');

  const 두팀 = 두팀읽기('2026 KBO 포스트시즌 플레이오프 2차전 삼성 라이온즈 대 KIA 타이거즈');
  참('두 팀을 적힌 차례로 집는다', JSON.stringify(두팀) === '["삼성 라이온즈","KIA 타이거즈"]');
  참('한 팀만 있으면 못 집는다', 두팀읽기('삼성 라이온즈 훈련') === null);

  참('제목 맨 앞의 팀이 이긴 팀이다',
    이긴팀('삼성, 플레이오프 2차전 KIA 8대3 제압…시리즈 1승 1패', 두팀) === '삼성 라이온즈');
  참('⛔ 대조군 — 차례가 바뀌면 이긴 팀도 바뀐다',
    이긴팀('KIA, 플레이오프 1차전 삼성 5대1 제압', 두팀) === 'KIA 타이거즈');

  /* 🔴 [2026-10-31] e스포츠 — 「연합뉴스 사진을 못 쓰면 엠블럼+스코어로」 */
  const 두팀e = 두팀읽기('2026 롤드컵 스위스 스테이지 4라운드 한화생명e스포츠 대 G2 e스포츠');
  참('e스포츠 두 팀을 적힌 차례로 집는다', JSON.stringify(두팀e) === '["한화생명e스포츠","G2 e스포츠"]');
  참('세트 점수도 집는다', JSON.stringify(점수읽기('한화생명, G2에 2대0')) === '{"앞":2,"뒤":0}');
  참('e스포츠도 제목 맨 앞의 팀이 이긴 팀이다',
    이긴팀('한화생명, 용 일곱 마리를 모두 가져갔다…G2에 2대0', 두팀e) === '한화생명e스포츠');
  참('⛔ 대조군 — 차례가 바뀌면 이긴 팀도 바뀐다',
    이긴팀('G2, 한화생명에 2대0', 두팀e) === 'G2 e스포츠');
  참('종목을 가린다 — 야구와 e스포츠를 섞지 않는다',
    종목찾기('삼성 라이온즈') === 'kbo' && 종목찾기('한화생명e스포츠') === 'lolesports');
  참('모르는 구단은 종목이 없다', 종목찾기('없는구단') === null);
  참('⛔ 종목이 섞인 명칭은 못 읽는다고 한다',
    두팀읽기('삼성 라이온즈 대 한화생명e스포츠') !== null
      && 종목찾기('삼성 라이온즈') !== 종목찾기('한화생명e스포츠'));
  참('엠블럼 높이를 종목이 정한다',
    그림글({ 왼: 'ㄱ', 오: 'ㄴ', 점수왼: 2, 점수오: 0, 대회: 'ㄷ', 날짜: 'ㄹ', 바닥: 'ㅁ',
      색왼: '#000', 색오: '#111', 엠블럼왼: 'a', 엠블럼오: 'b', 엠블럼높이: 128 }).includes('height:128px'));
  참('⛔ 대조군 — 안 적으면 96px 그대로다',
    그림글({ 왼: 'ㄱ', 오: 'ㄴ', 점수왼: 2, 점수오: 0, 대회: 'ㄷ', 날짜: 'ㄹ', 바닥: 'ㅁ',
      색왼: '#000', 색오: '#111', 엠블럼왼: 'a', 엠블럼오: 'b' }).includes('height:96px'));

  /* 🔴 [2026-10-31] 프로농구(KBL) — 세 자리 점수·SVG 엠블럼·노란 구단의 글자색 */
  참('세 자리 점수를 집는다', JSON.stringify(점수읽기('SK, KT 101대99')) === '{"앞":101,"뒤":99}');
  참('⛔ 대조군 — 세 자리를 두 자리로 자르지 않는다', 점수읽기('SK, KT 101대99').앞 !== 1);
  const 두팀k = 두팀읽기('2026-2027 KBL 정규리그 울산 현대모비스 대 부산 KCC (울산동천체육관)');
  참('농구 두 팀을 적힌 차례로 집는다', JSON.stringify(두팀k) === '["울산 현대모비스","부산 KCC"]');
  참('농구도 제목 맨 앞의 팀이 이긴 팀이다',
    이긴팀('현대모비스, KCC 96대89로 꺾었다', 두팀k) === '울산 현대모비스');
  참('⛔ 대조군 — 차례가 바뀌면 이긴 팀도 바뀐다', 이긴팀('KCC, 현대모비스 96대89', 두팀k) === '부산 KCC');
  참('농구와 야구를 가린다 — 서울 삼성 ≠ 삼성 라이온즈',
    종목찾기('서울 삼성') === 'kbl' && 종목찾기('삼성 라이온즈') === 'kbo');
  참('⛔ 대조군 — 야구 명칭에서 농구 구단을 집지 않는다',
    JSON.stringify(두팀읽기('2026 KBO 포스트시즌 플레이오프 4차전 삼성 라이온즈 대 KIA 타이거즈')) === '["삼성 라이온즈","KIA 타이거즈"]');
  참('KBL 엠블럼은 SVG 다', 엠블럼확장자('kbl') === 'svg' && 엠블럼확장자('kbo') === 'png');
  참('SVG 는 SVG 갈래로 싣는다', 그림갈래('public/brand/kbl/ss.svg') === 'image/svg+xml');
  참('⛔ 대조군 — PNG 는 PNG 갈래 그대로다', 그림갈래('public/brand/kbo/SS.png') === 'image/png');
  참('KBL 구단 엠블럼 열 개가 모두 받아져 있다',
    Object.values(농구구단).every((t) => fs.existsSync(path.join(뿌리, 'public', 'brand', 'kbl', `${t.코드}.svg`))));
  const 노랑 = 그림글({ 왼: '서울 삼성', 오: '고양 소노', 점수왼: 95, 점수오: 87, 이긴쪽: '서울 삼성',
    대회: 'ㄷ', 날짜: 'ㄹ', 바닥: 'ㅁ', 색왼: '#FAC10B', 색오: '#223E63', 글자색왼: '#000000',
    엠블럼왼: 'a', 엠블럼오: 'b' });
  참('노란 구단은 점수를 짙은 글자색으로 적는다', 노랑.includes('color:#000000">95<') && !노랑.includes('color:#FAC10B">95<'));
  참('⛔ 대조군 — 글자색이 없으면 구단 색 그대로다', 노랑.includes('color:#223E63">87<'));
  참('노란 색은 띠에는 그대로 쓴다', 노랑.includes('background:#FAC10B'));

  참('머리말 한 줄을 읽는다', 머리값('---\ntitle: "가나"\ncategory: baseball\n---', 'category') === 'baseball');
  참('따옴표를 벗긴다', 머리값('title: "가나다"', 'title') === '가나다');
  참('날짜를 사람 말로 적는다', 날짜글('2026-10-27T18:30:00+09:00') === '2026년 10월 27일');

  /* 🔴 그림글이 «진 쪽»을 흐리게 하는지 — 눈으로 보기 전에 글로 잰다 */
  const h = 그림글({
    왼: '삼성 라이온즈', 오: 'KIA 타이거즈', 점수왼: 8, 점수오: 3, 이긴쪽: '삼성 라이온즈',
    대회: '시험', 날짜: '시험', 바닥: '시험', 색왼: '#074CA1', 색오: '#EA0029',
    엠블럼왼: 'a.png', 엠블럼오: 'b.png',
  });
  /* ⛔ 「'KIA 타이거즈' 앞에 opacity 가 없다」로 재면 틀린다 — 진 쪽의 style 은
     그 «이름보다 앞»에 적히기 때문이다. 가운데 쌍점(`class="vs"`)으로 좌우를 가른다. */
  const [왼쪽글, 오른쪽글] = h.split('class="vs"');
  참('이긴 쪽은 흐리지 않다', 왼쪽글.includes('opacity') === false);
  참('진 쪽은 흐리다', 오른쪽글.includes('opacity:.45;'));
  참('점수가 둘 다 들어간다', h.includes('>8<') && h.includes('>3<'));
  /* 🔴 엠블럼이 «글에 실려» 들어가야 한다 — file:// 로 넣으면 빈 자리로 찍힌다 */
  const 참그림 = 그림글({ ...{
    왼: '삼성 라이온즈', 오: 'KIA 타이거즈', 점수왼: 8, 점수오: 3, 이긴쪽: '삼성 라이온즈',
    대회: '시험', 날짜: '시험', 바닥: '시험', 색왼: '#074CA1', 색오: '#EA0029',
  }, 엠블럼왼: 'data:image/png;base64,AAA', 엠블럼오: 'data:image/png;base64,BBB' });
  참('엠블럼은 글에 실어 넣는다', (참그림.match(/src="data:image\/png;base64,/g) || []).length === 2);
  참('⛔ 대조군 — file:// 주소가 남아 있으면 안 된다', 참그림.includes('file://') === false);

  /* 🔴 경기가 아닌 글 — 주제를 둘로 가르는 자 */
  참('줄표가 있으면 그대로 가른다',
    JSON.stringify(주제가르기('2027 AFC 아시안컵 — 한국 조별리그 E조 일정 확정', 'AFC'))
    === '{"윗말":"2027 AFC 아시안컵","큰말":"한국 조별리그 E조 일정 확정"}');
  참('대회 이름 뒤에서 가른다',
    JSON.stringify(주제가르기('2026 아이치·나고야 장애인아시아경기대회 사격 혼성 50m 소총 복사(SH1) 결선', 'APC'))
    === '{"윗말":"2026 아이치·나고야 장애인아시아경기대회","큰말":"사격 혼성 50m 소총 복사(SH1) 결선"}');
  참('주체 이름 뒤에서 가른다',
    JSON.stringify(주제가르기('롯데 자이언츠 제22대 감독·신임 단장 선임', '롯데 자이언츠'))
    === '{"윗말":"롯데 자이언츠","큰말":"제22대 감독·신임 단장 선임"}');
  참('⛔ 못 가르면 통째로 큰말에 둔다',
    주제가르기('무슨무슨일', '어디어디').큰말 === '무슨무슨일');
  참('주제가 비면 없다고 한다', 주제가르기('', '어디') === null);
  /* 🔴 [2026-11-20] 연도 + 대회 약어 */
  참('연도와 대회 약어 뒤에서 가른다',
    JSON.stringify(주제가르기('2026 APBC 한국 대 호주 (개막전)', '일본야구기구(NPB) 2026 APBC 조직위원회'))
    === '{"윗말":"2026 APBC","큰말":"한국 대 호주 (개막전)"}');
  참('⛔ 대조군 — 약어가 아니면 그 규칙을 쓰지 않는다',
    주제가르기('2026 아이치·나고야 장애인아시아경기대회 사격 혼성 50m 소총 복사(SH1) 결선', 'APC').윗말
    === '2026 아이치·나고야 장애인아시아경기대회');
  참('사실 카드에 큰말이 들어간다',
    사실카드글({ 윗말: 'ㄱ', 큰말: 'ㄴㄷ', 아랫말: 'ㄹ', 색: '#000', 바닥: 'ㅁ' }).includes('>ㄴㄷ<'));

  /* 🔴 [2026-11-20 · 사장님] 축구 — 「왜 사진이 없나? 꼭 사진 찾아서 써」 */
  const 두팀f = 두팀읽기('하나은행 K리그1 2026 35라운드 대전 하나 시티즌 대 인천 유나이티드 (대전 월드컵경기장)');
  참('축구 두 팀을 적힌 차례로 집는다', JSON.stringify(두팀f) === '["대전 하나 시티즌","인천 유나이티드"]');
  참('축구도 제목 맨 앞의 팀이 이긴 팀이다',
    이긴팀('대전, 인천에 2대0 승리…유효슈팅 7개 중 2골', 두팀f, { 앞: 2, 뒤: 0 }) === '대전 하나 시티즌');
  참('축구는 kleague 종목이다', 종목찾기('FC서울') === 'kleague' && 종목찾기('강원FC') === 'kleague');
  참('⛔ 대조군 — 축구와 농구를 섞지 않는다', 종목찾기('서울 삼성') === 'kbl');
  참('K리그 구단 엠블럼이 모두 받아져 있다',
    Object.values(축구구단).every((t) => fs.existsSync(path.join(뿌리, 'public', 'brand', 'kleague', `${t.코드}.png`))));

  /* 🔴 무승부 — 이긴 쪽이 «없다» */
  const 두팀서강 = 두팀읽기('하나은행 K리그1 2026 33라운드 FC서울 대 강원FC');
  참('무승부면 이긴 쪽이 없다',
    이긴팀('슈팅은 강원이 더 많았다…FC서울, 1대1 무승부로 10년 만에 K리그1 우승 확정',
      두팀서강, { 앞: 1, 뒤: 1 }) === null);
  참('⛔ 대조군 — 점수를 안 넘기면 못 가린다(그래서 반드시 넘긴다)',
    이긴팀('슈팅은 강원이 더 많았다…FC서울, 1대1 무승부로 우승 확정', 두팀서강) !== null);

  /* 🔴 「패」 꼴 제목 — 맨 앞에 선 팀이 진 팀이다 */
  참('패배 꼴을 가려낸다', 진꼴인가('한국 축구, 사우디에 2대3 패…후반 11분부터 3분 사이 두 골 내줘'));
  참('⛔ 대조군 — 「…시리즈 1승 1패」는 패배 꼴이 아니다',
    진꼴인가('삼성, 플레이오프 2차전 KIA 8대3 제압…시리즈 1승 1패') === false);
  참('⛔ 대조군 — 「제패」는 이긴 것이다', 진꼴인가('삼성, 한국시리즈 제패') === false);
  참('⛔ 대조군 — 무승부는 패배 꼴이 아니다', 진꼴인가('FC서울, 1대1 무승부로 우승 확정') === false);
  const 두팀강전 = 두팀읽기('하나은행 K리그1 2026 강원FC 대 전북 현대 모터스 (강릉하이원아레나)');
  참('패배 꼴이면 맨 앞 팀이 진 팀이다',
    이긴팀('전북, 강원에 2대3 역전패', 두팀강전, { 앞: 2, 뒤: 3 }) === '강원FC');
  참('⛔ 대조군 — 같은 두 팀이라도 승리 꼴이면 맨 앞 팀이 이긴 팀이다',
    이긴팀('강원, 전북에 3대2 역전승', 두팀강전, { 앞: 3, 뒤: 2 }) === '강원FC');

  /* 🔴 [2026-11-20 · 사장님] 배구 — 「왜 사진이 없나? 꼭 사진 찾아서 써」 */
  const 두팀v = 두팀읽기('HK흥국금융 2026~2027 V-리그 여자부 정규리그 1라운드 IBK기업은행 대 정관장');
  참('배구 두 팀을 적힌 차례로 집는다', JSON.stringify(두팀v) === '["IBK기업은행","정관장"]');
  참('배구는 kovo 종목이다', 종목찾기('정관장') === 'kovo' && 종목찾기('흥국생명') === 'kovo');
  참('🔴 이름이 겹쳐도 농구 「안양 정관장」을 집는다 — 배구 「정관장」에 밀리지 않는다',
    JSON.stringify(두팀읽기('2026-2027 KBL 정규리그 서울 삼성 대 안양 정관장'))
    === '["서울 삼성","안양 정관장"]');
  참('⛔ 대조군 — 그 경기의 종목은 농구다', 종목찾기('안양 정관장') === 'kbl');
  참('배구 세트 점수를 집는다', JSON.stringify(점수읽기('정관장, IBK기업은행에 3대1')) === '{"앞":3,"뒤":1}');
  참('KOVO 엠블럼은 SVG 다', 엠블럼확장자('kovo') === 'svg');
  참('V-리그 여자부 구단 엠블럼이 모두 받아져 있다',
    Object.values(배구구단).every((t) => fs.existsSync(path.join(뿌리, 'public', 'brand', 'kovo', `${t.코드}.svg`))));

  console.log(`점수판 짓는 자 — 자가시험 ${통과} 통과 · ${실패} 실패`);
  return 실패 === 0;
}

/* ───────────────────────────── 본 일 ───────────────────────────── */
async function 한다() {
  const 글인자 = (process.argv.find((a) => a.startsWith('--글=')) || '').slice(4);
  const 적는다 = process.argv.includes('--적는다');
  if (!글인자) { console.error('⛔ 쓰는 법: node scripts/make-kcw-score-card.mjs --글=content/kcw-reviews/<파일>.md [--적는다]'); process.exit(1); }

  const 길 = path.isAbsolute(글인자) ? 글인자 : path.join(뿌리, 글인자);
  const 글 = fs.readFileSync(길, 'utf8');
  const 제목 = 머리값(글, 'title');
  const 명칭 = 머리값(글, '  명칭') ?? 머리값(글, '명칭');
  const 일시 = 머리값(글, '  일시') ?? 머리값(글, '일시');
  const 주체 = 머리값(글, '  주체') ?? 머리값(글, '주체');

  const 점수 = 점수읽기(제목);
  const 두팀 = 두팀읽기(명칭);
  const 낼곳 = path.join(뿌리, 'public', 'wikitip', 'review', `${path.basename(길, '.md')}.jpg`);

  /* 🔴 [2026-10-29 · 사장님] 「각 메뉴에도 썸네일 넣어」 — 경기가 아닌 글도 썸네일이 있어야 한다.
     점수가 없으면 점수판 대신 «사실 카드»를 짓는다. 억지로 점수판을 씌우지 않는다. */
  if (!점수 || !두팀) {
    const 가른것 = 주제가르기(명칭, 주체);
    if (!가른것) {
      console.log(`⬜ ${path.basename(길)} — 주제(명칭)가 없다. 그림을 짓지 않는다`);
      process.exit(0);
    }
    const 것 = {
      윗말: 가른것.윗말 || 주체 || 'K Culture Wire',
      큰말: 가른것.큰말,
      아랫말: 날짜글(일시),
      색: '#2b3a67',
      바닥: 'K Culture Wire · klifemap 계열',
    };
    console.log(`🟡 사실 카드 — «${것.윗말}» / «${것.큰말}»`);
    if (!적는다) { console.log('   --적는다 로 그린다'); process.exit(0); }
    await 그려서찍는다(사실카드글(것), 낼곳);
    console.log(`✅ ${path.relative(뿌리, 낼곳)} (${Math.round(fs.statSync(낼곳).size / 1024)}KB)`);
    console.log('   ⚠ 그린 것으로 끝이 아니다 — 열어서 눈으로 본다');
    process.exit(0);
  }
  const 이긴쪽 = 이긴팀(제목, 두팀, 점수);
  /* 제목은 「이긴 팀, … 진 팀 8대3」 차례다. 경기 표기 차례와 다를 수 있으니 맞춰 넣는다 */
  const 점수표 = new Map();
  if (이긴쪽) {
    점수표.set(이긴쪽, Math.max(점수.앞, 점수.뒤));
    점수표.set(두팀.find((n) => n !== 이긴쪽), Math.min(점수.앞, 점수.뒤));
  } else {
    점수표.set(두팀[0], 점수.앞); 점수표.set(두팀[1], 점수.뒤);
  }

  /* 두 팀이 같은 종목이어야 한다 — 야구 구단과 e스포츠 구단을 한 그림에 세우지 않는다 */
  const 종목키 = 종목찾기(두팀[0]);
  if (종목키 !== 종목찾기(두팀[1])) {
    console.log(`🔴 두 팀의 종목이 다르다 — ${두팀.join(' · ')}`);
    process.exit(1);
  }
  const 이종목 = 종목[종목키];
  const 엠블럼 = (이름) => path.join(뿌리, 'public', 'brand', 이종목.폴더, `${이종목.표[이름].코드}.${엠블럼확장자(종목키)}`);
  for (const n of 두팀) {
    if (!fs.existsSync(엠블럼(n))) {
      console.log(`🔴 ${n} 엠블럼이 없다 — ${엠블럼(n)}`);
      console.log(`   ${이종목.낸곳} 이 내는 파일만 받아 둔다. 다른 데서 받아 쓰지 않는다`);
      process.exit(1);
    }
  }

  const 것 = {
    왼: 두팀[0], 오: 두팀[1],
    점수왼: 점수표.get(두팀[0]), 점수오: 점수표.get(두팀[1]),
    이긴쪽,
    색왼: 이종목.표[두팀[0]].색, 색오: 이종목.표[두팀[1]].색,
    글자색왼: 이종목.표[두팀[0]].글자색, 글자색오: 이종목.표[두팀[1]].글자색,
    엠블럼높이: 이종목.엠블럼높이,
    /* ⛔ `file://` 주소로 넣지 않는다 — `setContent` 로 띄운 지면은 뿌리가 `about:blank` 라
       그 주소를 못 읽고 «엠블럼 자리가 빈 채로» 찍힌다(2026-10-29 에 그렇게 한 장 나왔다).
       ⇒ 파일을 그대로 글에 실어 보낸다. */
    엠블럼왼: 글로실은그림(엠블럼(두팀[0])),
    엠블럼오: 글로실은그림(엠블럼(두팀[1])),
    대회: 명칭.replace(/\s*삼성 라이온즈 대 KIA 타이거즈|\s*KIA 타이거즈 대 삼성 라이온즈/, '')
      .replace(new RegExp(`\\s*${두팀[0]} 대 ${두팀[1]}`), '').trim(),
    날짜: 날짜글(일시),
    바닥: `엠블럼 — ${이종목.낸곳} · 점수판 — K Culture Wire`,
  };

  console.log(`🟡 ${것.왼} ${것.점수왼} : ${것.점수오} ${것.오}  (이긴 쪽 ${이긴쪽 ?? '모름'})`);
  console.log(`   ${것.대회} · ${것.날짜}`);
  if (!적는다) { console.log('   --적는다 로 그린다'); process.exit(0); }

  await 그려서찍는다(그림글(것), 낼곳);
  console.log(`✅ ${path.relative(뿌리, 낼곳)} (${Math.round(fs.statSync(낼곳).size / 1024)}KB)`);
  console.log('   ⚠ 그린 것으로 끝이 아니다 — 열어서 눈으로 본다');
}

/** 글 한 장을 크롬에 띄워 그림으로 찍는다 — 글꼴이 확실하다 */
async function 그려서찍는다(글, 낼곳) {
  const require = createRequire('file:///C:/Users/User/Documents/GitHub/klifemap/package.json');
  const puppeteer = require('puppeteer-core');
  const b = await puppeteer.connect({ browserURL: (process.env.KLM_CHROME_PORT ? 'http://127.0.0.1:' + process.env.KLM_CHROME_PORT : 'http://127.0.0.1:9222'), defaultViewport: null });
  const p = await b.newPage();
  try {
    await p.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
    await p.setContent(글, { waitUntil: 'networkidle0', timeout: 60000 });
    await new Promise((r) => setTimeout(r, 400));
    await p.screenshot({ path: 낼곳, type: 'jpeg', quality: 92 });
  } finally {
    await p.close();
    b.disconnect();
  }
  /* ⛔ 「썼다」로 끝내지 않는다 — 0바이트도 쓰기는 쓴다 */
  const 크기 = fs.statSync(낼곳).size;
  if (크기 < 10000) { console.log(`🔴 그림이 너무 작다(${크기}바이트) — 제대로 안 그려졌다`); process.exit(1); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--selftest') || process.argv.includes('--자가시험')) {
    process.exit(자가시험() ? 0 : 1);
  } else {
    await 한다();
  }
}
