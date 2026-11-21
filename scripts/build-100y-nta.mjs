#!/usr/bin/env node
/**
 * build-100y-nta.mjs — **국민이전계정(국가데이터처 KOSIS)을 받아 백년지도 두 지면을 짓는다.**
 *
 *   node scripts/build-100y-nta.mjs --자가시험
 *   node scripts/build-100y-nta.mjs              받아서 다시 짓는다
 *   node scripts/build-100y-nta.mjs --안적는다     받아서 세기만 한다
 *
 * ── 🔴 왜 만드나 (2026-09-18 · 5번) ─────────────────────────────────────
 * 사장님: 「**국가데이터처 2024년 국민이전계정이 보도가 됐는데, 더 최근 것이 있으면
 *   최근 걸 활용하고 없으면 가장 최신 걸 쓰라고 해**」
 *
 * 3번이 2026-09-15 에 2023년치로 두 지면(/lifecycle-deficit · /public-transfers-by-age)을
 * 냈고, 그때 「2024년치는 09-17 발표 예정 — 그때 갱신한다」고 적어 두었다. 그 3번 자리는
 * 09-18 에 접혔다. **자료는 나왔는데 갱신할 사람이 없어진 상태**였다.
 * ⇒ 실측(2026-09-18): DT_1NTA2003 에 2022 · 2023 · **2024** 가 들어 있다.
 *
 * ⛔ **손으로 숫자를 옮겨 적지 않는다.** 3번은 JSON 을 손으로 만들어 두었고, 그래서
 *   해가 바뀔 때마다 사람이 필요했다. 이 자가 그 일을 없앤다 — 다음 해도 이것만 돌린다.
 * ⛔  값이 없으면 그 나이를 빼고, 몇을 뺐는지 적는다.
 * ⛔ 「가장 최신」을 우리가 고르지 않는다 — KOSIS 가 주는 것 가운데 가장 큰 해를 쓴다.
 *
 * ── 라이선스 ────────────────────────────────────────────────────────────
 * KOSIS 통계정보 활용약관 제8조 — 상업적 활용 가능. 출처표시: 국가데이터처 KOSIS.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const 표 = 'DT_1NTA2003';                 /* 생애주기적자계정 — /lifecycle-deficit */
export const 표2 = 'DT_1NTA2005';                /* 연령재배분계정 — /public-transfers-by-age */

/** 공공이전 네 갈래 — KOSIS 축 이름과 우리 열쇠의 짝 */
export const 네갈래 = { 교육: '공공이전(교육)', 보건: '공공이전(보건)', 연금: '공공이전(연금)', 사회보호: '공공이전(사회보호)' };

/** 나이 이름에서 수를 뽑는다. 「85세이상」은 85 로 본다. ⛔ 못 읽으면 null — 0 이 아니다 */
export function 나이수(이름) {
  const m = String(이름 ?? '').match(/(\d+)\s*세/);
  return m ? Number(m[1]) : null;
}

/** KOSIS 줄 묶음 → { 해, 나이별 } — 축 이름(C1_NM)으로 고른다 */
export function 고른다(줄들) {
  const 살아있는 = (줄들 || []).filter((x) => x && x.DT !== '' && x.DT != null);
  if (!살아있는.length) return { 해: null, 나이별: [], 못읽음: '값이 든 줄이 없다' };
  const 해 = 살아있는.map((x) => String(x.PRD_DE)).sort().pop();
  const 그해 = 살아있는.filter((x) => String(x.PRD_DE) === 해);
  const 칸 = { 생애주기적자: '생애주기적자', 소비: '소비', 노동소득: '노동소득' };
  const 모음 = new Map();
  for (const x of 그해) {
    const 축 = String(x.C1_NM || '').trim();
    const 열쇠 = Object.keys(칸).find((k) => 칸[k] === 축);
    if (!열쇠) continue;                       /* 공공소비 등 잔가지는 여기서 안 쓴다 */
    const 나이이름 = String(x.C2_NM || '').trim();
    const n = 나이수(나이이름);
    if (n === null) continue;
    if (!모음.has(나이이름)) 모음.set(나이이름, { 나이: 나이이름, _n: n });
    모음.get(나이이름)[열쇠 + '_천원'] = Math.round(Number(x.DT));
  }
  const 나이별 = [...모음.values()]
    .filter((r) => Number.isFinite(r.생애주기적자_천원))
    .sort((a, b) => a._n - b._n || String(a.나이).localeCompare(String(b.나이)));
  return { 해, 나이별 };
}

/** 나이별 줄에서 «손님이 궁금해하는 네 가지»를 뽑는다 */
export function 핵심뽑기(나이별) {
  if (!Array.isArray(나이별) || !나이별.length) return null;
  const 값 = (r) => r.생애주기적자_천원;
  let 최대적자 = 나이별[0], 최대흑자 = 나이별[0];
  for (const r of 나이별) {
    if (값(r) > 값(최대적자)) 최대적자 = r;
    if (값(r) < 값(최대흑자)) 최대흑자 = r;
  }
  /* 부호가 바뀌는 자리 둘 — 적자→흑자(젊을 때) · 흑자→적자(나이 들어) */
  let 적자에서흑자로 = null, 흑자에서적자로 = null;
  for (let i = 1; i < 나이별.length; i += 1) {
    const 앞 = 값(나이별[i - 1]), 뒤 = 값(나이별[i]);
    if (앞 > 0 && 뒤 <= 0 && !적자에서흑자로) 적자에서흑자로 = { 이전: 나이별[i - 1].나이, 이후: 나이별[i].나이 };
    if (앞 <= 0 && 뒤 > 0) 흑자에서적자로 = { 이전: 나이별[i - 1].나이, 이후: 나이별[i].나이 };
  }
  return {
    최대적자_나이: 최대적자.나이, 최대적자_천원: 값(최대적자),
    최대흑자_나이: 최대흑자.나이, 최대흑자_천원: Math.abs(값(최대흑자)),
    적자에서흑자로, 흑자에서적자로,
  };
}

/** 연령재배분표 줄 묶음 → { 해, 나이별 } — 공공이전 네 갈래만 고른다 */
export function 고른다2(줄들) {
  const 살아있는 = (줄들 || []).filter((x) => x && x.DT !== '' && x.DT != null);
  if (!살아있는.length) return { 해: null, 나이별: [], 못읽음: '값이 든 줄이 없다' };
  const 해 = 살아있는.map((x) => String(x.PRD_DE)).sort().pop();
  const 모음 = new Map();
  for (const x of 살아있는.filter((r) => String(r.PRD_DE) === 해)) {
    const 축 = String(x.C1_NM || '').trim();
    const 열쇠 = Object.keys(네갈래).find((k) => 네갈래[k] === 축);
    if (!열쇠) continue;
    const 나이이름 = String(x.C2_NM || '').trim();
    const n = 나이수(나이이름);
    if (n === null) continue;
    if (!모음.has(나이이름)) 모음.set(나이이름, { 나이: 나이이름, _n: n });
    모음.get(나이이름)[열쇠 + '_천원'] = Math.round(Number(x.DT));
  }
  const 나이별 = [...모음.values()].sort((a, b) => a._n - b._n);
  return { 해, 나이별 };
}

/** 네 갈래 각각 «가장 많이 받는 나이»와, 연금이 순수혜로 도는 자리 */
export function 정점뽑기(나이별, 옛정점 = {}) {
  if (!Array.isArray(나이별) || !나이별.length) return null;
  const 네갈래_정점 = {};
  for (const 갈래 of Object.keys(네갈래)) {
    const 칸 = 갈래 + '_천원';
    const 있는것 = 나이별.filter((r) => Number.isFinite(r[칸]));
    if (!있는것.length) continue;               /* ⛔ 없으면 빼고 간다 — 0 으로 안 채운다 */
    const 으뜸 = 있는것.reduce((a, b) => (b[칸] > a[칸] ? b : a));
    네갈래_정점[갈래] = {
      나이: 으뜸.나이, 천원: 으뜸[칸],
      /* 「뜻」은 사람이 쓴 설명이라 그대로 물려받는다 — 해가 바뀐다고 뜻이 바뀌지 않는다 */
      뜻: 옛정점?.[갈래]?.뜻 ?? null,
    };
  }
  let 연금_순수혜전환 = null;
  for (let i = 1; i < 나이별.length; i += 1) {
    const 앞 = 나이별[i - 1].연금_천원, 뒤 = 나이별[i].연금_천원;
    if (Number.isFinite(앞) && Number.isFinite(뒤) && 앞 <= 0 && 뒤 > 0) {
      연금_순수혜전환 = { 이전: 나이별[i - 1].나이, 이후: 나이별[i].나이 };
      break;
    }
  }
  return { 네갈래_정점, 연금_순수혜전환 };
}

/* ── 자가시험 ────────────────────────────────────────────── */
function 자가시험() {
  let 든것 = 0, 깬것 = 0;
  const 재 = (무엇, 실제, 바람) => {
    const a = JSON.stringify(실제), b = JSON.stringify(바람);
    if (a === b) 든것 += 1; else { 깬것 += 1; console.log(`🔴 ${무엇}\n   나온것 ${a}\n   바람   ${b}`); }
  };
  재('나이수 — 보통', 나이수('27세'), 27);
  재('나이수 — 85세이상도 85 로 읽는다', 나이수('85세이상'), 85);
  재('⛔ 나이수 — 못 읽으면 null(0 이 아니다)', 나이수('합계'), null);
  재('⛔ 나이수 — null 도 견딘다', 나이수(null), null);

  const 줄 = (해, 축, 나이, v) => ({ PRD_DE: 해, C1_NM: 축, C2_NM: 나이, DT: v });
  재('⛔ 값이 없으면 못 읽었다고 한다', 고른다([]).못읽음, '값이 든 줄이 없다');
  재('🔴 여러 해가 오면 «가장 최신»을 쓴다 — 우리가 고르지 않는다',
    고른다([줄('2023', '생애주기적자', '30세', 1), 줄('2024', '생애주기적자', '30세', 2)]).해, '2024');
  재('나이 차례로 세운다',
    고른다([줄('2024', '생애주기적자', '30세', 1), 줄('2024', '생애주기적자', '5세', 2)]).나이별.map((r) => r.나이),
    ['5세', '30세']);
  재('세 축을 한 줄로 모은다',
    고른다([줄('2024', '생애주기적자', '30세', -5), 줄('2024', '소비', '30세', 20), 줄('2024', '노동소득', '30세', 25)])
      .나이별.map((r) => [r.생애주기적자_천원, r.소비_천원, r.노동소득_천원]),
    [[-5, 20, 25]]);
  재('⛔ 빈 값은 버린다 — ',
    고른다([줄('2024', '생애주기적자', '30세', ''), 줄('2024', '생애주기적자', '31세', 3)]).나이별.map((r) => r.나이),
    ['31세']);
  재('⛔ 안 쓰는 잔가지 축은 안 담는다',
    고른다([줄('2024', '공공교육소비', '30세', 9), 줄('2024', '생애주기적자', '30세', 1)]).나이별.length, 1);

  const 표본 = [
    { 나이: '16세', 생애주기적자_천원: 44184, _n: 16 },
    { 나이: '27세', 생애주기적자_천원: 631, _n: 27 },
    { 나이: '28세', 생애주기적자_천원: -2085, _n: 28 },
    { 나이: '45세', 생애주기적자_천원: -17476, _n: 45 },
    { 나이: '60세', 생애주기적자_천원: -702, _n: 60 },
    { 나이: '61세', 생애주기적자_천원: 2118, _n: 61 },
  ];
  const h = 핵심뽑기(표본);
  재('최대 적자 나이', h.최대적자_나이, '16세');
  재('최대 흑자 나이', h.최대흑자_나이, '45세');
  재('최대 흑자는 «크기»로 낸다(음수 부호를 안 내보낸다)', h.최대흑자_천원, 17476);
  재('적자에서 흑자로 도는 자리', h.적자에서흑자로, { 이전: '27세', 이후: '28세' });
  재('흑자에서 적자로 도는 자리', h.흑자에서적자로, { 이전: '60세', 이후: '61세' });
  재('⛔ 줄이 없으면 null — 지어내지 않는다', 핵심뽑기([]), null);
  /* 🔴 3번이 2023년치로 손수 적어 둔 값과 같은 답이 나오는가 — 이미 «답을 아는 자리»로 잰다 */
  재('⭐ 2023년 판(3번이 손으로 적은 것)과 셈이 맞는다 — 최대적자 16세 · 최대흑자 45세',
    [h.최대적자_나이, h.최대흑자_나이], ['16세', '45세']);

  /* ── 연령재배분(공공이전 네 갈래) ── */
  const 줄2 = (해, 축, 나이, v) => ({ PRD_DE: 해, C1_NM: 축, C2_NM: 나이, DT: v });
  재('공공이전 네 갈래만 고른다 — 「연령재배분」 같은 큰 묶음은 안 담는다',
    고른다2([줄2('2024', '연령재배분', '30세', 9), 줄2('2024', '공공이전(교육)', '30세', 5)])
      .나이별.map((r) => [r.나이, r.교육_천원]), [['30세', 5]]);
  const p = 정점뽑기([
    { 나이: '6세', _n: 6, 교육_천원: 16629, 연금_천원: -100 },
    { 나이: '57세', _n: 57, 교육_천원: 10, 연금_천원: -5 },
    { 나이: '58세', _n: 58, 교육_천원: 5, 연금_천원: 300 },
    { 나이: '69세', _n: 69, 교육_천원: 1, 연금_천원: 4756 },
  ], { 교육: { 뜻: '취학 연령부터 공교육 혜택이 시작됩니다' } });
  재('교육이 가장 큰 나이', p.네갈래_정점.교육.나이, '6세');
  재('⭐ 사람이 쓴 「뜻」은 해가 바뀌어도 물려받는다', p.네갈래_정점.교육.뜻, '취학 연령부터 공교육 혜택이 시작됩니다');
  재('연금이 순수혜로 도는 자리', p.연금_순수혜전환, { 이전: '57세', 이후: '58세' });
  재('⛔ 값이 없는 갈래는 «빼고» 간다 — 0 으로 안 채운다',
    Object.keys(정점뽑기([{ 나이: '1세', _n: 1, 교육_천원: 3 }]).네갈래_정점), ['교육']);
  재('⛔ 줄이 없으면 null', 정점뽑기([]), null);

  console.log(`\n자가시험 ${든것}가지 통과${깬것 ? ` · 🔴 ${깬것}가지 깨짐` : ''}`);
  return 깬것 === 0;
}

/* ── 본 일 ──────────────────────────────────────────────── */
async function 받는다(어느표 = 표) {
  const env = fs.existsSync(path.join(뿌리, '.env')) ? fs.readFileSync(path.join(뿌리, '.env'), 'utf8') : '';
  const 열쇠 = (env.match(/KOSIS_API_KEY=(.+)/) || [])[1];
  if (!열쇠) throw new Error('KOSIS_API_KEY 가 없다 — .env 를 본다');
  const u = 'https://kosis.kr/openapi/Param/statisticsParameterData.do?method=getList'
    + `&apiKey=${열쇠.trim()}&orgId=101&tblId=${어느표}`
    + '&itmId=ALL&objL1=ALL&objL2=ALL&format=json&jsonVD=Y&prdSe=Y&newEstPrdCnt=1';
  const r = await fetch(u, { signal: AbortSignal.timeout(60000) });
  const t = await r.text();
  let j;
  try { j = JSON.parse(t); } catch { throw new Error(`KOSIS 응답을 못 읽었다 — ${t.slice(0, 120)}`); }
  if (!Array.isArray(j)) throw new Error(`KOSIS 가 거절했다 — ${JSON.stringify(j).slice(0, 160)}`);
  return j;
}

async function 본일() {
  const 줄들 = await 받는다();
  const { 해, 나이별, 못읽음 } = 고른다(줄들);
  if (못읽음) { console.log('🔴 ' + 못읽음); process.exit(1); }
  const 핵심 = 핵심뽑기(나이별);
  console.log(`■ 국민이전계정 — 기준연도 ${해} · 나이 ${나이별.length}칸`);
  console.log(`   가장 적자가 큰 나이 ${핵심.최대적자_나이} (${(핵심.최대적자_천원 / 10).toFixed(0)}만원)`);
  console.log(`   가장 흑자가 큰 나이 ${핵심.최대흑자_나이} (${(핵심.최대흑자_천원 / 10).toFixed(0)}만원)`);
  console.log(`   적자→흑자 ${핵심.적자에서흑자로?.이후 ?? '못 잡음'} · 흑자→적자 ${핵심.흑자에서적자로?.이후 ?? '못 잡음'}`);

  if (process.argv.includes('--안적는다')) { console.log('\n⬜ 재기만 했다.'); return; }

  const 길 = path.join(뿌리, 'src/data/100yearmap/lifecycle-deficit.json');
  const 옛 = JSON.parse(fs.readFileSync(길, 'utf8'));
  const 옛해 = 옛?.출처?.기준연도;
  /* ⛔ 해가 뒤로 가면 안 쓴다 — 받다 만 응답으로 좋은 자료를 덮지 않는다 */
  if (옛해 && Number(해) < Number(옛해)) {
    console.log(`\n🔴 받은 해(${해})가 이미 가진 해(${옛해})보다 이르다 — **안 쓴다.**`);
    process.exit(1);
  }
  /* 🔴 KOSIS 는 0~85세 여든여섯 칸을 다 준다. 그런데 지면은 «읽을 만한 자리» 열다섯 칸으로
   *   추려 보여 준다(3번이 고른 것 — 최대·전환점·십년 단위). 여든여섯 줄을 그대로 부으면
   *   손님이 보는 표가 여섯 배로 길어진다. **모양은 그대로 두고 값만 갈아 끼운다.**
   * ⛔ 「자료가 많으니 다 보여 주자」로 지면을 바꾸지 않는다 — 그건 감수받은 모양을
   *   내 판단으로 뒤집는 일이다. 다 받은 것은 아래 원본 파일에 남긴다.
   * ⛔ 옛 표에 있던 나이가 새 자료에 없으면 «0 으로 채우지 않고» 그 줄을 빼고 세어 알린다. */
  const 새표 = new Map(나이별.map((r) => [r.나이, r]));
  const 고른나이 = (옛.나이별 || []).map((r) => r.나이);
  const 못찾은 = 고른나이.filter((n) => !새표.has(n));
  const 갱신된 = 고른나이
    .filter((n) => 새표.has(n))
    .map((n) => { const { _n, ...나머지 } = 새표.get(n); return 나머지; });
  if (못찾은.length) console.log(`   ⚠ 옛 표의 나이 ${못찾은.length}칸이 새 자료에 없다 — ${못찾은.join(' · ')} (0 으로 안 채운다)`);

  const 원본길 = path.join(뿌리, 'archive/raw/kosis-nta');
  fs.mkdirSync(원본길, { recursive: true });
  fs.writeFileSync(path.join(원본길, `${해}.json`),
    JSON.stringify({ _meta: { 표, 해, 받은때: new Date().toLocaleString('ko-KR') }, 나이별: 나이별.map(({ _n, ...r }) => r) }, null, 1) + '\n', 'utf8');

  const 새 = {
    ...옛,
    나이별: 갱신된,
    /* ⚠ 핵심은 «여든여섯 칸 전부»로 뽑는다 — 추린 열다섯 칸으로 뽑으면 최대·전환점이 틀린다 */
    핵심,
    출처: {
      ...옛.출처,
      기준연도: String(해),
      받은때: new Date().toLocaleDateString('sv-SE'),   /* KST 그대로 — toISOString 안 쓴다 */
      다음발표: '해마다 9월경 한 해치가 더해진다 — node scripts/build-100y-nta.mjs 만 돌리면 된다',
    },
  };
  /* 🔴 국가전체 총량값(국가전체_2023)은 **손대지 않는다.**
   *   그 값은 다른 표(DT_1NTA2001)에서 오는데, 그 표는 지금 요청 변수를 거절한다(err 21).
   *   ⛔ 키 이름을 해에 맞춰 바꾸면 지면(index.astro 102~104줄)이 그 이름을 «직접» 부르므로
   *     그 자리에서 깨진다. 값도 없는데 이름만 바꾸는 것은 거짓이기도 하다.
   *   ⇒ 이름도 값도 2023년치 그대로 두고, 지면 글이 「2023년」이라고 밝히게 한다.
   *     못 받은 것은 못 받았다고 적는다. */
  if (옛해 && 옛해 !== String(해)) {
    console.log(`   ⚠ 국가전체 총량값은 ${옛해}년치 그대로다 — DT_1NTA2001 이 요청을 거절한다(err 21).`);
    console.log('     지면이 그 표를 「2023년」으로 밝히고 있는지 확인한다.');
  }
  fs.writeFileSync(길, JSON.stringify(새, null, 1) + '\n', 'utf8');
  console.log(`\n✅ 적었다 — src/data/100yearmap/lifecycle-deficit.json (${옛해} → ${해})`);

  /* ── 둘째 지면 — 공공이전 네 갈래 (/public-transfers-by-age) ───────────── */
  console.log(`\n■ 연령재배분계정(${표2}) — 공공이전 네 갈래`);
  const 줄들2 = await 받는다(표2);
  const { 해: 해2, 나이별: 나이별2, 못읽음: 못읽음2 } = 고른다2(줄들2);
  if (못읽음2) { console.log('🔴 ' + 못읽음2); process.exit(1); }
  const 뽑은2 = 정점뽑기(나이별2, null);
  const 길2 = path.join(뿌리, 'src/data/100yearmap/public-transfers-by-age.json');
  const 옛2 = JSON.parse(fs.readFileSync(길2, 'utf8'));
  const 옛해2 = 옛2?.출처?.기준연도;
  if (옛해2 && Number(해2) < Number(옛해2)) {
    console.log(`🔴 받은 해(${해2})가 이미 가진 해(${옛해2})보다 이르다 — **안 쓴다.**`);
    process.exit(1);
  }
  /* 사람이 쓴 「뜻」은 옛 파일에서 물려받는다 — 해가 바뀐다고 뜻이 바뀌지 않는다 */
  const 정점2 = 정점뽑기(나이별2, 옛2.네갈래_정점);
  const 고른나이2 = (옛2.나이별 || []).map((r) => r.나이);
  const 표2맵 = new Map(나이별2.map((r) => [r.나이, r]));
  const 못찾은2 = 고른나이2.filter((n) => !표2맵.has(n));
  if (못찾은2.length) console.log(`   ⚠ 옛 표의 나이 ${못찾은2.length}칸이 새 자료에 없다 — ${못찾은2.join(' · ')}`);
  for (const [이름, v] of Object.entries(정점2.네갈래_정점)) {
    console.log(`   ${이름} 가장 많이 받는 나이 ${v.나이} (${(v.천원 / 10).toFixed(0)}만원)`);
  }
  console.log(`   연금이 순수혜로 도는 자리 ${정점2.연금_순수혜전환?.이후 ?? '못 잡음'}`);
  fs.mkdirSync(원본길, { recursive: true });
  fs.writeFileSync(path.join(원본길, `${해2}-재배분.json`),
    JSON.stringify({ _meta: { 표: 표2, 해: 해2, 받은때: new Date().toLocaleString('ko-KR') }, 나이별: 나이별2.map(({ _n, ...r }) => r) }, null, 1) + '\n', 'utf8');
  fs.writeFileSync(길2, JSON.stringify({
    ...옛2,
    네갈래_정점: 정점2.네갈래_정점,
    연금_순수혜전환: 정점2.연금_순수혜전환,
    나이별: 고른나이2.filter((n) => 표2맵.has(n)).map((n) => { const { _n, ...r } = 표2맵.get(n); return r; }),
    출처: {
      ...옛2.출처,
      기준연도: String(해2),
      받은때: new Date().toLocaleDateString('sv-SE'),
      다음발표: '해마다 9월경 한 해치가 더해진다 — node scripts/build-100y-nta.mjs 만 돌리면 된다',
    },
  }, null, 1) + '\n', 'utf8');
  console.log(`✅ 적었다 — src/data/100yearmap/public-transfers-by-age.json (${옛해2} → ${해2})`);

  console.log('\n⚠ 지면 글에 해가 박혀 있으면 함께 고쳐야 한다 — 다음 줄로 센다');
  console.log(`   grep -rn "${옛해}" src/pages/100y/lifecycle-deficit/index.astro src/pages/100y/public-transfers-by-age/index.astro`);
}

const 이파일이시작인가 = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (이파일이시작인가) {
  if (process.argv.includes('--자가시험')) process.exit(자가시험() ? 0 : 1);
  else 본일().catch((e) => { console.error('🔴 ' + e.message); process.exit(1); });
}
