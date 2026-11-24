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

out.sort((a, b) => b.per - a.per);
const 칸 = ['분야', '언론사', '월기사(제외후)', '오피니언포함', '오피니언제외', '인사부음', '자동생성', '무기명', '대상기자', '1인당'];
console.log(칸.join('\t'));
for (const o of out) {
  console.log([o.cat, o.name, o.kept, o.오피니언포함, o.오피니언, o.인사부음, o.자동생성, o.무기명, o.대상기자, o.per].join('\t'));
}
if (out.length) {
  const avgKept = Math.round(out.reduce((s, o) => s + o.kept, 0) / out.length);
  const avgRep = Math.round(out.reduce((s, o) => s + o.대상기자, 0) / out.length);
  const avgPer = Math.round((out.reduce((s, o) => s + o.per, 0) / out.length) * 10) / 10;
  console.log(['전체', `${out.length}곳 평균`, avgKept, '', '', '', '', '', avgRep, avgPer].join('\t'));
  console.log(`기준값=${avgPer}건  →  감점 없는 상한(2배) = ${Math.round(avgPer * 2 * 10) / 10}건`);
}
