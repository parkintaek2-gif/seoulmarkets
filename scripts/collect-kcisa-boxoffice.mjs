/**
 * 영화진흥위원회 박스오피스 — 문화공공데이터광장 오픈API 에서 받아 아카이브한다.
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔴 [2026-09-04] 사장님이 서비스키를 주셔서 열렸다. 실제로 불러 확인한 것 —
 *   resultCode 0000 · totalCount 190,977
 *   첫 쪽 regDate 2020-01-03  →  마지막 쪽 2026-09-04 02:13   ← «매일 자란다»
 *
 * ⚠ 그냥 쓰면 틀리는 것 넷. 다 밟아 보고 적는다.
 *   1. 키는 «자료마다 다르다». 401 을 「키가 틀렸다」로 읽지 않는다 — 그 자료의 키가 아닌 것이다
 *   2. **numOfRows=1 은 504 를 돌려준다.** 5부터 200 이 온다.
 *      504 를 인증 실패로 읽지 않는다 — 인증은 통과하고 뒤가 늦은 것이다
 *   3. 주소가 자료마다 다르다. openapiView.do?id=203&gubun=A 의 「기본정보 URL」이 정본이다
 *   4. 자료 번호를 «목록 순서»로 짐작하지 않는다 (id 630 을 공유마당이라 부를 뻔했다)
 *
 * ⚠ 수는 description 안에 «문장»으로 들어 있다 —
 *   「매출액 : 104500 관객수 : 16 스크린수5 상영횟수5」
 *   ⛔ 띄어쓰기가 칸마다 다르다(「관객수 : 16」 vs 「스크린수5」). 하나의 꼴로 짜면 반이 빈다.
 */
import fs from 'node:fs';
import path from 'node:path';

export const 주소 = 'https://api.kcisa.kr/openapi/service/rest/meta5/getKFCC0502';
export const 자료번호 = 203;

/** ⛔ 1 은 504 를 부른다. 이 값 아래로 내리지 않는다 */
export const 한쪽에 = 100;

export function 키읽기(뿌리 = process.cwd()) {
  const p = path.join(뿌리, '.env');
  if (!fs.existsSync(p)) return null;
  const m = fs.readFileSync(p, 'utf8').match(/^KCISA_BOXOFFICE_KEY=(.+)$/m);
  return m ? m[1].trim() : null;
}

/**
 * 「매출액 : 104500 관객수 : 16 스크린수5 상영횟수5」에서 수 넷을 뽑는다.
 * ⚠ 콜론과 빈칸이 «있을 때도 없을 때도» 있다. 없는 값은 null 로 둔다 — 
 */
export function 설명풀기(글) {
  const s = String(글 || '').replace(/\s+/g, ' ');
  const 집기 = (이름) => {
    const m = s.match(new RegExp(이름 + '\\s*:?\\s*([0-9][0-9,]*)'));
    return m ? Number(m[1].replace(/,/g, '')) : null;
  };
  return {
    매출액: 집기('매출액'),
    관객수: 집기('관객수'),
    스크린수: 집기('스크린수'),
    상영횟수: 집기('상영횟수'),
  };
}

/** 한 응답에서 항목들을 뽑는다 */
export function 항목뽑기(xml) {
  const 것들 = [];
  for (const m of String(xml).matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const 몸 = m[1];
    const 값 = (이름) => {
      const x = 몸.match(new RegExp('<' + 이름 + '>([\\s\\S]*?)</' + 이름 + '>'));
      return x ? x[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : null;
    };
    const 제목 = 값('title');
    if (!제목) continue;
    것들.push({
      제목,
      등록시각: 값('regDate'),
      갈래: 값('collectionDb'),
      원문: 값('url'),
      설명: 값('description'),
      ...설명풀기(값('description')),
    });
  }
  return 것들;
}

export function 총건수(xml) {
  const m = String(xml).match(/<totalCount>\s*([0-9]+)\s*</);
  return m ? Number(m[1]) : null;
}

export function 결과코드(xml) {
  const m = String(xml).match(/<resultCode>\s*([^<]*?)\s*</);
  return m ? m[1] : null;
}

export function 오늘딱지(d = new Date()) {
  /* ⚠ toISOString 을 쓰지 않는다 — UTC 라 새벽에 하루가 어긋난다 */
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export async function 받기(키, 쪽, 개수 = 한쪽에, 다시 = 4) {
  for (let i = 0; i < 다시; i += 1) {
    try {
      const r = await fetch(`${주소}?serviceKey=${encodeURIComponent(키)}&numOfRows=${개수}&pageNo=${쪽}`,
        { signal: AbortSignal.timeout(90000) });
      const t = await r.text();
      /* 🔴 504 는 «인증을 통과한 뒤» 뒤쪽이 늦은 것이다. 다시 청한다 */
      if (r.status === 504) { await new Promise((f) => setTimeout(f, 3000 * (i + 1))); continue; }
      if (r.status === 401) return { 오류: '이 자료의 키가 아니다 (401)', 글: t.slice(0, 120) };
      if (!r.ok) { await new Promise((f) => setTimeout(f, 2000 * (i + 1))); continue; }
      return { 글: t };
    } catch { await new Promise((f) => setTimeout(f, 2500 * (i + 1))); }
  }
  return { 오류: '여러 번 청해도 못 받았다' };
}

/* ── 자가시험 ─────────────────────────────────────────────────────────────── */
export function 재기() {
  const 참 = []; const 거 = [];
  const 봄 = (이름, 값) => (값 ? 참 : 거).push(이름);

  const a = 설명풀기('매출액 : 104500 관객수 : 16 스크린수5 상영횟수5');
  봄('콜론이 있는 칸을 읽는다', a.매출액 === 104500 && a.관객수 === 16);
  봄('🔴 콜론이 «없는» 칸도 읽는다 (꼴이 칸마다 다르다)', a.스크린수 === 5 && a.상영횟수 === 5);

  const b = 설명풀기('매출액 : 17,039,900 관객수 : 1,976 스크린수57 상영횟수67');
  봄('쉼표가 든 수를 읽는다', b.매출액 === 17039900 && b.관객수 === 1976);

  const c = 설명풀기('매출액 : 1000');
  봄('없는 값은 null 로 둔다 ()', c.관객수 === null && c.스크린수 === null);
  봄('빈 설명이면 넷 다 null', Object.values(설명풀기('')).every((v) => v === null));
  봄('설명이 없어도 죽지 않는다', Object.values(설명풀기(null)).every((v) => v === null));

  const xml = '<response><header><resultCode>0000</resultCode></header><body><totalCount>190977</totalCount>'
    + '<items><item><title>시인 할매</title><regDate>2020-01-03 21:52:25</regDate>'
    + '<collectionDb>박스오피스</collectionDb><url>http://kobis.or.kr/x</url>'
    + '<description>매출액 : 104500 관객수 : 16 스크린수5 상영횟수5</description></item></items></body></response>';
  const it = 항목뽑기(xml);
  봄('한 항목을 뽑는다', it.length === 1 && it[0].제목 === '시인 할매');
  봄('항목 안의 수까지 풀어 담는다', !!it[0] && it[0].관객수 === 16 && it[0].스크린수 === 5);
  봄('총건수를 읽는다', 총건수(xml) === 190977);
  봄('결과코드를 읽는다', 결과코드(xml) === '0000');
  봄('총건수가 없으면 null', 총건수('<a/>') === null);
  봄('빈 응답에서 항목을 지어내지 않는다', 항목뽑기('').length === 0);
  봄('제목이 없는 항목은 담지 않는다', 항목뽑기('<item><regDate>x</regDate></item>').length === 0);
  봄('CDATA 를 벗긴다', 항목뽑기('<item><title><![CDATA[가버나움]]></title></item>')[0].제목 === '가버나움');

  봄('⛔ 한쪽에 를 1 로 두지 않는다 (504 를 부른다)', 한쪽에 >= 5);
  봄('새벽 2시에도 날짜가 안 어긋난다', 오늘딱지(new Date(2026, 0, 1, 2, 30)) === '2026-01-01');
  return { 참: 참.length, 거: 거.length, 틀린것: 거 };
}

const 나인가 = import.meta.url.endsWith(encodeURI(path.basename(String(process.argv[1] || 'x'))));
if (나인가) {
  const r = 재기();
  if (process.argv.includes('--재기')) {
    console.log(`자가시험 ${r.참}/${r.참 + r.거}`);
    if (r.거) { console.log('🔴 틀린 것:'); r.틀린것.forEach((x) => console.log('   · ' + x)); process.exit(1); }
    process.exit(0);
  }
  if (r.거) { console.log(`🔴 자가시험 ${r.거}가지 깨졌다 — 멈춘다`); r.틀린것.forEach((x) => console.log('   · ' + x)); process.exit(1); }
  console.log(`자가시험 ${r.참}/${r.참}\n`);

  const 키 = 키읽기();
  if (!키) { console.log('🔴 .env 에 KCISA_BOXOFFICE_KEY 가 없다'); process.exit(1); }

  const 첫 = await 받기(키, 1);
  if (첫.오류) { console.log('🔴 ' + 첫.오류, 첫.글 || ''); process.exit(1); }
  const 총 = 총건수(첫.글);
  const 코드 = 결과코드(첫.글);
  console.log(`  응답 code=${코드} · 총 ${총 == null ? '못 쟀다' : 총.toLocaleString()}건`);
  if (코드 !== '0000') { console.log('🔴 결과코드가 0000 이 아니다 — 멈춘다'); process.exit(1); }

  const 최대쪽 = Number((process.argv.find((a) => a.startsWith('--pages=')) || '').split('=')[1] || 0)
    || Math.ceil((총 || 0) / 한쪽에);
  const 방 = path.join(process.cwd(), 'archive', 'raw', 'kcisa-boxoffice', 오늘딱지());
  fs.mkdirSync(방, { recursive: true });

  const 본것 = new Map();
  let 못받은쪽 = 0;
  for (let p = 1; p <= 최대쪽; p += 1) {
    const res = p === 1 ? 첫 : await 받기(키, p);
    if (res.오류) { 못받은쪽 += 1; continue; }
    for (const x of 항목뽑기(res.글)) {
      const 열쇠 = `${x.제목}|${x.등록시각}|${x.매출액}|${x.관객수}`;
      if (!본것.has(열쇠)) 본것.set(열쇠, x);
    }
    if (p % 50 === 0) process.stdout.write(`    …${p}/${최대쪽}쪽 · ${본것.size}행\n`);
  }
  const 것들 = [...본것.values()];
  const 날들 = 것들.map((x) => (x.등록시각 || '').slice(0, 10)).filter(Boolean).sort();
  fs.writeFileSync(path.join(방, 'boxoffice.json'), JSON.stringify({
    자료: '영화진흥위원회_박스오피스', 자료번호, 주소,
    총건수: 총, 받은건수: 것들.length, 못받은쪽,
    가장이른날: 날들[0] || null, 가장늦은날: 날들[날들.length - 1] || null,
    잰때: new Date().toLocaleString('ko-KR'), 항목: 것들,
  }, null, 1), 'utf8');
  console.log(`\n  받은 ${것들.length.toLocaleString()}행 · 못 받은 쪽 ${못받은쪽}`);
  console.log(`  날짜 ${날들[0] || '?'} ~ ${날들[날들.length - 1] || '?'}`);
  console.log(`\n저장 ${방}`);
}
