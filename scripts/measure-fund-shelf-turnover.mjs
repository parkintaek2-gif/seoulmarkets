#!/usr/bin/env node
/**
 * measure-fund-shelf-turnover.mjs — **한국 공모펀드 «선반»이 무엇으로 채워져 왔나를 센다.**
 *
 *   node scripts/measure-fund-shelf-turnover.mjs            재서 src/data 에 낸다
 *   node scripts/measure-fund-shelf-turnover.mjs --자가시험   자가시험만
 *
 * ── 🔴 왜 만들었나 (2026-09-11 02:2x · 5번) ────────────────────────
 *
 * 고리점검(5번 → SeoulMarkets)에서 갈래 넷이 «얇다»고 걸렸다. 까닭을 셌더니 그릇이
 * 아니라 담긴 것이 없었다 — 기사 수가 그대로였다:
 *   equities 61 · macro 47 · fx 8 · rates 7 · commodities 6 · **funds 3**
 *
 * 그런데 `archive/raw/funds/all.ndjson` 에 **18만 3,351행**이 있고, 이것을 읽는 «코드»는
 * 수집기 하나뿐이었다.
 *
 * 🔴 여기서 내가 한 번 틀렸다. grep 결과만 보고 「지면도 기사도 이 자료를 한 번도 안 썼다」고
 *   메모에 적었는데, **2026-08-07 에 이미 기사가 나가 있었다** —
 *   `content/articles/korea-fund-factory-slowing.md`. 코드가 아니라 «사람이 손으로 세서»
 *   쓴 것이라 grep 에 안 걸렸을 뿐이다.
 *   ⛔ grep 이 비었다를 「없다」로 읽지 않는다. 기사 목록도 함께 본다.
 *
 * ⭐ 그래서 이 자는 그 기사가 «안 본 축»만 잰다. 그 기사가 본 것과 갈라 적는다 —
 *   그 기사    2020~2026 신규 등록이 반토막 · 갈래 구성 · 주제(미국·중국) 비교
 *   이 자      ① 1998년 코호트(그 기사는 2020을 꼭지로 봤다. 실제 꼭지는 1998이다)
 *              ② «해마다 가장 많았던 갈래»의 손바뀜 — 혼합채권형 → 파생상품 → 재간접
 *
 * ⛔ 운용사 «이름»을 이름 앞머리에서 지어내지 않는다. 표준코드 3~6자리로 운용사를
 *   가르려 했다가 되돌렸다 — 아래 `코드계열()` 주석에 까닭을 적어 두었다.
 *
 * ── ⛔ 이 자가 지키는 것 ────────────────────────────────────────
 *
 * 🔴 **이것은 «지금 등록돼 있는» 코드의 설정연도 분포다. 그해에 만들어진 펀드 수가 아니다.**
 *   없어진 펀드는 이 파일에 없다. 그래서 옛 해는 «살아남은 것»만 세어 **적게 나온다.**
 *   ⇒ 2007년 대비 감소를 말할 때 그 감소는 **아래로 잡은 값(lower bound)**이다.
 *   ⛔ 「2007년에 1만 3,569개가 설정됐다」로 쓰지 않는다. 「2007년 설정분으로 지금까지
 *     남아 있는 코드가 1만 3,569개」다. 이 문장을 지면과 기사에 그대로 싣는다.
 *
 * ⛔ 「펀드 수」라고 부르지 않는다 — 한 펀드가 클래스(ClassA·C1·C-P2e…)마다 코드를
 *   따로 받는다. 이 파일이 세는 것은 **코드 수**다. 클래스를 이름에서 벗겨 펀드를
 *   세는 것은 «짐작»이 섞이므로 여기서 하지 않는다(⬜ 로 남긴다).
 * ⛔ 설정일이 없거나 말이 안 되는 행은 «빼되 몇 개를 뺐는지 낸다». 
 * ⚠ 2026년은 아직 안 끝난 해다. 「줄었다」의 끝점으로 쓰지 않는다 — 마지막 «온해»를 쓴다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const 밑감 = path.join(뿌리, 'archive/raw/funds/all.ndjson');
export const 낼곳 = path.join(뿌리, 'src/data/fund-shelf-turnover.json');

/** 설정일이 이보다 이르면 자료 오류로 본다 — 한국 최초 공모펀드보다 앞선다 */
export const 가장이른해 = 1970;
/** 갈래 표를 낼 때 이 수보다 적은 갈래는 「그밖」으로 묶는다 — 꼬리를 늘어놓지 않는다 */
export const 갈래최소 = 2000;

/** ⛔ 여덟 자리 숫자만 날로 본다. 「20260805」 → 2026 */
export function 설정해(값) {
  const s = String(값 ?? '').trim();
  if (!/^[0-9]{8}$/.test(s)) return null;
  const y = Number(s.slice(0, 4));
  const m = Number(s.slice(4, 6));
  const d = Number(s.slice(6, 8));
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  if (y < 가장이른해) return null;
  return y;
}

/**
 * 표준코드 3~6번째 자리 — 숫자로 된 «코드 계열»을 뽑는다.
 *
 * 🔴 처음에 이 함수를 「운용사코드」라 이름 짓고 「운용사 158곳」을 낼 참이었다. **틀렸다.**
 *   재 보니 표준코드는 한 꼴이 아니다 —
 *     KR5207599212 · K55207BU0699   3~6이 「5207」  (숫자 계열)
 *     KRM213AN5461 · K553V5…        3~6이 숫자가 아니다 — 3,809행이 여기 든다
 *   KRM… 은 «투자회사» 꼴이고 K5V…·K553… 은 또 다른 계열이다. 즉 이 네 자리는
 *   운용사만 가리키는 것이 아니고, 같은 운용사가 두 계열에 걸쳐 있을 수 있다.
 *   ⇒ **운용사 수를 이 자리로 세지 않는다.** 코드를 이름으로 바꿔 주는 표를 아직 안 가졌다.
 * ⬜ 운용사별 셈은 «못 쟀다»로 남긴다. 이름 앞머리로 가르는 것은 짐작이다
 *   (「KB 액티브…」와 「케이비…」가 갈린다).
 */
export function 코드계열(표준코드) {
  const s = String(표준코드 ?? '').trim();
  if (s.length !== 12) return null;
  const 넷 = s.slice(2, 6);
  return /^[0-9]{4}$/.test(넷) ? 넷 : null;
}

/** 한 해의 갈래별 수에서 «가장 많은 갈래»를 고른다. ⛔ 비면 null — 지어내지 않는다 */
export function 으뜸갈래(해칸) {
  const 것들 = Object.entries(해칸 ?? {}).filter(([, n]) => Number(n) > 0);
  if (!것들.length) return null;
  것들.sort((a, b) => Number(b[1]) - Number(a[1]) || String(a[0]).localeCompare(String(b[0])));
  return { 갈래: 것들[0][0], 수: Number(것들[0][1]) };
}

/**
 * 「끝났다」고 볼 수 있는 마지막 해. ⚠ 올해는 아직 안 끝났으므로 뺀다.
 * ⛔ 안 끝난 해를 감소의 끝점으로 쓰면 12월에 다시 재면 결론이 바뀐다.
 */
export function 마지막온해(해들, 올해 = new Date().getFullYear()) {
  const 온것 = (해들 ?? []).map(Number).filter((y) => Number.isFinite(y) && y < 올해);
  if (!온것.length) return null;
  return Math.max(...온것);
}

/**
 * 두 해 사이의 변화. ⛔ 밑이 0 이면 비율을 내지 않는다(null) — 나눗셈을 지어내지 않는다.
 */
export function 변화(밑, 끝) {
  const a = Number(밑); const b = Number(끝);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0) return { 배수: null, 줄어든비율: null };
  return { 배수: b / a, 줄어든비율: (a - b) / a };
}

/** 갈래를 큰 것만 남기고 나머지는 「other」로 묶는다. ⛔ 묶은 갈래 이름을 함께 낸다 */
export function 갈래묶기(전체갈래수, { 최소 = 갈래최소 } = {}) {
  const 큰 = []; const 묶인 = [];
  for (const [이름, n] of Object.entries(전체갈래수 ?? {})) {
    (Number(n) >= 최소 ? 큰 : 묶인).push(이름);
  }
  큰.sort((a, b) => Number(전체갈래수[b]) - Number(전체갈래수[a]));
  묶인.sort();
  return { 큰, 묶인 };
}

export function 재기(줄들) {
  const 해별 = new Map();
  const 해갈래 = new Map();
  const 전체갈래 = new Map();
  const 계열 = new Set();
  let 읽음 = 0; let 설정일없음 = 0; let 숫자계열아님 = 0;
  for (const 줄 of 줄들) {
    if (!줄 || !줄.trim()) continue;
    let x = null;
    try { x = JSON.parse(줄); } catch { continue; }
    읽음 += 1;
    const 코 = 코드계열(x.표준코드);
    if (코) 계열.add(코); else 숫자계열아님 += 1;
    const y = 설정해(x.설정일);
    if (y == null) { 설정일없음 += 1; continue; }
    const 갈래 = String(x.유형 ?? '').trim() || '(빈칸)';
    해별.set(y, (해별.get(y) || 0) + 1);
    전체갈래.set(갈래, (전체갈래.get(갈래) || 0) + 1);
    if (!해갈래.has(y)) 해갈래.set(y, new Map());
    const 칸 = 해갈래.get(y);
    칸.set(갈래, (칸.get(갈래) || 0) + 1);
  }
  const 해들 = [...해별.keys()].sort((a, b) => a - b);
  return {
    읽음,
    센것: 읽음 - 설정일없음,
    설정일없음,
    /* ⬜ 운용사 수가 아니다 — 위 코드계열() 주석을 읽는다. 숫자 계열의 «네 자리» 종류 수다 */
    숫자계열아님,
    숫자계열수: 계열.size,
    운용사수: null,   /* ⬜ 못 쟀다 — 코드를 운용사 이름으로 바꿔 주는 표가 없다 */
    해들,
    해별: Object.fromEntries(해들.map((y) => [y, 해별.get(y)])),
    해갈래: Object.fromEntries(해들.map((y) => [y, Object.fromEntries([...해갈래.get(y)].sort((a, b) => b[1] - a[1]))])),
    전체갈래: Object.fromEntries([...전체갈래].sort((a, b) => b[1] - a[1])),
  };
}

export function 자가시험() {
  const 목 = [
    ['설정해가 여덟 자리를 읽는다', () => 설정해('20060905') === 2006],
    ['⛔ 여덟 자리가 아니면 null', () => 설정해('2006') === null && 설정해('') === null && 설정해(null) === null],
    ['⛔ 달·날이 말이 안 되면 null — ', () =>
      설정해('20061305') === null && 설정해('20060900') === null],
    ['⛔ 1970년보다 이르면 자료 오류로 본다', () => 설정해('19691231') === null],
    ['🔴 숫자 계열은 표준코드 3~6자리다 — 앞머리(KR5·K55)가 달라도 같게 나온다', () =>
      코드계열('KR5207599212') === '5207' && 코드계열('K55207BU0699') === '5207'
      && 코드계열('KR5207AW8081') === '5207'],
    ['⛔ 표준코드 길이가 12가 아니면 null', () => 코드계열('KR52') === null && 코드계열(null) === null],
    ['🔴 3~6자리가 숫자가 아니면 null — KRM…·K5V… 는 다른 계열이다(3,809행)', () =>
      코드계열('KRAB07599212') === null && 코드계열('KRM213AN5461') === null],
    ['⬜ 운용사 수는 내지 않는다 — 못 쟀다를 null 로 남긴다', () => {
      const r = 재기([JSON.stringify({ 설정일: '20100101', 유형: 'x', 표준코드: 'KR5101599212' })]);
      return r.운용사수 === null && r.숫자계열수 === 1;
    }],
    ['으뜸갈래는 가장 많은 것을 고른다', () =>
      으뜸갈래({ 채권형: 3, 주식형: 9 })?.갈래 === '주식형'],
    ['⛔ 비면 null', () => 으뜸갈래({}) === null && 으뜸갈래(null) === null && 으뜸갈래({ a: 0 }) === null],
    ['⚠ 마지막 온해는 «올해를 뺀다» — 안 끝난 해를 끝점으로 쓰지 않는다', () =>
      마지막온해([2023, 2024, 2025, 2026], 2026) === 2025],
    ['⛔ 온해가 하나도 없으면 null', () => 마지막온해([2026], 2026) === null && 마지막온해([], 2026) === null],
    ['변화는 배수와 줄어든 비율을 낸다', () => {
      const r = 변화(1000, 250);
      return Math.abs(r.배수 - 0.25) < 1e-9 && Math.abs(r.줄어든비율 - 0.75) < 1e-9;
    }],
    ['⛔ 밑이 0 이면 비율을 내지 않는다 — 나눗셈을 지어내지 않는다', () =>
      변화(0, 5).배수 === null && 변화(0, 5).줄어든비율 === null],
    ['갈래묶기가 작은 것을 묶고 «묶인 이름»을 함께 낸다', () => {
      const r = 갈래묶기({ 큰것: 5000, 작은것: 3, 또작은것: 1 }, { 최소: 100 });
      return r.큰.length === 1 && r.묶인.length === 2 && r.묶인.includes('작은것');
    }],
    ['재기가 해별·갈래별을 함께 센다', () => {
      const r = 재기([
        JSON.stringify({ 설정일: '20060905', 유형: '채권형', 표준코드: 'KR5207599212' }),
        JSON.stringify({ 설정일: '20060102', 유형: '채권형', 표준코드: 'KR5101599212' }),
        JSON.stringify({ 설정일: '20070102', 유형: '주식형', 표준코드: 'KR5101599213' }),
      ]);
      return r.해별[2006] === 2 && r.해별[2007] === 1 && r.숫자계열수 === 2
        && r.해갈래[2006].채권형 === 2;
    }],
    ['🔴 설정일이 없는 행은 «빼고, 몇 개를 뺐는지 낸다»', () => {
      const r = 재기([
        JSON.stringify({ 설정일: '', 유형: '채권형', 표준코드: 'KR5207599212' }),
        JSON.stringify({ 설정일: '20060905', 유형: '채권형', 표준코드: 'KR5207599213' }),
      ]);
      return r.읽음 === 2 && r.센것 === 1 && r.설정일없음 === 1;
    }],
    ['⛔ 빈 줄과 깨진 줄을 견딘다', () => {
      const r = 재기(['', '   ', '{깨짐', JSON.stringify({ 설정일: '20100101', 유형: 'x', 표준코드: 'KR5101599212' })]);
      return r.센것 === 1;
    }],
    ['⛔ 유형이 비면 「(빈칸)」으로 세고 «다른 이름으로 옮기지 않는다»', () => {
      const r = 재기([JSON.stringify({ 설정일: '20100101', 유형: '', 표준코드: 'KR5101599212' })]);
      return r.전체갈래['(빈칸)'] === 1;
    }],
  ];
  let 통 = 0; const 실 = [];
  for (const [이름, 재본다] of 목) {
    let ok = false;
    try { ok = !!재본다(); } catch { ok = false; }
    if (ok) 통 += 1; else 실.push(이름);
  }
  console.log(`펀드 선반 검사 — 자가시험 ${통}/${목.length}`);
  실.forEach((x) => console.log(`   X ${x}`));
  return 실.length;
}

const 나 = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (나) {
  const 흠 = 자가시험();
  if (process.argv.includes('--자가시험')) process.exit(흠 ? 1 : 0);
  if (흠) { console.log('🔴 자가시험이 깨졌다 — 값을 내지 않는다'); process.exit(1); }

  if (!fs.existsSync(밑감)) {
    console.log(`⬜ 못 쟀다 — 밑감이 없다: ${path.relative(뿌리, 밑감)}`);
    process.exit(0);
  }
  const 줄들 = fs.readFileSync(밑감, 'utf8').split(/\r?\n/);
  const r = 재기(줄들);
  const 올해 = new Date().getFullYear();
  const 끝해 = 마지막온해(r.해들, 올해);
  const 꼭지해 = r.해들.reduce((a, y) => (r.해별[y] > r.해별[a] ? y : a), r.해들[0]);
  const 꼭지에서끝까지 = 끝해 ? 변화(r.해별[꼭지해], r.해별[끝해]) : { 배수: null, 줄어든비율: null };
  const 묶음 = 갈래묶기(r.전체갈래);

  console.log('');
  console.log(`■ 읽은 행 ${r.읽음.toLocaleString('en-US')} · 센 것 ${r.센것.toLocaleString('en-US')}`
    + ` · 설정일 없음 ${r.설정일없음} · 표준코드 다른 꼴 ${r.숫자계열아님}`);
  console.log(`■ 설정연도 ${r.해들[0]}~${r.해들[r.해들.length - 1]}`    + ` · 표준코드 숫자 계열 ${r.숫자계열수}가지(다른 꼴 ${r.숫자계열아님}행)`);
  console.log('   ⬜ 운용사 수는 «못 쟀다» — 표준코드가 한 꼴이 아니고(KRM…·K5V…·K553…),'
    + ' 코드를 운용사 이름으로 바꿔 주는 표를 아직 안 가졌다');
  console.log(`■ 가장 많은 해 ${꼭지해} — ${r.해별[꼭지해].toLocaleString('en-US')}개`
    + ` · 마지막 온해 ${끝해} — ${끝해 ? r.해별[끝해].toLocaleString('en-US') : '—'}개`);
  if (꼭지에서끝까지.줄어든비율 != null) {
    console.log(`   ⇒ 꼭지에서 ${(꼭지에서끝까지.줄어든비율 * 100).toFixed(1)}% 적다`
      + '  ⚠ 없어진 펀드가 이 파일에 없으니 «아래로 잡은 값»이다');
  }
  console.log('');
  console.log('■ 갈래별 (지금 등록된 코드 전체)');
  for (const 이름 of 묶음.큰) {
    console.log(`   ${이름.padEnd(10)} ${String(r.전체갈래[이름]).padStart(7)}`);
  }
  if (묶음.묶인.length) console.log(`   그밖 ${묶음.묶인.length}가지 — ${묶음.묶인.join(' · ')}`);
  console.log('');
  console.log('■ 해마다 «가장 많았던 갈래» — 선반이 무엇으로 채워졌나');
  for (const y of r.해들.filter((y) => y >= 2005)) {
    const 으뜸 = 으뜸갈래(r.해갈래[y]);
    const 몫 = 으뜸 ? (으뜸.수 / r.해별[y] * 100).toFixed(0) : '—';
    console.log(`   ${y}  ${String(r.해별[y]).padStart(6)}개   ${으뜸 ? 으뜸.갈래 : '—'} ${몫}%`);
  }

  const 낼것 = {
    잰때: new Date().toISOString(),
    밑감: 'archive/raw/funds/all.ndjson',
    /* ⛔ 이 문장을 지면·기사가 그대로 싣는다. 여기서 지우면 수가 거짓말이 된다 */
    무엇을세나: '지금 등록돼 있는 공모펀드 «코드»의 설정연도 분포. 한 펀드가 클래스마다 코드를 따로 받으므로 펀드 수가 아니다.',
    살아남은것만: '없어진 펀드는 이 파일에 없다. 그래서 옛 해는 적게 나오고, 감소는 아래로 잡은 값이다.',
    ...r,
    꼭지해,
    마지막온해: 끝해,
    꼭지에서끝까지,
    갈래묶음: 묶음,
  };
  fs.writeFileSync(낼곳, `${JSON.stringify(낼것, null, 2)}\n`, 'utf8');
  console.log(`\n  ✅ 냈다 — ${path.relative(뿌리, 낼곳)}`);
}
