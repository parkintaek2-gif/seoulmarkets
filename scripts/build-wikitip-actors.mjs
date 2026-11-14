/**
 * K Culture Wire — 한국 배우 「관심도」(영문 위키백과 조회수) 지면용 데이터를 만든다.
 *
 * 첫 화면은 관심 상위 10 + 급상승 10 만 보여준다. 이 스크립트는 30일 전체를 훑어
 * **지속 관심**(합·하루평균) 순 상위를 낸다 → src/data/wikitip-actors.json.
 *
 * ⚠ 신중 프레이밍: 「급상승(상승배수)」은 스캔들·부고로도 튄다. 지면은 **지속 관심**만
 *   싣고(30일 합), 「관심은 인기가 아니다 · 우리는 이유가 아니라 수를 센다」를 함께 박는다.
 *   사진 안 쓴다(언론사 미등록). 사실은 우리가 만든 숫자뿐이다.
 *
 * 입력(이미 있는 것, 새 수집·키 없음): archive/raw/star-pageviews/actors-YYYYMMDD.json {사람:[…]}
 *   원자료: Wikimedia Pageviews API(사람 트래픽) · 명단 Wikidata P161 cast → P27 한국국적
 * 시각: KST. new Date() 그대로.
 */
import fs from 'node:fs';
/* 🔴 [2026-11-14] 영문 지면에 「오후」가 나갔다 — 잰 시각은 한 꼴로 적는다 */
import { 잰때문자 } from './lib/잰때.mjs';

const dir = 'archive/raw/star-pageviews';
const files = fs.readdirSync(dir).filter((f) => /^actors-\d+\.json$/.test(f)).sort();
if (!files.length) { console.error('no actors-*.json'); process.exit(1); }
const latest = files[files.length - 1];
const j = JSON.parse(fs.readFileSync(`${dir}/${latest}`, 'utf8'));
const people = j.사람;

const rows = [...people]
  .sort((a, b) => b.합 - a.합)
  .slice(0, 50)
  .map((p) => ({ name: p.이름, total: p.합, daily: p.하루평균, titles: p.작품수, days: p.일수 }));

const totalViews = people.reduce((s, p) => s + p.합, 0);
const out = {
  generated: 잰때문자(),
  source:
    'English Wikipedia page views (Wikimedia Pageviews API), human traffic only. '
    + 'Roster from Wikidata cast lists (P161) filtered to Korean citizenship (P27).',
  period: j.기간,
  days: j.일수,
  measured: j.잡힘,
  roster: j.대상,
  totalViews,
  rows,
};
fs.writeFileSync('src/data/wikitip-actors.json', JSON.stringify(out, null, 2));

console.log(`file ${latest} · measured ${j.잡힘}/${j.대상} · 30d total views ${totalViews.toLocaleString()}`);
console.log('top 6:', rows.slice(0, 6).map((r) => `${r.name} (${r.total.toLocaleString()})`).join(' · '));
