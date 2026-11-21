#!/usr/bin/env node
/**
 * K-브랜드지수(아시아브랜드연구소, kbrandindex.co.kr) — KCW(K컬처) 축 보조 자료.
 *
 *   node scripts/collect-kcw-brand-index.mjs
 *   node scripts/collect-kcw-brand-index.mjs --자가시험
 *
 * ── 사장님 지시(2026-10-06) ────────────────────────────────────
 *   「케이컬쳐 참조해서 봐. 특히 데이터를 정기적으로 갖고 잇을 수 있는 지 확인하라고 해」
 *   (5번 → 1번 09:35 업무지시를 본떠 지었다. `scripts/collect-kcw-star-ranking.mjs`가 본이다)
 *
 * ── 무엇인가 ───────────────────────────────────────────────────
 * 아시아브랜드연구소가 부문(화장품·걸그룹·지자체장·증권사 등)마다 한 달 치 온라인
 * 빅데이터를 분석해 기사 하나로 TOP10(간혹 그 이상)을 발표한다. 기사는 `/newslist/`
 * 목록에 쌓이고 각 기사는 `/article/<id>` 다.
 *
 * ── ⚠ 라이선스 — robots.txt 를 정확히 읽는다 ─────────────────────
 * `curl -s https://www.kbrandindex.co.kr/robots.txt` — `User-agent: *` 그룹은
 * **`Allow:/`** 다. 막힌 것은 `/_libs/ /imgdb/ /manager/ /mypage/ /mynews/` 뿐이고
 * 이 수집기가 쓰는 `/newslist/` 와 `/article/` 은 둘 다 허용이다. `/imgdb/`(사진)는
 * 건드리지 않는다 — 이 수집기는 글자만 받는다.
 *
 * ── 🔴 지수 «점수»는 기사에 없다 ──────────────────────────────────
 * 기사는 순위(1~N위)만 적고 "개별 인덱스 정보와 세부 분석 자료는 공식 홈페이지와
 * 인스타그램에서 확인할 수 있다"고만 한다. 그래서 이 수집기가 담는 값은 **순위뿐**이다.
 * 점수 칸은 0 으로 채우지 않고 `점수: null, 점수없음: true` 로 명시한다
 * (사장님 강령 — "못 잰 것은 못 쟀다고 적는다").
 *
 * ── ⚠ 이 수도 «우리가 잰 값»이 아니다 ─────────────────────────────
 * 아시아브랜드연구소가 «가중치 배제 기준»(산출식 비공개)으로 낸 합산 순위다.
 *   ✅ 「아시아브랜드연구소가 이렇게 발표했다」는 사실로만 적는다
 *   ⛔ 「OOO가 1위다」를 우리 판정인 양 기사 제목으로 쓰지 않는다
 *   ⛔ 산출식이 공개되지 않았다는 한계를 기사에 같이 적는다
 *
 * ── 쪽을 몰아 받지 않는다 ─────────────────────────────────────────
 * `/newslist/?pagenum=1`(최신 ~21건) 한 쪽만 본다 — 과거 쪽을 훑지 않는다.
 * 그 중에서도 `archive/raw/kcw-brand-index/본-기사.json`에 없는, «새 기사»만
 * 본문을 받는다(요청 사이 `딜레이`만큼 쉰다). 한 번에 받는 기사 수는 `최대신규`로 막는다.
 */
import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { 오늘 } from './_kst.mjs';

export const 목록주소 = 'https://www.kbrandindex.co.kr/newslist/?pagenum=1';
export const 기사주소 = (id) => `https://www.kbrandindex.co.kr/article/${id}`;
export const UA = 'SeoulMarketsBot/0.1 (https://kculturewire.com/about)';
export const OUT = path.resolve('archive/raw/kcw-brand-index');
export const 본기사파일 = path.join(OUT, '본-기사.json');
export const 최대신규 = 10;
export const 딜레이ms = 800;

const 쉰다 = (ms) => new Promise((r) => setTimeout(r, ms));

/** 목록 지면에서 기사 id·제목·발행일(썸네일 경로의 날짜)을 뽑는다 */
export function 목록파싱(html) {
  const 결과 = [];
  const 본 = new Set();
  const re = /<a href="\/article\/(\d+)"[^>]*>([^<]+)<\/a>/g;
  let m;
  while ((m = re.exec(html))) {
    const [, id, 제목] = m;
    if (본.has(id)) continue;
    본.add(id);
    const 날짜m = html.slice(Math.max(0, m.index - 400), m.index).match(
      /\/news\/data\/(\d{4})\/(\d{2})\/(\d{2})\/p(\d+)_/g,
    );
    let 발행일 = null;
    if (날짜m) {
      const 맞는것 = 날짜m.reverse().find((s) => s.includes(`p${id}_`));
      const dm = (맞는것 || 날짜m[0]).match(/(\d{4})\/(\d{2})\/(\d{2})/);
      if (dm) 발행일 = `${dm[1]}-${dm[2]}-${dm[3]}`;
    }
    결과.push({ id, 제목: 제목.trim(), 발행일 });
  }
  return 결과;
}

/** 「1,234」·「935만 1948」 → 숫자. 못 읽으면 null () */
export function 큰수(s) {
  if (!s) return null;
  const 억 = s.match(/^([\d,]+)억\s*([\d,]*)만?\s*([\d,]*)/);
  if (억) {
    const a = Number(억[1].replace(/,/g, '')) * 1e8;
    const b = 억[2] ? Number(억[2].replace(/,/g, '')) * 1e4 : 0;
    const c = 억[3] ? Number(억[3].replace(/,/g, '')) : 0;
    return a + b + c;
  }
  const 만 = s.match(/^([\d,]+)만\s*([\d,]*)/);
  if (만) {
    const 앞 = Number(만[1].replace(/,/g, '')) * 10000;
    const 뒤 = 만[2] ? Number(만[2].replace(/,/g, '')) : 0;
    return 앞 + 뒤;
  }
  const n = Number(s.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

/** 본문 하나를 파싱한다 — 부문·조사기간·빅데이터 건수·1~10위 */
export function 기사파싱(html) {
  const 본문m = html.match(/<div class="viewConts"[^>]*>([\s\S]*?)<\/div>\s*(?:<figure|<script|$)/);
  const 본문 = 본문m ? 본문m[1] : html;

  const 부문m = html.match(/K-브랜드지수['’]?\s*([^'’]+?)\s*부문\s*1위/);
  const 부문 = 부문m ? 부문m[1].trim() : null;

  const 기간m = 본문.match(/(\d{4}년\s*\d{1,2}월\s*\d{1,2}일부터\s*\d{1,2}월\s*\d{1,2}일까지)/);
  const 조사기간 = 기간m ? 기간m[1].replace(/\s+/g, ' ') : null;

  const 건수m = 본문.match(/온라인\s*빅데이터\s*([\d,]+억\s*[\d,]*만?\s*[\d,]*|[\d,]+만\s*[\d,]*|[\d,]+)\s*건/);
  const 빅데이터건수 = 건수m ? 큰수(건수m[1]) : null;

  // 이름 뒤에 영문 표기가 괄호로 붙는 경우("리센느(RESCENE)")가 있다 — 그 괄호까지 이름의 일부로 본다
  const 이름토큰 = `[가-힣A-Za-z0-9·&]+(?:\\s[가-힣A-Za-z0-9·&]+){0,1}(?:\\([A-Za-z0-9&\\s]{1,20}\\))?`;

  const 순위 = [];
  // 1위 — 기사마다 말투가 셋 갈린다: "OOO가 1위를 차지" · "1위에 OOO가 선정" · "1위 OOO에 이어"
  const 일위패턴들 = [
    new RegExp(`부문은\\s+(${이름토큰})(?:이|가)\\s*1위를\\s*차지`),
    new RegExp(`부문\\s*1위에\\s+(${이름토큰})(?:이|가)\\s*선정`),
    new RegExp(`부문은\\s*1위\\s+(${이름토큰})(?:에\\s*이어|[,，])`),
  ];
  for (const re of 일위패턴들) {
    const m = 본문.match(re);
    if (m) { 순위.push({ 순위: 1, 이름: m[1].trim() }); break; }
  }
  // 2위 이후 — "이름(N위)" 꼴과 "N위 이름" 꼴을 둘 다 긁는다(부문마다 말투가 다르다)
  const 패턴들 = [
    new RegExp(`(${이름토큰})\\((\\d+)위\\)`, 'g'),
    new RegExp(`(\\d{1,2})위\\s+(${이름토큰})`, 'g'),
  ];
  패턴들.forEach((re, i) => {
    let m;
    while ((m = re.exec(본문))) {
      const [이름, 순] = i === 0 ? [m[1], Number(m[2])] : [m[2], Number(m[1])];
      if (순 < 1 || 순 > 99 || 순위.some((x) => x.순위 === 순)) continue;
      순위.push({ 순위: 순, 이름: 이름.trim() });
    }
  });
  순위.sort((a, b) => a.순위 - b.순위);

  const top10 = 순위.filter((x) => x.순위 <= 10);
  const 못잡음 = [];
  for (let i = 1; i <= 10; i++) if (!top10.some((x) => x.순위 === i)) 못잡음.push(i);

  return { 부문, 조사기간, 빅데이터건수, 순위_1_10: top10, 못잡은순위: 못잡음, 점수: null, 점수없음: true };
}

// ── 자가시험 ──────────────────────────────────────────────────
function 자가시험() {
  const 봄 = [], 안봄 = [];
  const 자 = (설명, 참) => (참 ? 봄 : 안봄).push(설명);

  자('큰수 — 935만 1948', 큰수('935만 1948') === 9351948);
  자('큰수 — 203만 3705', 큰수('203만 3705') === 2033705);
  자('큰수 — 쉼표 없는 것', 큰수('1234') === 1234);
  자('큰수 — 못 읽으면 null', 큰수('') === null);
  자('큰수 — 10억 8365만 1008', 큰수('10억 8365만 1008') === 1083651008);

  const 목록표본 = `
    <dd class='subtitle'><a href="/article/1065570821184010" style="background-image:url('/news/data/2026/09/03/p1065570821184010_236_h.jpg?2923')"></a></dd>
    <a href="/article/1065570821184010">‘신흥 루키’ 키키·하츠투하츠, 동반 상승세</a>
  `;
  const 목록 = 목록파싱(목록표본);
  자('목록파싱 — 1건', 목록.length === 1);
  자('목록파싱 — id', 목록[0]?.id === '1065570821184010');
  자('목록파싱 — 발행일', 목록[0]?.발행일 === '2026-09-03');

  // 실측(화장품 부문, 2026-08-31 기사) — 이름 혼자인 경우
  const 화장품본문 = `<div class="viewConts" id="viewConts" itemprop="articleBody">
    <p>빅데이터 평가 기관인 아시아브랜드연구소는 'K-브랜드지수' 화장품 브랜드 부문 1위에 헤라가 선정됐다고 31일 발표했다.</p>
    <p>이번 K-브랜드지수 화장품 브랜드 부문은 포털사이트 검색량 상위 30개 브랜드를 대상으로, 2026년 7월 1일부터 7월 31일까지의 온라인 빅데이터 935만 1948건을 분석했다.</p>
    <p>K-브랜드지수 화장품 브랜드 부문은 헤라(1위)와 닥터자르트(2위)가 선두권을 형성했으며, 롬앤(3위), 메디힐(4위), 클리오(5위), 라네즈(6위), 이니스프리(7위), 설화수(8위), 에뛰드(9위), 에스트라(10위) 등이 TOP10에 이름을 올렸다.</p>
    </div><figure>`;
  const 화장품 = 기사파싱(화장품본문);
  자('기사파싱(화장품) — 부문', 화장품.부문 === '화장품 브랜드');
  자('기사파싱(화장품) — 조사기간', 화장품.조사기간 === '2026년 7월 1일부터 7월 31일까지');
  자('기사파싱(화장품) — 빅데이터건수', 화장품.빅데이터건수 === 9351948);
  자('기사파싱(화장품) — 1위', 화장품.순위_1_10[0]?.이름 === '헤라');
  자('기사파싱(화장품) — 10위까지 다 잡힘', 화장품.순위_1_10.length === 10);
  자('기사파싱(화장품) — 못잡은순위 없음', 화장품.못잡은순위.length === 0);
  자('기사파싱(화장품) — 점수없음 표시', 화장품.점수없음 === true && 화장품.점수 === null);

  // 실측(경기도 지자체장 부문, 2026-09-07 기사) — 이름+직함인 경우, 1위 말투가 다름
  const 지자체본문 = `<div class="viewConts" id="viewConts" itemprop="articleBody">
    <p>빅데이터 평가 기관인 아시아브랜드연구소는 'K-브랜드지수' 경기도 지자체장 부문 1위에 이민근 안산시장이 선정됐다고 7일 발표했다.</p>
    <p>이번 K-브랜드지수 경기도 지자체장 부문은 경기도 31개 기초자치단체장을 대상으로, 2026년 8월 1일부터 8월 31일까지의 온라인 빅데이터 203만 3705건을 분석하여 진행됐다.</p>
    <p>K-브랜드지수 경기도 지자체장 부문은 이민근 안산시장이 1위를 차지했으며, 최현덕 남양주시장(2위), 최대호 안양시장(3위), 이재준 수원시장(4위), 민경선 고양시장(5위), 정명근 화성시장(6위), 신상진 성남시장(7위), 이기형 김포시장(8위), 이현재 하남시장(9위), 이상일 용인시장(10위) 등이 TOP10의 영예를 차지했다.</p>
    <p>이밖에 신동화 구리시장(11위), 조용익 부천시장(12위)가 그 뒤를 이었다.</p>
    </div><figure>`;
  const 지자체 = 기사파싱(지자체본문);
  자('기사파싱(지자체) — 부문', 지자체.부문 === '경기도 지자체장');
  자('기사파싱(지자체) — 1위(이름+직함)', 지자체.순위_1_10[0]?.이름 === '이민근 안산시장');
  자('기사파싱(지자체) — 10위까지 다 잡힘', 지자체.순위_1_10.length === 10);
  자('기사파싱(지자체) — 11위는 top10에서 빠진다', !지자체.순위_1_10.some((x) => x.순위 === 11));

  // 실측(걸그룹 부문, 2026-09-03 기사) — "N위 이름(영문)" 말투, 영문이 괄호로 붙는 경우
  const 걸그룹본문 = `<div class="viewConts" id="viewConts" itemprop="articleBody">
    <p>빅데이터 평가 기관인 아시아브랜드연구소는 'K-브랜드지수' 걸그룹 부문 1위에 리센느(RESCENE)가 선정됐다고 3일 발표했다.</p>
    <p>이번 K-브랜드지수 걸그룹 부문은 포털사이트 검색량 상위 30위를 대상으로, 2026년 8월 1일부터 8월 31일까지의 온라인 빅데이터 10억 8365만 1008건을 분석했다.</p>
    <p>K-브랜드지수 걸그룹 부문은 1위 리센느(RESCENE)에 이어 2위 블랙핑크(BLACKPINK), 3위 아이브(IVE), 4위 에스파(aespa), 5위 레드벨벳(Red Velvet), 6위 아일릿(ILLIT), 7위 트와이스(TWICE), 8위 키키(KiiiKiii), 9위 하츠투하츠(Hearts2Hearts), 10위 프로미스나인(fromis_9) 등이 TOP10에 이름을 올렸다.</p>
    </div><figure>`;
  const 걸그룹 = 기사파싱(걸그룹본문);
  자('기사파싱(걸그룹) — 부문', 걸그룹.부문 === '걸그룹');
  자('기사파싱(걸그룹) — 빅데이터건수(억 단위)', 걸그룹.빅데이터건수 === 1083651008);
  자('기사파싱(걸그룹) — 1위', 걸그룹.순위_1_10[0]?.이름 === '리센느(RESCENE)');
  자('기사파싱(걸그룹) — 2위', 걸그룹.순위_1_10[1]?.이름 === '블랙핑크(BLACKPINK)');
  자('기사파싱(걸그룹) — 10위까지 다 잡힘', 걸그룹.순위_1_10.length === 10);

  console.log(`자가시험 ${봄.length}/${봄.length + 안봄.length}`);
  if (안봄.length) { console.log('🔴 틀린 것:'); 안봄.forEach((x) => console.log('   · ' + x)); }
  return 안봄.length === 0;
}

function 본기사목록읽기() {
  if (!existsSync(본기사파일)) return {};
  try { return JSON.parse(readFileSync(본기사파일, 'utf8')); } catch { return {}; }
}

async function main() {
  if (process.argv.includes('--자가시험')) {
    process.exit(자가시험() ? 0 : 1);
  }
  if (!자가시험()) { console.log('🔴 자가시험이 깨졌다 — 멈춘다'); process.exit(1); }

  const r = await fetch(목록주소, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(30000) });
  if (!r.ok) { console.log(`🔴 HTTP ${r.status}`); process.exit(1); }
  const html = await r.text();
  const 목록 = 목록파싱(html);

  const 본기사 = 본기사목록읽기();
  const 신규 = 목록.filter((x) => !본기사[x.id]).slice(0, 최대신규);

  console.log(`목록 ${목록.length}건 · 이미 받음 ${목록.length - 신규.length}건 · 새로 받을 것 ${신규.length}건`);

  const 날 = 오늘();
  mkdirSync(OUT, { recursive: true });
  const 산출파일 = path.join(OUT, `${날}.json`);
  const 기존 = existsSync(산출파일) ? JSON.parse(readFileSync(산출파일, 'utf8')) : { 받은날: 날, 기사: [] };

  for (const 기사 of 신규) {
    try {
      const ar = await fetch(기사주소(기사.id), { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(30000) });
      if (!ar.ok) { console.log(`   ⚠ ${기사.id} HTTP ${ar.status} — 건너뜀`); continue; }
      const ahtml = await ar.text();
      const 파싱 = 기사파싱(ahtml);
      기존.기사.push({ id: 기사.id, 제목: 기사.제목, 발행일: 기사.발행일, 주소: 기사주소(기사.id), ...파싱 });
      본기사[기사.id] = { 제목: 기사.제목, 받은날: 날 };
      console.log(`   ✅ ${기사.id} ${기사.제목.slice(0, 30)}… — 부문:${파싱.부문 ?? '못잡음'} 1~10위 ${파싱.순위_1_10.length}/10`);
    } catch (e) {
      console.log(`   ⚠ ${기사.id} 받기 실패 — ${e.message} — 건너뜀`);
    }
    if (신규.indexOf(기사) < 신규.length - 1) await 쉰다(딜레이ms);
  }

  writeFileSync(산출파일, JSON.stringify({
    출처: 'kbrandindex.co.kr (아시아브랜드연구소)',
    받은날: 날,
    주의: 'K-브랜드지수는 산출식이 공개되지 않은 합산 순위다. 우리가 잰 값이 아니다. 지수 점수(인덱스 수치)는 기사에 없다 — 발행처에 정기 제공 여부를 문의 중(2026-10-06).',
    한계: '기사 본문 TOP10 서술에서 1~10위 이름만 뽑는다. 점수는 없다(점수없음:true). 못잡은순위가 있으면 본문 말투가 달라 못 뽑은 것이다 — 0으로 채우지 않았다.',
    기사: 기존.기사,
  }, null, 1));
  writeFileSync(본기사파일, JSON.stringify(본기사, null, 1));

  console.log(`\n   ${산출파일}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
