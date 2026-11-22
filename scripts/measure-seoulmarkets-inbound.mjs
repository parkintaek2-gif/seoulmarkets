#!/usr/bin/env node
/**
 * measure-seoulmarkets-inbound.mjs — **지면마다 «들어오는 안쪽 링크»가 몇 «장»에서 오나.** 갈래별로 센다.
 *
 * ── 왜 (2026-08-29, 5번 measure-kcw-inbound 의 SeoulMarkets 판) ─────────────
 * 5번이 KCW 회사 지면 19장 중 11장이 목록 «한 곳»에서만 걸린 걸 이 자로 찾았고, 전 유닛에
 * 같은 걸 재라 했다. 나(6번)의 병목은 «순위»다(‏/article 평균 13위=2페이지, 클릭 0).
 * 순위를 올리는 가장 큰 안쪽 힘이 **인입 링크**다 — 어디로도 안 걸린 지면은 사이트맵에
 * 있어도 「이 사이트가 중요히 안 여기는 지면」으로 읽힌다. 나는 나라별 61장·기사 클러스터가
 * 많아 특히 이걸 재야 한다. 나가는 링크(check-seoulmarkets-broken-links)의 **반대쪽**이다.
 *
 * ── 재는 것 ────────────────────────────────────────────
 * SeoulMarkets 소유 지면(dist 루트 *.html + article/·trade/·tag/)만 훑어 지면마다 «들어오는»
 * 링크가 몇 «장»에서 오는지 갈래별로 센다. 같은 지면이 두 번 걸어도 하나다(「한 곳에서만
 * 걸린다」가 진짜 위험 신호). ⚠ 자기가 자기를 거는 것(꼬리말·차림표)은 안 센다.
 * ⚠ wikitip·100y·동적 API(/v1)는 남의 것이라 뺀다. ⛔ 빈 목록은 0 이 아니라 «못 잰 것»이다.
 * ⛔ 「인입 적어서 색인 안 된다」로 단정하지 않는다 — 색인은 구글이 정한다. 여기서 말할 수
 *   있는 것은 「우리 안에서 아무 데서도 안 걸린다」까지다.
 *
 * 쓰는 법  node scripts/measure-seoulmarkets-inbound.mjs [--갈래=article] [--몇장=20]
 *          node scripts/measure-seoulmarkets-inbound.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(뿌리, 'dist');
// 같은 dist 를 쓰는 남의 사이트 — 링크 목적지·홈에서 뺀다(섞으면 전부 헛경보).
const 남의갈래 = new Set(['wikitip', '100y']);
const 남의홈 = new Set(['100y.html', 'wikitip.html']);
// 정적 지면이 아니라 서버가 동적으로 서빙하는 네임스페이스(/v1/* = 데이터 API). dist 에 없지만 라이브 200.
const 동적네임 = new Set(['v1']);

export const 자원끝 = /\.(png|jpg|jpeg|webp|avif|svg|json|xml|css|js|mjs|ico|txt|csv|tsv|pdf|mp4|mp3|webm|gif|woff2?|ttf|zip)$/i;

/** 지면 파일 하나 → 손님이 보는 주소. dist/article/x.html → /article/x, dist/index.html → / */
export function 지면주소(상대길) {
  const s = String(상대길).split(path.sep).join('/');
  const 벗 = s.replace(/^dist\/?/, '').replace(/(?:^|\/)index\.html$/, '').replace(/\.html$/, '');
  return '/' + 벗;
}

/**
 * 갈래 이름 — 주소의 첫 칸. 칸이 하나뿐(‏/fx·/macro·/trade 목록)이면 «홑장»으로 묶는다.
 * ⇒ /article/x → article, /trade/vietnam → trade, /fx → (홑장), / → (첫 지면)
 */
export function 갈래(주소) {
  const 칸 = String(주소).replace(/^\//, '').split('/').filter(Boolean);
  if (칸.length === 0) return '(첫 지면)';
  if (칸.length === 1) return '(홑장)';
  return 칸[0];
}

/** 나가는 안쪽 링크. ⛔ 자원·앵커·물음표·남의갈래·동적네임은 지면이 아니다 */
export function 나가는링크들(html) {
  const 다 = [...String(html).matchAll(/<a\s[^>]*href="(\/[^"#?]*)"/g)].map((m) => m[1]);
  return [...new Set(다)]
    .map((h) => h.replace(/\/$/, '') || '/')
    .filter((h) => {
      if (h === '/' || 자원끝.test(h)) return false;
      const 첫 = h.replace(/^\//, '').split('/')[0];
      return !남의갈래.has(첫) && !동적네임.has(첫);
    });
}

/** 가운데값. ⛔ 빈 목록이면 0 이 아니라 null — 못 잰 것을  */
export function 가운데(수들) {
  const s = [...수들].filter(Number.isFinite).sort((a, b) => a - b);
  if (!s.length) return null;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** 갈래마다 셈. @param 표 Map(주소 → Set(그 지면을 «거는» 지면 주소들)) */
export function 갈래별셈(표) {
  const 통 = new Map();
  for (const [주소, 거는것] of 표) {
    const g = 갈래(주소);
    if (!통.has(g)) 통.set(g, { 갈래: g, 지면: 0, 없음: 0, 한곳: 0, 수들: [], 굶은것: [] });
    const t = 통.get(g);
    const n = 거는것.size;
    t.지면 += 1;
    t.수들.push(n);
    if (n === 0) { t.없음 += 1; t.굶은것.push(주소); }
    else if (n === 1) t.한곳 += 1;
  }
  return [...통.values()]
    .map((t) => ({ ...t, 가운데: 가운데(t.수들) }))
    .sort((a, b) => (b.없음 + b.한곳) - (a.없음 + a.한곳) || b.지면 - a.지면);
}

/** SeoulMarkets 지면만: dist 루트 *.html(남의 홈 뺀) + article/·trade/·tag/ */
export function 지면들(dist = DIST) {
  const 낸다 = [];
  let 루트; try { 루트 = fs.readdirSync(dist, { withFileTypes: true }); } catch { return []; }
  for (const f of 루트) if (f.isFile() && f.name.endsWith('.html') && !남의홈.has(f.name)) 낸다.push(path.join(dist, f.name));
  const 훑기 = (곳) => {
    let 목록; try { 목록 = fs.readdirSync(곳, { withFileTypes: true }); } catch { return; }
    for (const f of 목록) {
      const p = path.join(곳, f.name);
      if (f.isDirectory()) 훑기(p);
      else if (f.name.endsWith('.html')) 낸다.push(p);
    }
  };
  for (const 갈 of ['article', 'trade', 'tag']) 훑기(path.join(dist, 갈));
  return 낸다;
}

/* ── 자가시험 ─────────────────────────────────────────── */
if (process.argv.includes('--자가시험') || process.argv.includes('--selftest')) {
  let 셈 = 0;
  const 본다 = (말, 참) => { 셈 += 1; console.log(참 ? '✅' : '🔴', 말); if (!참) process.exitCode = 1; };

  본다('① 파일 이름을 주소로', 지면주소('dist/article/korea-real-wages-flat-since-2021.html') === '/article/korea-real-wages-flat-since-2021');
  본다('② index.html 은 칸 이름이 주소', 지면주소('dist/trade/index.html') === '/trade');
  본다('③ 루트 index 는 / 다', 지면주소('dist/index.html') === '/');
  본다('④ 갈래는 첫 칸', 갈래('/article/x') === 'article' && 갈래('/trade/vietnam') === 'trade');
  본다('⑤ 칸 하나면 홑장(‏/fx·/trade 목록)', 갈래('/fx') === '(홑장)' && 갈래('/trade') === '(홑장)');
  본다('⑥ 뿌리는 첫 지면', 갈래('/') === '(첫 지면)');

  본다('⑦ 나가는 링크 뽑기', 나가는링크들('<a href="/article/x">x</a>')[0] === '/article/x');
  본다('⑧ 자원 제외', 나가는링크들('<a href="/charts/x.svg">x</a>').length === 0);
  본다('⑨ 끝 빗금 떼어 같은 주소', 나가는링크들('<a href="/trade/vietnam/">x</a>')[0] === '/trade/vietnam');
  본다('⑩ 🔴 남의 갈래(/wikitip)·동적(/v1) 제외', 나가는링크들('<a href="/wikitip/person/iu">x</a><a href="/v1/countries">y</a>').length === 0);
  본다('⑪ 같은 주소 두 번 안 셈', 나가는링크들('<a href="/a/b">1</a><a href="/a/b">2</a>').length === 1);

  본다('⑫ 가운데값', 가운데([1, 3, 5]) === 3 && 가운데([1, 3]) === 2);
  본다('⑬ ⛔ 빈 목록은 0 아니라 못잼', 가운데([]) === null);

  const 표 = new Map([
    ['/article/a', new Set()],
    ['/article/b', new Set(['/article/index'])],
    ['/article/c', new Set(['/article/index', '/macro'])],
    ['/trade/vietnam', new Set(['/trade', '/article/x', '/macro'])],
  ]);
  const 셈표 = 갈래별셈(표);
  const a = 셈표.find((t) => t.갈래 === 'article');
  본다('⑭ 갈래마다 지면 수', a.지면 === 3);
  본다('⑮ 아무 데서도 안 걸리는 것', a.없음 === 1);
  본다('⑯ 한 곳에서만 걸리는 것', a.한곳 === 1);
  본다('⑰ 굶은 지면 주소 남김', a.굶은것[0] === '/article/a');
  본다('⑱ 굶은 갈래가 먼저', 셈표[0].갈래 === 'article');

  console.log(`\n${process.exitCode ? '❌' : '✅'} measure-seoulmarkets-inbound 자가시험 (${셈})`);
  process.exit();
}

/* ── 몸 ───────────────────────────────────────────────── */
if (!fs.existsSync(DIST)) { console.log('⬜ dist 가 없다 — **못 쟀다.** npm run build 를 먼저'); process.exit(0); }
const 지면 = 지면들();
if (!지면.length) { console.log('⬜ SeoulMarkets 지면이 dist 에 없다 — **못 쟀다.** 빌드 먼저'); process.exit(0); }

/**
 * 🔴 [2026-09-05 · 5번 지적] 여섯 유닛이 같은 dist 를 쓴다 — 옆 유닛이 빌드 중이면
 * 이 자가 «절반쯤 쓰인 dist»를 읽는다(2,798장 → 743장 → 폴더 없어짐, 실측 사례).
 * ⛔ 그 수로 「고립 폭증」을 보고하면 없는 결함을 만든다. 짐작 표식 대신 «전에 본 가장
 * 큰 장수»를 파일에 적어 두고 견준다(5번의 3판 안전장치 — 사이트맵 유무로는 못 가른다).
 */
const 기준길 = path.join(뿌리, 'src/data/seoulmarkets-inbound-baseline.json');
let 기준 = { 가장많이본것: 0 };
try { 기준 = JSON.parse(fs.readFileSync(기준길, 'utf8')); } catch {}
if (기준.가장많이본것 > 0 && 지면.length < 기준.가장많이본것 / 2) {
  console.log(`⬜ 지면 ${지면.length}장 — 전에 본 가장 많은 것(${기준.가장많이본것}장)의 절반 아래다.`);
  console.log('   반쯤 쓰인 dist 로 보인다 — **못 쟀다.** 다른 유닛의 빌드가 끝난 뒤 다시 돈다.');
  process.exit(0);
}
if (지면.length > 기준.가장많이본것) {
  try { fs.writeFileSync(기준길, JSON.stringify({ 가장많이본것: 지면.length, 잰때: new Date().toISOString() }, null, 1)); } catch {}
}

const 고른갈래 = (process.argv.find((a) => a.startsWith('--갈래=')) ?? '').split('=')[1] ?? null;
const 몇장 = Number((process.argv.find((a) => a.startsWith('--몇장=')) ?? '').split('=')[1] ?? 12);

/** 주소 → 그 지면을 «거는» 지면들 */
const 표 = new Map(지면.map((p) => [지면주소(path.relative(뿌리, p)), new Set()]));
let 못읽은것 = 0;

for (const p of 지면) {
  let 글; try { 글 = fs.readFileSync(p, 'utf8'); } catch { 못읽은것 += 1; continue; }
  const 나 = 지면주소(path.relative(뿌리, p));
  for (const h of 나가는링크들(글)) {
    if (h === 나) continue;              /* ⛔ 자기가 자기를 거는 것은 안 센다 */
    if (표.has(h)) 표.get(h).add(나);
  }
}

const 셈표 = 갈래별셈(표);
const 보일것 = 고른갈래 ? 셈표.filter((t) => t.갈래 === 고른갈래) : 셈표;

console.log('\n■ SeoulMarkets — 지면마다 «들어오는 안쪽 링크»가 몇 «장»에서 오나 (갈래별)\n');
console.log(`  지면 ${지면.length.toLocaleString('ko-KR')}장` + (못읽은것 ? ` · ⬜ 못 읽은 것 ${못읽은것}장` : ''));
console.log('\n  갈래            지면    ⛔0곳   ⚠1곳   가운데');
console.log('  ' + '─'.repeat(48));
for (const t of 보일것) {
  console.log(`  ${t.갈래.padEnd(14)}${String(t.지면).padStart(5)}`
    + `${String(t.없음).padStart(7)}${String(t.한곳).padStart(7)}`
    + `${(t.가운데 === null ? '못잼' : String(t.가운데)).padStart(8)}`);
}

const 굶은갈래 = 보일것.filter((t) => t.없음 > 0);
if (굶은갈래.length) {
  console.log('\n  ⛔ 아무 데서도 안 걸리는 지면 — 갈래마다 몇 장만');
  for (const t of 굶은갈래.slice(0, 6)) {
    console.log(`\n   ${t.갈래} — ${t.없음}장`);
    for (const 주소 of t.굶은것.slice(0, 몇장)) console.log(`      ${주소}`);
    if (t.굶은것.length > 몇장) console.log(`      … ${t.굶은것.length - 몇장}장 더`);
  }
} else {
  console.log('\n  ✅ 아무 데서도 안 걸리는 지면이 없다');
}

console.log('\n## 이 표를 읽는 법 — ⛔ 이 세 줄을 빼고 수만 옮기지 않는다');
console.log('   · 「1곳」은 대개 그 갈래의 «목록 지면 한 장»이다. 목록이 접히면 통째로 고립된다.');
console.log('   · ⛔ 「인입이 적어서 색인이 안 된다」로 «단정하지» 않는다 — 색인은 구글이 정한다.');
console.log('   · ⚠ 사이트맵에 있는 것과 «걸어 준 것»은 다른 일이다. 둘 다 있어야 한다.');
