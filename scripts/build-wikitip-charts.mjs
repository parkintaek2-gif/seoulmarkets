/**
 * K Culture Wire — 첫 화면이 읽는 자료. (index.astro)
 *
 * 결과 → src/data/wikitip-charts.json
 * 입력 → archive/raw/netflix-top10/{countries,global}.ndjson · 기존 charts.json(배우 칸)
 * 판정 → scripts/lib/korean-netflix-titles.mjs 한 곳에서만 온다.
 *
 * ── 🔴 2026-08-07: 첫 화면 자료에도 스크립트가 없었다 ──────────────────
 * /staying-power · /reach 와 같다. 손으로 만든 파일만 있어 판정이 바뀌어도 안 따라왔고,
 * 그 결과 **첫 화면이 중국 드라마 `Teach You a Lesson` 을 두 칸에 한국 작품으로 싣고 있었다**
 * (동남아 칸 · 누적 시청시간 칸). 가장 많이 보이는 자리다.
 *
 * ⚠ 배우 칸(관심·상승)은 이 스크립트가 만들지 않는다. Wikimedia 조회수에서 오고
 *   넷플릭스 판정과 무관하다. **기존 값을 그대로 옮긴다.** 없는 것을 만들지 않는다.
 *   그 칸의 되짚기는 build-wikitip-actors.mjs 쪽 일이다 — 아직 안 했다고 적어 둔다.
 */
import fs from 'node:fs';
import readline from 'node:readline';
import { koreanTitleFilter } from './lib/korean-netflix-titles.mjs';
/* 🔴 [2026-11-14] 영문 지면에 「오후」가 나갔다 — 잰 시각은 한 꼴로 적는다 */
import { 잰때문자 } from './lib/잰때.mjs';

const SEA = new Set(['SG', 'MY', 'PH', 'TH', 'ID', 'VN']);
const ko = koreanTitleFilter();
const prev = JSON.parse(fs.readFileSync('src/data/wikitip-charts.json', 'utf8'));

/* ── ① 동남아 — **현재 주** 한 주만 본다. 누적이 아니다. ── */
const week = prev.넷플릭스주;
const sea = new Map();
{
  const rl = readline.createInterface({
    input: fs.createReadStream('archive/raw/netflix-top10/countries.ndjson'), crlfDelay: Infinity,
  });
  for await (const line of rl) {
    if (!line.trim()) continue;
    let r; try { r = JSON.parse(line); } catch { continue; }
    if (r.주 !== week || !SEA.has(r.iso2)) continue;
    if (!ko.keepTitle(r.제목)) continue;
    let a = sea.get(r.제목);
    if (!a) { a = { 제목: r.제목, iso: new Set(), 최고순위: 99, 구분: r.구분 }; sea.set(r.제목, a); }
    a.iso.add(r.iso2);
    if (typeof r.순위 === 'number' && r.순위 < a.최고순위) a.최고순위 = r.순위;
    if (r.구분) a.구분 = r.구분;
  }
}
/* 이름이 겹치는 제목에는 표시를 붙인다 — 빼지도 감추지도 않는다.
   check-title-ambiguity.mjs 가 위키데이터에 물어 만든 판정이다. 없으면 표시 없이 낸다. */
let 판정 = new Map();
try {
  const a = JSON.parse(fs.readFileSync('src/data/wikitip-title-ambiguity.json', 'utf8'));
  판정 = new Map(a.frontPage.map((r) => [r.title, r]));
} catch { /* 아직 안 잰 것이다. 표시 없이 낸다 — 없는 확인을 있다고 하지 않는다. */ }

const 동남아 = [...sea.values()]
  .map((a) => {
    const v = 판정.get(a.제목);
    return {
      제목: a.제목, 국가수: a.iso.size, 최고순위: a.최고순위, 구분: a.구분,
      이름겹침: v ? v.verdict === 'shared' : false,
      겹치는나라수: v && v.verdict === 'shared' ? v.countries.length : 0,
    };
  })
  .sort((x, y) => y.국가수 - x.국가수 || x.최고순위 - y.최고순위)
  .slice(0, 8);

/* ── ② 누적 시청시간 — 전 주차. 줄마다 언어가 있으므로 keepRow 를 쓴다. ── */
const hours = new Map();
{
  const rl = readline.createInterface({
    input: fs.createReadStream('archive/raw/netflix-top10/global.ndjson'), crlfDelay: Infinity,
  });
  for await (const line of rl) {
    if (!line.trim()) continue;
    let r; try { r = JSON.parse(line); } catch { continue; }
    if (!ko.keepRow(r.제목, r.구분)) continue;
    hours.set(r.제목, (hours.get(r.제목) || 0) + (r.시청시간 || 0));
  }
}
const 시청시간 = [...hours.entries()]
  .map(([제목, 시간]) => ({ 제목, 시간 }))
  .sort((a, b) => b.시간 - a.시간)
  .slice(0, 10);

const out = {
  ...prev,
  갱신: 잰때문자(),
  동남아,
  시청시간,
  /* 배우 두 칸은 손대지 않고 옮긴다 — 넷플릭스 판정과 무관한 자료다. */
  관심: prev.관심,
  상승: prev.상승,
};

/* ── 검산 ── 손으로 확인해 뺀 것이 하나라도 남아 있으면 세우지 않는다. */
const { droppedByHand } = ko.stats();
const 남은 = [...동남아.map((r) => r.제목), ...시청시간.map((r) => r.제목)]
  .filter((t) => droppedByHand.includes(t));
if (남은.length) throw new Error(`뺐어야 할 제목이 첫 화면에 남았다: ${남은.join(', ')}`);

fs.writeFileSync('src/data/wikitip-charts.json', JSON.stringify(out, null, 2));
console.log(`주 ${week} · 동남아 ${동남아.length}칸 · 시청시간 ${시청시간.length}칸`);
console.log('동남아:', 동남아.map((r) => `${r.제목}(${r.국가수}국)`).join(' · '));
console.log('시청시간:', 시청시간.slice(0, 4).map((r) => `${r.제목} ${(r.시간 / 1e6).toFixed(0)}m`).join(' · '));
