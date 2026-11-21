/**
 * 리서치 인덱스 생성기 — 66,071 파일을 한 개로 접는다.
 *
 * ── 왜 필요한가 ──────────────────────────────────────────────────
 * `/v1/research` 가 지금 503 이다. API 가 `archive/raw/research/{날짜}/{id}.json` 을
 * 읽는데 **그 폴더는 `.gitignore` 라 Cloudtype 컨테이너에 없다.**
 * 원본은 R2 에 다 올라가 있지만, 거기서 직접 읽는 것도 답이 아니다 —
 * ListObjectsV2 는 한 번에 1,000키라 **66,071 건을 훑으려면 왕복 66회**다.
 * 요청 하나에 그걸 시킬 수는 없다.
 *
 * 그래서 **읽기용 인덱스 한 개**를 따로 만든다.
 *
 *   원본  archive/raw/research/{날짜}/{id}.json   66,071 파일 · 183MB   ← 해자. 그대로 둔다
 *   인덱스 archive/index/research.ndjson(.gz)     1 파일 · 약 7MB/2MB   ← API 가 읽는 것
 *
 * **원본을 대체하지 않는다.** 인덱스는 언제든 원본에서 다시 만들 수 있는 파생물이고,
 * 잃어도 되는 것이다. 잃으면 안 되는 것은 원본이다.
 *
 * ── 왜 NDJSON 인가 ──────────────────────────────────────────────
 * 한 줄 한 레코드라 **부분만 읽고 끊을 수 있다.** JSON 배열이면 마지막 `]` 까지
 * 받아야 파싱이 시작된다. 그리고 나중에 이걸 그대로 파는 형태로 쓸 수 있다 —
 * 데이터 판매의 표준 납품 형식이 NDJSON 이다.
 *
 * ── 정렬 ────────────────────────────────────────────────────────
 * **최신순으로 미리 정렬해 둔다.** API 의 기본 질의가 「최근 N건」이라
 * 정렬돼 있으면 앞에서 limit 만큼 끊고 멈추면 된다. 매 요청 정렬은 낭비다.
 *
 * 실행
 *   node scripts/build-research-index.mjs           로컬 archive/index/ 에만 쓴다
 *   node scripts/build-research-index.mjs --upload  R2 에도 올린다
 *
 * ⚠ `--upload` 는 옆 세션(klifemap) 회신 전까지 쓰지 않는다.
 *   R2 계정을 같이 쓰는지 확인 중이다 — `docs/세션간-메모.md` 참조.
 */

import { readdir, readFile, mkdir, writeFile, stat } from 'node:fs/promises';
import { gzip } from 'node:zlib';
import { promisify } from 'node:util';
import path from 'node:path';

const gzipAsync = promisify(gzip);

const ARCHIVE = path.resolve(process.env.ARCHIVE_DIR ?? 'archive');
const OUT_DIR = path.join(ARCHIVE, 'index');

/** 인덱스 키는 짧게 쓴다. 66,071줄이라 키 이름 한 글자가 곧 용량이다. */
const 압축 = (r, 상세) => ({
  d: r.date ?? null,
  h: r.house ?? null,
  s: r.stock ?? null,
  /** 목표주가를 **제시하지 않은 리포트가 실제로 있다.**  */
  p: r.targetPrice ?? null,
  o: r.opinion ?? null,
  /*
   * 🔴 2026-08-03 KST — **원본에 있어도 인덱스에 싣지 않는다.**
   *   수집기의 애널리스트 정규식이 본문의 「애널리스트 대상으로」·「애널리스트 간담회」에서
   *   뒷말을 이름으로 집어 왔다. 66,071건 중 170건이 그렇게 채워졌고 **한 건도 사람 이름이 아니었다.**
   *   수집기는 고쳤지만 **이미 받아 둔 원본 183MB 에는 그 값이 그대로 남아 있다.**
   *   원본을 고쳐 쓰지 않는다 — 받은 것은 받은 대로 두는 것이 아카이브다.
   *   대신 **파생물인 인덱스에서 거른다.** 인덱스는 언제든 다시 만들 수 있다.
   */
  a: null,
  /** 상세를 받았는가. `p:null` 이 「없다」인지 「아직 안 봤다」인지 구분한다 */
  f: 상세,
  /** 어디서 왔나. `naver` = 집계 사이트 경유 · `direct` = 증권사 자사 사이트 */
  src: 'naver',
});

/**
 * 증권사 자사 사이트에서 직접 받은 것.
 * 필드 이름이 네이버 경로와 다르다(`broker`/`subject`/`rating`) — 여기서 맞춘다.
 *
 * ⭐ **이 갈래에만 애널리스트 이름이 있다.** 네이버 화면에는 안 나오기 때문이다.
 */
const 압축직접 = (r) => ({
  d: r.date ?? null,
  h: r.broker ?? null,
  s: r.subject ?? null,
  p: r.targetPrice ?? null,
  o: r.rating ?? null,
  a: r.analyst ?? null,
  f: true,
  src: 'direct',
});

/** 같은 리포트인가를 가리는 자연키. 두 경로에 같은 건이 들어와 겹친다. */
const 자연키 = (r) => `${r.d ?? ''}|${r.h ?? ''}|${r.s ?? ''}`;

/**
 * 증권사 직접 수집분을 훑는다.
 *
 * 파일 이름이 `{증권사}-{리포트번호}.json` 이라 네이버 경로의 nid 와 절대 겹치지 않는다.
 * 그래도 **자연키는 반드시 등록한다** — 뒤에 오는 네이버 갈래가 같은 리포트를
 * 또 넣지 않게 하려는 것이다.
 */
async function 갈래훑기직접(root, 담을곳, 키색인) {
  const base = path.join(ARCHIVE, root);
  let days;
  try {
    days = (await readdir(base)).sort();
  } catch {
    console.log(`  ${root} — 없음. 건너뛴다`);
    return { 읽음: 0, 깨짐: 0, 이름: 0 };
  }
  let 읽음 = 0;
  let 깨짐 = 0;
  let 이름 = 0;
  for (const day of days) {
    let files;
    try {
      files = await readdir(path.join(base, day));
    } catch {
      continue;
    }
    for (const f of files) {
      if (!f.endsWith('.json')) continue;
      try {
        const j = JSON.parse(await readFile(path.join(base, day, f), 'utf8'));
        const 줄 = 압축직접(j);
        const key = `direct:${f.slice(0, -5)}`;
        담을곳.set(key, 줄);
        키색인.set(자연키(줄), key);
        읽음++;
        if (줄.a) 이름++;
      } catch {
        깨짐++;
      }
    }
  }
  return { 읽음, 깨짐, 이름 };
}

/**
 * 한 갈래를 훑는다.
 *
 * 상세(`research`)가 목록(`research-list`)보다 정보가 많다. 그래서 상세를 먼저 읽고,
 * 목록은 **상세에 없는 것만** 채운다. `api.mjs` 의 readResearch 와 같은 우선순위다.
 */
async function 갈래훑기(root, 상세, 담을곳, 키색인) {
  const base = path.join(ARCHIVE, root);
  let days;
  try {
    days = (await readdir(base)).sort();
  } catch {
    console.log(`  ${root} — 없음. 건너뛴다`);
    return { 읽음: 0, 깨짐: 0 };
  }

  let 읽음 = 0;
  let 깨짐 = 0;
  let 겹침 = 0;
  for (const day of days) {
    let files;
    try {
      files = await readdir(path.join(base, day));
    } catch {
      continue;
    }
    for (const f of files) {
      if (!f.endsWith('.json')) continue;
      const nid = f.slice(0, -5);
      if (담을곳.has(nid)) continue; // 상세가 이미 넣었다
      try {
        const j = JSON.parse(await readFile(path.join(base, day, f), 'utf8'));
        const 줄 = 압축(j, 상세);
        /*
         * ⚠ 같은 리포트가 두 경로로 들어온다.
         *   네이버도 미래에셋 리포트를 싣는다. 그냥 넣으면 **한 건이 두 건으로 세어진다** —
         *   적중률을 파는 매체에서 건수가 부풀면 그 자체가 오보다.
         *   먼저 들어온 쪽(직접 수집)이 애널리스트를 갖고 있으므로 **그쪽을 살리고
         *   빠진 값만 채운다.**
         */
        const k = 자연키(줄);
        const 기존id = 키색인?.get(k);
        if (기존id) {
          const 기존 = 담을곳.get(기존id);
          /*
           * 🔴 **직접 수집분과 겹칠 때만 병합한다.**
           *   처음엔 조건 없이 병합했더니 네이버 레코드끼리도 묶여 **130건이 사라졌다**
           *   (66,093 → 65,975). 같은 증권사가 같은 날 같은 종목에 리포트를 두 건
           *   내는 일은 실제로 있다 — 조간 코멘트와 기업 업데이트가 그렇다.
           *   그걸 한 건으로 접으면 **없던 손실을 우리가 만든다.**
           *   자연키는 두 경로의 중복을 막으려고 만든 것이지 원본을 줄이려는 게 아니다.
           */
          if (기존 && 기존.src === 'direct') {
            기존.p ??= 줄.p;
            기존.o ??= 줄.o;
            기존.a ??= 줄.a;
            겹침++;
            continue;
          }
        }
        담을곳.set(nid, 줄);
        키색인?.set(k, nid);
        읽음++;
      } catch {
        // 깨진 파일 하나가 인덱스 전체를 죽이지 않게 한다. 다만 **세어서 보고한다** —
        // 조용히 넘어가면 며칠 뒤 「왜 건수가 다르지」로 돌아온다.
        깨짐++;
      }
    }
  }
  return { 읽음, 깨짐, 겹침 };
}

async function main() {
  const 업로드 = process.argv.includes('--upload');
  const t0 = Date.now();

  console.log('리서치 인덱스를 만든다');
  console.log(`  원본 ${ARCHIVE}`);

  const 레코드 = new Map();
  /* 자연키(날짜|증권사|종목) → 파일키. 두 경로에 같은 리포트가 들어와 겹치는 걸 막는다. */
  const 키색인 = new Map();

  /*
   * ⭐ **직접 수집분을 먼저 읽는다.** 순서가 뜻을 갖는다.
   *   네이버 경로에는 애널리스트 이름이 없다. 직접 수집분에는 있다.
   *   나중에 읽으면 이미 자리를 차지한 네이버 레코드에 밀려 이름이 버려진다.
   */
  console.log('  raw/broker (증권사 직접) …');
  const 직접결과 = await 갈래훑기직접('raw/broker', 레코드, 키색인);
  console.log(
    `    ${직접결과.읽음.toLocaleString()}건 · 애널리스트 ${직접결과.이름.toLocaleString()}` +
      `${직접결과.깨짐 ? ` · 깨짐 ${직접결과.깨짐}` : ''}`,
  );

  console.log('  raw/research (상세) …');
  const 상세결과 = await 갈래훑기('raw/research', true, 레코드, 키색인);
  console.log(
    `    ${상세결과.읽음.toLocaleString()}건${상세결과.겹침 ? ` · 직접분과 겹쳐 병합 ${상세결과.겹침}` : ''}` +
      `${상세결과.깨짐 ? ` · 깨짐 ${상세결과.깨짐}` : ''}`,
  );

  console.log('  raw/research-list (목록) …');
  const 목록결과 = await 갈래훑기('raw/research-list', false, 레코드, 키색인);
  console.log(
    `    ${목록결과.읽음.toLocaleString()}건 추가${목록결과.겹침 ? ` · 병합 ${목록결과.겹침}` : ''}` +
      `${목록결과.깨짐 ? ` · 깨짐 ${목록결과.깨짐}` : ''}`,
  );

  /* 최신순. 같은 날짜 안의 순서는 의미가 없으므로 건드리지 않는다. */
  const 줄 = [...레코드.values()].sort((a, b) => (b.d ?? '').localeCompare(a.d ?? ''));

  if (줄.length === 0) {
    console.error('✕ 레코드가 0건이다. archive/ 경로를 확인하라.');
    process.exit(1);
  }

  const ndjson = 줄.map((r) => JSON.stringify(r)).join('\n') + '\n';
  const gz = await gzipAsync(Buffer.from(ndjson, 'utf8'), { level: 9 });

  /* 통계는 인덱스와 함께 만든다. /v1/meta 가 이걸 그대로 쓴다 —
     매 요청에 66,071줄을 세는 것은 낭비다. */
  const 기관 = new Set();
  const 종목 = new Set();
  let 목표주가있음 = 0;
  let 상세받음 = 0;
  let 최초 = null;
  let 최신 = null;
  for (const r of 줄) {
    if (r.h) 기관.add(r.h);
    if (r.s) 종목.add(r.s);
    if (r.p !== null) 목표주가있음++;
    if (r.f) 상세받음++;
    if (r.d) {
      if (!최초 || r.d < 최초) 최초 = r.d;
      if (!최신 || r.d > 최신) 최신 = r.d;
    }
  }

  const meta = {
    generated_at_kst: new Date().toLocaleString('sv-SE'), // 이 PC 는 KST 다. toISOString 은 UTC 라 안 쓴다
    records: 줄.length,
    detail_fetched: 상세받음,
    with_target_price: 목표주가있음,
    brokers: 기관.size,
    subjects: 종목.size,
    first_day: 최초,
    latest_day: 최신,
    bytes_ndjson: Buffer.byteLength(ndjson),
    bytes_gzip: gz.length,
  };

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(path.join(OUT_DIR, 'research.ndjson'), ndjson);
  await writeFile(path.join(OUT_DIR, 'research.ndjson.gz'), gz);
  await writeFile(path.join(OUT_DIR, 'research.meta.json'), JSON.stringify(meta, null, 2));

  /*
   * ⭐ 2026-08-03 KST — **화면이 읽을 통계를 저장소에 커밋한다.**
   *
   * `/api` 페이지에 「66,071건」이 손으로 박혀 있었는데, 오늘 인덱스를 다시 만드니
   * 실물은 66,093건이 됐다. **하루 만에 문서와 실물이 또 갈라졌다.**
   * 오늘만 세 번 같은 일을 했다 — 사전 커버리지 74→81.5→86.1%.
   *
   * 사람이 옮겨 적는 한 반드시 어긋난다. 그래서 **옮겨 적는 일 자체를 없앤다.**
   *
   * ⚠ 인덱스 본체(0.6MB)는 커밋하지 않는다. archive/ 는 .gitignore 다.
   *   빌드는 Cloudtype 컨테이너에서 도는데 거기엔 archive/ 가 없다.
   *   그래서 **숫자만 담은 작은 파일**을 src/data 에 두고 페이지가 import 한다.
   */
  const 화면통계 = {
    records: meta.records,
    first_day: meta.first_day,
    latest_day: meta.latest_day,
    brokers: meta.brokers,
    subjects: meta.subjects,
    with_target_price: meta.with_target_price,
    generated_at_kst: meta.generated_at_kst ?? null,
    note: 'scripts/build-research-index.mjs 가 만든다. 손으로 고치지 말 것 — 다음 실행에 덮인다.',
  };
  const 화면경로 = path.resolve('src/data/research-stats.json');
  await mkdir(path.dirname(화면경로), { recursive: true });
  await writeFile(화면경로, JSON.stringify(화면통계, null, 2) + '\n');

  const MB = (n) => (n / 1048576).toFixed(1) + 'MB';
  console.log('');
  console.log(`  ${meta.records.toLocaleString()}건 · ${meta.first_day} ~ ${meta.latest_day}`);
  console.log(`  기관 ${meta.brokers} · 종목 ${meta.subjects.toLocaleString()} · 목표주가 ${meta.with_target_price.toLocaleString()}`);
  console.log(`  ${MB(meta.bytes_ndjson)} → gzip ${MB(meta.bytes_gzip)}`);
  console.log(`  ${OUT_DIR}`);
  console.log(`  ${((Date.now() - t0) / 1000).toFixed(1)}초`);

  if (!업로드) {
    console.log('');
    console.log('  R2 에는 올리지 않았다. 올리려면 --upload');
    return;
  }

  /* 업로드는 여기서만 store 를 부른다. 로컬 생성만 할 때는 R2 설정을 아예 안 건드린다. */
  const { put, remoteEnabled } = await import('../src/lib/store.mjs');
  if (!remoteEnabled) {
    console.error('✕ R2 설정이 없다(ARCHIVE_S3_*). 업로드하지 않는다.');
    process.exit(1);
  }
  console.log('');
  console.log('  R2 업로드 …');
  for (const [key, body, type] of [
    ['index/research.ndjson.gz', gz, 'application/gzip'],
    ['index/research.meta.json', JSON.stringify(meta, null, 2), 'application/json'],
  ]) {
    const r = await put(key, body, type);
    if (r.remoteError) {
      console.error(`  ✕ ${key} — ${r.remoteError}`);
      process.exit(1);
    }
    console.log(`  ✅ ${key}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
