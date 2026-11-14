/**
 * K Culture Wire — 동남아 넷플릭스 Top10 에 오른 한국 작품 **카탈로그**를 만든다.
 *
 * 첫 화면(index.astro)은 **현재 주** 8개만 보여준다. 이 스크립트는 archive 의
 * 전 주차를 훑어 「동남아 6개국에서 Top10 에 든 적 있는 한국 작품 전체」를 낸다.
 * 결과 → src/data/wikitip-titles.json (지면 titles.astro 가 읽는다).
 *
 * 입력(이미 있는 것, 새 수집·키 없음):
 *   archive/raw/netflix-top10/countries.ndjson   {주,국가,iso2,구분,순위,제목,…}
 *   archive/raw/netflix-top10/korean-titles.json {제목:[…]}  ← Wikidata P495=Q884 로 판정된 한국 작품명
 *
 * 라이선스: 넷플릭스 Tudum 공식 주간 국가별 순위. 우리는 **원본 표를 재배포하지 않고
 *   집계(카운트)만** 낸다 — 첫 화면·About 과 같은 이용 방식.
 * 시각: KST. new Date() 그대로.
 */
import fs from 'node:fs';
import readline from 'node:readline';
import { koreanTitleFilter } from './lib/korean-netflix-titles.mjs';
/* 🔴 [2026-11-14] 영문 지면에 「오후」가 나갔다 — 잰 시각은 한 꼴로 적는다 */
import { 잰때문자 } from './lib/잰때.mjs';

const SEA = { SG: 'Singapore', MY: 'Malaysia', PH: 'the Philippines', TH: 'Thailand', ID: 'Indonesia', VN: 'Vietnam' };
/* 판정은 한 곳에서 온다 — scripts/lib/korean-netflix-titles.mjs.
   여기 복사해 두면 /watched 만 고치고 이 지면은 틀린 채로 남는다. 실제로 그럴 뻔했다. */
const ko = koreanTitleFilter();

const agg = new Map();
const weeksAll = new Set();
let scanned = 0, hit = 0;

const rl = readline.createInterface({ input: fs.createReadStream('archive/raw/netflix-top10/countries.ndjson'), crlfDelay: Infinity });
for await (const line of rl) {
  if (!line.trim()) continue;
  let r; try { r = JSON.parse(line); } catch { continue; }
  scanned++;
  if (!SEA[r.iso2]) continue;
  if (!ko.keepTitle(r.제목)) continue;
  hit++;
  weeksAll.add(r.주);
  let a = agg.get(r.제목);
  if (!a) { a = { title: r.제목, type: r.구분, countries: new Set(), peak: 99, weeks: new Set() }; agg.set(r.제목, a); }
  a.countries.add(r.iso2);
  a.weeks.add(r.주);
  if (typeof r.순위 === 'number' && r.순위 < a.peak) a.peak = r.순위;
  if (r.구분) a.type = r.구분;
}

const rows = [...agg.values()]
  .map((a) => ({ title: a.title, type: a.type, countries: a.countries.size, peak: a.peak, weeks: a.weeks.size }))
  .sort((x, y) => y.countries - x.countries || x.peak - y.peak || y.weeks - x.weeks);

const weeks = [...weeksAll].sort();
const st = ko.stats();
const out = {
  generated: 잰때문자(),
  source: 'Netflix Top 10 (Tudum) weekly country lists; Korean titles identified via Wikidata country of origin (P495 = Q884), with titles Netflix classes on its English-language global charts excluded',
  /** 뺀 것과 못 거른 것을 같이 낸다. 지면이 이 값을 그대로 적는다. */
  excludedEnglishChart: st.droppedEnglishChart.length,
  excludedByHand: st.droppedByHand,
  /** 까닭별로 가른 것 — 「손으로 읽었다」와 「판정 질의가 답했다」는 다른 말이다. */
  excludedByHandRead: st.droppedByHandRead,
  excludedByAttribution: st.droppedByAttribution,
  unlabelledTitles: st.unlabelled,
  region: 'Southeast Asia — Singapore, Malaysia, the Philippines, Thailand, Indonesia and Vietnam',
  countries: Object.keys(SEA).length,
  weekFrom: weeks[0],
  weekTo: weeks[weeks.length - 1],
  weekCount: weeks.length,
  titleCount: rows.length,
  rows,
};
fs.writeFileSync('src/data/wikitip-titles.json', JSON.stringify(out, null, 2));

console.log(`scanned ${scanned.toLocaleString()} rows · SEA×Korean hits ${hit.toLocaleString()}`);
console.log(`distinct Korean titles in SEA Top 10: ${rows.length} · weeks ${weeks[0]}~${weeks[weeks.length - 1]} (${weeks.length})`);
console.log('top 8 by country reach:', rows.slice(0, 8).map((r) => `${r.title} (${r.countries}c #${r.peak}, ${r.weeks}w)`).join(' · '));
