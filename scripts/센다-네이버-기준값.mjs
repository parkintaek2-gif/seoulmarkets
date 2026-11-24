import fs from 'fs';

/* 네이버 뉴스제휴 규정 제8조 제6항 <표.9> — 기자 1인당 기사 생산량 기준값을 낸다.
   제외  오피니언(기자명+메일이 없는 것) · 인사/부고/사고 · 자동생성 · 무기명
   포함  오피니언이라도 «기자명 + @ 메일»이 있으면 기사수에 넣는다
         (사장님 2026-11-24 — 「수정: 기자명+@ 있으면 가사수에 포함」
          「park@ 이거만 있어도 공식 메일 계정이야」)
   ⛔ KBS 는 집계에서 뺀다 (사장님 2026-11-24 — 「kbs집계는 아예 빼」)
   외부 기고자는 규정 (ㄹ)목대로 전부 합쳐 «1명»으로 센다 */
const NAME = {
  chosun: '조선일보', joongang: '중앙일보', donga: '동아일보', hankookilbo: '한국일보', khan: '경향신문',
  hani: '한겨레', segye: '세계일보', kmib: '국민일보', mk: '매일경제', hankyung: '한국경제',
  sedaily: '서울경제', heraldbiz: '헤럴드경제', asiae: '아시아경제', mt: '머니투데이', edaily: '이데일리',
  bizwatch: '비즈워치', mbc: 'MBC', sbs: 'SBS', dgmbc: '대구MBC', jmbc: '전주MBC',
  cjb: 'CJB청주방송', jibs: 'JIBS', ikbc: 'kbc광주방송', kado: '강원도민일보', kwnews: '강원일보',
  kyeonggi: '경기일보', kookje: '국제신문', daejonilbo: '대전일보', imaeil: '매일신문', busan: '부산일보',
};
const CAT = {
  chosun: '종합', joongang: '종합', donga: '종합', hankookilbo: '종합', khan: '종합', hani: '종합', segye: '종합', kmib: '종합',
  mk: '경제', hankyung: '경제', sedaily: '경제', heraldbiz: '경제', asiae: '경제', mt: '경제', edaily: '경제', bizwatch: '경제',
  mbc: '방송', sbs: '방송', dgmbc: '방송', jmbc: '방송', cjb: '방송', jibs: '방송', ikbc: '방송',
  kado: '지방', kwnews: '지방', kyeonggi: '지방', kookje: '지방', daejonilbo: '지방', imaeil: '지방', busan: '지방',
};

const OPINION = ['사설', '칼럼', '기고', '시론', '오피니언', '만평',
  '데스크', '논설', '시점', '숙어', '위크리컴', '기자수첩', '취재파일', '반론', '주장'];
/* 네이버 「인사/부고/사고」 — 중부매일 카테고리 인사·부음·결혼·오신손님·사람들·정정및반론이 여기로 간다 */
const NOTICE = ['인사', '부고', '부음', '동정', '알림', '공지', '결혼', '정정', '사람들', '오신손님'];
const AUTO = ['날씨', '날씨체크', '증시', '마감시세', '환율',
  '특징주', '주식시세', '표', '부동산시세', '오늘의운세'];

export function 머리(제목) {
  const m = String(제목 ?? '').match(/^\[([^\]]{1,14})\]/);
  return m ? m[1].replace(/\s+/g, '') : '';
}
/** 제목만으로 1차 갈래를 낸다 */
export function 갈래(제목) {
  const h = 머리(제목);
  if (h) {
    if (OPINION.some((k) => h.includes(k))) return 'opinion';
    if (NOTICE.some((k) => h === k || h.includes(k))) return 'notice';
    if (AUTO.some((k) => h.includes(k))) return 'auto';
  }
  return 'news';
}
/** 공식 메일 계정이 붙었나 — park@ 처럼 도메인이 생략돼도 공식 계정이다 */
export function 공식메일있나(메일들) {
  if (!Array.isArray(메일들)) return false;
  return 메일들.some((m) => /@/.test(String(m ?? '').trim()));
}
/** 한 줄을 셀 것인가 — 사장님 2026-11-24 규칙 */
export function 센다(제목, 이름들, 메일들) {
  if (!Array.isArray(이름들) || !이름들.length) return { 센다: false, 까닭: '무기명' };
  const k = 갈래(제목);
  if (k === 'notice') return { 센다: false, 까닭: '인사부음' };
  if (k === 'auto') return { 센다: false, 까닭: '자동생성' };
  if (k === 'opinion') {
    if (공식메일있나(메일들)) return { 센다: true, 까닭: '오피니언이지만 기자명+메일' };
    return { 센다: false, 까닭: '오피니언' };
  }
  return { 센다: true, 까닭: '기사' };
}

/* ── 자가시험 ─────────────────────────────────────────── */
export function 시험() {
  const r = [];
  const 본다 = (이름, 참) => r.push({ 이름, 참: !!참 });
  본다('머리표를 뗀다', 머리('[사설] 무엇') === '사설');
  본다('머리표가 없으면 빈 글자', 머리('그냥 제목') === '');
  본다('null 에 안 터진다', 머리(null) === '' && 갈래(null) === 'news');
  본다('사설은 오피니언', 갈래('[사설] 무엇') === 'opinion');
  본다('인사는 알림', 갈래('[인사] 중부매일') === 'notice');
  본다('오늘의운세는 자동생성', 갈래('[오늘의운세] 11월 25일') === 'auto');
  본다('보통 제목은 기사', 갈래('충북도 예산 1조') === 'news');
  본다('@ 하나면 공식 메일', 공식메일있나(['park@']));
  본다('도메인이 붙어도 공식 메일', 공식메일있나(['park@jbnews.com']));
  본다('@ 가 없으면 아니다', !공식메일있나(['park']) && !공식메일있나([]) && !공식메일있나(null));
  본다('⛔ 무기명은 안 센다', 센다('충북도 예산', [], ['a@b']).센다 === false);
  본다('⛔ 인사는 메일이 있어도 안 센다', 센다('[인사] 중부매일', ['홍길동'], ['a@b']).센다 === false);
  본다('⛔ 자동생성은 메일이 있어도 안 센다', 센다('[오늘의운세]', ['홍길동'], ['a@b']).센다 === false);
  본다('⭐ 오피니언 + 기자명 + @ 는 «센다»', 센다('[칼럼] 무엇', ['홍길동'], ['hong@jbnews.com']).센다 === true);
  본다('⛔ 오피니언인데 메일이 없으면 안 센다', 센다('[칼럼] 무엇', ['홍길동'], []).센다 === false);
  본다('보통 기사는 메일이 없어도 센다', 센다('충북도 예산', ['홍길동'], []).센다 === true);
  본다('⛔ KBS 는 집계에 없다', !Object.keys(NAME).includes('kbs'));
  본다('30곳이다', Object.keys(NAME).length === 30);
  본다('갈래표가 이름표와 같은 수', Object.keys(CAT).length === Object.keys(NAME).length);

  /* ── 🔴🔴 기준값 산출 (사장님 2026-11-25) ──────────────────────────
     「산술평균이면 39와 44중 39 아니니? 44는 평균의 평균이잖아」
     한 줄 안에서 계산 방식이 섞이면 읽는 사람이 바로 걸린다 */
  const 큰곳작은곳 = [{ kept: 100, 대상기자: 10 }, { kept: 100, 대상기자: 100 }];
  본다('기준값은 기사 합계 ÷ 기자 합계다 (기자 1명당)',
    기준값낸다(큰곳작은곳).가중 === 1.8);   /* 200 / 110 */
  본다('🔴 평균의 평균과 다르다 — 섞어 쓰면 안 된다',
    기준값낸다(큰곳작은곳).단순 === 5.5     /* (10 + 1) / 2 */
    && 기준값낸다(큰곳작은곳).가중 !== 기준값낸다(큰곳작은곳).단순);
  본다('평균의 평균은 기자가 적은 곳 쪽으로 끌려 올라간다',
    기준값낸다(큰곳작은곳).단순 > 기준값낸다(큰곳작은곳).가중);

  /* 🔴 [2026-11-25] 상한 칸이 보는 곳에 따라 78.1 과 78.2 두 수를 냈다.
     반올림한 39.1 을 두 배 하면 78.2, 원값 39.0662 를 두 배 하면 78.1 이다.
     ⛔ 틀린 숫자 하나가 옳은 스물셋을 같이 의심받게 한다 */
  const 실제 = 기준값낸다([{ kept: 151460, 대상기자: 3877 }]);
  본다('2026-09 실측 30곳 합계로 39.1 이 나온다', 실제.가중 === 39.1);
  본다('🔴 상한은 원값에서 두 배 한다 — 반올림한 값을 두 배 하면 78.2 가 된다',
    실제.상한 === 78.1);
  본다('중부매일 9월 61.2건은 2배 이하라 감점이 없다', 61.2 < 실제.상한);
  본다('기사 합계와 기자 합계를 그대로 돌려준다',
    실제.기사합 === 151460 && 실제.기자합 === 3877);
  본다('⛔ 못 내면 null — 0 이 아니다',
    기준값낸다([]) === null && 기준값낸다(null) === null
    && 기준값낸다([{ kept: 10, 대상기자: 0 }]) === null
    && 기준값낸다([{ kept: 10, 대상기자: '글자' }]) === null);
  본다('곳수를 센다', 기준값낸다(큰곳작은곳).곳수 === 2);

  return r;
}

if (process.argv.includes('--자가시험')) {
  const r = 시험();
  let 빨강 = 0;
  console.log('■ 기준값 집계 — 자가시험');
  for (const x of r) { if (!x.참) 빨강 += 1; console.log(`  ${x.참 ? '✅' : '🔴'} ${x.이름}`); }
  console.log(빨강 ? `🔴 실패 ${빨강}개` : `✅ ${r.length}가지 다 통과`);
  process.exit(빨강 ? 1 : 0);
}

/* ── 실제로 센다 ───────────────────────────────────────── */
const months = (process.argv[2] || '202609').split(',');
const out = [];
for (const key of Object.keys(NAME)) {
  const files = months.map((m) => `rows_${key}_${m}.tsv`).filter((f) => fs.existsSync(f));
  if (!files.length) continue;
  let total = 0;
  let kept = 0;
  const drop = { 오피니언: 0, 인사부음: 0, 자동생성: 0, 무기명: 0 };
  let 오피니언포함 = 0;
  const mails = new Map();
  const names = new Map();
  for (const f of files) {
    for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      const p = line.split('\t');
      if (p[1] === 'FAIL') continue;
      total += 1;
      const ns = (p[3] || '').split(',').filter(Boolean);
      const ms = (p[4] || '').split(',').filter(Boolean);
      const 판 = 센다(p[2] || '', ns, ms);
      if (!판.센다) { drop[판.까닭] += 1; continue; }
      if (판.까닭.startsWith('오피니언')) 오피니언포함 += 1;
      kept += 1;
      for (const n of ns) names.set(n, (names.get(n) || 0) + 1);
      for (const m of ms) mails.set(m, (mails.get(m) || 0) + 1);
    }
  }
  const 대상기자 = names.size;
  const perHead = 대상기자 ? kept / 대상기자 / months.length : 0;
  out.push({
    key, name: NAME[key], cat: CAT[key], total, kept: Math.round(kept / months.length),
    오피니언포함, ...drop, 대상기자, mails: mails.size,
    per: Math.round(perHead * 10) / 10,
  });
}

/**
 * 기준값을 낸다 — **두 방식을 모두 내고, 기준은 가중평균이다.**
 *
 * ── 🔴🔴 왜 (2026-11-25 · 사장님) ────────────────────────────────────
 * 사장님 — 「**산술평균이면 39와 44중 39 아니니? 44는 평균의 평균이잖아**」
 *
 * 앞 판은 1인당 기사수 30개를 더해 30으로 나눈 44.4 를 기준값이라 적었다.
 * 그런데 같은 요약 줄의 앞 두 칸(기사 평균 5,048.7 · 기자 평균 129.2)으로
 * 나누면 39.1 이 나온다. **한 줄 안에서 계산 방식이 섞여 있었다.**
 *
 * [무엇이 맞나] 네이버가 재는 것은 「기자 1인당」이므로 모집단은 기자 3,877명이다.
 *   ⇒ 기사 합계 ÷ 기자 합계 = 39.07 이 기준값이다.
 * [왜 44 가 부푸나] 언론사 30곳을 같은 비중으로 세기 때문이다 —
 *   기자 15명인 방송사와 275명인 중앙일보가 똑같이 한 표가 되어
 *   기자가 적은 곳(강원일보 56명 87.2건 · JIBS 19명 68.4건) 쪽으로 끌려 올라간다.
 *
 * ⚠ [측정하지 못한 것] 규정 원문에 산출식이 적혀 있지 않다. 저장소의 규정 문서에도
 *   E항목 배점 8점만 있고 산출식이 없다. 공식 원문도 확보하지 못했다.
 *   ⛔ 그래서 둘 다 낸다. 확인되지 않은 것을 확인된 것처럼 적지 않는다.
 *   ⇒ 판정에는 **낮은 쪽(가중평균)** 을 쓴다. 상한이 좁아 보수적이다.
 */
export function 기준값낸다(목록) {
  if (!Array.isArray(목록) || !목록.length) return null;   /* ⛔ 못 내면 null — 0 이 아니다 */
  let 기사 = 0; let 기자 = 0; let 인당합 = 0;
  for (const o of 목록) {
    const a = Number(o && o.kept); const b = Number(o && o.대상기자);
    if (!Number.isFinite(a) || !Number.isFinite(b) || b <= 0) return null;
    기사 += a; 기자 += b; 인당합 += a / b;
  }
  if (기자 <= 0) return null;
  const 반 = (x) => Math.round(x * 10) / 10;
  return {
    기사합: 기사,
    기자합: 기자,
    곳수: 목록.length,
    가중: 반(기사 / 기자),              /* 기자 1명당 — 이것이 기준값이다 */
    단순: 반(인당합 / 목록.length),     /* 평균의 평균 — 참고로만 적는다 */
    상한: 반((기사 / 기자) * 2),        /* ⚠ 반올림한 값을 두 배 하지 않는다 — 원값에서 두 배 한다 */
  };
}

out.sort((a, b) => b.per - a.per);
const 칸 = ['분야', '언론사', '월기사(제외후)', '오피니언포함', '오피니언제외', '인사부음', '자동생성', '무기명', '대상기자', '1인당'];
console.log(칸.join('\t'));
for (const o of out) {
  console.log([o.cat, o.name, o.kept, o.오피니언포함, o.오피니언, o.인사부음, o.자동생성, o.무기명, o.대상기자, o.per].join('\t'));
}
if (out.length) {
  const avgKept = Math.round(out.reduce((s, o) => s + o.kept, 0) / out.length);
  const avgRep = Math.round(out.reduce((s, o) => s + o.대상기자, 0) / out.length);
  const 값 = 기준값낸다(out);
  if (!값) {
    /* ⛔ 「못 냈다」와 「0」을 가른다 */
    console.log('⚠ 기준값을 내지 못했다 — 기자수가 0이거나 수가 아닌 줄이 있다');
  } else {
    /* 🔴 요약 줄의 셋째 칸은 **그 줄의 앞 두 칸으로 나눈 값**이어야 한다.
       앞 판은 여기만 1인당의 단순평균을 넣어 39 자리에 44 가 들어갔다 */
    console.log(['전체', `${out.length}곳 평균`, avgKept, '', '', '', '', '', avgRep, 값.가중].join('\t'));
    console.log(`기준값=${값.가중}건 (기사 합계 ${값.기사합.toLocaleString()} ÷ 기자 합계 ${값.기자합.toLocaleString()})`
      + `  →  감점 없는 상한(2배) = ${값.상한}건`);
    console.log(`참고: 1인당 ${값.곳수}개의 단순평균(평균의 평균) = ${값.단순}건 → 2배 ${Math.round(값.단순 * 2 * 10) / 10}건`);
    console.log('⚠ 규정 원문에 산출식이 없다. 판정에는 낮은 쪽인 가중평균을 쓴다');
  }
}
