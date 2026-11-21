/**
 * 유료 상품 1안의 **한 벌**을 만든다 — 받는 사람이 여는 그대로.
 *
 * 2번 지시(2026-08-07 10:2x): 「본보기를 받는 사람이 여는 그대로 한 벌로 묶는다.
 *   표 + method(정의 원문) + corrections + 읽는 법 한 장. 폴더 하나로.
 *   값은 사장님이 정하신다. 정하시려면 **받는 것을 보셔야** 한다」
 *
 * 결과 → docs/상품안/본보기-한벌/
 *          README.md                  읽는 법 한 장 — 맨 먼저 열리는 것
 *          korean-title-panel.csv     동남아 405편 전부. 맛보기가 아니다
 *          provenance.csv             이 표를 얼마나 믿어야 하나
 *          industry-panel.csv         KOSIS 수출 × DART 인력
 *          corrections.csv            우리가 틀렸던 것 전부
 *          method.md                  정의 원문 — 우리 빌드 스크립트가 말하는 그대로
 *
 * ── ⛔ 담지 않는 것 ────────────────────────────────────────────
 * 넷플릭스 Tudum **원본 주간 표**는 안 담는다. 우리 지면이 「원본 표 재배포 없이 집계만」이라고
 * 이미 밝히고 있다. 담는 것은 우리 **집계**와 우리 **판정**뿐이다.
 * Riot 사다리도 안 담는다 — Production Key(App 866800) 심사 중이고 승인 전 상업 이용은
 * 접근 영구 취소다.
 *
 * ⛔ 아직 파는 물건이 아니다. **사장님 판단을 받기 위한 실물**이다.
 */
import fs from 'node:fs';
/* 🔴 [2026-09-09 · 5번] new Date().toISOString().slice(0,10) 은 UTC 다 —
   한국 자정~아침 9시에 «어제» 날짜가 나온다. 사장님 강령: 시각은 한국시간(KST). */
import { 오늘 } from './_kst.mjs';
import path from 'node:path';

const OUT = 'docs/상품안/본보기-한벌';
fs.mkdirSync(OUT, { recursive: true });

const 읽기 = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const titles = 읽기('src/data/wikitip-titles.json');
const amb = 읽기('src/data/wikitip-title-ambiguity.json');
const music = 읽기('src/data/wikitip-music-export.json');
const bcast = 읽기('src/data/wikitip-broadcast-export.json');
const ind = 읽기('src/data/wikitip-content-industry.json');
const pageFix = 읽기('src/data/wikitip-page-corrections.json');
const kpop = 읽기('src/data/wikitip-kpop.json');
/* K팝 **원자료**를 읽는다. 지면 자료는 상위 15줄만 들고 있다 —
   사는 사람에게 상위 15줄을 파는 것은 맛보기지 패널이 아니다. */
const kpopRaw = (() => {
  const d = 'archive/raw/star-pageviews';
  const f = fs.readdirSync(d).filter((x) => /^kpop-\d+\.json$/.test(x)).sort().pop();
  if (!f) throw new Error('K팝 원자료가 없다 — collect-kpop-pageviews.mjs 를 먼저 돌린다');
  return 읽기(path.join(d, f));
})();

const csv = (rows) => rows.map((r) => r.map((v) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}).join(',')).join('\n') + '\n';

/* ── ① 작품 패널 ── 405편 **전부**. 맛보기 25줄이 아니다. */
const 판정 = new Map(amb.perTitle.map((r) => [r.title, r]));
/* 2026-08-08. **거른 자가 둘이 됐다.** 이름(위키데이터)으로 못 가른 편에
   넷플릭스 한국 차트를 두 번째 자로 댄다. 사는 쪽이 「이 명단이 무엇으로 걸러졌나」를
   물으면 이제 답이 둘이다 — 그러니 열도 둘이어야 한다. 판정만 팔고 근거를 안 팔지 않는다. */
const koreaSig = new Map(읽기('src/data/wikitip-korea-signal.json').rows.map((r) => [r.title, r]));
const panel = [[
  'title', 'format', 'countries_reached', 'weeks_on_chart', 'peak_rank',
  'attribution', 'attribution_countries',
  'korea_chart_weeks', 'countries_worldwide', 'top_country', 'top_country_pc', 'review_queue',
]];
for (const r of titles.rows) {
  const v = 판정.get(r.title);
  const k = koreaSig.get(r.title);
  panel.push([
    r.title,
    /^TV/i.test(r.type) ? 'series' : 'film',
    r.countries, r.weeks, r.peak,
    v ? v.verdict : 'not_assessed',
    v && v.verdict === 'shared' ? v.countries.join('|') : '',
    k ? k.koreaWeeks : '',
    k ? k.countries : '',
    k ? k.topCountry : '',
    k ? k.concentrationPc : '',
    k && k.queue ? k.queue : '',
  ]);
}
fs.writeFileSync(path.join(OUT, 'korean-title-panel.csv'), csv(panel));

/* 패널 자체의 판정 분포. 글로벌 목록의 비중과 **다르다** — 동남아 전용 작품은
   작고 이름이 흔해 겹침이 훨씬 많다. 사는 사람이 놀라지 않게 README 에 그대로 싣는다. */
const 패널분포 = panel.slice(1).reduce((a, r) => { a[r[5]] = (a[r[5]] || 0) + 1; return a; }, {});

/** 두 번째 자가 잡아 낸 크기 — README 가 이 수를 인용한다. **표에서 센다.** */
const 큐 = (() => {
  const 겹침 = panel.slice(1).filter((r) => r[5] === 'shared');
  return {
    한국없음: 겹침.filter((r) => r[7] === 0).length,
    한나라: panel.slice(1).filter((r) => r[11] === 'one-country-only').length,
    몰림: panel.slice(1).filter((r) => r[11] === 'concentrated').length,
    넓게: panel.slice(1).filter((r) => r[11] === 'no-korea').length,
  };
})();

/* ── ② 출처 판정 ── 이 상품의 값이 여기 있다. */
const prov = [['measure', 'titles', 'share_of_viewing_pc', 'what_it_means']];
prov.push(['korea_only', amb.koreaOnly.titles, amb.koreaOnly.sharePc,
  'Only Korean works carry this exact title. A title-text rule cannot mismatch it.']);
prov.push(['shared_title', amb.shared.titles, amb.shared.sharePc,
  'A non-Korean work shares the exact title. We cannot tell from text alone which one charted. Not an error — an unresolved case.']);
prov.push(['no_country_on_wikidata', amb.unknown.titles, amb.unknown.sharePc,
  'Wikidata records no country of origin for any work with this title. No basis to judge.']);
fs.writeFileSync(path.join(OUT, 'provenance.csv'), csv(prov));

/* ── ③ 산업 패널 ── KOSIS 수출과 DART 인력을 한 표에. 두 기관은 서로를 안 본다. */
const industry = [[
  'year', 'series', 'measure', 'value', 'unit', 'source',
]];
for (const r of music.rows) {
  industry.push([r.year, 'music_exports', 'total', r.total, 'thousand USD', 'KOSIS DT_113_STBL_1020468']);
  for (const [k, v] of Object.entries(r.parts)) {
    if (v === null) continue;
    industry.push([r.year, 'music_exports', k, v, 'thousand USD', 'KOSIS DT_113_STBL_1020468']);
  }
}
for (const r of bcast.rows) {
  industry.push([r.year, 'broadcast_exports', 'total', r.total, 'thousand USD', 'KOSIS DT_113_STBL_1025706']);
  for (const [k, v] of Object.entries(r.parts)) {
    industry.push([r.year, 'broadcast_exports', k, v, 'thousand USD', 'KOSIS DT_113_STBL_1025706']);
  }
}
for (const g of ind.groups) {
  industry.push([ind.year, 'listed_workforce', `${g.key} — companies`, g.n, 'count', 'FSS DART']);
  industry.push([ind.year, 'listed_workforce', `${g.key} — staff`, g.staff, 'persons', 'FSS DART']);
  industry.push([ind.year, 'listed_workforce', `${g.key} — avg tenure`, g.tenure, 'years (headcount-weighted)', 'FSS DART']);
  industry.push([ind.year, 'listed_workforce', `${g.key} — women`, g.female, 'percent', 'FSS DART']);
}
industry.push([ind.year, 'listed_workforce', 'whole listed market — avg tenure', ind.market.tenure, 'years (headcount-weighted)', 'FSS DART']);
fs.writeFileSync(path.join(OUT, 'industry-panel.csv'), csv(industry));

/* ── ③-2 K팝 관심 패널 ── 이 한 벌이 K팝 없이 나가면 안 된다.
   우리 독자는 「k팝 등에 관심이 많은 해외」다(사장님, 2026-08-05). 주력 소재를 빼고 팔 수 없다.
   ⛔ 상위 몇 줄이 아니라 **명단 전부**를 낸다. 자르면 사는 사람이 자기 기준으로 못 자른다.
   ⛔ 이것은 「인기」가 아니라 **영어 위키백과를 몇 번 열었나**다. 열 이름 자체에 그렇게 적는다 —
      `views` 라고만 적으면 읽는 사람이 스트리밍 수로 읽는다. */
const kp = [[
  'name', 'kind', 'en_wikipedia_views_30d', 'daily_avg', 'peak_day', 'peak_day_views',
  'views_last_7d', 'last7_vs_daily_avg', 'also_on_screen_actor_roster',
]];
/* 배우 겹침은 **지면과 같은 명단**에서 읽는다. 지면 자료의 상위 15줄에서 뽑으면
   나머지 2,346줄이 전부 빈칸이 되고, 사는 사람은 그것을 「배우가 아니다」로 읽는다. */
const 배우명단 = (() => {
  const d = 'archive/raw/star-pageviews';
  const f = fs.readdirSync(d).filter((x) => /^actors-\d+\.json$/.test(x)).sort().pop();
  if (!f) throw new Error('배우 명단이 없다 — 겹침을 빈칸으로 낼 수 없다');
  return new Set(읽기(path.join(d, f)).사람.map((p) => p.이름));
})();
for (const p of kpopRaw.사람) {
  kp.push([
    p.이름, p.갈래 === 'group' ? 'group' : 'individual',
    p.합, p.하루평균, p.최고일, p.최고조회, p.최근7일, p.상승배수,
    /* ⛔ 아니면 빈칸이 아니라 `no` 다. 빈칸은 「안 쟀다」로 읽힌다 — 이건 재서 아닌 것이다.
       숫자 칸은 반대다. 못 잰 값은 빈칸으로 둔다. 0 으로 채우면 잰 값처럼 보인다. */
    배우명단.has(p.이름) ? 'yes' : 'no',
  ]);
}
fs.writeFileSync(path.join(OUT, 'kpop-attention-panel.csv'), csv(kp));
/* ── ③-4 명부 패널 ── ⭐ [2026-09-03] **업무 바퀴 ④리포트 칸을 채우려고 고른 축이다.**
   오늘 새로 잰 넷은 다 넷플릭스 차트에서 나왔다. 2026-08-08 판정으로 그것은
   **지면에 집계는 🟢 · 파일로 배포는 🔴** 다. 그러니 파는 한 벌에 넣을 수가 없다.
   ⚠ 그래서 「잠긴 자료를 안 쓰는 축」을 찾았다 — 위키데이터다.
      `docs/5번-라이선스-검토.md` 24줄: 「위키데이터 구조화 자료는 **CC0(퍼블릭 도메인)** 입니다
      — 상업적 재사용에 걸림돌이 없습니다」. 줄도 고르는 기준도 위키데이터 하나에서 온다.
   ⛔ 「인기 명단」이 아니다. **위키데이터에 한국 국적(P27=Q884)으로 적힌 연예인 전부**다.
      상위 몇 줄로 자르지 않는다 — 자르면 사는 사람이 자기 기준으로 못 자른다.
   ⛔ 빈칸을  태어난 날이 없는 것은 「모르는 날」이지 「날이 없는 사람」이 아니다.
   ⛔ 학교가 안 적힌 사람은 **줄은 있고 학교 칸만 빈다.** 줄을 빼면 사는 사람이
      「학교 적힌 4,535명이 전부다」로 읽는다. */
const 명부 = (() => {
  const D = 'archive/raw/wikidata';
  const 셋 = ['korean-entertainers-birth.json', 'korean-entertainers-school.json', 'korean-entertainers-roles.json'];
  const 없는것 = 셋.filter((f) => !fs.existsSync(path.join(D, f)));
  if (없는것.length) throw new Error(`위키데이터 명부가 없다 — ${없는것.join(' · ')}`);
  return { 생일: 읽기(path.join(D, 셋[0])), 학교: 읽기(path.join(D, 셋[1])), 갈래: 읽기(path.join(D, 셋[2])) };
})();
/** 위키데이터 갈래 낱말을 영어 열 값으로. ⛔ 「미확인」은 빈칸이다 — 「other」가 아니다 */
const 갈래영어 = { 노래: 'music', 연기: 'acting', 둘다: 'both', 기타: 'other' };
const 학교표 = new Map((명부.학교.사람 ?? []).map((r) => [r.q, r.schools ?? []]));
const ent = [[
  'wikidata_q', 'name', 'born', 'kind', 'is_group', 'schools', 'school_count', 'wikipedia_editions',
  'label_has_hangul',
]];
for (const p of 명부.생일.사람 ?? []) {
  const 역 = 명부.갈래.사람?.[p.q] ?? {};
  const 학 = 학교표.get(p.q) ?? [];
  ent.push([
    p.q, p.name ?? '', p.born ?? '',
    갈래영어[역.갈래] ?? '',
    typeof 역.grp === 'boolean' ? (역.grp ? 'yes' : 'no') : '',
    학.map((s) => s.name).filter(Boolean).join(' | '),
    학.length,
    p.sitelinks ?? 0,
    /* ⛔ 로마자로 «우리가» 옮기지 않는다. 지어낸 표기는 되짚을 수 없다. 표시만 해서 사는 사람이 고르게 한다 */
    /[가-힣]/.test(String(p.name ?? '')) ? 'yes' : 'no',
  ]);
}
fs.writeFileSync(path.join(OUT, 'entertainer-panel.csv'), csv(ent));


/* ── ③-3 조인 패널 ── **이 한 벌에서 남이 못 주는 것이 이것이다.**
   넷플릭스는 출연진을 안 낸다. 위키데이터는 넷플릭스 차트를 모른다.
   둘을 **Q번호로** 붙여 둔 표는 우리 것뿐이다.
   ⛔ 제목 문자열로 붙이지 않는다. 그렇게 하면 1,005편 중 317편(32%)에만 붙는다 —
      「Squid Game (TV series)」 같은 것이 전부 어긋난다. Q번호로 붙이면 70%다.
   ⛔ 사람의 Q번호도 같이 낸다. 이름은 바뀌고(동명이인 구분자·표기) Q번호는 안 바뀐다.
      사는 사람이 다음 달 자료와 이어 붙일 수 있어야 한다. */
const cast = (() => {
  const p = 'archive/raw/netflix-top10/korean-cast-joined.json';
  if (!fs.existsSync(p)) throw new Error('조인 자료가 없다 — collect-korean-cast.mjs 를 먼저 돌린다');
  return 읽기(p);
})();
const titlesKeyed = 읽기('archive/raw/netflix-top10/korean-titles-keyed.json');
const cj = [[
  'person_qid', 'person_name', 'en_wikipedia_article', 'title_qid', 'title_name',
  'title_format', 'titles_this_person_has_here',
]];
for (const [pq, v] of Object.entries(cast.배우)) {
  for (const wq of v.작품) {
    const w = titlesKeyed.작품[wq];
    cj.push([pq, v.이름, v.문서 ?? '', wq, w?.이름 ?? '', w?.갈래 ?? '', v.작품.length]);
  }
}
fs.writeFileSync(path.join(OUT, 'cast-title-join.csv'), csv(cj));

/* ── ④ 정정 ── /corrections 와 **같은 자료**에서 온다. 손으로 옮기면 다음에 빠진다. */
const 기사정정 = [];
const CD = 'content/kculturewire';
for (const f of fs.readdirSync(CD).filter((x) => x.endsWith('.md'))) {
  const src = fs.readFileSync(path.join(CD, f), 'utf8');
  /*
   * 🔴 2026-08-23 — 이 정규식이 줄바꿈을 `\n` 하나로만 봐서 **CRLF 파일에서 하나도 못 읽었다.**
   *   기사 파일은 CRLF 다. 정정이 0건이 되어 아래 자물쇠가 「앞말 파싱이 깨졌다」로 섰다.
   * ⛔ 줄바꿈 한 글자로 자료가 통째로 사라지는 자리다. 안 보이게 사라지는 것이 더 나쁘다.
   */
  const block = src.match(/^corrections:\r?\n((?:\s{2}- date:[\s\S]*?)(?=^\w|^---$))/m);
  if (!block) continue;
  for (const m of block[1].matchAll(/- date:\s*(\S+)\s*\n\s*note:\s*"([\s\S]*?)"\s*(?=\n\s*- date:|\n\S|$)/g)) {
    기사정정.push({ date: m[1], where: f.replace(/\.md$/, ''), kind: 'article', note: m[2].replace(/\s+/g, ' ').trim() });
  }
}
const fixes = [['date', 'kind', 'where', 'what', 'from', 'to', 'why']];
for (const r of pageFix.rows) fixes.push([r.date, 'data page', r.where, r.what, r.from, r.to, r.why]);
for (const r of 기사정정) fixes.push([r.date, 'article', `/article/${r.where}`, '', '', '', r.note]);
fs.writeFileSync(path.join(OUT, 'corrections.csv'), csv(fixes));

/* ── ⑤ 무엇이 비었나 ── 사는 사람이 **열자마자** 알아야 하는 것.
   2번 지시(2026-08-07 11:3x): 「무엇이 비었는지 먼저 말한다. 몇 %인지, 왜 비었는지,
   채울 수 있는지 없는지. 채우지 않는다. 밝힌다」
   ⛔ 「채울 수 있다」와 「못 채운다」를 **가른다.** 못 채우는 것을 못 채운다고만 하면
      게으른 것과 구분이 안 된다. **무엇이 막는지**까지 적는다. */
const cov = [['field', 'rows', 'unresolved', 'pc_unresolved', 'fillable', 'what_blocks_it']];
const 패널줄 = panel.length - 1;
const pc = (n) => +((100 * n) / 패널줄).toFixed(1);
/* ⛔ 2026-08-08. 이 줄은 오래 `no` 였다. **더는 사실이 아니다.** 두 번째 자(한국 차트)가
   생겨 「못 채운다」가 「차례가 정해졌다」로 바뀌었다. 자가 늘면 이 칸도 바뀌어야 한다 —
   안 바꾸면 우리가 이미 할 수 있는 일을 못 한다고 파는 것이 된다. */
cov.push(['attribution — shared name', 패널줄, 패널분포.shared ?? 0, pc(패널분포.shared ?? 0), 'partly',
  `A Korean work and a foreign work carry the same exact title, and Netflix publishes no country of production. A second signal narrows it: ${큐.한국없음} of these never appear on Netflix's own South Korea chart, ${큐.한나라} charted in exactly one country in the world. Those columns are in korean-title-panel.csv. Closing each row still needs a human check, which is why this is partly and not yes.`]);
cov.push(['review queue — one country only', 패널줄, 큐.한나라, pc(큐.한나라), 'partly',
  'Charted in a single country and never in Korea. The most likely place for a foreign work to be sitting in this panel — and also where genuinely Korean titles that simply never charted at home end up. Read row by row; we have not removed any of them.']);
cov.push(['attribution — no country on Wikidata', 패널줄, 패널분포.unknown ?? 0, pc(패널분포.unknown ?? 0), 'partly',
  'Wikidata carries no country-of-origin statement for any work with this title. Fillable by a per-title human check, which we have not done.']);
cov.push(['hours viewed per country', 패널줄, 패널줄, 100, 'no',
  'Netflix publishes hours for its global chart only. Country lists carry rank and nothing else. No source we can reach fills this.']);
cov.push(['titles below each weekly top ten', 'unknown', 'unknown', 'unknown', 'no',
  'Netflix publishes ten rows a week. What sits at eleven is published nowhere, so we cannot even count what is missing.']);
cov.push(['broadcast export by company type', bcast.rows.length * 4, 11,
  +((100 * 11) / (bcast.rows.length * 4)).toFixed(1), 'no',
  'Zero means the survey published no sales for that company type that year — IPTV content providers before 2023, for instance. It is a real zero in the source, not a gap we introduced.']);
cov.push(['export figures for 2025 and 2026', 2, 2, 100, 'later',
  'The content industry survey has not published them. It runs about eighteen months behind. We add them when it does.']);
/* K팝 쪽의 빈 곳. ⛔ 「조회수 = 인기」로 읽히는 것을 여기서 막는다. */
cov.push(['k-pop attention — what the number is', kpop.roster, 0, 0, 'no',
  'Every figure in the k-pop panel is how many times an English Wikipedia article was opened. It is not streams, not sales, not chart position, and not attention inside Korea. Nothing we can reach publishes per-artist streaming.']);
cov.push(['k-pop roster — no English Wikipedia article', kpop.roster, 'unknown', 'unknown', 'no',
  'An artist with no English Wikipedia article cannot be measured and does not appear at all. We cannot count who is missing, because the absence produces no row. This falls hardest on newly debuted acts and on members of new groups.']);
cov.push(['k-pop roster — fetch failed', kpop.roster, kpop.fetchFailed,
  +((100 * kpop.fetchFailed) / kpop.roster).toFixed(1), 'yes',
  'The pageviews API did not answer for these names after three tries. Fillable by re-running the collector; we leave them out rather than write a zero.']);
/* 빈칸을 하나도 설명 없이 두지 않는다. 사는 사람이 열자마자 세어 볼 칸들이다. */
cov.push(['k-pop — last7_vs_daily_avg is blank', kp.length - 1,
  kp.slice(1).filter((r) => r[7] === '' || r[7] === null).length,
  +((100 * kp.slice(1).filter((r) => r[7] === '' || r[7] === null).length) / (kp.length - 1)).toFixed(1), 'no',
  'These acts averaged under one view a day, so there is no base to divide by. The cell is left empty rather than written as zero, which would look like a measured collapse in interest instead of an absence of traffic.']);
cov.push(['titles — attribution_countries is blank', 패널줄,
  패널줄 - (패널분포.shared ?? 0), +((100 * (패널줄 - (패널분포.shared ?? 0))) / 패널줄).toFixed(1), 'no',
  'Blank here means the title is not shared with a foreign work, so there is no other country to name. It is not a missing value. Only rows marked shared carry country names.']);
cov.push(['corrections — from/to are blank', fixes.length - 1, 기사정정.length,
  +((100 * 기사정정.length) / (fixes.length - 1)).toFixed(1), 'no',
  'Article corrections are written as prose in the why column because what changed was a sentence, not a single figure. Data-page corrections carry a from and a to. Both kinds are in the same file on purpose.']);
/* 조인 패널의 빈 곳 — 사는 사람이 가장 먼저 셀 자리다. */
cov.push(['cast join — titles with no cast recorded', titlesKeyed.맞춘작품수,
  titlesKeyed.맞춘작품수 - cast.출연진이붙은작품,
  +((100 * (titlesKeyed.맞춘작품수 - cast.출연진이붙은작품)) / titlesKeyed.맞춘작품수).toFixed(1), 'partly',
  'Wikidata carries no cast statement for these titles at all. They are absent from the join rather than present with an empty cast. Fillable only as Wikidata fills, which we do not control.']);
cov.push(['cast join — people with no English Wikipedia article', cast.배우수,
  cast.배우수 - cast.문서있는배우,
  +((100 * (cast.배우수 - cast.문서있는배우)) / cast.배우수).toFixed(1), 'no',
  `These people are in the join and in the roster; they simply cannot be matched to pageview data, which is keyed on article titles. Being unmeasurable is not the same as being absent, and both counts are given. Note the units: this is ${cast.배우수 - cast.문서있는배우} people, who occupy ${cj.slice(1).filter((r) => !r[2]).length} rows of cast-title-join.csv because a person appears once per title. Counting blank rows there will not give you this number.`]);
cov.push(['cast join — foreign cast', cast.배우수, 'unknown', 'unknown', 'no',
  'The roster filters to Korean citizenship (P27=Q884). International co-productions lose their non-Korean cast, and the links those people would create are missing. We cannot count who was removed this way because they were never selected.']);
cov.push(['titles — language label unavailable', titlesKeyed.맞춘작품수, titlesKeyed.못가른것.언어딱지없음수,
  +((100 * titlesKeyed.못가른것.언어딱지없음수) / titlesKeyed.맞춘작품수).toFixed(1), 'no',
  'Netflix labels its global chart by primary language; country charts carry no language field. Titles that never reached a global Top 10 cannot be checked that way and are included on a title-text match alone. They are the small ones — the median charted in one country for three weeks — but the share is large and stated rather than buried.']);
cov.push(['k-pop — period covered', kpop.days, 0, 0, 'later',
  `${kpop.period}. Thirty days only. This panel cannot show a trend across years yet; we began collecting daily in August 2026 and the window grows from here.`]);
/* 명부 패널의 빈 곳 — 사는 사람이 열자마자 세어 볼 세 칸이다. */
{
  const 줄 = ent.length - 1;
  const 몫 = (n) => +((100 * n) / 줄).toFixed(1);
  const 생일없음 = ent.slice(1).filter((r) => !r[2]).length;
  const 학교없음 = ent.slice(1).filter((r) => Number(r[6]) === 0).length;
  const 갈래없음 = ent.slice(1).filter((r) => !r[3]).length;
  cov.push(['entertainers — no date of birth on Wikidata', 줄, 'uncountable', 'unknown', 'no',
    'Every row here carries a birth date, and that is not a coverage figure — it is how the roster was drawn. The query that produced this list asked Wikidata for Korean-citizenship entertainers with a date of birth, so a person without one produces no row at all and cannot be counted as a blank. Read the row count as people with a birth date, not as the size of the profession.']);
  cov.push(['entertainers — no school recorded', 줄, 학교없음, 몫(학교없음), 'partly',
    'No educated-at statement exists for these people. It does not mean they attended no school. The row is still here with the school columns empty, because dropping it would read as a claim that the people with schools are the whole roster.']);
  cov.push(['entertainers — occupation not readable', 줄, 갈래없음, 몫(갈래없음), 'partly',
    'Wikidata lists an occupation we could not sort into music or acting, or lists none. Left blank rather than filed under other, which would be a claim we did not measure.']);
  const 한글이름 = ent.slice(1).filter((r) => r[8] === 'yes').length;
  cov.push(['entertainers — label is not in Latin script', 줄, 한글이름, 몫(한글이름), 'partly',
    'Wikidata holds no English label for these people, so the name column carries the Korean one. We did not romanise it ourselves: a guessed romanisation of a real name is worse than the Korean characters, because it looks authoritative and cannot be matched back. The label_has_hangul column marks every such row so you can filter or romanise on your own rules.']);
  cov.push(['entertainers — who is missing from the roster', 줄, 'uncountable', 'unknown', 'no',
    'The roster is everyone Wikidata marks as a Korean-citizenship entertainer. Someone with no Wikidata item produces no row, so we cannot count who is absent. This falls hardest on people who debuted recently.']);
}
fs.writeFileSync(path.join(OUT, 'coverage.csv'), csv(cov));

/* ── ④-2 열 사전 ── CSV 를 **혼자 열어도** 뜻을 알아야 한다.
   2번 지시(2026-08-07 22:2x): 「무엇이 들어 있는지, 어디서 왔는지, 무엇을 못 담았는지가
   **그 한 벌 안에** 있어야 한다」.
   ⛔ 빈칸이 무슨 뜻인지를 **열마다** 적는다. 우리는 빈칸을 두 가지로 쓴다 —
      「재서 아니다」가 아니라 **「못 쟀다」**일 때만 빈칸이다. 그 규칙을 사는 사람이 알아야 한다.
   ⛔ 열 목록을 손으로 적지 않는다. **실제로 낸 표의 머리줄**에서 읽는다.
      손으로 적으면 열이 늘 때 사전이 조용히 낡는다. */
const 뜻 = {
  /**
   * ⭐ [2026-09-03 · 5번] 명부 패널 — **위키데이터만으로 만든 표.**
   * 업무 바퀴 ④리포트 칸을 채우려는데 오늘 새로 잰 넷이 다 넷플릭스에서 나온 것이라
   * 파일로 못 낸다(대장 2026-08-08: 집계 🟢 · 파일 🔴). 그래서 잠기지 않은 축으로 골랐다.
   * 위키데이터는 CC0 이고, `docs/5번-라이선스-검토.md` 24줄이 그것을 이미 못박아 두었다.
   */
  'entertainer-panel.csv': {
    wikidata_q: ['The Wikidata item for this person or group. The only stable key here — romanised names change spelling, Q-numbers do not', '', 'never blank'],
    name: ['English label on Wikidata', '', 'never blank'],
    born: ['Date of birth as Wikidata records it', 'YYYY-MM-DD', 'blank means Wikidata holds no birth date. It is not a claim about the person, it is an empty field upstream'],
    kind: ['music / acting / both / other — read from the occupations Wikidata lists', '', 'blank means no occupation we could read'],
    is_group: ['yes when the item is a group rather than a person', '', 'blank means the occupations did not tell us either way'],
    schools: ['Schools Wikidata lists this person as educated at', 'pipe-separated', 'blank means no school is recorded — not a claim that they attended none'],
    school_count: ['How many schools are listed', 'schools', 'never blank; 0 means none recorded'],
    wikipedia_editions: ['How many Wikipedia language editions carry an article on them', 'editions', 'never blank'],
    label_has_hangul: ['yes when Wikidata holds no Latin-script label, so the name column carries the Korean one. We did not romanise it — a guessed romanisation cannot be matched back to anything', '', 'never blank'],
  },
  'korean-title-panel.csv': {
    title: ['The title exactly as Netflix printed it', '', 'never blank'],
    format: ['series or film, from Netflix’s own chart category', '', 'never blank'],
    countries_reached: ['How many of six Southeast Asian markets it charted in at any point', 'markets (max 6)', 'never blank'],
    weeks_on_chart: ['Distinct weeks on a chart, counted once per title however many countries', 'weeks', 'never blank'],
    peak_rank: ['Best position reached in any of the six', 'rank (1 is best)', 'never blank'],
    attribution: ['koreaOnly / shared / unknown — how sure we are this is the Korean work', '', 'never blank'],
    attribution_countries: ['Countries that also made a work with this exact title', 'pipe-separated', 'blank means NOT shared — there is no other country to name. It is not a missing value'],
    korea_chart_weeks: ['Weeks this title spent on Netflix’s South Korea top ten. The second ruler: a Korean work normally also plays in Korea', 'weeks', 'never blank; 0 means it never appeared, which is a reason to look and not a verdict'],
    countries_worldwide: ['How many countries anywhere in the world charted this title, not only the six', 'countries', 'never blank'],
    top_country: ['The country where it spent the most weeks', '', 'never blank'],
    top_country_pc: ['Share of all its chart-weeks taken by that one country. 100 means it charted nowhere else', 'percent', 'never blank'],
    review_queue: ['one-country-only / concentrated / no-korea — why this row is queued for a human check', '', 'blank means not queued: either the name is unambiguous, or the title did chart in Korea'],
  },
  'cast-title-join.csv': {
    person_qid: ['Wikidata Q-number for the person. Join on this, not on the name', '', 'never blank'],
    person_name: ['English label from Wikidata. Names change; Q-numbers do not', '', 'never blank'],
    en_wikipedia_article: ['Exact English Wikipedia article title, if one exists', '', 'blank means this person has no English Wikipedia article, so they cannot be matched to the attention panels. They are still really in the cast'],
    title_qid: ['Wikidata Q-number for the title. Join on this', '', 'never blank'],
    title_name: ['English label for the title', '', 'never blank'],
    title_format: ['film or series, from Wikidata’s instance-of', '', 'never blank'],
    titles_this_person_has_here: ['How many charting Korean titles this person appears in, in this file', 'titles', 'never blank'],
  },
  'kpop-attention-panel.csv': {
    name: ['Exact English Wikipedia article title', '', 'never blank'],
    kind: ['group or individual. The two are never added together', '', 'never blank'],
    en_wikipedia_views_30d: ['Article opens over the window. NOT streams, sales or chart position', 'page opens', 'never blank'],
    daily_avg: ['Mean opens per day over the window, rounded', 'page opens', 'never blank'],
    peak_day: ['Date of the single largest day', 'YYYYMMDD', 'never blank'],
    peak_day_views: ['Opens on that day', 'page opens', 'never blank'],
    views_last_7d: ['Opens in the final seven days of the window', 'page opens', 'never blank'],
    last7_vs_daily_avg: ['Last seven days against the daily average', 'ratio', 'blank means the act averaged under one view a day, so there is no base to divide by. We do not write 0, which would look like a measured collapse'],
    also_on_screen_actor_roster: ['yes / no — also appears in a Korean title that reached a Netflix Top 10', '', 'never blank. no means we checked and it is no'],
  },
  'industry-panel.csv': {
    year: ['Survey or filing year', 'year', 'never blank'],
    series: ['Which dataset the row belongs to', '', 'never blank'],
    measure: ['What is being counted', '', 'never blank'],
    value: ['The published figure, unadjusted', 'see unit column', 'never blank'],
    unit: ['Unit of the value. Exports are nominal US dollars, not inflation-adjusted', '', 'never blank'],
    source: ['The exact table or filing it came from', '', 'never blank'],
  },
  'provenance.csv': {
    measure: ['Which attribution verdict this row describes', '', 'never blank'],
    titles: ['How many titles carry that verdict', 'titles', 'never blank'],
    share_of_viewing_pc: ['Share of global viewing hours those titles hold', 'percent', 'never blank'],
    what_it_means: ['Plain-language reading of the verdict', '', 'never blank'],
  },
  'corrections.csv': {
    date: ['When we changed it', 'YYYY-MM-DD', 'never blank'],
    kind: ['data page or article', '', 'never blank'],
    where: ['Which page or article carried the wrong figure', '', 'never blank'],
    what: ['Which figure changed', '', 'blank for article corrections, where what changed was a sentence rather than one number. The why column carries it'],
    from: ['Old value', '', 'blank for article corrections — see what'],
    to: ['New value', '', 'blank for article corrections — see what'],
    why: ['What was wrong and how we found it', '', 'never blank'],
  },
  'coverage.csv': {
    field: ['What is being described', '', 'never blank'],
    rows: ['Population the gap is measured against. Read this before the next column', '', 'never blank'],
    unresolved: ['How much of that population is unresolved', '', 'never blank'],
    pc_unresolved: ['The same as a share', 'percent', 'never blank'],
    fillable: ['no / partly / later / yes — whether this can ever be filled', '', 'never blank'],
    what_blocks_it: ['Why it cannot be filled, or what would fill it', '', 'never blank'],
  },
};
const dict = [['file', 'column', 'what_it_is', 'unit', 'what_a_blank_cell_means']];
for (const [파일, 열들] of Object.entries(뜻)) {
  const p = path.join(OUT, 파일);
  if (!fs.existsSync(p)) throw new Error(`${파일} 이 없다 — 사전이 실제 표와 어긋난다`);
  /* ⛔ 실제 머리줄에서 읽는다. 사전에만 있고 표에 없는 열, 표에 있고 사전에 없는 열을 **둘 다** 잡는다. */
  const 머리 = fs.readFileSync(p, 'utf8').split('\n')[0].split(',');
  const 사전에없음 = 머리.filter((c) => !열들[c]);
  const 표에없음 = Object.keys(열들).filter((c) => !머리.includes(c));
  if (사전에없음.length) throw new Error(`${파일} 의 열 ${사전에없음.join(' · ')} 이 사전에 없다`);
  if (표에없음.length) throw new Error(`${파일} 사전에 ${표에없음.join(' · ')} 가 있는데 표에는 없다`);
  for (const c of 머리) dict.push([파일, c, ...열들[c]]);
}
fs.writeFileSync(path.join(OUT, 'columns.csv'), csv(dict));

/* ── ⑤ 정의 원문 ── 우리 화면에 가두지 않는다. */
const method = `# Method

How every figure in this bundle is made. This is the same text our build scripts carry, not a summary
written for the sale.

## Which titles count as Korean

Netflix publishes a Top 10 for the world and one for each country. Neither carries a country of
production. We take the list of Korean films and series from Wikidata (country of origin
P495 = Q884) and match on the title text.

**Title text is a weak key, and we do not pretend otherwise.** Netflix splits its global charts by a
title's primary language, so a Korean work belongs on the Non-English chart; we count those only.
That single rule removed 52 titles that were being counted as Korean and are not — *The Perfect
Couple*, *Suits*, *The Circle*, *Hit Man* among them.

Inside the Non-English charts, same-name collisions remain. We hand-checked the largest 30 series and
20 films by hours and removed 8 more (China, Germany, Poland, Thailand, India). Below that line we
stopped eyeballing and **measured instead**: for every title we count, we asked Wikidata which
countries made a film or series with exactly that name.

| Verdict | Titles | Share of viewing |
| --- | ---: | ---: |
| Only Korean works carry this title | ${amb.koreaOnly.titles} | ${amb.koreaOnly.sharePc}% |
| A foreign work shares the title | ${amb.shared.titles} | ${amb.shared.sharePc}% |
| Wikidata gives no country | ${amb.unknown.titles} | ${amb.unknown.sharePc}% |

The \`attribution\` column in \`korean-title-panel.csv\` carries that verdict per title. A shared title
is **not an error** — it is a case we cannot settle from text alone, and it is marked rather than
guessed at or dropped.

## Reach and weeks

\`countries_reached\` is how many of six Southeast Asian markets (Singapore, Malaysia, the
Philippines, Thailand, Indonesia, Vietnam) a title charted in **at any point** across ${titles.weekCount}
weeks. It is not simultaneous. A title that hit Vietnam in 2022 and Thailand in 2024 counts as two.

\`weeks_on_chart\` counts distinct weeks, once per title however many countries it appeared in.

\`peak_rank\` is the best position reached in any of the six.

## K-pop attention

\`kpop-attention-panel.csv\` carries ${kpopRaw.사람.length.toLocaleString()} acts — ${kpop.groups.n} groups and
${kpop.people.n} individuals — measured over ${kpop.days} days (${kpop.period}).

**The number is English Wikipedia article opens, and nothing else.** Not streams, not sales, not chart
position, not attention inside Korea. We use it because it is the only per-artist demand signal
published openly, daily, worldwide, with a history back to 2015. Wikimedia filters out declared bots;
what remains is human traffic, not verified humans.

The roster is a rule, not a list we typed: ${kpop.rosterSource}

That rule matters more than it looks. Selecting groups by \`P31 = musical group\` alone — the obvious
reading — silently dropped Blackpink, Twice, NewJeans, aespa, IVE and Girls' Generation, because
Wikidata types them as *girl group* and never as the parent class. It cost us 404 groups and produced
no error, no zero, and no warning. Walking subclasses (\`P31/P279*\`) is why they are here.

Groups and individuals are **counted apart and never added.** A group's article and its members'
articles are different pages, and summing them counts the same interest twice.

${kpop.actorOverlap.n} of these acts (${kpop.actorOverlap.nPc}%) also appear on our screen-actor roster, because
Wikidata records both occupations for them — Jisoo and Cha Eun-woo really are both. We do not remove
them; we flag them in \`also_on_screen_actor_roster\` and report the size, which is larger than it
sounds: **${kpop.actorOverlap.viewsPc}% of all views in this panel.** Filter that column out and the ranking changes
substantially. Both versions are defensible; the undisclosed one is not.

## Exports

Music: KOSIS table DT_113_STBL_1020468, ${music.yearFrom}–${music.yearTo}, thousands of US dollars as
published. Region parts sum to the published total in every year except three, where they differ by
$1,000 — rounding in the source, not by us.

Broadcast: KOSIS table DT_113_STBL_1025706, ${bcast.yearFrom}–${bcast.yearTo}. **This table classifies
on two levels** — form of export above (finished programmes, format sales, video and DVD, time blocks,
support for overseas Korean broadcasting, other) and type of company below — and returns only the
lower name, so several rows a year read "terrestrial broadcasters" and differ by code alone. Each
company type here is the sum of every export form published for it. Where the survey publishes its own
subtotal, our sum matches it to within $1,000.

Both series are nominal US dollars. No inflation or exchange-rate adjustment has been applied.

## Workforce

FSS DART annual report employee disclosures, filing year ${ind.year}, from every listed company that
discloses both tenure and headcount (${ind.market.n} companies, ${ind.market.staff.toLocaleString()} staff).

Group averages are **weighted by headcount**, so a 3,000-person studio and a 170-person label each
count for their own staff rather than one company one vote. Pay is weighted over companies that
disclose pay only — ${ind.payCoverage.content.pc}% of content staff and ${ind.payCoverage.market.pc}%
of the market. Leaving non-disclosing companies in the denominator averages their staff in at zero,
which is what we were doing until 7 August 2026.

## What is not here

- **Netflix's weekly source tables.** We publish aggregates of them and do not redistribute the rows.
- **Riot Games ladder data.** We collect it daily and it is not in this bundle.
- **Hours viewed by country.** Netflix publishes hours for the global chart only. Nothing here says
  how much anything was watched in any single market.
- **Anything below each Top 10.** A title watched steadily that never breaks a top ten is invisible.
- **Why anything happened.** Release timing, dubbing, marketing spend and recommendation weighting all
  move these numbers and none of them are in the published data.

## Sources

- Netflix Top 10 (Tudum) — https://www.netflix.com/tudum/top10
- Wikidata — https://www.wikidata.org
- KOSIS (Statistics Korea open API), Korea Creative Content Agency 콘텐츠산업조사 — https://kosis.kr
- FSS DART electronic disclosure — https://dart.fss.or.kr
`;
fs.writeFileSync(path.join(OUT, 'method.md'), method);

/* ── ⑥ 읽는 법 ── 맨 먼저 열리는 것. 여기서 못 잰 것을 먼저 말한다. */
const readme = `# K Culture Wire — Korean Content Panel

Sample bundle, ${오늘()}. Ten files. Start here.

## What this is, in six lines

1. **Which Korean titles charted on Netflix in Southeast Asia**, how far and how long — ${panel.length - 1} titles,
   each with **two independent columns** saying how sure we are it is the Korean work and not a foreign
   one of the same name. Two, not one, because one was not enough — see the next section.
2. **Which actor appears in which charting Korean title** — ${cj.length - 1} rows, keyed on Wikidata
   Q-numbers. Netflix does not publish cast; Wikidata does not know the charts. This is the join.
3. **How often each K-pop act was looked up** on English Wikipedia — ${kp.length - 1} acts, ${kpop.days} days.
4. **Every Korean entertainer Wikidata holds a birth date for** — ${ent.length - 1} people, with the
   schools listed for ${ent.slice(1).filter((r) => Number(r[6]) > 0).length} of them. No Netflix, no
   licence question: Wikidata is CC0.
5. **Korea's music and broadcast exports** by year, beside the workforce of its listed content companies.
6. **Everything we have published and had to correct**, with the old value beside the new one.

\`columns.csv\` says what every column in every file means, including what a blank cell means.
\`coverage.csv\` says what is missing and whether it can ever be filled. Read that one before you build on this.

## What filtered this list — there are two rulers, not one

The first question a buyer asks about a panel is what put a row in it. Ours has two answers, and the
second one is newer than the first.

**Ruler one is the name.** Netflix publishes no country of production, so a title enters because its
English name matches a Korean work in Wikidata. That fails in exactly one way — another country made
something with the same name — so we measured how often it can fail. Of ${panel.length - 1} titles,
${패널분포.shared ?? 0} carry a name a foreign work also carries. The \`attribution\` column holds that verdict.

**Ruler two is Korea's own chart.** A Korean title normally also plays in Korea. So for every title we
counted its weeks on Netflix's South Korea top ten. Of the ${패널분포.shared ?? 0} ambiguous titles,
**${큐.한국없음} have never appeared on it**, and ${큐.한나라}
of those charted in exactly one country in the world. The \`korea_chart_weeks\`, \`top_country\`,
\`top_country_pc\` and \`review_queue\` columns hold that, per row.

**Neither ruler decides alone, and we do not hide the disagreement.** A Korean work can miss Korea's
chart because it was released before this data begins in July 2021, because Netflix never streamed it
domestically, or because it lost its week at home — *Vagabond* is a Korean drama and is in the queue.
So ruler two produces an ordered list of rows to read, not a deletion. **Nothing has been removed on
its strength.** What it buys you is that you can sort by it yourself: filter
\`review_queue = one-country-only\` and you are looking at the ${큐.한나라} rows we are least sure of,
with the evidence in the same table.

Anything we do remove will appear in \`corrections.csv\` with the old value beside the new one.

## Read this first: what is empty

We would rather you learn this from us than from a spreadsheet at six in the evening.

| What | How much | Can it be filled? |
| --- | ---: | --- |
| Titles whose name is shared with a foreign work, so the name alone cannot say which one charted | ${패널분포.shared ?? 0} of ${panel.length - 1} rows (${(100 * (패널분포.shared ?? 0) / (panel.length - 1)).toFixed(1)}%) | **Partly, and this changed on 8 August 2026.** We used to say no. Netflix still publishes no country of production, but its Korean chart is a second signal: ${큐.한국없음} of these never appear on it and ${큐.한나라} charted in one country only. That narrows it to a readable queue; it does not close it |
| Titles Wikidata gives no country for | ${패널분포.unknown ?? 0} rows (${(100 * (패널분포.unknown ?? 0) / (panel.length - 1)).toFixed(1)}%) | **Partly** — by a per-title human check we have not done |
| Hours viewed per country | every row | **No.** Netflix publishes hours for the global chart only |
| What sits below each weekly top ten | unknown | **No.** Unpublished, so we cannot even count what is missing |
| Export figures for 2025 and 2026 | 2 years | **Later.** The survey runs about eighteen months behind |
| K-pop acts with no English Wikipedia article — invisible to us entirely | uncountable | **No.** An act with no article produces no row, so we cannot even say how many are missing |
| Entertainers with no school recorded | ${ent.slice(1).filter((r) => Number(r[6]) === 0).length} of ${ent.length - 1} rows (${(100 * ent.slice(1).filter((r) => Number(r[6]) === 0).length / (ent.length - 1)).toFixed(1)}%) | **Partly.** Wikidata carries no educated-at statement for them. The row stays, with the school columns empty — dropping it would read as a claim that the people who do have schools are the whole roster |
| K-pop history before ${kpop.period.slice(0, 4)} | ${kpop.days} days is all there is | **Later.** We began collecting daily this month. The window grows from here |

The same thing is in \`coverage.csv\` in a form you can filter.

**Weighted by viewing rather than by title count, the picture is better** — ${amb.koreaOnly.sharePc}% of hours
sit on titles only Korean works carry. The ambiguity is concentrated in small titles. Both numbers are
below and neither is the real one on its own.

| File | What it is | Rows |
| --- | --- | ---: |
| \`korean-title-panel.csv\` | Every Korean title that charted in six Southeast Asian markets since ${titles.weekFrom.slice(0, 4)} | ${panel.length - 1} |
| \`kpop-attention-panel.csv\` | Every K-pop act with an English Wikipedia article, and how often it was opened over ${kpop.days} days | ${kp.length - 1} |
| \`cast-title-join.csv\` | Which actor appears in which charting Korean title, keyed on Wikidata Q-numbers | ${cj.length - 1} |
| \`entertainer-panel.csv\` | Every Korean entertainer Wikidata holds a birth date for, with occupation and schools | ${ent.length - 1} |
| \`provenance.csv\` | How sure we are that each title is Korean, and how much of the total that covers | ${prov.length - 1} |
| \`industry-panel.csv\` | Korean music and broadcast exports by year, beside the workforce of listed content companies | ${industry.length - 1} |
| \`corrections.csv\` | Every figure we have published and had to change | ${fixes.length - 1} |
| \`coverage.csv\` | What is empty, how much, and whether it can be filled | ${cov.length - 1} |
| \`method.md\` | How each number is made, in the words our build scripts use | — |

## The file you cannot assemble from either source alone

\`cast-title-join.csv\`. **Netflix does not publish cast. Wikidata does not know about Netflix's
charts.** This file is the two of them joined — ${cj.length - 1} rows saying which person appears in
which charting Korean title.

It is keyed on **Wikidata Q-numbers**, for both the person and the title, not on names. That matters
more than it sounds. Joining these two sources on title text attaches cast to only 317 of 1,005
titles, because chart names and article names disagree constantly — *Squid Game* on the chart is
*Squid Game (TV series)* in the encyclopaedia. On Q-numbers it reaches ${cast.출연진이붙은작품} of
${titlesKeyed.맞춘작품수}. We spent a day rebuilding this because we had originally stored the count
of titles per actor and thrown the identifiers away, which made every question of the form *did this
show move its cast* unanswerable.

Names also change — disambiguators get added, romanisation is revised. Q-numbers do not. If you want
to line this month's file up against next month's, join on the Q-number columns.

⚠ ${titlesKeyed.맞춘작품수 - cast.출연진이붙은작품} titles carry no cast statement in Wikidata at all
and are absent here rather than present with an empty cast. ${cast.배우수 - cast.문서있는배우} of the
${cast.배우수} people have no English Wikipedia article, so they are in the join but cannot be matched
to the attention panels. Both counts are in \`coverage.csv\`.

## The column most people will not have seen

\`attribution\`, in the title panel.

Netflix does not say where a title was made. Anyone building a Korean panel has to decide that for
themselves, and the usual way is to match a list of Korean titles against the chart by name. That
works until two countries make something with the same name — and they do, often.

So every row here carries what we think **and how sure we are**:

- \`koreaOnly\` — only Korean works carry this exact title. A name match cannot go wrong.
- \`shared\` — a foreign work shares the name. The \`attribution_countries\` column names them. We do
  not know which one charted, and we say so instead of choosing.
- \`unknown\` — Wikidata gives no country for any work with this name.

Two different numbers, and both matter.

| | Only Korean | Shared name | No country |
| --- | ---: | ---: | ---: |
| This panel, by titles | ${패널분포.koreaOnly ?? 0} | ${패널분포.shared ?? 0} | ${패널분포.unknown ?? 0} |
| Global catalogue, by viewing hours | ${amb.koreaOnly.sharePc}% | ${amb.shared.sharePc}% | ${amb.unknown.sharePc}% |

**The panel has a much higher share of shared names than the global catalogue does.** That is not a
different standard — it is the same test on a different population. Titles that chart in Southeast
Asia without ever reaching the global Top 10 are smaller, and smaller titles carry ordinary English
names far more often. Weighted by viewing, the ambiguity is concentrated in the tail.
If you need a conservative cut, filter to \`koreaOnly\`. If you need coverage, take all of it and
report the share. Either way you can state your own error bound, which is the point.

## \`corrections.csv\`

Every number we have published and then changed, with the old value, the new value and the reason.

We include it because a figure that changes quietly is worse than one that was never published —
somebody has already quoted it. On 7 August 2026 a single flaw in how we matched titles had put wrong
figures on seven pages and four articles at once. All of it is in that file, including the size of
the error.

If you put one of our numbers in a report, this file tells you whether it still stands.

## What we could not measure

Stated plainly, because you will hit these:

1. **${amb.shared.sharePc}% of viewing sits on titles a foreign work shares a name with.** We mark them; we do not
   resolve them. Nothing in the published data resolves them.
2. **Country charts carry no hours.** \`countries_reached\` is chart entry, not viewing. There is no
   viewing figure per market anywhere in Netflix's country data.
3. **Only the top ten exists.** A title watched widely that never breaks a top ten is absent entirely.
4. **Exports are nominal dollars.** Part of every increase is price, not volume. We did not adjust.
5. **Workforce covers listed companies only.** Much of Korean production is private and files nothing.

## Terms

Aggregates and our own attribution work, not redistribution of anyone's source tables. Netflix's
weekly tables and Riot Games ladder data are not in this bundle. KOSIS and DART figures are Korean
public open data and are cited above.

Questions: parkintaek2@gmail.com
`;
fs.writeFileSync(path.join(OUT, 'README.md'), readme);

/* ── 검산 ── 정정 건수가 지면과 어긋나면 둘 중 하나가 빠진 것이다. */
const 지면건수 = pageFix.rows.length;
const 총정정 = fixes.length - 1;
if (총정정 !== 지면건수 + 기사정정.length) throw new Error('정정 건수가 안 맞는다');
if (기사정정.length === 0) throw new Error('기사 정정을 하나도 못 읽었다 — 앞말 파싱이 깨졌다');
/* K팝 패널이 지면 자료와 같은 명단인지. 어긋나면 둘 중 하나가 낡은 것이다. */
if (kp.length - 1 !== kpop.measured) throw new Error(`K팝 줄 수 ${kp.length - 1} ≠ 지면 ${kpop.measured}`);
/* ⛔ 있어야 할 이름이 있는지 **따로** 본다. 8월 7일에 수치가 멀쩡한 채로 블랙핑크가 빠졌다. */
const 온도계 = ['Blackpink', 'BTS', 'Twice', 'NewJeans'];
const 이름들 = new Set(kp.slice(1).map((r) => r[0]));
const 없는것 = 온도계.filter((n) => !이름들.has(n));
if (없는것.length) throw new Error(`K팝 패널에 ${없는것.join('·')} 이 없다 — 명단이 덜 찼다`);

console.log(`한 벌을 ${OUT}/ 에 냈다 — 파일 ${fs.readdirSync(OUT).length}개`);
console.log(` 작품 패널   ${panel.length - 1}줄 (맛보기가 아니라 전부)`);
console.log(` K팝 패널    ${kp.length - 1}줄 (그룹 ${kpop.groups.n} · 개인 ${kpop.people.n} · 배우겹침 ${kp.slice(1).filter((r) => r[8] === 'yes').length})`);
console.log(` 명부 패널   ${ent.length - 1}줄 (학교 적힌 사람 ${ent.slice(1).filter((r) => Number(r[6]) > 0).length} · 이름이 한글인 줄 ${ent.slice(1).filter((r) => r[8] === (String.fromCharCode(121) + String.fromCharCode(101) + String.fromCharCode(115))).length})
 조인 패널   ${cj.length - 1}줄 (작품 ${cast.출연진이붙은작품}/${titlesKeyed.맞춘작품수} · 사람 ${cast.배우수})`);
console.log(` 산업 패널   ${industry.length - 1}줄`);
console.log(` 정정        ${총정정}건 (지면 ${지면건수} · 기사 ${기사정정.length})`);
console.log(` 출처 판정   한국만 ${amb.koreaOnly.sharePc}% · 겹침 ${amb.shared.sharePc}% · 모름 ${amb.unknown.sharePc}%`);

/* ── ⑦ **넷플릭스 없는 한 벌** ──
   2026-08-08. 라이선스 대장에서 넷플릭스 Tudum 재배포 조건이 ⬜ 미확인이다.
   그 확인이 끝날 때까지 위 한 벌은 **파일로 못 연다.** 그런데 안에는
   넷플릭스와 아무 상관 없는 표도 있다 — K팝 관심도(위키미디어)와 상장사 인력(DART·KOSIS)이다.
   ⛔ 확인을 기다리느라 **팔 수 있는 것까지 묶어 두지 않는다.**
   ⚠ 가르는 자는 하나다 — **줄도 고르는 기준도** 넷플릭스에서 안 온 것만 넣는다.
      그래서 조인 패널(cast-title-join)은 **뺀다.** 줄은 위키데이터지만
      「어느 작품을 넣을까」를 넷플릭스 차트가 정했다. 그 선을 흐리지 않는다.
   ⚠ 이건 판단이다. 2번·사장님이 뒤집으실 수 있게 **따로** 낸다. 위 한 벌은 그대로 둔다. */
const OUT2 = 'docs/상품안/본보기-한벌-넷플릭스없이';
fs.mkdirSync(OUT2, { recursive: true });
for (const f of fs.readdirSync(OUT2)) fs.unlinkSync(path.join(OUT2, f));
/* ⛔ 여기서 **내 규칙에 내가 걸렸다.** K팝 표의 마지막 열
   also_on_screen_actor_roster 는 「넷플릭스 차트에 오른 작품에 나오나」다 —
   값 자체가 **넷플릭스가 고른 명단**에서 나온다. 「줄도 고르는 기준도 깨끗한 것만」이
   내가 방금 적은 선인데 이 열이 그 선을 넘는다. **뺀다.**
   ⚠ 위 한 벌에는 그대로 둔다. 거기는 넷플릭스 표가 이미 있다. */
const kp2 = kp.map((r) => r.slice(0, -1));
fs.writeFileSync(path.join(OUT2, 'kpop-attention-panel.csv'), csv(kp2));
fs.writeFileSync(path.join(OUT2, 'industry-panel.csv'), csv(industry));
fs.writeFileSync(path.join(OUT2, 'corrections.csv'), csv(fixes));
/* ⭐ 명부 패널은 **줄도 고르는 기준도 위키데이터**다 — CC0 이고 넷플릭스가 한 글자도 안 닿았다.
   그래서 이 한 벌에 그대로 들어간다. 위 한 벌과 같은 파일이다(자르지 않는다). */
fs.writeFileSync(path.join(OUT2, 'entertainer-panel.csv'), csv(ent));


/* 사전·빈칸 — 위 한 벌과 **같은 뜻 표**에서 뽑는다. 두 벌이 갈라지지 않게 한다. */
{
  const 실린표 = ['kpop-attention-panel.csv', 'entertainer-panel.csv', 'industry-panel.csv', 'corrections.csv'];
  const dict2 = [['file', 'column', 'what_it_is', 'unit', 'what_a_blank_cell_means']];
  for (const 파일 of 실린표) {
    const 머리 = fs.readFileSync(path.join(OUT2, 파일), 'utf8').split('\n')[0].split(',');
    for (const c of 머리) dict2.push([파일, c, ...뜻[파일][c]]);
  }
  fs.writeFileSync(path.join(OUT2, 'columns.csv'), csv(dict2));

  const cov2 = [['field', 'rows', 'unresolved', 'pc_unresolved', 'fillable', 'what_blocks_it']];
  cov2.push(['K-pop acts with no English Wikipedia article', 'uncountable', 'uncountable', 'unknown', 'no',
    'An act without an article produces no row at all, so we cannot even count how many are missing. Every share in this panel is computed over the acts we can see.']);
  cov2.push(['listed companies that disclose headcount but not pay', ind.payCoverage?.total ?? 'see note',
    ind.payCoverage?.missing ?? 'see note', ind.payCoverage?.missingPc ?? 'see note', 'no',
    'The filing is optional for that field. Companies missing it are excluded from pay figures rather than averaged in at zero.']);
  cov2.push(['export figures for 2025 and 2026', '2 years', '2 years', 100, 'later',
    'The Content Industry Survey runs about eighteen months behind. We add years as they are published.']);
  cov2.push(['anything derived from Netflix charts', 'not included', 'not included', 'n/a', 'later',
    'Deliberately excluded from this bundle while the redistribution terms of the chart source are confirmed. The fuller bundle carries those tables.']);
  fs.writeFileSync(path.join(OUT2, 'coverage.csv'), csv(cov2));

  const readme2 = `# Korean culture data — the part that carries no chart licence question

Three panels and our corrections record. **Nothing in this bundle is derived from Netflix's charts**,
which is the whole point of it: it can be used today without waiting on anything.

## What this is, in five lines

1. **How often each K-pop act was looked up** on English Wikipedia — ${kp.length - 1} acts and members,
   ${kpop.days} days, daily. Groups and individuals are marked separately, and so are the ones who are
   also screen actors.
2. **Every Korean entertainer Wikidata holds a birth date for** — ${ent.length - 1} people, their
   occupation as Wikidata files it, and the schools listed for
   ${ent.slice(1).filter((r) => Number(r[6]) > 0).length} of them.
3. **Korea's music and broadcast exports** by year and by region, beside the workforce of its listed
   content companies — ${industry.length - 1} rows.
4. **Everything we have published and had to correct**, with the old value beside the new one.
5. \`columns.csv\` says what every column means, including what a blank cell means. \`coverage.csv\`
   says what is missing and whether it can ever be filled.

## Why this bundle exists separately

Our fuller bundle includes a panel of Korean titles on Netflix. The redistribution terms for that
chart source are still being confirmed, and **we check a licence before we publish, not after.**

Rather than hold back the tables that have no such question, we cut them out into this one. The rule
we used is strict: a table is here only if **both its rows and the choice of which rows to include**
come from sources with no open question.

That rule cost us a column as well as a table. The K-pop panel in the fuller bundle carries a flag
saying whether an act also appears in a charting screen title; it is dropped here, because whether
someone is on that roster is decided by which titles reached a Netflix chart. Same line, applied to
a column rather than a file.

That is why the actor-to-title join is **not** here. Its rows are Wikidata statements, but which
titles it covers was decided by the Netflix charts, and we would rather draw the line clearly than
argue about the edge.

## Sources

| Panel | Source | Status |
| --- | --- | --- |
| K-pop attention | Wikimedia Pageviews API (en.wikipedia); roster from Wikidata | open |
| Entertainer roster | Wikidata SPARQL (P27=Q884, P569, P106, P69) | CC0 — public domain |
| Music and broadcast exports | Content Industry Survey via KOSIS | open |
| Listed workforce | FSS DART annual report employee disclosures | confirmed unrestricted, 2026-08-05 |

## Read this before you build on it

**These are lookups, not listens.** The K-pop figure counts how many times an English Wikipedia page
was opened. It is curiosity, not consumption, and nobody should convert it into streams or sales.

**An act with no English article is invisible here.** It produces no row, so it cannot be counted as
a zero — it is simply absent, and we cannot say how many are.

**The survey years run behind.** 2025 and 2026 are not published yet.

Every figure in this bundle is produced by a build script from the same files our public pages read.
When a number changes on the site it changes here, and the change is written into \`corrections.csv\`.

Questions: parkintaek2@gmail.com
`;
  fs.writeFileSync(path.join(OUT2, 'README.md'), readme2);
  console.log(`넷플릭스 없는 한 벌 → ${OUT2}/ 파일 ${fs.readdirSync(OUT2).length}개`
    + ` (K팝 ${kp.length - 1}줄 · 명부 ${ent.length - 1}줄 · 산업 ${industry.length - 1}줄 · 정정 ${fixes.length - 1}건)`);
}
