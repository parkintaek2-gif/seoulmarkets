/* 「안 쓴 축」을 하나 골랐을 때 — **우리가 이미 그 축으로 낸 것이 있나**
 *
 * ── 왜 이 자인가 (2026-10-12 16:1x · 5번) ─────────────────────────
 *   오늘 `/data/ceo-tenure` 를 다 짓고 빌드한 **뒤에야**
 *   우리 기사 `/article/korea-ceo-tenure-eleven-year-median` 이 이미 있는 것을 봤다.
 *   카드뉴스까지 있고 서치콘솔에 9위로 찍혀 있었다.
 *
 *   ⛔ `check-쥔자료에-안쓴축이-있나.mjs` 는 **`src/pages/data` 만 센다.**
 *     기사는 저장소에 소스가 없고 빌드 산출물(`dist/article`)에만 있다.
 *     그래서 **이미 쓴 축을 「안 쓴 축」이라고 내놓았다.**
 *
 *   ⭐ 더 나빴던 것 — 그 기사는 **설립일보다 긴 재임 148건을 이미 걸러냈는데**
 *     내 첫 자는 안 걸렀다. 그래서 지면 맨 앞 수가 「가장 긴 것 58년」이었다.
 *     **기사가 이미 의심스럽다고 밝힌 바로 그 줄**을 지면이 자랑할 뻔했다.
 *
 * ── 어떻게 찾나 ───────────────────────────────────────────────────
 *   자료 **이름**으로는 못 잇는다 — `korea-executives` 와 `ceo-tenure` 는 안 겹친다.
 *   ⇒ **자료 «속»의 열쇠 이름**을 쓴다. 이 자료의 열쇠에 `tenure` 가 있고
 *     기사 주소에도 `tenure` 가 있다. 그래서 잡힌다.
 *
 * ── ⛔ 이 자가 하지 않는 것 ───────────────────────────────────────
 * ⛔ 「이미 있으니 내지 마라」가 아니다. **「먼저 읽어라」**다.
 *   같은 자료로 다른 축을 내는 것은 좋다 — 다만 수가 어긋나면 안 된다.
 * ⛔ dist 가 없으면  **「못 쟀다」**고 적는다.
 * ⛔ 영문 기사와 한글 메타는 안 맞는다. 로마자 열쇠만 쓴다.
 *
 * 돌리기   node scripts/check-이축으로-이미낸게있나.mjs korea-executives
 *          node scripts/check-이축으로-이미낸게있나.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 여기 = path.dirname(fileURLToPath(import.meta.url));
const 뿌리 = path.resolve(여기, '..');

/* ── 재는 규칙 ──────────────────────────────────────────────────── */

/** 너무 흔해서 아무 기사에나 걸리는 낱말 — 이것으로는 안 찾는다 */
export const 흔한낱말 = new Set([
  'korea', 'korean', 'kr', 'data', 'name', 'names', 'code', 'codes', 'id', 'ids',
  'date', 'dates', 'year', 'years', 'value', 'values', 'type', 'types', 'row', 'rows',
  'meta', 'total', 'count', 'tape', 'list', 'index', 'en', 'english', 'full', 'raw',
  'item', 'items', 'key', 'keys', 'new', 'old', 'all', 'one', 'two', 'num', 'number',
  /* 🔴 [2026-10-12 17:5x · 5번] **이것들 때문에 185개 중 166개가 걸렸다.**
     자료의 열쇠 이름에는 뜻이 없는 영어가 잔뜩 있다 — `window`·`with`·`this`·`what`.
     기사 제목에도 그런 말이 흔히 들어가 서로 걸린다.
     ⇒ 글이 되는 말(stopword)과 살림말을 버린다. ⛔ 「드문가」만으로는 못 막았다 —
       `window` 는 기사 한 장에만 있어 «드문 낱말»로 통과했다. */
  'with', 'this', 'that', 'from', 'into', 'over', 'under', 'what', 'when', 'where',
  'which', 'while', 'than', 'then', 'they', 'them', 'their', 'there', 'here', 'have',
  'has', 'had', 'been', 'were', 'was', 'are', 'and', 'but', 'not', 'for', 'per',
  'window', 'first', 'last', 'latest', 'next', 'prev', 'month', 'months', 'week',
  'weeks', 'day', 'days', 'time', 'times', 'now', 'today', 'period', 'range',
  'source', 'sources', 'note', 'notes', 'method', 'methods', 'generated', 'built',
  'updated', 'version', 'label', 'labels', 'title', 'titles', 'slug', 'slugs',
  'unit', 'units', 'line', 'lines', 'text', 'url', 'urls', 'link', 'links',
  'file', 'files', 'size', 'sizes', 'page', 'pages', 'section', 'sections',
  'high', 'low', 'open', 'close', 'min', 'max', 'avg', 'mean', 'median', 'sum',
  'share', 'shares', 'rate', 'rates', 'pct', 'percent', 'ratio', 'level', 'levels',
  'bare', 'coverage', 'unique', 'totals', 'privacy', 'about', 'other', 'others',
]);

/**
 * ⛔ `_meta` 같은 살림 칸 아래는 안 본다 — 자료의 «내용»이 아니라 우리 살림이다.
 *   `generated`·`source`·`method`·`privacy` 가 거기서 새어 나와 기사와 걸렸다.
 */
export function 살림열쇠인가(열쇠) {
  const k = String(열쇠 ?? '');
  return k.startsWith('_') || /^(meta|무엇|출처|잰때|만든때|밝힐것|안담은것)$/.test(k);
}

/** 찾을 만한 낱말인가 — 세 글자 넘고, 로마자이고, 흔하지 않은 것 */
export function 찾을만한낱말인가(낱말) {
  const w = String(낱말 ?? '').toLowerCase().trim();
  if (w.length < 4) return false;
  if (!/^[a-z][a-z0-9]*$/.test(w)) return false;
  return !흔한낱말.has(w);
}

/** 열쇠 이름을 낱말로 가른다 — camelCase · snake_case · kebab-case 를 다 읽는다 */
export function 낱말로가르기(열쇠) {
  return String(열쇠 ?? '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[^A-Za-z0-9]+/)
    .map((w) => w.toLowerCase())
    .filter(Boolean);
}

/** 한 덩이(객체·배열)에서 열쇠 이름을 모은다 — 깊이는 제한한다 */
export function 열쇠모으기(덩이, 깊이 = 0, 모은것 = new Set()) {
  if (깊이 > 3 || 모은것.size > 400 || 덩이 == null) return 모은것;
  if (Array.isArray(덩이)) {
    for (const x of 덩이.slice(0, 3)) 열쇠모으기(x, 깊이 + 1, 모은것);
    return 모은것;
  }
  if (typeof 덩이 !== 'object') return 모은것;
  for (const [k, v] of Object.entries(덩이).slice(0, 120)) {
    /* ⛔ 살림 칸은 이름도 안 쓰고 속으로도 안 들어간다 */
    if (살림열쇠인가(k)) continue;
    모은것.add(k);
    열쇠모으기(v, 깊이 + 1, 모은것);
  }
  return 모은것;
}

/**
 * 🔴🔴 [2026-10-12 17:4x · 5번] **첫 판은 185개 가운데 166개가 걸렸다 — 양치기 소년이다.**
 * ─────────────────────────────────────────────────────────────────────
 * `country-trade-profiles` 가 `five-year-window-cuts-koreas-unbroken-profit-share` 에
 * 걸렸다. `profit`·`share` 같은 낱말이 기사 수십 장에 흔히 있기 때문이다.
 * ⛔ 거의 다 걸리면 사람이 안 본다. **경고가 많으면 경고가 아니다.**
 *
 * ⭐ 가르는 자 — **그 낱말이 기사 몇 장에 나오나**(희소성).
 *   오늘 겪은 `tenure` 는 177장 가운데 7장뿐이라 뜻이 있다.
 *   `share` 처럼 수십 장에 나오는 낱말은 아무것도 말해 주지 않는다.
 * ⛔ 「둘 이상 겹칠 때만」으로는 못 막는다 — 오늘 건은 `tenure` **하나**로 걸린 것이다.
 *   낱말 수가 아니라 **낱말의 값**을 봐야 한다.
 */
export const 흔한선 = 0.08;   /* 기사의 8% 넘게 나오면 흔한 낱말로 본다 */

/** 기사 이름들에서 낱말마다 「몇 장에 나오나」를 센다 */
export function 낱말빈도(이름들) {
  const 셈 = new Map();
  for (const f of 이름들 ?? []) {
    const 본것 = new Set(String(f).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
    for (const w of 본것) 셈.set(w, (셈.get(w) ?? 0) + 1);
  }
  return 셈;
}

/** 이 낱말이 그 묶음에서 «드문가» — 드물어야 걸릴 값이 있다 */
export function 드문낱말인가(낱말, 셈, 전체, 선 = 흔한선) {
  if (!전체) return true;                       /* 셀 것이 없으면 거르지 않는다 */
  const n = 셈?.get(String(낱말).toLowerCase()) ?? 0;
  if (n === 0) return true;                     /* 안 나오면 어차피 안 걸린다 */
  return n / 전체 <= 선;
}

/** 주소(또는 파일 이름)가 이 낱말을 품었나 — 낱말 경계로 본다 */
export function 주소가품었나(주소, 낱말) {
  const s = String(주소 ?? '').toLowerCase();
  const w = String(낱말 ?? '').toLowerCase();
  if (!w) return false;
  const 조각 = s.split(/[^a-z0-9]+/).filter(Boolean);
  return 조각.includes(w);
}

/* ── 자가시험 ───────────────────────────────────────────────────── */
function 자가시험() {
  let 통과 = 0; let 실패 = 0;
  const 같나 = (무엇, 잰것, 바라는것) => {
    const a = JSON.stringify(잰것); const b = JSON.stringify(바라는것);
    if (a === b) { 통과 += 1; return; }
    실패 += 1;
    console.log('  🔴 ' + 무엇 + '  잰것 ' + a + ' / 바란것 ' + b);
  };

  같나('camelCase 를 가른다', 낱말로가르기('boardType'), ['board', 'type']);
  같나('snake_case 를 가른다', 낱말로가르기('founded_on'), ['founded', 'on']);
  같나('kebab-case 를 가른다', 낱말로가르기('ceo-tenure'), ['ceo', 'tenure']);
  같나('한 낱말은 그대로', 낱말로가르기('tenure'), ['tenure']);
  같나('빈 것은 빈 배열', 낱말로가르기(''), []);

  같나('tenure 는 찾을 만하다', 찾을만한낱말인가('tenure'), true);
  같나('korea 는 너무 흔하다', 찾을만한낱말인가('korea'), false);
  같나('세 글자는 짧다', 찾을만한낱말인가('ceo'), false);
  같나('한글은 안 쓴다 — 영문 기사와 안 맞는다', 찾을만한낱말인가('임원'), false);
  같나('숫자로 시작하면 안 쓴다', 찾을만한낱말인가('2026year'), false);

  같나('주소에 든 낱말을 찾는다',
    주소가품었나('korea-ceo-tenure-eleven-year-median', 'tenure'), true);
  같나('낱말 조각만 겹치면 안 찾는다 — ten 은 tenure 가 아니다',
    주소가품었나('korea-ceo-tenure-eleven-year-median', 'ten'), false);
  같나('없는 낱말', 주소가품었나('korea-gold-bar-premium', 'tenure'), false);
  같나('빈 낱말은 거짓', 주소가품었나('korea-ceo-tenure', ''), false);

  const 열쇠 = 열쇠모으기({ _meta: { 회사수: 1 }, byTicker: { '000010': [{ tenure: '3 years', boardType: 'x' }] } });
  같나('속까지 들어가 열쇠를 모은다', 열쇠.has('tenure'), true);
  같나('가운데 열쇠도 모은다', 열쇠.has('byTicker'), true);
  같나('null 은 그냥 넘긴다', 열쇠모으기(null).size, 0);

  /* 🔴 살림 칸 — 여기서 source·method·generated 가 새어 나와 기사와 걸렸다 */
  같나('⛔ _meta 는 이름도 안 쓴다', 열쇠.has('_meta'), false);
  같나('⛔ _meta 속으로도 안 들어간다',
    열쇠모으기({ _meta: { source: 'x', method: 'y' } }).has('source'), false);
  같나('⛔ 한글 살림 칸도 안 본다',
    열쇠모으기({ 출처: { generated: 'x' } }).has('generated'), false);
  같나('✅ 살림이 아닌 칸은 그대로 본다',
    열쇠모으기({ byTicker: { x: [{ tenure: 1 }] } }).has('tenure'), true);
  같나('_ 로 시작하면 살림이다', 살림열쇠인가('_무엇'), true);
  같나('보통 열쇠는 살림이 아니다', 살림열쇠인가('tenure'), false);

  /* 🔴 글이 되는 말 — window 는 기사 한 장에만 있어 «드문 낱말»로 통과했었다 */
  같나('⛔ window 는 뜻이 없다', 찾을만한낱말인가('window'), false);
  같나('⛔ with 도', 찾을만한낱말인가('with'), false);
  같나('⛔ source 도', 찾을만한낱말인가('source'), false);
  같나('⛔ share 도 — 어느 기사에나 있다', 찾을만한낱말인가('share'), false);
  같나('✅ tenure 는 남는다', 찾을만한낱말인가('tenure'), true);
  같나('✅ buyback 은 남는다', 찾을만한낱말인가('buyback'), true);

  /* ── 🔴 희소성 — 첫 판이 185개 중 166개를 걸어 쓸모가 없었다 ────────── */
  const 기사흉내 = [
    'korea-ceo-tenure-eleven-year-median.html',
    'korea-tenure-gender-gap.html',
    'korea-profit-share-falls.html',
    'korea-profit-margin-widens.html',
    'korea-profit-and-wages.html',
    'korea-profit-by-sector.html',
  ];
  const 셈 = 낱말빈도(기사흉내);
  같나('profit 은 여섯 장 중 넷에 나온다', 셈.get('profit'), 4);
  같나('tenure 는 둘뿐이다', 셈.get('tenure'), 2);
  같나('🔴 흔한 낱말은 버린다 — 넷/여섯은 8% 를 훨씬 넘는다',
    드문낱말인가('profit', 셈, 6), false);
  같나('⭐ 드문 낱말은 남긴다 — 오늘 겪은 tenure 가 이것이다',
    드문낱말인가('tenure', 셈, 100), true);
  같나('안 나오는 낱말은 거르지 않는다 — 어차피 안 걸린다',
    드문낱말인가('없는말', 셈, 6), true);
  같나('⬜ 셀 것이 없으면 거르지 않는다 — ⛔ 「흔하다」로 단정하지 않는다',
    드문낱말인가('profit', 셈, 0), true);
  같나('대소문자를 가리지 않는다', 드문낱말인가('TENURE', 셈, 100), true);

  /* 🔴 오늘 겪은 바로 그 짝이 잡히나 — 이 자가 헛돌지 않는다는 증거다 */
  const 오늘낱말 = [...열쇠모으기({ byTicker: { x: [{ tenure: '3 years' }] } })]
    .flatMap(낱말로가르기).filter(찾을만한낱말인가);
  같나('🔴 오늘 겪은 것 — tenure 로 그 기사를 잡는다',
    오늘낱말.some((w) => 주소가품었나('/article/korea-ceo-tenure-eleven-year-median', w)), true);

  console.log('\n자가시험 ' + (통과 + 실패) + '개 · 통과 ' + 통과 + ' · 실패 ' + 실패);
  return 실패 === 0;
}

/* ── 본체 ───────────────────────────────────────────────────────── */
export function 이미낸것(축) {
  /* ① 자료를 읽어 열쇠 낱말을 뽑는다 */
  const 자료길 = path.join(뿌리, 'src', 'data', 축.endsWith('.json') ? 축 : 축 + '.json');
  let 낱말;
  if (fs.existsSync(자료길)) {
    const 덩이 = JSON.parse(fs.readFileSync(자료길, 'utf8'));
    낱말 = [...new Set([...열쇠모으기(덩이)].flatMap(낱말로가르기).filter(찾을만한낱말인가))];
  } else {
    낱말 = [];
  }
  /* 자료 이름 자체의 낱말도 넣는다 */
  for (const w of 낱말로가르기(축).filter(찾을만한낱말인가)) {
    if (!낱말.includes(w)) 낱말.push(w);
  }

  /* ② 이미 낸 것을 모은다 — 지면은 소스에서, 기사는 빌드 산출물에서 */
  const 지면방 = path.join(뿌리, 'src', 'pages', 'data');
  const 기사방 = path.join(뿌리, 'dist', 'article');
  const 지면 = fs.existsSync(지면방) ? fs.readdirSync(지면방) : null;
  const 기사 = fs.existsSync(기사방) ? fs.readdirSync(기사방) : null;

  /* 🔴 흔한 낱말은 버린다 — 그 낱말이 기사 몇 장에 나오나로 가른다(위 주석) */
  const 셈 = 낱말빈도(기사 ?? []);
  const 전체 = (기사 ?? []).length;
  const 버린낱말 = 낱말.filter((w) => !드문낱말인가(w, 셈, 전체));
  const 쓸낱말 = 낱말.filter((w) => 드문낱말인가(w, 셈, 전체));

  const 맞은것 = [];
  for (const [어디, 목록] of [['지면', 지면], ['기사', 기사]]) {
    if (!목록) continue;
    for (const f of 목록) {
      const 맞은낱말 = 쓸낱말.filter((w) => 주소가품었나(f, w));
      if (맞은낱말.length) 맞은것.push({ 어디, 이름: f, 낱말: 맞은낱말 });
    }
  }
  /* 많이 겹친 것부터 */
  맞은것.sort((a, b) => b.낱말.length - a.낱말.length);

  return {
    축,
    자료있나: fs.existsSync(자료길),
    낱말: 쓸낱말,
    버린낱말,
    지면쟀나: 지면 !== null,
    기사쟀나: 기사 !== null,
    기사수: 기사 ? 기사.length : null,
    맞은것,
  };
}

/* ── 들머리 ───────────────────────────────────────────────────────
 * 🔴🔴 [2026-10-12 17:3x · 5번] **여기에 진입점 검사가 없어 사고가 났다.**
 *   `check-쥔자료에-안쓴축이-있나.mjs` 가 이 자를 `import` 한 순간
 *   아래가 통째로 돌아 도움말을 찍고 **`process.exit(0)` 로 부모를 끝냈다.**
 *   ⛔ 거두는 자(collect-jbnews-sports-articles.mjs) 2079줄이
 *     「오늘 다른 자에서 import 한 순간 아래 보내는 일이 통째로 돌았다」고
 *     **이미 적어 두었는데** 나는 새 자에 그 보호를 안 넣었다.
 *   ⭐ 겪은 것을 글로만 갖고 새 일에 안 옮기면 그대로 되풀이된다 — 오늘 세 번째다.
 */
const 내가진입점 = process.argv[1]
  && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (내가진입점 && process.argv.includes('--자가시험')) {
  process.exit(자가시험() ? 0 : 1);
}

function 주다() {
  const 축 = process.argv.slice(2).find((a) => !a.startsWith('--'));
  if (!축) {
    console.log('■ 「이 축으로 이미 낸 게 있나」');
    console.log('   쓰기  node scripts/check-이축으로-이미낸게있나.mjs <자료이름>');
    console.log('   보기  node scripts/check-이축으로-이미낸게있나.mjs korea-executives');
    return 0;
  }

  const r = 이미낸것(축);
  console.log('■ ' + r.축 + ' — 우리가 이미 이 축으로 낸 것이 있나');
  if (!r.자료있나) {
    console.log('   ⬜ src/data/' + r.축 + '.json 을 못 찾았다 — 이름만으로 찾는다');
  }
  console.log('   찾는 낱말 ' + r.낱말.length + '개: ' + r.낱말.slice(0, 14).join(' · ')
    + (r.낱말.length > 14 ? ' …' : ''));
  if (!r.기사쟀나) {
    console.log('   ⬜ dist/article 이 없다 — **기사는 못 쟀다.** ');
    console.log('      먼저 npx astro build 를 돌린 뒤 이 자를 다시 돌린다.');
  } else {
    console.log('   기사 ' + r.기사수 + '장 · 데이터 지면 ' + (r.지면쟀나 ? '쟀다' : '⬜ 못 쟀다'));
  }
  console.log('');

  /* ⬜ [2026-10-12 18:4x · 5번] **찾을 낱말이 거의 없으면 「안 찾은 것」에 가깝다.**
     `korea-workdays` 는 열쇠가 다 한글(출처·받은때·이음매·월별)이라 로마자 낱말이
     `workdays` 하나뿐이었다. 그걸로 「없다」고 적으면 사람을 속인다.
     ⛔ 영문 기사와 한글 열쇠는 안 맞는다 — 그 한계를 숨기지 않고 적는다. */
  if (r.낱말.length <= 2) {
    console.log('   ⬜ **찾을 낱말이 ' + r.낱말.length + '개뿐이다 — 이 자는 거의 못 본 셈이다.**');
    console.log('      열쇠가 한글인 자료는 영문 기사와 안 맞는다. 아래 판정을 얇게 읽는다.');
    console.log('');
  }

  if (!r.맞은것.length) {
    console.log((r.낱말.length <= 2 ? '⬜ 못 찾았다' : '✅ 걸리는 것이 없다')
      + ' — 이 축으로 낸 것이 없어 «보인다»');
    console.log('   ⚠ 낱말로만 찾았다. 이름이 아주 다르면 못 잡는다 — 「없다」가 아니라 「못 찾았다」다');
    return 0;
  }

  console.log('🔴 이미 낸 것이 ' + r.맞은것.length + '개 걸렸다 — **짓기 전에 읽는다**');
  for (const m of r.맞은것.slice(0, 12)) {
    console.log('   [' + m.어디 + '] ' + m.이름);
    console.log('        맞은 낱말: ' + m.낱말.join(' · '));
  }
  if (r.맞은것.length > 12) console.log('   … 그 밖 ' + (r.맞은것.length - 12) + '개');
  console.log('');
  console.log('   ⛔ 「이미 있으니 내지 마라」가 아니다 — **먼저 읽어라**다.');
  console.log('      같은 자료로 다른 축을 내는 것은 좋다. 다만 **수가 어긋나면 안 된다.**');
  console.log('   ⭐ 2026-10-12 — 기사가 이미 거른 148건을 내 지면이 안 걸러,');
  console.log('      기사가 「의심스럽다」고 밝힌 줄을 지면 맨 앞에 낼 뻔했다.');
  return 0;
}

if (내가진입점) process.exit(주다());
