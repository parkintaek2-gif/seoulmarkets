#!/usr/bin/env node
/**
 * 잰다-네이버에-빈자리가-있나.mjs
 * 「지역 이름 + 질문」 축마다 네이버 첫 화면에 **센 경쟁자가 있나**를 잰다.
 *
 * ── 왜 만드나 (2026-11-09 · 5번) ────────────────────────────────────
 * 사장님 — 「각 사이트마다 순방문자를 빨리 1,000명을 만들어」
 *          「모든 방법을 다 써. 1명이라도 오는 통로가 되면 다 해. 당장 해」
 *
 * 백년지도는 지역 리포트 258장으로 28일에 1,844명을 네이버에서 받는다.
 * 네 사이트 가운데 **유일하게 도는 길**이다. 그 길을 넓히려면 축을 늘려야 하는데,
 * 아무 축이나 늘리면 안 된다 — KLifeMap 이 60갑자 61장을 내고 0명을 받았다.
 *
 * ── 오늘 재서 안 것 ─────────────────────────────────────────────────
 * ```
 * 「의정부시 인구」      나무위키 · 위키백과 · 블로그    ← 센 경쟁자가 있다. 못 뚫는다
 * 「의정부시 고령화」    블로그뿐                      ← 비어 있다
 * 「진주시 출산율」      블로그뿐                      ← 비어 있다
 * 「성북구 1인 가구」    블로그뿐                      ← 비어 있다
 * 「의정부시 고등학교 진학률」  우리가 첫 화면에 있다     ← 이미 먹히는 축
 * ```
 * ⭐ **수요가 큰 말일수록 나무위키가 먼저 와 있다.** 우리가 이길 자리는
 *   「나무위키·위키백과가 안 다루는 **구체적인 통계**」다. 그것이 우리가 가진 것이다.
 *
 * ⛔ 이 자는 「검색량」을 재지 않는다. 검색량은 네이버 검색광고 키워드도구가 준다.
 *   여기서 재는 것은 **「자리가 비어 있나」** 하나뿐이다. 둘을 섞어 읽지 않는다.
 * ⛔ 네이버가 막으면 「비어 있다」가 아니라 **「측정하지 못했다」**로 적는다.
 *   막힌 것과 빈 것을 섞으면 비어 있지도 않은 축에 수백 장을 만들게 된다.
 *
 * 쓰는 법
 *   node scripts/잰다-네이버에-빈자리가-있나.mjs --자체검사
 *   node scripts/잰다-네이버에-빈자리가-있나.mjs                 (기본 축 · 기본 지역)
 *   node scripts/잰다-네이버에-빈자리가-있나.mjs --지역수 6
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** 센 경쟁자 — 이들이 첫 화면에 있으면 우리가 비집고 들어가기 어렵다 */
export const 센경쟁자 = ['namu.wiki', 'ko.wikipedia.org', 'en.wikipedia.org', 'terms.naver.com'];

/** 약한 경쟁자 — 있어도 우리가 들어갈 자리가 남는다(블로그는 통계 한 장을 못 당한다) */
export const 약한경쟁자 = ['blog.naver.com', 'in.naver.com', 'post.naver.com', 'tistory.com', 'brunch.co.kr'];

/** 잴 지역 — 백년지도에 실제 화면이 있는 곳 가운데 손님이 많이 오는 순서 */
export const 기본지역 = [
  '의정부시', '부평구', '경산시', '진주시', '미추홀구', '경주시',
  '중랑구', '성북구', '유성구', '해운대구',
];

/**
 * 잴 축 — 백년지도가 0~100세 지도로 «실제로 자료를 쥔» 것만 적는다.
 * ⛔ 날씨·맛집·보건소처럼 우리 자료가 아닌 것은 넣지 않는다. 수요가 커도 낼 것이 없다.
 */
export const 기본축 = [
  '고등학교 진학률',   /* 이미 먹히는 축 — 대조군이다 */
  '인구',             /* 수요는 큰데 나무위키가 잡고 있다 — 대조군이다 */
  '고령화', '출산율', '1인 가구', '혼인 나이', '기대수명',
  '학원 수', '중학교 학업중단', '대학 진학률', '초등학교 학급당 학생',
  '평균 연봉', '첫 취업 나이', '자영업 비율', '실업률',
  '전세 가격', '자가 비율', '아파트 평균 가격',
  '노인 일자리', '요양시설', '독거노인', '어린이집',
  '특성화고 취업률', '사교육비', '청년 인구',
];

/** 검색 결과 글에서 누가 있나 */
export function 누가있나(글, { 우리집 = '100yearmap.com' } = {}) {
  if (typeof 글 !== 'string' || 글.length < 500) return null;   /* 🔴 막힌 것이다 */
  const 센것 = 센경쟁자.filter((h) => 글.includes(h));
  const 약한것 = 약한경쟁자.filter((h) => 글.includes(h));
  return { 센것, 약한것, 우리: 글.includes(우리집) };
}

/** 그 축이 비어 있나 — 「센 경쟁자가 없다」가 비어 있다는 뜻이다 */
export function 비었나(본것) {
  if (본것 === null) return null;          /* ⛔ 측정하지 못한 것을 「비었다」로 읽지 않는다 */
  return 본것.센것.length === 0;
}

async function 받는다(말) {
  const u = 'https://search.naver.com/search.naver?query=' + encodeURIComponent(말);
  try {
    const r = await fetch(u, { headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
        + '(KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36',
      'accept-language': 'ko-KR,ko;q=0.9',
    } });
    if (!r.ok) return null;
    return await r.text();
  } catch { return null; }
}

/** 축 하나를 지역 여러 곳에서 재서 묶는다 */
export async function 축을잰다(축, 지역들) {
  const 줄 = [];
  for (const 지 of 지역들) {
    const 본것 = 누가있나(await 받는다(`${지} ${축}`));
    줄.push({ 지역: 지, ...(본것 ?? {}), 측정못함: 본것 === null, 비었나: 비었나(본것) });
    await new Promise((f) => setTimeout(f, 1300));
  }
  const 잰것 = 줄.filter((x) => !x.측정못함);
  return {
    축,
    잰곳: 잰것.length,
    못잰곳: 줄.length - 잰것.length,
    빈곳: 잰것.filter((x) => x.비었나).length,
    우리있는곳: 잰것.filter((x) => x.우리).length,
    센것: [...new Set(잰것.flatMap((x) => x.센것 ?? []))],
  };
}

/* ── 자체 검사 ──────────────────────────────────────────────────────── */
export function 자체검사() {
  const 항목 = [];
  const 검 = (이름, 결과) => 항목.push({ 이름, 결과: !!결과 });
  const 긴글 = (s) => s + ' '.repeat(600);

  검('나무위키가 있으면 센 경쟁자로 센다',
    누가있나(긴글('… namu.wiki …')).센것.includes('namu.wiki'));
  검('블로그만 있으면 약한 경쟁자뿐이다',
    누가있나(긴글('… blog.naver.com …')).센것.length === 0);
  검('🔴 센 경쟁자가 없으면 «비어 있다»', 비었나(누가있나(긴글('… blog.naver.com …'))) === true);
  검('🔴 나무위키가 있으면 비어 있지 «않다»', 비었나(누가있나(긴글('… namu.wiki …'))) === false);
  검('우리가 있으면 알아본다', 누가있나(긴글('… 100yearmap.com …')).우리 === true);

  /* 🔴 막힌 것과 빈 것을 가른다 — 섞으면 비지도 않은 축에 수백 장을 만든다 */
  검('🔴 글이 짧으면 «측정하지 못했다»다 — null 이다', 누가있나('짧다') === null);
  검('🔴 글이 없으면 «측정하지 못했다»다', 누가있나(null) === null);
  검('🔴 측정하지 못한 것을 «비었다»로 읽지 않는다', 비었나(null) === null);

  검('축 목록에 대조군 둘이 들어 있다',
    기본축.includes('고등학교 진학률') && 기본축.includes('인구'));
  검('축이 스무 개가 넘는다', 기본축.length >= 20);
  검('지역이 열 곳이다', 기본지역.length === 10);
  검('⛔ 우리 자료가 아닌 축은 안 넣는다 — 날씨·맛집·보건소',
    !기본축.some((x) => ['날씨', '맛집', '보건소', '지도'].includes(x)));

  const 실패 = 항목.filter((x) => !x.결과);
  console.log(`■ 잰다-네이버에-빈자리가-있나 자체 검사 ${항목.length - 실패.length}/${항목.length}`);
  for (const x of 항목) console.log(`  ${x.결과 ? '통과' : '실패'}  ${x.이름}`);
  return 실패.length === 0;
}

/* ── 실행부 ─────────────────────────────────────────────────────────── */
const 직접실행 = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (직접실행) {
  if (process.argv.includes('--자체검사')) process.exit(자체검사() ? 0 : 1);

  const i = process.argv.indexOf('--지역수');
  const 몇곳 = i >= 0 ? Math.max(1, Number(process.argv[i + 1]) || 4) : 4;
  const 지역들 = 기본지역.slice(0, 몇곳);

  console.log(`■ 네이버 첫 화면에 빈자리가 있나 — 축 ${기본축.length}개 × 지역 ${지역들.length}곳`);
  console.log(`   지역: ${지역들.join(' · ')}`);
  console.log('   ⚠ 이것은 «검색량»이 아니다. 자리가 비어 있나만 잰다.\n');

  const 결과 = [];
  for (const 축 of 기본축) {
    const r = await 축을잰다(축, 지역들);
    결과.push(r);
    const 표 = r.못잰곳 === r.잰곳 + r.못잰곳 ? '⬜ 측정하지 못했다'
      : r.우리있는곳 ? `✅ 우리가 ${r.우리있는곳}곳에 있다`
        : r.빈곳 === r.잰곳 ? '🟢 비어 있다'
          : r.빈곳 === 0 ? '🔴 센 경쟁자가 다 잡고 있다' : `🟡 ${r.빈곳}/${r.잰곳}곳이 비어 있다`;
    console.log(`${표.padEnd(22)} ${축.padEnd(16)} ${r.센것.join(' · ')}${r.못잰곳 ? `  (못 잰 곳 ${r.못잰곳})` : ''}`);
  }

  console.log('\n■ 먼저 만들 축 — 빈 곳이 많은 순서');
  for (const r of [...결과].filter((x) => x.잰곳 && !x.우리있는곳)
    .sort((a, b) => (b.빈곳 / b.잰곳) - (a.빈곳 / a.잰곳)).slice(0, 10)) {
    console.log(`   ${String(r.빈곳).padStart(2)}/${r.잰곳}곳 비었다   ${r.축}`);
  }
  console.log('\n⭐ 빈 축이라고 바로 수백 장을 만들지 않는다. 다섯 축으로 먼저 만들고');
  console.log('   2주 뒤 네이버에서 눌러 보고, 걸리는 것이 확인되면 넓힌다.');
}
